// The repo-wide review of 23 Nov 2026 (slice D): HTML-skill fixes that restore documented behaviour, by the module they are about. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = async (body, options) => openHtml(browser, compose(`<title>t</title>${body}<script>Basalt.init();</script>`, { fonts: false }).html, options);
const frames = (p, n = 3) => p.evaluate((count) => new Promise((resolve) => { let left = count; const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick)); requestAnimationFrame(tick); }), n);

describe("combobox", () => {
  const FIELD = (disabled) => `<form id="f"><div class="field"><label for="region">Region</label><div class="combobox">
    <input class="input" id="region" name="region"${disabled ? " disabled" : ""}>
    <ul><li data-value="eu">Frankfurt</li><li data-value="us" aria-selected="true">Ashburn</li></ul></div></div></form>`;
  const sent = (p) => p.evaluate(() => [...new FormData(document.getElementById("f")).entries()]);

  test("a disabled field submits nothing, though an option was chosen when the page loaded", async () => {
    const { page: p, context } = await page(FIELD(true));
    await frames(p);
    assert.deepEqual(await sent(p), []);
    await context.close();
  });

  test("disabled and enabled later, the submitted value follows, and the caret button with it", async () => {
    const { page: p, context } = await page(FIELD(false));
    await frames(p);
    assert.deepEqual(await sent(p), [["region", "us"]]);
    await p.evaluate(() => { document.getElementById("region").disabled = true; });
    await frames(p);
    assert.deepEqual(await sent(p), []);
    assert.equal(await p.locator(".combobox-trigger").evaluate((el) => el.disabled), true);
    await p.evaluate(() => { document.getElementById("region").disabled = false; });
    await frames(p);
    assert.deepEqual(await sent(p), [["region", "us"]]);
    await context.close();
  });
});

describe("tooltip", () => {
  const BODY = `<div style="padding: 120px"><button class="btn" id="tip" data-tooltip="Copy the summary" data-tooltip-side="bottom">Copy</button> <button class="btn" id="other">Other</button></div>`;
  const shown = (p) => p.evaluate(() => document.getElementById("bh-tooltip")?.matches(":popover-open") ?? false);

  test("a slow move from the opener across the gap onto the tooltip keeps it open, and leaving both closes it (WCAG 1.4.13)", async () => {
    const { page: p, context } = await page(BODY);
    await p.hover("#tip");
    await p.waitForFunction(() => document.getElementById("bh-tooltip")?.matches(":popover-open"));
    const opener = await p.locator("#tip").boundingBox();
    const tip = await p.locator("#bh-tooltip").boundingBox();
    assert.ok(tip.y > opener.y + opener.height, "below the opener, with a gap");
    const x = opener.x + opener.width / 2;
    // One pixel at a time, from the opener's bottom edge to the tooltip's top: every step of the gap.
    for (let y = Math.floor(opener.y + opener.height) - 1; y <= Math.ceil(tip.y) + 2; y++) {
      await p.mouse.move(x, y);
      assert.equal(await shown(p), true, `still open at y=${y}`);
    }
    await p.mouse.move(5, 5);
    await p.waitForFunction(() => !document.getElementById("bh-tooltip").matches(":popover-open"));
    await context.close();
  });

  test("keyboard focus holds it while the pointer leaves, and hover holds it while focus leaves", async () => {
    const { page: p, context } = await page(BODY);
    await p.focus("#other");
    await p.keyboard.press("Shift+Tab");
    await p.waitForFunction(() => document.getElementById("bh-tooltip")?.matches(":popover-open"));
    await p.hover("#tip");
    await p.mouse.move(5, 5);
    await frames(p);
    assert.equal(await shown(p), true, "focus still holds it");
    await p.keyboard.press("Escape");
    assert.equal(await shown(p), false, "Esc closes it");
    await p.hover("#tip");
    await p.waitForFunction(() => document.getElementById("bh-tooltip")?.matches(":popover-open"));
    await p.evaluate(() => { document.getElementById("tip").focus(); document.getElementById("tip").blur(); });
    await frames(p);
    assert.equal(await shown(p), true, "hover still holds it");
    await context.close();
  });
});

describe("Mod", () => {
  test("a palette item's keys may say Mod: the chip and the binding are the platform's one modifier, and the item runs on it", async () => {
    const html = compose(`<title>t</title><button class="btn" data-open-palette>Commands</button><script>window.saved = 0;
      Basalt.init({ palette: { groups: [{ label: "File", items: [{ label: "Save", keys: ["Mod", "S"], onSelect: function () { window.saved++; } }] }] } });</script>`, { fonts: false }).html;
    const { page: p, context } = await openHtml(browser, html);
    await frames(p);
    const apple = await p.evaluate(() => /mac|ip(hone|ad|od)/i.test((navigator.userAgentData || navigator).platform || navigator.userAgent));
    await p.keyboard.press(apple ? "Meta+s" : "Control+s");
    assert.equal(await p.evaluate(() => window.saved), 1, "it runs on the platform's modifier");
    await p.keyboard.press(apple ? "Meta+k" : "Control+k");
    await p.waitForSelector(".palette");
    assert.equal(await p.locator(".palette [aria-keyshortcuts]").first().getAttribute("aria-keyshortcuts"), apple ? "Meta+S" : "Control+S");
    await context.close();
  });

  test("a toast action's keys written with Mod reach aria-keyshortcuts as the platform's key, not the word Mod", async () => {
    const html = compose(`<title>t</title><script>Basalt.init(); Basalt.toast({ title: "Deleted", home: "centre", action: { label: "Undo", keys: "Mod+Z", onClick: function () {} } });</script>`, { fonts: false }).html;
    const { page: p, context } = await openHtml(browser, html);
    const keys = await p.locator(".toast-action").getAttribute("aria-keyshortcuts");
    assert.match(keys, /^(Meta|Control)\+Z$/);
    await context.close();
  });
});
