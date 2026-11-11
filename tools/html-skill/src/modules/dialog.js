/* Basalt HTML script, dialog module: opens a native <dialog class="panel float modal dialog"> (or a sheet) as a modal and looks after it:
   focus moves in and wraps inside (a bare <dialog> lets Tab leave for the browser), Esc closes, focus returns to the opener, the title names
   it, and a press on the scrim closes it, except for an alert dialog (role="alertdialog"), whose first focus is the safe choice
   ([data-cancel], else the first control). Wired by attribute: data-dialog-open="#id" on the opener, data-dialog-close inside the dialog.
   Source: tools/html-skill/src/modules/dialog.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var seq = 0;
  var locks = 0;
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function find(d) { return typeof d === 'string' ? document.querySelector(d.charAt(0) === '#' || /[.\[\s]/.test(d) ? d : '#' + d) : d; }
  function tabbables(el) { return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) { return n.getClientRects().length && !n.closest('[hidden],[inert]'); }); }
  function outside(d, e) { var r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; }

  /** Names the dialog from its title and describes it from its description, once. */
  function name(d) {
    var title = d.querySelector('.dialog-title');
    if (title && !d.hasAttribute('aria-labelledby') && !d.hasAttribute('aria-label')) { title.id = title.id || 'bh-dlg-' + (++seq); d.setAttribute('aria-labelledby', title.id); }
    var desc = d.querySelector('.dialog-description');
    if (desc && !d.hasAttribute('aria-describedby')) { desc.id = desc.id || 'bh-dlg-' + (++seq); d.setAttribute('aria-describedby', desc.id); }
    if (!d.hasAttribute('aria-labelledby') && !d.hasAttribute('aria-label')) console.warn('Basalt: a dialog needs a .dialog-title (or an aria-label): it is the dialog\'s name');
  }

  function wire(d) {
    if (d.__bhDialog) return;
    d.__bhDialog = true;
    var down = false;
    d.addEventListener('pointerdown', function (e) { down = e.target === d && outside(d, e); });
    d.addEventListener('click', function (e) { if (down && e.target === d && outside(d, e) && d.getAttribute('role') !== 'alertdialog') d.close(); down = false; });
    d.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var t = tabbables(d);
      if (!t.length) { e.preventDefault(); d.focus(); return; }
      var first = t[0];
      var last = t[t.length - 1];
      var at = document.activeElement;
      if (e.shiftKey && (at === first || at === d)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    });
    d.addEventListener('close', function () {
      unlock(d);
      var back = d.__opener;
      d.__opener = null;
      if (back && back.focus && document.contains(back)) back.focus();
    });
  }

  /**
   * The page behind a modal does not scroll (dialog.css hides the root's overflow). Where the scrollbar is a classic one it disappears with it, and the
   * page would shift by its width: while a modal is open, the root's inline end is padded by the scrollbar's measured width, as Base UI's scroll lock does.
   */
  function lock(d) {
    if (d.__locked) return;
    d.__locked = true;
    var root = document.documentElement;
    if (locks++ === 0) {
      root.__pad = root.style.paddingInlineEnd;
      var bar = window.innerWidth - root.clientWidth;
      if (bar > 0) root.style.paddingInlineEnd = bar + 'px';
    }
  }
  function unlock(d) {
    if (!d.__locked) return;
    d.__locked = false;
    if (--locks === 0) document.documentElement.style.paddingInlineEnd = document.documentElement.__pad || '';
  }

  /** Opens a dialog (an element, or its id or selector) as a modal. `opener` is where focus goes back to; it defaults to what has focus now. */
  function openDialog(el, opener) {
    var d = find(el);
    if (!d || d.open) return d;
    wire(d);
    name(d);
    if (!d.hasAttribute('tabindex')) d.setAttribute('tabindex', '-1');
    d.__opener = opener || document.activeElement;
    lock(d); // measured before the root's overflow is hidden
    try { d.showModal(); } catch (e) { unlock(d); throw e; }
    var safe = d.getAttribute('role') === 'alertdialog' && d.querySelector('[data-cancel]');
    if (safe) safe.focus(); else if (!d.contains(document.activeElement) || document.activeElement === d) { var t = tabbables(d)[0]; if (t) t.focus(); }
    return d;
  }

  function closeDialog(el) { var d = find(el); if (d && d.open) d.close(); }

  B.openDialog = openDialog;
  B.closeDialog = closeDialog;
  _.step(130, 'wireDialog', function () {
    if (document.documentElement.__bhDialog) return;
    document.documentElement.__bhDialog = true;
    document.addEventListener('click', function (e) {
      var open = e.target.closest && e.target.closest('[data-dialog-open]');
      if (open) { if (!open.hasAttribute('aria-haspopup')) open.setAttribute('aria-haspopup', 'dialog'); openDialog(open.getAttribute('data-dialog-open'), open); return; }
      var close = e.target.closest && e.target.closest('[data-dialog-close]');
      if (close) closeDialog(close.getAttribute('data-dialog-close') || close.closest('dialog'));
    });
  });
})(window.Basalt);
