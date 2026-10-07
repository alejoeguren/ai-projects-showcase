"""Recording indicator — a small ball in the bottom-right corner of the screen.

Out of the way, but unmistakable: while recording it's a red ball that pulses
with your voice level; while transcribing it breathes blue at a steady rhythm.
Hidden when idle.

Tkinter runs on its own dedicated thread; state changes arrive via a queue
(tkinter is not thread-safe, so all UI work stays on that thread).
"""

import ctypes
import logging
import math
import queue
import threading
import tkinter as tk

log = logging.getLogger(__name__)

SIZE = 72              # window is a small square; the ball draws inside it
MARGIN_RIGHT = 28
MARGIN_BOTTOM = 84     # clears the taskbar

TRANSPARENT = "#010203"  # magic color keyed out by Windows layered transparency
BALL_LIVE = "#e5484d"    # recording
HALO_LIVE = "#6e2226"
BALL_PROC = "#5b8def"    # transcribing
HALO_PROC = "#26375c"

R_MIN, R_MAX = 10, 26    # ball radius range
HALO_PAD = 5

FPS_MS = 33  # ~30 fps

# Keep the ball from ever stealing keyboard focus from the app being dictated into.
WS_EX_NOACTIVATE = 0x08000000
GWL_EXSTYLE = -20


class Overlay:
    def __init__(self):
        self.level_source = lambda: 0.0  # wired to Recorder.level in __main__
        self._states = queue.Queue()
        self._state = "idle"
        self._level = 0.0  # smoothed
        self._phase = 0.0
        threading.Thread(target=self._run, daemon=True, name="overlay-ui").start()

    def set_state(self, state: str) -> None:
        """Thread-safe: called from keyboard/dictation threads."""
        self._states.put(state)

    # --- everything below runs on the tkinter thread ---

    def _run(self) -> None:
        try:
            self._root = tk.Tk()
            root = self._root
            root.withdraw()
            root.overrideredirect(True)
            root.attributes("-topmost", True)
            root.attributes("-transparentcolor", TRANSPARENT)
            root.config(bg=TRANSPARENT)
            sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
            root.geometry(
                f"{SIZE}x{SIZE}+{sw - SIZE - MARGIN_RIGHT}+{sh - SIZE - MARGIN_BOTTOM}"
            )
            self._canvas = tk.Canvas(
                root, width=SIZE, height=SIZE, bg=TRANSPARENT, highlightthickness=0
            )
            self._canvas.pack()
            self._apply_noactivate()
            root.after(FPS_MS, self._tick)
            root.mainloop()
        except Exception:
            log.exception("overlay UI thread died (dictation still works)")

    def _apply_noactivate(self) -> None:
        try:
            self._root.update_idletasks()
            hwnd = ctypes.windll.user32.GetParent(self._root.winfo_id()) or self._root.winfo_id()
            style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style | WS_EX_NOACTIVATE)
        except Exception:
            log.debug("could not set WS_EX_NOACTIVATE", exc_info=True)

    def _tick(self) -> None:
        # drain pending state changes
        while True:
            try:
                new = self._states.get_nowait()
            except queue.Empty:
                break
            if new != self._state:
                self._state = new
                if new == "recording":
                    self._level = 0.0
                    self._root.deiconify()
                    self._root.attributes("-topmost", True)
                elif new == "idle":
                    self._root.withdraw()

        if self._state != "idle":
            if self._state == "recording":
                # smooth the raw RMS so the ball feels springy, not jittery
                raw = min(1.0, self.level_source() * 8.0)
                self._level += (raw - self._level) * 0.35
            self._phase += 0.22
            self._draw()
        self._root.after(FPS_MS, self._tick)

    def _draw(self) -> None:
        c = self._canvas
        c.delete("all")
        recording = self._state == "recording"

        if recording:
            # voice-driven pulse with a faint idle breath under it
            breath = 0.06 * (0.5 + 0.5 * math.sin(self._phase * 0.8))
            frac = min(1.0, self._level + breath)
            ball, halo = BALL_LIVE, HALO_LIVE
        else:
            # steady thinking rhythm
            frac = 0.35 + 0.35 * (0.5 + 0.5 * math.sin(self._phase))
            ball, halo = BALL_PROC, HALO_PROC

        r = R_MIN + frac * (R_MAX - R_MIN)
        mid = SIZE / 2
        c.create_oval(mid - r - HALO_PAD, mid - r - HALO_PAD,
                      mid + r + HALO_PAD, mid + r + HALO_PAD,
                      fill=halo, outline="")
        c.create_oval(mid - r, mid - r, mid + r, mid + r, fill=ball, outline="")
