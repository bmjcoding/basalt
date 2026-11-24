/* Basalt HTML script, diagram-text module (DECISIONS 306, 1.2): a sequence whose JSON says "variant": "text" is a code block of box-drawing characters
   where its widest line fits, and its transcript (written into the page by compose.mjs) where it does not. The art is React's own
   (packages/react/src/diagram-text.ts), bundled here by build.mjs. Under "motion": "animated" it builds by ink as it comes into view (the diagram-motion module). The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-text.js (do not edit the copy in the skill folder). */
import { textArt } from "../../../../packages/react/src/diagram-text.ts";

(function (B) {
  'use strict';
  B._.diagramText = function (figure, model, spec, viewer) {
    var pre = figure.querySelector('.diagram-text');
    var code = pre && pre.querySelector('.diagram-text-ink');
    if (!code) return;
    if (!figure.__transcript) figure.__transcript = code.innerHTML;
    var made = textArt(model);
    var probe = document.createElement('span');
    probe.textContent = new Array(41).join('─');
    pre.appendChild(probe);
    var cw = probe.getBoundingClientRect().width / 40;
    probe.remove();
    var cs = getComputedStyle(pre);
    var room = pre.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // In the viewer the art is held at its own width, never the transcript (DECISIONS 310, 9.3).
    if (viewer && viewer.textWidth) {
      viewer.textWidth(made.width * cw + (figure.clientWidth - room) + 1);
      room = pre.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    }
    var art = made.width * cw <= room + 0.5;
    var html = art ? made.html : figure.__transcript;
    if (code.innerHTML !== html) code.innerHTML = html;
    pre.toggleAttribute('data-art', art);
    // Under "motion": "animated" the art builds by ink when it comes into view: the diagram-motion module's, as a drawn figure's entrance is.
  };
})(window.Basalt);
