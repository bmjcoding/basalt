// The charts port batch (DECISIONS 153, round 40): the lit marks, the headline frame, the trend, the phase chart with its lane, the share bar, the coverage strip, the
// marks row and the range meter. Driven in Chromium against the built package with the real stylesheet, in both themes. The data is synthetic (test/fixtures/figure-data.ts).
// The implementation hasn't been reviewed. Nothing here waits on a wall clock for a moment in a transition: it waits for the state, or reads what is set.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pixels, pkg } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;

const HOST = `
import { weightData, calls, lb, marksData, MARKS_CAP, coverageDays, EVENTS, eventsDays, events, EVENTS_SUMMARY } from "./test/fixtures/figure-data.ts";
import { lastDays } from "./test/fixtures/chart-data.ts";
const NOW = Date.UTC(2026, 10, 10, 12);
window.B = B;
window.__cfg = {};
window.W28 = weightData(28);
window.W84 = weightData(84);
window.opened = [];
function Scene() {
  const [, bump] = React.useState(0);
  window.__bump = () => bump((n) => n + 1);
  const [week, setWeek] = React.useState(11);
  const c = window.__cfg;
  const w = window.W28;
  const p = window.W84;
  const common = { now: NOW, format: lb, unit: "lb" };
  const wrap = (node) => <div id="host" style={{ width: c.width, margin: "0 auto" }}>{node}</div>;
  switch (c.scene) {
    case "trend": return wrap(<B.TimeChart title="Weight" kind="line" days={w.days} series={[{ id: "w", name: "Weight", values: w.values, reasons: w.reasons }]} trend={c.trend ?? true} lit={c.lit ?? true} summary="Weight trended down over 28 days." entrance={c.entrance} locale={c.locale} {...common} />);
    case "bars": return wrap(<B.TimeChart title="Steps" kind="bar" days={lastDays(14)} series={[{ id: "s", name: "Steps", values: marksData("columns", 14) }]} lit={c.lit} headline={c.headline} unit="steps" format={(v) => String(Math.round(v))} summary="Steps over 14 days." now={NOW} locale={c.locale} />);
    case "short": return wrap(<B.TimeChart title="Events a day" kind={c.kind ?? "bar"} plotSize={c.plotSize ?? "sm"} compact={c.compact} days={eventsDays()} series={c.series ?? [{ id: "events", name: "Events", values: EVENTS }]} summary={EVENTS_SUMMARY} format={events} locale="en-GB" now={Date.UTC(2026, 10, 16)} entrance={c.entrance} />);
    case "flat": return wrap(<B.TimeChart title="Weight" kind="line" days={w.days} series={[{ id: "w", name: "Weight", values: w.values, reasons: w.reasons }]} summary="Weight." {...common} />);
    case "phase": return wrap(<B.PhaseChart title="Weight over twelve weeks" name="Weight" days={p.days} values={p.values} reasons={p.reasons} calls={calls()} week={c.controlled ?? week} onWeekChange={(i) => { window.opened.push(i); setWeek(i); }} summary="Twelve weeks." {...common} />);
    case "share": return wrap(<div style={{ display: "grid", gap: 24 }}><B.ShareBar id="sm" aria-label="Plan" parts={c.parts ?? [{ name: "Protein", value: 120 }, { name: "Carbs", value: 260 }, { name: "Fat", value: 70 }]} size="sm" /><B.ShareBar id="md" aria-label="Tally" parts={c.parts ?? [{ name: "Protein", value: 120 }, { name: "Carbs", value: 260 }, { name: "Fat", value: 70 }]} size="md" /></div>);
    case "coverage": return wrap(<div style={{ display: "grid", gap: 24 }}><B.CoverageStrip id="strip" days={coverageDays()} /><B.CoverageStrip id="week" form="week" days={coverageDays(7, [3])} /></div>);
    case "marks": return wrap(<div style={{ display: "grid", gap: 24 }}>{["columns", "pills", "blocks"].map((k) => <B.MarksRow key={k} id={k} kind={k} values={c.marks?.[k] ?? marksData(k, 12)} cap={MARKS_CAP[k]} label={k + " row"} />)}</div>);
    case "meter": return wrap(<B.RangeMeter id="rm" label="Last week" value={c.value ?? 0.9} max={1.5} plan={[0.5, 1.0]} unit="lb a week" />);
    default: return null;
  }
}
createRoot(document.getElementById("root")).render(<Scene />);`;

async function scenePage(cfg = {}, options = {}) {
  const { theme = "dark", viewport = { width: 1440, height: 1000 }, hasTouch = false, reducedMotion, forcedColors } = options;
  const { page, errors } = await fixturePage(browser, HOST, { theme, viewport, hasTouch, reducedMotion, forcedColors });
  await page.addStyleTag({ content: `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box}` });
  await page.evaluate(() => Promise.all([document.fonts.load("400 12px Geist"), document.fonts.load("600 40px Geist")]).then(() => document.fonts.ready));
  await configure(page, { width: 900, ...cfg });
  return { page, errors };
}
const frames = (page, n = 2) => page.evaluate(async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); }, n);
async function configure(page, cfg) {
  await page.evaluate((cfg) => { window.__cfg = { ...(window.__cfg ?? {}), ...cfg }; window.__bump?.(); }, cfg);
  await frames(page, 4);
}
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const css = (locator, prop) => locator.evaluate((el, prop) => getComputedStyle(el)[prop], prop);
const resolve = (page, value, prop = "color") => page.evaluate(({ value, prop }) => { const probe = document.createElement("i"); probe.style[prop] = value; document.body.append(probe); const c = getComputedStyle(probe)[prop]; probe.remove(); return c; }, { value, prop });
const token = (page, name, prop = "color") => resolve(page, `var(--basalt-${name})`, prop);
const tokenPx = (page, name) => page.evaluate((name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--basalt-${name}`)), name);
const axe = async (page, selector) => {
  await page.evaluate(axeSource);
  return page.evaluate(async (selector) => (await window.axe.run(selector, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"], rules: { "color-contrast": { enabled: false }, region: { enabled: false } } })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), selector);
};
const main = (page) => page.locator("figure.basalt-chart");
const svg = (page) => page.locator("svg.basalt-chart-svg");

describe("trailingMean (D7a)", () => {
  test("a trailing mean with a window of 7 and at least 3 readings; one missing day between readings keeps its trend, two stop it", async () => {
    const { page } = await scenePage();
    const out = await page.evaluate(() => {
      const t = B.trailingMean;
      return {
        run: t([1, 2, 3, 4, 5, 6, 7, 8]),
        short: t([1, 2]),
        one: t([5]),
        none: t([]),
        alone: t([1, 2, 3, null, 5, 6, 7]),
        two: t([1, 2, 3, 4, null, null, 7, 8, 9]),
        window3: t([1, 2, 3, 4], { window: 3 }),
        nulls: t([null, null, null, null]),
      };
    });
    assert.deepEqual(out.run.map((v) => (v == null ? v : Math.round(v * 1000) / 1000)), [null, null, 2, 2.5, 3, 3.5, 4, 5]);
    assert.deepEqual(out.short, [null, null]);
    assert.deepEqual(out.one, [null]);
    assert.deepEqual(out.none, []);
    assert.notEqual(out.alone[3], null, "a single missing day between two readings keeps its trend");
    assert.equal(out.two[4], null);
    assert.equal(out.two[5], null, "two missing days in a row stop the trend");
    assert.deepEqual(out.window3, [null, null, 2, 3]);
    assert.deepEqual(out.nulls, [null, null, null, null]);
    for (const list of [out.run, out.short, out.one, out.nulls]) for (const v of list) assert.ok(v === null || Number.isFinite(v), "never NaN or Infinity");
  });
});

for (const theme of THEMES) {
  describe(`${theme}: the lit marks, the trend and the headline frame (D7a, D7b)`, () => {
    test("a lit bar takes one vertical gradient in plot coordinates, three stops in the lit tokens; a flat chart is unchanged", async () => {
      const { page, errors } = await scenePage({ scene: "bars", lit: true }, { theme });
      const gradient = page.locator("linearGradient");
      assert.equal(await gradient.count(), 1);
      assert.equal(await gradient.getAttribute("gradientUnits"), "userSpaceOnUse");
      const plot = await box(page.locator(".basalt-chart-plot"));
      const stops = page.locator("linearGradient stop");
      assert.equal(await stops.count(), 3);
      const wanted = await Promise.all(["lit-top", "lit-mid", "lit-base"].map((n) => token(page, `chart-${n}`, "stopColor")));
      for (let i = 0; i < 3; i++) assert.equal(await css(stops.nth(i), "stopColor"), wanted[i]);
      const y1 = Number(await gradient.getAttribute("y1"));
      const y2 = Number(await gradient.getAttribute("y2"));
      assert.ok(y2 - y1 === (await tokenPx(page, "size-chart-plot")), `the gradient spans the plot's ${y2 - y1}px`);
      assert.ok(plot.height > 0);
      const id = await gradient.getAttribute("id");
      const bars = page.locator("svg.basalt-chart-svg .basalt-chart-bar");
      assert.ok((await bars.count()) > 3);
      for (let i = 0; i < (await bars.count()); i++) assert.ok((await css(bars.nth(i), "fill")).includes(`#${id}`), `every bar is filled by the one gradient (${await css(bars.nth(i), "fill")})`);
      await configure(page, { lit: false });
      assert.equal(await page.locator("linearGradient").count(), 0);
      assert.equal(await css(page.locator("svg.basalt-chart-svg .basalt-chart-bar").first(), "fill"), await token(page, "chart-observed"));
      assert.deepEqual(errors, []);
    });

    test("a lit line is one stroke in the top stop, with no area under it", async () => {
      const { page } = await scenePage({ scene: "trend" }, { theme });
      assert.equal(await css(page.locator(".basalt-chart-line"), "stroke"), await token(page, "chart-lit-top"));
      assert.equal(await css(page.locator(".basalt-chart-line"), "strokeWidth"), "2px");
      const filled = await svg(page).locator("path").evaluateAll((els) => els.filter((e) => getComputedStyle(e).fill !== "none").length);
      assert.equal(filled, 0, "no path is filled: there is no area under the line");
      assert.equal(await page.locator("path.basalt-chart-line").evaluate((e) => e.getAttribute("d").includes("C")), false, "joined straight: no curve");
    });

    test("a trend: a 4px dot for each reading in tertiary ink at full strength, the line breaks at a gap, one head dot ringed 2px, no plate", async () => {
      const { page } = await scenePage({ scene: "trend" }, { theme });
      const readings = page.locator(".basalt-chart-reading");
      const data = await page.evaluate(() => ({ values: window.W28.values, trend: B.trailingMean(window.W28.values) }));
      assert.equal(await readings.count(), data.values.filter((v) => v != null).length);
      assert.equal(await css(readings.first(), "r"), "2px");
      assert.equal(await css(readings.first(), "fill"), await token(page, "chart-axis"));
      assert.equal(await css(readings.first(), "opacity"), "1");
      const runs = data.trend.filter((v, i) => v != null && (i === 0 || data.trend[i - 1] == null)).length;
      const d = await page.locator("path.basalt-chart-line").getAttribute("d");
      assert.equal((d.match(/M/g) ?? []).length, runs, "one subpath for each run; no bridge across a gap");
      assert.equal(await page.locator(".basalt-chart-mark").count(), 1, "one head dot");
      assert.equal(await page.locator(".basalt-chart-ring").count(), 1);
      assert.equal(await css(page.locator(".basalt-chart-mark"), "r"), "4px");
      assert.equal(await css(page.locator(".basalt-chart-ring"), "r"), "6px", "the ring is size-cut (2px) beyond the dot");
      assert.equal(await page.locator(".basalt-chart-plate").count(), 0);
      assert.equal(await page.locator("line.basalt-chart-cursor, .basalt-chart-halo").count(), 0, "no cursor and no halo");
    });

    test("the head dot is on the trend line at the picked day, and a day with no trend has none", async () => {
      const { page } = await scenePage({ scene: "trend" }, { theme });
      const focusDay = async (i) => { await page.locator(".basalt-chart-day").first().focus(); await page.keyboard.press("Home"); for (let k = 0; k < i; k++) await page.keyboard.press("ArrowRight"); await frames(page, 2); };
      const info = await page.evaluate(() => B.trailingMean(window.W28.values));
      const withTrend = info.findIndex((v, i) => i > 8 && v != null);
      await focusDay(withTrend);
      const dot = await box(page.locator(".basalt-chart-mark"));
      const days = await box(page.locator(".basalt-chart-day").nth(withTrend));
      assert.ok(Math.abs(dot.x + dot.width / 2 - (days.x + days.width / 2)) < 1, "the dot is on the picked day");
      const gap = info.findIndex((v) => v == null);
      assert.ok(gap >= 0);
      await focusDay(gap);
      assert.equal(await page.locator(".basalt-chart-mark").count(), 0, "a day with no trend has no head dot");
      assert.match(await page.locator(".basalt-chart-seat").innerText(), /—/);
    });

    test("the headline: its real value is in the first frame, there is no live region, the figure has a caption, the title is 14/20 500 secondary", async () => {
      const { page } = await scenePage({ scene: "bars", headline: true }, { theme });
      const figure = main(page);
      assert.equal(await figure.locator("[aria-live], [role=status], [role=alert]").count(), 0, "no live region");
      assert.ok((await figure.locator("figcaption").innerText()).length > 0);
      const title = figure.locator(".basalt-chart-title");
      assert.equal(await css(title, "fontSize"), "14px");
      assert.equal(await css(title, "lineHeight"), "20px");
      assert.equal(await css(title, "fontWeight"), "500");
      assert.equal(await css(title, "color"), await token(page, "text-secondary"));
      assert.equal((await box(figure.locator(".basalt-chart-head"))).height, 28, "the title row is one size-control-sm tall");
      assert.match(await figure.locator(".basalt-chart-headline").innerText(), /\d.*steps/s);
    });

    test("the headline's first frame holds the real value: a render's own first paint reads it, nothing counts up", async () => {
      const { page } = await scenePage({ scene: "bars", headline: true }, { theme });
      const seen = await page.evaluate(async () => {
        // Remount the figure and read its text synchronously after the layout effects, then again after frames: it is the same number.
        window.__cfg.scene = "none"; window.__bump();
        await new Promise((r) => requestAnimationFrame(r));
        window.__cfg.scene = "bars"; window.__cfg.headline = true; window.__bump();
        await new Promise((r) => requestAnimationFrame(r));
        const text = () => document.querySelector(".basalt-chart-seat .basalt-ticker-text")?.textContent;
        const first = text();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return { first, later: text() };
      });
      assert.ok(seen.first && /\d/.test(seen.first));
      assert.equal(seen.first, seen.later);
    });

    test("picking a day moves nothing: the headline's seat, the unit and the context line measure 0px apart on every day, at 1440 and at 390; the number follows the day", async () => {
      for (const [viewport, width] of [[{ width: 1440, height: 1000 }, 900], [{ width: 390, height: 900 }, 340]]) {
        const { page } = await scenePage({ scene: "trend", width }, { theme, viewport });
        const measure = async () => ({ seat: await box(page.locator(".basalt-chart-seat")), unit: await box(page.locator(".basalt-chart-unit")), context: await box(page.locator(".basalt-chart-context")), plot: await box(page.locator(".basalt-chart-plot")), head: await box(page.locator(".basalt-chart-headline")) });
        await page.locator(".basalt-chart-day").last().focus();
        await frames(page, 2);
        const rest = await measure();
        const spoken = [];
        for (let i = 0; i < 27; i++) {
          await page.keyboard.press("ArrowLeft");
          await frames(page, 1);
          const m = await measure();
          for (const key of Object.keys(rest)) for (const prop of ["x", "y", "width", "height"]) assert.ok(Math.abs(m[key][prop] - rest[key][prop]) < 0.001, `${viewport.width}, day ${i}: ${key}.${prop} moved ${m[key][prop] - rest[key][prop]}px`);
          spoken.push(await page.locator(".basalt-chart-seat .basalt-ticker-text").count() ? await page.locator(".basalt-chart-seat .basalt-ticker-text").innerText() : "—");
        }
        assert.ok(new Set(spoken).size > 3, "the number follows the picked day");
      }
    });

    test("at 390 a number and its unit stay together when the context line wraps: no line of it is a unit alone, at every width a phone's figure can be", async () => {
      let wrapped = 0;
      for (const width of [300, 320, 340, 350, 358, 366, 374]) {
        const { page } = await scenePage({ scene: "trend", width }, { theme, viewport: { width: 390, height: 900 } });
        const days = page.locator(".basalt-chart-day");
        for (let i = 0; i < (await days.count()); i++) {
          await days.nth(i).focus();
          await frames(page, 1);
          const lines = await page.locator(".basalt-chart-context > span:not(.basalt-chart-reserve)").evaluate((el) => {
            const out = [];
            const node = el.firstChild;
            const range = document.createRange();
            let top = null;
            for (let k = 0; k < node.length; k++) {
              range.setStart(node, k);
              range.setEnd(node, k + 1);
              const r = range.getBoundingClientRect();
              if (!r.width) continue;
              if (top === null || Math.abs(r.top - top) > 2) { out.push(""); top = r.top; }
              out[out.length - 1] += node.data[k];
            }
            return out.map((l) => l.trim());
          });
          if (lines.length > 1) wrapped++;
          for (const line of lines) assert.ok(!/^[\p{L}]{1,3}$/u.test(line), `width ${width}, day ${i}: a line of the context line is "${line}" alone: ${JSON.stringify(lines)}`);
        }
        await page.close();
      }
      assert.ok(wrapped > 0, "the line does wrap at a phone's width (so this checks something)");
    });

    test("the headline's number follows the chart's locale: a comma for the decimal mark and a point for thousands in German, the same width on every day", async () => {
      const { page } = await scenePage({ scene: "trend", locale: "de-DE" }, { theme });
      const text = async () => (await page.locator(".basalt-chart-seat .basalt-ticker-text").innerText()).trim();
      assert.match(await text(), /^\d+,\d$/, "the trend's number has a decimal comma");
      const before = await box(page.locator(".basalt-chart-seat"));
      await page.locator(".basalt-chart-day").nth(20).focus();
      await frames(page, 2);
      assert.match(await text(), /^\d+,\d$/);
      assert.deepEqual(await box(page.locator(".basalt-chart-seat")), before, "picking a day moves nothing in another locale either");
      assert.ok((await page.locator(".basalt-chart-seat .basalt-chart-reserve").allTextContents()).every((t) => t === "—" || /^\d+,\d$/.test(t)), "the reserved forms are written in German too");
      await configure(page, { locale: "en-GB" });
      assert.match(await text(), /^\d+\.\d$/, "and a decimal point in English");
      await configure(page, { scene: "bars", headline: true, locale: "de-DE" });
      const steps = await page.locator(".basalt-chart-seat .basalt-ticker-text").innerText();
      assert.match(steps.trim(), /^\d\.\d{3}$/, `German groups thousands with a point (${steps})`);
      await configure(page, { locale: "en-GB" });
      assert.match((await page.locator(".basalt-chart-seat .basalt-ticker-text").innerText()).trim(), /^\d,\d{3}$/);
    });

    test("the headline steps from text-4xl to text-5xl at 720, and the unit is text-md secondary", async () => {
      const { page } = await scenePage({ scene: "trend" }, { theme, viewport: { width: 1440, height: 900 } });
      assert.equal(await css(page.locator(".basalt-chart-headline"), "fontSize"), "56px");
      assert.equal(await css(page.locator(".basalt-chart-headline"), "lineHeight"), "60px");
      assert.equal(await css(page.locator(".basalt-chart-unit"), "fontSize"), "16px");
      assert.equal(await css(page.locator(".basalt-chart-unit"), "color"), await token(page, "text-secondary"));
      await page.setViewportSize({ width: 390, height: 900 });
      await configure(page, { width: 340 });
      assert.equal(await css(page.locator(".basalt-chart-headline"), "fontSize"), "40px");
      assert.equal(await css(page.locator(".basalt-chart-headline"), "lineHeight"), "44px");
    });

    test("the table is still in the same figure: a trend column, the button is Basalt's with aria-expanded, and the key hint is a legend", async () => {
      const { page } = await scenePage({ scene: "trend" }, { theme });
      const figure = main(page);
      const button = figure.locator("button.basalt-chart-toggle");
      assert.equal(await button.getAttribute("aria-expanded"), "false");
      assert.equal(await figure.locator(".basalt-chart-head button").count(), 1, "the button sits in the title row");
      const before = await box(figure.locator(".basalt-chart-plot"));
      await button.click();
      assert.equal(await button.getAttribute("aria-expanded"), "true");
      assert.ok((await figure.locator("table th[scope=col]").allInnerTexts()).some((t) => /7-day trend/.test(t)));
      const after = await box(figure.locator(".basalt-chart-plot"));
      assert.equal(after.y, before.y, "the plot did not move");
      assert.equal(await figure.locator(".basalt-chart-hint[data-kbd-hint]").count(), 1);
    });

    test("a chart that is not a headline keeps its legend and its reserved widths: the legend row is as wide as before and the frame attributes are absent", async () => {
      const { page } = await scenePage({ scene: "flat" }, { theme });
      assert.equal(await page.locator(".basalt-chart-legend").count(), 1);
      assert.equal(await main(page).getAttribute("data-headline"), null);
      assert.equal(await page.locator(".basalt-chart-readout").count(), 0);
      assert.equal(await css(page.locator(".basalt-chart-title"), "fontSize"), "16px");
      const before = await box(page.locator(".basalt-chart-value").first());
      await page.locator(".basalt-chart-day").last().focus();
      for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowLeft");
      const after = await box(page.locator(".basalt-chart-value").first());
      assert.equal(after.width, before.width);
    });

    test("axe: the lit trend figure and the lit headline bar figure have no violations", async () => {
      for (const scene of ["trend", "bars"]) {
        const { page } = await scenePage({ scene, headline: scene === "bars", lit: true }, { theme });
        assert.deepEqual(await axe(page, "figure.basalt-chart"), [], scene);
      }
    });
  });
}

describe("the entrance (D7b)", () => {
  test("a lit trend that is the page's one entrance draws its line and fades its readings; the headline's number is the real value throughout", async () => {
    const { page } = await scenePage({ scene: "trend", entrance: "replay" });
    const names = await page.evaluate(() => document.getAnimations().map((a) => a.effect?.target?.getAttribute?.("class") ?? ""));
    assert.ok(names.some((c) => /basalt-chart-line/.test(c)), "the line draws");
    assert.ok(names.some((c) => /basalt-chart-reading/.test(c)), "each reading fades in");
    assert.ok(!names.some((c) => /basalt-chart-title|basalt-chart-headline|basalt-chart-axis/.test(c)), "the words, the number and the axes are at rest");
    const text = await page.locator(".basalt-chart-seat .basalt-ticker-text").innerText();
    assert.match(text, /^\d+\.\d$/);
  });

  test("the share bar, coverage strip, marks row and range meter draw at rest: no animation starts when they mount", async () => {
    for (const scene of ["share", "coverage", "marks", "meter"]) {
      const { page } = await scenePage({ scene });
      const count = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
      assert.equal(count, 0, `${scene}: ${count} running animations`);
    }
  });

  test("under reduced motion nothing in the lit figure is animated, and the plate does not glide", async () => {
    const { page } = await scenePage({ scene: "phase" }, { reducedMotion: "reduce" });
    assert.equal(await css(page.locator(".basalt-chart-span"), "transitionDuration"), "0s");
    const marks = await scenePage({ scene: "marks" }, { reducedMotion: "reduce" });
    assert.equal(await css(marks.page.locator(".basalt-marks-mark").first(), "transitionDuration"), "0s");
  });
});

for (const theme of THEMES) {
  describe(`${theme}: the phase chart (D7d, votes 11, 16 and 17)`, () => {
    test("the plot is one second, fixed height (96px) at every width, and Basalt's gridlines and gutter are kept", async () => {
      const { page } = await scenePage({ scene: "phase" }, { theme });
      assert.equal(await tokenPx(page, "size-chart-plot-sm"), 96);
      const plot = page.locator(".basalt-chart-day").first();
      assert.equal((await box(plot)).height, 96);
      assert.ok((await page.locator(".basalt-chart-grid").count()) >= 3);
      await page.setViewportSize({ width: 390, height: 900 });
      await configure(page, { width: 340 });
      assert.equal((await box(page.locator(".basalt-chart-day").first())).height, 96);
    });

    test("a lane of twelve choices sits on the plot's own axis, one under each week, and the open week is checked", async () => {
      const { page } = await scenePage({ scene: "phase" }, { theme });
      const radios = page.locator(".basalt-phase-calls input[type=radio]");
      assert.equal(await radios.count(), 12);
      assert.equal(await page.locator("[role=radiogroup]").getAttribute("aria-label"), "Choose a week");
      assert.equal(await radios.nth(11).isChecked(), true);
      const days = page.locator(".basalt-chart-day");
      const first = await box(days.first());
      const last = await box(days.last());
      const calls = page.locator(".basalt-phase-call");
      const left = await box(calls.first());
      const right = await box(calls.last());
      assert.ok(Math.abs(left.x - first.x) < 0.51, `the lane starts under the first day (${left.x} vs ${first.x})`);
      assert.ok(Math.abs(right.right - last.right) < 0.51, "and ends under the last");
      assert.ok(Math.abs(left.width - 7 * first.width) < 0.6, "each choice is seven days wide");
    });

    test("the open week's plate is behind both the plot and the lane, selected state, and the chosen call is primary ink with no weight change", async () => {
      const { page } = await scenePage({ scene: "phase" }, { theme });
      const span = page.locator(".basalt-chart-span");
      assert.equal(await css(span, "backgroundColor"), await token(page, "state-selected", "backgroundColor"));
      const plate = await box(span);
      const days = page.locator(".basalt-chart-day");
      const week = await box(days.nth(77));
      assert.ok(Math.abs(plate.x - week.x) < 0.51 && Math.abs(plate.width - 7 * week.width) < 0.6);
      const calls = page.locator(".basalt-phase-call");
      assert.ok(plate.bottom >= (await box(calls.last())).bottom - 0.5, "the plate reaches the lane's foot");
      assert.ok(plate.y < week.y, "and starts above the plot");
      const picked = calls.last();
      assert.equal(await css(picked, "color"), await token(page, "text-primary"));
      assert.equal(await css(picked, "fontWeight"), await css(calls.first(), "fontWeight"));
      assert.equal(await css(calls.first(), "color"), await token(page, "text-secondary"));
    });

    test("choosing a call moves the plate (it slides over duration-slow on ease-out) and the lane does not move", async () => {
      const { page } = await scenePage({ scene: "phase" }, { theme });
      const span = page.locator(".basalt-chart-span");
      assert.match(await css(span, "transitionDuration"), /0\.2s/);
      assert.equal(await css(span, "transitionTimingFunction"), "cubic-bezier(0.16, 1, 0.3, 1), cubic-bezier(0.16, 1, 0.3, 1)", "ease-out, for the left and the width");
      const lane = await box(page.locator(".basalt-phase-calls"));
      await page.locator(".basalt-phase-call").nth(2).click();
      await page.waitForFunction(() => window.opened.length === 1);
      assert.deepEqual(await page.evaluate(() => window.opened), [2]);
      await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
      const days = page.locator(".basalt-chart-day");
      const plate = await box(span);
      assert.ok(Math.abs(plate.x - (await box(days.nth(14))).x) < 0.51, "the plate is behind week 3");
      assert.deepEqual(await box(page.locator(".basalt-phase-calls")), lane);
    });

    test("a press on a day opens its week, and so does Enter on the focused day; days stay images with one tab stop and there is no live region", async () => {
      const { page } = await scenePage({ scene: "phase" }, { theme });
      assert.equal(await page.locator(".basalt-chart-day[role=img]").count(), 84);
      assert.equal(await page.locator(".basalt-chart-day[tabindex='0']").count(), 1);
      assert.equal(await main(page).locator("[aria-live]").count(), 0);
      const day = await box(page.locator(".basalt-chart-day").nth(30));
      await page.mouse.click(day.x + day.width / 2, day.y + 20);
      await page.waitForFunction(() => window.opened.length === 1);
      assert.deepEqual(await page.evaluate(() => window.opened), [4], "day 30 is in week 5 (index 4)");
      await page.locator(".basalt-chart-day").nth(9).focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => window.opened.length === 2);
      assert.deepEqual(await page.evaluate(() => window.opened), [4, 1]);
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.evaluate(() => window.opened.length), 2, "an arrow key only picks");
      assert.equal(await page.locator(".basalt-chart-hint").innerText().then((t) => /Enter/.test(t)), true);
    });

    test("a hovered day only picks: the plate and the lane stay on the open week", async () => {
      const { page } = await scenePage({ scene: "phase" }, { theme });
      const before = await box(page.locator(".basalt-chart-span"));
      const day = await box(page.locator(".basalt-chart-day").nth(10));
      await page.mouse.move(day.x + 2, day.y + 20);
      await frames(page, 2);
      assert.deepEqual(await box(page.locator(".basalt-chart-span")), before);
      assert.equal(await page.evaluate(() => window.opened.length), 0);
    });

    test("on a pointer that is coarse the lane's choices are 44px tall", async () => {
      const { page } = await scenePage({ scene: "phase" }, { theme, hasTouch: true });
      const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
      if (!coarse) return; // this Chromium does not report a coarse pointer for touch emulation
      assert.ok((await box(page.locator(".basalt-phase-call").first())).height >= 44);
    });

    test("on a phone the lane is marks, previous and next are 44px, the open week is in words, and a step moves nothing", async () => {
      const { page } = await scenePage({ scene: "phase", width: 340 }, { theme, viewport: { width: 390, height: 900 }, hasTouch: true });
      assert.equal(await page.locator(".basalt-phase-calls[data-marks]").count(), 1);
      const callsBefore = await box(page.locator(".basalt-phase-calls"));
      assert.equal(await css(page.locator(".basalt-phase-call span").first(), "fontSize"), "0px", "marks only: the words are not drawn");
      const next = page.getByRole("button", { name: "Next week" });
      const previous = page.getByRole("button", { name: "Previous week" });
      assert.ok((await box(next)).height >= 44 || !(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)));
      assert.equal(await next.getAttribute("aria-disabled"), "true", "the last week has no next");
      assert.equal(await previous.getAttribute("aria-disabled"), null);
      const open = page.locator(".basalt-phase-open");
      const sizes = [await box(open)];
      for (let i = 0; i < 11; i++) { await previous.click(); sizes.push(await box(open)); }
      assert.equal(await page.evaluate(() => window.opened.length), 11);
      assert.equal(await previous.getAttribute("aria-disabled"), "true", "week 1 has no previous");
      for (const s of sizes) assert.deepEqual(s, sizes[0], "the open-week line is one seat as the weeks change");
      assert.deepEqual(await box(page.locator(".basalt-phase-calls")), callsBefore);
      assert.match(await open.innerText(), /Week 1 /);
      assert.equal(await page.locator(".basalt-phase-calls input").first().isChecked(), true, "the radios still carry the state, for a keyboard");
    });

    test("axe: the phase chart, on a desktop and on a phone, has no violations", async () => {
      for (const [viewport, width] of [[{ width: 1440, height: 1000 }, 900], [{ width: 390, height: 900 }, 340]]) {
        const { page } = await scenePage({ scene: "phase", width }, { theme, viewport });
        assert.deepEqual(await axe(page, "figure.basalt-chart"), []);
      }
    });
  });
}

for (const theme of THEMES) {
  describe(`${theme}: the share bar (D7c, votes 12 and 13)`, () => {
    test("8px and 12px tall, a 4px gap, full radius, one ink, no gloss; each part's share and name are in words", async () => {
      const { page } = await scenePage({ scene: "share" }, { theme });
      for (const [id, height] of [["sm", 8], ["md", 12]]) {
        const list = page.locator(`#${id}`);
        const bars = list.locator(".basalt-share-bar");
        assert.equal(await bars.count(), 3);
        for (let i = 0; i < 3; i++) {
          assert.equal((await box(bars.nth(i))).height, height);
          assert.equal(await css(bars.nth(i), "backgroundColor"), await token(page, "chart-observed", "backgroundColor"), "one ink for every part");
          assert.equal(await css(bars.nth(i), "backgroundImage"), "none", "no gradient and no gloss");
          assert.equal(await css(bars.nth(i), "boxShadow"), "none");
          assert.ok(parseFloat(await css(bars.nth(i), "borderTopLeftRadius")) >= height / 2, "full radius");
        }
        const a = await box(bars.nth(0));
        const b = await box(bars.nth(1));
        assert.ok(Math.abs(b.x - a.right - 4) < 0.01, "a 4px gap between parts");
        const items = await list.locator("li").allInnerTexts();
        assert.deepEqual(items.map((t) => t.replace(/\s+/g, " ")), ["27% Protein", "58% Carbs", "15% Fat"]);
        assert.equal(await list.locator(".basalt-share-bar[aria-hidden=true]").count(), 3);
        assert.equal(await css(list.locator(".basalt-share-value").first(), "fontWeight"), "600");
        assert.equal(await css(list.locator(".basalt-share-name").first(), "fontSize"), "13px");
      }
    });

    test("parts are as long as their share, and the shares add to 100 whatever the values", async () => {
      const { page } = await scenePage({ scene: "share" }, { theme });
      const widths = await page.locator("#sm .basalt-share-bar").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
      const total = widths.reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(widths[0] / total - 120 / 450) < 0.002 && Math.abs(widths[1] / total - 260 / 450) < 0.002);
      const sums = await page.evaluate(() => [[1, 1, 1], [1, 2, 3, 4, 5, 6, 7], [33.3, 33.3, 33.4], [0.001, 1000], [5], [], [0, 0]].map((v) => { const s = B.shareOf(v); return { s, sum: s.reduce((a, b) => a + b, 0) }; }));
      for (const { s, sum } of sums) assert.ok(sum === 100 || (sum === 0 && s.every((x) => x === 0)), JSON.stringify(s));
    });

    test("a part of nothing draws no bar and is left out; the md bar keeps every part at least 12px long", async () => {
      const { page } = await scenePage({ scene: "share", parts: [{ name: "Big", value: 1000 }, { name: "None", value: 0 }, { name: "Tiny", value: 1 }] }, { theme });
      assert.equal(await page.locator("#md li").count(), 2);
      const tiny = await box(page.locator("#md .basalt-share-bar").last());
      assert.ok(tiny.width >= 12);
    });

    test("the parts, their gaps and their words always fit the bar's width: a part that is almost nothing, or two, take their width from the others (1440 and 390)", async () => {
      const cases = [
        [{ name: "Run", value: 5400 }, { name: "Row", value: 2200 }, { name: "Lift", value: 5 }],
        [{ name: "Run", value: 5400 }, { name: "Lift", value: 5 }, { name: "Row", value: 3 }],
        [{ name: "Big", value: 1000 }, { name: "A", value: 1 }, { name: "B", value: 1 }],
      ];
      for (const [viewport, width] of [[{ width: 1440, height: 900 }, 900], [{ width: 390, height: 900 }, 340]]) {
        for (const parts of cases) {
          const { page } = await scenePage({ scene: "share", width, parts }, { theme, viewport });
          for (const id of ["sm", "md"]) {
            const list = await box(page.locator(`#${id}`));
            const rects = await page.locator(`#${id} li`).evaluateAll((items) => items.flatMap((li) => [li, ...li.children].map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, cls: el.className }; })));
            for (const r of rects) {
              assert.ok(r.right <= list.right + 0.01 && r.left >= list.x - 0.01, `${viewport.width} #${id} ${parts.map((p) => p.name)}: ${r.cls || "li"} is ${r.right - list.right}px past the bar`);
            }
            const bars = await page.locator(`#${id} .basalt-share-bar`).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
            assert.ok(bars.every((w) => w >= 12 - 0.01), "no part is under 12px");
            assert.ok((await page.locator(`#${id} .basalt-share-value [aria-hidden=true]`).allTextContents()).includes("<1%"), "the smallest part reads <1%, a glyph wider than 0%");
            const total = bars.reduce((a, b) => a + b, 0) + 4 * (bars.length - 1);
            assert.ok(Math.abs(total - list.width) < 0.02, `the parts and their gaps are the bar's width (${total} against ${list.width})`);
          }
          await page.close();
        }
      }
    });

    test("a part that is more than nothing and rounds to 0 reads <1% to the eye and 'less than 1%' to assistive technology, read from the accessibility tree; every other share is a whole number", async () => {
      const parts = [{ name: "Run", value: 5400 }, { name: "Row", value: 2200 }, { name: "Lift", value: 5 }, { name: "Rest", value: 0 }, { name: "Walk", value: 140 }];
      const { page } = await scenePage({ scene: "share", parts }, { theme });
      for (const id of ["sm", "md"]) {
        const tree = await page.locator(`#${id}`).ariaSnapshot();
        assert.ok(/less than 1%/.test(tree) && /Lift/.test(tree), `${id}: the tree says 'less than 1%' (${tree})`);
        assert.ok(!/<1%|&lt;|\b0%/.test(tree), `${id}: the glyph and "0%" are not in the tree: ${tree}`);
        assert.ok(!/Rest/.test(tree), "a part of exactly nothing is left out of the tree");
        const items = await page.locator(`#${id} li`).evaluateAll((lis) => lis.map((li) => ({ seen: (li.querySelector(".basalt-share-value [aria-hidden=true]") ?? li.querySelector(".basalt-share-value")).textContent.trim(), name: li.querySelector(".basalt-share-name").textContent })));
        const lift = items.find((i) => i.name === "Lift");
        assert.equal(lift.seen, "<1%", "the eye reads <1%");
        for (const i of items.filter((x) => x.name !== "Lift")) assert.match(i.seen, /^\d+%$/, `${i.name} is a whole number (${i.seen})`);
        assert.equal(await page.locator(`#${id} li`).count(), 4, "Rest, exactly nothing, is not drawn");
        const hidden = page.locator(`#${id} .basalt-share-value .basalt-visually-hidden`);
        assert.equal(await hidden.count(), 1);
        assert.equal(await hidden.textContent(), "less than 1%");
        assert.equal(await page.locator(`#${id} .basalt-share-value [aria-hidden=true]`).textContent(), "<1%");
      }
      const sum = await page.evaluate(() => B.shareOf([5400, 2200, 5, 0, 140]));
      assert.equal(sum.reduce((a, b) => a + b, 0), 100);
      await configure(page, { parts: [{ name: "Big", value: 99 }, { name: "One", value: 1 }] });
      assert.deepEqual(await page.locator("#md .basalt-share-value").allTextContents(), ["99%", "1%"], "a part that rounds to 1 is 1%, not <1%");
    });

    test("it never moves when its words change: the md bar keeps its row at 390", async () => {
      const { page } = await scenePage({ scene: "share", width: 340 }, { theme, viewport: { width: 390, height: 900 } });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      assert.ok(overflow, "no horizontal overflow at 390");
    });

    test("axe: no violations", async () => {
      const { page } = await scenePage({ scene: "share" }, { theme });
      assert.deepEqual(await axe(page, "#host"), []);
    });
  });

  describe(`${theme}: the coverage strip (D7d, vote 14, consent rows 6 to 8)`, () => {
    test("84 slivers 48px tall with a 2px gap and 2px corners, lit when recorded and the hatch when not; the strip is hidden and the words say it", async () => {
      const { page } = await scenePage({ scene: "coverage" }, { theme });
      const cells = page.locator("#strip .basalt-coverage-cell");
      assert.equal(await cells.count(), 84);
      assert.equal(await page.locator("#strip .basalt-coverage-cells").getAttribute("aria-hidden"), "true");
      const first = await box(cells.nth(0));
      const second = await box(cells.nth(1));
      assert.equal(first.height, 48);
      assert.ok(Math.abs(second.x - first.right - 2) < 0.02);
      assert.equal(await css(cells.nth(0), "borderTopLeftRadius"), "2px");
      assert.match(await css(cells.nth(0), "backgroundImage"), /linear-gradient/);
      const missing = cells.nth(12);
      assert.match(await css(missing, "backgroundImage"), /repeating-linear-gradient\(45deg/, "the hatch");
      assert.equal(await css(missing, "outlineStyle"), "none");
      assert.equal(await css(missing, "borderTopStyle"), "none", "no dashed edge");
      const words = await page.locator("#strip .basalt-coverage-words").innerText();
      assert.equal(words, "78 of 84 days recorded. Not recorded: 31 Aug to 2 Sept (watch not worn), 28 Sept (no reading), 28 Oct to 29 Oct (no reading).".replace("2 Sept", "2 Sept"));
    });

    test("the seven-day form is seven squares with a 4px gap, and its words are built from the cells", async () => {
      const { page } = await scenePage({ scene: "coverage" }, { theme });
      const cells = page.locator("#week .basalt-coverage-cell");
      assert.equal(await cells.count(), 7);
      const a = await box(cells.nth(0));
      const b = await box(cells.nth(1));
      assert.ok(Math.abs(a.width - a.height) < 0.02, "squares");
      assert.ok(Math.abs(b.x - a.right - 4) < 0.02);
      assert.equal(await css(cells.nth(0), "borderTopLeftRadius"), "6px");
      assert.match(await page.locator("#week .basalt-coverage-words").innerText(), /^6 of 7 days recorded\. Not recorded: \w+day 7 Nov \(watch not worn\)\.$/);
      const words = await page.evaluate(() => [B.coverageWords([]), B.coverageWords([{ date: "2026-11-01", recorded: true }]), B.coverageWords([{ date: "2026-11-01", recorded: false }])]);
      assert.deepEqual(words, ["0 of 0 days recorded.", "1 of 1 day recorded.", "0 of 1 day recorded. Not recorded: 1 Nov."]);
    });

    test("the strip measures the same however many days are missing, and fits 390 with no overflow", async () => {
      const { page } = await scenePage({ scene: "coverage", width: 340 }, { theme, viewport: { width: 390, height: 900 } });
      assert.equal((await box(page.locator("#strip .basalt-coverage-cells"))).height, 48);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
    });

    test("axe: no violations", async () => {
      const { page } = await scenePage({ scene: "coverage" }, { theme });
      assert.deepEqual(await axe(page, "#host"), []);
    });
  });

  describe(`${theme}: the marks row (D7d, vote 15, consent rows 9 to 11)`, () => {
    test("it is 56px tall (size-chart-row), the three forms are columns with 8px top corners, pills and blocks, a rest day is a 6px dot and a missing day is the hatch", async () => {
      const { page } = await scenePage({ scene: "marks" }, { theme });
      assert.equal(await tokenPx(page, "size-chart-row"), 56);
      for (const kind of ["columns", "pills", "blocks"]) assert.equal((await box(page.locator(`#${kind}`))).height, 56, kind);
      const column = page.locator("#columns .basalt-marks-mark").first();
      assert.equal(await css(column, "borderTopLeftRadius"), "8px");
      assert.equal(await css(column, "borderBottomLeftRadius"), "0px");
      assert.ok((await box(column)).width <= 28.01);
      const pill = page.locator("#pills .basalt-marks-mark").first();
      assert.ok((await box(pill)).width <= 12.01);
      assert.ok(parseFloat(await css(pill, "borderTopLeftRadius")) >= 6);
      const block = page.locator("#blocks .basalt-marks-mark").first();
      assert.equal(await css(block, "borderTopLeftRadius"), "8px");
      assert.equal(await css(block, "borderBottomLeftRadius"), "8px");
      assert.ok((await box(block)).width <= 44.01);
      const rest = await box(page.locator("#blocks .basalt-marks-rest"));
      assert.equal(rest.width, 6);
      assert.equal(rest.height, 6);
      assert.match(await css(page.locator("#columns .basalt-marks-seat"), "backgroundImage"), /repeating-linear-gradient\(45deg/);
      assert.equal(await css(page.locator("#columns .basalt-marks-seat"), "borderTopStyle"), "none");
    });

    test("a mark's height is its share of the cap, and a taller one reaches brighter ink (the gradient is in the row's coordinates)", async () => {
      const { page } = await scenePage({ scene: "marks", marks: { columns: [6000, 12000, 3000, 24000], pills: [270, 270], blocks: [45, 90] } }, { theme });
      const hs = await page.locator("#columns .basalt-marks-mark").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      assert.deepEqual(hs.map((h) => Math.round(h)), [28, 56, 14, 56], "a reading past the cap stands full");
      const size = await css(page.locator("#columns .basalt-marks-mark").first(), "backgroundSize");
      assert.equal(size.split(" ")[1], "56px", "one gradient for the row: its height is the row's");
    });

    test("every form takes the row's gradient: a short and a tall mark of a column, a pill and a block sample the same ink at the same height in the row (vote 1, plot coordinates)", async () => {
      const cases = [["columns", [3000, 12000], "bottom", 7], ["pills", [150, 540], "centre", 3], ["blocks", [20, 90], "bottom", 6]];
      for (const [kind, values, from, offset] of cases) {
        const { page } = await scenePage({ scene: "marks", marks: { [kind]: values } }, { theme });
        const row = await box(page.locator(`#${kind}`));
        const marks = page.locator(`#${kind} .basalt-marks-mark`);
        const short = await box(marks.nth(0));
        const tall = await box(marks.nth(1));
        assert.ok(short.height < tall.height - 8, `${kind}: a short and a tall mark`);
        const y = Math.round(from === "bottom" ? row.bottom - offset : row.y + row.height / 2 - offset);
        assert.ok(y > short.y && y < short.bottom && y > tall.y && y < tall.bottom, `${kind}: the sampled height is inside both marks`);
        const ink = async (mark) => (await pixels(page, { x: Math.round(mark.x + mark.width / 2), y, width: 1, height: 1 }))[0];
        const a = await ink(short);
        const b = await ink(tall);
        for (let c = 0; c < 3; c++) assert.ok(Math.abs(a[c] - b[c]) <= 2, `${kind}: the short mark's ink ${a} and the tall mark's ${b} at the same height in the row`);
        // and the gradient is one whose height is the row's, centred or bottom-anchored on the row
        const size = (await css(marks.first(), "backgroundSize")).split(" ");
        assert.equal(size[1], "56px", `${kind}: the gradient is as tall as the row`);
        await page.close();
      }
    });

    test("new values glide to their heights over duration-slow; under reduced motion they snap; the row's box does not change", async () => {
      const { page } = await scenePage({ scene: "marks" }, { theme });
      const mark = page.locator("#columns .basalt-marks-mark").first();
      assert.match(await css(mark, "transitionProperty"), /height/);
      assert.equal(await css(mark, "transitionDuration"), "0.2s");
      const row = await box(page.locator("#columns"));
      await configure(page, { marks: { columns: [12000, 1200, 6000, 3000, 0, 9000, 9000, 9000, 9000, 9000, 9000, 9000] } });
      assert.deepEqual(await box(page.locator("#columns")), row, "the row is as tall and as wide as it was");
    });

    test("the row is an image when it has a label, with its words, and nothing else is announced", async () => {
      const { page } = await scenePage({ scene: "marks" }, { theme });
      assert.equal(await page.locator("#columns").getAttribute("role"), "img");
      assert.equal(await page.locator("#columns").getAttribute("aria-label"), "columns row");
    });

    test("axe: no violations", async () => {
      const { page } = await scenePage({ scene: "marks" }, { theme });
      assert.deepEqual(await axe(page, "#host"), []);
    });
  });

  describe(`${theme}: the range meter (D7d, vote 18, consent rows 14 and 15)`, () => {
    test("role=meter, the plan in its value text, two target ticks drawn from one scale, a ringed 12px marker, no fill and no band", async () => {
      const { page } = await scenePage({ scene: "meter" }, { theme });
      const meter = page.locator("#rm");
      assert.equal(await meter.getAttribute("role"), "meter");
      assert.equal(await meter.getAttribute("aria-valuetext"), "0.9 lb a week, inside the plan of 0.5 to 1 lb a week");
      assert.equal(await page.locator(".basalt-meter-fill, .basalt-meter-band").count(), 0);
      const ticks = page.locator(".basalt-meter-tick");
      assert.equal(await ticks.count(), 2);
      const track = await box(page.locator(".basalt-meter-track"));
      const inner = track.width - 2;
      const at = async (locator) => { const b = await box(locator); return (b.x + b.width / 2 - track.x - 1) / inner; };
      assert.ok(Math.abs((await at(ticks.nth(0))) - 0.5 / 1.5) < 0.005);
      assert.ok(Math.abs((await at(ticks.nth(1))) - 1.0 / 1.5) < 0.005);
      assert.ok(Math.abs((await at(page.locator(".basalt-range-marker"))) - 0.9 / 1.5) < 0.005, "the marker is on the same scale");
      const marker = await box(page.locator(".basalt-range-marker"));
      assert.equal(marker.width, 16, "a 12px dot and a 2px ring");
      assert.equal(await tokenPx(page, "size-meter-marker"), 12);
      assert.equal(await css(page.locator(".basalt-range-marker"), "borderTopWidth"), "2px");
      assert.equal(await css(ticks.first(), "backgroundColor"), await token(page, "text-secondary", "backgroundColor"));
      assert.equal(await css(page.locator(".basalt-meter-track"), "backgroundColor"), "rgba(0, 0, 0, 0)");
      assert.equal(await css(page.locator(".basalt-meter-track"), "borderTopWidth"), "1px");
    });

    test("a new reading moves the marker and nothing else: the head, the slot and the foot are 0px apart; the slot never rescales", async () => {
      const { page } = await scenePage({ scene: "meter" }, { theme });
      const measure = async () => ({ head: await box(page.locator(".basalt-meter-head")), track: await box(page.locator(".basalt-meter-track")), foot: await box(page.locator(".basalt-meter-foot")), ticks: await page.locator(".basalt-meter-tick").evaluateAll((e) => e.map((x) => x.getBoundingClientRect().x)) });
      const before = await measure();
      for (const value of [0.2, 1.4, 2.5, 0.5]) {
        await configure(page, { value });
        const after = await measure();
        assert.deepEqual(after, before, `value ${value}`);
      }
      await configure(page, { value: 0.2 });
      assert.match(await page.locator("#rm").getAttribute("aria-valuetext"), /under the plan/);
      await configure(page, { value: 1.4 });
      assert.match(await page.locator("#rm").getAttribute("aria-valuetext"), /over the plan/);
    });

    test("the foot is one 16px line at 390", async () => {
      const { page } = await scenePage({ scene: "meter", width: 340 }, { theme, viewport: { width: 390, height: 900 } });
      assert.equal((await box(page.locator(".basalt-meter-foot"))).height, 16);
    });

    test("axe: no violations", async () => {
      const { page } = await scenePage({ scene: "meter" }, { theme });
      assert.deepEqual(await axe(page, "#host"), []);
    });
  });
}

describe("forced colours and reduced motion", () => {
  test("in forced colours the lit marks, the share bar, the coverage cells and the marker are the system text colour, and the plate is an outline", async () => {
    const { page } = await scenePage({ scene: "bars", lit: true }, { forcedColors: "active" });
    const text = await resolve(page, "CanvasText");
    assert.equal(await css(page.locator("svg.basalt-chart-svg .basalt-chart-bar").first(), "fill"), text);
    await configure(page, { scene: "trend" });
    assert.equal(await css(page.locator(".basalt-chart-line"), "stroke"), text);
    assert.equal(await css(page.locator(".basalt-chart-reading").first(), "fill"), text);
    await configure(page, { scene: "share" });
    assert.equal(await css(page.locator(".basalt-share-bar").first(), "backgroundColor"), text);
    await configure(page, { scene: "coverage" });
    assert.equal(await css(page.locator("#strip .basalt-coverage-cell").first(), "backgroundColor"), text);
    assert.match(await css(page.locator("#strip .basalt-coverage-cell").nth(12), "backgroundImage"), /repeating-linear-gradient/);
    await configure(page, { scene: "meter" });
    assert.equal(await css(page.locator(".basalt-range-marker"), "backgroundColor"), text);
    await configure(page, { scene: "phase" });
    assert.equal(await css(page.locator(".basalt-chart-span"), "borderTopWidth"), "1px");
    assert.equal(await css(page.locator(".basalt-chart-span"), "backgroundColor"), "rgba(0, 0, 0, 0)");
  });
});

// The council's prototype data (the same as test/fixtures/figure-data.ts, which the page bundle imports).
const EVENTS = [0, 0, 3, 5, 0, 1, 0, 0, 7, 12, 4, 0, 0, 2, 9, 9, 3, 1, 0, 0, null, 6, 8, 2, 0, 0, 0, 4, 11, 5];
const events = (value) => `${value} ${value === 1 ? "event" : "events"}`;

for (const theme of THEMES) {
  describe(`${theme}: the short bar plot (DECISIONS 160, the owner's choice for vote 10)`, () => {
    const geometry = (page) => page.evaluate(() => {
      const svg = document.querySelector("svg.basalt-chart-svg");
      const days = [...document.querySelectorAll(".basalt-chart-day")];
      const bars = [...svg.querySelectorAll(".basalt-chart-bar")].map((b) => ({ x: Number(b.getAttribute("x")), y: Number(b.getAttribute("y")), w: Number(b.getAttribute("width")), h: Number(b.getAttribute("height")), rx: b.getAttribute("rx") }));
      const left = (e) => parseFloat(e.style.left);
      return {
        figure: document.querySelector("figure").getBoundingClientRect().width,
        plot: document.querySelector(".basalt-chart-plot").getBoundingClientRect().width,
        svgWidth: Number(svg.getAttribute("width")),
        x0: left(days[0]),
        right: left(days[days.length - 1]) + parseFloat(days[days.length - 1].style.width),
        slot: parseFloat(days[0].style.width),
        plotH: parseFloat(days[0].style.height),
        bars,
        grid: svg.querySelectorAll(".basalt-chart-grid").length,
        baseline: [...svg.querySelectorAll(".basalt-chart-baseline")].map((l) => Number(l.getAttribute("y1"))),
        texts: [...svg.querySelectorAll("text")].map((t) => t.textContent),
        hatch: [...svg.querySelectorAll(".basalt-chart-hatch")].map((h) => ({ h: Number(h.getAttribute("height")), x: Number(h.getAttribute("x")) })),
      };
    });

    test("with the prop the plot draws no gridline, no y label and no gutter, and takes the figure's width; without it the same chart keeps them", async () => {
      const { page } = await scenePage({ scene: "short", compact: true, width: 560 }, { theme });
      const a = await geometry(page);
      assert.equal(a.grid, 0, "no gridlines");
      assert.deepEqual(a.texts.filter((t) => /^[\d,.]+$/.test(t)), [], "no y labels");
      assert.equal(a.x0, 0, "no gutter: the first day starts at the plot's edge");
      assert.equal(a.svgWidth, a.plot);
      assert.equal(a.plot, a.figure, "the plot is the figure's width");
      assert.equal(a.plotH, 96, "the plot is the short height");
      assert.equal(a.baseline.length, 1, "the baseline at zero stays");
      await configure(page, { compact: false });
      const b = await geometry(page);
      assert.ok(b.grid >= 2, `the same chart without the prop has gridlines (${b.grid})`);
      assert.ok(b.texts.filter((t) => /^[\d,.]+$/.test(t)).length >= 3, "and y labels");
      assert.ok(b.x0 > 16, `and a gutter (${b.x0}px)`);
      assert.equal(b.plotH, 96);
    });

    test("the bars are the chart's own: the same 60%-of-the-day rule, square at both ends, the same baseline and the same heights as the chart without the prop; zero draws no bar", async () => {
      const { page } = await scenePage({ scene: "short", compact: true, width: 560 }, { theme });
      const a = await geometry(page);
      await configure(page, { compact: false });
      const b = await geometry(page);
      const rule = (g) => Math.max(2, Math.min(24, Math.round(g.slot * 0.6)));
      for (const g of [a, b]) {
        assert.ok(g.bars.every((bar) => bar.w === rule(g)), `every bar is ${rule(g)}px wide`);
        assert.ok(g.bars.every((bar) => bar.rx === null), "square at both ends");
      }
      assert.equal(a.bars.length, 17, "seventeen days have a value above zero");
      assert.equal(EVENTS.filter((v) => v != null && v > 0).length, 17);
      assert.deepEqual(a.baseline, b.baseline, "the same baseline");
      assert.deepEqual(a.bars.map((bar) => [bar.y, bar.h]), b.bars.map((bar) => [bar.y, bar.h]), "the same heights, bar for bar: the scale is the chart's own");
      assert.ok(a.slot > b.slot, "the bars sit further apart: the plot is wider");
    });

    test("a day not observed is the hatch over the full plot height with its words, and a zero day has a name of its own", async () => {
      const { page } = await scenePage({ scene: "short", compact: true, width: 560 }, { theme });
      const g = await geometry(page);
      assert.equal(g.hatch.length, 1);
      assert.equal(g.hatch[0].h, 96);
      assert.ok(g.texts.includes("Not observed"), "the lane says it in words");
      const days = page.locator(".basalt-chart-day");
      assert.match(await days.nth(20).getAttribute("aria-label"), /Sunday 1 November.*not observed/i);
      assert.match(await days.nth(0).getAttribute("aria-label"), /Events 0 events/);
      assert.equal(await page.locator(".basalt-chart-legend .basalt-chart-name", { hasText: "Not observed" }).count(), 1, "the legend keys it");
    });

    test("the keys reach every day, the readout names each, there is no live region, and the table has a row a day", async () => {
      const { page } = await scenePage({ scene: "short", compact: true, width: 560 }, { theme });
      assert.equal(await page.locator("figure [aria-live]").count(), 0);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Home");
      for (let i = 0; i < 30; i++) {
        const focused = await page.evaluate(() => Number(document.activeElement.dataset.i));
        assert.equal(focused, i, `day ${i} has focus`);
        const value = await page.locator(".basalt-chart-value [data-part=value]").first().innerText();
        const wanted = EVENTS[i] == null ? "Not observed" : events(EVENTS[i]);
        assert.equal(value, wanted, `the readout names day ${i}`);
        if (i < 29) await page.keyboard.press("ArrowRight");
      }
      await page.keyboard.press("PageUp");
      assert.equal(await page.evaluate(() => Number(document.activeElement.dataset.i)), 22);
      await page.keyboard.press("Home");
      assert.equal(await page.evaluate(() => Number(document.activeElement.dataset.i)), 0);
      await page.keyboard.press("End");
      assert.equal(await page.evaluate(() => Number(document.activeElement.dataset.i)), 29);
      await page.getByRole("button", { name: "View as table" }).click();
      assert.equal(await page.locator("tbody tr").count(), 30);
      assert.equal(await page.locator("tbody tr").filter({ hasText: "Sun 1 Nov" }).getByText("Not observed").count(), 1);
    });

    test("nothing moves: picking days and opening the table move neither the plot nor the legend", async () => {
      const { page } = await scenePage({ scene: "short", compact: true, width: 560 }, { theme });
      const measure = async () => ({ plot: await box(page.locator(".basalt-chart-plot")), key: await box(page.locator(".basalt-chart-key")), legend: await box(page.locator(".basalt-chart-legend")), svg: await box(page.locator("svg.basalt-chart-svg")) });
      const rest = await measure();
      await page.keyboard.press("Tab");
      for (let i = 0; i < 29; i++) {
        await page.keyboard.press("ArrowLeft");
        await frames(page, 1);
        const m = await measure();
        for (const key of Object.keys(rest)) for (const prop of ["x", "y", "width", "height"]) assert.ok(Math.abs(m[key][prop] - rest[key][prop]) < 0.001, `day ${i}: ${key}.${prop} moved`);
      }
      await page.getByRole("button", { name: "View as table" }).click();
      const open = await measure();
      for (const key of Object.keys(rest)) for (const prop of ["x", "y", "width", "height"]) assert.ok(Math.abs(open[key][prop] - rest[key][prop]) < 0.001, `table: ${key}.${prop} moved`);
    });

    test("at 560 and 320 nothing overflows and the plot is the figure's width", async () => {
      for (const [viewport, width] of [[{ width: 600, height: 900 }, 560], [{ width: 340, height: 900 }, 320]]) {
        const { page } = await scenePage({ scene: "short", compact: true, width }, { theme, viewport });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${width}: no horizontal overflow`);
        const g = await geometry(page);
        assert.equal(g.plot, width);
        assert.equal(g.figure, width);
        assert.ok(g.bars.every((bar) => bar.x >= 0 && bar.x + bar.w <= g.plot), "every bar is inside the plot");
        assert.ok(g.right <= g.plot);
        await page.close();
      }
    });

    test("it is ignored where no look was decided: a line chart, the 240px plot, and a second series keep their gridlines and labels", async () => {
      const lineSeries = [{ id: "a", name: "Events", values: EVENTS }, { id: "b", name: "Other", values: EVENTS.map((v) => (v == null ? v : v + 1)) }];
      for (const cfg of [{ kind: "line", series: lineSeries }, { plotSize: "md" }]) {
        const { page } = await scenePage({ scene: "short", compact: true, width: 560, ...cfg }, { theme });
        const g = await geometry(page);
        assert.ok(g.grid >= 2 && g.x0 > 16, `${JSON.stringify(cfg.kind ?? cfg.plotSize)} keeps its gridlines and gutter`);
        await page.close();
      }
      const { page } = await scenePage({ scene: "short", compact: true, width: 560, series: [{ id: "a", name: "Events", values: EVENTS }, { id: "b", name: "Other", values: EVENTS }] }, { theme });
      assert.equal(await page.locator(".basalt-chart-entry").filter({ hasText: "Other" }).count(), 0, "a bar chart takes one series");
    });

    test("the entrance is TimeChart's own: the bars scale from their baseline on a replay", async () => {
      const { page } = await scenePage({ scene: "short", compact: true, width: 560, entrance: "replay" }, { theme });
      const kinds = await page.evaluate(() => document.getAnimations().map((a) => a.effect?.target?.getAttribute?.("class") ?? ""));
      assert.ok(kinds.filter((c) => /basalt-chart-bar/.test(c)).length >= 17, "each bar enters");
    });

    test("axe: the short bar plot, with its table open, has no violations", async () => {
      const { page } = await scenePage({ scene: "short", compact: true, width: 560 }, { theme });
      assert.deepEqual(await axe(page, "figure.basalt-chart"), []);
      await page.getByRole("button", { name: "View as table" }).click();
      assert.deepEqual(await axe(page, "figure.basalt-chart"), []);
    });
  });
}
