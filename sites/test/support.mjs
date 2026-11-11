// Shared by the sites' tests: every page under sites/ (and the fixtures) built once, and a built page opened in Chromium on a fake
// host, so storage works and any request that is not the page itself is seen and refused.
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { buildPage, findPages, repoRoot, sitesDir } from "../build.mjs";

export { buildPage, repoRoot, sitesDir };
export const here = path.dirname(fileURLToPath(import.meta.url));
export const fixturesDir = path.join(here, "fixtures");
export const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/** Every page the harness runs on: each sites/SITE/PAGE.body.html, and each fixture. A later builder adds a page and it is here. */
export function allPages() {
  return [
    ...findPages(sitesDir).map((p) => ({ ...p, id: `${p.site}/${p.page}`, fixture: false, siteDir: path.join(sitesDir, p.site) })),
    ...findPages(fixturesDir).map((p) => ({ ...p, id: `fixture ${p.site}/${p.page}`, fixture: true, siteDir: path.join(fixturesDir, p.site) })),
  ];
}

/** Builds each page into a fresh temporary folder (so nothing in the repo changes). Returns the pages with { html, includes, outFile }. */
export function buildAll(pages = allPages()) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-"));
  return pages.map((p) => ({ ...p, ...buildPage(p.bodyFile, { outFile: path.join(out, p.site, `${p.page}.html`), siteDir: p.siteDir }) }));
}

export async function launch() {
  return chromium.launch();
}

export const HOST = "https://basalt.test/";

/**
 * Opens built html in a new context on a fake host. Returns { page, context, errors, requests }: `errors` is every console error or
 * warning and every uncaught error; `requests` is every request the page made that was not the page itself and not a data: URL (each
 * is aborted, so a page cannot depend on one).
 */
export async function openHtml(browser, html, { scheme = "dark", width = 1440, height = width <= 720 ? 844 : 900, touch = false, reducedMotion = "no-preference", forcedColors = "none", deviceScaleFactor = 1, storage = null, init = null } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion, forcedColors, isMobile: touch, hasTouch: touch, deviceScaleFactor });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text()));
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url === HOST) return route.fulfill({ contentType: "text/html", body: html });
    if (!url.startsWith("data:")) requests.push(url);
    return route.abort();
  });
  if (storage) await page.addInitScript((entries) => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, storage);
  if (init) await page.addInitScript(init);
  await page.goto(HOST);
  await page.evaluate(() => document.fonts.ready);
  await settled(page);
  return { page, context, errors, requests };
}

/** Two frames, then every finite animation and transition finished: nothing is mid-flight when it returns. */
export async function settled(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
}

/** axe-core's default rules over the whole document, as the skill's own tests run it. Returns one line per violation. */
export async function axe(page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`));
}

/** The Menu button, or null when the page has no narrow menu. */
export const menuTrigger = (page) => page.locator(".basalt-site-menu-trigger").first();
