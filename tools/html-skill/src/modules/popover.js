/* Basalt HTML script, popover module: positions a native popup beside its opener and looks after its focus. The popup is a
   <div class="panel float popover" popover id="x"> and the opener a <button popovertarget="x">; the browser opens, light-dismisses and closes
   it on Esc. This adds what it does not: the position (below and at the start, flipped and kept inside the window), focus into the popup,
   focus back to the opener, and closing when focus leaves. The menu, the combobox, the notification centre and the tooltip use _.place and _.tabbables (a menu and a combobox popup keep focus where it is).
   Source: tools/html-skill/src/modules/popover.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var seq = 0;
  // Base UI's default collision padding, which React's popups don't override (useAnchorPositioning: collisionPadding = 5).
  var PAD = 5;
  // Every native popup except a tooltip, which the tooltip module looks after itself.
  var POPUP = '.float[popover]:not([role="tooltip"])';

  /** The focusable elements inside `el`, in order. */
  _.tabbables = function (el) {
    return Array.prototype.filter.call(el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'), function (n) {
      return n.getClientRects().length && !n.closest('[hidden],[inert]');
    });
  };

  /**
   * Puts `pop` (fixed, in the top layer) beside `anchor`. o.side: bottom (default), top, left, right; o.align: start (default), center, end;
   * o.offset: 6. It flips to the other side when that side has more room and this one has too little, then keeps the box inside the window.
   * Writes --available-height and --available-width (what the popup may fill), --origin (where it grows from) and data-placed (the side).
   */
  _.place = function (pop, anchor, o) {
    o = o || {};
    var side = o.side || 'bottom';
    var align = o.align || 'start';
    var gap = o.offset == null ? 6 : o.offset;
    var a = anchor.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    var vh = document.documentElement.clientHeight;
    var room = { top: a.top - gap - PAD, bottom: vh - a.bottom - gap - PAD, left: a.left - gap - PAD, right: vw - a.right - gap - PAD };
    var opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    var vertical = side === 'top' || side === 'bottom';
    var st = pop.style;
    st.setProperty('--available-height', Math.max(room[side], room[opposite[side]]) + 'px');
    st.setProperty('--available-width', (vw - 2 * PAD) + 'px');
    if ((vertical ? pop.offsetHeight : pop.offsetWidth) > room[side] && room[opposite[side]] > room[side]) side = opposite[side];
    st.setProperty('--available-height', Math.max(room[side], 0) + 'px');
    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var at = function (al) {
      return vertical
        ? { x: al === 'start' ? a.left : al === 'end' ? a.right - w : a.left + (a.width - w) / 2, y: side === 'bottom' ? a.bottom + gap : a.top - gap - h }
        : { x: side === 'right' ? a.right + gap : a.left - gap - w, y: al === 'start' ? a.top : al === 'end' ? a.bottom - h : a.top + (a.height - h) / 2 };
    };
    var fits = function (p) { return p.x >= PAD && p.y >= PAD && p.x + w <= vw - PAD && p.y + h <= vh - PAD; };
    var spot = at(align);
    // Along the opener's edge a popup that does not fit takes the other alignment (start for end, end for start) before it is pushed back inside.
    if (!fits(spot) && align !== 'center' && fits(at(align === 'start' ? 'end' : 'start'))) { align = align === 'start' ? 'end' : 'start'; spot = at(align); }
    var x = Math.max(PAD, Math.min(spot.x, vw - PAD - w));
    var y = Math.max(PAD, Math.min(spot.y, vh - PAD - h));
    st.left = Math.round(x) + 'px';
    st.top = Math.round(y) + 'px';
    var across = align === 'center' ? 'center' : align === 'start' ? 'left' : 'right';
    st.setProperty('--origin', vertical ? (side === 'bottom' ? 'top ' : 'bottom ') + across : (side === 'right' ? 'left ' : 'right ') + (align === 'center' ? 'center' : align === 'start' ? 'top' : 'bottom'));
    pop.setAttribute('data-placed', side);
  };

  function anchorOf(pop, e) {
    return (e && e.source) || document.querySelector('[popovertarget="' + pop.id + '"]') || (pop.dataset.anchor && document.querySelector(pop.dataset.anchor));
  }

  function opened(pop, e) {
    var anchor = anchorOf(pop, e);
    pop.__anchor = anchor;
    if (!pop.hasAttribute('role')) pop.setAttribute('role', pop.matches('.menu') ? 'menu' : 'dialog');
    var title = pop.querySelector('.popover-title');
    if (title && !pop.hasAttribute('aria-labelledby') && !pop.hasAttribute('aria-label')) {
      title.id = title.id || 'bh-pop-' + (++seq);
      pop.setAttribute('aria-labelledby', title.id);
    }
    if (anchor) {
      anchor.setAttribute('aria-expanded', 'true');
      if (!anchor.hasAttribute('aria-haspopup')) anchor.setAttribute('aria-haspopup', pop.getAttribute('role') === 'menu' ? 'menu' : 'dialog');
      // Start and end are the opener's own: in a right-to-left page "end" is the left edge.
      var rtl = getComputedStyle(anchor).direction === 'rtl';
      var align = rtl && pop.dataset.align === 'end' ? 'start' : rtl && (!pop.dataset.align || pop.dataset.align === 'start') ? 'end' : pop.dataset.align;
      var again = function () { _.place(pop, anchor, { side: pop.dataset.side, align: align }); };
      again();
      pop.__again = again;
      window.addEventListener('resize', again);
      window.addEventListener('scroll', again, true);
    }
    if (!pop.__bhFocus) {
      pop.__bhFocus = true;
      pop.addEventListener('focusout', function (ev) {
        var to = ev.relatedTarget;
        if (to && !pop.contains(to) && to !== pop.__anchor && !(to.closest && to.closest('[popover]:popover-open')) && pop.matches(':popover-open')) pop.hidePopover();
      });
    }
    // A popup marked data-focus-self takes focus itself, as React's Sources panel does. Tab then walks the popup's own controls by the browser's own
    // rule, which React's portal gets from the page: Safari's Tab skips links by default and Option-Tab reaches them, so on Apple's WebKit the first
    // Tab from the panel reaches its button, and elsewhere its links come first. The walk is ours because WebKit's own Tab, from a popup in the top
    // layer, leaves it for the page's start. Back from the first control is the panel; past the last the popup closes and focus goes to the opener.
    if (pop.hasAttribute('data-focus-self')) {
      pop.setAttribute('tabindex', '-1');
      pop.focus({ preventScroll: true });
      if (!pop.__bhTab) {
        pop.__bhTab = true;
        var appleTab = /^Apple/.test(navigator.vendor || '');
        pop.addEventListener('keydown', function (ev) {
          if (ev.key !== 'Tab' || ev.defaultPrevented) return;
          var links = !appleTab || ev.altKey;
          var list = _.tabbables(pop).filter(function (el) { return links || !el.matches('a[href], area[href]'); });
          var cur = document.activeElement;
          var at = cur === pop ? -1 : list.indexOf(cur);
          if (at < 0 && cur !== pop) {
            // A control the walk skips (a link a click focused): go on from its place in the popup.
            var after = list.length;
            for (var i = 0; i < list.length; i++) if (cur.compareDocumentPosition(list[i]) & 4) { after = i; break; }
            at = ev.shiftKey ? after : after - 1;
          }
          var next = at + (ev.shiftKey ? -1 : 1);
          ev.preventDefault();
          if (next >= list.length) { pop.hidePopover(); if (pop.__anchor) pop.__anchor.focus({ preventScroll: true }); return; }
          (next < 0 ? pop : list[next]).focus({ preventScroll: true });
        });
      }
    } else if (!pop.matches('[role="menu"], .combobox-popup')) {
      var first = _.tabbables(pop)[0];
      if (!first) pop.setAttribute('tabindex', '-1');
      (first || pop).focus({ preventScroll: true });
    }
  }

  function closed(pop) {
    if (pop.__again) { window.removeEventListener('resize', pop.__again); window.removeEventListener('scroll', pop.__again, true); pop.__again = null; }
    var anchor = pop.__anchor;
    if (anchor) {
      anchor.setAttribute('aria-expanded', 'false');
      // Focus goes back to the opener when it was inside the popup (the browser does this too; this covers a popup closed from a script).
      if (pop.__had && (!document.activeElement || document.activeElement === document.body)) anchor.focus({ preventScroll: true });
    }
    pop.__had = false;
  }

  _.step(120, 'wirePopover', function () {
    if (document.documentElement.__bhPopover) return;
    document.documentElement.__bhPopover = true;
    document.addEventListener('beforetoggle', function (e) {
      var pop = e.target;
      if (e.newState === 'closed' && pop.matches && pop.matches(POPUP)) pop.__had = pop.contains(document.activeElement);
    }, true);
    document.addEventListener('toggle', function (e) {
      var pop = e.target;
      if (!pop.matches || !pop.matches(POPUP)) return;
      // A plain popover's content moves into its port the first time it opens (cimip-gaps-3 t7); a popup that is its own list keeps its own.
      if (e.newState === 'open' && pop.matches('.popover') && !pop.matches('.menu, .combobox-popup, .filter-popup, .notifications')) {
        var box = _.port(pop, 'popover-scroll', { axis: 'block', ring: 4 });
        _.scrollStop(box, function () { var t = pop.querySelector('.popover-title'); if (t) { t.id = t.id || (pop.id || 'popover') + '-title'; return t.id; } return null; });
      }
      if (e.newState === 'open') opened(pop, e); else closed(pop);
    }, true);
  });
})(window.Basalt);
