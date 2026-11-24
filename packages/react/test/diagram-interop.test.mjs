// Tests for @srasyndicate/basalt/diagram-interop and basalt-diagram-export CLI (DECISIONS 311, 314).
// Covers:
//   - Byte-identical SHA-256 determinism for all 5 CIMIP fixtures across .drawio, .vsdx, .lucid and Lucid JSON
//   - Official draw.io XSD validation (mxfile-1.0.xsd) across all 5 figures and light/dark/adaptive themes
//   - Visio .vsdx OPC parts, XML well-formedness, Connects glue, ConFixedCode=2, and zero-drift port snapping
//   - Lucid Standard Import JSON contract (containers, swimLanes, tables, lineEndpoints, elbowControlPoints, labels)
//   - Exact port axis-alignment invariant for every first and last segment (fixes the RunTask jog) across all 5 figures x 3 formats
//   - Live DOM measured Geo entry (exportMeasuredDiagram + readMeasuredExtras) on all 5 CIMIP React figures
//   - Mark terms policy against packages/react/marks/manifest.json (default omit; embed only manifest-permitted marks)
//   - CLI end-to-end (single JSON, multi-diagram JSON, HTML script[data-diagram], flags, errors)
//   - Subpath isolation (outside root index, no "use client", no React/third-party deps)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(pkg, "..", "..");
const CIMIP = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cimip-diagrams.json"), "utf8"));
const CIMIP_KEYS = Object.keys(CIMIP);
const XSD = path.join(here, "fixtures", "mxfile-1.0.xsd");
const CLI = path.join(pkg, "bin", "basalt-diagram-export.mjs");
const interop = await import(pathToFileURL(path.join(pkg, "dist", "diagram-interop.js")).href);

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

function xmllint(xml, schema = null) {
  const args = ["--noout"];
  if (schema) args.push("--schema", schema);
  args.push("-");
  const res = spawnSync("xmllint", args, { input: xml, encoding: "utf8" });
  return { ok: res.status === 0, stderr: (res.stderr || "").trim() };
}

/** Minimal store-mode ZIP parser (verifies local/central headers, CRC-32, and fixed 1980-01-01 timestamps). */
function readZipEntries(bytes) {
  const buf = Buffer.from(bytes);
  // Find EOCD
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.ok(eocd >= 0, "ZIP EOCD signature missing");
  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  let p = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    assert.equal(buf.readUInt32LE(p), 0x02014b50, `central dir sig at entry ${i}`);
    const method = buf.readUInt16LE(p + 10);
    const modTime = buf.readUInt16LE(p + 12);
    const modDate = buf.readUInt16LE(p + 14);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    assert.equal(method, 0, `${name}: expected store method 0`);
    assert.equal(modTime, 0x0000, `${name}: expected fixed DOS time 00:00:00`);
    assert.equal(modDate, 0x0021, `${name}: expected fixed DOS date 1980-01-01`);
    assert.equal(compSize, uncompSize, `${name}: store sizes must match`);
    assert.equal(buf.readUInt32LE(localOff), 0x04034b50, `${name}: local header sig`);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    entries.set(name, buf.subarray(dataStart, dataStart + uncompSize));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function expectedEdgeCount(spec) {
  if (spec.type === "sequence") return spec.steps.filter((s) => !("band" in s)).length;
  if (spec.type === "schema") {
    const byName = new Map(spec.tables.map((t) => [t.name, t]));
    let n = 0;
    for (const t of spec.tables) {
      for (const c of t.columns) {
        if (!c.references) continue;
        const target = byName.get(c.references.split(".")[0]);
        if (target && Math.abs(target.col - t.col) <= 1) n++;
      }
    }
    return n;
  }
  return spec.edges.length;
}

function expectedLabelCount(spec) {
  if (spec.type === "sequence") return spec.steps.filter((s) => !("band" in s)).length;
  if (spec.type === "schema") return 0;
  return spec.edges.filter((e) => Boolean(e.label)).length;
}

/** Verifies every segment in `pts` is orthogonal and first/last segments are axis-aligned with `start` and `end`. */
function assertAxisAlignedRoute(pts, start, end, tol, label) {
  assert.ok(pts.length >= 2, `${label}: at least 2 points`);
  assert.ok(Math.abs(pts[0].x - start.x) <= tol && Math.abs(pts[0].y - start.y) <= tol,
    `${label}: start (${pts[0].x},${pts[0].y}) != port (${start.x},${start.y}) [tol ${tol}]`);
  const last = pts[pts.length - 1];
  assert.ok(Math.abs(last.x - end.x) <= tol && Math.abs(last.y - end.y) <= tol,
    `${label}: end (${last.x},${last.y}) != port (${end.x},${end.y}) [tol ${tol}]`);
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i].x - pts[i - 1].x);
    const dy = Math.abs(pts[i].y - pts[i - 1].y);
    assert.ok(dx <= tol || dy <= tol,
      `${label}: segment ${i - 1}->${i} (${pts[i - 1].x},${pts[i - 1].y})->(${pts[i].x},${pts[i].y}) is not axis-aligned (dx=${dx}, dy=${dy}, tol=${tol})`);
  }
}

/** Parses and validates draw.io XML structure, XSD conformance, glue, labels, and port axis-alignment. */
function assertValidDrawio(xml, spec, context) {
  assert.ok(!xml.includes("<!--"), `${context}: no XML comments allowed in draw.io`);
  const xsd = xmllint(xml, XSD);
  assert.ok(xsd.ok, `${context}: mxfile-1.0.xsd failed: ${xsd.stderr}`);

  // Parse all mxCell elements and their mxGeometry
  const cellBlocks = [...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)];
  const vertices = new Map();
  const edges = [];
  const edgeLabels = [];

  const attr = (s, name) => s.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const styleVal = (style, key) => style.match(new RegExp(`(?:^|;)${key}=([^;]+)`))?.[1];

  for (const [, attrs, body = ""] of cellBlocks) {
    const id = attr(attrs, "id");
    const parent = attr(attrs, "parent");
    const style = attr(attrs, "style") ?? "";
    const isVertex = attr(attrs, "vertex") === "1";
    const isEdge = attr(attrs, "edge") === "1";
    if (isVertex) {
      const geoAttrs = body.match(/<mxGeometry\b([^>]*)/)?.[1] ?? "";
      const isEdgeLabel = style.includes("edgeLabel");
      if (isEdgeLabel) {
        edgeLabels.push({ id, parent, value: attr(attrs, "value") ?? "" });
      } else {
        vertices.set(id, {
          id,
          parent,
          x: Number(attr(geoAttrs, "x") ?? 0),
          y: Number(attr(geoAttrs, "y") ?? 0),
          w: Number(attr(geoAttrs, "width") ?? 0),
          h: Number(attr(geoAttrs, "height") ?? 0),
          style,
        });
      }
    } else if (isEdge) {
      const pts = [...body.matchAll(/<mxPoint\b([^>]*)\/>/g)]
        .filter((m) => !attr(m[1], "as"))
        .map((m) => ({ x: Number(attr(m[1], "x")), y: Number(attr(m[1], "y")) }));
      edges.push({
        id,
        parent,
        source: attr(attrs, "source"),
        target: attr(attrs, "target"),
        style,
        innerPts: pts,
      });
    }
  }

  // Compute world box of any vertex by walking parent chain
  const worldBox = (id) => {
    const v = vertices.get(id);
    assert.ok(v, `${context}: missing vertex ${id}`);
    let x = v.x, y = v.y, cur = v.parent;
    while (cur && cur !== "1" && cur !== "0") {
      const p = vertices.get(cur);
      assert.ok(p, `${context}: missing parent container ${cur}`);
      x += p.x;
      y += p.y;
      cur = p.parent;
    }
    return { x, y, w: v.w, h: v.h };
  };

  assert.equal(edges.length, expectedEdgeCount(spec), `${context}: exact single connector count`);

  const labelParents = new Set(edgeLabels.map((l) => l.parent));
  const expectedLabels = expectedLabelCount(spec);
  assert.ok(labelParents.size >= expectedLabels, `${context}: ${labelParents.size} labelled edges < ${expectedLabels} expected`);
  for (const l of edgeLabels) {
    assert.ok(edges.some((e) => e.id === l.parent), `${context}: edgeLabel ${l.id} parent ${l.parent} must be an edge`);
  }

  for (const e of edges) {
    assert.ok(e.source && e.target, `${context}: edge ${e.id} must be glued to source and target`);
    const sb = worldBox(e.source);
    const tb = worldBox(e.target);
    const ex = Number(styleVal(e.style, "exitX"));
    const ey = Number(styleVal(e.style, "exitY"));
    const nx = Number(styleVal(e.style, "entryX"));
    const ny = Number(styleVal(e.style, "entryY"));
    assert.ok(Number.isFinite(ex) && Number.isFinite(ey) && Number.isFinite(nx) && Number.isFinite(ny),
      `${context}: edge ${e.id} missing explicit fractional port coordinates`);
    assert.equal(styleVal(e.style, "exitPerimeter"), "0", `${context}: edge ${e.id} exitPerimeter=0`);
    assert.equal(styleVal(e.style, "entryPerimeter"), "0", `${context}: edge ${e.id} entryPerimeter=0`);
    const start = { x: sb.x + ex * sb.w, y: sb.y + ey * sb.h };
    const end = { x: tb.x + nx * tb.w, y: tb.y + ny * tb.h };
    assertAxisAlignedRoute([start, ...e.innerPts, end], start, end, 0.02, `${context} drawio ${e.id}`);
  }
}

/** Parses and validates Visio .vsdx OPC archive, XML well-formedness, glue, ConFixedCode=2, and Visio-inch port alignment. */
function assertValidVsdx(bytes, spec, context) {
  const entries = readZipEntries(bytes);
  const required = [
    "[Content_Types].xml",
    "_rels/.rels",
    "visio/document.xml",
    "visio/_rels/document.xml.rels",
    "visio/pages/pages.xml",
    "visio/pages/_rels/pages.xml.rels",
    "visio/pages/page1.xml",
  ];
  for (const name of required) {
    assert.ok(entries.has(name), `${context}: missing OPC part ${name}`);
    const check = xmllint(entries.get(name).toString("utf8"));
    assert.ok(check.ok, `${context}: invalid XML in ${name}: ${check.stderr}`);
  }

  const page1 = entries.get("visio/pages/page1.xml").toString("utf8");
  // Extract top-level <Shape> blocks cleanly even when a Type="Group" contains nested <Shape> children.
  const topShapes = [];
  const tagRe = /<Shape\b([^>]*)>|<\/Shape>/g;
  let depth = 0, startIdx = -1, openEnd = -1, openAttrs = "";
  for (const m of page1.matchAll(tagRe)) {
    if (m[0].startsWith("</Shape")) {
      depth--;
      if (depth === 0 && startIdx >= 0) {
        topShapes.push({ attrs: openAttrs, body: page1.slice(openEnd, m.index) });
        startIdx = -1;
      }
    } else {
      if (depth === 0) {
        startIdx = m.index;
        openEnd = m.index + m[0].length;
        openAttrs = m[1] ?? "";
      }
      depth++;
    }
  }
  const byId = new Map();
  const connectors = [];

  const attrVal = (s, name) => s.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
  const cellVal = (body, name) => body.match(new RegExp(`<Cell N="${name}" V="([^"]+)"`))?.[1];
  const cellFormula = (body, name) => body.match(new RegExp(`<Cell N="${name}"[^>]*F="([^"]+)"`))?.[1];

  for (const { attrs, body } of topShapes) {
    const id = attrVal(attrs, "ID");
    const nameU = attrVal(attrs, "NameU") ?? "";
    // Only inspect cells/connections belonging directly to the top-level shape (before any nested <Shapes>)
    const ownBody = body.split("<Shapes>")[0] ?? body;
    const objType = cellVal(ownBody, "ObjType");
    const conns = [...ownBody.matchAll(/<Row T="Connection" IX="(\d+)">[\s\S]*?<Cell N="X" V="([^"]+)"[\s\S]*?<Cell N="Y" V="([^"]+)"/g)]
      .map((m) => ({ ix: Number(m[1]), x: Number(m[2]), y: Number(m[3]) }));
    const rec = {
      id,
      nameU,
      objType,
      pinX: Number(cellVal(ownBody, "PinX")),
      pinY: Number(cellVal(ownBody, "PinY")),
      w: Number(cellVal(ownBody, "Width")),
      h: Number(cellVal(ownBody, "Height")),
      locPinX: Number(cellVal(ownBody, "LocPinX")),
      locPinY: Number(cellVal(ownBody, "LocPinY")),
      conns,
      body: ownBody,
    };
    byId.set(id, rec);
    if (objType === "2") connectors.push(rec);
  }

  const connects = [...page1.matchAll(/<Connect FromSheet="(\d+)" FromCell="([^"]+)" FromPart="(\d+)" ToSheet="(\d+)" ToCell="([^"]+)" ToPart="(\d+)"\/>/g)]
    .map((m) => ({ fromSheet: m[1], fromCell: m[2], fromPart: Number(m[3]), toSheet: m[4], toCell: m[5], toPart: Number(m[6]) }));

  assert.equal(connectors.length, expectedEdgeCount(spec), `${context}: exact single 1-D connector count`);
  assert.equal(connects.length, connectors.length * 2, `${context}: 2 Connect records per connector`);

  let labelledCount = 0;
  for (const c of connectors) {
    assert.equal(cellVal(c.body, "ShapeRouteStyle"), "1", `${context} ${c.nameU}: ShapeRouteStyle=1`);
    assert.equal(cellVal(c.body, "ConFixedCode"), "2", `${context} ${c.nameU}: ConFixedCode=2`);
    if (c.body.includes("<Text>")) labelledCount++;

    const beginConn = connects.find((k) => k.fromSheet === c.id && k.fromPart === 9);
    const endConn = connects.find((k) => k.fromSheet === c.id && k.fromPart === 12);
    assert.ok(beginConn && endConn, `${context} ${c.nameU}: missing Begin/End Connect elements`);
    assert.match(cellFormula(c.body, "BeginX") ?? "", new RegExp(`Sheet\\.${beginConn.toSheet}!Connections\\.X${beginConn.toPart - 99}\\b`));
    assert.match(cellFormula(c.body, "EndX") ?? "", new RegExp(`Sheet\\.${endConn.toSheet}!Connections\\.X${endConn.toPart - 99}\\b`));

    const fromShape = byId.get(beginConn.toSheet);
    const toShape = byId.get(endConn.toSheet);
    assert.ok(fromShape && toShape, `${context} ${c.nameU}: glued shapes exist`);
    const fc = fromShape.conns.find((r) => r.ix === beginConn.toPart - 100);
    const tc = toShape.conns.find((r) => r.ix === endConn.toPart - 100);
    assert.ok(fc && tc, `${context} ${c.nameU}: Connection rows exist for ToPart`);

    const startPort = {
      x: fromShape.pinX - fromShape.locPinX + fc.x,
      y: fromShape.pinY - fromShape.locPinY + fc.y,
    };
    const endPort = {
      x: toShape.pinX - toShape.locPinX + tc.x,
      y: toShape.pinY - toShape.locPinY + tc.y,
    };
    const bx = Number(cellVal(c.body, "BeginX"));
    const by = Number(cellVal(c.body, "BeginY"));
    const ex = Number(cellVal(c.body, "EndX"));
    const ey = Number(cellVal(c.body, "EndY"));
    assert.ok(Math.abs(bx - startPort.x) <= 2e-6 && Math.abs(by - startPort.y) <= 2e-6,
      `${context} ${c.nameU}: Begin (${bx},${by}) != Connection (${startPort.x},${startPort.y})`);
    assert.ok(Math.abs(ex - endPort.x) <= 2e-6 && Math.abs(ey - endPort.y) <= 2e-6,
      `${context} ${c.nameU}: End (${ex},${ey}) != Connection (${endPort.x},${endPort.y})`);

    const geomRows = [...c.body.matchAll(/<Row T="(MoveTo|LineTo)" IX="\d+"><Cell N="X" V="([^"]+)"\/><Cell N="Y" V="([^"]+)"\/><\/Row>/g)]
      .map((m) => ({ x: bx + Number(m[2]), y: by + Number(m[3]) }));
    assertAxisAlignedRoute(geomRows, startPort, endPort, 2e-5, `${context} vsdx ${c.nameU}`);
  }
  assert.equal(labelledCount, expectedLabelCount(spec), `${context}: all labelled edges have connector <Text>`);
}

/** Validates Lucid Standard Import ZIP + document.json contract and port axis-alignment. */
function assertValidLucid(bytes, spec, context) {
  const entries = readZipEntries(bytes);
  assert.ok(entries.has("document.json"), `${context}: .lucid must contain document.json at root`);
  const doc = JSON.parse(entries.get("document.json").toString("utf8"));
  assert.equal(doc.version, 1, `${context}: version === 1`);
  assert.equal(doc.documentSettings?.units, "px", `${context}: units === px`);
  assert.equal(doc.pages.length, 1, `${context}: 1 page`);
  const page = doc.pages[0];
  assert.ok(page.settings.size.w > 0 && page.settings.size.h > 0, `${context}: positive canvas size`);

  const shapeById = new Map(page.shapes.map((s) => [s.id, s]));
  const lineById = new Map(page.lines.map((l) => [l.id, l]));

  if (spec.type === "architecture" && spec.groups?.length) {
    const containers = page.shapes.filter((s) => s.type === "roundedRectangleContainer");
    assert.equal(containers.length, spec.groups.length, `${context}: group container count`);
    for (const c of containers) {
      assert.equal(c.assistedLayout, false, `${context}: assistedLayout must be false`);
      assert.equal(c.magnetize, true, `${context}: magnetize must be true`);
    }
  }
  if (spec.type === "data-flow") {
    const sw = page.shapes.find((s) => s.type === "swimLanes");
    assert.ok(sw, `${context}: data-flow emits swimLanes`);
    assert.equal(sw.vertical, false, `${context}: horizontal swimLanes`);
    assert.equal(sw.lanes.length, spec.lanes.length, `${context}: lane count`);
    const sum = sw.lanes.reduce((a, l) => a + l.width, 0);
    assert.ok(Math.abs(sum - sw.boundingBox.h) <= 0.1, `${context}: lane widths (${sum}) sum to boundingBox.h (${sw.boundingBox.h})`);
  }
  if (spec.type === "schema") {
    const tables = page.shapes.filter((s) => s.type === "table");
    assert.equal(tables.length, spec.tables.length, `${context}: native table count`);
    for (const t of tables) assert.equal(t.verticalBorder, false, `${context}: verticalBorder false`);
  }
  if (spec.type === "flowchart") {
    assert.ok(page.shapes.some((s) => s.type === "decision"), `${context}: flowchart decision shape`);
    assert.ok(page.shapes.some((s) => s.type === "terminator"), `${context}: flowchart terminator shape`);
  }

  const edgeLines = page.lines.filter((l) => l.id.startsWith("edge_"));
  assert.equal(edgeLines.length, expectedEdgeCount(spec), `${context}: exact single connector count`);

  const endpointPt = (ep) => {
    if (ep.type === "shapeEndpoint") {
      const s = shapeById.get(ep.shapeId);
      assert.ok(s, `${context}: endpoint shapeId ${ep.shapeId} exists`);
      return {
        x: s.boundingBox.x + ep.position.x * s.boundingBox.w,
        y: s.boundingBox.y + ep.position.y * s.boundingBox.h,
      };
    }
    if (ep.type === "lineEndpoint") {
      const targetLine = lineById.get(ep.lineId);
      assert.ok(targetLine, `${context}: endpoint lineId ${ep.lineId} exists`);
      const p1 = endpointPt(targetLine.endpoint1);
      const p2 = endpointPt(targetLine.endpoint2);
      return { x: p1.x + ep.position * (p2.x - p1.x), y: p1.y + ep.position * (p2.y - p1.y) };
    }
    return ep.position;
  };

  let labelled = 0;
  for (const line of edgeLines) {
    assert.ok(line.endpoint1.type === "shapeEndpoint" || line.endpoint1.type === "lineEndpoint", `${context} ${line.id}: endpoint1 glued`);
    assert.ok(line.endpoint2.type === "shapeEndpoint" || line.endpoint2.type === "lineEndpoint", `${context} ${line.id}: endpoint2 glued`);
    if (spec.type === "schema") assert.equal(line.endpoint1.style, "closedCircle", `${context} ${line.id}: FK dot`);
    if (line.text?.length) labelled++;
    const start = endpointPt(line.endpoint1);
    const end = endpointPt(line.endpoint2);
    const pts = [start, ...(line.elbowControlPoints ?? []), end];
    assertAxisAlignedRoute(pts, start, end, 0.02, `${context} lucid ${line.id}`);
  }
  assert.equal(labelled, expectedLabelCount(spec), `${context}: all labelled edges carry Line.text`);
}

describe("all five CIMIP fixtures: determinism, schemas, glue and exact port axis-alignment", () => {
  for (const key of CIMIP_KEYS) {
    const spec = CIMIP[key];

    test(`${key}: byte-identical SHA-256 on repeat across all formats and themes`, () => {
      for (const theme of ["light", "dark", "adaptive"]) {
        const a = interop.diagramToDrawio(spec, { theme });
        const b = interop.diagramToDrawio(spec, { theme });
        assert.equal(sha256(a), sha256(b), `${key} drawio (${theme}) deterministic`);
      }
      for (const theme of ["light", "dark"]) {
        assert.equal(sha256(interop.diagramToVsdx(spec, { theme })), sha256(interop.diagramToVsdx(spec, { theme })), `${key} vsdx (${theme})`);
        assert.equal(sha256(interop.diagramToLucid(spec, { theme })), sha256(interop.diagramToLucid(spec, { theme })), `${key} lucid (${theme})`);
        assert.equal(
          JSON.stringify(interop.diagramToLucidJson(spec, { theme })),
          JSON.stringify(interop.diagramToLucidJson(spec, { theme })),
          `${key} lucid-json (${theme})`,
        );
      }
    });

    test(`${key}: .drawio validates against mxfile-1.0.xsd and every edge is single, glued and port-aligned (light, dark, adaptive)`, () => {
      for (const theme of ["light", "dark", "adaptive"]) {
        const xml = interop.diagramToDrawio(spec, { theme });
        assertValidDrawio(xml, spec, `${key}/${theme}`);
        if (theme === "adaptive") {
          assert.match(xml, /adaptiveColors="auto"/);
          assert.match(xml, /light-dark\(/);
        } else {
          assert.match(xml, /adaptiveColors="none"/);
          assert.doesNotMatch(xml, /light-dark\(/);
        }
      }
    });

    test(`${key}: .vsdx OPC parts, Connects glue, ConFixedCode=2, and zero-jog Visio-inch port alignment`, () => {
      for (const theme of ["light", "dark"]) {
        const bytes = interop.diagramToVsdx(spec, { theme });
        assertValidVsdx(bytes, spec, `${key}/${theme}`);
      }
    });

    test(`${key}: .lucid Standard Import JSON contract and Lucid-unit port alignment`, () => {
      for (const theme of ["light", "dark"]) {
        const bytes = interop.diagramToLucid(spec, { theme });
        assertValidLucid(bytes, spec, `${key}/${theme}`);
      }
    });
  }

  test("architecture RunTask (svc -> ecs) in .vsdx is a clean 3-point L-bend with 0.000000 in port delta", () => {
    const entries = readZipEntries(interop.diagramToVsdx(CIMIP.architecture));
    const page1 = entries.get("visio/pages/page1.xml").toString("utf8");
    const runTask = page1.match(/<Shape ID="\d+" NameU="Connector_4"[^>]*>([\s\S]*?)<\/Shape>/)?.[1];
    assert.ok(runTask, "Connector_4 (RunTask) present");
    const rows = [...runTask.matchAll(/<Row T="(MoveTo|LineTo)" IX="\d+"><Cell N="X" V="([^"]+)"\/><Cell N="Y" V="([^"]+)"\/><\/Row>/g)];
    assert.equal(rows.length, 3, "RunTask has exactly 3 geometry vertices (no extra joining jog)");
    assert.equal(rows[0][2], "0.000000", "MoveTo X === 0");
    assert.equal(rows[0][3], "0.000000", "MoveTo Y === 0");
    assert.equal(rows[1][2], "0.000000", "first bend stays strictly on X === 0 (no horizontal jog below cimip service)");
    assert.equal(rows[1][3], rows[2][3], "final leg stays strictly horizontal into ECS");
  });
});

describe("live DOM measured Geo entry (exportMeasuredDiagram)", () => {
  test("exports all five CIMIP figures from live Chromium-measured Geo with exact port alignment across all formats", async () => {
    const HOST = `
      import data from "./test/fixtures/cimip-diagrams.json";
      import { buildModel, figureTree, measureFigure, syncAttributes } from "./dist/diagram-core.js";
      import { readMeasuredExtras } from "./dist/diagram-interop.js";
      const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
      function Host() {
        return <main style={{ maxWidth: 1104, margin: "0 auto", padding: 16, display: "grid", gap: 64 }}>
          {Object.entries(data).map(([key, d]) => { const X = C[d.type]; const { type, ...props } = d; return <X key={key} id={"fig-" + key} {...props} />; })}
        </main>;
      }
      createRoot(document.getElementById("root")).render(<Host />);
      window.__measureAll = () => {
        const out = {};
        for (const [key, spec] of Object.entries(data)) {
          const fig = document.getElementById("fig-" + key);
          const model = buildModel(spec, { checks: false });
          const base = (fig.getAttribute("aria-labelledby") || "dg").replace(/-title$/, "");
          const opts = { prefix: "basalt-diagram", base, hasSource: Boolean(spec.source), hiddenClass: "basalt-visually-hidden" };
          const res = measureFigure(fig, model, "basalt-diagram", base, { layout: "drawn" }, (d) => syncAttributes(fig, figureTree(model, d, opts)));
          out[key] = { geo: res.geo, extras: readMeasuredExtras(fig, "basalt-diagram") };
        }
        return out;
      };
    `;
    const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
    const fontCss = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900} body{margin:0;background:var(--basalt-surface-page)}`;

    const browser = await launch();
    try {
      const { page, errors } = await fixturePage(browser, HOST, { theme: "light", viewport: { width: 1280, height: 1200 }, standards: true });
      await page.addStyleTag({ content: fontCss });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
      const measured = await page.evaluate(() => window.__measureAll());
      assert.deepEqual(errors, []);
      for (const key of CIMIP_KEYS) {
        const { geo, extras } = measured[key];
        assert.ok(geo && geo.lines.length > 0, `${key}: live Geo measured`);
        const drawio = interop.exportMeasuredDiagram(CIMIP[key], geo, "drawio", { extras });
        const vsdx = interop.exportMeasuredDiagram(CIMIP[key], geo, "vsdx", { extras });
        const lucid = interop.exportMeasuredDiagram(CIMIP[key], geo, "lucid", { extras });
        assertValidDrawio(drawio, CIMIP[key], `measured/${key}`);
        assertValidVsdx(vsdx, CIMIP[key], `measured/${key}`);
        assertValidLucid(lucid, CIMIP[key], `measured/${key}`);
      }
      await page.close();
    } finally {
      await browser.close();
    }
  });
});

describe("service marks embedding policy (manifest terms)", () => {
  test("isBundledMarkEmbeddable matches packages/react/marks/manifest.json for all 104 marks", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(pkg, "marks", "manifest.json"), "utf8"));
    const allowedOwners = new Set(["Amazon Web Services, Inc.", "Microsoft Corporation", "Google LLC", "The Linux Foundation"]);
    assert.equal(manifest.marks.length, 104);
    for (const mk of manifest.marks) {
      const expected = !mk.unofficial && allowedOwners.has(mk.owner);
      assert.equal(interop.isBundledMarkEmbeddable(mk.id), expected, `mark policy mismatch for ${mk.id} (${mk.owner}, unofficial=${Boolean(mk.unofficial)})`);
    }
  });

  test("default omits marks; marks='embed' includes official allowed marks and leaves out unofficial/restricted ones", () => {
    const skillMarks = JSON.parse(fs.readFileSync(path.join(repo, "tools", "html-skill", "src", "marks.json"), "utf8")).marks;
    const resolveMark = (id, theme) => (theme === "dark" ? skillMarks[id]?.onDark ?? skillMarks[id]?.onLight : skillMarks[id]?.onLight);
    const spec = {
      type: "architecture",
      title: "Marks test",
      summary: "Test allowed vs disallowed marks.",
      nodes: [
        { id: "ecs", name: "ECS service", col: 1, row: 1, mark: "aws-ecs-service" },
        { id: "k8s", name: "Kubernetes", col: 2, row: 1, mark: "kubernetes" },
        { id: "br", name: "Bedrock", col: 3, row: 1, mark: "aws-bedrock" },
        { id: "gh", name: "GitHub", col: 4, row: 1, mark: "github" },
      ],
      edges: [
        { from: "ecs", to: "k8s" },
        { from: "k8s", to: "br" },
        { from: "br", to: "gh" },
      ],
    };

    // Default: omit
    const drawioOmit = interop.diagramToDrawio(spec, { resolveMark });
    assert.doesNotMatch(drawioOmit, /id="mark-/);
    assert.equal([...readZipEntries(interop.diagramToVsdx(spec, { resolveMark })).keys()].filter((k) => k.startsWith("visio/media/")).length, 0);
    assert.equal([...readZipEntries(interop.diagramToLucid(spec, { resolveMark })).keys()].filter((k) => k.startsWith("images/")).length, 0);

    // Embed: only aws-ecs-service and kubernetes (NOT unofficial aws-bedrock or restricted github)
    const drawioEmbed = interop.diagramToDrawio(spec, { marks: "embed", resolveMark });
    assertValidDrawio(drawioEmbed, spec, "marks-embed");
    assert.match(drawioEmbed, /id="mark-ecs"/);
    assert.match(drawioEmbed, /id="mark-k8s"/);
    assert.doesNotMatch(drawioEmbed, /id="mark-br"/);
    assert.doesNotMatch(drawioEmbed, /id="mark-gh"/);

    const vsdxEmbed = readZipEntries(interop.diagramToVsdx(spec, { marks: "embed", resolveMark }));
    assert.equal([...vsdxEmbed.keys()].filter((k) => k.startsWith("visio/media/")).length, 2);
    assert.ok(vsdxEmbed.has("visio/pages/_rels/page1.xml.rels"));

    const lucidEmbed = readZipEntries(interop.diagramToLucid(spec, { marks: "embed", resolveMark }));
    assert.equal([...lucidEmbed.keys()].filter((k) => k.startsWith("images/")).length, 2);
  });
});

describe("basalt-diagram-export CLI", () => {
  test("exports JSON map, single JSON, and HTML script[data-diagram] (ignoring comments/textarea decoys) deterministically", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-interop-cli-"));
    try {
      // 1. Multi-diagram JSON (all 5 CIMIP fixtures)
      const outA = path.join(dir, "a");
      const outB = path.join(dir, "b");
      const r1 = spawnSync(process.execPath, [CLI, path.join(here, "fixtures", "cimip-diagrams.json"), "--to", "drawio,vsdx,lucid", "--out", outA], { encoding: "utf8" });
      assert.equal(r1.status, 0, r1.stderr);
      const r2 = spawnSync(process.execPath, [CLI, path.join(here, "fixtures", "cimip-diagrams.json"), "--to", "drawio,vsdx,lucid", "--out", outB], { encoding: "utf8" });
      assert.equal(r2.status, 0, r2.stderr);

      const expectedStems = ["architecture", "flowchart", "data-flow", "sequence", "schema"];
      for (const stem of expectedStems) {
        for (const ext of [".drawio", ".vsdx", ".lucid"]) {
          const fa = fs.readFileSync(path.join(outA, stem + ext));
          const fb = fs.readFileSync(path.join(outB, stem + ext));
          assert.equal(sha256(fa), sha256(fb), `CLI repeat deterministic: ${stem}${ext}`);
        }
      }

      // 2. HTML input with a real diagram + decoys inside comment and textarea
      const decoy = JSON.stringify({ type: "architecture", title: "Decoy", summary: "No", nodes: [{ id: "x", name: "X", col: 1, row: 1 }], edges: [] });
      const htmlPath = path.join(dir, "page.html");
      fs.writeFileSync(htmlPath, `<!doctype html><html><body>
        <!-- <figure class="diagram"><script type="application/json" data-diagram>${decoy}</script></figure> -->
        <textarea><script type="application/json" data-diagram>${decoy}</script></textarea>
        <figure class="diagram" id="fig-arch"><script type="application/json" data-diagram>${JSON.stringify(CIMIP.architecture)}</script></figure>
      </body></html>`);
      const htmlOut = path.join(dir, "from-html");
      const r3 = spawnSync(process.execPath, [CLI, htmlPath, "--to", "drawio,vsdx", "--theme", "adaptive", "--out", htmlOut], { encoding: "utf8" });
      assert.equal(r3.status, 0, r3.stderr);
      const files = fs.readdirSync(htmlOut).sort();
      assert.deepEqual(files, ["arch.drawio", "arch.vsdx"]);
      assertValidDrawio(fs.readFileSync(path.join(htmlOut, "arch.drawio"), "utf8"), CIMIP.architecture, "cli-html-adaptive");
      assertValidVsdx(fs.readFileSync(path.join(htmlOut, "arch.vsdx")), CIMIP.architecture, "cli-html-vsdx");

      // 3. Single file --out path
      const singleJson = path.join(dir, "one.json");
      fs.writeFileSync(singleJson, JSON.stringify(CIMIP.flowchart));
      const exactOut = path.join(dir, "exact.drawio");
      const r4 = spawnSync(process.execPath, [CLI, singleJson, "--to", "drawio", "--out", exactOut], { encoding: "utf8" });
      assert.equal(r4.status, 0, r4.stderr);
      assert.ok(fs.existsSync(exactOut));

      // 4. Error handling on unknown format
      const bad = spawnSync(process.execPath, [CLI, singleJson, "--to", "bogus"], { encoding: "utf8" });
      assert.notEqual(bad.status, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("subpath isolation", () => {
  test("@srasyndicate/basalt/diagram-interop stays outside the root index and carries no client directive or React imports", async () => {
    const root = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    for (const name of ["diagramToDrawio", "diagramToVsdx", "diagramToLucid", "diagramToLucidJson", "exportMeasuredDiagram"]) {
      assert.equal(name in root, false, `${name} must not be on the root index`);
      assert.equal(typeof interop[name], "function", `${name} is exported from diagram-interop`);
    }
    const source = fs.readFileSync(path.join(pkg, "dist", "diagram-interop.js"), "utf8");
    assert.doesNotMatch(source, /^"use client";/, "diagram-interop.js must not carry \"use client\"");
    assert.doesNotMatch(source, /\bfrom\s*"(react|react-dom|@base-ui|@phosphor-icons|cmdk|shiki)/, "diagram-interop.js imports no UI libraries");
  });
});
