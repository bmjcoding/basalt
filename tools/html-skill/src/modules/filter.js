/* Basalt HTML script, filter module: React's MultiSelect and FilterResult (decisions 82, 83, 86 and 103). A `.filter` holds one `<label><input type=checkbox
   value=...>Words</label>` for each value, and `data-label` names it. The script writes the control around those same inputs and picks the form by the count,
   never the width of the window: up to six values are independent chips (a check on, a plus off, a 100ms crossfade) under a head that reads the label, a
   count ("Any", "2 of 4") and Clear; seven or more, or `data-toolbar`, are a trigger ("Status Any", "Status Failing +1") and a non-modal checklist (the
   popover module's popup, a row for each value, the glide's shared plate, a foot with the count and Clear). The checklist gains a search band from ten values
   (the rows are 40px and the popup caps at 360, so from ten they scroll). The count reserves the width of its widest form, so Clear never moves; Clear is
   always mounted and `aria-disabled` at zero, so keyboard focus can stay on it.
   Keys: Tab reaches each chip or row, Space toggles it. In the checklist the arrows, Home and End move between rows; with a search band, up from the first
   row goes back to it, down from it goes to the first row, typing on a row goes to it, and Esc clears its text before it closes the popup. On touch the
   checklist opens without focusing the band (it would raise the keyboard over the list).
   `data-for="id"` (a table or its .table-wrap) and `data-column="3"` (1-based) filter that table's rows by the column's `data-value`, else its words: with none
   chosen every row shows. Rows get `hidden`, a `tr[data-empty]` shows when none is left, and each `.filter-result[data-for="id"]` says "Showing 3 of 24
   {data-noun}": shown at once, spoken once (a polite, atomic live region) after the text has held still for 400ms (`data-delay`). A `filterchange` event
   ({ detail: { values } }) bubbles from the filter on every change. Basalt.refreshFilter(id) applies the filters again after the page replaced the rows;
   Basalt.filterResult(el, text, delay) sets a result line by hand. Basalt.setFilter(filter, values) puts a set of values back (a page that keeps its
   filters in the address, on popstate): it checks exactly the enabled inputs listed, narrows the table and speaks the result line, with no `filterchange`.
   Source: tools/html-skill/src/modules/filter.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var MAX_CHIPS = 6;
  var SEARCH_FROM = 10;
  var seq = 0;
  var modality = 'mouse';

  function el(tag, cls, attrs, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    for (var k in attrs || {}) node.setAttribute(k, attrs[k]);
    if (html != null) node.innerHTML = html;
    return node;
  }

  /* ---- The result line: shown at once, spoken once ---- */
  /* The drawn words are `text`; what is said, 400ms after the line holds still, is `spoken` when given (the words set apart, "Lots shown (12)", said as a
     sentence), else the words. One live region per line, whatever is drawn. */
  function say(p, text, delay, quiet, spoken) {
    var heard = spoken == null || spoken === '' ? text : spoken;
    if (!p.__bhResult) {
      p.__bhResult = true;
      p.innerHTML = '<span aria-hidden="true"></span><span role="status" aria-live="polite" aria-atomic="true" class="visually-hidden"></span>';
      p.lastChild.textContent = heard;
    }
    p.firstChild.textContent = text;
    clearTimeout(p.__bhTimer);
    var wait = delay == null ? Number(p.getAttribute('data-delay')) || 400 : delay;
    if (quiet) p.lastChild.textContent = heard;
    else p.__bhTimer = setTimeout(function () { p.lastChild.textContent = heard; }, wait);
  }
  /** Basalt.filterResult(el, text, delay, spoken): sets a result line by hand; `spoken` is what is said in place of `text`. */
  B.filterResult = function (p, text, delay, spoken) { say(p, text, delay, false, spoken); };

  /* ---- The table a filter narrows ---- */
  function refresh(id, quiet) {
    var node = document.getElementById(id);
    var table = node && (node.tagName === 'TABLE' ? node : node.querySelector('table'));
    if (!table || !table.tBodies[0]) return;
    var filters = Array.prototype.filter.call(document.querySelectorAll('.filter[data-for="' + id + '"]'), function (f) { return f.__bhFilter; });
    var rows = Array.prototype.filter.call(table.tBodies[0].rows, function (r) { return !r.hasAttribute('data-empty'); });
    var shown = 0;
    rows.forEach(function (row) {
      var ok = filters.every(function (f) { return f.__bhFilter.pass(row); });
      row.hidden = !ok;
      if (ok) shown++;
    });
    table.querySelectorAll('tr[data-empty]').forEach(function (r) { r.hidden = shown !== 0; });
    document.querySelectorAll('.filter-result[data-for="' + id + '"]').forEach(function (p) {
      say(p, 'Showing ' + shown + ' of ' + rows.length + ' ' + (p.getAttribute('data-noun') || 'rows'), null, quiet);
    });
  }
  B.refreshFilter = refresh;

  function rowsOf(group) {
    return Array.prototype.slice.call(group.querySelectorAll('input:not(:disabled)')).filter(function (i) { return !i.closest('[hidden]'); });
  }

  function wire(root) {
    var labels = Array.prototype.slice.call(root.querySelectorAll('label'));
    var opts = labels.map(function (l) {
      var input = l.querySelector('input[type="checkbox"]');
      return { input: input, label: l.textContent.trim() };
    }).filter(function (o) { return o.input; });
    if (!opts.length) return;
    var n = ++seq;
    var label = root.getAttribute('data-label') || 'Filter';
    var noun = label.toLowerCase();
    var id = { label: 'bh-filter-label-' + n, count: 'bh-filter-count-' + n, pop: 'bh-filter-pop-' + n, rows: 'bh-filter-rows-' + n };
    var popup = root.hasAttribute('data-toolbar') || opts.length > MAX_CHIPS;
    var chosen = function () { return opts.filter(function (o) { return o.input.checked; }); };
    var clear = el('button', 'btn filter-clear', { type: 'button', 'data-variant': 'ghost', 'data-size': 'sm' }, 'Clear');
    var shell = { head: null, count: null, value: null, trigger: null, foot: null };
    root.textContent = '';

    if (!popup) {
      // Up to six values: independent chips. The head's count holds the width of its widest form ("Any" or "N of N"), so Clear holds still.
      var head = el('div', 'filter-head');
      head.appendChild(el('span', 'filter-label', { id: id.label }, null)).textContent = label;
      var count = el('span', 'filter-count', { id: id.count, 'data-reserved': '', 'data-any': 'Any', 'data-widest': opts.length + ' of ' + opts.length });
      shell.value = count.appendChild(el('span', 'filter-count-value'));
      // Label, Clear, count (DECISIONS 336): Clear never moves, and the count's spare room is the row's open end.
      head.appendChild(clear);
      head.appendChild(count);
      var chips = el('div', 'filter-chips', { role: 'group', 'aria-labelledby': id.label, 'aria-describedby': id.count });
      opts.forEach(function (o) {
        var chip = el('label', 'chip');
        o.input.className = 'chip-input';
        chip.appendChild(o.input);
        // One 16px seat on every chip, both glyphs stacked in it: the plus and the check cross-fade, so turning a chip on moves nothing.
        var seat = chip.appendChild(el('span', 'chip-seat', { 'aria-hidden': 'true' }, _.glyph('plus') + _.glyph('check')));
        seat.children[0].classList.add('chip-plus');
        seat.children[1].classList.add('chip-check');
        chip.appendChild(el('span', 'chip-label')).textContent = o.label;
        chips.appendChild(chip);
      });
      root.appendChild(head);
      root.appendChild(chips);
    } else {
      root.setAttribute('data-popup', '');
      var searchable = opts.length >= SEARCH_FROM;
      shell.trigger = el('button', 'btn filter-trigger', { type: 'button', popovertarget: id.pop }, '<span class="filter-trigger-label-wrap"><span class="filter-trigger-label"></span> <span class="filter-trigger-value"></span></span>' + '%glyph-svg:chevron-down%');
      shell.trigger.querySelector('.filter-trigger-label').textContent = label;
      shell.value = shell.trigger.querySelector('.filter-trigger-value');
      if (root.hasAttribute('data-toolbar')) {
        // In a toolbar the value's cell holds its widest value ("Any", or the longest label with the largest "+N"), unseen, so choosing moves nothing after it.
        var seat = shell.value;
        shell.value = seat.appendChild(el('span', 'filter-trigger-now'));
        ['Any'].concat(opts.map(function (o) { return o.label + (opts.length > 1 ? ' +' + (opts.length - 1) : ''); })).forEach(function (t) { seat.appendChild(el('span', 'filter-trigger-sizer', { 'aria-hidden': 'true' })).textContent = t; });
      }
      var pop = el('div', 'panel float filter-popup', { popover: '', id: id.pop, role: 'dialog', 'aria-labelledby': id.label, tabindex: '-1' });
      var plate = el('span', 'plate', { 'aria-hidden': 'true' });
      pop.appendChild(plate);
      pop.appendChild(el('span', 'visually-hidden', { id: id.label })).textContent = label;
      var band = null;
      if (searchable) {
        var strip = el('div', 'filter-band', null, '%glyph-svg:search%');
        band = strip.appendChild(el('input', 'filter-band-input', { type: 'text', role: 'searchbox', 'aria-label': 'Search ' + noun, 'aria-controls': id.rows, placeholder: 'Search ' + noun, autocomplete: 'off', autocorrect: 'off', spellcheck: 'false' }));
        pop.appendChild(strip);
      }
      var group = el('div', 'filter-rows', { id: id.rows, role: 'group', 'aria-labelledby': id.label, 'aria-describedby': id.count });
      opts.forEach(function (o) {
        var row = el('label', 'filter-row');
        row.appendChild(o.input);
        row.appendChild(el('span', 'filter-row-label')).textContent = o.label;
        o.row = row;
        group.appendChild(row);
      });
      var none = el('p', 'filter-none', { hidden: '' });
      none.textContent = 'No ' + noun + ' matches.';
      group.appendChild(none);
      pop.appendChild(group);
      shell.count = el('span', 'filter-count', { id: id.count });
      var foot = el('div', 'filter-foot');
      clear.setAttribute('data-edge', 'end');
      foot.appendChild(shell.count);
      foot.appendChild(clear);
      pop.appendChild(foot);
      root.appendChild(shell.trigger);
      root.appendChild(pop);

      // The lit row: the one under the pointer or holding focus, one at a time.
      var lit = null;
      var light = function (row) {
        if (lit === row) return;
        if (lit) lit.removeAttribute('data-highlighted');
        lit = row;
        if (row) row.setAttribute('data-highlighted', '');
      };
      group.addEventListener('pointermove', function (e) { var r = e.target.closest('.filter-row'); if (r) light(r); });
      group.addEventListener('pointerout', function (e) { var r = e.target.closest('.filter-row'); if (r && r === lit && !r.contains(e.relatedTarget)) light(null); });
      group.addEventListener('focusin', function (e) { var r = e.target.closest('.filter-row'); if (r) light(r); });
      group.addEventListener('focusout', function (e) { var r = e.target.closest('.filter-row'); if (r && r === lit) light(null); });

      // Arrows move between rows (one tab stop for each); with a search band, up from the first row goes back to it, and typing on a row goes to it.
      group.addEventListener('keydown', function (e) {
        if (band && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) { band.focus(); return; }
        var step = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity }[e.key];
        if (step === undefined) return;
        var all = rowsOf(group);
        if (!all.length) return;
        e.preventDefault();
        var at = all.indexOf(document.activeElement);
        if (band && step === -1 && at <= 0) { band.focus(); return; }
        var to = isFinite(step) ? Math.min(all.length - 1, Math.max(0, at + step)) : step < 0 ? 0 : all.length - 1;
        all[to].focus();
      });
      var search = function () {
        var needle = band ? band.value.trim().toLowerCase() : '';
        var any = false;
        opts.forEach(function (o) { var hide = needle !== '' && o.label.toLowerCase().indexOf(needle) < 0; o.row.hidden = hide; if (!hide) any = true; });
        none.hidden = any;
      };
      if (band) {
        band.addEventListener('input', search);
        band.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowDown') {
            var first = rowsOf(group)[0];
            if (first) { e.preventDefault(); first.focus(); }
          } else if (e.key === 'Escape' && band.value) {
            // Esc clears the text first, and only the next one closes.
            e.preventDefault();
            e.stopPropagation();
            band.value = '';
            search();
          }
        });
      }
      pop.__bhFilter = { plate: plate, band: band, reset: function () { if (band) { band.value = ''; search(); } light(null); } };
    }

    var column = Number(root.getAttribute('data-column')) - 1;
    var target = root.getAttribute('data-for');
    root.__bhFilter = {
      pass: function (row) {
        var on = chosen();
        if (!on.length || !(column >= 0)) return true;
        var cell = row.children[column];
        var v = cell ? (cell.hasAttribute('data-value') ? cell.getAttribute('data-value') : cell.textContent.trim()).toLowerCase() : '';
        return on.some(function (o) { return o.input.value.toLowerCase() === v; });
      }
    };
    var update = function (user, spoken) {
      var on = chosen();
      var text = on.length === 0 ? 'Any' : on.length + ' of ' + opts.length;
      if (!popup) shell.value.textContent = text;
      else {
        shell.count.textContent = text;
        shell.value.textContent = on.length === 0 ? 'Any' : on.length === 1 ? on[0].label : on[0].label + ' +' + (on.length - 1);
        shell.trigger.toggleAttribute('data-active', on.length > 0);
      }
      // Not `disabled`: a disabled button drops keyboard focus. At zero it is aria-disabled, activation is suppressed, and focus stays.
      if (on.length === 0) clear.setAttribute('aria-disabled', 'true'); else clear.removeAttribute('aria-disabled');
      if (target) refresh(target, !user && !spoken);
      if (user) root.dispatchEvent(new CustomEvent('filterchange', { bubbles: true, detail: { values: on.map(function (o) { return o.input.value; }) } }));
    };
    root.addEventListener('change', function (e) { if (e.target.matches && e.target.matches('input[type="checkbox"]')) update(true); });
    clear.addEventListener('click', function () {
      if (clear.getAttribute('aria-disabled') === 'true') return;
      opts.forEach(function (o) { o.input.checked = false; });
      update(true);
    });
    root.__bhFilter.set = function (values) {
      opts.forEach(function (o) { if (!o.input.disabled) o.input.checked = values.indexOf(o.input.value) >= 0; });
      update(false, true);
      return chosen().filter(function (o) { return !o.input.disabled; }).map(function (o) { return o.input.value; });
    };
    update(false);
  }

  /** Basalt.setFilter(filter, values): `filter` is the .filter or its id, `values` an array. Checks exactly the enabled inputs whose value is listed (an
      unknown or disabled value is ignored), redraws the control, narrows its table and says the result line (shown at once, spoken once after its delay).
      No `filterchange`: a page putting its own state back hears no echo. Returns the values it set, in the options' order; [] for no wired filter. */
  B.setFilter = function (filter, values) {
    var root = typeof filter === 'string' ? document.getElementById(filter) : filter;
    if (!root || !root.__bhFilter || !root.__bhFilter.set) return [];
    return root.__bhFilter.set(Array.prototype.map.call(values || [], String));
  };

  _.step(75, 'filter', function () {
    document.querySelectorAll('.filter-result').forEach(function (p) { if (!p.__bhResult) say(p, p.textContent, null, false, p.getAttribute('data-spoken')); });
    document.querySelectorAll('.filter').forEach(function (root) { if (!root.__bhFilter) wire(root); });
    var done = {};
    document.querySelectorAll('.filter[data-for]').forEach(function (f) { var t = f.getAttribute('data-for'); if (!done[t]) { done[t] = 1; refresh(t, true); } });
  });

  // After the popover module's own toggle listener (step 120), so a touch open can take the focus it gave the search band back.
  _.step(130, 'filterPopup', function () {
    if (document.documentElement.__bhFilterWired) return;
    document.documentElement.__bhFilterWired = true;
    document.addEventListener('pointerdown', function (e) { modality = e.pointerType; }, true);
    document.addEventListener('keydown', function () { modality = 'keyboard'; }, true);
    document.addEventListener('toggle', function (e) {
      var pop = e.target;
      var f = pop.__bhFilter;
      if (!f || !pop.matches || !pop.matches('.filter-popup')) return;
      if (e.newState === 'open') {
        // The checklist is the popup's port; a popup with none gets one (cimip-gaps-3 t7).
        var rows = pop.querySelector('.filter-rows');
        var host = pop;
        if (rows) { if (!rows.__bhFade) rows.__bhFade = _.scrollFade(rows, { axis: 'block' }); } else host = _.port(pop, 'filter-popup-scroll', { axis: 'block' });
        // The glide's host is what holds the plate: the popup, or its port when the plate moved into one.
        pop.__unglide = _.glide(f.plate.parentElement === host ? host : pop, f.plate, { active: '[data-highlighted]', attr: 'data-highlighted' });
        // The search band takes focus on opening, except on touch, where it would raise the keyboard over the list.
        if (f.band && modality === 'touch') pop.focus({ preventScroll: true });
      } else {
        if (pop.__unglide) { pop.__unglide(); pop.__unglide = null; }
        f.reset();
      }
    }, true);
  });
})(window.Basalt);
