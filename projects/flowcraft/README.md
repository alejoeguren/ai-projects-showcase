# Flowcraft — Workflow Builder & Optimizer

A single-file web app that interviews you about a business process and produces a visual
**workflow blueprint**: a swimlane diagram, a RACI accountability matrix, a measurement plan,
and framework-cited optimization recommendations with a 0–100 flow score.

Built for use in consulting/practice sessions — no install, no build step, no server, no API
keys. Open `index.html` in Chrome or Edge and go.

## Features

- **Guided interview** — goal & scope, steps, people & RACI, data & feedback cadence, pain
  points. Every field supports **voice dictation** (Web Speech API, Chrome/Edge).
- **Discovery mode** — for clients who can't articulate their workflow. A chat-style
  interview asks for the story of the last real run, parses the narrative into draft steps
  (sequence markers + actor detection), then probes the gaps: unowned steps, shadow work,
  wait states, failure paths.
- **Swimlane diagram** — one lane per role; handoffs highlighted in orange; decision
  diamonds, approval gates, automation badges, per-step timings.
- **RACI matrix** — click-to-cycle cells (R / A / A/R / C / I) with live validation of the
  golden rules (≥1 R, exactly 1 A per step). Editable directly on the finished blueprint;
  score and findings recompute instantly.
- **Recommendations engine** — rule-based findings ranked by severity, each citing its
  framework: Lean waste (handoffs, ping-pong, approvals), Theory of Constraints
  (bottlenecks), RACI hygiene, automation candidates, bus-factor, feedback-loop cadence.
- **Editing** — drag or ▲▼ to reorder steps; ✎ shortcuts on every blueprint section jump
  back to the right interview screen.
- **Exports** — print/PDF blueprint, diagram → SVG/PNG, RACI + steps → CSV (Excel-ready),
  copy-as-text summary, and JSON save/load for per-client files.
- **Auto-save** — work persists in the browser (localStorage).

## Usage

1. Open `index.html` in Chrome or Edge (voice input needs mic permission on first use).
2. Either answer the structured interview, or hit **Start discovery interview** and just
   tell the story of the last time the process ran.
3. Generate the blueprint, click cells and edit links to refine, then export.

Click **Load example** in the header to see a finished blueprint immediately.

## Repository layout

| File | Purpose |
|---|---|
| `index.html` | The entire app — markup, styles, and logic, self-contained. |
| `FRAMEWORKS.md` | Research notes: process-mapping formats, RACI vs RASCI/DACI/RAPID, the optimization heuristics, and elicitation technique, with sources. |
| `.claude/launch.json` | Dev preview server config (`npx serve` on port 4173). |

## Development

No toolchain required. For a local server (nicer than `file://` for testing):

```sh
npx serve -l 4173 .
```

Everything — state model, analysis engine, SVG renderer, discovery parser — lives in the
single `<script>` block in `index.html`.
