/* Basalt HTML script, tabs module: [data-tabs] with arrow keys, Home and End. A .tabs row is wrapped in its scrollport (.tabs-scroll) when the page left
   it out, and a focused tab is brought fully into view with its ring (DECISIONS 358). A reader's change of tab dispatches `tabchange` from the root
   ({ value: the panel's id, tab, panel }); `Basalt.selectTab` selects by script with no event. The address's fragment selects the panel that is or holds
   its target: on load (then scrolled to, at once, on a new navigation only), at a same-page link's click (before the browser goes to the target, so it
   lands on a shown panel by its own means) and on Back and Forward (never scrolled: the browser restores the reader's place). `data-tabs-hash` on a root
   mirrors its chosen panel into the fragment, by replace (m7, U1 and U3). */
(function (B) {
  'use strict';
  var _ = B._;
  // Every wired group ({ tabs, panelOf, select }), made the first time a group is wired; the document's and window's listeners are added then too.
  var groups = null;

  // The element a fragment names, or null; a malformed escape names nothing.
  function fragmentTarget(hash) {
    if (!hash || hash.length < 2) return null;
    var id;
    try { id = decodeURIComponent(hash.slice(1)); } catch (e) { return null; }
    return document.getElementById(id);
  }

  // Every group with a panel that is the fragment's target, or holds it, selects that panel: no focus move, no event, no write to the address. A group
  // whose panels hold nothing it names stays as it is. Returns the target when one of the panels holds it.
  function follow(hash) {
    var target = fragmentTarget(hash), shown = null;
    if (!target || !groups) return null;
    groups.forEach(function (g) {
      for (var i = 0; i < g.tabs.length; i++) {
        var panel = g.panelOf(g.tabs[i]);
        if (panel && (panel === target || panel.contains(target))) { g.select(g.tabs[i], false); shown = target; return; }
      }
    });
    return shown;
  }

  // A plain primary click, not prevented, on a link to a fragment of this document: show its panel now, before the browser goes to the target. The
  // browser then pushes its entry, scrolls with the page's own scroll-behavior and scroll-padding, and moves :target and focus. Nothing is prevented.
  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !(a instanceof HTMLAnchorElement) || a.hasAttribute('download')) return;
    var target = a.getAttribute('target');
    if (target && target !== '_self') return;
    if (a.origin !== location.origin || a.pathname !== location.pathname || a.search !== location.search || a.hash.length < 2) return;
    follow(a.hash);
  }

  // Back and Forward between fragments, a fragment set by script, a link whose click never reached the document: select, never scroll.
  function onTraverse() { follow(location.hash); }

  function start() {
    groups = [];
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onTraverse);
    window.addEventListener('hashchange', onTraverse);
  }

  // A load reached by a new navigation (not a reload, not Back or Forward), where the browser tried to reach the fragment before the panels were set.
  function newNavigation() {
    var entry = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
    return !entry || entry.type === 'navigate';
  }

  B.selectTab = function (target) {
    if (!groups) return false;
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) return false;
    for (var n = 0; n < groups.length; n++) {
      var g = groups[n];
      for (var i = 0; i < g.tabs.length; i++) {
        if (g.tabs[i] === el || g.panelOf(g.tabs[i]) === el) { g.select(g.tabs[i], false); return true; }
      }
    }
    return false;
  };

  function wireTabs() {
    var first = !groups, wired = false;
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      if (root.__bh) return;
      root.__bh = true;
      var list = root.querySelector('[role="tablist"]');
      if (!list) return;
      if (!groups) start();
      wired = true;
      // The row scrolls in its own scrollport, whose padding keeps the ring's room on every side: a page that wrote the row alone gets one.
      if (list.classList.contains('tabs') && !(list.parentElement && list.parentElement.classList.contains('tabs-scroll'))) {
        var scroll = document.createElement('div');
        scroll.className = 'tabs-scroll';
        list.parentNode.insertBefore(scroll, list);
        scroll.appendChild(list);
      }
      // The port's padding is the ring's room, and a scrollport shows content through it: while content is hidden past a side, that side is clipped at the
      // column's edge (the content edge, and the hang on the start side), so a cut tab and the divider stop there. A side with nothing past it keeps its room.
      // Each side that hides tabs fades inside its clip line (cimip-gaps-3 t7, core's scrollFade): the clip stays the bound and the hit-test edge, and a
      // focused tab with its ring is never under the band.
      var port = list.parentElement && list.parentElement.classList.contains('tabs-scroll') ? list.parentElement : null;
      if (port) {
        var clip = function () {
          var box = port.getBoundingClientRect(), at = list.getBoundingClientRect(), st = getComputedStyle(port);
          var pl = parseFloat(st.paddingLeft) || 0, pr = parseFloat(st.paddingRight) || 0;
          var hl = Math.max(0, -(parseFloat(st.marginLeft) || 0) - pl), hr = Math.max(0, -(parseFloat(st.marginRight) || 0) - pr);
          var rtl = st.direction === 'rtl';
          var l = at.left < box.left + port.clientLeft + pl - 0.5 ? pl + (rtl ? 0 : hl) : 0;
          var r = at.right > box.left + port.clientLeft + port.clientWidth - pr + 0.5 ? pr + (rtl ? hr : 0) : 0;
          port.style.setProperty('--clip-left', l + 'px');
          port.style.setProperty('--clip-right', r + 'px');
          port.toggleAttribute('data-clip', l > 0 || r > 0);
          return { left: l, right: r };
        };
        var fade = _.scrollFade(port, { axis: 'inline', content: list, insets: clip, ring: 4 });
        // A tab that takes focus (the arrows, Home, End, Tab into the row, a click on a cut tab) is brought into view by the nearest way, measured from the
        // column's edges (the clip lines), its scroll-margin-inline (the fade and the ring's room) kept clear. The keys focus without the browser's own scroll.
        list.addEventListener('focusin', function (e) {
          if (e.target.getAttribute('role') === 'tab') { _.revealIn(port, e.target, clip()); fade.refresh(); }
        });
      }
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
      // A reader's change (a click or a key): one event, and with data-tabs-hash the fragment by replace (no hashchange, so no echo; the entry's state
      // is kept, and an address that refuses loses the mirror and nothing else). The tab already chosen changes nothing.
      var choose = function (tab, focus) {
        var changed = tab.getAttribute('aria-selected') !== 'true';
        select(tab, focus);
        if (!changed) return;
        var panel = panelOf(tab);
        if (panel && panel.id && root.hasAttribute('data-tabs-hash')) {
          try { history.replaceState(history.state, '', '#' + encodeURIComponent(panel.id)); } catch (e) { /* the mirror is lost, nothing else */ }
        }
        root.dispatchEvent(new CustomEvent('tabchange', { bubbles: true, detail: { value: panel ? panel.id : '', tab: tab, panel: panel } }));
      };
      tabs.forEach(function (tab) {
        tab.type = 'button';
        _.reserve(tab);
        tab.addEventListener('click', function () { choose(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var i = tabs.indexOf(tab);
          var rtl = getComputedStyle(list).direction === 'rtl';
          var next = { ArrowRight: rtl ? i - 1 : i + 1, ArrowLeft: rtl ? i + 1 : i - 1, Home: 0, End: tabs.length - 1 }[e.key];
          if (next == null) return;
          e.preventDefault();
          choose(tabs[(next + tabs.length) % tabs.length], true);
        });
      });
      select(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0], false);
      groups.push({ tabs: tabs, panelOf: panelOf, select: select });
    });
    if (!wired) return;
    // The document's fragment, on wiring. Only a new navigation is scrolled, at once (a load is a page change): on a reload or a traversal the browser's
    // own restored place stands. This is the script's only scroll.
    var shown = follow(location.hash);
    if (first && shown && newNavigation()) shown.scrollIntoView({ behavior: 'instant' });
  }

  _.step(90, 'wireTabs', wireTabs);
})(window.Basalt);
