import { describe, expect, it } from '@jest/globals';

import { elevationBucket, normalizeProcess, parseElevationMeters, primaryVariety } from '../facets';

describe('elevation parsing (stored field read off the bag, per PRD)', () => {
  it('parses ranges with commas and units', () => {
    expect(parseElevationMeters('2,230-2,300 masl')).toBe(2265);
    expect(parseElevationMeters('1600m')).toBe(1600);
    expect(parseElevationMeters('1900-2100 masl')).toBe(2000);
    expect(parseElevationMeters(null)).toBeNull();
    expect(parseElevationMeters('high grown')).toBeNull();
  });

  it('buckets elevations', () => {
    expect(elevationBucket('2,230-2,300 masl')).toBe('2000m+');
    expect(elevationBucket('1600m')).toBe('1600–1999m');
    expect(elevationBucket('1300 masl')).toBe('1200–1599m');
    expect(elevationBucket('900m')).toBe('<1200m');
    expect(elevationBucket(null)).toBe('unknown');
  });
});

describe('process normalization', () => {
  it('maps printed processes to canonical values', () => {
    expect(normalizeProcess('Cold Ferment Honey')).toBe('honey');
    expect(normalizeProcess('Proceso Natural')).toBe('natural');
    expect(normalizeProcess('WASHED')).toBe('washed');
    expect(normalizeProcess(null)).toBe('unknown');
  });
});

describe('variety', () => {
  it('takes the first cultivar and strips percentages', () => {
    expect(primaryVariety('60% Catuai, 40% Geisha')).toBe('catuai');
    expect(primaryVariety('Caturra, Castillo')).toBe('caturra');
    expect(primaryVariety(null)).toBe('unknown');
  });
});
