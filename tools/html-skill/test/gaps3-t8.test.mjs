// cimip-gaps-3, topic t8 in the HTML skill (DECISIONS 407), beside packages/react/test/gaps3-t8.test.mjs: the search dialog's query fades at each side that
// hides more while the field is not focused and is plain while it is (search.js watches the input only while it holds words, and measures again on input,
// focus, blur and the next frame, and as the dialog opens); a placeholder wider than its room ends in an ellipsis on `.search-input` and on a bare
// `.input[type="search"]`, whose words keep their plain cut. The search module's cap is re-measured in modules.json (compose.test.mjs holds every module to its
// cap). Synthetic data (a ferry timetable). Written and not run: tests are paused (DECISIONS 359).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const LONG = "Ferry from Harbour Quay to North Island, weekday sailings after six, and the Sunday boat that calls at the lighthouse pier";
const BODY = (value) => `<button class="btn" data-dialog-open="#q">Search</button>
<dialog class="panel float modal dialog search" id="q" aria-label="Search the timetable"><form class="search-form" role="search"><label class="search-field"><span data-glyph="search"></span><span class="visually-hidden">Search sailings</span><input class="search-input" type="search" placeholder="Sailings, piers, islands, operators and the days they run, by week or by season" value="${value}"></label><button type="button" class="btn search-close" data-variant="ghost" data-icon-only data-edge="end" aria-label="Close search" data-dialog-close><span data-glyph="close"></span></button></form>
<p class="search-count">2 sailings</p><ul class="search-results"></ul></dialog>
<div class="field" style="width: 200px"><label class="label" for="bare">Find a pier</label><input class="input" id="bare" type="search" placeholder="Pier, island or operator, by name or by code"></div>
<script>addEventListener("load", function () { document.getElementById("q").showModal(); });</script>`;
const frame = (p) => p.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
const fade = (p, s) => p.evaluate((s) => { const el = document.querySelector(s); return { mode: el.getAttribute("data-fade"), mask: getComputedStyle(el).maskImage, r: parseFloat(el.style.getPropertyValue("--_fade-r")) || 0 }; }, s);

for (const scheme of ["dark", "light"]) {
  describe(`the search dialog's query (${scheme})`, () => {
    test("fades at rest, is plain while focused, and has no watcher once empty", async () => {
      const { page, errors } = await openHtml(browser, compose(`<title>Search</title>${BODY(LONG)}`, { fonts: true }).html, { scheme });
      await page.waitForSelector("dialog.search[data-held]");
      await settle(page);
      await page.locator(".search-input").focus();
      assert.equal((await fade(page, ".search-input")).mask, "none", "focused: a plain cut");
      await page.locator(".search-close").focus();
      await frame(page);
      const rest = await fade(page, ".search-input");
      assert.equal(rest.mode, "inline");
      assert.equal(rest.r, 20, "scrolled to the start: the end fades");
      assert.notEqual(rest.mask, "none");
      await page.locator(".search-input").fill("");
      await frame(page);
      assert.equal((await fade(page, ".search-input")).mode, null);
      await page.locator(".search-input").fill(LONG);
      await page.locator(".search-close").focus();
      await frame(page);
      assert.equal((await fade(page, ".search-input")).mode, "inline", "words again, the watcher again");
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("a placeholder wider than its room ends in an ellipsis on the dialog's field and on a bare search input; the bare input's words are never masked", async () => {
      const { page } = await openHtml(browser, compose(`<title>Search</title>${BODY("")}`, { fonts: true }).html, { scheme });
      await page.waitForSelector("dialog.search[data-held]");
      const overflow = await page.evaluate(() => [".search-input", "#bare"].map((s) => getComputedStyle(document.querySelector(s)).textOverflow));
      assert.deepEqual(overflow, ["ellipsis", "ellipsis"]);
      await page.evaluate((v) => { const el = document.getElementById("bare"); el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }, LONG);
      await frame(page);
      const bare = await page.evaluate(() => { const el = document.getElementById("bare"); return { overflow: getComputedStyle(el).textOverflow, fade: el.getAttribute("data-fade"), mask: getComputedStyle(el).maskImage }; });
      assert.deepEqual(bare, { overflow: "clip", fade: null, mask: "none" }, "one box that draws its own boundary keeps its plain cut");
      await page.close();
    });
  });
}
