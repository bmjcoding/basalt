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

  /* The form with words (DECISIONS 152, X8): data-copy-words="Copied" keeps the button's own words and holds both in one cell, so its width never
     changes. It says the words only after the write succeeded, for `duration-confirm` (as CodeBlock and Terminal), and a refused clipboard leaves it as it was.
     The page's live region says "Copied to clipboard" (or data-copy-status). */
  function wireWords(button) {
    var rest = button.innerHTML;
    var cell = document.createElement('span');
    cell.className = 'copy-words';
    var on = document.createElement('span');
    on.setAttribute('data-on', '');
    on.innerHTML = rest;
    var off = document.createElement('span');
    off.textContent = button.getAttribute('data-copy-words');
    off.setAttribute('aria-hidden', 'true');
    off.inert = true;
    cell.appendChild(on);
    cell.appendChild(off);
    button.textContent = '';
    button.appendChild(cell);
    function show(copied) {
      on.toggleAttribute('data-on', !copied);
      off.toggleAttribute('data-on', copied);
      on.setAttribute('aria-hidden', String(copied)); on.inert = copied;
      off.setAttribute('aria-hidden', String(!copied)); off.inert = !copied;
    }
    show(false);
    button.addEventListener('click', function () {
      var target = button.dataset.copy ? document.querySelector(button.dataset.copy) : null;
      var text = button.dataset.copyText != null ? button.dataset.copyText : (target ? target.textContent : '');
      copyText(text).then(function (ok) {
        if (!ok) return;
        show(true);
        announce(button.getAttribute('data-copy-status') || 'Copied to clipboard');
        clearTimeout(button.__bhTimer);
        button.__bhTimer = setTimeout(function () { show(false); }, %duration-confirm%);
      });
    });
  }

  function wireCopy() {
    document.querySelectorAll('[data-copy], [data-copy-text]').forEach(function (button) {
      if (button.__bh) return;
      button.__bh = true;
      if (button.hasAttribute('data-copy-words')) { wireWords(button); return; }
      // The resting label is read once, here, so a second press during the feedback can never mistake "Copied" for it.
      var rest = [button.innerHTML, button.getAttribute('aria-label')];
      var iconOnly = button.hasAttribute('data-icon-only');
      button.addEventListener('click', function () {
        var target = button.dataset.copy ? document.querySelector(button.dataset.copy) : null;
        var text = button.dataset.copyText != null ? button.dataset.copyText : (target ? target.textContent : '');
        copyText(text).then(function (ok) {
          // A copy with a glyph and words keeps its words and changes its glyph (DECISIONS 336, Q5); the icon alone also changes its name.
          // One write of the button's own markup, its first glyph (an svg, or a span the glyph module has not drawn yet) swapped for a constant.
          button.innerHTML = rest[0].replace(/<svg[\s\S]*?<\/svg>|<span data-glyph[^>]*><\/span>/, ok ? '%glyph-svg:check%' : '%glyph-svg:close%');
          if (iconOnly) button.setAttribute('aria-label', ok ? 'Copied' : 'Copy failed');
          announce(iconOnly ? (ok ? 'Copied to clipboard' : 'Copy failed') : (ok ? 'Copied' : 'Copy failed'));
          clearTimeout(button.__bhTimer);
          button.__bhTimer = setTimeout(function () {
            button.innerHTML = rest[0];
            if (iconOnly) { if (rest[1] == null) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', rest[1]); }
          }, %duration-confirm%);
        });
      });
    });
  }

  B.copyText = copyText;
  _.step(70, 'wireCopy', wireCopy);
})(window.Basalt);
