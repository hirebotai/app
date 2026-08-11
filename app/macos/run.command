#!/bin/bash
# Hirebotai macOS source launcher (free path, no signing needed).
# First run creates a venv and installs requirements; later runs start instantly.
#
# Usage:  double-click this file (or:  bash run.command)
# macOS will ask for Accessibility, Screen Recording and Microphone access on
# first run — grant them in System Settings > Privacy & Security.

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$DIR/.venv"

if [ ! -x "$VENV/bin/python" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip
  echo "Installing dependencies (one time)..."
  "$VENV/bin/pip" install -r "$DIR/macos/requirements-mac.txt"
fi

exec "$VENV/bin/python" "$DIR/dashboard.py"
