# service_runner.py
"""Utility script to install, uninstall, start, and stop the HirebotAI Windows Service.
The installer (Inno Setup) will call this script with one of the commands:
    install   – registers the service and sets auto‑restart on failure.
    uninstall – stops the service (if running) and removes it.
    start     – starts the service.
    stop      – stops the service.
"""
import sys
import subprocess
import os

SERVICE_NAME = "HirebotEngine"
INSTALL_DIR = os.path.join(os.getenv("ProgramFiles"), "HirebotAI")
PYTHONW = os.path.join(INSTALL_DIR, ".venv", "Scripts", "pythonw.exe")
MAIN_SCRIPT = os.path.join(INSTALL_DIR, "main.py")

def run_cmd(args):
    try:
        result = subprocess.run(args, capture_output=True, text=True, check=False)
        print(result.stdout.strip())
        if result.stderr:
            print(result.stderr.strip(), file=sys.stderr)
        return result.returncode
    except Exception as e:
        print(f"[service_runner] Command error: {e}", file=sys.stderr)
        return 1

def install():
    bin_path = f'\"{PYTHONW}\" \"{MAIN_SCRIPT}\"'
    print("[service_runner] Installing service...")
    run_cmd(["sc", "create", SERVICE_NAME, f"binPath= {bin_path}", "start=", "auto"])
    run_cmd(["sc", "description", SERVICE_NAME, "Hirebot AI background engine"])
    # Restart on failure after 5 seconds, unlimited retries
    run_cmd(["sc", "failure", SERVICE_NAME, "reset=", "0", "actions=", "restart/5000"])
    print("[service_runner] Service installed.")

def uninstall():
    print("[service_runner] Uninstalling service...")
    run_cmd(["sc", "stop", SERVICE_NAME])
    run_cmd(["sc", "delete", SERVICE_NAME])
    print("[service_runner] Service removed.")

def start():
    print("[service_runner] Starting service...")
    run_cmd(["sc", "start", SERVICE_NAME])

def stop():
    print("[service_runner] Stopping service...")
    run_cmd(["sc", "stop", SERVICE_NAME])

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: service_runner.py [install|uninstall|start|stop]")
        sys.exit(1)
    cmd = sys.argv[1].lower()
    if cmd == "install":
        install()
    elif cmd == "uninstall":
        uninstall()
    elif cmd == "start":
        start()
    elif cmd == "stop":
        stop()
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
