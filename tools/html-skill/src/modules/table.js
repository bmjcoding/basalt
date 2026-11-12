/* Basalt HTML script, table module: the scroll hint. A `<p class="table-hint">` right after a `.table-wrap` says "Scroll sideways to see all N columns" while the
   table is wider than its box, and is hidden otherwise (React's TableScrollHint). It is aria-hidden (a screen reader reaches every cell) and never changes while
   the table scrolls, so nothing in the table moves. `data-hint="words with {n}"` on the hint translates the line.
   Source: tools/html-skill/src/modules/table.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  _.step(60, 'tableHint', function () {
    document.querySelectorAll('.table-hint').forEach(function (hint) {
      var frame = hint.previousElementSibling;
      if (hint.__bhHint || !frame || !frame.classList.contains('table-wrap')) return;
      hint.__bhHint = true;
      hint.setAttribute('aria-hidden', 'true');
      var words = hint.getAttribute('data-hint') || 'Scroll sideways to see all {n} columns';
      var measure = function () {
        var table = frame.querySelector('table');
        var n = table ? (table.querySelectorAll('colgroup > col').length || (table.querySelector('tr') || { children: [] }).children.length) : 0;
        var over = frame.scrollWidth > frame.clientWidth;
        hint.textContent = over ? words.replace('{n}', n) : '';
        hint.hidden = !over;
      };
      measure();
      var watch = new ResizeObserver(measure);
      watch.observe(frame);
      var table = frame.querySelector('table');
      if (table) watch.observe(table);
    });
  });
})(window.Basalt);
