/* Basalt HTML script, palettes module (cimip-gaps-3 T9, React's PaletteChoiceControl and PaletteMenuGroup): the palette choice (.palette-choice, a radio
   group of two to four words) and a menu group of radio rows ([data-palette-group], each row [data-palette-value]). The ids, the default and the URL policy
   are the metas compose writes (basalt-palettes, basalt-palette-default, basalt-palette-url). A saved choice is localStorage's basalt-palette (the default is
   nothing saved); a link's ?palette= is this tab's (sessionStorage's basalt-palette-url) until a choice saves. Choosing the palette already shown saves it
   too. The menu stays open on a choice. Basalt.paletteChoice() and Basalt.setPalette(id) read and write it from script. Nothing is announced. */
(function (B) {
  'use strict';
  var _ = B._;
  var KEY = 'basalt-palette';
  var URL_KEY = 'basalt-palette-url';

  function meta(n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.getAttribute('content') || '' : ''; }
  function config() {
    var ids = meta('basalt-palettes').split(/\s+/).filter(Boolean);
    var d = meta('basalt-palette-default');
    return { ids: ids, def: ids.indexOf(d) < 0 ? ids[0] : d, url: meta('basalt-palette-url') !== 'off' };
  }
  function get(s, k) { try { return s().getItem(k); } catch (e) { return null; } }
  /** [id, source]: a link's palette (when the URL policy is on), then a saved one, then the default; an id not listed is ignored. */
  function resolve() {
    var c = config();
    var ok = function (v) { return !!v && c.ids.indexOf(v) >= 0; };
    if (c.url) {
      var p = null;
      try { p = new URLSearchParams(location.search).get('palette'); } catch (e) { /* no location */ }
      if (ok(p)) return [p, 'url'];
      p = get(function () { return sessionStorage; }, URL_KEY);
      if (ok(p)) return [p, 'url'];
    } else if (get(function () { return sessionStorage; }, URL_KEY) !== null) {
      try { sessionStorage.removeItem(URL_KEY); } catch (e) { /* blocked */ }
    }
    var s = get(function () { return localStorage; }, KEY);
    if (s === null && B.__palette) s = B.__palette;
    return ok(s) ? [s, 'stored'] : [c.def, 'default'];
  }
  function apply() {
    var r = resolve(), root = document.documentElement;
    if (!r[0]) return;
    root.setAttribute('data-palette', r[0]);
    root.setAttribute('data-palette-source', r[1]);
    document.querySelectorAll('.palette-choice [role="radio"]').forEach(function (b) {
      var on = b.getAttribute('data-value') === r[0];
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll('[data-palette-group] [data-palette-value]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-palette-value') === r[0])); });
    document.querySelectorAll('[data-palette-note]').forEach(function (n) { n.hidden = r[1] !== 'url'; });
  }
  function setPalette(id) {
    var c = config();
    if (c.ids.indexOf(id) < 0) return;
    B.__palette = id === c.def ? null : id;
    try { if (id === c.def) localStorage.removeItem(KEY); else localStorage.setItem(KEY, id); } catch (e) { /* storage blocked: the choice lasts for the page */ }
    try { sessionStorage.removeItem(URL_KEY); } catch (e) { /* blocked */ }
    try {
      var u = new URL(location.href);
      if (u.searchParams.has('palette')) { u.searchParams.delete('palette'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }
    } catch (e) { /* no history */ }
    apply();
  }
  function wire() {
    document.querySelectorAll('.palette-choice [role="radiogroup"]').forEach(function (group) {
      if (group.__bhPalette) return;
      group.__bhPalette = true;
      // A press on any word saves it, the one already shown included (a radio reports no second choice of its own value).
      group.addEventListener('click', function (e) { var r = e.target.closest('[role="radio"]'); if (r) setPalette(r.getAttribute('data-value')); });
      group.addEventListener('keydown', function (e) {
        var ids = [].map.call(group.querySelectorAll('[role="radio"]'), function (b) { return b.getAttribute('data-value'); });
        var at = ids.indexOf(resolve()[0]), n = ids.length;
        var rtl = getComputedStyle(group).direction === 'rtl';
        var step = { ArrowRight: rtl ? -1 : 1, ArrowDown: 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: -1 }[e.key];
        var next = step ? (at + step + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
        if (next < 0) return;
        e.preventDefault();
        setPalette(ids[next]);
        group.querySelector('[data-value="' + ids[next] + '"]').focus();
      });
    });
    document.querySelectorAll('[data-palette-group]').forEach(function (g) {
      if (g.__bhPalette) return;
      g.__bhPalette = true;
      // The menu stays open, so the change is seen.
      g.addEventListener('click', function (e) { var r = e.target.closest('[data-palette-value]'); if (r) { e.stopPropagation(); setPalette(r.getAttribute('data-palette-value')); } });
    });
    if (!document.documentElement.__bhPalette) {
      document.documentElement.__bhPalette = true;
      addEventListener('storage', function (e) { if (e.key === null || e.key === KEY) apply(); });
    }
    apply();
  }

  B.paletteChoice = function () { return resolve()[0]; };
  B.setPalette = setPalette;
  _.step(63, 'wirePalettes', wire);
})(window.Basalt);
