// Automatic layout after the decider's ruling (DECISIONS 322, on DECISIONS 306 and 313, section 1.8): a main line keeps a way, network simplex with a
// straightness priority on main lines, a decision's point that a line leaves takes no other line, a turn-back needs a gutter, and one warning when
// neither direction draws. The ruling's list of tests; the figures are its proof's (test/fixtures/diagram-layout.json, the CIMIP ones in
// cimip-diagrams-b.json). In Node and in Chromium against the built package. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { inspectSource } from "./diagram-geometry.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const L = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-layout.json"), "utf8"));
const FIG = { autoArchitecture: B.autoArchitecture, autoFlowchart: B.autoFlowchart, autoSchema: B.autoSchema, ...L.figures };
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:0 16px} #root{width:var(--w,1104px)}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import * as Layout from "./dist/diagram-layout.js";
window.__place = Layout.placeDiagram;
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, schema: B.SchemaDiagram };
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, spec, dir }) => { const { type, ...props } = spec; const X = C[type]; return <div key={key} dir={dir}><X id={"fig-" + key} {...props} /></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function figurePage({ theme = "dark", width = 1440, height = 1000, dev = true } = {}) {
  const { page, errors } = await fixturePage(browser, "", { theme, viewport: { width, height }, standards: true });
  const built = await esbuild.build({
    stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js"; ${HOST}`, resolveDir: pkg, loader: "tsx" },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": dev ? '"development"' : '"production"' },
  });
  const warnings = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  await page.addScriptTag({ content: built.outputFiles[0].text });
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, warnings };
}
/** Draws the figures and waits until each automatic one has its placement (the layout module loads at 640 or wider) and is laid out. */
const draw = async (page, items) => {
  await page.evaluate((items) => window.__set(items), items);
  await page.waitForFunction((n) => document.querySelectorAll(".basalt-diagram[data-layout]").length >= n, items.length);
  await page.waitForTimeout(400);
  await frames(page, 4);
};
const widthTo = async (page, w) => { await page.evaluate((w) => document.getElementById("root").style.setProperty("--w", `${w}px`), w); await frames(page, 4); };
const inspect = (page, key) => page.evaluate(`${inspectSource()}("${P}", "#fig-${key}")`);
const strip = (p) => ({ cols: p.cols, rows: p.rows, cells: p.cells });

describe("placeDiagram", () => {
  test("the cells, cols and rows of the ruling's proof, in both directions, on five fresh runs in Node", async () => {
    for (let run = 0; run < 5; run++) {
      // A fresh module each run: a query string makes Node load it again, with its own elk.
      const { placeDiagram } = await import(`${pathToFileURL(path.join(pkg, "dist", "diagram-layout.js")).href}?run=${run}`);
      for (const key of ["autoArchitecture", "nestedArchitecture", "autoFlowchart", "autoSchema"]) for (const d of ["down", "right"]) {
        const got = await placeDiagram(FIG[key], d);
        assert.equal(got.direction, d);
        assert.deepEqual(strip(got), L.cells[key][d], `${key} laid ${d}, run ${run + 1}`);
      }
    }
  });

  test("the graph handed to elk: network simplex, straightness 10 on main lines only, no partitioning; at most two layouts a direction", async () => {
    const layout = await import(pathToFileURL(path.join(pkg, "dist", "diagram-layout.js")).href);
    // The graph's helpers are internal (diagram-layout-graph, in no public declaration: Neon's B11); the module is read straight from dist.
    const graph = await import(pathToFileURL(path.join(pkg, "dist", "diagram-layout-graph.js")).href);
    assert.ok(!("elkGraph" in layout) && !("mainInTheMiddle" in layout), "the public module exports placeDiagram and no helper");
    const g = graph.elkGraph(FIG.autoArchitecture, "down");
    assert.equal(g.layoutOptions["elk.layered.nodePlacement.strategy"], "NETWORK_SIMPLEX");
    assert.ok(!JSON.stringify(g).includes("partitioning"), "no elk.partitioning option anywhere");
    const main = new Set(FIG.autoArchitecture.edges.map((e, k) => (e.kind === "main" ? `${e.from}>${e.to}` : null)).filter(Boolean));
    for (const e of g.edges) {
      const isMain = main.has(`${e.sources[0]}>${e.targets[0]}`);
      assert.equal(e.layoutOptions?.["elk.layered.priority.straightness"], isMain ? "10" : undefined, `${e.sources[0]} to ${e.targets[0]}`);
    }
    // The main line in the middle: a card with three or more leaving lines, one of them main.
    const order = graph.mainInTheMiddle([{ from: "a", main: false, n: 1 }, { from: "a", main: false, n: 2 }, { from: "a", main: true, n: 3 }, { from: "b", main: false, n: 4 }]);
    assert.deepEqual(order.map((e) => e.n), [1, 3, 2, 4]);
    // Count elk's layouts: the class diagram-layout imports is this module's default.
    const ELK = (await import(pathToFileURL(path.join(pkg, "dist", "diagram-elk.js")).href)).default;
    const real = ELK.prototype.layout;
    let calls = 0;
    ELK.prototype.layout = function (...args) { calls++; return real.apply(this, args); };
    try {
      for (const key of Object.keys(FIG)) for (const d of ["down", "right"]) {
        calls = 0;
        await layout.placeDiagram(FIG[key], d);
        assert.ok(calls >= 1 && calls <= 2, `${key} laid ${d}: ${calls} layouts`);
      }
    } finally { ELK.prototype.layout = real; }
  });

  test("a way-only track is kept: the two-main-lines figure laid down is 2 columns with every card in the first", async () => {
    const { placeDiagram } = await import(pathToFileURL(path.join(pkg, "dist", "diagram-layout.js")).href);
    const got = await placeDiagram(FIG.twoMains, "down");
    assert.equal(got.cols, 2);
    assert.ok(Object.values(got.cells).every((c) => c.col === 1), JSON.stringify(got.cells));
    // The engine's tracks are the placement's, not the cards' own.
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    assert.equal(core.buildModel(FIG.twoMains, { placement: got }).cols, 2);
  });

  test("in the browser, placeDiagram returns Node's cells", async () => {
    const { page } = await figurePage();
    for (const key of ["autoArchitecture", "nestedArchitecture", "autoFlowchart", "autoSchema"]) for (const d of ["down", "right"]) {
      const got = await page.evaluate(({ spec, d }) => window.__place(spec, d), { spec: FIG[key], d });
      assert.deepEqual(strip(got), L.cells[key][d], `${key} laid ${d} in the browser`);
    }
    await page.close();
  });
});

describe("the package (Neon B11)", () => {
  test("no declaration names elkjs or the graph's helpers, and elkjs's licence ships beside its copy", () => {
    const read = (f) => fs.readFileSync(path.join(pkg, "dist", f), "utf8");
    for (const f of ["diagram-elk.d.ts", "diagram-layout.d.ts"]) assert.doesNotMatch(read(f), /["']elkjs|ElkNode|elkGraph|mainInTheMiddle/, f);
    assert.match(read("elkjs/LICENSE.md"), /Eclipse Public License/);
    assert.match(fs.readFileSync(path.join(pkg, "THIRD-PARTY-NOTICES.md"), "utf8"), /copied unchanged into this package/);
  });
});

describe("the CIMIP figures draw", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: at 1104 the architecture is drawn laid down in 4 columns and the flowchart in 3, every line and label, no problem; named right, each stacks`, async () => {
    const { page, errors } = await figurePage({ theme });
    await draw(page, [{ key: "arch", spec: FIG.autoArchitecture }, { key: "flow", spec: FIG.autoFlowchart }]);
    for (const [key, cols, spec] of [["arch", "4", FIG.autoArchitecture], ["flow", "3", FIG.autoFlowchart]]) {
      const g = await inspect(page, key);
      assert.equal(g.layout, "drawn", key);
      assert.equal(await page.locator(`#fig-${key}`).getAttribute("data-cols"), cols, `${key}: columns`);
      assert.equal(g.lines.length, spec.edges.length, `${key}: every line`);
      assert.equal(g.labels.length, spec.edges.filter((e) => e.label).length, `${key}: every label`);
      assert.deepEqual(g.problems, [], `${key}: ${JSON.stringify(g.problems)}`);
    }
    await draw(page, [{ key: "arch", spec: { ...FIG.autoArchitecture, direction: "right" } }, { key: "flow", spec: { ...FIG.autoFlowchart, direction: "right" } }]);
    assert.equal(await page.locator("#fig-arch").getAttribute("data-layout"), "stacked");
    assert.equal(await page.locator("#fig-flow").getAttribute("data-layout"), "stacked");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("from 800 (the architecture) and 720 (the flowchart) to 1,440, in steps of 16, each is drawn at every width", async () => {
    const { page } = await figurePage({ width: 1500, dev: false });
    await page.addStyleTag({ content: "#root{display:grid;gap:64px}" });
    await draw(page, [{ key: "arch", spec: FIG.autoArchitecture }, { key: "flow", spec: FIG.autoFlowchart }]);
    const off = [];
    for (let w = 720; w <= 1440; w += 16) {
      await widthTo(page, w);
      await page.waitForTimeout(60);
      if (w >= 800 && (await page.locator("#fig-arch").getAttribute("data-layout")) !== "drawn") off.push(`architecture at ${w}`);
      if ((await page.locator("#fig-flow").getAttribute("data-layout")) !== "drawn") off.push(`flowchart at ${w}`);
    }
    assert.deepEqual(off, []);
    await page.close();
  });
});

describe("the side choice", () => {
  test("rule 3: two answers to one side draw, four ways out of one decision stack and warn; a named side counts toward its side's three", async () => {
    const { page, warnings } = await figurePage();
    await draw(page, [{ key: "two", spec: L.fixed.twoToOneSide }, { key: "four", spec: L.fixed.fourWaysOut }]);
    assert.equal(await page.locator("#fig-two").getAttribute("data-layout"), "drawn");
    assert.deepEqual((await inspect(page, "two")).problems, []);
    assert.equal(await page.locator("#fig-four").getAttribute("data-layout"), "stacked");
    assert.ok(warnings.some((w) => /would lie on one another/.test(w)), JSON.stringify(warnings));
    await page.close();
    // A card with three lines named out of its right side: a line that chooses takes another side.
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const n = (id) => ({ id, name: id, kind: "part" });
    const spec = { type: "architecture", layout: "auto", title: "t", summary: "s", nodes: ["a", "b", "c", "d", "e"].map(n),
      edges: [{ from: "a", to: "b", fromSide: "right" }, { from: "a", to: "c", fromSide: "right" }, { from: "a", to: "d", fromSide: "right" }, { from: "a", to: "e" }] };
    const placement = { direction: "down", cells: { a: { col: 1, row: 2 }, b: { col: 2, row: 1 }, c: { col: 2, row: 2 }, d: { col: 2, row: 3 }, e: { col: 2, row: 4 } } };
    const m = core.buildModel(spec, { placement });
    assert.notEqual(m.edges[3].fromSide, "right", "the right side already holds three named lines");
    assert.equal(m.edges[3].fromSide, "bottom");
  });

  test("rule 4: the two-main-lines figure draws right to left at 1104, no turn-back on the drawing's edge", async () => {
    const { page } = await figurePage();
    await draw(page, [{ key: "rtl", spec: FIG.twoMains, dir: "rtl" }]);
    const g = await inspect(page, "rtl");
    assert.equal(g.layout, "drawn");
    assert.deepEqual(g.problems, []);
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const { placeDiagram } = await import(pathToFileURL(path.join(pkg, "dist", "diagram-layout.js")).href);
    for (const d of ["down", "right"]) {
      const placement = await placeDiagram(FIG.twoMains, d);
      for (const rtl of [false, true]) {
        const m = core.buildModel(FIG.twoMains, { placement, rtl });
        for (const e of m.edges) {
          if (!e.fromSide || e.fromSide !== e.toSide) continue;
          const a = m.byId.get(e.from);
          const beyond = e.fromSide === "right" ? a.col < m.cols : e.fromSide === "left" ? a.col > 1 : e.fromSide === "bottom" ? a.row < m.rows : a.row > 1;
          assert.ok(beyond, `${e.from} to ${e.to} turns back on the drawing's ${e.fromSide} edge (laid ${d}${rtl ? ", right to left" : ""})`);
        }
      }
    }
    await page.close();
  });
});

describe("rule 5: the author is told why", () => {
  test("the nested-group architecture with two-line labels warns once at 1104 with both directions' reasons, not again after a resize; at 390 nothing", async () => {
    const { page, warnings } = await figurePage();
    await draw(page, [{ key: "nested", spec: FIG.nestedArchitecture }]);
    assert.equal(await page.locator("#fig-nested").getAttribute("data-layout"), "stacked");
    const said = () => warnings.filter((w) => /draws in neither direction/.test(w));
    assert.equal(said().length, 1, JSON.stringify(warnings));
    assert.match(said()[0], /layout="auto" draws in neither direction at 1104px, so the figure is stacked: laid right it needs \d+px; laid down no clean seat for "SQL · NOTIFY one transaction"\. Name a side/);
    assert.ok(!said()[0].includes("\n"), "a label's break is a space in the warning");
    await widthTo(page, 1096);
    await page.waitForTimeout(200);
    assert.equal(said().length, 1, "the same reasons at a new width are not a new warning");
    await page.close();
    const small = await figurePage({ width: 390 });
    await widthTo(small.page, 358);
    await small.page.evaluate((spec) => window.__set([{ key: "nested", spec }]), FIG.nestedArchitecture);
    await small.page.waitForTimeout(500);
    assert.deepEqual(small.warnings.filter((w) => /draws in neither direction/.test(w)), []);
    await small.page.close();
  });
});

describe("the viewer", () => {
  async function openViewer(page, key) {
    const button = page.locator(`#fig-${key} .${P}-expand`);
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await page.waitForTimeout(500);
    await frames(page, 4);
    return page.evaluate((P) => { const f = document.querySelector(`dialog.${P}-viewer .${P}-layer .${P}`); return { layout: f.getAttribute("data-layout"), cols: f.getAttribute("data-cols") }; }, P);
  }
  test("with no placement prop, the viewer's figure is drawn where the page's is: laid right at 1440 by 900, laid down at 390 by 844", async () => {
    const wide = await figurePage({ width: 1440, height: 900 });
    await draw(wide.page, [{ key: "arch", spec: FIG.autoArchitecture }]);
    assert.equal(await wide.page.locator("#fig-arch").getAttribute("data-layout"), "drawn");
    assert.deepEqual(await openViewer(wide.page, "arch"), { layout: "drawn", cols: String(L.cells.autoArchitecture.right.cols) });
    await wide.page.close();
    // At 390 the page's figure is stacked and loads nothing; the viewer's figure is laid out at its least drawn width, and places itself.
    const phone = await figurePage({ width: 390, height: 844 });
    await widthTo(phone.page, 358);
    await phone.page.evaluate((spec) => window.__set([{ key: "arch", spec }]), FIG.autoArchitecture);
    await phone.page.waitForSelector("#fig-arch[data-layout]");
    assert.deepEqual(await openViewer(phone.page, "arch"), { layout: "drawn", cols: String(L.cells.autoArchitecture.down.cols) });
    await phone.page.close();
  });
});
