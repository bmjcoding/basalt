// Shared pure-Node validators for @srasyndicate/basalt/diagram-interop tests (DECISIONS 311, 314, 324, 327).
// Imports no browser or Playwright modules so Node-only tests stay strictly browser-free.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const here = path.dirname(fileURLToPath(import.meta.url));
export const pkg = path.resolve(here, "..");
export const repo = path.resolve(pkg, "..", "..");
export const XSD = path.join(here, "fixtures", "mxfile-1.0.xsd");
export const CLI = path.join(pkg, "bin", "basalt-diagram-export.mjs");

export const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

export function xmllint(xml, schema = null) {
  const args = ["--noout"];
  if (schema) args.push("--schema", schema);
  args.push("-");
  const res = spawnSync("xmllint", args, { input: xml, encoding: "utf8" });
  return { ok: res.status === 0, stderr: (res.stderr || "").trim() };
}

/** Minimal store-mode ZIP parser (verifies local/central headers, CRC-32, and fixed 1980-01-01 timestamps). */
export function readZipEntries(bytes) {
  const buf = Buffer.from(bytes);
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
export function readForeignZipEntries(bytes) {
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

function walkSequenceSteps(steps, visit) {
  for (const s of steps ?? []) {
    if (!s || typeof s !== "object") continue;
    visit(s);
    if ("frame" in s) {
      if (Array.isArray(s.branches)) {
        for (const br of s.branches) walkSequenceSteps(br.steps, visit);
      } else if (Array.isArray(s.steps)) {
        walkSequenceSteps(s.steps, visit);
      }
    }
  }
}

export function expectedFrameCount(spec) {
  if (spec.type !== "sequence") return 0;
  let count = 0;
  walkSequenceSteps(spec.steps, (s) => { if ("frame" in s) count++; });
  return count;
}

export function expectedDividerCount(spec) {
  if (spec.type !== "sequence") return 0;
  let count = 0;
  walkSequenceSteps(spec.steps, (s) => {
    if ("frame" in s && Array.isArray(s.branches) && s.branches.length > 1) {
      count += s.branches.length - 1;
    }
  });
  return count;
}

export function expectedBarCount(spec) {
  if (spec.type !== "sequence") return 0;
  let count = 0;
  walkSequenceSteps(spec.steps, (s) => {
    if (!("band" in s) && !("frame" in s) && s.activate === true) count++;
  });
  return count;
}

export function expectedEdgeCount(spec) {
  if (spec.type === "sequence") {
    let count = 0;
    walkSequenceSteps(spec.steps, (s) => {
      if (!("band" in s) && !("frame" in s)) count++;
    });
    return count;
  }
  if (spec.type === "schema") {
    const byName = new Map(spec.tables.map((t) => [t.name, t]));
    let n = 0;
    for (const t of spec.tables) {
      for (const c of t.columns) {
        if (!c.references) continue;
        const [tbl, col] = c.references.split(".");
        const target = byName.get(tbl);
        if (target && target.columns.some((x) => x.name === col)) n++;
      }
    }
    return n;
  }
  return spec.edges.length;
}

export function expectedLabelCount(spec) {
  if (spec.type === "sequence") return expectedEdgeCount(spec);
  if (spec.type === "schema") return 0;
  return spec.edges.filter((e) => Boolean(e.label)).length;
}

const schemaHasCardinality = (spec) =>
  spec.type === "schema" && spec.tables.some((t) => t.columns.some((c) => Boolean(c.cardinality)));

const DRAWIO_CARDS = new Set(["ERmandOne", "ERzeroToOne", "ERoneToMany", "ERzeroToMany"]);
const VSDX_CARDS = new Set(["25", "28", "29", "30"]);
const LUCID_CARDS = new Set(["exactlyOne", "zeroOrOne", "oneOrMore", "zeroOrMore"]);

/** Verifies every segment in `pts` is orthogonal and first/last segments are axis-aligned with `start` and `end`. */
export function assertAxisAlignedRoute(pts, start, end, tol, label) {
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

/** Parses and validates draw.io XML structure, XSD conformance, glue, Batch B parts, and port axis-alignment. */
export function assertValidDrawio(xml, spec, context) {
  assert.ok(!xml.includes("<!--"), `${context}: no XML comments allowed in draw.io`);
  const xsd = xmllint(xml, XSD);
  assert.ok(xsd.ok, `${context}: mxfile-1.0.xsd failed: ${xsd.stderr}`);

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

  // Nested group hierarchy checks
  if (spec.type === "architecture" && spec.groups?.length) {
    for (const g of spec.groups) {
      const gv = vertices.get(`group-${g.id}`);
      assert.ok(gv, `${context}: group-${g.id} present`);
      assert.equal(gv.parent, g.parent ? `group-${g.parent}` : "1", `${context}: group-${g.id} parent`);
      assert.equal(styleVal(gv.style, "arcSize"), g.parent ? "16" : "24", `${context}: group-${g.id} arcSize`);
    }
  }

  // Sequence frames, dividers, and activation bars
  if (spec.type === "sequence") {
    const frameCells = [...vertices.values()].filter((v) => /^frame-f\d+$/.test(v.id));
    const tabCells = [...vertices.values()].filter((v) => /^frame-tab-f\d+$/.test(v.id));
    const divCells = [...vertices.values()].filter((v) => /^frame-div-f\d+-\d+$/.test(v.id));
    const barCells = [...vertices.values()].filter((v) => v.id.startsWith("bar-"));
    assert.equal(frameCells.length, expectedFrameCount(spec), `${context}: drawio frame count`);
    assert.equal(tabCells.length, expectedFrameCount(spec), `${context}: drawio frame tab count`);
    assert.equal(divCells.length, expectedDividerCount(spec), `${context}: drawio frame divider count`);
    assert.equal(barCells.length, expectedBarCount(spec), `${context}: drawio activation bar count`);
    if (barCells.length > 0) {
      assert.ok(edges.some((e) => e.source?.startsWith("bar-") || e.target?.startsWith("bar-")),
        `${context}: drawio sequence messages glue to activation bars`);
    }
  }

  const expectCard = schemaHasCardinality(spec);
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
    if (expectCard) {
      assert.ok(DRAWIO_CARDS.has(styleVal(e.style, "startArrow")), `${context} ${e.id}: ER startArrow`);
      assert.ok(DRAWIO_CARDS.has(styleVal(e.style, "endArrow")), `${context} ${e.id}: ER endArrow`);
      assert.equal(styleVal(e.style, "startFill"), "0", `${context} ${e.id}: startFill=0`);
      assert.equal(styleVal(e.style, "endFill"), "0", `${context} ${e.id}: endFill=0`);
    }
    const start = { x: sb.x + ex * sb.w, y: sb.y + ey * sb.h };
    const end = { x: tb.x + nx * tb.w, y: tb.y + ny * tb.h };
    assertAxisAlignedRoute([start, ...e.innerPts, end], start, end, 0.02, `${context} drawio ${e.id}`);
  }
}

/** Parses and validates Visio .vsdx OPC archive, XML well-formedness, glue, Batch B parts, and Visio-inch port alignment. */
export function assertValidVsdx(bytes, spec, context) {
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

  const expectCard = schemaHasCardinality(spec);
  let labelledCount = 0;
  let gluedToBar = 0;
  for (const c of connectors) {
    assert.equal(cellVal(c.body, "ShapeRouteStyle"), "1", `${context} ${c.nameU}: ShapeRouteStyle=1`);
    assert.equal(cellVal(c.body, "ConFixedCode"), "2", `${context} ${c.nameU}: ConFixedCode=2`);
    if (c.body.includes("<Text>")) labelledCount++;
    if (expectCard) {
      assert.ok(VSDX_CARDS.has(cellVal(c.body, "BeginArrow")), `${context} ${c.nameU}: Visio crow's-foot BeginArrow`);
      assert.ok(VSDX_CARDS.has(cellVal(c.body, "EndArrow")), `${context} ${c.nameU}: Visio crow's-foot EndArrow`);
    }

    const beginConn = connects.find((k) => k.fromSheet === c.id && k.fromPart === 9);
    const endConn = connects.find((k) => k.fromSheet === c.id && k.fromPart === 12);
    assert.ok(beginConn && endConn, `${context} ${c.nameU}: missing Begin/End Connect elements`);
    assert.match(cellFormula(c.body, "BeginX") ?? "", new RegExp(`Sheet\\.${beginConn.toSheet}!Connections\\.X${beginConn.toPart - 99}\\b`));
    assert.match(cellFormula(c.body, "EndX") ?? "", new RegExp(`Sheet\\.${endConn.toSheet}!Connections\\.X${endConn.toPart - 99}\\b`));

    const fromShape = byId.get(beginConn.toSheet);
    const toShape = byId.get(endConn.toSheet);
    assert.ok(fromShape && toShape, `${context} ${c.nameU}: glued shapes exist`);
    if (fromShape.nameU.startsWith("Bar_") || toShape.nameU.startsWith("Bar_")) gluedToBar++;
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

  // Architecture groups (including nested depth-2 containers)
  if (spec.type === "architecture" && spec.groups?.length) {
    for (const g of spec.groups) {
      const gShape = [...byId.values()].find((s) => s.nameU === `Group_${g.id}`);
      assert.ok(gShape, `${context}: Group_${g.id} shape present`);
      assert.match(gShape.body, /<Row N="msvStructureType"><Cell N="Value" V="Container" U="STR"\/>/, `${context}: Group_${g.id} has User.msvStructureType=Container`);
      if (g.parent) {
        const pShape = [...byId.values()].find((s) => s.nameU === `Group_${g.parent}`);
        assert.ok(pShape, `${context}: parent Group_${g.parent} present`);
        assert.match(gShape.body, new RegExp(`DEPENDSON\\(4,Sheet\\.${pShape.id}!SheetRef\\(\\)\\)`), `${context}: nested group points to parent ${g.parent}`);
        assert.match(pShape.body, new RegExp(`DEPENDSON\\(1,(?:Sheet\\.\\d+!SheetRef\\(\\),)*Sheet\\.${gShape.id}!SheetRef\\(\\)[,)]`), `${context}: parent container lists nested group ${g.id}`);
      }
      const members = spec.nodes.filter((n) => n.group === g.id);
      for (const m of members) {
        const mShape = [...byId.values()].find((s) => s.nameU === `Node_${m.id}`);
        assert.ok(mShape, `${context}: member Node_${m.id} present`);
        assert.match(gShape.body, new RegExp(`DEPENDSON\\(1,(?:Sheet\\.\\d+!SheetRef\\(\\),)*Sheet\\.${mShape.id}!SheetRef\\(\\)[,)]`), `${context}: container lists member ${m.id}`);
        assert.match(mShape.body, new RegExp(`DEPENDSON\\(4,Sheet\\.${gShape.id}!SheetRef\\(\\)\\)`), `${context}: member ${m.id} points to container ${g.id}`);
      }
    }
  }

  // Sequence frames, dividers, and activation bars
  if (spec.type === "sequence") {
    const frames = [...byId.values()].filter((s) => /^Frame_f\d+$/.test(s.nameU));
    const tabs = [...byId.values()].filter((s) => /^FrameTab_f\d+$/.test(s.nameU));
    const divs = [...byId.values()].filter((s) => /^FrameDiv_f\d+_\d+$/.test(s.nameU));
    const bars = [...byId.values()].filter((s) => s.nameU.startsWith("Bar_"));
    assert.equal(frames.length, expectedFrameCount(spec), `${context}: vsdx frame count`);
    assert.equal(tabs.length, expectedFrameCount(spec), `${context}: vsdx frame tab count`);
    assert.equal(divs.length, expectedDividerCount(spec), `${context}: vsdx frame divider count`);
    assert.equal(bars.length, expectedBarCount(spec), `${context}: vsdx activation bar count`);
    if (bars.length > 0) {
      assert.ok(gluedToBar > 0, `${context}: vsdx sequence messages glue to activation bars`);
    }
  }
}

/** Validates Lucid Standard Import ZIP + document.json contract, Batch B parts, and port axis-alignment. */
export function assertValidLucid(bytes, spec, context) {
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
    for (const g of spec.groups) {
      const c = shapeById.get(`group_${g.id.replace(/[^a-zA-Z0-9_]/g, "_")}`);
      assert.ok(c, `${context}: group container ${g.id} present`);
      assert.equal(c.style.rounding, g.parent ? 16 : 24, `${context}: group ${g.id} rounding`);
      if (g.parent) {
        assert.ok(c.customData?.some((d) => d.key === "basalt_parent_group" && d.value === g.parent), `${context}: nested group parent customData`);
      }
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
  if (spec.type === "sequence") {
    const frames = page.shapes.filter((s) => /^frame_f\d+$/.test(s.id));
    const tabs = page.shapes.filter((s) => /^frame_tab_f\d+$/.test(s.id));
    const divs = page.lines.filter((l) => /^frame_div_f\d+_\d+$/.test(l.id));
    const bars = page.shapes.filter((s) => s.id.startsWith("bar_"));
    assert.equal(frames.length, expectedFrameCount(spec), `${context}: lucid frame count`);
    assert.equal(tabs.length, expectedFrameCount(spec), `${context}: lucid frame tab count`);
    assert.equal(divs.length, expectedDividerCount(spec), `${context}: lucid frame divider count`);
    assert.equal(bars.length, expectedBarCount(spec), `${context}: lucid activation bar count`);
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

  const expectCard = schemaHasCardinality(spec);
  let labelled = 0;
  let gluedToBar = 0;
  for (const line of edgeLines) {
    assert.ok(line.endpoint1.type === "shapeEndpoint" || line.endpoint1.type === "lineEndpoint", `${context} ${line.id}: endpoint1 glued`);
    assert.ok(line.endpoint2.type === "shapeEndpoint" || line.endpoint2.type === "lineEndpoint", `${context} ${line.id}: endpoint2 glued`);
    if (
      (line.endpoint1.type === "shapeEndpoint" && line.endpoint1.shapeId.startsWith("bar_")) ||
      (line.endpoint2.type === "shapeEndpoint" && line.endpoint2.shapeId.startsWith("bar_"))
    ) {
      gluedToBar++;
    }
    if (spec.type === "schema") {
      if (expectCard) {
        assert.ok(LUCID_CARDS.has(line.endpoint1.style), `${context} ${line.id}: crow's-foot endpoint1 style`);
        assert.ok(LUCID_CARDS.has(line.endpoint2.style), `${context} ${line.id}: crow's-foot endpoint2 style`);
      } else {
        assert.equal(line.endpoint1.style, "closedCircle", `${context} ${line.id}: FK dot`);
      }
      // Verify every FK endpoint lands at its row's vertical center (or an intentional ±4px dual-cardinality arrival offset).
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
        const ok = minCenterDiff <= 0.51 || (expectCard && Math.abs(minCenterDiff - 4) <= 0.51);
        assert.ok(ok, `${context} ${line.id} on ${ep.shapeId}: FK y=${yLocal.toFixed(2)} off nearest Lucid row center by ${minCenterDiff.toFixed(2)}px`);
      }
    }
    if (line.text?.length) labelled++;
    const start = endpointPt(line.endpoint1);
    const end = endpointPt(line.endpoint2);
    const pts = [start, ...(line.elbowControlPoints ?? []), end];
    assertAxisAlignedRoute(pts, start, end, 0.02, `${context} lucid ${line.id}`);
  }
  if (spec.type === "sequence" && expectedBarCount(spec) > 0) {
    assert.ok(gluedToBar > 0, `${context}: lucid sequence messages glue to activation bars`);
  }
  assert.equal(labelled, expectedLabelCount(spec), `${context}: all labelled edges carry Line.text`);
}
