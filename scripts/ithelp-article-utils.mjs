/**
 * Extract main article text from iT邦幫忙 pages as returned by readability-style
 * markdown exports (e.g. Cursor fetch), or similar plain-text dumps.
 */

export function extractTitleFromExport(text) {
  const m = text.match(/^## (Day[^\n]+)/m);
  return m ? m[1].trim() : null;
}

export function extractBodyFromExport(text) {
  const tw = text.indexOf('twitter.com/intent/tweet');
  if (tw === -1) return null;
  const after = text.slice(tw);
  const start = after.indexOf('\n\n');
  if (start === -1) return null;
  let body = after.slice(start + 2);

  const endMarkers = [
    '\n[上一篇',
    '\n[下一篇',
    '\n系列文\n',
    '\n#### 尚未有邦友留言',
    '\n### 2 則留言',
    '\n### 1 則留言',
    '\n- 留言\n',
    '\n- 留言1\n',
    '\n- 留言2\n'
  ];
  for (const marker of endMarkers) {
    const i = body.indexOf(marker);
    if (i !== -1) body = body.slice(0, i);
  }

  return body.trim();
}

export function buildFrontmatter({ title, published, author, seriesOrder }) {
  return `---
title: ${JSON.stringify(title)}
published: ${published}
author: ${author}
seriesOrder: ${seriesOrder}
---

`;
}

/** Balanced &lt;div class="...markdown-body..."&gt; inner HTML from server-rendered iT邦幫忙 pages. */
export function extractMarkdownBodyInnerHtml(html) {
  const idx = html.search(/class="[^"]*markdown-body[^"]*"/i);
  if (idx === -1) return null;
  const divStart = html.lastIndexOf('<div', idx);
  if (divStart === -1) return null;
  const contentStart = html.indexOf('>', divStart) + 1;
  let depth = 1;
  let i = contentStart;
  const lc = html.toLowerCase();
  while (i < html.length && depth > 0) {
    const open = lc.indexOf('<div', i);
    const close = lc.indexOf('</div>', i);
    if (close === -1) return null;
    if (open !== -1 && open < close) {
      depth++;
      i = open + 4;
    } else {
      depth--;
      if (depth === 0) return html.slice(contentStart, close);
      i = close + 6;
    }
  }
  return null;
}
