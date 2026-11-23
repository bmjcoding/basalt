/* Basalt HTML script, diagram module (DECISIONS 281, revised by 282): `<figure class="diagram">` holding `<script type="application/json"
   data-diagram>` is drawn from that JSON (the React props, key for key), or `Basalt.diagram(figure, spec)` draws one from script. The engine
   is React's own (packages/react/src/diagram-core.ts): build.mjs bundles it into this module, so the skill and React lay out, route, seat
   and draw the same pixels. compose.mjs runs `Basalt._.diagramMarkup` at build time and writes each figure's words into the page, so it
   reads before any script runs; this script then measures it, draws its lines and labels, and wires the keys, the trace and the list.
   Source: tools/html-skill/src/modules/diagram.js (do not edit the copy in the skill folder). */
import { applyTrace, buildModel, entranceDrawn, escapeHtml, figureKey, figureList, figureTree, hasStops, hintEntries, keyTarget, measureFigure, measureViewerFigure, moveStop, settleEntrance, syncAttributes, toHtml } from "../../../../packages/react/src/diagram-core.ts";

(function (B) {
  'use strict';
  var _ = B._;
  var P = 'diagram';
  var serial = 0;

  function options(base, spec, viewer) {
    return { prefix: P, base: base, hasSource: spec.source !== undefined && spec.source !== null && spec.source !== '', hiddenClass: 'visually-hidden', viewer: Boolean(viewer) };
  }
  function slots(model, spec, base, open) {
    var kbd = function (k) { return '<kbd class="kbd">' + escapeHtml(k) + '</kbd>'; };
    return {
      source: escapeHtml(String(spec.source || '')),
      summary: escapeHtml(String(spec.summary || '')),
      hint: hintEntries(model).map(function (e) { return '<span>' + e.keys.map(kbd).join(' ') + ' ' + escapeHtml(e.words) + '</span>'; }).join(''),
      toggle: '<button type="button" class="btn diagram-toggle" data-variant="secondary" data-size="sm" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + escapeHtml(base) + '-list"><span>' + (open ? 'Hide the list' : 'View as list') + '</span></button>',
    };
  }

  /** The figure's markup before script runs: its attributes and its inside, as compose.mjs writes it (and as this script writes it for a figure that has none). */
  function markup(spec, base, viewer) {
    var model = buildModel(spec);
    var tree = figureTree(model, {}, options(base, spec, viewer));
    var html = toHtml(tree, slots(model, spec, base, false));
    var open = html.indexOf('>');
    return { open: html.slice(0, open + 1), inner: html.slice(open + 1, html.length - '</figure>'.length), warnings: model.warnings };
  }

  // The attributes the figure's markup sets on the figure itself; a redraw clears them before it writes the new ones.
  var OWN = ['aria-labelledby', 'data-type', 'data-cols', 'data-reach', 'data-gutter', 'data-layout', 'data-measured', 'data-bare'];
  var OWN_STYLE = ['--_cols', '--_gpad', '--_track'];

  /**
   * Draws a figure. `attach` is the page's own wiring: a figure compose.mjs already wrote is measured as it is. Otherwise (a figure with no
   * markup, or `Basalt.diagram(figure, spec)` drawing new data into one that has some) the markup is written from the spec first, so the
   * words, the list and the sentences are the new data's.
   */
  function draw(figure, spec, attach, viewer) {
    if (figure.__diagram) figure.__diagram.stop();
    var base = (figure.getAttribute('aria-labelledby') || '').replace(/-title$/, '').replace(/[^A-Za-z0-9_-]/g, '');
    var model = buildModel(spec);
    if (!attach || !base || !figure.querySelector(':scope > .diagram-drawing')) {
      // Keep the figure's base when it has ours, so its ids stay; otherwise take the next free one.
      if (!base || !figure.querySelector('#' + CSS.escape(base + '-title'))) {
        while (document.getElementById('dg' + (++serial) + '-title')) { /* the next free base */ }
        base = 'dg' + serial;
      }
      var made = markup(spec, base, viewer);
      var holder = document.createElement('div');
      holder.innerHTML = made.open + '</figure>';
      var fresh = holder.firstChild;
      OWN.forEach(function (n) { figure.removeAttribute(n); });
      OWN_STYLE.forEach(function (n) { figure.style.removeProperty(n); });
      for (var a = 0; a < fresh.attributes.length; a++) {
        var at = fresh.attributes[a];
        if (at.name === 'class') figure.classList.add.apply(figure.classList, at.value.split(' '));
        else if (at.name === 'style') figure.style.cssText = at.value + ';' + figure.style.cssText;
        else figure.setAttribute(at.name, at.value);
      }
      figure.querySelectorAll(':scope > :not(script[data-diagram])').forEach(function (el) { el.remove(); });
      figure.insertAdjacentHTML('beforeend', made.inner);
    }
    model.warnings.forEach(function (w) { console.warn('Basalt diagram: ' + w); });
    var opts = options(base, spec, viewer);
    var state = {};
    var measured = null;
    var focusTrace = null, hoverTrace = null;
    var warned = Object.create(null);
    var warn = function (m) { if (!warned[m]) { warned[m] = 1; console.warn('Basalt diagram: ' + m); } };
    var apply = function (d) { syncAttributes(figure, figureTree(model, d, opts)); };
    var ink = figure.querySelector('.diagram-ink');
    var toggle = figure.querySelector('.diagram-toggle');
    // Motion (DECISIONS 292) is the diagram-motion module's: compose.mjs adds it to a page whose diagram says "motion": "animated". Without it the
    // figure is as still. `drawn` is the ink last written, so a measure that draws the same lines writes nothing.
    var animated = !viewer && model.motion.animated && typeof _.diagramMotion === 'function';
    var motion = null, drawn = null;
    var settle = function () { if (animated) settleEntrance(figure); };

    function retrace() { applyTrace(figure, P, measured && measured.geo, measured && measured.tokens, base, focusTrace || hoverTrace); }
    // The toggle's words and state follow the list's (a stack drawn with no lines opens it).
    function syncToggle() {
      if (!toggle) return;
      toggle.setAttribute('aria-expanded', String(Boolean(state.open)));
      toggle.firstElementChild.textContent = state.open ? 'Hide the list' : 'View as list';
    }
    function layout() {
      // The viewer's figure (DECISIONS 310, the diagram-zoom module) is laid out at the stage's width and measured only at 100%.
      measured = viewer ? measureViewerFigure(figure, model, P, base, state, apply, warn, viewer) : measureFigure(figure, model, P, base, state, apply, warn);
      state = measured.dyn;
      apply(state);
      syncToggle();
      // A layout with no stops traces nothing: a pointer resting on a node as the figure narrows into one leaves no trace behind.
      if (!hasStops(model, state)) hoverTrace = null;
      var fresh = ink && measured.ink !== drawn;
      if (fresh) { ink.innerHTML = measured.ink; drawn = measured.ink; }
      retrace();
      // In the frame an animated figure's lines are first drawn it is pending; after that the motion module follows a drawing that changed.
      if (animated && measured.tokens) { entranceDrawn(figure, Boolean(measured.geo && measured.geo.lines.length)); if (fresh && motion) motion.redrawn(); }
      if (viewer && viewer.onMeasured) viewer.onMeasured(measured, figure);
    }
    function setState(next) { state = next; apply(state); }
    // A move of the roving stop touches the two nodes it moves between, not the whole figure.
    function setStop(id) { var from = state.stop; state = Object.assign({}, state, { stop: id }); moveStop(figure, P, from, id); }
    var nodeOf = function (t) { var el = t && t.closest ? t.closest('.diagram-node') : null; return el && figure.contains(el) ? el : null; };

    function onKey(event) {
      var node = nodeOf(event.target);
      if (!node || event.defaultPrevented) return;
      settle();
      // In the viewer Esc always closes the dialog, traced or not (DECISIONS 310, 9.8).
      if (event.key === 'Escape') { if (!viewer && (focusTrace || hoverTrace)) { event.preventDefault(); focusTrace = hoverTrace = null; retrace(); } return; }
      if (!hasStops(model, state)) return;
      var to = keyTarget(model, node.getAttribute('data-node'), event.key);
      if (!to) return;
      event.preventDefault();
      setStop(to);
      var el = figure.querySelector('.diagram-node[data-node="' + CSS.escape(to) + '"]');
      if (el) el.focus();
    }
    function onFocusIn(event) {
      var node = nodeOf(event.target);
      if (!node) return;
      settle();
      var id = node.getAttribute('data-node');
      // Tracing follows the keyboard's focus (:focus-visible), so a press that focuses a node traces nothing.
      focusTrace = node.matches(':focus-visible') ? id : null;
      if (hasStops(model, state) && state.stop !== id) setStop(id);
      retrace();
    }
    function onFocusOut(event) {
      var left = nodeOf(event.target);
      if (!left) return;
      if (!nodeOf(event.relatedTarget)) focusTrace = null;
      if (state.keep === left.getAttribute('data-node')) setState(Object.assign({}, state, { keep: undefined }));
      retrace();
    }
    function onOver(event) {
      if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover)').matches) return;
      var node = nodeOf(event.target);
      if (node) settle();
      var next = node && hasStops(model, state) ? node.getAttribute('data-node') : null;
      if (next !== hoverTrace) { hoverTrace = next; retrace(); }
    }
    function onLeave() { if (hoverTrace) { hoverTrace = null; retrace(); } }
    function onToggle() {
      settle();
      setState(Object.assign({}, state, { open: !state.open, autoOpen: undefined }));
      syncToggle();
    }

    figure.addEventListener('keydown', onKey);
    figure.addEventListener('focusin', onFocusIn);
    figure.addEventListener('focusout', onFocusOut);
    figure.addEventListener('pointerover', onOver);
    figure.addEventListener('pointerleave', onLeave);
    if (toggle) toggle.addEventListener('click', onToggle);
    layout();
    var width = figure.clientWidth, frame = 0, live = true;
    var observer = new ResizeObserver(function () {
      if (Math.abs(figure.clientWidth - width) < 0.5) return;
      width = figure.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    });
    observer.observe(figure);
    if (document.fonts) document.fonts.ready.then(function () { if (live) layout(); });
    // A card's mark keeps its seat's padding out of forced colours, where none is drawn: the mode changing is a new measure (DECISIONS 292, 2.7).
    var forced = matchMedia('(forced-colors: active)');
    var marks = model.nodes.some(function (n) { return n.mark; });
    if (marks) forced.addEventListener('change', layout);
    if (animated) motion = _.diagramMotion(figure, { fig: figure, P: P, base: base, model: function () { return model; }, geo: function () { return measured && measured.geo; }, tokens: function () { return measured && measured.tokens; } }, spec);
    // "Expand" and the viewer (DECISIONS 310) are the diagram-zoom module's: compose.mjs adds it to a page unless every figure on it says "zoom": false.
    var zoom = !viewer && spec.zoom !== false && typeof _.diagramZoom === 'function' ? _.diagramZoom(figure, spec, { model: model, settle: settle, animated: animated }) : null;
    figure.__diagram = {
      stop: function () {
        if (zoom) zoom.destroy();
        live = false; observer.disconnect(); cancelAnimationFrame(frame);
        if (marks) forced.removeEventListener('change', layout);
        if (motion) motion.destroy();
        figure.removeEventListener('keydown', onKey); figure.removeEventListener('focusin', onFocusIn); figure.removeEventListener('focusout', onFocusOut);
        figure.removeEventListener('pointerover', onOver); figure.removeEventListener('pointerleave', onLeave);
        if (toggle) toggle.removeEventListener('click', onToggle);
      },
      layout: layout,
      key: sendless(spec),
      // The same figure with only a new packet.send: the message goes on the figure as it is, so a dot in flight is not cut short (1.8, 1.9).
      send: motion && motion.sendValue ? motion.sendValue : null,
    };
  }

  /** A spec as text without its packet's send, so two calls that differ only in what they send are seen as the same figure. */
  function sendless(spec) {
    try {
      return JSON.stringify(spec, function (k, v) { return k === 'packet' && v && typeof v === 'object' ? Object.assign({}, v, { send: undefined }) : v; });
    } catch (e) { return null; }
  }

  function wireDiagrams() {
    document.querySelectorAll('figure.diagram').forEach(function (figure) {
      if (figure.__diagram) return;
      var source = figure.querySelector(':scope > script[data-diagram]');
      if (!source) return;
      try { draw(figure, JSON.parse(source.textContent), true); } catch (e) { console.error('Basalt diagram: this figure could not be drawn', e); }
    });
  }

  _.diagramMarkup = markup;
  // What the viewer (the diagram-zoom module) draws with: this module's engine, so that module holds no second copy of it.
  _.diagramKit = { draw: draw, buildModel: buildModel, figureKey: figureKey, figureList: figureList, hintEntries: hintEntries, toHtml: toHtml, escapeHtml: escapeHtml, settleEntrance: settleEntrance };
  B.diagram = function (figure, spec) {
    var d = figure.__diagram;
    var key = d && d.send ? sendless(spec) : null;
    if (key !== null && key === d.key) { d.send(spec.packet ? spec.packet.send : undefined); return; }
    draw(figure, spec);
  };
  _.step(62, 'wireDiagrams', wireDiagrams);
})(window.Basalt);
