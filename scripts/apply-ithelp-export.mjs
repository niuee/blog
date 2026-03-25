#!/usr/bin/env node
/**
 * Apply a plain-text / fetch-tool export file to one day folder.
 *
 *   node scripts/apply-ithelp-export.mjs day-9 /path/to/export.txt 2024-09-23 9
 *
 * Writes content.md and content.zh-tw.md (identical). Prepends local banner if present.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  extractBodyFromExport,
  extractTitleFromExport,
  buildFrontmatter
} from './ithelp-article-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERIES = path.join(__dirname, '../articles/ithelp-iron-2024');

const IMG =
  'class="image-shadow image-rounded" style="max-width: 100%; height: auto;"';

function bannerFile(dirName) {
  if (dirName === 'day-12A-1') return 'day12a1-banner.png';
  if (dirName === 'day-12A-2') return 'day12a2-banner.png';
  const m = dirName.match(/^day-(\d+)$/);
  return m ? `day${m[1]}-banner.png` : null;
}

const [, , dirArg, fileArg, published, seriesOrderStr] = process.argv;
if (!dirArg || !fileArg || !published || !seriesOrderStr) {
  console.error(
    'usage: node scripts/apply-ithelp-export.mjs <day-folder> <export.txt> <YYYY-MM-DD> <seriesOrder>'
  );
  process.exit(1);
}

const dayDir = path.join(SERIES, dirArg);
const text = fs.readFileSync(path.resolve(fileArg), 'utf8');
const title = extractTitleFromExport(text);
const body = extractBodyFromExport(text);
if (!title || !body) {
  console.error('extract failed: need ## Day… title and twitter share block in export');
  process.exit(1);
}

const fm = buildFrontmatter({
  title,
  published,
  author: 'vee',
  seriesOrder: parseInt(seriesOrderStr, 10)
});

let lead = '';
const bf = bannerFile(dirArg);
if (bf && fs.existsSync(path.join(dayDir, bf))) {
  lead = `<img src="${bf}" alt="" ${IMG} />\n\n`;
}

const out = fm + lead + body + '\n';
fs.writeFileSync(path.join(dayDir, 'content.md'), out, 'utf8');
fs.writeFileSync(path.join(dayDir, 'content.zh-tw.md'), out, 'utf8');
console.log('wrote', dirArg);
