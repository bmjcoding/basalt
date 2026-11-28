/* Basalt HTML script, stats module (cimip-gaps-3 T2, item 2): a stat that links. It puts the core arrow-right after the figure (20, or 16 beside words
   for a value not observed); a new-tab link has the links module's external arrow and words, and here the words take an id that goes last in the link's
   aria-labelledby, because a name from aria-labelledby replaces the link's content. Nothing else: the stretched link and the hint are CSS and the popover
   module. Source: tools/html-skill/src/modules/stats.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var ARROW = '%glyph-svg:arrow-right%';
  var n = 0;

  function wire(root) {
    (root || document).querySelectorAll('.stat-link:not([data-stat-cue])').forEach(function (a) {
      a.setAttribute('data-stat-cue', '');
      var stat = a.closest('.stat');
      if (stat) stat.setAttribute('data-linked', '');
      if (a.getAttribute('target') === '_blank') {
        var words = a.querySelector(':scope > .visually-hidden:last-child');
        if (!words) return;
        if (!words.id) { n += 1; words.id = 'bh-stat-tab-' + n; }
        var ids = (a.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
        if (ids.indexOf(words.id) < 0) { ids.push(words.id); a.setAttribute('aria-labelledby', ids.join(' ')); }
        return;
      }
      var size = a.closest('.stat-value[data-missing]') ? '16' : '20';
      a.insertAdjacentHTML('beforeend', '<span class="stat-cue" aria-hidden="true">' + ARROW.replace(/width="16" height="16"/, 'width="' + size + '" height="' + size + '"') + '</span>');
    });
  }

  B.stats = wire;
  // After the links module (50), which adds a new-tab link's words.
  _.step(60, 'stats', function () { wire(); });
})(window.Basalt);
