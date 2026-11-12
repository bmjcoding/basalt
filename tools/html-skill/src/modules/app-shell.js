/* Basalt HTML script, app-shell module: the rail. From 720 to 1023 the sidebar is the rail (72 wide): each .nav in it collapses to a circle around its glyph, and
   its label becomes the item's name and a tooltip on its right (the tooltip module). Below 720 the sidebar is gone and above 1023 it is the full form, so the
   tooltips come off. React's AppShell does the same with a media query (NavRailContext); a page needs no script of its own.
   Source: tools/html-skill/src/modules/app-shell.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  _.step(55, 'wireAppShell', function () {
    var shells = document.querySelectorAll('.app-shell');
    if (!shells.length) return;
    var rail = matchMedia('(width < %bp-lg%)');
    function sync() {
      shells.forEach(function (shell) {
        shell.querySelectorAll('.app-sidebar .nav').forEach(function (nav) {
          nav.toggleAttribute('data-collapsed', rail.matches);
          nav.querySelectorAll('.nav-item').forEach(function (item) {
            var label = item.querySelector('.nav-label');
            if (rail.matches && label) {
              item.setAttribute('data-tooltip', label.textContent.trim());
              item.setAttribute('data-tooltip-side', 'right');
            } else {
              item.removeAttribute('data-tooltip');
              item.removeAttribute('data-tooltip-side');
            }
          });
        });
      });
    }
    rail.addEventListener('change', sync);
    sync();
  });
})(window.Basalt);
