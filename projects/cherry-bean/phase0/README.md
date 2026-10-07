# Phase 0 — Extraction spike (GATE ZERO)

Per the PRD, no UI gets built until we know the bag-photo → structured-geo
hit rate. This harness measures it.

## What it does

For each bag photo in `bags/`:

1. **Extract** — sends the photo(s) to Claude vision and pulls structured
   fields: roaster, country, region string, farm/producer, elevation,
   variety, process, tasting notes.
2. **Geocode** — runs the PRD's fallback ladder against Nominatim (free, no
   key): farm+region+country → region+country → country. A farm or region
   query that only matches the country boundary falls through to the next rung.
3. **Tier** — classifies each bag as `farm` / `subregion` / `country` /
   `failure` and writes the hit-rate table.

Outputs: `hit-rate.md` (the go / adjust / rethink table) and `results.json`
(full detail including raw extracted fields for manual verification).

## How to run

1. Drop ~20 bag photos into `bags/`. JPG/PNG/WebP — **iPhone HEIC must be
   converted to JPEG first** (the API doesn't accept HEIC). If a bag needs
   front + back shots, name them `bagname-1.jpg` and `bagname-2.jpg` and
   they'll be sent together as one bag.
2. Run:

   ```powershell
   $env:ANTHROPIC_API_KEY = "sk-ant-..."
   node extract.mjs
   ```

Needs Node 18+ (you have 24). No npm install required — zero dependencies.
Geocoding is rate-limited to 1 request/second per Nominatim's usage policy,
so ~20 bags takes a couple of minutes.

`SPIKE_MODEL` env var overrides the extraction model (default `claude-sonnet-5`).

## Reading the result

- The **usable pin rate** (farm + subregion + country) is the headline.
- Farm-precision on only a handful of bags is expected and fine — the PRD
  accepts an uneven-precision atlas.
- **Cross-check extracted fields against the physical bags.** A wrong region
  string that geocodes somewhere plausible is the most dangerous failure mode
  and won't show up in the tier counts.
