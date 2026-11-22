/* Basalt HTML script, explainer module: React's TableHeadExplainer (DECISIONS 257 and 261). A `.explainer` written inside a `th[data-sortable]` becomes a
   manual native popover that opens from the header's own sort button: on hover after the tooltip's wait (600ms, then at once within 400ms of another
   closing), at once on keyboard focus, and on a long press (500ms) on touch. A press before the wait cancels it, a sort press closes an open one, and it
   then stays shut until the pointer and focus have both left. It sits above the header, else beside it (the end side, then the start side), never below,
   so never over its own column; with no room it opens nothing (a long press first scrolls the page up to make the room), and it closes when its header
   leaves the view or the room goes. WCAG 1.4.13: Esc dismisses it without moving the pointer or focus, the pointer can move onto it (a pause in the gap
   between them keeps it), and it stays until hover and focus have both left. Its page-wide listeners and timers live only while it is open or about to
   open, and stop if the table leaves the page. Its words are the button's
   description; it follows the button in the markup, so Tab goes from an open header into its link and on.
   Source: tools/html-skill/src/modules/explainer.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var WAIT = 600, GRACE = 400, LEAVE = 100, LONG = 500, seq = 0, lastClosed = -1e9;

  function gap() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--basalt-space-1-5')) || 6; }

  function place(card, th) {
    var g = gap(), root = document.documentElement, vw = root.clientWidth, vh = root.clientHeight;
    card.style.setProperty('--available-width', (vw - 2 * g) + 'px');
    var a = th.getBoundingClientRect(), rtl = getComputedStyle(th).direction === 'rtl', right = th.hasAttribute('data-numeric') !== rtl;
    var w = card.offsetWidth, h = card.offsetHeight, x, y, side, origin;
    if (a.top - g - h >= g) {
      side = 'top'; y = a.top - g - h; x = Math.max(g, Math.min(right ? a.right - w : a.left, vw - g - w)); origin = (right ? 'right' : 'left') + ' bottom';
    } else {
      y = Math.max(g, a.top);
      var r = a.right + g + w <= vw - g, l = a.left - g - w >= g;
      if (y + h > vh - g || !(r || l)) return false;
      var toR = rtl ? r && !l : r;
      side = toR === !rtl ? 'end' : 'start'; x = toR ? a.right + g : a.left - g - w; origin = toR ? 'left top' : 'right top';
    }
    card.style.left = Math.round(x) + 'px';
    card.style.top = Math.round(y) + 'px';
    card.style.setProperty('--origin', origin);
    card.setAttribute('data-side', side);
    return true;
  }

  function inView(th) {
    var a = th.getBoundingClientRect(), f = (th.closest('.table-wrap') || document.documentElement).getBoundingClientRect(), root = document.documentElement;
    return a.right > Math.max(0, f.left) && a.left < Math.min(root.clientWidth, f.right) && a.bottom > Math.max(0, f.top) && a.top < Math.min(root.clientHeight, f.bottom);
  }

  function wire(card) {
    var th = card.parentElement, button = th.querySelector(':scope > .sort');
    if (!button || card.__bhExplain) return;
    card.__bhExplain = true;
    card.setAttribute('popover', 'manual');
    card.classList.add('panel');
    th.setAttribute('data-explained', '');
    // The description is the card's words after its title.
    var body = card.querySelector('.explainer-title') ? Array.prototype.slice.call(card.children, 1) : Array.prototype.slice.call(card.children);
    button.setAttribute('aria-describedby', body.map(function (n) { return n.id || (n.id = 'bh-explain-' + (++seq)); }).join(' '));
    var open = false, held = false, pinned = false, overB = false, overC = false, wait = 0, leave = 0, press = 0, start = null, longed = false, pt = null, mo = null;
    function focusIn() { var a = document.activeElement; return a === button || card.contains(a); }
    // Its timers and its page-wide listeners live only while it is open or about to open, and all stop if the table or the card leaves the page.
    function gone() { return !th.isConnected || !card.isConnected; }
    function stop() {
      clearTimeout(wait); clearTimeout(leave); clearTimeout(press); wait = leave = press = 0; open = false; pinned = false;
      listen(false);
      if (mo) { mo.disconnect(); mo = null; }
    }
    function watch() { if (!mo) { mo = new MutationObserver(function () { if (gone()) stop(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); } }
    function later(fn, ms) { watch(); return setTimeout(function () { if (gone()) stop(); else fn(); }, ms); }
    function idle() { if (!open && !wait && !leave && !press && mo) { mo.disconnect(); mo = null; } }
    function listen(on) {
      var m = on ? 'addEventListener' : 'removeEventListener';
      window[m]('scroll', again, true); window[m]('resize', again); window[m]('keydown', esc, true);
      document[m]('pointerdown', outside, true); document[m]('pointermove', track, true);
    }
    // Its header scrolled out of view, or no room is left: it closes, focus or not (focus in it goes back to the header).
    function again() { if (gone()) stop(); else if (open && (!inView(th) || !place(card, th))) hide(); }
    // Esc closes it wherever focus is, and nothing else: captured and stopped, so a dialog round the table stays open. It stays shut while the pointer rests on
    // the header or focus is on it; a pointer resting on the card has already moved away from the header.
    function esc(e) { if (e.key !== 'Escape' || !open) return; e.preventDefault(); e.stopPropagation(); held = overB || focusIn(); hide(); }
    function outside(e) { if (open && !th.contains(e.target)) hide(); }
    function track(e) { if (e.pointerType !== 'touch') pt = [e.clientX, e.clientY]; }
    // The gap between the header and the card (space-1-5, across their joint extent): a pointer crossing it slowly keeps the card (WCAG 1.4.13).
    function inGap() {
      if (!pt) return false;
      var a = th.getBoundingClientRect(), c = card.getBoundingClientRect(), x = pt[0], y = pt[1];
      if (card.getAttribute('data-side') === 'top') return y >= c.bottom - 1 && y <= a.top + 1 && x >= Math.min(a.left, c.left) && x <= Math.max(a.right, c.right);
      var lo = Math.min(a.right, c.right) - 1, hi = Math.max(a.left, c.left) + 1;
      return x >= Math.min(lo, hi) && x <= Math.max(lo, hi) && y >= Math.min(a.top, c.top) && y <= Math.max(a.bottom, c.bottom);
    }
    function show(how) {
      clearTimeout(wait); clearTimeout(leave); wait = leave = 0;
      if (held && how !== 'touch') return idle();
      if (how === 'touch') pinned = true;
      if (open) return again();
      card.showPopover();
      if (!inView(th) || !place(card, th)) {
        var short = card.offsetHeight + 2 * gap() - th.getBoundingClientRect().top;
        if (how === 'touch' && window.scrollY >= short) window.scrollBy(0, -short);
        if (how !== 'touch' || !place(card, th)) { card.hidePopover(); pinned = false; return idle(); }
      }
      open = true;
      watch();
      listen(true);
    }
    function hide() {
      clearTimeout(wait); clearTimeout(leave); wait = leave = 0;
      pinned = false;
      if (open) {
        open = false; lastClosed = performance.now(); pt = null;
        listen(false);
        if (card.contains(document.activeElement)) button.focus({ preventScroll: true });
        card.hidePopover();
      }
      idle();
    }
    function settle() {
      clearTimeout(leave);
      leave = later(function check() {
        leave = 0;
        if (pinned || overB || overC || focusIn()) return idle();
        if (open && inGap()) { leave = later(check, LEAVE); return; }
        hide();
      }, LEAVE);
    }
    button.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      overB = true; clearTimeout(leave); leave = 0;
      if (!open && !held) wait = later(function () { wait = 0; show('hover'); }, performance.now() - lastClosed < GRACE ? 0 : WAIT);
    });
    // A dismissed card stays shut until the pointer and focus have both left the header.
    button.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      overB = false; pt = [e.clientX, e.clientY]; clearTimeout(wait); wait = 0;
      if (!focusIn()) held = false;
      settle();
    });
    card.addEventListener('pointerenter', function () { overC = true; clearTimeout(leave); leave = 0; });
    card.addEventListener('pointerleave', function (e) { overC = false; pt = [e.clientX, e.clientY]; settle(); });
    button.addEventListener('focus', function () { if (button.matches(':focus-visible')) show('focus'); });
    th.addEventListener('focusout', function (e) {
      if (e.relatedTarget && th.contains(e.relatedTarget)) return;
      if (!overB) held = false;
      settle();
    });
    button.addEventListener('pointerdown', function (e) {
      clearTimeout(wait); wait = 0; longed = false;
      if (e.pointerType !== 'touch') { held = true; return idle(); }
      start = [e.clientX, e.clientY];
      press = later(function () { press = 0; longed = true; show('touch'); }, LONG);
    });
    button.addEventListener('pointermove', function (e) { if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 10) { clearTimeout(press); press = 0; start = null; idle(); } });
    ['pointerup', 'pointercancel'].forEach(function (t) { button.addEventListener(t, function () { clearTimeout(press); press = 0; start = null; idle(); }); });
    // Captured on the th, so it runs before the sort's own handler on the button: the press that ended a long press does not sort.
    th.addEventListener('click', function (e) {
      if (!button.contains(e.target)) return;
      if (longed) { longed = false; e.preventDefault(); e.stopPropagation(); return; }
      held = true; hide();
    }, true);
    button.addEventListener('contextmenu', function (e) { if (start || longed) e.preventDefault(); });
    th.addEventListener('keydown', function () { longed = false; });
  }

  _.step(66, 'explainer', function () { document.querySelectorAll('th[data-sortable] > .explainer').forEach(wire); });
})(window.Basalt);
