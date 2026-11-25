/* Basalt HTML script, diagram-scale module (DECISIONS 359, the answers' section 3): the time scale a gantt and a timeline share, and nothing else: plain
   arithmetic, React's own (packages/react/src/diagram-scale.ts), bundled here by build.mjs. Added for you with diagram-gantt or diagram-timeline; a page pays
   for the type it draws, and the layout of each is its own module. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-scale.js (do not edit the copy in the skill folder). */
import * as scale from "../../../../packages/react/src/diagram-scale.ts";

(function (B) {
  'use strict';
  B._.diagramScale = scale;
})(window.Basalt);
