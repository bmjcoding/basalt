// Shared by the skill's tests: the composed pages, and a page opened in Chromium on a fake host (so storage and the clipboard work).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { launchOptions } from "../../../scripts/chromium-launch.mjs";

import { skillDir } from "../build.mjs";
import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";

export const here = path.dirname(fileURLToPath(import.meta.url));
export { skillDir };
export const repoRoot = path.join(skillDir, "..", "..", "..");
export const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");

/** The two example bodies, by name. */
export const EXAMPLES = { static: read(skillDir, "examples", "static.body.html"), interactive: read(skillDir, "examples", "interactive.body.html") };

/** A page composed from an example body, with `edit` applied to the body first. */
export function examplePage(name, { edit = (body) => body, ...options } = {}) {
  return compose(edit(EXAMPLES[name]), options);
}

export async function launch() {
  return chromium.launch(launchOptions());
}

/** Opens html in a new context; returns { page, context, errors }. */
export async function openHtml(browser, html, { scheme = "light", width = 1440, touch = false, reducedMotion = "no-preference", permissions, deviceScaleFactor = 1 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion, isMobile: touch, hasTouch: touch, permissions, deviceScaleFactor,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text()));
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto("https://basalt.test/");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { page, context, errors };
}
