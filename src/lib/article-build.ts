import { getCollection } from 'astro:content';
import { splitArticleId } from './article-paths';
import { orderSeriesArticles, localizedSeriesMeta } from './series';
import { seriesOf, seriesSlugFromId } from './series-membership';

type Locale = 'en' | 'zh-tw';

/** Builds getStaticPaths entries for article pages in the requested locale. */
export async function buildArticlePaths(locale: Locale) {
  const seriesEntries = await getCollection('series');
  const all = await getCollection('articles');
  const seriesSlugs = new Set(seriesEntries.map((s) => seriesSlugFromId(s.id)));

  const articles = all.map((entry) => ({ entry, ...splitArticleId(entry.id) }));

  // Per-slug available locales. null represents en.
  const zhSlugs = new Set(articles.filter((a) => a.locale === 'zh-tw').map((a) => a.slug));
  const availFor = (slug: string): (string | null)[] =>
    zhSlugs.has(slug) ? [null, 'zh-tw'] : [null];

  // Articles in the requested locale.
  const inLocale = articles.filter((a) => a.locale === locale);

  return inLocale.map((e) => {
    const ss = seriesOf(e.slug, seriesSlugs);
    let seriesContext = null;

    if (ss) {
      // Series members that have an entry in THIS locale.
      const ordered = orderSeriesArticles(
        inLocale
          .filter((a) => seriesOf(a.slug, seriesSlugs) === ss)
          .map((a) => ({ slug: a.slug, data: a.entry.data }))
      );
      const index = ordered.findIndex((a) => a.slug === e.slug);
      const total = ordered.length;
      const prevItem = index > 0 ? ordered[index - 1] : null;
      const nextItem = index < total - 1 ? ordered[index + 1] : null;
      const prev = prevItem ? { slug: prevItem.slug, title: prevItem.data.title } : null;
      const next = nextItem ? { slug: nextItem.slug, title: nextItem.data.title } : null;
      const seriesMeta = seriesEntries.find((s) => seriesSlugFromId(s.id) === ss)!.data;
      const seriesTitle = localizedSeriesMeta(seriesMeta, locale).title;

      seriesContext = {
        seriesSlug: ss,
        seriesTitle,
        index,
        total,
        prev,
        next,
        localePrefix: locale === 'zh-tw' ? '/zh-tw' : '',
      };
    }

    return {
      params: { slug: e.slug },
      props: {
        entry: e.entry,
        locale,
        seriesContext,
        availableLanguages: availFor(e.slug),
      },
    };
  });
}
