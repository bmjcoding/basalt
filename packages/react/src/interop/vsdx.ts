// Deterministic Microsoft Visio (.vsdx) OPC exporter (DECISIONS 311, 314, 324, 327).
// Conforms to [MS-VSDX] (http://schemas.microsoft.com/office/visio/2012/main).
// 96 CSS px = 1 inch; Visio page Y increases UPWARD from bottom-left.
// Every connector's BeginX/BeginY/EndX/EndY and Geometry MoveTo/LineTo coordinates are computed directly
// from each shape's exact rounded PinX/PinY/Width/Height and Connection row in Visio inches, guaranteeing
// zero port-to-waypoint drift (no joining jog in Visio, Lucidchart, or draw.io).
import type { DiagramCardinality, Pt } from "../diagram-core";
import { paletteFor, round6, snapRouteToPorts } from "./scene";
import type { InteropScene, InteropTheme, SceneNode } from "./types";
import { makeDeterministicZip } from "./zip";
import type { ZipEntry } from "./zip";

const DPI = 96;

const VSDX_CARD: Record<DiagramCardinality, number> = {
  one: 25,
  "zero-or-one": 30,
  "one-or-many": 28,
  "zero-or-many": 29,
};

function escXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const f6 = (n: number): string => n.toFixed(6);
const n6 = (n: number): number => Number(n.toFixed(6));
const pxToIn = (px: number): string => f6(px / DPI);
const ptToIn = (pt: number): string => f6(pt / 72);

interface ConnEntry {
  fx: number;
  fy: number;
  /** Exact local connection X and Y in Visio inches (computed directly so straight lines stay aligned to 0.000000 in). */
  cx: number;
  cy: number;
  ix: number;
}

interface PlacedShape {
  sheetId: number;
  pinX: number;
  pinY: number;
  wIn: number;
  hIn: number;
  conns: ConnEntry[];
}

/** Exact page-coordinate point (in Visio inches) of a Connection row on a placed shape. */
function connectionPagePt(shape: PlacedShape, conn: ConnEntry): Pt {
  const left = shape.pinX - n6(shape.wIn / 2);
  const bottom = shape.pinY - n6(shape.hIn / 2);
  return { x: n6(left + conn.cx), y: n6(bottom + conn.cy) };
}

export function sceneToVsdx(scene: InteropScene, theme: InteropTheme = "light"): Uint8Array {
  const singleTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
  const P = paletteFor(singleTheme);
  const pad = scene.pad;
  const canvasW = scene.width + pad * 2;
  const canvasH = scene.height + pad * 2;
  const pageWIn = n6(canvasW / DPI);
  const pageHIn = n6(canvasH / DPI);
  const toVisioX = (px: number): number => n6((px + pad) / DPI);
  const toVisioY = (py: number): number => n6((canvasH - (py + pad)) / DPI);

  // Precompute exact Visio box geometry for every connectable shape, lifeline, and activation bar
  // so straight-line Connection rows align to 0.000000 in across boxes of different heights/widths.
  const geomByKey = new Map<string, { pinX: number; pinY: number; wIn: number; hIn: number }>();
  for (const lf of scene.lifelines) {
    geomByKey.set(`life:${lf.participantId}`, {
      pinX: toVisioX(lf.x),
      pinY: toVisioY((lf.y1 + lf.y2) / 2),
      wIn: n6(2 / DPI),
      hIn: n6(Math.max(1, lf.y2 - lf.y1) / DPI),
    });
  }
  for (const bar of scene.bars) {
    geomByKey.set(`bar:${bar.id}`, {
      pinX: toVisioX(bar.box.x + bar.box.w / 2),
      pinY: toVisioY(bar.box.y + bar.box.h / 2),
      wIn: n6(bar.box.w / DPI),
      hIn: n6(bar.box.h / DPI),
    });
  }
  for (const n of scene.nodes) {
    geomByKey.set(`node:${n.id}`, {
      pinX: toVisioX(n.box.x + n.box.w / 2),
      pinY: toVisioY(n.box.y + n.box.h / 2),
      wIn: n6(n.box.w / DPI),
      hIn: n6(n.box.h / DPI),
    });
  }

  // Collect deduplicated Connection rows required on each target shape/lifeline/bar
  const connsByKey = new Map<string, ConnEntry[]>();
  const getConnIndex = (key: string, fx: number, fy: number, exactCx?: number, exactCy?: number): number => {
    const g = geomByKey.get(key);
    const rfx = round6(Math.max(0, Math.min(1, fx)));
    const rfy = round6(Math.max(0, Math.min(1, fy)));
    const cx = exactCx !== undefined ? n6(exactCx) : n6(rfx * (g?.wIn ?? 0));
    const cy = exactCy !== undefined ? n6(exactCy) : n6((1 - rfy) * (g?.hIn ?? 0));
    let list = connsByKey.get(key);
    if (!list) { list = []; connsByKey.set(key, list); }
    const existing = list.find((c) => Math.abs(c.cx - cx) < 1e-6 && Math.abs(c.cy - cy) < 1e-6);
    if (existing) return existing.ix;
    const ix = list.length;
    list.push({ fx: rfx, fy: rfy, cx, cy, ix });
    return ix;
  };

  const edgeConns = scene.edges.map((e) => {
    const fromKey = e.sequence
      ? (e.fromBarId && geomByKey.has(`bar:${e.fromBarId}`) ? `bar:${e.fromBarId}` : `life:${e.from}`)
      : `node:${e.from}`;
    const toKey = e.sequence
      ? (e.toBarId && geomByKey.has(`bar:${e.toBarId}`) ? `bar:${e.toBarId}` : `life:${e.to}`)
      : `node:${e.to}`;
    const fromG = geomByKey.get(fromKey);
    const toG = geomByKey.get(toKey);
    const fromFx = e.sequence && !fromKey.startsWith("bar:") ? 0.5 : e.fromPort.x;
    const toFx = e.sequence && !toKey.startsWith("bar:") ? 0.5 : e.toPort.x;
    const fromIx = getConnIndex(fromKey, fromFx, e.fromPort.y);
    let toIx: number;
    if (e.pts.length === 2 && fromG && toG) {
      const fc = connsByKey.get(fromKey)![fromIx]!;
      const startPageX = n6(fromG.pinX - n6(fromG.wIn / 2) + fc.cx);
      const startPageY = n6(fromG.pinY - n6(fromG.hIn / 2) + fc.cy);
      const horiz = Math.abs(e.pts[0]!.y - e.pts[1]!.y) <= Math.abs(e.pts[0]!.x - e.pts[1]!.x);
      if (horiz) {
        const toBottom = toG.pinY - n6(toG.hIn / 2);
        const exactCy = n6(startPageY - toBottom);
        const alignedFy = toG.hIn > 0 ? round6(1 - exactCy / toG.hIn) : e.toPort.y;
        toIx = getConnIndex(toKey, toFx, alignedFy, undefined, exactCy);
      } else {
        const toLeft = toG.pinX - n6(toG.wIn / 2);
        const exactCx = n6(startPageX - toLeft);
        const alignedFx = toG.wIn > 0 ? round6(exactCx / toG.wIn) : toFx;
        toIx = getConnIndex(toKey, alignedFx, e.toPort.y, exactCx, undefined);
      }
    } else {
      toIx = getConnIndex(toKey, toFx, e.toPort.y);
    }
    return { fromKey, toKey, fromIx, toIx };
  });

  let nextId = 1;
  const bgId = singleTheme === "dark" ? nextId++ : 0;
  const groupSheetId = new Map<string, number>();
  for (const g of scene.groups) groupSheetId.set(g.id, nextId++);
  const laneSheetIds = scene.lanes.map(() => nextId++);
  const lifeSheetIds = scene.lifelines.map(() => nextId++);
  const bandSheetIds = scene.bands.map(() => nextId++);
  const frameSheetId = new Map<string, number>();
  for (const f of scene.frames) frameSheetId.set(f.id, nextId++);
  const barSheetId = new Map<string, number>();
  for (const bar of scene.bars) barSheetId.set(bar.id, nextId++);
  const nodeSheetId = new Map<string, number>();
  for (const n of scene.nodes) nodeSheetId.set(n.id, nextId++);

  const shapeXml: string[] = [];
  const connectXml: string[] = [];
  const placed = new Map<string, PlacedShape>();
  const mediaFiles: Array<{ rId: string; fileName: string; svg: string }> = [];
  const attributions: string[] = [];

  // 0. Dark-theme locked full-page surface-page background (Visio pages default to white)
  if (bgId) {
    shapeXml.push(
      `    <Shape ID="${bgId}" NameU="PageBackground" Name="Page background" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(n6(pageWIn / 2))}"/>\n` +
      `      <Cell N="PinY" V="${f6(n6(pageHIn / 2))}"/>\n` +
      `      <Cell N="Width" V="${f6(pageWIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(pageHIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(pageWIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(pageHIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FlipX" V="0"/>\n` +
      `      <Cell N="FlipY" V="0"/>\n` +
      `      <Cell N="FillForegnd" V="${P.page}"/>\n` +
      `      <Cell N="FillPattern" V="1"/>\n` +
      `      <Cell N="LinePattern" V="0"/>\n` +
      `      <Cell N="LockWidth" V="1"/>\n` +
      `      <Cell N="LockHeight" V="1"/>\n` +
      `      <Cell N="LockMoveX" V="1"/>\n` +
      `      <Cell N="LockMoveY" V="1"/>\n` +
      `      <Cell N="LockAspect" V="1"/>\n` +
      `      <Cell N="LockDelete" V="1"/>\n` +
      `      <Cell N="LockBegin" V="1"/>\n` +
      `      <Cell N="LockEnd" V="1"/>\n` +
      `      <Cell N="LockRotate" V="1"/>\n` +
      `      <Cell N="LockCrop" V="1"/>\n` +
      `      <Cell N="LockVtxEdit" V="1"/>\n` +
      `      <Cell N="LockTextEdit" V="1"/>\n` +
      `      <Cell N="LockFormat" V="1"/>\n` +
      `      <Cell N="LockGroup" V="1"/>\n` +
      `      <Cell N="LockCalcWH" V="1"/>\n` +
      `      <Cell N="LockSelect" V="1"/>\n` +
      `      <Cell N="LockCustProp" V="1"/>\n` +
      `      <Cell N="ObjType" V="4"/>\n` +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="0"/>\n` +
      `        <Cell N="NoLine" V="1"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(pageWIn)}" F="Width*1"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="3"><Cell N="X" V="${f6(pageWIn)}" F="Width*1"/><Cell N="Y" V="${f6(pageHIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${f6(pageHIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `      </Section>\n` +
      `    </Shape>`,
    );
  }

  // 1. Architecture groups as real Visio Containers (supporting nested depth-2 containers via DEPENDSON)
  for (const g of scene.groups) {
    const id = groupSheetId.get(g.id)!;
    const wIn = n6(g.box.w / DPI);
    const hIn = n6(g.box.h / DPI);
    const pinX = toVisioX(g.box.x + g.box.w / 2);
    const pinY = toVisioY(g.box.y + g.box.h / 2);
    const radIn = n6((g.depth > 1 ? 8 : 12) / DPI);
    const memberIds = [
      ...g.members.map((mid) => nodeSheetId.get(mid)).filter((x): x is number => x !== undefined),
      ...(g.childGroups ?? []).map((cid) => groupSheetId.get(cid)).filter((x): x is number => x !== undefined),
    ];
    const parentGid = g.parent ? groupSheetId.get(g.parent) : undefined;
    const deps: string[] = [];
    if (parentGid !== undefined) deps.push(`DEPENDSON(4,Sheet.${parentGid}!SheetRef())`);
    if (memberIds.length) deps.push(`DEPENDSON(1,${memberIds.map((mid) => `Sheet.${mid}!SheetRef()`).join(",")})`);
    const relCell = deps.length
      ? `      <Cell N="Relationships" V="0" F="SUM(${deps.join(",")})"/>\n`
      : "";
    shapeXml.push(
      `    <Shape ID="${id}" NameU="Group_${escXml(g.id)}" Name="${escXml(g.label)}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(pinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(hIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FlipX" V="0"/>\n` +
      `      <Cell N="FlipY" V="0"/>\n` +
      `      <Cell N="FillPattern" V="0"/>\n` +
      `      <Cell N="LineColor" V="${P.structure}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(1)}"/>\n` +
      `      <Cell N="LinePattern" V="2"/>\n` +
      `      <Cell N="Rounding" V="${f6(radIn)}"/>\n` +
      `      <Cell N="VerticalAlign" V="0"/>\n` +
      `      <Cell N="LeftMargin" V="${pxToIn(12)}"/>\n` +
      `      <Cell N="TopMargin" V="${pxToIn(8)}"/>\n` +
      `      <Cell N="ObjType" V="4"/>\n` +
      relCell +
      `      <Section N="User">\n` +
      `        <Row N="msvStructureType"><Cell N="Value" V="Container" U="STR"/></Row>\n` +
      `        <Row N="msvSDContainerMargin"><Cell N="Value" V="${pxToIn(16)}"/></Row>\n` +
      `        <Row N="msvSDContainerResize"><Cell N="Value" V="0"/></Row>\n` +
      `        <Row N="msvSDContainerLocked"><Cell N="Value" V="0"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Character">\n` +
      `        <Row IX="0"><Cell N="Font" V="1"/><Cell N="Color" V="${P.textSecondary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Paragraph">\n` +
      `        <Row IX="0"><Cell N="HorzAlign" V="0"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="1"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="3"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `      </Section>\n` +
      `      <Text><cp IX="0"/><pp IX="0"/>${escXml(g.label)}</Text>\n` +
      `    </Shape>`,
    );
  }

  // 2. Data-flow lanes (behind step cards)
  for (let k = 0; k < scene.lanes.length; k++) {
    const lane = scene.lanes[k]!;
    const id = laneSheetIds[k]!;
    const wIn = n6(lane.box.w / DPI);
    const hIn = n6(lane.box.h / DPI);
    const pinX = toVisioX(lane.box.x + lane.box.w / 2);
    const pinY = toVisioY(lane.box.y + lane.box.h / 2);
    const rightMargin = n6(Math.max(0, lane.box.w - lane.labelWidth) / DPI);
    shapeXml.push(
      `    <Shape ID="${id}" NameU="Lane_${escXml(lane.id)}" Name="${escXml(lane.label)}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(pinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(hIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FillPattern" V="0"/>\n` +
      `      <Cell N="LineColor" V="${P.divider}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(0.75)}"/>\n` +
      `      <Cell N="LinePattern" V="${k > 0 ? 1 : 0}"/>\n` +
      `      <Cell N="VerticalAlign" V="1"/>\n` +
      `      <Cell N="LeftMargin" V="${pxToIn(4)}"/>\n` +
      `      <Cell N="RightMargin" V="${f6(rightMargin)}"/>\n` +
      `      <Cell N="ObjType" V="4"/>\n` +
      `      <Section N="Character">\n` +
      `        <Row IX="0"><Cell N="Font" V="0"/><Cell N="Color" V="${P.textSecondary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Paragraph">\n` +
      `        <Row IX="0"><Cell N="HorzAlign" V="0"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="1"/>\n` +
      `        <Cell N="NoLine" V="${k > 0 ? 0 : 1}"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `      </Section>\n` +
      `      <Text><cp IX="0"/><pp IX="0"/>${escXml(lane.label)}</Text>\n` +
      `    </Shape>`,
    );
  }

  // 3. Sequence lifelines, phase bands, combined frames, and activation bars
  for (let lfIdx = 0; lfIdx < scene.lifelines.length; lfIdx++) {
    const lf = scene.lifelines[lfIdx]!;
    const id = lifeSheetIds[lfIdx]!;
    const wIn = n6(2 / DPI);
    const hIn = n6(Math.max(1, lf.y2 - lf.y1) / DPI);
    const pinX = toVisioX(lf.x);
    const pinY = toVisioY((lf.y1 + lf.y2) / 2);
    const key = `life:${lf.participantId}`;
    const conns = connsByKey.get(key) ?? [];
    placed.set(key, { sheetId: id, pinX, pinY, wIn, hIn, conns });

    const connRowsXml = renderConnectionRows(conns, wIn, hIn);
    shapeXml.push(
      `    <Shape ID="${id}" NameU="Lifeline_${escXml(lf.participantId)}" Name="Lifeline ${escXml(lf.participantId)}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(pinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(hIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FillPattern" V="0"/>\n` +
      `      <Cell N="LineColor" V="${P.structure}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(0.75)}"/>\n` +
      `      <Cell N="LinePattern" V="2"/>\n` +
      `      <Cell N="ObjType" V="1"/>\n` +
      connRowsXml +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="1"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="${f6(n6(wIn / 2))}" F="Width*0.5"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(n6(wIn / 2))}" F="Width*0.5"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `      </Section>\n` +
      `    </Shape>`,
    );
  }

  for (let bIdx = 0; bIdx < scene.bands.length; bIdx++) {
    const band = scene.bands[bIdx]!;
    const id = bandSheetIds[bIdx]!;
    const wIn = n6(band.w / DPI);
    const hIn = n6(band.h / DPI);
    const pinX = toVisioX(band.w / 2);
    const pinY = toVisioY(band.y + band.h / 2);
    shapeXml.push(
      `    <Shape ID="${id}" NameU="Band_${bIdx}" Name="${escXml(band.text)}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(pinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(hIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FillPattern" V="0"/>\n` +
      `      <Cell N="LineColor" V="${P.divider}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(0.75)}"/>\n` +
      `      <Cell N="LinePattern" V="1"/>\n` +
      `      <Cell N="VerticalAlign" V="1"/>\n` +
      `      <Cell N="TextBkgnd" V="${P.page}"/>\n` +
      `      <Cell N="ObjType" V="4"/>\n` +
      `      <Section N="Character">\n` +
      `        <Row IX="0"><Cell N="Font" V="0"/><Cell N="Color" V="${P.textSecondary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Paragraph">\n` +
      `        <Row IX="0"><Cell N="HorzAlign" V="1"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="1"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="${f6(n6(hIn / 2))}" F="Height*0.5"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(n6(hIn / 2))}" F="Height*0.5"/></Row>\n` +
      `      </Section>\n` +
      `      <Text><cp IX="0"/><pp IX="0"/>${escXml(band.text)}</Text>\n` +
      `    </Shape>`,
    );
  }

  // 3b. Sequence frames (opt/loop/alt/par containers with corner operator tab and dashed branch dividers)
  for (const f of scene.frames) {
    const id = frameSheetId.get(f.id)!;
    const wIn = n6(f.box.w / DPI);
    const hIn = n6(f.box.h / DPI);
    const pinX = toVisioX(f.box.x + f.box.w / 2);
    const pinY = toVisioY(f.box.y + f.box.h / 2);
    const radIn = n6((f.depth > 1 ? 4 : 12) / DPI);
    const childFids = scene.frames.filter((c) => c.parentId === f.id).map((c) => frameSheetId.get(c.id)!);
    const parentFid = f.parentId ? frameSheetId.get(f.parentId) : undefined;
    const deps: string[] = [];
    if (parentFid !== undefined) deps.push(`DEPENDSON(4,Sheet.${parentFid}!SheetRef())`);
    if (childFids.length) deps.push(`DEPENDSON(1,${childFids.map((cid) => `Sheet.${cid}!SheetRef()`).join(",")})`);
    const relCell = deps.length
      ? `      <Cell N="Relationships" V="0" F="SUM(${deps.join(",")})"/>\n`
      : "";
    shapeXml.push(
      `    <Shape ID="${id}" NameU="Frame_${escXml(f.id)}" Name="${escXml(`${f.operator} ${f.label}`.trim())}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(pinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(hIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FillPattern" V="0"/>\n` +
      `      <Cell N="LineColor" V="${P.structure}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(0.75)}"/>\n` +
      `      <Cell N="LinePattern" V="1"/>\n` +
      `      <Cell N="Rounding" V="${f6(radIn)}"/>\n` +
      `      <Cell N="ObjType" V="4"/>\n` +
      relCell +
      `      <Section N="User">\n` +
      `        <Row N="msvStructureType"><Cell N="Value" V="Container" U="STR"/></Row>\n` +
      `        <Row N="msvSDContainerResize"><Cell N="Value" V="0"/></Row>\n` +
      `        <Row N="msvSDContainerLocked"><Cell N="Value" V="0"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="1"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="3"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `      </Section>\n` +
      `    </Shape>`,
    );

    const tabId = nextId++;
    const twIn = n6(f.tabBox.w / DPI);
    const thIn = n6(f.tabBox.h / DPI);
    const tPinX = toVisioX(f.tabBox.x + f.tabBox.w / 2);
    const tPinY = toVisioY(f.tabBox.y + f.tabBox.h / 2);
    shapeXml.push(
      `    <Shape ID="${tabId}" NameU="FrameTab_${escXml(f.id)}" Name="${escXml(f.operator)}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(tPinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(tPinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(twIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(thIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(twIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(thIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FillForegnd" V="${P.page}"/>\n` +
      `      <Cell N="FillPattern" V="1"/>\n` +
      `      <Cell N="LineColor" V="${P.structure}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(0.75)}"/>\n` +
      `      <Cell N="LinePattern" V="1"/>\n` +
      `      <Cell N="VerticalAlign" V="1"/>\n` +
      `      <Cell N="ObjType" V="4"/>\n` +
      `      <Section N="Character">\n` +
      `        <Row IX="0"><Cell N="Font" V="1"/><Cell N="Color" V="${P.textPrimary}"/><Cell N="Style" V="1"/><Cell N="Size" V="${ptToIn(9)}"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Paragraph">\n` +
      `        <Row IX="0"><Cell N="HorzAlign" V="1"/></Row>\n` +
      `      </Section>\n` +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="0"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(twIn)}" F="Width*1"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="3"><Cell N="X" V="${f6(twIn)}" F="Width*1"/><Cell N="Y" V="${f6(thIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${f6(thIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `      </Section>\n` +
      `      <Text><cp IX="0"/><pp IX="0"/>${escXml(f.operator)}</Text>\n` +
      `    </Shape>`,
    );

    if (f.label) {
      const lblId = nextId++;
      const lblX = f.tabBox.x + f.tabBox.w + 8;
      const lblW = Math.max(40, f.box.x + f.box.w - lblX - 8);
      const lwIn = n6(lblW / DPI);
      const lhIn = n6(20 / DPI);
      shapeXml.push(
        `    <Shape ID="${lblId}" NameU="FrameLabel_${escXml(f.id)}" Name="${escXml(f.label)}" Type="Shape">\n` +
        `      <Cell N="PinX" V="${f6(toVisioX(lblX + lblW / 2))}"/>\n` +
        `      <Cell N="PinY" V="${f6(toVisioY(f.tabBox.y + 12))}"/>\n` +
        `      <Cell N="Width" V="${f6(lwIn)}"/>\n` +
        `      <Cell N="Height" V="${f6(lhIn)}"/>\n` +
        `      <Cell N="LocPinX" V="${f6(n6(lwIn / 2))}" F="Width*0.5"/>\n` +
        `      <Cell N="LocPinY" V="${f6(n6(lhIn / 2))}" F="Height*0.5"/>\n` +
        `      <Cell N="Angle" V="0"/>\n` +
        `      <Cell N="FillPattern" V="0"/>\n` +
        `      <Cell N="LinePattern" V="0"/>\n` +
        `      <Cell N="VerticalAlign" V="1"/>\n` +
        `      <Cell N="TextBkgnd" V="${P.page}"/>\n` +
        `      <Cell N="ObjType" V="4"/>\n` +
        `      <Section N="Character">\n` +
        `        <Row IX="0"><Cell N="Font" V="0"/><Cell N="Color" V="${P.textSecondary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>\n` +
        `      </Section>\n` +
        `      <Section N="Paragraph">\n` +
        `        <Row IX="0"><Cell N="HorzAlign" V="0"/></Row>\n` +
        `      </Section>\n` +
        `      <Text><cp IX="0"/><pp IX="0"/>${escXml(f.label)}</Text>\n` +
        `    </Shape>`,
      );
    }

    f.dividers.forEach((div, k) => {
      const divId = nextId++;
      const divHIn = n6(2 / DPI);
      shapeXml.push(
        `    <Shape ID="${divId}" NameU="FrameDiv_${escXml(f.id)}_${k}" Name="Divider" Type="Shape">\n` +
        `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
        `      <Cell N="PinY" V="${f6(toVisioY(div.y))}"/>\n` +
        `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
        `      <Cell N="Height" V="${f6(divHIn)}"/>\n` +
        `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
        `      <Cell N="LocPinY" V="${f6(n6(divHIn / 2))}" F="Height*0.5"/>\n` +
        `      <Cell N="Angle" V="0"/>\n` +
        `      <Cell N="FillPattern" V="0"/>\n` +
        `      <Cell N="LineColor" V="${P.structure}"/>\n` +
        `      <Cell N="LineWeight" V="${ptToIn(0.75)}"/>\n` +
        `      <Cell N="LinePattern" V="2"/>\n` +
        `      <Cell N="ObjType" V="4"/>\n` +
        `      <Section N="Geometry" IX="0">\n` +
        `        <Cell N="NoFill" V="1"/>\n` +
        `        <Cell N="NoLine" V="0"/>\n` +
        `        <Cell N="NoShow" V="0"/>\n` +
        `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="${f6(n6(divHIn / 2))}" F="Height*0.5"/></Row>\n` +
        `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(n6(divHIn / 2))}" F="Height*0.5"/></Row>\n` +
        `      </Section>\n` +
        `    </Shape>`,
      );
      if (div.label || f.operator === "alt") {
        const elseId = nextId++;
        const elseW = Math.max(40, f.box.w - 24);
        const ewIn = n6(elseW / DPI);
        const ehIn = n6(20 / DPI);
        const isAlt = f.operator === "alt";
        const charXml = isAlt
          ? `        <Row IX="0"><Cell N="Font" V="1"/><Cell N="Color" V="${P.textTertiary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>\n` +
            `        <Row IX="1"><Cell N="Font" V="0"/><Cell N="Color" V="${P.textSecondary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>`
          : `        <Row IX="0"><Cell N="Font" V="0"/><Cell N="Color" V="${P.textSecondary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>`;
        const txtXml = isAlt
          ? `<cp IX="0"/><pp IX="0"/>else${div.label ? `<cp IX="1"/> ${escXml(div.label)}` : ""}`
          : `<cp IX="0"/><pp IX="0"/>${escXml(div.label)}`;
        shapeXml.push(
          `    <Shape ID="${elseId}" NameU="FrameElse_${escXml(f.id)}_${k}" Name="${escXml(div.label || "else")}" Type="Shape">\n` +
          `      <Cell N="PinX" V="${f6(toVisioX(f.box.x + 12 + elseW / 2))}"/>\n` +
          `      <Cell N="PinY" V="${f6(toVisioY(div.y + 14))}"/>\n` +
          `      <Cell N="Width" V="${f6(ewIn)}"/>\n` +
          `      <Cell N="Height" V="${f6(ehIn)}"/>\n` +
          `      <Cell N="LocPinX" V="${f6(n6(ewIn / 2))}" F="Width*0.5"/>\n` +
          `      <Cell N="LocPinY" V="${f6(n6(ehIn / 2))}" F="Height*0.5"/>\n` +
          `      <Cell N="Angle" V="0"/>\n` +
          `      <Cell N="FillPattern" V="0"/>\n` +
          `      <Cell N="LinePattern" V="0"/>\n` +
          `      <Cell N="VerticalAlign" V="1"/>\n` +
          `      <Cell N="TextBkgnd" V="${P.page}"/>\n` +
          `      <Cell N="ObjType" V="4"/>\n` +
          `      <Section N="Character">\n` +
          `${charXml}\n` +
          `      </Section>\n` +
          `      <Section N="Paragraph">\n` +
          `        <Row IX="0"><Cell N="HorzAlign" V="0"/></Row>\n` +
          `      </Section>\n` +
          `      <Text>${txtXml}</Text>\n` +
          `    </Shape>`,
        );
      }
    });
  }

  // 3c. Sequence activation bars (connectable shapes over lifelines/frames, glued to message connectors)
  for (const bar of scene.bars) {
    const id = barSheetId.get(bar.id)!;
    const key = `bar:${bar.id}`;
    const g = geomByKey.get(key)!;
    const conns = connsByKey.get(key) ?? [];
    placed.set(key, { sheetId: id, pinX: g.pinX, pinY: g.pinY, wIn: g.wIn, hIn: g.hIn, conns });
    const connRowsXml = renderConnectionRows(conns, g.wIn, g.hIn);
    shapeXml.push(
      `    <Shape ID="${id}" NameU="Bar_${escXml(bar.id)}" Name="Activation ${escXml(bar.participantId)}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(g.pinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(g.pinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(g.wIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(g.hIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(g.wIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(g.hIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FillForegnd" V="${P.cardFill}"/>\n` +
      `      <Cell N="FillPattern" V="1"/>\n` +
      `      <Cell N="LineColor" V="${P.structure}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(0.75)}"/>\n` +
      `      <Cell N="LinePattern" V="1"/>\n` +
      `      <Cell N="Rounding" V="${f6(n6(2 / DPI))}"/>\n` +
      `      <Cell N="ObjType" V="1"/>\n` +
      connRowsXml +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="0"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(g.wIn)}" F="Width*1"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="3"><Cell N="X" V="${f6(g.wIn)}" F="Width*1"/><Cell N="Y" V="${f6(g.hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${f6(g.hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
      `      </Section>\n` +
      `    </Shape>`,
    );
  }

  // 4. Node shapes
  for (const n of scene.nodes) {
    const id = nodeSheetId.get(n.id)!;
    const wIn = n6(n.box.w / DPI);
    const hIn = n6(n.box.h / DPI);
    const pinX = toVisioX(n.box.x + n.box.w / 2);
    const pinY = toVisioY(n.box.y + n.box.h / 2);
    const key = `node:${n.id}`;
    const conns = connsByKey.get(key) ?? [];
    placed.set(key, { sheetId: id, pinX, pinY, wIn, hIn, conns });

    const isFocal = n.focal;
    const fill = isFocal ? P.focalFill : P.cardFill;
    const stroke = isFocal
      ? P.focalBorder
      : scene.type === "flowchart"
        ? P.structure
        : P.cardBorder;
    const radIn = n.shape === "decision" ? 0 : n.shape === "terminal" ? n6(hIn / 2) : n6(8 / DPI);
    const horzAlign = n.shape === "decision" || n.shape === "terminal" || n.shape === "participant" ? 1 : 0;
    const vertAlign = n.shape === "table" ? 0 : 1;

    if (n.shape === "table") {
      // Schema table as a Visio Group: the outer Group holds the Connection rows so FK connectors glue
      // directly to the table, while child shapes place the card frame, header divider, header name,
      // each column row (aligned to exact row.y / row.h), and optional "+ N more" footer.
      const connRowsXml = renderConnectionRows(conns, wIn, hIn);
      const geomXml = buildNodeGeometryXml(n, wIn, hIn);
      const childShapes: string[] = [];
      const frameId = nextId++;
      const nameColor = isFocal ? P.focalInk : P.textPrimary;
      const kindColor = isFocal ? P.focalQuiet : P.textTertiary;
      const detailColor = isFocal ? P.focalQuiet : P.textSecondary;

      // Child 0: card background + border + header divider
      childShapes.push(
        `        <Shape ID="${frameId}" NameU="TableFrame_${escXml(n.id)}" Name="${escXml(n.name)}" Type="Shape">\n` +
        `          <Cell N="PinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
        `          <Cell N="PinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
        `          <Cell N="Width" V="${f6(wIn)}"/>\n` +
        `          <Cell N="Height" V="${f6(hIn)}"/>\n` +
        `          <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
        `          <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
        `          <Cell N="Angle" V="0"/>\n` +
        `          <Cell N="FillForegnd" V="${fill}"/>\n` +
        `          <Cell N="FillPattern" V="1"/>\n` +
        `          <Cell N="LineColor" V="${stroke}"/>\n` +
        `          <Cell N="LineWeight" V="${ptToIn(1)}"/>\n` +
        `          <Cell N="LinePattern" V="1"/>\n` +
        `          <Cell N="Rounding" V="${f6(radIn)}"/>\n` +
        `          <Cell N="ObjType" V="1"/>\n` +
        geomXml.replace(/^      /gm, "          ") +
        `        </Shape>`,
      );

      // Child 1: table header title
      const headerHIn = n6((n.headerH ?? 37) / DPI);
      const headerPinY = n6(hIn - headerHIn / 2);
      const headerId = nextId++;
      childShapes.push(
        `        <Shape ID="${headerId}" NameU="TableHeader_${escXml(n.id)}" Name="${escXml(n.name)}" Type="Shape">\n` +
        `          <Cell N="PinX" V="${f6(n6(wIn / 2))}"/>\n` +
        `          <Cell N="PinY" V="${f6(headerPinY)}"/>\n` +
        `          <Cell N="Width" V="${f6(wIn)}"/>\n` +
        `          <Cell N="Height" V="${f6(headerHIn)}"/>\n` +
        `          <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
        `          <Cell N="LocPinY" V="${f6(n6(headerHIn / 2))}" F="Height*0.5"/>\n` +
        `          <Cell N="Angle" V="0"/>\n` +
        `          <Cell N="FillPattern" V="0"/>\n` +
        `          <Cell N="LinePattern" V="0"/>\n` +
        `          <Cell N="VerticalAlign" V="1"/>\n` +
        `          <Cell N="LeftMargin" V="${pxToIn(12)}"/>\n` +
        `          <Cell N="RightMargin" V="${pxToIn(12)}"/>\n` +
        `          <Section N="Character">\n` +
        `            <Row IX="0"><Cell N="Font" V="1"/><Cell N="Color" V="${nameColor}"/><Cell N="Style" V="1"/><Cell N="Size" V="${ptToIn(10.5)}"/></Row>\n` +
        `          </Section>\n` +
        `          <Section N="Paragraph">\n` +
        `            <Row IX="0"><Cell N="HorzAlign" V="0"/></Row>\n` +
        `          </Section>\n` +
        `          <Text><cp IX="0"/><pp IX="0"/>${escXml(n.name)}</Text>\n` +
        `        </Shape>`,
      );

      // Child 2..k: column rows positioned at exact row.y / row.h (matching FK Connection ports)
      for (const row of n.rows ?? []) {
        const rowHIn = n6(row.h / DPI);
        const rowPinY = n6(hIn - (row.y + row.h / 2) / DPI);
        const leftId = nextId++;
        const keyPad = (row.key ?? "").padEnd(3, " ");
        childShapes.push(
          `        <Shape ID="${leftId}" NameU="Row_${escXml(n.id)}_${row.index}" Name="${escXml(row.name)}" Type="Shape">\n` +
          `          <Cell N="PinX" V="${f6(n6(wIn / 2))}"/>\n` +
          `          <Cell N="PinY" V="${f6(rowPinY)}"/>\n` +
          `          <Cell N="Width" V="${f6(wIn)}"/>\n` +
          `          <Cell N="Height" V="${f6(rowHIn)}"/>\n` +
          `          <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
          `          <Cell N="LocPinY" V="${f6(n6(rowHIn / 2))}" F="Height*0.5"/>\n` +
          `          <Cell N="Angle" V="0"/>\n` +
          `          <Cell N="FillPattern" V="0"/>\n` +
          `          <Cell N="LinePattern" V="0"/>\n` +
          `          <Cell N="VerticalAlign" V="1"/>\n` +
          `          <Cell N="LeftMargin" V="${pxToIn(12)}"/>\n` +
          `          <Cell N="RightMargin" V="${pxToIn(12)}"/>\n` +
          `          <Section N="Character">\n` +
          `            <Row IX="0"><Cell N="Font" V="1"/><Cell N="Color" V="${kindColor}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(8.5)}"/></Row>\n` +
          `            <Row IX="1"><Cell N="Font" V="1"/><Cell N="Color" V="${nameColor}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>\n` +
          `          </Section>\n` +
          `          <Section N="Paragraph">\n` +
          `            <Row IX="0"><Cell N="HorzAlign" V="0"/></Row>\n` +
          `          </Section>\n` +
          `          <Text><cp IX="0"/><pp IX="0"/>${escXml(keyPad)}<cp IX="1"/>${escXml(row.name)}</Text>\n` +
          `        </Shape>`,
        );
        const rightText = row.refTable ? `→ ${row.refTable}` : row.type ?? "";
        if (rightText) {
          const rightId = nextId++;
          childShapes.push(
            `        <Shape ID="${rightId}" NameU="RowType_${escXml(n.id)}_${row.index}" Name="${escXml(rightText)}" Type="Shape">\n` +
            `          <Cell N="PinX" V="${f6(n6(wIn / 2))}"/>\n` +
            `          <Cell N="PinY" V="${f6(rowPinY)}"/>\n` +
            `          <Cell N="Width" V="${f6(wIn)}"/>\n` +
            `          <Cell N="Height" V="${f6(rowHIn)}"/>\n` +
            `          <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
            `          <Cell N="LocPinY" V="${f6(n6(rowHIn / 2))}" F="Height*0.5"/>\n` +
            `          <Cell N="Angle" V="0"/>\n` +
            `          <Cell N="FillPattern" V="0"/>\n` +
            `          <Cell N="LinePattern" V="0"/>\n` +
            `          <Cell N="VerticalAlign" V="1"/>\n` +
            `          <Cell N="LeftMargin" V="${pxToIn(12)}"/>\n` +
            `          <Cell N="RightMargin" V="${pxToIn(12)}"/>\n` +
            `          <Section N="Character">\n` +
            `            <Row IX="0"><Cell N="Font" V="1"/><Cell N="Color" V="${row.refTable ? detailColor : kindColor}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(8.5)}"/></Row>\n` +
            `          </Section>\n` +
            `          <Section N="Paragraph">\n` +
            `            <Row IX="0"><Cell N="HorzAlign" V="2"/></Row>\n` +
            `          </Section>\n` +
            `          <Text><cp IX="0"/><pp IX="0"/>${escXml(rightText)}</Text>\n` +
            `        </Shape>`,
          );
        }
      }

      if (n.more) {
        const lastRow = n.rows?.[n.rows.length - 1];
        const moreTop = lastRow ? lastRow.y + lastRow.h + 2 : (n.headerH ?? 37) + 4;
        const moreHIn = n6(20 / DPI);
        const morePinY = n6(hIn - (moreTop + 10) / DPI);
        const moreId = nextId++;
        childShapes.push(
          `        <Shape ID="${moreId}" NameU="More_${escXml(n.id)}" Name="+ ${n.more} more" Type="Shape">\n` +
          `          <Cell N="PinX" V="${f6(n6(wIn / 2))}"/>\n` +
          `          <Cell N="PinY" V="${f6(morePinY)}"/>\n` +
          `          <Cell N="Width" V="${f6(wIn)}"/>\n` +
          `          <Cell N="Height" V="${f6(moreHIn)}"/>\n` +
          `          <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
          `          <Cell N="LocPinY" V="${f6(n6(moreHIn / 2))}" F="Height*0.5"/>\n` +
          `          <Cell N="Angle" V="0"/>\n` +
          `          <Cell N="FillPattern" V="0"/>\n` +
          `          <Cell N="LinePattern" V="0"/>\n` +
          `          <Cell N="VerticalAlign" V="1"/>\n` +
          `          <Cell N="LeftMargin" V="${pxToIn(12)}"/>\n` +
          `          <Section N="Character">\n` +
          `            <Row IX="0"><Cell N="Font" V="0"/><Cell N="Color" V="${kindColor}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(8.5)}"/></Row>\n` +
          `          </Section>\n` +
          `          <Section N="Paragraph">\n` +
          `            <Row IX="0"><Cell N="HorzAlign" V="0"/></Row>\n` +
          `          </Section>\n` +
          `          <Text><cp IX="0"/><pp IX="0"/>${escXml(`+ ${n.more} more`)}</Text>\n` +
          `        </Shape>`,
        );
      }

      shapeXml.push(
        `    <Shape ID="${id}" NameU="Node_${escXml(n.id)}" Name="${escXml(n.name)}" Type="Group">\n` +
        `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
        `      <Cell N="PinY" V="${f6(pinY)}"/>\n` +
        `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
        `      <Cell N="Height" V="${f6(hIn)}"/>\n` +
        `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
        `      <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
        `      <Cell N="Angle" V="0"/>\n` +
        `      <Cell N="FlipX" V="0"/>\n` +
        `      <Cell N="FlipY" V="0"/>\n` +
        `      <Cell N="FillPattern" V="0"/>\n` +
        `      <Cell N="LinePattern" V="0"/>\n` +
        `      <Cell N="ObjType" V="1"/>\n` +
        connRowsXml +
        `      <Shapes>\n` +
        `${childShapes.join("\n")}\n` +
        `      </Shapes>\n` +
        `    </Shape>`,
      );
      continue;
    }

    const { charRows, textRuns } = buildNodeTextRuns(n, P);
    const connRowsXml = renderConnectionRows(conns, wIn, hIn);
    const geomXml = buildNodeGeometryXml(n, wIn, hIn);
    const parentGroupId = n.group ? groupSheetId.get(n.group) : undefined;
    const memberRelCell = parentGroupId
      ? `      <Cell N="Relationships" V="0" F="SUM(DEPENDSON(4,Sheet.${parentGroupId}!SheetRef()))"/>\n`
      : "";

    shapeXml.push(
      `    <Shape ID="${id}" NameU="Node_${escXml(n.id)}" Name="${escXml(n.name)}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(pinX)}"/>\n` +
      `      <Cell N="PinY" V="${f6(pinY)}"/>\n` +
      `      <Cell N="Width" V="${f6(wIn)}"/>\n` +
      `      <Cell N="Height" V="${f6(hIn)}"/>\n` +
      `      <Cell N="LocPinX" V="${f6(n6(wIn / 2))}" F="Width*0.5"/>\n` +
      `      <Cell N="LocPinY" V="${f6(n6(hIn / 2))}" F="Height*0.5"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FlipX" V="0"/>\n` +
      `      <Cell N="FlipY" V="0"/>\n` +
      `      <Cell N="FillForegnd" V="${fill}"/>\n` +
      `      <Cell N="FillPattern" V="1"/>\n` +
      `      <Cell N="LineColor" V="${stroke}"/>\n` +
      `      <Cell N="LineWeight" V="${ptToIn(1)}"/>\n` +
      `      <Cell N="LinePattern" V="1"/>\n` +
      `      <Cell N="Rounding" V="${f6(radIn)}"${n.shape === "terminal" ? ' F="Height*0.5"' : ""}/>\n` +
      `      <Cell N="VerticalAlign" V="${vertAlign}"/>\n` +
      `      <Cell N="LeftMargin" V="${pxToIn(n.shape === "terminal" ? 16 : n.shape === "participant" && n.mark ? 24 : 12)}"/>\n` +
      `      <Cell N="RightMargin" V="${pxToIn(n.shape === "terminal" ? 16 : n.mark ? 24 : 12)}"/>\n` +
      `      <Cell N="TopMargin" V="${pxToIn(8)}"/>\n` +
      `      <Cell N="BottomMargin" V="${pxToIn(8)}"/>\n` +
      `      <Cell N="ObjType" V="1"/>\n` +
      memberRelCell +
      `      <Section N="Character">\n` +
      `${charRows.join("\n")}\n` +
      `      </Section>\n` +
      `      <Section N="Paragraph">\n` +
      `        <Row IX="0"><Cell N="HorzAlign" V="${horzAlign}"/></Row>\n` +
      `      </Section>\n` +
      connRowsXml +
      geomXml +
      `      <Text>${textRuns.join("")}</Text>\n` +
      `    </Shape>`,
    );

    if (n.mark) {
      if (n.mark.attribution && !attributions.includes(n.mark.attribution)) attributions.push(n.mark.attribution);
      const markId = nextId++;
      const rId = `rId${mediaFiles.length + 1}`;
      const fileName = `mark_${mediaFiles.length + 1}.svg`;
      const useDarkForm = isFocal ? singleTheme === "light" : singleTheme === "dark";
      mediaFiles.push({ rId, fileName, svg: useDarkForm ? n.mark.svgDark : n.mark.svgLight });
      const mw = n6(16 / DPI);
      const mh = n6(16 / DPI);
      const mPinX = toVisioX(n.box.x + n.box.w - 12 - 8);
      const mPinY = toVisioY(n.box.y + 10 + 8);
      shapeXml.push(
        `    <Shape ID="${markId}" NameU="Mark_${escXml(n.id)}" Name="${escXml(n.mark.id)}" Type="Foreign">\n` +
        `      <Cell N="PinX" V="${f6(mPinX)}"/>\n` +
        `      <Cell N="PinY" V="${f6(mPinY)}"/>\n` +
        `      <Cell N="Width" V="${f6(mw)}"/>\n` +
        `      <Cell N="Height" V="${f6(mh)}"/>\n` +
        `      <Cell N="LocPinX" V="${f6(n6(mw / 2))}" F="Width*0.5"/>\n` +
        `      <Cell N="LocPinY" V="${f6(n6(mh / 2))}" F="Height*0.5"/>\n` +
        `      <Cell N="ImgOffsetX" V="0"/>\n` +
        `      <Cell N="ImgOffsetY" V="0"/>\n` +
        `      <Cell N="ImgWidth" V="${f6(mw)}" F="Width*1"/>\n` +
        `      <Cell N="ImgHeight" V="${f6(mh)}" F="Height*1"/>\n` +
        `      <Cell N="LinePattern" V="0"/>\n` +
        `      <Cell N="FillPattern" V="0"/>\n` +
        `      <ForeignData ForeignType="Bitmap" CompressionType="SVG">\n` +
        `        <Rel r:id="${rId}"/>\n` +
        `      </ForeignData>\n` +
        `    </Shape>`,
      );
    }
  }

  // 5. 1-D Connectors: ONE Shape per Basalt edge, snapped in Visio inches to exact Connection coordinates
  for (let idx = 0; idx < scene.edges.length; idx++) {
    const e = scene.edges[idx]!;
    const ec = edgeConns[idx]!;
    const fromPlaced = placed.get(ec.fromKey);
    const toPlaced = placed.get(ec.toKey);
    if (!fromPlaced || !toPlaced) continue;
    const fromConn = fromPlaced.conns[ec.fromIx]!;
    const toConn = toPlaced.conns[ec.toIx]!;

    // Exact start and end in Visio inches from the placed shape's Connection rows (eliminates RunTask jog)
    const p0 = connectionPagePt(fromPlaced, fromConn);
    const pN = connectionPagePt(toPlaced, toConn);
    const rawVisioPts: Pt[] = e.pts.map((pt) => ({ x: toVisioX(pt.x), y: toVisioY(pt.y) }));
    const vPts = snapRouteToPorts(rawVisioPts, p0, pN, e.fromPort.side, e.toPort.side);

    const wIn = n6(pN.x - p0.x);
    const hIn = n6(pN.y - p0.y);
    const pinX = n6((p0.x + pN.x) / 2);
    const pinY = n6((p0.y + pN.y) / 2);
    const locPinX = n6(wIn * 0.5);
    const locPinY = n6(hIn * 0.5);

    const id = nextId++;
    const isMain = e.kind === "main";
    const isDashed = e.kind === "dashed";
    const lineColor = isMain ? P.edgeMain : P.edgePlain;
    const lineWeight = isMain ? ptToIn(1.5) : ptToIn(0.75);
    const linePattern = isDashed ? 2 : 1;
    const beginArrow = e.card ? VSDX_CARD[e.card.from] : e.fk ? 10 : 0; // crow's-foot codes 25/28/29/30, or 10 = filled circle dot for FK origin
    const endArrow = e.card ? VSDX_CARD[e.card.to] : e.openTip ? 1 : 4; // crow's-foot codes, or 1 = open V, 4 = filled block triangle
    const radIn = n6((e.sequence && e.from === e.to ? 4 : 8) / DPI);

    const geomRows = vPts.map((pt, k) => {
      const lx = k === 0 ? 0 : k === vPts.length - 1 ? wIn : n6(pt.x - p0.x);
      const ly = k === 0 ? 0 : k === vPts.length - 1 ? hIn : n6(pt.y - p0.y);
      const tag = k === 0 ? "MoveTo" : "LineTo";
      return `        <Row T="${tag}" IX="${k + 1}"><Cell N="X" V="${f6(lx)}"/><Cell N="Y" V="${f6(ly)}"/></Row>`;
    }).join("\n");

    const fromOneBased = ec.fromIx + 1;
    const toOneBased = ec.toIx + 1;

    let textBlockXml = "";
    let textXml = "";
    if (e.label) {
      const lcx = n6(toVisioX(e.label.box.x + e.label.box.w / 2) - p0.x);
      const lcy = n6(toVisioY(e.label.box.y + e.label.box.h / 2) - p0.y);
      const lw = n6((e.label.box.w + 12) / DPI);
      const lh = n6(((e.label.note ? 34 : e.label.box.h) + 4) / DPI);
      const noteChar = e.label.note
        ? `\n        <Row IX="1"><Cell N="Font" V="0"/><Cell N="Color" V="${P.textTertiary}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(8.5)}"/></Row>`
        : "";
      textBlockXml =
        `      <Cell N="TxtPinX" V="${f6(lcx)}"/>\n` +
        `      <Cell N="TxtPinY" V="${f6(lcy)}"/>\n` +
        `      <Cell N="TxtWidth" V="${f6(lw)}"/>\n` +
        `      <Cell N="TxtHeight" V="${f6(lh)}"/>\n` +
        `      <Cell N="TxtLocPinX" V="${f6(n6(lw / 2))}" F="TxtWidth*0.5"/>\n` +
        `      <Cell N="TxtLocPinY" V="${f6(n6(lh / 2))}" F="TxtHeight*0.5"/>\n` +
        `      <Cell N="TextBkgnd" V="${e.label.on || e.sequence ? P.page : "0"}"/>\n` +
        `      <Section N="Character">\n` +
        `        <Row IX="0"><Cell N="Font" V="1"/><Cell N="Color" V="${e.sequence ? P.textPrimary : P.edgePlain}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>${noteChar}\n` +
        `      </Section>\n` +
        `      <Section N="Paragraph">\n` +
        `        <Row IX="0"><Cell N="HorzAlign" V="1"/></Row>\n` +
        `      </Section>\n`;
      textXml = e.label.note
        ? `      <Text><cp IX="0"/><pp IX="0"/>${escXml(e.label.text)}\n<cp IX="1"/><pp IX="0"/>${escXml(e.label.note)}</Text>\n`
        : `      <Text><cp IX="0"/><pp IX="0"/>${escXml(e.label.text)}</Text>\n`;
    }

    shapeXml.push(
      `    <Shape ID="${id}" NameU="Connector_${e.index}" Name="Dynamic connector.${e.index}" Type="Shape">\n` +
      `      <Cell N="PinX" V="${f6(pinX)}" F="GUARD((BeginX+EndX)/2)"/>\n` +
      `      <Cell N="PinY" V="${f6(pinY)}" F="GUARD((BeginY+EndY)/2)"/>\n` +
      `      <Cell N="Width" V="${f6(wIn)}" F="GUARD(EndX-BeginX)"/>\n` +
      `      <Cell N="Height" V="${f6(hIn)}" F="GUARD(EndY-BeginY)"/>\n` +
      `      <Cell N="LocPinX" V="${f6(locPinX)}" F="GUARD(Width*0.5)"/>\n` +
      `      <Cell N="LocPinY" V="${f6(locPinY)}" F="GUARD(Height*0.5)"/>\n` +
      `      <Cell N="Angle" V="0"/>\n` +
      `      <Cell N="FlipX" V="0"/>\n` +
      `      <Cell N="FlipY" V="0"/>\n` +
      `      <Cell N="BeginX" V="${f6(p0.x)}" F="PAR(PNT(Sheet.${fromPlaced.sheetId}!Connections.X${fromOneBased},Sheet.${fromPlaced.sheetId}!Connections.Y${fromOneBased}))"/>\n` +
      `      <Cell N="BeginY" V="${f6(p0.y)}" F="PAR(PNT(Sheet.${fromPlaced.sheetId}!Connections.X${fromOneBased},Sheet.${fromPlaced.sheetId}!Connections.Y${fromOneBased}))"/>\n` +
      `      <Cell N="EndX" V="${f6(pN.x)}" F="PAR(PNT(Sheet.${toPlaced.sheetId}!Connections.X${toOneBased},Sheet.${toPlaced.sheetId}!Connections.Y${toOneBased}))"/>\n` +
      `      <Cell N="EndY" V="${f6(pN.y)}" F="PAR(PNT(Sheet.${toPlaced.sheetId}!Connections.X${toOneBased},Sheet.${toPlaced.sheetId}!Connections.Y${toOneBased}))"/>\n` +
      `      <Cell N="ObjType" V="2"/>\n` +
      `      <Cell N="ShapeRouteStyle" V="1"/>\n` +
      `      <Cell N="ConFixedCode" V="2"/>\n` +
      `      <Cell N="ConLineRouteExt" V="1"/>\n` +
      `      <Cell N="LineColor" V="${lineColor}"/>\n` +
      `      <Cell N="LineWeight" V="${lineWeight}"/>\n` +
      `      <Cell N="LinePattern" V="${linePattern}"/>\n` +
      `      <Cell N="Rounding" V="${f6(radIn)}"/>\n` +
      `      <Cell N="BeginArrow" V="${beginArrow}"/>\n` +
      (beginArrow ? `      <Cell N="BeginArrowSize" V="2"/>\n` : "") +
      `      <Cell N="EndArrow" V="${endArrow}"/>\n` +
      `      <Cell N="EndArrowSize" V="2"/>\n` +
      textBlockXml +
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="1"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `${geomRows}\n` +
      `      </Section>\n` +
      textXml +
      `    </Shape>`,
    );

    connectXml.push(
      `    <Connect FromSheet="${id}" FromCell="BeginX" FromPart="9" ToSheet="${fromPlaced.sheetId}" ToCell="Connections.X${fromOneBased}" ToPart="${100 + ec.fromIx}"/>`,
      `    <Connect FromSheet="${id}" FromCell="EndX" FromPart="12" ToSheet="${toPlaced.sheetId}" ToCell="Connections.X${toOneBased}" ToPart="${100 + ec.toIx}"/>`,
    );
  }

  const svgDefaultType = mediaFiles.length
    ? `  <Default Extension="svg" ContentType="image/svg+xml"/>\n`
    : "";

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n` +
    `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n` +
    `  <Default Extension="xml" ContentType="application/xml"/>\n` +
    svgDefaultType +
    `  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>\n` +
    `  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>\n` +
    `  <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>\n` +
    `</Types>\n`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
    `  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>\n` +
    `</Relationships>\n`;

  const creator = scene.measuredBy
    ? `Basalt Diagram Exporter (${scene.measuredBy})`
    : "Basalt Diagram Exporter";
  const descLine = attributions.length
    ? `    <Description>${escXml(attributions.join(" "))}</Description>\n`
    : "";
  const docXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xml:space="preserve">\n` +
    `  <DocumentProperties>\n` +
    `    <Title>${escXml(scene.title || scene.id)}</Title>\n` +
    `    <Creator>${escXml(creator)}</Creator>\n` +
    descLine +
    `  </DocumentProperties>\n` +
    `  <FaceNames>\n` +
    `    <FaceName ID="0" NameU="Geist" Name="Geist" UnicodeRanges="0 0 0 0" CharSets="0 0" Panos="0 0 0 0 0 0 0 0 0 0" Flags="325"/>\n` +
    `    <FaceName ID="1" NameU="Geist Mono" Name="Geist Mono" UnicodeRanges="0 0 0 0" CharSets="0 0" Panos="0 0 0 0 0 0 0 0 0 0" Flags="325"/>\n` +
    `  </FaceNames>\n` +
    `  <StyleSheets>\n` +
    `    <StyleSheet ID="0" NameU="No Style" Name="No Style"/>\n` +
    `  </StyleSheets>\n` +
    `</VisioDocument>\n`;

  const docRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
    `  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>\n` +
    `</Relationships>\n`;

  const pageName = escXml(scene.title || scene.id);
  const pagesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Pages xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xml:space="preserve">\n` +
    `  <Page ID="0" NameU="${pageName}" Name="${pageName}">\n` +
    `    <PageSheet LineStyle="0" FillStyle="0" TextStyle="0">\n` +
    `      <Cell N="PageWidth" V="${f6(pageWIn)}"/>\n` +
    `      <Cell N="PageHeight" V="${f6(pageHIn)}"/>\n` +
    `      <Cell N="PageScale" V="1"/>\n` +
    `      <Cell N="DrawingScale" V="1"/>\n` +
    `      <Cell N="RouteStyle" V="1"/>\n` +
    `      <Cell N="LineJumpCode" V="1"/>\n` +
    `      <Cell N="LineJumpStyle" V="1"/>\n` +
    `    </PageSheet>\n` +
    `    <Rel r:id="rId1"/>\n` +
    `  </Page>\n` +
    `</Pages>\n`;

  const pagesRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
    `  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>\n` +
    `</Relationships>\n`;

  const connectsBlock = connectXml.length
    ? `  <Connects>\n${connectXml.join("\n")}\n  </Connects>\n`
    : "";

  const page1Xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xml:space="preserve">\n` +
    `  <Shapes>\n` +
    `${shapeXml.join("\n")}\n` +
    `  </Shapes>\n` +
    connectsBlock +
    `</PageContents>\n`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "visio/document.xml", data: docXml },
    { name: "visio/_rels/document.xml.rels", data: docRels },
    { name: "visio/pages/pages.xml", data: pagesXml },
    { name: "visio/pages/_rels/pages.xml.rels", data: pagesRels },
    { name: "visio/pages/page1.xml", data: page1Xml },
  ];

  if (mediaFiles.length) {
    const page1Rels =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
      mediaFiles.map((m) => `  <Relationship Id="${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${m.fileName}"/>`).join("\n") +
      `\n</Relationships>\n`;
    entries.push({ name: "visio/pages/_rels/page1.xml.rels", data: page1Rels });
    for (const m of mediaFiles) entries.push({ name: `visio/media/${m.fileName}`, data: m.svg });
  }

  return makeDeterministicZip(entries);
}

function renderConnectionRows(conns: readonly ConnEntry[], wIn: number, hIn: number): string {
  if (!conns.length) return "";
  const fmtF = (val: number, dim: number, fallback: number): string => {
    const f = dim > 0 ? Math.max(0, Math.min(1, val / dim)) : fallback;
    return Number(f.toFixed(8)).toString();
  };
  const rows = conns.map((c) => (
    `        <Row T="Connection" IX="${c.ix}">\n` +
    `          <Cell N="X" V="${f6(c.cx)}" F="Width*${fmtF(c.cx, wIn, c.fx)}"/>\n` +
    `          <Cell N="Y" V="${f6(c.cy)}" F="Height*${fmtF(c.cy, hIn, 1 - c.fy)}"/>\n` +
    `          <Cell N="DirX" V="0"/>\n` +
    `          <Cell N="DirY" V="0"/>\n` +
    `          <Cell N="Type" V="0"/>\n` +
    `        </Row>`
  ));
  return `      <Section N="Connection">\n${rows.join("\n")}\n      </Section>\n`;
}

function buildNodeGeometryXml(n: SceneNode, wIn: number, hIn: number): string {
  if (n.shape === "decision") {
    const hw = n6(wIn / 2);
    const hh = n6(hIn / 2);
    return (
      `      <Section N="Geometry" IX="0">\n` +
      `        <Cell N="NoFill" V="0"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="${f6(hw)}" F="Width*0.5"/><Cell N="Y" V="0"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(hh)}" F="Height*0.5"/></Row>\n` +
      `        <Row T="LineTo" IX="3"><Cell N="X" V="${f6(hw)}" F="Width*0.5"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
      `        <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${f6(hh)}" F="Height*0.5"/></Row>\n` +
      `        <Row T="LineTo" IX="5"><Cell N="X" V="${f6(hw)}" F="Width*0.5"/><Cell N="Y" V="0"/></Row>\n` +
      `      </Section>\n`
    );
  }
  const rectGeom =
    `      <Section N="Geometry" IX="0">\n` +
    `        <Cell N="NoFill" V="0"/>\n` +
    `        <Cell N="NoLine" V="0"/>\n` +
    `        <Cell N="NoShow" V="0"/>\n` +
    `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
    `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="0"/></Row>\n` +
    `        <Row T="LineTo" IX="3"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
    `        <Row T="LineTo" IX="4"><Cell N="X" V="0"/><Cell N="Y" V="${f6(hIn)}" F="Height*1"/></Row>\n` +
    `        <Row T="LineTo" IX="5"><Cell N="X" V="0"/><Cell N="Y" V="0"/></Row>\n` +
    `      </Section>\n`;
  if (n.shape === "table") {
    const headerDivY = n6(Math.max(0, hIn - (n.headerH ?? 37) / DPI));
    return (
      rectGeom +
      `      <Section N="Geometry" IX="1">\n` +
      `        <Cell N="NoFill" V="1"/>\n` +
      `        <Cell N="NoLine" V="0"/>\n` +
      `        <Cell N="NoShow" V="0"/>\n` +
      `        <Row T="MoveTo" IX="1"><Cell N="X" V="0"/><Cell N="Y" V="${f6(headerDivY)}"/></Row>\n` +
      `        <Row T="LineTo" IX="2"><Cell N="X" V="${f6(wIn)}" F="Width*1"/><Cell N="Y" V="${f6(headerDivY)}"/></Row>\n` +
      `      </Section>\n`
    );
  }
  return rectGeom;
}

function buildNodeTextRuns(n: SceneNode, P: ReturnType<typeof paletteFor>): { charRows: string[]; textRuns: string[] } {
  const isFocal = n.focal;
  const kindColor = isFocal ? P.focalQuiet : P.textTertiary;
  const nameColor = isFocal ? P.focalInk : P.textPrimary;
  const detailColor = isFocal ? P.focalQuiet : P.textSecondary;
  const charRows: string[] = [];
  const textRuns: string[] = [];
  let cpIx = 0;

  if (n.kind) {
    charRows.push(`        <Row IX="${cpIx}"><Cell N="Font" V="1"/><Cell N="Color" V="${kindColor}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(8.5)}"/></Row>`);
    textRuns.push(`<cp IX="${cpIx}"/><pp IX="0"/>${escXml(n.kind)}\n`);
    cpIx++;
  }
  charRows.push(`        <Row IX="${cpIx}"><Cell N="Font" V="0"/><Cell N="Color" V="${nameColor}"/><Cell N="Style" V="${n.shape === "decision" ? 0 : 1}"/><Cell N="Size" V="${ptToIn(10.5)}"/></Row>`);
  textRuns.push(`<cp IX="${cpIx}"/><pp IX="0"/>${escXml(n.name)}${n.detail ? "\n" : ""}`);
  cpIx++;
  if (n.detail) {
    charRows.push(`        <Row IX="${cpIx}"><Cell N="Font" V="${n.detailMono ? 1 : 0}"/><Cell N="Color" V="${detailColor}"/><Cell N="Style" V="0"/><Cell N="Size" V="${ptToIn(9)}"/></Row>`);
    textRuns.push(`<cp IX="${cpIx}"/><pp IX="0"/>${escXml(n.detail)}`);
  }
  return { charRows, textRuns };
}
