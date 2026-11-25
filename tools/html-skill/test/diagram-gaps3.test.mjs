// The skill's share of cimip-gaps-3 (the console's log: G17 and G18) and the viewer's outline, as React's (packages/react/test/diagram-gaps3.test.mjs):
// a page of three composed figures. The keys sentence is the drawing's description and not in the page's flow; "View as list" and "Expand" name their
// figure, the words shown first; a card that is a focus stop is a button described as its stop's noun, and an image before script; axe's
// focus-order-semantics finds nothing; the viewer's list is h3 under its h2, a sequence's bands and frames h4. Written while tests are paused
// (DECISIONS 359): not yet run by the suite; the probe of cimip-gaps-3/diagrams read the same page.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const A = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const D = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagrams-d1.json"), "utf8"));
const P = "diagram";
const FIGS = { "fig-a": A.architecture, "fig-b": A.flowchart, "fig-c": D.kanban, "fig-d": A.sequence };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = () => compose(`<title>Figures</title><main style="max-width:1104px;margin:0 auto;padding:16px"><h1>Figures</h1>${Object.entries(FIGS).map(([id, spec]) => `<figure class="diagram" id="${id}"><script type="application/json" data-diagram>${JSON.stringify(spec).replace(/</g, "\\u003c")}</script></figure>`).join("")}</main>`).html;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function tree(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const v = (n, k) => n[k]?.value ?? "";
  return nodes.filter((n) => !n.ignored).map((n) => ({ role: v(n, "role"), name: v(n, "name"), description: v(n, "description"), roledescription: n.properties?.find((p) => p.name === "roledescription")?.value?.value ?? "" }));
}
async function open() {
  const { page, context, errors } = await openHtml(browser, html(), { scheme: "dark", width: 1136 });
  await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout === "drawn"), P);
  await frames(page);
  return { page, context, errors };
}
const title = (page, id) => page.locator(`#${id} .${P}-title`).innerText();

describe("the skill: a page of diagrams (G17)", () => {
  test("the keys are each drawing's description and not in the flow; View as list and Expand name their figure", async () => {
    const { page, context, errors } = await open();
    const nodes = await tree(page);
    assert.deepEqual(nodes.filter((n) => /Arrow keys|Home and End/.test(n.name)), []);
    const drawings = nodes.filter((n) => n.role === "group" && n.roledescription === "diagram");
    assert.equal(drawings.length, 4);
    for (const d of drawings) assert.match(d.description, /Arrow keys move .*Escape clears the trace\./);
    const names = nodes.filter((n) => n.role === "button").map((n) => n.name);
    for (const id of Object.keys(FIGS)) {
      const t = await title(page, id);
      assert.equal(names.filter((n) => n === `View as list ${t}`).length, 1, `"View as list ${t}"`);
      assert.equal(names.filter((n) => n === `Expand ${t}`).length, 1, `"Expand ${t}"`);
    }
    assert.deepEqual(await page.locator(`.${P}-toggle > span`).allInnerTexts(), ["View as list", "View as list", "View as list", "View as list"]);
    await page.locator(`#fig-a .${P}-toggle`).click();
    const shown = await title(page, "fig-a");
    assert.equal((await tree(page)).filter((n) => n.role === "button" && n.name === `Hide the list ${shown}`).length, 1);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("before script the toggle is named for its figure, the keys sentence is hidden and a card is an image with no stop", async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html() }));
    await page.goto("https://basalt.test/");
    const got = await page.evaluate((P) => ({
      toggle: [...document.querySelectorAll(`.${P}-toggle`)].map((b) => b.getAttribute("aria-labelledby").split(" ").map((id) => document.getElementById(id).textContent).join(" ")),
      keys: [...document.querySelectorAll(`figure.${P} [id$="-keys"]`)].map((s) => s.hidden),
      cards: [...document.querySelectorAll(`#fig-a .${P}-node:not(a)`)].map((el) => [el.getAttribute("role"), el.getAttribute("aria-roledescription"), el.getAttribute("tabindex")]),
    }), P);
    assert.equal(got.toggle.length, 4);
    assert.ok(got.toggle.every((n) => n.startsWith("View as list ")), JSON.stringify(got.toggle));
    assert.deepEqual(got.keys, [true, true, true, true]);
    assert.ok(got.cards.length > 2);
    for (const c of got.cards) assert.deepEqual(c, ["img", null, null]);
    await context.close();
  });
});

describe("the skill: a card's role (G18)", () => {
  test("a stop is a button described as its stop's noun; axe's focus-order-semantics and the role and name rules find nothing", async () => {
    const { page, context, errors } = await open();
    for (const [id, noun] of [["fig-a", "part"], ["fig-b", "step"], ["fig-c", "card"], ["fig-d", "participant"]]) {
      const cards = await page.locator(`#${id} .${P}-node`).evaluateAll((els) => els.map((el) => [el.tagName.toLowerCase(), el.getAttribute("role"), el.getAttribute("aria-roledescription")]));
      assert.ok(cards.length > 2);
      for (const [tag, role, rd] of cards) assert.deepEqual([role, rd], tag === "a" ? [null, null] : ["button", noun], `${id}`);
    }
    await page.addScriptTag({ content: axeSource });
    const found = await page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: "rule", values: ["focus-order-semantics", "aria-roledescription", "aria-allowed-role", "nested-interactive", "button-name", "label-content-name-mismatch"] }, resultTypes: ["violations"] }))
      .violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`));
    assert.deepEqual(found, []);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("the skill: the viewer's outline", () => {
  test("the viewer's list is h3 under its h2, and a sequence's bands and frames h4", async () => {
    const { page, context, errors } = await open();
    const outline = async (id) => {
      await page.locator(`#${id} .${P}-expand`).click();
      await page.waitForSelector(`dialog.${P}-viewer[open] figure.${P}[data-layout]`);
      await page.locator(`dialog.${P}-viewer .${P}-toggle`).click();
      await page.waitForSelector(`dialog.${P}-viewer .${P}-viewer-list`);
      const got = await page.locator(`dialog.${P}-viewer`).evaluate((d) => [...d.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter((h) => h.getClientRects().length).map((h) => [h.tagName, h.textContent]));
      await page.keyboard.press("Escape");
      await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
      return got;
    };
    const arch = await outline("fig-a");
    assert.deepEqual(arch.map(([t]) => t), ["H2", "H3", "H3"], JSON.stringify(arch));
    const seq = await outline("fig-d");
    assert.deepEqual(seq.filter(([, w]) => w === "Participants" || w === "Messages").map(([t]) => t), ["H3", "H3"]);
    const groups = seq.slice(1).filter(([, w]) => w !== "Participants" && w !== "Messages");
    assert.ok(groups.length > 0);
    assert.deepEqual([...new Set(groups.map(([t]) => t))], ["H4"]);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("the skill: the rest of the foot names its figure (G17)", () => {
  test("Pause animations, Clear highlight, Download SVG and Download PNG: the words shown, then the title", async () => {
    const M = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-motion.json"), "utf8"));
    const page0 = compose(`<title>Foot</title><main style="max-width:1104px;margin:0 auto;padding:16px"><figure class="diagram" id="fig-m"><script type="application/json" data-diagram>${JSON.stringify({ ...M.kit, export: true }).replace(/</g, "\\u003c")}</script></figure></main>`).html;
    const { page, context, errors } = await openHtml(browser, page0, { scheme: "dark", width: 1136, touch: true });
    await page.waitForSelector(`#fig-m .${P}-pause`);
    await page.waitForSelector(`#fig-m .${P}-clear`);
    const t = await title(page, "fig-m");
    const names = (await tree(page)).filter((n) => n.role === "button").map((n) => n.name);
    for (const words of ["Pause animations", "Clear highlight", "Download SVG", "Download PNG", "View as list", "Expand"]) {
      assert.equal(names.filter((n) => n === `${words} ${t}`).length, 1, `"${words} ${t}" in ${JSON.stringify(names)}`);
    }
    assert.deepEqual(await page.locator(`#fig-m .${P}-download`).allInnerTexts(), ["Download SVG", "Download PNG"]);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
