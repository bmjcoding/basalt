// What N1's first screen decided (DECISIONS 114, hero-n1), on the built page sites/n1/index.html: the solid header and its one primary
// Button, the brand's 44 by 44 hit area, the mark and its edge, the line and the sentence and the status in their sizes, the two columns
// from 1024, the skill's chart (fourteen days, a plan that steps once, a missing day and its reason, never "today", keys and taps), the
// room the chart reserves so that nothing moves when it is drawn, N1's entrance and nothing else moving, no accent, and the hand-over.
// The page inlines its own Geist, so a test that counts lines or measures a width loads the same font on every runner; the margins are
// kept wider than a fallback font's width all the same.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { buildPage, repoRoot, sitesDir } from "../build.mjs";
import { HOST, launch, openHtml, settled } from "./support.mjs";

const bodyFile = path.join(sitesDir, "n1", "index.body.html");
let browser;
let built;
before(async () => {
  browser = await launch();
  built = buildPage(bodyFile, { outFile: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-n1-")), "n1.html"), siteDir: path.join(sitesDir, "n1") });
});
after(async () => { await browser?.close(); });

const open = (options) => openHtml(browser, built.html, options);
const box = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; });
const near = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual}, expected ${expected} ± ${tolerance}`);
const text = (page, selector) => page.locator(selector).first().evaluate((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim());
const type = (page, selector) => page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return { size: s.fontSize, line: s.lineHeight, weight: s.fontWeight, color: s.color }; });
const lines = (page, selector) => page.locator(selector).first().evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));

describe("the header", () => {
  test("it is the solid bar; its links are exactly How it works, Privacy and For coaches; Sign in is its one primary Button", async () => {
    for (const scheme of ["dark", "light"]) {
      const { page, context } = await open({ scheme });
      const header = page.locator("header.basalt-site-header");
      assert.equal(await header.getAttribute("data-solid"), "", "the solid form");
      const style = await header.evaluate((el) => { const s = getComputedStyle(el); return { filter: s.backdropFilter, background: s.backgroundColor }; });
      assert.equal(style.filter, "none", "no blur: the solid bar");
      assert.deepEqual(await page.locator("header .basalt-site-links a").allInnerTexts(), ["How it works", "Privacy", "For coaches"]);
      const primaries = page.locator("header .btn[data-variant=primary]");
      assert.equal(await primaries.count(), 1, "one primary Button in the header");
      assert.equal((await primaries.first().innerText()).trim(), "Sign in");
      await context.close();
    }
  });

  test("at 390 Sign in is at the foot of the open menu, its one primary Button, under the three links", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    assert.equal(await page.locator("header .basalt-site-action").isVisible(), false, "the bar's Sign in goes into the menu under 720");
    await page.locator(".basalt-site-menu-trigger").click();
    await settled(page);
    const menu = page.locator(".basalt-site-menu");
    const last = await menu.evaluate((el) => { const foot = el.querySelector(":scope > :last-child"); return { cls: foot.className, text: foot.textContent.trim(), primaries: el.querySelectorAll(".btn[data-variant=primary]").length }; });
    assert.equal(last.cls, "basalt-site-menu-foot", "the foot is the sheet's last part");
    assert.equal(last.text, "Sign in");
    assert.equal(last.primaries, 1, "one primary Button in the sheet");
    const signIn = await box(page, ".basalt-site-menu-foot .btn");
    const lastLink = await box(page, ".basalt-site-menu-nav li:last-child a");
    assert.ok(signIn.top >= lastLink.bottom, "Sign in is under the links");
    near(signIn.width, 358, 1, "it spans the sheet's content");
    assert.deepEqual(await page.locator(".basalt-site-menu-nav a").allInnerTexts(), ["How it works", "Privacy", "For coaches"]);
    await context.close();
  });

  test("the brand's hit area is at least 44 by 44, draws nothing, moves nothing, and does not overlap the first link's", async () => {
    for (const width of [1440, 390]) {
      const { page, context } = await open({ width });
      const area = await page.locator(".basalt-site-bar .basalt-site-brand").evaluate((brand) => {
        const r = brand.getBoundingClientRect();
        const s = getComputedStyle(brand);
        const mark = brand.querySelector("svg").getBoundingClientRect();
        const outside = document.elementFromPoint(r.left + 1, r.top + r.height / 2);
        return {
          rect: { left: r.left, right: r.right, width: r.width, height: r.height },
          mark: { left: mark.left, width: mark.width },
          paints: { background: s.backgroundColor, border: s.borderTopWidth + s.borderLeftWidth + s.borderRightWidth + s.borderBottomWidth, outline: s.outlineStyle, shadow: s.boxShadow },
          svgPointer: getComputedStyle(brand.querySelector("svg")).pointerEvents,
          hit: !!outside && brand.contains(outside),
        };
      });
      assert.ok(area.rect.width >= 44 - 0.01 && area.rect.height >= 44 - 0.01, `${width}: ${area.rect.width} by ${area.rect.height}`);
      assert.equal(area.paints.background, "rgba(0, 0, 0, 0)", "it draws no fill");
      assert.equal(area.paints.border, "0px0px0px0px", "and no border");
      assert.equal(area.paints.outline, "none");
      assert.equal(area.paints.shadow, "none");
      assert.equal(area.hit, true, "a point in the area outside the 32px mark is the brand's");
      assert.equal(area.svgPointer, "none", "the file's <title> is no tooltip: the drawing takes no pointer");
      near(area.mark.width, 32, 0.01, "the mark is the file's 32");
      near(area.mark.left, (await box(page, ".n1-hero-row")).left, 0.01, `${width}: and it has not moved: the 44 reaches 6px past it each side`);
      near(area.rect.left, area.mark.left - 6, 0.01, "the reach is 6px before the mark");
      near(area.rect.right, area.mark.left + 32 + 6, 0.01, "and 6px after it");
      if (width === 1440) {
        const link = await box(page, ".basalt-site-bar .basalt-site-link");
        assert.ok(area.rect.right <= link.left + 0.01, "no overlap with the first link's target");
        near(link.left, area.mark.left + 32 + 16, 0.01, "the first link is where it was: 16px after the mark");
      }
      await context.close();
    }
  });
});

describe("the mark, the line, the sentence and the status", () => {
  test("the brand files are in the page byte for byte, the player before the hero", async () => {
    const names = built.includes.filter((i) => i.name.startsWith("brand/")).map((i) => i.name).sort();
    assert.deepEqual(names, ["brand/motion/logo-motion.js", "brand/n1/hero.html", "brand/n1/mark-32.svg"]);
    for (const include of built.includes.filter((i) => i.name.startsWith("brand/"))) assert.ok(built.html.includes(fs.readFileSync(include.file, "utf8")), `${include.name} is not in the page byte for byte`);
    const player = built.html.indexOf(fs.readFileSync(path.join(repoRoot, "brand/motion/logo-motion.js"), "utf8"));
    const hero = built.html.indexOf(fs.readFileSync(path.join(repoRoot, "brand/n1/hero.html"), "utf8"));
    assert.ok(player > -1 && hero > player, "logo-motion.js is loaded before the hero");
  });

  test("the mark is 144 wide at 1440 and 96 at 390; its N's stem, the line's first letter and the header's mark stand on one edge", async () => {
    for (const [width, mark] of [[1440, 144], [390, 96]]) {
      const { page, context } = await open({ width });
      const m = await box(page, ".hero-mark");
      near(m.width, mark, 0.01, `${width}: the mark's width`);
      const edge = (await box(page, ".n1-hero-row")).left;
      // The ink starts 9 of the drawing's 48 units into its box (the path's M9): the box steps back by that much and the stem is on the edge.
      near(m.left + (m.width * 9) / 48, edge, 0.5, `${width}: the N's stem`);
      const letter = await page.locator(".n1-title").evaluate((el) => { const range = document.createRange(); range.setStart(el.firstChild, 0); range.setEnd(el.firstChild, 1); return range.getBoundingClientRect().left; });
      near(letter, edge, 0.5, `${width}: the line's first letter`);
      const header = await box(page, ".basalt-site-bar .basalt-site-brand-mark svg");
      near(header.left, edge, 0.5, `${width}: the header's mark (its box; its ink starts 5 of 32 units in, as the file draws it)`);
      await context.close();
    }
  });

  test("the line is the h1, Geist 600 at 40/44 with three lines at 1440 and 30/36 with three at 390; the sentence is 18/26 then 16/24", async () => {
    for (const [width, line, sentence] of [[1440, { size: "40px", line: "44px" }, { size: "18px", line: "26px" }], [390, { size: "30px", line: "36px" }, { size: "16px", line: "24px" }]]) {
      const { page, context } = await open({ width });
      assert.equal(await page.locator("h1").count(), 1, "one h1");
      assert.equal(await text(page, "h1"), "AI-native coaching for physique and performance athletes.");
      const h1 = await type(page, "h1");
      assert.deepEqual([h1.size, h1.line, h1.weight], [line.size, line.line, "600"], `${width}: the line`);
      assert.equal(await lines(page, "h1"), 3, `${width}: three lines`);
      near((await box(page, "h1")).width, Math.min(544, (await box(page, ".n1-hero-copy")).width), 0.5, "no wider than size-prose-width (34rem = 544px) and as wide as it gets");
      const lead = await type(page, ".n1-lead");
      assert.deepEqual([lead.size, lead.line, lead.weight], [sentence.size, sentence.line, "400"], `${width}: the sentence`);
      const h1color = h1.color;
      assert.notEqual(lead.color, h1color, "the sentence is in secondary ink, not primary");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("h1")).textWrap), "balance");
      await context.close();
    }
  });

  test("the status is plain words on its own line, 13/18 in secondary ink: no badge, dot, ring, button or link; no button or link in the copy column", async () => {
    const { page, context } = await open();
    assert.equal(await page.locator(".n1-hero-copy a, .n1-hero-copy button, .n1-hero-copy [role=button], .n1-hero-copy [tabindex]").count(), 0, "no button or link in the hero's copy");
    const status = await page.locator(".n1-status").evaluate((el) => {
      const kids = [...el.querySelectorAll("*")].map((k) => ({ tag: k.tagName, cls: k.className, bg: getComputedStyle(k).backgroundColor, border: getComputedStyle(k).borderTopWidth, radius: getComputedStyle(k).borderRadius }));
      const own = getComputedStyle(el);
      return { tag: el.tagName, kids, bg: own.backgroundColor, border: own.borderTopWidth, radius: own.borderRadius, display: own.display, size: own.fontSize, line: own.lineHeight, weight: own.fontWeight, color: own.color, text: el.textContent };
    });
    assert.equal(status.tag, "P");
    assert.equal(status.bg, "rgba(0, 0, 0, 0)");
    assert.equal(status.border, "0px");
    assert.equal(status.radius, "0px");
    assert.deepEqual([status.size, status.line, status.weight], ["13px", "18px", "400"]);
    for (const kid of status.kids) assert.deepEqual([kid.bg, kid.border], ["rgba(0, 0, 0, 0)", "0px"], `${kid.tag}.${kid.cls}: nothing drawn`);
    assert.notEqual(status.color, (await type(page, "h1")).color, "secondary ink");
    const lead = await box(page, ".n1-lead");
    const place = await box(page, ".n1-status");
    near(place.top - lead.bottom, 32, 0.5, "the status's place: space-8 under the sentence, where the reference's action row stood");
    assert.equal(await lines(page, ".n1-status"), 1, "on its own line");
    await context.close();
  });
});

describe("the shape", () => {
  test("two columns from 1024 (the chart at least 480 wide and beside the copy at 1024 and 1440), one column below", async () => {
    for (const width of [1440, 1024]) {
      const { page, context } = await open({ width });
      const copy = await box(page, ".n1-hero-copy");
      const chart = await box(page, ".n1-chart");
      assert.ok(chart.width >= 480 - 0.01, `${width}: the chart is ${chart.width}`);
      assert.ok(chart.left >= copy.right, `${width}: the chart is beside the copy`);
      assert.ok(chart.top < copy.bottom, `${width}: and level with it`);
      if (width === 1440) { near(chart.width, 512, 0.5, "512 at 1440"); near(copy.width, 544, 0.5, "the copy at size-prose-width"); near(copy.left, (await box(page, ".n1-hero-row")).left, 0.01, "on the row's start edge"); }
      await context.close();
    }
    for (const width of [1023, 720, 390]) {
      const { page, context } = await open({ width });
      const copy = await box(page, ".n1-hero-copy");
      const chart = await box(page, ".n1-chart");
      assert.ok(chart.top >= copy.bottom, `${width}: the chart is under the copy`);
      near(chart.left, copy.left, 0.01, `${width}: on the same edge`);
      await context.close();
    }
  });

  test("the hero is as tall as its content and at 1440 by 900 the whole figure, the next section's rule and its head are in the first screen", async () => {
    const { page, context } = await open({ width: 1440, height: 900 });
    const chart = await box(page, ".n1-chart");
    const rule = await box(page, ".n1-next-head");
    const lead = await box(page, ".n1-next-lead");
    assert.ok(chart.bottom <= 900, `the figure ends at ${chart.bottom}`);
    assert.ok(rule.top < 900, `the rule is at ${rule.top}`);
    assert.ok(lead.bottom <= 900, `the head's sentence ends at ${lead.bottom}`);
    const hero = await box(page, ".n1-hero");
    assert.ok(hero.height < 900 - 56, "not the viewport's height");
    const tall = await open({ width: 1440, height: 1600 });
    near((await box(tall.page, ".n1-hero")).height, hero.height, 0.01, "and not a function of the viewport's height");
    await tall.context.close();
    await context.close();
  });

  test("the hand-over: space-16 under the hero, a 1px divider across the row, space-12, then the head at 24/30 600 (space-12 and space-10 under 720)", async () => {
    for (const [width, under, over] of [[1440, 64, 48], [390, 48, 40]]) {
      const { page, context } = await open({ width });
      const row = await box(page, ".n1-hero-row");
      const rule = await box(page, ".n1-next-head");
      const style = await page.locator(".n1-next-head").evaluate((el) => { const s = getComputedStyle(el); return { width: s.borderTopWidth, style: s.borderTopStyle, color: s.borderTopColor, probe: (() => { const p = document.createElement("i"); p.style.color = "var(--basalt-border-divider)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })() }; });
      assert.equal(style.width, "1px");
      assert.equal(style.style, "solid");
      assert.equal(style.color, style.probe, "border-divider");
      near(rule.left, row.left, 0.01, `${width}: the rule starts on the row's edge`);
      near(rule.width, row.width, 0.01, `${width}: and spans the row`);
      near(rule.top - row.bottom, under, 0.01, `${width}: the room under the hero`);
      const title = await box(page, ".n1-next-title");
      near(title.top - rule.top, 1 + over, 0.01, `${width}: the room under the rule`);
      near(title.left, row.left, 0.01, "the head is on the row's start edge");
      const head = await type(page, ".n1-next-title");
      assert.deepEqual([head.size, head.line, head.weight], ["24px", "30px", "600"]);
      const sentence = await type(page, ".n1-next-lead");
      assert.deepEqual([sentence.size, sentence.line, sentence.weight], ["16px", "24px", "400"]);
      await context.close();
    }
  });
});

/** The chart as the skill draws it: the pick's date and the steps' readout. */
const readout = (page) => page.evaluate(() => ({ date: document.querySelector(".chart [data-part=date]").textContent, steps: document.querySelector('.chart-value[data-series="steps"] [data-part=value]').textContent, plan: document.querySelector('.chart-value[data-series="plan"] [data-part=value]').textContent }));
const focusedDay = (page) => page.evaluate(() => { const a = document.activeElement; return a?.classList.contains("chart-day") ? Number(a.getAttribute("data-i")) : null; });

describe("the chart", () => {
  test("fourteen days, a plan that reads 8,000 on the first and 9,000 on the last, and no day's sentence says today", async () => {
    const { page, context, errors } = await open();
    const labels = await page.locator(".chart-day").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    assert.equal(labels.length, 14);
    assert.match(labels[0], /Plan 8,000/);
    assert.match(labels[13], /Plan 9,000/);
    assert.match(labels[0], /^Monday 26 October/);
    assert.match(labels[13], /^Sunday 8 November/);
    for (const label of labels) assert.doesNotMatch(label, /today/i, label);
    assert.match(labels[2], /Steps not observed, watch not worn/);
    assert.match(labels[3], /Steps not observed, watch not worn/);
    assert.equal(await page.locator("[data-accent]").count(), 0, "no accent anywhere");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("every day is reachable by the arrow keys; a missing day reads Not observed with its reason", async () => {
    const { page, context } = await open();
    for (let i = 0; i < 12 && (await focusedDay(page)) === null; i++) await page.keyboard.press("Tab");
    assert.notEqual(await focusedDay(page), null, "Tab reaches the chart's one stop");
    await page.keyboard.press("Home");
    assert.equal(await focusedDay(page), 0);
    const seen = [0];
    for (let i = 0; i < 13; i++) { await page.keyboard.press("ArrowRight"); seen.push(await focusedDay(page)); }
    assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], "all fourteen, in order");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    const missing = await readout(page);
    assert.match(missing.date, /Wed 28 Oct/);
    assert.match(missing.steps, /Not observed/);
    assert.match(missing.steps, /watch not worn/);
    assert.equal(missing.plan, "8,000");
    await page.keyboard.press("End");
    assert.equal(await focusedDay(page), 13);
    assert.equal((await readout(page)).plan, "9,000");
    await context.close();
  });

  test("a touch tap on a bar and on the hatch picks that day and holds it", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    const centre = async (i) => page.locator(`.chart-day[data-i="${i}"]`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 40 }; });
    await page.locator(".chart-plot").scrollIntoViewIfNeeded();
    await settled(page);
    const latest = await readout(page);
    assert.match(latest.date, /^Latest · Sun 8 Nov/);
    // a bar: the 31 October (index 5)
    let at = await centre(5);
    await page.touchscreen.tap(at.x, at.y);
    await page.waitForTimeout(300);
    assert.match((await readout(page)).date, /^Sat 31 Oct$/, "a tap on a bar picks its day");
    assert.equal((await readout(page)).steps, "10,120");
    await page.waitForTimeout(400);
    assert.match((await readout(page)).date, /^Sat 31 Oct$/, "and holds it");
    // the hatch: 28 October (index 2)
    at = await centre(2);
    await page.touchscreen.tap(at.x, at.y);
    await page.waitForTimeout(300);
    let picked = await readout(page);
    assert.match(picked.date, /^Wed 28 Oct$/, "a tap on the hatch picks its day");
    assert.match(picked.steps, /Not observed · watch not worn/);
    await page.waitForTimeout(400);
    picked = await readout(page);
    assert.match(picked.date, /^Wed 28 Oct$/, "and holds it");
    assert.match(picked.steps, /watch not worn/);
    await context.close();
  });

  test("View as table discloses fourteen rows; the words synthetic and illustration are in the source line and the summary", async () => {
    const { page, context } = await open();
    assert.equal(await page.locator(".chart-table").isHidden(), true);
    const toggle = page.locator(".chart-toggle");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator(".chart-table tbody tr").count(), 14);
    assert.equal(await page.locator(".chart-table tbody tr:has(.chart-note:text('watch not worn'))").count(), 2, "the reason is in the table's note");
    const source = await text(page, ".chart-source");
    const summary = await text(page, ".chart-summary");
    assert.match(source, /synthetic/i);
    assert.match(source, /illustration/i);
    assert.match(summary, /^Synthetic data, made up for this page\./);
    assert.match(summary, /illustration|made up for this page/i);
    assert.equal(await page.locator("figure.chart").evaluate((el) => !el.closest(".panel, .card") && !getComputedStyle(el).borderTopWidth.replace("0px", "")), true, "no panel: the chart sits on the page");
    await context.close();
  });
});

describe("nothing moves", () => {
  // The chart's own script draws it, so the page reserves its place. Drawn here by hand from the page's own data (the script's automatic
  // draw is switched off by renaming the marker), so the room before and after can be compared box for box.
  const held = () => built.html.replace('type="application/json" data-chart>', 'type="application/json" id="chart-data" data-chart-held>');
  const landmarks = (page) => page.evaluate(() => {
    const top = (s) => Math.round(document.querySelector(s).getBoundingClientRect().top * 100) / 100;
    const fig = document.querySelector(".n1-chart").getBoundingClientRect();
    return { mark: top(".hero-mark"), title: top(".n1-title"), lead: top(".n1-lead"), status: top(".n1-status"), figure: top(".n1-chart"), figureHeight: Math.round(fig.height * 100) / 100, rule: top(".n1-next-head"), next: top(".n1-next-title"), end: Math.round(document.documentElement.scrollHeight) };
  });
  const draw = async (page) => {
    await page.evaluate(() => { const script = document.getElementById("chart-data"); const data = JSON.parse(script.textContent); script.remove(); window.Basalt.chart(document.querySelector(".n1-chart"), data); });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };

  test("nothing beside or below the chart moves when it is drawn, at 1440, 1024 and 390, and the room is the chart's exact height", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: held() }) : route.abort()));
    const page = await context.newPage();
    await page.goto(HOST);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const before = await landmarks(page);
      assert.equal(await page.locator(".chart-day").count(), 0, "not drawn yet");
      await draw(page);
      const after = await landmarks(page);
      assert.deepEqual(after, before, `${width}: a box moved when the chart was drawn`);
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
    }
    await context.close();
  });

  test("across widths the room is never less than the chart needs, and never a line more", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: held() }) : route.abort()));
    const page = await context.newPage();
    await page.goto(HOST);
    await page.evaluate(() => document.fonts.ready);
    const widths = [];
    for (let w = 320; w <= 1500; w += w < 1200 ? 9 : 150) widths.push(w);
    const bad = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const reserved = (await landmarks(page)).figureHeight;
      await draw(page);
      const drawn = (await landmarks(page)).figureHeight;
      // reserved is a min-height: after the draw the figure is the larger of the two; a figure taller than its room grew by the difference
      if (drawn !== reserved) bad.push(`${width}: reserved ${reserved}, drawn ${drawn}`);
      // re-arm for the next width: reload keeps the check independent of the previous draw
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
    }
    assert.deepEqual(bad, [], "the room and the drawn chart differ");
    await context.close();
  });

  test("the layout shift across N1's entrance is 0 once the font has loaded, at 1440 and 390; nothing below the mark moves", async () => {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
      await context.addInitScript(() => {
        window.__shifts = [];
        try { new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__shifts.push({ value: e.value, at: e.startTime }); }).observe({ type: "layout-shift", buffered: true }); } catch { /* no layout-shift entries */ }
        window.__fontsAt = null;
        document.fonts.ready.then(() => { window.__fontsAt = performance.now(); });
      });
      const page = await context.newPage();
      await page.goto(HOST);
      await page.evaluate(() => document.fonts.ready);
      // sample every box under the mark on each frame for the length of the entrance and a little past it
      const frames = await page.evaluate(() => new Promise((resolve) => {
        const sel = [".n1-title", ".n1-lead", ".n1-status", ".n1-chart", ".chart-plot", ".chart-summary", ".n1-next-head", ".n1-next-title"];
        const out = [];
        const start = performance.now();
        const tick = () => {
          out.push(sel.map((s) => Math.round(document.querySelector(s).getBoundingClientRect().top * 100) / 100).join(","));
          if (performance.now() - start < 600) requestAnimationFrame(tick); else resolve(out);
        };
        tick();
      }));
      assert.ok(frames.length > 10, "frames were sampled");
      assert.equal(new Set(frames).size, 1, `${width}: a box moved during the entrance`);
      const shifts = await page.evaluate(() => ({ fontsAt: window.__fontsAt, entries: window.__shifts }));
      const after = shifts.entries.filter((e) => shifts.fontsAt === null || e.at >= shifts.fontsAt);
      assert.equal(after.reduce((sum, e) => sum + e.value, 0), 0, `${width}: layout shift after the font loaded: ${JSON.stringify(after)}`);
      await context.close();
    }
  });

  test("under reduced motion the mark's path is the shipped one from the first frame; otherwise the entrance draws other paths", async () => {
    const shipped = fs.readFileSync(path.join(repoRoot, "brand/n1/hero.html"), "utf8").match(/<path[^>]* d="([^"]+)"/)[1];
    const record = () => {
      window.__paths = [];
      const read = () => { const p = document.querySelector(".hero-mark path"); if (p) window.__paths.push(p.getAttribute("d")); };
      document.addEventListener("DOMContentLoaded", () => { read(); const tick = () => { read(); if (performance.now() < 800) requestAnimationFrame(tick); }; tick(); });
      new MutationObserver(read).observe(document, { subtree: true, attributes: true, attributeFilter: ["d"], childList: true });
    };
    for (const [reducedMotion, expectMoves] of [["reduce", false], ["no-preference", true]]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion });
      await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
      await context.addInitScript(record);
      const page = await context.newPage();
      await page.goto(HOST);
      await page.waitForTimeout(900);
      const paths = await page.evaluate(() => window.__paths);
      assert.ok(paths.length > 0);
      if (expectMoves) assert.ok(new Set(paths).size > 1, "the entrance draws more than the shipped path (so this test can see it)");
      else assert.deepEqual([...new Set(paths)], [shipped], "reduced motion: the shipped path from the first frame");
      await context.close();
    }
  });
});

describe("no accent", () => {
  test("no element in the first screen paints the accent, in either theme, at 1440 and 390", async () => {
    const accents = fs.readFileSync(path.join(repoRoot, "packages/tokens/dist/css/accents.css"), "utf8");
    const ink = accents.match(/data-accent="cobalt"\]\s*\{\s*--basalt-accent-ink:\s*([^;]+);/)[1];
    for (const scheme of ["dark", "light"]) {
      for (const width of [1440, 390]) {
        const { page, context } = await open({ scheme, width, touch: width === 390 });
        const found = await page.evaluate((accentCss) => {
          const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
          const rgba = (css) => { canvas.clearRect(0, 0, 1, 1); canvas.fillStyle = "#000"; canvas.fillStyle = css; canvas.fillRect(0, 0, 1, 1); return [...canvas.getImageData(0, 0, 1, 1).data].join(","); };
          const probe = document.createElement("i");
          probe.style.cssText = `position:absolute;color:${accentCss}`;
          document.body.append(probe);
          const accent = rgba(getComputedStyle(probe).color);
          probe.remove();
          const hits = [];
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (!(r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0)) continue;
            const s = getComputedStyle(el);
            const painted = { color: s.color, background: s.backgroundColor, borderTop: s.borderTopColor, borderBottom: s.borderBottomColor, outline: s.outlineColor, fill: s.fill, stroke: s.stroke, caret: s.caretColor, accent: s.accentColor };
            for (const [name, value] of Object.entries(painted)) if (value && !/^(none|auto|currentcolor)$/i.test(value) && rgba(value) === accent) hits.push(`${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).trim()} ${name}`);
          }
          return { accent, hits };
        }, ink);
        assert.deepEqual(found.hits, [], `${scheme} at ${width}: something paints the accent ink ${found.accent}`);
        assert.equal(await page.locator("[data-accent]").count(), 0);
        await context.close();
      }
    }
  });
});
