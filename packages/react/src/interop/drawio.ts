// Deterministic draw.io (.drawio / mxGraphModel XML) exporter (DECISIONS 311, 314).
// Conforms strictly to mxfile-1.0.xsd: uncompressed XML, no XML comments, positive integer page sizes,
// real parent-child containers, one glued orthogonal edge per Basalt edge, attached edgeLabel children,
// and exact port-snapped inner waypoints so first and last segments are strictly axis-aligned.
import type { Pt } from "../diagram-core";
import { encodeSvgDataUri, paletteFor, round2, round4, round6, snapRouteToPorts } from "./scene";
import type { ThemePalette } from "./scene";
import type { InteropScene, InteropTheme, SceneBox, SceneNode } from "./types";

function escXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellStyle(parts: string[]): string {
  return `${parts.join(";")};`;
}

/** Point along an orthogonal polyline at arc-length fraction t in [0, 1]. */
function pointAtArcFraction(pts: readonly Pt[], t: number): Pt {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0]!;
  const segLen = (a: Pt, b: Pt): number => {
    const dx = b.x - a.x, dy = b.y - a.y;
    return Math.abs(dx) < 1e-9 || Math.abs(dy) < 1e-9 ? Math.abs(dx) + Math.abs(dy) : Math.sqrt(dx * dx + dy * dy);
  };
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += segLen(pts[i]!, pts[i + 1]!);
  if (total <= 0) return pts[0]!;
  const target = Math.max(0, Math.min(1, t)) * total;
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const seg = segLen(a, b);
    if (acc + seg >= target && seg > 0) {
      const f = (target - acc) / seg;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    acc += seg;
  }
  return pts[pts.length - 1]!;
}

/** Wraps two distinct light/dark ground SVG forms into one SVG switching on prefers-color-scheme. */
function adaptiveMarkSvg(lightModeSvg: string, darkModeSvg: string): string {
  const inner = (raw: string) => raw.replace(/^<svg\b/, '<svg width="16" height="16"');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">` +
    `<style>.d{display:none}@media(prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style>` +
    `<g class="l">${inner(lightModeSvg)}</g>` +
    `<g class="d">${inner(darkModeSvg)}</g>` +
    `</svg>`
  );
}

export function sceneToDrawio(scene: InteropScene, theme: InteropTheme = "light"): string {
  const adaptive = theme === "adaptive";
  const singleTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
  const L = paletteFor("light");
  const D = paletteFor("dark");
  const P = singleTheme === "dark" ? D : L;
  const col = (key: keyof ThemePalette): string => (adaptive ? `light-dark(${L[key]},${D[key]})` : P[key]);

  const pad = scene.pad;
  const pageW = Math.max(1, Math.ceil(scene.width + pad * 2));
  const pageH = Math.max(1, Math.ceil(scene.height + pad * 2));

  const cells: string[] = [];
  cells.push(`        <mxCell id="0"/>`);
  cells.push(`        <mxCell id="1" parent="0"/>`);

  // Exact emitted world boxes for every connectable vertex (used to snap waypoints in draw.io's own coordinates)
  const worldBoxByCell = new Map<string, SceneBox>();

  // 1. Groups (architecture containers, lowest z-order)
  const groupBoxes = new Map<string, SceneBox>();
  for (const g of scene.groups) {
    const box: SceneBox = { x: round2(g.box.x + pad), y: round2(g.box.y + pad), w: round2(g.box.w), h: round2(g.box.h) };
    groupBoxes.set(g.id, box);
    const style = cellStyle([
      "rounded=1",
      "absoluteArcSize=1",
      "arcSize=24",
      "whiteSpace=wrap",
      "html=1",
      "container=1",
      "collapsible=0",
      "recursiveResize=0",
      "pointerEvents=0",
      "fillColor=none",
      `strokeColor=${col("structure")}`,
      "strokeWidth=1",
      "dashed=1",
      "dashPattern=4 4",
      "verticalAlign=top",
      "align=left",
      "spacingTop=6",
      "spacingLeft=10",
      `fontColor=${col("textSecondary")}`,
      "fontFamily=Geist Mono, Consolas, monospace",
      "fontSize=12",
      "fontStyle=0",
    ]);
    cells.push(
      `        <mxCell id="group-${escXml(g.id)}" value="${escXml(g.label)}" style="${escXml(style)}" vertex="1" connectable="0" parent="1">\n` +
      `          <mxGeometry x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" as="geometry"/>\n` +
      `        </mxCell>`,
    );
  }

  // 2. Data-flow horizontal lane containers (horizontal text in the 120px left label column)
  const laneBoxes = new Map<string, SceneBox>();
  for (let k = 0; k < scene.lanes.length; k++) {
    const lane = scene.lanes[k]!;
    const box: SceneBox = { x: round2(lane.box.x + pad), y: round2(lane.box.y + pad), w: round2(lane.box.w), h: round2(lane.box.h) };
    laneBoxes.set(lane.id, box);
    const rightSpace = Math.max(0, round2(box.w - lane.labelWidth));
    const style = cellStyle([
      "rounded=0",
      "whiteSpace=wrap",
      "html=1",
      "container=1",
      "collapsible=0",
      "recursiveResize=0",
      "pointerEvents=0",
      "fillColor=none",
      `strokeColor=${col("divider")}`,
      "strokeWidth=1",
      "align=left",
      "verticalAlign=middle",
      "spacingLeft=4",
      `spacingRight=${rightSpace}`,
      `fontColor=${col("textSecondary")}`,
      "fontFamily=Geist, Inter, Helvetica, Arial",
      "fontSize=12",
      "fontStyle=0",
    ]);
    cells.push(
      `        <mxCell id="lane-${escXml(lane.id)}" value="${escXml(lane.label)}" style="${escXml(style)}" vertex="1" connectable="0" parent="1">\n` +
      `          <mxGeometry x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" as="geometry"/>\n` +
      `        </mxCell>`,
    );
  }

  // 3. Sequence lifelines & phase bands (drawn behind participant headers and messages)
  for (const lf of scene.lifelines) {
    const lx = round2(lf.x + pad);
    const y1 = round2(lf.y1 + pad);
    const h = round2(Math.max(1, lf.y2 - lf.y1));
    // Unrotated partialRectangle with left=1 only draws a crisp vertical dashed stroke at x = box.x (= lx).
    // Never use direction=south on a connectable lifeline: mxGraph rotates exitY/entryY by 90 degrees.
    const box: SceneBox = { x: lx, y: y1, w: 2, h };
    const cellId = `life-${lf.participantId}`;
    worldBoxByCell.set(cellId, box);
    const style = cellStyle([
      "shape=partialRectangle",
      "top=0",
      "bottom=0",
      "right=0",
      "left=1",
      "html=1",
      "fillColor=none",
      `strokeColor=${col("structure")}`,
      "strokeWidth=1",
      "dashed=1",
      "dashPattern=4 4",
    ]);
    cells.push(
      `        <mxCell id="${escXml(cellId)}" value="" style="${escXml(style)}" vertex="1" parent="1">\n` +
      `          <mxGeometry x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" as="geometry"/>\n` +
      `        </mxCell>`,
    );
  }

  for (let bIdx = 0; bIdx < scene.bands.length; bIdx++) {
    const band = scene.bands[bIdx]!;
    const bx = round2(pad);
    const by = round2(band.y + pad);
    const bw = round2(band.w);
    const bh = round2(band.h);
    const style = cellStyle([
      "shape=line",
      "html=1",
      "fillColor=none",
      `strokeColor=${col("divider")}`,
      "strokeWidth=1",
      "align=center",
      "verticalAlign=middle",
      `fontColor=${col("textSecondary")}`,
      "fontFamily=Geist, Inter, Helvetica, Arial",
      "fontSize=12",
      "fontStyle=0",
      "labelBackgroundColor=default",
      "defaultLabelBackgroundColor=page",
    ]);
    cells.push(
      `        <mxCell id="band-${bIdx}" value="${escXml(band.text)}" style="${escXml(style)}" vertex="1" connectable="0" parent="1">\n` +
      `          <mxGeometry x="${bx}" y="${by}" width="${bw}" height="${bh}" as="geometry"/>\n` +
      `        </mxCell>`,
    );
  }

  // 4. Nodes (cards, flowchart shapes, participants, schema tables with row cells)
  const formatCardHtml = (n: SceneNode): string => {
    const isFocal = n.focal;
    const nameColor = isFocal ? P.focalInk : P.textPrimary;
    const kindColor = isFocal ? P.focalQuiet : P.textTertiary;
    const detailColor = isFocal ? P.focalQuiet : P.textSecondary;
    const padMark = n.mark ? "padding-right:24px;" : "";

    if (n.shape === "decision") {
      return adaptive
        ? `<div style="font-family:Geist,Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;line-height:1.35;text-align:center;">${escXml(n.name)}</div>`
        : `<div style="font-family:Geist,Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;line-height:1.35;text-align:center;color:${nameColor};">${escXml(n.name)}</div>`;
    }
    const align = n.shape === "terminal" || n.shape === "participant" ? "text-align:center;" : "";
    const kindSpan = n.kind
      ? adaptive
        ? `<div style="font-family:Geist Mono,Consolas,monospace;font-size:11px;line-height:1.35;opacity:0.65;${align}${padMark}">${escXml(n.kind)}</div>`
        : `<div style="font-family:Geist Mono,Consolas,monospace;font-size:11px;line-height:1.35;color:${kindColor};${align}${padMark}">${escXml(n.kind)}</div>`
      : "";
    const namePad = !n.kind ? padMark : "";
    const nameSpan = adaptive
      ? `<div style="font-family:Geist,Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1.35;${align}${namePad}">${escXml(n.name)}</div>`
      : `<div style="font-family:Geist,Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1.35;color:${nameColor};${align}${namePad}">${escXml(n.name)}</div>`;
    const detailFont = n.detailMono ? "Geist Mono,Consolas,monospace" : "Geist,Inter,Helvetica,Arial,sans-serif";
    const detailSpan = n.detail
      ? adaptive
        ? `<div style="font-family:${detailFont};font-size:12px;line-height:1.35;opacity:0.78;margin-top:2px;${align}">${escXml(n.detail)}</div>`
        : `<div style="font-family:${detailFont};font-size:12px;line-height:1.35;color:${detailColor};margin-top:2px;${align}">${escXml(n.detail)}</div>`
      : "";
    return `${kindSpan}${nameSpan}${detailSpan}`;
  };

  for (const n of scene.nodes) {
    const worldBox: SceneBox = { x: round2(n.box.x + pad), y: round2(n.box.y + pad), w: round2(n.box.w), h: round2(n.box.h) };
    let parentId = "1";
    let parentBox: SceneBox | undefined;
    if (n.group && groupBoxes.has(n.group)) {
      parentId = `group-${n.group}`;
      parentBox = groupBoxes.get(n.group);
    } else if (n.laneId && laneBoxes.has(n.laneId)) {
      parentId = `lane-${n.laneId}`;
      parentBox = laneBoxes.get(n.laneId);
    }
    const relX = round2(worldBox.x - (parentBox ? parentBox.x : 0));
    const relY = round2(worldBox.y - (parentBox ? parentBox.y : 0));
    const cellId = `node-${n.id}`;
    worldBoxByCell.set(cellId, worldBox);

    const isFocal = n.focal;
    const fill = isFocal ? col("focalFill") : col("cardFill");
    const stroke = isFocal
      ? col("focalBorder")
      : scene.type === "flowchart"
        ? col("structure")
        : col("cardBorder");

    if (n.shape === "table") {
      // Schema table: container vertex with header + child column row vertices so FK edges glue straight to row cells
      const headerH = n.headerH ?? 37;
      const style = cellStyle([
        "swimlane",
        "horizontal=1",
        `startSize=${headerH}`,
        "collapsible=0",
        "recursiveResize=0",
        "rounded=1",
        "absoluteArcSize=1",
        "arcSize=16",
        "whiteSpace=wrap",
        "html=1",
        `fillColor=${fill}`,
        `swimlaneFillColor=${fill}`,
        `strokeColor=${stroke}`,
        "strokeWidth=1",
        `fontColor=${isFocal ? col("focalInk") : col("textPrimary")}`,
        "fontFamily=Geist Mono, Consolas, monospace",
        "fontSize=14",
        "fontStyle=1",
        "align=left",
        "spacingLeft=12",
      ]);
      cells.push(
        `        <mxCell id="${escXml(cellId)}" value="${escXml(n.name)}" style="${escXml(style)}" vertex="1" parent="${escXml(parentId)}">\n` +
        `          <mxGeometry x="${relX}" y="${relY}" width="${worldBox.w}" height="${worldBox.h}" as="geometry"/>\n` +
        `        </mxCell>`,
      );

      for (const row of n.rows ?? []) {
        const rowCellId = `row-${n.id}-${row.index}`;
        const rowRelY = round2(row.y);
        const rowH = round2(row.h);
        const rowWorld: SceneBox = { x: worldBox.x, y: round2(worldBox.y + rowRelY), w: worldBox.w, h: rowH };
        worldBoxByCell.set(rowCellId, rowWorld);

        const innerW = Math.max(40, round2(worldBox.w - 28));
        const rightWord = row.refTable ? `→ ${row.refTable}` : row.type ?? "";
        const keyCss = adaptive
          ? "opacity:0.65;"
          : `color:${isFocal ? P.focalQuiet : P.textTertiary};`;
        const nameCss = adaptive ? "" : `color:${isFocal ? P.focalInk : P.textPrimary};`;
        const typeCss = adaptive
          ? `opacity:${row.refTable ? "0.78" : "0.65"};`
          : `color:${isFocal ? P.focalQuiet : row.refTable ? P.textSecondary : P.textTertiary};`;
        const rowHtml =
          `<table style="width:${innerW}px;border-collapse:collapse;font-family:Geist Mono,Consolas,monospace;font-size:12px;line-height:1.35;">` +
          `<tr>` +
          `<td style="width:24px;padding:0;text-align:left;white-space:nowrap;${keyCss}">${row.key ? escXml(row.key) : ""}</td>` +
          `<td style="padding:0 6px 0 0;text-align:left;white-space:nowrap;${nameCss}">${escXml(row.name)}</td>` +
          `<td style="padding:0;text-align:right;white-space:nowrap;${typeCss}">${escXml(rightWord)}</td>` +
          `</tr></table>`;
        const rowStyle = cellStyle([
          "text",
          "html=1",
          "whiteSpace=wrap",
          "overflow=hidden",
          "strokeColor=none",
          "fillColor=none",
          "align=left",
          "verticalAlign=middle",
          "spacingLeft=12",
          "spacingRight=12",
          "spacingTop=0",
          "spacingBottom=0",
          `fontColor=${isFocal ? col("focalInk") : col("textPrimary")}`,
          "fontFamily=Geist Mono, Consolas, monospace",
          "fontSize=12",
        ]);
        cells.push(
          `        <mxCell id="${escXml(rowCellId)}" value="${escXml(rowHtml)}" style="${escXml(rowStyle)}" vertex="1" parent="${escXml(cellId)}">\n` +
          `          <mxGeometry x="0" y="${rowRelY}" width="${worldBox.w}" height="${rowH}" as="geometry"/>\n` +
          `        </mxCell>`,
        );
      }

      if (n.more) {
        const lastRow = n.rows?.[n.rows.length - 1];
        const moreY = round2(lastRow ? lastRow.y + lastRow.h + 2 : headerH + 4);
        const moreStyle = cellStyle([
          "text",
          "html=1",
          "strokeColor=none",
          "fillColor=none",
          "align=left",
          "verticalAlign=middle",
          "spacingLeft=12",
          `fontColor=${isFocal ? col("focalQuiet") : col("textTertiary")}`,
          "fontFamily=Geist, Inter, Helvetica, Arial",
          "fontSize=12",
        ]);
        cells.push(
          `        <mxCell id="more-${escXml(n.id)}" value="${escXml(`+ ${n.more} more`)}" style="${escXml(moreStyle)}" vertex="1" connectable="0" parent="${escXml(cellId)}">\n` +
          `          <mxGeometry x="0" y="${moreY}" width="${worldBox.w}" height="20" as="geometry"/>\n` +
          `        </mxCell>`,
        );
      }
      continue;
    }

    const shapeParts: string[] = [];
    if (n.shape === "decision") {
      shapeParts.push("rhombus", "perimeter=rhombusPerimeter", "whiteSpace=wrap", "html=1", "align=center", "verticalAlign=middle", "spacingLeft=10", "spacingRight=10");
    } else if (n.shape === "terminal") {
      shapeParts.push("rounded=1", "arcSize=50", "whiteSpace=wrap", "html=1", "align=center", "verticalAlign=middle", "spacingLeft=16", "spacingRight=16", "spacingTop=8", "spacingBottom=8");
    } else if (n.shape === "participant") {
      shapeParts.push("rounded=1", "absoluteArcSize=1", "arcSize=16", "whiteSpace=wrap", "html=1", "align=center", "verticalAlign=middle", "spacingLeft=12", "spacingRight=12", "spacingTop=8", "spacingBottom=8");
    } else {
      shapeParts.push("rounded=1", "absoluteArcSize=1", "arcSize=16", "whiteSpace=wrap", "html=1", "align=left", "verticalAlign=middle", "spacingLeft=12", "spacingRight=12", "spacingTop=8", "spacingBottom=8");
    }
    shapeParts.push(
      `fillColor=${fill}`,
      `strokeColor=${stroke}`,
      "strokeWidth=1",
      `fontColor=${isFocal ? col("focalInk") : col("textPrimary")}`,
      "fontFamily=Geist, Inter, Helvetica, Arial",
      "fontSize=14",
    );

    cells.push(
      `        <mxCell id="${escXml(cellId)}" value="${escXml(formatCardHtml(n))}" style="${escXml(cellStyle(shapeParts))}" vertex="1" parent="${escXml(parentId)}">\n` +
      `          <mxGeometry x="${relX}" y="${relY}" width="${worldBox.w}" height="${worldBox.h}" as="geometry"/>\n` +
      `        </mxCell>`,
    );

    // Embedded service mark (only when marks: "embed" and allowed by manifest terms)
    if (n.mark) {
      // Focal card uses the opposite theme's mark form because its fill is inverted.
      const lightModeSvg = isFocal ? n.mark.svgDark : n.mark.svgLight;
      const darkModeSvg = isFocal ? n.mark.svgLight : n.mark.svgDark;
      const svg = adaptive && lightModeSvg !== darkModeSvg
        ? adaptiveMarkSvg(lightModeSvg, darkModeSvg)
        : singleTheme === "dark"
          ? darkModeSvg
          : lightModeSvg;
      const uri = encodeSvgDataUri(svg);
      const mx = round2(Math.max(4, worldBox.w - 12 - 16));
      const markStyle = cellStyle([
        "shape=image",
        "verticalLabelPosition=bottom",
        "verticalAlign=top",
        "imageAspect=1",
        "aspect=fixed",
        "strokeColor=none",
        "fillColor=none",
        `image=${uri}`,
      ]);
      cells.push(
        `        <mxCell id="mark-${escXml(n.id)}" value="" style="${escXml(markStyle)}" vertex="1" connectable="0" parent="${escXml(cellId)}">\n` +
        `          <mxGeometry x="${mx}" y="10" width="16" height="16" as="geometry"/>\n` +
        `        </mxCell>`,
      );
    }
  }

  // 5. Edges: ONE glued orthogonal mxCell per Basalt edge, parent="1" so waypoints live in page coordinates
  for (const e of scene.edges) {
    const srcCellId = e.sequence
      ? `life-${e.from}`
      : e.fk && e.fromRow !== undefined && worldBoxByCell.has(`row-${e.from}-${e.fromRow}`)
        ? `row-${e.from}-${e.fromRow}`
        : `node-${e.from}`;
    const dstCellId = e.sequence
      ? `life-${e.to}`
      : e.fk && e.toRow !== undefined && worldBoxByCell.has(`row-${e.to}-${e.toRow}`)
        ? `row-${e.to}-${e.toRow}`
        : `node-${e.to}`;

    const srcBox = worldBoxByCell.get(srcCellId);
    const dstBox = worldBoxByCell.get(dstCellId);
    if (!srcBox || !dstBox) continue;

    // Exact exit/entry fractional ports on the referenced cell
    const exitX = e.sequence ? 0 : round6(e.fromPort.x);
    const exitY = e.fk && srcCellId.startsWith("row-") ? 0.5 : round6(e.fromPort.y);
    const entryX = e.sequence ? 0 : round6(e.toPort.x);
    const entryY = e.fk && dstCellId.startsWith("row-") ? 0.5 : round6(e.toPort.y);

    // Compute exact port coordinates in draw.io's page coordinates and snap waypoints to them
    const startPt: Pt = { x: round2(srcBox.x + exitX * srcBox.w), y: round2(srcBox.y + exitY * srcBox.h) };
    const endPt: Pt = { x: round2(dstBox.x + entryX * dstBox.w), y: round2(dstBox.y + entryY * dstBox.h) };
    const rawPts: Pt[] = e.pts.map((p) => ({ x: round2(p.x + pad), y: round2(p.y + pad) }));
    const snapped = snapRouteToPorts(rawPts, startPt, endPt, e.fromPort.side, e.toPort.side);

    const isMain = e.kind === "main";
    const isDashed = e.kind === "dashed";
    const strokeColor = isMain ? col("edgeMain") : col("edgePlain");
    const strokeWidth = isMain ? 2 : 1;
    const endArrow = e.openTip ? "open" : "block";
    const endFill = e.openTip ? 0 : 1;

    const styleParts = [
      e.sequence ? "edgeStyle=none" : "edgeStyle=orthogonalEdgeStyle",
      "rounded=1",
      "absoluteArcSize=1",
      `arcSize=${e.sequence && e.from === e.to ? 8 : 16}`,
      ...(e.sequence ? [] : ["orthogonalLoop=1", "jettySize=auto"]),
      "html=1",
      `strokeColor=${strokeColor}`,
      `strokeWidth=${strokeWidth}`,
      `endArrow=${endArrow}`,
      `endFill=${endFill}`,
      "endSize=6",
      ...(e.fk ? ["startArrow=oval", "startFill=1", "startSize=6"] : ["startArrow=none", "startFill=0"]),
      `exitX=${exitX}`,
      `exitY=${exitY}`,
      "exitDx=0",
      "exitDy=0",
      "exitPerimeter=0",
      `entryX=${entryX}`,
      `entryY=${entryY}`,
      "entryDx=0",
      "entryDy=0",
      "entryPerimeter=0",
      "jumpStyle=gap",
      "jumpSize=6",
      `fontColor=${col("edgePlain")}`,
      "fontFamily=Geist Mono, Consolas, monospace",
      "fontSize=12",
      "labelBackgroundColor=default",
      "defaultLabelBackgroundColor=page",
    ];
    if (isDashed) styleParts.push("dashed=1", "dashPattern=6 4");

    const innerPts = snapped.slice(1, -1);
    const ptsXml = innerPts.length
      ? `\n            <Array as="points">\n` +
        innerPts.map((p) => `              <mxPoint x="${round2(p.x)}" y="${round2(p.y)}"/>`).join("\n") +
        `\n            </Array>`
      : "";

    const edgeId = `edge-${e.index}`;
    cells.push(
      `        <mxCell id="${edgeId}" value="" style="${escXml(cellStyle(styleParts))}" edge="1" parent="1" source="${escXml(srcCellId)}" target="${escXml(dstCellId)}">\n` +
      `          <mxGeometry relative="1" as="geometry">${ptsXml}\n` +
      `          </mxGeometry>\n` +
      `        </mxCell>`,
    );

    if (e.label) {
      const relX = round4(e.label.t * 2 - 1);
      // Position labels via screen-space offset from the exact point at arc-fraction t (never edge-normal y,
      // which flips sign on right-to-left edges).
      const ptAtT = pointAtArcFraction(snapped, e.label.t);
      const labelCx = e.label.box.x + pad + e.label.box.w / 2;
      const labelCy = e.label.box.y + pad + e.label.box.h / 2;
      const offX = e.label.on ? 0 : round2(labelCx - ptAtT.x);
      const offY = e.label.on ? 0 : round2(labelCy - ptAtT.y);
      const offsetPt = offX === 0 && offY === 0
        ? `            <mxPoint as="offset"/>`
        : `            <mxPoint x="${offX}" y="${offY}" as="offset"/>`;
      const lblBg = e.label.on || e.sequence
        ? "labelBackgroundColor=default;defaultLabelBackgroundColor=page"
        : "labelBackgroundColor=none";
      const lblValue = e.label.note
        ? `<div style="font-family:Geist Mono,Consolas,monospace;font-size:12px;line-height:1.35;text-align:center;">${escXml(e.label.text)}</div>` +
          `<div style="font-family:Geist,Inter,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.3;text-align:center;${adaptive ? "opacity:0.65;" : `color:${P.textTertiary};`}">${escXml(e.label.note)}</div>`
        : escXml(e.label.text);
      const lblStyle = cellStyle([
        "edgeLabel",
        "html=1",
        "align=center",
        "verticalAlign=middle",
        "resizable=0",
        "points=[]",
        `fontColor=${e.sequence ? col("textPrimary") : col("edgePlain")}`,
        "fontFamily=Geist Mono, Consolas, monospace",
        "fontSize=12",
        lblBg,
      ]);
      cells.push(
        `        <mxCell id="label-${e.index}" value="${escXml(lblValue)}" style="${escXml(lblStyle)}" vertex="1" connectable="0" parent="${edgeId}">\n` +
        `          <mxGeometry x="${relX}" y="0" relative="1" as="geometry">\n` +
        `${offsetPt}\n` +
        `          </mxGeometry>\n` +
        `        </mxCell>`,
      );
    }
  }

  const bgAttr = adaptive ? "" : ` background="${P.page}"`;
  const adaptiveAttr = adaptive ? ` adaptiveColors="auto"` : ` adaptiveColors="none"`;

  return (
    `<mxfile compressed="false">\n` +
    `  <diagram id="${escXml(scene.id)}" name="${escXml(scene.title || scene.id)}">\n` +
    `    <mxGraphModel dx="0" dy="0" grid="1" gridSize="8" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0"${bgAttr}${adaptiveAttr}>\n` +
    `      <root>\n` +
    `${cells.join("\n")}\n` +
    `      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>\n` +
    `</mxfile>\n`
  );
}
