/* Basalt HTML script, glyph module: Basalt's own glyphs (the core set, packages/react/glyphs/source.mjs), drawn from <span data-glyph="home"></span>.
   A glyph is eight cubic strokes on a 24 grid, 2.25 units wide at every size. At rest it has an opening; inside the current page (an ancestor with
   aria-current, or data-current) or with data-selected it is drawn selected: the opening closed, the shape filled, its inner strokes cut out. data-size is 16
   (the default), 20 or 24. The drawings are worked out at build time (build.mjs), and a page carries only the glyphs it names, plus the ones a module draws itself
   (compose.mjs adds them with Basalt._.addGlyphs). Used by the sheet's Menu and Close, the navigation's glyphs and the tab bar.
   Source: tools/html-skill/src/modules/glyph.js (do not edit the copy in the skill folder). */
(function (B) {
  'use strict';
  var _ = B._;
  var GLYPHS = {};
  var seq = 0;
  var warned = {};

  /** The SVG for a glyph by name: its settled drawing at rest or selected, at a size. An unknown name warns once and draws nothing. */
  function glyph(name, opts) {
    var o = opts || {};
    var g = Object.prototype.hasOwnProperty.call(GLYPHS, name) ? GLYPHS[name] : null;
    if (!g) {
      if (!warned[name]) { warned[name] = 1; console.warn('Basalt: unknown glyph "' + name + '" (on this page: ' + Object.keys(GLYPHS).join(', ') + '; write it as data-glyph="' + name + '" in the page and compose again)'); }
      return '';
    }
    var size = Number(o.size);
    if (!(size > 0 && size < Infinity)) size = 16;
    var inner = (o.selected && g[1]) || g[0];
    // A drawing with a mask names it for its own: two on one page must not share an id.
    if (inner.indexOf('@') >= 0) inner = inner.split('@').join('bg' + (++seq));
    return '<svg class="icon" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /** Draws every [data-glyph] under root. Selected inside aria-current or data-current, or with data-selected. */
  function hydrate(root) {
    (root || document).querySelectorAll('[data-glyph]').forEach(function (el) {
      var selected = el.hasAttribute('data-selected') || !!el.closest('[aria-current]:not([aria-current="false"]), [data-current]');
      var svg = glyph(el.getAttribute('data-glyph'), { size: Number(el.getAttribute('data-size')) || 16, selected: selected });
      if (svg) el.outerHTML = svg;
    });
  }

  _.addGlyphs = function (data) { for (var k in data) GLYPHS[k] = data[k]; };
  _.glyph = glyph;
  _.hydrateGlyphs = hydrate;
  _.step(45, 'hydrateGlyphs', function () { hydrate(); });
})(window.Basalt);
