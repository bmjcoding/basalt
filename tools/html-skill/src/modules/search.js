/* Basalt HTML script, search module: the search dialog's top (DECISIONS 336). It is held where the dialog has it with a full result, measured as
   it opens and again when the usable window changes (a resize, the on-screen keyboard), so the field and the count never move while the window
   holds still and the box ends under what it shows. React's SearchDialog holds it the same way.
   Source: tools/html-skill/src/modules/search.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  /** The height a page can use: the visual viewport's where there is one (it shrinks for the on-screen keyboard), else the window's. */
  function usable() { return window.visualViewport ? window.visualViewport.height : innerHeight; }

  function place(d) {
    d.removeAttribute('data-held');
    d.style.removeProperty('--_top');
    d.style.removeProperty('--_room');
    var room = usable();
    var max = Math.min(parseFloat(getComputedStyle(d).maxHeight) || room, room);
    var r = d.querySelector('.search-results');
    var grow = r ? parseFloat(getComputedStyle(r).maxHeight) - r.offsetHeight : 0;
    var h = Math.min(d.offsetHeight + (grow > 0 ? grow : 0), max);
    // The top is the full box's, never so low that the box would end past what can be seen.
    var top = Math.max((room - max) / 2, Math.round((room - h) / 2));
    d.style.setProperty('--_top', Math.max(0, Math.min(top, room - h)) + 'px');
    d.style.setProperty('--_room', room + 'px');
    d.setAttribute('data-held', '');
  }

  function again() { document.querySelectorAll('dialog.search[open]').forEach(place); }

  B._.step(131, 'searchTop', function () {
    // The results fade at each edge that hides more (cimip-gaps-3 t7); a focused result and its +2 ring are never under a band. The dialog has no second port.
    document.querySelectorAll('dialog.search .search-results').forEach(function (r) { B._.scrollFade(r, { axis: 'block', ring: 4 }); });
    new MutationObserver(function (list) {
      list.forEach(function (m) { var d = m.target; if (d.matches('dialog.search') && d.open && m.oldValue === null) place(d); });
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['open'], attributeOldValue: true });
    addEventListener('resize', again);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', again);
  });
})(window.Basalt);
