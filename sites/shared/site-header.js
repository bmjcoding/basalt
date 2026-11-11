/* STAND-IN: the site header's behaviour, until the HTML skill gains the real module (finish-nov10, batch 7). With site-header.css.
   It is packages/react/src/site-header.tsx, at-top.ts and the navigation half of plate.tsx, ported to plain script, not redesigned.

   The bar's markup is finished at build time (sites/header-markup.mjs: the link classes, pills and labels, the shared pill's element, the
   Menu button, and the early report that the page opens at the top), so the bar in the first paint is the bar after this script runs and
   this changes nothing in it. What it does, once, as an init step of the skill's core script (so it needs no call of its own):
   - adopts that markup and wires it;
   - draws the one shared hover pill on the links and on the menu's rows (Nav's glide);
   - reports where the page is (data-top, data-jump on the header) from one IntersectionObserver on a sentinel at the top;
   - under 720 puts the Menu button in the bar and builds the narrow menu: a top sheet whose first row redraws the bar, then the
     links as glyphless Nav rows, then the bar's action. The skill has no Dialog, so the focus trap is here: focus lands on Close, Tab
     wraps inside, Escape and the scrim and Close and a link close it, focus goes back to Menu, widening past 720 closes it and
     focuses the current link in the bar, and the page under it is inert and does not scroll.
   Nothing here changes a pixel of the bar, so nothing in it can start a transition on load; markup that was not built throws, loudly.
   Nothing runs when this file loads except the registration of that step.

   Differences from React, all listed in sites/test/site-header-parity.test.mjs: the skill has no MorphIcon, so Menu and Close swap
   at once (the same two drawings); and the menu is built by script from the links the page wrote. */
(function (B) {
  'use strict';
  var _ = B._;

  // The two glyphs, from packages/react/src/glyphs/menu.ts and close.ts as MorphIcon draws them settled at 16 (named data-glyph: the core script
  // replaces any [data-icon] with a Phosphor icon)
  // (sites/test/site-header-parity.test.mjs renders React's and fails if these two strings drift from it). The skill's icon set has no
  // Menu or Close glyph of the core set, so they live here; they are never redrawn.
  var GLYPH = {
    menu: '<svg class="basalt-morph" data-glyph="menu" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><g fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7C9.667 7 14.333 7 19 7"></path><path d="M5 12C9.667 12 14.333 12 19 12"></path><path d="M5 17C9.667 17 14.333 17 19 17"></path></g></svg>',
    close: '<svg class="basalt-morph" data-glyph="close" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><g fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M7.05 7.05C10.35 10.35 13.65 13.65 16.95 16.95"></path><path d="M16.95 7.05C13.65 10.35 10.35 13.65 7.05 16.95"></path></g></svg>'
  };
  // Size-breakpoint-md (packages/tokens): below it the links and the action are in the menu.
  var WIDE = '(width >= 720px)';
  // Where Off applies: no shared pill on touch, under reduced motion or in forced colours; each link paints its own.
  var OFF = '(prefers-reduced-motion: reduce), (forced-colors: active), (hover: none), (pointer: coarse)';

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    for (var k in attrs || {}) node.setAttribute(k, attrs[k]);
    return node;
  }

  /* ------------------------------------------------------------------ the shared pill (Nav's glide, navigation only) */

  /** One shared pill per list. The host carries `data-hovered` on the item under a mouse or pen; the pill follows it, hugging the
      item's pill, and the first key hides it (the focus ring is the cue) until the pointer moves again. */
  function attachPlate(plate, itemSelector, shapeSelector) {
    var host = plate.parentElement;
    var off = matchMedia(OFF);
    var modality = 'pointer';
    var last = null;
    var target = '';
    var snapNext = false;
    var leaving;
    var ACTIVE = itemSelector.split(',').map(function (s) { return s.trim() + '[data-hovered]'; }).join(', ');

    function on() { return !off.matches && modality === 'pointer'; }
    function lit() { return plate.dataset.state === 'on'; }
    function activeRow() { return host.querySelector(ACTIVE); }
    function geometry(row) {
      var box = host.getBoundingClientRect();
      var hug = row.querySelector(shapeSelector).getBoundingClientRect();
      var ratio = host.offsetWidth > 0 ? box.width / host.offsetWidth : 1;
      var scale = Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
      return {
        x: (hug.left - box.left) / scale - host.clientLeft + host.scrollLeft,
        y: (hug.top - box.top) / scale - host.clientTop + host.scrollTop,
        w: hug.width / scale,
        h: hug.height / scale
      };
    }
    function write(g) {
      plate.style.setProperty('--_plate-x', g.x + 'px');
      plate.style.setProperty('--_plate-y', g.y + 'px');
      plate.style.setProperty('--_plate-w', g.w + 'px');
      plate.style.setProperty('--_plate-h', g.h + 'px');
    }
    // Runs `change` with the plate's transitions off and commits it, so it takes effect in place.
    function inPlace(change) {
      plate.setAttribute('data-snap', '');
      change();
      void plate.offsetWidth;
      plate.removeAttribute('data-snap');
    }
    function leave() {
      if (!lit()) return;
      // Freeze a move in progress where it has reached, then fade there.
      var style = getComputedStyle(plate);
      var m = new DOMMatrixReadOnly(style.transform);
      write({ x: m.m41, y: m.m42, w: parseFloat(style.width), h: parseFloat(style.height) });
      plate.dataset.state = 'off';
      last = null;
      target = '';
    }
    function settle() {
      window.clearTimeout(leaving);
      leaving = undefined;
      host.toggleAttribute('data-glide', on());
      if (!on()) {
        // Hidden at once, not faded: a key, touch or a media query took the glide away.
        if (plate.dataset.state !== 'off' || last) inPlace(function () { plate.dataset.state = 'off'; });
        last = null;
        target = '';
        return;
      }
      var row = activeRow();
      if (!row) {
        leaving = window.setTimeout(function () { if (!activeRow()) leave(); }, 0);
        return;
      }
      var g = geometry(row);
      var key = g.x + ' ' + g.y + ' ' + g.w + ' ' + g.h;
      if (row === last && lit() && key === target) return;
      target = key;
      var moved = row !== last;
      var shown = lit() ? 1 : parseFloat(getComputedStyle(plate).opacity) || 0;
      var travel = !snapNext && moved && modality === 'pointer' && shown > 0.01;
      snapNext = false;
      if (travel) {
        write(g);
        plate.dataset.state = 'on';
      } else {
        inPlace(function () { write(g); plate.dataset.state = 'on'; });
      }
      last = row;
    }
    function input(event) {
      var next = modality;
      if (event.type === 'keydown') {
        if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Meta') next = 'keyboard';
      } else {
        next = event.pointerType === 'touch' ? 'touch' : 'pointer';
      }
      if (next === modality) return;
      var was = on();
      modality = next;
      host.toggleAttribute('data-keys', modality === 'keyboard');
      if (on() !== was) settle();
    }
    host.addEventListener('pointerover', function (event) {
      if (event.pointerType === 'touch') return;
      var item = event.target.closest(itemSelector);
      var now = host.querySelector(ACTIVE);
      if (item === now) return;
      if (now) now.removeAttribute('data-hovered');
      if (item) item.setAttribute('data-hovered', '');
    });
    host.addEventListener('pointerleave', function () {
      var now = host.querySelector(ACTIVE);
      if (now) now.removeAttribute('data-hovered');
    });
    plate.dataset.state = 'off';
    settle();
    new MutationObserver(settle).observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-hovered'] });
    new ResizeObserver(function () { snapNext = true; target = ''; settle(); }).observe(host);
    off.addEventListener('change', settle);
    ['pointermove', 'pointerdown', 'keydown'].forEach(function (type) { document.addEventListener(type, input, { capture: true, passive: true }); });
  }

  /* --------------------------------------------------------------------------- where the page is (the clear bar's report) */

  function px(value) { return parseFloat(value); }
  /** The slack under the bar inside the headroom: size-stage-headroom less size-header (24px), read from the tokens. */
  function headroomSlack() {
    var style = getComputedStyle(document.documentElement);
    var slack = px(style.getPropertyValue('--basalt-size-stage-headroom')) - px(style.getPropertyValue('--basalt-size-header'));
    return isFinite(slack) && slack > 0 ? slack : 0;
  }
  /** `data-top` on the header while the document is at its top; `data-jump` when the change must be at once. */
  function reportTop(header) {
    if (header.hasAttribute('data-solid') || typeof IntersectionObserver === 'undefined') return;
    var sentinel = el('div', '', { 'aria-hidden': 'true', 'data-basalt-top-sentinel': '' });
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden';
    document.documentElement.append(sentinel);
    var state = { top: false, jump: false };
    function apply(top, opening) {
      var jump = top ? !!opening : window.scrollY > headroomSlack();
      if (state.top === top && state.jump === jump) return;
      state = { top: top, jump: jump };
      header.toggleAttribute('data-top', top);
      header.toggleAttribute('data-jump', jump);
    }
    // Now, so a page that opens at the top is clear in its first frame and does not fade in from the smoked bar. The first observer
    // report or two frames later hands the next change back to the decided fade.
    apply(window.scrollY < 1, true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (state.top && state.jump) { state = { top: true, jump: false }; header.removeAttribute('data-jump'); }
      });
    });
    new IntersectionObserver(function (entries) {
      var entry = entries[entries.length - 1];
      if (entry) apply(entry.boundingClientRect.top >= 0, false);
    }, { threshold: [0, 1] }).observe(sentinel);
  }

  /* --------------------------------------------------------------------------------------------- the header and its menu */

  var uid = 0;
  function stripIds(node) {
    if (node.removeAttribute) node.removeAttribute('id');
    node.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    return node;
  }

  /** Wires the glide on the links. Their pills and the shared pill's element are in the built markup (sites/header-markup.mjs). */
  function wireLinks(nav) {
    var plate = nav.querySelector('.basalt-plate');
    if (!plate) throw new Error('the site header is not built: its links have no shared pill (build the page with sites/build.mjs)');
    attachPlate(plate, '.basalt-site-link', '.basalt-site-pill');
  }

  function buildMenu(header, bar, nav, actions) {
    var id = 'basalt-site-menu-' + (++uid);
    var title = id + '-title';
    var menuLabel = header.getAttribute('data-menu-label') || 'Menu';
    var closeLabel = header.getAttribute('data-close-label') || 'Close menu';
    var action = actions.querySelector('.basalt-site-action');
    var toggle = actions.querySelector('[data-theme-toggle]');
    var brand = bar.querySelector('.basalt-site-brand');

    // The Menu button is in the built markup, under 720 where the links and the action are not in the bar.
    var trigger = actions.querySelector('.basalt-site-menu-trigger');
    if (!trigger) throw new Error('the site header is not built: it has no Menu button (build the page with sites/build.mjs)');

    var root = el('div', 'basalt-site-menu-root', { hidden: '' });
    root.style.display = 'contents';
    var scrim = el('div', 'basalt-dialog-backdrop basalt-sheet-backdrop', { 'data-side': 'top' });
    var sheet = el('div', 'basalt-sheet basalt-site-menu', { id: id, role: 'dialog', 'aria-labelledby': title, 'data-side': 'top', tabindex: '-1' });
    var heading = el('h2', 'visually-hidden', { id: title });
    heading.textContent = menuLabel;
    var band = el('div', 'basalt-site-menu-band');
    band.append(stripIds(brand.cloneNode(true)), el('span', 'basalt-bar-spacer'));
    var bandActions = el('div', 'basalt-bar-actions');
    if (toggle) bandActions.append(stripIds(toggle.cloneNode(true)));
    var close = el('button', 'btn basalt-site-menu-close', { type: 'button', 'data-variant': 'ghost', 'data-icon-only': '', 'aria-label': closeLabel });
    close.innerHTML = GLYPH.close;
    bandActions.append(close);
    band.append(bandActions);
    sheet.append(heading, band);

    if (nav) {
      var menuNav = el('nav', 'basalt-nav basalt-site-menu-nav', { 'aria-label': nav.getAttribute('aria-label') || 'Primary' });
      var plate = el('span', 'basalt-plate', { 'aria-hidden': 'true', 'data-state': 'off' });
      var ul = el('ul', 'basalt-nav-list');
      nav.querySelectorAll('.basalt-site-link').forEach(function (link) {
        var text = link.querySelector('.basalt-site-label').textContent;
        var a = el('a', 'basalt-nav-item', { href: link.getAttribute('href') });
        if (link.getAttribute('aria-current') === 'page') a.setAttribute('aria-current', 'page');
        var label = el('span', 'basalt-nav-label', { 'data-label': text });
        label.textContent = text;
        var pill = el('span', 'basalt-nav-pill');
        pill.append(label);
        a.append(pill);
        var li = el('li', 'basalt-nav-entry');
        li.append(a);
        ul.append(li);
      });
      menuNav.append(plate, ul);
      sheet.append(menuNav);
      sheet.__plate = plate;
    }
    if (action) {
      var foot = el('div', 'basalt-site-menu-foot');
      foot.append(stripIds(action.firstElementChild.cloneNode(true)));
      sheet.append(foot);
    }
    root.append(scrim, sheet);
    document.body.append(root);
    if (sheet.__plate) attachPlate(sheet.__plate, '.basalt-nav-item', '.basalt-nav-pill');

    var isOpen = false;
    var inerted = [];
    var wide = matchMedia(WIDE);
    var exit = 0; // which closing is current; a closing that was reopened must not hide the menu when its animation ends

    function focusables() {
      return Array.prototype.filter.call(
        sheet.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (n) { return n.getClientRects().length > 0; }
      );
    }
    // Tab never leaves for the browser: from the last it wraps to the first, from the first back it wraps to the last, and from
    // anywhere outside the sheet it comes in at the first.
    function keydown(event) {
      if (!isOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); hide(trigger); return; }
      if (event.key !== 'Tab') return;
      var items = focusables();
      if (!items.length) { event.preventDefault(); sheet.focus(); return; }
      var first = items[0];
      var last = items[items.length - 1];
      var active = document.activeElement;
      if (!sheet.contains(active) || active === sheet) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }
    // Focus that finds its way out (a script, the browser's own UI coming back in) is brought back to the sheet.
    function focusin(event) {
      if (isOpen && !sheet.contains(event.target)) close.focus();
    }
    function barLink() {
      return nav ? nav.querySelector('.basalt-site-link[aria-current="page"]') || nav.querySelector('.basalt-site-link') : null;
    }

    function show() {
      if (isOpen) return;
      isOpen = true;
      exit += 1;
      root.hidden = false;
      sheet.removeAttribute('data-ending-style');
      scrim.removeAttribute('data-ending-style');
      sheet.setAttribute('data-starting-style', '');
      scrim.setAttribute('data-starting-style', '');
      void sheet.offsetWidth;
      sheet.removeAttribute('data-starting-style');
      scrim.removeAttribute('data-starting-style');
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-controls', id);
      trigger.innerHTML = GLYPH.close;
      document.documentElement.setAttribute('data-site-menu-open', '');
      // The page under the menu is inert, the live region aside.
      inerted = Array.prototype.filter.call(document.body.children, function (n) { return n !== root && n.id !== 'basalt-live' && !n.hasAttribute('inert'); });
      inerted.forEach(function (n) { n.setAttribute('inert', ''); });
      close.focus();
    }
    // Closes the menu. `focusTarget` is where focus goes: Menu, or the current link in the bar when the window widened.
    function hide(focusTarget) {
      if (!isOpen) return;
      isOpen = false;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-controls');
      trigger.innerHTML = GLYPH.menu;
      document.documentElement.removeAttribute('data-site-menu-open');
      inerted.forEach(function (n) { n.removeAttribute('inert'); });
      inerted = [];
      if (focusTarget && focusTarget.getClientRects().length) focusTarget.focus();
      else if (focusTarget === trigger) trigger.focus();
      sheet.setAttribute('data-ending-style', '');
      scrim.setAttribute('data-ending-style', '');
      void sheet.offsetWidth;
      var mine = ++exit;
      var done = false;
      function finish() {
        if (done || mine !== exit) return;
        done = true;
        root.hidden = true;
        sheet.removeAttribute('data-ending-style');
        scrim.removeAttribute('data-ending-style');
      }
      var running = sheet.getAnimations().concat(scrim.getAnimations()).filter(function (a) { return a.effect && a.effect.getComputedTiming().iterations !== Infinity; });
      if (!running.length) { finish(); return; }
      window.setTimeout(finish, 1000);
      Promise.all(running.map(function (a) { return a.finished.catch(function () {}); })).then(finish);
    }

    trigger.addEventListener('click', function () { if (isOpen) hide(trigger); else show(); });
    close.addEventListener('click', function () { hide(trigger); });
    scrim.addEventListener('click', function () { hide(trigger); });
    sheet.addEventListener('click', function (event) { if (event.target.closest('a[href]')) hide(trigger); });
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    // Widening past 720 closes it (its trigger is gone from the bar, and the links it held are back in it) and focuses the current link.
    wide.addEventListener('change', function () { if (wide.matches && isOpen) hide(barLink()); });
  }

  function upgrade() {
    var header = document.querySelector('header.basalt-site-header');
    if (!header) return;
    var bar = header.querySelector('.basalt-site-bar');
    var nav = header.querySelector('nav.basalt-site-links');
    var actions = header.querySelector('.basalt-bar-actions');
    if (nav) wireLinks(nav);
    if (actions && (nav || actions.querySelector('.basalt-site-action'))) buildMenu(header, bar, nav, actions);
    reportTop(header);
  }

  _.step(50, 'siteHeader', upgrade);
})(window.Basalt);
