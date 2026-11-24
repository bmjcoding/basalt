/* Basalt HTML script, diagram-export module (DECISIONS 306, 1.7): a figure whose JSON says "export": true gets "Download SVG" and "Download PNG" in its
   foot (secondary small buttons, before "Clear highlight"), and in its viewer's foot, where they write the viewer's drawing at 100%. They write the figure in
   the theme shown: native SVG, never foreignObject, its words as text, the faces embedded. The code is React's (packages/react/src/diagram-export.ts),
   bundled into this module by build.mjs. compose.mjs adds it only to a page with such a figure. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-export.js (do not edit the copy in the skill folder). */
import { diagramToPng, diagramToSvg, exportName } from "../../../../packages/react/src/diagram-export.ts";

(function (B) {
  'use strict';
  var _ = B._;

  function save(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function button(words, run) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn diagram-download';
    b.setAttribute('data-variant', 'secondary');
    b.setAttribute('data-size', 'sm');
    var label = document.createElement('span');
    label.textContent = words;
    b.appendChild(label);
    b.addEventListener('click', run);
    return b;
  }

  /** Puts the two buttons in a foot, before "Clear highlight", for the figure `fig`. Returns them, so a redraw can take them out. */
  _.diagramExport = function (foot, fig) {
    var svg = button('Download SVG', function () { diagramToSvg(fig).then(function (b) { save(b, exportName(fig, 'svg')); }); });
    var png = button('Download PNG', function () { diagramToPng(fig).then(function (b) { save(b, exportName(fig, 'png')); }); });
    var clear = foot.querySelector('.diagram-clear');
    foot.insertBefore(svg, clear);
    foot.insertBefore(png, clear);
    return [svg, png];
  };
})(window.Basalt);
