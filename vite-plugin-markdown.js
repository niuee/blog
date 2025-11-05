import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync, mkdirSync, watch } from 'fs';
import { join, dirname, resolve, extname, basename, relative } from 'path';
import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';

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
  
  // Override only the code method
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
 * Find all blog post directories that contain content.md or language variants
 */
function findBlogPosts(blogDir) {
  const posts = [];
  
  try {
    const entries = readdirSync(blogDir);
    
    for (const entry of entries) {
      const fullPath = join(blogDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && entry !== '_template') {
        const variants = findLanguageVariants(fullPath);
        
        if (variants.length > 0) {
          // For backward compatibility, if only default content.md exists, treat it as a single post
          // Otherwise, create entries for each language variant
          if (variants.length === 1 && variants[0].lang === null) {
            // Single default content.md
            posts.push({
              dir: fullPath,
              name: entry,
              lang: null,
              htmlPath: join(fullPath, 'index.html'),
              mdPath: variants[0].mdPath
            });
          } else {
            // Multiple language variants
            for (const variant of variants) {
              const langSuffix = variant.lang ? `.${variant.lang}` : '';
              posts.push({
                dir: fullPath,
                name: entry,
                lang: variant.lang,
                htmlPath: join(fullPath, `index${langSuffix}.html`),
                mdPath: variant.mdPath
              });
            }
          }
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
 * Process TypeScript script tags in HTML content for dev mode
 * Updates relative script paths to absolute paths based on blog post location
 */
function processTypeScriptForDev(htmlContent, blogPostDir, blogPostName) {
  // Find all script tags with src attributes pointing to .ts files
  const scriptRegex = /<script([^>]*)src=["']([^"']+\.ts)["']([^>]*)>/gi;
  let processedHtml = htmlContent;
  let match;
  
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const fullMatch = match[0];
    const beforeSrc = match[1];
    const scriptSrc = match[2];
    const afterSrc = match[3];
    
    // Only process relative paths (not absolute URLs or absolute paths)
    if (!scriptSrc.startsWith('http') && !scriptSrc.startsWith('//') && !scriptSrc.startsWith('/')) {
      const sourceTsPath = resolve(blogPostDir, scriptSrc);
      
      // Check if TypeScript file exists
      if (existsSync(sourceTsPath)) {
        // Update script path to be absolute from root (e.g., /articles/first/test.ts)
        const newScriptSrc = `/articles/${blogPostName}/${scriptSrc}`;
        
        // Ensure script tag has type="module"
        let newAttributes = beforeSrc + afterSrc;
        if (!newAttributes.includes('type=')) {
          newAttributes = ` type="module"${newAttributes}`;
        } else if (!newAttributes.includes('type="module"') && !newAttributes.includes("type='module'")) {
          // Replace existing type attribute with module
          newAttributes = newAttributes.replace(/type=["'][^"']*["']/i, 'type="module"');
        }
        
        // Escape special regex characters in the source path
        const escapedSrc = scriptSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace the script tag
        processedHtml = processedHtml.replace(
          new RegExp(`<script([^>]*)src=["']${escapedSrc}["']([^>]*)>`, 'gi'),
          `<script${newAttributes}src="${newScriptSrc}">`
        );
      } else {
        console.warn(`Warning: TypeScript file not found: ${sourceTsPath}`);
      }
    }
  }
  
  return processedHtml;
}

/**
 * Process image paths in HTML content for dev mode
 * Updates relative image paths to absolute paths based on blog post location
 */
function processImagesForDev(htmlContent, blogPostDir, blogPostName) {
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
      // Update image path to be absolute from root (e.g., /articles/first/test.png)
      const newImgSrc = `/articles/${blogPostName}/${imgSrc}`;
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

/**
 * Process and copy TypeScript files referenced in HTML content
 */
function processTypeScript(htmlContent, sourceDir, distHtmlDir, distDir) {
  // Find all script tags with src attributes pointing to .ts files
  const scriptRegex = /<script([^>]*)src=["']([^"']+\.ts)["']([^>]*)>/gi;
  let processedHtml = htmlContent;
  let match;
  const processedScripts = new Set();
  
  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const beforeSrc = match[1];
    const scriptSrc = match[2];
    const afterSrc = match[3];
    
    // Only process relative paths (not absolute URLs or absolute paths)
    if (!scriptSrc.startsWith('http') && !scriptSrc.startsWith('//') && !scriptSrc.startsWith('/')) {
      if (!processedScripts.has(scriptSrc)) {
        processedScripts.add(scriptSrc);
        
        const sourceTsPath = resolve(sourceDir, scriptSrc);
        const tsFileName = basename(scriptSrc);
        
        // Check if TypeScript file exists
        if (existsSync(sourceTsPath)) {
          // Ensure dist directory exists
          const distTsDir = dirname(distHtmlDir);
          if (!existsSync(distTsDir)) {
            mkdirSync(distTsDir, { recursive: true });
          }
          
          // Copy TypeScript file to dist directory (same directory as HTML)
          // Note: Vite will process this during build, but we copy it for reference
          const distTsPath = join(distTsDir, tsFileName);
          try {
            copyFileSync(sourceTsPath, distTsPath);
            console.log(`✓ Copied TypeScript file: ${tsFileName}`);
            
            // Update script path in HTML to be absolute from root
            const distHtmlDirRelative = relative(distDir, dirname(distHtmlDir));
            let absoluteTsPath;
            if (!distHtmlDirRelative || distHtmlDirRelative === '.' || distHtmlDirRelative === './') {
              absoluteTsPath = `/${tsFileName}`;
            } else {
              absoluteTsPath = join('/', distHtmlDirRelative, tsFileName).replace(/\\/g, '/');
            }
            const newScriptSrc = absoluteTsPath;
            
            // Ensure script tag has type="module"
            let newAttributes = beforeSrc + afterSrc;
            if (!newAttributes.includes('type=')) {
              newAttributes = ` type="module"${newAttributes}`;
            } else if (!newAttributes.includes('type="module"') && !newAttributes.includes("type='module'")) {
              // Replace existing type attribute with module
              newAttributes = newAttributes.replace(/type=["'][^"']*["']/i, 'type="module"');
            }
            
            // Escape special regex characters in the source path
            const escapedSrc = scriptSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Replace all occurrences of this script path
            processedHtml = processedHtml.replace(
              new RegExp(`<script([^>]*)src=["']${escapedSrc}["']([^>]*)>`, 'gi'),
              `<script${newAttributes}src="${newScriptSrc}">`
            );
          } catch (err) {
            console.warn(`Warning: Could not copy TypeScript file ${scriptSrc}:`, err.message);
          }
        } else {
          console.warn(`Warning: TypeScript file not found: ${sourceTsPath}`);
        }
      }
    }
  }
  
  return processedHtml;
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
    const { dir, name, lang, htmlPath, mdPath } = post;
    
    // Determine dist HTML path based on language
    let distHtmlPath;
    if (lang) {
      // Language-specific: dist/articles/{name}/{lang}/index.html or dist/articles/{name}/{lang}.html
      const distHtmlPath1 = join(distDir, 'articles', name, lang, 'index.html');
      const distHtmlPath2 = join(distDir, 'articles', `${name}-${lang}.html`);
      
      if (existsSync(distHtmlPath1)) {
        distHtmlPath = distHtmlPath1;
      } else if (existsSync(distHtmlPath2)) {
        distHtmlPath = distHtmlPath2;
      } else {
        // Create language-specific path
        distHtmlPath = join(distDir, 'articles', name, lang, 'index.html');
        const distHtmlDir = dirname(distHtmlPath);
        if (!existsSync(distHtmlDir)) {
          mkdirSync(distHtmlDir, { recursive: true });
        }
      }
    } else {
      // Default: dist/articles/{name}/index.html or dist/articles/{name}.html
      const distHtmlPath1 = join(distDir, 'articles', name, 'index.html');
      const distHtmlPath2 = join(distDir, 'articles', `${name}.html`);
      
      if (existsSync(distHtmlPath1)) {
        distHtmlPath = distHtmlPath1;
      } else if (existsSync(distHtmlPath2)) {
        distHtmlPath = distHtmlPath2;
      } else {
        distHtmlPath = join(distDir, 'articles', `${name}.html`);
        const distHtmlDir = dirname(distHtmlPath);
        if (!existsSync(distHtmlDir)) {
          mkdirSync(distHtmlDir, { recursive: true });
        }
      }
    }
    
    // Check if HTML exists, if not use template
    let htmlContent;
    let sourceHtmlPath;
    
    if (existsSync(htmlPath)) {
      // Use existing HTML file
      sourceHtmlPath = htmlPath;
      
      if (!existsSync(distHtmlPath)) {
        // If dist HTML doesn't exist, copy source HTML
        const distHtmlDir = dirname(distHtmlPath);
        if (!existsSync(distHtmlDir)) {
          mkdirSync(distHtmlDir, { recursive: true });
        }
        copyFileSync(htmlPath, distHtmlPath);
      }
      htmlContent = readFileSync(distHtmlPath, 'utf-8');
    } else if (existsSync(templateHTMLPath)) {
      // Use template HTML
      sourceHtmlPath = templateHTMLPath;
      htmlContent = readFileSync(templateHTMLPath, 'utf-8');
      
      // Ensure dist file exists
      if (!existsSync(distHtmlPath)) {
        const distHtmlDir = dirname(distHtmlPath);
        if (!existsSync(distHtmlDir)) {
          mkdirSync(distHtmlDir, { recursive: true });
        }
        writeFileSync(distHtmlPath, htmlContent, 'utf-8');
      } else {
        htmlContent = readFileSync(distHtmlPath, 'utf-8');
      }
    } else {
      console.warn(`Warning: No HTML template found for blog post: ${name}${lang ? ` (${lang})` : ''}`);
      continue;
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
    
    // Process and copy images
    htmlContent = processImages(htmlContent, dir, distHtmlPath, distDir);
    
    // Process and copy TypeScript files
    htmlContent = processTypeScript(htmlContent, dir, distHtmlPath, distDir);
    
    // Write back
    writeFileSync(distHtmlPath, htmlContent, 'utf-8');
    console.log(`✓ Injected markdown to HTML: ${name}${lang ? ` (${lang})` : ''}`);
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
      
      // Debug: log all file changes
      if (file && file.includes('content.md')) {
        console.log(`[HMR DEBUG] handleHotUpdate called for: ${file}`);
      }
      
      // Handle both content.md and content.{lang}.md files
      if (file && (file.endsWith('content.md') || file.match(/content\.[a-z]{2}(-[a-z]{2})?\.md$/i))) {
        const blogDir = resolve(process.cwd(), 'articles');
        const relativePath = relative(blogDir, file);
        const postName = dirname(relativePath);
        
        // Extract language from filename if present
        const langMatch = file.match(/content\.([a-z]{2}(-[a-z]{2})?)\.md$/i);
        const lang = langMatch ? langMatch[1].toLowerCase() : null;
        const htmlUrl = lang ? `/articles/${postName}/${lang}` : `/articles/${postName}`;
        
        console.log(`[HMR] Markdown file changed: ${relative(process.cwd(), file)}`);
        console.log(`[HMR] Attempting to reload: ${htmlUrl}`);
        
        // Since HTML is dynamically generated via middleware, we need to force a full reload
        // Try multiple approaches to ensure it works
        
        // Approach 1: Try to find and invalidate the HTML module
        const postDir = dirname(file);
        const htmlFilePath = join(postDir, 'index.html');
        const templateHTMLPath = join(blogDir, '_template', 'index.html');
        
        const fileToReload = existsSync(htmlFilePath) ? htmlFilePath : templateHTMLPath;
        let htmlModule = null;
        
        if (existsSync(fileToReload)) {
          // Try to get module by file path
          htmlModule = ctx.server.moduleGraph.getModuleById(fileToReload);
          
          // If not found, try to get by URL
          if (!htmlModule) {
            const allModules = ctx.server.moduleGraph.idToModuleMap;
            for (const [id, module] of allModules) {
              if (id.includes(htmlUrl) || id.includes(postName)) {
                htmlModule = module;
                break;
              }
            }
          }
          
          if (htmlModule) {
            console.log(`[HMR] Found HTML module, invalidating...`);
            ctx.server.moduleGraph.invalidateModule(htmlModule);
            return [htmlModule];
          }
        }
        
        // Approach 2: Force full reload using WebSocket
        console.log(`[HMR] Triggering full page reload...`);
        
        // Invalidate all modules and force reload
        const modulesToInvalidate = [];
        ctx.server.moduleGraph.idToModuleMap.forEach((module) => {
          if (module.url && (module.url.includes(htmlUrl) || module.url.includes(postName))) {
            modulesToInvalidate.push(module);
          }
        });
        
        modulesToInvalidate.forEach((module) => {
          ctx.server.moduleGraph.invalidateModule(module);
        });
        
        // Send reload message via WebSocket
        try {
          // Check if WebSocket server exists and has clients
          const wsClients = ctx.server.ws?.clients;
          const clientCount = wsClients?.size || 0;
          
          console.log(`[HMR] WebSocket clients connected: ${clientCount}`);
          
          if (clientCount === 0) {
            console.warn(`[HMR] No WebSocket clients connected. Make sure the page is open in the browser.`);
            // Still try to send - clients might connect
          }
          
          // Use Vite's WebSocket send method
          if (ctx.server.ws) {
            // Try to send directly to each client if send() doesn't broadcast
            const wsClients = ctx.server.ws.clients;
            
            if (wsClients && wsClients.size > 0) {
              // Send to each client individually
              const message = JSON.stringify({
                type: 'full-reload',
                path: htmlUrl
              });
              
              wsClients.forEach((client) => {
                if (client.readyState === 1) { // WebSocket.OPEN
                  try {
                    client.send(message);
                    console.log(`[HMR] Sent reload message to client`);
                  } catch (err) {
                    console.error(`[HMR] Error sending to client:`, err);
                  }
                }
              });
            } else {
              // Try using the send method (might work even with 0 clients)
              try {
                const message = {
                  type: 'full-reload',
                  path: htmlUrl
                };
                
                ctx.server.ws.send(message);
                console.log(`[HMR] Sent reload message via send():`, message);
                
                // Also try without path
                setTimeout(() => {
                  ctx.server.ws.send({
                    type: 'full-reload'
                  });
                }, 100);
              } catch (err) {
                console.error(`[HMR] Error using send():`, err);
              }
            }
          } else {
            console.error(`[HMR] WebSocket server not available`);
          }
        } catch (err) {
          console.error(`[HMR] Error sending reload message:`, err);
          console.error(`[HMR] Error details:`, err.stack);
        }
        
        // Return empty array to prevent default handling
        return [];
      }
      
      // Let other files use default HMR
      return undefined;
    },
    
    configureServer(server) {
      const blogDir = resolve(process.cwd(), 'articles');
      const templateHTMLPath = join(blogDir, '_template', 'index.html');
      const templateCSSPath = join(blogDir, '_template', 'blog-styles.css');
      const darkModeCSSPath = join(blogDir, '_template', 'dark-mode.css');
      const publicFaviconPath = resolve(process.cwd(), 'public', 'favicon.ico');
      
      // Set up HMR for markdown files
      const markdownWatchers = new Map();
      
      // Function to get the HTML URL for a markdown file
      function getHtmlUrlForMarkdown(mdPath) {
        const relativePath = relative(blogDir, mdPath);
        const postName = dirname(relativePath);
        const fileName = basename(mdPath);
        
        // Extract language from filename if present
        const langMatch = fileName.match(/content\.([a-z]{2}(-[a-z]{2})?)\.md$/i);
        const lang = langMatch ? langMatch[1].toLowerCase() : null;
        
        // Return the URL that would be used to access this blog post
        return lang ? `/articles/${postName}/${lang}` : `/articles/${postName}`;
      }
      
      // Function to set up watcher for a markdown file
      function setupMarkdownWatcher(mdPath) {
        if (markdownWatchers.has(mdPath)) {
          return; // Already watching
        }
        
        const watcher = watch(mdPath, { persistent: true }, (eventType, filename) => {
          // Handle both 'change' and 'rename' events (some editors trigger rename)
          if (eventType === 'change' || eventType === 'rename') {
            // Small delay to ensure file write is complete
            setTimeout(() => {
              if (!existsSync(mdPath)) {
                return; // File was deleted, skip
              }
              
              const htmlUrl = getHtmlUrlForMarkdown(mdPath);
              const relativeMdPath = relative(process.cwd(), mdPath);
              
              console.log(`[HMR] Markdown changed: ${relativeMdPath} -> reloading ${htmlUrl}`);
              
              // Invalidate any modules that might be cached
              const postDir = dirname(mdPath);
              const htmlFilePath = join(postDir, 'index.html');
              
              // Try to invalidate the HTML module in Vite's module graph
              if (server.moduleGraph) {
                // Try both the actual HTML file and the template
                const htmlModule = server.moduleGraph.getModuleById(htmlFilePath);
                if (htmlModule) {
                  server.moduleGraph.invalidateModule(htmlModule);
                }
                
                // Also try the template if HTML doesn't exist
                if (!existsSync(htmlFilePath) && existsSync(templateHTMLPath)) {
                  const templateModule = server.moduleGraph.getModuleById(templateHTMLPath);
                  if (templateModule) {
                    server.moduleGraph.invalidateModule(templateModule);
                  }
                }
              }
              
              // Send full-reload using WebSocket
              try {
                const wsClients = server.ws?.clients;
                const clientCount = wsClients?.size || 0;
                
                console.log(`[HMR] Custom watcher - WebSocket clients: ${clientCount}`);
                
                if (clientCount === 0) {
                  console.warn(`[HMR] No WebSocket clients connected. Refresh the page in your browser.`);
                }
                
                if (server.ws) {
                  // Send reload message
                  const message = {
                    type: 'full-reload',
                    path: htmlUrl
                  };
                  
                  server.ws.send(message);
                  console.log(`[HMR] Custom watcher sent reload message:`, message);
                  
                  // Also try without path as fallback
                  setTimeout(() => {
                    server.ws.send({
                      type: 'full-reload'
                    });
                  }, 100);
                } else {
                  console.error(`[HMR] WebSocket server not available in custom watcher`);
                }
              } catch (err) {
                console.error(`[HMR] Failed to send reload message:`, err);
                console.error(`[HMR] Error details:`, err.stack);
              }
            }, 100); // Small delay to ensure file write is complete
          }
        });
        
        watcher.on('error', (err) => {
          console.warn(`[HMR] Error watching markdown file ${mdPath}:`, err.message);
        });
        
        markdownWatchers.set(mdPath, watcher);
      }
      
      // Set up watchers for all existing markdown files (including language variants)
      // Add them to Vite's watcher so handleHotUpdate gets called
      const blogPosts = findBlogPosts(blogDir);
      for (const post of blogPosts) {
        // Ensure we use absolute path
        const absoluteMdPath = resolve(post.mdPath);
        
        // Add to Vite's watcher (this is critical for handleHotUpdate to work)
        try {
          server.watcher.add(absoluteMdPath);
          const langSuffix = post.lang ? ` (${post.lang})` : '';
          console.log(`[HMR] Added to Vite watcher: ${relative(process.cwd(), absoluteMdPath)}${langSuffix}`);
        } catch (err) {
          console.warn(`[HMR] Failed to add ${absoluteMdPath} to watcher:`, err.message);
        }
        
        // Also set up our custom watcher as backup
        setupMarkdownWatcher(absoluteMdPath);
      }
      
      console.log(`[HMR] Watching ${blogPosts.length} markdown file(s) for changes`);
      
      // Test: Log WebSocket info
      console.log(`[HMR DEBUG] WebSocket server:`, server.ws ? 'exists' : 'missing');
      if (server.ws) {
        const initialClients = server.ws.clients?.size || 0;
        console.log(`[HMR DEBUG] Initial WebSocket clients: ${initialClients}`);
        console.log(`[HMR DEBUG] Note: Clients will connect when you open the page in your browser`);
        
        // Monitor client connections
        if (server.ws.clients) {
          const checkClients = () => {
            const currentClients = server.ws.clients?.size || 0;
            // if (currentClients > 0) {
            //   console.log(`[HMR DEBUG] WebSocket clients now connected: ${currentClients}`);
            // }
          };
          
          // Check periodically
          setInterval(checkClients, 5000);
        }
      }
      
      // Watch for new markdown files by watching the blog directory
      // Note: recursive option may not be available in older Node versions
      let blogDirWatcher;
      try {
        blogDirWatcher = watch(blogDir, { recursive: true, persistent: true }, (eventType, filename) => {
          // Match both content.md and content.{lang}.md files
          if (filename && typeof filename === 'string' && 
              (filename.endsWith('content.md') || filename.match(/content\.[a-z]{2}(-[a-z]{2})?\.md$/i))) {
            const mdPath = join(blogDir, filename);
            if (existsSync(mdPath)) {
              // Add to Vite's watcher
              server.watcher.add(mdPath);
              // Also set up our custom watcher as backup
              setupMarkdownWatcher(mdPath);
              console.log(`[HMR] Added new markdown file to watcher: ${relative(process.cwd(), mdPath)}`);
            }
          }
        });
      } catch (err) {
        // Fallback: watch individual directories if recursive is not supported
        console.warn('[HMR] Recursive directory watching not supported, watching individual post directories');
        const blogPosts = findBlogPosts(blogDir);
        for (const post of blogPosts) {
          const postDir = dirname(post.mdPath);
          try {
            watch(postDir, { persistent: true }, (eventType, filename) => {
              if (filename === 'content.md') {
                // Add to Vite's watcher
                server.watcher.add(post.mdPath);
                // Also set up our custom watcher as backup
                setupMarkdownWatcher(post.mdPath);
              }
            });
          } catch (e) {
            // Ignore errors for individual watchers
          }
        }
      }
      
      // Clean up watchers on server close
      server.httpServer?.once('close', () => {
        for (const watcher of markdownWatchers.values()) {
          watcher.close();
        }
        markdownWatchers.clear();
        if (blogDirWatcher) {
          blogDirWatcher.close();
        }
      });
      
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
        } else {
          next();
        }
      });
      
      // Serve images from blog post directories
      server.middlewares.use((req, res, next) => {
        // Check if this is a request for an image in a blog post directory
        // Pattern: /articles/{postName}/{imageName}
        const blogImageMatch = req.url?.match(/^\/articles\/([^/]+)\/(.+)$/);
        if (blogImageMatch) {
          const postName = blogImageMatch[1];
          const imageName = blogImageMatch[2];
          const imagePath = join(blogDir, postName, imageName);
          
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
      // This middleware ensures TypeScript files are accessible before Vite processes them
      server.middlewares.use((req, res, next) => {
        // Check if this is a request for a TypeScript file in a blog post directory
        // Pattern: /articles/{postName}/{fileName}.ts
        const blogTsMatch = req.url?.match(/^\/articles\/([^/]+)\/(.+\.ts)$/);
        if (blogTsMatch) {
          const postName = blogTsMatch[1];
          const fileName = blogTsMatch[2];
          const tsPath = join(blogDir, postName, fileName);
          
          if (existsSync(tsPath)) {
            // Let Vite handle the TypeScript transformation
            // Just pass through - Vite's plugin system will process it
            return next();
          }
        }
        next();
      });
      
      // Handle markdown files in dev mode
      server.middlewares.use(async (req, res, next) => {
        // Only handle HTML files from blog directory or article routes
        // Pattern: /articles/{name} or /articles/{name}/{lang} or /articles/{name}/{lang}.html
        const articleMatch = req.url?.match(/^\/articles\/([^/]+)(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/|\.html)?$/i);
        const isHtmlFile = req.url?.endsWith('.html');
        
        if (!req.url || (!isHtmlFile && !articleMatch)) {
          return next();
        }
        
        try {
          let postName = null;
          let lang = null;
          
          // Extract post name and language from URL
          if (articleMatch) {
            postName = articleMatch[1];
            lang = articleMatch[2]?.toLowerCase() || null;
          } else if (isHtmlFile) {
            // Try to extract from HTML file path
            const htmlPath = req.url.replace(/^\//, '');
            const resolvedPath = resolve(process.cwd(), htmlPath);
            const htmlDir = dirname(resolvedPath);
            const blogMatch = htmlDir.match(/articles[\/\\]([^\/\\]+)$/);
            if (blogMatch) {
              postName = blogMatch[1];
            }
          }
          
          if (!postName) {
            return next();
          }
          
          const postDir = join(blogDir, postName);
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
          
          // Resolve the HTML file path
          let htmlPath = req.url.replace(/^\//, '');
          let resolvedPath = resolve(process.cwd(), htmlPath);
          
          // Check if path is a directory, if so look for index.html
          const pathStat = existsSync(resolvedPath) ? statSync(resolvedPath) : null;
          if (pathStat && pathStat.isDirectory()) {
            const indexPath = join(resolvedPath, 'index.html');
            if (existsSync(indexPath)) {
              resolvedPath = indexPath;
            } else {
              // Use template
              if (existsSync(templateHTMLPath)) {
                resolvedPath = templateHTMLPath;
              } else {
                return next();
              }
            }
          } else if (!existsSync(resolvedPath)) {
            // File doesn't exist, use template
            if (existsSync(templateHTMLPath)) {
              resolvedPath = templateHTMLPath;
            } else {
              return next();
            }
          }
          
          // Double-check that resolvedPath is a file, not a directory
          const finalStat = existsSync(resolvedPath) ? statSync(resolvedPath) : null;
          if (!finalStat || finalStat.isDirectory()) {
            return next();
          }
          
          // Read the HTML file
          let htmlContent = readFileSync(resolvedPath, 'utf-8');
          
          // Check if this HTML needs markdown rendering
          if (!htmlContent.includes('<div id="blog-content"></div>')) {
            return next();
          }
          
          // Find the markdown file - we already determined it above
          const htmlDir = postDir;
          const blogPostName = postName;
          
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
          
          // Process images for dev mode (update paths to absolute)
          if (blogPostName) {
            htmlContent = processImagesForDev(htmlContent, htmlDir, blogPostName);
            // Process TypeScript files for dev mode (update paths to absolute and add type="module")
            htmlContent = processTypeScriptForDev(htmlContent, htmlDir, blogPostName);
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
    
    writeBundle() {
      // This runs after all files are written to disk
      // Convert markdown to HTML for all blog entries
      injectMarkdownToHtml(distDir);
    }
  };
}

