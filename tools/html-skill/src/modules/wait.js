/* Basalt HTML script, wait module: Basalt.wait(button, work, { showAfter?, minShown? }) is React's usePressWait for a .btn. `work` is a promise, or a
   function that returns one (called only when the button is not already waiting). From the call the button is aria-busy, aria-disabled and
   data-busy (focus, label, width and ink kept; its own `disabled` untouched) and a press, Enter or Space on it calls nothing and submits or follows
   nothing; after showAfter (300ms) it shows the ring (data-loading). On the answer, either way, it is free at once, and the ring, once shown, stays
   until it has been up minShown (400ms). It returns the work's promise with the cleanup chained on: it settles as the work does, a rejection reaches
   the caller's catch, and one nobody handles is reported, as React's Button re-raises (never swallowed). Returns undefined when the button was busy.
   Basalt.wait.SHOW_AFTER and .MIN_SHOWN are the two timings (DECISIONS 247, 248), which the toast's action and toast.promise use too.
   Source: tools/html-skill/src/modules/wait.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';

  /** A press while the button waits is not activation: no handler on it or above it runs, and no form is submitted. */
  function guard(e) {
    if (!this.hasAttribute('data-busy')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  var BUSY = { 'aria-busy': 'true', 'aria-disabled': 'true', 'data-busy': '' };
  function busy(el, on) { for (var k in BUSY) if (on) el.setAttribute(k, BUSY[k]); else el.removeAttribute(k); }

  function wait(el, work, o) {
    if (el.hasAttribute('data-busy')) return undefined;
    var p = typeof work === 'function' ? work() : work;
    if (!p || typeof p.then !== 'function') return p;
    o = o || {};
    var s = el._wait || (el._wait = {});
    if (!s.on) { s.on = 1; el.addEventListener('click', guard, true); }
    // A bare label is put in a span once, so it hides under the ring in forced colours too.
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue.trim()) { var span = document.createElement('span'); el.insertBefore(span, n); span.appendChild(n); n = span; }
    }
    var after = o.showAfter == null ? wait.SHOW_AFTER : o.showAfter;
    var min = o.minShown == null ? wait.MIN_SHOWN : o.minShown;
    // A wait that starts while the last one's ring is still up keeps it up.
    clearTimeout(s.clear);
    busy(el, true);
    if (!el.hasAttribute('data-loading')) s.show = setTimeout(function () { el.setAttribute('data-loading', ''); s.at = performance.now(); }, after);
    // Cleanup on both outcomes, chained so the one promise returned carries the outcome: a caller's catch handles a rejection, and an unhandled one is
    // still reported.
    var done = function () {
      clearTimeout(s.show);
      // Presses, aria-busy and aria-disabled end with the answer (a Retry in the ring's tail goes through); the ring keeps its minimum.
      busy(el, false);
      // A negative delay runs at once.
      if (el.hasAttribute('data-loading')) s.clear = setTimeout(function () { el.removeAttribute('data-loading'); }, min - (performance.now() - s.at));
    };
    return p.then(function (v) { done(); return v; }, function (e) { done(); throw e; });
  }
  wait.SHOW_AFTER = 300;
  wait.MIN_SHOWN = 400;
  B.wait = wait;
})(window.Basalt);
