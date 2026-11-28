/* Basalt HTML script, diagram-zoom module (DECISIONS 301, part 9, as DECISIONS 310): "Expand" in a figure's foot opens the viewer, a form dialog
   (the dialog module's, with the sheet's head, body and foot) whose body is a stage: the figure's drawn layout, laid out once at 100% and zoomed by
   the reader with one transform, from Fit or 100% to 400%; a pan is a scroll. The zoom and pan are React's own (packages/react/src/diagram-zoom-core.ts,
   bundled into this module by build.mjs); the figure is drawn by the diagram module's engine (Basalt._.diagramKit), so this holds no second copy of it.
   compose.mjs adds this module to a page with a figure unless every figure on it says "zoom": false. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-zoom.js (do not edit the copy in the skill folder). */
import { attachZoom, drawnSize, measureViewerFigure, revealIn, VIEWER_KEYS, viewerHint, viewerTextWidth } from "../../../../packages/react/src/diagram-zoom-core.ts";

(function (B) {
  'use strict';
  var _ = B._;

  function esc(s) { return _.diagramKit.escapeHtml(String(s == null ? '' : s)); }
  function kbd(k) { return '<kbd class="kbd">' + esc(k) + '</kbd>'; }
  function px(el, prop) { return parseFloat(getComputedStyle(el).getPropertyValue(prop)) || 0; }

  /** Builds the viewer for one figure and opens it; closing it removes it. */
  function openViewer(page, spec, ctx, opener) {
    var kit = _.diagramKit;
    var still = Object.assign({}, spec, { motion: 'still', replay: undefined });
    // An automatic figure's key hint is read from a placed model, as React's (unplaced, every card is in one cell).
    // Its list sits under the dialog's h2, whatever the page's heading: h3 sub-headings and h4 group lines, as React's. The model's alone.
    var model = kit.buildModel(Object.assign({}, still, { heading: 2 }), { placement: Array.isArray(still.placement) ? still.placement[0] : still.placement });
    // The dialog's ids and its drawing's are built on the page figure's base (G146), so they are as stable as its own; `-v` and `-viewer` meet none of them.
    // A viewer still leaving (opened again during its exit) goes first, so no id is held twice and nothing names the closed one.
    var id = ctx.base + '-viewer';
    var gone = page.__viewer;
    if (gone) { clearTimeout(gone.__leave); gone.remove(); }
    var key = kit.figureKey('diagram', model);
    var hint = viewerHint(kit.hintEntries(model, { layout: 'drawn' })).map(function (e) { return '<span>' + e.keys.map(kbd).join(' ') + ' ' + esc(e.words) + '</span>'; }).join('');
    var d = document.createElement('dialog');
    d.className = 'panel float modal dialog diagram-viewer';
    d.setAttribute('data-form', '');
    d.setAttribute('aria-describedby', id + '-summary');
    d.setAttribute('aria-labelledby', id + '-title');
    page.__viewer = d;
    // The viewer is built outside its figure, so it keeps the figure's palette scope (cimip-gaps-3 T9).
    var scope = (opener || page).closest && (opener || page).closest('[data-palette]');
    if (scope && scope !== document.documentElement) d.setAttribute('data-palette', scope.getAttribute('data-palette'));
    d.innerHTML =
      '<header class="sheet-head"><div class="sheet-head-text"><h2 class="dialog-title" id="' + id + '-title" tabindex="-1">' + esc(model.title) + '</h2>' +
        (spec.source ? '<p class="dialog-description diagram-viewer-source">' + esc(spec.source) + '</p>' : '') + '</div>' +
        '<button type="button" class="btn sheet-close" data-variant="ghost" data-icon-only data-edge="end" data-dialog-close aria-label="Close">%glyph-svg:close%</button></header>' +
      '<p class="visually-hidden" id="' + id + '-summary">' + esc(spec.summary) + '</p>' +
      '<div class="diagram-stage" tabindex="0" role="group" aria-label="Zoomed drawing">' +
        '<span class="diagram-probe" data-probe="row" aria-hidden="true"></span><span class="diagram-probe" data-probe="contain" aria-hidden="true"></span>' +
        '<div class="diagram-sizer"><div class="diagram-layer"><figure class="diagram"></figure></div></div></div>' +
      '<footer class="sheet-foot diagram-viewer-foot">' +
        (key ? '<div class="diagram-viewer-key">' + kit.toHtml(key) + '</div>' : '') +
        '<div class="diagram-viewer-row"><div class="diagram-zoom">' +
          '<button type="button" class="btn" data-variant="ghost" data-size="sm" data-icon-only data-edge="start" data-zoom="out" aria-label="Zoom out">%glyph-svg:minus%</button>' +
          '<span class="diagram-level" aria-hidden="true" data-reserve="400%"><span>100%</span></span>' +
          '<button type="button" class="btn" data-variant="ghost" data-size="sm" data-icon-only data-zoom="in" aria-label="Zoom in">%glyph-svg:plus%</button>' +
          '<button type="button" class="btn diagram-fit" data-variant="secondary" data-size="sm" data-zoom="fit"><span>Fit</span></button></div>' +
          '<p class="diagram-hint diagram-viewer-hint" data-kbd-hint aria-hidden="true">' + hint + '</p>' +
          '<div class="diagram-viewer-end"><button type="button" class="btn diagram-toggle" data-variant="secondary" data-size="sm" aria-expanded="false"><span>View as list</span></button></div>' +
        '</div><span class="visually-hidden" role="status"></span></footer>';
    document.body.appendChild(d);
    var stage = d.querySelector('.diagram-stage'), sizer = d.querySelector('.diagram-sizer'), layer = d.querySelector('.diagram-layer');
    var fig = layer.firstChild, status = d.querySelector('[role="status"]'), level = d.querySelector('.diagram-level > span');
    var keyBox = d.querySelector('.diagram-viewer-key'), toggle = d.querySelector('.diagram-toggle');
    var buttons = { out: d.querySelector('[data-zoom="out"]'), in: d.querySelector('[data-zoom="in"]'), fit: d.querySelector('[data-zoom="fit"]') };
    var list = null, listOpen = false, bare = false;
    var setOff = function (b, off) { if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); };
    var zoom = attachZoom({
      stage: stage, sizer: sizer, layer: layer, status: status, rest: px(stage, '--_rest') || 300,
      onChange: function (s) {
        level.textContent = s.level + '%';
        setOff(buttons.out, s.listOpen || s.atMin);
        setOff(buttons.in, s.listOpen || s.atMax);
        setOff(buttons.fit, s.listOpen || s.atFit);
      },
    });
    var memo = {};
    var view = {
      layer: layer, avail: 0, row: 1104, contain: 480, memo: memo, measureFigure: kit.measureFigure, keys: VIEWER_KEYS, base: ctx.base + '-v',
      room: function () { var pad = parseFloat(getComputedStyle(sizer).paddingTop) || 0; return { w: stage.clientWidth - 2 * pad, h: stage.clientHeight - 2 * pad }; },
      measure: function (f, m, p, base, current, apply, warn) { return measureViewerFigure(f, m, p, base, current, apply, warn, view); },
      textWidth: function (need) { viewerTextWidth(view, need); },
      onMeasured: function (measured, f) {
        stage.setAttribute('data-layout', measured.dyn.layout || '');
        if (keyBox) { keyBox.setAttribute('data-layout', measured.dyn.layout || ''); keyBox.toggleAttribute('data-bare', Boolean(measured.dyn.bare)); }
        bare = Boolean(measured.dyn.bare);
        toggle.hidden = bare;
        showList(listOpen || bare);
        // The drawing's own box (the one-column ruling): a capped column is fitted and scrolled as its column.
        var box = drawnSize(f);
        zoom.size(box[0], box[1]);
      },
    };
    function readStage() {
      view.avail = Math.max(0, Math.floor(stage.clientWidth - 2 * (parseFloat(getComputedStyle(sizer).paddingLeft) || 0)));
      view.row = d.querySelector('[data-probe="row"]').offsetWidth || 1104;
      view.contain = d.querySelector('[data-probe="contain"]').offsetWidth || 480;
    }
    function showList(open) {
      if (open && !list) {
        list = document.createElement('div');
        list.className = 'diagram-list diagram-viewer-list';
        list.innerHTML = kit.figureList('diagram', model).map(function (v) { return kit.toHtml(v); }).join('');
        stage.appendChild(list);
      }
      // The place is kept before the drawing is hidden, and given back once it shows again.
      if (open) zoom.list(true);
      if (list) list.hidden = !open;
      sizer.hidden = open;
      if (!open) zoom.list(false);
    }
    toggle.addEventListener('click', function () {
      listOpen = !listOpen;
      toggle.setAttribute('aria-expanded', String(listOpen));
      toggle.firstElementChild.textContent = listOpen ? 'Hide the list' : 'View as list';
      showList(listOpen || bare);
    });
    buttons.out.addEventListener('click', function () { if (!buttons.out.hasAttribute('aria-disabled')) zoom.zoomOut(); });
    buttons.in.addEventListener('click', function () { if (!buttons.in.hasAttribute('aria-disabled')) zoom.zoomIn(); });
    buttons.fit.addEventListener('click', function () { if (!buttons.fit.hasAttribute('aria-disabled')) zoom.fit(); });
    // A linked card is followed on a click, a tap or Enter; a link that stays in this tab closes the viewer first (DECISIONS 310, 9.7).
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.diagram-node[href]');
      if (!a || !d.contains(a) || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== '_self')) return;
      if (d.open) d.close();
    });
    stage.addEventListener('focusin', function (e) {
      var node = e.target.closest && e.target.closest('.diagram-node');
      if (node && stage.contains(node)) revealIn(stage, node, px(stage, '--_clear') || 16);
    });

    // The viewer's foot has the downloads too, writing the viewer's drawing (DECISIONS 310, 9.11).
    if (spec.export === true && typeof _.diagramExport === 'function') _.diagramExport(d.querySelector('.diagram-viewer-end'), fig);
    B.openDialog(d, opener);
    readStage();
    kit.draw(fig, still, false, view);
    // Focus opens on the stage, so the zoom keys and the scrolling keys work at once and no card is traced (9.8).
    setTimeout(function () { stage.focus({ preventScroll: true }); }, 0);
    var width = stage.clientWidth;
    var observer = new ResizeObserver(function () {
      if (Math.abs(stage.clientWidth - width) < 0.5) return;
      width = stage.clientWidth;
      readStage();
      if (fig.__diagram) fig.__diagram.layout();
    });
    observer.observe(stage);
    // Laid out again once the dialog's entrance has ended, unscaled, so its lines snap on the pixel grid they are drawn on.
    d.addEventListener('transitionend', function (e) { if (e.target === d && e.propertyName === 'transform' && d.open && fig.__diagram) fig.__diagram.layout(); });
    page.setAttribute('data-viewing', '');
    if (ctx.animated) ctx.settle();
    d.addEventListener('close', function () {
      observer.disconnect();
      zoom.destroy();
      if (fig.__diagram) fig.__diagram.stop();
      if (page.__viewer === d) page.removeAttribute('data-viewing');
      // The dialog leaves on its own motion, then goes.
      d.__leave = setTimeout(function () { d.remove(); if (page.__viewer === d) page.__viewer = null; }, px(d, '--_dur') * 0.75 || 300);
    });
  }

  /** Puts "Expand" after "View as list" in a figure's foot. Returns what the diagram module calls when it draws the figure again. */
  _.diagramZoom = function (page, spec, ctx) {
    var foot = page.querySelector(':scope > .diagram-foot');
    if (!foot) return null;
    var old = foot.querySelector('.diagram-expand');
    if (old) old.remove();
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn diagram-expand';
    button.setAttribute('data-variant', 'secondary');
    button.setAttribute('data-size', 'sm');
    button.setAttribute('aria-haspopup', 'dialog');
    // Words only, as React's (a deviation from 9.1): the core set draws no expand glyph.
    button.innerHTML = '<span>Expand</span>';
    // Named for its figure (G17 of the console's log): "Expand", then the title, as React's.
    var titleId = page.getAttribute('aria-labelledby');
    if (titleId) {
      button.firstChild.id = titleId.replace(/-title$/, '') + '-expand-words';
      button.setAttribute('aria-labelledby', button.firstChild.id + ' ' + titleId);
    }
    var toggle = foot.querySelector('.diagram-toggle');
    if (toggle && toggle.nextSibling) foot.insertBefore(button, toggle.nextSibling); else foot.appendChild(button);
    var onClick = function () { openViewer(page, spec, ctx, button); };
    button.addEventListener('click', onClick);
    return { destroy: function () { button.removeEventListener('click', onClick); button.remove(); } };
  };
})(window.Basalt);
