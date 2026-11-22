// The kbd module's "Mod" (DECISIONS 244): <span data-kbd="Mod Enter"> is ⌘↵ on Apple's systems and Ctrl Enter elsewhere, and the existing "⌘ K" is unchanged.
// The page hydrates after load, so there is no server form to mismatch (the React package's Kbd has one: packages/react/test/platform-shortcuts.test.mjs).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { chromium } from "playwright";

import { launchOptions } from "../../../scripts/chromium-launch.mjs";
import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";

let browser;
before(async () => { browser = await chromium.launch(launchOptions()); });
after(async () => { await browser?.close(); });

const BODY = `<main><p><span data-kbd="Mod Enter" data-doc></span> <span data-kbd="Mod K" data-doc></span> <span data-kbd="⌘ K" data-doc></span> <span data-kbd="Ctrl Enter" data-doc></span></p></main>`;
const html = compose(BODY, { fonts: false }).html;
const PLATFORMS = [
  { name: "macOS", apple: true, data: { platform: "macOS" }, platform: "MacIntel", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
  { name: "Windows", apple: false, data: { platform: "Windows" }, platform: "Win32", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  { name: "Linux", apple: false, data: { platform: "Linux" }, platform: "Linux x86_64", ua: "Mozilla/5.0 (X11; Linux x86_64)" },
  { name: "iPadOS", apple: true, data: undefined, platform: "iPad", ua: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)" },
];

describe("kbd Mod", () => {
  for (const p of PLATFORMS) {
    test(`${p.name}: Mod is ${p.apple ? "Command (a glyph, and Enter is ↵)" : "Ctrl (a word)"}, and the written keys are untouched`, async () => {
      const context = await browser.newContext();
      await context.addInitScript(`Object.defineProperty(navigator, "userAgentData", { value: ${JSON.stringify(p.data)}, configurable: true });
        Object.defineProperty(navigator, "platform", { value: ${JSON.stringify(p.platform)}, configurable: true });
        Object.defineProperty(navigator, "userAgent", { value: ${JSON.stringify(p.ua)}, configurable: true });`);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.setContent(html);
      // The chips of each span, in the order the body wrote them: a glyph is "icon", anything else is its text.
      const read = (index) => page.evaluate((i) => [...document.querySelectorAll("p > .kbd-group")[i].children].map((k) => (k.querySelector("svg") ? "icon" : k.textContent)), index);
      assert.deepEqual(await read(0), p.apple ? ["icon", "↵"] : ["Ctrl", "Enter"]);
      assert.deepEqual(await read(1), [p.apple ? "icon" : "Ctrl", "K"]);
      assert.deepEqual(await read(2), ["icon", "K"], "⌘ K is unchanged");
      assert.deepEqual(await read(3), ["Ctrl", "Enter"], "Ctrl Enter is unchanged");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});
