# Astro Migration — Design

**Date:** 2026-06-09
**Branch:** `feat/migrate-astro`
**Status:** Approved (design)

## Goal

Re-platform the personal blog (`github.com/niuee/blog`) from its current
frameworkless Vite build onto **Astro**, with **clean, idiomatic internals**.
The rendered output must look and behave essentially identical to today; the
custom 2,978-line `vite-plugin-markdown.js` static-site generator is retired and
replaced by Astro's content collections, dynamic routes, and remark/rehype
pipeline.

**Non-goals:** no redesign, no restyle, no new content. `notes/` stays
unpublished. Interactive demos stay vanilla TypeScript (no framework islands).

## Current site (baseline being reproduced)

Driven entirely by `vite-plugin-markdown.js`:

- **Pages:** home (`/`), `/articles`, `/series`, `/resume`, `404`.
- **Content:** 57 markdown files — standalone articles plus two series:
  `banana` (10 parts, `series.json`) and `ithelp-iron-2024` (30 days).
- **Per-article frontmatter:** `title`, `published`/`date`, `author`, `tags`,
  `seriesOrder`. Plus embedded raw HTML/`<script>` and per-article `main.ts`
  interactive demos (`@ue-too/board` infinite-canvas) on 2 articles.
- **Features:** dark mode (localStorage), font-size control, CJK typography
  spacing, i18n (`content.zh-tw.md` variants + a 28KB client language selector),
  KaTeX math, highlight.js syntax highlighting, Umami analytics, scroll-spy TOC
  (desktop + mobile), image viewer with zoom, code copy buttons, sticky nav,
  series prev/next navigation.
- **Shared runtime assets** in `articles/_template/`: `blog-styles.css` (30KB),
  `dark-mode.css`, `blog-dark-mode.js`/`-boot.js`, `blog-cjk-spacing.js`,
  `blog-language-selector.js`, `favicon.ico`.
- **Deploy:** static output to a custom domain on Cloudflare/Vercel/Netlify at
  root path.

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Migration goal | Faithful re-platform + clean internals (retire the custom plugin) |
| Interactive demos | Vanilla TS client scripts (no framework islands) |
| i18n | Adopt Astro's built-in i18n routing |
| Deploy | Static, custom domain at root; minor URL changes acceptable |
| `notes/` | Leave unpublished (not a collection, not routed) |

## Architecture

### Approach

Content collections + dynamic routes (Approach A), with **MDX used only for the
2 demo articles** (`how-i-built-an-infinite-canvas`, `board-a-user-manual`) so
their `@ue-too/board` demos become properly bundled client scripts. The other 55
articles stay plain Markdown. Runtime CSS/JS is **reused nearly verbatim**; the
build system and page-template generation are what get replaced.

### Project structure

```
src/
  content.config.ts        # collections + custom glob loader
  layouts/
    BlogLayout.astro       # the article/page shell (head + chrome)
  components/
    SiteNav.astro  DarkModeToggle.astro  FontSizeControls.astro
    LanguageSelector.astro  TableOfContents.astro  ImageViewer.astro
    SeriesNav.astro
  pages/
    index.astro                      # home  →  /
    articles/index.astro             # articles index  →  /articles
    articles/[...slug].astro         # standalone + series articles
    series/index.astro               # series index  →  /series
    series/[slug].astro              # series detail
    resume/index.astro               # resume
    404.astro
    # zh-tw locale routes generated via Astro i18n
  styles/                  # blog-styles.css, dark-mode.css, resume-styles.css (reused)
  scripts/                 # dark-mode, cjk-spacing, language-selector, toc, image-viewer
astro.config.mjs
```

**Content does not move.** `articles/**/content*.md`, `series.json`, and
co-located images stay in place. A custom **glob loader** in `content.config.ts`
reads them, parsing `{locale, seriesSlug, articleSlug}` from each path/filename
(`content.md` → `en`; `content.zh-tw.md` → `zh-tw`).

### Collections

- **`articles`** — Zod schema: `title` (string), `published`/`date`
  (coerced date), `author` (string, optional), `tags` (string[], optional),
  `seriesOrder` (number, optional). Loader emits one entry per
  `{locale, slug}` pair; `slug` is the directory path under `articles/`
  (e.g. `first`, `banana/part-1`).
- **`series`** — loaded from `articles/{series}/series.json`, including the
  `i18n` block (`title`/`description` per locale).

## Routing & i18n

Astro config: `i18n: { defaultLocale: 'en', locales: ['en', 'zh-tw'],
routing: { prefixDefaultLocale: false } }`.

| Page | Today (en) | Today (zh-tw) | After (en) | After (zh-tw) |
|---|---|---|---|---|
| Article | `/articles/first` | `/articles/first/zh-tw` | `/articles/first` (same) | `/zh-tw/articles/first` (changed) |
| Series article | `/articles/banana/part-1` | `/articles/banana/part-1/zh-tw` | `/articles/banana/part-1` (same) | `/zh-tw/articles/banana/part-1` (changed) |
| Articles index | `/articles` | `/articles/zh-tw` | `/articles` (same) | `/zh-tw/articles` (changed) |
| Series detail | `/series/banana` | `/series/banana/zh-tw` | `/series/banana` (same) | `/zh-tw/series/banana` (changed) |
| Resume | `/resume` | `/resume/zh-tw` | `/resume` (same) | `/zh-tw/resume` (changed) |

**Every English URL is preserved exactly.** Only zh-tw variants move from a
`/…/zh-tw` suffix to a `/zh-tw/…` prefix (idiomatic Astro; within the accepted
"URLs can change slightly" tolerance).

- `getStaticPaths` in each dynamic route emits both locales from loader data.
- Missing-locale articles fall back to English content (matches today).
- `blog-language-selector.js` URL-rewriting logic is updated to the prefix scheme.
- **Redirects** map old `/…/zh-tw` → new `/zh-tw/…` (host-level `_redirects` for
  Cloudflare/Netlify, or `astro.config` redirects) so existing zh-tw links don't 404.

## Markdown pipeline

Astro's default Shiki is disabled (`markdown: { syntaxHighlight: false }`); a
remark/rehype pipeline reproduces today's exact markup:

| Concern | Today | After |
|---|---|---|
| Math | KaTeX server-rendered, `$…$` / `$$…$$` | `remark-math` + `rehype-katex` (server-rendered; same KaTeX CSS) |
| Code highlight | highlight.js → `<code class="hljs language-x">` | `rehype-highlight` (is highlight.js — identical classes; existing theme CSS works) |
| Code language label | custom `<span class="code-language-label">` in `<pre>` | small custom rehype plugin adding the same span |
| External links | marked renderer → `target=_blank rel=noopener noreferrer` | `rehype-external-links` (same attrs) |
| Line breaks / GFM | `breaks: true`, `gfm: true` | `remark-breaks` + GFM (Astro default) |
| Frontmatter | hand-rolled regex parser | Astro built-in frontmatter + Zod schema |
| Embedded raw HTML | passed through | Astro `.md` passes raw HTML through (verified as build gate) |
| CJK spacing | `blog-cjk-spacing.js` at runtime | reused as-is (client script) |

KaTeX and highlight.js CSS are pinned to the **same versions** currently loaded
via CDN (KaTeX 0.16.25, highlight.js 11.11.0 github/github-dark themes).

## Chrome, runtime assets & demos

**Reuse the runtime, componentize the composition.** Framework-agnostic assets
carry over nearly verbatim:

- `blog-styles.css`, `dark-mode.css`, `resume-styles.css` → `src/styles/`,
  imported by the layout.
- `blog-dark-mode.js`/`-boot.js`, `blog-cjk-spacing.js` → client scripts loaded
  by `BlogLayout`.
- `blog-language-selector.js` → reused with URL logic updated to the new i18n
  prefix scheme.
- Inline head scripts (dark-mode boot, font-size boot, lang detection) →
  `<script is:inline>` blocks in the layout `<head>` so they run before paint
  (no FOUC).
- TOC scroll-spy, image viewer, code-copy buttons, font-size control (today
  inline in the template) → extracted into `src/scripts/*.ts`, wired by their
  components.

Each chrome piece becomes a thin component (`SiteNav`, `DarkModeToggle`,
`FontSizeControls`, `LanguageSelector`, `TableOfContents`, `ImageViewer`,
`SeriesNav`) that `BlogLayout` composes.

**Interactive demos.** Only `how-i-built-an-infinite-canvas` and
`board-a-user-manual` have a `main.ts`. Those two articles become `.mdx`; their
demo is imported as a bundled Astro `<script>` (TS type-checked, `@ue-too/board`
bundled — replacing the plugin's per-article Vite sub-build). The
`<canvas id="graph">` markup stays inline in the article.

**Static files.** `public/favicon.ico` stays. Co-located article images are
referenced relatively and emitted by Astro's asset pipeline, reproducing today's
`/articles/{slug}/img.png` URLs.

## Index pages

- **`/articles`** — reads frontmatter from all article entries; sorts by
  `seriesOrder` (asc) when present, else `date` (desc), else slug. Renders tag
  filter + sort UI, series badges (localized via `series.json` i18n), excerpts.
- **`/series`** — lists series from the `series` collection with localized
  title/description; `/series/{slug}` lists that series' articles ordered by
  `seriesOrder`/`date`, with "Part X of Y" labels.

## Verification

After each phase: run `astro build` and diff output against the current `dist/`
(present in the `main` worktree). Primary checks:

- Every English URL resolves identically.
- Rendered article HTML matches structurally (math, code classes/labels, links,
  embedded HTML).
- Dark mode, font-size, TOC, image-viewer, language-selector work in a real
  browser; no console errors on demo pages.

## Migration order (incremental, each independently verifiable)

1. Scaffold Astro + config (i18n, Shiki off, remark/rehype plugins) — empty shell.
2. `BlogLayout` + chrome components + reused CSS/JS; port home + 404.
3. Glob loader + `articles` collection; standalone article route; verify against
   `how-i-built-an-infinite-canvas` (MDX demo) and `first`.
4. Series support (`series.json`, series collection, series detail, prev/next
   nav); verify `banana` + `ithelp-iron-2024`.
5. Articles index + series index (sorting, tags, series grouping).
6. Resume + i18n (zh-tw routes, language-selector rewrite, redirects).
7. Full-site build diff, browser pass, then delete `vite-plugin-markdown.js`,
   `vite.config.js`, old `index.html`/`404.html`/`articles/_template/`, and Vite
   deps.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Inline `<script>` in `.md` not executing | Verified in phase 3; fall back to MDX for affected articles |
| Image emission paths drifting | Asserted in the build diff |
| Language-selector URL rewrite breakage | Redirects + phase-6 browser test |
| KaTeX/highlight CSS sourcing (CDN today) | Pin same versions |

## Open items

- Confirm exact production domain for Astro `site` config (sitemap/canonical).
  Default assumption: the blog's custom domain at root.
