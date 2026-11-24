// The motion rules in the HTML skill (DECISIONS 136 and 139): the chart's entrance, the ambient loop, and the loops toggle's icon form, each as React has
// it (packages/react/test/motion-*.test.mjs). A page composed from a body, opened in Chromium on a fake host. Every test would fail on origin/main:
// there is no `entrance` option, no ambient module and no icon toggle there.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// A page that is not on the fake clock sees time at a tenth of its pace for its first three seconds, so the entrance's "a script that starts after a second draws at rest" gate
// reads the page's order of events and never the machine's speed (that rule has its own test, which is not given this).
const NOWMOCK = `(() => { const real = performance.now.bind(performance); const base = real(); performance.now = () => { const t = real() - base; return t < 3000 ? t / 10 : t - 2700; }; })();`;
// With `window.__pause` every animation is held at its first frame as it is made, so what a test reads is the instant it set, not a moment the machine's speed chose.
const RECORD = `(() => {
  const real = Element.prototype.animate;
  window.__anims = [];
  Element.prototype.animate = function (keyframes, options) {
    const animation = real.call(this, keyframes, options);
    if (window.__pause) animation.pause();
    const box = this.getBoundingClientRect();
    window.__anims.push({ cls: this.getAttribute("class") || this.tagName, keyframes: JSON.parse(JSON.stringify(keyframes)), duration: options.duration, delay: options.delay || 0, easing: options.easing, fill: options.fill, height: box.height });
    return animation;
  };
})();`;

const DAYS = Array.from({ length: 12 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
const chartJson = (extra = {}) => JSON.stringify({
  title: "Training", source: "Watch", kind: "bar", unit: "min", summary: "Training averaged 54 min a day.", days: DAYS, entrance: true,
  series: [{ id: "t", name: "Training", values: [48, 52, 61, 40, 55, 70, 38, 49, 60, 66, 44, 51] }], format: { suffix: " min", spoken: " minutes", maximumFractionDigits: 0 }, ...extra,
});
const CHART = (extra) => `<!-- basalt:use loops --><main class="page"><p id="words">Training this month.</p><figure class="chart" id="main-chart"><script type="application/json" data-chart>${chartJson(extra)}</script></figure></main>`;

const OPTIONS = (extra = {}) => ({ ...JSON.parse(chartJson(extra)), series: [{ id: "t", name: "Training", values: [80, 20, 35, 90, 25, 40, 75, 30, 55, 20, 85, 45] }] });

// 25 ambient marks in a stage's art, and one outside it; the icon toggle and the button form.
const marks = Array.from({ length: 26 }, (_, i) => `<span class="ambient-mark" data-ambient data-i="${i}" style="left: ${8 + (i % 13) * 40}px; top: ${8 + Math.floor(i / 13) * 40}px"></span>`).join("");
const STAGE = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Placeholder home">Placeholder</a><span class="spacer"></span>
  <button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>
  <button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header>
<section class="stage"><div class="stage-art" aria-hidden="true">${marks}</div><div class="stage-content"><div class="page"><h1>Placeholder</h1>
  <button class="btn" data-loops-toggle aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Pause animations</button>
  <span class="ambient-mark" data-ambient id="plain"></span> <span class="spinner" role="status" aria-label="Working"></span></div></div></section>`;

async function open(body, { scheme = "dark", width = 1440, reducedMotion, forcedColors, media, held = false, hidden = false, late = 0, context, clock = false } = {}) {
  context ??= await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion, forcedColors });
  const html = compose(`<title>Motion</title>${body}`, { fonts: false }).html.replace("</head>", `${clock || late ? "" : `<script>${NOWMOCK}</script>`}<script>${RECORD}</script>${clock ? "<script>window.__pause = true</script>" : ""}${held ? '<script>document.documentElement.setAttribute("data-loops","held")</script>' : ""}${hidden ? '<script>Object.defineProperty(document,"visibilityState",{get:()=>"hidden"})</script>' : ""}</head>`);
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (media) await page.emulateMedia(media);
  if (late) await page.route("https://basalt.test/**", async (route) => { await new Promise((r) => setTimeout(r, late)); await route.fulfill({ contentType: "text/html", body: html }); });
  // A clocked page runs timers and frames only when the test says so (Playwright's fake clock, paused at 700ms of page time: the entrance's late gate is 1000, and the pause must not be set in the past on a loaded machine), and holds its animations: the entrance's own timer and the elapsed time its
  // redraws read are then exactly what the test set.
  if (clock) { await page.clock.install({ time: 0 }); await page.clock.pauseAt(700); }
  await page.goto("https://basalt.test/");
  if (clock) await page.clock.runFor(32);
  else await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { page, errors, context };
}
const anims = (page) => page.evaluate(() => window.__anims);
/** Moves the pointer over the plot's middle (and then a little along), which picks a day and redraws the svg. */
const hoverPlot = async (page) => { const b = await page.locator(".chart-plot").boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2); };
const seen = (page) => page.evaluate(() => { try { return localStorage.getItem("basalt-entrance:/"); } catch { return "blocked"; } });

describe("the chart's entrance", () => {
  test("every bar scales from its baseline over 600ms on ease-out, staggered, every start within 200ms", async () => {
    const { page, errors } = await open(CHART());
    const list = (await anims(page)).filter((a) => a.keyframes.some((k) => k.transform));
    assert.ok(list.length >= 12, `${list.length} bars`);
    for (const a of list) {
      assert.equal(a.duration, 600);
      assert.match(a.easing, /cubic-bezier\(0?\.16, ?1, ?0?\.3, ?1\)/);
      assert.equal(a.fill, "backwards");
      assert.deepEqual(a.keyframes.map((k) => k.transform), ["scaleY(0)", "scaleY(1)"]);
      assert.ok(a.height < 1, `a bar is ${a.height}px tall in its first frame`);
    }
    const delays = list.map((a) => a.delay);
    assert.ok(delays[1] - delays[0] > 0 && delays[1] - delays[0] <= 22 + 1e-9);
    assert.ok(Math.max(...delays) <= 200 + 1e-9);
    assert.deepEqual(errors, []);
    await page.context().close();
  });
  test("the same marks, timing and curve as React's chart: bars scale, a solid line draws, a mark fades", async () => {
    const { page } = await open(CHART({ kind: "line", series: [{ id: "a", name: "A", values: [4, 6, 5, 8, 7, 9, 6, 5, 7, 8, 9, 7] }, { id: "b", name: "B", values: [3, 4, 4, 5, 6, 6, 5, 4, 5, 6, 7, 6] }] }));
    const list = await anims(page);
    const props = new Set(list.flatMap((a) => a.keyframes.flatMap((k) => Object.keys(k))).filter((k) => !["offset", "easing", "composite"].includes(k)));
    assert.deepEqual([...props].sort(), ["opacity", "strokeDashoffset"]);
    const lines = list.filter((a) => a.keyframes.some((k) => k.strokeDashoffset !== undefined));
    // The svg is drawn again when its box is first observed, and each draw starts its marks: one solid line draws each time, the dashed one only fades.
    assert.equal(new Set(lines.map((a) => a.keyframes[0].strokeDashoffset)).size, 1, "one solid line draws; the dashed one fades (a dash cannot be drawn along its length)");
    for (const a of list) assert.equal(a.duration, 600);
    await page.context().close();
  });
  test("words and the frame are at rest and the page's path is stored only when it finishes", async () => {
    const { page } = await open(CHART(), { clock: true });
    assert.equal(await seen(page), null);
    await page.clock.runFor(150);
    assert.equal(await seen(page), null, "not stored 150ms in");
    const opacity = await page.evaluate(() => ["#words", ".chart-title", ".chart-axis", ".chart-summary"].map((s) => getComputedStyle(document.querySelector(s)).opacity));
    assert.deepEqual(opacity, ["1", "1", "1", "1"]);
    await page.clock.runFor(600);
    assert.equal(await seen(page), null, "not stored 750ms in: the last mark is not over until its own 600ms after its start");
    await page.clock.runFor(400);
    assert.equal(await seen(page), "seen", "stored when the entrance finishes");
    await page.context().close();
  });
  test("a hover mid-entrance redraws the svg and the marks carry on from the elapsed time, not from zero", async () => {
    const { page } = await open(CHART(), { clock: true });
    await page.clock.runFor(68); // 100ms into the entrance on the page's clock (the first draw was at 32)
    await hoverPlot(page);
    await page.clock.runFor(1);
    const state = await page.evaluate(() => { const bar = document.querySelector(".chart-svg .chart-bar"); return { running: document.querySelector(".chart-svg").getAnimations({ subtree: true }).length, scale: new DOMMatrixReadOnly(getComputedStyle(bar).transform).d }; });
    assert.ok(state.running > 0, "still entering");
    assert.ok(state.scale > 0.4, `the first bar is ${state.scale} of the way after the redraw`);
    await page.context().close();
  });
  test("a second visit, reduced motion, the hold, a hidden tab, print and a late script draw it at rest", async () => {
    const first = await open(CHART());
    await first.page.waitForFunction(() => localStorage.getItem("basalt-entrance:/") === "seen", null, { timeout: 4000 });
    await first.page.reload();
    await first.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.equal((await anims(first.page)).length, 0, "a second visit");
    await first.context.close();
    for (const options of [{ reducedMotion: "reduce" }, { held: true }, { hidden: true }, { media: { media: "print" } }]) {
      const { page } = await open(CHART(), options);
      assert.equal((await anims(page)).length, 0, JSON.stringify(options));
      assert.equal(await seen(page), null, "nothing is stored when nothing played");
      await page.context().close();
    }
  });
  test("a chart that did not ask is drawn at rest", async () => {
    const { page } = await open(CHART({ entrance: false }));
    assert.equal((await anims(page)).length, 0);
    await page.context().close();
  });
  test("the hold arriving mid-entrance draws it at rest and counts the visit as seen", async () => {
    const { page } = await open(CHART(), { clock: true });
    await page.clock.runFor(100);
    await page.evaluate(() => Basalt.loops.set(true));
    assert.equal(await seen(page), "seen");
    const running = await page.evaluate(() => document.querySelector(".chart-svg").getAnimations({ subtree: true }).length);
    assert.equal(running, 0);
    await page.context().close();
  });
});

const ambients = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "bh-ambient").map((a) => ({
  period: a.effect.getTiming().duration, delay: a.effect.getTiming().delay, state: a.playState, start: Number(a.startTime),
  props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)))],
  easing: a.effect.getKeyframes().map((k) => k.easing), low: Math.min(...a.effect.getKeyframes().map((k) => Number(k.opacity ?? 1))),
})));

describe("the ambient loop", () => {
  test("24 marks loop, opacity only, 1 to 0.2 on ease-in-out, each on its own period and phase; the 25th and one outside the art do not", async () => {
    const { page, errors } = await open(STAGE);
    const list = await ambients(page);
    assert.equal(list.length, 24);
    for (const a of list) {
      assert.deepEqual(a.props, ["opacity"]);
      assert.equal(a.low, 0.2);
      assert.ok(a.easing.every((e) => /cubic-bezier\(0\.65, 0, 0\.35, 1\)/.test(e)));
      assert.ok(a.period >= 3600 - 0.5 && a.period <= 8400 + 0.5);
      assert.ok(a.delay < 0 && a.delay > -a.period);
    }
    assert.equal(new Set(list.map((a) => `${Math.round(a.period)}|${Math.round(a.delay)}`)).size, 24, "no two in step");
    assert.equal(await page.evaluate(() => document.querySelectorAll(".stage-art [data-ambient]").length), 24, "the script takes the attribute off the 25th and 26th");
    assert.equal(await page.evaluate(() => document.getElementById("plain").getAnimations().length), 0);
    assert.equal(await page.evaluate(() => Math.max(...[...document.querySelectorAll(".stage-art [data-ambient]")].map((e) => e.getBoundingClientRect().width))), 6);
    assert.deepEqual(errors, []);
    await page.context().close();
  });
  test("the same periods and phases as React's marks, mark for mark", async () => {
    const { page } = await open(STAGE);
    const list = await ambients(page);
    const react = await import("../../../packages/react/dist/ambient-timing.js");
    list.forEach((a, i) => {
      const t = react.ambientTiming(i);
      assert.ok(Math.abs(a.period - 6000 * Number(t.period.toFixed(3))) < 1, `period ${i}`);
      assert.ok(Math.abs(a.delay + 6000 * Number(t.period.toFixed(3)) * Number(t.phase.toFixed(3))) < 1, `phase ${i}`);
    });
    await page.context().close();
  });
  test("the hold stops every mark and the spinner at full opacity; releasing rejoins the shared clock", async () => {
    const { page } = await open(STAGE);
    await page.click(".stage-content .btn[data-loops-toggle]");
    assert.equal((await ambients(page)).length, 0);
    assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "bh-spin").length), 0);
    assert.ok(await page.evaluate(() => [...document.querySelectorAll(".stage-art [data-ambient]")].every((e) => getComputedStyle(e).opacity === "1")));
    await page.click(".stage-content .btn[data-loops-toggle]");
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const again = await ambients(page);
    assert.equal(again.length, 24);
    assert.ok(again.every((a) => a.start === 0));
    await page.context().close();
  });
  test("it is still under reduced motion, in forced colours and in print", async () => {
    for (const options of [{ reducedMotion: "reduce" }, { forcedColors: "active" }, { media: { media: "print" } }, { held: true }]) {
      const { page } = await open(STAGE, options);
      assert.equal((await ambients(page)).length, 0, JSON.stringify(options));
      await page.context().close();
    }
  });
});

describe("the icon toggle", () => {
  test("it keeps its name, sets aria-pressed, and draws the pause glyph at rest and selected", async () => {
    const { page, errors } = await open(STAGE);
    const icon = page.locator("header .btn[data-loops-toggle]");
    const rest = await icon.locator("[data-pair] > svg").first().innerHTML();
    const react = await import("../../../packages/react/dist/glyphs/pause.js");
    assert.ok(rest.includes("M8.5 5C8.5 9.667 8.5 14.333 8.5 19") && rest.includes("M15.5 5C15.5 9.667 15.5 14.333 15.5 19"), "the core pause glyph: two bars");
    assert.ok(react.PauseGlyph, "React draws the same glyph");
    const fill = () => icon.evaluate((e) => getComputedStyle(e).backgroundColor);
    const plate = await fill();
    assert.equal(await icon.getAttribute("aria-pressed"), "false");
    await icon.click();
    await page.mouse.move(700, 600);
    assert.equal(await icon.getAttribute("aria-pressed"), "true");
    assert.equal(await icon.getAttribute("title"), "Pause animations");
    assert.equal(await icon.getAttribute("aria-label"), null, "no aria-label beside the title");
    assert.notEqual(await fill(), plate, "pressed is the plate");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    assert.equal(await page.locator(".stage-content .btn[data-loops-toggle]").getAttribute("aria-pressed"), "true", "the other form follows");
    await icon.click();
    assert.equal(await icon.locator("[data-pair] > svg").first().innerHTML(), rest);
    assert.equal(await icon.getAttribute("aria-pressed"), "false");
    assert.deepEqual(errors, []);
    await page.context().close();
  });
  // DECISIONS 361: held, pause's bars fill. Both forms are in one box from the start, aria-pressed shows the one that matches, and the two crossfade over
  // duration-fast (with or without reduced motion); a state set on load paints at once. Written while tests are paused; run when they resume.
  test("held, its bars fill: both forms in one box, the held one shown by aria-pressed, a 100ms crossfade both ways", async () => {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const { page, errors } = await open(STAGE, { reducedMotion });
      const icon = page.locator("header .btn[data-loops-toggle]");
      const forms = () => icon.locator("[data-pair] > svg").evaluateAll((svgs) => svgs.map((s) => [Number(getComputedStyle(s).opacity), s.querySelectorAll('path[fill="currentColor"]').length, getComputedStyle(s).transitionDuration]));
      assert.equal(await icon.locator("svg").count(), 2, "rest and held, one box");
      assert.deepEqual((await forms()).map((f) => f.slice(0, 2)), [[1, 0], [0, 1]], `${reducedMotion}: the bars at rest; the held form is filled and hidden`);
      assert.deepEqual((await forms()).map((f) => f[2]), ["0.1s", "0.1s"], `${reducedMotion}: duration-fast`);
      const box = await icon.locator("[data-pair]").boundingBox();
      await icon.click();
      await page.mouse.move(700, 600);
      await page.waitForTimeout(200);
      assert.deepEqual((await forms()).map((f) => f[0]), [0, 1], `${reducedMotion}: held shows the filled bars`);
      assert.deepEqual(await icon.locator("[data-pair]").boundingBox(), box, "the box does not move");
      assert.equal(await icon.locator("svg").count(), 2, "the same two drawings: nothing is redrawn");
      await icon.click();
      await page.waitForTimeout(200);
      assert.deepEqual((await forms()).map((f) => f[0]), [1, 0]);
      assert.deepEqual(errors, []);
      await page.context().close();
    }
  });
  test("the Button form's seat (data-glyph=\"pause\") draws the pair, not the check", async () => {
    const { page } = await open(`<main class="page"><button class="btn" data-loops-toggle aria-pressed="false"><span class="btn-check" data-glyph="pause" aria-hidden="true"></span>Pause animations</button></main>`);
    const button = page.locator(".btn[data-loops-toggle]");
    const seat = () => button.locator(".btn-check").evaluate((s) => ({ check: getComputedStyle(s, "::before").content, forms: [...s.querySelectorAll(":scope > [data-pair] > svg")].map((g) => Number(getComputedStyle(g).opacity)) }));
    const rest = await seat();
    assert.equal(rest.check, "none", "no check where the glyph has a selected form");
    assert.deepEqual(rest.forms, [1, 0]);
    await button.click();
    await page.waitForTimeout(200);
    assert.deepEqual((await seat()).forms, [0, 1], "held: the bars filled");
    await page.context().close();
  });
  test("a stored hold opens the page pressed, with the selected glyph and the marks still", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => { try { localStorage.setItem("basalt-loops", "held"); } catch (e) { /* none */ } });
    const { page } = await open(STAGE, { context });
    assert.equal(await page.locator("header .btn[data-loops-toggle]").getAttribute("aria-pressed"), "true");
    assert.equal((await ambients(page)).length, 0);
    await page.context().close();
  });
  for (const scheme of ["dark", "light"]) for (const width of [1440, 390]) {
    test(`axe finds nothing in ${scheme} at ${width}, held and running`, async () => {
      const { page } = await open(STAGE, { scheme, width });
      for (const hold of [false, true]) {
        if (hold) await page.click(".stage-content .btn[data-loops-toggle]");
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate((cfg) => window.axe.run(document, cfg), AXE);
        assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), [], `held ${hold}`);
      }
      await page.context().close();
    });
  }
});

describe("the chart's entrance: print, the data glide and a page change (DECISIONS 143)", () => {
  const firstBar = (page) => page.evaluate(() => { const t = getComputedStyle(document.querySelector(".chart-svg .chart-bar")).transform; return !t || t === "none" ? 1 : new DOMMatrixReadOnly(t).d; });
  const live = (page) => page.evaluate(() => document.querySelector(".chart-svg").getAnimations({ subtree: true }).length);

  test("printing beginning mid-entrance settles it: print never shows a partly drawn figure (defect B)", async () => {
    const { page } = await open(CHART(), { clock: true });
    await page.clock.runFor(68);
    await hoverPlot(page); // a hover redraws the svg, which restarts the marks at the elapsed time
    await page.clock.runFor(1);
    const part = await firstBar(page);
    assert.ok(part > 0 && part < 1, `the first bar is ${part} of the way`);
    await page.emulateMedia({ media: "print" });
    // The browser reports the change when it next updates the page: step the clock a frame at a time until it has.
    for (let i = 0; i < 30 && (await live(page)) > 0; i++) await page.clock.runFor(16);
    assert.equal(await live(page), 0);
    assert.equal(await firstBar(page), 1);
    assert.equal(await seen(page), "seen");
    await page.context().close();
  });

  test("a new data set mid-entrance glides every mark from where it is drawn over duration-slow, and counts the visit as seen (item 8)", async () => {
    const { page, errors } = await open(CHART(), { clock: true });
    await page.clock.runFor(68);
    await hoverPlot(page);
    await page.clock.runFor(1);
    const before = (await anims(page)).length;
    const drawn = await firstBar(page);
    await page.evaluate((options) => Basalt.chart(document.getElementById("main-chart"), options), OPTIONS());
    await page.clock.runFor(16);
    const glides = (await anims(page)).slice(before).filter((a) => a.keyframes.some((k) => k.transform));
    assert.ok(glides.length >= 12, `${glides.length} bars take over`);
    for (const a of glides) {
      assert.equal(a.duration, 200, "over duration-slow");
      assert.match(a.easing, /cubic-bezier\(0?\.16, ?1, ?0?\.3, ?1\)/);
      assert.equal(a.keyframes[1].transform, "scaleY(1)");
      assert.equal(a.delay, 0, "no stagger: one clock");
    }
    // From where the old bar was drawn: the first old bar was `drawn` of the way up at 48 (its height times its scale), and the new bar is 80 tall.
    const first = Number(/scaleY\(([\d.e-]+)\)/.exec(glides[0].keyframes[0].transform)[1]);
    assert.ok(first > 0 && first < drawn * 2, `the first new bar starts at ${first} of its own height (the old bar was ${drawn} of its)`);
    assert.equal(await seen(page), "seen");
    assert.deepEqual(errors, []);
    await page.context().close();
  });

  test("outside an entrance a new data set is drawn at once, as it always was", async () => {
    const { page } = await open(CHART({ entrance: false }), { clock: true });
    await page.evaluate((options) => Basalt.chart(document.getElementById("main-chart"), options), OPTIONS({ entrance: false }));
    await page.clock.runFor(16);
    assert.equal((await anims(page)).length, 0);
    await page.context().close();
  });

  test("a page change without a reload counts as a load: Basalt.pageChange() measures the late gate from the change", async () => {
    const second = `<figure class="chart" id="second"></figure>`;
    const { page } = await open(`${CHART()}${second}`, { clock: true });
    await page.clock.runFor(2000);
    const count = () => page.evaluate(() => window.__anims.length);
    // Without a report the document's clock is used, as before: the page is far past its first second, so a second chart rests.
    await page.evaluate((options) => { history.pushState({}, "", "/second"); Basalt.chart(document.getElementById("second"), options); }, OPTIONS());
    await page.clock.runFor(16);
    const rest = await count();
    assert.equal((await anims(page)).slice(rest).length, 0);
    // With the change reported, the same chart on another path plays, and is stored when it finishes.
    await page.evaluate((options) => { history.pushState({}, "", "/third"); Basalt.pageChange(); Basalt.chart(document.getElementById("second"), options); }, OPTIONS());
    await page.clock.runFor(16);
    assert.ok((await anims(page)).slice(rest).filter((a) => a.keyframes.some((k) => k.transform)).length >= 12, "it plays on a first visit by link");
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-entrance:/third")), null);
    await page.clock.runFor(1000);
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-entrance:/third")), "seen");
    // A second visit to that path rests.
    const mark = await count();
    await page.evaluate((options) => { Basalt.pageChange(); Basalt.chart(document.getElementById("second"), options); }, OPTIONS());
    await page.clock.runFor(16);
    assert.equal((await anims(page)).slice(mark).length, 0);
    await page.context().close();
  });
});

// ---- DECISIONS 148 ----

const LINE = (values) => ({ ...JSON.parse(chartJson({ kind: "line" })), series: [{ id: "a", name: "A", values }] });
const ALTERNATING = [10, 90, 10, 90, 10, 90, 10, 90, 10, 90, 10, 90];
const INVERTED = ALTERNATING.map((v) => 100 - v);

describe("a real print settles the entrance, and a line glides from its drawn geometry (DECISIONS 148, fixes A and B)", () => {
  const live = (page) => page.evaluate(() => document.querySelector(".chart-svg").getAnimations({ subtree: true }).length);
  const barScale = (page) => page.evaluate(() => { const t = getComputedStyle(document.querySelector(".chart-svg .chart-bar")).transform; return !t || t === "none" ? 1 : new DOMMatrixReadOnly(t).d; });

  test("the browser's own print path, 120ms in, leaves no animation attached and the figure finished (page.pdf, beforeprint and no media change)", async () => {
    const { page } = await open(CHART(), { clock: true });
    await page.clock.runFor(68);
    await hoverPlot(page);
    await page.clock.runFor(1);
    const part = await barScale(page);
    assert.ok(part > 0 && part < 1, `the first bar is ${part} of the way before printing`);
    assert.equal(await page.evaluate(() => matchMedia("print").matches), false);
    const pdf = await page.pdf();
    assert.ok(pdf.length > 1000);
    assert.equal(await live(page), 0);
    assert.equal(await barScale(page), 1);
    assert.equal(await seen(page), "seen");
    await page.context().close();
  });

  test("beforeprint alone settles it: the event a real print fires, with the print media query unchanged", async () => {
    const { page } = await open(CHART(), { clock: true });
    await page.clock.runFor(68);
    await hoverPlot(page);
    await page.clock.runFor(1);
    const part = await barScale(page);
    assert.ok(part > 0 && part < 1);
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    assert.equal(await page.evaluate(() => matchMedia("print").matches), false);
    assert.equal(await live(page), 0);
    assert.equal(await barScale(page), 1);
    assert.equal(await seen(page), "seen");
    await page.context().close();
  });

  test("a new data set 120ms in glides a line and its markers from where they are drawn: the first point and the line's box do not jump, and the path is animated", async () => {
    const { page, errors } = await open(`<!-- basalt:use loops --><main class="page"><figure class="chart" id="main-chart"><script type="application/json" data-chart>${JSON.stringify(LINE(ALTERNATING))}</script></figure></main>`, { clock: true });
    await page.clock.runFor(68);
    await hoverPlot(page);
    await page.clock.runFor(1);
    const read = () => page.evaluate(() => { const r = (el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }; return { mark: r(document.querySelector(".chart-svg .chart-mark")), line: r(document.querySelector('.chart-svg .chart-line[data-dash="solid"]')) }; });
    const before = await read();
    const made = (await anims(page)).length;
    await page.evaluate((options) => Basalt.chart(document.getElementById("main-chart"), options), LINE(INVERTED));
    await page.clock.runFor(1);
    const after = await read();
    const worst = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    assert.ok(worst(before.mark, after.mark) <= 1, `the first marker moved ${worst(before.mark, after.mark)}px at the change`);
    assert.ok(worst(before.line, after.line) <= 1, `the line's box moved ${worst(before.line, after.line)}px at the change`);
    const fresh = (await anims(page)).slice(made);
    assert.ok(fresh.some((a) => a.keyframes.some((k) => k.d && k.strokeDashoffset !== undefined)), "the line animates its path with its dash progress");
    assert.ok(fresh.some((a) => a.keyframes.some((k) => k.transform && /^translate/.test(k.transform))), "the markers glide from their old centres");
    for (const a of fresh) assert.equal(a.duration, 200);
    assert.deepEqual(errors, []);
    await page.context().close();
  });
});

describe("the icon toggle is named by title alone, as React's is (DECISIONS 148, fix D)", () => {
  test("the skill's own usage writes the icon markup with a title and no aria-label", () => {
    const usage = fs.readFileSync(new URL("../../../.agent/skills/basalt-html/parts/usage/loops.md", import.meta.url), "utf8");
    const icon = usage.split("\n").find((line) => line.includes("data-icon-only") && line.includes("data-loops-toggle"));
    assert.ok(icon, "the usage shows the icon form");
    assert.ok(icon.includes('title="Pause animations"') && !icon.includes("aria-label"), icon);
    const menu = fs.readFileSync(new URL("../../../.agent/skills/basalt-html/parts/usage/topbar-nav.md", import.meta.url), "utf8");
    assert.ok(/Pause animations/.test(menu) && /data-loops-toggle/.test(menu), "the menu's row is in the topbar-nav usage");
  });
  test("one name in the accessibility tree, no aria-label and no description", async () => {
    const { page } = await open(STAGE);
    const client = await page.context().newCDPSession(page);
    await client.send("Accessibility.enable");
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    const toggles = nodes.filter((n) => n.role?.value === "button" && n.name?.value === "Pause animations" && !n.ignored);
    assert.ok(toggles.length >= 2, "the icon and the Button form");
    assert.deepEqual(toggles.filter((n) => n.description?.value).map((n) => n.description.value), []);
    assert.equal(await page.getAttribute("header .btn[data-loops-toggle]", "aria-label"), null);
    assert.equal(await page.getAttribute("header .btn[data-loops-toggle]", "title"), "Pause animations");
    await page.context().close();
  });
});

// A bar with links, an action and a loops toggle: at 390 the narrow menu is built, with the pause row.
const BAR = (withToggle) => `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Placeholder home">Placeholder</a>
  <nav class="topbar-links" aria-label="Primary"><a href="#product">Product</a><a href="#docs" aria-current="page">Docs</a><a href="#pricing">Pricing</a></nav><span class="spacer"></span>
  ${withToggle ? '<button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>' : ""}
  <button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button><a class="btn topbar-action" data-variant="primary" href="#start">Get started</a></div></header>
<main class="page"><p>Synthetic.</p></main>`;

describe("the skill's narrow menu has the pause row when the bar has a loops toggle (DECISIONS 148, item 2)", () => {
  const openMenu = async (page) => { await page.locator(".topbar-menu-trigger").click(); await page.waitForSelector("dialog.topbar-menu[open]"); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); };

  test("at 390 it is the first row after the band, before the links; a keyboard reaches it; pressing it holds the loops and the bar's toggle follows", async () => {
    const { page } = await open(BAR(true), { width: 390 });
    await openMenu(page);
    const order = await page.evaluate(() => [...document.querySelector("dialog.topbar-menu").children].map((c) => ["sheet-band", "topbar-menu-loops", "nav", "topbar-menu-foot"].find((k) => c.classList.contains(k))).filter(Boolean));
    assert.deepEqual(order, ["sheet-band", "topbar-menu-loops", "nav", "topbar-menu-foot"]);
    const row = await page.evaluate(() => { const b = document.querySelector(".topbar-menu-loops .btn"); const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), pressed: b.getAttribute("aria-pressed"), h: r.height, x: r.x }; });
    assert.deepEqual([row.text, row.pressed], ["Pause animations", "false"]);
    assert.ok(row.h >= 44 - 0.5, `${row.h}px tall`);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Close menu");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Pause animations");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Product");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    assert.equal(await page.getAttribute(".topbar-menu-loops .btn", "aria-pressed"), "true");
    await page.keyboard.press("Escape");
    await page.waitForSelector("dialog.topbar-menu:not([open])", { state: "attached" });
    assert.equal(await page.getAttribute(".topbar-inner [data-loops-toggle]", "aria-pressed"), "true", "the bar's own toggle shows the same state");
    await page.context().close();
  });
  test("a bar with no loops toggle has no such row, and the links start where they always did", async () => {
    const without = await open(BAR(false), { width: 390 });
    await openMenu(without.page);
    assert.equal(await without.page.locator(".topbar-menu-loops").count(), 0);
    const top = await without.page.evaluate(() => document.querySelector("dialog.topbar-menu .nav").getBoundingClientRect().top);
    await without.context.close();
    const withIt = await open(BAR(true), { width: 390 });
    await openMenu(withIt.page);
    const full = await withIt.page.evaluate(() => ({ top: document.querySelector("dialog.topbar-menu .nav").getBoundingClientRect().top, row: document.querySelector(".topbar-menu-loops").getBoundingClientRect().height }));
    assert.ok(Math.abs(full.top - top - full.row) < 0.5, "the links start one row lower and nothing else moved");
    assert.equal(await withIt.page.locator(".sheet-band [data-loops-toggle]").count(), 0, "the icon is not added to the band");
    await withIt.context.close();
  });
  for (const scheme of ["dark", "light"]) {
    test(`axe finds nothing in the open menu in ${scheme} at 390, at rest and held`, async () => {
      const { page } = await open(BAR(true), { width: 390, scheme });
      await openMenu(page);
      for (const hold of [false, true]) {
        if (hold) await page.click(".topbar-menu-loops .btn");
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate((cfg) => window.axe.run(document, cfg), AXE);
        assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), [], `held ${hold}`);
      }
      await page.context().close();
    });
  }
});
