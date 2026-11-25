// A gantt (DECISIONS 359, Planning 1.1): a row a task on one time scale. Square bars 16 tall whose ends are their dates and are never widened; a milestone a
// diamond on its day; tick lines and a dashed today line; no dependency line (a row writes what it comes after). Three forms by a measured floor: drawn,
// stacked with tracks, stacked in words. The scale is diagram-scale's; everything drawn on it is this module's. GanttDiagram hands it to the engine on the
// spec, so an app that draws an architecture bundles none of it. Nothing runs at load. The implementation has not been reviewed.

import { h, iso, own, rectOf, sentence, svgA, txt } from "./diagram-core";
import type { DiagramSpec, DiagramTypeExt, Dyn, ExtBuildKit, ExtBuilt, ExtMeasureKit, Geo, Measured, MNode, Model, VElement, VNode } from "./diagram-core";
import { dateWords, datesWords, dayLadder, dayNumber, numberLadder, scaleMap, ticks, yearOf } from "./diagram-scale";
import type { ScaleTick } from "./diagram-scale";

// ---- Public shapes ----

export interface GanttPhase { id: string; label: string }
export interface GanttTask {
  id: string;
  name: string;
  /** A day (`YYYY-MM-DD`) or a number in the figure's `unit`. */
  start: string | number;
  /** The last day (inclusive) or the end value. A milestone has none. */
  end?: string | number;
  phase?: string;
  detail?: string;
  detailMono?: boolean;
  /** What it comes after, by id: written in the row as "After: …". No line is drawn (DECISIONS 359, 1.1). */
  after?: string[];
  /** A milestone: a diamond on its day, with a `start` and no `end`. */
  milestone?: boolean;
  /** The one focal task. */
  focal?: boolean;
  href?: string;
  target?: "_blank";
}
/** A numeric scale's unit: one word for both, or the singular and the plural ("week", "weeks"). */
export type GanttUnit = string | { one: string; other: string };
/** The built-in words a gantt draws, each replaceable. */
export interface GanttLabels { task?: string; milestone?: string; after?: string; bar?: string; day?: GanttUnit }

// ---- The model ----

interface GTask {
  id: string; i: number; name: string; phase?: string; detail?: string; mono: boolean;
  /** Its place on the scale: a span's start and end, a milestone's point (a = b). */
  a: number; b: number;
  milestone: boolean; focal: boolean; after: string[]; range: string; length: string; href?: string; blank?: boolean;
}
export interface GanttPlan {
  days: boolean;
  tasks: GTask[];
  phases: GanttPhase[];
  domain: [number, number];
  /** The shortest bar's length on the scale; Infinity with none. */
  shortest: number;
  today?: number;
  todayWords?: string;
  todayLabel: string;
  words: { task: string; milestone: string; after: string; bar: string };
  /** The figure spans more than one year: a range writes its year. */
  years: boolean;
}

const plural = (u: GanttUnit, n: number) => (typeof u === "string" ? u : n === 1 ? u.one : u.other);
const r2 = (n: number) => Math.round(n * 100) / 100;
/** The name of a task an "After" names. */
const nameOf = (p: GanttPlan, id: string) => p.tasks.find((t) => t.id === id)?.name ?? id;

function build(spec: DiagramSpec, kit: ExtBuildKit): ExtBuilt {
  const { dev, warn, error } = kit;
  const labels = (spec.labels ?? {}) as GanttLabels;
  const words = { task: txt(labels.task) ?? "Task", milestone: txt(labels.milestone) ?? "Milestone", after: txt(labels.after) ?? "After", bar: txt(labels.bar) ?? "Task, from its start to its end" };
  const raw = (Array.isArray(spec.tasks) ? spec.tasks : []) as GanttTask[];
  const phases = (Array.isArray(spec.phases) ? spec.phases : []).map((p) => ({ id: String((p as GanttPhase).id ?? ""), label: String((p as GanttPhase).label ?? "") }));
  const days = raw.length > 0 && dayNumber(raw[0]!.start) !== null;
  const unitIn = spec.unit as GanttUnit | undefined;
  const unit: GanttUnit = days ? (labels.day ?? { one: "day", other: "days" }) : unitIn && (typeof unitIn === "string" || (typeof unitIn === "object" && unitIn.one && unitIn.other)) ? unitIn : "";
  if (dev && !days && raw.length && !unitIn) warn("a numeric gantt has no unit: its lengths are written as bare numbers");
  const read = (v: unknown, who: string): number => {
    if (days) { const d = dayNumber(v); if (d === null) { dev && error(`${who}: ${JSON.stringify(v)} is not a day (YYYY-MM-DD), as the first task's start is`); return 0; } return d; }
    const n = typeof v === "number" ? v : Number.NaN;
    if (!Number.isFinite(n)) { dev && error(`${who}: ${JSON.stringify(v)} is not a number, as the first task's start is`); return 0; }
    return n;
  };
  const parsed = raw.map((t, i) => {
    const id = String(t.id ?? "");
    const milestone = Boolean(t.milestone);
    const s = read(t.start, `the start of ${id}`);
    if (milestone && t.end !== undefined && t.end !== null) dev && error(`${id} is a milestone with an end: a milestone has a start alone`);
    const e = milestone ? s : t.end === undefined || t.end === null ? (dev && error(`${id} has no end: a task has a start and an end, a milestone a start alone`), s) : read(t.end, `the end of ${id}`);
    if (e < s) dev && error(`${id} ends before it starts`);
    const last = Math.max(s, e);
    // A day is an interval (1.0): a span from the start of its first day to the end of its last; a point at its day's middle.
    const a = days ? (milestone ? s + 0.5 : s) : s;
    const b = days ? (milestone ? s + 0.5 : last + 1) : milestone ? s : last;
    return { t, id, i, milestone, s, last, a, b };
  });
  if (dev && parsed.filter((p) => p.t.focal).length > 1) warn("more than one task is focal: a gantt has one at most");
  // The domain is exact (the answers' section 3): the least start to the greatest end, a milestone's day included. Never rounded.
  const lo = parsed.length ? Math.min(...parsed.map((p) => (days ? p.s : p.a))) : 0;
  const hi = parsed.length ? Math.max(...parsed.map((p) => (days ? p.last + 1 : p.b))) : 1;
  const domain: [number, number] = [lo, hi > lo ? hi : lo + 1];
  const years = days && yearOf(domain[0]) !== yearOf(domain[1] - 1);
  const fmt = (d: number) => dateWords(d, years);
  const range = (p: (typeof parsed)[number]) => {
    if (!days) return p.milestone ? `${p.s} · ${words.milestone}` : `${p.s} – ${p.last}`;
    if (p.milestone) return `${fmt(p.s)} · ${words.milestone}`;
    if (p.s === p.last) return fmt(p.s);
    // "Nov 2 – 9" inside one month, "Nov 28 – Dec 3" across two (with the year only where the figure spans more than one).
    const sameMonth = new Date(p.s * 86_400_000).getUTCMonth() === new Date(p.last * 86_400_000).getUTCMonth() && yearOf(p.s) === yearOf(p.last);
    return sameMonth && !years ? `${fmt(p.s)} – ${new Date(p.last * 86_400_000).getUTCDate()}` : `${fmt(p.s)} – ${fmt(p.last)}`;
  };
  const length = (p: (typeof parsed)[number]) => {
    if (p.milestone) return "";
    const n = days ? p.last - p.s + 1 : r2(p.last - p.s);
    return `${n} ${plural(unit, n)}`.trim();
  };
  const tasks: GTask[] = parsed.map((p) => ({
    id: p.id, i: p.i, name: String(p.t.name ?? ""), phase: txt(p.t.phase), detail: txt(p.t.detail), mono: Boolean(p.t.detailMono),
    a: p.a, b: p.b, milestone: p.milestone, focal: Boolean(p.t.focal), after: Array.isArray(p.t.after) ? p.t.after.map(String) : [], range: range(p), length: length(p),
    href: txt(p.t.href), blank: p.t.target === "_blank",
  }));
  // Development checks: an "after" that names no task, and a task that starts before a task it comes after has ended.
  if (dev) for (const t of tasks) for (const id of t.after) {
    const before = tasks.find((x) => x.id === id);
    if (!before) warn(`${t.id} comes after "${id}", which is not a task`);
    else if (t.a < before.b) warn(`${t.id} starts before ${id}, which it comes after, has ended`);
  }
  for (const t of tasks) if (t.phase && !phases.some((ph) => ph.id === t.phase)) dev && warn(`${t.id} names the phase "${t.phase}", which is not in phases`);
  const bars = tasks.filter((t) => !t.milestone).map((t) => t.b - t.a);
  const shortest = bars.length ? Math.min(...bars) : Infinity;
  const todayRaw = spec.today;
  const todayAt = todayRaw === undefined || todayRaw === null ? undefined : days ? (dayNumber(todayRaw) ?? undefined) : typeof todayRaw === "number" ? todayRaw : undefined;
  const todayPoint = todayAt === undefined ? undefined : days ? todayAt + 0.5 : todayAt;
  // A today outside the domain is not drawn and not in the key.
  const today = todayPoint !== undefined && todayPoint >= domain[0] && todayPoint <= domain[1] ? todayPoint : undefined;
  const todayLabel = txt(spec.todayLabel) ?? "Today";
  const plan: GanttPlan = {
    days, tasks, phases, domain, shortest, today, todayLabel, words, years,
    todayWords: today === undefined ? undefined : days ? dateWords(Math.floor(today), years) : String(today),
  };
  if (dev && domain[1] - domain[0] > 512 * shortest) warn(`the plan is more than 512 times its shortest bar, so the gantt is never drawn (only stacked): make the short task a milestone or split the chart`);
  // A row is a stop (1.1): the task's order, phase by phase.
  const order = orderOf(plan);
  const nodes: MNode[] = order.map((t, k) => ({ id: t.id, i: k, name: t.name, mono: false, focal: t.focal, col: 1, row: k + 1, row2: k + 1, branch: false, shape: "box", href: t.href, blank: t.blank }));
  return { nodes, edges: [], plan, cols: 1, rows: Math.max(1, nodes.length) };
}

/** The rows in their order: under their phases (in the phases' order), then the tasks with none. */
function orderOf(p: GanttPlan): GTask[] {
  if (!p.phases.length) return p.tasks;
  return [...p.phases.flatMap((ph) => p.tasks.filter((t) => t.phase === ph.id)), ...p.tasks.filter((t) => !t.phase || !p.phases.some((ph) => ph.id === t.phase))];
}
const planOf = (m: Model) => m.plan as GanttPlan;
const taskOf = (m: Model, id: string) => planOf(m).tasks.find((t) => t.id === id)!;

// ---- Words ----

function rangeSentence(p: GanttPlan, t: GTask): string {
  return t.milestone ? `${t.range.replace(` · ${p.words.milestone}`, "")}, ${p.words.milestone.toLowerCase()}` : `${t.range.replace(" – ", " to ")}, ${t.length}`;
}
function writeSentence(m: Model, n: MNode): string {
  const p = planOf(m), t = taskOf(m, n.id);
  const ph = t.phase ? p.phases.find((x) => x.id === t.phase)?.label : undefined;
  const parts = [`${t.name}${ph ? `, ${ph}` : ""}: ${rangeSentence(p, t)}.`];
  if (t.detail) parts.push(sentence(t.detail));
  if (t.after.length) parts.push(`${p.words.after} ${t.after.map((id) => nameOf(p, id)).join(", ")}.`);
  if (t.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

function key(P: string, m: Model): VElement | null {
  const p = planOf(m);
  const entries: VElement[] = [];
  const entry = (swatch: VElement, words: string, attrs = {}) => entries.push(h("li", { class: `${P}-entry`, ...attrs }, swatch, h("span", null, iso(words))));
  // The bar, the milestone and today are notation (built in); the stack in words draws none, so their entries are the tracks' only.
  if (p.tasks.some((t) => !t.milestone)) entry(h("svg", { class: `${P}-swatch`, ...svgA(24, 16) }, h("rect", { class: `${P}-swatch-bar`, x: 0.5, y: 4.5, width: 23, height: 7 })), p.words.bar, { "data-when": "tracks" });
  if (p.tasks.some((t) => t.milestone)) entry(h("svg", { class: `${P}-swatch`, ...svgA(16, 16) }, h("path", { class: `${P}-swatch-bar`, d: "M8 1.5L14.5 8L8 14.5L1.5 8Z" })), p.words.milestone, { "data-when": "tracks" });
  if (p.today !== undefined) entry(h("svg", { class: `${P}-swatch`, ...svgA(16, 16) }, h("path", { class: `${P}-today`, d: "M8.5 0V16" })), `${p.todayLabel}, ${p.todayWords}`, { "data-when": "tracks" });
  if (p.tasks.some((t) => t.focal) && m.legend.focal) entry(h("svg", { class: `${P}-swatch`, ...svgA(24, 16) }, h("rect", { class: `${P}-swatch-bar`, "data-focal": "", x: 0.5, y: 4.5, width: 23, height: 7 })), m.legend.focal, { "data-focal": "" });
  if (!entries.length) return null;
  return h("div", { class: `${P}-key` }, h("ul", { class: `${P}-legend`, "aria-label": "Key" }, entries));
}

function list(P: string, m: Model): VNode[] {
  const p = planOf(m);
  const sub = Math.min(6, m.heading + 1);
  const item = (t: GTask) => h("li", null, h("strong", null, iso(t.name)), `: ${rangeSentence(p, t)}.`, t.detail ? [" ", t.mono ? h("code", { class: `${P}-code` }, t.detail) : sentence(t.detail)] : "",
    t.after.length ? ` ${p.words.after} ${t.after.map((id) => nameOf(p, id)).join(", ")}.` : "", t.focal && m.legend.focal ? ` ${sentence(m.legend.focal)}` : "");
  if (!p.phases.length) return [h("ol", { class: `${P}-list-items` }, p.tasks.map(item))];
  const out: VNode[] = [];
  for (const ph of p.phases) {
    const mine = p.tasks.filter((t) => t.phase === ph.id);
    if (mine.length) out.push(h(`h${sub}`, { class: `${P}-list-head` }, iso(ph.label)), h("ol", { class: `${P}-list-items` }, mine.map(item)));
  }
  const rest = p.tasks.filter((t) => !t.phase || !p.phases.some((ph) => ph.id === t.phase));
  if (rest.length) out.push(h("ol", { class: `${P}-list-items` }, rest.map(item)));
  return out;
}

// ---- The drawing: one DOM for every form ----

/** Where a value is, as a fraction of the domain: the bars' places are percentages of the track, so they are exact at every width. */
const frac = (p: GanttPlan, v: number) => (v - p.domain[0]) / (p.domain[1] - p.domain[0]);

function drawing(P: string, m: Model, dyn: Dyn, level?: number): VNode[] {
  const p = planOf(m);
  const out: VNode[] = [];
  const hasToday = p.today !== undefined;
  // The axis row: its corner word, and room for the tick labels (and the today label above them); the ink draws the words in it.
  out.push(h("div", { class: `${P}-gantt-axis`, "data-today": hasToday ? "" : undefined, "aria-hidden": "true" },
    h("span", { class: `${P}-gantt-corner` }, iso(p.words.task)),
    h("span", { class: `${P}-gantt-scale` })));
  const rows = orderOf(p);
  let phase: string | undefined = "\u0000";
  for (const t of rows) {
    const ph = t.phase && p.phases.some((x) => x.id === t.phase) ? t.phase : undefined;
    if (ph !== phase && ph) out.push(h("p", { class: `${P}-gantt-phase`, "aria-hidden": "true" }, iso(p.phases.find((x) => x.id === ph)!.label)));
    phase = ph;
    const n = m.byId.get(t.id)!;
    const stops = Boolean(dyn.layout && !dyn.bare);
    const s = r2(frac(p, t.a) * 100), w = r2(frac(p, t.b) * 100 - frac(p, t.a) * 100);
    // A row whose range holds today ends its range line with today's label, in the stack in words (the CSS shows it there only).
    const holdsToday = hasToday && p.today! >= t.a && p.today! <= t.b;
    out.push(h(t.href ? "a" : "div", {
      class: `${P}-node ${P}-gantt-row`,
      href: t.href, target: t.href && t.blank ? "_blank" : undefined, rel: t.href && t.blank ? "noopener noreferrer" : undefined, "data-link": t.href ? (t.blank ? "external" : "") : undefined,
      "data-node": t.id, "data-focal": t.focal ? "" : undefined, "data-level": level,
      role: t.href ? undefined : "img", "aria-label": writeSentence(m, n),
      tabindex: stops ? (dyn.stop === t.id ? 0 : -1) : dyn.keep === t.id ? -1 : undefined,
    },
    h("span", { class: `${P}-gantt-words` },
      h("span", { class: `${P}-name` }, iso(t.name)),
      h("span", { class: `${P}-gantt-range` }, iso(t.length ? `${t.range} · ${t.length}` : t.range), holdsToday ? h("span", { class: `${P}-gantt-now` }, ` · ${p.todayLabel}`) : null),
      t.detail ? h("span", { class: `${P}-detail`, "data-mono": t.mono ? "" : undefined }, iso(t.detail)) : null,
      t.after.length ? h("span", { class: `${P}-gantt-after` }, iso(`${p.words.after}: ${t.after.map((id) => nameOf(p, id)).join(", ")}`)) : null),
    h("span", { class: `${P}-gantt-track`, "aria-hidden": "true" },
      h("span", { class: `${P}-gantt-scale` },
        t.milestone
          ? h("span", { class: `${P}-gantt-mile`, "data-focal": t.focal ? "" : undefined, style: `--_s:${s}%` }, h("svg", { ...svgA(16, 16) }, h("path", { d: "M8 0.5L15.5 8L8 15.5L0.5 8Z" })))
          : h("span", { class: `${P}-gantt-bar`, "data-focal": t.focal ? "" : undefined, style: `--_s:${s}%;--_w:${w}%` })))));
  }
  return out;
}

// ---- Measuring (script only) ----

/** The name column: `size-diagram-table`, or the widest unbreakable line if that is wider (1.1). */
function nameColumn(m: Model, tk: ExtMeasureKit["tk"], measure: ExtMeasureKit["measure"]): number {
  const p = planOf(m);
  let widest = tk.table;
  for (const t of p.tasks) {
    for (const w of t.name.split(/\s+/)) widest = Math.max(widest, Math.ceil(measure(w, "name")));
    for (const w of `${t.range} · ${t.length}`.split(/\s+/)) widest = Math.max(widest, Math.ceil(measure(w, "tab")));
    for (const w of (t.detail ?? "").split(/\s+/)) if (w) widest = Math.max(widest, Math.ceil(measure(w, t.mono ? "mono" : "sans")));
  }
  return widest;
}
/** The track's scale less its two insets, drawn: the figure less the name column and 32 (space-4 and the two insets). */
const drawnScale = (W: number, name: number, s: (k: string) => number) => W - name - s("4") - 2 * s("2");
/** The scale the bars stand on: the shortest bar at least space-2, never widened. */
const floorHolds = (p: GanttPlan, length: number, floor: number) => !Number.isFinite(p.shortest) || (p.shortest / (p.domain[1] - p.domain[0])) * length >= floor - 1e-6;

function least(m: Model, tk: ExtMeasureKit["tk"], measure: ExtMeasureKit["measure"]): number {
  const p = planOf(m);
  const name = nameColumn(m, tk, measure);
  const s = tk.space;
  const span = p.domain[1] - p.domain[0];
  const need = Number.isFinite(p.shortest) ? (s("2") * span) / p.shortest : 0;
  return Math.max(tk.wide, Math.ceil(name + s("4") + 2 * s("2") + need));
}

function tickRow(p: GanttPlan, length: number): ScaleTick[] {
  const map = scaleMap({ domain: p.domain, length });
  const span = p.domain[1] - p.domain[0];
  const found = ticks(map, p.days ? dayLadder() : numberLadder(span / Math.max(1, length), span), 56);
  // Where fewer than two round ticks fall in the domain, its two ends are the ticks (the gantt's own; the module never adds them).
  if (found.length >= 2) return found;
  return [{ value: p.domain[0], place: 0, step: "end" }, { value: p.domain[1], place: length, step: "end" }];
}
function tickWords(p: GanttPlan, list: ScaleTick[]): string[] {
  // A day's tick at a domain's end is the end of the last day: its label names the day it closes.
  if (p.days) return datesWords(list.map((t) => (t.step === "end" && t.value === p.domain[1] ? t.value - 1 : t.value)));
  return list.map((t) => String(r2(t.value)));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(m: Model, kit: ExtMeasureKit): Measured {
  const { drawing: el, P, tk, W, apply, stopOf, current, measure } = kit;
  const p = planOf(m);
  const s = tk.space;
  const name = nameColumn(m, tk, measure);
  const span = p.domain[1] - p.domain[0];
  const bound = Number.isFinite(p.shortest) && span > 512 * p.shortest;
  const drawn = !bound && W >= Math.max(tk.wide, least(m, tk, measure)) && floorHolds(p, drawnScale(W, name, s), s("2"));
  const stackW = Math.min(tk.cap, W);
  const tracks = !drawn && floorHolds(p, stackW - 2 * s("2"), s("2"));
  const dyn = stopOf({ ...current, layout: drawn ? "drawn" : "stacked", form: drawn ? undefined : tracks ? "tracks" : "words", place: drawn ? { "": `--_name:${name}px` } : undefined, bare: undefined });
  apply(dyn);
  const ink = tracks || drawn ? inkOf(el, m, P, tk, drawn, measure) : { geo: emptyGeo(el), ink: "" };
  return { dyn, geo: ink.geo, ink: ink.ink, tokens: tk, least: least(m, tk, measure) };
}

const emptyGeo = (el: HTMLElement): Geo => ({ w: el.clientWidth, h: el.clientHeight, nodes: [], lines: [], lifelines: [], labels: [], crossings: [], through: [], unseated: [], outside: [], ox: 0, oy: 0 });

function inkOf(el: HTMLElement, m: Model, P: string, tk: ExtMeasureKit["tk"], drawn: boolean, measure: ExtMeasureKit["measure"]): { geo: Geo; ink: string } {
  const p = planOf(m);
  const s = tk.space;
  const origin = el.getBoundingClientRect();
  const ox = origin.left - Math.floor(origin.left), oy = origin.top - Math.floor(origin.top);
  const half = (v: number, o: number) => Math.round(v + o - 0.5) + 0.5 - o;
  const geo = emptyGeo(el);
  const rtl = Boolean(m.rtl);
  const scales = [...el.querySelectorAll<HTMLElement>(`.${P}-gantt-track > .${P}-gantt-scale`)];
  const axis = el.querySelector<HTMLElement>(`.${P}-gantt-axis > .${P}-gantt-scale`);
  if (!scales.length || !axis) return { geo, ink: "" };
  const first = rectOf(scales[0]!, origin);
  const length = first.r - first.l;
  const xOf = (v: number, r: { l: number; r: number }) => (rtl ? r.r - frac(p, v) * (r.r - r.l) : r.l + frac(p, v) * (r.r - r.l));
  const list = tickRow(p, length);
  const said = tickWords(p, list);
  let out = "";
  // Tick lines: 1px chart-grid at each tick, the full height of every task row, stopping at a phase head; stacked, inside each track (never across words).
  const rowsOf = drawn ? [...el.querySelectorAll<HTMLElement>(`.${P}-gantt-row`)].map((r) => rectOf(r, origin)) : [...el.querySelectorAll<HTMLElement>(`.${P}-gantt-track`)].map((r) => rectOf(r, origin));
  // Runs of rows with no phase head between them, so a line stops at a head.
  const runs: Array<{ t: number; b: number }> = [];
  for (const r of rowsOf) { const last = runs[runs.length - 1]; if (last && Math.abs(r.t - last.b) < 1.5) last.b = r.b; else runs.push({ t: r.t, b: r.b }); }
  const vline = (x: number, cls: string) => runs.map((r) => `<path class="${P}-${cls}" d="M${r2(x)} ${r2(r.t)}V${r2(r.b)}"/>`).join("");
  for (const t of list) out += vline(half(xOf(t.value, first), ox), "gantt-grid");
  if (p.today !== undefined) out += vline(half(xOf(p.today, first), ox), "today");
  // The tick labels, in the axis row: each starts space-1 after its line, and is dropped whole where it would pass the track's end.
  const ar = rectOf(axis, origin);
  const lineH = 16;
  const tickY = ar.b - s("2") - lineH / 2;
  let words = "";
  list.forEach((t, k) => {
    const x = xOf(t.value, { l: ar.l, r: ar.r });
    const wd = measure(said[k]!, "tab");
    const start = rtl ? x - s("1") - wd : x + s("1");
    if (start < ar.l - 0.5 || start + wd > ar.r + 0.5) return;
    words += `<text class="${P}-gantt-tick" x="${r2(rtl ? x - s("1") : x + s("1"))}" y="${r2(tickY)}" text-anchor="${rtl ? "end" : "start"}" dominant-baseline="central">${esc(said[k]!)}</text>`;
  });
  if (p.today !== undefined) {
    // The today label (500, secondary) centred over its line and held inside the track, on the line above the ticks.
    const x = xOf(p.today, { l: ar.l, r: ar.r });
    const wd = measure(p.todayLabel, "xs-500");
    const at = Math.max(ar.l + wd / 2, Math.min(ar.r - wd / 2, x));
    words += `<text class="${P}-gantt-today" x="${r2(at)}" y="${r2(tickY - lineH - s("1"))}" text-anchor="middle" dominant-baseline="central">${esc(p.todayLabel)}</text>`;
  }
  return { geo, ink: `<svg class="${P}-svg" width="${geo.w}" height="${geo.h}" viewBox="0 0 ${geo.w} ${geo.h}" focusable="false">${out}${words}</svg>` };
}

// ---- Keys ----

function keyTarget(m: Model, from: string, key: string): string | null {
  const i = m.byId.get(from)?.i ?? 0;
  const n = m.nodes.length;
  const to = key === "ArrowDown" ? i + 1 : key === "ArrowUp" ? i - 1 : key === "Home" ? 0 : key === "End" ? n - 1 : null;
  return to === null ? null : m.nodes[Math.max(0, Math.min(n - 1, to))]?.id ?? null;
}

let made: DiagramTypeExt | undefined;
/** The gantt's module, made at its first use. */
export function ganttType(): DiagramTypeExt {
  return (made ??= {
    type: "gantt",
    build,
    stop: "a task",
    sentence: writeSentence,
    key,
    list,
    drawing,
    least,
    layout,
    keyTarget,
    hasStops: (_m, dyn) => Boolean(dyn.layout && !dyn.bare),
    traces: () => false,
    hint: (m) => [{ keys: ["↑", "↓"], words: "a task" }, { keys: ["Home", "End"], words: "the ends" }, ...(m.nodes.some((n) => n.href) ? [{ keys: ["Enter"], words: "open" }] : [])],
    keys: (m) => `Up and down arrows move to the next or the previous task; Home and End go to the ends.${m.nodes.some((n) => n.href) ? " Enter opens a task that is a link." : ""}`,
    rootStyle: (_m, dyn) => { const v = own(dyn.place, ""); return v ? [v] : []; },
    // Before script (1.1): stacked, with tracks only if the shortest bar is at least 1/34 of the domain (8px in the 272px track of a 320px window).
    form: (m) => { const p = planOf(m); return !Number.isFinite(p.shortest) || p.shortest * 34 >= p.domain[1] - p.domain[0] ? "tracks" : "words"; },
  });
}
