/**
 * Builds the href for an article link, locale-aware.
 *
 * On a zh-tw page, link to the zh-tw article page (`/zh-tw/articles/<slug>`)
 * ONLY if that slug has a zh-tw variant (present in `zhTwSlugs`); otherwise
 * fall back to the English page (`/articles/<slug>`) to avoid 404s.
 */
export function articleHref(
  slug: string,
  locale: string,
  zhTwSlugs: Set<string>
): string {
  if (locale === 'zh-tw' && zhTwSlugs.has(slug)) {
    return `/zh-tw/articles/${slug}`;
  }
  return `/articles/${slug}`;
}
