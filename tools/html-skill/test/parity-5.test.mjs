// The fifth parity PR (figures and charts of batch 7, DECISIONS 108), in a browser: the skill's time chart (drawn from the data in its body, its reading by
// keyboard, hover and touch, its table, the missing-data hatch, narrow labels at 390, a group's shared gutter), the meter's reading, the terminal's static default,
// replay and copy, the description list and the stat's source line, held to what React gives them. parity.test.mjs compares each part's computed styles with
// React's (the chart's every drawn line and label included); this file pins behaviour. Both themes, 390 wide, touch, reduced motion, forced colours, axe.
// Anything timed runs on the shared animation clock. The data is synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { freezeAnimations, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE);
};

const DAYS = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"];
const bar = (extra = {}) => ({
  title: "Training", source: "Watch", kind: "bar", unit: "min", summary: "Training averaged 54 min a day.", now: "2026-11-10", days: DAYS, partial: 9,
  series: [{ id: "t", name: "Training", values: [48, 52, null, 61, 33, 70, 0, 45, 58, 34], reasons: [null, null, "not worn", null, null, null, null, null, null, null] }],
  plan: { kind: "value", label: "Goal", values: DAYS.map(() => 45) }, format: { suffix: " min", spoken: " minutes", maximumFractionDigits: 0 }, ...extra,
});
const line = (extra = {}) => ({
  title: "Sleep", source: "Ring and watch", kind: "line", unit: "h", tickDivisor: 60, step: 60, summary: "Ring averaged 7 h 20 m.", now: "2026-11-12", days: DAYS,
  series: [
    { id: "ring", name: "Ring", values: [440, 450, 420, null, null, 470, 480, 430, 455, 460], reasons: [null, null, null, "ring charging", "ring charging", null, null, null, null, null] },
    { id: "watch", name: "Watch", values: [430, 445, 410, 400, 415, 460, 470, 425, null, null], reasons: [null, null, null, null, null, null, null, null, "not worn, travel", "not worn, travel"] },
  ],
  plan: { kind: "band", values: DAYS.map(() => [420, 540]) }, format: { duration: "minutes" }, ...extra,
});
const figure = (data, id) => `<figure class="chart" id="${id}"><script type="application/json" data-chart>${JSON.stringify(data)}</script></figure>`;

const PAGE = `<main class="page stack">
  <h1>Figures</h1>
  ${figure(bar(), "bars")}
  ${figure(line(), "lines")}
  <div class="chart-group" id="group">${figure(bar({ title: "Group bars" }), "g1")}${figure(line({ title: "Group lines" }), "g2")}</div>
  <div class="meter" id="meter" role="meter" aria-labelledby="m1" aria-valuemin="0" aria-valuemax="3000" aria-valuenow="2240" aria-valuetext="2,240 of 3,000 min, Target 2,500 min, 760 min left" style="--value: 74.6667%; --target: 83.3333%">
    <div class="meter-head"><span class="meter-label" id="m1">Build minutes</span><span class="meter-reading"><span class="meter-value">2,240</span> of 3,000 min</span></div>
    <div class="meter-track"><span class="meter-fill"></span><span class="meter-tick"></span></div>
    <div class="meter-foot"><span class="meter-left">760 min left</span><span class="meter-target">Target 2,500 min</span></div>
  </div>
  <div class="meter" id="over" role="meter" aria-labelledby="m2" aria-valuemin="0" aria-valuemax="100000" aria-valuenow="100000" aria-valuetext="124,000 of 100,000 GB, 24,000 GB over the cap" style="--value: 124%">
    <div class="meter-head"><span class="meter-label" id="m2">Bandwidth</span><span class="meter-reading"><span class="meter-value">124,000</span> of 100,000 GB</span></div>
    <div class="meter-track"><span class="meter-fill"></span></div>
    <div class="meter-foot"><span class="meter-left" data-over>24,000 over</span></div>
  </div>
  <dl class="dlist" id="facts"><div><dt>ID</dt><dd data-mono>sb_7f3a91c2e0</dd></div><div><dt>Region</dt><dd>Ashburn</dd></div><div><dt>Owner</dt><dd><a href="#o">Go</a></dd></div><div><dt>Last seen</dt><dd data-missing>Not observed</dd></div></dl>
  <dl class="stats" id="stats"><div class="stat"><dt class="stat-label">Weight</dt><dd class="stat-value">78.4 kg</dd><dd class="stat-source"><time datetime="2026-11-10T04:41">04:41</time> <span aria-hidden="true">·</span><span class="visually-hidden">, </span> Scale</dd></div></dl>
  <figure class="code terminal" id="static"><figcaption>Deploy preview</figcaption><pre class="code-body" tabindex="0"><code>
<span data-kind="command">npm run build</span>
<span data-kind="output">vite building for production</span>
<span data-kind="done">Built in 4.2 s</span>
<span data-kind="warning">Chunk is large</span>
<span data-kind="command">git push</span>
<span data-kind="error">Rejected</span></code></pre></figure>
  <figure class="code terminal" id="replay" data-replay data-interval="600"><figcaption>Replay</figcaption><pre class="code-body" tabindex="0"><code>
<span data-kind="command">npm run build</span>
<span data-kind="output">building</span>
<span data-kind="done">Built</span></code></pre></figure>
  <figure class="code terminal" id="failing" data-replay data-interval="600" data-exit-code="1"><figcaption>Failing</figcaption><pre class="code-body" tabindex="0"><code>
<span data-kind="command">npm test</span>
<span data-kind="error">1 failed</span></code></pre></figure>
</main>`;
const html = compose(`<title>Figures</title>${PAGE}`, { fonts: false }).html;
const open = (options) => openHtml(browser, html, { permissions: ["clipboard-read", "clipboard-write"], ...options });
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => { const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))); step(count); }), n);
const token = (page, name) => page.evaluate((name) => { const probe = document.createElement("i"); probe.style.color = `var(--basalt-${name})`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, name);
const system = (page, keyword) => page.evaluate((keyword) => { const probe = document.createElement("i"); probe.style.color = keyword; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, keyword);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const dayBoxes = (page, id) => page.locator(`#${id} .chart-day`).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
const readoutDate = (page, id) => page.locator(`#${id} .chart-date [data-part=date]`).innerText();
const readoutValues = (page, id) => page.locator(`#${id} .chart-value [data-part=value]`).allInnerTexts();
const activeIndex = (page) => page.evaluate(() => Number(document.activeElement.dataset.i));

describe("the chart", () => {
  for (const theme of THEMES) {
    test(`is drawn from the data in its body, with the legend that is the readout, the hint, the table button and the summary (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      for (const id of ["bars", "lines"]) {
        const fig = page.locator(`#${id}`);
        assert.equal(await fig.locator("script").count(), 0, "the data script is taken out once it is read");
        assert.equal(await fig.locator("svg.chart-svg").count(), 1);
        assert.equal(await fig.getAttribute("aria-labelledby"), await fig.locator(".chart-title").getAttribute("id"));
        assert.equal(await fig.locator("figcaption.chart-summary").count(), 1);
        assert.equal(await fig.locator(".chart-hint[data-kbd-hint]").count(), 1);
        assert.equal(await fig.locator(".chart-toggle").getAttribute("aria-expanded"), "false");
      }
      assert.equal(await page.locator("#bars h3.chart-title").innerText(), "Training");
      assert.equal(await page.locator("#bars .chart-source").innerText(), "Watch");
      assert.equal(await readoutDate(page, "bars"), "Latest · Tue, Nov 10", "the legend opens on the latest day");
      assert.deepEqual(await readoutValues(page, "bars"), ["34 min so far", "45 min"]);
      assert.deepEqual(await page.locator("#bars .chart-entry .chart-name").allInnerTexts(), ["Training", "Goal", "Today so far", "Not observed"]);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("a page with no chart carries none of its code, and a page with one carries the art tokens, the table and the kbd chips it needs", () => {
    const plain = compose("<title>t</title><p>hello</p><dl class=\"dlist\"><div><dt>a</dt><dd>b</dd></div></dl>", { fonts: false });
    assert.ok(!plain.modules.includes("chart") && !plain.html.includes("chart-plot"), "no chart module on a page without a chart");
    assert.ok(compose("<title>t</title><figure class=\"chart\"></figure>", { fonts: false }).modules.includes("chart"));
    assert.ok(compose("<title>t</title><script type=\"application/json\" data-chart>{}</script>", { fonts: false }).modules.includes("chart"));
    for (const need of ["art", "table", "kbd"]) assert.ok(compose("<title>t</title><figure class=\"chart\"></figure>", { fonts: false }).modules.includes(need), need);
  });

  test("the plot is one tab stop with a focusable grid cell a day, named by its full sentence, and 'today' only on today's date", async () => {
    const { page, context } = await open();
    assert.equal(await page.locator("#bars .chart-days").getAttribute("role"), "grid");
    assert.equal(await page.locator("#bars .chart-days > [role=row] > .chart-day[role=gridcell]").count(), 10, "G18: the days are a grid's cells in its one row, as React's");
    assert.equal(await page.locator("#bars .chart-days").getAttribute("aria-roledescription"), "chart");
    assert.equal(await page.locator("#bars .chart-day[tabindex='0']").count(), 1, "one tab stop");
    assert.equal(await page.locator("#bars .chart-day[tabindex='-1']").count(), 9);
    const sentences = await page.locator("#bars .chart-day").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    assert.equal(new Set(sentences).size, 10, "every day has its own name");
    assert.match(sentences[9], /^Tuesday, November 10, today\. Training 34 minutes so far\. Goal 45 minutes\./, "the last day is today when `now` says so");
    assert.match(sentences[2], /Training not observed, not worn\./, "a gap day names its reason");
    const closed = (await page.locator("#lines .chart-day").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).at(-1);
    assert.ok(closed.startsWith("Tuesday, November 10. ") && !closed.includes("today"), `a range that ended before today is never 'today': ${closed}`);
    assert.match(closed, /Watch not observed, not worn, travel/);
    assert.equal(await page.locator("#bars .chart-days").getAttribute("aria-describedby"), `${await page.locator("#bars .chart-summary").getAttribute("id")} ${await page.locator("#bars .chart-days + .visually-hidden").getAttribute("id")}`);
    await context.close();
  });

  for (const theme of THEMES) {
    test(`← → move a day, Page Up and Page Down a week, Home and End the ends; the legend follows focus and never the pointer; the ring is the control ring at +2 (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      await page.locator("#lines .chart-day[tabindex='0']").focus();
      assert.equal(await activeIndex(page), 9);
      assert.equal(await readoutDate(page, "lines"), "Tue, Nov 10", "focus reads the focused day, not 'Latest'");
      await page.keyboard.press("ArrowLeft");
      assert.equal(await activeIndex(page), 8);
      assert.equal(await readoutDate(page, "lines"), "Mon, Nov 9");
      // DECISIONS 336, Q2: the legend says "Not observed" alone; the date line says why (the pixel review's finding 1).
      assert.deepEqual(await readoutValues(page, "lines"), ["455 min".replace("455 min", "7 h 35 m"), "Not observed", "7 h–9 h"], "the legend says Not observed alone");
      await page.keyboard.press("PageUp");
      assert.equal(await activeIndex(page), 1, "a week earlier");
      await page.keyboard.press("PageDown");
      assert.equal(await activeIndex(page), 8);
      await page.keyboard.press("Home");
      assert.equal(await activeIndex(page), 0);
      await page.keyboard.press("ArrowLeft");
      assert.equal(await activeIndex(page), 0, "stops at the ends");
      await page.keyboard.press("End");
      assert.equal(await activeIndex(page), 9);
      const day = page.locator("#lines .chart-day[tabindex='0']");
      const ring = await day.evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, color: s.outlineColor }; });
      assert.deepEqual([ring.style, ring.width, ring.offset], ["solid", "2px", "2px"]);
      assert.equal(ring.color, await token(page, "border-focus"));
      // the pointer elsewhere changes nothing while focus is inside
      const days = await dayBoxes(page, "lines");
      await page.mouse.move(days[2].x + days[2].width / 2, days[2].y + 30);
      assert.equal(await readoutDate(page, "lines"), "Tue, Nov 10");
      assert.equal(await page.locator("#lines .chart-plate").count(), 1, "the picked day is a plate");
      await page.keyboard.press("Tab");
      assert.notEqual(await page.evaluate(() => document.activeElement.className), "chart-day", "Tab leaves; nothing is trapped");
      await context.close();
    });

    test(`hover picks a day (a plate and the date lifting to primary) and leaving returns to the latest (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const days = await dayBoxes(page, "bars");
      await page.mouse.move(days[2].x + days[2].width / 2, days[2].y + 30);
      assert.equal(await readoutDate(page, "bars"), "Tue, Nov 3");
      assert.deepEqual(await readoutValues(page, "bars"), ["Not observed · not worn", "45 min"]);
      assert.equal(await page.locator("#bars [data-part=value][data-missing]").first().evaluate((el) => getComputedStyle(el).color), await token(page, "text-tertiary"));
      const plate = await page.locator("#bars .chart-plate").evaluate((el) => ({ x: +el.getAttribute("x"), w: +el.getAttribute("width"), fill: getComputedStyle(el).fill }));
      assert.ok(Math.abs(plate.w - days[2].width) < 0.5, "the plate is the day's whole slot");
      assert.equal(plate.fill, await token(page, "state-selected"));
      assert.equal(await page.locator("#bars .chart-axis[data-active]").evaluate((el) => getComputedStyle(el).fill), await token(page, "text-primary"));
      await page.mouse.move(5, 5);
      assert.equal(await readoutDate(page, "bars"), "Latest · Tue, Nov 10");
      assert.equal(await page.locator("#bars .chart-plate").count(), 0);
      await context.close();
    });
  }

  test("the missing-data hatch is 1px lines at 45 degrees on a 4px pitch in the input boundary colour, over the whole slot, and no bar is drawn in it", async () => {
    const { page, context } = await open();
    const hatch = await page.locator("#bars rect.chart-hatch").evaluateAll((els) => els.map((e) => ({ x: +e.getAttribute("x"), w: +e.getAttribute("width"), h: +e.getAttribute("height") })));
    assert.equal(hatch.length, 1);
    const days = await dayBoxes(page, "bars");
    assert.ok(Math.abs(hatch[0].w - days[2].width) <= 1.5, "the whole slot, not a bar's width");
    const pattern = await page.locator("#bars svg.chart-svg > defs pattern").evaluate((el) => ({ w: el.getAttribute("width"), h: el.getAttribute("height"), t: el.getAttribute("patternTransform") }));
    assert.deepEqual(pattern, { w: "4", h: "4", t: "rotate(45)" });
    const stroke = await page.locator("#bars svg.chart-svg > defs .chart-hatch-line").evaluate((el) => { const s = getComputedStyle(el); return { stroke: s.stroke, width: s.strokeWidth }; });
    assert.deepEqual(stroke, { stroke: await token(page, "border-input"), width: "1px" });
    const bars = await page.locator("#bars rect.chart-bar:not([data-so-far])").evaluateAll((els) => els.map((e) => +e.getAttribute("x")));
    assert.ok(bars.every((x) => x + 1 < hatch[0].x || x > hatch[0].x + hatch[0].w - 1), "no bar in the missing slot");
    assert.equal(await page.locator("#bars .chart-lane").first().textContent(), "Not observed · not worn", "the reason is in the lane, from where the gap starts");
    assert.equal(await page.locator("#bars .chart-swatch rect[fill^='url']").count(), 1, "and the legend's key is the hatch");
    // a line breaks at a gap: two path segments for the ring's missing days
    assert.equal(await page.locator("#lines .chart-series[data-series=ring] path.chart-line").evaluate((el) => (el.getAttribute("d").match(/M/g) ?? []).length), 2, "the line breaks and never joins a gap");
    await context.close();
  });

  test("the table is disclosed in the same figure: a still table, newest first, 'Not observed' in tertiary, the reason in its Note column and a scroll hint at 390", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    const toggle = page.locator("#bars .chart-toggle");
    assert.equal(await page.locator("#bars .chart-table").isHidden(), true);
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.equal(await toggle.innerText(), "Hide the table");
    const region = page.locator("#bars .chart-table [role=region]");
    assert.equal(await region.getAttribute("aria-label"), "Training table");
    const rows = await page.locator("#bars .chart-table tbody tr").evaluateAll((els) => els.map((tr) => [...tr.children].map((c) => c.textContent)));
    assert.equal(rows.length, 10);
    assert.deepEqual(rows[0].slice(0, 3), ["Tue, Nov 10", "34 min so far", "45 min"], "newest first");
    const gap = rows.find((r) => r[0] === "Tue, Nov 3");
    assert.deepEqual([gap[1], gap[3]], ["Not observed", "Not worn"]);
    assert.equal(await page.locator("#bars .chart-not-observed").first().evaluate((el) => getComputedStyle(el).color), await token(page, "text-tertiary"));
    assert.equal(await page.locator("#bars .chart-not-observed").first().evaluate((el) => el.children.length), 0, "no mark");
    assert.equal(await page.locator("#bars .chart-table table").evaluate((t) => getComputedStyle(t).tableLayout), "fixed");
    assert.equal(await page.locator("#bars .chart-scroll-hint").count(), 1, "the table overflows at 390, so it says so");
    // the date is pinned and opaque; the divider shows only once the table is scrolled
    const th = page.locator("#bars .chart-table tbody th").first();
    assert.equal(await th.evaluate((el) => getComputedStyle(el).position), "sticky");
    assert.notEqual(await th.evaluate((el) => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal(await th.evaluate((el) => getComputedStyle(el, "::after").opacity), "0");
    await region.evaluate((el) => { el.scrollLeft = 40; });
    await frames(page);
    assert.equal(await th.evaluate((el) => getComputedStyle(el, "::after").opacity), "1");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "the page does not scroll sideways");
    await toggle.click();
    assert.equal(await page.locator("#bars .chart-table").isHidden(), true);
    await context.close();
  });

  test("with a pointer, the row's wash reaches the pinned date behind its text, which stays opaque", async () => {
    const { page, context } = await open();
    await page.locator("#bars .chart-toggle").click();
    const th = page.locator("#bars .chart-table tbody th").first();
    await th.hover();
    assert.equal(await th.evaluate((el) => getComputedStyle(el, "::before").backgroundColor), await token(page, "state-hover"));
    assert.equal(await th.evaluate((el) => getComputedStyle(el, "::before").zIndex), "-1");
    assert.notEqual(await th.evaluate((el) => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    await context.close();
  });

  test("at 390 the chart is narrow by its own width: two lane rows, no direct labels, labels at least 56px apart, and nothing scrolls sideways", async () => {
    const { page, context } = await open({ width: 390 });
    assert.equal(await page.locator("#lines").getAttribute("data-narrow"), "");
    assert.equal(await page.locator("#lines .chart-direct").count(), 0, "the legend names every series, so the direct labels drop");
    const wide = await open({ width: 1440 });
    assert.equal(await wide.page.locator("#lines").getAttribute("data-narrow"), null);
    assert.ok((await wide.page.locator("#lines .chart-direct").evaluateAll((els) => els.map((e) => e.textContent))).includes("Ring"), "wide: a name at each line's end");
    await wide.context.close();
    const laneYs = await page.locator("#lines .chart-lane").evaluateAll((els) => els.map((e) => +e.getAttribute("y")));
    assert.deepEqual([...new Set(laneYs)].sort((a, b) => a - b), [8, 24], "two lane rows");
    const xs = await page.locator("#lines .chart-axis:not([text-anchor=end])").evaluateAll((els) => els.filter((e) => e.getAttribute("text-anchor") === "middle").map((e) => +e.getAttribute("x")));
    for (let i = 1; i < xs.length; i++) assert.ok(Math.abs(xs[i] - xs[i - 1]) >= 55.5, `x labels ${xs[i - 1]} and ${xs[i]}`);
    assert.ok((await box(page.locator("#lines .chart-svg"))).right <= 390);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    const heights = [];
    for (const id of ["bars", "lines"]) heights.push((await box(page.locator(`#${id} .chart-plot`))).height > 0);
    assert.deepEqual(heights, [true, true]);
    await context.close();
  });

  test("a tap picks a day and holds it until a tap outside; a drag scrubs; the legend's hint waits for a hardware key on touch", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    await page.locator("#bars .chart-plot").scrollIntoViewIfNeeded();
    const days = await dayBoxes(page, "bars");
    await page.touchscreen.tap(days[4].x + days[4].width / 2, days[4].y + 30);
    assert.equal(await readoutDate(page, "bars"), "Thu, Nov 5");
    await page.touchscreen.tap(days[6].x + days[6].width / 2, days[6].y + 30);
    assert.equal(await readoutDate(page, "bars"), "Sat, Nov 7");
    // a finger moves only while it is down: it scrubs, and the day it reaches is held
    await page.locator("#bars .chart-plot").evaluate((plot, x) => {
      const at = (buttons) => new PointerEvent("pointermove", { pointerType: "touch", buttons, clientX: x, clientY: plot.getBoundingClientRect().top + 40, bubbles: true });
      plot.dispatchEvent(at(0));
    }, days[1].x + days[1].width / 2);
    assert.equal(await readoutDate(page, "bars"), "Sat, Nov 7", "a touch pointer moving with no button down changes nothing");
    await page.locator("#bars .chart-plot").evaluate((plot, x) => {
      plot.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", buttons: 1, clientX: x, clientY: plot.getBoundingClientRect().top + 40, bubbles: true }));
    }, days[1].x + days[1].width / 2);
    assert.equal(await readoutDate(page, "bars"), "Mon, Nov 2", "scrubbing to a day holds it");
    await page.touchscreen.tap(195, 5);
    assert.equal(await readoutDate(page, "bars"), "Latest · Tue, Nov 10", "a tap outside lets go");
    assert.equal(await page.locator("#bars .chart-hint").isVisible(), false, "the key hint is hidden on touch until a hardware key");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#bars .chart-hint").isVisible(), true);
    await context.close();
  });

  test("charts in a group share one gutter and one right margin, so every plot starts and ends at the same x", async () => {
    const { page, context } = await open();
    const edges = async (id) => page.locator(`#${id} .chart-baseline, #${id} .chart-grid`).first().evaluate((el) => ({ x1: +el.getAttribute("x1"), x2: +el.getAttribute("x2") }));
    const a = await edges("g1");
    const b = await edges("g2");
    assert.deepEqual(a, b);
    const alone = await edges("bars");
    assert.notEqual(alone.x2, b.x2, "alone, the line chart's direct labels take a wider margin than the bars'");
    await context.close();
  });

  test("under reduced motion and in forced colours: the drawing is in system colours, the grid and plate drop, the active day is a Highlight outline", async () => {
    const { page, context } = await open({ reducedMotion: "reduce" });
    await page.emulateMedia({ forcedColors: "active" });
    await frames(page);
    const paint = (sel, prop) => page.locator(sel).first().evaluate((el, prop) => getComputedStyle(el)[prop], prop);
    assert.equal(await paint("#bars rect.chart-bar:not([data-so-far])", "fill"), await system(page, "CanvasText"));
    assert.equal(await paint("#bars .chart-plan", "stroke"), await system(page, "GrayText"));
    assert.equal(await paint("#bars svg > defs .chart-hatch-line", "stroke"), await system(page, "GrayText"));
    assert.equal(await paint("#bars .chart-baseline", "stroke"), await system(page, "CanvasText"));
    assert.equal(await paint("#lines .chart-line", "stroke"), await system(page, "CanvasText"));
    assert.equal(await paint("#lines .chart-ring", "fill"), await system(page, "Canvas"));
    assert.equal(await paint("#bars .chart-grid", "stroke"), "none", "the decorative grid drops");
    const days = await dayBoxes(page, "bars");
    await page.mouse.move(days[3].x + days[3].width / 2, days[3].y + 30);
    assert.equal(await paint("#bars .chart-plate", "fill"), "none", "the plate drops");
    assert.equal(await page.locator("#bars .chart-day[data-active]").evaluate((el) => { const s = getComputedStyle(el); return [s.outlineWidth, s.outlineStyle, s.outlineColor]; }).then((v) => v.join(" ")), `2px solid ${await system(page, "Highlight")}`);
    await context.close();
  });
});

describe("the meter", () => {
  for (const theme of THEMES) {
    test(`the fill is the value's share of the slot and stops at its end, the tick is the target, the foot says what is left (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const track = await box(page.locator("#meter .meter-track"));
      const inner = track.width - 2;
      const fill = await box(page.locator("#meter .meter-fill"));
      assert.ok(Math.abs(fill.width - inner * 0.746667) < 0.6, `${fill.width} of ${inner}`);
      const tick = await box(page.locator("#meter .meter-tick"));
      assert.ok(Math.abs(tick.x + tick.width / 2 - (track.x + 1 + inner * 0.833333)) < 1.5, "the tick sits at the target");
      assert.equal((await box(page.locator("#over .meter-fill"))).width, (await box(page.locator("#over .meter-track"))).width - 2, "over the cap the fill stays full, at the slot's end");
      assert.equal(await page.locator("#over .meter-left").evaluate((el) => getComputedStyle(el).color), await token(page, "text-primary"), "the overage is words in primary ink");
      assert.equal(await page.locator("#meter .meter-left").evaluate((el) => getComputedStyle(el).color), await token(page, "text-secondary"));
      assert.equal(await page.locator("#meter").getAttribute("role"), "meter");
      assert.equal(await page.locator("#meter .meter-foot").evaluate((el) => el.getBoundingClientRect().height), await page.locator("#over .meter-foot").evaluate((el) => el.getBoundingClientRect().height), "the foot is one line in every state");
      await context.close();
    });
  }

  test("under reduced motion the fill does not glide, and in forced colours the slot, fill and tick take system colours", async () => {
    const { page, context } = await open({ reducedMotion: "reduce" });
    assert.equal(await page.locator("#meter .meter-fill").evaluate((el) => getComputedStyle(el).transitionProperty), "none");
    await page.emulateMedia({ forcedColors: "active" });
    await frames(page);
    assert.equal(await page.locator("#meter .meter-fill").evaluate((el) => getComputedStyle(el).backgroundColor), await system(page, "CanvasText"));
    assert.equal(await page.locator("#meter .meter-track").evaluate((el) => getComputedStyle(el).borderTopColor), await system(page, "CanvasText"));
    assert.equal(await page.locator("#meter .meter-tick").evaluate((el) => getComputedStyle(el).borderLeftColor), await system(page, "Canvas"));
    await context.close();
  });

  test("with motion, a new value glides over duration-slow on ease-out (the shared animation clock)", async () => {
    const { page, context } = await open();
    const clock = await freezeAnimations(page);
    await page.locator("#meter").evaluate((el) => el.style.setProperty("--value", "20%"));
    await clock.advance(150);
    const mid = (await box(page.locator("#meter .meter-fill"))).width;
    const full = (await box(page.locator("#meter .meter-track"))).width - 2;
    assert.ok(mid < full * 0.746 && mid > full * 0.2, `part-way: ${mid}`);
    await clock.advance(1000);
    assert.ok(Math.abs((await box(page.locator("#meter .meter-fill"))).width - full * 0.2) < 0.6);
    await clock.thaw();
    await context.close();
  });
});

describe("the description list and the stat's source", () => {
  test("a value's link is a 44 by 44 target on touch, and the row is still 40px; with a mouse it is its line", async () => {
    const touch = await open({ width: 390, touch: true });
    const link = await box(touch.page.locator("#facts a"));
    assert.ok(link.height >= 44 && link.width >= 44, `${link.width} by ${link.height}`);
    assert.equal((await box(touch.page.locator("#facts > div:nth-child(3)"))).height, (await box(touch.page.locator("#facts > div:nth-child(2)"))).height, "a linked value sits exactly like an unlinked one: only the hit box grew");
    await touch.context.close();
    const wide = await open({ width: 1440 });
    assert.ok((await box(wide.page.locator("#facts a"))).height < 24);
    assert.equal(Math.round((await box(wide.page.locator("#facts > div:nth-child(3)"))).height), 40);
    assert.equal(await wide.page.locator("#facts dd[data-missing]").evaluate((el) => getComputedStyle(el).color), await token(wide.page, "text-tertiary"));
    await wide.context.close();
  });

  test("the list stacks on its own width, not the viewport's", async () => {
    const { page, context } = await open({ width: 1440 });
    const columns = () => page.locator("#facts > div").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    assert.equal(await columns(), 2);
    await page.locator("#facts").evaluate((el) => { el.style.width = "400px"; });
    assert.equal(await columns(), 1);
    await context.close();
  });

  test("the source line is tertiary at the foot of the stat; its separator is hidden from speech and a comma is spoken in its place", async () => {
    const { page, context } = await open();
    assert.equal(await page.locator("#stats .stat-source").evaluate((el) => getComputedStyle(el).color), await token(page, "text-tertiary"));
    assert.equal(await page.locator("#stats .stat-source time").getAttribute("datetime"), "2026-11-10T04:41");
    assert.equal(await page.locator("#stats .stat-source [aria-hidden=true]").innerText(), "·");
    await context.close();
  });
});

describe("the terminal", () => {
  test("the static default: a named pre and no live region, commands behind a prompt, marks that carry their words, a gutter nothing can select", async () => {
    const { page, context } = await open();
    const pre = page.locator("#static pre");
    assert.equal(await pre.getAttribute("aria-label"), "Deploy preview, transcript");
    assert.equal(await pre.getAttribute("role"), "region", "not a log, but a named region as React's is (A3-08)");
    assert.equal(await pre.getAttribute("tabindex"), "0");
    assert.equal(await page.locator("#static .terminal-line").count(), 6);
    assert.equal(await page.locator("#static .terminal-line[data-kind=command] .terminal-gutter [aria-hidden=true]").first().innerText(), "$");
    assert.deepEqual(await page.locator("#static .terminal-mark").evaluateAll((els) => els.map((e) => [e.getAttribute("role"), e.getAttribute("aria-label")])), [["img", "Done"], ["img", "Warning"], ["img", "Error"]]);
    assert.equal(await page.locator("#static .terminal-gutter").first().evaluate((el) => getComputedStyle(el).userSelect), "none");
    assert.equal(await page.locator("#static .terminal-line[data-kind=output]").evaluate((el) => getComputedStyle(el).color), await token(page, "text-secondary"));
    assert.equal(await page.locator("#static .terminal-line[data-kind=error] .terminal-text").evaluate((el) => getComputedStyle(el).color), await token(page, "status-danger"));
    assert.equal(await page.locator("#static .terminal-line[data-kind=command] .terminal-text").first().evaluate((el) => getComputedStyle(el).color), await token(page, "text-primary"));
    assert.equal(await page.locator("#static .terminal-state").count(), 0, "a static record has no state words");
    assert.equal(await page.locator("#static .terminal-control").count(), 0, "and no control");
    await context.close();
  });

  test("copy takes the commands only, one a line, and says so; narrower than 480px the button is the icon alone with the same name", async () => {
    const { page, context } = await open();
    const clock = await freezeAnimations(page);
    await page.locator("#static .terminal-copy").click();
    await clock.advance(50);
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "npm run build\ngit push");
    // DECISIONS 336, Q5: the words hold; the check shows (the copy and the close glyphs drawn once, off), and the status says Copied.
    assert.equal(await page.locator("#static .terminal-copy").innerText(), "Copy commands");
    assert.deepEqual(await page.locator("#static .terminal-copy > svg").evaluateAll((g) => g.map((x) => x.hasAttribute("data-off"))), [true, false, true], "the check shows");
    assert.equal(await page.locator("#static [role=status]").innerText(), "Copied");
    await clock.advance(1600);
    assert.deepEqual(await page.locator("#static .terminal-copy > svg").evaluateAll((g) => g.map((x) => x.hasAttribute("data-off"))), [false, true, true], "back to the copy glyph after a moment");
    assert.equal(await page.locator("#static [role=status]").innerText(), "");
    await clock.thaw();
    assert.equal(await page.locator("#static .terminal-copy-compact").isHidden(), true);
    await page.locator("#static").evaluate((el) => { el.style.width = "400px"; });
    assert.equal(await page.locator("#static .terminal-copy").isHidden(), true);
    assert.equal(await page.locator("#static .terminal-copy-compact").getAttribute("aria-label"), "Copy commands");
    const compact = await box(page.locator("#static .terminal-copy-compact"));
    assert.equal(Math.round(compact.width), 28);
    await context.close();
  });

  test("a replay plays its lines itself on its interval: Play, Pause, Resume, then Done and Replay; it is a log only while lines arrive", async () => {
    const { page, context } = await open();
    const clock = await freezeAnimations(page);
    const word = (sel) => page.locator(`#replay ${sel} .terminal-swap > [data-on]`).innerText();
    const lines = () => page.locator("#replay .terminal-line").count();
    const role = () => page.locator("#replay pre").getAttribute("role");
    assert.equal(await word(".terminal-state"), "Not started");
    assert.equal(await word(".terminal-control"), "Play");
    assert.equal(await role(), "group", "named, before the first line");
    assert.equal(await page.locator("#replay .terminal-hint").innerText(), "Press Play to start");
    assert.equal(await page.locator("#replay").getAttribute("data-live"), "");
    await page.locator("#replay .terminal-control").click();
    assert.equal(await role(), "log");
    await clock.advance(32);
    assert.equal(await lines(), 1, "line 1 arrives one frame after the log does");
    assert.equal(await word(".terminal-state"), "Running");
    assert.equal(await word(".terminal-control"), "Pause");
    await clock.advance(500);
    assert.equal(await lines(), 1, "not before the interval");
    await clock.advance(100);
    assert.equal(await lines(), 2);
    await page.locator("#replay .terminal-control").click();
    assert.equal(await word(".terminal-state"), "Paused");
    assert.equal(await word(".terminal-control"), "Resume");
    assert.equal(await role(), "region", "a paused transcript is not a log, and keeps its role as a named region (A3-08)");
    await clock.advance(3000);
    assert.equal(await lines(), 2, "paused holds");
    await page.locator("#replay .terminal-control").click();
    await clock.advance(620);
    assert.equal(await lines(), 3);
    assert.equal(await word(".terminal-state"), "Done");
    assert.equal(await word(".terminal-control"), "Replay");
    assert.equal(await role(), "region", "a finished transcript keeps its role (A3-08)");
    await page.locator("#replay .terminal-control").click();
    await clock.advance(32);
    assert.equal(await lines(), 1, "Replay starts over");
    assert.equal(await page.locator("#replay [role=status]").innerText(), "");
    await clock.thaw();
    await context.close();
  });

  test("a replay that ends on an error is failed, and says its exit code", async () => {
    const { page, context } = await open();
    const clock = await freezeAnimations(page);
    await page.locator("#failing .terminal-control").click();
    await clock.advance(1500);
    assert.equal(await page.locator("#failing .terminal-state .terminal-swap > [data-on]").innerText(), "Failed, exit 1");
    assert.equal(await page.locator("#failing .terminal-state").getAttribute("data-state"), "failed");
    assert.equal(await page.locator("#failing .terminal-state [data-error]").evaluate((el) => getComputedStyle(el).color), await token(page, "status-danger"));
    await clock.thaw();
    await context.close();
  });

  test("in forced colours the marks, the error text and the title row's line take system colours", async () => {
    const { page, context } = await open();
    await page.emulateMedia({ forcedColors: "active" });
    await frames(page);
    const text = await system(page, "CanvasText");
    assert.equal(await page.locator("#static .terminal-line[data-kind=done] .terminal-mark").evaluate((el) => getComputedStyle(el).color), text);
    assert.equal(await page.locator("#static .terminal-line[data-kind=error] .terminal-text").evaluate((el) => getComputedStyle(el).color), text);
    assert.equal(await page.locator("#static .code-head").evaluate((el) => getComputedStyle(el).borderBottomWidth), "1px", "a real border, which forced colours keep");
    await context.close();
  });
});

describe("accessibility", () => {
  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`axe finds nothing, with a chart's table open (${theme}, ${width})`, async () => {
      const { page, context } = await open({ scheme: theme, width });
      await page.locator("#bars .chart-toggle").click();
      await settle(page);
      assert.deepEqual(await axeViolations(page), []);
      await context.close();
    });
  }

  test("axe finds nothing in forced colours", async () => {
    const { page, context } = await open();
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    assert.deepEqual(await axeViolations(page), []);
    await context.close();
  });
});
