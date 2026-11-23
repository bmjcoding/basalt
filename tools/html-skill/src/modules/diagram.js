/* Basalt HTML script, diagram module (DECISIONS 269, revised by 270): `<figure class="diagram">` holding `<script type="application/json"
   data-diagram>` is drawn from that JSON (the React props, key for key), or `Basalt.diagram(figure, spec)` draws one from script. The engine
   is React's own (packages/react/src/diagram-core.ts): build.mjs bundles it into this module, so the skill and React lay out, route, seat
   and draw the same pixels. compose.mjs runs `Basalt._.diagramMarkup` at build time and writes each figure's words into the page, so it
   reads before any script runs; this script then measures it, draws its lines and labels, and wires the keys, the trace and the list.
   Source: tools/html-skill/src/modules/diagram.js (do not edit the copy in the skill folder). */
import { applyTrace, buildModel, escapeHtml, figureTree, hasStops, hintEntries, keyTarget, measureFigure, syncAttributes, toHtml } from "../../../../packages/react/src/diagram-core.ts";

(function (B) {
  'use strict';
  var _ = B._;
  var P = 'diagram';
  var serial = 0;

  function options(base, spec) {
    return { prefix: P, base: base, hasSource: spec.source !== undefined && spec.source !== null && spec.source !== '', hiddenClass: 'visually-hidden' };
  }
  function slots(model, spec, base, open) {
    var kbd = function (k) { return '<kbd class="kbd">' + escapeHtml(k) + '</kbd>'; };
    return {
      source: escapeHtml(String(spec.source || '')),
      summary: escapeHtml(String(spec.summary || '')),
      hint: hintEntries(model).map(function (e) { return '<span>' + e.keys.map(kbd).join(' ') + ' ' + escapeHtml(e.words) + '</span>'; }).join(''),
      toggle: '<button type="button" class="btn diagram-toggle" data-variant="secondary" data-size="sm" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + base + '-list"><span>' + (open ? 'Hide the list' : 'View as list') + '</span></button>',
    };
  }

  /** The figure's markup before script runs: its attributes and its inside, as compose.mjs writes it (and as this script writes it for a figure that has none). */
  function markup(spec, base) {
    var model = buildModel(spec);
    var tree = figureTree(model, {}, options(base, spec));
    var html = toHtml(tree, slots(model, spec, base, false));
    var open = html.indexOf('>');
    return { open: html.slice(0, open + 1), inner: html.slice(open + 1, html.length - '</figure>'.length), warnings: model.warnings };
  }

  function draw(figure, spec) {
    if (figure.__diagram) figure.__diagram.stop();
    var base = (figure.getAttribute('aria-labelledby') || '').replace(/-title$/, '');
    var model = buildModel(spec);
    if (!figure.querySelector(':scope > .diagram-drawing')) {
      // No markup from compose (a figure drawn from script): write it now, keeping the JSON and the figure's own attributes.
      while (document.getElementById('dg' + (++serial) + '-title')) { /* the next free base */ }
      base = 'dg' + serial;
      var made = markup(spec, base);
      var holder = document.createElement('div');
      holder.innerHTML = made.open + '</figure>';
      var fresh = holder.firstChild;
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
    var opts = options(base, spec);
    var state = {};
    var measured = null;
    var focusTrace = null, hoverTrace = null;
    var warned = {};
    var warn = function (m) { if (!warned[m]) { warned[m] = 1; console.warn('Basalt diagram: ' + m); } };
    var apply = function (d) { syncAttributes(figure, figureTree(model, d, opts)); };
    var ink = figure.querySelector('.diagram-ink');
    var toggle = figure.querySelector('.diagram-toggle');

    function retrace() { applyTrace(figure, P, measured && measured.geo, measured && measured.tokens, base, focusTrace || hoverTrace); }
    function layout() {
      measured = measureFigure(figure, model, P, base, state, apply, warn);
      state = measured.dyn;
      apply(state);
      if (ink) ink.innerHTML = measured.ink;
      retrace();
    }
    function setState(next) { state = next; apply(state); }
    var nodeOf = function (t) { var el = t && t.closest ? t.closest('.diagram-node') : null; return el && figure.contains(el) ? el : null; };

    function onKey(event) {
      var node = nodeOf(event.target);
      if (!node || event.defaultPrevented) return;
      if (event.key === 'Escape') { if (focusTrace || hoverTrace) { event.preventDefault(); focusTrace = hoverTrace = null; retrace(); } return; }
      if (!hasStops(model, state)) return;
      var to = keyTarget(model, node.getAttribute('data-node'), event.key);
      if (!to) return;
      event.preventDefault();
      setState(Object.assign({}, state, { stop: to }));
      var el = figure.querySelector('.diagram-node[data-node="' + CSS.escape(to) + '"]');
      if (el) el.focus();
    }
    function onFocusIn(event) {
      var node = nodeOf(event.target);
      if (!node) return;
      var id = node.getAttribute('data-node');
      // Tracing follows the keyboard's focus (:focus-visible), so a press that focuses a node traces nothing.
      focusTrace = node.matches(':focus-visible') ? id : null;
      if (hasStops(model, state) && state.stop !== id) setState(Object.assign({}, state, { stop: id }));
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
      var next = node && hasStops(model, state) ? node.getAttribute('data-node') : null;
      if (next !== hoverTrace) { hoverTrace = next; retrace(); }
    }
    function onLeave() { if (hoverTrace) { hoverTrace = null; retrace(); } }
    function onToggle() {
      var open = !state.open;
      setState(Object.assign({}, state, { open: open }));
      toggle.setAttribute('aria-expanded', String(open));
      toggle.firstElementChild.textContent = open ? 'Hide the list' : 'View as list';
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
    figure.__diagram = {
      stop: function () {
        live = false; observer.disconnect(); cancelAnimationFrame(frame);
        figure.removeEventListener('keydown', onKey); figure.removeEventListener('focusin', onFocusIn); figure.removeEventListener('focusout', onFocusOut);
        figure.removeEventListener('pointerover', onOver); figure.removeEventListener('pointerleave', onLeave);
        if (toggle) toggle.removeEventListener('click', onToggle);
      },
      layout: layout,
    };
  }

  function wireDiagrams() {
    document.querySelectorAll('figure.diagram').forEach(function (figure) {
      if (figure.__diagram) return;
      var source = figure.querySelector(':scope > script[data-diagram]');
      if (!source) return;
      try { draw(figure, JSON.parse(source.textContent)); } catch (e) { console.error('Basalt diagram: this figure could not be drawn', e); }
    });
  }

  _.diagramMarkup = markup;
  B.diagram = function (figure, spec) { draw(figure, spec); };
  _.step(62, 'wireDiagrams', wireDiagrams);
})(window.Basalt);
