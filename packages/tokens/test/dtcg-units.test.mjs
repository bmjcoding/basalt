// The sources are DTCG. A dimension there is px or rem; a number has no unit. Letter-spacing (tracking) is in em, so it is written as a plain number
// and the build adds the em (A5-14): every generated output is the same as when the source said { value, unit: "em" }.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../tokens/${file}`, import.meta.url), "utf8"));
const FILES = ["primitives.tokens.json", "theme.light.tokens.json", "theme.dark.tokens.json"];

function* tokens(node, at = [], inherited) {
  const type = node.$type ?? inherited;
  if (node.$value !== undefined) { yield { path: at.join("."), type, value: node.$value }; return; }
  for (const [key, child] of Object.entries(node)) if (!key.startsWith("$") && child && typeof child === "object") yield* tokens(child, [...at, key], type);
}

// size.display-measure is 13em (a headline's measure follows its own type size, so it cannot be px or rem): the one dimension left in a unit DTCG lacks.
// It is the council's to type (a new kind of token is design), not this fix's.
const KNOWN = ["size.display-measure"];

test("no dimension token uses a unit DTCG's dimension does not have, except the one listed", () => {
  const odd = FILES.flatMap((file) => [...tokens(read(file))].filter(({ type, value }) => type === "dimension" && typeof value === "object" && !["px", "rem"].includes(value.unit)).map(({ path, value }) => `${path} (${value.unit})`));
  assert.deepEqual(odd, KNOWN.map((name) => `${name} (em)`));
});

test("every tracking token is a plain number in the source, and a dimension in em in what is built", () => {
  const tracking = [...tokens(read("primitives.tokens.json"))].filter(({ path }) => path.endsWith(".tracking"));
  assert.ok(tracking.length >= 14, `${tracking.length} tracking tokens`);
  for (const { path, type, value } of tracking) {
    assert.equal(type, "number", path);
    assert.equal(typeof value, "number", path);
  }
  const css = fs.readFileSync(new URL("../dist/css/tokens.css", import.meta.url), "utf8");
  const json = JSON.parse(fs.readFileSync(new URL("../dist/json/tokens.json", import.meta.url), "utf8"));
  for (const { path, value } of tracking) {
    const name = path.replace(/^text\./, "text-").replace(/\./g, "-");
    assert.match(css, new RegExp(`--basalt-${name}: ${String(value).replace(".", "\\.").replace("-", "-?")}em;`), name);
    assert.deepEqual(json.primitives[name], { type: "dimension", css: `${value}em` }, name);
  }
  const swift = fs.readFileSync(new URL("../../../Sources/BasaltTokens/Tokens.swift", import.meta.url), "utf8");
  assert.match(swift, /TypeStyle\(size: 12, lineHeight: 16, tracking: 0\.01\)/);
});
