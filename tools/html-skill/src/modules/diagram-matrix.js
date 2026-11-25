/* Basalt HTML script, diagram-matrix module (DECISIONS 359, Planning 1.0 and 1.2 to 1.5): a diagram whose JSON says "type": "kanban", "journey",
   "service-blueprint" or "story-map" is drawn by React's own matrix core (packages/react/src/diagram-matrix.ts), bundled here by build.mjs. It registers the
   four types with the diagram module and does nothing else at load. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-matrix.js (do not edit the copy in the skill folder). */
import { journeyType, kanbanType, serviceBlueprintType, storyMapType } from "../../../../packages/react/src/diagram-matrix.ts";

(function (B) {
  'use strict';
  var _ = B._;
  var types = _.diagramTypes = _.diagramTypes || {};
  types.kanban = kanbanType;
  types.journey = journeyType;
  types['service-blueprint'] = serviceBlueprintType;
  types['story-map'] = storyMapType;
})(window.Basalt);
