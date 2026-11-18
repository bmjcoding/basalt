// The sixth fix batch's HTML-skill half (stream components-nov14): the narrow menu holds focus, and a glyph redrawn when its link tab's current mark moves.
// The React half is packages/react/test/audit-fix-c6.test.mjs. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = (body, options) => compose(body, { fonts: false, ...options }).html;

// ---- The narrow menu holds focus ---------------------------------------------------------------------------------------------
const BAR = (loops) => `<title>Menu</title><header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Placeholder home">Placeholder</a><nav class="topbar-links" aria-label="Primary"><a href="#product">Product</a><a href="#docs" aria-current="page">Docs</a><a href="#pricing">Pricing</a></nav><span class="spacer"></span>${loops ? `<button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>` : ""}<a class="btn topbar-action" data-variant="primary" href="#start">Get started</a></div></header><main class="page"><p><a href="#behind" id="behind">Behind the menu</a> <button id="behind-button">Page button</button></p></main>`;

const name = (p) => p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute("aria-label") ?? a.textContent?.trim() ?? a.tagName) : null; });
const inMenu = (p) => p.evaluate(() => !!document.activeElement?.closest("dialog.topbar-menu"));

for (const scheme of ["light", "dark"]) {
  for (const loops of [false, true]) {
    describe(`the skill's narrow menu holds focus, ${loops ? "with" : "without"} a loops toggle (${scheme}, 390)`, () => {
      test("Tab from the last row goes to the first and Shift+Tab from the first goes to the last; focus never reaches the page behind", async () => {
        const { page: p, context, errors } = await openHtml(browser, page(BAR(loops)), { scheme, width: 390, touch: true });
        try {
          await p.locator(".topbar-menu-trigger").click();
          await p.waitForSelector("dialog.topbar-menu[open]");
          await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          const first = await name(p);
          assert.equal(first, "Close menu", "focus lands on Close");
          const seen = [first];
          for (let step = 0; step < 14; step += 1) {
            await p.keyboard.press("Tab");
            assert.ok(await inMenu(p), `after ${step + 1} Tab presses focus is on ${JSON.stringify(await name(p))}, outside the menu`);
            const now = await name(p);
            if (now === first) break;
            seen.push(now);
          }
          assert.ok(seen.length >= 4, `the menu has ${seen.length} stops: ${seen.join(", ")}`);
          assert.equal(await name(p), first, "Tab from the last row goes to the first");
          await p.keyboard.press("Shift+Tab");
          assert.ok(await inMenu(p), "Shift+Tab from the first stays in the menu");
          assert.equal(await name(p), seen.at(-1), "Shift+Tab from the first goes to the last");
          assert.deepEqual(errors, []);
        } finally { await context.close(); }
      });
    });
  }
}

// ---- A glyph follows its ancestor's current mark ---------------------------------------------------------------------------------
// glyph.js drew each glyph once, so a page that moves `aria-current` without a reload (a client-side route) left the old current link's icon in its selected
// form and the new one's at rest. The glyph is drawn again when the mark moves on an ancestor, by an observer on the lists that hold such glyphs only.
const NAV = (current) => `<title>Nav</title><nav class="nav" aria-label="Primary"><ul class="nav-list">
  <li><a class="nav-item" id="a" href="/" ${current === "a" ? 'aria-current="page"' : ""}><span class="nav-pill"><span data-glyph="home" data-size="24"></span><span class="nav-label">Home</span></span></a></li>
  <li><a class="nav-item" id="b" href="/inbox" ${current === "b" ? 'aria-current="page"' : ""}><span class="nav-pill"><span data-glyph="notifications" data-size="24"></span><span class="nav-label">Inbox</span></span></a></li>
  <li><a class="nav-item" id="c" href="/settings" ${current === "c" ? 'aria-current="page"' : ""}><span class="nav-pill"><span data-glyph="settings" data-size="24"></span><span class="nav-label">Settings</span></span></a></li>
</ul></nav><button id="menu" class="btn" data-variant="ghost" data-icon-only aria-label="Menu"><span data-glyph="menu"></span></button>`;
const ROW = (current) => `<title>Rows</title><ul>
  <li id="a" ${current === "a" ? "data-current" : ""}><span data-glyph="home"></span> Home</li>
  <li id="b" ${current === "b" ? "data-current" : ""}><span data-glyph="notifications"></span> Inbox</li>
</ul>`;
// The mask ids a glyph draws (bg1, bg2, ...) count up as glyphs are drawn: the same drawing carries another number.
const drawings = (p) => p.evaluate(() => Object.fromEntries([...document.querySelectorAll("li")].map((li) => [li.id || li.querySelector("a")?.id, li.querySelector("svg")?.outerHTML.replace(/bg\d+/g, "bg")])));

for (const scheme of ["light", "dark"]) {
  describe(`A5-12: a glyph is drawn again when its ancestor's current mark moves (${scheme})`, () => {
    for (const [label, body, move] of [
      ["aria-current on the link", NAV, (p) => p.evaluate(() => { document.getElementById("a").removeAttribute("aria-current"); document.getElementById("b").setAttribute("aria-current", "page"); })],
      ["aria-current set to false and then to page", NAV, (p) => p.evaluate(() => { document.getElementById("a").setAttribute("aria-current", "false"); document.getElementById("b").setAttribute("aria-current", "page"); })],
      ["data-current on the row", ROW, (p) => p.evaluate(() => { document.getElementById("a").removeAttribute("data-current"); document.getElementById("b").setAttribute("data-current", ""); })],
    ]) {
      test(`after a client-side route the old current glyph is at rest and the new one is selected, as a fresh page draws them (${label})`, async () => {
        const first = await openHtml(browser, page(body("a")), { scheme });
        const fresh = await openHtml(browser, page(body("b")), { scheme });
        try {
          const before = await drawings(first.page);
          const want = await drawings(fresh.page);
          assert.notEqual(before.a, want.a, "the two drawings of a glyph differ");
          await move(first.page);
          await first.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          const after = await drawings(first.page);
          assert.equal(after.a, want.a, "the link that is no longer current is drawn at rest");
          assert.equal(after.b, want.b, "the link that became current is drawn selected");
          assert.deepEqual(first.errors, []);
        } finally { await first.context.close(); await fresh.context.close(); }
      });
    }

    test("a glyph whose ancestors did not change is not drawn again, and a glyph outside any list is watched by nothing", async () => {
      const { page: p, context } = await openHtml(browser, page(NAV("a")), { scheme });
      try {
        await p.evaluate(() => { document.querySelector("#c svg").__kept = true; document.querySelector("#menu svg").__kept = true; });
        await p.evaluate(() => { document.getElementById("a").removeAttribute("aria-current"); document.getElementById("b").setAttribute("aria-current", "page"); });
        await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        assert.equal(await p.evaluate(() => [document.querySelector("#c svg").__kept, document.querySelector("#menu svg").__kept]).then((k) => k.join()), "true,true");
      } finally { await context.close(); }
    });

    test("no observer is placed on the document, <html> or <body>: each one watches a list", async () => {
      const html = page(NAV("a"));
      const context = await browser.newContext({ colorScheme: scheme });
      const p = await context.newPage();
      await p.addInitScript(() => {
        window.__targets = [];
        const observe = MutationObserver.prototype.observe;
        MutationObserver.prototype.observe = function (target, options) { window.__targets.push(`${target.nodeName.toLowerCase()}${options?.subtree ? " subtree" : ""}`); return observe.call(this, target, options); };
      });
      await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
      await p.goto("https://basalt.test/");
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      try {
        const targets = await p.evaluate(() => window.__targets);
        assert.ok(targets.includes("ul subtree"), `the glyphs' list is watched: ${targets.join(", ")}`);
        assert.ok(!targets.some((t) => /^(#document|html|body)\b/.test(t) && t.includes("subtree")), `no whole-document observer: ${targets.join(", ")}`);
      } finally { await context.close(); }
    });
  });
}
