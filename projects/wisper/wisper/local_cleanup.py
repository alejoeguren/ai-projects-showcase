"""Rule-based transcript cleanup — no API needed.

Does a cheap version of what the Claude pass does: strips filler words,
applies spoken dictation commands ("new line", "comma", ...), and tidies
spacing/capitalization. Whisper already punctuates reasonably well, so this
mostly polishes.
"""

import re

# Hesitation sounds that are safe to delete outright. Deliberately does NOT
# include "like" or "you know" — too often part of real sentences.
FILLERS = {"um", "umm", "uh", "uhh", "uhm", "er", "erm", "ah", "ahh", "hmm", "mhm", "mm"}

# Spoken dictation commands -> replacement text. Matched as whole words,
# case-insensitively, with surrounding punctuation Whisper may have added.
COMMANDS = [
    (r"new\s+paragraph", "\n\n"),
    (r"new\s+line", "\n"),
    (r"question\s+mark", "?"),
    (r"exclamation\s+(?:mark|point)", "!"),
    (r"full\s+stop", "."),
    (r"period", "."),
    (r"comma", ","),
    (r"semicolon", ";"),
    (r"colon", ":"),
    (r"open\s+paren(?:thesis)?", "("),
    (r"close\s+paren(?:thesis)?", ")"),
]

_FILLER_RE = re.compile(
    r"[,\s]*\b(?:" + "|".join(FILLERS) + r")\b[,.]*", re.IGNORECASE
)
_COMMAND_RES = [
    # eat punctuation/space Whisper stuck around the spoken command
    (re.compile(r"[,.\s]*\b" + pat + r"\b[,.]?", re.IGNORECASE), repl)
    for pat, repl in COMMANDS
]


def local_clean(text: str) -> str:
    if not text.strip():
        return text

    text = _FILLER_RE.sub(" ", text)

    for cmd_re, repl in _COMMAND_RES:
        text = cmd_re.sub(repl, text)

    # tidy whitespace: none before punctuation, single spaces, clean line edges
    text = re.sub(r"\s+([,.;:!?)])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # collapse doubled punctuation the substitutions may have produced
    text = re.sub(r"([,.;:!?])(?:\s*\1)+", r"\1", text)
    text = text.strip()

    # capitalize sentence starts (start of text, after . ! ?, after newline)
    text = re.sub(
        r"(^|[.!?]\s+|\n+)([a-z])",
        lambda m: m.group(1) + m.group(2).upper(),
        text,
    )
    return text
