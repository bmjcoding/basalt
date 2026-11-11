// The decided header does not animate on load. The stand-in's script used to upgrade the page's markup (link classes, pill spans, the Menu
// button), and that started a transition on many loads, because a style pass before the upgrade gave the links their un-upgraded colour.
// The build now finishes the markup (sites/header-markup.mjs), so the script changes nothing in the bar; this proves it stays so. So each fixture is loaded many times, fresh, in both themes at 1440 and 390, and nothing in the header or the
// menu may be animating, or ever have started a transition or an animation, from the first frame after load, two frames later, and once
// the fonts are ready. (The brand fixture's hero has its own entrance, so only the header and the menu are looked at.)
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { buildPage } from "../build.mjs";
import { fixturesDir, HOST, launch } from "./support.mjs";

const LOADS = 30;
const FIXTURES = ["sample", "stage", "brand"];
let browser;
const pages = {};
before(async () => {
  browser = await launch();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-load-"));
  for (const name of FIXTURES) pages[name] = buildPage(path.join(fixturesDir, name, "index.body.html"), { outFile: path.join(out, `${name}.html`) }).html;
});
after(async () => { await browser?.close(); });

/** Runs before the page's own scripts: records every transition and animation that starts in the header or the menu, and samples what is animating there on each of the first frames. */
function record() {
  const scope = (el) => !!el && !!el.closest && !!el.closest(".basalt-site-header, .basalt-site-menu-root");
  const started = (event) => { if (scope(event.target)) (window.__started ??= []).push(`${event.type} ${event.target.tagName.toLowerCase()}.${String(event.target.className).trim().split(/\s+/).join(".")} ${event.propertyName ?? event.animationName}`); };
  for (const type of ["transitionrun", "transitionstart", "animationstart"]) document.addEventListener(type, started, true);
  window.__sample = () => document.getAnimations().filter((a) => scope(a.effect?.target)).map((a) => `${a.transitionProperty ?? a.animationName ?? "animation"} on ${a.effect.target.tagName.toLowerCase()}.${String(a.effect.target.className).trim().split(/\s+/).join(".")}`);
  window.__frames = [];
  let frames = 0;
  const tick = () => { window.__frames.push(window.__sample()); if (++frames < 8) requestAnimationFrame(tick); };
  document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(tick));
}

describe(`nothing in the header animates on load: ${LOADS} fresh loads of each fixture, in both themes, at 1440 and 390`, () => {
  for (const name of FIXTURES) {
    for (const scheme of ["dark", "light"]) {
      for (const width of [1440, 390]) {
        test(`${name}, ${scheme}, ${width}`, async () => {
          const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme });
          await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: pages[name] }) : route.abort()));
          await context.addInitScript(record);
          const problems = [];
          for (let load = 0; load < LOADS; load++) {
            const page = await context.newPage();
            await page.goto(HOST);
            const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.__sample())))));
            const first = await page.evaluate(() => window.__frames);
            const twoLater = await frames();
            await page.evaluate(() => document.fonts.ready);
            const afterFonts = await frames();
            const started = await page.evaluate(() => window.__started ?? []);
            const bar = await page.evaluate(() => ({ upgrading: document.querySelector(".basalt-site-header").hasAttribute("data-upgrading"), top: document.querySelector(".basalt-site-header").hasAttribute("data-top") }));
            if (first.flat().length || twoLater.length || afterFonts.length || started.length) problems.push({ load, first: [...new Set(first.flat())], twoLater, afterFonts, started });
            assert.equal(bar.upgrading, false, "there is no hold on transitions to release: the upgrade changes nothing in the bar");
            await page.close();
          }
          await context.close();
          assert.deepEqual(problems.slice(0, 3), [], `${problems.length} of ${LOADS} loads had motion in the header`);
        });
      }
    }
  }
});

describe("the header keeps its own transitions after load", () => {
  test("after load the header's own transitions are on, and a focus still steps the link's ink at the decided duration", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: pages.sample }) : route.abort()));
    const page = await context.newPage();
    await page.goto(HOST);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    const held = await page.evaluate(() => ({
      header: document.querySelector(".basalt-site-header").hasAttribute("data-upgrading"),
      link: getComputedStyle(document.querySelector(".basalt-site-link")).transitionProperty,
      pill: getComputedStyle(document.querySelector(".basalt-site-pill")).transitionProperty,
      plate: getComputedStyle(document.querySelector(".basalt-site-links > .basalt-plate")).transitionProperty,
    }));
    assert.deepEqual(held, { header: false, link: "color", pill: "background-color", plate: "opacity" });
    // keyboard focus on a link now runs its (instant) colour change as a transition with the decided duration, not none
    const duration = await page.evaluate(() => { const link = document.querySelectorAll(".basalt-site-link")[1]; link.focus(); return getComputedStyle(link).transitionDuration; });
    assert.equal(duration, "0s", "focus is at once (duration-instant), as the decided rule says");
    await context.close();
  });
});
