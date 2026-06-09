# Astro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-platform the frameworkless Vite blog onto Astro with clean internals, retiring the 2,978-line `vite-plugin-markdown.js` while keeping output essentially identical.

**Architecture:** Astro content collections fed by a custom glob loader that reads the existing `articles/**/content*.md` in place; dynamic `[...slug]` routes; a remark/rehype pipeline reproducing today's markup (KaTeX, highlight.js classes, external-link attrs, code language label); Astro built-in i18n routing (`en` unprefixed, `zh-tw` prefixed); runtime CSS/JS reused nearly verbatim; MDX only for the 2 demo articles.

**Tech Stack:** Astro 6, MDX, remark-math, rehype-katex, rehype-highlight, rehype-external-links, remark-breaks, Vitest (pure-logic unit tests), pnpm 10, Node 22.

**Reference spec:** `docs/superpowers/specs/2026-06-09-astro-migration-design.md`

**Baseline for diffing:** the current built site exists at `../main/dist` (the `main` worktree). Use it to compare rendered output.

**Content inventory (do not move these files):**
- Standalone articles: `articles/first/`, `articles/board-a-user-manual/`, `articles/how-i-built-an-infinite-canvas/`
- Demo articles (have `main.ts`, become `.mdx`): `articles/how-i-built-an-infinite-canvas/`, `articles/board-a-user-manual/`
- Series (have `series.json`): `articles/banana/` (10 parts), `articles/ithelp-iron-2024/` (30 days)
- 12 `content.zh-tw.md` variants across the tree
- Shared runtime assets: `articles/_template/{blog-styles.css,dark-mode.css,blog-dark-mode.js,blog-dark-mode-boot.js,blog-cjk-spacing.js,blog-language-selector.js}`, `public/favicon.ico`, `resume/resume-styles.css`

**Working directory for all commands:** `/Users/vincent.yy.chang/dev/blog/astro`

---

## Phase 0 — Scaffold & pipeline

### Task 1: Initialize Astro alongside existing content

**Files:**
- Modify: `package.json`
- Create: `astro.config.mjs`
- Modify: `tsconfig.json`
- Create: `src/env.d.ts`

- [ ] **Step 1: Install Astro and core deps**

The repo already has `pnpm`, `typescript`, `@ue-too/board`, `katex`, `highlight.js`. Add Astro + pipeline plugins:

```bash
pnpm add astro@^6 @astrojs/mdx @astrojs/sitemap
pnpm add remark-math rehype-katex rehype-highlight rehype-external-links remark-breaks
pnpm add -D vitest
```

- [ ] **Step 2: Replace the Vite scripts in `package.json`**

Replace the `scripts` block (currently `dev: vite`, `build: tsc && vite build`, `preview: vite preview`) with:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "check": "astro check",
  "test": "vitest run",
  "ithelp:sync": "node scripts/sync-ithelp-series.mjs",
  "ithelp:fix-images": "node scripts/fix-ithelp-repo-images.mjs"
}
```

Leave the `ithelp:*` scripts untouched (they operate on source markdown, unrelated to the build). Do **not** remove `vite` from devDependencies yet — Task 17 handles cleanup.

- [ ] **Step 3: Create `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeExternalLinks from 'rehype-external-links';

// NOTE: confirm the real production domain (see spec "Open items").
const SITE = 'https://vntchang.dev';

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-tw'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [mdx(), sitemap()],
  markdown: {
    // Disable Astro's default Shiki; we reproduce highlight.js markup instead.
    syntaxHighlight: false,
    gfm: true,
    remarkPlugins: [remarkMath, remarkBreaks],
    rehypePlugins: [
      rehypeKatex,
      rehypeHighlight,
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },
});
```

- [ ] **Step 4: Update `tsconfig.json` to Astro's strict base**

Replace the file contents with:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "vite-plugin-markdown.js"]
}
```

- [ ] **Step 5: Create `src/env.d.ts`**

```ts
/// <reference path="../.astro/types.d.ts" />
```

- [ ] **Step 6: Add a temporary home page so the build has a route**

Create `src/pages/index.astro` with a placeholder (replaced in Task 6):

```astro
---
---
<html lang="en"><head><meta charset="utf-8" /><title>blog</title></head>
<body><h1>scaffold</h1></body></html>
```

- [ ] **Step 7: Verify the scaffold builds**

Run: `pnpm build`
Expected: build succeeds, produces `dist/index.html`. (The old `vite-plugin-markdown.js` is no longer referenced; Astro ignores it.)

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs tsconfig.json src/env.d.ts src/pages/index.astro
git commit -m "chore: scaffold Astro with markdown pipeline + i18n config"
```

---

### Task 2: Custom rehype plugin for the code language label

The current build wraps highlighted code as `<pre><span class="code-language-label">{lang}</span><code class="hljs language-{lang}">…</code></pre>`. `rehype-highlight` produces the `<code class="hljs language-{lang}">` part but not the label span. This task adds a tiny rehype plugin that inserts the label, and unit-tests it.

**Files:**
- Create: `src/lib/rehype-code-language-label.ts`
- Create: `src/lib/rehype-code-language-label.test.ts`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Write the failing test**

`src/lib/rehype-code-language-label.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rehype } from 'rehype';
import rehypeHighlight from 'rehype-highlight';
import { rehypeCodeLanguageLabel } from './rehype-code-language-label';

async function run(html: string): Promise<string> {
  const file = await rehype()
    .data('settings', { fragment: true })
    .use(rehypeHighlight)
    .use(rehypeCodeLanguageLabel)
    .process(html);
  return String(file);
}

describe('rehypeCodeLanguageLabel', () => {
  it('prepends a language label span inside <pre> for fenced code with a language', async () => {
    const out = await run('<pre><code class="language-javascript">const x = 1;</code></pre>');
    expect(out).toContain('<span class="code-language-label">javascript</span>');
    // label comes before the <code>
    expect(out.indexOf('code-language-label')).toBeLessThan(out.indexOf('<code'));
  });

  it('does not add a label when there is no language class', async () => {
    const out = await run('<pre><code>plain text</code></pre>');
    expect(out).not.toContain('code-language-label');
  });
});
```

Note: `rehype`, `unist-util-visit` ship transitively, but install explicitly to be safe:

```bash
pnpm add -D rehype unist-util-visit hast
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/rehype-code-language-label.test.ts`
Expected: FAIL — `rehypeCodeLanguageLabel` not found.

- [ ] **Step 3: Implement the plugin**

`src/lib/rehype-code-language-label.ts`:

```ts
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

/**
 * Reproduces the legacy build's `<span class="code-language-label">{lang}</span>`
 * inserted as the first child of each <pre> that contains a highlighted code block
 * with a `language-*` class.
 */
export function rehypeCodeLanguageLabel() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'pre') return;
      const code = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code',
      );
      if (!code) return;
      const classes = (code.properties?.className as string[] | undefined) ?? [];
      const langClass = classes.find((c) => c.startsWith('language-'));
      if (!langClass) return;
      const lang = langClass.replace('language-', '');
      node.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: { className: ['code-language-label'] },
        children: [{ type: 'text', value: lang }],
      });
    });
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/rehype-code-language-label.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Wire the plugin into the pipeline**

In `astro.config.mjs`, import it and append it to `rehypePlugins` **after** `rehypeHighlight`:

```js
import { rehypeCodeLanguageLabel } from './src/lib/rehype-code-language-label.ts';
// ...
rehypePlugins: [
  rehypeKatex,
  rehypeHighlight,
  rehypeCodeLanguageLabel,
  [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
],
```

- [ ] **Step 6: Verify build still succeeds**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib package.json pnpm-lock.yaml astro.config.mjs
git commit -m "feat: rehype plugin reproducing code language label markup"
```

---

## Phase 1 — Layout, chrome & static pages

### Task 3: Relocate reused runtime assets

Move (copy) the framework-agnostic CSS/JS into `src/` so the layout can import them. Originals in `articles/_template/` stay until Task 17 cleanup.

**Files:**
- Create: `src/styles/blog-styles.css`, `src/styles/dark-mode.css`, `src/styles/resume-styles.css`
- Create: `src/scripts/blog-dark-mode.js`, `src/scripts/blog-cjk-spacing.js`, `src/scripts/blog-language-selector.js`

- [ ] **Step 1: Copy CSS**

```bash
mkdir -p src/styles src/scripts
cp articles/_template/blog-styles.css src/styles/blog-styles.css
cp articles/_template/dark-mode.css src/styles/dark-mode.css
cp resume/resume-styles.css src/styles/resume-styles.css
```

- [ ] **Step 2: Copy the runtime JS that is reused as-is**

```bash
cp articles/_template/blog-dark-mode.js src/scripts/blog-dark-mode.js
cp articles/_template/blog-cjk-spacing.js src/scripts/blog-cjk-spacing.js
cp articles/_template/blog-language-selector.js src/scripts/blog-language-selector.js
```

(The language selector's URL logic is rewritten in Task 15; copy verbatim for now.)

- [ ] **Step 3: Commit**

```bash
git add src/styles src/scripts
git commit -m "chore: relocate reused runtime CSS/JS into src"
```

---

### Task 4: BlogLayout — head, boot scripts, chrome slots

Recreate the article/page shell (`articles/_template/index.html`) as an Astro layout. The structural HTML is known from recon; reproduce it faithfully. Inline boot scripts must run before paint (`is:inline`) to avoid FOUC.

**Files:**
- Create: `src/layouts/BlogLayout.astro`

- [ ] **Step 1: Create the layout**

`src/layouts/BlogLayout.astro`:

```astro
---
import '../styles/dark-mode.css';
import '../styles/blog-styles.css';
import SiteNav from '../components/SiteNav.astro';
import DarkModeToggle from '../components/DarkModeToggle.astro';
import FontSizeControls from '../components/FontSizeControls.astro';
import LanguageSelector from '../components/LanguageSelector.astro';

export interface Props {
  title: string;
  lang?: string;
  bodyMode?: string; // e.g. "article"
  availableLanguages?: (string | null)[];
}

const { title, lang = 'en', bodyMode, availableLanguages = [null] } = Astro.props;
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="UTF-8" />
    <script defer src="https://cloud.umami.is/script.js" data-website-id="a6da2d78-28e4-4020-8b74-92c3de6a3a3d"></script>
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&family=Noto+Sans+KR:wght@400&family=Noto+Sans+SC:wght@400&family=Noto+Sans+TC:wght@400&family=Noto+Serif+SC:wght@400;600&family=Noto+Serif+TC:wght@400;600&family=Noto+Serif:wght@400;600&display=swap" rel="stylesheet" />
    <!-- highlight.js themes (pinned to legacy 11.11.0); dark theme toggled via `disabled` by blog-dark-mode.js -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.0/styles/github.min.css" id="hljs-light-theme" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.0/styles/github-dark.min.css" id="hljs-dark-theme" disabled />
    <!-- KaTeX CSS (pinned to legacy 0.16.25) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.css" />
    <script is:inline>
      (function () {
        try {
          if (localStorage.getItem('blog-dark-mode') === 'true') {
            document.documentElement.setAttribute('data-blog-dark', '');
          }
        } catch (e) {}
      })();
    </script>
    <script is:inline>
      (function () {
        var savedFontSize = localStorage.getItem('blog-font-size') || 'large';
        document.documentElement.setAttribute('data-font-size', savedFontSize);
      })();
    </script>
  </head>
  <body data-blog-lang-mode={bodyMode}>
    <FontSizeControls />
    <DarkModeToggle />
    <LanguageSelector availableLanguages={availableLanguages} />
    <div class="container">
      <SiteNav />
      <slot />
    </div>
    <script src="../scripts/blog-dark-mode.js"></script>
    <script src="../scripts/blog-language-selector.js"></script>
    <script src="../scripts/blog-cjk-spacing.js"></script>
    <script>
      // expose available languages to the selector
      // (data injected per-page below via the component)
    </script>
  </body>
</html>
```

Note: the `<script src="../scripts/...">` form lets Astro bundle/hash them. The `available-languages` JSON is emitted by `LanguageSelector` (Task 5).

- [ ] **Step 2: Verify the layout type-checks (build will fail until components exist)**

This task intentionally references components created in Task 5. Proceed to Task 5, then build. (No standalone verification here.)

- [ ] **Step 3: Commit**

```bash
git add src/layouts/BlogLayout.astro
git commit -m "feat: BlogLayout shell with head + boot scripts"
```

---

### Task 5: Chrome components

Extract each piece of chrome into a focused component. The structural HTML matches recon; behavior comes from the reused scripts (dark mode, language selector) or small extracted scripts (TOC, image viewer, font size, code copy).

**Files:**
- Create: `src/components/SiteNav.astro`
- Create: `src/components/DarkModeToggle.astro`
- Create: `src/components/FontSizeControls.astro`
- Create: `src/components/LanguageSelector.astro`
- Create: `src/components/TableOfContents.astro`
- Create: `src/components/ImageViewer.astro`
- Create: `src/scripts/blog-ui.ts`

- [ ] **Step 1: SiteNav**

`src/components/SiteNav.astro`:

```astro
---
const base = '';
---
<nav class="sticky-nav site-nav-wrapper" id="sticky-nav">
  <div class="site-nav">
    <a href="/" class="site-nav-link">Home</a>
    <a href="/articles" class="site-nav-link">Articles</a>
    <a href="/series" class="site-nav-link">Series</a>
  </div>
</nav>
```

- [ ] **Step 2: DarkModeToggle**

`src/components/DarkModeToggle.astro`:

```astro
<input type="checkbox" id="dark-mode-toggle" class="dark-mode-toggle" />
<script is:inline src="/blog-dark-mode-boot.js"></script>
<label for="dark-mode-toggle" class="dark-mode-label" aria-label="Toggle dark mode">
  <span class="switch-plate"><span class="switch-toggle"></span></span>
</label>
```

Copy the boot script to `public/` so the `/blog-dark-mode-boot.js` path resolves:

```bash
cp articles/_template/blog-dark-mode-boot.js public/blog-dark-mode-boot.js
```

- [ ] **Step 3: FontSizeControls**

`src/components/FontSizeControls.astro`:

```astro
<div class="font-size-controls">
  <button class="font-size-btn" id="font-size-medium" aria-label="Medium font">A</button>
  <button class="font-size-btn" id="font-size-large" aria-label="Large font">A</button>
  <button class="font-size-btn" id="font-size-xl" aria-label="Extra large font">A</button>
</div>
```

- [ ] **Step 4: LanguageSelector (emits available-languages JSON)**

`src/components/LanguageSelector.astro`:

```astro
---
export interface Props { availableLanguages?: (string | null)[]; }
const { availableLanguages = [null] } = Astro.props;
---
<div class="language-selector" id="language-selector">
  <button class="language-selector-btn" id="language-selector-btn">
    <span class="language-selector-icon">Aa</span>
    <span class="language-selector-text">English</span>
  </button>
  <div class="language-dropdown" id="language-dropdown" role="menu"></div>
</div>
<script id="available-languages" type="application/json" set:html={JSON.stringify(availableLanguages)} is:inline></script>
```

- [ ] **Step 5: TableOfContents**

`src/components/TableOfContents.astro` (structure from recon; populated by `blog-ui.ts`):

```astro
<aside class="toc-sidebar" id="toc-sidebar">
  <nav class="toc-nav">
    <div class="toc-title">Contents</div>
    <ul class="toc-list" id="toc-list"></ul>
  </nav>
</aside>
<div class="toc-mobile" id="toc-mobile">
  <button class="toc-mobile-btn" id="toc-mobile-btn" aria-label="Contents">☰</button>
  <div class="toc-mobile-dropdown" id="toc-mobile-dropdown">
    <div class="toc-mobile-header">
      <span>Contents</span>
      <button class="toc-mobile-close" aria-label="Close">×</button>
    </div>
    <ul class="toc-mobile-list"></ul>
  </div>
</div>
```

- [ ] **Step 6: ImageViewer**

`src/components/ImageViewer.astro`:

```astro
<div class="image-viewer-overlay" id="image-viewer-overlay">
  <button class="image-viewer-close" id="image-viewer-close" aria-label="Close">×</button>
  <div class="image-viewer-container">
    <img class="image-viewer-img" id="image-viewer-img" src="" alt="" />
  </div>
  <div class="image-viewer-controls">
    <button class="image-viewer-btn" id="image-viewer-zoom-out" aria-label="Zoom out">−</button>
    <span class="image-viewer-zoom-level">100%</span>
    <button class="image-viewer-btn" id="image-viewer-zoom-in" aria-label="Zoom in">+</button>
    <button class="image-viewer-btn" id="image-viewer-reset">Reset</button>
  </div>
</div>
```

- [ ] **Step 7: Extract the inline article scripts into `blog-ui.ts`**

The legacy template had inline scripts for: TOC generation + scroll-spy, image viewer zoom/drag, code copy buttons, and font-size control. Port those verbatim from the legacy `articles/_template/index.html` `<script>` blocks into `src/scripts/blog-ui.ts` as DOM-ready functions. Reference source: open `articles/_template/index.html`, copy the trailing inline `<script>` bodies, and wrap each in a guarded init that no-ops when its elements are absent (so non-article pages can include it safely).

Skeleton:

```ts
// src/scripts/blog-ui.ts — ported verbatim from articles/_template/index.html inline scripts.
function initTOC() { /* paste TOC + scroll-spy logic; guard on #toc-list */ }
function initImageViewer() { /* paste image viewer logic; guard on #image-viewer-overlay */ }
function initCodeCopy() { /* paste copy-button logic */ }
function initFontSize() { /* paste font-size button logic; guard on .font-size-controls */ }

function init() { initTOC(); initImageViewer(); initCodeCopy(); initFontSize(); }
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 8: Include the chrome + UI script in BlogLayout**

In `src/layouts/BlogLayout.astro`, add `TableOfContents` and `ImageViewer` imports and place them in the body (before `<slot />`), and add `<script src="../scripts/blog-ui.ts"></script>` at the end of body.

- [ ] **Step 9: Verify build**

Run: `pnpm build`
Expected: PASS — the temporary home still builds (it doesn't use the layout yet).

- [ ] **Step 10: Commit**

```bash
git add src/components src/scripts/blog-ui.ts public/blog-dark-mode-boot.js src/layouts/BlogLayout.astro
git commit -m "feat: chrome components (nav, dark mode, font size, language, TOC, image viewer)"
```

---

### Task 6: Home page and 404

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/pages/404.astro`

- [ ] **Step 1: Port the home page**

Replace `src/pages/index.astro` with the real home content from the legacy `index.html` (the `.intro-*` markup and its inline `<style>`), rendered through `BlogLayout`. Reference source: legacy `index.html` body. Keep the `<style>` inline in the page (it's page-specific). Structure:

```astro
---
import BlogLayout from '../layouts/BlogLayout.astro';
---
<BlogLayout title="blog" lang="en">
  <div class="intro-content">
    <h1 class="intro-name">vee</h1>
    <p class="intro-subtitle">Software Developer and a little bit of everything I'm interested in.</p>
    <div class="intro-description">
      Currently working on <a href="https://banana.vntchang.dev" class="intro-link" target="_blank" rel="noopener">banana</a>.
    </div>
    <nav class="intro-nav">
      <a href="/articles" class="intro-nav-link">Articles</a>
      <a href="/series" class="intro-nav-link">Series</a>
      <a href="https://github.com/niuee" class="intro-nav-link" target="_blank" rel="noopener">GitHub</a>
    </nav>
  </div>
  <style>
    /* paste the .intro-* rules from legacy index.html */
  </style>
</BlogLayout>
```

- [ ] **Step 2: Port the 404 page**

Create `src/pages/404.astro` rendering the legacy `404.html` body through `BlogLayout`.

- [ ] **Step 3: Verify in a browser**

Run: `pnpm dev`
Open `http://localhost:4321/` — confirm: intro renders, dark-mode toggle works and persists across reload, font-size buttons work, nav links present, no console errors. Open a nonexistent URL and confirm 404 renders.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/pages/404.astro
git commit -m "feat: home and 404 pages on BlogLayout"
```

---

## Phase 2 — Articles

### Task 7: Content collections + glob loader

A custom loader reads `articles/**/content*.md`, deriving `{locale, slug}` where `slug` is the directory path under `articles/` (e.g. `first`, `banana/part-1`) and `locale` comes from the filename (`content.md` → `en`, `content.zh-tw.md` → `zh-tw`). Pure parsing logic is unit-tested.

**Files:**
- Create: `src/lib/article-paths.ts`
- Create: `src/lib/article-paths.test.ts`
- Create: `src/content.config.ts`

- [ ] **Step 1: Write the failing test for path parsing**

`src/lib/article-paths.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseArticlePath } from './article-paths';

describe('parseArticlePath', () => {
  it('parses a standalone English article', () => {
    expect(parseArticlePath('articles/first/content.md'))
      .toEqual({ slug: 'first', locale: 'en' });
  });
  it('parses a standalone zh-tw variant', () => {
    expect(parseArticlePath('articles/first/content.zh-tw.md'))
      .toEqual({ slug: 'first', locale: 'zh-tw' });
  });
  it('parses a series article', () => {
    expect(parseArticlePath('articles/banana/part-1/content.md'))
      .toEqual({ slug: 'banana/part-1', locale: 'en' });
  });
  it('parses a series article zh-tw variant', () => {
    expect(parseArticlePath('articles/ithelp-iron-2024/day-5/content.zh-tw.md'))
      .toEqual({ slug: 'ithelp-iron-2024/day-5', locale: 'zh-tw' });
  });
  it('ignores the _template directory', () => {
    expect(parseArticlePath('articles/_template/content.md')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/article-paths.test.ts`
Expected: FAIL — `parseArticlePath` not found.

- [ ] **Step 3: Implement the parser**

`src/lib/article-paths.ts`:

```ts
export interface ParsedArticlePath {
  slug: string;   // directory path under articles/, e.g. "first" or "banana/part-1"
  locale: string; // "en" for content.md, else the variant locale
}

const FILE_RE = /^content(?:\.([a-z]{2}(?:-[a-z]{2})?))?\.mdx?$/i;

/** Returns null for paths that should not become articles (e.g. _template). */
export function parseArticlePath(filePath: string): ParsedArticlePath | null {
  const norm = filePath.replace(/^.*?articles\//, '');
  const parts = norm.split('/');
  const file = parts.pop()!;
  const m = file.match(FILE_RE);
  if (!m) return null;
  if (parts[0] === '_template' || parts.length === 0) return null;
  const locale = m[1] ? m[1].toLowerCase() : 'en';
  return { slug: parts.join('/'), locale };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/article-paths.test.ts`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Define collections with a custom loader**

`src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { parseArticlePath } from './lib/article-paths';

const articles = defineCollection({
  loader: glob({
    pattern: ['**/content.md', '**/content.*.md', '**/content.mdx', '**/content.*.mdx', '!_template/**'],
    base: './articles',
    generateId: ({ entry }) => {
      const parsed = parseArticlePath(`articles/${entry}`);
      // id is "<slug>:<locale>" so the same slug can exist per-locale
      return parsed ? `${parsed.slug}:${parsed.locale}` : entry;
    },
  }),
  schema: z.object({
    title: z.string(),
    published: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    author: z.string().optional(),
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((t) => (typeof t === 'string' ? t.split(',').map((s) => s.trim()) : t)),
    seriesOrder: z.number().optional(),
  }),
});

const series = defineCollection({
  loader: glob({ pattern: '**/series.json', base: './articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    i18n: z.record(z.object({ title: z.string(), description: z.string().optional() })).optional(),
  }),
});

export const collections = { articles, series };
```

- [ ] **Step 6: Add a helper that exposes slug/locale on entries**

Add to `src/lib/article-paths.ts`:

```ts
/** Splits a collection entry id of the form "<slug>:<locale>". */
export function splitArticleId(id: string): ParsedArticlePath {
  const idx = id.lastIndexOf(':');
  return { slug: id.slice(0, idx), locale: id.slice(idx + 1) };
}
```

- [ ] **Step 7: Verify the collection loads**

Run: `pnpm build`
Expected: PASS, no schema errors. If a frontmatter field violates the schema, fix the schema or the offending markdown and re-run.

- [ ] **Step 8: Commit**

```bash
git add src/lib/article-paths.ts src/lib/article-paths.test.ts src/content.config.ts
git commit -m "feat: article + series collections with custom glob loader"
```

---

### Task 8: Standalone article route (English)

Render English standalone articles at `/articles/{slug}`. Series and zh-tw come in later tasks.

**Files:**
- Create: `src/pages/articles/[...slug].astro`
- Create: `src/components/ArticleHeader.astro`

- [ ] **Step 1: ArticleHeader component**

`src/components/ArticleHeader.astro`:

```astro
---
export interface Props { title: string; date?: Date; author?: string; }
const { title, date, author } = Astro.props;
const formatted = date
  ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  : '';
---
<header>
  <h1>{title}</h1>
  <div class="meta">
    {formatted && <span>{formatted}</span>}
    {author && <span> · {author}</span>}
  </div>
</header>
```

- [ ] **Step 2: Article route with getStaticPaths (English only for now)**

`src/pages/articles/[...slug].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import BlogLayout from '../../layouts/BlogLayout.astro';
import ArticleHeader from '../../components/ArticleHeader.astro';
import TableOfContents from '../../components/TableOfContents.astro';
import ImageViewer from '../../components/ImageViewer.astro';
import { splitArticleId } from '../../lib/article-paths';

export async function getStaticPaths() {
  const all = await getCollection('articles');
  return all
    .map((entry) => ({ entry, ...splitArticleId(entry.id) }))
    .filter((e) => e.locale === 'en')
    .map((e) => ({ params: { slug: e.slug }, props: { entry: e.entry } }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const { title, published, date, author } = entry.data;
---
<BlogLayout title={title} lang="en" bodyMode="article">
  <TableOfContents />
  <ImageViewer />
  <ArticleHeader title={title} date={published ?? date} author={author} />
  <div id="blog-content">
    <article><Content /></article>
  </div>
</BlogLayout>
```

- [ ] **Step 3: Verify `first` renders**

Run: `pnpm dev`, open `http://localhost:4321/articles/first`.
Expected: title/date/author header, body prose, working dark mode + TOC, no console errors.

- [ ] **Step 4: Spot-check markup against baseline**

Build and compare the rendered article body against the baseline:

```bash
pnpm build
# inspect dist/articles/first/index.html: code blocks have <code class="hljs language-..."> + <span class="code-language-label">,
# external links have target="_blank" rel="noopener noreferrer", any $...$ math rendered to KaTeX HTML.
```

Run: `grep -c 'code-language-label\|hljs' dist/articles/first/index.html` (only meaningful if `first` has code blocks; otherwise verify on a code-heavy article in Task 9).
Expected: markup classes present where code exists.

- [ ] **Step 5: Commit**

```bash
git add src/pages/articles/[...slug].astro src/components/ArticleHeader.astro
git commit -m "feat: standalone English article route"
```

---

### Task 9: Convert the 2 demo articles to MDX with bundled demo scripts

`how-i-built-an-infinite-canvas` and `board-a-user-manual` have a `main.ts` using `@ue-too/board` and embed a `<canvas>`. Convert their `content.md` to `content.mdx`, move the demo into a bundled Astro `<script>`.

**Files:**
- Rename: `articles/how-i-built-an-infinite-canvas/content.md` → `content.mdx`
- Rename: `articles/board-a-user-manual/content.md` → `content.mdx`
- Move: each `main.ts` → `src/scripts/demos/<slug>.ts`

- [ ] **Step 1: Verify the inline-script behavior first (risk gate from spec)**

Before converting, check whether the inline `<script>` already embedded in these articles' markdown executed in the Task 8 build. Open `dist/articles/how-i-built-an-infinite-canvas/index.html` and confirm the inline green-rectangle `<script>` is present in output. Load the page in `pnpm dev` and confirm the inline canvas demo runs. If inline scripts run, only the external `main.ts` needs special handling (below). If they do NOT run, the whole demo block moves into the bundled script in Step 3.

- [ ] **Step 2: Rename to `.mdx`**

```bash
git mv articles/how-i-built-an-infinite-canvas/content.md articles/how-i-built-an-infinite-canvas/content.mdx
git mv articles/board-a-user-manual/content.md articles/board-a-user-manual/content.mdx
```

Update the loader `pattern` already includes `.mdx`. In the MDX files, the `<canvas id="graph">` markup stays. Remove the legacy `<script src="./main.ts">` tag from the MDX body (it referenced the per-article bundling that no longer exists).

- [ ] **Step 3: Move demo scripts**

```bash
mkdir -p src/scripts/demos
git mv articles/how-i-built-an-infinite-canvas/main.ts src/scripts/demos/how-i-built-an-infinite-canvas.ts
git mv articles/board-a-user-manual/main.ts src/scripts/demos/board-a-user-manual.ts
```

Each script keeps its existing body (e.g. `import { Board } from '@ue-too/board'; const canvas = document.getElementById('graph') ...`). Guard the element lookup so it no-ops if the canvas is absent.

- [ ] **Step 4: Conditionally include the demo script in the article route**

In `src/pages/articles/[...slug].astro`, add static conditional imports keyed by slug (Astro requires static `<script>` imports). At the bottom of the template:

```astro
{entry.id.startsWith('how-i-built-an-infinite-canvas:') && (
  <script>import '../../scripts/demos/how-i-built-an-infinite-canvas.ts';</script>
)}
{entry.id.startsWith('board-a-user-manual:') && (
  <script>import '../../scripts/demos/board-a-user-manual.ts';</script>
)}
```

- [ ] **Step 5: Verify both demos in a browser**

Run: `pnpm dev`, open `/articles/how-i-built-an-infinite-canvas` and `/articles/board-a-user-manual`.
Expected: canvas demos render and animate (green rectangle / board pan), no console errors. `@ue-too/board` is bundled (check Network tab: a hashed JS module loads).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: MDX demo articles with bundled @ue-too/board scripts"
```

---

## Phase 3 — Series

### Task 10: Series metadata helpers + SeriesNav

**Files:**
- Create: `src/lib/series.ts`
- Create: `src/lib/series.test.ts`
- Create: `src/components/SeriesNav.astro`

- [ ] **Step 1: Write failing tests for ordering + localized metadata**

`src/lib/series.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { orderSeriesArticles, localizedSeriesMeta } from './series';

describe('orderSeriesArticles', () => {
  it('orders by seriesOrder ascending when present', () => {
    const items = [
      { slug: 'banana/part-2', data: { seriesOrder: 2 } },
      { slug: 'banana/part-1', data: { seriesOrder: 1 } },
    ];
    expect(orderSeriesArticles(items as any).map((i) => i.slug))
      .toEqual(['banana/part-1', 'banana/part-2']);
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
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/lib/series.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helpers**

`src/lib/series.ts`:

```ts
interface ArticleLike { slug: string; data: { seriesOrder?: number; published?: Date; date?: Date }; }
interface SeriesMeta { title: string; description?: string; i18n?: Record<string, { title: string; description?: string }>; }

export function orderSeriesArticles<T extends ArticleLike>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = a.data.seriesOrder, bo = b.data.seriesOrder;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    const ad = (a.data.published ?? a.data.date)?.getTime() ?? 0;
    const bd = (b.data.published ?? b.data.date)?.getTime() ?? 0;
    return bd - ad;
  });
}

export function localizedSeriesMeta(meta: SeriesMeta, locale: string): { title: string; description?: string } {
  const loc = locale !== 'en' ? meta.i18n?.[locale] : undefined;
  return { title: loc?.title ?? meta.title, description: loc?.description ?? meta.description };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/lib/series.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: SeriesNav component**

`src/components/SeriesNav.astro` (reproduces "Part X of Y" + prev/next from recon):

```astro
---
export interface Props {
  seriesSlug: string;
  seriesTitle: string;
  index: number;   // 0-based position
  total: number;
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
  localePrefix?: string; // '' for en, '/zh-tw' for zh-tw
}
const { seriesSlug, seriesTitle, index, total, prev, next, localePrefix = '' } = Astro.props;
---
<div id="series-nav" class="series-nav">
  <span>Part {index + 1} of {total}</span>
  <a href={`${localePrefix}/series/${seriesSlug}`}>{seriesTitle}</a>
</div>
<slot />
<div id="series-nav-bottom" class="series-nav-bottom">
  {prev && <a class="series-nav-card prev" href={`${localePrefix}/articles/${prev.slug}`}>← {prev.title}</a>}
  {next && <a class="series-nav-card next" href={`${localePrefix}/articles/${next.slug}`}>{next.title} →</a>}
</div>
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/series.ts src/lib/series.test.ts src/components/SeriesNav.astro
git commit -m "feat: series ordering/i18n helpers and SeriesNav component"
```

---

### Task 11: Series articles in the route + series detail page

**Files:**
- Modify: `src/pages/articles/[...slug].astro`
- Create: `src/pages/series/[slug].astro`
- Create: `src/lib/series-membership.ts`

- [ ] **Step 1: Helper to group articles into series**

`src/lib/series-membership.ts`:

```ts
import { splitArticleId } from './article-paths';

/** True when a slug like "banana/part-1" belongs to a known series slug "banana". */
export function seriesOf(slug: string, seriesSlugs: Set<string>): string | null {
  const top = slug.split('/')[0];
  return seriesSlugs.has(top) ? top : null;
}

export { splitArticleId };
```

- [ ] **Step 2: Extend the article route to inject SeriesNav for series members**

In `src/pages/articles/[...slug].astro`, after loading collections in `getStaticPaths`, compute series membership and pass `seriesContext` (index/total/prev/next/seriesTitle) as a prop when the article belongs to a series. Render `<SeriesNav>` wrapping `<Content />` when `seriesContext` is present, else render `<Content />` directly. Use `orderSeriesArticles` + `localizedSeriesMeta` from `src/lib/series.ts` and `seriesOf` from `src/lib/series-membership.ts`. English-only still (locale filter stays until Task 15).

Concretely, replace the body render block:

```astro
---
// ...existing imports plus:
import SeriesNav from '../../components/SeriesNav.astro';
// getStaticPaths now also returns props.seriesContext (or null)
const { entry, seriesContext } = Astro.props;
const { Content } = await render(entry);
const { title, published, date, author } = entry.data;
---
<BlogLayout title={title} lang="en" bodyMode="article">
  <TableOfContents />
  <ImageViewer />
  <ArticleHeader title={title} date={published ?? date} author={author} />
  <div id="blog-content">
    <article>
      {seriesContext ? (
        <SeriesNav {...seriesContext}><Content /></SeriesNav>
      ) : (
        <Content />
      )}
    </article>
  </div>
  {/* demo script conditionals from Task 9 remain here */}
</BlogLayout>
```

And in `getStaticPaths`, build `seriesContext` using the series collection + ordered members (full code; place inside the function):

```ts
const seriesEntries = await getCollection('series');
const seriesSlugs = new Set(seriesEntries.map((s) => s.id.replace(/\/series\.json$/, '').replace(/^.*\//, '')));
// NOTE: glob id for series.json is the path; normalize to the directory name (series slug).
```

(Adjust the normalization to whatever `series` entry ids actually are — inspect with a `console.log` during `pnpm build` once, then hard-code the transform.)

- [ ] **Step 3: Series detail page**

`src/pages/series/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import BlogLayout from '../../layouts/BlogLayout.astro';
import { splitArticleId } from '../../lib/article-paths';
import { orderSeriesArticles, localizedSeriesMeta } from '../../lib/series';
import { seriesOf } from '../../lib/series-membership';

export async function getStaticPaths() {
  const seriesEntries = await getCollection('series');
  const articles = await getCollection('articles');
  const seriesSlugs = new Set(seriesEntries.map((s) => seriesDirName(s.id)));

  return seriesEntries.map((s) => {
    const slug = seriesDirName(s.id);
    const members = orderSeriesArticles(
      articles
        .map((a) => ({ ...a, ...splitArticleId(a.id) }))
        .filter((a) => a.locale === 'en' && seriesOf(a.slug, seriesSlugs) === slug),
    );
    return { params: { slug }, props: { meta: s.data, members } };
  });
}

// series.json glob id → directory name. Confirm exact shape with one build log, then fix.
function seriesDirName(id: string): string {
  return id.replace(/\/series\.json$/, '').split('/').pop()!;
}

const { meta, members } = Astro.props;
const m = localizedSeriesMeta(meta, 'en');
---
<BlogLayout title={m.title} lang="en">
  <header><h1>{m.title}</h1>{m.description && <p class="subtitle">{m.description}</p>}</header>
  <ol class="series-article-list">
    {members.map((a, i) => (
      <li><a href={`/articles/${a.slug}`}>Part {i + 1} · {a.data.title}</a></li>
    ))}
  </ol>
</BlogLayout>
```

- [ ] **Step 4: Verify series rendering**

Run: `pnpm dev`. Open `/articles/banana/part-1` (series nav top + prev/next bottom), `/articles/ithelp-iron-2024/day-1`, and `/series/banana` (ordered list, localized title).
Expected: correct part numbers, working prev/next, ordered article list, no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/articles/[...slug].astro src/pages/series/[slug].astro src/lib/series-membership.ts
git commit -m "feat: series article navigation and series detail pages"
```

---

## Phase 4 — Index pages

### Task 12: Articles index

**Files:**
- Create: `src/lib/article-index.ts`
- Create: `src/lib/article-index.test.ts`
- Create: `src/pages/articles/index.astro`
- Create: `src/components/ArticleCard.astro`

- [ ] **Step 1: Failing test for the index sort comparator + excerpt**

`src/lib/article-index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sortArticlesForIndex, excerptFromBody } from './article-index';

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

describe('excerptFromBody', () => {
  it('strips markdown and truncates to 200 chars', () => {
    const body = '# Heading\n\nThis is **bold** and a [link](http://x). ' + 'x'.repeat(300);
    const ex = excerptFromBody(body);
    expect(ex.length).toBeLessThanOrEqual(200);
    expect(ex).not.toContain('#');
    expect(ex).not.toContain('**');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/lib/article-index.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/article-index.ts`:

```ts
interface IndexArticle { slug: string; data: { seriesOrder?: number; published?: Date; date?: Date }; }

export function sortArticlesForIndex<T extends IndexArticle>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = a.data.seriesOrder, bo = b.data.seriesOrder;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    const ad = (a.data.published ?? a.data.date)?.getTime() ?? 0;
    const bd = (b.data.published ?? b.data.date)?.getTime() ?? 0;
    if (bd !== ad) return bd - ad;
    return a.slug.localeCompare(b.slug);
  });
}

export function excerptFromBody(body: string, max = 200): string {
  const text = body
    .replace(/^---[\s\S]*?---/, '')          // frontmatter
    .replace(/```[\s\S]*?```/g, '')          // code fences
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')    // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → text
    .replace(/[#>*_`~]/g, '')                // md symbols
    .replace(/<[^>]+>/g, '')                 // html tags
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/lib/article-index.test.ts`
Expected: PASS.

- [ ] **Step 5: ArticleCard component**

`src/components/ArticleCard.astro`:

```astro
---
export interface Props {
  href: string; title: string; date?: Date; author?: string;
  excerpt: string; tags: string[]; series?: { slug: string; title: string } | null;
  localePrefix?: string;
}
const { href, title, date, author, excerpt, tags, series, localePrefix = '' } = Astro.props;
const formatted = date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
---
<li class="article-item" data-tags={tags.join(',')} data-title={title}>
  {series && <a class="series-badge" href={`${localePrefix}/series/${series.slug}`}>{series.title}</a>}
  <a class="article-link" href={href}><h2>{title}</h2></a>
  <p class="article-excerpt">{excerpt}</p>
  <div class="article-meta">{formatted}{author && <> · {author}</>}</div>
  {tags.length > 0 && <div class="article-tags">{tags.map((t) => <span class="tag">{t}</span>)}</div>}
</li>
```

- [ ] **Step 6: Articles index page**

`src/pages/articles/index.astro` — load English articles, attach excerpt via `entry.body` (raw markdown is on `entry.body`), sort with `sortArticlesForIndex`, resolve series badges, render `<ul class="article-list">` of `ArticleCard`. Reuse the legacy index's filter/sort UI markup and its inline `<style>` from `articles/index.html`. Full frontmatter:

```astro
---
import { getCollection } from 'astro:content';
import BlogLayout from '../../layouts/BlogLayout.astro';
import ArticleCard from '../../components/ArticleCard.astro';
import { splitArticleId } from '../../lib/article-paths';
import { sortArticlesForIndex, excerptFromBody } from '../../lib/article-index';
import { localizedSeriesMeta } from '../../lib/series';
import { seriesOf } from '../../lib/series-membership';

const seriesEntries = await getCollection('series');
const seriesSlugs = new Set(seriesEntries.map((s) => s.id.replace(/\/series\.json$/, '').split('/').pop()!));
const seriesMetaBySlug = new Map(
  seriesEntries.map((s) => [s.id.replace(/\/series\.json$/, '').split('/').pop()!, s.data]),
);

const articles = (await getCollection('articles'))
  .map((a) => ({ entry: a, ...splitArticleId(a.id) }))
  .filter((a) => a.locale === 'en');

const sorted = sortArticlesForIndex(articles.map((a) => ({ slug: a.slug, data: a.entry.data, entry: a.entry })));
const cards = sorted.map((a) => {
  const sSlug = seriesOf(a.slug, seriesSlugs);
  const series = sSlug ? { slug: sSlug, title: localizedSeriesMeta(seriesMetaBySlug.get(sSlug)!, 'en').title } : null;
  return {
    href: `/articles/${a.slug}`,
    title: a.data.title,
    date: a.data.published ?? a.data.date,
    author: a.data.author,
    excerpt: excerptFromBody(a.entry.body ?? ''),
    tags: a.data.tags ?? [],
    series,
  };
});
---
<BlogLayout title="Articles" lang="en">
  <div class="articles-header"><h1>Articles</h1><p class="subtitle">Writing</p></div>
  <ul class="article-list">
    {cards.map((c) => <ArticleCard {...c} />)}
  </ul>
</BlogLayout>
```

- [ ] **Step 7: Verify**

Run: `pnpm dev`, open `/articles`.
Expected: all articles listed, series badges link to `/series/{slug}`, newest-first ordering, dates/authors/tags present, no console errors. Compare the set of listed articles against `../main/dist/articles/index.html`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/article-index.ts src/lib/article-index.test.ts src/pages/articles/index.astro src/components/ArticleCard.astro
git commit -m "feat: articles index with sorting, excerpts, series badges"
```

---

### Task 13: Series index

**Files:**
- Create: `src/pages/series/index.astro`

- [ ] **Step 1: Build the series index**

`src/pages/series/index.astro` — list each series with localized title/description and a count of member articles:

```astro
---
import { getCollection } from 'astro:content';
import BlogLayout from '../../layouts/BlogLayout.astro';
import { splitArticleId } from '../../lib/article-paths';
import { localizedSeriesMeta } from '../../lib/series';
import { seriesOf } from '../../lib/series-membership';

const seriesEntries = await getCollection('series');
const seriesSlugs = new Set(seriesEntries.map((s) => s.id.replace(/\/series\.json$/, '').split('/').pop()!));
const articles = (await getCollection('articles'))
  .map((a) => ({ ...splitArticleId(a.id) }))
  .filter((a) => a.locale === 'en');

const items = seriesEntries.map((s) => {
  const slug = s.id.replace(/\/series\.json$/, '').split('/').pop()!;
  const count = articles.filter((a) => seriesOf(a.slug, seriesSlugs) === slug).length;
  const m = localizedSeriesMeta(s.data, 'en');
  return { slug, ...m, count };
});
---
<BlogLayout title="Series" lang="en">
  <div class="articles-header"><h1>Series</h1></div>
  <ul class="series-list">
    {items.map((s) => (
      <li class="series-item">
        <a href={`/series/${s.slug}`}><h2>{s.title}</h2></a>
        {s.description && <p>{s.description}</p>}
        <span class="series-count">{s.count} articles</span>
      </li>
    ))}
  </ul>
</BlogLayout>
```

- [ ] **Step 2: Verify**

Run: `pnpm dev`, open `/series`.
Expected: `banana` and `ithelp-iron-2024` listed with localized titles/descriptions and correct counts (10 and 30), links resolve.

- [ ] **Step 3: Commit**

```bash
git add src/pages/series/index.astro
git commit -m "feat: series index page"
```

---

## Phase 5 — Resume & i18n

### Task 14: Resume page

**Files:**
- Create: `src/pages/resume/index.astro`

- [ ] **Step 1: Render resume from its markdown**

The resume lives at `resume/content.md` (+ `resume/content.zh-tw.md`) with `resume/resume-styles.css`. Render the English resume markdown through `BlogLayout` plus the resume stylesheet. Use a direct import (not the articles collection):

```astro
---
import BlogLayout from '../../layouts/BlogLayout.astro';
import '../../styles/resume-styles.css';
// Astro can import markdown directly:
import { Content, frontmatter } from '../../../resume/content.md';
---
<BlogLayout title={frontmatter.title ?? 'Resume'} lang="en">
  <div class="resume"><Content /></div>
</BlogLayout>
```

If the markdown has no frontmatter `title`, hard-code `"Resume"`. Confirm the resume GIFs (`miro.gif`, `teamone.gif`) referenced in the markdown resolve — copy them to `public/resume/` if referenced by absolute path:

```bash
mkdir -p public/resume && cp resume/miro.gif resume/teamone.gif public/resume/
```

- [ ] **Step 2: Verify**

Run: `pnpm dev`, open `/resume`.
Expected: resume renders with its styles, images load, no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/resume/index.astro public/resume
git commit -m "feat: resume page"
```

---

### Task 15: zh-tw locale routes, language selector rewrite, redirects

Generate zh-tw variants for every dynamic route and update the selector + redirects. Astro's i18n with `prefixDefaultLocale: false` means zh-tw pages live under `/zh-tw/...`.

**Files:**
- Modify: `src/pages/articles/[...slug].astro`, `src/pages/articles/index.astro`, `src/pages/series/[slug].astro`, `src/pages/series/index.astro`, `src/pages/resume/index.astro`
- Create: `src/pages/zh-tw/...` mirrors (or parametrize locale)
- Modify: `src/scripts/blog-language-selector.js`
- Create: `public/_redirects`

- [ ] **Step 1: Decide the locale-route mechanism**

Use Astro's recommended pattern: create a `[locale]` segment is overkill here; instead, duplicate each dynamic route under `src/pages/zh-tw/` that imports a shared render function, OR add `zh-tw` paths from the same `getStaticPaths` by emitting params that include the prefix. The simplest faithful approach: parametrize each route file to accept a `locale` prop and create thin `src/pages/zh-tw/**` wrappers. Implement a shared module `src/lib/render-article.ts` exporting the `getStaticPaths` logic parametrized by locale, with English fallback when a `zh-tw` entry is absent.

`src/lib/render-article.ts`:

```ts
import { getCollection } from 'astro:content';
import { splitArticleId } from './article-paths';

/** Returns the entry for (slug, locale), falling back to the English entry. */
export async function articleStaticPaths(locale: 'en' | 'zh-tw') {
  const all = (await getCollection('articles')).map((e) => ({ entry: e, ...splitArticleId(e.id) }));
  const bySlugLocale = new Map(all.map((a) => [`${a.slug}:${a.locale}`, a.entry]));
  const slugs = [...new Set(all.map((a) => a.slug))];
  return slugs.map((slug) => {
    const entry = bySlugLocale.get(`${slug}:${locale}`) ?? bySlugLocale.get(`${slug}:en`)!;
    return { params: { slug }, props: { entry, locale } };
  });
}
```

- [ ] **Step 2: English route delegates to the shared helper**

In `src/pages/articles/[...slug].astro`, replace the inline `getStaticPaths` with `export const getStaticPaths = () => articleStaticPaths('en');` and use `Astro.props.locale` to set `lang` and the SeriesNav `localePrefix` (`''`).

- [ ] **Step 3: Create the zh-tw mirror**

`src/pages/zh-tw/articles/[...slug].astro`:

```astro
---
import { articleStaticPaths } from '../../../lib/render-article';
export const getStaticPaths = () => articleStaticPaths('zh-tw');
export { default } from '../../articles/[...slug].astro';
---
```

If re-exporting the default component with different `getStaticPaths` is not supported, instead copy the English route's template and pass `locale="zh-tw"` / `localePrefix="/zh-tw"`. Verify which works with a build; keep the one that compiles.

- [ ] **Step 4: Mirror the other routes**

Repeat the locale parametrization for `articles/index`, `series/[slug]`, `series/index`, `resume/index`, creating `src/pages/zh-tw/articles/index.astro`, `src/pages/zh-tw/series/[slug].astro`, `src/pages/zh-tw/series/index.astro`, `src/pages/zh-tw/resume/index.astro`. Each filters/falls back to `zh-tw` and sets `localePrefix="/zh-tw"`. Series detail/index use `localizedSeriesMeta(meta, 'zh-tw')`.

- [ ] **Step 5: Rewrite the language selector URL logic**

In `src/scripts/blog-language-selector.js`, replace the old suffix-based URL construction (`/articles/{slug}/{lang}`) with prefix-based: switching to `zh-tw` maps the current path `P` to `/zh-tw${P}` (stripping any existing `/zh-tw` first); switching to `en` strips a leading `/zh-tw`. Keep the localStorage `blog-language` persistence. The available-languages JSON (emitted by `LanguageSelector.astro`) still drives which options appear.

- [ ] **Step 6: Add redirects for old zh-tw URLs**

`public/_redirects` (Cloudflare/Netlify syntax):

```
/articles/*/zh-tw      /zh-tw/articles/:splat   301
/articles/zh-tw        /zh-tw/articles          301
/series/*/zh-tw        /zh-tw/series/:splat      301
/series/zh-tw          /zh-tw/series            301
/resume/zh-tw          /zh-tw/resume            301
```

(Verify splat semantics against the host; for Vercel, add equivalent `vercel.json` redirects instead.)

- [ ] **Step 7: Verify zh-tw end to end**

Run: `pnpm build && pnpm preview`. Visit `/zh-tw/articles`, `/zh-tw/articles/banana/part-1`, `/zh-tw/series/banana`, `/zh-tw/resume`. Confirm zh-tw content renders where a variant exists and falls back to English where it doesn't. Toggle the language selector both directions and confirm URLs switch correctly. Confirm the 12 zh-tw variants all resolve.

- [ ] **Step 8: Commit**

```bash
git add src/lib/render-article.ts src/pages/zh-tw src/pages/articles src/pages/series src/pages/resume src/scripts/blog-language-selector.js public/_redirects
git commit -m "feat: zh-tw i18n routes, language selector rewrite, legacy redirects"
```

---

## Phase 6 — Cutover

### Task 16: Full build diff + browser acceptance pass

**Files:**
- Create: `scripts/verify-build.sh`

- [ ] **Step 1: Write a URL-coverage verification script**

`scripts/verify-build.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
BASE=../main/dist
NEW=dist

echo "== English URLs present in baseline that must exist in new build =="
missing=0
while IFS= read -r f; do
  rel="${f#"$BASE"/}"
  # skip zh-tw suffix pages (intentionally moved) and asset hashes
  case "$rel" in
    *"/zh-tw/"*|*"/zh-tw.html") continue ;;
  esac
  if [[ "$rel" == */index.html && ! -f "$NEW/$rel" ]]; then
    echo "MISSING: $rel"; missing=$((missing+1))
  fi
done < <(find "$BASE" -name index.html)
echo "missing English pages: $missing"
exit $missing
```

```bash
chmod +x scripts/verify-build.sh
```

- [ ] **Step 2: Run the diff**

Run: `pnpm build && ./scripts/verify-build.sh`
Expected: `missing English pages: 0`. Investigate and fix any missing page (likely a routing or slug bug).

- [ ] **Step 3: Browser acceptance checklist**

Run: `pnpm preview`. Verify in a browser (no console errors on any):
- `/` home: dark mode persists across reload; font-size buttons cycle and persist.
- `/articles/how-i-built-an-infinite-canvas`: canvas demo animates; code blocks show language label + highlight colors; TOC scroll-spy tracks; image viewer opens/zooms on a `data-zoomable` image; any math renders.
- `/articles/banana/part-1`: series nav "Part 1 of 10", working prev/next.
- `/articles`, `/series`: full listings, badges, ordering.
- `/resume`: styled, images load.
- `/zh-tw/articles/banana/part-1`: zh-tw content, CJK fonts/spacing applied.
- Language selector switches both directions with correct URLs.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-build.sh
git commit -m "test: build URL-coverage verification script"
```

---

### Task 17: Remove legacy build system

**Files:**
- Delete: `vite-plugin-markdown.js`, `vite.config.js`, `index.html`, `404.html`, `articles/index.html`, `series/index.html`, `articles/_template/`, `resume/index.html` (if present), `resume/_template/`
- Modify: `package.json` (drop Vite-only deps), `src/main.ts`, `src/style.css`, `src/typescript.svg` (legacy Vite scaffold — remove if unused)

- [ ] **Step 1: Confirm nothing imports the legacy files**

Run:
```bash
grep -rn "vite-plugin-markdown\|vite.config\|articles/_template" src astro.config.mjs || echo "no references"
```
Expected: `no references`.

- [ ] **Step 2: Delete legacy build + template files**

```bash
git rm vite-plugin-markdown.js vite.config.js index.html 404.html articles/index.html series/index.html
git rm -r articles/_template
git rm -f resume/index.html 2>/dev/null || true
git rm -rf resume/_template 2>/dev/null || true
git rm -f src/main.ts src/style.css src/typescript.svg src/vite-env.d.ts 2>/dev/null || true
```

(Keep `articles/**/content*.md`, `series.json`, images, `public/favicon.ico`, `scripts/*.mjs`.)

- [ ] **Step 3: Drop Vite-only dependencies**

Remove from `package.json` devDependencies: `vite`, `marked`, `@types/marked`, `@types/glob`, `glob`. Keep `katex`, `highlight.js` (now used by the pipeline/CSS), `@ue-too/board`, `typescript`. Then:

```bash
pnpm install
```

- [ ] **Step 4: Verify the site still builds and tests pass without legacy files**

Run: `pnpm build && pnpm test && ./scripts/verify-build.sh`
Expected: build PASS, all vitest PASS, `missing English pages: 0`.

- [ ] **Step 5: Confirm the production `site` domain**

Confirm the real domain (spec open item) and set it in `astro.config.mjs` `SITE`. If unknown, leave the documented assumption and flag in the PR.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove legacy Vite build system and templates"
```

---

## Self-review notes (for the executor)

- **Series glob id shape:** the `series`/`articles` collection entry ids from `astro/loaders` `glob` depend on `base`/`generateId`. Tasks 11–13 normalize `series.json` ids to a directory name — confirm the actual id with one `console.log` during the first build of Task 11 and lock the transform. This is the single most likely place to need a small adjustment.
- **Inline `<script>` in `.md`:** verified as a gate in Task 9 Step 1. If inline scripts don't execute, fold those demo bodies into the bundled demo script.
- **zh-tw default re-export:** Task 15 Step 3 has a fallback if Astro disallows re-exporting a component with a different `getStaticPaths` — copy the template instead.
- **Resume markdown import path:** Task 14 imports `../../../resume/content.md`; if Astro restricts importing markdown outside `src/`, move the resume markdown under `src/content/resume/` or add it to a small collection.
