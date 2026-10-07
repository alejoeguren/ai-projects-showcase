"""Text-expansion engine: type a trigger like 'cal anywhere and it expands.

Watches global keystrokes, keeps a small buffer of what was recently typed,
and when the buffer ends with a known trigger, deletes the trigger and pastes
the expansion in its place.
"""

import datetime
import logging
import threading

import keyboard

from . import injector

log = logging.getLogger(__name__)

BUFFER_MAX = 64

# Keys that mean "the user moved somewhere else" — stop matching across them.
RESET_KEYS = {
    "enter", "tab", "esc", "up", "down", "left", "right",
    "home", "end", "page up", "page down", "delete",
}


def _expand_placeholders(text: str) -> str:
    now = datetime.datetime.now()
    return (
        text.replace("{date}", now.strftime("%Y-%m-%d"))
            .replace("{time}", now.strftime("%H:%M"))
    )


class SnippetEngine:
    def __init__(self, snippets: dict[str, str], enabled: bool, on_expand=None):
        self.snippets = snippets
        self.enabled = enabled
        self.on_expand = on_expand  # optional callback(trigger) for UI feedback
        self._buffer = ""
        self._hook = None

    def start(self) -> None:
        if self._hook is None:
            self._hook = keyboard.hook(self._on_event)
            log.info("snippet engine active with %d trigger(s)", len(self.snippets))

    def stop(self) -> None:
        if self._hook is not None:
            keyboard.unhook(self._hook)
            self._hook = None

    def set_snippets(self, snippets: dict[str, str]) -> None:
        self.snippets = snippets
        self._buffer = ""

    def _on_event(self, event) -> None:
        if event.event_type != keyboard.KEY_DOWN or not self.enabled:
            return
        if injector.is_injecting():
            return  # ignore keystrokes we generated ourselves

        name = event.name or ""
        if name == "space":
            self._buffer += " "
        elif name == "backspace":
            self._buffer = self._buffer[:-1]
        elif name in RESET_KEYS or len(name) != 1:
            # Modifier keys (ctrl, shift, ...) pass through without resetting,
            # navigation keys reset the buffer.
            if name in RESET_KEYS:
                self._buffer = ""
            return
        else:
            self._buffer += name

        self._buffer = self._buffer[-BUFFER_MAX:]
        self._check_triggers()

    def _check_triggers(self) -> None:
        for trigger, expansion in self.snippets.items():
            if self._buffer.endswith(trigger):
                self._buffer = ""
                log.info("snippet trigger %r fired", trigger)
                # Expand on a worker thread so we never block the keyboard hook.
                threading.Thread(
                    target=self._expand, args=(trigger, expansion), daemon=True
                ).start()
                return

    def _expand(self, trigger: str, expansion: str) -> None:
        injector.send_backspaces(len(trigger))
        injector.type_text(_expand_placeholders(expansion))
        if self.on_expand:
            self.on_expand(trigger)
