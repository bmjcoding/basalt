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
