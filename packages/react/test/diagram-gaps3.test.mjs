// A page of several diagrams (cimip-gaps-3, the console's log: G17) and the viewer's outline. G17: the keys sentence is never in the page's flow; it
// describes the card that holds the drawing's tab stop, so it is said as a reader tabs in, and not again on each arrow (the card an arrow reaches carries
// none, until focus leaves the figure). "View as list", "Expand" and the rest of Basalt's foot name their figure, the words shown leading the name
// (WCAG 2.5.3); an app's action is described by the title. Every card's name begins with its visible name, in every type (Astra's 4). The viewer's list
// sits under the dialog's h2: its sub-headings are h3 and its group lines h4, whatever the page's heading. G18 (a card's role) is held for a design
// round and is not tested here. In Chromium against the built package. Written while tests are paused (DECISIONS 359): not yet run by the suite; the
// probe of cimip-gaps-3/diagrams read the same pages. The G15 test is in content-policy.test.mjs.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

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
  const prop = (n, k) => n.properties?.find((p) => p.name === k)?.value?.value;
  return nodes.filter((n) => !n.ignored).map((n) => ({ role: v(n, "role"), name: v(n, "name"), description: v(n, "description"), roledescription: prop(n, "roledescription") ?? "", focused: Boolean(prop(n, "focused")) }));
}
/** What the focused element is named and described by, from the accessibility tree. */
const focused = async (page) => (await tree(page)).find((n) => n.focused) ?? null;
/**
 * Tab into a figure from a button placed just before it, then an arrow that moves the stop, then out and in again: what the tree says each time. The
 * arrow tried is the first of → ↓ that moves focus (a kanban's cards go down a column).
 */
async function tabArrowTab(page, id, P) {
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
  const again = await focused(page);
  return { keys, tabIn, moved, again, inCard: await page.evaluate((P) => Boolean(document.activeElement?.matches(`.${P}-node`)), P) };
}
const title = (page, id) => page.locator(`#${id} .${P}-title`).innerText();

describe("a page of diagrams (G17)", () => {
  test("the keys sentence is not in the page's flow; the drawing is described by its summary alone, and the hint on screen is hidden", async () => {
    const { page, errors } = await threePage();
    const nodes = await tree(page);
    assert.deepEqual(nodes.filter((n) => /Arrow keys|Home and End/.test(n.name)), [], "no text node says the keys");
    assert.deepEqual(nodes.filter((n) => n.role === "StaticText" && /^(the ends|clear|Esc)$/.test(n.name)), [], "the hint's words are not read");
    const drawings = nodes.filter((n) => n.role === "group" && n.roledescription === "diagram");
    assert.equal(drawings.length, 4);
    for (const d of drawings) assert.doesNotMatch(d.description, /Arrow keys/, `${d.name}: the keys are not the drawing's, so they are not said twice on tab-in`);
    assert.deepEqual(await page.locator(`.${P} [id$="-keys"]`).evaluateAll((els) => els.map((el) => el.hidden)), [true, true, true, true]);
    assert.deepEqual(await page.locator(`.${P}-hint`).evaluateAll((els) => els.map((el) => el.getAttribute("aria-hidden"))), ["true", "true", "true", "true"]);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("Tab, then an arrow, then out and in: the keys are the stop's description on each tab-in and on no card an arrow reaches", async () => {
    const { page, errors } = await threePage();
    for (const id of ["fig-a", "fig-b", "fig-c", "fig-d"]) {
      const got = await tabArrowTab(page, id, P);
      // Each fixture's own keys (a kanban's say nothing of a trace: it has none).
      assert.ok(got.keys && got.keys.length > 20, `${id}: the figure has a keys sentence (${got.keys})`);
      assert.equal(got.tabIn?.description, got.keys, `${id}: tabbing in, the card is described by the keys`);
      assert.ok(got.moved, `${id}: an arrow moves the stop`);
      assert.equal(got.moved.description, "", `${id}: the card an arrow reaches is not described by them again`);
      assert.equal(got.inCard, true);
      assert.equal(got.again?.description, got.keys, `${id}: out and in again, they are said again`);
    }
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

// Every card-producing type (Astra's 4, the lead's ruling on label-content-name-mismatch): a card's name begins with its visible name, what a speech user
// says and voice control matches; an empty blueprint cell's is its word ("None"). axe's experimental label-content-name-mismatch compares a card's whole
// visible text in screen order and is not asserted: the sentence is kept, and the card's words are not hidden from assistive technology.
const EVERY = `
import a from "./test/fixtures/cimip-diagrams-b.json";
import d from "./test/fixtures/diagrams-d1.json";
const ALL = { ...a, ...d };
delete ALL.$comment;
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram,
  gantt: B.GanttDiagram, kanban: B.KanbanDiagram, journey: B.JourneyDiagram, "service-blueprint": B.ServiceBlueprintDiagram, "story-map": B.StoryMapDiagram,
  schedule: B.ScheduleDiagram, timeline: B.TimelineDiagram, state: B.StateDiagram, deployment: B.DeploymentDiagram };
createRoot(document.getElementById("root")).render(<main style={{ width: window.__width }}>{Object.entries(ALL).map(([k, { type, ...props }]) => { const X = C[type]; return <X key={k} id={"fig-" + k} {...props} />; })}</main>);`;
/** Each card's name and visible name: its name line, a table's name, or an empty cell's word. */
const cardNames = (page, P) => page.locator(`.${P}-node[aria-label]`).evaluateAll((els, P) => els.map((el) => {
  const shown = el.querySelector(`.${P}-name, .${P}-tname, .${P}-empty`);
  const norm = (t) => (t ?? "").replace(/\s+/g, " ").trim();
  return { fig: el.closest("figure").id, type: el.closest("figure").dataset.type, name: norm(el.getAttribute("aria-label")), shown: norm(shown?.textContent) };
}), P);

describe("every card's name begins with its visible name (Astra's 4)", () => {
  for (const width of [1104, 390]) {
    test(`at ${width}, every type`, async () => {
      const { page, errors } = await fixturePage(browser, `window.__width = ${width};${EVERY}`, { theme: "dark", standards: true, viewport: { width: width + 32, height: 900 } });
      await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout), P);
      await frames(page);
      const cards = await cardNames(page, P);
      const types = new Set(cards.map((c) => c.type));
      for (const t of ["architecture", "flowchart", "data-flow", "sequence", "schema", "gantt", "kanban", "journey", "service-blueprint", "story-map", "schedule", "timeline", "state", "deployment"]) assert.ok(types.has(t), `${t} has named cards at ${width}`);
      assert.ok(cards.some((c) => c.type === "service-blueprint" && c.shown === "None"), "an empty blueprint cell is among them");
      for (const c of cards) {
        assert.ok(c.shown, `${c.fig}: a card shows its name (${c.name})`);
        assert.ok(c.name.startsWith(c.shown), `${c.fig}: "${c.name}" begins with "${c.shown}"`);
      }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
});

describe("the viewer's outline", () => {
  for (const heading of [3, 5]) {
    test(`with the page's heading ${heading}, the viewer's list is h3 under its h2, and a sequence's bands and frames h4`, async () => {
      const { page, errors } = await threePage(heading);
      const outline = async (id) => {
        await page.locator(`#${id} .${P}-expand`).click();
        await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
        await page.locator(`dialog.${P}-viewer .${P}-viewer-end .${P}-toggle`).click();
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
