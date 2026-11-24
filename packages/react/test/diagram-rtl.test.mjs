// Right to left, the diagram gaps left after batch B (DECISIONS 306, 1.7: "every start side and end side choice in the engine is logical"). The stacked
// figure mirrors (its rail, trunk, branches, end lines and end gutter), and the drawn schema's turn-backs and gutter lanes are chosen from the end side,
// so CIMIP's automatic schema draws right to left what it draws left to right. A stacked group's label gives way to the lines at its top edge (Fable's
// ruling, diagrams-rtl/ruling.md), and an author's strings are isolated, so a closing quote stays at the end. In Chromium against the built package.
// Written while browser tests were paused (DECISIONS 330 and 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { inspectSource } from "./diagram-geometry.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, spec, dir }) => { const { type, ...props } = spec; const X = C[type]; return <div key={key} dir={dir}><X id={"fig-" + key} {...props} /></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function rtlPage({ theme = "dark", width = 1440, dev = false } = {}) {
  const { page, errors } = await fixturePage(browser, "", { theme, viewport: { width, height: 900 }, standards: true });
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
const draw = async (page, items) => { await page.evaluate((items) => window.__set(items), items); await page.waitForFunction((n) => document.querySelectorAll(".basalt-diagram[data-layout]").length >= n, items.length); await frames(page, 5); };
const inspect = (page, key) => page.evaluate(`${inspectSource()}("${P}", "#fig-${key}")`);

/** A figure's drawing as numbers: its width, each card's and label's box and each line's path, read from the page. */
const shape = (page, key) => page.evaluate(({ P, key }) => {
  const d = document.querySelector(`#fig-${key} .${P}-drawing`);
  const o = d.getBoundingClientRect();
  const box = (el) => { const r = el.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.right - o.left, r.bottom - o.top]; };
  const cs = getComputedStyle(d);
  return {
    w: o.width,
    pad: [parseFloat(cs.paddingLeft), parseFloat(cs.paddingRight)],
    nodes: [...d.querySelectorAll(`.${P}-node`)].map((el) => [el.dataset.node, ...box(el)]),
    labels: [...d.querySelectorAll(`.${P}-label`)].map((el) => [el.textContent, ...box(el)]),
    paths: [...d.querySelectorAll(`.${P}-edge`)].map((g) => [`${g.dataset.from}>${g.dataset.to}`, (g.querySelector(`.${P}-line`).getAttribute("d").match(/-?[\d.]+/g) ?? []).map(Number)]),
  };
}, { P, key });

/** The largest distance between a left-to-right drawing and a right-to-left one mirrored, over every card, label and line point. */
function mirrorError(ltr, rtl) {
  assert.equal(ltr.w, rtl.w);
  const W = rtl.w;
  const mirror = ([, l, t, r, b]) => [W - r, t, W - l, b];
  let most = 0;
  const where = [];
  const note = (what, d) => { if (d > most) most = d; if (d > 0.6) where.push(`${what} ${d.toFixed(2)}`); };
  assert.deepEqual(rtl.nodes.map((n) => n[0]), ltr.nodes.map((n) => n[0]));
  ltr.nodes.forEach((n, i) => note(`card ${n[0]}`, Math.max(...mirror(rtl.nodes[i]).map((v, j) => Math.abs(v - n[j + 1])))));
  assert.deepEqual(rtl.labels.map((l) => l[0]), ltr.labels.map((l) => l[0]));
  ltr.labels.forEach((l, i) => note(`label ${l[0]}`, Math.max(...mirror(rtl.labels[i]).map((v, j) => Math.abs(v - l[j + 1])))));
  ltr.paths.forEach(([name, a], i) => {
    const b = rtl.paths[i][1];
    assert.equal(b.length, a.length, `${name} has as many points right to left`);
    for (let j = 0; j < a.length; j += 2) note(`line ${name}`, Math.max(Math.abs(a[j] - (W - b[j])), Math.abs(a[j + 1] - b[j + 1])));
  });
  return { most, where };
}

describe("right to left, the stacked figure mirrors (1.7)", () => {
  for (const key of ["architecture", "autoArchitecture", "dataFlow"]) test(`${key} at 390: the right-to-left stack is the left-to-right one mirrored, to the half pixel`, async () => {
    const { page, errors } = await rtlPage({ width: 390 });
    await draw(page, [{ key: "ltr", spec: B[key], dir: "ltr" }, { key: "rtl", spec: B[key], dir: "rtl" }]);
    for (const k of ["ltr", "rtl"]) {
      assert.equal(await page.locator(`#fig-${k}`).getAttribute("data-layout"), "stacked", `${key} stacks at 390 (${k})`);
      assert.deepEqual((await inspect(page, k)).problems, [], `${key} (${k})`);
    }
    const a = await shape(page, "ltr"), b = await shape(page, "rtl");
    // The end gutter is on the end side: the right's padding left to right is the left's right to left.
    assert.deepEqual(b.pad, [a.pad[1], a.pad[0]], `${key}: the gutter is on the left right to left`);
    const { where } = mirrorError(a, b);
    assert.deepEqual(where, [], `${key}: right to left mirrors left to right`);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a branch is indented from the right and keeps its end lane on the left", async () => {
    const { page } = await rtlPage({ width: 390 });
    await draw(page, [{ key: "ltr", spec: B.architecture, dir: "ltr" }, { key: "rtl", spec: B.architecture, dir: "rtl" }]);
    const margins = (k) => page.evaluate(({ P, k }) => [...document.querySelectorAll(`#fig-${k} .${P}-node[data-branch]`)].map((el) => { const s = getComputedStyle(el); return [parseFloat(s.marginLeft), parseFloat(s.marginRight)]; }), { P, k });
    const a = await margins("ltr"), b = await margins("rtl");
    assert.ok(a.length > 0, "the architecture has branches");
    for (const [i, [l, r]] of a.entries()) {
      assert.ok(l > r, "left to right, a branch is indented from the left");
      assert.deepEqual(b[i], [r, l], "right to left, from the right");
    }
    await page.close();
  });

  test("the trunk and the rail run down the right, the end lines out of the left", async () => {
    const { page } = await rtlPage({ width: 390 });
    await draw(page, [{ key: "rtl", spec: B.architecture, dir: "rtl" }]);
    const s = await shape(page, "rtl");
    const card = new Map(s.nodes.map(([id, l, t, r, b]) => [id, { l, t, r, b }]));
    // A line from the service down to a branch leaves the service's bottom in its right half; ECS's line to the sandbox leaves ECS's left side.
    const svc = card.get("svc");
    for (const [name, pts] of s.paths) {
      if (name === "svc>aurora" || name === "svc>s3") assert.ok(pts[0] > (svc.l + svc.r) / 2, `${name} leaves the service's start (right) half`);
      if (name === "ecs>agent") assert.ok(Math.abs(pts[0] - card.get("ecs").l) < 1.5, `${name} leaves ECS's end (left) side`);
    }
    await page.close();
  });
});

describe("right to left, the drawn schema (DECISIONS 322, item 3 of 'Already decided, not built')", () => {
  test("CIMIP's automatic schema draws the same lanes and crossings right to left as left to right, with no tight gutter", async () => {
    const { page, warnings } = await rtlPage({ dev: true });
    await draw(page, [{ key: "ltr", spec: B.autoSchema, dir: "ltr" }]);
    const ltrWarnings = warnings.splice(0);
    await draw(page, [{ key: "rtl", spec: B.autoSchema, dir: "rtl" }]);
    const rtlWarnings = warnings.splice(0);
    assert.ok(!rtlWarnings.some((w) => /a gutter holds \d+ lanes side by side/.test(w)), rtlWarnings.join("\n"));
    const crossings = (list) => Number(list.join("\n").match(/(\d+) crossings? in the drawn layout/)?.[1] ?? 0);
    assert.equal(crossings(rtlWarnings), crossings(ltrWarnings), `${rtlWarnings.join("\n")}\n---\n${ltrWarnings.join("\n")}`);
    await draw(page, [{ key: "ltr", spec: B.autoSchema, dir: "ltr" }, { key: "rtl", spec: B.autoSchema, dir: "rtl" }]);
    assert.equal(await page.locator("#fig-rtl").getAttribute("data-layout"), "drawn");
    // The drawn layout snaps on the page's half pixels as left to right, so a mirrored point may be a pixel off; a lane chosen differently is 20 or more.
    const { most } = mirrorError(await shape(page, "ltr"), await shape(page, "rtl"));
    assert.ok(most <= 1.01, `right to left mirrors left to right to a pixel (${most})`);
    await page.close();
  });

  test("a schema of one column takes its turn-backs on the end side, the left, and keeps its room there", async () => {
    const table = (name, row, refs = []) => ({ name, col: 1, row, columns: [{ name: "id", key: "PK" }, ...refs.map((r) => ({ name: `${r}_id`, key: "FK", references: `${r}.id` }))] });
    const spec = { type: "schema", title: "One column", summary: "b references c and c references a.", legend: { plain: "A foreign key" }, tables: [table("a", 1), table("b", 2, ["c"]), table("c", 3, ["a"])] };
    const { page } = await rtlPage();
    await draw(page, [{ key: "ltr", spec, dir: "ltr" }, { key: "rtl", spec, dir: "rtl" }]);
    const a = await shape(page, "ltr"), b = await shape(page, "rtl");
    for (const [k, s] of [["ltr", a], ["rtl", b]]) {
      assert.equal(await page.locator(`#fig-${k}`).getAttribute("data-layout"), "drawn", k);
      const left = Math.min(...s.nodes.map((n) => n[1])), right = Math.max(...s.nodes.map((n) => n[3]));
      for (const [name, pts] of s.paths) {
        const xs = pts.filter((_, j) => j % 2 === 0);
        if (k === "ltr") assert.ok(Math.max(...xs) > right, `${name} turns back on the right left to right`);
        else assert.ok(Math.min(...xs) < left, `${name} turns back on the left right to left`);
      }
    }
    assert.deepEqual(b.pad, [a.pad[1], a.pad[0]], "the turn-backs' room is on the left right to left");
    await page.close();
  });
});

/** Each stacked group label's words, its plate, and every line's stroke that runs through the plate's band, in the drawing's coordinates. */
const groupLabels = (page, key) => page.evaluate(({ P, key }) => {
  const d = document.querySelector(`#fig-${key} .${P}-drawing`);
  const o = d.getBoundingClientRect();
  const R = (r) => ({ l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top });
  const lines = [...d.querySelectorAll(`.${P}-edge`)].map((g) => {
    const path = g.querySelector(`.${P}-line`);
    const n = (path.getAttribute("d").match(/-?[\d.]+/g) ?? []).map(Number);
    const pts = []; for (let j = 0; j < n.length; j += 2) pts.push({ x: n[j], y: n[j + 1] });
    return { name: `${g.dataset.from}>${g.dataset.to}`, pts, w: parseFloat(getComputedStyle(path).strokeWidth) };
  });
  return [...d.querySelectorAll(`.${P}-group > .${P}-glabel`)].map((el) => {
    const range = document.createRange(); range.selectNodeContents(el);
    const words = R(range.getBoundingClientRect()), plate = R(el.getBoundingClientRect()), group = R(el.parentElement.getBoundingClientRect());
    const through = [];
    for (const l of lines) for (let k = 1; k < l.pts.length; k++) {
      const a = l.pts[k - 1], b = l.pts[k];
      const s = { l: Math.min(a.x, b.x) - l.w / 2, r: Math.max(a.x, b.x) + l.w / 2, t: Math.min(a.y, b.y) - l.w / 2, b: Math.max(a.y, b.y) + l.w / 2 };
      if (s.t < plate.b && s.b > plate.t) through.push({ name: l.name, l: s.l, r: s.r });
    }
    return { text: el.textContent, words, plate, group, through, gx: el.style.getPropertyValue("--_gx") };
  });
}, { P, key });
/** The gap between a label's words and the nearest stroke through its band (Infinity with none). */
const nearest = (g, box = g.words) => Math.min(Infinity, ...g.through.map((c) => Math.max(c.l - box.r, box.l - c.r)));

describe("a stacked group's label gives way to the lines at its top edge (the diagrams-rtl ruling)", () => {
  for (const width of [320, 390]) for (const dir of ["ltr", "rtl"]) test(`${width} ${dir}: no line runs under either label; each keeps space-2-5 from every stroke through its band, on the start side`, async () => {
    const { page, warnings } = await rtlPage({ width, dev: true });
    await draw(page, [{ key: "arch", spec: B.architecture, dir }]);
    assert.equal(await page.locator("#fig-arch").getAttribute("data-layout"), "stacked");
    const labels = await groupLabels(page, "arch");
    assert.deepEqual(labels.map((g) => g.text), ["AWS · your account", "Data & logs"]);
    for (const g of labels) {
      assert.ok(nearest(g) >= 10 - 0.05, `${g.text}: its words are space-2-5 from every stroke (${nearest(g)}) ${JSON.stringify(g.through)}`);
      // On the start side of its group, and at least space-3 inside the group's inner end edge.
      const room = dir === "ltr" ? g.group.r - 1 - g.words.r : g.words.l - (g.group.l + 1);
      assert.ok(room >= 12 - 0.05, `${g.text}: space-3 inside the end edge (${room})`);
    }
    // "Data & logs" sits past the trunk and the rail that pass down its group's start side: it has slid, toward the end.
    const data = labels[1];
    assert.ok(parseFloat(data.gx) > 0, "the inner group's label slid");
    assert.ok(!warnings.some((w) => /no clear seat on its top edge/.test(w)), warnings.join("\n"));
    await page.close();
  });

  test("the stem into the group's first card moves only where it would run under the label: at 320 it stands space-2-5 past the plate, at 390 it keeps the middle", async () => {
    for (const dir of ["ltr", "rtl"]) {
      const at = {};
      for (const width of [320, 390]) {
        const { page } = await rtlPage({ width });
        await draw(page, [{ key: "arch", spec: B.architecture, dir }]);
        const s = await shape(page, "arch");
        const card = new Map(s.nodes.map(([id, l, t, r, b]) => [id, { l, t, r, b }]));
        const stem = s.paths.find(([name]) => name === "browser>alb")[1];
        const [aws] = await groupLabels(page, "arch");
        const lo = Math.max(card.get("browser").l, card.get("alb").l), hi = Math.min(card.get("browser").r, card.get("alb").r);
        at[width] = { x: stem[0], middle: (lo + hi) / 2, plate: aws.plate, words: aws.words, gx: aws.gx };
        await page.close();
      }
      // 390: 35 clear in the middle, so it does not move, and the label keeps its seat.
      assert.ok(Math.abs(at[390].x - at[390].middle) <= 1, `${dir} 390: the stem keeps its slot ${JSON.stringify(at[390])}`);
      assert.equal(at[390].gx, "", `${dir} 390: the label keeps its seat`);
      // 320: the stem's 2px stroke is space-2-5 past the plate, toward the end (16 from the words), and the label keeps its start seat.
      const past = dir === "ltr" ? at[320].x - 1 - at[320].plate.r : at[320].plate.l - (at[320].x + 1);
      assert.ok(past >= 10 - 0.5 && past <= 11.5, `${dir} 320: the stem stands space-2-5 past the plate (${past})`);
      assert.equal(at[320].gx, "", `${dir} 320: the label keeps its seat`);
    }
  });

  test("last resort: a label with no clear place keeps its start seat on its plate, and a development build warns", async () => {
    const spec = {
      type: "architecture", title: "A group label too long to seat", legend: { main: "Request" },
      // The stem from Client into Edge runs under the label's middle and cannot move past its end; the label cannot slide past the stem and still end
      // space-3 inside the group.
      nodes: [{ id: "a", name: "Client", col: 1, row: 1 }, { id: "b", name: "Edge", group: "g", col: 1, row: 2 }, { id: "c", name: "Service", group: "g", col: 1, row: 3 }],
      groups: [{ id: "g", label: "A group label long enough to cross its stem" }],
      edges: [{ from: "a", to: "b", kind: "main" }, { from: "b", to: "c", kind: "main" }],
    };
    for (const dir of ["ltr", "rtl"]) {
      const { page, warnings } = await rtlPage({ width: 390, dev: true });
      await draw(page, [{ key: "long", spec, dir }]);
      assert.equal(await page.locator("#fig-long").getAttribute("data-layout"), "stacked");
      const [g] = await groupLabels(page, "long");
      assert.equal(g.gx, "", `${dir}: the label keeps its start seat`);
      assert.ok(g.through.length > 0, `${dir}: a line still runs through its band, under its plate`);
      assert.ok(warnings.some((w) => /a stacked group's label has no clear seat on its top edge/.test(w)), `${dir}: ${warnings.join("\n")}`);
      await page.close();
    }
  });
});

describe("an author's strings are isolated (the diagrams-rtl ruling, the closing quote)", () => {
  test(`right to left, the source line 'docs/architecture.md, "The shape"' ends in its quote`, async () => {
    const { page } = await rtlPage({ width: 1440 });
    await draw(page, [{ key: "arch", spec: B.architecture, dir: "rtl" }]);
    const read = await page.evaluate((P) => {
      const p = document.querySelector(`#fig-arch .${P}-source`);
      const bdi = p.querySelector(":scope > bdi");
      const text = bdi?.firstChild;
      const rect = (from, to) => { const r = document.createRange(); r.setStart(text, from); r.setEnd(text, to); return r.getBoundingClientRect(); };
      const s = text.textContent;
      return { s, last: rect(s.length - 1, s.length), shape: rect(s.lastIndexOf("shape"), s.lastIndexOf("shape") + 5), first: rect(0, 1) };
    }, P);
    assert.equal(read.s, 'docs/architecture.md, "The shape"');
    // The words keep their own order inside the right-to-left figure: the quote is drawn after "shape", at the run's right, and "docs" starts it.
    assert.ok(read.last.left >= read.shape.right - 0.5, JSON.stringify(read));
    assert.ok(read.first.left < read.shape.left, JSON.stringify(read));
    // The title, a group's label, a card's kind and name are isolates too.
    const isolated = await page.evaluate((P) => [`.${P}-title`, `.${P}-gbox > .${P}-glabel`, `.${P}-group > .${P}-glabel`, `.${P}-kind`, `.${P}-node:not([data-link]) .${P}-name`].map((sel) => Boolean(document.querySelector(`#fig-arch ${sel}`)?.querySelector(":scope > bdi"))), P);
    assert.deepEqual(isolated, [true, true, true, true, true]);
    await page.close();
  });
});
