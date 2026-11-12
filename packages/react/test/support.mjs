// Shared by the behaviour tests: bundle a small React fixture against the built package
// (dist), open it in Chromium with the real stylesheet, and drive it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";
import { chromium } from "playwright";

export const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");

/** Bundle `body` (TSX) with the whole package imported as `B`, React as `React`, and `createRoot`. */
export async function bundleFixture(body) {
  const result = await esbuild.build({
    stdin: {
      contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js"; ${body}`,
      resolveDir: pkg,
      loader: "tsx",
    },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
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
