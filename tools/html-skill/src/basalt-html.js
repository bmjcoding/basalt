/* Basalt HTML script: plain, dependency-free, opt-in by attribute. Exposes window.Basalt.
   Call Basalt.init({ palette }) once, at the end of <body>. It wires only what the page opts into:
     [data-theme-toggle]                      theme button (dark and light, remembered)
     [data-tabs] > [role=tablist] > [role=tab][aria-controls]   tabs, arrow keys, Home and End
     button[data-disclosure][aria-controls]   show and hide the element it controls
     [data-copy="#id"] or [data-copy-text]    copy button
     [data-open-palette]                      opens the command palette (also Cmd/Ctrl+K)
     <i data-icon="Info"></i>                 inline Phosphor icon, 16px (data-size to change; Bold under 20px, Regular from 20px)
     <span data-kbd="⌘ K"></span>             a shortcut: one chip per key
     <braille-spinner label="Loading">        the braille spinner
   Source: tools/html-skill/src/basalt-html.js (do not edit the copy in the skill folder). */
(function () {
  'use strict';

  var ICONS = /*{{icons}}*/{};

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
      if (!warned[name]) { warned[name] = 1; console.warn('Basalt: unknown icon "' + name + '" (known: ' + Object.keys(ICONS).join(', ') + ')'); }
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
    document.querySelectorAll('[data-theme-toggle]').forEach(syncThemeButton);
    return t;
  }

  /** The stored choice, else the system's. Safe to call twice. (The head snippet in the templates does this before first paint.) */
  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    var t = stored === 'light' || stored === 'dark' ? stored : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', t);
    return t;
  }

  function toggleTheme() { return setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  function syncThemeButton(button) {
    var dark = getTheme() === 'dark';
    // The button shows what a press will switch to, and its name says so too.
    button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    button.innerHTML = icon(dark ? 'Sun' : 'Moon');
  }

  function wireThemeToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      if (button.__bh) return;
      button.__bh = true;
      button.type = 'button';
      button.addEventListener('click', toggleTheme);
      syncThemeButton(button);
    });
  }

  /* -------------------------------------------------------------------- kbd */

  var MOD_ICON = { '⌘': 'Command', '⌥': 'Option', '⌃': 'Control' };
  var KEY_NAME = { '⌘': 'Meta', '⌥': 'Alt', '⌃': 'Control', '⇧': 'Shift', '↵': 'Enter', '↑': 'ArrowUp', '↓': 'ArrowDown', '←': 'ArrowLeft', '→': 'ArrowRight', 'Esc': 'Escape', '⌫': 'Backspace', '⇥': 'Tab' };

  /** One chip. Command, Option and Control are icons; everything else is Geist Mono text. aria-hidden: the control carries aria-keyshortcuts. */
  function kbd(key) {
    return '<kbd class="kbd" aria-hidden="true">' + (MOD_ICON[key] ? icon(MOD_ICON[key], { size: 12 }) : esc(key)) + '</kbd>';
  }

  /** A shortcut: one chip per key, 2px apart. keys is an array such as ['⌘', 'K']. */
  function kbdGroup(keys) {
    return '<span class="kbd-group" aria-hidden="true">' + keys.map(kbd).join('') + '</span>';
  }

  /** ['⌘', 'K'] gives "Meta+K", for aria-keyshortcuts. */
  function keyshortcuts(keys) {
    return keys.map(function (k) { return KEY_NAME[k] || (k.length === 1 ? k.toUpperCase() : k); }).join('+');
  }

  function hydrateKbd() {
    document.querySelectorAll('[data-kbd]').forEach(function (el) {
      el.outerHTML = kbdGroup(el.dataset.kbd.trim().split(/\s+/)).replace('class="kbd-group"', 'class="kbd-group"' + (el.hasAttribute('data-doc') ? ' data-doc' : ''));
    });
  }

  /* ------------------------------------------------------- hardware keyboard */

  // On a touch device (hover: none, pointer: coarse) shortcut chips are hidden by the CSS until a hardware key is
  // pressed. Tab, Escape, or a held Command, Control or Alt sets html[data-keyboard="hardware"] and remembers it for
  // the tab's session. Shift alone, arrows and "Unidentified" (a soft keyboard) do not.
  var KEYBOARD_KEY = 'basalt-keyboard';

  function hardwareKeyboard() { return document.documentElement.getAttribute('data-keyboard') === 'hardware'; }

  function isHardwareKey(e) {
    if (e.isComposing || e.key === 'Unidentified' || e.key === 'Process' || e.key === 'Dead') return false;
    return e.key === 'Tab' || e.key === 'Escape' || e.metaKey || e.ctrlKey || e.altKey;
  }

  /** Restores the session's choice and, while still touch-only, listens (one passive, capture-phase keydown) for the first hardware key. */
  function initKeyboard() {
    var root = document.documentElement;
    try { if (sessionStorage.getItem(KEYBOARD_KEY) === 'hardware') root.setAttribute('data-keyboard', 'hardware'); } catch (e) { /* ignore */ }
    if (hardwareKeyboard() || root.__bhKeys) return;
    root.__bhKeys = true;
    var onKey = function (e) {
      if (!isHardwareKey(e)) return;
      document.removeEventListener('keydown', onKey, true);
      root.setAttribute('data-keyboard', 'hardware');
      try { sessionStorage.setItem(KEYBOARD_KEY, 'hardware'); } catch (err) { /* ignore */ }
    };
    document.addEventListener('keydown', onKey, { capture: true, passive: true });
  }

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

  /* --------------------------------------------------------------- spinners */

  // Braille dots: 1 to 3 down the left column, 4 to 6 down the right, 7 and 8 the bottom row. ⠋ (1, 2, 4) is held under reduced motion.
  var DOT_POS = { 1: [2, 2], 2: [2, 6], 3: [2, 10], 4: [6, 2], 5: [6, 6], 6: [6, 10], 7: [2, 14], 8: [6, 14] };

  function brailleSvg() {
    var dots = '';
    for (var d = 1; d <= 8; d++) {
      dots += '<circle class="braille-dot" data-dot="' + d + '"' + (d === 1 || d === 2 || d === 4 ? ' data-hold' : '') + ' cx="' + DOT_POS[d][0] + '" cy="' + DOT_POS[d][1] + '" r="1.5"/>';
    }
    return '<svg viewBox="0 0 8 16" aria-hidden="true" focusable="false">' + dots + '</svg>';
  }

  function defineElements() {
    if (typeof customElements === 'undefined' || customElements.get('braille-spinner')) return;
    customElements.define('braille-spinner', class extends HTMLElement {
      connectedCallback() {
        if (!this.firstElementChild) this.innerHTML = brailleSvg();
        var label = this.getAttribute('label');
        if (label) { this.setAttribute('role', 'status'); this.setAttribute('aria-label', label); } else this.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /* ------------------------------------------------------------------- copy */

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  /** Copies through a temporary textarea, then puts back the focus and the selection (document or field) it borrowed. */
  function fallbackCopy(text) {
    var active = document.activeElement;
    var sel = getSelection();
    var ranges = [];
    for (var i = 0; i < sel.rangeCount; i++) ranges.push(sel.getRangeAt(i));
    var field = null;
    try { if (active && active.selectionStart != null) field = [active.selectionStart, active.selectionEnd, active.selectionDirection]; } catch (e) { /* not a text field */ }
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;opacity:0';
    var ok = false;
    try {
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand('copy');
    } catch (e) { ok = false; }
    area.remove();
    sel.removeAllRanges();
    ranges.forEach(function (r) { sel.addRange(r); });
    if (active && active.focus && document.contains(active)) active.focus({ preventScroll: true });
    try { if (field) active.setSelectionRange(field[0], field[1], field[2]); } catch (e) { /* ignore */ }
    return ok;
  }

  function wireCopy() {
    document.querySelectorAll('[data-copy], [data-copy-text]').forEach(function (button) {
      if (button.__bh) return;
      button.__bh = true;
      // The resting label is read once, here, so a second press during the feedback can never mistake "Copied" for it.
      var rest = [button.innerHTML, button.getAttribute('aria-label')];
      var iconOnly = button.hasAttribute('data-icon-only');
      button.addEventListener('click', function () {
        var target = button.dataset.copy ? document.querySelector(button.dataset.copy) : null;
        var text = button.dataset.copyText != null ? button.dataset.copyText : (target ? target.textContent : '');
        copyText(text).then(function (ok) {
          button.innerHTML = icon(ok ? 'Check' : 'X') + (iconOnly ? '' : '<span>' + (ok ? 'Copied' : 'Copy failed') + '</span>');
          if (iconOnly) button.setAttribute('aria-label', ok ? 'Copied' : 'Copy failed');
          announce(ok ? 'Copied to clipboard' : 'Could not copy');
          clearTimeout(button.__bhTimer);
          button.__bhTimer = setTimeout(function () {
            button.innerHTML = rest[0];
            if (iconOnly) { if (rest[1] == null) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', rest[1]); }
          }, 1600);
        });
      });
    });
  }

  /* ------------------------------------------------------------- disclosure */

  function wireDisclosure() {
    document.querySelectorAll('button[data-disclosure]').forEach(function (button) {
      if (button.__bh) return;
      button.__bh = true;
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      var open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      button.addEventListener('click', function () {
        var next = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(next));
        panel.hidden = !next;
      });
    });
  }

  /* ------------------------------------------------------------------- tabs */

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

  /* ---------------------------------------------------------------- palette */

  var activePalette = null;
  var paletteSeq = 0;

  /** A palette link may be relative, http, https or mailto. javascript:, data: and the rest are refused. Parsed the way a browser parses it. */
  function safeHref(href) {
    try { return /^(https?|mailto):$/.test(new URL(String(href), 'https://basalt.invalid/').protocol); } catch (e) { return false; }
  }

  /** Keys that belong to an input method editor (composition, or the legacy keyCode 229). They are never commands. */
  function composing(e) { return !!e.isComposing || e.keyCode === 229; }

  /**
   * The binding an item's `keys` draws, or null. A shortcut needs ⌘, ⌃ or ⌥ and one more key: anything else (a bare letter, Shift
   * alone) would fire while a person types, so it warns once and gets no chip and no binding. ⌘ answers to Meta or Ctrl, as ⌘K does.
   * ⌘K and ⌃K (nothing else held) open the palette itself, so an item cannot take them: it warns and gets no chip and no binding too.
   */
  var badKeys = {};
  function binding(item) {
    var keys = item.keys;
    if (!keys) return null;
    var mods = keys.filter(function (k) { return k === '⌘' || k === '⌃' || k === '⌥' || k === '⇧'; });
    var rest = keys.filter(function (k) { return mods.indexOf(k) === -1; });
    if (rest.length !== 1 || !mods.some(function (k) { return k !== '⇧'; })) {
      var id = item.label + keys.join(' ');
      if (!badKeys[id]) { badKeys[id] = 1; console.warn('Basalt: "' + item.label + '" has keys [' + keys.join(' ') + '] that cannot be bound; a shortcut needs ⌘, ⌃ or ⌥ and one more key'); }
      return null;
    }
    var b = { cmd: mods.indexOf('⌘') !== -1, ctrl: mods.indexOf('⌃') !== -1, alt: mods.indexOf('⌥') !== -1, shift: mods.indexOf('⇧') !== -1, key: String(KEY_NAME[rest[0]] || rest[0]).toLowerCase() };
    if ((b.cmd || b.ctrl) && !b.alt && !b.shift && b.key === 'k') {
      var reserved = item.label + keys.join(' ');
      if (!badKeys[reserved]) { badKeys[reserved] = 1; console.warn('Basalt: "' + item.label + '" has keys [' + keys.join(' ') + '], which open the palette; choose another shortcut'); }
      return null;
    }
    return b;
  }

  function inField(el) { return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable); }

  /** Whether a key event came from text entry. The composed path is looked at, not only the target: a field in a shadow root is retargeted to its host. */
  function typingIn(e) {
    var path = e.composedPath ? e.composedPath() : [];
    if (!path.length) path = [e.target];
    return path.some(inField);
  }

  function pressed(b, e) {
    if (b.alt !== e.altKey || b.shift !== e.shiftKey) return false;
    var mods = b.ctrl ? e.ctrlKey && b.cmd === e.metaKey : b.cmd ? e.metaKey !== e.ctrlKey : !e.metaKey && !e.ctrlKey;
    return mods && (String(e.key).toLowerCase() === b.key || (b.key.length === 1 && /^[a-z]$/.test(b.key) && e.code === 'Key' + b.key.toUpperCase()));
  }

  /** Runs an item the way choosing it does, once the palette (if any) is closed. */
  function activate(item, o) {
    if (item.onSelect) item.onSelect(item);
    if (o.onSelect) o.onSelect(item);
    if (item.href) {
      if (safeHref(item.href)) location.href = item.href;
      else console.warn('Basalt: a palette link must be relative, http, https or mailto');
    }
  }

  function matches(item, query) {
    if (!query) return true;
    var hay = (item.label + ' ' + (item.keywords || []).join(' ') + ' ' + (item.hint || '')).toLowerCase();
    return query.toLowerCase().split(/\s+/).filter(Boolean).every(function (t) { return hay.indexOf(t) !== -1; });
  }

  /**
   * Opens the command palette: a modal floating panel at level 2 with the raised input row. No animation.
   * Returns { close }.
   *   openPalette({ groups: [{ label, items: [{ label, icon?, keys?: ['⌘','K'], hint?, keywords?, danger?, href?, onSelect? }] }],
   *                 placeholder?, label?, onSelect?(item), onClose?() })
   */
  function openPalette(options) {
    var o = options || {};
    var groups = o.groups || [];
    if (activePalette) activePalette.close();
    var id = 'bh-palette-' + (++paletteSeq);
    var label = o.label || 'Command palette';
    var opener = document.activeElement;

    var scrim = document.createElement('div');
    scrim.className = 'scrim palette-scrim';
    scrim.innerHTML =
      '<div class="panel float modal palette" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' +
        '<div class="input-row">' + icon('MagnifyingGlass') +
          '<input type="text" role="combobox" aria-expanded="true" aria-controls="' + id + '-list" aria-autocomplete="list" aria-label="' + esc(label) +
          '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(o.placeholder || 'Type a command or search') + '">' +
        '</div>' +
        '<div class="rows palette-list" id="' + id + '-list" role="listbox" aria-label="Results"></div>' +
        '<div class="palette-empty" hidden>No commands match.</div>' +
        '<div class="visually-hidden" role="status"></div>' +
        '<div class="divider" data-kbd-hint></div>' +
        '<div class="palette-footer" id="' + id + '-hints" data-kbd-hint>' +
          '<span>' + kbdGroup(['↑', '↓']) + 'Navigate</span><span>' + kbdGroup(['↵']) + 'Run</span><span>' + kbdGroup(['Esc']) + 'Close</span>' +
        '</div>' +
      '</div>';

    var dialog = scrim.firstElementChild;
    var input = dialog.querySelector('input');
    var list = dialog.querySelector('[role="listbox"]');
    var empty = dialog.querySelector('.palette-empty');
    var status = dialog.querySelector('[role="status"]');
    var flat = [];
    var index = 0;
    var spoken = '';
    var timer;

    /** The result count goes to a live region inside the dialog, once the typing pauses, and only when it changed. */
    function speak(msg) {
      clearTimeout(timer);
      if (msg === spoken) return;
      timer = setTimeout(function () { status.textContent = spoken = msg; }, 400);
    }

    /** The hints footer describes the input only while its chips are showing (never when touch hides them). */
    function syncHints() {
      if (!matchMedia('(hover: none) and (pointer: coarse)').matches || hardwareKeyboard()) input.setAttribute('aria-describedby', id + '-hints');
      else input.removeAttribute('aria-describedby');
    }

    function render() {
      var q = input.value.trim();
      flat = [];
      var html = '';
      groups.forEach(function (g, gi) {
        var items = (g.items || []).filter(function (it) { return matches(it, q); });
        if (!items.length) return;
        var gid = id + '-g' + gi;
        html += '<div role="group"' + (g.label ? ' aria-labelledby="' + gid + '"' : '') + '>';
        if (g.label) html += '<div class="row-group" id="' + gid + '">' + esc(g.label) + '</div>';
        items.forEach(function (it) {
          var n = flat.length;
          flat.push(it);
          var keys = binding(it) ? it.keys : null;
          html += '<div class="row" role="option" id="' + id + '-o' + n + '" data-index="' + n + '" aria-selected="false"' + (it.danger ? ' data-danger' : '') +
            (keys ? ' aria-keyshortcuts="' + esc(keyshortcuts(keys)) + '"' : '') + '>' +
            (it.icon ? icon(it.icon) : '') + '<span class="row-label">' + esc(it.label) + '</span>' +
            (it.hint ? '<span class="row-hint">' + esc(it.hint) + '</span>' : '') + (keys ? kbdGroup(keys) : '') + '</div>';
        });
        html += '</div>';
      });
      list.innerHTML = html;
      list.hidden = flat.length === 0;
      empty.hidden = flat.length !== 0;
      index = Math.min(index, Math.max(flat.length - 1, 0));
      setActive(flat.length ? index : -1, false);
      speak(flat.length ? flat.length + (flat.length === 1 ? ' result' : ' results') : 'No commands match.');
    }

    function setActive(i, scroll) {
      var rows = list.querySelectorAll('[role="option"]');
      rows.forEach(function (r) { r.setAttribute('aria-selected', 'false'); r.removeAttribute('data-active'); });
      if (i < 0 || !rows[i]) { input.removeAttribute('aria-activedescendant'); return; }
      index = i;
      rows[i].setAttribute('aria-selected', 'true');
      rows[i].setAttribute('data-active', '');
      input.setAttribute('aria-activedescendant', rows[i].id);
      if (scroll !== false) rows[i].scrollIntoView({ block: 'nearest' });
    }

    function choose(i) {
      var item = flat[i];
      if (!item) return;
      close();
      activate(item, o);
    }

    var inerted = [];

    /** Puts the page back exactly as it was: listener, dialog, inert, scroll lock. Safe to run twice. */
    function undo() {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey, true);
      scrim.remove();
      inerted.forEach(function (pair) { if (!pair[1]) pair[0].removeAttribute('inert'); });
      inerted = [];
      document.documentElement.style.removeProperty('overflow');
    }

    function close() {
      if (activePalette !== api) return;
      activePalette = null;
      undo();
      if (opener && opener.focus && document.contains(opener)) opener.focus();
      if (o.onClose) o.onClose();
    }

    function onKey(e) {
      if (!scrim.isConnected) return;
      syncHints();
      if (composing(e)) return; // finishing or cancelling a composition is not a command
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) setActive((index + 1) % flat.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) setActive((index - 1 + flat.length) % flat.length); return; }
      // Only a bare Enter runs the highlighted row. With a modifier it is a shortcut for the page, which the shortcut handler sees.
      if (e.key === 'Enter') {
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        if (flat.length) choose(index);
        return;
      }
      if (e.key === 'Tab') { e.preventDefault(); input.focus(); } // the input is the dialog's only tab stop
    }

    list.addEventListener('pointermove', function (e) {
      var row = e.target.closest('[role="option"]');
      if (row && Number(row.dataset.index) !== index) setActive(Number(row.dataset.index), false);
    });
    list.addEventListener('click', function (e) {
      var row = e.target.closest('[role="option"]');
      if (row) choose(Number(row.dataset.index));
    });
    scrim.addEventListener('pointerdown', function (e) { if (e.target === scrim) close(); });
    input.addEventListener('input', function () { index = 0; render(); });

    var api = { close: close, element: dialog };
    // Render first: if it throws, the page has not been touched yet.
    render();
    syncHints();
    try {
      // Everything outside the dialog is inert while it is open.
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el.tagName === 'SCRIPT' || el.id === 'basalt-live') return;
        inerted.push([el, el.hasAttribute('inert')]);
        el.setAttribute('inert', '');
      });
      document.body.appendChild(scrim);
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey, true);
      activePalette = api;
      input.focus();
    } catch (e) {
      if (activePalette === api) activePalette = null;
      undo();
      throw e;
    }
    return api;
  }

  function closePalette() { if (activePalette) activePalette.close(); }

  /**
   * Cmd+K and Ctrl+K toggle the palette, and every item whose `keys` can be bound runs on its keys, palette open or not.
   * options is the palette options or a function returning them. A combination with ⌥ and no ⌘ or ⌃ is ignored in a text field,
   * where it types a character.
   */
  function bindPaletteShortcut(options) {
    var handler = function (e) {
      if (e.defaultPrevented || composing(e) || !(e.metaKey || e.ctrlKey || e.altKey)) return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        if (activePalette) activePalette.close();
        else openPalette(typeof options === 'function' ? options() : options);
        return;
      }
      var o = typeof options === 'function' ? options() : options;
      var typing = !(e.metaKey || e.ctrlKey) && typingIn(e);
      (o.groups || []).some(function (g) {
        return (g.items || []).some(function (it) {
          var b = binding(it);
          if (!b || typing || !pressed(b, e)) return false;
          e.preventDefault();
          if (activePalette) activePalette.close();
          activate(it, o);
          return true;
        });
      });
    };
    document.addEventListener('keydown', handler);
    return function () { document.removeEventListener('keydown', handler); };
  }

  function wirePalette(options) {
    if (!options) {
      var data = document.querySelector('script[type="application/json"][data-palette]');
      if (data) options = JSON.parse(data.textContent);
    }
    if (!options || document.documentElement.__bhPalette) return;
    document.documentElement.__bhPalette = true;
    document.querySelectorAll('[data-open-palette]').forEach(function (button) {
      button.addEventListener('click', function () { openPalette(typeof options === 'function' ? options() : options); });
      if (!button.hasAttribute('aria-keyshortcuts')) button.setAttribute('aria-keyshortcuts', 'Meta+K Control+K');
      button.setAttribute('aria-haspopup', 'dialog');
    });
    bindPaletteShortcut(options);
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

  /**
   * One call for a page. Runs now, or on DOMContentLoaded if the document is still loading.
   *   Basalt.init({ palette: { groups: [...] } })   // palette is optional
   */
  function init(options) {
    var o = options || {};
    // Each step runs on its own: one failing never leaves the rest of the page unwired. init never throws.
    var run = function () {
      [initTheme, initKeyboard, defineElements, hydrateIcons, hydrateKbd, wireThemeToggles, wireCopy, wireDisclosure, wireTabs, wirePrint, function () { wirePalette(o.palette); }].forEach(function (step) {
        try { step(); } catch (e) { console.warn('Basalt: ' + (step.name || 'a step') + ' failed: ' + (e && e.message)); }
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
    else run();
  }

  window.Basalt = {
    init: init, icon: icon, hydrateIcons: hydrateIcons, announce: announce,
    getTheme: getTheme, setTheme: setTheme, toggleTheme: toggleTheme,
    kbdGroup: kbdGroup, hardwareKeyboard: hardwareKeyboard,
    openPalette: openPalette, closePalette: closePalette,
    copyText: copyText
  };
})();
