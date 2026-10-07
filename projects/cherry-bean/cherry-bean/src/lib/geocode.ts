/**
 * The geo pipeline: region string → geocode fallback ladder → tiered pin.
 * Ported from the Phase 0 spike (phase0/extract.mjs), which validated it on
 * real bags. This is the deep module the PRD says to test in isolation, so
 * the geocoder is injectable.
 *
 * Ladder findings from Phase 0:
 * - Compound locality strings fail ("Gedeb, Yirgacheffe, Ethiopia" → no
 *   match) but individual tokens resolve, so we try full string → tokens.
 * - Compound-word admin names only resolve word-by-word ("Sidama Bensa" →
 *   "Bensa" hits Bensa Daye), so a word-level rung runs before country.
 * - A farm/subregion query that only matches the country boundary
 *   (place_rank <= 4) is not a real hit at that tier.
 */

import type { OriginPin, PrecisionTier } from './types';

export interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  place_rank: number;
}

export type GeocodeFn = (query: string) => Promise<NominatimHit | null>;

export interface GeoFields {
  country: string | null;
  regionString: string | null;
  producerOrFarm: string | null;
}

const GENERIC_WORDS = new Set([
  'village', 'estate', 'farm', 'finca', 'hacienda', 'washing', 'station',
  'coffee', 'region', 'zone', 'district', 'woreda', 'kebele', 'co-op', 'coop',
]);

const COUNTRY_PLACE_RANK_MAX = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "Hamasho Village" + "Hamasho Village, Sidama Bensa" → one Hamasho Village. */
function dedupeTokens(parts: (string | null)[]): string {
  const seen = new Set<string>();
  return parts
    .filter((p): p is string => Boolean(p))
    .flatMap((p) => p.split(',').map((t) => t.trim()))
    .filter((t) => {
      const k = t.toLowerCase();
      if (!t || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .join(', ');
}

export const nominatimGeocode: GeocodeFn = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'cherry-bean/0.1 (you@example.com)' },
  });
  if (!res.ok) return null;
  const hits = (await res.json()) as NominatimHit[];
  return hits[0] ?? null;
};

interface Attempt {
  tier: PrecisionTier;
  query: string;
}

export function buildAttempts({ country, regionString, producerOrFarm }: GeoFields): Attempt[] {
  const attempts: Attempt[] = [];
  const seen = new Set<string>();
  const push = (tier: PrecisionTier, query: string) => {
    const k = query.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    attempts.push({ tier, query });
  };

  if (producerOrFarm && country) {
    push('farm', dedupeTokens([producerOrFarm, regionString, country]));
  }
  if (regionString && country) {
    const tokens = regionString.split(/[,/]/).map((t) => t.trim()).filter(Boolean);
    push('subregion', `${regionString}, ${country}`);
    for (const t of tokens) push('subregion', `${t}, ${country}`);
    for (const t of tokens) {
      const words = t.split(/\s+/);
      if (words.length < 2) continue;
      for (const w of words) {
        if (w.length > 2 && !GENERIC_WORDS.has(w.toLowerCase())) {
          push('subregion', `${w}, ${country}`);
        }
      }
    }
  }
  if (country) {
    push('country', country);
  }
  return attempts;
}

/**
 * Resolve bag fields to a pin, or null when nothing geocodes (the entry is
 * still saved — nothing may silently drop; it just isn't plotted).
 *
 * `delayMs` spaces queries to respect Nominatim's 1 req/sec policy.
 */
export async function resolvePin(
  fields: GeoFields,
  geocode: GeocodeFn = nominatimGeocode,
  delayMs = 1100,
): Promise<OriginPin | null> {
  const attempts = buildAttempts(fields);
  let first = true;
  for (const attempt of attempts) {
    if (!first && delayMs > 0) await sleep(delayMs);
    first = false;
    let hit: NominatimHit | null = null;
    try {
      hit = await geocode(attempt.query);
    } catch {
      continue; // network hiccup on one rung must not kill the ladder
    }
    if (!hit) continue;
    if (attempt.tier !== 'country' && hit.place_rank <= COUNTRY_PLACE_RANK_MAX) continue;
    return {
      tier: attempt.tier,
      lat: Number(hit.lat),
      lon: Number(hit.lon),
      matched: hit.display_name,
      query: attempt.query,
    };
  }
  return null;
}

/** One-shot geocode for a roaster's location string. */
export async function geocodePlace(
  place: string,
  geocode: GeocodeFn = nominatimGeocode,
): Promise<{ lat: number; lon: number; matched?: string } | null> {
  try {
    const hit = await geocode(place);
    if (!hit) return null;
    return { lat: Number(hit.lat), lon: Number(hit.lon), matched: hit.display_name };
  } catch {
    return null;
  }
}
