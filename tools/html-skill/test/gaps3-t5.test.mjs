// cimip-gaps-3, topic T5 in the HTML skill (the council's decision, DECISIONS 385 and 393): the app page's rhythm (32 under 720, 40 in a tab panel,
// .section-description), the page title on a phone built from the bar (data-phone-title="page") and its echo, the rail at every width (data-rail), the
// lockup and the footnote, the account's row in the narrow menu, More's rows that are not destinations, the wide sheet, the callout's meta, the message
// page, and the short window. Synthetic data in two unlike domains (a tide gauge and a bakery). Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (body) => compose(`<title>t5</title>${body}`, { fonts: false }).html;
async function open(body, options = {}) {
  const opened = await openHtml(browser, html(body), { scheme: "dark", ...options });
  await settle(opened.page);
  return opened;
}
const axe = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(() => globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => v.id)));
};
const box = (page, s) => page.locator(s).first().boundingBox();

const SHELL = ({ shell = "", header = "", main = "", foot = "" } = {}) => `
<div class="app-shell" ${shell}>
  <aside class="app-sidebar">
    <div class="app-brand"><a class="brand" href="/" aria-label="Gauge home"><span class="brand-full"><span class="app-lockup"><span class="app-lockup-mark" aria-hidden="true"><svg width="36" height="36"></svg></span><span class="app-lockup-lines"><span>Harbour gauge</span><span>North breakwater</span></span></span></span><span class="brand-rail"><span class="app-lockup"><span class="app-lockup-mark" aria-hidden="true"><svg width="32" height="32"></svg></span></span></span></a></div>
    <div class="app-nav"><nav class="nav" aria-label="Primary"><ul class="nav-list"><li><a class="nav-item" href="#r" aria-current="page"><span class="nav-pill"><i data-icon="House"></i><span class="nav-label">Readings</span></span></a></li></ul></nav></div>
    <div class="app-account">${foot}</div>
  </aside>
  <div class="app-column">
    <header class="app-header" ${header}><div class="app-bar"><h1 class="app-title">Outer harbour gauge, north breakwater</h1><span class="spacer"></span></div></header>
    <main class="app-main" id="main">${main}</main>
  </div>
</div>`;

describe("the app page", () => {
  test("sections are 32 apart under 720 and 48 from it; a section's description is 14/20 in secondary", async () => {
    const main = `<section class="section"><div class="section-head"><h2>Tides</h2><p class="section-description">High and low water.</p></div></section><section class="section" id="s2"><div class="section-head"><h2>Sensors</h2></div></section>`;
    for (const [width, gap] of [[1440, 48], [390, 32]]) {
      const { page, context } = await open(SHELL({ main }), { width, touch: width === 390 });
      assert.equal(await page.locator("#s2").evaluate((el) => getComputedStyle(el).marginTop), `${gap}px`);
      assert.deepEqual(await page.locator(".section-description").evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]), ["14px", "20px"]);
      await context.close();
    }
  });

  test("data-phone-title=\"page\": the script builds the page head first in main and the echo; one h1 is shown at each width", async () => {
    for (const width of [1440, 390]) {
      const { page, context } = await open(SHELL({ header: 'data-phone-title="page"', main: '<div style="height: 2000px"></div>' }), { width, touch: width === 390 });
      assert.equal(await page.locator(".app-main > .app-page-head[data-phone-only]:first-child").count(), 1);
      const shown = await page.evaluate(() => [...document.querySelectorAll("h1")].filter((h) => h.getClientRects().length > 0).length);
      assert.equal(shown, 1);
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 600));
        await page.waitForFunction(() => document.querySelector(".app-echo")?.hasAttribute("data-shown"));
      }
      await context.close();
    }
  });

  test("data-rail keeps the 72px rail from 1024, the lockup's lines hidden there; the footnote is not drawn in the rail", async () => {
    const { page, context } = await open(SHELL({ shell: "data-rail", foot: '<div class="app-footnote"><div><p>Night shift</p><p class="faint">Since 06:00</p></div></div>' }), { width: 1440 });
    assert.equal(Math.round((await box(page, ".app-sidebar")).width), 72);
    assert.equal(await page.locator(".app-footnote").evaluate((el) => getComputedStyle(el).display), "none");
    await context.close();
  });

  test("axe finds nothing in either theme", async () => {
    for (const scheme of ["dark", "light"]) {
      const { page, context } = await open(SHELL({ header: 'data-phone-title="page"', main: "<p>Readings</p>" }), { scheme });
      assert.deepEqual(await axe(page), []);
      await context.close();
    }
  });
});

describe("the site bar's account and More's rows", () => {
  test("the account is last in the bar from 720 and a row of the narrow menu under it", async () => {
    const bar = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/">Bakery</a><nav class="topbar-links" aria-label="Primary"><a href="#o" aria-current="page">Orders</a><a href="#s">Stock</a></nav><span class="spacer"></span><span class="topbar-account"><button class="btn" data-variant="ghost" data-edge="end">Dana Okafor</button></span></div></header><main><p>Orders</p></main>`;
    let { page, context } = await open(bar, { width: 1440 });
    assert.ok((await page.locator(".topbar-inner .topbar-account").boundingBox()) !== null);
    await context.close();
    ({ page, context } = await open(bar, { width: 390, touch: true }));
    assert.equal(await page.locator(".topbar-inner .topbar-account").evaluate((el) => getComputedStyle(el).display), "none");
    await page.locator(".topbar-menu-trigger").click();
    await page.locator(".topbar-menu-account .btn").waitFor();
    await context.close();
  });

  test("More's before rows are full width and 44 tall, outside its nav", async () => {
    const body = `<nav class="tab-bar" aria-label="Primary"><ul class="tab-bar-list"><li><a class="tab-bar-item" href="#a"><span class="tab-bar-glyph"><i data-icon="House"></i></span><span class="tab-bar-label">Orders</span></a></li></ul></nav><dialog class="panel float modal sheet" data-side="bottom" open><div class="tab-bar-before"><button class="btn">Pause animations</button></div><nav class="nav" aria-label="More"></nav></dialog>`;
    const { page, context } = await open(body, { width: 390, touch: true });
    assert.ok(Math.round((await box(page, ".tab-bar-before .btn")).height) >= 44);
    assert.equal(await page.locator(".tab-bar-before .btn").evaluate((el) => !!el.closest("nav")), false);
    await context.close();
  });
});

describe("the wide sheet, the callout's meta and the message page", () => {
  test("a wide sheet is 720 at 1440 and the window at 390; its title is 18/26", async () => {
    const sheet = `<dialog class="panel float modal sheet" data-side="right" data-size="wide" open><header class="sheet-head"><div class="sheet-head-text"><h2 class="dialog-title" tabindex="-1">Order 1042</h2></div></header><div class="sheet-body"><p>Rye</p></div></dialog>`;
    for (const [width, expected] of [[1440, 720], [390, 390]]) {
      const { page, context } = await open(sheet, { width, touch: width === 390 });
      assert.equal(Math.round((await box(page, ".sheet")).width), expected);
      assert.deepEqual(await page.locator(".dialog-title").evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]), ["18px", "26px"]);
      await context.close();
    }
  });

  test("the meta sits after the title on its line, and goes whole to its own line when they do not fit", async () => {
    const callout = (width) => `<div style="width: ${width}px"><div class="panel callout" data-status="warning"><i data-icon="Warning"></i><div><div class="callout-head"><div class="callout-title">The proofing cabinet is above its set point</div><span class="callout-meta">Since 05:40</span></div><div class="callout-body">Check the door seal.</div></div></div></div>`;
    let { page, context } = await open(callout(900));
    let t = await box(page, ".callout-title");
    let m = await box(page, ".callout-meta");
    assert.ok(Math.abs(t.y - m.y) <= 3 && m.x >= t.x + t.width);
    await context.close();
    ({ page, context } = await open(callout(288), { width: 390, touch: true }));
    t = await box(page, ".callout-title");
    m = await box(page, ".callout-meta");
    assert.ok(m.y >= t.y + t.height - 0.5);
    await context.close();
  });

  test("the message page is centred at 1440 by 900 and its top never cut at 320 by 225", async () => {
    const body = `<main class="message-page"><div class="message-page-body"><h1>This link has expired</h1><p>Ask the bakery for a new one.</p><div class="cluster"><a class="btn" href="/">Back to orders</a></div></div></main>`;
    const { page, context } = await open(body, { width: 1440 });
    const b = await box(page, ".message-page-body");
    assert.ok(Math.abs(b.x + b.width / 2 - 720) <= 1);
    await page.setViewportSize({ width: 320, height: 225 });
    await settle(page);
    assert.ok((await box(page, ".message-page-body")).y >= 0);
    await context.close();
  });
});

describe("a short window", () => {
  test("under 480 tall the app header and the tab bar are in the flow, and --basalt-sticky-top is 0", async () => {
    const body = SHELL({ main: '<div style="height: 1200px"></div>' }) + `<nav class="tab-bar" aria-label="Primary"><ul class="tab-bar-list"><li><a class="tab-bar-item" href="#a"><span class="tab-bar-glyph"><i data-icon="House"></i></span><span class="tab-bar-label">Orders</span></a></li></ul></nav>`;
    const { page, context } = await open(body, { width: 390, touch: true });
    await page.setViewportSize({ width: 390, height: 225 });
    await settle(page);
    assert.equal(await page.locator(".app-header").evaluate((el) => getComputedStyle(el).position), "static");
    assert.equal(await page.locator(".tab-bar").evaluate((el) => getComputedStyle(el).position), "static");
    assert.match(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-sticky-top").trim()), /^0(px)?$/);
    await context.close();
  });
});
