// Deterministic Lucid Standard Import (.lucid ZIP + document.json) exporter (DECISIONS 311, 314).
// Conforms to https://developer.lucid.co/docs/standard-import:
//   - documentSettings.units = "px", rounding = 2 * px radius, explicit pt font-size on every text run
//   - roundedRectangleContainer (assistedLayout: false, magnetize: true), swimLanes, table, decision, terminator
//   - single glued lines (shapeEndpoint / lineEndpoint) with elbowControlPoints snapped in Lucid units
import type { Pt } from "../diagram-core";
import { paletteFor, round2, round6, snapRouteToPorts } from "./scene";
import type {
  InteropScene,
  InteropTheme,
  LucidDocument,
  LucidEndpoint,
  LucidLine,
  LucidLineText,
  LucidShape,
  LucidTableCell,
  SceneBox,
} from "./types";
import { makeDeterministicZip } from "./zip";
import type { ZipEntry } from "./zip";

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lucidId(prefix: string, raw: string): string {
  return `${prefix}_${raw.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

export interface LucidBuildResult {
  document: LucidDocument;
  images: Array<{ name: string; svg: string }>;
}

export function buildLucidPayload(scene: InteropScene, theme: InteropTheme = "light"): LucidBuildResult {
  const singleTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
  const P = paletteFor(singleTheme);
  const pad = scene.pad;
  const canvasW = Math.max(1, Math.ceil(scene.width + pad * 2));
  const canvasH = Math.max(1, Math.ceil(scene.height + pad * 2));
  const transparentFill = `${P.page}00`;

  const shapes: LucidShape[] = [];
  const lines: LucidLine[] = [];
  const images: Array<{ name: string; svg: string }> = [];
  const shapeBoxById = new Map<string, SceneBox>();
  const lifeByParticipant = new Map<string, { lineId: string; x: number; y1: number; y2: number }>();

  // 1. Architecture group containers (lowest zIndex, assistedLayout: false keeps Basalt's grid)
  for (const g of scene.groups) {
    const box: SceneBox = { x: round2(g.box.x + pad), y: round2(g.box.y + pad), w: round2(g.box.w), h: round2(g.box.h) };
    shapes.push({
      id: lucidId("group", g.id),
      type: "roundedRectangleContainer",
      boundingBox: box,
      style: {
        fill: { type: "color", color: transparentFill },
        stroke: { color: P.structure, width: 1, style: "dashed" },
        rounding: 24, // 12px radius * 2
      },
      magnetize: true,
      assistedLayout: false,
      containerTitle: {
        text: `<span style="font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 9pt; color: ${P.textSecondary}; text-align: left;">${escHtml(g.label)}</span>`,
      },
      zIndex: 0,
    });
  }

  // 2. Data-flow swimLanes container (horizontal lanes whose widths sum to exact boundingBox.h)
  if (scene.lanes.length > 0) {
    const top = round2(scene.lanes[0]!.box.y + pad);
    const left = round2(scene.lanes[0]!.box.x + pad);
    const width = round2(scene.lanes[0]!.box.w);
    const laneWidths = scene.lanes.map((l) => round2(l.box.h));
    const totalH = round2(laneWidths.reduce((a, b) => a + b, 0));
    shapes.push({
      id: "swimlanes_0",
      type: "swimLanes",
      boundingBox: { x: left, y: top, w: width, h: totalH },
      style: {
        fill: { type: "color", color: transparentFill },
        stroke: { color: P.divider, width: 1, style: "solid" },
      },
      vertical: false,
      titleBar: { height: 0, verticalText: false },
      lanes: scene.lanes.map((l, idx) => ({
        title: l.label,
        width: laneWidths[idx]!,
        headerFill: P.page,
        laneFill: transparentFill,
      })),
      magnetize: true,
      zIndex: 0,
    });
  }

  // 3. Sequence phase bands
  for (let bIdx = 0; bIdx < scene.bands.length; bIdx++) {
    const band = scene.bands[bIdx]!;
    const midY = round2(band.y + band.h / 2 + pad);
    lines.push({
      id: `band_${bIdx}`,
      lineType: "straight",
      endpoint1: { type: "positionEndpoint", style: "none", position: { x: round2(pad), y: midY } },
      endpoint2: { type: "positionEndpoint", style: "none", position: { x: round2(pad + band.w), y: midY } },
      stroke: { color: P.divider, width: 1, style: "solid" },
      text: [
        {
          text: `<span style="font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 9pt; color: ${P.textSecondary};">${escHtml(band.text)}</span>`,
          position: 0.5,
          side: "middle",
        },
      ],
      zIndex: 4,
    });
  }

  // 4. Nodes (cards, flowchart shapes, participants, schema tables)
  for (const n of scene.nodes) {
    const id = lucidId("node", n.id);
    const box: SceneBox = { x: round2(n.box.x + pad), y: round2(n.box.y + pad), w: round2(n.box.w), h: round2(n.box.h) };
    shapeBoxById.set(n.id, box);

    const isFocal = n.focal;
    const fill = isFocal ? P.focalFill : P.cardFill;
    const stroke = isFocal
      ? P.focalBorder
      : scene.type === "flowchart"
        ? P.structure
        : P.cardBorder;
    const nameColor = isFocal ? P.focalInk : P.textPrimary;
    const kindColor = isFocal ? P.focalQuiet : P.textTertiary;
    const detailColor = isFocal ? P.focalQuiet : P.textSecondary;

    if (n.shape === "table") {
      const rows = n.rows ?? [];
      const rowCount = 1 + rows.length + (n.more ? 1 : 0);
      const colCount = 3;
      const cells: LucidTableCell[] = [];
      const rowSizes: Array<{ index: number; size: number }> = [{ index: 0, size: n.headerH ?? 37 }];
      // Header row merged across all 3 columns
      cells.push({
        xPosition: 0,
        yPosition: 0,
        mergeCellsRight: 2,
        style: { fill: { type: "color", color: fill } },
        text: `<p style="text-align: left; font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 10.5pt; font-weight: bold; color: ${nameColor};">${escHtml(n.name)}</p>`,
      });
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]!;
        const yPos = r + 1;
        rowSizes.push({ index: yPos, size: round2(row.h) });
        const rightWord = row.refTable ? `→ ${row.refTable}` : row.type ?? "";
        cells.push(
          {
            xPosition: 0,
            yPosition: yPos,
            style: { fill: { type: "color", color: fill } },
            text: row.key ? `<p style="text-align: left; font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 8.5pt; color: ${kindColor};">${escHtml(row.key)}</p>` : "",
          },
          {
            xPosition: 1,
            yPosition: yPos,
            style: { fill: { type: "color", color: fill } },
            text: `<p style="text-align: left; font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 9pt; color: ${nameColor};">${escHtml(row.name)}</p>`,
          },
          {
            xPosition: 2,
            yPosition: yPos,
            style: { fill: { type: "color", color: fill } },
            text: rightWord
              ? `<p style="text-align: right; font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 8.5pt; color: ${row.refTable ? detailColor : kindColor};">${escHtml(rightWord)}</p>`
              : "",
          },
        );
      }
      if (n.more) {
        const moreIdx = rows.length + 1;
        rowSizes.push({ index: moreIdx, size: 24 });
        cells.push({
          xPosition: 0,
          yPosition: moreIdx,
          mergeCellsRight: 2,
          style: { fill: { type: "color", color: fill } },
          text: `<p style="text-align: left; font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 8.5pt; color: ${kindColor};">${escHtml(`+ ${n.more} more`)}</p>`,
        });
      }
      const keyColW = 36;
      const typeColW = Math.max(64, round2(box.w * 0.36));
      const nameColW = Math.max(60, round2(box.w - keyColW - typeColW));

      shapes.push({
        id,
        type: "table",
        boundingBox: box,
        style: {
          fill: { type: "color", color: fill },
          stroke: { color: stroke, width: 1, style: "solid" },
          textColor: nameColor,
        },
        rowCount,
        colCount,
        cells,
        userSpecifiedRows: rowSizes,
        userSpecifiedCols: [
          { index: 0, size: keyColW },
          { index: 1, size: nameColW },
          { index: 2, size: typeColW },
        ],
        verticalBorder: false,
        horizontalBorder: true,
        customData: [
          { key: "basalt_id", value: n.id },
          { key: "basalt_col", value: String(n.col) },
          { key: "basalt_row", value: String(n.row) },
        ],
        zIndex: 10,
      });
      continue;
    }

    const align = n.shape === "decision" || n.shape === "terminal" || n.shape === "participant" ? "center" : "left";
    const linesHtml: string[] = [];
    if (n.kind) {
      linesHtml.push(`<p style="text-align: ${align}; font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 8.5pt; color: ${kindColor};">${escHtml(n.kind)}</p>`);
    }
    linesHtml.push(`<p style="text-align: ${align}; font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 10.5pt;${n.shape === "decision" ? "" : " font-weight: bold;"} color: ${nameColor};">${escHtml(n.name)}</p>`);
    if (n.detail) {
      const ff = n.detailMono ? "'Geist Mono', 'Liberation Mono', monospace" : "'Geist', 'Liberation Sans', sans-serif";
      linesHtml.push(`<p style="text-align: ${align}; font-family: ${ff}; font-size: 9pt; color: ${detailColor};">${escHtml(n.detail)}</p>`);
    }

    const shapeType = n.shape === "decision" ? "decision" : n.shape === "terminal" ? "terminator" : "rectangle";
    const shapeStyle: LucidShape["style"] = {
      fill: { type: "color", color: fill },
      stroke: { color: stroke, width: 1, style: "solid" },
      textColor: nameColor,
    };
    if (shapeType === "rectangle") shapeStyle.rounding = 16; // 8px Basalt radius-md * 2

    shapes.push({
      id,
      type: shapeType,
      boundingBox: box,
      style: shapeStyle,
      text: linesHtml.join(""),
      customData: [
        { key: "basalt_id", value: n.id },
        { key: "basalt_col", value: String(n.col) },
        { key: "basalt_row", value: String(n.row) },
      ],
      zIndex: 10,
    });

    if (n.mark) {
      const fileName = `${n.mark.id.replace(/[^a-zA-Z0-9_-]/g, "_")}_${images.length + 1}.svg`;
      const useDarkForm = isFocal ? singleTheme === "light" : singleTheme === "dark";
      images.push({ name: fileName, svg: useDarkForm ? n.mark.svgDark : n.mark.svgLight });
      shapes.push({
        id: lucidId("mark", n.id),
        type: "rectangle",
        boundingBox: { x: round2(box.x + box.w - 12 - 16), y: round2(box.y + 10), w: 16, h: 16 },
        style: {
          fill: { type: "image", ref: fileName, imageScale: "fit" },
          stroke: { color: transparentFill, width: 0 },
        },
        zIndex: 15,
      });
    }
  }

  // 5. Sequence lifelines (straight dashed lines attached to participant headers)
  for (const lf of scene.lifelines) {
    const lineId = lucidId("life", lf.participantId);
    const pBox = shapeBoxById.get(lf.participantId);
    const lx = pBox ? round2(pBox.x + pBox.w / 2) : round2(lf.x + pad);
    const y1 = pBox ? round2(pBox.y + pBox.h) : round2(lf.y1 + pad);
    const y2 = round2(lf.y2 + pad);
    lifeByParticipant.set(lf.participantId, { lineId, x: lx, y1, y2 });
    lines.push({
      id: lineId,
      lineType: "straight",
      endpoint1: pBox
        ? { type: "shapeEndpoint", style: "none", shapeId: lucidId("node", lf.participantId), position: { x: 0.5, y: 1 } }
        : { type: "positionEndpoint", style: "none", position: { x: lx, y: y1 } },
      endpoint2: { type: "positionEndpoint", style: "none", position: { x: lx, y: y2 } },
      stroke: { color: P.structure, width: 1, style: "dashed" },
      zIndex: 5,
    });
  }

  // 6. Connector lines (ONE per Basalt edge, snapped in Lucid's exact px coordinates)
  for (const e of scene.edges) {
    let endpoint1: LucidEndpoint;
    let endpoint2: LucidEndpoint;
    let startPt: Pt;
    let endPt: Pt;

    if (e.sequence) {
      const lf1 = lifeByParticipant.get(e.from);
      const lf2 = lifeByParticipant.get(e.to);
      if (!lf1 || !lf2) continue;
      const pos1 = round6(e.fromPort.y);
      const pos2 = round6(e.toPort.y);
      startPt = { x: lf1.x, y: round2(lf1.y1 + pos1 * (lf1.y2 - lf1.y1)) };
      endPt = { x: lf2.x, y: round2(lf2.y1 + pos2 * (lf2.y2 - lf2.y1)) };
      endpoint1 = { type: "lineEndpoint", style: "none", lineId: lf1.lineId, position: pos1 };
      endpoint2 = { type: "lineEndpoint", style: e.openTip ? "openArrow" : "arrow", lineId: lf2.lineId, position: pos2 };
    } else {
      const srcBox = shapeBoxById.get(e.from);
      const dstBox = shapeBoxById.get(e.to);
      if (!srcBox || !dstBox) continue;
      const fx = round6(e.fromPort.x);
      const fy = round6(e.fromPort.y);
      const tx = round6(e.toPort.x);
      const ty = round6(e.toPort.y);
      startPt = { x: round2(srcBox.x + fx * srcBox.w), y: round2(srcBox.y + fy * srcBox.h) };
      endPt = { x: round2(dstBox.x + tx * dstBox.w), y: round2(dstBox.y + ty * dstBox.h) };
      endpoint1 = { type: "shapeEndpoint", style: e.fk ? "closedCircle" : "none", shapeId: lucidId("node", e.from), position: { x: fx, y: fy } };
      endpoint2 = { type: "shapeEndpoint", style: e.openTip ? "openArrow" : "arrow", shapeId: lucidId("node", e.to), position: { x: tx, y: ty } };
    }

    const rawPts: Pt[] = e.pts.map((p) => ({ x: round2(p.x + pad), y: round2(p.y + pad) }));
    const snapped = snapRouteToPorts(rawPts, startPt, endPt, e.fromPort.side, e.toPort.side);
    const innerPts = snapped.slice(1, -1);

    const isMain = e.kind === "main";
    const isDashed = e.kind === "dashed";
    const lineObj: LucidLine = {
      id: `edge_${e.index}`,
      lineType: innerPts.length > 0 ? "elbow" : "straight",
      endpoint1,
      endpoint2,
      stroke: {
        color: isMain ? P.edgeMain : P.edgePlain,
        width: isMain ? 2 : 1,
        style: isDashed ? "dashed" : "solid",
      },
      zIndex: 20,
    };

    if (innerPts.length > 0) {
      lineObj.elbowControlPoints = innerPts.map((p) => ({ x: round2(p.x), y: round2(p.y) }));
    }

    if (e.label) {
      const texts: LucidLineText[] = [
        {
          text: `<span style="font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 9pt; color: ${e.sequence ? P.textPrimary : P.edgePlain};">${escHtml(e.label.text)}</span>`,
          position: e.label.t,
          side: e.label.on ? "middle" : "top",
        },
      ];
      if (e.label.note) {
        texts.push({
          text: `<span style="font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 8.5pt; color: ${P.textTertiary};">${escHtml(e.label.note)}</span>`,
          position: e.label.t,
          side: "bottom",
        });
      }
      lineObj.text = texts;
    }

    lines.push(lineObj);
  }

  return {
    document: {
      version: 1,
      documentSettings: { units: "px" },
      pages: [
        {
          id: lucidId("page", scene.id),
          title: scene.title || scene.id,
          settings: {
            fillColor: P.page,
            infiniteCanvas: false,
            autoTiling: true,
            size: { type: "custom", w: canvasW, h: canvasH },
          },
          shapes,
          lines,
        },
      ],
    },
    images,
  };
}

export function sceneToLucidJson(scene: InteropScene, theme: InteropTheme = "light"): LucidDocument {
  return buildLucidPayload(scene, theme).document;
}

export function sceneToLucid(scene: InteropScene, theme: InteropTheme = "light"): Uint8Array {
  const { document, images } = buildLucidPayload(scene, theme);
  const entries: ZipEntry[] = [
    { name: "document.json", data: `${JSON.stringify(document, null, 2)}\n` },
    ...images.map((img) => ({ name: `images/${img.name}`, data: img.svg })),
  ];
  return makeDeterministicZip(entries);
}
