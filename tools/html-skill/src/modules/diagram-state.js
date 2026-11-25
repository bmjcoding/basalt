/* Basalt HTML script, diagram-state module: a diagram whose JSON says "type": "state" (DECISIONS 359, Ops 1), read as an architecture and routed by the engine, is drawn by React's own module (packages/react/src/diagram-state.ts), bundled here
   by build.mjs. It registers its type with the diagram module and does nothing else at load. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-state.js (do not edit the copy in the skill folder). */
import { stateType } from "../../../../packages/react/src/diagram-state.ts";

(function (B) {
  'use strict';
  var _ = B._;
  (_.diagramTypes = _.diagramTypes || {}).state = stateType;
})(window.Basalt);
