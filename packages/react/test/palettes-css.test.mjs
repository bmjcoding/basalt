// Palettes in the built CSS (cimip-gaps-3 T9, DECISIONS 403, test 2), read from the sheet's source as it ships: every changed declaration is the old value
// wrapped in a hook (the hook's fallback is the old value), or a rule-4 rule; every rule-4 rule is under the palette gate and forced-colors: none; no hook is
// given a value outside a palette block; Basalt's own block names every hook as initial. Needs no browser. Written by the builder; not run (DECISIONS 359).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { declarations, stripComments } from "../../tokens/test/accent-readers.mjs";
import { COLOR_HOOKS, HOOKS, SHAPE_HOOKS } from "../../tokens/dist/js/palettes.js";
import { pkg, sourceStyles } from "./support.mjs";

const GATE = ':where([data-palette]:not([data-palette="basalt"]))';
const components = stripComments(fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8"));
const all = declarations(sourceStyles());
const hooks = new Set(HOOKS);

test("no hook is given a value in components.css: they are read only, each with a fallback", () => {
  for (const d of declarations(components)) {
    assert.ok(!hooks.has(d.property), `${d.selector} sets ${d.property}`);
    // A private carrier (--_on-ink) reads the hook with no fallback on purpose: invalid while unset, so its readers keep their own fallbacks.
    if (d.property.startsWith("--_")) continue;
    for (const hook of [...COLOR_HOOKS.map(([, name]) => name), ...SHAPE_HOOKS]) {
      for (const at of [...d.value.matchAll(new RegExp(`var\\(${hook}(?![\\w-])([^)]*)`, "g"))]) assert.ok(at[1].startsWith(","), `${d.selector} reads ${hook} with no fallback`);
    }
  }
});

test("Basalt's own block (palette-base.css) is every hook initial, and the only rule that writes them outside a palette's CSS", () => {
  const writers = all.filter((d) => hooks.has(d.property));
  assert.ok(writers.length >= HOOKS.length);
  for (const d of writers) {
    assert.equal(d.selector, '[data-palette="basalt"]', `${d.selector} writes ${d.property}`);
    assert.equal(d.value, "initial");
  }
  for (const hook of HOOKS) assert.ok(writers.some((d) => d.property === hook), `${hook} is in Basalt's block`);
});

test("every rule-4 rule is under the palette gate and inside @media (forced-colors: none)", () => {
  // Walk the sheet's at-rules: a rule whose selector holds the gate must sit inside a forced-colors: none block.
  const stack = [];
  let i = 0;
  let found = 0;
  const text = components;
  let selectorStart = 0;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      const head = text.slice(selectorStart, i).trim();
      stack.push(head);
      if (head.includes(GATE)) {
        found += 1;
        assert.ok(stack.some((h) => /@media \(forced-colors: none\)/.test(h)), `${head.slice(0, 120)} is not inside @media (forced-colors: none)`);
      }
      selectorStart = i + 1;
    } else if (ch === "}") {
      stack.pop();
      selectorStart = i + 1;
    } else if (ch === ";") selectorStart = i + 1;
  }
  assert.ok(found >= 10, `found ${found} rule-4 rules`);
});

test("every reader of a hook falls back to the paint the reader drew before (spot checks of each family)", () => {
  const expect = [
    [".basalt-link, .basalt-rich-text a[href]", "color", "var(--basalt-link-ink, var(--basalt-text-primary))"],
    [".basalt-link, .basalt-rich-text a[href]", "text-decoration-color", "var(--basalt-link-underline, var(--basalt-border-input))"],
    [".basalt-segment[data-pressed]", "background", "var(--basalt-chosen-fill, var(--_pill))"],
    [".basalt-segment[data-pressed]", "color", "var(--basalt-chosen-ink, var(--basalt-text-primary))"],
    ['.basalt-button[data-variant="primary"]', "background", "var(--basalt-button-primary-fill, var(--basalt-action-primary))"],
    ['.basalt-button[data-variant="ghost"]', "color", "var(--basalt-button-ghost-ink, var(--basalt-text-secondary))"],
    [".basalt-radio[data-checked]", "background", "var(--basalt-checked-fill, var(--basalt-action-primary))"],
    [".basalt-input", "box-shadow", "inset 0 0 0 var(--basalt-size-hairline) var(--basalt-field-edge, var(--basalt-border-field))"],
    [".basalt-brand-svg[data-tone=\"brand\"], .basalt-brand-mark", "color", "var(--basalt-brand-mark, currentColor)"],
  ];
  const decls = declarations(components);
  for (const [selector, property, value] of expect) assert.ok(decls.some((d) => d.selector === selector && d.property === property && d.value === value), `${selector} { ${property}: ${value} }`);
});

test("the press is clamped between .98 and 1; a two-line Button caps its corner at radius-lg", () => {
  assert.match(components, /transform: scale\(clamp\(0\.98, var\(--basalt-button-press-scale, 0\.98\), 1\)\)/);
  assert.match(components, /border-radius: min\(var\(--_radius\), var\(--basalt-radius-lg\)\)/);
});

test("the shipped dist carries Basalt's block and the choice's first-frame rules for basalt and for no attribute; beryl's CSS is its own file", () => {
  const dist = fs.readFileSync(path.join(pkg, "dist", "components.css"), "utf8");
  assert.match(dist, /\[data-palette="?basalt"?\]\{--basalt-link-ink: ?initial/);
  assert.match(dist, /:root:not\(\[data-palette\]\) \.basalt-palette-choice \[data-value="?basalt"?\]/);
  const beryl = fs.readFileSync(path.join(pkg, "dist", "palettes", "beryl.css"), "utf8");
  assert.match(beryl, /\[data-palette="beryl"\] \{/);
  assert.match(beryl, /:root\[data-palette="beryl"\] \.basalt-palette-choice \[data-slide\] \[data-value="beryl"\]/);
});
