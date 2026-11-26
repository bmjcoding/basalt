// G18 of cimip-gaps-3 (DECISIONS 392): what a diagram card is. Where a layout traces, a card is a toggle button whose press holds its trace (or a native
// link); where nothing traces it is a picture, and no card is a stop. The held card carries the horizontal tab's underline (a decision's under its words,
// the decider's answer 2). Section 7's list, in order: the axe acceptance; one press is one change for Enter, Space and click; Space does not scroll and
// cancels on blur; the precedence; each Esc row; data-touch is not set by a mouse or keys; planning figures have no tabindex="0"; a resize under focus; the
// mark's size and ink on each shape and in forced colours; the decision's mark (2px on two sizes, its words' width, inside the contour, the diamond
// unchanged); and the viewer's Esc words (the decider's answer 1). In Chromium against the built package. Written while tests are paused (DECISIONS 359):
// not yet run. The skill's share is tools/html-skill/test/diagram-hold.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { contrast, fixturePage, launch, pixels } from "./support.mjs";

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const P = "basalt-diagram";
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page, n = 4) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
// Every type, from the two fixture files, each in a figure of its own (`fig-<key>`). The automatic ones place on load (elkjs, on demand).
const KEYS = { architecture: "a", flowchart: "a", dataFlow: "a", sequence: "a", schema: "a", textSequence: "a", gantt: "d", kanban: "d", journey: "d", blueprint: "d", storyMap: "d", schedule: "d", timeline: "d", state: "d", deployment: "d" };
const EVERY = `
import a from "./test/fixtures/cimip-diagrams-b.json";
import d from "./test/fixtures/diagrams-d1.json";
const KEYS = ${JSON.stringify(KEYS)};
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram,
  gantt: B.GanttDiagram, kanban: B.KanbanDiagram, journey: B.JourneyDiagram, "service-blueprint": B.ServiceBlueprintDiagram, "story-map": B.StoryMapDiagram,
  schedule: B.ScheduleDiagram, timeline: B.TimelineDiagram, state: B.StateDiagram, deployment: B.DeploymentDiagram };
const ALL = { a, d };
createRoot(document.getElementById("root")).render(<main style={{ width: window.__width }}>
  <button id="before">Before</button>
  {Object.entries(KEYS).map(([k, from]) => { const { type, ...props } = ALL[from][k]; const X = C[type]; return <X key={k} id={"fig-" + k} {...props} />; })}
  <button id="after">After</button>
  <div style={{ height: 3000 }} />
</main>);`;
async function every({ width = 1104, theme = "dark", ...options } = {}) {
  const { page, errors } = await fixturePage(browser, `window.__width = ${width};${EVERY}`, { theme, standards: true, viewport: { width: width + 32, height: 900 }, ...options });
  await page.waitForFunction((P) => [...document.querySelectorAll(`figure.${P}`)].every((f) => f.dataset.layout), P);
  await frames(page);
  return { page, errors };
}
const fig = (key) => `#fig-${key}`;
const card = (key, id) => `${fig(key)} .${P}-node[data-node="${id}"]`;
const pressed = (page, sel) => page.locator(sel).getAttribute("aria-pressed");
/** The lit lines of a figure, as their indices. */
const lit = (page, key) => page.locator(`${fig(key)} .${P}-edge[data-lit]`).evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-edge"))).sort((x, y) => x - y));
/** The lines a card traces, from the fixture's own edges. */
const linesOf = (edges, id) => edges.map((e, i) => (e.from === id || e.to === id ? i : -1)).filter((i) => i >= 0);
const A = JSON.parse(fs.readFileSync(new URL("./fixtures/cimip-diagrams-b.json", import.meta.url), "utf8"));
/** Counts each change of a card's aria-pressed from now on. */
const watchPressed = (page, sel) => page.locator(sel).evaluate((el) => { window.__changes = 0; new MutationObserver((list) => { window.__changes += list.filter((r) => r.attributeName === "aria-pressed").length; }).observe(el, { attributes: true }); });
const changes = (page) => page.evaluate(() => window.__changes);

describe("the axe acceptance (DECISIONS 392, 6)", () => {
  const RULES = ["focus-order-semantics", "aria-allowed-attr", "aria-allowed-role", "nested-interactive", "aria-required-children", "aria-required-parent"];
  const run = async (page, selector) => {
    if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ content: axeSource });
    return page.evaluate(([rules, selector]) => window.axe.run(selector, { runOnly: { type: "rule", values: rules }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), [RULES, selector]);
  };
  for (const theme of ["dark", "light"]) for (const width of [1104, 390]) {
    test(`${theme}, at ${width} (drawn and stacked): every type is clean, a card held and not`, async () => {
      const { page, errors } = await every({ width, theme });
      assert.deepEqual(await run(page, "main"), [], "at rest");
      // A held card in each figure that traces.
      for (const key of Object.keys(KEYS)) {
        const toggle = page.locator(`${fig(key)} .${P}-node[aria-pressed]`).first();
        if (await toggle.count()) await toggle.click();
      }
      await frames(page);
      assert.deepEqual(await run(page, "main"), [], "with a card held in each figure that traces");
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
  test("the cards in the open viewer are clean, for a figure that traces and one that does not", async () => {
    const { page, errors } = await every();
    for (const key of ["architecture", "flowchart", "kanban", "timeline"]) {
      await page.locator(`${fig(key)} .${P}-expand`).click();
      await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
      await frames(page);
      assert.deepEqual(await run(page, `dialog.${P}-viewer .${P}-drawing`), [], key);
      await page.keyboard.press("Escape");
      await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    }
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("a traced card is a toggle button, and a press is one change (DECISIONS 392, 1 and 4)", () => {
  test("roles: a toggle card is role=button with aria-pressed and no role description; a linked card is a link with no aria-pressed", async () => {
    const { page } = await every();
    const read = (sel) => page.locator(sel).evaluate((el) => ({ tag: el.tagName, role: el.getAttribute("role"), pressed: el.getAttribute("aria-pressed"), rd: el.getAttribute("aria-roledescription"), tab: el.getAttribute("tabindex") }));
    assert.deepEqual(await read(card("architecture", "browser")), { tag: "DIV", role: "button", pressed: "false", rd: null, tab: (await page.locator(card("architecture", "browser")).getAttribute("tabindex")) });
    const link = await read(card("architecture", "svc"));
    assert.equal(link.tag, "A");
    assert.equal(link.role, null);
    assert.equal(link.pressed, null, "a link is never held");
    assert.ok(["0", "-1"].includes(link.tab), "a link is in the roving set");
    assert.equal(await page.locator(`${fig("architecture")} .${P}-node[tabindex="0"]`).count(), 1, "one stop");
    await page.close();
  });

  test("Enter acts on keydown once (not on repeat, not with a modifier); Space on keyup; a click once; keys never dispatch a click", async () => {
    const { page, errors } = await every();
    const sel = card("architecture", "browser");
    await page.locator(sel).focus();
    await watchPressed(page, sel);
    await page.evaluate((sel) => { window.__clicks = 0; document.querySelector(sel).addEventListener("click", () => { window.__clicks++; }); }, sel);
    await page.keyboard.down("Enter");
    await page.keyboard.down("Enter"); // a repeat
    await page.keyboard.up("Enter");
    await frames(page, 2);
    assert.equal(await pressed(page, sel), "true");
    assert.equal(await changes(page), 1, "Enter: one change, the repeat ignored");
    for (const mod of ["Control", "Meta", "Alt"]) await page.keyboard.press(`${mod}+Enter`);
    await frames(page, 2);
    assert.equal(await changes(page), 1, "Enter with a modifier does nothing");
    await page.keyboard.down("Space");
    await frames(page, 2);
    assert.equal(await pressed(page, sel), "true", "Space waits for its keyup");
    await page.keyboard.up("Space");
    await frames(page, 2);
    assert.equal(await pressed(page, sel), "false");
    assert.equal(await changes(page), 2, "Space: one change");
    assert.equal(await page.evaluate(() => window.__clicks), 0, "the keys dispatched no click");
    await page.locator(sel).click();
    await frames(page, 2);
    assert.equal(await pressed(page, sel), "true");
    assert.equal(await changes(page), 3, "a click: one change");
    // Another card moves the hold; the held card's second press releases it.
    await page.locator(card("architecture", "alb")).click();
    await frames(page, 2);
    assert.equal(await pressed(page, sel), "false");
    assert.equal(await pressed(page, card("architecture", "alb")), "true");
    assert.equal(await page.locator(`${fig("architecture")} [data-held]`).count(), 1, "one card at most is held");
    await page.locator(card("architecture", "alb")).click();
    await frames(page, 2);
    assert.equal(await page.locator(`${fig("architecture")} [data-held]`).count(), 0);
    // The ground releases a hold, and otherwise does nothing.
    await page.locator(sel).click();
    const box = await page.locator(`${fig("architecture")} .${P}-drawing`).boundingBox();
    await page.mouse.click(box.x + 2, box.y + box.height - 2);
    await frames(page, 2);
    assert.equal(await pressed(page, sel), "false", "the ground released it");
    await page.mouse.click(box.x + 2, box.y + box.height - 2);
    assert.equal(await page.locator(`${fig("architecture")} [data-held]`).count(), 0, "the ground with nothing held does nothing");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a click that ends a text selection in a card does not press it", async () => {
    const { page } = await every();
    const sel = card("architecture", "browser");
    const box = await page.locator(`${sel} .${P}-name`).boundingBox();
    await page.mouse.move(box.x + 1, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
    assert.ok((await page.evaluate(() => getSelection().toString())).length > 0, "the words are selected");
    assert.equal(await pressed(page, sel), "false");
    await page.close();
  });

  test("Space ignores Ctrl, Meta and Alt and leaves them unprevented, a keyup with one down cancels an armed press, and Shift+Space and Shift+Enter press", async () => {
    const { page } = await every();
    const sel = card("architecture", "browser");
    await page.locator(sel).focus();
    await watchPressed(page, sel);
    await page.evaluate(() => { window.__prevented = []; document.addEventListener("keydown", (e) => { if (e.key === " ") window.__prevented.push(e.defaultPrevented); }); });
    for (const mod of ["Control", "Meta", "Alt"]) await page.keyboard.press(`${mod}+Space`);
    await frames(page, 2);
    assert.equal(await changes(page), 0, "Ctrl, Meta and Alt with Space change nothing");
    assert.deepEqual(await page.evaluate(() => window.__prevented), [false, false, false], "and are not prevented");
    // Armed, then a modifier goes down before the keyup: cancelled.
    await page.keyboard.down("Space");
    await page.keyboard.down("Control");
    await page.keyboard.up("Space");
    await page.keyboard.up("Control");
    await frames(page, 2);
    assert.equal(await changes(page), 0, "a keyup with Ctrl down cancels the armed press");
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.press("Shift+Space");
    await frames(page, 2);
    assert.equal(await changes(page), 1, "Shift+Space presses once");
    assert.equal(await page.evaluate(() => scrollY), y, "without scrolling");
    assert.equal(await pressed(page, sel), "true");
    await page.keyboard.press("Shift+Enter");
    await frames(page, 2);
    assert.equal(await changes(page), 2, "Shift+Enter presses");
    assert.equal(await pressed(page, sel), "false");
    await page.close();
  });

  test("Space does not scroll the page, and a blur between its keydown and keyup cancels it", async () => {
    const { page } = await every();
    const sel = card("architecture", "browser");
    await page.locator(sel).focus();
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.down("Space");
    await page.locator(sel).evaluate((el) => el.blur());
    await page.keyboard.up("Space");
    await frames(page, 2);
    assert.equal(await page.evaluate(() => scrollY), y, "Space did not scroll");
    assert.equal(await pressed(page, sel), "false", "the blur cancelled it");
    // Focus moving (an arrow while Space is down) cancels it too.
    await page.locator(sel).focus();
    await page.keyboard.down("Space");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.up("Space");
    await frames(page, 2);
    assert.equal(await page.locator(`${fig("architecture")} [data-held]`).count(), 0, "focus moving cancelled it");
    await page.close();
  });

  test("the precedence: focus, then hover, then the held card; a peek shows over the hold, and the hold returns after", async () => {
    const { page } = await every();
    const edges = A.architecture.edges;
    const away = () => page.mouse.move(2, 2);
    await page.locator(card("architecture", "browser")).click();
    await away();
    await frames(page, 2);
    assert.deepEqual(await lit(page, "architecture"), linesOf(edges, "browser"), "held, nothing else: the hold");
    await page.keyboard.press("ArrowRight");
    await frames(page, 2);
    const c = await page.evaluate(() => document.activeElement?.dataset.node);
    assert.ok(c && c !== "browser", "the arrow moved focus");
    assert.deepEqual(await lit(page, "architecture"), linesOf(edges, c), "focus shows over the hold");
    const b = ["sys", "cw", "aurora", "s3"].find((id) => id !== c);
    await page.locator(card("architecture", b)).hover();
    await frames(page, 2);
    assert.deepEqual(await lit(page, "architecture"), linesOf(edges, c), "focus shows over hover");
    await page.evaluate(() => document.activeElement.blur());
    await frames(page, 2);
    assert.deepEqual(await lit(page, "architecture"), linesOf(edges, b), "hover shows over the hold");
    await away();
    await frames(page, 2);
    assert.deepEqual(await lit(page, "architecture"), linesOf(edges, "browser"), "the hold returns");
    assert.equal(await pressed(page, card("architecture", "browser")), "true", "and it survived focus and the pointer leaving");
    // It survives "View as list" too.
    await page.locator(`${fig("architecture")} .${P}-toggle`).click();
    await page.locator(`${fig("architecture")} .${P}-toggle`).click();
    assert.equal(await pressed(page, card("architecture", "browser")), "true", "and the list");
    await page.close();
  });
});

describe("Esc (DECISIONS 392, 4)", () => {
  const listen = (page) => page.evaluate(() => { window.__esc = []; document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.__esc.push(e.defaultPrevented); }); });
  const heard = (page) => page.evaluate(() => window.__esc);
  test("focus on a card with a hold up: Esc clears focus trace, hover and hold, focus stays, and the key goes no further", async () => {
    const { page } = await every();
    await listen(page);
    await page.locator(card("architecture", "browser")).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Escape");
    await frames(page, 2);
    assert.equal(await page.locator(`${fig("architecture")} [data-held]`).count(), 0);
    assert.equal(await page.locator(fig("architecture")).evaluate((f) => f.hasAttribute("data-tracing")), false);
    assert.ok(await page.evaluate((P) => document.activeElement?.matches(`#fig-architecture .${P}-node`), P), "focus stays");
    assert.deepEqual(await heard(page), [], "stopped");
    await page.close();
  });
  test("focus on a card with nothing up: Esc bubbles", async () => {
    const { page } = await every();
    await listen(page);
    // Pressed twice (held, then released) by the mouse: the card has focus that is not :focus-visible, and the pointer leaves it.
    await page.locator(card("architecture", "browser")).click();
    await page.locator(card("architecture", "browser")).click();
    await page.mouse.move(2, 2);
    await frames(page, 2);
    assert.equal(await page.locator(fig("architecture")).evaluate((f) => f.hasAttribute("data-tracing")), false, "nothing is up");
    await page.keyboard.press("Escape");
    assert.deepEqual(await heard(page), [false], "it bubbled, not prevented");
    await page.close();
  });
  test("a hold up and focus on a foot control or in the list: Esc releases it and stops; with no hold it bubbles; focus outside the figure leaves the hold", async () => {
    const { page } = await every();
    await listen(page);
    await page.locator(card("architecture", "browser")).click();
    await page.locator(`${fig("architecture")} .${P}-toggle`).focus();
    await page.keyboard.press("Escape");
    await frames(page, 2);
    assert.equal(await page.locator(`${fig("architecture")} [data-held]`).count(), 0, "the foot's Esc released it");
    assert.deepEqual(await heard(page), [], "and stopped");
    assert.ok(await page.evaluate((P) => document.activeElement?.matches(`#fig-architecture .${P}-toggle`), P), "focus stays");
    await page.keyboard.press("Escape");
    assert.deepEqual(await heard(page), [false], "with no hold it bubbles");
    await page.locator(card("architecture", "browser")).click();
    await page.locator("#after").focus();
    await page.keyboard.press("Escape");
    await frames(page, 2);
    assert.equal(await pressed(page, card("architecture", "browser")), "true", "outside the figure, the hold stays");
    await page.close();
  });

  const HOST = `
import a from "./test/fixtures/cimip-diagrams-b.json";
function Host() {
  const [open, setOpen] = React.useState(false);
  const { type, ...FIG } = a.flowchart;
  return (
    <B.Dialog open={open} onOpenChange={setOpen}>
      <B.DialogTrigger id="trigger">Open</B.DialogTrigger>
      <B.DialogContent form size="wide" id="parent"><B.SheetHeader closeLabel="Close"><B.DialogTitle>Document</B.DialogTitle></B.SheetHeader><B.SheetBody><B.FlowchartDiagram id="fig" {...FIG} /></B.SheetBody></B.DialogContent>
    </B.Dialog>
  );
}
createRoot(document.getElementById("root")).render(<Host />);`;
  test("in a Dialog: the first Esc releases the hold and the Dialog stays open; the next closes it", async () => {
    const { page, errors } = await fixturePage(browser, HOST, { theme: "dark", standards: true, viewport: { width: 1440, height: 900 } });
    await page.locator("#trigger").click();
    await page.waitForSelector("#parent[data-open]");
    await page.waitForSelector("#fig[data-layout]");
    await frames(page);
    const toggle = page.locator(`#fig .${P}-node[aria-pressed]`).first();
    await toggle.click();
    await page.mouse.move(2, 2);
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Escape");
    await frames(page, 2);
    assert.equal(await toggle.getAttribute("aria-pressed"), "false", "the first Esc released it");
    assert.ok(await page.locator("#parent[data-open]").count(), "the Dialog is open");
    await page.keyboard.press("Escape");
    await page.waitForSelector("#parent", { state: "detached" });
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the viewer: Esc always closes, held or not; focus returns to Expand; the page's hold is unchanged; the viewer opens with nothing held", async () => {
    const { page, errors } = await every();
    await page.locator(card("architecture", "browser")).click();
    const expand = page.locator(`${fig("architecture")} .${P}-expand`);
    await expand.click();
    const v = `dialog.${P}-viewer`;
    await page.waitForSelector(`${v}[open] .${P}[data-layout]`);
    await frames(page);
    assert.equal(await page.locator(`${v} [data-held]`).count(), 0, "it opens with nothing held");
    await page.locator(`${v} .${P}-node[data-node="alb"]`).click();
    await frames(page, 2);
    assert.equal(await page.locator(`${v} .${P}-node[data-node="alb"]`).getAttribute("aria-pressed"), "true", "a press holds in the viewer");
    await page.keyboard.press("Escape");
    await page.waitForSelector(v, { state: "detached" });
    assert.ok(await page.evaluate((P) => document.activeElement?.matches(`#fig-architecture .${P}-expand`), P), "focus returns to Expand");
    assert.equal(await pressed(page, card("architecture", "browser")), "true", "the page's hold is unchanged");
    assert.equal(await pressed(page, card("architecture", "alb")), "false", "the viewer's hold ended with it");
    await expand.click();
    await page.waitForSelector(`${v}[open] .${P}[data-layout]`);
    assert.equal(await page.locator(`${v} [data-held]`).count(), 0, "it opens again with nothing held");
    await page.keyboard.press("Escape");
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("the words: the keys sentence and the hints (DECISIONS 392, 1, and the decider's answer 1)", () => {
  test("the page figure: the keys sentence says Enter or Space keeps the highlight and Esc clears it; the hint has Space before Esc clear", async () => {
    const { page } = await every();
    const keys = await page.locator(`${fig("architecture")} > [id$="-keys"]`).textContent();
    assert.match(keys, /; Home and End go to the ends; Enter or Space keeps the highlight on a part, and again releases it; Escape clears the highlight\./);
    assert.match(keys, /Enter opens a part that is a link\.$/);
    assert.match(await page.locator(`${fig("schedule")} > [id$="-keys"]`).textContent(), /keeps the highlight on a task, and again/);
    const hint = await page.locator(`${fig("architecture")} > .${P}-hint > span`).allInnerTexts();
    const words = hint.map((t) => t.replace(/\s+/g, " ").trim());
    assert.ok(words.indexOf("Space keep the highlight") >= 0 && words.indexOf("Space keep the highlight") === words.indexOf("Esc clear") - 1, JSON.stringify(words));
    await page.close();
  });
  test("the viewer: its keys sentence says Escape closes the viewer and never clears; its hint has one Esc, close, after Space, + −, 0", async () => {
    const { page } = await every();
    await page.locator(`${fig("architecture")} .${P}-expand`).click();
    const v = `dialog.${P}-viewer`;
    await page.waitForSelector(`${v}[open] .${P}[data-layout]`);
    const keys = await page.locator(`${v} .${P} > [id$="-keys"]`).textContent();
    assert.match(keys, /Escape closes the viewer\.$/);
    assert.doesNotMatch(keys, /clears/);
    assert.match(keys, /Enter or Space keeps the highlight on a part, and again releases it\./);
    const words = (await page.locator(`${v} .${P}-viewer-hint > span`).allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
    assert.deepEqual(words.filter((w) => w.startsWith("Esc")), ["Esc close"], JSON.stringify(words));
    assert.deepEqual(words.slice(-4), ["Space keep the highlight", "+ − zoom", "0 fit", "Esc close"]);
    await page.keyboard.press("Escape");
    await page.close();
  });
});

describe("data-touch and Clear highlight (DECISIONS 392, 4 and 5)", () => {
  test("a mouse press and the keys never set data-touch, and there is no Clear highlight on desktop", async () => {
    const { page } = await every();
    await page.locator(card("architecture", "browser")).click();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await frames(page, 2);
    assert.equal(await page.locator(`${fig("architecture")}[data-touch]`).count(), 0);
    assert.equal(await page.locator(`.${P}-clear`).count(), 0, "no Clear highlight on desktop");
    await page.close();
  });
  test("on touch: a tap holds and marks data-touch; Clear highlight is last, aria-disabled until a card is held; with focus as the layout stops tracing it stays until focus leaves", async () => {
    const { page } = await every({ hasTouch: true, isMobile: true });
    const clear = page.locator(`${fig("schema")} .${P}-clear`);
    assert.equal(await page.locator(fig("schema")).getAttribute("data-layout"), "drawn");
    assert.equal(await clear.getAttribute("aria-disabled"), "true");
    const t = page.locator(`${fig("schema")} .${P}-node[aria-pressed]`).first();
    await t.tap();
    await frames(page, 2);
    assert.equal(await t.getAttribute("aria-pressed"), "true");
    assert.equal(await clear.getAttribute("aria-disabled"), null);
    assert.equal(await page.locator(`${fig("schema")} .${P}-foot > :last-child`).evaluate((el, P) => el.classList.contains(`${P}-clear`), P), true, "last in the foot");
    await clear.focus();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector("#fig-schema").dataset.layout === "stacked");
    await frames(page);
    assert.equal(await clear.count(), 1, "it stays while it has focus");
    assert.equal(await clear.getAttribute("aria-disabled"), "true", "disabled: the hold was released");
    await page.locator("#after").focus();
    await frames(page, 2);
    assert.equal(await clear.count(), 0, "gone once focus leaves");
    // No Clear highlight on a planning figure.
    assert.equal(await page.locator(`${fig("kanban")} .${P}-clear, ${fig("gantt")} .${P}-clear, ${fig("timeline")} .${P}-clear`).count(), 0);
    await page.close();
  });
});

describe("planning figures and a resize under focus (DECISIONS 392, 3)", () => {
  for (const width of [1104, 390]) {
    test(`at ${width}: a figure that does not trace has no stop, no key hint and pictures for cards; its links are in the page's tab order`, async () => {
      const { page } = await every({ width });
      for (const key of ["gantt", "kanban", "journey", "storyMap", "timeline"]) {
        const got = await page.locator(fig(key)).evaluate((f, P) => ({
          zero: f.querySelectorAll(`.${P}-node[tabindex="0"]`).length,
          tabindex: f.querySelectorAll(`.${P}-node[tabindex]`).length,
          pressed: f.querySelectorAll(`.${P}-node[aria-pressed]`).length,
          unlinked: [...f.querySelectorAll(`div.${P}-node`)].every((n) => n.getAttribute("role") === "img" && n.getAttribute("aria-label")),
          hint: f.querySelector(`:scope > .${P}-hint`).hidden && getComputedStyle(f.querySelector(`:scope > .${P}-hint`)).display === "none",
          stops: f.querySelector(`.${P}-drawing`).hasAttribute("data-stops"),
        }), P);
        assert.deepEqual(got, { zero: 0, tabindex: 0, pressed: 0, unlinked: true, hint: true, stops: false }, key);
      }
      // A blueprint traces only where its arrows are drawn; a stacked schedule draws no lines.
      const bp = await page.locator(`${fig("blueprint")} .${P}-node[aria-pressed]`).count();
      if (width === 390) assert.equal(bp, 0, "a stacked blueprint has no toggles");
      if (width === 390) assert.equal(await page.locator(`${fig("schedule")} .${P}-node[tabindex="0"]`).count(), 0, "a stacked schedule has no stop");
      await page.close();
    });
  }
  test("a focused card whose layout stops tracing keeps focus as a picture (tabindex -1, no aria-pressed, the hold released) until focus leaves; back, the stop appears and focus does not move", async () => {
    const { page } = await every();
    const t = page.locator(`${fig("schema")} .${P}-node[aria-pressed]`).first();
    const id = await t.getAttribute("data-node");
    const sel = card("schema", id);
    await t.click();
    assert.equal(await pressed(page, sel), "true");
    await page.setViewportSize({ width: 422, height: 900 });
    await page.waitForFunction(() => document.querySelector("#fig-schema").dataset.layout === "stacked");
    await frames(page);
    const kept = await page.locator(sel).evaluate((el) => ({ focused: document.activeElement === el, role: el.getAttribute("role"), tab: el.getAttribute("tabindex"), pressed: el.getAttribute("aria-pressed"), held: el.hasAttribute("data-held") }));
    assert.deepEqual(kept, { focused: true, role: "img", tab: "-1", pressed: null, held: false });
    await page.setViewportSize({ width: 1136, height: 900 });
    await page.waitForFunction(() => document.querySelector("#fig-schema").dataset.layout === "drawn");
    await frames(page);
    const back = await page.locator(sel).evaluate((el) => ({ focused: document.activeElement === el, role: el.getAttribute("role"), tab: el.getAttribute("tabindex"), pressed: el.getAttribute("aria-pressed") }));
    assert.deepEqual(back, { focused: true, role: "button", tab: "0", pressed: "false" }, "the stop appeared on the focused card; the hold stayed released");
    // Narrowed again and left: it stops being focusable.
    await page.setViewportSize({ width: 422, height: 900 });
    await page.waitForFunction(() => document.querySelector("#fig-schema").dataset.layout === "stacked");
    await page.locator("#after").focus();
    await frames(page, 2);
    assert.equal(await page.locator(sel).getAttribute("tabindex"), null, "no longer a stop once focus left");
    await page.close();
  });
});

// The held mark (DECISIONS 392, 2, and the decider's answer 2): size-indicator tall, the content's width, primary ink or the focal card's own; a decision's
// under its words.
const SHAPES = [
  ["box", "architecture", "browser"], ["focal", "flowchart", "risk"], ["terminal", "flowchart", "req"], ["decision", "flowchart", "who"],
  ["participant", "sequence", "marcus"], ["table", "schema", null], ["schedule", "schedule", null], ["state", "state", null], ["host", "deployment", "api"],
];
const markOf = (page, sel) => page.locator(sel).evaluate((el, P) => {
  const decision = el.dataset.shape === "decision";
  const on = decision ? el.querySelector(`.${P}-words`) : el.dataset.shape === "terminal" ? el.querySelector(`.${P}-cap`) : el;
  const cs = getComputedStyle(on, "::after");
  const sys = (value) => { const i = document.createElement("i"); i.style.color = value; el.append(i); const c = getComputedStyle(i).color; i.remove(); return c; };
  const terminal = el.dataset.shape === "terminal";
  // space-3, or a terminal's larger of space-5 and its inner radius (half its padding box's height: the picture review).
  const inset = terminal ? Math.max(20, el.clientHeight / 2) : 12;
  return {
    height: Number.parseFloat(cs.height), width: Number.parseFloat(cs.width), opacity: cs.opacity, bg: cs.backgroundColor,
    want: decision ? on.getBoundingClientRect().width : el.clientWidth - 2 * inset,
    ink: sys(el.hasAttribute("data-focal") ? "var(--basalt-diagram-focal-ink)" : "var(--basalt-text-primary)"),
    highlight: sys("Highlight"), canvas: sys("Canvas"), focal: el.hasAttribute("data-focal"),
  };
}, P);
async function holdEach(page) {
  const out = [];
  for (const [shape, key, id] of SHAPES) {
    const sel = id ? card(key, id) : `${fig(key)} .${P}-node[aria-pressed]`;
    const el = page.locator(sel).first();
    assert.equal(await el.getAttribute("aria-pressed"), "false", `${shape}: a toggle card at 1104`);
    await el.click();
    out.push([shape, el]);
  }
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  return out;
}
describe("the held mark", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: on each shape it is 2px, the content's width, and primary ink (the focal card's own ink on the focal card)`, async () => {
      const { page } = await every({ theme });
      for (const [shape, el] of await holdEach(page)) {
        const m = await markOf(page, await el.evaluate((n) => `#${n.closest("figure").id} [data-node="${CSS.escape(n.dataset.node)}"]`));
        assert.equal(m.height, 2, `${shape}: size-indicator`);
        assert.ok(Math.abs(m.width - m.want) < 0.5, `${shape}: ${m.width} wide, its content ${m.want}`);
        assert.equal(m.opacity, "1", `${shape}: shown`);
        assert.equal(m.bg, m.ink, `${shape}: its ink`);
      }
      await page.close();
    });
  }
  test("forced colours: Highlight, Canvas on the focal card", async () => {
    const { page } = await every({ forcedColors: "active" });
    for (const [shape, el] of await holdEach(page)) {
      const m = await markOf(page, await el.evaluate((n) => `#${n.closest("figure").id} [data-node="${CSS.escape(n.dataset.node)}"]`));
      assert.equal(m.bg, m.focal ? m.canvas : m.highlight, shape);
    }
    await page.close();
  });
  test("a card not held draws no mark, and holding moves nothing: the card's box and every route stay", async () => {
    const { page } = await every();
    const boxes = () => page.locator(`${fig("flowchart")} .${P}-node`).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    const routes = () => page.locator(`${fig("flowchart")} .${P}-line`).evaluateAll((els) => els.map((el) => el.getAttribute("d")));
    const [b0, r0] = [await boxes(), await routes()];
    assert.equal((await markOf(page, card("flowchart", "req"))).opacity, "0");
    await page.locator(card("flowchart", "req")).click();
    await page.waitForTimeout(400);
    assert.deepEqual(await boxes(), b0);
    assert.deepEqual(await routes(), r0);
    await page.close();
  });
});

describe("a decision's mark (the decider's answer 2 and the picture review)", () => {
  /** The mark's place and the diamond's: the gap under the words' box, the width, and the corners' least distance from the diamond's sloped edges. */
  const geometry = (page, sel) => page.locator(sel).evaluate((el, P) => {
    const n = el.getBoundingClientRect(), words = el.querySelector(`.${P}-words`), w = words.getBoundingClientRect();
    const cs = getComputedStyle(words, "::after");
    const h = Number.parseFloat(cs.height), width = Number.parseFloat(cs.width);
    const top = w.bottom - Number.parseFloat(cs.bottom) - h;
    const a = n.width / 2, b = n.height / 2, cx = n.left + a, cy = n.top + b;
    const corners = [[w.left, top], [w.left + width, top], [w.left, top + h], [w.left + width, top + h]];
    // The distance from each corner to the nearest sloped edge, |dx| / a + |dy| / b = 1, measured square to it.
    const edge = Math.min(...corners.map(([x, y]) => (1 - Math.abs(x - cx) / a - Math.abs(y - cy) / b) / Math.sqrt(1 / a ** 2 + 1 / b ** 2)));
    return { h, width, words: w.width, gap: top - w.bottom, edge, node: [n.width, n.height] };
  }, P);
  test("2px, space-1 under the words' box and as wide as it, clear of the diamond's edges by 3.9px at least, the diamond's size the same held and not", async () => {
    const { page } = await every();
    const ids = ["who", "med", "first"];
    const before = {};
    for (const id of ids) before[id] = (await geometry(page, card("flowchart", id))).node;
    const sizes = new Set(Object.values(before).map(([, h]) => Math.round(h)));
    assert.ok(sizes.size > 1, `two decisions of different sizes (${JSON.stringify(before)})`);
    for (const id of ids) {
      await page.locator(card("flowchart", id)).click();
      await page.waitForTimeout(400);
      const g = await geometry(page, card("flowchart", id));
      assert.equal(g.h, 2, `${id}: 2px`);
      assert.ok(Math.abs(g.gap - 4) < 0.5, `${id}: space-1 under the words (${g.gap})`);
      assert.ok(Math.abs(g.width - g.words) < 0.5, `${id}: as wide as its words (${g.width}, ${g.words})`);
      assert.ok(g.edge >= 3.9, `${id}: ${g.edge}px from the diamond's edge`);
      assert.deepEqual(g.node, before[id], `${id}: the diamond's size is unchanged`);
    }
    await page.close();
  });
  // The worst case: the flattest diamond (5:1, a 320px track) with words about 115px wide.
  const FLAT = { type: "flowchart", title: "The flattest decision", summary: "A decision.", legend: { main: "The usual path" },
    nodes: [{ id: "start", name: "Change requested", shape: "terminal", col: 1, row: 1 }, { id: "dec", name: "Owners approved?", shape: "decision", col: 1, row: 2 }, { id: "ship", name: "Ship it", col: 1, row: 3 }, { id: "stop", name: "Sent back", shape: "terminal", col: 2, row: 2 }],
    edges: [{ from: "start", to: "dec", kind: "main" }, { from: "dec", to: "ship", kind: "main", label: "yes" }, { from: "dec", to: "stop", label: "no" }] };
  test("the worst case, about 115px of words in a 320px track: at least 3.9px from the diamond's edge", async () => {
    const { page } = await fixturePage(browser, `const { type, ...F } = ${JSON.stringify(FLAT)};
createRoot(document.getElementById("root")).render(<div id="box" style={{ width: 688 }}><B.FlowchartDiagram id="fig" {...F} /></div>);`, { theme: "dark", standards: true, viewport: { width: 1200, height: 900 } });
    await page.waitForSelector("#fig[data-layout]");
    const sel = `#fig .${P}-node[data-node="dec"]`;
    for (let k = 0; k < 6; k++) {
      const w = await page.locator(sel).evaluate((el) => el.getBoundingClientRect().width);
      if (Math.abs(w - 320) < 1) break;
      await page.evaluate((d) => { const b = document.getElementById("box"); b.style.width = `${b.getBoundingClientRect().width + d}px`; }, (320 - w) * 2);
      await frames(page);
    }
    await page.locator(sel).click();
    await page.waitForTimeout(400);
    const g = await geometry(page, sel);
    assert.ok(Math.abs(g.node[0] - 320) < 1, `a 320px track (${g.node[0]})`);
    assert.ok(Math.abs(g.words - 115) < 12, `words about 115px wide (${g.words})`);
    assert.ok(g.edge >= 3.9, `${g.edge}px from the diamond's edge`);
    await page.close();
  });
});

describe("a terminal's mark stays on the straight part of its edge (the picture review)", () => {
  const TERMINALS = { type: "flowchart", title: "Terminals", summary: "Three terminals.", legend: { main: "The usual path" },
    nodes: [
      { id: "one", name: "Start", shape: "terminal", col: 1, row: 1 },
      { id: "two", name: "Agent asks to run a command", detail: "approval.requested", detailMono: true, shape: "terminal", col: 1, row: 2 },
      { id: "three", name: "Recorded, then sent to every member of the room until each one has acknowledged it", detail: "approval.recorded", detailMono: true, shape: "terminal", col: 1, row: 3 },
    ],
    edges: [{ from: "one", to: "two", kind: "main" }, { from: "two", to: "three", kind: "main" }] };
  /** The mark's corners against the inner contour: the padding box, a capsule of radius half its height. */
  const corners = (page, id) => page.locator(`#fig .${P}-node[data-node="${id}"]`).evaluate((el, P) => {
    const cap = el.querySelector(`.${P}-cap`), c = cap.getBoundingClientRect(), cs = getComputedStyle(cap, "::after");
    const r = Math.min(c.width, c.height) / 2, left = c.left + Number.parseFloat(cs.left), width = Number.parseFloat(cs.width), h = Number.parseFloat(cs.height);
    const pts = [[left, c.bottom - h], [left + width, c.bottom - h], [left, c.bottom], [left + width, c.bottom]];
    const inside = ([x, y]) => {
      const nx = Math.min(Math.max(x, c.left + r), c.right - r), ny = Math.min(Math.max(y, c.top + r), c.bottom - r);
      return Math.hypot(x - nx, y - ny) <= r + 0.01;
    };
    return { height: el.getBoundingClientRect().height, inset: Number.parseFloat(cs.left), r, inside: pts.every(inside) };
  }, P);
  for (const touch of [false, true]) {
    test(`one-, two- and three-line terminals${touch ? " at the 44px touch floor" : ""}: every corner inside the inner contour, inset by the larger of space-5 and the radius`, async () => {
      const { page } = await fixturePage(browser, `const { type, ...F } = ${JSON.stringify(TERMINALS)};
createRoot(document.getElementById("root")).render(<div style={{ width: 360 }}><B.FlowchartDiagram id="fig" {...F} /></div>);`, { theme: "dark", standards: true, viewport: { width: 400, height: 900 }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
      await page.waitForSelector("#fig[data-layout]");
      const heights = [];
      for (const id of ["one", "two", "three"]) {
        const t = page.locator(`#fig .${P}-node[data-node="${id}"]`);
        if (touch) await t.tap(); else await t.click();
        await page.waitForTimeout(400);
        const got = await corners(page, id);
        heights.push(Math.round(got.height));
        assert.ok(got.inside, `${id}: inside the inner contour (${JSON.stringify(got)})`);
        assert.ok(Math.abs(got.inset - Math.max(20, got.r)) < 0.5, `${id}: inset ${got.inset}, radius ${got.r}`);
      }
      assert.equal(new Set(heights).size, 3, `three heights (${heights})`);
      if (touch) assert.ok(heights[0] >= 44, `the touch floor (${heights[0]})`);
      await page.close();
    });
  }
});

describe("a schema table's mark under its last line (the picture review)", () => {
  const SCHEMA = { type: "schema", title: "Two tables", summary: "Runs reference incidents.", legend: { plain: "A foreign key" },
    tables: [
      { name: "incidents", col: 1, row: 1, more: 4, columns: [{ name: "id", key: "PK", type: "uuid" }, { name: "title", type: "text" }] },
      { name: "runs", col: 2, row: 1, columns: [{ name: "id", key: "PK", type: "uuid" }, { name: "incident_id", key: "FK", type: "uuid", references: "incidents.id" }] },
    ] };
  test("6px under a \"+ n more\" line and 8px under a column row, from the line's box", async () => {
    const { page } = await fixturePage(browser, `const { type, ...F } = ${JSON.stringify(SCHEMA)};
createRoot(document.getElementById("root")).render(<div style={{ width: 1104 }}><B.SchemaDiagram id="fig" {...F} /></div>);`, { theme: "dark", standards: true, viewport: { width: 1200, height: 900 } });
    await page.waitForSelector("#fig[data-layout='drawn']");
    const gap = async (id) => {
      await page.locator(`#fig .${P}-node[data-node="${id}"]`).click();
      await page.waitForTimeout(400);
      return page.locator(`#fig .${P}-node[data-node="${id}"]`).evaluate((el, P) => {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el, "::after");
        const markTop = r.bottom - Number.parseFloat(getComputedStyle(el).borderBottomWidth) - Number.parseFloat(cs.bottom) - Number.parseFloat(cs.height);
        const more = el.querySelector(`.${P}-more`);
        // The last line's box: the "+ n more" block's content, or the last row's name (a flex item, its own line's height).
        const line = more ? more.getBoundingClientRect().bottom - Number.parseFloat(getComputedStyle(more).paddingBottom) : [...el.querySelectorAll(`.${P}-cname`)].at(-1).getBoundingClientRect().bottom;
        return Math.round((markTop - line) * 100) / 100;
      }, P);
    };
    assert.equal(await gap("incidents"), 6, "under + n more");
    assert.equal(await gap("runs"), 8, "under a column row");
    await page.close();
  });
});

describe("a critical schedule card's mark (the picture review)", () => {
  for (const mode of [{ theme: "dark" }, { theme: "light" }, { theme: "dark", forcedColors: "active" }]) {
    test(`${mode.forcedColors ? "forced colours" : mode.theme}: 2px of the card's own fill between the mark and its 2px contour; the contour 2px on every side, held or not`, async () => {
      const { page } = await every(mode);
      const sel = `${fig("schedule")} .${P}-node:has(> .${P}-sched-contour[data-critical])[aria-pressed]`;
      const el = page.locator(sel).first();
      const widths = () => el.evaluate((n, P) => { const c = getComputedStyle(n.querySelector(`.${P}-sched-contour`)); return [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth]; }, P);
      assert.deepEqual(await widths(), ["2px", "2px", "2px", "2px"], "not held");
      await el.click();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(400);
      assert.deepEqual(await widths(), ["2px", "2px", "2px", "2px"], "held");
      const r = await el.evaluate((n) => { const b = n.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), bottom: Math.round(b.bottom) }; });
      // From the bottom up: the contour (2), the card's fill (2), the mark (2), then the fill above it.
      const col = (await pixels(page, { x: r.x, y: r.bottom - 8, width: 1, height: 8 })).reverse();
      const [contour, gapA, gapB, mark, fillAbove] = [col[0], col[2], col[3], col[4], col[6]];
      const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 2);
      assert.ok(same(gapA, fillAbove) && same(gapB, fillAbove), `2px of fill between (${JSON.stringify(col)})`);
      assert.ok(contrast(mark, gapA) >= 3, `the mark stands off the fill (${JSON.stringify(col)})`);
      assert.ok(contrast(contour, gapA) >= 3, `the contour stands off the fill (${JSON.stringify(col)})`);
      await page.close();
    });
  }
});
