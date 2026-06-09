import { describe, it, expect } from 'vitest';
import { rehype } from 'rehype';
import {
  rehypeArticleImagePaths,
  toAbsoluteSrc,
  deriveBase,
} from './rehype-article-image-paths';

describe('toAbsoluteSrc', () => {
  const base = '/articles/ithelp-iron-2024/day-1';

  it('prefixes a relative src with the base', () => {
    expect(toAbsoluteSrc(base, 'day1-banner.png')).toBe(
      '/articles/ithelp-iron-2024/day-1/day1-banner.png',
    );
  });

  it('preserves CJK relative filenames byte-exact', () => {
    expect(toAbsoluteSrc('/articles/ithelp-iron-2024/day-5', '向量長度計算公式.png')).toBe(
      '/articles/ithelp-iron-2024/day-5/向量長度計算公式.png',
    );
  });

  it('leaves already-absolute srcs untouched', () => {
    expect(toAbsoluteSrc(base, '/resume/teamone.gif')).toBe('/resume/teamone.gif');
  });

  it('leaves http(s) and protocol-relative srcs untouched', () => {
    expect(toAbsoluteSrc(base, 'https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(toAbsoluteSrc(base, 'http://example.com/a.png')).toBe('http://example.com/a.png');
    expect(toAbsoluteSrc(base, '//cdn.example.com/a.png')).toBe('//cdn.example.com/a.png');
  });

  it('leaves data: URIs untouched', () => {
    expect(toAbsoluteSrc(base, 'data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });
});

describe('deriveBase', () => {
  it('derives base from an absolute content.md path under cwd', () => {
    const cwd = process.cwd();
    expect(deriveBase(`${cwd}/articles/ithelp-iron-2024/day-1/content.md`)).toBe(
      '/articles/ithelp-iron-2024/day-1',
    );
  });

  it('handles locale variants and mdx', () => {
    const cwd = process.cwd();
    expect(deriveBase(`${cwd}/articles/first/content.zh-tw.md`)).toBe('/articles/first');
    expect(deriveBase(`${cwd}/articles/how-i-built-an-infinite-canvas/content.mdx`)).toBe(
      '/articles/how-i-built-an-infinite-canvas',
    );
  });

  it('derives /resume from resume/content.md', () => {
    expect(deriveBase(`${process.cwd()}/resume/content.md`)).toBe('/resume');
  });

  it('returns null for non-content paths', () => {
    expect(deriveBase(undefined)).toBeNull();
    expect(deriveBase('/somewhere/notes.md')).toBeNull();
  });
});

describe('rehypeArticleImagePaths (raw HTML nodes)', () => {
  function run(html: string, path: string): string {
    const file = rehype()
      .data('settings', { fragment: true })
      .use(rehypeArticleImagePaths)
      .processSync({ value: html, path } as any);
    return String(file);
  }

  it('rewrites a relative img src inside raw HTML to absolute', () => {
    const cwd = process.cwd();
    const out = run(
      '<img src="day1-banner.png" alt="banner" />',
      `${cwd}/articles/ithelp-iron-2024/day-1/content.md`,
    );
    expect(out).toContain('src="/articles/ithelp-iron-2024/day-1/day1-banner.png"');
  });

  it('does not touch absolute srcs (e.g. resume images)', () => {
    const cwd = process.cwd();
    const out = run('<img src="/resume/teamone.gif" />', `${cwd}/resume/content.md`);
    expect(out).toContain('src="/resume/teamone.gif"');
  });
});
