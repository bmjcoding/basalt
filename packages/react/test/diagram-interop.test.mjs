// Pure-Node tests for @srasyndicate/basalt/diagram-interop and basalt-diagram-export CLI (DECISIONS 311, 314, 324, 327).
// Runs with zero browser/Chromium launches (browser comparison and live DOM tests live in diagram-interop-browser.test.mjs).
// Covers:
//   - Byte-identical SHA-256 determinism across all 5 CIMIP fixtures and all Batch B fixtures (crow's foot,
//     far keys through corridors, nested groups, sequence frames + activation bars, automatic layout)
//   - Official draw.io XSD validation (mxfile-1.0.xsd), Visio OPC + Connects + ConFixedCode=2, Lucid Standard Import JSON
//   - Exact port axis-alignment invariant across every edge in every format (including RunTask negative fixture)
//   - Marks on architecture cards, data-flow steps, and sequence participants against manifest terms
//   - Frame header/else word-sized boxes, auto-layout direction, `measuredBy` metadata across formats, unplaced auto-layout error
//   - CLI (--headless) determinism across TZ/LC_ALL, symlink execution, HTML script[data-diagram], Batch B auto-layout
//   - Subpath isolation (outside root index, no "use client", no React/UI imports, lazy elkjs)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertValidDrawio,
  assertValidLucid,
  assertValidVsdx,
  CLI,
  pkg,
  readForeignZipEntries,
  readZipEntries,
  repo,
  sha256,
} from "./support-diagram-interop.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CIMIP = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cimip-diagrams.json"), "utf8"));
const CIMIP_KEYS = Object.keys(CIMIP);
const CIMIP_B = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cimip-diagrams-b.json"), "utf8"));
const LAYOUT_FIXTURES = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "diagram-layout.json"), "utf8")).figures;
const interop = await import(pathToFileURL(path.join(pkg, "dist", "diagram-interop.js")).href);

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

    const proof = fs.readFileSync(path.join(here, "fixtures", "runtask-jog-proof.vsdx"));
    const proofEntries = readForeignZipEntries(proof);
    const proofGlue = runTaskGlue(proofEntries.get("visio/pages/page1.xml").toString("utf8"));
    assert.ok(proofGlue.beginOff > 0.005 && proofGlue.beginOff < 0.0055, `the proof's RunTask Begin is 0.5 px off its Connection row (${proofGlue.beginOff} in)`);
    assert.throws(() => assertValidVsdx(proofEntries, CIMIP.architecture, "runtask-jog-proof"), /Connector_\d+: Begin .* != Connection/);
  });
});

describe("Batch B parts in all three formats (DECISIONS 324, 327)", () => {
  test("nested groups + two-line edge labels (cimip-diagrams-b architecture)", () => {
    const spec = CIMIP_B.architecture;
    for (const theme of ["light", "dark", "adaptive"]) {
      const xml = interop.diagramToDrawio(spec, { theme });
      assertValidDrawio(xml, spec, `batch-b-arch/${theme}`);
      assert.match(xml, /id="group-data"[^>]*parent="group-aws"/, "draw.io nested group parented in outer group");
      assert.match(xml, /SQL · NOTIFY&lt;br\/&gt;one transaction/, "draw.io two-line edge label");
    }
    for (const theme of ["light", "dark"]) {
      assertValidVsdx(interop.diagramToVsdx(spec, { theme }), spec, `batch-b-arch/${theme}`);
      const lucid = interop.diagramToLucid(spec, { theme });
      assertValidLucid(lucid, spec, `batch-b-arch/${theme}`);
      const doc = JSON.parse(readZipEntries(lucid).get("document.json").toString("utf8"));
      assert.ok(doc.pages[0].lines.some((l) => l.text?.[0]?.text.includes("<br>")), "Lucid two-line edge label");
    }
  });

  test("sequence frames (opt, nested loop, alt with else divider) + activation bars glued to messages (cimip-diagrams-b sequence)", () => {
    const spec = CIMIP_B.sequence;
    for (const theme of ["light", "dark", "adaptive"]) {
      const xml = interop.diagramToDrawio(spec, { theme });
      assertValidDrawio(xml, spec, `batch-b-seq/${theme}`);
      // Nested loop frame (f1) is parented inside outer opt frame (f0)
      assert.match(xml, /id="frame-f1"[^>]*parent="frame-f0"/, "nested loop frame parented inside opt frame");
      assert.match(xml, /id="frame-tab-f0" value="opt"/);
      assert.match(xml, /id="frame-tab-f1" value="loop"/);
      assert.match(xml, /id="frame-tab-f2" value="alt"/);
      assert.match(xml, /id="frame-div-f2-0"/);
      assert.match(xml, /Rejected or timed out/);
    }
    for (const theme of ["light", "dark"]) {
      assertValidVsdx(interop.diagramToVsdx(spec, { theme }), spec, `batch-b-seq/${theme}`);
      const lucid = interop.diagramToLucid(spec, { theme });
      assertValidLucid(lucid, spec, `batch-b-seq/${theme}`);
      const doc = JSON.parse(readZipEntries(lucid).get("document.json").toString("utf8"));
      const loopFrame = doc.pages[0].shapes.find((s) => s.id === "frame_f1");
      assert.ok(loopFrame?.customData?.some((d) => d.key === "basalt_parent_frame" && d.value === "f0"), "Lucid nested frame parent metadata");
    }
  });

  test("crow's-foot cardinality + far keys through top and interior corridors (cimip-diagrams-b schema)", () => {
    const spec = CIMIP_B.schema;
    // All 11 foreign keys in cimip-diagrams-b schema are drawn (including the 2 far keys: approvals -> incidents and approvals -> users)
    const scene = interop.measureDiagramHeadless(spec);
    assert.equal(scene.edges.length, 11, "all 11 foreign keys including both far keys are routed");
    const farIncident = scene.edges.find((e) => e.from === "approvals" && e.to === "incidents");
    const farUsers = scene.edges.find((e) => e.from === "approvals" && e.to === "users");
    assert.ok(farIncident && farIncident.pts.length === 6, "approvals -> incidents routed as 6-point corridor polyline");
    assert.ok(farUsers && farUsers.pts.length === 6, "approvals -> users routed as 6-point corridor polyline");
    assert.deepEqual(farIncident.card, { from: "zero-or-many", to: "one" });
    assert.deepEqual(farUsers.card, { from: "zero-or-many", to: "zero-or-one" });

    for (const theme of ["light", "dark", "adaptive"]) {
      const xml = interop.diagramToDrawio(spec, { theme });
      assertValidDrawio(xml, spec, `batch-b-schema/${theme}`);
      assert.match(xml, /startArrow=ERoneToMany/);
      assert.match(xml, /startArrow=ERzeroToOne/);
      assert.match(xml, /startArrow=ERzeroToMany/);
      assert.match(xml, /endArrow=ERmandOne/);
      assert.match(xml, /endArrow=ERzeroToOne/);
    }
    for (const theme of ["light", "dark"]) {
      const vsdx = interop.diagramToVsdx(spec, { theme });
      assertValidVsdx(vsdx, spec, `batch-b-schema/${theme}`);
      const page1 = readZipEntries(vsdx).get("visio/pages/page1.xml").toString("utf8");
      assert.match(page1, /<Cell N="BeginArrow" V="28"\/>/);
      assert.match(page1, /<Cell N="BeginArrow" V="29"\/>/);
      assert.match(page1, /<Cell N="BeginArrow" V="30"\/>/);
      assert.match(page1, /<Cell N="EndArrow" V="25"\/>/);
      assert.match(page1, /<Cell N="EndArrow" V="30"\/>/);

      const lucid = interop.diagramToLucid(spec, { theme });
      assertValidLucid(lucid, spec, `batch-b-schema/${theme}`);
      const doc = JSON.parse(readZipEntries(lucid).get("document.json").toString("utf8"));
      const styles = new Set(doc.pages[0].lines.flatMap((l) => [l.endpoint1.style, l.endpoint2.style]));
      for (const s of ["exactlyOne", "zeroOrOne", "oneOrMore", "zeroOrMore"]) {
        assert.ok(styles.has(s), `Lucid schema includes ${s}`);
      }
    }
  });

  test("automatic layout (autoArchitecture, autoFlowchart, autoSchema, nestedArchitecture) placed via placeAutoDiagram", async () => {
    // Unplaced auto spec without placement fails clearly
    assert.throws(() => interop.diagramToDrawio(CIMIP_B.autoArchitecture), /placeAutoDiagram/i);

    const autoCases = [
      ["autoArchitecture", CIMIP_B.autoArchitecture],
      ["autoFlowchart", CIMIP_B.autoFlowchart],
      ["autoSchema", CIMIP_B.autoSchema],
      ["nestedArchitecture", LAYOUT_FIXTURES.nestedArchitecture],
    ];
    for (const [name, rawSpec] of autoCases) {
      const placed = await interop.placeAutoDiagram(rawSpec);
      assert.ok(Array.isArray(placed.placement) && placed.placement.length >= 1, `${name}: placement generated`);
      const drawioA = interop.diagramToDrawio(placed);
      const drawioB = interop.diagramToDrawio(placed);
      assert.equal(sha256(drawioA), sha256(drawioB), `${name}: drawio deterministic`);
      assertValidDrawio(drawioA, placed, `auto/${name}`);
      assertValidVsdx(interop.diagramToVsdx(placed), placed, `auto/${name}`);
      assertValidLucid(interop.diagramToLucid(placed), placed, `auto/${name}`);
    }
  });

  test("frame header labels and else rows are sized to their words and never cut uncovered lifelines (B2)", () => {
    const seq = CIMIP_B.sequence;
    const scene = interop.measureDiagramHeadless(seq);
    const pad = scene.pad;
    const drawio = interop.diagramToDrawio(seq);
    const vsdxPage = readZipEntries(interop.diagramToVsdx(seq)).get("visio/pages/page1.xml").toString("utf8");
    const lucidDoc = interop.diagramToLucidJson(seq);
    const page = lucidDoc.pages[0];

    // Check Lucid shapes: every frame_label_* and frame_else_* matches labelBox width (not full frame width)
    // and never covers a lifeline x outside its scene labelBox.
    const lifelineXs = scene.lifelines.map((l) => l.x + pad);
    for (const f of scene.frames) {
      if (f.label && f.labelBox) {
        const s = page.shapes.find((x) => x.id === `frame_label_${f.id}`);
        assert.ok(s, `Lucid frame_label_${f.id} present`);
        assert.ok(s.boundingBox.w < f.box.w - 40, `frame_label_${f.id} (${s.boundingBox.w}px) must be sized to words, not full frame (${f.box.w}px)`);
        assert.ok(Math.abs(s.boundingBox.w - f.labelBox.w) <= 0.5, `Lucid frame_label_${f.id} matches labelBox width`);
        assert.match(s.text, /font-weight:\s*500/, `Lucid frame_label_${f.id} uses weight 500`);
        for (const lx of lifelineXs) {
          const inExport = lx >= s.boundingBox.x && lx <= s.boundingBox.x + s.boundingBox.w;
          const inScene = lx >= f.labelBox.x + pad && lx <= f.labelBox.x + pad + f.labelBox.w;
          assert.equal(inExport, inScene, `Lucid frame_label_${f.id} lifeline x=${lx} coverage matches Basalt label rect`);
        }
        // Check draw.io frame-label-* geometry & weight
        const mDrawio = drawio.match(new RegExp(`id="frame-label-${f.id}"[^>]*value="([^"]*)"[^>]*>\\s*<mxGeometry[^>]*width="([\\d.]+)"`));
        assert.ok(mDrawio, `draw.io frame-label-${f.id} present`);
        assert.match(mDrawio[1], /font-weight:500/, `draw.io frame-label-${f.id} uses weight 500`);
        assert.ok(Math.abs(Number(mDrawio[2]) - f.labelBox.w) <= 0.5, `draw.io frame-label-${f.id} matches labelBox width`);
        // Check Visio FrameLabel_* width
        const mVsdx = vsdxPage.match(new RegExp(`NameU="FrameLabel_${f.id}"[\\s\\S]*?<Cell N="Width" V="([\\d.]+)"`));
        assert.ok(mVsdx, `Visio FrameLabel_${f.id} present`);
        assert.ok(Math.abs(Number(mVsdx[1]) * 96 - f.labelBox.w) <= 0.5, `Visio FrameLabel_${f.id} matches labelBox width`);
      }
      f.dividers.forEach((div, k) => {
        if (!div.labelBox) return;
        const s = page.shapes.find((x) => x.id === `frame_else_${f.id}_${k}`);
        assert.ok(s, `Lucid frame_else_${f.id}_${k} present`);
        assert.ok(s.boundingBox.w < f.box.w - 40, `frame_else_${f.id}_${k} (${s.boundingBox.w}px) must be sized to words, not full frame (${f.box.w}px)`);
        for (const lx of lifelineXs) {
          const inExport = lx >= s.boundingBox.x && lx <= s.boundingBox.x + s.boundingBox.w;
          const inScene = lx >= div.labelBox.x + pad && lx <= div.labelBox.x + pad + div.labelBox.w;
          assert.equal(inExport, inScene, `Lucid frame_else_${f.id}_${k} lifeline x=${lx} coverage matches Basalt label rect`);
        }
        const mDrawio = drawio.match(new RegExp(`id="frame-else-${f.id}-${k}"[^>]*>\\s*<mxGeometry[^>]*width="([\\d.]+)"`));
        assert.ok(mDrawio, `draw.io frame-else-${f.id}-${k} present`);
        assert.ok(Math.abs(Number(mDrawio[1]) - div.labelBox.w) <= 0.5, `draw.io frame-else-${f.id}-${k} matches labelBox width`);
        const mVsdx = vsdxPage.match(new RegExp(`NameU="FrameElse_${f.id}_${k}"[\\s\\S]*?<Cell N="Width" V="([\\d.]+)"`));
        assert.ok(mVsdx, `Visio FrameElse_${f.id}_${k} present`);
        assert.ok(Math.abs(Number(mVsdx[1]) * 96 - div.labelBox.w) <= 0.5, `Visio FrameElse_${f.id}_${k} matches labelBox width`);
      });
    }
    const tab = page.shapes.find((x) => x.id === "frame_tab_f0");
    assert.match(tab.text, /font-weight:\s*600/, "Lucid frame tab uses weight 600");
  });

  test("headless auto-layout picks the first direction whose minimum width fits target width (Polish 2)", async () => {
    const placed = await interop.placeAutoDiagram(CIMIP_B.autoArchitecture);
    const at1104 = interop.measureDiagramHeadless(placed, { width: 1104 });
    const at1800 = interop.measureDiagramHeadless(placed, { width: 1800 });
    const cols1104 = Math.max(...at1104.nodes.map((n) => n.col));
    const cols1800 = Math.max(...at1800.nodes.map((n) => n.col));
    assert.ok(cols1104 < cols1800, `autoArchitecture at 1104px takes down (${cols1104} cols) while at 1800px takes right (${cols1800} cols)`);
  });

  test("measuredBy engine metadata is written across draw.io (XSD-valid), Visio Creator, and every Lucid node", () => {
    const engine = "Chromium 146.0.7680.16, darwin, Basalt 0.1.0";
    const xml = interop.diagramToDrawio(CIMIP.architecture, { measuredBy: engine });
    assertValidDrawio(xml, CIMIP.architecture, "metadata-drawio");
    assert.match(xml, /<mxfile compressed="false" agent="Basalt Diagram Exporter \(Chromium 146\.0\.7680\.16, darwin, Basalt 0\.1\.0\)">/);

    const vsdx = interop.diagramToVsdx(CIMIP.architecture, { measuredBy: engine });
    assertValidVsdx(vsdx, CIMIP.architecture, "metadata-vsdx");
    assert.match(readZipEntries(vsdx).get("visio/document.xml").toString("utf8"), /<Creator>Basalt Diagram Exporter \(Chromium 146\.0\.7680\.16, darwin, Basalt 0\.1\.0\)<\/Creator>/);

    const lucid = interop.diagramToLucid(CIMIP.architecture, { measuredBy: engine });
    assertValidLucid(lucid, CIMIP.architecture, "metadata-lucid");
    const doc = JSON.parse(readZipEntries(lucid).get("document.json").toString("utf8"));
    const nodeShapes = doc.pages[0].shapes.filter((s) => s.id.startsWith("node_"));
    assert.ok(nodeShapes.length > 0);
    for (const s of nodeShapes) {
      assert.ok(s.customData?.some((d) => d.key === "basalt_measured_by" && d.value === engine), `Lucid ${s.id} carries basalt_measured_by`);
    }
  });
});

describe("service marks embedding policy (architecture, data-flow steps, sequence participants)", () => {
  const skillMarks = JSON.parse(fs.readFileSync(path.join(repo, "tools", "html-skill", "src", "marks.json"), "utf8")).marks;
  const resolveMark = (id, theme) => (theme === "dark" ? skillMarks[id]?.onDark ?? skillMarks[id]?.onLight : skillMarks[id]?.onLight);

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

    const drawioOmit = interop.diagramToDrawio(spec, { resolveMark });
    assert.doesNotMatch(drawioOmit, /id="mark-/);
    assert.equal([...readZipEntries(interop.diagramToVsdx(spec, { resolveMark })).keys()].filter((k) => k.startsWith("visio/media/")).length, 0);
    assert.equal([...readZipEntries(interop.diagramToLucid(spec, { resolveMark })).keys()].filter((k) => k.startsWith("images/")).length, 0);

    const drawioEmbed = interop.diagramToDrawio(spec, { marks: "embed", resolveMark });
    assertValidDrawio(drawioEmbed, spec, "marks-embed");
    assert.match(drawioEmbed, /id="mark-ecs"/);
    assert.match(drawioEmbed, /id="mark-k8s"/);
    assert.match(drawioEmbed, /id="mark-db"/);
    assert.doesNotMatch(drawioEmbed, /id="mark-br"/);
    assert.doesNotMatch(drawioEmbed, /id="mark-gh"/);

    const drawioAdaptive = interop.diagramToDrawio(spec, { theme: "adaptive", marks: "embed", resolveMark });
    assertValidDrawio(drawioAdaptive, spec, "marks-embed-adaptive");
    assert.match(drawioAdaptive, /prefers-color-scheme%3Adark/, "adaptive draw.io embeds dual light/dark mark form");

    const vsdxEmbed = readZipEntries(interop.diagramToVsdx(spec, { marks: "embed", resolveMark }));
    assert.equal([...vsdxEmbed.keys()].filter((k) => k.startsWith("visio/media/")).length, 3);
    assert.ok(vsdxEmbed.has("visio/pages/_rels/page1.xml.rels"));
    assert.ok(interop.bundledMarkAttribution("kubernetes")?.includes("Apache-2.0"));
    assert.match(vsdxEmbed.get("visio/document.xml").toString("utf8"), /Apache-2\.0/, "Kubernetes attribution in Visio document.xml");

    const lucidEmbed = readZipEntries(interop.diagramToLucid(spec, { marks: "embed", resolveMark }));
    assert.equal([...lucidEmbed.keys()].filter((k) => k.startsWith("images/")).length, 3);
    const lucidDoc = JSON.parse(lucidEmbed.get("document.json").toString("utf8"));
    const k8sMarkShape = lucidDoc.pages[0].shapes.find((s) => s.id === "mark_k8s");
    assert.ok(k8sMarkShape?.customData?.some((d) => d.key === "attribution" && d.value.includes("Apache-2.0")), "Kubernetes attribution in Lucid customData");
  });

  test("marks on data-flow steps and sequence participants embed cleanly across all 3 formats", () => {
    const dfSpec = {
      type: "data-flow",
      title: "Steps with marks",
      summary: "Data-flow steps carrying allowed and restricted marks.",
      lanes: [{ id: "aws", label: "AWS" }, { id: "k8s", label: "Cluster" }],
      nodes: [
        { id: "s1", lane: "aws", name: "ECS task", col: 1, mark: "aws-ecs-service" },
        { id: "s2", lane: "k8s", name: "Kubernetes pod", col: 2, mark: "kubernetes" },
        { id: "s3", lane: "k8s", name: "GitHub hook", col: 3, mark: "github" },
      ],
      edges: [{ from: "s1", to: "s2", kind: "main" }, { from: "s2", to: "s3" }],
    };
    const dfDrawio = interop.diagramToDrawio(dfSpec, { marks: "embed", resolveMark });
    assertValidDrawio(dfDrawio, dfSpec, "df-marks");
    assert.match(dfDrawio, /id="mark-s1"/);
    assert.match(dfDrawio, /id="mark-s2"/);
    assert.doesNotMatch(dfDrawio, /id="mark-s3"/);
    assert.equal([...readZipEntries(interop.diagramToVsdx(dfSpec, { marks: "embed", resolveMark })).keys()].filter((k) => k.startsWith("visio/media/")).length, 2);
    assert.equal([...readZipEntries(interop.diagramToLucid(dfSpec, { marks: "embed", resolveMark })).keys()].filter((k) => k.startsWith("images/")).length, 2);

    const seqSpec = {
      type: "sequence",
      title: "Participants with marks",
      summary: "Sequence participants carrying allowed and restricted marks.",
      participants: [
        { id: "svc", kind: "ECS", name: "ECS service", focal: true, mark: "aws-ecs-service" },
        { id: "db", kind: "Database", name: "Database", mark: "aws-database" },
        { id: "gh", kind: "Git", name: "GitHub", mark: "github" },
      ],
      steps: [
        { from: "svc", to: "db", kind: "main", label: "SELECT 1" },
        { from: "db", to: "gh", label: "webhook" },
      ],
    };
    const seqDrawio = interop.diagramToDrawio(seqSpec, { marks: "embed", resolveMark });
    assertValidDrawio(seqDrawio, seqSpec, "seq-marks");
    assert.match(seqDrawio, /id="mark-svc"/);
    assert.match(seqDrawio, /id="mark-db"/);
    assert.doesNotMatch(seqDrawio, /id="mark-gh"/);
    assert.match(seqDrawio, /padding-left:24px;padding-right:24px;/, "centered participant reserves 24px on both sides");
    assert.equal([...readZipEntries(interop.diagramToVsdx(seqSpec, { marks: "embed", resolveMark })).keys()].filter((k) => k.startsWith("visio/media/")).length, 2);
    assert.equal([...readZipEntries(interop.diagramToLucid(seqSpec, { marks: "embed", resolveMark })).keys()].filter((k) => k.startsWith("images/")).length, 2);
  });
});

describe("basalt-diagram-export CLI (Node-only --headless mode)", () => {
  test("exports JSON map, single JSON, Batch B auto-layout, and HTML script[data-diagram] deterministically", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-interop-cli-"));
    try {
      // 1. Multi-diagram JSON under two different TZ and LC_ALL environments
      const outA = path.join(dir, "a");
      const outB = path.join(dir, "b");
      const r1 = spawnSync(process.execPath, [CLI, path.join(here, "fixtures", "cimip-diagrams.json"), "--headless", "--to", "drawio,vsdx,lucid,lucid-json", "--out", outA], {
        encoding: "utf8",
        env: { ...process.env, TZ: "UTC", LC_ALL: "C" },
      });
      assert.equal(r1.status, 0, r1.stderr);
      assert.match(r1.stderr, /approximate/i, "--headless notes approximate geometry on stderr");
      assert.match(
        r1.stdout,
        /architecture\.lucid \(\d+ bytes\) — Lucid REST API only \(POST https:\/\/api\.lucid\.co\/v1\/documents with a token, type x-application\/vnd\.lucid\.standardImport; use \.vsdx to import through Lucid's own screen\)/,
        ".lucid output line explains REST API only and points UI users to .vsdx",
      );
      const rHelp = spawnSync(process.execPath, [CLI, "--help"], { encoding: "utf8" });
      assert.equal(rHelp.status, 0, rHelp.stderr);
      assert.match(rHelp.stdout, /POST https:\/\/api\.lucid\.co\/v1\/documents/, "--help documents Lucid REST API endpoint");
      assert.match(rHelp.stdout, /x-application\/vnd\.lucid\.standardImport/, "--help documents Lucid Standard Import media type");
      assert.match(rHelp.stdout, /use \.vsdx/i, "--help points Lucid UI imports to .vsdx");
      const r2 = spawnSync(process.execPath, [CLI, path.join(here, "fixtures", "cimip-diagrams.json"), "--headless", "--to", "drawio,vsdx,lucid,lucid-json", "--out", outB], {
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
      assert.match(fs.readFileSync(path.join(outA, "architecture.drawio"), "utf8"), /Basalt \d+\.\d+\.\d+ headless \(approximate\)/);

      // 1b. Symlink execution (as npm installs node_modules/.bin/basalt-diagram-export)
      const symLink = path.join(dir, "basalt-diagram-export-link");
      fs.symlinkSync(CLI, symLink);
      const symOut = path.join(dir, "from-symlink");
      const singleJson = path.join(dir, "one.json");
      fs.writeFileSync(singleJson, JSON.stringify(CIMIP.flowchart));
      const rSym = spawnSync(process.execPath, [symLink, singleJson, "--headless", "--to", "vsdx", "--out", symOut], { encoding: "utf8" });
      assert.equal(rSym.status, 0, rSym.stderr);
      assert.ok(fs.existsSync(path.join(symOut, "one.vsdx")), "symlinked CLI wrote output file");

      // 1c. Batch B fixtures (crow's foot, frames, nested groups, and layout="auto") via CLI --headless
      const batchBIn = path.join(dir, "batch-b.json");
      fs.writeFileSync(batchBIn, JSON.stringify({
        architecture: CIMIP_B.architecture,
        sequence: CIMIP_B.sequence,
        schema: CIMIP_B.schema,
        autoArchitecture: CIMIP_B.autoArchitecture,
        autoFlowchart: CIMIP_B.autoFlowchart,
        autoSchema: CIMIP_B.autoSchema,
      }));
      const batchBOut = path.join(dir, "batch-b-out");
      const rB = spawnSync(process.execPath, [CLI, batchBIn, "--headless", "--to", "drawio,vsdx,lucid", "--out", batchBOut], { encoding: "utf8" });
      assert.equal(rB.status, 0, rB.stderr);
      for (const [key, stem] of [
        ["architecture", "architecture"],
        ["sequence", "sequence"],
        ["schema", "schema"],
        ["autoArchitecture", "auto-architecture"],
        ["autoFlowchart", "auto-flowchart"],
        ["autoSchema", "auto-schema"],
      ]) {
        assertValidDrawio(fs.readFileSync(path.join(batchBOut, `${stem}.drawio`), "utf8"), CIMIP_B[key], `cli-batch-b/${key}`);
        assertValidVsdx(fs.readFileSync(path.join(batchBOut, `${stem}.vsdx`)), CIMIP_B[key], `cli-batch-b/${key}`);
        assertValidLucid(fs.readFileSync(path.join(batchBOut, `${stem}.lucid`)), CIMIP_B[key], `cli-batch-b/${key}`);
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
      const r3 = spawnSync(process.execPath, [CLI, htmlPath, "--headless", "--to", "drawio,vsdx", "--theme", "adaptive", "--out", htmlOut], { encoding: "utf8" });
      assert.equal(r3.status, 0, r3.stderr);
      assert.deepEqual(fs.readdirSync(htmlOut).sort(), ["arch.drawio", "arch.vsdx"]);
      assertValidDrawio(fs.readFileSync(path.join(htmlOut, "arch.drawio"), "utf8"), CIMIP.architecture, "cli-html-adaptive");
      assertValidVsdx(fs.readFileSync(path.join(htmlOut, "arch.vsdx")), CIMIP.architecture, "cli-html-vsdx");

      // 3. Single file --out path + mismatched extension check
      const exactOut = path.join(dir, "exact.drawio");
      const r4 = spawnSync(process.execPath, [CLI, singleJson, "--headless", "--to", "drawio", "--out", exactOut], { encoding: "utf8" });
      assert.equal(r4.status, 0, r4.stderr);
      assert.ok(fs.existsSync(exactOut));

      const mismatch = spawnSync(process.execPath, [CLI, singleJson, "--headless", "--to", "drawio", "--out", path.join(dir, "wrong.vsdx")], { encoding: "utf8" });
      assert.notEqual(mismatch.status, 0, "mismatched --out extension must fail");
      assert.match(mismatch.stderr, /extension does not match/i);

      // 4. Custom mark SVG file resolved relative to input file + warning when missing
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
      const rCustom = spawnSync(process.execPath, [CLI, customIn, "--headless", "--to", "drawio,vsdx", "--marks", "embed", "--out", customOut], { encoding: "utf8" });
      assert.equal(rCustom.status, 0, rCustom.stderr);
      assert.match(rCustom.stderr, /warning: custom mark file "no-such\.svg" not found/i, "warns on missing custom mark file");
      const customDrawio = fs.readFileSync(path.join(customOut, "custom.drawio"), "utf8");
      assert.match(customDrawio, /id="mark-ok"/, "resolved custom SVG file embedded");
      assert.doesNotMatch(customDrawio, /id="mark-miss"/, "missing custom SVG skipped");

      // 5. Flag validation errors
      const bad = spawnSync(process.execPath, [CLI, singleJson, "--headless", "--to", "bogus"], { encoding: "utf8" });
      assert.notEqual(bad.status, 0);
      const conflict = spawnSync(process.execPath, [CLI, singleJson, "--browser", "--headless"], { encoding: "utf8" });
      assert.notEqual(conflict.status, 0);
      assert.match(conflict.stderr, /cannot be used together/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("subpath isolation", () => {
  test("@srasyndicate/basalt/diagram-interop stays outside the root index, loads elkjs lazily, and carries no client directive or React imports", async () => {
    const root = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    for (const name of ["diagramToDrawio", "diagramToVsdx", "diagramToLucid", "diagramToLucidJson", "exportMeasuredDiagram", "placeAutoDiagram"]) {
      assert.equal(name in root, false, `${name} must not be on the root index`);
      assert.equal(typeof interop[name], "function", `${name} is exported from diagram-interop`);
    }
    const source = fs.readFileSync(path.join(pkg, "dist", "diagram-interop.js"), "utf8");
    assert.doesNotMatch(source, /^"use client";/, "diagram-interop.js must not carry \"use client\"");
    assert.doesNotMatch(source, /\bfrom\s*"(react|react-dom|@base-ui|@phosphor-icons|cmdk|shiki)/, "diagram-interop.js imports no UI libraries");
    assert.doesNotMatch(source, /elkjs/, "diagram-interop.js never bundles elkjs inline");
    assert.match(source, /import\(["']\.\/diagram-layout\.js["']\)/, "placeAutoDiagram dynamically imports ./diagram-layout.js");
  });
});
