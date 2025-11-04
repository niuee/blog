import { defineConfig } from 'vite'
import { resolve, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync, statSync } from 'fs'
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
        findHtmlFiles(fullPath, baseDir, files)
      } else if (entry.endsWith('.html')) {
        // Get relative path from baseDir
        const relativePath = relative(baseDir, fullPath).replace(/\.html$/, '')
        
        // If file is in a subdirectory and filename matches directory name,
        // flatten to just use the directory name as the key
        // e.g., blog/first/first.html -> blog/first.html
        const pathParts = relativePath.split(/[/\\]/) // Handle both / and \ for cross-platform
        if (pathParts.length === 2 && pathParts[0] === pathParts[1]) {
          // Use 'blog/{directoryName}' as the key to output to blog/{name}.html
          // This will output to blog/first.html instead of blog/first/first.html
          files[`blog/${pathParts[0]}`] = resolve(fullPath)
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

// Automatically discover HTML files in entries directory
const blogEntriesDir = resolve(__dirname, 'blog')
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

