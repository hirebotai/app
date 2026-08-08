"""macOS compatibility layer for the Hirebotai desktop app.

Windows-specific subsystems (DPAPI, WMI, the registry, Win32 window APIs) have no
direct macOS equivalent. This module provides drop-in replacements used by the
shared app modules when running on darwin.

Dependencies: standard library only. The optional active-window helper requires
pyobjc-framework-Quartz (see requirements-mac.txt).
"""

import os
import sys
import subprocess

APP_DATA_DIR_NAME = 'Hirebotai'
KEYCHAIN_SERVICE = 'ai.hirebotai'
KEYCHAIN_ACCOUNT = 'hirebotai'


def base_dir():
    """Return the app base directory (PyInstaller bundle or source root)."""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_data_dir():
    """User-writable data dir that survives app updates: ~/Library/Application Support/Hirebotai."""
    data_dir = os.path.join(os.path.expanduser('~'), 'Library', 'Application Support', APP_DATA_DIR_NAME)
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def get_device_hwid():
    """Hardware UUID via IOPlatformUUID, stable across reinstalls and app updates."""
    try:
        out = subprocess.check_output(
            ['ioreg', '-rd1', '-c', 'IOPlatformExpertDevice'],
            timeout=10, stderr=subprocess.DEVNULL).decode('utf-8', errors='replace')
        for line in out.splitlines():
            if 'IOPlatformUUID' not in line:
                continue
            raw = line.split('=', 1)[1].strip().strip('"')
            if len(raw) > 10:
                return raw
    except Exception as e:
        print(f"[HWID] ioreg lookup failed: {e}")
    try:
        import platform
        import uuid
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, platform.node()))
    except Exception:
        return 'UNKNOWN_HWID_DEVICE'


def keychain_set(key, value):
    """Store a secret in the login keychain via the security CLI (no extra deps)."""
    try:
        p = subprocess.run(
            ['security', 'add-generic-password', '-U', '-a', KEYCHAIN_ACCOUNT,
             '-s', f'{KEYCHAIN_SERVICE}.{key}', '-w'],
            input=str(value).encode('utf-8'), capture_output=True, timeout=10)
        return p.returncode == 0
    except Exception as e:
        print(f"[Keychain] set failed for {key}: {e}")
        return False


def keychain_get(key):
    """Read a secret from the login keychain; returns '' if missing or failing."""
    try:
        p = subprocess.run(
            ['security', 'find-generic-password', '-a', KEYCHAIN_ACCOUNT,
             '-s', f'{KEYCHAIN_SERVICE}.{key}', '-w'],
            capture_output=True, timeout=10)
        if p.returncode == 0:
            return p.stdout.decode('utf-8').rstrip('\n')
    except Exception as e:
        print(f"[Keychain] get failed for {key}: {e}")
    return ''


def keychain_delete(key):
    try:
        subprocess.run(
            ['security', 'delete-generic-password', '-a', KEYCHAIN_ACCOUNT,
             '-s', f'{KEYCHAIN_SERVICE}.{key}'],
            capture_output=True, timeout=10)
        return True
    except Exception:
        return False


def is_process_running(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except Exception:
        return False


def set_auto_start(enabled):
    """Register or remove a per-user LaunchAgent so the engine starts at login."""
    label = 'ai.hirebotai.engine'
    launch_dir = os.path.join(os.path.expanduser('~'), 'Library', 'LaunchAgents')
    os.makedirs(launch_dir, exist_ok=True)
    plist_path = os.path.join(launch_dir, f'{label}.plist')

    if not enabled:
        try:
            os.remove(plist_path)
        except FileNotFoundError:
            pass
        try:
            subprocess.run(['launchctl', 'unload', plist_path], capture_output=True, timeout=10)
        except Exception:
            pass
        return True

    main_script = os.path.join(base_dir(), 'main.py')
    program = sys.executable if getattr(sys, 'frozen', False) else (os.environ.get('PYTHON') or 'python3')
    args = ['--engine'] if getattr(sys, 'frozen', False) else [main_script]

    import plistlib
    plist = {
        'Label': label,
        'ProgramArguments': [program] + args,
        'RunAtLoad': True,
        'KeepAlive': False,
    }
    try:
        with open(plist_path, 'wb') as f:
            plistlib.dump(plist, f)
        subprocess.run(['launchctl', 'unload', plist_path], capture_output=True, timeout=10)
        subprocess.run(['launchctl', 'load', plist_path], capture_output=True, timeout=10)
        return True
    except Exception as e:
        print(f"[AutoStart] Failed: {e}")
        return False


def create_desktop_shortcut():
    """Symlink the installed .app bundle onto the Desktop."""
    desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
    os.makedirs(desktop, exist_ok=True)
    link = os.path.join(desktop, 'Hirebotai Dashboard')
    candidates = [
        os.path.join(os.path.expanduser('~'), 'Applications', 'Hirebotai.app'),
        os.path.join('/Applications', 'Hirebotai.app'),
        os.path.join(os.path.dirname(sys.executable), 'Hirebotai.app'),
    ]
    target = next((c for c in candidates if os.path.isdir(c)), None)
    if not target:
        return False
    try:
        if os.path.islink(link) or os.path.exists(link):
            os.remove(link)
        os.symlink(target, link)
        return True
    except Exception as e:
        print(f"[Shortcut] Failed: {e}")
        return False


def has_screen_capture_permission():
    """True if this app already holds macOS Screen Recording permission."""
    try:
        import Quartz
        return bool(Quartz.CGPreflightScreenCaptureAccess())
    except Exception as e:
        print(f"[mac_support] CGPreflightScreenCaptureAccess failed: {e}")
        return False


def request_screen_capture_permission():
    """Fire the macOS Screen Recording permission prompt now (returns granted).

    Called ahead of exams so the system dialog appears here, not mid-exam. The
    app must be in the foreground for the prompt to display. After the user
    grants permission, macOS requires the app to be restarted before the capture
    APIs work.
    """
    try:
        import Quartz
        return bool(Quartz.CGRequestScreenCaptureAccess())
    except Exception as e:
        print(f"[mac_support] CGRequestScreenCaptureAccess failed: {e}")
        return False


def has_accessibility_permission():
    """True if this app holds macOS Accessibility permission (needed by pynput)."""
    try:
        from ApplicationServices import AXIsProcessTrusted
        return bool(AXIsProcessTrusted())
    except Exception:
        try:
            import Quartz
            return bool(Quartz.AXIsProcessTrusted())
        except Exception as e:
            print(f"[mac_support] AXIsProcessTrusted failed: {e}")
            return False


def set_hud_click_through(win, enabled):
    """True click-through for the Qt HUD window on macOS.

    Qt.WindowTransparentForInput is a no-op on macOS, so clicking the HUD would
    activate it and steal focus from the browser below - which proctoring detects
    via blur/visibilitychange. This bridges to the Cocoa NSWindow behind the Qt
    window via PyObjC and calls setIgnoresMouseEvents, so every click passes
    through to the window underneath. The window is also floated above fullscreen
    apps and joined to their Spaces so it can overlay a fullscreen exam browser.

    Returns True on success, False when PyObjC is unavailable or the bridge fails.
    """
    try:
        import objc
        from ctypes import c_void_p
        from AppKit import (
            NSWindowCollectionBehaviorCanJoinAllSpaces,
            NSWindowCollectionBehaviorFullScreenAuxiliary,
        )
        import Quartz
    except ImportError:
        return False
    try:
        view = objc.objc_object(c_void_p=int(win.winId()))
        nswin = view.window()
        if nswin is None:
            return False
        nswin.setIgnoresMouseEvents_(bool(enabled))
        nswin.setCollectionBehavior_(
            NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehaviorFullScreenAuxiliary
        )
        # Highest safe window level: keeps the HUD above fullscreen apps and,
        # combined with NSWindowSharingNone in set_hud_hidden_from_capture,
        # pushes it above the compositor range that screen-capture frameworks
        # sample - which avoids the black rectangle some recorders draw where a
        # sharing-none window sits.
        nswin.setLevel_(Quartz.kCGAssistiveTechHighWindowLevel)
        return True
    except Exception as e:
        print(f"[mac_support] set_hud_click_through failed: {e}")
        return False


def set_hud_hidden_from_capture(win, hidden=True):
    """Exclude the Qt HUD window from macOS screen captures.

    Sets the Cocoa NSWindow sharing type to NSWindowSharingNone - the public
    macOS analog of Windows' SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE).
    The window stays fully visible on the physical display but its pixels are
    dropped from capture buffers, so screen recordings and browser/proctoring
    snapshots see nothing where the HUD is.

    Combined with the assistive-tech-high window level applied in
    set_hud_click_through, the HUD sits above the compositor range that
    screen-capture frameworks sample, which prevents the black rectangle some
    recorders draw for sharing-none windows. Behavior still varies by macOS
    version - verify on the target machine with `screencapture -x` and a
    QuickTime recording. If a black box appears, the fallback is raising the
    window level to kCGMaximumWindowLevel (set_hud_click_through).

    AppKit may reset the sharing type during window operations, so callers must
    re-apply it after the window is (re)shown.
    """
    try:
        import objc
        from ctypes import c_void_p
        from AppKit import NSWindowSharingNone, NSWindowSharingReadWrite
    except ImportError:
        return False
    try:
        view = objc.objc_object(c_void_p=int(win.winId()))
        nswin = view.window()
        if nswin is None:
            return False
        nswin.setSharingType_(NSWindowSharingNone if hidden else NSWindowSharingReadWrite)
        return True
    except Exception as e:
        print(f"[mac_support] set_hud_hidden_from_capture failed: {e}")
        return False


def get_active_window_bounds():
    """Bounds of the front-most non-Hirebotai window as left/top/width/height.

    Requires macOS Screen Recording permission for CGWindowListCopyWindowInfo.
    Returns None when unavailable (pyobjc not installed or permission denied).
    """
    try:
        import Quartz
    except ImportError:
        return None
    try:
        win_list = Quartz.CGWindowListCopyWindowInfo(
            Quartz.kCGWindowListOptionOnScreenOnly | Quartz.kCGWindowListExcludeDesktopElements,
            Quartz.kCGNullWindowID)
        for w in win_list or []:
            if w.get('kCGWindowLayer', 0) != 0:
                continue
            if w.get('kCGWindowOwnerName', '') == 'Hirebotai':
                continue
            if w.get('kCGWindowAlpha', 1) == 0:
                continue
            bounds = w.get('kCGWindowBounds', {})
            width = int(bounds.get('Width', 0))
            height = int(bounds.get('Height', 0))
            if width < 50 or height < 50:
                continue
            return {
                'left': int(bounds.get('X', 0)),
                'top': int(bounds.get('Y', 0)),
                'width': width,
                'height': height,
            }
    except Exception as e:
        print(f"[mac_support] get_active_window_bounds failed: {e}")
    return None
