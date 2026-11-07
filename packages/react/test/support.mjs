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
 * It is paused once the fixture has loaded. CSS transitions and animations are not on that clock: pause
 * them through `document.getAnimations()`.
 */
export async function fixturePage(browser, body, { theme = "light", clock = false, ...options } = {}) {
  const page = await browser.newPage(options);
  page.setDefaultTimeout(5000);
  if (clock) await page.clock.install({ time: 0 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<html data-theme="${theme}"><head><style>${css()}</style></head><body><div id="root"></div></body></html>`);
  await page.addScriptTag({ content: await bundleFixture(body) });
  // The clock runs while the fixture loads, which can take more than any fixed time on a slow runner, and pauseAt can't go
  // back: pause 1ms ahead of the page's own now.
  if (clock) await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1);
  return { page, errors };
}

/** Wait for every finite animation and transition on the page to finish. */
export async function settle(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  });
}
