/**
 * PRD testing priority #1: the geo pipeline is a deep module tested in
 * isolation. Given a region string, it must return a correctly-tiered pin —
 * co-op lots resolve to subregion, unparseable origins fall to country
 * centroid, and nothing silently drops.
 */
import { describe, expect, it } from '@jest/globals';

import { buildAttempts, resolvePin, type GeocodeFn, type NominatimHit } from '../geocode';

const hit = (over: Partial<NominatimHit> = {}): NominatimHit => ({
  lat: '5.5',
  lon: '39.2',
  display_name: 'Somewhere',
  place_rank: 18,
  ...over,
});

/** Geocoder stub: only queries present in `known` resolve. */
const geocoderKnowing =
  (known: Record<string, NominatimHit>): GeocodeFn =>
  async (q) =>
    known[q] ?? null;

describe('resolvePin fallback ladder', () => {
  it('returns a farm pin when the farm geocodes', async () => {
    const pin = await resolvePin(
      { country: 'Guatemala', regionString: 'Acatenango', producerOrFarm: 'Finca La Soledad' },
      geocoderKnowing({
        'Finca La Soledad, Acatenango, Guatemala': hit({ place_rank: 26 }),
      }),
      0,
    );
    expect(pin?.tier).toBe('farm');
  });

  it('resolves a co-op lot to subregion when the farm is unknown', async () => {
    const pin = await resolvePin(
      { country: 'Ethiopia', regionString: 'Guji', producerOrFarm: 'Sookoo Coffee' },
      geocoderKnowing({
        'Guji, Ethiopia': hit({ display_name: 'Guji, Oromia, Ethiopia' }),
      }),
      0,
    );
    expect(pin?.tier).toBe('subregion');
    expect(pin?.matched).toBe('Guji, Oromia, Ethiopia');
  });

  it('rescues compound region strings via comma tokens', async () => {
    const pin = await resolvePin(
      { country: 'Ethiopia', regionString: 'Gedeb, Yirgacheffe', producerOrFarm: null },
      geocoderKnowing({
        // full string misses; first token resolves (Phase 0 finding)
        'Gedeb, Ethiopia': hit({ place_rank: 19 }),
      }),
      0,
    );
    expect(pin?.tier).toBe('subregion');
    expect(pin?.query).toBe('Gedeb, Ethiopia');
  });

  it('rescues compound-word admin names via the word rung', async () => {
    const pin = await resolvePin(
      { country: 'Ethiopia', regionString: 'Sidama Bensa', producerOrFarm: null },
      geocoderKnowing({
        'Bensa, Ethiopia': hit({ place_rank: 24, display_name: 'Bensa Daye, Sidama, Ethiopia' }),
      }),
      0,
    );
    expect(pin?.tier).toBe('subregion');
    expect(pin?.query).toBe('Bensa, Ethiopia');
  });

  it('falls to country centroid when the region is unparseable', async () => {
    const pin = await resolvePin(
      { country: 'Colombia', regionString: 'Lot 42 Anniversary Reserve', producerOrFarm: null },
      geocoderKnowing({
        Colombia: hit({ place_rank: 4, display_name: 'Colombia' }),
      }),
      0,
    );
    expect(pin?.tier).toBe('country');
  });

  it('does not count a country-boundary match as a subregion hit', async () => {
    const pin = await resolvePin(
      { country: 'Ethiopia', regionString: 'Nonexistent Zone', producerOrFarm: null },
      geocoderKnowing({
        // the subregion query "matches" but only at country rank — must fall through
        'Nonexistent Zone, Ethiopia': hit({ place_rank: 4, display_name: 'Ethiopia' }),
        Ethiopia: hit({ place_rank: 4, display_name: 'Ethiopia' }),
      }),
      0,
    );
    expect(pin?.tier).toBe('country');
  });

  it('returns null (unplotted, never dropped) when nothing geocodes', async () => {
    const pin = await resolvePin(
      { country: null, regionString: null, producerOrFarm: null },
      geocoderKnowing({}),
      0,
    );
    expect(pin).toBeNull();
  });

  it('survives a geocoder error on one rung and continues the ladder', async () => {
    const flaky: GeocodeFn = async (q) => {
      if (q === 'Guji, Ethiopia') throw new Error('network');
      if (q === 'Ethiopia') return hit({ place_rank: 4, display_name: 'Ethiopia' });
      return null;
    };
    const pin = await resolvePin(
      { country: 'Ethiopia', regionString: 'Guji', producerOrFarm: null },
      flaky,
      0,
    );
    expect(pin?.tier).toBe('country');
  });
});

describe('buildAttempts', () => {
  it('orders rungs farm → subregion tokens → words → country, deduplicated', () => {
    const attempts = buildAttempts({
      country: 'Ethiopia',
      regionString: 'Hamasho Village, Sidama Bensa',
      producerOrFarm: 'Hamasho Village',
    });
    const queries = attempts.map((a) => a.query);
    expect(attempts[0]).toEqual({
      tier: 'farm',
      query: 'Hamasho Village, Sidama Bensa, Ethiopia',
    });
    expect(queries).toContain('Hamasho Village, Ethiopia');
    expect(queries).toContain('Sidama Bensa, Ethiopia');
    // word rung: generic word "Village" filtered, real words kept
    expect(queries).toContain('Hamasho, Ethiopia');
    expect(queries).toContain('Sidama, Ethiopia');
    expect(queries).toContain('Bensa, Ethiopia');
    expect(queries).not.toContain('Village, Ethiopia');
    expect(attempts.at(-1)).toEqual({ tier: 'country', query: 'Ethiopia' });
    // no duplicate queries
    expect(new Set(queries.map((q) => q.toLowerCase())).size).toBe(queries.length);
  });
});
