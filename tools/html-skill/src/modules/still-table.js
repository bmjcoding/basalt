/* Basalt HTML script, still-table module: React's still table (Table with `columns`, decisions 71 and 82 to 84) for a `table[data-fixed]` with a colgroup.
   - A `th[data-sortable]` becomes the sort control: the header's words go in a button that fills the cell, beside a 16px seat for the up-down caret and the
     direction arrows (the seat is there on every sortable header, so nothing moves when one arrives). A press asks for ascending, then descending, with no
     cleared state; a numeric column (`data-numeric`) asks for descending first, and `data-first-sort="descending"` makes any column do so (a time). The
     direction is `aria-sort` on the th. The rows are reordered by the cell's `data-value`, else its words: numbers as numbers in a numeric column, other text
     in natural order, and a cell that is empty or `data-not-observed` after every other row in both directions. The th fires a bubbling, cancelable
     `sortchange` ({ detail: { index, direction } }) first; a page that sorts its own rows calls preventDefault and the script leaves them alone.
   - `data-pinned="1|2|3"` pins the leading columns: where each sticks, the container's scroll-padding (a focused cell is never covered by the pinned columns,
     finished on focus for a cell half under them) and `data-scrolled` on the .table-wrap while it is scrolled, which draws the divider at the pinned edge.
   - A cut cell can be read (DECISIONS 138 and 139): the ellipsis and the row stay; a cell whose text is cut is a focus stop (`data-cut`, `tabindex="0"`), and on hover (after the
     tooltip's 600ms wait) or focus its whole value opens in place over it on a level-3 plate (`.cell-peek`: the rim, shadow-overlay, radius 8). The plate is aria-hidden, meets WCAG
     1.4.13 (Esc dismisses it without moving the pointer or focus, the pointer can move onto it, it stays until hover and focus have both left) and is never past the viewport. A cell
     that is whole is not a stop and opens nothing. React's Table does the same (cell-peek.ts).
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


  // ---- a cut cell can be read: React's cell-peek.ts ----
  function wirePeek(table) {
    var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [role="checkbox"], [role="button"]';
    var COPY = ['fontFamily', 'fontSize', 'fontWeight', 'fontVariantNumeric', 'letterSpacing', 'wordSpacing', 'lineHeight', 'color'];
    var plate = null, current = null, hovered = null, suppressed = null, wait = 0, leave = 0, frame = 0, closedAt = -1e9, plateHovered = false;
    function box(cell) {
      var only = cell.children.length === 1 && cell.childNodes.length === 1 ? cell.children[0] : null;
      return only && getComputedStyle(only).display === 'block' && getComputedStyle(only).overflowX !== 'visible' ? only : cell;
    }
    function isCut(cell) {
      var b = box(cell), cs = getComputedStyle(b);
      if (b.scrollWidth > b.clientWidth) return true;
      var r = document.createRange();
      r.selectNodeContents(b);
      return r.getBoundingClientRect().width > b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 0.5;
    }
    function mark() {
      frame = 0;
      table.querySelectorAll('tbody > tr:not([data-empty]) > :is(td, th), thead > tr > th:not([data-sortable])').forEach(function (cell) {
        var own = (cell.hasAttribute('tabindex') && !cell.hasAttribute('data-cut')) || cell.querySelector(FOCUSABLE);
        if (own) return;
        var cut = isCut(cell);
        if (cut && !cell.hasAttribute('data-cut')) { cell.setAttribute('data-cut', ''); cell.setAttribute('tabindex', '0'); }
        else if (!cut && cell.hasAttribute('data-cut')) { cell.removeAttribute('data-cut'); cell.removeAttribute('tabindex'); if (current === cell) close(); }
      });
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(mark); }
    function make() {
      if (plate) return plate;
      plate = document.createElement('div');
      plate.className = 'cell-peek';
      plate.setAttribute('aria-hidden', 'true');
      plate.addEventListener('pointerenter', function () { clearTimeout(leave); plateHovered = true; });
      plate.addEventListener('pointerleave', function (e) {
        plateHovered = false;
        if (!(e.relatedTarget instanceof Node && current && current.contains(e.relatedTarget))) hovered = null;
        settle();
      });
      document.body.appendChild(plate);
      return plate;
    }
    // The text starts on the pixel the cell's does; the plate wraps at the container's end edge and is never past the viewport.
    function place() {
      if (!plate || !current) return;
      var r = current.getBoundingClientRect(), f = (current.closest('.table-wrap') || table).getBoundingClientRect();
      var rtl = getComputedStyle(current).direction === 'rtl', view = document.documentElement, g = 'var(--basalt-space-2)';
      var room = 'calc(' + view.clientWidth + 'px - 2 * ' + g + ')';
      plate.style.minWidth = 'min(' + r.width + 'px, ' + room + ')';
      plate.style.minHeight = r.height + 'px';
      plate.style.maxWidth = 'min(max(' + r.width + 'px, ' + (rtl ? r.right - f.left : f.right - r.left) + 'px), ' + room + ')';
      plate.style.left = '0px';
      plate.style.top = '0px';
      var b = plate.getBoundingClientRect();
      plate.style.left = 'max(' + g + ', min(' + (rtl ? r.right - b.width : r.left) + 'px, calc(' + (view.clientWidth - b.width) + 'px - ' + g + ')))';
      plate.style.top = 'max(' + g + ', min(' + r.top + 'px, calc(' + (view.clientHeight - b.height) + 'px - ' + g + ')))';
    }
    function open(cell) {
      clearTimeout(wait); clearTimeout(leave);
      if (suppressed === cell) return;
      var cs = getComputedStyle(cell), p = make();
      p.textContent = cell.textContent.trim();
      COPY.forEach(function (k) { p.style[k] = cs[k]; });
      p.style.paddingInline = 'calc(' + cs.paddingLeft + ' - var(--basalt-size-hairline)) calc(' + cs.paddingRight + ' - var(--basalt-size-hairline))';
      p.style.paddingBlock = '0px';
      p.toggleAttribute('data-focus', document.activeElement === cell && cell.matches(':focus-visible'));
      current = cell;
      place();
      p.setAttribute('data-open', '');
    }
    function close() {
      clearTimeout(wait); clearTimeout(leave);
      if (!current || !plate) { current = null; return; }
      plate.removeAttribute('data-open'); plate.removeAttribute('data-focus');
      current = null; closedAt = performance.now();
    }
    // It stays while the pointer is on the cell or the plate, or focus is on the cell; it goes when all three have left.
    function settle() {
      clearTimeout(leave);
      leave = setTimeout(function () {
        var a = document.activeElement, focused = a && a.hasAttribute && a.hasAttribute('data-cut') && table.contains(a) ? a : null;
        if (focused) { if (current !== focused) open(focused); return; }
        if ((hovered && current === hovered) || plateHovered) return;
        close();
      }, 100);
    }
    function cellOf(t) { var c = t instanceof Element ? t.closest('[data-cut]') : null; return c && table.contains(c) ? c : null; }
    table.addEventListener('pointerover', function (e) {
      var c = cellOf(e.target);
      if (!c || c === hovered) return;
      hovered = c; clearTimeout(wait); clearTimeout(leave);
      if (current === c) return;
      if (current || performance.now() - closedAt < 400) open(c); else wait = setTimeout(function () { open(c); }, 600);
    });
    table.addEventListener('pointerout', function (e) {
      var c = cellOf(e.target);
      if (!c || c !== hovered) return;
      var to = e.relatedTarget;
      if (to instanceof Node && (c.contains(to) || (plate && plate.contains(to)))) return;
      hovered = null; clearTimeout(wait);
      if (suppressed === c) suppressed = null;
      settle();
    });
    table.addEventListener('focusin', function (e) { var c = cellOf(e.target); if (!c) return; if (suppressed && suppressed !== c) suppressed = null; open(c); });
    table.addEventListener('focusout', function (e) { var c = cellOf(e.target); if (!c) return; if (suppressed === c) suppressed = null; settle(); });
    // Esc dismisses the plate and nothing else: the pointer and focus stay, so the cell keeps its ring. Captured and stopped so a dialog around the table stays open.
    window.addEventListener('keydown', function (e) { if (e.key !== 'Escape' || !current) return; suppressed = current; close(); e.stopPropagation(); }, true);
    window.addEventListener('scroll', function () { if (current) place(); }, { capture: true, passive: true });
    // Which cells are cut changes with the table's box, its rows, its text and a user's own spacing (WCAG 1.4.12), which a style sets without touching the table's box.
    new ResizeObserver(schedule).observe(table);
    new MutationObserver(schedule).observe(table, { childList: true, subtree: true, characterData: true });
    var styles = new MutationObserver(schedule);
    styles.observe(document.head, { childList: true, subtree: true, characterData: true });
    styles.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'lang', 'dir'] });
    window.addEventListener('resize', schedule);
    if (document.fonts) document.fonts.ready.then(schedule);
    mark();
  }

  _.step(65, 'stillTable', function () {
    document.querySelectorAll('table[data-fixed]').forEach(function (table) {
      if (table.__bhStill) return;
      table.__bhStill = true;
      wireSort(table);
      wirePinned(table);
      wirePeek(table);
    });
  });
})(window.Basalt);
