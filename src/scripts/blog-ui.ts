// src/scripts/blog-ui.ts — ported verbatim from articles/_template/index.html trailing inline scripts.
// Each initializer no-ops if its target elements are absent so non-article pages can safely load it.

function initStickyNavAndFontSize() {
  // Reset scroll position on page load
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  // Sticky nav scroll effect - show border when scrolled
  (function () {
    const stickyNav = document.getElementById('sticky-nav');
    if (stickyNav) {
      const handleScroll = () => {
        if (window.scrollY > 10) {
          stickyNav.classList.add('scrolled');
        } else {
          stickyNav.classList.remove('scrolled');
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll(); // Check initial state
    }
  })();

  // Font size controls
  const fontSizeButtons: Record<string, HTMLElement | null> = {
    medium: document.getElementById('font-size-medium'),
    large: document.getElementById('font-size-large'),
    xl: document.getElementById('font-size-xl'),
  };

  // Guard: no font-size controls on this page
  if (!document.querySelector('.font-size-controls')) return;

  // Load saved font size preference (already set in head, but ensure consistency)
  const savedFontSize = localStorage.getItem('blog-font-size') || 'large';
  // Don't set attribute again if it's already set to prevent animation
  if (!document.documentElement.hasAttribute('data-font-size')) {
    document.documentElement.setAttribute('data-font-size', savedFontSize);
  }

  // Enable font-size transition after initial load
  document.body.classList.add('font-size-transition-enabled');

  // Function to update font size
  function updateFontSize(size: string) {
    document.documentElement.setAttribute('data-font-size', size);
    localStorage.setItem('blog-font-size', size);

    // Update button states
    Object.keys(fontSizeButtons).forEach((key) => {
      if (fontSizeButtons[key]) {
        fontSizeButtons[key]!.classList.toggle('active', key === size);
      }
    });
  }

  // Set initial active button based on saved preference
  updateFontSize(savedFontSize);

  // Add click handlers
  Object.keys(fontSizeButtons).forEach((size) => {
    if (fontSizeButtons[size]) {
      fontSizeButtons[size]!.addEventListener('click', () => {
        updateFontSize(size);
      });
    }
  });
}

function initImageViewer() {
  // Image Viewer functionality
  (function () {
    const overlay = document.getElementById('image-viewer-overlay');
    const container = document.getElementById('image-viewer-container');
    const viewerImg = document.getElementById('image-viewer-img') as HTMLImageElement | null;
    const closeBtn = document.getElementById('image-viewer-close');
    const zoomInBtn = document.getElementById('image-viewer-zoom-in');
    const zoomOutBtn = document.getElementById('image-viewer-zoom-out');
    const resetBtn = document.getElementById('image-viewer-reset');
    const zoomLevelEl = document.getElementById('image-viewer-zoom-level');

    if (!overlay || !viewerImg) return;

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let lastTranslateX = 0;
    let lastTranslateY = 0;

    const MIN_SCALE = 0.5;
    const MAX_SCALE = 5;
    const SCALE_STEP = 0.25;

    let rafId: number | null = null;

    function updateTransform() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        viewerImg!.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
        if (zoomLevelEl) {
          zoomLevelEl.textContent = Math.round(scale * 100) + '%';
        }
        rafId = null;
      });
    }

    function resetView() {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateTransform();
    }

    function openViewer(imgSrc: string, imgAlt: string) {
      viewerImg!.src = imgSrc;
      viewerImg!.alt = imgAlt || '';
      resetView();
      overlay!.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeViewer() {
      overlay!.classList.remove('show');
      document.body.style.overflow = '';
      viewerImg!.src = '';
    }

    function zoomIn() {
      scale = Math.min(MAX_SCALE, scale + SCALE_STEP);
      updateTransform();
    }

    function zoomOut() {
      scale = Math.max(MIN_SCALE, scale - SCALE_STEP);
      updateTransform();
    }

    // Click on zoomable images
    document.addEventListener('click', (e) => {
      const img = (e.target as Element).closest('img[data-zoomable]') as HTMLImageElement | null;
      if (img) {
        e.preventDefault();
        openViewer(img.src, img.alt);
      }
    });

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeViewer);
    }

    // Click on backdrop to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === container) {
        closeViewer();
      }
    });

    // Zoom controls
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (resetBtn) resetBtn.addEventListener('click', resetView);

    // Mouse wheel zoom
    container!.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    }, { passive: false });

    // Pan with mouse drag
    viewerImg.addEventListener('mousedown', (e) => {
      if (scale > 1) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
        viewerImg!.classList.add('dragging');
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      translateX = lastTranslateX + (e.clientX - startX);
      translateY = lastTranslateY + (e.clientY - startY);
      updateTransform();
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        viewerImg!.classList.remove('dragging');
      }
    });

    // Touch support for mobile
    let lastTouchDistance = 0;
    let isPinching = false;

    viewerImg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && scale > 1) {
        isDragging = true;
        isPinching = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
        viewerImg!.classList.add('dragging');
      } else if (e.touches.length === 2) {
        isDragging = false;
        isPinching = true;
        viewerImg!.classList.add('dragging');
        lastTouchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    viewerImg.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        translateX = lastTranslateX + (e.touches[0].clientX - startX);
        translateY = lastTranslateY + (e.touches[0].clientY - startY);
        updateTransform();
      } else if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = currentDistance - lastTouchDistance;
        if (Math.abs(delta) > 3) {
          const scaleChange = delta * 0.008;
          scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + scaleChange));
          updateTransform();
          lastTouchDistance = currentDistance;
        }
      }
    }, { passive: false });

    viewerImg.addEventListener('touchend', () => {
      isDragging = false;
      isPinching = false;
      lastTouchDistance = 0;
      viewerImg!.classList.remove('dragging');
    });

    viewerImg.addEventListener('touchcancel', () => {
      isDragging = false;
      isPinching = false;
      lastTouchDistance = 0;
      viewerImg!.classList.remove('dragging');
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (!overlay!.classList.contains('show')) return;

      if (e.key === 'Escape') {
        closeViewer();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetView();
      }
    });

    // Double-click to toggle zoom
    viewerImg.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (scale === 1) {
        scale = 2;
        // Zoom towards click position
        const rect = viewerImg!.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        translateX = -x;
        translateY = -y;
      } else {
        scale = 1;
        translateX = 0;
        translateY = 0;
      }
      updateTransform();
    });
  })();
}

function initTOC() {
  // Table of Contents (TOC) functionality
  (function () {
    const tocSidebar = document.getElementById('toc-sidebar');
    const tocList = document.getElementById('toc-list');
    const tocMobile = document.getElementById('toc-mobile');
    const tocMobileBtn = document.getElementById('toc-mobile-btn');
    const tocMobileDropdown = document.getElementById('toc-mobile-dropdown');
    const tocMobileList = document.getElementById('toc-mobile-list');
    const tocMobileClose = document.getElementById('toc-mobile-close');
    const blogContent = document.getElementById('blog-content');

    if (!blogContent) return;

    function generateTOC() {
      // Get all headers from the blog content
      const headers = blogContent!.querySelectorAll('h1, h2, h3');

      if (headers.length < 2) {
        // Hide TOC if there are fewer than 2 headers
        if (tocSidebar) tocSidebar.style.display = 'none';
        if (tocMobile) tocMobile.style.display = 'none';
        return;
      }

      if (tocList) tocList.innerHTML = '';
      if (tocMobileList) tocMobileList.innerHTML = '';

      headers.forEach((header, index) => {
        // Create an ID for the header if it doesn't have one
        if (!header.id) {
          header.id = 'heading-' + index;
        }

        // Create desktop TOC item
        if (tocList) {
          const li = document.createElement('li');
          li.className = 'toc-item toc-' + header.tagName.toLowerCase();

          const link = document.createElement('a');
          link.href = '#' + header.id;
          link.textContent = header.textContent;
          link.className = 'toc-link';

          link.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToHeader(header.id);
          });

          li.appendChild(link);
          tocList.appendChild(li);
        }

        // Create mobile TOC item
        if (tocMobileList) {
          const li = document.createElement('li');
          li.className = 'toc-mobile-item toc-mobile-' + header.tagName.toLowerCase();

          const link = document.createElement('a');
          link.href = '#' + header.id;
          link.textContent = header.textContent;
          link.className = 'toc-mobile-link';

          link.addEventListener('click', (e) => {
            e.preventDefault();
            closeMobileDropdown();
            scrollToHeader(header.id);
          });

          li.appendChild(link);
          tocMobileList.appendChild(li);
        }
      });

      // Show the TOCs
      if (tocSidebar) tocSidebar.style.display = 'block';
      if (tocMobile) tocMobile.style.display = 'block';
    }

    function scrollToHeader(headerId: string) {
      const target = document.getElementById(headerId);
      if (target) {
        const offset = 100; // Account for sticky nav
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    }

    // Scroll spy to highlight current section
    function updateActiveSection() {
      const headers = blogContent!.querySelectorAll('h1, h2, h3');
      const desktopLinks = tocList ? tocList.querySelectorAll('.toc-link') : [];
      const mobileLinks = tocMobileList ? tocMobileList.querySelectorAll('.toc-mobile-link') : [];

      if (headers.length === 0) return;

      let currentActive: number | null = null;
      const scrollPosition = window.scrollY + 120; // Offset for better UX

      headers.forEach((header, index) => {
        if ((header as HTMLElement).offsetTop <= scrollPosition) {
          currentActive = index;
        }
      });

      desktopLinks.forEach((link, index) => {
        link.classList.toggle('active', index === currentActive);
      });

      mobileLinks.forEach((link, index) => {
        link.classList.toggle('active', index === currentActive);
      });
    }

    // Mobile dropdown toggle
    function closeMobileDropdown() {
      if (tocMobileDropdown) tocMobileDropdown.classList.remove('show');
      if (tocMobileBtn) tocMobileBtn.setAttribute('aria-expanded', 'false');
    }

    if (tocMobileBtn) {
      tocMobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = tocMobileBtn.getAttribute('aria-expanded') === 'true';
        tocMobileBtn.setAttribute('aria-expanded', String(!isExpanded));
        tocMobileDropdown!.classList.toggle('show');
      });
    }

    if (tocMobileClose) {
      tocMobileClose.addEventListener('click', closeMobileDropdown);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (tocMobile && !tocMobile.contains(e.target as Node)) {
        closeMobileDropdown();
      }
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && tocMobileDropdown && tocMobileDropdown.classList.contains('show')) {
        closeMobileDropdown();
      }
    });

    // Generate TOC when content is loaded
    const observer = new MutationObserver((mutations) => {
      const hasContent = blogContent!.querySelector('h1, h2, h3');
      if (hasContent) {
        generateTOC();
        updateActiveSection();
        observer.disconnect();
      }
    });

    observer.observe(blogContent, { childList: true, subtree: true });

    // Also try immediately in case content is already there
    if (blogContent.querySelector('h1, h2, h3')) {
      generateTOC();
      updateActiveSection();
    }

    // Update active section on scroll
    window.addEventListener('scroll', updateActiveSection, { passive: true });
  })();
}

function initCodeCopy() {
  // Code block copy button functionality
  (function () {
    function addCopyButtons() {
      const codeBlocks = document.querySelectorAll('pre');

      codeBlocks.forEach((pre) => {
        // Skip if already has a copy button
        if (pre.querySelector('.code-copy-btn')) {
          return;
        }

        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.setAttribute('aria-label', 'Copy code');
        copyBtn.setAttribute('title', 'Copy code');
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        `;

        copyBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Get the code content
          const codeElement = pre.querySelector('code');
          const textToCopy = codeElement ? codeElement.textContent! : pre.textContent!;

          try {
            await navigator.clipboard.writeText(textToCopy);

            // Show success state
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied!</span>
            `;

            // Reset after 2 seconds
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
              `;
            }, 2000);
          } catch (err) {
            console.error('Failed to copy code:', err);

            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand('copy');
              copyBtn.classList.add('copied');
              copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>
              `;
              setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = `
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy</span>
                `;
              }, 2000);
            } catch (e) {
              console.error('Fallback copy failed:', e);
            }
            document.body.removeChild(textArea);
          }
        });

        pre.appendChild(copyBtn);
      });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addCopyButtons);
    } else {
      addCopyButtons();
    }

    // Also observe for dynamically added code blocks
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          addCopyButtons();
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  })();
}

function init() {
  initStickyNavAndFontSize();
  initImageViewer();
  initTOC();
  initCodeCopy();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
