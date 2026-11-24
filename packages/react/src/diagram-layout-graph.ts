// The graph automatic layout hands elk (DECISIONS 306, 1.8, and the ruling, DECISIONS 322): the cards, the lines and the groups, and the one fixed set of
// options. Internal to diagram-layout: not an export of the package, so its helpers and elk's graph shape are in no public declaration. Nothing runs at load.

import type { DiagramGroup } from "./diagram-core";
import type { DiagramPlacementInput } from "./diagram-layout";

export interface ElkNode { id: string; width?: number; height?: number; x?: number; y?: number; children?: ElkNode[]; layoutOptions?: Record<string, string>; edges?: Array<{ id: string; sources: string[]; targets: string[] }> }

// Every card one box of one size (only the layer and the order are read, so the result never depends on a measured pixel), and one fixed set of options:
// layered, randomSeed 1, model order for nodes and edges, cycle breaking by model order, node placement by network simplex. Partitioning is never switched on.
// The ruling on DECISIONS 306 and 313 (automatic layout): network simplex in place of Brandes and Köpf, because it reads a line's straightness priority, and a
// main line carries one (STRAIGHT): the main path comes out as one straight run in both directions.
export const W = 200, H = 80;
const STRAIGHT = "10";
const options = (direction: "right" | "down"): Record<string, string> => ({
  "elk.algorithm": "layered",
  "elk.direction": direction === "right" ? "RIGHT" : "DOWN",
  "elk.randomSeed": "1",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.nodeNode": "48",
  "elk.edgeRouting": "ORTHOGONAL",
});

export interface Card { id: string; group?: string; way?: boolean }
export interface Line { from: string; to: string; main: boolean; k: number }

/** The cards and the lines a figure is placed from, in the author's order. */
export function partsOf(input: DiagramPlacementInput): { cards: Card[]; lines: Line[]; groups: DiagramGroup[] } {
  const cards: Card[] = input.type === "schema" ? (input.tables ?? []).map((t) => ({ id: String(t.name) })) : (input.nodes ?? []).map((n) => ({ id: String(n.id), group: n.group }));
  const raw = input.type === "schema"
    ? (input.tables ?? []).flatMap((t) => (t.columns ?? []).filter((c) => c.references).map((c) => ({ from: String(t.name), to: String(c.references).split(".")[0]!, main: false })))
    : (input.edges ?? []).map((e) => ({ from: String(e.from), to: String(e.to), main: e.kind === "main" }));
  const ids = new Set(cards.map((c) => c.id));
  const lines = raw.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e, k) => ({ ...e, k }));
  return { cards, lines, groups: input.type === "architecture" ? input.groups ?? [] : [] };
}

/**
 * The main line goes straight on (the ruling, rule 2): a card with three or more leaving lines, exactly one of them main, hands elk its leaving lines with
 * the main one in the middle (half the others, rounded down, before it), each of the others in the author's order. Every other line keeps its place.
 */
export function mainInTheMiddle<T extends { from: string; main: boolean }>(lines: T[]): T[] {
  const bySource = new Map<string, number[]>();
  lines.forEach((e, k) => { if (!bySource.has(e.from)) bySource.set(e.from, []); bySource.get(e.from)!.push(k); });
  const out = lines.slice();
  for (const slots of bySource.values()) {
    const main = slots.filter((k) => lines[k]!.main);
    if (slots.length < 3 || main.length !== 1) continue;
    const rest = slots.filter((k) => k !== main[0]);
    const order = [...rest.slice(0, Math.floor(rest.length / 2)), main[0]!, ...rest.slice(Math.floor(rest.length / 2))];
    slots.forEach((slot, j) => { out[slot] = lines[order[j]!]!; });
  }
  return out;
}

/** The graph handed to elk: cards in the author's order (a way's boxes before the card its line ends on), groups as hierarchy, lines as ordered above. */
export function graphOf(cards: Card[], lines: Line[], groups: DiagramGroup[], direction: "right" | "down"): ElkNode {
  const kids = new Map<string, ElkNode[]>([["", []]]);
  for (const g of groups) kids.set(g.id, []);
  for (const c of cards) (kids.get(c.group ?? "") ?? kids.get("")!).push({ id: c.id, width: W, height: H });
  const children = [...kids.get("")!];
  // A group goes into its parent unless its chain of parents comes back to it (a cycle, the engine's development error): then it is a group of the root,
  // so elk is never handed a hierarchy that holds itself (Neon's P2 of the code review).
  const cycles = (g: DiagramGroup) => { const seen = new Set<string>([g.id]); for (let p = g.parent; p; p = groups.find((x) => x.id === p)?.parent) { if (seen.has(p)) return true; seen.add(p); } return false; };
  for (const g of groups) {
    const box: ElkNode = { id: `group:${g.id}`, children: kids.get(g.id), layoutOptions: { "elk.padding": "[top=32,left=16,bottom=16,right=16]" } };
    (g.parent && kids.has(g.parent) && !cycles(g) ? kids.get(g.parent)! : children).push(box);
  }
  return { id: "root", layoutOptions: options(direction), children, edges: lines.map((e, k) => ({ id: `e${k}`, sources: [e.from], targets: [e.to], ...(e.main ? { layoutOptions: { "elk.layered.priority.straightness": STRAIGHT } } : {}) })) };
}

/** The graph of the first run, as the first decision's tests read it. */
export function elkGraph(input: DiagramPlacementInput, direction: "right" | "down"): ElkNode {
  const { cards, lines, groups } = partsOf(input);
  return graphOf(cards, mainInTheMiddle(lines), groups, direction);
}
