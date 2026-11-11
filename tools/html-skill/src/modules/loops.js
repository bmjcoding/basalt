/* Basalt HTML script, loops module: the page-level hold on every loop (React's useLoops). `<html data-loops="held">` stops the ring, a busy button's
   ring and braille (loops.css does the holding). This keeps the state: stored for this page's origin in this browser (`basalt-loops`,
   localStorage is per origin), carried across its tabs by the storage event, applied before first paint by a line in the head that compose.mjs
   writes (and here, once, if the page has none). Any [data-loops-toggle] is the control: a button syncs aria-pressed and a checkbox with
   role="switch" syncs checked; a press flips the hold. Releasing jumps to now: every loop rejoins the shared clock and nothing resumes from where
   it stopped. Nothing is announced when it changes (the control speaks its own state). The page reads Basalt.loops.held() for text that rewrites
   itself and listens for the "basalt:loops" event on document (detail.held).
   Source: tools/html-skill/src/modules/loops.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var KEY = 'basalt-loops';
  var HELD = 'held';

  // The first frame: a state set on load paints at once, with no crossfade (data-still on the root until the page has painted; choice.css and toggle.css read it).
  var still = _.still || (_.still = function () {
    var root = document.documentElement;
    root.setAttribute('data-still', '');
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.removeAttribute('data-still'); }); });
  });

  function isHeld() { return document.documentElement.getAttribute('data-loops') === HELD; }

  function rejoinClock() {
    if (typeof document.getAnimations !== 'function') return;
    document.getAnimations().forEach(function (a) {
      var name = a.animationName;
      if (name && name.indexOf('bh-') === 0 && a.effect && a.effect.getComputedTiming().iterations === Infinity) a.startTime = 0;
    });
  }

  function sync() {
    var held = isHeld();
    document.querySelectorAll('[data-loops-toggle]').forEach(function (el) {
      if (el.type === 'checkbox') el.checked = held; else el.setAttribute('aria-pressed', String(held));
    });
  }

  function apply(held) {
    var root = document.documentElement;
    if (held) root.setAttribute('data-loops', HELD); else root.removeAttribute('data-loops');
    if (!held) rejoinClock();
    sync();
    document.dispatchEvent(new CustomEvent('basalt:loops', { detail: { held: held } }));
  }

  function set(held) {
    held = !!held;
    try { if (held) localStorage.setItem(KEY, HELD); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked: the hold lasts for this page */ }
    if (held !== isHeld()) apply(held); else sync();
    return held;
  }

  B.loops = { held: isHeld, set: set, toggle: function () { return set(!isHeld()); } };

  _.step(60, 'loops', function () {
    still();
    if (B.loops.wired) { sync(); return; }
    B.loops.wired = true;
    try { if (localStorage.getItem(KEY) === HELD && !isHeld()) document.documentElement.setAttribute('data-loops', HELD); } catch (e) { /* ignore */ }
    sync();
    document.addEventListener('click', function (event) {
      var el = event.target.closest && event.target.closest('[data-loops-toggle]');
      if (el && el.type !== 'checkbox' && !el.disabled) set(!isHeld());
    });
    document.addEventListener('change', function (event) {
      var el = event.target;
      if (el && el.matches && el.matches('[data-loops-toggle]') && el.type === 'checkbox') set(el.checked);
    });
    window.addEventListener('storage', function (event) {
      // A null key is localStorage.clear(), which also releases the hold.
      if (event.key !== null && event.key !== KEY) return;
      var held = event.newValue === HELD;
      if (held !== isHeld()) apply(held);
    });
  });
})(window.Basalt);
