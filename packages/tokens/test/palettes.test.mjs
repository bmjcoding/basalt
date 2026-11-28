// Palettes (cimip-gaps-3 T9, DECISIONS 403, tests 2, 3 and 6): the definer, the verifier and the emitter, on the built module (npm run build first).
// Ratios are raw, never rounded up. Written by the builder; not run under the pause (DECISIONS 359).
import assert from "node:assert/strict";
import { test } from "node:test";

import beryl from "../palettes/beryl.mjs";
import ochre from "./palettes/ochre.mjs";
import { COLOR_HOOKS, HOOKS, MORE_CONTRAST_RESET, assertPalette, basaltPaletteCss, definePalette, paletteCss, paletteDeclarations, paletteSwift, verifyPalette } from "../dist/js/palettes.js";

const failsOn = (def, options) => verifyPalette(def, options).failures;
const pairKey = (p) => `${p.theme} ${p.subject} on ${p.on}`;

test("Beryl and Ochre pass; Beryl passes as Basalt's own (the status distance a failure), Ochre raises the status advisory and still passes", () => {
  assert.deepEqual(failsOn(beryl, { own: true }), []);
  const result = verifyPalette(ochre);
  assert.equal(result.ok, true, result.failures.map(pairKey).join("\n"));
  assert.ok(result.advisories.some((p) => p.kind === "status" && p.subject === "link.underline" && p.theme === "light" && p.on === "status-warning"), "the warm underline sits near warning");
  assert.ok(!verifyPalette(ochre, { own: true }).ok, "as Basalt's own, Ochre's status distances would fail");
});

test("Beryl's decided numbers: the light underline 4.44:1 at worst, the status distances 0.1603 (light) and 0.1801 (dark) against floors of 0.1470 and 0.1747", () => {
  const strict = { ...beryl, link: { ...beryl.link, underline: { light: "#386b7b", dark: "#3f8e98" } } };
  assert.deepEqual(failsOn(strict, { own: true }), []);
  // The first decision's light underline, #4a7f89, fails the status distance (0.1428 from success).
  const old = { ...beryl, link: { ...beryl.link, underline: { light: "#4a7f89", dark: "#3f8e98" } }, field: { ...beryl.field, edgeHover: { light: "#4a7f89", dark: "#3f8e98" } } };
  const failures = failsOn(old, { own: true });
  assert.ok(failures.some((p) => p.kind === "status" && p.subject === "link.underline" && p.theme === "light" && p.on === "status-success" && p.ratio < 0.147 && p.ratio > 0.142), failures.map(pairKey).join("\n"));
});

test("a fixture with a white resting underline, B's press fill and a pale primary with no edge fails on exactly those pairs", () => {
  const bad = definePalette({
    id: "bad",
    link: { underline: { light: "#ffffff", dark: "#3f8e98" } },
    button: { primary: { fill: { light: "#f3e3c5", dark: "#deb45b" }, fillHover: { light: "#f3e3c5", dark: "#eac675" }, fillPress: { light: "#c49642", dark: "#ca9f48" }, ink: { light: "#181008", dark: "#0f0904" } } },
  });
  const subjects = new Set(failsOn(bad).map((p) => p.subject));
  assert.ok(subjects.has("link.underline"), "the white underline");
  assert.ok(subjects.has("button.primary.ink at 0.72"), "B's press fill: the amount at 0.72 under 4.5");
  assert.ok(subjects.has("button.primary.fill"), "a pale primary with no edge is under 3:1 on the page");
  for (const s of subjects) assert.ok(["link.underline", "button.primary.ink at 0.72", "button.primary.fill", "button.primary.fillHover"].includes(s), `unexpected failure: ${s}`);
});

test("a brand outline ink fails at 0.72; a chosen ink with no fill fails on the hovered page and the strong well though it passes the pill", () => {
  const outline = failsOn(definePalette({ id: "o", button: { outline: { ink: { light: "#1e7985", dark: "#5ccfdd" } } } }));
  assert.ok(outline.some((p) => p.subject === "button.outline.ink at 0.72"));
  const chosen = failsOn(definePalette({ id: "c", chosen: { ink: { light: "#1e7985", dark: "#5ccfdd" } } }));
  assert.ok(chosen.some((p) => p.subject === "chosen.ink" && /state-hover over/.test(p.on)), chosen.map(pairKey).join("\n"));
  assert.ok(chosen.some((p) => p.subject === "chosen.ink" && /surface-sunken-strong/.test(p.on)));
  assert.ok(!chosen.some((p) => p.on === "the pill"), "it passes the pill");
});

test("the sets that come together throw: a secondary fill with no press fill, a primary ink with no fill, a checked fill with no ink", () => {
  const pair = { light: "#101010", dark: "#f0f0f0" };
  assert.throws(() => definePalette({ id: "a", button: { secondary: { fill: pair, ink: pair } } }), /fillPress/);
  assert.throws(() => definePalette({ id: "b", button: { primary: { ink: pair } } }), /all four or none/);
  assert.throws(() => definePalette({ id: "c", checked: { fill: pair } }), /both or neither/);
  assert.throws(() => definePalette({ id: "d", button: { danger: { fill: pair } } }), /danger has no hook/);
  assert.throws(() => definePalette({ id: "e", link: { ink: { light: "#10101080", dark: "#f0f0f0" } } }), /opaque/);
  assert.throws(() => definePalette({ id: "basalt" }), /reserved/);
  assert.throws(() => definePalette({ id: "Bad" }), /must match/);
  assert.throws(() => definePalette({ id: "f", field: { radius: "full" } }), /may not be "full"/);
  assert.throws(() => definePalette({ id: "g", button: { radius: [8, 4] } }), /above its second/);
});

test("a primary disabled pair identical to the enabled pair fails", () => {
  const p = { ...beryl, id: "same", button: { ...beryl.button, primary: { ...beryl.button.primary, fillDisabled: beryl.button.primary.fill, inkDisabled: beryl.button.primary.ink } } };
  assert.ok(failsOn(p).some((x) => x.kind === "identical"));
});

test("every palette block declares every hook, inside one @supports block, and resets the stepping lines under more contrast", () => {
  const css = paletteCss([beryl]);
  assert.match(css, /@layer basalt \{\n {2}@supports \(color: light-dark\(white, black\)\) \{/);
  const block = css.slice(css.indexOf('[data-palette="beryl"] {'), css.indexOf("}", css.indexOf('[data-palette="beryl"] {')));
  for (const hook of HOOKS) assert.ok(block.includes(`${hook}:`), `beryl's block names ${hook}`);
  assert.equal(paletteDeclarations(undefined).length, HOOKS.length);
  for (const [, value] of paletteDeclarations(undefined)) assert.equal(value, "initial");
  for (const name of MORE_CONTRAST_RESET) assert.match(css, new RegExp(`prefers-contrast: more\\) \\{ \\[data-palette="beryl"\\] \\{[^}]*${name}: initial`));
  assert.equal(COLOR_HOOKS.length, 30);
  assert.equal(HOOKS.length, 36, "30 colours, 4 corners, the press scale and the private duration");
  // Basalt's own block: every hook initial.
  const own = basaltPaletteCss();
  for (const hook of HOOKS) assert.ok(own.includes(`${hook}: initial;`));
});

test("paletteCss verifies first and throws on a failure, listing the pairs; the private duration is set only for a palette that sets a field's hover or active edge", () => {
  assert.throws(() => paletteCss([definePalette({ id: "x", link: { underline: { light: "#ffffff", dark: "#000000" } } })]), /link\.underline/);
  assert.throws(() => assertPalette(definePalette({ id: "x", link: { ink: { light: "#ffffff", dark: "#000000" } } })), /fails/);
  assert.match(paletteCss([beryl]), /--_basalt-palette-edge-duration: var\(--basalt-duration-fast\)/);
  const noEdge = paletteCss([definePalette({ id: "y", link: beryl.link })]);
  assert.match(noEdge, /--_basalt-palette-edge-duration: initial/);
});

test("paletteSwift writes a Basalt.Palette with the same values", () => {
  const swift = paletteSwift(beryl);
  assert.match(swift, /^Basalt\.Palette\(/);
  assert.match(swift, /id: "beryl"/);
  assert.match(swift, /buttonRadius: 4,\n {2}buttonRadiusLarge: 6/);
  assert.match(swift, /linkInk: ThemedColor\(light: RGBA\(red: 0\.035294/);
});
