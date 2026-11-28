/* Basalt HTML script, pane module: a pane taller than its height is a tab stop, so the keys can scroll it; one that fits is not; and while the pane is its
   own scroller (beside the page) it carries data-scroller, so a script inside can find what scrolls it (React's PaneLayout does the same). Source: tools/html-skill/src/modules/pane.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  _.step(56, 'wirePanes', function () {
    if (typeof ResizeObserver === 'undefined') return;
    document.querySelectorAll('.pane').forEach(function (pane) {
      // The host (cimip-gaps-3 t7): it takes the pane's place in the grid and its stickiness and ring; the pane stays the port and fades.
      if (!pane.parentElement.classList.contains('pane-host')) { var host = document.createElement('div'); host.className = 'pane-host'; pane.parentNode.insertBefore(host, pane); host.appendChild(pane); }
      _.scrollFade(pane, { axis: 'block', ring: 4 });
      var check = function () { var own = getComputedStyle(pane).overflowY !== 'visible'; pane.toggleAttribute('data-scroller', own); if (own && pane.scrollHeight > pane.clientHeight + 1) pane.tabIndex = 0; else pane.removeAttribute('tabindex'); };
      var watch = new ResizeObserver(check);
      // The pane and each child are watched for size; a child added or removed later (content that arrives after the page) is watched
      // too, and the pane is checked again, so content that makes it overflow makes it a tab stop.
      var observe = function () { watch.disconnect(); watch.observe(pane); Array.prototype.forEach.call(pane.children, function (child) { watch.observe(child); }); };
      observe();
      new MutationObserver(function () { observe(); check(); }).observe(pane, { childList: true });
      check();
    });
  });
})(window.Basalt);
