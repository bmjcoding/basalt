/* Basalt HTML script, nav module: each .nav gets its shared hover pill (React's GlidePlate for navigation) and each label its reserved 600 width.
   The pill is one element the list draws and glide.js moves between the hugging pills of the items (150ms, ease-out); each item paints its own pill as
   the fallback, and that stays the whole story with no script, on touch, under reduced motion and in forced colours. The first key hides the hover
   (the focus ring shows) until the pointer moves again. Wired by class; a list added later is wired with Basalt.nav(list).
   Source: tools/html-skill/src/modules/nav.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  /** Wires one .nav: the label widths, and the shared pill. Safe to call twice. */
  function wire(nav) {
    if (nav.__bhNav) return;
    nav.__bhNav = true;
    nav.querySelectorAll('.nav-label').forEach(function (label) { label.setAttribute('data-label', label.textContent); });
    var plate = document.createElement('span');
    plate.className = 'plate';
    plate.setAttribute('aria-hidden', 'true');
    nav.insertBefore(plate, nav.firstChild);
    _.glide(nav, plate, { active: '.nav-item[data-hovered]', item: '.nav-item', shape: '.nav-pill' });
  }

  B.nav = wire;
  _.step(50, 'wireNav', function () { document.querySelectorAll('.nav').forEach(wire); });
})(window.Basalt);
