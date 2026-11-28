// Micro-details m7 in the HTML skill (navigation, scroll and history; DECISIONS 405 and 409, micro-details/m7/decision.md): the tabs' `tabchange` event,
// `Basalt.selectTab`, a fragment followed on load, at a same-page link's click and on Back and Forward, `data-tabs-hash`'s replace; `Basalt.setFilter`; and
// the app shell's block-axis overscroll under a fine pointer. Composed pages in Chromium, served from https://basalt.test/ so history and fragments are real.
// Synthetic data in two unlike domains (a tide gauge and a seed library).
// Tests are paused (DECISIONS 359): written with the batch, not run.
//
// Two things the decision says these tests must show per engine the harness has (only Chromium here): a link's click listener runs before the browser
// scrolls to its fragment (the link tests below land on a heading inside a panel that was hidden at the click), and a focusable fragment target takes focus
// on load (React's micro-m7 test, the list's foot across a document load).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml, repoRoot } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = (body, head = "") => compose(`<title>m7</title>${head}${body}`, { fonts: false }).html;
const filler = (n) => Array.from({ length: n }, (_, i) => `<p>Reading ${i + 1}: the gauge held steady through the hour.</p>`).join("");

// Two groups: the gauge's three panels (the last holds a heading far below the fold) and the seed library's two. A link list above them, a link to another
// page, a modified link and a new-tab link.
const TABS = (attrs = "") => `<main class="page">
  <h1>Harbour gauge</h1>
  <p><a id="to-heading" href="#surge-notes">Surge notes</a> · <a id="to-panel" href="#p-week">This week</a> · <a id="to-other" href="/other#surge-notes">Elsewhere</a>
    · <a id="to-blank" target="_blank" href="#surge-notes">New tab</a> · <a id="to-download" download href="#surge-notes">Download</a></p>
  <div data-tabs ${attrs} id="gauge">
    <div class="tabs-scroll"><div class="tabs" role="tablist" aria-label="Readings">
      <button class="tab" role="tab" id="t-today" aria-controls="p-today" aria-selected="true">Today</button>
      <button class="tab" role="tab" id="t-week" aria-controls="p-week" aria-selected="false">This week</button>
      <button class="tab" role="tab" id="t-year" aria-controls="p-year" aria-selected="false">This year</button>
    </div></div>
    <div class="tabpanel" id="p-today" role="tabpanel" aria-labelledby="t-today">${filler(4)}</div>
    <div class="tabpanel" id="p-week" role="tabpanel" aria-labelledby="t-week" hidden>${filler(4)}</div>
    <div class="tabpanel" id="p-year" role="tabpanel" aria-labelledby="t-year" hidden>${filler(60)}<h2 id="surge-notes">Surge notes</h2><p>Two surges in March.</p></div>
  </div>
  <div data-tabs id="seeds">
    <div class="tabs-scroll"><div class="tabs" role="tablist" aria-label="Seeds">
      <button class="tab" role="tab" id="t-beans" aria-controls="p-beans" aria-selected="true">Beans</button>
      <button class="tab" role="tab" id="t-squash" aria-controls="p-squash" aria-selected="false">Squash</button>
    </div></div>
    <div class="tabpanel" id="p-beans" role="tabpanel" aria-labelledby="t-beans">Runner, borlotti.</div>
    <div class="tabpanel" id="p-squash" role="tabpanel" aria-labelledby="t-squash" hidden>Butternut, crown prince.</div>
  </div>
  ${filler(40)}
</main>`;

/**
 * A cold load: a new context whose first navigation is the fragment's URL itself (never a fragment change after "/"), so the module wires on a document the
 * browser opened at that fragment. `init` runs before the page's scripts.
 */
async function cold(html, at, { init, width = 1440 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await context.newPage();
  if (init) await p.addInitScript(init);
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
  await p.goto(`https://basalt.test${at}`);
  await p.evaluate(() => document.fonts.ready);
  return { page: p, context };
}

const chosen = (p, group) => p.evaluate((g) => document.querySelector(`#${g} [role="tab"][aria-selected="true"]`).id, group);
const scrollY = (p) => p.evaluate(() => window.scrollY);
const inView = (p, id) => p.evaluate((i) => { const r = document.getElementById(i).getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }, id);
// Counts every scroll the script makes (scrollIntoView, scrollTo, scrollBy, scrollTop), so a test can tell the browser's own scroll from the script's.
const COUNT_SCROLLS = () => {
  window.__scripted = 0;
  for (const [proto, names] of [[Element.prototype, ["scrollIntoView", "scrollTo", "scrollBy"]], [window, ["scrollTo", "scrollBy"]]]) {
    for (const name of names) { const original = proto[name]; proto[name] = function (...args) { window.__scripted += 1; return original.apply(this, args); }; }
  }
};

describe("tabs: tabchange and Basalt.selectTab", () => {
  test("tabchange fires once for a click and once for an arrow, with the panel's id, and not for the tab already chosen", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS()));
    await p.evaluate(() => { window.__events = []; document.addEventListener("tabchange", (e) => window.__events.push([e.target.id, e.detail.value, e.detail.tab.id, e.detail.panel.id, e.bubbles, e.cancelable])); });
    await p.click("#t-week");
    await p.click("#t-week");
    await p.keyboard.press("ArrowRight");
    await p.click("#t-squash");
    assert.deepEqual(await p.evaluate(() => window.__events), [
      ["gauge", "p-week", "t-week", "p-week", true, false],
      ["gauge", "p-year", "t-year", "p-year", true, false],
      ["seeds", "p-squash", "t-squash", "p-squash", true, false],
    ]);
    await context.close();
  });

  test("wiring dispatches nothing; Basalt.selectTab by tab, by tab id and by panel id selects with no event, focus move, scroll or write", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS()));
    await p.evaluate(() => { window.__events = 0; document.addEventListener("tabchange", () => { window.__events += 1; }); });
    await p.focus("#to-panel");
    const before = await p.evaluate(() => [location.href, history.length, window.scrollY]);
    const found = await p.evaluate(() => [Basalt.selectTab("p-week"), Basalt.selectTab(document.getElementById("t-squash")), Basalt.selectTab("nothing-here")]);
    assert.deepEqual(found, [true, true, false]);
    assert.equal(await chosen(p, "gauge"), "t-week");
    assert.equal(await chosen(p, "seeds"), "t-squash");
    assert.equal(await p.evaluate(() => document.getElementById("p-week").hidden), false);
    assert.deepEqual(await p.evaluate(() => [location.href, history.length, window.scrollY]), before);
    assert.equal(await p.evaluate(() => document.activeElement.id), "to-panel", "focus did not move");
    assert.equal(await p.evaluate(() => window.__events), 0);
    await context.close();
  });
});

describe("tabs: the fragment", () => {
  test("a cold load on #panel-id selects it in its own group only and brings it into view", async () => {
    const { page: p, context } = await cold(page(TABS()), "/#p-week");
    assert.equal(await chosen(p, "gauge"), "t-week");
    assert.equal(await chosen(p, "seeds"), "t-beans", "the other group is as it was");
    const top = await p.evaluate(() => document.getElementById("p-week").getBoundingClientRect().top);
    assert.ok(top >= 0 && top < 900, `the panel's top is on screen (${top})`);
    await context.close();
  });

  test("a cold load on an id inside a hidden panel selects that panel and the target is in view; under scroll-behavior: smooth it is there in the same frame", async () => {
    for (const smooth of [false, true]) {
      const html = page(TABS(), smooth ? `<style>html { scroll-behavior: smooth; }</style>` : "");
      const { page: p, context } = await cold(html, "/#surge-notes");
      assert.equal(await chosen(p, "gauge"), "t-year");
      // No frame is waited for: the script's scroll is instant.
      assert.ok(await inView(p, "surge-notes"), `the heading is in view${smooth ? " under smooth scrolling" : ""}`);
      await context.close();
    }
  });

  test("a reload does not scroll: the browser's restored place stands", async () => {
    const { page: p, context } = await cold(page(TABS()), "/#surge-notes", { init: COUNT_SCROLLS });
    // The reader's own place before the reload (the init script counts again from zero in the reloaded document).
    await p.evaluate(() => window.scrollTo(0, 300));
    await p.reload();
    assert.equal(await chosen(p, "gauge"), "t-year", "the fragment is still followed");
    assert.equal(await p.evaluate(() => window.__scripted), 0, "the script made no scroll on a reload");
    await context.close();
  });

  test("a real link (a mouse click, and Enter) to a heading inside a hidden panel below the fold selects it and lands on it; Back returns the place, with no scripted scroll", async () => {
    for (const how of ["click", "Enter"]) {
      const { page: p, context } = await openHtml(browser, page(TABS()));
      await p.evaluate(COUNT_SCROLLS);
      await p.evaluate(() => window.scrollTo(0, 120));
      // The reader's position is set; only what follows is counted.
      await p.evaluate(() => { window.__scripted = 0; });
      const start = await scrollY(p);
      if (how === "click") await p.click("#to-heading");
      else { await p.focus("#to-heading"); await p.keyboard.press("Enter"); }
      await p.waitForFunction(() => location.hash === "#surge-notes");
      assert.equal(await chosen(p, "gauge"), "t-year");
      assert.ok(await inView(p, "surge-notes"), `the heading is in view (${how})`);
      assert.equal(await p.evaluate(() => window.__scripted), 0, "the browser scrolled, not the script");
      await p.goBack();
      await p.waitForFunction(() => location.hash === "");
      assert.ok(Math.abs((await scrollY(p)) - start) <= 1, "Back returns the reader's previous scroll position");
      assert.equal(await p.evaluate(() => window.__scripted), 0);
      await context.close();
    }
  });

  test("a second press of that link after the reader changed tab selects and lands again (no hashchange fires for it)", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS()));
    await p.click("#to-heading");
    await p.waitForFunction(() => location.hash === "#surge-notes");
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.click("#t-today");
    assert.equal(await chosen(p, "gauge"), "t-today");
    await p.click("#to-heading");
    assert.equal(await chosen(p, "gauge"), "t-year");
    assert.ok(await inView(p, "surge-notes"));
    await context.close();
  });

  test("a modified link, a target=_blank link, a download link and a link to another page select nothing", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS()));
    // A listener on the window runs after the module's (on the document, bubbling), so the module sees each click unprevented and the page still stays put.
    await p.evaluate(() => window.addEventListener("click", (e) => { if (e.target.closest("a")) e.preventDefault(); }));
    for (const [id, modifiers] of [["to-heading", ["Shift"]], ["to-heading", ["Alt"]], ["to-heading", ["ControlOrMeta"]], ["to-blank", []], ["to-download", []], ["to-other", []]]) {
      await p.click(`#${id}`, { modifiers });
      assert.equal(await chosen(p, "gauge"), "t-today", `${id} ${modifiers.join("+")} selected nothing`);
    }
    await context.close();
  });

  test("a location.hash set by script selects without a scripted scroll; Back between two fragments selects without scrolling", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS()));
    await p.evaluate(COUNT_SCROLLS);
    await p.evaluate(() => { location.hash = "#p-week"; });
    await p.waitForFunction(() => document.querySelector('#gauge [aria-selected="true"]').id === "t-week");
    await p.evaluate(() => { location.hash = "#p-year"; });
    await p.waitForFunction(() => document.querySelector('#gauge [aria-selected="true"]').id === "t-year");
    await p.goBack();
    await p.waitForFunction(() => location.hash === "#p-week");
    assert.equal(await chosen(p, "gauge"), "t-week");
    await p.goForward();
    await p.waitForFunction(() => location.hash === "#p-year");
    assert.equal(await chosen(p, "gauge"), "t-year");
    assert.equal(await p.evaluate(() => window.__scripted), 0, "the script never scrolled");
    await context.close();
  });

  test("Back to an entry whose fragment names no panel leaves the panels as they are", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS()));
    await p.evaluate(() => { location.hash = "#p-week"; });
    await p.waitForFunction(() => location.hash === "#p-week");
    await p.click("#t-year");
    await p.goBack();
    await p.waitForFunction(() => location.hash === "");
    assert.equal(await chosen(p, "gauge"), "t-year");
    await context.close();
  });

  test("loading the module adds no listener; the first wiring adds one click on the document and one popstate and one hashchange on the window", async () => {
    const source = fs.readFileSync(path.join(repoRoot, "tools", "html-skill", "src", "modules", "tabs.js"), "utf8");
    const added = [];
    const fake = { addEventListener: (type) => added.push(type) };
    const B = { _: { step: () => {} } };
    new Function("window", "document", source)({ Basalt: B, addEventListener: fake.addEventListener }, { ...fake, querySelectorAll: () => [] });
    assert.deepEqual(added, [], "nothing at load");
    assert.equal(typeof B.selectTab, "function");
    const { page: p, context } = await openHtml(browser, page(TABS()).replace("<head>", `<head><script>window.__adds=[];for(const t of [EventTarget.prototype]){const a=t.addEventListener;t.addEventListener=function(type,...r){if(["click","popstate","hashchange"].includes(type))window.__adds.push((this===window?"window":this===document?"document":"element")+":"+type);return a.call(this,type,...r)}}</script>`));
    const adds = await p.evaluate(() => window.__adds.filter((a) => !a.startsWith("element")));
    assert.equal(adds.filter((a) => a === "document:click").length >= 1, true);
    assert.equal(adds.filter((a) => a === "window:popstate").length, 1);
    assert.equal(adds.filter((a) => a === "window:hashchange").length, 1);
    await context.close();
  });
});

describe("tabs: data-tabs-hash", () => {
  test("replaces (history length unchanged after Right, Right, Home), keeps history.state, and writes the panel's id", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS("data-tabs-hash")));
    await p.evaluate(() => history.replaceState({ kept: "tide" }, ""));
    const length = await p.evaluate(() => history.length);
    await p.focus("#t-today");
    for (const key of ["ArrowRight", "ArrowRight", "Home"]) await p.keyboard.press(key);
    assert.equal(await p.evaluate(() => history.length), length);
    assert.equal(await p.evaluate(() => location.hash), "#p-today");
    assert.deepEqual(await p.evaluate(() => history.state), { kept: "tide" });
    await p.click("#t-week");
    assert.equal(await p.evaluate(() => location.hash), "#p-week");
    await context.close();
  });

  test("without the attribute the address is untouched", async () => {
    const { page: p, context } = await openHtml(browser, page(TABS()));
    const before = await p.evaluate(() => [location.href, history.length]);
    await p.click("#t-week");
    await p.focus("#t-week");
    await p.keyboard.press("ArrowRight");
    assert.deepEqual(await p.evaluate(() => [location.href, history.length]), before);
    await context.close();
  });
});

describe("filter: Basalt.setFilter", () => {
  const FILTER = `<main class="page">
    <div class="filter" id="kind" data-label="Kind" data-for="lots" data-column="2">
      <label><input type="checkbox" value="bean">Bean</label>
      <label><input type="checkbox" value="squash">Squash</label>
      <label><input type="checkbox" value="pea" disabled>Pea</label>
    </div>
    <p class="filter-result" data-for="lots" data-noun="lots">Showing 4 of 4 lots</p>
    <div class="table-wrap" id="lots"><table class="table"><thead><tr><th>Lot</th><th>Kind</th></tr></thead><tbody>
      <tr><td>A1</td><td data-value="bean">Bean</td></tr><tr><td>A2</td><td data-value="squash">Squash</td></tr>
      <tr><td>A3</td><td data-value="bean">Bean</td></tr><tr><td>A4</td><td data-value="pea">Pea</td></tr>
    </tbody></table></div>
  </main>`;
  test("sets the control, narrows the table, ignores unknown and disabled values, speaks the result once after its delay and dispatches no filterchange", async () => {
    const { page: p, context } = await openHtml(browser, page(FILTER));
    await p.evaluate(() => { window.__changes = 0; document.addEventListener("filterchange", () => { window.__changes += 1; }); });
    const set = await p.evaluate(() => Basalt.setFilter("kind", ["squash", "bean", "kale", "pea"]));
    assert.deepEqual(set, ["bean", "squash"], "in the options' order; unknown and disabled values dropped");
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#kind input")].map((i) => i.checked)), [true, true, false]);
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#lots tbody tr")].map((r) => r.hidden)), [false, false, false, true]);
    assert.equal(await p.evaluate(() => document.querySelector(".filter-result [aria-hidden]").textContent), "Showing 3 of 4 lots", "shown at once");
    const spoken = () => p.evaluate(() => document.querySelector('.filter-result [role="status"]').textContent);
    assert.equal(await spoken(), "Showing 4 of 4 lots", "not spoken yet");
    await p.waitForTimeout(450);
    assert.equal(await spoken(), "Showing 3 of 4 lots");
    assert.deepEqual(await p.evaluate(() => Basalt.setFilter(document.getElementById("kind"), [])), []);
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("#lots tbody tr")].map((r) => r.hidden)), [false, false, false, false]);
    assert.equal(await p.evaluate(() => window.__changes), 0);
    await context.close();
  });
});

describe("app-shell: the block axis does not bounce under a fine pointer", () => {
  const SHELL = `<div class="app-shell"><div class="app-column"><main class="app-main"><h1>Seed library</h1>${filler(50)}</main></div></div>`;
  const root = (p) => p.evaluate(() => { const s = getComputedStyle(document.documentElement); return [s.overscrollBehaviorY, s.overscrollBehaviorX]; });
  test("with an app shell and a fine pointer the root computes none on the block axis and auto on the inline axis", async () => {
    const { page: p, context } = await openHtml(browser, page(SHELL));
    assert.deepEqual(await root(p), ["none", "auto"]);
    await context.close();
  });
  test("without a shell the root is auto", async () => {
    const { page: p, context } = await openHtml(browser, page(`<main class="page">${filler(50)}</main>`));
    assert.deepEqual(await root(p), ["auto", "auto"]);
    await context.close();
  });
  test("under a coarse pointer the root is auto (a device with both pointers cannot be emulated in this harness)", async () => {
    const { page: p, context } = await openHtml(browser, page(SHELL), { touch: true, width: 390 });
    assert.deepEqual(await root(p), ["auto", "auto"]);
    await context.close();
  });
});
