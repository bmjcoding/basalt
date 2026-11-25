// One column is at most 480 wide, drawn or stacked (diagrams-cimip ruling 1): a drawn layout of one column (architecture, flowchart, data flow, schema) is
// at most size-breakpoint-container wide on the start edge, or its track's least width where that is more; the viewer fits and scrolls the drawing's own
// box. React and the skill. In Chromium against the built package. Written while tests are paused (DECISIONS 359): not yet run. The ruling is the
// decider's alone (no draft, no check), and the implementation hasn't been reviewed. Margins are kept clear of a font's width.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const require = createRequire(import.meta.url);
const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-one-column.json"), "utf8"));
const KINDS = ["architecture", "flowchart", "dataFlow", "schema"];
const CAP = 480;
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import data from "./test/fixtures/diagram-one-column.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, schema: B.SchemaDiagram };
function Host() {
  return <div style={{ display: "grid", gap: 64, maxWidth: window.__width ?? 1104, margin: "0 auto" }}>{Object.entries(data).filter(([k]) => k !== "$comment").map(([key, d]) => { const { type, ...props } = d; const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function reactPage({ width = 1104, viewport = 1440, height = 900, dir, theme = "dark", touch = false } = {}) {
  const { page, errors } = await fixturePage(browser, `window.__width = ${width};${HOST}`, { theme, standards: true, viewport: { width: viewport, height }, hasTouch: touch, isMobile: touch });
  if (touch) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  if (dir) await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await page.addStyleTag({ content: `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box}` });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 6);
  return { page, errors };
}
async function skillPage({ width = 1104, viewport = 1440, dir } = {}) {
  const body = `<title>One column</title><main style="max-width:${width}px;margin:0 auto;padding:16px;display:grid;gap:64px">${Object.entries(DATA).filter(([k]) => k !== "$comment").map(([k, d]) => `<figure class="diagram" id="fig-${k}"><script type="application/json" data-diagram>${JSON.stringify(d)}</script></figure>`).join("")}</main>`;
  const context = await browser.newContext({ viewport: { width: viewport, height: 900 } });
  const page = await context.newPage();
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: compose(body).html }));
  await page.goto("https://basalt.test/");
  if (dir) await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 6);
  return { page, context };
}

/** The figure's layout, its drawing's box against the figure's, and anything outside the drawing. */
const read = (page, key, P) => page.evaluate(({ key, P }) => {
  const fig = document.querySelector(`#fig-${key}`), dr = fig.querySelector(`:scope > .${P}-drawing`);
  const F = fig.getBoundingClientRect(), D = dr.getBoundingClientRect();
  const outside = [];
  for (const el of dr.querySelectorAll(`.${P}-node, .${P}-label, svg path, svg line, svg polyline`)) {
    const b = el.getBoundingClientRect();
    if (!b.width && !b.height) continue;
    if (b.left < D.left - 1 || b.right > D.right + 1) outside.push(`${el.tagName} ${el.textContent?.slice(0, 24) ?? ""} ${Math.round(b.left)} to ${Math.round(b.right)}`);
  }
  return { layout: fig.dataset.layout, cols: fig.dataset.cols, fig: [F.left, F.right], drawing: [D.left, D.right, D.width], outside };
}, { key, P });

describe("React: a one-column drawn layout is at most 480 on the start edge", () => {
  for (const width of [1104, 640]) for (const dir of ["ltr", "rtl"]) {
    test(`at a ${width}px figure, ${dir}: each of the four kinds is drawn, 480 wide, on the start edge, nothing outside the drawing`, async () => {
      const { page, errors } = await reactPage({ width, viewport: width + 32, dir });
      for (const key of KINDS) {
        const got = await read(page, key, "basalt-diagram");
        assert.equal(got.layout, "drawn", key);
        assert.equal(got.cols, "1", key);
        assert.ok(Math.abs(got.drawing[2] - CAP) <= 0.5, `${key}: ${got.drawing[2]} wide`);
        if (dir === "rtl") assert.ok(Math.abs(got.drawing[1] - got.fig[1]) <= 0.5, `${key} sits on the right edge`);
        else assert.ok(Math.abs(got.drawing[0] - got.fig[0]) <= 0.5, `${key} sits on the left edge`);
        assert.deepEqual(got.outside, [], key);
      }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
  test("a schema's lines end on their rows", async () => {
    const { page } = await reactPage();
    const ends = await page.evaluate(() => {
      const fig = document.querySelector("#fig-schema");
      const rows = [...fig.querySelectorAll(".basalt-diagram-row")].map((r) => r.getBoundingClientRect());
      const lines = [...fig.querySelectorAll(".basalt-diagram-ink path.basalt-diagram-line")];
      const at = (p, len) => { const m = p.getScreenCTM(); const pt = p.getPointAtLength(len); return { x: m.a * pt.x + m.e, y: m.d * pt.y + m.f }; };
      const onRow = (q) => rows.some((r) => q.y >= r.top - 1 && q.y <= r.bottom + 1);
      return lines.map((p) => { const len = p.getTotalLength(); return onRow(at(p, 0)) && onRow(at(p, len)); });
    });
    assert.ok(ends.length > 0);
    assert.ok(ends.every(Boolean), JSON.stringify(ends));
    await page.close();
  });
  test("an unbreakable word wider than 480 keeps the drawn layout, its column at its least width", async () => {
    const { page } = await reactPage();
    const got = await read(page, "wide", "basalt-diagram");
    assert.equal(got.layout, "drawn");
    assert.ok(got.drawing[2] > CAP + 8, `${got.drawing[2]} wide`);
    assert.ok(got.drawing[2] < got.fig[1] - got.fig[0] - 8, "and narrower than the figure");
    assert.deepEqual(got.outside, []);
    await page.close();
  });
  test("no shift between the server's HTML and script: the drawing is 480 before script and after", async () => {
    const React = require("react");
    const { renderToString } = require("react-dom/server");
    const B = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const { type: _type, ...props } = DATA.architecture;
    const html = renderToString(React.createElement(B.ArchitectureDiagram, props));
    const context = await browser.newContext({ viewport: { width: 1136, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
    await page.setContent(`<!doctype html><html data-theme="dark"><head><style>${css}${FONTS} body{margin:0;padding:16px}</style></head><body><div style="max-width:1104px;margin:0 auto">${html}</div></body></html>`);
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    const before = await page.evaluate(() => document.querySelector(".basalt-diagram-drawing").getBoundingClientRect().width);
    await context.close();
    const { page: live } = await reactPage();
    const after = (await read(live, "architecture", "basalt-diagram")).drawing[2];
    assert.ok(Math.abs(before - CAP) <= 0.5, `before script: ${before}`);
    assert.ok(Math.abs(after - before) <= 0.5, `after script: ${after}`);
    await live.close();
  });
});

describe("React: the viewer fits and scrolls the drawing's own box", () => {
  for (const [viewport, height, touch] of [[1440, 900, false], [390, 844, true]]) {
    test(`at ${viewport}: Fit is the column's, and there is no sideways scroll at Fit`, async () => {
      const { page } = await reactPage({ viewport, height, touch, width: viewport - 32 });
      const button = page.locator("#fig-architecture .basalt-diagram-expand");
      await button.scrollIntoViewIfNeeded();
      if (touch) await button.tap(); else await button.click();
      await page.waitForSelector("dialog.basalt-diagram-viewer[open] .basalt-diagram[data-layout]");
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      await frames(page, 4);
      const got = await page.evaluate(() => {
        const d = document.querySelector("dialog.basalt-diagram-viewer[open]"), stage = d.querySelector(".basalt-diagram-stage"), fig = d.querySelector(".basalt-diagram"), dr = fig.querySelector(".basalt-diagram-drawing");
        const pad = Number.parseFloat(getComputedStyle(d.querySelector(".basalt-diagram-sizer")).paddingTop) || 0;
        return { level: Number.parseInt(d.querySelector(".basalt-diagram-level > span").textContent, 10), drawing: dr.offsetWidth, figure: fig.offsetWidth, room: [stage.clientWidth - 2 * pad, stage.clientHeight - 2 * pad], height: fig.offsetHeight, sideways: stage.scrollWidth - stage.clientWidth };
      });
      assert.ok(got.drawing < got.figure, "the column is narrower than the width it was laid out in");
      const fit = Math.min(200, Math.floor(Math.min(got.room[0] / got.drawing, got.room[1] / got.height) * 100 + 1e-6));
      assert.equal(got.level, fit, JSON.stringify(got));
      assert.ok(got.sideways <= 0, `no sideways scroll at Fit (${got.sideways})`);
      await page.close();
    });
  }
});

describe("the skill: the same cap", () => {
  for (const width of [1104, 640]) for (const dir of ["ltr", "rtl"]) {
    test(`at a ${width}px figure, ${dir}: each of the four kinds is drawn, 480 wide, on the start edge`, async () => {
      const { page, context } = await skillPage({ width: width + 32, viewport: width + 64, dir });
      for (const key of KINDS) {
        const got = await read(page, key, "diagram");
        assert.equal(got.layout, "drawn", key);
        assert.ok(Math.abs(got.drawing[2] - CAP) <= 0.5, `${key}: ${got.drawing[2]} wide`);
        if (dir === "rtl") assert.ok(Math.abs(got.drawing[1] - got.fig[1]) <= 0.5, key);
        else assert.ok(Math.abs(got.drawing[0] - got.fig[0]) <= 0.5, key);
        assert.deepEqual(got.outside, [], key);
      }
      await context.close();
    });
  }
});
