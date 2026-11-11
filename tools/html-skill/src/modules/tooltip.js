/* Basalt HTML script, tooltip module: <button data-tooltip="Save"> shows a tooltip on hover (after a short wait, or at once when another has
   just closed) and on keyboard focus, and Esc, leaving, pressing or scrolling dismisses it. The pointer may move onto the tooltip and it stays
   (WCAG 1.4.13). It supplements a control's name; it never replaces one. Not on touch. data-tooltip-side="top|bottom|left|right" (default top);
   data-tooltip-keys="⌘ K" draws a real shortcut as chips (the kbd module). Needs the popover module for its position.
   Source: tools/html-skill/src/modules/tooltip.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var DELAY = 600;
  var GRACE = 400;
  var tip;
  var trigger;
  var timer;
  var closedAt = -1e9;

  function make() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'float tooltip';
    tip.id = 'bh-tooltip';
    tip.setAttribute('popover', 'manual');
    tip.setAttribute('role', 'tooltip');
    tip.addEventListener('pointerleave', function (e) { if (!trigger || !trigger.contains(e.relatedTarget)) hide(); });
    document.body.appendChild(tip);
    return tip;
  }

  function show(el) {
    clearTimeout(timer);
    if (trigger === el && tip.matches(':popover-open')) return;
    var t = make();
    var fresh = !t.matches(':popover-open');
    if (trigger && trigger !== el) release(trigger);
    trigger = el;
    var keys = el.getAttribute('data-tooltip-keys');
    var parts = keys && _.kbd ? keys.trim().split(/\s+/) : null;
    t.innerHTML = _.esc(el.getAttribute('data-tooltip')) + (parts ? _.kbd.kbdGroup(parts) + '<span class="visually-hidden"> (' + _.esc(_.kbd.keywords(parts)) + ')</span>' : '');
    if (parts) el.setAttribute('aria-keyshortcuts', _.kbd.keyshortcuts(parts));
    var by = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (by.indexOf(t.id) < 0) el.setAttribute('aria-describedby', by.concat(t.id).join(' '));
    // Moving from one tooltip straight to the next, or opening within the grace period, is at once.
    if (fresh) { if (performance.now() - closedAt < GRACE) t.setAttribute('data-instant', ''); else t.removeAttribute('data-instant'); t.showPopover(); }
    _.place(t, el, { side: el.getAttribute('data-tooltip-side') || 'top', align: 'center' });
  }

  function release(el) {
    var by = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) { return id && id !== 'bh-tooltip'; });
    if (by.length) el.setAttribute('aria-describedby', by.join(' ')); else el.removeAttribute('aria-describedby');
  }

  function hide() {
    clearTimeout(timer);
    if (!tip || !tip.matches(':popover-open')) return;
    tip.hidePopover();
    closedAt = performance.now();
    if (trigger) release(trigger);
    trigger = null;
  }

  function within(e) { return e.target.closest ? e.target.closest('[data-tooltip]') : null; }

  function wire() {
    if (document.documentElement.__bhTooltip) return;
    document.documentElement.__bhTooltip = true;
    document.addEventListener('pointerover', function (e) {
      var el = within(e);
      if (!el || e.pointerType === 'touch' || el.contains(e.relatedTarget) || (trigger === el)) return;
      clearTimeout(timer);
      var wait = tip && tip.matches(':popover-open') ? 0 : performance.now() - closedAt < GRACE ? 0 : DELAY;
      if (wait) timer = setTimeout(function () { show(el); }, wait); else show(el);
    });
    document.addEventListener('pointerout', function (e) {
      var el = within(e);
      if (!el || el.contains(e.relatedTarget)) return;
      clearTimeout(timer);
      if (tip && tip.contains(e.relatedTarget)) return;
      if (trigger === el) hide();
    });
    document.addEventListener('focusin', function (e) { var el = within(e); if (el && e.target.matches(':focus-visible')) show(el); });
    document.addEventListener('focusout', function (e) { if (within(e)) hide(); });
    document.addEventListener('pointerdown', function (e) { if (within(e)) hide(); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tip && tip.matches(':popover-open')) { e.preventDefault(); e.stopPropagation(); hide(); } }, true);
    window.addEventListener('scroll', hide, true);
  }
  _.step(135, 'wireTooltip', wire);
})(window.Basalt);
