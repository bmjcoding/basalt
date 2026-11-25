/* Basalt HTML script, diagram-timeline module (DECISIONS 359, Ops 2): a diagram whose JSON says "type": "timeline" is drawn by React's own timeline and its
   seats (packages/react/src/diagram-timeline.ts, diagram-timeline-seat.ts), bundled here by build.mjs with the scale read from the diagram-scale module. It
   registers its type with the diagram module and does nothing else at load. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-timeline.js (do not edit the copy in the skill folder). */
import { timelineType } from "../../../../packages/react/src/diagram-timeline.ts";

(function (B) {
  'use strict';
  var _ = B._;
  (_.diagramTypes = _.diagramTypes || {}).timeline = timelineType;
})(window.Basalt);
