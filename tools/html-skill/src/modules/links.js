/* Links: the new-tab cue. A link with target="_blank" gets the core `external` arrow after its name and says "(opens in a new tab)" in its
   name, as React's Link does: automatically, with no opt-out. A link that holds only a logo or a glyph keeps the words and skips the
   arrow, and mailto: gets none. `data-new-tab-label="words"` on the link translates the words. The arrow is the core glyph, three lines on
   the 24 grid with a 2.25 round stroke (the path is read from packages/react/glyphs/source.mjs at build time).
   Source: tools/html-skill/src/modules/links.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var ARROW = '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="%glyph:external%"/></svg>';

  function cue(root) {
    (root || document).querySelectorAll('a[target="_blank"]:not([data-new-tab])').forEach(function (a) {
      a.setAttribute('data-new-tab', '');
      // Safe by default, as React's Link: a new tab never gets the opener.
      var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      ['noopener', 'noreferrer'].forEach(function (r) { if (rel.indexOf(r) < 0) rel.push(r); });
      a.setAttribute('rel', rel.join(' '));
      var words = ' ' + (a.getAttribute('data-new-tab-label') || '(opens in a new tab)');
      var label = a.getAttribute('aria-label');
      var named = a.textContent.trim() !== '';
      // The arrow sits after the name: inside a row's label, else at the end of the link.
      if (named && !/^mailto:/i.test(a.getAttribute('href') || '')) (a.querySelector('.row-label') || a).insertAdjacentHTML('beforeend', '<span class="ext" aria-hidden="true">\u2060' + ARROW + '</span>');
      // An aria-label replaces the content, so the words join the label itself.
      if (label) a.setAttribute('aria-label', label + words);
      else a.insertAdjacentHTML('beforeend', '<span class="visually-hidden">' + _.esc(words) + '</span>');
    });
  }

  B.newTabCue = cue;
  _.step(50, 'newTabCue', function () { cue(); });
})(window.Basalt);
