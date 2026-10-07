# Skills

Claude skills I've built and run. A skill is a markdown file of instructions that Claude loads when a task calls for it. Some of these run on a schedule with no one prompting them.

These are templates. Notion IDs, file paths, and business specifics are replaced with `<PLACEHOLDERS>`, but the structure and the judgment rules are what I actually use.

| Skill | Runs | What it does |
|---|---|---|
| ⭐ [`memory-maintenance`](memory-maintenance/SKILL.md) | Every 2 weeks | **The one I'd recommend first.** Claude reads its memory files at the start of *every* conversation, so whatever is in them is paid for in tokens every time and competes for Claude's attention. Left alone they only grow. This keeps them lean: it compresses entries to two sentences, archives finished projects, holds the main file under 150 lines, logs every change, and flags anything ambiguous instead of guessing. The result is lower token usage on every session and sharper context. |
| [`chief-of-staff-checkin`](chief-of-staff-checkin/SKILL.md) | Weekly | Founder accountability check-in. Classifies last week's commitments as done, drift, pivot, or avoidance; updates a log of business assumptions with new evidence; ties next week's commitments to the assumption each one tests. Built to push back, not to cheerlead. |
| [`agent-hub-runner`](agent-hub-runner/SKILL.md) | Hourly | Watches a Notion inbox. Each request I drop in gets routed to a specialist agent (research, content, planning, podcast), executed, and logged back to Notion. Notion is the interface; the agents are the back office. |
| [`website-audit`](../projects/website-audit/.claude/skills/website-audit/SKILL.md) | On demand | Lives inside the Website Audit project. Say "audit example.com" and it runs the whole audit. |

See also [`notion-agents/coaching-review-grader`](../notion-agents/coaching-review-grader/), the same idea built as a Notion agent instead of a Claude skill.

## The pattern

Most of these follow the same shape: **read context from a system of record → do the work → write results back to that system → log what happened → escalate what's ambiguous to a person.** That shape transfers to most internal ops work.
