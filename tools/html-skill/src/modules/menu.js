/* Basalt HTML script, menu module: the arrow keys, typeahead, the lit row and the checked state of a menu. The menu is a popover popup
   (popover.js opens, closes and positions it): <div class="panel float menu" popover id="m"> with .menu-item rows. Roles say what a row is:
   menuitem, menuitemcheckbox, menuitemradio (a radio sits in a role="group" with its siblings). Needs the popover and glide modules.
   Source: tools/html-skill/src/modules/menu.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var ITEM = '[role^="menuitem"]:not([aria-disabled="true"]):not([disabled])';
  var keyboard = false;

  function items(menu) { return Array.prototype.slice.call(menu.querySelectorAll(ITEM)); }
  function current(menu) { return menu.querySelector('[data-highlighted]'); }

  /** Lights one row (or none): the plate and the lift, with focus on it so a screen reader reads it. */
  function light(menu, item) {
    var now = current(menu);
    if (now && now !== item) now.removeAttribute('data-highlighted');
    if (!item) return;
    item.setAttribute('data-highlighted', '');
    item.focus({ preventScroll: true });
    item.scrollIntoView({ block: 'nearest' });
  }

  function label(item) { var l = item.querySelector('.menu-item-label'); return (l || item).textContent.trim().toLowerCase(); }

  /** Makes a menu ready the first time it opens: rows are focusable by script only, a check seat for a checkable row, the glide's plate. */
  function prepare(menu) {
    if (menu.__bhMenu) return;
    menu.__bhMenu = true;
    menu.setAttribute('tabindex', '-1');
    if (!menu.hasAttribute('aria-labelledby') && !menu.hasAttribute('aria-label')) {
      var opener = document.querySelector('[popovertarget="' + menu.id + '"]');
      if (opener) { opener.id = opener.id || menu.id + '-opener'; menu.setAttribute('aria-labelledby', opener.id); }
    }
    Array.prototype.forEach.call(menu.querySelectorAll('[role^="menuitem"]'), function (it) {
      it.setAttribute('tabindex', '-1');
      var role = it.getAttribute('role');
      if (role !== 'menuitem' && !it.querySelector('.menu-check')) {
        it.insertAdjacentHTML('afterbegin', '<span class="menu-check" aria-hidden="true">' + (role === 'menuitemradio' ? '<span class="menu-radio-dot"></span>' : '%glyph-svg:check%') + '</span>');
      }
    });
    var buffer = '';
    var timer;
    menu.addEventListener('keydown', function (e) {
      var all = items(menu);
      var at = all.indexOf(document.activeElement);
      var next = null;
      if (e.key === 'ArrowDown') next = all[(at + 1) % all.length];
      else if (e.key === 'ArrowUp') next = all[((at < 0 ? 0 : at) - 1 + all.length) % all.length];
      else if (e.key === 'Home') next = all[0];
      else if (e.key === 'End') next = all[all.length - 1];
      else if (e.key === 'Tab') { menu.hidePopover(); return; }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
        clearTimeout(timer);
        buffer += e.key.toLowerCase();
        timer = setTimeout(function () { buffer = ''; }, 500);
        // Typing the same letter again steps through the rows that start with it; more letters narrow to the rows that start with them all.
        var same = buffer.split('').every(function (c) { return c === buffer[0]; });
        var from = same ? at + 1 : Math.max(at, 0);
        var start = same ? buffer[0] : buffer;
        for (var i = 0; i < all.length; i++) {
          var cand = all[(from + i) % all.length];
          if (label(cand).indexOf(start) === 0) { next = cand; break; }
        }
        if (!next) return;
      } else return;
      e.preventDefault();
      if (next) light(menu, next);
    });
    menu.addEventListener('pointermove', function (e) {
      var it = e.target.closest(ITEM);
      if (it && it !== current(menu)) light(menu, it);
    });
    menu.addEventListener('pointerout', function (e) {
      var it = e.target.closest(ITEM);
      if (it && !it.contains(e.relatedTarget)) it.removeAttribute('data-highlighted');
    });
    menu.addEventListener('click', function (e) {
      var it = e.target.closest(ITEM);
      if (!it) return;
      var role = it.getAttribute('role');
      if (role === 'menuitemcheckbox') it.setAttribute('aria-checked', it.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      else if (role === 'menuitemradio') {
        Array.prototype.forEach.call((it.closest('[role="group"]') || menu).querySelectorAll('[role="menuitemradio"]'), function (r) { r.setAttribute('aria-checked', r === it ? 'true' : 'false'); });
      } else { menu.hidePopover(); return; }
      it.dispatchEvent(new CustomEvent('menuchange', { bubbles: true }));
    });
    var plate = document.createElement('span');
    plate.className = 'plate';
    plate.setAttribute('aria-hidden', 'true');
    menu.insertBefore(plate, menu.firstChild);
    menu.__glide = function () { return _.glide(menu, plate, { active: '[data-highlighted]', attr: 'data-highlighted' }); };
  }

  function wire() {
    if (document.documentElement.__bhMenu) return;
    document.documentElement.__bhMenu = true;
    document.addEventListener('keydown', function (e) {
      keyboard = true;
      // ArrowDown or ArrowUp on the opener opens its menu on the first or last row.
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.closest) {
        var opener = e.target.closest('[popovertarget]');
        var menu = opener && document.getElementById(opener.getAttribute('popovertarget'));
        if (menu && menu.matches('.menu') && !menu.matches(':popover-open')) {
          e.preventDefault();
          menu.__first = e.key === 'ArrowDown' ? 'first' : 'last';
          menu.showPopover({ source: opener });
        }
      }
    }, true);
    document.addEventListener('pointerdown', function () { keyboard = false; }, true);
    document.addEventListener('toggle', function (e) {
      var menu = e.target;
      if (!menu.matches || !menu.matches('.menu')) return;
      if (e.newState === 'open') {
        prepare(menu);
        menu.__unglide = menu.__glide();
        var all = items(menu);
        // Opened by a key, the first (or last) row is lit; by the pointer, nothing is until the pointer reaches a row.
        if (keyboard && all.length) light(menu, menu.__first === 'last' ? all[all.length - 1] : all[0]);
        else menu.focus({ preventScroll: true });
        menu.__first = '';
      } else if (menu.__unglide) { menu.__unglide(); menu.__unglide = null; var lit = current(menu); if (lit) lit.removeAttribute('data-highlighted'); }
    }, true);
  }
  _.step(125, 'wireMenu', wire);
})(window.Basalt);
