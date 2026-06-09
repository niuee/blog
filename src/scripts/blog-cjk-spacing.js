// Add letter-spacing to CJK character runs without affecting Latin text.
// Each CJK character is a word boundary for the browser, so we wrap
// contiguous CJK runs in a <span class="cjk-spaced"> and let CSS handle it.
(function () {
  var CJK_LANG = /^(zh|ja|ko)/i;
  if (!CJK_LANG.test(document.documentElement.lang)) return;

  // CJK Unified Ideographs + Extension A/B, CJK Compatibility Ideographs,
  // Hiragana, Katakana, Hangul Syllables, Bopomofo, fullwidth punctuation
  var CJK_RE =
    /([\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u3100-\u312F\uFF00-\uFFEF]+)/g;

  function walk(node) {
    if (node.nodeType === 3) {
      // Text node
      var text = node.nodeValue;
      if (!CJK_RE.test(text)) return;
      CJK_RE.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var lastIndex = 0;
      var match;
      while ((match = CJK_RE.exec(text)) !== null) {
        // Text before CJK run
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        var span = document.createElement('span');
        span.className = 'cjk-spaced';
        span.textContent = match[0];
        frag.appendChild(span);
        lastIndex = CJK_RE.lastIndex;
      }
      // Remaining text
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === 1) {
      // Element — skip <script>, <style>, <code>, <pre>, <kbd>
      var tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE' || tag === 'KBD') return;
      // Skip already-wrapped spans
      if (tag === 'SPAN' && node.classList.contains('cjk-spaced')) return;

      // Snapshot child nodes; walking mutates the live list
      var children = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < children.length; i++) {
        walk(children[i]);
      }
    }
  }

  function apply() {
    walk(document.body);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
