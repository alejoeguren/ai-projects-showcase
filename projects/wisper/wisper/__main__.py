"""Entry point: python -m wisper"""

import logging
import threading

from . import config
from .cleanup import Cleaner
from .dictation import DictationController
from .overlay import Overlay
from .snippets import SnippetEngine
from .transcriber import Transcriber
from .tray import Tray

log = logging.getLogger("wisper")


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    cfg = config.load_config()

    transcriber = Transcriber(
        model_size=cfg["whisper_model"],
        device=cfg["whisper_device"],
        compute_type=cfg["whisper_compute_type"],
        language=cfg["language"],
    )
    cleaner = Cleaner(model=cfg["cleanup_model"], use_ai=cfg["ai_cleanup"])
    snippet_engine = SnippetEngine(config.load_snippets(), enabled=cfg["snippets_enabled"])

    tray = Tray(
        snippet_engine=snippet_engine,
        cleaner=cleaner,
        on_reload=lambda: _reload(snippet_engine),
        on_quit=lambda: None,
    )

    overlay = Overlay()

    def on_state(state: str) -> None:
        tray.set_state(state)
        overlay.set_state(state)

    dictation = DictationController(
        transcriber=transcriber,
        cleaner=cleaner,
        hotkey=cfg["hotkey"],
        mode=cfg["hotkey_mode"],
        sounds=cfg["sounds"],
        on_state=on_state,
    )
    overlay.level_source = lambda: dictation.recorder.level

    snippet_engine.start()
    dictation.start()

    # Load the whisper model in the background so the tray appears immediately.
    threading.Thread(target=transcriber.preload, daemon=True).start()

    log.info("Wisper running — hold '%s' to dictate, type a snippet trigger to expand",
             cfg["hotkey"])
    tray.run()  # blocks until Quit


def _reload(snippet_engine: SnippetEngine) -> None:
    snippet_engine.set_snippets(config.load_snippets())
    log.info("reloaded snippets (%d triggers). Config changes to hotkey/model "
             "take effect on restart.", len(snippet_engine.snippets))


if __name__ == "__main__":
    main()
