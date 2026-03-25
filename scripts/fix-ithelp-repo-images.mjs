#!/usr/bin/env node
/**
 * Replace niuee.github.io/ithelp-iron-gif hosted images with local <img> tags
 * (no data-zoomable — blog zoom viewer only binds to data-zoomable).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERIES_ROOT = path.join(__dirname, '../articles/ithelp-iron-2024');

const IMG_CLASS =
  'class="image-shadow image-rounded" style="max-width: 100%; height: auto;"';

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function processContent(mdPath) {
  const dir = path.dirname(mdPath);
  let s = fs.readFileSync(mdPath, 'utf8');
  const orig = s;

  s = s.replace(
    /!\[([^\]]*)\]\(https:\/\/niuee\.github\.io\/ithelp-iron-gif\/(?:chapter\d+\/)?([^)]+)\)/g,
    (m, alt, fname) => {
      const src = fname.trim();
      const full = path.join(dir, decodeURIComponent(src));
      if (!fs.existsSync(full)) {
        console.warn(`[fix-ithelp-repo-images] missing file: ${full}`);
      }
      return `<img src="${src}" alt="${escapeAttr(alt)}" ${IMG_CLASS} />`;
    }
  );

  s = s.replace(/\s*data-zoomable\s*/g, ' ');

  if (s !== orig) {
    fs.writeFileSync(mdPath, s, 'utf8');
    console.log('updated', path.relative(SERIES_ROOT, mdPath));
  }
}

function walk(root) {
  if (!fs.existsSync(root)) return;
  for (const name of fs.readdirSync(root)) {
    const p = path.join(root, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name === 'content.md' || name === 'content.zh-tw.md') processContent(p);
  }
}

walk(SERIES_ROOT);
