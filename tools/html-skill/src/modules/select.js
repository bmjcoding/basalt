/* Basalt HTML script, select module: which input lit the row. In the styled list of a native select (select.css) one row is lit at a time, by
   whichever of the pointer and the keys moved last, as React's Select does. Chromium keeps focus where the keys left it while the pointer hovers
   another row, so CSS alone would light both; this writes data-input="pointer" or "key" on the select for CSS to read.
   Source: tools/html-skill/src/modules/select.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var wired = false;

  function mark(event, how) {
    var select = event.target.closest && event.target.closest('select.input');
    if (select && select.getAttribute('data-input') !== how) select.setAttribute('data-input', how);
  }

  _.step(65, 'select', function () {
    if (wired) return;
    wired = true;
    document.addEventListener('pointermove', function (e) { mark(e, 'pointer'); });
    document.addEventListener('pointerdown', function (e) { mark(e, 'pointer'); });
    document.addEventListener('keydown', function (e) { mark(e, 'key'); });
  });
})(window.Basalt);
