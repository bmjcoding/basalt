// elkjs (EPL-2.0 OR GPL-3.0-or-later, used under EPL-2.0, unmodified), as an ES module of its own: build.mjs copies elkjs's own file into
// dist/diagram-elk.js, with its licence beside it (dist/elkjs/LICENSE.md), so its CommonJS wrapper lives in this one file and never in an app's shared
// chunk. Only diagram-layout imports it, on demand. Its type here is Basalt's own: no elkjs type is in any declaration (AGENTS.md).
import ELK from "elkjs/lib/elk.bundled.js";

/** The layout class, as diagram-layout calls it. */
const Elk = ELK as unknown as new () => { layout: (graph: object) => Promise<object> };
export default Elk;
