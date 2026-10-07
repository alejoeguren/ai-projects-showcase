# PRD — Coffee Atlas (working name)

**Owner:** Ale
**Build target:** Fable (coding agent)
**Doc status:** v1 scope locked. Phase 0 spike is a hard gate before UI work.

---

## Problem Statement

I'm becoming a coffee nerd. I've noticed patterns on my own — Ethiopian coffees are floral, some origins consistently beat others — but I have no way to *learn the geography behind what I drink* or to *see my own palate as a map*. Every coffee I buy comes with origin details on the bag, but that information dies in a drawer. I want to understand terroir — the regions, elevations, varieties, and roasters behind my coffee — and I want my own drinking history to teach me which corners of the coffee world I actually love.

Existing apps don't do this. Brew-log apps (Beanconqueror) optimize extraction. Subscription apps (Siip, COFFI) use origin facts as a scan gimmick to funnel you into a box. Café-rating apps (Kava) rate shops. None of them makes **personal terroir-mapping the core loop**, and none turns a drinking history into a geographic learning tool.

## Solution

A mobile app where you photograph a coffee bag (or a café menu + the coffee you drank), and the app:

1. Adds the coffee to your personal history.
2. Plots two things on a map — the **roaster's location** and the **coffee's origin region**.
3. Surfaces **learning content** about that origin's terroir and that roaster's approach.

The **map is the home screen**, not a detail field. Over time it fills in, and you can toggle how it clusters — by **elevation, variety, roaster, or process** — and tap into any cluster to learn about that region or roaster. As your history grows, the app surfaces **flavor↔geography patterns** ("your floral coffees cluster in high-grown East African washed lots").

This is a **learning and self-insight tool**, explicitly *not* a brew optimizer, a shop rater, or a roaster rater.

### The structural bet (why this can work where others stalled)

Coffee has no persistent, rateable object — a roaster's seasonal lot exists for weeks, so community ratings never accumulate (this is why "Vivino for coffee" keeps failing). **Geography is the exception.** "Washed Yirgacheffe, 1900m+" is permanent, comparable across every roaster and season, and compounds the more you drink. Geography is coffee's equivalent of a Strava *segment* — the stable unit you hang everything else on. The app is built entirely on that persistent object.

---

## User Stories

1. As a coffee drinker, I want to photograph a coffee bag, so that its details are captured without manual typing.
2. As a coffee drinker, I want to photograph a café menu and mark the coffee I drank, so that café coffees enter my history too.
3. As a user, I want to confirm and correct the extracted details before saving, so that bad OCR doesn't corrupt my history.
4. As a user, I want each logged coffee to appear on a map showing its origin region, so that I can see where my coffee comes from geographically.
5. As a user, I want each logged coffee to also show its roaster's location, so that I understand the roaster-to-origin relationship.
6. As a user, I want the map to be my home screen, so that the geographic picture is the first thing I see.
7. As a user, I want my map to fill in from my very first scan, so that the app is rewarding at N=1.
8. As a user, I want to toggle clustering by elevation, so that I can see how the coffees I drink distribute across altitude.
9. As a user, I want to toggle clustering by variety, so that I can see which cultivars I gravitate toward.
10. As a user, I want to toggle clustering by roaster, so that I can see my roaster footprint.
11. As a user, I want to toggle clustering by process, so that I can see whether I lean washed, natural, honey, etc.
12. As a user, I want to tap a region on the map, so that I can read about its terroir — elevation range, typical flavor profile, history.
13. As a user, I want to tap a roaster, so that I can see their origin footprint and read about how they source and think about coffee.
14. As a user, I want to view an elevation→flavor lens, so that I can learn how altitude relates to flavor across my coffees — presented as a teaching pattern, with caveats, not a prediction.
15. As a user, once I've logged enough coffees, I want the app to surface flavor↔geography patterns in my own history, so that I learn what I actually like in geographic terms.
16. As a user, I want low-confidence patterns clearly hedged ("early pattern, 5 coffees"), so that I'm not misled by small samples.
17. As a user, I want my personal map to feel like an identity artifact I could show off, so that logging feels expressive, not administrative.
18. As a user, I want coffees whose origin is only known to country level to still plot (at a country centroid), so that nothing is lost from my history.
19. As a user, I want to browse a seeded set of well-known roasters and their catalogs even before I've scanned them, so that the atlas has depth on day one.
20. As a user, when I scan a bag from a roaster the app doesn't know, I want my own bag to plot immediately from its printed region, so that unknown roasters don't block me.
21. As a user, I want to edit or delete an entry in my history, so that I can fix mistakes.
22. As a user, I want my history to persist across sessions and devices, so that my atlas is durable.
23. As a reviewer (human or AI), I want new user-submitted coffees/roasters to land in a review inbox, so that the shared database stays clean.
24. As a reviewer, I want to approve or reject a submission, so that only trustworthy entries are promoted to the global database.

---

## Implementation Decisions

### Platform
- **Mobile-native via Expo / React Native** — one codebase, real camera + interactive map, installable. (Confirmed target: phone-first.)
- **Mapbox** for the map layer.

### Data model — three tiers + a review inbox
The database has three tiers to keep the shared data clean while never blocking the user:

- **Seed tier** — ~50 well-known roasters, catalogs hand-pulled from their public pages (roasters typically publish origin/region/elevation/variety/process per lot). Curated, trusted, present on day one.
- **Global tier** — entries reviewed and promoted from the inbox. Shared across all users.
- **Private tier** — a user's own scans that aren't yet in seed/global. They plot in **that user's history only** and never touch the shared database until reviewed.

**Review inbox:** any scanned coffee/roaster new to the app lands in an inbox for **human or AI review**. Approved entries are promoted to the global tier. This replaces any "confidence algorithm" — the reviewer is the gate.

### Geo pipeline — extract region, then geocode
This is the core mechanism and the highest-risk subsystem:

- Extract the **region string** printed on the bag/menu (e.g., "Yirgacheffe, Gedeb").
- **Geocode that string to a centroid** (Mapbox / Nominatim). This is *not* a farm-GPS lookup — no such source exists at farm level, and it isn't needed.
- **Precision is deliberately uneven and that is acceptable:** farm-level pin for Latin American estates that name a single farm; **subregion pin** for Ethiopian and other co-op/washing-station lots; **country centroid** for the long tail. The app plots at the best precision the bag supports.
- **Elevation is a stored field read off the bag**, not computed from a terrain model.

### Scan flow — confirm-and-correct
- The bag's own fields resolve **instantly** for the user (region text → geocode → pin). This is the fast path and must never block on network-heavy work.
- Extraction is **confirm-and-correct**: the user reviews and edits before saving. No silent auto-write.

### Roaster atlas — seeded now, on-demand later
- v1 roaster atlas is powered by the **50 seeded catalogs** + the user's own scans.
- If a scanned roaster isn't in the 50, the **user's own bags still plot** from their region strings; the roaster's full catalog simply isn't populated yet.
- **On-demand catalog scraping** for non-seed roasters is **v2**, and when built must be an **async background job**, never a synchronous scrape blocking the scan UI.

### Insight views — generate text, N-gated
- Cluster toggles (elevation / variety / roaster / process) recolor/regroup the map, and tapping a cluster **generates explanatory text** — the "intelligence tool" is the writeups, not just pins.
- **Flavor↔geography correlations** ("your florals cluster at 1900m+") are computed and surfaced, but **gated to ~15–20 logged coffees** and hedged with a confidence label below that threshold.
- Elevation→flavor is framed as a **teaching lens with caveats** (varietal/process/roast confound it), never as a predictor.

---

## Testing Decisions

Good tests here assert **external behavior**, not implementation. Priorities:

- **Geo pipeline (deep module, test in isolation):** given a region string, returns a correctly-tiered pin (farm / subregion / country). Test the fallback ladder explicitly — a co-op lot must resolve to subregion, an unparseable origin must fall to country centroid, nothing may silently drop.
- **Extraction confirm-and-correct:** given a scanned image's extracted fields, the user's edits are what persist — never the raw extraction if the user changed them.
- **Tier isolation:** a private-tier user scan must **never** appear in another user's global data until promoted through the inbox. This is the integrity-critical test.
- **N-gate:** correlation views must not surface (or must surface hedged) below the coffee-count threshold.

Aggregate/UI views (map rendering, cluster recolor) are lower-value to unit-test; cover the data they consume, not the pixels.

---

## Phase 0 — Extraction spike (GATE ZERO, do this before any UI)

**Do not build the map UI until this is done.** The product's ceiling is the accuracy of bag-photo → structured-geo extraction, and that ceiling is unknown.

- Take **~20 real coffee bags** (Ale's own) spanning origins — include Ethiopian co-op lots, Latin American estates, and mid-market grocery bags.
- Run the extraction pipeline on them.
- **Measure the hit rate** at each tier: farm-precise, subregion-precise, country-only, total failure.
- **That number is the product.** If farm-precision comes back on 3 of 20, that's fine — the app is a subregion-atlas — but Ale needs to know it before a single map screen exists, not after.

Output of Phase 0: a hit-rate table and a go / adjust / rethink call.

---

## Out of Scope (v1)

- **Brew optimization** — no grind/water/recipe/extraction tracking. (Beanconqueror owns this; not the product.)
- **Shop or roaster rating** — no scores, no reviews, no rankings. Learning, not judging.
- **Weather-as-prediction** — parked to v3. It's seductive and undeliverable: 1–2yr lag between weather and cup, processing dominates outcome, stress isn't linear, and farm-level weather data matched to lots doesn't cleanly exist.
- **On-demand catalog scraping** for non-seed roasters — v2, and async when built.
- **Farm-GPS precision** — the app geocodes region strings to centroids; it does not attempt exact farm coordinates.
- **Social feed / following / check-in stream** — the shareable artifact is the personal map, but the social graph is not v1.

---

## Further Notes / Open Risks

- **Biggest live assumption:** that an "approachable enthusiast" wants a terroir-learning map and isn't just satisfied by Beanconqueror or a subscription box. Cheapest validation beyond Phase 0: read the 1★/3★ reviews of Beanconqueror and Siip — the complaints are the spec.
- **Precision ceiling is accepted, not solved.** The map's magic is capped by the worst-documented bags. Region-blob pins for beloved Ethiopian coffees are a feature, not a bug — but the vision must survive that reality (confirmed it does).
- **Naming:** "Coffee Atlas" is a placeholder. Needs a real name before launch.
- **Seed count:** starting at 50 roasters. If Phase 0 or early build argues for fewer/more, adjust — but 50 is the v1 target.
