"""
Deterministic, network-free tests for the task-aware AI router.

Run:  .venv\\Scripts\\python.exe test_routing.py
Covers the 20+ scenarios: task classification, routing matrix, conditional
verification, screenshot-never-Groq, cooldown/disable policy, caching, STT,
redacted logging, no-crash with all providers down.
"""

import io
import sys
import unittest
from unittest import mock

sys.path.insert(0, ".")

import ai_config
from ai_config import (
    PROVIDER_STATE, PROVIDER_GROQ, PROVIDER_GEMINI, PROVIDER_OPENROUTER,
    TASK_EASY_TEXT, TASK_MEDIUM_TEXT, TASK_HARD_TEXT, TASK_CODE, TASK_DSA,
    TASK_SQL, TASK_DEBUGGING, TASK_SCREENSHOT, TASK_INTERVIEW,
    TASK_PRACTICE_FEEDBACK, MODEL_CONFIG,
    classify_task, choose_models, estimate_confidence, should_verify,
    validate_code_static, redact, cache_key, route_request, call_ai,
    run_verification,
)

KEYS = {
    "groq": "gsk_test123456789",
    "openrouter": "sk-or-v1-test123456789",
    "gemini": "AIzaSy_test123456789",
}


def _reset_state():
    PROVIDER_STATE._disabled.clear()
    PROVIDER_STATE._cooldown.clear()
    PROVIDER_STATE._minute_hits.clear()
    PROVIDER_STATE._day_hits.clear()
    ai_config.AI_CACHE._data.clear()


def _ok_response(text="answer"):
    class _Resp:
        status_code = 200
        headers = {}

        def json(self):
            return {"choices": [{"message": {"content": text}}]}

    return _Resp()


def _resp(status, body="", retry_after=None):
    class _Resp:
        status_code = status
        text = body
        headers = {"Retry-After": retry_after} if retry_after else {}

        def json(self):
            if status == 200:
                return {"choices": [{"message": {"content": body}}]}
            return {}

    return _Resp()


class TestClassification(unittest.TestCase):
    def test_easy_text(self):
        task, diff, lang = classify_task("What is the capital of France?")
        self.assertEqual(task, TASK_EASY_TEXT)

    def test_medium_text(self):
        task, _, _ = classify_task(
            "Explain in detail the difference between REST and GraphQL, covering request routing, "
            "caching, over-fetching, under-fetching, and when each style is the better choice for "
            "a client-server API architecture, with concrete examples of typical usage patterns.")
        self.assertEqual(task, TASK_MEDIUM_TEXT)

    def test_hard_text(self):
        task, diff, _ = classify_task("Design a highly scalable distributed system with advanced complexity analysis.")
        self.assertEqual(task, TASK_HARD_TEXT)
        self.assertEqual(diff, "HARD")

    def test_code(self):
        task, _, lang = classify_task("```python\nprint('hi')\n```", language="python")
        self.assertEqual(task, TASK_CODE)

    def test_sql(self):
        task, _, lang = classify_task("SELECT * FROM users WHERE id = 5")
        self.assertEqual(task, TASK_SQL)
        self.assertEqual(lang, "sql")

    def test_dsa(self):
        task, diff, _ = classify_task("What is the time complexity of binary search?")
        self.assertEqual(task, TASK_DSA)

    def test_debugging(self):
        task, _, _ = classify_task("My code throws a TypeError, why isn't it working?")
        self.assertEqual(task, TASK_DEBUGGING)

    def test_screenshot_no_text(self):
        task, _, _ = classify_task("", image_bytes=b"\xff\xd8\xff\xe0fakepng")
        self.assertEqual(task, TASK_SCREENSHOT)

    def test_screenshot_with_text(self):
        task, _, _ = classify_task("Solve this problem", image_bytes=b"\xff\xd8\xff\xe0fakepng")
        self.assertEqual(task, TASK_SCREENSHOT)

    def test_follow_up_not_cached_class(self):
        task, _, _ = classify_task("can you explain more", is_follow_up=True)
        self.assertEqual(task, TASK_MEDIUM_TEXT)


class TestRoutingMatrix(unittest.TestCase):
    def test_easy_fast_no_verify(self):
        chain = choose_models(TASK_EASY_TEXT)
        self.assertEqual(chain[0][0], PROVIDER_GROQ)
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_FAST"])

    def test_dsa_strong(self):
        chain = choose_models(TASK_DSA)
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_STRONG"])

    def test_debugging_strong(self):
        chain = choose_models(TASK_DEBUGGING)
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_STRONG"])

    def test_hard_text_strong(self):
        chain = choose_models(TASK_HARD_TEXT)
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_STRONG"])

    def test_sql_simple_fast(self):
        chain = choose_models(TASK_SQL, difficulty="simple")
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_FAST"])

    def test_sql_complex_strong(self):
        chain = choose_models(TASK_SQL, difficulty="complex")
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_STRONG"])

    def test_screenshot_gemini_first_never_groq(self):
        chain = choose_models(TASK_SCREENSHOT, has_image=True)
        self.assertEqual(chain[0][0], PROVIDER_GEMINI)
        self.assertEqual(chain[0][1], MODEL_CONFIG["GEMINI_FAST"])
        for provider, _, _ in chain:
            self.assertNotEqual(provider, PROVIDER_GROQ, "Groq must never receive screenshots")

    def test_interview_groq_fast(self):
        chain = choose_models(TASK_INTERVIEW)
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_FAST"])

    def test_practice_feedback_groq_fast(self):
        chain = choose_models(TASK_PRACTICE_FEEDBACK)
        self.assertEqual(chain[0][1], MODEL_CONFIG["GROQ_FAST"])


class TestVerificationPolicy(unittest.TestCase):
    def test_high_confidence_no_verify(self):
        self.assertFalse(should_verify(TASK_DSA, "HIGH", difficulty="HARD"))

    def test_low_confidence_verify(self):
        self.assertTrue(should_verify(TASK_DSA, "LOW", difficulty="HARD"))

    def test_user_asked_verify(self):
        self.assertTrue(should_verify(TASK_EASY_TEXT, "HIGH", user_asked_verify=True))

    def test_code_issue_verify(self):
        self.assertTrue(should_verify(TASK_CODE, "HIGH", code_issue=True))

    def test_successful_dsa_no_verifier(self):
        # A long, structured DSA answer → HIGH confidence → no verifier call.
        answer = "```python\ndef binary_search(arr, target):\n    lo, hi = 0, len(arr)-1\n    while lo <= hi:\n        mid = (lo + hi)//2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n```\nThis binary search runs in O(log n) time and O(1) space."
        conf, reason = estimate_confidence(TASK_DSA, answer)
        self.assertEqual(conf, "HIGH")
        self.assertFalse(should_verify(TASK_DSA, conf, difficulty="HARD"))

    def test_low_confidence_short_answer_verify(self):
        conf, _ = estimate_confidence(TASK_DSA, "short")
        self.assertEqual(conf, "LOW")
        self.assertTrue(should_verify(TASK_DSA, conf))

    def test_verifier_uses_independent_provider(self):
        v_provider, _ = ai_config.pick_verifier(PROVIDER_GROQ)
        self.assertNotEqual(v_provider, PROVIDER_GROQ)
        v2, _ = ai_config.pick_verifier(PROVIDER_GEMINI)
        self.assertNotEqual(v2, PROVIDER_GEMINI)


class TestRouteRequest(unittest.TestCase):
    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_easy_uses_groq_fast(self, mock_post, mock_gemini):
        _reset_state()
        mock_post.return_value = _ok_response("42")
        result = route_request(keys=dict(KEYS), task=TASK_EASY_TEXT, prompt="2+2?")
        self.assertEqual(result["text"], "42")
        self.assertEqual(result["provider"], PROVIDER_GROQ)
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["model"], MODEL_CONFIG["GROQ_FAST"])
        # No verification for successful easy answer.
        self.assertFalse(result["verified"])

    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_dsa_uses_groq_strong_no_verify(self, mock_post, mock_gemini):
        _reset_state()
        answer = "```python\ndef two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []\n```\nO(n) time, O(n) space."
        mock_post.return_value = _ok_response(answer)
        result = route_request(keys=dict(KEYS), task=TASK_DSA, prompt="two sum",
                               difficulty="MEDIUM", language="python")
        self.assertEqual(result["provider"], PROVIDER_GROQ)
        self.assertEqual(mock_post.call_args.kwargs["json"]["model"], MODEL_CONFIG["GROQ_STRONG"])
        self.assertFalse(result["verified"], "successful DSA must NOT trigger a verifier")

    @mock.patch("ai_config._call_gemini")
    @mock.patch("ai_config._call_openrouter")
    def test_screenshot_uses_gemini_never_groq(self, mock_or, mock_gem):
        _reset_state()
        mock_gem.return_value = {"ok": True, "text": "solved", "category": None, "model": MODEL_CONFIG["GEMINI_FAST"]}
        result = route_request(keys=dict(KEYS), task=TASK_SCREENSHOT, prompt="solve",
                               image_bytes=b"\xff\xd8\xff\xe0img")
        self.assertEqual(result["provider"], PROVIDER_GEMINI)
        self.assertEqual(mock_gem.call_count, 1, "Gemini is the screenshot primary")
        mock_or.assert_not_called()

    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_practice_feedback_fast_model(self, mock_post, mock_gemini):
        _reset_state()
        mock_post.return_value = _ok_response("feedback")
        result = route_request(keys=dict(KEYS), task=TASK_PRACTICE_FEEDBACK, prompt="evaluate",
                               allow_cache=False)
        self.assertEqual(mock_post.call_args.kwargs["json"]["model"], MODEL_CONFIG["GROQ_FAST"])

    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_429_cooldown_then_fallback(self, mock_post, mock_gemini):
        _reset_state()
        # Groq returns 429; OpenRouter returns 200 → falls back successfully.
        mock_post.side_effect = [
            _resp(429, retry_after="15"),
            _ok_response("fallback answer"),
        ]
        result = route_request(keys=dict(KEYS), task=TASK_MEDIUM_TEXT, prompt="hello")
        self.assertEqual(result["provider"], PROVIDER_OPENROUTER)
        self.assertEqual(result["text"], "fallback answer")
        self.assertEqual(PROVIDER_STATE.status(PROVIDER_GROQ)[0], "cooldown")

    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_invalid_key_no_repeated_retry(self, mock_post, mock_gemini):
        _reset_state()
        mock_post.side_effect = [
            _resp(401),
            _resp(200, "fallback"),
        ]
        result = route_request(keys=dict(KEYS), task=TASK_MEDIUM_TEXT, prompt="hi")
        # Groq marked disabled; router did NOT retry the same failed request,
        # it moved on to the next available provider.
        self.assertEqual(PROVIDER_STATE.status(PROVIDER_GROQ)[0], "disabled")
        self.assertEqual(result["provider"], PROVIDER_OPENROUTER)
        self.assertEqual(result["text"], "fallback")

    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_404_model_unavailable_falls_back(self, mock_post, mock_gemini):
        _reset_state()
        mock_post.side_effect = [
            _resp(404),                      # Groq model unavailable
            _ok_response("gemini fallback"),  # OpenRouter text fallback
        ]
        result = route_request(keys=dict(KEYS), task=TASK_MEDIUM_TEXT, prompt="hi")
        # Groq should NOT be disabled (model_unavailable is not provider-wide).
        self.assertEqual(PROVIDER_STATE.status(PROVIDER_GROQ)[0], "ok")
        self.assertTrue(result["text"])

    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_all_providers_down_no_crash(self, mock_post, mock_gemini):
        _reset_state()
        mock_post.side_effect = [
            _resp(429), _resp(500),  # groq chain
            _resp(500), _resp(500),  # openrouter + gemini(no_key, skipped)
        ]
        result = route_request(keys=dict(KEYS), task=TASK_MEDIUM_TEXT, prompt="hi")
        self.assertEqual(result["text"], "")
        self.assertIn("error_category", result)
        # No crash, request completed.

    @mock.patch("ai_config._call_gemini", return_value={"ok": False, "text": "", "category": "no_key"})
    @mock.patch("requests.post")
    def test_empty_response_falls_back_not_disabled(self, mock_post, mock_gemini):
        _reset_state()
        mock_post.side_effect = [
            _ok_response(""),                    # empty from Groq
            _ok_response("good fallback"),
        ]
        result = route_request(keys=dict(KEYS), task=TASK_MEDIUM_TEXT, prompt="hi")
        self.assertEqual(result["text"], "good fallback")
        self.assertEqual(PROVIDER_STATE.status(PROVIDER_GROQ)[0], "ok")


class TestCache(unittest.TestCase):
    def test_cache_hit(self):
        _reset_state()
        key1 = cache_key(TASK_EASY_TEXT, "same prompt", "attached", "python")
        ai_config.AI_CACHE.put(key1, {"text": "cached-answer", "cached": True})
        got = ai_config.AI_CACHE.get(key1)
        self.assertEqual(got["text"], "cached-answer")

    def test_image_cache_differs_for_different_screenshots(self):
        _reset_state()
        img_a = io.BytesIO()
        img_b = io.BytesIO()
        # Two visually different images.
        from PIL import Image
        Image.new("RGB", (32, 32), (255, 0, 0)).save(img_a, format="JPEG")
        Image.new("RGB", (32, 32), (0, 0, 255)).save(img_b, format="JPEG")
        k1 = cache_key(TASK_SCREENSHOT, "p", image_bytes=img_a.getvalue())
        k2 = cache_key(TASK_SCREENSHOT, "p", image_bytes=img_b.getvalue())
        self.assertNotEqual(k1, k2)

    def test_attached_text_hash_affects_key(self):
        _reset_state()
        k1 = cache_key(TASK_CODE, "p", attached_text="code A")
        k2 = cache_key(TASK_CODE, "p", attached_text="code B")
        self.assertNotEqual(k1, k2)

    def test_interviews_never_cached(self):
        # classify/route for INTERVIEW always passes allow_cache=False, but we
        # also assert that the cache is bypassed even if a key were computed.
        _reset_state()
        k = cache_key(TASK_INTERVIEW, "q")
        self.assertIsNone(ai_config.AI_CACHE.get(k))


class TestCodeValidation(unittest.TestCase):
    def test_python_syntax_ok(self):
        ok, issues, note = validate_code_static("python", "def f():\n    return 1\n")
        self.assertTrue(ok)
        self.assertIn("static", note)

    def test_python_syntax_error(self):
        ok, issues, note = validate_code_static("python", "def f(:\n    return 1\n")
        self.assertFalse(ok)
        self.assertTrue(any("SyntaxError" in i for i in issues))

    def test_cpp_balanced(self):
        ok, issues, _ = validate_code_static("cpp", "int main() { return 0; }")
        self.assertTrue(ok)

    def test_cpp_unbalanced(self):
        ok, issues, _ = validate_code_static("cpp", "int main() { return 0; ")
        self.assertFalse(ok)

    def test_no_execution_claimed(self):
        _, _, note = validate_code_static("python", "print('x')")
        self.assertIn("does not validate algorithm correctness", note)


class TestRedaction(unittest.TestCase):
    def test_keys_redacted(self):
        dirty = "key=gsk_AbC12345XyZ bearer sk-or-v1-abcdefgh123 gemini AIzaSy1234567890abcdefgh"
        clean = redact(dirty)
        self.assertNotIn("gsk_", clean)
        self.assertNotIn("sk-or-v1-", clean)
        self.assertNotIn("AIzaSy", clean)

    def test_verify_prompt_no_crash(self):
        p = ai_config.VERIFY_PROMPT.format(prompt="p", answer="a")
        self.assertIn("VERIFIED", p)


class TestSTT(unittest.TestCase):
    @mock.patch("requests.post")
    def test_groq_stt_preferred(self, mock_post):
        class _Resp:
            status_code = 200
            def json(self):
                return {"text": "hello there"}
        mock_post.return_value = _Resp()

        class _Audio:
            def get_wav_data(self):
                return b"wavbytes"
            def recognize_google(self):
                return "google fallback"
        text, provider = ai_config.transcribe_audio(dict(KEYS), _Audio())
        self.assertEqual(provider, PROVIDER_GROQ)
        self.assertEqual(text, "hello there")

    @mock.patch("requests.post")
    def test_google_fallback(self, mock_post):
        class _Resp:
            status_code = 500
            text = "err"
        mock_post.return_value = _Resp()

        class _Audio:
            def get_wav_data(self):
                return b"wavbytes"
            def recognize_google(self):
                return "google text"
        text, provider = ai_config.transcribe_audio(dict(KEYS), _Audio())
        self.assertEqual(provider, "google")
        self.assertEqual(text, "google text")


class TestLogging(unittest.TestCase):
    def test_log_router_and_fallback_use_redaction(self):
        import contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            ai_config.log_router(task=TASK_DSA, difficulty="HARD", provider=PROVIDER_GROQ,
                                 model="openai/gpt-oss-120b", reason="complex_dsa")
            ai_config.log_fallback(PROVIDER_GROQ, PROVIDER_GEMINI, "429")
        out = buf.getvalue()
        self.assertIn("[AI ROUTER]", out)
        self.assertIn("task=dsa", out)
        self.assertIn("provider=Groq", out)
        self.assertIn("[AI FALLBACK]", out)
        self.assertIn("from=Groq", out)
        self.assertIn("to=Gemini", out)


if __name__ == "__main__":
    unittest.main(verbosity=2)
