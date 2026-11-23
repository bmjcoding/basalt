// elkjs (EPL-2.0 OR GPL-3.0-or-later, used under EPL-2.0, unmodified), as an ES module of its own: build.mjs bundles elkjs's own file into
// dist/diagram-elk.js, so its CommonJS wrapper lives in this one file and never in an app's shared chunk. Only diagram-layout imports it, on demand.
import ELK from "elkjs/lib/elk.bundled.js";

export default ELK;
