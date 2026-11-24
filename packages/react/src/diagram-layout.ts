// Automatic layout (DECISIONS 306, 1.8): `@srasyndicate/basalt/diagram-layout`, the one module that imports elkjs (EPL-2.0 OR GPL-3.0-or-later, used under
// EPL-2.0, unmodified). It gives each card a column and a row and nothing else: elk's routes, ports and group boxes are never read, and Basalt sizes,
// routes, seats and stacks the figure as it does an authored one. Lead with build time: an app or page that places at build time (and passes `placement`)
// ships none of elkjs. A figure without `placement` loads this module on demand, at 640 or wider, and never at a phone's width. Nothing runs at load.

import type { DiagramEdge, DiagramGroup, DiagramPlacement, SchemaTable } from "./diagram-core";
import { graphOf, H, mainInTheMiddle, partsOf, W } from "./diagram-layout-graph";
import type { Card, ElkNode, Line } from "./diagram-layout-graph";

/** What a figure is placed from: its type and the component's own props (cards, lines, groups). */
export interface DiagramPlacementInput {
  type: "architecture" | "flowchart" | "schema";
  nodes?: Array<{ id: string; group?: string }>;
  tables?: SchemaTable[];
  edges?: DiagramEdge[];
  groups?: DiagramGroup[];
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

type Cells = Record<string, { col: number; row: number }>;
let elkMade: { layout: (graph: ElkNode) => Promise<ElkNode> } | undefined;
async function cellsOf(graph: ElkNode): Promise<Cells> {
  if (!elkMade) {
    const mod = (await import("./diagram-elk")) as unknown as { default: new () => { layout: (graph: ElkNode) => Promise<ElkNode> } };
    elkMade = new mod.default();
  }
  const rects = absolute(await elkMade.layout(graph));
  const col = bands(rects, (r) => r.x, (r) => r.x + r.w), row = bands(rects, (r) => r.y, (r) => r.y + r.h);
  const cells: Cells = {};
  for (const id of rects.keys()) cells[id] = { col: col.get(id)!, row: row.get(id)! };
  return cells;
}

/** A placement that cannot be used (1.8, 8.5): two cards in one cell, or a card inside the box of a group it is not in. */
function unusable(cards: Card[], groups: DiagramGroup[], cells: Cells): boolean {
  const seen = new Set<string>();
  for (const c of cards) { const at = cells[c.id]; if (!at) return true; const key = `${at.col},${at.row}`; if (seen.has(key)) return true; seen.add(key); }
  // A group's chain, outermost last; a parent named twice (a cycle) ends it (Neon's P2 of the code review).
  const chain = (id?: string) => { const out: string[] = []; for (let g = id; g && !out.includes(g); g = groups.find((x) => x.id === g)?.parent) out.push(g); return out; };
  for (const g of groups) {
    const mine = cards.filter((c) => chain(c.group).includes(g.id));
    if (!mine.length) continue;
    const at = mine.map((c) => cells[c.id]!);
    const box = { c1: Math.min(...at.map((a) => a.col)), c2: Math.max(...at.map((a) => a.col)), r1: Math.min(...at.map((a) => a.row)), r2: Math.max(...at.map((a) => a.row)) };
    if (cards.some((c) => !mine.includes(c) && cells[c.id]!.col >= box.c1 && cells[c.id]!.col <= box.c2 && cells[c.id]!.row >= box.r1 && cells[c.id]!.row <= box.r2)) return true;
  }
  return false;
}

/**
 * Places a figure in one direction: each card's column and row. The same answer in Node and in a browser.
 *
 * Two runs where a main line skips a layer (the ruling, rule 1). The first run gives every card its layer (its row laid down, its column laid right). A main
 * line whose ends are two or more layers apart is then handed to elk as a chain through one box of a card's size in each layer it passes (its way), each box in
 * a group by the rule below, and elk runs again. The way's boxes are read with the cards and then left out: their cells stay empty, so the main
 * line has a way no card stands in. If the second run cannot be used or adds a layer, the first is.
 */
export async function placeDiagram(input: DiagramPlacementInput, direction: "right" | "down"): Promise<DiagramPlacement> {
  const { cards, lines: authored, groups } = partsOf(input);
  const lines = mainInTheMiddle(authored);
  const first = await cellsOf(graphOf(cards, lines, groups, direction));
  const layer = (id: string) => (direction === "down" ? first[id]!.row : first[id]!.col);
  // A group's chain, outermost last; a parent named twice (a cycle) ends it (Neon's P2 of the code review).
  const chain = (id?: string) => { const out: string[] = []; for (let g = id; g && !out.includes(g); g = groups.find((x) => x.id === g)?.parent) out.push(g); return out; };
  const groupOf = new Map(cards.map((c) => [c.id, c.group]));
  const all = cards.slice();
  const chained: Line[] = [];
  let ways = 0;
  for (const e of lines) {
    const a = layer(e.from), b = layer(e.to);
    if (!e.main || Math.abs(b - a) < 2) { chained.push(e); continue; }
    const inA = chain(groupOf.get(e.from)), inB = chain(groupOf.get(e.to));
    const both = inA.find((g) => inB.includes(g));
    const boxes: Card[] = [];
    let prev = e.from;
    for (let l = a + Math.sign(b - a); l !== b; l += Math.sign(b - a)) {
      const id = `way:${e.k}:${l}`;
      // The box's group: the innermost group that holds either end and has a card in this layer (the target's side first), so the box stands beside the
      // cards the line passes; with none, the innermost group that holds both ends, or no group.
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
  const span = (c: Cells) => ({ cols: Math.max(1, ...Object.values(c).map((x) => x.col)), rows: Math.max(1, ...Object.values(c).map((x) => x.row)) });
  if (!ways) return { direction, ...span(first), cells: first };
  const second = await cellsOf(graphOf(all, chained, groups, direction));
  const cells: Cells = {};
  for (const c of cards) cells[c.id] = second[c.id]!;
  // The second run stands only if it can be used and has no more layers than the first: a way fills layers that exist and never adds one.
  const layers = (c: Cells) => Math.max(1, ...cards.map((x) => (direction === "down" ? c[x.id]!.row : c[x.id]!.col)));
  // The tracks are counted over the cards and the ways together (`cols`, `rows`), so a track that holds only a way is still a track.
  return unusable(cards, groups, cells) || layers(cells) > layers(first) ? { direction, ...span(first), cells: first } : { direction, ...span(second), cells };
}
