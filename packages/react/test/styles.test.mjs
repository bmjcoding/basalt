import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

// The values a script writes on the page as it runs, not tokens (B5, the phone and what is pinned): the on-screen keyboard's watcher writes the first three on
// the root while a keyboard is up, and usePinnedEdges the other two on the scroller that owns what is pinned. Every rule that reads them is under the attribute
// the same script sets (`data-screen-keyboard`, `data-pinned-measured`), or gives a fallback.
const WRITTEN_AT_RUN_TIME = {
  "screen-keyboard.ts": ["--basalt-keyboard-inset", "--basalt-viewport-top", "--basalt-viewport-height"],
  "pinned-edges.ts": ["--basalt-pinned-top", "--basalt-pinned-bottom"],
};

test("every public token referenced by component CSS is defined in the distributed stylesheet", () => {
  const stylesheet = fs.readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8");
  const declared = new Set([...stylesheet.matchAll(/(--basalt-[\w-]+)\s*:/g)].map((match) => match[1]));
  const referenced = new Set([...stylesheet.matchAll(/var\((--basalt-[\w-]+)/g)].map((match) => match[1]));
  const runtime = new Set(Object.values(WRITTEN_AT_RUN_TIME).flat());
  assert.deepEqual([...referenced].filter((name) => !declared.has(name) && !runtime.has(name)), []);
});

test("the values written at run time are the ones each script writes, and none of them is a token", () => {
  for (const [file, names] of Object.entries(WRITTEN_AT_RUN_TIME)) {
    const source = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`const NAMES = \\[${names.map((name) => `"${name}"`).join(", ")}\\];`), `${file} writes ${names.join(", ")}`);
    assert.match(source, /style\.setProperty\(name/, `${file} sets them on an element's style`);
  }
  const tokens = JSON.parse(fs.readFileSync(new URL("../../tokens/dist/json/tokens.json", import.meta.url), "utf8"));
  const names = new Set(Object.values(tokens).flatMap((group) => Object.keys(group)).map((name) => `--basalt-${name}`));
  for (const name of Object.values(WRITTEN_AT_RUN_TIME).flat()) assert.ok(!names.has(name), `${name} is a token now: drop it from this list`);
});

// The run connector's inline start (DECISIONS 350): `calc(size-icon-sm / 2 - size-hairline)`, so its end edge sits on the marks' centre line. It replaced
// `round(down, size-icon-sm / 2 - size-hairline / 2, size-hairline)`, which Chrome 123 and 124 do not know; the two are the same length only while half
// the mark is a whole number of hairlines, so this fails if a token change would move the line.
test("the run connector stands 7px in, the length round() gave, in StageList, StageRail, RunTimeline and the skill's runs module", () => {
  const tokens = JSON.parse(fs.readFileSync(new URL("../../tokens/dist/json/tokens.json", import.meta.url), "utf8"));
  const px = (name) => {
    const token = Object.values(tokens).find((group) => name in group)?.[name];
    const match = /^(\d+(?:\.\d+)?)px$/.exec(token?.css ?? "");
    assert.ok(match, `${name} is a length in px (${token?.css})`);
    return Number(match[1]);
  };
  const icon = px("size-icon-sm");
  const hairline = px("size-hairline");
  assert.ok(Number.isInteger(icon / 2 / hairline), `size-icon-sm / 2 (${icon / 2}px) is a whole number of hairlines (${hairline}px)`);
  const rounded = Math.floor((icon / 2 - hairline / 2) / hairline) * hairline;
  assert.equal(icon / 2 - hairline, rounded, "the calc is the length round(down) gave");
  assert.equal(icon / 2 - hairline, 7);

  const value = "calc(var(--basalt-size-icon-sm) / 2 - var(--basalt-size-hairline))";
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const components = fs.readFileSync(new URL("../src/styles/components.css", import.meta.url), "utf8");
  for (const selector of [
    ".basalt-run-stages > .basalt-run-stage:not(:last-child)::after",
    '.basalt-run-rail:is([data-count="5"], [data-count="6"]) > .basalt-run-stage:not(:last-child)::after',
    ".basalt-run-steps > .basalt-run-step:not(:last-child)::after",
  ]) {
    const rule = new RegExp(`${escape(selector)}\\s*\\{([^}]*)\\}`).exec(components);
    assert.ok(rule, `components.css has ${selector}`);
    assert.match(rule[1], new RegExp(`inset-inline-start:\\s*${escape(value)};`), `${selector} stands at the connector's length`);
  }
  const runs = fs.readFileSync(new URL("../../../tools/html-skill/src/modules/runs.css", import.meta.url), "utf8");
  assert.match(runs, new RegExp(`--_cx:\\s*${escape(value)};`), "the skill's runs module writes the same length");
  assert.ok(!/(?<![\w-])round\(/.test(runs), "the skill's runs module uses no round()");
});
