/* Basalt HTML script, still-table module: React's still table (Table with `columns`, decisions 71 and 82 to 84) for a `table[data-fixed]` with a colgroup.
   - A `th[data-sortable]` becomes the sort control: the header's words go in a button that fills the cell, beside a 16px seat for the up-down caret and the
     direction arrows (the seat is there on every sortable header, so nothing moves when one arrives). A press asks for ascending, then descending, with no
     cleared state; a numeric column (`data-numeric`) asks for descending first, and `data-first-sort="descending"` makes any column do so (a time). The
     direction is `aria-sort` on the th. The rows are reordered by the cell's `data-value`, else its words: numbers as numbers in a numeric column, other text
     in natural order, and a cell that is empty or `data-not-observed` after every other row in both directions. The th fires a bubbling, cancelable
     `sortchange` ({ detail: { index, direction } }) first; a page that sorts its own rows calls preventDefault and the script leaves them alone.
   - `data-pinned="1|2|3"` pins the leading columns: where each sticks, the container's scroll-padding (a focused cell is never covered by the pinned columns,
     finished on focus for a cell half under them) and `data-scrolled` on the .table-wrap while it is scrolled, which draws the divider at the pinned edge.
   Source: tools/html-skill/src/modules/still-table.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  function cellValue(row, index) {
    var cell = row.children[index];
    if (!cell) return null;
    if (cell.hasAttribute('data-not-observed')) return null;
    var v = cell.hasAttribute('data-value') ? cell.getAttribute('data-value') : cell.textContent.trim();
    return v === '' ? null : v;
  }

  function sortRows(table, index, direction, numeric) {
    var body = table.tBodies[0];
    if (!body) return;
    var rows = Array.prototype.filter.call(body.rows, function (r) { return !r.hasAttribute('data-empty'); });
    var empty = Array.prototype.filter.call(body.rows, function (r) { return r.hasAttribute('data-empty'); });
    var sign = direction === 'ascending' ? 1 : -1;
    var collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    var keyed = rows.map(function (row) {
      var v = cellValue(row, index);
      return { row: row, v: v, n: numeric && v !== null ? parseFloat(String(v).replace(/[^\d.eE+-]/g, '')) : NaN };
    });
    keyed.sort(function (a, b) {
      // Not observed (and empty) sorts after every observed value in both directions.
      if (a.v === null || b.v === null) return a.v === b.v ? 0 : a.v === null ? 1 : -1;
      if (numeric && !isNaN(a.n) && !isNaN(b.n)) return sign * (a.n - b.n);
      return sign * collator.compare(a.v, b.v);
    });
    keyed.forEach(function (k) { body.appendChild(k.row); });
    empty.forEach(function (r) { body.appendChild(r); });
  }

  function wireSort(table) {
    var head = table.tHead && table.tHead.rows[0];
    if (!head) return;
    Array.prototype.forEach.call(head.cells, function (th, index) {
      if (!th.hasAttribute('data-sortable') || th.__bhSort) return;
      th.__bhSort = true;
      if (!th.hasAttribute('scope')) th.setAttribute('scope', 'col');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sort';
      var label = document.createElement('span');
      label.className = 'sort-label';
      while (th.firstChild) label.appendChild(th.firstChild);
      var seat = document.createElement('span');
      seat.className = 'sort-seat';
      seat.setAttribute('aria-hidden', 'true');
      seat.innerHTML = _.icon('CaretUpDown') + _.glyph('arrow-up') + _.glyph('arrow-down');
      ['sort-caret', 'sort-up', 'sort-down'].forEach(function (cls, i) { seat.children[i].classList.add(cls); });
      button.appendChild(label);
      button.appendChild(seat);
      th.appendChild(button);
      button.addEventListener('click', function () {
        var now = th.getAttribute('aria-sort');
        var first = th.getAttribute('data-first-sort') || (th.hasAttribute('data-numeric') ? 'descending' : 'ascending');
        var next = !now ? first : now === 'ascending' ? 'descending' : 'ascending';
        var asked = th.dispatchEvent(new CustomEvent('sortchange', { bubbles: true, cancelable: true, detail: { index: index, direction: next } }));
        Array.prototype.forEach.call(head.cells, function (other) { if (other !== th) other.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', next);
        if (asked) sortRows(table, index, next, th.hasAttribute('data-numeric'));
      });
    });
  }

  function wirePinned(table) {
    var pinned = parseInt(table.getAttribute('data-pinned'), 10);
    var frame = table.closest('.table-wrap');
    var head = table.rows[0];
    if (!(pinned > 0) || !frame || !head) return;
    // Where each pinned column sticks and how far the pinned columns reach, from the widths the colgroup gave them.
    var measure = function () {
      var reach = 0;
      for (var i = 1; i <= pinned; i++) {
        reach += head.children[i - 1].getBoundingClientRect().width;
        table.style.setProperty(i === pinned ? '--_pin-end' : '--_pin-' + i, reach + 'px');
      }
      frame.style.scrollPaddingInlineStart = reach + 'px';
    };
    measure();
    new ResizeObserver(measure).observe(table);
    var mark = function () { frame.toggleAttribute('data-scrolled', Math.abs(frame.scrollLeft) > 0); };
    mark();
    frame.addEventListener('scroll', mark, { passive: true });
    // A focused header or action scrolls clear of the pinned columns, not under them. The scroll-padding does it for a cell that is out of view; a cell
    // only half under the pinned columns counts as in view to the browser, so this finishes the job: it measures the real edge of the last pinned cell
    // and scrolls the container by what is covered (and by what hangs past the far edge, the start winning when the cell is wider than what is left).
    frame.addEventListener('focusin', function (event) {
      var cell = event.target.closest && event.target.closest('td, th');
      var row = cell && cell.parentElement;
      if (!cell || !row || row.hasAttribute('data-empty') || Array.prototype.indexOf.call(row.children, cell) < pinned) return;
      var edge = row.children[pinned - 1].getBoundingClientRect();
      var box = cell.getBoundingClientRect();
      var dir = getComputedStyle(frame).direction === 'rtl' ? -1 : 1;
      var port = frame.getBoundingClientRect();
      var covered = dir === 1 ? edge.right - box.left : box.right - edge.left;
      var past = dir === 1 ? box.right - (port.left + frame.clientLeft + frame.clientWidth) : port.left + frame.clientLeft - box.left;
      if (covered > 0) frame.scrollLeft -= dir * covered;
      else if (past > 0) frame.scrollLeft += dir * Math.min(past, -covered);
    });
  }

  _.step(65, 'stillTable', function () {
    document.querySelectorAll('table[data-fixed]').forEach(function (table) {
      if (table.__bhStill) return;
      table.__bhStill = true;
      wireSort(table);
      wirePinned(table);
    });
  });
})(window.Basalt);
