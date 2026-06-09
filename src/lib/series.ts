interface ArticleLike {
  slug: string;
  data: { seriesOrder?: number; published?: Date; date?: Date };
}

interface SeriesMeta {
  title: string;
  description?: string;
  i18n?: Record<string, { title: string; description?: string }>;
}

export function orderSeriesArticles<T extends ArticleLike>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = a.data.seriesOrder,
      bo = b.data.seriesOrder;
    if (ao != null && bo != null) return ao - bo;
    if (ao != null) return -1;
    if (bo != null) return 1;
    const ad = (a.data.published ?? a.data.date)?.getTime() ?? 0;
    const bd = (b.data.published ?? b.data.date)?.getTime() ?? 0;
    return bd - ad;
  });
}

export function localizedSeriesMeta(
  meta: SeriesMeta,
  locale: string
): { title: string; description?: string } {
  const loc = locale !== 'en' ? meta.i18n?.[locale] : undefined;
  return { title: loc?.title ?? meta.title, description: loc?.description ?? meta.description };
}
