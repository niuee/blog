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
  it('strips MDX import/export statements', () => {
    const body =
      "import Foo from '../Foo.astro';\nexport const x = 1;\n\nReal content here.";
    const ex = excerptFromBody(body);
    expect(ex).not.toContain('import');
    expect(ex).not.toContain('export');
    expect(ex).toBe('Real content here.');
  });

  it('skips an H1 title and a leading <div class="remark"> block, returning the first prose paragraph', () => {
    const body =
      '# Title\n\n<div class="remark">note</div>\n\n## Heading\n\nWeb applications like figma are great.';
    const ex = excerptFromBody(body);
    expect(ex).toBe('Web applications like figma are great.');
    expect(ex).not.toContain('<');
    expect(ex).not.toContain('#');
    expect(ex).not.toContain('note');
  });

  it('skips a leading <img .../> block (ithelp banner) and returns the following paragraph', () => {
    const body =
      '<img src="day22-banner.png" alt="day 22 banner" class="image-shadow" />\n\n今天跟明天會大概講一些重構跟最佳化方面的內容，後天就會進到應用的部分。';
    const ex = excerptFromBody(body);
    expect(ex).toBe('今天跟明天會大概講一些重構跟最佳化方面的內容，後天就會進到應用的部分。');
    expect(ex).not.toContain('<');
    expect(ex).not.toContain('img');
  });

  it('strips a [link](url) to its text', () => {
    const body =
      '# Banana — Introduction & Overview\n\nWelcome to the first part of this series on [Banana](https://banana.vntchang.dev), a 2D top-down railway simulator built with React and PixiJS.';
    const ex = excerptFromBody(body);
    expect(ex).toBe(
      'Welcome to the first part of this series on Banana, a 2D top-down railway simulator built with React and PixiJS.',
    );
    expect(ex).not.toContain('https://');
    expect(ex).not.toContain('[');
  });

  it('truncates to 200 chars and appends an ellipsis when longer', () => {
    const body = '# Title\n\n' + 'x'.repeat(300);
    const ex = excerptFromBody(body);
    expect(ex.length).toBe(203);
    expect(ex.endsWith('...')).toBe(true);
    expect(ex.endsWith('…')).toBe(false);
  });

  it('does not append an ellipsis when the paragraph is shorter than max', () => {
    const body = '# First Post\n\nThis is the first post! Just to test out the system.';
    const ex = excerptFromBody(body);
    expect(ex).toBe('This is the first post! Just to test out the system.');
    expect(ex.endsWith('...')).toBe(false);
  });

  it('strips a leading frontmatter block', () => {
    const body = '---\ntitle: Foo\n---\n\nReal prose paragraph here.';
    const ex = excerptFromBody(body);
    expect(ex).toBe('Real prose paragraph here.');
    expect(ex).not.toContain('title');
  });
});
