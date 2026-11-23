// compose.mjs's placer (DECISIONS 306, 1.8): run as a worker, it places one figure for both directions through React's own placeDiagram (elkjs, a
// build-time dependency of the tool, resolved from the repository) and hands the placement back on its port, then wakes compose.mjs, which waits for it
// (compose is synchronous). A page never holds elkjs. Bundled into parts/ by build.mjs.
import { workerData } from "node:worker_threads";

import { placeDiagram } from "../../../packages/react/src/diagram-layout.ts";

const { spec, port, signal } = workerData;
const flag = new Int32Array(signal);
try {
  const directions = spec.direction ? [spec.direction] : spec.type === "flowchart" ? ["down", "right"] : ["right", "down"];
  const out = [];
  for (const d of directions) out.push(await placeDiagram(spec, d));
  port.postMessage({ placement: out });
} catch (e) {
  port.postMessage({ error: String(e && e.message ? e.message : e) });
}
Atomics.store(flag, 0, 1);
Atomics.notify(flag, 0);
