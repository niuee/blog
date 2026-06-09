import { describe, it, expect } from 'vitest';
import { articleHref } from './article-href';

const zhTw = new Set(['first', 'how-i-built-an-infinite-canvas', 'banana/part-1']);

describe('articleHref', () => {
  it('uses en path for en locale', () => {
    expect(articleHref('first', 'en', zhTw)).toBe('/articles/first');
    expect(articleHref('banana/part-1', 'en', zhTw)).toBe('/articles/banana/part-1');
  });

  it('uses zh-tw path when the slug has a zh-tw variant', () => {
    expect(articleHref('first', 'zh-tw', zhTw)).toBe('/zh-tw/articles/first');
    expect(articleHref('banana/part-1', 'zh-tw', zhTw)).toBe(
      '/zh-tw/articles/banana/part-1'
    );
  });

  it('falls back to en path when the slug has no zh-tw variant', () => {
    expect(articleHref('ithelp-iron-2024/day-1', 'zh-tw', zhTw)).toBe(
      '/articles/ithelp-iron-2024/day-1'
    );
  });
});
