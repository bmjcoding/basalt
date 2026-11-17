/* Basalt HTML script, topbar-nav module: the site header's links and narrow menu (React's SiteHeader). From the bar's own markup it builds
     - the shared pill that glides between the links (the nav module's rules, glide.js moves it), and each link's reserved 600 width;
     - under 720, a Menu button at the end of the bar (a ghost icon button, the core Menu glyph) and the menu it opens: a modal top sheet whose first row
       redraws the bar (the brand, the tools, the theme toggle of a report's bar and Close, on the Menu button's box) and whose list unrolls beneath it (when the bar has a [data-loops-toggle],
       its pressed-toggle button "Pause animations" as the first row, so the hold can be reached while the menu covers the bar (React's SiteHeader, DECISIONS 143 and
       148); then the links, as Nav rows with no glyph; then the bar's one action, full width). Focus lands on Close; Esc and Close return it to the Menu button; a link closes it; widening the
       window past 720 closes it and puts focus on the current link in the bar.
   The menu is a clone of the bar, made before the page's icons and glyphs are drawn and its theme toggle is wired, so each works in both. React morphs Menu into
   Close in the button; the skill swaps the glyph at once (a recorded difference, the sheet's).
   Attributes on .topbar: data-menu-label (the Menu button's and the dialog's name, default "Menu"), data-close-label (default "Close menu").
   Source: tools/html-skill/src/modules/topbar-nav.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var seq = 0;

  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    for (var k in attrs || {}) node.setAttribute(k, attrs[k]);
    return node;
  }
  /** A copy of the bar's element for the menu: no ids (the page keeps them), and the action without its hide-under-720 class. */
  function copy(node) {
    var clone = node.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    return clone;
  }

  function wire(bar) {
    if (bar.__bhNav) return;
    var inner = bar.querySelector('.topbar-inner');
    var links = inner && inner.querySelector('.topbar-links');
    var action = inner && inner.querySelector('.topbar-action');
    if (!links && !action) return;
    bar.__bhNav = true;
    var menuLabel = bar.getAttribute('data-menu-label') || 'Menu';
    var closeLabel = bar.getAttribute('data-close-label') || 'Close menu';
    var id = 'bh-topbar-menu' + (seq ? '-' + seq : '');
    seq++;

    if (links) {
      links.querySelectorAll('a').forEach(function (a) { a.setAttribute('data-label', a.textContent.trim()); });
      var plate = el('span', 'plate', { 'aria-hidden': 'true' });
      links.insertBefore(plate, links.firstChild);
      _.glide(links, plate, { active: 'a[data-hovered]', item: 'a' });
    }

    // The Menu button, last in the bar.
    var trigger = el('button', 'btn topbar-menu-trigger', { type: 'button', 'data-variant': 'ghost', 'data-icon-only': '', 'aria-label': menuLabel, 'aria-expanded': 'false', 'aria-controls': id, 'data-dialog-open': '#' + id });
    trigger.innerHTML = '<span data-glyph="menu"></span>';
    inner.appendChild(trigger);

    // The menu: the bar's first row again, then the links, then the action.
    var d = el('dialog', 'panel float modal sheet topbar-menu', { id: id, 'data-side': 'top', 'aria-label': menuLabel });
    var band = el('div', 'sheet-band');
    var brand = inner.querySelector('.brand');
    if (brand) band.appendChild(copy(brand));
    band.appendChild(el('span', 'spacer'));
    var actions = el('div', 'topbar-menu-actions');
    // The bar's tools (up to two ghost icon controls that stay at every width, marked data-tool) are drawn again, then the deprecated theme toggle of a report's bar.
    inner.querySelectorAll('[data-tool]').forEach(function (tool) { actions.appendChild(copy(tool)); });
    var toggle = inner.querySelector('[data-theme-toggle]');
    if (toggle) actions.appendChild(copy(toggle));
    var close = el('button', 'btn', { type: 'button', 'data-variant': 'ghost', 'data-icon-only': '', 'aria-label': closeLabel, 'data-dialog-close': '', autofocus: '' });
    close.innerHTML = '<span data-glyph="close"></span>';
    actions.appendChild(close);
    band.appendChild(actions);
    d.appendChild(band);
    // The hold's control, in its Button form, when the bar has one: loops.js wires every [data-loops-toggle] with one listener and keeps them in step, so the row needs none.
    if (inner.querySelector('[data-loops-toggle]')) {
      var row = el('div', 'topbar-menu-loops');
      var pause = el('button', 'btn', { type: 'button', 'data-loops-toggle': '', 'aria-pressed': 'false' });
      pause.innerHTML = '<span class="btn-check" aria-hidden="true"></span>Pause animations';
      row.appendChild(pause);
      d.appendChild(row);
    }
    if (links) {
      var nav = el('nav', 'nav', { 'aria-label': links.getAttribute('aria-label') || 'Primary' });
      var list = el('ul', 'nav-list');
      links.querySelectorAll('a').forEach(function (a) {
        var item = el('a', 'nav-item', { href: a.getAttribute('href') || '#' });
        if (a.getAttribute('aria-current')) item.setAttribute('aria-current', a.getAttribute('aria-current'));
        item.innerHTML = '<span class="nav-pill"><span class="nav-label"></span></span>';
        item.querySelector('.nav-label').textContent = a.textContent.trim();
        var li = document.createElement('li');
        li.appendChild(item);
        list.appendChild(li);
      });
      nav.appendChild(list);
      d.appendChild(nav);
    }
    if (action) {
      var foot = el('div', 'topbar-menu-foot');
      var again = copy(action);
      again.classList.remove('topbar-action');
      foot.appendChild(again);
      d.appendChild(foot);
    }
    // A link closes the menu, as React's does on a navigation (the action does not: it is the page's own).
    d.addEventListener('click', function (e) { if (e.target.closest('.nav-item')) d.close(); });
    d.addEventListener('close', function () { trigger.setAttribute('aria-expanded', 'false'); });
    trigger.addEventListener('click', function () { trigger.setAttribute('aria-expanded', 'true'); });
    document.body.appendChild(d);

    // Widening past 720 closes the menu: its button is gone from the bar and the links it held are back in it. Focus goes to the current link, as React's does.
    var wide = matchMedia('(width >= %bp-md%)');
    wide.addEventListener('change', function () {
      if (!wide.matches || !d.open) return;
      var back = links && (links.querySelector('a[aria-current="page"]') || links.querySelector('a'));
      if (back) d.__opener = back;
      d.close();
    });
  }

  // Before the page's icons (40), glyphs (45) and theme toggles (60) are drawn: the menu is built from the bar's markup and takes them on with it.
  _.step(30, 'buildTopbarMenu', function () { document.querySelectorAll('.topbar').forEach(wire); });
})(window.Basalt);
