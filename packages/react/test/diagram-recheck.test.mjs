// The batch B re-check's fixes in the forms node can check (the browser forms are in diagram-review.test.mjs, written while browser tests are paused):
// the text art's glyph measured at 100% in both engines, the transcript's route held with its arrow (ruling 3), the label room over a turn into a group's
// first card (ruling 4), elkjs as one copy (ruling 2), and the skill's figures written from the same engine as React's. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const pkg = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const root = path.join(pkg, "..", "..");
const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
// The viewer's layout is bundled into diagram-viewer.js; its source has only type imports, so node strips the types and loads it as it is.
const zoom = await import(pathToFileURL(path.join(pkg, "src", "diagram-zoom-core.ts")).href);
const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const css = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8");
const html = (spec, P = "basalt-diagram") => core.toHtml(core.figureTree(core.buildModel(spec), {}, { prefix: P, base: "d", hasSource: false, hiddenClass: P === "diagram" ? "visually-hidden" : "basalt-visually-hidden" }));

test("the text art's glyph is measured at 100%: offsetWidth on one unbreakable run, in React and the skill, never a box a transform scales", () => {
  const figure = fs.readFileSync(path.join(pkg, "src", "diagram-figure.tsx"), "utf8");
  const skill = fs.readFileSync(path.join(root, "tools", "html-skill", "src", "modules", "diagram-text.js"), "utf8");
  for (const [who, src] of [["React", figure], ["the skill", skill]]) {
    const at = src.search(/"─"\.repeat\(40\)|new Array\(41\)\.join\('─'\)/);
    assert.ok(at > 0, `${who}: the probe`);
    const probe = src.slice(at - 400, at + 400);
    assert.match(probe, /["']display:inline-block;white-space:pre["']/, `${who}: one unbreakable run`);
    assert.match(probe, /probe\.offsetWidth \/ 40/, `${who}: offsetWidth, which no transform scales`);
    assert.doesNotMatch(probe, /getBoundingClientRect/, `${who}: never the zoomed box`);
  }
});

test("the viewer holds the art at the width the figure reports, whatever the zoom: the layer's width is set and its transform left alone", () => {
  const layer = { style: { width: "", transform: "scale(0.5)" } };
  const memo = {};
  zoom.viewerTextWidth({ layer, avail: 1200, row: 1104, contain: 640, memo, measureFigure: () => null }, 812.2);
  assert.deepEqual(layer.style, { width: "813px", transform: "scale(0.5)" });
  layer.style.transform = "scale(2)";
  zoom.viewerTextWidth({ layer, avail: 1200, row: 1104, contain: 640, memo, measureFigure: () => null }, 812.2);
  assert.equal(layer.style.width, "813px", "the same at 200%");
});

test("ruling 3: a transcript route's arrow and receiver are one run that never breaks, so a wrapped route's second line starts with the arrow", () => {
  const m = core.buildModel(B.textSequence);
  const lines = core.transcript("basalt-diagram", m).map((v) => core.toHtml(v));
  const routes = lines.filter((l) => /data-ink="num"/.test(l));
  assert.ok(routes.length > 3);
  for (const l of routes) {
    // The sender, a space, then one run holding the arrow, a space and the receiver: nothing after it on the line.
    assert.match(l, /<span class="basalt-diagram-tx-name">[^<]*<\/span> <span class="basalt-diagram-tx-to"><span data-ink="(main|plain)">(━▶|─▶|┄▷)<\/span> [^<]*<\/span><\/span>$/, l);
  }
  const rule = css.match(/\.basalt-diagram-tx-name, \.basalt-diagram-tx-to \{([^}]*)\}/);
  assert.ok(rule && /white-space: nowrap/.test(rule[1]), "the run does not break inside");
  // The second line hangs under the sender: the route's line has a hang of the number's digits and two spaces.
  for (const l of routes) assert.match(l, /style="--_in:\d+;--_hang:\d+"/);
});

test("ruling 4: a group entered by a turn into its first card makes room for the turn's label, space-12 plus space-4 a line", () => {
  const out = html(B.architecture);
  const g = out.match(/<div class="basalt-diagram-group" data-group="data"[^>]*>/)?.[0];
  assert.ok(g && /data-turn=""/.test(g) && /--_tl:2/.test(g), g);
  // A group no turn enters has neither.
  for (const other of out.match(/<div class="basalt-diagram-group"[^>]*>/g)) if (other !== g) assert.doesNotMatch(other, /data-turn|--_tl/, other);
  // An unlabelled turn keeps space-12: the group is marked, with no label lines.
  const plain = structuredClone(B.architecture);
  for (const e of plain.edges) if (e.to === "aurora") delete e.label;
  const pg = html(plain).match(/<div class="basalt-diagram-group" data-group="data"[^>]*>/)?.[0];
  assert.ok(pg && /data-turn=""/.test(pg) && !/--_tl/.test(pg), pg);
  assert.match(css, /\.basalt-diagram-group\[data-turn\] \{ padding-block-start: calc\(var\(--basalt-space-12\) \+ var\(--basalt-space-4\) \* var\(--_tl, 0\)\); \}/);
});

test("ruling 2: elkjs is a build input at exactly 0.12.1, shipped once as dist/diagram-elk.js with its licence", () => {
  const p = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
  assert.equal(p.dependencies?.elkjs, undefined, "not a dependency an app installs");
  assert.equal(p.devDependencies?.elkjs, "0.12.1");
  const allowed = JSON.parse(fs.readFileSync(path.join(root, "dependencies.allowed.json"), "utf8"));
  assert.equal(allowed.$copied?.["packages/react"]?.elkjs, "0.12.1");
  const elk = fs.readFileSync(path.join(pkg, "dist", "diagram-elk.js"), "utf8");
  assert.doesNotMatch(elk, /from\s*["']elkjs/, "the copy imports no elkjs");
  assert.ok(fs.existsSync(path.join(pkg, "dist", "elkjs", "LICENSE.md")), "its licence");
  for (const f of fs.readdirSync(path.join(pkg, "dist")).filter((f) => f.endsWith(".js") && f !== "diagram-elk.js")) assert.doesNotMatch(fs.readFileSync(path.join(pkg, "dist", f), "utf8"), /from\s*["']elkjs|import\(["']elkjs/, `${f} reaches elkjs only through diagram-elk.js`);
});

test("the skill writes batch B's figures from the same engine: compose.mjs's markup is the engine's, prefix for prefix", async () => {
  const layout = await import(pathToFileURL(path.join(pkg, "dist", "diagram-layout.js")).href);
  const { compose } = await import(pathToFileURL(path.join(root, ".agent", "skills", "basalt-html", "compose.mjs")).href);
  for (const [key, spec] of Object.entries(B)) {
    if (!spec?.type) continue;
    const page = compose(`<title>D</title><main><figure class="diagram" id="fig-${key}"><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure></main>`).html;
    const drawing = (s, P) => { const at = s.indexOf(`<div class="${P}-drawing"`); assert.ok(at >= 0, `${key}: ${P}'s drawing`); const ends = [`<div class="${P}-ink"`, `<p class="${P}-hint"`].map((e) => s.indexOf(e, at)).filter((e) => e > at); return s.slice(at, Math.min(...ends)); };
    // (To the ink layer, or a text figure's hint: the slots after it, the hint's keys and the foot, are each engine's own and tested with each.)
    const fromSkill = drawing(page, "diagram");
    // An automatic figure is written on the placement compose.mjs made in the type's own direction; React draws on the same answer once it has it.
    const auto = spec.layout === "auto";
    const placed = auto ? await layout.placeDiagram({ type: spec.type, nodes: spec.nodes, tables: spec.tables, edges: spec.edges, groups: spec.groups }, spec.direction ?? (spec.type === "flowchart" ? "down" : "right")) : undefined;
    const fromEngine = drawing(core.toHtml(core.figureTree(core.buildModel(spec, { placement: placed }), {}, { prefix: "diagram", base: "d", hasSource: false, hiddenClass: "visually-hidden" })), "diagram");
    const ids = (s) => s.replace(/(id|aria-labelledby|aria-describedby|aria-controls|href)="[^"]*"/g, '$1=""');
    assert.equal(ids(fromSkill), ids(fromEngine), key);
  }
});

test("a text sequence has no Clear highlight in React, as in the skill: the React figure mounts it only for a figure that is not text", () => {
  const figure = fs.readFileSync(path.join(pkg, "src", "diagram-figure.tsx"), "utf8");
  assert.match(figure, /const clear = !viewer && !model\.text && \(onTouch \|\| touched\) && ink \?/);
  // The skill mounts it only where the figure has an ink layer with lines in it, which a text figure never has.
  const skill = fs.readFileSync(path.join(root, "tools", "html-skill", "src", "modules", "diagram.js"), "utf8");
  assert.match(skill, /var want = touched && !viewer && ink && ink\.innerHTML !== '';/);
  assert.doesNotMatch(html(B.textSequence), /class="basalt-diagram-ink"/, "a text figure's markup has no ink layer");
});
