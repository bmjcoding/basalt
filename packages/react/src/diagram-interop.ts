// @srasyndicate/basalt/diagram-interop (DECISIONS 311, 314, 324, 327)
// Deterministic, zero-dependency exporters from Basalt's diagram model (or a live figure's measured Geo)
// to draw.io (.drawio), Microsoft Visio (.vsdx), and Lucid Standard Import (.lucid and JSON).
// Lives on a separate subpath outside the package index so still diagrams pay zero bytes for it.
import type { DiagramPlacement, DiagramSpec, Geo } from "./diagram-core";
import { sceneToDrawio } from "./interop/drawio";
import { sceneToLucid, sceneToLucidJson } from "./interop/lucid";
import { bundledMarkAttribution, isBundledMarkEmbeddable, layoutHeadless, readMeasuredExtras, sceneFromMeasured } from "./interop/scene";
import { sceneToVsdx } from "./interop/vsdx";
import type {
  DiagramCardinality,
  InteropFormat,
  InteropMarkResolver,
  InteropMarksMode,
  InteropOptions,
  InteropScene,
  InteropTheme,
  LucidBoundingBox,
  LucidColorFill,
  LucidCustomData,
  LucidDocument,
  LucidEndpoint,
  LucidEndpointStyle,
  LucidFieldSize,
  LucidImageFill,
  LucidLine,
  LucidLineText,
  LucidPage,
  LucidShape,
  LucidShapeStyle,
  LucidStroke,
  LucidSwimLane,
  LucidTableCell,
  MeasuredBand,
  MeasuredExtras,
  MeasuredFrame,
  MeasuredFrameDivider,
  MeasuredGroup,
  MeasuredInteropOptions,
  MeasuredLane,
  SceneBand,
  SceneBar,
  SceneBox,
  SceneEdge,
  SceneFrame,
  SceneFrameDivider,
  SceneGroup,
  SceneLabel,
  SceneLane,
  SceneLifeline,
  SceneMark,
  SceneNode,
  ScenePort,
  SceneTableRow,
} from "./interop/types";

/**
 * Places a `layout: "auto"` diagram through `@srasyndicate/basalt/diagram-layout` (elkjs, loaded on demand)
 * and returns a shallow copy of `spec` with `placement` populated. Non-auto or already-placed specs are returned as-is.
 */
export async function placeAutoDiagram(spec: DiagramSpec): Promise<DiagramSpec> {
  if (spec.layout !== "auto" || spec.placement) return spec;
  if (spec.type !== "architecture" && spec.type !== "flowchart" && spec.type !== "schema") return spec;
  const { placeDiagram } = await import("./diagram-layout");
  const order: Array<"right" | "down"> = spec.direction
    ? [spec.direction]
    : spec.type === "flowchart"
      ? ["down", "right"]
      : ["right", "down"];
  const input = {
    type: spec.type,
    nodes: spec.nodes as Array<{ id: string; group?: string }> | undefined,
    tables: spec.tables,
    edges: spec.edges,
    groups: spec.groups,
  };
  const placements: DiagramPlacement[] = [];
  for (const dir of order) placements.push(await placeDiagram(input, dir));
  return { ...spec, placement: placements };
}

/** Exports a Basalt diagram spec directly to uncompressed `.drawio` XML (valid against mxfile-1.0.xsd). */
export function diagramToDrawio(spec: DiagramSpec, options: InteropOptions = {}): string {
  const scene = layoutHeadless(spec, options);
  return sceneToDrawio(scene, options.theme ?? "light");
}

/** Exports a Basalt diagram spec directly to a deterministic Microsoft Visio `.vsdx` OPC archive. */
export function diagramToVsdx(spec: DiagramSpec, options: InteropOptions = {}): Uint8Array {
  const scene = layoutHeadless(spec, options);
  return sceneToVsdx(scene, options.theme ?? "light");
}

/**
 * Exports a Basalt diagram spec to a deterministic Lucid Standard Import `.lucid` ZIP archive for Lucid's REST API
 * (`POST https://api.lucid.co/v1/documents` with a token, type `x-application/vnd.lucid.standardImport`).
 * To import through Lucid's own screen, use `.vsdx` (`diagramToVsdx`).
 */
export function diagramToLucid(spec: DiagramSpec, options: InteropOptions = {}): Uint8Array {
  const scene = layoutHeadless(spec, options);
  return sceneToLucid(scene, options.theme ?? "light");
}

/**
 * Exports a Basalt diagram spec to the plain JSON form of Lucid Standard Import (`document.json`, for Lucid's REST API;
 * to import through Lucid's own screen, use `.vsdx`).
 */
export function diagramToLucidJson(spec: DiagramSpec, options: InteropOptions = {}): LucidDocument {
  const scene = layoutHeadless(spec, options);
  return sceneToLucidJson(scene, options.theme ?? "light");
}

/**
 * Exports a live figure's measured `Geo` (from diagram-core's `measureFigure`) to `.drawio`, `.vsdx`, `.lucid`
 * (Lucid REST API only: `POST https://api.lucid.co/v1/documents` with a token, type `x-application/vnd.lucid.standardImport`;
 * to import through Lucid's own screen, use `.vsdx`), or Lucid JSON.
 */
export function exportMeasuredDiagram(spec: DiagramSpec, geo: Geo, format: "drawio", options?: MeasuredInteropOptions): string;
export function exportMeasuredDiagram(spec: DiagramSpec, geo: Geo, format: "vsdx" | "lucid", options?: MeasuredInteropOptions): Uint8Array;
export function exportMeasuredDiagram(spec: DiagramSpec, geo: Geo, format: "lucid-json", options?: MeasuredInteropOptions): LucidDocument;
export function exportMeasuredDiagram(spec: DiagramSpec, geo: Geo, format: InteropFormat, options?: MeasuredInteropOptions): string | Uint8Array | LucidDocument;
export function exportMeasuredDiagram(spec: DiagramSpec, geo: Geo, format: InteropFormat, options: MeasuredInteropOptions = {}): string | Uint8Array | LucidDocument {
  const scene = sceneFromMeasured(spec, geo, options.extras, options);
  const theme = options.theme ?? "light";
  if (format === "drawio") return sceneToDrawio(scene, theme);
  if (format === "vsdx") return sceneToVsdx(scene, theme);
  if (format === "lucid") return sceneToLucid(scene, theme);
  if (format === "lucid-json") return sceneToLucidJson(scene, theme);
  throw new Error(`diagram-interop: unknown format "${String(format)}" (expected drawio, vsdx, lucid or lucid-json)`);
}

export { bundledMarkAttribution, isBundledMarkEmbeddable, layoutHeadless as measureDiagramHeadless, readMeasuredExtras };

export type {
  DiagramCardinality,
  DiagramPlacement,
  DiagramSpec,
  Geo,
  InteropFormat,
  InteropMarkResolver,
  InteropMarksMode,
  InteropOptions,
  InteropScene,
  InteropTheme,
  LucidBoundingBox,
  LucidColorFill,
  LucidCustomData,
  LucidDocument,
  LucidEndpoint,
  LucidEndpointStyle,
  LucidFieldSize,
  LucidImageFill,
  LucidLine,
  LucidLineText,
  LucidPage,
  LucidShape,
  LucidShapeStyle,
  LucidStroke,
  LucidSwimLane,
  LucidTableCell,
  MeasuredBand,
  MeasuredExtras,
  MeasuredFrame,
  MeasuredFrameDivider,
  MeasuredGroup,
  MeasuredInteropOptions,
  MeasuredLane,
  SceneBand,
  SceneBar,
  SceneBox,
  SceneEdge,
  SceneFrame,
  SceneFrameDivider,
  SceneGroup,
  SceneLabel,
  SceneLane,
  SceneLifeline,
  SceneMark,
  SceneNode,
  ScenePort,
  SceneTableRow,
};
