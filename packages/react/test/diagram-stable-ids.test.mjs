// Stable ids in a diagram (console gap G146, with Astra's review of 3b860d85): a figure with an `id` builds every id inside it on that id (`idBase`), in
// Basalt's namespace (`bd-`, so a letter leads and no author id is one of them), so its `aria-labelledby`, `aria-describedby` and `aria-controls` read the
// same on every render and in any order, the viewer's included; no two ids in the document meet; a long id is bounded by a hash; the exporter keeps a
// figure's crossing masks whatever its id holds; one id given to two figures is a warning in development, counted in the figure's own document or shadow
// root from its mount. A figure with no id keeps React's useId. In Chromium against the built package, and the engine's `idBase` in Node. Written while
// tests are paused (DECISIONS 359): not yet run by the suite.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { fixturePage, launch } from "./support.mjs";

const P = "basalt-diagram";
const pkg = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page, n = 4) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
const SAFE = /^[A-Za-z][A-Za-z0-9_-]*$/;
const VIEWPORT = { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } };
const drawn = (page, n) => page.waitForFunction(({ P, n }) => { const f = document.querySelectorAll(`figure.${P}`); return f.length === n && [...f].every((x) => x.dataset.layout); }, { P, n });

// Author ids chosen to meet the generated ones if the namespace failed: an id that is another's base and suffix, a leading digit, an underscore, a
// space, the old terminator, the viewer's suffixes, the exporter's word.
const TRICKY = ["x", "x-title", "x_dg-title", "bd", "1", "1_dg-title", "x y", "x_20_", "x-v", "x-viewer", "build-reveal-plan"];

/**
 * In the document: every id is used once; every name a figure gives (on itself and inside) is found inside that figure by a real `querySelector` (`#` and
 * the id, unescaped: a leading digit or a stray character would throw or miss); and each figure's label is its own title heading.
 */
const audit = (page) => page.evaluate((P) => {
  const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  const faults = [];
  for (const f of document.querySelectorAll(`figure.${P}`)) {
    for (const el of [f, ...f.querySelectorAll("[aria-labelledby],[aria-describedby],[aria-controls]")]) {
      for (const a of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
        for (const id of (el.getAttribute(a) ?? "").split(" ").filter(Boolean)) {
          let found = null;
          try { found = document.querySelector(`#${id}`); } catch { faults.push(`${f.id}: #${id} is not a selector`); continue; }
          if (!found || !f.contains(found)) faults.push(`${f.id}: ${a} ${id} is not inside it`);
        }
      }
    }
    const label = document.querySelector(`#${f.getAttribute("aria-labelledby")}`);
    if (!label?.matches(`.${P}-title`) || label.closest(`figure.${P}`) !== f) faults.push(`${f.id}: its label is not its own title`);
  }
  return { count: ids.length, dupes, faults };
}, P);

/** Every id inside an element and every id its attributes name, in document order. */
const idsIn = (page, selector) => page.evaluate((selector) => {
  const root = document.querySelector(selector);
  const named = [];
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el !== root && el.id) named.push(`id ${el.id}`);
    for (const a of ["aria-labelledby", "aria-describedby", "aria-controls"]) { const v = el.getAttribute(a); if (v) named.push(`${a} ${v}`); }
  }
  return named;
}, selector);

/** Opens a figure's viewer and returns the ids in its dialog, after checking every name in the dialog is found inside it. */
async function viewerIds(page, id) {
  await page.locator(`[id="${id}"] .${P}-expand`).click();
  await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
  await frames(page, 3);
  const inside = await page.evaluate((P) => {
    const d = document.querySelector(`dialog.${P}-viewer[open]`);
    return [d, ...d.querySelectorAll("[aria-labelledby],[aria-describedby],[aria-controls]")].every((el) => ["aria-labelledby", "aria-describedby", "aria-controls"].every((a) => (el.getAttribute(a) ?? "").split(" ").filter(Boolean).every((n) => d.contains(document.querySelector(`#${n}`)))));
  }, P);
  assert.ok(inside, `${id}: every name in the viewer is found inside it`);
  const ids = await idsIn(page, `dialog.${P}-viewer`);
  await page.keyboard.press("Escape");
  await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
  return ids;
}

describe("idBase", () => {
  test("in Basalt's namespace: bd-, then letters, digits and hyphens kept, any other character in hex, and _dg", () => {
    assert.equal(core.idBase("checkout-flow"), "bd-checkout-flow_dg");
    assert.equal(core.idBase("1"), "bd-1_dg");
    assert.equal(core.idBase("a b"), "bd-a_20_b_dg");
    assert.equal(core.idBase("a_b"), "bd-a_5f_b_dg");
    assert.equal(core.idBase("é"), "bd-_e9__dg");
    assert.equal(core.idBase("😀"), "bd-_1f600__dg");
    assert.equal(core.idBase('"><script>'), "bd-_22__3e__3c_script_3e__dg");
  });

  test("different ids never give one id inside, and no author id that keeps out of bd- is one", () => {
    const ids = [...TRICKY, "x_dg", "x_", "_", "-", "X", "x\u0000", "a".repeat(64), "a".repeat(65), `${"a".repeat(64)}b`];
    const suffixes = ["-title", "-summary", "-keys", "-list", "-toggle", "-toggle-words", "-expand-words", "-clear-words", "-play", "-pause", "-cut-0", "-reveal-0", "-export-note", "-viewer-title", "-viewer-summary", "-v-title", "-v-cut-0", "-v-export-note"];
    const seen = new Map();
    for (const id of ids) {
      const base = core.idBase(id);
      assert.match(base, SAFE, id);
      assert.ok(base.startsWith("bd-"), id);
      for (const s of suffixes) {
        const made = base + s;
        assert.ok(!ids.includes(made), `${made} is an author id`);
        assert.ok(!seen.has(made) || seen.get(made) === id, `${JSON.stringify(id)} and ${JSON.stringify(seen.get(made))} both make ${made}`);
        seen.set(made, id);
      }
    }
  });

  test(`an id of ${core.ID_BASE_WHOLE} characters is written whole; one longer is its first 32 and a hash, bounded whatever its length`, () => {
    assert.equal(core.ID_BASE_WHOLE, 64);
    const whole = "a".repeat(64), emoji = "😀".repeat(64);
    assert.equal(core.idBase(whole), `bd-${whole}_dg`);
    assert.equal(core.idBase(emoji), `bd-${"_1f600_".repeat(64)}_dg`, "64 characters, counted by code point");
    const long = core.idBase("a".repeat(65));
    assert.match(long, /^bd-a{32}_h[0-9a-f]{16}_dg$/);
    assert.notEqual(core.idBase(`${"a".repeat(64)}b`), long, "two long ids with one prefix part on the hash");
    assert.equal(core.idBase("a".repeat(65)), long, "the same long id, the same base");
    const huge = core.idBase("😀".repeat(65_536));
    assert.match(huge, /^bd-(_1f600_){32}_h[0-9a-f]{16}_dg$/);
    assert.ok(huge.length <= 280 && core.idBase("\u{10ffff}".repeat(100)).length <= 280, "a base is at most 280 characters");
  });
});

// Two figures, drawn in the order window.__order names, after a number of other components that take a useId each (window.__before): a different order and
// a different count before them both move what useId gives.
const PAGE = `
import a from "./test/fixtures/cimip-diagrams-b.json";
const Other = () => <span id={React.useId()} />;
const figures = {
  a: <B.ArchitectureDiagram key="a" id="fig-a" {...a.architecture} />,
  b: <B.FlowchartDiagram key="b" id="fig-b" {...a.flowchart} />,
};
createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}>
  <h1>Figures</h1>
  {Array.from({ length: window.__before }, (_, i) => <Other key={i} />)}
  {window.__order.map((k) => figures[k])}
</main>);`;
async function orderPage(order, before) {
  const { page, errors } = await fixturePage(browser, `window.__order = ${JSON.stringify(order)}; window.__before = ${before};${PAGE}`, VIEWPORT);
  await drawn(page, 2);
  await frames(page);
  return { page, errors };
}

describe("a figure's ids (G146)", () => {
  test("the same ids across two renders in a different order, with a different number of useId before them, the viewer's included; each label is its own heading", async () => {
    const first = await orderPage(["a", "b"], 0);
    const second = await orderPage(["b", "a"], 3);
    for (const { page } of [first, second]) {
      const r = await audit(page);
      assert.deepEqual(r.dupes, [], "no id twice in the document");
      assert.deepEqual(r.faults, [], "every name resolves inside its own figure, by querySelector");
    }
    for (const id of ["fig-a", "fig-b"]) {
      const one = await idsIn(first.page, `#${id}`);
      const two = await idsIn(second.page, `#${id}`);
      assert.ok(one.length > 4, `${id}: its ids are read`);
      assert.deepEqual(two, one, `${id}: the same ids`);
      assert.ok(one.filter((s) => s.startsWith("id ")).every((s) => s.startsWith(`id bd-${id}_dg-`)), `${id}: every id inside is built on the figure's id`);
      assert.equal(await first.page.locator(`#${id}`).getAttribute("aria-labelledby"), `bd-${id}_dg-title`);
      assert.deepEqual(await viewerIds(second.page, id), await viewerIds(first.page, id), `${id}: the viewer's ids are the same`);
    }
    const viewer = await viewerIds(first.page, "fig-a");
    assert.ok(viewer.includes("aria-labelledby bd-fig-a_dg-viewer-title") && viewer.includes("aria-describedby bd-fig-a_dg-viewer-summary"), "the dialog is named on the figure's base");
    assert.ok(viewer.some((s) => s.startsWith("id bd-fig-a_dg-v-")), "the viewer's drawing is built on the figure's base");
    assert.deepEqual([...first.errors, ...second.errors], []);
    await first.page.close();
    await second.page.close();
  });

  test("ids that would meet a generated one, and a leading digit: no id twice in the document, every name found by querySelector inside its own figure", async () => {
    const write = (ids) => `
import a from "./test/fixtures/cimip-diagrams-b.json";
createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}>
  ${ids.map((id) => `<B.ArchitectureDiagram id=${JSON.stringify(id)} {...a.architecture} />`).join("\n  ")}
</main>);`;
    for (const ids of [TRICKY, [...TRICKY].reverse()]) {
      const { page, errors } = await fixturePage(browser, write(ids), VIEWPORT);
      await drawn(page, ids.length);
      await frames(page);
      const r = await audit(page);
      assert.ok(r.count > ids.length * 5);
      assert.deepEqual(r.dupes, [], "no id twice in the document");
      assert.deepEqual(r.faults, [], "each figure's names are its own");
      const inside = await page.evaluate((P) => [...document.querySelectorAll(`figure.${P} [id]`)].map((el) => el.id), P);
      assert.ok(inside.every((id) => SAFE.test(id) && id.startsWith("bd-")), "every id inside is in the namespace and starts with a letter");
      assert.deepEqual(errors, []);
      await page.close();
    }
  });

  test("a figure with no id keeps useId's ids", async () => {
    const { page } = await fixturePage(browser, `
import a from "./test/fixtures/cimip-diagrams-b.json";
createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}><B.ArchitectureDiagram {...a.architecture} /></main>);`, VIEWPORT);
    await page.waitForSelector(`figure.${P}[data-layout]`);
    const label = await page.locator(`figure.${P}`).getAttribute("aria-labelledby");
    assert.match(label, /^dg[A-Za-z0-9_-]+-title$/);
    assert.ok(!label.startsWith("bd-"));
    await page.close();
  });

  test("an id holding -reveal- keeps its crossing mask on the page and in the SVG file", async () => {
    // Four cards in one column with A to C and D to B: the two end lines cross once, and the crossing is cut (diagrams.test.mjs, "crossings").
    const spec = { title: "Crossing", summary: "Two end lines that cross.", nodes: ["a", "b", "c", "d"].map((id, k) => ({ id, name: id.toUpperCase(), kind: "part", col: 1, row: k + 1 })), edges: [{ from: "a", to: "c" }, { from: "d", to: "b" }] };
    const { page, errors } = await fixturePage(browser, `
import { diagramToSvg } from "./dist/diagram-export.js";
window.__svg = () => diagramToSvg(document.getElementById("build-reveal-plan")).then((b) => b.text());
createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}><B.ArchitectureDiagram id="build-reveal-plan" {...${JSON.stringify(spec)}} /></main>);`, VIEWPORT);
    await page.waitForSelector(`figure.${P}[data-layout]`);
    await frames(page);
    const cut = "bd-build-reveal-plan_dg-cut-";
    assert.equal(await page.locator(`#build-reveal-plan .${P}-line[mask^="url(#${cut}"]`).count(), 1, "the page cuts the crossing");
    const svg = await page.evaluate(() => window.__svg());
    assert.ok(svg.includes(`mask="url(#${cut}`), "the file keeps the line's crossing mask");
    assert.ok(svg.includes(`<mask id="${cut}`), "and the mask it names");
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("one id, two figures (development)", () => {
  // Figures in the page's own root, and figures portalled into an iframe's body: the iframe is a document of its own.
  const HOST = `
import a from "./test/fixtures/cimip-diagrams-b.json";
import { createPortal } from "react-dom";
const frame = document.createElement("iframe");
frame.style.cssText = "width:1104px;height:600px";
document.body.append(frame);
frame.contentDocument.open(); frame.contentDocument.write("<!doctype html><html><body></body></html>"); frame.contentDocument.close();
// The page's stylesheet in the iframe too: a figure measured with none is not what this test is about (the probe's figures there, unstyled, threw).
frame.contentDocument.documentElement.dataset.theme = "dark";
for (const style of document.querySelectorAll("style")) frame.contentDocument.head.append(style.cloneNode(true));
const root = createRoot(document.getElementById("root"));
window.__set = (ids, inFrame = []) => root.render(<React.StrictMode><main style={{ width: 1104 }}>
  {ids.map((id, i) => <B.ArchitectureDiagram key={i} id={id} {...a.architecture} />)}
  {createPortal(inFrame.map((id, i) => <B.ArchitectureDiagram key={i} id={id} {...a.architecture} />), frame.contentDocument.body)}
</main></React.StrictMode>);`;
  async function devPage() {
    const { page, errors } = await fixturePage(browser, "", VIEWPORT);
    const built = await esbuild.build({
      stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js"; ${HOST}`, resolveDir: pkg, loader: "tsx" },
      bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"development"' },
    });
    const warnings = [];
    page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
    await page.addScriptTag({ content: built.outputFiles[0].text });
    return { page, errors, warnings };
  }
  const said = (warnings, id) => warnings.filter((w) => w.includes(`two figures on this page have the id "${id}"`));
  const show = async (page, ids, inFrame = []) => { await page.evaluate(([ids, inFrame]) => window.__set(ids, inFrame), [ids, inFrame]); await frames(page, 6); };

  test("a second figure with one id in one document is a warning, once; Strict Mode, an iframe, an unmount and a reused id are not", async () => {
    const { page, errors, warnings } = await devPage();
    await show(page, ["one", "two"], ["one", "two"]);
    assert.deepEqual(said(warnings, "one"), [], "Strict Mode's second effect is not a second figure, and the iframe's figure is on a page of its own");
    assert.deepEqual(said(warnings, "two"), []);
    // An id unmounted is free: a figure given it later, alone, is not a second.
    await show(page, ["two"], ["two"]);
    await show(page, ["two", "one"], ["two"]);
    assert.deepEqual(said(warnings, "one"), [], "a reused id, once its first figure has gone");
    // Two in the iframe's document.
    await show(page, ["two", "one"], ["two", "three", "three"]);
    assert.equal(said(warnings, "three").length, 1, "two in the iframe");
    // Two in the page's.
    await show(page, ["one", "one"], []);
    assert.equal(said(warnings, "one").length, 1, "said once");
    assert.match(said(warnings, "one")[0], /^Basalt ArchitectureDiagram: two figures on this page have the id "one", so the ids inside them are the same: give each figure its own id$/);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("an id beginning bd- is a warning", async () => {
    const { page, warnings } = await devPage();
    await show(page, ["bd-x"]);
    assert.ok(warnings.some((w) => w.includes('the id "bd-x" begins "bd-"')));
    await page.close();
  });
});
