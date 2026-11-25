/* Basalt HTML script, diagram-deployment module: a diagram whose JSON says "type": "deployment" (DECISIONS 359, Ops 3), read as an architecture and routed by the engine, is drawn by React's own module (packages/react/src/diagram-deployment.ts), bundled here
   by build.mjs. It registers its type with the diagram module and does nothing else at load. The implementation hasn't been reviewed.
   Source: tools/html-skill/src/modules/diagram-deployment.js (do not edit the copy in the skill folder). */
import { deploymentType } from "../../../../packages/react/src/diagram-deployment.ts";

(function (B) {
  'use strict';
  var _ = B._;
  (_.diagramTypes = _.diagramTypes || {}).deployment = deploymentType;
})(window.Basalt);
