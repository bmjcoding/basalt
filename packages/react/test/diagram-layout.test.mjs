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

describe("a turn-back beside a box's edge (backlog four, 3)", () => {
  // Each run of a line against each box edge it runs beside (sharing more than 2px along it), and every label's and card's box, from the page.
  const measure = (page, key) => page.evaluate(({ P, key }) => {
    const fig = document.getElementById(`fig-${key}`), d = fig.querySelector(`.${P}-drawing`), o = d.getBoundingClientRect();
    const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top }; };
    const shown = (el) => el.getClientRects().length && getComputedStyle(el).display !== "contents";
    const boxes = [...d.querySelectorAll(`.${P}-gbox, .${P}-group`)].filter(shown).map((el) => ({ id: el.dataset.group, ...R(el) }));
    const cards = [...d.querySelectorAll(`.${P}-node`)].filter(shown).map((el) => ({ id: el.dataset.node, ...R(el) }));
    const svg = d.querySelector(`.${P}-svg`).getBoundingClientRect();
    const lines = [...d.querySelectorAll(`.${P}-edge`)].map((g) => {
      // The corners, as the geometry check reads them: a rounded corner's control point stands for it.
      const pts = [];
      for (const m of g.querySelector(`.${P}-line`).getAttribute("d").matchAll(/([MLQ])([^MLQ]*)/g)) {
        const n = m[2].trim().split(/[ ,]+/).map(Number);
        if (m[1] === "Q") pts.pop();
        pts.push({ x: n[0] + svg.left - o.left, y: n[1] + svg.top - o.top });
      }
      return { i: g.dataset.edge, from: g.dataset.from, to: g.dataset.to, pts, width: parseFloat(getComputedStyle(g.querySelector(`.${P}-line`)).strokeWidth) };
    });
    const near = [];
    for (const ln of lines) for (let k = 1; k < ln.pts.length; k++) {
      const p = ln.pts[k - 1], q = ln.pts[k], level = Math.abs(p.y - q.y) < 0.75, upright = Math.abs(p.x - q.x) < 0.75;
      if (!level && !upright) continue;
      const lo = level ? Math.min(p.x, q.x) : Math.min(p.y, q.y), hi = level ? Math.max(p.x, q.x) : Math.max(p.y, q.y), at = level ? p.y : p.x;
      for (const b of boxes) for (const [side, edge, e1, e2] of level ? [["top", b.t + 0.5, b.l, b.r], ["bottom", b.b - 0.5, b.l, b.r]] : [["left", b.l + 0.5, b.t, b.b], ["right", b.r - 0.5, b.t, b.b]]) {
        if (Math.min(hi, e2) - Math.max(lo, e1) <= 2) continue;
        const apart = Math.abs(at - edge);
        if (apart <= 2) near.push(`${ln.from}>${ln.to} is ${apart.toFixed(1)} from ${b.id}'s ${side} edge`);
      }
    }
    const labels = [...d.querySelectorAll(`.${P}-label`)].map((el) => ({ i: el.dataset.edge, on: el.hasAttribute("data-on"), ...R(el) }));
    return { layout: fig.getAttribute("data-layout"), boxes, cards, lines, labels, near };
  }, { P, key });

  for (const theme of ["dark", "light"]) test(`${theme}: at 1440 both figures draw with every label, no turn-back within 2 of a box edge it runs beside, and the inside one's label in a gap row`, async () => {
    const { page, errors } = await figurePage({ theme });
    await draw(page, [{ key: "two", spec: FIG.twoMains }, { key: "nested", spec: FIG.nestedOneLine }]);
    for (const [key, spec] of [["two", FIG.twoMains], ["nested", FIG.nestedOneLine]]) {
      const g = await inspect(page, key), got = await measure(page, key);
      assert.equal(g.layout, "drawn", `${key} draws`);
      assert.equal(g.lines.length, spec.edges.length, `${key}: every line`);
      assert.equal(g.labels.length, spec.edges.filter((e) => e.label).length, `${key}: every label`);
      assert.deepEqual(g.problems, [], `${key}: ${JSON.stringify(g.problems)}`);
      assert.deepEqual(got.near, [], `${key}: a run on a box's edge`);
    }
    // The two-main-lines figure: API to Store turns back inside Core. Its lane is space-4 from the cards and from Core's edge; its label is a plate
    // beside the lane on the inner side, its outer end space-1 short of the stroke, centred in a gap row between two cards (the one nearest the
    // line's midpoint: API to Jobs, the tie going to the line's start).
    const got = await measure(page, "two");
    const line = got.lines.find((l) => l.from === "api" && l.to === "db");
    const lane = line.pts[1].x, core = got.boxes.find((b) => b.id === "core"), api = got.cards.find((c) => c.id === "api"), jobs = got.cards.find((c) => c.id === "jobs");
    assert.ok(Math.abs(core.r - lane - 16) <= 1 && Math.abs(lane - api.r - 16) <= 1, `the lane at ${lane}: Core's edge at ${core.r}, the cards' at ${api.r}`);
    const label = got.labels.find((l) => l.i === line.i);
    assert.ok(label.on, "a plate");
    assert.ok(Math.abs(lane - line.width / 2 - label.r - 4) <= 1, `the plate's outer end ${label.r}, the stroke's inner side ${lane - line.width / 2}`);
    assert.ok(label.t >= api.b + 4 - 0.5 && label.b <= jobs.t - 4 + 0.5, `the plate (${label.t} to ${label.b}) in the gap from ${api.b} to ${jobs.t}`);
    assert.ok(Math.abs((label.t + label.b) / 2 - (api.b + jobs.t) / 2) <= 1, "centred in the gap");
    assert.deepEqual(errors, []);
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

describe("a layout that is out of date (Opus P5 on the re-check)", () => {
  test("cards that change while the layout runs: the stale answer is discarded and the figure is laid out again on the new cards", async () => {
    const { page, errors } = await figurePage();
    // Two figures under one key: the second replaces the first's cards before the layout module has answered (both in one task, so no answer can land
    // between them). The figure must draw as a fresh figure of the second's data draws (the control), with none of the first's cards.
    const first = FIG.autoArchitecture, second = FIG.autoFlowchart;
    const cells = (key) => page.evaluate(({ P, key }) => Object.fromEntries([...document.querySelectorAll(`#fig-${key} .${P}-node`)].map((n) => [n.dataset.node, ["--_c", "--_r", "--_r2"].map((v) => n.style.getPropertyValue(v)).join(" ")])), { P, key });
    await page.evaluate(({ a, b }) => { window.__set([{ key: "p5", spec: a }]); window.__set([{ key: "p5", spec: b }]); }, { a: first, b: second });
    await page.waitForFunction(() => document.querySelector("#fig-p5")?.getAttribute("data-layout") === "drawn", null, { timeout: 15000 });
    await draw(page, [{ key: "p5", spec: second }, { key: "ctl", spec: second }]);
    await page.waitForFunction(() => document.querySelector("#fig-ctl")?.getAttribute("data-layout") === "drawn", null, { timeout: 15000 });
    await frames(page, 4);
    const got = await cells("p5");
    assert.deepEqual(Object.keys(got).sort(), second.nodes.map((n) => n.id).sort(), "the second figure's cards, none of the first's");
    assert.deepEqual(got, await cells("ctl"), "each card in the cell of the second figure's own placement");
    // A change of lines alone (the same cards) lays out again too.
    const relined = { ...second, edges: second.edges.slice(0, -1) };
    await draw(page, [{ key: "p5", spec: relined }, { key: "ctl2", spec: relined }]);
    await page.waitForFunction(() => document.querySelector("#fig-ctl2")?.getAttribute("data-layout") === "drawn", null, { timeout: 15000 });
    await frames(page, 4);
    const relaid = await cells("p5");
    assert.deepEqual(relaid, await cells("ctl2"), "after the lines changed");
    assert.notDeepEqual(relaid, got, "and the placement moved (placeDiagram gives other cells without the last line)");
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("the layout module is fetched only when a figure needs it (Neon B12)", () => {
  // The other fixtures bundle into one script, where a dynamic import is inlined and no request can be seen. Here the page is an app's: an ES module
  // build with code splitting, served from a routed origin, so each lazy chunk is a request of its own. The chunk that holds elkjs is found from esbuild's
  // metafile, not by its name.
  const ORIGIN = "http://basalt.test";
  const APP = `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram };
function Host() { const [list, setList] = React.useState([]); window.__set = (next) => flushSync(() => setList(next)); return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, spec }) => { const { type, ...props } = spec; const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>; }
createRoot(document.getElementById("root")).render(<Host />);`;
  let files, elkChunk;
  before(async () => {
    const built = await esbuild.build({ stdin: { contents: APP, resolveDir: pkg, loader: "tsx" }, bundle: true, splitting: true, format: "esm", outdir: "/out", write: false, metafile: true, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' } });
    files = new Map(built.outputFiles.map((f) => [f.path.replace(/^\/out/, ""), f.text]));
    elkChunk = Object.entries(built.metafile.outputs).find(([, o]) => Object.keys(o.inputs).some((i) => i.endsWith("dist/diagram-elk.js")))?.[0].replace(/^\/?out/, "");
  });
  async function appPage(width) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const asked = [];
    await page.route(`${ORIGIN}/**`, (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="dark"><head><link rel="stylesheet" href="/styles.css"></head><body style="margin:0;padding:0 16px"><div id="root" style="width:${Math.min(1104, width - 32)}px"></div><script type="module" src="/stdin.js"></script></body></html>` });
      if (url.pathname === "/styles.css") return route.fulfill({ contentType: "text/css", body: fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8") });
      asked.push(url.pathname);
      const body = files.get(url.pathname);
      return body === undefined ? route.fulfill({ status: 404, body: "" }) : route.fulfill({ contentType: "text/javascript", body });
    });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() => typeof window.__set === "function");
    return { page, asked };
  }

  test("a fixed layout and a phone's automatic one fetch no layout; an automatic figure at 1104 fetches it once", async () => {
    assert.ok(elkChunk, "esbuild put elkjs in a chunk of its own");
    const fixed = { type: "architecture", title: "t", summary: "s", nodes: [{ id: "a", name: "A", col: 1, row: 1 }, { id: "b", name: "B", col: 2, row: 1 }], edges: [{ from: "a", to: "b" }] };
    const wide = await appPage(1440);
    await wide.page.evaluate((spec) => window.__set([{ key: "fixed", spec }]), fixed);
    await wide.page.waitForSelector("#fig-fixed[data-layout]");
    await wide.page.waitForTimeout(500);
    assert.ok(!wide.asked.includes(elkChunk), `a fixed layout fetches no layout ${JSON.stringify(wide.asked)}`);
    await wide.page.evaluate((spec) => window.__set([{ key: "auto", spec }, { key: "auto2", spec }]), FIG.autoArchitecture);
    await wide.page.waitForFunction(() => document.querySelector("#fig-auto")?.getAttribute("data-layout") === "drawn", null, { timeout: 15000 });
    assert.equal(wide.asked.filter((p) => p === elkChunk).length, 1, `fetched once for two figures ${JSON.stringify(wide.asked)}`);
    await wide.page.close();
    // Under 640 an automatic figure stacks without asking where its cards go (8.5), so nothing is fetched.
    const phone = await appPage(390);
    await phone.page.evaluate((spec) => window.__set([{ key: "auto", spec }]), FIG.autoArchitecture);
    await phone.page.waitForSelector("#fig-auto[data-layout='stacked']");
    await phone.page.waitForTimeout(800);
    assert.ok(!phone.asked.includes(elkChunk), `the phone fetches no layout ${JSON.stringify(phone.asked)}`);
    await phone.page.close();
  });
});
