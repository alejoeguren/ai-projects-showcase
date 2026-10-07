# Phase 0 — Extraction hit-rate

Run: 2026-07-06T22:14:08.090Z · Extraction: Claude vision (in-session) · Geocoder: Nominatim · Bags: 7 (of ~20 planned)

## Summary

| Tier | Count | Rate |
|---|---|---|
| Farm-precise | 0 | 0% |
| Subregion | 5 | 71% |
| Country-only | 1 | 14% |
| Total failure | 1 | 14% |

**Usable pin rate: 86%**

## Per-bag detail

| Bag | Roaster | Country | Region string | Farm/producer | Tier | Geocoded to |
|---|---|---|---|---|---|---|
| archers-ethiopia-daye-bensa | Archers | Ethiopia | Hamasho Village, Sidama Bensa | Hamasho Village | **subregion** | ሲዳማ ክልል Sidama سيداما, ኢትዮጵያ |
| sightglass-colombia-la-magdalena | Sightglass | Colombia | La Magdalena, Tolima | — | **subregion** | La Magdalena, Espinal, Centro, Tolima, RAP (Especial) Central, 733520, Colombia |
| unido-geishify | Unido Panama Coffee Roasters | Panama | — | — | **country** | Panamá |
| boy-and-bear-shoondisa | The Boy & The Bear | Ethiopia | Guji | Sookoo Coffee | **subregion** | Guji, ኦሮሚያ ክልል Oromia أوروميا, ኢትዮጵያ |
| equator-las-rosas | Equator Coffees | Colombia | Huila | — | **subregion** | Huila, RAP (Especial) Central, Colombia |
| feast-palmera | Feast Coffee & Culture | Colombia | Huila | — | **subregion** | Huila, RAP (Especial) Central, Colombia |
| boy-and-bear-dynamic-espresso | The Boy & The Bear | — | — | — | **failure** | — |

## Notes on the misses and near-misses

- **The one "failure" is correct behavior**, not a pipeline bug: the Dynamic Espresso box prints no origin at all. In-app it lands in confirm-and-correct where the user can type a country (or leave it unplotted). Nothing silently dropped.
- **Extraction itself went 7 for 7** — every field printed on a bag was read correctly, including Amharic-adjacent lot names ("Shoondisa"), variety codes (74158, Ethiogibirinna 74110), and Spanish-language labels (Unido).
- **Archers (Sidama Bensa):** compound Ethiopian admin names don't geocode as printed; the word-level fallback rung rescued it to the Sidama region. Choosing the *most specific* word hit ("Bensa" → Bensa Daye, place_rank 24) instead of first-hit ("Sidama", place_rank 8) is the top production refinement.
- **Sightglass (La Magdalena, Tolima):** matched a "La Magdalena" in Espinal, Tolima — right department, but plausibly a homonym of the actual community near Planadas. "Wrong-but-plausible locality inside the right parent region" is the pipeline's main precision hazard; a production mitigation is to prefer matches whose parent chain contains the printed department AND display the pin with honest imprecision (department-scale zoom) when the locality is ambiguous.
- **Farm-precise: 0 of 7.** Neither "Hamasho Village" nor "Sookoo Coffee" exists in OSM. This confirms the PRD's expectation — farm pins will be rare and the app is, in practice, a subregion atlas.

## The call: **GO** (provisional — N=7, not 20)

86% of bags produce a usable pin, and 5 of 7 land at subregion precision — comfortably above the bar where a terroir map is rewarding at N=1. The failure mode that exists (blends/espresso boxes with no printed origin) is handled by design via confirm-and-correct. Caveats before calling it final:

1. **N=7 and skewed toward specialty bags.** The planned mid-market grocery bags are missing from the sample — that's the segment most likely to print vague origins ("100% Arabica"). Add a few when convenient; the go call could soften if grocery bags dominate real usage.
2. Geocode quality, not extraction, is the binding constraint. Two production refinements identified: most-specific-word-hit selection, and parent-region validation of matches.
