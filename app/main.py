import sys
import os
import io
import time
import base64
import threading
import wave
import collections

if sys.platform == 'win32':
    import ctypes
    from ctypes import wintypes

# Reconfigure stdout/stderr to UTF-8 to prevent Windows CP1252 UnicodeEncodeError
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from PySide6.QtCore import Qt, Signal, QObject, QThread, QPoint, Slot, QTimer, QSize
from PySide6.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, 
                              QLabel, QTextEdit, QPushButton, QGraphicsDropShadowEffect, QLineEdit, QSizeGrip,
                              QSystemTrayIcon, QMenu, QMessageBox, QSlider, QButtonGroup, QComboBox,
                              QToolButton, QFrame, QStyle)
from PySide6.QtGui import QColor, QFont, QIcon, QAction, QTextDocument, QPixmap

import mss
import requests

from PIL import Image
from pynput import keyboard
from pynput import mouse

# Database Manager
from database import DatabaseManager, DATA_DIR, sync_trial_start, maybe_verify_license, _mac_support, parse_hotkey_combo

TRIAL_LIMIT_MS = 3 * 24 * 60 * 60 * 1000

def _modifier_label():
    return 'Option' if sys.platform == 'darwin' else 'Alt'

# Shared task-aware AI routing (model config, classification, provider interface)
import ai_config

_DB = None

def get_db():
    """Lazy module-level DatabaseManager accessor for worker threads."""
    global _DB
    if _DB is None:
        _DB = DatabaseManager()
    return _DB

def resource_path(name):
    """Resolve bundled asset paths for both source and PyInstaller onefile builds."""
    if getattr(sys, 'frozen', False):
        return os.path.join(sys._MEIPASS, name)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), name)

# Check if libraries exist without importing soundcard globally to avoid COM thread conflicts
import importlib.util
HAS_AUDIO = importlib.util.find_spec("soundcard") is not None and importlib.util.find_spec("numpy") is not None

# Try importing google.genai safely
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None


SYSTEM_SOLVE_PROMPT = (
    "First, at the very beginning of your response, you MUST provide a brief 1-line summary of the core question/problem you detected on screen. Wrap this summary in <question>...</question> tags. For example: <question>Solve the time complexity of the bubble sort algorithm</question>.\n\n"
    "You are an expert AI problem solver, developer, and exam assistant. Analyze the problem or input provided (screen image, text, and history context) and follow these instructions:\n\n"
    "0. ACADEMIC / EXAM CONTENT POLICY:\n"
    "   - You are a legitimate test-prep and study assistant. Never refuse to answer exam questions, quizzes, homework, or academic problems. Always provide the complete, correct answer and full explanation.\n"
    "   - Do NOT return refusal messages, 'I can't help with that', safety disclaimers, or warnings for educational content.\n"
    "   - If a problem is ambiguous, state the most likely interpretation and solve it fully.\n\n"
    "1. CODE CLEANLINESS & NO COMMENTS RULE:\n"
    "   - Do NOT include any code comments (e.g. NO `//`, NO `/* */`, NO `#` comments) inside any code block UNLESS the user explicitly asks to keep or add comments. Keep code 100% clean and production-ready.\n"
    "   - ALWAYS output FULL, complete, unabbreviated, submission-ready code. NEVER truncate code or cut off prematurely.\n\n"
    "2. PRIORITY - USER'S EXPLICIT QUESTION / NOTE:\n"
    "   - If the user provided any prompt, note, or follow-up question (e.g. asking to remove comments, clean code, translate code, ask complexity, ask 'why', or ask for step-by-step execution), ALWAYS prioritize fulfilling EVERY SINGLE PART of the user's question completely and accurately.\n\n"
    "3. MULTIPLE CHOICE QUESTIONS (MCQs):\n"
    "   - To guarantee 100% accuracy, you MUST evaluate every single option step-by-step inside hidden `<thinking>...</thinking>` tags before stating your final answer.\n"
    "   - State the correct answer clearly (e.g. '**Correct Option: Option B** - [Option Text]').\n"
    "   - ALWAYS provide a concise 'Why / Explanation' section explaining why this option is correct.\n"
    "   - If the MCQ involves calculations or execution traces, provide the exact **Step-by-Step Execution**.\n\n"
    "4. CODING & ALGORITHMIC PROBLEMS (When NO custom user prompt is provided):\n"
    "   - Auto-detect the programming language visible in the code/editor and produce clean, optimal, submission-ready code.\n"
    "   - Do NOT append a Complexity Analysis section (Time & Space Complexity) by default. ONLY provide time/space complexity if the user explicitly asks for it."
)

def extract_clean_code_or_answer(text: str) -> str:
    """Strips conversational boilerplate before and after code blocks while preserving <question> tags."""
    if not text:
        return ""
    text_str = text.strip()
    q_tag = ""
    if "<question>" in text_str and "</question>" in text_str:
        q_tag = text_str.split("</question>", 1)[0] + "</question>\n\n"
        
    if "```" in text_str:
        blocks = []
        parts = text_str.split("```")
        for i in range(1, len(parts), 2):
            block_content = parts[i].strip()
            lines = block_content.split("\n")
            if len(lines) > 1 and len(lines[0].strip()) < 15 and not lines[0].strip().startswith(("#", "//", "/*", "import", "class", "def", "using")):
                lang = lines[0].strip()
                clean_block = "\n".join(lines[1:])
                blocks.append(f"```{lang}\n{clean_block}\n```")
            else:
                blocks.append(f"```\n{block_content}\n```")
        if blocks:
            # Check if there is non-code text (explanations, step-by-step traces, complexity) that should be preserved
            non_code_parts = []
            for i in range(0, len(parts), 2):
                cleaned_part = parts[i].strip()
                if cleaned_part and not cleaned_part.startswith("<question>"):
                    non_code_parts.append(cleaned_part)
            
            # If the response contains explanations/complexity along with code, preserve both!
            if non_code_parts:
                return text_str
            return q_tag + "\n\n".join(blocks)
    return text_str

LANGUAGE_ALIASES = {
    'py': 'python', 'py3': 'python', 'python3': 'python', 'python': 'python',
    'cpp': 'cpp', 'c++': 'cpp', 'cxx': 'cpp', 'cc': 'cpp', 'hpp': 'cpp',
    'js': 'javascript', 'jsx': 'javascript', 'javascript': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript', 'typescript': 'typescript',
    'cs': 'csharp', 'c#': 'csharp', 'csx': 'csharp', 'csharp': 'csharp',
    'go': 'go', 'golang': 'go',
    'sh': 'bash', 'shell': 'bash', 'bash': 'bash',
    'kt': 'kotlin', 'kotlin': 'kotlin',
    'java': 'java',
    'rs': 'rust', 'swift': 'swift', 'php': 'php', 'sql': 'sql',
    'rb': 'ruby', 'html': 'html', 'css': 'css', 'xml': 'xml',
    'c': 'c', 'h': 'c', 'objc': 'objective-c', 'm': 'objective-c',
}

def detect_language_from_answer(text: str):
    """Reads the language tag from the first code fence in an AI answer (e.g. ```cpp)."""
    if not text or "```" not in text:
        return None
    for part in text.split("```"):
        first_line = part.strip().split("\n", 1)[0].strip().lower()
        if not first_line:
            continue
        if first_line in LANGUAGE_ALIASES:
            return LANGUAGE_ALIASES[first_line]
        tokens = first_line.split()
        if tokens and tokens[0] in LANGUAGE_ALIASES:
            return LANGUAGE_ALIASES[tokens[0]]
    return None

TEXT_LANGUAGE_SIGNATURES = {
    'sql': ['select ', 'insert into', 'update ', 'delete from', 'create table', 'alter table', 'drop table', 'create database', 'group by', 'order by', 'inner join', 'left join', 'right join', 'primary key', 'foreign key', 'varchar(', 'auto_increment', 'not null'],
    'javascript': ['const ', 'let ', 'console.log', '=>', 'addeventlistener', 'document.getelementbyid', 'require(', 'new promise', 'async function', 'window.', 'json.parse', 'typeof', 'try {', 'catch ('],
    'react': ['usestate(', 'useeffect(', 'useref(', 'usememo(', 'usecontext(', 'classname=', 'export default function', 'react.', 'props.', 'onclick={()', 'onchange={()', 'return (', '<div', '</div>', 'component'],
    'java': ['public class', 'public static void main', 'system.out.println', 'import java.', 'string[] args', 'new scanner', 'new arraylist', 'new hashmap', 'arraylist<', 'hashmap<', 'public void', 'private int', 'public int', 'package com', 'public string', 'system.in'],
    'cpp': ['#include', 'iostream', 'std::', 'cout', 'cin', 'using namespace', 'int main', 'vector<', 'char *', 'char*', 'printf', 'getline', 'endl', 'return 0;', 'long long'],
    'python': ['def ', 'print(', 'import numpy', 'import pandas', 'if __name__', 'elif', 'self.', 'range(', 'list(', 'dict(', 'lambda ', 'input()', 'split()'],
    'csharp': ['using system', 'console.writeline', 'namespace ', 'public static', 'class program', 'readline()'],
    'go': ['package main', 'func main', 'fmt.', 'import (', ':='],
    'typescript': ['interface ', ': string', ': number', ': boolean', ': any', 'react.fc', 'enum ', 'readonly ', 'useref<'],
    'php': ['<?php', 'echo ', '$_post', '$_get', 'mysql_', 'array('],
    'c': ['#include <stdio', '#include <stdlib', 'int main(void)', 'malloc(', 'free('],
}

def detect_language_from_text(text: str):
    """Best-effort language detection from selected/pasted code using strong signatures."""
    if not text:
        return None
    lowered = " " + text.lower() + " "
    best_lang = None
    best_count = 0
    for lang, sigs in TEXT_LANGUAGE_SIGNATURES.items():
        count = 0
        for sig in sigs:
            if sig in lowered:
                count += 1
        if count > best_count:
            best_count = count
            best_lang = lang
    if best_count >= 2:
        return best_lang
    if best_count == 1:
        if best_lang == 'cpp' and '#include' in lowered:
            return 'cpp'
        if best_lang == 'sql' and ('select ' in lowered or 'create table' in lowered):
            return 'sql'
        if best_lang == 'java' and ('public static void main' in lowered or 'import java.' in lowered):
            return 'java'
        if best_lang == 'php' and '<?php' in lowered:
            return 'php'
        if best_lang == 'go' and 'package main' in lowered:
            return 'go'
        if best_lang == 'csharp' and 'using system' in lowered:
            return 'csharp'
        if best_lang == 'react' and ('usestate(' in lowered or 'useeffect(' in lowered or 'classname=' in lowered):
            return 'react'
        if best_lang == 'python' and 'def ' in lowered:
            return 'python'
    return None

def get_image_hash(img):
    try:
        small = img.convert("L").resize((9, 8), Image.Resampling.BILINEAR)
        pixels = list(small.getdata())
        diff = []
        for row in range(8):
            for col in range(8):
                pixel_left = pixels[row * 9 + col]
                pixel_right = pixels[row * 9 + col + 1]
                diff.append(pixel_left > pixel_right)
        decimal_value = 0
        hex_string = []
        for index, value in enumerate(diff):
            if value:
                decimal_value += 2**(index % 8)
            if (index % 8) == 7:
                hex_string.append(hex(decimal_value)[2:].zfill(2))
                decimal_value = 0
        return "".join(hex_string)
    except Exception as e:
        print(f"[Hash] Error calculating dHash: {e}")
        return ""

def get_hamming_distance(hash1, hash2):
    if not hash1 or not hash2 or len(hash1) != len(hash2):
        return 999
    try:
        h1 = bytes.fromhex(hash1)
        h2 = bytes.fromhex(hash2)
        distance = 0
        for b1, b2 in zip(h1, h2):
            diff = b1 ^ b2
            while diff:
                distance += 1
                diff &= diff - 1
        return distance
    except Exception:
        return 999

# Helper function to get bounds of the active foreground window
def get_active_window_bounds():
    """Return the active window bounds (left/top/width/height) or None.

    Windows: foreground HWND rect. macOS: Quartz window list.
    """
    if sys.platform == 'darwin':
        return _mac_support().get_active_window_bounds()
    try:
        import ctypes
        from ctypes import wintypes
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        if hwnd:
            rect = wintypes.RECT()
            if ctypes.windll.user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                left = max(0, rect.left)
                top = max(0, rect.top)
                width = max(200, rect.right - rect.left)
                height = max(200, rect.bottom - rect.top)
                return {"left": left, "top": top, "width": width, "height": height}
    except Exception as e:
        print(f"[Capture] Error getting active window rect: {e}")
    return None

def get_selected_text_uia():
    """Return the currently selected text in the focused window.

    Windows: UI Automation. macOS: Accessibility API via PyObjC.
    Falls back to None when no text is selected or the platform API is unavailable.
    """
    if sys.platform == 'darwin':
        return _mac_support().get_selected_text()
    try:
        import comtypes.client
        try:
            import comtypes.gen.UIAutomationClient as UIA
        except ImportError:
            comtypes.client.GetModule("UIAutomationCore.dll")
            import comtypes.gen.UIAutomationClient as UIA

        uia = comtypes.client.CreateObject("{ff48dba4-60ef-4201-aa87-54103eef594e}", interface=UIA.IUIAutomation)
        element = uia.GetFocusedElement()
        if not element:
            return None

        # Try TextPatternId = 10014
        try:
            pattern = element.GetCurrentPattern(10014)
            if pattern:
                text_pattern = pattern.QueryInterface(UIA.IUIAutomationTextPattern)
                selections = text_pattern.GetSelection()
                if selections and selections.Length > 0:
                    range_el = selections.GetElement(0)
                    text_range = range_el.QueryInterface(UIA.IUIAutomationTextRange)
                    selected_text = text_range.GetText(-1)
                    if selected_text:
                        return selected_text.strip()
        except Exception:
            pass

        # Try TextPattern2Id = 10024
        try:
            pattern2 = element.GetCurrentPattern(10024)
            if pattern2:
                text_pattern2 = pattern2.QueryInterface(UIA.IUIAutomationTextPattern2)
                selections = text_pattern2.GetSelection()
                if selections and selections.Length > 0:
                    range_el = selections.GetElement(0)
                    text_range = range_el.QueryInterface(UIA.IUIAutomationTextRange)
                    selected_text = text_range.GetText(-1)
                    if selected_text:
                        return selected_text.strip()
        except Exception:
            pass
    except Exception as e:
        print(f"[HUD] Selection capture error: {e}")
    return None



# Worker object for handling background screen capture + AI Vision API call
class WorkerSignals(QObject):
    started = Signal()
    finished = Signal(str, bytes)
    error = Signal(str)
    audio_level = Signal(float, bool)  # normalized_energy, is_speaking
    transcription = Signal(str, bool, str)  # text, is_final, source

class AIWorker(QThread):
    def __init__(self, api_key: str, user_question: str = "", interview_mode: bool = False, resume_text: str = "", resume_language: str = "", vision_history: list = None, visual_cache: dict = None, capture_screen: bool = True, follow_up: bool = False, last_language: str = "", explicit_language: str = "", history_lock: threading.Lock = None, gemini_key: str = "", has_attached_text: bool = False, provider_keys: dict = None):
        super().__init__()
        self.api_key = api_key
        self.user_question = user_question
        self.interview_mode = interview_mode
        self.resume_text = resume_text
        self.resume_language = resume_language
        self.vision_history = vision_history if vision_history is not None else []
        self.visual_cache = visual_cache if visual_cache is not None else {}
        self.capture_screen = capture_screen
        self.follow_up = follow_up
        self.last_language = last_language
        self.explicit_language = explicit_language
        self.history_lock = history_lock or threading.Lock()
        self.gemini_key = gemini_key
        self.has_attached_text = has_attached_text
        self.provider_keys = provider_keys or {}
        self.signals = WorkerSignals()

    def _effective_keys(self):
        return ai_config.build_provider_keys(self.api_key, self.gemini_key, self.provider_keys)

    def run(self):
        self.signals.started.emit()
        try:
            image_bytes = None
            b64_image = None
            current_hash = None
            thumb_bytes = b""

            if self.capture_screen:
                print("[AIWorker] Capturing active application window...")
                with mss.MSS() as sct:
                    win_bounds = get_active_window_bounds()
                    if win_bounds and win_bounds['width'] > 300 and win_bounds['height'] > 300:
                        print(f"[AIWorker] Cropping active window: {win_bounds}")
                        sct_img = sct.grab(win_bounds)
                    else:
                        print("[AIWorker] Fallback to primary monitor grab...")
                        monitor = sct.monitors[1]
                        sct_img = sct.grab(monitor)

                    img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

                if img.width > 1280 or img.height > 1280:
                    img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)

                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=80)
                image_bytes = buffer.getvalue()
                b64_image = base64.b64encode(image_bytes).decode('utf-8')

                try:
                    thumb = img.copy()
                    thumb.thumbnail((120, 80))
                    thumb_io = io.BytesIO()
                    thumb.save(thumb_io, format="JPEG", quality=75)
                    thumb_bytes = thumb_io.getvalue()
                except Exception as th_err:
                    print(f"[AIWorker] Thumbnail generation error: {th_err}")

                # Calculate dHash and check visual cache
                current_hash = get_image_hash(img)
                matched_cache_val = None
                if current_hash:
                    with self.history_lock:
                        for cached_hash, answer in self.visual_cache.items():
                            # Strict threshold: <= 1 Hamming distance (highly identical layout matches)
                            if get_hamming_distance(current_hash, cached_hash) <= 1:
                                matched_cache_val = answer
                                print(f"[AIWorker] Cache hit on hash '{current_hash}' with Hamming Distance <= 1. Serving cached response instantly...")
                                break

                if matched_cache_val:
                    self.signals.finished.emit(matched_cache_val, thumb_bytes)
                    return

            # Check if this is a follow-up text chat/question query
            # (NOT when the user attached text/code via Alt+S — that content is
            # embedded in the query itself and must be treated as a fresh solve).
            is_text_only_chat = self.follow_up and self.user_question.strip() and not self.capture_screen and not self.has_attached_text

            if is_text_only_chat:
                # Inject the previous Q&A inline into the prompt itself so the model
                # can never miss the ongoing problem/code (some models ignore the
                # multi-turn history when a terse follow-up follows a terse query).
                with self.history_lock:
                    hist_snapshot = list(self.vision_history)
                context_parts = []
                for hist in hist_snapshot[-3:]:
                    hist_query = (hist.get('query') or '').strip()
                    hist_answer = (hist.get('answer') or '').strip()
                    if hist_query:
                        context_parts.append(f"QUESTION/PROMPT:\n{hist_query}")
                    if hist_answer:
                        context_parts.append(f"ANSWER/SOLUTION:\n{hist_answer}")
                context_block = "\n\n".join(context_parts) if context_parts else "(No prior context)"

                prompt = (
                    "First, at the very beginning of your response, you MUST provide a brief 1-line summary of the core question/problem you detected. Wrap this summary in <question>...</question> tags. For example: <question>Solve the time complexity of the bubble sort algorithm</question>.\n\n"
                    "You are an expert coding and exam assistant. The user is asking a question in an ongoing conversation.\n"
                    "The PREVIOUS CONVERSATION CONTEXT below contains the problem/code from earlier turns.\n"
                    "- If the user's question is ABOUT that context (e.g. find errors, explain, convert, reduce complexity, remove comments), use that exact code/problem to answer.\n"
                    "- If the user's question is a simple greeting (like 'hi', 'hello') or completely unrelated to the context, IGNORE the context entirely and just respond to the user naturally.\n"
                    "- Never claim that no code/problem was provided when the question is about the context and the context contains code.\n\n"
                    "=== PREVIOUS CONVERSATION CONTEXT ===\n"
                    f"{context_block}\n"
                    "=== END OF CONTEXT ===\n\n"
                    "Now answer the user's question completely and directly:\n"
                    f"\"\"\"\n{self.user_question.strip()}\n\"\"\""
                )
            else:
                prompt = SYSTEM_SOLVE_PROMPT
                # Parse explicit language requests in user query (e.g. "in cpp", "give in java", "code in java", "convert to java")
                lowered_query = self.user_question.lower()
                explicit_lang = self.explicit_language
                if not explicit_lang:
                    for key_alias, lang_name in LANGUAGE_ALIASES.items():
                        if (f"in {key_alias}" in lowered_query or 
                            f"to {key_alias}" in lowered_query or 
                            f"using {key_alias}" in lowered_query or 
                            f"code {key_alias}" in lowered_query or 
                            f"with {key_alias}" in lowered_query):
                            explicit_lang = lang_name
                            break

                if explicit_lang:
                    prompt = (f"LANGUAGE LOCK: The user has requested to write or convert the code to **{explicit_lang}**. "
                              f"You MUST output the complete solution in **{explicit_lang}** only.\n\n") + prompt
                elif self.last_language and not self.has_attached_text:
                    prompt = (f"The previous question was solved in **{self.last_language}**. Prefer continuing in {self.last_language} "
                              f"UNLESS the current question or visible code is clearly in a different language — in that case use the language of the visible code.\n\n") + prompt
                if self.interview_mode:
                    lang_hint = f"\n- CODE LANGUAGE: The candidate's resume is primarily in **{self.resume_language}**. When writing or explaining code examples, you MUST use **{self.resume_language}**." if self.resume_language else ""
                    if self.resume_text:
                        prompt = f"""You are a real person, not an AI, answering interview questions in first-person (I/my).
STRICT RULE: Base your answer on the candidate's actual resume below. If the question is not answered by the resume, answer naturally from the candidate's real-life perspective. Do not refuse to answer.
RESUME:
{self.resume_text}

HOW TO ANSWER:
- Mention your actual projects, skills, and experience from the resume whenever relevant.
- If the question is about something NOT in your resume (like role model, greatest strength, biggest failure, etc.), answer naturally from your own perspective as a real person. Pick a realistic role model (e.g., a professor, senior engineer, tech leader like Linus Torvalds, or someone from your actual experience) and explain why.
- NEVER say "I don't have access to my resume", "I don't have the details", "I'm an AI", "As a language model", or refuse to answer. You always have an opinion as a real person.
- NEVER use corporate buzzwords: "synergy", "leverage", "delve", "under the hood", "in production systems", "robust", "comprehensive", "seamless".
- If the interviewer asks about code, show the actual code snippet inside ``` blocks.{lang_hint}
- Keep answers to 3-5 sentences for simple questions, 4-6 for technical questions.
- NEVER say "As an AI" or "As a language model".

FORMAT YOUR ANSWER EXACTLY LIKE THIS:

SPOKEN ANSWER:
[Your direct answer — 3-5 sentences. Use resume details when relevant, otherwise answer naturally from your POV.]

KEY POINTS:
- [One strong point from your background or a relevant personal insight]
- [Another strong point or example]
- [Optional third point]
""" + prompt
                    else:
                        prompt = f"""You are a real person answering interview questions in first-person (I/my).
RULES:
- Speak naturally, like a real candidate. Casual but professional.
- NEVER use corporate buzzwords: "synergy", "leverage", "delve", "under the hood", "in production systems", "robust", "comprehensive", "seamless".
- If the interviewer asks about code, show the actual code snippet inside ``` blocks.{lang_hint}
- Keep answers to 3-5 sentences for simple questions, 4-6 for technical questions.
- NEVER say "As an AI" or "As a language model".

FORMAT YOUR ANSWER EXACTLY LIKE THIS:

SPOKEN ANSWER:
[Your natural spoken answer here — 3-5 sentences. If code is relevant, include it inline.]

KEY POINTS:
- [One direct point the candidate should mention if asked to elaborate]
- [Another direct point]
- [Optional third point]
""" + prompt
                if self.user_question.strip():
                    if self.follow_up and not self.has_attached_text:
                        prompt += (f"\n\nCONTINUATION (FOLLOW-UP IN THE SAME CONVERSATION):\n"
                                   f"The user has asked the following prompt/question:\n"
                                   f"\"\"\"\n{self.user_question.strip()}\n\"\"\"\n"
                                   f"Address every single aspect of this question/request directly, thoroughly, and completely.")
                    elif self.capture_screen:
                        prompt += (f"\n\nUSER QUESTION / NOTE:\n"
                                   f"\"\"\"\n{self.user_question.strip()}\n\"\"\"\n"
                                   f"Answer and fulfill everything requested in the user's note/question above.")
                    elif self.has_attached_text:
                        prompt += (f"\n\nUSER'S CODE / TEXT (attached via Alt+S) — THIS IS THE PRIMARY CONTENT TO ANALYZE:\n"
                                   f"\"\"\"\n{self.user_question.strip()}\n\"\"\"\n"
                                   f"IMPORTANT INSTRUCTIONS:\n"
                                   f"- The block above is the user's own code/text. Analyze it carefully line by line.\n"
                                   f"- If the user asks to find an error/bug, identify the EXACT line number(s) and variable(s) at fault, explain why, and show the corrected code for those lines.\n"
                                   f"- Do NOT rewrite the entire program unless asked. Do NOT output a different program from another language.\n"
                                   f"- Do NOT repeat or echo the user's code back at them; directly answer their question about it.")
                    else:
                        prompt += (f"\n\nUSER PROMPT / CODE SELECTION:\n"
                                   f"\"\"\"\n{self.user_question.strip()}\n\"\"\"\n"
                                   f"Answer all parts of the user's prompt completely and accurately.")

            raw_answer = ""

            # Task-aware routing: classify locally, then route through the
            # provider chain via ai_config.route_request() (single interface).
            keys = self._effective_keys()
            if not any((keys.get(p) or "").strip() for p in ("groq", "openrouter", "gemini")):
                raise Exception("API Key missing! Please add your Groq, OpenRouter, or Gemini key in the Dashboard.")

            # Screenshots require a vision provider. If only a Groq key exists,
            # surface a clear message instead of a confusing provider error.
            if image_bytes and not ((keys.get("openrouter") or "").strip() or (keys.get("gemini") or "").strip()):
                raise Exception("Groq cannot solve plain screen captures because it is text-only. "
                                "Add an OpenRouter or Gemini key in the Dashboard, or select the question text and press Alt+S.")

            with self.history_lock:
                hist_snapshot = list(self.vision_history)

            # Local (no-AI) classification of the current task.
            attached_text = self.user_question if self.has_attached_text else None
            task, difficulty, task_lang = ai_config.classify_task(
                query=self.user_question,
                image_bytes=image_bytes,
                attached_text=attached_text,
                has_image=bool(image_bytes),
                language=self.explicit_language or self.last_language or "",
                is_follow_up=is_text_only_chat,
            )

            # Cache policy: fresh solves (screenshot / attached text / first ask)
            # may be cached. Follow-up chat and interviews are never cached.
            allow_cache = bool(image_bytes) or self.has_attached_text or not self.follow_up
            ckey = None
            if allow_cache:
                ckey = ai_config.cache_key(
                    task=task,
                    prompt=prompt,
                    attached_text=self.user_question if self.has_attached_text else "",
                    language=task_lang,
                    image_bytes=image_bytes,
                )

            user_asked_verify = any(kw in (self.user_question or "").lower()
                                    for kw in ("verify", "check if", "check the", "is this correct", "validate"))

            routed = ai_config.route_request(
                keys=keys,
                task=task,
                prompt=prompt,
                image_bytes=image_bytes,
                history=hist_snapshot,
                skip_history=self.has_attached_text,
                difficulty=difficulty,
                language=task_lang,
                user_asked_verify=user_asked_verify,
                allow_cache=allow_cache,
                cache_key_val=ckey,
            )

            raw_answer = routed.get("text") or ""

            if not raw_answer or not str(raw_answer).strip():
                category = routed.get("error_category") or "unknown"
                if category == "invalid_key":
                    raise Exception("API key invalid for all providers (401/403). Please re-check your keys in the Dashboard.")
                if category == "no_key":
                    raise Exception("No API key configured for any provider. Add a Groq, OpenRouter, or Gemini key in the Dashboard.")
                if category == "empty":
                    raise Exception("The AI returned an empty response (content may have been filtered or refused). Please try again.")
                raise Exception(f"All AI providers failed. Last error category: {category}. Please try again.")

            clean_answer = extract_clean_code_or_answer(raw_answer)

            # Store a meaningful query for follow-ups. When the user gave no text
            # (plain screen capture), use the AI's <question> summary so that Alt+Q
            # follow-ups carry the actual problem instead of a useless placeholder.
            stored_query = self.user_question or "Solve this screenshot."
            if not (self.user_question or "").strip():
                q_start = clean_answer.find("<question>")
                q_end = clean_answer.find("</question>")
                if q_start != -1 and q_end != -1:
                    summary = clean_answer[q_start + len("<question>"):q_end].strip()
                    if summary:
                        stored_query = summary

            # Save to history memory. The conversation is NEVER cleared automatically —
            # it stays intact until the user presses Alt+C. To keep memory bounded,
            # old screenshot bytes are dropped (the text context is always preserved).
            with self.history_lock:
                self.vision_history.append({
                    "query": stored_query,
                    "b64_image": b64_image,
                    "image_bytes": image_bytes,
                    "answer": clean_answer
                })
                MAX_IMAGE_HISTORY = 6
                if len(self.vision_history) > MAX_IMAGE_HISTORY:
                    for old_entry in self.vision_history[:-MAX_IMAGE_HISTORY]:
                        old_entry['b64_image'] = None
                        old_entry['image_bytes'] = None
            if raw_answer and current_hash:
                with self.history_lock:
                    self.visual_cache[current_hash] = clean_answer
            
            try:
                sess_id = get_db().get_or_create_session('screen')
                if sess_id:
                    get_db().log_interaction(sess_id, 'screen', self.user_question or '[Screenshot Solver Intercept]', clean_answer)
            except Exception as e:
                print(f"[Logging] Failed to log interaction: {e}")

            self.signals.finished.emit(clean_answer, thumb_bytes)

        except Exception as e:
            err_str = str(e)
            print(f"[AIWorker] Error: {err_str}")
            self.signals.error.emit(f"API Error Details:\n{err_str}")

class TyperSignals(QObject):
    progress = Signal(int)
    paused = Signal(int)
    finished = Signal()

class StealthTyperThread(QThread):
    def __init__(self, text: str, start_index: int = 0, speed_cpm: int = 240, skip_indent: bool = True):
        super().__init__()
        self.text = text
        self.start_index = start_index
        self.is_active = True
        self.speed_cpm = max(60, min(600, int(speed_cpm or 240)))
        self.skip_indent = skip_indent
        self.signals = TyperSignals()
        
    def stop(self):
        self.is_active = False

    def run(self):
        import random
        from pynput.keyboard import Controller, Key
        keyboard_controller = Controller()
        import time

        def sleep_interruptible(seconds):
            # Sleep in small slices so stop() returns promptly instead of blocking the caller
            deadline = time.monotonic() + seconds
            while self.is_active and time.monotonic() < deadline:
                time.sleep(0.05)

        try:
            sleep_interruptible(random.uniform(0.9, 1.6))  # Initial human reaction delay before typing begins

            base_delay = 60.0 / self.speed_cpm  # seconds per character

            adjacent_keys = {
                'a': 'qwsz', 'b': 'vghn', 'c': 'xdfv', 'd': 'ersfxc', 'e': 'wsdr',
                'f': 'rtgvcd', 'g': 'tyhbvf', 'h': 'yujnbg', 'i': 'ujko', 'j': 'uikmnh',
                'k': 'ijlm', 'l': 'okp', 'm': 'njk', 'n': 'bhjm', 'o': 'iklp',
                'p': 'ol', 'q': 'wa', 'r': 'edft', 's': 'wedxza', 't': 'rfgy',
                'u': 'yhji', 'v': 'cfgb', 'w': 'qase', 'x': 'zsdc', 'y': 'tghu', 'z': 'asx'
            }

            def char_delay(char):
                # Natural human rhythm: punctuation and whitespace create natural gaps
                if char == '\n':
                    return random.uniform(0.40, 0.90)
                if char in [' ', '\t']:
                    return base_delay * random.uniform(1.3, 2.6)
                if char in ['.', ';', '{', '}']:
                    return random.uniform(0.28, 0.65)
                if char in [',', '(', ')', ':', '=', '+', '-', '*', '/']:
                    return base_delay * random.uniform(1.1, 2.0)
                return base_delay * random.uniform(0.7, 1.6)

            completed_normally = True
            chars_since_break = 0
            at_line_start = False
            for i in range(self.start_index, len(self.text)):
                if not self.is_active:
                    completed_normally = False
                    self.signals.paused.emit(i)
                    return

                char = self.text[i]

                # Editors (VS Code, LeetCode, etc.) auto-indent after Enter, so the
                # leading spaces/tabs of each new line are skipped to avoid doubling.
                # Disabled when typer_auto_indent is OFF in the Dashboard.
                if self.skip_indent and at_line_start and char in (' ', '\t'):
                    self.signals.progress.emit(i + 1)
                    sleep_interruptible(random.uniform(0.02, 0.08))
                    continue

                # 2% chance of simulated typo on standard letters
                if char.lower() in adjacent_keys and random.random() < 0.02:
                    typo_char = random.choice(adjacent_keys[char.lower()])
                    if char.isupper():
                        typo_char = typo_char.upper()

                    try:
                        keyboard_controller.type(typo_char)
                    except Exception:
                        pass
                    sleep_interruptible(random.uniform(0.25, 0.45))

                    try:
                        keyboard_controller.press(Key.backspace)
                        keyboard_controller.release(Key.backspace)
                    except Exception:
                        pass
                    sleep_interruptible(random.uniform(0.15, 0.30))

                try:
                    if char == '\n':
                        keyboard_controller.press(Key.enter)
                        keyboard_controller.release(Key.enter)
                        at_line_start = True
                    elif char == '\t':
                        keyboard_controller.press(Key.tab)
                        keyboard_controller.release(Key.tab)
                        at_line_start = False
                    else:
                        keyboard_controller.type(char)
                        at_line_start = False
                except Exception as key_err:
                    print(f"[StealthTyperThread] Warning typing char '{char}': {key_err}")

                self.signals.progress.emit(i + 1)

                delay = char_delay(char)
                chars_since_break += 1

                # Micro-pause every 8-14 characters like a real human glancing at the screen
                if chars_since_break >= random.randint(8, 14):
                    delay += random.uniform(0.15, 0.45)
                    chars_since_break = 0

                sleep_interruptible(delay)
        except Exception as e:
            print(f"[StealthTyperThread] Typing loop error: {e}")
        finally:
            if completed_normally:
                self.signals.finished.emit()

# Real-Time Dual-Channel Audio Listener (WASAPI Loopback + Microphone)
class AudioWorker(QThread):
    def __init__(self, api_key: str, interview_mode: bool = False, resume_text: str = "", resume_language: str = "", provider_keys: dict = None):
        super().__init__()
        self.api_key = api_key
        self.interview_mode = interview_mode
        self.resume_text = resume_text
        self.resume_language = resume_language
        self.provider_keys = provider_keys or {}
        self.signals = WorkerSignals()
        self.is_listening = False
        
        # Dual-Channel state
        self.interviewer_speaking = False
        self.transcript_context = []  # List of dicts: {"source": str, "text": str}
        self.provider_keys = provider_keys or {}

        # Configurable interviewer silence threshold (2.5 seconds = 5 x 0.5s chunks)
        self.interviewer_silence_seconds = 2.5
        self.processed_question_ids = set()

    def _effective_keys(self):
        return ai_config.build_provider_keys(self.api_key, "", self.provider_keys)

    def stop(self):
        self.is_listening = False

    def run(self):
        if not HAS_AUDIO:
            self.signals.error.emit("Audio loopback libraries (soundcard/numpy) not installed.")
            return

        import soundcard as sc
        import numpy as np
        try:
            import speech_recognition as sr
        except ImportError:
            self.signals.error.emit("Audio requires the 'SpeechRecognition' package. Run: pip install SpeechRecognition")
            return
        import warnings
        import concurrent.futures
        import threading
        
        warnings.filterwarnings("ignore", message="data discontinuity in recording")
        self.is_listening = True
        self.signals.started.emit()
        print("[AudioWorker] Dual-Channel audio listener started...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            executor.submit(self.listen_interviewer, sc, np, sr, threading)
            executor.submit(self.listen_candidate, sc, np, sr, threading)
            
            while self.is_listening:
                self.msleep(100)

    def trigger_ai(self, question, sr, threading):
        if not self.is_listening:
            print("[AudioWorker] Audio is OFF — skipping AI trigger.")
            return
        import hashlib
        q_clean = (question or "").strip().lower()
        if not q_clean:
            return
        question_id = hashlib.md5(q_clean.encode('utf-8')).hexdigest()
        is_new = ai_config.SESSION_API_COUNTER.record_question_id(question_id)
        if not is_new or question_id in self.processed_question_ids:
            print(f"[AudioWorker] Question ID {question_id[:8]} already processed — skipping duplicate AI trigger.")
            return
        self.processed_question_ids.add(question_id)
        threading.Thread(target=self._query_ai, args=(question_id,), daemon=True).start()

    def _query_ai(self, question_id=None):
        if not self.is_listening:
            print("[AudioWorker] Audio is OFF — aborting AI query execution.")
            return
        try:
            api_key_clean = self.api_key.strip().strip("'").strip('"')
            if not api_key_clean:
                self.signals.error.emit("Audio Listening requires an API key. Add one in the Dashboard.")
                return

            interviewer_question = ""
            for msg in reversed(self.transcript_context):
                if msg['source'] == 'Interviewer':
                    interviewer_question = msg['text']
                    break
            if not interviewer_question:
                interviewer_question = "[System voice analysis question]"

            context_str = "\n".join([f"[{msg['source']}]: {msg['text']}" for msg in self.transcript_context[-8:]])
            
            if self.interview_mode:
                lang_hint = f"\n- CODE LANGUAGE: The candidate's resume is primarily in **{self.resume_language}**. When writing or explaining code examples, you MUST use **{self.resume_language}**." if self.resume_language else ""
                if self.resume_text:
                    prompt = f"""You are a real person interviewing for a job. This is your resume:

{self.resume_text}

INTERVIEWER QUESTION: "{interviewer_question}"

HOW TO ANSWER:
- Base your answer on your resume whenever possible — mention your actual projects, skills, and experience.
- If the question is about something NOT in your resume (like role model, greatest strength, biggest failure, etc.), answer naturally from your own perspective as a real person. Pick a realistic role model (e.g., a professor, senior engineer, tech leader like Linus Torvalds, or someone from your actual experience) and explain why.
- NEVER say "I don't have access to my resume", "I don't have the details", "I'm an AI", "As a language model", or refuse to answer. You always have an opinion as a real person.
- Answer in first person (I/my/me).
- Sound like a real human talking — casual, confident, natural. No corporate jargon.
- If the question involves code, include the code in ``` blocks.{lang_hint}

FORMAT:

SPOKEN ANSWER:
[Your direct answer — 3-5 sentences. Use resume details when relevant, otherwise answer naturally from your POV.]

KEY POINTS:
- [One strong point from your background or a relevant personal insight]
- [Another strong point or example]
- [Optional third point]

Do NOT reply to the user's microphone input! Only respond to the Interviewer!
"""
                else:
                    prompt = f"""You are a real person answering a live interview question in first-person (I/my).

INTERVIEWER QUESTION: "{interviewer_question}"

RULES:
- Sound authentic, like a real developer talking to an interviewer. Casual but professional.
- NEVER use corporate buzzwords: "synergy", "leverage", "delve", "under the hood", "in production systems", "robust", "comprehensive", "seamless".
- If the interviewer asks about code, include the actual code snippet inside ``` blocks.{lang_hint}
- Give a solid, complete answer so the candidate can keep talking comfortably for 30-60 seconds:
  * For basic/simple questions: 3-4 sentence direct answer.
  * For technical or coding questions: 4-5 sentence answer, and add 2-3 practical usage bullets under KEY POINTS. Include code if relevant.
  * For behavioral questions: 4-5 sentence story/mindset response, and add 2-3 real story bullets.
- NEVER say "As an AI" or "As a language model".

FORMAT YOUR ANSWER EXACTLY LIKE THIS:

SPOKEN ANSWER:
[Your natural spoken answer here — 3-5 sentences. If code is relevant, include it inline.]

KEY POINTS:
- [One direct point the candidate should mention if asked to elaborate]
- [Another direct point]
- [Optional third point]

Do NOT reply to the user's microphone input! Only respond to the Interviewer!
"""
            else:
                prompt = SYSTEM_SOLVE_PROMPT + f"""
Here is the recent transcript:
{context_str}

The interviewer just finished speaking. Provide a short, direct technical answer to their question.
Do NOT reply to the user's microphone input! Only respond to the Interviewer!
Keep it short and crisp!
"""

            raw_answer = ""

            # Task-aware routing for the live interview answer. Low latency is
            # the priority here: Groq FAST primary, then Gemini FAST, then
            # OpenRouter emergency. No verification, no caching (live context).
            keys = self._effective_keys()
            if not any((keys.get(p) or "").strip() for p in ("groq", "openrouter", "gemini")):
                self.signals.error.emit("Audio Listening requires an API key. Add one in the Dashboard.")
                return

            routed = ai_config.route_request(
                keys=keys,
                task=ai_config.TASK_INTERVIEW,
                prompt=prompt,
                image_bytes=None,
                history=None,
                skip_history=True,
                difficulty="",
                max_tokens=900,
                allow_cache=False,
                cache_key_val=None,
            )
            raw_answer = routed.get("text") or ""

            if raw_answer:
                clean_ans = extract_clean_code_or_answer(raw_answer)
                
                try:
                    interviewer_question = ""
                    for msg in reversed(self.transcript_context):
                        if msg['source'] == 'Interviewer':
                            interviewer_question = msg['text']
                            break
                    if not interviewer_question:
                        interviewer_question = "[System voice analysis question]"

                    sess_id = get_db().get_or_create_session('interview')
                    if sess_id:
                        get_db().log_interaction(sess_id, 'interview', interviewer_question, clean_ans)
                except Exception as e:
                    print(f"[Logging] Failed to log interaction: {e}")

                self.signals.transcription.emit(clean_ans, True, "ai")
                context_text = clean_ans
                if self.interview_mode and "SPOKEN ANSWER" in clean_ans.upper() and "KEY POINTS" in clean_ans.upper():
                    upper = clean_ans.upper()
                    i1 = upper.find("SPOKEN ANSWER")
                    i2 = upper.find("KEY POINTS")
                    if -1 < i1 < i2:
                        spoken = clean_ans[i1 + len("SPOKEN ANSWER"):i2].strip(" :*\n\t")
                        if spoken:
                            context_text = spoken
                self.transcript_context.append({"source": "AI Suggestion", "text": context_text})
                
        except Exception as e:
            print(f"[AudioWorker] AI Query Error: {e}")

    def listen_interviewer(self, sc, np, sr, threading):
        sample_rate = 16000
        chunk_duration = 0.5
        chunk_frames = int(sample_rate * chunk_duration)
        phrase_buffer = collections.deque()
        phrase_buffer_samples = 0
        is_recording_phrase = False
        silence_chunks = 0
        recognizer = sr.Recognizer()

        try:
            default_speaker = sc.default_speaker()
            loopback_mic = sc.get_microphone(default_speaker.id, include_loopback=True)
            print(f"[AudioWorker] Interviewer Listener bound to: {loopback_mic.name}")
        except Exception as e:
            print(f"[AudioWorker] Failed to bind loopback: {e}")
            return

        with loopback_mic.recorder(samplerate=sample_rate) as recorder:
            while self.is_listening:
                try:
                    audio_chunk = recorder.record(numframes=chunk_frames)
                    if not self.is_listening: break
                    
                    chunk_mono = audio_chunk[:, 0] if len(audio_chunk.shape) > 1 and audio_chunk.shape[1] > 1 else audio_chunk.flatten()
                    energy = float(np.max(np.abs(chunk_mono))) if len(chunk_mono) > 0 else 0.0
                    
                    is_currently_speaking = energy > 0.008
                    self.interviewer_speaking = is_currently_speaking
                    self.signals.audio_level.emit(energy, is_currently_speaking)

                    if is_currently_speaking:
                        is_recording_phrase = True
                        silence_chunks = 0
                        phrase_buffer.append(chunk_mono)
                        phrase_buffer_samples += len(chunk_mono)
                    elif is_recording_phrase:
                        phrase_buffer.append(chunk_mono)
                        phrase_buffer_samples += len(chunk_mono)
                        silence_chunks += 1
                        
                    # Silence check: wait for 2.5 seconds of continuous silence (5 x 0.5s chunks)
                    # before finalizing the interviewer question so mid-sentence pauses never split the question.
                    min_silence_chunks = int(getattr(self, 'interviewer_silence_seconds', 2.5) / 0.5)
                    if is_recording_phrase and (silence_chunks >= min_silence_chunks or phrase_buffer_samples >= 16000 * 45):
                        audio_length_sec = phrase_buffer_samples / sample_rate
                        if audio_length_sec < 1.0:
                            phrase_buffer.clear()
                            phrase_buffer_samples = 0
                            is_recording_phrase = False
                            silence_chunks = 0
                            continue
                            
                        audio_np = np.concatenate(list(phrase_buffer))
                        threading.Thread(target=self._transcribe_interviewer, args=(audio_np, sample_rate, sr, recognizer, threading), daemon=True).start()
                        
                        phrase_buffer.clear()
                        phrase_buffer_samples = 0
                        is_recording_phrase = False
                        silence_chunks = 0
                except Exception as e:
                    print(f"[AudioWorker] Interviewer chunk error: {e}")

    def _transcribe_interviewer(self, phrase_buffer, sample_rate, sr, recognizer, threading):
        try:
            import numpy as np
            audio_data_int16 = (phrase_buffer * 32767.0).astype(np.int16)
            audio_data_obj = sr.AudioData(audio_data_int16.tobytes(), sample_rate, 2)
            self.signals.transcription.emit("Listening...", False, "interviewer")
            full_text, stt_provider = ai_config.transcribe_audio(self._effective_keys(), audio_data_obj)
            if not full_text:
                full_text = recognizer.recognize_google(audio_data_obj)
            print(f"[Interviewer]: '{full_text}'")
            self.signals.transcription.emit(full_text, True, "interviewer")
            self.transcript_context.append({"source": "Interviewer", "text": full_text})
            
            if self.is_listening:
                self.trigger_ai(full_text, sr, threading)
        except sr.UnknownValueError:
            pass
        except Exception as e:
            print(f"[Interviewer] Transcribe Error: {e}")

    def listen_candidate(self, sc, np, sr, threading):
        sample_rate = 16000
        chunk_duration = 0.5
        chunk_frames = int(sample_rate * chunk_duration)
        phrase_buffer = collections.deque()
        phrase_buffer_samples = 0
        is_recording_phrase = False
        silence_chunks = 0
        recognizer = sr.Recognizer()

        try:
            # Prefer a real input mic. On some systems the "default
            # microphone" is a loopback / stereo-mix device that also captures
            # the interviewer's TTS played out the speakers, polluting the
            # candidate's answer. all_microphones() (without include_loopback)
            # lists only genuine input devices.
            mic = None
            try:
                real_mics = sc.all_microphones()
                default_mic = sc.default_microphone()
                for m in real_mics:
                    if m.id == default_mic.id:
                        mic = m
                        break
                if mic is None and real_mics:
                    mic = real_mics[0]
                if mic is None:
                    mic = default_mic
            except Exception:
                mic = None
            if not mic:
                print("[AudioWorker] No candidate input mic found")
                return
            print(f"[AudioWorker] Candidate Listener bound to: {mic.name}")
        except Exception as e:
            print(f"[AudioWorker] Failed to bind candidate mic: {e}")
            return

        with mic.recorder(samplerate=sample_rate) as recorder:
            while self.is_listening:
                try:
                    audio_chunk = recorder.record(numframes=chunk_frames)
                    if not self.is_listening: break
                    
                    if self.interviewer_speaking:
                        phrase_buffer.clear()
                        phrase_buffer_samples = 0
                        is_recording_phrase = False
                        silence_chunks = 0
                        continue
                        
                    chunk_mono = audio_chunk[:, 0] if len(audio_chunk.shape) > 1 and audio_chunk.shape[1] > 1 else audio_chunk.flatten()
                    energy = float(np.max(np.abs(chunk_mono))) if len(chunk_mono) > 0 else 0.0
                    
                    is_currently_speaking = energy > 0.03
                    
                    if is_currently_speaking:
                        is_recording_phrase = True
                        silence_chunks = 0
                        phrase_buffer.append(chunk_mono)
                        phrase_buffer_samples += len(chunk_mono)
                    elif is_recording_phrase:
                        phrase_buffer.append(chunk_mono)
                        phrase_buffer_samples += len(chunk_mono)
                        silence_chunks += 1
                        
                    if is_recording_phrase and (silence_chunks >= 2 or phrase_buffer_samples >= 16000*15):
                        audio_length_sec = phrase_buffer_samples / sample_rate
                        if audio_length_sec < 1.0:
                            phrase_buffer.clear()
                            phrase_buffer_samples = 0
                            is_recording_phrase = False
                            silence_chunks = 0
                            continue
                            
                        audio_np = np.concatenate(list(phrase_buffer))
                        threading.Thread(target=self._transcribe_candidate, args=(audio_np, sample_rate, sr, recognizer), daemon=True).start()
                        
                        phrase_buffer.clear()
                        phrase_buffer_samples = 0
                        is_recording_phrase = False
                        silence_chunks = 0
                except Exception as e:
                    print(f"[AudioWorker] Candidate chunk error: {e}")

    def _transcribe_candidate(self, phrase_buffer, sample_rate, sr, recognizer):
        try:
            import numpy as np
            audio_data_int16 = (phrase_buffer * 32767.0).astype(np.int16)
            audio_data_obj = sr.AudioData(audio_data_int16.tobytes(), sample_rate, 2)
            self.signals.transcription.emit("Listening...", False, "user")
            full_text, _stt_provider = ai_config.transcribe_audio(self._effective_keys(), audio_data_obj)
            if not full_text:
                full_text = recognizer.recognize_google(audio_data_obj)
            print(f"[You]: '{full_text}'")
            self.signals.transcription.emit(full_text, True, "user")
            self.transcript_context.append({"source": "You", "text": full_text})
        except sr.UnknownValueError:
            pass
        except Exception as e:
            print(f"[You] Transcribe Error: {e}")

# Resizable, Ultra-Clean Glass Floating HUD Widget with Voice-Reactive Animation
class FloatingHUD(QWidget):
    sig_silent_capture = Signal()
    sig_show_hud = Signal()
    sig_hide_hud = Signal()
    sig_clear_answer = Signal()
    sig_toggle_sticky = Signal()
    sig_toggle_audio = Signal()
    sig_toggle_interview_mode = Signal()
    sig_toggle_ghost = Signal()
    sig_update_stealth = Signal(str)
    sig_submit_stealth = Signal(str)
    sig_scroll_up = Signal()
    sig_scroll_down = Signal()
    sig_toggle_type = Signal()
    sig_stop_type = Signal()
    sig_selection_capture = Signal()
    sig_toggle_minimal = Signal()

    # Chat Mode (Alt+Q toggle): True when the persistent chat input is active
    sig_chat_mode = Signal(bool)
    
    # NEW SIGNAL FOR CHEAT SHEET
    sig_show_cheat = Signal()

    # Safe app quit — emitted from non-GUI threads (e.g. pynput) and marshalled to the GUI thread.
    sig_quit_app = Signal()

    def __init__(self, db: DatabaseManager):
        super().__init__()
        self.db = db
        self.api_key = self.db.get_setting("groq_api_key") or self.db.get_setting("openrouter_api_key")
        self.drag_position = QPoint()
        self.worker = None
        self.audio_worker = None
        self.cached_answer = ""
        self.is_capturing = False
        self.interview_mode = False
        self.is_ghost_mode = True  # Default to Safe Ghost Mode
        
        # Load active resume by default on startup
        active_idx = self.db.get_setting('active_resume_slot')
        if active_idx is None:
            active_idx = '0'
        self.resume_text = (self.db.get_setting(f'resume_slot_{active_idx}_content') or "").strip()
        self.resume_language = detect_language_from_text(self.resume_text) or ""
        if self.resume_language:
            print(f"[HUD] Detected resume language: {self.resume_language}")
        self.last_capture_time = 0
        self.vision_history = []
        self.history_lock = threading.Lock()
        
        # Auto-typer state
        self.typing_text = ""
        self.typing_index = 0
        self.typer_thread = None
        self.visual_cache = {}
        self.is_minimal_mode = False
        self.last_language = ""
        self.resume_language = ""
        # Persistent chat log shown in the HUD until Alt+C clears it (bounded to 40 entries)
        self.chat_log_md = ""
        self.chat_log_entries = []
        self.pending_question = ""
        self.is_followup_request = False
        self.last_question_text = ""
        self.current_interviewer_q_html = ""
        # Chat Mode (Alt+Q): persistent input where Alt+S attaches content instead of solving
        self.chat_mode_active = False
        self.stealth_screenshot_pending = False
        self.stealth_text_attached = False
        
        # Fast UI Animation tracking
        self.anim_step = 0
        self.is_currently_speaking = False
        self.anim_timer = QTimer(self)
        self.anim_timer.timeout.connect(self.update_animation)
        self.anim_timer.start(250)

        # Auto-hide timer setup
        self.auto_hide_timer = QTimer(self)
        self.auto_hide_timer.setSingleShot(True)
        self.auto_hide_timer.timeout.connect(self.hide_peek)
        # Cheat-sheet auto-hide delay (ms). 0 = never auto-hide (matches the
        # default hud_auto_hide = 'Never' setting). Initialized here so
        # show_cheat_sheet() never hits a missing attribute.
        self.auto_hide_delay = 0
        # Cheat-sheet state for the Alt+N hotkey. `_showing_cheat` is True while
        # the cheat sheet is on screen. `_cheat_close_on_toggle` records whether
        # the HUD was INACTIVE before the cheat sheet was first shown:
        #   - False -> HUD was already on -> Alt+N returns to the normal HUD view.
        #   - True  -> HUD was off     -> Alt+N closes the HUD entirely.
        self._showing_cheat = False
        self._cheat_close_on_toggle = False

        # Setup settings polling timer for live update
        self.settings_poll_timer = QTimer(self)
        self.settings_poll_timer.timeout.connect(self.apply_hud_settings)
        self.settings_poll_timer.start(1500)

        self.init_ui()
        self.connect_signals()

        # Position HUD flush at VERY TOP CENTER of screen (y = 10px)
        screen_geom = QApplication.primaryScreen().geometry()
        self.default_hud_w = 640
        self.default_hud_h = int(screen_geom.height() * 0.8) # 80% height to fit long CodeChef answers
        self.resize(self.default_hud_w, self.default_hud_h)
        self.move((screen_geom.width() - self.default_hud_w) // 2, 10)

        # Enable Windows Screen Capture Protection (WDA_EXCLUDEFROMCAPTURE = 0x11)
        self.enable_screen_share_protection()
        QTimer.singleShot(100, self._apply_window_spoofing)
        QTimer.singleShot(150, self._hide_from_alttab)

    def enable_screen_share_protection(self):
        """Prevent screen recorders from capturing the HUD window (Windows only)."""
        if sys.platform != 'win32':
            return
        try:
            import ctypes
            WDA_EXCLUDEFROMCAPTURE = 0x00000011
            hwnd = int(self.winId())
            ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
            print("[HUD] Windows Capture Exclusion active: HUD is INVISIBLE to screen sharing & recording!")
        except Exception as e:
            print(f"[HUD] Capture Exclusion Notice: {e}")

    def _apply_window_spoofing(self):
        """Spoof HUD window title/class to look like a benign Windows component."""
        if sys.platform != 'win32':
            return
        try:
            import ctypes
            hwnd = int(self.winId())
            user32 = ctypes.windll.user32
            user32.SetWindowTextW(hwnd, "Windows PowerShell")
            gdi32 = ctypes.windll.gdi32
            atom_name = "ConsoleWindowClass"
            user32.SetClassLongPtrW(hwnd, -32, user32.RegisterClassW(ctypes.create_unicode_buffer(atom_name)))
            print("[HUD] Window spoofing applied: title='Windows PowerShell', class='ConsoleWindowClass'")
        except Exception as e:
            print(f"[HUD] Window spoofing failed: {e}")

    def _hide_from_alttab(self):
        """Hide HUD from Alt+Tab using WS_EX_TOOLWINDOW."""
        if sys.platform != 'win32':
            return
        try:
            import ctypes
            hwnd = int(self.winId())
            user32 = ctypes.windll.user32
            GWL_EXSTYLE = -20
            WS_EX_TOOLWINDOW = 0x00000080
            WS_EX_NOACTIVATE = 0x08000000
            ex_style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            user32.SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE)
            print("[HUD] Hidden from Alt+Tab using WS_EX_TOOLWINDOW + WS_EX_NOACTIVATE")
        except Exception as e:
            print(f"[HUD] Alt+Tab hide failed: {e}")

    def _apply_mac_overlay_style(self):
        """Re-apply Cocoa overlay style after the native window (re)appears.

        Both properties can be reset when the native window is recreated (e.g.
        after setWindowFlags), so this is re-run on every show.
        """
        if sys.platform != 'darwin':
            return
        mac = _mac_support()
        mac.set_hud_click_through(self, self.is_ghost_mode)
        mac.set_hud_hidden_from_capture(self, True)

    def showEvent(self, event):
        super().showEvent(event)
        if sys.platform == 'darwin':
            QTimer.singleShot(0, self._apply_mac_overlay_style)

    def init_ui(self):
        flags = Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
        if sys.platform == 'darwin':
            flags |= Qt.WindowDoesNotAcceptFocus
        if self.is_ghost_mode:
            flags |= Qt.WindowTransparentForInput
            
        self.setWindowFlags(flags)
        self.setAttribute(Qt.WA_TranslucentBackground)
        icon_path = resource_path("app.ico")
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))
        self.setMinimumSize(320, 220)

        self.container = QWidget(self)
        self.container.setAttribute(Qt.WA_StyledBackground, True)
        container = self.container
        container.setObjectName("MainContainer")
        container.setStyleSheet("""
            QWidget#MainContainer {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 rgba(15, 23, 42, 0.95), stop:1 rgba(30, 41, 59, 0.92));
                border: 1.5px solid rgba(56, 189, 248, 0.35);
                border-radius: 14px;
            }
            QLabel {
                color: #FFFFFF;
                font-family: 'Segoe UI', system-ui, sans-serif;
            }
            QTextEdit {
                background-color: rgba(15, 23, 42, 0.7);
                color: #F8FAFC;
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 10px;
                font-size: 14.5px;
                font-weight: 500;
                font-family: 'Segoe UI', system-ui, sans-serif;
                padding: 12px;
                line-height: 1.55;
            }
            QScrollBar:vertical {
                border: none;
                background: rgba(0, 0, 0, 0.2);
                width: 6px;
                border-radius: 3px;
            }
            QScrollBar::handle:vertical {
                background: rgba(56, 189, 248, 0.4);
                border-radius: 3px;
                min-height: 24px;
            }
            QScrollBar::handle:vertical:hover {
                background: rgba(56, 189, 248, 0.8);
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                height: 0px;
            }
            QPushButton {
                background: rgba(56, 189, 248, 0.15);
                color: #38BDF8;
                border: 1px solid rgba(56, 189, 248, 0.35);
                border-radius: 6px;
                padding: 4px 10px;
                font-weight: 700;
                font-size: 11px;
            }
            QPushButton:hover {
                background: rgba(56, 189, 248, 0.35);
                color: #FFFFFF;
            }
            QPushButton#CloseBtn {
                background: #DC2626 !important;
                color: #FFFFFF !important;
                border: 1.5px solid #EF4444 !important;
                border-radius: 13px !important;
                font-weight: 900 !important;
                font-size: 14px !important;
                font-family: 'Segoe UI', Arial, sans-serif !important;
                padding: 0px !important;
                margin: 0px !important;
                line-height: 26px !important;
                text-align: center !important;
            }
            QPushButton#CloseBtn:hover {
                background: #B91C1C !important;
                color: #FFFFFF !important;
                border: 1.5px solid #F87171 !important;
            }
        """)

        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(28)
        shadow.setColor(QColor(0, 0, 0, 180))
        shadow.setOffset(0, 8)
        container.setGraphicsEffect(shadow)

        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        main_layout.addWidget(container)

        container_layout = QVBoxLayout(container)
        container_layout.setContentsMargins(10, 8, 10, 8)
        container_layout.setSpacing(6)

        # Header Bar (Draggable Title with 85px Logo & ADVANCED COPILOT Badge)
        header_layout = QHBoxLayout()
        header_layout.setSpacing(8)
        header_layout.setContentsMargins(0, 0, 0, 0)

        # Logo reduced by 5% (89px -> 85px) with neat 58x50px label bounds
        logo_img_label = QLabel()
        logo_img_label.setFixedSize(58, 50)
        logo_path = resource_path("logo.png")
        if os.path.exists(logo_path):
            pix = QPixmap(logo_path).scaled(85, 85, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            logo_img_label.setPixmap(pix)
            logo_img_label.setScaledContents(False)
            logo_img_label.setAlignment(Qt.AlignLeft | Qt.AlignVCenter)
            logo_img_label.setStyleSheet("border-radius: 6px; margin: 0; padding: 0; border: none;")

        # Single line title badge with clean 4px left margin
        title_label = QLabel("<span style='color: #FFFFFF; font-size: 16.5px; font-weight: 900; letter-spacing: 0.5px;'>HIREBOT AI</span> <span style='color: #38BDF8; font-size: 11.5px; font-weight: 800; letter-spacing: 1px; background: rgba(56, 189, 248, 0.12); padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(56, 189, 248, 0.3);'>ADVANCED COPILOT</span>")
        title_label.setStyleSheet("margin: 0; padding: 0; margin-left: 2px;")
        title_label.setFont(QFont("Segoe UI", 11))

        # Status badge (Hidden by default; pops up only when key toggled!)
        status_dot = QLabel("")
        status_dot.setAlignment(Qt.AlignCenter)
        status_dot.setStyleSheet("color: #C084FC; background: rgba(192, 132, 252, 0.15); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 10px; font-weight: 700; font-size: 10px; padding: 1px 6px;")
        status_dot.hide()
        self.status_dot = status_dot

        # Listening badge (separate widget so interview + listening show side by side)
        listening_badge = QLabel("")
        listening_badge.setAlignment(Qt.AlignCenter)
        listening_badge.setStyleSheet("color: #E0F2FE; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 10px; font-weight: 700; font-size: 13px; padding: 2px 10px;")
        listening_badge.hide()
        self.listening_badge = listening_badge

        close_btn = QPushButton("X")
        close_btn.setObjectName("CloseBtn")
        close_btn.setFixedSize(26, 26)
        close_btn.clicked.connect(QApplication.quit)

        self.preview_label = QLabel()
        self.preview_label.setFixedSize(90, 60)
        self.preview_label.setStyleSheet("border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background-color: rgba(0,0,0,0.4);")
        self.preview_label.setScaledContents(True)
        self.preview_label.hide()

        header_layout.addWidget(logo_img_label)
        header_layout.addWidget(title_label)
        header_layout.addWidget(status_dot)
        header_layout.addWidget(self.listening_badge)
        header_layout.addStretch()
        header_layout.addWidget(self.preview_label)
        header_layout.addWidget(close_btn)

        # ============================================================
        # Professional HUD Controls Row
        # ============================================================
        controls_row = QWidget()
        controls_row.setObjectName("HudControlsRow")

        controls_layout = QHBoxLayout(controls_row)
        controls_layout.setContentsMargins(6, 4, 6, 4)
        controls_layout.setSpacing(5)

        def create_hud_icon_button(icon, tooltip, object_name):
            btn = QToolButton()
            btn.setObjectName(object_name)
            btn.setIcon(icon)
            btn.setToolTip(tooltip)
            btn.setCursor(Qt.PointingHandCursor)
            btn.setFixedSize(30, 28)
            btn.setIconSize(QSize(15, 15))
            btn.setStyleSheet("""
                QToolButton {
                    background: rgba(255, 255, 255, 0.045);
                    color: #CBD5E1;
                    border: 1px solid rgba(255, 255, 255, 0.10);
                    border-radius: 7px;
                    padding: 0px;
                }
                QToolButton:hover {
                    background: rgba(56, 189, 248, 0.12);
                    border: 1px solid rgba(56, 189, 248, 0.35);
                    color: #E0F2FE;
                }
                QToolButton:pressed {
                    background: rgba(56, 189, 248, 0.20);
                    border: 1px solid rgba(56, 189, 248, 0.50);
                }
            """)
            return btn

        opacity_container = QWidget()
        opacity_container.setObjectName("HudOpacityContainer")
        opacity_layout = QHBoxLayout(opacity_container)
        opacity_layout.setContentsMargins(7, 0, 7, 0)
        opacity_layout.setSpacing(5)

        opacity_label = QLabel("OPACITY")
        opacity_label.setObjectName("HudControlLabel")
        opacity_label.setStyleSheet("""
            QLabel {
                color: #64748B;
                font-size: 8px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
        """)

        self.hud_opacity_slider = QSlider(Qt.Horizontal)
        self.hud_opacity_slider.setRange(10, 100)
        self.hud_opacity_slider.setValue(100)
        self.hud_opacity_slider.setFixedWidth(72)
        self.hud_opacity_slider.setFixedHeight(20)
        self.hud_opacity_slider.setStyleSheet("""
            QSlider::groove:horizontal {
                height: 4px;
                background: rgba(255,255,255,0.09);
                border-radius: 2px;
            }
            QSlider::sub-page:horizontal {
                background: #38BDF8;
                border-radius: 2px;
            }
            QSlider::add-page:horizontal {
                background: rgba(255,255,255,0.07);
                border-radius: 2px;
            }
            QSlider::handle:horizontal {
                width: 12px;
                height: 12px;
                margin: -4px 0;
                background: #E0F2FE;
                border: 2px solid #38BDF8;
                border-radius: 6px;
            }
            QSlider::handle:horizontal:hover {
                background: #FFFFFF;
                border: 2px solid #7DD3FC;
            }
        """)
        self.hud_opacity_slider.setToolTip("HUD opacity")
        self.hud_opacity_slider.valueChanged.connect(self._on_hud_opacity_changed)

        opacity_layout.addWidget(opacity_label)
        opacity_layout.addWidget(self.hud_opacity_slider)
        opacity_container.setStyleSheet("""
            QWidget#HudOpacityContainer {
                background: rgba(255,255,255,0.035);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 7px;
            }
        """)

        screenshot_btn = create_hud_icon_button(
            self.style().standardIcon(QStyle.SP_DialogSaveButton),
            "Capture screenshot",
            "HudScreenshotButton"
        )
        screenshot_btn.clicked.connect(self._on_hud_screenshot_clicked)

        self.hud_mic_btn = QToolButton()
        self.hud_mic_btn.setObjectName("HudMicButton")
        self.hud_mic_btn.setCheckable(True)
        self.hud_mic_btn.setCursor(Qt.PointingHandCursor)
        self.hud_mic_btn.setFixedSize(30, 28)
        self.hud_mic_btn.setIconSize(QSize(15, 15))
        self.hud_mic_btn.setToolTip("Enable microphone")
        self.hud_mic_btn.setIcon(self.style().standardIcon(QStyle.SP_MediaVolume))
        self.hud_mic_btn.setStyleSheet("""
            QToolButton {
                background: rgba(255,255,255,0.045);
                color: #CBD5E1;
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 7px;
            }
            QToolButton:hover {
                background: rgba(56,189,248,0.12);
                border: 1px solid rgba(56,189,248,0.35);
            }
            QToolButton:checked {
                background: rgba(52,211,153,0.12);
                border: 1px solid rgba(52,211,153,0.40);
                color: #6EE7B7;
            }
            QToolButton:checked:hover {
                background: rgba(52,211,153,0.18);
                border: 1px solid rgba(52,211,153,0.55);
            }
        """)
        self.hud_mic_btn.clicked.connect(self._on_hud_mic_toggled)

        divider = QFrame()
        divider.setFrameShape(QFrame.VLine)
        divider.setFixedHeight(18)
        divider.setStyleSheet("""
            QFrame {
                color: rgba(255,255,255,0.10);
                background: rgba(255,255,255,0.10);
                max-width: 1px;
            }
        """)

        text_size_container = QWidget()
        text_size_layout = QHBoxLayout(text_size_container)
        text_size_layout.setContentsMargins(6, 0, 4, 0)
        text_size_layout.setSpacing(4)

        text_size_label = QLabel("TEXT")
        text_size_label.setStyleSheet("""
            QLabel {
                color: #64748B;
                font-size: 8px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
        """)

        self.hud_text_size_combo = QComboBox()
        self.hud_text_size_combo.setObjectName("HudTextSizeCombo")
        self.hud_text_size_combo.addItems(["Small", "Medium", "Large"])
        self.hud_text_size_combo.setCurrentText("Medium")
        self.hud_text_size_combo.setFixedWidth(76)
        self.hud_text_size_combo.setFixedHeight(26)
        self.hud_text_size_combo.setStyleSheet("""
            QComboBox {
                background: rgba(255,255,255,0.045);
                color: #CBD5E1;
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 6px;
                padding: 2px 8px;
                font-size: 9px;
                font-weight: 600;
            }
            QComboBox:hover {
                background: rgba(255,255,255,0.07);
                border: 1px solid rgba(56,189,248,0.30);
            }
            QComboBox:focus {
                border: 1px solid rgba(56,189,248,0.45);
            }
            QComboBox::drop-down {
                width: 18px;
                border: none;
            }
            QComboBox::down-arrow {
                width: 0px;
                height: 0px;
                border-left: 3px solid transparent;
                border-right: 3px solid transparent;
                border-top: 4px solid #64748B;
            }
            QComboBox QAbstractItemView {
                background: #0F172A;
                color: #CBD5E1;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 6px;
                padding: 4px;
                selection-background-color: rgba(56,189,248,0.18);
                selection-color: #E0F2FE;
                outline: none;
            }
            QComboBox QAbstractItemView::item {
                padding: 5px 7px;
                border-radius: 4px;
            }
            QComboBox QAbstractItemView::item:hover {
                background: rgba(255,255,255,0.06);
            }
        """)
        self.hud_text_size_combo.currentTextChanged.connect(self._on_hud_text_size_changed)

        text_size_layout.addWidget(text_size_label)
        text_size_layout.addWidget(self.hud_text_size_combo)

        controls_layout.addWidget(opacity_container)
        controls_layout.addWidget(screenshot_btn)
        controls_layout.addWidget(self.hud_mic_btn)
        controls_layout.addWidget(divider)
        controls_layout.addWidget(text_size_container)
        controls_row.hide()
        self.hud_controls_row = controls_row

        container_layout.addLayout(header_layout)
        container_layout.addWidget(controls_row)

        # Stealth Query Display (styled as a chat input box)
        self.stealth_label = QLabel()
        self.stealth_label.setWordWrap(True)
        self.stealth_label.setMinimumHeight(42)
        self.stealth_label.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self.stealth_label.setStyleSheet("""
            QLabel {
                color: #E2E8F0;
                background-color: rgba(15, 23, 42, 0.55);
                border: 1px solid rgba(139, 92, 246, 0.55);
                border-radius: 8px;
                padding: 8px 10px;
                font-size: 13px;
                font-family: 'Segoe UI', sans-serif;
            }
        """)
        self.stealth_label.hide()
        container_layout.addWidget(self.stealth_label)

        # Question Summary Display
        self.question_label = QLabel()
        self.question_label.setWordWrap(True)
        self.question_label.setStyleSheet("color: #E2E8F0; background-color: rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 8px; font-size: 11px; margin-bottom: 4px; font-family: 'Segoe UI'; font-style: italic;")
        self.question_label.hide()
        container_layout.addWidget(self.question_label)

        # Main Markdown Result Display Text Area
        self.text_display = QTextEdit()
        self.text_display.setReadOnly(True)
        container_layout.addWidget(self.text_display)

        # Hotkey Info Bar + Resizable Corner Grip
        self.info_layout = QHBoxLayout()
        info_label = QLabel("ALT+S (Capture) • ALT+H (Toggle HUD) • ALT+I (Interview Mode)\nALT+O (Wake/Silent) • ALT+Q (Chat Mode) • ALT+T (Ghost) • ALT+P (Type) • ALT+C (Clear)")
        info_label.setStyleSheet("color: #94A3B8; font-size: 10px; font-weight: bold; line-height: 1.2;")
        
        copy_btn = QPushButton("Copy Code")
        copy_btn.setFixedSize(80, 22)
        copy_btn.setStyleSheet("font-size: 10px; padding: 2px;")
        copy_btn.clicked.connect(self.copy_code_only)

        size_grip = QSizeGrip(self)
        size_grip.setFixedSize(16, 16)
        size_grip.setStyleSheet("background-color: transparent;")

        self.info_layout.addWidget(info_label)
        self.info_layout.addWidget(copy_btn)
        self.info_layout.addWidget(size_grip)
        container_layout.addLayout(self.info_layout)
        
        # Display highly visible initial instructions
        mod = _modifier_label()
        startup_text = f"""### 🚀 Quick Controls

**{mod} + S** &nbsp;➔&nbsp; SOLVE / SCREENSHOT
**{mod} + H** &nbsp;➔&nbsp; TOGGLE HUD VISIBILITY
**{mod} + P** &nbsp;➔&nbsp; AUTO-TYPER PLAY/PAUSE
**{mod} + Q** &nbsp;➔&nbsp; CHAT MODE (TYPE + {mod}+S ATTACH)
**{mod} + I** &nbsp;➔&nbsp; INTERVIEW (AUTO AUDIO)
**{mod} + T** &nbsp;➔&nbsp; GHOST MODE (CLICKABLE)
**{mod} + M** &nbsp;➔&nbsp; MINIMALIST MODE
**{mod} + C** &nbsp;➔&nbsp; CLEAR HUD / ANSWER
**{mod} + Z** &nbsp;➔&nbsp; SLEEP / WAKE TOGGLE

*Ghost Mode is enabled by default. Clicks will pass through to background windows. Press {mod}+T to interact.*
"""
        # Typewriter Streaming Engine setup
        self.typewriter_timer = QTimer(self)
        self.typewriter_timer.setInterval(18)  # Smooth 18ms character streaming delay
        self.typewriter_timer.timeout.connect(self._typewriter_tick)
        self.typewriter_full_html = ""
        self.typewriter_char_idx = 0
        self.typewriter_is_html = False

        self.apply_hud_settings()

    def connect_signals(self):
        self.sig_silent_capture.connect(self.start_silent_capture)
        self.sig_show_hud.connect(self.show_peek)
        self.sig_hide_hud.connect(self.hide_peek)
        self.sig_clear_answer.connect(self.clear_stored_answer)
        self.sig_toggle_sticky.connect(self.toggle_sticky_view)
        self.sig_toggle_audio.connect(self.toggle_audio_listening)
        self.sig_toggle_interview_mode.connect(self.toggle_interview_mode)
        self.sig_toggle_ghost.connect(self.toggle_ghost_mode)
        self.sig_show_cheat.connect(self.show_cheat_sheet)

        self.sig_update_stealth.connect(self.on_update_stealth)
        self.sig_submit_stealth.connect(self.on_submit_stealth)
        self.sig_scroll_up.connect(self.scroll_up)
        self.sig_scroll_down.connect(self.scroll_down)
        self.sig_toggle_type.connect(self.toggle_stealth_typing)
        self.sig_stop_type.connect(self.stop_stealth_typing)
        self.sig_selection_capture.connect(self.start_stealth_selection_capture)
        self.sig_toggle_minimal.connect(self.toggle_minimal_mode)

    @Slot()
    def scroll_up(self):
        scrollbar = self.text_display.verticalScrollBar()
        scrollbar.setValue(scrollbar.value() - 80)

    @Slot()
    def scroll_down(self):
        scrollbar = self.text_display.verticalScrollBar()
        scrollbar.setValue(scrollbar.value() + 80)

    def flash_status(self, message, color="#60A5FA"):
        """Pops a short-lived status badge on the HUD (auto-hides after ~2.5s)."""
        self.status_dot.setText(message)
        self.status_dot.setStyleSheet(f"color: {color}; background: rgba(59, 130, 246, 0.12); border: 1px solid {color}40; border-radius: 10px; font-weight: 700; font-size: 10px; padding: 1px 6px;")
        self.status_dot.show()
        self.status_dot_timer = QTimer(self)
        self.status_dot_timer.setSingleShot(True)
        self.status_dot_timer.timeout.connect(self.status_dot.hide)
        self.status_dot_timer.start(2500)
        self.show()

    @Slot(str)
    def on_update_stealth(self, query):
        if not query:
            if getattr(self, 'chat_mode_active', False):
                mod = _modifier_label()
                self.stealth_label.setText(f"💬 Chat Mode ON — type & Enter to send • {mod}+S to attach (screenshot/text) • {mod}+Q/Esc to exit")
                self.stealth_label.show()
                self.status_dot.setText("[Chat Mode]")
                self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
                self.show()
            else:
                self.stealth_label.hide()
                self._restore_header_badge()
        else:
            self.stealth_label.setText(f"💬 {query}▌")
            self.stealth_label.show()
            self.status_dot.setText("[Typing...]")
            self.status_dot.setStyleSheet("color: #A78BFA; font-size: 11px;")
            self.show()

    @Slot(str)
    def on_submit_stealth(self, query):
        self.stealth_label.hide()
        self.status_dot.setText("Solving...")
        self.status_dot.setStyleSheet("color: #F59E0B; font-size: 11px;")
        # Only capture the screen if the user explicitly attached a screenshot via Alt+S;
        # a plain typed chat message (or attached highlighted text) goes through as-is.
        has_attached_text = getattr(self, 'stealth_text_attached', False)
        self.stealth_text_attached = False
        # Attached text/code = fresh solve, NOT a follow-up continuation, so old
        # conversation turns never pollute the new solve.
        self.start_silent_capture_with_query(query, follow_up=not has_attached_text, force_capture=False, explicit_capture=True, has_attached_text=has_attached_text)

    @Slot(float, bool)
    def on_audio_level(self, energy, is_speaking):
        self.is_currently_speaking = is_speaking
        if not is_speaking:
            self.listening_badge.setText("Listening...")
            self.listening_badge.setStyleSheet("color: #38BDF8; font-weight: bold; font-size: 13px; padding: 2px 10px;")
            self.listening_badge.show()

    @Slot()
    def update_animation(self):
        """Fluid QTimer-driven voice-reactive animation."""
        if self.audio_worker and self.audio_worker.isRunning() and self.is_currently_speaking:
            bars = ["▰▱▱▱", "▰▰▱▱", "▰▰▰▱", "▰▰▰▰"]
            self.anim_step = (self.anim_step + 1) % len(bars)
            self.listening_badge.setText(f"Listening {bars[self.anim_step]}")
            self.listening_badge.setStyleSheet("color: #38BDF8; font-weight: bold; font-size: 13px; padding: 2px 10px;")
            self.listening_badge.show()

    @Slot(str, bool, str)
    def on_transcription(self, text, is_final, source=""):
        """Displays real-time rolling chat log in the HUD."""
        if not text.strip():
            return
            
        if not is_final:
            if self.interview_mode and source == "user":
                return
            self.listening_badge.setText(text)
            self.listening_badge.setStyleSheet("color: #94A3B8; font-size: 11px;")
            self.listening_badge.show()
        else:
            # It's a final transcribed phrase or AI answer, format with high contrast colors!
            if source == "interviewer":
                formatted_msg = f"<div style='margin-bottom: 12px; background: rgba(30, 41, 59, 0.7); padding: 10px; border-left: 3px solid #38BDF8; border-radius: 6px;'><span style='color: #38BDF8; font-size: 11px; font-weight: bold;'>🎙️ [Interviewer Asked]</span><br><span style='color: #FFFFFF; font-size: 15px; font-weight: 600; line-height: 1.45;'>{text}</span></div>"
                if self.interview_mode:
                    # Save active interviewer question card and clear old text display
                    self.current_interviewer_q_html = formatted_msg
                    self.text_display.clear()
            elif source == "user":
                if self.interview_mode:
                    # Interview mode: the HUD shows the interviewer question and
                    # the AI's suggested answer only. The candidate's own speech
                    # echo is redundant clutter and must not resize the HUD.
                    self.listening_badge.setText("Listening...")
                    self.listening_badge.setStyleSheet("color: #38BDF8; font-weight: bold; font-size: 13px; padding: 2px 10px;")
                    self.listening_badge.show()
                    return
                formatted_msg = f"<div style='margin-bottom: 12px;'><span style='color: #60A5FA; font-size: 11px;'>[You]</span><br><span style='color: #93C5FD; font-size: 14px;'>{text}</span></div>"
            elif source == "ai":
                if self.interview_mode:
                    formatted_ans = self._format_interview_answer(text)
                    if not formatted_ans:
                        answer_html = self._md_code_blocks_to_html(text)
                        formatted_ans = f"<div style='margin-bottom: 14px; background: rgba(52, 211, 153, 0.15); padding: 10px; border-left: 3px solid #34D399; border-radius: 4px;'><span style='color: #34D399; font-size: 11px; font-weight: bold;'>💡 [AI Answer]</span><br><span style='color: #FFFFFF; font-size: 16px; font-weight: 700; line-height: 1.4;'>{answer_html}</span></div>"
                    
                    # Instantly set interviewer question card at top, then stream ONLY the AI answer card
                    prefix_html = self.current_interviewer_q_html or ""
                    self.start_typewriter_stream(formatted_ans, is_html=True, prefix_html=prefix_html)
                    return
                else:
                    formatted_msg = f"<div style='margin-bottom: 14px; background: rgba(52, 211, 153, 0.15); padding: 10px; border-left: 3px solid #34D399; border-radius: 4px;'><span style='color: #34D399; font-size: 11px; font-weight: bold;'>💡 [AI Answer]</span><br><span style='color: #FFFFFF; font-size: 16px; font-weight: 700; line-height: 1.4;'>{text}</span></div>"
            else:
                formatted_msg = f"<div style='margin-bottom: 10px;'><span style='color: #F3F4F6; font-size: 14px;'>{text}</span></div>"
                
            self.text_display.append(formatted_msg)
            
            # Auto-scroll so the latest active text rests centered in the view, pushing older text UP
            scrollbar = self.text_display.verticalScrollBar()
            target_pos = scrollbar.maximum() - int(self.text_display.height() * 0.3)
            scrollbar.setValue(max(0, target_pos))
            
            # Reset listening badge
            self.listening_badge.setText("Listening...")
            self.listening_badge.setStyleSheet("color: #38BDF8; font-weight: bold; font-size: 13px; padding: 2px 10px;")
            
            # In Interview Mode only: auto-grow/shrink the HUD to fit the latest message block
            if self.interview_mode:
                self.auto_size_hud(formatted_msg)

    def _md_code_blocks_to_html(self, md_text):
        import re
        def replace_block(match):
            lang = match.group(1) or ''
            code = match.group(2).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            return f"<pre style='background: rgba(0,0,0,0.45); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.55; border: 1px solid rgba(255,255,255,0.08);'><code>{code}</code></pre>"
        return re.sub(r'```(\w*)\n?(.*?)```', replace_block, md_text or '', flags=re.DOTALL)

    def _format_interview_answer(self, text):
        """Formats AI answer into clean, direct ready-to-read sections with matching prominent font size."""
        upper = text.upper()
        i1 = upper.find("SPOKEN ANSWER")
        i2 = upper.find("KEY POINTS")
        if i1 == -1 or i2 == -1 or i1 > i2:
            return None
        spoken = text[i1 + len("SPOKEN ANSWER"):i2].strip(" :*\n\t")
        points_raw = text[i2 + len("KEY POINTS"):].strip(" :*\n\t")
        if not spoken:
            return None

        spoken_html = self._md_code_blocks_to_html(spoken)
        points_html = self._md_code_blocks_to_html(points_raw)

        color = getattr(self, 'accent_color', '#34D399')
        html = f"<div style='margin-bottom: 14px; background: rgba(15, 23, 42, 0.85); padding: 14px 16px; border: 1px solid {color}40; border-left: 5px solid {color}; border-radius: 8px;'>"
        
        html += f"<div style='color: {color}; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 6px;'>💬 YOUR ANSWER (SAY ALOUD):</div>"
        html += f"<div style='color: #FFFFFF; font-size: 15.5px; font-weight: 600; line-height: 1.5; margin-bottom: 12px;'>{spoken_html}</div>"
        
        if points_raw:
            html += "<div style='padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.12);'>"
            html += "<div style='color: #FBBF24; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 8px;'>🎯 IF THEY PUSH FOR MORE:</div>"
            
            point_lines = [line.strip().lstrip("-*• ").strip() for line in points_html.split("\n") if line.strip()][:6]
            if point_lines:
                html += "<ul style='margin: 0; padding-left: 18px; color: #F3F4F6; font-size: 15px; font-weight: 600; line-height: 1.5;'>"
                for pt in point_lines:
                    html += f"<li style='margin-bottom: 6px;'>{pt}</li>"
                html += "</ul>"
            else:
                html += f"<div style='color: #F3F4F6; font-size: 15px; font-weight: 600; line-height: 1.5;'>{points_html}</div>"
            html += "</div>"
        
        html += "</div>"
        return html

    def start_typewriter_stream(self, text_content, is_html=False, prefix_html=""):
        """Streams AI answer content into the HUD with ultra-fast character streaming while keeping question prefix instant."""
        self.typewriter_timer.stop()
        self.typewriter_prefix_html = prefix_html
        self.typewriter_full_html = text_content
        self.typewriter_char_idx = 0
        self.typewriter_is_html = is_html
        self.text_display.clear()
        
        # Ultra-fast streaming interval (8ms)
        self.typewriter_timer.setInterval(8)
        self.typewriter_timer.start()

    def _typewriter_tick(self):
        prefix = getattr(self, 'typewriter_prefix_html', "")
        if self.typewriter_char_idx >= len(self.typewriter_full_html):
            self.typewriter_timer.stop()
            full_combined = prefix + self.typewriter_full_html
            if self.typewriter_is_html:
                self.text_display.setHtml(full_combined)
            else:
                self.text_display.setMarkdown(full_combined)
            scrollbar = self.text_display.verticalScrollBar()
            scrollbar.setValue(scrollbar.maximum())
            if self.interview_mode:
                self.auto_size_hud(full_combined)
            return

        # Ultra-fast stream: advance index by 30 characters per 8ms tick for lightning-fast display
        self.typewriter_char_idx = min(len(self.typewriter_full_html), self.typewriter_char_idx + 30)
        partial = prefix + self.typewriter_full_html[:self.typewriter_char_idx]

        if self.typewriter_is_html:
            self.text_display.setHtml(partial)
        else:
            self.text_display.setMarkdown(partial)

        scrollbar = self.text_display.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

        # Real-time dynamic height expansion: grow HUD size on each tick as lines type out
        if self.interview_mode:
            self.auto_size_hud()

    def auto_size_hud(self, latest_html=None):
        """Interview Mode only: resizes HUD to be wide in breadth (75%-85% screen width) with dynamic height fitting the content."""
        if not self.interview_mode:
            return
        screen = QApplication.primaryScreen().availableGeometry()
        try:
            # Enforce wide breadth (e.g., 78% of screen width) so text lays out in wide horizontal rows
            wide_w = int(screen.width() * 0.78)
            pad_w = 40
            chrome_h = 130
            max_h = int(screen.height() * 0.90)

            mdoc = QTextDocument()
            mdoc.setDefaultFont(self.text_display.font())
            mdoc.setHtml(latest_html if latest_html else self.text_display.toHtml())
            # Calculate height required at wide_w width
            mdoc.setTextWidth(wide_w - pad_w)
            mdoc.adjustSize()
            content_h = mdoc.size().height()

            # Dynamic height growing/shrinking naturally according to content length
            new_h = int(max(180, min(content_h + chrome_h, max_h)))
            new_w = wide_w
        except Exception as e:
            print(f"[HUD] Auto-size error: {e}")
            return

        cx = self.x() + self.width() // 2
        cy = self.y()
        self.resize(new_w, new_h)
        self.move(max(0, cx - new_w // 2), max(0, cy))

    def copy_code_only(self):
        text = self.cached_answer
        if "```" in text:
            parts = text.split("```")
            if len(parts) >= 3:
                lines = parts[1].split("\n")
                if len(lines) > 1 and not lines[0].strip().startswith("#") and len(lines[0].strip()) < 15:
                    code = "\n".join(lines[1:])
                else:
                    code = parts[1]
                QApplication.clipboard().setText(code.strip())
                self.status_dot.setText("[Code Copied!]")
                self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
                return

        QApplication.clipboard().setText(text)
        self.status_dot.setText("[Text Copied!]")
        self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")

    @Slot()
    def toggle_audio_listening(self):
        self.api_key = self.db.get_setting("groq_api_key") or self.db.get_setting("openrouter_api_key")
        
        if self.audio_worker and self.audio_worker.isRunning():
            print("[HUD] Stopping Audio Loopback Listening...")
            self.audio_worker.stop()
            self.audio_worker.wait(3000)
            self.audio_worker = None
            self.listening_badge.hide()
            if self.interview_mode:
                self._show_interview_badge()
            else:
                self.status_dot.setText("[Audio Off]")
                self.status_dot.setStyleSheet("color: #F87171; font-size: 11px;")
            self.text_display.setMarkdown(f"### 🔇 Audio Listening Stopped\n\nPress **{_modifier_label()} + A** to start listening again.")
        else:
            print("[HUD] Starting Audio Loopback Listening...")
            self.listening_badge.setText("Listening...")
            self.listening_badge.setStyleSheet("color: #38BDF8; font-weight: bold; font-size: 13px; padding: 2px 10px;")
            self.listening_badge.show()
            if self.interview_mode:
                self._show_interview_badge()
                self.text_display.setMarkdown("### 🎓 Interview Audio Active\n\nWaiting for the interviewer to speak...")
            else:
                self.text_display.setMarkdown("### 🎙️ Audio Active\n\nWaiting for audio...")
            self.audio_worker = AudioWorker(api_key=self.api_key, interview_mode=self.interview_mode, resume_text=self.resume_text, resume_language=self.resume_language, provider_keys={"groq": self.db.get_setting("groq_api_key") or "", "openrouter": self.db.get_setting("openrouter_api_key") or "", "gemini": self.db.get_setting("gemini_api_key") or ""})
            self.audio_worker.signals.finished.connect(self.on_analysis_finished)
            self.audio_worker.signals.error.connect(self.on_analysis_error)
            self.audio_worker.signals.audio_level.connect(self.on_audio_level)
            self.audio_worker.signals.transcription.connect(self.on_transcription)
            self.audio_worker.start()

        if hasattr(self, 'hud_mic_btn'):
            self.hud_mic_btn.setChecked(bool(self.audio_worker and self.audio_worker.isRunning()))

    @Slot()
    def toggle_interview_mode(self):
        if self.interview_mode:
            self.interview_mode = False
            self.resume_text = ""
            print("[HUD] Interview Mode OFF")
            self.status_dot.hide()
            self.text_display.setMarkdown("### Interview Mode OFF\n\nAI is now acting as a standard coding assistant.")
            
            # Stop audio worker if running
            if self.audio_worker and self.audio_worker.isRunning():
                print("[HUD] Automatically turning OFF audio listening...")
                self.toggle_audio_listening()
                
            # Restore the standard fixed HUD size
            self.resize(self.default_hud_w, self.default_hud_h)
            self.move((QApplication.primaryScreen().geometry().width() - self.default_hud_w) // 2, 10)
            self.show()
        else:
            # Read active resume from SQLite DatabaseManager
            active_idx = self.db.get_setting('active_resume_slot')
            if active_idx is None:
                active_idx = '0'
            
            slot_name = self.db.get_setting(f'resume_slot_{active_idx}_name') or f"Slot {int(active_idx)+1}"
            self.resume_text = (self.db.get_setting(f'resume_slot_{active_idx}_content') or "").strip()
            self.resume_language = detect_language_from_text(self.resume_text) or ""
            if self.resume_language:
                print(f"[HUD] Resume language detected: {self.resume_language}")
            
            self.interview_mode = True
            print(f"[HUD] Interview Mode ON (Resume: {slot_name}) | Text len: {len(self.resume_text)}")
            self._show_interview_badge()
            
            if not self.resume_text:
                self.text_display.setMarkdown("### ⚠️ Interview Mode ON (No Resume Uploaded)\n\n<span style='color: #F87171; font-weight: bold;'>⚠️ Warning: No resume is uploaded! Answers will be general. Be careful during the interview!</span>\n\n*To get answers customized strictly to your real background, upload your PDF resume in the Dashboard Resume Manager.*")
            else:
                snippet = self.resume_text[:120].replace('\n', ' ')
                self.text_display.setMarkdown(f"### 🎓 Interview Mode ON\n\nActive Resume: **{slot_name}**\n\n*Resume Snippet:* `{snippet}...`\n\n*The AI is now strictly answering using your exact resume experience!*")
            self.show()
            
            # In Interview Mode the HUD auto-sizes to the current content
            self.auto_size_hud()
            
        # Start audio worker with active resume_text
            if not (self.audio_worker and self.audio_worker.isRunning()):
                print("[HUD] Automatically turning ON audio listening with resume context...")
                self.toggle_audio_listening()

    def _show_interview_badge(self):
        """Show a clean, consistent 'Interview Mode' pill in the HUD header."""
        self.status_dot.setText("● Interview Mode")
        self.status_dot.setStyleSheet(
            "color: #E9D5FF; background: rgba(192, 132, 252, 0.18); "
            "border: 1px solid rgba(192, 132, 252, 0.5); border-radius: 10px; "
            "font-weight: 700; font-size: 10px; padding: 2px 8px;"
        )
        self.status_dot.show()

    def _restore_header_badge(self):
        """Revert the header status badge to the normal (non-cheat) state.

        Used when the cheat sheet is toggled off so the '[Cheat Sheet]' tag
        does not stay stuck in the HUD header.
        """
        if getattr(self, 'interview_mode', False):
            self._show_interview_badge()
        else:
            self.status_dot.hide()

    @Slot()
    def show_cheat_sheet(self):
        # Alt+N cheat-sheet toggle. Behavior depends on whether the HUD was
        # already active when the cheat sheet was first shown:
        #   - HUD was ON  -> first Alt+N shows cheat; second Alt+N returns to
        #                    the normal HUD view (stays open).
        #   - HUD was OFF -> first Alt+N shows cheat (HUD appears); second
        #                    Alt+N closes the HUD entirely.
        if getattr(self, '_showing_cheat', False):
            if getattr(self, '_cheat_close_on_toggle', False):
                # HUD was not active before -> close it.
                self._showing_cheat = False
                self._cheat_close_on_toggle = False
                self.hide()
            else:
                # HUD was already active -> restore the normal HUD view, keep open.
                self._showing_cheat = False
                self._cheat_close_on_toggle = False
                self.show_peek()
                self._restore_header_badge()
            return

        # First time showing the cheat sheet: remember HUD state beforehand.
        self._cheat_close_on_toggle = not self.isVisible()
        text = self.db.get_setting('cheat_sheet_text') or "Paste your cheat sheet in the dashboard!"
        self.text_display.setPlainText(text)
        self.status_dot.setText("[Cheat Sheet]")
        self.status_dot.setStyleSheet("color: #F59E0B; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 10px; font-weight: 700; font-size: 10px; padding: 1px 6px;")
        self.status_dot.show()
        self._showing_cheat = True
        if self.auto_hide_delay > 0:
            self.auto_hide_timer.start(self.auto_hide_delay)
        if not self.isVisible():
            self.show()
            self.fade_in()

    @Slot()
    def toggle_ghost_mode(self):
        self.is_ghost_mode = not self.is_ghost_mode
        
        # We must rebuild the entire flag set, otherwise setting one flag clears the others (like StaysOnTop)
        flags = Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool
        if sys.platform == 'darwin':
            flags |= Qt.WindowDoesNotAcceptFocus
        if self.is_ghost_mode:
            flags |= Qt.WindowTransparentForInput
            print("[HUD] Ghost Mode ON (Click-Through)")
            self.status_dot.setText("Ghost ON")
            self.status_dot.setStyleSheet("color: #C084FC; background: rgba(192, 132, 252, 0.15); border: 1px solid rgba(192, 132, 252, 0.35); border-radius: 10px; font-weight: 700; font-size: 10px; padding: 1px 6px;")
        else:
            print("[HUD] Ghost Mode OFF (Interactive)")
            self.status_dot.setText("Ghost OFF")
            self.status_dot.setStyleSheet("color: #34D399; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.35); border-radius: 10px; font-weight: 700; font-size: 10px; padding: 1px 6px;")
        
        self.status_dot.show()
        QTimer.singleShot(3000, lambda: self.status_dot.hide())
        
        self.setWindowFlags(flags)
        
        # Changing window flags requires the window to be re-shown
        self.show()
        
        # Re-apply stealth capture protection since the window handle was just recreated
        self.enable_screen_share_protection()

    @Slot()
    def start_silent_capture(self):
        if getattr(self, 'stealth_input', None) and self.stealth_input.isVisible():
            self.stealth_screenshot_pending = True
            self.status_dot.setText("[Screenshot Attached]")
            self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
            return
        self.start_silent_capture_with_query("")

    def start_silent_capture_with_query(self, user_query, follow_up=False, force_capture=False, explicit_capture=False, has_attached_text=False):
        # Refresh API keys from database
        groq_key = self.db.get_setting("groq_api_key")
        openrouter_key = self.db.get_setting("openrouter_api_key")
        gemini_key = self.db.get_setting("gemini_api_key")
        
        # Smart Key Routing: Screen capture requires a Vision model (OpenRouter or Gemini).
        if not user_query.strip():
            self.api_key = openrouter_key or gemini_key or groq_key
        else:
            self.api_key = groq_key or openrouter_key or gemini_key
            
        if not self.api_key:
            print("[HUD] Cannot capture: API Key is missing!")
            self.cached_answer = "API Key missing! Please save your Groq, OpenRouter, or Gemini key inside the Dashboard."
            self.render_cached_answer()
            self.show()
            return

        # Groq cannot process screen images — surface this clearly if no vision key is set
        if not user_query.strip() and not (openrouter_key or gemini_key) and (self.api_key or "").startswith("gsk_"):
            self.cached_answer = ("Groq cannot solve plain screen captures because it is text-only. "
                                  "Add an OpenRouter or Gemini key in the Dashboard, or select the question text and press Alt+S.")
            self.render_cached_answer()
            self.show()
            return

        now = time.time()
        if now - self.last_capture_time < 2.0:
            print("[HUD] Cooldown active (wait 2s)...")
            return
        self.last_capture_time = now

        if self.worker and self.worker.isRunning():
            print("[HUD] Analysis already in progress...")
            return

        # If follow_up is True (from Alt+Q stealth query) and context exists, we reuse context.
        # But for Alt+S screen capture (follow_up is False), we ALWAYS take a fresh screenshot!
        with self.history_lock:
            has_context = bool(self.vision_history)
        # Force a screenshot capture if the user explicitly attached one in stealth mode.
        # In Chat Mode (explicit_capture) we do NOT auto-capture the screen for a plain typed
        # message — a screenshot only rides along when the user attached one via Alt+S.
        do_capture = force_capture or getattr(self, 'stealth_screenshot_pending', False)
        if not explicit_capture:
            do_capture = do_capture or (not follow_up or not has_context)
        # Fresh screenshot solve (not follow_up): clear previous answer history so new solution renders cleanly without overlap
        if not follow_up:
            if hasattr(self, 'typewriter_timer'):
                self.typewriter_timer.stop()
            self.chat_log_entries.clear()
            self.chat_log_md = ""
            self.cached_answer = ""
            if hasattr(self, 'text_display'):
                self.text_display.clear()

        print("[HUD] Triggering silent screen capture & solve...")
        self.is_capturing = True
        self.pending_question = user_query
        self.is_followup_request = follow_up
        if has_attached_text:
            detected_lang = detect_language_from_text(user_query)
            # Override stale language bias either way: attached text is self-contained.
            self.last_language = detected_lang or ""
            if detected_lang:
                print(f"[HUD] Detected language from attached text: {detected_lang}")
        self.flash_status("📸 Screenshot taken — solving..." if do_capture else "✅ Sent to AI — solving...", "#F59E0B")

        self.worker = AIWorker(api_key=self.api_key, user_question=user_query, interview_mode=self.interview_mode, resume_text=self.resume_text, resume_language=self.resume_language, vision_history=self.vision_history, visual_cache=self.visual_cache, capture_screen=do_capture, follow_up=follow_up, last_language=self.last_language, history_lock=self.history_lock, gemini_key=gemini_key or "", has_attached_text=has_attached_text, provider_keys={"groq": groq_key or "", "openrouter": openrouter_key or "", "gemini": gemini_key or ""})
        self.worker.signals.finished.connect(self.on_analysis_finished)
        self.worker.signals.error.connect(self.on_analysis_error)
        self.worker.start()

    @Slot(str, bytes)
    def on_analysis_finished(self, response_text, thumbnail_bytes=None):
        self.is_capturing = False
        self.cached_answer = response_text
        self.status_dot.setText("[Answer Ready]")
        self.status_dot.setStyleSheet("color: #60A5FA; font-size: 11px;")

        # Track the language of this answer so the next solve stays in the same language
        lang = detect_language_from_answer(response_text)
        if lang:
            self.last_language = lang
            print(f"[HUD] Detected language: {lang}")

        # Display the thumbnail in HUD if available
        if thumbnail_bytes:
            from PySide6.QtGui import QPixmap
            pixmap = QPixmap()
            if pixmap.loadFromData(thumbnail_bytes):
                self.preview_label.setPixmap(pixmap)
                self.preview_label.show()
            else:
                self.preview_label.hide()
        else:
            self.preview_label.hide()

        # Append this Q&A into the persistent HUD chat log (kept until Alt+C)
        user_query = (self.pending_question or "").strip()
        question_text = ""
        body_text = response_text
        if "<question>" in body_text and "</question>" in body_text:
            parts = body_text.split("</question>", 1)
            question_text = parts[0].split("<question>", 1)[1].strip()
            body_text = parts[1].strip()

        # For follow-up text chats (Alt+Q), show the user's actual typed question,
        # not the AI's reworded <question> summary.
        if self.is_followup_request:
            question_text = user_query or question_text or "📸 Screen capture"
        else:
            question_text = question_text or user_query or "📸 Screen capture"
        self.last_question_text = question_text

        self.chat_log_entries.append(self._format_chat_entry(question_text, body_text))
        if len(self.chat_log_entries) > 40:
            del self.chat_log_entries[:-40]
        self.chat_log_md = "".join(self.chat_log_entries)
        self.pending_question = ""

        self.render_cached_answer()

        # Auto-copy the answer to the clipboard if enabled in the Dashboard
        try:
            if self.db.get_setting('auto_copy_answers'):
                self.copy_code_only()
        except Exception as e:
            print(f"[HUD] Auto-copy failed: {e}")

    def _format_chat_entry(self, question, answer, is_error=False):
        if is_error:
            return f"\n\n<span style='color:#EF4444; font-weight:bold; font-size:12px;'>❌ Error</span>\n\n{answer}\n\n---\n\n"
        
        q_prefix = ""
        if question and question != "📸 Screen capture":
            q_prefix = f"<span style='color:#60A5FA; font-weight:bold; font-size:13px;'>💬 Question: {question}</span>\n\n"
        
        return f"\n\n{q_prefix}{answer}\n\n---\n\n"

    def _render_chat_log(self, scroll_to_bottom=False):
        """Renders the accumulated Q&A history in the HUD. The newest answer is
        shown at the bottom; Alt+Up / Alt+Down scroll through older entries."""
        if not self.chat_log_md:
            return
        # Render markdown directly so code blocks look correct
        self.text_display.setMarkdown(self.chat_log_md)
        if scroll_to_bottom:
            scrollbar = self.text_display.verticalScrollBar()
            scrollbar.setValue(scrollbar.maximum())

    def render_cached_answer(self):
        if not self.cached_answer and not self.chat_log_md:
            return

        # Stop any active typewriter timer to prevent double-rendering collision
        if hasattr(self, 'typewriter_timer'):
            self.typewriter_timer.stop()
            
        question_text = self.last_question_text or ""
        body_text = self.cached_answer
        if "<question>" in body_text and "</question>" in body_text:
            parts = body_text.split("</question>", 1)
            if not question_text:
                question_text = parts[0].split("<question>", 1)[1].strip()
            body_text = parts[1].strip()

        # Update question display
        if question_text and not self.is_minimal_mode:
            self.question_label.setText(f"❓ {question_text}")
            self.question_label.show()
        else:
            self.question_label.hide()

        if self.is_minimal_mode:
            code_only = self.get_code_to_type()
            # If the body contains code blocks, render code only
            if "```" in body_text:
                self.text_display.setMarkdown(f"```\n{code_only}\n```")
            else:
                # Try to extract MCQ options if present
                mcq_lines = [line.strip() for line in body_text.split("\n") if "option" in line.lower() or "correct" in line.lower() or line.strip().startswith(("A.", "B.", "C.", "D.", "a.", "b.", "c.", "d."))]
                if mcq_lines:
                    self.text_display.setMarkdown("\n".join(mcq_lines))
                else:
                    self.text_display.setMarkdown(body_text)
        else:
            # Standard mode: render complete answer cleanly without duplicate typewriter collision
            if self.interview_mode and self.cached_answer:
                formatted_html = self._format_interview_answer(self.cached_answer)
                if formatted_html:
                    self.start_typewriter_stream(formatted_html, is_html=True)
                else:
                    self.start_typewriter_stream(self.cached_answer, is_html=False)
            elif self.chat_log_md:
                self._render_chat_log(scroll_to_bottom=True)
            else:
                self.text_display.setMarkdown(self.cached_answer)

        if self.interview_mode:
            self.auto_size_hud()

    @Slot()
    def toggle_minimal_mode(self):
        self.is_minimal_mode = not self.is_minimal_mode
        print(f"[HUD] Toggle Minimal Mode: {self.is_minimal_mode}")
        if self.is_minimal_mode:
            self.status_dot.setText("[Minimal]")
            self.status_dot.setStyleSheet("color: #60A5FA; font-size: 11px;")
            self.status_dot.show()
        else:
            self.status_dot.setText("[Active]")
            self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
            self.status_dot.show()
        self.render_cached_answer()

    @Slot(str)
    def on_analysis_error(self, error_msg):
        self.is_capturing = False
        self.cached_answer = error_msg
        self.status_dot.setText("[Error]")
        self.status_dot.setStyleSheet("color: #F87171; font-size: 11px;")
        question_text = (self.pending_question or "").strip()
        self.last_question_text = question_text
        self.pending_question = ""
        self.chat_log_entries.append(self._format_chat_entry(question_text, error_msg, is_error=True))
        if len(self.chat_log_entries) > 40:
            del self.chat_log_entries[:-40]
        self.chat_log_md = "".join(self.chat_log_entries)
        self._render_chat_log(scroll_to_bottom=True)

    def apply_hud_settings(self):
        # Exit application if master power is switched off from the Dashboard
        master_power = self.db.get_setting('master_power')
        if master_power is False:
            print("[HUD] Master Power turned OFF from Dashboard. Exiting engine...")
            QApplication.quit()
            return

        # Apply Dashboard hotkey rebinds live (no engine restart needed).
        try:
            if hasattr(self, 'hotkey_handler') and self.hotkey_handler is not None:
                self.hotkey_handler.refresh_config()
        except Exception as e:
            print(f"[HUD] Hotkey refresh error: {e}")
            
        try:
            opacity = self.db.get_setting("hud_opacity")
            if opacity is None:
                opacity = 85
            bg_alpha = float(opacity) / 100.0
            bg_alpha = max(0.05, bg_alpha) # ensure minimum readability
            
            # Keep overall window opacity solid so text is always 100% visible
            self.setWindowOpacity(0.99)
            
            # Apply background opacity to container dynamically
            self.container.setStyleSheet(f"""
                QWidget#MainContainer {{
                    background-color: rgba(8, 12, 20, {bg_alpha});
                    border: 1px solid rgba(255, 255, 255, 0.30);
                    border-radius: 14px;
                }}
            """)
            
            self.accent_color = self.db.get_setting("hud_answer_color") or "#34D399"
            
            font_size_name = self.db.get_setting("hud_font_size") or "Medium"
            if font_size_name == "Small":
                font_size = "13px"
            elif font_size_name == "Large":
                font_size = "18px"
            else:
                font_size = "15px"
                
            # Apply style directly to self.text_display so Qt parses it instantly
            self.text_display.setStyleSheet(f"""
                QTextEdit {{
                    background-color: rgba(0, 0, 0, {bg_alpha * 0.9});
                    color: #FFFFFF;
                    border: 1px solid rgba(255, 255, 255, 0.20);
                    border-radius: 8px;
                    font-size: {font_size};
                    font-family: 'Consolas', 'Segoe UI', monospace;
                    padding: 10px;
                }}
                QScrollBar:vertical {{
                    border: none;
                    background: rgba(0, 0, 0, 0.25);
                    width: 8px;
                    border-radius: 4px;
                }}
                QScrollBar::handle:vertical {{
                    background: rgba(255, 255, 255, 0.4);
                    border-radius: 4px;
                    min-height: 20px;
                }}
                QScrollBar::handle:vertical:hover {{
                    background: rgba(255, 255, 255, 0.7);
                }}
                QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
                    height: 0px;
                }}
            """)
            
            # Keep base container styling clean and dynamically apply opacity
            self.container.setStyleSheet(f"""
                QWidget#MainContainer {{
                    background-color: rgba(8, 12, 20, {bg_alpha});
                    border: 1px solid rgba(255, 255, 255, 0.30);
                    border-radius: 14px;
                }}
                QLabel {{
                    color: #FFFFFF;
                    font-family: 'Segoe UI', sans-serif;
                }}
                QPushButton {{
                    background-color: rgba(59, 130, 246, 0.85);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 6px;
                    padding: 6px 12px;
                    font-weight: bold;
                    font-size: 12px;
                }}
                QPushButton:hover {{
                    background-color: rgba(37, 99, 235, 1.0);
                }}
                QPushButton#CloseBtn {{
                    background-color: rgba(239, 68, 68, 0.75);
                    border-radius: 6px;
                }}
                QPushButton#CloseBtn:hover {{
                    background-color: rgba(220, 38, 38, 1.0);
                }}
                QLineEdit {{
                    background-color: rgba(0, 0, 0, 0.25);
                    color: #FFFFFF;
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    border-radius: 6px;
                    padding: 6px 10px;
                    font-size: 12px;
                }}
            """)
        except Exception as e:
            print(f"[HUD] Error applying style settings: {e}")

        # Show/hide HUD inline controls based on dashboard setting
        try:
            show_controls = bool(self.db.get_setting("hud_show_controls"))
            controls_row = getattr(self, 'hud_controls_row', None)
            if controls_row is not None:
                controls_row.setVisible(show_controls)
                if show_controls:
                    opacity_val = int(self.db.get_setting("hud_opacity") or 100)
                    self.hud_opacity_slider.setValue(opacity_val)
                    font_size_name = self.db.get_setting("hud_font_size") or "Medium"
                    if hasattr(self, 'hud_text_size_combo'):
                        self.hud_text_size_combo.blockSignals(True)
                        self.hud_text_size_combo.setCurrentText(font_size_name)
                        self.hud_text_size_combo.blockSignals(False)
                    if hasattr(self, 'hud_mic_btn'):
                        self.hud_mic_btn.setChecked(bool(self.audio_worker and self.audio_worker.isRunning()))
        except Exception as e:
            print(f"[HUD] Error applying controls visibility: {e}")

    def _on_hud_opacity_changed(self, value):
        self.setWindowOpacity(value / 100.0)
        self.db.set_setting("hud_opacity", value)

    def _on_hud_screenshot_clicked(self):
        try:
            self.stealth_screenshot_pending = True
            self.status_dot.setText("[📸 Capturing...]")
            self.status_dot.setStyleSheet("color: #FBBF24; font-size: 11px;")
            self.status_dot.show()
            self.on_submit_stealth("Solve this screenshot")
            self.status_dot.setText("[Screenshot Sent]")
            self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
            QTimer.singleShot(2000, self.status_dot.hide)
        except Exception as e:
            print(f"[HUD] Screenshot error: {e}")
            self.status_dot.setText("[Screenshot Error]")
            self.status_dot.setStyleSheet("color: #F87171; font-size: 11px;")
            self.status_dot.show()

    def _on_hud_text_size_changed(self, font_size_name):
        if not font_size_name:
            return
        self.db.set_setting("hud_font_size", font_size_name)
        self.apply_hud_settings()

    def _on_hud_mic_toggled(self):
        if getattr(self, '_updating_mic_btn', False):
            return
        self._updating_mic_btn = True
        try:
            self.toggle_audio_listening()
        finally:
            self._updating_mic_btn = False

    def get_code_to_type(self):
        text = self.cached_answer
        if "<question>" in text and "</question>" in text:
            text = text.split("</question>", 1)[1].strip()
        if "```" in text:
            parts = text.split("```")
            for i in range(1, len(parts), 2):
                block_content = parts[i].strip()
                lines = block_content.split("\n")
                if len(lines) > 1 and len(lines[0].strip()) < 15 and not lines[0].strip().startswith(("#", "//", "/*", "import", "class", "def")):
                    code = "\n".join(lines[1:])
                else:
                    code = block_content
                if code.strip():
                    return self._clean_typing_text(code.strip())
            return self._clean_typing_text(text.strip())
        return self._clean_typing_text(text.strip())

    def _clean_typing_text(self, text):
        """Removes trailing spaces and collapses repeated blank lines so the typer
        does not punch in large empty gaps or invisible whitespace."""
        cleaned = []
        blank_run = 0
        for line in text.split("\n"):
            if line.strip() == "":
                blank_run += 1
                if blank_run > 1:
                    continue
            else:
                blank_run = 0
            cleaned.append(line.rstrip())
        return "\n".join(cleaned).strip("\n")

    @Slot()
    def stop_stealth_typing(self):
        """Stops auto-typing immediately (used by mouse-click abort). Never re-starts."""
        if not (self.typer_thread and self.typer_thread.isRunning()):
            return
        print("[HUD] Stopping Stealth Typing...")
        self.typer_thread.stop()
        self.typer_thread.wait(3000)
        self.typer_thread = None
        self.status_dot.setText("[Stopped]")
        self.status_dot.setStyleSheet("color: #F59E0B; font-size: 11px;")

    def toggle_stealth_typing(self):
        if self.typer_thread and self.typer_thread.isRunning():
            print("[HUD] Pausing Stealth Typing...")
            self.typer_thread.stop()
            self.typer_thread.wait(3000)
            self.typer_thread = None
            self.status_dot.setText("[Paused]")
            self.status_dot.setStyleSheet("color: #F59E0B; font-size: 11px;")
            return

        target_code = self.get_code_to_type()
        if not target_code.strip():
            self.status_dot.setText("[No Text to Type]")
            self.status_dot.setStyleSheet("color: #F87171; font-size: 11px;")
            return

        # Never type into the HUD itself — the code must land in the exam/editor window
        focus_widget = QApplication.focusWidget()
        if focus_widget is not None and self.isAncestorOf(focus_widget):
            self.status_dot.setText("[Click Target First]")
            self.status_dot.setStyleSheet("color: #F87171; font-size: 11px;")
            return

        if self.typing_text != target_code:
            self.typing_text = target_code
            self.typing_index = 0

        print(f"[HUD] Starting/Resuming Stealth Typing from index {self.typing_index}...")
        self.status_dot.setText("[Typing...]")
        self.status_dot.setStyleSheet("color: #A78BFA; font-weight: bold; font-size: 11px;")

        try:
            speed_cpm = int(self.db.get_setting("typing_speed") or 240)
        except (ValueError, TypeError):
            speed_cpm = 240
        skip_indent = self.db.get_setting("typer_auto_indent")
        if skip_indent is None:
            skip_indent = True
        self.typer_thread = StealthTyperThread(self.typing_text, self.typing_index,
                                               speed_cpm=speed_cpm, skip_indent=bool(skip_indent))
        self.typer_thread.signals.progress.connect(self.on_typer_progress)
        self.typer_thread.signals.paused.connect(self.on_typer_paused)
        self.typer_thread.signals.finished.connect(self.on_typer_finished)
        self.typer_thread.start()

    @Slot(int)
    def on_typer_progress(self, index):
        self.typing_index = index

    @Slot(int)
    def on_typer_paused(self, index):
        self.typing_index = index
        self.status_dot.setText("[Paused]")
        self.status_dot.setStyleSheet("color: #F59E0B; font-size: 11px;")

    @Slot()
    def on_typer_finished(self):
        self.typing_index = 0
        self.typer_thread = None
        self.status_dot.setText("[Active]")
        self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")

    @Slot()
    def start_stealth_selection_capture(self):
        print("[HUD] Reading screen selection using Windows UI Automation...")
        selected_text = get_selected_text_uia()
        if not selected_text:
            print("[HUD] No text selection found.")
            self.status_dot.setText("[No Selection]")
            self.status_dot.setStyleSheet("color: #F87171; font-size: 11px;")
            return
            
        if getattr(self, 'stealth_input', None) and self.stealth_input.isVisible():
            current_text = self.stealth_input.text()
            self.stealth_input.setText(f"{current_text} {selected_text}".strip())
            self.status_dot.setText("[Context Attached]")
            self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
            return
            
        print(f"[HUD] Selection captured successfully ({len(selected_text)} chars). Triggering solve...")
        self.is_capturing = True
        self.pending_question = selected_text
        self.is_followup_request = False
        self.flash_status("✅ Highlighted text sent to AI — solving...", "#F59E0B")

        # Detect the language from the selected code itself (SQL / JS / React / Java / C++ ...)
        detected_lang = detect_language_from_text(selected_text)
        if detected_lang:
            self.last_language = detected_lang
            print(f"[HUD] Detected language from selection: {detected_lang}")

        self.worker = AIWorker(
            api_key=self.api_key, 
            user_question=selected_text, 
            interview_mode=self.interview_mode, 
            resume_text=self.resume_text, 
            resume_language=self.resume_language,
            vision_history=self.vision_history, 
            visual_cache=self.visual_cache,
            capture_screen=True,
            explicit_language=detected_lang or "",
            last_language=self.last_language if not detected_lang else "",
            history_lock=self.history_lock,
            provider_keys={
                "groq": self.db.get_setting("groq_api_key") or "",
                "openrouter": self.db.get_setting("openrouter_api_key") or "",
                "gemini": self.db.get_setting("gemini_api_key") or "",
            }
        )
        self.worker.user_question = f"User selection: {selected_text}"
        self.worker.signals.finished.connect(self.on_analysis_finished)
        self.worker.signals.error.connect(self.on_analysis_error)
        self.worker.start()

    @Slot()
    def show_peek(self):
        print("[HUD] Showing HUD peek overlay...")
        # Showing an answer view clears the cheat-sheet toggle state, so a
        # subsequent Alt+N press shows the cheat sheet instead of hiding the answer.
        self._showing_cheat = False
        self._cheat_close_on_toggle = False
        self.apply_hud_settings()
        
        if self.chat_log_md:
            # Render using smooth typewriter streaming effect
            self.start_typewriter_stream(self.chat_log_md, is_html=False)
        elif self.cached_answer:
            self.start_typewriter_stream(self.cached_answer, is_html=False)
        elif self.is_capturing:
            self.text_display.setText("Solving problem in background...")
        else:
            self.text_display.setText(f"No answer loaded yet.\nPress {_modifier_label()} + S for Screen capture or {_modifier_label()} + A for Audio listening.")
        
        self.show()
        
        # Inactivity auto-hide timer
        auto_hide_val = self.db.get_setting("hud_auto_hide") or "Never"
        if auto_hide_val != "Never":
            try:
                seconds = int(auto_hide_val.replace("s", ""))
                self.auto_hide_timer.start(seconds * 1000)
            except Exception as e:
                print(f"[HUD] Auto-hide timer conversion error: {e}")
        else:
            self.auto_hide_timer.stop()

    @Slot()
    def toggle_sticky_view(self):
        if self.isVisible():
            print("[HUD] Sticky toggle -> Hiding HUD...")
            self.hide()
        else:
            print("[HUD] Sticky toggle -> Keeping HUD visible...")
            self.show_peek()

    @Slot()
    def hide_peek(self):
        print("[HUD] Hiding HUD peek overlay...")
        # Any explicit hide clears cheat-sheet toggle state so the next Alt+N
        # is treated as a fresh press (prevents a "stuck" cheat-sheet state).
        self._showing_cheat = False
        self._cheat_close_on_toggle = False
        self.auto_hide_timer.stop()
        self.hide()

    @Slot()
    def clear_stored_answer(self):
        print("[HUD] Clearing cached answer...")
        self.cached_answer = ""
        self.last_language = ""
        self.chat_log_md = ""
        self.chat_log_entries = []
        self.pending_question = ""
        self.is_followup_request = False
        self.last_question_text = ""
        with self.history_lock:
            if hasattr(self, 'vision_history'):
                self.vision_history.clear()
            if hasattr(self, 'visual_cache'):
                self.visual_cache.clear()
            
        self.typing_text = ""
        self.typing_index = 0
        if self.typer_thread and self.typer_thread.isRunning():
            self.typer_thread.stop()
            self.typer_thread.wait(3000)
        self.typer_thread = None

        if hasattr(self, 'preview_label'):
            self.preview_label.hide()
        if hasattr(self, 'question_label'):
            self.question_label.hide()

        self.text_display.clear()
        self.status_dot.setText("[Cleared]")
        self.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
        self.hide()

    def stop_engine_threads(self):
        """Gracefully stops all background work. Called on app exit so PySide6
        never aborts with 'QThread: Destroyed while thread is still running'."""
        for timer in (self.settings_poll_timer, self.anim_timer, self.auto_hide_timer):
            try:
                timer.stop()
            except Exception:
                pass

        if self.typer_thread and self.typer_thread.isRunning():
            try:
                self.typer_thread.stop()
                self.typer_thread.wait(3000)
            except Exception:
                pass
        self.typer_thread = None

        if self.audio_worker and self.audio_worker.isRunning():
            try:
                self.audio_worker.stop()
                self.audio_worker.wait(3000)
            except Exception:
                pass
        self.audio_worker = None
        self.listening_badge.hide()

        # AIWorker performs network calls with timeouts; give it a bounded grace period
        if self.worker and self.worker.isRunning():
            try:
                self.worker.wait(15000)
            except Exception:
                pass
        self.worker = None

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drag_position = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.LeftButton:
            self.move(event.globalPosition().toPoint() - self.drag_position)
            event.accept()

# Global Keyboard Listener. All bindings are configurable from the Dashboard
# (Hotkeys page); each action reads its hotkey_<name> setting from the DB.
_HOTKEY_MOD_TOKENS = {
    keyboard.Key.alt: 'alt', keyboard.Key.alt_l: 'alt', keyboard.Key.alt_r: 'alt', keyboard.Key.alt_gr: 'alt',
    keyboard.Key.ctrl: 'ctrl', keyboard.Key.ctrl_l: 'ctrl', keyboard.Key.ctrl_r: 'ctrl',
    keyboard.Key.shift: 'shift', keyboard.Key.shift_l: 'shift', keyboard.Key.shift_r: 'shift',
    keyboard.Key.cmd: 'meta', keyboard.Key.cmd_l: 'meta', keyboard.Key.cmd_r: 'meta',
}
_HOTKEY_SPECIAL_KEYS = {
    keyboard.Key.up: 'up', keyboard.Key.down: 'down', keyboard.Key.left: 'left', keyboard.Key.right: 'right',
    keyboard.Key.space: 'space', keyboard.Key.esc: 'esc', keyboard.Key.enter: 'enter',
}


class GlobalHotkeyHandler:
    # action -> (DB setting key, default combo). Rebound live from the Dashboard.
    HOTKEY_SETTINGS = {
        'silent':    ('hotkey_silent',    '<alt>+o'),
        'capture':   ('hotkey_capture',   '<alt>+s'),
        'audio':     ('hotkey_audio',     '<alt>+a'),
        'peek':      ('hotkey_peek',      '<alt>+h'),
        'ghost':     ('hotkey_ghost',     '<alt>+t'),
        'search':    ('hotkey_search',    '<alt>+q'),
        'type':      ('hotkey_type',      '<alt>+p'),
        'interview': ('hotkey_interview', '<alt>+i'),
        'minimal':   ('hotkey_minimal',   '<alt>+m'),
        'clear':     ('hotkey_clear',     '<alt>+c'),
        'exit':      ('hotkey_exit',      '<alt>+e'),
        'cheat':     ('hotkey_cheat',     '<alt>+n'),
        'scroll_up': ('hotkey_scroll_up', '<alt>+up'),
        'scroll_dn': ('hotkey_scroll_dn', '<alt>+down'),
        'sleep':     ('hotkey_sleep',     '<alt>+z'),
    }

    def __init__(self, hud: FloatingHUD):
        self.hud = hud
        # Config-driven hotkey matching state (see refresh_config + parse_hotkey_combo).
        self.pressed_mods = set()     # held modifiers, normalized ('alt', 'ctrl', ...)
        self.pressed_main = set()     # held main keys (alnum / arrow / space / esc / enter)
        self.triggered = set()        # actions already fired for the current press
        self._actions = {}            # action -> raw combo string from DB
        self._parsed_actions = {}     # action -> (frozenset(mods), main) or None
        self.is_dormant = False

        self.stealth_mode_active = False
        self.stealth_query = ""
        self.stealth_listener = None
        self.main_listener = None
        self.refresh_config()

    def is_access_allowed(self):
        try:
            db = self.hud.db
            # Server-validated license (cached 12h) — expired/revoked keys are
            # cleared server-side and fall through to the trial check.
            if maybe_verify_license(db):
                return True
                
            # Check trial. The start time is authoritative from the server (HWID-keyed),
            # so reinstalling, factory-resetting or wiping local data can never
            # restart the free trial.
            trial_start = db.get_setting('trial_start')
            if not trial_start:
                trial_start = sync_trial_start(db, force_refresh=True)

            if trial_start:
                elapsed = int(time.time() * 1000) - int(trial_start)
                limit = 3 * 24 * 60 * 60 * 1000 # 3 days in ms
                if elapsed >= limit:
                    return False
            return True
        except Exception as e:
            print(f"[Hotkey] is_access_allowed error: {e}")
            return False  # Fail closed on error

    def start_stealth(self):
        self.stealth_mode_active = True
        self.stealth_query = ""
        import time
        self.stealth_start_time = time.time()
        self.stealth_alt_pressed = False
        self.stealth_s_triggered = False
        self.stealth_query_lock = threading.Lock()
        self.hud.chat_mode_active = True
        self.hud.stealth_screenshot_pending = False
        self.hud.stealth_text_attached = False
        self.hud.sig_update_stealth.emit("")
        print("[Stealth] Chat Mode ON (Alt+Q). Type & Enter to send; Alt+S to attach screenshot/text.")
        if self.main_listener:
            self.main_listener.stop()
        self.stealth_listener = keyboard.Listener(on_press=self.on_stealth_press, on_release=self.on_stealth_release, suppress=True)
        self.stealth_listener.start()

    def stop_stealth(self, submit=False):
        self.stealth_mode_active = False
        print("[Stealth] Restoring normal keyboard...")
        if self.stealth_listener:
            self.stealth_listener.stop()
            self.stealth_listener = None
        import time
        self.stealth_start_time = time.time()
        self.stealth_alt_pressed = False
        self.stealth_s_triggered = False
        
        query_to_submit = self.stealth_query.strip()
        self.stealth_query = ""
        self.pressed_main.clear()
        self.pressed_mods.clear()
        self.triggered.clear()
        
        if submit and (query_to_submit or getattr(self.hud, 'stealth_screenshot_pending', False)):
            self.hud.sig_submit_stealth.emit(query_to_submit)
        else:
            self.hud.sig_update_stealth.emit("")
        self.hud.chat_mode_active = False
        if not submit:
            self.hud.stealth_screenshot_pending = False
            self.hud.stealth_text_attached = False
        self.start()

    def on_stealth_press(self, key, injected=False):
        if injected:
            return
        if key in [keyboard.Key.alt, keyboard.Key.alt_l, keyboard.Key.alt_r, keyboard.Key.alt_gr]:
            self.stealth_alt_pressed = True
            return

        is_q = (hasattr(key, 'char') and key.char and key.char.lower() == 'q') or getattr(key, 'vk', None) == 81
        if getattr(self, 'stealth_alt_pressed', False) and is_q:
            self.stop_stealth(submit=False)
            return

        # In Chat Mode: Alt+S attaches a screenshot or highlighted text into the input
        is_s = (hasattr(key, 'char') and key.char and key.char.lower() == 's') or getattr(key, 'vk', None) == 83
        if getattr(self, 'stealth_alt_pressed', False) and is_s:
            if not getattr(self, 'stealth_s_triggered', False):
                self.stealth_s_triggered = True
                print("[Stealth] Alt+S pressed (attach screenshot or highlighted text)...")
                threading.Thread(target=self._attach_stealth_content, daemon=True).start()
            return

        if key == keyboard.Key.esc:
            self.stop_stealth(submit=False)
            return False
        elif key == keyboard.Key.enter:
            self.stop_stealth(submit=True)
            return False
        elif key == keyboard.Key.space:
            with self.stealth_query_lock:
                self.stealth_query += " "
        elif key == keyboard.Key.backspace:
            with self.stealth_query_lock:
                self.stealth_query = self.stealth_query[:-1]
        elif hasattr(key, 'char') and key.char:
            with self.stealth_query_lock:
                self.stealth_query += key.char
        self.hud.sig_update_stealth.emit(self.stealth_query)

    def _attach_stealth_content(self):
        """Chat Mode: Alt+S while typing. If a text selection exists, append it to the
        pending message; otherwise flag a fresh screenshot to be captured on submit."""
        try:
            selected_text = get_selected_text_uia()
        except Exception as e:
            print(f"[Stealth] Selection detection error: {e}")
            selected_text = None
        if selected_text:
            with self.stealth_query_lock:
                self.stealth_query = f"{self.stealth_query} {selected_text}".strip()
            self.hud.stealth_text_attached = True
            self.hud.sig_update_stealth.emit(self.stealth_query)
            self.hud.status_dot.setText("[Text Attached]")
            self.hud.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")
        else:
            self.hud.stealth_screenshot_pending = True
            with self.stealth_query_lock:
                pending_label = f"{self.stealth_query} 📸"
            self.hud.sig_update_stealth.emit(pending_label)
            self.hud.status_dot.setText("[Screenshot Attached]")
            self.hud.status_dot.setStyleSheet("color: #34D399; font-size: 11px;")

    def on_stealth_release(self, key, injected=False):
        if injected:
            return
        if key in [keyboard.Key.alt, keyboard.Key.alt_l, keyboard.Key.alt_r, keyboard.Key.alt_gr]:
            self.stealth_alt_pressed = False
        is_s_release = (hasattr(key, 'char') and key.char and key.char.lower() == 's') or getattr(key, 'vk', None) == 83
        if is_s_release:
            self.stealth_s_triggered = False

    def refresh_config(self):
        """(Re)load hotkey bindings from the Dashboard DB settings.

        Called at startup, from start(), and every ~1.5s by the HUD's settings
        poller so rebinding in the Dashboard takes effect without restarting
        the engine.
        """
        try:
            db = self.hud.db
        except Exception:
            return
        new_actions = {}
        for action, (setting, default) in self.HOTKEY_SETTINGS.items():
            raw = db.get_setting(setting)
            if not raw:
                raw = default
            new_actions[action] = str(raw)
        self._actions = new_actions
        self._parsed_actions = {
            action: parse_hotkey_combo(raw) for action, raw in self._actions.items()
        }

    @staticmethod
    def _mod_token(key):
        return _HOTKEY_MOD_TOKENS.get(key)

    @staticmethod
    def _main_key_token(key):
        if key in _HOTKEY_SPECIAL_KEYS:
            return _HOTKEY_SPECIAL_KEYS[key]
        char = getattr(key, 'char', None)
        if char:
            c = char.lower()
            if c.isalnum():
                return c
        vk = getattr(key, 'vk', None)
        if vk is not None:
            if 48 <= vk <= 57:
                return chr(vk)
            if 65 <= vk <= 90:
                return chr(vk).lower()
        return None

    def _update_pressed(self, key, pressed):
        mod = self._mod_token(key)
        main = self._main_key_token(key)
        if mod:
            if pressed:
                self.pressed_mods.add(mod)
            else:
                self.pressed_mods.discard(mod)
        if main:
            if pressed:
                self.pressed_main.add(main)
            else:
                self.pressed_main.discard(main)

    def _match_action(self, only=None):
        """Return the first configured action whose combo is currently held and
        not already triggered for this press. When `only` is set, test just
        that action (used for the dormant wake-up toggle)."""
        for action, cfg in self._parsed_actions.items():
            if only is not None and action != only:
                continue
            if not cfg:
                continue
            mods, main = cfg
            if main not in self.pressed_main:
                continue
            if not mods.issubset(self.pressed_mods):
                continue
            if action in self.triggered:
                continue
            return action
        return None

    def _dispatch(self, action):
        if action == 'silent':
            print("[Hotkey] Silent Activation (HUD stays hidden)!")
            self.hud.sig_hide_hud.emit()
        elif action == 'capture':
            print("[Hotkey] Capture & Solve!")
            threading.Thread(target=self._dispatch_alt_s, daemon=True).start()
        elif action == 'audio':
            print("[Hotkey] Toggle Audio Listening!")
            self.hud.sig_toggle_audio.emit()
        elif action == 'peek':
            print("[Hotkey] Toggle HUD Visibility!")
            self.hud.sig_toggle_sticky.emit()
        elif action == 'ghost':
            print("[Hotkey] Toggle Ghost Mode!")
            self.hud.sig_toggle_ghost.emit()
        elif action == 'search':
            print("[Hotkey] Stealth Search!")
            threading.Timer(0.1, self.start_stealth).start()
        elif action == 'type':
            print("[Hotkey] Toggle Stealth Auto-Typing!")
            self.hud.sig_toggle_type.emit()
        elif action == 'interview':
            print("[Hotkey] Toggle Interview Mode!")
            self.hud.sig_toggle_interview_mode.emit()
        elif action == 'minimal':
            print("[Hotkey] Toggle Minimal Mode!")
            self.hud.sig_toggle_minimal.emit()
        elif action == 'clear':
            print("[Hotkey] Clear Answer!")
            self.hud.sig_clear_answer.emit()
        elif action == 'exit':
            print("[Hotkey] Exit Application!")
            self.hud.sig_quit_app.emit()
        elif action == 'cheat':
            print("[Hotkey] Show Cheat Sheet!")
            self.hud.sig_show_cheat.emit()
        elif action == 'scroll_up':
            print("[Hotkey] Scroll HUD Up!")
            self.hud.sig_scroll_up.emit()
        elif action == 'scroll_dn':
            print("[Hotkey] Scroll HUD Down!")
            self.hud.sig_scroll_down.emit()

    def on_press(self, key, injected=False):
        # Ignore synthetic keystrokes (e.g. from StealthTyperThread's Controller),
        # otherwise the typer floods hotkey state and Alt+P/Shift/HUD keys break.
        if injected:
            return

        self._update_pressed(key, pressed=True)

        # Panic: Ctrl/Shift pressed while stealth typing -> pause immediately.
        if self._mod_token(key) in ('ctrl', 'shift'):
            if self.hud.typer_thread and self.hud.typer_thread.isRunning():
                print("[HUD] Panic modifier key pressed! Pausing Stealth Typing...")
                self.hud.sig_toggle_type.emit()
                return

        # Dormant: ONLY the sleep combo (Alt+Z by default) wakes the engine.
        if self.is_dormant:
            if self._match_action(only='sleep'):
                print("[Hotkey] Alt + Z pressed (Waking up from Deep Sleep)...")
                self.is_dormant = False
                self.pressed_main.clear()
                self.pressed_mods.clear()
                self.hud.sig_show_hud.emit()
            return

        # Sleep combo -> go dormant / silent sleep mode.
        if self._match_action(only='sleep'):
            print("[Hotkey] Alt + Z pressed (Go dormant)...")
            self.is_dormant = True
            self.pressed_main.clear()
            self.pressed_mods.clear()
            self.hud.sig_hide_hud.emit()
            if hasattr(self.hud, 'audio_worker') and self.hud.audio_worker and self.hud.audio_worker.isRunning():
                self.hud.audio_worker.stop()
                self.hud.audio_worker.wait()
                self.hud.audio_worker = None
            if hasattr(self.hud, 'listening_badge'):
                self.hud.listening_badge.hide()
            return

        if not self.is_access_allowed():
            print("[STEALTH ENGINE LCK] Free trial expired. Please activate a license in the Dashboard.")
            self.hud.sig_quit_app.emit()
            return

        action = self._match_action()
        if action:
            # Scroll actions repeat while held (like holding the arrow key);
            # all other actions fire once per key press.
            if action not in ('scroll_up', 'scroll_dn'):
                self.triggered.add(action)
            self._dispatch(action)

    def _dispatch_alt_s(self):
        try:
            selected_text = get_selected_text_uia()
        except Exception as e:
            print(f"[Hotkey] Selection detection error: {e}")
            selected_text = None
        if selected_text:
            print("[Hotkey] Active text selection detected. Triggering text-only solve...")
            self.hud.sig_selection_capture.emit()
        else:
            print("[Hotkey] No active text selection. Triggering screen capture...")
            self.hud.sig_silent_capture.emit()

    def on_release(self, key, injected=False):
        if injected:
            return
        mod = self._mod_token(key)
        main = self._main_key_token(key)
        self._update_pressed(key, pressed=False)
        # Reset the one-shot trigger guards for any combo that involves the
        # released key so the next press of that combo fires again.
        for action, cfg in self._parsed_actions.items():
            if not cfg:
                continue
            mods, main_cfg = cfg
            if (mod is not None and mod in mods) or (main is not None and main == main_cfg):
                self.triggered.discard(action)

    def on_mouse_click(self, x, y, button, pressed):
        # If the user clicks anywhere while stealth typing is running, abort it —
        # they've moved to a different place/window.
        if pressed and self.hud.typer_thread and self.hud.typer_thread.isRunning():
            print("[Hotkey] Mouse click detected while typing — stopping Stealth Typing...")
            self.hud.sig_stop_type.emit()

    def start(self):
        self.refresh_config()
        self.main_listener = keyboard.Listener(on_press=self.on_press, on_release=self.on_release)
        self.main_listener.daemon = True
        self.main_listener.start()
        try:
            self.mouse_listener = mouse.Listener(on_click=self.on_mouse_click)
            self.mouse_listener.daemon = True
            self.mouse_listener.start()
        except Exception as e:
            print(f"[Hotkey] Failed to start mouse listener: {e}")
            self.mouse_listener = None

    def stop(self):
        try:
            if self.main_listener:
                self.main_listener.stop()
                self.main_listener = None
        except Exception as e:
            print(f"[Hotkey] Failed to stop main listener: {e}")
        try:
            if self.stealth_listener:
                self.stealth_listener.stop()
                self.stealth_listener = None
        except Exception as e:
            print(f"[Hotkey] Failed to stop stealth listener: {e}")
        try:
            if getattr(self, 'mouse_listener', None):
                self.mouse_listener.stop()
                self.mouse_listener = None
        except Exception as e:
            print(f"[Hotkey] Failed to stop mouse listener: {e}")

def _cleanup_engine_lock(lock_file_handle, lock_path):
    try:
        if lock_file_handle:
            if sys.platform == 'win32':
                try:
                    import msvcrt
                    lock_file_handle.seek(0)
                    msvcrt.locking(lock_file_handle.fileno(), msvcrt.LK_UNLCK, 1)
                except Exception:
                    pass
            else:
                try:
                    import fcntl
                    fcntl.flock(lock_file_handle.fileno(), fcntl.LOCK_UN)
                except Exception:
                    pass
            lock_file_handle.close()
        if lock_path and os.path.exists(lock_path):
            os.remove(lock_path)
    except Exception:
        pass


def _engine_access_allowed(db):
    """Return True if the engine may run: licensed or trial still active."""
    is_licensed = maybe_verify_license(db)
    trial_start = db.get_setting('trial_start')
    if not trial_start:
        trial_start = sync_trial_start(db, force_refresh=True)
    trial_expired = False
    if trial_start:
        elapsed = int(time.time() * 1000) - int(trial_start)
        if elapsed >= TRIAL_LIMIT_MS:
            trial_expired = True
    return is_licensed or not trial_expired


def run_engine():
    """Entry point for the stealth engine.

    Callable directly (python main.py) or from the packaged exe via
    `Hirebotai.exe --engine`. Uses a user-writable data dir so the
    database survives PyInstaller onefile rebuilds.
    """
    # In windowed/PyInstaller builds stdout/stderr may be None — writing would crash.
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")

    print("=" * 60)
    print("AI Vision & Audio Assistant HUD Running!")
    print("-" * 60)
    mod = _modifier_label()
    print(f"• {mod} + O         : Start engine / Activate HUD")
    print(f"• {mod} + S         : Silent Screen capture & solve (HUD stays hidden)")
    print(f"• {mod} + A         : Toggle System Audio Listening (WASAPI Speaker Loopback)")
    print(f"• {mod} + I         : Toggle Interview Mode (Uses active resume for user POV answers)")
    print(f"• {mod} + T         : Toggle Ghost Mode (Click-Through to defeat focus trackers)")
    print(f"• {mod} + H (Hold)  : View HUD answer (HUD shows now)")
    print(f"• {mod} + C         : Clear answer from memory")
    print(f"• {mod} + P         : Type the answer into the focused window")
    print(f"• {mod} + Up/Down   : Scroll through the HUD answer history")
    print("=" * 60)

    app = QApplication(sys.argv)

    # Set taskbar icon for the application (bundled or source path)
    icon_path = resource_path("app.ico")
    if os.path.exists(icon_path):
        app.setWindowIcon(QIcon(icon_path))

    db = DatabaseManager()

    # Acquire an EXCLUSIVE lock on the lock file to prevent duplicate engines.
    # On Windows a plain open("w") handle does NOT block another process from
    # deleting/rewriting the file, so a naive PID file lets two engines run and
    # both grab Alt+S. We hold an OS-level byte lock instead: the second engine
    # fails to acquire it and exits.
    lock_file_handle = None
    lock_path = os.path.join(DATA_DIR, "engine.lock")
    try:
        lock_file_handle = open(lock_path, "a+")
        if sys.platform == 'win32':
            import msvcrt
            try:
                msvcrt.locking(lock_file_handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                print("[CRITICAL] Stealth Engine is already running!")
                sys.exit(0)
            # Truncate and write our PID into the (now exclusively locked) file.
            lock_file_handle.seek(0)
            lock_file_handle.truncate()
            lock_file_handle.write(str(os.getpid()))
            lock_file_handle.flush()
        else:
            import fcntl
            try:
                fcntl.flock(lock_file_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                print("[CRITICAL] Stealth Engine is already running!")
                sys.exit(0)
            lock_file_handle.seek(0)
            lock_file_handle.truncate()
            lock_file_handle.write(str(os.getpid()))
            lock_file_handle.flush()
    except SystemExit:
        raise
    except Exception as e:
        print(f"[Warning] Lock file check failed: {e}")

    # Check Master Power Toggle (defaults to True)
    master_power = db.get_setting('master_power')
    if master_power is None:
        master_power = True
    if not master_power:
        print("[CRITICAL] Stealth Engine is disabled via Master Power in the Dashboard!")
        print("Please enable it in the Dashboard first.")
        _cleanup_engine_lock(lock_file_handle, lock_path)
        sys.exit(0)

    if not _engine_access_allowed(db):
        print("[CRITICAL] Stealth Engine access denied: free trial expired and no valid license.")
        print("Please activate a license key in the Dashboard to continue.")
        _cleanup_engine_lock(lock_file_handle, lock_path)
        sys.exit(0)

    hud = FloatingHUD(db)
    hud.hide()
    hud.sig_quit_app.connect(app.quit)

    # macOS: fire the Screen Recording permission prompt at engine startup
    # (login or right after one-time setup) so it never pops mid-exam on the
    # first Alt+S. macOS remembers the grant forever after, so once allowed the
    # hotkeys can run for weeks with zero prompts.
    if sys.platform == 'darwin':
        try:
            mac = _mac_support()
            if not mac.has_screen_capture_permission():
                print("[Engine] macOS: Screen Recording permission missing - firing prompt at startup.")
                mac.request_screen_capture_permission()
        except Exception as e:
            print(f"[Engine] macOS permission preflight failed: {e}")

    hotkey_handler = GlobalHotkeyHandler(hud)
    hud.hotkey_handler = hotkey_handler
    hotkey_handler.start()

    # Tray icon so the user always has a way to show the HUD or quit.
    tray_icon = None
    if QSystemTrayIcon.isSystemTrayAvailable():
        tray_icon = QSystemTrayIcon(QIcon(icon_path), app)
        tray_menu = QMenu()

        def _tray_show_hud():
            if _engine_access_allowed(db):
                hud.sig_show_hud.emit()

        show_action = QAction("Show HUD", tray_menu)
        show_action.triggered.connect(_tray_show_hud)
        quit_action = QAction("Quit Hirebotai", tray_menu)
        quit_action.triggered.connect(app.quit)
        tray_menu.addAction(show_action)
        tray_menu.addAction(quit_action)
        tray_icon.setContextMenu(tray_menu)
        tray_icon.setToolTip("Hirebotai — Intelligent Interview Assistant")
        tray_icon.show()
        mod = _modifier_label()
        tray_icon.showMessage("Hirebotai is running", f"Press {mod}+H to view the HUD, {mod}+S to solve the screen.",
                              QSystemTrayIcon.Information, 4000)

    # If the global hotkey hook failed to install (elevation mismatch, hook conflict),
    # tell the user immediately instead of silently doing nothing.
    hotkey_handler.main_listener.join(timeout=0.5)
    if hotkey_handler.main_listener is None or not hotkey_handler.main_listener.is_alive():
        msg = ("Hirebotai could not register its global hotkeys. "
               "Please restart the app and make sure it isn't running as a different privilege level "
               "than the programs you want to use it with.")
        print("[HOTKEY] Global hotkey hook failed to start.")
        try:
            QMessageBox.critical(None, "Hirebotai — Hotkey error", msg)
        except Exception:
            if tray_icon:
                tray_icon.showMessage("Hirebotai hotkey error", msg, QSystemTrayIcon.Critical, 10000)

    def cleanup_on_quit():
        print("[HUD] Shutting down gracefully...")
        try:
            hud.stop_engine_threads()
        except Exception as e:
            print(f"[HUD] Shutdown thread stop error: {e}")
        try:
            hotkey_handler.stop()
        except Exception as e:
            print(f"[HUD] Shutdown hotkey stop error: {e}")
        try:
            if lock_file_handle:
                if sys.platform == 'win32':
                    try:
                        import msvcrt
                        lock_file_handle.seek(0)
                        msvcrt.locking(lock_file_handle.fileno(), msvcrt.LK_UNLCK, 1)
                    except Exception:
                        pass
                else:
                    try:
                        import fcntl
                        fcntl.flock(lock_file_handle.fileno(), fcntl.LOCK_UN)
                    except Exception:
                        pass
                lock_file_handle.close()
            if os.path.exists(lock_path):
                os.remove(lock_path)
        except Exception:
            pass

    app.aboutToQuit.connect(cleanup_on_quit)

    sys.exit(app.exec())


if __name__ == "__main__":
    run_engine()
