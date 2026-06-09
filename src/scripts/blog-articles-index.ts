// Articles index: pagination, sorting, and filtering.
// Ported verbatim from the legacy /articles inline script. Reads article
// metadata from the embedded `<script id="articles-data" type="application/json">`
// block and toggles `.article-item.hidden` on the server-rendered cards.

interface ArticleData {
  name: string;
  title: string;
  date: string | null;
  tags?: string[];
}

declare global {
  interface Window {
    getTranslation?: (key: string) => string;
    clearTagFilter?: () => void;
    goToPage?: (page: number) => void;
  }
}

(function () {
  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let currentTag = '';
  let currentSort = 'newest';
  let filteredArticles: ArticleData[] = [];
  let allArticles: ArticleData[] = [];

  // Get articles data from embedded JSON
  function getArticlesData(): ArticleData[] {
    const dataScript = document.getElementById('articles-data');
    if (!dataScript) return [];
    try {
      return JSON.parse(dataScript.textContent || '[]');
    } catch (e) {
      console.warn('Could not parse articles data:', e);
      return [];
    }
  }

  // Get DOM elements
  const tagFilter = document.getElementById('tag-filter') as HTMLSelectElement | null;
  const sortOrder = document.getElementById('sort-order') as HTMLSelectElement | null;
  const articleList = document.getElementById('article-list');
  const articlesCount = document.getElementById('articles-count');
  const activeFilterEl = document.getElementById('active-filter');
  const paginationContainer = document.getElementById('articles-pagination');
  const controlsContainer = document.getElementById('articles-controls');
  const controlsHeader = document.getElementById('controls-header');
  const controlsSummary = document.getElementById('controls-summary');

  // URL query string helpers
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      page: parseInt(params.get('page') || '', 10) || 1,
      tag: params.get('tag') || '',
      sort: params.get('sort') || 'newest',
    };
  }

  function updateQueryParams(skipHistory = false) {
    const params = new URLSearchParams();

    // Only add non-default values to keep URL clean
    if (currentPage > 1) {
      params.set('page', String(currentPage));
    }
    if (currentTag) {
      params.set('tag', currentTag);
    }
    if (currentSort && currentSort !== 'newest') {
      params.set('sort', currentSort);
    }

    const queryString = params.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    if (skipHistory) {
      history.replaceState({ page: currentPage, tag: currentTag, sort: currentSort }, '', newUrl);
    } else {
      history.pushState({ page: currentPage, tag: currentTag, sort: currentSort }, '', newUrl);
    }
  }

  // Initialize
  function init() {
    allArticles = getArticlesData();
    if (allArticles.length === 0) return;

    // Read initial state from URL
    const params = getQueryParams();
    currentPage = params.page;
    currentTag = params.tag;
    currentSort = params.sort;

    // Set UI controls to match URL state
    if (tagFilter && currentTag) {
      tagFilter.value = currentTag;
    }
    if (sortOrder && currentSort) {
      sortOrder.value = currentSort;
    }

    // Apply initial filter
    applyFilter(false);

    // Attach event listeners
    if (tagFilter) {
      tagFilter.addEventListener('change', handleFilterChange);
    }
    if (sortOrder) {
      sortOrder.addEventListener('change', handleSortChange);
    }

    // Controls toggle
    if (controlsHeader && controlsContainer) {
      // Load saved collapsed state
      const savedCollapsed = localStorage.getItem('articles-controls-collapsed');
      if (savedCollapsed === 'false') {
        controlsContainer.classList.remove('collapsed');
      }

      controlsHeader.addEventListener('click', toggleControls);
    }

    // Handle browser back/forward
    window.addEventListener('popstate', handlePopState);

    // Initial render (skip history on first load)
    updateDisplay(true);
  }

  // Toggle controls panel
  function toggleControls() {
    if (!controlsContainer) return;
    controlsContainer.classList.toggle('collapsed');
    const isCollapsed = controlsContainer.classList.contains('collapsed');
    localStorage.setItem('articles-controls-collapsed', isCollapsed ? 'true' : 'false');
  }

  // Update controls summary (shown when collapsed)
  function updateControlsSummary() {
    if (!controlsSummary) return;

    const parts: string[] = [];
    if (currentTag) {
      parts.push(`tag: ${currentTag}`);
    }
    if (currentSort && currentSort !== 'newest') {
      const sortLabels: Record<string, string> = {
        oldest: 'oldest first',
        'title-asc': 'A-Z',
        'title-desc': 'Z-A',
      };
      parts.push(sortLabels[currentSort] || currentSort);
    }

    controlsSummary.textContent = parts.length > 0 ? `(${parts.join(', ')})` : '';
  }

  // Handle browser back/forward navigation
  function handlePopState() {
    const params = getQueryParams();
    currentPage = params.page;
    currentTag = params.tag;
    currentSort = params.sort;

    // Update UI controls
    if (tagFilter) tagFilter.value = currentTag;
    if (sortOrder) sortOrder.value = currentSort;

    // Re-apply filter and display
    applyFilter(false);
    updateDisplay(true);
  }

  // Apply current filter
  function applyFilter(resetPage = true) {
    if (resetPage) {
      currentPage = 1;
    }

    if (currentTag) {
      filteredArticles = allArticles.filter(
        (article) => article.tags && article.tags.includes(currentTag)
      );
      showActiveFilter(currentTag);
    } else {
      filteredArticles = [...allArticles];
      hideActiveFilter();
    }

    applyCurrentSort();
  }

  // Handle filter change
  function handleFilterChange() {
    if (!tagFilter) return;
    currentTag = tagFilter.value;
    applyFilter(true);
    updateDisplay();
  }

  // Handle sort change
  function handleSortChange() {
    if (!sortOrder) return;
    currentSort = sortOrder.value;
    applyCurrentSort();
    currentPage = 1;
    updateDisplay();
  }

  // Apply current sort order
  function applyCurrentSort() {
    const order = currentSort || 'newest';

    switch (order) {
      case 'newest':
        filteredArticles.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        break;
      case 'oldest':
        filteredArticles.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        break;
      case 'title-asc':
        filteredArticles.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-desc':
        filteredArticles.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
    }
  }

  // Show active filter badge
  function showActiveFilter(tag: string) {
    if (activeFilterEl) {
      const t = window.getTranslation || ((k: string) => k);
      activeFilterEl.innerHTML = `${t('tag')} ${escapeHtml(tag)} <span class="clear-filter" onclick="clearTagFilter()">×</span>`;
      activeFilterEl.style.display = 'inline-flex';
    }
  }

  // Hide active filter badge
  function hideActiveFilter() {
    if (activeFilterEl) {
      activeFilterEl.style.display = 'none';
    }
  }

  // Clear tag filter (global function for onclick)
  window.clearTagFilter = function () {
    if (tagFilter) {
      tagFilter.value = '';
      handleFilterChange();
    }
  };

  // Update display
  function updateDisplay(skipHistory = false) {
    if (!articleList) return;

    const totalItems = filteredArticles.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // Ensure current page is valid
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    if (currentPage < 1) currentPage = 1;

    // Update URL
    updateQueryParams(skipHistory);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageArticles = filteredArticles.slice(startIndex, endIndex);

    // Get article names to show on this page
    const visibleNames = new Set(pageArticles.map((a) => a.name));

    // Get all article names in filtered set
    const filteredNames = new Set(filteredArticles.map((a) => a.name));

    // Update visibility of article items
    const allItems = articleList.querySelectorAll('.article-item');
    allItems.forEach((item) => {
      const title = item.getAttribute('data-title');
      // Find article by title in original data
      const article = allArticles.find((a) => a.title === title);
      if (!article) {
        item.classList.add('hidden');
        return;
      }

      // Check if in filtered set
      if (!filteredNames.has(article.name)) {
        item.classList.add('hidden');
        return;
      }

      // Check if on current page
      if (visibleNames.has(article.name)) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });

    // Show "no results" if needed
    let noResultsEl = articleList.querySelector('.no-results');
    if (totalItems === 0) {
      if (!noResultsEl) {
        noResultsEl = document.createElement('p');
        noResultsEl.className = 'no-results';
        noResultsEl.textContent = window.getTranslation
          ? window.getTranslation('noResults')
          : 'No articles match your filter.';
        articleList.appendChild(noResultsEl);
      }
    } else {
      if (noResultsEl) {
        noResultsEl.remove();
      }
    }

    // Update count
    if (articlesCount) {
      const t = window.getTranslation || ((k: string) => k);
      const countText = `${totalItems} ${totalItems === 1 ? t('article') : t('articles_count')}`;
      articlesCount.textContent = countText;
    }

    // Update controls summary (for collapsed state)
    updateControlsSummary();

    // Update pagination
    renderPagination(totalPages);
  }

  // Render pagination controls
  function renderPagination(totalPages: number) {
    if (!paginationContainer) return;

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let html = '';
    const t = window.getTranslation || ((k: string) => k);

    // Previous button
    html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">${t('prev')}</button>`;

    // Page numbers
    html += '<div class="pagination-pages">';

    // Show limited page numbers with ellipsis
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
      if (startPage > 2) {
        html += `<span class="pagination-info">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === currentPage ? 'active' : '';
      html += `<button class="page-btn ${isActive}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += `<span class="pagination-info">...</span>`;
      }
      html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    html += '</div>';

    // Next button
    html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">${t('next')}</button>`;

    paginationContainer.innerHTML = html;
  }

  // Go to specific page (global function for onclick)
  window.goToPage = function (page: number) {
    currentPage = page;
    updateDisplay();
    // Scroll to top of list
    if (articleList) {
      articleList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Escape HTML helper
  function escapeHtml(text: string) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Save filter state when clicking on article links
(function () {
  function saveFilterState() {
    const queryString = window.location.search;
    if (queryString) {
      sessionStorage.setItem('articles-filter-state', queryString);
    } else {
      sessionStorage.removeItem('articles-filter-state');
    }
  }

  // Add click listener to all article links
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const articleLink = target?.closest('.article-link');
    if (articleLink) {
      saveFilterState();
    }
  });
})();

export {};
