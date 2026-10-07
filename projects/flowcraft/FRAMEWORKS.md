# Workflow & RACI Frameworks — Research Notes

Companion reference for **Flowcraft** (`index.html`). This summarizes the frameworks the
tool is built on, when to reach for each, and the optimization rules baked into the
recommendations engine — so you can explain the "why" behind any recommendation to a client.

---

## 1. Process mapping formats — which map for which job

| Format | What it shows | Use it when |
|---|---|---|
| **SIPOC** (Suppliers, Inputs, Process, Outputs, Customers) | One-row scope statement, 5–7 macro steps | Kicking off — aligning stakeholders on *what this process even is* before drawing detail. Flowcraft generates this as the blueprint header. |
| **Flowchart** | Linear sequence of tasks and decisions | Simple, single-owner processes; quick A-to-B explanations. |
| **Swimlane (cross-functional) diagram** | Steps grouped into lanes per role/department | Multiple people touch the work. Makes **handoffs and accountability visible** — this is Flowcraft's main output, because handoffs are where most waste hides. |
| **Value stream map** | Work time vs. wait time, queues, rework loops | Mature optimization: quantifying where time actually goes. A natural "phase 2" once you have cycle-time data from the measurement plan. |

**Pitfalls the research consistently flags:** too much detail too early, one-size-fits-all
mapping, and maps that are never updated. A map is a living document — re-run the interview
when the process changes.

## 2. Accountability frameworks — RACI and its cousins

**RACI** — Responsible (does the work) · Accountable (owns the outcome) · Consulted
(two-way input *before*) · Informed (one-way notice *after*).

The two golden rules Flowcraft enforces:
1. **Every step needs at least one R** — otherwise nobody is doing the work.
2. **Exactly one A per step** — shared accountability is no accountability.
   (Use **A/R** when the same person does it *and* owns it.)

Discipline tip: most RACI charts rot because people are marked **C** who only need to be
**I**. Consultation is blocking; information is not. Flowcraft flags steps with 4+ consulted
parties for exactly this reason.

### Variants and when they beat plain RACI

| Framework | Letters | Reach for it when |
|---|---|---|
| **RACI** | R·A·C·I | Task-level execution clarity. Default for process work — what Flowcraft uses. |
| **RASCI** | + Support | Small teams where several people actively help on one task; S credits hands-on helpers without diluting R. |
| **DACI** | Driver, Approver, Contributors, Informed | *Decisions*, not tasks — one Driver pushes a decision to conclusion. Good for project/clinical direction choices. |
| **RAPID** (Bain) | Recommend, Agree, Perform, Input, Decide | Strategic, high-stakes decisions with many stakeholders; separates who *recommends* from who *decides*. |

Key distinction from the research: **RAPID and DACI are decision-centric; RACI is
task-centric.** A common pattern is to use DACI/RAPID to decide *what* to do, then RACI to
execute it. In your practice: use Flowcraft's RACI for the operational workflow, and pull out
DACI when a client's problem is actually a stuck *decision*, not a stuck *process*.

## 3. Optimization rules in the recommendations engine

Each finding Flowcraft produces cites its framework:

- **Handoff count & ping-pong** (Lean: transport/waiting waste) — every handoff adds queue
  time and context loss; work returning to a role it already left signals late reviews or
  badly batched work.
- **Approval gates** (Lean: over-processing) — each gate is a queue; keep only those where
  the worst realistic outcome of removal is unacceptable.
- **Bottleneck detection** (Theory of Constraints) — the process moves at the speed of its
  slowest step; improve the constraint before optimizing anything else.
- **Automation candidates** (standard work → automation) — manual steps that are routine
  transfer/communication work (enter, copy, send, schedule, remind…) automate well;
  judgment steps don't. Automate the predictable, keep humans on judgment.
- **Single point of failure** (bus factor) — one role Responsible for >60% of steps means
  the process stops when they're out; cross-train and document.
- **Measurement & cadence** (DMAIC / PDCA) — no metric or no review rhythm is flagged high
  severity. Match review frequency to run frequency: a weekly-run process reviewed
  quarterly compounds problems for ~12 cycles before anyone looks.
- **Quality at the source** (jidoka) — rework bounce-backs are fixed upstream with
  checklists/templates at the origin step, ~10x cheaper than downstream inspection.
- **Visibility** (kanban) — a simple To do / Doing / Waiting / Done board makes queues seen
  instead of remembered; proactive status updates kill "where is it?" interruptions.

## 4. The interview structure (why these questions)

1. **Goal & scope** → forces a SIPOC-style outcome statement before any boxes are drawn.
2. **Steps** (owner, type, manual/auto, minutes, tool) → the data the swimlane and every
   lean heuristic needs.
3. **People & RACI** → accountability, validated live against the golden rules.
4. **Data & feedback** → your questions: what data points, what single success metric, and
   how often it's reviewed — the feedback loop that makes the workflow improvable.
5. **Pain points** → each maps to a known lean countermeasure, sharpening recommendations.

## 5. Discovery mode — eliciting workflows people can't articulate

Most clients don't know their own workflow; they know *stories* about it. Flowcraft's
discovery mode applies standard process-elicitation technique:

- **Ask for the last run, not the process.** "Walk me through the last time this happened"
  surfaces the *actual* process; "what's your process?" surfaces the idealized one. The gap
  between the two is usually where the problem lives.
- **Trigger and end-state first.** "What kicks it off?" and "how do you know it's done?"
  bound the process before any steps are named.
- **Parse the narrative into draft steps.** Sequence markers in natural speech ("then",
  "after that", "once", "eventually", "finally") reliably mark step boundaries; the actor
  named at the start of each fragment ("I…", "my bookkeeper…", "the client…") gives a
  first-pass owner.
- **Probe the gaps, not the whole map.** Follow-ups target only what's missing: unowned
  steps, shadow work ("any chasing, reminding, re-checking that isn't official?"), wait
  states ("where does work sit?"), and failure paths ("tell me about a time it went wrong").
  Shadow work and exception handling are where the real time goes — and they're exactly
  what people omit when asked to describe their process directly.
- **Hand off rough, refine structured.** Draft steps land in the step editor for cleanup;
  discovery's job is recall, not precision.

## Sources

- [RACI vs RASCI — Perfony](https://www.perfony.com/en/raci-rasci-raci-vs-which-variant-of-the-raci-matrix-is-right-for-you/)
- [RAPID vs DACI vs RACI — TimeTrex](https://www.timetrex.com/blog/rapid-vs-daci-vs-raci-frameworks)
- [DACI vs RACI guide — project-management.com](https://project-management.com/daci-vs-raci-model-guide/)
- [RAPID vs RACI and variants — Interfacing](https://interfacing.com/rapid-vs-raci)
- [Types of process maps — Moxo](https://www.moxo.com/blog/process-maps-types-business-process-modeling)
- [Process mapping guide — Asana](https://asana.com/resources/process-mapping)
- [Process mapping — Lucidchart](https://lucid.co/diagram/process-map/tutorial)
- [Lean process improvement — Qmarkets](https://www.qmarkets.net/resources/article/lean-process-improvement/)
- [Workflow optimization — Kissflow](https://kissflow.com/workflow/workflow-optimization-tips-to-sharpen-business-processes/)
- [Workflow optimization & bottlenecks — pmo365](https://pmo365.com/blog/workflow-optimisation)
