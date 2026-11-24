/* Basalt HTML script, runs module: draws each .run-mark's glyph from its data-state, and again when the state changes. Nothing else: the
   skill draws a run's states, never its machinery (React's counter, ticking times, badge swap and announcer). */
(function (B) {
  'use strict';
  var _ = B._;
  var MARKS = { queued: 'Circle', success: 'CheckCircle', failed: 'XCircle', skipped: 'MinusCircle', canceled: 'Prohibit' };

  function draw(el) {
    var state = el.getAttribute('data-state');
    if (el.__bhRun === state) return;
    el.__bhRun = state;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = MARKS[state] ? _.icon(MARKS[state], { size: 16 }) : '';
  }

  function wireRuns() {
    document.querySelectorAll('.run-mark').forEach(draw);
    if (typeof MutationObserver === 'undefined') return;
    new MutationObserver(function (changes) {
      changes.forEach(function (c) {
        if (c.type === 'attributes' && c.target.classList && c.target.classList.contains('run-mark')) draw(c.target);
        else if (c.type === 'childList') c.addedNodes.forEach(function (n) { if (n.nodeType !== 1) return; if (n.classList.contains('run-mark')) draw(n); n.querySelectorAll('.run-mark').forEach(draw); });
      });
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] });
  }

  B.runs = function (root) { (root || document).querySelectorAll('.run-mark').forEach(draw); };
  _.step(60, 'wireRuns', wireRuns);
})(window.Basalt);
