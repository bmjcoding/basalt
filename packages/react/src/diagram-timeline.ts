// A timeline (DECISIONS 359, Ops 2): points on one linear scale, never even gaps. Each event is a dot on the axis and a card that flies from a straight
// stem at its time, in two lanes above the axis and two below; a figure where an event has no seat is stacked, and a card off its time is never drawn. The
// scale is diagram-scale's (the clock ladder, roundOut, breaks, reversed); the seats are diagram-timeline-seat's; the times are written in the figure's
// zone through time-format.ts (DECISIONS 207). TimelineDiagram hands this module to the engine on the spec. Nothing runs at load. The implementation has
// not been reviewed.

import { cardRole, escapeHtml, h, iso, own, rectOf, sentence, svgA, txt } from "./diagram-core";
import type { DiagramSpec, DiagramTypeExt, Dyn, ExtBuildKit, ExtBuilt, ExtMeasureKit, Geo, Measured, MNode, Model, VElement, VNode } from "./diagram-core";
import { clockLadder, dateWords, instantOf, roundOut, scaleMap, ticks } from "./diagram-scale";
import type { ScaleMap, ScaleTick } from "./diagram-scale";
import { seatCards } from "./diagram-timeline-seat";
import type { Seat } from "./diagram-timeline-seat";
import { formatElapsed, formatStamp } from "./time-format";

export interface TimelineEvent { id: string; at: string; name: string; kind?: string; detail?: string; detailMono?: boolean; focal?: boolean; href?: string; target?: "_blank" }
/** A span left out of the scale, the author's alone: drawn as a gap with two slashes, its length written by the engine. */
export interface TimelineBreak { from: string; to: string; label?: string }
export interface TimelineLabels { event?: string; breakKey?: string; eventKey?: string }

const DAY = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100;

interface TEvent { id: string; i: number; at: number; name: string; kind?: string; detail?: string; mono: boolean; focal: boolean; href?: string; blank?: boolean }
interface TimelinePlan {
  events: TEvent[];
  breaks: Array<{ from: number; to: number; label?: string }>;
  /** The author's domain, used as written; else the events' extent, which the layout rounds out at each width it tries. */
  domain?: [number, number];
  extent: [number, number];
  zone: string;
  zoneShort: string;
  words: Required<TimelineLabels>;
}
const tplan = (m: Model) => m.plan as TimelinePlan;

// ---- Words in the figure's zone (time-format.ts; the zone is an argument, never a place) ----

/** The zone's offset from UTC at an instant, in minutes, read from the wall clock time-format.ts writes there. */
function offsetIn(zone: string): (ms: number) => number {
  return (ms) => {
    const at = Math.floor(ms / 1000) * 1000;
    const wall = Date.parse(`${formatStamp(at, { timeZone: zone }).dateTime}Z`);
    return Number.isFinite(wall) ? Math.round((wall - at) / 60000) : 0;
  };
}
const clockOf = (ms: number, zone: string, seconds = false) => { const t = formatStamp(ms, { timeZone: zone }).text; return seconds ? t.slice(0, 8) : t.slice(0, 5); };
const wallDay = (ms: number, zone: string) => Math.floor(Date.parse(`${formatStamp(ms, { timeZone: zone }).dateTime.slice(0, 10)}T00:00:00Z`) / DAY);
/** A length in Basalt's shipped words (formatElapsed's forms, with seconds under a minute): "45 s", "31 min", "2 hr 15 min", "3 days". */
function lengthWords(ms: number): string {
  if (ms < 60_000) return `${Math.max(0, Math.round(ms / 1000))} s`;
  return formatElapsed(0, ms)?.text ?? `${Math.round(ms / 1000)} s`;
}
function shortZone(zone: string): string {
  if (zone === "UTC") return "UTC";
  try { return new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(0).find((p) => p.type === "timeZoneName")?.value ?? zone; } catch { return zone; }
}

function build(spec: DiagramSpec, kit: ExtBuildKit): ExtBuilt {
  const { dev, error, warn } = kit;
  const given = (spec.labels ?? {}) as TimelineLabels;
  const words: Required<TimelineLabels> = { event: given.event ?? "Event", breakKey: given.breakKey ?? "Time left out of the scale", eventKey: given.eventKey ?? "An event, at its time" };
  const zoneIn = txt(spec.timeZone) ?? "UTC";
  let zone = zoneIn;
  try { new Intl.DateTimeFormat("en-US", { timeZone: zoneIn }); } catch { dev && error(`"${zoneIn}" is not an IANA zone: the times are written in UTC`); zone = "UTC"; }
  const raw = (Array.isArray(spec.events) ? spec.events : []) as Array<TimelineEvent & { end?: unknown }>;
  const read: TEvent[] = [];
  raw.forEach((e, i) => {
    const at = instantOf(e.at);
    if (dev && e.end !== undefined) error(`${String(e.id)} has an end: a timeline's events are points, and a span is a gantt's bar`);
    if (at === null) { dev && error(`${String(e.id)}'s at is ${JSON.stringify(e.at)}, not an ISO 8601 instant with its offset`); return; }
    read.push({ id: String(e.id ?? ""), i, at, name: String(e.name ?? ""), kind: txt(e.kind), detail: txt(e.detail), mono: Boolean(e.detailMono), focal: Boolean(e.focal), href: txt(e.href), blank: e.target === "_blank" });
  });
  // The engine sorts by `at`; ties keep the author's order.
  const events = read.slice().sort((a, b) => a.at - b.at || a.i - b.i);
  const breaks = (Array.isArray(spec.breaks) ? spec.breaks : []).flatMap((b) => {
    const x = b as TimelineBreak;
    const from = instantOf(x.from), to = instantOf(x.to);
    if (from === null || to === null || to <= from) { dev && error(`a break from ${JSON.stringify(x.from)} to ${JSON.stringify(x.to)} is not two instants in order`); return []; }
    return [{ from, to, label: txt(x.label) }];
  }).sort((a, b) => a.from - b.from);
  for (const e of events) if (breaks.some((b) => e.at > b.from && e.at < b.to)) dev && error(`${e.id} is inside a break: a break leaves out time with no event in it`);
  const extent: [number, number] = events.length ? [events[0]!.at, events[events.length - 1]!.at] : [0, 60_000];
  let domain: [number, number] | undefined;
  if (Array.isArray(spec.domain)) {
    const a = instantOf(spec.domain[0]), b = instantOf(spec.domain[1]);
    if (a === null || b === null || b <= a) dev && error("the domain is not two instants in order: it is the events' extent, rounded out");
    else {
      // An event outside the domain is an error, and the domain grows to hold it: nothing is cut.
      if (extent[0] < a || extent[1] > b) dev && error("an event is outside the domain: the domain grows to hold it");
      domain = [Math.min(a, extent[0]), Math.max(b, extent[1])];
    }
  }
  const nodes: MNode[] = events.map((e, k) => ({ id: e.id, i: k, name: e.name, kind: e.kind, detail: e.detail, mono: e.mono, focal: e.focal, col: k + 1, row: 1, row2: 1, branch: false, shape: "box", href: e.href, blank: e.blank }));
  if (dev) { const ids = new Set<string>(); for (const n of nodes) { if (ids.has(n.id)) warn(`the id "${n.id}" is used twice`); ids.add(n.id); } }
  if (dev && nodes.filter((n) => n.focal).length > 1) warn("more than one event is focal: a timeline has one at most");
  if (dev && (spec as { timeLabel?: unknown }).timeLabel !== undefined) warn("a timeline's times are written by the engine: `timeLabel` is not read");
  const plan: TimelinePlan = { events, breaks, domain, extent, zone, zoneShort: shortZone(zone), words };
  return { nodes, edges: [], plan, cols: Math.max(1, nodes.length), rows: 1 };
}

const tev = (m: Model, id: string) => tplan(m).events.find((e) => e.id === id)!;
const gapBefore = (p: TimelinePlan, e: TEvent) => { const k = p.events.indexOf(e); return k > 0 ? e.at - p.events[k - 1]!.at : null; };

function writeSentence(m: Model, n: MNode): string {
  const p = tplan(m), e = tev(m, n.id);
  const k = p.events.indexOf(e);
  const gap = gapBefore(p, e);
  const parts = [`${e.name}, ${clockOf(e.at, p.zone)} ${p.zoneShort}${gap !== null ? `, ${lengthWords(gap)} after ${p.events[k - 1]!.name}` : ""}.`];
  if (e.kind) parts.push(sentence(e.kind));
  if (e.detail) parts.push(sentence(e.detail));
  parts.push(`${p.words.event} ${k + 1} of ${p.events.length}.`);
  if (e.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

// ---- The drawing: one DOM. Drawn, the cards are placed by the layout (--_tx, --_ty); stacked, a column on the rail. ----

function drawing(P: string, m: Model, dyn: Dyn, level?: number): VNode[] {
  const p = tplan(m);
  const out: VNode[] = [];
  let b = 0;
  p.events.forEach((e, k) => {
    // Stacked, a break is a row of its words before the first event after it.
    while (b < p.breaks.length && p.breaks[b]!.to <= e.at) { const br = p.breaks[b++]!; out.push(h("p", { class: `${P}-tl-break`, "aria-hidden": "true" }, h("span", { class: `${P}-tl-break-words` }, iso(`// ${lengthWords(br.to - br.from)}${br.label ? ` · ${br.label}` : ""}`)))); }
    const n = m.byId.get(e.id)!;
    const gap = gapBefore(p, e);
    const tabindex = dyn.layout && !dyn.bare ? (dyn.stop === e.id ? 0 : -1) : dyn.keep === e.id ? -1 : undefined;
    out.push(h(e.href ? "a" : "div", {
      class: `${P}-node ${P}-tl-card`, href: e.href, target: e.href && e.blank ? "_blank" : undefined, rel: e.href && e.blank ? "noopener noreferrer" : undefined, "data-link": e.href ? (e.blank ? "external" : "") : undefined,
      "data-node": e.id, "data-focal": e.focal ? "" : undefined, "data-level": level, ...cardRole(m, e.href, tabindex), "aria-label": writeSentence(m, n),
      tabindex, style: own(dyn.place, e.id),
    },
    // The kind line: the time (Geist, 500, tabular), the gap since the event before (stacked only), then the kind in Mono; never broken.
    h("span", { class: `${P}-kind ${P}-tl-line` }, h("span", { class: `${P}-tl-time` }, clockOf(e.at, p.zone)), gap !== null && k > 0 ? h("span", { class: `${P}-tl-gap` }, ` +${lengthWords(gap)}`) : null, e.kind ? [" · ", iso(e.kind)] : null),
    h("span", { class: `${P}-name` }, iso(e.name)),
    e.detail ? h("span", { class: `${P}-detail`, "data-mono": e.mono ? "" : undefined }, e.mono ? h("span", { class: `${P}-runs` }, e.detail.split(/\s+/).filter(Boolean).flatMap((w, j) => [j ? " " : "", h("span", { class: `${P}-run` }, w)])) : iso(e.detail)) : null));
  });
  return out;
}

function key(P: string, m: Model): VElement | null {
  const p = tplan(m);
  const entry = (swatch: VElement, words: string, attrs = {}) => h("li", { class: `${P}-entry`, ...attrs }, swatch, h("span", null, iso(words)));
  const out: VElement[] = [entry(h("svg", { class: `${P}-swatch`, ...svgA(12, 16) }, h("path", { class: `${P}-tl-stem`, d: "M6.5 0V8" }), h("path", { class: `${P}-tl-axis`, d: "M0 11.5H12" }), h("circle", { class: `${P}-tl-dot`, cx: 6.5, cy: 11.5, r: 3 })), p.words.eventKey)];
  if (p.breaks.length) out.push(entry(h("svg", { class: `${P}-swatch`, ...svgA(28, 16) }, h("path", { class: `${P}-tl-axis`, d: "M0 8.5H8M20 8.5H28" }), h("path", { class: `${P}-tl-slash`, d: "M10 14L14 2M14 14L18 2" })), p.words.breakKey));
  if (m.nodes.some((n) => n.focal) && m.legend.focal) out.push(entry(h("svg", { class: `${P}-swatch`, "data-shape": "focal", ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-shape`, x: 0.5, y: 2.5, width: 15, height: 11, rx: 2 })), m.legend.focal, { "data-focal": "" }));
  return h("div", { class: `${P}-key` }, h("ul", { class: `${P}-legend`, "aria-label": "Key" }, out));
}

function list(P: string, m: Model): VNode[] {
  const p = tplan(m);
  const items: VNode[] = [];
  let b = 0;
  p.events.forEach((e) => {
    while (b < p.breaks.length && p.breaks[b]!.to <= e.at) { const br = p.breaks[b++]!; items.push(h("li", null, `${lengthWords(br.to - br.from)} left out of the scale${br.label ? `: ${br.label}` : ""}.`)); }
    const gap = gapBefore(p, e);
    items.push(h("li", null, `${clockOf(e.at, p.zone)} ${p.zoneShort}${gap !== null ? ` (+${lengthWords(gap)})` : ""}: `, h("strong", null, iso(e.name)), e.kind ? `, ${e.kind}` : "", e.detail ? `. ${sentence(e.detail)}` : ".", e.focal && m.legend.focal ? ` ${sentence(m.legend.focal)}` : ""));
  });
  return [h("ol", { class: `${P}-list-items` }, items)];
}

// ---- Measuring (script only) ----

interface Frame { map: ScaleMap; axisL: number; axisR: number; ticks: ScaleTick[]; xs: number[] }

/** The scale at a drawing width: the axis inset at each end by the larger of space-5 and half a tick label plus space-1, the zone space-3 after its end. */
function frameAt(p: TimelinePlan, width: number, tk: ExtMeasureKit["tk"], labelW: number, zoneW: number, rtl: boolean): Frame | null {
  const s = tk.space;
  const edge = Math.max(s("5"), Math.ceil(labelW / 2) + s("1"));
  // In physical coordinates: the zone's room is at the axis' end, the left right to left.
  const zone = Math.max(edge, zoneW + s("3"));
  const axisL = rtl ? zone : edge, axisR = width - (rtl ? edge : zone);
  const length = axisR - axisL;
  if (length <= 0) return null;
  const ladder = clockLadder(offsetIn(p.zone));
  const breaks = p.breaks.map((b) => [b.from, b.to] as const);
  const gap = s("8");
  let domain = p.domain;
  if (!domain) {
    // The default domain is the timeline's own (the answers' section 3): roundOut of the events' extent, again at each width tried.
    const found = roundOut(p.extent, ladder, tk.node, length, breaks, gap);
    domain = found ? found.domain : [p.extent[0], p.extent[1] > p.extent[0] ? p.extent[1] : p.extent[0] + 60_000];
  }
  const map = scaleMap({ domain, length, breaks, gap, reversed: rtl });
  return { map, axisL, axisR, ticks: ticks(map, ladder, tk.node), xs: p.events.map((e) => map.position(e.at)) };
}

function layout(m: Model, kit: ExtMeasureKit): Measured {
  const { drawing: el, P, tk, W, apply, stopOf, current, measure } = kit;
  const p = tplan(m);
  const s = tk.space;
  const stacked = () => {
    const dyn = stopOf({ ...current, layout: "stacked", place: undefined, bare: undefined });
    apply(dyn);
    return { dyn, ...stackInk(el, m, P, tk), tokens: tk, least: Infinity };
  };
  if (W < tk.wide || !p.events.length) { const out = stacked(); return { ...out, least: W < tk.wide ? tk.wide : out.least }; }
  // One width for every card: size-diagram-node, or more where a time line (never broken) needs it.
  const pad = 2 * s("3") + 2 * tk.hair;
  let tw = tk.node;
  for (const e of p.events) tw = Math.max(tw, Math.ceil(measure(clockOf(e.at, p.zone), "xs-500") + (e.kind ? measure(" · ", "tab") + measure(e.kind, "mono") : 0) + pad));
  const rtl = Boolean(m.rtl);
  // The cards' heights at that width, measured once in the drawn state.
  apply(stopOf({ ...current, layout: "drawn", place: { "": `--_tw:${tw}px;--_th:0px;--_tdw:${W}px` }, bare: undefined }));
  const heights = new Map(p.events.map((e) => { const c = el.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(e.id)}"]`); return [e.id, c ? Math.ceil(c.getBoundingClientRect().height) : 0]; }));
  const labelW = measure("00:00", "tab");
  const zoneW = measure(p.zoneShort, "mono");
  const seatAt = (width: number) => {
    const f = frameAt(p, width, tk, labelW, zoneW, rtl);
    if (!f) return null;
    // Seated in the axis' own logical coordinates (from its start), so a mirrored figure's flags fly toward its start too.
    const logical = f.xs.map((x) => (rtl ? width - (f.axisL + x) : f.axisL + x));
    const st = seatCards(logical.map((x) => Math.round(x) + 0.5), width, tw, s("3"), s("2"), tk.radius);
    return st.ok ? { f, placed: st.placed } : null;
  };
  // From the first width it draws at, it draws at every wider one: the least drawn width is the first, stepping up by size-diagram-node from 640
  // (nineteen steps at most), at which every event seats; a wider width that does not seat draws the widest narrower width that does, on the start edge.
  let least = Infinity;
  for (let k = 0; k < 19; k++) { const w = tk.wide + k * tk.node; if (seatAt(w)) { least = w; break; } }
  if (!(least <= W)) { const out = stacked(); return { ...out, least: Number.isFinite(least) ? least : out.least }; }
  let width = W, got = seatAt(W);
  if (!got) for (let w = least + Math.floor((W - least) / tk.node) * tk.node; w >= least && !got; w -= tk.node) { got = seatAt(w); width = w; }
  if (!got) { const out = stacked(); return { ...out, least }; }
  const { f, placed } = got;
  // The lanes: the near lane space-6 above the axis and space-10 below it (the tick row is between); the far lane past the tallest near card plus space-3.
  const near = { above: 0, below: 0 }, far = { above: 0, below: 0 };
  for (const q of placed) { const hgt = heights.get(p.events[q.k]!.id)!; const o = q.lane ? far : near; o[q.side] = Math.max(o[q.side], hgt); }
  const above = s("6"), below = s("10"), lane = s("3");
  const y0 = Math.round((far.above ? far.above + lane : 0) + near.above + above) + 0.5;
  const total = Math.ceil(y0 + (near.below ? below + near.below : s("8")) + (far.below ? lane + far.below : 0));
  const place: Record<string, string> = { "": `--_tw:${tw}px;--_th:${total}px;--_tdw:${width}px` };
  const seats: Array<Seat & { y: number; h: number; left: number }> = [];
  for (const q of placed) {
    const e = p.events[q.k]!, hgt = heights.get(e.id)!;
    const y = q.side === "above" ? y0 - above - (q.lane ? near.above + lane : 0) - hgt : y0 + below + (q.lane ? near.below + lane : 0);
    // A mirrored figure's card is placed from the right edge: its logical start is its physical right.
    const left = rtl ? width - q.l - tw : q.l;
    place[e.id] = `--_tx:${r2(left)}px;--_ty:${Math.round(y)}px`;
    seats.push({ ...q, y: Math.round(y), h: hgt, left });
  }
  const dyn = stopOf({ ...current, layout: "drawn", place, bare: undefined });
  apply(dyn);
  return { dyn, ...drawnInk(el, m, P, tk, f, seats, y0, width, tw, measure), tokens: tk, least };
}

function svgOf(P: string, geo: Geo, body: string) { return `<svg class="${P}-svg" width="${geo.w}" height="${geo.h}" viewBox="0 0 ${geo.w} ${geo.h}" focusable="false">${body}</svg>`; }
const blank = (el: HTMLElement): Geo => ({ w: el.clientWidth, h: el.clientHeight, nodes: [], lines: [], lifelines: [], labels: [], crossings: [], through: [], unseated: [], outside: [], ox: 0, oy: 0 });

function drawnInk(el: HTMLElement, m: Model, P: string, tk: ExtMeasureKit["tk"], f: Frame, seats: Array<Seat & { y: number; h: number; left: number }>, y0: number, width: number, tw: number, measure: ExtMeasureKit["measure"]): { geo: Geo; ink: string } {
  const p = tplan(m);
  const s = tk.space;
  const rtl = Boolean(m.rtl);
  const geo = blank(el);
  const half = (v: number) => Math.round(v - 0.5) + 0.5;
  // The axis' x for a place on the map (the map is mirrored right to left; the axis keeps its inset at both ends).
  const X = (pos: number) => f.axisL + pos;
  let body = "";
  // The axis, cut by each break's gap; in the gap, two slashes (12 tall, 4 across, 2 apart, round ends).
  const cuts = f.map.breaks.map(([a]) => { const x = X(f.map.position(a)); return rtl ? [x - f.map.gap, x] : [x, x + f.map.gap]; }).sort((a, b) => a[0]! - b[0]!);
  let from = f.axisL;
  for (const [a, b] of cuts) { body += `<path class="${P}-tl-axis" d="M${r2(from)} ${y0}H${r2(a!)}"/>`; from = b!; }
  body += `<path class="${P}-tl-axis" d="M${r2(from)} ${y0}H${r2(f.axisR)}"/>`;
  const breakBoxes: Array<[number, number]> = [];
  f.map.breaks.forEach(([a, b], k) => {
    const mid = (cuts[k]![0]! + cuts[k]![1]!) / 2;
    body += `<path class="${P}-tl-slash" d="M${r2(mid - 5)} ${r2(y0 + 6)}L${r2(mid - 1)} ${r2(y0 - 6)}M${r2(mid + 1)} ${r2(y0 + 6)}L${r2(mid + 5)} ${r2(y0 - 6)}"/>`;
    const br = p.breaks.find((x) => x.from === a);
    const words = `${lengthWords(b - a)}${br?.label ? ` · ${br.label}` : ""}`;
    const w = measure(words, "tab");
    breakBoxes.push([mid - w / 2 - s("2"), mid + w / 2 + s("2")]);
    body += `<text class="${P}-tl-break-text" x="${r2(mid)}" y="${r2(y0 + s("2") + 8)}" text-anchor="middle" dominant-baseline="central">${escapeHtml(words)}</text>`;
  });
  // Stems (1px diagram-structure, from the dot to the card's near edge, never jogging) and dots (size-dot, diagram-edge); each is its card's (data-for).
  const downs: number[] = [];
  for (const q of seats) {
    const e = p.events[q.k]!;
    const x = half(rtl ? width - q.x : q.x);
    const edgeY = q.side === "above" ? q.y + q.h : q.y;
    if (q.side === "below") downs.push(x);
    body += `<path class="${P}-tl-stem" data-for="${escapeHtml(e.id)}" d="M${r2(x)} ${y0}V${r2(edgeY)}"/>`;
  }
  // Ticks: a 1px mark space-1-5 long under the axis, every one round; a label centred space-2 under it gives way only to a stem through its box grown
  // space-1, or to a break's words grown space-2. A tick at midnight writes its date; where the domain crosses a midnight the first tick writes both.
  const crosses = wallDay(f.map.domain[0], p.zone) !== wallDay(f.map.domain[1], p.zone);
  f.ticks.forEach((t, k) => {
    const x = half(X(t.place));
    body += `<path class="${P}-tl-tick" d="M${r2(x)} ${y0}V${r2(y0 + s("1-5"))}"/>`;
    const daily = /day|week|month|year/.test(t.step);
    const midnight = clockOf(t.value, p.zone) === "00:00";
    const sub = /\bs$/.test(t.step);
    const label = daily || midnight ? dateWords(wallDay(t.value, p.zone)) : k === 0 && crosses ? `${dateWords(wallDay(t.value, p.zone))}, ${clockOf(t.value, p.zone, sub)}` : clockOf(t.value, p.zone, sub);
    const w = measure(label, "tab");
    const lo = x - w / 2 - s("1"), hi = x + w / 2 + s("1");
    if (downs.some((d) => d >= lo && d <= hi) || breakBoxes.some(([a, b]) => lo < b && hi > a)) return;
    body += `<text class="${P}-tl-tick-text" x="${r2(x)}" y="${r2(y0 + s("2") + 8)}" text-anchor="middle" dominant-baseline="central">${escapeHtml(label)}</text>`;
  });
  for (const q of seats) body += `<circle class="${P}-tl-dot" data-for="${escapeHtml(p.events[q.k]!.id)}" cx="${r2(half(rtl ? width - q.x : q.x))}" cy="${y0}" r="${tk.dot / 2}"/>`;
  // The zone's short name, space-3 after the axis' end, on its line, Mono tertiary (an identifier).
  body += `<text class="${P}-tl-zone" x="${r2(rtl ? f.axisL - s("3") : f.axisR + s("3"))}" y="${y0}" text-anchor="${rtl ? "end" : "start"}" dominant-baseline="central">${escapeHtml(p.zoneShort)}</text>`;
  void tw;
  return { geo, ink: svgOf(P, geo, body) };
}

/** Stacked: a rail at space-3 from the start, 1px between two marks, a size-dot dot a card on its first line and a 1px tick to the card; the rail stops across a break. */
function stackInk(el: HTMLElement, m: Model, P: string, tk: ExtMeasureKit["tk"]): { geo: Geo; ink: string } {
  const geo = blank(el);
  const origin = el.getBoundingClientRect();
  const rtl = Boolean(m.rtl);
  const s = tk.space;
  const rail = rtl ? geo.w - s("3") - 0.5 : s("3") + 0.5;
  let body = "", last: number | null = null;
  for (const child of el.children) {
    if (child.classList.contains(`${P}-tl-break`)) { last = null; continue; }
    if (!child.classList.contains(`${P}-node`)) continue;
    const r = rectOf(child, origin);
    const y = Math.round(r.t + s("2-5") + 8) + 0.5;
    const id = (child as HTMLElement).dataset.node ?? "";
    if (last !== null) body += `<path class="${P}-tl-stem" d="M${r2(rail)} ${r2(last + tk.dot / 2)}V${r2(y - tk.dot / 2)}"/>`;
    body += `<path class="${P}-tl-stem" data-for="${escapeHtml(id)}" d="M${r2(rail + (rtl ? -1 : 1) * tk.dot / 2)} ${y}H${r2(rtl ? r.r : r.l)}"/>`;
    body += `<circle class="${P}-tl-dot" data-for="${escapeHtml(id)}" cx="${r2(rail)}" cy="${y}" r="${tk.dot / 2}"/>`;
    last = y;
  }
  return { geo, ink: svgOf(P, geo, body) };
}

function keyTarget(m: Model, from: string, key: string, drawn: boolean, rtl: boolean): string | null {
  const i = m.byId.get(from)?.i ?? 0, n = m.nodes.length;
  // ← → the event before and after in time: physical keys, so they swap right to left. Stacked, the arrows are the time order.
  const fwd = drawn ? (key === "ArrowRight" ? !rtl : key === "ArrowLeft" ? rtl : null) : key === "ArrowDown" || key === "ArrowRight" ? true : key === "ArrowUp" || key === "ArrowLeft" ? false : null;
  const to = key === "Home" ? 0 : key === "End" ? n - 1 : fwd === null ? null : i + (fwd ? 1 : -1);
  return to === null ? null : m.nodes[Math.max(0, Math.min(n - 1, to))]?.id ?? null;
}

let made: DiagramTypeExt | undefined;
/** The timeline's module, made at its first use. */
export function timelineType(): DiagramTypeExt {
  return (made ??= {
    type: "timeline",
    build,
    stop: "an event",
    sentence: writeSentence,
    key,
    list,
    drawing,
    least: (_m, tk) => tk.wide,
    layout,
    keyTarget,
    hasStops: (_m, dyn) => Boolean(dyn.layout && !dyn.bare),
    traces: () => false,
    hint: (m, drawn) => [{ keys: drawn ? ["←", "→"] : ["↑", "↓"], words: "an event" }, { keys: ["Home", "End"], words: "the ends" }, ...(m.nodes.some((n) => n.href) ? [{ keys: ["Enter"], words: "open" }] : [])],
    keys: (m, drawn) => `${drawn ? "Left and right arrows move to the event before or after in time" : "Arrow keys move to the event before or after in time"}; Home and End go to the first and the last.${m.nodes.some((n) => n.href) ? " Enter opens an event that is a link." : ""}`,
    rootStyle: (_m, dyn) => { const v = own(dyn.place, ""); return v ? [v] : []; },
  });
}
