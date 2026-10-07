"""System tray icon and menu."""

import logging
import os

import pystray
from PIL import Image, ImageDraw

from . import __version__, config

log = logging.getLogger(__name__)

STATE_COLORS = {
    "idle": (110, 110, 120),       # gray
    "recording": (220, 60, 60),    # red
    "processing": (70, 130, 220),  # blue
}


def _make_icon(color: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((8, 8, 56, 56), fill=color + (255,))
    # small mic-ish slot in the middle
    d.rounded_rectangle((26, 18, 38, 40), radius=6, fill=(255, 255, 255, 230))
    d.line((32, 40, 32, 48), fill=(255, 255, 255, 230), width=4)
    return img


class Tray:
    def __init__(self, snippet_engine, cleaner, on_reload, on_quit):
        self.snippet_engine = snippet_engine
        self.cleaner = cleaner
        self.on_reload = on_reload
        self.on_quit = on_quit
        self._icons = {state: _make_icon(c) for state, c in STATE_COLORS.items()}
        self.icon = pystray.Icon(
            "wisper",
            icon=self._icons["idle"],
            title=f"Wisper {__version__} — hold hotkey to dictate",
            menu=pystray.Menu(
                pystray.MenuItem(f"Wisper {__version__}", None, enabled=False),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem(
                    self._ai_label,
                    self._toggle_ai,
                    checked=lambda item: self.cleaner.ai_active,
                    enabled=lambda item: self.cleaner.ai_available,
                ),
                pystray.MenuItem(
                    "Snippets enabled",
                    self._toggle_snippets,
                    checked=lambda item: self.snippet_engine.enabled,
                ),
                pystray.MenuItem("Edit snippets...", lambda: os.startfile(config.SNIPPETS_PATH)),
                pystray.MenuItem("Edit config...", lambda: os.startfile(config.CONFIG_PATH)),
                pystray.MenuItem("Reload config && snippets", lambda: self.on_reload()),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Quit", self._quit),
            ),
        )

    def set_state(self, state: str) -> None:
        self.icon.icon = self._icons.get(state, self._icons["idle"])

    def _ai_label(self, item=None) -> str:
        if not self.cleaner.ai_available:
            return "AI cleanup (set ANTHROPIC_API_KEY)"
        return "AI cleanup (Claude)"

    def _toggle_ai(self) -> None:
        self.cleaner.use_ai = not self.cleaner.use_ai
        log.info("cleanup mode: %s", "Claude AI" if self.cleaner.ai_active else "local rules")

    def _toggle_snippets(self) -> None:
        self.snippet_engine.enabled = not self.snippet_engine.enabled
        log.info("snippets %s", "enabled" if self.snippet_engine.enabled else "disabled")

    def _quit(self) -> None:
        self.icon.stop()
        self.on_quit()

    def run(self) -> None:
        """Blocks until Quit is chosen."""
        self.icon.run()
