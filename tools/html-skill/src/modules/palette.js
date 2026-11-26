/* Basalt HTML script, palette module: the command palette (Cmd or Ctrl+K), its items' shortcuts, Basalt.openPalette. Needs the kbd module. */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;
  var icon = _.icon;
  // The core `search` glyph, drawn once for the palette and the command list (which needs the palette).
  var SEARCH = _.searchSvg = '%glyph-svg:search%';
  var kbdGroup = _.kbd.kbdGroup;
  var keyshortcuts = _.kbd.keyshortcuts;
  var keywords = _.kbd.keywords;
  var KEY_NAME = _.kbd.KEY_NAME;
  var hardwareKeyboard = B.hardwareKeyboard;

  var activePalette = null;
  var paletteSeq = 0;

  // A palette link passes core's check (relative, http, https, mailto or tel).
  var safeHref = _.safeHref;

  /** Keys that belong to an input method editor (composition, or the legacy keyCode 229). They are never commands. */
  function composing(e) { return !!e.isComposing || e.keyCode === 229; }

  /**
   * The binding an item's `keys` draws, or null. A shortcut needs ⌘, ⌃ or ⌥ and one more key: anything else (a bare letter, Shift
   * alone) would fire while a person types, so it warns once and gets no chip and no binding; so does `keys` that is not an array (a
   * string like "⌘ S" would throw in .filter). ⌘ answers to Meta or Ctrl, as ⌘K does.
   * ⌘K and ⌃K (nothing else held) open the palette itself, so an item cannot take them: it warns and gets no chip and no binding too.
   */
  var badKeys = {};
  function binding(item) {
    var keys = item.keys;
    // A command that cannot run now draws no chip and binds no keys: its shortcut would run nothing.
    if (!keys || item.unavailable != null) return null;
    if (!Array.isArray(keys)) {
      if (!badKeys['a:' + item.label]) { badKeys['a:' + item.label] = 1; console.warn('Basalt: "' + item.label + '" has keys that are not an array; write keys: [\'⌘\', \'S\']'); }
      return null;
    }
    // "Mod" is the platform's modifier, as the chips draw it (kbd.js): ⌘ on Apple's systems, Control elsewhere.
    keys = _.kbd.mod(keys).map(function (k) { return k === 'Ctrl' ? '⌃' : k; });
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

  /** Runs an item the way choosing it does, once the palette (if any) is closed. An item that cannot run (`unavailable`) never runs. */
  function activate(item, o) {
    if (item.unavailable != null) return;
    if (item.onSelect) item.onSelect(item);
    if (o.onSelect) o.onSelect(item);
    if (item.href) {
      if (safeHref(item.href)) location.href = item.href;
      else console.warn('Basalt: a palette link must be relative, http, https, mailto or tel');
    }
  }

  /**
   * How an item answers a query: 0 when every word is in its label (a title match), 1 when every word is found only by its keywords, hint or description
   * (they rank below titles, as cmdk ranks them), -1 for no match. An empty query is 0 for everything.
   */
  function tier(item, query) {
    if (!query) return 0;
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    var all = function (hay) { return terms.every(function (t) { return hay.indexOf(t) !== -1; }); };
    if (all(item.label.toLowerCase())) return 0;
    return all((item.label + ' ' + (item.keywords || []).join(' ') + ' ' + (item.hint || '') + ' ' + (item.description || '')).toLowerCase()) ? 1 : -1;
  }

  function matches(item, query) { return tier(item, query) >= 0; }

  /**
   * The result rows for a list of groups, shared with the in-page command list: { html, words, flat }. `words` is the hidden elements that say each
   * shortcut aloud (the chip is aria-hidden), `flat` the items in row order; a row's index is its place in it. An item with a `description` is a two-line
   * row. `chevron` is the push's arrow, drawn only while a list with a preview is narrower than its split.
   */
  function rowsOf(groups, id, q, chevron) {
    var flat = [];
    var html = '';
    var words = '';
    // Title matches come before keyword and description matches, each keeping its order; a group is placed by its best row, as cmdk does.
    var ranked = [];
    groups.forEach(function (g, gi) {
      var items = (g.items || []).map(function (it, i) { return { it: it, t: tier(it, q), i: i }; }).filter(function (x) { return x.t >= 0; })
        .sort(function (a, b) { return a.t - b.t || a.i - b.i; });
      if (items.length) ranked.push({ g: g, gi: gi, items: items });
    });
    ranked.sort(function (a, b) { return a.items[0].t - b.items[0].t || a.gi - b.gi; });
    ranked.forEach(function (r) {
      var g = r.g;
      var gi = r.gi;
      var items = r.items.map(function (x) { return x.it; });
      var gid = id + '-g' + gi;
      html += '<div role="group"' + (g.label ? ' aria-labelledby="' + gid + '"' : '') + '>';
      if (g.label) html += '<div class="row-group" id="' + gid + '">' + esc(g.label) + '</div>';
      items.forEach(function (it) {
        var n = flat.length;
        flat.push(it);
        var keys = binding(it) ? it.keys : null;
        // The chip is aria-hidden, so the shortcut is also said in words, from a hidden element outside the option (the name stays "Copy").
        if (keys) words += '<span id="' + id + '-o' + n + '-keys">' + esc(keywords(keys)) + '</span>';
        // An item that cannot run (`unavailable`, its reason) is aria-disabled, never skipped by the keys; the reason takes the second line and wraps,
        // and unavailable wins over danger. A description stays a search keyword.
        var off = it.unavailable != null;
        var second = off ? String(it.unavailable) : it.description;
        html += '<div class="row" role="option" id="' + id + '-o' + n + '" data-index="' + n + '" aria-selected="false"' + (it.danger && !off ? ' data-danger' : '') + (second ? ' data-described' : '') +
          (off ? ' data-unavailable aria-disabled="true"' : '') +
          (keys ? ' aria-keyshortcuts="' + esc(keyshortcuts(keys)) + '" aria-describedby="' + id + '-o' + n + '-keys"' : '') + '>' +
          (it.icon ? icon(it.icon) : '') + '<span class="row-label">' + esc(it.label) + '</span>' +
          (second ? '<span class="row-description">' + esc(second) + '</span>' : '') +
          (it.hint ? '<span class="row-hint">' + esc(it.hint) + '</span>' : '') + (keys ? kbdGroup(keys) : '') + (chevron || '') + '</div>';
      });
      html += '</div>';
    });
    return { html: html, words: words, flat: flat };
  }

  /**
   * Fills a surface's "nothing shown" block: with words, "Nothing matches “…”." and a ghost Clear search; with none, "Nothing to show."; or the page's own
   * `<template data-empty>`, cloned (never HTML from data), where an element with `data-clear` clears the search. A key other than Esc stops in the block,
   * so the surface's own Enter never eats a button's or a link's activation.
   */
  function fillNone(none, q, template, clear) {
    none.textContent = '';
    if (template) none.appendChild(template.content.cloneNode(true));
    else {
      var p = document.createElement('p');
      p.textContent = q ? 'Nothing matches “' + q + '”.' : 'Nothing to show.';
      none.appendChild(p);
      if (q) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.setAttribute('data-variant', 'ghost');
        b.setAttribute('data-size', 'sm');
        b.setAttribute('data-clear', '');
        b.textContent = 'Clear search';
        none.appendChild(b);
      }
    }
    [].forEach.call(none.querySelectorAll('[data-clear]'), function (el) { el.addEventListener('click', clear); });
    if (!none.__bhKeys) {
      none.__bhKeys = true;
      none.addEventListener('keydown', function (e) { if (e.key !== 'Escape') e.stopPropagation(); });
    }
  }

  /** The count line: "7 commands" at rest, "2 of 7" while a search narrows the rows ("7 of 7" when every row matches), or the page's own (`count`). */
  function countLine(shown, total, noun, filtering, count) {
    if (count != null) return String(count);
    return filtering ? shown + ' of ' + total : total + ' ' + (total === 1 ? noun : noun + 's');
  }

  /** Says a reason at once, and again on a second press: the line is emptied, then filled a task later. */
  function sayNow(line, text) {
    line.textContent = '';
    setTimeout(function () { line.textContent = text; }, 0);
  }

  /**
   * Opens the command palette: a modal floating panel at level 1 with the raised input row (level 2). It opens and closes with no animation; the lit row's plate glides between rows.
   * Returns { close }.
   *   openPalette({ groups: [{ label, items: [{ label, icon?, keys?: ['⌘','K'], description?, hint?, keywords?, danger?, href?, onSelect? }] }],
   *                 placeholder?, label?, onSelect?(item), onClose?() })
   */
  function openPalette(options) {
    var o = options || {};
    var groups = o.groups || [];
    if (activePalette) activePalette.close();
    var id = 'bh-palette-' + (++paletteSeq);
    var label = o.label || 'Command palette';
    var opener = document.activeElement;
    // The noun and the count line come from the options, or from data-noun and data-count on the trigger or the palette's JSON; the empty block from
    // a <template data-empty> outside any command list.
    var trigger = opener && opener.closest ? opener.closest('[data-open-palette]') : null;
    var json = document.querySelector('script[type="application/json"][data-palette]');
    var attr = function (name) { return (trigger && trigger.getAttribute(name)) || (json && json.getAttribute(name)) || null; };
    var noun = o.noun || attr('data-noun') || 'command';
    var count = o.count != null ? o.count : attr('data-count');
    var template = o.empty || [].filter.call(document.querySelectorAll('template[data-empty]'), function (t) { return !t.closest('.command-list'); })[0] || null;
    var total = 0;
    groups.forEach(function (g) { total += (g.items || []).length; });

    var scrim = document.createElement('div');
    scrim.className = 'scrim palette-scrim';
    scrim.innerHTML =
      '<div class="panel float modal palette" tabindex="-1" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' +
        '<div class="input-row">' + SEARCH +
          '<input type="text" role="combobox" aria-expanded="true" aria-controls="' + id + '-list" aria-autocomplete="list" aria-label="' + esc(label) +
          '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="' + esc(o.placeholder || 'Type a command or search') + '">' +
        '</div>' +
        '<div class="rows palette-list" id="' + id + '-list" role="listbox" aria-label="Results"></div>' +
        '<div class="command-none" hidden></div>' +
        '<div hidden id="' + id + '-keys"></div>' +
        '<div class="command-foot">' +
          '<p class="command-count"><span aria-hidden="true"></span><span role="status" aria-live="polite" aria-atomic="true" class="visually-hidden"></span></p>' +
          // The legend keeps its id while hidden from assistive technology, so the field's description still resolves.
          '<span class="command-hints" id="' + id + '-hints" data-kbd-hint aria-hidden="true"><span>' + kbdGroup(['↑', '↓']) + ' Navigate</span><span>' + kbdGroup(['↵']) + ' Run</span><span>' + kbdGroup(['Esc']) + ' Close</span></span>' +
        '</div>' +
        '<div class="visually-hidden" role="status" data-reason></div>' +
      '</div>';

    var dialog = scrim.firstElementChild;
    var input = dialog.querySelector('input');
    var list = dialog.querySelector('[role="listbox"]');
    var none = dialog.querySelector('.command-none');
    var shownText = dialog.querySelector('.command-count').firstChild;
    var status = dialog.querySelector('.command-count').lastChild;
    var reason = dialog.querySelector('[data-reason]');
    var words = dialog.querySelector('#' + id + '-keys');
    var flat = [];
    var index = 0;
    var spoken = null;
    var timer;

    /** The count is shown at once and spoken once, after it has held still for 400ms, and never on opening (its first text is not announced). */
    function speak(msg) {
      shownText.textContent = msg;
      clearTimeout(timer);
      if (spoken === null) { spoken = msg; return; }
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
      var r = rowsOf(groups, id, q);
      flat = r.flat;
      list.innerHTML = r.html;
      list.insertBefore(plate, list.firstChild);
      words.innerHTML = r.words;
      list.hidden = flat.length === 0;
      none.hidden = flat.length !== 0;
      if (!flat.length) fillNone(none, q, template, function () { input.value = ''; index = 0; render(); input.focus(); });
      index = Math.min(index, Math.max(flat.length - 1, 0));
      setActive(flat.length ? index : -1, false);
      speak(countLine(flat.length, total, noun, q !== '', count));
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
      // A row that cannot run: nothing runs and nothing closes; its reason is said, again on every press.
      if (item.unavailable != null) { setActive(i, false); sayNow(reason, String(item.unavailable)); return; }
      close();
      activate(item, o);
    }

    // A native top-layer popover preserves the scrim's drawing and escapes its logical modal host's clipping.
    var host = opener && opener.closest('dialog:modal');
    var inerted = [];
    var overflow = document.documentElement.style.overflow;
    var hostObserver;
    function hostClosing(e) { if (e.newState === 'closed') close(); }
    var plate = document.createElement('span');
    plate.className = 'plate';
    plate.setAttribute('aria-hidden', 'true');
    var unglide;

    /** Puts the page back exactly as it was: listener, dialog, inert, scroll lock. Safe to run twice. */
    function undo() {
      clearTimeout(timer);
      if (unglide) unglide();
      document.removeEventListener('keydown', onKey, true);
      if (hostObserver) hostObserver.disconnect();
      if (host) host.removeEventListener('beforetoggle', hostClosing);
      if (_.toast) _.toast.release(scrim);
      if (scrim.matches(':popover-open')) scrim.hidePopover();
      scrim.remove();
      inerted.forEach(function (pair) { if (!pair[1]) pair[0].removeAttribute('inert'); });
      inerted = [];
      document.documentElement.style.overflow = overflow;
    }

    function close() {
      if (activePalette !== api) return;
      activePalette = null;
      undo();
      if (opener && opener.focus && document.contains(opener)) opener.focus();
      if (o.onClose) o.onClose();
    }

    function onKey(e) {
      if (!scrim.isConnected || !dialog.contains(e.target) || e.target.closest('.toast-viewport')) return;
      syncHints();
      if (composing(e)) return; // finishing or cancelling a composition is not a command
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        // The field and whatever the empty block holds are the palette's stops; focus cycles among them.
        var stops = [input].concat([].filter.call(none.hidden ? [] : none.querySelectorAll('a[href], button:not(:disabled), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) { return el.getClientRects().length > 0; }));
        e.preventDefault();
        var at = stops.indexOf(document.activeElement);
        stops[(at + (e.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
        return;
      }
      // Keys inside the empty block are its own (a button's or a link's Enter).
      if (none.contains(e.target)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (flat.length) setActive((index + 1) % flat.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (flat.length) setActive((index - 1 + flat.length) % flat.length); return; }
      // Only a bare Enter runs the highlighted row. With a modifier it is a shortcut for the page, which the shortcut handler sees.
      if (e.key === 'Enter') {
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        if (flat.length) choose(index);
        return;
      }
    }

    list.addEventListener('pointermove', function (e) {
      var row = e.target.closest('[role="option"]');
      if (row && Number(row.dataset.index) !== index) setActive(Number(row.dataset.index), false);
    });
    list.addEventListener('click', function (e) {
      var row = e.target.closest('[role="option"]');
      if (row) choose(Number(row.dataset.index));
    });
    // A press on a row that cannot run keeps focus in the field.
    list.addEventListener('mousedown', function (e) { if (e.target.closest('[role="option"][aria-disabled="true"]')) e.preventDefault(); });
    scrim.addEventListener('pointerdown', function (e) { if (e.target === scrim) close(); });
    scrim.addEventListener('toggle', function (e) { if (e.newState === 'closed') close(); });
    input.addEventListener('input', function () { index = 0; render(); });

    var api = { close: close, element: dialog };
    // Render first: if it throws, the page has not been touched yet.
    render();
    syncHints();
    try {
      // Preserve the page's explicit inert state, but let native dialogs enter the modal stack above us.
      [].forEach.call((host || document.body).children, function (el) {
        if (el.tagName === 'DIALOG' || el.tagName === 'SCRIPT' || el.id === 'basalt-live' || el.classList.contains('toast-viewport')) return;
        inerted.push([el, el.hasAttribute('inert')]);
        el.setAttribute('inert', '');
      });
      (host || document.body).appendChild(scrim);
      // A plain page keeps its original paint/compositing. Only a native modal host needs the top layer to escape clipping and transforms.
      if (host) { scrim.setAttribute('popover', 'manual'); scrim.showPopover(); }
      if (host) {
        host.addEventListener('beforetoggle', hostClosing);
        hostObserver = new MutationObserver(function () { if (!host.open || !host.isConnected) close(); });
        hostObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
      }
      document.documentElement.style.overflow = 'hidden';
      // The glide listens before the palette's own key handler does, so a key has set its modality before the highlight moves (and moves the plate at once).
      unglide = _.glide(list, plate, { active: '.row[data-active]', attr: 'data-active' });
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

  // The in-page command list builds its rows, filters and runs items with these.
  _.palette = { rows: rowsOf, tier: tier, matches: matches, activate: activate, composing: composing, fillNone: fillNone, countLine: countLine, sayNow: sayNow };
  B.openPalette = openPalette;
  B.closePalette = closePalette;
  _.step(110, 'wirePalette', function (o) { wirePalette(o.palette); });
})(window.Basalt);
