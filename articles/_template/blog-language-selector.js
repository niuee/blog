/**
 * Shared locale UI: same markup (#language-selector) and behavior per page type.
 * Set on <body>: data-blog-lang-mode="article" | "articles-listing" | "series" | "resume"
 */
(function () {
  'use strict';

  var LANGUAGE_NAMES = {
    en: 'English',
    'zh-tw': '繁體中文',
    'zh-cn': '简体中文',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    ru: 'Русский',
    ar: 'العربية',
    hi: 'हिन्दी'
  };

  var mode = document.body.getAttribute('data-blog-lang-mode');
  if (!mode) return;

  var languageSelector = document.getElementById('language-selector');
  var languageSelectorBtn = document.getElementById('language-selector-btn');
  var languageDropdown = document.getElementById('language-dropdown');
  var languageSelectorText = document.getElementById('language-selector-text');

  if (!languageSelector || !languageSelectorBtn || !languageDropdown) return;

  var docListenersBound = false;

  function bindDocumentClose() {
    if (docListenersBound) return;
    docListenersBound = true;
    document.addEventListener('click', function (e) {
      if (!languageSelector.contains(e.target)) {
        languageSelectorBtn.setAttribute('aria-expanded', 'false');
        languageDropdown.classList.remove('show');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && languageDropdown.classList.contains('show')) {
        languageSelectorBtn.setAttribute('aria-expanded', 'false');
        languageDropdown.classList.remove('show');
      }
    });
  }

  function bindStandardButtonToggle() {
    languageSelectorBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var expanded = languageSelectorBtn.getAttribute('aria-expanded') === 'true';
      languageSelectorBtn.setAttribute('aria-expanded', (!expanded).toString());
      languageDropdown.classList.toggle('show');
    });
    bindDocumentClose();
  }

  function inferPreferredLang(availableLanguages) {
    var systemLang = navigator.language || navigator.userLanguage || 'en';
    var systemLangCode = systemLang.toLowerCase().split('-')[0];
    var systemLangFull = systemLang.toLowerCase();
    if (availableLanguages.includes(systemLangFull)) return systemLangFull;
    if (availableLanguages.includes(systemLangCode)) return systemLangCode;
    if (systemLangFull.startsWith('zh') && availableLanguages.includes('zh-tw')) return 'zh-tw';
    if (systemLangFull.startsWith('zh') && availableLanguages.includes('zh-cn')) return 'zh-cn';
    return null;
  }

  function getAvailableFromScript() {
    var dataScript = document.getElementById('available-languages');
    if (dataScript) {
      try {
        return JSON.parse(dataScript.textContent);
      } catch (e) {
        console.warn('Could not parse available languages:', e);
      }
    }
    return [null];
  }

  if (mode === 'series') {
    initSeries();
  } else {
    bindStandardButtonToggle();
    if (mode === 'article') initArticle();
    else if (mode === 'articles-listing') initArticlesListing();
    else if (mode === 'resume') initResume();
  }

  function initArticle() {
    var knownLangCodes = [
      'en',
      'zh',
      'zh-tw',
      'zh-cn',
      'ja',
      'ko',
      'es',
      'fr',
      'de',
      'it',
      'pt',
      'ru',
      'ar',
      'hi'
    ];

    function isLangCode(s) {
      return s && knownLangCodes.indexOf(String(s).toLowerCase()) !== -1;
    }

    /**
     * Standalone: /articles/{slug}, /articles/{slug}/{lang}
     * Series: /articles/{series}/{article}, /articles/{series}/{article}/{lang}
     * (Aligned with vite-plugin-markdown articleMatch + disambiguation when only two segments.)
     */
    function getCurrentUrlInfo() {
      var path = window.location.pathname;
      var match = path.match(
        /^\/articles\/([^/]+)(?:\/([^/]+))?(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/|\.html)?$/i
      );
      if (!match) {
        return {
          seriesSlug: null,
          articleSlug: null,
          currentLang: null
        };
      }
      var seg1 = match[1];
      var seg2 = match[2] ? match[2].toLowerCase() : null;
      var seg3 = match[3] ? match[3].toLowerCase() : null;

      if (!seg2) {
        return { seriesSlug: null, articleSlug: seg1, currentLang: null };
      }
      if (seg3) {
        return {
          seriesSlug: seg1,
          articleSlug: seg2,
          currentLang: isLangCode(seg3) ? seg3 : null
        };
      }
      if (isLangCode(seg2)) {
        return { seriesSlug: null, articleSlug: seg1, currentLang: seg2 };
      }
      return { seriesSlug: seg1, articleSlug: seg2, currentLang: null };
    }

    function articleBasePath(info) {
      if (!info.articleSlug) return null;
      return info.seriesSlug
        ? '/articles/' + info.seriesSlug + '/' + info.articleSlug
        : '/articles/' + info.articleSlug;
    }

    function switchLanguage(lang, savePreference) {
      if (savePreference === undefined) savePreference = true;
      var info = getCurrentUrlInfo();
      var base = articleBasePath(info);
      if (!base) return;
      var langCode = lang || 'en';
      document.documentElement.lang = langCode;
      if (savePreference) localStorage.setItem('blog-language', langCode);
      var newUrl = lang ? base + '/' + lang : base;
      window.location.href = newUrl;
    }

    function initLanguageSelector() {
      var info = getCurrentUrlInfo();
      if (!info.articleSlug) {
        languageSelector.style.display = 'none';
        return;
      }

      var urlLang = info.currentLang;
      var navEarlyArticles = document.getElementById('nav-link-articles');
      var navEarlySeries = document.getElementById('nav-link-series');
      var savedFilterEarly = sessionStorage.getItem('articles-filter-state') || '';
      if (navEarlyArticles) {
        navEarlyArticles.href =
          (urlLang ? '/articles/' + urlLang : '/articles') + savedFilterEarly;
      }
      if (navEarlySeries) {
        navEarlySeries.href = urlLang ? '/series/' + urlLang : '/series';
      }

      var availableLanguages = getAvailableFromScript();
      if (availableLanguages.length <= 1) {
        languageSelector.style.display = 'none';
        return;
      }

      var effectiveLang = urlLang;
      if (urlLang && !availableLanguages.includes(urlLang)) {
        effectiveLang = null;
      }
      var currentLangCode = effectiveLang || 'en';
      var displayText =
        LANGUAGE_NAMES[currentLangCode] ||
        currentLangCode.toUpperCase().split('-')[0];
      if (languageSelectorText) {
        languageSelectorText.textContent = displayText;
      }
      document.documentElement.lang = currentLangCode;

      var navArticles = document.getElementById('nav-link-articles');
      var navSeries = document.getElementById('nav-link-series');
      var savedFilter = sessionStorage.getItem('articles-filter-state') || '';
      var baseBackUrl = effectiveLang ? '/articles/' + effectiveLang : '/articles';
      if (navArticles) navArticles.href = baseBackUrl + savedFilter;
      if (navSeries) {
        navSeries.href = effectiveLang ? '/series/' + effectiveLang : '/series';
      }

      languageDropdown.innerHTML = '';
      availableLanguages.forEach(function (lang) {
        var langCode = lang || 'en';
        var langName = LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
        var langOption = document.createElement('button');
        langOption.className = 'language-option';
        langOption.textContent = langName;
        langOption.setAttribute('data-lang', lang || '');
        langOption.setAttribute('role', 'menuitem');
        if (
          (lang === null && effectiveLang === null) ||
          lang === effectiveLang
        ) {
          langOption.classList.add('active');
        }
        langOption.addEventListener('click', function () {
          switchLanguage(lang);
        });
        languageDropdown.appendChild(langOption);
      });

      if (urlLang === null) {
        var savedLang = localStorage.getItem('blog-language');
        if (savedLang && availableLanguages.includes(savedLang)) {
          switchLanguage(savedLang, false);
          return;
        }
        var preferred = inferPreferredLang(availableLanguages);
        if (preferred) switchLanguage(preferred, false);
      } else {
        var savedPref = localStorage.getItem('blog-language');
        if (savedPref !== urlLang) {
          localStorage.setItem('blog-language', urlLang);
        }
      }
    }

    initLanguageSelector();
  }

  function initArticlesListing() {
    function getCurrentUrlInfo() {
      var path = window.location.pathname;
      var match = path.match(/^\/articles(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/)?$/i);
      if (match) {
        return {
          isArticles: true,
          currentLang: match[1] ? match[1].toLowerCase() : null
        };
      }
      return { isArticles: false, currentLang: null };
    }

    var translations = {
      en: {
        home: 'Home',
        articles: 'Articles',
        series: 'Series',
        subtitle: 'Thoughts, tutorials, and explorations',
        prev: '← Prev',
        next: 'Next →',
        noResults: 'No articles match your filter.',
        article: 'article',
        articles_count: 'articles',
        tag: 'Tag:',
        seriesBadgePrefix: 'Series: '
      },
      'zh-tw': {
        home: '首頁',
        articles: '文章',
        series: '系列',
        subtitle: '想法、教學與探索',
        prev: '← 上一頁',
        next: '下一頁 →',
        noResults: '沒有符合篩選條件的文章。',
        article: '篇文章',
        articles_count: '篇文章',
        tag: '標籤：',
        seriesBadgePrefix: '系列：'
      },
      ja: {
        home: 'ホーム',
        articles: '記事',
        series: 'シリーズ',
        subtitle: '考え、チュートリアル、探求',
        prev: '← 前へ',
        next: '次へ →',
        noResults: 'フィルターに一致する記事がありません。',
        article: '件の記事',
        articles_count: '件の記事',
        tag: 'タグ：',
        seriesBadgePrefix: 'シリーズ：'
      },
      ko: {
        home: '홈',
        articles: '글',
        series: '시리즈',
        subtitle: '생각, 튜토리얼, 탐구',
        prev: '← 이전',
        next: '다음 →',
        noResults: '필터와 일치하는 글이 없습니다.',
        article: '개의 글',
        articles_count: '개의 글',
        tag: '태그:',
        seriesBadgePrefix: '시리즈: '
      },
      'zh-cn': {
        home: '首页',
        articles: '文章',
        series: '系列',
        subtitle: '想法、教程与探索',
        prev: '← 上一页',
        next: '下一页 →',
        noResults: '没有符合筛选条件的文章。',
        article: '篇文章',
        articles_count: '篇文章',
        tag: '标签：',
        seriesBadgePrefix: '系列：'
      }
    };

    window.getTranslation = function (key) {
      var info = getCurrentUrlInfo();
      var lang = info.currentLang || 'en';
      var pack = translations[lang] || translations.en;
      return pack[key] || translations.en[key] || key;
    };

    function switchLanguage(lang, savePreference) {
      if (savePreference === undefined) savePreference = true;
      var langCode = lang || 'en';
      document.documentElement.lang = langCode;
      if (savePreference) localStorage.setItem('blog-language', langCode);
      var newUrl = lang ? '/articles/' + lang : '/articles';
      window.location.href = newUrl;
    }

    function applyTranslations() {
      var info = getCurrentUrlInfo();
      var lang = info.currentLang || 'en';
      var t = window.getTranslation;
      var navHome = document.getElementById('nav-link-home');
      var navArticles = document.getElementById('nav-link-articles');
      var navSeries = document.getElementById('nav-link-series');
      var pageTitle = document.getElementById('page-title');
      var pageSubtitle = document.getElementById('page-subtitle');
      if (navHome) navHome.textContent = t('home');
      if (navArticles) {
        navArticles.textContent = t('articles');
        navArticles.href = info.currentLang
          ? '/articles/' + info.currentLang
          : '/articles';
      }
      if (navSeries) {
        navSeries.textContent = t('series');
        navSeries.href = info.currentLang
          ? '/series/' + info.currentLang
          : '/series';
      }
      if (pageTitle) pageTitle.textContent = t('articles');
      if (pageSubtitle) pageSubtitle.textContent = t('subtitle');

      // Translate series badge prefixes
      document.querySelectorAll('[data-i18n="seriesBadgePrefix"]').forEach(function (el) {
        el.textContent = t('seriesBadgePrefix');
      });
      // Update series badge links to include language
      document.querySelectorAll('[data-i18n-series]').forEach(function (el) {
        var slug = el.getAttribute('data-i18n-series');
        el.href = info.currentLang ? '/series/' + slug + '/' + info.currentLang : '/series/' + slug;
      });
    }

    function initLanguageSelector() {
      var info = getCurrentUrlInfo();
      if (!info.isArticles) {
        languageSelector.style.display = 'none';
        return;
      }

      var availableLanguages = getAvailableFromScript();
      if (availableLanguages.length <= 1) {
        languageSelector.style.display = 'none';
        return;
      }

      var currentLang = info.currentLang;
      var currentLangCode = currentLang || 'en';
      var displayText =
        LANGUAGE_NAMES[currentLangCode] ||
        currentLangCode.toUpperCase().split('-')[0];
      if (languageSelectorText) {
        languageSelectorText.textContent = displayText;
      }
      applyTranslations();

      languageDropdown.innerHTML = '';
      availableLanguages.forEach(function (lang) {
        var langCode = lang || 'en';
        var langName = LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
        var langOption = document.createElement('button');
        langOption.className = 'language-option';
        langOption.textContent = langName;
        langOption.setAttribute('data-lang', lang || '');
        langOption.setAttribute('role', 'menuitem');
        if (
          (lang === null && currentLang === null) ||
          lang === currentLang
        ) {
          langOption.classList.add('active');
        }
        langOption.addEventListener('click', function () {
          switchLanguage(lang);
        });
        languageDropdown.appendChild(langOption);
      });

      if (info.currentLang === null) {
        var savedLang = localStorage.getItem('blog-language');
        if (savedLang && availableLanguages.includes(savedLang)) {
          switchLanguage(savedLang, false);
          return;
        }
        var preferred = inferPreferredLang(availableLanguages);
        if (preferred) switchLanguage(preferred, false);
      } else {
        var savedPref = localStorage.getItem('blog-language');
        if (savedPref !== info.currentLang) {
          localStorage.setItem('blog-language', info.currentLang);
        }
      }
    }

    initLanguageSelector();
  }

  function initSeries() {
    var languageNames = LANGUAGE_NAMES;
    var path = window.location.pathname.replace(/\/$/, '');
    var pathAfterSeries = path.replace(/^\/series\/?/, '') || '';
    var parts = pathAfterSeries.split('/').filter(Boolean);
    var knownLangCodes = [
      'en',
      'zh',
      'zh-tw',
      'zh-cn',
      'ja',
      'ko',
      'es',
      'fr',
      'de',
      'it',
      'pt',
      'ru',
      'ar',
      'hi'
    ];
    var currentLang =
      parts.length === 1 && knownLangCodes.includes(parts[0])
        ? parts[0]
        : parts.length === 2 && knownLangCodes.includes(parts[1])
          ? parts[1]
          : null;
    var seriesSlug =
      parts.length >= 1 && !knownLangCodes.includes(parts[0])
        ? parts[0]
        : null;
    var isListPage = seriesSlug == null;

    var translations = {
      en: {
        home: 'Home',
        articles: 'Articles',
        series: 'Series',
        seriesPageTitle: 'Series',
        seriesListSubtitle: 'Article series',
        seriesEmpty: 'No series yet.',
        seriesDetailEmpty: 'No articles in this series.',
        seriesArticleCountOne: '{n} article',
        seriesArticleCountMany: '{n} articles',
        seriesPartLabel: 'Part {n}'
      },
      'zh-tw': {
        home: '首頁',
        articles: '文章',
        series: '系列',
        seriesPageTitle: '系列',
        seriesListSubtitle: '文章系列',
        seriesEmpty: '目前還沒有系列。',
        seriesDetailEmpty: '此系列尚無文章。',
        seriesArticleCountOne: '{n} 篇文章',
        seriesArticleCountMany: '{n} 篇文章',
        seriesPartLabel: '第 {n} 篇'
      },
      'zh-cn': {
        home: '首页',
        articles: '文章',
        series: '系列',
        seriesPageTitle: '系列',
        seriesListSubtitle: '文章系列',
        seriesEmpty: '目前还没有系列。',
        seriesDetailEmpty: '此系列尚无文章。',
        seriesArticleCountOne: '{n} 篇文章',
        seriesArticleCountMany: '{n} 篇文章',
        seriesPartLabel: '第 {n} 篇'
      },
      ja: {
        home: 'ホーム',
        articles: '記事',
        series: 'シリーズ',
        seriesPageTitle: 'シリーズ',
        seriesListSubtitle: '記事シリーズ',
        seriesEmpty: 'シリーズはまだありません。',
        seriesDetailEmpty: 'このシリーズに記事はありません。',
        seriesArticleCountOne: '記事 {n} 件',
        seriesArticleCountMany: '記事 {n} 件',
        seriesPartLabel: '第 {n} 回'
      },
      ko: {
        home: '홈',
        articles: '글',
        series: '시리즈',
        seriesPageTitle: '시리즈',
        seriesListSubtitle: '글 시리즈',
        seriesEmpty: '아직 시리즈가 없습니다.',
        seriesDetailEmpty: '이 시리즈에 글이 없습니다.',
        seriesArticleCountOne: '글 {n}개',
        seriesArticleCountMany: '글 {n}개',
        seriesPartLabel: '{n}편'
      }
    };

    function translationLangCode() {
      if (currentLang) {
        if (translations[currentLang]) return currentLang;
        if (currentLang === 'zh' && translations['zh-tw']) return 'zh-tw';
        return 'en';
      }
      var h = (document.documentElement.lang || 'en').toLowerCase();
      if (translations[h]) return h;
      if (h === 'zh' && translations['zh-tw']) return 'zh-tw';
      var short = h.split('-')[0];
      if (short === 'zh' && translations['zh-tw']) return 'zh-tw';
      return 'en';
    }

    function fmt(str, map) {
      return str.replace(/\{(\w+)\}/g, function (_, k) {
        return map[k] != null ? String(map[k]) : '';
      });
    }

    window.getTranslation = function (key) {
      var lang = translationLangCode();
      var pack = translations[lang] || translations.en;
      return pack[key] != null ? pack[key] : translations.en[key] || key;
    };

    function applySeriesPageTranslations() {
      var t = window.getTranslation;
      var navHome = document.getElementById('nav-link-home');
      var navArticles = document.getElementById('nav-link-articles');
      var navSeries = document.getElementById('nav-link-series');
      if (navHome) navHome.textContent = t('home');
      if (navArticles) {
        navArticles.textContent = t('articles');
        navArticles.href = currentLang ? '/articles/' + currentLang : '/articles';
      }
      if (navSeries) {
        navSeries.textContent = t('series');
        navSeries.href = currentLang ? '/series/' + currentLang : '/series';
      }

      if (isListPage) {
        var pageTitle = document.getElementById('series-page-title');
        var pageSub = document.getElementById('series-page-subtitle');
        if (pageTitle) pageTitle.textContent = t('seriesPageTitle');
        if (pageSub) pageSub.textContent = t('seriesListSubtitle');
        document.title = t('seriesPageTitle');
      }

      document.querySelectorAll('[data-i18n="seriesEmpty"]').forEach(function (el) {
        el.textContent = t('seriesEmpty');
      });
      document.querySelectorAll('[data-i18n="seriesDetailEmpty"]').forEach(function (el) {
        el.textContent = t('seriesDetailEmpty');
      });
      document.querySelectorAll('[data-i18n-article-count]').forEach(function (el) {
        var n = parseInt(el.getAttribute('data-i18n-article-count'), 10);
        if (isNaN(n)) return;
        var key = n === 1 ? 'seriesArticleCountOne' : 'seriesArticleCountMany';
        el.textContent = fmt(t(key), { n: n });
      });
      document.querySelectorAll('[data-i18n-part]').forEach(function (el) {
        var n = el.getAttribute('data-i18n-part');
        if (n == null || n === '') return;
        el.textContent = fmt(t('seriesPartLabel'), { n: n });
      });
    }

    var availableLanguages = getAvailableFromScript();
    if (availableLanguages.length <= 1) {
      languageSelector.style.display = 'none';
    }

    function baseUrl(lang) {
      if (!seriesSlug) return lang ? '/series/' + lang : '/series';
      return lang
        ? '/series/' + seriesSlug + '/' + lang
        : '/series/' + seriesSlug;
    }

    function storageLangForUrl(savedRaw) {
      if (!savedRaw || savedRaw === 'en') return null;
      return savedRaw;
    }

    if (currentLang === null && availableLanguages.length > 1) {
      var rawPref = localStorage.getItem('blog-language');
      // Default English is stored as "en" but the URL has no /en segment (null in available-languages).
      if (rawPref === 'en') {
        /* keep /series or /series/{slug} */
      } else {
        var savedForUrl = storageLangForUrl(rawPref);
        if (savedForUrl && availableLanguages.indexOf(savedForUrl) !== -1) {
          window.location.replace(baseUrl(savedForUrl));
          return;
        }
        var preferred = inferPreferredLang(availableLanguages);
        if (preferred) {
          window.location.replace(baseUrl(preferred));
          return;
        }
      }
    } else if (currentLang != null) {
      var pref = localStorage.getItem('blog-language');
      if (pref !== currentLang) {
        localStorage.setItem('blog-language', currentLang);
      }
    }

    applySeriesPageTranslations();

    if (availableLanguages.length > 1) {
      languageDropdown.innerHTML = '';
      availableLanguages.forEach(function (l) {
        var a = document.createElement('a');
        a.href = baseUrl(l);
        a.className = 'language-option';
        a.textContent = l ? languageNames[l] || l : 'English';
        a.setAttribute('role', 'menuitem');
        a.addEventListener('click', function () {
          localStorage.setItem('blog-language', l != null ? l : 'en');
        });
        if (
          (l === null && currentLang === null) ||
          l === currentLang
        ) {
          a.classList.add('active');
        }
        languageDropdown.appendChild(a);
      });
      var langForLabel = currentLang || 'en';
      if (languageSelectorText) {
        languageSelectorText.textContent =
          languageNames[langForLabel] || langForLabel;
      }

      languageSelectorBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var expanded = languageSelectorBtn.getAttribute('aria-expanded') === 'true';
        languageSelectorBtn.setAttribute('aria-expanded', (!expanded).toString());
        languageDropdown.classList.toggle('show', !expanded);
      });
      bindDocumentClose();
    }
  }

  function initResume() {
    function getCurrentUrlInfo() {
      var path = window.location.pathname;
      var match = path.match(/^\/resume(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/|\.html)?$/i);
      if (match) {
        return {
          isResume: true,
          currentLang: match[1] ? match[1].toLowerCase() : null
        };
      }
      return { isResume: false, currentLang: null };
    }

    function detectAvailableLanguages() {
      var languagesToCheck = ['zh-tw'];
      var availableLanguages = [];

      return fetch('/resume', { method: 'HEAD', cache: 'no-cache' })
        .then(function (defaultResponse) {
          if (defaultResponse.ok) availableLanguages.push(null);
        })
        .catch(function () {})
        .then(function () {
          return Promise.all(
            languagesToCheck.map(function (lang) {
              return fetch('/resume/' + lang, {
                method: 'HEAD',
                cache: 'no-cache'
              })
                .then(function (response) {
                  return { lang: lang, exists: response.ok };
                })
                .catch(function () {
                  return { lang: lang, exists: false };
                });
            })
          );
        })
        .then(function (results) {
          results.forEach(function (r) {
            if (r.exists) availableLanguages.push(r.lang);
          });
          if (availableLanguages.length === 0) return [null];
          return availableLanguages;
        })
        .catch(function () {
          return [null];
        });
    }

    function switchLanguage(lang, savePreference) {
      if (savePreference === undefined) savePreference = true;
      var langCode = lang || 'en';
      document.documentElement.lang = langCode;
      if (savePreference) localStorage.setItem('blog-language', langCode);
      window.location.href = lang ? '/resume/' + lang : '/resume';
    }

    function initLanguageSelector() {
      var info = getCurrentUrlInfo();
      if (!info.isResume) {
        languageSelector.style.display = 'none';
        return;
      }

      return detectAvailableLanguages().then(function (availableLanguages) {
        if (availableLanguages.length <= 1) {
          languageSelector.style.display = 'none';
          return;
        }

        var currentLang = info.currentLang;
        var currentLangCode = currentLang || 'en';
        var displayText =
          LANGUAGE_NAMES[currentLangCode] ||
          currentLangCode.toUpperCase().split('-')[0];
        if (languageSelectorText) {
          languageSelectorText.textContent = displayText;
        }

        languageDropdown.innerHTML = '';
        availableLanguages.forEach(function (lang) {
          var langCode = lang || 'en';
          var langName = LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
          var langOption = document.createElement('button');
          langOption.className = 'language-option';
          langOption.textContent = langName;
          langOption.setAttribute('data-lang', lang || '');
          langOption.setAttribute('role', 'menuitem');
          if (
            (lang === null && currentLang === null) ||
            lang === currentLang
          ) {
            langOption.classList.add('active');
          }
          langOption.addEventListener('click', function () {
            switchLanguage(lang);
          });
          languageDropdown.appendChild(langOption);
        });

        if (currentLang === null) {
          var savedLang = localStorage.getItem('blog-language');
          if (savedLang && availableLanguages.includes(savedLang)) {
            switchLanguage(savedLang, false);
            return;
          }
          var preferred = inferPreferredLang(availableLanguages);
          if (preferred) switchLanguage(preferred, false);
        } else {
          var savedPref = localStorage.getItem('blog-language');
          if (savedPref !== currentLang) {
            localStorage.setItem('blog-language', currentLang);
          }
        }
      });
    }

    void initLanguageSelector();
  }
})();
