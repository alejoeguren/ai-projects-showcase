> **Status: prototype.** Built in a day or two to see whether a homemade Wispr Flow was practical. It works, but it was never developed further.

# Wisper

Your own Wispr Flow: hold a key, speak, and clean text appears in whatever app has
focus — plus **text snippets**: type `'cal` anywhere and it expands into your
calendar link.

Everything runs locally (faster-whisper on CPU) except the optional AI cleanup
pass, which uses the Claude API.

## Run it

Double-click **`Wisper.bat`** (console with logs) or **`Wisper-silent.bat`**
(background, tray only). A gray mic icon appears in the system tray.

- **Dictate:** hold **F8**, speak, release. A small ball appears in the
  bottom-right corner — red and pulsing with your voice while you talk, then
  breathing blue while it transcribes — and the text is pasted at your cursor.
  The tray icon mirrors the same states, and beeps mark start / stop / done.
  The ball never steals focus from the app you're dictating into.
- **Snippets:** type a trigger anywhere and it's instantly replaced:

  | Trigger  | Expands to                        |
  |----------|-----------------------------------|
  | `'cal`   | your Google Calendar link         |
  | `'email` | you@example.com            |
  | `'date`  | today's date (2026-07-06)         |
  | `'time`  | current time (15:22)              |

## Transcript cleanup: two modes

Every transcript gets cleaned before it's typed. Toggle the mode from the tray
menu (**AI cleanup (Claude)** checkbox) or set the startup default with
`ai_cleanup` in `config.json`:

- **AI cleanup ON** — a fast Claude Haiku pass: filler words and false starts
  removed, punctuation fixed, spoken commands honored, tone preserved. Needs an
  API key; if a call fails (offline, rate limit), it silently falls back to
  local rules so dictation never breaks.
- **AI cleanup OFF (local rules)** — no network at all. Strips hesitation
  sounds (um, uh, er…), applies spoken commands, and tidies spacing and
  capitalization.

Spoken commands both modes understand: `new line`, `new paragraph`, `period` /
`full stop`, `comma`, `question mark`, `exclamation mark`, `colon`, `semicolon`,
`open paren` / `close paren`. Note the local rules apply these words literally —
if you dictate a sentence *about* commas, toggle AI mode on (Claude judges intent).

To enable AI mode, set your key and restart Wisper:

```powershell
[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
```

## Customizing

**Snippets** — tray menu → *Edit snippets…* (or edit `snippets.json`), then tray
menu → *Reload config & snippets*. Format is trigger → expansion; `{date}` and
`{time}` are replaced at expansion time. Multi-line expansions use `\n`.

**Config** — `config.json` (restart to apply):

| Key | Default | Notes |
|-----|---------|-------|
| `hotkey` | `f8` | any key name the `keyboard` lib knows (`f9`, `scroll lock`, …) |
| `hotkey_mode` | `hold` | `hold` = push-to-talk, `toggle` = press to start/stop |
| `whisper_model` | `base` | `tiny`/`base`/`small`/`medium` — bigger = more accurate, slower |
| `language` | `null` | autodetect; set `"en"` or `"es"` to pin |
| `ai_cleanup` | `true` | startup default for the cleanup mode; needs `ANTHROPIC_API_KEY`, else local rules are used. Toggleable live from the tray |
| `snippets_enabled` | `true` | also toggleable from the tray menu |
| `sounds` | `true` | record/stop/done beeps |

## Start with Windows (optional)

Put a shortcut to `Wisper-silent.bat` in `shell:startup` (Win+R → `shell:startup`).

## How it works

```
hold F8 ──> mic capture (sounddevice, 16 kHz)
release ──> faster-whisper (local, CPU int8) ──> cleanup (Claude Haiku or local rules)
        ──> clipboard-paste into focused app (clipboard is restored after)

keystrokes ──> global hook buffers recent chars ──> trigger matched?
           ──> backspace the trigger, paste the expansion
```

Source layout: `wisper/` package — `audio.py` (mic), `transcriber.py` (whisper),
`cleanup.py` (Claude), `local_cleanup.py` (rule-based fallback), `injector.py`
(paste/backspace), `snippets.py` (hotstrings), `overlay.py` (recording ball),
`dictation.py` (pipeline), `tray.py` (icon/menu), `__main__.py` (wiring).
