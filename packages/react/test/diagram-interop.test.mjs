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
import zlib from "node:zlib";

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

/** Reads any ZIP's entries (stored or deflated, any timestamps): for fixtures written by other tools, such as the RunTask proof. */
function readForeignZipEntries(bytes) {
  const buf = Buffer.from(bytes);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.ok(eocd >= 0, "ZIP EOCD signature missing");
  const entries = new Map();
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0, n = buf.readUInt16LE(eocd + 10); i < n; i++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    const dataStart = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
    const raw = buf.subarray(dataStart, dataStart + compSize);
    assert.ok(method === 0 || method === 8, `${name}: method ${method}`);
    entries.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw);
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
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
  const entries = bytes instanceof Map ? bytes : readZipEntries(bytes);
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
    const conns = [...ownBody.matchAll(/<Row T="Connection" IX="(\d+)">[\s\S]*?<Cell N="X" V="([^"]+)"(?: F="([^"]+)")?\/>[\s\S]*?<Cell N="Y" V="([^"]+)"(?: F="([^"]+)")?\/>/g)]
      .map((m) => ({ ix: Number(m[1]), x: Number(m[2]), fx: m[3], y: Number(m[4]), fy: m[5] }));
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
    // Verify every Connection row's F formula (Width*fx, Height*fy) agrees with its V value within 2e-6 in.
    for (const c of conns) {
      const mFx = c.fx?.match(/^Width\*([\d.]+)$/);
      const mFy = c.fy?.match(/^Height\*([\d.]+)$/);
      if (mFx) assert.ok(Math.abs(rec.w * Number(mFx[1]) - c.x) <= 2e-6, `${context} ${nameU} Conn ${c.ix} X formula drift`);
      if (mFy) assert.ok(Math.abs(rec.h * Number(mFy[1]) - c.y) <= 2e-6, `${context} ${nameU} Conn ${c.ix} Y formula drift`);
    }
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

  // Verify architecture groups are real Visio Containers (User.msvStructureType="Container" + Relationships DEPENDSON).
  if (spec.type === "architecture" && spec.groups?.length) {
    for (const g of spec.groups) {
      const gShape = [...byId.values()].find((s) => s.nameU === `Group_${g.id}`);
      assert.ok(gShape, `${context}: Group_${g.id} shape present`);
      assert.match(gShape.body, /<Row N="msvStructureType"><Cell N="Value" V="Container" U="STR"\/>/, `${context}: Group_${g.id} has User.msvStructureType=Container`);
      const members = spec.nodes.filter((n) => n.group === g.id);
      for (const m of members) {
        const mShape = [...byId.values()].find((s) => s.nameU === `Node_${m.id}`);
        assert.ok(mShape, `${context}: member Node_${m.id} present`);
        assert.match(gShape.body, new RegExp(`DEPENDSON\\(1,(?:Sheet\\.\\d+!SheetRef\\(\\),)*Sheet\\.${mShape.id}!SheetRef\\(\\)[,)]`), `${context}: container lists member ${m.id}`);
        assert.match(mShape.body, new RegExp(`DEPENDSON\\(4,Sheet\\.${gShape.id}!SheetRef\\(\\)\\)`), `${context}: member ${m.id} points to container ${g.id}`);
      }
    }
  }
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
    for (const t of tables) {
      assert.equal(t.verticalBorder, false, `${context}: verticalBorder false`);
      const rowSum = (t.userSpecifiedRows ?? []).reduce((a, r) => a + r.size, 0);
      assert.ok(Math.abs(rowSum - t.boundingBox.h) <= 0.05, `${context} ${t.id}: userSpecifiedRows sum (${rowSum}) != boundingBox.h (${t.boundingBox.h})`);
    }
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
    if (spec.type === "schema") {
      assert.equal(line.endpoint1.style, "closedCircle", `${context} ${line.id}: FK dot`);
      // Verify every FK endpoint lands at the vertical center of one of its table's Lucid rows (within 0.5px).
      for (const ep of [line.endpoint1, line.endpoint2]) {
        const tbl = shapeById.get(ep.shapeId);
        const yLocal = ep.position.y * tbl.boundingBox.h;
        let acc = 0;
        let minCenterDiff = Infinity;
        for (const r of tbl.userSpecifiedRows ?? []) {
          const center = acc + r.size / 2;
          minCenterDiff = Math.min(minCenterDiff, Math.abs(yLocal - center));
          acc += r.size;
        }
        assert.ok(minCenterDiff <= 0.51, `${context} ${line.id} on ${ep.shapeId}: FK y=${yLocal.toFixed(2)} off nearest Lucid row center by ${minCenterDiff.toFixed(2)}px`);
      }
    }
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

    test(`${key}: .vsdx OPC parts, Connects glue, ConFixedCode=2, dark PageBackground, and zero-jog Visio-inch port alignment`, () => {
      for (const theme of ["light", "dark"]) {
        const bytes = interop.diagramToVsdx(spec, { theme });
        assertValidVsdx(bytes, spec, `${key}/${theme}`);
        const page1 = readZipEntries(bytes).get("visio/pages/page1.xml").toString("utf8");
        const firstShape = page1.match(/<Shape ID="(\d+)" NameU="([^"]+)"[^>]*>([\s\S]*?)<\/Shape>/);
        assert.ok(firstShape, `${key}/${theme}: first shape exists`);
        if (theme === "dark") {
          assert.equal(firstShape[1], "1", `${key}/dark: PageBackground is ID 1`);
          assert.equal(firstShape[2], "PageBackground", `${key}/dark: first shape is PageBackground`);
          assert.match(firstShape[3], /<Cell N="FillForegnd" V="#000000"\/>/, `${key}/dark: surface-page fill #000000`);
          assert.match(firstShape[3], /<Cell N="LockSelect" V="1"\/>/, `${key}/dark: PageBackground is locked`);
          assert.match(firstShape[3], /<Cell N="LockMoveX" V="1"\/>/, `${key}/dark: PageBackground move locked`);
        } else {
          assert.notEqual(firstShape[2], "PageBackground", `${key}/light: no dark background shape`);
        }
      }
    });

    test(`${key}: .lucid Standard Import JSON contract, dark fillColor and Lucid-unit port alignment`, () => {
      for (const theme of ["light", "dark"]) {
        const bytes = interop.diagramToLucid(spec, { theme });
        assertValidLucid(bytes, spec, `${key}/${theme}`);
        const doc = JSON.parse(readZipEntries(bytes).get("document.json").toString("utf8"));
        assert.equal(doc.pages[0].settings.fillColor, theme === "dark" ? "#000000" : "#fafafa", `${key}/${theme}: page fillColor`);
      }
    });
  }

  test("architecture RunTask (svc -> ecs) in .vsdx glues Begin/End to exact Connection rows and rejects proof-style 0.5px drift", () => {
    // RunTask's Begin and End against the Connection rows they are glued to, worked out from page1.xml alone (value and, where written, formula).
    const runTaskGlue = (page1) => {
      const svc = page1.match(/<Shape ID="(\d+)" NameU="Node_svc"[^>]*>([\s\S]*?)<\/Shape>/);
      const ecs = page1.match(/<Shape ID="(\d+)" NameU="Node_ecs"[^>]*>([\s\S]*?)<\/Shape>/);
      const runTask = page1.match(/<Shape ID="(\d+)" NameU="Connector_4"[^>]*>([\s\S]*?)<\/Shape>/);
      assert.ok(svc && ecs && runTask, "Node_svc, Node_ecs, and Connector_4 (RunTask) present");
      const cellV = (b, n) => Number(b.match(new RegExp(`<Cell N="${n}" V="([^"]+)"`))?.[1]);
      const beginConn = page1.match(new RegExp(`<Connect FromSheet="${runTask[1]}" FromCell="BeginX" FromPart="9" ToSheet="${svc[1]}" ToCell="Connections\\.X(\\d+)" ToPart="(\\d+)"\\/>`));
      const endConn = page1.match(new RegExp(`<Connect FromSheet="${runTask[1]}" FromCell="EndX" FromPart="12" ToSheet="${ecs[1]}" ToCell="Connections\\.X(\\d+)" ToPart="(\\d+)"\\/>`));
      assert.ok(beginConn && endConn, "RunTask glued from Node_svc to Node_ecs");
      const connPt = (shapeBody, ix) => {
        const row = shapeBody.match(new RegExp(`<Row T="Connection" IX="${ix}">[\\s\\S]*?<Cell N="X" V="([^"]+)"(?: F="Width\\*([^"]+)")?\\/>[\\s\\S]*?<Cell N="Y" V="([^"]+)"(?: F="Height\\*([^"]+)")?\\/>`));
        assert.ok(row, `Connection IX=${ix} present`);
        const ox = cellV(shapeBody, "PinX") - cellV(shapeBody, "LocPinX"), oy = cellV(shapeBody, "PinY") - cellV(shapeBody, "LocPinY");
        const w = cellV(shapeBody, "Width"), h = cellV(shapeBody, "Height");
        const x = ox + Number(row[1]), y = oy + Number(row[3]);
        return { x, y, fx: row[2] ? ox + w * Number(row[2]) : x, fy: row[4] ? oy + h * Number(row[4]) : y };
      };
      const from = connPt(svc[2], Number(beginConn[2]) - 100), to = connPt(ecs[2], Number(endConn[2]) - 100);
      const b = { x: cellV(runTask[2], "BeginX"), y: cellV(runTask[2], "BeginY") }, e = { x: cellV(runTask[2], "EndX"), y: cellV(runTask[2], "EndY") };
      const off = (p, c) => Math.max(Math.abs(p.x - c.x), Math.abs(p.y - c.y), Math.abs(p.x - c.fx), Math.abs(p.y - c.fy));
      return { runTask, begin: b, end: e, from, to, beginOff: off(b, from), endOff: off(e, to) };
    };

    const page1 = readZipEntries(interop.diagramToVsdx(CIMIP.architecture)).get("visio/pages/page1.xml").toString("utf8");
    const { runTask, begin, end, from, to, beginOff, endOff } = runTaskGlue(page1);
    assert.ok(beginOff <= 2e-6, `RunTask Begin (${begin.x},${begin.y}) on its Connection row (${from.x},${from.y}; formula ${from.fx},${from.fy})`);
    assert.ok(endOff <= 2e-6, `RunTask End (${end.x},${end.y}) on its Connection row (${to.x},${to.y}; formula ${to.fx},${to.fy})`);

    const rows = [...runTask[2].matchAll(/<Row T="(MoveTo|LineTo)" IX="\d+"><Cell N="X" V="([^"]+)"\/><Cell N="Y" V="([^"]+)"\/><\/Row>/g)];
    assert.equal(rows.length, 3, "RunTask has exactly 3 geometry vertices");
    assert.equal(rows[1][2], "0.000000", "first bend stays strictly on X === 0");
    assert.equal(rows[1][3], rows[2][3], "final leg stays strictly horizontal into ECS");

    // Negative fixture: the proof .vsdx that jogged in Lucid (DECISIONS 314). Its geometry was already an L-bend; its BeginX sat 0.5 px
    // (0.0052 in) off the cimip service's Connection row, which is what Lucid re-glued and drew as the jog. It must fail.
    const proof = fs.readFileSync(path.join(here, "fixtures", "runtask-jog-proof.vsdx"));
    const proofEntries = readForeignZipEntries(proof);
    const proofGlue = runTaskGlue(proofEntries.get("visio/pages/page1.xml").toString("utf8"));
    assert.ok(proofGlue.beginOff > 0.005 && proofGlue.beginOff < 0.0055, `the proof's RunTask Begin is 0.5 px off its Connection row (${proofGlue.beginOff} in)`);
    assert.throws(() => assertValidVsdx(proofEntries, CIMIP.architecture, "runtask-jog-proof"), /Connector_\d+: Begin .* != Connection/);
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
        return <main style={{ width: 1104, margin: "0 auto", display: "grid", gap: 64 }}>
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

      // Comparison: headless vs live at the same drawing width (records exact box & route deltas without asserting 0.5px yet; B2 lands after Batch B).
      const comparison = {};
      for (const key of CIMIP_KEYS) {
        const { geo, extras } = measured[key];
        const liveDoc = interop.exportMeasuredDiagram(CIMIP[key], geo, "lucid-json", { extras });
        const headDoc = interop.diagramToLucidJson(CIMIP[key], { width: geo.w });
        const L = liveDoc.pages[0], H = headDoc.pages[0];
        assert.deepEqual(L.shapes.map((s) => s.id), H.shapes.map((s) => s.id), `${key}: live vs headless shape ids match`);
        assert.deepEqual(L.lines.map((l) => l.id), H.lines.map((l) => l.id), `${key}: live vs headless line ids match`);

        let maxBoxDelta = 0, shapesOverHalfPx = 0;
        const boxDeltas = {};
        for (const s of L.shapes) {
          const h = H.shapes.find((x) => x.id === s.id);
          const dx = Math.abs(s.boundingBox.x - h.boundingBox.x);
          const dy = Math.abs(s.boundingBox.y - h.boundingBox.y);
          const dw = Math.abs(s.boundingBox.w - h.boundingBox.w);
          const dh = Math.abs(s.boundingBox.h - h.boundingBox.h);
          const m = Math.max(dx, dy, dw, dh);
          if (m > 0.5) shapesOverHalfPx++;
          if (m > maxBoxDelta) maxBoxDelta = m;
          boxDeltas[s.id] = { dx: +dx.toFixed(2), dy: +dy.toFixed(2), dw: +dw.toFixed(2), dh: +dh.toFixed(2) };
        }
        let maxRouteDelta = 0, routesOverHalfPx = 0;
        const routeDeltas = {};
        for (const l of L.lines.filter((x) => x.id.startsWith("edge_"))) {
          const h = H.lines.find((x) => x.id === l.id);
          const lp = l.elbowControlPoints ?? [], hp = h.elbowControlPoints ?? [];
          let m = lp.length === hp.length ? 0 : Infinity;
          if (lp.length === hp.length) {
            for (let k = 0; k < lp.length; k++) {
              m = Math.max(m, Math.abs(lp[k].x - hp[k].x), Math.abs(lp[k].y - hp[k].y));
            }
          }
          if (m > 0.5) routesOverHalfPx++;
          if (Number.isFinite(m) && m > maxRouteDelta) maxRouteDelta = m;
          routeDeltas[l.id] = Number.isFinite(m) ? +m.toFixed(2) : "point-count-mismatch";
        }
        comparison[key] = {
          liveW: geo.w, liveH: geo.h,
          headlessW: H.settings.size.w - 64, headlessH: H.settings.size.h - 64,
          shapesOverHalfPx, maxBoxDelta: +maxBoxDelta.toFixed(2),
          routesOverHalfPx, maxRouteDelta: +maxRouteDelta.toFixed(2),
          boxDeltas, routeDeltas,
        };
      }
      if (process.env.PRINT_INTEROP_COMPARISON) {
        process.stdout.write(`HEADLESS_VS_LIVE=${JSON.stringify(comparison)}\n`);
      }

      // Polish 2: measured lane rects keyed as lane-0..lane-5 (readMeasuredExtras' format) must reach sceneFromMeasured.
      const df = measured.dataFlow;
      assert.equal(df.extras.lanes?.length, CIMIP.dataFlow.lanes.length);
      const customLanes = df.extras.lanes.map((l, idx) => ({
        ...l,
        rect: idx === 0 ? { l: 0, t: 0, r: df.geo.w, b: 140 } : { l: 0, t: 140 + idx * 90, r: df.geo.w, b: 200 + idx * 90 },
      }));
      const docWithCustomLanes = interop.exportMeasuredDiagram(CIMIP.dataFlow, df.geo, "lucid-json", { extras: { ...df.extras, lanes: customLanes } });
      const swCustom = docWithCustomLanes.pages[0].shapes.find((s) => s.type === "swimLanes");
      const docDefaultLanes = interop.exportMeasuredDiagram(CIMIP.dataFlow, df.geo, "lucid-json", { extras: df.extras });
      const swDefault = docDefaultLanes.pages[0].shapes.find((s) => s.type === "swimLanes");
      assert.notEqual(swCustom.lanes[0].width, swDefault.lanes[0].width, "measured lane-0..N rects must change exported swimlane geometry");
      assert.equal(swCustom.lanes[0].width, 185, "lane 0 bottom hits midpoint between lane 0 bottom (140) and lane 1 top (230) = 185");

      // Polish 7: dist/diagram-interop.js runs directly in a browser without any `process` global defined.
      const rawPage = await browser.newPage();
      const interopSrc = fs.readFileSync(path.join(pkg, "dist", "diagram-interop.js"), "utf8");
      await rawPage.route("https://interop-browser-check.local/**", async (route) => {
        if (route.request().url().endsWith("/diagram-interop.js")) {
          await route.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: interopSrc });
        } else {
          await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><html><body></body></html>" });
        }
      });
      await rawPage.goto("https://interop-browser-check.local/index.html");
      const browserOut = await rawPage.evaluate(async (spec) => {
        const mod = await import("https://interop-browser-check.local/diagram-interop.js");
        return {
          hasProcess: typeof globalThis.process !== "undefined",
          drawioOk: mod.diagramToDrawio(spec).includes("<mxfile"),
          vsdxLen: mod.diagramToVsdx(spec).byteLength,
          lucidLen: mod.diagramToLucid(spec).byteLength,
        };
      }, CIMIP.architecture);
      assert.equal(browserOut.hasProcess, false, "no process global in native browser");
      assert.equal(browserOut.drawioOk, true, "diagramToDrawio works in native browser ESM");
      assert.ok(browserOut.vsdxLen > 0 && browserOut.lucidLen > 0, "vsdx and lucid work in native browser ESM");
      await rawPage.close();

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
        { id: "db", name: "Database", col: 3, row: 1, mark: "aws-database" },
        { id: "br", name: "Bedrock", col: 4, row: 1, mark: "aws-bedrock" },
        { id: "gh", name: "GitHub", col: 5, row: 1, mark: "github" },
      ],
      edges: [
        { from: "ecs", to: "k8s" },
        { from: "k8s", to: "db" },
        { from: "db", to: "br" },
        { from: "br", to: "gh" },
      ],
    };

    // Default: omit
    const drawioOmit = interop.diagramToDrawio(spec, { resolveMark });
    assert.doesNotMatch(drawioOmit, /id="mark-/);
    assert.equal([...readZipEntries(interop.diagramToVsdx(spec, { resolveMark })).keys()].filter((k) => k.startsWith("visio/media/")).length, 0);
    assert.equal([...readZipEntries(interop.diagramToLucid(spec, { resolveMark })).keys()].filter((k) => k.startsWith("images/")).length, 0);

    // Embed: official allowed marks only (NOT unofficial aws-bedrock or restricted github)
    const drawioEmbed = interop.diagramToDrawio(spec, { marks: "embed", resolveMark });
    assertValidDrawio(drawioEmbed, spec, "marks-embed");
    assert.match(drawioEmbed, /id="mark-ecs"/);
    assert.match(drawioEmbed, /id="mark-k8s"/);
    assert.match(drawioEmbed, /id="mark-db"/);
    assert.doesNotMatch(drawioEmbed, /id="mark-br"/);
    assert.doesNotMatch(drawioEmbed, /id="mark-gh"/);

    // Adaptive draw.io embeds prefers-color-scheme dual-form SVG for marks with distinct light/dark forms (aws-database)
    const drawioAdaptive = interop.diagramToDrawio(spec, { theme: "adaptive", marks: "embed", resolveMark });
    assertValidDrawio(drawioAdaptive, spec, "marks-embed-adaptive");
    assert.match(drawioAdaptive, /prefers-color-scheme%3Adark/, "adaptive draw.io embeds dual light/dark mark form");

    const vsdxEmbed = readZipEntries(interop.diagramToVsdx(spec, { marks: "embed", resolveMark }));
    assert.equal([...vsdxEmbed.keys()].filter((k) => k.startsWith("visio/media/")).length, 3);
    assert.ok(vsdxEmbed.has("visio/pages/_rels/page1.xml.rels"));
    // Kubernetes attribution from manifest.json lands in Visio DocumentProperties Description and Lucid customData
    assert.ok(interop.bundledMarkAttribution("kubernetes")?.includes("Apache-2.0"));
    assert.match(vsdxEmbed.get("visio/document.xml").toString("utf8"), /Apache-2\.0/, "Kubernetes attribution in Visio document.xml");

    const lucidEmbed = readZipEntries(interop.diagramToLucid(spec, { marks: "embed", resolveMark }));
    assert.equal([...lucidEmbed.keys()].filter((k) => k.startsWith("images/")).length, 3);
    const lucidDoc = JSON.parse(lucidEmbed.get("document.json").toString("utf8"));
    const k8sMarkShape = lucidDoc.pages[0].shapes.find((s) => s.id === "mark_k8s");
    assert.ok(k8sMarkShape?.customData?.some((d) => d.key === "attribution" && d.value.includes("Apache-2.0")), "Kubernetes attribution in Lucid customData");
  });
});

describe("basalt-diagram-export CLI", () => {
  test("exports JSON map, single JSON, and HTML script[data-diagram] (ignoring comments/textarea decoys) deterministically", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-interop-cli-"));
    try {
      // 1. Multi-diagram JSON under two different TZ and LC_ALL environments (Polish 8: cross-TZ/locale determinism)
      const outA = path.join(dir, "a");
      const outB = path.join(dir, "b");
      const r1 = spawnSync(process.execPath, [CLI, path.join(here, "fixtures", "cimip-diagrams.json"), "--to", "drawio,vsdx,lucid,lucid-json", "--out", outA], {
        encoding: "utf8",
        env: { ...process.env, TZ: "UTC", LC_ALL: "C" },
      });
      assert.equal(r1.status, 0, r1.stderr);
      const r2 = spawnSync(process.execPath, [CLI, path.join(here, "fixtures", "cimip-diagrams.json"), "--to", "drawio,vsdx,lucid,lucid-json", "--out", outB], {
        encoding: "utf8",
        env: { ...process.env, TZ: "Asia/Kolkata", LC_ALL: "de_DE.UTF-8" },
      });
      assert.equal(r2.status, 0, r2.stderr);

      const expectedStems = ["architecture", "flowchart", "data-flow", "sequence", "schema"];
      for (const stem of expectedStems) {
        for (const ext of [".drawio", ".vsdx", ".lucid", ".lucid.json"]) {
          const fa = fs.readFileSync(path.join(outA, stem + ext));
          const fb = fs.readFileSync(path.join(outB, stem + ext));
          assert.equal(sha256(fa), sha256(fb), `CLI repeat deterministic across TZ/LC_ALL: ${stem}${ext}`);
        }
      }

      // 1b. B1: invoking the CLI through a symlink (as npm installs node_modules/.bin/basalt-diagram-export) executes and writes files
      const symLink = path.join(dir, "basalt-diagram-export-link");
      fs.symlinkSync(CLI, symLink);
      const symOut = path.join(dir, "from-symlink");
      const singleJson = path.join(dir, "one.json");
      fs.writeFileSync(singleJson, JSON.stringify(CIMIP.flowchart));
      const rSym = spawnSync(process.execPath, [symLink, singleJson, "--to", "vsdx", "--out", symOut], { encoding: "utf8" });
      assert.equal(rSym.status, 0, rSym.stderr);
      assert.ok(fs.existsSync(path.join(symOut, "one.vsdx")), "symlinked CLI wrote output file");

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

      // 3. Single file --out path (valid + Polish 10 mismatched extension check)
      const exactOut = path.join(dir, "exact.drawio");
      const r4 = spawnSync(process.execPath, [CLI, singleJson, "--to", "drawio", "--out", exactOut], { encoding: "utf8" });
      assert.equal(r4.status, 0, r4.stderr);
      assert.ok(fs.existsSync(exactOut));

      const mismatch = spawnSync(process.execPath, [CLI, singleJson, "--to", "drawio", "--out", path.join(dir, "wrong.vsdx")], { encoding: "utf8" });
      assert.notEqual(mismatch.status, 0, "mismatched --out extension must fail");
      assert.match(mismatch.stderr, /extension does not match/i);

      // 4. Polish 9: custom mark SVG file resolved relative to input file + warning when missing
      fs.writeFileSync(path.join(dir, "logo.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#000"/></svg>`);
      const customMarkSpec = {
        type: "architecture",
        title: "Custom marks",
        summary: "Custom mark resolution.",
        nodes: [
          { id: "ok", name: "Present", col: 1, row: 1, mark: { onLight: "logo.svg" } },
          { id: "miss", name: "Missing", col: 2, row: 1, mark: { onLight: "no-such.svg" } },
        ],
        edges: [{ from: "ok", to: "miss" }],
      };
      const customIn = path.join(dir, "custom.json");
      fs.writeFileSync(customIn, JSON.stringify(customMarkSpec));
      const customOut = path.join(dir, "custom-out");
      const rCustom = spawnSync(process.execPath, [CLI, customIn, "--to", "drawio,vsdx", "--marks", "embed", "--out", customOut], { encoding: "utf8" });
      assert.equal(rCustom.status, 0, rCustom.stderr);
      assert.match(rCustom.stderr, /warning: custom mark file "no-such\.svg" not found/i, "warns on missing custom mark file");
      const customDrawio = fs.readFileSync(path.join(customOut, "custom.drawio"), "utf8");
      assert.match(customDrawio, /id="mark-ok"/, "resolved custom SVG file embedded");
      assert.doesNotMatch(customDrawio, /id="mark-miss"/, "missing custom SVG skipped");

      // 5. Error handling on unknown format
      const bad = spawnSync(process.execPath, [CLI, singleJson, "--to", "bogus"], { encoding: "utf8" });
      assert.notEqual(bad.status, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("packaged --browser harness measures through dist/ alone (no repo HTML skill dependency)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-interop-browser-"));
    try {
      const outDir = path.join(dir, "out");
      const res = spawnSync(process.execPath, [CLI, path.join(here, "fixtures", "cimip-diagrams.json"), "--browser", "--to", "drawio,vsdx,lucid", "--out", outDir], { encoding: "utf8", timeout: 90000 });
      assert.equal(res.status, 0, res.stderr);
      for (const [key, stem] of [["architecture", "architecture"], ["flowchart", "flowchart"], ["dataFlow", "data-flow"], ["sequence", "sequence"], ["schema", "schema"]]) {
        assertValidDrawio(fs.readFileSync(path.join(outDir, `${stem}.drawio`), "utf8"), CIMIP[key], `cli-browser/${key}`);
        assertValidVsdx(fs.readFileSync(path.join(outDir, `${stem}.vsdx`)), CIMIP[key], `cli-browser/${key}`);
        assertValidLucid(fs.readFileSync(path.join(outDir, `${stem}.lucid`)), CIMIP[key], `cli-browser/${key}`);
      }
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
