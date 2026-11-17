// The browser floor (docs/foundations.md, "Browser support"; DECISIONS 140): Chrome 123, Safari 17.5 and Firefox 121 for the React
// package and the tokens. This test reads the CSS the package ships and fails when it uses a feature that one of those browsers
// gained after the floor, unless the use is listed below with the reason it is harmless.
//
// It is a table, not a proof: it catches the features it knows. Add a row when the CSS reaches for a new one. The versions are the
// oldest release with full, unprefixed support, from MDN and caniuse (the starred ones were read from caniuse-lite when the table was
// written: oklch(), @layer, :has(), @container, range media, subgrid, the viewport units, nesting). They are not computed from a
// dependency on purpose: caniuse-lite is not one of this package's dependencies.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { pkg } from "./support.mjs";

export const FLOOR = { chrome: 123, safari: 17.5, firefox: 121 };

/** [feature, pattern in the CSS with its comments removed, the oldest Chrome, Safari and Firefox with full support] */
const FEATURES = [
  ["oklch()", /oklch\(/, 111, 15.4, 113],
  ["color-mix()", /color-mix\(/, 111, 16.2, 113],
  ["@layer", /@layer\b/, 99, 15.4, 97],
  [":has()", /:has\(/, 105, 15.4, 121],
  ["@container", /@container\b/, 106, 16, 110],
  ["range media queries (width < 720px)", /\(\s*(?:width|height|inline-size|block-size)\s*[<>]=?|[<>]=?\s*(?:width|height)\s*\)/, 104, 16.4, 63],
  ["subgrid", /\bsubgrid\b/, 117, 16, 71],
  ["the lh unit", /(?<![\w-])\d*\.?\d+r?lh\b/, 109, 16.4, 120],
  ["dvh, svh and lvh", /(?<![\w-])\d*\.?\d+[dsl]v(?:h|w|i|b|min|max)\b/, 108, 15.4, 101],
  ["light-dark()", /light-dark\(/, 123, 17.5, 120],
  ["scrollbar-gutter", /scrollbar-gutter/, 94, 18.2, 97],
  ["prefers-reduced-transparency", /prefers-reduced-transparency/, 118, Infinity, Infinity],
  ["text-wrap: balance", /text-wrap(?:-style)?\s*:\s*balance/, 114, 17.5, 121],
  ["text-wrap: pretty", /text-wrap(?:-style)?\s*:\s*pretty/, 117, 26, Infinity],
  ["CSS nesting", /(?:^|[{};])\s*&|\{\s*&/, 120, 17.2, 117],
  ["@starting-style", /@starting-style/, 117, 17.5, 129],
  ["transition-behavior (allow-discrete)", /transition-behavior|allow-discrete/, 117, 17.4, 129],
  ["@property", /@property\b/, 85, 16.4, 128],
  ["the round(), mod() and rem() functions", /(?<![\w-])(?:round|mod|rem)\(/, 125, 15.4, 118],
  ["field-sizing", /field-sizing/, 123, 26.2, Infinity],
  ["interpolate-size and calc-size()", /interpolate-size|calc-size\(/, 129, 26.2, Infinity],
  ["anchor positioning", /anchor-name|position-anchor|position-area|(?<![\w-])anchor\(/, 125, 26, 147],
  ["scroll-driven animation", /animation-timeline|scroll-timeline|view-timeline/, 115, 26, Infinity],
  ["view transitions", /view-transition/, 111, 18, 144],
  ["@scope", /@scope\b/, 118, 17.4, 146],
  ["::details-content", /::details-content/, 131, 18.4, 143],
  ["text-box-trim", /text-box(?:-trim|-edge)?\s*:/, 133, 18.2, Infinity],
  ["the popover pseudo-class", /:popover-open|\[popover\]/, 114, 17, 125],
  ["backdrop-filter", /backdrop-filter/, 76, 9, 103], // Safari 9 to 17 take the -webkit- form, which the sheet writes beside it
];

/** A use above the floor that is known and harmless, with why. A row the CSS no longer needs fails (remove it). */
const ALLOWED = {
  "scrollbar-gutter": "A browser without it (Safari before 18.2) has overlay scrollbars, which take no room, so there is nothing to reserve.",
  "prefers-reduced-transparency": "The query is the opaque fallback for the sticky header; a browser that does not evaluate it (Safari, Firefox) keeps the smoked header. Text on the bar holds 4.5:1 over any backdrop, so this is comfort and not legibility (foundations, Browser support).",
  "text-wrap: pretty": "A hint for the last line of a paragraph; a browser without it wraps as it always did.",
  "the round(), mod() and rem() functions": "The plain badge's dot margin (components.css, .basalt-badge[data-variant=\"plain\"] > .basalt-badge-dot). Chrome 123 and 124 drop the declaration, so the dot sits in its seat to the half pixel and not on whole pixels. A fix changes a pixel, so it is the council's: found by this check, reported on the pull request that added it.",
};

const sheets = () => {
  const files = [path.join(pkg, "dist", "styles.css"), path.join(pkg, "dist", "fonts.css")];
  const tokens = path.join(pkg, "..", "tokens", "dist", "css");
  for (const file of fs.readdirSync(tokens)) if (file.endsWith(".css")) files.push(path.join(tokens, file));
  return files.map((file) => ({ file: path.relative(path.join(pkg, ".."), file), css: fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") }));
};

/** Every feature the CSS uses that some browser of the floor gained later: name -> the files and the browsers. */
export function aboveTheFloor(sheetList = sheets(), features = FEATURES) {
  const found = new Map();
  for (const [name, pattern, chrome, safari, firefox] of features) {
    const late = Object.entries({ chrome, safari, firefox }).filter(([browser, version]) => version > FLOOR[browser]).map(([browser, version]) => `${browser} ${version === Infinity ? "none" : version}`);
    const files = sheetList.filter(({ css }) => pattern.test(css)).map(({ file }) => file);
    if (late.length && files.length) found.set(name, { files, late });
  }
  return found;
}

test("the built CSS uses no feature that a browser of the floor gained after it, except the ones listed with a reason", () => {
  const found = aboveTheFloor();
  const unlisted = [...found].filter(([name]) => !(name in ALLOWED)).map(([name, { files, late }]) => `${name} (${late.join(", ")}) in ${files.join(", ")}`);
  assert.deepEqual(unlisted, [], "the CSS uses a feature above the floor in docs/foundations.md (Browser support): use a feature the floor has, guard it with @supports, or list it here with why it is harmless");
  assert.deepEqual(Object.keys(ALLOWED).filter((name) => !found.has(name)), [], "an allowed feature is no longer used above the floor: remove its row");
});

test("the check itself catches a feature above the floor and passes one at it", () => {
  const sheet = (css) => [{ file: "probe.css", css }];
  assert.deepEqual([...aboveTheFloor(sheet(".a { field-sizing: content; }")).keys()], ["field-sizing"]);
  assert.deepEqual([...aboveTheFloor(sheet(".a { margin: round(down, 3.5px, 1px); }")).keys()], ["the round(), mod() and rem() functions"]);
  assert.deepEqual([...aboveTheFloor(sheet(".a { color: light-dark(white, black); } .b:has(.c) { display: grid; }")).keys()], []);
  assert.deepEqual([...aboveTheFloor(sheet("@media (width < 720px) { .a { inset: 0 } } .a { height: 100dvh; padding: 2lh }")).keys()], []);
});

test("the floor is written in foundations and in the README as the check holds it", () => {
  const words = `Chrome ${FLOOR.chrome}, Safari ${FLOOR.safari} and Firefox ${FLOOR.firefox}`;
  for (const file of [path.join(pkg, "README.md"), path.join(pkg, "..", "..", "docs", "foundations.md")]) {
    assert.ok(fs.readFileSync(file, "utf8").replace(/\s+/g, " ").includes(words), `${path.basename(file)} states "${words}"`);
  }
});
