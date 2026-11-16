/* Basalt HTML script, topbar module: the skip link under a bar that is not at the top of the viewport (DECISIONS 142). When the page's skip link takes focus it reads the real bottom
   edge of the first .topbar or .app-header and sits space-2 below it, and reads it again on scroll and on resize while it holds focus: a notice above the bar scrolls away and the bar
   then sticks at the top. With no script, or no bar, the link is where the stylesheet puts it (under a bar at the viewport's top). React's SkipLink does the same.
   Source: tools/html-skill/src/modules/topbar.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  function wireSkipLink() {
    var link = document.querySelector('.skip-link');
    if (!link || link.__bhSkip) return;
    link.__bhSkip = true;
    function place() {
      var bar = document.querySelector('.topbar, .app-header');
      if (bar) link.style.top = 'calc(' + Math.max(0, bar.getBoundingClientRect().bottom) + 'px + var(--basalt-space-2))';
      else link.style.removeProperty('top');
    }
    link.addEventListener('focus', function () {
      place();
      window.addEventListener('scroll', place, { capture: true, passive: true });
      window.addEventListener('resize', place);
    });
    link.addEventListener('blur', function () {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      link.style.removeProperty('top');
    });
  }

  _.step(35, 'wireSkipLink', wireSkipLink);
})(window.Basalt);
