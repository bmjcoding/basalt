// The HTML skill's notification centre after B7's review (cimip-gaps-2, DECISIONS 265): a group's count is only a whole number above 0, one unread
// rule for the row, the dot, the count and Mark all as read, setEntries keeps open groups and the focused entry, errors are never grouped, and the
// group's chevron is the disclosure's (to the end while closed, mirrored right to left, down while open). Synthetic data: a build pipeline.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (p, n = 3) => p.evaluate((count) => new Promise((resolve) => { let left = count; const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick)); requestAnimationFrame(tick); }), n);

/** A page with one bell built from `entries` (a JS expression), opened. `window.centre` is the handle. */
async function bell(entries, { dir = "ltr" } = {}) {
  const html = compose(`<title>n</title><div dir="${dir}" style="padding: 16px"><span id="bell"></span></div><script>Basalt.init(); window.hit = false; window.__x = function () { window.hit = true; };
    window.centre = Basalt.notifications('#bell', { entries: ${entries}, onSelect: function (e) { window.chosen = e.id; } }); window.centre.open();</script>`, { fonts: false }).html;
  const { page, context } = await openHtml(browser, html);
  await page.waitForSelector(".notifications:popover-open");
  await frames(page);
  return { page, context };
}

const GROUP = (extra = "") => `{ id: 'g', title: 'Ines, Tomas and Ruth commented', time: '12m'${extra}, entries: [{ id: 'g1', title: 'Ines commented', time: '12m' }, { id: 'g2', title: 'Tomas commented', time: '20m' }] }`;

describe("a group's count", () => {
  test("a count that is not a whole number above 0 is the group's entries, and nothing in it reaches the markup", async () => {
    for (const count of ["'<img src=x onerror=__x()>'", "-3", "2.5", "NaN", "Infinity", "0"]) {
      const { page, context } = await bell(`[${GROUP(`, count: ${count}`)}]`);
      assert.equal(await page.evaluate(() => document.querySelectorAll('img[src="x"]').length), 0, `${count}: no element`);
      assert.equal(await page.locator(".notification-count").innerText(), "×2", `${count}: the entries are counted`);
      assert.match(await page.locator(".notification[data-group]").evaluate((el) => el.textContent), /, 2 times/);
      assert.equal(await page.evaluate(() => window.hit), false);
      await context.close();
    }
    const { page, context } = await bell(`[${GROUP(", count: 40")}]`);
    assert.equal(await page.locator(".notification-count").innerText(), "×40", "a whole number above 0 is the app's");
    await context.close();
  });
});

describe("one unread rule", () => {
  test("a group's own flag is ignored: read entries make a read group, whatever it says, and the count, the dot and Mark all as read agree", async () => {
    const { page, context } = await bell(`[${GROUP(", unread: true")}]`);
    const group = page.locator(".notification[data-group]");
    assert.equal(await group.getAttribute("data-unread"), null);
    assert.doesNotMatch(await group.evaluate((el) => el.textContent), /^Unread/);
    assert.equal(await page.locator(".notifications-count").innerText(), "0 unread");
    assert.equal(await page.locator(".notifications-mark").getAttribute("aria-disabled"), "true");
    assert.equal(await page.locator("#bell > .btn .notifications-dot").evaluate((el) => el.hidden), true);
    await context.close();
  });

  test("and the reverse: one unread entry makes the group unread, though it says it is read", async () => {
    const { page, context } = await bell(`[{ id: 'g', title: 'Two comments', time: '1m', unread: false, entries: [{ id: 'g1', title: 'A', time: '1m', unread: true }, { id: 'g2', title: 'B', time: '2m' }] }]`);
    assert.equal(await page.locator(".notification[data-group]").getAttribute("data-unread"), "");
    assert.equal(await page.locator(".notifications-count").innerText(), "1 unread");
    assert.equal(await page.locator(".notifications-mark").getAttribute("aria-disabled"), null);
    await context.close();
  });
});

describe("setEntries keeps the reader's place", () => {
  test("an open group stays open and the focused entry keeps focus when the list is drawn again", async () => {
    const { page, context } = await bell(`[${GROUP()}, { id: 'd', title: 'Deploy finished', time: '1h', status: 'success' }]`);
    await page.locator(".notification[data-group]").click();
    await page.locator('.notification[data-id="g2"]').focus();
    await page.evaluate(() => window.centre.setEntries([
      { id: "n", title: "New: build queued", time: "now", unread: true },
      { id: "g", title: "Ines, Tomas and Ruth commented", time: "12m", entries: [{ id: "g1", title: "Ines commented", time: "12m" }, { id: "g2", title: "Tomas commented", time: "20m" }] },
      { id: "d", title: "Deploy finished", time: "1h", status: "success" },
    ]));
    await frames(page);
    assert.equal(await page.locator(".notification[data-group]").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator(".notification-entries").evaluate((el) => el.hidden), false);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.id), "g2");
    // An entry that is gone leaves focus where the browser puts it; nothing throws.
    await page.evaluate(() => window.centre.setEntries([{ id: "d", title: "Deploy finished", time: "1h" }]));
    await frames(page);
    assert.equal(await page.locator(".notification").count(), 1);
    await context.close();
  });
});

describe("errors never group", () => {
  test("a danger entry in a group is drawn at the top level right after it, and a group of errors alone is no group", async () => {
    const { page, context } = await bell(`[{ id: 'g', title: 'Three builds', time: '1m', entries: [{ id: 'a', title: 'Build 1 passed', time: '1m', status: 'success' }, { id: 'b', title: 'Build 2 failed', time: '2m', status: 'danger' }, { id: 'c', title: 'Build 3 passed', time: '3m', status: 'success' }] }, { id: 'h', title: 'Two failures', time: '9m', entries: [{ id: 'e1', title: 'Lint failed', time: '9m', status: 'danger' }] }]`);
    const top = await page.locator(".notifications-list > li > .notification").evaluateAll((els) => els.map((e) => e.dataset.id));
    assert.deepEqual(top, ["g", "b", "e1"]);
    assert.equal(await page.locator(".notification-count").innerText(), "×2");
    await page.locator('.notification[data-id="b"]').click();
    assert.equal(await page.evaluate(() => window.chosen), "b", "a lifted entry is chosen as itself");
    await context.close();
  });
});

describe("the group's chevron and current", () => {
  for (const dir of ["ltr", "rtl"]) {
    test(`it points to the end while closed and down while open (${dir}), and a current group is aria-current`, async () => {
      const { page, context } = await bell(`[${GROUP(", current: true")}]`, { dir });
      const group = page.locator(".notification[data-group]");
      assert.equal(await group.getAttribute("aria-current"), "true");
      const transform = () => page.locator(".notification-caret").evaluate((el) => getComputedStyle(el).transform);
      // The drawing is chevron-right: as it is in left to right, mirrored in right to left.
      assert.equal(await transform(), dir === "rtl" ? "matrix(-1, 0, 0, 1, 0, 0)" : "none");
      await group.click();
      await frames(page);
      // Down while open, in both directions: a quarter turn of the chevron-right drawing.
      assert.match(await transform(), /^matrix\(6\.1\d*e-17, 1, -1, 6\.1\d*e-17, 0, 0\)$|^matrix\(0, 1, -1, 0, 0, 0\)$/);
      await context.close();
    });
  }
});

describe("what the page passes in", () => {
  test("a link that is not relative, http, https or mailto is not written: the row is a button, View all too, and the page is told once", async () => {
    const html = compose(`<title>n</title><span id="bell"></span><script>Basalt.init(); window.warned = []; console.warn = function (m) { window.warned.push(String(m)); };
      window.centre = Basalt.notifications('#bell', { viewAllHref: 'javascript:window.ran=1', entries: [{ id: 'a', title: 'Deploy finished', time: '1m', href: 'javascript:window.ran=1' }, { id: 'b', title: 'Report ready', time: '2m', href: '/reports/7' }, { id: 'c', title: 'Data link', time: '3m', href: 'data:text/html,<b>x</b>' }] });
      window.centre.setEntries([{ id: 'a', title: 'Deploy finished', time: '1m', href: 'javascript:window.ran=1' }]); window.centre.open();</script>`, { fonts: false }).html;
    const { page, context } = await openHtml(browser, html);
    await page.waitForSelector(".notifications:popover-open");
    assert.equal(await page.locator('.notification[data-id="a"]').evaluate((el) => el.tagName), "BUTTON");
    assert.equal(await page.locator(".notifications-foot > :last-child").evaluate((el) => el.tagName), "BUTTON");
    assert.equal(await page.locator("a[href^='javascript:'], a[href^='data:']").count(), 0);
    await page.locator('.notification[data-id="a"]').click();
    assert.equal(await page.evaluate(() => window.ran), undefined);
    const warned = await page.evaluate(() => window.warned.filter((m) => /notification link/.test(m)));
    assert.equal(warned.length, 2, `once per refused link, not once per drawing: ${warned.join(" | ")}`);
    await context.close();
  });
  test("a relative or https link is kept", async () => {
    const { page, context } = await bell(`[{ id: 'b', title: 'Report ready', time: '2m', href: '/reports/7' }, { id: 'c', title: 'Docs', time: '3m', href: 'https://example.test/docs' }]`);
    assert.deepEqual(await page.locator(".notification").evaluateAll((els) => els.map((el) => el.getAttribute("href"))), ["/reports/7", "https://example.test/docs"]);
    await context.close();
  });
  test("a placement that is not one the popover knows is the default, and a quote in it never reaches the markup", async () => {
    const html = compose(`<title>n</title><span id="bell"></span><script>Basalt.init(); window.centre = Basalt.notifications('#bell', { side: 'top" onmouseover="window.ran=1', align: 'x" autofocus onfocus="window.ran=1', entries: [] });</script>`, { fonts: false }).html;
    const { page, context } = await openHtml(browser, html);
    const pop = page.locator(".notifications");
    assert.deepEqual(await pop.evaluate((el) => [el.dataset.side, el.dataset.align, el.hasAttribute("onmouseover"), el.hasAttribute("onfocus")]), ["bottom", "end", false, false]);
    await context.close();
  });
});
