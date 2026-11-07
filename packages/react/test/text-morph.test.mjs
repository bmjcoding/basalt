import assert from "node:assert/strict";
import { test } from "node:test";

import { planTextMorph } from "../dist/text-morph.js";

function even(previous, next) {
  return planTextMorph(previous, next, {
    previous: [...previous].map(() => 8),
    next: [...next].map(() => 8),
  });
}

test("Config to Confirm keeps the shared letters and drops the leaving width", () => {
  const plan = even("Config", "Confirm");
  const stays = plan.glyphs.filter((glyph) => glyph.kind === "stay");
  assert.deepEqual(stays.map((glyph) => glyph.char), ["C", "o", "n", "f", "i"]);
  for (const glyph of stays) assert.equal(glyph.from, glyph.to, glyph.char);
  assert.deepEqual(plan.glyphs.filter((glyph) => glyph.kind === "exit").map((glyph) => glyph.char), ["g"]);
  assert.equal(plan.glyphs.find((glyph) => glyph.char === "g").to, null);
  assert.ok(plan.glyphs.filter((glyph) => glyph.kind === "enter").every((glyph) => glyph.from === null));
  assert.equal(plan.fromWidth, 48);
  assert.equal(plan.toWidth, 56);
  const slots = plan.glyphs.filter((glyph) => glyph.kind !== "exit").map((glyph) => glyph.to);
  assert.equal(new Set(slots).size, slots.length, "settled glyphs share a slot");
});

test("Continue to Confirm keeps Con and i on their measured positions", () => {
  const plan = even("Continue", "Confirm");
  assert.deepEqual(
    plan.glyphs.filter((glyph) => glyph.kind === "stay").map((glyph) => [glyph.char, glyph.from, glyph.to]),
    [["C", 0, 0], ["o", 8, 8], ["n", 16, 16], ["i", 32, 32]],
  );
  assert.equal(plan.fromWidth, 64);
  assert.equal(plan.toWidth, 56);
  const exits = plan.glyphs.filter((glyph) => glyph.kind === "exit");
  assert.equal(exits.length, 4);
  assert.ok(exits.every((glyph) => glyph.to === null));
});
