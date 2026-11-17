// Shared by the behaviour tests: bundle a small React fixture against the built package
// (dist), open it in Chromium with the real stylesheet, and drive it.
import fs from "node:fs";
import path from "node:path";
import { after } from "node:test";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";
import { chromium } from "playwright";

export const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");

/**
 * The style sheet as it is written: the tokens, the components and the accent classes, with their comments and whitespace, as `dist/styles.css` was before the
 * build took those out of it (build.mjs; test/audit-fix-c3.test.mjs proves the shipped sheet is exactly this one without them). For a test that reads the
 * sheet's text by its layout (a selector with its quotes, a rule on one line); a test that draws the sheet reads `dist/styles.css`, as an app does.
 */
export const sourceStyles = () => {
  const tokens = path.join(pkg, "..", "tokens", "dist", "css");
  return `${fs.readFileSync(path.join(tokens, "tokens.css"), "utf8")}\n${fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8")}\n${fs.readFileSync(path.join(tokens, "accents.css"), "utf8")}`;
};

// A fixture is bundled against the built package (dist) with React, as before, but through one esbuild context for the whole test process: a rebuild
// re-parses only what changed (the fixture's own body, a virtual module) and reuses the parsed package and React, which a bundle from nothing parsed again
// for each of 340 fixture pages (330 ms and 5,500 files each). The output is the same text a build from nothing writes (test/audit-fix-c3.test.mjs checks it).
// Rebuilds of one context cannot overlap, so they queue.
const define = { "process.env.NODE_ENV": '"production"' };
const PRELUDE = `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js"; `;
let fixtureContext;
let fixtureBody = "";
let fixtureQueue = Promise.resolve();
// An open context keeps the process alive: let go of it when the test file that imported this module has run. (Registered here, outside any test, so it is
// the file's own `after`.)
after(async () => { await fixtureQueue; await (await fixtureContext)?.dispose(); });

function context() {
  fixtureContext ??= esbuild.context({
    entryPoints: ["basalt-fixture"],
    plugins: [{
      name: "fixture-body",
      setup(build) {
        build.onResolve({ filter: /^basalt-fixture$/ }, () => ({ path: "basalt-fixture", namespace: "fixture" }));
        build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `${PRELUDE}${fixtureBody}`, resolveDir: pkg, loader: "tsx" }));
      },
    }],
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define,
  });
  return fixtureContext;
}

/** Bundle `body` (TSX) with the whole package imported as `B`, React as `React`, and `createRoot`. */
export function bundleFixture(body) {
  const built = fixtureQueue.then(async () => {
    const ctx = await context();
    fixtureBody = body;
    return (await ctx.rebuild()).outputFiles[0].text;
  });
  fixtureQueue = built.catch(() => {});
  return built;
}

/** The same bundle, built from nothing in a context of its own: what `bundleFixture` must equal. */
export async function bundleFixtureFromScratch(body) {
  const result = await esbuild.build({
    stdin: { contents: `${PRELUDE}${body}`, resolveDir: pkg, loader: "tsx" },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define,
  });
  return result.outputFiles[0].text;
}

export async function launch() {
  return chromium.launch();
}

/**
 * A page with the stylesheet and a fixture. The fixture defines `window.show(kind, props)` and/or
 * renders on its own into `#root`. Returns the page and the errors it logged.
 *
 * `clock: true` installs Playwright's fake clock before the page's scripts run, so timers,
 * requestAnimationFrame and performance.now only move when the test calls `page.clock.runFor`.
 * It is paused before the fixture loads, so the fixture loads with time frozen. CSS transitions and
 * animations are not on that clock: pause them through `document.getAnimations()`.
 */
export async function fixturePage(browser, body, { theme = "light", clock = false, ...options } = {}) {
  const page = await browser.newPage(options);
  page.setDefaultTimeout(5000);
  // Pause straight after installing, before the page loads anything. pauseAt throws if its time has already passed, and
  // the clock runs in real time until it is paused, so pausing after the fixture loads raced a slow runner. Nothing runs
  // between these two calls; the margin only has to cover one round trip.
  if (clock) {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(10_000);
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<html data-theme="${theme}"><head><style>${css()}</style></head><body><div id="root"></div></body></html>`);
  await page.addScriptTag({ content: await bundleFixture(body) });
  return { page, errors };
}

/** Wait for every finite animation and transition on the page to finish. */
export async function settle(page) {
  // Under a frozen clock (see freezeAnimations) nothing finishes by itself: run it out, and say so if something cannot end.
  if (page.animationClock?.frozen) {
    await page.animationClock.runOut();
    return;
  }
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  });
}

/**
 * Take time into the test's hands. A test that samples a transition part-way through (the hover pill 25ms into a 150ms glide)
 * must not do it by waiting real time: on a loaded machine the wait runs past the end of the transition and the test fails
 * for no fault of the component. And a component's own timers (the glide decides a leave one task after the pointer goes)
 * must stay on the same timeline as its animations, or a late timer would go unseen. So this stops both:
 *
 *  - the page's animation timeline (the DevTools protocol's Animation.setPlaybackRate, at 0), so every CSS transition, CSS
 *    animation and element.animate() stays at the instant it began; and
 *  - the page's timers, requestAnimationFrame and performance.now (Playwright's fake clock, paused).
 *
 * `clock.advance(ms)` moves them together, in steps of at most 8ms: timers and frames due in a step run first, with animations
 * still at the step's start, then every running animation is aged by the step at its own playback rate. A timer set for
 * 250ms therefore finds a 150ms glide long over, exactly as it would in real time. Paused animations are never moved (a
 * component that leaves one paused is a fault the test must see), and `settle` throws on one rather than finishing it.
 *
 *   const clock = await freezeAnimations(page);   // finishes what is running first, then stops time
 *   await clock.advance(25);                      // 25ms later, on every timeline at once
 *   await clock.thaw();                           // real time again (Playwright's own polling needs it)
 *
 * Events, layout and rendering run in real time. Call it after the fixture is loaded and settled. Anything that waits for an
 * animation or timer by itself (Base UI closing a popup, `finished`, `waitForFunction`, which polls on requestAnimationFrame)
 * waits until the test advances or thaws, so freeze only around the motion being measured.
 */
export async function freezeAnimations(page) {
  await settle(page);
  const client = await page.context().newCDPSession(page);
  await client.send("Animation.enable");
  const now = Date.now();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now + 1000);
  await client.send("Animation.setPlaybackRate", { playbackRate: 0 });
  await page.evaluate(() => {
    // Only what is running moves, at its own rate. A paused animation, or one with no rate, stays where it is.
    window.__advanceAnimations = (ms) => {
      for (const a of document.getAnimations()) if (a.playState === "running") a.currentTime = Number(a.currentTime ?? 0) + ms * a.playbackRate;
    };
    // Finish every finite animation that is running; throw on one that cannot be finished honestly.
    window.__finishAnimations = () => {
      let left = 0;
      for (const a of document.getAnimations()) {
        const timing = a.effect?.getComputedTiming();
        if (!timing || timing.iterations === Infinity) continue;
        const name = a.transitionProperty ?? a.animationName ?? a.constructor.name;
        if (a.playState === "paused") throw new Error(`settle: the ${name} animation is paused and would never finish`);
        if (!(a.playbackRate > 0)) throw new Error(`settle: the ${name} animation has playback rate ${a.playbackRate} and would never finish`);
        if (a.playState === "running") { a.currentTime = timing.endTime; left += 1; }
      }
      return left;
    };
  });
  const clock = {
    frozen: true,
    async advance(ms) {
      for (let left = ms; left > 0;) {
        const step = Math.min(left, 8);
        await page.clock.runFor(step);
        await page.evaluate((step) => window.__advanceAnimations(step), step);
        left -= step;
      }
      if (ms <= 0) await page.clock.runFor(0); // timers already due still run
    },
    /** Run everything out: timers a second at a time, then finish what is animating, until nothing finite is left. */
    async runOut() {
      for (let round = 0; round < 20; round += 1) {
        await page.clock.runFor(1000);
        if ((await page.evaluate(() => window.__finishAnimations())) === 0) return;
      }
      throw new Error("settle: animations kept starting");
    },
    async thaw() {
      clock.frozen = false;
      await client.send("Animation.setPlaybackRate", { playbackRate: 1 });
      await page.clock.resume();
    },
  };
  page.animationClock = clock;
  return clock;
}

/** Wait `ms` on the page: on the frozen clock if it is frozen (see freezeAnimations), real time otherwise. */
export const tick = (page, ms) => (page.animationClock?.frozen ? page.animationClock.advance(ms) : page.waitForTimeout(ms));

/** Device pixels of a clip, from a screenshot decoded in the page: [[r, g, b], ...] row by row (a test of what is painted, in forced colours too). */
export async function pixels(page, clip) {
  const png = (await page.screenshot({ clip, type: "png" })).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, img.width, img.height);
    return Array.from({ length: img.width * img.height }, (_, i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  }, png);
}

const luminance = ([r, g, b]) => { const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
/** WCAG contrast ratio of two [r, g, b] pixels. */
export const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

/** The most contrast any pixel of a locator's box has against the pixel just left of it (the surface it sits on): how well it shows. */
export async function visibleAgainst(page, locator) {
  const r = await locator.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
  const box = { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) };
  const own = await pixels(page, box);
  const beside = (await pixels(page, { x: Math.max(0, box.x - 3), y: box.y + Math.floor(box.height / 2), width: 1, height: 1 }))[0];
  return Math.max(...own.map((p) => contrast(p, beside)));
}
