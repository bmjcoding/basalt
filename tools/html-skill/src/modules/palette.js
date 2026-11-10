/* Basalt HTML script, palette module: the command palette (Cmd or Ctrl+K), its items' shortcuts, Basalt.openPalette. Needs the kbd module. */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;
  var icon = _.icon;
  var kbdGroup = _.kbd.kbdGroup;
  var keyshortcuts = _.kbd.keyshortcuts;
  var keywords = _.kbd.keywords;
  var KEY_NAME = _.kbd.KEY_NAME;
  var hardwareKeyboard = B.hardwareKeyboard;

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
   * The glide: one plate that follows the lit row (React's GlidePlate). Each row paints its own plate when lit; that stays the fallback, and
   * the whole story on touch, under reduced motion and in forced colours. Where it can, the list also draws ONE plate, placed by four CSS
   * variables (the stylesheet transitions transform, width and height on duration-base). The pointer moving the highlight travels it; a key
   * moves it at once; from nowhere it appears in place; when the highlight clears it freezes and fades where it is, and a return during the
   * fade travels from there. Returns the cleanup. The list's rows are rebuilt on every query, so the plate is put back by the caller.
   */
  function glide(host, plate) {
    var OFF = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active), (hover: none), (pointer: coarse)');
    var modality = 'keyboard';
    var last = null;
    var target = '';
    var snapNext = false;
    var leaving;

    function on() { return !OFF.matches && modality !== 'touch'; }
    function lit() { return plate.dataset.state === 'on'; }
    // The row's own plate (its ::before) is the shape to follow, so the shared one matches the fallback to the pixel.
    function geometry(row) {
      var box = host.getBoundingClientRect();
      var at = row.getBoundingClientRect();
      var own = getComputedStyle(row, '::before');
      var ratio = host.offsetWidth > 0 ? box.width / host.offsetWidth : 1;
      var scale = Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
      return {
        x: (at.left - box.left) / scale - host.clientLeft + host.scrollLeft + (parseFloat(own.left) || 0),
        y: (at.top - box.top) / scale - host.clientTop + host.scrollTop + (parseFloat(own.top) || 0),
        w: parseFloat(own.width) || at.width / scale,
        h: parseFloat(own.height) || at.height / scale
      };
    }
    function write(g) {
      var st = plate.style;
      st.setProperty('--plate-x', g.x + 'px'); st.setProperty('--plate-y', g.y + 'px');
      st.setProperty('--plate-w', g.w + 'px'); st.setProperty('--plate-h', g.h + 'px');
    }
    // Runs `change` with the plate's transitions off and commits it, so it takes effect in place.
    function inPlace(change) {
      plate.setAttribute('data-snap', '');
      change();
      void plate.offsetWidth;
      plate.removeAttribute('data-snap');
    }
    function leave() {
      if (!lit()) return;
      // Freeze a move in progress where it has reached, then fade there: the off state has no transform transition, so what is written stays.
      var st = getComputedStyle(plate);
      var m = new DOMMatrixReadOnly(st.transform);
      write({ x: m.m41, y: m.m42, w: parseFloat(st.width), h: parseFloat(st.height) });
      plate.dataset.state = 'off';
      last = null;
      target = '';
    }
    function settle() {
      clearTimeout(leaving);
      leaving = undefined;
      host.toggleAttribute('data-glide', on());
      if (!on()) { plate.dataset.state = 'off'; return; }
      var row = host.querySelector('.row[data-active]');
      if (!row) { leaving = setTimeout(function () { if (!host.querySelector('.row[data-active]')) leave(); }, 0); return; }
      var g = geometry(row);
      var key = g.x + ' ' + g.y + ' ' + g.w + ' ' + g.h;
      if (row === last && lit() && key === target) return; // nothing changed: leave a move in flight alone
      target = key;
      // How much of the plate still shows: 0 once a fade has finished, so the plate appears in place.
      var shown = lit() ? 1 : parseFloat(getComputedStyle(plate).opacity) || 0;
      var travel = !snapNext && row !== last && modality === 'pointer' && shown > 0.01;
      snapNext = false;
      if (travel) { write(g); plate.dataset.state = 'on'; } else inPlace(function () { write(g); plate.dataset.state = 'on'; });
      last = row;
    }
    function input(e) {
      var next = modality;
      if (e.type === 'keydown') { if (!/^(Shift|Control|Alt|Meta)$/.test(e.key)) next = 'keyboard'; } else next = e.pointerType === 'touch' ? 'touch' : 'pointer';
      if (next === modality) return;
      var was = on();
      modality = next;
      if (on() !== was) settle();
    }

    plate.dataset.state = 'off';
    var changes = new MutationObserver(settle);
    changes.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-active'] });
    // A row that moved under a still highlight (a filter, a font, a resize) is re-placed in place.
    var resizes = new ResizeObserver(function () { snapNext = true; target = ''; settle(); });
    resizes.observe(host);
    OFF.addEventListener('change', settle);
    var events = ['pointermove', 'pointerdown', 'keydown'];
    events.forEach(function (t) { document.addEventListener(t, input, { capture: true, passive: true }); });
    settle();
    return function () {
      clearTimeout(leaving);
      changes.disconnect();
      resizes.disconnect();
      OFF.removeEventListener('change', settle);
      events.forEach(function (t) { document.removeEventListener(t, input, { capture: true }); });
    };
  }

  /**
   * Opens the command palette: a modal floating panel at level 1 with the raised input row (level 2). It opens and closes with no animation; the lit row's plate glides between rows.
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
        '<div hidden id="' + id + '-keys"></div>' +
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
    var words = dialog.querySelector('#' + id + '-keys');
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
      var described = '';
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
          // The chip is aria-hidden, so the shortcut is also said in words, from a hidden element outside the option (the name stays "Copy").
          if (keys) described += '<span id="' + id + '-o' + n + '-keys">' + esc(keywords(keys)) + '</span>';
          html += '<div class="row" role="option" id="' + id + '-o' + n + '" data-index="' + n + '" aria-selected="false"' + (it.danger ? ' data-danger' : '') +
            (keys ? ' aria-keyshortcuts="' + esc(keyshortcuts(keys)) + '" aria-describedby="' + id + '-o' + n + '-keys"' : '') + '>' +
            (it.icon ? icon(it.icon) : '') + '<span class="row-label">' + esc(it.label) + '</span>' +
            (it.hint ? '<span class="row-hint">' + esc(it.hint) + '</span>' : '') + (keys ? kbdGroup(keys) : '') + '</div>';
        });
        html += '</div>';
      });
      list.innerHTML = html;
      list.insertBefore(plate, list.firstChild);
      words.innerHTML = described;
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
    var plate = document.createElement('span');
    plate.className = 'plate';
    plate.setAttribute('aria-hidden', 'true');
    var unglide;

    /** Puts the page back exactly as it was: listener, dialog, inert, scroll lock. Safe to run twice. */
    function undo() {
      clearTimeout(timer);
      if (unglide) unglide();
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
      // The glide listens before the palette's own key handler does, so a key has set its modality before the highlight moves (and moves the plate at once).
      unglide = glide(list, plate);
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

  B.openPalette = openPalette;
  B.closePalette = closePalette;
  _.step(110, 'wirePalette', function (o) { wirePalette(o.palette); });
})(window.Basalt);
