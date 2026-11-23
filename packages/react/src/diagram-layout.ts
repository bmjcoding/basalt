// Automatic layout (DECISIONS 306, 1.8): `@srasyndicate/basalt/diagram-layout`, the one module that imports elkjs (EPL-2.0 OR GPL-3.0-or-later, used under
// EPL-2.0, unmodified). It gives each card a column and a row and nothing else: elk's routes, ports and group boxes are never read, and Basalt sizes,
// routes, seats and stacks the figure as it does an authored one. Lead with build time: an app or page that places at build time (and passes `placement`)
// ships none of elkjs. A figure without `placement` loads this module on demand, at 640 or wider, and never at a phone's width. Nothing runs at load.

import type { DiagramEdge, DiagramGroup, DiagramPlacement, SchemaTable } from "./diagram-core";

/** What a figure is placed from: its type and the component's own props (cards, lines, groups). */
export interface DiagramPlacementInput {
  type: "architecture" | "flowchart" | "schema";
  nodes?: Array<{ id: string; group?: string }>;
  tables?: SchemaTable[];
  edges?: DiagramEdge[];
  groups?: DiagramGroup[];
}

interface ElkNode { id: string; width?: number; height?: number; x?: number; y?: number; children?: ElkNode[]; layoutOptions?: Record<string, string>; edges?: Array<{ id: string; sources: string[]; targets: string[] }> }

// Every card one box of one size (only the layer and the order are read, so the result never depends on a measured pixel), and one fixed set of options:
// layered, randomSeed 1, model order for nodes and edges, cycle breaking by model order, Brandes and Köpf placement. Partitioning is never switched on.
const W = 200, H = 80;
const options = (direction: "right" | "down"): Record<string, string> => ({
  "elk.algorithm": "layered",
  "elk.direction": direction === "right" ? "RIGHT" : "DOWN",
  "elk.randomSeed": "1",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.nodeNode": "48",
  "elk.edgeRouting": "ORTHOGONAL",
});

/** The graph handed to elk: cards in the author's order, groups as hierarchy, lines in the author's order. */
export function elkGraph(input: DiagramPlacementInput, direction: "right" | "down"): ElkNode {
  const cards = input.type === "schema" ? (input.tables ?? []).map((t) => ({ id: String(t.name), group: undefined as string | undefined })) : (input.nodes ?? []).map((n) => ({ id: String(n.id), group: n.group }));
  const edges = input.type === "schema"
    ? (input.tables ?? []).flatMap((t) => (t.columns ?? []).filter((c) => c.references).map((c) => ({ from: String(t.name), to: String(c.references).split(".")[0]! })))
    : (input.edges ?? []).map((e) => ({ from: String(e.from), to: String(e.to) }));
  const groups = input.type === "architecture" ? input.groups ?? [] : [];
  const kids = new Map<string, ElkNode[]>([["", []]]);
  for (const g of groups) kids.set(g.id, []);
  for (const c of cards) (kids.get(c.group ?? "") ?? kids.get("")!).push({ id: c.id, width: W, height: H });
  const children = [...kids.get("")!];
  for (const g of groups) {
    const box: ElkNode = { id: `group:${g.id}`, children: kids.get(g.id), layoutOptions: { "elk.padding": "[top=32,left=16,bottom=16,right=16]" } };
    (g.parent && kids.has(g.parent) ? kids.get(g.parent)! : children).push(box);
  }
  const ids = new Set(cards.map((c) => c.id));
  return { id: "root", layoutOptions: options(direction), children, edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e, k) => ({ id: `e${k}`, sources: [e.from], targets: [e.to] })) };
}

/** Cards' boxes, absolute, from elk's result (a child's place is its parent's plus its own). */
function absolute(node: ElkNode, ox = 0, oy = 0, out = new Map<string, { x: number; y: number; w: number; h: number }>()) {
  for (const c of node.children ?? []) {
    const x = ox + (c.x ?? 0), y = oy + (c.y ?? 0);
    if (c.children) absolute(c, x, y, out); else out.set(c.id, { x, y, w: c.width ?? W, h: c.height ?? H });
  }
  return out;
}
/** Bands along one axis: cards sorted by where they start; a card starts a new band when it begins at or after the band's earliest end. */
function bands(rects: Map<string, { x: number; y: number; w: number; h: number }>, lo: (r: { x: number; y: number; w: number; h: number }) => number, hi: (r: { x: number; y: number; w: number; h: number }) => number) {
  const ids = [...rects.keys()].sort((a, b) => lo(rects.get(a)!) - lo(rects.get(b)!) || (a < b ? -1 : a > b ? 1 : 0));
  const out = new Map<string, number>();
  let band = 0, end = Infinity;
  for (const id of ids) {
    const r = rects.get(id)!;
    if (lo(r) >= end - 0.5) { band++; end = Infinity; }
    end = Math.min(end, hi(r));
    out.set(id, band + 1);
  }
  return out;
}

let elkMade: { layout: (graph: ElkNode) => Promise<ElkNode> } | undefined;

/** Places a figure in one direction: each card's column and row. The same answer in Node and in a browser. */
export async function placeDiagram(input: DiagramPlacementInput, direction: "right" | "down"): Promise<DiagramPlacement> {
  if (!elkMade) {
    const mod = (await import("./diagram-elk")) as unknown as { default: new () => { layout: (graph: ElkNode) => Promise<ElkNode> } };
    elkMade = new mod.default();
  }
  const laid = await elkMade.layout(elkGraph(input, direction));
  const rects = absolute(laid);
  const col = bands(rects, (r) => r.x, (r) => r.x + r.w), row = bands(rects, (r) => r.y, (r) => r.y + r.h);
  const cells: Record<string, { col: number; row: number }> = {};
  for (const id of rects.keys()) cells[id] = { col: col.get(id)!, row: row.get(id)! };
  return { direction, cells };
}
