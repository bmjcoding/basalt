/* Basalt HTML script, range module: sets --_x, the width of the filled part of the track in pixels, on each input[type=range]. */
(function (B) {
  'use strict';
  var _ = B._;
  var THUMB = 16;

  // The fill runs from the track's start to the thumb's centre, which travels from half a thumb in to half a thumb short of the end.
  function setFill(el) {
    var min = Number(el.min) || 0, max = el.max === '' ? 100 : Number(el.max);
    var p = max > min ? (el.value - min) / (max - min) : 0;
    el.style.setProperty('--_x', THUMB / 2 + (el.clientWidth - THUMB) * p + 'px');
  }

  function wireRange() {
    document.querySelectorAll('input[type="range"]').forEach(function (el) {
      if (el.__bh) return;
      el.__bh = true;
      el.addEventListener('input', function () { setFill(el); });
      // The width can change with the page; the observer also runs once, which draws the first fill.
      new ResizeObserver(function () { setFill(el); }).observe(el);
    });
  }

  _.step(70, 'wireRange', wireRange);
})(window.Basalt);
