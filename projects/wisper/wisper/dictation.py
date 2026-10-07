"""Push-to-talk dictation: hold the hotkey, speak, release, text appears."""

import logging
import threading

import keyboard

from . import injector
from .audio import Recorder
from .cleanup import Cleaner
from .transcriber import Transcriber

log = logging.getLogger(__name__)


def _beep(freq: int, ms: int = 120) -> None:
    try:
        import winsound

        threading.Thread(
            target=winsound.Beep, args=(freq, ms), daemon=True
        ).start()
    except Exception:
        pass


class DictationController:
    """Owns the record -> transcribe -> clean -> inject pipeline.

    States reported via on_state: "idle", "recording", "processing".
    """

    def __init__(self, transcriber: Transcriber, cleaner: Cleaner,
                 hotkey: str, mode: str, sounds: bool, on_state=None):
        self.transcriber = transcriber
        self.cleaner = cleaner
        self.hotkey = hotkey
        self.mode = mode
        self.sounds = sounds
        self.on_state = on_state or (lambda state: None)
        self.recorder = Recorder()
        self._hooks = []

    def start(self) -> None:
        if self.mode == "toggle":
            self._hooks.append(
                keyboard.on_press_key(self.hotkey, self._on_toggle, suppress=True)
            )
        else:  # hold (push-to-talk)
            self._hooks.append(
                keyboard.on_press_key(self.hotkey, self._on_press, suppress=True)
            )
            self._hooks.append(
                keyboard.on_release_key(self.hotkey, self._on_release, suppress=True)
            )
        log.info("dictation ready: %s '%s' to talk",
                 "press" if self.mode == "toggle" else "hold", self.hotkey)

    def _on_press(self, event) -> None:
        # Key auto-repeat re-fires press events while held; only act on the first.
        if not self.recorder.recording:
            self._start_recording()

    def _on_release(self, event) -> None:
        if self.recorder.recording:
            self._finish_recording()

    def _on_toggle(self, event) -> None:
        if self.recorder.recording:
            self._finish_recording()
        else:
            self._start_recording()

    def _start_recording(self) -> None:
        try:
            self.recorder.start()
        except Exception as e:
            log.error("could not open microphone: %s", e)
            if self.sounds:
                _beep(220, 300)
            return
        self.on_state("recording")
        if self.sounds:
            _beep(880)
        log.info("recording...")

    def _finish_recording(self) -> None:
        audio = self.recorder.stop()
        self.on_state("processing")
        if self.sounds:
            _beep(660)
        threading.Thread(target=self._process, args=(audio,), daemon=True).start()

    def _process(self, audio) -> None:
        try:
            text = self.transcriber.transcribe(audio)
            if text:
                text = self.cleaner.clean(text)
                injector.type_text(text)
                if self.sounds:
                    _beep(1040, 80)
            else:
                log.info("nothing transcribed (too short or silent)")
        except Exception:
            log.exception("dictation pipeline failed")
            if self.sounds:
                _beep(220, 300)
        finally:
            self.on_state("idle")
