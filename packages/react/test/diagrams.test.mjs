// Basalt's diagrams (DECISIONS 281, revised by 282; review round 64): the five components drawn from CIMIP's five diagrams and from fixtures built to
// test one rule each, in Chromium against the built package with the real stylesheet. Section 7 of the decision is the list this file follows:
// geometry at every width, the fit rule, seats, the end gutter, derivation, accessibility, tracing, the modes, before script, and the rules.
// The geometry is read from what is drawn (test/diagram-geometry.mjs). The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as React from "react";
import { webkit } from "playwright";

import { inspectSource } from "./diagram-geometry.mjs";
import { bundleFixture, fixturePage, launch, pixels, pkg } from "./support.mjs";

const require = createRequire(import.meta.url);
const { renderToString } = require("react-dom/server");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const KEYS = Object.keys(DATA);
const COMPONENT = { architecture: "ArchitectureDiagram", flowchart: "FlowchartDiagram", "data-flow": "DataFlowDiagram", sequence: "SequenceDiagram", schema: "SchemaDiagram" };
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The host: `window.__set(list)` draws a list of { key, type, props } (props are the fixture's, less `type`); each figure has the id `fig-<key>`.
const HOST = `
import data from "./test/fixtures/cimip-diagrams.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
window.DATA = data;
const all = () => Object.entries(data).map(([key, d]) => { const { type, ...props } = d; return { key, type, props }; });
function Host() {
  const [list, setList] = React.useState(all);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, type, props, card }) => { const X = C[type]; const fig = <X key={key} id={"fig-" + key} {...props} />; return card ? <B.Card key={key}>{fig}</B.Card> : fig; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function diagramPage(options = {}) {
  const { theme = "dark", viewport = { width: 1440, height: 1000 }, ...rest } = options;
  // Standards mode, as an app's page is: in quirks mode a decision's words take no strut, so its diamond is drawn shorter than it is in an app.
  const { page, errors } = await fixturePage(browser, HOST, { theme, viewport, standards: true, ...rest });
  const warnings = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 4);
  return { page, errors, warnings };
}
const inspect = (page, key) => page.evaluate(`${inspectSource()}("${P}", "#fig-${key}")`);
async function resize(page, width) {
  await page.setViewportSize({ width, height: 1000 });
  await frames(page, 4);
}
async function audit(page) {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }));
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`);
}

// The test widths of section 7: 320 to 1440 in steps of 16, the named widths, and each example's first drawn width and the pixel before it (found below).
const WIDTHS = [...new Set([...Array.from({ length: 71 }, (_, k) => 320 + 16 * k), 359, 360, 390, 412, 479, 480, 481, 639, 640, 641])].sort((a, b) => a - b);
const PAD = 32; // the host page's padding: a figure is the viewport less 32

describe("geometry: the five examples at every test width, in both themes", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: nothing scrolls, overlaps, is cut or crosses; every edge and label is drawn; the stack is at most 480 and no decision is flatter than 5:1`, async () => {
    const { page, errors } = await diagramPage({ theme });
    // Each example's first drawn width, found by growing the figure a pixel at a time across the band where it can turn on.
    const first = {};
    for (let w = 640; w <= 1104 && Object.keys(first).length < KEYS.length; w += 1) {
      await resize(page, w + PAD);
      for (const key of KEYS) if (!(key in first) && (await page.getAttribute(`#fig-${key}`, "data-layout")) === "drawn") first[key] = w;
    }
    assert.deepEqual(Object.keys(first).sort(), [...KEYS].sort(), `every example draws by the 1,104px row: ${JSON.stringify(first)}`);
    const widths = [...new Set([...WIDTHS, ...Object.values(first).flatMap((w) => [w + PAD, w + PAD - 1])])].sort((a, b) => a - b);
    const failures = [];
    for (const width of widths) {
      await resize(page, width);
      for (const key of KEYS) {
        const r = await inspect(page, key);
        const d = DATA[key];
        const issues = [...r.problems];
        if (r.crossings.length) issues.push(`${r.crossings.length} crossing(s): ${r.crossings.map((c) => `${c.a} and ${c.b}`).join(", ")}`);
        if (d.type !== "sequence" && d.type !== "schema") {
          if (r.lines.length !== d.edges.length) issues.push(`${r.lines.length} of ${d.edges.length} lines drawn`);
          const labelled = d.edges.filter((e) => e.label).length;
          if (r.labels.length !== labelled) issues.push(`${r.labels.length} of ${labelled} labels drawn`);
        }
        if (d.type === "schema") {
          const fks = d.tables.flatMap((t) => t.columns.filter((c) => c.references)).length;
          if (r.layout === "drawn" && r.lines.length !== fks) issues.push(`${r.lines.length} of ${fks} foreign-key lines drawn`);
          if (r.layout === "stacked" && r.lines.length) issues.push("a stacked schema draws lines");
          const written = await page.locator(`#fig-${key} .${P}-ctype[data-ref]`).count();
          if (written !== fks) issues.push(`${written} of ${fks} foreign-key rows write their target`);
        }
        if (d.type === "sequence" && r.layout === "drawn" && r.lines.length !== d.steps.filter((s) => !s.band).length) issues.push("a message is missing");
        if (r.layout === "drawn" && width - PAD < first[key]) issues.push(`drawn at ${width - PAD}, under its first drawn width ${first[key]}`);
        if (r.layout === "stacked" && width - PAD >= first[key]) issues.push(`stacked at ${width - PAD}, at or over its first drawn width ${first[key]}`);
        if (issues.length) failures.push(`${key} at a ${width - PAD}px figure (${r.layout}): ${issues.slice(0, 4).join("; ")}`);
      }
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(errors, []);
    // The decision's figures, measured on Draft A: the architecture from 784, the data flow from 1,080, the sequence about 810 and the schema about 1,060. The
    // flowchart turns on later here (see the round's notes): its two-line decision at a 177px track is taller than Draft A's, and "responder" waits for it.
    assert.equal(first.architecture, 784);
    assert.equal(first.dataFlow, 1080);
    assert.ok(first.sequence >= 790 && first.sequence <= 830, `sequence from ${first.sequence}`);
    assert.ok(first.schema >= 1040 && first.schema <= 1070, `schema from ${first.schema}`);
    assert.ok(first.flowchart >= 880 && first.flowchart <= 1000, `flowchart from ${first.flowchart}`);
    await page.close();
  });

  test("on the 1,104px page row all five are drawn; in a card (level 2) too", async () => {
    const { page } = await diagramPage();
    for (const key of KEYS) assert.equal(await page.getAttribute(`#fig-${key}`, "data-layout"), "drawn", key);
    await page.evaluate(() => window.__set(Object.entries(window.DATA).map(([key, d]) => { const { type, ...props } = d; return { key, type, props, card: true }; })));
    await frames(page, 4);
    const levels = await page.$$eval(`.${P}-node`, (els) => [...new Set(els.map((e) => e.getAttribute("data-level")))]);
    assert.deepEqual(levels, ["2"], "a node in a card is a panel at level 2");
    await page.close();
  });
});

// ---- Fixtures built to test one rule each ----
const node = (id, col, row, extra = {}) => ({ id, name: id.toUpperCase(), kind: "part", detail: "a detail", col, row, ...extra });

describe("the fit rule (1.11) and seats (1.8)", () => {
  test("a fixture with a 200px word stays stacked until its track holds the word", async () => {
    const { page } = await diagramPage();
    const word = "Supercalifragilisticexpialidocious";
    await page.addStyleTag({ content: "#root{max-width:none}" });
    await page.evaluate((word) => window.__set([{ key: "wide", type: "architecture", props: { title: "Wide", summary: "A wide word.", nodes: [{ id: "a", name: word, col: 1, row: 1 }, { id: "b", name: "B", col: 2, row: 1 }, { id: "c", name: "C", col: 3, row: 1 }, { id: "d", name: "D", col: 4, row: 1 }], edges: [{ from: "a", to: "b" }] } }]), word);
    await frames(page, 4);
    // Measured as the engine measures a name: its own ruler, in the name's face.
    const need = await page.evaluate((word) => { const r = document.querySelector("#fig-wide .basalt-diagram-ruler"); r.setAttribute("data-f", "name"); r.textContent = word; const w = r.getBoundingClientRect().width; r.textContent = ""; return w; }, word);
    assert.ok(need > 200, `the word is ${need}px`);
    const track = Math.ceil(need + 2 * 12 + 2);
    const least = 4 * track + 3 * 64;
    for (const [w, layout] of [[least - 2, "stacked"], [least + 2, "drawn"]]) {
      await resize(page, w + PAD);
      assert.equal(await page.getAttribute("#fig-wide", "data-layout"), layout, `at ${w}`);
    }
    await page.close();
  });

  test("a fixture whose label has no clean seat stays stacked", async () => {
    const { page, warnings } = await diagramPage();
    // Two nodes side by side with a label as long as the rule allows and a gutter too short for it anywhere: the nodes fill their row and a node sits above and below.
    await page.evaluate(() => window.__set([{ key: "noseat", type: "architecture", props: { title: "No seat", summary: "A label with no seat.", nodes: [
      { id: "a", name: "A", col: 1, row: 2 }, { id: "b", name: "B", col: 2, row: 2 }, { id: "c", name: "C", col: 1, row: 1 }, { id: "d", name: "D", col: 2, row: 1 }, { id: "e", name: "E", col: 1, row: 3 }, { id: "f", name: "F", col: 2, row: 3 },
      { id: "g", name: "G", col: 3, row: 2 }, { id: "h", name: "H", col: 4, row: 2 }],
      edges: [{ from: "a", to: "b", label: "a label of twenty-eight char" }, { from: "c", to: "a" }, { from: "a", to: "e" }, { from: "d", to: "b" }, { from: "b", to: "f" }] } }]));
    await frames(page, 4);
    assert.equal(await page.getAttribute("#fig-noseat", "data-layout"), "stacked", "no seat, no drawn layout");
    // The same figure with a label that seats is drawn at the same width: the label alone decided it.
    await page.evaluate(() => window.__set([{ key: "noseat", type: "architecture", props: { title: "No seat", summary: "A label with a seat.", nodes: [
      { id: "a", name: "A", col: 1, row: 2 }, { id: "b", name: "B", col: 2, row: 2 }, { id: "c", name: "C", col: 1, row: 1 }, { id: "d", name: "D", col: 2, row: 1 }, { id: "e", name: "E", col: 1, row: 3 }, { id: "f", name: "F", col: 2, row: 3 },
      { id: "g", name: "G", col: 3, row: 2 }, { id: "h", name: "H", col: 4, row: 2 }],
      edges: [{ from: "a", to: "b", label: "ok" }, { from: "c", to: "a" }, { from: "a", to: "e" }, { from: "d", to: "b" }, { from: "b", to: "f" }] } }]));
    await frames(page, 4);
    assert.equal(await page.getAttribute("#fig-noseat", "data-layout"), "drawn");
    void warnings;
    await page.close();
  });

  test("seats: every label of the three seated examples is space-2 clear of its stroke, off its own head, at the first drawn width and every width above", async () => {
    const { page } = await diagramPage();
    for (const width of [880, 946, 1000, 1040, 1080, 1104, 1136].map((w) => w + PAD)) {
      await resize(page, width);
      for (const key of ["architecture", "flowchart", "dataFlow"]) {
        if ((await page.getAttribute(`#fig-${key}`, "data-layout")) !== "drawn") continue;
        const r = await page.evaluate(({ P, key }) => {
          const fig = document.querySelector(`#fig-${key}`), o = fig.querySelector(`.${P}-drawing`).getBoundingClientRect();
          return [...fig.querySelectorAll(`.${P}-label`)].map((el) => {
            const b = el.getBoundingClientRect(), g = fig.querySelector(`.${P}-edge[data-edge="${el.dataset.edge}"]`);
            const path = g.querySelector(`.${P}-line`), w = parseFloat(getComputedStyle(path).strokeWidth);
            const tip = g.querySelector(`.${P}-tip`).getBoundingClientRect();
            const d = path.getAttribute("d").match(/-?[\d.]+/g).map(Number);
            const xs = [], ys = [];
            for (let k = 0; k < d.length; k += 2) { xs.push(d[k] + o.left); ys.push(d[k + 1] + o.top); }
            // the clearance from the label box to the nearest horizontal run under or over it (on-line labels sit on their plate)
            let clear = Infinity;
            for (let k = 1; k < xs.length; k++) if (Math.abs(ys[k] - ys[k - 1]) < 0.01 && Math.min(xs[k], xs[k - 1]) < b.right && Math.max(xs[k], xs[k - 1]) > b.left) clear = Math.min(clear, Math.max(b.top - (ys[k] + w / 2), (ys[k] - w / 2) - b.bottom));
            const onHead = b.left < tip.right && b.right > tip.left && b.top < tip.bottom && b.bottom > tip.top;
            return { text: el.textContent, on: el.hasAttribute("data-on"), clear, onHead };
          });
        }, { P, key });
        for (const l of r) {
          assert.ok(!l.onHead, `${key} at ${width - PAD}: "${l.text}" is on its own head`);
          if (!l.on && Number.isFinite(l.clear) && l.clear > -1) assert.ok(l.clear >= 8 - 0.01, `${key} at ${width - PAD}: "${l.text}" is ${l.clear.toFixed(2)}px clear of its stroke`);
        }
        if (key === "flowchart") for (const name of ["observer", "responder"]) assert.ok(r.some((l) => l.text === name), `"${name}" seats`);
        if (key === "dataFlow") assert.ok(r.some((l) => l.text === "trim"), `"trim" seats`);
      }
    }
    await page.close();
  });

  test("two cards with a labelled line each way: two stems, both labels seated, nothing on anything, drawn or stacked, from 320", async () => {
    const { page } = await diagramPage();
    await page.evaluate(() => window.__set([{ key: "pair", type: "architecture", props: { title: "Pair", summary: "One line each way.", nodes: [{ id: "a", name: "A", col: 1, row: 1 }, { id: "b", name: "B", col: 1, row: 2 }],
      edges: [{ from: "a", to: "b", label: "a label going down" }, { from: "b", to: "a", label: "a label coming up" }] } }]));
    for (const width of [320, 360, 390, 480 + PAD, 640 + PAD, 1440]) {
      await resize(page, width);
      const r = await inspect(page, "pair");
      assert.deepEqual(r.problems, [], `at ${width}`);
      assert.equal(r.lines.length, 2, `at ${width}: both lines`);
      assert.equal(r.labels.length, 2, `at ${width}: both labels`);
      const xs = r.lines.map((l) => l.pts[0].x);
      assert.ok(Math.abs(xs[0] - xs[1]) > 8, `at ${width} the two stems are apart: ${xs.join(", ")}`);
    }
    await page.close();
  });

  test("a sequence whose participant has a 200px word stays stacked until its columns hold the word (the measured minimum, not the token)", async () => {
    const { page } = await diagramPage();
    await page.addStyleTag({ content: "#root{max-width:none}" });
    const word = "Supercalifragilisticexpialidocious";
    await page.evaluate((word) => window.__set([{ key: "seq", type: "sequence", props: { title: "Seq", summary: "A long name.", participants: [{ id: "a", name: word }, { id: "b", name: "B" }, { id: "c", name: "C" }, { id: "d", name: "D" }], steps: [{ from: "a", to: "b", label: "go" }, { from: "c", to: "d", label: "go" }] } }]), word);
    await frames(page, 4);
    const need = await page.evaluate((word) => { const r = document.querySelector("#fig-seq .basalt-diagram-ruler"); r.setAttribute("data-f", "name"); r.textContent = word; const w = r.getBoundingClientRect().width; r.textContent = ""; return w; }, word);
    assert.ok(need > 200, `the word is ${need}px`);
    const least = 4 * Math.ceil(need + 2 * 12 + 2) + 3 * 20;
    for (const [w, layout] of [[640, "stacked"], [least - 2, "stacked"], [least + 2, "drawn"]]) {
      await resize(page, w + PAD);
      assert.equal(await page.getAttribute("#fig-seq", "data-layout"), layout, `at ${w}`);
    }
    await page.close();
  });

  test("a route that would leave the drawing is not drawn: a turn-back named on a first column's start side stays stacked", async () => {
    const { page } = await diagramPage();
    await page.evaluate(() => window.__set([{ key: "out", type: "architecture", props: { title: "Out", summary: "A turn-back off the drawing.", nodes: [
      { id: "a", name: "A", col: 1, row: 1 }, { id: "b", name: "B", col: 2, row: 1 }, { id: "c", name: "C", col: 1, row: 2 }],
      edges: [{ from: "a", to: "b" }, { from: "a", to: "c", fromSide: "left", toSide: "left" }] } }]));
    await frames(page, 4);
    assert.equal(await page.getAttribute("#fig-out", "data-layout"), "stacked");
    assert.deepEqual((await inspect(page, "out")).problems, []);
    await page.close();
  });

  // Neon's finding 12 on round 64 (DECISIONS 301): a schema of one column has no gutter on either side, and its turn-back was refused at every width.
  test("a one-column schema with a foreign key is drawn: its turn-back runs space-4 out on the end side, inside the space-5 the drawing keeps there", async () => {
    const { page } = await diagramPage({ viewport: { width: 640 + PAD, height: 1000 } });
    await page.evaluate(() => window.__set([{ key: "one", type: "schema", props: { title: "One", summary: "One column.", legend: { plain: "A foreign key" }, tables: [
      { name: "a", col: 1, row: 1, columns: [{ name: "id", key: "PK" }] }, { name: "b", col: 1, row: 2, columns: [{ name: "a_id", key: "FK", references: "a.id" }] }] } }]));
    for (const width of [640 + PAD, 1000, 1440]) {
      await resize(page, width);
      assert.equal(await page.getAttribute("#fig-one", "data-layout"), "drawn", `at ${width}`);
      const r = await inspect(page, "one");
      assert.deepEqual(r.problems, [], `at ${width}`);
      const seen = await page.evaluate(() => {
        const d = document.querySelector("#fig-one .basalt-diagram-drawing"), o = d.getBoundingClientRect();
        const t = [...d.querySelectorAll(".basalt-diagram-node")].map((n) => n.getBoundingClientRect().right - o.left);
        const xs = [...d.querySelectorAll(".basalt-diagram-line")].flatMap((p) => p.getAttribute("d").match(/-?[\d.]+/g).map(Number).filter((_, k) => k % 2 === 0));
        return { pad: getComputedStyle(d).paddingRight, w: d.clientWidth, right: Math.max(...t), lane: Math.max(...xs), lines: d.querySelectorAll(".basalt-diagram-edge").length };
      });
      assert.equal(seen.lines, 1, `at ${width}: the foreign key's line`);
      assert.equal(seen.pad, "20px", `at ${width}: space-5 on the end side`);
      assert.ok(Math.abs(seen.lane - (seen.right + 16)) <= 0.5 && seen.lane + 0.5 <= seen.w, `at ${width}: the turn-back is space-4 out and inside the drawing (${JSON.stringify(seen)})`);
    }
    // Two columns keep their own rule and no end padding: the last column's turn-back is on its start side, in the gutter.
    await page.evaluate(() => window.__set([{ key: "two", type: "schema", props: { title: "Two", summary: "Two columns.", legend: { plain: "A foreign key" }, tables: [
      { name: "a", col: 1, row: 1, columns: [{ name: "id", key: "PK" }] }, { name: "b", col: 2, row: 1, columns: [{ name: "id", key: "PK" }] }, { name: "c", col: 2, row: 2, columns: [{ name: "b_id", key: "FK", references: "b.id" }] }] } }]));
    await frames(page, 4);
    assert.equal(await page.getAttribute("#fig-two", "data-layout"), "drawn");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#fig-two .basalt-diagram-drawing")).paddingRight), "0px");
    assert.deepEqual((await inspect(page, "two")).problems, []);
    await page.close();
  });

  // Neon's blocking finding 1 on #126: two turn-backs to different keys, beside each other, were drawn on one lane.
  test("turn-backs to different keys never lie on one another: in a gutter each takes a lane; with no gutter (one column) the schema stays stacked", async () => {
    const { page } = await diagramPage();
    const t = (name, col, row, refs = []) => ({ name, col, row, columns: [{ name: "id", key: "PK" }, ...refs.map((r) => ({ name: `${r}_id`, key: "FK", references: `${r}.id` }))] });
    const schema = (key, tables) => ({ key, type: "schema", props: { title: key, summary: "Keys.", legend: { plain: "A foreign key" }, tables } });
    await page.evaluate((list) => window.__set(list), [
      // b to c and c to a overlap down the one column's end side.
      schema("crossed", [t("a", 1, 1), t("b", 1, 2, ["c"]), t("c", 1, 3, ["a"])]),
      // Two that do not overlap share the side and are drawn.
      schema("apart", [t("a", 1, 1), t("b", 1, 2, ["a"]), t("c", 1, 3), t("d", 1, 4, ["c"])]),
      // The same two in a last column: they turn back into the gutter, each on a lane of its own.
      schema("gutter", [t("x", 1, 1), t("a", 2, 1), t("b", 2, 2, ["c"]), t("c", 2, 3, ["a"])]),
    ]);
    await frames(page, 4);
    const lanes = (key) => page.evaluate((key) => [...document.querySelectorAll(`#fig-${key} .basalt-diagram-svg .basalt-diagram-line`)].map((p) => { const n = p.getAttribute("d").match(/-?[\d.]+/g).map(Number); return Math.min(...n.filter((_, k) => k % 2 === 0)); }), key);
    for (const width of [1440, 1000]) {
      await resize(page, width);
      assert.equal(await page.getAttribute("#fig-crossed", "data-layout"), "stacked", `at ${width}: no lane for both, so no drawing`);
      assert.equal(await page.getAttribute("#fig-apart", "data-layout"), "drawn", `at ${width}`);
      assert.equal(await page.getAttribute("#fig-gutter", "data-layout"), "drawn", `at ${width}`);
      for (const key of ["crossed", "apart", "gutter"]) assert.deepEqual((await inspect(page, key)).problems, [], `${key} at ${width}`);
      const x = await lanes("gutter");
      assert.equal(new Set(x.map((v) => Math.round(v))).size, 2, `at ${width}: two lanes in the gutter (${x})`);
    }
    await page.close();
  });

  test("no decision is flatter than 5:1 or under 64 tall: a two-column flowchart on the page row, and at 480 and 607", async () => {
    const { page } = await diagramPage();
    await page.evaluate(() => window.__set([{ key: "two", type: "flowchart", props: { title: "Two", summary: "Two columns.", legend: { main: "Usual" }, nodes: [
      { id: "s", shape: "terminal", name: "Start", col: 1, row: 1 }, { id: "q", shape: "decision", name: "Yes?", col: 1, row: 2 }, { id: "n", shape: "terminal", name: "No", col: 2, row: 2, branch: true }, { id: "e", shape: "terminal", name: "End", col: 1, row: 3 }],
      edges: [{ from: "s", to: "q", kind: "main" }, { from: "q", to: "n", label: "no" }, { from: "q", to: "e", kind: "main", label: "yes" }] } }]));
    for (const width of [1440, 480 + PAD, 607 + PAD, 390]) {
      await resize(page, width);
      const r = await inspect(page, "two");
      assert.deepEqual(r.problems, [], `at ${width}`);
      const q = r.nodes.find((n) => n.id === "q");
      assert.ok(q.w / q.h <= 5.001 && q.h >= 64 - 0.5, `at ${width} the decision is ${q.w.toFixed(0)} by ${q.h.toFixed(0)}`);
    }
    await page.close();
  });
});

describe("the stacked drawing's end gutter (1.13)", () => {
  const spine = (edges) => ({ title: "Gutter", summary: "Three spine cards.", legend: {}, nodes: ["a", "b", "c", "d"].map((id, k) => node(id, 1, k + 1)), edges });
  for (const [name, edges, crossings] of [
    ["A to C", [{ from: "a", to: "c", label: "past b" }], 0],
    ["C to A", [{ from: "c", to: "a", label: "back up" }], 0],
    ["both", [{ from: "a", to: "c", label: "past b" }, { from: "c", to: "a", label: "back up" }], 1],
  ]) {
    test(`${name}: no line through or inside a card and no label on one, at every test width; ${crossings} crossing${crossings === 1 ? ", with its cut" : "s"}`, async () => {
      const { page } = await diagramPage();
      await page.evaluate((spec) => window.__set([{ key: "gutter", type: "architecture", props: spec }]), spine(edges));
      for (const width of WIDTHS.filter((w) => w <= 1440)) {
        await resize(page, width);
        const r = await inspect(page, "gutter");
        assert.equal(r.layout, "stacked");
        assert.deepEqual(r.problems, [], `at ${width}`);
        assert.equal(r.crossings.length, crossings, `at ${width}: ${JSON.stringify(r.crossings)}`);
        for (const c of r.crossings) assert.ok(c.cut, `at ${width} the crossing of ${c.a} and ${c.b} is not cut`);
      }
      // While a node is traced, the crossing keeps a cut.
      if (crossings) {
        await page.focus("#fig-gutter .basalt-diagram-node[data-node='a']").catch(() => {});
        await page.keyboard.press("Tab").catch(() => {});
        await page.evaluate(() => document.querySelector("#fig-gutter .basalt-diagram-node[data-node='a']").focus({ focusVisible: true }));
        await frames(page);
        assert.equal(await page.locator("#fig-gutter .basalt-diagram-line[mask]").count(), 1, "the crossing keeps one cut while tracing");
      }
      await page.close();
    });
  }
});

describe("crossings (1.7): a fixture built to cross, each crossing cut on the right line, at its point, before and during a trace", () => {
  // Four spine cards with A to C and D to B: both are end lines in the gutter, A to C in the inner lane and D to B in the outer, so D to B's run
  // into B crosses A to C's vertical run once (A to C's run into C stops at its own lane, short of D to B's). At rest the horizontal is on top, so
  // the cut is on A to C. Tracing A lights A to C alone: the traced line goes on top and the cut moves to D to B. The reader checks every cut against
  // the mask's own holes (the point, the line).
  const spec = { title: "Crossing", summary: "Two end lines that cross.", nodes: ["a", "b", "c", "d"].map((id, k) => node(id, 1, k + 1)), edges: [{ from: "a", to: "c" }, { from: "d", to: "b" }] };
  for (const width of [390, 640 + PAD, 1440]) {
    test(`at ${width}: one crossing, cut under the horizontal (on A to C) at rest; with A traced, cut on D to B`, async () => {
      const { page } = await diagramPage({ viewport: { width, height: 1000 } });
      await page.evaluate((spec) => window.__set([{ key: "cross", type: "architecture", props: spec }]), spec);
      await frames(page, 4);
      const rest = await inspect(page, "cross");
      assert.equal(rest.layout, "stacked");
      assert.deepEqual(rest.problems, [], "at rest");
      assert.equal(rest.crossings.length, 1, JSON.stringify(rest.crossings));
      assert.deepEqual(rest.crossings.map((c) => c.under), ["a>c"], "at rest the crossing is cut on the vertical run's line, under the horizontal");
      await page.evaluate(() => document.querySelector("#fig-cross .basalt-diagram-node[data-node='b']").focus({ focusVisible: true }));
      await page.keyboard.press("ArrowLeft");
      await frames(page);
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.node), "a");
      const traced = await inspect(page, "cross");
      assert.deepEqual(traced.problems, [], "while A is traced");
      assert.equal(traced.crossings.length, 1);
      assert.deepEqual(traced.crossings.map((c) => c.under), ["d>b"], "the traced line is on top: the cut moves to D to B");
      await page.close();
    });
  }
});

describe("derivation (1.6, 1.13): the sides, slots and stacked routes of the examples equal the recorded table", () => {
  test("ports and routes", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const table = (key) => core.derivedPorts(core.buildModel(DATA[key])).map((p) => `${p.from}>${p.to} ${p.fromSide}@${p.fromSlot} ${p.toSide}@${p.toSlot}`);
    assert.deepEqual(table("architecture"), [
      "browser>alb right@0.5 left@0.5", "alb>svc right@0.5 left@0.5", "svc>aurora top@0.5 left@0.5", "svc>s3 right@0.5 left@0.5", "svc>ecs bottom@0.25 right@0.5",
      "svc>bedrock right@0.75 left@0.5", "svc>agent bottom@0.5 top@0.5", "ecs>agent bottom@0.5 left@0.5", "agent>bedrock right@0.25 bottom@0.5", "agent>cw right@0.75 left@0.5", "agent>sys bottom@0.5 top@0.5"]);
    assert.deepEqual(table("flowchart"), [
      "req>risk bottom@0.5 top@0.5", "risk>who bottom@0.5 top@0.5", "who>obs left@0.5 right@0.5", "who>med right@0.5 left@0.5", "who>may bottom@0.5 top@0.5", "med>wait right@0.5 left@0.5",
      "med>may bottom@0.5 right@0.5", "may>first bottom@0.5 top@0.5", "first>told left@0.5 right@0.5", "first>rec bottom@0.5 top@0.5"]);
    assert.deepEqual(table("dataFlow"), ["send>append right@0.5 top@0.5", "append>row right@0.5 top@0.5", "row>hear right@0.5 top@0.5", "hear>see right@0.5 top@0.5", "row>seal left@0.5 right@0.5", "row>seg bottom@0.5 top@0.5"]);
    const routes = (key) => core.stackPlan(core.buildModel(DATA[key])).routes;
    assert.deepEqual(routes("architecture"), ["down", "down", "trunk", "trunk", "trunk", "trunk", "rail", "end-down", "up", "trunk", "rail"]);
    assert.deepEqual(routes("flowchart"), ["down", "down", "trunk", "trunk", "rail", "down", "end-down", "down", "trunk", "rail"]);
    assert.deepEqual(routes("dataFlow"), ["down", "down", "down", "down", "end-down", "end-down"]);
    assert.equal(core.stackPlan(core.buildModel(DATA.dataFlow)).gutter, true, "a data flow's bypasses run in the gutter");
    assert.equal(core.stackPlan(core.buildModel(DATA.architecture)).gutter, false, "the architecture's one end line leaves a branch and passes branches: the end lane");
    // 6 of the 27 edges name a side (the decision's count).
    const named = ["architecture", "flowchart", "dataFlow"].flatMap((k) => DATA[k].edges).filter((e) => e.fromSide || e.toSide).length;
    assert.equal(named, 6);
    // A third overlapping end line is a development error.
    const third = core.buildModel({ type: "architecture", title: "t", nodes: ["a", "b", "c", "d", "e"].map((id, k) => node(id, 1, k + 1)), edges: [{ from: "a", to: "d" }, { from: "b", to: "e" }, { from: "a", to: "e" }] });
    assert.equal(core.stackPlan(third).third, true);
    // Lanes are allocated across each overlapping set: A to C, B to E and D to H overlap in a chain, so each takes the lane outside the one before, and the
    // third lane is reported, never laid on the second.
    const chain = core.stackPlan(core.buildModel({ type: "architecture", title: "t", nodes: "abcdefgh".split("").map((id, k) => node(id, 1, k + 1)), edges: [{ from: "a", to: "c" }, { from: "b", to: "e" }, { from: "d", to: "h" }] }));
    assert.deepEqual(chain.lanes, [0, 1, 2]);
    assert.equal(chain.third, true);
    // Two that do not overlap share the inner lane; two that do take one each.
    assert.deepEqual(core.stackPlan(core.buildModel({ type: "architecture", title: "t", nodes: "abcdef".split("").map((id, k) => node(id, 1, k + 1)), edges: [{ from: "a", to: "c" }, { from: "d", to: "f" }, { from: "b", to: "e" }] })).lanes, [0, 0, 1]);
    // Two straight lines between one pair, one each way, take the quarter points at both ends, so neither lies on the other.
    const pair = core.derivedPorts(core.buildModel({ type: "architecture", title: "t", nodes: [node("a", 1, 1), node("b", 1, 2)], edges: [{ from: "a", to: "b" }, { from: "b", to: "a" }] }));
    assert.deepEqual(pair.map((p) => [p.fromSlot, p.toSlot]), [[0.25, 0.25], [0.75, 0.75]]);
  });

  test("a foreign key's row, line, sentence and list entry all come from `references`", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const m = core.buildModel(DATA.schema);
    assert.equal(m.edges.length, 9);
    const runs = m.byId.get("agent_runs");
    assert.match(core.nodeSentence(m, runs), /References incidents \(incident_id\), sandboxes \(sandbox_id\)\. Referenced by approvals \(run_id\)\./);
    const html = core.toHtml(core.figureTree(m, {}, { prefix: "x", base: "b", hiddenClass: "h" }));
    assert.match(html, /<span class="x-ctype" data-ref="">→ sandboxes<\/span>/);
    assert.match(html, /<code class="x-code">sandbox_id<\/code>, foreign key, references <code class="x-code">sandboxes\.id<\/code>/);
    const bad = core.buildModel({ type: "schema", title: "t", tables: [{ name: "a", col: 1, row: 1, columns: [{ name: "x", references: "b.nope" }] }, { name: "b", col: 2, row: 1, columns: [{ name: "id" }] }] });
    assert.ok(bad.warnings.some((w) => /not a shown column/.test(w)));
  });
});

describe("accessibility (1.14)", () => {
  test("axe in both themes on all five, drawn and stacked, the list open and closed", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await diagramPage({ theme });
      for (const width of [1440, 390]) {
        await resize(page, width);
        assert.deepEqual(await audit(page), [], `${theme} at ${width}, closed`);
        for (const key of KEYS) await page.click(`#fig-${key} .${P}-toggle`);
        await frames(page);
        assert.deepEqual(await audit(page), [], `${theme} at ${width}, open`);
        for (const key of KEYS) await page.click(`#fig-${key} .${P}-toggle`);
      }
      await page.close();
    }
  });

  test("the drawing is a named, described group; each node a sentence; one tab stop; the keys; Esc; Tab leaves", async () => {
    const { page } = await diagramPage();
    const group = page.locator(`#fig-architecture .${P}-drawing`);
    assert.equal(await group.getAttribute("role"), "group");
    assert.equal(await group.getAttribute("aria-roledescription"), "diagram");
    const [labelled, described] = await Promise.all([group.getAttribute("aria-labelledby"), group.getAttribute("aria-describedby")]);
    assert.equal(await page.locator(`[id="${labelled}"]`).innerText(), DATA.architecture.title);
    const [summary, keys] = described.split(" ");
    assert.equal(await page.locator(`[id="${summary}"]`).innerText(), DATA.architecture.summary);
    assert.match(await page.locator(`[id="${keys}"]`).textContent(), /Arrow keys/);
    assert.equal(await page.getAttribute(`#fig-architecture .${P}-node[data-node="svc"]`, "aria-label"),
      "cimip service, ECS service. N tasks · stateless. In AWS · your account. From: ALB. To: Aurora PostgreSQL (SQL · NOTIFY), S3 (PUT), ECS (RunTask), Bedrock (scribe), Agent sandbox (HTTP + SSE). The service.");
    assert.match(await page.getAttribute(`#fig-dataFlow .${P}-node[data-node="row"]`, "aria-label"), /^Event row \+ NOTIFY, Step 3 of 7, Aurora\./);
    assert.match(await page.getAttribute(`#fig-sequence .${P}-node[data-node="svc"]`, "aria-label"), /Sends 7 messages and receives 6\./);
    assert.equal(await page.locator(`#fig-architecture .${P}-node[tabindex="0"]`).count(), 1, "one tab stop");
    assert.equal(await page.locator(`#fig-architecture .${P}-svg`).evaluate((svg) => svg.closest("[aria-hidden='true']") !== null), true, "the SVG is hidden");
    await page.focus(`#fig-architecture .${P}-node[data-node="browser"]`);
    const at = () => page.evaluate(() => document.activeElement?.dataset.node);
    // Drawn, the arrows are spatial (DECISIONS 306, 1.5; the decision's table in test/fixtures/diagram-spatial-cells.json): down from the ALB is ECS, up
    // from Aurora goes nowhere. Home and End are the ends, as before.
    for (const [key, to] of [["ArrowRight", "alb"], ["ArrowDown", "ecs"], ["ArrowLeft", "browser"], ["ArrowUp", "aurora"], ["ArrowUp", "aurora"], ["End", "sys"], ["ArrowRight", "cw"], ["Home", "browser"]]) {
      await page.keyboard.press(key);
      assert.equal(await at(), to, `${key}`);
    }
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator(`#fig-architecture .${P}-node[tabindex="0"]`).getAttribute("data-node"), "alb", "the stop follows focus");
    assert.ok(await page.locator(`#fig-architecture`).evaluate((f) => f.hasAttribute("data-tracing")), "keyboard focus traces");
    await page.keyboard.press("Escape");
    assert.equal(await at(), "alb", "Esc keeps focus");
    assert.ok(!(await page.locator(`#fig-architecture`).evaluate((f) => f.hasAttribute("data-tracing"))), "Esc clears the trace");
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains("basalt-diagram-toggle")), "Tab leaves the drawing for the list's toggle");
    await page.close();
  });

  test("the stacked sequence and schema have no stops and no hint; the list's facts are the data's, each once", async () => {
    const { page } = await diagramPage({ viewport: { width: 390, height: 900 } });
    for (const key of ["sequence", "schema"]) {
      assert.equal(await page.locator(`#fig-${key} .${P}-node[tabindex]`).count(), 0, `${key} has no stops`);
      assert.equal(await page.locator(`#fig-${key} .${P}-hint`).isVisible(), false);
      assert.equal(await page.locator(`#fig-${key} .${P}-drawing`).getAttribute("role"), null);
    }
    for (const key of KEYS) await page.click(`#fig-${key} .${P}-toggle`);
    const text = (key) => page.locator(`#fig-${key} .${P}-list`).innerText();
    const arch = await text("architecture");
    for (const n of DATA.architecture.nodes) assert.ok(arch.includes(n.name), n.name);
    for (const e of DATA.architecture.edges) if (e.label) assert.equal(arch.split(`: ${e.label} (`).length - 1, 1, `the line "${e.label}" once`);
    assert.match(arch, /cimip service to Aurora PostgreSQL: SQL · NOTIFY \(Call\)\./);
    const flow = await text("flowchart");
    for (const n of DATA.flowchart.nodes) assert.equal(flow.split(`${n.name}`).length - 1 >= 1, true, n.name);
    assert.equal(flow.split("May decide, high risk asks twice").length - 1, 1, "each node is written once");
    assert.match(flow, /If responder: go to 5, Risk medium or lower\?/);
    const df = await text("dataFlow");
    // The focal node's line carries the legend's focal words (the fixture's, since fix round 2: "Where the event is written").
    assert.match(df, /Aurora: Event row \+ NOTIFY, one transaction\. Where the event is written\. Then to step 4, Hears it: NOTIFY \(The message's path\); to step 6, Keeps the newest 300: trim \(Housekeeping\); to step 7, Sealed segment: once 200 wait \(Later, in a batch\)\./);
    const seq = await text("sequence");
    // A note is written as the data has it (fix round 2 dropped the capital it was given).
    assert.match(seq, /RunTask: cimip service to ECS \(Setup\)\. idempotency token = sandbox id\./);
    const schema = await text("schema");
    assert.match(schema, /incident_id, primary key, references incidents\.id/);
    assert.match(schema, /and 8 more columns/);
    // Text is never under 12px, the list's code included.
    const small = await page.$$eval(`.${P}-list *`, (els) => els.filter((e) => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 12).map((e) => e.textContent));
    assert.deepEqual(small, []);
    await page.close();
  });

  for (const engine of ["chromium", "webkit"]) {
    test(`${engine}: focus and the roving stop survive 390 to 1440 and back; a focused table keeps focus and its ring into a stack with no stops`, async (t) => {
      let b = browser;
      if (engine === "webkit") { try { b = await webkit.launch(); } catch { t.skip("WebKit is not installed"); return; } }
      try {
        const { page } = await fixturePage(b, HOST, { theme: "dark", viewport: { width: 1440, height: 1000 }, standards: true });
        await page.addStyleTag({ content: PAGE });
        await page.evaluate(() => document.fonts.ready);
        await frames(page, 4);
        for (const key of ["architecture", "flowchart", "dataFlow"]) {
          const id = DATA[key].nodes[2].id;
          await page.focus(`#fig-${key} .${P}-node[data-node="${id}"]`);
          for (const width of [390, 900, 1440, 390, 1440]) {
            await resize(page, width);
            assert.equal(await page.evaluate(() => document.activeElement?.dataset.node), id, `${key} at ${width}: focus stayed`);
            assert.equal(await page.getAttribute(`#fig-${key} .${P}-node[data-node="${id}"]`, "tabindex"), "0", `${key} at ${width}: the stop stayed`);
          }
        }
        // The schema drawn at 1440: focus a table, narrow into the stack (no stops): focus and its ring stay; once focus leaves, it is no longer a stop.
        await resize(page, 1440);
        await page.focus(`#fig-schema .${P}-node[data-node="incidents"]`);
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowLeft");
        await resize(page, 390);
        assert.equal(await page.evaluate(() => document.activeElement?.dataset.node), "incidents", "focus stays on the table");
        assert.equal(await page.getAttribute(`#fig-schema .${P}-node[data-node="incidents"]`, "tabindex"), "-1");
        if (engine === "chromium") assert.notEqual(await page.$eval(`#fig-schema .${P}-node[data-node="incidents"]`, (el) => getComputedStyle(el).outlineStyle), "none", "its ring stays");
        await page.keyboard.press("Tab");
        await frames(page);
        assert.equal(await page.getAttribute(`#fig-schema .${P}-node[data-node="incidents"]`, "tabindex"), null, "no longer a stop once focus left");
        await page.close();
      } finally { if (b !== browser) await b.close(); }
    });
  }

  test("the toggle is at least 44px on touch", async () => {
    const { page } = await diagramPage({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
    const h = await page.$eval(`#fig-architecture .${P}-toggle`, (el) => el.getBoundingClientRect().height);
    assert.ok(h >= 44, `${h}`);
    await page.close();
  });
});

describe("tracing (1.15)", () => {
  test("a traced line keeps its width, dash and head; a label keeps its box; the rest dim to the input boundary; leaving clears it", async () => {
    const { page } = await diagramPage();
    const read = () => page.$$eval(`#fig-architecture .${P}-edge`, (gs) => gs.sort((a, b) => a.dataset.edge - b.dataset.edge).map((g) => { const p = g.querySelector(".basalt-diagram-line"), s = getComputedStyle(p); return { lit: g.hasAttribute("data-lit"), dim: g.hasAttribute("data-dim"), w: s.strokeWidth, dash: s.strokeDasharray, stroke: s.stroke, tip: g.querySelector(".basalt-diagram-tip").getAttribute("d") }; }));
    const labels = () => page.$$eval(`#fig-architecture .${P}-label`, (ls) => ls.map((l) => { const r = l.getBoundingClientRect(); return [r.width, r.height, r.x, r.y]; }));
    const restLines = await read(), restLabels = await labels();
    await page.hover(`#fig-architecture .${P}-node[data-node="svc"]`);
    await page.waitForTimeout(150);
    const traced = await read();
    const input = await page.evaluate(() => { const s = document.createElement("i"); s.style.color = "var(--basalt-border-input)"; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; });
    const main = await page.evaluate(() => { const s = document.createElement("i"); s.style.color = "var(--basalt-text-primary)"; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; });
    traced.forEach((l, k) => {
      assert.equal(l.w, restLines[k].w, "width kept");
      assert.equal(l.dash, restLines[k].dash, "dash kept");
      assert.equal(l.tip, restLines[k].tip, "head kept");
      assert.equal(l.stroke, l.lit ? main : input);
    });
    assert.ok(traced.some((l) => l.lit) && traced.some((l) => l.dim));
    assert.deepEqual(await labels(), restLabels, "a label's box does not move or change size");
    await page.mouse.move(2, 2);
    await page.waitForTimeout(150);
    assert.ok((await read()).every((l) => !l.lit && !l.dim), "nothing is left traced after the pointer leaves");
    // A press focuses a node and traces nothing.
    await page.click(`#fig-architecture .${P}-node[data-node="alb"]`);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(150);
    assert.ok((await read()).every((l) => !l.lit), "a press traces nothing");
    await page.close();
  });

  test("on touch (no hover) a tap traces nothing", async () => {
    const { page } = await diagramPage({ hasTouch: true, isMobile: true, viewport: { width: 1440, height: 1000 } });
    await page.tap(`#fig-architecture .${P}-node[data-node="svc"]`);
    await page.waitForTimeout(150);
    assert.equal(await page.locator(`#fig-architecture .${P}-edge[data-lit]`).count(), 0);
    await page.close();
  });
});

describe("modes (1.16 to 1.19)", () => {
  for (const scheme of ["dark", "light"]) for (const theme of ["dark", "light"]) {
    test(`forced colours (${scheme} palette) under a saved ${theme} theme: lines, heads and contours in system colours, the focal node legible on its own fill`, async () => {
      const { page } = await diagramPage({ theme, forcedColors: "active", colorScheme: scheme });
      const r = await page.evaluate(() => {
        const sys = (name) => { const s = document.createElement("i"); s.style.color = name; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; };
        const main = document.querySelector("#fig-architecture .basalt-diagram-line[data-kind='main']");
        const contour = getComputedStyle(document.querySelector("#fig-flowchart .basalt-diagram-node[data-shape='terminal']")).borderTopColor;
        const diamond = getComputedStyle(document.querySelector("#fig-flowchart .basalt-diagram-node[data-shape='decision'] .basalt-diagram-diamond path")).stroke;
        const focal = document.querySelector("#fig-architecture .basalt-diagram-node[data-focal]");
        return { canvasText: sys("CanvasText"), canvas: sys("Canvas"), gray: sys("GrayText"), main: getComputedStyle(main).stroke, contour, diamond, focalFill: getComputedStyle(focal).backgroundColor, focalName: getComputedStyle(focal.querySelector(".basalt-diagram-name")).color, focalKind: getComputedStyle(focal.querySelector(".basalt-diagram-kind")).color, life: getComputedStyle(document.querySelector("#fig-sequence .basalt-diagram-life")).stroke, group: getComputedStyle(document.querySelector("#fig-architecture .basalt-diagram-gbox")).borderTopColor };
      });
      assert.equal(r.main, r.canvasText, "the main line is CanvasText");
      assert.equal(r.contour, r.canvasText, "a flowchart contour is CanvasText");
      assert.equal(r.diamond, r.canvasText, "a decision's diamond is CanvasText");
      assert.equal(r.life, r.gray, "a lifeline is GrayText");
      assert.equal(r.group, r.gray, "a group's boundary is GrayText");
      assert.equal(r.focalFill, r.canvasText, "the focal fill is CanvasText");
      assert.equal(r.focalName, r.canvas, "the focal words are Canvas");
      assert.equal(r.focalKind, r.canvas);
      // The pixels under each focal part's words (the focal node, the focal table, and below the stacked sequence's focal chip): the words against the fill
      // they sit on, never against a Canvas backplate. The word box's pixels hold two colours, the fill and the ink; a backplate would make the fill there
      // Canvas, and the ink's contrast against its surround 1:1.
      const L = (c) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      const parse = (c) => c.match(/\d+/g).slice(0, 3).map(Number);
      const canvas = parse(r.canvas);
      const under = async (selector) => { const words = page.locator(selector).first(); await words.scrollIntoViewIfNeeded(); const box = await words.boundingBox(); return pixels(page, { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) }); };
      const onFill = async (what, words, part) => {
        const fill = parse(await page.$eval(part, (el) => getComputedStyle(el).backgroundColor));
        assert.equal(await page.$eval(part, (el) => getComputedStyle(el).forcedColorAdjust), "none", `${what}: forced-color-adjust`);
        const px = await under(words);
        const fillShare = px.filter((p) => ratio(p, fill) < 1.1).length / px.length;
        assert.ok(fillShare > 0.4, `${what}: ${Math.round(fillShare * 100)}% of the words' box is the fill: a backplate would cover it`);
        const strongest = Math.max(...px.map((p) => ratio(p, fill)));
        assert.ok(strongest >= 4.5, `${what}: the words are ${strongest.toFixed(2)}:1 on their fill`);
        assert.ok(ratio(fill, canvas) >= 3, `${what}: the fill stands 3:1 off Canvas`);
      };
      await onFill("the focal node", "#fig-architecture .basalt-diagram-node[data-focal] .basalt-diagram-name", "#fig-architecture .basalt-diagram-node[data-focal]");
      await onFill("the focal node's kind", "#fig-architecture .basalt-diagram-node[data-focal] .basalt-diagram-kind", "#fig-architecture .basalt-diagram-node[data-focal]");
      await onFill("the focal table", "#fig-schema .basalt-diagram-node[data-focal] .basalt-diagram-tname", "#fig-schema .basalt-diagram-node[data-focal]");
      await onFill("the focal table's type", "#fig-schema .basalt-diagram-node[data-focal] .basalt-diagram-ctype", "#fig-schema .basalt-diagram-node[data-focal]");
      // Every other word at 4.5:1 against Canvas: a node's name, kind and detail, a label, the key, a lane's name, a table's row.
      for (const words of ["#fig-architecture .basalt-diagram-node[data-node='alb'] .basalt-diagram-name", "#fig-architecture .basalt-diagram-node[data-node='alb'] .basalt-diagram-kind", "#fig-architecture .basalt-diagram-node[data-node='aurora'] .basalt-diagram-detail", "#fig-architecture .basalt-diagram-label", "#fig-architecture .basalt-diagram-legend", "#fig-dataFlow .basalt-diagram-lane-name", "#fig-schema .basalt-diagram-node:not([data-focal]) .basalt-diagram-cname", "#fig-flowchart .basalt-diagram-node[data-shape='decision'] .basalt-diagram-name"]) {
        const strongest = Math.max(...(await under(words)).map((p) => ratio(p, canvas)));
        assert.ok(strongest >= 4.5, `${words} is ${strongest.toFixed(2)}:1 on Canvas`);
      }
      // A measured decision is its diamond alone, at rest and traced: no rectangle round it (its box's border stays transparent, and its corner is Canvas).
      const decision = "#fig-flowchart .basalt-diagram-node[data-node='who']";
      const corner = async () => { await page.locator(decision).scrollIntoViewIfNeeded(); const box = await page.locator(decision).boundingBox(); return pixels(page, { x: Math.floor(box.x) + 1, y: Math.floor(box.y) + 1, width: 3, height: 3 }); };
      for (const state of ["at rest", "traced"]) {
        if (state === "traced") { await page.hover(decision); await page.waitForTimeout(150); assert.ok(await page.$eval(decision, (el) => el.hasAttribute("data-near"))); }
        assert.equal(await page.$eval(decision, (el) => getComputedStyle(el).borderTopColor), "rgba(0, 0, 0, 0)", `a decision's box has no border ${state}`);
        assert.ok((await corner()).every((p) => ratio(p, canvas) < 1.1), `a decision's box corner is Canvas ${state}`);
      }
      // A trace in system colours: the node's own lines and their labels Highlight, every other line GrayText.
      await page.hover("#fig-architecture .basalt-diagram-node[data-node='svc']");
      await page.waitForTimeout(150);
      const traced = await page.evaluate(() => ({
        lit: [...document.querySelectorAll("#fig-architecture .basalt-diagram-edge[data-lit] .basalt-diagram-line")].map((p) => getComputedStyle(p).stroke),
        dim: [...document.querySelectorAll("#fig-architecture .basalt-diagram-edge[data-dim] .basalt-diagram-line")].map((p) => getComputedStyle(p).stroke),
        label: [...document.querySelectorAll("#fig-architecture .basalt-diagram-label[data-lit]")].map((l) => getComputedStyle(l).color),
        highlight: (() => { const s = document.createElement("i"); s.style.color = "Highlight"; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; })(),
      }));
      assert.ok(traced.lit.length && traced.lit.every((c) => c === traced.highlight), "a traced line is Highlight");
      assert.ok(traced.dim.length && traced.dim.every((c) => c === r.gray), "a dimmed line is GrayText");
      assert.ok(traced.label.length && traced.label.every((c) => c === traced.highlight), "a traced line's label is Highlight");
      await page.mouse.move(2, 2);
      // The stacked sequence's focal chip, at 390.
      await resize(page, 390);
      await onFill("the stacked sequence's focal chip", "#fig-sequence .basalt-diagram-node[data-focal] .basalt-diagram-name", "#fig-sequence .basalt-diagram-node[data-focal]");
      await page.close();
    });
  }

  test("more contrast: the focal node's quiet ink at full strength; the structure and dimmed lines stay on the input boundary", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await diagramPage({ theme, contrast: "more" });
      const r = await page.evaluate(() => ({
        opacity: getComputedStyle(document.querySelector("#fig-architecture .basalt-diagram-node[data-focal] .basalt-diagram-kind")).opacity,
        structure: getComputedStyle(document.querySelector("#fig-architecture .basalt-diagram-gbox")).borderTopColor,
        input: (() => { const s = document.createElement("i"); s.style.color = "var(--basalt-border-input)"; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; })(),
      }));
      assert.equal(r.opacity, "1");
      assert.equal(r.structure, r.input);
      await page.close();
    }
  });

  test("reduced motion: no transition on a trace", async () => {
    const { page } = await diagramPage({ reducedMotion: "reduce" });
    const d = await page.$eval(`#fig-architecture .${P}-line`, (el) => getComputedStyle(el).transitionDuration);
    assert.equal(d, "0s");
    await page.close();
  });

  test("print: the lines print and the key hint does not", async () => {
    const { page } = await diagramPage();
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.$eval(`#fig-architecture .${P}-svg`, (el) => getComputedStyle(el).printColorAdjust), "exact");
    assert.equal(await page.locator(`#fig-architecture .${P}-hint`).isVisible(), false);
    assert.equal(await page.locator(`#fig-architecture .${P}-svg .${P}-line`).count(), 11);
    assert.equal(await page.$eval(`#fig-architecture .${P}-svg`, (el) => getComputedStyle(el).display !== "none" && getComputedStyle(el.querySelector(".basalt-diagram-line")).visibility === "visible"), true);
    await page.close();
  });
});

describe("contrast as rendered", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: the strongest pixel across a 1px line, a dash, a diamond's slope and a capsule's contour is 3:1 at 2x`, async () => {
      const { page } = await diagramPage({ theme, deviceScaleFactor: 2, viewport: { width: 1440, height: 2400 } });
      const L = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
      const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0, 3).map(Number));
      const strongest = async (clip) => Math.max(...(await pixels(page, clip)).map((p) => ratio(p, ground)));
      const at = (sel) => page.locator(sel).boundingBox();
      // A plain 1px line: svc to S3, across the gutter; a dash: ECS to the sandbox's horizontal run.
      const svc = await at(`#fig-architecture .${P}-node[data-node="svc"]`), s3 = await at(`#fig-architecture .${P}-node[data-node="s3"]`);
      const plain = await strongest({ x: svc.x + svc.width + 4, y: svc.y + svc.height / 2 - 4, width: 6, height: 8 });
      const agent = await at(`#fig-architecture .${P}-node[data-node="agent"]`);
      const dash = await strongest({ x: agent.x - 40, y: agent.y + agent.height / 2 - 4, width: 24, height: 8 });
      // A diamond's slope, and a capsule's curve.
      const who = await at(`#fig-flowchart .${P}-node[data-node="who"]`);
      const slope = await strongest({ x: who.x + who.width * 0.25 - 3, y: who.y + who.height * 0.25 - 3, width: 6, height: 6 });
      const obs = await at(`#fig-flowchart .${P}-node[data-node="obs"]`);
      const curve = await strongest({ x: obs.x, y: obs.y + 2, width: 8, height: 8 });
      for (const [name, r] of [["a plain line", plain], ["a dash", dash], ["a diamond's slope", slope], ["a capsule's contour", curve]]) assert.ok(r >= 3, `${theme}: ${name} is ${r.toFixed(2)}:1`);
      void s3;
      await page.close();
    });
  }
});

describe("before script (1.19)", () => {
  let basalt;
  const ssr = async (key, extra = {}) => {
    basalt ??= await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const { type, ...props } = DATA[key];
    return renderToString(React.createElement(basalt[COMPONENT[type]], { id: `fig-${key}`, ...props, ...extra }));
  };
  const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");

  test("with JavaScript off each figure holds its title, every node's text, the summary and the open list, and no toggle", async () => {
    const html = (await Promise.all(KEYS.map((k) => ssr(k)))).join("");
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.setContent(`<html data-theme="dark"><head><style>${css()}${PAGE}</style></head><body><div id="root">${html}</div></body></html>`);
    for (const key of KEYS) {
      const d = DATA[key];
      const text = await page.locator(`#fig-${key}`).innerText();
      assert.ok(text.includes(d.title) && text.includes(d.summary), key);
      for (const n of d.nodes ?? d.participants ?? d.tables) assert.ok(text.includes(n.name), `${key}: ${n.name}`);
      assert.equal(await page.locator(`#fig-${key} .${P}-list`).isVisible(), true, `${key}: the list is open`);
      assert.equal(await page.locator(`#fig-${key} .${P}-toggle`).isVisible(), false, `${key}: no toggle`);
      assert.equal(await page.getAttribute(`#fig-${key}`, "data-layout"), null);
      const stacked = await page.$eval(`#fig-${key} .${P}-drawing`, (el) => getComputedStyle(el).display !== "grid" || el.closest("[data-type='schema']") !== null);
      assert.ok(stacked, `${key} is stacked where scripting is off`);
    }
    await context.close();
  });

  test("server markup hydrates with no warning; with hydration delayed each example is stacked under its least width and on the grid from it", async () => {
    const LEAST = { architecture: 784, flowchart: 768, dataFlow: 1080, sequence: 640, schema: 1040 };
    for (const key of KEYS) for (const width of [640, LEAST[key] - 1, LEAST[key]]) {
      const html = await ssr(key);
      const page = await browser.newPage({ viewport: { width: width + PAD, height: 1000 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
      await page.setContent(`<html data-theme="dark"><head><style>${css()}${PAGE}</style></head><body><div id="root">${html}</div></body></html>`);
      await page.evaluate(() => document.fonts.ready);
      const grid = await page.$eval(`#fig-${key} .${P}-drawing`, (el) => getComputedStyle(el.querySelector(".basalt-diagram-cast") ?? el).display === "grid");
      const schema = key === "schema";
      const drawnExpected = width >= LEAST[key] && width >= 640 && (width > 640 || LEAST[key] === 640);
      if (!schema) assert.equal(grid, drawnExpected, `${key} at ${width} before script`);
      else assert.equal(await page.$eval(`#fig-${key} .${P}-drawing`, (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length), drawnExpected ? 4 : Math.max(1, Math.floor((width + 16) / (224 + 16))), `${key} at ${width} before script`);
      // No card narrower than its minimum, and no text outside its box.
      const r = await page.evaluate(`${inspectSource()}("${P}", "#fig-${key}")`);
      assert.deepEqual(r.problems.filter((p) => /leaves|cut|scrolls|wider/.test(p)), [], `${key} at ${width} before script`);
      if (grid && !schema) for (const n of r.nodes) assert.ok(n.w >= (key === "dataFlow" || key === "architecture" || key === "flowchart" ? 144 : 0) - 0.5, `${key}: ${n.id} is ${n.w}px before script`);
      // Then hydrate.
      const { type, ...props } = DATA[key];
      await page.addScriptTag({ content: await bundleFixture(`import { hydrateRoot } from "react-dom/client"; import data from "./test/fixtures/cimip-diagrams.json"; const { type, ...props } = data["${key}"]; hydrateRoot(document.getElementById("root"), React.createElement(B.${COMPONENT[type]}, { id: "fig-${key}", ...props }));`) });
      await frames(page, 4);
      assert.deepEqual(errors, [], `${key} hydrates with no warning`);
      void props;
      await page.close();
    }
  });

  test("client-rendered, no example paints before it is measured: at the first frame each figure is measured and its ink drawn", async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(`<html data-theme="dark"><head><style>${css()}${PAGE}</style></head><body><div id="root"></div></body></html>`);
    // The state each figure is in at the first frame after it is put in the page: a requestAnimationFrame callback runs before that frame's paint.
    await page.evaluate(() => {
      window.__first = {};
      new MutationObserver((records) => {
        for (const r of records) for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          for (const fig of [n, ...n.querySelectorAll("figure")]) {
            if (!fig.matches("figure.basalt-diagram") || fig.id in window.__first) continue;
            window.__first[fig.id] = null;
            requestAnimationFrame(() => { window.__first[fig.id] = { measured: fig.hasAttribute("data-measured"), layout: fig.getAttribute("data-layout"), ink: fig.querySelector(".basalt-diagram-ink").innerHTML.length }; });
          }
        }
      }).observe(document.getElementById("root"), { childList: true, subtree: true });
    });
    await page.addScriptTag({ content: await bundleFixture(HOST) });
    await frames(page, 3);
    const first = await page.evaluate(() => window.__first);
    for (const key of KEYS) {
      const f = first[`fig-${key}`];
      assert.ok(f, `${key} was seen`);
      assert.equal(f.measured, true, `${key} is measured at its first frame`);
      assert.equal(f.layout, "drawn", `${key} is laid out at its first frame`);
      assert.ok(f.ink > 0, `${key}'s lines are drawn at its first frame`);
    }
    await page.close();
  });

  test("a caller's ref is set and the figure still measures; a caller's hidden and ARIA stay through every state", async () => {
    const { page } = await fixturePage(browser, `
import data from "./test/fixtures/cimip-diagrams.json";
const { type, ...props } = data.architecture;
function Host() {
  const ref = React.useRef(null);
  React.useEffect(() => { window.__ref = ref.current; });
  return <div><B.ArchitectureDiagram id="with-ref" ref={ref} {...props} /><B.ArchitectureDiagram id="caller" hidden aria-describedby="elsewhere" data-mine="1" {...props} /><p id="elsewhere">Elsewhere.</p></div>;
}
createRoot(document.getElementById("root")).render(<Host />);`, { theme: "dark", viewport: { width: 1440, height: 1000 } });
    await page.addStyleTag({ content: PAGE });
    await frames(page, 4);
    assert.ok(await page.evaluate(() => window.__ref === document.getElementById("with-ref")), "the caller's ref is the figure");
    assert.equal(await page.getAttribute("#with-ref", "data-layout"), "drawn");
    assert.equal(await page.locator(`#with-ref .${P}-svg .${P}-line`).count(), DATA.architecture.edges.length, "its lines are drawn (the key's swatches are not counted)");
    assert.equal(await page.locator(`#with-ref .${P}-node[tabindex="0"]`).count(), 1, "one stop");
    // The figure is measured when it mounts and again when the faces arrive: neither takes the caller's attributes away.
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 390, 1440]) {
      await resize(page, width);
      assert.equal(await page.getAttribute("#caller", "hidden"), "", `at ${width} the caller's hidden stays`);
      assert.equal(await page.getAttribute("#caller", "aria-describedby"), "elsewhere", `at ${width} the caller's aria-describedby stays`);
      assert.equal(await page.getAttribute("#caller", "data-mine"), "1");
    }
    await page.close();
  });

  test("a seven-column figure stays stacked before script at every width", async () => {
    basalt ??= await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const nodes = Array.from({ length: 7 }, (_, k) => node(`n${k}`, k + 1, 1));
    const html = renderToString(React.createElement(basalt.ArchitectureDiagram, { id: "seven", title: "Seven", summary: "Seven columns.", nodes, edges: [] }));
    const page = await browser.newPage({ viewport: { width: 2400, height: 800 } });
    await page.setContent(`<html data-theme="dark"><head><style>${css()} body{margin:0}</style></head><body>${html}</body></html>`);
    for (const width of [640, 1104, 1440, 2400]) {
      await page.setViewportSize({ width, height: 800 });
      assert.notEqual(await page.$eval(`#seven .${P}-drawing`, (el) => getComputedStyle(el).display), "grid", `at ${width}`);
    }
    await page.close();
  });

  test("at 1440 the architecture, data flow, sequence and schema do not move when script arrives; the flowchart moves only by its decisions' heights", async () => {
    for (const key of KEYS) {
      const html = await ssr(key);
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await page.setContent(`<html data-theme="dark"><head><style>${css()}${PAGE}</style></head><body><div id="root">${html}</div></body></html>`);
      await page.evaluate(() => document.fonts.ready);
      const boxes = () => page.$$eval(`#fig-${key} .${P}-node`, (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.node, x: Math.round(r.x * 2) / 2, y: Math.round(r.y * 2) / 2, w: Math.round(r.width * 2) / 2, h: Math.round(r.height * 2) / 2, decision: e.dataset.shape === "decision" }; }));
      const before = await boxes();
      await page.addScriptTag({ content: await bundleFixture(`import { hydrateRoot } from "react-dom/client"; import data from "./test/fixtures/cimip-diagrams.json"; const { type, ...props } = data["${key}"]; hydrateRoot(document.getElementById("root"), React.createElement(B.${COMPONENT[DATA[key].type]}, { id: "fig-${key}", ...props }));`) });
      await frames(page, 4);
      const after = await boxes();
      if (key === "flowchart") {
        // Every box keeps its column; rows move by the decisions' heights only.
        before.forEach((b, k) => { assert.equal(after[k].x, b.x, `${b.id} x`); assert.equal(after[k].w, b.w, `${b.id} width`); if (!b.decision) assert.equal(after[k].h, b.h, `${b.id} height`); });
      } else assert.deepEqual(after, before, `${key} moved when script arrived`);
      await page.close();
    }
  });
});

describe("rules", () => {
  test("the diagrams' styles use tokens, and text is never under 12px", async () => {
    const section = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8").split("/* ---- Diagrams (DECISIONS 281")[1].split("/* ---- Lit figures")[0];
    assert.doesNotMatch(section.replace(/\/\*[\s\S]*?\*\//g, ""), /#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i, "no raw colour");
    assert.doesNotMatch(section, /text-(?:2xs|3xs)/, "no type under text-xs");
  });

  test("an app that imports one diagram does not load another's module", async () => {
    const esbuild = await import("esbuild");
    const out = await esbuild.build({ stdin: { contents: `import { ArchitectureDiagram } from "./dist/index.js"; console.log(ArchitectureDiagram);`, resolveDir: pkg, loader: "js" }, bundle: true, write: false, metafile: true, format: "esm", external: ["react", "react-dom", "react/jsx-runtime", "@base-ui/react", "@base-ui/react/*", "@phosphor-icons/react", "@phosphor-icons/react/*", "cmdk", "shiki"], logLevel: "silent" });
    const inputs = Object.entries(Object.values(out.metafile.outputs)[0].inputs).filter(([, v]) => v.bytesInOutput > 0).map(([k]) => k);
    for (const other of ["flowchart-diagram", "data-flow-diagram", "sequence-diagram", "schema-diagram", "chart"]) assert.ok(!inputs.some((f) => f.endsWith(`dist/${other}.js`)), `${other} is loaded`);
    assert.ok(inputs.some((f) => f.endsWith("dist/architecture-diagram.js")));
  });

  test("the engine does no work when its module loads", async () => {
    const source = fs.readFileSync(path.join(pkg, "src", "diagram-core.ts"), "utf8");
    const topLevel = source.split("\n").filter((l) => /^(const|let|var) /.test(l));
    // A function is an arrow, a generic one (`<T>(from) => …`) included.
    for (const line of topLevel) assert.match(line, /^const \w+(?:: [^=]+)? = (?:\[|\{|"|'|\d|\(|<\w+(?:, \w+)*>\(|new (?:Set|Map)\(\[)/, `a module-scope value that is not a literal or a function: ${line}`);
    // No statement at module scope calls anything.
    assert.doesNotMatch(source, /^[a-zA-Z_$][\w$.]*\(/m, "a call at module scope");
  });
});
