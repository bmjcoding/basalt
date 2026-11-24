// Shared scene builder for @srasyndicate/basalt/diagram-interop (DECISIONS 311, 314).
// Reads Basalt's model and derived ports through diagram-core's existing exports without editing diagram-core.ts.
// Produces one normalized InteropScene either headlessly (pure JS + Geist metrics) or from a live figure's Geo.
// Every connector route is snapped to exact port coordinates so first and last segments are strictly axis-aligned.
import { buildModel, columnCount, derivedPorts, groupReach } from "../diagram-core";
import type { DiagramSide, DiagramSpec, GLine, GNode, Geo, MNode, Model, Pt, Rect } from "../diagram-core";
import type {
  InteropMarkResolver,
  InteropOptions,
  InteropScene,
  MeasuredBand,
  MeasuredExtras,
  MeasuredGroup,
  MeasuredLane,
  SceneBand,
  SceneBox,
  SceneEdge,
  SceneGroup,
  SceneLabel,
  SceneLane,
  SceneLifeline,
  SceneMark,
  SceneNode,
  ScenePort,
  SceneTableRow,
} from "./types";

// ---- Resolved Basalt theme palette (sRGB hex, matching packages/tokens/tokens/theme.{light,dark}.tokens.json) ----

export interface ThemePalette {
  page: string;
  cardFill: string;
  cardBorder: string;
  divider: string;
  focalFill: string;
  focalBorder: string;
  focalInk: string;
  focalQuiet: string;
  focalRule: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  edgeMain: string;
  edgePlain: string;
  structure: string;
}

export function paletteFor(theme: "light" | "dark"): ThemePalette {
  if (theme === "dark") {
    return {
      page: "#000000",
      cardFill: "#0a0a0a",
      cardBorder: "#1f1f1f",
      divider: "#1f1f1f",
      focalFill: "#ededed",
      focalBorder: "#ededed",
      focalInk: "#000000",
      focalQuiet: "#595959",
      focalRule: "#d9d9d9",
      textPrimary: "#f4f4f4",
      textSecondary: "#bababa",
      textTertiary: "#979797",
      edgeMain: "#f4f4f4",
      edgePlain: "#bababa",
      structure: "#616161",
    };
  }
  return {
    page: "#fafafa",
    cardFill: "#ffffff",
    cardBorder: "#e6e6e6",
    divider: "#e6e6e6",
    focalFill: "#171717",
    focalBorder: "#171717",
    focalInk: "#ffffff",
    focalQuiet: "#b3b3b3",
    focalRule: "#262626",
    textPrimary: "#171717",
    textSecondary: "#4d4d4d",
    textTertiary: "#6b6b6b",
    edgeMain: "#171717",
    edgePlain: "#4d4d4d",
    structure: "#8a8a8a",
  };
}

// ---- Mark terms allowlist (derived from packages/react/marks/manifest.json at build time) ----
// Build-time constants injected by packages/react/build.mjs from manifest.json's `unofficial` and `terms.quotes`
// fields; parsed lazily on first call so loading the module allocates nothing at top level.

declare const __BASALT_EMBEDDABLE_MARKS__: string | undefined;
declare const __BASALT_MARK_ATTRIBUTIONS__: string | undefined;

let embeddableMarksCache: Set<string> | undefined;
let markAttributionsCache: Record<string, string> | undefined;

function getEmbeddableMarks(): Set<string> | null {
  if (embeddableMarksCache) return embeddableMarksCache;
  if (typeof __BASALT_EMBEDDABLE_MARKS__ !== "string") return null;
  embeddableMarksCache = new Set(JSON.parse(__BASALT_EMBEDDABLE_MARKS__) as string[]);
  return embeddableMarksCache;
}

function getMarkAttributions(): Record<string, string> {
  if (markAttributionsCache) return markAttributionsCache;
  markAttributionsCache = typeof __BASALT_MARK_ATTRIBUTIONS__ === "string"
    ? (JSON.parse(__BASALT_MARK_ATTRIBUTIONS__) as Record<string, string>)
    : {};
  return markAttributionsCache;
}

/** Whether a bundled Basalt mark id is permitted for embedding in exported diagrams by marks/manifest.json terms. */
export function isBundledMarkEmbeddable(id: string): boolean {
  if (!id) return false;
  const set = getEmbeddableMarks();
  return set ? set.has(id) : false;
}

/** Returns the manifest licence/trademark attribution string for an embeddable bundled mark, if any. */
export function bundledMarkAttribution(id: string): string | undefined {
  if (!id) return undefined;
  const attrs = getMarkAttributions();
  return Object.prototype.hasOwnProperty.call(attrs, id) ? attrs[id] : undefined;
}

/** Extracts raw `<svg ...>...</svg>` markup from either raw SVG text or a `data:image/svg+xml,...` URI. */
export function decodeSvgMarkup(input: string): string | undefined {
  const s = input.trim();
  if (!s) return undefined;
  if (s.startsWith("<svg")) return s;
  if (s.startsWith("data:image/svg+xml;base64,")) {
    const b64 = s.slice("data:image/svg+xml;base64,".length);
    if (typeof atob === "function") return atob(b64);
    return undefined;
  }
  if (s.startsWith("data:image/svg+xml,")) {
    try { return decodeURIComponent(s.slice("data:image/svg+xml,".length)); } catch { return undefined; }
  }
  return undefined;
}

/** Encodes raw SVG markup as a compact percent-encoded `data:image/svg+xml,...` URI. */
export function encodeSvgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function resolveNodeMark(n: MNode, mode: "omit" | "embed", resolver?: InteropMarkResolver): SceneMark | undefined {
  if (mode !== "embed" || !n.mark) return undefined;
  if (n.mark.id) {
    if (!isBundledMarkEmbeddable(n.mark.id) || !resolver) return undefined;
    const rawLight = resolver(n.mark.id, "light");
    const rawDark = resolver(n.mark.id, "dark") ?? rawLight;
    const svgLight = rawLight ? decodeSvgMarkup(rawLight) : undefined;
    const svgDark = rawDark ? decodeSvgMarkup(rawDark) : svgLight;
    if (!svgLight || !svgDark) return undefined;
    return { id: n.mark.id, svgLight, svgDark, attribution: bundledMarkAttribution(n.mark.id) };
  }
  if (n.mark.onLight) {
    const rawLight = decodeSvgMarkup(n.mark.onLight) ?? (resolver ? resolver(n.mark.onLight, "light") : undefined);
    const svgLight = rawLight ? decodeSvgMarkup(rawLight) : undefined;
    const darkSrc = n.mark.onDark ?? n.mark.onLight;
    const rawDark = decodeSvgMarkup(darkSrc) ?? (resolver ? resolver(darkSrc, "dark") : undefined);
    const svgDark = rawDark ? decodeSvgMarkup(rawDark) : svgLight;
    if (!svgLight || !svgDark) return undefined;
    return { id: `custom-${n.id}`, svgLight, svgDark };
  }
  return undefined;
}

// ---- Exact Geist Sans / Geist Mono metrics (measured from bundled variable WOFF2 faces) ----
// ASCII 32..126 advance widths in hundredths of em for Geist 400; 500 scales ~1.028x and 600 ~1.052x.
// Geist Mono is strictly 0.60em per glyph across all weights and symbols.

const GEIST_400_EM = [
  25, 21, 35, 48, 63, 80, 62, 18, 27, 27, 43, 56, 20, 42, 20, 39,
  67, 35, 62, 61, 62, 63, 59, 54, 60, 59, 30, 30, 54, 54, 54, 56,
  91, 67, 67, 70, 71, 59, 57, 70, 70, 25, 57, 62, 55, 86, 73, 74,
  63, 73, 67, 64, 56, 69, 66, 94, 61, 59, 54, 35, 36, 35, 43, 56,
  25, 55, 59, 54, 59, 55, 32, 59, 58, 23, 25, 55, 26, 86, 56, 56,
  59, 59, 34, 51, 33, 58, 54, 82, 55, 54, 52, 39, 26, 39, 52,
];

type FontRole = "name" | "name-500" | "mono" | "sans" | "table" | "label" | "lane";

function measureText(text: string, role: FontRole): number {
  if (!text) return 0;
  if (role === "mono" || role === "label") return text.length * 7.2;
  if (role === "table") return text.length * 8.4;
  const size = role === "name" || role === "name-500" ? 14 : 12;
  const weightScale = role === "name" ? 1.052 : role === "name-500" || role === "lane" ? 1.028 : 1;
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      sum += GEIST_400_EM[code - 32]! / 100;
    } else if (code === 0x00b7 || code === 0x2018 || code === 0x2019) {
      sum += 0.23; // · ‘ ’
    } else if (code === 0x2192 || code === 0x2190) {
      sum += 0.8; // → ←
    } else if (code === 0x2014) {
      sum += 0.91; // —
    } else if (code === 0x2013 || code === 0x00d7) {
      sum += 0.56; // – ×
    } else if (code === 0x201c || code === 0x201d) {
      sum += 0.43; // “ ”
    } else if (code === 0x2026) {
      sum += 0.65; // …
    } else {
      sum += 0.6;
    }
  }
  return sum * size * weightScale;
}

const splitWords = (s?: string) => (s ? s.split(/\s+/).filter(Boolean) : []);

/** Simulates CSS word wrapping within `maxWidth` and returns the wrapped line count and widest line width. */
function wrapText(text: string, role: FontRole, maxWidth: number): { lines: number; width: number } {
  const tokens = splitWords(text);
  if (!tokens.length) return { lines: 0, width: 0 };
  const sp = measureText(" ", role);
  let lines = 1;
  let lineW = 0;
  let maxLineW = 0;
  for (const w of tokens) {
    const ww = measureText(w, role);
    if (lineW === 0) {
      lineW = ww;
    } else if (lineW + sp + ww <= maxWidth + 0.5) {
      lineW += sp + ww;
    } else {
      maxLineW = Math.max(maxLineW, lineW);
      lines++;
      lineW = ww;
    }
  }
  maxLineW = Math.max(maxLineW, lineW);
  return { lines, width: maxLineW };
}

// ---- Math & geometry helpers ----

export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const round4 = (n: number): number => Math.round(n * 10000) / 10000;
export const round6 = (n: number): number => Math.round(n * 1000000) / 1000000;
const isH = (s: DiagramSide) => s === "left" || s === "right";
const opposite: Record<DiagramSide, DiagramSide> = { top: "bottom", bottom: "top", left: "right", right: "left" };
const hit = (a: Rect, b: Rect, eps = 0.01) => a.l < b.r - eps && a.r > b.l + eps && a.t < b.b - eps && a.b > b.t + eps;
const grow = (a: Rect, p: number): Rect => ({ l: a.l - p, r: a.r + p, t: a.t - p, b: a.b + p });
const rectToBox = (r: Rect): SceneBox => ({ x: round2(r.l), y: round2(r.t), w: round2(r.r - r.l), h: round2(r.b - r.t) });
const boxToRect = (b: SceneBox): Rect => ({ l: b.x, t: b.y, r: b.x + b.w, b: b.y + b.h });
const segmentsOf = (pts: Pt[]) => pts.slice(1).map((p, k) => [pts[k]!, p] as const);
const segRect = (a: Pt, b: Pt, w: number): Rect => ({
  l: Math.min(a.x, b.x) - w / 2,
  r: Math.max(a.x, b.x) + w / 2,
  t: Math.min(a.y, b.y) - w / 2,
  b: Math.max(a.y, b.y) + w / 2,
});

function slugId(s: string): string {
  const slug = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "diagram";
}

function insideShape(p: Pt, n: GNode, pad: number): boolean {
  const { l, t, r, b } = n.rect;
  const cx = (l + r) / 2, cy = (t + b) / 2, hw = (r - l) / 2, hh = (b - t) / 2;
  if (n.shape === "decision") return Math.abs(p.x - cx) / hw + Math.abs(p.y - cy) / hh < 1 - pad / Math.min(hw, hh);
  if (n.shape === "terminal") {
    const rr = Math.min(hw, hh);
    const ex = Math.min(Math.max(p.x, l + rr), r - rr);
    const dx = p.x - ex, dy = p.y - cy;
    return Math.sqrt(dx * dx + dy * dy) < rr - pad;
  }
  return p.x > l + pad && p.x < r - pad && p.y > t + pad && p.y < b - pad;
}

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
    const dx = px - ex, dy = py - cy;
    if (Math.sqrt(dx * dx + dy * dy) < rr - 0.01) return true;
  }
  return false;
}

function segmentThrough(a: Pt, b: Pt, n: GNode): boolean {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(2, Math.ceil(len / 2));
  for (let k = 1; k < steps; k++) {
    const f = k / steps;
    if (f * len < 1.5 || (1 - f) * len < 1.5) continue;
    if (insideShape({ x: a.x + dx * f, y: a.y + dy * f }, n, 1)) return true;
  }
  return false;
}

function findCrossingsCount(lines: GLine[], only: Set<number>): number {
  let count = 0;
  const e = 0.75;
  for (let a = 0; a < lines.length; a++) {
    for (let b = a + 1; b < lines.length; b++) {
      const A = lines[a]!, B = lines[b]!;
      if (!only.has(A.i) && !only.has(B.i)) continue;
      for (const [p1, p2] of segmentsOf(A.pts)) {
        for (const [q1, q2] of segmentsOf(B.pts)) {
          const aH = Math.abs(p1.y - p2.y) < 0.01, bH = Math.abs(q1.y - q2.y) < 0.01;
          if (aH === bH) continue;
          const [h1, h2, v1, v2] = aH ? [p1, p2, q1, q2] : [q1, q2, p1, p2];
          const x = v1.x, y = h1.y;
          if (x > Math.min(h1.x, h2.x) + e && x < Math.max(h1.x, h2.x) - e && y > Math.min(v1.y, v2.y) + e && y < Math.max(v1.y, v2.y) - e) count++;
        }
      }
    }
  }
  return count;
}

function overlapsCount(lines: GLine[], only: Set<number>): number {
  let count = 0;
  for (let a = 0; a < lines.length; a++) {
    for (let b = a + 1; b < lines.length; b++) {
      const A = lines[a]!, B = lines[b]!;
      if (!only.has(A.i) && !only.has(B.i)) continue;
      if (A.to === B.to && Math.abs(A.tip.x - B.tip.x) < 1 && Math.abs(A.tip.y - B.tip.y) < 1) continue;
      const near = (A.width + B.width) / 2 + 0.5;
      for (const [p1, p2] of segmentsOf(A.pts)) {
        for (const [q1, q2] of segmentsOf(B.pts)) {
          const aH = Math.abs(p1.y - p2.y) < 0.01, bH = Math.abs(q1.y - q2.y) < 0.01;
          if (aH !== bH) continue;
          const [ac, bc] = aH ? [p1.y, q1.y] : [p1.x, q1.x];
          if (Math.abs(ac - bc) >= near) continue;
          const [a1, a2] = aH ? [p1.x, p2.x] : [p1.y, p2.y];
          const [b1, b2] = aH ? [q1.x, q2.x] : [q1.y, q2.y];
          if (Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2)) > 1) count++;
        }
      }
    }
  }
  return count;
}

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1 || items.length > 5) { yield items.slice(); return; }
  for (let k = 0; k < items.length; k++) {
    const rest = items.slice(0, k).concat(items.slice(k + 1));
    for (const p of permutations(rest)) yield [items[k]!, ...p];
  }
}

function cleanOrthogonal(pts: Pt[]): Pt[] {
  if (pts.length <= 1) return pts.map((p) => ({ ...p }));
  const out: Pt[] = [{ ...pts[0]! }];
  for (let k = 1; k < pts.length; k++) {
    const p = pts[k]!;
    const last = out[out.length - 1]!;
    if (Math.abs(p.x - last.x) < 1e-6 && Math.abs(p.y - last.y) < 1e-6) continue;
    if (out.length >= 2) {
      const prev = out[out.length - 2]!;
      const sameX = Math.abs(prev.x - last.x) < 1e-6 && Math.abs(last.x - p.x) < 1e-6;
      const sameY = Math.abs(prev.y - last.y) < 1e-6 && Math.abs(last.y - p.y) < 1e-6;
      if (sameX || sameY) {
        out[out.length - 1] = { ...p };
        continue;
      }
    }
    out.push({ ...p });
  }
  return out;
}

/**
 * Snaps an orthogonal polyline's endpoints to exact port coordinates `start` and `end`,
 * propagating the aligned axis into the first and last inner waypoints so neither segment ever jogs
 * (fixes the RunTask 0.5px pixel-snap jog in Visio, Lucidchart, and draw.io).
 */
export function snapRouteToPorts(pts: readonly Pt[], start: Pt, end: Pt, startSide?: DiagramSide, endSide?: DiagramSide): Pt[] {
  if (pts.length < 2) return [{ ...start }, { ...end }];
  const q = pts.map((p) => ({ x: p.x, y: p.y }));
  if (q.length === 2) {
    // Straight 2-point connector: endpoints sit directly on start and end.
    return [{ x: start.x, y: start.y }, { x: end.x, y: end.y }];
  }
  const firstHoriz = startSide
    ? isH(startSide)
    : Math.abs(q[0]!.y - q[1]!.y) <= Math.abs(q[0]!.x - q[1]!.x);
  const lastHoriz = endSide
    ? isH(endSide)
    : Math.abs(q[q.length - 2]!.y - q[q.length - 1]!.y) <= Math.abs(q[q.length - 2]!.x - q[q.length - 1]!.x);

  q[0] = { x: start.x, y: start.y };
  if (firstHoriz) q[1]!.y = start.y; else q[1]!.x = start.x;

  q[q.length - 1] = { x: end.x, y: end.y };
  if (lastHoriz) q[q.length - 2]!.y = end.y; else q[q.length - 2]!.x = end.x;

  // Keep any interior segments strictly orthogonal (for 4+ point routes, middle segment stays axis-aligned).
  for (let k = 1; k < q.length - 2; k++) {
    const a = q[k]!, b = q[k + 1]!;
    if (Math.abs(a.x - b.x) <= Math.abs(a.y - b.y)) {
      b.x = a.x;
    } else {
      b.y = a.y;
    }
  }
  return cleanOrthogonal(q);
}

/** Exact port point on a box boundary for fractional port `(fx, fy)`. */
export function boxPortPoint(box: SceneBox, port: ScenePort): Pt {
  return {
    x: box.x + port.x * box.w,
    y: box.y + port.y * box.h,
  };
}

function portForSideSlot(side: DiagramSide, slot: number): ScenePort {
  const f = round6(Math.max(0, Math.min(1, slot)));
  if (side === "left") return { x: 0, y: f, side };
  if (side === "right") return { x: 1, y: f, side };
  if (side === "top") return { x: f, y: 0, side };
  return { x: f, y: 1, side };
}

function labelArcFraction(pts: readonly Pt[], box: SceneBox): number {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let total = 0;
  const segLens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]!.x - pts[i - 1]!.x;
    const dy = pts[i]!.y - pts[i - 1]!.y;
    const len = Math.abs(dx) < 1e-9 || Math.abs(dy) < 1e-9 ? Math.abs(dx) + Math.abs(dy) : Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    total += len;
  }
  if (total <= 1e-6) return 0.5;
  let bestDist2 = Infinity;
  let bestAlong = total / 2;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Math.max(0, Math.min(1, ((cx - a.x) * dx + (cy - a.y) * dy) / len2)) : 0;
    const px = a.x + u * dx, py = a.y + u * dy;
    const ex = cx - px, ey = cy - py;
    const d2 = ex * ex + ey * ey;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestAlong = acc + u * segLens[i - 1]!;
    }
    acc += segLens[i - 1]!;
  }
  return round4(Math.max(0.05, Math.min(0.95, bestAlong / total)));
}

function dirOf(pts: Pt[]): "up" | "down" | "left" | "right" {
  const a = pts[pts.length - 2]!, b = pts[pts.length - 1]!;
  if (Math.abs(a.x - b.x) < 0.01) return b.y > a.y ? "down" : "up";
  return b.x > a.x ? "right" : "left";
}

function headBox(tip: Pt, dir: "up" | "down" | "left" | "right"): Rect {
  const L = 8, W = 4;
  if (dir === "down") return { l: tip.x - W, r: tip.x + W, t: tip.y - L, b: tip.y };
  if (dir === "up") return { l: tip.x - W, r: tip.x + W, t: tip.y, b: tip.y + L };
  if (dir === "right") return { l: tip.x - L, r: tip.x, t: tip.y - W, b: tip.y + W };
  return { l: tip.x, r: tip.x + L, t: tip.y - W, b: tip.y + W };
}

// ---- Headless layout (exact Basalt CSS grid + routing + label seating) ----

function computeMinimums(m: Model, hasMarks: boolean): { track: number; table: number; least: number } {
  let track = 144;
  let table = 224;
  for (const n of m.nodes) {
    if (n.shape === "table") {
      for (const c of n.columns ?? []) {
        const type = c.ref ? `→ ${c.ref.table}` : c.type ?? "";
        const row = 24 + measureText(c.name, "mono") + (type ? 12 + measureText(type, "mono") : 0) + 24 + 2;
        table = Math.max(table, Math.ceil(row));
      }
      table = Math.max(table, Math.ceil(measureText(n.name, "table") + 24 + 2));
      continue;
    }
    const pad = n.shape === "terminal" ? 40 : 24;
    const seat = hasMarks && n.mark ? 24 : 0;
    let widest = 0;
    for (const w of splitWords(n.name)) widest = Math.max(widest, measureText(w, n.shape === "decision" ? "name-500" : "name") + (n.kind ? 0 : seat));
    if (m.type !== "data-flow") for (const w of splitWords(n.kind)) widest = Math.max(widest, measureText(w, "mono") + seat);
    for (const w of splitWords(n.detail)) widest = Math.max(widest, measureText(w, n.mono ? "mono" : "sans"));
    const need = n.shape === "decision" ? widest / 0.62 : widest + pad + 2;
    track = Math.max(track, Math.ceil(need));
  }
  const n = columnCount(m);
  const oneColTurnBack = m.type === "schema" && m.cols === 1 && m.edges.length > 0;
  let least: number;
  if (m.type === "data-flow") least = 120 + n * (track + 48);
  else if (m.type === "schema") least = n * table + (n - 1) * 48 + (oneColTurnBack ? 20 : 0);
  else if (m.type === "sequence") least = n * track + (n - 1) * 20;
  else least = n * track + (n - 1) * 64 + groupReach(m) * 16;
  return { track, table, least: Math.max(640, least) };
}

function measureNodeHeight(n: MNode, trackW: number, hasMark: boolean): { h: number; rows?: SceneTableRow[]; headerH?: number } {
  if (n.shape === "table") {
    const headerH = 37; // 8 top + 20 line + 8 bottom + 1 border
    const rowsPadTop = 4;
    const rowH = 28;
    const rows: SceneTableRow[] = (n.columns ?? []).map((c, idx) => ({
      index: idx,
      name: c.name,
      key: c.key,
      type: c.type,
      refTable: c.ref?.table,
      y: headerH + rowsPadTop + idx * rowH,
      h: rowH,
      midY: headerH + rowsPadTop + idx * rowH + rowH / 2,
    }));
    const moreH = n.more ? 24 : 0; // 16 line + 8 bottom pad
    const h = 2 + headerH + rowsPadTop * 2 + rows.length * rowH + moreH;
    return { h, rows, headerH };
  }
  if (n.shape === "decision") {
    const heightFor = (ww: number) => {
      const wrapped = wrapText(n.name, "name-500", ww);
      const boxW = Math.min(ww, wrapped.width) + 20;
      const boxH = Math.max(1, wrapped.lines) * 20 + 16;
      const denom = 1 - boxW / trackW;
      const half = denom > 0.05 ? boxH / 2 / denom : boxH * 10;
      return { h: Math.max(64, Math.ceil(trackW / 5), Math.ceil(2 * half)), lines: wrapped.lines };
    };
    const baseW = trackW * 0.62;
    let best = heightFor(baseW);
    if (best.h > trackW) {
      const widest = Math.floor(trackW - 20);
      let cur = Math.ceil(baseW);
      let tall = best.lines;
      while (cur < widest && heightFor(widest).lines < tall) {
        let lo = cur, hi = widest;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (heightFor(mid).lines < tall) hi = mid; else lo = mid;
        }
        const tried = heightFor(hi);
        if (tried.h <= trackW) { best = tried; break; }
        cur = hi;
        tall = tried.lines;
      }
    }
    return { h: best.h };
  }
  if (n.shape === "participant") {
    const inner = Math.max(40, trackW - 26);
    const kindLines = n.kind ? Math.max(1, wrapText(n.kind, "mono", inner).lines) : 0;
    const nameLines = Math.max(1, wrapText(n.name, "name", inner).lines);
    return { h: 2 + 20 + kindLines * 16 + nameLines * 20 };
  }
  // Architecture, flowchart step/terminal, data-flow step.
  const padX = n.shape === "terminal" ? 40 : 24;
  const inner = Math.max(40, trackW - padX - 2);
  const markSeat = hasMark ? 24 : 0;
  const kindLines = n.kind ? Math.max(1, wrapText(n.kind, "mono", Math.max(24, inner - markSeat)).lines) : 0;
  const nameLines = Math.max(1, wrapText(n.name, "name", Math.max(24, inner - (n.kind ? 0 : markSeat))).lines);
  const detailLines = n.detail ? Math.max(1, wrapText(n.detail, n.mono ? "mono" : "sans", inner).lines) : 0;
  const detailGap = detailLines > 0 ? 2 : 0;
  return { h: 2 + 20 + kindLines * 16 + nameLines * 20 + detailGap + detailLines * 16 };
}

function seatSceneLabels(
  m: Model,
  edges: SceneEdge[],
  gNodes: GNode[],
  groupRects: Rect[],
  laneObstacles: Rect[],
  bounds: Rect,
): Map<number, { box: SceneBox; on: boolean }> {
  const placed: Rect[] = [];
  const out = new Map<number, { box: SceneBox; on: boolean }>();
  const GROW = 4;
  const gLines: GLine[] = edges.map((e) => ({
    i: e.index,
    from: e.from,
    to: e.to,
    kind: e.kind,
    pts: e.pts,
    tip: e.pts[e.pts.length - 1]!,
    dir: dirOf(e.pts),
    width: e.kind === "main" ? 2 : 1,
  }));
  const heads = gLines.map((l) => headBox(l.tip, l.dir));
  const obstacles: Rect[] = [...laneObstacles];
  for (const g of groupRects) {
    obstacles.push(
      { l: g.l, r: g.r, t: g.t, b: g.t + 1 },
      { l: g.l, r: g.r, t: g.b - 1, b: g.b },
      { l: g.l, r: g.l + 1, t: g.t, b: g.b },
      { l: g.r - 1, r: g.r, t: g.t, b: g.b },
    );
  }
  const order = edges
    .filter((e) => m.edges[e.index]?.label)
    .sort((a, b) => Number(b.kind === "main") - Number(a.kind === "main") || a.index - b.index);

  for (const edge of order) {
    const text = m.edges[edge.index]!.label!;
    const w = measureText(text, "label");
    const hgt = 16;
    const lineW = edge.kind === "main" ? 2 : 1;
    const segs = segmentsOf(edge.pts);
    const last = segs.length - 1;
    const runs: Array<{ horiz: boolean; c: number; p: number; q: number; len: number; pri: number }> = [];
    segs.forEach(([a, b], k) => {
      const horiz = Math.abs(a.y - b.y) < 0.01;
      const s0 = horiz ? a.x : a.y;
      let t0 = horiz ? b.x : b.y;
      const dir = Math.sign(t0 - s0) || 1;
      if (k === last) t0 -= dir * 8;
      let parts: Array<[number, number]> = [[s0, t0]];
      const c = horiz ? a.y : a.x;
      for (const g of groupRects) {
        for (const edgeAt of horiz ? [g.l, g.r] : [g.t, g.b]) {
          const within = horiz ? c > g.t && c < g.b : c > g.l && c < g.r;
          if (!within) continue;
          parts = parts.flatMap(([p, q]) =>
            edgeAt > Math.min(p, q) + 1 && edgeAt < Math.max(p, q) - 1
              ? ([[p, edgeAt], [edgeAt, q]] as Array<[number, number]>)
              : ([[p, q]] as Array<[number, number]>),
          );
        }
      }
      const outside = (p: number, q: number) => {
        const mid = (p + q) / 2;
        const pt = horiz ? { x: mid, y: c } : { x: c, y: mid };
        return !groupRects.some((g) => pt.x > g.l && pt.x < g.r && pt.y > g.t && pt.y < g.b);
      };
      for (const [p, q] of parts) runs.push({ horiz, c, p, q, len: Math.abs(q - p), pri: parts.length > 1 && outside(p, q) ? 1 : 0 });
    });
    runs.sort((x, y) => y.pri - x.pri || y.len - x.len);

    const clear = (box: Rect, checkBounds = true) => {
      const G = grow(box, GROW);
      if (checkBounds && (box.l < bounds.l || box.r > bounds.r || box.t < bounds.t || box.b > bounds.b)) return false;
      if (gNodes.some((n) => boxHitsShape(G, n))) return false;
      if (placed.some((p) => hit(G, p))) return false;
      if (heads.some((h0) => hit(G, h0))) return false;
      if (obstacles.some((r) => hit(G, r))) return false;
      return !gLines.some((o) => o.i !== edge.index && segmentsOf(o.pts).some(([a, b]) => hit(G, segRect(a, b, o.width))));
    };

    let chosen: { box: Rect; on: boolean } | null = null;
    for (const run of runs) {
      for (const f of [0.5, 1 / 3, 2 / 3]) {
        const mid = run.p + (run.q - run.p) * f;
        const off = 8 + lineW / 2;
        const cands: Array<{ box: Rect; on: boolean }> = [];
        if (run.horiz) {
          if (run.len >= w + 22) cands.push({ box: { l: mid - w / 2 - 4, r: mid + w / 2 + 4, t: run.c - hgt / 2, b: run.c + hgt / 2 }, on: true });
          cands.push({ box: { l: mid - w / 2, r: mid + w / 2, t: run.c - off - hgt, b: run.c - off }, on: false });
          cands.push({ box: { l: mid - w / 2, r: mid + w / 2, t: run.c + off, b: run.c + off + hgt }, on: false });
        } else {
          if (run.len >= hgt + 12) cands.push({ box: { l: run.c - w / 2 - 4, r: run.c + w / 2 + 4, t: mid - hgt / 2, b: mid + hgt / 2 }, on: true });
          cands.push({ box: { l: run.c + off, r: run.c + off + w, t: mid - hgt / 2, b: mid + hgt / 2 }, on: false });
          cands.push({ box: { l: run.c - off - w, r: run.c - off, t: mid - hgt / 2, b: mid + hgt / 2 }, on: false });
        }
        chosen = cands.find((c) => clear(c.box)) ?? null;
        if (chosen) break;
      }
      if (chosen) break;
    }
    if (!chosen && runs.length > 0) {
      const r0 = runs[0]!;
      const mid = (r0.p + r0.q) / 2;
      chosen = r0.horiz
        ? { box: { l: mid - w / 2 - 4, r: mid + w / 2 + 4, t: r0.c - hgt / 2, b: r0.c + hgt / 2 }, on: true }
        : { box: { l: r0.c - w / 2 - 4, r: r0.c + w / 2 + 4, t: mid - hgt / 2, b: mid + hgt / 2 }, on: true };
    }
    if (chosen) {
      placed.push(chosen.box);
      out.set(edge.index, { box: rectToBox(chosen.box), on: chosen.on });
    }
  }
  return out;
}

/** Computes a complete deterministic InteropScene from Basalt's DiagramSpec headlessly (no DOM or browser). */
export function layoutHeadless(spec: DiagramSpec, options: InteropOptions = {}): InteropScene {
  const m = buildModel(spec, { checks: false });
  const pad = options.pad ?? 32;
  const marksMode = options.marks ?? "omit";
  const hasMarks = marksMode === "embed" && m.nodes.some((n) => Boolean(resolveNodeMark(n, marksMode, options.resolveMark)));
  const mins = computeMinimums(m, hasMarks);
  const targetW = Math.max(options.width ?? 1104, mins.least);
  const id = options.diagramId ?? slugId(m.title || m.type);

  if (m.type === "sequence") {
    return layoutSequenceHeadless(m, targetW, pad, id);
  }

  // Grid geometry
  let padTop = 0, padRight = 0, padBottom = 0, padLeft = 0;
  if (m.type === "architecture" && m.groups.length > 0) {
    const members = m.groups.flatMap((g) => g.members.map((gid) => m.byId.get(gid)!));
    if (members.some((n) => n.row === 1)) padTop = 32;
    if (members.some((n) => n.col === m.cols)) padRight = 16;
    if (members.some((n) => n.row2 === m.rows)) padBottom = 16;
    if (members.some((n) => n.col === 1)) padLeft = 16;
  }
  if (m.type === "schema" && m.cols === 1 && m.edges.length > 0) {
    padRight = 20;
  }

  const colGap = m.type === "data-flow" || m.type === "schema" ? 48 : 64;
  const rowGap = m.type === "data-flow" ? 40 : m.type === "schema" ? 32 : 48;
  const laneLabelW = m.type === "data-flow" ? 120 : 0;

  const colCount = m.cols;
  const availW = targetW - padLeft - padRight - (m.type === "data-flow" ? laneLabelW + colCount * colGap : (colCount - 1) * colGap);
  const trackW = round2(availW / colCount);

  // Column x spans (1-based index -> [l, r]). For data-flow, track 0 is lane label, tracks 1..colCount are step cols.
  const gridCols: Array<[number, number]> = [];
  if (m.type === "data-flow") {
    gridCols.push([padLeft, padLeft + laneLabelW]);
    let x = padLeft + laneLabelW + colGap;
    for (let c = 0; c < colCount; c++) {
      gridCols.push([round2(x), round2(x + trackW)]);
      x += trackW + colGap;
    }
  } else {
    let x = padLeft;
    for (let c = 0; c < colCount; c++) {
      gridCols.push([round2(x), round2(x + trackW)]);
      x += trackW + colGap;
    }
  }

  // Measure each node height and compute row track heights
  const nodeMeasured = new Map<string, { h: number; rows?: SceneTableRow[]; headerH?: number; mark?: SceneMark }>();
  const rowHeights = new Array<number>(m.rows).fill(m.type === "data-flow" ? 56 : 0);

  for (const n of m.nodes) {
    const mark = resolveNodeMark(n, marksMode, options.resolveMark);
    const meas = measureNodeHeight(n, trackW, Boolean(mark));
    nodeMeasured.set(n.id, { ...meas, mark });
    if (n.row === n.row2) {
      rowHeights[n.row - 1] = Math.max(rowHeights[n.row - 1]!, meas.h);
    }
  }
  // Account for multi-row spanning tables (e.g. row: [1, 2])
  for (const n of m.nodes) {
    if (n.row2 > n.row) {
      const meas = nodeMeasured.get(n.id)!;
      let spanH = 0;
      for (let r = n.row; r <= n.row2; r++) spanH += rowHeights[r - 1]!;
      spanH += (n.row2 - n.row) * rowGap;
      if (meas.h > spanH) {
        rowHeights[n.row2 - 1] = rowHeights[n.row2 - 1]! + (meas.h - spanH);
      }
    }
  }

  const gridRows: Array<[number, number]> = [];
  let curY = padTop;
  for (let r = 0; r < m.rows; r++) {
    const rh = Math.max(40, rowHeights[r]!);
    gridRows.push([round2(curY), round2(curY + rh)]);
    curY += rh + rowGap;
  }
  const drawingH = round2(gridRows.length ? gridRows[gridRows.length - 1]![1] + padBottom : 100);
  const drawingW = round2(targetW);

  // Place nodes
  const sceneNodes: SceneNode[] = [];
  const nodeById = new Map<string, SceneNode>();
  const gNodeMap = new Map<string, GNode>();

  for (const n of m.nodes) {
    const colIdx = m.type === "data-flow" ? n.col : n.col - 1;
    const [cl, cr] = gridCols[colIdx]!;
    const [rt] = gridRows[n.row - 1]!;
    const [, rb] = gridRows[n.row2 - 1]!;
    const meas = nodeMeasured.get(n.id)!;
    const w = round2(cr - cl);
    const h = round2(meas.h);
    // Schema tables align to start of row cell; all other cards center vertically in their row track.
    const y = m.type === "schema" ? rt : round2(rt + (rb - rt - h) / 2);
    const box: SceneBox = { x: cl, y, w, h };
    const rows = meas.rows?.map((row) => ({ ...row, midY: round2(y + row.y + row.h / 2) }));
    const sn: SceneNode = {
      id: n.id,
      name: n.name,
      kind: n.kind,
      detail: n.detail,
      detailMono: n.mono,
      focal: n.focal,
      col: n.col,
      row: n.row,
      row2: n.row2,
      shape: n.shape,
      group: n.group,
      laneId: m.type === "data-flow" ? m.lanes[(n.lane ?? 1) - 1]?.id : undefined,
      laneIndex: n.lane ? n.lane - 1 : undefined,
      step: n.step,
      columns: n.columns,
      rows,
      headerH: meas.headerH,
      more: n.more,
      short: n.short,
      box,
      mark: meas.mark,
    };
    sceneNodes.push(sn);
    nodeById.set(n.id, sn);
    gNodeMap.set(n.id, { id: n.id, rect: boxToRect(box), shape: n.shape, i: n.i });
  }

  // Groups (architecture)
  const sceneGroups: SceneGroup[] = [];
  const groupRects: Rect[] = [];
  if (m.type === "architecture") {
    for (const g of m.groups) {
      const mem = g.members.map((gid) => m.byId.get(gid)!).filter(Boolean);
      if (!mem.length) continue;
      const c1 = Math.min(...mem.map((n) => n.col));
      const c2 = Math.max(...mem.map((n) => n.col));
      const r1 = Math.min(...mem.map((n) => n.row));
      const r2 = Math.max(...mem.map((n) => n.row2));
      const l = round2(gridCols[c1 - 1]![0] - 16);
      const r = round2(gridCols[c2 - 1]![1] + 16);
      const t = round2(gridRows[r1 - 1]![0] - 32);
      const b = round2(gridRows[r2 - 1]![1] + 16);
      groupRects.push({ l, t, r, b });
      sceneGroups.push({ id: g.id, label: g.label, box: { x: l, y: t, w: round2(r - l), h: round2(b - t) }, members: g.members });
    }
  }

  // Lanes (data-flow)
  const sceneLanes: SceneLane[] = [];
  const laneObstacles: Rect[] = [];
  if (m.type === "data-flow") {
    for (let k = 0; k < m.lanes.length; k++) {
      const lane = m.lanes[k]!;
      const [rt, rb] = gridRows[k]!;
      const top = k === 0 ? 0 : round2(rt - rowGap / 2);
      const bottom = k === m.lanes.length - 1 ? drawingH : round2(rb + rowGap / 2);
      sceneLanes.push({
        id: lane.id,
        label: lane.label,
        box: { x: 0, y: top, w: drawingW, h: round2(bottom - top) },
        labelWidth: laneLabelW,
      });
      if (k > 0) laneObstacles.push({ l: 0, r: drawingW, t: top - 0.5, b: top + 0.5 });
      const labelW = Math.min(laneLabelW - 12, measureText(lane.label, "lane"));
      const midY = (rt + rb) / 2;
      laneObstacles.push({ l: 0, r: labelW, t: midY - 8, b: midY + 8 });
    }
  }

  // Group label obstacles
  for (const g of sceneGroups) {
    const gw = measureText(g.label, "mono");
    laneObstacles.push({ l: g.box.x + 12, r: g.box.x + 12 + gw, t: g.box.y + 8, b: g.box.y + 24 });
  }

  // Route edges using Basalt's exact derivedPorts + gutter lane solver
  const sceneEdges = routeEdges(m, nodeById, gNodeMap, gridCols, gridRows);

  // Seat edge labels
  const seated = seatSceneLabels(m, sceneEdges, [...gNodeMap.values()], groupRects, laneObstacles, { l: 0, t: 0, r: drawingW, b: drawingH });
  for (const e of sceneEdges) {
    const s = seated.get(e.index);
    const text = m.edges[e.index]?.label;
    if (s && text) {
      e.label = {
        text,
        box: s.box,
        on: s.on,
        t: labelArcFraction(e.pts, s.box),
      };
    }
  }

  return {
    type: m.type,
    id,
    title: m.title,
    width: drawingW,
    height: drawingH,
    pad,
    nodes: sceneNodes,
    groups: sceneGroups,
    lanes: sceneLanes,
    lifelines: [],
    bands: [],
    edges: sceneEdges,
  };
}

function routeEdges(
  m: Model,
  nodeById: Map<string, SceneNode>,
  gNodeMap: Map<string, GNode>,
  gridCols: Array<[number, number]>,
  gridRows: Array<[number, number]>,
): SceneEdge[] {
  const trackOf = (n: MNode) => (m.type === "data-flow" ? n.col + 1 : n.col);
  const dropped = new Set<number>();
  if (m.type === "schema") {
    m.edges.forEach((e, k) => {
      if (Math.abs(m.byId.get(e.from)!.col - m.byId.get(e.to)!.col) > 1) dropped.add(k);
    });
  }

  // Determine sides and exact fractional ports
  const derived = m.type === "schema" ? [] : derivedPorts(m);
  const edgeMeta = m.edges.map((e, k) => {
    const a = m.byId.get(e.from)!;
    const b = m.byId.get(e.to)!;
    const na = nodeById.get(e.from)!;
    const nb = nodeById.get(e.to)!;
    let s1: DiagramSide, s2: DiagramSide, fromPort: ScenePort, toPort: ScenePort;
    if (m.type === "schema") {
      if (a.col === b.col) {
        const side: DiagramSide = a.col === m.cols && m.cols > 1 ? "left" : "right";
        s1 = side; s2 = side;
      } else {
        s1 = b.col > a.col ? "right" : "left";
        s2 = opposite[s1];
      }
      const r1 = na.rows?.[e.fromRow ?? 0]?.midY ?? (na.box.y + na.box.h / 2);
      const r2 = nb.rows?.[e.toRow ?? 0]?.midY ?? (nb.box.y + nb.box.h / 2);
      fromPort = portForSideSlot(s1, (r1 - na.box.y) / na.box.h);
      toPort = portForSideSlot(s2, (r2 - nb.box.y) / nb.box.h);
    } else {
      const dp = derived[k]!;
      s1 = dp.fromSide; s2 = dp.toSide;
      fromPort = portForSideSlot(s1, dp.fromSlot);
      toPort = portForSideSlot(s2, dp.toSlot);
    }
    const p1 = boxPortPoint(na.box, fromPort);
    let p2 = boxPortPoint(nb.box, toPort);
    // Keep straight lines strictly aligned on a single axis even when boxes differ slightly in height/width.
    if (isH(s1) && isH(s2) && s1 !== s2 && Math.abs(p1.y - p2.y) <= 1.01) {
      toPort = portForSideSlot(s2, (p1.y - nb.box.y) / nb.box.h);
      p2 = boxPortPoint(nb.box, toPort);
    } else if (!isH(s1) && !isH(s2) && s1 !== s2 && Math.abs(p1.x - p2.x) <= 1.01) {
      toPort = portForSideSlot(s2, (p1.x - nb.box.x) / nb.box.w);
      p2 = boxPortPoint(nb.box, toPort);
    }
    return { s1, s2, fromPort, toPort, p1, p2 };
  });

  // Gutter jog clustering and lane permutation solver (mirrors diagram-core.ts)
  const jogs = new Map<string, { span: [number, number]; vertical: boolean; members: Map<string, number[]> }>();
  const turnBacks = new Set<number>();

  m.edges.forEach((e, k) => {
    if (dropped.has(k)) return;
    const { s1, s2, p1, p2 } = edgeMeta[k]!;
    const a = m.byId.get(e.from)!, b = m.byId.get(e.to)!;
    let key: string | null = null, span: [number, number] | null = null, vertical = false;
    if (s1 === s2) {
      if (isH(s1)) {
        const ti = s1 === "right" ? Math.max(trackOf(a), trackOf(b)) : Math.min(trackOf(a), trackOf(b)) - 1;
        const t1 = gridCols[ti - 1], t2 = gridCols[ti];
        if (t1 && t2) { key = `c${ti}`; span = [t1[1], t2[0]]; vertical = true; }
      } else {
        const ri = s1 === "bottom" ? Math.max(a.row2, b.row2) : Math.min(a.row, b.row) - 1;
        const r1 = gridRows[ri - 1], r2 = gridRows[ri];
        if (r1 && r2) { key = `r${ri}`; span = [r1[1], r2[0]]; vertical = false; }
      }
      if (key) turnBacks.add(k);
    } else if (isH(s1) && isH(s2) && Math.abs(p1.y - p2.y) > 0.5) {
      const ti = trackOf(b);
      const leftSide = s2 === "left";
      const t1 = gridCols[(leftSide ? ti - 1 : ti) - 1];
      const t2 = gridCols[(leftSide ? ti : ti + 1) - 1];
      if (t1 && t2) { key = `c${leftSide ? ti - 1 : ti}`; span = [t1[1], t2[0]]; vertical = true; }
    } else if (!isH(s1) && !isH(s2) && Math.abs(p1.x - p2.x) > 0.5) {
      const topSide = s2 === "top";
      const ri = topSide ? b.row - 1 : b.row2;
      const r1 = gridRows[ri - 1], r2 = gridRows[ri];
      if (r1 && r2) { key = `r${ri}`; span = [r1[1], r2[0]]; vertical = false; }
    }
    if (!key || !span) return;
    if (!jogs.has(key)) jogs.set(key, { span, vertical, members: new Map() });
    const portKey = `${e.to}.${s2}.${Math.round(vertical ? p2.y : p2.x)}`;
    const g = jogs.get(key)!;
    if (!g.members.has(portKey)) g.members.set(portKey, []);
    g.members.get(portKey)!.push(k);
  });

  const lanes = new Map<number, number>();
  const rawRoute = (k: number): Pt[] => {
    const { s1, s2, p1, p2 } = edgeMeta[k]!;
    if (isH(s1) && isH(s2)) {
      if (s1 === s2) {
        const x = round2(lanes.get(k) ?? (s1 === "right" ? Math.max(p1.x, p2.x) + 16 : Math.min(p1.x, p2.x) - 16));
        return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
      }
      if (Math.abs(p1.y - p2.y) <= 0.5) return [p1, p2];
      const x = round2(lanes.get(k) ?? (p1.x + p2.x) / 2);
      return [p1, { x, y: p1.y }, { x, y: p2.y }, p2];
    }
    if (!isH(s1) && !isH(s2)) {
      if (s1 === s2) {
        const y = round2(lanes.get(k) ?? (s1 === "bottom" ? Math.max(p1.y, p2.y) + 16 : Math.min(p1.y, p2.y) - 16));
        return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
      }
      if (Math.abs(p1.x - p2.x) <= 0.5) return [p1, p2];
      const y = round2(lanes.get(k) ?? (p1.y + p2.y) / 2);
      return [p1, { x: p1.x, y }, { x: p2.x, y }, p2];
    }
    if (isH(s1)) return [p1, { x: p2.x, y: p1.y }, p2];
    return [p1, { x: p1.x, y: p2.y }, p2];
  };

  const gNodes = [...gNodeMap.values()];
  const buildGLine = (k: number): GLine => {
    const e = m.edges[k]!;
    const meta = edgeMeta[k]!;
    const pts = snapRouteToPorts(rawRoute(k), meta.p1, meta.p2, meta.s1, meta.s2);
    return { i: k, from: e.from, to: e.to, kind: e.kind, pts, tip: pts[pts.length - 1]!, dir: dirOf(pts), width: e.kind === "main" ? 2 : 1 };
  };
  const buildAll = () => m.edges.flatMap((_, k) => (dropped.has(k) ? [] : [buildGLine(k)]));
  let current: GLine[] | null = null;
  const score = (members: Set<number>) => {
    current ??= buildAll();
    const lines = current.map((l) => (members.has(l.i) ? buildGLine(l.i) : l));
    let through = 0;
    for (const l of lines) {
      if (!members.has(l.i)) continue;
      if (gNodes.some((n) => segmentsOf(l.pts).some(([a, b]) => segmentThrough(a, b, n)))) through++;
    }
    return { lines, score: overlapsCount(lines, members) * 100000 + findCrossingsCount(lines, members) * 1000 + through };
  };

  const runOf = (members: number[], vertical: boolean): [number, number] => {
    const vals = members.flatMap((k) => { const { p1, p2 } = edgeMeta[k]!; return vertical ? [p1.y, p2.y] : [p1.x, p2.x]; });
    return [Math.min(...vals), Math.max(...vals)];
  };

  for (const [, g] of jogs) {
    const ports = [...g.members.values()].map((members) => ({ members, run: runOf(members, g.vertical) })).sort((a, b) => a.run[0] - b.run[0]);
    const clusters: Array<typeof ports> = [];
    for (const p of ports) {
      const last = clusters[clusters.length - 1];
      if (last && last.some((q) => q.run[0] < p.run[1] + 32 && p.run[0] < q.run[1] + 32)) last.push(p);
      else clusters.push([p]);
    }
    for (const cluster of clusters) {
      if (cluster.length === 1 && cluster[0]!.members.every((k) => turnBacks.has(k))) continue;
      const groupsOf = cluster.map((c) => c.members);
      const count = groupsOf.length;
      const step = (g.span[1] - g.span[0]) / (count + 1);
      const inGutter = new Set(groupsOf.flat());
      let best = groupsOf, bestScore = Infinity, bestLines: GLine[] | null = null;
      for (const perm of permutations(groupsOf)) {
        perm.forEach((members, j) => members.forEach((k) => lanes.set(k, g.span[0] + step * (j + 1))));
        const tried = score(inGutter);
        if (tried.score < bestScore) { bestScore = tried.score; best = perm; bestLines = tried.lines; }
      }
      best.forEach((members, j) => members.forEach((k) => lanes.set(k, g.span[0] + step * (j + 1))));
      current = bestLines;
    }
  }

  const out: SceneEdge[] = [];
  m.edges.forEach((e, k) => {
    if (dropped.has(k)) return;
    const meta = edgeMeta[k]!;
    const pts = snapRouteToPorts(rawRoute(k), meta.p1, meta.p2, meta.s1, meta.s2);
    out.push({
      index: k,
      from: e.from,
      to: e.to,
      fromRow: e.fromRow,
      toRow: e.toRow,
      fk: Boolean(e.fk),
      kind: e.kind,
      openTip: e.kind === "dashed",
      fromPort: meta.fromPort,
      toPort: meta.toPort,
      pts,
    });
  });
  return out;
}

function layoutSequenceHeadless(m: Model, targetW: number, pad: number, id: string): InteropScene {
  const n = Math.max(1, m.nodes.length);
  const gap = 20;
  const colW = round2((targetW - (n - 1) * gap) / n);
  let headH = 44;
  for (const p of m.nodes) headH = Math.max(headH, measureNodeHeight(p, colW, false).h);

  const sceneNodes: SceneNode[] = m.nodes.map((p, idx) => {
    const x = round2(idx * (colW + gap));
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      detailMono: false,
      focal: p.focal,
      col: p.col,
      row: 1,
      row2: 1,
      shape: "participant",
      short: p.short,
      box: { x, y: 0, w: colW, h: headH },
    };
  });

  const cxById = new Map<string, number>();
  sceneNodes.forEach((p) => cxById.set(p.id, round2(p.box.x + p.box.w / 2)));

  let y = headH + 16; // steps padding-block-start: space-4
  const bands: SceneBand[] = [];
  const stepEntries: Array<{ n: number; from: string; to: string; kind: SceneEdge["kind"]; label: string; note?: string; y: number; selfSide?: "start" | "end" }> = [];

  for (const s of m.steps) {
    if ("band" in s) {
      bands.push({ text: s.band, y: round2(y), h: 36, w: round2(targetW) });
      y += 36;
    } else {
      const a = m.byId.get(s.from);
      const self = s.from === s.to;
      const selfSide: "start" | "end" | undefined = self ? (a && a.col === n ? "start" : "end") : undefined;
      stepEntries.push({ n: s.n, from: s.from, to: s.to, kind: s.kind, label: s.label, note: s.note, y: round2(y + 28), selfSide });
      y += 56;
    }
  }

  const bottom = round2(Math.max(y, headH + 40));
  const lifelines: SceneLifeline[] = sceneNodes.map((p) => ({
    id: `life-${p.id}`,
    participantId: p.id,
    x: cxById.get(p.id)!,
    y1: headH,
    y2: bottom,
  }));
  const lifeByParticipant = new Map(lifelines.map((l) => [l.participantId, l]));

  const edges: SceneEdge[] = stepEntries.map((s) => {
    const lf1 = lifeByParticipant.get(s.from)!;
    const lf2 = lifeByParticipant.get(s.to)!;
    const span1 = Math.max(1, lf1.y2 - lf1.y1);
    const span2 = Math.max(1, lf2.y2 - lf2.y1);
    let pts: Pt[];
    let fromPort: ScenePort;
    let toPort: ScenePort;
    if (s.from === s.to) {
      const out = s.selfSide === "start" ? -24 : 24;
      const side: DiagramSide = s.selfSide === "start" ? "left" : "right";
      const yt = round2(s.y - 8);
      const yb = round2(s.y + 8);
      pts = [
        { x: lf1.x, y: yt },
        { x: round2(lf1.x + out), y: yt },
        { x: round2(lf1.x + out), y: yb },
        { x: lf1.x, y: yb },
      ];
      fromPort = { x: 0.5, y: round4((yt - lf1.y1) / span1), side };
      toPort = { x: 0.5, y: round4((yb - lf2.y1) / span2), side };
    } else {
      const dirRight = lf2.x >= lf1.x;
      pts = [{ x: lf1.x, y: s.y }, { x: lf2.x, y: s.y }];
      fromPort = { x: 0.5, y: round4((s.y - lf1.y1) / span1), side: dirRight ? "right" : "left" };
      toPort = { x: 0.5, y: round4((s.y - lf2.y1) / span2), side: dirRight ? "left" : "right" };
    }
    const text = `${s.n}  ${s.label}`;
    const lw = Math.max(measureText(text, "label"), s.note ? measureText(s.note, "sans") : 0);
    const lh = s.note ? 32 : 16;
    const midX = s.from === s.to
      ? (s.selfSide === "start" ? lf1.x - 24 - 10 - lw / 2 : lf1.x + 24 + 10 + lw / 2)
      : (lf1.x + lf2.x) / 2;
    const labelY = s.from === s.to ? round2(s.y - lh / 2) : round2(s.y - lh - 6);
    return {
      index: s.n - 1,
      messageNumber: s.n,
      from: s.from,
      to: s.to,
      sequence: true,
      fk: false,
      kind: s.kind,
      openTip: s.kind === "dashed",
      fromPort,
      toPort,
      pts,
      selfSide: s.selfSide,
      label: {
        text,
        note: s.note,
        box: { x: round2(midX - lw / 2), y: labelY, w: round2(lw), h: lh },
        on: false,
        t: 0.5,
      },
    };
  });

  return {
    type: "sequence",
    id,
    title: m.title,
    width: round2(targetW),
    height: bottom,
    pad,
    nodes: sceneNodes,
    groups: [],
    lanes: [],
    lifelines,
    bands,
    edges,
  };
}

// ---- Live measured Geo -> InteropScene ----

function portFromBoxAndPoint(box: SceneBox, pt: Pt, exactRow: boolean): ScenePort {
  const fx = box.w > 0 ? (pt.x - box.x) / box.w : 0.5;
  const fy = box.h > 0 ? (pt.y - box.y) / box.h : 0.5;
  const dLeft = Math.abs(pt.x - box.x);
  const dRight = Math.abs(pt.x - (box.x + box.w));
  const dTop = Math.abs(pt.y - box.y);
  const dBottom = Math.abs(pt.y - (box.y + box.h));
  const m = Math.min(dLeft, dRight, dTop, dBottom);
  const clamp = (v: number) => round6(Math.max(0, Math.min(1, v)));
  const snap = (v: number) => {
    if (exactRow) return clamp(v);
    for (const s of [0, 0.25, 0.5, 0.75, 1]) if (Math.abs(v - s) < 0.015) return s;
    return clamp(v);
  };
  if (m === dLeft) return { x: 0, y: snap(fy), side: "left" };
  if (m === dRight) return { x: 1, y: snap(fy), side: "right" };
  if (m === dTop) return { x: snap(fx), y: 0, side: "top" };
  return { x: snap(fx), y: 1, side: "bottom" };
}

/** Converts a live figure's measured `Geo` (from diagram-core's `measureFigure`) into an InteropScene. */
export function sceneFromMeasured(
  spec: DiagramSpec,
  geo: Geo,
  extras: MeasuredExtras = {},
  options: InteropOptions = {},
): InteropScene {
  const m = buildModel(spec, { checks: false });
  const pad = options.pad ?? 32;
  const marksMode = options.marks ?? "omit";
  const id = options.diagramId ?? slugId(m.title || m.type);

  const gNodeById = new Map(geo.nodes.map((gn) => [gn.id, gn]));
  const sceneNodes: SceneNode[] = m.nodes.map((n) => {
    const gn = gNodeById.get(n.id);
    const box: SceneBox = gn ? rectToBox(gn.rect) : { x: 0, y: 0, w: 144, h: 64 };
    const mark = resolveNodeMark(n, marksMode, options.resolveMark);
    let rows: SceneTableRow[] | undefined;
    let headerH: number | undefined;
    if (n.shape === "table") {
      headerH = 37;
      const measuredYs = extras.tableRows?.[n.id];
      const cols = n.columns ?? [];
      const rowH = cols.length > 0 && !measuredYs
        ? round2((box.h - headerH - 8 - (n.more ? 24 : 0) - 2) / cols.length)
        : 28;
      rows = cols.map((c, idx) => {
        const midY = measuredYs?.[idx] ?? round2(box.y + headerH! + 4 + idx * rowH + rowH / 2);
        const ry = round2(midY - box.y - rowH / 2);
        return { index: idx, name: c.name, key: c.key, type: c.type, refTable: c.ref?.table, y: ry, h: rowH, midY };
      });
    }
    return {
      id: n.id,
      name: n.name,
      kind: n.kind,
      detail: n.detail,
      detailMono: n.mono,
      focal: n.focal,
      col: n.col,
      row: n.row,
      row2: n.row2,
      shape: n.shape,
      group: n.group,
      laneId: m.type === "data-flow" ? m.lanes[(n.lane ?? 1) - 1]?.id : undefined,
      laneIndex: n.lane ? n.lane - 1 : undefined,
      step: n.step,
      columns: n.columns,
      rows,
      headerH,
      more: n.more,
      short: n.short,
      box,
      mark,
    };
  });
  const nodeById = new Map(sceneNodes.map((n) => [n.id, n]));

  // Groups
  const sceneGroups: SceneGroup[] = [];
  if (m.type === "architecture") {
    const extraById = new Map((extras.groups ?? []).map((g) => [g.id, g]));
    for (const g of m.groups) {
      const eg = extraById.get(g.id);
      if (eg) {
        sceneGroups.push({ id: g.id, label: g.label, box: rectToBox(eg.rect), members: g.members });
      } else {
        const mem = g.members.map((gid) => nodeById.get(gid)).filter((x): x is SceneNode => Boolean(x));
        if (!mem.length) continue;
        const l = round2(Math.min(...mem.map((x) => x.box.x)) - 16);
        const r = round2(Math.max(...mem.map((x) => x.box.x + x.box.w)) + 16);
        const t = round2(Math.min(...mem.map((x) => x.box.y)) - 32);
        const b = round2(Math.max(...mem.map((x) => x.box.y + x.box.h)) + 16);
        sceneGroups.push({ id: g.id, label: g.label, box: { x: l, y: t, w: round2(r - l), h: round2(b - t) }, members: g.members });
      }
    }
  }

  // Lanes
  const sceneLanes: SceneLane[] = [];
  if (m.type === "data-flow") {
    const extraLanes = extras.lanes ?? [];
    const extraById = new Map(extraLanes.map((l) => [l.id, l]));
    const extraByIndex = new Map<number, MeasuredLane>();
    extraLanes.forEach((l, k) => extraByIndex.set(l.index ?? k, l));
    const rowBounds: Array<[number, number]> = m.lanes.map((lane, idx) => {
      const el = extraById.get(lane.id) ?? extraByIndex.get(idx);
      if (el) return [el.rect.t, el.rect.b];
      const members = sceneNodes.filter((n) => n.laneIndex === idx);
      if (members.length) return [Math.min(...members.map((x) => x.box.y)), Math.max(...members.map((x) => x.box.y + x.box.h))];
      const est = idx * 96;
      return [est, est + 56];
    });
    for (let k = 0; k < m.lanes.length; k++) {
      const lane = m.lanes[k]!;
      const [rt, rb] = rowBounds[k]!;
      const top = k === 0 ? 0 : round2((rowBounds[k - 1]![1] + rt) / 2);
      const bottom = k === m.lanes.length - 1 ? round2(geo.h) : round2((rb + rowBounds[k + 1]![0]) / 2);
      sceneLanes.push({ id: lane.id, label: lane.label, box: { x: 0, y: top, w: round2(geo.w), h: round2(bottom - top) }, labelWidth: 120 });
    }
  }

  // Sequence lifelines, bands, messages
  if (m.type === "sequence") {
    const lifelines: SceneLifeline[] = m.nodes.map((p, idx) => {
      const lf = geo.lifelines[idx];
      const box = nodeById.get(p.id)!.box;
      const x = round2(box.x + box.w / 2);
      return { id: `life-${p.id}`, participantId: p.id, x, y1: round2(lf?.y1 ?? box.y + box.h), y2: round2(lf?.y2 ?? geo.h) };
    });
    const lifeByP = new Map(lifelines.map((l) => [l.participantId, l]));
    const lineByNum = new Map(geo.lines.map((l) => [l.i, l]));

    const bands: SceneBand[] = [];
    if (extras.bands?.length) {
      for (const b of extras.bands) bands.push({ text: b.text, y: round2(b.rect.t), h: round2(b.rect.b - b.rect.t), w: round2(geo.w) });
    } else {
      let curY = (sceneNodes[0]?.box.h ?? 44) + 16;
      for (const s of m.steps) {
        if ("band" in s) {
          bands.push({ text: s.band, y: round2(curY), h: 36, w: round2(geo.w) });
          curY += 36;
        } else {
          const gl = lineByNum.get(s.n);
          const msgCenterY = gl ? (gl.pts[0]!.y + gl.pts[gl.pts.length - 1]!.y) / 2 : curY + 28;
          curY = Math.max(curY + 56, msgCenterY + 28);
        }
      }
    }

    const edges: SceneEdge[] = [];
    for (const s of m.steps) {
      if ("band" in s) continue;
      const gl = lineByNum.get(s.n);
      const lf1 = lifeByP.get(s.from);
      const lf2 = lifeByP.get(s.to);
      if (!gl || !lf1 || !lf2) continue;
      const span1 = Math.max(1, lf1.y2 - lf1.y1);
      const span2 = Math.max(1, lf2.y2 - lf2.y1);
      const self = s.from === s.to;
      const a = m.byId.get(s.from);
      const selfSide: "start" | "end" | undefined = self ? (a && a.col === m.nodes.length ? "start" : "end") : undefined;
      let pts: Pt[];
      let fromPort: ScenePort;
      let toPort: ScenePort;
      if (self) {
        const out = selfSide === "start" ? -24 : 24;
        const side: DiagramSide = selfSide === "start" ? "left" : "right";
        const yt = round2(gl.pts[0]!.y);
        const yb = round2(gl.pts[gl.pts.length - 1]!.y);
        pts = [{ x: lf1.x, y: yt }, { x: round2(lf1.x + out), y: yt }, { x: round2(lf1.x + out), y: yb }, { x: lf1.x, y: yb }];
        fromPort = { x: 0.5, y: round4((yt - lf1.y1) / span1), side };
        toPort = { x: 0.5, y: round4((yb - lf2.y1) / span2), side };
      } else {
        const y = round2(gl.pts[0]!.y);
        const dirRight = lf2.x >= lf1.x;
        pts = [{ x: lf1.x, y }, { x: lf2.x, y }];
        fromPort = { x: 0.5, y: round4((y - lf1.y1) / span1), side: dirRight ? "right" : "left" };
        toPort = { x: 0.5, y: round4((y - lf2.y1) / span2), side: dirRight ? "left" : "right" };
      }
      const text = `${s.n}  ${s.label}`;
      const lw = Math.max(measureText(text, "label"), s.note ? measureText(s.note, "sans") : 0);
      const lh = s.note ? 32 : 16;
      const midY = (pts[0]!.y + pts[pts.length - 1]!.y) / 2;
      const midX = self ? (selfSide === "start" ? lf1.x - 34 - lw / 2 : lf1.x + 34 + lw / 2) : (lf1.x + lf2.x) / 2;
      const labelY = self ? round2(midY - lh / 2) : round2(midY - lh - 6);
      edges.push({
        index: s.n - 1,
        messageNumber: s.n,
        from: s.from,
        to: s.to,
        sequence: true,
        fk: false,
        kind: s.kind,
        openTip: s.kind === "dashed",
        fromPort,
        toPort,
        pts,
        selfSide,
        label: { text, note: s.note, box: { x: round2(midX - lw / 2), y: labelY, w: round2(lw), h: lh }, on: false, t: 0.5 },
      });
    }

    return { type: "sequence", id, title: m.title, width: round2(geo.w), height: round2(geo.h), pad, nodes: sceneNodes, groups: [], lanes: [], lifelines, bands, edges };
  }

  // Non-sequence edges from Geo.lines, using derivedPorts for non-schema so slots match exact 0.25/0.5/0.75
  const derived = m.type === "schema" ? [] : derivedPorts(m);
  const labelByEdge = new Map(geo.labels.map((l) => [l.i, l]));
  const edges: SceneEdge[] = [];

  for (const gl of geo.lines) {
    const me = m.edges[gl.i];
    const src = nodeById.get(gl.from);
    const dst = nodeById.get(gl.to);
    if (!me || !src || !dst) continue;

    let fromPort: ScenePort;
    let toPort: ScenePort;
    if (m.type === "schema") {
      // Exact FK column row center
      const p0 = gl.pts[0]!;
      const pN = gl.pts[gl.pts.length - 1]!;
      fromPort = portFromBoxAndPoint(src.box, p0, true);
      toPort = portFromBoxAndPoint(dst.box, pN, true);
      if (me.fromRow !== undefined && src.rows?.[me.fromRow]) {
        const r = src.rows[me.fromRow]!;
        fromPort = portForSideSlot(fromPort.side, (r.midY - src.box.y) / src.box.h);
      }
      if (me.toRow !== undefined && dst.rows?.[me.toRow]) {
        const r = dst.rows[me.toRow]!;
        toPort = portForSideSlot(toPort.side, (r.midY - dst.box.y) / dst.box.h);
      }
    } else {
      const dp = derived[gl.i];
      if (dp) {
        fromPort = portForSideSlot(dp.fromSide, dp.fromSlot);
        toPort = portForSideSlot(dp.toSide, dp.toSlot);
      } else {
        fromPort = portFromBoxAndPoint(src.box, gl.pts[0]!, false);
        toPort = portFromBoxAndPoint(dst.box, gl.pts[gl.pts.length - 1]!, false);
      }
    }

    const startPt = boxPortPoint(src.box, fromPort);
    let endPt = boxPortPoint(dst.box, toPort);
    if (gl.pts.length === 2) {
      if (isH(fromPort.side) && isH(toPort.side) && Math.abs(startPt.y - endPt.y) <= 1.5) {
        toPort = portForSideSlot(toPort.side, (startPt.y - dst.box.y) / dst.box.h);
        endPt = boxPortPoint(dst.box, toPort);
      } else if (!isH(fromPort.side) && !isH(toPort.side) && Math.abs(startPt.x - endPt.x) <= 1.5) {
        toPort = portForSideSlot(toPort.side, (startPt.x - dst.box.x) / dst.box.w);
        endPt = boxPortPoint(dst.box, toPort);
      }
    }
    const pts = snapRouteToPorts(gl.pts, startPt, endPt, fromPort.side, toPort.side);
    const gLab = labelByEdge.get(gl.i);
    let label: SceneLabel | undefined;
    if (gLab) {
      const lBox = rectToBox(gLab.box);
      label = { text: gLab.text, box: lBox, on: gLab.on, t: labelArcFraction(pts, lBox) };
    }
    edges.push({
      index: gl.i,
      from: gl.from,
      to: gl.to,
      fromRow: me.fromRow,
      toRow: me.toRow,
      fk: Boolean(me.fk),
      kind: gl.kind,
      openTip: gl.kind === "dashed",
      fromPort,
      toPort,
      pts,
      label,
    });
  }

  return {
    type: m.type,
    id,
    title: m.title,
    width: round2(geo.w),
    height: round2(geo.h),
    pad,
    nodes: sceneNodes,
    groups: sceneGroups,
    lanes: sceneLanes,
    lifelines: [],
    bands: [],
    edges,
  };
}

/** Reads optional group, lane, band, and table-row rects from a live diagram `<figure>` element. */
export function readMeasuredExtras(fig: Element, prefix = "basalt-diagram"): MeasuredExtras {
  const drawing = fig.querySelector(`.${prefix}-drawing`);
  if (!drawing) return {};
  const origin = drawing.getBoundingClientRect();
  const rectOf = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top };
  };

  const groups: MeasuredGroup[] = [];
  drawing.querySelectorAll(`.${prefix}-gbox`).forEach((el) => {
    const id = el.getAttribute("data-group");
    if (!id || !el.getClientRects().length) return;
    const label = el.querySelector(`.${prefix}-glabel`)?.textContent ?? "";
    groups.push({ id, label, rect: rectOf(el) });
  });

  const lanes: MeasuredLane[] = [];
  drawing.querySelectorAll(`.${prefix}-lane`).forEach((el, idx) => {
    if (!el.getClientRects().length) return;
    const label = el.querySelector(`.${prefix}-lane-name`)?.textContent ?? "";
    lanes.push({ id: `lane-${idx}`, index: idx, label, rect: rectOf(el) });
  });

  const bands: MeasuredBand[] = [];
  drawing.querySelectorAll(`.${prefix}-band`).forEach((el) => {
    if (!el.getClientRects().length) return;
    bands.push({ text: el.textContent ?? "", rect: rectOf(el) });
  });

  const tableRows: Record<string, number[]> = {};
  drawing.querySelectorAll(`.${prefix}-node[data-shape="table"]`).forEach((nodeEl) => {
    const id = nodeEl.getAttribute("data-node");
    if (!id) return;
    const ys: number[] = [];
    nodeEl.querySelectorAll(`.${prefix}-row`).forEach((rowEl) => {
      const r = rectOf(rowEl);
      ys.push((r.t + r.b) / 2);
    });
    if (ys.length) tableRows[id] = ys;
  });

  return {
    groups: groups.length ? groups : undefined,
    lanes: lanes.length ? lanes : undefined,
    bands: bands.length ? bands : undefined,
    tableRows: Object.keys(tableRows).length ? tableRows : undefined,
  };
}
