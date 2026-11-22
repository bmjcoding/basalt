/* Basalt HTML script, dialog-form module: what a form dialog (`<dialog class="panel float modal dialog" data-form>`) does as it opens. Its top is held where a centred dialog of its
   height would sit, measured once, so an error that grows it grows it downward; and first focus goes by the input that opened it: the first field for a key or a mouse, the title
   for a touch, so no keyboard rises over a form before it is seen. React's DialogContent `form` also re-measures on a window resize and keeps a press on the scrim from closing a
   form that has been typed in; those are React's alone.
   Source: tools/html-skill/src/modules/dialog-form.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var touched = false;

  function opened(d) {
    d.removeAttribute('data-held');
    if (!matchMedia('(width < %bp-md%)').matches) {
      var gap = (innerHeight - parseFloat(getComputedStyle(d).maxHeight)) / 2;
      d.style.setProperty('--_top', Math.max(gap, Math.round((innerHeight - d.offsetHeight) / 2)) + 'px');
      d.setAttribute('data-held', '');
    }
    var f = touched ? d.querySelector('.dialog-title') : d.querySelector('input:not([type=hidden]):not([type=checkbox]):not([disabled]),textarea,select');
    if (f) f.focus();
  }

  B._.step(131, 'dialogForm', function () {
    document.addEventListener('pointerdown', function (e) { touched = e.pointerType === 'touch' || e.pointerType === 'pen'; }, true);
    document.addEventListener('keydown', function () { touched = false; }, true);
    new MutationObserver(function (list) {
      list.forEach(function (m) { var d = m.target; if (d.matches('dialog[data-form]') && d.open && m.oldValue === null) opened(d); });
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['open'], attributeOldValue: true });
  });
})(window.Basalt);
