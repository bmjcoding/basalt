/* Basalt HTML script, pane module: a pane taller than its height is a tab stop, so the keys can scroll it; one that fits is not (React's PaneLayout does the
   same). Source: tools/html-skill/src/modules/pane.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  _.step(56, 'wirePanes', function () {
    if (typeof ResizeObserver === 'undefined') return;
    document.querySelectorAll('.pane').forEach(function (pane) {
      var check = function () { if (pane.scrollHeight > pane.clientHeight + 1) pane.tabIndex = 0; else pane.removeAttribute('tabindex'); };
      var watch = new ResizeObserver(check);
      watch.observe(pane);
      Array.prototype.forEach.call(pane.children, function (child) { watch.observe(child); });
    });
  });
})(window.Basalt);
