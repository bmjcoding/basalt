// The app shell's gaps in the HTML skill (cimip-gaps-2, batch B4): the pane module's tab stop when content arrives after the page, and
// the small Nav in the rail. React's side is packages/react/test/app-shell-gaps.test.mjs. Synthetic data only: a build pipeline.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";

import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const near = (actual, expected, message, tolerance = 0.5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const frames = (page, n = 3) => page.evaluate((count) => new Promise((resolve) => { const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))); step(count); }), n);
const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;
const item = (href, glyph, label, current = false, size = 24) => `<li><a class="nav-item" href="#${href}"${current ? ' aria-current="page"' : ""}><span class="nav-pill"><span data-glyph="${glyph}" data-size="${size}"></span><span class="nav-label">${label}</span></span></a></li>`;

const APP = (main) => `<div class="app-shell">
  <aside class="app-sidebar">
    <div class="app-brand"><a class="brand" href="#" aria-label="Builds home"><span class="brand-full">${MARK}<span>Builds</span></span><span class="brand-rail">${MARK}</span></a></div>
    <div class="app-nav">
      <nav class="nav" aria-label="Primary"><ul class="nav-list">${item("runs", "home", "Runs", true)}${item("pipelines", "sources", "Pipelines")}</ul></nav>
      <nav class="nav" data-size="sm" aria-label="Pinned pipelines"><ul class="nav-list">${item("web", "plan", "web-app / main", true, 16)}${item("api", "plan", "api / release", false, 16)}</ul></nav>
    </div>
  </aside>
  <div class="app-column">
    <header class="app-header"><div class="app-bar"><h1 class="app-title">Build 1284</h1><span class="spacer"></span></div></header>
    <main class="app-main" id="main">${main}</main>
  </div>
</div>`;

const PANE = (lines) => `<div class="pane-layout"><div class="pane-grid">
  <div class="pane-page"><div style="height: 2400px"><p>Synthetic page.</p></div></div>
  <section class="pane" aria-label="Run details" id="pane">${Array.from({ length: lines }, (_, i) => `<p>Step ${i + 1} finished.</p>`).join("")}</section>
</div></div>`;

const open = (body, options = {}) => openHtml(browser, compose(`<title>t</title>${body}`, { fonts: false }).html, options);

describe("the pane module", () => {
  test("a pane that fits is no tab stop; content added later that makes it overflow makes it one, and taking it away undoes it", async () => {
    const { page, context, errors } = await open(APP(PANE(3)), { scheme: "dark", width: 1440 });
    assert.equal(await page.locator("#pane").getAttribute("tabindex"), null, "it fits");
    assert.equal(await page.locator("#pane").getAttribute("data-scroller"), "", "beside the page it is its own scroller");
    // Content arrives after the page (a later render, a fetch): new children, appended to the pane itself.
    await page.evaluate(() => { const pane = document.getElementById("pane"); for (let i = 0; i < 80; i++) { const p = document.createElement("p"); p.textContent = `Late step ${i + 1}.`; pane.append(p); } });
    await frames(page);
    const over = await page.locator("#pane").evaluate((el) => el.scrollHeight > el.clientHeight);
    assert.ok(over, "the pane now overflows");
    assert.equal(await page.locator("#pane").getAttribute("tabindex"), "0", "and is a tab stop");
    // A child that grows later (not a new child) is watched too.
    await page.evaluate(() => { const pane = document.getElementById("pane"); while (pane.children.length > 1) pane.lastElementChild.remove(); });
    await frames(page);
    assert.equal(await page.locator("#pane").getAttribute("tabindex"), null, "back to fitting, no tab stop");
    await page.evaluate(() => { document.getElementById("pane").firstElementChild.style.height = "3000px"; });
    await frames(page);
    assert.equal(await page.locator("#pane").getAttribute("tabindex"), "0", "a child that grows makes it overflow, and a tab stop");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("under the page (a narrow window) it is in the flow, no scroller and no tab stop", async () => {
    const { page, context } = await open(APP(PANE(80)), { scheme: "light", width: 900 });
    assert.equal(await page.locator("#pane").getAttribute("data-scroller"), null);
    assert.equal(await page.locator("#pane").getAttribute("tabindex"), null);
    assert.equal(await page.locator("#pane").evaluate((el) => getComputedStyle(el).position), "static");
    await context.close();
  });
});

describe("the small Nav in the rail", () => {
  for (const dir of ["ltr", "rtl"]) {
    for (const scheme of ["dark", "light"]) {
      test(`each small item is a 32px circle with its 16px glyph at the centre, on the main list's centre line (${dir}, ${scheme})`, async () => {
        const { page, context, errors } = await open(APP("<p>Synthetic page.</p>"), { scheme, width: 900 });
        await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
        await frames(page);
        assert.equal(await page.locator('.nav[data-size="sm"][data-collapsed]').count(), 1, "the script collapses the small list in the rail");
        const pills = await page.locator('.nav[data-size="sm"] .nav-pill').evaluateAll((els) => els.map((el) => {
          const r = el.getBoundingClientRect();
          const g = el.querySelector("svg, [data-glyph]").getBoundingClientRect();
          return { w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, gx: g.x + g.width / 2, gy: g.y + g.height / 2, gw: g.width, pad: getComputedStyle(el).paddingInlineStart };
        }));
        const main = await page.locator('.nav:not([data-size]) .nav-pill').first().evaluate((el) => { const r = el.getBoundingClientRect(); return r.x + r.width / 2; });
        for (const p of pills) {
          assert.deepEqual([p.w, p.h, p.gw, p.pad], [32, 32, 16, "0px"]);
          near(p.gx, p.cx, "the glyph is centred across the circle");
          near(p.gy, p.cy, "and down it");
          near(p.cx, main, "on the main list's centre line");
        }
        assert.deepEqual(errors, []);
        await context.close();
      });
    }
  }
});
