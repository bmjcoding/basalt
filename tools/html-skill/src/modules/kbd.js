/* Basalt HTML script, kbd module: <span data-kbd="⌘ K"></span> becomes one chip per key, and on touch the chips wait for a hardware key. */
(function (B) {
  'use strict';
  var _ = B._;
  var esc = _.esc;
  var icon = _.icon;

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

  /** ['⌘', 'K'] gives "Command K": the shortcut in words, for the aria-describedby that goes with aria-keyshortcuts (the name stays "Copy", not "Copy C"). */
  function keywords(keys) {
    return keys.map(function (k) { return MOD_ICON[k] || KEY_NAME[k] || k.toUpperCase(); }).join(' ');
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

  B.kbdGroup = kbdGroup;
  B.hardwareKeyboard = hardwareKeyboard;
  // The palette draws its chips and binds its keys with these.
  _.kbd = { MOD_ICON: MOD_ICON, KEY_NAME: KEY_NAME, kbdGroup: kbdGroup, keyshortcuts: keyshortcuts, keywords: keywords };
  _.step(20, 'initKeyboard', initKeyboard);
  _.step(50, 'hydrateKbd', hydrateKbd);
})(window.Basalt);
