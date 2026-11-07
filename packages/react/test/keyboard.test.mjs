// Shortcut chips on touch (the kit panel's ruling): hidden on `(hover: none) and (pointer: coarse)` until a
// hardware key is pressed, set by a lazy listener, remembered for the session. Driven in Chromium against
// the built package with the real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { bundleFixture, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const ORIGIN = "https://basalt.test";

/**
 * A page on a real (fake-host) origin, so sessionStorage works and survives a reload. `touch` is a phone
 * (`hover: none`, `pointer: coarse`); otherwise a desktop with a mouse.
 */
async function open(body, { touch = false, theme = "light" } = {}) {
  const context = await browser.newContext(touch ? { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } } : { viewport: { width: 1280, height: 800 } });
  const script = await bundleFixture(body);
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="en" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css()}</style></head><body><div id="root"></div><script>${script}</script></body></html>`,
  }));
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ORIGIN}/`);
  await frames(page);
  return { page, errors, context };
}

/** Two frames: React has committed and run its effects, the way a person who presses a key later would find it. */
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const display = (locator) => locator.evaluate((el) => getComputedStyle(el).display);
const keyboardAttr = (page) => page.evaluate(() => document.documentElement.dataset.keyboard ?? null);

const chips = `<main>
  <p>Press <B.Kbd id="bare">⌘K</B.Kbd> anywhere.</p>
  <button id="trigger">Search <B.Kbd id="trigger-chip" shortcut>⌘K</B.Kbd></button>
  <p id="legend" data-kbd-hint=""><B.Kbd>↑</B.Kbd><B.Kbd>↓</B.Kbd> to move</p>
</main>`;

describe("touch without a keyboard", () => {
  test("a shortcut chip and a hint legend are hidden; a bare Kbd in text stays", async () => {
    const { page, errors, context } = await open(render(chips), { touch: true });
    assert.equal(await page.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches), true, "the context is a touch device");
    assert.equal(await display(page.locator("#trigger-chip")), "none");
    assert.equal(await display(page.locator("#legend")), "none");
    assert.equal(await display(page.locator("#bare")), "inline-flex");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("Menu and CommandMenu rows, the CommandMenu footer and a Tooltip shortcut are marked and hidden", async () => {
    const fixture = `function App(){const [o,so]=React.useState(true);return <main>
      <B.Menu defaultOpen><B.MenuTrigger>Actions</B.MenuTrigger><B.MenuContent><B.MenuItem shortcut="⌘D">Duplicate</B.MenuItem></B.MenuContent></B.Menu>
      <B.Tooltip content="Search" defaultOpen shortcut="⌘K"><button>Find</button></B.Tooltip>
      <B.CommandMenu hints open={o} onOpenChange={so} groups={[{label:'Sandbox',commands:[{id:'dup',label:'Duplicate',shortcut:'⌘D',onSelect:()=>{}}]}]}/>
    </main>}
    ${render("<App/>")}`;
    const { page, context } = await open(fixture, { touch: true });
    await page.locator(".basalt-command-input").waitFor();
    await settle(page);
    const marked = page.locator(".basalt-kbd[data-shortcut]");
    assert.ok(await marked.count() >= 5, "menu row, tooltip, command row, and the two footer keys carry data-shortcut");
    for (const el of await marked.all()) assert.equal(await display(el), "none");
    assert.equal(await display(page.locator(".basalt-command-footer")), "none", "the key-only footer is hidden whole");
    assert.equal(await page.locator(".basalt-command-footer").getAttribute("data-kbd-hint"), "");
    // nothing replaces a hidden chip: the row keeps its word and its machine-readable shortcut
    assert.equal(await page.locator(".basalt-command [cmdk-item]").getAttribute("aria-keyshortcuts"), "Meta+D");
    assert.equal(await page.locator("[role=menuitem]").getAttribute("aria-keyshortcuts"), "Meta+D");
    await context.close();
  });

  test("the command menu input has aria-describedby only while the chips show; aria-keyshortcuts stays on the rows", async () => {
    const fixture = `function App(){const [o,so]=React.useState(true);return <B.CommandMenu hints open={o} onOpenChange={so} groups={[{label:'Sandbox',commands:[{id:'dup',label:'Duplicate',shortcut:'⌘D',onSelect:()=>{}}]}]}/>}${render("<App/>")}`;
    const { page, context } = await open(fixture, { touch: true });
    const input = page.locator(".basalt-command-input");
    await input.waitFor();
    assert.equal(await input.getAttribute("aria-describedby"), null);
    assert.equal(await page.locator("[cmdk-item]").getAttribute("aria-keyshortcuts"), "Meta+D");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.documentElement.dataset.keyboard === "hardware");
    // Escape closed the menu; reopen it and the chips (and the description) are back
    await page.evaluate(() => { window.location.hash = ""; });
    await context.close();
  });

  test("on a desktop the same input is described by its footer from the start", async () => {
    const fixture = `function App(){const [o,so]=React.useState(true);return <B.CommandMenu hints open={o} onOpenChange={so} groups={[{label:'Sandbox',commands:[{id:'dup',label:'Duplicate',shortcut:'⌘D',onSelect:()=>{}}]}]}/>}${render("<App/>")}`;
    const { page, context } = await open(fixture);
    const input = page.locator(".basalt-command-input");
    await input.waitFor();
    const id = await input.getAttribute("aria-describedby");
    assert.ok(id, "described while the chips show");
    assert.equal(await page.locator(".basalt-command-footer").getAttribute("id"), id);
    assert.equal(await display(page.locator(".basalt-command-footer")), "flex");
    await context.close();
  });

  test("after a hardware key the chips and the described input come back", async () => {
    const fixture = `function App(){return <B.CommandMenu hints open onOpenChange={()=>{}} groups={[{label:'Sandbox',commands:[{id:'dup',label:'Duplicate',shortcut:'⌘D',onSelect:()=>{}}]}]}/>}${render("<App/>")}`;
    const { page, context } = await open(fixture, { touch: true });
    const input = page.locator(".basalt-command-input");
    await input.waitFor();
    assert.equal(await input.getAttribute("aria-describedby"), null);
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => document.documentElement.dataset.keyboard === "hardware");
    assert.ok(await input.getAttribute("aria-describedby"), "described again");
    assert.equal(await display(page.locator(".basalt-command-footer")), "flex");
    for (const el of await page.locator(".basalt-kbd[data-shortcut]").all()) assert.notEqual(await display(el), "none");
    await context.close();
  });
});

describe("the reveal", () => {
  const cases = [
    ["Tab", (page) => page.keyboard.press("Tab"), true],
    ["Escape", (page) => page.keyboard.press("Escape"), true],
    ["Command held", (page) => page.keyboard.press("Meta+k"), true],
    ["Control held", (page) => page.keyboard.press("Control+k"), true],
    ["Alt held", (page) => page.keyboard.press("Alt+k"), true],
    ["Shift alone", (page) => page.keyboard.press("Shift"), false],
    ["Shift and a letter", (page) => page.keyboard.press("Shift+k"), false],
    ["an arrow", (page) => page.keyboard.press("ArrowDown"), false],
    ["a letter", (page) => page.keyboard.press("k"), false],
    ["Unidentified", (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Unidentified", bubbles: true }))), false],
    ["Unidentified with Control held, composing", (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Unidentified", ctrlKey: true, isComposing: true, bubbles: true }))), false],
    ["Unidentified with Control held", (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Unidentified", ctrlKey: true, bubbles: true }))), false],
    ["Process with Alt held", (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Process", altKey: true, bubbles: true }))), false],
    ["Dead with Command held", (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Dead", metaKey: true, bubbles: true }))), false],
    ["Control held while composing", (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, isComposing: true, bubbles: true }))), false],
    ["Tab while composing", (page) => page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", isComposing: true, bubbles: true }))), false],
  ];
  for (const [name, press, reveals] of cases) {
    test(`${name} ${reveals ? "reveals" : "does not reveal"} the chips`, async () => {
      const { page, context } = await open(render(chips), { touch: true });
      await press(page);
      await page.waitForTimeout(50);
      assert.equal(await keyboardAttr(page), reveals ? "hardware" : null);
      assert.equal(await display(page.locator("#trigger-chip")), reveals ? "inline-flex" : "none");
      if (reveals) assert.equal(await display(page.locator("#legend")), "block");
      await context.close();
    });
  }

  test("it is remembered for the session: a reload restores it, and a new tab does not", async () => {
    const { page, context } = await open(render(chips), { touch: true });
    await page.keyboard.press("Tab");
    await page.waitForFunction(() => document.documentElement.dataset.keyboard === "hardware");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("basalt-keyboard")), "hardware");
    await page.reload();
    await frames(page);
    await page.waitForFunction(() => document.documentElement.dataset.keyboard === "hardware");
    assert.equal(await display(page.locator("#trigger-chip")), "inline-flex");
    const other = await context.newPage();
    await other.goto(`${ORIGIN}/`);
    await frames(other);
    assert.equal(await keyboardAttr(other), null, "sessionStorage is per tab");
    assert.equal(await display(other.locator("#trigger-chip")), "none");
    await context.close();
  });

  test("it is never cleared in the session: later touches and keys leave it set", async () => {
    const { page, context } = await open(render(chips), { touch: true });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.documentElement.dataset.keyboard === "hardware");
    await page.touchscreen.tap(20, 20);
    await page.keyboard.press("ArrowDown");
    assert.equal(await keyboardAttr(page), "hardware");
    await context.close();
  });

  test("nothing is installed until a component renders a shortcut chip, and then exactly one passive capture listener", async () => {
    const watch = () => {
      window.__keydown = [];
      const add = document.addEventListener;
      document.addEventListener = function (type, listener, options) {
        if (type === "keydown") window.__keydown.push({ capture: options === true || options?.capture === true, passive: options?.passive === true });
        return add.call(this, type, listener, options);
      };
    };
    // a page with only a bare Kbd: Tab does nothing, and no listener was added by Basalt
    const bare = await open(render(`<p><B.Kbd>⌘K</B.Kbd></p>`), { touch: true });
    await bare.page.addInitScript(watch);
    await bare.page.reload();
    await frames(bare.page);
    await bare.page.keyboard.press("Tab");
    assert.equal(await keyboardAttr(bare.page), null, "a bare Kbd installs nothing");
    assert.deepEqual((await bare.page.evaluate(() => window.__keydown)).filter((l) => l.capture && l.passive), []);
    await bare.context.close();

    const many = await open(render(`<>${chips}${chips.replace(/id="/g, 'data-x="')}</>`), { touch: true });
    await many.page.addInitScript(watch);
    await many.page.reload();
    await many.page.waitForSelector("[data-shortcut]", { state: "attached" });
    await frames(many.page);
    const listeners = (await many.page.evaluate(() => window.__keydown)).filter((l) => l.capture && l.passive);
    assert.equal(listeners.length, 1, "several chips, one listener");
    await many.context.close();
  });

  test("the module has no import-time side effect: loading the package touches neither the document nor storage", async () => {
    const { page, context } = await open(`window.__probe = Object.keys(B).length;`, { touch: true });
    assert.ok(await page.evaluate(() => window.__probe) > 20);
    assert.equal(await keyboardAttr(page), null);
    assert.equal(await page.evaluate(() => sessionStorage.length), 0);
    await context.close();
  });
});

describe("a fine pointer", () => {
  test("keeps display: inline-flex on every chip, with no keyboard press", async () => {
    const { page, context } = await open(render(chips));
    assert.equal(await page.evaluate(() => matchMedia("(hover: none) and (pointer: coarse)").matches), false);
    assert.equal(await display(page.locator("#trigger-chip")), "inline-flex");
    assert.equal(await display(page.locator("#bare")), "inline-flex");
    assert.equal(await display(page.locator("#legend")), "block");
    await context.close();
  });
});
