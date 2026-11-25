// A state diagram (DECISIONS 359, Ops 1): read as an architecture (a state is the node, a composite state a group) and routed by the engine, with what is
// its own here: the engine's labels (the event, then `[guard] / action`), guards on one event numbered in the order tried, the start mark, the final
// mark, entry and exit. StateDiagram hands this module to the engine on the spec, so an app that draws an architecture bundles none of it. Nothing runs
// at load. The implementation has not been reviewed.

import { h, iso, nodeText, sentence, svgA, txt } from "./diagram-core";
import type { DiagramSpec, DiagramTypeExt, ExtBuildKit, Geo, MNode, Model, StateNode, StateTransition, Tokens, VChild, VElement, VNode } from "./diagram-core";

const MAX = 28;
const r2 = (n: number) => Math.round(n * 100) / 100;
const NTH = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

/** The engine's label (Ops 1): one break, after the event; each line 28 characters at most, the number included. */
function label(e: StateTransition, n: number | undefined, kit: ExtBuildKit): string | undefined {
  const { dev, error } = kit;
  if (dev && (e as { label?: unknown }).label !== undefined) error(`the transition from ${String(e.from)} to ${String(e.to)} has a label: a state's label is the engine's, from its event, guard and action`);
  const ev = txt(e.event), guard = txt(e.guard), action = txt(e.action);
  if (dev && !ev && !guard) error(`the transition from ${String(e.from)} to ${String(e.to)} has neither an event nor a guard`);
  const first = ev ? `${n ? `${n}. ` : ""}${ev}` : undefined;
  const second = [guard ? `[${guard}]` : "", action ? `/ ${action}` : ""].filter(Boolean).join(" ") || undefined;
  const lines = [first, second].filter((x): x is string => Boolean(x));
  for (const l of lines) if (dev && l.length > MAX) error(`the line "${l}" of a transition's label is over ${MAX} characters: the words belong in the state or the summary`);
  return lines.length ? lines.join("\n") : undefined;
}

/** The data the engine reads as an architecture's: no marks, no flow, each transition its composed label; a line to a composite state is refused. */
function prepare(spec: DiagramSpec, kit: ExtBuildKit): DiagramSpec {
  const { dev, error, warn } = kit;
  const nodes = (Array.isArray(spec.nodes) ? spec.nodes : []) as StateNode[];
  const groups = new Set((Array.isArray(spec.groups) ? spec.groups : []).map((g) => String(g.id)));
  if (dev) {
    // One initial state outside the groups at most, and one in each group at most.
    const starts = new Map<string, string[]>();
    for (const n of nodes) if (n.initial) { const k = String(n.group ?? ""); starts.set(k, [...(starts.get(k) ?? []), String(n.id)]); }
    for (const [g, ids] of starts) if (ids.length > 1) error(`${ids.join(" and ")} are each initial ${g ? `in the group ${g}` : "outside the groups"}: one at most`);
    for (const n of nodes) if (n.initial && n.final) error(`${String(n.id)} is both initial and final`);
  }
  const list = (Array.isArray(spec.edges) ? spec.edges : []) as StateTransition[];
  // Transitions that leave one state on one event are numbered 1., 2. in the array's order (rule 4); nothing else is.
  const order = new Map<number, number>();
  const by = new Map<string, number[]>();
  list.forEach((e, k) => { const ev = txt(e.event); if (ev) { const key = `${String(e.from)}\u0000${ev}`; by.set(key, [...(by.get(key) ?? []), k]); } });
  for (const ks of by.values()) if (ks.length > 1) {
    ks.forEach((k, j) => order.set(k, j + 1));
    if (dev) ks.slice(0, -1).forEach((k) => { if (!txt(list[k]!.guard)) warn(`the transition from ${String(list[k]!.from)} on ${String(list[k]!.event)} has no guard and is not the last on its event: the later ones can never be taken`); });
  }
  const edges = list.flatMap((e, k) => {
    if (groups.has(String(e.from)) || groups.has(String(e.to))) { dev && error(`the transition from ${String(e.from)} to ${String(e.to)} names a composite state: a line to a group's boundary is not drawn in this build`); return []; }
    return [{ from: e.from, to: e.to, kind: e.kind, fromSide: e.fromSide, toSide: e.toSide, label: label(e, order.get(k), kit), event: txt(e.event), guard: txt(e.guard), action: txt(e.action), order: order.get(k) }];
  });
  return { ...spec, nodes: nodes.map((n) => ({ ...n, mark: undefined })), edges };
}

/** A state's marks and actions, and a transition's parts, on the model the engine read. */
function adopt(m: Model, spec: DiagramSpec) {
  for (const raw of (spec.nodes ?? []) as StateNode[]) {
    const n = m.byId.get(String(raw.id));
    if (!n) continue;
    n.initial = raw.initial === true || undefined; n.final = raw.final === true || undefined; n.entry = txt(raw.entry); n.exit = txt(raw.exit);
  }
  // The engine keeps a line whose two ends are cards, in order: walk the same list.
  let k = 0;
  for (const e of (spec.edges ?? []) as Array<StateTransition & { order?: number }>) {
    if (!m.byId.has(String(e.from)) || !m.byId.has(String(e.to))) continue;
    const me = m.edges[k++];
    if (me) { me.event = e.event; me.guard = e.guard; me.action = e.action; me.order = e.order; }
  }
}

const finalMark = (P: string, cls = `${P}-final`) => h("svg", { class: cls, ...svgA(14, 14) }, h("circle", { cx: 7, cy: 7, r: 6.5 }), h("circle", { cx: 7, cy: 7, r: 3, "data-dot": "" }));

function card(P: string, m: Model, n: MNode): VChild[] {
  return [
    ...nodeText(P, m, n),
    // Entry and exit actions, under a hairline rule.
    n.entry || n.exit ? h("span", { class: `${P}-actions` }, n.entry ? h("span", { class: `${P}-action` }, "entry / ", iso(n.entry)) : null, n.exit ? h("span", { class: `${P}-action` }, "exit / ", iso(n.exit)) : null) : null,
    // A final state carries a ring and a dot in its top end corner.
    n.final ? finalMark(P) : null,
  ];
}

function keyMore(P: string, m: Model): VElement[] {
  const out: VElement[] = [];
  const entry = (swatch: VElement, words: string) => out.push(h("li", { class: `${P}-entry` }, swatch, h("span", null, iso(words))));
  if (m.nodes.some((n) => n.initial)) entry(h("svg", { class: `${P}-swatch`, ...svgA(24, 16) }, h("circle", { class: `${P}-start-dot`, cx: 4, cy: 8.5, r: 4 }), h("path", { class: `${P}-start-line`, d: "M8 8.5H17" }), h("path", { class: `${P}-start-tip`, d: "M24 8.5L16 4.5L16 12.5Z" })), "Starts here");
  if (m.nodes.some((n) => n.final)) entry(finalMark(P, `${P}-swatch ${P}-final`), "Ends here");
  if (m.edges.some((e) => e.order)) out.push(h("li", { class: `${P}-entry` }, h("span", { class: `${P}-key-letters`, "data-numbers": "", "aria-hidden": "true" }, "1. 2."), h("span", null, "Tried in this order: the first that holds is taken")));
  return out;
}

function listLines(P: string, m: Model, H: (text: string) => VElement): VNode[] {
  const code = (s: string) => h("code", { class: `${P}-code` }, iso(s));
  const name = (id: string) => h("strong", null, iso(m.byId.get(id)?.name ?? id));
  // A transition as a sentence: "On tool.call, if writes: to Waiting approval. Tried second."
  return [H("Transitions"), h("ol", { class: `${P}-list-items` }, m.edges.map((e) => h("li", null, name(e.from), ": ",
    e.event ? ["On ", code(e.event)] : "", e.guard ? [e.event ? ", if " : "If ", code(e.guard)] : "", e.action ? [", then ", code(e.action)] : "",
    ": to ", name(e.to), m.legend[e.kind] ? ` (${m.legend[e.kind]})` : "", ".", e.order ? ` Tried ${NTH[e.order - 1] ?? `number ${e.order}`}.` : "")))];
}

/** A state's initial state that a composite holds: its mark stands above it, in every layout (the decider's ruling on the gap). */
const inGroup = (n: MNode) => Boolean(n.initial && n.group);
/** The rows whose cards stand space-10 lower for a composite's start mark: each row (but the first, which the drawing's top edge holds) with one. */
const markedRows = (m: Model) => new Set(m.nodes.filter((n) => inGroup(n) && n.row > 1 && n.row === Math.min(...m.nodes.filter((x) => x.group === n.group).map((x) => x.row))).map((n) => n.row));
const hits = (a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/**
 * The start marks: the figure's own before its initial state on the side the figure reads from (above, laid down); a composite's above its initial
 * state in every layout. Along its side a mark takes the first of the middle, the start quarter and the end quarter (mirrored right to left) that is
 * space-4 from every line's end there; it never lies on a line, a label or another mark. With no such place the drawn layout is refused, and the figure
 * is stacked (the stacked form is unchanged: the mark on the trunk's x, in its own room).
 */
function startMarks(P: string, m: Model, geo: Geo, tk: Tokens, drawn: boolean, warn?: (s: string) => void): string | false {
  const s = tk.space;
  const len = drawn ? s("10") : s("8");
  const half = tk.head / 2;
  let out = "";
  const drawnBoxes: Array<{ l: number; t: number; r: number; b: number }> = [];
  for (const g of geo.nodes) {
    const n = m.byId.get(g.id);
    if (!n?.initial) continue;
    const r = g.rect;
    const across = !drawn || m.dir === "down" || inGroup(n);
    const ends = geo.lines.flatMap((l) => [l.pts[0]!, l.pts[l.pts.length - 1]!]).filter((p) => (across ? Math.abs(p.y - r.t) < 1.5 && p.x >= r.l - 1 && p.x <= r.r + 1 : Math.abs(p.x - (m.rtl ? r.r : r.l)) < 1.5 && p.y >= r.t - 1 && p.y <= r.b + 1));
    const lo = across ? r.l : r.t, hi = across ? r.r : r.b;
    const at = (f: number) => lo + (hi - lo) * f;
    const tries = !drawn ? [m.rtl ? r.r - s("8") : r.l + s("8")] : (across && m.rtl ? [0.5, 0.75, 0.25] : [0.5, 0.25, 0.75]).map(at);
    let placed: string | null = null;
    for (const v of tries) {
      if (drawn && !ends.every((p) => Math.abs((across ? p.x : p.y) - v) >= s("4"))) continue;
      const c = Math.round(v - 0.5) + 0.5;
      const a = across ? { x: c, y: r.t - len + half } : { x: m.rtl ? r.r + len - half : r.l - len + half, y: c };
      const b = across ? { x: c, y: r.t } : { x: m.rtl ? r.r : r.l, y: c };
      // The mark's box (its dot and stub, grown space-1): clear of every line's stroke, every label and every other mark.
      const box = { l: Math.min(a.x, b.x) - half - s("1"), r: Math.max(a.x, b.x) + half + s("1"), t: Math.min(a.y, b.y) - half - s("1"), b: Math.max(a.y, b.y) + half + s("1") };
      const shy = { l: box.l, r: box.r, t: box.t, b: across ? b.y - 1 : box.b };
      if (drawn) {
        const onLine = geo.lines.some((l) => l.pts.slice(1).some((q, k) => { const p0 = l.pts[k]!; return hits(shy, { l: Math.min(p0.x, q.x) - l.width / 2, r: Math.max(p0.x, q.x) + l.width / 2, t: Math.min(p0.y, q.y) - l.width / 2, b: Math.max(p0.y, q.y) + l.width / 2 }); }));
        if (onLine || geo.labels.some((lb) => hits(shy, lb.box)) || drawnBoxes.some((o) => hits(shy, o))) continue;
      }
      drawnBoxes.push(box);
      const ux = Math.sign(b.x - a.x), uy = Math.sign(b.y - a.y);
      const bx = b.x - ux * tk.head, by = b.y - uy * tk.head;
      placed = `<g class="${P}-start"><circle class="${P}-start-dot" cx="${r2(a.x)}" cy="${r2(a.y)}" r="${half}"/><path class="${P}-start-line" d="M${r2(a.x + ux * half)} ${r2(a.y + uy * half)}L${r2(bx + ux)} ${r2(by + uy)}"/><path class="${P}-start-tip" d="M${r2(b.x)} ${r2(b.y)}L${r2(bx - uy * half)} ${r2(by + ux * half)}L${r2(bx + uy * half)} ${r2(by - ux * half)}Z"/></g>`;
      break;
    }
    if (placed === null) { warn?.(`the start mark of ${n.name} has no place clear of the lines, the labels and the other marks, so the figure is stacked`); return false; }
    out += placed;
  }
  return out;
}

let made: DiagramTypeExt | undefined;
/** The state diagram's module, made at its first use. */
export function stateType(): DiagramTypeExt {
  return (made ??= {
    type: "state",
    as: "architecture",
    routed: true,
    stop: "a state",
    prepare,
    adopt,
    card: (P, m, n) => card(P, m, n),
    sentenceMore: (_m, n) => [n.initial ? "The machine starts here." : "", n.final ? "It ends here." : "", n.entry ? `On entry: ${sentence(n.entry)}` : "", n.exit ? `On exit: ${sentence(n.exit)}` : ""].filter(Boolean),
    keyMore,
    listParts: "States",
    listPart: (P, _m, n) => {
      const code = (s: string) => h("code", { class: `${P}-code` }, iso(s));
      return [n.initial ? " The machine starts here." : "", n.final ? " It ends here." : "", n.entry ? [" On entry: ", code(n.entry), "."] : "", n.exit ? [" On exit: ", code(n.exit), "."] : ""];
    },
    listLines,
    // A composite's mark stands above its initial state, in every layout, and its room is new room: on the figure's first row the box and the drawing's
    // top edge take space-10 more; on a later row every card of the row stands space-10 lower (`data-room`), so the box keeps its plain space-8 above it.
    // Stacked, a group whose first card is initial keeps space-16 above it.
    groupMark: (m, g, c) => {
      if (!c) { const first = m.nodes.find((n) => g.all.includes(n.id)); return first?.initial && first.group === g.id ? { start: "" } : undefined; }
      // On the first row the box reaches higher where it or a group inside it holds a marked state there, so a nested box never pokes out of its parent.
      return c.r1 === 1 && g.all.some((id) => { const n = m.byId.get(id)!; return inGroup(n) && n.row === 1; }) ? { start: "top" } : undefined;
    },
    room: (m) => {
      const own = m.nodes.find((n) => n.initial && !n.group);
      return {
        start: Boolean(own && m.dir !== "down" && own.col === (m.rtl ? m.cols : 1)),
        top: Boolean((own && m.dir === "down" && own.row === 1) || m.nodes.some((n) => inGroup(n) && n.row === 1)),
      };
    },
    nodeAttrs: (m, n) => ({ "data-initial": n.initial ? "" : undefined, "data-final": n.final ? "" : undefined, "data-room": markedRows(m).has(n.row) ? "" : undefined }),
    inkMore: startMarks,
  });
}
