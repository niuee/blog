#!/usr/bin/env node
/**
 * Pull article bodies from iT邦幫忙 into articles/ithelp-iron-2024 (each day folder) content.md
 * and duplicate to content.zh-tw.md (same content for now).
 *
 * Requires working DNS/network (run on your machine: pnpm ithelp:sync).
 * Source listing: https://ithelp.ithome.com.tw/users/20162903/articles
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  extractBodyFromExport,
  extractMarkdownBodyInnerHtml,
  extractTitleFromExport,
  buildFrontmatter
} from './ithelp-article-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERIES = path.join(__dirname, '../articles/ithelp-iron-2024');

/** dir → ithelp article id, publish date, series sort key */
const ARTICLES = [
  { dir: 'day-1', id: 10343146, published: '2024-09-15', seriesOrder: 1 },
  { dir: 'day-2', id: 10343994, published: '2024-09-16', seriesOrder: 2 },
  { dir: 'day-3', id: 10343995, published: '2024-09-17', seriesOrder: 3 },
  { dir: 'day-4', id: 10343996, published: '2024-09-18', seriesOrder: 4 },
  { dir: 'day-5', id: 10343997, published: '2024-09-19', seriesOrder: 5 },
  { dir: 'day-6', id: 10343998, published: '2024-09-20', seriesOrder: 6 },
  { dir: 'day-7', id: 10343999, published: '2024-09-21', seriesOrder: 7 },
  { dir: 'day-8', id: 10344000, published: '2024-09-22', seriesOrder: 8 },
  { dir: 'day-9', id: 10344002, published: '2024-09-23', seriesOrder: 9 },
  { dir: 'day-10', id: 10344006, published: '2024-09-24', seriesOrder: 10 },
  { dir: 'day-11', id: 10344007, published: '2024-09-25', seriesOrder: 11 },
  { dir: 'day-12', id: 10344008, published: '2024-09-26', seriesOrder: 12 },
  { dir: 'day-12A-1', id: 10342981, published: '2024-09-26', seriesOrder: 13 },
  { dir: 'day-12A-2', id: 10358936, published: '2024-09-26', seriesOrder: 14 },
  { dir: 'day-13', id: 10344010, published: '2024-09-27', seriesOrder: 15 },
  { dir: 'day-14', id: 10344011, published: '2024-09-28', seriesOrder: 16 },
  { dir: 'day-15', id: 10344012, published: '2024-09-29', seriesOrder: 17 },
  { dir: 'day-16', id: 10344014, published: '2024-09-30', seriesOrder: 18 },
  { dir: 'day-17', id: 10344015, published: '2024-10-01', seriesOrder: 19 },
  { dir: 'day-18', id: 10344283, published: '2024-10-02', seriesOrder: 20 },
  { dir: 'day-19', id: 10344285, published: '2024-10-03', seriesOrder: 21 },
  { dir: 'day-20', id: 10344344, published: '2024-10-04', seriesOrder: 22 },
  { dir: 'day-21', id: 10344350, published: '2024-10-05', seriesOrder: 23 },
  { dir: 'day-22', id: 10344351, published: '2024-10-06', seriesOrder: 24 },
  { dir: 'day-23', id: 10344352, published: '2024-10-07', seriesOrder: 25 },
  { dir: 'day-24', id: 10344353, published: '2024-10-08', seriesOrder: 26 },
  { dir: 'day-25', id: 10344354, published: '2024-10-09', seriesOrder: 27 },
  { dir: 'day-26', id: 10344355, published: '2024-10-10', seriesOrder: 28 },
  { dir: 'day-27', id: 10344356, published: '2024-10-11', seriesOrder: 29 },
  { dir: 'day-28', id: 10344357, published: '2024-10-12', seriesOrder: 30 },
  { dir: 'day-29', id: 10344358, published: '2024-10-13', seriesOrder: 31 },
  { dir: 'day-30', id: 10344360, published: '2024-10-14', seriesOrder: 32 }
];

const IMG =
  'class="image-shadow image-rounded" style="max-width: 100%; height: auto;"';

function bannerFile(dirName) {
  if (dirName === 'day-12A-1') return 'day12a1-banner.png';
  if (dirName === 'day-12A-2') return 'day12a2-banner.png';
  const m = dirName.match(/^day-(\d+)$/);
  return m ? `day${m[1]}-banner.png` : null;
}

function stripOuterH2Duplicate(html) {
  return html.replace(/^\s*<h2[^>]*>[\s\S]*?<\/h2>\s*/i, '');
}

async function syncOne({ dir, id, published, seriesOrder }) {
  const url = `https://ithelp.ithome.com.tw/articles/${id}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'blog-sync-ithelp/1.0' } });
  if (!res.ok) throw new Error(`${dir}: HTTP ${res.status} ${url}`);
  const text = await res.text();

  let body = extractBodyFromExport(text);
  let title = extractTitleFromExport(text);

  if (!body) {
    const inner = extractMarkdownBodyInnerHtml(text);
    if (inner) {
      body = stripOuterH2Duplicate(inner).trim();
      const hm = inner.match(/<h2[^>]*>([^<]+)<\/h2>/i);
      if (hm) title = hm[1].trim();
    }
  }

  if (!body) throw new Error(`${dir}: could not extract body from ${url}`);
  if (!title) title = `Day | article ${id}`;

  const dayDir = path.join(SERIES, dir);
  if (!fs.existsSync(dayDir)) fs.mkdirSync(dayDir, { recursive: true });

  const fm = buildFrontmatter({
    title,
    published,
    author: 'vee',
    seriesOrder
  });

  let lead = '';
  const bf = bannerFile(dir);
  if (bf && fs.existsSync(path.join(dayDir, bf))) {
    lead = `<img src="${bf}" alt="" ${IMG} />\n\n`;
  }

  const out = fm + lead + body + '\n';
  fs.writeFileSync(path.join(dayDir, 'content.md'), out, 'utf8');
  fs.writeFileSync(path.join(dayDir, 'content.zh-tw.md'), out, 'utf8');
  console.log('ok', dir, title.slice(0, 50));
}

async function main() {
  let failed = 0;
  for (const a of ARTICLES) {
    try {
      await syncOne(a);
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error(e.message || e);
      failed++;
    }
  }
  if (failed) process.exitCode = 1;
}

main();
