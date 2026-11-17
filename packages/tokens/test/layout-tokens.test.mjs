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
  // DECISIONS 154: the control rungs above 40, and the two container widths a container query cannot read from a token.
  "size-control-2xl": ["44px", 44, "control2xl"], "size-control-3xl": ["48px", 48, "control3xl"], "size-control-4xl": ["52px", 52, "control4xl"],
  "size-control-5xl": ["56px", 56, "control5xl"], "size-control-6xl": ["64px", 64, "control6xl"],
  "size-breakpoint-container-sm": ["340px", 340, "breakpointContainerSm"], "size-breakpoint-container-lg": ["640px", 640, "breakpointContainerLg"],
  "size-chart-line": ["2px", 2, "chartLine"], "size-chart-mark": ["8px", 8, "chartMark"], "size-cut": ["2px", 2, "cut"], "size-hatch-pitch": ["4px", 4, "hatchPitch"],
  "size-chart-bar-max": ["24px", 24, "chartBarMax"], "size-chart-bar-min": ["2px", 2, "chartBarMin"], "size-chart-dash": ["6px", 6, "chartDash"],
  "size-chart-dash-gap": ["4px", 4, "chartDashGap"], "size-chart-plot": ["240px", 240, "chartPlot"],
  // DECISIONS 153: the second plot height, the marks row's default height and the range meter's marker.
  "size-chart-plot-sm": ["96px", 96, "chartPlotSm"], "size-chart-row": ["56px", 56, "chartRow"], "size-meter-marker": ["12px", 12, "meterMarker"],
};

test("every layout and chart length is emitted to CSS as a custom property", () => {
  for (const [name, [value]] of Object.entries(LENGTHS)) assert.match(css, new RegExp(`--basalt-${name}: ${value.replace(/[().]/g, "\\$&")};`), `${name}: ${value}`);
});

test("every layout and chart length is in the JS tokens, and every chart colour role in both themes", () => {
  for (const name of Object.keys(LENGTHS)) assert.ok(json.primitives[name], `${name} is not in the JSON/JS tokens`);
  for (const theme of ["light", "dark"]) for (const role of ["observed", "plan", "band", "missing", "grid", "baseline", "axis", "lit-top", "lit-mid", "lit-base"]) assert.ok(json[theme][`chart-${role}`], `${theme}: chart-${role}`);
});

test("every layout and chart length is in Swift in points, and a rem is resolved at 16 with a doc comment that says so", () => {
  for (const [name, [, points, id]] of Object.entries(LENGTHS)) assert.match(swift, new RegExp(`public static let ${id}: Double = ${points}\\n`), `${name} is ${points} points in Swift`);
  assert.match(swift, /\/\/\/ [^\n]*Written 72rem; resolved here at 16 points to the rem \(1152\)\.\n\s*public static let pageWidth/);
  assert.match(swift, /\/\/\/ [^\n]*Written 34rem; resolved here at 16 points to the rem \(544\)\.\n\s*public static let proseWidth/);
  for (const role of ["chartObserved", "chartPlan", "chartBand", "chartMissing", "chartGrid", "chartBaseline", "chartAxis", "chartLitTop", "chartLitMid", "chartLitBase"]) assert.match(swift, new RegExp(`public static let ${role} = ThemedColor`), role);
});

test("the 2px radius for a coverage strip's cell is in CSS and in Swift (xs2: a name cannot start with a digit)", () => {
  assert.match(css, /--basalt-radius-2xs: 2px;/);
  assert.match(swift, /public static let xs2: Double = 2\n/);
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

// ---- Art (council item 104): the art tokens, the headroom and the four aspect ratios, in CSS, JS and Swift ----

const ART_COLORS = { "art-field": "artField", "art-tone-1": "artTone1", "art-tone-2": "artTone2", "art-tone-3": "artTone3", "art-tone-4": "artTone4", "art-mark": "artMark", "art-quiet-limit": "artQuietLimit" };
const ASPECTS = { "aspect-square": ["1", 1, "square"], "aspect-photo": ["1.5", 1.5, "photo"], "aspect-screen": ["1.6", 1.6, "screen"], "aspect-wide": ["1.7778", 1.7778, "wide"] };

test("every art colour is emitted to CSS, in both themes of the JS tokens, and to Swift as a themed colour", () => {
  for (const [name, id] of Object.entries(ART_COLORS)) {
    assert.match(css, new RegExp(`--basalt-${name}: var\\(--basalt-[a-z0-9-]+\\);`), `${name} in CSS`);
    for (const theme of ["light", "dark"]) assert.equal(json[theme][name]?.type, "color", `${theme}: ${name}`);
    assert.match(swift, new RegExp(`public static let ${id} = ThemedColor`), id);
  }
});

test("the stage's headroom is 80px, the bar's 56 plus space-6, in CSS, JS and Swift", () => {
  assert.match(css, /--basalt-size-stage-headroom: 80px;/);
  assert.ok(json.primitives["size-stage-headroom"]);
  assert.match(swift, /public static let stageHeadroom: Double = 80\n/);
  assert.equal(80, 56 + 24);
  assert.equal(json.primitives["size-header"].css, "56px");
  assert.equal(json.primitives["space-6"].css, "24px");
});

test("the four aspect ratios are numbers in CSS, JS and Swift", () => {
  for (const [name, [value, number, id]] of Object.entries(ASPECTS)) {
    assert.match(css, new RegExp(`--basalt-${name}: ${value.replace(".", "\\.")};`), name);
    assert.equal(json.primitives[name]?.type, "number", name);
    assert.equal(Number(json.primitives[name].css), number, name);
    assert.match(swift, new RegExp(`public static let ${id}: Double = ${value.replace(".", "\\.")}\n`), `Basalt.Aspect.${id}`);
  }
  assert.match(swift, /public enum Aspect \{/);
});

// ---- Display type, the section gap and the display measure (DECISIONS 137, approved in 139): in CSS, JS and Swift ----

const DISPLAY_STEPS = {
  "6xl": [72, 76, -0.04, "xl6"], "7xl": [96, 96, -0.045, "xl7"],
  "hero-narrow": [44, 48, -0.03, "heroNarrow"], "display-narrow": [36, 40, -0.025, "displayNarrow"],
};
const SHIPPED_STEPS = { xs: [12, 16, 0.01], sm: [13, 18, 0], base: [14, 20, 0], md: [16, 24, -0.005], lg: [18, 26, -0.01], xl: [20, 28, -0.015], "2xl": [24, 30, -0.02], "3xl": [30, 36, -0.025], "4xl": [40, 44, -0.03], "5xl": [56, 60, -0.035] };

test("text-6xl 72/76 at -0.04em and text-7xl 96/96 at -0.045em, and the two phone values 44/48 and 36/40, are px and em in CSS, JS and Swift", () => {
  for (const [step, [size, line, tracking, id]] of Object.entries(DISPLAY_STEPS)) {
    assert.match(css, new RegExp(`--basalt-text-${step}-size: ${size}px;`), step);
    assert.match(css, new RegExp(`--basalt-text-${step}-line-height: ${line}px;`), step);
    assert.match(css, new RegExp(`--basalt-text-${step}-tracking: ${String(tracking).replace(".", "\\.")}em;`), step);
    assert.equal(json.primitives[`text-${step}-size`].css, `${size}px`);
    assert.match(swift, new RegExp(`public static let ${id} = TypeStyle\\(size: ${size}, lineHeight: ${line}, tracking: ${String(tracking).replace(".", "\\.")}\\)`), `${step} in Swift`);
  }
});

test("the ten shipped steps do not change", () => {
  for (const [step, [size, line, tracking]] of Object.entries(SHIPPED_STEPS)) {
    assert.equal(json.primitives[`text-${step}-size`].css, `${size}px`, step);
    assert.equal(json.primitives[`text-${step}-line-height`].css, `${line}px`, step);
    assert.equal(Number.parseFloat(json.primitives[`text-${step}-tracking`].css), tracking, step);
  }
});

test("space-32 is 128px and the three section gaps are aliases of space-32, space-24 and space-16, so they cannot drift from the scale", () => {
  assert.match(css, /--basalt-space-32: 128px;/);
  assert.match(swift, /public static let s32: Double = 128\n/);
  assert.equal(json.primitives["size-section-gap"].css, json.primitives["space-32"].css);
  assert.equal(json.primitives["size-section-gap-md"].css, json.primitives["space-24"].css);
  assert.equal(json.primitives["size-section-gap-narrow"].css, json.primitives["space-16"].css);
  for (const [name, points, id] of [["size-section-gap", 128, "sectionGap"], ["size-section-gap-md", 96, "sectionGapMd"], ["size-section-gap-narrow", 64, "sectionGapNarrow"]]) {
    assert.match(css, new RegExp(`--basalt-${name}: var\\(--basalt-space-\\d+\\);`), name);
    assert.match(swift, new RegExp(`public static let ${id}: Double = ${points}\\n`), id);
  }
});

test("size-display-measure is 13em in CSS and JS, and the number 13 in Swift with a doc comment that says it is ems", () => {
  assert.match(css, /--basalt-size-display-measure: 13em;/);
  assert.equal(json.primitives["size-display-measure"].css, "13em");
  assert.match(swift, /\/\/\/ [^\n]*number of ems \(13\)[^\n]*\n\s*public static let displayMeasure: Double = 13\n/);
});

test("font-family-sans is Geist, then Geist Fallback, then the system chain; the mono family is unchanged", () => {
  assert.match(css, /--basalt-font-family-sans: Geist, "Geist Fallback", ui-sans-serif, system-ui, sans-serif;/);
  assert.match(css, /--basalt-font-family-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;/);
});

test("the breakpoints are still 720, 1024 and 480: no 900 and no 1280 token", async () => {
  const { breakpoint } = await import(new URL("../dist/js/breakpoints.js", import.meta.url));
  assert.deepEqual({ ...breakpoint }, { md: 720, lg: 1024, container: 480 });
  assert.doesNotMatch(css, /breakpoint-(?:900|1280)|--basalt-size-breakpoint-xl/);
});

// DECISIONS 154: the hold of a confirmation (D11c) and the ink of a button's amount (D11b).
test("the confirm hold and the amount's opacity are emitted to CSS, JS and (the hold) Swift", () => {
  assert.match(css, /--basalt-duration-confirm: 1500ms;/);
  assert.match(css, /--basalt-opacity-amount: 0.72;/);
  assert.equal(json.primitives["duration-confirm"].css, "1500ms");
  assert.equal(json.primitives["opacity-amount"].css, "0.72");
  assert.match(swift, /public static let confirm: Double = 1.5\n/);
});

test("the control ladder has no gaps: 24, 28, 32, 36, 40, 44, 48, 52, 56, 64", () => {
  const rungs = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"].map((n) => parseFloat(json.primitives[`size-control-${n}`].css));
  assert.deepEqual(rungs, [24, 28, 32, 36, 40, 44, 48, 52, 56, 64]);
});
