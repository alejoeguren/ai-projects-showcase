"""Load and reload app configuration and snippet definitions."""

import json
import logging
from pathlib import Path

log = logging.getLogger(__name__)

PROJECT_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = PROJECT_DIR / "config.json"
SNIPPETS_PATH = PROJECT_DIR / "snippets.json"

DEFAULTS = {
    "hotkey": "f8",
    "hotkey_mode": "hold",  # "hold" = push-to-talk, "toggle" = press to start/stop
    "whisper_model": "base",
    "whisper_device": "cpu",
    "whisper_compute_type": "int8",
    "language": None,  # None = autodetect, or e.g. "en", "es"
    "ai_cleanup": True,
    "cleanup_model": "claude-haiku-4-5-20251001",
    "snippets_enabled": True,
    "sounds": True,
}


def load_config() -> dict:
    cfg = dict(DEFAULTS)
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            cfg.update(json.load(f))
    except FileNotFoundError:
        log.warning("config.json not found, using defaults")
    except json.JSONDecodeError as e:
        log.error("config.json is invalid (%s), using defaults", e)
    return cfg


def load_snippets() -> dict[str, str]:
    try:
        with open(SNIPPETS_PATH, encoding="utf-8") as f:
            snippets = json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as e:
        log.error("snippets.json is invalid (%s), snippets disabled until fixed", e)
        return {}
    if not all(isinstance(k, str) and isinstance(v, str) for k, v in snippets.items()):
        log.error("snippets.json must map strings to strings")
        return {}
    return snippets
