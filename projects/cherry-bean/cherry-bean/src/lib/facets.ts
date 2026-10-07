import type { CoffeeEntry, Facet } from './types';

export const UNKNOWN = 'unknown';

/** Midpoint of the elevation numbers printed on the bag, in meters. */
export function parseElevationMeters(elevation: string | null): number | null {
  if (!elevation) return null;
  const nums = (elevation.replace(/,/g, '').match(/\d{3,4}/g) ?? []).map(Number);
  if (nums.length === 0) return null;
  return (Math.min(...nums) + Math.max(...nums)) / 2;
}

export function elevationBucket(elevation: string | null): string {
  const m = parseElevationMeters(elevation);
  if (m == null) return UNKNOWN;
  if (m < 1200) return '<1200m';
  if (m < 1600) return '1200–1599m';
  if (m < 2000) return '1600–1999m';
  return '2000m+';
}

export function normalizeProcess(process: string | null): string {
  if (!process) return UNKNOWN;
  const p = process.toLowerCase();
  if (p.includes('honey')) return 'honey';
  if (p.includes('natural')) return 'natural';
  if (p.includes('washed') || p.includes('lavado')) return 'washed';
  if (p.includes('anaerobic') || p.includes('ferment')) return 'fermented';
  return 'other';
}

export function primaryVariety(variety: string | null): string {
  if (!variety) return UNKNOWN;
  const first = variety.split(/[,/]/)[0].trim();
  return first.replace(/^\d+%\s*/, '').toLowerCase() || UNKNOWN;
}

export function facetValue(coffee: CoffeeEntry, facet: Facet): string {
  switch (facet) {
    case 'elevation':
      return elevationBucket(coffee.elevation);
    case 'variety':
      return primaryVariety(coffee.variety);
    case 'roaster':
      return coffee.roaster || UNKNOWN;
    case 'process':
      return normalizeProcess(coffee.process);
    case 'none':
      return 'coffee';
  }
}

const PALETTE = [
  '#e6553f', '#f2a541', '#8cb369', '#4c86a8', '#7d5ba6',
  '#c05299', '#5fa8d3', '#bc6c25', '#2a9d8f', '#6d597a',
];

const ELEVATION_COLORS: Record<string, string> = {
  '<1200m': '#8cb369',
  '1200–1599m': '#f2a541',
  '1600–1999m': '#e6553f',
  '2000m+': '#7d5ba6',
};

const DEFAULT_PIN = '#7a4a2b'; // coffee brown

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function facetColor(facet: Facet, value: string): string {
  if (facet === 'none') return DEFAULT_PIN;
  if (value === UNKNOWN) return '#9ca3af';
  if (facet === 'elevation') return ELEVATION_COLORS[value] ?? '#9ca3af';
  return PALETTE[hashString(value) % PALETTE.length];
}

/** Distinct facet values present in a set of coffees, for the map legend. */
export function legendEntries(coffees: CoffeeEntry[], facet: Facet): { value: string; color: string }[] {
  if (facet === 'none') return [];
  const values = new Set(coffees.map((c) => facetValue(c, facet)));
  return [...values].sort().map((value) => ({ value, color: facetColor(facet, value) }));
}
