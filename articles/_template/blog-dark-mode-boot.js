/**
 * Run synchronously immediately after #dark-mode-toggle is in the DOM
 * to reduce flash before CSS :has(:checked) applies.
 */
(function () {
  try {
    if (localStorage.getItem('blog-dark-mode') !== 'true') return;
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
