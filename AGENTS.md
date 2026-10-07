# Guide for AI assistants reading this repo

This is a **read-only portfolio snapshot** of independent AI projects, gathered so a reader (often with an AI assistant) can understand what was built and how. Nothing here connects to live services: keys and project IDs are placeholders.

## Start here

1. `README.md`: overview, status of each project (live / working / prototype), and lessons learned.
2. Each folder under `projects/` has its own README. Read that before the code.
3. `skills/` and `notion-agents/` are instruction and design documents, not code.
4. `client-work/` describes client projects in prose only. There is no code for them here, by design.

## Fastest path to "how does this work?"

| Question | Read |
|---|---|
| How does the AI mock interviewer grade answers? | `projects/mba-prep-pro/supabase/functions/evaluate-interview/index.ts` |
| How is the live voice interviewer set up? | `projects/mba-prep-pro/supabase/functions/realtime-session/index.ts` |
| How does the AI podcast pipeline work end to end? | `projects/vitals-and-signals/scripts/research.py`, then `publish.py` |
| How does photo → structured data → map pin work? | `projects/cherry-bean/phase0/extract.mjs` and `hit-rate.md`, then `projects/cherry-bean/cherry-bean/src/lib/geocode.ts` |
| What's the coffee app's product thinking? | `projects/cherry-bean/coffee-atlas-prd.md` |
| How is a coaching transcript graded? | `notion-agents/coaching-review-grader/README.md`, then `agent-instructions.md` |
| What API integrations have been built for clients? | `client-work/README.md` |
| How does the website audit collect data? | `projects/website-audit/src/audit.js` and `.claude/skills/website-audit/SKILL.md` |
| How does the workflow mapper analyze a process? | `projects/flowcraft/index.html` (single file) and `FRAMEWORKS.md` |

## Conventions

- Status labels matter: **prototypes** (Cherry Bean, Wisper) were quick explorations and aren't production code.
- `<PLACEHOLDER>` values and `YOUR_…` / `REPLACE_ME` strings are intentional redactions.
- Lockfiles and generated UI components (`src/components/ui/` in MBA Prep Pro) are boilerplate. Skip them.
