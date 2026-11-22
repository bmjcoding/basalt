// Notices and search (cimip-gaps-2, batch B7; DECISIONS 265): the notification center's pending mark, grouped repeats, the page form
// (`NotificationList`) with `head={false}` and `current`, the US names, and the in-page search (`SearchField`, `SearchPassages`, `SearchPassage`,
// `SearchMatch`, `markMatches`) inside a `LoadingShape`. Driven in Chromium against the built package with the real stylesheet, in both themes.
// Synthetic data in unlike domains (a build pipeline, a support inbox, a handbook, a team chat).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import * as B from "../dist/index.js";
import { fixturePage, launch, settle, visibleAgainst } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const open = (body, options) => fixturePage(browser, `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(${body});`, options);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const resolve = (page, token) => page.evaluate((token) => {
  const probe = document.createElement("div");
  probe.style.color = `var(--basalt-${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}, token);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Notices"; document.documentElement.lang = "en"; document.body.style.background = "var(--basalt-surface-page)"; });
  await settle(page);
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run(
    { exclude: [["[data-base-ui-focus-guard]"]] },
    { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
  ));
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`);
};

// A build pipeline: something waiting on the reader, a group of three comments (two unread), a success and a read pending entry.
const PIPELINE = `[
  { id: "p1", title: "Waiting on you: approve release 4.2", description: "web, production", time: "4m", status: "pending", unread: true, href: "#r" },
  { id: "p2", title: "Ines, Tomas and Ruth commented on your change", description: "Add retries to the upload worker", time: "12m", entries: [
    { id: "p2a", title: "Ines Ortega commented", description: "Can we cap the retries?", time: "12m", unread: true, href: "#c1" },
    { id: "p2b", title: "Tomas Lindqvist commented", time: "20m", unread: true, href: "#c2" },
    { id: "p2c", title: "Ruth Achebe commented", time: "31m", href: "#c3" },
  ] },
  { id: "p3", title: "Deploy finished", description: "api, staging", time: "1h", status: "success", href: "#d" },
  { id: "p4", title: "In review: update the cache keys", time: "Yesterday", status: "pending", href: "#k" },
]`;

for (const theme of ["dark", "light"]) {
  describe(`the notification center: pending and groups (${theme})`, () => {
    test("pending is the empty ring in the mark's 16px seat, in secondary ink with no colour, at 3:1 or more, and aria-hidden", async () => {
      const { page } = await open(`<div style={{ padding: 40, display: "flex", justifyContent: "flex-end" }}><B.NotificationCenter defaultOpen entries={${PIPELINE}} /></div>`, { theme, viewport: { width: 800, height: 700 } });
      await settle(page);
      const mark = page.locator('.basalt-notification[data-status="pending"] .basalt-notification-mark').first();
      assert.equal(await mark.getAttribute("aria-hidden"), "true");
      const m = await mark.evaluate((el) => { const svg = el.querySelector("svg"); const r = svg.getBoundingClientRect(); return { w: r.width, h: r.height, color: getComputedStyle(el).color, paths: svg.querySelectorAll("path, circle").length }; });
      assert.deepEqual([m.w, m.h], [16, 16]);
      assert.equal(m.color, await resolve(page, "text-secondary"), "secondary ink, not a status colour");
      assert.ok(await visibleAgainst(page, mark.locator("svg")) >= 3, "the ring shows at 3:1 against the popover");
      // Its seat is the other marks' seat: titles line up down the list, pending or not.
      const lefts = await page.locator(".basalt-notifications-list > li > .basalt-notification .basalt-notification-title").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
      assert.equal(new Set(lefts).size, 1, `titles share one start edge (${lefts})`);
      await page.close();
    });

    test("a group is a button with aria-expanded, the toast's count spoken as times, and the bell counts its entries", async () => {
      const { page } = await open(`<div style={{ padding: 40, display: "flex", justifyContent: "flex-end" }}><B.NotificationCenter defaultOpen entries={${PIPELINE}} /></div>`, { theme, viewport: { width: 800, height: 700 } });
      await settle(page);
      assert.equal(await page.locator(".basalt-notifications-trigger").getAttribute("aria-label"), "Notifications, 3 unread", "one pending entry and the group's two unread comments");
      const group = page.locator(".basalt-notification[data-group]");
      assert.equal(await group.evaluate((el) => el.tagName), "BUTTON");
      assert.equal(await group.getAttribute("aria-expanded"), "false");
      assert.equal(await group.getAttribute("data-unread"), "", "a group left without `unread` is unread while any of its entries is");
      assert.match(await group.innerText(), /×3/);
      assert.equal(await group.locator(".basalt-notification-count").getAttribute("aria-hidden"), "true");
      // The drawn count is aria-hidden, so the name reads the title, then ", 3 times".
      assert.equal(await page.getByRole("button", { name: /^Unread: Ines, Tomas and Ruth commented on your change\s?, 3 times/ }).count(), 1);
      const panel = page.locator(`[id="${await group.getAttribute("aria-controls")}"]`);
      assert.equal(await panel.evaluate((el) => el.inert), true, "closed, its entries are out of the keyboard's way");
      assert.equal(await panel.locator(".basalt-notification").first().isVisible(), false);
      await page.close();
    });

    test("opening a group shows its entries under it, indented to the group's words; focus stays on the row and Tab reaches the first entry", async () => {
      const { page } = await open(`<div style={{ padding: 40, display: "flex", justifyContent: "flex-end" }}><B.NotificationCenter defaultOpen entries={${PIPELINE}} /></div>`, { theme, viewport: { width: 800, height: 700 } });
      await settle(page);
      const group = page.locator(".basalt-notification[data-group]");
      await group.focus();
      await page.keyboard.press("Enter");
      await settle(page);
      assert.equal(await group.getAttribute("aria-expanded"), "true");
      assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute("data-group")), true, "focus stays on the group's row");
      const children = page.locator(".basalt-notification-entries .basalt-notification");
      assert.equal(await children.count(), 3);
      assert.equal(await children.first().isVisible(), true);
      const groupText = await box(group.locator(".basalt-notification-text"));
      const childDot = await box(children.first().locator(".basalt-notification-dot"));
      const plainDot = await box(page.locator(".basalt-notifications-list > li > .basalt-notification .basalt-notification-dot").first());
      // The entry's dot sits where the group's words start: indented by the dot's and the mark's seats and their gaps (6 + 10 + 16 + 10).
      assert.ok(Math.abs(childDot.x - groupText.x) < 0.5, `the entry's dot (${childDot.x}) sits under the group's words (${groupText.x})`);
      assert.ok(Math.abs(childDot.x - plainDot.x - 42) < 0.5);
      // The caret turns; the time keeps the column every entry's time ends on.
      assert.notEqual(await group.locator(".basalt-notification-caret").evaluate((el) => getComputedStyle(el).transform), "none");
      const ends = await page.locator(".basalt-notification-time").evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => Math.round(e.getBoundingClientRect().right)));
      assert.equal(new Set(ends).size, 1, `every time ends on one edge (${ends})`);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("href")), "#c1");
      // Choosing an entry in a group selects it and leaves the center; the group's row never does.
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Enter");
      await settle(page);
      assert.equal(await group.getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator(".basalt-notifications").isVisible(), true, "closing a group keeps the center open");
      await page.close();
    });

    test("Mark all as read moves nothing, the group's row and its open entries included", async () => {
      const { page } = await open(`(() => { function App() { const [e, set] = React.useState(${PIPELINE}); return <div style={{ padding: 40, display: "flex", justifyContent: "flex-end" }}><B.NotificationCenter defaultOpen entries={e} onMarkAllRead={() => set(e.map((x) => ({ ...x, unread: false, entries: x.entries?.map((c) => ({ ...c, unread: false })) })))} /></div>; } return <App />; })()`, { theme, viewport: { width: 800, height: 760 } });
      await settle(page);
      await page.locator(".basalt-notification[data-group]").click();
      await settle(page);
      const where = () => page.locator(".basalt-notification-title, .basalt-notification-count, .basalt-notification-caret, .basalt-notification-time").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x * 2), Math.round(r.y * 2), Math.round(r.width * 2)]; }));
      const before = await where();
      await page.getByRole("button", { name: "Mark all as read" }).click();
      await settle(page);
      assert.equal(await page.locator(".basalt-notification[data-unread]").count(), 0);
      assert.deepEqual(await where(), before);
      assert.equal(await page.locator(".basalt-notifications-trigger").getAttribute("aria-label"), "Notifications");
      await page.close();
    });

    test("axe finds nothing in the open center with a group open", async () => {
      const { page } = await open(`<div style={{ padding: 40, display: "flex", justifyContent: "flex-end" }}><B.NotificationCenter defaultOpen entries={${PIPELINE}} /></div>`, { theme, viewport: { width: 800, height: 760 } });
      await settle(page);
      await page.locator(".basalt-notification[data-group]").click();
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });

  // A support inbox, in the page.
  const INBOX = `[
    { id: "i1", title: "Waiting on your reply: ticket 4821", time: "2m", status: "pending", unread: true, href: "#t1" },
    { id: "i2", title: "Mia, Arjun and Leo replied on tickets you follow", time: "9m", count: 5, entries: [
      { id: "i2a", title: "Mia Santos replied on 4810", time: "9m", unread: true, href: "#t2" },
      { id: "i2b", title: "Arjun Mehta replied on 4802", time: "26m", href: "#t3" },
    ] },
    { id: "i3", title: "Ticket 4790 was closed", description: "Password reset link expired", time: "1h", status: "success", current: true, href: "#t4" },
    { id: "i4", title: "You were added to the Billing queue", time: "2h" },
  ]`;

  describe(`NotificationList, the page form (${theme})`, () => {
    test("is the center's rows in the page: no popover, no title, the list named by the page's heading, a head band with the count", async () => {
      const { page } = await open(`<div style={{ padding: 24, width: 420 }}><h1 id="t">Notifications</h1><B.NotificationList entries={${INBOX}} aria-labelledby="t" /></div>`, { theme, viewport: { width: 600, height: 700 } });
      await settle(page);
      assert.equal(await page.locator(".basalt-popover, .basalt-notifications-trigger").count(), 0);
      assert.equal(await page.locator(".basalt-notification-list .basalt-notifications-title").count(), 0, "the page's heading names it");
      assert.equal(await page.getByRole("list", { name: "Notifications" }).count(), 1);
      assert.equal(await page.locator(".basalt-notifications-count").innerText(), "2 unread");
      assert.equal(await page.getByRole("button", { name: /on tickets you follow\s?, 5 times/ }).count(), 1, "`count` stands for more than the entries listed");
      // The row geometry is the popover's: 40 for one line, 58 for two, with a mouse.
      const heights = await page.locator(".basalt-notifications-list > li > .basalt-notification").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      assert.deepEqual(heights, [40, 40, 58, 40]);
      // No glide in the page: each entry paints its own plate on hover, the page's solid plate.
      assert.equal(await page.locator(".basalt-plate").count(), 0);
      const row = page.locator(".basalt-notifications-list > li > .basalt-notification").nth(3);
      await row.hover();
      await settle(page);
      const plate = await row.evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
      assert.notEqual(plate, "rgba(0, 0, 0, 0)");
      await page.close();
    });

    test("current is aria-current and the title at 600, on one cut line; head={false} drops the band and keeps the list's name", async () => {
      const { page } = await open(`<aside style={{ width: 280 }}><h2 id="m">Your tickets</h2><B.NotificationList head={false} entries={${INBOX}} aria-labelledby="m" /></aside>`, { theme, viewport: { width: 600, height: 700 } });
      await settle(page);
      assert.equal(await page.locator(".basalt-notifications-head").count(), 0);
      assert.equal(await page.getByRole("list", { name: "Your tickets" }).count(), 1);
      const current = page.locator('.basalt-notification[aria-current="page"]');
      assert.equal(await current.count(), 1);
      assert.equal(await current.locator(".basalt-notification-title").evaluate((el) => getComputedStyle(el).fontWeight), "600");
      assert.equal(await page.locator(".basalt-notification:not([data-current]) .basalt-notification-title").first().evaluate((el) => getComputedStyle(el).fontWeight), "400");
      assert.equal(await current.locator(".basalt-notification-title").evaluate((el) => getComputedStyle(el).whiteSpace), "nowrap");
      await page.close();
    });

    test("axe finds nothing in the page form, with the group open, at a phone's width on touch", async () => {
      const { page } = await open(`<div style={{ padding: 16 }}><h1 id="t">Notifications</h1><B.NotificationList entries={${INBOX}} aria-labelledby="t" /></div>`, { theme, viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
      await settle(page);
      const heights = await page.locator(".basalt-notifications-list > li > .basalt-notification").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      assert.ok(heights.every((h) => h >= 44), `every entry is at least 44 tall on touch (${heights})`);
      // A group's spoken count is hidden inside its cut title, so nothing reaches past the phone's width.
      const wide = await page.evaluate(() => [...document.querySelectorAll("#root *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5).map((e) => e.className));
      assert.deepEqual(wide, [], "nothing is wider than the phone");
      await page.locator(".basalt-notification[data-group]").click();
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });

  describe(`search in a panel (${theme})`, () => {
    const PANEL = `(() => { function App() { const [q, set] = React.useState("laptop"); const [esc, setEsc] = React.useState(0); return <B.Card style={{ width: 360, padding: 0 }}>
      <div style={{ padding: 12 }}><B.SearchField label="Search the handbook" value={q} onValueChange={set} onEscape={() => setEsc((n) => n + 1)} /></div>
      <output id="esc">{esc}</output>
      <B.SearchPassages aria-label="Results">
        <B.SearchPassage source="Your first week › Equipment" meta="Section 2" onClick={() => {}}>{B.markMatches("Your laptop arrives on your first morning; IT sets the laptop up with you.", [[55, 61], [5, 11]])}</B.SearchPassage>
        <B.SearchPassage source="Leaving › Returning equipment" meta="Section 9" href="#leave" current>{B.markMatches("Return the laptop on your last day.", [[11, 17]])}</B.SearchPassage>
      </B.SearchPassages>
    </B.Card>; } return <div style={{ padding: 24 }}><App /></div>; })()`;

    test("a match is the passage's words in primary ink at 600 with no fill; the passage is secondary and the meta tertiary, lifting on hover", async () => {
      const { page } = await open(PANEL, { theme, viewport: { width: 600, height: 600 } });
      await settle(page);
      const match = page.locator("mark.basalt-search-match").first();
      const m = await match.evaluate((el) => { const cs = getComputedStyle(el); return { color: cs.color, weight: cs.fontWeight, bg: cs.backgroundColor }; });
      assert.deepEqual(m, { color: await resolve(page, "text-primary"), weight: "600", bg: "rgba(0, 0, 0, 0)" });
      assert.equal(await page.locator("mark.basalt-search-match").count(), 3);
      const passage = page.locator(".basalt-passage").first();
      assert.equal(await passage.locator(".basalt-passage-text").evaluate((el) => getComputedStyle(el).color), await resolve(page, "text-secondary"));
      const meta = passage.locator(".basalt-passage-meta");
      assert.equal(await meta.evaluate((el) => getComputedStyle(el).color), await resolve(page, "text-tertiary"));
      await passage.hover();
      await settle(page);
      assert.equal(await meta.evaluate((el) => getComputedStyle(el).color), await resolve(page, "text-secondary"), "tertiary would fail on the plate");
      assert.notEqual(await passage.evaluate((el) => getComputedStyle(el, "::before").backgroundColor), "rgba(0, 0, 0, 0)");
      await page.close();
    });

    test("a passage is a button, or a link with href; current is aria-current and the source at 600", async () => {
      const { page } = await open(PANEL, { theme, viewport: { width: 600, height: 600 } });
      await settle(page);
      const [first, second] = [page.locator(".basalt-passage").nth(0), page.locator(".basalt-passage").nth(1)];
      assert.equal(await first.evaluate((el) => el.tagName), "BUTTON");
      assert.equal(await second.evaluate((el) => el.tagName), "A");
      assert.equal(await second.getAttribute("aria-current"), "page");
      assert.equal(await second.locator(".basalt-passage-source").evaluate((el) => getComputedStyle(el).fontWeight), "600");
      assert.equal(await first.locator(".basalt-passage-source").evaluate((el) => getComputedStyle(el).fontWeight), "400");
      assert.equal(await page.locator("ol.basalt-passages").getAttribute("aria-label"), "Results");
      // The ring is the control ring at +2 outside the row's plate, inside the list's 6px.
      await first.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return [cs.outlineStyle, cs.outlineWidth, cs.outlineOffset]; });
      assert.deepEqual(ring, ["solid", "2px", "0px"]);
      await page.close();
    });

    test("the field: Esc empties the words first, the next Esc is the app's; the clear button empties and keeps focus; the words never move", async () => {
      const { page } = await open(PANEL, { theme, viewport: { width: 600, height: 600 } });
      await settle(page);
      const input = page.locator(".basalt-search-box-input");
      assert.equal(await page.getByRole("search").count(), 1);
      assert.equal(await input.getAttribute("aria-label"), "Search the handbook");
      const pad = await input.evaluate((el) => getComputedStyle(el).paddingInlineStart);
      await page.getByRole("button", { name: "Clear search" }).click();
      assert.equal(await input.inputValue(), "");
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-search-box-input")), true);
      assert.equal(await page.getByRole("button", { name: "Clear search" }).count(), 0, "no words, no clear button");
      assert.equal(await input.evaluate((el) => getComputedStyle(el).paddingInlineStart), pad, "the clear seat is padding, kept");
      await input.fill("charger");
      await page.keyboard.press("Escape");
      assert.equal(await input.inputValue(), "");
      assert.equal(await page.locator("#esc").innerText(), "0");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#esc").innerText(), "1");
      // The browser's own × is hidden (Chromium reports no computed style for a ::-webkit pseudo, so the rule is read): the field has one ×.
      const hidden = await page.evaluate(() => {
        const found = [];
        const walk = (rules) => { for (const rule of rules) { if (rule.cssRules) walk(rule.cssRules); if (rule.selectorText?.includes(".basalt-search-box-input::-webkit-search-cancel-button")) found.push(rule.style.display); } };
        for (const sheet of document.styleSheets) walk(sheet.cssRules);
        return found;
      });
      assert.deepEqual(hidden, ["none"]);
      // The glyph sits inside the field's start.
      const glyph = await box(page.locator(".basalt-search-box-glyph"));
      const field = await box(input);
      assert.ok(glyph.x - field.x >= 9.5 && glyph.x - field.x <= 10.5, `the glyph is 10px in (${glyph.x - field.x})`);
      await page.close();
    });

    test("in a LoadingShape the first results are bones in the passages' shape, aria-busy, and the shape is inert", async () => {
      const { page } = await open(`<div style={{ padding: 24, width: 360 }}><B.LoadingShape loading label="Searching" shape={() => <B.SearchPassages aria-label="Results">{[0, 1, 2].map((i) => <B.SearchPassage key={i} source={B.standIn(i + 1, 18)} meta={B.standIn(i + 7, 6)} onClick={() => {}}>{B.standIn(i + 13, 110)}</B.SearchPassage>)}</B.SearchPassages>}>{() => null}</B.LoadingShape></div>`, { theme, viewport: { width: 600, height: 600 } });
      await page.waitForSelector(".basalt-loading-shape .basalt-skeleton", { timeout: 3000 });
      const region = page.locator(".basalt-loading-shape");
      assert.equal(await region.getAttribute("aria-busy"), "true");
      const bones = await page.locator(".basalt-loading-shape .basalt-skeleton").count();
      assert.ok(bones >= 9, `a source, a meta and the passage's lines are bones (${bones})`);
      assert.equal(await page.evaluate(() => document.querySelector(".basalt-passage")?.closest("[inert]") !== null), true);
      await page.close();
    });

    test("axe finds nothing in the panel", async () => {
      const { page } = await open(PANEL, { theme, viewport: { width: 600, height: 600 } });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  });
}

describe("names and helpers", () => {
  test("NotificationCenter and NotificationCentre are one component", () => {
    assert.equal(typeof B.NotificationCenter, "function");
    assert.equal(B.NotificationCentre, B.NotificationCenter);
  });

  test("markMatches joins overlapping and touching ranges, clamps them, takes any order, and never parses HTML", () => {
    const html = (nodes) => renderToStaticMarkup(React.createElement(React.Fragment, null, ...nodes));
    assert.equal(html(B.markMatches("build and deploy", [[10, 16], [0, 5]])), '<mark class="basalt-search-match">build</mark> and <mark class="basalt-search-match">deploy</mark>');
    assert.equal(html(B.markMatches("abcdef", [[1, 3], [2, 4], [4, 5]])), 'a<mark class="basalt-search-match">bcde</mark>f');
    assert.equal(html(B.markMatches("abc", [[-4, 1], [2, 99], [2, 2]])), '<mark class="basalt-search-match">a</mark>b<mark class="basalt-search-match">c</mark>');
    assert.equal(html(B.markMatches("<b>x</b>", [[3, 4]])), '&lt;b&gt;<mark class="basalt-search-match">x</mark>&lt;/b&gt;');
    assert.equal(html(B.markMatches("plain", [])), "plain");
  });
});
