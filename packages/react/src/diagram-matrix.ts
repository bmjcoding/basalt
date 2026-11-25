// The matrix types (DECISIONS 359, Planning 1.0 and 1.2 to 1.5): kanban, journey, service blueprint and story map, on one core. Equal tracks space-4 apart,
// a row-label column where the type has one, the fit measured on content (a track is size-diagram-node or the widest unbreakable thing in any column), one
// DOM for both forms switched by the engine's --_drawn, an empty cell that holds its track and says so in words. Their components hand this module to the
// engine on the spec, so an app that draws an architecture bundles none of it. Nothing runs at load. The implementation has not been reviewed.

import { h, iso, lineSwatch, rectOf, sentence, svgA, txt } from "./diagram-core";
import type { DiagramLineKind, DiagramSpec, DiagramTypeExt, Dyn, ExtBuildKit, ExtBuilt, ExtMeasureKit, Geo, GLine, Measured, MEdge, MNode, Model, Pt, Tokens, VAttrs, VChild, VElement, VNode } from "./diagram-core";

// ============================================================================================================================================
// Public shapes
// ============================================================================================================================================

export interface KanbanColumn { id: string; label: string; limit?: number; more?: number; note?: string }
export interface KanbanCard { id: string; column: string; name: string; kind?: string; detail?: string; detailMono?: boolean; blocked?: string; focal?: boolean; href?: string; target?: "_blank" }
export interface KanbanLabels { max?: string; overLimit?: string; blocked?: string; noCards?: string; notShown?: string; keyOver?: string }

export type JourneyLevel = 1 | 2 | 3 | 4 | 5;
export interface JourneyStage {
  id: string; name: string; level: JourneyLevel; actions: string;
  quote?: string; touchpoint?: string; friction?: string; opportunity?: string;
  focal?: boolean; href?: string; target?: "_blank";
}
export interface JourneyLabels { stage?: string; none?: string; actions?: string; quote?: string; touchpoints?: string; friction?: string; opportunity?: string }

export type BlueprintLayer = "evidence" | "customer" | "frontstage" | "backstage" | "support";
export interface BlueprintStage { id: string; name: string; time?: string }
export interface BlueprintCell { stage: string; layer: BlueprintLayer; name: string; detail?: string; detailMono?: boolean; focal?: boolean; href?: string; target?: "_blank" }
export interface BlueprintArrow { from: { stage: string; layer: BlueprintLayer }; to: { stage: string; layer: BlueprintLayer }; kind?: "main" | "plain" }
export interface BlueprintRuleLabels { interaction?: string; visibility?: string; internal?: string }
export interface BlueprintLabels { stage?: string; none?: string; keyVisibility?: string; keyInteraction?: string; keyInternal?: string }

export interface StoryActivity { id: string; name: string; steps?: string[] }
export interface StorySlice { id: string; label: string }
export interface StoryCard { id: string; activity: string; slice: string; name: string; kind?: string; detail?: string; detailMono?: boolean; focal?: boolean; href?: string; target?: "_blank" }
export interface StoryCut { after: string; label: string }
export interface StoryMapLabels { activity?: string; noStories?: string; backbone?: string; story?: { one: string; other: string } }

// ============================================================================================================================================
// Shared
// ============================================================================================================================================

const r2 = (n: number) => Math.round(n * 100) / 100;
type Labels<T> = { [K in keyof T]-?: T[K] };
const wordsOf = <T extends object>(spec: DiagramSpec, defaults: Labels<T>): Labels<T> => {
  const given = (spec.labels ?? {}) as Partial<T>;
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as Array<keyof T>) if (given[k] !== undefined && given[k] !== null && given[k] !== "") out[k] = given[k] as Labels<T>[keyof T];
  return out;
};
const linkAttrs = (href?: string, blank?: boolean): VAttrs => ({ href, target: href && blank ? "_blank" : undefined, rel: href && blank ? "noopener noreferrer" : undefined, "data-link": href ? (blank ? "external" : "") : undefined });
const stopIndex = (dyn: Dyn, id: string) => (dyn.layout && !dyn.bare ? (dyn.stop === id ? 0 : -1) : dyn.keep === id ? -1 : undefined);

/** A part that is a stop: the shipped node, named by its sentence. */
function stop(P: string, m: Model, n: MNode, dyn: Dyn, level: number | undefined, extra: VAttrs, ...kids: VChild[]): VElement {
  return h(n.href ? "a" : "div", {
    class: `${P}-node`, ...linkAttrs(n.href, n.blank), "data-node": n.id, "data-focal": n.focal ? "" : undefined, "data-level": level,
    role: n.href ? undefined : "img", "aria-label": m.ext!.sentence!(m, n), tabindex: stopIndex(dyn, n.id), ...extra,
  }, ...kids);
}
/** A node's own words: its kind line, its name and its detail, as the shipped node writes them. */
function nodeWords(P: string, n: { kind?: string; name: string; detail?: string; mono?: boolean }, kindLine?: VChild): VChild[] {
  return [
    kindLine ?? (n.kind ? h("span", { class: `${P}-kind` }, iso(n.kind)) : null),
    h("span", { class: `${P}-name` }, iso(n.name)),
    n.detail ? h("span", { class: `${P}-detail`, "data-mono": n.mono ? "" : undefined }, n.mono ? h("span", { class: `${P}-runs` }, n.detail.split(/\s+/).filter(Boolean).flatMap((w, j) => [j ? " " : "", h("span", { class: `${P}-run` }, w)])) : iso(n.detail)) : null,
  ];
}
const entry = (P: string, swatch: VElement, words: string, attrs: VAttrs = {}) => h("li", { class: `${P}-entry`, ...attrs }, swatch, h("span", null, iso(words)));
const keyOf = (P: string, entries: VElement[]) => (entries.length ? h("div", { class: `${P}-key` }, h("ul", { class: `${P}-legend`, "aria-label": "Key" }, entries)) : null);
const focalSwatch = (P: string) => h("svg", { class: `${P}-swatch`, "data-shape": "focal", ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-shape`, x: 0.5, y: 2.5, width: 15, height: 11, rx: 2 }));
const ruleSwatch = (P: string, kind: "main" | "dashed" | "slot" | "contour") =>
  kind === "slot" || kind === "contour"
    ? h("svg", { class: `${P}-swatch`, ...svgA(16, 16) }, h("rect", { class: kind === "slot" ? `${P}-swatch-slot` : `${P}-swatch-contour`, x: 0.5, y: 2.5, width: 15, height: 11, rx: 3 }))
    : h("svg", { class: `${P}-swatch`, ...svgA(24, 16) }, h("path", { class: kind === "main" ? `${P}-swatch-rule` : `${P}-swatch-dash`, d: kind === "main" ? "M0 8H24" : "M0 8.5H24" }));

/** The words a track must hold whole: each word of each string, measured in its face. */
function widestOf(measure: ExtMeasureKit["measure"], parts: Array<[string | undefined, Parameters<ExtMeasureKit["measure"]>[1], boolean?]>): number {
  let out = 0;
  for (const [text, font, whole] of parts) {
    if (!text) continue;
    for (const w of whole ? [text] : text.split(/\s+/)) if (w) out = Math.max(out, measure(w, font));
  }
  return Math.ceil(out);
}

/**
 * The fit (1.0): the label column (or none), plus the tracks at their least, plus the gaps, never under 640. A track's least is size-diagram-node or the
 * widest unbreakable thing in any column plus a card's padding; the label column is size-diagram-lane or its widest unbreakable label.
 */
function fit(tk: Tokens, columns: number, track: number, label: number | null): number {
  const gap = tk.space("4");
  return Math.max(tk.wide, (label === null ? 0 : label + gap) + columns * Math.max(tk.node, track) + (columns - 1) * gap);
}

/** The layout every matrix type takes: drawn at its least drawn width or wider, otherwise stacked; the ink is the type's. */
function matrixLayout(ink?: (el: HTMLElement, m: Model, P: string, tk: Tokens, drawn: boolean) => { geo: Geo; ink: string }) {
  return (m: Model, kit: ExtMeasureKit): Measured => {
    const least = m.ext!.least!(m, kit.tk, kit.measure);
    const label = labelColumn(m, kit.tk, kit.measure);
    const drawn = kit.W >= least;
    const dyn = kit.stopOf({ ...kit.current, layout: drawn ? "drawn" : "stacked", bare: undefined, place: label ? { "": `--_lab:${label}px` } : undefined });
    kit.apply(dyn);
    const made = ink ? ink(kit.drawing, m, kit.P, kit.tk, drawn) : { geo: blankGeo(kit.drawing), ink: "" };
    return { dyn, geo: made.geo, ink: made.ink, tokens: kit.tk, least };
  };
}
const blankGeo = (el: HTMLElement): Geo => ({ w: el.clientWidth, h: el.clientHeight, nodes: [], lines: [], lifelines: [], labels: [], crossings: [], through: [], unseated: [], outside: [], ox: 0, oy: 0 });

/** The label column's width, measured: size-diagram-lane or its widest unbreakable label. Null for a kanban, which has none. */
function labelColumn(m: Model, tk: Tokens, measure: ExtMeasureKit["measure"]): number | null {
  const p = m.plan as { labelWords?: Array<[string, Parameters<ExtMeasureKit["measure"]>[1]]> };
  if (!p.labelWords) return null;
  return Math.max(tk.lane, widestOf(measure, p.labelWords) + tk.space("3"));
}

const hintFour = (m: Model, drawn: boolean, noun: string) => [{ keys: drawn && m.cols > 1 && m.rows > 1 ? ["←", "↑", "↓", "→"] : drawn ? ["←", "→"] : ["↑", "↓"], words: `a ${noun}` }, { keys: ["Home", "End"], words: "the ends" }, ...(m.nodes.some((n) => n.href) ? [{ keys: ["Enter"], words: "open" }] : [])];
const keysWords = (m: Model, drawn: boolean, noun: string) => `${drawn ? `Arrow keys move to the nearest ${noun} in that direction` : `Arrow keys move to the next or the previous ${noun}`}; Home and End go to the ends.${m.nodes.some((n) => n.href) ? ` Enter opens a ${noun} that is a link.` : ""}`;
const rootPlace = (_m: Model, dyn: Dyn) => { const v = dyn.place?.[""]; return v ? [v] : []; };
const listStrong = (s: string) => h("strong", null, iso(s));
const focalWords = (m: Model, focal: boolean) => (focal && m.legend.focal ? ` ${sentence(m.legend.focal)}` : "");
const card = (raw: { id?: unknown; name?: unknown; kind?: unknown; detail?: unknown; detailMono?: unknown; focal?: unknown; href?: unknown; target?: unknown }) =>
  ({ id: String(raw.id ?? ""), name: String(raw.name ?? ""), kind: txt(raw.kind), detail: txt(raw.detail), mono: Boolean(raw.detailMono), focal: Boolean(raw.focal), href: txt(raw.href), blank: raw.target === "_blank" });
const mnode = (c: ReturnType<typeof card>, i: number, col: number, row: number): MNode => ({ id: c.id, i, name: c.name, kind: c.kind, detail: c.detail, mono: c.mono, focal: c.focal, col, row, row2: row, branch: false, shape: "box", href: c.href, blank: c.blank });
function checkIds(kit: ExtBuildKit, ids: string[]) {
  if (!kit.dev) return;
  const seen = new Set<string>();
  for (const id of ids) { if (!id) kit.warn("a part has no id"); else if (seen.has(id)) kit.warn(`the id "${id}" is used twice`); seen.add(id); }
}

// ============================================================================================================================================
// Kanban (1.2): a count of cards in states at one moment. Read-only: nothing drags.
// ============================================================================================================================================

interface KCol { id: string; label: string; limit?: number; more: number; note?: string; count: number; over: boolean; cards: KCard[]; c: number }
interface KCard extends ReturnType<typeof card> { column: string; blocked?: string }
interface KanbanPlan { columns: KCol[]; words: Labels<KanbanLabels> }
const kplan = (m: Model) => m.plan as KanbanPlan;

function countWords(p: KanbanPlan, c: KCol): string {
  const base = c.limit !== undefined ? `${c.count}, ${p.words.max} ${c.limit}` : String(c.count);
  return c.over ? `${base} · ${p.words.overLimit}` : base;
}

function buildKanban(spec: DiagramSpec, kit: ExtBuildKit): ExtBuilt {
  const words = wordsOf<KanbanLabels>(spec, { max: "max", overLimit: "Over limit", blocked: "Blocked", noCards: "No cards", notShown: "not shown", keyOver: "Over its limit" });
  if (kit.dev && Array.isArray(spec.edges) && spec.edges.length) kit.error("a kanban draws no lines: it is a count of cards at one moment");
  const columns: KCol[] = (Array.isArray(spec.columns) ? spec.columns : []).map((raw, k) => {
    const c = raw as KanbanColumn;
    const limit = typeof c.limit === "number" && Number.isInteger(c.limit) && c.limit > 0 ? c.limit : undefined;
    const more = typeof c.more === "number" && Number.isInteger(c.more) && c.more > 0 ? c.more : 0;
    return { id: String(c.id ?? ""), label: String(c.label ?? ""), limit, more, note: txt(c.note), count: 0, over: false, cards: [], c: k + 1 };
  });
  const byCol = new Map(columns.map((c) => [c.id, c]));
  for (const raw of (Array.isArray(spec.cards) ? spec.cards : []) as KanbanCard[]) {
    const col = byCol.get(String(raw.column ?? ""));
    if (!col) { kit.dev && kit.warn(`the card ${String(raw.id)} names the column "${String(raw.column)}", which is not in columns`); continue; }
    if (kit.dev && "state" in (raw as object)) kit.error(`the card ${String(raw.id)} has a "state": a kanban card is blocked (with its reason) or in its column, nothing more`);
    col.cards.push({ ...card(raw), column: col.id, blocked: txt(raw.blocked) });
  }
  // The count is every card in the column: the cards drawn plus `more` (1.2).
  for (const c of columns) { c.count = c.cards.length + c.more; c.over = c.limit !== undefined && c.count > c.limit; }
  const nodes: MNode[] = [];
  for (const c of columns) c.cards.forEach((x, k) => nodes.push(mnode(x, nodes.length, c.c, k + 1)));
  checkIds(kit, nodes.map((n) => n.id));
  if (kit.dev && nodes.filter((n) => n.focal).length > 1) kit.warn("more than one card is focal: a kanban has one at most");
  return { nodes, edges: [], plan: { columns, words } satisfies KanbanPlan, cols: Math.max(1, columns.length), rows: Math.max(1, ...columns.map((c) => c.cards.length)) };
}
const kcard = (m: Model, id: string) => { for (const c of kplan(m).columns) { const x = c.cards.find((y) => y.id === id); if (x) return { col: c, card: x }; } return null; };

function kanbanSentence(m: Model, n: MNode): string {
  const p = kplan(m), found = kcard(m, n.id)!;
  const { col, card: c } = found;
  const parts = [sentence(c.kind ? `${c.name}, ${c.kind}` : c.name), `In ${col.label}: ${countWords(p, col).replace(" · ", ", ").toLowerCase()}.`];
  if (c.blocked) parts.push(`${p.words.blocked}: ${sentence(c.blocked)}`);
  if (c.detail) parts.push(sentence(c.detail));
  if (c.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

function kanbanDrawing(P: string, m: Model, dyn: Dyn, level?: number): VNode[] {
  const p = kplan(m);
  return p.columns.map((col) => h("section", { class: `${P}-kanban-col`, "data-over": col.over ? "" : undefined },
    h("div", { class: `${P}-kanban-head`, style: `--_c:${col.c}` },
      h("span", { class: `${P}-kanban-top` },
        h("span", { class: `${P}-kanban-title` }, iso(col.label)),
        h("span", { class: `${P}-kanban-count` }, iso(countWords(p, col)))),
      col.note ? h("span", { class: `${P}-kanban-note` }, iso(col.note)) : null),
    h("div", { class: `${P}-kanban-cards`, style: `--_c:${col.c}` },
      col.cards.map((c) => {
        const n = m.byId.get(c.id)!;
        return stop(P, m, n, dyn, level, { class: `${P}-node ${P}-kanban-card`, "data-blocked": c.blocked ? "" : undefined },
          c.blocked ? h("span", { class: `${P}-kanban-blocked` }, iso(`${p.words.blocked} · ${c.blocked}`)) : null,
          ...nodeWords(P, c));
      }),
      !col.cards.length && !col.more ? h("span", { class: `${P}-empty` }, iso(p.words.noCards)) : null,
      col.more ? h("span", { class: `${P}-kanban-more` }, iso(`${col.more} more ${p.words.notShown}`)) : null)));
}

function kanbanKey(P: string, m: Model): VElement | null {
  const p = kplan(m);
  const out: VElement[] = [];
  if (p.columns.some((c) => c.over)) out.push(entry(P, ruleSwatch(P, "main"), p.words.keyOver));
  if (p.columns.some((c) => c.cards.some((x) => x.blocked && !x.focal))) out.push(entry(P, h("svg", { class: `${P}-swatch`, ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-blocked`, x: 0.5, y: 2.5, width: 15, height: 11, rx: 3 })), p.words.blocked));
  if (m.nodes.some((n) => n.focal) && m.legend.focal) out.push(entry(P, focalSwatch(P), m.legend.focal, { "data-focal": "" }));
  return keyOf(P, out);
}

function kanbanList(P: string, m: Model): VNode[] {
  const p = kplan(m);
  const sub = Math.min(6, m.heading + 1);
  return p.columns.flatMap((col) => [
    h(`h${sub}`, { class: `${P}-list-head` }, iso(col.label), `: ${countWords(p, col)}`),
    h("ul", { class: `${P}-list-items` }, [
      ...col.cards.map((c) => h("li", null, listStrong(c.name), c.kind ? `, ${c.kind}` : "", c.detail ? `. ${sentence(c.detail)}` : ".", c.blocked ? ` ${p.words.blocked}: ${sentence(c.blocked)}` : "", focalWords(m, c.focal))),
      ...(col.more ? [h("li", null, `${col.more} more ${p.words.notShown}.`)] : []),
      ...(!col.cards.length && !col.more ? [h("li", null, `${p.words.noCards}.`)] : []),
    ]),
  ]);
}

function kanbanLeast(m: Model, tk: Tokens, measure: ExtMeasureKit["measure"]): number {
  const p = kplan(m);
  const pad = 2 * tk.space("3") + 2 * tk.hair;
  let track = tk.node;
  for (const col of p.columns) {
    // A head's count is never broken, and an over-limit count is 600.
    track = Math.max(track, widestOf(measure, [[col.label, "name"], [col.note, "sans"]]), Math.ceil(measure(countWords(p, col), col.over ? "xs-600" : "tab")));
    for (const c of col.cards) track = Math.max(track, pad + widestOf(measure, [[c.name, "name"], [c.kind, "mono"], [c.detail, c.mono ? "mono" : "sans"], [c.blocked ? `${p.words.blocked} ·` : undefined, "xs-600"], [c.blocked, "xs-600"]]));
  }
  return fit(tk, p.columns.length, track, null);
}

// ============================================================================================================================================
// Journey (1.3): one actor in one scenario, a scale of five steps the author names, the chart's line.
// ============================================================================================================================================

type JField = "actions" | "quote" | "touchpoint" | "friction" | "opportunity";
const J_FIELDS: JField[] = ["actions", "quote", "touchpoint", "friction", "opportunity"];
interface JStage { id: string; i: number; name: string; level: number; levelWord: string; fields: Partial<Record<JField, string>>; focal: boolean; href?: string; blank?: boolean }
interface JourneyPlan { actor: string; scenario: string; scale: string[]; stages: JStage[]; bands: JField[]; words: Labels<JourneyLabels>; labelWords: Array<[string, "label" | "sans" | "xs-500"]> }
const jplan = (m: Model) => m.plan as JourneyPlan;
const bandWord = (p: JourneyPlan, f: JField) => (f === "touchpoint" ? p.words.touchpoints : p.words[f]);

function buildJourney(spec: DiagramSpec, kit: ExtBuildKit): ExtBuilt {
  const words = wordsOf<JourneyLabels>(spec, { stage: "Stage", none: "None", actions: "Actions", quote: "Quote", touchpoints: "Touchpoints", friction: "Friction", opportunity: "Opportunity" });
  const actor = txt(spec.actor), scenario = txt(spec.scenario);
  if (kit.dev && (!actor || !scenario)) kit.error("a journey needs its actor and its scenario: it is one actor in one scenario");
  const scaleIn = Array.isArray(spec.scale) ? spec.scale.map(String) : [];
  if (kit.dev && scaleIn.length !== 5) kit.error("a journey's scale is five words, lowest first, in the author's own words");
  const scale = scaleIn.length === 5 ? scaleIn : ["1", "2", "3", "4", "5"];
  const legendIn = (spec.legend ?? {}) as { line?: unknown };
  if (kit.dev && !txt(legendIn.line)) kit.error("a journey's line needs its words (legend.line): the key must say what the scale measures");
  const stages: JStage[] = (Array.isArray(spec.stages) ? spec.stages : []).map((raw, i) => {
    const s = raw as JourneyStage;
    const lv = Number(s.level);
    const level = Number.isInteger(lv) && lv >= 1 && lv <= 5 ? lv : (kit.dev && kit.error(`the stage ${String(s.id)}'s level is ${JSON.stringify(s.level)}, not 1 to 5`), 3);
    const fields: JStage["fields"] = {};
    for (const f of J_FIELDS) { const v = txt((s as unknown as Record<string, unknown>)[f]); if (v) fields[f] = v; }
    return { id: String(s.id ?? ""), i, name: String(s.name ?? ""), level, levelWord: scale[level - 1]!, fields, focal: Boolean(s.focal), href: txt(s.href), blank: s.target === "_blank" };
  });
  const bands = J_FIELDS.filter((f) => stages.some((s) => s.fields[f]));
  const nodes: MNode[] = stages.map((s) => ({ id: s.id, i: s.i, name: s.name, mono: false, focal: s.focal, col: s.i + 1, row: 1, row2: 1, branch: false, shape: "box", href: s.href, blank: s.blank }));
  checkIds(kit, nodes.map((n) => n.id));
  if (kit.dev && nodes.filter((n) => n.focal).length > 1) kit.warn("more than one stage is focal: a journey has one at most");
  const labelWords: JourneyPlan["labelWords"] = [...bands.map((f) => [bandWord({ words } as JourneyPlan, f), "xs-500"] as [string, "xs-500"]), ...scale.map((w) => [w, "tab"] as [string, "tab"])] as JourneyPlan["labelWords"];
  const plan: JourneyPlan = { actor: actor ?? "", scenario: scenario ?? "", scale, stages, bands, words, labelWords };
  return { nodes, edges: [], plan, cols: Math.max(1, stages.length), rows: 1 };
}
const jstage = (m: Model, id: string) => jplan(m).stages.find((s) => s.id === id)!;

function journeySentence(m: Model, n: MNode): string {
  const p = jplan(m), s = jstage(m, n.id);
  const parts = [`${p.words.stage} ${s.i + 1} of ${p.stages.length}, ${s.name}: ${s.levelWord}.`];
  for (const f of J_FIELDS) if (s.fields[f]) parts.push(`${bandWord(p, f)}: ${f === "quote" ? `“${s.fields[f]}”` : sentence(s.fields[f]!)}`);
  if (s.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

function journeyMeta(P: string, m: Model): VElement | null {
  const p = jplan(m);
  if (!p.actor && !p.scenario) return null;
  return h("p", { class: `${P}-meta` }, h("span", { class: `${P}-meta-first` }, iso(p.actor)), p.scenario ? [" · ", iso(p.scenario)] : null);
}

function journeyDrawing(P: string, m: Model, dyn: Dyn, level?: number): VNode[] {
  const p = jplan(m);
  const out: VNode[] = [];
  // Row 2, the plot: the five levels' words in the label column (stacked, the top, middle and bottom in the strip's own), the stage numbers under the
  // strip (stacked only); the line, its discs and the level lines are the ink's.
  out.push(h("div", { class: `${P}-journey-plot`, style: `--_cols:${p.stages.length}`, "aria-hidden": "true" },
    h("span", { class: `${P}-journey-levels` }, [...p.scale].map((w, k) => h("span", { class: `${P}-journey-level`, style: `--_lv:${k + 1}`, "data-edge": k === 0 || k === 2 || k === 4 ? "" : undefined }, iso(w))).reverse()),
    h("span", { class: `${P}-journey-track` }, p.stages.map((s) => h("span", { class: `${P}-journey-slot`, "data-stage": s.id, "data-focal": s.focal ? "" : undefined, style: `--_c:${s.i + 1}`, "data-lv": s.level }, String(s.i + 1))))));
  // The band labels, drawn only, each in the label column on its row.
  p.bands.forEach((f, k) => out.push(h("span", { class: `${P}-matrix-label`, style: `--_r:${k + 3}`, "aria-hidden": "true" }, iso(bandWord(p, f)))));
  for (const s of p.stages) {
    const n = m.byId.get(s.id)!;
    const c = s.i + 2;
    out.push(h("section", { class: `${P}-journey-stage`, "data-focal": s.focal ? "" : undefined },
      stop(P, m, n, dyn, level, { class: `${P}-node ${P}-journey-head`, style: `--_c:${c};--_r:1;--_r2:2` },
        h("span", { class: `${P}-kind` }, iso(`${p.words.stage} ${s.i + 1}`), h("span", { class: `${P}-journey-word` }, iso(s.levelWord))),
        h("span", { class: `${P}-name` }, iso(s.name))),
      p.bands.map((f, k) => {
        const v = s.fields[f];
        return h("div", { class: `${P}-journey-cell`, "data-empty": v ? undefined : "", style: `--_c:${c};--_r:${k + 3}` },
          h("span", { class: `${P}-journey-cell-label`, "aria-hidden": "true" }, iso(bandWord(p, f))),
          v ? (f === "quote" ? h("q", { class: `${P}-journey-value` }, iso(v)) : h("span", { class: `${P}-journey-value` }, iso(v))) : h("span", { class: `${P}-empty` }, iso(p.words.none)));
      })));
  }
  return out;
}

function journeyInk(el: HTMLElement, m: Model, P: string, tk: Tokens, drawn: boolean): { geo: Geo; ink: string } {
  const p = jplan(m);
  const geo = blankGeo(el);
  const origin = el.getBoundingClientRect();
  const ox = origin.left - Math.floor(origin.left), oy = origin.top - Math.floor(origin.top);
  const track = el.querySelector<HTMLElement>(`.${P}-journey-track`);
  if (!track) return { geo, ink: "" };
  const tr = rectOf(track, origin);
  const s = tk.space;
  // Drawn: five levels space-8 apart with space-4 above and below. Stacked, the strip: space-6 apart, with the numbers under it.
  const pitch = drawn ? s("8") : s("6");
  const top = tr.t + (drawn ? s("4") : s("2"));
  const yOf = (lv: number) => top + (5 - lv) * pitch;
  const half = (v: number, o: number) => Math.round(v + o - 0.5) + 0.5 - o;
  const whole = (v: number, o: number) => Math.round(v + o) - o;
  // The levels' lines span the track and the label column's level words; the labels column is the plot's own start.
  const plot = rectOf(el.querySelector<HTMLElement>(`.${P}-journey-plot`)!, origin);
  let svg = "";
  for (let lv = 1; lv <= 5; lv++) if (drawn || lv === 1 || lv === 3 || lv === 5) svg += `<path class="${P}-journey-grid" d="M${r2(m.rtl ? plot.l : tr.l)} ${r2(half(yOf(lv), oy))}H${r2(m.rtl ? tr.r : tr.r)}"/>`;
  // The discs at each stage's column centre: drawn, the head's measured column; stacked, the strip's slot.
  const xs = p.stages.map((st) => {
    const head = drawn ? el.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(st.id)}"]`) : el.querySelector<HTMLElement>(`.${P}-journey-slot[data-stage="${CSS.escape(st.id)}"]`);
    const r = head ? rectOf(head, origin) : tr;
    return whole((r.l + r.r) / 2, ox);
  });
  const pts: Pt[] = p.stages.map((st, k) => ({ x: xs[k]!, y: whole(yOf(st.level), oy) }));
  if (pts.length > 1) svg += `<path class="${P}-journey-line" d="M${pts.map((q) => `${r2(q.x)} ${r2(q.y)}`).join("L")}"/>`;
  const rad = tk.dot / 2 + 1;
  for (const q of pts) svg += `<circle class="${P}-journey-cut" cx="${r2(q.x)}" cy="${r2(q.y)}" r="${r2(rad + tk.cut)}"/><circle class="${P}-journey-disc" cx="${r2(q.x)}" cy="${r2(q.y)}" r="${r2(rad)}"/>`;
  return { geo, ink: `<svg class="${P}-svg" width="${geo.w}" height="${geo.h}" viewBox="0 0 ${geo.w} ${geo.h}" focusable="false">${svg}</svg>` };
}

function journeyKey(P: string, m: Model): VElement | null {
  const out: VElement[] = [];
  const line = txt((m.legend as { line?: string }).line);
  out.push(entry(P, h("svg", { class: `${P}-swatch`, ...svgA(24, 16) }, h("path", { class: `${P}-journey-line`, d: "M0 11L12 5L24 11" }), h("circle", { class: `${P}-journey-cut`, cx: 12, cy: 5, r: 6 }), h("circle", { class: `${P}-journey-disc`, cx: 12, cy: 5, r: 4 })), line ?? ""));
  if (m.nodes.some((n) => n.focal) && m.legend.focal) out.push(entry(P, focalSwatch(P), m.legend.focal, { "data-focal": "" }));
  return keyOf(P, out);
}

function journeyList(P: string, m: Model): VNode[] {
  const p = jplan(m);
  return [h("ol", { class: `${P}-list-items` }, p.stages.map((s) => h("li", null, listStrong(s.name), `: ${s.levelWord}.`,
    J_FIELDS.filter((f) => s.fields[f]).map((f) => [` ${bandWord(p, f)}: `, f === "quote" ? h("q", null, iso(s.fields[f]!)) : sentence(s.fields[f]!)]), focalWords(m, s.focal))))];
}

function journeyLeast(m: Model, tk: Tokens, measure: ExtMeasureKit["measure"]): number {
  const p = jplan(m);
  const pad = 2 * tk.space("3") + 2 * tk.hair;
  let track = tk.node;
  for (const s of p.stages) {
    track = Math.max(track, pad + widestOf(measure, [[s.name, "name"]]));
    track = Math.max(track, pad + Math.ceil(measure(`${p.words.stage} ${s.i + 1}`, "mono") + tk.space("2") + measure(s.levelWord, "tab")));
    for (const f of p.bands) track = Math.max(track, widestOf(measure, [[s.fields[f], "sm"]]));
  }
  return fit(tk, p.stages.length, track, labelColumn(m, tk, measure));
}

// ============================================================================================================================================
// Service blueprint (1.4): stages across, layers down, three rules in fixed gaps, each named on the rule.
// ============================================================================================================================================

const LAYERS: BlueprintLayer[] = ["evidence", "customer", "frontstage", "backstage", "support"];
const LAYER_WORDS: Record<BlueprintLayer, string> = { evidence: "Evidence", customer: "Customer", frontstage: "Frontstage", backstage: "Backstage", support: "Support" };
type Rule = "interaction" | "visibility" | "internal";
interface BCell { id: string; stage: number; layer: BlueprintLayer; empty: boolean; name: string; detail?: string; mono: boolean; focal: boolean; href?: string; blank?: boolean }
interface BArrow { i: number; from: string; to: string; kind: "main" | "plain" }
interface BlueprintPlan {
  stages: Array<{ id: string; name: string; time?: string }>;
  layers: BlueprintLayer[];
  layerWords: Record<BlueprintLayer, string>;
  rules: Record<Rule, string>;
  cells: BCell[];
  arrows: BArrow[];
  words: Labels<BlueprintLabels>;
  labelWords: Array<[string, "xs-500" | "sans" | "xs-600"]>;
}
const bplan = (m: Model) => m.plan as BlueprintPlan;
/** The rule that sits above a layer, in its fixed gap: interaction above frontstage, visibility above backstage, internal above support. */
const ruleAbove = (l: BlueprintLayer): Rule | null => (l === "frontstage" ? "interaction" : l === "backstage" ? "visibility" : l === "support" ? "internal" : null);
const cellId = (stage: string, layer: string) => `${stage}:${layer}`;

function buildBlueprint(spec: DiagramSpec, kit: ExtBuildKit): ExtBuilt {
  const words = wordsOf<BlueprintLabels>(spec, { stage: "Stage", none: "None", keyVisibility: "the customer sees what is above it", keyInteraction: "", keyInternal: "" });
  const stages = (Array.isArray(spec.stages) ? spec.stages : []).map((raw) => { const s = raw as BlueprintStage; return { id: String(s.id ?? ""), name: String(s.name ?? ""), time: txt(s.time) }; });
  const rawCells = (Array.isArray(spec.cells) ? spec.cells : []) as BlueprintCell[];
  const used = new Set<BlueprintLayer>(["customer", "frontstage", "backstage"]);
  for (const c of rawCells) if (LAYERS.includes(c.layer)) used.add(c.layer); else kit.dev && kit.warn(`a cell names the layer "${String(c.layer)}", which is not evidence, customer, frontstage, backstage or support`);
  const layers = LAYERS.filter((l) => used.has(l));
  const lw = (spec.layerLabels ?? {}) as Partial<Record<BlueprintLayer, string>>;
  const layerWords = Object.fromEntries(LAYERS.map((l) => [l, txt(lw[l]) ?? LAYER_WORDS[l]])) as Record<BlueprintLayer, string>;
  const rw = (spec.ruleLabels ?? {}) as BlueprintRuleLabels;
  const rules: Record<Rule, string> = { interaction: txt(rw.interaction) ?? "Line of interaction", visibility: txt(rw.visibility) ?? "Line of visibility", internal: txt(rw.internal) ?? "Line of internal interaction" };
  const given = new Map<string, BlueprintCell>();
  for (const c of rawCells) { const k = cellId(String(c.stage), String(c.layer)); if (kit.dev && given.has(k)) kit.warn(`the cell ${k} is given twice`); given.set(k, c); }
  for (const k of given.keys()) if (kit.dev && !stages.some((s) => k.startsWith(`${s.id}:`))) kit.warn(`the cell ${k} names a stage that is not in stages`);
  // Every cell of the grid is a stop, an empty one included (1.4): "Cold sandbox, Frontstage: none".
  const cells: BCell[] = [];
  for (const [si, st] of stages.entries()) for (const layer of layers) {
    const raw = given.get(cellId(st.id, layer));
    const name = txt(raw?.name);
    cells.push({ id: cellId(st.id, layer), stage: si, layer, empty: !name, name: name ?? "", detail: name ? txt(raw!.detail) : undefined, mono: Boolean(raw?.detailMono), focal: Boolean(name && raw?.focal), href: name ? txt(raw?.href) : undefined, blank: raw?.target === "_blank" });
  }
  // The keys' order is the stage's column, then its layers: cell by cell down a stage.
  const nodes: MNode[] = cells.map((c, i) => ({ id: c.id, i, name: c.empty ? words.none : c.name, detail: c.detail, mono: c.mono, focal: c.focal, col: c.stage + 1, row: layers.indexOf(c.layer) + 1, row2: layers.indexOf(c.layer) + 1, branch: false, shape: "box", href: c.href, blank: c.blank }));
  const byId = new Map(cells.map((c) => [c.id, c]));
  const arrows: BArrow[] = [];
  const edges: MEdge[] = [];
  for (const a of (Array.isArray(spec.arrows) ? spec.arrows : []) as BlueprintArrow[]) {
    const from = cellId(String(a.from?.stage), String(a.from?.layer)), to = cellId(String(a.to?.stage), String(a.to?.layer));
    const f = byId.get(from), t = byId.get(to);
    if (!f || !t || f.empty || t.empty) { kit.dev && kit.error(`the arrow ${from} to ${to} names a cell that is empty or not drawn`); continue; }
    // A blueprint's arrows are main or plain (answer 1): dashed means its two lines of interaction alone.
    if ((a.kind as string) === "dashed") kit.dev && kit.error(`the arrow ${from} to ${to} is dashed: a blueprint's arrows are main or plain (its lines of interaction are the dashed marks), so it is drawn plain`);
    const sameStage = f.stage === t.stage && f.layer !== t.layer;
    const sameLayer = f.layer === t.layer && Math.abs(f.stage - t.stage) === 1;
    if (!sameStage && !sameLayer) { kit.dev && kit.error(`the arrow ${from} to ${to} joins two cells of neither one stage nor neighbouring stages of one layer, so it is not drawn`); continue; }
    const kind: "main" | "plain" = a.kind === "main" ? "main" : "plain";
    arrows.push({ i: arrows.length, from, to, kind });
    edges.push({ i: edges.length, from, to, kind });
  }
  if (kit.dev) {
    if (arrows.some((a) => a.kind === "main") && !kit.legend.main) kit.warn("main arrows are drawn but the legend has no words for them (legend.main)");
    if (arrows.some((a) => a.kind === "plain") && !kit.legend.plain) kit.warn("plain arrows are drawn but the legend has no words for them (legend.plain)");
    if (cells.filter((c) => c.focal).length > 1) kit.warn("more than one cell is focal: a blueprint has one at most");
  }
  const labelWords: BlueprintPlan["labelWords"] = layers.map((l) => [layerWords[l], "xs-500"] as [string, "xs-500"]);
  const plan: BlueprintPlan = { stages, layers, layerWords, rules, cells, arrows, words, labelWords };
  return { nodes, edges, plan, cols: Math.max(1, stages.length), rows: Math.max(1, layers.length) };
}
const bcell = (m: Model, id: string) => bplan(m).cells.find((c) => c.id === id)!;
const stageName = (p: BlueprintPlan, c: BCell) => p.stages[c.stage]!.name;

function blueprintSentence(m: Model, n: MNode): string {
  const p = bplan(m), c = bcell(m, n.id);
  if (c.empty) return `${stageName(p, c)}, ${p.layerWords[c.layer]}: ${p.words.none.toLowerCase()}.`;
  const parts = [`${c.name}. ${stageName(p, c)}, ${p.layerWords[c.layer]}.`];
  if (c.detail) parts.push(sentence(c.detail));
  const to = p.arrows.filter((a) => a.from === c.id).map((a) => bcell(m, a.to)).map((t) => `${t.name} (${t.stage === c.stage ? p.layerWords[t.layer] : stageName(p, t)})`);
  const from = p.arrows.filter((a) => a.to === c.id).map((a) => bcell(m, a.from)).map((f) => `${f.name} (${f.stage === c.stage ? p.layerWords[f.layer] : stageName(p, f)})`);
  if (from.length) parts.push(`From: ${from.join(", ")}.`);
  if (to.length) parts.push(`To: ${to.join(", ")}.`);
  if (c.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

/** A rule: its name at the start edge, space-3, then the line to the end (a 4 on 4 dash in diagram-structure, or the line of visibility, 2px solid). */
function ruleTree(P: string, rule: Rule, words: string, extra: VAttrs = {}): VElement {
  return h("div", { class: `${P}-bp-rule`, "data-rule": rule, "aria-hidden": "true", ...extra },
    h("span", { class: `${P}-bp-rule-name` }, iso(words)),
    h("svg", { class: `${P}-bp-rule-line`, height: 2, focusable: "false" }, h("line", { x1: 0, x2: "100%", y1: rule === "visibility" ? 1 : 0.5, y2: rule === "visibility" ? 1 : 0.5 })));
}

/** The drawn grid's rows: a head row, then each layer with a rule's row above it where the type puts one. */
function blueprintRows(p: BlueprintPlan): { layer: Map<BlueprintLayer, number>; rule: Map<Rule, number> } {
  const layer = new Map<BlueprintLayer, number>(), rule = new Map<Rule, number>();
  let r = 2;
  for (const l of p.layers) {
    const above = ruleAbove(l);
    if (above) rule.set(above, r++);
    layer.set(l, r++);
  }
  return { layer, rule };
}

function blueprintDrawing(P: string, m: Model, dyn: Dyn, level?: number): VNode[] {
  const p = bplan(m);
  const rows = blueprintRows(p);
  const out: VNode[] = [];
  // Drawn: the rules span the grid, each on its own row; the layers' names in the label column.
  for (const [rule, r] of rows.rule) out.push(ruleTree(P, rule, p.rules[rule], { "data-span": "", style: `--_r:${r}` }));
  for (const [l, r] of rows.layer) out.push(h("span", { class: `${P}-matrix-label`, style: `--_r:${r}`, "aria-hidden": "true" }, iso(p.layerWords[l])));
  p.stages.forEach((st, si) => {
    const c = si + 2;
    const kids: VChild[] = [h("div", { class: `${P}-bp-head`, style: `--_c:${c};--_r:1` },
      h("span", { class: `${P}-kind` }, iso(`${p.words.stage} ${si + 1}`), st.time ? h("span", { class: `${P}-bp-time` }, " · ", iso(st.time)) : null),
      h("span", { class: `${P}-name` }, iso(st.name)))];
    for (const l of p.layers) {
      const above = ruleAbove(l);
      // Stacked, all three rules are inside every stage, in their gaps.
      if (above) kids.push(ruleTree(P, above, p.rules[above], { "data-in": "" }));
      const cell = p.cells.find((x) => x.stage === si && x.layer === l)!;
      const n = m.byId.get(cell.id)!;
      const leaves = p.arrows.filter((a) => a.from === cell.id).map((a) => bcell(m, a.to));
      kids.push(stop(P, m, n, dyn, level, { class: `${P}-node ${P}-bp-cell`, "data-empty": cell.empty ? "" : undefined, style: `--_c:${c};--_r:${rows.layer.get(l)};--_r2:${rows.layer.get(l)! + 1}` },
        h("span", { class: `${P}-bp-layer`, "aria-hidden": "true" }, iso(p.layerWords[l])),
        h("span", { class: `${P}-bp-body` },
          cell.empty ? h("span", { class: `${P}-empty` }, iso(p.words.none)) : nodeWords(P, cell),
          // Stacked, an arrow is said: the cell it leaves ends with "→ " and the target's name (and its stage, where that is another one).
          leaves.map((t) => h("span", { class: `${P}-bp-to` }, `${m.rtl ? "←" : "→"} `, iso(t.stage === cell.stage ? t.name : `${t.name} (${stageName(p, t)})`))))));
    }
    out.push(h("section", { class: `${P}-bp-stage` }, kids));
  });
  return out;
}

function blueprintInk(el: HTMLElement, m: Model, P: string, tk: Tokens, drawn: boolean): { geo: Geo; ink: string } {
  const p = bplan(m);
  const geo = blankGeo(el);
  if (!drawn || !p.arrows.length) return { geo, ink: "" };
  const origin = el.getBoundingClientRect();
  geo.ox = origin.left - Math.floor(origin.left); geo.oy = origin.top - Math.floor(origin.top);
  const rect = (id: string) => { const e = el.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(id)}"]`); return e ? rectOf(e, origin) : null; };
  const snap = (v: number, o: number, w: number) => (w % 2 ? Math.round(v + o - 0.5) + 0.5 - o : Math.round(v + o) - o);
  for (const a of p.arrows) {
    const f = bcell(m, a.from), t = bcell(m, a.to);
    const r1 = rect(a.from), r2b = rect(a.to);
    if (!r1 || !r2b) continue;
    const w = a.kind === "main" ? tk.line : tk.hair;
    let pts: Pt[];
    let dir: GLine["dir"];
    if (f.stage === t.stage) {
      const down = p.layers.indexOf(t.layer) > p.layers.indexOf(f.layer);
      if (Math.abs(p.layers.indexOf(t.layer) - p.layers.indexOf(f.layer)) > 1) {
        // Through the column gutter where it passes a layer: out of the end side, along the gutter's middle, into the end side.
        const endX = m.rtl ? Math.min(r1.l, r2b.l) : Math.max(r1.r, r2b.r);
        const gx = snap(m.rtl ? endX - tk.space("2") : endX + tk.space("2"), geo.ox, w);
        const y1 = snap((r1.t + r1.b) / 2, geo.oy, w), y2 = snap((r2b.t + r2b.b) / 2, geo.oy, w);
        pts = [{ x: m.rtl ? r1.l : r1.r, y: y1 }, { x: gx, y: y1 }, { x: gx, y: y2 }, { x: m.rtl ? r2b.l : r2b.r, y: y2 }];
        dir = m.rtl ? "right" : "left";
      } else {
        const x = snap((Math.max(r1.l, r2b.l) + Math.min(r1.r, r2b.r)) / 2, geo.ox, w);
        pts = [{ x, y: down ? r1.b : r1.t }, { x, y: down ? r2b.t : r2b.b }];
        dir = down ? "down" : "up";
      }
    } else {
      const right = (t.stage > f.stage) !== Boolean(m.rtl);
      const y = snap((Math.max(r1.t, r2b.t) + Math.min(r1.b, r2b.b)) / 2, geo.oy, w);
      pts = [{ x: right ? r1.r : r1.l, y }, { x: right ? r2b.l : r2b.r, y }];
      dir = right ? "right" : "left";
    }
    geo.lines.push({ i: a.i, from: a.from, to: a.to, kind: a.kind, pts, tip: pts[pts.length - 1]!, dir, width: w });
  }
  const head = tk.head;
  const lines = geo.lines.map((l) => {
    const u = l.dir === "up" ? { x: 0, y: -1 } : l.dir === "down" ? { x: 0, y: 1 } : l.dir === "left" ? { x: -1, y: 0 } : { x: 1, y: 0 };
    const pts = l.pts.map((q) => ({ ...q }));
    const last = pts[pts.length - 1]!;
    last.x -= u.x * (head - 1); last.y -= u.y * (head - 1);
    const bx = l.tip.x - u.x * head, by = l.tip.y - u.y * head, px = -u.y * (head / 2), py = u.x * (head / 2);
    return `<g class="${P}-edge" data-edge="${l.i}"><path class="${P}-line" data-kind="${l.kind}" d="M${pts.map((q) => `${r2(q.x)} ${r2(q.y)}`).join("L")}"/><path class="${P}-tip" data-kind="${l.kind}" d="M${r2(l.tip.x)} ${r2(l.tip.y)}L${r2(bx + px)} ${r2(by + py)}L${r2(bx - px)} ${r2(by - py)}Z"/></g>`;
  }).join("");
  return { geo, ink: `<svg class="${P}-svg" width="${geo.w}" height="${geo.h}" viewBox="0 0 ${geo.w} ${geo.h}" focusable="false"><g class="${P}-edges">${lines}</g></svg>` };
}

function blueprintKey(P: string, m: Model): VElement | null {
  const p = bplan(m);
  const out: VElement[] = [];
  const said = (rule: Rule, extra: string) => (extra ? `${p.rules[rule]}: ${extra}` : p.rules[rule]);
  out.push(entry(P, ruleSwatch(P, "main"), said("visibility", p.words.keyVisibility)));
  out.push(entry(P, ruleSwatch(P, "dashed"), said("interaction", p.words.keyInteraction)));
  if (p.layers.includes("support")) out.push(entry(P, ruleSwatch(P, "dashed"), said("internal", p.words.keyInternal)));
  for (const k of ["main", "plain"] as DiagramLineKind[]) if (p.arrows.some((a) => a.kind === k) && m.legend[k]) out.push(entry(P, lineSwatch(P, k), m.legend[k]!, { "data-line": "", "data-when": "drawn" }));
  if (m.nodes.some((n) => n.focal) && m.legend.focal) out.push(entry(P, focalSwatch(P), m.legend.focal, { "data-focal": "" }));
  return keyOf(P, out);
}

function blueprintList(P: string, m: Model): VNode[] {
  const p = bplan(m);
  const sub = Math.min(6, m.heading + 1);
  return p.stages.flatMap((st, si) => [
    h(`h${sub}`, { class: `${P}-list-head` }, `${p.words.stage} ${si + 1}: `, iso(st.name), st.time ? ` (${st.time})` : ""),
    h("ul", { class: `${P}-list-items` }, p.layers.map((l) => {
      const c = p.cells.find((x) => x.stage === si && x.layer === l)!;
      const above = ruleAbove(l);
      const to = p.arrows.filter((a) => a.from === c.id).map((a) => bcell(m, a.to));
      return h("li", null, above ? `${p.rules[above]}, then ` : "", listStrong(p.layerWords[l]), ": ", c.empty ? `${p.words.none.toLowerCase()}.` : [iso(c.name), c.detail ? `, ${c.detail}` : "", "."],
        to.length ? ` To ${to.map((t) => (t.stage === c.stage ? t.name : `${t.name} (${stageName(p, t)})`)).join(", ")}.` : "", focalWords(m, c.focal));
    })),
  ]);
}

function blueprintLeast(m: Model, tk: Tokens, measure: ExtMeasureKit["measure"]): number {
  const p = bplan(m);
  const pad = 2 * tk.space("3") + 2 * tk.hair;
  let track = tk.node;
  p.stages.forEach((st, si) => {
    track = Math.max(track, widestOf(measure, [[st.name, "name"], [`${p.words.stage} ${si + 1}`, "mono", true], [st.time, "tab"]]));
  });
  for (const c of p.cells) track = Math.max(track, pad + widestOf(measure, [[c.name, "name"], [c.detail, c.mono ? "mono" : "sans"]]));
  // A rule's name is unbreakable and sits in the label column's start: it may run on past it, never past the first track.
  return fit(tk, p.stages.length, track, labelColumn(m, tk, measure));
}

// ============================================================================================================================================
// Story map (1.5): a backbone of activities, slices down, one release cut.
// ============================================================================================================================================

interface SStory extends ReturnType<typeof card> { activity: number; slice: number }
interface StoryPlan {
  persona?: string;
  activities: Array<{ id: string; name: string; steps: string[] }>;
  slices: Array<{ id: string; label: string; count: number; below: boolean }>;
  stories: SStory[];
  cut?: { after: number; label: string };
  words: Labels<StoryMapLabels>;
  labelWords: Array<[string, "name" | "tab" | "xs-600"]>;
}
const splan = (m: Model) => m.plan as StoryPlan;
const storyCount = (p: StoryPlan, n: number) => `${n} ${n === 1 ? p.words.story.one : p.words.story.other}`;

function buildStoryMap(spec: DiagramSpec, kit: ExtBuildKit): ExtBuilt {
  const words = wordsOf<StoryMapLabels>(spec, { activity: "Activity", noStories: "No stories", backbone: "Backbone activity", story: { one: "story", other: "stories" } });
  const activities = (Array.isArray(spec.activities) ? spec.activities : []).map((raw) => { const a = raw as StoryActivity; return { id: String(a.id ?? ""), name: String(a.name ?? ""), steps: Array.isArray(a.steps) ? a.steps.map(String) : [] }; });
  const slicesIn = (Array.isArray(spec.slices) ? spec.slices : []).map((raw) => { const s = raw as StorySlice; return { id: String(s.id ?? ""), label: String(s.label ?? "") }; });
  if (kit.dev && slicesIn.some((s) => "cutAfter" in (s as object))) kit.error("a story map has one cut: write `cut: { after, label }`, not a cut on a slice");
  const cutIn = spec.cut as StoryCut | undefined;
  const cutAt = cutIn ? slicesIn.findIndex((s) => s.id === String(cutIn.after)) : -1;
  if (kit.dev && cutIn && cutAt < 0) kit.error(`the cut comes after "${String(cutIn.after)}", which is not a slice`);
  if (kit.dev && cutIn && !txt(cutIn.label)) kit.error("the cut needs its words (cut.label): the key must say what it divides");
  const cut = cutIn && cutAt >= 0 ? { after: cutAt, label: String(cutIn.label ?? "") } : undefined;
  const stories: SStory[] = [];
  for (const raw of (Array.isArray(spec.stories) ? spec.stories : []) as StoryCard[]) {
    const a = activities.findIndex((x) => x.id === String(raw.activity)), s = slicesIn.findIndex((x) => x.id === String(raw.slice));
    if (a < 0 || s < 0) { kit.dev && kit.warn(`the story ${String(raw.id)} names an activity or a slice that is not there`); continue; }
    if (kit.dev && "tag" in (raw as object)) kit.warn(`the story ${String(raw.id)} has a "tag": its code is its \`kind\``);
    stories.push({ ...card(raw), activity: a, slice: s });
  }
  // Activity order inside a slice; the author's order inside a cell.
  const ordered = slicesIn.flatMap((_, s) => activities.flatMap((_a, a) => stories.filter((x) => x.slice === s && x.activity === a)));
  // A story's row in the keys' grid: its slice's rows, then its place in its cell.
  let base = 0;
  const rowOf = new Map<string, number>();
  slicesIn.forEach((_, s) => {
    const most = Math.max(1, ...activities.map((_a, a) => stories.filter((x) => x.slice === s && x.activity === a).length));
    for (const [a] of activities.entries()) stories.filter((x) => x.slice === s && x.activity === a).forEach((x, k) => rowOf.set(x.id, base + k + 1));
    base += most;
  });
  const nodes = ordered.map((x, i) => mnode(x, i, x.activity + 1, rowOf.get(x.id) ?? 1));
  checkIds(kit, nodes.map((n) => n.id));
  if (kit.dev && nodes.filter((n) => n.focal).length > 1) kit.warn("more than one story is focal: a story map has one at most");
  const slices = slicesIn.map((s, k) => ({ ...s, count: stories.filter((x) => x.slice === k).length, below: cut !== undefined && k > cut.after }));
  const labelWords: StoryPlan["labelWords"] = [...slices.map((s) => [s.label, "name"] as [string, "name"]), ...slices.map((s) => [storyCount({ words } as StoryPlan, s.count), "tab"] as [string, "tab"])];
  const plan: StoryPlan = { persona: txt(spec.persona), activities, slices, stories: ordered, cut, words, labelWords };
  return { nodes, edges: [], plan, cols: Math.max(1, activities.length), rows: Math.max(1, base) };
}
const sstory = (m: Model, id: string) => splan(m).stories.find((x) => x.id === id)!;

function storySentence(m: Model, n: MNode): string {
  const p = splan(m), x = sstory(m, n.id);
  const parts = [sentence(x.kind ? `${x.name}, ${x.kind}` : x.name), `${p.words.activity} ${x.activity + 1}, ${p.activities[x.activity]!.name}. ${p.slices[x.slice]!.label}.`];
  if (x.detail) parts.push(sentence(x.detail));
  if (x.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

function storyMeta(P: string, m: Model): VElement | null {
  const p = splan(m);
  return p.persona ? h("p", { class: `${P}-meta` }, h("span", { class: `${P}-meta-first` }, iso(p.persona))) : null;
}

function storyDrawing(P: string, m: Model, dyn: Dyn, level?: number): VNode[] {
  const p = splan(m);
  const out: VNode[] = [];
  const hasSteps = p.activities.some((a) => a.steps.length);
  // The backbone: a card an activity (a diagram-structure contour in place of the rim), then its steps as chips. Stacked, one card holding them all.
  out.push(h("div", { class: `${P}-story-backbone` }, p.activities.map((a, k) => [
    h("div", { class: `${P}-story-activity`, style: `--_c:${k + 2};--_r:1` },
      h("span", { class: `${P}-kind` }, iso(`${p.words.activity} ${k + 1}`)),
      h("span", { class: `${P}-name` }, iso(a.name))),
    a.steps.length ? h("span", { class: `${P}-story-steps`, style: `--_c:${k + 2};--_r:2` }, a.steps.map((s) => h("span", { class: `${P}-story-step` }, iso(s)))) : null,
  ])));
  let r = hasSteps ? 3 : 2;
  p.slices.forEach((sl, k) => {
    // Slices are ruled apart with the divider; the cut is the rule after the slice it names.
    if (!(p.cut && p.cut.after === k - 1)) out.push(h("span", { class: `${P}-matrix-rule`, style: `--_r:${r++}`, "aria-hidden": "true" }));
    out.push(h("section", { class: `${P}-story-slice`, "data-below": sl.below ? "" : undefined },
      h("div", { class: `${P}-story-slice-head`, style: `--_r:${r}` },
        h("span", { class: `${P}-story-slice-name` }, iso(sl.label)),
        h("span", { class: `${P}-story-count` }, iso(storyCount(p, sl.count)))),
      p.activities.map((a, ai) => {
        const mine = p.stories.filter((x) => x.slice === k && x.activity === ai);
        if (!mine.length) return h("div", { class: `${P}-story-slot`, style: `--_c:${ai + 2};--_r:${r}` }, h("span", { class: `${P}-empty` }, iso(p.words.noStories)), h("span", { class: `${P}-story-left-out` }, iso(`${p.words.noStories} in ${a.name}`)));
        return h("div", { class: `${P}-story-cell`, style: `--_c:${ai + 2};--_r:${r}` }, mine.map((x) => {
          const n = m.byId.get(x.id)!;
          return stop(P, m, n, dyn, level, { class: `${P}-node ${P}-story-card` },
            ...nodeWords(P, x, h("span", { class: `${P}-kind` }, h("span", { class: `${P}-story-of` }, iso(`${ai + 1} · ${a.name}`)), x.kind ? h("span", { class: `${P}-story-code` }, iso(x.kind)) : null)));
        }));
      })));
    r++;
    if (p.cut && p.cut.after === k) {
      out.push(h("div", { class: `${P}-story-cut`, style: `--_r:${r}`, "aria-hidden": "true" }, h("span", { class: `${P}-story-cut-name` }, iso(p.cut.label)), h("span", { class: `${P}-story-cut-line` })));
      r++;
    }
  });
  return out;
}

function storyKey(P: string, m: Model): VElement | null {
  const p = splan(m);
  const out: VElement[] = [];
  if (p.cut) out.push(entry(P, ruleSwatch(P, "main"), p.cut.label));
  out.push(entry(P, ruleSwatch(P, "contour"), p.words.backbone));
  if (m.nodes.some((n) => n.focal) && m.legend.focal) out.push(entry(P, focalSwatch(P), m.legend.focal, { "data-focal": "" }));
  return keyOf(P, out);
}

function storyList(P: string, m: Model): VNode[] {
  const p = splan(m);
  const sub = Math.min(6, m.heading + 1);
  const out: VNode[] = [h(`h${sub}`, { class: `${P}-list-head` }, iso(p.words.backbone)), h("ol", { class: `${P}-list-items` }, p.activities.map((a) => h("li", null, listStrong(a.name), a.steps.length ? `: ${a.steps.join(", ")}.` : ".")))];
  p.slices.forEach((sl, k) => {
    out.push(h(`h${sub}`, { class: `${P}-list-head` }, iso(sl.label), `: ${storyCount(p, sl.count)}`));
    const mine = p.stories.filter((x) => x.slice === k);
    const empty = p.activities.filter((_, ai) => !mine.some((x) => x.activity === ai));
    out.push(h("ul", { class: `${P}-list-items` }, [
      ...mine.map((x) => h("li", null, `${p.activities[x.activity]!.name}: `, listStrong(x.name), x.kind ? `, ${x.kind}` : "", x.detail ? `. ${sentence(x.detail)}` : ".", focalWords(m, x.focal))),
      ...empty.map((a) => h("li", null, `${p.words.noStories} in ${a.name}.`)),
    ]));
    if (p.cut && p.cut.after === k) out.push(h("p", { class: `${P}-list-group` }, iso(p.cut.label)));
  });
  return out;
}

function storyLeast(m: Model, tk: Tokens, measure: ExtMeasureKit["measure"]): number {
  const p = splan(m);
  const pad = 2 * tk.space("3") + 2 * tk.hair;
  let track = tk.node;
  p.activities.forEach((a, k) => { track = Math.max(track, pad + widestOf(measure, [[a.name, "name"], [`${p.words.activity} ${k + 1}`, "mono", true]]), ...a.steps.map((s) => widestOf(measure, [[s, "sans"]]) + 2 * tk.space("2-5"))); });
  for (const x of p.stories) track = Math.max(track, pad + widestOf(measure, [[x.name, "name"], [x.kind, "mono"], [x.detail, x.mono ? "mono" : "sans"]]));
  track = Math.max(track, widestOf(measure, [[p.words.noStories, "sans"]]) + pad);
  return fit(tk, p.activities.length, track, labelColumn(m, tk, measure));
}

// ============================================================================================================================================
// The four modules
// ============================================================================================================================================

const noTrace = () => false;
const common = (noun: string) => ({
  stop: `a ${noun}`,
  hasStops: (_m: Model, dyn: Dyn) => Boolean(dyn.layout && !dyn.bare),
  hint: (m: Model, drawn: boolean) => hintFour(m, drawn, noun),
  keys: (m: Model, drawn: boolean) => keysWords(m, drawn, noun),
  rootStyle: rootPlace,
});

let kanban: DiagramTypeExt | undefined, journey: DiagramTypeExt | undefined, blueprint: DiagramTypeExt | undefined, story: DiagramTypeExt | undefined;
/** The kanban's module, made at its first use. */
export function kanbanType(): DiagramTypeExt {
  return (kanban ??= { type: "kanban", build: buildKanban, sentence: kanbanSentence, key: kanbanKey, list: kanbanList, drawing: kanbanDrawing, least: kanbanLeast, layout: matrixLayout(), traces: noTrace, ...common("card") });
}
/** The journey's module, made at its first use. Its arrows are ← → drawn and ↑ ↓ stacked; nothing traces. */
export function journeyType(): DiagramTypeExt {
  return (journey ??= {
    type: "journey", build: buildJourney, sentence: journeySentence, key: journeyKey, list: journeyList, meta: journeyMeta, drawing: journeyDrawing, least: journeyLeast, layout: matrixLayout(journeyInk), traces: noTrace, ...common("stage"),
    hint: (m, drawn) => [{ keys: drawn ? ["←", "→"] : ["↑", "↓"], words: "a stage" }, { keys: ["Home", "End"], words: "the ends" }, ...(m.nodes.some((n) => n.href) ? [{ keys: ["Enter"], words: "open" }] : [])],
  });
}
/** The service blueprint's module, made at its first use. A part traces only where arrows are drawn. */
export function serviceBlueprintType(): DiagramTypeExt {
  return (blueprint ??= {
    type: "service-blueprint", build: buildBlueprint, sentence: blueprintSentence, key: blueprintKey, list: blueprintList, drawing: blueprintDrawing, least: blueprintLeast, layout: matrixLayout(blueprintInk), ...common("cell"),
    traces: (m, drawn) => drawn && m.edges.length > 0,
    hint: (m, drawn) => [...hintFour(m, drawn, "cell"), ...(drawn && m.edges.length ? [{ keys: ["Esc"], words: "clear" }] : [])],
  });
}
/** The story map's module, made at its first use. */
export function storyMapType(): DiagramTypeExt {
  return (story ??= { type: "story-map", build: buildStoryMap, sentence: storySentence, key: storyKey, list: storyList, meta: storyMeta, drawing: storyDrawing, least: storyLeast, layout: matrixLayout(), traces: noTrace, ...common("story") });
}
