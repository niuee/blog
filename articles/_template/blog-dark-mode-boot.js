/**
 * Run synchronously immediately after #dark-mode-toggle is in the DOM.
 * data-blog-dark on <html> should already be set from a <head> script before
 * /dark-mode.css so the first paint uses dark variables (avoids white flash).
 */
(function () {
  try {
    var enabled = localStorage.getItem('blog-dark-mode') === 'true';
    if (!enabled) {
      document.documentElement.removeAttribute('data-blog-dark');
      return;
    }
    document.documentElement.setAttribute('data-blog-dark', '');
    var toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = true;
    var light = document.getElementById('hljs-light-theme');
    var dark = document.getElementById('hljs-dark-theme');
    if (light && dark) {
      light.disabled = true;
      dark.disabled = false;
    }
  } catch (e) {
    /* ignore */
  }
})();
