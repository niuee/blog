import { describe, it, expect } from 'vitest';
import { sortArticlesForIndex, sortArticlesByNewest, excerptFromBody } from './article-index';

describe('sortArticlesForIndex', () => {
  it('sorts by seriesOrder asc, then date desc, then slug', () => {
    const items = [
      { slug: 'c', data: { published: new Date('2024-01-01') } },
      { slug: 'b', data: { published: new Date('2024-05-01') } },
      { slug: 'a', data: { seriesOrder: 1, published: new Date('2020-01-01') } },
    ];
    expect(sortArticlesForIndex(items as any).map((i) => i.slug)).toEqual(['a', 'b', 'c']);
  });
});

describe('sortArticlesByNewest (legacy default order)', () => {
  it('sorts by date desc, then title asc as tie-break', () => {
    const items = [
      { slug: 'c', title: 'C', data: { published: new Date('2024-01-01') } },
      { slug: 'b', title: 'B', data: { published: new Date('2024-05-01') } },
      { slug: 'a1', title: 'Part 1', data: { published: new Date('2026-03-31') } },
      { slug: 'a10', title: 'Part 10', data: { published: new Date('2026-03-31') } },
    ];
    expect(sortArticlesByNewest(items as any).map((i) => i.slug)).toEqual(['a1', 'a10', 'b', 'c']);
  });

  it('places undated articles last', () => {
    const items = [
      { slug: 'a', title: 'A', data: {} },
      { slug: 'b', title: 'B', data: { published: new Date('2024-05-01') } },
    ];
    expect(sortArticlesByNewest(items as any).map((i) => i.slug)).toEqual(['b', 'a']);
  });
});

describe('excerptFromBody', () => {
  it('strips markdown and truncates to 200 chars', () => {
    const body = '# Heading\n\nThis is **bold** and a [link](http://x). ' + 'x'.repeat(300);
    const ex = excerptFromBody(body);
    expect(ex.length).toBeLessThanOrEqual(200);
    expect(ex).not.toContain('#');
    expect(ex).not.toContain('**');
  });

  it('strips MDX import/export statements', () => {
    const body =
      "import Foo from '../Foo.astro';\nexport const x = 1;\n\nReal content here.";
    const ex = excerptFromBody(body);
    expect(ex).not.toContain('import');
    expect(ex).not.toContain('export');
    expect(ex).toContain('Real content here.');
  });
});
