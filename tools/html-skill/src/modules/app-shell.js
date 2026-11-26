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
        // A shell with data-rail keeps the rail at every width from 720 (React's AppShell rail).
        var on = rail.matches || shell.hasAttribute('data-rail');
        shell.querySelectorAll('.app-sidebar .nav').forEach(function (nav) {
          nav.toggleAttribute('data-collapsed', on);
          nav.querySelectorAll('.nav-item').forEach(function (item) {
            var label = item.querySelector('.nav-label');
            if (on && label) {
              item.setAttribute('data-tooltip', label.textContent.trim());
              item.setAttribute('data-tooltip-side', 'right');
            } else {
              item.removeAttribute('data-tooltip');
              item.removeAttribute('data-tooltip-side');
            }
          });
        });
        // The version at the foot: in the rail the number alone, so the tooltip says the whole line (DECISIONS 320).
        shell.querySelectorAll('.app-sidebar .version-link').forEach(function (link) {
          var word = link.querySelector('.version-link-word');
          var number = link.querySelector('.version-link-number');
          var date = link.querySelector('.version-link-date time');
          if (on) {
            link.setAttribute('data-tooltip', (word ? word.textContent.trim() + ' ' : '') + (number ? number.textContent.trim() : '') + (date ? ' · ' + date.textContent.trim() : ''));
            link.setAttribute('data-tooltip-side', 'right');
          } else {
            link.removeAttribute('data-tooltip');
            link.removeAttribute('data-tooltip-side');
          }
        });
      });
    }
    rail.addEventListener('change', sync);
    sync();
  });

  // The title on a phone (React's AppHeader phoneTitle="page"): the page's head, built from the bar's title and facts as the first child of the shell's main,
  // drawn under 720 only; and the bar's echo of the title, shown once the page's title has passed under the bar's real bottom edge (one IntersectionObserver,
  // re-armed on resize). With no script the bar keeps its own title.
  _.step(56, 'buildPhoneTitle', function () {
    document.querySelectorAll('.app-shell .app-header[data-phone-title="page"]').forEach(function (header) {
      var title = header.querySelector('.app-title');
      var main = header.closest('.app-shell').querySelector('.app-main');
      if (!title || !main || header.__bhTitle) return;
      header.__bhTitle = true;
      var head = document.createElement('div');
      head.className = 'app-page-head';
      head.setAttribute('data-phone-only', '');
      var h1 = document.createElement('h1');
      h1.className = 'app-page-title';
      h1.tabIndex = -1;
      h1.textContent = title.textContent.trim();
      head.appendChild(h1);
      var facts = header.querySelector('.app-facts');
      if (facts) {
        var again = facts.cloneNode(true);
        again.removeAttribute('id');
        again.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
        head.appendChild(again);
      }
      main.insertBefore(head, main.firstChild);
      // The bar's own title gives way under 720 only now that the page has one.
      header.setAttribute('data-phone-title-ready', '');
      var echo = document.createElement('span');
      echo.className = 'app-echo';
      echo.setAttribute('aria-hidden', 'true');
      echo.textContent = h1.textContent;
      var bar = header.querySelector('.app-bar');
      bar.insertBefore(echo, bar.firstChild);
      if (typeof IntersectionObserver === 'undefined') return;
      var observer;
      function arm() {
        if (observer) observer.disconnect();
        var edge = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
        observer = new IntersectionObserver(function (entries) {
          var e = entries[0];
          var shown = e.boundingClientRect.height > 0 && !e.isIntersecting && e.boundingClientRect.bottom <= (e.rootBounds ? e.rootBounds.top : edge);
          echo.toggleAttribute('data-shown', shown);
        }, { rootMargin: '-' + edge + 'px 0px 0px 0px' });
        observer.observe(h1);
      }
      arm();
      addEventListener('resize', arm);
    });
  });
})(window.Basalt);
