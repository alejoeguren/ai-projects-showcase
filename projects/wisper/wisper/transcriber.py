"""Local speech-to-text via faster-whisper."""

import logging
import threading

import numpy as np

log = logging.getLogger(__name__)

MIN_AUDIO_SECONDS = 0.3


class Transcriber:
    """Lazily loads a faster-whisper model and transcribes audio buffers."""

    def __init__(self, model_size: str, device: str, compute_type: str, language: str | None):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.language = language
        self._model = None
        self._load_lock = threading.Lock()

    def preload(self) -> None:
        """Load the model up front so the first dictation isn't slow."""
        self._get_model()

    def _get_model(self):
        with self._load_lock:
            if self._model is None:
                from faster_whisper import WhisperModel

                log.info("loading whisper model '%s' (%s/%s)...",
                         self.model_size, self.device, self.compute_type)
                self._model = WhisperModel(
                    self.model_size, device=self.device, compute_type=self.compute_type
                )
                log.info("whisper model loaded")
            return self._model

    def transcribe(self, audio: np.ndarray, sample_rate: int = 16000) -> str:
        if len(audio) < MIN_AUDIO_SECONDS * sample_rate:
            return ""
        model = self._get_model()
        segments, _info = model.transcribe(
            audio,
            language=self.language,
            vad_filter=True,
            beam_size=5,
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        log.info("transcribed %.1fs of audio -> %r", len(audio) / sample_rate, text)
        return text
