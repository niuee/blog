# vntchang.dev

Personal blog and resume site, built with [Astro](https://astro.build). Live at [vntchang.dev](https://vntchang.dev).

## Requirements

- Node.js
- [pnpm](https://pnpm.io) (version pinned via `packageManager` in `package.json`)

## Getting started

```bash
pnpm install
pnpm dev        # start the dev server
pnpm build      # production build
pnpm preview    # preview the production build
pnpm check      # astro check (type-checks .astro files)
pnpm test       # run vitest
```

## Project structure

```
articles/          Article content, one directory per article
  <slug>/
    content.md         English version
    content.zh-tw.md   Traditional Chinese version
  <series>/            Series group with per-part directories
    series.json        Series metadata
    part-N/content.md
resume/            Resume content (en + zh-tw) and assets
src/
  pages/           Routes (articles, series, resume, zh-tw locale)
  components/      Astro components
  layouts/         Page layouts
  lib/             Utilities and custom rehype plugins
  styles/          Global styles
  content.config.ts  Content collections (articles, series)
scripts/           Content sync and build helper scripts
public/            Static assets served as-is
```

## Content

Articles live in `articles/` and are loaded as Astro content collections. Each article directory contains a `content.md` (English) and optionally `content.<locale>.md` translations; multi-part series add a `series.json` at the series root. Markdown is rendered with KaTeX math, syntax highlighting (highlight.js), and GFM.

The site is bilingual (`en` default, `zh-tw`), with the Chinese locale served under `/zh-tw/`.

## iThelp sync

Some articles are mirrored from an [iThelp](https://ithelp.ithome.com.tw) series:

```bash
pnpm ithelp:sync         # sync series articles from iThelp
pnpm ithelp:fix-images   # rewrite iThelp image URLs to repo-local paths
```
