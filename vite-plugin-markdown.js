import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync, mkdirSync, watch } from 'fs';
import { join, dirname, resolve, extname, basename, relative } from 'path';
import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import { build } from 'vite';

// Configure marked once
let markedConfigured = false;

/**
 * Configure marked with syntax highlighting
 */
function configureMarked() {
  if (markedConfigured) return;
  
  // Create a new renderer instance with all default methods
  const renderer = new marked.Renderer();
  
  // Save the original code method (if needed)
  const originalCode = renderer.code.bind(renderer);
  
  // Override the code method
  // In marked v16+, code receives an object: {text, lang, escaped}
  renderer.code = function({text, lang, escaped}) {
    // text is the code content, lang is the language
    const codeStr = typeof text === 'string' ? text : String(text || '');
    const language = typeof lang === 'string' ? lang : String(lang || '');
    const langClass = language ? ` class="hljs language-${language}"` : ' class="hljs"';
    let highlighted = '';
    
    // Try to highlight if we have a language
    if (language && hljs.getLanguage(language)) {
      try {
        // Highlight the raw code string
        const result = hljs.highlight(codeStr, { language });
        highlighted = result.value;
      } catch (err) {
        // If highlighting fails, escape the code
        highlighted = escapeHtml(codeStr);
      }
    } else if (language) {
      // Language specified but not recognized - try auto-detection
      try {
        const autoResult = hljs.highlightAuto(codeStr);
        highlighted = autoResult.value;
      } catch (err) {
        highlighted = escapeHtml(codeStr);
      }
    } else {
      // No language specified - just escape
      highlighted = escapeHtml(codeStr);
    }
    
    // Add language label if language is specified
    const langLabel = language ? `<span class="code-language-label">${escapeHtml(language)}</span>` : '';
    
    return `<pre>${langLabel}<code${langClass}>${highlighted}</code></pre>`;
  };
  
  // Override the link method to add target="_blank" for external links
  // In marked v16+, link receives an object: {href, title, text}
  // Note: text is already rendered HTML (may contain other markdown elements)
  renderer.link = function({href, title, text}) {
    const hrefStr = typeof href === 'string' ? href : String(href || '');
    const titleStr = typeof title === 'string' ? title : String(title || '');
    // text is already HTML, so use it as-is
    const textHtml = text || '';
    
    // Check if it's an external link (starts with http:// or https://)
    const isExternal = hrefStr.startsWith('http://') || hrefStr.startsWith('https://');
    
    // Build the link attributes
    let attrs = `href="${escapeHtml(hrefStr)}"`;
    
    // Add target="_blank" and rel="noopener noreferrer" for external links
    if (isExternal) {
      attrs += ' target="_blank" rel="noopener noreferrer"';
    }
    
    // Add title attribute if present
    if (titleStr) {
      attrs += ` title="${escapeHtml(titleStr)}"`;
    }
    
    return `<a ${attrs}>${textHtml}</a>`;
  };
  
  // Configure marked with the extended renderer
  marked.setOptions({
    renderer,
    breaks: true,
    gfm: true
  });
  
  markedConfigured = true;
}

function escapeHtml(text) {
  // Ensure text is a string
  if (typeof text !== 'string') {
    text = String(text || '');
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: null, content: content };
  }
  
  const frontmatterText = match[1];
  const body = content.slice(match[0].length);
  
  const frontmatter = {};
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  });
  
  return { frontmatter, content: body };
}

/**
 * Extract title from markdown (first h1 or from frontmatter)
 */
function extractTitle(content) {
  // First try to find h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return null;
}

/**
 * Remove first h1 from markdown content
 */
function removeFirstH1(content) {
  return content.replace(/^#\s+.+$/m, '').trim();
}

/**
 * Format date from various formats
 */
function formatDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Process math equations in raw markdown (before markdown conversion)
 * This prevents markdown from converting math content to HTML tags
 */
function processMathInMarkdown(markdown) {
  let result = markdown;
  
  // First, replace block equations ($$...$$) with placeholders
  const blockPlaceholders = [];
  let placeholderIndex = 0;
  
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, equation) => {
    try {
      // Clean up the equation (remove extra whitespace/newlines)
      const cleaned = equation.trim().replace(/\s+/g, ' ');
      const rendered = katex.renderToString(cleaned, {
        displayMode: true,
        throwOnError: false
      });
      const placeholder = `__KATEX_BLOCK_${placeholderIndex}__`;
      blockPlaceholders[placeholderIndex] = rendered;
      placeholderIndex++;
      return placeholder;
    } catch (e) {
      const placeholder = `__KATEX_BLOCK_${placeholderIndex}__`;
      blockPlaceholders[placeholderIndex] = `<span class="math-error">${escapeHtml(equation.trim())}</span>`;
      placeholderIndex++;
      return placeholder;
    }
  });
  
  // Now process inline equations (single $...$) but avoid conflicts
  result = result.replace(/\$([^\$\n]+?)\$/g, (match, equation) => {
    // Skip if it's part of a block equation placeholder
    if (match.includes('__KATEX_BLOCK_')) {
      return match;
    }
    try {
      const cleaned = equation.trim();
      return katex.renderToString(cleaned, {
        displayMode: false,
        throwOnError: false
      });
    } catch (e) {
      return `<span class="math-error">${escapeHtml(equation.trim())}</span>`;
    }
  });
  
  // Restore block equations
  blockPlaceholders.forEach((rendered, index) => {
    result = result.replace(`__KATEX_BLOCK_${index}__`, rendered);
  });
  
  return result;
}

/**
 * Find all HTML files recursively in a directory
 */
function findHtmlFiles(dir, files = []) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip template directory
        if (entry !== '_template') {
          findHtmlFiles(fullPath, files);
        }
      } else if (entry.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: Could not read directory ${dir}:`, err.message);
    }
  }
  
  return files;
}

/**
 * Find all language variants for a blog post directory
 * Returns an array of { lang: 'en'|'zh'|null, mdPath: string }
 */
function findLanguageVariants(postDir) {
  const variants = [];
  
  // Check for default content.md (no language specified)
  const defaultMdPath = join(postDir, 'content.md');
  if (existsSync(defaultMdPath)) {
    variants.push({ lang: null, mdPath: defaultMdPath });
  }
  
  // Check for language-specific files (content.en.md, content.zh.md, etc.)
  try {
    const entries = readdirSync(postDir);
    const langPattern = /^content\.([a-z]{2}(-[a-z]{2})?)\.md$/i;
    
    for (const entry of entries) {
      const match = entry.match(langPattern);
      if (match) {
        const lang = match[1].toLowerCase();
        const mdPath = join(postDir, entry);
        variants.push({ lang, mdPath });
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return variants;
}

/**
 * Find all blog post directories that contain content.md or language variants.
 * Standalone: articles/{slug}/content.md
 * Series: articles/{series-slug}/{article-slug}/content.md (top-level dir has no content.md)
 */
function findBlogPosts(blogDir) {
  const posts = [];

  try {
    const entries = readdirSync(blogDir);

    for (const entry of entries) {
      const fullPath = join(blogDir, entry);
      const stat = statSync(fullPath);

      if (!stat.isDirectory() || entry === '_template') {
        continue;
      }

      const defaultMdPath = join(fullPath, 'content.md');
      const hasOwnContent = existsSync(defaultMdPath);

      if (hasOwnContent) {
        // Standalone article
        const variants = findLanguageVariants(fullPath);
        if (variants.length === 1 && variants[0].lang === null) {
          posts.push({
            dir: fullPath,
            name: entry,
            seriesName: null,
            lang: null,
            htmlPath: join(fullPath, 'index.html'),
            mdPath: variants[0].mdPath
          });
        } else {
          for (const variant of variants) {
            const langSuffix = variant.lang ? `.${variant.lang}` : '';
            posts.push({
              dir: fullPath,
              name: entry,
              seriesName: null,
              lang: variant.lang,
              htmlPath: join(fullPath, `index${langSuffix}.html`),
              mdPath: variant.mdPath
            });
          }
        }
      } else {
        // Possibly a series folder: subdirs with content.md
        try {
          const subEntries = readdirSync(fullPath);
          for (const subEntry of subEntries) {
            const subPath = join(fullPath, subEntry);
            if (!statSync(subPath).isDirectory()) continue;
            const variants = findLanguageVariants(subPath);
            if (variants.length === 0) continue;
            const seriesName = entry;
            if (variants.length === 1 && variants[0].lang === null) {
              posts.push({
                dir: subPath,
                name: subEntry,
                seriesName,
                lang: null,
                htmlPath: join(subPath, 'index.html'),
                mdPath: variants[0].mdPath
              });
            } else {
              for (const variant of variants) {
                const langSuffix = variant.lang ? `.${variant.lang}` : '';
                posts.push({
                  dir: subPath,
                  name: subEntry,
                  seriesName,
                  lang: variant.lang,
                  htmlPath: join(subPath, `index${langSuffix}.html`),
                  mdPath: variant.mdPath
                });
              }
            }
          }
        } catch (err) {
            // Ignore
          }
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: Could not read directory ${blogDir}:`, err.message);
    }
  }

  return posts;
}

/**
 * Read a single article's metadata from a content path (used for standalone and series)
 */
function readArticleMeta(mdPath, entryName, url, seriesSlug = null) {
  let title, date, author, tags, excerpt, hasLangVariant, seriesOrder;
  try {
    const markdownContent = readFileSync(mdPath, 'utf-8');
    const { frontmatter, content: bodyContent } = parseFrontmatter(markdownContent);
    title = frontmatter?.title || extractTitle(bodyContent) || entryName;
    date = frontmatter?.date || frontmatter?.published || null;
    author = frontmatter?.author || null;
    tags = [];
    if (frontmatter?.tags) {
      if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags.split(',').map(t => t.trim()).filter(t => t);
      } else if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags.map(t => String(t).trim()).filter(t => t);
      }
    }
    seriesOrder = frontmatter?.seriesOrder != null ? Number(frontmatter.seriesOrder) : null;
    excerpt = '';
    const contentWithoutH1 = removeFirstH1(bodyContent);
    const paragraphMatch = contentWithoutH1.match(/^([^#<\n][^\n]*)/m);
    if (paragraphMatch) {
      excerpt = paragraphMatch[1].trim()
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]+>/g, '');
      if (excerpt.length > 200) excerpt = excerpt.substring(0, 200).trim() + '...';
    }
    hasLangVariant = false;
    const dir = dirname(mdPath);
    try {
      readdirSync(dir).forEach(f => {
        if (/^content\.[a-z]{2}(-[a-z]{2})?\.md$/i.test(f)) hasLangVariant = true;
      });
    } catch (_) {}
    return {
      name: entryName,
      title,
      date,
      formattedDate: formatDate(date),
      author,
      tags,
      excerpt,
      url,
      hasLangVariant,
      series: seriesSlug ?? null,
      seriesOrder: seriesOrder ?? null
    };
  } catch (err) {
    console.warn(`Warning: Could not read article ${entryName}:`, err.message);
    return null;
  }
}

/**
 * Get article metadata for listing page (standalone + series articles)
 * @param {string} blogDir - The articles directory path
 * @param {string|null} lang - Language code (null for default)
 */
function getArticlesMetadata(blogDir, lang = null) {
  const articles = [];

  try {
    const entries = readdirSync(blogDir);

    for (const entry of entries) {
      const fullPath = join(blogDir, entry);
      const stat = statSync(fullPath);

      if (!stat.isDirectory() || entry === '_template') continue;

      const defaultMdPath = join(fullPath, 'content.md');
      const hasOwnContent = existsSync(defaultMdPath);

      if (hasOwnContent) {
        const langMdPath = lang ? join(fullPath, `content.${lang}.md`) : null;
        let mdPath = defaultMdPath;
        let hasLangVariant = false;
        if (lang && existsSync(langMdPath)) {
          mdPath = langMdPath;
          hasLangVariant = true;
        } else if (!existsSync(defaultMdPath)) continue;

        const url = lang ? `/articles/${entry}/${lang}` : `/articles/${entry}`;
        const meta = readArticleMeta(mdPath, entry, url, null);
        if (meta) {
          meta.hasLangVariant = hasLangVariant;
          articles.push(meta);
        }
      } else {
        try {
          const subEntries = readdirSync(fullPath);
          const seriesSlug = entry;
          for (const subEntry of subEntries) {
            const subPath = join(fullPath, subEntry);
            if (!statSync(subPath).isDirectory()) continue;
            const subDefault = join(subPath, 'content.md');
            if (!existsSync(subDefault)) continue;
            const subLangPath = lang ? join(subPath, `content.${lang}.md`) : null;
            let mdPath = subDefault;
            let hasLangVariant = false;
            if (lang && existsSync(subLangPath)) {
              mdPath = subLangPath;
              hasLangVariant = true;
            }
            const url = lang ? `/articles/${seriesSlug}/${subEntry}/${lang}` : `/articles/${seriesSlug}/${subEntry}`;
            const meta = readArticleMeta(mdPath, subEntry, url, seriesSlug);
            if (meta) {
              meta.hasLangVariant = hasLangVariant;
              articles.push(meta);
            }
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: Could not read articles directory:`, err.message);
    }
  }

  articles.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  return articles;
}

/**
 * Get series metadata (slug, title, description, articles) for listing
 * @param {string} blogDir
 * @param {string|null} lang
 */
function getSeriesMetadata(blogDir, lang = null) {
  const seriesList = [];

  try {
    const entries = readdirSync(blogDir);
    for (const entry of entries) {
      const fullPath = join(blogDir, entry);
      const stat = statSync(fullPath);
      if (!stat.isDirectory() || entry === '_template') continue;
      if (existsSync(join(fullPath, 'content.md'))) continue;

      const articles = [];
      try {
        const subEntries = readdirSync(fullPath);
        for (const subEntry of subEntries) {
          const subPath = join(fullPath, subEntry);
          if (!statSync(subPath).isDirectory()) continue;
          const subDefault = join(subPath, 'content.md');
          if (!existsSync(subDefault)) continue;
          const subLangPath = lang ? join(subPath, `content.${lang}.md`) : null;
          const mdPath = (lang && existsSync(subLangPath)) ? subLangPath : subDefault;
          const url = lang ? `/articles/${entry}/${subEntry}/${lang}` : `/articles/${entry}/${subEntry}`;
          const meta = readArticleMeta(mdPath, subEntry, url, entry);
          if (meta) articles.push(meta);
        }
      } catch (_) {}

      if (articles.length === 0) continue;

      articles.sort((a, b) => {
        if (a.seriesOrder != null && b.seriesOrder != null) return a.seriesOrder - b.seriesOrder;
        if (a.seriesOrder != null) return -1;
        if (b.seriesOrder != null) return 1;
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      });

      let title = entry.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      let description = '';
      const seriesJsonPath = join(fullPath, 'series.json');
      if (existsSync(seriesJsonPath)) {
        try {
          const data = JSON.parse(readFileSync(seriesJsonPath, 'utf-8'));
          if (lang && data.i18n && data.i18n[lang]) {
            if (data.i18n[lang].title) title = data.i18n[lang].title;
            if (data.i18n[lang].description != null) description = data.i18n[lang].description;
          } else {
            if (data.title) title = data.title;
            if (data.description != null) description = data.description;
          }
        } catch (_) {}
      }

      seriesList.push({ slug: entry, title, description, articles });
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: Could not read series:`, err.message);
    }
  }

  return seriesList;
}

/**
 * Get available languages for articles listing (standalone + series articles)
 */
function getAvailableArticlesLanguages(blogDir) {
  const languages = new Set();
  languages.add(null);

  function scanDir(dirPath) {
    try {
      const files = readdirSync(dirPath);
      const langPattern = /^content\.([a-z]{2}(-[a-z]{2})?)\.md$/i;
      for (const file of files) {
        const match = file.match(langPattern);
        if (match) languages.add(match[1].toLowerCase());
      }
    } catch (_) {}
  }

  try {
    const entries = readdirSync(blogDir);
    for (const entry of entries) {
      const fullPath = join(blogDir, entry);
      const stat = statSync(fullPath);
      if (!stat.isDirectory() || entry === '_template') continue;
      if (existsSync(join(fullPath, 'content.md'))) {
        scanDir(fullPath);
      } else {
        try {
          const subEntries = readdirSync(fullPath);
          for (const sub of subEntries) {
            const subPath = join(fullPath, sub);
            if (statSync(subPath).isDirectory()) scanDir(subPath);
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {}
  }

  return Array.from(languages);
}

/**
 * Collect all unique tags from articles
 */
function collectAllTags(articles) {
  const tagSet = new Set();
  for (const article of articles) {
    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach(tag => tagSet.add(tag));
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Generate HTML for articles list with embedded data for client-side features
 */
function generateArticlesListHtml(articles) {
  // Collect all unique tags
  const allTags = collectAllTags(articles);
  
  // Embed articles data as JSON for client-side use
  const articlesJson = JSON.stringify(articles.map(a => ({
    name: a.name,
    title: a.title,
    date: a.date,
    formattedDate: a.formattedDate,
    author: a.author,
    tags: a.tags || [],
    excerpt: a.excerpt,
    url: a.url,
    series: a.series ?? null,
    seriesOrder: a.seriesOrder ?? null
  })));
  
  let html = `<script id="articles-data" type="application/json">${articlesJson}</script>`;
  
  // Add controls section (collapsible)
  html += `
    <div class="articles-controls collapsed" id="articles-controls">
      <div class="controls-header" id="controls-header">
        <span class="controls-title">
          <span class="controls-toggle">▼</span>
          Filter & Sort
          <span class="controls-summary" id="controls-summary"></span>
        </span>
        <span id="articles-count" class="articles-count">${articles.length} article${articles.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="controls-body">
        <div class="articles-controls-row">
          <div class="articles-filter">
            <label for="tag-filter">Filter by tag:</label>
            <select id="tag-filter" class="tag-filter-select">
              <option value="">All tags</option>
              ${allTags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('')}
            </select>
          </div>
          <div class="articles-sort">
            <label for="sort-order">Sort:</label>
            <select id="sort-order" class="sort-order-select">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>
        </div>
        <div class="articles-info">
          <span id="active-filter" class="active-filter" style="display: none;"></span>
        </div>
      </div>
    </div>
  `;
  
  if (articles.length === 0) {
    html += '<p class="no-articles">No articles yet. Check back soon!</p>';
    return html;
  }
  
  // Generate article items with data attributes for filtering
  html += '<ul class="article-list" id="article-list">';
  
  for (const article of articles) {
    const tagsAttr = article.tags && article.tags.length > 0 
      ? `data-tags="${escapeHtml(article.tags.join(','))}"` 
      : 'data-tags=""';
    const dateAttr = article.date ? `data-date="${article.date}"` : 'data-date=""';
    const seriesBadge = article.series
      ? `<div class="article-meta"><a href="/series/${escapeHtml(article.series)}" class="article-series-badge">Series: ${escapeHtml(article.series.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</a></div>`
      : '';

    html += `
      <li class="article-item" ${tagsAttr} ${dateAttr} data-title="${escapeHtml(article.title)}" data-series="${escapeHtml(article.series || '')}">
        <a href="${escapeHtml(article.url)}" class="article-link">
          <h2 class="article-title">${escapeHtml(article.title)}</h2>
          ${seriesBadge}
          ${article.formattedDate || article.author || (article.tags && article.tags.length > 0) ? `
          <div class="article-meta">
            ${article.formattedDate ? `<time datetime="${article.date}">${article.formattedDate}</time>` : ''}
            ${article.formattedDate && article.author ? ' • ' : ''}
            ${article.author ? escapeHtml(article.author) : ''}
          </div>
          ` : ''}
          ${article.tags && article.tags.length > 0 ? `
          <div class="article-tags">
            ${article.tags.map(tag => `<span class="article-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
          ` : ''}
          ${article.excerpt ? `<p class="article-excerpt">${escapeHtml(article.excerpt)}</p>` : ''}
        </a>
      </li>
    `;
  }
  
  html += '</ul>';
  
  // Add pagination container
  html += '<div class="articles-pagination" id="articles-pagination"></div>';
  
  return html;
}

/**
 * Generate HTML for the series list page
 * @param {Array} seriesList
 * @param {string|null} lang - Language code for series detail links
 */
function generateSeriesListHtml(seriesList, lang = null) {
  if (!seriesList || seriesList.length === 0) {
    return '<p class="no-articles" data-i18n="seriesEmpty">No series yet.</p>';
  }
  let html = '<ul class="article-list series-list">';
  for (const series of seriesList) {
    const url = lang ? `/series/${escapeHtml(series.slug)}/${lang}` : `/series/${escapeHtml(series.slug)}`;
    const ac = series.articles.length;
    html += `
      <li class="article-item series-item">
        <a href="${url}" class="article-link">
          <h2 class="article-title">${escapeHtml(series.title)}</h2>
          ${series.description ? `<p class="article-excerpt">${escapeHtml(series.description)}</p>` : ''}
          <div class="article-meta" data-i18n-article-count="${ac}">${ac} article${ac !== 1 ? 's' : ''}</div>
        </a>
      </li>
    `;
  }
  html += '</ul>';
  return html;
}

/**
 * Resolve current article position within a series (for top/bottom nav)
 * @param {string} seriesSlug
 * @param {string} articleName
 * @param {string} blogDir
 * @param {string|null} lang
 * @returns {{ series: object, seriesSlug: string, idx: number, total: number, partNum: number, prevArticle: object|null, nextArticle: object|null, seriesUrl: string }|null}
 */
function getSeriesArticleNavContext(seriesSlug, articleName, blogDir, lang) {
  const seriesList = getSeriesMetadata(blogDir, lang);
  const series = seriesList.find(s => s.slug === seriesSlug);
  if (!series || !series.articles || series.articles.length === 0) return null;
  const idx = series.articles.findIndex(a => a.name === articleName);
  if (idx < 0) return null;
  const total = series.articles.length;
  const partNum = idx + 1;
  const prevArticle = idx > 0 ? series.articles[idx - 1] : null;
  const nextArticle = idx < total - 1 ? series.articles[idx + 1] : null;
  const seriesUrl = lang ? `/series/${escapeHtml(seriesSlug)}/${lang}` : `/series/${escapeHtml(seriesSlug)}`;
  return { series, seriesSlug, idx, total, partNum, prevArticle, nextArticle, seriesUrl };
}

/**
 * Generate series navigation HTML for an article page (Part X of Y, Prev, Next, link to series)
 * @param {string} seriesSlug
 * @param {string} articleName
 * @param {string} blogDir
 * @param {string|null} lang
 * @returns {string}
 */
function generateSeriesNavHtml(seriesSlug, articleName, blogDir, lang) {
  const ctx = getSeriesArticleNavContext(seriesSlug, articleName, blogDir, lang);
  if (!ctx) return '';
  const { series, total, partNum, prevArticle, nextArticle, seriesUrl } = ctx;
  let html = '<nav class="series-nav" aria-label="Series navigation">';
  html += `<span class="series-nav-label">Part ${partNum} of ${total}</span>`;
  html += ` · <a href="${seriesUrl}" class="series-nav-link">${escapeHtml(series.title)}</a>`;
  if (prevArticle) {
    html += ` · <a href="${escapeHtml(prevArticle.url)}" class="series-nav-link series-nav-prev">← Previous</a>`;
  }
  if (nextArticle) {
    html += ` · <a href="${escapeHtml(nextArticle.url)}" class="series-nav-link series-nav-next">Next →</a>`;
  }
  html += '</nav>';
  return html;
}

/**
 * Previous/next cards below the article body (series articles only)
 * @param {string} seriesSlug
 * @param {string} articleName
 * @param {string} blogDir
 * @param {string|null} lang
 * @returns {string}
 */
function generateSeriesNavBottomHtml(seriesSlug, articleName, blogDir, lang) {
  const ctx = getSeriesArticleNavContext(seriesSlug, articleName, blogDir, lang);
  if (!ctx) return '';
  const { prevArticle, nextArticle } = ctx;
  if (!prevArticle && !nextArticle) return '';

  let html = '<nav class="series-nav-bottom" aria-label="Series article navigation">';
  html += '<div class="series-nav-bottom-row">';
  if (prevArticle) {
    html += `<a href="${escapeHtml(prevArticle.url)}" class="series-nav-bottom-card series-nav-bottom-prev" rel="prev"><span class="series-nav-bottom-label">← Previous</span><span class="series-nav-bottom-title">${escapeHtml(prevArticle.title)}</span></a>`;
  } else {
    html += '<span class="series-nav-bottom-spacer" aria-hidden="true"></span>';
  }
  if (nextArticle) {
    html += `<a href="${escapeHtml(nextArticle.url)}" class="series-nav-bottom-card series-nav-bottom-next" rel="next"><span class="series-nav-bottom-label">Next →</span><span class="series-nav-bottom-title">${escapeHtml(nextArticle.title)}</span></a>`;
  } else {
    html += '<span class="series-nav-bottom-spacer" aria-hidden="true"></span>';
  }
  html += '</div></nav>';
  return html;
}

/**
 * Generate HTML for a single series detail page (list of articles in the series)
 */
function generateSeriesDetailHtml(series) {
  if (!series || !series.articles || series.articles.length === 0) {
    return '<p class="no-articles" data-i18n="seriesDetailEmpty">No articles in this series.</p>';
  }
  let html = `<div class="series-detail-header"><p class="article-excerpt">${escapeHtml(series.description || '')}</p></div>`;
  html += '<ul class="article-list">';
  for (const article of series.articles) {
    const ord = article.seriesOrder != null ? article.seriesOrder : '';
    const partMeta =
      article.seriesOrder != null
        ? `<div class="article-meta" data-i18n-part="${escapeHtml(String(ord))}">Part ${escapeHtml(String(ord))}</div>`
        : '';
    html += `
      <li class="article-item" data-series-order="${article.seriesOrder != null ? article.seriesOrder : ''}">
        <a href="${escapeHtml(article.url)}" class="article-link">
          <h2 class="article-title">${escapeHtml(article.title)}</h2>
          ${partMeta}
          ${article.formattedDate || article.author ? `
          <div class="article-meta">
            ${article.formattedDate ? `<time datetime="${article.date}">${article.formattedDate}</time>` : ''}
            ${article.formattedDate && article.author ? ' • ' : ''}
            ${article.author ? escapeHtml(article.author) : ''}
          </div>
          ` : ''}
          ${article.excerpt ? `<p class="article-excerpt">${escapeHtml(article.excerpt)}</p>` : ''}
        </a>
      </li>
    `;
  }
  html += '</ul>';
  return html;
}

/**
 * Process TypeScript script tags in HTML content for dev mode
 * Updates relative script paths to absolute paths based on blog post location
 */
function processTypeScriptForDev(htmlContent, blogPostDir, blogPostName) {
  // Find all script tags with src attributes pointing to .ts files
  const scriptRegex = /<script([^>]*)src=["']([^"']+\.ts)["']([^>]*)>(?:<\/script>)?/gi;
  return htmlContent.replace(scriptRegex, (match, beforeSrc = '', scriptSrc = '', afterSrc = '') => {
    if (!scriptSrc || scriptSrc.startsWith('http') || scriptSrc.startsWith('//') || scriptSrc.startsWith('/')) {
      return match;
    }

    const sourceTsPath = resolve(blogPostDir, scriptSrc);
    if (!existsSync(sourceTsPath)) {
      console.warn(`Warning: TypeScript file not found: ${sourceTsPath}`);
      return match;
    }

    // Update script path to be absolute from root (e.g., /articles/first/test.ts)
    const newScriptSrc = `/articles/${blogPostName}/${scriptSrc}`;

    // Ensure script tag has type="module"
    let rawAttributes = `${beforeSrc}${afterSrc}`;
    rawAttributes = rawAttributes.replace(/\s+/g, ' ').trim();
    if (!/type\s*=\s*['"]module['"]/i.test(rawAttributes)) {
      if (/type\s*=/i.test(rawAttributes)) {
        rawAttributes = rawAttributes.replace(/type\s*=['"][^'"]*['"]/i, 'type="module"');
      } else {
        rawAttributes = rawAttributes ? `${rawAttributes} type="module"` : 'type="module"';
      }
    }

    const attributesString = rawAttributes ? ` ${rawAttributes}` : '';
    return `<script${attributesString} src="${newScriptSrc}"></script>`;
  });
}

/**
 * Process image paths in HTML content for dev mode
 * Updates relative image paths to absolute paths based on blog post location
 * @param {string} htmlContent - The HTML content to process
 * @param {string} blogPostDir - The directory containing the source files
 * @param {string} blogPostName - The name of the blog post or 'resume' for resume
 * @param {boolean} isResume - Whether this is for the resume (uses /resume/ prefix instead of /articles/)
 */
function processImagesForDev(htmlContent, blogPostDir, blogPostName, isResume = false) {
  // Find all img tags with src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [];
  let match;
  
  // Collect all unique image paths
  const processedImages = new Set();
  
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const imgSrc = match[1];
    
    // Only process relative paths (not absolute URLs or data URIs)
    if (!imgSrc.startsWith('http') && !imgSrc.startsWith('//') && !imgSrc.startsWith('data:') && !imgSrc.startsWith('/')) {
      if (!processedImages.has(imgSrc)) {
        processedImages.add(imgSrc);
        matches.push(imgSrc);
      }
    }
  }
  
  let processedHtml = htmlContent;
  
  // Process each unique image
  for (const imgSrc of matches) {
    const sourceImgPath = resolve(blogPostDir, imgSrc);
    
    // Check if image exists in source
    if (existsSync(sourceImgPath)) {
      // Update image path to be absolute from root
      // For resume: /resume/image.gif, for articles: /articles/postName/image.png
      const newImgSrc = isResume ? `/resume/${imgSrc}` : `/articles/${blogPostName}/${imgSrc}`;
      // Escape special regex characters in the source path
      const escapedSrc = imgSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace all occurrences of this image path
      processedHtml = processedHtml.replace(
        new RegExp(`src=["']${escapedSrc}["']`, 'gi'),
        `src="${newImgSrc}"`
      );
    } else {
      console.warn(`Warning: Image not found: ${sourceImgPath}`);
    }
  }
  
  return processedHtml;
}

// Store TypeScript files that need to be bundled
const typescriptFilesToBundle = new Map();

/**
 * Process and copy TypeScript files referenced in HTML content
 * Returns updated HTML and collects TypeScript files for bundling
 */
function processTypeScript(htmlContent, sourceDir, distHtmlDir, distDir) {
  // Find all script tags with src attributes pointing to .ts files
  const scriptRegex = /<script([^>]*)src=["']([^"']+\.ts)["']([^>]*)>(?:<\/script>)?/gi;
  const processedScripts = new Set();
  
  return htmlContent.replace(scriptRegex, (match, beforeSrc = '', scriptSrc = '', afterSrc = '') => {
    // Skip external URLs (http, https, //)
    if (!scriptSrc || scriptSrc.startsWith('http') || scriptSrc.startsWith('//')) {
      return match;
    }
    
    // Handle absolute paths starting with / (e.g., /articles/name/file.ts)
    let sourceTsPath;
    let tsFileName;
    if (scriptSrc.startsWith('/')) {
      // Absolute path - resolve from project root
      const projectRoot = process.cwd();
      sourceTsPath = resolve(projectRoot, scriptSrc.substring(1)); // Remove leading /
      tsFileName = basename(scriptSrc);
      
      // Check if this is an article TypeScript file
      if (!scriptSrc.includes('/articles/') && !scriptSrc.includes('/resume/')) {
        // Not an article/resume file, skip it (might be a main entry point handled by Vite)
        return match;
      }
    } else {
      // Relative path - resolve from sourceDir
      sourceTsPath = resolve(sourceDir, scriptSrc);
      tsFileName = basename(scriptSrc);
    }
    
    if (!existsSync(sourceTsPath)) {
      console.warn(`Warning: TypeScript file not found: ${sourceTsPath}`);
      return match;
    }
    
    // Ensure dist directory exists
    const distTsDir = dirname(distHtmlDir);
    if (!existsSync(distTsDir)) {
      mkdirSync(distTsDir, { recursive: true });
    }
    
    // Calculate the output path for the bundled JS file
    // For absolute paths, preserve the directory structure
    let outputJsPath;
    if (scriptSrc.startsWith('/')) {
      // For absolute paths, maintain the same structure in dist
      // e.g., /articles/name/file.ts -> dist/articles/name/file.js
      const pathWithoutLeadingSlash = scriptSrc.substring(1);
      outputJsPath = join(distDir, pathWithoutLeadingSlash.replace(/\.ts$/, '.js'));
    } else {
      // For relative paths, use the same directory as the HTML
      const distHtmlDirRelative = relative(distDir, dirname(distHtmlDir));
      if (!distHtmlDirRelative || distHtmlDirRelative === '.' || distHtmlDirRelative === './') {
        outputJsPath = join(distDir, tsFileName.replace(/\.ts$/, '.js'));
      } else {
        outputJsPath = join(distDir, distHtmlDirRelative, tsFileName.replace(/\.ts$/, '.js'));
      }
    }
    
    // Store TypeScript file for bundling
    const bundleKey = `${sourceTsPath}:${outputJsPath}`;
    if (!typescriptFilesToBundle.has(bundleKey)) {
      typescriptFilesToBundle.set(bundleKey, {
        sourcePath: sourceTsPath,
        outputPath: outputJsPath,
        outputDir: dirname(outputJsPath),
        outputFileName: basename(outputJsPath)
      });
    }
    
    // Calculate the URL path for the bundled JS file
    let jsUrlPath;
    if (scriptSrc.startsWith('/')) {
      // For absolute paths, just replace .ts with .js
      jsUrlPath = scriptSrc.replace(/\.ts$/, '.js');
    } else {
      // For relative paths, calculate from HTML location
      const distHtmlDirRelativeForUrl = relative(distDir, dirname(distHtmlDir));
      if (!distHtmlDirRelativeForUrl || distHtmlDirRelativeForUrl === '.' || distHtmlDirRelativeForUrl === './') {
        jsUrlPath = `/${tsFileName.replace(/\.ts$/, '.js')}`;
      } else {
        jsUrlPath = join('/', distHtmlDirRelativeForUrl, tsFileName.replace(/\.ts$/, '.js')).replace(/\\/g, '/');
      }
    }
    
    // Ensure script tag has type="module"
    let rawAttributes = `${beforeSrc}${afterSrc}`;
    rawAttributes = rawAttributes.replace(/\s+/g, ' ').trim();
    if (!/type\s*=\s*['"]module['"]/i.test(rawAttributes)) {
      if (/type\s*=/i.test(rawAttributes)) {
        rawAttributes = rawAttributes.replace(/type\s*=['"][^'"]*['"]/i, 'type="module"');
      } else {
        rawAttributes = rawAttributes ? `${rawAttributes} type="module"` : 'type="module"';
      }
    }

    const attributesString = rawAttributes ? ` ${rawAttributes}` : '';
    // Return script tag pointing to the bundled JS file
    return `<script${attributesString} src="${jsUrlPath}"></script>`;
  });
}

/**
 * Process and copy images referenced in HTML content
 */
function processImages(htmlContent, sourceDir, distHtmlDir, distDir) {
  // Find all img tags with src attributes
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const matches = [];
  let match;
  
  // Collect all unique image paths
  const processedImages = new Set();
  
  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const imgSrc = match[1];
    
    // Only process relative paths (not absolute URLs or data URIs)
    if (!imgSrc.startsWith('http') && !imgSrc.startsWith('//') && !imgSrc.startsWith('data:') && !imgSrc.startsWith('/')) {
      if (!processedImages.has(imgSrc)) {
        processedImages.add(imgSrc);
        matches.push(imgSrc);
      }
    }
  }
  
  let processedHtml = htmlContent;
  
  // Process each unique image
  for (const imgSrc of matches) {
    const sourceImgPath = resolve(sourceDir, imgSrc);
    const imgFileName = basename(imgSrc);
    
    // Check if image exists in source
    if (existsSync(sourceImgPath)) {
      // Ensure dist directory exists
      const distImgDir = dirname(distHtmlDir);
      if (!existsSync(distImgDir)) {
        mkdirSync(distImgDir, { recursive: true });
      }
      
      // Copy image to dist directory (same directory as HTML)
      const distImgPath = join(distImgDir, imgFileName);
      try {
        copyFileSync(sourceImgPath, distImgPath);
        console.log(`✓ Copied image: ${imgFileName}`);
        
        // Update image path in HTML to be absolute from root (for Vercel compatibility)
        // Calculate the path relative to dist directory root
        const distHtmlDirRelative = relative(distDir, dirname(distHtmlDir));
        // Convert to absolute path starting with / (e.g., /articles/first/test.png)
        // Handle case where HTML is at dist root (relative path is empty or '.')
        let absoluteImgPath;
        if (!distHtmlDirRelative || distHtmlDirRelative === '.' || distHtmlDirRelative === './') {
          absoluteImgPath = `/${imgFileName}`;
        } else {
          absoluteImgPath = join('/', distHtmlDirRelative, imgFileName).replace(/\\/g, '/');
        }
        const newImgSrc = absoluteImgPath;
        // Escape special regex characters in the source path
        const escapedSrc = imgSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace all occurrences of this image path
        processedHtml = processedHtml.replace(
          new RegExp(`src=["']${escapedSrc}["']`, 'gi'),
          `src="${newImgSrc}"`
        );
      } catch (err) {
        console.warn(`Warning: Could not copy image ${imgSrc}:`, err.message);
      }
    } else {
      console.warn(`Warning: Image not found: ${sourceImgPath}`);
    }
  }
  
  return processedHtml;
}

/**
 * Copy shared CSS to dist
 */
function copySharedCSS(distDir) {
  const blogDir = resolve(process.cwd(), 'articles');
  const templateCSSPath = join(blogDir, '_template', 'blog-styles.css');
  const darkModeCSSPath = join(blogDir, '_template', 'dark-mode.css');
  const distCSSPath = join(distDir, 'blog-styles.css');
  const distDarkModeCSSPath = join(distDir, 'dark-mode.css');
  
  if (existsSync(templateCSSPath)) {
    try {
      copyFileSync(templateCSSPath, distCSSPath);
      console.log(`✓ Copied blog-styles.css to dist`);
    } catch (err) {
      console.warn(`Warning: Could not copy blog-styles.css:`, err.message);
    }
  }
  
  if (existsSync(darkModeCSSPath)) {
    try {
      copyFileSync(darkModeCSSPath, distDarkModeCSSPath);
      console.log(`✓ Copied dark-mode.css to dist`);
    } catch (err) {
      console.warn(`Warning: Could not copy dark-mode.css:`, err.message);
    }
  }

  const templateDir = join(blogDir, '_template');
  const sharedBlogScripts = [
    'blog-dark-mode-boot.js',
    'blog-dark-mode.js',
    'blog-language-selector.js'
  ];
  for (const name of sharedBlogScripts) {
    const srcPath = join(templateDir, name);
    if (existsSync(srcPath)) {
      try {
        copyFileSync(srcPath, join(distDir, name));
        console.log(`✓ Copied ${name} to dist`);
      } catch (err) {
        console.warn(`Warning: Could not copy ${name}:`, err.message);
      }
    }
  }
  
  // Copy resume CSS
  const resumeDir = resolve(process.cwd(), 'resume');
  const resumeCSSPath = join(resumeDir, 'resume-styles.css');
  const distResumeDir = join(distDir, 'resume');
  const distResumeCSSPath = join(distResumeDir, 'resume-styles.css');
  
  if (existsSync(resumeCSSPath)) {
    try {
      if (!existsSync(distResumeDir)) {
        mkdirSync(distResumeDir, { recursive: true });
      }
      copyFileSync(resumeCSSPath, distResumeCSSPath);
      console.log(`✓ Copied resume-styles.css to dist`);
    } catch (err) {
      console.warn(`Warning: Could not copy resume-styles.css:`, err.message);
    }
  }
}

/**
 * Copy 404.html to dist
 */
function copy404Page(distDir) {
  const notFoundPath = resolve(process.cwd(), '404.html');
  const distNotFoundPath = join(distDir, '404.html');
  
  if (existsSync(notFoundPath)) {
    try {
      copyFileSync(notFoundPath, distNotFoundPath);
      console.log(`✓ Copied 404.html to dist`);
    } catch (err) {
      console.warn(`Warning: Could not copy 404.html:`, err.message);
    }
  }
}

/**
 * Inject markdown content into HTML files during build
 */
/**
 * Bundle TypeScript files using Vite's build API
 */
async function bundleTypeScriptFiles() {
  const bundlePromises = [];
  
  for (const [key, fileInfo] of typescriptFilesToBundle.entries()) {
    const { sourcePath, outputPath, outputDir, outputFileName } = fileInfo;
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      // Bundle using Vite with the TypeScript file as entry point
      const bundlePromise = build({
        configFile: false,
        root: process.cwd(),
        build: {
          outDir: outputDir,
          emptyOutDir: false,
          rollupOptions: {
            input: sourcePath,
            output: {
              entryFileNames: outputFileName,
              format: 'es',
            },
          },
          write: true,
          minify: false, // Keep readable for debugging, set to true for production
          sourcemap: false,
        },
        logLevel: 'silent', // Suppress Vite's build output
      }).then(() => {
        console.log(`✓ Bundled: ${relative(process.cwd(), sourcePath)} → ${relative(process.cwd(), outputPath)}`);
      }).catch((err) => {
        console.warn(`Warning: Failed to bundle ${sourcePath}:`, err.message);
      });
      
      bundlePromises.push(bundlePromise);
    } catch (err) {
      console.warn(`Warning: Failed to create bundle for ${sourcePath}:`, err.message);
    }
  }
  
  // Wait for all bundles to complete
  await Promise.all(bundlePromises);
}

function injectMarkdownToHtml(distDir) {
  configureMarked();
  
  // Copy shared CSS first
  copySharedCSS(distDir);
  
  // Copy 404 page
  copy404Page(distDir);
  
  // Find all blog posts (directories with content.md)
  const blogDir = resolve(process.cwd(), 'articles');
  const blogPosts = findBlogPosts(blogDir);
  const templateHTMLPath = join(blogDir, '_template', 'index.html');
  
  for (const post of blogPosts) {
    const { dir, name, seriesName, lang, htmlPath, mdPath } = post;
    const articlePathPrefix = seriesName ? join(seriesName, name) : name;

    // Determine dist HTML path based on language (and series)
    let distHtmlPath;
    if (lang) {
      const distHtmlPath1 = join(distDir, 'articles', articlePathPrefix, lang, 'index.html');
      const distHtmlPath2 = join(distDir, 'articles', `${articlePathPrefix.replace(/\//g, '-')}-${lang}.html`);
      if (existsSync(distHtmlPath1)) {
        distHtmlPath = distHtmlPath1;
      } else if (existsSync(distHtmlPath2)) {
        distHtmlPath = distHtmlPath2;
      } else {
        distHtmlPath = join(distDir, 'articles', articlePathPrefix, lang, 'index.html');
        const distHtmlDir = dirname(distHtmlPath);
        if (!existsSync(distHtmlDir)) {
          mkdirSync(distHtmlDir, { recursive: true });
        }
      }
    } else {
      distHtmlPath = join(distDir, 'articles', articlePathPrefix, 'index.html');
      const distHtmlDir = dirname(distHtmlPath);
      if (!existsSync(distHtmlDir)) {
        mkdirSync(distHtmlDir, { recursive: true });
      }
    }
    
    // Always use the template HTML for articles
    if (!existsSync(templateHTMLPath)) {
      console.warn(`Warning: No HTML template found at ${templateHTMLPath}`);
      continue;
    }
    
    // Read template and ensure dist directory exists
    let htmlContent = readFileSync(templateHTMLPath, 'utf-8');
    const distHtmlDir = dirname(distHtmlPath);
    if (!existsSync(distHtmlDir)) {
      mkdirSync(distHtmlDir, { recursive: true });
    }
    
    if (!htmlContent.includes('<div id="blog-content"></div>')) {
      continue; // Not using markdown
    }
    
    // Read and parse markdown
    const markdownContent = readFileSync(mdPath, 'utf-8');
    const content = typeof markdownContent === 'string' ? markdownContent : String(markdownContent || '');
    
    // Parse frontmatter
    const { frontmatter, content: bodyContent } = parseFrontmatter(content);
    
    // Extract title, date, and author
    let title = frontmatter?.title || extractTitle(bodyContent) || 'Blog Post';
    const date = frontmatter?.date || frontmatter?.published || null;
    const formattedDate = formatDate(date);
    const author = frontmatter?.author || null;
    
    // Update the HTML <title> tag with the article title
    if (title && title !== 'Blog Post') {
      htmlContent = htmlContent.replace(
        /<title>.*?<\/title>/,
        `<title>${escapeHtml(title)}</title>`
      );
    }
    
    // Remove first h1 if there's a title (from frontmatter or extracted)
    let markdownToRender = bodyContent;
    if (title && extractTitle(bodyContent)) {
      markdownToRender = removeFirstH1(bodyContent);
    }
    
    // Process math equations in markdown BEFORE converting to HTML
    markdownToRender = processMathInMarkdown(markdownToRender);
    
    // Convert markdown to HTML
    const htmlFromMd = marked.parse(markdownToRender);
    
    // Inject title and date into header if present
    if (htmlContent.includes('<header>')) {
      // Check if header is empty or just has whitespace
      const headerMatch = htmlContent.match(/<header>([\s\S]*?)<\/header>/);
      const headerContent = headerMatch ? headerMatch[1].trim() : '';
      
      let newHeaderContent = '';
      
      // Add title (h1)
      if (htmlContent.includes('<h1>')) {
        // Replace existing h1
        htmlContent = htmlContent.replace(
          /<h1>.*?<\/h1>/,
          `<h1>${escapeHtml(title)}</h1>`
        );
        newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
      } else {
        // Add new h1
        newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
      }
      
      // Add date/meta section
      if (formattedDate || author) {
        const dateISO = date || new Date().toISOString().split('T')[0];
        let metaContent = '';
        if (formattedDate) {
          metaContent = `<time datetime="${dateISO}">${formattedDate}</time>`;
        }
        if (author) {
          if (metaContent) {
            metaContent += ` • ${escapeHtml(author)}`;
          } else {
            metaContent = escapeHtml(author);
          }
        }
        
        if (htmlContent.includes('<time') || htmlContent.includes('<div class="meta">')) {
          // Replace existing meta content
          htmlContent = htmlContent.replace(
            /<div class="meta">.*?<\/div>/,
            `<div class="meta">${metaContent}</div>`
          );
          // Also replace standalone time tag if it exists
          if (htmlContent.includes('<time') && !htmlContent.includes('<div class="meta">')) {
            htmlContent = htmlContent.replace(
              /<time datetime="[^"]*">[^<]*<\/time>/,
              `<div class="meta">${metaContent}</div>`
            );
          }
        } else {
          // Add new meta section
          newHeaderContent += `\n        <div class="meta">${metaContent}</div>`;
        }
      }
      
      // If header was empty, replace it with the new content
      if (!headerContent && newHeaderContent) {
        htmlContent = htmlContent.replace(
          /<header>\s*<\/header>/,
          `<header>\n        ${newHeaderContent}\n      </header>`
        );
      }
    }
    
    // Inject into HTML
    htmlContent = htmlContent.replace(
      '<div id="blog-content"></div>',
      `<div id="blog-content"><article>${htmlFromMd}</article></div>`
    );

    const seriesNavHtml = seriesName ? generateSeriesNavHtml(seriesName, name, blogDir, lang) : '';
    htmlContent = htmlContent.replace('<div id="series-nav"></div>', `<div id="series-nav">${seriesNavHtml}</div>`);
    const seriesNavBottomHtml = seriesName ? generateSeriesNavBottomHtml(seriesName, name, blogDir, lang) : '';
    htmlContent = htmlContent.replace('<div id="series-nav-bottom"></div>', `<div id="series-nav-bottom">${seriesNavBottomHtml}</div>`);

    // Process and copy images
    htmlContent = processImages(htmlContent, dir, distHtmlPath, distDir);

    // Process and copy TypeScript files
    htmlContent = processTypeScript(htmlContent, dir, distHtmlPath, distDir);

    // Inject available languages data into the page
    const articleVariants = findLanguageVariants(dir);
    const availableLangs = articleVariants.map(v => v.lang);
    const availableLangsScript = `<script id="available-languages" type="application/json">${JSON.stringify(availableLangs)}</script>`;
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${availableLangsScript}\n  </head>`);
    }
    
    // Write back
    writeFileSync(distHtmlPath, htmlContent, 'utf-8');
    console.log(`✓ Injected markdown to HTML: ${name}${lang ? ` (${lang})` : ''}`);
  }
  
  // Process resume directory (including language variants)
  // Uses template from resume/_template/index.html (like articles)
  const resumeDir = resolve(process.cwd(), 'resume');
  const resumeTemplatePath = join(resumeDir, '_template', 'index.html');
  const resumeVariants = [];
  
  // Check for default content.md
  const defaultResumeMdPath = join(resumeDir, 'content.md');
  if (existsSync(defaultResumeMdPath)) {
    resumeVariants.push({ lang: null, mdPath: defaultResumeMdPath });
  }
  
  // Check for language-specific files (content.zh-tw.md, etc.)
  try {
    const resumeFiles = readdirSync(resumeDir);
    const langPattern = /^content\.([a-z]{2}(-[a-z]{2})?)\.md$/i;
    for (const file of resumeFiles) {
      const match = file.match(langPattern);
      if (match) {
        const lang = match[1].toLowerCase();
        const mdPath = join(resumeDir, file);
        resumeVariants.push({ lang, mdPath });
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  // Check if resume template exists
  if (!existsSync(resumeTemplatePath)) {
    if (resumeVariants.length > 0) {
      console.warn(`Warning: Resume template not found at ${resumeTemplatePath}`);
    }
  } else {
    // Process each resume variant using the template
    for (const variant of resumeVariants) {
      const { lang, mdPath } = variant;
      const distResumeHtmlPath = lang 
        ? join(distDir, 'resume', `${lang}`, 'index.html')
        : join(distDir, 'resume', 'index.html');
      
      if (existsSync(mdPath)) {
        // Ensure dist directory exists
        const distResumeDir = dirname(distResumeHtmlPath);
        if (!existsSync(distResumeDir)) {
          mkdirSync(distResumeDir, { recursive: true });
        }
        
        // Read the template HTML
        let htmlContent = readFileSync(resumeTemplatePath, 'utf-8');
        
        if (htmlContent.includes('<div id="blog-content"></div>')) {
          // Read and parse markdown
          const markdownContent = readFileSync(mdPath, 'utf-8');
          const content = typeof markdownContent === 'string' ? markdownContent : String(markdownContent || '');
          
          // Parse frontmatter
          const { frontmatter, content: bodyContent } = parseFrontmatter(content);
          
          // Extract title, date, and author
          let title = frontmatter?.title || extractTitle(bodyContent) || 'Résumé';
          const date = frontmatter?.date || frontmatter?.published || null;
          const formattedDate = formatDate(date);
          const author = frontmatter?.author || null;
          
          // Update the HTML <title> tag with the resume title
          if (title && title !== 'Résumé') {
            htmlContent = htmlContent.replace(
              /<title>.*?<\/title>/,
              `<title>${escapeHtml(title)}</title>`
            );
          }
          
          // Remove first h1 if there's a title (from frontmatter or extracted)
          let markdownToRender = bodyContent;
          if (title && extractTitle(bodyContent)) {
            markdownToRender = removeFirstH1(bodyContent);
          }
          
          // Process math equations in markdown BEFORE converting to HTML
          markdownToRender = processMathInMarkdown(markdownToRender);
          
          // Convert markdown to HTML
          const htmlFromMd = marked.parse(markdownToRender);
          
          // Inject title and date into header if present
          if (htmlContent.includes('<header>')) {
            const headerMatch = htmlContent.match(/<header>([\s\S]*?)<\/header>/);
            const headerContent = headerMatch ? headerMatch[1].trim() : '';
            
            let newHeaderContent = '';
            
            // Add title (h1)
            if (htmlContent.includes('<h1>')) {
              htmlContent = htmlContent.replace(
                /<h1>.*?<\/h1>/,
                `<h1>${escapeHtml(title)}</h1>`
              );
              newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
            } else {
              newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
            }
            
            // Add date/meta section
            if (formattedDate || author) {
              const dateISO = date || new Date().toISOString().split('T')[0];
              let metaContent = '';
              if (formattedDate) {
                metaContent = `<time datetime="${dateISO}">${formattedDate}</time>`;
              }
              if (author) {
                if (metaContent) {
                  metaContent += ` • ${escapeHtml(author)}`;
                } else {
                  metaContent = escapeHtml(author);
                }
              }
              
              if (htmlContent.includes('<time') || htmlContent.includes('<div class="meta">')) {
                htmlContent = htmlContent.replace(
                  /<div class="meta">.*?<\/div>/,
                  `<div class="meta">${metaContent}</div>`
                );
                if (htmlContent.includes('<time') && !htmlContent.includes('<div class="meta">')) {
                  htmlContent = htmlContent.replace(
                    /<time datetime="[^"]*">[^<]*<\/time>/,
                    `<div class="meta">${metaContent}</div>`
                  );
                }
              } else {
                newHeaderContent += `\n        <div class="meta">${metaContent}</div>`;
              }
            }
            
            // If header was empty, replace it with the new content
            if (!headerContent && newHeaderContent) {
              htmlContent = htmlContent.replace(
                /<header>\s*<\/header>/,
                `<header>\n        ${newHeaderContent}\n      </header>`
              );
            }
          }
          
          // Inject into HTML
          htmlContent = htmlContent.replace(
            '<div id="blog-content"></div>',
            `<div id="blog-content"><article>${htmlFromMd}</article></div>`
          );
          
          // Process and copy images
          htmlContent = processImages(htmlContent, resumeDir, distResumeHtmlPath, distDir);
          
          // Write the generated HTML
          writeFileSync(distResumeHtmlPath, htmlContent, 'utf-8');
          const langLabel = lang ? ` (${lang})` : '';
          console.log(`✓ Generated resume HTML: resume${langLabel}`);
        }
      }
    }
  }
  
  // Generate articles listing page (including language variants)
  const articlesIndexPath = join(blogDir, 'index.html');
  if (existsSync(articlesIndexPath)) {
    // Get available languages for articles
    const availableLangs = getAvailableArticlesLanguages(blogDir);
    
    for (const lang of availableLangs) {
      try {
        let htmlContent = readFileSync(articlesIndexPath, 'utf-8');
        
        // Get articles metadata for this language and generate list HTML
        const articles = getArticlesMetadata(blogDir, lang);
        const articlesListHtml = generateArticlesListHtml(articles);
        
        // Update HTML lang attribute if language is specified
        if (lang) {
          htmlContent = htmlContent.replace(
            /<html lang="[^"]*">/,
            `<html lang="${lang}">`
          );
        }
        
        // Inject articles list into the page
        htmlContent = htmlContent.replace(
          '<div id="articles-list">',
          `<div id="articles-list">${articlesListHtml}`
        );
        
        // Inject available languages data for the listing page
        const listingAvailableLangs = getAvailableArticlesLanguages(blogDir);
        const listingLangsScript = `<script id="available-languages" type="application/json">${JSON.stringify(listingAvailableLangs)}</script>`;
        if (htmlContent.includes('</head>')) {
          htmlContent = htmlContent.replace('</head>', `${listingLangsScript}\n  </head>`);
        }
        
        // Determine output path
        let distArticlesIndexPath;
        if (lang) {
          // Language variant: dist/articles/{lang}/index.html
          const distArticlesLangDir = join(distDir, 'articles', lang);
          if (!existsSync(distArticlesLangDir)) {
            mkdirSync(distArticlesLangDir, { recursive: true });
          }
          distArticlesIndexPath = join(distArticlesLangDir, 'index.html');
        } else {
          // Default: dist/articles/index.html
          const distArticlesDir = join(distDir, 'articles');
          if (!existsSync(distArticlesDir)) {
            mkdirSync(distArticlesDir, { recursive: true });
          }
          distArticlesIndexPath = join(distArticlesDir, 'index.html');
        }
        
        // Write the generated HTML
        writeFileSync(distArticlesIndexPath, htmlContent, 'utf-8');
        const langLabel = lang ? ` (${lang})` : '';
        console.log(`✓ Generated articles listing page${langLabel}`);
      } catch (err) {
        const langLabel = lang ? ` (${lang})` : '';
        console.warn(`Warning: Could not generate articles listing${langLabel}:`, err.message);
      }
    }
  }

  // Generate series list and series detail pages (including language variants)
  const seriesTemplatePath = resolve(process.cwd(), 'series', 'index.html');
  const seriesAvailableLangs = getAvailableArticlesLanguages(blogDir);
  if (existsSync(seriesTemplatePath)) {
    try {
      const distSeriesDir = join(distDir, 'series');
      if (!existsSync(distSeriesDir)) mkdirSync(distSeriesDir, { recursive: true });
      const listingLangsScript = `<script id="available-languages" type="application/json">${JSON.stringify(seriesAvailableLangs)}</script>`;

      for (const lang of seriesAvailableLangs) {
        const seriesList = getSeriesMetadata(blogDir, lang);
        let listContent = readFileSync(seriesTemplatePath, 'utf-8');
        const seriesListHtml = generateSeriesListHtml(seriesList, lang);
        listContent = listContent.replace(
          '<div id="series-content">',
          `<div id="series-content">${seriesListHtml}`
        );
        if (lang) {
          listContent = listContent.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);
        }
        if (listContent.includes('</head>')) {
          listContent = listContent.replace('</head>', `${listingLangsScript}\n  </head>`);
        }
        let listOutPath;
        if (lang) {
          const langDir = join(distSeriesDir, lang);
          if (!existsSync(langDir)) mkdirSync(langDir, { recursive: true });
          listOutPath = join(langDir, 'index.html');
        } else {
          listOutPath = join(distSeriesDir, 'index.html');
        }
        writeFileSync(listOutPath, listContent, 'utf-8');
        console.log(`✓ Generated series listing page${lang ? ` (${lang})` : ''}`);

        for (const series of seriesList) {
          const detailHtml = generateSeriesDetailHtml(series);
          let detailContent = readFileSync(seriesTemplatePath, 'utf-8');
          detailContent = detailContent.replace(
            '<div id="series-content">',
            `<div id="series-content">${detailHtml}`
          );
          detailContent = detailContent.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(series.title)}</title>`);
          detailContent = detailContent.replace(
            /<h1 id="series-page-title">.*?<\/h1>/,
            `<h1 id="series-page-title">${escapeHtml(series.title)}</h1>`
          );
          if (series.description) {
            detailContent = detailContent.replace(
              /<p class="subtitle" id="series-page-subtitle">.*?<\/p>/,
              `<p class="subtitle" id="series-page-subtitle">${escapeHtml(series.description)}</p>`
            );
          }
          if (lang) {
            detailContent = detailContent.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);
          }
          if (detailContent.includes('</head>')) {
            detailContent = detailContent.replace('</head>', `${listingLangsScript}\n  </head>`);
          }
          const seriesSlugDir = join(distSeriesDir, series.slug);
          if (!existsSync(seriesSlugDir)) mkdirSync(seriesSlugDir, { recursive: true });
          if (lang) {
            const langSlugDir = join(seriesSlugDir, lang);
            if (!existsSync(langSlugDir)) mkdirSync(langSlugDir, { recursive: true });
            writeFileSync(join(langSlugDir, 'index.html'), detailContent, 'utf-8');
          } else {
            writeFileSync(join(seriesSlugDir, 'index.html'), detailContent, 'utf-8');
          }
          console.log(`✓ Generated series detail: ${series.slug}${lang ? ` (${lang})` : ''}`);
        }
      }
    } catch (err) {
      console.warn('Warning: Could not generate series pages:', err.message);
    }
  }
}

/**
 * Vite plugin that converts markdown to HTML and injects it into HTML files
 */
export function markdownPlugin() {
  let distDir = 'dist';
  
  return {
    name: 'markdown-plugin',
    enforce: 'pre',
    
    handleHotUpdate(ctx) {
      // Handle markdown file changes via Vite's file watcher
      const file = ctx.file;
      
      // Handle both content.md and content.{lang}.md files
      if (file && (file.endsWith('content.md') || file.match(/content\.[a-z]{2}(-[a-z]{2})?\.md$/i))) {
        const blogDir = resolve(process.cwd(), 'articles');
        const resumeDir = resolve(process.cwd(), 'resume');
        const absoluteFile = resolve(file);
        
        // Check if it's a resume file
        if (absoluteFile.startsWith(resumeDir)) {
          // Determine which resume URL(s) to reload
          const htmlUrls = ['/resume'];
          
          // Check if it's a language-specific file
          const langMatch = file.match(/content\.([a-z]{2}(-[a-z]{2})?)\.md$/i);
          if (langMatch) {
            const lang = langMatch[1].toLowerCase();
            htmlUrls.push(`/resume/${lang}`);
          } else {
            // If default content.md changed, also reload all language variants
            try {
              const resumeFiles = readdirSync(resumeDir);
              const langPattern = /^content\.([a-z]{2}(-[a-z]{2})?)\.md$/i;
              for (const resumeFile of resumeFiles) {
                const match = resumeFile.match(langPattern);
                if (match) {
                  htmlUrls.push(`/resume/${match[1].toLowerCase()}`);
                }
              }
            } catch (err) {
              // Ignore errors
            }
          }
          
          console.log(`[HMR] Resume markdown changed: ${relative(process.cwd(), file)}`);

          // Send full-reload for each affected URL
          htmlUrls.forEach(htmlUrl => {
            ctx.server.ws.send({ type: 'full-reload', path: htmlUrl });
          });

          return [];
        }
        
        // Handle blog post files
        const relativePath = relative(blogDir, file);
        const postName = dirname(relativePath);
        
        // Extract language from filename if present
        const langMatch = file.match(/content\.([a-z]{2}(-[a-z]{2})?)\.md$/i);
        const lang = langMatch ? langMatch[1].toLowerCase() : null;
        const htmlUrl = lang ? `/articles/${postName}/${lang}` : `/articles/${postName}`;
        
        console.log(`[HMR] Markdown changed: ${relative(process.cwd(), file)} -> ${htmlUrl}`);

        // Force full-reload for the affected page
        ctx.server.ws.send({ type: 'full-reload', path: htmlUrl });

        return [];
      }
      
      // Let other files use default HMR
      return undefined;
    },
    
    configureServer(server) {
      const blogDir = resolve(process.cwd(), 'articles');
      const resumeDir = resolve(process.cwd(), 'resume');
      const templateHTMLPath = join(blogDir, '_template', 'index.html');
      const templateDir = join(blogDir, '_template');
      const templateCSSPath = join(templateDir, 'blog-styles.css');
      const darkModeCSSPath = join(templateDir, 'dark-mode.css');
      const darkModeBootJsPath = join(templateDir, 'blog-dark-mode-boot.js');
      const darkModeJsPath = join(templateDir, 'blog-dark-mode.js');
      const languageSelectorJsPath = join(templateDir, 'blog-language-selector.js');
      const publicFaviconPath = resolve(process.cwd(), 'public', 'favicon.ico');
      
      // Add markdown files to Vite's watcher so handleHotUpdate gets called
      const blogPosts = findBlogPosts(blogDir);
      for (const post of blogPosts) {
        // Ensure we use absolute path
        const absoluteMdPath = resolve(post.mdPath);
        
        try {
          server.watcher.add(absoluteMdPath);
        } catch (err) {
          console.warn(`[HMR] Failed to add ${absoluteMdPath} to watcher:`, err.message);
        }
      }
      
      // Add resume markdown files to watcher (including language variants)
      const resumeMdPath = join(resumeDir, 'content.md');
      if (existsSync(resumeMdPath)) {
        try { server.watcher.add(resolve(resumeMdPath)); } catch (err) { /* ignore */ }
      }
      try {
        const resumeFiles = readdirSync(resumeDir);
        const langPattern = /^content\.([a-z]{2}(-[a-z]{2})?)\.md$/i;
        for (const file of resumeFiles) {
          if (langPattern.test(file)) {
            try { server.watcher.add(resolve(join(resumeDir, file))); } catch (err) { /* ignore */ }
          }
        }
      } catch (err) {
        // Ignore errors
      }

      console.log(`[HMR] Watching ${blogPosts.length} markdown file(s) for changes`);
      
      // Watch for new markdown files by watching the blog directory
      try {
        watch(blogDir, { recursive: true, persistent: true }, (eventType, filename) => {
          if (filename && typeof filename === 'string' &&
              (filename.endsWith('content.md') || filename.match(/content\.[a-z]{2}(-[a-z]{2})?\.md$/i))) {
            const mdPath = join(blogDir, filename);
            if (existsSync(mdPath)) {
              server.watcher.add(mdPath);
            }
          }
        });
      } catch (err) {
        // Recursive watching not supported — Vite's watcher handles existing files
      }
      
      // Serve favicon
      server.middlewares.use((req, res, next) => {
        if (req.url === '/favicon.ico') {
          if (existsSync(publicFaviconPath)) {
            try {
              const faviconContent = readFileSync(publicFaviconPath);
              res.setHeader('Content-Type', 'image/x-icon');
              res.setHeader('Content-Length', faviconContent.length);
              res.end(faviconContent);
              return;
            } catch (err) {
              console.warn(`Warning: Could not serve favicon:`, err.message);
            }
          }
          next();
        } else {
          next();
        }
      });
      
      
      // Serve shared CSS
      const resumeCSSPath = join(resumeDir, 'resume-styles.css');
      server.middlewares.use((req, res, next) => {
        if (req.url === '/blog-styles.css') {
          if (existsSync(templateCSSPath)) {
            const cssContent = readFileSync(templateCSSPath, 'utf-8');
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.end(cssContent);
          } else {
            next();
          }
        } else if (req.url === '/dark-mode.css') {
          if (existsSync(darkModeCSSPath)) {
            const cssContent = readFileSync(darkModeCSSPath, 'utf-8');
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.end(cssContent);
          } else {
            next();
          }
        } else if (req.url === '/blog-dark-mode-boot.js' && existsSync(darkModeBootJsPath)) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(readFileSync(darkModeBootJsPath, 'utf-8'));
        } else if (req.url === '/blog-dark-mode.js' && existsSync(darkModeJsPath)) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(readFileSync(darkModeJsPath, 'utf-8'));
        } else if (req.url === '/blog-language-selector.js' && existsSync(languageSelectorJsPath)) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(readFileSync(languageSelectorJsPath, 'utf-8'));
        } else if (req.url === '/resume/resume-styles.css') {
          if (existsSync(resumeCSSPath)) {
            const cssContent = readFileSync(resumeCSSPath, 'utf-8');
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.end(cssContent);
          } else {
            next();
          }
        } else {
          next();
        }
      });
      
      // Serve images from blog post directories and resume directory
      server.middlewares.use((req, res, next) => {
        // Pattern: /articles/{series}/{article}/{imageName} or /articles/{postName}/{imageName}
        const blogImageMatch3 = req.url?.match(/^\/articles\/([^/]+)\/([^/]+)\/(.+)$/);
        const blogImageMatch2 = req.url?.match(/^\/articles\/([^/]+)\/(.+)$/);
        let imagePath = null;
        if (blogImageMatch3) {
          const [, seg1, seg2, imageName] = blogImageMatch3;
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
          if (imageExtensions.some(ext => imageName.toLowerCase().endsWith(ext))) {
            const p = join(blogDir, seg1, seg2, imageName);
            if (existsSync(p)) imagePath = p;
          }
        }
        if (!imagePath && blogImageMatch2) {
          const postName = blogImageMatch2[1];
          const imageName = blogImageMatch2[2];
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
          if (imageExtensions.some(ext => imageName.toLowerCase().endsWith(ext))) {
            const p = join(blogDir, postName, imageName);
            if (existsSync(p)) imagePath = p;
          }
        }
        if (imagePath) {
          try {
            const imageContent = readFileSync(imagePath);
            const imageName = basename(imagePath);
            const ext = imageName.toLowerCase().split('.').pop();
            const contentTypeMap = {
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'svg': 'image/svg+xml',
              'webp': 'image/webp',
              'bmp': 'image/bmp',
              'ico': 'image/x-icon'
            };
            res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
            res.setHeader('Content-Length', imageContent.length);
            res.end(imageContent);
            return;
          } catch (err) {
            console.warn(`Warning: Could not serve image ${req.url}:`, err.message);
          }
        }
        
        // Check if this is a request for an image in the resume directory
        // Pattern: /resume/{imageName}
        const resumeImageMatch = req.url?.match(/^\/resume\/(.+)$/);
        if (resumeImageMatch) {
          const imageName = resumeImageMatch[1];
          const imagePath = join(resumeDir, imageName);
          
          // Check if it's an image file (common extensions)
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'];
          const isImage = imageExtensions.some(ext => imageName.toLowerCase().endsWith(ext));
          
          if (isImage && existsSync(imagePath)) {
            try {
              const imageContent = readFileSync(imagePath);
              // Determine content type based on extension
              const ext = imageName.toLowerCase().split('.').pop();
              const contentTypeMap = {
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'gif': 'image/gif',
                'svg': 'image/svg+xml',
                'webp': 'image/webp',
                'bmp': 'image/bmp',
                'ico': 'image/x-icon'
              };
              const contentType = contentTypeMap[ext] || 'application/octet-stream';
              
              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Length', imageContent.length);
              res.end(imageContent);
              return;
            } catch (err) {
              console.warn(`Warning: Could not serve image ${req.url}:`, err.message);
            }
          }
        }
        
        next();
      });
      
      // Serve TypeScript files from blog post directories (Vite will process them)
      server.middlewares.use((req, res, next) => {
        // Pattern: /articles/{series}/{article}/{fileName}.ts or /articles/{postName}/{fileName}.ts
        const blogTsMatch3 = req.url?.match(/^\/articles\/([^/]+)\/([^/]+)\/(.+\.ts)$/);
        const blogTsMatch2 = req.url?.match(/^\/articles\/([^/]+)\/(.+\.ts)$/);
        let tsPath = null;
        if (blogTsMatch3) {
          const p = join(blogDir, blogTsMatch3[1], blogTsMatch3[2], blogTsMatch3[3]);
          if (existsSync(p)) tsPath = p;
        }
        if (!tsPath && blogTsMatch2) {
          const p = join(blogDir, blogTsMatch2[1], blogTsMatch2[2]);
          if (existsSync(p)) tsPath = p;
        }
        if (tsPath) return next();
        next();
      });
      
      // Handle markdown files in dev mode
      // This middleware must run before Vite's HTML plugin
      // We use a custom middleware that checks routes first
      const markdownMiddleware = async (req, res, next) => {
        const rawUrl = req.url || '/';
        const pathname = rawUrl.split('?')[0].split('#')[0];
        // Skip static assets so they can be served by TS middleware or Vite (e.g. /articles/board-a-user-manual/main.ts)
        const staticExt = /\.(ts|js|mjs|cjs|css|wasm)(\?|$)/i;
        if (staticExt.test(pathname)) {
          return next();
        }
        // Only handle HTML files from blog directory or article routes
        // Pattern: /articles/{name} or /articles/{name}/{lang} or /articles/{name}/{lang}.html
        // Also handle /resume route and /resume/{lang}
        const knownLangCodes = ['en', 'zh', 'zh-tw', 'zh-cn', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi'];
        // Match /articles or /articles/{lang} (but not /articles/{article-name})
        const articlesListMatch = pathname.match(/^\/articles(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/)?$/i);
        // Match /articles/{name}, /articles/{name}/{lang}, or /articles/{series}/{article}, /articles/{series}/{article}/{lang}
        const articleMatch = pathname.match(/^\/articles\/([^/]+)(?:\/([^/]+))?(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/|\.html)?$/i);
        const resumeMatch = pathname.match(/^\/resume(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/|\.html)?$/i);
        const isHtmlFile = pathname.endsWith('.html');
        
        // Handle articles listing page (/articles or /articles/{lang})
        if (articlesListMatch) {
          // Check if this is actually an article (not a language code)
          const potentialLang = articlesListMatch[1];
          
          // Known language codes - if it matches, treat as language
          const knownLangCodes = ['en', 'zh', 'zh-tw', 'zh-cn', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi'];
          const isLangCode = potentialLang ? knownLangCodes.includes(potentialLang.toLowerCase()) : true;
          
          // If it's not a known language code, it might be an article name - let articleMatch handle it
          if (potentialLang && !isLangCode) {
            // Fall through to article handling below
          } else {
            const lang = potentialLang ? potentialLang.toLowerCase() : null;
            const articlesIndexPath = join(blogDir, 'index.html');
            
            if (!existsSync(articlesIndexPath)) {
              return next();
            }
            
            // Check if the requested language variant has any articles
            if (lang) {
              const availableLangs = getAvailableArticlesLanguages(blogDir);
              if (!availableLangs.includes(lang)) {
                // Language not available - serve 404 or redirect to default
                const notFoundPath = resolve(process.cwd(), '404.html');
                if (existsSync(notFoundPath)) {
                  try {
                    const notFoundContent = readFileSync(notFoundPath, 'utf-8');
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
                    res.end(notFoundContent);
                    return;
                  } catch (err) {
                    console.warn(`Error serving 404 page:`, err.message);
                  }
                }
                return next();
              }
            }
            
            try {
              let htmlContent = readFileSync(articlesIndexPath, 'utf-8');
              
              // Get articles metadata for the requested language and generate list HTML
              const articles = getArticlesMetadata(blogDir, lang);
              const articlesListHtml = generateArticlesListHtml(articles);
              
              // Update HTML lang attribute if language is specified
              if (lang) {
                htmlContent = htmlContent.replace(
                  /<html lang="[^"]*">/,
                  `<html lang="${lang}">`
                );
              }
              
              // Inject articles list into the page
              htmlContent = htmlContent.replace(
                '<div id="articles-list">',
                `<div id="articles-list">${articlesListHtml}`
              );
              
              // Inject available languages data for the listing page
              const listingAvailableLangs = getAvailableArticlesLanguages(blogDir);
              const listingLangsScript = `<script id="available-languages" type="application/json">${JSON.stringify(listingAvailableLangs)}</script>`;
              if (htmlContent.includes('</head>')) {
                htmlContent = htmlContent.replace('</head>', `${listingLangsScript}\n  </head>`);
              }
              
              // Inject Vite HMR client script for dev mode
              if (!htmlContent.includes('@vite/client') && !htmlContent.includes('vite/client')) {
                const viteClientScript = '<script type="module" src="/@vite/client"></script>';
                
                if (htmlContent.includes('</body>')) {
                  htmlContent = htmlContent.replace('</body>', `${viteClientScript}\n  </body>`);
                } else if (htmlContent.includes('</html>')) {
                  htmlContent = htmlContent.replace('</html>', `${viteClientScript}\n</html>`);
                } else {
                  htmlContent += viteClientScript;
                }
              }
              
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('Content-Length', Buffer.byteLength(htmlContent));
              res.end(htmlContent);
              return;
            } catch (error) {
              console.warn(`Error serving articles listing:`, error.message);
              return next();
            }
          }
        }
        
        // Handle resume route (including language variants)
        // Uses template from resume/_template/index.html (like articles)
        if (resumeMatch) {
          const lang = resumeMatch[1] ? resumeMatch[1].toLowerCase() : null;
          const resumeMdPath = lang 
            ? join(resumeDir, `content.${lang}.md`)
            : join(resumeDir, 'content.md');
          const resumeTemplatePath = join(resumeDir, '_template', 'index.html');
          
          // Check if markdown file exists
          if (!existsSync(resumeMdPath)) {
            // Markdown file doesn't exist - serve 404
            const notFoundPath = resolve(process.cwd(), '404.html');
            if (existsSync(notFoundPath)) {
              try {
                const notFoundContent = readFileSync(notFoundPath, 'utf-8');
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
                res.end(notFoundContent);
                return;
              } catch (err) {
                console.warn(`Error serving 404 page:`, err.message);
              }
            }
            return next();
          }
          
          // Check if template exists
          if (!existsSync(resumeTemplatePath)) {
            console.warn(`Warning: Resume template not found at ${resumeTemplatePath}`);
            return next();
          }
          
          try {
            // Read the template HTML
            let htmlContent = readFileSync(resumeTemplatePath, 'utf-8');
            
            // Process markdown
            if (htmlContent.includes('<div id="blog-content"></div>')) {
              configureMarked();
              const markdownContent = readFileSync(resumeMdPath, 'utf-8');
              const content = typeof markdownContent === 'string' ? markdownContent : String(markdownContent || '');
              
              const { frontmatter, content: bodyContent } = parseFrontmatter(content);
              
              let title = frontmatter?.title || extractTitle(bodyContent) || 'Résumé';
              const date = frontmatter?.date || frontmatter?.published || null;
              const formattedDate = formatDate(date);
              const author = frontmatter?.author || null;
              
              // Update the HTML <title> tag with the resume title
              if (title && title !== 'Résumé') {
                htmlContent = htmlContent.replace(
                  /<title>.*?<\/title>/,
                  `<title>${escapeHtml(title)}</title>`
                );
              }
              
              let markdownToRender = bodyContent;
              if (title && extractTitle(bodyContent)) {
                markdownToRender = removeFirstH1(bodyContent);
              }
              
              markdownToRender = processMathInMarkdown(markdownToRender);
              const htmlFromMd = marked.parse(markdownToRender);
              
              if (htmlContent.includes('<header>')) {
                const headerMatch = htmlContent.match(/<header>([\s\S]*?)<\/header>/);
                const headerContent = headerMatch ? headerMatch[1].trim() : '';
                
                let newHeaderContent = '';
                
                if (htmlContent.includes('<h1>')) {
                  htmlContent = htmlContent.replace(
                    /<h1>.*?<\/h1>/,
                    `<h1>${escapeHtml(title)}</h1>`
                  );
                  newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
                } else {
                  newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
                }
                
                if (formattedDate || author) {
                  const dateISO = date || new Date().toISOString().split('T')[0];
                  let metaContent = '';
                  if (formattedDate) {
                    metaContent = `<time datetime="${dateISO}">${formattedDate}</time>`;
                  }
                  if (author) {
                    if (metaContent) {
                      metaContent += ` • ${escapeHtml(author)}`;
                    } else {
                      metaContent = escapeHtml(author);
                    }
                  }
                  
                  if (htmlContent.includes('<time') || htmlContent.includes('<div class="meta">')) {
                    htmlContent = htmlContent.replace(
                      /<div class="meta">.*?<\/div>/,
                      `<div class="meta">${metaContent}</div>`
                    );
                    if (htmlContent.includes('<time') && !htmlContent.includes('<div class="meta">')) {
                      htmlContent = htmlContent.replace(
                        /<time datetime="[^"]*">[^<]*<\/time>/,
                        `<div class="meta">${metaContent}</div>`
                      );
                    }
                  } else {
                    newHeaderContent += `\n        <div class="meta">${metaContent}</div>`;
                  }
                }
                
                if (!headerContent && newHeaderContent) {
                  htmlContent = htmlContent.replace(
                    /<header>\s*<\/header>/,
                    `<header>\n        ${newHeaderContent}\n      </header>`
                  );
                }
              }
              
              htmlContent = htmlContent.replace(
                '<div id="blog-content"></div>',
                `<div id="blog-content"><article>${htmlFromMd}</article></div>`
              );
              
              // Process images for dev mode (isResume = true)
              htmlContent = processImagesForDev(htmlContent, resumeDir, 'resume', true);
              
              // Inject Vite HMR client script for dev mode
              if (!htmlContent.includes('@vite/client') && !htmlContent.includes('vite/client')) {
                const viteClientScript = '<script type="module" src="/@vite/client"></script>';
                
                if (htmlContent.includes('</body>')) {
                  htmlContent = htmlContent.replace('</body>', `${viteClientScript}\n  </body>`);
                } else if (htmlContent.includes('</html>')) {
                  htmlContent = htmlContent.replace('</html>', `${viteClientScript}\n</html>`);
                } else {
                  htmlContent += viteClientScript;
                }
              }
              
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('Content-Length', Buffer.byteLength(htmlContent));
              res.end(htmlContent);
              return;
            }
          } catch (error) {
            console.warn(`Error in markdown plugin for ${req.url}:`, error.message);
            return next();
          }
          return next();
        }

        // Handle /series (list), /series/{lang} (list i18n), /series/{slug} (detail), /series/{slug}/{lang} (detail i18n)
        const seriesPathMatch = pathname.match(/^\/series(?:\/([^/]+))?(?:\/([^/]+))?\/?$/);
        const seriesTemplatePath = resolve(process.cwd(), 'series', 'index.html');
        const seriesAvailableLangs = getAvailableArticlesLanguages(blogDir);
        if (existsSync(seriesTemplatePath) && seriesPathMatch) {
          const seg1 = seriesPathMatch[1] ? seriesPathMatch[1].toLowerCase() : null;
          const seg2 = seriesPathMatch[2] ? seriesPathMatch[2].toLowerCase() : null;
          const isLangCode = (s) => s && knownLangCodes.includes(s);
          let seriesLang = null;
          let seriesSlug = null;
          if (!seg1) {
            seriesLang = null;
          } else if (!seg2) {
            if (isLangCode(seg1)) {
              seriesLang = seg1;
            } else {
              seriesSlug = seriesPathMatch[1];
            }
          } else {
            if (isLangCode(seg2)) {
              seriesSlug = seriesPathMatch[1];
              seriesLang = seg2;
            } else {
              seriesSlug = seriesPathMatch[1];
            }
          }

          if (seriesSlug == null) {
            // Series list (with optional lang)
            try {
              let htmlContent = readFileSync(seriesTemplatePath, 'utf-8');
              const seriesList = getSeriesMetadata(blogDir, seriesLang);
              const seriesListHtml = generateSeriesListHtml(seriesList, seriesLang);
              htmlContent = htmlContent.replace(
                '<div id="series-content">',
                `<div id="series-content">${seriesListHtml}`
              );
              if (seriesLang) {
                htmlContent = htmlContent.replace(/<html lang="[^"]*">/, `<html lang="${seriesLang}">`);
              }
              const listingLangsScript = `<script id="available-languages" type="application/json">${JSON.stringify(seriesAvailableLangs)}</script>`;
              if (htmlContent.includes('</head>')) {
                htmlContent = htmlContent.replace('</head>', `${listingLangsScript}\n  </head>`);
              }
              if (!htmlContent.includes('@vite/client') && !htmlContent.includes('vite/client')) {
                const viteClientScript = '<script type="module" src="/@vite/client"></script>';
                if (htmlContent.includes('</body>')) {
                  htmlContent = htmlContent.replace('</body>', `${viteClientScript}\n  </body>`);
                } else {
                  htmlContent += viteClientScript;
                }
              }
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('Content-Length', Buffer.byteLength(htmlContent));
              res.end(htmlContent);
              return;
            } catch (err) {
              console.warn(`Error serving series list:`, err.message);
            }
          } else {
            // Series detail (with optional lang)
            const seriesList = getSeriesMetadata(blogDir, seriesLang);
            const series = seriesList.find(s => s.slug === seriesSlug);
            if (series) {
              try {
                let htmlContent = readFileSync(seriesTemplatePath, 'utf-8');
                const detailHtml = generateSeriesDetailHtml(series);
                htmlContent = htmlContent.replace(
                  '<div id="series-content">',
                  `<div id="series-content">${detailHtml}`
                );
                htmlContent = htmlContent.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(series.title)}</title>`);
                htmlContent = htmlContent.replace(
                  /<h1 id="series-page-title">.*?<\/h1>/,
                  `<h1 id="series-page-title">${escapeHtml(series.title)}</h1>`
                );
                if (series.description) {
                  htmlContent = htmlContent.replace(
                    /<p class="subtitle" id="series-page-subtitle">.*?<\/p>/,
                    `<p class="subtitle" id="series-page-subtitle">${escapeHtml(series.description)}</p>`
                  );
                }
                if (seriesLang) {
                  htmlContent = htmlContent.replace(/<html lang="[^"]*">/, `<html lang="${seriesLang}">`);
                }
                const listingLangsScript = `<script id="available-languages" type="application/json">${JSON.stringify(seriesAvailableLangs)}</script>`;
                if (htmlContent.includes('</head>')) {
                  htmlContent = htmlContent.replace('</head>', `${listingLangsScript}\n  </head>`);
                }
                if (!htmlContent.includes('@vite/client') && !htmlContent.includes('vite/client')) {
                  const viteClientScript = '<script type="module" src="/@vite/client"></script>';
                  if (htmlContent.includes('</body>')) {
                    htmlContent = htmlContent.replace('</body>', `${viteClientScript}\n  </body>`);
                  } else {
                    htmlContent += viteClientScript;
                  }
                }
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Length', Buffer.byteLength(htmlContent));
                res.end(htmlContent);
                return;
              } catch (err) {
                console.warn(`Error serving series detail:`, err.message);
              }
            }
          }
        }
        
        // Continue with article handling...
        if (!pathname || (!isHtmlFile && !articleMatch)) {
          return next();
        }

        try {
          let postName = null;
          let seriesName = null;
          let lang = null;

          if (articleMatch) {
            const seg1 = articleMatch[1];
            const seg2 = articleMatch[2] ? articleMatch[2].toLowerCase() : null;
            const seg3 = articleMatch[3] ? articleMatch[3].toLowerCase() : null;
            const isLangCode = (s) => s && knownLangCodes.includes(s);
            if (!seg2) {
              postName = seg1;
            } else if (seg3) {
              seriesName = seg1;
              postName = seg2;
              lang = seg3;
            } else {
              const standalonePath = join(blogDir, seg1, 'content.md');
              const seriesArticlePath = join(blogDir, seg1, seg2, 'content.md');
              if (isLangCode(seg2) && existsSync(standalonePath)) {
                postName = seg1;
                lang = seg2;
              } else if (existsSync(seriesArticlePath)) {
                seriesName = seg1;
                postName = seg2;
              } else {
                postName = seg1;
                lang = isLangCode(seg2) ? seg2 : null;
              }
            }
          } else if (isHtmlFile) {
            const htmlPath = pathname.replace(/^\//, '');
            const resolvedPath = resolve(process.cwd(), htmlPath);
            const htmlDir = dirname(resolvedPath);
            const blogMatch = htmlDir.match(/articles[\/\\]([^\/\\]+)(?:\/([^\/\\]+))?$/);
            if (blogMatch) {
              if (blogMatch[2] && knownLangCodes.includes(blogMatch[2].toLowerCase())) {
                postName = blogMatch[1];
                lang = blogMatch[2].toLowerCase();
              } else if (blogMatch[2]) {
                seriesName = blogMatch[1];
                postName = blogMatch[2];
              } else {
                postName = blogMatch[1];
              }
            }
          }

          if (!postName) {
            return next();
          }

          const postDir = seriesName ? join(blogDir, seriesName, postName) : join(blogDir, postName);
          const blogPostName = seriesName ? `${seriesName}/${postName}` : postName;
          if (!existsSync(postDir)) {
            // Article doesn't exist - serve 404 page
            const notFoundPath = resolve(process.cwd(), '404.html');
            if (existsSync(notFoundPath)) {
              try {
                const notFoundContent = readFileSync(notFoundPath, 'utf-8');
                res.statusCode = 404;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
                res.end(notFoundContent);
                return;
              } catch (err) {
                console.warn(`Error serving 404 page:`, err.message);
              }
            }
            return next();
          }
          
          // Determine which markdown file to use
          let mdPath;
          if (lang) {
            mdPath = join(postDir, `content.${lang}.md`);
            if (!existsSync(mdPath)) {
              // If language-specific file doesn't exist, try default
              mdPath = join(postDir, 'content.md');
              if (!existsSync(mdPath)) {
                // Language variant doesn't exist - serve 404 page
                const notFoundPath = resolve(process.cwd(), '404.html');
                if (existsSync(notFoundPath)) {
                  try {
                    const notFoundContent = readFileSync(notFoundPath, 'utf-8');
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
                    res.end(notFoundContent);
                    return;
                  } catch (err) {
                    console.warn(`Error serving 404 page:`, err.message);
                  }
                }
                return next();
              }
              lang = null; // Use default
            }
          } else {
            // Check if language variants exist
            const variants = findLanguageVariants(postDir);
            if (variants.length > 0) {
              // Use default content.md if it exists, otherwise use first variant
              const defaultVariant = variants.find(v => v.lang === null);
              mdPath = defaultVariant ? defaultVariant.mdPath : variants[0].mdPath;
            } else {
              mdPath = join(postDir, 'content.md');
            }
            
            if (!existsSync(mdPath)) {
              // Content file doesn't exist - serve 404 page
              const notFoundPath = resolve(process.cwd(), '404.html');
              if (existsSync(notFoundPath)) {
                try {
                  const notFoundContent = readFileSync(notFoundPath, 'utf-8');
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'text/html; charset=utf-8');
                  res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
                  res.end(notFoundContent);
                  return;
                } catch (err) {
                  console.warn(`Error serving 404 page:`, err.message);
                }
              }
              return next();
            }
          }
          
          // Always use the template for articles
          if (!existsSync(templateHTMLPath)) {
            console.warn(`Warning: Template not found at ${templateHTMLPath}`);
            return next();
          }
          
          // Read the template HTML file
          let htmlContent = readFileSync(templateHTMLPath, 'utf-8');
          
          // Check if this HTML needs markdown rendering
          if (!htmlContent.includes('<div id="blog-content"></div>')) {
            return next();
          }
          
          // Find the markdown file - we already determined it above
          const htmlDir = postDir;

          // Read and parse markdown
          configureMarked();
          const markdownContent = readFileSync(mdPath, 'utf-8');
          const content = typeof markdownContent === 'string' ? markdownContent : String(markdownContent || '');
          
          // Parse frontmatter
          const { frontmatter, content: bodyContent } = parseFrontmatter(content);
          
          // Extract title, date, and author
          let title = frontmatter?.title || extractTitle(bodyContent) || 'Blog Post';
          const date = frontmatter?.date || frontmatter?.published || null;
          const formattedDate = formatDate(date);
          const author = frontmatter?.author || null;
          
          // Update the HTML <title> tag with the article title
          if (title && title !== 'Blog Post') {
            htmlContent = htmlContent.replace(
              /<title>.*?<\/title>/,
              `<title>${escapeHtml(title)}</title>`
            );
          }
          
          // Remove first h1 if there's a title (from frontmatter or extracted)
          let markdownToRender = bodyContent;
          if (title && extractTitle(bodyContent)) {
            markdownToRender = removeFirstH1(bodyContent);
          }
          
          // Process math equations in markdown BEFORE converting to HTML
          markdownToRender = processMathInMarkdown(markdownToRender);
          
          // Convert markdown to HTML
          const htmlFromMd = marked.parse(markdownToRender);
          
          // Inject title and date into header if present
          if (htmlContent.includes('<header>')) {
            // Check if header is empty or just has whitespace
            const headerMatch = htmlContent.match(/<header>([\s\S]*?)<\/header>/);
            const headerContent = headerMatch ? headerMatch[1].trim() : '';
            
            let newHeaderContent = '';
            
            // Add title (h1)
            if (htmlContent.includes('<h1>')) {
              // Replace existing h1
              htmlContent = htmlContent.replace(
                /<h1>.*?<\/h1>/,
                `<h1>${escapeHtml(title)}</h1>`
              );
              newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
            } else {
              // Add new h1
              newHeaderContent = `<h1>${escapeHtml(title)}</h1>`;
            }
            
            // Add date/meta section
            if (formattedDate || author) {
              const dateISO = date || new Date().toISOString().split('T')[0];
              let metaContent = '';
              if (formattedDate) {
                metaContent = `<time datetime="${dateISO}">${formattedDate}</time>`;
              }
              if (author) {
                if (metaContent) {
                  metaContent += ` • ${escapeHtml(author)}`;
                } else {
                  metaContent = escapeHtml(author);
                }
              }
              
              if (htmlContent.includes('<time') || htmlContent.includes('<div class="meta">')) {
                // Replace existing meta content
                htmlContent = htmlContent.replace(
                  /<div class="meta">.*?<\/div>/,
                  `<div class="meta">${metaContent}</div>`
                );
                // Also replace standalone time tag if it exists
                if (htmlContent.includes('<time') && !htmlContent.includes('<div class="meta">')) {
                  htmlContent = htmlContent.replace(
                    /<time datetime="[^"]*">[^<]*<\/time>/,
                    `<div class="meta">${metaContent}</div>`
                  );
                }
              } else {
                // Add new meta section
                newHeaderContent += `\n        <div class="meta">${metaContent}</div>`;
              }
            }
            
            // If header was empty, replace it with the new content
            if (!headerContent && newHeaderContent) {
              htmlContent = htmlContent.replace(
                /<header>\s*<\/header>/,
                `<header>\n        ${newHeaderContent}\n      </header>`
              );
            }
          }
          
          // Inject into HTML
          htmlContent = htmlContent.replace(
            '<div id="blog-content"></div>',
            `<div id="blog-content"><article>${htmlFromMd}</article></div>`
          );

          const seriesNavHtml = seriesName ? generateSeriesNavHtml(seriesName, postName, blogDir, lang) : '';
          htmlContent = htmlContent.replace('<div id="series-nav"></div>', `<div id="series-nav">${seriesNavHtml}</div>`);
          const seriesNavBottomHtml = seriesName ? generateSeriesNavBottomHtml(seriesName, postName, blogDir, lang) : '';
          htmlContent = htmlContent.replace('<div id="series-nav-bottom"></div>', `<div id="series-nav-bottom">${seriesNavBottomHtml}</div>`);

          // Process images for dev mode (update paths to absolute)
          if (blogPostName) {
            htmlContent = processImagesForDev(htmlContent, htmlDir, blogPostName);
            // Process TypeScript files for dev mode (update paths to absolute and add type="module")
            htmlContent = processTypeScriptForDev(htmlContent, htmlDir, blogPostName);
          }

          // Inject available languages data into the page
          const variants = findLanguageVariants(postDir);
          const availableLangs = variants.map(v => v.lang);
          const availableLangsScript = `<script id="available-languages" type="application/json">${JSON.stringify(availableLangs)}</script>`;
          if (htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', `${availableLangsScript}\n  </head>`);
          }
          
          // Inject Vite HMR client script for dev mode (only if not already present)
          if (!htmlContent.includes('@vite/client') && !htmlContent.includes('vite/client')) {
            // Inject before the closing </body> tag or before existing scripts
            const viteClientScript = '<script type="module" src="/@vite/client"></script>';
            
            if (htmlContent.includes('</body>')) {
              htmlContent = htmlContent.replace('</body>', `${viteClientScript}\n  </body>`);
            } else if (htmlContent.includes('</html>')) {
              htmlContent = htmlContent.replace('</html>', `${viteClientScript}\n</html>`);
            } else {
              // Append at the end if no closing tags found
              htmlContent += viteClientScript;
            }
          }
          
          // Send the modified HTML
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Length', Buffer.byteLength(htmlContent));
          res.end(htmlContent);
        } catch (error) {
          // If anything fails, just pass through
          console.warn(`Error in markdown plugin for ${req.url}:`, error.message);
          return next();
        }
      };
      
      // Register the markdown middleware - use it early to handle resume routes
      server.middlewares.use(markdownMiddleware);
      
      // Directly serve 404 page for non-article routes that don't map to on-disk files
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.method !== 'GET') {
          return next();
        }

        const pathname = req.url.split('?')[0].split('#')[0];

        // Skip Vite internal modules, assets, and known valid paths
        if (
          pathname === '/' ||
          pathname === '/index.html' ||
          pathname === '/404.html' ||
          pathname === '/favicon.ico' ||
          pathname === '/blog-styles.css' ||
          pathname === '/dark-mode.css' ||
          pathname.startsWith('/@') ||
          pathname.startsWith('/node_modules') ||
          pathname.startsWith('/src') ||
          pathname.match(/\.(js|mjs|css|png|jpg|jpeg|gif|svg|ico|webp|bmp|woff|woff2|ttf|eot|map|json)$/)
        ) {
          return next();
        }

        // Allow article and series routes to fall through to markdown handler logic
        if (pathname.startsWith('/articles') || pathname.startsWith('/series')) {
          return next();
        }

        const relativePath = pathname.replace(/^\//, '');
        const diskPath = resolve(process.cwd(), relativePath);

        let pathExists = false;
        if (existsSync(diskPath)) {
          const pathStat = statSync(diskPath);
          if (pathStat.isDirectory()) {
            const indexHtmlPath = join(diskPath, 'index.html');
            pathExists = existsSync(indexHtmlPath);
          } else {
            pathExists = true;
          }
        }

        if (!pathExists) {
          const notFoundPath = resolve(process.cwd(), '404.html');
          if (existsSync(notFoundPath)) {
            try {
              const notFoundContent = readFileSync(notFoundPath, 'utf-8');
              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
              res.end(notFoundContent);
              return;
            } catch (err) {
              console.warn(`Error serving 404 page:`, err.message);
            }
          }
        }

        next();
      });

      // Universal 404 handler - catch all unmatched routes
      // Wrap response methods early to intercept all 404 responses
      server.middlewares.use((req, res, next) => {
        // Skip if it's a static asset request (let Vite handle these)
        if (req.url?.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|ts|json)$/)) {
          return next();
        }
        
        // Skip Vite internal routes
        if (req.url?.startsWith('/@') || req.url?.startsWith('/node_modules') || req.url?.startsWith('/src')) {
          return next();
        }
        
        // Skip root and known valid routes
        if (req.url === '/' || req.url === '/index.html' || req.url === '/404.html') {
          return next();
        }
        
        // Only handle GET requests for HTML pages
        if (req.method !== 'GET') {
          return next();
        }
        
        // Store original methods
        const originalWriteHead = res.writeHead;
        const originalEnd = res.end;
        let statusCode = 200;
        let headersSent = false;
        
        // Wrap writeHead to capture status code
        res.writeHead = function(code, headers) {
          statusCode = code;
          headersSent = true;
          return originalWriteHead.apply(this, arguments);
        };
        
        // Wrap end to intercept 404 responses
        res.end = function(chunk, encoding) {
          // Check if this is a 404 response
          if (statusCode === 404 || res.statusCode === 404) {
            const notFoundPath = resolve(process.cwd(), '404.html');
            if (existsSync(notFoundPath)) {
              try {
                const notFoundContent = readFileSync(notFoundPath, 'utf-8');
                if (!headersSent) {
                  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'text/html; charset=utf-8');
                }
                res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
                return originalEnd.call(this, notFoundContent, encoding);
              } catch (err) {
                console.warn(`Error serving 404 page:`, err.message);
              }
            }
          }
          
          // Check for Vite's "Cannot GET" error message
          if (chunk && typeof chunk === 'string' && chunk.includes('Cannot GET')) {
            const notFoundPath = resolve(process.cwd(), '404.html');
            if (existsSync(notFoundPath)) {
              try {
                const notFoundContent = readFileSync(notFoundPath, 'utf-8');
                if (!headersSent) {
                  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'text/html; charset=utf-8');
                }
                res.setHeader('Content-Length', Buffer.byteLength(notFoundContent));
                return originalEnd.call(this, notFoundContent, encoding);
              } catch (err) {
                console.warn(`Error serving 404 page:`, err.message);
              }
            }
          }
          
          return originalEnd.call(this, chunk, encoding);
        };
        
        next();
      });
    },
    
    generateBundle(options) {
      // Store the output directory for build
      distDir = options.dir || 'dist';
    },
    
    async writeBundle() {
      // Clear the TypeScript files map for this build
      typescriptFilesToBundle.clear();
      
      // This runs after all files are written to disk
      // Convert markdown to HTML for all blog entries
      injectMarkdownToHtml(distDir);
      
      // Bundle all collected TypeScript files
      if (typescriptFilesToBundle.size > 0) {
        console.log(`\n📦 Bundling ${typescriptFilesToBundle.size} TypeScript file(s)...`);
        await bundleTypeScriptFiles();
      }
    }
  };
}


