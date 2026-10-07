# Cherry Bean (working name: Coffee Atlas)

> **Status: prototype / exploration.** Built over a couple of days to test an idea; not under active development.

A mobile app for learning coffee geography from what you actually drink. Photograph a coffee bag, and the app logs it, pins the coffee's **origin region** and the **roaster** on a map, and over time shows your palate as a map — clustered by elevation, variety, process, or roaster.

The bet: coffee has no persistent, rateable object (a roaster's lot lasts weeks), which is why "Vivino for coffee" keeps stalling. **Geography is the exception** — "washed Yirgacheffe, 1900m+" is permanent and comparable across every roaster and season. The app hangs everything on that.

## What's here

| Path | What it is |
|---|---|
| [`coffee-atlas-prd.md`](coffee-atlas-prd.md) | Product requirements: problem, solution, 24 user stories, scope, phased plan. Written to be handed to a coding agent. |
| [`phase0/`](phase0/) | **Gate-zero spike**: can Claude vision read a bag photo and turn it into a map pin? Zero-dependency Node script → Claude extraction → OpenStreetMap geocoding ladder (farm → subregion → country). |
| [`phase0/hit-rate.md`](phase0/hit-rate.md) | The result: extraction 7/7 correct, **86% usable pin rate**, call = GO (provisional, N=7). |
| [`cherry-bean/`](cherry-bean/) | Expo (React Native) app: map home screen, history, coffee detail, confirm-and-correct entry form, facet clustering, geocoding with fallback, local persistence. Seeded with the Phase 0 bags. Runs on iOS, Android, and web. |

## How it was built

PRD first, then a measurement spike that had to pass before any UI was written, then the app — all with Claude Code. The camera-scan flow (wiring Phase 0 extraction into the app) is the next unbuilt step.

## Run the app

```bash
cd cherry-bean
npm install
npx expo start      # or: npm run web
```

Run the spike: `cd phase0 && node extract.mjs` (needs `ANTHROPIC_API_KEY` set; see `phase0/README.md`).
