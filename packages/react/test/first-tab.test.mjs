// The first tab (DECISIONS 358): `Tabs` and `LinkTabs` are one anatomy. The first label sits on the content line and every tab's box hangs into the
// padding by its own inline padding (8 at 36, 10 at 48 and 56), narrowed only where a box declares less room than that padding and the ring's 4. The
// divider starts on the content line; the chosen line is as wide as the tab's content (label, icon, count), never its padding, and Tabs' still slides.
// Focus is the control ring at +2 outside every horizontal tab and link tab. Right to left mirrors. Driven in Chromium against the built package.
// Written in the round and not run (DECISIONS 330 and 359: no tests until the open work is finished).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
// The content line is the wrapper's padding: 24 from its start edge.
const LINE = 24;
const BASE = "body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); }";

const open = async (jsx, { theme = "light", dir = "ltr", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, `document.documentElement.dir = ${JSON.stringify(dir)}; createRoot(document.getElementById("root")).render(${jsx});`, { theme, ...options });
  if (options.isMobile) {
    await page.evaluate(() => { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1"; document.head.append(m); });
    await page.waitForFunction((w) => window.innerWidth === w, options.viewport.width);
  }
  await page.addStyleTag({ content: BASE });
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  return { page, errors };
};

const wrap = (inner, style = `padding: "0 ${LINE}px"`) => `<div id="box" style={{ ${style} }}>${inner}</div>`;
const TABS = (size = "", tabs = `<B.Tab value="a">Overview</B.Tab><B.Tab value="b">Activity</B.Tab><B.Tab value="c">Settings</B.Tab>`) =>
  `<B.Tabs defaultValue="a"${size ? ` size="${size}"` : ""}><B.TabsList aria-label="Sections">${tabs}</B.TabsList><B.TabsPanel value="a">One</B.TabsPanel><B.TabsPanel value="b">Two</B.TabsPanel><B.TabsPanel value="c">Three</B.TabsPanel></B.Tabs>`;
const LINKS = (size = "", names = ["Everything", "Protein", "Creatine", "Pre-workout"]) =>
  `<B.LinkTabs aria-label="What it is"${size ? ` size="${size}"` : ""}>${names.map((n, i) => `<B.LinkTab href="#${i}"${i === 0 ? " current" : ""}>${n}</B.LinkTab>`).join("")}</B.LinkTabs>`;

/** A tab's box, its content's box (a range over its children: label, icon, count) and the indicator's box, in px from the viewport's start edge in the page's direction. */
const tabGeometry = (page, selector) => page.evaluate((selector) => {
  const rtl = getComputedStyle(document.documentElement).direction === "rtl";
  const w = document.documentElement.clientWidth;
  const edge = (r) => (rtl ? { start: w - r.right, end: w - r.left } : { start: r.left, end: r.right });
  const tab = document.querySelector(selector);
  const range = document.createRange(); range.setStartBefore(tab.firstChild); range.setEndAfter(tab.lastChild);
  const indicator = document.querySelector(".basalt-tabs-indicator");
  return { box: edge(tab.getBoundingClientRect()), content: edge(range.getBoundingClientRect()), line: indicator ? edge(indicator.getBoundingClientRect()) : null };
}, selector);
const near = (a, b, label, within = 0.5) => assert.ok(Math.abs(a - b) <= within, `${label}: ${a} against ${b}`);
const PAD = { "": 8, "3xl": 10, "5xl": 10 };

describe("Tabs: the hang and the line (DECISIONS 358)", () => {
  for (const theme of THEMES) for (const dir of ["ltr", "rtl"]) for (const size of ["", "3xl", "5xl"]) {
    test(`the first label is on the content line, its box hangs by the padding, the line is the content's width (${size || "lg"}, ${dir}, ${theme})`, async () => {
      const { page, errors } = await open(wrap(TABS(size)), { theme, dir, ...DESKTOP });
      const g = await tabGeometry(page, "[role=tab][aria-selected=true]");
      near(g.content.start, LINE, "the first label's start");
      near(g.box.start, LINE - PAD[size], "the first box's start");
      near(g.line.start, g.content.start, "the line starts with the content");
      near(g.line.end, g.content.end, "the line ends with the content");
      // The divider is the list's ::before, from the hang: it starts on the content line and ends at the box's end.
      const divider = await page.evaluate(() => { const l = document.querySelector(".basalt-tabs-list"); const s = getComputedStyle(l, "::before"); return { content: s.content, height: s.height, start: s.insetInlineStart, end: s.insetInlineEnd, shadow: getComputedStyle(l).boxShadow }; });
      assert.deepEqual(divider, { content: '""', height: "1px", start: `${PAD[size]}px`, end: "0px", shadow: "none" });
      const list = await page.evaluate(() => { const l = document.querySelector(".basalt-tabs-list").getBoundingClientRect(); const b = document.getElementById("box").getBoundingClientRect(); return [l.left, l.right, b.left, b.right]; });
      if (dir === "ltr") { near(list[0] + PAD[size], list[2] + LINE, "the divider starts on the line"); near(list[1], list[3] - LINE, "and ends at the content's end"); }
      else { near(list[1] - PAD[size], list[3] - LINE, "the divider starts on the line"); near(list[0], list[2] + LINE, "and ends at the content's end"); }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("choosing another tab slides the line to that tab's content, and nothing moves", async () => {
    const { page } = await open(wrap(TABS()), DESKTOP);
    const boxes = () => page.evaluate(() => [...document.querySelectorAll("[role=tab]")].map((t) => { const r = t.getBoundingClientRect(); return [r.left, r.width]; }));
    const before = await boxes();
    const transition = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".basalt-tabs-indicator")); return [s.transitionProperty, s.transitionDuration]; });
    assert.equal(transition[0], "left, width", "it still slides");
    await page.getByRole("tab", { name: "Activity" }).click();
    await settle(page);
    const g = await tabGeometry(page, "[role=tab][aria-selected=true]");
    near(g.line.start, g.content.start, "the line starts with the second tab's content");
    near(g.line.end, g.content.end, "and ends with it");
    assert.deepEqual(await boxes(), before);
    await page.close();
  });

  test("the line spans an icon, the label and a count, never the padding", async () => {
    const { page } = await open(wrap(TABS("", `<B.Tab value="a"><B.Icon icon={B.HomeGlyph} />Inbox<span className="count">12</span></B.Tab><B.Tab value="b">Drafts</B.Tab><B.Tab value="c">Sent</B.Tab>`)), DESKTOP);
    const g = await tabGeometry(page, "[role=tab][aria-selected=true]");
    const ends = await page.evaluate(() => { const t = document.querySelector("[role=tab][aria-selected=true]"); return [t.querySelector("svg").getBoundingClientRect().left, t.querySelector(".count").getBoundingClientRect().right]; });
    near(g.line.start, ends[0], "the line starts at the icon");
    near(g.line.end, ends[1], "and ends after the count");
    near(g.line.start, LINE, "the icon is on the content line");
    await page.close();
  });

  test("on touch a short label drawn 44 wide stays on the line, and the line is the label's width", async () => {
    const { page } = await open(wrap(TABS("", `<B.Tab value="a">A</B.Tab><B.Tab value="b">Bee</B.Tab>`)), PHONE);
    const g = await tabGeometry(page, "[role=tab][aria-selected=true]");
    assert.ok(g.box.end - g.box.start >= 44, "the tab is 44 wide");
    near(g.content.start, LINE, "the label is on the line (justify-content: flex-start)");
    near(g.line.start, g.content.start, "the line starts with the label");
    near(g.line.end, g.content.end, "and ends with it, not at the box's 44");
    await page.close();
  });

  test("the line is measured again when the chosen tab changes size (fonts arriving) and when the direction flips", async () => {
    const { page } = await open(wrap(TABS()), DESKTOP);
    await page.evaluate(() => { document.querySelector("[role=tab][aria-selected=true]").style.fontSize = "20px"; });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await settle(page);
    let g = await tabGeometry(page, "[role=tab][aria-selected=true]");
    near(g.line.end, g.content.end, "a wider label: the line ends with it");
    await page.evaluate(() => { document.documentElement.dir = "rtl"; });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await settle(page);
    g = await tabGeometry(page, "[role=tab][aria-selected=true]");
    near(g.content.start, LINE, "right to left: the label is on the line");
    near(g.line.start, g.content.start, "and the line starts with it");
    near(g.line.end, g.content.end, "and ends with it");
    await page.close();
  });

  test("vertical tabs and segments are unchanged: no hang, no divider", async () => {
    const { page } = await open(wrap(`<B.Tabs defaultValue="a" orientation="vertical"><B.TabsList aria-label="V"><B.Tab value="a">One</B.Tab><B.Tab value="b">Two</B.Tab></B.TabsList><B.TabsPanel value="a">1</B.TabsPanel><B.TabsPanel value="b">2</B.TabsPanel></B.Tabs>`), DESKTOP);
    const v = await page.evaluate(() => { const l = document.querySelector(".basalt-tabs-list"); return { margin: getComputedStyle(l).marginInlineStart, before: getComputedStyle(l, "::before").content, x: l.getBoundingClientRect().left }; });
    assert.deepEqual(v, { margin: "0px", before: "none", x: LINE });
    await page.close();
  });
});

describe("focus at +2 on every horizontal tab and link tab (DECISIONS 358)", () => {
  for (const theme of THEMES) for (const [name, options] of [["1440", DESKTOP], ["390", PHONE]]) {
    test(`the first tab's ring is +2 outside its box and keeps 4 clear of a card's rim (${name}, ${theme})`, async () => {
      // A card's content is 16 in: the ring reaches the hang and its 4 before the line (12 at 36), so 4 is left inside the rim.
      const { page } = await open(`<div style={{ padding: 24 }}><B.Card><B.CardContent>${TABS()}</B.CardContent></B.Card></div>`, { theme, ...options });
      await page.keyboard.press("Tab");
      const ring = await page.evaluate(() => {
        const t = document.activeElement; const s = getComputedStyle(t); const r = t.getBoundingClientRect();
        const card = t.closest(".basalt-card"); const c = card.getBoundingClientRect(); const rim = parseFloat(getComputedStyle(card).borderLeftWidth) || 0;
        return { role: t.getAttribute("role"), style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, room: r.left - 4 - (c.left + rim) };
      });
      assert.deepEqual([ring.role, ring.style, ring.width, ring.offset], ["tab", "solid", "2px", "2px"]);
      assert.ok(ring.room >= 3.9, `4 clear of the rim: ${ring.room}`);
      await page.close();
    });
  }

  test("a box that declares less room narrows the hang, so the ring keeps 4", async () => {
    // 8 of room: the hang is min(8, 8 - 4) = 4, so the box starts 4 before the line and its ring's outer edge meets the room's edge.
    const { page } = await open(wrap(TABS(), `padding: "0 8px", "--basalt-edge-room-start": "8px"`), DESKTOP);
    const g = await tabGeometry(page, "[role=tab][aria-selected=true]");
    near(g.box.start, 4, "the box hangs by 4");
    near(g.content.start, 12, "the label is the hang's 4 past the line");
    const links = await open(wrap(LINKS(), `padding: "0 8px", "--basalt-edge-room-start": "8px"`), DESKTOP);
    near(await links.page.evaluate(() => document.querySelector(".basalt-link-tab").getBoundingClientRect().left), 4, "a link tab's box hangs by 4 too");
    await page.close(); await links.page.close();
  });

  test("a link tab's ring is +2 outside the link", async () => {
    const { page } = await open(wrap(LINKS()), DESKTOP);
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
    assert.deepEqual(ring, ["solid", "2px", "2px"]);
    await page.close();
  });
});

describe("LinkTabs: one anatomy with Tabs (DECISIONS 358)", () => {
  for (const theme of THEMES) for (const dir of ["ltr", "rtl"]) for (const size of ["", "3xl", "5xl"]) {
    test(`every link keeps its padding, the first label is on the line, the line is the label's width (${size || "lg"}, ${dir}, ${theme})`, async () => {
      const { page, errors } = await open(wrap(LINKS(size)), { theme, dir, ...DESKTOP });
      const g = await page.evaluate(() => {
        const rtl = getComputedStyle(document.documentElement).direction === "rtl"; const w = document.documentElement.clientWidth;
        const edge = (r) => (rtl ? { start: w - r.right, end: w - r.left } : { start: r.left, end: r.right });
        return [...document.querySelectorAll(".basalt-link-tab")].map((a) => ({ box: edge(a.getBoundingClientRect()), label: edge(a.querySelector(".basalt-link-tab-label").getBoundingClientRect()), line: edge(a.querySelector(".basalt-link-tab-line").getBoundingClientRect()), pad: [getComputedStyle(a).paddingInlineStart, getComputedStyle(a).paddingInlineEnd] }));
      });
      for (const link of g) assert.deepEqual(link.pad, [`${PAD[size]}px`, `${PAD[size]}px`], "every link has its padding on both sides");
      near(g[0].label.start, LINE, "the first label is on the content line");
      near(g[0].box.start, LINE - PAD[size], "its box hangs by the padding");
      for (const link of g) { near(link.line.start, link.label.start, "the line starts with the label"); near(link.line.end, link.label.end, "and ends with it"); }
      const divider = await page.evaluate(() => { const u = document.querySelector(".basalt-link-tabs > ul"); const s = getComputedStyle(u, "::before"); return { start: s.insetInlineStart, end: s.insetInlineEnd, height: s.height, shadow: getComputedStyle(u).boxShadow }; });
      assert.deepEqual(divider, { start: `${PAD[size]}px`, end: "0px", height: "1px", shadow: "none" });
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("a wrapped row starts each line's first label on the content line", async () => {
    const NINE = ["Everything", "Protein", "Creatine", "Pre-workout", "Vitamins & minerals", "Sleep", "Bars", "Mass gainers", "Accessories"];
    const { page } = await open(wrap(LINKS("3xl", NINE), `padding: "0 24px", width: 420, boxSizing: "border-box"`), DESKTOP);
    const lines = await page.evaluate(() => {
      const starts = []; let top = null;
      for (const a of document.querySelectorAll(".basalt-link-tab")) { const r = a.getBoundingClientRect(); if (r.top !== top) { starts.push(a.querySelector(".basalt-link-tab-label").getBoundingClientRect().left); top = r.top; } }
      return starts;
    });
    assert.ok(lines.length >= 2, `the row wraps: ${lines.length} lines`);
    for (const x of lines) near(x, LINE, "a line's first label");
    await page.close();
  });

  test("at 390 the row is still the Select: nothing changes there", async () => {
    const { page } = await open(wrap(LINKS()), PHONE);
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector(".basalt-link-tabs > ul")).display, getComputedStyle(document.querySelector(".basalt-link-tabs-select")).display]), ["none", "block"]);
    await page.close();
  });
});
