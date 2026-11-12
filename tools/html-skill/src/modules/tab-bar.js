/* Basalt HTML script, tab-bar module: each label reserves its 600 width (data-label), and the first key hides the glyph's hover circle until the pointer moves
   again (the ring is the cue; React's useKeysMark). A row in More's sheet closes it, as React's does on a navigation. Wired by class. More's sheet is the sheet
   module's, opened by the More cell's data-dialog-open.
   Source: tools/html-skill/src/modules/tab-bar.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  _.step(55, 'wireTabBar', function () {
    document.querySelectorAll('.tab-bar').forEach(function (bar) {
      if (bar.__bhTabBar) return;
      bar.__bhTabBar = true;
      bar.querySelectorAll('.tab-bar-label').forEach(function (label) { label.setAttribute('data-label', label.textContent); });
      bar.querySelectorAll('.tab-bar-item[data-dialog-open]').forEach(function (more) {
        var sheet = document.querySelector(more.getAttribute('data-dialog-open'));
        if (sheet) sheet.addEventListener('click', function (e) { if (e.target.closest('.nav-item')) sheet.close(); });
      });
      document.addEventListener('keydown', function (e) { if (!/^(Shift|Control|Alt|Meta)$/.test(e.key)) bar.setAttribute('data-keys', ''); }, { capture: true, passive: true });
      var pointer = function () { bar.removeAttribute('data-keys'); };
      document.addEventListener('pointermove', pointer, { capture: true, passive: true });
      document.addEventListener('pointerdown', pointer, { capture: true, passive: true });
    });
  });
})(window.Basalt);
