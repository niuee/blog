/**
 * Shared light / dark mode: toggle persistence, scroll preservation, optional hljs link swap.
 */
(function () {
  var darkModeToggle = document.getElementById('dark-mode-toggle');
  var darkModeLabel = document.querySelector('.dark-mode-label');
  var hljsLightTheme = document.getElementById('hljs-light-theme');
  var hljsDarkTheme = document.getElementById('hljs-dark-theme');

  function syncBlogDarkAttr(on) {
    if (on) document.documentElement.setAttribute('data-blog-dark', '');
    else document.documentElement.removeAttribute('data-blog-dark');
  }

  var savedDarkMode = localStorage.getItem('blog-dark-mode') === 'true';
  if (savedDarkMode && darkModeToggle) {
    darkModeToggle.checked = true;
    syncBlogDarkAttr(true);
    if (hljsLightTheme && hljsDarkTheme) {
      hljsLightTheme.disabled = true;
      hljsDarkTheme.disabled = false;
    }
  } else if (!savedDarkMode) {
    syncBlogDarkAttr(false);
  }

  if (!darkModeToggle || !darkModeLabel) return;

  var scrollPosition = 0;
  darkModeLabel.addEventListener('mousedown', function () {
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  });

  darkModeLabel.addEventListener('click', function (e) {
    e.preventDefault();
    darkModeToggle.checked = !darkModeToggle.checked;
    localStorage.setItem('blog-dark-mode', darkModeToggle.checked ? 'true' : 'false');
    syncBlogDarkAttr(darkModeToggle.checked);
    if (hljsLightTheme && hljsDarkTheme) {
      hljsLightTheme.disabled = darkModeToggle.checked;
      hljsDarkTheme.disabled = !darkModeToggle.checked;
    }
    setTimeout(function () {
      window.scrollTo(0, scrollPosition);
      if (document.documentElement.scrollTop !== scrollPosition) {
        document.documentElement.scrollTop = scrollPosition;
      }
      if (document.body.scrollTop !== scrollPosition) {
        document.body.scrollTop = scrollPosition;
      }
    }, 0);
  });

  darkModeToggle.addEventListener('focus', function (e) {
    e.preventDefault();
    darkModeToggle.blur();
  });

  darkModeToggle.addEventListener('change', function (e) {
    localStorage.setItem('blog-dark-mode', e.target.checked ? 'true' : 'false');
    syncBlogDarkAttr(e.target.checked);
    if (hljsLightTheme && hljsDarkTheme) {
      hljsLightTheme.disabled = e.target.checked;
      hljsDarkTheme.disabled = !e.target.checked;
    }
  });
})();
