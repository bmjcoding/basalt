/* Basalt HTML script, option-chips module: what a native radio cannot do for React's OptionChips (DECISIONS 154, D9b). A chip whose input is aria-disabled="true" is
   an unavailable value: it is reachable (Tab, and the arrow keys land on it, so its words are heard) and never chosen. The script stops a click or Space from
   choosing it, and takes the arrow keys, Home and End in the group: focus moves to the next chip in the order they are drawn, wrapping, and an available chip is
   also chosen (a radio group's rule) while an unavailable one is only focused. It also keeps the state attributes the CSS draws from, so no browser needs :has():
   data-checked, data-unavailable (aria-disabled or disabled) and data-focus (focus-visible) on each chip's label. Source: tools/html-skill/src/modules/option-chips.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;

  function unavailable(input) { return input.getAttribute('aria-disabled') === 'true'; }

  /** The label's state attributes from its input: what the stylesheet draws from where :has() is not there. */
  function sync(chip) {
    var input = chip.querySelector('.option-chip-input');
    if (!input) return;
    chip.toggleAttribute('data-checked', input.checked);
    chip.toggleAttribute('data-unavailable', input.disabled || unavailable(input));
    chip.toggleAttribute('data-focus', input.matches(':focus-visible'));
  }

  function init() {
    document.querySelectorAll('.option-chips').forEach(function (group) {
      if (group.__bhChips) return;
      group.__bhChips = true;
      var chips = function () { return group.querySelectorAll('.option-chip'); };
      var resync = function () { chips().forEach(sync); };
      resync();
      // A change in one radio unchecks its siblings without telling them, so the whole group is read again; focus moves one chip at a time.
      group.addEventListener('change', resync);
      group.addEventListener('focusin', function (event) { var c = event.target.closest && event.target.closest('.option-chip'); if (c) sync(c); });
      group.addEventListener('focusout', function (event) { var c = event.target.closest && event.target.closest('.option-chip'); if (c) c.removeAttribute('data-focus'); });
      var inputs = function () { return Array.prototype.slice.call(group.querySelectorAll('.option-chip-input:not(:disabled)')); };
      // A click on an unavailable chip, or Space on it, must not choose it: stop the native change before it happens.
      group.addEventListener('click', function (event) {
        var input = event.target.closest && event.target.closest('.option-chip') && event.target.closest('.option-chip').querySelector('.option-chip-input');
        if (input && unavailable(input)) { event.preventDefault(); event.stopPropagation(); }
      }, true);
      group.addEventListener('keydown', function (event) {
        var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -Infinity, End: Infinity }[event.key];
        if (step === undefined || event.altKey || event.ctrlKey || event.metaKey) return;
        var all = inputs();
        var at = all.indexOf(event.target);
        if (at < 0) return;
        var rtl = getComputedStyle(group).direction === 'rtl' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight');
        var to = isFinite(step) ? (at + (rtl ? -step : step) + all.length) % all.length : step < 0 ? 0 : all.length - 1;
        event.preventDefault();
        event.stopPropagation();
        all[to].focus();
        if (!unavailable(all[to])) all[to].click();
      }, true);
      // From here a click on an unavailable chip is the script's to keep from choosing (above); until then the style sheet does not let one through.
      group.setAttribute('data-ready', '');
    });
  }

  _.step(40, 'option-chips', init);
})(window.Basalt);
