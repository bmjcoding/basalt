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

/**
 * An opaque colour as the 8-bit sRGB a browser paints, from the two notations a computed style writes here: `oklch(L C H)` (a token's value, as React's plate
 * tokens are since B3) and `color(srgb r g b)` (a color-mix(), as the skill's recipes are). Anything else (an alpha, a keyword, a shadow) is null.
 */
export function paint(value) {
  const srgb = /^color\(srgb ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)\)$/.exec(value);
  if (srgb) return srgb.slice(1).map((v) => Math.round(Math.min(1, Math.max(0, Number(v))) * 255));
  const lch = /^oklch\(([\d.]+)(%?) ([\d.]+) ([\d.]+|none)\)$/.exec(value);
  if (!lch) return null;
  const L = Number(lch[1]) / (lch[2] ? 100 : 1);
  const C = Number(lch[3]);
  const h = lch[4] === "none" ? 0 : (Number(lch[4]) * Math.PI) / 180;
  const [a, b] = [C * Math.cos(h), C * Math.sin(h)];
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return linear.map((c) => { const v = Math.min(1, Math.max(0, c)); return Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255); });
}

/**
 * Two computed values that are the same opaque colour written two ways (see `paint`). A token writes its lightness to four places, so the two may round to
 * neighbouring 8-bit steps (232 and 233): one step on a channel is the same colour, and anything more is a difference.
 */
export const samePaint = (a, b) => { const [x, y] = [paint(a), paint(b)]; return Boolean(x && y && x.every((c, i) => Math.abs(c - y[i]) <= 1)); };
