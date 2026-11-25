// Basalt's diagrams (DECISIONS 281, revised by 282): the one engine behind the five React components and the HTML skill's `diagram` module.
// It is not exported from the package. It holds no React and no state: the model is read from the author's data, the markup is a small tree
// (React renders it, the skill writes it as HTML at build time), and the drawing is measured from the DOM and returned as one string of
// SVG and labels, so the two implementations draw the same pixels. Nothing here runs when the module loads: every table, cache and
// measurer is built inside a function.
//
// What the author writes is placement on a grid and one record per part; everything else is derived: the sides and slots a line uses, its
// route and jogs, the lanes it shares, a group's box, a foreign key's line, the stacked drawing's routes and gaps, and every label's seat.
//
// The development checks and warnings are written behind `process.env.NODE_ENV !== "production"` where they are made, so an app's production build,
// whose bundler sets NODE_ENV, drops them and their words (DECISIONS 281, 4.1: they cost production nothing). The HTML skill bundles this file as a
// development build: compose.mjs reports the warnings when it writes a page.

declare const process: { env: { NODE_ENV?: string } };

// ============================================================================================================================================
// Public shapes (the components re-export these types; no third-party type appears in them)
// ============================================================================================================================================

export type DiagramType = "architecture" | "flowchart" | "data-flow" | "sequence" | "schema" | "state" | "deployment" | DiagramExtType;
/** The types a module of their own draws (DECISIONS 359): the engine knows them only through the `DiagramTypeExt` their component hands it. */
export type DiagramExtType = "gantt" | "kanban" | "journey" | "service-blueprint" | "story-map" | "schedule" | "timeline" | "state" | "deployment";
export type DiagramSide = "top" | "right" | "bottom" | "left";
export type DiagramLineKind = "main" | "plain" | "dashed";

/** The words for the marks. The key is built from what is drawn; `main`, `dashed` and the focal node must have words when drawn. */
export interface DiagramLegend { main?: string; plain?: string; dashed?: string; focal?: string; group?: string; activation?: string; line?: string }

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
  /** The card is a link (DECISIONS 306, 1.4): the card itself is an `<a>`, the figure's roving stop, and Enter follows it. */
  href?: string;
  /** `"_blank"` opens a new tab (with `rel="noopener noreferrer"`); the cue is then the external arrow. */
  target?: "_blank";
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

/** A group of an architecture. `parent` names the group it is in (DECISIONS 306, 1.3): two levels at most, a node naming its innermost group. */
export interface DiagramGroup { id: string; label: string; parent?: string }
/**
 * A service's own mark for an architecture card (DECISIONS 292, 2.7): its owner's file for light grounds and, if it has one, for dark grounds, each
 * a URL the app has the right to show: a relative path, an `https` URL or a `data:image/` URI, from files the app ships, never from user input (anything else
 * is not drawn, with a development warning). `onDark` defaults to `onLight`. Basalt draws it 16px in the card's top end corner and does nothing to the file. The bundled marks are `@srasyndicate/basalt/marks/<id>`.
 */
export interface DiagramMark {
  onLight: string;
  onDark?: string;
  /** The words the mark stands for (each bundled mark carries them): a development build warns when a card's words say none of them. */
  says?: readonly string[];
}
export type ArchitectureNode = DiagramNode & { group?: string; mark?: DiagramMark };
/** A line of an architecture or a data flow. `flow` marks a live stream (main or plain only): an animated figure marches it. */
export type DiagramFlowEdge = DiagramEdge & { flow?: boolean };
/** A packet (DECISIONS 292, 1.8): a dot that carries one message along `path`, a route of node ids. */
export interface DiagramPacket {
  path: string[];
  /** It sends itself: when the entrance settles, then duration-diagram-repeat after each landing. */
  repeat?: boolean;
  /** A number or a string the app changes: each new value sends one message (the first render sends none). */
  send?: number | string;
}
export type DiagramMotion = "still" | "animated";
export type FlowchartNode = DiagramNode & { shape?: "step" | "decision" | "terminal" };
/** A state (DECISIONS 359, Ops 1): the architecture's node; `initial` takes the start mark, `final` the end mark; entry and exit actions sit under a rule. */
export type StateNode = DiagramNode & { group?: string; initial?: boolean; final?: boolean; entry?: string; exit?: string };
/** A transition: the engine writes its label from `event`, then `[guard] / action` on a second line. It has no `label`. */
export interface StateTransition { from: string; to: string; event?: string; guard?: string; action?: string; kind?: DiagramLineKind; fromSide?: DiagramSide; toSide?: DiagramSide }
/** A row of a deployment host (DECISIONS 359, Ops 3): what runs on it. A line may name it. */
export interface DeploymentArtifact { id: string; name: string; detail?: string }
/** A deployment's host: the architecture's node, with how many copies run (`replicas`) and its artifacts as rows. */
export type DeploymentNode = DiagramNode & { group?: string; mark?: DiagramMark; replicas?: number; artifacts?: DeploymentArtifact[] };
export interface DataFlowLane { id: string; label: string }
/** A data flow's step. `shape: "decision"` (DECISIONS 359) is the flowchart's diamond with its step line inside; every line leaving it is labelled. */
export type DataFlowNode = Omit<DiagramNode, "row" | "kind" | "branch"> & { lane: string; mark?: DiagramMark; shape?: "decision" };
/** A participant may carry its service's mark (DECISIONS 306, 1.6), never a person. */
export interface SequenceParticipant { id: string; name: string; kind?: string; short?: string; focal?: boolean; mark?: DiagramMark }
/** A message. `activate` starts its receiver working; `deactivate` stops its sender after it (DECISIONS 306, 1.2). */
export type SequenceMessage = { from: string; to: string; label: string; note?: string; kind?: DiagramLineKind; activate?: boolean; deactivate?: boolean };
/** A step: a message, a band, or a frame round a run of steps (`opt`, `loop`, or `alt` with two or more branches). Frames nest two deep. */
export type SequenceStep = SequenceMessage | { band: string }
  | { frame: "opt" | "loop"; label: string; steps: SequenceStep[] }
  | { frame: "alt"; branches: Array<{ label: string; steps: SequenceStep[] }> };
/** The words the key and the list say for each frame operator, and for an alt's later branches. */
export interface DiagramFrameLabels { opt?: string; loop?: string; alt?: string; else?: string }
/** How many rows each end of a foreign key allows (DECISIONS 306, 1.1): `from` is the column's own table, `to` the referenced one, which is one row at most. */
export type DiagramCardinality = "one" | "zero-or-one" | "one-or-many" | "zero-or-many";
export interface DiagramCardinalityPair { from: DiagramCardinality; to?: "one" | "zero-or-one" }
export interface SchemaColumn { name: string; type?: string; key?: "PK" | "FK"; references?: string; cardinality?: DiagramCardinalityPair }
export interface SchemaTable { name: string; col: number; row: number | [number, number]; focal?: boolean; more?: number; columns: SchemaColumn[]; href?: string; target?: "_blank" }
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
  /** Default "still": the drawing as merged, with no motion code loaded (DECISIONS 292). */
  motion?: DiagramMotion;
  pulse?: string[];
  packet?: DiagramPacket;
  run?: boolean;
  /** A sequence's frame words (DECISIONS 306, 1.2): "Only if", "Repeats", "One of these", "Otherwise". */
  frameLabels?: DiagramFrameLabels;
  /** `"first-visit"` (DECISIONS 306, 1.5): an animated figure's entrance plays until it has played once on this page, then is at rest. Needs an `id`. */
  entrance?: "always" | "first-visit";
  /** A sequence drawn as text art (DECISIONS 306, 1.2). */
  variant?: "drawn" | "text";
  /** Automatic layout (1.8): `"auto"` takes each card's column and row from `placement` (elkjs's, from `placeDiagram`), and a card's own are not read. */
  layout?: "authored" | "auto";
  direction?: "right" | "down";
  placement?: DiagramPlacement | DiagramPlacement[];
  /** A dependency figure (DECISIONS 359, Ops 4): an architecture whose lines read "depends on". The engine writes each card's count of dependents in
   *  these words, dashes every line inside a cycle and, under `layout: "auto"`, ranks by longest path from the sources. */
  dependents?: { one: string; other: string };
  /** A deployment's one environment (DECISIONS 359, Ops 3): required, the first words of the source line ("Production · us-east-1"). */
  environment?: string;
  /** Internal: the module that draws a type the engine does not hold (DECISIONS 359). The component sets it; the HTML skill sets it from its registry. */
  ext?: DiagramTypeExt;
  /** Every other key is a type module's own data (a gantt's `tasks`, a kanban's `columns`), read by that module. */
  [key: string]: unknown;
}

/** A card of an automatic figure (1.8): its `col` and `row` may be left out (and are not read). */
export type DiagramUnplaced<T> = Omit<T, "col" | "row"> & { col?: number; row?: number | [number, number] };

/** Where an automatic figure's cards go in one direction (1.8): `placeDiagram`'s answer. */
export interface DiagramPlacement {
  direction: "right" | "down";
  cells: Record<string, { col: number; row: number }>;
  /** The grid's tracks (DECISIONS 322, rule 1): at least the cards' own, and more where a track holds only a main line's way. */
  cols?: number;
  rows?: number;
}

// ============================================================================================================================================
// The model
// ============================================================================================================================================

type Shape = "box" | "terminal" | "decision" | "table" | "participant";

export interface MColumn { name: string; type?: string; key?: "PK" | "FK"; ref?: { table: string; column: string; row: number }; card?: { from: DiagramCardinality; to: "one" | "zero-or-one" } }
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
  /** A card's mark: a bundled id (the HTML skill's page holds its rule) or the two URLs. */
  mark?: { id?: string; onLight?: string; onDark?: string; says?: string[] };
  /** A link card (1.4). */
  href?: string;
  blank?: boolean;
  /** A state's marks and actions (DECISIONS 359, Ops 1). */
  initial?: boolean;
  final?: boolean;
  entry?: string;
  exit?: string;
  /** A deployment host's copies and rows (Ops 3). */
  replicas?: number;
  artifacts?: Array<{ id: string; name: string; detail?: string }>;
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
  /** A foreign key's stated cardinality (1.1): its ends are crow's-foot marks in place of the dot and the head. */
  card?: { from: DiagramCardinality; to: "one" | "zero-or-one" };
  /** A live stream (DECISIONS 292, 1.6); on a dashed line its own dashes march (DECISIONS 306, 1.5). */
  flow?: boolean;
  /** A line to a deployment host's artifact (Ops 3): the row it names. */
  toArtifact?: string;
  fromArtifact?: string;
  /** A state's transition, as written (Ops 1): the list says it as a sentence. */
  event?: string;
  guard?: string;
  action?: string;
  order?: number;
}
export type MStep = { band: string } | { n: number; from: string; to: string; label: string; note?: string; kind: DiagramLineKind; activate?: boolean; deactivate?: boolean }
  /** A frame opens (its operator, label and depth, and the participants' columns it spans), an alt's later branch starts, or a frame closes (1.2). */
  | { open: "opt" | "loop" | "alt"; label: string; depth: number; a: number; b: number }
  | { otherwise: string; depth: number }
  | { close: number };
/** A participant working: a bar from the message that starts it to the one that ends it, at a depth from 1 to 3 (1.2). */
export interface MBar { who: string; from: number; to: number; depth: number }
export interface Model {
  type: DiagramType;
  title: string;
  heading: 2 | 3 | 4 | 5 | 6;
  legend: DiagramLegend;
  nodes: MNode[];
  byId: Map<string, MNode>;
  edges: MEdge[];
  /** `members` are a group's own nodes; `all` adds its child groups' (its box's extent); `depth` is 1 or 2. Outer groups come first. */
  groups: Array<DiagramGroup & { members: string[]; all: string[]; depth: number }>;
  lanes: DataFlowLane[];
  steps: MStep[];
  /** A sequence's activation bars (1.2). */
  bars: MBar[];
  /** A sequence's frame words. */
  frameWords: { opt: string; loop: string; alt: string; else: string };
  cols: number;
  rows: number;
  shapeLabels: Required<DiagramShapeLabels>;
  stepWord: (n: number) => string;
  warnings: string[];
  /** Motion (DECISIONS 292). Read and ignored when still. */
  motion: { animated: boolean; pulse?: string[]; packet?: { path: string[]; repeat: boolean; send?: number | string }; run: boolean; firstVisit?: boolean };
  /** Work that depends on the model alone, done once (see `memo`). */
  memo: Map<string, unknown>;
  /** Mirrored for a right-to-left figure (1.7). */
  rtl?: boolean;
  /** An automatic figure with no placement yet (1.8): it is stacked, every word present, until one arrives. */
  unplaced?: boolean;
  /** A sequence drawn as text art (1.2): a code block holding the art where it fits and the transcript where it does not. */
  text?: boolean;
  /** A schema that draws cardinality marks (1.1): its column gap is space-12 plus space-3. */
  marks?: boolean;
  /** 5.1's first list, in a development build: reported as errors (console.error), the figure drawn as production draws it. */
  errors: string[];
  /** The module that draws a type of its own (DECISIONS 359), and what it read from the data. */
  ext?: DiagramTypeExt;
  /** The way the figure reads: laid right (the default) or down (an automatic figure's placement, or the author's `direction`). */
  dir?: "right" | "down";
  plan?: unknown;
}

const SIDES: DiagramSide[] = ["top", "right", "bottom", "left"];
const LINE_KINDS: DiagramLineKind[] = ["main", "plain", "dashed"];
const CARDS: DiagramCardinality[] = ["one", "zero-or-one", "one-or-many", "zero-or-many"];
/** A form's words: the key's ("Exactly one") and the list's ("exactly one"). */
const CARD_WORDS: Record<DiagramCardinality, string> = { one: "Exactly one", "zero-or-one": "Zero or one", "one-or-many": "One or many", "zero-or-many": "Zero or many" };
const HEADINGS = [2, 3, 4, 5, 6];

/** The types automatic layout places (DECISIONS 306, 1.8; a state, a deployment and a schedule, DECISIONS 359). */
/** The types whose cards are grouped (an architecture's groups; a state's composite states; a deployment's boundaries). */
/** The types whose row a box starts on stands space-4 lower (the run-edge ruling). */
const lowers = (m: Model) => m.type === "architecture" || m.type === "deployment";
export const grouped = (type: string): boolean => type === "architecture" || type === "state" || type === "deployment";
export const autoType = (type: string): boolean => type === "architecture" || type === "flowchart" || type === "schema" || type === "state" || type === "deployment" || type === "schedule";
/** Text from the author's data: always a string (or nothing), so a value that is not one can never be read as markup. */
export const txt = (v: unknown): string | undefined => (v === undefined || v === null || v === "" ? undefined : String(v));
/** A record keyed by the author's ids, with no prototype, so an id such as "toString" or "constructor" is only ever its own key. */
export const record = <T>(from?: Record<string, T>): Record<string, T> => Object.assign(Object.create(null) as Record<string, T>, from);
/** A value an id keys in a record, never one the record inherits. */
export const own = <T>(r: Record<string, T> | undefined, id: string): T | undefined => (r && Object.prototype.hasOwnProperty.call(r, id) ? r[id] : undefined);

export interface BuildOptions {
  /** The placement an automatic figure is drawn from (1.8), chosen by the figure from those it has. */
  placement?: DiagramPlacement;
  /** The figure's computed direction is right to left (DECISIONS 306, 1.7): the model is mirrored, so column 1 is drawn at the right and a named left or
   *  right side swaps. The engine then lays out and routes as it does any figure; the words do not mirror. */
  rtl?: boolean;
  /** Run the checks a development build reports (placement, groups, the key's words). Off, the model is read the same and nothing is checked. */
  checks?: boolean;
}
/** The fonts the ruler measures in: a card's name (600 and 500), Mono, Geist at xs (400; 400, 500 and 600 with tabular figures), a table's name, a label, and Geist at sm. */
export type RulerFont = "name" | "name-500" | "mono" | "sans" | "table" | "label" | "tab" | "xs-500" | "xs-600" | "sm";

/** What a type module is handed to read the author's data: the checks' sinks and the figure's direction. */
export interface ExtBuildKit {
  dev: boolean;
  warn: (message: string) => void;
  error: (message: string) => void;
  rtl: boolean;
  legend: DiagramLegend;
}
/** What a type module returns from the data: the stops (`nodes`), any lines, its own model, and the grid's size. */
export interface ExtBuilt { nodes: MNode[]; edges: MEdge[]; plan: unknown; cols: number; rows: number }
/** What a type module is handed to lay a figure out (script only). */
export interface ExtMeasureKit {
  fig: HTMLElement;
  drawing: HTMLElement;
  P: string;
  tk: Tokens;
  /** The figure's width. */
  W: number;
  least: number;
  /** Writes a state into the DOM, so it can be measured as it would be drawn. */
  apply: (d: Dyn) => void;
  /** The state with its roving stop settled. */
  stopOf: (d: Dyn) => Dyn;
  current: Dyn;
  measure: (text: string, font: RulerFont) => number;
  warn?: (s: string, level?: "error") => void;
}

/**
 * A type the engine does not hold (DECISIONS 359): gantt, kanban, journey, service blueprint, story map, schedule and timeline are each drawn by a module of
 * their own, which its component hands the engine on the spec (`spec.ext`), so a figure that draws an architecture bundles none of them. A type that is
 * `routed` (the schedule) is laid out, routed and stacked by the engine as an architecture is, and changes only its words and its cards; any other draws
 * its own drawing and its own ink, and the engine gives it the figure, the key, the list, the keys and the viewer.
 */
export interface DiagramTypeExt {
  type: DiagramExtType;
  /** A type read as an architecture (state, deployment): `prepare` hands the engine the data it reads that way, and `adopt` adds what is the type's own. */
  as?: "architecture";
  prepare?: (spec: DiagramSpec, kit: ExtBuildKit) => DiagramSpec;
  adopt?: (m: Model, spec: DiagramSpec, kit: ExtBuildKit) => void;
  build?: (spec: DiagramSpec, kit: ExtBuildKit) => ExtBuilt;
  /** The engine's router lays it out (schedule). */
  routed?: boolean;
  /** The noun the hint and the keys sentence use for one stop ("a task"). */
  stop: string;
  sentence?: (m: Model, n: MNode) => string;
  /** An architecture-read type's own sentences, after a card's detail. */
  sentenceMore?: (m: Model, n: MNode) => string[];
  key?: (P: string, m: Model) => VElement | null;
  /** An architecture-read type's own key entries, before the focal and group entries. */
  keyMore?: (P: string, m: Model) => VElement[];
  list?: (P: string, m: Model) => VNode[];
  /** An architecture-read type's list: its parts' heading, what a part adds, and its connections in place of the architecture's. */
  listParts?: string;
  listPart?: (P: string, m: Model, n: MNode) => VChild[];
  listLines?: (P: string, m: Model, H: (text: string) => VElement) => VNode[];
  /** An architecture-read type's card attributes and the room its marks take: a group's box (`groupMark`) and the drawing's start or top (`room`). */
  nodeAttrs?: (m: Model, n: MNode) => VAttrs;
  groupMark?: (m: Model, g: Model["groups"][number], cells: { c1: number; c2: number; r1: number; r2: number } | null) => { style?: string; start?: string } | undefined;
  room?: (m: Model) => { start?: boolean; top?: boolean } | undefined;
  /** Ink of the type's own over the routed lines (a state's start marks), written into the drawing's SVG. */
  /** False refuses the drawn layout (a state's start mark with no place clear of the lines): the figure is stacked, and the module says why. */
  inkMore?: (P: string, m: Model, geo: Geo, tk: Tokens, drawn: boolean, warn?: (s: string) => void) => string | false;
  /** The first words of the source line (a deployment's environment). */
  sourceLead?: (m: Model) => string | undefined;
  /** A line of facts about the whole figure, under its source. */
  meta?: (P: string, m: Model) => VElement | null;
  hint?: (m: Model, drawn: boolean) => Array<{ keys: string[]; words: string }>;
  keys?: (m: Model, drawn: boolean) => string;
  /** Whether a part traces (only where lines are drawn). */
  traces?: (m: Model, drawn: boolean) => boolean;
  hasStops?: (m: Model, dyn: Dyn) => boolean;
  keyTarget?: (m: Model, from: string, key: string, drawn: boolean, rtl: boolean) => string | null;
  /** A routed type's card: what goes inside the node in place of its kind, name and detail. */
  card?: (P: string, m: Model, n: MNode, dyn: Dyn) => VChild[];
  /** A routed type's stack has no lines (DECISIONS 359, the schedule's stack). */
  stackBare?: boolean;
  /** An unrouted type's drawing. */
  drawing?: (P: string, m: Model, dyn: Dyn, level?: number) => VNode[];
  /** An unrouted type's least drawn width, measured (script only). */
  least?: (m: Model, tk: Tokens, measure: (text: string, font: RulerFont) => number) => number;
  /** An unrouted type's layout (script only): the state to draw, its geometry and its ink. */
  layout?: (m: Model, kit: ExtMeasureKit) => Measured;
  /** The figure's state's own attributes on the root: written and cleared with the layout. */
  rootStyle?: (m: Model, dyn: Dyn) => string[];
  /** The form before script runs (a gantt's stack "tracks" or "words"), written as `data-form` until the layout writes its own. */
  form?: (m: Model) => string | undefined;
}

/**
 * Reads the author's data into the model. A problem the decision calls a development error is collected in `warnings`. Every value that
 * reaches markup is checked here, at the boundary: text is made a string, a heading level, a line's kind, a side and a key are one of their
 * few values (or the default, with a warning), and a track is a whole number from 1.
 */
export function buildModel(spec: DiagramSpec, options: BuildOptions = {}): Model {
  // Development only: a bundler that sets NODE_ENV to production folds `dev` to false and drops every check below, its words included.
  const dev = process.env.NODE_ENV !== "production";
  const checks = dev && options.checks !== false;
  const warnings: string[] = [];
  const warn = (message: string) => { warnings.push(message); };
  // 5.1's first list (the decider's ruling 1 on the re-check): reported as an error, once for a figure, and the figure is drawn as production draws it.
  const errors: string[] = [];
  const error = (message: string) => { errors.push(message); };
  const legendIn = (spec.legend ?? {}) as Record<string, unknown>;
  const legend: DiagramLegend = {};
  for (const k of ["main", "plain", "dashed", "focal", "group", "activation", "line"] as const) { const w = txt(legendIn[k]); if (w) legend[k] = w; }
  const stepLabel = spec.stepLabel;
  const stepWord = typeof stepLabel === "function" ? (n: number) => String(stepLabel(n)) : typeof stepLabel === "string" ? ((n: number) => stepLabel.replace("{n}", String(n))) : (n: number) => `Step ${n}`;
  const shapeIn = (spec.shapeLabels ?? {}) as Record<string, unknown>;
  const shapeLabels = { terminal: txt(shapeIn.terminal) ?? "Start or end", step: txt(shapeIn.step) ?? "Step", decision: txt(shapeIn.decision) ?? "Decision" };
  const heading = spec.heading === undefined ? 3 : HEADINGS.includes(spec.heading as number) ? spec.heading : (dev && warn(`heading ${String(spec.heading)} is not a level from 2 to 6: the title is an h3`), 3);
  const kindOf = (k: unknown, where: string): DiagramLineKind => {
    if (k === undefined || k === null) return "plain";
    if (LINE_KINDS.includes(k as DiagramLineKind)) return k as DiagramLineKind;
    dev && warn(`"${String(k)}" is not a kind of line (main, plain or dashed): ${where} is drawn plain`);
    return "plain";
  };
  const sideOf = (v: unknown): DiagramSide | undefined => {
    if (v === undefined || v === null) return undefined;
    if (SIDES.includes(v as DiagramSide)) return v as DiagramSide;
    dev && warn(`"${String(v)}" is not a side (top, right, bottom or left): the derived side is used`);
    return undefined;
  };
  const trackOf = (v: unknown, what: string): number => {
    if (typeof v === "number" && Number.isInteger(v) && v >= 1) return v;
    // An automatic figure's cards take the placement's tracks (1.8).
    if (spec.layout === "auto" && (v === undefined || v === null)) return 1;
    dev && warn(`${what} is ${JSON.stringify(v)}, not a whole number from 1: it is placed at 1`);
    return 1;
  };
  const nodes: MNode[] = [];
  const edges: MEdge[] = [];
  let lanes: DataFlowLane[] = [];
  const groups: Model["groups"] = [];
  const steps: MStep[] = [];
  const type = spec.type;
  // A type of its own (DECISIONS 359) is read by its module, which its component handed over on the spec.
  const ext = spec.ext && spec.ext.type === type ? spec.ext : undefined;
  const asArch = ext?.as === "architecture";
  const kit: ExtBuildKit = { dev, warn, error, rtl: Boolean(options.rtl), legend };
  if (ext?.prepare) spec = ext.prepare(spec, kit);
  let built: ExtBuilt | undefined;
  if (dev && !ext && !(["architecture", "flowchart", "data-flow", "sequence", "schema", "state", "deployment"] as unknown[]).includes(type)) warn(`"${String(type)}" is not a type of diagram (architecture, flowchart, data-flow, sequence, schema, state or deployment), or its module is not loaded`);

  if (ext?.build) {
    built = ext.build(spec, kit);
    nodes.push(...built.nodes);
    edges.push(...built.edges);
  } else if (type === "architecture" || type === "flowchart" || asArch) {
    for (const raw of (spec.nodes ?? []) as Array<ArchitectureNode & FlowchartNode>) {
      const shape: Shape = type === "flowchart" && raw.shape === "decision" ? "decision" : type === "flowchart" && raw.shape === "terminal" ? "terminal" : "box";
      const id = String(raw.id ?? "");
      const row = trackOf(raw.row, `the row of ${id}`);
      nodes.push({
        id, i: nodes.length, name: String(raw.name ?? ""), kind: shape === "decision" ? undefined : txt(raw.kind), detail: shape === "decision" ? undefined : txt(raw.detail), mono: Boolean(raw.detailMono),
        focal: Boolean(raw.focal), col: trackOf(raw.col, `the column of ${id}`), row, row2: row, branch: Boolean(raw.branch), shape, group: type !== "flowchart" ? txt(raw.group) : undefined,
        mark: type !== "flowchart" ? markOf((raw as { mark?: unknown }).mark, dev ? warn : undefined) : undefined,
      });
    }
    if (type !== "flowchart") {
      const raw = (spec.groups ?? []).map((g) => ({ id: String(g.id ?? ""), label: String(g.label ?? ""), parent: txt(g.parent) }));
      const byGroup = new Map(raw.map((g) => [g.id, g]));
      // Depth by the parent chain: an unknown parent or a cycle is an error, and the group is drawn at the top level.
      const depthOf = (g: (typeof raw)[number]): number => {
        if (!g.parent) return 1;
        const p = byGroup.get(g.parent);
        if (!p) { dev && error(`the group "${g.label}" names the parent "${g.parent}", which is not a group`); g.parent = undefined; return 1; }
        if (p.parent === g.id || p.id === g.id) { dev && error(`the groups "${g.label}" and "${p.label}" are each other's parent`); g.parent = undefined; return 1; }
        if (p.parent) { dev && error(`the group "${g.label}" is a third level: groups nest two deep`); g.parent = undefined; return 1; }
        return 2;
      };
      const depths = raw.map(depthOf);
      raw.forEach((g, k) => groups.push({ ...g, depth: depths[k]!, members: nodes.filter((n) => n.group === g.id).map((n) => n.id), all: [] }));
      for (const g of groups) g.all = [...g.members, ...groups.filter((c) => c.parent === g.id).flatMap((c) => c.members)];
      groups.sort((a, b) => a.depth - b.depth);
    }
  } else if (type === "data-flow") {
    lanes = (spec.lanes ?? []).map((l) => ({ id: String(l.id ?? ""), label: String(l.label ?? "") }));
    const laneIndex = new Map(lanes.map((l, k) => [l.id, k + 1]));
    for (const raw of (spec.nodes ?? []) as DataFlowNode[]) {
      const id = String(raw.id ?? "");
      const laneId = String(raw.lane ?? "");
      const lane = laneIndex.get(laneId);
      if (lane === undefined) dev && warn(`a node (${id}) names the lane "${laneId}", which is not in lanes`);
      const n = nodes.length + 1;
      nodes.push({
        id, i: nodes.length, name: String(raw.name ?? ""), kind: stepWord(n), detail: txt(raw.detail), mono: Boolean(raw.detailMono), focal: Boolean(raw.focal),
        // A step may be a decision (DECISIONS 359, Ops 5): the flowchart's diamond, with its step line inside it.
        col: trackOf(raw.col, `the column of ${id}`), row: lane ?? 1, row2: lane ?? 1, branch: false, shape: (raw as { shape?: unknown }).shape === "decision" ? "decision" : "box", lane: lane ?? 1, laneLabel: lanes[(lane ?? 1) - 1]?.label ?? laneId, step: n,
        mark: markOf((raw as { mark?: unknown }).mark),
      });
    }
  } else if (type === "sequence") {
    (spec.participants ?? []).forEach((p, k) => { const name = String(p.name ?? ""); nodes.push({ id: String(p.id ?? ""), i: k, name, kind: txt(p.kind), mono: false, focal: Boolean(p.focal), col: k + 1, row: 1, row2: 1, branch: false, shape: "participant", short: txt(p.short) ?? name, mark: markOf((p as { mark?: unknown }).mark) }); });
    let n = 0;
    const colOf = new Map(nodes.map((p) => [p.id, p.col]));
    // Messages number straight through frames. A frame spans the columns of the participants that send or receive inside it, and the column a
    // self-call's words run into (1.2).
    const walk = (list: SequenceStep[], depth: number): [number, number] => {
      let a = Infinity, b = -Infinity;
      for (const s of list ?? []) {
        if (!s || typeof s !== "object") continue;
        if ("band" in s) {
          if (depth > 0) dev && error(`the band "${String(s.band)}" is inside a frame: a band is the whole figure's`);
          steps.push({ band: String(s.band ?? "") });
          continue;
        }
        if ("frame" in s) {
          if (depth >= 2) { dev && error("a frame is a third level: frames nest two deep"); continue; }
          const op = s.frame === "alt" || s.frame === "loop" || s.frame === "opt" ? s.frame : "opt";
          const branches = op === "alt" ? ((s as { branches?: Array<{ label: string; steps: SequenceStep[] }> }).branches ?? []) : [{ label: (s as { label: string }).label, steps: (s as { steps: SequenceStep[] }).steps }];
          if (op === "alt" && branches.length < 2) dev && error("an alt frame has one branch: it needs two or more");
          const label = String(branches[0]?.label ?? "");
          if (label.length > 40) dev && error(`the frame label "${label}" is over 40 characters`);
          const at = steps.length;
          steps.push({ open: op, label, depth: depth + 1, a: 0, b: 0 });
          branches.forEach((br, k) => {
            if (k) { const l = String(br.label ?? ""); if (l.length > 40) dev && error(`the frame label "${l}" is over 40 characters`); steps.push({ otherwise: l, depth: depth + 1 }); }
            if (!br.steps?.length) dev && error(`a frame or branch ("${String(br.label ?? "")}") is empty`);
            const [x, y] = walk(br.steps ?? [], depth + 1);
            a = Math.min(a, x); b = Math.max(b, y);
            const open = steps[at] as { a: number; b: number };
            open.a = Math.min(open.a || Infinity, x); open.b = Math.max(open.b, y);
          });
          steps.push({ close: depth + 1 });
          continue;
        }
        n++;
        const label = String(s.label ?? "");
        // A message's second line is its note (1.4): a break in its label is an error, and it is drawn on one line.
        if (label.includes("\n")) dev && error(`message ${n}'s label has a break: a message's second line is its note`);
        const from = String(s.from ?? ""), to = String(s.to ?? "");
        steps.push({ n, from, to, label: said(label), note: txt(s.note), kind: kindOf(s.kind, `message ${n}`), activate: s.activate === true || undefined, deactivate: s.deactivate === true || undefined });
        const ca = colOf.get(from) ?? 1, cb = colOf.get(to) ?? 1;
        // A self-call's words run into the next column (the one before it on the last participant).
        const run = ca === cb ? (ca === nodes.length ? ca - 1 : ca + 1) : ca;
        a = Math.min(a, ca, cb, run); b = Math.max(b, ca, cb, run);
      }
      return [a, b];
    };
    walk(spec.steps ?? [], 0);
    for (const st of steps) if ("open" in st && !Number.isFinite(st.a)) { st.a = 1; st.b = Math.max(1, nodes.length); }
  } else if (type === "schema") {
    for (const t of spec.tables ?? []) {
      const name = String(t.name ?? "");
      const [r1, r2] = Array.isArray(t.row) ? t.row : [t.row, t.row];
      const row = trackOf(r1, `the row of ${name}`);
      const row2 = Math.max(row, trackOf(r2, `the last row of ${name}`));
      const more = t.more === undefined || t.more === null ? undefined : Number.isInteger(t.more) && t.more > 0 ? t.more : (dev && warn(`${name}'s "more" is ${JSON.stringify(t.more)}, not a whole number from 1: it is left out`), undefined);
      nodes.push({
        id: name, i: nodes.length, name, mono: true, focal: Boolean(t.focal), col: trackOf(t.col, `the column of ${name}`), row, row2, branch: false, shape: "table", more,
        columns: (t.columns ?? []).map((c) => ({ name: String(c.name ?? ""), type: txt(c.type), key: c.key === "PK" || c.key === "FK" ? c.key : (c.key !== undefined && c.key !== null && dev && warn(`${name}.${String(c.name)}'s key is "${String(c.key)}", not PK or FK: it is left out`), undefined) })),
      });
    }
  }

  // Automatic layout (1.8): each card's column and row are the placement's; a card's own are not read (a development build says so once).
  let unplaced = false;
  if (spec.layout === "auto" && autoType(type)) {
    const raw = (type === "schema" ? spec.tables : type === "schedule" ? spec.tasks : spec.nodes) as Array<{ col?: unknown; row?: unknown }> | undefined;
    if (checks && (raw ?? []).some((n) => n && (n.col !== undefined || n.row !== undefined))) warn('a card under layout="auto" has a col or row, which is not read: there are no hints');
    const cells = options.placement?.cells;
    if (!cells) unplaced = true;
    for (const n of nodes) { const c = cells?.[n.id]; n.col = c?.col ?? 1; n.row = n.row2 = c?.row ?? 1; }
    // A placement that puts two cards in one cell, or leaves a card out, is not used (8.5; Neon's B8 of the code review): the figure tries its other
    // direction, then stacks, and a development build names the cards. (A card inside a group's box it is not in is checked below, with the groups.)
    if (cells) {
      const seen = new Map<string, string>();
      for (const n of nodes) {
        const c = own(cells, n.id);
        if (!c) { unplaced = true; dev && warn(`the placement has no cell for ${n.id}, so it is not used`); continue; }
        const key = `${c.col},${c.row}`;
        if (seen.has(key)) { unplaced = true; dev && warn(`the placement puts ${seen.get(key)} and ${n.id} in one cell, so it is not used`); }
        seen.set(key, n.id);
      }
    }
    if (cells && !unplaced) for (const g of groups) {
      const mem = g.all.map((id) => nodes.find((n) => n.id === id)!).filter(Boolean);
      if (!mem.length) continue;
      const c1 = Math.min(...mem.map((n) => n.col)), c2 = Math.max(...mem.map((n) => n.col)), r1 = Math.min(...mem.map((n) => n.row)), r2 = Math.max(...mem.map((n) => n.row));
      const inside = nodes.filter((n) => !g.all.includes(n.id) && n.col >= c1 && n.col <= c2 && n.row >= r1 && n.row <= r2);
      if (inside.length) { unplaced = true; dev && warn(`the placement puts ${inside.map((n) => n.id).join(", ")} inside the box of the group "${g.label}", so it is not used`); }
    }
  } else if (spec.layout === "auto") dev && error(`layout="auto" is for an architecture, a flowchart, a schema, a state, a deployment or a schedule, not a ${type}`);
  // Link cards (1.4): any card but a sequence's participant (its stacked chip has no room for a 44px target).
  const rawCards = (type === "schema" ? spec.tables : type === "sequence" ? spec.participants : spec.nodes) as Array<{ href?: unknown; target?: unknown }> | undefined;
  (rawCards ?? []).forEach((raw, k) => {
    if (!raw || raw.href === undefined || raw.href === null) return;
    const href = String(raw.href);
    if (type === "sequence") { dev && error(`${nodes[k]?.id}: a participant cannot be a link (href)`); return; }
    if (!href.trim()) { dev && error(`${nodes[k]?.id}'s href is empty`); return; }
    const n = nodes[k];
    if (n) { n.href = href; n.blank = raw.target === "_blank"; }
  });
  const byId = new Map<string, MNode>();
  for (const n of nodes) {
    if (dev && !n.id) warn("a node has no id");
    else if (dev && byId.has(n.id)) warn(`the id "${n.id}" is used twice`);
    byId.set(n.id, n);
  }

  // Schema: a foreign key is one record, `references` on the column; its line, its row's words, the sentence and the list all come from it.
  if (type === "schema") {
    const cardOf = (v: unknown, where: string): MEdge["card"] => {
      if (v === undefined || v === null) return undefined;
      const o = v as { from?: unknown; to?: unknown };
      const from = CARDS.includes(o.from as DiagramCardinality) ? (o.from as DiagramCardinality) : undefined;
      if (!from) { dev && error(`${where}'s cardinality "from" is ${JSON.stringify(o.from)}, not one, zero-or-one, one-or-many or zero-or-many: it is left out`); return undefined; }
      if (o.to === undefined || o.to === null) return { from, to: "one" };
      if (o.to === "one" || o.to === "zero-or-one") return { from, to: o.to };
      // A foreign key points at one row at most.
      dev && error(`${where}'s cardinality "to" is ${JSON.stringify(o.to)}: a foreign key references one row at most (one or zero-or-one), so it is drawn as one`);
      return { from, to: "one" };
    };
    (spec.tables ?? []).forEach((t) => (t.columns ?? []).forEach((c, k) => {
      const ref = txt(c.references);
      if (!ref && c.cardinality !== undefined && c.cardinality !== null) dev && error(`${String(t.name)}.${String(c.name)} states a cardinality but references nothing`);
      if (!ref) return;
      const [table, column] = ref.split(".");
      const target = byId.get(table ?? "");
      const row = target?.columns?.findIndex((x) => x.name === column) ?? -1;
      if (!target || row < 0) { dev && warn(`${String(t.name)}.${String(c.name)} references ${ref}, which is not a shown column`); return; }
      const source = byId.get(String(t.name ?? ""))!;
      source.columns![k]!.ref = { table: table!, column: column!, row };
      const card = cardOf(c.cardinality, `${String(t.name)}.${String(c.name)}`);
      if (card) source.columns![k]!.card = card;
      edges.push({ i: edges.length, from: source.id, to: table!, kind: "plain", fromRow: k, toRow: row, fk: true, card });
    }));
    // All of a figure's foreign keys state how many, or none (1.1). In production an unstated line draws as today, and the key shows both.
    const stated = edges.filter((e) => e.card).length;
    if (stated && stated < edges.length) dev && error(`cardinality is stated on ${stated} of ${edges.length} foreign keys: state it on every one or none (${edges.filter((e) => !e.card).map((e) => `${e.from}.${byId.get(e.from)!.columns![e.fromRow!]!.name}`).join(", ")} ${edges.length - stated === 1 ? "has" : "have"} none)`);
  } else if (type !== "sequence" && (!ext || asArch)) {
    for (const e of spec.edges ?? []) {
      const from = String(e.from ?? ""), to = String(e.to ?? "");
      if (!byId.has(from) || !byId.has(to)) { dev && warn(`a line names ${!byId.has(from) ? from : to}, which is not a node`); continue; }
      const label = txt(e.label);
      const lines = label?.split("\n") ?? [];
      if (lines.length > 2) dev && error(`the label "${said(label!)}" has more than one break: a label is two lines at most`);
      if (lines.some((l) => l.length > MAX_LABEL)) dev && error(`a line of the label "${said(label!)}" is over ${MAX_LABEL} characters: longer words belong in the node or the summary`);
      edges.push({ i: edges.length, from, to, kind: kindOf(e.kind, `the line from ${from} to ${to}`), label, fromSide: sideOf(e.fromSide), toSide: sideOf(e.toSide), flow: type !== "flowchart" && (e as DiagramFlowEdge).flow === true ? true : undefined });
    }
    // A data flow's decision (DECISIONS 359, Ops 5): every line that leaves it has a label, and there are two or more.
    if (dev && type === "data-flow") for (const n of nodes) if (n.shape === "decision") {
      const out = edges.filter((e) => e.from === n.id);
      if (out.length < 2) error(`the decision ${n.id} has ${out.length} line${out.length === 1 ? "" : "s"} leaving it: a decision has two or more`);
      if (out.some((e) => !e.label)) error(`a line leaving the decision ${n.id} has no label: every line out of a decision says which way it is`);
    }
    if (type === "architecture" && spec.dependents) dependencyFold(spec, nodes, edges, legend, Boolean(spec.layout === "auto"), dev, error, warn);
  } else if (dev) {
    for (const s of steps) if ("n" in s) {
      if (!byId.has(s.from) || !byId.has(s.to)) warn(`message ${s.n} names ${!byId.has(s.from) ? s.from : s.to}, which is not a participant`);
    }
  }

  // Placement checks (development only): two nodes in one cell, a non-member inside a group's box, more than one focal node. A type of its own places its
  // parts itself, and only a routed one is on the author's grid.
  const gridded = !ext || ext.routed;
  if (checks && type !== "sequence" && !unplaced && gridded) {
    const cells = new Map<string, string>();
    for (const n of nodes) for (let r = n.row; r <= n.row2; r++) {
      const key = `${n.col}:${r}`;
      if (cells.has(key)) warn(`${n.id} and ${cells.get(key)} share the cell at column ${n.col}, row ${r}`);
      cells.set(key, n.id);
    }
  }
  if (checks && !unplaced) {
    for (const g of groups) {
      const m = g.all.map((id) => byId.get(id)!);
      if (!m.length) continue;
      const box = { c1: Math.min(...m.map((n) => n.col)), c2: Math.max(...m.map((n) => n.col)), r1: Math.min(...m.map((n) => n.row)), r2: Math.max(...m.map((n) => n.row2)) };
      for (const n of nodes) if (!g.all.includes(n.id) && n.col >= box.c1 && n.col <= box.c2 && n.row >= box.r1 && n.row <= box.r2) warn(`${n.id} is inside the box of the group "${g.label}" but not a member`);
      const idx = m.map((n) => n.i);
      if (Math.max(...idx) - Math.min(...idx) + 1 !== idx.length) warn(`the members of the group "${g.label}" are not next to each other in the author's order, so the stacked drawing cannot wrap them in one box`);
    }
    for (const n of nodes) if (n.group && !groups.some((g) => g.id === n.group)) warn(`${n.id} names the group "${n.group}", which is not in groups`);
    if (nodes.filter((n) => n.focal).length > 1) warn("more than one node is focal: a diagram has one at most");
    // The key's words: main, dashed and the focal node must have them when drawn. A type of its own checks its own (its key's notation is built in).
    const kinds = ext ? new Set<DiagramLineKind>() : new Set<DiagramLineKind>(type === "sequence" ? steps.flatMap((s) => ("n" in s ? [s.kind] : [])) : edges.map((e) => e.kind));
    if (kinds.has("main") && !legend.main) warn("main lines are drawn but the legend has no words for them (legend.main)");
    if (kinds.has("dashed") && !legend.dashed) warn("dashed lines are drawn but the legend has no words for them (legend.dashed)");
    if (nodes.some((n) => n.focal) && !legend.focal) warn("a focal node is drawn but the legend has no words for what it marks (legend.focal)");
  }

  // Motion (DECISIONS 292). Movers and flow belong to an architecture and a data flow, the run to a sequence; anywhere else they are not read. The
  // development errors about them are the motion module's (motionErrors), which only an animated figure loads.
  const movers = type === "architecture" || type === "data-flow";
  const route = (v: unknown): string[] | undefined => (Array.isArray(v) && v.length > 1 ? v.map(String) : undefined);
  const packetIn = movers && spec.packet && typeof spec.packet === "object" ? spec.packet : undefined;
  const packetPath = packetIn && route(packetIn.path);
  const motion: Model["motion"] = {
    animated: spec.motion === "animated",
    pulse: movers ? route(spec.pulse) : undefined,
    packet: packetPath ? { path: packetPath, repeat: packetIn!.repeat === true, send: packetIn!.send } : undefined,
    run: type === "sequence" && spec.run === true,
    firstVisit: spec.entrance === "first-visit" || undefined,
  };
  if (checks) for (const n of nodes) {
    const says = n.mark?.says;
    if (!says?.length) continue;
    // A step's lane label counts as its words (DECISIONS 306, 1.6).
    const words = [n.name, n.kind, n.detail, n.laneLabel].filter(Boolean).join(" ").toLowerCase();
    if (!says.some((w) => words.includes(w.toLowerCase()))) warn(`${n.id}'s mark stands for ${says.join(" or ")}, and none of its words say so`);
  }
  // Activation bars (1.2): a stack on each participant. `activate` opens one on the receiver, `deactivate` closes the sender's top one after its message;
  // a bar left open closes at that participant's last message. Three deep at most.
  const bars: MBar[] = [];
  if (type === "sequence") {
    const open = new Map<string, MBar[]>();
    const last = new Map<string, number>();
    for (const st of steps) if ("n" in st) { last.set(st.from, st.n); last.set(st.to, st.n); }
    for (const st of steps) {
      if (!("n" in st)) continue;
      if (st.activate) {
        const stack = open.get(st.to) ?? [];
        if (stack.length >= 3) dev && error(`message ${st.n} opens a fourth bar on ${st.to}: three deep at most`);
        else { const bar = { who: st.to, from: st.n, to: st.n, depth: stack.length + 1 }; stack.push(bar); bars.push(bar); open.set(st.to, stack); }
      }
      if (st.deactivate) {
        const stack = open.get(st.from);
        const top = stack?.pop();
        if (!top) dev && error(`message ${st.n} closes a bar on ${st.from}, which has none open`);
        else top.to = st.n;
      }
    }
    for (const [who, stack] of open) for (const bar of stack) bar.to = Math.max(bar.from, last.get(who) ?? bar.from);
  }
  const fl = (spec.frameLabels ?? {}) as Record<string, unknown>;
  const frameWords = { opt: txt(fl.opt) ?? "Only if", loop: txt(fl.loop) ?? "Repeats", alt: txt(fl.alt) ?? "One of these", else: txt(fl.else) ?? "Otherwise" };
  // An automatic figure's tracks include those that hold only a main line's way (DECISIONS 322, rule 1).
  const placed = spec.layout === "auto" && !unplaced ? options.placement : undefined;
  // A routed type of its own (the schedule) is on the author's grid or the placement's, as an architecture is: its tracks are its cards'.
  const ownGrid = built && !ext!.routed;
  let cols = ownGrid ? Math.max(1, built!.cols) : Math.max(1, placed?.cols ?? 1, ...nodes.map((n) => n.col));
  // Right to left (1.7): column 1 at the right. Columns are mirrored, a frame's span with them, and a named left or right side swaps. A type of its own
  // that is not routed mirrors by logical properties, so its model is not mirrored.
  if (options.rtl && gridded) {
    for (const n of nodes) n.col = cols - n.col + 1;
    const swap = (side?: DiagramSide) => (side === "left" ? "right" : side === "right" ? "left" : side);
    for (const e of edges) { e.fromSide = swap(e.fromSide); e.toSide = swap(e.toSide); }
    for (const st of steps) if ("open" in st) { const [a, b] = [cols - st.b + 1, cols - st.a + 1]; st.a = a; st.b = b; }
    // A way-only track (DECISIONS 322) is a track right to left too (Neon's P3 of the code review).
    cols = Math.max(1, placed?.cols ?? 1, ...nodes.map((n) => n.col));
  }
  const rows = ownGrid ? Math.max(1, built!.rows) : type === "data-flow" ? Math.max(1, lanes.length) : Math.max(1, placed?.rows ?? 1, ...nodes.map((n) => n.row2));
  const model: Model = { ext, plan: built?.plan, dir: placed?.direction ?? (spec.direction === "down" ? "down" : undefined), type, title: String(spec.title ?? ""), heading: heading as Model["heading"], legend, nodes, byId, edges, groups, lanes, steps, bars, frameWords, cols, rows, shapeLabels, stepWord, warnings, errors, motion, memo: new Map(), rtl: options.rtl || undefined, unplaced: unplaced || undefined, text: (type === "sequence" && spec.variant === "text") || undefined, marks: edges.some((e) => e.card) || undefined };
  ext?.adopt?.(model, spec, kit);
  if (spec.layout === "auto" && !unplaced && type !== "schema") chooseSides(model);
  if (checks) for (const [id, h0] of Object.entries(portFloors(model))) if (h0 >= 48) warn(`${id} grows to ${h0}px to hold the lines on one side: use another side`);
  // A figure with no cells yet (an automatic one before its placement) has no spatial keys to check.
  if (checks && nodes.length > 100) warn(`the figure has ${nodes.length} cards: more than 100, which automatic layout places on the main thread`);
  if (checks && gridded && nodes.length > 1 && !unplaced && !spatialTable(model)) warn("some part cannot be reached from another by the arrow keys where the figure is drawn, so its arrows keep the author's order");
  return model;
}

/**
 * A dependency figure (DECISIONS 359, Ops 4), an architecture with `dependents`: the engine owns three things. The count: each card's detail starts with
 * the number of cards that have a line to it, in the author's words. The cycle: every line with both ends in one strongly connected set is dashed, in the
 * direction it was written. The ranks are automatic layout's (longest path from the sources, diagram-layout). In an authored figure a line outside a cycle
 * that does not end in a later column draws a development warning.
 */
function dependencyFold(spec: DiagramSpec, nodes: MNode[], edges: MEdge[], legend: DiagramLegend, auto: boolean, dev: boolean, error: (s: string) => void, warn: (s: string) => void) {
  const words = spec.dependents!;
  const one = String(words.one ?? "dependent"), other = String(words.other ?? "dependents");
  for (const n of nodes) {
    const count = new Set(edges.filter((e) => e.to === n.id && e.from !== n.id).map((e) => e.from)).size;
    if (dev && n.detail && /\b\d+\s+(dependents?|depend)/i.test(n.detail)) warn(`${n.id}'s detail writes a count: the engine writes each card's count of dependents, so write none by hand`);
    n.detail = `${count} ${count === 1 ? one : other}${n.detail ? ` · ${n.detail}` : ""}`;
  }
  // The strongly connected sets (Tarjan's, without recursion): a line inside one is in a cycle.
  const index = new Map<string, number>(), low = new Map<string, number>(), comp = new Map<string, number>();
  const stack: string[] = [], on = new Set<string>();
  let next = 0, comps = 0;
  const out = (id: string) => edges.filter((e) => e.from === id).map((e) => e.to);
  for (const root of nodes.map((n) => n.id)) {
    if (index.has(root)) continue;
    const work: Array<{ id: string; k: number }> = [{ id: root, k: 0 }];
    index.set(root, next); low.set(root, next++); stack.push(root); on.add(root);
    while (work.length) {
      const top = work[work.length - 1]!;
      const kids = out(top.id);
      if (top.k < kids.length) {
        const w = kids[top.k++]!;
        if (!index.has(w)) { index.set(w, next); low.set(w, next++); stack.push(w); on.add(w); work.push({ id: w, k: 0 }); }
        else if (on.has(w)) low.set(top.id, Math.min(low.get(top.id)!, index.get(w)!));
        continue;
      }
      work.pop();
      if (work.length) low.set(work[work.length - 1]!.id, Math.min(low.get(work[work.length - 1]!.id)!, low.get(top.id)!));
      if (low.get(top.id) === index.get(top.id)) { let w: string; do { w = stack.pop()!; on.delete(w); comp.set(w, comps); } while (w !== top.id); comps++; }
    }
  }
  const size = new Map<number, number>();
  for (const c of comp.values()) size.set(c, (size.get(c) ?? 0) + 1);
  const inCycle = (e: MEdge) => e.from === e.to || (comp.get(e.from) === comp.get(e.to) && (size.get(comp.get(e.from)!) ?? 0) > 1);
  const cycles: string[] = [];
  for (const e of edges) {
    if (inCycle(e)) { e.kind = "dashed"; cycles.push(`${e.from} to ${e.to}`); continue; }
    if (e.kind === "dashed") { dev && error(`the line from ${e.from} to ${e.to} is dashed and in no cycle: in a dependency figure dashed means a cycle, so it is drawn plain`); e.kind = "plain"; }
    if (dev && !auto) { const a = nodes.find((n) => n.id === e.from)!, b = nodes.find((n) => n.id === e.to)!; if (b.col <= a.col) warn(`the line from ${e.from} to ${e.to} is in no cycle and does not end in a later column`); }
  }
  if (dev && cycles.length && !legend.dashed) error(`a cycle is drawn (${cycles.join(", ")}) but the key's dashed line has no words (legend.dashed)`);
}

/**
 * An automatic figure's sides (1.8): nobody names one, so each line tries the router's shapes in order (sideways out and up or down in, up or down out
 * and sideways in, then the two straight-on shapes; in one row or column the straight line, then a turn-back either side) and takes the first that
 * passes through no card and puts no fourth line on a side. The line with the fewest clean shapes chooses first, then main lines, then the author's
 * order. A side the author named is kept.
 */
function chooseSides(m: Model) {
  const taken = new Set(m.nodes.map((n) => `${n.col},${n.row}`));
  const between = (p: number, q: number) => { const out: number[] = []; for (let k = Math.min(p, q) + 1; k < Math.max(p, q); k++) out.push(k); return out; };
  type Shape = { sides: [DiagramSide, DiagramSide]; cells: Array<[number, number]> };
  const shapes = (e: MEdge): Shape[] => {
    const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
    const sx: DiagramSide = b.col > a.col ? "right" : "left", sy: DiagramSide = b.row > a.row ? "bottom" : "top";
    const ex: DiagramSide = b.col > a.col ? "left" : "right", ey: DiagramSide = b.row > a.row ? "top" : "bottom";
    const along = (lo: number, hi: number, at: number, horizontal: boolean) => between(lo, hi).map((k) => (horizontal ? [k, at] : [at, k]) as [number, number]);
    let list: Shape[];
    // A turn-back runs in the gutter beside its side (DECISIONS 322, rule 4): it is a shape only where a track lies beyond that side, so none is chosen on
    // the drawing's own edge, where it would leave the drawing.
    const turn = (side: DiagramSide): Shape[] => ((side === "right" ? a.col < m.cols : side === "left" ? a.col > 1 : side === "bottom" ? a.row < m.rows : a.row > 1) ? [{ sides: [side, side], cells: [] }] : []);
    if (a.row === b.row) list = [{ sides: [sx, ex], cells: along(a.col, b.col, a.row, true) }, ...turn("bottom"), ...turn("top")];
    else if (a.col === b.col) list = [{ sides: [sy, ey], cells: along(a.row, b.row, a.col, false) }, ...turn("right"), ...turn("left")];
    else list = [
      { sides: [sx, ey], cells: [...along(a.col, b.col, a.row, true), [b.col, a.row], ...along(a.row, b.row, b.col, false)] },
      { sides: [sy, ex], cells: [...along(a.row, b.row, a.col, false), [a.col, b.row], ...along(a.col, b.col, b.row, true)] },
      { sides: [sx, ex], cells: along(a.col, b.col, a.row, true) },
      { sides: [sy, ey], cells: along(a.row, b.row, a.col, false) },
    ];
    return list.filter((c) => c.cells.every(([x, y]) => !taken.has(`${x},${y}`)));
  };
  const load = new Map<string, number>();
  const left = new Set<string>();
  // Sides the author named count before any line chooses (DECISIONS 322, rule 3).
  for (const e of m.edges) if (e.fromSide || e.toSide) {
    const [d1, d2] = defaultSides(m.byId.get(e.from)!, m.byId.get(e.to)!);
    const s1 = e.fromSide ?? d1, s2 = e.toSide ?? d2;
    left.add(`${e.from}.${s1}`);
    for (const [id, side] of [[e.from, s1], [e.to, s2]] as const) load.set(`${id}.${side}`, (load.get(`${id}.${side}`) ?? 0) + 1);
  }
  const order = m.edges.map((_, k) => k).sort((p, q) => shapes(m.edges[p]!).length - shapes(m.edges[q]!).length || Number(m.edges[q]!.kind === "main") - Number(m.edges[p]!.kind === "main") || p - q);
  for (const k of order) {
    const e = m.edges[k]!;
    if (e.fromSide || e.toSide) continue;
    // A decision's lines meet at its four points (DECISIONS 322, rule 3): a point a line leaves takes no other line, so two lines never leave one point on
    // one another and a line never arrives where one leaves. Lines that arrive at one point join, three at most, as on any side.
    const room = (id: string, side: DiagramSide, leaving: boolean) => {
      const key = `${id}.${side}`;
      if ((load.get(key) ?? 0) >= 3) return false;
      if (m.byId.get(id)!.shape !== "decision") return true;
      return leaving ? !load.has(key) : !left.has(key);
    };
    const ok = shapes(e).find((c) => room(e.from, c.sides[0], true) && room(e.to, c.sides[1], false));
    if (!ok) continue;
    left.add(`${e.from}.${ok.sides[0]}`);
    for (const [id, side] of [[e.from, ok.sides[0]], [e.to, ok.sides[1]]] as const) load.set(`${id}.${side}`, (load.get(`${id}.${side}`) ?? 0) + 1);
    e.fromSide = ok.sides[0];
    e.toSide = ok.sides[1];
  }
}

/** A card's mark from the author's data: a bundled id (a string), or `{ onLight, onDark }` (with the words a bundled one stands for, `says`). */
function markOf(v: unknown, warn?: (message: string) => void): MNode["mark"] {
  if (typeof v === "string") return v ? { id: v } : undefined;
  if (!v || typeof v !== "object") return undefined;
  const o = v as { onLight?: unknown; onDark?: unknown; says?: unknown };
  const onLight = markUrl(txt(o.onLight), warn);
  if (!onLight) return undefined;
  return { onLight, onDark: markUrl(txt(o.onDark), warn) ?? onLight, says: Array.isArray(o.says) ? o.says.map(String) : undefined };
}
/** A mark is an image the app ships: a relative path, https, or a data: image. Anything else (a script scheme, another document) is no mark. */
function markUrl(u: string | undefined, warn?: (message: string) => void): string | undefined {
  if (!u) return undefined;
  if (/^data:image\//i.test(u.trim())) return u;
  try {
    if (/^https?:$/.test(new URL(u, "https://basalt.invalid/").protocol) && !/^http:/i.test(u.trim())) return u;
  } catch { /* not a URL: no mark */ }
  warn?.(`a card's mark ${JSON.stringify(u.slice(0, 60))} is not a relative path, https or a data: image, so it is not drawn`);
  return undefined;
}
/** A URL as a CSS string: what would end it or the declaration is escaped (a line break, a return, a form feed, a quote, a backslash, a semicolon), so a URL can only ever be read as one. */
const cssUrl = (u: string) => `url("${u.replace(/[\\"\n\r\f;]/g, (c) => (c === "\n" ? "\\a " : c === "\r" ? "\\d " : c === "\f" ? "\\c " : c === ";" ? "\\3b " : `\\${c}`))}")`;

/** A value worked out once a model (the stack's plan, the sentences, the key and the list), kept on the model so a state change does not redo it. */
export function memo<T>(m: Model, key: string, make: () => T): T {
  if (!m.memo.has(key)) m.memo.set(key, make());
  return m.memo.get(key) as T;
}

const MAX_LABEL = 28;
/** How many lines a label is drawn on: one, or two where its author wrote a break (DECISIONS 306, 1.4). The engine never breaks one. */
const labelLines = (text: string) => (text.includes("\n") ? 2 : 1);
/** A label as words: its lines joined with a space (the list and the sentences). */
const said = (text: string) => text.replace(/\n/g, " ");

// ============================================================================================================================================
// Words: sentences, the key, the list
// ============================================================================================================================================

export const sentence = (s: string) => { const t = s.trim(); return !t ? "" : /[.!?]$/.test(t) ? t : `${t}.`; };

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
  return memo(m, `sentence:${n.i}`, () => writeSentence(m, n));
}
function writeSentence(m: Model, n: MNode): string {
  if (m.ext?.sentence) return m.ext.sentence(m, n);
  const parts: string[] = [];
  if (m.type === "schema") {
    parts.push(`${n.name}, table.`);
    // A stated cardinality adds its clause (1.1): "users (decided_by: zero or many approvals to zero or one users)".
    const refs = (n.columns ?? []).filter((c) => c.ref).map((c) => `${c.ref!.table} (${c.name}${c.card ? `: ${cardClause(n.id, c.ref!.table, c.card)}` : ""})`);
    const by = m.edges.filter((e) => e.to === n.id).map((e) => `${e.from} (${m.byId.get(e.from)!.columns![e.fromRow!]!.name}${e.card ? `: ${cardClause(e.from, e.to, e.card)}` : ""})`);
    if (refs.length) parts.push(`References ${refs.join(", ")}.`);
    if (by.length) parts.push(`Referenced by ${by.join(", ")}.`);
  } else if (m.type === "sequence") {
    const sends = m.steps.filter((s) => "n" in s && s.from === n.id).length;
    const gets = m.steps.filter((s) => "n" in s && s.to === n.id).length;
    parts.push(sentence(n.kind ? `${n.name}, ${n.kind}` : n.name));
    parts.push(`Sends ${sends} ${sends === 1 ? "message" : "messages"} and receives ${gets}.`);
    const w = working(m, n);
    if (w) parts.push(w.trim());
  } else {
    const what = m.type === "data-flow" ? `${m.stepWord(n.step!)} of ${m.nodes.length}, ${n.laneLabel}${n.shape === "decision" ? `, ${m.shapeLabels.decision.toLowerCase()}` : ""}` : m.type === "flowchart" ? shapeWord(m, n) : n.kind;
    parts.push(sentence(what ? `${n.name}, ${what}` : n.name));
    if (n.detail) parts.push(sentence(n.detail));
    if (m.ext?.sentenceMore) parts.push(...m.ext.sentenceMore(m, n));
    // The chain, innermost first: "In Data & logs, in AWS · your account." (1.3)
    if (n.group) { const g = m.groups.find((x) => x.id === n.group); const outer = g?.parent ? m.groups.find((x) => x.id === g.parent) : undefined; if (g) parts.push(outer ? `In ${g.label}, in ${outer.label}.` : `In ${g.label}.`); }
    const from = m.edges.filter((e) => e.to === n.id).map((e) => `${m.byId.get(e.from)!.name}${e.label ? ` (${said(e.label)})` : ""}`);
    const to = m.edges.filter((e) => e.from === n.id).map((e) => `${m.byId.get(e.to)!.name}${e.label ? ` (${said(e.label)})` : ""}`);
    if (from.length) parts.push(`From: ${from.join(", ")}.`);
    if (to.length) parts.push(`To: ${to.join(", ")}.`);
  }
  if (n.focal && m.legend.focal) parts.push(sentence(m.legend.focal));
  return parts.join(" ");
}

/** A foreign key's cardinality in words (1.1): "zero or many approvals to zero or one users". Table names are written as given. */
/** The same clause in the list, its table names as code. */
const cardClauseCode = (from: string, to: string, card: { from: DiagramCardinality; to: DiagramCardinality }, code: (s: string) => VElement): VChild[] => [`${CARD_WORDS[card.from].toLowerCase()} `, code(from), ` to ${CARD_WORDS[card.to].toLowerCase()} `, code(to)];
const cardClause = (from: string, to: string, card: { from: DiagramCardinality; to: DiagramCardinality }) => `${CARD_WORDS[card.from].toLowerCase()} ${from} to ${CARD_WORDS[card.to].toLowerCase()} ${to}`;

/** A participant's working stretches in words (1.2): " Working during messages 6 to 12." (and "message 3" for one). */
function working(m: Model, n: MNode): string {
  const bars = m.bars.filter((b) => b.who === n.id && b.depth === 1);
  if (!bars.length) return "";
  const word = m.legend.activation ?? "Working";
  return ` ${word} during ${bars.map((b) => (b.from === b.to ? `message ${b.from}` : `messages ${b.from} to ${b.to}`)).join(" and ")}.`;
}

/**
 * What a tap does (DECISIONS 306, 1.5): a `click` from a touch or a pen pointer on a card traces it, on the same card or the drawing's ground clears it.
 * A linked card follows its link and is never traced. Returns the trace to show, or undefined where the tap changes nothing.
 */
export function tapTrace(fig: HTMLElement, P: string, event: MouseEvent, current: string | null): string | null | undefined {
  const type = (event as PointerEvent).pointerType;
  if (type !== "touch" && type !== "pen") return undefined;
  const drawing = fig.querySelector(`.${P}-drawing`);
  const target = event.target as Element | null;
  if (!drawing || !target || !drawing.contains(target) || !fig.querySelector(`.${P}-edge`)) return undefined;
  const node = target.closest<HTMLElement>(`.${P}-node`);
  if (node?.hasAttribute("href")) return undefined;
  // A tap on the ground clears a trace; with none up it is nothing, so it never makes a figure "on touch" (Neon's P7 of the code review).
  if (!node) return current === null ? undefined : null;
  return node.dataset.node === current ? null : node.dataset.node ?? null;
}

/** The noun the key hint and the keys sentence use for one stop. */
function stopNoun(m: Model): string {
  if (m.ext) return m.ext.stop;
  return m.type === "architecture" ? "a part" : m.type === "sequence" ? "a participant" : m.type === "schema" ? "a table" : "a step";
}

// ============================================================================================================================================
// The markup tree
// ============================================================================================================================================

export type VAttrs = Record<string, string | number | boolean | null | undefined>;
export interface VElement { t: string; a: VAttrs; c: VNode[] }
export interface VSlot { slot: "source" | "summary" | "hint" | "toggle" }
export type VNode = string | VElement | VSlot;

export type VChild = VNode | null | undefined | false | VChild[];
/** A tree element. The type modules (DECISIONS 359) build their drawings with it. */
export function h(t: string, a: VAttrs | null, ...c: VChild[]): VElement {
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
  // Names are the engine's own; a name that is not a plain one never reaches the page as syntax.
  if (!/^[a-z][a-z0-9]*$/.test(v.t)) throw new Error(`diagram: "${v.t}" is not an element name`);
  let attrs = "";
  for (const [k, value] of Object.entries(v.a)) {
    if (value === undefined || value === null || value === false) continue;
    if (!/^[a-z][a-z0-9:-]*$/i.test(k)) throw new Error(`diagram: "${k}" is not an attribute name`);
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
  /** A decision's words' box, widened from 62% of its track so the diamond is no taller than it is wide, by node id, in px (unset where 62% is). */
  words?: Record<string, number>;
  /** Extra lines of 16 added to the gap above a stacked card, when a label did not fit its seat. */
  grow?: Record<string, number>;
  /** The schema's stacked track: its widest row, measured. */
  track?: number;
  open?: boolean;
  /** A stack that still overlaps after every try draws no lines (1.13): it is dressed as where scripting is off, with no line in the key, no
   *  key hint, no stops and the list open. */
  bare?: boolean;
  /** The list was opened by a bare stack, not by the reader: it closes again when lines are drawn. A press of the toggle clears it. */
  autoOpen?: boolean;
  /** The text variant shows its art (1.2): its widest line fits the block. */
  art?: boolean;
  /** The drawn layout keeps space-3 above its first row and below its last, so a label beside a line in a 40px row has a seat (1.8). */
  pad?: boolean;
  /** A schema's rows with its corridors (DECISIONS 306, 1.1): a grid-template-rows of spacer tracks round the author's rows, set only where a far key is drawn. */
  rows?: string;
  /** A type of its own's form inside a layout (DECISIONS 359): a gantt's stack "tracks" or "words". Written as `data-form`. */
  form?: string;
  /** A type of its own's measured places (DECISIONS 359): by part id, the style its part takes; "" keys the drawing's own. */
  place?: Record<string, string>;
  /** A drawn layout of one column (the one-column ruling, diagrams-cimip): its column's least width, in px. The stylesheet caps the drawing at
   *  size-breakpoint-container, or at this where it is more, so the cap never takes the track under its minimum. */
  one?: number;
}

export interface TreeIds { base: string }
const idsOf = (base: string) => ({ title: `${base}-title`, summary: `${base}-summary`, keys: `${base}-keys`, list: `${base}-list`, toggle: `${base}-toggle` });

/** Whether the figure's nodes are stops (a roving tab index) in this state. */
export function hasStops(m: Model, dyn: Dyn): boolean {
  if (m.ext?.hasStops) return m.ext.hasStops(m, dyn);
  if (!dyn.layout || dyn.bare) return false;
  if (dyn.layout === "drawn") return true;
  return m.type !== "sequence" && m.type !== "schema";
}
/** Whether the nodes are images named by a sentence in this state (before script, the types whose stack has lines). */
function nodesAreImages(m: Model, dyn: Dyn): boolean {
  if (m.ext) return true;
  if (m.type === "sequence" || m.type === "schema") return dyn.layout === "drawn";
  return true;
}

/** A group's cells, its own members' and its child groups'. */
function groupCells(m: Model, g: Model["groups"][number]) {
  const mem = g.all.map((id) => m.byId.get(id)!);
  if (!mem.length) return null;
  return { c1: Math.min(...mem.map((n) => n.col)), c2: Math.max(...mem.map((n) => n.col)), r1: Math.min(...mem.map((n) => n.row)), r2: Math.max(...mem.map((n) => n.row2)) };
}
/**
 * How many group levels reach each edge of the grid (DECISIONS 306, 1.3): the top row, the end column, the bottom row and the start column. A nested
 * group's box is space-4 inside its parent's at the sides and below and space-8 below its top, so each level that reaches an edge takes that room again.
 */
export function groupEdges(m: Model): [number, number, number, number] {
  return memo(m, "group-edges", () => {
    const out: [number, number, number, number] = [0, 0, 0, 0];
    for (const g of m.groups) {
      const c = groupCells(m, g);
      if (!c) continue;
      const at = [c.r1 === 1, c.c2 === m.cols, c.r2 === m.rows, c.c1 === 1];
      // A group reaches an edge with its own depth when its child does too, or alone at depth 1.
      at.forEach((on, k) => { if (on) out[k] = Math.max(out[k]!, groupLevels(m, g, k)); });
    }
    return out;
  });
}
/** How many boxes a group draws past its cells on one side: 1, and 1 more for a child group that reaches that side of it. */
function groupLevels(m: Model, g: Model["groups"][number], side: number): number {
  const c = groupCells(m, g)!;
  const kids = m.groups.filter((k) => k.parent === g.id);
  const reaches = kids.some((k) => { const kc = groupCells(m, k); return kc && [kc.r1 === c.r1, kc.c2 === c.c2, kc.r2 === c.r2, kc.c1 === c.c1][side]; });
  return reaches ? 2 : 1;
}
/** How many group levels reach the start and the end columns: each adds space-4 to the least width. */
export function groupReach(m: Model): number {
  const e = groupEdges(m);
  return e[1] + e[3];
}

/** The figure's columns as the least-width rules count them: a sequence's participants, a data flow's step columns, everyone else's tracks. */
export function columnCount(m: Model): number { return m.type === "sequence" ? m.nodes.length : m.cols; }

// ---- The stacked drawing's plan: routes and gaps from the order alone (1.13) ----

export type StackRoute = "down" | "up" | "trunk" | "rail" | "end-down" | "end-up";
export interface StackPlan { routes: StackRoute[]; gutter: boolean; lanes: number[]; exits: number[]; gaps: Record<string, number>; third: boolean; laneCount: number }

/** The stacked drawing's routes, end lanes and the gap above each card (in px of the space scale), from the author's order. */
export function stackPlan(m: Model): StackPlan {
  return memo(m, "plan", () => planStack(m));
}
function planStack(m: Model): StackPlan {
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
  // Lanes in the gutter, nested (1.7 rule 3): of two overlapping lines the one that travels farther takes the outer lane; equal travel, the
  // earlier is inside. Allocated across each overlapping set: shortest first, each one lane outside every overlapping line already placed,
  // so no two overlapping lines share a lane. A line that would need a fifth lane is the development error (`third`).
  const travel = (e: MEdge) => { const [a, b] = span(e); return b - a; };
  const lanes = m.edges.map(() => 0);
  let third = false;
  const placed: typeof ends = [];
  for (const it of [...ends].sort((x, y) => travel(x.e) - travel(y.e) || x.k - y.k)) {
    let lane = 0;
    for (const o of placed) if (overlaps(o.e, it.e)) lane = Math.max(lane, lanes[o.k]! + 1);
    lanes[it.k] = lane;
    // Four lanes at most (DECISIONS 306, 1.3): a fifth is the last resort, no lines and the list open.
    if (lane > 3) third = true;
    placed.push(it);
  }
  const laneCount = Math.max(0, ...ends.map(({ k }) => lanes[k]! + 1));
  // Where an end line leaves its card: the middle, or the thirds when two leave one card (the farther one nearer the top going down, nearer the bottom going up).
  const exits = m.edges.map(() => 0.5);
  for (const n of order) {
    const leaving = ends.filter(({ e }) => e.from === n.id);
    if (leaving.length < 2) continue;
    const down = leaving.filter(({ k }) => routes[k] === "end-down").sort((x, y) => travel(y.e) - travel(x.e) || x.k - y.k);
    const up = leaving.filter(({ k }) => routes[k] === "end-up").sort((x, y) => travel(x.e) - travel(y.e) || y.k - x.k);
    // The lines going up leave above the lines going down, so a line out each way from one card never runs on the other in the lane.
    [...up, ...down].forEach(({ k }, j, all) => { exits[k] = all.length === 2 ? (j === 0 ? 1 / 3 : 2 / 3) : (j + 1) / (all.length + 1); });
  }
  // The gap above each card (1.13): 32 for a plain entry, 40 for a branch entry with its label beside the elbow, 48 for a labelled stem, rail
  // entry or end-line turn, 64 when two labelled entries share it or a turn from the card above and a turn into the card below share it.
  // A data flow keeps 48 between every step.
  const gaps = record<number>();
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
    // Several end lines into one card (1.3) turn space-5 apart: the gap above it grows space-5 for each entry past the first (and below a card for lines
    // that enter it from below).
    const downInto = ends.filter(({ e, k }) => routes[k] === "end-down" && m.byId.get(e.to)!.i === b).length;
    const upInto = ends.filter(({ e, k }) => routes[k] === "end-up" && m.byId.get(e.to)!.i === b - 1).length;
    gap += 20 * Math.max(0, downInto - 1) + 20 * Math.max(0, upInto - 1);
    gaps[card.id] = gap;
    void above;
  }
  return { routes, gutter, lanes, exits, gaps, third, laneCount };
}

// ---- Swatches: each drawn exactly as its mark ----

export const svgA = (w: number, hgt: number): VAttrs => ({ width: w, height: hgt, viewBox: `0 0 ${w} ${hgt}`, "aria-hidden": "true", focusable: "false" });

/** A line swatch, 24 wide and 16 tall: the same stroke, dash and head as the line. */
export function lineSwatch(P: string, kind: DiagramLineKind | "fk"): VElement {
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
/** A cardinality swatch (1.1): a 24px line carrying the form, its table's edge at the end. */
function cardSwatch(P: string, form: DiagramCardinality): VElement {
  const { crow, ring } = cardMarks(form, 24, 8.5, -1);
  return h("svg", { class: `${P}-swatch`, "data-card": form, ...svgA(24, 16) },
    h("path", { class: `${P}-line`, "data-kind": "plain", d: "M0 8.5H24" }),
    h("path", { class: `${P}-crow`, d: crow }),
    ring ? h("circle", { class: `${P}-ring`, cx: ring.x, cy: ring.y, r: ring.r }) : null);
}

/**
 * A form's marks at one end of a line (1.1), Information Engineering's, from the table's edge `edge` along the line at `y`, `out` the way away from
 * the table (+1 or -1). Each bar is a 1px tick size-diagram-head across, its ink the pixel that ends at its distance; a foot is three spokes from a
 * point at 7.5 to the edge, space-1 either side of the line; a ring is size-dot across its stroke's middle, centred at 10.5, so its ink runs 7 to 14.
 */
export function cardMarks(form: DiagramCardinality, edge: number, y: number, out: number, head = 8, dot = 6): { crow: string; ring?: { x: number; y: number; r: number } } {
  const r2 = (n: number) => String(Math.round(n * 100) / 100);
  const at = (d: number) => edge + out * d;
  const half = head / 2;
  const bar = (d: number) => `M${r2(at(d - 0.5))} ${r2(y - half)}V${r2(y + half)}`;
  const many = form === "one-or-many" || form === "zero-or-many";
  const zero = form === "zero-or-one" || form === "zero-or-many";
  let crow = many ? `M${r2(edge)} ${r2(y - half)}L${r2(at(7.5))} ${r2(y)}L${r2(edge)} ${r2(y + half)}` : bar(4);
  if (!zero) crow += bar(many ? 11 : 8);
  return { crow, ring: zero ? { x: Math.round(at(10.5) * 100) / 100, y, r: dot / 2 } : undefined };
}
export function boxSwatch(P: string, shape: "box" | "terminal" | "decision" | "focal" | "group"): VElement {
  if (shape === "decision") return h("svg", { class: `${P}-swatch`, "data-shape": shape, ...svgA(16, 16) }, h("path", { class: `${P}-swatch-shape`, d: "M8 2.5L14.5 8L8 13.5L1.5 8Z" }));
  if (shape === "terminal") return h("svg", { class: `${P}-swatch`, "data-shape": shape, ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-shape`, x: 0.5, y: 3.5, width: 15, height: 9, rx: 4.5 }));
  return h("svg", { class: `${P}-swatch`, "data-shape": shape, ...svgA(16, 16) }, h("rect", { class: `${P}-swatch-shape`, x: 0.5, y: 2.5, width: 15, height: 11, rx: 2 }));
}

/** The key, built from the marks the model draws: shapes, main, plain, dashed, the foreign-key line, the focal node, the group. */
function keyTree(P: string, m: Model): VElement | null {
  return memo(m, `key:${P}`, () => buildKey(P, m));
}
/** The key alone, for the viewer's foot (DECISIONS 310, 9.2): the same entries the figure draws under its drawing. */
export const figureKey = keyTree;
function buildKey(P: string, m: Model): VElement | null {
  if (m.ext?.key) return m.ext.key(P, m);
  const entries: VElement[] = [];
  const entry = (swatch: VElement, words: string, attrs: VAttrs = {}) => entries.push(h("li", { class: `${P}-entry`, ...attrs }, swatch, h("span", null, iso(words))));
  if (m.type === "schema") {
    // The key seats' letters first, each where a seat holds it, set as the seat sets them, then their words.
    const keys = new Set(m.nodes.flatMap((n) => (n.columns ?? []).map((c) => c.key)));
    for (const [k, words] of [["PK", "Primary key"], ["FK", "Foreign key"]] as const) {
      if (keys.has(k)) entries.push(h("li", { class: `${P}-entry` }, h("span", { class: `${P}-key-letters`, "aria-hidden": "true" }, k), h("span", null, words)));
    }
  }
  if (m.type === "data-flow" && m.nodes.some((n) => n.shape === "decision")) {
    // Where a data flow draws a decision, shape carries type: the key shows "Step" and "Decision", as a flowchart's does (DECISIONS 359, Ops 5).
    entry(boxSwatch(P, "box"), m.shapeLabels.step);
    entry(boxSwatch(P, "decision"), m.shapeLabels.decision);
  }
  if (m.type === "flowchart") {
    const used = new Set(m.nodes.map((n) => n.shape));
    if (used.has("terminal")) entry(boxSwatch(P, "terminal"), m.shapeLabels.terminal);
    if (used.has("box")) entry(boxSwatch(P, "box"), m.shapeLabels.step);
    if (used.has("decision")) entry(boxSwatch(P, "decision"), m.shapeLabels.decision);
  }
  const kinds = new Set<DiagramLineKind>(m.type === "sequence" ? m.steps.flatMap((s) => ("n" in s ? [s.kind] : [])) : m.edges.filter((e) => !e.fk).map((e) => e.kind));
  // The text art's key is its own glyphs (1.2): the key is built from what is drawn.
  const glyph = (g: string, ink: string) => h("span", { class: `${P}-key-glyph`, "data-ink": ink, "aria-hidden": "true" }, g);
  for (const k of ["main", "plain", "dashed"] as const) {
    const words = m.legend[k];
    if (kinds.has(k) && words) entry(m.text ? glyph(k === "main" ? "━━▶" : k === "dashed" ? "┄┄▷" : "──▶", k === "main" ? "main" : "plain") : lineSwatch(P, k), words, { "data-line": m.text ? undefined : "" });
  }
  if (m.type === "schema" && m.edges.length) {
    // The foreign-key line where it is drawn; where it is not, the row says it, and so does the key. A schema that states how many shows each form
    // drawn in its place (1.1), built in because the forms are notation; an unstated line (production, a figure that states some) keeps its entry.
    if (m.edges.some((e) => !e.card)) entry(lineSwatch(P, "fk"), m.legend.plain ?? "A foreign key, to the key it references", { "data-line": "", "data-when": "drawn" });
    const forms = new Set(m.edges.flatMap((e) => (e.card ? [e.card.from, e.card.to] : [])));
    for (const f of CARDS) if (forms.has(f)) entry(cardSwatch(P, f), CARD_WORDS[f], { "data-line": "", "data-when": "drawn", "data-card": f });
    entries.push(h("li", { class: `${P}-entry`, "data-when": "stacked" }, h("span", { class: `${P}-fk-mark`, "aria-hidden": "true" }, m.rtl ? "←" : "→"), h("span", null, "The table a foreign key references")));
  }
  if (m.type === "sequence") {
    // A bar on a dashed lifeline, where one is drawn (1.2); then each frame operator drawn, its letters set as the tab sets them, and its words.
    if (m.bars.length) entry(m.text ? glyph("┃", "working") : h("svg", { class: `${P}-swatch`, "data-shape": "bar", ...svgA(16, 16) }, h("path", { class: `${P}-life`, d: "M8 0V16" }), h("rect", { class: `${P}-bar`, x: 4.5, y: 2.5, width: 7, height: 11, rx: 1.5 })), m.legend.activation ?? "Working", m.text ? {} : { "data-when": "drawn" });
    const ops = new Set(m.steps.flatMap((st) => ("open" in st ? [st.open] : [])));
    for (const op of ["opt", "loop", "alt"] as const) if (ops.has(op)) entries.push(h("li", { class: `${P}-entry` }, h("span", { class: `${P}-key-letters`, "data-op": "" , "aria-hidden": "true" }, op), h("span", null, m.frameWords[op])));
  }
  if (m.ext?.keyMore) entries.push(...m.ext.keyMore(P, m));
  // The text art draws the focal participant in a double-line box: its key shows that glyph (P4 of the pixel review).
  if (m.nodes.some((n) => n.focal) && m.legend.focal) entry(m.text ? glyph("╔═╗", "focal") : boxSwatch(P, "focal"), m.legend.focal, { "data-focal": "" });
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

/** A card's name; a link card's last word is held with its cue (the stylesheet's arrow after it), so the arrow never leaves the name's last word (1.4). */
/** An author's string as a first-strong isolate (`<bdi>`, the diagrams-rtl ruling): it keeps its own order in a figure set right to left, so a closing quote,
 *  bracket or full stop stays at its end. Nothing changes left to right. */
export const iso = (text: string): VElement => h("bdi", null, text);
export function linkName(P: string, n: MNode): VChild {
  // A linked name is not isolated: its cue is drawn after its last word and must stay at the line's end in the figure's direction.
  if (!n.href) return iso(n.name);
  const at = n.name.trimEnd().lastIndexOf(" ");
  return [at < 0 ? "" : n.name.slice(0, at + 1), h("span", { class: `${P}-name-end` }, at < 0 ? n.name : n.name.slice(at + 1))];
}

export function nodeText(P: string, m: Model, n: MNode): VChild[] {
  // A data flow's decision (DECISIONS 359, Ops 5) writes its step line inside the diamond, above its name.
  if (n.shape === "decision") return [h("span", { class: `${P}-words` }, m.type === "data-flow" && n.kind ? h("span", { class: `${P}-kind` }, iso(n.kind)) : null, h("span", { class: `${P}-name` }, linkName(P, n)))];
  const kids: VNode[] = [];
  if (m.type === "data-flow") kids.push(h("span", { class: `${P}-kind` }, iso(n.kind!), h("span", { class: `${P}-lane-word` }, " · ", iso(n.laneLabel ?? ""))));
  else if (n.kind) kids.push(h("span", { class: `${P}-kind` }, iso(n.kind)));
  kids.push(h("span", { class: `${P}-name` }, linkName(P, n)));
  // An identifier breaks only at its spaces: each run between them is kept whole (an ordinary hyphen stays, so a copy is exact).
  // The runs are held in one span, a single left-to-right run right to left (1.7).
  if (n.detail) kids.push(h("span", { class: `${P}-detail`, "data-mono": n.mono ? "" : undefined }, n.mono ? h("span", { class: `${P}-runs` }, words(n.detail).flatMap((w, j) => [j ? " " : "", h("span", { class: `${P}-run` }, w)])) : iso(n.detail)));
  return kids;
}
function tableText(P: string, n: MNode, m: Model): VChild[] {
  return [
    h("span", { class: `${P}-th` }, h("span", { class: `${P}-tname` }, linkName(P, n))),
    h("span", { class: `${P}-rows` }, (n.columns ?? []).map((c, k) => h("span", { class: `${P}-row`, "data-row": k, "data-key": c.key },
      h("span", { class: `${P}-keyseat` }, c.key ?? ""),
      h("span", { class: `${P}-cname` }, iso(c.name)),
      c.ref ? h("span", { class: `${P}-ctype`, "data-ref": "" }, `${m.rtl ? "←" : "→"} `, iso(c.ref.table)) : c.type ? h("span", { class: `${P}-ctype` }, iso(c.type)) : null))),
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
  // Where a schema's corridors are spacer tracks (1.1), the author's row r is track 2r.
  const spaced = dyn.layout === "drawn" && dyn.rows;
  const style: string[] = [`--_c:${n.col}`, `--_r:${spaced ? 2 * n.row : n.row}`, `--_r2:${spaced ? 2 * n.row2 + 1 : n.row2 + 1}`];
  // The row a box starts on stands space-4 lower (the run-edge ruling): the gap above it is space-16, and space-8 of it is clear above the box. An
  // architecture's alone (a deployment's too, read as one); a state's row gap already holds the band. Written 0 or 1, so a new placement never keeps a stale 1.
  if (lowers(m)) style.push(`--_lo:${n.row > 1 && m.groups.some((g) => groupCells(m, g)?.r1 === n.row) ? 1 : 0}`);
  if (m.type === "data-flow") style.push(`--_lc:${n.col + 1}`);
  if (m.type === "sequence") style.push(`--_c2:${n.col + 1}`);
  const plan = ctx.plan;
  if (plan && n.i > 0) {
    const base = own(plan.gaps, n.id) ?? 32;
    const grow = own(dyn.grow, n.id) ?? 0;
    style.push(`--_gap:${grow ? `calc(${gapVar(base)} + var(--basalt-space-4) * ${grow})` : gapVar(base)}`);
  }
  const height = own(dyn.heights, n.id);
  if (height) style.push(`--_h:${height}px`);
  // The least height its ports need (call 3); the stylesheet applies it to the drawn layout alone.
  const floor = own(portFloors(m), n.id);
  if (floor) style.push(`--_mh:${floor}px`);
  const wordsWidth = own(dyn.words, n.id);
  if (wordsWidth) style.push(`--_ww:${wordsWidth}px`);
  const tabbable = stops ? (dyn.stop === n.id ? 0 : -1) : dyn.keep === n.id ? -1 : undefined;
  // A link card is the link itself (1.4): its name is its sentence, read with the link role, and it begins with the card's visible name.
  return h(n.href ? "a" : "div", {
    class: `${P}-node`,
    href: n.href,
    target: n.href && n.blank ? "_blank" : undefined,
    rel: n.href && n.blank ? "noopener noreferrer" : undefined,
    "data-link": n.href ? (n.blank ? "external" : "") : undefined,
    "data-node": n.id,
    "data-shape": n.shape,
    "data-focal": n.focal ? "" : undefined,
    "data-branch": n.branch ? "" : undefined,
    ...m.ext?.nodeAttrs?.(m, n),
    "data-mark": n.mark ? n.mark.id ?? "" : undefined,
    "data-level": ctx.level,
    style: style.join(";"),
    role: images && !n.href ? "img" : undefined,
    "aria-label": images || n.href ? nodeSentence(m, n) : undefined,
    tabindex: tabbable,
  },
  n.shape === "decision" ? h("svg", { class: `${P}-diamond`, viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" }, h("path", { d: "M50 0L100 50L50 100L0 50Z" })) : null,
  // A mark (DECISIONS 292, 2.6): an empty span, the form a background image, so its colours cannot be restyled and nothing of the file reaches the page.
  n.mark ? h("span", { class: `${P}-mark`, "aria-hidden": "true", style: n.mark.onLight ? `--_ml:${cssUrl(n.mark.onLight)};--_md:${cssUrl(n.mark.onDark ?? n.mark.onLight)}` : undefined }) : null,
  n.shape === "table" ? tableText(P, n, m) : m.ext?.card ? m.ext.card(P, m, n, dyn) : nodeText(P, m, n));
}

function drawingChildren(ctx: TreeContext, m: Model, dyn: Dyn): VNode[] {
  const { P } = ctx;
  if (m.ext?.drawing) return m.ext.drawing(P, m, dyn, ctx.level);
  const out: VNode[] = [];
  if (m.type === "data-flow") {
    out.push(...m.lanes.map((l, k) => h("div", { class: `${P}-lane`, style: `--_r:${k + 1}`, "aria-hidden": "true" }, h("span", { class: `${P}-lane-name` }, iso(l.label)))));
  }
  if (grouped(m.type)) {
    for (const g of m.groups) {
      const c = groupCells(m, g);
      if (!c) continue;
      const mark = m.ext?.groupMark?.(m, g, c);
      // A box grown past its cells by one level on each side, and by two where a child group reaches that side of it (1.3).
      const lv = [0, 1, 2, 3].map((k) => groupLevels(m, g, k));
      out.push(h("div", { class: `${P}-gbox`, "data-group": g.id, "data-depth": g.depth > 1 ? g.depth : undefined, style: `--_c:${c.c1};--_c2:${c.c2 + 1};--_r:${c.r1};--_r2:${c.r2 + 1}${lowers(m) ? `;--_lo:${c.r1 > 1 ? 1 : 0}` : ""}${lv[0]! > 1 ? ";--_gt:2" : ""}${lv[1]! > 1 ? ";--_ge:2" : ""}${lv[2]! > 1 ? ";--_gb:2" : ""}${lv[3]! > 1 ? ";--_gs:2" : ""}${mark?.style ?? ""}`, "data-start": mark?.start, "aria-hidden": "true" }, h("span", { class: `${P}-glabel` }, iso(g.label))));
    }
  }
  // The text variant (1.2): one code block, aria-hidden (the title, the summary and the list carry the figure). Before script it holds the transcript;
  // script writes the art where its widest line fits (the diagram-text module).
  if (m.text) return [h("pre", { class: `${P}-text`, "aria-hidden": "true", "data-art": dyn.art ? "" : undefined }, h("code", { class: `${P}-text-ink` }, transcript(P, m)))];
  if (m.type === "sequence") {
    // Drawn, each head is in its column (mirrored right to left, 1.7).
    out.push(h("ul", { class: `${P}-cast` }, m.nodes.map((n) => h("li", { class: `${P}-actor`, style: m.rtl ? `--_ac:${n.col}` : undefined }, nodeTree(ctx, m, n, dyn)))));
    out.push(sequenceSteps(ctx, m));
    return out;
  }
  // Nodes in the author's order; a group's members are wrapped once, so the stacked drawing can draw its box around them. A nested group is a wrapper
  // inside its parent's (1.3).
  const outerOf = (n: MNode) => { const g = n.group ? m.groups.find((x) => x.id === n.group) : undefined; return g?.parent ? m.groups.find((x) => x.id === g.parent) : g; };
  const wrap = (g: Model["groups"][number], run: MNode[], kids: VNode[]) => {
    // A stacked group takes its first member's grown gap above its box (the member itself sits at the top of the box's padding).
    const grow = ctx.plan ? own(dyn.grow, run[0]!.id) ?? 0 : 0;
    // A group whose first card is entered by a turn (a trunk or an end line) has space-12 above it, so the turn runs under its label, not behind it
    // (DECISIONS 306, 1.3, the decider's answer 1 to the pixel review). The label keeps its place in the first space-8.
    const first = run[0]!;
    const turns = ctx.plan && first.group === g.id ? m.edges.filter((e, k) => e.to === first.id && (ctx.plan!.routes[k] === "trunk" || ctx.plan!.routes[k] === "end-down")) : [];
    // A labelled turn's label is seated beside its turn, inside the group (the decider's ruling 4 on the re-check): the group has space-4 more above for each
    // line of the longest such label, so nothing grows above the group for it.
    const lines = Math.max(0, ...turns.map((e) => (e.label ? labelLines(e.label) : 0)));
    const style = [grow ? `--_ggrow:${grow}` : "", lines ? `--_tl:${lines}` : ""].filter(Boolean).join(";");
    return h("div", { class: `${P}-group`, "data-group": g.id, "data-depth": g.depth > 1 ? g.depth : undefined, "data-turn": turns.length ? "" : undefined, "data-start": ctx.plan ? m.ext?.groupMark?.(m, g, null)?.start : undefined, style: style || undefined }, h("span", { class: `${P}-glabel`, "aria-hidden": "true" }, iso(g.label)), kids);
  };
  let k = 0;
  while (k < m.nodes.length) {
    const n = m.nodes[k]!;
    const g = outerOf(n);
    if (!g) { out.push(nodeTree(ctx, m, n, dyn)); k++; continue; }
    const run: MNode[] = [];
    while (k < m.nodes.length && outerOf(m.nodes[k]!)?.id === g.id) run.push(m.nodes[k++]!);
    const kids: VNode[] = [];
    for (let j = 0; j < run.length;) {
      const inner = run[j]!.group !== g.id ? m.groups.find((x) => x.id === run[j]!.group) : undefined;
      if (!inner) { kids.push(nodeTree(ctx, m, run[j]!, dyn)); j++; continue; }
      const sub: MNode[] = [];
      while (j < run.length && run[j]!.group === inner.id) sub.push(run[j++]!);
      kids.push(wrap(inner, sub, sub.map((x) => nodeTree(ctx, m, x, dyn))));
    }
    out.push(wrap(g, run, kids));
  }
  return out;
}

/**
 * The text variant's transcript (1.2), where the art does not fit, as Draft B's reference (B6 of the pixel review): the participants on a line; then each
 * message as its number, sender, arrow and receiver, its label on a line of its own and its note on another, every line of it hanging under the sender
 * inside its frame's indent; frames as indented brackets. A line breaks between participants and between words, never inside a name (each name is held
 * whole). Each line is a block: `--_in` is its indent in characters, `--_hang` how far its first line starts before it.
 */
export function transcript(P: string, m: Model): VNode[] {
  const out: VNode[] = [];
  const held = (s: string) => h("span", { class: `${P}-tx-name` }, s);
  const arrow = (k: DiagramLineKind) => (k === "main" ? "━▶" : k === "dashed" ? "┄▷" : "─▶");
  const line = (attrs: VAttrs, indent: number, hang: number, ...kids: VChild[]) => h("span", { class: `${P}-tx-line`, ...attrs, style: hang ? `--_in:${indent + hang};--_hang:${hang}` : `--_in:${indent}` }, ...kids);
  out.push(line({ "data-ink": "names" }, 0, 0, m.nodes.flatMap((n, k) => [k ? " · " : "", held(n.name)])));
  const digits = String(Math.max(1, ...m.steps.map((s) => ("n" in s ? s.n : 0)))).length;
  let indent = 0;
  for (const s of m.steps) {
    const pad = 2 * indent;
    if ("band" in s) { out.push(line({ "data-ink": "band" }, pad, 0, `── ${s.band} ──`)); continue; }
    if ("open" in s) { out.push(line({ "data-ink": "frame" }, pad, 0, h("span", { "data-ink": "op" }, `[${s.open}]`), ` ${s.label}`)); indent++; continue; }
    if ("otherwise" in s) { out.push(line({ "data-ink": "frame" }, 2 * Math.max(0, indent - 1), 0, h("span", { "data-ink": "op" }, "[else]"), ` ${s.otherwise}`)); continue; }
    if ("close" in s) { indent = Math.max(0, indent - 1); out.push(line({ "data-ink": "frame" }, 2 * indent, 0, "[end]")); continue; }
    const a = m.byId.get(s.from)?.name ?? s.from, b = m.byId.get(s.to)?.name ?? s.to;
    const hang = digits + 2;
    // The arrow and the receiver are one unbreakable run: a route that does not fit breaks before its arrow, and the second line starts with the arrow under
    // the sender (the decider's ruling 3 on the re-check), as the stacked list's route does (66-2).
    out.push(line({ "data-n": s.n }, pad, hang, h("span", { "data-ink": "num" }, String(s.n).padStart(digits, "0")), "  ", held(a), " ", h("span", { class: `${P}-tx-to` }, h("span", { "data-ink": s.kind === "main" ? "main" : "plain" }, arrow(s.kind)), " ", b)));
    out.push(line({ "data-n": s.n }, pad + hang, 0, h("span", { "data-ink": "label" }, s.label)));
    if (s.note) out.push(line({ "data-n": s.n }, pad + hang, 0, h("span", { "data-ink": "note" }, s.note)));
  }
  return out;
}

function sequenceSteps(ctx: TreeContext, m: Model): VElement {
  const { P } = ctx;
  const root: VNode[] = [];
  // Frames (DECISIONS 306, 1.2) are boxes round their rows: each one a block holding its header, its rows and the frames inside it.
  const stack: Array<{ el: VElement; a: number; b: number }> = [];
  const into = () => (stack.length ? stack[stack.length - 1]!.el.c : root);
  let list: VElement | null = null;
  for (const s of m.steps) {
    if ("band" in s) { list = null; into().push(h("p", { class: `${P}-band` }, h("span", null, iso(s.band)))); continue; }
    if ("open" in s) {
      list = null;
      const parent = stack[stack.length - 1];
      // A frame inside a frame is space-2 inside it on every side they share.
      const inset = parent ? `;--_fis:${s.a === parent.a ? 1 : 0};--_fie:${s.b === parent.b ? 1 : 0}` : "";
      const el = h("div", { class: `${P}-frame`, "data-op": s.open, "data-depth": s.depth, style: `--_a:${s.a};--_b:${s.b + 1}${inset}` },
        h("span", { class: `${P}-fbox`, "aria-hidden": "true" }),
        h("p", { class: `${P}-fhead` }, h("span", { class: `${P}-ftab`, "aria-hidden": "true" }, s.open), h("span", { class: `${P}-flabel` }, h("span", { class: ctx.hidden }, `${m.frameWords[s.open]}: `), iso(s.label))));
      into().push(el);
      stack.push({ el, a: s.a, b: s.b });
      continue;
    }
    if ("otherwise" in s) {
      list = null;
      into().push(h("p", { class: `${P}-felse` }, h("span", { class: `${P}-fword`, "aria-hidden": "true" }, "else"), h("span", { class: `${P}-flabel` }, h("span", { class: ctx.hidden }, `${m.frameWords.else}: `), iso(s.otherwise))));
      continue;
    }
    if ("close" in s) { list = null; stack.pop(); continue; }
    if (!list) { list = h("ol", { class: `${P}-msgs`, start: s.n }); into().push(list); }
    const a = m.byId.get(s.from), b = m.byId.get(s.to);
    const ca = a?.col ?? 1, cb = b?.col ?? 1;
    const self = ca === cb;
    // A self-call goes to the end side, the start side on the last participant: logical, so mirrored right to left (1.7).
    const last = self && (m.rtl ? ca !== 1 : ca === m.nodes.length);
    const word = kindWord(m, s.kind);
    // Drawn, the route is the lines (its row is not drawn), so the words a reader hears are written beside it, unseen: a space after the number and the
    // route's own sentence ("Agent to Room · A request"), the stacked row's words in the same order. Stacked, the row itself is read and these are not.
    const spoken = (...text: VChild[]) => h("span", { class: `${P}-spoken ${ctx.hidden}` }, ...text);
    const from = a?.short ?? s.from, to = b?.short ?? s.to, tail = word ? [" · ", iso(word)] : "";
    list.c.push(h("li", { class: `${P}-msg`, "data-kind": s.kind, "data-from": s.from, "data-to": s.to, "data-self": self ? (last ? "start" : "end") : undefined, style: `--_a:${Math.min(ca, cb)};--_b:${Math.max(ca, cb) + 1}` },
      h("span", { class: `${P}-said` }, h("span", { class: `${P}-num` }, String(s.n)), spoken(" "), h("span", { class: `${P}-mlabel` }, iso(s.label))),
      spoken(" ", iso(from), " to ", iso(to), tail),
      h("span", { class: `${P}-route` }, iso(from), " ", h("span", { class: `${P}-to` }, inlineArrow(P, s.kind), h("span", { class: ctx.hidden }, " to "), " ", iso(to), tail)),
      s.note ? h("span", { class: `${P}-note` }, iso(s.note)) : null));
  }
  return h("div", { class: `${P}-steps` }, root);
}

// ---- The list ("View as list") ----

function listTree(P: string, m: Model): VNode[] {
  return memo(m, `list:${P}`, () => buildList(P, m));
}
/** The list alone, for the viewer's stage (DECISIONS 310, 9.9): the page's own list, in place of the drawing. */
export const figureList = listTree;
function buildList(P: string, m: Model): VNode[] {
  if (m.ext?.list) return m.ext.list(P, m);
  const sub = Math.min(6, m.heading + 1);
  // Every string an author writes is a first-strong isolate in the list too (DECISIONS 359, Ops 6).
  const H = (text: string) => h(`h${sub}`, { class: `${P}-list-head` }, text);
  const strong = (s: string) => h("strong", null, iso(s));
  // A link card's name in the list is the same link (1.4).
  const named = (n: MNode) => (n.href ? h("a", { href: n.href, target: n.blank ? "_blank" : undefined, rel: n.blank ? "noopener noreferrer" : undefined }, strong(n.name)) : strong(n.name));
  const code = (s: string) => h("code", { class: `${P}-code` }, iso(s));
  const name = (id: string) => m.byId.get(id)?.name ?? id;
  const kw = (k: DiagramLineKind) => { const w = kindWord(m, k); return w ? ` (${w})` : ""; };
  const focal = (n: MNode) => (n.focal && m.legend.focal ? ` ${sentence(m.legend.focal)}` : "");
  if (grouped(m.type)) {
    const extra = (n: MNode): VChild[] => m.ext?.listPart?.(P, m, n) ?? [];
    const part = (n: MNode) => h("li", null, named(n), n.kind ? [", ", iso(n.kind)] : "", n.detail ? [". ", n.mono ? code(n.detail) : iso(n.detail), /[.!?]$/.test(n.detail) ? "" : "."] : /[.!?]$/.test(n.kind ?? n.name) ? "" : ".", extra(n), focal(n));
    const out: VNode[] = [H(m.ext?.listParts ?? "Parts")];
    const loose = m.nodes.filter((n) => !n.group);
    if (loose.length) out.push(h("ul", { class: `${P}-list-items` }, loose.map(part)));
    // Direct members, then each child group under its label (1.3).
    for (const g of m.groups.filter((x) => x.depth === 1)) {
      out.push(h("p", { class: `${P}-list-group` }, iso(g.label)));
      if (g.members.length) out.push(h("ul", { class: `${P}-list-items` }, g.members.map((id) => part(m.byId.get(id)!))));
      for (const c of m.groups.filter((x) => x.parent === g.id)) {
        out.push(h("p", { class: `${P}-list-group`, "data-depth": 2 }, iso(c.label)));
        out.push(h("ul", { class: `${P}-list-items`, "data-depth": 2 }, c.members.map((id) => part(m.byId.get(id)!))));
      }
    }
    if (m.ext?.listLines) { out.push(...m.ext.listLines(P, m, H)); return out; }
    out.push(H("Connections"));
    out.push(h("ol", { class: `${P}-list-items` }, m.edges.map((e) => h("li", null, strong(name(e.from)), " to ", strong(name(e.to)), e.label ? [": ", code(said(e.label))] : "", `${kw(e.kind)}.`))));
    return out;
  }
  if (m.type === "flowchart") {
    const num = (id: string) => (m.byId.get(id)?.i ?? 0) + 1;
    return [h("ol", { class: `${P}-list-items` }, m.nodes.map((n) => {
      const exits = m.edges.filter((e) => e.from === n.id);
      const what = n.shape === "decision" ? "Decision" : n.shape === "terminal" ? (exits.length ? "Start" : "End") : "Step";
      const stop = !n.detail && /[.!?]$/.test(n.name) ? " " : ". ";
      return h("li", null, named(n), n.detail ? [", ", n.mono ? code(n.detail) : iso(n.detail)] : "", `${stop}${what}.`, focal(n),
        exits.length ? h("ul", { class: `${P}-list-exits` }, exits.map((e) => h("li", null, e.label ? `If ${said(e.label)}: go to ${num(e.to)}, ` : `Then: go to ${num(e.to)}, `, strong(name(e.to)), kw(e.kind)))) : null);
    }))];
  }
  if (m.type === "data-flow") {
    return [h("ol", { class: `${P}-list-items` }, m.nodes.map((n) => {
      const exits = m.edges.filter((e) => e.from === n.id);
      return h("li", null, iso(n.laneLabel ?? ""), ": ", named(n), n.detail ? [", ", n.mono ? code(n.detail) : iso(n.detail)] : "", ".", focal(n),
        exits.length ? [" Then ", ...exits.flatMap((e, j) => [j ? "; " : "", `to step ${m.byId.get(e.to)!.step}, `, strong(name(e.to)), e.label ? [": ", code(said(e.label))] : "", kw(e.kind)]), "."] : "");
    }))];
  }
  if (m.type === "sequence") {
    const out: VNode[] = [H("Participants"), h("ul", { class: `${P}-list-items` }, m.nodes.map((n) => h("li", null, strong(n.name), n.kind ? `, ${n.kind}` : "", ".", focal(n), working(m, n))))];
    out.push(H("Messages"));
    let list: VElement | null = null;
    for (const s of m.steps) {
      // A band names a phase: a sub-heading one level under "Messages" (never past h6), drawn as the list's group line.
      if ("band" in s) { list = null; out.push(h(`h${Math.min(6, sub + 1)}`, { class: `${P}-list-group` }, s.band)); continue; }
      // A frame is a sub-heading as a band is (1.2): "Only if: First run on an incident only", "Otherwise: Rejected". Messages keep their numbers.
      if ("open" in s) { list = null; out.push(h(`h${Math.min(6, sub + 1)}`, { class: `${P}-list-group`, "data-depth": s.depth > 1 ? s.depth : undefined }, `${m.frameWords[s.open]}: ${s.label}`)); continue; }
      if ("otherwise" in s) { list = null; out.push(h(`h${Math.min(6, sub + 1)}`, { class: `${P}-list-group`, "data-depth": s.depth > 1 ? s.depth : undefined }, `${m.frameWords.else}: ${s.otherwise}`)); continue; }
      if ("close" in s) { list = null; continue; }
      if (!list) { list = h("ol", { class: `${P}-list-items`, start: s.n }); out.push(list); }
      list.c.push(h("li", null, code(s.label), ": ", strong(name(s.from)), " to ", strong(name(s.to)), `${kw(s.kind)}.`, s.note ? ` ${sentence(s.note)}` : ""));
    }
    return out;
  }
  // schema
  const out: VNode[] = [];
  for (const n of m.nodes) {
    // A table's name is a sub-heading one level under the title's, as "Parts" and "Connections" are.
    out.push(h(`h${sub}`, { class: `${P}-list-group` }, n.href ? h("a", { href: n.href, target: n.blank ? "_blank" : undefined, rel: n.blank ? "noopener noreferrer" : undefined }, code(n.name)) : code(n.name), focal(n)));
    out.push(h("ul", { class: `${P}-list-items` }, [
      ...(n.columns ?? []).map((c) => h("li", null, code(c.name), c.key === "PK" ? ", primary key" : c.key === "FK" ? ", foreign key" : "", c.ref ? [", references ", code(`${c.ref.table}.${c.ref.column}`), c.card ? [" (", cardClauseCode(n.id, c.ref.table, c.card, code), ")"] : ""] : c.type ? `, ${c.type}` : "")),
      ...(n.more ? [h("li", null, `and ${n.more} more ${n.more === 1 ? "column" : "columns"}`)] : []),
    ]));
  }
  return out;
}

/** The keys sentence (hidden), which describes the drawing to a screen reader. Drawn, the arrows are spatial (DECISIONS 306, 1.5), unless they fall back. */
function keysSentence(m: Model, drawn = false): string {
  if (m.ext?.keys) return m.ext.keys(m, drawn);
  const noun = m.ext ? m.ext.stop.replace(/^an? /, "") : m.type === "architecture" ? "part" : m.type === "sequence" ? "participant" : m.type === "schema" ? "table" : "step";
  const arrows = drawn && spatialTable(m) ? `Arrow keys move to the nearest ${noun} in that direction` : `Arrow keys move to the next or the previous ${noun}, in the author's order`;
  // Where a card is a link (1.4), Enter follows it.
  return `${arrows}; Home and End go to the ends; Escape clears the trace.${m.nodes.some((n) => n.href) ? " Enter opens a part that is a link." : ""}`;
}

/** The key hint's entries: the keys and their words. Four arrows where a drawn figure has more than one row and more than one column (1.5). */
export function hintEntries(m: Model, drawn = false): Array<{ keys: string[]; words: string }> {
  if (m.ext?.hint) return m.ext.hint(m, drawn);
  const four = drawn && m.type !== "sequence" && spatialTable(m) && m.cols > 1 && m.rows > 1;
  const open = m.nodes.some((n) => n.href) ? [{ keys: ["Enter"], words: "open" }] : [];
  return [{ keys: four ? ["←", "↑", "↓", "→"] : ["←", "→"], words: stopNoun(m) }, { keys: ["Home", "End"], words: "the ends" }, ...open, { keys: ["Esc"], words: "clear" }];
}

// ---- The spatial arrow keys (DECISIONS 306, 1.5): on a card's column and rows, never on its measured centre ----

type Way = "right" | "left" | "down" | "up";
/** Lexicographic order of two ranks. */
const less = (a: number[], b: number[]) => { for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k]! < b[k]!; return false; };
/** A card's tracks: its column and its rows (a data flow's row is its lane, a sequence's heads are one row). */
const tracksOf = (_m: Model, n: MNode) => ({ col: n.col, rows: [n.row, n.row2] as [number, number] });
/**
 * Where each arrow goes from each card, or null when some card cannot be reached from another by the arrows: then the arrows are the author's order.
 * A card is "that way" when it starts past the focused card's last track on the arrow's axis. Among those sharing a track across the arrow, the nearest;
 * otherwise the lowest of tracks along the arrow plus twice the tracks across; ties go to fewer across, then the nearer first row, then the author's order.
 */
export function spatialTable(m: Model): Record<string, Record<Way, string | null>> | null {
  return memo(m, "spatial", () => {
    const cards = m.nodes.map((n) => ({ id: n.id, ...tracksOf(m, n) }));
    const target = (from: (typeof cards)[number], way: Way) => {
      const horizontal = way === "right" || way === "left", forward = way === "right" || way === "down";
      const along = (c: (typeof cards)[number]) => (horizontal ? [c.col, c.col] : c.rows), across = (c: (typeof cards)[number]) => (horizontal ? c.rows : [c.col, c.col]);
      const a = along(from), x = across(from);
      let best: { id: string; rank: number[] } | null = null;
      cards.forEach((c, order) => {
        if (c === from) return;
        const b = along(c), y = across(c);
        const d = forward ? b[0]! - a[1]! : a[0]! - b[1]!;
        if (d < 1) return;
        const off = Math.max(0, y[0]! - x[1]!, x[0]! - y[1]!);
        const rank = [off === 0 ? 0 : 1, off === 0 ? d : d + 2 * off, off, Math.abs(y[0]! - x[0]!), order];
        if (!best || less(rank, best.rank)) best = { id: c.id, rank };
      });
      return (best as { id: string } | null)?.id ?? null;
    };
    const table: Record<string, Record<Way, string | null>> = record();
    for (const c of cards) table[c.id] = { right: target(c, "right"), left: target(c, "left"), down: target(c, "down"), up: target(c, "up") };
    const reach = (start: string) => { const seen = new Set([start]); const todo = [start]; while (todo.length) for (const t of Object.values(table[todo.pop()!]!)) if (t && !seen.has(t)) { seen.add(t); todo.push(t); } return seen.size; };
    return cards.every((c) => reach(c.id) === cards.length) ? table : null;
  });
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
  /** The figure is the viewer's (DECISIONS 310): only its drawing shows, and its keys sentence ends with these words (the zoom keys). */
  viewer?: string;
}

/** The whole figure. Before script runs `dyn` is empty; the same tree, with the measured `dyn`, is what script settles on. */
/**
 * A one-column schema's turn-backs (DECISIONS 306, section 4, call 2): turn-backs that run beside each other take lanes space-3 apart, nested (the
 * farther-going outermost), lines to one key sharing one; two lanes at most in the padding, and a third line is not drawn. Worked out from the data alone
 * (a line's place down the column is its table's row and its key's row), so the padding is known before anything is measured.
 */
export function turnBackLanes(m: Model): { lane: Map<number, number>; dropped: Set<number>; lanes: number } {
  return memo(m, "turn-back-lanes", () => {
    const lane = new Map<number, number>(), dropped = new Set<number>();
    if (!oneColumnTurnBacks(m)) return { lane, dropped, lanes: 0 };
    const at = (id: string, row: number) => (m.byId.get(id)?.row ?? 0) * 1000 + row;
    // One group a key; its run from its highest to its lowest end.
    const groups = new Map<string, { members: number[]; lo: number; hi: number }>();
    m.edges.forEach((e, k) => {
      // Lines to one key share a lane only when they state the same thing there (1.1; Neon's B9 of the code review).
      const key = `${e.to}.${e.toRow}.${e.card?.to ?? ""}`;
      const a = at(e.from, e.fromRow ?? 0), b = at(e.to, e.toRow ?? 0);
      const g = groups.get(key) ?? { members: [], lo: Infinity, hi: -Infinity };
      g.members.push(k); g.lo = Math.min(g.lo, a, b); g.hi = Math.max(g.hi, a, b);
      groups.set(key, g);
    });
    // Longest first, so the farther-going is outermost; each takes the innermost lane no group beside it holds.
    const order = [...groups.values()].sort((x, y) => (y.hi - y.lo) - (x.hi - x.lo));
    const placed: Array<{ lo: number; hi: number; lane: number }> = [];
    let most = 0;
    for (const g of order.reverse()) {
      const used = new Set(placed.filter((p) => p.lo <= g.hi && g.lo <= p.hi).map((p) => p.lane));
      let l = 0;
      while (used.has(l)) l++;
      if (l > 1) { for (const k of g.members) dropped.add(k); continue; }
      placed.push({ lo: g.lo, hi: g.hi, lane: l });
      for (const k of g.members) lane.set(k, l);
      most = Math.max(most, l + 1);
    }
    return { lane, dropped, lanes: most };
  });
}

/** A schema of one column whose foreign keys are drawn as turn-backs on its end side, where it has no gutter. */
const oneColumnTurnBacks = (m: Model) => m.type === "schema" && m.cols === 1 && m.edges.length > 0;

export function figureTree(m: Model, dyn: Dyn, o: FigureOptions): VElement {
  const P = o.prefix;
  const ids = idsOf(o.base);
  const plan = m.type === "sequence" || m.type === "schema" || (m.ext && !m.ext.routed) ? null : stackPlan(m);
  const ctx: TreeContext = { P, ids, level: o.level, plan, hidden: o.hiddenClass };
  const drawn = dyn.layout === "drawn";
  const stops = hasStops(m, dyn);
  const group = m.type === "sequence" || m.type === "schema" ? drawn : true;
  const Head = `h${m.heading}`;
  const style: string[] = [`--_cols:${columnCount(m)}`];
  // A state's start mark on the drawing's start column takes space-10 more on that side (DECISIONS 359, Ops 1), whether or not its group does.
  // A type's own marks on the drawing's edge take room there (a state's start mark: space-10 at the start, or above when laid down).
  const roomAt = m.ext?.room?.(m);
  const startRoom = roomAt?.start, topRoom = roomAt?.top;
  if ((grouped(m.type) && m.groups.length) || (drawn && dyn.pad) || startRoom || topRoom) {
    // The drawn layout keeps room for a group's box where it reaches an edge: space-8 above, space-4 at a side and below. A padded layout
    // (Dyn.pad) keeps at least space-3 above and below, for the seats beside a line in the first or the last row.
    // Each group level that reaches an edge takes its room again (1.3): space-8 above, space-4 at a side and below.
    const e: [number, number, number, number] = grouped(m.type) ? groupEdges(m) : [0, 0, 0, 0];
    const pad = (levels: number, step: string, least?: string) => (levels ? (levels > 1 ? `calc(${levels} * var(--basalt-space-${step}))` : `var(--basalt-space-${step})`) : least ? `var(--basalt-space-${least})` : "0px");
    const block = drawn && dyn.pad ? "3" : undefined;
    const room = (side: string) => (startRoom ? `calc(${side} + var(--basalt-space-10))` : side);
    style.push(`--_gpad:${topRoom ? `calc(${pad(e[0], "8", block)} + var(--basalt-space-10))` : pad(e[0], "8", block)} ${m.rtl ? room(pad(e[1], "4")) : pad(e[1], "4")} ${pad(e[2], "4", block)} ${m.rtl ? pad(e[3], "4") : room(pad(e[3], "4"))}`);
  }
  // A schema of one column with a foreign key: its turn-backs run space-4 out on the end side, past the cards, so the drawn layout keeps space-5 there
  // (the turn-back and its stroke on the pixel grid); the fit rule counts it (minimums).
  // Two lanes of turn-backs take space-3 more (call 2).
  // The end gutter grows by lanes (1.3): lanes × space-3-5 + space-3 (40, 54, 68).
  if (plan?.gutter && plan.laneCount > 2) style.push(`--_gw:calc(${plan.laneCount} * var(--basalt-space-3-5) + var(--basalt-space-3))`);
  if (oneColumnTurnBacks(m)) {
    // Where marks are drawn the first lane is space-6 out, so the padding is space-6 plus space-1 (1.1).
    const first = m.marks ? "var(--basalt-space-6) + var(--basalt-space-1)" : "var(--basalt-space-5)";
    const room = turnBackLanes(m).lanes > 1 ? `calc(${first} + var(--basalt-space-3))` : m.marks ? `calc(${first})` : first;
    // On the end side: the left, right to left (1.7).
    style.push(m.rtl ? `--_gpad:0px 0px 0px ${room}` : `--_gpad:0px ${room} 0px 0px`);
  }
  if (m.type === "schema" && dyn.track) style.push(`--_track:${dyn.track}px`);
  if (drawn && dyn.one) style.push(`--_one:${dyn.one}px`);
  if (m.ext?.rootStyle) style.push(...m.ext.rootStyle(m, dyn));
  return h("figure", {
    class: o.className ? `${P} ${o.className}` : P,
    "aria-labelledby": ids.title,
    "data-type": m.type,
    "data-cols": columnCount(m),
    "data-reach": grouped(m.type) ? groupReach(m) : undefined,
    "data-gutter": plan?.gutter ? "" : undefined,
    "data-marks": m.marks ? "" : undefined,
    // A data flow that draws a decision gives every step the contour (DECISIONS 359, Ops 5).
    "data-contour": m.type === "data-flow" && m.nodes.some((n) => n.shape === "decision") ? "" : undefined,
    // An automatic figure with no placement is stacked before script too: its cards have no cells yet.
    "data-layout": dyn.layout ?? (m.unplaced ? "stacked" : undefined),
    "data-measured": dyn.layout ? "" : undefined,
    "data-bare": dyn.bare ? "" : undefined,
    "data-form": dyn.form ?? (dyn.layout ? undefined : m.ext?.form?.(m)),
    "data-motion": m.motion.animated ? "animated" : undefined,
    "data-first-visit": m.motion.animated && m.motion.firstVisit ? "" : undefined,
    "data-rtl": m.rtl ? "" : undefined,
    "data-viewer": o.viewer ? "" : undefined,
    style: style.join(";"),
  },
  h("div", { class: `${P}-head` }, h(Head, { id: ids.title, class: `${P}-title` }, iso(m.title)), (() => { const lead = m.ext?.sourceLead?.(m); return o.hasSource || lead ? h("p", { class: `${P}-source` }, lead ? [h("bdi", null, lead), o.hasSource ? " · " : ""] : null, o.hasSource ? h("bdi", null, { slot: "source" }) : null) : null; })(), m.ext?.meta?.(P, m) ?? null),
  h("div", {
    class: `${P}-drawing`,
    // A schema's far keys run in corridors (1.1): its rows are spacer tracks round the author's, and the grid's own row gap is none.
    style: drawn && dyn.rows ? `--_rows:${dyn.rows};--_row-gap:0px` : undefined,
    role: group ? "group" : undefined,
    "aria-roledescription": group ? "diagram" : undefined,
    "aria-labelledby": group ? ids.title : undefined,
    // The keys sentence describes the drawing only where it has stops (a bare stack has none).
    "aria-describedby": group ? (stops ? `${ids.summary} ${ids.keys}` : ids.summary) : undefined,
    "data-stops": stops ? "" : undefined,
  }, drawingChildren(ctx, m, dyn), m.text ? null : h("div", { class: `${P}-ink`, "aria-hidden": "true" }), h("span", { class: `${P}-ruler`, "aria-hidden": "true" })),
  keyTree(P, m),
  h("p", { class: `${P}-hint`, "data-kbd-hint": "", "aria-hidden": "true" }, { slot: "hint" }),
  // On touch, where lines are drawn, a line in the hint's seat and type says how to trace (DECISIONS 306, 1.5); the stylesheet shows it only then.
  (m.ext ? m.ext.traces?.(m, drawn) : hasStops(m, dyn) && m.type !== "sequence" || (drawn && m.type === "sequence")) ? h("p", { class: `${P}-tap-hint`, "aria-hidden": "true" }, `Tap ${stopNoun(m)} to highlight its lines. Tap it again to clear.`) : null,
  h("div", { class: `${P}-foot` }, { slot: "toggle" }),
  h("div", { id: ids.list, class: `${P}-list`, hidden: !dyn.open }, listTree(P, m)),
  h("span", { id: ids.keys, class: o.hiddenClass }, o.viewer ? `${keysSentence(m, drawn)} ${o.viewer}` : keysSentence(m, drawn)),
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
  /** A foreign key's stated cardinality (1.1): marks at both ends in place of the dot and the head. */
  card?: { from: DiagramCardinality; to: DiagramCardinality };
  width: number;
  /** Each run's place across its axis before it was snapped (a run out of a decision is on the diamond's own centre line), by segment: labels
   *  are seated against these, so a seat never turns on which way a half pixel fell. */
  axes?: number[];
}
export interface GLabel { i: number; text: string; box: Rect; on: boolean }
export interface GCross { top: number; under: number; at: Pt; underVertical: boolean }
export interface Geo {
  /** Labels refused only because every seat left the drawing (a padded layout gives them room). */
  bounded?: number[];
  w: number;
  h: number;
  nodes: GNode[];
  lines: GLine[];
  lifelines: Array<{ x: number; y1: number; y2: number }>;
  /** A sequence's activation bars (DECISIONS 306, 1.2): structure, drawn over the lifelines and under the lines. */
  bars?: Array<{ l: number; r: number; t: number; b: number }>;
  /** What does not fit and is not a line or a label (a frame's header wider than its frame): the drawn layout is refused. */
  misfit?: string[];
  labels: GLabel[];
  crossings: GCross[];
  /** Lines that pass through a node (by edge index), labels that found no seat, words that do not fit their span. */
  through: number[];
  unseated: number[];
  /** Lines (by edge index) that leave the drawing: a route the fit must refuse. */
  outside: number[];
  /** Lines (by edge index) laid on another line that does not end where it ends (not a bus): two lines read as one, so the fit refuses them. */
  overlaps?: number[];
  /** The offset of the drawing's origin from the device pixel grid, so lines can be snapped to it. */
  ox: number;
  oy: number;
  /** A schema's far keys (1.1): the rows their corridors need, and each far line's corridor, chosen once on the grid without them. */
  corridors?: { rows: string; pick: Record<number, string> };
  /** Stacked groups whose label found no clear place on the group's top edge and keeps its start seat on its plate (the last resort), by label. */
  seatless?: string[];
}

export interface Tokens {
  space: (step: string) => number;
  node: number; table: number; lane: number; step: number; head: number; guide: number;
  hair: number; line: number; cut: number; dot: number; dash: number; dashGap: number;
  wide: number; cap: number; radius: number; radiusXs: number;
  /** An activation bar's width and a cardinality mark's room (DECISIONS 306, 1.0). */
  activation: number; foot: number;
}

export function readTokens(el: Element): Tokens {
  const style = getComputedStyle(el);
  const px = (name: string, fallback: number) => { const v = parseFloat(style.getPropertyValue(`--basalt-${name}`)); return Number.isFinite(v) ? v : fallback; };
  const cache = new Map<string, number>();
  return {
    space: (step) => { if (!cache.has(step)) cache.set(step, px(`space-${step}`, parseFloat(step.replace("-", ".")) * 4)); return cache.get(step)!; },
    node: px("size-diagram-node", 144), table: px("size-diagram-table", 224), lane: px("size-diagram-lane", 120), step: px("size-diagram-step", 56),
    head: px("size-diagram-head", 8), guide: px("size-diagram-guide-dash", 4), hair: px("size-hairline", 1), line: px("size-chart-line", 2),
    cut: px("size-cut", 2), dot: px("size-dot", 6), dash: px("size-chart-dash", 6), dashGap: px("size-chart-dash-gap", 4),
    wide: px("size-breakpoint-container-lg", 640), cap: px("size-breakpoint-container", 480), radius: px("radius-md", 8), radiusXs: px("radius-xs", 4),
    activation: px("size-diagram-activation", 8), foot: px("size-diagram-foot", 14),
  };
}

const strokeOf = (kind: DiagramLineKind, tk: Tokens) => (kind === "main" ? tk.line : tk.hair);
export const rectOf = (el: Element, origin: DOMRect): Rect => { const r = el.getBoundingClientRect(); return { l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top }; };
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

const forced = () => matchMedia("(forced-colors: active)").matches;

function ruler(drawing: Element, P: string) {
  const el = drawing.querySelector<HTMLElement>(`.${P}-ruler`)!;
  const known = new Map<string, number>();
  return (text: string, font: RulerFont) => {
    const key = `${font}|${text}`;
    if (!known.has(key)) { el.setAttribute("data-f", font); el.textContent = text; known.set(key, el.getBoundingClientRect().width); el.textContent = ""; }
    return known.get(key)!;
  };
}
export const words = (s?: string) => (s ? s.split(/\s+/).filter(Boolean) : []);

/** The figure's measured minimums (1.11, rule 2): the widest unbreakable word of any node, a table's widest row, on top of the tokens. */
function minimums(m: Model, tk: Tokens, measure: ReturnType<typeof ruler>) {
  if (m.ext?.least && !m.ext.routed) { const least = Math.max(tk.wide, m.ext.least(m, tk, measure)); return { track: tk.node, table: tk.table, least, own: least }; }
  const s = tk.space;
  let track = tk.node;
  let table = tk.table;
  for (const n of m.nodes) {
    if (n.shape === "table") {
      for (const c of n.columns ?? []) {
        const type = c.ref ? `${m.rtl ? "←" : "→"} ${c.ref.table}` : c.type ?? "";
        const row = s("6") + measure(c.name, "mono") + (type ? s("3") + measure(type, "mono") : 0) + 2 * s("3") + 2 * tk.hair;
        table = Math.max(table, Math.ceil(row));
      }
      table = Math.max(table, Math.ceil(measure(n.name, "table") + 2 * s("3") + 2 * tk.hair + (n.href ? 16 + s("1-5") : 0)));
      continue;
    }
    const pad = n.shape === "terminal" ? 2 * s("5") : 2 * s("3");
    // The first line (the kind, or the name on a card with no kind) keeps space-6 clear of a mark, except in forced colours, where none is drawn.
    // A participant's head centres its words, so its first line keeps space-6 clear on both sides (1.6).
    const seat = n.mark && !forced() ? (n.shape === "participant" ? 2 : 1) * s("6") : 0;
    let widest = 0;
    // A link card's last word carries its cue, 16 and space-1-5 before it (1.4).
    const cue = n.href ? 16 + s("1-5") : 0;
    const nameWords = words(n.name);
    nameWords.forEach((w, j) => { widest = Math.max(widest, measure(w, n.shape === "decision" ? "name-500" : "name") + (n.kind ? 0 : seat) + (j === nameWords.length - 1 ? cue : 0)); });
    if (m.type !== "data-flow") for (const w of words(n.kind)) widest = Math.max(widest, measure(w, "mono") + seat);
    for (const w of words(n.detail)) widest = Math.max(widest, measure(w, n.mono ? "mono" : "sans"));
    const need = n.shape === "decision" ? widest / 0.62 : widest + pad + 2 * tk.hair;
    track = Math.max(track, Math.ceil(need));
  }
  const n = columnCount(m);
  let least: number;
  if (m.type === "data-flow") least = tk.lane + n * (track + s("12"));
  // Where marks are drawn the gap is space-12 plus space-3, and a one-column schema's first turn-back is space-6 out (1.1).
  else if (m.type === "schema") least = n * table + (n - 1) * (s("12") + (m.marks ? s("3") : 0)) + (oneColumnTurnBacks(m) ? (m.marks ? s("6") + s("1") : s("5")) + (turnBackLanes(m).lanes > 1 ? s("3") : 0) : 0);
  // A sequence's columns hold its participants: measured once script runs (the stylesheet before script has only the token floor).
  else if (m.type === "sequence") least = n * track + (n - 1) * s("5");
  else least = n * track + (n - 1) * s("16") + groupReach(m) * s("4");
  // `own` is the least width the tracks themselves take, before the drawn layout's floor: for one column, the column's (the one-column ruling).
  return { track, table, least: Math.max(tk.wide, least), own: Math.ceil(least) };
}

// ---- Snapping: a 1px line on half pixels, a 2px line on whole ones, in the page's own pixel grid ----

function snapper(ox: number, oy: number, mirrored = false) {
  // Mirrored (a stacked figure right to left), a place halfway between two takes the left one, so the snap mirrors the left-to-right snap exactly.
  const rx = mirrored ? (v: number) => -Math.round(-v) : Math.round;
  return {
    x: (v: number, w: number) => (w % 2 === 1 ? rx(v + ox - 0.5) + 0.5 - ox : rx(v + ox) - ox),
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

function findCrossings(lines: GLine[], lit?: (line: GLine) => boolean, only?: Set<number>): GCross[] {
  const out: GCross[] = [];
  const e = 0.75;
  for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
    const A = lines[a]!, B = lines[b]!;
    if (only && !only.has(A.i) && !only.has(B.i)) continue;
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
  const rows = tracks(list(cs.gridTemplateRows), parseFloat(cs.paddingTop) || 0, parseFloat(cs.rowGap) || 0);
  return {
    cols: tracks(list(cs.gridTemplateColumns), parseFloat(cs.paddingLeft) || 0, parseFloat(cs.columnGap) || 0),
    // A schema's corridors (1.1) are spacer tracks round the author's rows: its rows are every other track.
    rows: drawing.style.getPropertyValue("--_rows").trim() ? rows.filter((_, j) => j % 2 === 1) : rows,
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
    if (process.env.NODE_ENV !== "production" && list.length > 3) warn(`${key.replace(".", "'s ")} side has ${list.length} lines; more than three is an error: use another side`);
    if (!straight.length) {
      if (rest.length === 2) { rest[0]!.f = 0.25; rest[1]!.f = 0.75; }
      else if (rest.length === 3) { rest[0]!.f = 0.25; rest[1]!.f = 0.5; rest[2]!.f = 0.75; }
      else if (rest.length > 3) rest.forEach((p, j) => { p.f = (j + 1) / (rest.length + 1); });
      continue;
    }
    // Two or more straight lines to one node (one each way) cannot all keep the middle: they would lie on one another. They take the side's slots by
    // their count, in the author's order; the far end does the same, so each stays straight.
    const byFar = new Map<string, Port[]>();
    for (const p of straight) { if (!byFar.has(p.far.id)) byFar.set(p.far.id, []); byFar.get(p.far.id)!.push(p); }
    for (const same of byFar.values()) if (same.length > 1) same.sort((x, y) => x.edge - y.edge).forEach((p, j) => { p.f = same.length === 2 ? (j === 0 ? 0.25 : 0.75) : (j + 1) / (same.length + 1); });
    // Beside a straight line the others take the part of the side nearer their far end: one alone there takes the quarter point, as decided; two or more
    // share that part evenly, nested (the one whose far end is farther along nearer that end), so no two lines leave one point.
    const lo = Math.min(...straight.map((p) => p.f)), hi = Math.max(...straight.map((p) => p.f));
    const before = rest.filter((p) => along(p) < 0), after = rest.filter((p) => along(p) >= 0);
    before.forEach((p, j) => { p.f = (lo * (j + 1)) / (before.length + 1); });
    after.forEach((p, j) => { p.f = hi + ((1 - hi) * (j + 1)) / (after.length + 1); });
  }
  return ports;
}

/**
 * A card's least height for its ports (DECISIONS 306, section 4, call 3): a port sits on the flat part of its side, never nearer a corner than the corner's
 * radius, and two ports on a side are at least size-diagram-head apart. A card whose start or end side holds more than its height allows grows to the least
 * height at which both hold (48 for a straight line and two others, 64 for an extra beside a straight pair), and its row takes it. From the data alone, so
 * it is the same at every width: a side never stacks a figure. By node id; only cards that need more than nothing are named.
 */
export function portFloors(m: Model, radius = 8, head = 8): Record<string, number> {
  return memo(m, `port-floors:${radius}:${head}`, () => {
    const out: Record<string, number> = record();
    if (m.type !== "architecture" && m.type !== "flowchart" && m.type !== "data-flow" && m.type !== "schedule" && m.type !== "state" && m.type !== "deployment") return out;
    const sides = m.edges.map((e) => { const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!; const [d1, d2] = defaultSides(a, b); return [e.fromSide ?? d1, e.toSide ?? d2] as [DiagramSide, DiagramSide]; });
    const bySide = new Map<string, number[]>();
    for (const p of assignSlots(m, sides, () => {})) {
      if (!isH(p.side) || p.node.shape !== "box") continue;
      const key = `${p.node.id}.${p.side}`;
      if (!bySide.has(key)) bySide.set(key, []);
      bySide.get(key)!.push(p.f);
    }
    for (const [key, fs] of bySide) {
      if (fs.length < 2) continue;
      // Slots that share a point are one (a bus); the fractions are kept unrounded, so 48 is 48 and not 49 (Neon's P1 of the code review).
      const f = fs.slice().sort((a, b) => a - b).filter((x, j, all) => j === 0 || x - all[j - 1]! > 1e-9);
      let need = Math.max(radius / f[0]!, radius / (1 - f[f.length - 1]!));
      for (let j = 1; j < f.length; j++) need = Math.max(need, head / (f[j]! - f[j - 1]!));
      const id = key.slice(0, key.lastIndexOf("."));
      out[id] = Math.max(out[id] ?? 0, Math.ceil(need - 1e-6));
    }
    return out;
  });
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

interface DrawnInput { m: Model; tk: Tokens; P: string; drawing: HTMLElement; origin: DOMRect; warn?: (s: string) => void; pick?: Record<number, string> }

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
/**
 * A seated label's box moved onto the page's whole pixels, so its words are never drawn on a half pixel at 1x (a label on a 1px line sat on them): to the
 * nearest such place that `clear` accepts, which is the test the seat itself passed. Where none is, the seat stays as it was found. The seat is chosen
 * before this, against the line's own centre, so whether a label seats never turns on where the pixel grid falls.
 */
function wholePixels(box: Rect, ox: number, oy: number, clear: (b: Rect) => boolean, mirrored = false): Rect {
  const moves = (v: number, o: number) => { const f = v + o - Math.floor(v + o); return f < 0.005 || f > 0.995 ? [0] : f <= 0.5 ? [-f, 1 - f] : [1 - f, -f]; };
  // Mirrored (a stacked figure right to left), the box's right edge goes onto the whole pixel, as the left does left to right.
  const across = mirrored ? moves(-box.r, -ox).map((d) => -d) : moves(box.l, ox);
  for (const dy of moves(box.t, oy)) for (const dx of across) {
    if (!dx && !dy) return box;
    const moved = { l: box.l + dx, r: box.r + dx, t: box.t + dy, b: box.b + dy };
    if (clear(moved)) return moved;
  }
  return box;
}

function seatLabels(m: Model, lines: GLine[], nodes: GNode[], obstacles: Obstacles, groups: Rect[], bounds: Rect, tk: Tokens, measure: ReturnType<typeof ruler>, grid: { ox: number; oy: number }): { labels: GLabel[]; unseated: number[]; bounded: number[] } {
  const s = tk.space;
  const placed: Rect[] = [];
  const labels: GLabel[] = [];
  const unseated: number[] = [];
  const bounded: number[] = [];
  const GROW = s("1");
  const order = lines.filter((l) => m.edges[l.i]?.label).sort((a, b) => Number(m.edges[b.i]!.kind === "main") - Number(m.edges[a.i]!.kind === "main") || a.i - b.i);
  for (const line of order) {
    const text = m.edges[line.i]!.label!;
    // A label may hold one break of its author's (DECISIONS 306, 1.4): its box is its widest line, and 16 a line tall.
    const w = measure(text, "label"), hgt = 16 * labelLines(text);
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
      const c = line.axes?.[k] ?? (horiz ? a.y : a.x);
      for (const [p, q] of parts) runs.push({ horiz, c, p, q, len: Math.abs(q - p), pri: parts.length > 1 && outside(p, q) ? 1 : 0 });
    });
    runs.sort((x, y) => y.pri - x.pri || y.len - x.len);
    let chosen: { box: Rect; on: boolean } | null = null;
    let inBounds = false;
    const clear = (box: Rect, bounded = true) => {
      const G = grow(box, GROW);
      if (bounded && (box.l < bounds.l || box.r > bounds.r || box.t < bounds.t || box.b > bounds.b)) return false;
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
        if (!inBounds && cands.some((c) => clear(c.box, false))) inBounds = true;
      }
      if (chosen) break;
    }
    if (!chosen) { unseated.push(line.i); if (inBounds) bounded.push(line.i); continue; }
    const box = wholePixels(chosen.box, grid.ox, grid.oy, (b) => clear(b));
    placed.push(box);
    labels.push({ i: line.i, text, box, on: chosen.on });
  }
  return { labels, unseated, bounded };
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
  const dev = process.env.NODE_ENV !== "production";
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
  const geo: Geo = { w: W, h: H, nodes, lines: [], lifelines: [], labels: [], crossings: [], through: [], unseated: [], outside: [], ox, oy };

  if (m.type === "sequence") return sequenceGeometry(input, geo, sn);

  // Sides and slots.
  let sides: Array<[DiagramSide, DiagramSide]>;
  let ports: Port[] = [];
  if (m.type === "schema") {
    sides = m.edges.map((e) => {
      const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
      // One column: a turn-back on the end side (the start side in the last column, where the end is the drawing's edge). A schema of one column has no
      // gutter on either side, so its turn-backs take the end side and the drawing keeps room for them there (figureTree). Right to left the model's
      // columns are mirrored, so the end side is the left and the last column is column 1 (1.7).
      if (a.col === b.col) {
        const last = m.rtl ? a.col === 1 : a.col === m.cols;
        const atEnd = !(last && m.cols > 1);
        const side: DiagramSide = atEnd === !m.rtl ? "right" : "left";
        return [side, side];
      }
      return b.col > a.col ? ["right", "left"] : ["left", "right"];
    });
  } else {
    sides = m.edges.map((e) => { const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!; const [d1, d2] = defaultSides(a, b); return [e.fromSide ?? d1, e.toSide ?? d2]; });
    ports = assignSlots(m, sides, (dev && warn) || (() => {}));
  }

  // End points.
  const rowY = (id: string, row: number) => {
    const el = drawing.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(id)}"] .${P}-row[data-row="${row}"]`);
    if (!el) return 0;
    const r = rectOf(el, origin);
    return (r.t + r.b) / 2;
  };
  // One key, two statements (1.1): lines that state different things at one key arrive space-2 apart, centred on the row, each in its own lane;
  // lines that state the same thing share a bus.
  const arrivals = new Map<number, number>();
  if (m.type === "schema") {
    const at = new Map<string, number[]>();
    m.edges.forEach((e, k) => { const key = `${e.to}.${e.toRow}.${sides[k]![1]}`; at.set(key, [...(at.get(key) ?? []), k]); });
    const rank = (k: number) => { const t = m.edges[k]!.card?.to; return t === "one" ? 0 : t === "zero-or-one" ? 1 : 2; };
    for (const list of at.values()) {
      const says = [...new Set(list.map(rank))].sort((x, y) => x - y);
      if (says.length > 1) for (const k of list) arrivals.set(k, (says.indexOf(rank(k)) - (says.length - 1) / 2) * s("2"));
    }
  }
  // A marked line's ends are on whole pixels of the table's edge, so its marks are measured from it (1.1).
  const whole = (x: number) => Math.round(x + ox) - ox;
  // Each end's place across the axis it leaves or enters on, before it is snapped (`r1`, `r2`): what its label is seated against.
  const ends = m.edges.map((e, k) => {
    const [s1, s2] = sides[k]!;
    const a = map.get(e.from)!, b = map.get(e.to)!;
    const w = strokeOf(e.kind, tk);
    if (e.fk) {
      const r1 = rowY(e.from, e.fromRow!), r2 = rowY(e.to, e.toRow!) + (arrivals.get(k) ?? 0);
      const y1 = sn.y(r1, w), y2 = sn.y(r2, w);
      const x1 = s1 === "right" ? a.rect.r : a.rect.l, x2 = s2 === "right" ? b.rect.r : b.rect.l;
      return { p1: { x: e.card ? whole(x1) : x1, y: y1 }, p2: { x: e.card ? whole(x2) : x2, y: y2 }, r1, r2: Math.abs(y1 - y2) < 0.01 ? r1 : r2 };
    }
    const f1 = ports.find((p) => p.edge === k && p.end === "from")!.f, f2 = ports.find((p) => p.edge === k && p.end === "to")!.f;
    let p1 = portPoint(a, s1, f1), p2 = portPoint(b, s2, f2);
    const r1 = isH(s1) ? p1.y : p1.x;
    let r2 = isH(s2) ? p2.y : p2.x;
    // Snap the axis the line leaves and enters on; a straight line shares one.
    if (isH(s1)) p1 = { ...p1, y: sn.y(p1.y, w) }; else p1 = { ...p1, x: sn.x(p1.x, w) };
    if (isH(s2)) p2 = { ...p2, y: sn.y(p2.y, w) }; else p2 = { ...p2, x: sn.x(p2.x, w) };
    if (isH(s1) && isH(s2) && Math.abs(p1.y - p2.y) < 1.01) { p2 = { ...p2, y: p1.y }; r2 = r1; }
    if (!isH(s1) && !isH(s2) && Math.abs(p1.x - p2.x) < 1.01) { p2 = { ...p2, x: p1.x }; r2 = r1; }
    // The end that a snap moved sits on the contour again.
    p1 = isH(s1) ? contour(a, s1, p1.y) : contour(a, s1, p1.x);
    p2 = isH(s2) ? contour(b, s2, p2.y) : contour(b, s2, p2.x);
    return { p1, p2, r1, r2 };
  });
  const dropped = new Set<number>();
  // A line that is not drawn: its row still writes the target, and a development build names it. One tight line never stacks the figure.
  const drop = (k: number, why: string) => { if (dropped.has(k)) return; dropped.add(k); if (dev) warn?.(`${m.edges[k]!.from} to ${m.edges[k]!.to} ${why}, so its line is not drawn; its row still writes the target`); };
  // A one-column schema's third lane of turn-backs is not drawn (call 2).
  for (const k of turnBackLanes(m).dropped) drop(k, dev ? "would need a third lane of turn-backs" : "");

  // Foreign keys two or more columns away (1.1): out of the row's facing side, a turn in the gutter beside its own table, a run along a corridor (a
  // row gap no table of the columns between stands in, or the margin above or below), a turn in the gutter beside the referenced table into the key.
  const far = new Map<number, { corridor: string; first: { key: string; span: [number, number] } | null; y: number }>();
  const pick: Record<number, string> = record();
  if (m.type === "schema") m.edges.forEach((e, k) => {
    const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
    if (Math.abs(a.col - b.col) < 2) return;
    const lo = Math.min(a.col, b.col), hi = Math.max(a.col, b.col);
    const between = m.nodes.filter((n) => n.col > lo && n.col < hi);
    const rows = grid.rows;
    if (!rows.length) return;
    // Each corridor's height: an interior gap's middle; a margin's first lane, space-4 out.
    const cands: Array<{ key: string; y: number; inner: boolean }> = [];
    for (let g = 1; g < rows.length; g++) if (!between.some((n) => n.row <= g && n.row2 >= g + 1)) cands.push({ key: `g${g}`, y: (rows[g - 1]![1] + rows[g]![0]) / 2, inner: true });
    cands.push({ key: "top", y: rows[0]![0] - s("4"), inner: false }, { key: "bottom", y: rows[rows.length - 1]![1] + s("4"), inner: false });
    // The one nearest the middle of the two rows' heights; an interior gap wins a tie with a margin, then the upper. Chosen once, on the grid
    // without corridors (the second measure, with them, keeps it).
    const mid = (ends[k]!.r1 + ends[k]!.r2) / 2;
    const chosen = input.pick?.[k] ?? cands.slice().sort((p, q) => Math.abs(p.y - mid) - Math.abs(q.y - mid) || Number(q.inner) - Number(p.inner) || p.y - q.y)[0]!.key;
    pick[k] = chosen;
    const ti = sides[k]![0] === "right" ? a.col : a.col - 1;
    const t1 = grid.cols[ti - 1], t2 = grid.cols[ti];
    far.set(k, { corridor: chosen, first: t1 && t2 ? { key: `c${ti}`, span: [t1[1], t2[0]] } : null, y: 0 });
  });
  // A corridor's lanes (1.1): two at most, space-3 apart, lines to one key sharing one; a third line is not drawn, the later in the author's order.
  // An interior gap's lanes are centred in it (space-3-5 clear of the tables in its space-10); a margin's are space-4 and space-4 plus space-3 out.
  const corridorGroups = new Map<string, number[][]>();
  for (const [k, f] of far) {
    const e = m.edges[k]!;
    const groups = corridorGroups.get(f.corridor) ?? [];
    const bus = groups.find((g) => { const o = m.edges[g[0]!]!; return o.to === e.to && o.toRow === e.toRow && sides[g[0]!]![1] === sides[k]![1] && Math.abs(ends[g[0]!]!.p2.y - ends[k]!.p2.y) < 0.5; });
    if (bus) bus.push(k);
    else if (groups.length >= 2) drop(k, dev ? "would need a third lane in its corridor" : "");
    else groups.push([k]);
    corridorGroups.set(f.corridor, groups);
  }
  for (const k of [...far.keys()]) if (dropped.has(k)) far.delete(k);
  // How far a line goes: its columns, then its run across.
  const reach = (g: number[]) => { const e = m.edges[g[0]!]!; return Math.abs(m.byId.get(e.from)!.col - m.byId.get(e.to)!.col) * 1e4 + Math.abs(ends[g[0]!]!.p1.x - ends[g[0]!]!.p2.x); };
  const corridorY = (key: string, j: number, count: number) => {
    const rows = grid.rows;
    if (key === "top") return rows[0]![0] - s("4") - j * s("3");
    if (key === "bottom") return rows[rows.length - 1]![1] + s("4") + j * s("3");
    const g = Number(key.slice(1));
    return (rows[g - 1]![1] + rows[g]![0]) / 2 + (j - (count - 1) / 2) * s("3");
  };
  // A margin's lanes nest by the merged rule: the farther-going outermost. An interior gap's take the order that crosses least (below).
  const setCorridor = (key: string, order: number[][]) => order.forEach((g, j) => g.forEach((k) => { far.get(k)!.y = corridorY(key, j, order.length); }));
  const nestCorridors = () => {
    for (const [key, groups] of corridorGroups) {
      const live = groups.map((g) => g.filter((k) => far.has(k))).filter((g) => g.length);
      corridorGroups.set(key, live);
      setCorridor(key, key === "top" || key === "bottom" ? live.slice().sort((p, q) => reach(p) - reach(q)) : live.slice().sort((p, q) => reach(q) - reach(p)));
    }
  };
  nestCorridors();

  const { obstacles, groups } = obstaclesOf(drawing, origin, P, rowGap);
  // Jogs: which gutter each two-elbow line turns in, and which lines share a lane (lines to one port, a foreign key's bus). A turn-back (out and
  // back in on one side) runs in the gutter beside that side too, so it is given a lane with the jogs it runs beside.
  const jogs = new Map<string, { span: [number, number]; vertical: boolean; members: Map<string, number[]> }>();
  const turnBacks = new Set<number>();
  // A far line's last gutter (its bus's), by edge.
  const farLast = new Map<number, [number, number]>();
  const join = (key: string, span: [number, number], vertical: boolean, port: string, id: number) => {
    if (!jogs.has(key)) jogs.set(key, { span, vertical, members: new Map() });
    const g = jogs.get(key)!;
    if (!g.members.has(port)) g.members.set(port, []);
    g.members.get(port)!.push(id);
  };
  const gather = () => { jogs.clear(); turnBacks.clear(); farLast.clear(); m.edges.forEach((e, k) => {
    if (dropped.has(k)) return;
    // A far line turns in two gutters: its own (a lane of its own, keyed by -(k + 1)) and the referenced table's, where it joins the key's bus.
    const f = far.get(k);
    if (f?.first) join(f.first.key, f.first.span, true, `far:${k}`, -(k + 1));
    const [s1, s2] = sides[k]!;
    const { p1, p2 } = ends[k]!;
    const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
    let key: string | null = null, span: [number, number] | null = null, vertical = false;
    if (s1 === s2) {
      if (isH(s1)) {
        const ti = s1 === "right" ? Math.max(trackOf(a), trackOf(b)) : Math.min(trackOf(a), trackOf(b)) - 1;
        const t1 = grid.cols[ti - 1], t2 = grid.cols[ti];
        if (t1 && t2) { key = `c${ti}`; span = [t1[1], t2[0]]; vertical = true; }
      } else {
        const ri = s1 === "bottom" ? Math.max(a.row2, b.row2) : Math.min(a.row, b.row) - 1;
        const r1 = grid.rows[ri - 1], r2 = grid.rows[ri];
        if (r1 && r2) { key = `r${ri}`; span = [r1[1], r2[0]]; vertical = false; }
      }
      if (key) turnBacks.add(k);
    } else if (isH(s1) && isH(s2) && (f || Math.abs(p1.y - p2.y) > 0.5)) {
      const ti = trackOf(b);
      const leftSide = s2 === "left";
      const t1 = grid.cols[(leftSide ? ti - 1 : ti) - 1], t2 = grid.cols[(leftSide ? ti : ti + 1) - 1];
      if (t1 && t2) { key = `c${leftSide ? ti - 1 : ti}`; span = [t1[1], t2[0]]; vertical = true; }
      void a;
    } else if (!isH(s1) && !isH(s2) && Math.abs(p1.x - p2.x) > 0.5) {
      const topSide = s2 === "top";
      const ri = topSide ? b.row - 1 : b.row2;
      const r1 = grid.rows[ri - 1], r2 = grid.rows[ri];
      if (r1 && r2) { key = `r${ri}`; span = [r1[1], r2[0]]; vertical = false; }
    }
    if (!key || !span) return;
    if (f) farLast.set(k, span);
    join(key, span, vertical, `${e.to}.${s2}.${Math.round(vertical ? p2.y : p2.x)}`, k);
  }); };
  gather();

  const lanes = new Map<number, number>();
  const route = (k: number): Pt[] => {
    const [s1, s2] = sides[k]!;
    const { p1, p2 } = ends[k]!;
    const f = far.get(k);
    if (f) {
      // Out to its own gutter's lane, along its corridor, into the referenced table's gutter (the bus there) and the key.
      const last = farLast.get(k);
      const x1 = lanes.get(-(k + 1)) ?? (f.first ? (f.first.span[0] + f.first.span[1]) / 2 : p1.x);
      const x2 = lanes.get(k) ?? (last ? (last[0] + last[1]) / 2 : p2.x);
      return [p1, { x: x1, y: p1.y }, { x: x1, y: f.y }, { x: x2, y: f.y }, { x: x2, y: p2.y }, p2];
    }
    if (isH(s1) && isH(s2)) {
      if (s1 === s2) {
        // A one-column schema's turn-back takes its lane: space-4 out, the second space-3 further (call 2); space-6 out where marks are drawn (1.1).
        const out = s(m.marks ? "6" : "4") + (m.type === "schema" && m.cols === 1 ? (turnBackLanes(m).lane.get(k) ?? 0) * s("3") : 0);
        const x = lanes.get(k) ?? (s1 === "right" ? Math.max(p1.x, p2.x) + out : Math.min(p1.x, p2.x) - out);
        return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
      }
      if (Math.abs(p1.y - p2.y) <= 0.5) return [p1, { x: p2.x, y: p1.y }];
      const x = lanes.get(k) ?? (p1.x + p2.x) / 2;
      return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
    }
    if (!isH(s1) && !isH(s2)) {
      if (s1 === s2) { const y = lanes.get(k) ?? (s1 === "bottom" ? Math.max(p1.y, p2.y) + s("4") : Math.min(p1.y, p2.y) - s("4")); return [p1, { x: p1.x, y }, { x: p2.x, y }, p2]; }
      if (Math.abs(p1.x - p2.x) <= 0.5) return [p1, { x: p1.x, y: p2.y }];
      const y = lanes.get(k) ?? (p1.y + p2.y) / 2;
      return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
    }
    if (isH(s1)) return [p1, { x: p2.x, y: p1.y }, p2];
    return [p1, { x: p1.x, y: p2.y }, p2];
  };
  const buildOne = (k: number): GLine => {
    const e = m.edges[k]!;
    const w = strokeOf(e.kind, tk);
    const raw = route(k);
    const pts = snapRoute(raw, w, sn);
    // The runs' places before the snap: the ends' own, and a lane's as given. Where the snap merged a run, the snapped places stand.
    let axes: number[] | undefined;
    if (raw.length === pts.length) {
      axes = segmentsOf(raw).map(([a, b]) => (Math.abs(a.y - b.y) < 0.75 ? (a.y + b.y) / 2 : (a.x + b.x) / 2));
      axes[0] = ends[k]!.r1;
      if (axes.length > 1) axes[axes.length - 1] = ends[k]!.r2;
    }
    return { i: k, from: e.from, to: e.to, kind: e.kind, pts, tip: pts[pts.length - 1]!, dir: finish(pts), dot: e.fk && !e.card ? pts[0] : undefined, card: e.card, width: w, axes };
  };
  const build = (): GLine[] => m.edges.flatMap((_, k) => (dropped.has(k) ? [] : [buildOne(k)]));
  // A gutter's lanes are scored by the lines in it alone: their crossings with every line, and the nodes they pass through. The other
  // lines are not rebuilt or compared with each other, since a permutation of this gutter cannot change them.
  let current: GLine[] | null = null;
  const score = (members: Set<number>) => {
    current ??= build();
    const lines = current.map((l) => (members.has(l.i) ? buildOne(l.i) : l));
    // A run laid on another line's run is worse than a crossing (a crossing is cut; lines on one another read as one), so it counts most.
    return { lines, score: overlapsOf(lines, members) * 100000 + findCrossings(lines, undefined, members).length * 1000 + throughOf(lines.filter((l) => members.has(l.i)), nodes, m).length };
  };
  // Each gutter: its lanes evenly spaced (at least space-3 apart), in the order that crosses least.
  // Lanes are needed only where jogs run beside each other: jogs whose runs along the gutter do not overlap each take its middle.
  // A member's run along its gutter: a line's from end to end; a far line's from its row to its corridor (its own gutter) or on to its key.
  const runOf = (members: number[], vertical: boolean): [number, number] => {
    const ys = members.flatMap((id) => {
      const k = id < 0 ? -id - 1 : id;
      const { p1, p2 } = ends[k]!;
      const f = far.get(k);
      if (f) return id < 0 ? [p1.y, f.y] : [f.y, p2.y];
      return vertical ? [p1.y, p2.y] : [p1.x, p2.x];
    });
    return [Math.min(...ys), Math.max(...ys)];
  };
  const edgeOf = (id: number) => (id < 0 ? -id - 1 : id);
  const clustersOf = (g: { span: [number, number]; vertical: boolean; members: Map<string, number[]> }) => {
    const ports = [...g.members.values()].map((members) => ({ members, run: runOf(members, g.vertical) })).sort((a, b) => a.run[0] - b.run[0]);
    const clusters: Array<typeof ports> = [];
    for (const p of ports) {
      const last = clusters[clusters.length - 1];
      // Two jogs share the middle only when a clear space-8 parts them; closer, they would read as one line.
      if (last && last.some((q) => q.run[0] < p.run[1] + s("8") && p.run[0] < q.run[1] + s("8"))) last.push(p); else clusters.push([p]);
    }
    // A turn-back alone keeps its own place, space-4 out from the side (space-6 where marks are drawn); beside a jog or another turn-back, they share the gutter's lanes.
    return clusters.filter((cluster) => !(cluster.length === 1 && cluster[0]!.members.every((k) => turnBacks.has(k))));
  };
  // A marked gutter's lanes are counted by what runs beside what (1.1): a line needs a lane apart only from the lines its run is beside (closer than
  // space-8, the merged rule for sharing the middle), so the lanes a cluster needs are the most runs beside each other at one height. Each run takes the first lane
  // free of the runs beside it, in the order the runs start: as few lanes as the most beside one another.
  type Cluster = ReturnType<typeof clustersOf>[number];
  const besideIn = (cluster: Cluster) => (i: number, j: number) => cluster[i]!.run[0] < cluster[j]!.run[1] + s("8") && cluster[j]!.run[0] < cluster[i]!.run[1] + s("8");
  const firstFit = (cluster: Cluster) => {
    const beside = besideIn(cluster);
    const slot: number[] = [];
    cluster.forEach((_, i) => { let l = 0; while (slot.some((x, j) => x === l && beside(i, j))) l++; slot.push(l); });
    return slot;
  };
  const needOf = (cluster: Cluster) => Math.max(0, ...firstFit(cluster)) + 1;
  // A marked gutter (1.1) holds three lanes at most: a line that would need a fourth is not drawn, a far line first and then the later in the
  // author's order (its lane and its bus go with it).
  if (m.marks) for (let guard = 0; guard < m.edges.length; guard++) {
    let over: number[][] | null = null;
    for (const [, g] of jogs) for (const cluster of clustersOf(g)) if (needOf(cluster) > 3) { over = cluster.map((c) => c.members.map(edgeOf)); break; }
    if (!over) break;
    const latest = (group: number[]) => Math.max(...group);
    const victim = over.filter((group) => group.some((k) => far.has(k))).sort((p, q) => latest(q) - latest(p))[0] ?? over.slice().sort((p, q) => latest(q) - latest(p))[0]!;
    for (const k of victim) { drop(k, dev ? "would need a fourth lane in a marked gutter" : ""); far.delete(k); }
    gather();
  }
  // Lanes in a marked gutter (1.1): none nearer a table than the zone plus radius-xs (18), centred and evenly spaced at the merged pitch or the pitch
  // that puts the outer lanes 18 from the tables, whichever is less: one at 30, two at 20 and 40, three at 18, 30 and 42 in the 60 gap.
  // Right to left a column gutter's lanes are counted from its right, so the lanes chosen mirror the left-to-right ones (1.7: the gutter is logical).
  const laneAt = (span: [number, number], at: number, count: number, vertical = false) => {
    const j = m.rtl && vertical ? count - 1 - at : at;
    const width = span[1] - span[0];
    if (!m.marks) return span[0] + (width / (count + 1)) * (j + 1);
    const room = tk.foot + tk.radiusXs;
    const step = count > 1 ? Math.min(width / (count + 1), (width - 2 * room) / (count - 1)) : 0;
    return (span[0] + span[1]) / 2 + (j - (count - 1) / 2) * step;
  };
  // The clear band (the run-edge ruling): a box's edge is a line. A gap's lanes keep its middle while each is space-3 clear of every box edge beside them; where one is
  // not, they are laid in the part of the gap outside those boxes. A band with no room for them (space-2 a lane) is not drawn in.
  const tight: number[] = [];
  const bandOf = (g: { span: [number, number]; vertical: boolean }, cluster: Cluster, count: number): [number, number] => {
    const [p, q] = g.span, to = Math.max(...cluster.map((c) => c.run[1])), step = (q - p) / (count + 1);
    let a = p, b = q;
    for (const r of groups) {
      const [lo, hi, r1, r2] = g.vertical ? [r.l, r.r, r.t, r.b] : [r.t, r.b, r.l, r.r];
      if (r2 <= cluster[0]!.run[0] || r1 >= to) continue;
      if (lo > a && lo < b) b = lo;
      if (hi > a && hi < b) a = hi;
    }
    // The gap's own lanes stand: the first and the last are space-3 clear of the edges.
    if (!(a > p && p + step < a + s("3")) && !(b < q && q - step > b - s("3"))) return g.span;
    if ((b - a) / (count + 1) < s("2")) tight.push(...cluster.flatMap((c) => c.members.map(edgeOf)));
    return [a, b];
  };
  // An interior corridor's two lanes: the order that crosses least.
  nestCorridors();
  for (const [key, groups] of corridorGroups) {
    if (key === "top" || key === "bottom" || groups.length < 2) continue;
    const members = new Set(groups.flat());
    let best = groups, bestScore = Infinity;
    for (const perm of permutations(groups.slice().sort((p, q) => reach(q) - reach(p)))) {
      setCorridor(key, perm);
      current = null;
      const tried = score(members);
      if (tried.score < bestScore) { bestScore = tried.score; best = perm; }
    }
    setCorridor(key, best);
    current = null;
  }
  for (const [, g] of jogs) {
    for (const cluster of clustersOf(g)) {
      const groupsOf = cluster.map((c) => c.members);
      if (m.marks) {
        // A marked gutter: its lanes by what runs beside what, each assignment that keeps runs beside each other apart tried, the one that crosses
        // least kept (the first-fit one wins a tie).
        const need = needOf(cluster), beside = besideIn(cluster), n = cluster.length;
        const inGutter = new Set(groupsOf.flat().map(edgeOf));
        const span = bandOf(g, cluster, need);
        const set = (slots: number[]) => slots.forEach((l, i) => groupsOf[i]!.forEach((k) => lanes.set(k, laneAt(span, l, need, g.vertical))));
        let best = firstFit(cluster), bestScore = Infinity, bestLines: GLine[] | null = null;
        const tries: number[][] = [best];
        if (need ** n <= 729) for (let code = 0; code < need ** n; code++) {
          const slots = Array.from({ length: n }, (_, i) => Math.floor(code / need ** i) % need);
          if (slots.every((x, i) => slots.every((y, j) => j <= i || x !== y || !beside(i, j)))) tries.push(slots);
        }
        for (const slots of tries) {
          set(slots);
          const tried = score(inGutter);
          if (tried.score < bestScore) { bestScore = tried.score; best = slots; bestLines = tried.lines; }
        }
        set(best);
        current = bestLines;
        continue;
      }
      const count = groupsOf.length;
      const span = bandOf(g, cluster, count);
      if (dev && !m.marks && (span[1] - span[0]) / (count + 1) < s("3")) warn?.(`${[...new Set(groupsOf.flat().map(edgeOf))].map((k) => { const e = m.edges[k]; return e ? `${m.byId.get(e.from)?.name} to ${m.byId.get(e.to)?.name}` : ""; }).join(", ")} ${count > 1 ? "run" : "runs"} closer than space-3 a lane${span !== g.span ? " beside a box's edge" : ""}`);
      const inGutter = new Set(groupsOf.flat().map(edgeOf));
      let best: number[][] = groupsOf, bestScore = Infinity, bestLines: GLine[] | null = null;
      for (const perm of permutations(groupsOf)) {
        perm.forEach((members, j) => members.forEach((k) => lanes.set(k, laneAt(span, j, count, g.vertical))));
        const tried = score(inGutter);
        if (tried.score < bestScore) { bestScore = tried.score; best = perm; bestLines = tried.lines; }
      }
      best.forEach((members, j) => members.forEach((k) => lanes.set(k, laneAt(span, j, count, g.vertical))));
      current = bestLines;
    }
  }
  geo.lines = build();
  // A marked line whose end run cannot hold its zone (1.1): the marks and an elbow's room past them, or both zones on a straight line.
  if (m.marks) geo.lines = geo.lines.filter((l) => {
    if (!l.card) return true;
    const segs = segmentsOf(l.pts);
    const len = ([a, b]: readonly [Pt, Pt]) => Math.hypot(b.x - a.x, b.y - a.y);
    const need = segs.length === 1 ? 2 * tk.foot : tk.foot + tk.radiusXs - 0.5;
    if (len(segs[0]!) >= need && len(segs[segs.length - 1]!) >= need) return true;
    drop(l.i, dev ? "has no room for its marks at an end" : "");
    far.delete(l.i);
    return false;
  });
  // The rows a far line's corridor needs (1.1): a row gap that carries one is space-10 (space-8 otherwise); a margin corridor adds space-8.
  if (far.size) {
    const used = new Set([...far.values()].map((f) => f.corridor));
    const tracks = [used.has("top") ? "var(--basalt-space-8)" : "0px"];
    for (let r = 1; r <= m.rows; r++) tracks.push("auto", r < m.rows ? (used.has(`g${r}`) ? "var(--basalt-space-10)" : "var(--basalt-space-8)") : used.has("bottom") ? "var(--basalt-space-8)" : "0px");
    geo.corridors = { rows: tracks.join(" "), pick };
  }
  geo.crossings = findCrossings(geo.lines);
  geo.through = throughOf(geo.lines, nodes, m);
  geo.outside = outsideOf(geo.lines, W, H, tk);
  obstacles.heads = geo.lines.map((l) => headBox(l, tk));
  const seats = seatLabels(m, geo.lines, nodes, obstacles, groups, { l: 0, t: 0, r: W, b: H }, tk, measure, { ox, oy });
  geo.labels = seats.labels;
  geo.unseated = seats.unseated;
  geo.bounded = seats.bounded;
  // Two lines on one another that are not a bus (a one-column schema's turn-backs to different keys, with no gutter to give each a lane) read as
  // one line: the drawn layout is refused, as a line through a node is.
  geo.overlaps = [...new Set([...overlapPairs(geo.lines, null).flat(), ...tight])];
  return geo;
}

/** Runs of two lines laid on one another (collinear and overlapping by more than a pixel), for lines in `only`. Lines that end on one point
 *  share a lane by design (a bus, 1.7), so they are not counted. */
function overlapsOf(lines: GLine[], only: Set<number>): number {
  return overlapPairs(lines, only).length;
}
/** Each such run as the pair of lines (by edge index) that lie on one another, once a run; `only` null takes every line. */
function overlapPairs(lines: GLine[], only: Set<number> | null): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
    const A = lines[a]!, B = lines[b]!;
    if (only && !only.has(A.i) && !only.has(B.i)) continue;
    if (A.to === B.to && Math.abs(A.tip.x - B.tip.x) < 1 && Math.abs(A.tip.y - B.tip.y) < 1) continue;
    const near = (A.width + B.width) / 2 + 0.5;
    for (const [p1, p2] of segmentsOf(A.pts)) for (const [q1, q2] of segmentsOf(B.pts)) {
      const aH = Math.abs(p1.y - p2.y) < 0.01, bH = Math.abs(q1.y - q2.y) < 0.01;
      if (aH !== bH) continue;
      const [ac, bc] = aH ? [p1.y, q1.y] : [p1.x, q1.x];
      if (Math.abs(ac - bc) >= near) continue;
      const [a1, a2] = aH ? [p1.x, p2.x] : [p1.y, p2.y], [b1, b2] = aH ? [q1.x, q2.x] : [q1.y, q2.y];
      if (Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2)) > 1) pairs.push([A.i, B.i]);
    }
  }
  return pairs;
}

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) { yield items.slice(); return; }
  if (items.length > 5) { yield items.slice(); return; }
  for (let k = 0; k < items.length; k++) {
    const rest = items.slice(0, k).concat(items.slice(k + 1));
    for (const p of permutations(rest)) yield [items[k]!, ...p];
  }
}

/** Lines any part of which (the stroke, or the head's width) is outside the drawing: the fit refuses them, so no route is drawn off the figure. */
function outsideOf(lines: GLine[], W: number, H: number, tk: Tokens): number[] {
  const out: number[] = [];
  for (const l of lines) {
    // The stroke's half width round every point, and the head's half width round its tip.
    if (l.pts.some((p, k) => { const pad = k === l.pts.length - 1 ? Math.max(l.width / 2, tk.head / 2) : l.width / 2; return p.x - pad < -0.5 || p.x + pad > W + 0.5 || p.y - pad < -0.5 || p.y + pad > H + 0.5; })) out.push(l.i);
  }
  return out;
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
  // Each message's line height, by its number, for the bars.
  const rowY = new Map<number, number>();
  drawing.querySelectorAll<HTMLElement>(`.${P}-msg`).forEach((li) => {
    const r = rectOf(li, origin);
    rowY.set(Number(li.querySelector(`.${P}-num`)?.textContent ?? 0), (r.t + r.b) / 2);
  });
  // Activation bars (1.2): size-diagram-activation wide, centred on the lifeline, from the opening message's line to the closing one's; a nested bar
  // space-1 toward the end side (the start side on the last participant). A one-row bar (a self-call that opens and closes it) spans its loop.
  const W = tk.activation, half = W / 2;
  const barRect = (bar: MBar) => {
    const who = m.byId.get(bar.who);
    if (!who) return null;
    const lx = xOf(bar.who);
    const lastOne = who.i === m.nodes.length - 1 && m.nodes.length > 1;
    const dir = (lastOne ? -1 : 1) * (m.rtl ? -1 : 1);
    const off = (bar.depth - 1) * s("1") * dir;
    const y1 = rowY.get(bar.from) ?? 0, y2 = rowY.get(bar.to) ?? y1;
    const one = bar.from === bar.to;
    return { l: sn.x(lx - half + off, tk.hair), r: sn.x(lx + half + off, tk.hair), t: sn.y(one ? y1 - s("2") - s("1") : y1, tk.hair), b: sn.y(one ? y1 + s("2") + s("1") : y2, tk.hair) };
  };
  const placedBars = m.bars.map((bar) => ({ bar, rect: barRect(bar) })).filter((x) => x.rect) as Array<{ bar: MBar; rect: Rect }>;
  geo.bars = placedBars.map((x) => x.rect);
  /** The deepest bar a participant has at a message (the one a line ends on), and whether one it opens counts. */
  const barAt = (who: string, n: number, opening: boolean) => placedBars.filter(({ bar }) => bar.who === who && bar.to >= n && (opening ? bar.from <= n : bar.from < n || (bar.from === n && bar.to === n))).sort((x, y) => y.bar.depth - x.bar.depth)[0]?.rect;
  drawing.querySelectorAll<HTMLElement>(`.${P}-msg`).forEach((li) => {
    const from = li.dataset.from!, to = li.dataset.to!;
    const kind = (li.dataset.kind ?? "plain") as DiagramLineKind;
    const w = strokeOf(kind, tk);
    const r = rectOf(li, origin);
    const y = sn.y((r.t + r.b) / 2, w);
    const num = Number(li.querySelector(`.${P}-num`)?.textContent ?? 0);
    let x1 = xOf(from), x2 = xOf(to);
    let pts: Pt[];
    if (from === to) {
      const out = li.dataset.self === "start" ? -s("6") : s("6");
      // A self-call's loop starts from the bar's end edge (its start edge on the last participant).
      const bar = barAt(from, num, true);
      const edge = bar ? (out > 0 ? bar.r : bar.l) : x1;
      const yt = sn.y(y - s("2"), w), yb = sn.y(y + s("2"), w);
      pts = [{ x: edge, y: yt }, { x: sn.x(x1 + out, w), y: yt }, { x: sn.x(x1 + out, w), y: yb }, { x: edge, y: yb }];
    } else {
      // A line ends on a bar's edge, as a line ends on the shape drawn (1.2): the receiver's bar (one this message opens included), the sender's.
      const toward = x2 > x1 ? 1 : -1;
      const sb = barAt(from, num, false), rb = barAt(to, num, true);
      if (sb) x1 = toward > 0 ? sb.r : sb.l;
      if (rb) x2 = toward > 0 ? rb.l : rb.r;
      pts = [{ x: x1, y }, { x: x2, y }];
    }
    geo.lines.push({ i: num, from, to, kind, pts, tip: pts[pts.length - 1]!, dir: finish(pts), width: w });
    // Every label and note fits between the lifelines it spans, space-2 clear each side (1.11, rule 3).
    const said = li.querySelector(`.${P}-said`), note = li.querySelector(`.${P}-note`);
    const a = m.byId.get(from), b = m.byId.get(to);
    if (!a || !b) return;
    const room = from === to
      // The neighbour on the loop's side, by column (right to left the author's order runs the other way).
      ? (() => { const next = m.nodes.find((n) => n.col === a.col + (li.dataset.self === "start" ? -1 : 1)); const limit = next ? xOf(next.id) : li.dataset.self === "start" ? 0 : geo.w; return Math.abs(limit - x1) - s("6") - s("2-5") - s("2"); })()
      : Math.abs(x2 - x1) - 2 * s("2");
    const need = Math.max(said ? said.getBoundingClientRect().width : 0, note ? note.getBoundingClientRect().width : 0);
    if (need > room + 0.5) geo.unseated.push(num);
    void spanOf;
  });
  // A frame's header (its tab, then its label) must fit inside its frame (1.2): a header that does not stacks the figure.
  drawing.querySelectorAll<HTMLElement>(`.${P}-fhead`).forEach((head) => {
    const box = head.parentElement?.querySelector(`:scope > .${P}-fbox`);
    if (!box) return;
    const need = [...head.children].reduce((sum, c) => sum + c.getBoundingClientRect().width, 0) + s("3");
    if (need > box.getBoundingClientRect().width + 0.5) (geo.misfit ??= []).push(`the frame "${head.querySelector(`.${P}-flabel`)?.textContent ?? ""}" is wider than its participants`);
  });
  // Any text box, grown space-1, that would lie on a frame's side fails the fit rule too (1.2; Neon's B7 of the code review): the figure stacks.
  {
    const sides = [...drawing.querySelectorAll<HTMLElement>(`.${P}-fbox`)].flatMap((el) => { const r = rectOf(el, origin); return [{ x: r.l + 0.5, t: r.t, b: r.b }, { x: r.r - 0.5, t: r.t, b: r.b }]; });
    if (sides.length) drawing.querySelectorAll<HTMLElement>(`.${P}-said, .${P}-note, .${P}-band > span`).forEach((el) => {
      if (!el.getClientRects().length) return;
      const r = grow(rectOf(el, origin), s("1"));
      if (sides.some((f) => r.l < f.x && r.r > f.x && r.t < f.b && r.b > f.t)) (geo.misfit ??= []).push(`"${el.textContent?.trim() ?? ""}" would lie on a frame's side`);
    });
  }
  return geo;
}

// ---- The stacked drawing (1.13) ----

/** A stacked group's label gives way to the lines at its top edge (the diagrams-rtl ruling, 3 to 5): if a line runs through its band, it takes the first
 *  place along the edge, from its start seat toward the end, whose words are space-2-5 from the stroke of every line through the band, on both sides,
 *  and end at least space-3 before the group's inner end edge. It is moved by `--_gx` (the stylesheet adds it to the seat's inset). No such place: it
 *  keeps its start seat on its plate, and its words are returned for the development warning. Right to left it slides toward the left. */
function slideGroupLabels(glabels: Map<HTMLElement, HTMLElement>, lines: GLine[], origin: DOMRect, rtl: boolean, s: Tokens["space"]): string[] {
  const seatless: string[] = [];
  for (const [g, el] of glabels) {
    if (!el.getClientRects().length) continue;
    const plate = rectOf(el, origin), gr = rectOf(g, origin);
    const ls = getComputedStyle(el), gs = getComputedStyle(g);
    const words = { l: plate.l + (parseFloat(ls.paddingLeft) || 0), r: plate.r - (parseFloat(ls.paddingRight) || 0) };
    const lw = words.r - words.l;
    // The group's inner edges (inside its border), and where its inner end edge stops the words.
    const inL = gr.l + (parseFloat(gs.borderLeftWidth) || 0), inR = gr.r - (parseFloat(gs.borderRightWidth) || 0);
    // Every stroke that runs through the label's band, as its extent across.
    const blocked: Array<{ l: number; r: number }> = [];
    for (const l of lines) for (const [a, b] of segmentsOf(l.pts)) {
      const sr = segRect(a, b, l.width);
      if (sr.t < plate.b && sr.b > plate.t) blocked.push({ l: sr.l, r: sr.r });
    }
    const gap = s("2-5");
    const clear = (wl: number) => blocked.every((c) => c.r <= wl - gap + 0.01 || c.l >= wl + lw + gap - 0.01);
    if (clear(words.l)) continue;
    // The places to try, by how far each moves the words from the start seat toward the end: just past each stroke.
    const moves = blocked.map((c) => (rtl ? words.r - (c.l - gap) : c.r + gap - words.l)).filter((d) => d > 0).sort((a, b) => a - b);
    const at = (d: number) => (rtl ? words.l - d : words.l + d);
    const fits = (d: number) => (rtl ? at(d) >= inL + s("3") - 0.01 : at(d) + lw <= inR - s("3") + 0.01);
    const d = moves.find((v) => fits(v) && clear(at(v)));
    if (d === undefined) { seatless.push(el.textContent ?? ""); continue; }
    el.style.setProperty("--_gx", `${Math.round(d * 100) / 100}px`);
  }
  return seatless;
}

function stackedGeometry(input: DrawnInput, measure: ReturnType<typeof ruler>, plan: StackPlan, grown: Record<string, number> = record()): { geo: Geo; grow: Record<string, number> } {
  const { m, tk, P, drawing, origin } = input;
  const s = tk.space;
  const map = gNodes(m, drawing, origin, P);
  const nodes = [...map.values()];
  const ox = origin.left - Math.floor(origin.left), oy = origin.top - Math.floor(origin.top);
  const sn = snapper(ox, oy, Boolean(m.rtl));
  const W = drawing.clientWidth, H = drawing.clientHeight;
  const geo: Geo = { w: W, h: H, nodes, lines: [], lifelines: [], labels: [], crossings: [], through: [], unseated: [], outside: [], ox, oy };
  const growBy = record<number>();
  if (m.type === "sequence" || m.type === "schema") return { geo, grow: growBy };
  // Right to left the stack mirrors (1.7): the rail and the trunk run down the start side, which is the right, and the end lines and the gutter are
  // on the left. Every place across is written from the start edge (`st`) or the end edge (`en`) and stepped toward the end (`fw`).
  const rtl = Boolean(m.rtl), fw = rtl ? -1 : 1;
  const st = (r: Rect) => (rtl ? r.r : r.l), en = (r: Rect) => (rtl ? r.l : r.r);
  const endSide: DiagramSide = rtl ? "left" : "right";
  /** A box `width` wide that starts `gap` toward the end from `x` (`toward` 1), or ends `gap` toward the start of it (`toward` -1). */
  const across = (x: number, gap: number, width: number, toward: 1 | -1): { l: number; r: number } => {
    const a = x + toward * fw * gap, b = a + toward * fw * width;
    return { l: Math.min(a, b), r: Math.max(a, b) };
  };
  // The end gutter is outside the spine cards, from the drawing's end less its padding (where a group's box ends too), never from a card inside a group.
  const dcs = getComputedStyle(drawing);
  const spineEnd = rtl ? parseFloat(dcs.paddingLeft) || 0 : W - (parseFloat(dcs.paddingRight) || 0);
  // A fixed seat that does not fit takes a line of its own (1.13): each line of 16 the gap above its card has grown gives the seat one more
  // place, a line further from the card, into the room the growth made (up for a seat above a card, down for one under the card above).
  const lineSeats = (box: Rect, id: string, dir: 1 | -1): Rect[] => {
    const out = [box];
    for (let j = 1; j <= (own(grown, id) ?? 0); j++) out.push({ ...box, t: box.t + dir * s("4") * j, b: box.b + dir * s("4") * j });
    return out;
  };
  // The end edge a spine card has where each card sits (the group's inside, or the drawing's less the gutter).
  const columnEnd = new Map<string, number>();
  drawing.querySelectorAll<HTMLElement>(`.${P}-node`).forEach((el) => {
    const parent = el.parentElement!;
    const pr = rectOf(parent, origin);
    const cs = getComputedStyle(parent);
    columnEnd.set(el.dataset.node!, rtl ? pr.l + (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.borderLeftWidth) || 0) : pr.r - (parseFloat(cs.paddingRight) || 0) - (parseFloat(cs.borderRightWidth) || 0));
  });
  const order = m.nodes;
  const card = (i: number) => map.get(order[i]!.id)!;
  // A stacked group's label (the diagrams-rtl ruling): measured on its start seat, so the stem that enters the group gives way to the seat, never to a
  // place the label slid to on an earlier measure.
  const glabels = new Map<HTMLElement, HTMLElement>();
  drawing.querySelectorAll<HTMLElement>(`.${P}-group > .${P}-glabel`).forEach((el) => { el.style.removeProperty("--_gx"); glabels.set(el.parentElement!, el); });
  const seatOf = new Map<HTMLElement, Rect>();
  for (const [g, el] of glabels) if (el.getClientRects().length) seatOf.set(g, rectOf(el, origin));
  // The first card of a group (ruling 4 on the re-check): its turn's label takes the first seat beside the turn that clears the card, a
  // line at a time up into the room the group keeps for it, never above the group's edge (the group's edge and label are obstacles).
  const turnInto = (id: string) => { const el = drawing.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(id)}"]`); const g = el?.parentElement; return Boolean(g?.matches(`.${P}-group[data-turn]`) && g.querySelector(`:scope > .${P}-node`) === el); };
  const beside = (box: Rect, id: string, lh: number) => (turnInto(id) ? Array.from({ length: Math.round(lh / 16) + 1 }, (_, j) => ({ ...box, t: box.t - j * s("4"), b: box.b - j * s("4") })) : [box]);
  // Each label's seats, in the order they are tried: a stem's are its clear shaft's middle and then its thirds (1.8's order); every other
  // route has its one fixed seat (1.13).
  const labelSeats: Array<{ k: number; cands: Rect[]; on: boolean; card: string }> = [];
  const lineW = (k: number) => strokeOf(m.edges[k]!.kind, tk);
  m.edges.forEach((e, k) => {
    const r = plan.routes[k]!;
    const a = map.get(e.from)!, b = map.get(e.to)!;
    const w = lineW(k);
    let pts: Pt[] = [];
    const label = e.label;
    const lw = label ? measure(label, "label") : 0;
    const lh = label ? 16 * labelLines(label) : 16;
    const turn = s("4");
    if (r === "down" || r === "up") {
      const lo = Math.max(a.rect.l, b.rect.l), hi = Math.min(a.rect.r, b.rect.r);
      // One stem between two cards keeps the middle. Two or more (one each way, say) would lie on one another there, so they take the side's
      // slots as 1.6 gives them: the quarter points for two, quarter, middle, quarter for three, in the author's order.
      const pair = m.edges.map((o, j) => ({ o, j })).filter(({ o, j }) => (plan.routes[j] === "down" || plan.routes[j] === "up") && ((o.from === e.from && o.to === e.to) || (o.from === e.to && o.to === e.from)));
      const at = pair.findIndex((p) => p.j === k);
      const slot = pair.length < 2 ? 0.5 : pair.length === 2 ? (at === 0 ? 0.25 : 0.75) : (at + 1) / (pair.length + 1);
      let x = sn.x(lo + (hi - lo) * slot, w);
      // A stem into a group's first card from a card outside the group gives way to the group's label (the diagrams-rtl ruling, 2): toward the end
      // until its stroke is space-2-5 past the label's plate, only while it stays space-6 inside the end edge of both cards. Its label goes with it.
      if (r === "down") {
        const el = drawing.querySelector<HTMLElement>(`.${P}-node[data-node="${CSS.escape(e.to)}"]`);
        const g = el?.parentElement;
        const seat = g && g.matches(`.${P}-group`) && g.querySelector(`:scope > .${P}-node`) === el ? seatOf.get(g) : undefined;
        if (seat && g && !g.contains(drawing.querySelector(`.${P}-node[data-node="${CSS.escape(e.from)}"]`))) {
          const clear = s("2-5") + w / 2;
          if (x > seat.l - clear && x < seat.r + clear) {
            const past = rtl ? seat.l - clear : seat.r + clear;
            if (rtl ? past >= lo + s("6") : past <= hi - s("6")) x = sn.x(past, w);
          }
        }
      }
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
        const cands = [1 / 2, 1 / 3, 2 / 3].map((f) => { const cy = y1 + (y2 - y1) * f; return { l: x - lw / 2 - s("1"), r: x + lw / 2 + s("1"), t: cy - lh / 2, b: cy + lh / 2 }; });
        labelSeats.push({ k, cands, on: true, card: r === "down" ? e.to : e.from });
      }
    } else if (r === "trunk" || r === "rail") {
      // The inner of the two cards' start edges (the later one going toward the end), then space-8 (a trunk) or space-3 (a rail) toward the end.
      const inner = r === "rail" ? (rtl ? Math.min(a.rect.r, b.rect.r) : Math.max(a.rect.l, b.rect.l)) : st(a.rect);
      const x = sn.x(inner + fw * (r === "trunk" ? s("8") : s("3")), w);
      const start = contour(a, "bottom", x);
      if (r === "rail") {
        pts = [start, contour(b, "top", x)];
        if (label) { const cy = b.rect.t - s("6"); labelSeats.push({ k, cands: lineSeats({ ...across(x, s("2-5"), lw, 1), t: cy - lh / 2, b: cy + lh / 2 }, e.to, -1), on: false, card: e.to }); }
      } else {
        const ex = sn.x(st(b.rect) + fw * s("6"), w);
        const ty = sn.y(b.rect.t - turn, w);
        pts = [start, { x, y: ty }, { x: ex, y: ty }, contour(b, "top", ex)];
        const seat = { ...across(ex, s("2-5"), lw, 1), t: ty - lh / 2, b: ty + lh / 2 };
        if (label) labelSeats.push({ k, cands: [...beside(seat, e.to, lh), ...lineSeats(seat, e.to, -1).slice(1)], on: false, card: e.to });
      }
    } else {
      // An end line: out the end side, along the end lane or the gutter, into the card's top (down) or bottom (up), space-6 in from its end edge.
      // The nearer of the two columns' end edges.
      const ce = (id: string) => columnEnd.get(id) ?? (rtl ? 0 : W);
      const colEnd = rtl ? Math.max(ce(e.from), ce(e.to)) : Math.min(ce(e.from), ce(e.to));
      // Lanes space-3-5 apart, one pitch (DECISIONS 306, 1.3).
      const laneX = sn.x(plan.gutter ? spineEnd + fw * (plan.lanes[k]! + 1) * s("3-5") : colEnd - fw * s("2-5"), w);
      const yExit = sn.y(a.rect.t + (a.rect.b - a.rect.t) * plan.exits[k]!, w);
      const exit = contour(a, endSide, yExit);
      const down = r === "end-down";
      // Several end lines into one card nest (1.3): the line from the outermost lane turns lowest (the merged turn) and enters nearest the end edge
      // (space-6 in); each from a lane further in turns space-5 higher and enters space-3 further in. Their labels are seated space-2-5 clear of the
      // innermost entry, each centred on its own turn's height, taken before the half-pixel snap.
      const mates = m.edges.map((o, j) => ({ o, j })).filter(({ o, j }) => (plan.routes[j] === r) && o.to === e.to).sort((x, y) => plan.lanes[y.j]! - plan.lanes[x.j]! || x.j - y.j);
      const at = Math.max(0, mates.findIndex(({ j }) => j === k));
      const exRaw = en(b.rect) - fw * (s("6") + at * s("3")), innerEx = en(b.rect) - fw * (s("6") + (mates.length - 1) * s("3"));
      const ex = sn.x(exRaw, w);
      const tyRaw = down ? b.rect.t - turn - at * s("5") : b.rect.b + turn + at * s("5");
      const ty = sn.y(tyRaw, w);
      pts = [exit, { x: laneX, y: exit.y }, { x: laneX, y: ty }, { x: ex, y: ty }, contour(b, down ? "top" : "bottom", ex)];
      const into = down ? e.to : order[b.i + 1]?.id ?? e.to;
      // Its label is on the start side of the innermost entry.
      const seat = { ...across(innerEx, s("2-5"), lw, -1), t: tyRaw - lh / 2, b: tyRaw + lh / 2 };
      if (label) labelSeats.push({ k, cands: [...(down ? beside(seat, into, lh) : [seat]), ...lineSeats(seat, into, down ? -1 : 1).slice(1)], on: false, card: into });
    }
    const snapped = snapRoute(pts, w, sn);
    geo.lines.push({ i: k, from: e.from, to: e.to, kind: e.kind, pts: snapped, tip: snapped[snapped.length - 1]!, dir: finish(snapped), width: w });
  });
  geo.crossings = findCrossings(geo.lines);
  geo.through = throughOf(geo.lines, nodes, m);
  geo.outside = outsideOf(geo.lines, W, H, tk);
  // Seats, checked by 1.8's rule (a head counts, its own line's included): a label whose every seat fails grows the gap above its card by 16,
  // and the figure is measured again; measureFigure draws no lines at all if any label is still without a clean seat after the last try.
  geo.seatless = slideGroupLabels(glabels, geo.lines, origin, rtl, s);
  const { obstacles } = obstaclesOf(drawing, origin, P, 0);
  obstacles.heads = geo.lines.map((l) => headBox(l, tk));
  const placed: Rect[] = [];
  const bounds = { l: 0, t: 0, r: W, b: H };
  for (const seat of labelSeats) {
    const bad = (box: Rect) => {
      const G = grow(box, s("1"));
      return box.l < bounds.l - 0.5 || box.r > bounds.r + 0.5 || box.t < bounds.t - 0.5 || box.b > bounds.b + 0.5
        || nodes.some((n) => boxHitsShape(G, n))
        || placed.some((p) => hit(G, p))
        || obstacles.heads.some((h0) => hit(G, h0))
        || obstacles.rects.some((r) => hit(G, r))
        || geo.lines.some((o) => o.i !== seat.k && segmentsOf(o.pts).some(([a, b]) => hit(G, segRect(a, b, o.width))));
    };
    const box = seat.cands.find((c) => !bad(c));
    if (!box) { growBy[seat.card] = (growBy[seat.card] ?? 0) + 1; geo.unseated.push(seat.k); }
    const use = box ? wholePixels(box, ox, oy, (b) => !bad(b), rtl) : seat.cands[0]!;
    placed.push(use);
    geo.labels.push({ i: seat.k, text: m.edges[seat.k]!.label!, box: use, on: seat.on });
  }
  return { geo, grow: growBy };
}

// ---- The ink: one string of SVG and labels, the same in React and in the skill ----

/** A route as a path, its corners rounded. `zone` (a marked line's, 1.1): no elbow starts within it of either end. */
export function pathD(pts: Pt[], radius: number, zone = 0): string {
  const f = (n: number) => String(Math.round(n * 100) / 100);
  let d = `M${f(pts[0]!.x)} ${f(pts[0]!.y)}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const a = pts[k - 1]!, b = pts[k]!, c = pts[k + 1]!;
    const d1 = Math.hypot(b.x - a.x, b.y - a.y), d2 = Math.hypot(c.x - b.x, c.y - b.y);
    let r = Math.min(radius, d1 / 2, d2 / 2);
    if (zone && k === 1) r = Math.min(r, Math.max(0, d1 - zone));
    if (zone && k === pts.length - 2) r = Math.min(r, Math.max(0, d2 - zone));
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
  // A line that states how many (1.1): its shaft runs to both tables' edges, through crow's-foot marks in its own ink, with no dot and no head.
  if (l.card) {
    const a = l.pts[0]!, b = l.pts[1]!;
    const end = (form: DiagramCardinality, at: Pt, out: number, which: string) => {
      const { crow, ring } = cardMarks(form, at.x, at.y, out, tk.head, tk.dot);
      return `<path class="${P}-crow" data-end="${which}" d="${crow}"/>${ring ? `<circle class="${P}-ring" data-end="${which}" cx="${ring.x}" cy="${ring.y}" r="${ring.r}"/>` : ""}`;
    };
    return `<g class="${P}-edge" data-edge="${l.i}" data-from="${escapeHtml(l.from)}" data-to="${escapeHtml(l.to)}"><path class="${P}-line" data-kind="${escapeHtml(l.kind)}" d="${pathD(l.pts, radius, tk.foot)}"${maskId ? ` mask="url(#${escapeHtml(maskId)})"` : ""}/>${end(l.card.from, a, Math.sign(b.x - a.x) || 1, "from")}${end(l.card.to, l.tip, -u.x || 1, "to")}</g>`;
  }
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
  // Every value written into an attribute is escaped: a kind is one of three by the model, and the ids come from the page.
  const kind = escapeHtml(l.kind);
  const head = open
    ? `<path class="${P}-tip" data-kind="${kind}" data-open="" d="M${r2(bx + px)} ${r2(by + py)}L${r2(l.tip.x)} ${r2(l.tip.y)}L${r2(bx - px)} ${r2(by - py)}"/>`
    : `<path class="${P}-tip" data-kind="${kind}" d="M${r2(l.tip.x)} ${r2(l.tip.y)}L${r2(bx + px)} ${r2(by + py)}L${r2(bx - px)} ${r2(by - py)}Z"/>`;
  const dot = l.dot ? `<circle class="${P}-dot" cx="${r2(l.dot.x)}" cy="${r2(l.dot.y)}" r="${tk.dot / 2}"/>` : "";
  return `<g class="${P}-edge" data-edge="${l.i}" data-from="${escapeHtml(l.from)}" data-to="${escapeHtml(l.to)}"><path class="${P}-line" data-kind="${kind}" d="${pathD(pts, radius)}"${maskId ? ` mask="url(#${escapeHtml(maskId)})"` : ""}/>${head}${dot}</g>`;
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
    defs += `<mask id="${escapeHtml(id)}" maskUnits="userSpaceOnUse" x="0" y="0" width="${geo.w}" height="${geo.h}"><rect x="0" y="0" width="${geo.w}" height="${geo.h}" fill="white"/>${holes}</mask>`;
  }
  void P;
  return { defs, ids };
}

/** The drawing's ink: the SVG (lines, heads, dots, lifelines, cuts) and the labels, as one string. */
export function inkHtml(P: string, geo: Geo, tk: Tokens, base: string, more = ""): string {
  const { defs, ids } = masksMarkup(P, geo, tk, base);
  // A sequence's lifelines are their own layer, under its frames; the bars, lines and heads are over them (1.2's order: lifelines, frames, bars, lines,
  // plates and labels; Neon's P8 of the code review).
  const lifelines = geo.lifelines.map((l) => `<path class="${P}-life" d="M${l.x} ${l.y1}V${l.y2}"/>`).join("");
  const bars = (geo.bars ?? []).map((b) => `<rect class="${P}-bar" x="${b.l}" y="${b.t}" width="${Math.round((b.r - b.l) * 100) / 100}" height="${Math.round((b.b - b.t) * 100) / 100}"/>`).join("");
  const lines = geo.lines.map((l, k) => lineMarkup(P, l, tk, ids.get(k) ?? null, l.from === l.to ? tk.radiusXs : tk.radius)).join("");
  const under = lifelines ? `<svg class="${P}-lifes" width="${geo.w}" height="${geo.h}" viewBox="0 0 ${geo.w} ${geo.h}" focusable="false">${lifelines}</svg>` : "";
  const svg = `${under}<svg class="${P}-svg" width="${geo.w}" height="${geo.h}" viewBox="0 0 ${geo.w} ${geo.h}" focusable="false">${defs ? `<defs>${defs}</defs>` : ""}${bars}<g class="${P}-edges">${lines}</g>${more}</svg>`;
  // A label's place is not in the string: a style attribute in markup written as HTML is refused under a strict `style-src` (no 'unsafe-inline'), so
  // placeLabels sets it through the CSSOM once the ink is in the page.
  const labels = geo.labels.map((l) => `<span class="${P}-label" data-edge="${l.i}"${l.on ? ' data-on=""' : ""}${labelLines(l.text) > 1 ? ' data-lines="2"' : ""}><bdi>${l.text.split("\n").map(escapeHtml).join("<br>")}</bdi></span>`).join("");
  return svg + labels;
}

/**
 * Places the ink's labels (inkHtml writes them with no place): each one's box from the layout, set through the CSSOM, which a content policy allows where
 * it refuses a style attribute. Called after the ink is written, and after every measure, since a label can move while the ink's string stays the same.
 * The labels are paired with the layout's in order, and a label whose line is not the layout's is left alone.
 */
export function placeLabels(fig: Element, P: string, geo: Geo | null): void {
  const ink = fig.querySelector(`.${P}-ink`);
  if (!ink || !geo) return;
  const r2 = (n: number) => `${Math.round(n * 100) / 100}px`;
  const els = ink.querySelectorAll<HTMLElement>(`:scope > .${P}-label`);
  els.forEach((el, k) => {
    const l = geo.labels[k];
    if (!l || el.dataset.edge !== String(l.i)) return;
    const at: Array<[string, string]> = [["left", r2(l.box.l)], ["top", r2(l.box.t)], ["width", r2(l.box.r - l.box.l)]];
    for (const [name, value] of at) if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  });
}

// ---- Laying a figure out ----

export interface Measured { dyn: Dyn; geo: Geo | null; ink: string; tokens: Tokens | null; least?: number }

/**
 * Measures the figure and settles its layout (1.11): the drawn layout when the figure is at least 640 wide, every track holds its widest
 * word, every label seats and no line passes through a node; otherwise the stack. `apply` writes a state into the DOM (the same markup the
 * tree gives for it), so each try is measured as it would be drawn.
 */
export function measureFigure(fig: HTMLElement, m: Model, P: string, base: string, current: Dyn, apply: (dyn: Dyn) => void, warn?: (s: string, level?: "error") => void, sizeTo?: (least: number) => void): Measured {
  // Development only (the warnings): first, so a minifier sees it is a constant and drops what it guards.
  const dev = process.env.NODE_ENV !== "production";
  const drawing = fig.querySelector<HTMLElement>(`.${P}-drawing`);
  // A figure with no width (inside a closed disclosure or an unselected tab) is not laid out: its resize observer lays it out once it is shown.
  if (!drawing || fig.clientWidth === 0) return { dyn: current, geo: null, ink: "", tokens: null };
  const tk = readTokens(fig);
  const measure = ruler(drawing, P);
  const mins = minimums(m, tk, measure);
  // The viewer (DECISIONS 310, 9.3) sizes its figure from the least drawn width before it is measured: never under it, so the drawn layout is tried.
  sizeTo?.(mins.least);
  const W = fig.clientWidth;
  const focusedId = (() => { const a = document.activeElement as HTMLElement | null; return a && drawing.contains(a) && a.dataset.node ? a.dataset.node : undefined; })();
  const stopOf = (d: Dyn): Dyn => {
    if (!hasStops(m, d)) return { ...d, stop: d.stop ?? m.nodes[0]?.id, keep: focusedId && !(d.layout === "drawn") ? focusedId : undefined };
    return { ...d, stop: d.stop && m.byId.has(d.stop) ? d.stop : m.nodes[0]?.id, keep: undefined };
  };
  // A decision that is taller than it is wide at this width (call 1 of DECISIONS 306, section 4): the drawn layout is refused, as any fit failure is.
  let tall = false;
  const heightsFor = (d: Dyn): Dyn => {
    tall = false;
    if (m.type !== "flowchart" && !(m.type === "data-flow" && m.nodes.some((n) => n.shape === "decision"))) return d;
    apply({ ...d, heights: undefined, words: undefined });
    const heights = record<number>();
    const widened = record<number>();
    drawing.querySelectorAll<HTMLElement>(`.${P}-node[data-shape="decision"]`).forEach((el) => {
      const words = el.querySelector(`.${P}-words`);
      if (!words) return;
      const nr = el.getBoundingClientRect();
      // The diamond is the track's width, and as tall as it must be for the words' box (grown space-2-5 each side and space-2 above and below) to lie
      // inside it; never under space-16, nor under a fifth of its width (1.12).
      const heightFor = (wr: DOMRect) => {
        const box = { w: wr.width + 2 * tk.space("2-5"), h: wr.height + 2 * tk.space("2") };
        const denom = 1 - box.w / nr.width;
        const half = denom > 0.05 ? box.h / 2 / denom : box.h * 10;
        return Math.max(tk.space("16"), Math.ceil(nr.width / 5), Math.ceil(2 * half));
      };
      const first = words.getBoundingClientRect();
      let height = heightFor(first);
      // The ceiling (DECISIONS 301): a diamond is no taller than it is wide. Its words wrap at 62% of the track; where that makes it taller than wide, the
      // words' box widens, to the narrowest width that puts them on fewer lines, and again, until the diamond fits under the ceiling. Where no width does,
      // the 62% box stays and the diamond is as tall as it must be.
      if (height > nr.width) {
        const at = (x: number) => { el.style.setProperty("--_ww", `${x}px`); return words.getBoundingClientRect(); };
        const widest = Math.floor(el.clientWidth - 2 * tk.space("2-5"));
        let from = Math.ceil(first.width), tall = first.height;
        while (from < widest && at(widest).height < tall - 0.5) {
          // The narrowest whole width with fewer lines than `tall`: a wider box never wraps onto more lines.
          let lo = from, hi = widest;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (at(mid).height < tall - 0.5) hi = mid; else lo = mid; }
          const wr = at(hi), next = heightFor(wr);
          if (next <= nr.width) { height = next; widened[el.dataset.node!] = hi; break; }
          from = hi;
          tall = wr.height;
        }
        el.style.removeProperty("--_ww");
      }
      heights[el.dataset.node!] = height;
      // Taller than wide after every width its words can take (DECISIONS 306, section 4, call 1): a width the flowchart is not drawn at.
      if (height > nr.width) tall = true;
    });
    return { ...d, heights, words: Object.keys(widened).length ? widened : undefined };
  };
  const input = (): DrawnInput => ({ m, tk, P, drawing, origin: drawing.getBoundingClientRect(), warn });
  // A list a bare stack opened closes when the figure is laid out again (it opens again if the stack is still bare).
  const closed: Dyn = current.autoOpen ? { open: false, autoOpen: undefined } : {};
  const names = (geo: Geo, list: number[]) => list.map((k) => lineName(m, geo.lines.find((l) => l.i === k)!)).join(", ");
  // The text variant is one code block: no drawn layout and no lines; the art module chooses art or transcript by width (1.2).
  if (m.text) return { dyn: { ...current, layout: "stacked", bare: undefined }, geo: null, ink: "", tokens: tk, least: mins.least };
  // A type of its own that is not routed (DECISIONS 359) lays itself out: the engine gives it the figure, the state and the ruler.
  if (m.ext?.layout && !m.ext.routed) return m.ext.layout(m, { fig, drawing, P, tk, W, least: mins.least, apply, stopOf, current: { ...current, ...closed }, measure, warn });
  if (W >= mins.least && !m.unplaced) {
    const drawnTry = (pad: boolean) => {
      // One column (not a sequence's participants) is capped before it is measured (the one-column ruling): its least width is written with the layout.
      let dd = stopOf({ ...current, ...closed, layout: "drawn", grow: undefined, track: undefined, bare: undefined, pad: pad || undefined, rows: undefined, one: m.type !== "sequence" && columnCount(m) === 1 ? mins.own : undefined });
      dd = heightsFor(dd);
      apply(dd);
      let g = drawnGeometry(input(), measure);
      // A schema's far keys (1.1): their corridors are chosen on the grid without them, then the rows grow to hold them and the figure is measured again.
      if (g.corridors) {
        dd = { ...dd, rows: g.corridors.rows };
        apply(dd);
        g = drawnGeometry({ ...input(), pick: g.corridors.pick }, measure);
      }
      return { dd, g };
    };
    let { dd: d, g: geo } = drawnTry(false);
    // A label refused only because its seats leave the drawing (beside a line in a 40px first or last row) is given space-3 above and below.
    // A route the drawn layout refuses: through a node, off the drawing, or laid on another line.
    const refused = (g: Geo) => g.through.length > 0 || g.outside.length > 0 || (g.overlaps?.length ?? 0) > 0 || (g.misfit?.length ?? 0) > 0 || tall;
    if (!refused(geo) && geo.unseated.length && geo.unseated.every((k) => geo.bounded?.includes(k))) {
      const padded = drawnTry(true);
      if (!refused(padded.g) && !padded.g.unseated.length) ({ dd: d, g: geo } = padded);
    }
    const more = !refused(geo) && !geo.unseated.length ? m.ext?.inkMore?.(P, m, geo, tk, true, warn) : false;
    if (more !== false) {
      if (geo.crossings.length) dev && warn?.(`${geo.crossings.length} crossing${geo.crossings.length === 1 ? "" : "s"} in the drawn layout: ${geo.crossings.map((c) => `${lineName(m, geo.lines[c.top]!)} over ${lineName(m, geo.lines[c.under]!)}`).join("; ")}`);
      return { dyn: d, geo, ink: inkHtml(P, geo, tk, base, more), tokens: tk, least: mins.least };
    }
    // At a width the figure should fit by its tokens and words, a failure is the author's to fix.
    if (tall) dev && warn?.(`the drawn layout does not fit at ${Math.round(W)}px: a decision would be taller than it is wide`);
    if (geo.misfit?.length) dev && warn?.(`the drawn layout does not fit at ${Math.round(W)}px: ${geo.misfit.join("; ")}`);
    if (geo.through.length) dev && warn?.(`the drawn layout does not fit at ${Math.round(W)}px: ${names(geo, geo.through)} would pass through a node`);
    if (geo.overlaps?.length) dev && warn?.(`the drawn layout does not fit at ${Math.round(W)}px: ${names(geo, geo.overlaps)} would lie on one another`);
    if (geo.outside.length) dev && warn?.(`the drawn layout does not fit at ${Math.round(W)}px: ${names(geo, geo.outside)} would leave the drawing`);
    if (geo.unseated.length) dev && warn?.(`the drawn layout does not fit at ${Math.round(W)}px: no clean seat for ${geo.unseated.map((k) => (m.type === "sequence" ? `message ${k}` : `"${said(m.edges[k]?.label ?? "")}"`)).join(", ")}`);
  }
  let d = stopOf({ ...current, ...closed, layout: "stacked", heights: undefined, grow: record(), track: m.type === "schema" ? mins.table : undefined, bare: undefined, pad: undefined, rows: undefined, one: undefined });
  d = heightsFor(d);
  apply(d);
  if (m.type === "sequence" || m.type === "schema" || m.ext?.stackBare) return { dyn: d, geo: null, ink: "", tokens: tk, least: mins.least };
  const plan = stackPlan(m);
  let out = stackedGeometry(input(), measure, plan, d.grow);
  for (let tries = 0; tries < 6 && Object.keys(out.grow).length; tries++) {
    const grown = record(d.grow);
    for (const [id, n] of Object.entries(out.grow)) grown[id] = (own(grown, id) ?? 0) + n;
    d = { ...d, grow: grown };
    apply(d);
    out = stackedGeometry(input(), measure, plan, grown);
  }
  const geo = out.geo;
  // The stack is the last layout there is. If it still holds an overlap (a label with no clean seat after every try, a line through a node or
  // off the drawing, or a third end lane), no drawing is returned that is known to overlap: the cards stay, in order, with no lines and no
  // labels, as the stacked schema's do, and the list holds every connection.
  if (dev && !plan.third && plan.laneCount > 2) warn?.(`the stacked drawing uses ${plan.laneCount} end lanes (four at most)`);
  const failed = geo.unseated.length > 0 || geo.through.length > 0 || geo.outside.length > 0 || plan.third;
  if (failed) {
    if (geo.unseated.length) dev && warn?.(`the stacked drawing has no clean seat for ${[...new Set(geo.unseated)].map((k) => `"${said(m.edges[k]?.label ?? "")}"`).join(", ")}, so its lines are not drawn; the list holds every connection`);
    if (geo.through.length) dev && warn?.(`in the stacked drawing ${names(geo, geo.through)} would pass through a node, so its lines are not drawn`);
    if (geo.outside.length) dev && warn?.(`in the stacked drawing ${names(geo, geo.outside)} would leave the drawing, so its lines are not drawn`);
    if (dev && plan.third) warn?.("the stacked drawing would need a fifth end lane, so its lines are not drawn", "error");
    // Dressed as where scripting is off (1.13): no line in the key, no key hint, no stops, and the list open when the figure becomes bare.
    const bare: Geo = { ...geo, lines: [], labels: [], crossings: [] };
    // With no lines, every group's label is on its start seat.
    drawing.querySelectorAll<HTMLElement>(`.${P}-group > .${P}-glabel`).forEach((el) => el.style.removeProperty("--_gx"));
    const dyn = stopOf({ ...d, grow: record(), bare: true, open: current.bare ? current.open : true, autoOpen: current.bare ? current.autoOpen : current.open ? undefined : true });
    // Written as it is returned: the tries above wrote a state that is not bare, and a host that sees the same state as before renders nothing, so the
    // figure would keep their markup (a stack with no lines, not dressed bare, its list closed: P-R3 of the code re-check).
    apply(dyn);
    return { dyn, geo: bare, ink: "", tokens: tk, least: mins.least };
  }
  if (geo.seatless?.length) dev && warn?.(`a stacked group's label has no clear seat on its top edge: ${geo.seatless.map((t) => `"${t}"`).join(", ")}`);
  if (geo.crossings.length) dev && warn?.(`${geo.crossings.length} crossing${geo.crossings.length === 1 ? "" : "s"} in the stacked drawing (each is cut): ${geo.crossings.map((c) => `${lineName(m, geo.lines[c.top]!)} over ${lineName(m, geo.lines[c.under]!)}`).join("; ")}`);
  return { dyn: d, geo, ink: inkHtml(P, geo, tk, base, m.ext?.inkMore?.(P, m, geo, tk, false) || ""), tokens: tk, least: mins.least };
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
  // A mark in the ink that belongs to one part (a timeline's stem and dot, DECISIONS 359) lifts with it; nothing else dims.
  fig.querySelectorAll<SVGElement>(`.${P}-ink [data-for]`).forEach((el) => el.toggleAttribute("data-lit", Boolean(id) && el.getAttribute("data-for") === id));
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
  // sink: masksMarkup's mask defs, built from measured numbers and Basalt's own ids; nothing from the spec reaches it; test/repo-review.test.mjs (a diagram's hostile labels)
  if (defsEl) defsEl.innerHTML = defs;
  geo.lines.forEach((l, k) => {
    const path = groupEls.get(String(l.i))?.querySelector(`.${P}-line`);
    if (!path) return;
    const mask = ids.get(k);
    if (mask) path.setAttribute("mask", `url(#${mask})`); else path.removeAttribute("mask");
  });
}

// ============================================================================================================================================
// The entrance's first frame (DECISIONS 292, 1.5): the part of motion the still code holds, so nothing drawn is ever taken away
// ============================================================================================================================================

/** Whether an entrance may not play now: reduced motion, forced colours, print or the page's hold. */
export const entranceBlocked = (): boolean => matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active), print").matches || document.documentElement.getAttribute("data-loops") === "held";

/**
 * Called by both engines each time an animated figure's lines are drawn. In the frame the lines are first drawn the figure is marked pending (its lines
 * not shown, a sequence's labels in their quieter ink), unless an entrance may not play, when it is at rest for good. A layout with no lines is not
 * pending. A running or settled entrance is the motion module's and is left alone: measuring again never replays, hides or cuts one short.
 */
export function entranceDrawn(fig: HTMLElement, lines: boolean): void {
  const state = fig.getAttribute("data-entrance");
  if (state === "running" || state === "done") return;
  if (!lines) { if (state) fig.removeAttribute("data-entrance"); return; }
  if (!state) fig.setAttribute("data-entrance", entranceBlocked() || seenBefore(fig) ? "done" : "pending");
}
/** The first visit's mark (DECISIONS 306, 1.5): where a figure's entrance has played on this page before. */
export const visitKey = (fig: HTMLElement) => `basalt-diagram-entrance:${location.pathname}#${fig.id}`;
function seenBefore(fig: HTMLElement): boolean {
  if (!fig.hasAttribute("data-first-visit") || !fig.id) return false;
  // Storage that throws: it plays again.
  try { return localStorage.getItem(visitKey(fig)) !== null; } catch { return false; }
}

/** Settles a pending or running entrance at once (a node hovered or focused, a key, a control used): every line whole, and the module told. */
export function settleEntrance(fig: HTMLElement): void {
  const state = fig.getAttribute("data-entrance");
  if (state !== "pending" && state !== "running") return;
  fig.setAttribute("data-entrance", "done");
  fig.dispatchEvent(new Event("basalt-diagram-settle"));
}

/** The node a key moves to (1.14): → ↓ the next, ← ↑ the one before, in the author's order, stopping at the ends; Home and End the ends. */
export function keyTarget(m: Model, from: string, key: string, drawn = false, rtl = false): string | null {
  if (m.ext?.keyTarget) return m.ext.keyTarget(m, from, key, drawn, rtl);
  // Drawn, the arrows are spatial and physical: in a right-to-left figure column 1 is at the right (1.5).
  const table = drawn ? spatialTable(m) : null;
  if (table && key.startsWith("Arrow")) {
    const way = ({ ArrowRight: rtl ? "left" : "right", ArrowLeft: rtl ? "right" : "left", ArrowDown: "down", ArrowUp: "up" } as Record<string, Way>)[key];
    return way ? table[from]?.[way] ?? null : null;
  }
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
 *
 * The root is the caller's element as much as the engine's: on it only the state's own attributes (the layout, whether it is measured, and the
 * custom properties the state sets) are written, so a caller's `hidden`, ARIA, id, class and style stay. Inside it every element is the engine's.
 * A tree element is paired with the next DOM element of its tag and class, so an element the tree does not hold (the HTML skill's JSON
 * script, first in the figure) is passed over, never mistaken for the heading.
 */
const MANAGED = ["data-layout", "data-measured", "role", "aria-roledescription", "aria-labelledby", "aria-describedby", "aria-label", "tabindex", "data-stops", "hidden", "data-art"];
// The figure's grid attributes follow the model too: an automatic figure's direction can change its columns after script (Neon's B8 of the code review).
const ROOT_MANAGED = ["data-layout", "data-measured", "data-bare", "data-form", "data-contour", "data-motion", "data-first-visit", "data-rtl", "data-cols", "data-reach", "data-gutter", "data-marks"];
// A type of its own (DECISIONS 359) writes its measured places as these: a timeline's card (--_tx, --_ty), its drawing's height (--_th), a gantt's or a
// matrix's measured columns (--_name, --_track).
const MANAGED_STYLE = ["--_lo", "--_track", "--_h", "--_ww", "--_gap", "--_ggrow", "--_tl", "--_gpad", "--_gw", "--_mh", "--_rows", "--_row-gap", "--_one", "--_tx", "--_ty", "--_th", "--_tw", "--_tdw", "--_name", "--_lab"];
const absent = (value: VAttrs[string]) => value === undefined || value === null || value === false;
function pairs(el: Element, v: VElement): boolean {
  if (el.tagName.toLowerCase() !== v.t) return false;
  const cls = typeof v.a.class === "string" ? v.a.class.split(" ")[0] : "";
  return !cls || el.classList.contains(cls);
}
export function syncAttributes(el: Element, v: VNode, root = true): void {
  if (typeof v === "string" || "slot" in v) return;
  const managed = root ? ROOT_MANAGED : MANAGED;
  for (const name of managed) if (absent(v.a[name])) el.removeAttribute(name);
  for (const [k, value] of Object.entries(v.a)) {
    if (k === "class") continue;
    if (k === "style") {
      const style = (el as HTMLElement).style;
      const decls = new Map(String(value ?? "").split(";").map((d) => { const at = d.indexOf(":"); return [d.slice(0, at).trim(), d.slice(at + 1).trim()] as const; }).filter(([n]) => n));
      for (const [n, val] of decls) if (style.getPropertyValue(n).trim() !== val) style.setProperty(n, val);
      for (const n of MANAGED_STYLE) if (!decls.has(n)) style.removeProperty(n);
      continue;
    }
    if (root && !ROOT_MANAGED.includes(k)) continue;
    if (absent(value)) { el.removeAttribute(k); continue; }
    const s = value === true ? "" : String(value);
    if (el.getAttribute(k) !== s) el.setAttribute(k, s);
  }
  // The ink and the ruler are written apart from the tree, except a text sequence's transcript (its `-text-ink`): that is the tree's own, and its lines'
  // indents are styles, which a content policy refuses in markup written as HTML (the page's or a script's), so they are set here through the CSSOM.
  if (v.t === "svg" || (typeof v.a.class === "string" && (/-ruler$/.test(v.a.class) || (/-ink$/.test(v.a.class) && !v.a.class.endsWith("-text-ink"))))) return;
  if (v.c.some((c) => typeof c !== "string" && "slot" in c)) return;
  const els = [...el.children];
  let at = 0;
  for (const c of v.c) {
    if (typeof c === "string" || "slot" in c) continue;
    for (let j = at; j < els.length; j++) if (pairs(els[j]!, c)) { syncAttributes(els[j]!, c, false); at = j + 1; break; }
  }
}

/** Moves the roving stop from one node to another with no walk of the tree: the only attributes a stop changes are the two nodes' tab indexes. */
export function moveStop(fig: Element, P: string, from: string | undefined, to: string): void {
  if (from === to) return;
  const node = (id: string) => fig.querySelector(`.${P}-node[data-node="${CSS.escape(id)}"]`);
  if (from) node(from)?.setAttribute("tabindex", "-1");
  node(to)?.setAttribute("tabindex", "0");
}
