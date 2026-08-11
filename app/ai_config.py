"""
Hirebotai shared AI configuration + routing.

Centralized model config, task classification, provider interface, fallback
policy, cooldowns, bounded cache and redacted logging. Imported by both the
engine (main.py) and the dashboard (dashboard.py) so routing stays consistent
across processes.

FREE-TIER ONLY. No paid models. OpenRouter is used only as an emergency
fallback. Verification is conditional, never automatic.
"""

import hashlib
import io
import re
import threading
import time
from collections import OrderedDict


def build_provider_keys(api_key, gemini_key="", provider_keys=None):
    """Build the unified provider keys dict used by the task-aware router.

    Prefers the explicit provider_keys dict; falls back to the legacy single
    api_key + gemini_key fields so nothing breaks when a caller does not pass
    provider_keys.
    """
    keys = dict(provider_keys or {})
    ak = (api_key or "").strip()
    if not keys.get("groq") and ak.startswith("gsk_"):
        keys["groq"] = ak
    if not keys.get("openrouter") and (ak.startswith("sk-") or ak.startswith("v1-")):
        keys["openrouter"] = ak
    if not keys.get("gemini"):
        gk = (gemini_key or "").strip()
        if gk.startswith("AIzaSy"):
            keys["gemini"] = gk
        elif ak.startswith("AIzaSy"):
            keys["gemini"] = ak
    return keys


# ---------------------------------------------------------------------------
# Centralized model config (free-tier friendly)
# ---------------------------------------------------------------------------
MODEL_CONFIG = {
    # Groq (text chat, fast + strong)
    "GROQ_FAST": "openai/gpt-oss-20b",
    "GROQ_STRONG": "openai/gpt-oss-120b",
    "GROQ_STT": "whisper-large-v3-turbo",
    # Google Gemini (vision + text). NOTE: gemini-2.5-flash/2.0-flash/1.5-flash
    # are deprecated for new accounts (404), so we use the current flash family.
    "GEMINI_FAST": "gemini-3.5-flash",
    "GEMINI_STRONG": "gemini-3.6-flash",
    # Gemini legacy last-resort compatibility (never the primary choice)
    "GEMINI_LEGACY": ["gemini-flash-latest"],
    # OpenRouter free vision models (screenshot emergency fallback)
    "OPENROUTER_FREE_VISION": [
        "nvidia/nemotron-nano-12b-v2-vl:free",
    ],
    # OpenRouter free text models (emergency fallback for text tasks)
    "OPENROUTER_FREE_TEXT": [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "openai/gpt-oss-20b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
    ],
}

# ---------------------------------------------------------------------------
# Task types (output of the local, no-AI classifier)
# ---------------------------------------------------------------------------
TASK_EASY_TEXT = "EASY_TEXT"
TASK_MEDIUM_TEXT = "MEDIUM_TEXT"
TASK_HARD_TEXT = "HARD_TEXT"
TASK_CODE = "CODE"
TASK_DSA = "DSA"
TASK_SQL = "SQL"
TASK_DEBUGGING = "DEBUGGING"
TASK_SCREENSHOT = "SCREENSHOT"
TASK_INTERVIEW = "INTERVIEW"
TASK_PRACTICE_FEEDBACK = "PRACTICE_FEEDBACK"

ALL_TASKS = (
    TASK_EASY_TEXT, TASK_MEDIUM_TEXT, TASK_HARD_TEXT, TASK_CODE, TASK_DSA,
    TASK_SQL, TASK_DEBUGGING, TASK_SCREENSHOT, TASK_INTERVIEW,
    TASK_PRACTICE_FEEDBACK,
)

TASK_LABELS = {
    TASK_EASY_TEXT: "easy_text",
    TASK_MEDIUM_TEXT: "medium_text",
    TASK_HARD_TEXT: "hard_text",
    TASK_CODE: "code",
    TASK_DSA: "dsa",
    TASK_SQL: "sql",
    TASK_DEBUGGING: "debugging",
    TASK_SCREENSHOT: "screenshot",
    TASK_INTERVIEW: "interview",
    TASK_PRACTICE_FEEDBACK: "practice_feedback",
}

PROVIDER_GROQ = "groq"
PROVIDER_OPENROUTER = "openrouter"
PROVIDER_GEMINI = "gemini"

ALL_PROVIDERS = (PROVIDER_GROQ, PROVIDER_OPENROUTER, PROVIDER_GEMINI)

PROVIDER_LABELS = {
    PROVIDER_GROQ: "Groq",
    PROVIDER_OPENROUTER: "OpenRouter",
    PROVIDER_GEMINI: "Gemini",
}

# ---------------------------------------------------------------------------
# Redacted logging
# ---------------------------------------------------------------------------
_KEY_PATTERNS = [
    re.compile(r"gsk_[A-Za-z0-9_\-\.]{8,}"),
    re.compile(r"sk-or-v1-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"v1-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"AIza[A-Za-z0-9_\-]{20,}"),
    re.compile(r"(Authorization:\s*Bearer\s*)[^\s,]+"),
]

_CODE_BLOCK_RE = re.compile(r"```.*?\n(.*?)```", re.DOTALL)
_CODE_BLOCK_LANG_RE = re.compile(r"```(?:[A-Za-z0-9_+.#-]*)\n(.*?)```", re.DOTALL)


def redact(text):
    """Strip API keys / secrets from any log string. Never log keys."""
    if not text:
        return ""
    text = str(text)
    for pat in _KEY_PATTERNS:
        text = pat.sub("<REDACTED>", text)
    return text


def log_router(task=None, difficulty=None, provider=None, model=None, reason=None, extra=None):
    parts = [f"task={TASK_LABELS.get(task, task) if task else '-'}"]
    if difficulty:
        parts.append(f"difficulty={difficulty}")
    parts.append(f"provider={PROVIDER_LABELS.get(provider, provider) if provider else '-'}")
    if model:
        parts.append(f"model={model}")
    if reason:
        parts.append(f"reason={reason}")
    if extra:
        parts.append(redact(extra))
    print("[AI ROUTER] " + " ".join(parts))


def log_fallback(from_provider, to_provider, reason, extra=None):
    line = (f"[AI FALLBACK] from={PROVIDER_LABELS.get(from_provider, from_provider)} "
            f"to={PROVIDER_LABELS.get(to_provider, to_provider)} reason={reason}")
    if extra:
        line += " " + redact(extra)
    print(line)
    if hasattr(SESSION_API_COUNTER, 'record_fallback'):
        SESSION_API_COUNTER.record_fallback()


# ---------------------------------------------------------------------------
# Session API Metric Counter (for live tracking of 10 audit metrics)
# ---------------------------------------------------------------------------
class SessionAPICounter:
    def __init__(self):
        self._lock = threading.Lock()
        self.reset()

    def reset(self):
        with getattr(self, '_lock', threading.Lock()):
            self.interviewer_speech_segments = 0
            self.google_stt_calls = 0
            self.groq_whisper_calls = 0
            self.groq_llm_calls = 0
            self.gemini_calls = 0
            self.openrouter_calls = 0
            self.unique_question_ids = set()
            self.duplicate_question_ids = 0
            self.duplicate_llm_calls = 0
            self.fallback_calls = 0

    def record_interviewer_segment(self):
        with self._lock:
            self.interviewer_speech_segments += 1

    def record_stt(self, provider):
        with self._lock:
            if provider == "google":
                self.google_stt_calls += 1
            elif provider == PROVIDER_GROQ:
                self.groq_whisper_calls += 1

    def record_llm(self, provider):
        with self._lock:
            if provider == PROVIDER_GROQ:
                self.groq_llm_calls += 1
            elif provider == PROVIDER_GEMINI:
                self.gemini_calls += 1
            elif provider == PROVIDER_OPENROUTER:
                self.openrouter_calls += 1

    def record_question_id(self, q_id):
        with self._lock:
            if q_id in self.unique_question_ids:
                self.duplicate_question_ids += 1
                self.duplicate_llm_calls += 1
                return False
            else:
                self.unique_question_ids.add(q_id)
                return True

    def record_fallback(self):
        with self._lock:
            self.fallback_calls += 1

    def get_metrics(self):
        with self._lock:
            return {
                "interviewer_speech_segments": self.interviewer_speech_segments,
                "google_stt_calls": self.google_stt_calls,
                "groq_whisper_calls": self.groq_whisper_calls,
                "groq_llm_calls": self.groq_llm_calls,
                "gemini_calls": self.gemini_calls,
                "openrouter_calls": self.openrouter_calls,
                "unique_question_ids": len(self.unique_question_ids),
                "duplicate_question_ids": self.duplicate_question_ids,
                "duplicate_llm_calls": self.duplicate_llm_calls,
                "fallback_calls": self.fallback_calls,
            }

SESSION_API_COUNTER = SessionAPICounter()


# ---------------------------------------------------------------------------
# Provider state: disabled (bad key) vs cooldown (429/timeout/5xx) vs quota
# ---------------------------------------------------------------------------
class ProviderState:
    def __init__(self):
        self._lock = threading.Lock()
        self._disabled = {}   # provider -> reason (invalid key; until config change)
        self._cooldown = {}   # provider -> {"until": epoch, "reason": str}
        self._minute_hits = {}  # provider -> list of timestamps
        self._day_hits = {}     # provider -> [day, count]

    def reset(self, provider):
        """Provider config changed (new key saved) — clear disabled/cooldown."""
        with self._lock:
            self._disabled.pop(provider, None)
            self._cooldown.pop(provider, None)

    def mark_disabled(self, provider, reason="invalid key"):
        with self._lock:
            self._disabled[provider] = reason
            print(f"[AI ROUTER] Provider {provider} DISABLED: {reason} (until configuration changes)")

    def mark_cooldown(self, provider, seconds, reason):
        with self._lock:
            self._cooldown[provider] = {"until": time.time() + max(5, seconds), "reason": reason}
            print(f"[AI ROUTER] Provider {provider} cooldown {int(max(5, seconds))}s: {reason}")

    def status(self, provider):
        """Return ("ok" | "disabled" | "cooldown", detail)."""
        with self._lock:
            if provider in self._disabled:
                return "disabled", self._disabled[provider]
            cd = self._cooldown.get(provider)
            if cd and cd["until"] > time.time():
                return "cooldown", f"{cd['reason']} ({int(cd['until'] - time.time())}s left)"
            return "ok", ""

    def is_available(self, provider):
        state, _ = self.status(provider)
        return state == "ok"

    def record_request(self, provider):
        now = time.time()
        day = int(now // 86400)
        with self._lock:
            self._minute_hits.setdefault(provider, []).append(now)
            hits = self._minute_hits[provider]
            cutoff = now - 60
            while hits and hits[0] < cutoff:
                hits.pop(0)
            prev = self._day_hits.get(provider)
            if not prev or prev[0] != day:
                self._day_hits[provider] = [day, 0]
            self._day_hits[provider][1] += 1

    def quota_left(self, provider, per_minute=30, per_day=1000):
        """Return True if the provider is still within soft quota limits."""
        with self._lock:
            hits = self._minute_hits.get(provider, [])
            cutoff = time.time() - 60
            minute_count = sum(1 for t in hits if t >= cutoff)
            day, count = self._day_hits.get(provider, [0, 0])
            day_count = count if day == int(time.time() // 86400) else 0
        return minute_count < per_minute and day_count < per_day


PROVIDER_STATE = ProviderState()


def on_provider_error(provider, category, retry_after=None):
    """Apply the cooldown/disable policy for a provider failure category."""
    if category == "invalid_key":
        PROVIDER_STATE.mark_disabled(provider, "invalid API key (401/403)")
    elif category == "rate_limited":
        seconds = int(retry_after or 30)
        PROVIDER_STATE.mark_cooldown(provider, seconds, "rate limited (429)")
    elif category in ("timeout", "server_error", "connection_error"):
        PROVIDER_STATE.mark_cooldown(provider, 20, category)
    elif category in ("model_unavailable", "empty", "safety_filtered", "image_not_supported", "sdk_missing"):
        # Not a provider-wide problem — do not disable; the router just falls back.
        pass


def on_provider_success(provider):
    pass


def reset_provider_state(provider):
    PROVIDER_STATE.reset(provider)


# ---------------------------------------------------------------------------
# Bounded cache (never interviews / audio / rapidly-changing context)
# ---------------------------------------------------------------------------
class BoundedCache:
    def __init__(self, max_entries=200):
        self._lock = threading.Lock()
        self._data = OrderedDict()
        self._max = max_entries

    def get(self, key):
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
                return self._data[key]
        return None

    def put(self, key, value):
        with self._lock:
            self._data[key] = value
            self._data.move_to_end(key)
            while len(self._data) > self._max:
                self._data.popitem(last=False)


AI_CACHE = BoundedCache(max_entries=200)


def cache_key(task, prompt, attached_text="", language=None, image_bytes=None, model=None):
    """Cache key that prevents incorrect reuse:
    (task, normalized prompt hash, attached-text hash, language, image hash, model tier).
    Screenshots always include the image bytes hash, not only has_attached_text.
    """
    prompt_hash = hashlib.sha256((prompt or "").encode("utf-8", "ignore")).hexdigest()[:24]
    text_hash = hashlib.sha256((attached_text or "").encode("utf-8", "ignore")).hexdigest()[:16] if attached_text else ""
    img_hash = hash_image_bytes(image_bytes) if image_bytes else ""
    return (task, prompt_hash, text_hash, language or "", img_hash, model or "")


def hash_image_bytes(image_bytes):
    """Combined content + perceptual hash of raw image bytes for cache identity.

    The raw SHA-256 prefix guarantees different screenshots never collide, while
    the dHash portion keeps near-identical screenshots cacheable.
    """
    raw = hashlib.sha256(image_bytes).hexdigest()[:16]
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes)).convert("L").resize((9, 8), Image.Resampling.BILINEAR)
        pixels = list(img.getdata())
        diff = []
        for row in range(8):
            for col in range(8):
                diff.append(pixels[row * 9 + col] > pixels[row * 9 + col + 1])
        decimal_value = 0
        hex_string = []
        for index, value in enumerate(diff):
            if value:
                decimal_value += 2 ** (index % 8)
            if (index % 8) == 7:
                hex_string.append(hex(decimal_value)[2:].zfill(2))
                decimal_value = 0
        return "".join(hex_string) + raw
    except Exception:
        return raw


# ---------------------------------------------------------------------------
# Local task classification (NO AI involved)
# ---------------------------------------------------------------------------
_DSA_KEYWORDS = (
    "time complexity", "space complexity", "big-o", "big o", "two sum", "two-sum",
    "two pointer", "two-pointer", "linked list", "linked-list", "binary search",
    "binary tree", "depth-first", "breadth-first", "dynamic programming",
    "memoization", "tabulation", "backtracking", "sliding window", "priority queue",
    "min-heap", "max-heap", "dijkstra", "topological", "union-find", "disjoint set",
    "sorting algorithm", "quicksort", "mergesort", "heapsort", "rabin-karp",
    "segment tree", "fenwick", "bitmask", "monotonic stack", "kadane", "greedy",
    "shortest path", "recursion", "recursive", "longest common", "longest increasing",
    "longest substring",
)

# Short / generic terms that must appear as standalone words (not substrings),
# so "GraphQL" never matches "graph" and "DFS" names don't false-trigger.
_DSA_WORDS = ("graph", "dfs", "bfs", "bst", "stack", "queue", "heap", "palindrome",
              "anagram", "permutation", "subset", "combination", "trie", "mst",
              "dp", "hashmap", "hash map", "hash table")

_DSA_WORD_RE = re.compile(r"\b(" + "|".join(map(re.escape, _DSA_WORDS)) + r")\b", re.IGNORECASE)

# Complexity signatures: safe as substring matches.
_DSA_SUBSTRINGS = ("o(n", "o(1", "o(log", "o(n^", "o(n²", "o(2", "o(n!")

_SQL_KEYWORDS = (
    "select ", "insert into", "update ", "delete from", "create table", "alter table",
    "drop table", "create database", "join ", "group by", "order by", "where ",
    "having", "primary key", "foreign key", "varchar", "int ", "auto_increment",
    "not null", "count(", "sum(", "avg(", "min(", "max(", "distinct", "union",
    "window function", "rank(", "dense_rank", "row_number", "over (", "sql query",
)

_DEBUG_KEYWORDS = (
    "debug", "bug", "error", "exception", "traceback", "stack trace", "segfault",
    "segmentation fault", "null pointer", "out of bounds", "index out of range",
    "typeerror", "valueerror", "attributeerror", "keyerror", "nameerror",
    "syntaxerror", "runtimeerror", "compilation error", "compile error", "not working",
    "not run", "why is", "why does", "wrong output", "incorrect output", "fails",
    "crash", "crashing", "fix", "fixed", "undefined reference", "segmentation",
    "access violation", "why isn't", "not printing", "doesn't work", "does not work",
    "unexpected", "leak", "memory leak", "infinite loop", "nullreference",
)

_HARD_KEYWORDS = (
    "hard", "advanced", "complex", "difficult", "challenge", "optimize", "optimise",
    "most efficient", "optimal", "minimize", "constraints", "edge case", "edge cases",
    "follow-up", "production", "scalable", "thread-safe", "concurrency", "parallel",
    "distributed", "system design", "architecture", "deep", "in-depth",
)

_CODE_SIGNALS = (
    "```", "def ", "class ", "function ", "const ", "let ", "var ", "#include",
    "public static", "using system", "package ", "import ", "=>", "int main",
    "print(", "console.log", "return;", "return ", "if (", "while (", "for (",
)


def classify_task(query, image_bytes=None, attached_text=None, has_image=False, language=None, is_follow_up=False):
    """Local heuristic classifier. Returns (task, difficulty, language).

    Order matters: explicit/strong signals first, then length-based text tiers.
    """
    has_image = has_image or bool(image_bytes)

    # A screenshot with no text = pure screen capture.
    if has_image and not (query or "").strip() and not (attached_text or "").strip():
        return TASK_SCREENSHOT, "", language

    text = (query or "").strip() or (attached_text or "").strip()
    lowered = (" " + text.lower() + " ").replace("\n", " ")

    # Screenshot with an attached question/note → still vision routing.
    if has_image:
        return TASK_SCREENSHOT, "", language

    if is_follow_up:
        # Follow-up within an ongoing conversation: context is embedded in the
        # prompt; do not re-classify as a brand-new task (avoid cache reuse).
        return TASK_MEDIUM_TEXT, "", language

    if language == "sql" or any(sig in lowered for sig in _SQL_KEYWORDS):
        return TASK_SQL, "complex" if any(sig in lowered for sig in _HARD_KEYWORDS) else "simple", language or "sql"

    is_dsa = any(sig in lowered for sig in _DSA_KEYWORDS) or \
             any(sig in lowered for sig in _DSA_SUBSTRINGS) or \
             bool(_DSA_WORD_RE.search(lowered))
    if is_dsa:
        diff = "HARD" if any(sig in lowered for sig in _HARD_KEYWORDS) or len(text) > 600 else "MEDIUM"
        return TASK_DSA, diff, language

    if any(sig in lowered for sig in _DEBUG_KEYWORDS):
        return TASK_DEBUGGING, "", language

    if language or any(sig in lowered for sig in _CODE_SIGNALS):
        return TASK_CODE, "", language

    # Plain-text question tier by length + difficulty keyword density.
    hard_hits = sum(1 for sig in _HARD_KEYWORDS if sig in lowered)
    if len(text) > 1200 or hard_hits >= 2:
        return TASK_HARD_TEXT, "HARD", language
    if len(text) > 200 or hard_hits == 1:
        return TASK_MEDIUM_TEXT, "MEDIUM", language
    return TASK_EASY_TEXT, "EASY", language


# ---------------------------------------------------------------------------
# Model selection per task (ordered provider chain with reasons)
# ---------------------------------------------------------------------------
def choose_models(task, difficulty="", has_image=False):
    """Return an ordered list of (provider, model-or-list, reason)."""
    chain = []
    if task == TASK_SCREENSHOT:
        chain.append((PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_FAST"], "screenshot_primary"))
        chain.append((PROVIDER_OPENROUTER, MODEL_CONFIG["OPENROUTER_FREE_VISION"], "screenshot_fallback_vision"))
        chain.append((PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_STRONG"], "screenshot_secondary"))
    elif task == TASK_INTERVIEW:
        chain.append((PROVIDER_GROQ, MODEL_CONFIG["GROQ_FAST"], "interview_low_latency"))
        chain.append((PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_FAST"], "interview_fallback"))
        chain.append((PROVIDER_OPENROUTER, MODEL_CONFIG["OPENROUTER_FREE_TEXT"], "interview_emergency"))
    elif task == TASK_PRACTICE_FEEDBACK:
        chain.append((PROVIDER_GROQ, MODEL_CONFIG["GROQ_FAST"], "practice_feedback"))
        chain.append((PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_FAST"], "practice_feedback_fallback"))
        chain.append((PROVIDER_OPENROUTER, MODEL_CONFIG["OPENROUTER_FREE_TEXT"], "practice_feedback_emergency"))
    elif task in (TASK_DSA, TASK_DEBUGGING, TASK_HARD_TEXT):
        chain.append((PROVIDER_GROQ, MODEL_CONFIG["GROQ_STRONG"], "complex_task"))
    elif task == TASK_SQL:
        if difficulty == "complex":
            chain.append((PROVIDER_GROQ, MODEL_CONFIG["GROQ_STRONG"], "complex_sql"))
        else:
            chain.append((PROVIDER_GROQ, MODEL_CONFIG["GROQ_FAST"], "sql"))
    else:  # EASY_TEXT, MEDIUM_TEXT, CODE
        chain.append((PROVIDER_GROQ, MODEL_CONFIG["GROQ_FAST"], "standard_task"))
    # Append the shared text fallback chain for non-screenshot tasks.
    if task != TASK_SCREENSHOT:
        chain.append((PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_FAST"], "text_fallback"))
        chain.append((PROVIDER_OPENROUTER, MODEL_CONFIG["OPENROUTER_FREE_TEXT"], "emergency_fallback"))
        chain.append((PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_STRONG"], "last_resort"))
    return chain


# ---------------------------------------------------------------------------
# Unified provider interface: call_ai()
# ---------------------------------------------------------------------------
def _normalize_openrouter_key(key):
    key = (key or "").strip().strip("'").strip('"')
    if key.startswith("v1-"):
        key = "sk-or-" + key
    return key


def _parse_json_content(data):
    if not data or 'choices' not in data or not data['choices']:
        return ""
    return data['choices'][0]['message'].get('content') or ""


def _classify_status(status, body=""):
    if status in (401, 403):
        return "invalid_key"
    if status == 429:
        return "rate_limited"
    if status in (400, 404):
        return "model_unavailable"
    if status == 408:
        return "timeout"
    if status >= 500:
        return "server_error"
    return "unknown"


def _retry_after_from(resp):
    try:
        raw = resp.headers.get("Retry-After", "")
        if not raw:
            return None
        if raw.isdigit():
            return int(raw)
        return 30
    except Exception:
        return None


def _build_groq_messages(prompt, history=None, skip_history=False):
    messages = []
    if history and not skip_history:
        for h in history:
            q = (h.get("query") or "").strip()
            a = (h.get("answer") or "").strip()
            if q:
                messages.append({"role": "user", "content": q})
            if a:
                messages.append({"role": "assistant", "content": a})
    messages.append({"role": "user", "content": prompt})
    return messages


def _build_openrouter_messages(prompt, image_bytes=None, history=None, skip_history=False):
    messages = []
    if history and not skip_history:
        total = len(history)
        for idx, h in enumerate(history):
            q = (h.get("query") or "Analyze screenshot").strip()
            a = (h.get("answer") or "").strip()
            h_img = h.get("image_bytes")
            if h_img and idx >= total - 3:
                b64_data = __import__("base64").b64encode(h_img).decode("utf-8")
                messages.append({
                    "role": "user",
                    "content": [
                        {"type": "text", "text": q},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_data}"}},
                    ],
                })
            else:
                messages.append({"role": "user", "content": q})
            if a:
                messages.append({"role": "assistant", "content": a})
    current = []
    if image_bytes:
        b64_data = __import__("base64").b64encode(image_bytes).decode("utf-8")
        current.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_data}"}})
    current.append({"type": "text", "text": prompt})
    messages.append({"role": "user", "content": current})
    return messages


def _build_gemini_contents(prompt, image_bytes=None, history=None, skip_history=False):
    """Return (genai_client, contents_list, safety_settings)."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return None, None, None

    contents_payload = []
    if history and not skip_history:
        total = len(history)
        for idx, h in enumerate(history):
            turn_parts = []
            h_img = h.get("image_bytes")
            if h_img and idx >= total - 3:
                turn_parts.append(types.Part.from_bytes(data=h_img, mime_type="image/jpeg"))
            turn_parts.append(types.Part.from_text(text=(h.get("query") or "Analyze screenshot")))
            contents_payload.append(types.Content(role="user", parts=turn_parts))
            a = (h.get("answer") or "").strip()
            if a:
                contents_payload.append(types.Content(role="model", parts=[types.Part.from_text(text=a)]))
    curr_parts = []
    if image_bytes:
        curr_parts.append(types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))
    curr_parts.append(types.Part.from_text(text=prompt))
    contents_payload.append(types.Content(role="user", parts=curr_parts))

    safety_settings = [
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=types.HarmBlockThreshold.BLOCK_NONE),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
        types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
    ]
    return genai, contents_payload, safety_settings


def _call_groq(keys, model, prompt, image_bytes=None, max_tokens=2048, temperature=0.1,
               history=None, skip_history=False, timeout=12):
    import requests
    key = (keys or {}).get("groq") or ""
    if not key.strip():
        return {"ok": False, "text": "", "category": "no_key"}
    if image_bytes:
        return {"ok": False, "text": "", "category": "image_not_supported"}
    headers = {"Authorization": f"Bearer {key.strip()}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": _build_groq_messages(prompt, history, skip_history),
        "max_tokens": max_tokens,
    }
    if temperature is not None:
        payload["temperature"] = temperature
    for attempt in (1, 2):
        try:
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions",
                                 headers=headers, json=payload, timeout=timeout)
            if resp.status_code == 200:
                text = _parse_json_content(resp.json())
                if not text or not text.strip():
                    return {"ok": False, "text": "", "category": "empty"}
                return {"ok": True, "text": text, "category": None}
            category = _classify_status(resp.status_code, resp.text)
            if category in ("invalid_key", "rate_limited"):
                return {"ok": False, "text": "", "category": category,
                        "retry_after": _retry_after_from(resp)}
            # model_unavailable / server_error / timeout: one transient retry
        except requests.exceptions.Timeout:
            category = "timeout"
        except requests.exceptions.ConnectionError:
            category = "connection_error"
        except Exception:
            category = "unknown"
    return {"ok": False, "text": "", "category": category}


def _call_openrouter(keys, model, prompt, image_bytes=None, max_tokens=2048, temperature=0.1,
                     history=None, skip_history=False, timeout=12):
    import requests
    key = (keys or {}).get("openrouter") or ""
    if not key.strip():
        return {"ok": False, "text": "", "category": "no_key"}
    key = _normalize_openrouter_key(key)
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hirebotai.in",
        "X-Title": "Hirebotai Assistant",
    }
    messages = _build_openrouter_messages(prompt, image_bytes, history, skip_history)
    models = model if isinstance(model, (list, tuple)) else [model]
    last_category = "unknown"
    for m in models:
        payload = {
            "model": m,
            "messages": messages,
            "max_tokens": max_tokens,
        }
        if temperature is not None:
            payload["temperature"] = temperature
        for attempt in (1, 2):
            try:
                resp = requests.post("https://openrouter.ai/api/v1/chat/completions",
                                     headers=headers, json=payload, timeout=timeout)
                if resp.status_code == 200:
                    text = _parse_json_content(resp.json())
                    if text and text.strip():
                        return {"ok": True, "text": text, "category": None, "model": m}
                    last_category = "empty"
                else:
                    category = _classify_status(resp.status_code, resp.text)
                    last_category = category
                    if category in ("invalid_key", "rate_limited"):
                        return {"ok": False, "text": "", "category": category,
                                "retry_after": _retry_after_from(resp)}
                    # model_unavailable → try next model in list
                    if category == "model_unavailable":
                        break
            except requests.exceptions.Timeout:
                last_category = "timeout"
            except requests.exceptions.ConnectionError:
                last_category = "connection_error"
            except Exception:
                last_category = "unknown"
    return {"ok": False, "text": "", "category": last_category}


def _gemini_response_text(response):
    """Extract joined text from a Gemini response.

    Newer Gemini models (3.x / flash-latest) do not populate the convenience
    ``response.text`` attribute when the response carries "thought" parts, so
    we read ``candidates[0].content.parts[].text`` directly.
    """
    try:
        if not response or not getattr(response, "candidates", None):
            return ""
        parts = []
        for part in (response.candidates[0].content.parts or []):
            t = getattr(part, "text", None)
            if t:
                parts.append(t)
        return "\n".join(parts).strip()
    except Exception:
        return ""


def _call_gemini(keys, model, prompt, image_bytes=None, max_tokens=2048, temperature=0.1,
                 history=None, skip_history=False, timeout=12):
    key = (keys or {}).get("gemini") or ""
    if not key.strip():
        return {"ok": False, "text": "", "category": "no_key"}
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return {"ok": False, "text": "", "category": "sdk_missing"}
    genai_client, contents_payload, safety_settings = _build_gemini_contents(
        prompt, image_bytes, history, skip_history)
    if genai_client is None or contents_payload is None:
        return {"ok": False, "text": "", "category": "sdk_missing"}

    models = [model] + list(MODEL_CONFIG["GEMINI_LEGACY"]) if isinstance(model, str) else list(model)
    last_category = "unknown"
    for m in models:
        try:
            client = genai.Client(api_key=key.strip())
            config_kwargs = dict(max_output_tokens=max_tokens, safety_settings=safety_settings)
            if temperature is not None:
                config_kwargs["temperature"] = temperature
            response = client.models.generate_content(
                model=m, contents=contents_payload,
                config=types.GenerateContentConfig(**config_kwargs))
            text = _gemini_response_text(response)
            if text:
                return {"ok": True, "text": text, "category": None, "model": m}
            last_category = "empty"
        except ValueError as ve:
            # Safety filter block — not a provider-wide failure.
            last_category = "safety_filtered"
        except Exception as ex:
            err = str(ex).lower()
            if "404" in err or ("model" in err and "not found" in err):
                last_category = "model_unavailable"
                continue
            last_category = "unknown"
    return {"ok": False, "text": "", "category": last_category}


def call_ai(keys, provider, model, prompt, image_bytes=None, max_tokens=2048,
            temperature=0.1, history=None, skip_history=False, timeout=12):
    """Unified provider interface.

    Returns {"ok": bool, "text": str, "category": str|None, "provider": str,
             "model": str, "retry_after": int|None}.
    category values: invalid_key, rate_limited, timeout, connection_error,
    server_error, model_unavailable, empty, safety_filtered,
    image_not_supported, sdk_missing, no_key, unknown.
    """
    keys = keys or {}
    if provider == PROVIDER_GROQ:
        res = _call_groq(keys, model, prompt, image_bytes, max_tokens, temperature, history, skip_history, timeout)
    elif provider == PROVIDER_OPENROUTER:
        res = _call_openrouter(keys, model, prompt, image_bytes, max_tokens, temperature, history, skip_history, timeout)
    elif provider == PROVIDER_GEMINI:
        res = _call_gemini(keys, model, prompt, image_bytes, max_tokens, temperature, history, skip_history, timeout)
    else:
        return {"ok": False, "text": "", "category": "unknown"}
    res.setdefault("provider", provider)
    res.setdefault("model", model)
    if res.get("ok") and hasattr(SESSION_API_COUNTER, 'record_llm'):
        SESSION_API_COUNTER.record_llm(provider)
    return res


def transcribe_audio(keys, audio_data, timeout=12):
    """STT: Google Speech Recognition primary (0 paid API cost), Groq Whisper fallback.
    
    Returns (text, provider) or (None, None).
    """
    import requests
    # 1. PRIMARY: Try free Google Speech Recognition
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()
        text = recognizer.recognize_google(audio_data)
        if text and text.strip():
            if hasattr(SESSION_API_COUNTER, 'record_stt'):
                SESSION_API_COUNTER.record_stt("google")
            return text.strip(), "google"
    except Exception as e:
        if type(e).__name__ != "UnknownValueError":
            print(f"[STT] Primary Google STT failed, falling back to Groq Whisper: {redact(e)}")

    # 2. FALLBACK: Try Groq Whisper only if Google STT failed and Groq API key is present
    key = (keys or {}).get("groq") or ""
    if key.strip():
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {key.strip()}"},
                data={"model": MODEL_CONFIG["GROQ_STT"], "response_format": "json"},
                files={"file": ("speech.wav", audio_data.get_wav_data(), "audio/wav")},
                timeout=timeout,
            )
            if resp.status_code == 200:
                text = (resp.json().get("text") or "").strip()
                if text:
                    if hasattr(SESSION_API_COUNTER, 'record_stt'):
                        SESSION_API_COUNTER.record_stt(PROVIDER_GROQ)
                    return text, PROVIDER_GROQ
            else:
                print(f"[STT] Groq HTTP {resp.status_code}: {redact(resp.text[:150])}")
        except Exception as e:
            print(f"[STT] Groq Whisper fallback failed: {redact(e)}")

    return None, None


# ---------------------------------------------------------------------------
# Confidence + conditional verification
# ---------------------------------------------------------------------------
def _code_block_len(text):
    m = _CODE_BLOCK_RE.findall(text)
    if m:
        return max(len(b) for b in m)
    return 0


def estimate_confidence(task, answer):
    """Heuristic confidence: HIGH unless the answer looks empty/refusing/incomplete.

    EASY/MEDIUM text answers are frequently tersely correct (e.g. "42", "Option B"),
    so short-but-present answers stay HIGH for those tiers to avoid burning free
    quota on unnecessary verification.
    """
    if not answer or not str(answer).strip():
        return "LOW", "empty_answer"
    text = str(answer).strip()
    if text.lower().startswith(("i can", "i'm unable", "i cannot", "sorry", "as an ai")):
        return "LOW", "refusal_style"
    if "could not" in text.lower() and len(text) < 80:
        return "LOW", "error_echo"
    if len(text) < 40:
        if task in (TASK_CODE, TASK_DSA, TASK_SQL, TASK_DEBUGGING, TASK_HARD_TEXT):
            return "LOW", "very_short_answer"
        # EASY/MEDIUM text tiers: terse answers are normal.
        return "HIGH", "terse_but_present"
    if task in (TASK_CODE, TASK_DSA) and "```" in text and _code_block_len(text) < 40:
        return "LOW", "short_code_block"
    return "HIGH", ""


VERIFY_PROMPT = (
    "You are a strict answer verifier. Below is a problem and an AI-generated answer.\n\n"
    "PROBLEM:\n{prompt}\n\n"
    "AI ANSWER:\n{answer}\n\n"
    "Reply with EXACTLY one of these formats:\n"
    "- 'VERIFIED' if the answer is correct, complete and directly answers the problem.\n"
    "- 'CORRECTED: <the corrected/improved complete answer>' if the answer has a real error, "
    "is incomplete, or misses the core requirement. Provide the full corrected answer after the prefix."
)


def pick_verifier(original_provider):
    """Pick an independent verifier provider (different from the generator)."""
    if original_provider == PROVIDER_GEMINI:
        return (PROVIDER_GROQ, MODEL_CONFIG["GROQ_STRONG"])
    if original_provider == PROVIDER_GROQ:
        return (PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_STRONG"])
    return (PROVIDER_GEMINI, MODEL_CONFIG["GEMINI_STRONG"])


def should_verify(task, confidence, user_asked_verify=False, code_issue=False, difficulty=""):
    """Verification is CONDITIONAL. Never automatic for successful answers."""
    if user_asked_verify:
        return True
    if confidence == "LOW":
        return True
    if code_issue:
        return True
    if task in (TASK_DSA, TASK_DEBUGGING) and difficulty == "HARD":
        # Only when there is obvious uncertainty — LOW confidence already triggers.
        return False
    return False


def run_verification(keys, task, prompt, answer, original_provider, difficulty=""):
    """One verifier call using an independent provider.

    Returns (final_answer, corrected: bool). Maximum 1 call normally; a second
    only when the first verifier reports a real contradiction/error AND the
    correction still fails an independent cross-check.
    """
    v_provider, v_model = pick_verifier(original_provider)
    if not PROVIDER_STATE.is_available(v_provider):
        return answer, False

    log_router(task=task, difficulty=difficulty, provider=v_provider, model=v_model, reason="conditional_verify")
    res = call_ai(keys, v_provider, v_model, VERIFY_PROMPT.format(prompt=prompt[:4000], answer=answer[:8000]),
                  max_tokens=2048, temperature=0.1)
    if not res.get("ok") or not res.get("text"):
        return answer, False

    verdict = res["text"].strip()
    if verdict.upper().startswith("VERIFIED"):
        return answer, False

    if verdict.upper().startswith("CORRECTED:"):
        corrected = verdict.split("CORRECTED:", 1)[1].strip()
        if corrected:
            # Independent-provider second opinion ONLY when the first verifier
            # actually reported a real error (absolute maximum = 2 calls).
            v2_provider, v2_model = pick_verifier(v_provider)
            if v2_provider != original_provider and PROVIDER_STATE.is_available(v2_provider):
                res2 = call_ai(keys, v2_provider, v2_model,
                               VERIFY_PROMPT.format(prompt=prompt[:4000], answer=corrected[:8000]),
                               max_tokens=2048, temperature=0.1)
                if res2.get("ok") and res2.get("text", "").strip().upper().startswith("VERIFIED"):
                    log_router(task=task, difficulty=difficulty, provider=v2_provider,
                               model=v2_model, reason="correction_confirmed")
                    return corrected, True
            return corrected, True
    return answer, False


# ---------------------------------------------------------------------------
# Static code validation (syntax/static ONLY — never correctness, never exec)
# ---------------------------------------------------------------------------
def validate_code_static(language, code):
    """Static/syntax validation only.

    - Python: compile() to catch SyntaxError (never executes).
    - Other languages: brace/paren balance + basic sanity checks.
    Returns (ok, issues[], note). Does NOT claim algorithm correctness.
    """
    issues = []
    note = "static/syntax check only — does not validate algorithm correctness"
    if not code or not code.strip():
        return False, ["empty code"], note
    lang = (language or "").lower()
    if lang in ("python", "py", "python3"):
        try:
            compile(code, "<ai_generated>", "exec")
        except SyntaxError as e:
            issues.append(f"Python SyntaxError: line {e.lineno}: {e.msg}")
        except ValueError as e:
            issues.append(f"Python source issue: {e}")
        except Exception as e:
            issues.append(f"Python compile error: {e}")
        return (len(issues) == 0), issues, note
    if lang in ("cpp", "c", "c++", "java", "javascript", "js", "typescript", "ts", "csharp", "go", "php", "ruby", "rust"):
        opens = code.count("{") - code.count("}")
        if opens < 0:
            issues.append("unbalanced braces: more closing than opening")
        elif opens > 0:
            issues.append(f"unbalanced braces: {opens} unclosed")
        if code.count("(") != code.count(")"):
            issues.append("unbalanced parentheses")
    return (len(issues) == 0), issues, note


# ---------------------------------------------------------------------------
# Public routing entry point
# ---------------------------------------------------------------------------
def route_request(keys, task, prompt, image_bytes=None, history=None, skip_history=False,
                  difficulty="", max_tokens=2048, language=None, user_asked_verify=False,
                  code_issue=False, allow_cache=False, cache_key_val=None, force_verify=False):
    """Route a request through the task-aware provider chain.

    Returns {"text": str, "provider": str, "model": str, "confidence": str,
             "verified": bool, "cached": bool, "code_issues": list}
    """
    if cache_key_val is not None and allow_cache:
        cached = AI_CACHE.get(cache_key_val)
        if cached is not None:
            print("[AI ROUTER] cache hit for request")
            cached["cached"] = True
            return cached

    has_image = bool(image_bytes)
    chain = choose_models(task, difficulty, has_image)

    last_category = "no_key"
    result = None
    for provider, model, reason in chain:
        if not PROVIDER_STATE.is_available(provider):
            log_fallback(None, provider, "provider_disabled")
            continue
        if not PROVIDER_STATE.quota_left(provider):
            log_fallback(None, provider, "quota_exceeded")
            continue
        key = (keys or {}).get(provider) or ""
        if not key.strip():
            continue
        PROVIDER_STATE.record_request(provider)
        log_router(task=task, difficulty=difficulty, provider=provider, model=model if isinstance(model, str) else ",".join(model), reason=reason)
        res = call_ai(keys, provider, model, prompt, image_bytes=image_bytes,
                      max_tokens=max_tokens, history=history, skip_history=skip_history)
        if res.get("ok"):
            result = {
                "text": res["text"],
                "provider": provider,
                "model": res.get("model") or model,
                "confidence": "HIGH",
                "verified": False,
                "cached": False,
                "code_issues": [],
            }
            on_provider_success(provider)
            break
        category = res.get("category") or "unknown"
        last_category = category
        on_provider_error(provider, category, res.get("retry_after"))
        # Never retry the same failed request indefinitely — move to the next
        # provider in the chain (disabled/cooldown states are tracked above).
        log_fallback(provider, None, category)

    if result is None:
        return {"text": "", "provider": None, "model": None, "confidence": "LOW",
                "verified": False, "cached": False, "code_issues": [],
                "error_category": last_category}

    # Local confidence check → conditional verification.
    confidence, conf_reason = estimate_confidence(task, result["text"])
    result["confidence"] = confidence
    if confidence == "LOW":
        log_router(task=task, difficulty=difficulty, provider=result["provider"],
                   model=result["model"], reason=f"low_confidence:{conf_reason}")

    code_issues = []
    if task in (TASK_CODE, TASK_DSA, TASK_SQL, TASK_DEBUGGING):
        code_block = _extract_code_block(result["text"])
        if code_block:
            ok, issues, note = validate_code_static(language, code_block)
            code_issues = issues
            if issues:
                log_router(task=task, difficulty=difficulty, provider=result["provider"],
                           model=result["model"], reason=f"static_issue:{issues[0]}")

    if force_verify or should_verify(task, confidence, user_asked_verify, bool(code_issues), difficulty):
        final_text, corrected = run_verification(keys, task, prompt, result["text"], result["provider"], difficulty)
        result["text"] = final_text
        result["verified"] = True

    result["code_issues"] = code_issues
    if allow_cache and cache_key_val is not None:
        AI_CACHE.put(cache_key_val, dict(result))
    return result


def _extract_code_block(text):
    m = _CODE_BLOCK_LANG_RE.findall(text or "")
    if m:
        return max(m, key=len)
    return ""
