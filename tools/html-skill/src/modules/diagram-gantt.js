/* Basalt HTML script, diagram-gantt module (DECISIONS 359, Planning 1.1): a diagram whose JSON says "type": "gantt" is drawn by React's own gantt
   (packages/react/src/diagram-gantt.ts), bundled here by build.mjs with the scale read from the diagram-scale module. It registers its type with the diagram
   module and does nothing else at load. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-gantt.js (do not edit the copy in the skill folder). */
import { ganttType } from "../../../../packages/react/src/diagram-gantt.ts";

(function (B) {
  'use strict';
  var _ = B._;
  (_.diagramTypes = _.diagramTypes || {}).gantt = ganttType;
})(window.Basalt);
