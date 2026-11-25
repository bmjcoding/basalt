// A page of several diagrams (cimip-gaps-3, the console's log: G17 and G18) and the viewer's outline. G17: the keys are said once a figure only where a
// reader moves into its drawing (the drawing's description), never in the page's flow, and "View as list" and "Expand" name their figure, the words shown
// leading the name (WCAG 2.5.3); an app's action is described by the title. G18: a card that is a focus stop has an interactive role (a button described
// as its stop's noun, its sentence unchanged), so axe's focus-order-semantics finds nothing on a page of three figures. The viewer's list sits under the
// dialog's h2: its sub-headings are h3 and its group lines h4, whatever the page's heading. In Chromium against the built package. Written while tests are
// paused (DECISIONS 359): not yet run by the suite; the probe of cimip-gaps-3/diagrams read the same page. The G15 test is in content-policy.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const P = "basalt-diagram";
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page, n = 4) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
const THREE = `
import a from "./test/fixtures/cimip-diagrams-b.json";
import d from "./test/fixtures/diagrams-d1.json";
window.__heading = window.__heading ?? 3;
createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}>
  <h1>Figures</h1>
  <B.ArchitectureDiagram id="fig-a" {...a.architecture} heading={window.__heading} />
  <B.FlowchartDiagram id="fig-b" {...a.flowchart} heading={window.__heading} />
  <B.KanbanDiagram id="fig-c" {...d.kanban} type={undefined} heading={window.__heading} actions={[{ label: "Copy link", onSelect: () => {} }]} />
  <B.SequenceDiagram id="fig-d" {...a.sequence} heading={window.__heading} />
</main>);`;
async function threePage(heading = 3) {
  const { page, errors } = await fixturePage(browser, `window.__heading = ${heading};${THREE}`, { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } });
  await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout === "drawn"), P);
  // The actions' module loads on demand.
  await page.waitForSelector(`#fig-c .${P}-action`);
  await frames(page);
  return { page, errors };
}
/** The accessibility tree as Chromium has it: each node's role, name and description, ignored nodes left out. */
async function tree(page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  await cdp.detach();
  const v = (n, k) => n[k]?.value ?? "";
  return nodes.filter((n) => !n.ignored).map((n) => ({ role: v(n, "role"), name: v(n, "name"), description: v(n, "description"), roledescription: n.properties?.find((p) => p.name === "roledescription")?.value?.value ?? "" }));
}
const title = (page, id) => page.locator(`#${id} .${P}-title`).innerText();

describe("a page of diagrams (G17)", () => {
  test("the keys sentence is not in the page's flow: each figure's drawing is described by it, and the hint on screen is hidden from assistive technology", async () => {
    const { page, errors } = await threePage();
    const nodes = await tree(page);
    assert.deepEqual(nodes.filter((n) => /Arrow keys|Home and End/.test(n.name)), [], "no text node says the keys");
    assert.deepEqual(nodes.filter((n) => n.role === "StaticText" && /^(the ends|clear|Esc)$/.test(n.name)), [], "the hint's words are not read");
    const drawings = nodes.filter((n) => n.role === "group" && n.roledescription === "diagram");
    assert.equal(drawings.length, 4);
    for (const d of drawings) assert.match(d.description, /Arrow keys move .*Home and End go to the ends; Escape clears the trace\./, `${d.name} is described by its keys`);
    assert.deepEqual(await page.locator(`.${P} [id$="-keys"]`).evaluateAll((els) => els.map((el) => el.hidden)), [true, true, true, true]);
    assert.deepEqual(await page.locator(`.${P}-hint`).evaluateAll((els) => els.map((el) => el.getAttribute("aria-hidden"))), ["true", "true", "true", "true"]);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("View as list and Expand name their figure, the words shown first; an action keeps its own name and is described by the title", async () => {
    const { page, errors } = await threePage();
    const nodes = await tree(page);
    const names = nodes.filter((n) => n.role === "button").map((n) => n.name);
    for (const id of ["fig-a", "fig-b", "fig-c", "fig-d"]) {
      const t = await title(page, id);
      assert.equal(names.filter((n) => n === `View as list ${t}`).length, 1, `"View as list ${t}"`);
      assert.equal(names.filter((n) => n === `Expand ${t}`).length, 1, `"Expand ${t}"`);
    }
    // The visible words are unchanged, and lead the name.
    assert.deepEqual(await page.locator(`.${P}-toggle .basalt-button-label`).allInnerTexts(), ["View as list", "View as list", "View as list", "View as list"]);
    assert.deepEqual(await page.locator(`.${P}-expand .basalt-button-label`).allInnerTexts(), ["Expand", "Expand", "Expand", "Expand"]);
    // Opened, the toggle's words and its name follow.
    await page.locator(`#fig-a .${P}-toggle`).click();
    const shown = await title(page, "fig-a");
    assert.equal((await tree(page)).filter((n) => n.role === "button" && n.name === `Hide the list ${shown}`).length, 1);
    const action = nodes.find((n) => n.role === "button" && n.name === "Copy link");
    assert.ok(action, "the action's name is its words");
    assert.equal(action.description, await title(page, "fig-c"));
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("a card's role (G18)", () => {
  test("a card that is a focus stop is a button described as its stop's noun, named by its sentence; a link card is the link; at rest a card is an image", async () => {
    const { page, errors } = await threePage();
    const read = (sel) => page.locator(sel).evaluateAll((els) => els.map((el) => [el.tagName.toLowerCase(), el.getAttribute("role"), el.getAttribute("aria-roledescription"), el.hasAttribute("tabindex")]));
    for (const [id, noun] of [["fig-a", "part"], ["fig-b", "step"], ["fig-c", "card"], ["fig-d", "participant"]]) {
      const cards = await read(`#${id} .${P}-node`);
      assert.ok(cards.length > 2);
      for (const [tag, role, rd, stop] of cards) {
        assert.equal(stop, true, `${id}: every card is a stop when drawn`);
        if (tag === "a") assert.deepEqual([role, rd], [null, null], `${id}: a link card is the link`);
        else assert.deepEqual([role, rd], ["button", noun], `${id}: a card`);
      }
    }
    // Its sentence is its name, as it was as an image.
    const nodes = await tree(page);
    const sentence = await page.locator(`#fig-a .${P}-node:not(a)`).first().getAttribute("aria-label");
    assert.equal(nodes.filter((n) => n.role === "button" && n.name === sentence && n.roledescription === "part").length, 1);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("before script a card is an image with no stop", async () => {
    const { page } = await fixturePage(browser, `import a from "./test/fixtures/cimip-diagrams-b.json"; import { renderToString } from "react-dom/server";
      document.getElementById("root").innerHTML = renderToString(<B.ArchitectureDiagram id="fig-a" {...a.architecture} />);`, { theme: "dark", standards: true });
    const cards = await page.locator(`#fig-a .${P}-node:not(a)`).evaluateAll((els) => els.map((el) => [el.getAttribute("role"), el.getAttribute("aria-roledescription"), el.getAttribute("tabindex")]));
    assert.ok(cards.length > 2);
    for (const c of cards) assert.deepEqual(c, ["img", null, null]);
    await page.close();
  });

  test("axe's focus-order-semantics, and the role and name rules, find nothing on a page of three figures (and one with a sequence)", async () => {
    const { page, errors } = await threePage();
    await page.evaluate(() => { document.title = "Figures"; document.documentElement.lang = "en"; });
    await page.addScriptTag({ content: axeSource });
    const found = await page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: "rule", values: ["focus-order-semantics", "aria-roledescription", "aria-allowed-role", "nested-interactive", "button-name", "label-content-name-mismatch"] }, resultTypes: ["violations"] }))
      .violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`));
    assert.deepEqual(found, []);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("the viewer's outline", () => {
  for (const heading of [3, 5]) {
    test(`with the page's heading ${heading}, the viewer's list is h3 under its h2, and a sequence's bands and frames h4`, async () => {
      const { page, errors } = await threePage(heading);
      const outline = async (id) => {
        await page.locator(`#${id} .${P}-expand`).click();
        await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
        await page.locator(`dialog.${P}-viewer .${P}-toggle`).click();
        await page.waitForSelector(`dialog.${P}-viewer .${P}-viewer-list`);
        const got = await page.locator(`dialog.${P}-viewer`).evaluate((d) => [...d.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter((h) => h.getClientRects().length).map((h) => [h.tagName, h.textContent]));
        await page.keyboard.press("Escape");
        await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
        return got;
      };
      const arch = await outline("fig-a");
      assert.deepEqual(arch.map(([t]) => t), ["H2", "H3", "H3"], JSON.stringify(arch));
      assert.deepEqual(arch.slice(1).map(([, words]) => words), ["Parts", "Connections"]);
      const seq = await outline("fig-d");
      assert.equal(seq[0][0], "H2");
      assert.deepEqual(seq.filter(([, w]) => w === "Participants" || w === "Messages").map(([t]) => t), ["H3", "H3"]);
      const groups = seq.filter(([, w]) => w !== "Participants" && w !== "Messages").slice(1);
      assert.ok(groups.length > 0, "the sequence has bands or frames");
      assert.deepEqual([...new Set(groups.map(([t]) => t))], ["H4"]);
      // The page's own list keeps its level.
      await page.locator(`#fig-a .${P}-toggle`).click();
      assert.deepEqual(await page.locator(`#fig-a .${P}-list .${P}-list-head`).evaluateAll((els) => els.map((el) => el.tagName)), [`H${Math.min(6, heading + 1)}`, `H${Math.min(6, heading + 1)}`]);
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
});

describe("the rest of the foot names its figure (G17)", () => {
  test("Pause animations and Clear highlight: the words shown, then the title; the words on screen are unchanged", async () => {
    const { page, errors } = await fixturePage(browser, `import m from "./test/fixtures/diagram-motion.json";
      createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}><B.ArchitectureDiagram id="fig-m" {...m.kit} /></main>);`,
    { theme: "dark", standards: true, viewport: { width: 1136, height: 900 }, hasTouch: true, isMobile: true });
    await page.waitForSelector(`#fig-m .${P}-pause`);
    await page.waitForSelector(`#fig-m .${P}-clear`);
    const t = await title(page, "fig-m");
    const names = (await tree(page)).filter((n) => n.role === "button").map((n) => n.name);
    assert.equal(names.filter((n) => n === `Pause animations ${t}`).length, 1, JSON.stringify(names));
    assert.equal(names.filter((n) => n === `Clear highlight ${t}`).length, 1, JSON.stringify(names));
    assert.equal(await page.locator(`#fig-m .${P}-pause`).innerText(), "Pause animations");
    assert.equal(await page.locator(`#fig-m .${P}-clear`).innerText(), "Clear highlight");
    assert.deepEqual(errors, []);
    await page.close();
  });
});
