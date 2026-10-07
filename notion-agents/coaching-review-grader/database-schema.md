# Coaching Reviews — database schema

| Property | Type | Notes |
|---|---|---|
| Session | Title | |
| Related Note | Relation (one-way) → Notes | Source transcript. One-way so the Notes database isn't modified. Also used for duplicate prevention. |
| Session Date | Date | |
| Graded Date | Date | |
| Contracting & Focus | Number (1–5) | |
| Listening & Curiosity | Number (1–5) | |
| Questions & Awareness | Number (1–5) | |
| Challenge & Depth | Number (1–5) | |
| Client Ownership | Number (1–5) | |
| Action & Accountability | Number (1–5) | |
| Overall Score | Formula (0–100) | Rolled up from the six competencies |
| Coaching/Mentoring % | Number | Approximate; with Consulting %, should total ~100 |
| Consulting % | Number | Does **not** mechanically lower the score |
| Consulting Effectiveness | Select | Helpful / Neutral / Counterproductive / Not Material |
| Primary Development Area | Select | Exactly one per review; feeds the "most common" view |
| Next Session Focus | Text | One observable behavior |
| Review Confidence | Select | High / Medium / Low |
| Rubric Version | Text | e.g. `v1.0`, so trends are only compared within a version |
| Review Status | Select | Pilot / Complete / Needs transcript / Needs review |

**Views:** Recent Reviews · Grouped by Primary Development Area · Overall score trend · (after 5+ sessions) trailing 5-session averages per competency.

**Trigger:** Notes record with `Type = Coaching` → agent runs with the gates described in the README.
