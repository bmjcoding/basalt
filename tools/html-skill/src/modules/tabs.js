/* Basalt HTML script, tabs module: [data-tabs] with arrow keys, Home and End. A .tabs row is wrapped in its scrollport (.tabs-scroll) when the page left
   it out, and a focused tab is brought fully into view with its ring (DECISIONS 358). */
(function (B) {
  'use strict';
  var _ = B._;

  function wireTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      if (root.__bh) return;
      root.__bh = true;
      var list = root.querySelector('[role="tablist"]');
      if (!list) return;
      // The row scrolls in its own scrollport, whose padding keeps the ring's room on every side: a page that wrote the row alone gets one.
      if (list.classList.contains('tabs') && !(list.parentElement && list.parentElement.classList.contains('tabs-scroll'))) {
        var scroll = document.createElement('div');
        scroll.className = 'tabs-scroll';
        list.parentNode.insertBefore(scroll, list);
        scroll.appendChild(list);
      }
      // The browser's own scroll on focus moves only a tab that is wholly out of view, and centres it: a partly cut tab stays cut. So the keys focus
      // without it, and one listener brings any tab that takes focus (the arrows, Home, End, Tab into the row, a click on a cut tab) into view by the
      // nearest way, its scroll-margin-inline (the ring's 4 and a hairline) kept clear.
      list.addEventListener('focusin', function (e) {
        if (e.target.getAttribute('role') === 'tab') e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      var panelOf = function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); };
      var select = function (tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          var panel = panelOf(t);
          if (panel) { panel.hidden = !on; panel.tabIndex = 0; panel.setAttribute('role', 'tabpanel'); }
        });
        if (focus) tab.focus({ preventScroll: true });
      };
      tabs.forEach(function (tab) {
        tab.type = 'button';
        _.reserve(tab);
        tab.addEventListener('click', function () { select(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var i = tabs.indexOf(tab);
          var rtl = getComputedStyle(list).direction === 'rtl';
          var next = { ArrowRight: rtl ? i - 1 : i + 1, ArrowLeft: rtl ? i + 1 : i - 1, Home: 0, End: tabs.length - 1 }[e.key];
          if (next == null) return;
          e.preventDefault();
          select(tabs[(next + tabs.length) % tabs.length], true);
        });
      });
      select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0], false);
    });
  }

  _.step(90, 'wireTabs', wireTabs);
})(window.Basalt);
