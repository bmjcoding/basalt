// 5.1's development checks after the decider's ruling 1 on the batch B re-check: the first list is reported as an error (Model.errors, which the figure
// reports with console.error once and the skill with console.error), the second as a warning, and the figure is drawn as production draws it: the same
// markup with the checks on or off. Node only: the engine's model and its markup, from the built package. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const pkg = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);

const seq = (steps, extra = {}) => ({ type: "sequence", title: "t", summary: "s", participants: [{ id: "a", name: "A" }, { id: "b", name: "B" }], steps, ...extra });
const arch = (extra) => ({ type: "architecture", title: "t", summary: "s", nodes: [{ id: "a", name: "A", col: 1, row: 1 }, { id: "b", name: "B", col: 2, row: 1 }], edges: [], ...extra });
const schema = (columns) => ({ type: "schema", title: "t", summary: "s", tables: [{ name: "a", col: 1, row: 1, columns }, { name: "b", col: 2, row: 1, columns: [{ name: "id", key: "PK" }, { name: "k" }] }] });

// Each item of 5.1's first list, with the words its error says.
const FIRST = [
  ["cardinality without references", schema([{ name: "x", cardinality: { from: "one" } }]), /states a cardinality but references nothing/],
  ["a cardinality that is not a form", schema([{ name: "x", key: "FK", references: "b.id", cardinality: { from: "many" } }]), /not one, zero-or-one, one-or-many or zero-or-many/],
  ["a referenced end of many", schema([{ name: "x", key: "FK", references: "b.id", cardinality: { from: "one", to: "one-or-many" } }]), /references one row at most/],
  ["cardinality on some keys and not all", schema([{ name: "x", key: "FK", references: "b.id", cardinality: { from: "one" } }, { name: "y", key: "FK", references: "b.k" }]), /stated on 1 of 2 foreign keys/],
  ["a deactivate with no open bar", seq([{ from: "a", to: "b", label: "x", deactivate: true }]), /has none open/],
  ["a fourth nested bar", seq([1, 2, 3, 4].map((n) => ({ from: "a", to: "b", label: String(n), activate: true }))), /fourth bar/],
  ["an alt with one branch", seq([{ frame: "alt", branches: [{ label: "one", steps: [{ from: "a", to: "b", label: "x" }] }] }]), /one branch/],
  ["an empty frame", seq([{ frame: "opt", label: "o", steps: [] }]), /is empty/],
  ["a third frame level", seq([{ frame: "opt", label: "o", steps: [{ frame: "opt", label: "p", steps: [{ frame: "opt", label: "q", steps: [{ from: "a", to: "b", label: "x" }] }] }] }]), /frame is a third level/],
  ["a band in a frame", seq([{ frame: "opt", label: "o", steps: [{ band: "phase" }, { from: "a", to: "b", label: "x" }] }]), /is inside a frame/],
  ["a frame label past 40 characters", seq([{ frame: "opt", label: "x".repeat(41), steps: [{ from: "a", to: "b", label: "x" }] }]), /over 40 characters/],
  ["a third group level", arch({ groups: [{ id: "g", label: "G" }, { id: "h", label: "H", parent: "g" }, { id: "i", label: "I", parent: "h" }] }), /is a third level: groups nest two deep/],
  ["an unknown parent", arch({ groups: [{ id: "g", label: "G", parent: "nope" }] }), /which is not a group/],
  ["a cycle of groups", arch({ groups: [{ id: "g", label: "G", parent: "h" }, { id: "h", label: "H", parent: "g" }] }), /each other's parent/],
  ["a label with two breaks", arch({ edges: [{ from: "a", to: "b", label: "one\ntwo\nthree" }] }), /more than one break/],
  ["a label line past 28 characters", arch({ edges: [{ from: "a", to: "b", label: "x".repeat(29) }] }), /over 28 characters/],
  ["a break in a sequence's label", seq([{ from: "a", to: "b", label: "one\ntwo" }]), /label has a break/],
  ["an empty href", arch({ nodes: [{ id: "a", name: "A", col: 1, row: 1, href: " " }] }), /href is empty/],
  ["an href on a participant", seq([{ from: "a", to: "b", label: "x" }], { participants: [{ id: "a", name: "A", href: "#x" }, { id: "b", name: "B" }] }), /cannot be a link/],
  ["layout auto on a sequence", seq([{ from: "a", to: "b", label: "x" }], { layout: "auto" }), /layout="auto" is for/],
];

for (const [what, spec, words] of FIRST) test(`5.1's first list: ${what} is an error, not a warning, and the markup is production's`, () => {
  const m = core.buildModel(spec);
  assert.equal(m.errors.filter((e) => words.test(e)).length, 1, `${what}: ${JSON.stringify(m.errors)}`);
  assert.ok(!m.warnings.some((w) => words.test(w)), `${what} is not also a warning`);
  const html = (model) => core.toHtml(core.figureTree(model, {}, { prefix: "basalt-diagram", base: "dg1", hasSource: false, hiddenClass: "basalt-visually-hidden" }));
  assert.equal(html(m), html(core.buildModel(spec, { checks: false })), "drawn as production draws it");
});

test("5.1's second list stays a warning: a far key not drawn, a card grown to hold its ports, more than 100 cards", () => {
  const n = (id, col, row) => ({ id, name: id, kind: "part", col, row });
  const grown = core.buildModel({ type: "architecture", title: "t", summary: "s", nodes: [n("a", 1, 1), n("b", 2, 1), n("c", 2, 2), n("d", 2, 3)], edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "a", to: "d" }] });
  assert.ok(grown.warnings.some((w) => /use another side/.test(w)));
  assert.deepEqual(grown.errors, []);
  const big = core.buildModel({ type: "architecture", title: "t", summary: "s", nodes: Array.from({ length: 101 }, (_, k) => n(`n${k}`, (k % 10) + 1, Math.floor(k / 10) + 1)), edges: [] });
  assert.ok(big.warnings.some((w) => /101 cards/.test(w)));
  assert.deepEqual(big.errors, []);
});

test("the extended CIMIP figures report no error", async () => {
  const fs = await import("node:fs");
  const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
  for (const [key, spec] of Object.entries(B)) assert.deepEqual(core.buildModel(spec).errors, [], key);
});
