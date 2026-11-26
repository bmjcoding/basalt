/* Basalt HTML script, table module: the scroll hint, and the row that opens what it names (`tr[data-linked]`, React's TableRow linked). A `<p class="table-hint">` right after a `.table-wrap` says "Scroll sideways to see all N columns" while the
   table is wider than its box, and is hidden otherwise (React's TableScrollHint). It is aria-hidden (a screen reader reaches every cell) and never changes while
   the table scrolls, so nothing in the table moves. `data-hint="words with {n}"` on the hint translates the line.
   Source: tools/html-skill/src/modules/table.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  // ---- a row that opens what it names (React's TableRow linked) ----
  var OWN = 'a[href], button, input, select, textarea, label, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="checkbox"], [role="switch"], [role="menuitem"], [data-cut]';
  function opener(row) { return row.querySelector('[data-row-opener]') || row.querySelector(':scope > th[scope="row"] :is(a[href], button:not(:disabled))') || row.querySelector('a[href]'); }
  function wireLinked(row) {
    if (row.__bhLinked) return;
    row.__bhLinked = true;
    var first = opener(row);
    if (first) first.setAttribute('data-row-opens', '');
    var from = null;
    row.addEventListener('pointerdown', function (e) { from = { x: e.clientX, y: e.clientY }; });
    // Only a plain primary press is handed over: a modified or middle click, a drag of 6px or more, a live selection, a press on another control or a cut cell stay theirs.
    // The row never opens a window itself: the link's own gestures stay on the link.
    row.addEventListener('click', function (e) {
      var start = from;
      from = null;
      if (e.defaultPrevented || e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var link = opener(row);
      if (!link || link.contains(e.target)) return;
      var own = e.target.closest(OWN);
      if (own && row.contains(own)) return;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 6) return;
      var sel = document.getSelection();
      if (sel && !sel.isCollapsed) return;
      link.click();
    });
  }
  _.step(60, 'linkedRows', function () { document.querySelectorAll('tr[data-linked]').forEach(wireLinked); });

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
