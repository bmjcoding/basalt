/* Basalt HTML script, release module (React's ReleaseNotes and ReleaseIndex, DECISIONS 320): the folds, the copied addresses and the arrival.
   - Folds are written open, so without script everything shows. This closes each one to hidden="until-found" (the browser's find opens it) and
     toggles it from its button.
   - A Copy link button with data-copy-fragment copies the page's own address (the release notes' data-base, or the window's, with no query) and
     that fragment, read when it is pressed.
   - Arriving (on load and on every hashchange): the fragment is looked up with getElementById, never as a selector ("v1.4.0" is not one); a
     candidate's address opens the release that replaces it (data-replaces); every fold holding the target opens; the target is scrolled to and
     focused with no ring and takes the stream's mark (the plate and "Linked") until the reader presses or types.
   Source: tools/html-skill/src/modules/release.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var READS = /^(Arrow(Up|Down|Left|Right)|Page(Up|Down)|Home|End| |Shift|Control|Alt|Meta|CapsLock)$/;
  var at = null;

  function setFold(button, open) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded', String(open));
    if (!panel) return;
    if (open) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', 'until-found');
  }

  function wireFolds() {
    document.querySelectorAll('.release-fold').forEach(function (button) {
      if (button.__bhRelease) return;
      button.__bhRelease = true;
      setFold(button, false);
      button.addEventListener('click', function () { setFold(button, button.getAttribute('aria-expanded') !== 'true'); });
      var panel = document.getElementById(button.getAttribute('aria-controls'));
      // Found by the browser's find: it removes hidden itself; the button follows.
      if (panel) panel.addEventListener('beforematch', function () { button.setAttribute('aria-expanded', 'true'); });
    });
  }

  function base(button) {
    var notes = button.closest('[data-base]');
    return notes ? notes.getAttribute('data-base') : location.origin + location.pathname;
  }

  function end() {
    if (!at) return;
    at.removeAttribute('data-arrived');
    var word = at.querySelector('.release-word');
    if (word) word.setAttribute('aria-hidden', 'true');
    at = null;
  }

  function target(id) {
    if (!id) return null;
    var el = document.getElementById(id);
    if (el && (el.classList.contains('release') || el.classList.contains('release-entry'))) return el;
    // A candidate no longer drawn: its stable release says it replaces it.
    var releases = document.querySelectorAll('.release[data-replaces]');
    for (var i = 0; i < releases.length; i++) {
      if (releases[i].getAttribute('data-replaces').split(' ').some(function (v) { return 'v' + v === id; })) return releases[i];
    }
    return null;
  }

  function arrive() {
    var raw = location.hash.slice(1);
    var id = raw;
    try { id = decodeURIComponent(raw); } catch (e) { /* a fragment that is not valid percent-encoding is read as written */ }
    var el = target(id);
    end();
    if (!el) return;
    for (var p = el.parentElement; p; p = p.parentElement) {
      if (p.classList && p.classList.contains('release-fold-panel') && p.hasAttribute('hidden')) {
        var button = document.querySelector('[aria-controls="' + CSS.escape(p.id) + '"]');
        if (button) setFold(button, true);
      }
    }
    el.setAttribute('tabindex', '-1');
    el.setAttribute('data-arrival', '');
    el.setAttribute('data-arrived', '');
    var word = el.classList.contains('release') ? el.querySelector('.release-head .release-word') : el.querySelector(':scope > .release-word');
    if (word) word.removeAttribute('aria-hidden');
    at = el;
    requestAnimationFrame(function () {
      el.scrollIntoView({ block: el.getBoundingClientRect().height > innerHeight * 0.6 ? 'start' : 'center' });
      el.focus({ preventScroll: true });
      // From the next frame, so the press or key that opened it does not end its mark.
      requestAnimationFrame(function () { el.__bhArmed = true; });
    });
  }

  function act(event) {
    if (!at || !at.__bhArmed) return;
    if (event.type === 'keydown') {
      var inField = event.target && event.target.closest && event.target.closest('input, textarea, select, [contenteditable]');
      if (READS.test(event.key) && !(event.key === ' ' && inField)) return;
    }
    at.__bhArmed = false;
    end();
  }

  _.step(78, 'wireRelease', function () {
    if (!document.querySelector('.release, .release-index')) return;
    wireFolds();
    document.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-copy-fragment]');
      if (button) button.setAttribute('data-copy-text', base(button) + '#' + button.getAttribute('data-copy-fragment'));
    }, true);
    document.addEventListener('pointerdown', act, true);
    document.addEventListener('keydown', act, true);
    addEventListener('hashchange', arrive);
    arrive();
  });
})(window.Basalt);
