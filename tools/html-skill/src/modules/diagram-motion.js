/* Basalt HTML script, diagram-motion module (DECISIONS 292): a diagram whose JSON says "motion": "animated" draws each line once when it comes into
   view (every word at rest), then runs whichever of flow, a pulse or a packet its data names, and a sequence's run. compose.mjs adds this module, and
   loops, only to a page with such a diagram (a page that draws one from script names it with <!-- basalt:use diagram-motion -->). The engine is React's
   own (packages/react/src/diagram-motion-core.ts): build.mjs bundles it in, so the skill and React move the same way. This file builds the foot's two
   buttons: the run button ("Play the run", "Stop the run") and "Pause animations", the page's hold (a data-loops-toggle button, which the loops module
   wires). Basalt.diagram(figure, spec) with a new packet.send sends one message, as a new prop does in React.
   Source: tools/html-skill/src/modules/diagram-motion.js (do not edit the copy in the skill folder). */
import { attachMotion, motionErrors } from "../../../../packages/react/src/diagram-motion-core.ts";

(function (B) {
  'use strict';
  var _ = B._;

  function button(cls, words, extra) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + cls;
    b.setAttribute('data-variant', 'secondary');
    b.setAttribute('data-size', 'sm');
    if (extra) extra(b);
    b.appendChild(document.createTextNode(words));
    return b;
  }

  /** Called by the diagram module once an animated figure is first laid out. Returns the controller the diagram module tells about new drawings. */
  _.diagramMotion = function (figure, host, spec) {
    var checked = motionErrors(host.model());
    checked.errors.forEach(function (e) { console.error('Basalt diagram: ' + e); });
    checked.warnings.forEach(function (w) { console.warn('Basalt diagram: ' + w); });
    var controller = attachMotion(host);
    var foot = figure.querySelector('.diagram-foot');
    var run = null, pause = null;
    if (foot) {
      run = button('diagram-play', 'Play the run');
      run.addEventListener('click', function () { controller.toggleRun(); });
      pause = button('diagram-pause', 'Pause animations', function (b) {
        b.setAttribute('data-loops-toggle', '');
        b.setAttribute('aria-pressed', String(Boolean(B.loops && B.loops.held())));
        b.insertAdjacentHTML('beforeend', '<span class="btn-check" data-glyph="pause" aria-hidden="true">' + _.glyphSeat('pause') + '</span>');
      });
      // Each names its figure (G17 of cimip-gaps-3): its own words (the button itself, referenced), then the title, as React's.
      var titleId = figure.getAttribute('aria-labelledby');
      if (titleId) [[run, '-play'], [pause, '-pause']].forEach(function (p) { p[0].id = titleId.replace(/-title$/, '') + p[1]; p[0].setAttribute('aria-labelledby', p[0].id + ' ' + titleId); });
      run.hidden = pause.hidden = true;
      foot.appendChild(run);
      foot.appendChild(pause);
    }
    function show() {
      var s = controller.state();
      if (run) { run.hidden = !s.runShown; run.lastChild.textContent = s.running ? 'Stop the run' : 'Play the run'; }
      if (pause) { pause.hidden = !s.canLoop; pause.setAttribute('aria-pressed', String(Boolean(B.loops && B.loops.held()))); }
    }
    var unsubscribe = controller.subscribe(show);
    show();
    // A send carries on from the figure's last drawing: the value it had is seen first, so only a new one sends.
    var send = spec && spec.packet ? spec.packet.send : undefined;
    controller.sendValue('__diagramSend' in figure ? figure.__diagramSend : send);
    controller.sendValue(send);
    figure.__diagramSend = send;
    return {
      redrawn: controller.redrawn,
      sendValue: function (v) { controller.sendValue(v); figure.__diagramSend = v; },
      destroy: function () { unsubscribe(); controller.destroy(); if (run) run.remove(); if (pause) pause.remove(); },
    };
  };
})(window.Basalt);
