// Stable ids in a diagram (console gap G146): a figure with an `id` builds every id inside it on that id (`idBase`), so its `aria-labelledby`,
// `aria-describedby` and `aria-controls` read the same on every render and in any order, the viewer's included; two figures with different ids never
// share an id inside; one id given to two figures is a warning in development. A figure with no id keeps React's useId. In Chromium against the built
// package, and the engine's `idBase` in Node. Written while tests are paused (DECISIONS 359): not yet run by the suite.
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
const SAFE = /^[A-Za-z0-9_-]+$/;

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

async function openPage(order, before) {
  const { page, errors } = await fixturePage(browser, `window.__order = ${JSON.stringify(order)}; window.__before = ${before};${PAGE}`, { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } });
  await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout), P);
  await frames(page);
  return { page, errors };
}

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

/** Opens a figure's viewer and returns the ids in its dialog. */
async function viewerIds(page, id) {
  await page.locator(`#${id} .${P}-expand`).click();
  await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
  await frames(page, 3);
  const ids = await idsIn(page, `dialog.${P}-viewer`);
  await page.keyboard.press("Escape");
  await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
  return ids;
}

describe("idBase", () => {
  test("letters, digits and hyphens are kept, any other character is written in hex, and the base ends _dg", () => {
    assert.equal(core.idBase("checkout-flow"), "checkout-flow_dg");
    assert.equal(core.idBase("a b"), "a_20_b_dg");
    assert.equal(core.idBase("a_b"), "a_5f_b_dg");
    assert.equal(core.idBase("é"), "_e9__dg");
    assert.equal(core.idBase("😀"), "_1f600__dg");
    assert.equal(core.idBase('"><script>'), "_22__3e__3c_script_3e__dg");
  });

  test("different ids never give one id inside: no base and suffix of one figure is another figure's", () => {
    const ids = ["x", "x-title", "x_dg", "x_dg-title", "x y", "x_20_", "x_", "_", "-", "x-v", "x-viewer", "X", "x\u0000", "1"];
    const suffixes = ["-title", "-summary", "-keys", "-list", "-toggle", "-toggle-words", "-expand-words", "-clear-words", "-play", "-pause", "-cut-0", "-reveal-0", "-viewer-title", "-viewer-summary", "-v-title", "-v-cut-0"];
    const seen = new Map();
    for (const id of ids) {
      const base = core.idBase(id);
      assert.match(base, SAFE, id);
      for (const s of suffixes) {
        const made = base + s;
        assert.ok(!seen.has(made) || seen.get(made) === id, `${JSON.stringify(id)} and ${JSON.stringify(seen.get(made))} both make ${made}`);
        seen.set(made, id);
      }
    }
  });
});

describe("a figure's ids (G146)", () => {
  test("the same ids across two renders in a different order, with a different number of useId before them, the viewer's included", async () => {
    const first = await openPage(["a", "b"], 0);
    const second = await openPage(["b", "a"], 3);
    for (const id of ["fig-a", "fig-b"]) {
      const one = await idsIn(first.page, `#${id}`);
      const two = await idsIn(second.page, `#${id}`);
      assert.ok(one.length > 4, `${id}: its ids are read`);
      assert.deepEqual(two, one, `${id}: the same ids`);
      assert.ok(one.filter((s) => s.startsWith("id ")).every((s) => s.startsWith(`id ${id}_dg-`)), `${id}: every id inside is built on the figure's id`);
      assert.equal(await first.page.locator(`#${id}`).getAttribute("aria-labelledby"), `${id}_dg-title`);
      assert.deepEqual(await viewerIds(second.page, id), await viewerIds(first.page, id), `${id}: the viewer's ids are the same`);
    }
    const viewer = await viewerIds(first.page, "fig-a");
    assert.ok(viewer.includes("aria-labelledby fig-a_dg-viewer-title") && viewer.includes("aria-describedby fig-a_dg-viewer-summary"), "the dialog is named on the figure's base");
    assert.ok(viewer.some((s) => s.startsWith("id fig-a_dg-v-")), "the viewer's drawing is built on the figure's base");
    assert.deepEqual([...first.errors, ...second.errors], []);
    await first.page.close();
    await second.page.close();
  });

  test("distinct ids for two figures, however their ids are written; every id inside is safe in a selector and url(#…)", async () => {
    const tricky = ["x", "x-title", "x_dg", "x y", "x_20_", "x-v"];
    const { page, errors } = await fixturePage(browser, `
import a from "./test/fixtures/cimip-diagrams-b.json";
createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}>
  ${tricky.map((id) => `<B.ArchitectureDiagram id=${JSON.stringify(id)} {...a.architecture} />`).join("\n  ")}
</main>);`, { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } });
    await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout), P);
    await frames(page);
    const all = await page.evaluate((P) => [...document.querySelectorAll(`figure.${P}`)].flatMap((f) => [...f.querySelectorAll("[id]")].map((el) => el.id)), P);
    assert.ok(all.length > tricky.length * 4);
    assert.equal(new Set(all).size, all.length, "no id inside one figure is another's");
    assert.ok(all.every((id) => SAFE.test(id)), "every id inside is letters, digits, hyphens and underscores");
    // Each figure's names resolve to its own elements.
    const own = await page.evaluate((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => [f, ...f.querySelectorAll("[aria-labelledby],[aria-describedby],[aria-controls]")].every((el) => ["aria-labelledby", "aria-describedby", "aria-controls"].every((a) => (el.getAttribute(a) ?? "").split(" ").filter(Boolean).every((id) => f.contains(document.getElementById(id)))))), P);
    assert.ok(own, "every name a figure gives is found inside that figure");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a figure with no id keeps useId's ids", async () => {
    const { page } = await fixturePage(browser, `
import a from "./test/fixtures/cimip-diagrams-b.json";
createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}><B.ArchitectureDiagram {...a.architecture} /></main>);`, { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } });
    await page.waitForSelector(`figure.${P}[data-layout]`);
    assert.match(await page.locator(`figure.${P}`).getAttribute("aria-labelledby"), /^dg[A-Za-z0-9_-]+-title$/);
    assert.doesNotMatch(await page.locator(`figure.${P}`).getAttribute("aria-labelledby"), /_dg-title$/);
    await page.close();
  });
});

describe("one id, two figures (development)", () => {
  const HOST = `
import a from "./test/fixtures/cimip-diagrams-b.json";
const root = createRoot(document.getElementById("root"));
window.__set = (ids) => root.render(<React.StrictMode><main style={{ width: 1104 }}>{ids.map((id, i) => <B.ArchitectureDiagram key={i} id={id} {...a.architecture} />)}</main></React.StrictMode>);`;
  async function devPage() {
    const { page, errors } = await fixturePage(browser, "", { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } });
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

  test("a second figure with the same id is a warning, once; figures with their own ids, in Strict Mode, are not", async () => {
    const { page, errors, warnings } = await devPage();
    await page.evaluate(() => window.__set(["one", "two"]));
    await page.waitForFunction((P) => document.querySelectorAll(`figure.${P}[data-layout]`).length === 2, P);
    await frames(page);
    assert.deepEqual(said(warnings, "one"), [], "Strict Mode's second effect is not a second figure");
    await page.evaluate(() => window.__set(["one", "one"]));
    await frames(page);
    assert.equal(said(warnings, "one").length, 1, "said once");
    assert.match(said(warnings, "one")[0], /^Basalt ArchitectureDiagram: two figures on this page have the id "one", so the ids inside them are the same: give each figure its own id$/);
    // One leaves: the id is one figure's again, and a figure given it later is a second only if the first is still there.
    await page.evaluate(() => window.__set(["one"]));
    await frames(page);
    await page.evaluate(() => window.__set(["one", "three"]));
    await frames(page);
    assert.deepEqual(said(warnings, "three"), []);
    assert.deepEqual(errors, []);
    await page.close();
  });
});
