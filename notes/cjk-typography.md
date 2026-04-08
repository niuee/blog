# CJK Typography System

## Overview

The blog supports CJK (Chinese, Japanese, Korean) languages with dedicated typography rules. The key design decisions:

- **Body text**: Sans-serif CJK fonts for readability (Noto Sans TC/SC/JP/KR, PingFang, etc.), with serif Latin fonts (Iowan Old Style, Palatino, Georgia).
- **Headings and titles**: Serif CJK fonts (Noto Serif TC/SC/JP/KR) for both CJK and Latin characters.
- **English mode**: Body text uses sans-serif for Latin; headings use serif.

## CJK Letter-Spacing (blog-cjk-spacing.js)

### Problem

CJK text benefits from additional letter-spacing for readability, but CSS `letter-spacing` applies uniformly to all characters. Setting `letter-spacing: 0.09em` on CJK-language pages also widens Latin characters, making mixed CJK/Latin text look wrong.

`word-spacing` was tried as an alternative (since browsers treat each CJK character as a word boundary) but the effect was not noticeable.

### Solution

A JavaScript approach that selectively applies letter-spacing only to CJK character runs:

1. **`articles/_template/blog-cjk-spacing.js`** — Runs on page load. If the page language is CJK (`zh`, `ja`, `ko`), it walks the DOM and wraps contiguous CJK character runs in `<span class="cjk-spaced">`. It skips `<script>`, `<style>`, `<code>`, `<pre>`, and `<kbd>` elements.

2. **`.cjk-spaced` CSS rule** in `articles/_template/blog-styles.css` — Applies `letter-spacing: 0.09em` only to those wrapped spans.

The regex covers: CJK Unified Ideographs, Extension A/B, Compatibility Ideographs, Hiragana, Katakana, Hangul Syllables, Bopomofo, and fullwidth punctuation (`\u2E80-\u9FFF`, `\uF900-\uFAFF`, `\uFE30-\uFE4F`, `\u3000-\u303F`, `\u3040-\u309F`, `\u30A0-\u30FF`, `\uAC00-\uD7AF`, `\u3100-\u312F`, `\uFF00-\uFFEF`).

### Wiring

- The script is included in all page templates via `<script src="/blog-cjk-spacing.js"></script>`:
  - `articles/_template/index.html` (article pages)
  - `articles/index.html` (articles listing)
  - `series/index.html` (series listing/detail)
  - `resume/_template/index.html` (resume)
- The dev server serves it from `articles/_template/` (registered in `vite-plugin-markdown.js` `configureServer`).
- The build copies it to `dist/` (registered in the `sharedBlogScripts` array in `vite-plugin-markdown.js` `copySharedCSS`).

### Adjusting

- To change the spacing amount, edit the `letter-spacing` value in the `.cjk-spaced` rule in `blog-styles.css`.
- To change which characters are considered CJK, edit the `CJK_RE` regex in `blog-cjk-spacing.js`.

## Font Stacks

### CJK Serif (headings, titles)

```
'Iowan Old Style', 'Noto Serif TC', 'Noto Serif SC', 'Noto Serif JP', 'Noto Serif KR',
'Noto Serif', 'Palatino Linotype', 'Palatino', 'Book Antiqua', Georgia, 'Times New Roman', serif
```

### CJK Sans (body text)

```
'Noto Sans TC', 'Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR',
'PingFang TC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Microsoft JhengHei',
'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Apple SD Gothic Neo', 'Malgun Gothic',
'Meiryo', 'Yu Gothic', sans-serif
```

### Where serif CJK is applied (via `blog-styles.css`)

- Article headings (`#blog-content article h1`–`h6`)
- Article page title (`header h1` on `data-blog-lang-mode="article"`)
- Articles listing: page title, subtitle, nav links, article titles (`data-blog-lang-mode="articles-listing"`)
- Series listing: page title, subtitle, nav links, article titles (`data-blog-lang-mode="series"`)

## Build-Time Language Fallback

Articles with only `content.md` (no `content.{lang}.md` variants) still get HTML pages generated for all known languages at build time. This matches the dev server behavior which falls back to `content.md` when a language-specific file doesn't exist. The logic is in `findBlogPosts()` in `vite-plugin-markdown.js`.
