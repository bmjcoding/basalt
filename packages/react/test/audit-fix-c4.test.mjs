// The fourth audit fix batch (stream components-nov14, DECISIONS 133 and 135): the heading level of a card title and an accordion
// header (A3-12), where a Stepper is and what it is (A3-13, first line), what a toast with an action says (A3-13, fourth line), and
// the new Toolbar, an unstyled wrapper on Base UI's. Nothing here changes a rendered pixel at rest (the build's pixel comparison
// against the base is in the PR); each test fails on the commit before. Nothing waits on the wall clock to read a moment of a
// transition: the Stepper and the toast run on the frozen clock, and the toolbar's popups are waited for by what they are, not when.
// Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx, before = "") => `${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["light", "dark"];
const WIDTHS = [1440, 390];
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function axe(page) {
  // Audit the settled state, not a popup halfway through its entrance fade: wait for each finite animation to end (a loop is left).
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  });
  // The fixture page has no page surface of its own: give it the one an app has, so contrast is read on the real ground.
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; document.body.style.cssText = "background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
}

// ---- A3-12: the heading level of a card title and an accordion header ----

const OUTLINE = render(`<main style={{ padding: 16 }}>
  <B.Heading level={1}>Runs</B.Heading>
  <B.Card id="card-default"><B.CardHeader><B.CardTitle>Default</B.CardTitle></B.CardHeader></B.Card>
  {[2, 3, 4, 5, 6].map((n) => <B.Card key={n} id={"card-" + n}><B.CardHeader><B.CardTitle level={n}>Level {n}</B.CardTitle></B.CardHeader></B.Card>)}
  <B.Accordion defaultValue={["d"]}>
    <B.AccordionItem value="d" title="Default">Panel</B.AccordionItem>
    {[2, 3, 4, 5, 6].map((n) => <B.AccordionItem key={n} value={"l" + n} headingLevel={n} title={"Level " + n}>Panel</B.AccordionItem>)}
  </B.Accordion>
</main>`);

for (const theme of THEMES) {
  describe(`A3-12 heading levels (${theme})`, () => {
    test("a card title and an accordion header take the level they are given, and h3 when they are not", async () => {
      const { page } = await fixturePage(browser, OUTLINE, { theme });
      try {
        const titles = await page.evaluate(() => [...document.querySelectorAll(".basalt-card-title")].map((el) => el.tagName));
        assert.deepEqual(titles, ["H3", "H2", "H3", "H4", "H5", "H6"]);
        const headers = await page.evaluate(() => [...document.querySelectorAll(".basalt-accordion-header")].map((el) => el.tagName));
        assert.deepEqual(headers, ["H3", "H2", "H3", "H4", "H5", "H6"]);
        // The outline a page then has: the level is the element, and the trigger is still the button inside it.
        const outline = await page.evaluate(() => [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((el) => `${el.tagName[1]} ${el.textContent.trim()}`));
        assert.deepEqual(outline.slice(0, 3), ["1 Runs", "3 Default", "2 Level 2"]);
        assert.equal(await page.getByRole("heading", { level: 4, name: "Level 4" }).count(), 2, "the card's title and the accordion's header are both level 4 headings");
        assert.equal(await page.locator(".basalt-accordion-header > button.basalt-accordion-trigger").count(), 6, "the trigger is inside every header");
        assert.equal(await page.locator("[level], [headinglevel]").count(), 0, "the level is not left on the element as an attribute");
      } finally { await page.close(); }
    });

    test("every level draws exactly as the h3 does: the same computed style and the same box", async () => {
      const { page } = await fixturePage(browser, OUTLINE, { theme });
      try {
        const read = await page.evaluate(() => {
          const props = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "color", "marginTop", "marginBottom", "marginLeft", "marginRight", "paddingTop", "display", "textTransform"];
          const style = (el) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]));
          const box = (el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; };
          return {
            tags: [...document.querySelectorAll(".basalt-card-title, .basalt-accordion-header")].map((el) => el.tagName),
            titles: [...document.querySelectorAll(".basalt-card-title")].map((el) => ({ style: style(el), box: box(el), card: box(el.closest(".basalt-card")) })),
            // The trigger and its words and caret are the drawn parts of a header; the header itself holds no text of its own.
            triggers: [...document.querySelectorAll(".basalt-accordion-trigger")].map((el) => ({ style: style(el), span: style(el.querySelector("span")), box: box(el), header: box(el.parentElement), margin: [getComputedStyle(el.parentElement).marginTop, getComputedStyle(el.parentElement).marginBottom] })),
          };
        });
        assert.deepEqual(read.tags, ["H3", "H2", "H3", "H4", "H5", "H6", "H3", "H2", "H3", "H4", "H5", "H6"], "the levels are real, so the comparison below is between different elements");
        for (const group of [read.titles, read.triggers]) for (const each of group.slice(1)) assert.deepEqual(each, group[0], "every level is the default's twin");
      } finally { await page.close(); }
    });

    for (const width of WIDTHS) {
      test(`axe finds nothing on the page with a card and an accordion at every level, at ${width}`, async () => {
        const { page } = await fixturePage(browser, OUTLINE, { theme, viewport: { width, height: 900 } });
        try { assert.deepEqual(await axe(page), []); } finally { await page.close(); }
      });
    }
  });
}

// ---- A3-13, first line: the Stepper ----

const STEPPER = render(`<Demo />`, `const steps = [{ id: "a", label: "Details" }, { id: "b", label: "Review" }, { id: "c", label: "Confirm" }];
function Demo() { const [value, setValue] = React.useState("a"); return <main style={{ padding: 16 }}><B.Stepper steps={steps} value={value} onValueChange={setValue} {...(window.words ?? {})} /></main>; }`);

/** Every text a live region gained, as an assistive technology would be told it. */
const watchLive = (page) => page.evaluate(() => {
  window.spoken = [];
  const seen = new WeakMap();
  const read = (region) => region.textContent;
  const tell = (region) => { const now = read(region); if (seen.get(region) !== now) { seen.set(region, now); window.spoken.push(now); } };
  const regions = [...document.querySelectorAll("[aria-live]:not([aria-live=off]), [role=status], [role=alert]")];
  for (const region of regions) seen.set(region, read(region));
  new MutationObserver((records) => { for (const record of records) { const region = (record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest("[aria-live]:not([aria-live=off]), [role=status], [role=alert]"); if (region) tell(region); } }).observe(document.body, { subtree: true, childList: true, characterData: true });
});

for (const theme of THEMES) {
  describe(`A3-13 Stepper (${theme})`, () => {
    test("the group has a role and a name, and each step's accessibility tree says where the user is, once", async () => {
      const { page } = await fixturePage(browser, STEPPER, { theme, clock: true });
      try {
        const group = page.getByRole("group", { name: "Steps" });
        assert.equal(await group.count(), 1, "a group named Steps");
        for (const [at, expected] of [[1, "Details"], [2, "Review"], [3, "Confirm"]]) {
          const tree = await group.ariaSnapshot();
          const words = `Step ${at} of 3: ${expected}`;
          assert.equal(tree.split(words).length - 1, 1, `step ${at}: "${words}" is in the tree once\n${tree}`);
          assert.equal(tree.split(expected).length - 1, 1, `step ${at}: the step's name is in the tree once, not beside its position as a second copy\n${tree}`);
          assert.match(tree, /button "Back"/);
          assert.match(tree, at === 3 ? /button "Done"/ : /button "Next"/);
          if (at < 3) await group.getByRole("button", { name: "Next" }).click();
        }
      } finally { await page.close(); }
    });

    test("a step change announces the position once, with the name, and nothing else says it", async () => {
      const { page } = await fixturePage(browser, STEPPER, { theme, clock: true });
      try {
        await watchLive(page);
        await page.getByRole("button", { name: "Next" }).click();
        await page.clock.runFor(500);
        const said = await page.evaluate(() => window.spoken);
        assert.deepEqual(said.filter((text) => /Step/.test(text)), ["Step 2 of 3: Review"], "the position is spoken once");
        assert.equal(said.filter((text) => /Review/.test(text)).length, 1, "so is the name");
        await page.getByRole("button", { name: "Back" }).click();
        await page.clock.runFor(500);
        assert.deepEqual((await page.evaluate(() => window.spoken)).filter((text) => /Step/.test(text)), ["Step 2 of 3: Review", "Step 1 of 3: Details"]);
      } finally { await page.close(); }
    });

    test("it draws nothing new: the same elements, and the words are in the one hidden live span", async () => {
      const { page } = await fixturePage(browser, STEPPER, { theme, clock: true });
      try {
        const data = await page.evaluate(() => {
          const el = document.querySelector(".basalt-stepper");
          const live = el.querySelector("[aria-live]");
          return { tags: [...el.children].map((c) => c.tagName + "." + c.className.split(" ")[0]), liveClass: live.className, liveRect: (({ width, height }) => [width, height])(live.getBoundingClientRect()), role: el.getAttribute("role"), label: el.getAttribute("aria-label") };
        });
        assert.deepEqual(data.tags, ["BUTTON.basalt-button", "SPAN.basalt-text-morph", "BUTTON.basalt-button"]);
        assert.equal(data.liveClass, "basalt-visually-hidden");
        assert.deepEqual(data.liveRect, [1, 1], "the position takes no room");
        assert.deepEqual([data.role, data.label], ["group", "Steps"]);
      } finally { await page.close(); }
    });

    test("a Stepper with no steps states no position", async () => {
      const { page } = await fixturePage(browser, render(`<B.Stepper steps={[]} value="" onValueChange={() => {}} />`), { theme, clock: true });
      try {
        const live = await page.evaluate(() => document.querySelector(".basalt-stepper [aria-live]").textContent);
        assert.equal(live, "", "no 'Step 1 of 0'");
        assert.equal(await page.getByRole("group", { name: "Steps" }).count(), 1);
      } finally { await page.close(); }
    });

    test("the group's name and the position words are the app's: label and positionLabel", async () => {
      const { page } = await fixturePage(browser, `window.words = { label: "Étapes", positionLabel: (step, total) => "Étape " + step + " sur " + total };\n${STEPPER}`, { theme, clock: true });
      try {
        assert.equal(await page.getByRole("group", { name: "Étapes" }).count(), 1);
        assert.match(await page.getByRole("group", { name: "Étapes" }).ariaSnapshot(), /Étape 1 sur 3: Details/);
      } finally { await page.close(); }
    });

    for (const width of WIDTHS) {
      test(`axe finds nothing on the Stepper at ${width}`, async () => {
        const { page } = await fixturePage(browser, STEPPER, { theme, viewport: { width, height: 700 } });
        try { assert.deepEqual(await axe(page), []); } finally { await page.close(); }
      });
    }
  });
}

// ---- A3-13, fourth line: a toast with an action ----

const TOASTS = render(`<B.ToastProvider {...(window.words ?? {})}><Demo /></B.ToastProvider>`, `function Demo() { const t = B.useToast(); React.useEffect(() => { window.t = t; }, [t]); return <main style={{ padding: 16 }}><B.Button id="opener">Open</B.Button></main>; }`);
const show = (page, options) => page.evaluate((o) => { if (o.action) o.action.onClick = () => { window.undone = (window.undone ?? 0) + 1; }; return window.t.show(o); }, options);
const statusText = (page) => page.locator("[role=status]").first().evaluate((el) => [...el.querySelectorAll("p")].map((p) => p.textContent));

for (const theme of THEMES) {
  describe(`A3-13 a toast with an action (${theme})`, () => {
    test("with an action its announcement says the action exists and that F6 reaches it; without one it says what it did", async () => {
      const { page } = await fixturePage(browser, TOASTS, { theme, clock: true });
      try {
        await show(page, { title: "Sandbox deleted", action: { label: "Undo" }, home: "centre" });
        await show(page, { title: "Copied", description: "Link on the clipboard", home: "page" });
        await show(page, { title: "Run failed", description: "Retry in a minute.", status: "danger", action: { label: "Retry" } });
        await page.clock.runFor(100);
        assert.deepEqual(await statusText(page), ["Sandbox deleted. Undo is available. Press F6 to reach it.", "Copied. Link on the clipboard"]);
        assert.deepEqual(await page.locator("[role=alert] p").allTextContents(), ["Run failed. Retry in a minute. Retry is available. Press F6 to reach it."], "after a full stop the sentence follows on");
      } finally { await page.close(); }
    });

    test("it is said once, from the text-only live region, and the drawn toast is not the place it is said", async () => {
      const { page } = await fixturePage(browser, TOASTS, { theme, clock: true });
      try {
        await watchLive(page);
        await show(page, { title: "Sandbox deleted", action: { label: "Undo" }, home: "centre" });
        await page.clock.runFor(500);
        const said = await page.evaluate(() => window.spoken);
        assert.equal(said.filter((text) => /F6/.test(text)).length, 1, `said once: ${JSON.stringify(said)}`);
        const toast = await page.evaluate(() => { const el = document.querySelector(".basalt-toast"); return { text: el.textContent, live: !!el.closest("[aria-live]:not([aria-live=off])"), viewport: document.querySelector(".basalt-toast-viewport").getAttribute("aria-live") }; });
        assert.doesNotMatch(toast.text, /F6/, "nothing about F6 is drawn or in the toast's own text");
        assert.equal(toast.live, false);
        assert.equal(toast.viewport, "off");
      } finally { await page.close(); }
    });

    test("an update that settles a result says it with the new action, and a result with none says none", async () => {
      const { page } = await fixturePage(browser, TOASTS, { theme, clock: true });
      try {
        const id = await show(page, { title: "Deleting", running: true });
        await page.evaluate((id) => window.t.update(id, { title: "Deleted", action: { label: "Undo", onClick() {} }, home: "centre" }), id);
        await page.clock.runFor(100);
        assert.deepEqual(await statusText(page), ["Deleted. Undo is available. Press F6 to reach it."]);
        const second = await show(page, { title: "Importing", running: true });
        await page.evaluate((id) => window.t.update(id, { title: "Imported", home: "page" }), second);
        await page.clock.runFor(100);
        assert.deepEqual(await statusText(page), ["Deleted. Undo is available. Press F6 to reach it.", "Imported"]);
      } finally { await page.close(); }
    });

    test("an update that changes only the action says only the action's sentence; one that changes the result says it whole; one that removes the action, or changes nothing, says nothing", async () => {
      const { page } = await fixturePage(browser, TOASTS, { theme, clock: true });
      try {
        const id = await show(page, { title: "Saved", description: "The file is ready", home: "centre" });
        await page.clock.runFor(100);
        assert.deepEqual(await statusText(page), ["Saved. The file is ready"]);
        const update = async (patch) => { await page.evaluate(([id, patch]) => { if (patch.action) patch.action.onClick = () => {}; window.t.update(id, patch); }, [id, patch]); await page.clock.runFor(100); return statusText(page); };
        const retry = "Retry is available. Press F6 to reach it.";
        const undo = "Undo is available. Press F6 to reach it.";
        const first = ["Saved. The file is ready"];
        assert.deepEqual(await update({ action: { label: "Retry" } }), [...first, retry], "an action added: its sentence alone, the result not repeated");
        assert.deepEqual(await update({ action: { label: "Retry" } }), [...first, retry], "the same action again changes nothing a listener needs");
        assert.deepEqual(await update({}), [...first, retry], "an empty update says nothing");
        assert.deepEqual(await update({ action: { label: "Undo" } }), [...first, retry, undo], "a label that changes: its sentence alone");
        assert.deepEqual(await update({ action: undefined }), [...first, retry, undo], "an action that goes says nothing");
        assert.equal(await page.locator(".basalt-toast-action").count(), 0, "and the button is gone");
        assert.deepEqual(await update({ action: { label: "Undo" }, description: "Two files are ready" }), [...first, retry, undo, "Saved. Two files are ready. Undo is available. Press F6 to reach it."], "a changed result is said whole, with the action's sentence");
        assert.deepEqual(await update({ title: "Saved again" }), [...first, retry, undo, "Saved. Two files are ready. Undo is available. Press F6 to reach it.", "Saved again. Two files are ready. Undo is available. Press F6 to reach it."], "and so is a changed title, with the action kept");
      } finally { await page.close(); }
    });

    test("what it says is true: F6 reaches the toast's action", async () => {
      const { page } = await fixturePage(browser, TOASTS, { theme });
      try {
        await show(page, { title: "Sandbox deleted", action: { label: "Undo" }, home: "centre" });
        await page.locator(".basalt-toast").waitFor();
        await page.focus("#opener");
        await page.keyboard.press("F6");
        await page.waitForFunction(() => document.activeElement?.closest(".basalt-toast-viewport"));
        // The toast takes focus first, then its action: the stack is a region, and the action is a stop inside it.
        for (let tab = 0; tab < 3 && (await page.evaluate(() => document.activeElement?.textContent)) !== "Undo"; tab += 1) await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Undo");
      } finally { await page.close(); }
    });

    test("the words are the app's: actionWords", async () => {
      const { page } = await fixturePage(browser, `window.words = { actionWords: (label) => label + " est disponible. Appuyez sur F6." };\n${TOASTS}`, { theme, clock: true });
      try {
        await show(page, { title: "Sandbox supprimé", action: { label: "Annuler" }, home: "centre" });
        await page.clock.runFor(100);
        assert.deepEqual(await statusText(page), ["Sandbox supprimé. Annuler est disponible. Appuyez sur F6."]);
      } finally { await page.close(); }
    });

    for (const width of WIDTHS) {
      test(`axe finds nothing with a toast with an action showing, at ${width}`, async () => {
        const { page } = await fixturePage(browser, TOASTS, { theme, viewport: { width, height: 700 } });
        try {
          await show(page, { title: "Sandbox deleted", action: { label: "Undo" }, home: "centre" });
          await page.locator(".basalt-toast-action").waitFor();
          await frames(page);
          assert.deepEqual(await axe(page), []);
        } finally { await page.close(); }
      });
    }
  });
}

// ---- X2: Toolbar ----

const TOOLBAR = (props = "", before = "") => render(`<main style={{ padding: 16 }}>
  <B.Button id="before">Before</B.Button>
  <B.Toolbar id="bar" aria-label="Formatting" style={{ display: "flex", flexDirection: ORIENT === "vertical" ? "column" : "row", gap: 8, width: "max-content" }} orientation={ORIENT} ${props}>
    <B.ToolbarButton id="bold" variant="ghost" icon={TextBIcon}>Bold</B.ToolbarButton>
    <B.ToolbarIconButton id="plus" icon={PlusIcon} label="Add" />
    <B.ToolbarButton id="off" disabled>Disabled</B.ToolbarButton>
    <B.ToolbarGroup aria-label="Links"><B.ToolbarLink id="docs" href="#docs">Docs</B.ToolbarLink></B.ToolbarGroup>
    <B.ToolbarSeparator />
    <B.ToolbarInput id="find" aria-label="Find" defaultValue="abc" />
    <B.Menu><B.MenuTrigger render={<B.ToolbarButton id="menu" iconEnd={CaretDownIcon}>Format</B.ToolbarButton>} /><B.MenuContent><B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem></B.MenuContent></B.Menu>
    <B.Popover><B.PopoverTrigger render={<B.ToolbarButton id="info">Info</B.ToolbarButton>} /><B.PopoverContent><B.PopoverTitle>Details</B.PopoverTitle><button id="inside">Inside</button></B.PopoverContent></B.Popover>
    <B.ToolbarButton id="last">Last</B.ToolbarButton>
  </B.Toolbar>
  <B.Button id="after">After</B.Button>
</main>`, `import { CaretDownIcon, PlusIcon, TextBIcon } from "@phosphor-icons/react";\nconst ORIENT = window.ORIENT ?? "horizontal";\n${before}`);

const active = async (page) => { await frames(page); return page.evaluate(() => document.activeElement?.id ?? document.activeElement?.tagName); };
const press = async (page, keys) => { const out = []; for (const key of keys) { await page.keyboard.press(key); out.push(await active(page)); } return out; };
const toolbarPage = async (theme, { orientation = "horizontal", rtl = false, props = "", viewport } = {}) => {
  const { page } = await fixturePage(browser, `window.ORIENT = ${JSON.stringify(orientation)};\n${TOOLBAR(props)}`, { theme, ...(viewport ? { viewport } : {}) });
  if (rtl) await page.evaluate(() => { document.documentElement.dir = "rtl"; });
  await page.locator("#bar").waitFor();
  return page;
};

for (const theme of THEMES) {
  describe(`X2 Toolbar (${theme})`, () => {
    test("it is a toolbar with one tab stop: Tab enters on the first control and the next Tab leaves", async () => {
      const page = await toolbarPage(theme);
      try {
        const data = await page.evaluate(() => { const bar = document.querySelector("#bar"); return { role: bar.getAttribute("role"), label: bar.getAttribute("aria-label"), orientation: bar.getAttribute("aria-orientation"), stops: [...bar.querySelectorAll("[data-basalt-toolbar-item]")].filter((el) => el.tabIndex === 0).map((el) => el.id) }; });
        assert.deepEqual(data, { role: "toolbar", label: "Formatting", orientation: "horizontal", stops: ["bold"] });
        await page.focus("#before");
        assert.deepEqual(await press(page, ["Tab", "Tab"]), ["bold", "after"]);
        await page.keyboard.press("Shift+Tab");
        assert.equal(await active(page), "bold", "back in, on the control the toolbar was left from");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        assert.equal(await active(page), "plus", "the stop is where focus last was");
      } finally { await page.close(); }
    });

    test("horizontal: Left and Right move between the controls (a disabled one stays in the order), Home and End go to the ends, and Up and Down do nothing", async () => {
      const page = await toolbarPage(theme);
      try {
        await page.focus("#bold");
        assert.deepEqual(await press(page, ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"]), ["plus", "off", "docs", "find", "find", "menu", "info", "last"], "the input keeps one Right for the caret: abc has its caret at the start");
        assert.deepEqual(await press(page, ["ArrowRight", "ArrowLeft", "Home", "End", "ArrowLeft"]), ["bold", "last", "bold", "last", "info"], "it wraps, and Home and End go to the ends");
        assert.deepEqual(await press(page, ["ArrowDown", "ArrowUp"]), ["info", "info"]);
      } finally { await page.close(); }
    });

    test("vertical: Up and Down move, Left and Right do nothing, and the orientation is what the toolbar says", async () => {
      const page = await toolbarPage(theme, { orientation: "vertical" });
      try {
        assert.equal(await page.getAttribute("#bar", "aria-orientation"), "vertical");
        await page.focus("#bold");
        assert.deepEqual(await press(page, ["ArrowDown", "ArrowDown", "ArrowRight", "ArrowLeft", "ArrowUp", "End", "Home"]), ["plus", "off", "off", "off", "plus", "last", "bold"]);
      } finally { await page.close(); }
    });

    test("it stops at the ends when it is told not to wrap", async () => {
      const page = await toolbarPage(theme, { props: "loopFocus={false}" });
      try {
        await page.focus("#bold");
        assert.deepEqual(await press(page, ["ArrowLeft", "End", "ArrowRight"]), ["bold", "last", "last"]);
      } finally { await page.close(); }
    });

    test("in a right-to-left page the arrows follow what is drawn: Left goes on, Right comes back, Home and End are still first and last", async () => {
      for (const orientation of ["horizontal", "vertical"]) {
        const page = await toolbarPage(theme, { orientation, rtl: true });
        try {
          await page.focus("#bold");
          const [forward, back] = orientation === "horizontal" ? ["ArrowLeft", "ArrowRight"] : ["ArrowDown", "ArrowUp"];
          assert.deepEqual(await press(page, [forward, forward, back, "End", "Home"]), ["plus", "off", "plus", "last", "bold"], orientation);
          if (orientation === "horizontal") assert.deepEqual(await press(page, ["ArrowRight"]), ["last"], "Right from the first wraps to the last");
        } finally { await page.close(); }
      }
    });

    test("a direction that changes while the page is open is read when focus arrives", async () => {
      const page = await toolbarPage(theme);
      try {
        await page.focus("#bold");
        assert.deepEqual(await press(page, ["ArrowRight"]), ["plus"]);
        await page.focus("#before");
        await page.evaluate(() => { document.documentElement.dir = "rtl"; });
        await page.keyboard.press("Tab");
        assert.equal(await active(page), "plus");
        assert.deepEqual(await press(page, ["ArrowLeft"]), ["off"]);
      } finally { await page.close(); }
    });

    test("a disabled control stays focusable and says it is disabled, and does nothing when pressed; with focusableWhenDisabled off it is skipped", async () => {
      const page = await toolbarPage(theme);
      try {
        await page.evaluate(() => { window.pressed = 0; document.querySelector("#off").addEventListener("click", () => { window.pressed += 1; }); });
        await page.focus("#plus");
        assert.deepEqual(await press(page, ["ArrowRight"]), ["off"]);
        assert.equal(await page.getAttribute("#off", "aria-disabled"), "true");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Space");
        assert.equal(await page.evaluate(() => window.pressed), 0);
        await page.close();
        const skipped = await fixturePage(browser, render(`<B.Toolbar id="bar" aria-label="Formatting"><B.ToolbarButton id="a">A</B.ToolbarButton><B.ToolbarButton id="b" disabled focusableWhenDisabled={false}>B</B.ToolbarButton><B.ToolbarButton id="c">C</B.ToolbarButton></B.Toolbar>`), { theme });
        await skipped.page.focus("#a");
        assert.deepEqual(await press(skipped.page, ["ArrowRight", "End", "ArrowLeft", "Home"]), ["c", "c", "a", "a"]);
        assert.equal(await skipped.page.evaluate(() => document.querySelector("#b").disabled), true);
        await skipped.page.close();
      } finally { await page.close().catch(() => {}); }
    });

    test("disabled on the Toolbar or a ToolbarGroup disables the controls inside, which stay in the order", async () => {
      const { page } = await fixturePage(browser, render(`<><B.Toolbar id="bar" aria-label="All" disabled><B.ToolbarButton id="a">A</B.ToolbarButton><B.ToolbarInput id="i" aria-label="Find" /><B.ToolbarGroup><B.ToolbarIconButton id="b" icon={B.HomeGlyph} label="Home" /></B.ToolbarGroup></B.Toolbar>
        <B.Toolbar id="two" aria-label="Some"><B.ToolbarButton id="c">C</B.ToolbarButton><B.ToolbarGroup disabled><B.ToolbarButton id="d">D</B.ToolbarButton></B.ToolbarGroup></B.Toolbar></>`), { theme });
      try {
        const states = await page.evaluate(() => ["a", "i", "b", "c", "d"].map((id) => `${id}:${document.getElementById(id).getAttribute("aria-disabled")}`));
        assert.deepEqual(states, ["a:true", "i:true", "b:true", "c:null", "d:true"]);
        await page.focus("#a");
        assert.deepEqual(await press(page, ["ArrowRight", "ArrowRight"]), ["i", "b"], "they can still be reached");
      } finally { await page.close(); }
    });

    test("a Menu opened from a control keeps the arrow keys, Home and End to itself; Escape gives the toolbar its place back", async () => {
      for (const orientation of ["horizontal", "vertical"]) {
        const page = await toolbarPage(theme, { orientation });
        try {
          await page.focus("#menu");
          await page.keyboard.press("Enter");
          await page.waitForSelector("[role=menu] [role=menuitem]");
          await frames(page);
          const items = await page.evaluate(() => [...document.querySelectorAll("[role=menuitem]")].map((el) => el.textContent));
          assert.deepEqual(items, ["One", "Two"]);
          const where = () => page.evaluate(() => ({ inMenu: !!document.activeElement?.closest("[role=menu]"), text: document.activeElement?.textContent }));
          for (const key of ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "End", "Home"]) {
            await page.keyboard.press(key);
            await frames(page);
            assert.equal((await where()).inMenu, true, `${orientation}: ${key} stayed in the menu`);
          }
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => !document.querySelector("[role=menu]"));
          assert.equal(await active(page), "menu", `${orientation}: focus is back on its trigger`);
          assert.deepEqual(await press(page, [orientation === "horizontal" ? "ArrowRight" : "ArrowDown"]), ["info"], "along the toolbar again");
        } finally { await page.close(); }
      }
    });

    test("in a vertical toolbar Down and Up walk past a menu button as they do past any control, and Enter, Space and a click open it", async () => {
      const page = await toolbarPage(theme, { orientation: "vertical" });
      try {
        await page.focus("#menu");
        assert.deepEqual(await press(page, ["ArrowDown", "ArrowUp", "ArrowUp"]), ["info", "menu", "find"]);
        assert.equal(await page.locator("[role=menu]").count(), 0, "no arrow opened it");
        await page.focus("#menu");
        await page.keyboard.press("Space");
        await page.waitForSelector("[role=menu] [role=menuitem]");
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("[role=menu]"));
        await page.click("#menu");
        await page.waitForSelector("[role=menu] [role=menuitem]");
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("[role=menu]"));
        assert.deepEqual(await press(page, ["End", "Home"]), ["last", "bold"]);
      } finally { await page.close(); }
    });

    test("in a horizontal toolbar Down on a menu button still opens its menu", async () => {
      const page = await toolbarPage(theme);
      try {
        await page.focus("#menu");
        await page.keyboard.press("ArrowDown");
        await page.waitForSelector("[role=menu] [role=menuitem]");
      } finally { await page.close(); }
    });

    test("a direction that changes while focus stays inside is the direction used for the very next key", async () => {
      const page = await toolbarPage(theme);
      try {
        await page.focus("#plus");
        await page.evaluate(() => { document.documentElement.dir = "rtl"; });
        assert.deepEqual(await press(page, ["ArrowLeft"]), ["off"], "Left goes on in a right-to-left page, from the first key");
        await page.evaluate(() => { document.documentElement.dir = "ltr"; });
        assert.deepEqual(await press(page, ["ArrowLeft"]), ["plus"], "and back the other way");
      } finally { await page.close(); }
    });

    test("a toolbar acts only on its own controls: nested toolbars keep their own keys, in both nestings", async () => {
      const menu = '<B.Menu><B.MenuTrigger render={<B.ToolbarButton id="MID">Format</B.ToolbarButton>} /><B.MenuContent><B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem></B.MenuContent></B.Menu>';
      const nested = (outer, inner) => render(`<main style={{ padding: 16 }}>
        <B.Toolbar id="outer" aria-label="Outer" orientation="${outer}" style={{ display: "flex", flexDirection: "${outer === "vertical" ? "column" : "row"}", gap: 8, width: "max-content" }}>
          <B.ToolbarButton id="oa">OA</B.ToolbarButton>
          <B.Toolbar id="inner" aria-label="Inner" orientation="${inner}" style={{ display: "flex", flexDirection: "${inner === "vertical" ? "column" : "row"}", gap: 8 }}>
            <B.ToolbarButton id="ia">IA</B.ToolbarButton>${menu.replace("MID", "imenu")}<B.ToolbarButton id="iz">IZ</B.ToolbarButton>
          </B.Toolbar>
          ${menu.replace("MID", "omenu")}
          <B.ToolbarButton id="oz">OZ</B.ToolbarButton>
        </B.Toolbar></main>`);
      // A vertical outer toolbar holding a horizontal one: Down on the inner menu button opens the inner menu (the outer does not take the key).
      {
        const { page } = await fixturePage(browser, nested("vertical", "horizontal"), { theme });
        try {
          await page.focus("#imenu");
          await page.keyboard.press("ArrowDown");
          await page.waitForSelector("[role=menu] [role=menuitem]");
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => !document.querySelector("[role=menu]"));
          assert.equal(await active(page), "imenu");
          assert.deepEqual(await press(page, ["ArrowRight", "Home", "End"]), ["iz", "ia", "iz"], "the inner toolbar's keys stay in the inner toolbar");
          // The outer toolbar's own menu button still walks on, and does not open.
          await page.focus("#omenu");
          assert.deepEqual(await press(page, ["ArrowDown", "ArrowUp", "ArrowUp"]), ["oz", "omenu", "oa"]);
          assert.equal(await page.locator("[role=menu]").count(), 0);
        } finally { await page.close(); }
      }
      // A horizontal outer toolbar holding a vertical one: Down on the inner menu button walks past it inside the inner toolbar, Left and Right belong to the outer.
      {
        const { page } = await fixturePage(browser, nested("horizontal", "vertical"), { theme });
        try {
          await page.focus("#imenu");
          assert.deepEqual(await press(page, ["ArrowDown", "ArrowUp", "ArrowUp"]), ["iz", "imenu", "ia"], "the vertical inner toolbar walks past its own menu button");
          assert.equal(await page.locator("[role=menu]").count(), 0);
          await page.focus("#omenu");
          await page.keyboard.press("ArrowDown");
          await page.waitForSelector("[role=menu] [role=menuitem]");
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => !document.querySelector("[role=menu]"));
        } finally { await page.close(); }
      }
    });

    test("every key is the toolbar's only for its own controls: a non-looping toolbar nested in one of the same orientation keeps its ends, in both nestings and both loopFocus values", async () => {
      for (const orientation of ["horizontal", "vertical"]) {
        const [fwd, back] = orientation === "horizontal" ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
        for (const [innerLoop, outerLoop] of [[false, true], [false, false], [true, false], [true, true]]) {
          const { page } = await fixturePage(browser, render(`<main style={{ padding: 16 }}>
            <B.Toolbar id="outer" aria-label="Outer" orientation="${orientation}" loopFocus={${outerLoop}} style={{ display: "flex", flexDirection: "${orientation === "vertical" ? "column" : "row"}", gap: 8, width: "max-content" }}>
              <B.ToolbarButton id="oa">OA</B.ToolbarButton>
              <B.Toolbar id="inner" aria-label="Inner" orientation="${orientation}" loopFocus={${innerLoop}} style={{ display: "flex", flexDirection: "${orientation === "vertical" ? "column" : "row"}", gap: 8 }}>
                <B.ToolbarButton id="ia">IA</B.ToolbarButton><B.ToolbarButton id="iz">IZ</B.ToolbarButton>
              </B.Toolbar>
              <B.ToolbarButton id="oz">OZ</B.ToolbarButton>
            </B.Toolbar></main>`), { theme });
          try {
            const label = `${orientation}, inner loop ${innerLoop}, outer loop ${outerLoop}`;
            await page.focus("#iz");
            assert.deepEqual(await press(page, [fwd]), [innerLoop ? "ia" : "iz"], `${label}: past the inner's last button`);
            await page.focus("#ia");
            assert.deepEqual(await press(page, [back]), [innerLoop ? "iz" : "ia"], `${label}: before the inner's first button`);
            assert.deepEqual(await press(page, ["End", "Home"]), ["iz", "ia"], `${label}: Home and End stay inside the inner toolbar`);
            await page.focus("#oa");
            assert.deepEqual(await press(page, [fwd, fwd]), ["oz", outerLoop ? "oa" : "oz"], `${label}: the outer walks its own controls`);
          } finally { await page.close(); }
        }
      }
    });

    test("a button portalled out of a toolbar, a toolbar inside a Popover opened from one, and a Menu's items keep their own keys", async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 16 }}>
        <B.Toolbar id="bar" aria-label="Bar" loopFocus={false} style={{ display: "flex", gap: 8, width: "max-content" }}>
          <B.ToolbarButton id="a">A</B.ToolbarButton>
          {createPortal(<button id="portal">Portalled</button>, document.body)}
          <B.Popover><B.PopoverTrigger render={<B.ToolbarButton id="pop">Open</B.ToolbarButton>} /><B.PopoverContent><B.PopoverTitle>Inner</B.PopoverTitle>
            <B.Toolbar id="pbar" aria-label="In the popover" loopFocus={false} style={{ display: "flex", gap: 8 }}><B.ToolbarButton id="p1">P1</B.ToolbarButton><B.ToolbarButton id="p2">P2</B.ToolbarButton></B.Toolbar>
          </B.PopoverContent></B.Popover>
          <B.Menu><B.MenuTrigger render={<B.ToolbarButton id="menu">Format</B.ToolbarButton>} /><B.MenuContent><B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem></B.MenuContent></B.Menu>
          <B.ToolbarButton id="z">Z</B.ToolbarButton>
        </B.Toolbar></main>`, `import { createPortal } from "react-dom";`), { theme });
      try {
        await page.focus("#portal");
        for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
          await page.keyboard.press(key);
          assert.equal(await active(page), "portal", `${key} on a button portalled out of the toolbar does nothing in it`);
        }
        await page.focus("#pop");
        await page.keyboard.press("Enter");
        await page.waitForSelector("[role=dialog] #p1");
        await page.waitForFunction(() => document.activeElement?.closest("[role=dialog]"));
        await page.focus("#p2");
        assert.deepEqual(await press(page, ["ArrowRight", "End", "Home", "ArrowLeft"]), ["p2", "p2", "p1", "p1"], "a non-looping toolbar in the popover keeps its ends and Home and End");
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("[role=dialog]"));
        await page.focus("#menu");
        await page.keyboard.press("Enter");
        await page.waitForSelector("[role=menu] [role=menuitem]");
        await frames(page);
        for (const key of ["ArrowDown", "ArrowRight", "ArrowLeft", "End", "Home", "ArrowUp"]) {
          await page.keyboard.press(key);
          await frames(page);
          assert.equal(await page.evaluate(() => !!document.activeElement?.closest("[role=menu]")), true, `${key} on a menu item stays in the menu`);
        }
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("[role=menu]"));
        assert.equal(await active(page), "menu");
        assert.deepEqual(await press(page, ["ArrowRight", "ArrowRight"]), ["z", "z"], "and the toolbar's own end holds");
      } finally { await page.close(); }
    });

    test("in a vertical toolbar, Up and Down pressed inside an open Menu or Popover from it belong to the popup", async () => {
      const page = await toolbarPage(theme, { orientation: "vertical" });
      try {
        await page.focus("#menu");
        await page.keyboard.press("Enter");
        await page.waitForSelector("[role=menu] [role=menuitem]");
        await frames(page);
        for (const key of ["ArrowDown", "ArrowUp", "ArrowDown"]) {
          await page.keyboard.press(key);
          await frames(page);
          assert.equal(await page.evaluate(() => !!document.activeElement?.closest("[role=menu]")), true, `${key} stayed in the menu`);
        }
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("[role=menu]"));
        await page.focus("#info");
        await page.keyboard.press("Enter");
        await page.waitForSelector("[role=dialog]");
        await page.waitForFunction(() => document.activeElement?.closest("[role=dialog]"));
        for (const key of ["ArrowDown", "ArrowUp"]) {
          await page.keyboard.press(key);
          await frames(page);
          assert.equal(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")), true, `${key} stayed in the popover`);
        }
      } finally { await page.close(); }
    });

    test("disabled on a toolbar does not disable a ToolbarLink: it has no disabled state and still navigates", async () => {
      const { page } = await fixturePage(browser, render(`<B.Toolbar aria-label="All" disabled><B.ToolbarLink id="lnk" href="#dest">Docs</B.ToolbarLink></B.Toolbar>`), { theme });
      try {
        assert.equal(await page.getAttribute("#lnk", "aria-disabled"), null);
        await page.click("#lnk");
        assert.equal(await page.evaluate(() => location.hash), "#dest");
      } finally { await page.close(); }
    });

    test("a Popover opened from a control keeps the arrow keys, Home and End to itself", async () => {
      const page = await toolbarPage(theme);
      try {
        await page.focus("#info");
        await page.keyboard.press("Enter");
        await page.waitForSelector("[role=dialog]");
        await page.waitForFunction(() => document.activeElement?.closest("[role=dialog]"));
        for (const key of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"]) {
          await page.keyboard.press(key);
          await frames(page);
          assert.equal(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]")), true, `${key} stayed in the popover`);
        }
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("[role=dialog]"));
        assert.equal(await active(page), "info");
        assert.deepEqual(await press(page, ["ArrowRight"]), ["last"]);
      } finally { await page.close(); }
    });

    test("in the text input, Home, End and the arrows are the caret's until it reaches the edge", async () => {
      const page = await toolbarPage(theme);
      try {
        await page.focus("#find");
        await page.keyboard.press("End");
        assert.equal(await active(page), "find");
        assert.equal(await page.evaluate(() => document.activeElement.selectionStart), 3);
        await page.keyboard.press("ArrowLeft");
        assert.equal(await active(page), "find");
        await page.keyboard.press("Home");
        assert.equal(await active(page), "find");
        await page.keyboard.press("ArrowLeft");
        assert.equal(await active(page), "docs", "at the start, Left leaves the field");
      } finally { await page.close(); }
    });

    test("it draws nothing: no class on the toolbar, a group or a separator, and a Button looks the same in it as out of it", async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 16 }}>
        <B.Toolbar aria-label="One"><B.ToolbarGroup><B.ToolbarSeparator /></B.ToolbarGroup>
          <B.ToolbarButton id="in" variant="primary" size="sm" icon={B.HomeGlyph}>Save</B.ToolbarButton>
          <B.ToolbarIconButton id="inicon" icon={B.HomeGlyph} label="Home" pressed />
          <B.ToolbarLink id="inlink" href="#a">Docs</B.ToolbarLink>
          <B.ToolbarInput id="ininput" aria-label="Find" controlSize="sm" />
        </B.Toolbar>
        <B.Button id="out" variant="primary" size="sm" icon={B.HomeGlyph}>Save</B.Button>
        <B.IconButton id="outicon" icon={B.HomeGlyph} label="Home" pressed />
        <B.Link id="outlink" href="#a">Docs</B.Link>
        <B.Input id="outinput" aria-label="Find" controlSize="sm" />
      </main>`), { theme });
      try {
        const data = await page.evaluate(() => {
          const classes = [...document.querySelectorAll("[role=toolbar], [role=group], [role=separator]")].map((el) => el.getAttribute("class"));
          const style = (el) => { const s = getComputedStyle(el); return Object.fromEntries([...s].filter((p) => !/^(inline-size|block-size|perspective-origin|transform-origin|-webkit)/.test(p)).map((p) => [p, s.getPropertyValue(p)])); };
          const same = (a, b) => { const x = style(document.querySelector(a)), y = style(document.querySelector(b)); return Object.keys(x).filter((k) => x[k] !== y[k]); };
          return { classes, buttons: same("#in", "#out"), icons: same("#inicon", "#outicon"), links: same("#inlink", "#outlink"), inputs: same("#ininput", "#outinput"), toolbar: style(document.querySelector("[role=toolbar]")) };
        });
        assert.deepEqual(data.classes, [null, null, null], "no class that draws anything");
        assert.deepEqual(data.buttons, [], "a Button in the toolbar is the Button");
        assert.deepEqual(data.icons, []);
        assert.deepEqual(data.links, []);
        assert.deepEqual(data.inputs, []);
        assert.deepEqual([data.toolbar.display, data.toolbar["border-top-width"], data.toolbar["padding-top"], data.toolbar["background-color"], data.toolbar["row-gap"]], ["block", "0px", "0px", "rgba(0, 0, 0, 0)", "normal"]);
      } finally { await page.close(); }
    });

    for (const width of WIDTHS) {
      test(`axe finds nothing on the toolbar, closed and with its menu open, at ${width}`, async () => {
        const page = await toolbarPage(theme, { viewport: { width, height: 700 } });
        try {
          assert.deepEqual(await axe(page), []);
          await page.focus("#menu");
          await page.keyboard.press("Enter");
          await page.waitForSelector("[role=menu] [role=menuitem]");
          await frames(page);
          assert.deepEqual(await axe(page), []);
        } finally { await page.close(); }
      });
    }
  });
}
