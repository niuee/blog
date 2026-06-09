/** Returns the series slug a given article slug belongs to, or null. */
export function seriesOf(slug: string, seriesSlugs: Set<string>): string | null {
  const top = slug.split('/')[0];
  return seriesSlugs.has(top) ? top : null;
}

/** series collection entry id ("banana/series") → series slug ("banana"). */
export function seriesSlugFromId(id: string): string {
  return id.replace(/\/series$/, '');
}
