/* Basalt HTML script, number module: .number-field > input[type=number] gets its − and + steppers, and Shift or Page Up and Down step ten. */
(function (B) {
  'use strict';
  var _ = B._;

  // Steppers are not tab stops (the arrow keys step), as Base UI's are not.
  function stepper(n, icon, label) {
    return '<button type="button" class="btn" tabindex="-1" data-variant="ghost" data-icon-only data-step="' + n + '" aria-label="' + label + '">' + icon + '</button>';
  }

  function wireNumber() {
    document.querySelectorAll('.number-field').forEach(function (box) {
      var input = box.querySelector('input[type="number"]');
      if (!input || box.__bh) return;
      box.__bh = true;
      box.insertAdjacentHTML('afterbegin', stepper(-1, '%glyph-svg:minus%', 'Decrease value'));
      box.insertAdjacentHTML('beforeend', stepper(1, '%glyph-svg:plus%', 'Increase value'));
      var down = box.firstElementChild, up = box.lastElementChild;

      // Disabled at the ends, and when the field is.
      function sync() {
        var v = input.value === '' ? NaN : Number(input.value), off = input.disabled || input.readOnly;
        down.disabled = off || (input.min !== '' && v <= Number(input.min));
        up.disabled = off || (input.max !== '' && v >= Number(input.max));
      }
      // n steps (negative is down), the native way: it honours min, max, step and the step base.
      function by(n) {
        if (input.disabled || input.readOnly) return;
        try { input.stepUp(n); } catch (e) { return; }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // A press does not move focus off the field.
      box.addEventListener('mousedown', function (e) { if (e.target.closest('button')) e.preventDefault(); });
      box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) by(Number(b.getAttribute('data-step'))); });
      input.addEventListener('keydown', function (e) {
        var k = e.key;
        if (e.altKey || e.ctrlKey || e.metaKey || !(k === 'PageUp' || k === 'PageDown' || (e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')))) return;
        e.preventDefault();
        by((k === 'ArrowUp' || k === 'PageUp' ? 10 : -10));
      });
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
      sync();
    });
  }

  _.step(70, 'wireNumber', wireNumber);
})(window.Basalt);
