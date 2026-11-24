/* Basalt HTML script, glyph module: Basalt's own glyphs (the core set, packages/react/glyphs/source.mjs), drawn from <span data-glyph="home"></span>.
   A glyph is eight cubic strokes on a 24 grid, 2.25 units wide at every size. At rest it has an opening; inside the current page (an ancestor with
   aria-current, or data-current; drawn again when a page that routes itself moves the mark) or with data-selected it is drawn selected: the opening closed, the shape filled, its inner strokes cut out. In a segment or a tab it follows the item's choice, and so it does in a toggle's seat (.btn-check) when it has a selected form (pause). data-size is 16
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

  var CURRENT = '[aria-current]:not([aria-current="false"]), [data-current]';
  // In a segment, a tab or a link tab the glyph draws both forms in one box, and the item's own state shows the one that matches (the segment and tabs modules' CSS), so it follows the choice.
  var PAIRED = '.segment, [role="tab"], .link-tab';
  // A page that routes itself moves the current mark between the items of a list without a reload: the lists that hold glyphs are watched, and nothing else.
  var ITEMS = 'nav, [role="navigation"], [role="tablist"], [role="menu"], ul, ol, table, .segment, .tab-bar';
  var drawn = [];
  var observer;

  /** Both forms of a glyph in one box, rest then selected; the item's own state shows the one that matches, and the two crossfade. */
  function pair(name, size) { return '<span data-pair>' + glyph(name, { size: size }) + glyph(name, { size: size, selected: true }) + '</span>'; }

  /** What a toggle's seat (.btn-check) holds: the pair where the glyph has a selected form (React's `changes()`: pause's bars fill), else the glyph at rest (pressed shows the check). */
  function seat(name, size) { var g = GLYPHS[name]; return g && g[1] ? pair(name, size) : glyph(name, { size: size }); }

  /** The glyph drawn in place of `el`: its settled form, or both in one box where the item's own state shows the one that matches. Returns the new node. */
  function put(el, name, size, selected) {
    var svg = glyph(name, { size: size, selected: selected });
    if (!svg) return null;
    var t = document.createElement('template');
    t.innerHTML = selected ? svg : el.closest(PAIRED) ? pair(name, size) : el.matches('.btn-check') ? seat(name, size) : svg;
    var node = t.content.firstChild;
    // A toggle's seat (.btn-check) is drawn into, so it keeps its place and the check it crossfades with.
    if (el.matches('.btn-check')) el.replaceChildren(node);
    else el.replaceWith(node);
    return node;
  }

  /** A current mark moved: each followed glyph under it takes the form its ancestors now give it. */
  function moved(records) {
    drawn.forEach(function (d) {
      var selected = !!d.node.closest(CURRENT);
      if (selected === d.selected || !records.some(function (r) { return r.target.contains(d.node); })) return;
      var node = put(d.node, d.name, d.size, selected);
      if (node) { d.selected = selected; d.node = node.tagName === 'svg' ? node : null; }
    });
    drawn = drawn.filter(function (d) { return d.node && d.node.isConnected; });
  }

  /** Draws every [data-glyph] under root. Selected inside aria-current or data-current, or with data-selected. */
  function hydrate(root) {
    (root || document).querySelectorAll('[data-glyph]').forEach(function (el) {
      var own = el.hasAttribute('data-selected');
      var selected = own || !!el.closest(CURRENT);
      var name = el.getAttribute('data-glyph'), size = Number(el.getAttribute('data-size')) || 16;
      var node = put(el, name, size, selected);
      var scope = node && !own && node.tagName === 'svg' && node.closest(ITEMS);
      if (!scope) return;
      drawn.push({ node: node, name: name, size: size, selected: selected });
      observer = observer || new MutationObserver(moved);
      observer.observe(scope, { attributes: true, attributeFilter: ['aria-current', 'data-current'], subtree: true });
    });
  }

  _.addGlyphs = function (data) { for (var k in data) GLYPHS[k] = data[k]; };
  _.glyph = glyph;
  _.glyphPair = pair;
  _.glyphSeat = seat;
  _.hydrateGlyphs = hydrate;
  _.step(45, 'hydrateGlyphs', function () { hydrate(); });
})(window.Basalt);
