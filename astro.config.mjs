// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeExternalLinks from 'rehype-external-links';

// NOTE: confirm the real production domain later (spec open item).
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
