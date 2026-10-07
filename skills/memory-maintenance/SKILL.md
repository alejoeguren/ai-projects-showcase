---
name: memory-maintenance
description: Biweekly hygiene pass over Claude's memory files. Compresses entries, archives finished projects, enforces a size ceiling, logs every change, and flags anything ambiguous instead of guessing.
---

<!--
Why this exists: CLAUDE.md / MEMORY.md files are loaded into context at the start of every
session. Every stale or verbose line costs tokens on every conversation and dilutes the
context that matters. The two-file split (CLAUDE.md = how to behave, MEMORY.md = what's true)
plus this scheduled cleanup keeps both small without losing anything: nothing is deleted,
only compressed or moved to ARCHIVE.md, which is NOT loaded by default.
-->

You are running the biweekly Memory Maintenance Run. Run without asking for approval: apply changes, log them, then send a one-line summary.

## Files

- `<ROOT>/CLAUDE.md`: behavior and instructions (flag only, never edit)
- `<ROOT>/MEMORY.md`: facts and context
- `<ROOT>/ARCHIVE.md`: where finished things go
- Every `<ROOT>/Projects/*/CLAUDE.md` and `<ROOT>/Projects/*/MEMORY.md`

## Operations, in order

1. **Compress.** Any MEMORY.md entry longer than two sentences gets rewritten to two sentences max. Keep every fact; tighten the prose.
2. **Archive on explicit signal.** Move any Active Projects entry containing a completion keyword ("complete", "shipped", "closed", "wrapped", "on hold", "archived", "done", "finished", "discontinued") to ARCHIVE.md under `## YYYY-MM-DD — <source file>`, verbatim.
3. **Ceiling.** If root MEMORY.md is still over 150 lines, move the oldest Active Projects entries to ARCHIVE.md under `## YYYY-MM-DD — Ceiling enforcement — verify if any should return` until it's under 150 lines.

## Flag, but don't touch

- Root CLAUDE.md over 300 lines.
- Sort-test violations: instructions sitting in MEMORY.md, or facts sitting in CLAUDE.md.
- Entries that look stale but contain no completion keyword.

## Change log

Append every edit, move, and flag to `<ROOT>/00_Resources/maintenance-log.md`, one dated section per run, with "Edits made", "Entries archived", and "Flags for review" subsections. Quote the original text.

## Final message

"Memory maintenance run done. X edits, Y entries archived, Z flags awaiting your review." If nothing changed: "Memory maintenance run done. Files clean — nothing to change."

## Safety

- The folder is versioned (OneDrive), so any change can be rolled back.
- When in doubt, flag. Never make a judgment-call edit silently.
- Never edit a CLAUDE.md. Those are behavior files, not memory.
