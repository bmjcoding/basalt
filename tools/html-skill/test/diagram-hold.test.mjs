// The skill's share of G18 (DECISIONS 392), as React's (packages/react/test/diagram-hold.test.mjs): the axe acceptance in both themes, drawn and stacked;
// a traced card is a toggle button whose press is one change (Enter on keydown, Space on keyup, a click); a planning figure's cards are pictures and no
// stop; Esc from the foot releases a hold; a mouse and the keys never set data-touch; the held mark is on the held card alone; and the viewer's keys say
// Esc closes it and never that it clears. Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const A = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const D = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagrams-d1.json"), "utf8"));
const P = "diagram";
const FIGS = { architecture: A.architecture, flowchart: A.flowchart, sequence: A.sequence, schema: A.schema, kanban: D.kanban, gantt: D.gantt, timeline: D.timeline, journey: D.journey, storyMap: D.storyMap, blueprint: D.blueprint };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = () => compose(`<title>Figures</title><main style="max-width:1104px;margin:0 auto;padding:16px"><h1>Figures</h1><button id="before">Before</button>${Object.entries(FIGS).map(([id, spec]) => `<figure class="diagram" id="fig-${id}"><script type="application/json" data-diagram>${JSON.stringify(spec).replace(/</g, "\\u003c")}</script></figure>`).join("")}<button id="after">After</button><div style="height:3000px"></div></main>`).html;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function open({ scheme = "dark", width = 1136, touch = false } = {}) {
  const { page, context, errors } = await openHtml(browser, html(), { scheme, width, touch });
  await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout), P);
  await frames(page);
  return { page, context, errors };
}
const card = (key, id) => `#fig-${key} .${P}-node[data-node="${id}"]`;

describe("the skill's diagram cards (DECISIONS 392)", () => {
  const RULES = ["focus-order-semantics", "aria-allowed-attr", "aria-allowed-role", "nested-interactive", "aria-required-children", "aria-required-parent"];
  for (const scheme of ["dark", "light"]) for (const width of [1136, 390]) {
    test(`axe, ${scheme} at ${width}: clean, a card held and not`, async () => {
      const { page, context } = await open({ scheme, width });
      await page.addScriptTag({ content: axeSource });
      const run = () => page.evaluate((rules) => window.axe.run("main", { runOnly: { type: "rule", values: rules }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), RULES);
      assert.deepEqual(await run(), [], "at rest");
      for (const key of Object.keys(FIGS)) { const t = page.locator(`#fig-${key} .${P}-node[aria-pressed]`).first(); if (await t.count()) await t.click(); }
      await frames(page);
      assert.deepEqual(await run(), [], "held");
      await context.close();
    });
  }

  test("a press is one change: Enter on keydown once, Space on keyup, a click; the ground releases; one card at most is held; the mark is on it alone", async () => {
    const { page, context, errors } = await open();
    const sel = card("architecture", "browser");
    await page.locator(sel).focus();
    await page.locator(sel).evaluate((el) => { window.__n = 0; new MutationObserver((l) => { window.__n += l.filter((r) => r.attributeName === "aria-pressed").length; }).observe(el, { attributes: true }); });
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter");
    await page.keyboard.up("Enter");
    assert.equal(await page.locator(sel).getAttribute("aria-pressed"), "true");
    await page.keyboard.down("Space");
    assert.equal(await page.locator(sel).getAttribute("aria-pressed"), "true", "Space waits for its keyup");
    await page.keyboard.up("Space");
    assert.equal(await page.locator(sel).getAttribute("aria-pressed"), "false");
    await page.locator(sel).click();
    assert.equal(await page.evaluate(() => window.__n), 3, "three presses, three changes");
    await page.locator(card("architecture", "alb")).click();
    assert.equal(await page.locator(`#fig-architecture [data-held]`).count(), 1);
    assert.equal(await page.locator(card("architecture", "alb")).getAttribute("data-held"), "");
    const box = await page.locator(`#fig-architecture .${P}-drawing`).boundingBox();
    await page.mouse.click(box.x + 2, box.y + box.height - 2);
    assert.equal(await page.locator(`#fig-architecture [data-held]`).count(), 0, "the ground released it");
    assert.equal(await page.locator(`#fig-architecture[data-touch]`).count(), 0, "a mouse and the keys never set data-touch");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("Space ignores Ctrl, Meta and Alt, unprevented; Shift+Space presses once without scrolling", async () => {
    const { page, context } = await open();
    const sel = card("architecture", "browser");
    await page.locator(sel).focus();
    await page.evaluate(() => { window.__prevented = []; document.addEventListener("keydown", (e) => { if (e.key === " ") window.__prevented.push(e.defaultPrevented); }); });
    for (const mod of ["Control", "Meta", "Alt"]) await page.keyboard.press(`${mod}+Space`);
    assert.equal(await page.locator(sel).getAttribute("aria-pressed"), "false");
    assert.deepEqual(await page.evaluate(() => window.__prevented), [false, false, false]);
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.press("Shift+Space");
    assert.equal(await page.locator(sel).getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => scrollY), y);
    await context.close();
  });

  test("Esc: from a card with a hold, it releases and stops; from the foot with a hold, it releases and stops; outside, the hold stays", async () => {
    const { page, context } = await open();
    await page.evaluate(() => { window.__esc = 0; document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.__esc++; }); });
    await page.locator(card("architecture", "browser")).click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(`#fig-architecture [data-held]`).count(), 0);
    await page.locator(card("architecture", "browser")).click();
    await page.locator(`#fig-architecture .${P}-toggle`).focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(`#fig-architecture [data-held]`).count(), 0, "the foot's Esc released it");
    assert.equal(await page.evaluate(() => window.__esc), 0, "both stopped at the figure");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.__esc), 1, "with no hold it bubbles");
    await page.locator(card("architecture", "browser")).click();
    await page.locator("#after").focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(card("architecture", "browser")).getAttribute("aria-pressed"), "true", "outside the figure the hold stays");
    await context.close();
  });

  for (const width of [1136, 390]) {
    test(`at ${width}: a planning figure has no stop, no key hint, and pictures for cards`, async () => {
      const { page, context } = await open({ width });
      for (const key of ["kanban", "gantt", "timeline", "journey", "storyMap"]) {
        const got = await page.locator(`#fig-${key}`).evaluate((f, P) => ({
          tabindex: f.querySelectorAll(`.${P}-node[tabindex]`).length,
          pressed: f.querySelectorAll(`.${P}-node[aria-pressed]`).length,
          pictures: [...f.querySelectorAll(`div.${P}-node`)].every((n) => n.getAttribute("role") === "img"),
          hint: getComputedStyle(f.querySelector(`:scope > .${P}-hint`)).display,
        }), P);
        assert.deepEqual(got, { tabindex: 0, pressed: 0, pictures: true, hint: "none" }, key);
      }
      await context.close();
    });
  }

  test("the viewer: its keys sentence says Escape closes the viewer and never clears; the page's says clears; one Esc in the viewer's hint, close", async () => {
    const { page, context } = await open();
    assert.match(await page.locator(`#fig-architecture > [id$="-keys"]`).textContent(), /Escape clears the highlight\./);
    await page.locator(`#fig-architecture .${P}-expand`).click();
    await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
    const keys = await page.locator(`dialog.${P}-viewer .${P} > [id$="-keys"]`).textContent();
    assert.match(keys, /Escape closes the viewer\.$/);
    assert.doesNotMatch(keys, /clears/);
    const words = (await page.locator(`dialog.${P}-viewer .${P}-viewer-hint > span`).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
    assert.deepEqual(words.filter((w) => w.startsWith("Esc")), ["Esc close"]);
    assert.deepEqual(words.slice(-4), ["Space keep the highlight", "+ − zoom", "0 fit", "Esc close"]);
    await context.close();
  });

  test("on touch a tap holds, marks data-touch, and Clear highlight is last in the foot", async () => {
    const { page, context } = await open({ touch: true });
    const clear = page.locator(`#fig-architecture .${P}-clear`);
    assert.equal(await clear.getAttribute("aria-disabled"), "true");
    await page.locator(card("architecture", "browser")).tap();
    assert.equal(await page.locator(card("architecture", "browser")).getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#fig-architecture[data-touch]").count(), 1);
    assert.equal(await clear.getAttribute("aria-disabled"), null);
    assert.equal(await page.locator(`#fig-kanban .${P}-clear`).count(), 0, "none on a planning figure");
    await context.close();
  });
});
