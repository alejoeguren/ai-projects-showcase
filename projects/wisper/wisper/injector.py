"""Inject text into the focused window.

Uses clipboard-paste (Ctrl+V) so arbitrary unicode and multi-line text arrives
intact, then restores whatever was on the clipboard before.
"""

import logging
import threading
import time

import keyboard
import pyperclip

log = logging.getLogger(__name__)

# Global flag so the snippet engine can ignore keystrokes we generate ourselves.
_injecting = threading.Event()


def is_injecting() -> bool:
    return _injecting.is_set()


def type_text(text: str) -> None:
    if not text:
        return
    _injecting.set()
    try:
        old_clipboard = None
        try:
            old_clipboard = pyperclip.paste()
        except Exception:
            pass
        pyperclip.copy(text)
        time.sleep(0.05)  # let the clipboard settle
        keyboard.send("ctrl+v")
        time.sleep(0.15)  # let the target app read the clipboard before restoring
        if old_clipboard is not None:
            try:
                pyperclip.copy(old_clipboard)
            except Exception:
                pass
    finally:
        _injecting.clear()


def send_backspaces(count: int) -> None:
    _injecting.set()
    try:
        for _ in range(count):
            keyboard.send("backspace")
            time.sleep(0.005)
    finally:
        _injecting.clear()
