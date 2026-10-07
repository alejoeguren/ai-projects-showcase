/** Precision tier of a plotted origin — the PRD's fallback ladder. */
export type PrecisionTier = 'farm' | 'subregion' | 'country' | 'failure';

/** Which shared-database tier an entry lives in (PRD three-tier model). */
export type SourceTier = 'seed' | 'global' | 'private';

export interface OriginPin {
  tier: PrecisionTier;
  lat: number;
  lon: number;
  /** Display name of the geocoder match, for honesty in the UI. */
  matched?: string;
  /** The query string that produced the match. */
  query?: string;
}

export interface RoasterPin {
  lat: number;
  lon: number;
  matched?: string;
}

export interface CoffeeEntry {
  id: string;
  createdAt: string; // ISO date
  source: SourceTier;

  roaster: string;
  roasterLocation: string | null;
  roasterPin: RoasterPin | null;

  coffeeName: string;
  country: string | null;
  regionString: string | null;
  producerOrFarm: string | null;
  elevation: string | null; // as printed on the bag, e.g. "2,230-2,300 masl"
  variety: string | null;
  process: string | null;
  tastingNotes: string | null;

  /** null = could not be plotted (e.g. no origin printed on the bag). */
  originPin: OriginPin | null;
}

/** Map clustering facets from the PRD. */
export type Facet = 'none' | 'elevation' | 'variety' | 'roaster' | 'process';

export const FACETS: { key: Facet; label: string }[] = [
  { key: 'none', label: 'All' },
  { key: 'elevation', label: 'Elevation' },
  { key: 'variety', label: 'Variety' },
  { key: 'roaster', label: 'Roaster' },
  { key: 'process', label: 'Process' },
];

/** PRD: flavor↔geography correlations unlock at ~15 logged coffees. */
export const PATTERN_UNLOCK_COUNT = 15;
