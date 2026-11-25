/* Basalt HTML script, diagram-schedule module: a diagram whose JSON says "type": "schedule" (DECISIONS 359, Planning 1.6), routed by the engine, is drawn by React's own module (packages/react/src/diagram-schedule.ts), bundled here
   by build.mjs. It registers its type with the diagram module and does nothing else at load. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-schedule.js (do not edit the copy in the skill folder). */
import { scheduleType } from "../../../../packages/react/src/diagram-schedule.ts";

(function (B) {
  'use strict';
  var _ = B._;
  (_.diagramTypes = _.diagramTypes || {}).schedule = scheduleType;
})(window.Basalt);
