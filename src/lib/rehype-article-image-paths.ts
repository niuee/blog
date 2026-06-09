import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';

/**
 * Articles reference co-located images via raw HTML `<img src="day1-banner.png" .../>`
 * with relative paths. The matching image files are mirrored into `public/articles/<...>`
 * (so they serve at `/articles/<...>`). This plugin rewrites those relative `src`
 * attributes to absolute `/articles/<slug>/<file>` paths so they resolve regardless of
 * trailing-slash behaviour, matching the legacy build's absolute output.
 *
 * IMPORTANT: by the time rehype plugins run, Astro has already serialised the raw inline
 * `<img>` HTML into `raw`-type hast nodes (NOT `element` nodes with tagName 'img').
 * A `visit(tree, 'element')` therefore never sees them, so we regex-rewrite the `src`
 * within `raw` nodes (scoped to `<img>`/`<source>` tags). We also handle real `element`
 * nodes defensively, in case any content emits proper img elements (e.g. via MDX).
 */
export function rehypeArticleImagePaths() {
  return (tree: Root, file: { path?: string; history?: string[] }) => {
    const base = deriveBase(file?.path ?? file?.history?.[0]);
    if (!base) return;

    // Real element nodes (defensive; MDX/markdown image syntax).
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img' && node.tagName !== 'source') return;
      const src = node.properties?.src;
      if (typeof src === 'string') {
        node.properties!.src = toAbsoluteSrc(base, src);
      }
    });

    // Raw HTML nodes: rewrite src="..." inside <img>/<source> tags.
    visit(tree, (node: { type: string; value?: string }) => {
      if (node.type !== 'raw' || typeof node.value !== 'string') return;
      if (!/<(?:img|source)\b/i.test(node.value)) return;
      node.value = rewriteRawHtml(base, node.value);
    });
  };
}

/**
 * Derive the served base path (e.g. `/articles/ithelp-iron-2024/day-1`) from the
 * absolute source path of the markdown file. Strips the project root up to and
 * including the working directory, then drops the trailing `/content.<...>.md(x)`.
 * Returns null if the path can't be parsed.
 */
export function deriveBase(filePath: string | undefined): string | null {
  if (!filePath) return null;
  let p = filePath.replace(/\\/g, '/');
  // Make relative to the project: prefer the segment starting at `articles/`,
  // else strip the cwd prefix.
  const cwd = process.cwd().replace(/\\/g, '/');
  if (p.startsWith(cwd + '/')) p = p.slice(cwd.length + 1);
  // Drop the trailing /content.<locale>.md / content.mdx file segment.
  const m = p.match(/^(.*)\/content(?:\.[a-z]{2}(?:-[a-z]{2})?)?\.mdx?$/i);
  if (!m) return null;
  const dir = m[1].replace(/^\/+/, '');
  if (!dir) return null;
  return '/' + dir;
}

const ABSOLUTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|data:|#)/i;

/** Prefix a relative src with the base; leave absolute / protocol / data / hash srcs alone. */
export function toAbsoluteSrc(base: string, src: string): string {
  if (!src) return src;
  if (ABSOLUTE_RE.test(src)) return src;
  return base + '/' + src;
}

/** Rewrite `src="..."` (and `src='...'`) attributes inside <img>/<source> tags of a raw HTML string. */
function rewriteRawHtml(base: string, html: string): string {
  return html.replace(
    /(<(?:img|source)\b[^>]*?\bsrc\s*=\s*)(["'])([^"']*)\2/gi,
    (full, prefix: string, quote: string, src: string) =>
      `${prefix}${quote}${toAbsoluteSrc(base, src)}${quote}`,
  );
}
