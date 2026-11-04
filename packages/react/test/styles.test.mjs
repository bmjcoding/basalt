import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

test("every public token referenced by component CSS is defined in the distributed stylesheet", () => {
  const stylesheet = fs.readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8");
  const declared = new Set([...stylesheet.matchAll(/(--basalt-[\w-]+)\s*:/g)].map((match) => match[1]));
  const referenced = new Set([...stylesheet.matchAll(/var\((--basalt-[\w-]+)/g)].map((match) => match[1]));
  assert.deepEqual([...referenced].filter((name) => !declared.has(name)), []);
});
