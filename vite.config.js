import { defineConfig } from 'vite'
import { resolve, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { markdownPlugin } from './vite-plugin-markdown.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Function to recursively find all HTML files in a directory
function findHtmlFiles(dir, baseDir = dir, files = {}) {
  try {
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Skip template directory
        if (entry !== '_template') {
          findHtmlFiles(fullPath, baseDir, files)
        }
      } else if (entry.endsWith('.html')) {
        // Get relative path from baseDir
        const relativePath = relative(baseDir, fullPath).replace(/\.html$/, '')
        
        // If file is in a subdirectory and filename matches directory name,
        // flatten to just use the directory name as the key
        // e.g., articles/first/first.html -> articles/first.html
        const pathParts = relativePath.split(/[/\\]/) // Handle both / and \ for cross-platform
        if (pathParts.length === 2 && pathParts[0] === pathParts[1]) {
          // Use 'articles/{directoryName}' as the key to output to articles/{name}.html
          // This will output to articles/first.html instead of articles/first/first.html
          files[`articles/${pathParts[0]}`] = resolve(fullPath)
        } else {
          // Use full relative path for other cases
          files[relativePath] = resolve(fullPath)
        }
      }
    }
  } catch (err) {
    // Directory doesn't exist, skip it
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: Could not read directory ${dir}:`, err.message)
    }
  }
  
  return files
}

// Find all language variants for a blog post directory
function findLanguageVariants(postDir) {
  const variants = []
  
  // Check for default content.md (no language specified)
  const defaultMdPath = join(postDir, 'content.md')
  if (existsSync(defaultMdPath)) {
    variants.push({ lang: null, mdPath: defaultMdPath })
  }
  
  // Check for language-specific files (content.en.md, content.zh.md, etc.)
  try {
    const entries = readdirSync(postDir)
    const langPattern = /^content\.([a-z]{2}(-[a-z]{2})?)\.md$/i
    
    for (const entry of entries) {
      const match = entry.match(langPattern)
      if (match) {
        const lang = match[1].toLowerCase()
        const mdPath = join(postDir, entry)
        variants.push({ lang, mdPath })
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return variants
}

// Find blog posts and generate HTML from template if needed
function findBlogPostsAndGenerateHTML(blogDir, templateHTMLPath) {
  const posts = []
  
  try {
    const entries = readdirSync(blogDir)
    
    for (const entry of entries) {
      const fullPath = join(blogDir, entry)
      const stat = statSync(fullPath)
      
      if (stat.isDirectory() && entry !== '_template') {
        const variants = findLanguageVariants(fullPath)
        
        if (variants.length > 0) {
          // For backward compatibility, if only default content.md exists, treat it as a single post
          if (variants.length === 1 && variants[0].lang === null) {
            // Single default content.md
            const htmlPath = join(fullPath, 'index.html')
            if (!existsSync(htmlPath) && existsSync(templateHTMLPath)) {
              const htmlContent = readFileSync(templateHTMLPath, 'utf-8')
              writeFileSync(htmlPath, htmlContent, 'utf-8')
              console.log(`✓ Generated HTML from template: ${entry}/index.html`)
            }
            posts.push({ dir: fullPath, name: entry })
          } else {
            // Multiple language variants - generate HTML for each
            for (const variant of variants) {
              const langSuffix = variant.lang ? `.${variant.lang}` : ''
              const htmlPath = join(fullPath, `index${langSuffix}.html`)
              
              if (!existsSync(htmlPath) && existsSync(templateHTMLPath)) {
                const htmlContent = readFileSync(templateHTMLPath, 'utf-8')
                writeFileSync(htmlPath, htmlContent, 'utf-8')
                const langLabel = variant.lang ? ` (${variant.lang})` : ''
                console.log(`✓ Generated HTML from template: ${entry}/index${langSuffix}.html${langLabel}`)
              }
              posts.push({ dir: fullPath, name: entry, lang: variant.lang })
            }
          }
        }
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: Could not read directory ${blogDir}:`, err.message)
    }
  }
  
  return posts
}

// Automatically discover HTML files in entries directory
const blogEntriesDir = resolve(__dirname, 'articles')
const templateHTMLPath = join(blogEntriesDir, '_template', 'index.html')

// Generate HTML files for blog posts that only have content.md
findBlogPostsAndGenerateHTML(blogEntriesDir, templateHTMLPath)

const blogEntries = findHtmlFiles(blogEntriesDir)

// https://vite.dev/config/
export default defineConfig({
  // Base public path when served in production
  base: '/',
  
  // Markdown plugin configuration
  plugins: [
    markdownPlugin(),
  ],
  
  // Development server options
  server: {
    port: 5173,
    open: true,
    host: true,
  },
  
  // Build options
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Target modern browsers
    target: 'esnext',
    emptyOutDir: true,
    // Multiple entry points for blog entries
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // Automatically include all HTML files from entries directory
        ...blogEntries,
      },
    }
  },
  
  // Preview server options
  preview: {
    port: 4173,
    host: true,
  },
})

