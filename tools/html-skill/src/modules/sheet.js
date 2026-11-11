/* Basalt HTML script, sheet module: the core glyphs a sheet's first row draws, <span data-glyph="menu"></span> and <span data-glyph="close"></span>.
   They are the core set's Menu and Close (three lines, and a plus turned 45 degrees), 24 grid, 2.25 round stroke, read from
   packages/react/glyphs/source.mjs at build time. React morphs Menu into Close in the narrow menu's button (MorphIcon); the skill swaps them at once.
   Source: tools/html-skill/src/modules/sheet.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var PATHS = { menu: '%glyph:menu%', close: '%glyph:close%' };

  function hydrate() {
    document.querySelectorAll('[data-glyph]').forEach(function (el) {
      var d = PATHS[el.getAttribute('data-glyph')];
      if (!d) return;
      var size = Number(el.getAttribute('data-size')) || 16;
      el.outerHTML = '<svg class="icon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
    });
  }

  _.step(45, 'hydrateGlyphs', hydrate);
})(window.Basalt);
