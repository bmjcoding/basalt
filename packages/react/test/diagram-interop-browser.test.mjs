// Browser tests for @srasyndicate/basalt/diagram-interop and basalt-diagram-export CLI (DECISIONS 311, 314, 324, 327).
// Separated from diagram-interop.test.mjs so Node-only validation runs without launching Chromium (tests-paused.md).
// Covers:
//   - Live DOM measured Geo entry (exportMeasuredDiagram + readMeasuredExtras) on CIMIP Phase 1 and Batch B figures
//   - B2 exact geometry: CLI default path vs live React components asserts <= 0.5px on every box and route point,
//     while recording the approximate headless fallback's drift
//   - Byte-identical repeat SHA-256 on one Chromium and Chromium version recorded in .drawio, .vsdx, and .lucid metadata
//   - Native browser ESM execution (no process global) and readMeasuredExtras lane propagation
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";
import {
  assertValidDrawio,
  assertValidLucid,
  assertValidVsdx,
  CLI,
  readZipEntries,
  sha256,
} from "./support-diagram-interop.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CIMIP = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cimip-diagrams.json"), "utf8"));
const CIMIP_B = JSON.parse(fs.readFileSync(path.join(here, "fixtures", "cimip-diagrams-b.json"), "utf8"));
const interop = await import(pathToFileURL(path.join(pkg, "dist", "diagram-interop.js")).href);

function compareLucidDocs(liveDoc, testDoc, key) {
  const L = liveDoc.pages[0], H = testDoc.pages[0];
  assert.deepEqual(L.shapes.map((s) => s.id), H.shapes.map((s) => s.id), `${key}: shape ids match`);
  assert.deepEqual(L.lines.map((l) => l.id), H.lines.map((l) => l.id), `${key}: line ids match`);

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

  const shapeById = (page) => new Map(page.shapes.map((s) => [s.id, s]));
  const lineById = (page) => new Map(page.lines.map((l) => [l.id, l]));
  const epPt = (page, ep) => {
    if (ep.type === "shapeEndpoint") {
      const s = shapeById(page).get(ep.shapeId);
      return { x: s.boundingBox.x + ep.position.x * s.boundingBox.w, y: s.boundingBox.y + ep.position.y * s.boundingBox.h };
    }
    if (ep.type === "lineEndpoint") {
      const l = lineById(page).get(ep.lineId);
      const p1 = epPt(page, l.endpoint1), p2 = epPt(page, l.endpoint2);
      return { x: p1.x + ep.position * (p2.x - p1.x), y: p1.y + ep.position * (p2.y - p1.y) };
    }
    return ep.position;
  };

  const polyLength = (pts) => {
    let len = 0;
    for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
    return len;
  };

  let maxRouteDelta = 0, routesOverHalfPx = 0;
  let maxLabelDelta = 0, labelsOverHalfPx = 0;
  const routeDeltas = {};
  const labelDeltas = {};
  for (const l of L.lines.filter((x) => x.id.startsWith("edge_"))) {
    const h = H.lines.find((x) => x.id === l.id);
    const lp = [epPt(L, l.endpoint1), ...(l.elbowControlPoints ?? []), epPt(L, l.endpoint2)];
    const hp = [epPt(H, h.endpoint1), ...(h.elbowControlPoints ?? []), epPt(H, h.endpoint2)];
    let m = lp.length === hp.length ? 0 : Infinity;
    if (lp.length === hp.length) {
      for (let k = 0; k < lp.length; k++) {
        m = Math.max(m, Math.abs(lp[k].x - hp[k].x), Math.abs(lp[k].y - hp[k].y));
      }
    }
    if (m > 0.5) routesOverHalfPx++;
    if (Number.isFinite(m) && m > maxRouteDelta) maxRouteDelta = m;
    routeDeltas[l.id] = Number.isFinite(m) ? +m.toFixed(2) : "point-count-mismatch";

    const lt = l.text ?? [], ht = h.text ?? [];
    assert.equal(lt.length, ht.length, `${key}: ${l.id} text count`);
    if (lt.length > 0) {
      const arc = polyLength(lp);
      let lm = 0;
      for (let k = 0; k < lt.length; k++) {
        lm = Math.max(lm, Math.abs((lt[k].position ?? 0.5) - (ht[k].position ?? 0.5)) * arc);
      }
      if (lm > 0.5) labelsOverHalfPx++;
      if (lm > maxLabelDelta) maxLabelDelta = lm;
      labelDeltas[l.id] = +lm.toFixed(2);
    }
  }

  // Lifelines (x) and frame dividers (endpoints)
  let maxGuideDelta = 0, guidesOverHalfPx = 0;
  for (const l of L.lines.filter((x) => x.id.startsWith("life_") || x.id.startsWith("frame_div_"))) {
    const h = H.lines.find((x) => x.id === l.id);
    const lp1 = epPt(L, l.endpoint1), lp2 = epPt(L, l.endpoint2);
    const hp1 = epPt(H, h.endpoint1), hp2 = epPt(H, h.endpoint2);
    const m = Math.max(
      Math.abs(lp1.x - hp1.x), Math.abs(lp1.y - hp1.y),
      Math.abs(lp2.x - hp2.x), Math.abs(lp2.y - hp2.y),
    );
    if (m > 0.5) guidesOverHalfPx++;
    if (m > maxGuideDelta) maxGuideDelta = m;
  }

  return {
    shapesOverHalfPx,
    maxBoxDelta: +maxBoxDelta.toFixed(2),
    routesOverHalfPx,
    maxRouteDelta: +maxRouteDelta.toFixed(2),
    labelsOverHalfPx,
    maxLabelDelta: +maxLabelDelta.toFixed(2),
    guidesOverHalfPx,
    maxGuideDelta: +maxGuideDelta.toFixed(2),
    boxDeltas,
    routeDeltas,
    labelDeltas,
  };
}

describe("live DOM measured Geo entry and B2 exact geometry (Chromium)", () => {
  test("live React figures match single-figure CLI default path within <= 0.5px (boxes, routes, labels, frames, lifelines) and record headless fallback drift", async () => {
    const autoArchPlaced = await interop.placeAutoDiagram(CIMIP_B.autoArchitecture);
    const HOST = `
      import data from "./test/fixtures/cimip-diagrams.json";
      import dataB from "./test/fixtures/cimip-diagrams-b.json";
      import { buildModel, figureTree, measureFigure, syncAttributes } from "./dist/diagram-core.js";
      import { readMeasuredExtras } from "./dist/diagram-interop.js";
      const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
      const all = {
        ...data,
        batchBArch: dataB.architecture,
        batchBSeq: dataB.sequence,
        batchBSchema: dataB.schema,
        batchBAuto: ${JSON.stringify(autoArchPlaced)},
      };
      function Host() {
        return <main style={{ width: 1104, margin: 0, padding: 0, display: "grid", gap: 64 }}>
          {Object.entries(all).map(([key, d]) => { const X = C[d.type]; const { type, ...props } = d; return <X key={key} id={"fig-" + key} {...props} />; })}
        </main>;
      }
      createRoot(document.getElementById("root")).render(<Host />);
      window.__measureAll = () => {
        const out = {};
        for (const [key, spec] of Object.entries(all)) {
          const fig = document.getElementById("fig-" + key);
          const placements = spec.layout === "auto" && Array.isArray(spec.placement) ? spec.placement : [undefined];
          const base = (fig.getAttribute("aria-labelledby") || "dg").replace(/-title$/, "");
          const opts = { prefix: "basalt-diagram", base, hasSource: Boolean(spec.source), hiddenClass: "basalt-visually-hidden" };
          let chosen = null;
          for (const placement of placements) {
            const model = buildModel(spec, { checks: false, placement });
            if (model.unplaced) continue;
            const res = measureFigure(fig, model, "basalt-diagram", base, { layout: "drawn" }, (d) => syncAttributes(fig, figureTree(model, d, opts)));
            if (res?.dyn?.layout === "drawn" && res.geo) { chosen = { geo: res.geo, extras: readMeasuredExtras(fig, "basalt-diagram"), placement }; break; }
          }
          if (!chosen) {
            const model = buildModel(spec, { checks: false, placement: placements[0] });
            const sizeTo = (least) => { if (least > 1104) fig.style.width = Math.ceil(least) + "px"; };
            const res = measureFigure(fig, model, "basalt-diagram", base, { layout: "drawn" }, (d) => syncAttributes(fig, figureTree(model, d, opts)), undefined, sizeTo);
            chosen = { geo: res.geo, extras: readMeasuredExtras(fig, "basalt-diagram"), placement: placements[0] };
          }
          out[key] = chosen;
        }
        return out;
      };
    `;
    const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
    const fontCss = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900} html,body{margin:0;padding:0;background:var(--basalt-surface-page)}`;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-interop-b2-"));
    const browser = await launch();
    try {
      const { page, errors } = await fixturePage(browser, HOST, { theme: "light", viewport: { width: 1280, height: 1200 }, standards: true });
      await page.addStyleTag({ content: fontCss });
      await page.evaluate(async () => {
        await Promise.all([...document.fonts].map((f) => f.load()));
        await document.fonts.ready;
      });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
      const measured = await page.evaluate(() => window.__measureAll());
      assert.deepEqual(errors, []);

      // Validate live measured export for all 5 CIMIP fixtures + Batch B nested groups, frames/bars, crow's foot + far keys, auto
      const specsByKey = {
        ...CIMIP,
        batchBArch: CIMIP_B.architecture,
        batchBSeq: CIMIP_B.sequence,
        batchBSchema: CIMIP_B.schema,
        batchBAuto: autoArchPlaced,
      };
      const comparison = { defaultPath: {}, headlessFallback: {} };

      for (const [key, spec] of Object.entries(specsByKey)) {
        const { geo, extras, placement } = measured[key];
        assert.ok(geo && geo.lines.length > 0, `${key}: live Geo measured`);
        assertValidDrawio(interop.exportMeasuredDiagram(spec, geo, "drawio", { extras, placement }), spec, `measured/${key}`);
        assertValidVsdx(interop.exportMeasuredDiagram(spec, geo, "vsdx", { extras, placement }), spec, `measured/${key}`);
        assertValidLucid(interop.exportMeasuredDiagram(spec, geo, "lucid", { extras, placement }), spec, `measured/${key}`);

        // Run the CLI on a single-figure JSON file so every figure is first in its run (guards B1 font-load race).
        const singleIn = path.join(dir, `${key}.json`);
        fs.writeFileSync(singleIn, JSON.stringify(spec));
        const outA = path.join(dir, `out-${key}-a`);
        const cliArgs = [CLI, singleIn, "--to", "drawio,vsdx,lucid,lucid-json", "--width", "1104"];
        const rA = spawnSync(process.execPath, [...cliArgs, "--out", outA], { encoding: "utf8", timeout: 90000 });
        assert.equal(rA.status, 0, `${key}: ${rA.stderr}`);

        const stem = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        // Verify repeat byte-identity on the first CIMIP figure and Batch B sequence
        if (key === "architecture" || key === "batchBSeq") {
          const outB = path.join(dir, `out-${key}-b`);
          const rB = spawnSync(process.execPath, [...cliArgs, "--out", outB], { encoding: "utf8", timeout: 90000 });
          assert.equal(rB.status, 0, `${key} repeat: ${rB.stderr}`);
          for (const ext of [".drawio", ".vsdx", ".lucid", ".lucid.json"]) {
            assert.equal(
              sha256(fs.readFileSync(path.join(outA, stem + ext))),
              sha256(fs.readFileSync(path.join(outB, stem + ext))),
              `CLI default repeat byte-identical on one Chromium: ${stem}${ext}`,
            );
          }
        }

        // Verify Chromium version + platform + Basalt version metadata in all three formats
        const drawioXml = fs.readFileSync(path.join(outA, `${stem}.drawio`), "utf8");
        assertValidDrawio(drawioXml, spec, `cli-default/${key}`);
        assert.match(drawioXml, new RegExp(`agent="Basalt Diagram Exporter \\(Chromium \\d+[^)]*, ${process.platform}, Basalt \\d+\\.\\d+\\.\\d+\\)"`), `${key}: draw.io records Chromium, platform, Basalt version`);
        const vsdxBytes = fs.readFileSync(path.join(outA, `${stem}.vsdx`));
        assertValidVsdx(vsdxBytes, spec, `cli-default/${key}`);
        assert.match(readZipEntries(vsdxBytes).get("visio/document.xml").toString("utf8"), new RegExp(`<Creator>Basalt Diagram Exporter \\(Chromium \\d+[^<]*, ${process.platform}, Basalt \\d+\\.\\d+\\.\\d+\\)</Creator>`), `${key}: vsdx records Chromium, platform, Basalt version`);
        const lucidBytes = fs.readFileSync(path.join(outA, `${stem}.lucid`));
        assertValidLucid(lucidBytes, spec, `cli-default/${key}`);
        const defaultDoc = JSON.parse(fs.readFileSync(path.join(outA, `${stem}.lucid.json`), "utf8"));
        const nodeShapes = defaultDoc.pages[0].shapes.filter((s) => s.id.startsWith("node_"));
        assert.ok(nodeShapes.length > 0);
        for (const s of nodeShapes) {
          assert.ok(
            s.customData?.some((d) => d.key === "basalt_measured_by" && new RegExp(`^Chromium \\d+.*, ${process.platform}, Basalt \\d+\\.\\d+\\.\\d+$`).test(d.value)),
            `${key}: lucid ${s.id} records Chromium, platform, Basalt version`,
          );
        }

        // Compare CLI default path against live React component: assert <= 0.5px on boxes, routes, edge labels, lifelines, dividers (B1/B2)
        const liveDoc = interop.exportMeasuredDiagram(spec, geo, "lucid-json", { extras, placement, diagramId: stem });
        const defDelta = compareLucidDocs(liveDoc, defaultDoc, `default/${key}`);
        comparison.defaultPath[key] = defDelta;
        assert.equal(defDelta.shapesOverHalfPx, 0, `${key}: default path box delta ${defDelta.maxBoxDelta}px > 0.5px`);
        assert.equal(defDelta.routesOverHalfPx, 0, `${key}: default path route delta ${defDelta.maxRouteDelta}px > 0.5px`);
        assert.equal(defDelta.labelsOverHalfPx, 0, `${key}: default path edge label delta ${defDelta.maxLabelDelta}px > 0.5px`);
        assert.equal(defDelta.guidesOverHalfPx, 0, `${key}: default path lifeline/divider delta ${defDelta.maxGuideDelta}px > 0.5px`);

        // B2: on sequence frames, verify no page-filled frame label or else box covers a lifeline x outside Basalt's measured label rect
        if (key === "batchBSeq") {
          const pad = 32;
          const lfXs = geo.lifelines.map((l) => l.x + pad);
          for (let fi = 0; fi < (extras.frames?.length ?? 0); fi++) {
            const ef = extras.frames[fi];
            if (ef.labelRect) {
              const s = defaultDoc.pages[0].shapes.find((x) => x.id === `frame_label_f${fi}`);
              assert.ok(s, `batchBSeq: frame_label_f${fi} present`);
              for (const lx of lfXs) {
                const inExport = lx >= s.boundingBox.x && lx <= s.boundingBox.x + s.boundingBox.w;
                const inBasalt = lx >= ef.labelRect.l + pad && lx <= ef.labelRect.r + pad;
                assert.equal(inExport, inBasalt, `batchBSeq: frame_label_f${fi} must not cover lifeline x=${lx} outside Basalt label rect`);
              }
            }
            ef.dividers.forEach((div, k) => {
              if (!div.labelRect) return;
              const s = defaultDoc.pages[0].shapes.find((x) => x.id === `frame_else_f${fi}_${k}`);
              assert.ok(s, `batchBSeq: frame_else_f${fi}_${k} present`);
              for (const lx of lfXs) {
                const inExport = lx >= s.boundingBox.x && lx <= s.boundingBox.x + s.boundingBox.w;
                const inBasalt = lx >= div.labelRect.l + pad && lx <= div.labelRect.r + pad;
                assert.equal(inExport, inBasalt, `batchBSeq: frame_else_f${fi}_${k} must not cover lifeline x=${lx} outside Basalt else rect`);
              }
            });
          }
        }

        // Record approximate headless fallback drift
        const headDoc = interop.diagramToLucidJson(spec, { width: 1104, diagramId: stem });
        comparison.headlessFallback[key] = compareLucidDocs(liveDoc, headDoc, `headless/${key}`);
      }
      if (process.env.PRINT_INTEROP_COMPARISON) {
        process.stdout.write(`INTEROP_COMPARISON=${JSON.stringify(comparison)}\n`);
      }

      // Measured lane rects keyed as lane-0..lane-5 propagate into sceneFromMeasured
      const df = measured.dataFlow;
      assert.equal(df.extras.lanes?.length, CIMIP.dataFlow.lanes.length);
      const customLanes = df.extras.lanes.map((l, idx) => ({
        ...l,
        rect: idx === 0 ? { l: 0, t: 0, r: df.geo.w, b: 140 } : { l: 0, t: 140 + idx * 90, r: df.geo.w, b: 200 + idx * 90 },
      }));
      const docWithCustomLanes = interop.exportMeasuredDiagram(CIMIP.dataFlow, df.geo, "lucid-json", { extras: { ...df.extras, lanes: customLanes } });
      const swCustom = docWithCustomLanes.pages[0].shapes.find((s) => s.type === "swimLanes");
      assert.equal(swCustom.lanes[0].width, 185, "lane 0 bottom hits midpoint between lane 0 bottom (140) and lane 1 top (230) = 185");

      // Native browser ESM check (no `process` global)
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
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
