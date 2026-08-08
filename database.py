import sqlite3
import json
import os
import base64
import sys
from datetime import datetime

if sys.platform == 'win32':
    import ctypes
    import ctypes.wintypes

def _mac_support():
    """Lazily import the macOS compatibility layer from the macos/ folder.

    Works from source and from the PyInstaller bundle (macos/ is shipped as data).
    """
    base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    mac_dir = os.path.join(base, 'macos')
    if mac_dir not in sys.path:
        sys.path.insert(0, mac_dir)
    import mac_support
    return mac_support

def get_data_dir():
    """Return a user-writable data directory that survives packaging and installs.

    Windows: %LOCALAPPDATA%. macOS: ~/Library/Application Support.
    """
    if sys.platform == 'darwin':
        return _mac_support().get_data_dir()
    base = os.environ.get('LOCALAPPDATA')
    if base:
        data_dir = os.path.join(base, 'HirebotAI')
    else:
        data_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

DATA_DIR = get_data_dir()
DB_FILE = os.path.join(DATA_DIR, 'history.db')

# API keys are stored encrypted at rest: Windows DPAPI (user-scoped) or,
# on macOS, the login Keychain via the mac_support layer.
ENCRYPTED_KEYS = frozenset({
    'groq_api_key', 'openrouter_api_key', 'gemini_api_key',
    'acct_access_token', 'acct_refresh_token',
})
_ENC_PREFIX = 'enc1:'
_MAC_KEYCHAIN_MARKER = 'kc1:'

# Unified-account session persisted locally (tokens encrypted, profile plaintext).
ACCOUNT_KEYS = ('acct_access_token', 'acct_refresh_token', 'acct_user_id', 'acct_email', 'acct_name')

def get_device_hwid():
    """Generates a unique Device Hardware ID (HWID).

    Windows: CSPRODUCT UUID via wmic. macOS: IOPlatformUUID via ioreg.
    """
    if sys.platform == 'darwin':
        return _mac_support().get_device_hwid()
    try:
        import subprocess
        cmd = 'wmic csproduct get uuid'
        output = subprocess.check_output(cmd, shell=True).decode().split('\n')
        if len(output) >= 2:
            uuid_str = output[1].strip()
            if uuid_str and len(uuid_str) > 10:
                return uuid_str
    except Exception as e:
        print(f"[HWID] WMI lookup failed: {e}")
    try:
        import platform
        import uuid
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, platform.node()))
    except Exception:
        return "UNKNOWN_HWID_DEVICE"

def get_server_trial_start(hwid):
    """Fetch the authoritative trial start (ms epoch) for this device from the
    website server. The server keys the trial by HWID, so it survives app
    reinstalls, LocalAppData wipes and factory resets.

    Returns None if the server cannot be reached (caller must fall back).
    """
    try:
        import requests
        resp = requests.post("https://www.hirebotai.in/api/trial", json={"hwid": hwid}, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success') and data.get('trial_start'):
                return int(data['trial_start'])
        else:
            print(f"[Trial] Server responded HTTP {resp.status_code}")
    except Exception as e:
        print(f"[Trial] Server trial lookup failed: {e}")
    return None

def get_account_trial_start(access_token, hwid):
    """Fetch/start the trial bound to the logged-in account (POST /api/app/trial).

    The server first checks the account, then claims any legacy HWID-only
    record for this device, then starts a fresh trial. Returns None offline.
    """
    try:
        import requests
        resp = requests.post(
            "https://www.hirebotai.in/api/app/trial",
            json={"hwid": hwid},
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=6,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success') and data.get('trial_start'):
                return int(data['trial_start'])
        else:
            print(f"[Trial] Account trial responded HTTP {resp.status_code}")
    except Exception as e:
        print(f"[Trial] Account trial lookup failed: {e}")
    return None

def sync_trial_start(db, force_refresh=False):
    """Ensure this device's trial_start exists locally, sourced from the server.

    When logged in, the account-bound trial is authoritative (survives
    reinstalls; a fresh account on an already-trialed device still sees the
    original start time). Falls back to the legacy HWID record only when not
    logged in, and to the local clock only when offline on first run.

    The local clock is never used to OVERWRITE an existing server-sourced
    value: doing so would silently move the trial start later and make the PC
    disagree with the authoritative server record.

    Args:
        force_refresh: If True, bypass local cache and re-fetch from server.
    """
    if not force_refresh:
        trial_start = db.get_setting('trial_start')
        if trial_start:
            return int(trial_start)
    import time
    existing = db.get_setting('trial_start')
    existing = int(existing) if existing else None
    ts = None
    session = db.get_session()
    if session and session.get('access_token'):
        ts = get_account_trial_start(session['access_token'], get_device_hwid())
        if not ts:
            # Token may be expired; clear it so next login fetches fresh
            db.set_setting('acct_access_token', '')
            db.set_setting('acct_refresh_token', '')
    if not ts:
        ts = get_server_trial_start(get_device_hwid())
    if not ts:
        # Server unreachable: keep the last known server value instead of
        # restarting the trial with the local clock. Only fall back to the
        # local clock when there is no recorded start at all (first run).
        ts = existing or int(time.time() * 1000)
    db.set_setting('trial_start', ts)
    return ts

def verify_license_with_server(db, force=False):
    """Re-validate the locally stored license key against the website server.

    The server is the source of truth for activation status: it checks whether
    the key exists, is still 'active', has not expired, and is bound to this
    device's HWID. If the server rejects it (revoked, expired, not found, or
    bound to another PC) the local key is cleared so the app stops treating the
    user as licensed and the dashboard shows the trial/no-license state again.

    Returns True when the license is currently valid, False otherwise. A
    completely unreachable server leaves the local key untouched (last known
    good state) so an offline user is never locked out for no reason.
    """
    license_key = (db.get_setting('license_key') or '').strip()
    if not license_key:
        return False
    try:
        import requests
        resp = requests.post(
            "https://www.hirebotai.in/api/activate-license",
            json={"license_key": license_key, "hwid": get_device_hwid()},
            timeout=8,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                return True
            # Server answered but the key is invalid/expired/revoked.
            db.set_setting('license_key', '')
            return False
        # Any other HTTP status is a rejection (404 not found, 403 expired,
        # 409 already bound elsewhere, 429 rate limit, 500 server error).
        # Do not silently clear on transient errors like 429/500 — only clear
        # on a definitive rejection so we never lock a paying user out.
        if resp.status_code in (404, 403, 409):
            db.set_setting('license_key', '')
            return False
        return True
    except Exception as e:
        # Server unreachable: keep last known good state.
        print(f"[License] Verification offline, keeping local key: {e}")
        return True

# How often the desktop app re-validates the stored license against the server.
LICENSE_REVERIFY_MS = 12 * 60 * 60 * 1000  # 12 hours

def maybe_verify_license(db):
    """Cached server re-validation of the stored license key.

    Returns True if the user is licensed right now. Only hits the network at
    most once every LICENSE_REVERIFY_MS; within that window the last result
    (or last known good state) is reused so hotkey/poll checks stay instant.
    """
    license_key = (db.get_setting('license_key') or '').strip()
    if not license_key.startswith('SA-'):
        return False
    import time
    now = int(time.time() * 1000)
    try:
        last_check = int(db.get_setting('license_verified_at') or 0)
    except Exception:
        last_check = 0
    if now - last_check <= LICENSE_REVERIFY_MS:
        # Within the cache window: licensed if the key is still stored (the
        # server may have cleared it via a rejection on a prior check).
        return (db.get_setting('license_key') or '').strip().startswith('SA-')
    valid = verify_license_with_server(db)
    db.set_setting('license_verified_at', str(now))
    return valid

if sys.platform == 'win32':
    class _DATA_BLOB(ctypes.Structure):
        _fields_ = [("cbData", ctypes.wintypes.DWORD),
                    ("pbData", ctypes.POINTER(ctypes.c_char))]

    def dpapi_protect(data):
        """Encrypt bytes with Windows DPAPI (bound to the current Windows user)."""
        buffer_in = ctypes.create_string_buffer(data, len(data))
        blob_in = _DATA_BLOB(len(data), ctypes.cast(buffer_in, ctypes.POINTER(ctypes.c_char)))
        blob_out = _DATA_BLOB()
        if not ctypes.windll.crypt32.CryptProtectData(
                ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)):
            raise ctypes.WinError()
        try:
            return ctypes.string_at(blob_out.pbData, blob_out.cbData)
        finally:
            ctypes.windll.kernel32.LocalFree(blob_out.pbData)

    def dpapi_unprotect(data):
        """Decrypt bytes previously encrypted with dpapi_protect."""
        buffer_in = ctypes.create_string_buffer(data, len(data))
        blob_in = _DATA_BLOB(len(data), ctypes.cast(buffer_in, ctypes.POINTER(ctypes.c_char)))
        blob_out = _DATA_BLOB()
        if not ctypes.windll.crypt32.CryptUnprotectData(
                ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)):
            raise ctypes.WinError()
        try:
            return ctypes.string_at(blob_out.pbData, blob_out.cbData)
        finally:
            ctypes.windll.kernel32.LocalFree(blob_out.pbData)

    def _encrypt_value(plaintext):
        return _ENC_PREFIX + base64.b64encode(dpapi_protect(str(plaintext).encode('utf-8'))).decode('ascii')

    def _decrypt_value(encoded):
        try:
            payload = base64.b64decode(encoded[len(_ENC_PREFIX):])
            return dpapi_unprotect(payload).decode('utf-8')
        except Exception:
            return ''

# Default Hotkeys
DEFAULT_SETTINGS = {
    'master_power': True,
    'groq_api_key': '',
    'openrouter_api_key': '',
    'gemini_api_key': '',
    'hotkey_capture': '<alt>+s',
    'hotkey_interview': '<alt>+i',
    'hotkey_audio': '<alt>+a',
    'hotkey_peek': '<alt>+h',
    'hotkey_sticky': '<alt>+k',
    'hotkey_ghost': '<alt>+t',
    'hotkey_silent': '<alt>+o',
    'hotkey_search': '<alt>+q',
    'hotkey_exit': '<alt>+e',
    'hotkey_clear': '<alt>+c',
    'hotkey_cheat': '<alt>+n',
    'hotkey_scroll_up': '<alt>+up',
    'hotkey_scroll_dn': '<alt>+down',
    'auto_copy_answers': False,
    'cheat_sheet_text': 'Paste your cheat sheet here...',
    'trial_start': '',
    'license_key': '',
    'auto_start': True,
    'no_tray': True,
    'log_history': True,
    'hud_opacity': 15,
    'hud_font_size': 'Medium',
    'hud_answer_color': '#34D399',
    'hud_auto_hide': 'Never',
    'typing_speed': 240,
    'practice_speech_rate': 1.0,
    'practice_voice_name': 'Default'
}

class DatabaseManager:
    def __init__(self, db_path=DB_FILE):
        self.db_path = db_path
        self._initialize_db()

    def _connect(self):
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def _initialize_db(self):
        with sqlite3.connect(self.db_path, timeout=10) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA busy_timeout=5000")
            cursor = conn.cursor()
            
            # Create Settings Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            ''')
            
            # Create Resumes Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS resumes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    content TEXT,
                    is_active BOOLEAN
                )
            ''')
            
            # Create Sessions Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    start_time DATETIME,
                    end_time DATETIME,
                    scorecard_good TEXT,
                    scorecard_bad TEXT,
                    scorecard_rating TEXT
                )
            ''')
            
            # Create Logs Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER,
                    timestamp DATETIME,
                    type TEXT,
                    question TEXT,
                    answer TEXT,
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                )
            ''')
            
            # Populate default settings if empty
            for key, default_value in DEFAULT_SETTINGS.items():
                cursor.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', 
                               (key, json.dumps(default_value)))
            conn.commit()

    # --- Settings Methods ---
    def get_setting(self, key):
        with sqlite3.connect(self.db_path, timeout=10) as conn:
            conn.execute("PRAGMA busy_timeout=5000")
            cursor = conn.cursor()
            cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
            row = cursor.fetchone()
            if row:
                try:
                    value = json.loads(row[0])
                except (ValueError, TypeError):
                    value = row[0]
                # Decrypt / migrate legacy plaintext API keys
                if key in ENCRYPTED_KEYS and isinstance(value, str):
                    if sys.platform == 'darwin':
                        if value.startswith(_MAC_KEYCHAIN_MARKER):
                            return _mac_support().keychain_get(key)
                        return value
                    if value.startswith(_ENC_PREFIX):
                        return _decrypt_value(value)
                    if value:
                        # Legacy plaintext stored before encryption was added -> migrate now
                        self.set_setting(key, _encrypt_value(value))
                        return value
                return value
            return DEFAULT_SETTINGS.get(key)

    def set_setting(self, key, value):
        if key in ENCRYPTED_KEYS and value:
            if sys.platform == 'darwin':
                _mac_support().keychain_set(key, value)
                value = _MAC_KEYCHAIN_MARKER
            elif not (isinstance(value, str) and value.startswith(_ENC_PREFIX)):
                value = _encrypt_value(value)
        with sqlite3.connect(self.db_path, timeout=10) as conn:
            conn.execute("PRAGMA busy_timeout=5000")
            cursor = conn.cursor()
            cursor.execute('REPLACE INTO settings (key, value) VALUES (?, ?)', 
                           (key, json.dumps(value)))
            conn.commit()

    def get_all_settings(self):
        settings = {}
        for key in DEFAULT_SETTINGS.keys():
            settings[key] = self.get_setting(key)
        return settings

    # --- Unified Account Session ---
    def save_session(self, access_token, refresh_token, user_id, email, name):
        """Persist the logged-in account. Tokens are stored encrypted
        (DPAPI on Windows, Keychain on macOS) via set_setting."""
        self.set_setting('acct_access_token', access_token)
        self.set_setting('acct_refresh_token', refresh_token)
        self.set_setting('acct_user_id', user_id or '')
        self.set_setting('acct_email', email or '')
        self.set_setting('acct_name', name or '')

    def clear_session(self):
        for key in ACCOUNT_KEYS:
            self.set_setting(key, '')

    def get_session(self):
        access_token = self.get_setting('acct_access_token')
        if not access_token:
            return None
        return {
            'access_token': access_token,
            'refresh_token': self.get_setting('acct_refresh_token') or '',
            'user_id': self.get_setting('acct_user_id') or '',
            'email': self.get_setting('acct_email') or '',
            'name': self.get_setting('acct_name') or '',
        }

    def is_logged_in(self):
        return bool(self.get_setting('acct_access_token'))

    def factory_reset(self):
        # Licensing / trial / device state survives a factory reset so a "reset"
        # can never be used to restart the free trial or unbind a license.
        protected = {'trial_start', 'license_key', 'device_hwid'} | set(ACCOUNT_KEYS)
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT key FROM settings')
            keys = [r[0] for r in cursor.fetchall()]
            for key in keys:
                if key not in protected:
                    cursor.execute('DELETE FROM settings WHERE key = ?', (key,))
                    if sys.platform == 'darwin' and key in ENCRYPTED_KEYS:
                        _mac_support().keychain_delete(key)
            cursor.execute('DELETE FROM resumes')
            cursor.execute('DELETE FROM sessions')
            cursor.execute('DELETE FROM logs')
            cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('resumes','sessions','logs')")
            conn.commit()
        self._initialize_db()

    # --- Session & Logs Methods ---
    def start_new_session(self):
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT INTO sessions (start_time) VALUES (?)', (datetime.now(),))
            conn.commit()
            return cursor.lastrowid

    def end_session(self, session_id):
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE sessions SET end_time = ? WHERE id = ?', (datetime.now(), session_id))
            conn.commit()

    def log_interaction(self, session_id, log_type, question, answer):
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO logs (session_id, timestamp, type, question, answer)
                VALUES (?, ?, ?, ?, ?)
            ''', (session_id, datetime.now(), log_type, question, answer))
            conn.commit()

    def get_sessions(self, limit=50):
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT id, start_time, end_time FROM sessions ORDER BY id DESC LIMIT ?',
                (limit,))
            return cursor.fetchall()

    def get_session_logs(self, session_id):
        with self._connect() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT timestamp, type, question, answer FROM logs WHERE session_id = ? ORDER BY id',
                (session_id,))
            return cursor.fetchall()
