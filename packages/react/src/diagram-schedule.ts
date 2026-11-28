// A schedule (DECISIONS 359, Planning 1.6): a network on the architecture router, placed as an architecture is (the author's columns and rows, or
// `layout: "auto"`). Its numbers are computed, never authored: finish to start, no lag, no calendar, one unit, in fixed point (integers scaled by 1e6) so
// 0.1 + 0.2 is exact. A line is main only where both its tasks are critical and its finish is the next task's start. ScheduleDiagram hands this module to
// the engine on the spec; the engine routes and stacks it. Nothing runs at load. The implementation has not been reviewed.

import { h, iso, lineSwatch, sentence, svgA, txt } from "./diagram-core";
import type { DiagramSpec, DiagramTypeExt, Dyn, ExtBuildKit, ExtBuilt, MEdge, MNode, Model, VChild, VElement, VNode } from "./diagram-core";

export interface ScheduleTask {
  id: string;
  name: string;
  /** Its code ("T3"), Mono, on the card's kind line. */
  kind?: string;
  /** A positive number in the figure's `unit`. */
  duration: number;
  /** What it comes after, by id: finish to start, no lag. */
  after?: string[];
  /** Its tracks, as an architecture card's (left out under `layout: "auto"`). */
  col?: number;
  row?: number;
  /** The author's one focal task. Never derived, and never "critical". */
  focal?: boolean;
  href?: string;
  target?: "_blank";
}
export type ScheduleUnit = string | { one: string; other: string };
export interface ScheduleLabels {
  finishes?: string; criticalPath?: { one: string; other: string }; assumptions?: string; critical?: string; float?: string;
  keyMain?: string; keyPlain?: string; keyCritical?: string; keyFloat?: string; keyNumbers?: string; starts?: string;
}

const SCALE = 1_000_000;
const toInt = (n: number) => Math.round(n * SCALE);
/** A fixed-point number as words: "1,271", "2.5". */
function said(u: number): string {
  const neg = u < 0 ? "-" : "";
  const abs = Math.abs(u);
  const whole = Math.floor(abs / SCALE);
  const frac = abs % SCALE;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${neg}${grouped}.${String(frac).padStart(6, "0").replace(/0+$/, "")}` : `${neg}${grouped}`;
}

interface STask { id: string; i: number; name: string; kind?: string; d: number; es: number; ef: number; ls: number; lf: number; float: number; critical: boolean; after: Array<{ id: string; sets: boolean }>; focal: boolean }
interface SchedulePlan {
  tasks: STask[];
  unit: ScheduleUnit;
  finish: number;
  paths: number;
  /** A cycle, an unknown id or a duration that is no positive finite number: the bare stack (names, durations and "After"; no numbers, no lines). */
  bad: boolean;
  words: Required<ScheduleLabels>;
}
const splan = (m: Model) => m.plan as SchedulePlan;
const unitWord = (p: SchedulePlan, u: number) => (typeof p.unit === "string" ? p.unit : u === SCALE ? p.unit.one : p.unit.other);
const length = (p: SchedulePlan, u: number) => `${said(u)} ${unitWord(p, u)}`;

function build(spec: DiagramSpec, kit: ExtBuildKit): ExtBuilt {
  const { dev, error, warn } = kit;
  const given = (spec.labels ?? {}) as ScheduleLabels;
  const words: Required<ScheduleLabels> = {
    finishes: given.finishes ?? "Finishes at", criticalPath: given.criticalPath ?? { one: "critical path", other: "critical paths" },
    assumptions: given.assumptions ?? "Finish to start, no lag, no calendar. A box’s width is not its length.", critical: given.critical ?? "Critical", float: given.float ?? "Float",
    keyMain: given.keyMain ?? "This finish sets that start, on a critical path", keyPlain: given.keyPlain ?? "Comes before, with time to spare",
    keyCritical: given.keyCritical ?? "Critical task", keyFloat: given.keyFloat ?? "Task with float", keyNumbers: given.keyNumbers ?? "ES, EF: earliest start and finish · LS, LF: latest start and finish",
    starts: given.starts ?? "Starts the schedule.",
  };
  const unitIn = spec.unit as ScheduleUnit | undefined;
  if (dev && !unitIn) error("a schedule needs its unit: one unit for every duration");
  const unit: ScheduleUnit = unitIn ?? "";
  if (dev && Array.isArray(spec.edges) && spec.edges.length) error("a schedule's lines are its tasks' `after`: write no `edges` (a side is derived)");
  const raw = (Array.isArray(spec.tasks) ? spec.tasks : []) as ScheduleTask[];
  const ids = new Set<string>();
  let bad = false;
  for (const t of raw) { const id = String(t.id ?? ""); if (!id || ids.has(id)) { bad = true; dev && warn(id ? `the id "${id}" is used twice` : "a task has no id"); } ids.add(id); }
  const dur = new Map<string, number>();
  for (const t of raw) {
    const d = typeof t.duration === "number" ? t.duration : Number.NaN;
    if (!Number.isFinite(d) || d <= 0) { bad = true; dev && error(`${String(t.id)}'s duration is ${JSON.stringify(t.duration)}: it is a positive number`); dur.set(String(t.id), SCALE); }
    else dur.set(String(t.id), toInt(d));
  }
  const preds = new Map<string, string[]>(raw.map((t) => [String(t.id), []]));
  const succs = new Map<string, string[]>(raw.map((t) => [String(t.id), []]));
  const pairs: Array<[string, string]> = [];
  for (const t of raw) for (const a of Array.isArray(t.after) ? t.after.map(String) : []) {
    if (!ids.has(a)) { bad = true; dev && error(`${String(t.id)} comes after "${a}", which is not a task`); continue; }
    if (preds.get(String(t.id))!.includes(a)) continue;
    preds.get(String(t.id))!.push(a); succs.get(a)!.push(String(t.id)); pairs.push([a, String(t.id)]);
  }
  // The forward pass in an order that puts every task after those it comes after; a task left out is in a cycle.
  const indeg = new Map(raw.map((t) => [String(t.id), preds.get(String(t.id))!.length]));
  const queue = raw.map((t) => String(t.id)).filter((id) => indeg.get(id) === 0);
  const topo: string[] = [];
  while (queue.length) { const u = queue.shift()!; topo.push(u); for (const v of succs.get(u)!) { indeg.set(v, indeg.get(v)! - 1); if (indeg.get(v) === 0) queue.push(v); } }
  if (topo.length < raw.length) { bad = true; dev && error(`the schedule has a cycle (${raw.map((t) => String(t.id)).filter((id) => !topo.includes(id)).join(", ")}): its passes cannot finish`); }
  const es = new Map<string, number>(), ef = new Map<string, number>(), ls = new Map<string, number>(), lf = new Map<string, number>();
  for (const u of topo) { const s = Math.max(0, ...preds.get(u)!.map((p) => ef.get(p)!)); es.set(u, s); ef.set(u, s + dur.get(u)!); }
  const finish = Math.max(0, ...topo.map((u) => ef.get(u)!));
  for (const u of [...topo].reverse()) { const f = Math.min(finish, ...succs.get(u)!.map((v) => ls.get(v)!)); lf.set(u, f); ls.set(u, f - dur.get(u)!); }
  const critical = (u: string) => !bad && lf.get(u)! - ef.get(u)! === 0;
  // A line is main only where both its tasks are critical and its finish is the next task's start (EF = ES).
  const sets = (a: string, b: string) => !bad && ef.get(a) === es.get(b);
  const main = (a: string, b: string) => critical(a) && critical(b) && sets(a, b);
  // The critical paths: from a critical start, along main lines, to the finish.
  const memo = new Map<string, number>();
  const count = (u: string): number => {
    if (memo.has(u)) return memo.get(u)!;
    const next = succs.get(u)!.filter((v) => main(u, v));
    const n = next.length ? next.reduce((sum, v) => sum + count(v), 0) : ef.get(u) === finish ? 1 : 0;
    memo.set(u, n);
    return n;
  };
  const paths = bad ? 0 : topo.filter((u) => critical(u) && !preds.get(u)!.length).reduce((sum, u) => sum + count(u), 0);
  const tasks: STask[] = raw.map((t, i) => {
    const id = String(t.id);
    return {
      id, i, name: String(t.name ?? ""), kind: txt(t.kind), d: dur.get(id)!, es: es.get(id) ?? 0, ef: ef.get(id) ?? 0, ls: ls.get(id) ?? 0, lf: lf.get(id) ?? 0,
      float: bad ? 0 : (lf.get(id) ?? 0) - (ef.get(id) ?? 0), critical: critical(id), after: preds.get(id)!.map((a) => ({ id: a, sets: sets(a, id) })), focal: Boolean(t.focal),
    };
  });
  const auto = spec.layout === "auto";
  const nodes: MNode[] = raw.map((t, i) => {
    const col = typeof t.col === "number" && Number.isInteger(t.col) && t.col >= 1 ? t.col : (dev && !auto && error(`${String(t.id)}'s col is ${JSON.stringify(t.col)}, not a whole number from 1`), 1);
    const row = typeof t.row === "number" && Number.isInteger(t.row) && t.row >= 1 ? t.row : (dev && !auto && error(`${String(t.id)}'s row is ${JSON.stringify(t.row)}, not a whole number from 1`), 1);
    return { id: String(t.id), i, name: String(t.name ?? ""), kind: txt(t.kind), mono: false, focal: Boolean(t.focal), col, row, row2: row, branch: false, shape: "box", href: txt(t.href), blank: t.target === "_blank" };
  });
  if (dev && !auto) for (const [a, b] of pairs) { const na = nodes.find((n) => n.id === a)!, nb = nodes.find((n) => n.id === b)!; if (nb.col <= na.col) error(`${b} is not in a later column than ${a}, which it comes after`); }
  if (dev) for (const [a, b] of pairs) if (raw.findIndex((t) => String(t.id) === b) < raw.findIndex((t) => String(t.id) === a)) warn(`${b} is listed before ${a}, which it comes after: the stack is in the author's order`);
  if (dev && tasks.filter((t) => t.focal).length > 1) warn("more than one task is focal: a schedule has one at most");
  if (dev && kit.legend.focal && /\bcritical\b|zero float|float 0/i.test(kit.legend.focal)) warn("the focal task's words say what a critical task is: the focal task is the author's own, and its words must say something else");
  // In production a broken schedule is the bare stack: no lines.
  const edges: MEdge[] = bad ? [] : pairs.map(([a, b], i) => ({ i, from: a, to: b, kind: main(a, b) ? "main" : "plain" }));
  const plan: SchedulePlan = { tasks, unit, finish, paths, bad, words };
  return { nodes, edges, plan, cols: Math.max(1, ...nodes.map((n) => n.col)), rows: Math.max(1, ...nodes.map((n) => n.row)) };
}
const stask = (m: Model, id: string) => splan(m).tasks.find((t) => t.id === id)!;
/** A task as the "After" words name it: by its kind line where every task has one, by its name otherwise. */
const named = (p: SchedulePlan, id: string) => { const t = p.tasks.find((x) => x.id === id)!; return p.tasks.every((x) => x.kind) ? t.kind! : t.name; };
const andList = (list: string[]) => (list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);
/** "After T2, T3 and T4. T3 sets its start.", "After T1, which sets its start.", "After T5 and T6. Both set its start.", or "Starts the schedule." */
function afterWords(p: SchedulePlan, t: STask): string {
  if (!t.after.length) return p.words.starts;
  const all = t.after.map((a) => named(p, a.id));
  if (p.bad) return `After ${andList(all)}.`;
  const setters = t.after.filter((a) => a.sets).map((a) => named(p, a.id));
  if (t.after.length === 1) return setters.length ? `After ${all[0]}, which sets its start.` : `After ${all[0]}.`;
  if (setters.length === t.after.length) return `After ${andList(all)}. ${setters.length === 2 ? "Both set" : "All set"} its start.`;
  return `After ${andList(all)}. ${andList(setters)} ${setters.length === 1 ? "sets" : "set"} its start.`;
}

function writeSentence(m: Model, n: MNode): string {
  const p = splan(m), t = stask(m, n.id);
  const parts = [sentence(t.kind ? `${t.name}, ${t.kind}` : t.name), `${length(p, t.d)}.`];
  if (!p.bad) {
    parts.push(`Earliest start ${said(t.es)}, earliest finish ${said(t.ef)}, latest start ${said(t.ls)}, latest finish ${said(t.lf)}.`);
    parts.push(t.critical ? `${p.words.float} 0, ${p.words.critical.toLowerCase()}.` : `${p.words.float} ${length(p, t.float)}.`);
  }
  parts.push(afterWords(p, t));
  if (t.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

/** The card: its contour (its kind), its head, its numbers, its foot, and (stacked) what it comes after. */
function card(P: string, m: Model, n: MNode): VChild[] {
  const p = splan(m), t = stask(m, n.id);
  const cell = (k: string, v: number) => h("span", { class: `${P}-sched-cell` }, h("span", { class: `${P}-sched-k` }, k), h("span", { class: `${P}-sched-v` }, said(v)));
  return [
    h("span", { class: `${P}-sched-contour`, "data-critical": t.critical ? "" : undefined, "aria-hidden": "true" }),
    h("span", { class: `${P}-sched-head` },
      h("span", { class: `${P}-kind` }, t.kind ? iso(t.kind) : null, h("span", { class: `${P}-sched-dur` }, length(p, t.d))),
      h("span", { class: `${P}-name` }, iso(t.name))),
    p.bad ? null : h("span", { class: `${P}-sched-grid` }, cell("ES", t.es), cell("EF", t.ef), cell("LS", t.ls), cell("LF", t.lf)),
    p.bad ? null : h("span", { class: `${P}-sched-foot` }, h("span", null, t.critical ? `${p.words.float} 0` : `${p.words.float} ${length(p, t.float)}`), t.critical ? h("span", { class: `${P}-sched-critical` }, p.words.critical) : null),
    h("span", { class: `${P}-sched-after` }, afterWords(p, t)),
  ];
}

function meta(P: string, m: Model): VElement | null {
  const p = splan(m);
  if (p.bad) return null;
  const paths = `${p.paths} ${p.paths === 1 ? p.words.criticalPath.one : p.words.criticalPath.other}`;
  return h("p", { class: `${P}-meta` }, h("span", { class: `${P}-meta-first` }, `${p.words.finishes} ${length(p, p.finish)}`), ` · ${paths}. `, p.words.assumptions);
}

function key(P: string, m: Model): VElement | null {
  const p = splan(m);
  const entry = (swatch: VElement, words: string, attrs = {}) => h("li", { class: `${P}-entry`, ...attrs }, swatch, h("span", null, iso(words)));
  const box = (critical: boolean) => h("svg", { class: `${P}-swatch`, ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-task`, "data-critical": critical ? "" : undefined, x: critical ? 1 : 0.5, y: critical ? 3 : 2.5, width: critical ? 14 : 15, height: critical ? 10 : 11, rx: 2 }));
  const out: VElement[] = [];
  if (m.edges.some((e) => e.kind === "main")) out.push(entry(lineSwatch(P, "main"), m.legend.main ?? p.words.keyMain, { "data-line": "", "data-when": "drawn" }));
  if (m.edges.some((e) => e.kind === "plain")) out.push(entry(lineSwatch(P, "plain"), m.legend.plain ?? p.words.keyPlain, { "data-line": "", "data-when": "drawn" }));
  if (p.tasks.some((t) => t.critical)) out.push(entry(box(true), p.words.keyCritical));
  if (p.tasks.some((t) => !t.critical)) out.push(entry(box(false), p.words.keyFloat));
  // The numbers' words are their own key: the letters are in the words, so the entry has no swatch of its own.
  if (!p.bad) out.push(h("li", { class: `${P}-entry`, "data-words": "" }, h("span", null, p.words.keyNumbers)));
  if (m.nodes.some((n) => n.focal) && m.legend.focal) out.push(entry(h("svg", { class: `${P}-swatch`, "data-shape": "focal", ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-shape`, x: 0.5, y: 2.5, width: 15, height: 11, rx: 2 })), m.legend.focal, { "data-focal": "" }));
  return out.length ? h("div", { class: `${P}-key` }, h("ul", { class: `${P}-legend`, "aria-label": "Key" }, out)) : null;
}

function list(P: string, m: Model): VNode[] {
  const p = splan(m);
  return [h("ol", { class: `${P}-list-items` }, p.tasks.map((t) => h("li", null, h("strong", null, iso(t.name)), t.kind ? [", ", h("code", { class: `${P}-code` }, t.kind)] : "", `: ${length(p, t.d)}. `,
    p.bad ? "" : `Earliest start ${said(t.es)} and finish ${said(t.ef)}; latest start ${said(t.ls)} and finish ${said(t.lf)}; ${p.words.float.toLowerCase()} ${t.critical ? "0, critical" : length(p, t.float)}. `,
    afterWords(p, t), t.focal && m.legend.focal ? ` ${sentence(m.legend.focal)}` : "")))];
}

let made: DiagramTypeExt | undefined;
/** The schedule's module, made at its first use. It is routed: the engine places, routes and stacks it as it does an architecture. */
export function scheduleType(): DiagramTypeExt {
  return (made ??= {
    type: "schedule",
    routed: true,
    stackBare: true,
    build,
    stop: ["a task", "task"],
    sentence: writeSentence,
    card: (P, m, n, _dyn: Dyn) => card(P, m, n),
    meta,
    key,
    list,
    traces: "drawn",
  });
}
