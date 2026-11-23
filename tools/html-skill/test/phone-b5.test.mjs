// The HTML skill's half of cimip-gaps-2 batch B5 (no-council path, DECISIONS 226 and 265; Astra's fix pass 1; the toast stack is the owner's pick,
// DECISIONS 274): links stacked in a column never take each other's taps, and under 720 the toast stack hangs from the bar. The React half is
// packages/react/test/phone-pinned.test.mjs. Synthetic data. Written while test runs were paused (DECISIONS 271).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (body) => compose(`<title>B5</title>${body}`, { fonts: false }).html;

describe("links stacked one per line", () => {
  const STACK = `<div class="stack" style="--gap: 0; padding: 16px"><a href="#draft">Open the draft</a><a href="#comments">Read the 4 comments</a><a href="#history">See the version history</a></div>`;
  for (const [name, options] of [["a mouse under 720", { width: 390 }], ["a finger", { width: 390, touch: true }]]) {
    test(`two bare links on consecutive lines (${name}): every point of a link's own words is that link's, and the lines do not move`, async () => {
      const { page, context } = await openHtml(browser, html(STACK), options);
      const got = await page.evaluate(() => {
        const links = [...document.querySelectorAll(".stack > a")];
        const misses = [];
        for (const a of links) {
          const range = document.createRange();
          range.selectNodeContents(a);
          const r = range.getBoundingClientRect();
          for (let y = Math.ceil(r.top) + 1.5; y < r.bottom - 1; y += 1) {
            const hit = document.elementFromPoint(r.left + r.width / 2, y)?.closest("a");
            if (hit !== a) misses.push(`${a.textContent}@${y}:${hit?.textContent}`);
          }
        }
        const lh = parseFloat(getComputedStyle(links[0]).lineHeight);
        const tops = links.map((a) => { const range = document.createRange(); range.selectNodeContents(a); return range.getBoundingClientRect().top; });
        return { misses, lh, steps: tops.slice(1).map((t, i) => t - tops[i]) };
      });
      assert.deepEqual(got.misses, []);
      for (const step of got.steps) assert.ok(Math.abs(step - got.lh) <= 0.5, `one line apart: ${got.steps} (line ${got.lh})`);
      await context.close();
    });
  }

  test("links side by side in a row keep their whole 44px boxes (the trim is the column's only)", async () => {
    const { page, context } = await openHtml(browser, html(`<nav aria-label="Footer" style="display: flex; gap: 16px; padding: 16px"><a href="#a">Privacy</a><a href="#b">Terms</a></nav>`), { width: 390, touch: true });
    const heights = await page.evaluate(() => [...document.querySelectorAll("nav a")].map((a) => a.getBoundingClientRect().height));
    for (const h of heights) assert.ok(h >= 44, `a 44px box: ${heights}`);
    await context.close();
  });
});

describe("the toast stack on a phone", () => {
  const PAGE = `<header class="app-header"><div class="app-bar"><h1 class="app-title">Weekly check-in</h1></div></header><main style="padding: 16px"><div style="height: 1400px"></div><button class="btn" data-variant="primary" id="send">Send check-in</button></main><script>addEventListener("load", () => { Basalt.toast({ title: "Draft saved", home: "page", timeout: 0 }); Basalt.toast({ title: "Check-in sent", home: "page", timeout: 0 }); });</script>`;
  test("under 720 it hangs from the bar, space-2 below its line, and the one behind peeks below the front one; from 720 it is bottom right", async () => {
    const { page, context } = await openHtml(browser, html(PAGE), { width: 390, touch: true });
    await page.waitForFunction(() => document.querySelectorAll(".toast").length === 2);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    const got = await page.evaluate(() => {
      const bar = document.querySelector(".app-header").getBoundingClientRect();
      const toasts = [...document.querySelectorAll(".toast")].map((t) => t.getBoundingClientRect());
      const front = toasts.reduce((a, b) => (a.top <= b.top ? a : b));
      const behind = toasts.find((t) => t !== front);
      return { bar: bar.bottom, front: front.top, left: front.left, right: front.right, frontBottom: front.bottom, behindBottom: behind.bottom };
    });
    assert.ok(Math.abs(got.front - (got.bar + 8)) <= 1, `space-2 under the bar: ${got.front} vs ${got.bar}`);
    assert.ok(Math.abs(got.left - 16) <= 1 && Math.abs(got.right - 374) <= 1, `full width less the insets: ${got.left}..${got.right}`);
    assert.ok(got.behindBottom > got.frontBottom, "the toast behind peeks below");
    await context.close();
    const wide = await openHtml(browser, html(PAGE), { width: 1440 });
    await wide.page.waitForFunction(() => document.querySelectorAll(".toast").length === 2);
    await wide.page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    const bottom = await wide.page.evaluate(() => Math.max(...[...document.querySelectorAll(".toast")].map((t) => t.getBoundingClientRect().bottom)));
    assert.ok(Math.abs(bottom - (900 - 16)) <= 1, `bottom right from 720: ${bottom}`);
    await wide.context.close();
  });
});
