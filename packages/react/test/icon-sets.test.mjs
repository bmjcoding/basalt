// Icon sets (cimip-gaps-3 T9, DECISIONS 403, test 10): the fallback at every slot with a partial set, a replaced glyph in a drawn pair swaps, a declared group
// turns, the status warning, a nested provider replaces and an empty one is Basalt's. Sizes are in bundle.test.mjs. Written by the builder; not run (DECISIONS 359).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const open = async (jsx) => {
  const { page, errors } = await fixturePage(browser, `
    const Soft = B.defineGlyph({ name: "close", selected: [[8, 8, 16, 16], [16, 8, 8, 16]] });
    const Plain = (p) => <svg data-plain="" width={p.size} height={p.size} viewBox="0 0 24 24" className={p.className} aria-hidden={p["aria-hidden"]}><circle cx="12" cy="12" r="8" fill="currentColor" /></svg>;
    createRoot(document.getElementById("root")).render(<>${jsx}</>);`);
  await settle(page);
  return { page, errors };
};

test("with a partial set, every part keeps its own glyph where the set has no entry; a slot replaces only its mark", async () => {
  const { page } = await open(`<B.IconProvider icons={{ "status-success": Plain }}><B.Callout status="success" title="Saved" id="s">Done.</B.Callout><B.Callout status="warning" title="Careful" id="w">Mind.</B.Callout><B.IconButton icon={B.CloseGlyph} label="Close" id="c" /></B.IconProvider>`);
  assert.equal(await page.locator("#s [data-plain]").count(), 1, "the success slot is replaced");
  assert.equal(await page.locator("#w [data-plain]").count(), 0, "the warning mark is the part's own");
  assert.equal(await page.locator('#c [data-glyph="close"]').count(), 1, "close is the core glyph: never a blank seat");
  await page.close();
});

test("a defined glyph replaces a core glyph by name, at the same size and in the same ink", async () => {
  const { page } = await open(`<B.IconProvider icons={{ close: Soft }}><B.IconButton icon={B.CloseGlyph} label="Close" id="c" /></B.IconProvider><B.IconButton icon={B.CloseGlyph} label="Close" id="d" />`);
  const [replaced, own] = await Promise.all(["#c svg", "#d svg"].map((s) => page.locator(s).evaluate((el) => ({ w: el.getAttribute("width"), path: el.innerHTML, color: getComputedStyle(el).color }))));
  assert.equal(replaced.w, own.w);
  assert.equal(replaced.color, own.color);
  assert.notEqual(replaced.path, own.path);
  await page.close();
});

test("a replaced glyph in a drawn pair swaps (no frame of a morph); a defined group turns among its own", async () => {
  // The engine's rule, without a page: a defined glyph never takes a core pair, and turns only within its own group.
  const { prepare, endpointOf } = await import("../dist/glyph-motion.js");
  {
    const core = (await import("../dist/index.js")).CloseGlyph.glyph;
    const menu = (await import("../dist/index.js")).MenuGlyph.glyph;
    assert.equal(prepare(endpointOf({ ...menu, defined: true }, false), endpointOf(core, false)).kind, null, "a defined menu to the core close swaps");
    const right = { name: "my-right", selected: [[6, 12, 18, 12]], group: "mine", rotate: 0, defined: true };
    const down = { ...right, name: "my-down", rotate: 90 };
    assert.equal(prepare(endpointOf(right, false), endpointOf(down, false)).kind, "group");
  }
});

test("two status slots sharing a component warn in development", async () => {
  const React = await import("react");
  const { renderToString } = await import("react-dom/server");
  const B = await import("../dist/index.js");
  const Mark = () => null;
  const warned = [];
  const warn = console.warn;
  console.warn = (message) => warned.push(String(message));
  try { renderToString(React.createElement(B.IconProvider, { icons: { "status-success": Mark, "status-danger": Mark } })); } finally { console.warn = warn; }
  assert.ok(warned.some((m) => /status-success and status-danger share one component/.test(m)));
});

test("a nested provider replaces the outer set and an empty one is Basalt's", async () => {
  const { page } = await open(`<B.IconProvider icons={{ close: Soft }}><B.IconProvider icons={{}}><B.IconButton icon={B.CloseGlyph} label="Close" id="c" /></B.IconProvider></B.IconProvider>`);
  const own = await page.locator("#c svg").innerHTML();
  const { page: plain } = await open(`<B.IconButton icon={B.CloseGlyph} label="Close" id="c" />`);
  assert.equal(own, await plain.locator("#c svg").innerHTML(), "an empty set is Basalt's drawings");
  await page.close(); await plain.close();
});
