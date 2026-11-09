/* Basalt HTML script, tabs module: [data-tabs] with arrow keys, Home and End. */
(function (B) {
  'use strict';
  var _ = B._;

  function wireTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      if (root.__bh) return;
      root.__bh = true;
      var list = root.querySelector('[role="tablist"]');
      if (!list) return;
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
        if (focus) tab.focus();
      };
      tabs.forEach(function (tab) {
        tab.type = 'button';
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
