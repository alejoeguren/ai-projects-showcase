# Coaching Review Grader

> **Status: in use.** A Notion AI agent, calibrated on 6 past sessions and now grading new ones automatically. There's no code: it's an agent, a database, and a rubric. This folder documents the design so it can be rebuilt anywhere.

I coach people. After every session, this agent reads the meeting transcript, scores my coaching against a rubric, and tells me **one specific thing to practice next time**. It has made me a measurably better coach.

## How it works

```
Coaching session recorded → transcript lands in my Notes database (Type = Coaching)
  → Gate: is there a substantive transcript?          (no → "Needs transcript", no score)
  → Gate: does a review for this note already exist?  (yes → stop, never duplicate)
  → Grade against rubric v1.0 + estimate coaching-vs-consulting mix + confidence
  → Create one Coaching Review page (scores as properties, write-up as body)
  → Dashboard updates: score trend, most common development area, current focus
```

## The rubric (v1.0)

Six weighted competencies, each scored 1.0–5.0 from **observable transcript behavior**. The overall score is the weighted average × 20, out of 100. The full anchors (what a 1, 3, and 5 look like) are in [`agent-instructions.md`](agent-instructions.md).

| Competency | Weight | What it looks for |
|---|---|---|
| Contracting & Focus | 10% | Did the session agree on what the client wants out of it? |
| Listening & Curiosity | 20% | Following the client's language and exploring before interpreting |
| Questions & Awareness | 25% | Short, open, non-leading questions that create new thinking. "Have you thought about X?" counts as advice. |
| Challenge & Depth | 15% | Respectfully testing assumptions, contradictions, and avoidance |
| Client Ownership | 20% | Did the *client* generate the options, the decision, and the action? |
| Action & Accountability | 10% | Learning turned into a specific, client-owned next step |

**Calibration rules:** 3 means competent, 4 is clearly strong, and 5 should be rare. Every score cites transcript evidence.

### The design choice that makes it work: consulting isn't penalized

Much of my coaching mixes in operator advice. A naive grader would mark down every time I give advice. This one doesn't. It estimates the **coaching/mentoring % vs consulting %** for the session, then grades each consulting moment separately:

- **Was the mode switch clear?** Yes / Partially / No / Not necessary
- **Effect:** Helpful / Neutral / Counterproductive
- Did it add expertise and unblock the client, or did it solve the problem prematurely and take ownership away?

## The agent's instructions

The complete instructions the agent runs with are in [`agent-instructions.md`](agent-instructions.md): eligibility gates, evaluation philosophy, the full rubric, required properties, review body, dashboard update, and completion behavior. That one page is the whole agent.

## What each review contains

See [`review-template.md`](review-template.md). In short:
1. Session summary (2–4 sentences)
2. Scorecard with a short evidence-based rationale per competency
3. What went well (2–3 specific behaviors)
4. Biggest development opportunity (exactly one)
5. Missed coaching moment, with an excerpt
6. **A stronger question** I could have asked at that moment
7. Assessment of each consulting intervention
8. **Focus for next session:** one observable behavior, small enough to practice immediately

## Database design

See [`database-schema.md`](database-schema.md). Each review stores scores, mode mix, development area, confidence, and the **rubric version**, so if the rubric changes later, old and new scores aren't silently compared.

## How it was built (the process matters more than the prompt)

1. **Spec first.** Wrote the rubric, evidence standard, and output structure.
2. **Build the database and template; grade by hand first.** Automating an uncalibrated grader gives you precise-looking scores that mean nothing.
3. **Calibrate on history.** Graded all 6 past sessions, then **re-graded one blind** to test consistency. The rubric held, so it stayed at v1.0.
4. **Then automate,** with safeguards: never invent evidence, never duplicate, route failures to "Needs review", and require mode percentages that add up to about 100%.
5. **Test set before go-live:** mostly-coaching session, heavy-but-helpful consulting, advice disguised as questions, incomplete transcript, the same note processed twice, no action commitment, and a session where the client generated the solution.

## What it found

Baseline across six sessions: **average 62.5 / 100** (range 58.9–66.3). The primary development area was **Client Ownership in 5 of 6 sessions**, with a mode mix of about 43% coaching and 57% consulting. The pattern: useful operator advice arriving *before* the client had interpreted the situation themselves. The current practice focus that came out of it: *after explaining something, pause and ask the client to state their interpretation and one option before I recommend anything.* The most recent session scored higher on exactly that.

## Where else this applies

Anything with a transcript and a standard: sales calls, customer support, interviews, onboarding, barista or café training. The ingredients are a rubric that names observable behaviors, evidence-cited scoring, one focus at a time, and a trend line.
