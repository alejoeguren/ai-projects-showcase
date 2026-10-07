# AI Projects: what I've been building

Hi! This is a snapshot of the AI projects I've built over the past year, collected in one place so they're easy to look through (or to point an AI assistant at). Almost all of it was built with Claude Code as my engineering partner.

Some of these are real, working systems I use every week. Others are prototypes I built in a day or two to test an idea and then set aside. Each one is labeled so you know which is which.

## At a glance

| Project | Status | What it is | Built with |
|---|---|---|---|
| [MBA Prep Pro](projects/mba-prep-pro/) | **Live product (beta)** | AI mock interviews for MBA applicants: a live voice interview with an AI interviewer, then a scored evaluation with specific feedback. Payments, admin, usage tiers. | React, Supabase, OpenAI Realtime, Stripe |
| [Vitals & Signals](projects/vitals-and-signals/) | **Working pipeline** | A weekly AI-in-healthcare podcast. AI researches and writes it, I approve in Notion, then it's voiced and published automatically. | Python, Claude, Notion, ElevenLabs, GitHub as host |
| [Coaching Review Grader](notion-agents/coaching-review-grader/) | **In use** | A Notion agent that grades my coaching-session transcripts against a rubric and gives me one thing to practice next time. | Notion AI agent + database |
| [Skills](skills/) | **In use** | Scheduled Claude "skills": a memory-maintenance routine that cuts token usage, a chief-of-staff accountability check-in, and an inbox-to-agent router. | Claude skills, Notion |
| [Website Audit](projects/website-audit/) | **Working tool** | "Audit example.com" produces an interactive report on SEO, AI-search visibility, speed, mobile, and messaging, plus competitor comparisons. | Node, Puppeteer, Lighthouse, Claude |
| [Flowcraft](projects/flowcraft/) | **Working tool** | Interviews you about a business process and outputs a swimlane diagram, a RACI chart (who does what), and recommended fixes. One HTML file with no setup. | Vanilla JS |
| [Cherry Bean](projects/cherry-bean/) ☕ | **Prototype** | Photograph a coffee bag; the app reads it with AI and pins the origin region and the roaster on a map, building your palate as a map over time. | Expo / React Native, Claude vision |
| [Wisper](projects/wisper/) | **Prototype** | My own voice-dictation tool for Windows: hold a key, talk, and cleaned-up text appears wherever you're typing. | Python, local Whisper, Claude |

## A few things worth a closer look

- **Cherry Bean's Phase 0 test** ([`projects/cherry-bean/phase0/hit-rate.md`](projects/cherry-bean/phase0/hit-rate.md)). Before building any app screens, I tested whether AI could reliably read a coffee bag photo and turn it into a map location. It read 7 of 7 bags correctly, and 86% produced a usable map pin. Test the risky part first, then build.
- **MBA Prep Pro's grader** ([`evaluate-interview`](projects/mba-prep-pro/supabase/functions/evaluate-interview/index.ts)). This is what turning "give feedback" into a consistent, explainable score looks like in practice.
- **The Coaching Review Grader's design** ([README](notion-agents/coaching-review-grader/)). No code at all, and probably the thing that has helped me most. The lesson: calibrate by hand before you automate.

## What I've learned about doing this well

1. **Start with the boring, repetitive work.** The best wins (research, first drafts, grading, reporting, inbox triage) are tasks someone already does every week.
2. **Keep a human approval step.** The podcast doesn't publish until I approve it in Notion. Reviews flag low confidence instead of guessing. AI does the volume and a person makes the call.
3. **Test the risky assumption first.** Cherry Bean's photo test came before any UI. The coaching grader was calibrated on old sessions before it was automated.
4. **Use the tools the team already uses.** Notion, email, and spreadsheets are the interface. Nobody has to learn a new app.
5. **Prototypes are cheap now.** Wisper and Cherry Bean each took about a day. That changes which ideas are worth trying.

## What could be done for a business like yours

Some starting ideas. The right ones depend on where your team's time actually goes:

- **Turn photos and documents into data.** The Cherry Bean extraction works on anything printed: green-coffee spec sheets, invoices, delivery slips, competitor bags on a shelf.
- **Grade conversations against a standard.** The coaching grader works for any transcript: café or barista training, wholesale sales calls, customer service.
- **Map a process before automating it.** Flowcraft is how I'd start: draw the current workflow, find the handoffs and bottlenecks, then decide what AI should take on.
- **Recurring content with an approval gate.** The Vitals & Signals pipeline works for a newsletter, an origin story per release, or social posts. AI drafts it and you approve it.
- **Weekly reporting without the busywork.** I've built dashboards for clients that pull from marketing and analytics tools into one weekly view. They're not included here because they belong to clients, but the pattern is easy to reuse.
- **See how you show up in AI search.** Website Audit checks whether ChatGPT, Claude, and Perplexity can find and cite your site.

## Notes on this repo

- It's a **snapshot**. The real projects live in their own repos, and this copy won't connect to any live backend.
- Keys, project IDs, personal emails, and anything client-related have been removed or replaced with placeholders.
- To explore it with an AI assistant, point it at this repo. [`AGENTS.md`](AGENTS.md) tells it where to start.
