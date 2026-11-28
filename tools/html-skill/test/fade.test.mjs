// cimip-gaps-3 t7 in the HTML skill (cut content fades; cimip-gaps-3/t7/decision.md, DECISIONS 395 to 399): the fade module comes with what scrolls, a port
// fades on each side that hides more and has no mask while it fits, the tab row's clip stays, the segmented control and a bare pre.code get their host, a menu,
// a popover, a dialog and a sheet scroll in a port while the box keeps its rim, the modes and data-fades="off" turn every mask off, and a text-only port is
// reached and scrolled by the keys. Synthetic data in two unlike domains (a greenhouse log and a recipe box). Written and not run: tests are paused (DECISIONS 359).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";

import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const LOG = Array.from({ length: 30 }, (_, i) => `<p>Bench ${i + 1}: misted the seedlings and moved the ferns away from the vent.</p>`).join("");
const RECIPES = ["Bread", "Soups", "Salads", "Pickles", "Preserves", "Pastry", "Noodles", "Curries", "Dumplings", "Grills"];
const BODY = `<title>Fades</title><main class="page" style="max-width: 320px">
  <div data-tabs><div class="tabs" role="tablist" aria-label="Recipes">${RECIPES.map((r, i) => `<button class="tab" role="tab" id="t${i}" aria-controls="p${i}" aria-selected="${i === 0}">${r}</button>`).join("")}</div>
  ${RECIPES.map((r, i) => `<div id="p${i}" role="tabpanel"${i ? " hidden" : ""}>${r}</div>`).join("")}</div>
  <div class="segment" role="group" aria-label="Recipes">${RECIPES.slice(0, 7).map((r, i) => `<button type="button" aria-pressed="${i === 0}">${r}</button>`).join("")}</div>
  <pre class="code" id="bare" tabindex="0"><code>for (const bench of benches) schedule(bench, { misting: "every 40 minutes", vents: "closed after dusk", lights: "sixteen hours" });</code></pre>
  <button class="btn" data-dialog-open="#log">Open the log</button>
  <dialog class="panel float modal dialog" id="log" aria-labelledby="log-title"><h2 class="dialog-title" id="log-title">Bench log</h2>${LOG}</dialog>
</main>`;

const page = async (options) => {
  const html = compose(BODY, { fonts: false }).html;
  return openHtml(browser, html, options);
};
const state = (p, selector) => p.evaluate((s) => { const el = document.querySelector(s); const read = (n) => parseFloat(el.style.getPropertyValue(n)) || 0; return { mode: el.getAttribute("data-fade"), l: read("--_fade-l"), r: read("--_fade-r"), t: read("--_fade-t"), b: read("--_fade-b"), mask: getComputedStyle(el).maskImage }; }, selector);

describe("the skill's fade", () => {
  test("the fade module comes with what scrolls, and SKILL.md names it", () => {
    const { html } = compose(BODY, { fonts: false });
    assert.match(html, /_\.scrollFade|scrollFade/);
  });

  test("the tab row fades at the side that hides tabs, inside its clip, and keeps the clip", async () => {
    const { page: p, errors } = await page({ scheme: "dark" });
    const start = await state(p, ".tabs-scroll");
    assert.deepEqual([start.mode, start.l, start.r], ["inline", 0, 20]);
    await p.focus("#t5");
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const middle = await state(p, ".tabs-scroll");
    assert.ok(middle.l > 0 && middle.r > 0);
    assert.notEqual(await p.evaluate(() => getComputedStyle(document.querySelector(".tabs-scroll")).clipPath), "none");
    assert.deepEqual(errors, []);
  });

  test("the segmented control is a host and a port: the track keeps its fill and is never masked, the port scrolls and fades", async () => {
    const { page: p } = await page();
    const parts = await p.evaluate(() => { const h = document.querySelector(".segment"); const port = h.querySelector(":scope > .segment-scroll"); return { port: Boolean(port), host: getComputedStyle(h).maskImage, over: h.hasAttribute("data-overflow"), pill: port && port.firstElementChild.className }; });
    assert.deepEqual(parts, { port: true, host: "none", over: true, pill: "pill" });
    assert.equal((await state(p, ".segment-scroll")).mode, "inline");
  });

  test("a bare pre.code is given a host that draws the well and the ring; the pre scrolls, fades and keeps its padding", async () => {
    const { page: p } = await page();
    const code = await p.evaluate(() => { const pre = document.getElementById("bare"); return { host: pre.parentElement.className, cls: pre.className, pad: getComputedStyle(pre).paddingLeft }; });
    assert.deepEqual(code, { host: "code", cls: "code-body", pad: "16px" });
    await p.focus("#bare");
    const ring = await p.evaluate(() => [getComputedStyle(document.getElementById("bare").parentElement).outlineStyle, getComputedStyle(document.getElementById("bare")).outlineStyle]);
    assert.deepEqual(ring, ["solid", "none"]);
    await p.keyboard.press("ArrowRight");
    await p.keyboard.press("ArrowRight");
    assert.ok(await p.evaluate(() => document.getElementById("bare").scrollLeft > 0), "the keys scroll it");
  });

  test("a dialog taller than the window scrolls in its port; the dialog keeps its rim and is a keyboard stop's host", async () => {
    const { page: p } = await page({ width: 390 });
    await p.click('[data-dialog-open="#log"]');
    await p.evaluate(() => new Promise((r) => setTimeout(r, 400)));
    const parts = await p.evaluate(() => { const d = document.getElementById("log"); const port = d.querySelector(":scope > .dialog-scroll"); return { port: Boolean(port), dialogMask: getComputedStyle(d).maskImage, rim: getComputedStyle(d).borderTopWidth, stop: port.getAttribute("tabindex") }; });
    assert.deepEqual(parts, { port: true, dialogMask: "none", rim: "1px", stop: "0" });
    assert.equal((await state(p, ".dialog-scroll")).mode, "block");
  });

  for (const [name, media] of [["more contrast", { contrast: "more" }], ["forced colours", { forcedColors: "active" }], ["print", { media: "print" }]]) {
    test(`under ${name} every mask is off`, async () => {
      const { page: p } = await page();
      await p.emulateMedia(media);
      const masks = await p.evaluate(() => [...document.querySelectorAll("[data-fade]")].map((el) => getComputedStyle(el).maskImage));
      assert.ok(masks.length > 0 && masks.every((m) => m === "none"));
    });
  }

  test("data-fades=\"off\" on the root turns every mask off; reduced motion keeps them", async () => {
    const { page: p } = await page({ reducedMotion: "reduce" });
    assert.ok(await p.evaluate(() => [...document.querySelectorAll("[data-fade]")].some((el) => getComputedStyle(el).maskImage !== "none")));
    await p.evaluate(() => { document.documentElement.dataset.fades = "off"; });
    assert.ok(await p.evaluate(() => [...document.querySelectorAll("[data-fade]")].every((el) => getComputedStyle(el).maskImage === "none")));
  });
});
