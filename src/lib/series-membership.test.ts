import { describe, it, expect } from 'vitest';
import { seriesOf, seriesSlugFromId } from './series-membership';

describe('seriesOf', () => {
  const seriesSlugs = new Set(['banana', 'ithelp-iron-2024']);
  it('returns the series slug when the first segment matches', () => {
    expect(seriesOf('banana/part-1', seriesSlugs)).toBe('banana');
    expect(seriesOf('ithelp-iron-2024/day-12A-1', seriesSlugs)).toBe('ithelp-iron-2024');
  });
  it('returns null for a standalone article', () => {
    expect(seriesOf('first', seriesSlugs)).toBeNull();
  });
  it('returns null when the first segment is not a known series', () => {
    expect(seriesOf('other/part-1', seriesSlugs)).toBeNull();
  });
});

describe('seriesSlugFromId', () => {
  it('strips the trailing /series segment', () => {
    expect(seriesSlugFromId('banana/series')).toBe('banana');
    expect(seriesSlugFromId('ithelp-iron-2024/series')).toBe('ithelp-iron-2024');
  });
});
