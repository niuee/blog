import { describe, it, expect } from 'vitest';
import { parseArticlePath } from './article-paths';

describe('parseArticlePath', () => {
  it('parses a standalone English article', () => {
    expect(parseArticlePath('articles/first/content.md')).toEqual({ slug: 'first', locale: 'en' });
  });
  it('parses a standalone zh-tw variant', () => {
    expect(parseArticlePath('articles/first/content.zh-tw.md')).toEqual({ slug: 'first', locale: 'zh-tw' });
  });
  it('parses a series article', () => {
    expect(parseArticlePath('articles/banana/part-1/content.md')).toEqual({ slug: 'banana/part-1', locale: 'en' });
  });
  it('parses a series article zh-tw variant', () => {
    expect(parseArticlePath('articles/ithelp-iron-2024/day-5/content.zh-tw.md')).toEqual({ slug: 'ithelp-iron-2024/day-5', locale: 'zh-tw' });
  });
  it('parses an mdx article', () => {
    expect(parseArticlePath('articles/how-i-built-an-infinite-canvas/content.mdx')).toEqual({ slug: 'how-i-built-an-infinite-canvas', locale: 'en' });
  });
  it('ignores the _template directory', () => {
    expect(parseArticlePath('articles/_template/content.md')).toBeNull();
  });
});
