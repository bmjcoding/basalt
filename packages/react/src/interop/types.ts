// Public and scene types for @srasyndicate/basalt/diagram-interop (DECISIONS 311, 314).
// Pure structural declarations: no third-party or Node types appear anywhere in this surface.
import type { DiagramLineKind, DiagramSide, DiagramSpec, DiagramType, Geo, MColumn, Pt, Rect } from "../diagram-core";

export type InteropFormat = "drawio" | "vsdx" | "lucid" | "lucid-json";
export type InteropTheme = "light" | "dark" | "adaptive";
export type InteropMarksMode = "omit" | "embed";

/** Resolves a bundled mark id to its SVG markup or `data:image/svg+xml,...` URI for the given ground theme. */
export type InteropMarkResolver = (id: string, theme: "light" | "dark") => string | undefined;

export interface InteropOptions {
  /** Colour theme for the exported file. Default `"light"` (universal across tools); `"adaptive"` emits dual light/dark for draw.io. */
  theme?: InteropTheme;
  /** Whether to embed service marks whose manifest terms allow diagram use. Default `"omit"`. */
  marks?: InteropMarksMode;
  /** Supplies SVG data for bundled mark ids when `marks` is `"embed"`. */
  resolveMark?: InteropMarkResolver;
  /** Target drawing width in CSS pixels for headless layout (default 1104; widens automatically when the figure's minimum width exceeds it). */
  width?: number;
  /** Canvas padding around the drawing box in pixels (default 32). */
  pad?: number;
  /** Deterministic diagram identifier written to the exported page/diagram element. */
  diagramId?: string;
}

export interface MeasuredGroup {
  id: string;
  label: string;
  rect: Rect;
}

export interface MeasuredLane {
  id: string;
  /** 0-based lane index matching the DOM order of `.diagram-lane` elements. */
  index?: number;
  label: string;
  rect: Rect;
}

export interface MeasuredBand {
  text: string;
  rect: Rect;
}

/** Optional DOM measurements that accompany `Geo` when exporting a live rendered figure. */
export interface MeasuredExtras {
  groups?: MeasuredGroup[];
  lanes?: MeasuredLane[];
  bands?: MeasuredBand[];
  /** Vertical midpoints of each table's column rows in drawing coordinates, keyed by table name. */
  tableRows?: Record<string, number[]>;
}

export interface MeasuredInteropOptions extends InteropOptions {
  extras?: MeasuredExtras;
}

export interface SceneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScenePort {
  /** Normalized horizontal position along the shape box, in `[0, 1]`. */
  x: number;
  /** Normalized vertical position along the shape box, in `[0, 1]`. */
  y: number;
  side: DiagramSide;
}

export interface SceneMark {
  id: string;
  /** Raw SVG markup (or decoded from data URI) for light ground. */
  svgLight: string;
  /** Raw SVG markup for dark ground. */
  svgDark: string;
  /** Licence/trademark attribution from marks/manifest.json, when the mark carries one. */
  attribution?: string;
}

export interface SceneTableRow {
  index: number;
  name: string;
  key?: "PK" | "FK";
  type?: string;
  refTable?: string;
  /** Row top relative to the table's top edge, in pixels. */
  y: number;
  /** Row height in pixels. */
  h: number;
  /** Row vertical center in drawing coordinates. */
  midY: number;
}

export interface SceneNode {
  id: string;
  name: string;
  kind?: string;
  detail?: string;
  detailMono: boolean;
  focal: boolean;
  col: number;
  row: number;
  row2: number;
  shape: "box" | "terminal" | "decision" | "table" | "participant";
  group?: string;
  laneId?: string;
  laneIndex?: number;
  step?: number;
  columns?: MColumn[];
  rows?: SceneTableRow[];
  headerH?: number;
  more?: number;
  short?: string;
  box: SceneBox;
  mark?: SceneMark;
}

export interface SceneGroup {
  id: string;
  label: string;
  box: SceneBox;
  members: string[];
}

export interface SceneLane {
  id: string;
  label: string;
  box: SceneBox;
  labelWidth: number;
}

export interface SceneLifeline {
  id: string;
  participantId: string;
  x: number;
  y1: number;
  y2: number;
}

export interface SceneBand {
  text: string;
  y: number;
  h: number;
  w: number;
}

export interface SceneLabel {
  text: string;
  note?: string;
  box: SceneBox;
  on: boolean;
  /** Fractional arc-length position along the edge polyline in `[0, 1]`. */
  t: number;
}

export interface SceneEdge {
  index: number;
  from: string;
  to: string;
  /** When true, `from` and `to` name lifeline participant ids rather than node boxes. */
  sequence?: boolean;
  /** For schema foreign keys: source and target column row indices. */
  fromRow?: number;
  toRow?: number;
  fk: boolean;
  kind: DiagramLineKind;
  openTip: boolean;
  fromPort: ScenePort;
  toPort: ScenePort;
  /** Orthogonal polyline in drawing coordinates, already snapped to exact port coordinates. */
  pts: Pt[];
  label?: SceneLabel;
  /** Sequence message number, when `sequence` is true. */
  messageNumber?: number;
  /** Sequence self-call direction (`"start"` = left, `"end"` = right). */
  selfSide?: "start" | "end";
}

export interface InteropScene {
  type: DiagramType;
  id: string;
  title: string;
  width: number;
  height: number;
  pad: number;
  nodes: SceneNode[];
  groups: SceneGroup[];
  lanes: SceneLane[];
  lifelines: SceneLifeline[];
  bands: SceneBand[];
  edges: SceneEdge[];
}

// ---- Lucid Standard Import JSON contract (https://developer.lucid.co/docs/standard-import) ----

export interface LucidColorFill {
  type: "color";
  color: string;
}

export interface LucidImageFill {
  type: "image";
  ref: string;
  imageScale: "fit" | "fill" | "stretch" | "original" | "tile";
}

export interface LucidStroke {
  color: string;
  width: number;
  style?: "solid" | "dashed" | "dotted";
}

export interface LucidBoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LucidShapeStyle {
  fill?: LucidColorFill | LucidImageFill;
  stroke?: LucidStroke;
  rounding?: number;
  textColor?: string;
}

export interface LucidCustomData {
  key: string;
  value: string;
}

export interface LucidSwimLane {
  title: string;
  width: number;
  headerFill: string;
  laneFill: string;
}

export interface LucidTableCell {
  xPosition: number;
  yPosition: number;
  mergeCellsRight?: number;
  mergeCellsDown?: number;
  style?: { fill: LucidColorFill };
  text?: string;
}

export interface LucidFieldSize {
  index: number;
  size: number;
}

export interface LucidShape {
  id: string;
  type: string;
  boundingBox: LucidBoundingBox;
  style?: LucidShapeStyle;
  text?: string;
  magnetize?: boolean;
  assistedLayout?: boolean;
  containerTitle?: { text: string };
  vertical?: boolean;
  titleBar?: { height: number; verticalText: boolean };
  lanes?: LucidSwimLane[];
  rowCount?: number;
  colCount?: number;
  cells?: LucidTableCell[];
  userSpecifiedRows?: LucidFieldSize[];
  userSpecifiedCols?: LucidFieldSize[];
  verticalBorder?: boolean;
  horizontalBorder?: boolean;
  customData?: LucidCustomData[];
  zIndex?: number;
}

export type LucidEndpointStyle = "none" | "arrow" | "openArrow" | "closedCircle";

export type LucidEndpoint =
  | { type: "shapeEndpoint"; style: LucidEndpointStyle; shapeId: string; position: { x: number; y: number } }
  | { type: "lineEndpoint"; style: LucidEndpointStyle; lineId: string; position: number }
  | { type: "positionEndpoint"; style: LucidEndpointStyle; position: { x: number; y: number } };

export interface LucidLineText {
  text: string;
  position: number;
  side: "middle" | "top" | "bottom";
}

export interface LucidLine {
  id: string;
  lineType: "straight" | "elbow" | "curved";
  endpoint1: LucidEndpoint;
  endpoint2: LucidEndpoint;
  stroke: LucidStroke;
  elbowControlPoints?: Array<{ x: number; y: number }>;
  text?: LucidLineText[];
  zIndex?: number;
}

export interface LucidPage {
  id: string;
  title: string;
  settings: {
    fillColor: string;
    infiniteCanvas: boolean;
    autoTiling: boolean;
    size: { type: "custom"; w: number; h: number };
  };
  shapes: LucidShape[];
  lines: LucidLine[];
}

export interface LucidDocument {
  version: 1;
  documentSettings: { units: "px" };
  pages: LucidPage[];
}

export type { DiagramSpec, Geo };
