import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'fs';
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
 * Find all blog post directories that contain content.md
 */
function findBlogPosts(blogDir) {
  const posts = [];
  
  try {
    const entries = readdirSync(blogDir);
    
    for (const entry of entries) {
      const fullPath = join(blogDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && entry !== '_template') {
        const mdPath = join(fullPath, 'content.md');
        if (existsSync(mdPath)) {
          posts.push({
            dir: fullPath,
            name: entry,
            htmlPath: join(fullPath, 'index.html'),
            mdPath: mdPath
          });
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
      // Update image path to be absolute from root (e.g., /blog/first/test.png)
      const newImgSrc = `/blog/${blogPostName}/${imgSrc}`;
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
        // Convert to absolute path starting with / (e.g., /blog/first/test.png)
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
  const blogDir = resolve(process.cwd(), 'blog');
  const templateCSSPath = join(blogDir, '_template', 'blog-styles.css');
  const distCSSPath = join(distDir, 'blog-styles.css');
  
  if (existsSync(templateCSSPath)) {
    try {
      copyFileSync(templateCSSPath, distCSSPath);
      console.log(`✓ Copied shared CSS to dist`);
    } catch (err) {
      console.warn(`Warning: Could not copy shared CSS:`, err.message);
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
  
  // Find all blog posts (directories with content.md)
  const blogDir = resolve(process.cwd(), 'blog');
  const blogPosts = findBlogPosts(blogDir);
  const templateHTMLPath = join(blogDir, '_template', 'index.html');
  
  for (const post of blogPosts) {
    const { dir, name, htmlPath, mdPath } = post;
    
    // Check if HTML exists, if not use template
    let htmlContent;
    let sourceHtmlPath;
    let distHtmlPath;
    
    if (existsSync(htmlPath)) {
      // Use existing HTML file
      sourceHtmlPath = htmlPath;
      // Read the dist HTML file (Vite should have copied it)
      const relPath = htmlPath.replace(blogDir + '/', '');
      distHtmlPath = join(distDir, 'blog', relPath);
      
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
      
      // Create dist HTML file from template
      // Based on vite config, it should be at dist/blog/{name}/index.html or dist/blog/{name}.html
      // Check both possible locations
      const distHtmlPath1 = join(distDir, 'blog', name, 'index.html');
      const distHtmlPath2 = join(distDir, 'blog', `${name}.html`);
      
      if (existsSync(distHtmlPath1)) {
        distHtmlPath = distHtmlPath1;
      } else if (existsSync(distHtmlPath2)) {
        distHtmlPath = distHtmlPath2;
      } else {
        // Create the file
        distHtmlPath = join(distDir, 'blog', `${name}.html`);
        const distHtmlDir = dirname(distHtmlPath);
        if (!existsSync(distHtmlDir)) {
          mkdirSync(distHtmlDir, { recursive: true });
        }
      }
    } else {
      console.warn(`Warning: No HTML template found for blog post: ${name}`);
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
    
    // Extract title and date
    let title = frontmatter?.title || extractTitle(bodyContent) || 'Blog Post';
    const date = frontmatter?.date || frontmatter?.published || null;
    const formattedDate = formatDate(date);
    
    // Remove first h1 if it was used as title
    let markdownToRender = bodyContent;
    if (!frontmatter?.title && extractTitle(bodyContent)) {
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
      if (formattedDate) {
        const dateISO = date || new Date().toISOString().split('T')[0];
        if (htmlContent.includes('<time')) {
          // Replace existing time
          htmlContent = htmlContent.replace(
            /<time datetime="[^"]*">[^<]*<\/time>/,
            `<time datetime="${dateISO}">${formattedDate}</time>`
          );
        } else if (htmlContent.includes('<div class="meta">')) {
          // Replace existing meta content
          htmlContent = htmlContent.replace(
            /<div class="meta">.*?<\/div>/,
            `<div class="meta"><time datetime="${dateISO}">${formattedDate}</time></div>`
          );
        } else {
          // Add new meta section
          newHeaderContent += `\n        <div class="meta">\n          <time datetime="${dateISO}">${formattedDate}</time>\n        </div>`;
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
      `<div id="blog-content" class="container">${htmlFromMd}</div>`
    );
    
    // Process and copy images
    htmlContent = processImages(htmlContent, dir, distHtmlPath, distDir);
    
    // Write back
    writeFileSync(distHtmlPath, htmlContent, 'utf-8');
    console.log(`✓ Injected markdown to HTML: ${name}`);
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
    
    configureServer(server) {
      const blogDir = resolve(process.cwd(), 'blog');
      const templateHTMLPath = join(blogDir, '_template', 'index.html');
      const templateCSSPath = join(blogDir, '_template', 'blog-styles.css');
      const publicFaviconPath = resolve(process.cwd(), 'public', 'favicon.ico');
      
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
        } else {
          next();
        }
      });
      
      // Serve images from blog post directories
      server.middlewares.use((req, res, next) => {
        // Check if this is a request for an image in a blog post directory
        // Pattern: /blog/{postName}/{imageName}
        const blogImageMatch = req.url?.match(/^\/blog\/([^/]+)\/(.+)$/);
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
      
      // Handle markdown files in dev mode
      server.middlewares.use(async (req, res, next) => {
        // Only handle HTML files from blog directory
        if (!req.url || (!req.url.endsWith('.html') && !req.url.match(/\/blog\/[^/]+\/?$/))) {
          return next();
        }
        
        try {
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
              // Directory exists but no index.html, try to use template
              const blogMatch = req.url.match(/\/blog\/([^/]+)/);
              if (blogMatch) {
                const postName = blogMatch[1];
                const postDir = join(blogDir, postName);
                const mdPath = join(postDir, 'content.md');
                
                // If markdown exists, use template
                if (existsSync(mdPath) && existsSync(templateHTMLPath)) {
                  resolvedPath = templateHTMLPath;
                } else {
                  return next();
                }
              } else {
                return next();
              }
            }
          } else if (!existsSync(resolvedPath)) {
            // File doesn't exist, try to use template
            const blogMatch = req.url.match(/\/blog\/([^/]+)/);
            if (blogMatch) {
              const postName = blogMatch[1];
              const postDir = join(blogDir, postName);
              const mdPath = join(postDir, 'content.md');
              
              // If markdown exists but HTML doesn't, use template
              if (existsSync(mdPath) && existsSync(templateHTMLPath)) {
                resolvedPath = templateHTMLPath;
              } else {
                return next();
              }
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
          
          // Find the markdown file
          let htmlDir = dirname(resolvedPath);
          let blogPostName = null;
          // If using template, find the actual blog post directory
          if (resolvedPath === templateHTMLPath) {
            const blogMatch = req.url.match(/\/blog\/([^/]+)/);
            if (blogMatch) {
              blogPostName = blogMatch[1];
              htmlDir = join(blogDir, blogPostName);
            }
          } else {
            // Extract blog post name from directory path
            const blogMatch = htmlDir.match(/blog[\/\\]([^\/\\]+)$/);
            if (blogMatch) {
              blogPostName = blogMatch[1];
            }
          }
          const mdPath = join(htmlDir, 'content.md');
          
          if (!existsSync(mdPath)) {
            return next();
          }
          
          // Read and parse markdown
          configureMarked();
          const markdownContent = readFileSync(mdPath, 'utf-8');
          const content = typeof markdownContent === 'string' ? markdownContent : String(markdownContent || '');
          
          // Parse frontmatter
          const { frontmatter, content: bodyContent } = parseFrontmatter(content);
          
          // Extract title and date
          let title = frontmatter?.title || extractTitle(bodyContent) || 'Blog Post';
          const date = frontmatter?.date || frontmatter?.published || null;
          const formattedDate = formatDate(date);
          
          // Remove first h1 if it was used as title
          let markdownToRender = bodyContent;
          if (!frontmatter?.title && extractTitle(bodyContent)) {
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
            if (formattedDate) {
              const dateISO = date || new Date().toISOString().split('T')[0];
              if (htmlContent.includes('<time')) {
                // Replace existing time
                htmlContent = htmlContent.replace(
                  /<time datetime="[^"]*">[^<]*<\/time>/,
                  `<time datetime="${dateISO}">${formattedDate}</time>`
                );
              } else if (htmlContent.includes('<div class="meta">')) {
                // Replace existing meta content
                htmlContent = htmlContent.replace(
                  /<div class="meta">.*?<\/div>/,
                  `<div class="meta"><time datetime="${dateISO}">${formattedDate}</time></div>`
                );
              } else {
                // Add new meta section
                newHeaderContent += `\n        <div class="meta">\n          <time datetime="${dateISO}">${formattedDate}</time>\n        </div>`;
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
            `<div id="blog-content" class="container">${htmlFromMd}</div>`
          );
          
          // Process images for dev mode (update paths to absolute)
          if (blogPostName) {
            htmlContent = processImagesForDev(htmlContent, htmlDir, blogPostName);
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

