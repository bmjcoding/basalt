// Basalt's diagrams (DECISIONS 269, revised by 270): the one engine behind the five React components and the HTML skill's `diagram` module.
// It is not exported from the package. It holds no React and no state: the model is read from the author's data, the markup is a small tree
// (React renders it, the skill writes it as HTML at build time), and the drawing is measured from the DOM and returned as one string of
// SVG and labels, so the two implementations draw the same pixels. Nothing here runs when the module loads: every table, cache and
// measurer is built inside a function.
//
// What the author writes is placement on a grid and one record per part; everything else is derived: the sides and slots a line uses, its
// route and jogs, the lanes it shares, a group's box, a foreign key's line, the stacked drawing's routes and gaps, and every label's seat.

// ============================================================================================================================================
// Public shapes (the components re-export these types; no third-party type appears in them)
// ============================================================================================================================================

export type DiagramType = "architecture" | "flowchart" | "data-flow" | "sequence" | "schema";
export type DiagramSide = "top" | "right" | "bottom" | "left";
export type DiagramLineKind = "main" | "plain" | "dashed";

/** The words for the marks. The key is built from what is drawn; `main`, `dashed` and the focal node must have words when drawn. */
export interface DiagramLegend { main?: string; plain?: string; dashed?: string; focal?: string; group?: string }

export interface DiagramNode {
  id: string;
  name: string;
  kind?: string;
  detail?: string;
  /** The detail is an identifier (a port, a type, a path): it is set in Geist Mono. Words stay in Geist. */
  detailMono?: boolean;
  /** The one focal node, inverted. At most one a diagram. */
  focal?: boolean;
  /** 1-based tracks of the drawn layout. */
  col: number;
  row: number;
  /** Indented in the stacked drawing; a node is on the spine unless it is a branch. */
  branch?: boolean;
}

export interface DiagramEdge {
  from: string;
  to: string;
  /** Default "plain". */
  kind?: DiagramLineKind;
  /** One line, at most 28 characters. */
  label?: string;
  /** Only to change the derived side. */
  fromSide?: DiagramSide;
  toSide?: DiagramSide;
}

export interface DiagramGroup { id: string; label: string }
export type ArchitectureNode = DiagramNode & { group?: string };
export type FlowchartNode = DiagramNode & { shape?: "step" | "decision" | "terminal" };
export interface DataFlowLane { id: string; label: string }
export type DataFlowNode = Omit<DiagramNode, "row" | "kind" | "branch"> & { lane: string };
export interface SequenceParticipant { id: string; name: string; kind?: string; short?: string; focal?: boolean }
export type SequenceStep = { from: string; to: string; label: string; note?: string; kind?: DiagramLineKind } | { band: string };
export interface SchemaColumn { name: string; type?: string; key?: "PK" | "FK"; references?: string }
export interface SchemaTable { name: string; col: number; row: number | [number, number]; focal?: boolean; more?: number; columns: SchemaColumn[] }
export interface DiagramShapeLabels { terminal?: string; step?: string; decision?: string }

/** Everything a figure is drawn from: the React props, or the HTML skill's JSON, key for key. */
export interface DiagramSpec {
  type: DiagramType;
  title: string;
  heading?: 2 | 3 | 4 | 5 | 6;
  legend?: DiagramLegend;
  nodes?: Array<ArchitectureNode | FlowchartNode | DataFlowNode>;
  edges?: DiagramEdge[];
  groups?: DiagramGroup[];
  lanes?: DataFlowLane[];
  participants?: SequenceParticipant[];
  steps?: SequenceStep[];
  tables?: SchemaTable[];
  shapeLabels?: DiagramShapeLabels;
  stepLabel?: ((n: number) => string) | string;
}

// ============================================================================================================================================
// The model
// ============================================================================================================================================

type Shape = "box" | "terminal" | "decision" | "table" | "participant";

export interface MColumn { name: string; type?: string; key?: "PK" | "FK"; ref?: { table: string; column: string; row: number } }
export interface MNode {
  id: string;
  i: number;
  name: string;
  kind?: string;
  detail?: string;
  mono: boolean;
  focal: boolean;
  col: number;
  row: number;
  row2: number;
  branch: boolean;
  shape: Shape;
  group?: string;
  lane?: number;
  laneLabel?: string;
  step?: number;
  columns?: MColumn[];
  more?: number;
  short?: string;
}
export interface MEdge {
  i: number;
  from: string;
  to: string;
  kind: DiagramLineKind;
  label?: string;
  fromSide?: DiagramSide;
  toSide?: DiagramSide;
  /** A foreign key: the row it leaves and the row it points to. */
  fromRow?: number;
  toRow?: number;
  fk?: boolean;
}
export type MStep = { band: string } | { n: number; from: string; to: string; label: string; note?: string; kind: DiagramLineKind };
export interface Model {
  type: DiagramType;
  title: string;
  heading: 2 | 3 | 4 | 5 | 6;
  legend: DiagramLegend;
  nodes: MNode[];
  byId: Map<string, MNode>;
  edges: MEdge[];
  groups: Array<DiagramGroup & { members: string[] }>;
  lanes: DataFlowLane[];
  steps: MStep[];
  cols: number;
  rows: number;
  shapeLabels: Required<DiagramShapeLabels>;
  stepWord: (n: number) => string;
  warnings: string[];
}

const SIDES: DiagramSide[] = ["top", "right", "bottom", "left"];

/** Reads the author's data into the model. A problem the decision calls a development error is collected in `warnings`. */
export function buildModel(spec: DiagramSpec): Model {
  const warnings: string[] = [];
  const warn = (message: string) => { warnings.push(message); };
  const legend = { ...(spec.legend ?? {}) };
  const stepWord = typeof spec.stepLabel === "function" ? spec.stepLabel : typeof spec.stepLabel === "string" ? ((n: number) => (spec.stepLabel as string).replace("{n}", String(n))) : (n: number) => `Step ${n}`;
  const shapeLabels = { terminal: "Start or end", step: "Step", decision: "Decision", ...(spec.shapeLabels ?? {}) };
  const nodes: MNode[] = [];
  const edges: MEdge[] = [];
  let lanes: DataFlowLane[] = [];
  const groups: Model["groups"] = [];
  const steps: MStep[] = [];
  const type = spec.type;

  if (type === "architecture" || type === "flowchart") {
    for (const raw of (spec.nodes ?? []) as Array<ArchitectureNode & FlowchartNode>) {
      const shape: Shape = type === "flowchart" && raw.shape === "decision" ? "decision" : type === "flowchart" && raw.shape === "terminal" ? "terminal" : "box";
      nodes.push({
        id: raw.id, i: nodes.length, name: raw.name, kind: shape === "decision" ? undefined : raw.kind, detail: shape === "decision" ? undefined : raw.detail, mono: Boolean(raw.detailMono),
        focal: Boolean(raw.focal), col: raw.col, row: raw.row, row2: raw.row, branch: Boolean(raw.branch), shape, group: type === "architecture" ? raw.group : undefined,
      });
    }
    if (type === "architecture") for (const g of spec.groups ?? []) groups.push({ ...g, members: nodes.filter((n) => n.group === g.id).map((n) => n.id) });
  } else if (type === "data-flow") {
    lanes = spec.lanes ?? [];
    const laneIndex = new Map(lanes.map((l, k) => [l.id, k + 1]));
    for (const raw of (spec.nodes ?? []) as DataFlowNode[]) {
      const lane = laneIndex.get(raw.lane);
      if (lane === undefined) warn(`a node (${raw.id}) names the lane "${raw.lane}", which is not in lanes`);
      const n = nodes.length + 1;
      nodes.push({
        id: raw.id, i: nodes.length, name: raw.name, kind: stepWord(n), detail: raw.detail, mono: Boolean(raw.detailMono), focal: Boolean(raw.focal),
        col: raw.col, row: lane ?? 1, row2: lane ?? 1, branch: false, shape: "box", lane: lane ?? 1, laneLabel: lanes[(lane ?? 1) - 1]?.label ?? raw.lane, step: n,
      });
    }
  } else if (type === "sequence") {
    (spec.participants ?? []).forEach((p, k) => nodes.push({ id: p.id, i: k, name: p.name, kind: p.kind, mono: false, focal: Boolean(p.focal), col: k + 1, row: 1, row2: 1, branch: false, shape: "participant", short: p.short ?? p.name }));
    let n = 0;
    for (const s of spec.steps ?? []) {
      if ("band" in s) steps.push({ band: s.band });
      else steps.push({ n: ++n, from: s.from, to: s.to, label: s.label, note: s.note, kind: s.kind ?? "plain" });
    }
  } else if (type === "schema") {
    for (const t of spec.tables ?? []) {
      const [r1, r2] = Array.isArray(t.row) ? t.row : [t.row, t.row];
      nodes.push({
        id: t.name, i: nodes.length, name: t.name, mono: true, focal: Boolean(t.focal), col: t.col, row: r1, row2: r2, branch: false, shape: "table", more: t.more,
        columns: t.columns.map((c) => ({ name: c.name, type: c.type, key: c.key })),
      });
    }
  }

  const byId = new Map<string, MNode>();
  for (const n of nodes) {
    if (!n.id) warn("a node has no id");
    else if (byId.has(n.id)) warn(`the id "${n.id}" is used twice`);
    byId.set(n.id, n);
  }

  // Schema: a foreign key is one record, `references` on the column; its line, its row's words, the sentence and the list all come from it.
  if (type === "schema") {
    (spec.tables ?? []).forEach((t) => t.columns.forEach((c, k) => {
      if (!c.references) return;
      const [table, column] = c.references.split(".");
      const target = byId.get(table ?? "");
      const row = target?.columns?.findIndex((x) => x.name === column) ?? -1;
      if (!target || row < 0) { warn(`${t.name}.${c.name} references ${c.references}, which is not a shown column`); return; }
      const source = byId.get(t.name)!;
      source.columns![k]!.ref = { table: table!, column: column!, row };
      edges.push({ i: edges.length, from: t.name, to: table!, kind: "plain", fromRow: k, toRow: row, fk: true });
    }));
  } else if (type !== "sequence") {
    for (const e of spec.edges ?? []) {
      if (!byId.has(e.from) || !byId.has(e.to)) { warn(`a line names ${!byId.has(e.from) ? e.from : e.to}, which is not a node`); continue; }
      if (e.label && e.label.length > MAX_LABEL) warn(`the label "${e.label}" is over ${MAX_LABEL} characters: longer words belong in the node or the summary`);
      for (const side of [e.fromSide, e.toSide]) if (side && !SIDES.includes(side)) warn(`"${side}" is not a side (top, right, bottom or left)`);
      edges.push({ i: edges.length, from: e.from, to: e.to, kind: e.kind ?? "plain", label: e.label || undefined, fromSide: e.fromSide, toSide: e.toSide });
    }
  } else {
    for (const s of steps) if ("n" in s) {
      if (!byId.has(s.from) || !byId.has(s.to)) warn(`message ${s.n} names ${!byId.has(s.from) ? s.from : s.to}, which is not a participant`);
    }
  }

  // Placement checks: two nodes in one cell, a non-member inside a group's box, more than one focal node.
  if (type !== "sequence") {
    const cells = new Map<string, string>();
    for (const n of nodes) for (let r = n.row; r <= n.row2; r++) {
      const key = `${n.col}:${r}`;
      if (cells.has(key)) warn(`${n.id} and ${cells.get(key)} share the cell at column ${n.col}, row ${r}`);
      cells.set(key, n.id);
    }
  }
  for (const g of groups) {
    const m = g.members.map((id) => byId.get(id)!);
    if (!m.length) continue;
    const box = { c1: Math.min(...m.map((n) => n.col)), c2: Math.max(...m.map((n) => n.col)), r1: Math.min(...m.map((n) => n.row)), r2: Math.max(...m.map((n) => n.row2)) };
    for (const n of nodes) if (n.group !== g.id && n.col >= box.c1 && n.col <= box.c2 && n.row >= box.r1 && n.row <= box.r2) warn(`${n.id} is inside the box of the group "${g.label}" but not a member`);
    const idx = m.map((n) => n.i);
    if (Math.max(...idx) - Math.min(...idx) + 1 !== idx.length) warn(`the members of the group "${g.label}" are not next to each other in the author's order, so the stacked drawing cannot wrap them in one box`);
  }
  for (const n of nodes) if (n.group && !groups.some((g) => g.id === n.group)) warn(`${n.id} names the group "${n.group}", which is not in groups`);
  if (nodes.filter((n) => n.focal).length > 1) warn("more than one node is focal: a diagram has one at most");

  // The key's words: main, dashed and the focal node must have them when drawn.
  const kinds = new Set<DiagramLineKind>(type === "sequence" ? steps.flatMap((s) => ("n" in s ? [s.kind] : [])) : edges.map((e) => e.kind));
  if (kinds.has("main") && !legend.main) warn("main lines are drawn but the legend has no words for them (legend.main)");
  if (kinds.has("dashed") && !legend.dashed) warn("dashed lines are drawn but the legend has no words for them (legend.dashed)");
  if (nodes.some((n) => n.focal) && !legend.focal) warn("a focal node is drawn but the legend has no words for what it marks (legend.focal)");

  const cols = Math.max(1, ...nodes.map((n) => n.col));
  const rows = type === "data-flow" ? Math.max(1, lanes.length) : Math.max(1, ...nodes.map((n) => n.row2));
  return { type, title: spec.title, heading: spec.heading ?? 3, legend, nodes, byId, edges, groups, lanes, steps, cols, rows, shapeLabels, stepWord, warnings };
}

const MAX_LABEL = 28;

// ============================================================================================================================================
// Words: sentences, the key, the list
// ============================================================================================================================================

const sentence = (s: string) => { const t = s.trim(); return !t ? "" : /[.!?]$/.test(t) ? t : `${t}.`; };
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A kind's word, from the key (none when the author gave none: an unkeyed plain line says "goes to"). */
export function kindWord(m: Model, kind: DiagramLineKind): string | undefined { return m.legend[kind]; }

/** What a flowchart node is called in words. */
function shapeWord(m: Model, n: MNode): string {
  if (n.shape === "decision") return "decision";
  if (n.shape === "terminal") return m.edges.some((e) => e.from === n.id) ? "start" : "end";
  return n.kind ?? "step";
}

/** The sentence a focusable node is named by: what it is, where it sits, what it connects from and to. */
export function nodeSentence(m: Model, n: MNode): string {
  const parts: string[] = [];
  if (m.type === "schema") {
    parts.push(`${n.name}, table.`);
    const refs = (n.columns ?? []).filter((c) => c.ref).map((c) => `${c.ref!.table} (${c.name})`);
    const by = m.edges.filter((e) => e.to === n.id).map((e) => `${e.from} (${m.byId.get(e.from)!.columns![e.fromRow!]!.name})`);
    if (refs.length) parts.push(`References ${refs.join(", ")}.`);
    if (by.length) parts.push(`Referenced by ${by.join(", ")}.`);
  } else if (m.type === "sequence") {
    const sends = m.steps.filter((s) => "n" in s && s.from === n.id).length;
    const gets = m.steps.filter((s) => "n" in s && s.to === n.id).length;
    parts.push(sentence(n.kind ? `${n.name}, ${n.kind}` : n.name));
    parts.push(`Sends ${sends} ${sends === 1 ? "message" : "messages"} and receives ${gets}.`);
  } else {
    const what = m.type === "data-flow" ? `${m.stepWord(n.step!)} of ${m.nodes.length}, ${n.laneLabel}` : m.type === "flowchart" ? shapeWord(m, n) : n.kind;
    parts.push(sentence(what ? `${n.name}, ${what}` : n.name));
    if (n.detail) parts.push(sentence(n.detail));
    if (n.group) { const g = m.groups.find((x) => x.id === n.group); if (g) parts.push(`In ${g.label}.`); }
    const from = m.edges.filter((e) => e.to === n.id).map((e) => `${m.byId.get(e.from)!.name}${e.label ? ` (${e.label})` : ""}`);
    const to = m.edges.filter((e) => e.from === n.id).map((e) => `${m.byId.get(e.to)!.name}${e.label ? ` (${e.label})` : ""}`);
    if (from.length) parts.push(`From: ${from.join(", ")}.`);
    if (to.length) parts.push(`To: ${to.join(", ")}.`);
  }
  if (n.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

/** The noun the key hint and the keys sentence use for one stop. */
function stopNoun(m: Model): string {
  return m.type === "architecture" ? "a part" : m.type === "sequence" ? "a participant" : m.type === "schema" ? "a table" : "a step";
}

// ============================================================================================================================================
// The markup tree
// ============================================================================================================================================

export type VAttrs = Record<string, string | number | boolean | null | undefined>;
export interface VElement { t: string; a: VAttrs; c: VNode[] }
export interface VSlot { slot: "source" | "summary" | "hint" | "toggle" }
export type VNode = string | VElement | VSlot;

type VChild = VNode | null | undefined | false | VChild[];
function h(t: string, a: VAttrs | null, ...c: VChild[]): VElement {
  const kids: VNode[] = [];
  for (const k of c.flat(Infinity as 1) as VChild[]) if (k !== null && k !== undefined && k !== false && !Array.isArray(k)) kids.push(k);
  return { t, a: a ?? {}, c: kids };
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]!);
// Elements written with no closing tag (HTML's void elements, and SVG's shapes written self-closed). A string, so loading the module allocates nothing.
const VOID = " br img input meta link hr path polygon polyline circle rect line ";

/** The tree as HTML. A slot is written by `slots`. */
export function toHtml(v: VNode, slots: Partial<Record<VSlot["slot"], string>> = {}): string {
  if (typeof v === "string") return escapeHtml(v);
  if ("slot" in v) return slots[v.slot] ?? "";
  let attrs = "";
  for (const [k, value] of Object.entries(v.a)) {
    if (value === undefined || value === null || value === false) continue;
    attrs += value === true ? ` ${k}` : ` ${k}="${escapeHtml(String(value))}"`;
  }
  if (VOID.includes(` ${v.t} `) && !v.c.length) return v.t === "path" || v.t === "polygon" || v.t === "polyline" || v.t === "circle" || v.t === "rect" || v.t === "line" ? `<${v.t}${attrs}/>` : `<${v.t}${attrs}>`;
  return `<${v.t}${attrs}>${v.c.map((c) => toHtml(c, slots)).join("")}</${v.t}>`;
}

/** The parts of a figure's state that change its markup. Before script runs every field is unset. */
export interface Dyn {
  /** The layout script chose; unset before script, when the stylesheet decides by the figure's least width. */
  layout?: "drawn" | "stacked";
  /** The node that holds the roving tab stop. */
  stop?: string;
  /** A node that keeps focus (and tabindex -1) in a stack with no stops, until focus leaves it. */
  keep?: string;
  /** A decision's measured height, by node id, in px. */
  heights?: Record<string, number>;
  /** Extra lines of 16 added to the gap above a stacked card, when a label did not fit its seat. */
  grow?: Record<string, number>;
  /** The schema's stacked track: its widest row, measured. */
  track?: number;
  open?: boolean;
}

export interface TreeIds { base: string }
const idsOf = (base: string) => ({ title: `${base}-title`, summary: `${base}-summary`, keys: `${base}-keys`, list: `${base}-list`, toggle: `${base}-toggle` });

/** Whether the figure's nodes are stops (a roving tab index) in this state. */
export function hasStops(m: Model, dyn: Dyn): boolean {
  if (!dyn.layout) return false;
  if (dyn.layout === "drawn") return true;
  return m.type !== "sequence" && m.type !== "schema";
}
/** Whether the nodes are images named by a sentence in this state (before script, the types whose stack has lines). */
function nodesAreImages(m: Model, dyn: Dyn): boolean {
  if (m.type === "sequence" || m.type === "schema") return dyn.layout === "drawn";
  return true;
}

/** How many sides a group reaches (the start or the end column): each adds space-4 to the least width. */
export function groupReach(m: Model): number {
  let reach = 0;
  for (const g of m.groups) {
    const cols = g.members.map((id) => m.byId.get(id)!.col);
    if (!cols.length) continue;
    if (Math.min(...cols) === 1) reach |= 1;
    if (Math.max(...cols) === m.cols) reach |= 2;
  }
  return (reach & 1) + ((reach >> 1) & 1);
}

/** The figure's columns as the least-width rules count them: a sequence's participants, a data flow's step columns, everyone else's tracks. */
export function columnCount(m: Model): number { return m.type === "sequence" ? m.nodes.length : m.cols; }

// ---- The stacked drawing's plan: routes and gaps from the order alone (1.13) ----

export type StackRoute = "down" | "up" | "trunk" | "rail" | "end-down" | "end-up";
export interface StackPlan { routes: StackRoute[]; gutter: boolean; lanes: number[]; exits: number[]; gaps: Record<string, number>; third: boolean }

/** The stacked drawing's routes, end lanes and the gap above each card (in px of the space scale), from the author's order. */
export function stackPlan(m: Model): StackPlan {
  const order = m.nodes;
  const spine = (i: number) => m.type === "data-flow" || !order[i]!.branch;
  const routes: StackRoute[] = m.edges.map((e) => {
    const a = m.byId.get(e.from)!.i, b = m.byId.get(e.to)!.i;
    const between = order.slice(Math.min(a, b) + 1, Math.max(a, b));
    const onlyBranches = between.every((n) => !spine(n.i));
    if (b === a + 1 && !(spine(a) && !spine(b))) return "down";
    if (b === a - 1) return "up";
    if (b > a && spine(a) && !spine(b) && onlyBranches) return "trunk";
    if (b > a && spine(a) && spine(b) && onlyBranches) return "rail";
    return b > a ? "end-down" : "end-up";
  });
  const ends = m.edges.map((e, k) => ({ e, k })).filter(({ k }) => routes[k] === "end-down" || routes[k] === "end-up");
  const span = (e: MEdge) => { const a = m.byId.get(e.from)!.i, b = m.byId.get(e.to)!.i; return [Math.min(a, b), Math.max(a, b)] as const; };
  const overlaps = (x: MEdge, y: MEdge) => { const [a1, b1] = span(x), [a2, b2] = span(y); return a1 < b2 && a2 < b1; };
  // The end lane inside the cards serves only lines that leave a branch, pass only branches and run alone; otherwise every end line takes the gutter.
  const laneOk = ends.every(({ e }) => {
    const a = m.byId.get(e.from)!.i;
    const [lo, hi] = span(e);
    return !spine(a) && order.slice(lo + 1, hi).every((n) => !spine(n.i)) && ends.every((o) => o.e === e || !overlaps(o.e, e));
  });
  const gutter = ends.length > 0 && (m.type === "data-flow" || !laneOk);
  // Lanes in the gutter: nested (1.7 rule 3): of two overlapping lines the one that travels farther takes the outer lane; equal travel, the earlier is inside.
  const travel = (e: MEdge) => { const [a, b] = span(e); return b - a; };
  const lanes = m.edges.map(() => 0);
  let third = false;
  for (const { e, k } of ends) {
    const inner = ends.filter((o) => o.e !== e && overlaps(o.e, e) && (travel(o.e) < travel(e) || (travel(o.e) === travel(e) && o.k < k)));
    lanes[k] = inner.length ? 1 : 0;
    if (inner.length > 1 || ends.filter((o) => o.e !== e && overlaps(o.e, e)).length > 1) {
      // Three overlapping end lines at once need a third lane.
      const others = ends.filter((o) => o.e !== e && overlaps(o.e, e));
      if (others.some((o) => others.some((p) => p !== o && overlaps(o.e, p.e)))) third = true;
    }
  }
  // Where an end line leaves its card: the middle, or the thirds when two leave one card (the farther one nearer the top going down, nearer the bottom going up).
  const exits = m.edges.map(() => 0.5);
  for (const n of order) {
    const leaving = ends.filter(({ e }) => e.from === n.id);
    if (leaving.length < 2) continue;
    const down = leaving.filter(({ k }) => routes[k] === "end-down").sort((x, y) => travel(y.e) - travel(x.e) || x.k - y.k);
    const up = leaving.filter(({ k }) => routes[k] === "end-up").sort((x, y) => travel(x.e) - travel(y.e) || y.k - x.k);
    [...down, ...up].forEach(({ k }, j, all) => { exits[k] = all.length === 2 ? (j === 0 ? 1 / 3 : 2 / 3) : (j + 1) / (all.length + 1); });
  }
  // The gap above each card (1.13): 32 for a plain entry, 40 for a branch entry with its label beside the elbow, 48 for a labelled stem, rail
  // entry or end-line turn, 64 when two labelled entries share it or a turn from the card above and a turn into the card below share it.
  // A data flow keeps 48 between every step.
  const gaps: Record<string, number> = {};
  for (let b = 1; b < order.length; b++) {
    const card = order[b]!, above = order[b - 1]!;
    let labelled = 0, gap = m.type === "data-flow" ? 48 : 32, turnInto = false, turnFrom = false;
    m.edges.forEach((e, k) => {
      const r = routes[k]!;
      const ia = m.byId.get(e.from)!.i, ib = m.byId.get(e.to)!.i;
      const into = ib === b && (r === "down" || r === "trunk" || r === "rail" || r === "end-down");
      const upInto = ia === b && ib === b - 1 && r === "up";
      const turnBelowAbove = ib === b - 1 && r === "end-up";
      if (into && (r === "trunk" || r === "end-down")) turnInto = true;
      if (turnBelowAbove) turnFrom = true;
      if ((into || upInto || turnBelowAbove) && e.label) {
        labelled++;
        gap = Math.max(gap, r === "trunk" ? 40 : 48);
      }
    });
    if (labelled > 1 || (turnInto && turnFrom)) gap = 64;
    gaps[card.id] = gap;
    void above;
  }
  return { routes, gutter, lanes, exits, gaps, third };
}

// ---- Swatches: each drawn exactly as its mark ----

const svgA = (w: number, hgt: number): VAttrs => ({ width: w, height: hgt, viewBox: `0 0 ${w} ${hgt}`, "aria-hidden": "true", focusable: "false" });

/** A line swatch, 24 wide and 16 tall: the same stroke, dash and head as the line. */
function lineSwatch(P: string, kind: DiagramLineKind | "fk"): VElement {
  const k = kind === "fk" ? "plain" : kind;
  const y = k === "main" ? 8 : 8.5;
  const end = 24;
  const shaftEnd = k === "dashed" ? end - 1 : end - 7;
  return h("svg", { class: `${P}-swatch`, "data-kind": k, ...svgA(24, 16) },
    kind === "fk" ? h("circle", { class: `${P}-dot`, cx: 3, cy: y, r: 3 }) : null,
    h("path", { class: `${P}-line`, "data-kind": k, d: `M${kind === "fk" ? 3 : 0} ${y}H${shaftEnd}` }),
    k === "dashed"
      ? h("path", { class: `${P}-tip`, "data-kind": k, "data-open": "", d: `M${end - 8} ${y - 4}L${end} ${y}L${end - 8} ${y + 4}` })
      : h("path", { class: `${P}-tip`, "data-kind": k, d: `M${end} ${y}L${end - 8} ${y - 4}L${end - 8} ${y + 4}Z` }));
}
function boxSwatch(P: string, shape: "box" | "terminal" | "decision" | "focal" | "group"): VElement {
  if (shape === "decision") return h("svg", { class: `${P}-swatch`, "data-shape": shape, ...svgA(16, 16) }, h("path", { class: `${P}-swatch-shape`, d: "M8 2.5L14.5 8L8 13.5L1.5 8Z" }));
  if (shape === "terminal") return h("svg", { class: `${P}-swatch`, "data-shape": shape, ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-shape`, x: 0.5, y: 3.5, width: 15, height: 9, rx: 4.5 }));
  return h("svg", { class: `${P}-swatch`, "data-shape": shape, ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-shape`, x: 0.5, y: 2.5, width: 15, height: 11, rx: 2 }));
}

/** The key, built from the marks the model draws: shapes, main, plain, dashed, the foreign-key line, the focal node, the group. */
function keyTree(P: string, m: Model): VElement | null {
  const entries: VElement[] = [];
  const entry = (swatch: VElement, words: string, attrs: VAttrs = {}) => entries.push(h("li", { class: `${P}-entry`, ...attrs }, swatch, h("span", null, words)));
  if (m.type === "flowchart") {
    const used = new Set(m.nodes.map((n) => n.shape));
    if (used.has("terminal")) entry(boxSwatch(P, "terminal"), m.shapeLabels.terminal);
    if (used.has("box")) entry(boxSwatch(P, "box"), m.shapeLabels.step);
    if (used.has("decision")) entry(boxSwatch(P, "decision"), m.shapeLabels.decision);
  }
  const kinds = new Set<DiagramLineKind>(m.type === "sequence" ? m.steps.flatMap((s) => ("n" in s ? [s.kind] : [])) : m.edges.filter((e) => !e.fk).map((e) => e.kind));
  for (const k of ["main", "plain", "dashed"] as const) {
    const words = m.legend[k];
    if (kinds.has(k) && words) entry(lineSwatch(P, k), words, { "data-line": "" });
  }
  if (m.type === "schema" && m.edges.length) {
    // The foreign-key line where it is drawn; where it is not, the row says it, and so does the key.
    entry(lineSwatch(P, "fk"), m.legend.plain ?? "A foreign key, to the key it references", { "data-line": "", "data-when": "drawn" });
    entries.push(h("li", { class: `${P}-entry`, "data-when": "stacked" }, h("span", { class: `${P}-fk-mark`, "aria-hidden": "true" }, "→"), h("span", null, "A foreign key, written in the row")));
  }
  if (m.nodes.some((n) => n.focal) && m.legend.focal) entry(boxSwatch(P, "focal"), m.legend.focal, { "data-focal": "" });
  if (m.groups.length && m.legend.group) entry(boxSwatch(P, "group"), m.legend.group);
  if (!entries.length) return null;
  return h("div", { class: `${P}-key` }, h("ul", { class: `${P}-legend`, "aria-label": "Key" }, entries));
}

/** The swatch drawn inline in the stacked sequence and in its list: a short arrow like its kind. */
function inlineArrow(P: string, kind: DiagramLineKind): VElement {
  const y = kind === "main" ? 6 : 6.5;
  return h("svg", { class: `${P}-arrow`, "data-kind": kind, ...svgA(20, 12) },
    h("path", { class: `${P}-line`, "data-kind": kind, d: `M0 ${y}H${kind === "dashed" ? 19 : 13}` }),
    kind === "dashed"
      ? h("path", { class: `${P}-tip`, "data-kind": kind, "data-open": "", d: `M12 ${y - 4}L20 ${y}L12 ${y + 4}` })
      : h("path", { class: `${P}-tip`, "data-kind": kind, d: `M20 ${y}L12 ${y - 4}L12 ${y + 4}Z` }));
}

// ---- Nodes ----

function nodeText(P: string, m: Model, n: MNode): VChild[] {
  if (n.shape === "decision") return [h("span", { class: `${P}-words` }, h("span", { class: `${P}-name` }, n.name))];
  const kids: VNode[] = [];
  if (m.type === "data-flow") kids.push(h("span", { class: `${P}-kind` }, n.kind!, h("span", { class: `${P}-lane-word` }, ` · ${n.laneLabel}`)));
  else if (n.kind) kids.push(h("span", { class: `${P}-kind` }, n.kind));
  kids.push(h("span", { class: `${P}-name` }, n.name));
  if (n.detail) kids.push(h("span", { class: `${P}-detail`, "data-mono": n.mono ? "" : undefined }, n.detail));
  return kids;
}

function tableText(P: string, n: MNode): VChild[] {
  return [
    h("span", { class: `${P}-th` }, h("span", { class: `${P}-tname` }, n.name)),
    h("span", { class: `${P}-rows` }, (n.columns ?? []).map((c, k) => h("span", { class: `${P}-row`, "data-row": k, "data-key": c.key },
      h("span", { class: `${P}-keyseat` }, c.key ?? ""),
      h("span", { class: `${P}-cname` }, c.name),
      c.ref ? h("span", { class: `${P}-ctype`, "data-ref": "" }, `→ ${c.ref.table}`) : c.type ? h("span", { class: `${P}-ctype` }, c.type) : null))),
    n.more ? h("span", { class: `${P}-more` }, `+ ${n.more} more`) : null,
  ];
}

const gapVar = (px: number) => {
  const step: Record<number, string> = { 32: "space-8", 40: "space-10", 48: "space-12", 64: "space-16" };
  return step[px] ? `var(--basalt-${step[px]})` : `${px}px`;
};

interface TreeContext { P: string; ids: ReturnType<typeof idsOf>; level?: number; plan: StackPlan | null; hidden: string }

function nodeTree(ctx: TreeContext, m: Model, n: MNode, dyn: Dyn): VElement {
  const { P } = ctx;
  const images = nodesAreImages(m, dyn) || dyn.keep === n.id;
  const stops = hasStops(m, dyn);
  const style: string[] = [`--_c:${n.col}`, `--_r:${n.row}`, `--_r2:${n.row2 + 1}`];
  if (m.type === "data-flow") style.push(`--_lc:${n.col + 1}`);
  if (m.type === "sequence") style.push(`--_c2:${n.col + 1}`);
  const plan = ctx.plan;
  if (plan && n.i > 0) {
    const base = plan.gaps[n.id] ?? 32;
    const grow = dyn.grow?.[n.id] ?? 0;
    style.push(`--_gap:${grow ? `calc(${gapVar(base)} + var(--basalt-space-4) * ${grow})` : gapVar(base)}`);
  }
  if (dyn.heights?.[n.id]) style.push(`--_h:${dyn.heights[n.id]}px`);
  const tabbable = stops ? (dyn.stop === n.id ? 0 : -1) : dyn.keep === n.id ? -1 : undefined;
  return h("div", {
    class: `${P}-node`,
    "data-node": n.id,
    "data-shape": n.shape,
    "data-focal": n.focal ? "" : undefined,
    "data-branch": n.branch ? "" : undefined,
    "data-level": ctx.level,
    style: style.join(";"),
    role: images ? "img" : undefined,
    "aria-label": images ? nodeSentence(m, n) : undefined,
    tabindex: tabbable,
  },
  n.shape === "decision" ? h("svg", { class: `${P}-diamond`, viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" }, h("path", { d: "M50 0L100 50L50 100L0 50Z" })) : null,
  n.shape === "table" ? tableText(P, n) : nodeText(P, m, n));
}

function drawingChildren(ctx: TreeContext, m: Model, dyn: Dyn): VNode[] {
  const { P } = ctx;
  const out: VNode[] = [];
  if (m.type === "data-flow") {
    out.push(...m.lanes.map((l, k) => h("div", { class: `${P}-lane`, style: `--_r:${k + 1}`, "aria-hidden": "true" }, h("span", { class: `${P}-lane-name` }, l.label))));
  }
  if (m.type === "architecture") {
    for (const g of m.groups) {
      const mem = g.members.map((id) => m.byId.get(id)!);
      if (!mem.length) continue;
      const c1 = Math.min(...mem.map((n) => n.col)), c2 = Math.max(...mem.map((n) => n.col)), r1 = Math.min(...mem.map((n) => n.row)), r2 = Math.max(...mem.map((n) => n.row2));
      out.push(h("div", { class: `${P}-gbox`, "data-group": g.id, style: `--_c:${c1};--_c2:${c2 + 1};--_r:${r1};--_r2:${r2 + 1}`, "aria-hidden": "true" }, h("span", { class: `${P}-glabel` }, g.label)));
    }
  }
  if (m.type === "sequence") {
    out.push(h("ul", { class: `${P}-cast` }, m.nodes.map((n) => h("li", { class: `${P}-actor` }, nodeTree(ctx, m, n, dyn)))));
    out.push(sequenceSteps(ctx, m));
    return out;
  }
  // Nodes in the author's order; a group's members are wrapped once, so the stacked drawing can draw its box around them.
  let k = 0;
  while (k < m.nodes.length) {
    const n = m.nodes[k]!;
    const g = n.group ? m.groups.find((x) => x.id === n.group) : undefined;
    if (!g) { out.push(nodeTree(ctx, m, n, dyn)); k++; continue; }
    const run: MNode[] = [];
    while (k < m.nodes.length && m.nodes[k]!.group === g.id) run.push(m.nodes[k++]!);
    out.push(h("div", { class: `${P}-group`, "data-group": g.id }, h("span", { class: `${P}-glabel`, "aria-hidden": "true" }, g.label), run.map((x) => nodeTree(ctx, m, x, dyn))));
  }
  return out;
}

function sequenceSteps(ctx: TreeContext, m: Model): VElement {
  const { P } = ctx;
  const blocks: VNode[] = [];
  let list: VElement | null = null;
  for (const s of m.steps) {
    if ("band" in s) { list = null; blocks.push(h("p", { class: `${P}-band` }, h("span", null, s.band))); continue; }
    if (!list) { list = h("ol", { class: `${P}-msgs`, start: s.n }); blocks.push(list); }
    const a = m.byId.get(s.from), b = m.byId.get(s.to);
    const ca = a?.col ?? 1, cb = b?.col ?? 1;
    const self = ca === cb;
    const last = self && ca === m.nodes.length;
    const word = kindWord(m, s.kind);
    list.c.push(h("li", { class: `${P}-msg`, "data-kind": s.kind, "data-from": s.from, "data-to": s.to, "data-self": self ? (last ? "start" : "end") : undefined, style: `--_a:${Math.min(ca, cb)};--_b:${Math.max(ca, cb) + 1}` },
      h("span", { class: `${P}-said` }, h("span", { class: `${P}-num` }, String(s.n)), h("span", { class: `${P}-mlabel` }, s.label)),
      h("span", { class: `${P}-route` }, a?.short ?? s.from, " ", inlineArrow(P, s.kind), h("span", { class: ctx.hidden }, " to "), " ", b?.short ?? s.to, word ? ` · ${word}` : ""),
      s.note ? h("span", { class: `${P}-note` }, s.note) : null));
  }
  return h("div", { class: `${P}-steps` }, blocks);
}

// ---- The list ("View as list") ----

function listTree(P: string, m: Model): VNode[] {
  const sub = Math.min(6, m.heading + 1);
  const H = (text: string) => h(`h${sub}`, { class: `${P}-list-head` }, text);
  const strong = (s: string) => h("strong", null, s);
  const code = (s: string) => h("code", { class: `${P}-code` }, s);
  const name = (id: string) => m.byId.get(id)?.name ?? id;
  const kw = (k: DiagramLineKind) => { const w = kindWord(m, k); return w ? ` (${w})` : ""; };
  const focal = (n: MNode) => (n.focal && m.legend.focal ? ` ${sentence(m.legend.focal)}` : "");
  if (m.type === "architecture") {
    const part = (n: MNode) => h("li", null, strong(n.name), n.kind ? `, ${n.kind}` : "", n.detail ? [". ", n.mono ? code(n.detail) : n.detail, /[.!?]$/.test(n.detail) ? "" : "."] : /[.!?]$/.test(n.kind ?? n.name) ? "" : ".", focal(n));
    const out: VNode[] = [H("Parts")];
    const loose = m.nodes.filter((n) => !n.group);
    if (loose.length) out.push(h("ul", { class: `${P}-list-items` }, loose.map(part)));
    for (const g of m.groups) {
      out.push(h("p", { class: `${P}-list-group` }, g.label));
      out.push(h("ul", { class: `${P}-list-items` }, g.members.map((id) => part(m.byId.get(id)!))));
    }
    out.push(H("Connections"));
    out.push(h("ol", { class: `${P}-list-items` }, m.edges.map((e) => h("li", null, strong(name(e.from)), " to ", strong(name(e.to)), e.label ? [": ", code(e.label)] : "", `${kw(e.kind)}.`))));
    return out;
  }
  if (m.type === "flowchart") {
    const num = (id: string) => (m.byId.get(id)?.i ?? 0) + 1;
    return [h("ol", { class: `${P}-list-items` }, m.nodes.map((n) => {
      const exits = m.edges.filter((e) => e.from === n.id);
      const what = n.shape === "decision" ? "Decision" : n.shape === "terminal" ? (exits.length ? "Start" : "End") : "Step";
      const stop = !n.detail && /[.!?]$/.test(n.name) ? " " : ". ";
      return h("li", null, strong(n.name), n.detail ? [", ", n.mono ? code(n.detail) : n.detail] : "", `${stop}${what}.`, focal(n),
        exits.length ? h("ul", { class: `${P}-list-exits` }, exits.map((e) => h("li", null, e.label ? `If ${e.label}: go to ${num(e.to)}, ` : `Then: go to ${num(e.to)}, `, strong(name(e.to)), e.kind === "main" && m.legend.main ? ` (${m.legend.main})` : ""))) : null);
    }))];
  }
  if (m.type === "data-flow") {
    return [h("ol", { class: `${P}-list-items` }, m.nodes.map((n) => {
      const exits = m.edges.filter((e) => e.from === n.id);
      return h("li", null, `${n.laneLabel}: `, strong(n.name), n.detail ? [", ", n.mono ? code(n.detail) : n.detail] : "", ".", focal(n),
        exits.length ? [" Then ", ...exits.flatMap((e, j) => [j ? "; " : "", `to step ${m.byId.get(e.to)!.step}, `, strong(name(e.to)), e.label ? [": ", code(e.label)] : "", kw(e.kind)]), "."] : "");
    }))];
  }
  if (m.type === "sequence") {
    const out: VNode[] = [H("Participants"), h("ul", { class: `${P}-list-items` }, m.nodes.map((n) => h("li", null, strong(n.name), n.kind ? `, ${n.kind}` : "", ".", focal(n))))];
    out.push(H("Messages"));
    let list: VElement | null = null;
    for (const s of m.steps) {
      if ("band" in s) { list = null; out.push(h("p", { class: `${P}-list-group` }, s.band)); continue; }
      if (!list) { list = h("ol", { class: `${P}-list-items`, start: s.n }); out.push(list); }
      list.c.push(h("li", null, code(s.label), ": ", strong(name(s.from)), " to ", strong(name(s.to)), `${kw(s.kind)}.`, s.note ? ` ${sentence(upperFirst(s.note))}` : ""));
    }
    return out;
  }
  // schema
  const out: VNode[] = [];
  for (const n of m.nodes) {
    out.push(h("p", { class: `${P}-list-group` }, code(n.name), focal(n)));
    out.push(h("ul", { class: `${P}-list-items` }, [
      ...(n.columns ?? []).map((c) => h("li", null, code(c.name), c.key === "PK" ? ", primary key" : c.key === "FK" ? ", foreign key" : "", c.ref ? [", references ", code(`${c.ref.table}.${c.ref.column}`)] : c.type ? `, ${c.type}` : "")),
      ...(n.more ? [h("li", null, `and ${n.more} more ${n.more === 1 ? "column" : "columns"}`)] : []),
    ]));
  }
  return out;
}

/** The keys sentence (hidden), which describes the drawing to a screen reader. */
function keysSentence(m: Model): string {
  const noun = m.type === "architecture" ? "part" : m.type === "sequence" ? "participant" : m.type === "schema" ? "table" : "step";
  return `Arrow keys move to the next or the previous ${noun}, in the author's order; Home and End go to the ends; Escape clears the trace.`;
}

/** The key hint's entries: the keys and their words. */
export function hintEntries(m: Model): Array<{ keys: string[]; words: string }> {
  return [{ keys: ["←", "→"], words: stopNoun(m) }, { keys: ["Home", "End"], words: "the ends" }, { keys: ["Esc"], words: "clear" }];
}

export interface FigureOptions {
  /** The class prefix: "basalt-diagram" in React, "diagram" in the HTML skill. */
  prefix: string;
  /** A unique base for the figure's ids. */
  base: string;
  /** React's surface level for the nodes (the skill's stylesheet works the level out itself). */
  level?: number;
  /** Extra attributes for the root (React's className, the caller's props stay React's). */
  className?: string;
  hasSource?: boolean;
  /** The class of the hidden text. */
  hiddenClass: string;
}

/** The whole figure. Before script runs `dyn` is empty; the same tree, with the measured `dyn`, is what script settles on. */
export function figureTree(m: Model, dyn: Dyn, o: FigureOptions): VElement {
  const P = o.prefix;
  const ids = idsOf(o.base);
  const plan = m.type === "sequence" || m.type === "schema" ? null : stackPlan(m);
  const ctx: TreeContext = { P, ids, level: o.level, plan, hidden: o.hiddenClass };
  const drawn = dyn.layout === "drawn";
  const stops = hasStops(m, dyn);
  const group = m.type === "sequence" || m.type === "schema" ? drawn : true;
  const Head = `h${m.heading}`;
  const style: string[] = [`--_cols:${columnCount(m)}`];
  if (m.type === "architecture" && m.groups.length) {
    // The drawn layout keeps room for a group's box where it reaches an edge: space-8 above, space-4 at a side and below.
    const members = m.groups.flatMap((g) => g.members.map((id) => m.byId.get(id)!));
    const pad = (on: boolean, step: string) => (on ? `var(--basalt-space-${step})` : "0px");
    style.push(`--_gpad:${pad(members.some((n) => n.row === 1), "8")} ${pad(members.some((n) => n.col === m.cols), "4")} ${pad(members.some((n) => n.row2 === m.rows), "4")} ${pad(members.some((n) => n.col === 1), "4")}`);
  }
  if (m.type === "schema" && dyn.track) style.push(`--_track:${dyn.track}px`);
  return h("figure", {
    class: o.className ? `${P} ${o.className}` : P,
    "aria-labelledby": ids.title,
    "data-type": m.type,
    "data-cols": columnCount(m),
    "data-reach": m.type === "architecture" ? groupReach(m) : undefined,
    "data-gutter": plan?.gutter ? "" : undefined,
    "data-layout": dyn.layout,
    "data-measured": dyn.layout ? "" : undefined,
    style: style.join(";"),
  },
  h("div", { class: `${P}-head` }, h(Head, { id: ids.title, class: `${P}-title` }, m.title), o.hasSource ? h("p", { class: `${P}-source` }, { slot: "source" }) : null),
  h("div", {
    class: `${P}-drawing`,
    role: group ? "group" : undefined,
    "aria-roledescription": group ? "diagram" : undefined,
    "aria-labelledby": group ? ids.title : undefined,
    "aria-describedby": group ? `${ids.summary} ${ids.keys}` : undefined,
    "data-stops": stops ? "" : undefined,
  }, drawingChildren(ctx, m, dyn), h("div", { class: `${P}-ink`, "aria-hidden": "true" }), h("span", { class: `${P}-ruler`, "aria-hidden": "true" })),
  keyTree(P, m),
  h("p", { class: `${P}-hint`, "data-kbd-hint": "", "aria-hidden": "true" }, { slot: "hint" }),
  h("div", { class: `${P}-foot` }, { slot: "toggle" }),
  h("div", { id: ids.list, class: `${P}-list`, hidden: !dyn.open }, listTree(P, m)),
  h("span", { id: ids.keys, class: o.hiddenClass }, keysSentence(m)),
  h("figcaption", { id: ids.summary, class: `${P}-summary` }, { slot: "summary" }));
}

export const figureIds = idsOf;

// ============================================================================================================================================
// Measuring and drawing (script only)
// ============================================================================================================================================

export interface Pt { x: number; y: number }
export interface Rect { l: number; t: number; r: number; b: number }
type Dir = "up" | "down" | "left" | "right";
export interface GNode { id: string; rect: Rect; shape: Shape; i: number }
export interface GLine {
  /** The edge's index, or a message's number in a sequence. */
  i: number;
  from: string;
  to: string;
  kind: DiagramLineKind;
  pts: Pt[];
  /** The tip of the head and the way it points. */
  tip: Pt;
  dir: Dir;
  /** A foreign key's dot, on the row it leaves. */
  dot?: Pt;
  width: number;
}
export interface GLabel { i: number; text: string; box: Rect; on: boolean }
export interface GCross { top: number; under: number; at: Pt; underVertical: boolean }
export interface Geo {
  w: number;
  h: number;
  nodes: GNode[];
  lines: GLine[];
  lifelines: Array<{ x: number; y1: number; y2: number }>;
  labels: GLabel[];
  crossings: GCross[];
  /** Lines that pass through a node (by edge index), labels that found no seat, words that do not fit their span. */
  through: number[];
  unseated: number[];
  /** The offset of the drawing's origin from the device pixel grid, so lines can be snapped to it. */
  ox: number;
  oy: number;
}

interface Tokens {
  space: (step: string) => number;
  node: number; table: number; lane: number; step: number; head: number; guide: number;
  hair: number; line: number; cut: number; dot: number; dash: number; dashGap: number;
  wide: number; cap: number; radius: number; radiusXs: number;
}

function readTokens(el: Element): Tokens {
  const style = getComputedStyle(el);
  const px = (name: string, fallback: number) => { const v = parseFloat(style.getPropertyValue(`--basalt-${name}`)); return Number.isFinite(v) ? v : fallback; };
  const cache = new Map<string, number>();
  return {
    space: (step) => { if (!cache.has(step)) cache.set(step, px(`space-${step}`, parseFloat(step.replace("-", ".")) * 4)); return cache.get(step)!; },
    node: px("size-diagram-node", 144), table: px("size-diagram-table", 224), lane: px("size-diagram-lane", 120), step: px("size-diagram-step", 56),
    head: px("size-diagram-head", 8), guide: px("size-diagram-guide-dash", 4), hair: px("size-hairline", 1), line: px("size-chart-line", 2),
    cut: px("size-cut", 2), dot: px("size-dot", 6), dash: px("size-chart-dash", 6), dashGap: px("size-chart-dash-gap", 4),
    wide: px("size-breakpoint-container-lg", 640), cap: px("size-breakpoint-container", 480), radius: px("radius-md", 8), radiusXs: px("radius-xs", 4),
  };
}

const strokeOf = (kind: DiagramLineKind, tk: Tokens) => (kind === "main" ? tk.line : tk.hair);
const rectOf = (el: Element, origin: DOMRect): Rect => { const r = el.getBoundingClientRect(); return { l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top }; };
const hit = (a: Rect, b: Rect, eps = 0.01) => a.l < b.r - eps && a.r > b.l + eps && a.t < b.b - eps && a.b > b.t + eps;
const grow = (a: Rect, p: number): Rect => ({ l: a.l - p, r: a.r + p, t: a.t - p, b: a.b + p });

// ---- Shapes: where a line meets a node, and what a label must keep clear of ----

function contour(n: GNode, side: DiagramSide, along: number): Pt {
  const { l, t, r, b } = n.rect;
  const cx = (l + r) / 2, cy = (t + b) / 2, hw = (r - l) / 2, hh = (b - t) / 2;
  const vertical = side === "top" || side === "bottom";
  if (n.shape === "decision") {
    if (vertical) { const x = along; const dy = hh * Math.max(0, 1 - Math.abs(x - cx) / hw); return { x, y: side === "top" ? cy - dy : cy + dy }; }
    const y = along; const dx = hw * Math.max(0, 1 - Math.abs(y - cy) / hh); return { x: side === "left" ? cx - dx : cx + dx, y };
  }
  if (n.shape === "terminal") {
    const rr = Math.min(hw, hh);
    if (vertical) {
      const x = along; const ex = Math.min(Math.max(x, l + rr), r - rr); const dx = x - ex;
      const dy = Math.abs(dx) >= rr ? 0 : Math.sqrt(rr * rr - dx * dx);
      return { x, y: Math.abs(dx) < 1e-6 ? (side === "top" ? t : b) : side === "top" ? cy - dy : cy + dy };
    }
    const y = along; const dy = y - cy; const dx = Math.abs(dy) >= rr ? 0 : Math.sqrt(rr * rr - dy * dy);
    return { x: side === "left" ? l + rr - dx : r - rr + dx, y };
  }
  if (vertical) return { x: along, y: side === "top" ? t : b };
  return { x: side === "left" ? l : r, y: along };
}

/** Whether a point is inside a node as drawn (a diamond, a capsule, a box), at least `pad` in from its edge. */
function insideShape(p: Pt, n: GNode, pad: number): boolean {
  const { l, t, r, b } = n.rect;
  const cx = (l + r) / 2, cy = (t + b) / 2, hw = (r - l) / 2, hh = (b - t) / 2;
  if (n.shape === "decision") return Math.abs(p.x - cx) / hw + Math.abs(p.y - cy) / hh < 1 - pad / Math.min(hw, hh);
  if (n.shape === "terminal") {
    const rr = Math.min(hw, hh);
    const ex = Math.min(Math.max(p.x, l + rr), r - rr);
    return Math.hypot(p.x - ex, p.y - cy) < rr - pad;
  }
  return p.x > l + pad && p.x < r - pad && p.y > t + pad && p.y < b - pad;
}

/** A box against a node's drawn shape (1.8: a node is tested as it is drawn, never as its bounding box). */
function boxHitsShape(box: Rect, n: GNode): boolean {
  if (!hit(box, n.rect)) return false;
  if (n.shape !== "decision" && n.shape !== "terminal") return true;
  const { l, t, r, b } = n.rect;
  const cx = (l + r) / 2, cy = (t + b) / 2, hw = (r - l) / 2, hh = (b - t) / 2;
  if (n.shape === "decision") {
    const px = Math.max(box.l, Math.min(cx, box.r)), py = Math.max(box.t, Math.min(cy, box.b));
    return Math.abs(px - cx) / hw + Math.abs(py - cy) / hh < 1 - 1e-6;
  }
  const rr = Math.min(hh, hw);
  if (hit(box, { l: l + rr, r: r - rr, t, b })) return true;
  for (const ex of [l + rr, r - rr]) {
    const px = Math.max(box.l, Math.min(ex, box.r)), py = Math.max(box.t, Math.min(cy, box.b));
    if (Math.hypot(px - ex, py - cy) < rr - 0.01) return true;
  }
  return false;
}

function segmentThrough(a: Pt, b: Pt, n: GNode): boolean {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(2, Math.ceil(len / 2));
  for (let k = 1; k < steps; k++) {
    const f = k / steps;
    if (f * len < 1.5 || (1 - f) * len < 1.5) continue;
    if (insideShape({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, n, 1)) return true;
  }
  return false;
}

// ---- Measuring words ----

function ruler(drawing: Element, P: string) {
  const el = drawing.querySelector<HTMLElement>(`.${P}-ruler`)!;
  const known = new Map<string, number>();
  return (text: string, font: "name" | "name-500" | "mono" | "sans" | "table" | "label") => {
    const key = `${font}|${text}`;
    if (!known.has(key)) { el.setAttribute("data-f", font); el.textContent = text; known.set(key, el.getBoundingClientRect().width); el.textContent = ""; }
    return known.get(key)!;
  };
}
const words = (s?: string) => (s ? s.split(/\s+/).filter(Boolean) : []);

/** The figure's measured minimums (1.11, rule 2): the widest unbreakable word of any node, a table's widest row, on top of the tokens. */
function minimums(m: Model, tk: Tokens, measure: ReturnType<typeof ruler>) {
  const s = tk.space;
  let track = tk.node;
  let table = tk.table;
  for (const n of m.nodes) {
    if (n.shape === "table") {
      for (const c of n.columns ?? []) {
        const type = c.ref ? `→ ${c.ref.table}` : c.type ?? "";
        const row = s("6") + measure(c.name, "mono") + (type ? s("3") + measure(type, "mono") : 0) + 2 * s("3") + 2 * tk.hair;
        table = Math.max(table, Math.ceil(row));
      }
      table = Math.max(table, Math.ceil(measure(n.name, "table") + 2 * s("3") + 2 * tk.hair));
      continue;
    }
    const pad = n.shape === "terminal" ? 2 * s("5") : 2 * s("3");
    let widest = 0;
    for (const w of words(n.name)) widest = Math.max(widest, measure(w, n.shape === "decision" ? "name-500" : "name"));
    if (m.type !== "data-flow") for (const w of words(n.kind)) widest = Math.max(widest, measure(w, "mono"));
    for (const w of words(n.detail)) widest = Math.max(widest, measure(w, n.mono ? "mono" : "sans"));
    const need = n.shape === "decision" ? widest / 0.62 : widest + pad + 2 * tk.hair;
    track = Math.max(track, Math.ceil(need));
  }
  const n = columnCount(m);
  let least: number;
  if (m.type === "data-flow") least = tk.lane + n * (track + s("12"));
  else if (m.type === "schema") least = n * table + (n - 1) * s("12");
  else if (m.type === "sequence") least = n * tk.node + (n - 1) * s("5");
  else least = n * track + (n - 1) * s("16") + groupReach(m) * s("4");
  return { track, table, least: Math.max(tk.wide, least) };
}

// ---- Snapping: a 1px line on half pixels, a 2px line on whole ones, in the page's own pixel grid ----

function snapper(ox: number, oy: number) {
  return {
    x: (v: number, w: number) => (w % 2 === 1 ? Math.round(v + ox - 0.5) + 0.5 - ox : Math.round(v + ox) - ox),
    y: (v: number, w: number) => (w % 2 === 1 ? Math.round(v + oy - 0.5) + 0.5 - oy : Math.round(v + oy) - oy),
  };
}

/** A route's last segment's direction, and the line ended on its contour. */
function finish(pts: Pt[]): Dir {
  const a = pts[pts.length - 2]!, b = pts[pts.length - 1]!;
  if (Math.abs(a.x - b.x) < 0.01) return b.y > a.y ? "down" : "up";
  return b.x > a.x ? "right" : "left";
}

/** Snaps every horizontal run's y and vertical run's x, keeping the ends on their axis. */
function snapRoute(pts: Pt[], w: number, sn: ReturnType<typeof snapper>): Pt[] {
  const q = pts.map((p) => ({ ...p }));
  for (let k = 1; k < q.length; k++) {
    const a = q[k - 1]!, b = q[k]!;
    if (Math.abs(a.x - b.x) < 0.75) { const x = sn.x(a.x, w); a.x = x; b.x = x; }
    else if (Math.abs(a.y - b.y) < 0.75) { const y = sn.y(a.y, w); a.y = y; b.y = y; }
  }
  // Drop points that no longer turn.
  const out: Pt[] = [q[0]!];
  for (let k = 1; k < q.length; k++) {
    const p = q[k]!, last = out[out.length - 1]!;
    if (Math.abs(p.x - last.x) < 0.01 && Math.abs(p.y - last.y) < 0.01) continue;
    if (out.length >= 2) {
      const prev = out[out.length - 2]!;
      const straight = (Math.abs(prev.x - last.x) < 0.01 && Math.abs(last.x - p.x) < 0.01) || (Math.abs(prev.y - last.y) < 0.01 && Math.abs(last.y - p.y) < 0.01);
      if (straight) { out[out.length - 1] = p; continue; }
    }
    out.push(p);
  }
  return out;
}

const segmentsOf = (pts: Pt[]) => pts.slice(1).map((p, k) => [pts[k]!, p] as const);

function findCrossings(lines: GLine[], lit?: (line: GLine) => boolean): GCross[] {
  const out: GCross[] = [];
  const e = 0.75;
  for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
    const A = lines[a]!, B = lines[b]!;
    for (const [p1, p2] of segmentsOf(A.pts)) for (const [q1, q2] of segmentsOf(B.pts)) {
      const aH = Math.abs(p1.y - p2.y) < 0.01, bH = Math.abs(q1.y - q2.y) < 0.01;
      if (aH === bH) continue;
      const [h1, h2, v1, v2] = aH ? [p1, p2, q1, q2] : [q1, q2, p1, p2];
      const x = v1.x, y = h1.y;
      if (x > Math.min(h1.x, h2.x) + e && x < Math.max(h1.x, h2.x) - e && y > Math.min(v1.y, v2.y) + e && y < Math.max(v1.y, v2.y) - e) {
        const hLine = aH ? a : b, vLine = aH ? b : a;
        // The horizontal run is on top; a traced line is on top of an untraced one.
        let top = hLine, under = vLine;
        if (lit) { const lh = lit(lines[hLine]!), lv = lit(lines[vLine]!); if (lv && !lh) { top = vLine; under = hLine; } }
        out.push({ top, under, at: { x, y }, underVertical: under === vLine });
      }
    }
  }
  return out;
}

// ---- The drawn layout (1.6) ----

interface Grid { cols: Array<[number, number]>; rows: Array<[number, number]> }
function readGrid(drawing: HTMLElement): Grid {
  const cs = getComputedStyle(drawing);
  const list = (v: string) => v.split(/\s+/).map(parseFloat).filter((x) => Number.isFinite(x));
  const tracks = (sizes: number[], start: number, gap: number) => { const out: Array<[number, number]> = []; let x = start; for (const s of sizes) { out.push([x, x + s]); x += s + gap; } return out; };
  return {
    cols: tracks(list(cs.gridTemplateColumns), parseFloat(cs.paddingLeft) || 0, parseFloat(cs.columnGap) || 0),
    rows: tracks(list(cs.gridTemplateRows), parseFloat(cs.paddingTop) || 0, parseFloat(cs.rowGap) || 0),
  };
}

const isH = (s: DiagramSide) => s === "left" || s === "right";
const opposite: Record<DiagramSide, DiagramSide> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function defaultSides(a: MNode, b: MNode): [DiagramSide, DiagramSide] {
  if (a.row === b.row) return b.col > a.col ? ["right", "left"] : ["left", "right"];
  if (a.col === b.col) return b.row > a.row ? ["bottom", "top"] : ["top", "bottom"];
  return [b.col > a.col ? "right" : "left", b.row > a.row ? "top" : "bottom"];
}

interface Port { edge: number; end: "from" | "to"; node: MNode; side: DiagramSide; far: MNode; straight: boolean; f: number }

/** Slots on a side (1.6): one line at the middle; a straight line keeps it and the others take the quarter nearer their far end; two at the quarters; three at quarter, middle, quarter. */
function assignSlots(m: Model, sides: Array<[DiagramSide, DiagramSide]>, warn: (s: string) => void): Port[] {
  const ports: Port[] = [];
  m.edges.forEach((e, k) => {
    const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
    const [s1, s2] = sides[k]!;
    const straight = (a.row === b.row && isH(s1) && isH(s2) && s1 === opposite[s2]) || (a.col === b.col && !isH(s1) && !isH(s2) && s1 === opposite[s2]);
    ports.push({ edge: k, end: "from", node: a, side: s1, far: b, straight, f: 0.5 }, { edge: k, end: "to", node: b, side: s2, far: a, straight, f: 0.5 });
  });
  const bySide = new Map<string, Port[]>();
  for (const p of ports) { const key = `${p.node.id}.${p.side}`; if (!bySide.has(key)) bySide.set(key, []); bySide.get(key)!.push(p); }
  for (const [key, list] of bySide) {
    if (list[0]!.node.shape === "decision") continue; // a decision's lines leave its four points
    const along = (p: Port) => (isH(p.side) ? p.far.row - p.node.row : p.far.col - p.node.col);
    const straight = list.filter((p) => p.straight), rest = list.filter((p) => !p.straight);
    // Nested: the line whose far end is farther along takes the slot nearer that way.
    rest.sort((x, y) => along(x) - along(y) || (isH(x.side) ? x.far.col - y.far.col : x.far.row - y.far.row) * (along(x) < 0 ? 1 : -1));
    if (list.length > 3) warn(`${key.replace(".", " has ")} has ${list.length} lines on one side; more than three is an error: use another side`);
    if (straight.length) rest.forEach((p) => { p.f = along(p) < 0 ? 0.25 : 0.75; });
    else if (rest.length === 2) { rest[0]!.f = 0.25; rest[1]!.f = 0.75; }
    else if (rest.length === 3) { rest[0]!.f = 0.25; rest[1]!.f = 0.5; rest[2]!.f = 0.75; }
    else if (rest.length > 3) rest.forEach((p, j) => { p.f = (j + 1) / (rest.length + 1); });
  }
  return ports;
}

/** The derived ports of a drawn layout (1.6), for the derivation table: each line's sides and its slot on each (a fraction along the side). */
export function derivedPorts(m: Model): Array<{ from: string; to: string; fromSide: DiagramSide; toSide: DiagramSide; fromSlot: number; toSlot: number }> {
  const sides = m.edges.map((e) => { const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!; const [d1, d2] = defaultSides(a, b); return [e.fromSide ?? d1, e.toSide ?? d2] as [DiagramSide, DiagramSide]; });
  const ports = assignSlots(m, sides, () => {});
  return m.edges.map((e, k) => ({ from: e.from, to: e.to, fromSide: sides[k]![0], toSide: sides[k]![1], fromSlot: ports.find((p) => p.edge === k && p.end === "from")!.f, toSlot: ports.find((p) => p.edge === k && p.end === "to")!.f }));
}

function portPoint(n: GNode, side: DiagramSide, f: number): Pt {
  const { l, t, r, b } = n.rect;
  return isH(side) ? contour(n, side, t + (b - t) * f) : contour(n, side, l + (r - l) * f);
}

interface DrawnInput { m: Model; tk: Tokens; P: string; drawing: HTMLElement; origin: DOMRect; warn: (s: string) => void }

function gNodes(m: Model, drawing: HTMLElement, origin: DOMRect, P: string): Map<string, GNode> {
  const out = new Map<string, GNode>();
  drawing.querySelectorAll<HTMLElement>(`.${P}-node`).forEach((el) => {
    const n = m.byId.get(el.dataset.node!);
    if (n) out.set(n.id, { id: n.id, rect: rectOf(el, origin), shape: n.shape, i: n.i });
  });
  return out;
}

interface Obstacles { rects: Rect[]; heads: Rect[] }

function headBox(line: GLine, tk: Tokens): Rect {
  const L = tk.head, W = tk.head / 2, { x, y } = line.tip;
  if (line.dir === "down") return { l: x - W, r: x + W, t: y - L, b: y };
  if (line.dir === "up") return { l: x - W, r: x + W, t: y, b: y + L };
  if (line.dir === "right") return { l: x - L, r: x, t: y - W, b: y + W };
  return { l: x, r: x + L, t: y - W, b: y + W };
}

const segRect = (a: Pt, b: Pt, w: number): Rect => ({ l: Math.min(a.x, b.x) - w / 2, r: Math.max(a.x, b.x) + w / 2, t: Math.min(a.y, b.y) - w / 2, b: Math.max(a.y, b.y) + w / 2 });

/** Seats labels by 1.8: runs longest first, their clear shaft's middle then thirds; on the line, above, below (or beside). */
function seatLabels(m: Model, lines: GLine[], nodes: GNode[], obstacles: Obstacles, groups: Rect[], bounds: Rect, tk: Tokens, measure: ReturnType<typeof ruler>): { labels: GLabel[]; unseated: number[] } {
  const s = tk.space;
  const placed: Rect[] = [];
  const labels: GLabel[] = [];
  const unseated: number[] = [];
  const GROW = s("1");
  const order = lines.filter((l) => m.edges[l.i]?.label).sort((a, b) => Number(m.edges[b.i]!.kind === "main") - Number(m.edges[a.i]!.kind === "main") || a.i - b.i);
  for (const line of order) {
    const text = m.edges[line.i]!.label!;
    const w = measure(text, "label"), hgt = 16;
    const last = line.pts.length - 2;
    const runs: Array<{ horiz: boolean; c: number; p: number; q: number; len: number; pri: number }> = [];
    segmentsOf(line.pts).forEach(([a, b], k) => {
      const horiz = Math.abs(a.y - b.y) < 0.01;
      const s0 = horiz ? a.x : a.y;
      let t0 = horiz ? b.x : b.y;
      const dir = Math.sign(t0 - s0) || 1;
      if (k === last) t0 -= dir * tk.head; // the clear shaft: the run without the head
      let parts: Array<[number, number]> = [[s0, t0]];
      for (const g of groups) for (const edgeAt of horiz ? [g.l, g.r] : [g.t, g.b]) {
        const c = horiz ? a.y : a.x;
        const within = horiz ? c > g.t && c < g.b : c > g.l && c < g.r;
        if (!within) continue;
        parts = parts.flatMap(([p, q]) => (edgeAt > Math.min(p, q) + 1 && edgeAt < Math.max(p, q) - 1 ? [[p, edgeAt], [edgeAt, q]] as Array<[number, number]> : [[p, q]] as Array<[number, number]>));
      }
      const outside = (p: number, q: number) => { const mid = (p + q) / 2; const pt = horiz ? { x: mid, y: a.y } : { x: a.x, y: mid }; return !groups.some((g) => pt.x > g.l && pt.x < g.r && pt.y > g.t && pt.y < g.b); };
      for (const [p, q] of parts) runs.push({ horiz, c: horiz ? a.y : a.x, p, q, len: Math.abs(q - p), pri: parts.length > 1 && outside(p, q) ? 1 : 0 });
    });
    runs.sort((x, y) => y.pri - x.pri || y.len - x.len);
    let chosen: { box: Rect; on: boolean } | null = null;
    const clear = (box: Rect) => {
      const G = grow(box, GROW);
      if (box.l < bounds.l || box.r > bounds.r || box.t < bounds.t || box.b > bounds.b) return false;
      if (nodes.some((n) => boxHitsShape(G, n))) return false;
      if (placed.some((p) => hit(G, p))) return false;
      if (obstacles.heads.some((h0) => hit(G, h0))) return false;
      if (obstacles.rects.some((r) => hit(G, r))) return false;
      return !lines.some((o) => o.i !== line.i && segmentsOf(o.pts).some(([a, b]) => hit(G, segRect(a, b, o.width))));
    };
    for (const run of runs) {
      for (const f of [1 / 2, 1 / 3, 2 / 3]) {
        const mid = run.p + (run.q - run.p) * f;
        const cands: Array<{ box: Rect; on: boolean }> = [];
        const off = s("2") + line.width / 2;
        if (run.horiz) {
          if (run.len >= w + 2 * s("1") + s("3-5")) cands.push({ box: { l: mid - w / 2 - s("1"), r: mid + w / 2 + s("1"), t: run.c - hgt / 2, b: run.c + hgt / 2 }, on: true });
          cands.push({ box: { l: mid - w / 2, r: mid + w / 2, t: run.c - off - hgt, b: run.c - off }, on: false });
          cands.push({ box: { l: mid - w / 2, r: mid + w / 2, t: run.c + off, b: run.c + off + hgt }, on: false });
        } else {
          if (run.len >= hgt + s("3")) cands.push({ box: { l: run.c - w / 2 - s("1"), r: run.c + w / 2 + s("1"), t: mid - hgt / 2, b: mid + hgt / 2 }, on: true });
          cands.push({ box: { l: run.c + off, r: run.c + off + w, t: mid - hgt / 2, b: mid + hgt / 2 }, on: false });
          cands.push({ box: { l: run.c - off - w, r: run.c - off, t: mid - hgt / 2, b: mid + hgt / 2 }, on: false });
        }
        chosen = cands.find((c) => clear(c.box)) ?? null;
        if (chosen) break;
      }
      if (chosen) break;
    }
    if (!chosen) { unseated.push(line.i); continue; }
    placed.push(chosen.box);
    labels.push({ i: line.i, text, box: chosen.box, on: chosen.on });
  }
  return { labels, unseated };
}

function obstaclesOf(drawing: HTMLElement, origin: DOMRect, P: string, rowGap: number): { obstacles: Obstacles; groups: Rect[] } {
  const rects: Rect[] = [];
  const groups: Rect[] = [];
  drawing.querySelectorAll<HTMLElement>(`.${P}-gbox, .${P}-group`).forEach((el) => {
    if (el.getClientRects().length === 0 || getComputedStyle(el).display === "contents") return;
    const g = rectOf(el, origin);
    groups.push(g);
    rects.push({ l: g.l, r: g.r, t: g.t, b: g.t + 1 }, { l: g.l, r: g.r, t: g.b - 1, b: g.b }, { l: g.l, r: g.l + 1, t: g.t, b: g.b }, { l: g.r - 1, r: g.r, t: g.t, b: g.b });
    const label = el.querySelector(`:scope > .${P}-glabel`);
    if (label && label.getClientRects().length) rects.push(rectOf(label, origin));
  });
  drawing.querySelectorAll<HTMLElement>(`.${P}-lane`).forEach((el, k) => {
    if (!el.getClientRects().length) return;
    const lane = rectOf(el, origin);
    if (k > 0) rects.push({ l: lane.l, r: lane.r, t: lane.t - rowGap / 2 - 0.5, b: lane.t - rowGap / 2 + 0.5 });
    const name = el.querySelector(`.${P}-lane-name`);
    if (name) rects.push(rectOf(name, origin));
  });
  return { obstacles: { rects, heads: [] }, groups };
}

function drawnGeometry(input: DrawnInput, measure: ReturnType<typeof ruler>): Geo {
  const { m, tk, P, drawing, origin, warn } = input;
  const s = tk.space;
  const map = gNodes(m, drawing, origin, P);
  const nodes = [...map.values()];
  const grid = readGrid(drawing);
  const ox = origin.left - Math.floor(origin.left), oy = origin.top - Math.floor(origin.top);
  const sn = snapper(ox, oy);
  const W = drawing.clientWidth, H = drawing.clientHeight;
  const trackOf = (n: MNode) => (m.type === "data-flow" ? n.col + 1 : n.col);
  const rowGap = parseFloat(getComputedStyle(drawing).rowGap) || 0;
  const geo: Geo = { w: W, h: H, nodes, lines: [], lifelines: [], labels: [], crossings: [], through: [], unseated: [], ox, oy };

  if (m.type === "sequence") return sequenceGeometry(input, geo, sn);

  // Sides and slots.
  let sides: Array<[DiagramSide, DiagramSide]>;
  let ports: Port[] = [];
  if (m.type === "schema") {
    sides = m.edges.map((e) => {
      const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
      if (a.col === b.col) { const side: DiagramSide = a.col === m.cols ? "left" : "right"; return [side, side]; }
      return b.col > a.col ? ["right", "left"] : ["left", "right"];
    });
  } else {
    sides = m.edges.map((e) => { const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!; const [d1, d2] = defaultSides(a, b); return [e.fromSide ?? d1, e.toSide ?? d2]; });
    ports = assignSlots(m, sides, warn);
  }

  // End points.
  const rowY = (id: string, row: number) => {
    const el = drawing.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(id)}"] .${P}-row[data-row="${row}"]`);
    if (!el) return 0;
    const r = rectOf(el, origin);
    return (r.t + r.b) / 2;
  };
  const ends = m.edges.map((e, k) => {
    const [s1, s2] = sides[k]!;
    const a = map.get(e.from)!, b = map.get(e.to)!;
    const w = strokeOf(e.kind, tk);
    if (e.fk) {
      const y1 = sn.y(rowY(e.from, e.fromRow!), w), y2 = sn.y(rowY(e.to, e.toRow!), w);
      return { p1: { x: s1 === "right" ? a.rect.r : a.rect.l, y: y1 }, p2: { x: s2 === "right" ? b.rect.r : b.rect.l, y: y2 } };
    }
    const f1 = ports.find((p) => p.edge === k && p.end === "from")!.f, f2 = ports.find((p) => p.edge === k && p.end === "to")!.f;
    let p1 = portPoint(a, s1, f1), p2 = portPoint(b, s2, f2);
    // Snap the axis the line leaves and enters on; a straight line shares one.
    if (isH(s1)) p1 = { ...p1, y: sn.y(p1.y, w) }; else p1 = { ...p1, x: sn.x(p1.x, w) };
    if (isH(s2)) p2 = { ...p2, y: sn.y(p2.y, w) }; else p2 = { ...p2, x: sn.x(p2.x, w) };
    if (isH(s1) && isH(s2) && Math.abs(p1.y - p2.y) < 1.01) p2 = { ...p2, y: p1.y };
    if (!isH(s1) && !isH(s2) && Math.abs(p1.x - p2.x) < 1.01) p2 = { ...p2, x: p1.x };
    // The end that a snap moved sits on the contour again.
    p1 = isH(s1) ? contour(a, s1, p1.y) : contour(a, s1, p1.x);
    p2 = isH(s2) ? contour(b, s2, p2.y) : contour(b, s2, p2.x);
    return { p1, p2 };
  });

  // Jogs: which gutter each two-elbow line turns in, and which lines share a lane (lines to one port, a foreign key's bus).
  const jogs = new Map<string, { span: [number, number]; vertical: boolean; members: Map<string, number[]> }>();
  m.edges.forEach((e, k) => {
    const [s1, s2] = sides[k]!;
    const { p1, p2 } = ends[k]!;
    const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
    let key: string | null = null, span: [number, number] | null = null, vertical = false;
    if (isH(s1) && isH(s2) && s1 !== s2 && Math.abs(p1.y - p2.y) > 0.5) {
      const ti = trackOf(b);
      const leftSide = s2 === "left";
      const t1 = grid.cols[(leftSide ? ti - 1 : ti) - 1], t2 = grid.cols[(leftSide ? ti : ti + 1) - 1];
      if (t1 && t2) { key = `c${leftSide ? ti - 1 : ti}`; span = [t1[1], t2[0]]; vertical = true; }
      void a;
    } else if (!isH(s1) && !isH(s2) && s1 !== s2 && Math.abs(p1.x - p2.x) > 0.5) {
      const topSide = s2 === "top";
      const ri = topSide ? b.row - 1 : b.row2;
      const r1 = grid.rows[ri - 1], r2 = grid.rows[ri];
      if (r1 && r2) { key = `r${ri}`; span = [r1[1], r2[0]]; vertical = false; }
    }
    if (!key || !span) return;
    if (!jogs.has(key)) jogs.set(key, { span, vertical, members: new Map() });
    const port = `${e.to}.${s2}.${Math.round(vertical ? p2.y : p2.x)}`;
    const g = jogs.get(key)!;
    if (!g.members.has(port)) g.members.set(port, []);
    g.members.get(port)!.push(k);
  });

  const lanes = new Map<number, number>();
  const route = (k: number): Pt[] => {
    const [s1, s2] = sides[k]!;
    const { p1, p2 } = ends[k]!;
    if (isH(s1) && isH(s2)) {
      if (s1 === s2) { const x = s1 === "right" ? Math.max(p1.x, p2.x) + s("4") : Math.min(p1.x, p2.x) - s("4"); return [p1, { x, y: p1.y }, { x, y: p2.y }, p2]; }
      if (Math.abs(p1.y - p2.y) <= 0.5) return [p1, { x: p2.x, y: p1.y }];
      const x = lanes.get(k) ?? (p1.x + p2.x) / 2;
      return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
    }
    if (!isH(s1) && !isH(s2)) {
      if (s1 === s2) { const y = s1 === "bottom" ? Math.max(p1.y, p2.y) + s("4") : Math.min(p1.y, p2.y) - s("4"); return [p1, { x: p1.x, y }, { x: p2.x, y }, p2]; }
      if (Math.abs(p1.x - p2.x) <= 0.5) return [p1, { x: p1.x, y: p2.y }];
      const y = lanes.get(k) ?? (p1.y + p2.y) / 2;
      return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
    }
    if (isH(s1)) return [p1, { x: p2.x, y: p1.y }, p2];
    return [p1, { x: p1.x, y: p2.y }, p2];
  };
  const build = (): GLine[] => m.edges.map((e, k) => {
    const w = strokeOf(e.kind, tk);
    const pts = snapRoute(route(k), w, sn);
    return { i: k, from: e.from, to: e.to, kind: e.kind, pts, tip: pts[pts.length - 1]!, dir: finish(pts), dot: e.fk ? pts[0] : undefined, width: w };
  });
  const score = (lines: GLine[]) => findCrossings(lines).length * 1000 + throughOf(lines, nodes, m).length;
  // Each gutter: its lanes evenly spaced (at least space-3 apart), in the order that crosses least.
  // Lanes are needed only where jogs run beside each other: jogs whose runs along the gutter do not overlap each take its middle.
  const runOf = (members: number[], vertical: boolean): [number, number] => {
    const ys = members.flatMap((k) => { const { p1, p2 } = ends[k]!; return vertical ? [p1.y, p2.y] : [p1.x, p2.x]; });
    return [Math.min(...ys), Math.max(...ys)];
  };
  for (const [, g] of jogs) {
    const ports = [...g.members.values()].map((members) => ({ members, run: runOf(members, g.vertical) })).sort((a, b) => a.run[0] - b.run[0]);
    const clusters: Array<typeof ports> = [];
    for (const p of ports) {
      const last = clusters[clusters.length - 1];
      // Two jogs share the middle only when a clear space-8 parts them; closer, they would read as one line.
      if (last && last.some((q) => q.run[0] < p.run[1] + s("8") && p.run[0] < q.run[1] + s("8"))) last.push(p); else clusters.push([p]);
    }
    for (const cluster of clusters) {
      const groupsOf = cluster.map((c) => c.members);
      const count = groupsOf.length;
      const step = (g.span[1] - g.span[0]) / (count + 1);
      if (step < s("3")) warn(`a gutter holds ${count} lanes side by side, closer than space-3`);
      let best: number[][] = groupsOf, bestScore = Infinity;
      for (const perm of permutations(groupsOf)) {
        perm.forEach((members, j) => members.forEach((k) => lanes.set(k, g.span[0] + step * (j + 1))));
        const sc = score(build());
        if (sc < bestScore) { bestScore = sc; best = perm; }
      }
      best.forEach((members, j) => members.forEach((k) => lanes.set(k, g.span[0] + step * (j + 1))));
    }
  }
  geo.lines = build();
  // Relations two columns apart are not drawn: the row writes its target (1.12).
  if (m.type === "schema") {
    geo.lines = geo.lines.filter((l) => {
      const a = m.byId.get(l.from)!, b = m.byId.get(l.to)!;
      if (Math.abs(a.col - b.col) > 1) { warn(`${l.from} to ${l.to} is two columns apart, so its line is not drawn; its row still writes the target`); return false; }
      return true;
    });
  }
  geo.crossings = findCrossings(geo.lines);
  geo.through = throughOf(geo.lines, nodes, m);
  const { obstacles, groups } = obstaclesOf(drawing, origin, P, rowGap);
  obstacles.heads = geo.lines.map((l) => headBox(l, tk));
  const seats = seatLabels(m, geo.lines, nodes, obstacles, groups, { l: 0, t: 0, r: W, b: H }, tk, measure);
  geo.labels = seats.labels;
  geo.unseated = seats.unseated;
  return geo;
}

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) { yield items.slice(); return; }
  if (items.length > 5) { yield items.slice(); return; }
  for (let k = 0; k < items.length; k++) {
    const rest = items.slice(0, k).concat(items.slice(k + 1));
    for (const p of permutations(rest)) yield [items[k]!, ...p];
  }
}

function throughOf(lines: GLine[], nodes: GNode[], m: Model): number[] {
  const out: number[] = [];
  for (const l of lines) {
    const segs = segmentsOf(l.pts);
    if (nodes.some((n) => segs.some(([a, b]) => segmentThrough(a, b, n)))) out.push(l.i);
  }
  void m;
  return out;
}

function sequenceGeometry(input: DrawnInput, geo: Geo, sn: ReturnType<typeof snapper>): Geo {
  const { m, tk, P, drawing, origin } = input;
  const s = tk.space;
  const heads = new Map<string, Rect>();
  drawing.querySelectorAll<HTMLElement>(`.${P}-node`).forEach((el) => heads.set(el.dataset.node!, rectOf(el, origin)));
  const steps = drawing.querySelector(`.${P}-steps`);
  const bottom = steps ? rectOf(steps, origin).b : geo.h;
  const xOf = (id: string) => { const r = heads.get(id); return r ? sn.x((r.l + r.r) / 2, tk.hair) : 0; };
  for (const n of m.nodes) { const r = heads.get(n.id); if (r) geo.lifelines.push({ x: xOf(n.id), y1: r.b, y2: bottom }); }
  const spanOf = (n: MNode) => { const r = heads.get(n.id)!; return r; };
  drawing.querySelectorAll<HTMLElement>(`.${P}-msg`).forEach((li) => {
    const from = li.dataset.from!, to = li.dataset.to!;
    const kind = (li.dataset.kind ?? "plain") as DiagramLineKind;
    const w = strokeOf(kind, tk);
    const r = rectOf(li, origin);
    const y = sn.y((r.t + r.b) / 2, w);
    const num = Number(li.querySelector(`.${P}-num`)?.textContent ?? 0);
    const x1 = xOf(from), x2 = xOf(to);
    let pts: Pt[];
    if (from === to) {
      const out = li.dataset.self === "start" ? -s("6") : s("6");
      const yt = sn.y(y - s("2"), w), yb = sn.y(y + s("2"), w);
      pts = [{ x: x1, y: yt }, { x: sn.x(x1 + out, w), y: yt }, { x: sn.x(x1 + out, w), y: yb }, { x: x1, y: yb }];
    } else pts = [{ x: x1, y }, { x: x2, y }];
    geo.lines.push({ i: num, from, to, kind, pts, tip: pts[pts.length - 1]!, dir: finish(pts), width: w });
    // Every label and note fits between the lifelines it spans, space-2 clear each side (1.11, rule 3).
    const said = li.querySelector(`.${P}-said`), note = li.querySelector(`.${P}-note`);
    const a = m.byId.get(from), b = m.byId.get(to);
    if (!a || !b) return;
    const room = from === to
      ? (() => { const next = m.nodes[a.i + (li.dataset.self === "start" ? -1 : 1)]; const limit = next ? xOf(next.id) : li.dataset.self === "start" ? 0 : geo.w; return Math.abs(limit - x1) - s("6") - s("2-5") - s("2"); })()
      : Math.abs(x2 - x1) - 2 * s("2");
    const need = Math.max(said ? said.getBoundingClientRect().width : 0, note ? note.getBoundingClientRect().width : 0);
    if (need > room + 0.5) geo.unseated.push(num);
    void spanOf;
  });
  return geo;
}

// ---- The stacked drawing (1.13) ----

function stackedGeometry(input: DrawnInput, measure: ReturnType<typeof ruler>, plan: StackPlan): { geo: Geo; grow: Record<string, number> } {
  const { m, tk, P, drawing, origin, warn } = input;
  const s = tk.space;
  const map = gNodes(m, drawing, origin, P);
  const nodes = [...map.values()];
  const ox = origin.left - Math.floor(origin.left), oy = origin.top - Math.floor(origin.top);
  const sn = snapper(ox, oy);
  const W = drawing.clientWidth, H = drawing.clientHeight;
  const geo: Geo = { w: W, h: H, nodes, lines: [], lifelines: [], labels: [], crossings: [], through: [], unseated: [], ox, oy };
  const growBy: Record<string, number> = {};
  if (m.type === "sequence" || m.type === "schema") return { geo, grow: growBy };
  // The right edge a spine card has where each card sits (the group's inside, or the drawing's less the gutter).
  const columnRight = new Map<string, number>();
  drawing.querySelectorAll<HTMLElement>(`.${P}-node`).forEach((el) => {
    const parent = el.parentElement!;
    const pr = rectOf(parent, origin);
    const cs = getComputedStyle(parent);
    columnRight.set(el.dataset.node!, pr.r - (parseFloat(cs.paddingRight) || 0) - (parseFloat(cs.borderRightWidth) || 0));
  });
  const order = m.nodes;
  const card = (i: number) => map.get(order[i]!.id)!;
  const labelSeats: Array<{ k: number; box: Rect; on: boolean; card: string }> = [];
  const lineW = (k: number) => strokeOf(m.edges[k]!.kind, tk);
  m.edges.forEach((e, k) => {
    const r = plan.routes[k]!;
    const a = map.get(e.from)!, b = map.get(e.to)!;
    const w = lineW(k);
    let pts: Pt[] = [];
    const label = e.label;
    const lw = label ? measure(label, "label") : 0;
    const lh = 16;
    const turn = s("4");
    if (r === "down" || r === "up") {
      const lo = Math.max(a.rect.l, b.rect.l), hi = Math.min(a.rect.r, b.rect.r);
      const x = sn.x((lo + hi) / 2, w);
      pts = r === "down" ? [contour(a, "bottom", x), contour(b, "top", x)] : [contour(a, "top", x), contour(b, "bottom", x)];
      if (label) {
        // Centred on the stem's clear shaft, with a plate; a stem split by a group's boundary takes its outside part.
        let y1 = Math.min(pts[0]!.y, pts[1]!.y), y2 = Math.max(pts[0]!.y, pts[1]!.y);
        if (r === "down") y2 -= tk.head; else y1 += tk.head;
        const boxes = [...drawing.querySelectorAll<HTMLElement>(`.${P}-group`)].map((g) => rectOf(g, origin));
        let parts: Array<[number, number]> = [[y1, y2]];
        for (const g of boxes) for (const at of [g.t, g.b]) parts = parts.flatMap(([p, q]) => (at > p + 1 && at < q - 1 ? [[p, at], [at, q]] as Array<[number, number]> : [[p, q]] as Array<[number, number]>));
        const inside = (p: number, q: number) => boxes.some((g) => (p + q) / 2 > g.t && (p + q) / 2 < g.b && x > g.l && x < g.r);
        if (parts.length > 1) {
          const outer = parts.filter(([p, q]) => !inside(p, q));
          const pick = (outer.length ? outer : parts).reduce((best, part) => (part[1] - part[0] > best[1] - best[0] ? part : best));
          [y1, y2] = pick;
        }
        const cy = (y1 + y2) / 2;
        labelSeats.push({ k, box: { l: x - lw / 2 - s("1"), r: x + lw / 2 + s("1"), t: cy - lh / 2, b: cy + lh / 2 }, on: true, card: r === "down" ? e.to : e.from });
      }
    } else if (r === "trunk" || r === "rail") {
      const x = sn.x(Math.max(a.rect.l, r === "rail" ? b.rect.l : a.rect.l) + (r === "trunk" ? s("8") : s("3")), w);
      const start = contour(a, "bottom", x);
      if (r === "rail") {
        pts = [start, contour(b, "top", x)];
        if (label) { const cy = b.rect.t - s("6"); labelSeats.push({ k, box: { l: x + s("2-5"), r: x + s("2-5") + lw, t: cy - lh / 2, b: cy + lh / 2 }, on: false, card: e.to }); }
      } else {
        const ex = sn.x(b.rect.l + s("6"), w);
        const ty = sn.y(b.rect.t - turn, w);
        pts = [start, { x, y: ty }, { x: ex, y: ty }, contour(b, "top", ex)];
        if (label) labelSeats.push({ k, box: { l: ex + s("2-5"), r: ex + s("2-5") + lw, t: ty - lh / 2, b: ty + lh / 2 }, on: false, card: e.to });
      }
    } else {
      // An end line: out the end side, along the end lane or the gutter, into the card's top (down) or bottom (up), space-6 in from its end edge.
      const right = Math.min(columnRight.get(e.from) ?? W, columnRight.get(e.to) ?? W);
      const laneX = sn.x(plan.gutter ? right + (plan.lanes[k] ? 2 * s("3-5") : s("3-5")) : right - s("2-5"), w);
      const yExit = sn.y(a.rect.t + (a.rect.b - a.rect.t) * plan.exits[k]!, w);
      const exit = contour(a, "right", yExit);
      const ex = sn.x(b.rect.r - s("6"), w);
      const down = r === "end-down";
      const ty = sn.y(down ? b.rect.t - turn : b.rect.b + turn, w);
      pts = [exit, { x: laneX, y: exit.y }, { x: laneX, y: ty }, { x: ex, y: ty }, contour(b, down ? "top" : "bottom", ex)];
      if (label) labelSeats.push({ k, box: { l: ex - s("2-5") - lw, r: ex - s("2-5"), t: ty - lh / 2, b: ty + lh / 2 }, on: false, card: down ? e.to : order[b.i + 1]?.id ?? e.to });
    }
    const snapped = snapRoute(pts, w, sn);
    geo.lines.push({ i: k, from: e.from, to: e.to, kind: e.kind, pts: snapped, tip: snapped[snapped.length - 1]!, dir: finish(snapped), width: w });
  });
  geo.crossings = findCrossings(geo.lines);
  geo.through = throughOf(geo.lines, nodes, m);
  // Fixed seats, checked: a label that does not fit takes a line of its own above its card, and the gap grows 16.
  const { obstacles, groups } = obstaclesOf(drawing, origin, P, 0);
  obstacles.heads = geo.lines.map((l) => headBox(l, tk));
  const placed: Rect[] = [];
  const bounds = { l: 0, t: 0, r: W, b: H };
  for (const seat of labelSeats) {
    const line = geo.lines.find((l) => l.i === seat.k)!;
    const G = grow(seat.box, s("1"));
    const ownHead = headBox(line, tk);
    const bad = seat.box.l < bounds.l - 0.5 || seat.box.r > bounds.r + 0.5
      || nodes.some((n) => boxHitsShape(G, n))
      || placed.some((p) => hit(G, p))
      || obstacles.heads.some((h0) => h0 !== ownHead && hit(G, h0))
      || obstacles.rects.some((r) => hit(G, r))
      || geo.lines.some((o) => o.i !== seat.k && segmentsOf(o.pts).some(([a, b]) => hit(G, segRect(a, b, o.width))));
    if (bad) { growBy[seat.card] = (growBy[seat.card] ?? 0) + 1; geo.unseated.push(seat.k); }
    placed.push(seat.box);
    geo.labels.push({ i: seat.k, text: m.edges[seat.k]!.label!, box: seat.box, on: seat.on });
  }
  void groups;
  if (plan.third) warn("three end lines overlap in the stacked drawing; two lanes is the most (use the drawn layout or reorder)");
  return { geo, grow: growBy };
}

// ---- The ink: one string of SVG and labels, the same in React and in the skill ----

function pathD(pts: Pt[], radius: number): string {
  const f = (n: number) => String(Math.round(n * 100) / 100);
  let d = `M${f(pts[0]!.x)} ${f(pts[0]!.y)}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const a = pts[k - 1]!, b = pts[k]!, c = pts[k + 1]!;
    const d1 = Math.hypot(b.x - a.x, b.y - a.y), d2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    if (r < 0.5) { d += `L${f(b.x)} ${f(b.y)}`; continue; }
    const p0 = { x: b.x + ((a.x - b.x) / d1) * r, y: b.y + ((a.y - b.y) / d1) * r };
    const p3 = { x: b.x + ((c.x - b.x) / d2) * r, y: b.y + ((c.y - b.y) / d2) * r };
    d += `L${f(p0.x)} ${f(p0.y)}Q${f(b.x)} ${f(b.y)} ${f(p3.x)} ${f(p3.y)}`;
  }
  const z = pts[pts.length - 1]!;
  return `${d}L${f(z.x)} ${f(z.y)}`;
}

const unit: Record<Dir, Pt> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

function lineMarkup(P: string, l: GLine, tk: Tokens, maskId: string | null, radius: number): string {
  const u = unit[l.dir];
  const open = l.kind === "dashed";
  const L = tk.head, W2 = tk.head / 2;
  // The head's tip touches the contour; the line stops under the head (an open head's shaft runs on into it).
  const stop = open ? 1 : L - 1;
  const pts = l.pts.map((p) => ({ ...p }));
  const last = pts[pts.length - 1]!;
  last.x -= u.x * stop; last.y -= u.y * stop;
  const bx = l.tip.x - u.x * L, by = l.tip.y - u.y * L;
  const px = -u.y * W2, py = u.x * W2;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const head = open
    ? `<path class="${P}-tip" data-kind="${l.kind}" data-open="" d="M${r2(bx + px)} ${r2(by + py)}L${r2(l.tip.x)} ${r2(l.tip.y)}L${r2(bx - px)} ${r2(by - py)}"/>`
    : `<path class="${P}-tip" data-kind="${l.kind}" d="M${r2(l.tip.x)} ${r2(l.tip.y)}L${r2(bx + px)} ${r2(by + py)}L${r2(bx - px)} ${r2(by - py)}Z"/>`;
  const dot = l.dot ? `<circle class="${P}-dot" cx="${r2(l.dot.x)}" cy="${r2(l.dot.y)}" r="${tk.dot / 2}"/>` : "";
  return `<g class="${P}-edge" data-edge="${l.i}" data-from="${escapeHtml(l.from)}" data-to="${escapeHtml(l.to)}"><path class="${P}-line" data-kind="${l.kind}" d="${pathD(pts, radius)}"${maskId ? ` mask="url(#${maskId})"` : ""}/>${head}${dot}</g>`;
}

function masksMarkup(P: string, geo: Geo, tk: Tokens, base: string): { defs: string; ids: Map<number, string> } {
  const ids = new Map<number, string>();
  const byLine = new Map<number, GCross[]>();
  for (const c of geo.crossings) { if (!byLine.has(c.under)) byLine.set(c.under, []); byLine.get(c.under)!.push(c); }
  let defs = "";
  for (const [k, list] of byLine) {
    const id = `${base}-cut-${k}`;
    ids.set(k, id);
    const holes = list.map((c) => {
      const top = geo.lines[c.top]!, under = geo.lines[c.under]!;
      const across = top.width / 2 + tk.cut, beside = under.width / 2 + 1;
      return c.underVertical
        ? `<rect x="${c.at.x - beside}" y="${c.at.y - across}" width="${2 * beside}" height="${2 * across}" fill="black"/>`
        : `<rect x="${c.at.x - across}" y="${c.at.y - beside}" width="${2 * across}" height="${2 * beside}" fill="black"/>`;
    }).join("");
    defs += `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${geo.w}" height="${geo.h}"><rect x="0" y="0" width="${geo.w}" height="${geo.h}" fill="white"/>${holes}</mask>`;
  }
  void P;
  return { defs, ids };
}

/** The drawing's ink: the SVG (lines, heads, dots, lifelines, cuts) and the labels, as one string. */
export function inkHtml(P: string, geo: Geo, tk: Tokens, base: string): string {
  const { defs, ids } = masksMarkup(P, geo, tk, base);
  const lifelines = geo.lifelines.map((l) => `<path class="${P}-life" d="M${l.x} ${l.y1}V${l.y2}"/>`).join("");
  const lines = geo.lines.map((l, k) => lineMarkup(P, l, tk, ids.get(k) ?? null, l.from === l.to ? tk.radiusXs : tk.radius)).join("");
  const svg = `<svg class="${P}-svg" width="${geo.w}" height="${geo.h}" viewBox="0 0 ${geo.w} ${geo.h}" focusable="false">${defs ? `<defs>${defs}</defs>` : ""}${lifelines}<g class="${P}-edges">${lines}</g></svg>`;
  const labels = geo.labels.map((l) => `<span class="${P}-label" data-edge="${l.i}"${l.on ? ' data-on=""' : ""} style="left:${Math.round(l.box.l * 100) / 100}px;top:${Math.round(l.box.t * 100) / 100}px;width:${Math.round((l.box.r - l.box.l) * 100) / 100}px">${escapeHtml(l.text)}</span>`).join("");
  return svg + labels;
}

// ---- Laying a figure out ----

export interface Measured { dyn: Dyn; geo: Geo | null; ink: string; tokens: Tokens | null }

/**
 * Measures the figure and settles its layout (1.11): the drawn layout when the figure is at least 640 wide, every track holds its widest
 * word, every label seats and no line passes through a node; otherwise the stack. `apply` writes a state into the DOM (the same markup the
 * tree gives for it), so each try is measured as it would be drawn.
 */
export function measureFigure(fig: HTMLElement, m: Model, P: string, base: string, current: Dyn, apply: (dyn: Dyn) => void, warn: (s: string) => void): Measured {
  const drawing = fig.querySelector<HTMLElement>(`.${P}-drawing`);
  if (!drawing) return { dyn: current, geo: null, ink: "", tokens: null };
  const tk = readTokens(fig);
  const measure = ruler(drawing, P);
  const mins = minimums(m, tk, measure);
  const W = fig.clientWidth;
  const focusedId = (() => { const a = document.activeElement as HTMLElement | null; return a && drawing.contains(a) && a.dataset.node ? a.dataset.node : undefined; })();
  const stopOf = (d: Dyn): Dyn => {
    if (!hasStops(m, d)) return { ...d, stop: d.stop ?? m.nodes[0]?.id, keep: focusedId && !(d.layout === "drawn") ? focusedId : undefined };
    return { ...d, stop: d.stop && m.byId.has(d.stop) ? d.stop : m.nodes[0]?.id, keep: undefined };
  };
  const heightsFor = (d: Dyn): Dyn => {
    if (m.type !== "flowchart") return d;
    apply({ ...d, heights: undefined });
    const heights: Record<string, number> = {};
    drawing.querySelectorAll<HTMLElement>(`.${P}-node[data-shape="decision"]`).forEach((el) => {
      const words = el.querySelector(`.${P}-words`);
      if (!words) return;
      const nr = el.getBoundingClientRect(), wr = words.getBoundingClientRect();
      const box = { w: wr.width + 2 * tk.space("2-5"), h: wr.height + 2 * tk.space("2") };
      const a = nr.width / 2;
      const denom = 1 - box.w / 2 / a;
      const half = denom > 0.05 ? box.h / 2 / denom : box.h * 10;
      heights[el.dataset.node!] = Math.max(tk.space("16"), Math.ceil(nr.width / 5), Math.ceil(2 * half));
    });
    return { ...d, heights };
  };
  const input = (): DrawnInput => ({ m, tk, P, drawing, origin: drawing.getBoundingClientRect(), warn });
  if (W >= mins.least) {
    let d = stopOf({ ...current, layout: "drawn", grow: undefined, track: undefined });
    d = heightsFor(d);
    apply(d);
    const geo = drawnGeometry(input(), measure);
    if (!geo.through.length && !geo.unseated.length) {
      if (geo.crossings.length) warn(`${geo.crossings.length} crossing${geo.crossings.length === 1 ? "" : "s"} in the drawn layout: ${geo.crossings.map((c) => `${lineName(m, geo.lines[c.top]!)} over ${lineName(m, geo.lines[c.under]!)}`).join("; ")}`);
      return { dyn: d, geo, ink: inkHtml(P, geo, tk, base), tokens: tk };
    }
    // At a width the figure should fit by its tokens and words, a failure is the author's to fix.
    if (geo.through.length) warn(`the drawn layout does not fit at ${Math.round(W)}px: ${geo.through.map((k) => lineName(m, geo.lines.find((l) => l.i === k)!)).join(", ")} would pass through a node`);
    if (geo.unseated.length) warn(`the drawn layout does not fit at ${Math.round(W)}px: no clean seat for ${geo.unseated.map((k) => (m.type === "sequence" ? `message ${k}` : `"${m.edges[k]?.label}"`)).join(", ")}`);
  }
  let d = stopOf({ ...current, layout: "stacked", heights: undefined, grow: {}, track: m.type === "schema" ? mins.table : undefined });
  d = heightsFor(d);
  apply(d);
  if (m.type === "sequence" || m.type === "schema") return { dyn: d, geo: null, ink: "", tokens: tk };
  const plan = stackPlan(m);
  let out = stackedGeometry(input(), measure, plan);
  for (let tries = 0; tries < 6 && Object.keys(out.grow).length; tries++) {
    const grown = { ...(d.grow ?? {}) };
    for (const [id, n] of Object.entries(out.grow)) grown[id] = (grown[id] ?? 0) + n;
    d = { ...d, grow: grown };
    apply(d);
    out = stackedGeometry(input(), measure, plan);
  }
  const geo = out.geo;
  if (geo.crossings.length) warn(`${geo.crossings.length} crossing${geo.crossings.length === 1 ? "" : "s"} in the stacked drawing (each is cut): ${geo.crossings.map((c) => `${lineName(m, geo.lines[c.top]!)} over ${lineName(m, geo.lines[c.under]!)}`).join("; ")}`);
  if (geo.through.length) warn(`in the stacked drawing ${geo.through.map((k) => lineName(m, geo.lines.find((l) => l.i === k)!)).join(", ")} passes through a node`);
  return { dyn: d, geo, ink: inkHtml(P, geo, tk, base), tokens: tk };
}

function lineName(m: Model, l: GLine): string {
  const a = m.byId.get(l.from)?.name ?? l.from, b = m.byId.get(l.to)?.name ?? l.to;
  return `${a} to ${b}`;
}

// ============================================================================================================================================
// Tracing and the keys
// ============================================================================================================================================

/**
 * Traces one node (or clears with null): its lines take the main ink and keep their width, dash and head, their labels lift to primary,
 * every other line dims, and the node and its neighbours lift their rim (1.15). Cuts are worked out again, a traced line on top.
 */
export function applyTrace(fig: HTMLElement, P: string, geo: Geo | null, tokens: Tokens | null, base: string, id: string | null): void {
  const near = new Set<string>();
  if (id) {
    near.add(id);
    for (const l of geo?.lines ?? []) { if (l.from === id) near.add(l.to); if (l.to === id) near.add(l.from); }
  }
  fig.toggleAttribute("data-tracing", Boolean(id));
  fig.querySelectorAll<HTMLElement>(`.${P}-node`).forEach((el) => el.toggleAttribute("data-near", near.has(el.dataset.node!)));
  if (!geo || !tokens) return;
  const lit = (l: GLine) => Boolean(id) && (l.from === id || l.to === id);
  const edges = fig.querySelector(`.${P}-edges`);
  const groupEls = new Map<string, Element>();
  fig.querySelectorAll(`.${P}-edge`).forEach((g) => groupEls.set(g.getAttribute("data-edge")!, g));
  for (const l of geo.lines) {
    const g = groupEls.get(String(l.i));
    if (!g) continue;
    g.toggleAttribute("data-lit", lit(l));
    g.toggleAttribute("data-dim", Boolean(id) && !lit(l));
  }
  fig.querySelectorAll<HTMLElement>(`.${P}-label`).forEach((el) => {
    const l = geo.lines.find((x) => String(x.i) === el.dataset.edge);
    el.toggleAttribute("data-lit", Boolean(l && lit(l)));
  });
  // A traced line is drawn on top, and the cuts are worked out again.
  if (edges) for (const l of geo.lines) if (lit(l)) { const g = groupEls.get(String(l.i)); if (g) edges.appendChild(g); }
  const crossings = findCrossings(geo.lines, lit);
  const { defs, ids } = masksMarkup(P, { ...geo, crossings }, tokens, base);
  const svg = fig.querySelector(`.${P}-svg`);
  if (!svg) return;
  let defsEl = svg.querySelector("defs");
  if (!defsEl && defs) { defsEl = document.createElementNS("http://www.w3.org/2000/svg", "defs"); svg.insertBefore(defsEl, svg.firstChild); }
  if (defsEl) defsEl.innerHTML = defs;
  geo.lines.forEach((l, k) => {
    const path = groupEls.get(String(l.i))?.querySelector(`.${P}-line`);
    if (!path) return;
    const mask = ids.get(k);
    if (mask) path.setAttribute("mask", `url(#${mask})`); else path.removeAttribute("mask");
  });
}

/** The node a key moves to (1.14): → ↓ the next, ← ↑ the one before, in the author's order, stopping at the ends; Home and End the ends. */
export function keyTarget(m: Model, from: string, key: string): string | null {
  const i = m.byId.get(from)?.i ?? 0;
  const n = m.nodes.length;
  let to: number;
  if (key === "ArrowRight" || key === "ArrowDown") to = i + 1;
  else if (key === "ArrowLeft" || key === "ArrowUp") to = i - 1;
  else if (key === "Home") to = 0;
  else if (key === "End") to = n - 1;
  else return null;
  return m.nodes[Math.max(0, Math.min(n - 1, to))]!.id;
}

/**
 * Brings the DOM's attributes in line with the tree for a new state: the figure, the drawing, every node and the list, walked in step. Text,
 * slots and the ink are left alone; the attributes tracing sets (data-lit, data-dim, data-near, data-tracing) are kept.
 */
const MANAGED = ["data-layout", "data-measured", "role", "aria-roledescription", "aria-labelledby", "aria-describedby", "aria-label", "tabindex", "data-stops", "hidden"];
const MANAGED_STYLE = ["--_track", "--_h", "--_gap"];
export function syncAttributes(el: Element, v: VNode): void {
  if (typeof v === "string" || "slot" in v) return;
  // Only what a state changes is managed: an attribute or style the caller added (an id, a class, its own style) stays.
  for (const name of MANAGED) if (!(name in v.a) || v.a[name] === undefined || v.a[name] === null || v.a[name] === false) el.removeAttribute(name);
  for (const [k, value] of Object.entries(v.a)) {
    if (k === "class") continue;
    if (k === "style") {
      const style = (el as HTMLElement).style;
      const decls = new Map(String(value ?? "").split(";").map((d) => { const at = d.indexOf(":"); return [d.slice(0, at).trim(), d.slice(at + 1).trim()] as const; }).filter(([n]) => n));
      for (const [n, val] of decls) if (style.getPropertyValue(n).trim() !== val) style.setProperty(n, val);
      for (const n of MANAGED_STYLE) if (!decls.has(n)) style.removeProperty(n);
      continue;
    }
    if (value === undefined || value === null || value === false) { el.removeAttribute(k); continue; }
    const s = value === true ? "" : String(value);
    if (el.getAttribute(k) !== s) el.setAttribute(k, s);
  }
  if (v.t === "svg" || (typeof v.a.class === "string" && /-(ink|ruler)$/.test(v.a.class))) return;
  const kids = v.c.filter((c): c is VElement => typeof c !== "string" && !("slot" in c));
  const els = [...el.children];
  if (v.c.some((c) => typeof c !== "string" && "slot" in c)) return;
  kids.forEach((c, k) => { const child = els[k]; if (child && child.tagName.toLowerCase() === c.t) syncAttributes(child, c); });
}
