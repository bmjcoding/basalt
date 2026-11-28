/* Basalt HTML script, command-list module: the command list set in the page, with an optional preview pane (React's CommandList). It extends the palette: the items,
   the rows, the filter and what choosing one does are the palette's. Basalt.commandList(host, { groups, label?, noun?, placeholder?, detail?(item), onSelect?(item) }),
   or an element with class command-list and its items as JSON in a script[data-commands] (and, for a preview, a template[data-detail="ID"] for each command). */
(function (B) {
  'use strict';
  var _ = B._;
  var P = _.palette;
  var esc = _.esc;
  var kbdGroup = _.kbd.kbdGroup;
  var seq = 0;
  var keyBound = false;

  var DRAW = ' viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var RIGHT = '<svg class="icon row-chevron"' + DRAW + '><path d="%glyph:chevron-right%"/></svg>';
  var LEFT = '<svg class="icon"' + DRAW + '><path d="%glyph:chevron-left%"/></svg>';

  /** The length a token holds, read where it is used: a container query can't, so the threshold reads the same three. */
  function tokenPx(el, name, fallback) {
    var v = parseFloat(getComputedStyle(el).getPropertyValue(name));
    return isFinite(v) ? v : fallback;
  }

  function build(host, o) {
    if (host.__bhCommandList) return host.__bhCommandList;
    var id = 'bh-cl-' + (++seq);
    var label = o.label || host.getAttribute('data-label') || 'Commands';
    var noun = o.noun || host.getAttribute('data-noun') || 'command';
    // The page's own count line, and its own empty block (a <template data-empty> inside the list, cloned, never HTML from data).
    var count = o.count != null ? o.count : host.getAttribute('data-count');
    var template = o.empty || host.querySelector('template[data-empty]');
    var placeholder = o.placeholder || host.getAttribute('data-placeholder') || 'Search commands';
    var groups = o.groups || [];
    groups.forEach(function (g, gi) { (g.items || []).forEach(function (it, n) { if (it.id == null) it.id = 'g' + gi + 'c' + n; }); });
    var detail = typeof o.detail === 'function' ? o.detail : host.querySelector('template[data-detail]') ? function (item) {
      var t = host.querySelector('template[data-detail="' + String(item.id).replace(/["\\]/g, '\\$&') + '"]');
      return t ? t.content.cloneNode(true) : '';
    } : null;

    var r = P.rows(groups, id, '', detail ? RIGHT : '');
    var flat = r.flat;
    var total = flat.length;
    host.insertAdjacentHTML('beforeend',
      '<div class="command-split">' +
        '<div class="panel command-page" tabindex="-1" role="region" aria-label="' + esc(label) + '">' +
          '<div class="input-row">' + _.searchSvg +
            '<input type="text" role="combobox" aria-expanded="true" aria-controls="' + id + '-list" aria-autocomplete="list" aria-label="' + esc(placeholder) +
            '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(placeholder) + '">' +
            '<span class="command-slot" aria-hidden="true"></span>' +
          '</div>' +
          '<div class="command-body">' +
            '<div class="command-results" id="' + id + '-list" role="listbox" aria-label="' + esc(label) + '" tabindex="-1" data-idle><div class="command-sizer">' + r.html + '</div></div>' +
            '<div class="command-none" hidden></div>' +
          '</div>' +
          '<div hidden>' + r.words + '</div>' +
          '<span class="visually-hidden" role="status" data-reason></span>' +
          '<div class="command-foot">' +
            '<p class="command-count"><span aria-hidden="true"></span><span role="status" aria-live="polite" aria-atomic="true" class="visually-hidden"></span></p>' +
            '<span class="command-hints" data-kbd-hint aria-hidden="true"><span>' + kbdGroup(['↑', '↓']) + ' Move</span><span>' + kbdGroup(['↵']) + (detail ? ' Open' : ' Run') + '</span>' +
              (detail ? '' : '<span>' + kbdGroup(['Esc']) + ' Clear</span>') + '</span>' +
          '</div>' +
        '</div>' +
        (detail ? '<div class="panel command-pane" role="region"><div class="command-back"><button type="button" class="btn" data-variant="ghost" data-size="sm" aria-label="Back to ' + esc(label) + '">' + LEFT + esc(label) +
          '</button></div><div class="command-pane-body"></div></div>' : '') +
      '</div>');
    var split = host.lastElementChild;
    split.setAttribute('data-view', 'list');
    var page = split.firstElementChild;
    var pane = detail ? split.lastElementChild : null;
    var input = page.querySelector('input');
    var results = page.querySelector('.command-results');
    var sizer = results.firstElementChild;
    var body = page.querySelector('.command-body');
    var none = page.querySelector('.command-none');
    var shownText = page.querySelector('.command-count').firstChild;
    var spokenText = page.querySelector('.command-count').lastChild;
    var reason = page.querySelector('[data-reason]');
    var rows = Array.prototype.slice.call(results.querySelectorAll('.row'));
    var groupEls = Array.prototype.slice.call(sizer.children);
    var plate = document.createElement('span');
    plate.className = 'plate';
    plate.setAttribute('aria-hidden', 'true');
    results.insertBefore(plate, sizer);
    if (detail) host.setAttribute('data-pane', '');

    var vis = rows.map(function (_row, i) { return i; });
    var active = -1;
    var query = '';
    var focused = false;
    var hovered = false;
    var mode = 'push';
    var view = 'list';
    var lastInput = 'key';
    var savedScroll = 0;
    var paneFor = NaN;
    var paneBody = pane && pane.querySelector('.command-pane-body');
    // The results fade at each edge that hides rows; the pane's body scrolls on both axes and fades, and while it overflows and holds nothing focusable it
    // is a keyboard stop named by the pane (cimip-gaps-3 t7).
    results.__bhFade = _.scrollFade(results, { axis: 'block' });
    if (paneBody) { _.scrollFade(paneBody, { axis: 'both', ring: 4 }); _.scrollStop(paneBody, function () { return pane.getAttribute('aria-labelledby'); }); }
    var spoken = shownText.textContent = spokenText.textContent = P.countLine(total, total, noun, false, count);
    var timer;

    /** The count is shown at once and spoken once, after it has held still for 400ms. */
    function say(text) {
      shownText.textContent = text;
      clearTimeout(timer);
      if (text !== spoken) timer = setTimeout(function () { spokenText.textContent = spoken = text; }, 400);
    }

    /** Not in use (the field has no focus, the pointer is off the list, and there is no split) the list shows no plate and no lit row. */
    function syncIdle() { results.toggleAttribute('data-idle', !(detail && mode === 'split') && !focused && !hovered); }

    /** Measured while the list is unfiltered: its height (the list's, beside a preview) and the panel's, kept as page under the panel on the open page
        so what follows never moves while the panel hugs its matches (DECISIONS 336). */
    function hold() {
      if (query) return;
      var cs = getComputedStyle(results);
      var pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var list = sizer.getBoundingClientRect().height + pad;
      body.style.setProperty('--held', list + 'px');
      if (detail) return;
      // The page keeps the taller of the panel's two heights, the unfiltered list's and "Nothing matches"', so a short list filtered to nothing never
      // moves what follows (the code review's finding 6): the sentence is measured unseen, out of the flow.
      var wasHidden = none.hidden;
      none.hidden = false;
      if (wasHidden) fillNone('?');
      none.setAttribute('data-measure', '');
      var empty = pad + none.getBoundingClientRect().height;
      none.removeAttribute('data-measure');
      none.hidden = wasHidden;
      host.style.setProperty('--held-page', page.getBoundingClientRect().height - list + Math.max(list, empty) + 'px');
    }

    /** The pane is a region named by its first heading, which also takes focus when it is pushed. */
    function namePane() {
      var item = flat[active];
      var heading = pane.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) {
        heading.id = heading.id || id + '-h';
        heading.tabIndex = -1;
        pane.setAttribute('aria-labelledby', heading.id);
        pane.removeAttribute('aria-label');
      } else {
        pane.removeAttribute('aria-labelledby');
        pane.setAttribute('aria-label', item ? item.label : label);
      }
      return heading;
    }

    function renderPane() {
      var item = flat[active];
      if (item === paneFor) return;
      paneFor = item;
      paneBody.textContent = '';
      var out = item && item.unavailable == null ? detail(item) : null;
      if (!item) paneBody.innerHTML = '<p class="command-pane-empty">Nothing to show.</p>';
      // A row that cannot run has no pane: its reason is the pane's empty form, and ↵ has no button to press.
      else if (item.unavailable != null) { var p = document.createElement('p'); p.className = 'command-pane-empty'; p.textContent = String(item.unavailable); paneBody.appendChild(p); }
      else if (typeof out === 'string') paneBody.innerHTML = out;
      else if (out) paneBody.appendChild(out);
      namePane();
    }

    function setActive(i, scroll) {
      var was = rows[active];
      if (was) { was.setAttribute('aria-selected', 'false'); was.removeAttribute('data-active'); }
      active = i;
      var row = rows[i];
      if (!row) input.removeAttribute('aria-activedescendant');
      else {
        row.setAttribute('aria-selected', 'true');
        row.setAttribute('data-active', '');
        input.setAttribute('aria-activedescendant', row.id);
        // Focus stays in the field: the row the keys are on is brought clear of the fade and kept there (cimip-gaps-3 t7).
        if (scroll !== false) results.__bhFade.keep(row);
      }
      if (detail) renderPane();
    }

    /** Filters, then ranks: title matches first, then keyword and description matches, each keeping its order, and a group sits by its best row (an empty query restores the order given). */
    function filter() {
      query = input.value;
      var q = query.trim();
      var tiers = flat.map(function (item) { return P.tier(item, q); });
      rows.forEach(function (row, i) { row.hidden = tiers[i] < 0; });
      var rank = function (i) { return tiers[i] < 0 ? 2 : tiers[i]; };
      var order = groupEls.map(function (g, pos) {
        var members = Array.prototype.slice.call(g.querySelectorAll('.row')).sort(function (a, b) { var i = Number(a.dataset.index); var j = Number(b.dataset.index); return rank(i) - rank(j) || i - j; });
        members.forEach(function (row) { g.appendChild(row); });
        g.hidden = !members.length || tiers[Number(members[0].dataset.index)] < 0;
        return { g: g, pos: pos, best: members.length ? rank(Number(members[0].dataset.index)) : 2 };
      }).sort(function (a, b) { return a.best - b.best || a.pos - b.pos; });
      order.forEach(function (x) { sizer.appendChild(x.g); });
      vis = [];
      order.forEach(function (x) { Array.prototype.forEach.call(x.g.querySelectorAll('.row'), function (row) { if (!row.hidden) vis.push(Number(row.dataset.index)); }); });
      none.hidden = vis.length > 0;
      if (!vis.length) fillNone(q);
      results.scrollTop = 0;
      say(P.countLine(vis.length, total, noun, q !== '', count));
      setActive(vis.length ? vis[0] : -1, false);
    }

    function setView(next) {
      view = next;
      split.setAttribute('data-view', next);
      if (next === 'detail') {
        var heading = namePane();
        if (!heading) { pane.tabIndex = -1; heading = pane; }
        heading.focus({ preventScroll: true });
      } else {
        results.scrollTop = savedScroll;
        // Back returns focus to the field (a key, or a pointer) or to the list's region (a tap, so a phone's keyboard doesn't spring up).
        var touched = lastInput === 'touch' && document.documentElement.getAttribute('data-keyboard') !== 'hardware';
        (touched ? page : input).focus({ preventScroll: true });
      }
    }

    /** The empty block for the words typed (Basalt's sentence and Clear search, or the page's template). */
    function fillNone(q) { P.fillNone(none, q, template, function () { input.value = ''; filter(); input.focus(); }); }

    function choose(i) {
      var item = flat[i];
      if (!item) return;
      // A row that cannot run opens nothing and runs nothing: it is lit, and its reason is said (again on every press).
      if (item.unavailable != null) { setActive(i, false); P.sayNow(reason, String(item.unavailable)); return; }
      if (!detail) { P.activate(item, o); return; }
      setActive(i, false);
      if (mode === 'push') { savedScroll = results.scrollTop; split.setAttribute('data-enter', 'next'); setView('detail'); }
    }

    page.addEventListener('keydown', function (e) {
      lastInput = 'key';
      if (P.composing(e)) return;
      if (e.key === 'Escape') {
        // Esc clears the query and does nothing once it is empty: it never blurs or closes anything.
        if (input.value) { e.preventDefault(); e.stopPropagation(); input.value = ''; filter(); }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (vis.length) setActive(vis[(vis.indexOf(active) + (e.key === 'ArrowDown' ? 1 : vis.length - 1)) % vis.length]);
        return;
      }
      if (e.key === 'Enter' && e.target === input && !(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
        e.preventDefault();
        // In a split the plate marks what the pane shows, so ↵ runs the pane's primary action: its first button.
        var lit = flat[active];
        if (lit && lit.unavailable != null) choose(active);
        else if (detail && mode === 'split') { var go = paneBody.querySelector('button:not([disabled]), a[href]'); if (go) go.click(); } else if (active > -1) choose(active);
      }
    });
    page.addEventListener('pointerdown', function (e) { lastInput = e.pointerType === 'touch' ? 'touch' : 'pointer'; }, true);
    input.addEventListener('input', filter);
    input.addEventListener('focus', function () { focused = true; syncIdle(); });
    input.addEventListener('blur', function () { focused = false; syncIdle(); });
    results.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') { hovered = true; syncIdle(); } });
    results.addEventListener('pointerleave', function () { hovered = false; syncIdle(); });
    // In a split a pointer passing over a row changes nothing: the plate marks what the pane shows.
    results.addEventListener('pointermove', function (e) {
      var row = e.target.closest('.row');
      if (row && !(detail && mode === 'split') && Number(row.dataset.index) !== active) setActive(Number(row.dataset.index), false);
    });
    results.addEventListener('click', function (e) {
      var row = e.target.closest('.row');
      if (row) choose(Number(row.dataset.index));
    });
    // A press on a row that cannot run keeps focus where it is.
    results.addEventListener('mousedown', function (e) { if (e.target.closest('.row[aria-disabled="true"]')) e.preventDefault(); });

    if (detail) {
      pane.querySelector('.command-back button').addEventListener('click', function () { split.setAttribute('data-enter', 'prev'); setView('list'); });
      split.addEventListener('animationend', function (e) { if (e.target.parentNode === split) split.removeAttribute('data-enter'); });
      // A list with a preview answers its own width: side by side from the list, the gap and one container breakpoint.
      var measure = function () {
        var side = tokenPx(host, '--basalt-size-list-width', 320) + tokenPx(host, '--basalt-space-4', 16) + tokenPx(host, '--basalt-size-breakpoint-container', 480);
        mode = host.clientWidth >= side ? 'split' : 'push';
        split.setAttribute('data-mode', mode);
        syncIdle();
        if (mode === 'split' && view === 'detail') setView('list');
      };
      measure();
      new ResizeObserver(measure).observe(host);
    }
    new ResizeObserver(hold).observe(sizer);
    hold();
    if (!total) { none.hidden = false; fillNone(''); }
    _.glide(results, plate, { active: '.row[data-active]', attr: 'data-active' });
    if (vis.length) setActive(0, false);
    if (detail) renderPane();

    var api = {
      element: host,
      /** Focuses the field and selects its text (what ⌘K does). */
      focus: function () { input.focus({ preventScroll: true }); input.select(); input.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    };
    host.__bhCommandList = api;
    if (!keyBound) {
      keyBound = true;
      // One command surface owns ⌘K on a page. With a palette it is the palette's; without one it is the first list in the page.
      document.addEventListener('keydown', function (e) {
        if (e.defaultPrevented || document.documentElement.__bhPalette || String(e.key).toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || P.composing(e)) return;
        var first = document.querySelector('.command-list');
        if (first && first.__bhCommandList) { e.preventDefault(); first.__bhCommandList.focus(); }
      });
    }
    return api;
  }

  B.commandList = function (host, options) { return build(typeof host === 'string' ? document.querySelector(host) : host, options || {}); };

  _.step(115, 'wireCommandLists', function () {
    document.querySelectorAll('.command-list').forEach(function (host) {
      if (host.__bhCommandList) return;
      var data = host.querySelector('script[type="application/json"][data-commands]');
      var options = {};
      if (data) { try { options = JSON.parse(data.textContent); } catch (e) { console.warn('Basalt: the command list\'s JSON is not valid'); return; } }
      build(host, options);
    });
  });
})(window.Basalt);
