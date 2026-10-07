#!/usr/bin/env node
/**
 * Cherry Bean — Phase 0 extraction spike.
 *
 * Pipeline per bag: photo(s) → Claude vision extraction → geocode fallback
 * ladder (farm → subregion → country) → precision tier.
 *
 * Output: results.json (full detail) and hit-rate.md (the table that IS the
 * product decision, per the PRD).
 *
 * Usage:
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   node extract.mjs
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BAGS_DIR = path.join(HERE, "bags");
const MODEL = process.env.SPIKE_MODEL ?? "claude-sonnet-5";
const API_KEY = process.env.ANTHROPIC_API_KEY;

const MEDIA_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const EXTRACTION_PROMPT = `These are photos of a coffee bag label (possibly front and back of the same bag).
Extract exactly this JSON object, using null for any field not printed on the bag. Do not guess or infer values that are not visible.

{
  "roaster": "roaster name",
  "roaster_location": "city/country of the roaster if printed",
  "coffee_name": "name of the coffee/lot",
  "country": "origin country",
  "region_string": "the most specific origin locality printed, e.g. 'Gedeb, Yirgacheffe' or 'Huila'",
  "producer_or_farm": "named farm, finca, estate, producer, co-op, or washing station, if any",
  "elevation": "elevation as printed, e.g. '1900-2100 masl'",
  "variety": "cultivar(s), e.g. 'Heirloom', 'Caturra, Bourbon'",
  "process": "e.g. 'washed', 'natural', 'honey'",
  "tasting_notes": "flavor notes as printed"
}

Respond with ONLY the JSON object, no other text.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "Hamasho Village" + "Hamasho Village, Sidama Bensa" → one Hamasho Village. */
function dedupeTokens(parts) {
  const seen = new Set();
  return parts
    .filter(Boolean)
    .flatMap((p) => p.split(",").map((t) => t.trim()))
    .filter((t) => {
      const k = t.toLowerCase();
      if (!t || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(", ");
}

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

/** Group files like "onyx-1.jpg" + "onyx-2.jpg" into one bag. */
function groupImages(files) {
  const groups = new Map();
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!MEDIA_TYPES[ext]) continue;
    const key = path.basename(f, ext).replace(/[-_]\d$/, "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  return groups;
}

async function extractFields(imagePaths) {
  const content = [];
  for (const p of imagePaths) {
    const data = await readFile(p);
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: MEDIA_TYPES[path.extname(p).toLowerCase()],
        data: data.toString("base64"),
      },
    });
  }
  content.push({ type: "text", text: EXTRACTION_PROMPT });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  const text = body.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(stripFences(text));
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "cherry-bean-phase0-spike/0.1 (you@example.com)" },
  });
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ?? null;
}

/**
 * The fallback ladder from the PRD: try farm-level, then subregion, then
 * country centroid. Nothing may silently drop — an unparseable origin lands
 * on "failure", never disappears.
 *
 * Nominatim fails on compound locality strings ("Gedeb, Yirgacheffe,
 * Ethiopia" → no match) but resolves the individual tokens ("Gedeb,
 * Ethiopia" → the actual woreda), and compound-word names ("Sidama Bensa")
 * only resolve word-by-word ("Bensa, Ethiopia" → Bensa Daye). So the
 * subregion rung tries: full string → comma-separated tokens → individual
 * words, most-specific-first, before falling back to country.
 */
const GENERIC_WORDS = new Set([
  "village", "estate", "farm", "finca", "hacienda", "washing", "station",
  "coffee", "region", "zone", "district", "woreda", "kebele", "co-op", "coop",
]);

async function resolvePin(fields) {
  const { producer_or_farm: farm, region_string: region, country } = fields;
  const attempts = [];
  const seen = new Set();
  const push = (tier, query) => {
    const k = query.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    attempts.push({ tier, query });
  };

  if (farm && country) {
    push("farm", dedupeTokens([farm, region, country]));
  }
  if (region && country) {
    const tokens = region.split(/[,/]/).map((t) => t.trim()).filter(Boolean);
    push("subregion", `${region}, ${country}`);
    for (const t of tokens) push("subregion", `${t}, ${country}`);
    for (const t of tokens) {
      const words = t.split(/\s+/);
      if (words.length < 2) continue;
      for (const w of words) {
        if (w.length > 2 && !GENERIC_WORDS.has(w.toLowerCase())) push("subregion", `${w}, ${country}`);
      }
    }
  }
  if (country) {
    push("country", country);
  }

  for (const attempt of attempts) {
    await sleep(1100); // Nominatim usage policy: max 1 req/sec
    const hit = await geocode(attempt.query);
    if (!hit) continue;
    // A farm/subregion query that only matched the country boundary is not a
    // real hit at that tier — fall through to the next rung.
    if (attempt.tier !== "country" && Number(hit.place_rank) <= 4) continue;
    return {
      tier: attempt.tier,
      query: attempt.query,
      lat: Number(hit.lat),
      lon: Number(hit.lon),
      matched: hit.display_name,
      place_rank: Number(hit.place_rank),
    };
  }
  return { tier: "failure", query: attempts.at(-1)?.query ?? null };
}

function buildReport(results) {
  const tiers = ["farm", "subregion", "country", "failure"];
  const counts = Object.fromEntries(tiers.map((t) => [t, 0]));
  for (const r of results) counts[r.pin.tier]++;
  const total = results.length;
  const pct = (n) => (total ? `${Math.round((n / total) * 100)}%` : "—");

  let md = `# Phase 0 — Extraction hit-rate\n\nRun: ${new Date().toISOString()} · Model: ${MODEL} · Bags: ${total}\n\n`;
  md += `## Summary\n\n| Tier | Count | Rate |\n|---|---|---|\n`;
  md += `| Farm-precise | ${counts.farm} | ${pct(counts.farm)} |\n`;
  md += `| Subregion | ${counts.subregion} | ${pct(counts.subregion)} |\n`;
  md += `| Country-only | ${counts.country} | ${pct(counts.country)} |\n`;
  md += `| Total failure | ${counts.failure} | ${pct(counts.failure)} |\n\n`;
  md += `**Usable pin rate (farm + subregion + country): ${pct(counts.farm + counts.subregion + counts.country)}**\n\n`;
  md += `## Per-bag detail\n\n| Bag | Roaster | Country | Region string | Farm/producer | Tier | Geocoded to |\n|---|---|---|---|---|---|---|\n`;
  for (const r of results) {
    const f = r.fields ?? {};
    const cell = (v) => (v ?? "—").toString().replaceAll("|", "\\|");
    md += `| ${cell(r.bag)} | ${cell(f.roaster)} | ${cell(f.country)} | ${cell(f.region_string)} | ${cell(f.producer_or_farm)} | **${r.pin.tier}** | ${cell(r.pin.matched)} |\n`;
  }
  md += `\n> Verify the extracted fields against the physical bags — extraction errors that geocode "successfully" still count as misses.\n`;
  return md;
}

async function main() {
  if (!API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY. Set it first:  $env:ANTHROPIC_API_KEY = "sk-ant-..."');
    process.exit(1);
  }

  let files;
  try {
    files = await readdir(BAGS_DIR);
  } catch {
    console.error(`No bags/ directory found at ${BAGS_DIR}`);
    process.exit(1);
  }
  const groups = groupImages(files);
  if (groups.size === 0) {
    console.error(`No images found in ${BAGS_DIR}. Drop .jpg/.png/.webp photos there (iPhone HEIC must be converted to JPEG first).`);
    process.exit(1);
  }

  console.log(`Found ${groups.size} bag(s) across ${files.length} file(s).\n`);
  const results = [];
  for (const [bag, imgs] of groups) {
    process.stdout.write(`→ ${bag} (${imgs.length} photo${imgs.length > 1 ? "s" : ""}) ... `);
    try {
      const fields = await extractFields(imgs.map((f) => path.join(BAGS_DIR, f)));
      const pin = await resolvePin(fields);
      results.push({ bag, images: imgs, fields, pin });
      console.log(`${pin.tier}${pin.matched ? ` (${pin.matched.split(",").slice(0, 2).join(",")})` : ""}`);
    } catch (err) {
      results.push({ bag, images: imgs, fields: null, pin: { tier: "failure", error: String(err) } });
      console.log(`ERROR: ${err.message ?? err}`);
    }
  }

  await writeFile(path.join(HERE, "results.json"), JSON.stringify(results, null, 2));
  const report = buildReport(results);
  await writeFile(path.join(HERE, "hit-rate.md"), report);
  console.log(`\nWrote results.json and hit-rate.md\n`);
  console.log(report.split("## Per-bag detail")[0]);
}

main();
