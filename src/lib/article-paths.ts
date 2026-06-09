export interface ParsedArticlePath {
  slug: string;   // directory path under articles/, e.g. "first" or "banana/part-1"
  locale: string; // "en" for content.md, else the variant locale
}

const FILE_RE = /^content(?:\.([a-z]{2}(?:-[a-z]{2})?))?\.mdx?$/i;

/** Returns null for paths that should not become articles (e.g. _template). */
export function parseArticlePath(filePath: string): ParsedArticlePath | null {
  const norm = filePath.replace(/^.*?articles\//, '');
  const parts = norm.split('/');
  const file = parts.pop();
  if (!file) return null;
  const m = file.match(FILE_RE);
  if (!m) return null;
  if (parts[0] === '_template' || parts.length === 0) return null;
  const locale = m[1] ? m[1].toLowerCase() : 'en';
  return { slug: parts.join('/'), locale };
}

/** Splits a collection entry id of the form "<slug>:<locale>". */
export function splitArticleId(id: string): ParsedArticlePath {
  const idx = id.lastIndexOf(':');
  return { slug: id.slice(0, idx), locale: id.slice(idx + 1) };
}
