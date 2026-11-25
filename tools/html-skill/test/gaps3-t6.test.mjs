// cimip-gaps-3, topic t6 in the HTML skill (the council's decision, DECISIONS 385): the palette's foot, count and empty block (with a page's template), a
// row that cannot run in the palette and the command list, the loop hold as a menu's checkbox row, .menu-text, a code block's line numbers and its sideways
// line, the rich-text module, and the navigation label at 18/26. Synthetic data in two unlike domains (a recipe box and a build server). Written while tests
// are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (body) => compose(`<title>t6</title>${body}`, { fonts: false }).html;
async function open(body, options = {}) {
  const opened = await openHtml(browser, html(body), { scheme: "dark", ...options });
  await settle(opened.page);
  return opened;
}
const axe = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(() => globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => v.id)));
};

const BUILDS = { groups: [{ label: "Builds", items: [
  { id: "deploy", label: "Deploy main", unavailable: "The last build failed, so there is nothing to deploy until a build passes.", keys: ["⌘", "D"] },
  { id: "retry", label: "Retry build", href: "#retried" },
  { id: "logs", label: "Open logs", href: "#logs" },
] }] };
const PALETTE = (extra = "") => `<button class="btn" data-open-palette data-noun="build">Commands</button><script type="application/json" data-palette>${JSON.stringify(BUILDS)}</script>${extra}`;

describe("the palette", () => {
  test("the foot counts with data-noun; nothing is spoken on opening; the count changes as the search does", async () => {
    const { page, context } = await open(PALETTE());
    await page.locator("[data-open-palette]").click();
    await page.locator(".palette input").waitFor();
    const count = () => page.locator(".palette .command-count > span[aria-hidden='true']").textContent();
    assert.equal(await count(), "3 builds");
    assert.equal(await page.locator(".palette .command-count [role='status']").textContent(), "", "its first text is not announced");
    await page.keyboard.type("logs");
    assert.equal(await count(), "1 of 3");
    assert.ok((await page.locator(".palette .command-foot").boundingBox()).height >= 36);
    await context.close();
  });

  test("an unavailable row is lit and reached; Enter and a press run nothing, close nothing and say the reason each time; it binds no keys", async () => {
    const { page, context } = await open(PALETTE());
    await page.locator("[data-open-palette]").click();
    await page.locator(".palette input").waitFor();
    const row = page.locator(".palette .row[data-unavailable]");
    assert.equal(await row.getAttribute("aria-disabled"), "true");
    assert.equal(await row.getAttribute("aria-selected"), "true", "it is first, so it is lit");
    assert.equal(await row.locator(".kbd").count(), 0, "no key chip");
    const reasons = [];
    await page.exposeFunction("heard", (t) => reasons.push(t));
    await page.evaluate(() => { const line = document.querySelector(".palette [data-reason]"); new MutationObserver(() => { if (line.textContent) window.heard(line.textContent); }).observe(line, { childList: true, characterData: true, subtree: true }); });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    await row.click();
    await page.waitForTimeout(30);
    assert.equal(reasons.length, 3);
    assert.equal(await page.locator(".palette").count(), 1, "nothing closed");
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".palette input")), true, "focus stays in the field");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowDown");
    assert.equal(await row.getAttribute("aria-selected"), "true", "the arrows land on it, and wrap");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Meta+d");
    assert.equal(await page.evaluate(() => location.hash), "", "its keys bind nothing");
    await context.close();
  });

  test("the empty block: the sentence and Clear search (Enter on it clears and focuses the field), Tab cycles to it, and the band takes the −2 ring", async () => {
    const { page, context } = await open(PALETTE());
    await page.locator("[data-open-palette]").click();
    await page.locator(".palette input").waitFor();
    await page.keyboard.type("zzq");
    assert.equal(await page.locator(".palette .command-none p").textContent(), "Nothing matches “zzq”.");
    assert.equal(await page.evaluate(() => !!document.querySelector(".palette [role=listbox] .command-none")), false, "outside the listbox");
    assert.equal(await page.locator(".palette .input-row").evaluate((el) => getComputedStyle(el).outlineOffset), "-2px");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Clear search");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".palette input").inputValue(), "");
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".palette input")), true);
    await context.close();
  });

  test("a <template data-empty> replaces the sentence and the button; a [data-clear] in it clears the search", async () => {
    const { page, context } = await open(PALETTE(`<template data-empty><p>No build by that name.</p><button type="button" class="btn" data-size="sm" data-clear>Start again</button></template>`));
    await page.locator("[data-open-palette]").click();
    await page.locator(".palette input").waitFor();
    await page.keyboard.type("zzq");
    assert.equal(await page.locator(".palette .command-none p").textContent(), "No build by that name.");
    await page.locator(".palette .command-none [data-clear]").click();
    assert.equal(await page.locator(".palette input").inputValue(), "");
    await context.close();
  });
});

describe("the command list", () => {
  const LIST = (attrs = "", extra = "") => `<div style="width: 640px"><div class="command-list" data-label="Console" ${attrs}><script type="application/json" data-commands>${JSON.stringify(BUILDS)}</script>${extra}</div></div>`;

  test("data-count replaces the line; an unavailable row says its reason; a template replaces the empty block", async () => {
    const { page, context } = await open(LIST(`data-count="About 40 builds"`, `<template data-empty><p>No build by that name.</p></template>`));
    assert.equal(await page.locator(".command-count > span[aria-hidden='true']").textContent(), "About 40 builds");
    await page.locator(".command-list input").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    assert.equal(await page.locator(".command-list [data-reason]").textContent(), "The last build failed, so there is nothing to deploy until a build passes.");
    assert.equal(await page.evaluate(() => location.hash), "");
    await page.keyboard.type("zzq");
    assert.equal(await page.locator(".command-none:not([hidden]) p").textContent(), "No build by that name.");
    await context.close();
  });

  test("the reason wraps at 390: never cut", async () => {
    const { page, context } = await open(LIST(), { width: 390, touch: true });
    const reason = page.locator(".row[data-unavailable] .row-description");
    assert.equal(await reason.evaluate((el) => el.scrollWidth <= el.clientWidth && getComputedStyle(el).whiteSpace === "normal"), true);
    await context.close();
  });
});

describe("the loop hold in a menu", () => {
  test("a [role=menuitemcheckbox][data-loops-toggle] row shows the hold in aria-checked and commits a press once; it never takes aria-pressed", async () => {
    const { page, context } = await open(`<button class="btn" popovertarget="m">Options</button><div class="panel float menu" popover id="m"><button class="menu-item" role="menuitemcheckbox" aria-checked="false" data-loops-toggle><span class="menu-item-label">Pause animations</span></button></div>`);
    await page.locator("[popovertarget=m]").click();
    const row = page.locator("[data-loops-toggle]");
    await row.click();
    assert.equal(await row.getAttribute("aria-checked"), "true");
    assert.equal(await row.getAttribute("aria-pressed"), null);
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    assert.equal(await page.locator("#m").evaluate((el) => el.matches(":popover-open")), true, "the menu stays open");
    await row.click();
    assert.equal(await row.getAttribute("aria-checked"), "false");
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-loops")), false);
    await context.close();
  });
});

describe(".menu-text", () => {
  test("it describes its group, is skipped by the keys, and draws 13/18 tertiary", async () => {
    const { page, context } = await open(`<button class="btn" popovertarget="m">Sort</button><div class="panel float menu" popover id="m"><div role="group" aria-labelledby="g"><div class="menu-group-label" id="g">Order</div><p class="menu-text">Pinned recipes stay at the top whatever the order.</p><button class="menu-item" role="menuitemradio" aria-checked="true"><span class="menu-item-label">Newest first</span></button><button class="menu-item" role="menuitemradio" aria-checked="false"><span class="menu-item-label">Oldest first</span></button></div></div>`);
    await page.locator("[popovertarget=m]").focus();
    await page.keyboard.press("ArrowDown");
    const tree = await page.evaluate(() => { const t = document.querySelector(".menu-text"); return { described: t.closest("[role=group]").getAttribute("aria-describedby") === t.id, size: getComputedStyle(t).fontSize, line: getComputedStyle(t).lineHeight }; });
    assert.deepEqual(tree, { described: true, size: "13px", line: "18px" });
    await page.keyboard.press("ArrowUp");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Oldest first", "the keys skip the text");
    await context.close();
  });
});

describe("code", () => {
  test("data-line-numbers numbers every source line (CRLF, blank lines, no final newline), from data-start-line, and the copy takes no number", async () => {
    const { page, context } = await open(`<div class="code" data-line-numbers data-start-line="40"><pre class="code-body" tabindex="0" id="c"><code><span class="tok-k">make</span> bread\r\n\r\nrest <span class="tok-c">--hours\n2</span>\n</code></pre></div>`, { permissions: ["clipboard-read", "clipboard-write"] });
    const numbers = await page.locator(".code-number").evaluateAll((els) => els.map((el) => el.getAttribute("data-n")));
    assert.deepEqual(numbers, ["40", "41", "42", "43"]);
    // The HTML parser turns the markup's CRLF into LF; the copy is the code's text as the page holds it.
    assert.equal(await page.locator("#c code").evaluate((el) => el.textContent), "make bread\n\nrest --hours\n2\n", "the text is the code as written");
    assert.equal(await page.locator(".code-line").nth(3).locator(".tok-c").textContent(), "2", "a token that crosses a line keeps its colour on both");
    await context.close();
  });

  test("the sideways line shows only while the code overflows and is aria-hidden", async () => {
    const { page, context } = await open(`<div style="width: 320px"><div class="code"><pre class="code-body" tabindex="0"><code>curl --request POST https://builds.example.com/api/v2/pipelines/main/trigger --data '{}'</code></pre></div><div class="code"><pre class="code-body" tabindex="0"><code>ls</code></pre></div></div>`);
    const hints = page.locator(".code-hint");
    assert.equal(await hints.count(), 2);
    assert.equal(await hints.nth(0).isVisible(), true);
    assert.equal(await hints.nth(1).isVisible(), false);
    assert.equal(await hints.nth(0).getAttribute("aria-hidden"), "true");
    assert.equal(await hints.nth(0).textContent(), "Scroll sideways to see the long lines");
    await context.close();
  });
});

describe("rich-text", () => {
  for (const scheme of ["dark", "light"]) {
    test(`${scheme}: an 80-character identifier and a long address keep the column at 390; axe finds nothing`, async () => {
      const { page, context } = await open(`<main class="page"><div class="prose"><div class="rich-text"><p>Run <code>buildServerPipelineTriggerForTheMainBranchWithEveryCheckAndEveryArtifactKept</code> after the bake.</p><p>See https://builds.example.com/api/v2/pipelines/main/trigger/with/a/very/long/path and <a href="#n">the notes</a>.</p><h2>Notes</h2><pre><code>make bread --long-flag-that-runs-past-the-column-edge</code></pre></div></div></main>`, { scheme, width: 390, touch: true });
      const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: document.documentElement.clientWidth, h2: getComputedStyle(document.querySelector(".rich-text h2")).fontSize }));
      assert.equal(widths.page, widths.view);
      assert.equal(widths.h2, "14px");
      assert.deepEqual(await axe(page), []);
      await context.close();
    });
  }
});

describe("nav", () => {
  test("the label is 18/26", async () => {
    const { page, context } = await open(`<nav class="nav" aria-label="Main"><ul class="nav-list"><li><a class="nav-item" href="#a" aria-current="page"><span class="nav-pill"><span data-glyph="home" data-size="24"></span><span class="nav-label">Recipes</span></span></a></li></ul></nav>`);
    const label = await page.locator(".nav-label").evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]);
    assert.deepEqual(label, ["18px", "26px"]);
    await context.close();
  });
});
