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
    function getCurrentUrlInfo() {
      var path = window.location.pathname;
      var match = path.match(/^\/articles\/([^\/]+)(?:\/([a-z]{2}(?:-[a-z]{2})?))?(?:\/|\.html)?$/i);
      if (match) {
        return {
          postName: match[1],
          currentLang: match[2] ? match[2].toLowerCase() : null
        };
      }
      return { postName: null, currentLang: null };
    }

    function switchLanguage(lang, savePreference) {
      if (savePreference === undefined) savePreference = true;
      var info = getCurrentUrlInfo();
      if (!info.postName) return;
      var langCode = lang || 'en';
      document.documentElement.lang = langCode;
      if (savePreference) localStorage.setItem('blog-language', langCode);
      var newUrl = lang
        ? '/articles/' + info.postName + '/' + lang
        : '/articles/' + info.postName;
      window.location.href = newUrl;
    }

    function initLanguageSelector() {
      var info = getCurrentUrlInfo();
      if (!info.postName) {
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
        tag: 'Tag:'
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
        tag: '標籤：'
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
        tag: 'タグ：'
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
        tag: '태그:'
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
        tag: '标签：'
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

    var navArticlesEl = document.getElementById('nav-link-articles');
    var navSeriesEl = document.getElementById('nav-link-series');
    if (navArticlesEl) {
      navArticlesEl.href = currentLang
        ? '/articles/' + currentLang
        : '/articles';
    }
    if (navSeriesEl) {
      navSeriesEl.href = currentLang ? '/series/' + currentLang : '/series';
    }

    function baseUrl(lang) {
      if (!seriesSlug) return lang ? '/series/' + lang : '/series';
      return lang
        ? '/series/' + seriesSlug + '/' + lang
        : '/series/' + seriesSlug;
    }

    var langs = getAvailableFromScript();
    langs.forEach(function (l) {
      var a = document.createElement('a');
      a.href = baseUrl(l);
      a.className = 'language-option';
      a.textContent = l ? languageNames[l] || l : 'English';
      a.setAttribute('role', 'menuitem');
      languageDropdown.appendChild(a);
    });
    if (languageSelectorText) {
      languageSelectorText.textContent = currentLang
        ? languageNames[currentLang] || currentLang
        : 'English';
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
