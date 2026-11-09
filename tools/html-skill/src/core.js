/* Basalt HTML script, the core: window.Basalt, icons, the theme, announce, init. Plain, dependency-free, opt-in by attribute.
   Call Basalt.init({ palette }) once, at the end of <body> (compose.mjs adds the call unless the page makes it). It wires only
   what the page opts into. The parts a page uses only sometimes are modules (src/modules/*.js, one IIFE each) that join
   through Basalt._ and add a step to init; compose.mjs includes the ones the markup needs:
     [data-theme-toggle]                      theme            theme button (dark and light, remembered)
     [data-tabs] > [role=tablist] > [role=tab][aria-controls]   tabs  arrow keys, Home and End
     button[data-disclosure][aria-controls]   disclosure       show and hide the element it controls
     [data-copy="#id"] or [data-copy-text]    copy             copy button
     [data-open-palette]                      palette          opens the command palette (also Cmd/Ctrl+K)
     <i data-icon="Info"></i>                 core             inline Phosphor icon, 16px (data-size to change; Bold under 20px, Regular from 20px)
     <span data-kbd="⌘ K"></span>             kbd              a shortcut: one chip per key
     <braille-spinner label="Loading">        braille          the braille spinner
   Source: tools/html-skill/src/core.js (do not edit the copy in the skill folder). */
(function () {
  'use strict';

  // Only the icons the page names (compose.mjs adds them with Basalt._.addIcons). Name -> [Bold paths, Regular paths].
  var ICONS = {};
  // Steps init runs, in order: [order, name, function(options)]. A module adds its own.
  var steps = [];
  // Called after the theme changes (the theme toggle's icon follows it).
  var onTheme = [];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* ------------------------------------------------------------------ icons */

  var warned = {};

  /** Inline SVG string. Phosphor, 256 grid, drawn in currentColor: Bold under 20px, Regular from 20px. A label makes it an image;
      without one it is decorative. The size is coerced to a finite positive number (16 otherwise). An unknown name warns once
      and draws nothing; it never throws. */
  function icon(name, opts) {
    var o = opts || {};
    var weights = Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : null;
    if (!weights) {
      if (!warned[name]) { warned[name] = 1; console.warn('Basalt: unknown icon "' + name + '" (on this page: ' + Object.keys(ICONS).join(', ') + '; name an icon in quotes in the page, or add it to icons.json, and compose again)'); }
      return '';
    }
    var size = Number(o.size);
    if (!(size > 0 && size < Infinity)) size = 16;
    var paths = weights[size >= 20 ? 1 : 0];
    var a11y = o.label ? 'role="img" aria-label="' + esc(o.label) + '"' : 'aria-hidden="true"';
    return '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="' + size + '" height="' + size +
      '" fill="currentColor" ' + a11y + ' focusable="false">' + paths.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
  }

  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      el.outerHTML = icon(el.dataset.icon, { size: Number(el.dataset.size || 16), label: el.dataset.label });
    });
  }

  /* ------------------------------------------------------------------ theme */

  var THEME_KEY = 'basalt-theme';

  function getTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function setTheme(theme, persist) {
    var t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    if (persist !== false) { try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* storage blocked: the choice lasts for the page */ } }
    onTheme.forEach(function (f) { f(); });
    return t;
  }

  /** The stored choice, else the system's. Safe to call twice. (The head snippet compose.mjs writes does this before first paint.) */
  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    var t = stored === 'light' || stored === 'dark' ? stored : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    return t;
  }

  function toggleTheme() { return setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  /* --------------------------------------------------------------- announce */

  /** Says something to a screen reader through one polite live region. */
  function announce(text) {
    var live = document.getElementById('basalt-live');
    if (!live) {
      live = document.createElement('div');
      live.id = 'basalt-live';
      live.className = 'visually-hidden';
      live.setAttribute('role', 'status');
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(function () { live.textContent = text; }, 30);
  }

  /* ------------------------------------------------------------------ print */

  /** A page prints in the light theme whatever it shows, and goes back after; the stored choice is never touched. */
  function wirePrint() {
    if (document.documentElement.__bhPrint) return;
    document.documentElement.__bhPrint = true;
    var before = null;
    // A second beforeprint inside one print session must not take the temporary light theme for the page's own.
    window.addEventListener('beforeprint', function () {
      if (before !== null) return;
      before = getTheme();
      if (before !== 'light') setTheme('light', false);
    });
    window.addEventListener('afterprint', function () { if (before) setTheme(before, false); before = null; });
  }

  /* ------------------------------------------------------------------- init */

  /** Adds a step to init. Lower orders run first: the order is the one the wiring needs (icons are drawn before a copy button reads its label). */
  function step(order, name, fn) { steps.push([order, name, fn]); }

  step(10, 'initTheme', initTheme);
  step(40, 'hydrateIcons', function () { hydrateIcons(); });
  step(100, 'wirePrint', wirePrint);

  /**
   * One call for a page. Runs now, or on DOMContentLoaded if the document is still loading.
   *   Basalt.init({ palette: { groups: [...] } })   // palette is optional
   */
  function init(options) {
    var o = options || {};
    // Each step runs on its own: one failing never leaves the rest of the page unwired. init never throws.
    var run = function () {
      steps.slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (s) {
        try { s[2](o); } catch (e) { console.warn('Basalt: ' + s[1] + ' failed: ' + (e && e.message)); }
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }

  window.Basalt = {
    init: init, icon: icon, hydrateIcons: hydrateIcons, announce: announce,
    getTheme: getTheme, setTheme: setTheme, toggleTheme: toggleTheme,
    // For the modules and compose.mjs; not part of the page API.
    _: { esc: esc, icon: icon, announce: announce, getTheme: getTheme, setTheme: setTheme, step: step, onTheme: onTheme, addIcons: function (data) { for (var k in data) ICONS[k] = data[k]; } }
  };
})();
