// The stand-in site header's behaviour (sites/shared/site-header.js and .css), on the fixture pages: the narrow menu's contract, the three
// forms of the bar, the clear bar's change at the first pixel of scroll and back, and the shared hover pill. The measured margins are wider
// than a fallback font's width (CI's Linux runner draws a different font from a Mac).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { buildPage } from "../build.mjs";
import { fixturesDir, launch, openHtml, settled } from "./support.mjs";

let browser;
let sample;
let stage;
before(async () => {
  browser = await launch();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-header-"));
  sample = buildPage(path.join(fixturesDir, "sample", "index.body.html"), { outFile: path.join(out, "sample.html") }).html;
  stage = buildPage(path.join(fixturesDir, "stage", "index.body.html"), { outFile: path.join(out, "stage.html") }).html;
});
after(async () => { await browser?.close(); });

const alphaOf = (page, css) => page.evaluate((c) => { const x = document.createElement("canvas").getContext("2d"); x.clearRect(0, 0, 1, 1); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return x.getImageData(0, 0, 1, 1).data[3]; }, css);
const state = (page) => page.locator("header.basalt-site-header").evaluate((el) => {
  const s = getComputedStyle(el);
  return { background: s.backgroundColor, line: s.borderBottomColor, filter: s.backdropFilter, top: el.hasAttribute("data-top"), jump: el.hasAttribute("data-jump"), height: el.getBoundingClientRect().height, running: el.getAnimations().filter((a) => a.transitionProperty).map((a) => a.transitionProperty) };
});
const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve)); });
};
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}.${[...a.classList].join(".")}${a.getAttribute("aria-label") ? ` [${a.getAttribute("aria-label")}]` : ""}${a.textContent && a.tagName === "A" ? ` "${a.textContent.trim()}"` : ""}` : "none"; });
const insideMenu = (page) => page.evaluate(() => !!document.activeElement?.closest(".basalt-site-menu"));
const menuOpen = (page) => page.evaluate(() => !document.querySelector(".basalt-site-menu-root").hidden);

describe("the narrow menu's contract", () => {
  for (const theme of ["dark", "light"]) {
    test(`it is a dialog the Menu button opens; focus lands on Close; the page is inert and does not scroll (${theme})`, async () => {
      const { page, context, errors } = await openHtml(browser, sample, { scheme: theme, width: 390 });
      const trigger = page.locator(".basalt-site-menu-trigger");
      assert.equal(await trigger.getAttribute("aria-label"), "Menu");
      assert.equal(await trigger.getAttribute("aria-haspopup"), "dialog");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.equal(await menuOpen(page), false, "closed: the menu is not in the page");
      await trigger.click();
      await settled(page);
      assert.equal(await menuOpen(page), true);
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      assert.equal(await trigger.getAttribute("aria-controls"), await page.locator(".basalt-site-menu").getAttribute("id"));
      assert.equal(await page.locator(".basalt-site-menu").getAttribute("role"), "dialog");
      assert.match(await active(page), /button\.btn\.basalt-site-menu-close \[Close menu\]/, "focus is on Close");
      assert.equal(await page.evaluate(() => [...document.body.children].filter((n) => !n.classList.contains("basalt-site-menu-root") && n.id !== "basalt-live").every((n) => n.hasAttribute("inert"))), true, "the page under it is inert");
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), "hidden", "and does not scroll");
      const dark = theme === "dark";
      assert.equal(await page.locator(".basalt-sheet-backdrop").evaluate((el) => getComputedStyle(el).position), "fixed");
      assert.ok((await alphaOf(page, await page.locator(".basalt-sheet-backdrop").evaluate((el) => getComputedStyle(el).backgroundColor))) > 0, `the scrim is ${dark ? "80" : "40"}% black`);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("Tab wraps inside the menu in both directions and never leaves for the browser; Shift+Tab from the first goes to the last", async () => {
    const { page, context } = await openHtml(browser, sample, { width: 390 });
    await page.locator(".basalt-site-menu-trigger").click();
    await settled(page);
    const order = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      assert.equal(await insideMenu(page), true, `Tab ${i + 1} stayed inside: ${await active(page)}`);
      order.push(await active(page));
    }
    // brand, toggle, Close, Overview, Guides, Pricing, the action, then round again: the cycle repeats every 7 stops
    assert.equal(new Set(order).size, 7, `seven stops in the cycle: ${order.join(" > ")}`);
    assert.deepEqual(order.slice(0, 5), order.slice(7, 12), "and it wraps from the last back to the first");
    // from Close (focus lands there), Shift+Tab walks back through the toggle and the brand, then wraps to the last
    await page.locator(".basalt-site-menu-close").focus();
    const back = [];
    for (let i = 0; i < 4; i++) { await page.keyboard.press("Shift+Tab"); assert.equal(await insideMenu(page), true, `Shift+Tab ${i + 1}`); back.push(await active(page)); }
    assert.match(back[2], /"Get started"/, "from the first (the brand), Shift+Tab goes to the last: the action");
    // focus that is somewhere else (the body) comes in at the first on Tab
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press("Tab");
    assert.equal(await insideMenu(page), true);
    await context.close();
  });

  test("Escape closes it and returns focus to Menu; so does Close, the scrim and a link", async () => {
    const { page, context } = await openHtml(browser, sample, { width: 390 });
    const trigger = page.locator(".basalt-site-menu-trigger");
    const closers = [
      ["Escape", () => page.keyboard.press("Escape")],
      ["Close", () => page.locator(".basalt-site-menu-close").click()],
      ["the scrim", () => page.mouse.click(195, 700)],
      ["a link", () => page.locator(".basalt-site-menu .basalt-nav-item", { hasText: "Guides" }).click()],
    ];
    for (const [how, close] of closers) {
      await trigger.click();
      await settled(page);
      assert.equal(await menuOpen(page), true, `${how}: it opened`);
      await close();
      await settled(page);
      assert.equal(await menuOpen(page), false, `${how} closes it`);
      assert.match(await active(page), /basalt-site-menu-trigger \[Menu\]/, `${how}: focus goes back to Menu`);
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.equal(await page.evaluate(() => document.querySelectorAll("[inert]").length), 0, `${how}: the page is live again`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), "visible");
    }
    await context.close();
  });

  test("widening past 720 closes it and focuses the current link in the bar", async () => {
    const { page, context } = await openHtml(browser, sample, { width: 390 });
    await page.locator(".basalt-site-menu-trigger").click();
    await settled(page);
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.waitForFunction(() => document.querySelector(".basalt-site-menu-root").hidden);
    assert.match(await active(page), /a\.basalt-site-link "Overview"/, "the current link in the bar");
    assert.equal(await page.evaluate(() => document.querySelectorAll("[inert]").length), 0);
    await context.close();
  });

  test("the menu is the bar's band, then glyphless Nav rows, then the action at the foot; it is as tall as its content", async () => {
    const { page, context } = await openHtml(browser, sample, { width: 390, height: 844 });
    await page.locator(".basalt-site-menu-trigger").click();
    await settled(page);
    const box = (selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom }; });
    const sheet = await box(".basalt-site-menu");
    const band = await box(".basalt-site-menu-band");
    const foot = await box(".basalt-site-menu-foot .btn");
    assert.equal(band.h, 56, "the band is the bar's 56");
    assert.equal(band.y, 0);
    assert.ok(sheet.w >= 390 - 20 && sheet.w <= 390, `the full width of the page (less the scrollbar's gutter, which the page keeps while it does not scroll): ${sheet.w}`);
    assert.ok(sheet.h < 844 - 100, `as tall as its content: ${sheet.h}`);
    assert.ok(foot.y > band.bottom && foot.w > sheet.w - 40, "the action is last and full width");
    assert.equal(foot.h, 44, "44 tall");
    const rows = await page.locator(".basalt-site-menu .basalt-nav-item").evaluateAll((els) => els.map((el) => ({ pill: el.querySelector(".basalt-nav-pill").getBoundingClientRect().height, current: el.getAttribute("aria-current"), glyphs: el.querySelectorAll("svg").length })));
    assert.deepEqual(rows, [{ pill: 48, current: "page", glyphs: 0 }, { pill: 48, current: null, glyphs: 0 }, { pill: 48, current: null, glyphs: 0 }]);
    await context.close();
  });

  test("under reduced motion it is opacity only", async () => {
    const { page, context } = await openHtml(browser, sample, { width: 390, reducedMotion: "reduce" });
    await page.locator(".basalt-site-menu-trigger").click();
    await settled(page);
    const style = await page.locator(".basalt-site-menu").evaluate((el) => { const s = getComputedStyle(el); return { clip: s.clipPath, property: s.transitionProperty }; });
    assert.deepEqual(style, { clip: "none", property: "opacity" });
    await context.close();
  });

  test("it unrolls over duration-slower on ease-out and leaves at 0.75 of it on ease-in", async () => {
    const { page, context } = await openHtml(browser, sample, { width: 390 });
    const timing = () => page.locator(".basalt-site-menu").evaluate((el) => el.getAnimations().map((a) => ({ property: a.transitionProperty, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })));
    await page.locator(".basalt-site-menu-trigger").click();
    const opening = await timing();
    assert.deepEqual(opening.map((a) => [a.property, Math.round(a.duration), a.easing]), [["clip-path", 300, "cubic-bezier(0.16, 1, 0.3, 1)"]]);
    await settled(page);
    await page.keyboard.press("Escape");
    const leaving = await timing();
    assert.deepEqual(leaving.map((a) => [a.property, Math.round(a.duration), a.easing]), [["clip-path", 225, "cubic-bezier(0.4, 0, 1, 1)"]]);
    await context.close();
  });

  test("the menu's band is the bar again: the brand and the toggle sit where they were in the bar", async () => {
    const { page, context } = await openHtml(browser, sample, { width: 390 });
    const at = (selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const bar = { brand: await at(".basalt-site-bar .basalt-site-brand"), toggle: await at(".basalt-site-bar [data-theme-toggle]"), trigger: await at(".basalt-site-menu-trigger") };
    await page.locator(".basalt-site-menu-trigger").click();
    await settled(page);
    const band = { brand: await at(".basalt-site-menu-band .basalt-site-brand"), toggle: await at(".basalt-site-menu-band [data-theme-toggle]"), close: await at(".basalt-site-menu-close") };
    assert.deepEqual(band.brand, bar.brand);
    assert.deepEqual(band.toggle, bar.toggle);
    assert.deepEqual(band.close, bar.trigger, "Close is on Menu's exact box");
    // the toggle in the band is wired: it switches the theme
    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.locator(".basalt-site-menu-band [data-theme-toggle]").click();
    assert.notEqual(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), before);
    await context.close();
  });
});

describe("the bar's three forms", () => {
  for (const theme of ["dark", "light"]) {
    test(`smoked is the default: the one backdrop-filter, surface-chrome, the hairline (${theme})`, async () => {
      const { page, context } = await openHtml(browser, sample, { scheme: theme });
      const s = await state(page);
      assert.match(s.filter, /blur\(12px\)/);
      const alpha = await alphaOf(page, s.background);
      assert.ok(alpha > 0 && alpha < 255, `translucent: ${alpha}`);
      assert.equal(s.height, 56);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => { const x = getComputedStyle(el); return (x.backdropFilter && x.backdropFilter !== "none") || (x.webkitBackdropFilter && x.webkitBackdropFilter !== "none"); }).length), 1, "once per viewport");
      // a page with no stage never clears: the bar is smoked at the top too
      await context.close();
    });
  }

  test("solid is the same bar on surface-page with no filter, and it never reports the top", async () => {
    const html = sample.replace('class="basalt-chrome basalt-site-header"', 'class="basalt-chrome basalt-site-header" data-solid');
    const { page, context } = await openHtml(browser, html);
    const s = await state(page);
    assert.equal(s.filter, "none");
    assert.equal(await alphaOf(page, s.background), 255);
    assert.equal(s.top, false);
    await context.close();
  });

  test("smoked is the fallback: opaque without backdrop-filter, under forced colours (Canvas, a real line)", async () => {
    const { page, context } = await openHtml(browser, sample, { forcedColors: "active" });
    const s = await state(page);
    assert.equal(s.filter, "none");
    assert.equal(s.background, "rgb(0, 0, 0)", "Canvas in dark");
    assert.equal(await alphaOf(page, s.line), 255, "a real line");
    await context.close();
  });
});

describe("the clear bar over a stage", () => {
  for (const theme of ["dark", "light"]) {
    test(`clear at the very top (no fill, no blur, a transparent line, still 56), smoked from the first pixel of scroll, clear again back at the top (${theme})`, async () => {
      const { page, context, errors } = await openHtml(browser, stage, { scheme: theme });
      let s = await state(page);
      assert.ok(s.top, "the page reports it is at its top");
      assert.equal(await alphaOf(page, s.background), 0, "no fill");
      assert.equal(await alphaOf(page, s.line), 0, "a transparent line");
      assert.equal(s.filter, "none", "no blur");
      assert.equal(s.height, 56);
      await scrollTo(page, 1);
      s = await state(page);
      assert.equal(s.top, false, "1px of scroll is not the top");
      assert.match(s.filter, /blur\(12px\)/, "the blur switches at once");
      assert.ok(s.running.includes("background-color"), `the fill is fading in: ${s.running}`);
      await settled(page);
      s = await state(page);
      assert.ok((await alphaOf(page, s.background)) > 0, "the fill has arrived");
      assert.ok((await alphaOf(page, s.line)) > 0, "and the line");
      assert.equal(s.height, 56, "nothing moved");
      await scrollTo(page, 0);
      s = await state(page);
      assert.ok(s.top, "back at the top");
      assert.equal(s.filter, "none", "the blur goes at once");
      await settled(page);
      s = await state(page);
      assert.equal(await alphaOf(page, s.background), 0);
      assert.equal(await alphaOf(page, s.line), 0);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("the fill and the line fade over duration-base on ease-out, and back at 0.75 of it on ease-in", async () => {
    const { page, context } = await openHtml(browser, stage);
    const timing = () => page.locator("header.basalt-site-header").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty).map((a) => [a.transitionProperty, Math.round(a.effect.getTiming().duration * 100) / 100, a.effect.getTiming().easing]).sort());
    // Read in the frame the page reports the change, when the fade has only begun.
    const leaveTop = async (y, top) => { await page.evaluate((to) => window.scrollTo(0, to), y); await page.waitForFunction((want) => document.querySelector("header.basalt-site-header").hasAttribute("data-top") === want, top); return timing(); };
    const forward = await leaveTop(1, false);
    assert.deepEqual(forward, [["background-color", 150, "cubic-bezier(0.16, 1, 0.3, 1)"], ["border-bottom-color", 150, "cubic-bezier(0.16, 1, 0.3, 1)"]], "in: duration-base on ease-out");
    await settled(page);
    const back = await leaveTop(0, true);
    assert.deepEqual(back, [["background-color", 112.5, "cubic-bezier(0.4, 0, 1, 1)"], ["border-bottom-color", 112.5, "cubic-bezier(0.4, 0, 1, 1)"]], "out: 0.75 of it on ease-in");
    await context.close();
  });

  test("a departure first reported past the slack (24px) is at once, with no fade", async () => {
    const { page, context } = await openHtml(browser, stage);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.evaluate(async () => { for (let i = 0; i < 3; i++) await new Promise((resolve) => requestAnimationFrame(resolve)); });
    const s = await state(page);
    assert.equal(s.top, false);
    assert.equal(s.jump, true, "marked to switch at once");
    assert.deepEqual(s.running.filter((p) => p === "background-color" || p === "border-bottom-color").length ? "fading" : "at once", "at once");
    assert.ok((await alphaOf(page, s.background)) > 0, "the fill is already there");
    await context.close();
  });

  test("a page that opens at the top is clear in its first frame, with no fade from smoked", async () => {
    // A transition on the header from the first frame would be a fade from smoked: record every transition that starts, from before the page loads.
    const { page, context } = await openHtml(browser, stage, { init: () => { document.addEventListener("transitionrun", (event) => { (window.__runs ??= []).push(`${event.target.tagName}.${event.propertyName}`); }, true); } });
    assert.equal(await page.evaluate(() => document.querySelector("header.basalt-site-header").hasAttribute("data-top")), true);
    const runs = await page.evaluate(() => window.__runs ?? []);
    assert.deepEqual(runs.filter((r) => r.startsWith("HEADER.")), [], "no fill or line ever faded in on the header");
    await context.close();
  });

  test("reduced transparency, forced colours and print keep the opaque bar at the top", async () => {
    for (const mode of [{ forcedColors: "active" }]) {
      const { page, context } = await openHtml(browser, stage, mode);
      const s = await state(page);
      assert.equal(s.filter, "none");
      assert.equal(await alphaOf(page, s.background), 255, "Canvas, opaque");
      await context.close();
    }
    const { page, context } = await openHtml(browser, stage);
    await page.emulateMedia({ media: "print" });
    await settled(page);
    const s = await state(page);
    assert.equal(await alphaOf(page, s.background), 255, "print: opaque");
    assert.ok((await alphaOf(page, s.line)) > 0, "print: with its hairline");
    await context.close();
  });
});

describe("the shared hover pill", () => {
  test("one pill glides between links: in place on entry, travelling after, hidden by the first key", async () => {
    const { page, context } = await openHtml(browser, sample);
    const plate = page.locator(".basalt-site-links > .basalt-plate");
    assert.equal(await plate.evaluate((el) => el.dataset.state), "off");
    await page.locator(".basalt-site-link", { hasText: "Guides" }).hover();
    await settled(page);
    assert.equal(await plate.evaluate((el) => el.dataset.state), "on");
    const where = () => plate.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; });
    const pill = (name) => page.locator(".basalt-site-link", { hasText: name }).locator(".basalt-site-pill").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }; });
    assert.deepEqual(await where(), await pill("Guides"), "it hugs the link's pill");
    await page.locator(".basalt-site-link", { hasText: "Pricing" }).hover();
    await settled(page);
    assert.deepEqual(await where(), await pill("Pricing"), "and its width follows");
    await page.keyboard.press("ArrowDown");
    await settled(page);
    assert.equal(await page.locator(".basalt-site-links").evaluate((el) => el.hasAttribute("data-keys")), true, "the first key hides it");
    assert.equal(await plate.evaluate((el) => el.dataset.state), "off");
    await page.mouse.move(700, 400);
    await context.close();
  });

  test("there is no shared pill on touch, under reduced motion or in forced colours: each link paints its own", async () => {
    for (const mode of [{ reducedMotion: "reduce" }, { forcedColors: "active" }, { width: 390, touch: true }]) {
      const { page, context } = await openHtml(browser, sample, { width: 1440, ...mode });
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-site-links > .basalt-plate")).display), "none", JSON.stringify(mode));
      await context.close();
    }
  });

  test("the current page is primary at 600 with its width reserved: becoming current moves nothing", async () => {
    const { page, context } = await openHtml(browser, sample);
    const boxes = () => page.locator(".basalt-site-link").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x * 100) / 100, Math.round(r.width * 100) / 100]; }));
    const before = await boxes();
    await page.evaluate(() => { const links = document.querySelectorAll(".basalt-site-link"); links[0].removeAttribute("aria-current"); links[2].setAttribute("aria-current", "page"); });
    assert.deepEqual(await boxes(), before);
    await context.close();
  });
});
