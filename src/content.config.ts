import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { parseArticlePath } from './lib/article-paths';

const articles = defineCollection({
  loader: glob({
    pattern: ['**/content.md', '**/content.*.md', '**/content.mdx', '**/content.*.mdx', '!_template/**'],
    base: './articles',
    generateId: ({ entry }) => {
      const parsed = parseArticlePath(`articles/${entry}`);
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
      .transform((t) => (typeof t === 'string' ? t.split(',').map((s) => s.trim()).filter(Boolean) : t)),
    seriesOrder: z.number().optional(),
  }),
});

const series = defineCollection({
  loader: glob({ pattern: '**/series.json', base: './articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    i18n: z.record(z.string(), z.object({ title: z.string(), description: z.string().optional() })).optional(),
  }),
});

export const collections = { articles, series };
