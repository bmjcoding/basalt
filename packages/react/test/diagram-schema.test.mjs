// A schema's cardinality and its far keys (DECISIONS 306, 1.1, revised by 313; section 8's list for diagram-schema.test.mjs), on the extended CIMIP
// schema (test/fixtures/cimip-diagrams-b.json: cardinality on every key, approvals.incident_id and approvals.decided_by two columns away) and small
// fixtures. In Chromium against the built package, both themes. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { inspectSource } from "./diagram-geometry.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const A = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:0 16px} #root{width:var(--w,1104px)}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, spec }) => { const { type, ...props } = spec; return <B.SchemaDiagram key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function figurePage({ theme = "dark", width = 1440, dev = false } = {}) {
  // A development build, so the warnings are written; the fixtures are production builds, which drop them.
  const { page, errors } = await fixturePage(browser, "", { theme, viewport: { width, height: 1400 }, standards: true });
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
const draw = async (page, items) => { await page.evaluate((items) => window.__set(items), items); await frames(page, 5); };
const widthTo = async (page, w) => { await page.evaluate((w) => document.getElementById("root").style.setProperty("--w", `${w}px`), w); await frames(page, 5); };
const inspect = (page, key) => page.evaluate(`${inspectSource()}("${P}", "#fig-${key}")`);

/** Each drawn foreign key: its path's points, its marks (bars' x, a foot's point, a ring), the tables' edges, and computed inks. */
const readLines = (page, key) => page.evaluate(({ P, key }) => {
  const fig = document.querySelector(`#fig-${key}`);
  const drawing = fig.querySelector(`.${P}-drawing`);
  const o = drawing.getBoundingClientRect();
  const rect = (id) => { const r = fig.querySelector(`.${P}-node[data-node="${id}"]`).getBoundingClientRect(); return { l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top }; };
  const nums = (d) => d.match(/-?[\d.]+/g).map(Number);
  return [...fig.querySelectorAll(`.${P}-edge`)].map((g) => {
    const line = g.querySelector(`.${P}-line`);
    const d = line.getAttribute("d");
    // The route's points (a Q's control point is the corner) and the runs written between corners (L … then Q): where each elbow starts and ends.
    const pts = [], straight = [];
    for (const m of d.matchAll(/([MLQ])([^MLQ]*)/g)) {
      const n = m[2].trim().split(/[ ,]+/).map(Number);
      if (m[1] === "Q") { straight.push({ x: n[2], y: n[3] }); pts.pop(); pts.push({ x: n[0], y: n[1] }); } else { pts.push({ x: n[0], y: n[1] }); straight.push({ x: n[0], y: n[1] }); }
    }
    const end = (which) => {
      const crow = g.querySelector(`.${P}-crow[data-end="${which}"]`);
      const ring = g.querySelector(`.${P}-ring[data-end="${which}"]`);
      return crow ? { crow: crow.getAttribute("d"), segs: [...crow.getAttribute("d").matchAll(/M([^M]*)/g)].map((s) => nums(s[1])), ring: ring ? { cx: +ring.getAttribute("cx"), cy: +ring.getAttribute("cy"), r: +ring.getAttribute("r") } : null, stroke: getComputedStyle(crow).stroke, ringStroke: ring ? getComputedStyle(ring).stroke : null, ringFill: ring ? getComputedStyle(ring).fill : null } : null;
    };
    return { i: g.dataset.edge, from: g.dataset.from, to: g.dataset.to, d, pts, straight, stroke: getComputedStyle(line).stroke, tip: !!g.querySelector(`.${P}-tip`), dot: !!g.querySelector(`.${P}-dot`), fromEnd: end("from"), toEnd: end("to"), a: rect(g.dataset.from), b: rect(g.dataset.to), ox: o.left - Math.floor(o.left), oy: o.top - Math.floor(o.top) };
  });
}, { P, key });

const col = (name, extra = {}) => ({ name, type: "text", ...extra });
const fk = (name, references, from, to) => ({ name, key: "FK", references, ...(from ? { cardinality: { from, ...(to ? { to } : {}) } } : {}) });
const table = (name, c, r, columns) => ({ name, col: c, row: r, columns });
const schema = (tables, extra = {}) => ({ type: "schema", title: "A schema", summary: "Tables and their keys.", legend: { plain: "A foreign key" }, tables, ...extra });

// Four forms on straight lines, each from its own row to the row level with it.
const FORMS = [["one", "one"], ["zero-or-one", "zero-or-one"], ["one-or-many", "one"], ["zero-or-many", "zero-or-one"]];
const formsSpec = schema([
  table("a", 1, 1, FORMS.map(([from, to], k) => fk(`k${k}`, `b.c${k}`, from, to))),
  table("b", 2, 1, FORMS.map((_, k) => col(`c${k}`, { key: k ? undefined : "PK" }))),
]);
// n lines from a's first rows to b's rows below them: their runs in the gutter overlap, so they take n lanes.
const lanesSpec = (n) => schema([
  table("a", 1, 1, Array.from({ length: n }, (_, k) => fk(`f${k}`, `b.x${n + k}`, "zero-or-many", "one"))),
  table("b", 2, 1, Array.from({ length: 2 * n }, (_, k) => col(`x${k}`))),
]);
// Three far lines from z to three keys of x, over a table that spans both rows of column 2: all three take the margin above.
const corridorSpec = schema([
  table("x", 1, 1, [col("p0", { key: "PK" }), col("p1"), col("p2")]),
  table("y", 2, [1, 2], [col("id", { key: "PK" })]),
  table("w", 1, 2, [col("id", { key: "PK" })]),
  table("z", 3, 1, [fk("r0", "x.p0"), fk("r1", "x.p1"), fk("r2", "x.p2")]),
]);

describe("the four forms", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: each form's marks at its distances, on the shaft, snapped with the line, in the line's ink at rest, traced and dimmed`, async () => {
    const { page, errors } = await figurePage({ theme });
    await draw(page, [{ key: "forms", spec: formsSpec }]);
    assert.equal(await page.locator("#fig-forms").getAttribute("data-layout"), "drawn");
    const lines = await readLines(page, "forms");
    assert.equal(lines.length, 4);
    // Where each mark's ink is, from its table's edge along the line: a bar is the pixel ending at its distance; a foot's point; a ring's middle.
    const read = (end, edge, y, out) => {
      const bars = [], foot = [];
      for (const s of end.segs) {
        if (s.length === 3) bars.push((s[0] - edge) * out + 0.5); // M x y V y2: x is the bar's middle
        else foot.push(s);
      }
      return { bars: bars.sort((p, q) => p - q), foot: foot.length ? (foot[0][2] - edge) * out : null, footSpread: foot.length ? [foot[0][1] - y, foot[0][5] - y] : null, ring: end.ring ? (end.ring.cx - edge) * out : null, ringR: end.ring?.r };
    };
    const want = {
      one: { bars: [4, 8], foot: null, ring: null },
      "zero-or-one": { bars: [4], foot: null, ring: 10.5 },
      "one-or-many": { bars: [11], foot: 7.5, ring: null },
      "zero-or-many": { bars: [], foot: 7.5, ring: 10.5 },
    };
    lines.sort((p, q) => p.pts[0].y - q.pts[0].y);
    lines.forEach((l, k) => {
      const [fromForm, toForm] = FORMS[k];
      assert.ok(!l.tip && !l.dot, "no head and no dot where the cardinality is stated");
      const y = l.pts[0].y;
      assert.equal(l.pts.length, 2, "a straight line");
      // The shaft runs from table edge to table edge, on whole pixels of the edge.
      assert.ok(Math.abs(l.pts[0].x - l.a.r) <= 0.5 && Math.abs(l.pts[1].x - l.b.l) <= 0.5, "the shaft runs to both tables' edges");
      const f = read(l.fromEnd, l.pts[0].x, y, 1), t = read(l.toEnd, l.pts[1].x, y, -1);
      for (const [got, form] of [[f, fromForm], [t, toForm]]) {
        assert.deepEqual(got.bars, want[form].bars, `${form}: its bars`);
        assert.equal(got.foot, want[form].foot, `${form}: its foot's point`);
        if (got.foot !== null) assert.deepEqual(got.footSpread, [-4, 4], `${form}: its spokes end space-1 either side`);
        assert.equal(got.ring, want[form].ring, `${form}: its ring`);
        if (got.ring !== null) {
          assert.equal(got.ringR, 3, "a ring is size-dot across its stroke's middle");
          assert.deepEqual([got.ring - got.ringR - 0.5, got.ring + got.ringR + 0.5], [7, 14], "its ink runs from 7 to 14, inside the zone");
        }
        // Every mark's ink inside the 14px zone.
        for (const b of got.bars) assert.ok(b - 1 >= 0 && b <= 14, `${form}: a bar inside the zone`);
      }
      // Snapped with the line: the line on a half pixel, a bar's middle on a half pixel, both in the page's grid.
      const half = (v, off) => Math.abs(((v + off) % 1 + 1) % 1 - 0.5) < 0.02;
      assert.ok(half(y, l.oy), `the line is on a half pixel (${y})`);
      for (const s of [...l.fromEnd.segs, ...l.toEnd.segs].filter((s) => s.length === 3)) assert.ok(half(s[0], l.ox), `a bar is on a half pixel (${s[0]})`);
      // In the line's own ink at rest; the ring is filled with the ground.
      for (const e of [l.fromEnd, l.toEnd]) { assert.equal(e.stroke, l.stroke); if (e.ring) assert.equal(e.ringStroke, l.stroke); }
    });
    const ground = await page.evaluate((P) => getComputedStyle(document.querySelector("#fig-forms")).getPropertyValue("--_ground").trim(), P);
    assert.ok(ground, "the figure has a ground");
    // Traced (a hovered table) the marks take the main ink, and every other line's marks dim with their line.
    const inks = await page.evaluate((P) => { const s = getComputedStyle(document.querySelector("#fig-forms")); return { main: s.getPropertyValue("--basalt-diagram-edge-main").trim(), dim: s.getPropertyValue("--basalt-diagram-edge-dim").trim() }; }, P);
    await page.hover(`#fig-forms .${P}-node[data-node="a"]`);
    await page.waitForTimeout(250);
    const lit = await readLines(page, "forms");
    for (const l of lit) for (const e of [l.fromEnd, l.toEnd]) { assert.equal(e.stroke, l.stroke, "traced: the marks keep the line's ink"); if (e.ring) assert.equal(e.ringStroke, l.stroke); }
    const litStroke = lit[0].stroke;
    // Dimmed: draw a second figure's line... a table with no lines dims every line: use a schema where one table has its own line.
    await draw(page, [{ key: "forms", spec: schema([...formsSpec.tables, table("c", 3, 1, [col("id", { key: "PK" }), fk("b0", "b.c0", "zero-or-many", "one")])]) }]);
    await page.hover(`#fig-forms .${P}-node[data-node="c"]`);
    await page.waitForTimeout(250);
    const dim = (await readLines(page, "forms")).filter((l) => l.from === "a");
    assert.ok(dim.length === 4);
    for (const l of dim) { assert.notEqual(l.stroke, litStroke, "the other lines dim"); for (const e of [l.fromEnd, l.toEnd]) assert.equal(e.stroke, l.stroke, "dimmed: the marks keep the line's ink"); }
    void inks;
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("the zone, the gap and the lanes", () => {
  test("no elbow starts inside the 14px zone; the gap is 60 with marks and 48 without", async () => {
    const { page } = await figurePage();
    await draw(page, [{ key: "marked", spec: B.schema }, { key: "plain", spec: A.schema }]);
    const gap = (key) => page.evaluate(({ P, key }) => parseFloat(getComputedStyle(document.querySelector(`#fig-${key} .${P}-drawing`)).columnGap), { P, key });
    assert.equal(await gap("marked"), 60);
    assert.equal(await gap("plain"), 48);
    assert.equal(await page.locator("#fig-marked").getAttribute("data-marks"), "");
    assert.equal(await page.locator("#fig-plain").getAttribute("data-marks"), null);
    for (const l of await readLines(page, "marked")) {
      // The written runs: the first L after M, and the last point before the end, are where the first and last elbows start.
      const s = l.straight;
      if (s.length < 3) continue;
      const first = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y), last = Math.hypot(s[s.length - 1].x - s[s.length - 2].x, s[s.length - 1].y - s[s.length - 2].y);
      assert.ok(first >= 14 - 0.01, `${l.from} to ${l.to}: its first elbow starts ${first.toFixed(2)} from the edge`);
      assert.ok(last >= 14 - 0.01, `${l.from} to ${l.to}: its last elbow ends ${last.toFixed(2)} from the edge`);
    }
    await page.close();
  });

  for (const theme of ["dark", "light"]) test(`${theme}: a marked gutter's lanes are at 30; 20 and 40; 18, 30 and 42, every elbow 3.5 or more outside the zone; a fourth leaves one line out and warns`, async () => {
    const { page, warnings } = await figurePage({ theme, dev: true });
    for (const [n, want] of [[1, [30]], [2, [20, 40]], [3, [18, 30, 42]]]) {
      await draw(page, [{ key: "lanes", spec: lanesSpec(n) }]);
      assert.equal(await page.locator("#fig-lanes").getAttribute("data-layout"), "drawn", `${n} lanes: drawn`);
      const lines = await readLines(page, "lanes");
      assert.equal(lines.length, n);
      const xs = lines.map((l) => l.pts[1].x - l.a.r).sort((p, q) => p - q);
      xs.forEach((x, k) => assert.ok(Math.abs(x - want[k]) <= 0.5, `${n} lanes: lane ${k + 1} at ${x} (${want[k]})`));
      for (const l of lines) {
        const s = l.straight;
        const first = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y), last = Math.hypot(s[s.length - 1].x - s[s.length - 2].x, s[s.length - 1].y - s[s.length - 2].y);
        assert.ok(first >= 14 && last >= 14, `${n} lanes: the elbows start outside the zone (${first}, ${last})`);
        // The lane's room outside the zone: its distance from either table less 14.
        assert.ok(Math.min(l.pts[1].x - l.a.r, l.b.l - l.pts[1].x) - 14 >= 3.5, `${n} lanes: 3.5 or more outside the zone`);
      }
    }
    warnings.length = 0;
    await draw(page, [{ key: "lanes", spec: lanesSpec(4) }]);
    assert.equal(await page.locator("#fig-lanes").getAttribute("data-layout"), "drawn", "a tight line never stacks the figure");
    const four = await readLines(page, "lanes");
    assert.equal(four.length, 3, "one line is left out");
    assert.ok(!four.some((l) => l.i === "3"), "the later in the author's order");
    assert.ok(warnings.some((w) => /a\.f3|a to b would need a fourth lane in a marked gutter/.test(w)), JSON.stringify(warnings));
    // Its row still writes the target.
    assert.match(await page.locator(`#fig-lanes .${P}-node[data-node="a"] .${P}-row[data-row="3"] .${P}-ctype`).textContent(), /→ b/);
    await page.close();
  });
});

describe("the extended CIMIP schema", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: drawn at 1,104 with every key drawn, and at 1,096; its far keys pass through no table and every crossing is cut, before and during a trace`, async () => {
    const { page, errors } = await figurePage({ theme });
    await draw(page, [{ key: "schema", spec: B.schema }]);
    const keys = B.schema.tables.flatMap((t) => t.columns.filter((c) => c.references).map((c) => `${t.name}>${c.references.split(".")[0]}`));
    for (const w of [1104, 1096]) {
      await widthTo(page, w);
      const g = await inspect(page, "schema");
      assert.equal(g.layout, "drawn", `drawn at ${w}`);
      assert.deepEqual(g.problems, [], `${w}: ${JSON.stringify(g.problems)}`);
      assert.deepEqual(g.lines.map((l) => `${l.from}>${l.to}`).sort(), keys.slice().sort(), `${w}: every key is drawn`);
      assert.ok(g.crossings.every((c) => c.cut), JSON.stringify(g.crossings));
    }
    await widthTo(page, 1104);
    // The far keys: approvals to incidents along the margin above, approvals to users along the gap between rows 2 and 3.
    const lines = await readLines(page, "schema");
    const far = (to) => lines.find((l) => l.from === "approvals" && l.to === to && Math.abs(l.a.l - l.b.r) > 300);
    const inc = far("incidents"), users = far("users");
    assert.ok(inc && users, "both far keys are drawn");
    const rects = await page.evaluate((P) => { const o = document.querySelector(`#fig-schema .${P}-drawing`).getBoundingClientRect(); return Object.fromEntries([...document.querySelectorAll(`#fig-schema .${P}-node`)].map((n) => { const r = n.getBoundingClientRect(); return [n.dataset.node, { t: r.top - o.top, b: r.bottom - o.top }]; })); }, P);
    const runY = (l) => l.pts[2].y;
    assert.ok(runY(inc) < rects.agent_runs.t, "approvals to incidents runs above the first row");
    assert.ok(runY(inc) > 0, "inside the drawing");
    assert.ok(runY(users) > rects.agent_runs.b && runY(users) < rects.sandboxes.t, "approvals to users runs in the gap between rows 2 and 3");
    // The rows: a margin corridor adds space-8 above the first row, the gap that carries a corridor is space-10, the other stays space-8, and no
    // margin below. One lane in the gap's middle (space-3-5 clear of each side with two); the margin's lane space-4 above the first row.
    const tracks = await page.evaluate((P) => getComputedStyle(document.querySelector(`#fig-schema .${P}-drawing`)).gridTemplateRows.split(" ").map(parseFloat), P);
    assert.deepEqual([tracks.length, tracks[0], tracks[2], tracks[4], tracks[6]], [7, 32, 32, 40, 0]);
    const gapTop = tracks[0] + tracks[1] + tracks[2] + tracks[3];
    assert.ok(Math.abs(runY(users) - (gapTop + 20)) <= 0.5, `one lane, in the gap's middle (${runY(users)}, ${gapTop})`);
    assert.ok(Math.abs(rects.room_events.t - runY(inc) - 16) <= 0.5, "the margin's lane is space-4 out");
    assert.equal(rects.sandboxes.t, gapTop + 40);
    // During a trace every crossing is still cut, the traced line on top.
    await page.hover(`#fig-schema .${P}-node[data-node="approvals"]`);
    await page.waitForTimeout(250);
    const traced = await inspect(page, "schema");
    assert.deepEqual(traced.problems, [], JSON.stringify(traced.problems));
    assert.ok(traced.crossings.every((c) => c.cut));
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("two arrivals at one key that state different things are 8px apart; the same thing shares a bus", async () => {
    const { page } = await figurePage();
    await draw(page, [{ key: "two", spec: schema([
      table("a", 1, 1, [col("id", { key: "PK" }), fk("u", "b.id", "zero-or-many", "one")]),
      table("c", 1, 2, [col("id", { key: "PK" }), fk("u", "b.id", "zero-or-many", "zero-or-one")]),
      table("d", 1, 3, [col("id", { key: "PK" }), fk("u", "b.id", "zero-or-many", "one")]),
      table("b", 2, 2, [col("id", { key: "PK" })]),
    ]) }]);
    const lines = await readLines(page, "two");
    assert.equal(lines.length, 3);
    const tip = (from) => lines.find((l) => l.from === from).pts.at(-1);
    assert.equal(tip("c").y - tip("a").y, 8, "the two statements arrive 8 apart");
    assert.equal(tip("a").y, tip("d").y, "the same statement shares its arrival");
    const lastX = (from) => lines.find((l) => l.from === from).pts.at(-2).x;
    assert.equal(lastX("a"), lastX("d"), "and its bus");
    assert.notEqual(lastX("a"), lastX("c"), "a different statement takes its own lane");
    await page.close();
  });

  test("a third line in one corridor is left out alone, and a development build names it", async () => {
    const { page, warnings } = await figurePage({ dev: true });
    await draw(page, [{ key: "corr", spec: corridorSpec }]);
    assert.equal(await page.locator("#fig-corr").getAttribute("data-layout"), "drawn");
    const lines = await readLines(page, "corr");
    assert.deepEqual(lines.map((l) => l.i).sort(), ["0", "1"], "the third, in the author's order, is left out");
    assert.ok(warnings.some((w) => /z to x would need a third lane in its corridor/.test(w)), JSON.stringify(warnings));
    const g = await inspect(page, "corr");
    assert.deepEqual(g.problems, []);
    // Two lanes in the margin, space-4 and space-4 plus space-3 above the first row; the farther-going outermost (here: equal, so nested by its run).
    const top = await page.evaluate((P) => { const o = document.querySelector(`#fig-corr .${P}-drawing`).getBoundingClientRect(); return document.querySelector(`#fig-corr .${P}-node[data-node="x"]`).getBoundingClientRect().top - o.top; }, P);
    assert.deepEqual(lines.map((l) => Math.round(top - l.pts[2].y)).sort((p, q) => p - q), [16, 28]);
    await page.close();
  });
});

describe("the key, the list and the row", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: the key shows exactly the forms drawn, and none stacked; the list and the sentence carry the words; the row is unchanged`, async () => {
    const { page } = await figurePage({ theme });
    await draw(page, [{ key: "schema", spec: B.schema }, { key: "half", spec: schema([table("a", 1, 1, [col("id", { key: "PK" }), fk("b_id", "b.id", "one", "one")]), table("b", 2, 1, [col("id", { key: "PK" })])]) }]);
    const shown = (key) => page.evaluate(({ P, key }) => [...document.querySelectorAll(`#fig-${key} .${P}-entry`)].filter((e) => getComputedStyle(e).display !== "none").map((e) => e.textContent), { P, key });
    assert.deepEqual(await shown("schema"), ["PKPrimary key", "FKForeign key", "Exactly one", "Zero or one", "One or many", "Zero or many", "The table most of the others reference"]);
    assert.deepEqual(await shown("half"), ["PKPrimary key", "FKForeign key", "Exactly one"], "only the forms drawn");
    // Each swatch is a 24px line carrying its form.
    const sw = await page.evaluate((P) => [...document.querySelectorAll(`#fig-schema .${P}-swatch[data-card]`)].map((s) => [s.dataset.card, s.getAttribute("width"), !!s.querySelector(`.${P}-crow`), !!s.querySelector(`.${P}-ring`)]), P);
    assert.deepEqual(sw, [["one", "24", true, false], ["zero-or-one", "24", true, true], ["one-or-many", "24", true, false], ["zero-or-many", "24", true, true]]);
    // The list: "decided_by, foreign key, references users.id (zero or many approvals to zero or one users)".
    const item = await page.evaluate((P) => [...document.querySelectorAll(`#fig-schema .${P}-list li`)].map((li) => li.textContent).find((t) => t.startsWith("decided_by")), P);
    assert.equal(item, "decided_by, foreign key, references users.id (zero or many approvals to zero or one users)");
    const sentence = await page.locator(`#fig-schema .${P}-node[data-node="approvals"]`).getAttribute("aria-label");
    assert.match(sentence, /users \(decided_by: zero or many approvals to zero or one users\)/);
    assert.match(await page.locator(`#fig-schema .${P}-node[data-node="users"]`).getAttribute("aria-label"), /approvals \(decided_by: zero or many approvals to zero or one users\)/);
    // The row writes its target, as it did; no tag.
    const row = await page.evaluate((P) => [...document.querySelectorAll(`#fig-schema .${P}-node[data-node="approvals"] .${P}-row`)].map((r) => r.textContent), P);
    assert.deepEqual(row, ["PKidtext", "FKincident_id→ incidents", "FKrun_id→ agent_runs", "FKdecided_by→ users", "commandtext", "risklow | medium | high", "statuspending"]);
    // Stacked: no lines, so no marks, and the key keeps the foreign key's arrow.
    await widthTo(page, 390);
    assert.equal(await page.locator("#fig-schema").getAttribute("data-layout"), "stacked");
    const stacked = await shown("schema");
    assert.ok(!stacked.some((t) => /Exactly one|Zero or|One or many/.test(t)), JSON.stringify(stacked));
    assert.ok(stacked.includes("→The table a foreign key references"), JSON.stringify(stacked));
    assert.equal(await page.locator(`#fig-schema .${P}-drawing .${P}-crow`).count(), 0);
    await page.close();
  });
});

describe("modes", () => {
  test("forced colours: the marks follow their line and a ring's fill is Canvas; print: the resting ink over a trace", async () => {
    const { page } = await figurePage();
    await draw(page, [{ key: "forms", spec: formsSpec }]);
    await page.emulateMedia({ forcedColors: "active" });
    await frames(page, 3);
    let l = (await readLines(page, "forms"))[1];
    assert.equal(l.fromEnd.stroke, l.stroke);
    assert.equal(l.toEnd.ringFill, await page.evaluate(() => { const d = document.createElement("div"); d.style.color = "Canvas"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }));
    await page.emulateMedia({ forcedColors: "none", media: "print" });
    await page.hover(`#fig-forms .${P}-node[data-node="a"]`);
    await frames(page, 3);
    const rest = await page.evaluate(() => getComputedStyle(document.querySelector("#fig-forms")).getPropertyValue("--basalt-diagram-edge").trim());
    l = (await readLines(page, "forms"))[0];
    const probe = await page.evaluate((c) => { const d = document.createElement("div"); d.style.color = c; document.querySelector("#fig-forms").append(d); const v = getComputedStyle(d).color; d.remove(); return v; }, rest);
    assert.equal(l.fromEnd.stroke, probe, "printed untraced, in the resting ink");
    await page.close();
  });
});

describe("development errors", () => {
  test("cardinality without references, a referenced end of many, and some keys stated and not all", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const warns = (tables) => core.buildModel(schema(tables)).warnings;
    const b = table("b", 2, 1, [col("id", { key: "PK" })]);
    assert.ok(warns([table("a", 1, 1, [{ name: "x", cardinality: { from: "one" } }]), b]).some((w) => /a\.x states a cardinality but references nothing/.test(w)));
    assert.ok(warns([table("a", 1, 1, [fk("x", "b.id", "one", "one-or-many")]), b]).some((w) => /references one row at most/.test(w)));
    assert.ok(warns([table("a", 1, 1, [fk("x", "b.id", "one"), fk("y", "b.id")]), b]).some((w) => /stated on 1 of 2 foreign keys.*a\.y has none/.test(w)));
    assert.ok(warns([table("a", 1, 1, [fk("x", "b.id", "many")]), b]).some((w) => /not one, zero-or-one, one-or-many or zero-or-many/.test(w)));
    // None of them in a figure that states every key.
    assert.deepEqual(core.buildModel(B.schema).warnings, []);
    // The referenced end defaults to one.
    assert.deepEqual(core.buildModel(schema([table("a", 1, 1, [fk("x", "b.id", "zero-or-many")]), b])).edges[0].card, { from: "zero-or-many", to: "one" });
  });
  test("production: an unstated line in a figure that states some draws as today, and the key shows both", async () => {
    const { page } = await figurePage();
    await draw(page, [{ key: "mixed", spec: schema([table("a", 1, 1, [fk("x", "b.id", "one"), fk("y", "b.k")]), table("b", 2, 1, [col("id", { key: "PK" }), col("k")])]) }]);
    const lines = await readLines(page, "mixed");
    assert.deepEqual(lines.map((l) => [l.tip, l.dot, !!l.fromEnd]), [[false, false, true], [true, true, false]]);
    const shown = await page.evaluate((P) => [...document.querySelectorAll(`#fig-mixed .${P}-entry`)].filter((e) => getComputedStyle(e).display !== "none").map((e) => e.textContent), P);
    assert.deepEqual(shown, ["PKPrimary key", "FKForeign key", "A foreign key", "Exactly one"]);
    await page.close();
  });
});
