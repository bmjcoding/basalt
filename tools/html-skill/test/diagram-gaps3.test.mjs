// The skill's share of cimip-gaps-3 (the console's log: G17) and the viewer's outline, as React's (packages/react/test/diagram-gaps3.test.mjs): the keys
// sentence is not in the page's flow and describes the drawing's tab stop, said on tab-in and not on each arrow, and it is written from the measured
// layout, as React's; Basalt's foot buttons name their figure, the words shown first; every card's name begins with its visible name, in every type; the
// viewer's list is h3 under its h2, a sequence's bands and frames h4; the list's heads compute React's tracking and wrap. G18 (a card's role) is held for
// a design round. Written while tests are paused (DECISIONS 359): not yet run by the suite; the probe of cimip-gaps-3/diagrams read the same pages.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage as reactFixture, pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

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
  const prop = (n, k) => n.properties?.find((p) => p.name === k)?.value?.value;
  return nodes.filter((n) => !n.ignored).map((n) => ({ role: v(n, "role"), name: v(n, "name"), description: v(n, "description"), roledescription: prop(n, "roledescription") ?? "", focused: Boolean(prop(n, "focused")) }));
}
// The focused element: the document (RootWebArea) is focused too while the page has focus, so it is passed over.
const focused = async (page) => (await tree(page)).find((n) => n.focused && n.role !== "RootWebArea") ?? null;
/** Tab into a figure from a button just before it, an arrow that moves the stop (→, else ↓), then out and in again: what the tree says each time. */
async function tabArrowTab(page, id) {
  await page.evaluate((id) => { const b = document.createElement("button"); b.id = `before-${id}`; b.textContent = "Before"; document.getElementById(id).before(b); }, id);
  const keys = await page.locator(`#${id} > [id$="-keys"]`).textContent();
  await page.locator(`#before-${id}`).focus();
  await page.keyboard.press("Tab");
  const tabIn = await focused(page);
  const first = await page.evaluate(() => document.activeElement?.dataset.node);
  let moved = null;
  for (const key of ["ArrowRight", "ArrowDown"]) {
    await page.keyboard.press(key);
    await frames(page, 2);
    if (await page.evaluate((f) => document.activeElement?.dataset.node !== f, first)) { moved = await focused(page); break; }
  }
  await page.keyboard.press("Shift+Tab");
  await frames(page, 2);
  await page.keyboard.press("Tab");
  await frames(page, 2);
  return { keys, tabIn, moved, again: await focused(page) };
}
async function open() {
  const { page, context, errors } = await openHtml(browser, html(), { scheme: "dark", width: 1136 });
  await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout === "drawn"), P);
  await frames(page);
  return { page, context, errors };
}
const title = (page, id) => page.locator(`#${id} .${P}-title`).innerText();

describe("the skill: a page of diagrams (G17)", () => {
  test("the keys are not in the flow nor the drawing's description; View as list and Expand name their figure", async () => {
    const { page, context, errors } = await open();
    const nodes = await tree(page);
    assert.deepEqual(nodes.filter((n) => /Arrow keys|Home and End/.test(n.name)), []);
    const drawings = nodes.filter((n) => n.role === "group" && n.roledescription === "diagram");
    assert.equal(drawings.length, 4);
    for (const d of drawings) assert.doesNotMatch(d.description, /Arrow keys/);
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

  test("Tab, then an arrow, then out and in: the keys are the stop's description on each tab-in and on no card an arrow reaches", async () => {
    const { page, context, errors } = await open();
    for (const id of Object.keys(FIGS)) {
      const got = await tabArrowTab(page, id);
      // Each fixture's own keys (a kanban's say nothing of a trace: it has none).
      assert.ok(got.keys && got.keys.length > 20, `${id}: ${got.keys}`);
      assert.ok(["image", "link"].includes(got.tabIn?.role), `${id}: tabbing in, focus is on a card (${got.tabIn?.role})`);
      assert.equal(got.tabIn?.description, got.keys, `${id}: tabbing in`);
      assert.ok(got.moved, `${id}: an arrow moves the stop`);
      assert.equal(got.moved.description, "", `${id}: the card an arrow reaches`);
      assert.equal(got.again?.description, got.keys, `${id}: out and in again`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("the keys sentence is written from the measured layout, as React's: a drawn figure's keys are React's, word for word", async () => {
    const { page, context } = await open();
    const skill = await page.evaluate((P) => [...document.querySelectorAll(`figure.${P}`)].map((f) => [f.id, f.dataset.layout, f.querySelector(":scope > [id$='-keys']").textContent]), P);
    await context.close();
    const react = await reactFixture(browser, `import a from "./test/fixtures/cimip-diagrams-b.json"; import d from "./test/fixtures/diagrams-d1.json";
      createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}><h1>Figures</h1><B.ArchitectureDiagram id="fig-a" {...a.architecture} /><B.FlowchartDiagram id="fig-b" {...a.flowchart} /><B.KanbanDiagram id="fig-c" {...d.kanban} type={undefined} /><B.SequenceDiagram id="fig-d" {...a.sequence} /></main>);`,
    { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } });
    await react.page.waitForFunction(() => [...document.querySelectorAll("figure.basalt-diagram")].every((f) => f.dataset.layout === "drawn"));
    const fromReact = await react.page.evaluate(() => [...document.querySelectorAll("figure.basalt-diagram")].map((f) => [f.id, f.dataset.layout, f.querySelector(":scope > [id$='-keys']").textContent]));
    assert.deepEqual(skill, fromReact);
    await react.page.close();
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

// Every card-producing type (Astra's 4): a card's name begins with its visible name, an empty blueprint cell's with its word ("None"). axe's experimental
// label-content-name-mismatch is not asserted (the lead's ruling): it compares a card's whole visible text in screen order; the sentence is kept, and the
// card's words are not hidden from assistive technology, which would hide the signal and fix nothing for a speech user.
describe("the skill: every card's name begins with its visible name (Astra's 4)", () => {
  for (const width of [1104, 390]) {
    test(`at ${width}, every type`, async () => {
      const all = { ...A, ...D };
      delete all.$comment;
      const page0 = compose(`<title>Every</title><main style="max-width:${width}px;margin:0 auto;padding:16px">${Object.entries(all).map(([k, spec]) => `<figure class="diagram" id="fig-${k}"><script type="application/json" data-diagram>${JSON.stringify(spec).replace(/</g, "\\u003c")}</script></figure>`).join("")}</main>`).html;
      const { page, context, errors } = await openHtml(browser, page0, { scheme: "dark", width: width + 32 });
      await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout), P);
      const cards = await page.locator(`.${P}-node[aria-label]`).evaluateAll((els, P) => els.map((el) => {
        const shown = el.querySelector(`.${P}-name, .${P}-tname, .${P}-empty`);
        const norm = (t) => (t ?? "").replace(/\s+/g, " ").trim();
        return { fig: el.closest("figure").id, type: el.closest("figure").dataset.type, name: norm(el.getAttribute("aria-label")), shown: norm(shown?.textContent) };
      }), P);
      const types = new Set(cards.map((c) => c.type));
      for (const t of ["architecture", "flowchart", "data-flow", "sequence", "schema", "gantt", "kanban", "journey", "service-blueprint", "story-map", "schedule", "timeline", "state", "deployment"]) assert.ok(types.has(t), `${t} at ${width}`);
      assert.ok(cards.some((c) => c.type === "service-blueprint" && c.shown === "None"), "an empty blueprint cell is among them");
      for (const c of cards) {
        assert.ok(c.shown, `${c.fig}: a card shows its name (${c.name})`);
        assert.ok(c.name.startsWith(c.shown), `${c.fig}: "${c.name}" begins with "${c.shown}"`);
      }
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

describe("the skill: the viewer's outline", () => {
  test("the viewer's list is h3 under its h2, and a sequence's bands and frames h4", async () => {
    const { page, context, errors } = await open();
    const outline = async (id) => {
      await page.locator(`#${id} .${P}-expand`).click();
      await page.waitForSelector(`dialog.${P}-viewer[open] figure.${P}[data-layout]`);
      await page.locator(`dialog.${P}-viewer .${P}-viewer-end .${P}-toggle`).click();
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

describe("the list's heads match React's, whatever tag they are drawn as (cimip-gaps-3)", () => {
  // The skill's core types h1 to h4 by tag (tracking on h3, balance on h1 to h4); a list's heads are headings of whatever level the title sets, so a
  // figure with heading 2 (its heads h3) took h3's tracking in the skill and not in React, and so did the viewer's h3 heads. They inherit both now, as
  // React's do. The page's list and the viewer's, at heading 2 and 3.
  const read = (page, P) => page.evaluate((P) => [...document.querySelectorAll(`.${P}-list-head, .${P}-list-group`)].map((el) => {
    const cs = getComputedStyle(el);
    return `${el.closest("dialog") ? "viewer" : "page"} ${el.className.replace(/^.*-(list-\w+).*$/, "$1")} ${el.tagName} ${cs.letterSpacing} ${cs.textWrapMode} ${cs.textWrapStyle}`;
  }).map((s) => s.replace(/ H\d /, " ")), P);
  for (const heading of [2, 3]) {
    test(`heading ${heading}: the skill's heads compute React's letter-spacing and text-wrap, on the page and in the viewer`, async () => {
      const specs = { "fig-a": { ...A.architecture, heading }, "fig-d": { ...A.sequence, heading } };
      const skillHtml = compose(`<title>Heads</title><main style="max-width:1104px;margin:0 auto;padding:16px"><h1>Heads</h1>${Object.entries(specs).map(([id, spec]) => `<figure class="diagram" id="${id}"><script type="application/json" data-diagram>${JSON.stringify(spec).replace(/</g, "\\u003c")}</script></figure>`).join("")}</main>`).html;
      const skill = await openHtml(browser, skillHtml, { scheme: "dark", width: 1136 });
      const react = await reactFixture(browser, `import a from "./test/fixtures/cimip-diagrams-b.json";
        createRoot(document.getElementById("root")).render(<main style={{ width: 1104 }}><h1>Heads</h1><B.ArchitectureDiagram id="fig-a" {...a.architecture} heading={${heading}} /><B.SequenceDiagram id="fig-d" {...a.sequence} heading={${heading}} /></main>);`, { theme: "dark", standards: true, viewport: { width: 1136, height: 900 } });
      const both = [[skill.page, "diagram", (id) => `#${id} .diagram-expand`, "dialog.diagram-viewer .diagram-viewer-end .diagram-toggle"], [react.page, "basalt-diagram", (id) => `#${id} .basalt-diagram-expand`, "dialog.basalt-diagram-viewer .basalt-diagram-toggle"]];
      const got = [];
      for (const [page, P, expand, toggle] of both) {
        await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout), P);
        const lines = await read(page, P);
        for (const id of Object.keys(specs)) {
          await page.locator(expand(id)).click();
          await page.waitForSelector(`dialog.${P}-viewer[open] figure.${P}[data-layout]`);
          await page.locator(toggle).click();
          await page.waitForSelector(`dialog.${P}-viewer .${P}-viewer-list`);
          lines.push(...(await read(page, P)).filter((l) => l.startsWith("viewer")));
          await page.keyboard.press("Escape");
          await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
        }
        got.push(lines);
      }
      assert.ok(got[0].length > 6, JSON.stringify(got[0]));
      assert.deepEqual(got[0], got[1]);
      await skill.context.close();
      await react.page.close();
    });
  }
});
