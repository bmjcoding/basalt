/* Basalt HTML script, diagram-text module (DECISIONS 306, 1.2): a sequence whose JSON says "variant": "text" is a code block of box-drawing characters
   where its widest line fits, and its transcript (written into the page by compose.mjs) where it does not. The art is React's own
   (packages/react/src/diagram-text.ts), bundled here by build.mjs. Under "motion": "animated" it builds by ink once. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-text.js (do not edit the copy in the skill folder). */
import { buildByInk, textArt } from "../../../../packages/react/src/diagram-text.ts";

(function (B) {
  'use strict';
  B._.diagramText = function (figure, model, spec) {
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
    var art = made.width * cw <= room + 0.5;
    var html = art ? made.html : figure.__transcript;
    if (code.innerHTML !== html) code.innerHTML = html;
    pre.toggleAttribute('data-art', art);
    if (art && spec.motion === 'animated' && !figure.__inked) {
      figure.__inked = true;
      var ms = function (n, f) { return parseFloat(cs.getPropertyValue('--basalt-' + n)) || f; };
      buildByInk(code, model.steps.filter(function (st) { return 'n' in st; }).length, { slower: ms('duration-slower', 300), step: ms('duration-diagram-step', 320), limit: ms('duration-diagram-limit', 5000) });
    }
  };
})(window.Basalt);
