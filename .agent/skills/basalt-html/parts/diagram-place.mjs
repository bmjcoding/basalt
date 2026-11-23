var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// packages/react/src/diagram-elk.ts
var diagram_elk_exports = {};
__export(diagram_elk_exports, {
  default: () => diagram_elk_default
});
import ELK from "elkjs/lib/elk.bundled.js";
var diagram_elk_default;
var init_diagram_elk = __esm({
  "packages/react/src/diagram-elk.ts"() {
    "use strict";
    diagram_elk_default = ELK;
  }
});

// tools/html-skill/src/diagram-place.mjs
import { workerData } from "node:worker_threads";

// packages/react/src/diagram-layout.ts
var W = 200;
var H = 80;
var options = (direction) => ({
  "elk.algorithm": "layered",
  "elk.direction": direction === "right" ? "RIGHT" : "DOWN",
  "elk.randomSeed": "1",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.nodeNode": "48",
  "elk.edgeRouting": "ORTHOGONAL"
});
function elkGraph(input, direction) {
  const cards = input.type === "schema" ? (input.tables ?? []).map((t) => ({ id: String(t.name), group: void 0 })) : (input.nodes ?? []).map((n) => ({ id: String(n.id), group: n.group }));
  const edges = input.type === "schema" ? (input.tables ?? []).flatMap((t) => (t.columns ?? []).filter((c) => c.references).map((c) => ({ from: String(t.name), to: String(c.references).split(".")[0] }))) : (input.edges ?? []).map((e) => ({ from: String(e.from), to: String(e.to) }));
  const groups = input.type === "architecture" ? input.groups ?? [] : [];
  const kids = /* @__PURE__ */ new Map([["", []]]);
  for (const g of groups) kids.set(g.id, []);
  for (const c of cards) (kids.get(c.group ?? "") ?? kids.get("")).push({ id: c.id, width: W, height: H });
  const children = [...kids.get("")];
  for (const g of groups) {
    const box = { id: `group:${g.id}`, children: kids.get(g.id), layoutOptions: { "elk.padding": "[top=32,left=16,bottom=16,right=16]" } };
    (g.parent && kids.has(g.parent) ? kids.get(g.parent) : children).push(box);
  }
  const ids = new Set(cards.map((c) => c.id));
  return { id: "root", layoutOptions: options(direction), children, edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e, k) => ({ id: `e${k}`, sources: [e.from], targets: [e.to] })) };
}
function absolute(node, ox = 0, oy = 0, out = /* @__PURE__ */ new Map()) {
  for (const c of node.children ?? []) {
    const x = ox + (c.x ?? 0), y = oy + (c.y ?? 0);
    if (c.children) absolute(c, x, y, out);
    else out.set(c.id, { x, y, w: c.width ?? W, h: c.height ?? H });
  }
  return out;
}
function bands(rects, lo, hi) {
  const ids = [...rects.keys()].sort((a, b) => lo(rects.get(a)) - lo(rects.get(b)) || (a < b ? -1 : a > b ? 1 : 0));
  const out = /* @__PURE__ */ new Map();
  let band = 0, end = Infinity;
  for (const id of ids) {
    const r = rects.get(id);
    if (lo(r) >= end - 0.5) {
      band++;
      end = Infinity;
    }
    end = Math.min(end, hi(r));
    out.set(id, band + 1);
  }
  return out;
}
var elkMade;
async function placeDiagram(input, direction) {
  if (!elkMade) {
    const mod = await Promise.resolve().then(() => (init_diagram_elk(), diagram_elk_exports));
    elkMade = new mod.default();
  }
  const laid = await elkMade.layout(elkGraph(input, direction));
  const rects = absolute(laid);
  const col = bands(rects, (r) => r.x, (r) => r.x + r.w), row = bands(rects, (r) => r.y, (r) => r.y + r.h);
  const cells = {};
  for (const id of rects.keys()) cells[id] = { col: col.get(id), row: row.get(id) };
  return { direction, cells };
}

// tools/html-skill/src/diagram-place.mjs
var { spec, port, signal } = workerData;
var flag = new Int32Array(signal);
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
