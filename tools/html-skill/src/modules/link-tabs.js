/* Basalt HTML script, link-tabs module: the select that replaces a link-tabs row under 720px wide (React's LinkTabs, DECISIONS 154, A15 and 158, Q2). The select's options are the
   links, by href, and its value is the current link's, read from `aria-current` whenever it is needed (at wiring, whenever `aria-current` moves, and after a cancelled navigation).
   It navigates at once and says so first: "Go to" (the text of .link-tabs-select-label, which a page may replace) is drawn before the page's name and starts the select's accessible
   name, which the script keeps as the words and the chosen page's name. Only a real choice navigates: a choice from the open list (a click, or Enter on the highlighted option),
   which reaches the page as a `change` with no key pressed on the closed select. A key on the closed select (a typed letter, an arrow, Home, End, a Page key) can change a native
   select's value and fire `change` at once in some browsers; the script holds those: the value goes back to the current page and nothing navigates. A real choice dispatches a cancelable
   `linktabsnavigate` event ({ detail: { href } }) from the nav first, so a page that routes itself can take over with preventDefault() (focus then stays on the select); otherwise
   the script does window.location.assign(href), a new page, where focus starts over. Source: tools/html-skill/src/modules/link-tabs.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  // Keys that do not change a closed select's value; every other key held down is treated as one that may.
  var QUIET = { Tab: 1, Shift: 1, Control: 1, Alt: 1, Meta: 1, Escape: 1, Enter: 1 };

  /** The href of the link that is the current page right now: read when it is needed, since a page that routes itself moves `aria-current` after the script wired. */
  function currentHref(nav) {
    var current = nav.querySelector('a[aria-current="page"]');
    return current ? current.getAttribute('href') : null;
  }

  /** The label (the element before the underline) is drawn through reserve(), as a tab's is: the current link's 600 is on the label and every label holds its 600 width, so no link moves. */
  function reserveLabels() {
    document.querySelectorAll('.link-tab').forEach(function (link) {
      if (link.__bhReserved) return;
      link.__bhReserved = true;
      var label = link.querySelector(':scope > :not(.link-tab-line)');
      if (label) _.reserve(label);
    });
  }

  function wire() {
    document.querySelectorAll('.link-tabs').forEach(function (nav) {
      var select = nav.querySelector('.link-tabs-select select');
      if (!select || select.__bhLinkTabs) return;
      select.__bhLinkTabs = true;
      var label = nav.querySelector('.link-tabs-select-label');
      var holder = select.parentNode;
      // The name is the visible words, then the chosen page's name (WCAG 2.5.3: the visible label is in the name).
      var name = function () {
        var option = select.options[select.selectedIndex];
        if (label && option) select.setAttribute('aria-label', label.textContent.trim() + ' ' + option.textContent.trim());
      };
      // The select always agrees with the row: at wiring, when the current link moves (a router changing aria-current), and when a navigation is cancelled or held.
      var agree = function () { var href = currentHref(nav); if (href !== null && select.value !== href) select.value = href; name(); };
      // The select's start padding clears the label: measured whenever the label has a size (it has none while the row is shown), so a font arriving moves nothing.
      if (label && window.ResizeObserver) new ResizeObserver(function () { var w = label.getBoundingClientRect().width; if (w > 0) holder.style.setProperty('--_lead', w + 'px'); }).observe(label);
      agree();
      new MutationObserver(agree).observe(nav, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
      // A key on the closed select is held for the rest of the task, so the `change` it fires (some browsers fire one on the first arrow or letter) is told from a choice in the open list.
      var keyed = false;
      select.addEventListener('keydown', function (event) {
        if (QUIET[event.key]) return;
        keyed = true;
        setTimeout(function () { keyed = false; }, 0);
      }, true);
      select.addEventListener('change', function () {
        if (keyed) { agree(); return; }
        name();
        // Checked before anything hears of it: a refused link dispatches no event and goes nowhere, and the select shows the page you are on.
        var href = _.safeHref(select.value);
        if (href === null) { console.warn('Basalt: a link tab must be relative, http, https, mailto or tel'); agree(); return; }
        var event = new CustomEvent('linktabsnavigate', { bubbles: true, cancelable: true, detail: { href: href } });
        if (nav.dispatchEvent(event)) window.location.assign(href);
        // The page stays (a router took over): the select shows the page you are on now, which the router may already have moved.
        else agree();
      });
    });
  }

  _.step(45, 'wireLinkTabs', wire);
  // After the glyphs are drawn (step 45), as a tab's and a segment's are (step 90).
  _.step(90, 'reserveLinkTabLabels', reserveLabels);
})(window.Basalt);
