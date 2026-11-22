// One Mod key across platforms (DECISIONS 244), and Field's labelAction. "Mod+Enter" is ⌘↵ on Apple's systems and Ctrl Enter on Windows, Linux and
// ChromeOS: the chips, `aria-keyshortcuts`, the spoken words and the key-event check all read the one platform rule. The rule is run in Node with a
// stubbed `navigator` (the plain module has no React), then the components in Chromium with the stub installed before the page's scripts, against
// the built package and the real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { bundleFixture, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const ORIGIN = "https://basalt.test";

// What each browser reports. `data` is `navigator.userAgentData` (Chromium only), `platform` is `navigator.platform`.
const MACOS = { name: "macOS", apple: true, data: { platform: "macOS" }, platform: "MacIntel", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" };
const WINDOWS = { name: "Windows", apple: false, data: { platform: "Windows" }, platform: "Win32", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const LINUX = { name: "Linux", apple: false, data: { platform: "Linux" }, platform: "Linux x86_64", ua: "Mozilla/5.0 (X11; Linux x86_64)" };
// iPadOS Safari has no `userAgentData`, and says "iPad" (or "MacIntel" in desktop mode).
const IPADOS = { name: "iPadOS", apple: true, data: undefined, platform: "iPad", ua: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)" };
const IPADOS_DESKTOP = { name: "iPadOS in desktop mode", apple: true, data: undefined, platform: "MacIntel", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" };
const CHROMEOS = { name: "ChromeOS", apple: false, data: { platform: "Chrome OS" }, platform: "Linux armv8l", ua: "Mozilla/5.0 (X11; CrOS aarch64)" };
const PLATFORMS = [MACOS, WINDOWS, LINUX, IPADOS, IPADOS_DESKTOP, CHROMEOS];

const stubScript = (p) => `
  Object.defineProperty(navigator, "userAgentData", { value: ${JSON.stringify(p.data)}, configurable: true });
  Object.defineProperty(navigator, "platform", { value: ${JSON.stringify(p.platform)}, configurable: true });
  Object.defineProperty(navigator, "userAgent", { value: ${JSON.stringify(p.ua)}, configurable: true });`;

async function open(body, platform, { width = 1280 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(stubScript(platform));
  const script = await bundleFixture(body);
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="en" data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css()}</style></head><body><div id="root"></div><script>${script}</script></body></html>`,
  }));
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
  await page.goto(`${ORIGIN}/`);
  await frames(page);
  return { page, errors, context };
}
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;

// The chips a person sees: one entry a key, "icon" for ⌘ (a glyph), the word otherwise. A chip that draws both forms (data-swap) is read at its visible form.
const faces = (locator) => locator.evaluate((chip) => [...chip.querySelectorAll(":scope > .basalt-kbd-key")].map((key) => {
  const form = key.dataset.swap ? [...key.querySelectorAll(":scope > [data-form]")].find((f) => getComputedStyle(f).visibility !== "hidden") : key;
  return form.querySelector("svg") ? "icon" : form.textContent.trim();
}));
const spoken = (locator) => locator.evaluate((chip) => chip.querySelector(":scope > .basalt-visually-hidden").textContent);

// ---- the rule, in Node ----

describe("the platform rule (no React, no browser)", () => {
  const real = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const stub = (navigator) => Object.defineProperty(globalThis, "navigator", { value: navigator, configurable: true, writable: true });
  after(() => { if (real) Object.defineProperty(globalThis, "navigator", real); else delete globalThis.navigator; });

  test("it reads userAgentData.platform, then navigator.platform, then the user agent, and answers for each system", async () => {
    const { isApplePlatform, isModKey } = await import(pathToFileURL(path.join(pkg, "dist", "platform.js")).href);
    for (const p of PLATFORMS) {
      stub({ userAgentData: p.data, platform: p.platform, userAgent: p.ua });
      assert.equal(isApplePlatform(), p.apple, `${p.name} is ${p.apple ? "" : "not "}Apple's`);
      assert.equal(isModKey({ metaKey: true, ctrlKey: false }), p.apple, `${p.name}: Command alone`);
      assert.equal(isModKey({ metaKey: false, ctrlKey: true }), !p.apple, `${p.name}: Control alone`);
      assert.equal(isModKey({ metaKey: true, ctrlKey: true }), false, `${p.name}: both held is neither`);
      assert.equal(isModKey({ metaKey: false, ctrlKey: false }), false, `${p.name}: neither held`);
    }
    // The order: userAgentData wins over a platform that disagrees, and the user agent is the last resort.
    stub({ userAgentData: { platform: "Windows" }, platform: "MacIntel", userAgent: MACOS.ua });
    assert.equal(isApplePlatform(), false, "userAgentData first");
    stub({ userAgentData: { platform: "" }, platform: "", userAgent: MACOS.ua });
    assert.equal(isApplePlatform(), true, "the user agent last");
    stub({ platform: "", userAgent: WINDOWS.ua });
    assert.equal(isApplePlatform(), false);
    delete globalThis.navigator;
    assert.equal(isApplePlatform(), false, "no navigator (a server): not Apple's");
    assert.equal(isModKey({ metaKey: false, ctrlKey: true }), true);
  });

  test("shortcutKeys resolves Mod, leaves every other string as it was, and the aria and spoken words follow", async () => {
    const { shortcutKeys, ariaShortcut, spokenShortcut } = await import(pathToFileURL(path.join(pkg, "dist", "shortcut.js")).href);
    assert.deepEqual(shortcutKeys("Mod+Enter", true), ["⌘", "↵"]);
    assert.deepEqual(shortcutKeys("Mod+Enter", false), ["Ctrl", "Enter"]);
    assert.deepEqual(shortcutKeys("Mod K", true), ["⌘", "K"]);
    assert.deepEqual(shortcutKeys("Mod+Shift+P", false), ["Ctrl", "Shift", "P"]);
    assert.equal(ariaShortcut(shortcutKeys("Mod+Enter", true)), "Meta+Enter");
    assert.equal(ariaShortcut(shortcutKeys("Mod+Enter", false)), "Control+Enter");
    assert.equal(spokenShortcut(shortcutKeys("Mod+Enter", true)), "Command Return");
    assert.equal(spokenShortcut(shortcutKeys("Mod+Enter", false)), "Control Enter");
    // Existing strings are unchanged, on either platform.
    for (const apple of [true, false]) {
      assert.deepEqual(shortcutKeys("⌘K", apple), ["⌘", "K"]);
      assert.deepEqual(shortcutKeys("⌘↵", apple), ["⌘", "↵"]);
      assert.deepEqual(shortcutKeys("Ctrl Enter", apple), ["Ctrl", "Enter"]);
      assert.deepEqual(shortcutKeys("Ctrl+K", apple), ["Ctrl", "K"]);
      assert.deepEqual(shortcutKeys("Enter", apple), ["Enter"]);
      assert.deepEqual(shortcutKeys("Esc", apple), ["Esc"]);
    }
    assert.equal(ariaShortcut(shortcutKeys("⌘K")), "Meta+K");
    assert.equal(ariaShortcut(shortcutKeys("Ctrl Enter")), "Control+Enter");
    assert.equal(spokenShortcut(shortcutKeys("⌘K")), "Command K");
  });
});

// ---- the components ----

const CHIPS = `<main>
  <p>Press <B.Kbd id="bare">Mod+Enter</B.Kbd>, <B.Kbd id="legacy-apple">⌘K</B.Kbd>, <B.Kbd id="legacy-other">Ctrl Enter</B.Kbd>.</p>
  <B.ActionShortcut id="action" shortcut="Mod+Enter"><button id="declare">Declare incident</button></B.ActionShortcut>
  <B.Menu defaultOpen><B.MenuTrigger>Actions</B.MenuTrigger><B.MenuContent><B.MenuItem shortcut="Mod+D">Duplicate</B.MenuItem></B.MenuContent></B.Menu>
  <B.Tooltip content="Find" defaultOpen shortcut="Mod+K"><button id="find">Find</button></B.Tooltip>
</main>`;

describe("Mod in Kbd, ActionShortcut, Menu and Tooltip", () => {
  for (const p of [MACOS, WINDOWS, LINUX, IPADOS, CHROMEOS]) {
    test(`${p.name}: the chips, aria-keyshortcuts and spoken words say ${p.apple ? "Command" : "Control"}`, async () => {
      const { page, errors, context } = await open(render(CHIPS), p);
      await page.locator("[role=menuitem]").waitFor();
      await settle(page);
      const cmd = p.apple ? ["icon", "↵"] : ["Ctrl", "Enter"];
      assert.deepEqual(await faces(page.locator("#bare")), cmd);
      assert.equal(await spoken(page.locator("#bare")), p.apple ? "Command Return" : "Control Enter");
      assert.deepEqual(await faces(page.locator("#action .basalt-kbd")), cmd);
      assert.equal(await page.locator("#declare").getAttribute("aria-keyshortcuts"), p.apple ? "Meta+Enter" : "Control+Enter");
      assert.equal(await page.locator("[role=menuitem]").getAttribute("aria-keyshortcuts"), p.apple ? "Meta+D" : "Control+D");
      assert.deepEqual(await faces(page.locator("[role=menuitem] .basalt-kbd")), [p.apple ? "icon" : "Ctrl", "D"]);
      assert.match(await page.locator("[role=menuitem] [hidden]").textContent(), p.apple ? /^Command D$/ : /^Control D$/);
      assert.equal(await page.locator("#find").getAttribute("aria-keyshortcuts"), p.apple ? "Meta+K" : "Control+K");
      assert.match(await page.locator("[role=tooltip]").textContent(), p.apple ? /\(Command K\)/ : /\(Control K\)/);
      // Existing strings are unchanged on every platform.
      assert.deepEqual(await faces(page.locator("#legacy-apple")), ["icon", "K"]);
      assert.deepEqual(await faces(page.locator("#legacy-other")), ["Ctrl", "Enter"]);
      assert.equal(await spoken(page.locator("#legacy-apple")), "Command K");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("the key-event check is the Mod key alone: Command on Apple's systems, Control elsewhere", async () => {
    const fixture = `window.__seen = []; document.addEventListener("keydown", (e) => { if (e.key.toLowerCase() === "j") window.__seen.push([e.metaKey, e.ctrlKey, B.isModKey(e)]); }); ${render("<B.Kbd>Mod+J</B.Kbd>")}`;
    for (const p of [MACOS, IPADOS, WINDOWS, LINUX]) {
      const { page, context } = await open(fixture, p);
      for (const chord of ["Meta+j", "Control+j", "Control+Meta+j", "j"]) await page.keyboard.press(chord);
      const held = await page.evaluate(() => window.__seen.map(([meta, ctrl, mod]) => (mod ? (meta ? "Meta" : "Control") : "none")));
      assert.deepEqual(held, p.apple ? ["Meta", "none", "none", "none"] : ["none", "Control", "none", "none"], p.name);
      await context.close();
    }
  });
});

describe("one seat: no hydration mismatch and no change of width between the server's form and the client's", () => {
  const HYDRATE = `import { renderToString } from "react-dom/server"; import { hydrateRoot } from "react-dom/client";
    const App = () => <div><p><B.Kbd id="k">Mod+Enter</B.Kbd> <B.Kbd id="legacy">⌘K</B.Kbd></p><B.ActionShortcut shortcut="Mod+Enter"><button id="declare">Declare incident</button></B.ActionShortcut></div>;
    const root = document.getElementById("root");
    root.innerHTML = renderToString(<App />);
    window.__recoverable = [];
    window.__hydrate = () => { hydrateRoot(root, <App />, { onRecoverableError: (e) => window.__recoverable.push(String(e && e.message)) }); };`;
  const measure = (page) => page.evaluate(() => {
    const w = (selector) => document.querySelector(selector).getBoundingClientRect().width;
    return { chip: w("#k"), keys: [...document.querySelectorAll("#k > .basalt-kbd-key")].map((k) => k.getBoundingClientRect().width), legacy: w("#legacy"), button: w("#declare"), aria: document.querySelector("#declare").getAttribute("aria-keyshortcuts"), text: document.querySelector("#k > .basalt-visually-hidden").textContent };
  });

  for (const p of [MACOS, WINDOWS, LINUX, IPADOS]) {
    test(`${p.name}: the server's HTML hydrates cleanly, and the chips keep their widths when the real platform arrives`, async () => {
      const { page, errors, context } = await open(HYDRATE, p);
      const server = await measure(page);
      assert.equal(server.aria, "Control+Enter", "the server's fixed answer is Control");
      assert.equal(server.text, "Control Enter");
      await page.evaluate(() => window.__hydrate());
      await frames(page);
      await frames(page);
      const client = await measure(page);
      assert.equal(client.aria, p.apple ? "Meta+Enter" : "Control+Enter", "the real answer after mount");
      assert.equal(client.text, p.apple ? "Command Return" : "Control Enter");
      assert.deepEqual(await page.evaluate(() => window.__recoverable), [], "no hydration mismatch");
      assert.deepEqual(errors, [], "no warning");
      assert.deepEqual(client.keys, server.keys, "each key's seat is the same width");
      assert.equal(client.chip, server.chip, "the chip is the same width");
      assert.equal(client.button, server.button);
      assert.equal(client.legacy, server.legacy, "a string with no Mod is untouched");
      await context.close();
    });
  }

  test("the seat is as wide on Apple's systems as elsewhere, so a Mac and a PC lay the chip out alike", async () => {
    const widths = [];
    for (const p of [MACOS, WINDOWS]) {
      const { page, context } = await open(`${HYDRATE} window.__hydrate();`, p);
      await frames(page);
      widths.push(await measure(page).then((m) => ({ chip: m.chip, keys: m.keys })));
      await context.close();
    }
    assert.deepEqual(widths[0], widths[1]);
  });
});

describe("Basalt's own Mod+K", () => {
  const LIST = `<div><button id="elsewhere">elsewhere</button><B.CommandList bindShortcut label="Console" groups={[{ label: "Sandbox", commands: [{ id: "a", label: "Alpha", onSelect() {} }, { id: "b", label: "Beta", onSelect() {} }] }]} /></div>`;
  const focusedClass = (page) => page.evaluate(() => document.activeElement?.className ?? "");

  for (const [p, works, blocked] of [[MACOS, "Meta+k", "Control+k"], [IPADOS, "Meta+k", "Control+k"], [WINDOWS, "Control+k", "Meta+k"], [LINUX, "Control+k", "Meta+k"]]) {
    test(`${p.name}: ${works.replace("Meta", "⌘").replace("Control", "Ctrl")} focuses the command list's field, and ${blocked.replace("Meta", "⌘").replace("Control", "Ctrl")} does not`, async () => {
      const { page, context } = await open(render(LIST), p);
      await page.waitForSelector("[cmdk-item]");
      await settle(page);
      await page.focus("#elsewhere");
      await page.keyboard.press(blocked);
      assert.equal(await page.evaluate(() => document.activeElement?.id), "elsewhere", "the other platform's chord is left alone");
      await page.keyboard.press(works);
      assert.match(await focusedClass(page), /basalt-command-input/);
      await context.close();
    });
  }
});

describe("Field labelAction", () => {
  const GRID = `<div><B.FormGrid id="grid" columns="1-1">
    <B.Field id="title" name="title" label="Title" required column={1} row={1} labelAction={<B.TextButton id="generate">Generate a title</B.TextButton>}><B.Input id="title-input" /></B.Field>
    <B.Field id="ticket" name="ticket" label="ServiceNow ticket" column={2} row={1}><B.Input id="ticket-input" /></B.Field>
    <B.Field id="plain" name="plain" label="Title" required column={1} row={2}><B.Input /></B.Field>
  </B.FormGrid>
  <div style={{ width: 400 }}><B.Field id="loose" name="loose" label="Name" labelAction={<B.TextButton id="loose-action">Generate</B.TextButton>}><B.Input id="loose-input" /></B.Field></div></div>`;
  const box = (page, selector) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, selector);
  const near = (a, b, message, tolerance = 0.5) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`);

  test("the action is on the label's row, outside the <label>, and the label stays as wide as its words", async () => {
    const { page, errors, context } = await open(render(GRID), MACOS);
    await settle(page);
    const shape = await page.evaluate(() => {
      const field = document.querySelector("#title");
      const label = field.querySelector("label");
      const action = document.querySelector("#generate");
      return { inLabel: label.contains(action), rowIsParent: action.parentElement.classList.contains("basalt-field-label-row"), labelInRow: label.parentElement === action.parentElement, rowInField: action.parentElement.parentElement === field, labelFor: label.htmlFor === document.querySelector("#title-input").id, labelText: label.textContent };
    });
    assert.deepEqual({ ...shape, labelText: undefined }, { inLabel: false, rowIsParent: true, labelInRow: true, rowInField: true, labelFor: true, labelText: undefined });
    assert.equal(shape.labelText, "TitleRequired");
    // Same words, no action: same width (DECISIONS 233).
    const withAction = await box(page, "#title label");
    const without = await box(page, "#plain label");
    near(withAction.w, without.w, "the label is as wide as its words");
    assert.ok(withAction.w < 120, "and not the row");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("in a FormGrid row the label track lines up with the field beside it, and the action sits at the column's end", async () => {
    const { page, context } = await open(render(GRID), MACOS);
    await settle(page);
    const label = await box(page, "#title label");
    const neighbour = await box(page, "#ticket label");
    near(label.y, neighbour.y, "the labels start at the same pixel");
    const row = await box(page, "#title .basalt-field-label-row");
    const cell = await box(page, "#title");
    near(row.x, cell.x, "the row starts at the column's edge");
    near(row.w, cell.w, "and spans it");
    const action = await box(page, "#generate");
    near(action.r, cell.x + cell.w, "the action ends at the column's end");
    assert.ok(action.x > label.r, "after the label's words");
    const control = await box(page, "#title-input");
    const other = await box(page, "#ticket-input");
    near(control.y, other.y, "the controls' tops line up");
    near(control.h, other.h, "and their heights");
    near(label.b, neighbour.b, "the labels end alike");
    // The label's baseline and the action's share a line.
    const baselines = await page.evaluate(() => {
      const text = (el) => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect(); };
      const label = text(document.querySelector("#title label").firstChild);
      const action = text(document.querySelector("#generate"));
      return { label: label.bottom, action: action.bottom };
    });
    assert.ok(Math.abs(baselines.label - baselines.action) <= 3, `one row: ${JSON.stringify(baselines)}`);
    await context.close();
  });

  test("a press on the action does not focus the control, and a press on the row's empty space does nothing", async () => {
    const { page, context } = await open(render(GRID), MACOS);
    await settle(page);
    await page.evaluate(() => { window.__pressed = 0; document.querySelector("#generate").addEventListener("click", () => window.__pressed++); });
    await page.locator("#generate").click();
    assert.equal(await page.evaluate(() => window.__pressed), 1);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "generate", "focus stays on the action, not the input");
    const label = await box(page, "#title label");
    const action = await box(page, "#generate");
    await page.mouse.click((label.r + action.x) / 2, label.y + label.h / 2);
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), "title-input", "the gap between them focuses nothing");
    await page.locator("#title label").click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "title-input", "the label's words still focus the control");
    await context.close();
  });

  test("outside a grid the row spans the field with the action at its end, and at 390 it still does", async () => {
    for (const width of [1280, 390]) {
      const { page, context } = await open(render(GRID), MACOS, { width });
      await settle(page);
      const row = await box(page, "#loose .basalt-field-label-row");
      const field = await box(page, "#loose");
      near(row.w, field.w, `${width}: the row spans the field`);
      const action = await box(page, "#loose-action");
      near(action.r, field.x + field.w, `${width}: the action is at the end`);
      const grid = await box(page, "#title .basalt-field-label-row");
      const gridAction = await box(page, "#generate");
      near(gridAction.r, grid.x + grid.w, `${width}: and in the grid`);
      assert.ok(gridAction.y >= grid.y - 0.5 && gridAction.b <= grid.b + 0.5, `${width}: the action is inside its row`);
      await context.close();
    }
  });

  test("a field with no labelAction draws no row", async () => {
    const { page, context } = await open(render(GRID), MACOS);
    assert.equal(await page.locator("#plain .basalt-field-label-row").count(), 0);
    assert.equal(await page.locator("#plain > label").count(), 1);
    await context.close();
  });
});
