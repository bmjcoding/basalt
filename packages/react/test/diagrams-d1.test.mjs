// Diagram batch D, wave 1 (DECISIONS 359): the six planning types, state, timeline and deployment, and the dependency and swimlane folds, in React and in
// the HTML skill, from one fixture (test/fixtures/diagrams-d1.json). The Planning decision's tests 1 to 11 and the Ops decision's list. In Chromium against
// the built package. Written while tests are paused (DECISIONS 359): not yet run. The implementation hasn't been reviewed. Margins are kept clear of a
// font's width.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagrams-d1.json"), "utf8"));
const KEYS = Object.keys(DATA).filter((k) => k !== "$comment");
const MATRIX = ["kanban", "journey", "blueprint", "storyMap"];
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import data from "./test/fixtures/diagrams-d1.json";
const C = { gantt: B.GanttDiagram, kanban: B.KanbanDiagram, journey: B.JourneyDiagram, "service-blueprint": B.ServiceBlueprintDiagram, "story-map": B.StoryMapDiagram,
  schedule: B.ScheduleDiagram, timeline: B.TimelineDiagram, state: B.StateDiagram, deployment: B.DeploymentDiagram, architecture: B.ArchitectureDiagram, "data-flow": B.DataFlowDiagram };
function Host() {
  return <div style={{ display: "grid", gap: 64, maxWidth: window.__width ?? 1104, margin: "0 auto" }}>{Object.entries(data).filter(([k]) => k !== "$comment").map(([key, d]) => { const { type, ...props } = d; const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;
const frames = (page, n = 6) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function reactPage({ width = 1104, theme = "dark", dir, js = true } = {}) {
  const { page, errors } = await fixturePage(browser, `window.__width = ${width};${HOST}`, { theme, standards: true, viewport: { width: width + 32, height: 900 }, javaScriptEnabled: js });
  if (dir) await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await page.addStyleTag({ content: `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box}` });
  await page.evaluate(() => document.fonts.ready);
  await frames(page);
  return { page, errors };
}
/** The skill's page: right to left is the page's own direction before script, as a right-to-left page is. */
async function skillPage({ width = 1104, theme = "dark", dir, js = true } = {}) {
  const body = `<title>Batch D</title><main style="max-width:${width}px;margin:0 auto;padding:16px;display:grid;gap:64px">${KEYS.map((k) => `<figure class="diagram" id="fig-${k}"><script type="application/json" data-diagram>${JSON.stringify(DATA[k]).replace(/</g, "\\u003c")}</script></figure>`).join("")}</main>`;
  let html = compose(body).html;
  if (dir) html = html.replace(/<html([^>]*)>/, `<html$1 dir="${dir}">`);
  const context = await browser.newContext({ viewport: { width: width + 32, height: 900 }, colorScheme: theme, javaScriptEnabled: js });
  const page = await context.newPage();
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto("https://basalt.test/");
  await page.evaluate(() => document.fonts.ready);
  await frames(page);
  return { page, context };
}
const ENGINES = [["React", reactPage, "basalt-diagram"], ["the skill", skillPage, "diagram"]];

/** Test 1: the figure's width is its scroll width, no text on text, nothing cut, nothing under 12px. */
const audit = (page, key, P) => page.evaluate(({ key, P }) => {
  const fig = document.querySelector(`#fig-${key}`);
  const words = [...fig.querySelectorAll(`.${P}-drawing *`)].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && !e.closest(`.${P}-ruler`));
  const boxes = words.map((e) => { const r = document.createRange(); r.selectNodeContents(e); return { e, b: r.getBoundingClientRect(), size: parseFloat(getComputedStyle(e).fontSize) }; }).filter((x) => x.b.width > 0);
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i].b, b = boxes[j].b; if (boxes[i].e.contains(boxes[j].e) || boxes[j].e.contains(boxes[i].e)) continue; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlaps++; }
  return { layout: fig.dataset.layout, form: fig.dataset.form, scroll: fig.scrollWidth - fig.clientWidth, overlaps, small: boxes.filter((x) => x.size < 12).length };
}, { key, P });

for (const [name, open, P] of ENGINES) {
  describe(`${name}: every type, both forms, both themes (Planning test 1)`, () => {
    for (const theme of ["dark", "light"]) for (const width of [1104, 358]) {
      test(`${theme} at ${width}: drawn at 1104 and stacked at 358, nothing scrolls, no word on a word, nothing under 12px`, async () => {
        const { page } = await open({ width, theme });
        for (const key of KEYS) {
          const a = await audit(page, key, P);
          assert.equal(a.layout, width === 1104 ? "drawn" : "stacked", key);
          assert.equal(a.scroll, 0, key);
          assert.equal(a.overlaps, 0, key);
          assert.equal(a.small, 0, key);
        }
      });
    }
    test("with scripting off every word is present and the list is open", async () => {
      const { page } = await open({ js: false });
      for (const key of KEYS) {
        const text = await page.locator(`#fig-${key}`).innerText();
        for (const word of [DATA[key].title]) assert.ok(text.includes(word), key);
      }
    });
  });

  describe(`${name}: the matrix fit (Planning tests 2 and 3)`, () => {
    test("at each matrix type's own least drawn width and 1px under it the form changes, and no head overflows its track", async () => {
      const { page } = await open({ width: 1104 });
      const at = async (key, w) => { await page.evaluate(({ key, w }) => { document.querySelector(`#fig-${key}`).style.width = `${w}px`; }, { key, w }); await frames(page); return (await audit(page, key, P)).layout; };
      for (const key of MATRIX) {
        // The least drawn width is read from the figure: the narrowest whole width it draws at, found by halving between 640 and 1104.
        let lo = 639, hi = 1104;
        assert.equal(await at(key, hi), "drawn", key);
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if ((await at(key, mid)) === "drawn") hi = mid; else lo = mid; }
        assert.equal(await at(key, hi), "drawn", `${key} at ${hi}`);
        assert.equal(await at(key, hi - 1), "stacked", `${key} at ${hi - 1}`);
        await at(key, hi);
        const over = await page.evaluate(({ key, P }) => [...document.querySelectorAll(`#fig-${key} :is(.${P}-kanban-head, .${P}-bp-head, .${P}-journey-head, .${P}-story-activity)`)].filter((h) => h.scrollWidth > h.clientWidth + 0.5).length, { key, P });
        assert.equal(over, 0, key);
      }
    });
    test("kanban: the four head rules share one y, a count is its cards plus more, and no count has a border", async () => {
      const { page } = await open({ width: 1104 });
      const got = await page.evaluate((P) => [...document.querySelectorAll(`#fig-kanban .${P}-kanban-head`)].map((h) => ({ y: Math.round(h.getBoundingClientRect().bottom), count: h.querySelector(`.${P}-kanban-count`).textContent, border: getComputedStyle(h.querySelector(`.${P}-kanban-count`)).borderTopStyle })), P);
      assert.equal(new Set(got.map((g) => g.y)).size, 1);
      assert.deepEqual(got.map((g) => g.count), ["2", "3, max 2 · Over limit", "1, max 3", "8"]);
      for (const g of got) assert.equal(g.border, "none");
    });
  });

  describe(`${name}: the gantt (Planning test 4)`, () => {
    test("a bar's width is its duration times the track over the domain, at three widths; no minimum width; no line for after", async () => {
      for (const width of [1104, 816, 700]) {
        const { page } = await open({ width });
        const got = await page.evaluate((P) => {
          const fig = document.querySelector("#fig-gantt"), scale = fig.querySelector(`.${P}-gantt-track > .${P}-gantt-scale`).getBoundingClientRect();
          return { L: scale.width, bars: [...fig.querySelectorAll(`.${P}-gantt-bar`)].map((b) => ({ w: b.getBoundingClientRect().width, min: getComputedStyle(b).minWidth })), lines: fig.querySelectorAll(`.${P}-edge`).length };
        }, P);
        // Nov 2 to Dec 3 is 32 days: Sandbox images is 8 of them.
        assert.ok(Math.abs(got.bars[0].w - (8 / 32) * got.L) <= 1, `${width}: ${got.bars[0].w}`);
        for (const b of got.bars) assert.ok(b.min === "0px" || b.min === "auto");
        assert.equal(got.lines, 0);
      }
    });
    test("the last milestone is whole, and a figure under the floor is stacked in words with no bar in its key", async () => {
      const { page } = await open({ width: 1104 });
      const whole = await page.evaluate((P) => { const f = document.querySelector("#fig-gantt"), d = f.querySelector(`.${P}-drawing`).getBoundingClientRect(), m = f.querySelector(`.${P}-gantt-mile`).getBoundingClientRect(); return m.right <= d.right + 0.5; }, P);
      assert.ok(whole);
    });
  });

  describe(`${name}: the journey, the blueprint and the story map (Planning tests 6 to 8)`, () => {
    test("the journey's line is one stroke colour through the columns' centres, and nothing answers a tap under 44px", async () => {
      const { page } = await open({ width: 1104 });
      const got = await page.evaluate((P) => { const f = document.querySelector("#fig-journey"); const line = f.querySelector(`.${P}-journey-line`); return { stroke: getComputedStyle(line).stroke, lines: f.querySelectorAll(`.${P}-journey-line`).length, small: [...f.querySelectorAll("a[data-node]")].filter((a) => a.getBoundingClientRect().height < 44).length }; }, P);
      assert.equal(got.lines, 1);
      assert.equal(got.small, 0);
    });
    test("the blueprint: no element but the two lines of interaction is dashed, and an empty cell is a stop", async () => {
      const { page } = await open({ width: 1104 });
      const got = await page.evaluate((P) => {
        const f = document.querySelector("#fig-blueprint");
        const dashed = [...f.querySelectorAll(`.${P}-drawing *`)].filter((e) => e.getClientRects().length && (getComputedStyle(e).borderTopStyle === "dashed" || (getComputedStyle(e).strokeDasharray ?? "none") !== "none")).map((e) => e.closest(`.${P}-bp-rule`)?.dataset.rule ?? e.className.baseVal ?? e.className);
        return { dashed: [...new Set(dashed)], empty: f.querySelectorAll(`.${P}-bp-cell[data-empty][tabindex]`).length };
      }, P);
      assert.deepEqual(got.dashed.sort(), ["interaction", "internal"]);
      assert.ok(got.empty > 0);
    });
    test("the story map: an empty cell keeps the next activity's cards in their column", async () => {
      const { page } = await open({ width: 1104 });
      const ok = await page.evaluate((P) => { const f = document.querySelector("#fig-storyMap"); const acts = [...f.querySelectorAll(`.${P}-story-activity`)].map((a) => a.getBoundingClientRect()); const card = f.querySelector(`[data-node="s6"]`).getBoundingClientRect(); return Math.abs(card.left - acts[3].left) < 1; }, P);
      assert.ok(ok);
    });
  });

  describe(`${name}: the schedule (Planning test 9)`, () => {
    test("both tied critical paths draw main, T2 to T5 draws plain, and the stack writes every edge once", async () => {
      const { page } = await open({ width: 1104 });
      const main = await page.evaluate((P) => [...document.querySelectorAll(`#fig-schedule .${P}-edge`)].filter((g) => g.querySelector(`.${P}-line[data-kind="main"]`)).length, P);
      // t1-t3, t3-t5, t3-t6, t5-t7, t6-t7: the two paths T1 T3 T5 T7 and T1 T3 T6 T7.
      assert.equal(main, 5);
      assert.ok((await page.locator("#fig-schedule").innerText()).includes("2 critical paths"));
      const { page: narrow } = await open({ width: 358 });
      const after = await narrow.evaluate((P) => [...document.querySelectorAll(`#fig-schedule .${P}-sched-after`)].map((a) => a.textContent), P);
      assert.deepEqual(after, ["Starts the schedule.", "After T1, which sets its start.", "After T1, which sets its start.", "After T1, which sets its start.", "After T2 and T3. T3 sets its start.", "After T3 and T4. T3 sets its start.", "After T5 and T6. Both set its start."]);
    });
  });

  describe(`${name}: Ops`, () => {
    test("a state's label breaks after its event, and guards on one event are numbered", async () => {
      const { page } = await open({ width: 1104 });
      const labels = await page.evaluate((P) => [...document.querySelectorAll(`#fig-state .${P}-label`)].map((l) => l.innerText), P);
      assert.ok(labels.some((l) => l === "1. tool.call\n[read-only]"));
      assert.ok(labels.some((l) => l === "2. tool.call\n[writes]"));
    });
    test("a deployment's environment leads its source line, and × 3 is Geist with tabular figures", async () => {
      const { page } = await open({ width: 1104 });
      const got = await page.evaluate((P) => { const f = document.querySelector("#fig-deployment"); const r = f.querySelector(`.${P}-replicas`); return { source: f.querySelector(`.${P}-source`).innerText, family: getComputedStyle(r).fontFamily, num: getComputedStyle(r).fontVariantNumeric }; }, P);
      assert.ok(got.source.startsWith("Production · us-east-1"));
      assert.ok(!/mono/i.test(got.family.split(",")[0]));
      assert.equal(got.num, "tabular-nums");
    });
    test("dependents are counted by the engine and the cycle is dashed in the written directions", async () => {
      const { page } = await open({ width: 1104 });
      const got = await page.evaluate((P) => ({ api: document.querySelector(`#fig-dependency [data-node="api"] .${P}-detail`).innerText, dashed: [...document.querySelectorAll(`#fig-dependency .${P}-edge`)].filter((g) => g.querySelector(`[data-kind="dashed"]`)).length }), P);
      assert.equal(got.api, "3 dependents");
      assert.equal(got.dashed, 2);
    });
    test("a decision in a data flow writes its step line inside the diamond", async () => {
      const { page } = await open({ width: 1104 });
      const text = await page.locator(`#fig-swimlane [data-node="n2"]`).innerText();
      assert.ok(text.startsWith("Step 2"));
    });
    test("a timeline: no stem through a card, a stem at its dot's x, and the faces of its words", async () => {
      const { page } = await open({ width: 1104 });
      const got = await page.evaluate((P) => {
        const f = document.querySelector("#fig-timeline"), o = f.querySelector(`.${P}-drawing`).getBoundingClientRect();
        const cards = [...f.querySelectorAll(`.${P}-node`)].map((c) => { const r = c.getBoundingClientRect(); return { l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top }; });
        const stems = [...f.querySelectorAll(`.${P}-tl-stem`)].map((s) => s.getAttribute("d").match(/M([\d.]+) ([\d.]+)V([\d.]+)/).slice(1).map(Number));
        const through = stems.filter(([x, y1, y2]) => cards.some((c) => x > c.l && x < c.r && Math.max(y1, y2) > c.t + 1 && Math.min(y1, y2) < c.b - 1)).length;
        const time = getComputedStyle(f.querySelector(`.${P}-tl-time`)), kind = getComputedStyle(f.querySelector(`.${P}-tl-line`));
        return { through, timeFace: time.fontFamily, timeNum: time.fontVariantNumeric, kindFace: kind.fontFamily };
      }, P);
      assert.equal(got.through, 0);
      assert.ok(!/mono/i.test(got.timeFace.split(",")[0]));
      assert.equal(got.timeNum, "tabular-nums");
      assert.ok(/mono/i.test(got.kindFace));
    });
    test("right to left a digit-led detail keeps its order", async () => {
      const { page } = await open({ width: 358, dir: "rtl" });
      const bdi = await page.evaluate((P) => document.querySelector(`#fig-timeline [data-node="e3"] .${P}-detail bdi`)?.textContent, P);
      assert.equal(bdi, "28% 504 on /runs");
    });
  });
}

describe("size: importing ArchitectureDiagram alone bundles no type module (Planning test 11)", () => {
  test("no planning, timeline or scale code is in an architecture's bundle", async () => {
    const out = await esbuild.build({ stdin: { contents: `import { ArchitectureDiagram } from "./dist/index.js"; console.log(ArchitectureDiagram);`, resolveDir: pkg, loader: "js" }, bundle: true, write: false, metafile: true, format: "esm", external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent" });
    const inputs = Object.keys(out.metafile.inputs);
    for (const mod of ["diagram-gantt", "diagram-matrix", "diagram-schedule", "diagram-timeline", "diagram-scale"]) assert.ok(!inputs.some((i) => i.includes(`/${mod}.js`)), mod);
  });
});

// The ruling on a state's start mark and the gap (state-gap/ruling.md): written, not run (DECISIONS 359).
const STATE = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagrams-d1-state.json"), "utf8"));
async function statePage(figs, { width = 1104, theme = "dark" } = {}) {
  const body = `<title>State</title><main style="max-width:${width}px;margin:0 auto;padding:16px;display:grid;gap:64px">${Object.entries(figs).map(([k, d]) => `<figure class="diagram" id="fig-${k}"><script type="application/json" data-diagram>${JSON.stringify(d).replace(/</g, "\\u003c")}</script></figure>`).join("")}</main>`;
  const context = await browser.newContext({ viewport: { width: width + 32, height: 900 }, colorScheme: theme });
  const page = await context.newPage();
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: compose(body).html }));
  await page.goto("https://basalt.test/");
  await page.evaluate(() => document.fonts.ready);
  await frames(page);
  return page;
}
/** A marked group's box: how far it is from the card above it, how far its top is above its first row, and every start mark's box against the lines. */
const startRead = (page, key) => page.evaluate((key) => {
  const f = document.querySelector(`#fig-${key}`), o = f.querySelector(".diagram-drawing").getBoundingClientRect();
  const rel = (r) => ({ l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top });
  const cards = [...f.querySelectorAll(".diagram-node")].map((n) => ({ id: n.dataset.node, ...rel(n.getBoundingClientRect()) }));
  const boxes = [...f.querySelectorAll(".diagram-gbox")].map((g) => ({ id: g.dataset.group, ...rel(g.getBoundingClientRect()) }));
  const marks = [...f.querySelectorAll(".diagram-start")].map((g) => rel(g.getBoundingClientRect()));
  const strokes = [...f.querySelectorAll(".diagram-edge .diagram-line")].map((p) => rel(p.getBoundingClientRect()));
  return { layout: f.dataset.layout, cards, boxes, marks, strokes };
}, key);

describe("the skill: a composite's start mark and its room", () => {
  for (const key of ["right", "rows", "run", "nested"]) {
    test(`${key}: a marked group's box is space-8 clear of the card above it and 72 above its first row; no mark lies on a line`, async () => {
      const page = await statePage({ [key]: STATE[key] });
      const got = await startRead(page, key);
      assert.equal(got.layout, "drawn");
      for (const b of got.boxes) {
        const inside = got.cards.filter((c) => c.l >= b.l && c.r <= b.r && c.t >= b.t && c.b <= b.b);
        const firstRow = Math.min(...inside.map((c) => c.t));
        const above = got.cards.filter((c) => c.b <= b.t + 1 && c.r > b.l && c.l < b.r);
        if (above.length) assert.ok(b.t - Math.max(...above.map((c) => c.b)) >= 32 - 0.5, `${key} ${b.id}: ${b.t - Math.max(...above.map((c) => c.b))} from the card above`);
        if (b.id === "active" && key !== "nested") assert.ok(Math.abs(firstRow - b.t - 72) <= 0.5, `${key}: ${firstRow - b.t}`);
      }
      // Only the mark's own stroke meets its state; no mark's box crosses another line's bounds by more than the stroke it ends on.
      for (const mk of got.marks) assert.ok(got.strokes.every((s) => !(mk.l < s.r - 1 && mk.r > s.l + 1 && mk.t < s.b - 1 && mk.b > s.t + 1)), `${key}: a mark on a line`);
    });
  }
  test("laid down (the fixture): the box is space-8 clear of Idle above it", async () => {
    const page = await statePage({ state: DATA.state });
    const got = await startRead(page, "state");
    const box = got.boxes.find((b) => b.id === "active"), idle = got.cards.find((c) => c.id === "idle");
    assert.ok(box.t - idle.b >= 32 - 0.5);
  });
  test("a side with no clear place stacks the figure, and the stacked form's parts do not move", async () => {
    // Every quarter of Thinking's top is met by a line: the mark has no place, so the figure is stacked.
    const crowded = { ...STATE.rows, nodes: STATE.rows.nodes.concat([{ id: "a", name: "A", col: 1, row: 1 }, { id: "b", name: "B", col: 3, row: 1 }]), edges: STATE.rows.edges.concat([{ from: "a", to: "thinking", event: "x", toSide: "top" }, { from: "b", to: "thinking", event: "y", toSide: "top" }]) };
    const page = await statePage({ crowded });
    assert.equal((await startRead(page, "crowded")).layout, "stacked");
    const at390 = await statePage({ rows: STATE.rows }, { width: 358 });
    assert.equal((await startRead(at390, "rows")).layout, "stacked");
  });
});

// The run-edge ruling (run-edge/ruling.md): a box's edge is a line. Written, not run (DECISIONS 359). Turn-backs alone are not in this ruling.
const EDGE = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-run-edge.json"), "utf8"));
const runsAndBoxes = (page, key) => page.evaluate((key) => {
  const f = document.querySelector(`#fig-${key}`), o = f.querySelector(".diagram-drawing").getBoundingClientRect();
  const rel = (r) => ({ l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top });
  const boxes = [...f.querySelectorAll(".diagram-gbox")].filter((g) => getComputedStyle(g).display !== "none").map((g) => ({ id: g.dataset.group, ...rel(g.getBoundingClientRect()) }));
  const cards = [...f.querySelectorAll(".diagram-node")].map((n) => ({ id: n.dataset.node, ...rel(n.getBoundingClientRect()) }));
  // Every straight run of every line, from its path's M/L/H/V commands (rounded corners are Q curves between runs).
  const runs = [...f.querySelectorAll(".diagram-edge .diagram-line")].flatMap((p) => {
    const pts = []; let x = 0, y = 0;
    for (const [, c, a, b] of p.getAttribute("d").matchAll(/([MLHVQ])\s*([\d.-]+)(?:\s+([\d.-]+))?/g)) { if (c === "H") x = +a; else if (c === "V") y = +a; else { x = +a; y = +b; } pts.push({ c, x, y }); }
    return pts.slice(1).map((q, k) => [pts[k], q]).filter(([a, b]) => b.c !== "Q" && (a.x === b.x || a.y === b.y));
  });
  return { layout: f.dataset.layout, boxes, cards, runs };
}, key);
describe("the skill: a run beside a box's edge", () => {
  test("no run of a drawn figure lies within 2px of a box's edge it runs beside", async () => {
    const figs = Object.fromEntries(Object.entries(EDGE).filter(([k]) => k !== "$comment" && !k.startsWith("turnBack")));
    const page = await statePage(figs);
    for (const key of Object.keys(figs)) {
      const got = await runsAndBoxes(page, key);
      if (got.layout !== "drawn") continue;
      for (const [a, b] of got.runs) for (const x of got.boxes) {
        const level = a.y === b.y, lo = Math.min(level ? a.x : a.y, level ? b.x : b.y), hi = Math.max(level ? a.x : a.y, level ? b.x : b.y);
        const edges = level ? [x.t, x.b] : [x.l, x.r], along = level ? [x.l, x.r] : [x.t, x.b], at = level ? a.y : a.x;
        if (hi - lo < 4 || hi <= along[0] || lo >= along[1]) continue;
        for (const e of edges) assert.ok(Math.abs(at - e) > 2, `${key}: a run at ${at} on ${x.id}'s edge at ${e}`);
      }
    }
  });
  test("a lone run above a box is 16 from the card and from the edge; the box's row is 64 under the row above, 48 otherwise", async () => {
    const page = await statePage({ above: EDGE.above });
    const got = await runsAndBoxes(page, "above");
    const box = got.boxes[0], queue = got.cards.find((c) => c.id === "queue"), api = got.cards.find((c) => c.id === "api");
    const run = got.runs.find(([a, b]) => a.y === b.y && a.y > queue.b && a.y < api.t);
    assert.ok(Math.abs(run[0].y - queue.b - 16) <= 1 && Math.abs(box.t - run[0].y - 16) <= 1);
    assert.ok(Math.abs(api.t - queue.b - 64) <= 0.5);
  });
  test("two boxes one above the other are 16 apart; two runs between them stack the figure", async () => {
    const page = await statePage({ between: EDGE.between, twoBetween: EDGE.twoBetween });
    const got = await runsAndBoxes(page, "between");
    const [edge, core] = got.boxes;
    assert.ok(Math.abs(core.t - edge.b - 16) <= 0.5);
    assert.equal((await runsAndBoxes(page, "twoBetween")).layout, "stacked");
  });
  test("the stacked form's parts do not move", async () => {
    const page = await statePage({ above: EDGE.above }, { width: 358 });
    assert.equal((await runsAndBoxes(page, "above")).layout, "stacked");
  });
});
