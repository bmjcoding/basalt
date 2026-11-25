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
var Elk, diagram_elk_default;
var init_diagram_elk = __esm({
  "packages/react/src/diagram-elk.ts"() {
    "use strict";
    Elk = ELK;
    diagram_elk_default = Elk;
  }
});

// tools/html-skill/src/diagram-place.mjs
import { workerData } from "node:worker_threads";

// packages/react/src/diagram-layout-graph.ts
var W = 200;
var H = 80;
var STRAIGHT = "10";
var options = (direction, longest = false) => ({
  ...longest ? { "elk.layered.layering.strategy": "LONGEST_PATH_SOURCE" } : {},
  "elk.algorithm": "layered",
  "elk.direction": direction === "right" ? "RIGHT" : "DOWN",
  "elk.randomSeed": "1",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.nodeNode": "48",
  "elk.edgeRouting": "ORTHOGONAL"
});
function partsOf(input) {
  const cards = input.type === "schema" ? (input.tables ?? []).map((t) => ({ id: String(t.name) })) : input.type === "schedule" ? (input.tasks ?? []).map((t) => ({ id: String(t.id) })) : (input.nodes ?? []).map((n) => ({ id: String(n.id), group: n.group }));
  const raw = input.type === "schema" ? (input.tables ?? []).flatMap((t) => (t.columns ?? []).filter((c) => c.references).map((c) => ({ from: String(t.name), to: String(c.references).split(".")[0], main: false }))) : input.type === "schedule" ? (input.tasks ?? []).flatMap((t) => (t.after ?? []).map((a) => ({ from: String(a), to: String(t.id), main: false }))) : (input.edges ?? []).map((e) => ({ from: String(e.from), to: String(e.to), main: e.kind === "main" }));
  const ids = new Set(cards.map((c) => c.id));
  const lines = raw.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e, k) => ({ ...e, k }));
  return { cards, lines, groups: input.type === "architecture" || input.type === "state" || input.type === "deployment" ? input.groups ?? [] : [] };
}
function mainInTheMiddle(lines) {
  const bySource = /* @__PURE__ */ new Map();
  lines.forEach((e, k) => {
    if (!bySource.has(e.from)) bySource.set(e.from, []);
    bySource.get(e.from).push(k);
  });
  const out = lines.slice();
  for (const slots of bySource.values()) {
    const main = slots.filter((k) => lines[k].main);
    if (slots.length < 3 || main.length !== 1) continue;
    const rest = slots.filter((k) => k !== main[0]);
    const order = [...rest.slice(0, Math.floor(rest.length / 2)), main[0], ...rest.slice(Math.floor(rest.length / 2))];
    slots.forEach((slot, j) => {
      out[slot] = lines[order[j]];
    });
  }
  return out;
}
function graphOf(cards, lines, groups, direction, longest = false, inOrder = false) {
  const kids = /* @__PURE__ */ new Map([["", []]]);
  for (const g of groups) kids.set(g.id, []);
  for (const c of cards) (kids.get(c.group ?? "") ?? kids.get("")).push({ id: c.id, width: W, height: H });
  const children = [...kids.get("")];
  const cycles = (g) => {
    const seen = /* @__PURE__ */ new Set([g.id]);
    for (let p = g.parent; p; p = groups.find((x) => x.id === p)?.parent) {
      if (seen.has(p)) return true;
      seen.add(p);
    }
    return false;
  };
  for (const g of groups) {
    const box = { id: `group:${g.id}`, children: kids.get(g.id), layoutOptions: { "elk.padding": "[top=32,left=16,bottom=16,right=16]" } };
    (g.parent && kids.has(g.parent) && !cycles(g) ? kids.get(g.parent) : children).push(box);
  }
  if (inOrder) {
    const first = (n) => n.children ? Math.min(Infinity, ...n.children.map(first)) : cards.findIndex((c) => c.id === n.id);
    const sort = (list) => {
      list.sort((a, b) => first(a) - first(b));
      for (const n of list) if (n.children) sort(n.children);
    };
    sort(children);
  }
  return { id: "root", layoutOptions: options(direction, longest), children, edges: lines.map((e, k) => ({ id: `e${k}`, sources: [e.from], targets: [e.to], ...e.main ? { layoutOptions: { "elk.layered.priority.straightness": STRAIGHT } } : {} })) };
}

// packages/react/src/diagram-layout.ts
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
async function cellsOf(graph) {
  if (!elkMade) {
    const mod = await Promise.resolve().then(() => (init_diagram_elk(), diagram_elk_exports));
    elkMade = new mod.default();
  }
  const rects = absolute(await elkMade.layout(graph));
  const col = bands(rects, (r) => r.x, (r) => r.x + r.w), row = bands(rects, (r) => r.y, (r) => r.y + r.h);
  const cells = {};
  for (const id of rects.keys()) cells[id] = { col: col.get(id), row: row.get(id) };
  return cells;
}
function unusable(cards, groups, cells) {
  const seen = /* @__PURE__ */ new Set();
  for (const c of cards) {
    const at = cells[c.id];
    if (!at) return true;
    const key = `${at.col},${at.row}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  const chain = (id) => {
    const out = [];
    for (let g = id; g && !out.includes(g); g = groups.find((x) => x.id === g)?.parent) out.push(g);
    return out;
  };
  for (const g of groups) {
    const mine = cards.filter((c) => chain(c.group).includes(g.id));
    if (!mine.length) continue;
    const at = mine.map((c) => cells[c.id]);
    const box = { c1: Math.min(...at.map((a) => a.col)), c2: Math.max(...at.map((a) => a.col)), r1: Math.min(...at.map((a) => a.row)), r2: Math.max(...at.map((a) => a.row)) };
    if (cards.some((c) => !mine.includes(c) && cells[c.id].col >= box.c1 && cells[c.id].col <= box.c2 && cells[c.id].row >= box.r1 && cells[c.id].row <= box.r2)) return true;
  }
  return false;
}
async function placeDiagram(input, direction) {
  const { cards, lines: authored, groups } = partsOf(input);
  const lines = mainInTheMiddle(authored);
  const longest = Boolean(input.dependents);
  const inOrder = input.type === "state" || input.type === "deployment";
  const first = await cellsOf(graphOf(cards, lines, groups, direction, longest, inOrder));
  const layer = (id) => direction === "down" ? first[id].row : first[id].col;
  const chain = (id) => {
    const out = [];
    for (let g = id; g && !out.includes(g); g = groups.find((x) => x.id === g)?.parent) out.push(g);
    return out;
  };
  const groupOf = new Map(cards.map((c) => [c.id, c.group]));
  const all = cards.slice();
  const chained = [];
  let ways = 0;
  for (const e of lines) {
    const a = layer(e.from), b = layer(e.to);
    if (!e.main || Math.abs(b - a) < 2) {
      chained.push(e);
      continue;
    }
    const inA = chain(groupOf.get(e.from)), inB = chain(groupOf.get(e.to));
    const both = inA.find((g) => inB.includes(g));
    const boxes = [];
    let prev = e.from;
    for (let l = a + Math.sign(b - a); l !== b; l += Math.sign(b - a)) {
      const id = `way:${e.k}:${l}`;
      const here = new Set(cards.filter((c) => layer(c.id) === l).flatMap((c) => chain(c.group)));
      const group = inB.find((g) => here.has(g)) ?? inA.find((g) => here.has(g)) ?? both;
      boxes.push({ id, group, way: true });
      chained.push({ ...e, from: prev, to: id });
      prev = id;
    }
    chained.push({ ...e, from: prev });
    all.splice(all.findIndex((c) => c.id === e.to), 0, ...boxes);
    ways++;
  }
  const span = (c) => ({ cols: Math.max(1, ...Object.values(c).map((x) => x.col)), rows: Math.max(1, ...Object.values(c).map((x) => x.row)) });
  if (!ways) return { direction, ...span(first), cells: first };
  const second = await cellsOf(graphOf(all, chained, groups, direction, longest, inOrder));
  const cells = {};
  for (const c of cards) cells[c.id] = second[c.id];
  const layers = (c) => Math.max(1, ...cards.map((x) => direction === "down" ? c[x.id].row : c[x.id].col));
  return unusable(cards, groups, cells) || layers(cells) > layers(first) ? { direction, ...span(first), cells: first } : { direction, ...span(second), cells };
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
