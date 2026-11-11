// The layout and chart tokens (council item 101): each is emitted to CSS, JS and Swift; a rem is resolved at 16 in Swift; the
// breakpoints are generated for PostCSS and exported as numbers.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const dist = (file) => fs.readFileSync(new URL(`../dist/${file}`, import.meta.url), "utf8");
const css = dist("css/tokens.css");
const json = JSON.parse(dist("json/tokens.json"));
const swift = fs.readFileSync(new URL("../../../Sources/BasaltTokens/Tokens.swift", import.meta.url), "utf8");

const LENGTHS = {
  "size-header": ["56px", 56, "header"], "size-tab-bar": ["56px", 56, "tabBar"], "size-sidebar-width": ["256px", 256, "sidebarWidth"], "size-rail-width": ["72px", 72, "railWidth"],
  "size-page-width": ["72rem", 1152, "pageWidth"], "size-prose-width": ["34rem", 544, "proseWidth"],
  "size-gutter": ["var(--basalt-space-6)", 24, "gutter"], "size-gutter-narrow": ["var(--basalt-space-4)", 16, "gutterNarrow"],
  "size-breakpoint-md": ["720px", 720, "breakpointMd"], "size-breakpoint-lg": ["1024px", 1024, "breakpointLg"], "size-breakpoint-container": ["480px", 480, "breakpointContainer"],
  "size-description-label": ["160px", 160, "descriptionLabel"],
  "size-chart-line": ["2px", 2, "chartLine"], "size-chart-mark": ["8px", 8, "chartMark"], "size-cut": ["2px", 2, "cut"], "size-hatch-pitch": ["4px", 4, "hatchPitch"],
  "size-chart-bar-max": ["24px", 24, "chartBarMax"], "size-chart-bar-min": ["2px", 2, "chartBarMin"], "size-chart-dash": ["6px", 6, "chartDash"],
  "size-chart-dash-gap": ["4px", 4, "chartDashGap"], "size-chart-plot": ["240px", 240, "chartPlot"],
};

test("every layout and chart length is emitted to CSS as a custom property", () => {
  for (const [name, [value]] of Object.entries(LENGTHS)) assert.match(css, new RegExp(`--basalt-${name}: ${value.replace(/[().]/g, "\\$&")};`), `${name}: ${value}`);
});

test("every layout and chart length is in the JS tokens, and every chart colour role in both themes", () => {
  for (const name of Object.keys(LENGTHS)) assert.ok(json.primitives[name], `${name} is not in the JSON/JS tokens`);
  for (const theme of ["light", "dark"]) for (const role of ["observed", "plan", "band", "missing", "grid", "baseline", "axis"]) assert.ok(json[theme][`chart-${role}`], `${theme}: chart-${role}`);
});

test("every layout and chart length is in Swift in points, and a rem is resolved at 16 with a doc comment that says so", () => {
  for (const [name, [, points, id]] of Object.entries(LENGTHS)) assert.match(swift, new RegExp(`public static let ${id}: Double = ${points}\\n`), `${name} is ${points} points in Swift`);
  assert.match(swift, /\/\/\/ [^\n]*Written 72rem; resolved here at 16 points to the rem \(1152\)\.\n\s*public static let pageWidth/);
  assert.match(swift, /\/\/\/ [^\n]*Written 34rem; resolved here at 16 points to the rem \(544\)\.\n\s*public static let proseWidth/);
  for (const role of ["chartObserved", "chartPlan", "chartBand", "chartMissing", "chartGrid", "chartBaseline", "chartAxis"]) assert.match(swift, new RegExp(`public static let ${role} = ThemedColor`), role);
});

test("the gutter tokens are aliases of the space scale, so they cannot drift from it", () => {
  assert.equal(json.primitives["size-gutter"].css, json.primitives["space-6"].css);
  assert.equal(json.primitives["size-gutter-narrow"].css, json.primitives["space-4"].css);
});

test("the breakpoints are generated as @custom-media rules, and exported as numbers", async () => {
  const media = dist("css/breakpoints.css");
  assert.match(media, /@custom-media --basalt-phone \(width < 720px\);/);
  assert.match(media, /@custom-media --basalt-md \(width >= 720px\);/);
  assert.match(media, /@custom-media --basalt-lg \(width >= 1024px\);/);
  assert.match(media, /@custom-media --basalt-rail \(720px <= width < 1024px\);/);
  const { breakpoint } = await import(new URL("../dist/js/breakpoints.js", import.meta.url));
  assert.deepEqual({ ...breakpoint }, { md: 720, lg: 1024, container: 480 });
  const all = await import(new URL("../dist/js/tokens.js", import.meta.url));
  assert.deepEqual({ ...all.breakpoint }, { ...breakpoint });
});
