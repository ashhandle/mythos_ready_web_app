#!/usr/bin/env python3
"""
FrontierAI Ready — Windows launcher.
Run from any directory:  python start.py
Or double-click start.py in Explorer (requires Python 3 associated with .py files).
"""

import os
import sys
import socket
import subprocess
import threading
import time
import webbrowser

# ── Minimum Python version check ─────────────────────────────────────────────

if sys.version_info < (3, 8):
    input(
        "\n  ERROR: Python 3.8 or later is required.\n"
        f"  Detected: Python {sys.version}\n\n"
        "  Download the latest Python 3 from https://www.python.org/downloads/\n\n"
        "  Press Enter to exit..."
    )
    sys.exit(1)

# ── Resolve paths ─────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_PY  = os.path.join(SCRIPT_DIR, "server.py")

if not os.path.isfile(SERVER_PY):
    input(
        f"\n  ERROR: server.py not found at:\n  {SERVER_PY}\n\n"
        "  Ensure start.py is located inside the web_app\\ folder.\n\n"
        "  Press Enter to exit..."
    )
    sys.exit(1)

# ── Port selection ─────────────────────────────────────────────────────────────

def port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) != 0

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

if not port_free(PORT):
    for candidate in range(8081, 8100):
        if port_free(candidate):
            PORT = candidate
            break
    else:
        input(
            f"\n  ERROR: Ports 8080–8099 are all in use.\n"
            "  Close other applications and try again.\n\n"
            "  Press Enter to exit..."
        )
        sys.exit(1)

URL = f"http://localhost:{PORT}"

# ── Banner ────────────────────────────────────────────────────────────────────

print()
print("  +--------------------------------------------------+")
print("  |   FrontierAI Ready                               |")
print("  |   AI Security Control Readiness                  |")
print("  +--------------------------------------------------+")
print(f"  Server  : {URL}")
print(f"  Root    : {SCRIPT_DIR}")
print()
print("  Opening browser — press Ctrl+C to stop the server.")
print()

# ── Open browser after a short delay ─────────────────────────────────────────

def open_browser():
    time.sleep(1.2)
    webbrowser.open(URL)

threading.Thread(target=open_browser, daemon=True).start()

# ── Start server ──────────────────────────────────────────────────────────────

try:
    subprocess.run(
        [sys.executable, SERVER_PY, str(PORT)],
        cwd=SCRIPT_DIR,
        check=True,
    )
except KeyboardInterrupt:
    print("\n\n  Server stopped. Goodbye.\n")
except subprocess.CalledProcessError as e:
    input(
        f"\n  ERROR: server.py exited with code {e.returncode}.\n\n"
        "  Press Enter to exit..."
    )
    sys.exit(e.returncode)
