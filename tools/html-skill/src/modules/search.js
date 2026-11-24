/* Basalt HTML script, search module: the search dialog's top (DECISIONS 336). It is held where the dialog has it with a full result, measured as
   it opens, so the field and the count never move and the box ends under what it shows. React's SearchDialog holds it the same way.
   Source: tools/html-skill/src/modules/search.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  function opened(d) {
    d.removeAttribute('data-held');
    var max = parseFloat(getComputedStyle(d).maxHeight);
    var r = d.querySelector('.search-results');
    var room = r ? parseFloat(getComputedStyle(r).maxHeight) - r.offsetHeight : 0;
    var h = d.offsetHeight + (room > 0 ? room : 0);
    if (max > 0) h = Math.min(h, max);
    d.style.setProperty('--_top', Math.max(max > 0 ? (innerHeight - max) / 2 : 0, Math.round((innerHeight - h) / 2)) + 'px');
    d.setAttribute('data-held', '');
  }

  B._.step(131, 'searchTop', function () {
    new MutationObserver(function (list) {
      list.forEach(function (m) { var d = m.target; if (d.matches('dialog.search') && d.open && m.oldValue === null) opened(d); });
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['open'], attributeOldValue: true });
  });
})(window.Basalt);
