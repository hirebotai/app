"""
Hirebotai Dashboard - PyWebView Launcher
Bridges the premium HTML/CSS/JS UI with the Python database backend.
"""

import webview
import os
import sys
import json
import functools
import importlib.util
import subprocess
from database import DatabaseManager, DB_FILE, DATA_DIR, get_device_hwid, sync_trial_start, maybe_verify_license, _mac_support

# Shared task-aware AI routing (model config, classification, provider interface)
import ai_config

# Imported at top level so PyInstaller bundles it in the frozen build.
# (Importing inside __main__ makes it invisible to PyInstaller's analyzer.)
try:
    from main import run_engine
except ImportError:
    run_engine = None

# Optional audio stack for practice voice input (soundcard + numpy + speech_recognition)
HAS_AUDIO = importlib.util.find_spec("soundcard") is not None and importlib.util.find_spec("numpy") is not None

def _trim_silence(buf, np, threshold=0.03):
    """Trim leading/trailing silence so transcription calls stay small and cheap."""
    try:
        if buf is None or len(buf) == 0:
            return np.zeros(0, dtype=np.float32)
        abs_buf = np.abs(buf)
        idx = np.nonzero(abs_buf > threshold)[0]
        if len(idx) == 0:
            return np.zeros(0, dtype=np.float32)
        start = max(0, int(idx[0]) - 3200)
        end = min(len(buf), int(idx[-1]) + 3200)
        return buf[start:end]
    except Exception:
        return buf


# Use the canonical www domain. hirebotai.in issues a 308 redirect to
# www.hirebotai.in, and Python's requests strips the Authorization header on
# cross-host redirects — silently breaking every authenticated call (trial sync,
# account refresh, etc.). Hitting www directly avoids the redirect entirely.
API_BASE = "https://www.hirebotai.in"

# App version — reported in feedback and compared against /api/notice for
# update announcements. Bump when a new release is shipped. Single source of
# truth: root VERSION file.
def _load_app_version():
    try:
        version_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "VERSION")
        with open(version_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return "1.17.8.26"

APP_VERSION = _load_app_version()

# Force Windows to associate the taskbar window with our custom AppUserModelID (keeps custom taskbar icon)
if sys.platform == 'win32':
    try:
        import ctypes
        myappid = 'hirebotai.assistant.dashboard.v1'
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    except Exception as e:
        print(f"Failed to set AppUserModelID: {e}")

db = DatabaseManager()

# Free-trial window: 3 days. Shared by startup, the Alt+O relaunch listener and the
# JS lock screen so every access gate agrees on exactly when the trial ends.
TRIAL_LIMIT_MS = 3 * 24 * 60 * 60 * 1000


def _pid_alive(pid_str):
    """Return True if the PID refers to a live process (Windows or macOS)."""
    if not pid_str or not pid_str.isdigit():
        return False
    if sys.platform == 'darwin':
        return _mac_support().is_process_running(pid_str)
    import ctypes
    handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, int(pid_str))
    if handle:
        ctypes.windll.kernel32.CloseHandle(handle)
        return True
    return False


def engine_is_running():
    """Return True if the background stealth engine is alive (via engine.lock PID)."""
    try:
        lock_path = os.path.join(DATA_DIR, "engine.lock")
        if os.path.exists(lock_path):
            with open(lock_path, "r") as f:
                pid_str = f.read().strip()
            if _pid_alive(pid_str):
                return True
            # Stale lock (crashed or hard-killed process). Clear it so a fresh
            # engine can start — a dead PID must never block the real engine.
            try:
                os.remove(lock_path)
            except Exception:
                pass
        return False
    except Exception as e:
        print(f"[Dashboard] Engine lock check error: {e}")
        return False


def dashboard_is_running():
    """Return True if another dashboard instance is alive (via dashboard.lock PID)."""
    try:
        lock_path = os.path.join(DATA_DIR, "dashboard.lock")
        if os.path.exists(lock_path):
            with open(lock_path, "r") as f:
                pid_str = f.read().strip()
            if _pid_alive(pid_str):
                return True
            # Stale lock from a crashed instance — take over cleanly.
            try:
                os.remove(lock_path)
            except Exception:
                pass
        return False
    except Exception as e:
        print(f"[Dashboard] Instance lock check error: {e}")
        return False


def focus_existing_dashboard(pid_str):
    """Bring the already-running dashboard window to the foreground."""
    try:
        if sys.platform != 'win32':
            return
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        target_hwnd = None

        # Prefer matching the known window title.
        hwnd = user32.FindWindowW(None, 'Hirebotai — Premium Dashboard')
        if hwnd:
            target_hwnd = hwnd
        # Fallback: any visible top-level window owned by the lock PID.
        elif pid_str and pid_str.isdigit():
            EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
            target_pid = int(pid_str)

            def _find(hwnd, lparam):
                pid = wintypes.DWORD()
                user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                if pid.value == target_pid and user32.IsWindowVisible(hwnd):
                    nonlocal target_hwnd
                    target_hwnd = hwnd
                    return False  # stop enumerating
                return True

            user32.EnumWindows(EnumWindowsProc(_find), 0)

        if target_hwnd:
            user32.ShowWindow(target_hwnd, 9)  # SW_RESTORE
            user32.SetForegroundWindow(target_hwnd)
            print("[Dashboard] Focused the existing dashboard window.")
    except Exception as e:
        print(f"[Dashboard] Could not focus existing window: {e}")


def base_dir():
    """Return the app base directory, resolving the PyInstaller bundle path."""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def engine_launch_command():
    """Command used to launch the background stealth engine.

    In a PyInstaller build this is the packaged exe itself with `--engine`;
    in source mode it's the venv python running main.py directly.
    """
    if getattr(sys, 'frozen', False):
        return [sys.executable, '--engine']
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if sys.platform == 'darwin':
        python_exe = os.path.join(script_dir, ".venv", "bin", "python")
    else:
        python_exe = os.path.join(script_dir, ".venv", "Scripts", "pythonw.exe")
    if not os.path.exists(python_exe):
        python_exe = sys.executable
    return [python_exe, os.path.join(script_dir, "main.py")]

def set_startup(enabled):
    if sys.platform == 'darwin':
        return _mac_support().set_auto_start(enabled)
    import winreg
    import os

    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"

    # Two registry values so the app survives a reboot WITHOUT any dashboard or
    # terminal window:
    #   "Hirebotai"             -> the silent background engine (hotkeys active)
    #   "Hirebotai Relauncher"  -> Alt+O listener that restarts the engine if it
    #                              ever died (only fires when the dashboard is closed)
    frozen = getattr(sys, 'frozen', False)
    if frozen:
        engine_cmd = '"{app}" --engine'.format(app=sys.executable)
        relauncher_cmd = '"{app}" --relaunch'.format(app=sys.executable)
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        pythonw = os.path.join(script_dir, ".venv", "Scripts", "pythonw.exe")
        if not os.path.exists(pythonw):
            pythonw = sys.executable
        engine_cmd = '"{py}" "{main}"'.format(py=pythonw, main=os.path.join(script_dir, "main.py"))
        relauncher_cmd = '"{py}" "{dash}" --relaunch'.format(py=pythonw, dash=os.path.join(script_dir, "dashboard.py"))

    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
        if enabled:
            winreg.SetValueEx(key, "Hirebotai", 0, winreg.REG_SZ, engine_cmd)
            winreg.SetValueEx(key, "Hirebotai Relauncher", 0, winreg.REG_SZ, relauncher_cmd)
        else:
            for app_name in ("Hirebotai", "Hirebotai Relauncher"):
                try:
                    winreg.DeleteValue(key, app_name)
                except FileNotFoundError:
                    pass
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Failed to set registry startup: {e}")


def stop_hidden_app_processes():
    """Stop only the background processes launched by this application.

    The desktop dashboard intentionally remains open so it can report the
    result.  Engine and relauncher PIDs come from their private lock files and
    their command lines are checked before termination, preventing a broad
    python/pythonw process kill.
    """
    targets = (
        ("engine", os.path.join(DATA_DIR, "engine.lock")),
        ("relaunch listener", os.path.join(DATA_DIR, "relaunch.lock")),
    )
    stopped = []
    skipped = []

    for label, lock_path in targets:
        try:
            with open(lock_path, "r") as lock_file:
                pid_str = lock_file.read().strip()
            pid = int(pid_str)
        except (OSError, ValueError):
            continue

        if pid == os.getpid() or not _pid_alive(str(pid)):
            skipped.append(label)
            try:
                os.remove(lock_path)
            except OSError:
                pass
            continue

        if sys.platform == 'win32':
            try:
                command_line = subprocess.run(
                    ["powershell", "-NoProfile", "-Command",
                     f"(Get-CimInstance Win32_Process -Filter 'ProcessId = {pid}').CommandLine"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                ).stdout.strip().lower()
            except Exception:
                command_line = ""

            source_dir = os.path.dirname(os.path.abspath(__file__)).lower()
            executable = os.path.basename(sys.executable).lower()
            expected_flag = "--engine" if label == "engine" else "--relaunch"
            is_source_process = source_dir in command_line and (
                "main.py" in command_line if label == "engine" else "dashboard.py" in command_line
            )
            is_packaged_process = executable in command_line and expected_flag in command_line
            if not (is_source_process or is_packaged_process):
                skipped.append(label)
                continue

            result = subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            if result.returncode == 0:
                stopped.append(label)
            else:
                skipped.append(label)
        else:
            # macOS launches use the same private PID locks. SIGTERM lets the
            # engine clean up its audio and HUD resources before exit.
            try:
                os.kill(pid, 15)
                stopped.append(label)
            except OSError:
                skipped.append(label)

        try:
            os.remove(lock_path)
        except OSError:
            pass

    return {"success": True, "stopped": stopped, "skipped": skipped}

window = None

class Api:
    """All methods here are callable directly from JavaScript via window.pywebview.api.*"""
    def __init__(self):
        self.is_fullscreen = False

    @staticmethod
    def _safe(fn):
        """Wrap an exposed method so unexpected exceptions return an error dict
        instead of rejecting the JS promise and freezing the webview."""
        @functools.wraps(fn)
        def wrapper(self, *args, **kwargs):
            try:
                return fn(self, *args, **kwargs)
            except Exception as e:
                print(f"[Api] {fn.__name__} failed: {e}")
                return {'success': False, 'error': str(e)}
        return wrapper

    @_safe
    def get_all_settings(self):
        settings = db.get_all_settings()
        # Re-validate the stored license server-side (cached 12h) so the
        # dashboard reflects expiry/revocation without waiting for a hotkey.
        # On rejection the key is cleared locally and the UI shows trial state.
        maybe_verify_license(db)
        settings['license_key'] = (db.get_setting('license_key') or '').strip()
        # Sync trial on every startup when logged in. This binds the trial
        # record to the account if it was previously created without a user_id
        # (e.g., the user trialed before logging in).
        if db.is_logged_in():
            settings['trial_start'] = sync_trial_start(db, force_refresh=True)
        # Never expose API keys to the webview page — only their presence.
        settings['groq_api_key_set'] = bool(settings.get('groq_api_key'))
        settings['openrouter_api_key_set'] = bool(settings.get('openrouter_api_key'))
        settings['gemini_api_key_set'] = bool(settings.get('gemini_api_key'))
        settings['groq_api_key'] = ''
        settings['openrouter_api_key'] = ''
        settings['gemini_api_key'] = ''
        # Account summary so the UI can greet the signed-in user.
        session = db.get_session()
        settings['acct_email'] = session.get('email') if session else ''
        settings['acct_name'] = session.get('name') if session else ''
        return settings

    @_safe
    def set_setting(self, key, value):
        db.set_setting(key, value)
        if key == 'auto_start':
            # Start with Windows via HKCU registry (works for a normal user process;
            # the old Windows service cannot run a GUI + global-hotkey engine in Session 0)
            set_startup(bool(value))
        return True



    def get_setting(self, key):
        return db.get_setting(key)

    @_safe
    def launch_engine(self):
        """Start the background stealth engine now (used after license activation)."""
        import subprocess
        if engine_is_running():
            return {'success': True, 'already_running': True}
        if sys.platform == 'darwin':
            # Fire the Screen Recording prompt while the dashboard is foreground,
            # so it never appears mid-exam. After granting, the app must restart.
            if not _mac_support().has_screen_capture_permission():
                _mac_support().request_screen_capture_permission()
        import copy
        cmd = engine_launch_command()
        env = copy.deepcopy(os.environ)
        env.pop('_MEIPASS2', None)
        env.pop('_MEIPASS', None)
        safe_cwd = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else None
        if sys.platform == 'win32':
            subprocess.Popen(cmd, env=env, cwd=safe_cwd, creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            subprocess.Popen(cmd, env=env, cwd=safe_cwd)
        print(f"[Dashboard] Engine launched after license activation: {cmd}")
        return {'success': True}

    @_safe
    def stop_hidden_processes(self):
        """Stop the HUD engine and persistent relaunch listener on demand."""
        return stop_hidden_app_processes()

    @_safe
    def get_mac_permissions(self):
        """Report macOS TCC permission status so the UI can warn before an exam."""
        if sys.platform != 'darwin':
            return {'screen_recording': True, 'accessibility': True}
        mac = _mac_support()
        return {
            'screen_recording': mac.has_screen_capture_permission(),
            'accessibility': mac.has_accessibility_permission(),
        }

    @_safe
    def request_screen_capture_permission(self):
        """Explicitly fire the Screen Recording permission prompt on demand."""
        if sys.platform != 'darwin':
            return {'success': True, 'granted': True}
        granted = _mac_support().request_screen_capture_permission()
        return {'success': True, 'granted': granted}

    @_safe
    def activate_license_key(self, key):
        if not isinstance(key, str):
            return {'success': False, 'error': 'Invalid license key format.'}
        key = key.strip()
        if not (key.startswith('SA-') and len(key) >= 12):
            return {'success': False, 'error': 'Invalid license key format.'}

        device_hwid = get_device_hwid()
        print(f"[License] Activating key '{key}' for device HWID: {device_hwid}")

        # Attempt online device-binding verification with the website server
        try:
            import requests
            verify_url = f"{API_BASE}/api/activate-license"
            resp = requests.post(verify_url, json={"license_key": key, "hwid": device_hwid}, timeout=8)
            if resp.status_code == 200:
                res_data = resp.json()
                if res_data.get('success'):
                    db.set_setting('license_key', key)
                    db.set_setting('device_hwid', device_hwid)
                    db.set_setting('license_state', 'active')
                    # Force the next engine access-check to re-verify against the
                    # server instead of trusting a stale 12h verification cache.
                    db.set_setting('license_verified_at', '')
                    return {'success': True, 'message': res_data.get('message', 'License activated and bound to this PC.')}
                else:
                    return {'success': False, 'error': res_data.get('error', 'License verification failed.')}
            # Definitive rejection from the server: expired / revoked / not found
            # / already bound to another PC. Never fall through to the offline
            # path on a server response, or any random key would be accepted.
            if resp.status_code in (404, 403, 409):
                try:
                    res_data = resp.json()
                    err = res_data.get('error', 'License verification failed.')
                except Exception:
                    err = f'License verification failed (HTTP {resp.status_code}).'
                return {'success': False, 'error': err}
            # Transient status (429 rate limit, 500 server error): do not accept.
            return {'success': False, 'error': f'License verification failed (HTTP {resp.status_code}). Please try again.'}
        except Exception as net_err:
            print(f"[License] Online verification unavailable: {net_err}")

        # Offline fallback: only keep an already-bound license for this exact
        # HWID — never accept a brand-new key without server confirmation.
        existing_key = (db.get_setting('license_key') or '').strip()
        existing_hwid = db.get_setting('device_hwid') or ''
        if existing_key == key and existing_hwid == device_hwid:
            db.set_setting('license_state', 'active')
            db.set_setting('license_verified_at', '')
            return {'success': True, 'message': 'License already bound to this PC (offline mode).'}
        return {'success': False, 'error': 'Could not verify license — you appear to be offline. Connect to the internet and try again.'}

    # ---- Unified account (same login as the website) ----

    def _refresh_session(self):
        """Swap an expired access token for a fresh one. Returns new token or None."""
        session = db.get_session()
        if not session or not session.get('refresh_token'):
            return None
        try:
            import requests
            resp = requests.post(
                f"{API_BASE}/api/app/auth/refresh",
                json={"refresh_token": session['refresh_token']},
                timeout=10,
            )
            data = resp.json() if resp.status_code == 200 else {}
            if data.get('access_token'):
                db.save_session(
                    data['access_token'],
                    data.get('refresh_token') or session['refresh_token'],
                    session.get('user_id'),
                    session.get('email'),
                    session.get('name'),
                )
                return data['access_token']
        except Exception as e:
            print(f"[Account] Token refresh failed: {e}")
        return None

    @_safe
    def app_get_account(self):
        """Return current login state from the locally stored session.

        Login is required only ONCE: the session persists across restarts
        (tokens are refreshed automatically on use), so every later launch
        unlocks immediately without waiting on the network.
        """
        session = db.get_session()
        if not session:
            return {'logged_in': False}
        import time
        trial_start = db.get_setting('trial_start')
        trial_active = bool(trial_start) and (
            int(time.time() * 1000) - int(trial_start) < TRIAL_LIMIT_MS
        )
        return {
            'logged_in': True,
            'user': {'id': session.get('user_id'), 'email': session.get('email'), 'name': session.get('name')},
            'trial': {'trial_start': trial_start, 'trial_active': trial_active},
            'license': {'plan': 'active'} if (db.get_setting('license_key') or '').strip().startswith('SA-') else None,
        }

    @_safe
    def app_refresh_account(self):
        """Fetch the freshest user profile (name/email) from the server and
        sync it into the local session, so the dashboard shows the name the
        user gave at registration instead of deriving one from the email."""
        session = db.get_session()
        if not session or not session.get('access_token'):
            return {'success': False, 'error': 'Not logged in.'}
        try:
            import requests
            token = session['access_token']
            resp = requests.get(
                f"{API_BASE}/api/app/account",
                headers={"Authorization": f"Bearer {token}"},
                timeout=8,
            )
            if resp.status_code == 401:
                token = self._refresh_session()
                if not token:
                    return {'success': False, 'error': 'Session expired. Please log in again.'}
                resp = requests.get(
                    f"{API_BASE}/api/app/account",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=8,
                )
            data = resp.json()
            if resp.status_code == 200 and data.get('success'):
                u = data.get('user') or {}
                user_id = u.get('id') or session.get('user_id')
                email = u.get('email') or session.get('email')
                name = u.get('name') or session.get('name')
                if email != session.get('email') or name != session.get('name'):
                    db.save_session(
                        session['access_token'],
                        session.get('refresh_token'),
                        user_id,
                        email,
                        name,
                    )
                return {'success': True, 'user': {'id': user_id, 'email': email, 'name': name}}
            return {'success': False, 'error': data.get('error') or 'Failed to load account.'}
        except Exception as e:
            print(f"[Account] Profile refresh offline: {e}")
            return {'success': False, 'error': f'Could not reach the server: {e}'}

    @_safe
    def app_send_otp(self, email):
        """Request a 6-digit verification email. Stores the OTP cookie for the
        subsequent register call."""
        if not isinstance(email, str) or '@' not in email:
            return {'success': False, 'error': 'Please enter a valid email.'}
        try:
            import requests
            if not getattr(self, '_otp_session', None):
                self._otp_session = requests.Session()
            session = self._otp_session
            resp = session.post(
                f"{API_BASE}/api/send-otp", json={"email": email.strip()}, timeout=10
            )
            data = resp.json()
            if resp.status_code == 200 and data.get('ok'):
                return {'success': True, 'expiresAt': data.get('expiresAt')}
            return {'success': False, 'error': data.get('error') or 'Failed to send the code.'}
        except Exception as e:
            return {'success': False, 'error': f'Could not reach the server: {e}'}

    @_safe
    def app_register(self, name, email, password, code):
        """Register with name + email + password + OTP (verified server-side)."""
        session = getattr(self, '_otp_session', None)
        if not session:
            return {'success': False, 'error': 'Request a verification code first.'}
        try:
            resp = session.post(
                f"{API_BASE}/api/app/auth/register",
                json={'name': name, 'email': email, 'password': password, 'code': code},
                timeout=15,
            )
            data = resp.json()
            if resp.status_code == 200 and data.get('access_token'):
                u = data.get('user', {})
                db.save_session(
                    data['access_token'],
                    data.get('refresh_token'),
                    u.get('id'),
                    u.get('email'),
                    u.get('name'),
                )
                try:
                    sync_trial_start(db, force_refresh=True)
                except Exception as e:
                    print(f"[Trial] Post-login sync failed: {e}")
                return {'success': True, 'user': u}
            return {'success': False, 'error': data.get('error') or 'Registration failed.'}
        except Exception as e:
            return {'success': False, 'error': f'Could not reach the server: {e}'}

    @_safe
    def app_login(self, email, password):
        """Log in with the same email/password used on hirebotai.in."""
        if not isinstance(email, str) or not isinstance(password, str):
            return {'success': False, 'error': 'Please enter your email and password.'}
        try:
            import requests
            resp = requests.post(
                f"{API_BASE}/api/app/auth/login",
                json={"email": email.strip(), "password": password},
                timeout=15,
            )
            data = resp.json()
            if resp.status_code == 200 and data.get('access_token'):
                u = data.get('user', {})
                db.save_session(
                    data['access_token'],
                    data['refresh_token'],
                    u.get('id'),
                    u.get('email'),
                    u.get('name'),
                )
                try:
                    sync_trial_start(db, force_refresh=True)
                except Exception as e:
                    print(f"[Trial] Post-login sync failed: {e}")
                return {'success': True, 'user': u}
            return {'success': False, 'error': data.get('error') or 'Invalid email or password.'}
        except Exception as e:
            return {'success': False, 'error': f'Could not reach the server: {e}'}

    @_safe
    def app_logout(self):
        db.clear_session()
        return {'success': True}

    @_safe
    def app_forgot_password(self, email):
        """Request a 6-digit password-reset email. Stores the reset cookie for
        the subsequent verify/reset calls (same session pattern as OTP)."""
        if not isinstance(email, str) or '@' not in email:
            return {'success': False, 'error': 'Please enter a valid email.'}
        try:
            import requests
            if not getattr(self, '_reset_session', None):
                self._reset_session = requests.Session()
            session = self._reset_session
            resp = session.post(
                f"{API_BASE}/api/forgot-password",
                json={"email": email.strip()},
                timeout=10,
            )
            data = resp.json()
            if resp.status_code == 200 and data.get('ok'):
                return {'success': True, 'expiresAt': data.get('expiresAt')}
            return {'success': False, 'error': data.get('error') or 'Failed to send the reset email.'}
        except Exception as e:
            return {'success': False, 'error': f'Could not reach the server: {e}'}

    @_safe
    def app_verify_reset(self, email, code):
        """Verify the 6-digit reset code (cookie-bound to the reset request)."""
        session = getattr(self, '_reset_session', None)
        if not session:
            return {'success': False, 'error': 'Request a reset code first.'}
        try:
            resp = session.post(
                f"{API_BASE}/api/verify-reset",
                json={"email": email, "code": code},
                timeout=10,
            )
            data = resp.json()
            if resp.status_code == 200 and data.get('ok'):
                return {'success': True}
            return {'success': False, 'error': data.get('error') or 'Invalid or expired reset code.'}
        except Exception as e:
            return {'success': False, 'error': f'Could not reach the server: {e}'}

    @_safe
    def app_reset_password(self, email, password):
        """Set a new password after the reset code was verified."""
        session = getattr(self, '_reset_session', None)
        if not session:
            return {'success': False, 'error': 'Request a reset code first.'}
        try:
            resp = session.post(
                f"{API_BASE}/api/reset-password",
                json={"email": email, "password": password},
                timeout=15,
            )
            data = resp.json()
            if resp.status_code == 200 and data.get('ok'):
                self._reset_session = None
                return {'success': True}
            return {'success': False, 'error': data.get('error') or 'Failed to reset password.'}
        except Exception as e:
            return {'success': False, 'error': f'Could not reach the server: {e}'}

    @_safe
    def app_get_trial(self):
        """Sync the account-bound trial with the server and store it locally.

        On any server failure a fresh device still gets a running 72h timer so
        the dashboard countdown is never blank after login — the server record
        reconciles on the next contact and remains authoritative.
        """
        session = db.get_session()
        if not session or not session.get('access_token'):
            return {'success': False, 'error': 'Not logged in.'}
        try:
            import requests
            token = session['access_token']
            resp = requests.post(
                f"{API_BASE}/api/app/trial",
                json={"hwid": get_device_hwid()},
                headers={"Authorization": f"Bearer {token}"},
                timeout=8,
            )
            if resp.status_code == 401:
                token = self._refresh_session()
                if token:
                    resp = requests.post(
                        f"{API_BASE}/api/app/trial",
                        json={"hwid": get_device_hwid()},
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=8,
                    )
            data = resp.json()
            if resp.status_code == 200 and data.get('success') and data.get('trial_start'):
                ts = int(data['trial_start'])
                db.set_setting('trial_start', ts)
                db.set_setting('license_state', '')
                return {'success': True, 'trial_start': ts}
            # Server answered but refused/errored. Fall through to the local
            # start below so the timer never stays blank on a fresh install.
            print(f"[Account] Trial sync HTTP {resp.status_code}: {data.get('error') or 'unknown'}")
        except Exception as e:
            print(f"[Account] Trial sync offline: {e}")
        # Server unreachable/failed and no local record: start a local 72h trial
        # now. The next successful server sync overwrites this with the real
        # server value, so this can never extend a device that already trialed.
        import time
        trial_start = db.get_setting('trial_start')
        if trial_start:
            return {'success': True, 'trial_start': int(trial_start), 'offline': True}
        ts = int(time.time() * 1000)
        db.set_setting('trial_start', ts)
        db.set_setting('license_state', '')
        print(f"[Account] Starting local trial fallback at {ts}")
        return {'success': True, 'trial_start': ts, 'offline': True}

    @_safe
    def extend_trial(self, hours: int):
        """Extend the free trial by the given number of hours.
        It works by moving the stored trial_start timestamp back in time.
        """
        import time
        if not isinstance(hours, int) or hours <= 0 or hours > 720:
            return {"success": False, "error": "Hours must be between 1 and 720."}
        # Load current start; if missing initialise it now
        trial_start = db.get_setting('trial_start')
        if not trial_start:
            trial_start = int(time.time() * 1000)
        # Subtract the requested hours (converted to ms)
        new_start = trial_start - hours * 60 * 60 * 1000
        db.set_setting('trial_start', new_start)
        # A fresh trial means the "license expired" message no longer applies.
        db.set_setting('license_state', '')
        # Return the new remaining time in hours for feedback
        elapsed = int(time.time() * 1000) - new_start
        remaining_ms = max(0, 3 * 24 * 60 * 60 * 1000 - elapsed)
        remaining_h = remaining_ms // (60 * 60 * 1000)
        return {"success": True, "remaining_hours": remaining_h}

    @_safe
    def open_url(self, url):
        # On Windows use rundll32 FileProtocolHandler so mailto: and https:
        # links reliably open the OS default handler from the packaged
        # (windowed) app, where webbrowser.open can be a no-op.
        if sys.platform == 'win32':
            import subprocess
            try:
                subprocess.Popen(['rundll32', 'url.dll,FileProtocolHandler', url], creationflags=subprocess.CREATE_NO_WINDOW)
                return True
            except Exception as e:
                print(f"[Dashboard] open_url via rundll32 failed ({e}); falling back to webbrowser.")
        import webbrowser
        webbrowser.open(url)
        return True

    @_safe
    def get_app_notice(self):
        """Fetch the server-driven in-app announcement/update banner payload.

        Runs in a background thread (pywebview exposes this over a bridge), so a
        slow/hung network never blocks the dashboard. Returns an empty payload
        on any failure so the UI simply shows no banner.
        """
        import requests
        try:
            url = f"{API_BASE}/api/notice?v={APP_VERSION}"
            resp = requests.get(url, timeout=5)
            if resp.status_code >= 400:
                print(f"[Api] get_app_notice HTTP {resp.status_code}; using local notice.")
                return self._load_local_notice()
            data = resp.json()
            return {
                'success': True,
                'announcement': data.get('announcement'),
                'update': data.get('update'),
                'current_version': APP_VERSION,
            }
        except Exception as e:
            print(f"[Api] get_app_notice failed: {e}")
            # Fall back to the bundled local copy (offline / pre-deploy preview).
            return self._load_local_notice()

    def _load_local_notice(self):
        """Load dashboard/notice.json bundled with the app as a fallback."""
        import json
        try:
            local_path = os.path.join(base_dir(), "dashboard", "notice.json")
            with open(local_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {
                'success': True,
                'announcement': data.get('announcement'),
                'update': data.get('update'),
                'current_version': APP_VERSION,
                'source': 'local',
            }
        except Exception as e:
            print(f"[Api] Local notice fallback failed: {e}")
            return {'success': False, 'error': str(e)}

    @_safe
    def submit_feedback(self, text):
        import requests
        hwid = get_device_hwid()
        license_key = db.get_setting('license_key') or 'Trial'
        acct_email = db.get_setting('acct_email') or 'app-user@hirebotai.in'
        
        payload = {
            'name': 'Hirebotai App User',
            'email': acct_email,
            'subject': 'Bug report from Hirebotai app',
            'message': f"{text}\n\n---\nHWID: {hwid}\nLicense: {license_key}",
            'category': 'bug',
            'app_version': APP_VERSION
        }
        
        try:
            url = f"{API_BASE}/api/feedback"
            resp = requests.post(url, json=payload, timeout=5)
            if resp.status_code >= 400:
                print(f"[Feedback] Server returned {resp.status_code}")
                return {"success": False, "error": f"Server returned HTTP {resp.status_code}"}
            return {"success": True}
        except Exception as e:
            print(f"[Feedback] Network error: {e}")
            return {"success": False, "error": str(e)}

    @_safe
    def factory_reset(self):
        db.factory_reset()
        return True

    def upload_resume(self, slot_index):
        """Open a native file dialog and return the selected file info."""
        file_types = ('PDF Files (*.pdf)', 'Text Files (*.txt)')
        result = window.create_file_dialog(webview.OPEN_DIALOG, file_types=file_types)
        if result and len(result) > 0:
            path = result[0]
            name = os.path.basename(path)
            # Read content
            try:
                if path.endswith('.txt'):
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                else:
                    import pypdf
                    reader = pypdf.PdfReader(path)
                    text_parts = []
                    for page in reader.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text_parts.append(extracted)
                    content = "\n".join(text_parts)
                    if not content.strip():
                        content = f"[Empty or Scanned PDF]: {path}"
                db.set_setting(f'resume_slot_{slot_index}_name', name)
                db.set_setting(f'resume_slot_{slot_index}_content', content)
                if slot_index == 0:
                    db.set_setting('active_resume_slot', 0)
                return {'success': True, 'name': name, 'path': path}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': 'No file selected'}

    def save_resume_file(self, slot_index, name, content, is_pdf=False):
        """Save a resume from JS-supplied file content (TXT text or PDF base64).

        Used by drag-and-drop uploads so the browser never has to trigger a
        second native dialog after the drop."""
        try:
            if is_pdf:
                import base64, io, pypdf
                if content.startswith('data:'):
                    content = content.split(',', 1)[1] if ',' in content else content
                raw = base64.b64decode(content)
                reader = pypdf.PdfReader(io.BytesIO(raw))
                text_parts = []
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text_parts.append(extracted)
                content = "\n".join(text_parts)
                if not content.strip():
                    content = f"[Empty or Scanned PDF]: {name}"
            db.set_setting(f'resume_slot_{slot_index}_name', name)
            db.set_setting(f'resume_slot_{slot_index}_content', content)
            if slot_index == 0:
                db.set_setting('active_resume_slot', 0)
            return {'success': True, 'name': name}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    @_safe
    def get_resume_slots(self):
        slots = []
        for i in range(3):
            name = db.get_setting(f'resume_slot_{i}_name') or None
            content = db.get_setting(f'resume_slot_{i}_content') or ''
            preview = (content[:120] + "...") if len(content) > 120 else content
            slots.append({
                'index': i,
                'name': name,
                'preview': preview,
                'active': db.get_setting('active_resume_slot') == i
            })
        return slots

    def get_resume_content(self, slot_index):
        try:
            return db.get_setting(f'resume_slot_{slot_index}_content') or ''
        except Exception as e:
            print(f"Failed to get resume content: {e}")
            return ''


    @_safe
    def set_active_resume(self, slot_index):
        db.set_setting('active_resume_slot', slot_index)
        return True

    @_safe
    def delete_resume(self, slot_index):
        db.set_setting(f'resume_slot_{slot_index}_name', None)
        db.set_setting(f'resume_slot_{slot_index}_content', None)
        return True

    def create_desktop_shortcut(self):
        """Creates a shortcut/alias pointing to the app."""
        if sys.platform == 'darwin':
            return {'success': _mac_support().create_desktop_shortcut()}
        try:
            import winreg, subprocess
            desktop = os.path.join(os.path.expanduser("~"), "Desktop")
            shortcut_path = os.path.join(desktop, "Hirebotai Dashboard.lnk")
            script_dir = os.path.dirname(os.path.abspath(__file__))

            if getattr(sys, 'frozen', False):
                target_exe = sys.executable
                target_args = ''
                icon_path = os.path.join(base_dir(), "app.ico")
                working_dir = os.path.dirname(sys.executable)
            else:
                target_exe = os.path.join(script_dir, ".venv", "Scripts", "pythonw.exe")
                if not os.path.exists(target_exe):
                    target_exe = sys.executable
                target_args = f'"{os.path.join(script_dir, "dashboard.py")}"'
                icon_path = os.path.join(script_dir, "app.ico")
                working_dir = script_dir

            ps_cmd = f"""
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('{shortcut_path}')
$s.TargetPath = '{target_exe}'
$s.Arguments = '{target_args}'
$s.WorkingDirectory = '{working_dir}'
$s.Description = 'Hirebotai Dashboard'
$s.IconLocation = '{icon_path}'
$s.Save()
"""
            result = subprocess.run(["powershell", "-Command", ps_cmd], capture_output=True, timeout=10, creationflags=0x08000000)
            if result.returncode != 0:
                return {"success": False, "error": (result.stderr or b"").decode(errors="replace").strip() or f"PowerShell exited with code {result.returncode}"}
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_sessions(self, category):
        import sqlite3
        try:
            with sqlite3.connect(DB_FILE, timeout=10) as conn:
                cursor = conn.cursor()
                if category == 'interview':
                    types = ('interview', 'interview_ai', 'interview_candidate')
                elif category == 'screen':
                    types = ('screen', 'ocr')
                elif category == 'practice':
                    types = ('practice', 'practice_ai', 'practice_candidate')
                else:
                    types = ('audio', 'voice')

                placeholders = ','.join(['?'] * len(types))
                stype = {'interview': 'interview', 'screen': 'screen',
                         'practice': 'practice'}.get(category, category)
                # New sessions carry a `type` column; legacy rows (type='') are
                # attributed via their logs so old history keeps working.
                cursor.execute(f'''
                    SELECT s.id, s.start_time, s.end_time, s.scorecard_rating,
                           COUNT(l.id) as log_count
                    FROM sessions s
                    LEFT JOIN logs l ON s.id = l.session_id AND l.type IN ({placeholders})
                    WHERE (s.type = ?) OR (COALESCE(s.type, '') = '' AND EXISTS (
                        SELECT 1 FROM logs m WHERE m.session_id = s.id AND m.type IN ({placeholders})
                    ))
                    GROUP BY s.id
                    ORDER BY s.id DESC LIMIT 40
                ''', types + (stype,) + types)
                rows = cursor.fetchall()
                
                res = []
                for r in rows:
                    sess_id = r[0]
                    start_t = r[1]
                    end_t = r[2]
                    rating = r[3] or 'No Rating'
                    
                    dur = "Active Session"
                    if start_t and end_t:
                        try:
                            from datetime import datetime
                            t1 = datetime.strptime(start_t.split('.')[0], "%Y-%m-%d %H:%M:%S")
                            t2 = datetime.strptime(end_t.split('.')[0], "%Y-%m-%d %H:%M:%S")
                            diff = t2 - t1
                            mins = int(abs(diff.total_seconds()) / 60)
                            dur = f"{mins} min" if mins >= 1 else "1 min"
                        except Exception as e:
                            print(e)
                            dur = "10 min"
                            
                    date_str = start_t or "Session"
                    time_str = "00:00"
                    try:
                        from datetime import datetime
                        if start_t:
                            dt = datetime.strptime(start_t.split('.')[0], "%Y-%m-%d %H:%M:%S")
                            date_str = dt.strftime("%b %d, %Y")
                            time_str = dt.strftime("%H:%M")
                    except Exception as e:
                        date_str = "Session"
                        time_str = "00:00"
                        
                    res.append({
                        'id': sess_id,
                        'date': date_str,
                        'time': time_str,
                        'dur': f"{dur} · Rating: {rating}",
                        'type': category.upper(),
                        'title': f"{date_str} — {category.replace('_',' ').title()} Session",
                        'meta': f"Duration: {dur} | Rating: {rating}",
                        'badge': 'AI Interview' if category == 'interview' else 'Screen Capture' if category == 'screen' else 'Practice Session' if category == 'practice' else 'Audio Transcription'
                    })
                return res
        except Exception as e:
            print(f"get_sessions failed: {e}")
            return []

    def get_session_logs(self, session_id, category=None):
        import sqlite3
        try:
            with sqlite3.connect(DB_FILE, timeout=10) as conn:
                cursor = conn.cursor()
                sql = 'SELECT timestamp, type, question, answer FROM logs WHERE session_id = ?'
                params = [session_id]
                if category:
                    type_sets = {
                        'interview': ('interview', 'interview_ai', 'interview_candidate'),
                        'screen': ('screen', 'ocr'),
                        'practice': ('practice', 'practice_ai', 'practice_candidate'),
                        'audio': ('audio', 'voice'),
                    }
                    types = type_sets.get(category, ())
                    if types:
                        placeholders = ','.join(['?'] * len(types))
                        sql += f' AND type IN ({placeholders})'
                        params.extend(types)
                sql += ' ORDER BY id ASC'
                cursor.execute(sql, params)
                rows = cursor.fetchall()
                
                lines = []
                for r in rows:
                    time_val = r[0]
                    log_type = r[1]
                    q = r[2] or ""
                    ans = r[3] or ""
                    
                    try:
                        t_part = time_val.split(" ")[1].split(".")[0]
                    except:
                        t_part = "00:00:00"
                        
                    if log_type == 'practice':
                        if q == 'Interviewer':
                            lines.append(f"[{t_part}] [Interviewer]: {ans}")
                        else:
                            lines.append(f"[{t_part}] [Candidate]: {ans}")
                    elif log_type in ('interview', 'interview_candidate', 'interview_ai'):
                        if q:
                            lines.append(f"[{t_part}] [Interviewer]: {q}")
                        if ans:
                            lines.append(f"[{t_part}] [Candidate]: {ans}")
                    elif log_type in ('screen', 'ocr'):
                        lines.append(f"[{t_part}] [Screen Capture Solver]:\nQuestion: {q}\nSolution:\n{ans}\n")
                    else:
                        lines.append(f"[{t_part}] [Transcribed Audio]: {q}")
                        
                return "\n".join(lines)
        except Exception as e:
            print(f"get_session_logs failed: {e}")
            return "Failed to load session logs."

    def delete_session(self, session_id):
        try:
            import sqlite3
            with sqlite3.connect(DB_FILE, timeout=10) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM logs WHERE session_id = ?', (session_id,))
                cursor.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
                conn.commit()
            return True
        except Exception as e:
            print(f"delete_session failed: {e}")
            return False

    def end_session(self, session_id):
        try:
            db.end_session(session_id)
            return True
        except Exception as e:
            print(f"end_session failed: {e}")
            return False

    def _parse_json_scorecard(self, raw_res):
        import re
        import json
        
        cleaned = raw_res.strip()
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
                res = {}
                res['score'] = data.get('score') or data.get('rating') or '7.5/10'
                res['rating'] = res['score']
                res['analysis'] = data.get('analysis') or data.get('feedback') or 'Evaluation completed successfully.'
                
                s = _clean_scorecard_items(data.get('strengths') or data.get('good') or [])
                res['strengths'] = s
                res['good'] = "\n".join([f"• {x}" for x in s]) if s else "• Good technical familiarity"
                
                w = _clean_scorecard_items(data.get('weaknesses') or data.get('bad') or [])
                res['weaknesses'] = w
                res['bad'] = "\n".join([f"• {x}" for x in w]) if w else "• Direct answer implementation"
                return res
            except Exception as e:
                print(f"[JSON Parser] Failed JSON match decode: {e}")
                
        if match:
            try:
                fixed = match.group(0).replace("'", '"')
                data = json.loads(fixed)
                res = {}
                res['score'] = data.get('score') or data.get('rating') or '7.5/10'
                res['rating'] = res['score']
                res['analysis'] = data.get('analysis') or data.get('feedback') or 'Evaluation completed successfully.'
                
                s = _clean_scorecard_items(data.get('strengths') or data.get('good') or [])
                res['strengths'] = s
                res['good'] = "\n".join([f"• {x}" for x in s]) if s else "• Good technical familiarity"
                
                w = _clean_scorecard_items(data.get('weaknesses') or data.get('bad') or [])
                res['weaknesses'] = w
                res['bad'] = "\n".join([f"• {x}" for x in w]) if w else "• Direct answer implementation"
                return res
            except:
                pass
                
        score_match = re.search(r'score":\s*"([^"]+)"', raw_res) or re.search(r'rating":\s*"([^"]+)"', raw_res) or re.search(r'(?:score|rating):\s*([^\n]+)', raw_res, re.IGNORECASE)
        analysis_match = re.search(r'analysis":\s*"([^"]+)"', raw_res) or re.search(r'feedback":\s*"([^"]+)"', raw_res) or re.search(r'(?:analysis|feedback):\s*([^\n]+)', raw_res, re.IGNORECASE)

        score = score_match.group(1).strip().replace('"','').replace(',','') if score_match else "7.5/10"
        analysis = analysis_match.group(1).strip().replace('"','').replace(',','') if analysis_match else "Completed session grading."

        # Try to extract strengths/weaknesses from labeled sections first
        strengths = []
        weaknesses = []

        # Look for "Strengths:" or "Strengths" section
        s_match = re.search(r'(?:strengths?|good points?)\s*[:\n](.*?)(?:\n\s*(?:weaknesses?|areas?\s+to\s+improve|bad points?|improvements?)\s*[:\n]|\Z)', raw_res, re.IGNORECASE | re.DOTALL)
        if s_match:
            s_text = s_match.group(1)
            strengths = [x.strip() for x in re.findall(r'(?:•|-|\*|\d\.)\s*([^\n]+)', s_text) if x.strip()]

        # Look for "Weaknesses:" or "Areas to Improve:" section
        w_match = re.search(r'(?:weaknesses?|areas?\s+to\s+improve|bad points?|improvements?)\s*[:\n](.*?)(?:\n\s*(?:strengths?|good points?)\s*[:\n]|\Z)', raw_res, re.IGNORECASE | re.DOTALL)
        if w_match:
            w_text = w_match.group(1)
            weaknesses = [x.strip() for x in re.findall(r'(?:•|-|\*|\d\.)\s*([^\n]+)', w_text) if x.strip()]

        # Fallback: if no labeled sections found, split bullets by midpoint
        if not strengths and not weaknesses:
            bullets = re.findall(r'(?:•|-|\*|\d\.)\s*([^\n]+)', raw_res)
            if bullets:
                mid = len(bullets) // 2
                strengths = bullets[:mid] if mid > 0 else bullets
                weaknesses = bullets[mid:] if mid > 0 else ["Refine response delivery"]
            else:
                strengths = ["Logical coding structure", "Clear communication style", "Demonstrated conceptual familiarity"]
                weaknesses = ["Detail implementation depth", "Explain design trade-offs", "Refining answer structure"]

        strengths = _clean_scorecard_items(strengths)
        weaknesses = _clean_scorecard_items(weaknesses)
        if not strengths:
            strengths = ["Logical coding structure", "Clear communication style", "Demonstrated conceptual familiarity"]
        if not weaknesses:
            weaknesses = ["Detail implementation depth", "Explain design trade-offs", "Refining answer structure"]

        return {
            "score": score,
            "rating": score,
            "analysis": analysis,
            "strengths": strengths[:3],
            "weaknesses": weaknesses[:3],
            "good": "\n".join([f"• {x}" for x in strengths[:3]]),
            "bad": "\n".join([f"• {x}" for x in weaknesses[:3]])
        }

    def generate_scorecard_from_history(self, session_id):
        logs = self.get_session_logs(session_id)
        if not logs or "Failed to load" in logs:
            return {"success": False, "error": "No logs found"}
            
        sys_prompt = "You are an expert technical interviewer. Evaluate the session logs and return an evaluation report."
        user_prompt = f"Logs:\n{logs}\n\nProvide overall score, strengths, and weaknesses. " \
                      f"Format your output strictly as a JSON with keys: 'rating' (e.g. '8.0/10'), 'analysis' (brief paragraph), " \
                      f"'strengths' (array of 3 brief string points), 'weaknesses' (array of 3 brief string points). " \
                      f"If you cannot output JSON, include clearly labeled sections: 'Strengths:' and 'Weaknesses:' with bullet points. " \
                      f"Only output the evaluation, no extra text."
                      
        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        raw_res = self._query_ai(messages)
        report = self._parse_json_scorecard(raw_res)
        
        try:
            import sqlite3
            with sqlite3.connect(DB_FILE, timeout=10) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE sessions 
                    SET scorecard_rating = ?, scorecard_good = ?, scorecard_bad = ? 
                    WHERE id = ?
                ''', (report['rating'], report['good'], report['bad'], session_id))
                conn.commit()
            return {"success": True, "rating": report['rating'], "good": report['good'], "bad": report['bad']}
        except Exception as e:
            print(f"Failed to generate scorecard: {e}")
            return {"success": False, "error": str(e)}

    def export_session_transcript(self, session_id):
        import sqlite3
        try:
            with sqlite3.connect(DB_FILE, timeout=10) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT type, question, answer 
                    FROM logs 
                    WHERE session_id = ? 
                    ORDER BY id ASC
                ''', (session_id,))
                rows = cursor.fetchall()
            
            if not rows:
                return False
                
            save_path = window.create_file_dialog(
                dialog_type=webview.SAVE_DIALOG,
                file_types=('PDF documents (*.pdf)', 'All files (*.*)'),
                save_filename=f"session_{session_id}_transcript.pdf"
            )
            if not save_path:
                return False
                
            if isinstance(save_path, (list, tuple)):
                save_path = save_path[0]
                
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            
            doc = SimpleDocTemplate(
                save_path, pagesize=letter,
                rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54
            )
            story = []
            styles = getSampleStyleSheet()
            
            title_style = ParagraphStyle(
                'DocTitle',
                parent=styles['Heading1'],
                fontSize=20,
                leading=24,
                textColor=colors.HexColor('#6D28D9'),
                spaceAfter=20
            )
            
            question_style = ParagraphStyle(
                'InterviewerQuestion',
                parent=styles['BodyText'],
                fontSize=11,
                leading=16,
                textColor=colors.HexColor('#27272A'),
                spaceAfter=8,
                leftIndent=10
            )
            
            answer_style = ParagraphStyle(
                'CandidateAnswer',
                parent=styles['BodyText'],
                fontSize=11,
                leading=16,
                textColor=colors.HexColor('#27272A'),
                spaceAfter=15,
                leftIndent=20
            )
            
            section_title_style = ParagraphStyle(
                'SectionTitle',
                parent=styles['Heading2'],
                fontSize=13,
                leading=17,
                textColor=colors.HexColor('#374151'),
                spaceAfter=10,
                spaceBefore=15
            )
            
            story.append(Paragraph(f"Hirebotai Interview Transcript — Session #{session_id}", title_style))
            story.append(Spacer(1, 10))
            
            for log_type, q, ans in rows:
                q = q or ""
                ans = ans or ""
                
                # HTML entity escape helpers for ReportLab Paragraphs
                def pdf_escape(text):
                    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                
                if log_type == 'practice':
                    if q == 'Interviewer':
                        story.append(Paragraph(f"<b><font color='#DC2626'>Interviewer:</font></b> {pdf_escape(ans)}", question_style))
                    else:
                        story.append(Paragraph(f"<b><font color='#16A34A'>Candidate:</font></b> {pdf_escape(ans)}", answer_style))
                        
                elif log_type in ('interview', 'interview_candidate', 'interview_ai'):
                    if q:
                        story.append(Paragraph(f"<b><font color='#DC2626'>Interviewer Question:</font></b> {pdf_escape(q)}", question_style))
                    if ans:
                        story.append(Paragraph(f"<b><font color='#16A34A'>Suggested Answer:</font></b> {pdf_escape(ans)}", answer_style))
                        
                elif log_type in ('screen', 'ocr'):
                    story.append(Paragraph(f"<b>[Screen Solver Capture]</b>", section_title_style))
                    if q:
                        story.append(Paragraph(f"<b><font color='#DC2626'>Question:</font></b> {pdf_escape(q)}", question_style))
                    if ans:
                        formatted_ans = pdf_escape(ans).replace('\n', '<br/>').replace(' ', '&nbsp;')
                        story.append(Paragraph(f"<b><font color='#16A34A'>Solution:</font></b><br/>{formatted_ans}", answer_style))
            
            doc.build(story)
            return True
        except Exception as e:
            print(f"Failed to export PDF transcript: {e}")
            return False

    def set_practice_security(self, enable):
        try:
            if enable:
                if not self.is_fullscreen:
                    window.toggle_fullscreen()
                    self.is_fullscreen = True
            else:
                if self.is_fullscreen:
                    window.toggle_fullscreen()
                    self.is_fullscreen = False
            return True
        except Exception as e:
            print(f"Failed to set practice security: {e}")
            return False

    def start_new_session_from_js(self):
        try:
            return db.start_new_session('practice')
        except Exception as e:
            print(f"Failed to start JS session: {e}")
            return None

    def log_practice_interaction(self, session_id, role, text):
        try:
            db.log_interaction(session_id, 'practice', 'Interviewer' if role == 'interview_ai' else 'User Response', text)
            return True
        except Exception as e:
            print(f"Failed to log JS practice interaction: {e}")
            return False

    def save_practice_scorecard(self, session_id, score, analysis, strengths_json, weaknesses_json):
        try:
            import sqlite3
            from datetime import datetime
            with sqlite3.connect(DB_FILE, timeout=10) as conn:
                cursor = conn.cursor()
                import json
                s_arr = json.loads(strengths_json)
                w_arr = json.loads(weaknesses_json)
                good_text = "\n".join([f"• {x}" for x in s_arr])
                bad_text = f"{analysis}\n\nAreas to Improve:\n" + "\n".join([f"• {x}" for x in w_arr])
                
                cursor.execute('''
                    UPDATE sessions 
                    SET scorecard_rating = ?, scorecard_good = ?, scorecard_bad = ?, end_time = ?
                    WHERE id = ?
                ''', (score, good_text, bad_text, str(datetime.now()), session_id))
                conn.commit()
            return True
        except Exception as e:
            print(f"Failed to save practice scorecard: {e}")
            return False

    def _query_ai(self, messages, task=ai_config.TASK_PRACTICE_FEEDBACK):
        """Send a prompt via the shared task-aware router.

        Defaults to PRACTICE_FEEDBACK routing (Groq FAST → Gemini FAST →
        OpenRouter emergency). Interview question generation passes INTERVIEW.
        """
        import requests
        groq_key = db.get_setting('groq_api_key') or ''
        or_key = db.get_setting('openrouter_api_key') or ''
        gemini_key = db.get_setting('gemini_api_key') or ''

        if not groq_key.strip() and not or_key.strip() and not gemini_key.strip():
            return "API Keys are not configured. Please go to the Settings tab to save your Groq, OpenRouter or Gemini key."

        prompt = "\n\n".join([
            (f"[SYSTEM] {m['content']}" if m.get('role') == 'system' else
             f"[ASSISTANT] {m['content']}" if m.get('role') == 'assistant' else
             f"[USER] {m['content']}")
            for m in messages if isinstance(m, dict) and m.get('content')
        ])

        keys = {"groq": groq_key, "openrouter": or_key, "gemini": gemini_key}
        routed = ai_config.route_request(
            keys=keys,
            task=task,
            prompt=prompt,
            image_bytes=None,
            history=None,
            skip_history=True,
            difficulty="",
            max_tokens=600,
            allow_cache=False,
            cache_key_val=None,
        )
        text = routed.get("text") or ""
        if text:
            return text
        category = routed.get("error_category") or "unknown"
        return f"API Request failed (all providers, error: {category}). Check your keys in Settings."

    def get_interview_response(self, category, difficulty, history, use_resume):
        if not isinstance(history, list):
            history = []
        active_resume_text = ""
        if use_resume:
            slots = self.get_resume_slots()
            active_slot = next((s for s in slots if s['active']), None)
            if active_slot and active_slot['name']:
                active_resume_text = db.get_setting(f"resume_slot_{active_slot['index']}_content") or ""
        
        sys_prompt = f"You are Hirebotai, a professional tech interviewer conducting a live mock interview. " \
                     f"The interview topic is: {category}. Match your questions to this difficulty level: {difficulty}. " \
                     f"Speak exactly like a real human interviewer would in a real conversation.\n" \
                     f"HARD RULES:\n" \
                     f"- Ask exactly ONE question at a time.\n" \
                     f"- NEVER write any metadata, labels, numbering, headings, category names or difficulty tags " \
                     f"(no 'Question 1', no 'Question 1 of 5', no 'Python / Medium', no '[SYSTEM]'). Output ONLY the question itself.\n" \
                     f"- Keep each question to 1-3 short, natural spoken sentences, phrased conversationally " \
                     f"(e.g. 'Can you walk me through how you would approach that?' — not 'Explain the concept of X').\n" \
                     f"- React naturally: if the candidate just answered, ask a short follow-up that builds on what they said. " \
                     f"Keep your responses concise, clear, and ask exactly one question at a time. "
        if active_resume_text:
            sys_prompt += f"\nHere is the candidate's resume context to tailor your questions: {active_resume_text}\n"
            
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in history:
            if not isinstance(msg, dict):
                continue
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            messages.append({"role": role, "content": content})
            
        return self._query_ai(messages, task=ai_config.TASK_INTERVIEW)

    def test_api_key(self, provider):
        """Verify a stored API key by hitting the provider's public endpoint."""
        import requests
        provider = provider.strip().lower()
        key_name = {
            'groq': 'groq_api_key',
            'openrouter': 'openrouter_api_key',
            'gemini': 'gemini_api_key',
        }.get(provider)
        if not key_name:
            return {'success': False, 'error': 'Unknown provider'}

        key = (db.get_setting(key_name) or '').strip()
        if not key:
            return {'success': False, 'error': 'No API key saved for this provider'}

        try:
            if provider == 'gemini':
                url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
                headers = {}
            elif provider == 'groq':
                url = "https://api.groq.com/openai/v1/models"
                headers = {"Authorization": f"Bearer {key}"}
            else:
                url = "https://openrouter.ai/api/v1/models"
                headers = {"Authorization": f"Bearer {key}"}

            resp = requests.get(url, headers=headers, timeout=15)
            if resp.status_code == 200:
                return {'success': True}
            return {'success': False, 'error': f"HTTP {resp.status_code}: {resp.text[:150]}"}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def start_practice_stt(self):
        """Start continuous speech recognition for practice answer input.

        Streams live 'partial' transcripts back to the JS side every ~1.5s so
        the user sees their words appear AS they speak. It keeps listening for
        the ENTIRE time the button is active (no auto-finalize on silence), so
        a long answer is never split into pieces. The clean final transcript is
        produced only when the user presses Stop.
        """
        try:
            if not HAS_AUDIO:
                return {'success': False, 'error': 'Audio libraries not available'}
            import speech_recognition as sr
            import soundcard as sc
            import numpy as np
            import threading
            import queue
            import warnings
            import concurrent.futures

            if hasattr(self, '_practice_stt_thread') and self._practice_stt_thread and self._practice_stt_thread.is_alive():
                return {'success': True}

            self._practice_stt_queue = queue.Queue()
            self._practice_stt_stop = threading.Event()
            self._practice_stt_buffer = np.zeros(0, dtype=np.float32)
            self._practice_stt_lock = threading.Lock()
            self._practice_stt_transcribing = False

            # The OS drops a few frames when a slow task holds up the recording
            # loop; we transcribe off-thread so the mic is drained continuously.
            warnings.filterwarnings("ignore", message="data discontinuity in recording")

            def stt_loop():
                try:
                    sample_rate = 16000
                    chunk_duration = 0.5
                    chunk_frames = int(sample_rate * chunk_duration)

                    # Prefer a real input mic. On some systems the "default
                    # microphone" is a loopback / stereo-mix device that also
                    # captures the interviewer's TTS played out the speakers,
                    # which pollutes the candidate's answer. all_microphones()
                    # (without include_loopback) lists only genuine inputs.
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
                        self._practice_stt_queue.put(('error', 'No microphone found'))
                        return
                    print(f"[Practice STT] Mic bound to: {mic.name}")

                    recognizer = sr.Recognizer()
                    recognizer.energy_threshold = 300
                    recognizer.dynamic_energy_threshold = True
                    recognizer.pause_threshold = 0.8

                    with mic.recorder(samplerate=sample_rate, blocksize=chunk_frames) as recorder:
                        chunk_count = 0
                        window_peak = 0.0
                        # Single worker keeps transcriptions in order while the
                        # recording loop above keeps draining audio non-blocking.
                        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                            while not self._practice_stt_stop.is_set():
                                try:
                                    audio_chunk = recorder.record(numframes=chunk_frames)
                                    if self._practice_stt_stop.is_set():
                                        break
                                    if audio_chunk.size == 0:
                                        continue

                                    chunk_mono = audio_chunk[:, 0] if len(audio_chunk.shape) > 1 and audio_chunk.shape[1] > 1 else audio_chunk.flatten()

                                    # Accumulate continuously — NEVER auto-finalize
                                    # on silence; the answer stays whole until Stop.
                                    with self._practice_stt_lock:
                                        self._practice_stt_buffer = np.concatenate((self._practice_stt_buffer, chunk_mono))
                                    window_peak = max(window_peak, float(np.max(np.abs(chunk_mono))))
                                    chunk_count += 1

                                    # Stream a partial transcript every ~2.5s so
                                    # the user sees their words live. Skip when
                                    # the window had no real speech or another
                                    # partial is still transcribing.
                                    if chunk_count % 5 == 0 and window_peak > 0.03:
                                        window_peak = 0.0
                                        with self._practice_stt_lock:
                                            if self._practice_stt_transcribing:
                                                continue
                                            self._practice_stt_transcribing = True
                                            data = _trim_silence(self._practice_stt_buffer, np)
                                            q = self._practice_stt_queue
                                        executor.submit(self._practice_transcribe, data, recognizer, True, q)

                                except Exception as e:
                                    if not self._practice_stt_stop.is_set():
                                        self._practice_stt_queue.put(('error', str(e)))
                                    break
                except Exception as e:
                    self._practice_stt_queue.put(('error', f'STT loop error: {e}'))

            self._practice_stt_thread = threading.Thread(target=stt_loop, daemon=True)
            self._practice_stt_thread.start()
            return {'success': True}
        except Exception as e:
            print(f"[Practice STT] Start failed: {e}")
            return {'success': False, 'error': str(e)}

    def _practice_transcribe(self, audio_data, recognizer, partial=False, queue=None):
        """Transcribe audio on a background worker.

        For live partial previews (`partial=True`), uses free Google Speech Recognition
        directly to ensure ZERO paid API usage during live candidate speech.
        For final answer transcription (`partial=False`), uses transcribe_audio with
        Groq Whisper fallback if Google STT fails.
        """
        q = queue if queue is not None else self._practice_stt_queue
        text = None
        try:
            if partial:
                # Streaming preview: ONLY use free Google STT to prevent any Groq Whisper API calls
                try:
                    text = recognizer.recognize_google(audio_data)
                except Exception:
                    text = None
            else:
                # Final answer: try Google STT primary, Groq Whisper fallback if needed
                keys = {
                    "groq": db.get_setting('groq_api_key') or '',
                    "openrouter": db.get_setting('openrouter_api_key') or '',
                    "gemini": db.get_setting('gemini_api_key') or '',
                }
                text, _stt_provider = ai_config.transcribe_audio(keys, audio_data)
                if not text:
                    try:
                        text = recognizer.recognize_google(audio_data)
                    except Exception:
                        text = None
        except Exception as e:
            # UnknownValueError just means no clear speech was captured —
            # expected for silence, not a real failure.
            if type(e).__name__ == 'UnknownValueError':
                return
            q.put(('error', f'Recognition error: {e}'))
            return
        finally:
            # Allow the next streaming partial to start.
            if hasattr(self, '_practice_stt_lock') and hasattr(self, '_practice_stt_transcribing'):
                try:
                    with self._practice_stt_lock:
                        self._practice_stt_transcribing = False
                except Exception:
                    pass
        if text and text.strip():
            q.put(('partial' if partial else 'final', text.strip()))


    def stop_practice_stt(self, transcribe_final=True):
        """Stop speech recognition.

        With `transcribe_final=True` (Stop button) the whole buffered answer is
        transcribed once more and returned as the clean final text. With
        `transcribe_final=False` (quitting / navigating away) it just stops the
        mic thread immediately and drops the audio.
        """
        final_text = ""
        try:
            if hasattr(self, '_practice_stt_stop'):
                self._practice_stt_stop.set()
            if hasattr(self, '_practice_stt_thread') and self._practice_stt_thread:
                self._practice_stt_thread.join(timeout=(5.0 if transcribe_final else 1.0))

            if transcribe_final and hasattr(self, '_practice_stt_buffer') and len(self._practice_stt_buffer) > 0:
                import speech_recognition as sr
                import numpy as np
                buf = _trim_silence(self._practice_stt_buffer, np)
                if len(buf) > 0 and float(np.max(np.abs(buf))) > 0.03:
                    audio_int16 = (buf * 32767).astype(np.int16)
                    audio_data = sr.AudioData(audio_int16.tobytes(), 16000, 2)
                    recognizer = sr.Recognizer()
                    text = None
                    try:
                        keys = {
                            "groq": db.get_setting('groq_api_key') or '',
                            "openrouter": db.get_setting('openrouter_api_key') or '',
                            "gemini": db.get_setting('gemini_api_key') or '',
                        }
                        text, _stt_provider = ai_config.transcribe_audio(keys, audio_data)
                        if not text:
                            text = recognizer.recognize_google(audio_data)
                    except Exception as e:
                        if type(e).__name__ != 'UnknownValueError':
                            print(f"[Practice STT] Final transcription error: {e}")
                    if text and text.strip():
                        final_text = text.strip()
                        self._practice_stt_queue.put(('final', final_text))
            return {'success': True, 'final': final_text}
        except Exception as e:
            print(f"[Practice STT] Stop failed: {e}")
            return {'success': False, 'error': str(e), 'final': final_text}

    def get_practice_stt_results(self):
        """Drain and return any streaming transcripts since last call."""
        try:
            results = []
            if hasattr(self, '_practice_stt_queue'):
                while not self._practice_stt_queue.empty():
                    typ, text = self._practice_stt_queue.get_nowait()
                    if typ in ('partial', 'final'):
                        results.append(text)
            return {'success': True, 'results': results}
        except Exception as e:
            print(f"[Practice STT] Get results failed: {e}")
            return {'success': False, 'error': str(e)}

    def get_practice_report(self, history):
        if not isinstance(history, list):
            history = []
        sys_prompt = "You are an expert tech recruiter. Analyze the mock interview transcript history and provide a JSON performance report."
        log_lines = []
        for m in history:
            if not isinstance(m, dict):
                continue
            role = m.get('role', 'user')
            content = m.get('content', '')
            log_lines.append(f"{role.upper()}: {content}")
        log_content = "\n".join(log_lines)
        
        user_prompt = f"Here is the interview log:\n{log_content}\n\n" \
                      f"Evaluate the candidate's response quality, structure, and communication. " \
                      f"Return a JSON object containing keys: 'score' (a string score out of 10, e.g., '7.5/10'), " \
                      f"'analysis' (a brief paragraph of review), 'strengths' (array of 3 brief string points), " \
                      f"and 'weaknesses' (array of 3 brief string points of improvements). " \
                      f"If you cannot output JSON, include clearly labeled sections: 'Strengths:' and 'Weaknesses:' with bullet points. " \
                      f"Do not write any other text or markdown block formatting. Only output the evaluation."
                      
        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        raw_res = self._query_ai(messages)
        return self._parse_json_scorecard(raw_res)


def _clean_scorecard_items(items):
    """Normalize scorecard strength/weakness entries so the results screen
    renders clean single-line items. Handles bullet/markdown/numbered prefixes
    and multi-line strings from the AI."""
    import re
    out = []
    if isinstance(items, str):
        items = items.split('\n')
    for it in (items or []):
        if not isinstance(it, str):
            it = str(it)
        it = re.sub(r'^[\s\-•*0-9.)]+', '', it.strip()).strip()
        it = it.replace('**', '').replace('`', '').strip()
        if it:
            out.append(it)
    return out


def _spawn_engine():
    """Launch ONLY the background stealth engine (no dashboard window)."""
    import subprocess
    import copy
    cmd = engine_launch_command()
    env = copy.deepcopy(os.environ)
    env.pop('_MEIPASS2', None)
    env.pop('_MEIPASS', None)
    safe_cwd = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else None
    if sys.platform == 'win32':
        subprocess.Popen(cmd, env=env, cwd=safe_cwd, creationflags=subprocess.CREATE_NO_WINDOW)
    else:
        subprocess.Popen(cmd, env=env, cwd=safe_cwd)
    print(f"[Engine] Launched background engine: {cmd}")
    return True


def _engine_allowed():
    """Shared access gate for engine launches: logged-in AND (licensed OR trial active)."""
    if not db.is_logged_in():
        return False
    try:
        # License re-validated server-side (cached 12h); expired/revoked keys are
        # cleared and fall through to the trial check.
        is_licensed = maybe_verify_license(db)
        trial_start = db.get_setting('trial_start')
        if not trial_start:
            trial_start = sync_trial_start(db)
        trial_expired = False
        if trial_start:
            import time
            elapsed = int(time.time() * 1000) - int(trial_start)
            if elapsed >= TRIAL_LIMIT_MS:
                trial_expired = True
        return is_licensed or not trial_expired
    except Exception as e:
        print(f"[Engine] Access check error: {e}")
        return False


def _relaunch_engine():
    """Start ONLY the background engine if access allows and it isn't running."""
    if engine_is_running():
        print("[Engine] Already running — skipping relaunch.")
        return
    if not _engine_allowed():
        print("[Engine] Not allowed (login/trial/license) — skipping relaunch.")
        return
    # Set master power to True so it starts up successfully
    db.set_setting('master_power', True)
    _spawn_engine()


def start_dashboard_hotkey_listener():
    """Global listener inside the dashboard process: Alt+O relaunches the engine
    while the dashboard window is open."""
    try:
        from pynput import keyboard
        from database import parse_hotkey_combo
        
        pressed = set()
        state = {'alt': False, 'ctrl': False, 'shift': False, 'meta': False}
        
        def _key_char(key):
            if hasattr(key, 'char') and key.char:
                return key.char.lower()
            vk = getattr(key, 'vk', None)
            if isinstance(vk, int) and 0x41 <= vk <= 0x5A:
                return chr(vk).lower()
            if isinstance(vk, int) and 0x30 <= vk <= 0x39:
                return chr(vk)
            return None
        
        def set_mod(key, value):
            if key in [keyboard.Key.alt, keyboard.Key.alt_l, keyboard.Key.alt_r, keyboard.Key.alt_gr]:
                state['alt'] = value
            elif key in [keyboard.Key.ctrl, keyboard.Key.ctrl_l, keyboard.Key.ctrl_r]:
                state['ctrl'] = value
            elif key in [keyboard.Key.shift, keyboard.Key.shift_l, keyboard.Key.shift_r]:
                state['shift'] = value
            elif key in [keyboard.Key.cmd, keyboard.Key.cmd_l, keyboard.Key.cmd_r]:
                state['meta'] = value

        def matches(cfg):
            if not cfg:
                return False
            mods, main = cfg
            if ('alt' in mods) != state['alt']:
                return False
            if ('ctrl' in mods) != state['ctrl']:
                return False
            if ('shift' in mods) != state['shift']:
                return False
            if ('meta' in mods) != state['meta']:
                return False
            return isinstance(main, str) and main in pressed

        def on_press(key):
            set_mod(key, True)
            main_key = _key_char(key)
            if main_key:
                pressed.add(main_key)
            cfg = parse_hotkey_combo(db.get_setting('hotkey_silent') or '<alt>+o')
            if matches(cfg):
                _relaunch_engine()
        
        def on_release(key):
            set_mod(key, False)
            if hasattr(key, 'char') and key.char:
                char_lower = key.char.lower()
                if char_lower in pressed:
                    pressed.remove(char_lower)
                    
        listener = keyboard.Listener(on_press=on_press, on_release=on_release)
        listener.daemon = True
        listener.start()
        print("[Dashboard] Global Hotkey Listener active.")
    except Exception as e:
        print(f"[Dashboard] Failed to start listener: {e}")


def spawn_relauncher():
    """Ensure the persistent relaunch listener process is running (single instance).

    It keeps the silent-hotkey relaunch working even after the dashboard window is
    closed, and it only ever starts the engine — never the dashboard.
    """
    import subprocess
    lock_path = os.path.join(DATA_DIR, "relaunch.lock")
    try:
        if os.path.exists(lock_path):
            with open(lock_path, "r") as f:
                pid_str = f.read().strip()
            if _pid_alive(pid_str):
                return
            try:
                os.remove(lock_path)
            except Exception:
                pass
        if getattr(sys, 'frozen', False):
            cmd = [sys.executable, '--relaunch']
            cwd = os.path.dirname(sys.executable)
        else:
            cmd = [sys.executable, os.path.abspath(__file__), '--relaunch']
            cwd = os.path.dirname(os.path.abspath(__file__))
        if sys.platform == 'win32':
            subprocess.Popen(cmd, cwd=cwd, creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            subprocess.Popen(cmd, cwd=cwd)
        print("[Dashboard] Persistent relaunch listener spawned.")
    except Exception as e:
        print(f"[Dashboard] Failed to spawn relaunch listener: {e}")


def run_relauncher():
    """Persistent background process (--relaunch).

    Listens for the configured Silent hotkey (Alt+O by default) and restarts ONLY
    the stealth engine. Its hotkey listener is enabled only while the dashboard is
    closed, so the two never double-fire. Stays alive across dashboard close.
    """
    import time
    try:
        from pynput import keyboard
        from database import parse_hotkey_combo
    except Exception as e:
        print(f"[Relauncher] Import error: {e}")
        return

    # Single-instance guard for the relauncher itself.
    lock_path = os.path.join(DATA_DIR, "relaunch.lock")
    try:
        lock_fh = open(lock_path, "a+")
        if sys.platform == 'win32':
            import msvcrt
            try:
                msvcrt.locking(lock_fh.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                print("[Relauncher] Already running.")
                return
        else:
            import fcntl
            try:
                fcntl.flock(lock_fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                print("[Relauncher] Already running.")
                return
        lock_fh.seek(0)
        lock_fh.truncate()
        lock_fh.write(str(os.getpid()))
        lock_fh.flush()
    except SystemExit:
        raise
    except Exception as e:
        print(f"[Relauncher] Could not acquire lock: {e}")

    pressed = set()
    state = {'alt': False, 'ctrl': False, 'shift': False, 'meta': False}
    _cfg_cache = {'raw': None, 'ts': 0.0}

    def get_cfg():
        now = time.time()
        if _cfg_cache['raw'] is not None and (now - _cfg_cache['ts']) < 2.0:
            return _cfg_cache['raw']
        cfg = parse_hotkey_combo(db.get_setting('hotkey_silent') or '<alt>+o')
        _cfg_cache['raw'] = cfg
        _cfg_cache['ts'] = now
        return cfg

    def matches(cfg):
        if not cfg:
            return False
        mods, main = cfg
        if ('alt' in mods) != state['alt']:
            return False
        if ('ctrl' in mods) != state['ctrl']:
            return False
        if ('shift' in mods) != state['shift']:
            return False
        if ('meta' in mods) != state['meta']:
            return False
        return isinstance(main, str) and main in pressed

    def set_mod(key, value):
        if key in [keyboard.Key.alt, keyboard.Key.alt_l, keyboard.Key.alt_r, keyboard.Key.alt_gr]:
            state['alt'] = value
        elif key in [keyboard.Key.ctrl, keyboard.Key.ctrl_l, keyboard.Key.ctrl_r]:
            state['ctrl'] = value
        elif key in [keyboard.Key.shift, keyboard.Key.shift_l, keyboard.Key.shift_r]:
            state['shift'] = value
        elif key in [keyboard.Key.cmd, keyboard.Key.cmd_l, keyboard.Key.cmd_r]:
            state['meta'] = value

    def on_press(key):
        set_mod(key, True)
        if hasattr(key, 'char') and key.char:
            pressed.add(key.char.lower())
        # The dashboard handles the relaunch while it is open.
        if dashboard_is_running():
            return
        if not matches(get_cfg()):
            return
        # De-bounce key auto-repeat while the main key is held down.
        if getattr(on_press, 'last_fired', 0) + 1.5 > time.time():
            return
        on_press.last_fired = time.time()
        print("[Relauncher] Silent hotkey pressed — starting engine only.")
        _relaunch_engine()

    def on_release(key):
        set_mod(key, False)
        if hasattr(key, 'char') and key.char:
            char_lower = key.char.lower()
            if char_lower in pressed:
                pressed.remove(char_lower)

    listener = None
    print("[Relauncher] Running (idle while dashboard is open).")
    while True:
        if dashboard_is_running():
            if listener is not None:
                listener.stop()
                listener = None
                print("[Relauncher] Listener idle (dashboard open).")
        else:
            if listener is None:
                listener = keyboard.Listener(on_press=on_press, on_release=on_release)
                listener.daemon = True
                listener.start()
                print("[Relauncher] Listener active (dashboard closed).")
        time.sleep(2)



def ensure_desktop_shortcut():
    """Create a Desktop shortcut on first run so the app is easy to launch.

    The Inno Setup installer already creates Start Menu + Desktop shortcuts,
    so this is a fallback for users who run the raw exe directly. Runs once.
    """
    if not getattr(sys, 'frozen', False):
        return
    if db.get_setting('desktop_shortcut_created'):
        return

    import subprocess

    exe_path = sys.executable
    desktop_candidates = []
    try:
        desktop_candidates.append(os.path.join(os.path.expanduser('~'), 'Desktop'))
    except Exception:
        pass
    try:
        onedrive = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Desktop')
        if os.path.isdir(onedrive):
            desktop_candidates.append(onedrive)
    except Exception:
        pass

    link_path = None
    for d in desktop_candidates:
        candidate = os.path.join(d, 'Hirebotai.lnk')
        if os.path.exists(candidate):
            db.set_setting('desktop_shortcut_created', '1')
            return
        if link_path is None and os.path.isdir(d):
            link_path = candidate

    if not link_path:
        return

    exe_dir = os.path.dirname(exe_path)
    ps = (
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut("
        f"'{link_path}');"
        f"$s.TargetPath='{exe_path}';"
        f"$s.WorkingDirectory='{exe_dir}';"
        f"$s.IconLocation='{exe_path},0';"
        "$s.Save()"
    )
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps],
            timeout=30,
            capture_output=True,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        db.set_setting('desktop_shortcut_created', '1')
        print(f"[Dashboard] Desktop shortcut created: {link_path}")
    except Exception as e:
        print(f"[Dashboard] Failed to create desktop shortcut: {e}")


def fire_mac_permission_prompt():
    """Show the Screen Recording prompt at dashboard launch (macOS only).

    Called once the dashboard window is on screen and foreground, so the system
    dialog appears BEFORE an exam instead of popping mid-exam on the first Alt+S.
    """
    if sys.platform != 'darwin':
        return
    mac = _mac_support()
    if not mac.has_screen_capture_permission():
        print("[Dashboard] macOS: Screen Recording permission missing - firing prompt now (before exam).")
        mac.request_screen_capture_permission()


def main():
    global window

    # Single-instance guard: if another dashboard is already open, bring it to
    # the foreground and exit instead of stacking a second window (this is what
    # made desktop-shortcut launches spawn one new instance per click).
    if dashboard_is_running():
        print("[Dashboard] Another instance is running — focusing it and exiting.")
        lock_path = os.path.join(DATA_DIR, "dashboard.lock")
        pid_str = None
        try:
            with open(lock_path, "r") as f:
                pid_str = f.read().strip()
        except Exception:
            pass
        focus_existing_dashboard(pid_str)
        return

    # Write our own instance lock so later shortcut launches can focus us.
    import atexit
    dashboard_lock_path = os.path.join(DATA_DIR, "dashboard.lock")
    try:
        with open(dashboard_lock_path, "w") as _f:
            _f.write(str(os.getpid()))
    except Exception as e:
        print(f"[Dashboard] Could not write instance lock: {e}")

    def _remove_dashboard_lock():
        try:
            if os.path.exists(dashboard_lock_path):
                os.remove(dashboard_lock_path)
        except Exception:
            pass
    atexit.register(_remove_dashboard_lock)

    # Configure auto-start registry entry
    auto_start = db.get_setting('auto_start')
    if auto_start is None:
        auto_start = True
    set_startup(auto_start)

    # First run: make sure the app is reachable from the Desktop even when the
    # raw exe was used instead of the installer.
    ensure_desktop_shortcut()

    # Start dashboard-level hotkey listener to enable Alt+O relaunching
    start_dashboard_hotkey_listener()

    # Ensure the persistent relaunch listener is running so Alt+O still relaunches
    # the engine after the dashboard window is closed (idempotent via relaunch.lock).
    spawn_relauncher()
    
    # Launch main.py engine silently in the background on startup if master_power
    # is enabled, the account is logged in, and trial/license is active.
    master_power = db.get_setting('master_power')
    if master_power is None:
        master_power = True

    if not db.is_logged_in():
        print("[Startup] No account session — waiting for login before starting the engine.")
        is_allowed = False
    else:
        # License is re-validated server-side (cached 12h); expired/revoked
        # keys are cleared and fall through to the trial check.
        is_licensed = maybe_verify_license(db)

        trial_start = db.get_setting('trial_start')
        if not trial_start:
            trial_start = sync_trial_start(db)
        trial_expired = False
        if trial_start:
            import time
            elapsed = int(time.time() * 1000) - int(trial_start)
            if elapsed >= TRIAL_LIMIT_MS:
                trial_expired = True

        is_allowed = is_licensed or not trial_expired

    if master_power and is_allowed:
        try:
            import subprocess
            import atexit
            import copy
            
            cmd = engine_launch_command()
            
            # Strip PyInstaller env vars so the child creates its own temp folder 
            # instead of locking ours (which causes "failed to remove temporary directory" on exit)
            env = copy.deepcopy(os.environ)
            env.pop('_MEIPASS2', None)
            env.pop('_MEIPASS', None)
            safe_cwd = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else None
            
            if sys.platform == 'win32':
                engine_proc = subprocess.Popen(cmd, env=env, cwd=safe_cwd, creationflags=subprocess.CREATE_NO_WINDOW)
            else:
                engine_proc = subprocess.Popen(cmd, env=env, cwd=safe_cwd)
            print(f"[Startup] Stealth Engine launched: {cmd}")
            # HUD engine now runs perpetually in the background.
        except Exception as e:
            print(f"[Startup] Failed to launch stealth engine: {e}")

    api = Api()

    html_path = os.path.join(base_dir(), 'dashboard', 'index.html')

    window = webview.create_window(
        title='Hirebotai — Premium Dashboard',
        url=f'file:///{html_path}',
        js_api=api,
        width=1200,
        height=800,
        min_size=(1000, 700),
        background_color='#050810',
        frameless=False,
        easy_drag=False,
        text_select=False,
        confirm_close=False,
        on_top=False,
    )

    # Apply the logo as the taskbar / window icon on Windows
    app_icon = None
    if sys.platform == 'win32':
        candidate = os.path.join(base_dir(), 'app.ico')
        if os.path.exists(candidate):
            app_icon = candidate
        else:
            print("[Dashboard] app.ico not found, using default icon")

    def on_closed():
        pass

    window.events.closed += on_closed

    webview.start(debug=False, icon=app_icon, func=fire_mac_permission_prompt)


if __name__ == '__main__':
    if '--engine' in sys.argv:
        # Background engine mode: run the stealth engine inside this same exe.
        if run_engine is not None:
            run_engine()
    elif '--relaunch' in sys.argv:
        # Persistent engine-relaunch hotkey listener (survives dashboard close).
        run_relauncher()
    else:
        main()
