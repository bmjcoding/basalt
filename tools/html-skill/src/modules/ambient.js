/* Basalt HTML script, ambient module: a page's one ambient loop (React's AmbientMark and ambient()). The marks are [data-ambient] inside a stage's art or a framed
   frame; this gives the first 24 of them, in document order, their own period (0.6 to 1.4 times duration-loop-ambient) and phase, and takes the attribute off the
   rest. ambient.css runs the loop, and loops holds it. Source: tools/html-skill/src/modules/ambient.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  // Each ambient mark's own period and phase: two low-discrepancy sequences, so no two of 24 are alike (React's ambientTiming).
  function ambient() {
    var frac = function (v) { return v - Math.floor(v); };
    document.querySelectorAll('.stage-art [data-ambient], .framed-frame [data-ambient]').forEach(function (el, i) {
      if (i >= 24) { el.removeAttribute('data-ambient'); return; }
      el.style.setProperty('--_k', (0.6 + 0.8 * frac((i + 1) * 0.6180339887498949)).toFixed(3));
      el.style.setProperty('--_ph', frac((i + 1) * 0.7548776662466927).toFixed(3));
    });
  }

  _.step(61, 'ambient', ambient);
})(window.Basalt);
