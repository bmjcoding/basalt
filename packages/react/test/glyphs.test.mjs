// The core icon set (DECISIONS items 38 to 40, 54, 55), checked against the drawn set the council approved:
// glyphs/source.mjs is that set, copied as it was approved. These tests render the built package on the server and read
// what is drawn, so they need no browser; the morph checks are in glyph-morph.test.mjs.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { MagnifyingGlassIcon, PlayIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { GLYPHS, NAMES, lint, slots } from "../glyphs/source.mjs";

const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(pkg, "dist");
const load = (file) => import(pathToFileURL(path.join(dist, file)).href);
const B = await load("index.js");

const set = NAMES.filter((name) => !GLYPHS[name].board);
const camel = (name) => name.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
const render = (type, props) => renderToStaticMarkup(createElement(type, props));
const numbers = (text) => (text.match(/-?\d*\.?\d+/g) ?? []).map(Number);
const close = (a, b, tolerance = 0.0015) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= tolerance);

test("the drawn set is the council's, and passes its own lint", () => {
  assert.deepEqual(lint(), []);
  assert.equal(set.length, 38, "38 glyphs: 17 line actions, 4 rich actions, 12 navigation, 5 Blacksand");
});

test("the glyph modules are what the drawn set generates (no drift)", () => {
  const result = spawnSync(process.execPath, [path.join(pkg, "glyphs", "generate.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("every glyph is a named export and its own module", () => {
  for (const name of set) {
    const exported = B[`${camel(name)}Glyph`];
    assert.equal(typeof exported, "function", `${camel(name)}Glyph is not exported`);
    assert.equal(exported.glyph.name, name);
    assert.ok(fs.existsSync(path.join(dist, "glyphs", `${name}.js`)), `dist/glyphs/${name}.js is missing`);
  }
  assert.equal(Object.keys(B).filter((key) => /Glyph$/.test(key)).length, 38);
});

/** What the page draws for a glyph, read back from markup: stroke paths, the fill path, and the holes. */
function drawn(html) {
  const svg = html.match(/<svg[^>]*>/)[0];
  const strokeAt = html.lastIndexOf('<g fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">');
  assert.ok(strokeAt >= 0, "no stroke group at 2.25 in " + html);
  const paths = (part) => [...part.matchAll(/<path d="([^"]+)"([^>]*)>/g)].map((m) => ({ d: numbers(m[1]), width: Number(m[2].match(/stroke-width="([\d.]+)"/)?.[1] ?? 2.25) }));
  const mask = html.match(/<mask[^>]*>([\s\S]*?)<\/mask>/)?.[1] ?? "";
  const beforeStrokes = html.slice(0, strokeAt);
  const fillPath = beforeStrokes.replace(/<mask[\s\S]*?<\/mask>/, "").match(/<path d="([^"]+)" fill="currentColor"/)?.[1];
  return { svg, strokes: paths(html.slice(strokeAt)), holes: paths(mask), fill: fillPath ? numbers(fillPath) : null, html };
}

/** The cubic's numbers as the page writes them: M x0 y0 C x1 y1 x2 y2 x3 y3 (a point is M x y L x y). */
function slotNumbers(s) {
  const len = Math.hypot(s[6] - s[0], s[7] - s[1]) + Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[6], s[5] - s[7]);
  return len < 1e-3 ? [s[0], s[1], s[6], s[7]] : s.slice(0, 8);
}

for (const size of [16, 20, 24]) {
  test(`every glyph draws the drawn set's geometry at ${size}, at rest and selected, with a 2.25 stroke`, () => {
    for (const name of set) {
      const Glyph = B[`${camel(name)}Glyph`];
      for (const selected of [false, true]) {
        const g = GLYPHS[name].of ? GLYPHS[GLYPHS[name].of] : GLYPHS[name];
        const want = slots(name, selected);
        const loops = g.loops ?? [];
        const knock = g.knock ?? [];
        const filled = selected && loops.length > 0;
        const what = `${name} ${selected ? "selected" : "at rest"} at ${size}`;
        const out = drawn(render(Glyph, { size, weight: selected ? "fill" : "bold" }));
        assert.match(out.svg, new RegExp(`width="${size}" height="${size}" viewBox="0 0 24 24"`), `${what}: the tile`);
        // strokes: every drawn slot except the ones that became holes
        const stroked = want.map((s, i) => ({ s, i })).filter(({ s, i }) => s[8] > 0 && !(filled && knock.includes(i)));
        assert.equal(out.strokes.length, stroked.length, `${what}: ${out.strokes.length} strokes, drawn set has ${stroked.length}`);
        stroked.forEach(({ s }, k) => assert.ok(close(out.strokes[k].d, slotNumbers(s)), `${what}: stroke ${k} is ${out.strokes[k].d}, drawn set ${slotNumbers(s)}`));
        // a dot is drawn 1.5 times the stroke; every other stroke is the stroke
        stroked.forEach(({ s }, k) => {
          const dot = slotNumbers(s).length === 4;
          assert.ok(Math.abs(out.strokes[k].width - (dot ? 3.375 : 2.25)) < 1e-6, `${what}: stroke ${k} is ${out.strokes[k].width} wide`);
        });
        // fill: each loop's slots in order, closed
        if (filled) {
          const expected = loops.flatMap((loop) => loop.flatMap((i, k) => (k === 0 ? slotNumbers(want[i]) : slotNumbers(want[i]).slice(2))));
          assert.ok(out.fill, `${what}: no fill`);
          assert.ok(close(out.fill, expected), `${what}: fill differs from the drawn set's loops`);
          const holes = knock.filter((i) => want[i][8] > 0);
          assert.equal(out.holes.length, holes.length, `${what}: holes`);
          holes.forEach((i, k) => assert.ok(close(out.holes[k].d, slotNumbers(want[i])), `${what}: hole ${k}`));
        } else {
          assert.equal(out.fill, null, `${what}: filled at rest`);
          assert.equal(out.holes.length, 0, `${what}: holes at rest`);
        }
      }
    }
  });
}

test("a glyph without loops is drawn the same selected as at rest", () => {
  for (const name of set) {
    const g = GLYPHS[name].of ? GLYPHS[GLYPHS[name].of] : GLYPHS[name];
    if ((g.loops ?? []).length || g.seam) continue;
    const Glyph = B[`${camel(name)}Glyph`];
    assert.equal(render(Glyph, { weight: "fill" }), render(Glyph, { weight: "bold" }), name);
  }
});

test("selected closes the opening: the seam's slot is trimmed at rest and whole when selected", () => {
  let seams = 0;
  for (const name of set) {
    const g = GLYPHS[name].of ? GLYPHS[GLYPHS[name].of] : GLYPHS[name];
    if (!g.seam) continue;
    seams += 1;
    const Glyph = B[`${camel(name)}Glyph`];
    const [slot] = g.seam;
    const atRest = slotNumbers(slots(name, false)[slot]);
    const closed = slotNumbers(slots(name, true)[slot]);
    assert.ok(!close(atRest, closed), `${name}: the drawn set does not change the seam`);
    assert.ok(drawn(render(Glyph, { weight: "bold" })).strokes.some((p) => close(p.d, atRest)), `${name}: the seam is not open at rest`);
    assert.ok(drawn(render(Glyph, { weight: "fill" })).strokes.some((p) => close(p.d, closed)), `${name}: the seam is not closed when selected`);
  }
  assert.equal(seams, 14, "fourteen glyphs have a seam; profile, sources and history have none");
});

test("the arrow is centred, and the static arrow and MorphIcon's are the same data", async () => {
  const { glyphData } = await load("glyph-registry.js");
  assert.deepEqual(B.ArrowRightGlyph.glyph.selected, [[6.5, 12, 17.5, 12], [17.5, 12, 11.5, 7], [17.5, 12, 11.5, 17]]);
  for (const name of ["arrow-right", "arrow-down", "arrow-left", "arrow-up"]) {
    assert.equal(glyphData(name), B[`${camel(name)}Glyph`].glyph, `${name}: MorphIcon reads its drawing from the glyph module`);
    const points = slots(name, false).filter((s) => s[8]).flatMap((s) => [[s[0], s[1]], [s[6], s[7]]]);
    const [xs, ys] = [0, 1].map((k) => points.map((p) => p[k]));
    assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - 12) < 1e-9 && Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - 12) < 1e-9, `${name} is centred on the tile`);
    const inside = (html) => html.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/basalt-glyph-[\w-]+/g, "x");
    assert.equal(inside(render(B.MorphIcon, { name })), inside(render(B[`${camel(name)}Glyph`], {})), `${name}: MorphIcon and the glyph draw the same paths`);
  }
  const source = fs.readFileSync(path.join(pkg, "src", "morph-icon.tsx"), "utf8");
  assert.doesNotMatch(source, /\bARROW\b/, "MorphIcon keeps no arrow of its own");
});

test("MorphIcon draws every glyph, at rest and selected, as the glyph does: the actions by name, the rest by reference", async () => {
  const { morphNames } = await load("glyph-names.js");
  const actions = set.filter((name) => !GLYPHS[name].nav);
  assert.deepEqual([...morphNames()].sort(), [...actions].sort(), "MorphIcon takes the core actions by name");
  assert.equal(actions.length, 21);
  const inside = (html) => html.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace(/basalt-glyph-[\w-]+/g, "x");
  for (const name of set) {
    for (const selected of [false, true]) {
      const props = GLYPHS[name].nav ? { glyph: B[`${camel(name)}Glyph`] } : { name };
      assert.equal(inside(render(B.MorphIcon, { ...props, selected })), inside(render(B[`${camel(name)}Glyph`], { weight: selected ? "fill" : "bold" })), `${name} ${selected}`);
    }
  }
});

test("Icon draws a core glyph at rest, and selected with its own selected drawing, at every size", () => {
  for (const size of [16, 20, 24]) {
    const rest = drawn(render(B.Icon, { icon: B.HomeGlyph, size }));
    const selected = drawn(render(B.Icon, { icon: B.HomeGlyph, size, selected: true }));
    assert.equal(rest.fill, null);
    assert.ok(selected.fill, "selected Home fills");
    assert.match(rest.svg, new RegExp(`width="${size}"`));
    assert.match(render(B.Icon, { icon: B.HomeGlyph, size }), /class="basalt-icon"/);
    assert.match(render(B.Icon, { icon: B.HomeGlyph, size }), /aria-hidden="true"/);
  }
});

const inner = (html) => html.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

test("the long tail is Phosphor Bold at 16, 20 and 24, and not Regular", () => {
  for (const size of [16, 20, 24]) {
    const bold = inner(render(MagnifyingGlassIcon, { size, weight: "bold" }));
    const regular = inner(render(MagnifyingGlassIcon, { size, weight: "regular" }));
    const shown = render(B.Icon, { icon: MagnifyingGlassIcon, size });
    assert.equal(inner(shown), bold, `Bold at ${size}`);
    assert.notEqual(inner(shown), regular, `not Regular at ${size}`);
  }
});

test("Phosphor Fill is for a selected glyph marked fillSafe, and nothing else", () => {
  const fill = inner(render(PlayIcon, { size: 20, weight: "fill" }));
  const bold = inner(render(PlayIcon, { size: 20, weight: "bold" }));
  assert.notEqual(fill, bold);
  assert.equal(inner(render(B.Icon, { icon: PlayIcon, size: 20, selected: true })), bold, "selected without fillSafe stays Bold");
  assert.equal(inner(render(B.Icon, { icon: PlayIcon, size: 20, selected: true, fillSafe: true })), fill, "selected and fillSafe is Fill");
  assert.equal(inner(render(B.Icon, { icon: PlayIcon, size: 20, fillSafe: true })), bold, "fillSafe at rest stays Bold");
});

test("danger is XCircle: the Callout draws it, and WarningCircle is gone", () => {
  const callout = render(B.Callout, { status: "danger", title: "Route refused" });
  const xCircle = inner(render(XCircleIcon, { size: 16, weight: "bold" }));
  const warningCircle = inner(render(WarningCircleIcon, { size: 16, weight: "bold" }));
  assert.ok(callout.includes(xCircle), "the danger Callout draws XCircle");
  assert.ok(!callout.includes(warningCircle), "the danger Callout does not draw WarningCircle");
  for (const file of fs.readdirSync(path.join(pkg, "src")).filter((f) => /\.tsx?$/.test(f))) {
    assert.doesNotMatch(fs.readFileSync(path.join(pkg, "src", file), "utf8"), /WarningCircle/, `${file} still names WarningCircle`);
  }
});

test("a Callout of each status still draws its own icon", () => {
  const html = ["info", "success", "warning", "danger"].map((status) => inner(render(B.Callout, { status, title: status }).match(/<svg[\s\S]*?<\/svg>/)[0]));
  assert.equal(new Set(html).size, 4);
});
