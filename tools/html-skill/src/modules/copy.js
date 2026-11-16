/* Basalt HTML script, copy module: [data-copy] and [data-copy-text] buttons, and Basalt.copyText. */
(function (B) {
  'use strict';
  var _ = B._;
  var announce = _.announce;

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
          button.innerHTML = (ok ? '%glyph-svg:check%' : '%glyph-svg:close%') + (iconOnly ? '' : '<span>' + (ok ? 'Copied' : 'Copy failed') + '</span>');
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

  B.copyText = copyText;
  _.step(70, 'wireCopy', wireCopy);
})(window.Basalt);
