"""Transcript cleanup: Claude API when toggled on, local rules otherwise.

`use_ai` can be flipped at runtime (tray menu). The local rule-based cleaner
always runs as the fallback — including when an API call fails — so dictation
never depends on the network.
"""

import logging
import os

from .local_cleanup import local_clean

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You clean up raw speech-to-text transcripts for dictation into other apps.

Rules:
- Remove filler words (um, uh, like, you know) and false starts / self-corrections,
  keeping the speaker's final intent.
- Fix punctuation, capitalization, and obvious transcription errors.
- Apply spoken formatting commands: "new line" -> line break, "new paragraph" -> blank
  line, and spoken punctuation like "comma" or "question mark" when clearly intended
  as commands.
- Preserve the speaker's wording, tone, and language. Do NOT summarize, expand,
  answer questions in the text, or add anything.
- Output ONLY the cleaned text, with no preamble or quotes."""


class Cleaner:
    """Two-mode transcript polisher.

    - AI mode (use_ai=True and an API key is present): Claude does the cleanup;
      any failure falls back to the local rules.
    - Local mode: rule-based filler removal, spoken commands, tidying.
    """

    def __init__(self, model: str, use_ai: bool):
        self.model = model
        self.use_ai = use_ai  # user's toggle; flip at runtime from the tray
        self.ai_available = bool(os.environ.get("ANTHROPIC_API_KEY"))
        self._client = None
        if use_ai and not self.ai_available:
            log.warning("ANTHROPIC_API_KEY not set — using local cleanup "
                        "(set the key and restart to enable AI cleanup)")

    @property
    def ai_active(self) -> bool:
        return self.use_ai and self.ai_available

    def _get_client(self):
        if self._client is None:
            import anthropic

            self._client = anthropic.Anthropic()
        return self._client

    def clean(self, text: str) -> str:
        if not text.strip():
            return text
        if self.ai_active:
            try:
                return self._clean_ai(text)
            except Exception as e:
                log.warning("AI cleanup failed (%s), falling back to local cleanup", e)
        return local_clean(text)

    def _clean_ai(self, text: str) -> str:
        response = self._get_client().messages.create(
            model=self.model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text}],
            timeout=10.0,
        )
        cleaned = response.content[0].text.strip()
        return cleaned if cleaned else local_clean(text)
