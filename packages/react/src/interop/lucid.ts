// Deterministic Lucid Standard Import (.lucid ZIP + document.json) exporter (DECISIONS 311, 314, 324, 327).
// Conforms to https://developer.lucid.co/docs/standard-import:
//   - documentSettings.units = "px", rounding = 2 * px radius, explicit pt font-size on every text run
//   - nested roundedRectangleContainer (assistedLayout: false, magnetize: true), swimLanes, table, decision, terminator
//   - sequence frames, dashed branch dividers, activation bars, and crow's-foot cardinality endpoints
//   - single glued lines (shapeEndpoint / lineEndpoint) with elbowControlPoints snapped in Lucid units
import type { DiagramCardinality, Pt } from "../diagram-core";
import { paletteFor, round2, round6, snapRouteToPorts } from "./scene";
import type {
  InteropScene,
  InteropTheme,
  LucidCustomData,
  LucidDocument,
  LucidEndpoint,
  LucidEndpointStyle,
  LucidLine,
  LucidLineText,
  LucidShape,
  LucidTableCell,
  SceneBox,
} from "./types";
import { makeDeterministicZip } from "./zip";
import type { ZipEntry } from "./zip";

const LUCID_CARD: Record<DiagramCardinality, LucidEndpointStyle> = {
  one: "exactlyOne",
  "zero-or-one": "zeroOrOne",
  "one-or-many": "oneOrMore",
  "zero-or-many": "zeroOrMore",
};

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

  // 1. Architecture group containers (outer-first zIndex 0/1, assistedLayout: false keeps Basalt's grid)
  for (const g of scene.groups) {
    const box: SceneBox = { x: round2(g.box.x + pad), y: round2(g.box.y + pad), w: round2(g.box.w), h: round2(g.box.h) };
    const groupData: LucidCustomData[] = [{ key: "basalt_group", value: g.id }];
    if (g.parent) groupData.push({ key: "basalt_parent_group", value: g.parent });
    shapes.push({
      id: lucidId("group", g.id),
      type: "roundedRectangleContainer",
      boundingBox: box,
      style: {
        fill: { type: "color", color: transparentFill },
        stroke: { color: P.structure, width: 1, style: "dashed" },
        rounding: g.depth > 1 ? 16 : 24, // 8px radius-md for nested, 12px radius-lg for outer
      },
      magnetize: true,
      assistedLayout: false,
      containerTitle: {
        text: `<span style="font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 9pt; color: ${P.textSecondary}; text-align: left;">${escHtml(g.label)}</span>`,
      },
      customData: groupData,
      zIndex: g.depth - 1,
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
  for (let nodeIdx = 0; nodeIdx < scene.nodes.length; nodeIdx++) {
    const n = scene.nodes[nodeIdx]!;
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
    const nodeCustomData: LucidCustomData[] = [
      { key: "basalt_id", value: n.id },
      { key: "basalt_col", value: String(n.col) },
      { key: "basalt_row", value: String(n.row) },
      ...(scene.measuredBy ? [{ key: "basalt_measured_by", value: scene.measuredBy }] : []),
    ];

    if (n.shape === "table") {
      const rows = n.rows ?? [];
      const rowCount = 1 + rows.length + (n.more ? 1 : 0);
      const colCount = 3;
      const cells: LucidTableCell[] = [];
      // Size header, column, and optional "+ N more" rows from the scene's actual row positions so
      // userSpecifiedRows sums to exact boundingBox.h and every FK endpoint sits on its row's center.
      const headerSize = round2(rows.length > 0 ? Math.max(20, rows[0]!.y) : box.h);
      const rowSizes: Array<{ index: number; size: number }> = [{ index: 0, size: headerSize }];
      let usedH = headerSize;
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
        const size = r < rows.length - 1
          ? round2(Math.max(16, rows[r + 1]!.y - row.y))
          : n.more
            ? round2(Math.max(16, row.h))
            : round2(Math.max(16, box.h - usedH));
        rowSizes.push({ index: yPos, size });
        usedH = round2(usedH + size);
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
        const moreSize = round2(Math.max(16, box.h - usedH));
        rowSizes.push({ index: moreIdx, size: moreSize });
        usedH = round2(usedH + moreSize);
        cells.push({
          xPosition: 0,
          yPosition: moreIdx,
          mergeCellsRight: 2,
          style: { fill: { type: "color", color: fill } },
          text: `<p style="text-align: left; font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 8.5pt; color: ${kindColor};">${escHtml(`+ ${n.more} more`)}</p>`,
        });
      }
      // Absorb any residual rounding delta on the final row so sum(userSpecifiedRows) === box.h strictly.
      const deltaH = round2(box.h - usedH);
      if (deltaH !== 0 && rowSizes.length > 0) {
        const last = rowSizes[rowSizes.length - 1]!;
        last.size = round2(Math.max(16, last.size + deltaH));
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
        customData: nodeCustomData,
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
      customData: nodeCustomData,
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
        ...(n.mark.attribution ? { customData: [{ key: "attribution", value: n.mark.attribution }] } : {}),
        zIndex: 15,
      });
    }
  }

  // 5. Sequence lifelines (straight dashed lines attached to participant headers)
  for (const lf of scene.lifelines) {
    const lineId = lucidId("life", lf.participantId);
    const pBox = shapeBoxById.get(lf.participantId);
    const lx = round2(lf.x + pad);
    const y1 = pBox ? round2(pBox.y + pBox.h) : round2(lf.y1 + pad);
    const y2 = round2(lf.y2 + pad);
    lifeByParticipant.set(lf.participantId, { lineId, x: lx, y1, y2 });
    const pFx = pBox && pBox.w > 0 ? round6(Math.max(0, Math.min(1, (lx - pBox.x) / pBox.w))) : 0.5;
    lines.push({
      id: lineId,
      lineType: "straight",
      endpoint1: pBox
        ? { type: "shapeEndpoint", style: "none", shapeId: lucidId("node", lf.participantId), position: { x: pFx, y: 1 } }
        : { type: "positionEndpoint", style: "none", position: { x: lx, y: y1 } },
      endpoint2: { type: "positionEndpoint", style: "none", position: { x: lx, y: y2 } },
      stroke: { color: P.structure, width: 1, style: "dashed" },
      zIndex: 5,
    });
  }

  // 5b. Sequence frames (opt/loop/alt containers, corner tab, header label, and dashed branch dividers)
  for (const f of scene.frames) {
    const box: SceneBox = { x: round2(f.box.x + pad), y: round2(f.box.y + pad), w: round2(f.box.w), h: round2(f.box.h) };
    const tabBox: SceneBox = { x: round2(f.tabBox.x + pad), y: round2(f.tabBox.y + pad), w: round2(f.tabBox.w), h: round2(f.tabBox.h) };
    const frameData: LucidCustomData[] = [
      { key: "basalt_frame", value: f.id },
      { key: "basalt_frame_op", value: f.operator },
    ];
    if (f.parentId) frameData.push({ key: "basalt_parent_frame", value: f.parentId });
    shapes.push({
      id: lucidId("frame", f.id),
      type: "roundedRectangleContainer",
      boundingBox: box,
      style: {
        fill: { type: "color", color: transparentFill },
        stroke: { color: P.structure, width: 1, style: "solid" },
        rounding: f.depth > 1 ? 8 : 24, // 4px radius-xs nested, 12px radius-lg outer
      },
      magnetize: false,
      assistedLayout: false,
      customData: frameData,
      zIndex: 5 + f.depth,
    });
    shapes.push({
      id: lucidId("frame_tab", f.id),
      type: "rectangle",
      boundingBox: tabBox,
      style: {
        fill: { type: "color", color: P.page },
        stroke: { color: P.structure, width: 1, style: "solid" },
        rounding: 0,
        textColor: P.textPrimary,
      },
      text: `<p style="text-align: center; font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 9pt; font-weight: 600; color: ${P.textPrimary};">${escHtml(f.operator)}</p>`,
      zIndex: 7 + f.depth,
    });
    if (f.label) {
      const lb = f.labelBox ?? {
        x: round2(f.tabBox.x + f.tabBox.w + 6),
        y: round2(f.tabBox.y + 4),
        w: round2(Math.min(Math.max(16, f.box.w - (f.tabBox.w + 12)), f.label.length * 7 + 12)),
        h: 16,
      };
      shapes.push({
        id: lucidId("frame_label", f.id),
        type: "rectangle",
        boundingBox: { x: round2(lb.x + pad), y: round2(lb.y + pad - 1), w: round2(lb.w), h: round2(Math.max(18, lb.h + 2)) },
        style: {
          fill: { type: "color", color: P.page },
          stroke: { color: transparentFill, width: 0 },
          textColor: P.textSecondary,
        },
        text: `<p style="text-align: left; font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 9pt; font-weight: 500; color: ${P.textSecondary};">${escHtml(f.label)}</p>`,
        zIndex: 7 + f.depth,
      });
    }
    f.dividers.forEach((div, k) => {
      const divY = round2(div.y + pad);
      lines.push({
        id: lucidId("frame_div", `${f.id}_${k}`),
        lineType: "straight",
        endpoint1: { type: "positionEndpoint", style: "none", position: { x: box.x, y: divY } },
        endpoint2: { type: "positionEndpoint", style: "none", position: { x: round2(box.x + box.w), y: divY } },
        stroke: { color: P.structure, width: 1, style: "dashed" },
        zIndex: 7 + f.depth,
      });
      if (div.label || f.operator === "alt") {
        const eb = div.labelBox ?? {
          x: round2(f.box.x + 6),
          y: round2(div.y + Math.max(0, (div.h - 16) / 2)),
          w: round2(Math.min(Math.max(16, f.box.w - 12), ((f.operator === "alt" ? 4 : 0) + div.label.length) * 7 + 16)),
          h: 16,
        };
        const txt = f.operator === "alt"
          ? `<span style="font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 9pt; font-weight: 400; color: ${P.textTertiary};">else</span>` +
            (div.label ? ` <span style="font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 9pt; font-weight: 500; color: ${P.textSecondary};">${escHtml(div.label)}</span>` : "")
          : `<span style="font-family: 'Geist', 'Liberation Sans', sans-serif; font-size: 9pt; font-weight: 500; color: ${P.textSecondary};">${escHtml(div.label)}</span>`;
        shapes.push({
          id: lucidId("frame_else", `${f.id}_${k}`),
          type: "rectangle",
          boundingBox: { x: round2(eb.x + pad), y: round2(eb.y + pad - 1), w: round2(eb.w), h: round2(Math.max(18, eb.h + 2)) },
          style: {
            fill: { type: "color", color: P.page },
            stroke: { color: transparentFill, width: 0 },
            textColor: P.textSecondary,
          },
          text: `<p style="text-align: left;">${txt}</p>`,
          zIndex: 8 + f.depth,
        });
      }
    });
  }

  // 5c. Sequence activation bars (rectangles above lifelines/frames, glued to message endpoints)
  const barBoxById = new Map<string, SceneBox>();
  for (const bar of scene.bars) {
    const box: SceneBox = { x: round2(bar.box.x + pad), y: round2(bar.box.y + pad), w: round2(bar.box.w), h: round2(bar.box.h) };
    barBoxById.set(bar.id, box);
    shapes.push({
      id: lucidId("bar", bar.id),
      type: "rectangle",
      boundingBox: box,
      style: {
        fill: { type: "color", color: P.cardFill },
        stroke: { color: P.structure, width: 1, style: "solid" },
        rounding: 4, // 2px radius-2xs * 2
      },
      customData: [
        { key: "basalt_bar", value: bar.id },
        { key: "basalt_participant", value: bar.participantId },
      ],
      zIndex: 9,
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
      const b1 = e.fromBarId ? barBoxById.get(e.fromBarId) : undefined;
      const b2 = e.toBarId ? barBoxById.get(e.toBarId) : undefined;
      if (b1) {
        const fx = round6(e.fromPort.x);
        const fy = round6(e.fromPort.y);
        startPt = { x: round2(b1.x + fx * b1.w), y: round2(b1.y + fy * b1.h) };
        endpoint1 = { type: "shapeEndpoint", style: "none", shapeId: lucidId("bar", e.fromBarId!), position: { x: fx, y: fy } };
      } else {
        const pos1 = round6(e.fromPort.y);
        startPt = { x: lf1.x, y: round2(lf1.y1 + pos1 * (lf1.y2 - lf1.y1)) };
        endpoint1 = { type: "lineEndpoint", style: "none", lineId: lf1.lineId, position: pos1 };
      }
      const endStyle: LucidEndpointStyle = e.openTip ? "openArrow" : "arrow";
      if (b2) {
        const tx = round6(e.toPort.x);
        const ty = round6(e.toPort.y);
        endPt = { x: round2(b2.x + tx * b2.w), y: round2(b2.y + ty * b2.h) };
        endpoint2 = { type: "shapeEndpoint", style: endStyle, shapeId: lucidId("bar", e.toBarId!), position: { x: tx, y: ty } };
      } else {
        const pos2 = round6(e.toPort.y);
        endPt = { x: lf2.x, y: round2(lf2.y1 + pos2 * (lf2.y2 - lf2.y1)) };
        endpoint2 = { type: "lineEndpoint", style: endStyle, lineId: lf2.lineId, position: pos2 };
      }
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
      const startStyle: LucidEndpointStyle = e.card ? LUCID_CARD[e.card.from] : (e.fk ? "closedCircle" : "none");
      const endStyle: LucidEndpointStyle = e.card ? LUCID_CARD[e.card.to] : (e.openTip ? "openArrow" : "arrow");
      endpoint1 = { type: "shapeEndpoint", style: startStyle, shapeId: lucidId("node", e.from), position: { x: fx, y: fy } };
      endpoint2 = { type: "shapeEndpoint", style: endStyle, shapeId: lucidId("node", e.to), position: { x: tx, y: ty } };
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
      const labelHtml = escHtml(e.label.text).replace(/\n/g, "<br>");
      const texts: LucidLineText[] = [
        {
          text: `<span style="font-family: 'Geist Mono', 'Liberation Mono', monospace; font-size: 9pt; color: ${e.sequence ? P.textPrimary : P.edgePlain};">${labelHtml}</span>`,
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
