import { describe, it, expect } from 'vitest';
import { orderSeriesArticles, localizedSeriesMeta } from './series';

describe('orderSeriesArticles', () => {
  it('orders by seriesOrder ascending when present', () => {
    const items = [
      { slug: 'banana/part-2', data: { seriesOrder: 2 } },
      { slug: 'banana/part-1', data: { seriesOrder: 1 } },
    ];
    expect(orderSeriesArticles(items as any).map((i) => i.slug)).toEqual(['banana/part-1', 'banana/part-2']);
  });
  it('falls back to date descending when no seriesOrder', () => {
    const items = [
      { slug: 'a', data: { published: new Date('2024-01-01') } },
      { slug: 'b', data: { published: new Date('2024-02-01') } },
    ];
    expect(orderSeriesArticles(items as any).map((i) => i.slug)).toEqual(['b', 'a']);
  });
});

describe('localizedSeriesMeta', () => {
  const meta = { title: 'EN', description: 'EN desc', i18n: { 'zh-tw': { title: 'TW', description: 'TW desc' } } };
  it('returns base meta for en', () => {
    expect(localizedSeriesMeta(meta as any, 'en')).toEqual({ title: 'EN', description: 'EN desc' });
  });
  it('returns localized meta for zh-tw', () => {
    expect(localizedSeriesMeta(meta as any, 'zh-tw')).toEqual({ title: 'TW', description: 'TW desc' });
  });
  it('falls back to base when locale missing', () => {
    expect(localizedSeriesMeta(meta as any, 'ja')).toEqual({ title: 'EN', description: 'EN desc' });
  });
});
