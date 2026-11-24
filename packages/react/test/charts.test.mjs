// Charts (council item 101, finish-nov10 batch 4): a series over time as lines and bars, the legend that is the readout, the plan, missing
// data, the keyboard, touch, the table, motion and forced colours, plus the layout tokens the chart's batch carries. Driven in Chromium
// against the built package with the real stylesheet. The data is synthetic (test/fixtures/chart-data.ts).
//
// Behaviour tests load no web font by default, so text widths differ on CI's Linux runner: this file loads Geist from the built package,
// as the figures tests do, and keeps its measured margins wide.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { fixturePage as plainFixturePage, launch, pkg } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;

// The page: a host that renders from window.__cfg, so a test changes the data and asks for another render.
const HOST = `
import { sleepData, trainingData, hm, hmSpoken, min, minSpoken } from "./test/fixtures/chart-data.ts";
window.D = {
  sleep: sleepData(28), sleepLate: sleepData(28, { late: true }), sleep90: sleepData(90), sleep7: sleepData(7), sleep3: sleepData(28, { third: true }),
  train: trainingData(28), trainLate: trainingData(28, { late: true }), train7: trainingData(7), train90: trainingData(90),
};
function Sleep({ data, ...rest }) {
  return <B.TimeChart title="Sleep" source="06:12 · Ring and watch" kind="line" days={data.days} series={data.series} plan={data.plan} format={hm} spoken={hmSpoken} now={Date.UTC(2026, 10, 10, 12)}
    step={60} formatTick={(v) => String(v / 60)} unit="h" summary="Ring averaged 7 h 20 m over 28 nights. Watch not observed 26 to 28 October, not worn, travel." {...rest} />;
}
function Train({ data, ...rest }) {
  return <B.TimeChart title="Training" source="Watch" kind="bar" days={data.days} series={data.series} plan={data.plan} partial={data.partial} format={min} spoken={minSpoken} now={Date.UTC(2026, 10, 10, 12)}
    unit="min" summary="Training averaged 54 min a day." {...rest} />;
}
window.__cfg = { width: 900, chart: "sleep", data: "sleep", extra: {}, level: 0 };
function Tree() {
  const [, bump] = React.useState(0);
  window.__bump = () => bump((n) => n + 1);
  const c = window.__cfg;
  const data = window.D[c.data];
  const Chart = c.chart === "sleep" ? Sleep : Train;
  const inner = c.chart === "stack"
    ? <B.ChartGroup><Sleep data={window.D.sleep} /><Train data={window.D.train} /></B.ChartGroup>
    : <Chart data={data} {...c.extra} />;
  return <div id="host" style={{ width: c.width, margin: "0 auto" }}>{c.level ? <B.Card><B.CardContent>{inner}</B.CardContent></B.Card> : inner}</div>;
}
createRoot(document.getElementById("root")).render(<Tree />);`;

async function chartPage(options = {}) {
  const { cfg = {}, theme = "dark", viewport = { width: 1440, height: 1000 }, clock = false, hasTouch = false, reducedMotion, forcedColors } = options;
  const { page, errors } = await plainFixturePage(browser, HOST, { theme, viewport, clock, hasTouch, reducedMotion, forcedColors });
  if (clock) clocked.add(page);
  await page.addStyleTag({ content: `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box}` });
  await page.evaluate(() => Promise.all([document.fonts.load('400 12px Geist'), document.fonts.load('500 12px Geist'), document.fonts.load('600 16px Geist')]).then(() => document.fonts.ready));
  if (Object.keys(cfg).length) await configure(page, cfg);
  else await frames(page);
  return { page, errors };
}
const clocked = new WeakSet();
// Frames pass on the page's own clock; a page on Playwright's fake clock only moves when the test runs it.
const frames = (page, n = 2) => (clocked.has(page) ? page.clock.runFor(16 * n) : page.evaluate(async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); }, n));
async function configure(page, cfg) {
  await page.evaluate((cfg) => { Object.assign(window.__cfg, cfg); window.__bump(); }, cfg);
  await frames(page, 3);
}
/** Change the data the way an app does: a copy, never in place, then render again. */
const edit = (page, key, js) => page.evaluate(({ key, js }) => { const d = structuredClone(window.D[key]); new Function("d", js)(d); window.D[key] = d; window.__bump(); }, { key, js });
/** The text of SVG <text> elements (innerText is HTML-only). */
const texts = (locator) => locator.evaluateAll((els) => els.map((e) => e.textContent));
const svg = (page, n = 0) => page.locator("svg.basalt-chart-svg").nth(n);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const resolve = (page, value, prop = "color") => page.evaluate(({ value, prop }) => { const probe = document.createElement("i"); probe.style[prop] = value; document.body.append(probe); const c = getComputedStyle(probe)[prop]; probe.remove(); return c; }, { value, prop });
const token = (page, name) => resolve(page, `var(--basalt-${name})`);
const tokenPx = (page, name) => page.evaluate((name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--basalt-${name}`)), name);
const dateText = (page, n = 0) => page.locator(".basalt-chart-date > span:not(.basalt-chart-reserve)").nth(n).innerText();
const valueTexts = (page, n = 0) => page.locator(".basalt-chart").nth(n).locator(".basalt-chart-value > span:not(.basalt-chart-reserve)").allInnerTexts();
const dayBoxes = (page, n = 0) => page.locator(".basalt-chart").nth(n).locator(".basalt-chart-day").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
const attrs = (locator, ...names) => locator.evaluateAll((els, names) => els.map((e) => Object.fromEntries(names.map((n) => [n, e.getAttribute(n)]))), names);

async function audit(page) {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run(
    { exclude: [["[data-base-ui-focus-guard]"]] },
    { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
  ));
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Text, and the chart drawn at its own width

describe("Chart text and width", () => {
  for (const [label, width, viewport] of [["1440", 1200, { width: 1440, height: 1000 }], ["390", 358, { width: 390, height: 900 }]]) {
    test(`no chart text is under 12px at ${label}, and the chart's smallest text is 12/16`, async () => {
      const { page } = await chartPage({ cfg: { width, chart: "stack" }, viewport });
      const sizes = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll(".basalt-chart *")) {
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own) continue;
          const s = getComputedStyle(el);
          out.push({ tag: el.tagName, cls: el.getAttribute("class"), size: parseFloat(s.fontSize), line: parseFloat(s.lineHeight) });
        }
        return out;
      });
      assert.ok(sizes.length > 50, `measured ${sizes.length} text elements`);
      const under = sizes.filter((s) => s.size < 12);
      assert.deepEqual(under, [], "text under 12px");
      for (const s of sizes.filter((s) => /axis|lane|direct|reserve|value|name/.test(s.cls ?? ""))) assert.equal(s.size, 12, `${s.cls} is ${s.size}px`);
      await page.close();
    });
  }

  test("the chart redraws at its measured width and never scales through a viewBox", async () => {
    const { page } = await chartPage({ cfg: { width: 900 } });
    const read = () => page.evaluate(() => {
      const s = document.querySelector("svg.basalt-chart-svg");
      const plot = document.querySelector(".basalt-chart-plot");
      const text = s.querySelector("text.basalt-chart-axis");
      return { width: +s.getAttribute("width"), viewBox: s.getAttribute("viewBox"), box: s.getBoundingClientRect().width, plot: plot.clientWidth, size: parseFloat(getComputedStyle(text).fontSize), glyph: text.getBoundingClientRect().height };
    });
    const wide = await read();
    assert.equal(wide.width, wide.plot);
    assert.equal(wide.viewBox, `0 0 ${wide.width} ${wide.viewBox.split(" ")[3]}`);
    assert.equal(wide.box, wide.width, "the svg is drawn at its own size, not scaled");
    await configure(page, { width: 420 });
    const narrow = await read();
    assert.equal(narrow.width, narrow.plot);
    assert.ok(narrow.width < wide.width - 400);
    assert.equal(narrow.box, narrow.width);
    assert.equal(narrow.size, 12);
    assert.equal(narrow.glyph, wide.glyph, "a label is the same size at both widths: the chart redraws rather than scales");
    await page.close();
  });

  test("the axis, the legend and the source use tabular numerals, and axis labels are tertiary ink", async () => {
    const { page } = await chartPage();
    const axis = page.locator("text.basalt-chart-axis").first();
    assert.equal(await axis.evaluate((el) => getComputedStyle(el).fontVariantNumeric), "tabular-nums");
    assert.equal(await axis.evaluate((el) => getComputedStyle(el).fill), await token(page, "chart-axis"));
    assert.equal(await token(page, "chart-axis"), await token(page, "text-tertiary"));
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Axes: the scale, gridlines, the baseline, the unit, the gutter

describe("Chart axes", () => {
  test("a line's scale needn't start at zero, and its baseline is drawn only at zero", async () => {
    const { page } = await chartPage();
    assert.equal(await page.locator(".basalt-chart-baseline").count(), 0, "a scale from 5 h has no zero line");
    const labels = await texts(page.locator("svg.basalt-chart-svg text.basalt-chart-axis"));
    assert.ok(!labels.some((l) => /^0\b/.test(l)), `the sleep scale doesn't reach zero: ${labels}`);
    await configure(page, { extra: { fromZero: true } });
    assert.equal(await page.locator(".basalt-chart-baseline").count(), 1);
    const line = await attrs(page.locator(".basalt-chart-baseline"), "y1", "y2", "x1", "x2");
    assert.equal(line[0].y1, line[0].y2);
    const zero = await page.locator("svg.basalt-chart-svg text.basalt-chart-axis", { hasText: /^0$/ }).evaluate((el) => +el.getAttribute("y"));
    assert.ok(Math.abs(+line[0].y1 - zero) <= 0.5, `the baseline (${line[0].y1}) is at the 0 label (${zero})`);
    assert.equal(await page.locator(".basalt-chart-baseline").evaluate((el) => getComputedStyle(el).strokeWidth), "1px");
    assert.equal(await page.locator(".basalt-chart-baseline").evaluate((el) => getComputedStyle(el).stroke), await token(page, "chart-baseline"));
    await page.close();
  });

  test("bars always start at zero: the baseline is at the bottom and every bar stands on it", async () => {
    const { page } = await chartPage({ cfg: { chart: "train", data: "train" } });
    assert.equal(await page.locator(".basalt-chart-baseline").count(), 1);
    const baseline = +(await attrs(page.locator(".basalt-chart-baseline"), "y1"))[0].y1;
    const bars = await attrs(page.locator("svg.basalt-chart-svg rect.basalt-chart-bar"), "y", "height", "data-so-far");
    assert.ok(bars.length > 15);
    for (const bar of bars) if (bar["data-so-far"] === null) assert.ok(Math.abs(+bar.y + +bar.height - baseline) <= 0.5, `a bar ends at ${+bar.y + +bar.height}, the baseline is ${baseline}`);
    const first = await page.locator("svg.basalt-chart-svg text.basalt-chart-axis").evaluateAll((els) => els.map((e) => ({ y: +e.getAttribute("y"), text: e.textContent })));
    assert.ok(first.some((l) => l.text === "0"), "the scale has a zero tick");
    await page.close();
  });

  test("3 to 6 horizontal gridlines on round steps, 1px, in the divider ink, decorative and out of the accessibility tree", async () => {
    const { page } = await chartPage({ cfg: { chart: "stack" } });
    for (const [n, kind] of [[0, "line"], [1, "bar"]]) {
      const root = page.locator(".basalt-chart").nth(n);
      const lines = await attrs(root.locator("svg.basalt-chart-svg line.basalt-chart-grid, svg.basalt-chart-svg line.basalt-chart-baseline"), "x1", "x2", "y1", "y2");
      assert.ok(lines.length >= 3 && lines.length <= 6, `${kind}: ${lines.length} gridlines`);
      for (const l of lines) { assert.equal(l.y1, l.y2, `${kind}: a gridline is horizontal`); assert.notEqual(l.x1, l.x2); }
      const grid = root.locator("line.basalt-chart-grid").first();
      assert.equal(await grid.evaluate((el) => getComputedStyle(el).strokeWidth), "1px");
      assert.equal(await grid.evaluate((el) => getComputedStyle(el).stroke), await token(page, "chart-grid"));
      assert.equal(await root.locator("svg.basalt-chart-svg").getAttribute("aria-hidden"), "true");
      assert.equal(await root.locator("line.basalt-chart-grid[x1]").evaluateAll((els) => els.filter((e) => e.getAttribute("x1") === e.getAttribute("x2")).length), 0, `${kind}: no vertical gridline`);
    }
    // round steps: the tick labels differ by one constant
    const ticks = (await texts(page.locator(".basalt-chart").nth(1).locator("svg.basalt-chart-svg text.basalt-chart-axis"))).map((t) => parseFloat(t)).filter((v) => Number.isFinite(v)).slice(0, 6);
    assert.ok(new Set(ticks.slice(1).map((v, i) => v - (ticks[i] ?? 0))).size <= 2, `the ticks ${ticks} are on one round step`);
    await page.close();
  });

  test("gridlines drop in forced colours, and the plan's GrayText is never mistaken for one", async () => {
    const { page } = await chartPage({ forcedColors: "active" });
    assert.equal(await page.locator("line.basalt-chart-grid").first().evaluate((el) => getComputedStyle(el).stroke), "none");
    await page.close();
  });

  test("the unit is written once, on the top tick; there are no x tick marks; the gutter is the widest label plus space-2", async () => {
    const { page } = await chartPage({ cfg: { chart: "train", data: "train" } });
    const labels = await page.locator("svg.basalt-chart-svg text.basalt-chart-axis").evaluateAll((els) => els.map((e) => ({ text: e.textContent, anchor: e.getAttribute("text-anchor"), x: +e.getAttribute("x"), right: e.getBBox().x + e.getBBox().width, left: e.getBBox().x })));
    const withUnit = labels.filter((l) => /min/.test(l.text));
    assert.equal(withUnit.length, 1, `the unit once: ${labels.map((l) => l.text)}`);
    const ticks = labels.filter((l) => l.anchor === "end");
    const top = ticks.reduce((a, b) => (parseFloat(a.text) > parseFloat(b.text) ? a : b));
    assert.match(top.text, /min$/);
    const gutter = await page.evaluate(() => +document.querySelector(".basalt-chart-day").style.left.replace("px", ""));
    const space2 = await tokenPx(page, "space-2");
    assert.ok(Math.abs(Math.max(...ticks.map((l) => l.right)) + space2 - gutter) <= 0.01, `the gutter ${gutter} is the labels' right edge plus ${space2}`);
    assert.ok(Math.min(...ticks.map((l) => l.left)) >= 0 && Math.min(...ticks.map((l) => l.left)) <= 1, "the widest label starts at the left edge of the gutter");
    // x tick marks: no short vertical lines at all
    assert.equal(await page.locator("svg.basalt-chart-svg > line").evaluateAll((els) => els.filter((e) => e.getAttribute("x1") === e.getAttribute("x2")).length), 0);
    await page.close();
  });

  test("charts stacked in one figure share a gutter, so their plots start and end together", async () => {
    const { page } = await chartPage({ cfg: { chart: "stack", width: 900 } });
    const days0 = await dayBoxes(page, 0);
    const days1 = await dayBoxes(page, 1);
    assert.ok(Math.abs(days0[0].x - days1[0].x) < 0.01, `the plots start at ${days0[0].x} and ${days1[0].x}`);
    const end = (d) => d[d.length - 1].x + d[d.length - 1].width;
    assert.ok(Math.abs(end(days0) - end(days1)) < 0.01, "and end at one x");
    await page.close();
  });

  test("x labels are at least 56px apart at 7, 28 and 90 days, at 1440 and at 390", async () => {
    for (const [data, width, viewport] of [["sleep7", 1200, { width: 1440, height: 900 }], ["sleep", 1200, { width: 1440, height: 900 }], ["sleep90", 1200, { width: 1440, height: 900 }], ["sleep", 358, { width: 390, height: 900 }], ["sleep90", 358, { width: 390, height: 900 }]]) {
      const { page } = await chartPage({ cfg: { width, data }, viewport });
      const xs = await page.locator("svg.basalt-chart-svg text.basalt-chart-axis:not([text-anchor=end])").evaluateAll((els) => els.map((e) => { const b = e.getBBox(); return [b.x, b.x + b.width]; }));
      assert.ok(xs.length >= 3, `${data}@${width}: ${xs.length} date labels`);
      const centres = xs.map(([a, b]) => (a + b) / 2).sort((a, b) => a - b);
      for (let i = 1; i < centres.length; i++) assert.ok(centres[i] - centres[i - 1] >= 56 - 0.5, `${data}@${width}: labels ${centres[i - 1]} and ${centres[i]} are under 56px apart`);
      await page.close();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Marks

describe("Chart marks", () => {
  test("a line is 2px with round joins and caps, joined straight, with no area fill", async () => {
    const { page } = await chartPage();
    const line = page.locator('.basalt-chart-series[data-series="ring"] path.basalt-chart-line');
    const s = await line.evaluate((el) => { const c = getComputedStyle(el); return { width: c.strokeWidth, join: c.strokeLinejoin, cap: c.strokeLinecap, fill: c.fill, stroke: c.stroke }; });
    assert.deepEqual({ width: s.width, join: s.join, cap: s.cap, fill: s.fill }, { width: "2px", join: "round", cap: "round", fill: "none" });
    assert.equal(s.stroke, await token(page, "chart-observed"));
    const d = await line.getAttribute("d");
    assert.ok(!/[CQSAT]/.test(d), "joined straight, not curved");
    assert.equal(await page.locator("path.basalt-chart-line").evaluateAll((els) => els.filter((e) => getComputedStyle(e).fill !== "none").length), 0);
    await page.close();
  });

  test("markers are 8px, and a disc, a square and a diamond have equal area, each ringed 2px in the panel's own colour", async () => {
    const { page } = await chartPage({ cfg: { data: "sleep3", chart: "sleep", width: 900 } });
    const areas = await page.evaluate(() => {
      const out = {};
      for (const shape of ["disc", "square", "diamond"]) {
        const mark = document.querySelector(`.basalt-chart-svg [data-shape="${shape}"].basalt-chart-mark`);
        const ring = document.querySelector(`.basalt-chart-svg [data-shape="${shape}"].basalt-chart-ring`);
        const area = (el) => {
          if (el.tagName === "circle") return Math.PI * el.r.baseVal.value ** 2;
          if (el.tagName === "rect") return el.width.baseVal.value * el.height.baseVal.value;
          const pts = el.getAttribute("d").match(/-?[\d.]+/g).map(Number);
          return Math.abs((pts[2] - pts[6]) * (pts[5] - pts[1])) / 2;
        };
        const edge = (el) => (el.tagName === "circle" ? el.r.baseVal.value : el.tagName === "rect" ? el.width.baseVal.value / 2 : (() => { const p = el.getAttribute("d").match(/-?[\d.]+/g).map(Number); return (p[2] - p[6]) / 2; })());
        out[shape] = { area: area(mark), ring: area(ring), edge: edge(mark), ringEdge: edge(ring), diameter: mark.tagName === "circle" ? mark.r.baseVal.value * 2 : null, fill: getComputedStyle(ring).fill };
      }
      return out;
    });
    assert.equal(areas.disc.diameter, 8);
    for (const shape of ["square", "diamond"]) assert.ok(Math.abs(areas[shape].area - areas.disc.area) / areas.disc.area < 0.005, `${shape} (${areas[shape].area}) has the disc's area (${areas.disc.area})`);
    assert.ok(Math.abs(areas.disc.ringEdge - areas.disc.edge - 2) < 1e-4, "a disc's ring is 2px wide");
    assert.ok(Math.abs(areas.square.ringEdge - areas.square.edge - 2) < 1e-4, "a square's ring is 2px wide");
    assert.ok(Math.abs((areas.diamond.ringEdge - areas.diamond.edge) / Math.SQRT2 - 2) < 0.001, "a diamond's ring is 2px across its edges");
    assert.equal(areas.disc.fill, await token(page, "surface-page"), "on the page the ring is the page colour");
    await configure(page, { level: 1 });
    assert.equal((await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-chart-ring")).fill)), await token(page, "surface-1"), "in a card the ring is the card's colour");
    await page.close();
  });

  test("series are told apart by dash and marker: 2 dashed 6 on 4 off with butt caps, 3 a round dot every 6px", async () => {
    const { page } = await chartPage({ cfg: { data: "sleep3", chart: "sleep" } });
    const styles = await page.locator("path.basalt-chart-line").evaluateAll((els) => els.map((e) => { const c = getComputedStyle(e); return { series: e.parentElement.dataset.series, dash: c.strokeDasharray, cap: c.strokeLinecap, stroke: c.stroke }; }));
    const by = (id) => styles.find((s) => s.series === id);
    assert.equal(by("ring").dash, "none");
    assert.equal(by("watch").dash, "6px, 4px");
    assert.equal(by("watch").cap, "butt");
    assert.equal(by("patch").dash, "0px, 6px");
    assert.equal(by("patch").cap, "round");
    const observed = await token(page, "chart-observed");
    for (const s of styles) assert.equal(s.stroke, observed, "every observed series is primary ink: no colour, no lighter ink");
    const shapes = await page.locator(".basalt-chart-series").evaluateAll((els) => els.map((g) => [g.dataset.series, g.querySelector(".basalt-chart-mark").dataset.shape]));
    assert.deepEqual(Object.fromEntries(shapes), { ring: "disc", watch: "square", patch: "diamond" });
    assert.equal(await page.locator(".basalt-chart-series").count(), 3, "three observed series at most");
    await page.close();
  });

  test("a marker shows on every day when a day is 16px wide, and otherwise on the active day, the latest, the days beside a gap and an isolated point", async () => {
    const { page } = await chartPage({ cfg: { data: "sleep", width: 900 } });
    const days = await page.evaluate(() => window.D.sleep.days.length);
    const observed = await page.evaluate(() => window.D.sleep.series[0].values.filter((v) => v != null).length);
    const slot = (await dayBoxes(page))[0].width;
    assert.ok(slot >= 16, `a day is ${slot}px`);
    const mark = (n) => page.locator(`.basalt-chart-series[data-series="ring"] .basalt-chart-mark`).count().then((c) => c === n);
    assert.equal(await page.locator(`.basalt-chart-series[data-series="ring"] .basalt-chart-mark`).count(), observed, "every observed day has its marker");
    // 90 days: a day is about 8px
    await configure(page, { data: "sleep90" });
    const slot90 = (await dayBoxes(page))[0].width;
    assert.ok(slot90 < 16, `a day is ${slot90}px`);
    const expected = await page.evaluate(() => {
      const v = window.D.sleep90.series[0].values;
      let n = 0;
      v.forEach((x, i) => { if (x == null) return; const before = i > 0 ? v[i - 1] : "edge"; const after = i < v.length - 1 ? v[i + 1] : "edge"; if (i === v.length - 1 || (i > 0 && before == null) || (i < v.length - 1 && after == null) || (before === "edge" && after === "edge")) n++; });
      return n;
    });
    assert.equal(await page.locator(`.basalt-chart-series[data-series="ring"] .basalt-chart-mark`).count(), expected, "the latest and the days beside a gap keep theirs");
    assert.ok(expected >= 5 && expected < 12);
    // the active day keeps a marker even where density hid it
    const boxes = await dayBoxes(page);
    await page.mouse.move(boxes[20].x + boxes[20].width / 2, boxes[20].y + boxes[20].height / 2);
    await frames(page);
    assert.equal(await page.locator(`.basalt-chart-series[data-series="ring"] .basalt-chart-mark`).count(), expected + 1, "the active day shows its marker");
    // an isolated point (a day with a gap on both sides) keeps its marker
    await page.mouse.move(0, 0);
    await edit(page, "sleep90", "d.series[0].values[40] = null; d.series[0].values[42] = null;");
    await frames(page);
    const cx = await page.locator(`.basalt-chart-series[data-series="ring"] .basalt-chart-mark`).evaluateAll((els) => els.map((e) => +e.getAttribute("cx")));
    const day41 = boxes[41].x + boxes[41].width / 2 - (await box(page.locator(".basalt-chart-plot"))).x;
    assert.ok(cx.some((x) => Math.abs(x - day41) < 0.5), "the isolated point keeps its marker");
    await page.close();
  });

  test("a bar is 60% of its day from 2 to 24px, square at both ends, in observed ink", async () => {
    for (const [width, viewport] of [[1200, { width: 1440, height: 900 }], [358, { width: 390, height: 900 }]]) {
      const { page } = await chartPage({ cfg: { chart: "train", data: "train", width }, viewport });
      const slot = (await dayBoxes(page))[0].width;
      const bars = await page.locator("rect.basalt-chart-bar").evaluateAll((els) => els.filter((e) => e.closest("svg.basalt-chart-svg") && !e.hasAttribute("data-so-far")).map((e) => ({ w: +e.getAttribute("width"), rx: e.getAttribute("rx"), fill: getComputedStyle(e).fill })));
      const expected = Math.max(2, Math.min(24, Math.round(slot * 0.6)));
      for (const b of bars) { assert.equal(b.w, expected, `a bar is ${b.w}px in a ${slot}px day`); assert.equal(b.rx, null, "square ends"); assert.equal(b.fill, await token(page, "chart-observed")); }
      assert.ok(expected >= 2 && expected <= 24);
      await page.close();
    }
  });

  test("a day that isn't final is the same mark, hollow in a 2px observed outline, with 'Today so far' in the legend and '34 min so far'", async () => {
    const { page } = await chartPage({ cfg: { chart: "train", data: "train" } });
    const so = page.locator("svg.basalt-chart-svg rect[data-so-far]");
    assert.equal(await so.count(), 1);
    const s = await so.evaluate((el) => { const c = getComputedStyle(el); return { fill: c.fill, stroke: c.stroke, width: c.strokeWidth }; });
    assert.equal(s.stroke, await token(page, "chart-observed"));
    assert.equal(s.width, "2px");
    assert.equal(s.fill, await token(page, "surface-page"), "filled with the surface");
    assert.ok((await page.locator(".basalt-chart-legend").innerText()).includes("Today so far"));
    assert.ok((await valueTexts(page)).includes("34 min so far"), `${await valueTexts(page)}`);
    // the outline sits inside the bar's full outer size, so it is the same mark
    const bars = await page.locator("svg.basalt-chart-svg rect.basalt-chart-bar").evaluateAll((els) => els.map((e) => ({ w: +e.getAttribute("width") + (e.hasAttribute("data-so-far") ? 2 : 0), so: e.hasAttribute("data-so-far") })));
    assert.equal(bars.find((b) => b.so).w, bars.find((b) => !b.so).w);
    await page.close();
  });

  test("one series per bar chart: a second series is not drawn as grouped bars", async () => {
    const { page } = await chartPage({ cfg: { chart: "train", data: "train", extra: {} } });
    await edit(page, "train", 'd.series.push({ id: "x", name: "Second", values: d.series[0].values.map((v) => (v == null ? null : v + 5)) });');
    await frames(page);
    assert.equal(await page.locator(".basalt-chart-legend .basalt-chart-entry").filter({ hasText: "Second" }).count(), 0);
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The plan

describe("Chart plan", () => {
  test("a bar chart's plan is a 2px secondary stroke across each day's slot, equal neighbours joined, and a change is a gap, not a riser", async () => {
    const { page } = await chartPage({ cfg: { chart: "train", data: "train" } });
    const planInk = await token(page, "chart-plan");
    const lines = await page.locator("svg.basalt-chart-svg line.basalt-chart-plan").evaluateAll((els) => els.map((e) => ({ x1: +e.getAttribute("x1"), x2: +e.getAttribute("x2"), y1: +e.getAttribute("y1"), y2: +e.getAttribute("y2"), width: getComputedStyle(e).strokeWidth, stroke: getComputedStyle(e).stroke })));
    assert.ok(lines.length > 5);
    for (const l of lines) { assert.equal(l.y1, l.y2, "no risers: every plan stroke is horizontal"); assert.equal(l.width, "2px"); assert.equal(l.stroke, planInk); }
    // each stroke runs from a day's left edge to a day's right edge
    const days = await dayBoxes(page);
    const plot = await box(page.locator(".basalt-chart-plot"));
    const lefts = days.map((d) => d.x - plot.x);
    const rights = days.map((d) => d.x + d.width - plot.x);
    for (const l of lines) {
      assert.ok(lefts.some((x) => Math.abs(x - l.x1) <= 0.5), `a stroke starts at a day's edge (${l.x1})`);
      assert.ok(rights.some((x) => Math.abs(x - l.x2) <= 0.5), `a stroke ends at a day's edge (${l.x2})`);
    }
    // equal neighbours join: the strokes are the runs of equal plan
    const runs = await page.evaluate(() => { const p = window.D.train.plan.values; let n = 0; p.forEach((v, i) => { if (v != null && (i === 0 || p[i - 1] !== v)) n++; }); return n; });
    assert.equal(lines.length, runs);
    assert.ok(lines.some((l) => l.x2 - l.x1 > (days[0].width * 1.5)), "a run of equal days is one stroke");
    await page.close();
  });

  test("on bars the plan is in front, cut out of the bar by 2px of the surface, and the cut never hides a bar's end", async () => {
    const { page } = await chartPage({ cfg: { chart: "train", data: "train" } });
    // plan 50 every day; the first four bars: 49 (just under), 51 (just over), 70 (well over), 20 (well under)
    await edit(page, "train", "[49, 51, 70, 20].forEach((x, i) => { d.series[0].values[i] = x; }); d.plan.values.fill(50, 0, 4); d.plan.notes.fill(null, 0, 4);");
    await frames(page);
    const order = await page.evaluate(() => [...document.querySelectorAll("svg.basalt-chart-svg > *")].map((e, i) => [e.getAttribute("class"), i]));
    const idx = (cls) => order.filter(([c]) => c === cls).map(([, i]) => i);
    assert.ok(Math.max(...idx("basalt-chart-bar")) < Math.min(...idx("basalt-chart-plan")), "the plan is in front of the bars");
    assert.ok(Math.max(...idx("basalt-chart-cut")) < Math.min(...idx("basalt-chart-plan")), "the cuts are under the stroke, cut out of the bars");
    const geometry = await page.evaluate(() => {
      const bars = [...document.querySelectorAll("svg.basalt-chart-svg rect.basalt-chart-bar")].map((e) => ({ x: +e.getAttribute("x"), y: +e.getAttribute("y"), h: +e.getAttribute("height"), so: e.hasAttribute("data-so-far") }));
      const cuts = [...document.querySelectorAll("svg.basalt-chart-svg rect.basalt-chart-cut")].map((e) => ({ x: +e.getAttribute("x"), y: +e.getAttribute("y"), h: +e.getAttribute("height"), fill: getComputedStyle(e).fill }));
      return { bars, cuts };
    });
    assert.ok(geometry.cuts.length > 0);
    for (const cut of geometry.cuts) {
      assert.equal(cut.h, 2, "the cut is 2px (size-cut)");
      assert.equal(cut.fill, await token(page, "surface-page"));
      const bar = geometry.bars.find((b) => b.x === cut.x);
      assert.ok(bar, "a cut belongs to a bar");
      assert.ok(bar.y < cut.y, `the cut at ${cut.y} would hide the bar's end at ${bar.y}`);
      assert.ok(bar.y + bar.h > cut.y + cut.h, "and its foot");
    }
    // the bars: 49 has no cut (its end is just under the plan), 51 has one under the stroke only, 70 has both, 20 none
    const cutsByBar = geometry.bars.slice(0, 4).map((b) => geometry.cuts.filter((c) => c.x === b.x).length);
    assert.deepEqual(cutsByBar, [0, 1, 2, 0]);
    await page.close();
  });

  test("a line chart's plan sits behind the observed line, which is never cut", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep" } });
    assert.equal(await page.locator("rect.basalt-chart-cut").count(), 0, "there is no cut in an observed line");
    const order = await page.evaluate(() => [...document.querySelectorAll("svg.basalt-chart-svg > *")].map((e) => e.getAttribute("class")));
    assert.ok(order.lastIndexOf("basalt-chart-band-edge") < order.indexOf("basalt-chart-series"), "the band is behind the lines");
    // every subpath of a line is a run of observed days; the line is cut only where data is missing
    const paths = await page.locator("path.basalt-chart-line").evaluateAll((els) => els.map((e) => [e.parentElement.dataset.series, (e.getAttribute("d").match(/M/g) ?? []).length]));
    const runs = await page.evaluate(() => Object.fromEntries(window.D.sleep.series.map((s) => [s.id, s.values.reduce((n, v, i, a) => n + (v != null && (i === 0 || a[i - 1] == null) ? 1 : 0), 0)])));
    for (const [id, m] of paths) assert.equal(m, runs[id], `${id}: ${m} subpaths for ${runs[id]} runs of days`);
    await page.close();
  });

  test("a plan band is two 1px secondary edges that step with no risers, with the hover wash between", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep" } });
    const edges = await page.locator("svg.basalt-chart-svg line.basalt-chart-band-edge").evaluateAll((els) => els.map((e) => ({ y1: e.getAttribute("y1"), y2: e.getAttribute("y2"), w: getComputedStyle(e).strokeWidth, stroke: getComputedStyle(e).stroke })));
    assert.equal(edges.length, 4, "the band steps once, so two bands of two edges");
    for (const e of edges) { assert.equal(e.y1, e.y2); assert.equal(e.w, "1px"); assert.equal(e.stroke, await token(page, "chart-plan")); }
    const fills = await page.locator("svg.basalt-chart-svg rect.basalt-chart-band").evaluateAll((els) => els.map((e) => getComputedStyle(e).fill));
    assert.equal(fills.length, 2);
    for (const f of fills) assert.equal(f, await token(page, "chart-band"));
    assert.equal(await token(page, "chart-band"), await token(page, "state-hover"));
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Missing data

describe("Chart missing data", () => {
  test("the line breaks and never joins a gap, and no zero is plotted", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep" } });
    const info = await page.evaluate(() => {
      const plot = document.querySelector(".basalt-chart-day");
      const top = +plot.style.top.replace("px", ""), h = +plot.style.height.replace("px", "");
      return { top, h, paths: [...document.querySelectorAll("path.basalt-chart-line")].map((p) => ({ id: p.parentElement.dataset.series, d: p.getAttribute("d") })) };
    });
    const ring = info.paths.find((p) => p.id === "ring");
    assert.equal((ring.d.match(/M/g) ?? []).length, 2, "ring: two runs around the one gap (3 November)");
    assert.equal((info.paths.find((p) => p.id === "watch").d.match(/M/g) ?? []).length, 3, "watch: three runs around two gaps");
    for (const p of info.paths) for (const [, y] of [...p.d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => [+m[1], +m[2]])) assert.ok(y >= info.top && y <= info.top + info.h, `a point at y ${y} is on the plot, not at a zero`);
    // between the days either side of the 26-28 Oct watch gap there is no segment
    const dayCount = await page.evaluate(() => window.D.sleep.days.length);
    assert.equal(await page.locator('.basalt-chart-series[data-series="ring"] path.basalt-chart-line').count(), 1);
    assert.ok(dayCount === 28);
    await page.close();
  });

  test("the hatch is 1px border-input lines at 45 degrees on a 4px pitch, over the full plot height", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep" } });
    const pattern = await page.locator("svg.basalt-chart-svg pattern").evaluate((p) => ({ w: p.getAttribute("width"), h: p.getAttribute("height"), t: p.getAttribute("patternTransform"), u: p.getAttribute("patternUnits"), stroke: getComputedStyle(p.querySelector("line")).stroke, sw: getComputedStyle(p.querySelector("line")).strokeWidth }));
    assert.deepEqual({ w: pattern.w, h: pattern.h, t: pattern.t, u: pattern.u, sw: pattern.sw }, { w: "4", h: "4", t: "rotate(45)", u: "userSpaceOnUse", sw: "1px" });
    assert.equal(pattern.stroke, await token(page, "border-input"));
    assert.equal(await token(page, "chart-missing"), await token(page, "border-input"));
    const hatches = await attrs(page.locator("svg.basalt-chart-svg rect.basalt-chart-hatch"), "height", "y", "fill");
    assert.ok(hatches.length >= 2);
    for (const h of hatches) assert.equal(h.height, "240", "the hatch runs the plot's full height");
    await page.close();
  });

  test("in a bar chart the hatch fills the whole missing slot and no bar is drawn there", async () => {
    const { page } = await chartPage({ cfg: { chart: "train", data: "train" } });
    const days = await dayBoxes(page);
    const plot = await box(page.locator(".basalt-chart-plot"));
    const slot = days[0].width;
    const data = await page.evaluate(() => window.D.train.series[0].values.map((v) => v == null));
    const missing = data.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
    assert.ok(missing.length >= 3);
    const hatches = await page.locator("svg.basalt-chart-svg rect.basalt-chart-hatch").evaluateAll((els) => els.map((e) => ({ x: +e.getAttribute("x"), w: +e.getAttribute("width") })));
    const covered = hatches.reduce((sum, h) => sum + h.w, 0);
    assert.ok(Math.abs(covered - missing.length * slot) <= hatches.length * 1.5, `the hatch covers ${covered}px for ${missing.length} slots of ${slot}px: the whole slot, not a bar's width`);
    const bars = await attrs(page.locator("svg.basalt-chart-svg rect.basalt-chart-bar"), "x", "width");
    for (const i of missing) {
      const left = days[i].x - plot.x, right = left + slot;
      for (const b of bars) assert.ok(+b.x + +b.width <= left + 0.5 || +b.x >= right - 0.5, `a bar at ${b.x} is drawn in the missing slot ${left}-${right}`);
    }
    await page.close();
  });

  test("when one series of several is missing the hatch still marks the days, its words name the series, and the observed series draws over it", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep" } });
    const lane = await texts(page.locator("svg.basalt-chart-svg text.basalt-chart-lane"));
    assert.ok(lane.some((t) => /^Watch not observed/.test(t)), `the lane names the series: ${lane}`);
    assert.ok(lane.some((t) => /^Not observed/.test(t)), `and says "Not observed" when every series is missing: ${lane}`);
    assert.ok(lane.some((t) => t.includes("not worn, travel")), "with the reason, from where the gap starts");
    const order = await page.evaluate(() => [...document.querySelectorAll("svg.basalt-chart-svg > *")].map((e) => e.getAttribute("class")));
    assert.ok(order.indexOf("basalt-chart-hatch") < order.indexOf("basalt-chart-series"), "the observed series is drawn over the hatch");
    // the ring was observed on the watch's gap days: it has markers inside the hatch, ringed
    const hatch = await page.locator("svg.basalt-chart-svg rect.basalt-chart-hatch").first().evaluate((e) => ({ x: +e.getAttribute("x"), w: +e.getAttribute("width") }));
    const inside = await page.locator('.basalt-chart-series[data-series="ring"] .basalt-chart-mark').evaluateAll((els, h) => els.filter((e) => +e.getAttribute("cx") > h.x && +e.getAttribute("cx") < h.x + h.w).length, hatch);
    assert.equal(inside, 3, "three observed ring days inside the watch's gap");
    await page.close();
  });

  test("the lane steps from the full words to 'Watch not observed' to 'Not observed' as room runs out, and is the same height at every range", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep", width: 358 }, viewport: { width: 390, height: 900 } });
    const lane = await texts(page.locator("svg.basalt-chart-svg text.basalt-chart-lane"));
    assert.ok(lane.length >= 1 && lane.every((t) => /^(Watch not observed|Not observed)/.test(t)), `${lane}`);
    assert.ok(lane.some((t) => !t.includes("·")), `short words when the chart is narrow: ${lane}`);
    const heights = [];
    for (const data of ["sleep7", "sleep", "sleep90"]) { await configure(page, { data }); heights.push((await box(page.locator(".basalt-chart-plot"))).height); }
    assert.equal(new Set(heights).size, 1, `the reserved lanes make every range the same height: ${heights}`);
    await page.close();
  });

  // DECISIONS 336, Q2 and the pixel review's finding 1: the legend says "Not observed" alone, and the date line says why.
  test("the reason is in the date line ('… · why'), the day's name and the table; the readout's value says 'Not observed' alone", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep" } });
    const missingDay = await page.evaluate(() => window.D.sleep.series[1].values.findIndex((v) => v == null));
    const days = await dayBoxes(page);
    await page.mouse.move(days[missingDay].x + days[missingDay].width / 2, days[missingDay].y + 20);
    await frames(page);
    const values = await valueTexts(page);
    assert.ok(values.includes("Not observed") && !values.some((v) => v.includes("·")), `the legend says Not observed alone: ${values}`);
    assert.match(await page.locator(".basalt-chart-date > span:not(.basalt-chart-reserve)").innerText(), / · not worn, travel$/, "the date line says why");
    assert.equal(await page.locator('.basalt-chart-value [data-missing]').first().evaluate((el) => getComputedStyle(el).color), await token(page, "text-tertiary"));
    const sentence = await page.locator(".basalt-chart-day").nth(missingDay).getAttribute("aria-label");
    assert.match(sentence, /Watch not observed, not worn, travel/);
    await page.getByRole("button", { name: "View as table" }).click();
    const row = page.locator(".basalt-chart-table tbody tr").filter({ has: page.locator("th", { hasText: new RegExp(`^${await page.evaluate((i) => new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(window.D.sleep.days[i])), missingDay)}$`) }) });
    assert.equal(await row.locator(".basalt-chart-not-observed").innerText(), "Not observed");
    assert.equal(await row.locator(".basalt-chart-not-observed").evaluate((el) => getComputedStyle(el).color), await token(page, "text-tertiary"));
    assert.match(await row.locator("td").last().innerText(), /Watch not worn, travel/);
    // tertiary, no mark: the cell holds the words alone
    assert.equal(await row.locator(".basalt-chart-not-observed").evaluate((el) => el.children.length), 0);
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The legend is the readout

describe("Chart readout", () => {
  test("it returns to the latest day when the pointer leaves, and a picked day's date lifts to primary with a full-height plate", async () => {
    const { page } = await chartPage();
    assert.match(await dateText(page), /^Latest · /);
    const days = await dayBoxes(page);
    await page.mouse.move(days[5].x + days[5].width / 2, days[5].y + 60);
    await frames(page);
    assert.doesNotMatch(await dateText(page), /Latest/);
    const plate = await page.locator("rect.basalt-chart-plate").evaluate((el) => ({ h: +el.getAttribute("height"), x: +el.getAttribute("x"), fill: getComputedStyle(el).fill }));
    assert.equal(plate.h, 240, "a full-height plate");
    assert.equal(plate.fill, await token(page, "state-selected"));
    const active = page.locator("text.basalt-chart-axis[data-active]");
    assert.equal(await active.count(), 1);
    assert.equal(await active.evaluate((el) => getComputedStyle(el).fill), await token(page, "text-primary"));
    assert.equal(await page.locator("text.basalt-chart-axis:not([data-active])").first().evaluate((el) => getComputedStyle(el).fill), await token(page, "text-tertiary"));
    await page.mouse.move(5, 5);
    await frames(page);
    assert.match(await dateText(page), /^Latest · /);
    assert.equal(await page.locator("rect.basalt-chart-plate").count(), 0);
    await page.close();
  });

  test("the legend's values change in place and nothing moves: 0px on every element box across pointer positions", async () => {
    const { page } = await chartPage({ cfg: { chart: "stack" } });
    const boxes = () => page.evaluate(() => [...document.querySelectorAll(".basalt-chart-group *")].filter((e) => !e.closest("svg") && !e.classList.contains("basalt-chart-day") && !e.classList.contains("basalt-chart-ruler")).map((e) => { const r = e.getBoundingClientRect(); return [e.tagName + "." + e.getAttribute("class"), r.x, r.y, r.width, r.height]; }));
    const rest = await boxes();
    const stackDays = await dayBoxes(page, 0);
    const missing = await page.evaluate(() => window.D.sleep.series[1].values.findIndex((v) => v == null));
    for (const i of [0, 7, missing, 27]) {
      await page.mouse.move(stackDays[i].x + stackDays[i].width / 2, stackDays[i].y + 50);
      await frames(page);
      const here = await boxes();
      assert.deepEqual(here, rest, `an element moved with the pointer over day ${i}`);
    }
    const trainDays = await dayBoxes(page, 1);
    const trainMissing = await page.evaluate(() => window.D.train.series[0].values.findIndex((v) => v == null));
    for (const i of [2, trainMissing, 27]) {
      await page.mouse.move(trainDays[i].x + trainDays[i].width / 2, trainDays[i].y + 50);
      await frames(page);
      assert.deepEqual(await boxes(), rest, `an element moved with the pointer over training day ${i}`);
    }
    await page.close();
  });

  test("with keyboard focus inside, the focused day is the one shown: a pointer moving, or leaving, does not replace it", async () => {
    const { page } = await chartPage();
    await page.keyboard.press("Tab");
    // the toggle is after the plot; the first Tab lands on the plot's one stop (the latest day), the rest on the way
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await frames(page);
    const focused = await dateText(page);
    assert.doesNotMatch(focused, /Latest/);
    const values = await valueTexts(page);
    const days = await dayBoxes(page);
    await page.mouse.move(days[2].x + days[2].width / 2, days[2].y + 40);
    await frames(page);
    assert.equal(await dateText(page), focused, "a pointer moving over another day does not replace the focused day's readout");
    assert.deepEqual(await valueTexts(page), values);
    await page.mouse.move(5, 5);
    await frames(page);
    assert.equal(await dateText(page), focused, "and pointer leave does not reset it to the latest day");
    await page.keyboard.press("Tab");
    await frames(page);
    assert.match(await dateText(page), /^Latest · /, "leaving the chart returns it to the latest day");
    await page.close();
  });

  // DECISIONS 336, section 7: the headline's unit keeps its x on every day, a missing day ("—") and a number that gains a digit included, and the gap from
  // the value's seat to the unit is space-2. The legend's keys are held by the test above (0px on every box across days, a gap day included).
  test("with the headline, the unit keeps its x on every day (a missing day and a number with more digits included), space-2 after the value's seat", async () => {
    for (const chart of ["sleep", "train"]) {
      const { page } = await chartPage({ cfg: { chart, data: chart === "sleep" ? "sleep" : "train", extra: { headline: true } } });
      const space2 = await tokenPx(page, "space-2");
      const days = await dayBoxes(page);
      const read = () => page.evaluate(() => { const seat = document.querySelector(".basalt-chart-seat").getBoundingClientRect(); const unit = document.querySelector(".basalt-chart-unit").getBoundingClientRect(); const shown = document.querySelector(".basalt-chart-seat > :not(.basalt-chart-reserve)").textContent; return { x: unit.x, gap: unit.x - seat.right, shown }; });
      const rest = await read();
      assert.ok(Math.abs(rest.gap - space2) <= 0.5, `${chart}: the unit is ${rest.gap} after the seat`);
      const seen = new Set();
      for (let i = 0; i < days.length; i++) {
        await page.mouse.move(days[i].x + days[i].width / 2, days[i].y + 40);
        await frames(page, 3);
        const here = await read();
        seen.add(here.shown.replace(/\d/g, "9"));
        assert.equal(here.x, rest.x, `${chart}: the unit moved on day ${i} (${here.shown})`);
      }
      assert.ok(seen.size >= 2, `${chart}: the days shown take more than one form: ${[...seen]}`);
      await page.close();
    }
  });

  test("each key is a 16px swatch, the name and its value; the plan's swatch is its stroke and a band's is its two edges", async () => {
    const { page } = await chartPage();
    const sw = await page.locator(".basalt-chart-swatch").first().evaluate((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; });
    assert.deepEqual(sw, [16, 16]);
    assert.equal(await tokenPx(page, "size-icon-sm"), 16);
    const names = await page.locator(".basalt-chart-entry .basalt-chart-name").allInnerTexts();
    assert.deepEqual(names, ["Ring", "Watch", "Plan", "Not observed"]);
    assert.equal(await page.locator(".basalt-chart-legend .basalt-chart-band-edge").count(), 2);
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Direct labels, narrow, the plot's height

describe("Chart direct labels and narrow", () => {
  test("direct labels name each line at its last observed point in a reserved right margin, only at 480px and wider with two series", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep", width: 520 } });
    const labels = await page.locator("svg.basalt-chart-svg text.basalt-chart-direct").evaluateAll((els) => els.map((e) => ({ t: e.textContent, fill: getComputedStyle(e).fill, size: getComputedStyle(e).fontSize, right: e.getBBox().x + e.getBBox().width })));
    assert.deepEqual(labels.map((l) => l.t).sort(), ["Plan", "Ring", "Watch"]);
    for (const l of labels) { assert.equal(l.size, "12px"); assert.equal(l.fill, await token(page, "text-secondary")); }
    const width = await page.evaluate(() => +document.querySelector("svg.basalt-chart-svg").getAttribute("width"));
    for (const l of labels) assert.ok(l.right <= width, "a label fits inside the chart");
    const lastDay = (await dayBoxes(page)).at(-1);
    const plot = await box(page.locator(".basalt-chart-plot"));
    for (const l of await page.locator("svg.basalt-chart-svg text.basalt-chart-direct").evaluateAll((els) => els.map((e) => e.getBBox().x))) assert.ok(l >= lastDay.x + lastDay.width - plot.x, "in the margin, past the last day");
    // one series: none
    await edit(page, "sleep", "d.series.splice(1);");
    await frames(page);
    assert.equal(await page.locator("text.basalt-chart-direct").count(), 0, "a single series has no direct label");
    await page.close();
  });

  test("narrow is the chart's own width under 480px: at 479 the direct labels drop and the lane takes two rows, at 480 not, whatever the viewport", async () => {
    const results = {};
    for (const width of [479, 480]) {
      const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep", width }, viewport: { width: 1440, height: 900 } });
      const own = await page.evaluate(() => document.querySelector(".basalt-chart-plot").clientWidth);
      results[width] = { own, narrow: await page.locator(".basalt-chart").evaluate((el) => el.hasAttribute("data-narrow")), direct: await page.locator("text.basalt-chart-direct").count(), height: (await box(page.locator("svg.basalt-chart-svg"))).height };
      await page.close();
    }
    assert.equal(results[479].own, 479);
    assert.equal(results[480].own, 480);
    assert.equal(results[479].narrow, true);
    assert.equal(results[480].narrow, false);
    assert.equal(results[479].direct, 0);
    assert.equal(results[480].direct, 3);
    assert.equal(results[479].height - results[480].height, 16, "the lane takes a second 16px row");
  });

  test("nothing scrolls sideways at 390, and the plot is 240px tall at 1440, 900 and 390", async () => {
    for (const [width, viewport] of [[1200, { width: 1440, height: 900 }], [800, { width: 900, height: 900 }], [358, { width: 390, height: 900 }]]) {
      const { page } = await chartPage({ cfg: { chart: "stack", width }, viewport });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `no sideways scroll at ${viewport.width}`);
      for (const n of [0, 1]) assert.equal((await dayBoxes(page, n))[0].height, 240, `the plot is 240px at ${viewport.width}`);
      assert.equal(await page.locator("rect.basalt-chart-hatch").first().getAttribute("height"), "240");
      await page.close();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Keyboard and screen readers

describe("Chart keyboard", () => {
  test("the plot is one tab stop: a group named by the chart, with a focusable image a day and roving tabindex", async () => {
    const { page } = await chartPage();
    const group = page.locator(".basalt-chart-days");
    assert.equal(await group.getAttribute("role"), "group");
    assert.equal(await group.getAttribute("aria-roledescription"), "chart");
    assert.equal(await group.evaluate((el) => document.getElementById(el.getAttribute("aria-labelledby")).textContent), "Sleep");
    assert.ok((await group.getAttribute("aria-describedby")).split(" ").length === 2);
    assert.equal(await group.locator('[tabindex="0"]').count(), 1, "one tab stop");
    assert.equal(await group.locator('[role="img"]').count(), 28);
    assert.equal(await group.locator('[tabindex="-1"]').count(), 27);
    // from the page's start: the plot's one stop, then the next control; never a second day
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("role")), "img");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "BUTTON", "Tab leaves the plot; nothing is trapped");
    await page.close();
  });

  test("each day is named by its full sentence: the day, each series' value or reason, the plan, and where the value sits against it", async () => {
    const { page } = await chartPage();
    const names = await page.locator(".basalt-chart-day").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    const last = names.at(-1);
    assert.match(last, /^Tuesday, November 10, today\. Ring \d+ hours? (\d+ minutes?)?\.? ?Watch .*\. Plan .* to .*\./);
    assert.ok(/(inside the plan|under the plan|over the plan)\.$/.test(last), last);
    const gap = names.find((n) => /Watch not observed, not worn, travel/.test(n));
    assert.ok(gap, "a day with a reason is named with it");
    assert.ok(names.some((n) => /Ring not observed, no device synced\. Watch not observed, no device synced/.test(n)), "and a day nothing was observed names every series");
    assert.equal(new Set(names).size, 28, "every day has its own name");
    await page.close();
  });

  test("the last day is 'today' only when it is today's date: `now` says what today is, and a range that ends before it is never 'today'", async () => {
    const lastName = async (page) => (await page.locator(".basalt-chart-day").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).at(-1);
    const { page } = await chartPage();
    assert.match(await lastName(page), /^Tuesday, November 10, today\./, "the last day is today's UTC date");
    await configure(page, { extra: { now: Date.UTC(2026, 10, 11, 12) } });
    assert.match(await lastName(page), /^Tuesday, November 10\. /, "a day later it is yesterday, with no 'today'");
    await configure(page, { extra: { now: Date.UTC(2026, 10, 10, 0, 0, 1) } });
    assert.match(await lastName(page), /^Tuesday, November 10, today\./, "the same UTC date from its first second");
    await configure(page, { extra: { now: Date.UTC(2026, 10, 9, 23, 59, 59) } });
    assert.ok(!(await lastName(page)).includes("today"), "the day before is not today either");
    await configure(page, { chart: "train", data: "train", extra: { now: Date.UTC(2026, 10, 20) } });
    assert.ok(!(await lastName(page)).includes("today"), "a bar chart's last day too");
    await page.close();
  });

  test("with no `now` the chart compares its last day with the clock", async () => {
    const { page } = await chartPage();
    const names = () => page.locator(".basalt-chart-day").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    await page.evaluate(() => {
      // five days ending today, and five days that ended 40 days ago
      const ending = (daysAgo) => Array.from({ length: 5 }, (_, i) => new Date(Date.now() - (daysAgo + 4 - i) * 86_400_000).toISOString().slice(0, 10));
      const slice = (days) => ({ ...window.D.sleep, days, series: window.D.sleep.series.map((s) => ({ ...s, values: s.values.slice(-5), reasons: s.reasons.slice(-5) })), plan: { ...window.D.sleep.plan, values: window.D.sleep.plan.values.slice(-5) } });
      window.D.sleep7 = slice(ending(0));
      window.D.sleep3 = slice(ending(40));
    });
    await configure(page, { data: "sleep7", extra: { now: undefined } });
    assert.ok((await names()).at(-1).includes(", today"), `a range ending today says so: ${(await names()).at(-1)}`);
    await configure(page, { data: "sleep3", extra: { now: undefined } });
    assert.ok(!(await names()).at(-1).includes("today"), "a range that ended 40 days ago does not");
    await page.close();
  });

  test("← → move a day, Page Up and Page Down a week (Page Up earlier), Home and End the ends; focus shows the control ring at +2", async () => {
    const { page } = await chartPage();
    const index = () => page.evaluate(() => +document.activeElement.dataset.i);
    await page.keyboard.press("Tab");
    assert.equal(await index(), 27);
    await page.keyboard.press("ArrowLeft"); assert.equal(await index(), 26);
    await page.keyboard.press("ArrowRight"); assert.equal(await index(), 27);
    await page.keyboard.press("ArrowRight"); assert.equal(await index(), 27, "clamped at the latest day");
    await page.keyboard.press("PageUp"); assert.equal(await index(), 20, "Page Up is a week earlier");
    await page.keyboard.press("PageDown"); assert.equal(await index(), 27, "Page Down is a week later");
    await page.keyboard.press("Home"); assert.equal(await index(), 0);
    await page.keyboard.press("PageUp"); assert.equal(await index(), 0);
    await page.keyboard.press("PageDown"); assert.equal(await index(), 7);
    await page.keyboard.press("End"); assert.equal(await index(), 27);
    // the roving stop follows focus
    assert.equal(await page.locator('.basalt-chart-day[tabindex="0"]').evaluate((el) => +el.dataset.i), 27);
    const ring = await page.locator(".basalt-chart-day:focus").evaluate((el) => { const s = getComputedStyle(el); return { w: s.outlineWidth, style: s.outlineStyle, offset: s.outlineOffset, color: s.outlineColor, radius: s.borderRadius }; });
    assert.deepEqual({ w: ring.w, style: ring.style, offset: ring.offset, radius: ring.radius }, { w: "2px", style: "solid", offset: "2px", radius: "4px" });
    assert.equal(ring.color, await token(page, "border-focus"));
    await page.close();
  });

  test("there is no live region, and the SVG is aria-hidden: moving focus is the announcement", async () => {
    const { page } = await chartPage({ cfg: { chart: "stack" } });
    assert.equal(await page.locator(".basalt-chart-group").evaluate((el) => el.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]').length), 0);
    assert.equal(await page.locator("svg.basalt-chart-svg").evaluateAll((els) => els.every((e) => e.getAttribute("aria-hidden") === "true" && e.getAttribute("focusable") === "false")), true);
    await page.close();
  });

  test("the key hint is a data-kbd-hint legend, and it is hidden on touch until a hardware key is pressed", async () => {
    const { page } = await chartPage();
    assert.equal(await page.locator(".basalt-chart-hint").getAttribute("data-kbd-hint"), "");
    assert.ok((await page.locator(".basalt-chart-hint").innerText()).includes("a week"));
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Touch

describe("Chart touch", () => {
  test("a tap picks a day and holds it until a tap outside; touch-action keeps vertical scrolling", async () => {
    const { page } = await chartPage({ cfg: { width: 358 }, viewport: { width: 390, height: 900 }, hasTouch: true });
    assert.equal(await page.locator(".basalt-chart-plot").evaluate((el) => getComputedStyle(el).touchAction), "pan-y");
    const days = await dayBoxes(page);
    const target = days[10];
    await page.touchscreen.tap(target.x + target.width / 2, target.y + 80);
    await frames(page);
    const picked = await dateText(page);
    assert.doesNotMatch(picked, /Latest/, "a tap picks a day (the page's 390px is a touch device)");
    assert.equal(await page.locator("rect.basalt-chart-plate").count(), 1);
    await page.touchscreen.tap(20, 800);
    await frames(page);
    assert.match(await dateText(page), /^Latest · /, "a tap outside releases it");
    await page.close();
  });

  test("a vertical swipe that starts on the chart still scrolls the page", async () => {
    const { page } = await chartPage({ cfg: { width: 358, chart: "stack" }, viewport: { width: 390, height: 500 }, hasTouch: true });
    const cdp = await page.context().newCDPSession(page);
    const days = await dayBoxes(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 300), "the page is taller than the viewport");
    const before = await page.evaluate(() => scrollY);
    await cdp.send("Input.synthesizeScrollGesture", { x: days[10].x + days[10].width / 2, y: days[10].y + 200, yDistance: -250, gestureSourceType: "touch", speed: 800 });
    await frames(page, 4);
    assert.ok((await page.evaluate(() => scrollY)) > before + 100, "a finger moving up on the plot scrolled the page");
    await page.close();
  });

  test("a sideways drag scrubs across the days", async () => {
    const { page } = await chartPage({ cfg: { width: 358 }, viewport: { width: 390, height: 900 }, hasTouch: true });
    const cdp = await page.context().newCDPSession(page);
    const days = await dayBoxes(page);
    const y = days[0].y + 80;
    const at = (i) => days[i].x + days[i].width / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: at(5), y }] });
    await frames(page);
    const first = await dateText(page);
    for (const i of [6, 7, 8, 9, 12]) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: at(i), y }] }); await frames(page, 1); }
    const last = await dateText(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.notEqual(first, last, `the readout followed the finger: ${first} -> ${last}`);
    await frames(page);
    assert.equal(await dateText(page), last, "and it holds where the finger lifted");
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The table and the summary

describe("Chart table and summary", () => {
  test("the table is disclosed in the same figure: 'View as table', aria-expanded, a still table with a pinned date row header, newest first", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep", width: 900 } });
    const button = page.getByRole("button", { name: "View as table" });
    assert.equal(await button.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator(".basalt-chart-table").evaluate((el) => el.hidden), true);
    await button.click();
    const toggle = page.getByRole("button", { name: "Hide the table" });
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.equal(await toggle.getAttribute("aria-controls"), await page.locator(".basalt-chart-table").getAttribute("id"));
    assert.equal(await page.locator("figure.basalt-chart .basalt-chart-table table").count(), 1, "in the same figure");
    const table = page.locator(".basalt-chart-table table");
    assert.equal(await table.evaluate((el) => getComputedStyle(el).tableLayout), "fixed");
    const heads = await table.locator("thead th").allInnerTexts();
    assert.deepEqual(heads, ["Date", "Ring", "Watch", "Plan", "Note"]);
    const rows = await table.locator("tbody th[scope=row]").allInnerTexts();
    assert.equal(rows.length, 28);
    assert.equal(rows[0], "Tue, Nov 10", "newest first");
    assert.equal(rows.at(-1), "Wed, Oct 14");
    // numbers end-aligned
    assert.equal(await table.locator("tbody tr").first().locator("td").first().evaluate((el) => getComputedStyle(el).textAlign), "right");
    await page.close();
  });

  test("at 390 the date is pinned and opaque, a scroll hint appears when the table overflows, and the page does not scroll sideways", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep", width: 358 }, viewport: { width: 390, height: 900 } });
    await page.getByRole("button", { name: "View as table" }).click();
    await frames(page);
    assert.equal(await page.locator(".basalt-chart-scroll-hint").count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    const th = page.locator(".basalt-chart-table tbody th").first();
    assert.equal(await th.evaluate((el) => getComputedStyle(el).position), "sticky");
    const bg = await th.evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.notEqual(bg, "rgba(0, 0, 0, 0)");
    assert.ok(!bg.includes("/"), `the pinned date is opaque: ${bg}`);
    // wide: no hint
    await configure(page, { width: 1200 });
    await page.setViewportSize({ width: 1440, height: 900 });
    await frames(page, 4);
    assert.equal(await page.locator(".basalt-chart-scroll-hint").count(), 0);
    await page.close();
  });

  test("the summary is the figcaption the app writes, and the group is described by it", async () => {
    const { page } = await chartPage();
    const caption = page.locator("figure.basalt-chart > figcaption");
    assert.match(await caption.innerText(), /Ring averaged 7 h 20 m/);
    const described = await page.locator(".basalt-chart-days").getAttribute("aria-describedby");
    assert.ok(described.split(" ").includes(await caption.getAttribute("id")));
    assert.equal(await page.locator("figure.basalt-chart").evaluate((el) => el.lastElementChild.tagName), "FIGCAPTION", "a figcaption is the figure's first or last child");
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Motion

describe("Chart motion", () => {
  const SET = (page, js) => page.evaluate((js) => { const d = structuredClone(window.D.train); new Function("D", js)({ train: d }); window.D.train = d; window.__bump(); }, js);

  test("the first paint is at rest: nothing animates, and no fade", async () => {
    const { page } = await chartPage({ clock: true });
    assert.equal(await page.locator("svg.basalt-chart-svg").evaluate((el) => getComputedStyle(el).animationName), "none");
    assert.equal(await page.locator("svg.basalt-chart-svg").evaluate((el) => el.hasAttribute("data-entering")), false);
    await page.close();
  });

  test("a value that changes in place glides with the marks, over duration-slow on ease-out, and the legend and summary hold still", async () => {
    const { page } = await chartPage({ clock: true, cfg: { chart: "train", data: "train" } });
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-slow").trim()), "200ms");
    const barOf = (i) => page.evaluate((i) => { const b = [...document.querySelectorAll("svg.basalt-chart-svg rect.basalt-chart-bar")].filter((e) => !e.hasAttribute("data-so-far")); return b.map((e) => +e.getAttribute("height")); }, i);
    const before = await barOf();
    await SET(page, "const v = D.train.series[0].values; const k = v.findIndex((x) => x != null && x < 60); v[k] = v[k] + 30;");
    await page.clock.runFor(16);
    const during = await barOf();
    await page.clock.runFor(16);
    const mid = await barOf();
    await page.clock.runFor(400);
    const after = await barOf();
    const changed = before.findIndex((h, i) => h !== after[i]);
    assert.ok(changed >= 0);
    assert.ok(during[changed] > before[changed] && during[changed] < after[changed], "it starts to move");
    assert.ok(mid[changed] > before[changed] && mid[changed] < after[changed], `mid-flight at ${mid[changed]}, between ${before[changed]} and ${after[changed]}`);
    assert.ok(after[changed] > before[changed]);
    await page.close();
  });

  test("a new peak widens the scale at once so nothing clips, and it eases back when it shrinks", async () => {
    const { page } = await chartPage({ clock: true, cfg: { chart: "train", data: "train" } });
    const topTick = () => page.evaluate(() => {
      const ys = [...document.querySelectorAll("svg.basalt-chart-svg text.basalt-chart-axis")].filter((e) => e.getAttribute("text-anchor") === "end").map((e) => ({ y: +e.getAttribute("y"), t: e.textContent }));
      const top = ys.reduce((a, b) => (a.y < b.y ? a : b));
      const bars = [...document.querySelectorAll("svg.basalt-chart-svg rect.basalt-chart-bar")].map((e) => +e.getAttribute("y"));
      const plotTop = +document.querySelector(".basalt-chart-day").style.top.replace("px", "");
      return { ...top, plotTop, highest: Math.min(...bars) };
    });
    const rest = await topTick();
    assert.ok(Math.abs(rest.y - rest.plotTop) <= 0.5, "at rest the top tick is the top of the plot");
    // a long session: 142 min, over the 125 min scale
    await SET(page, "const v = D.train.series[0].values; v[v.length - 3] = 160;");
    const instant = await topTick();
    assert.ok(Math.abs(instant.y - instant.plotTop) <= 0.5, `the scale widened at once: its top tick is at the top (${instant.y} vs ${instant.plotTop})`);
    assert.ok(instant.highest >= instant.plotTop - 0.5, "and no bar is clipped at the top");
    assert.notEqual(instant.t, rest.t, "the new scale is the new tick");
    await page.clock.runFor(400);
    // now it shrinks: back to the old values
    await SET(page, "const v = D.train.series[0].values; v[v.length - 3] = 30;");
    await page.clock.runFor(16);
    const easing = await topTick();
    assert.ok(easing.y > easing.plotTop + 3, `the scale has not snapped in: its top tick is ${easing.y - easing.plotTop}px below the top`);
    await page.clock.runFor(400);
    const settled = await topTick();
    assert.ok(Math.abs(settled.y - settled.plotTop) <= 0.5, "it settles at the top");
    await page.close();
  });

  test("a value with no previous place appears in place while its hatch fades on the same clock; a new range fades in over duration-fast", async () => {
    const { page } = await chartPage({ clock: true, cfg: { chart: "train", data: "train" } });
    const hatchOpacity = () => page.evaluate(() => [...document.querySelectorAll("svg.basalt-chart-svg rect.basalt-chart-hatch")].map((e) => +e.getAttribute("opacity")));
    const barCount = () => page.locator("svg.basalt-chart-svg rect.basalt-chart-bar").count();
    const bars0 = await barCount();
    assert.deepEqual(await hatchOpacity(), [1, 1]);
    await page.evaluate(() => { const t = window.D.train, late = window.D.trainLate; window.D.train = { ...t, series: [{ ...t.series[0], values: late.series[0].values, reasons: late.series[0].reasons }] }; window.__bump(); });
    await page.clock.runFor(16);
    assert.equal(await barCount(), bars0 + 1, "the value is there at once, where it belongs");
    await page.clock.runFor(30);
    const mid = await hatchOpacity();
    assert.equal(mid.length, 2);
    assert.ok(mid.some((o) => o < 1 && o > 0), `the hatch is fading: ${mid}`);
    await page.clock.runFor(400);
    assert.deepEqual(await hatchOpacity(), [1], "and the hatch is gone for that day");
    // a new range
    await configure(page, { chart: "train", data: "train7" });
    const anim = await page.locator("svg.basalt-chart-svg").evaluate((el) => ({ name: getComputedStyle(el).animationName, dur: getComputedStyle(el).animationDuration }));
    assert.equal(anim.name, "basalt-fade-in");
    assert.equal(anim.dur, "0.1s", "duration-fast");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`under reduced motion, values and the scale snap (${theme})`, async () => {
      const { page } = await chartPage({ clock: true, cfg: { chart: "train", data: "train" }, reducedMotion: "reduce", theme });
      await page.waitForTimeout(0);
      const heights = () => page.evaluate(() => [...document.querySelectorAll("svg.basalt-chart-svg rect.basalt-chart-bar")].map((e) => +e.getAttribute("height")));
      const before = await heights();
      await SET(page, "const v = D.train.series[0].values; const k = v.findIndex((x) => x != null && x < 60); v[k] = v[k] + 30;");
      await page.clock.runFor(16);
      const after = await heights();
      await page.clock.runFor(400);
      assert.deepEqual(await heights(), after, "nothing is still moving 16ms after the change");
      assert.notDeepEqual(after, before);
      await page.close();
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// Forced colours, accessibility

describe("Chart forced colours and accessibility", () => {
  test("in forced colours: observed CanvasText; the plan, the band's edges and the hatch GrayText; the band fill and the plate drop; cuts and rings Canvas; the baseline CanvasText; the active day a 2px Highlight outline", async () => {
    const { page } = await chartPage({ forcedColors: "active", cfg: { chart: "train", data: "train" } });
    const sys = (c) => resolve(page, c);
    const [canvasText, gray, canvas, highlight] = await Promise.all([sys("CanvasText"), sys("GrayText"), sys("Canvas"), sys("Highlight")]);
    const css = (sel, prop) => page.locator(sel).first().evaluate((el, prop) => getComputedStyle(el)[prop], prop);
    assert.equal(await css("svg rect.basalt-chart-bar:not([data-so-far])", "fill"), canvasText);
    assert.equal(await css("svg line.basalt-chart-plan", "stroke"), gray);
    assert.equal(await css("svg line.basalt-chart-baseline", "stroke"), canvasText);
    assert.equal(await css("svg .basalt-chart-hatch-line", "stroke"), gray);
    assert.equal(await css("svg rect.basalt-chart-cut", "fill"), canvas);
    assert.equal(await css("svg rect[data-so-far]", "fill"), canvas);
    assert.equal(await css("svg rect[data-so-far]", "stroke"), canvasText);
    const days = await dayBoxes(page);
    await page.mouse.move(days[3].x + days[3].width / 2, days[3].y + 60);
    await frames(page);
    assert.equal(await css("svg rect.basalt-chart-plate", "fill"), "none");
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowLeft");
    const outline = await page.locator(".basalt-chart-day[data-active]").evaluate((el) => { const s = getComputedStyle(el); return { w: s.outlineWidth, c: s.outlineColor, style: s.outlineStyle }; });
    assert.deepEqual({ w: outline.w, style: outline.style }, { w: "2px", style: "solid" });
    assert.equal(outline.c, highlight);
    await page.close();
    const line = await chartPage({ forcedColors: "active", cfg: { chart: "sleep", data: "sleep" } });
    assert.equal(await line.page.locator("path.basalt-chart-line").first().evaluate((el) => getComputedStyle(el).fill), "none", "line paths keep fill: none");
    assert.equal(await line.page.locator("path.basalt-chart-line").first().evaluate((el) => getComputedStyle(el).stroke), canvasText);
    assert.equal(await line.page.locator("rect.basalt-chart-band").first().evaluate((el) => getComputedStyle(el).fill), "none");
    assert.equal(await line.page.locator("line.basalt-chart-band-edge").first().evaluate((el) => getComputedStyle(el).stroke), gray);
    assert.equal(await line.page.locator("circle.basalt-chart-ring").first().evaluate((el) => getComputedStyle(el).fill), canvas);
    await line.page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds nothing in ${theme}, with the table open, at 1440 and at 390`, async () => {
      for (const [width, viewport] of [[1200, { width: 1440, height: 1000 }], [358, { width: 390, height: 900 }]]) {
        const { page } = await chartPage({ theme, cfg: { chart: "stack", width }, viewport });
        const days = await dayBoxes(page);
        await page.mouse.move(days[4].x + days[4].width / 2, days[4].y + 50);
        for (const i of [0, 1]) await page.locator(".basalt-chart-toggle").nth(i).click();
        await frames(page);
        assert.deepEqual(await audit(page), [], `${theme} at ${viewport.width}`);
        await page.close();
      }
    });
  }

  test("axe finds nothing in a card at level 1, with a keyboard-focused day", async () => {
    const { page } = await chartPage({ cfg: { chart: "sleep", data: "sleep", level: 1 } });
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowLeft");
    assert.deepEqual(await audit(page), []);
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The module

describe("Chart module", () => {
  test("a TimeChart-only import carries no Base UI, cmdk or Shiki, and stays small", async () => {
    const result = await esbuild.build({
      stdin: { contents: `import { TimeChart } from "./dist/index.js"; console.log(TimeChart);`, resolveDir: pkg, loader: "js" },
      bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, metafile: true,
      external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
    });
    const outputs = result.metafile.outputs;
    const entry = Object.keys(outputs).find((file) => outputs[file].entryPoint === "<stdin>");
    const seen = new Set();
    const visit = (file) => { if (seen.has(file)) return; seen.add(file); for (const i of outputs[file].imports) if (!i.external && i.kind !== "dynamic-import") visit(i.path); };
    visit(entry);
    const inputs = [...new Set([...seen].flatMap((f) => Object.entries(outputs[f].inputs).filter(([, i]) => i.bytesInOutput > 0).map(([n]) => n)))];
    const bytes = [...seen].reduce((sum, f) => sum + outputs[f].bytes, 0);
    assert.deepEqual(inputs.filter((f) => /@base-ui|cmdk|shiki|@radix-ui/.test(f)), []);
    assert.ok(bytes < 60_000, `a TimeChart import is ${bytes} bytes`);
  });

  test("the chart module does nothing when it is loaded", async () => {
    const source = fs.readFileSync(path.join(pkg, "src", "chart.tsx"), "utf8");
    // a registry, a cache or a formatter built at the top level would run when the module loads (functions that build one when called are fine)
    const top = source.split("\n").filter((l) => /^(const|let|var) \w+(: [^=]+)? = (new (Map|Set|WeakMap|WeakSet|Intl\.)|\[|\{|[A-Za-z.]+\()/.test(l) && !/^const (NICE|SHAPES|DASHES|DAY_MS|LABEL_GAP|LONG_LABEL|BAR_SHARE|MARKER_DAYS|NOT_OBSERVED|GroupContext)\b/.test(l));
    assert.deepEqual(top, [], "a module-scope registry or formatter");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The layout tokens

describe("Layout tokens", () => {
  test("the derived properties: the gutter steps to the narrow gutter under 720, the sticky offset is the bar, the bottom offset is the tab bar under 720", async () => {
    const read = async (width) => {
      const { page } = await chartPage({ viewport: { width, height: 900 } });
      await page.evaluate(() => { document.documentElement.style.setProperty("--_inset-bottom-sim", "34px"); document.body.insertAdjacentHTML("beforeend", '<nav class="basalt-tabbar" aria-label="x"></nav>'); });
      const out = await page.evaluate(() => {
        const probe = document.createElement("div");
        document.body.append(probe);
        const get = (n) => { probe.style.width = `var(${n})`; return probe.getBoundingClientRect().width; };
        const r = { gutter: get("--basalt-gutter"), sticky: get("--basalt-sticky-offset"), bottom: get("--basalt-bottom-offset"), header: get("--basalt-size-header"), tab: get("--basalt-size-tab-bar"), page: get("--basalt-size-page-width"), prose: get("--basalt-size-prose-width"), sidebar: get("--basalt-size-sidebar-width"), rail: get("--basalt-size-rail-width") };
        probe.remove();
        return r;
      });
      await page.close();
      return out;
    };
    const wide = await read(1440);
    assert.deepEqual(wide, { gutter: 24, sticky: 56, bottom: 0, header: 56, tab: 56, page: 1152, prose: 544, sidebar: 256, rail: 72 });
    const phone = await read(719);
    assert.equal(phone.gutter, 16);
    assert.equal(phone.bottom, 56 + 34, "the tab bar plus the bottom safe area");
    const edge = await read(720);
    assert.equal(edge.gutter, 24);
    assert.equal(edge.bottom, 0, "no tab bar from 720 up");
  });

  test("a prose column is the prose width on the row's start edge, and never centred", async () => {
    const fixture = await plainFixturePage(browser, `createRoot(document.getElementById("root")).render(<div id="row" style={{ width: 1000 }}><B.Prose id="prose">A line of prose.</B.Prose></div>);`, { theme: "dark" });
    const row = await box(fixture.page.locator("#row"));
    const prose = await box(fixture.page.locator("#prose"));
    assert.equal(prose.width, 544, "34rem");
    assert.equal(prose.x, row.x, "on the row's start edge");
    assert.ok(prose.right < row.right - 100, "not stretched, and so not centred either");
    await fixture.page.close();
  });

  test("no literal 719px or 1023px is left in the components' source", () => {
    const offenders = [];
    for (const file of fs.readdirSync(path.join(pkg, "src"), { recursive: true })) {
      const full = path.join(pkg, "src", String(file));
      if (!fs.statSync(full).isFile()) continue;
      const text = fs.readFileSync(full, "utf8");
      for (const m of text.matchAll(/\b(719|1023)(\.98)?px\b/g)) offenders.push(`${file}: ${m[0]}`);
    }
    assert.deepEqual(offenders, []);
  });

  test("media and container queries are range syntax with a lint exception that names the token", () => {
    const css = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8");
    const lines = css.split("\n");
    lines.forEach((line, i) => {
      if (/@media \(width [<>]=? \d+px\)|@media \(\d+px <= width/.test(line)) assert.match(lines[i - 1], /size-breakpoint-(md|lg)/, `line ${i + 1}: ${line.trim()}`);
      if (!/@container \(width < \d+/.test(line)) return;
      // One container query is at size-breakpoint-md: ListBand's narrow form on touch (foundations, Lists: "under size-breakpoint-md, 720, on a coarse
      // pointer", and under 720 whatever the pointer since B5), inside that media query. Every other names a container token.
      if (/@container \(width < 720px\)/.test(line)) {
        assert.match(lines[i - 1], /size-breakpoint-md \(720px\)/, `line ${i + 1}`);
        assert.match(lines[i - 2], /@media \(pointer: coarse\), \(width < 720px\)/, `line ${i + 1}: the 720 container query is the band's touch form`);
      } else assert.match(lines[i - 1], /size-breakpoint-container/, `line ${i + 1}`);
    });
    assert.ok(!/@container \(width < 30rem\)/.test(css), "the 30rem container queries read the token's 480px now");
  });
});
