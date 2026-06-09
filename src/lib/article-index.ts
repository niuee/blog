interface IndexArticle {
  slug: string;
  data: { seriesOrder?: number; published?: Date; date?: Date };
}

interface NewestArticle {
  slug: string;
  title?: string;
  data: { published?: Date; date?: Date };
}

/**
 * Series-grouped order (seriesOrder asc first, then date desc, then slug).
 * Used within a single series; NOT the index default.
 */
export function sortArticlesForIndex<T extends IndexArticle>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = a.data.seriesOrder,
      bo = b.data.seriesOrder;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    const ad = (a.data.published ?? a.data.date)?.getTime() ?? 0;
    const bd = (b.data.published ?? b.data.date)?.getTime() ?? 0;
    if (bd !== ad) return bd - ad;
    return a.slug.localeCompare(b.slug);
  });
}

/**
 * Legacy /articles default order: newest first (date descending), with
 * undated articles last, ties broken by title (then slug) ascending.
 * This matches the legacy "newest" sort option which was the server-rendered
 * default order.
 */
export function sortArticlesByNewest<T extends NewestArticle>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ad = (a.data.published ?? a.data.date)?.getTime();
    const bd = (b.data.published ?? b.data.date)?.getTime();
    if (ad == null && bd == null) {
      // fall through to tie-break
    } else if (ad == null) {
      return 1;
    } else if (bd == null) {
      return -1;
    } else if (bd !== ad) {
      return bd - ad;
    }
    const at = a.title ?? a.slug;
    const bt = b.title ?? b.slug;
    const cmp = at.localeCompare(bt);
    if (cmp !== 0) return cmp;
    return a.slug.localeCompare(b.slug);
  });
}

export function excerptFromBody(body: string, max = 200): string {
  const text = body
    .replace(/^---[\s\S]*?---/, '')
    // strip MDX/ESM import & export statements
    .replace(/^[ \t]*(?:import|export)\b[^\n]*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}
