// The first tab (DECISIONS 358) in the skill: tabs and link tabs are one anatomy with React's. The first label sits on the content line and every tab's box
// hangs into the padding by its own padding; the divider starts on the line; the chosen line is as wide as the content. A tab's ring is +2 outside (DECISIONS
// 69's inset ring ends): the row scrolls in `.tabs-scroll`, whose padding keeps the ring's 4 on every side, and a tab that takes focus is brought fully into
// view by a focusin listener (`scrollIntoView`, nearest) with `scroll-margin-inline` of 4 and a hairline. The walk below uses the keys alone, in Chromium and
// WebKit, at 1440 and 390, in both directions and both themes. Written in the round and not run (DECISIONS 330 and 359).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { webkit } from "playwright";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const LINE = 24;
const page = (body) => compose(body).html;
const frames = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const NAMES = ["Overview", "Activity", "Settings", "Permissions", "Billing", "Audit log", "Webhooks", "Integrations", "Domains", "Environment", "Logs", "Usage", "Members", "Security", "Storage", "Analytics"];
const row = (id, names, { scroll = true } = {}) => {
  const tabs = names.map((t, i) => `<button class="tab" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}">${t}</button>`).join("");
  const panels = names.map((t, i) => `<div class="tabpanel" id="${id}-p${i}" role="tabpanel" aria-labelledby="${id}-t${i}"${i === 0 ? "" : " hidden"}>${t}</div>`).join("");
  const list = `<div class="tabs" role="tablist" aria-label="${id}">${tabs}</div>`;
  return `<div data-tabs id="${id}">${scroll ? `<div class="tabs-scroll">${list}</div>` : list}${panels}</div>`;
};
const LINKS = (size = "", names = ["Everything", "Protein", "Creatine", "Pre-workout"]) => `<nav class="link-tabs" aria-label="What it is"${size ? ` data-size="${size}"` : ""}><ul>${names.map((n, i) => `<li><a class="link-tab" href="#${i}"${i === 0 ? ' aria-current="page"' : ""}><span>${n}</span><span class="link-tab-line" aria-hidden="true"></span></a></li>`).join("")}</ul><div class="link-tabs-select"><span class="select"><span class="link-tabs-select-label" aria-hidden="true">Go to</span><select class="input" data-size="lg" aria-label="Go to ${names[0]}">${names.map((n, i) => `<option value="#${i}"${i === 0 ? " selected" : ""}>${n}</option>`).join("")}</select></span></div></nav>`;
const near = (a, b, label, within = 0.5) => assert.ok(Math.abs(a - b) <= within, `${label}: ${a} against ${b}`);

/** Boxes in px from the viewport's start edge in the page's direction. */
const geometry = (p) => p.evaluate(() => {
  const rtl = getComputedStyle(document.querySelector("[data-tabs]")).direction === "rtl"; const w = document.documentElement.clientWidth;
  const edge = (r) => (rtl ? { start: w - r.right, end: w - r.left } : { start: r.left, end: r.right });
  const tab = document.querySelector('.tab[aria-selected="true"]');
  const range = document.createRange(); range.setStartBefore(tab.firstChild); range.setEndAfter(tab.lastChild);
  const after = getComputedStyle(tab, "::after"); const before = getComputedStyle(document.querySelector(".tabs"), "::before");
  return { box: edge(tab.getBoundingClientRect()), content: edge(range.getBoundingClientRect()), line: [after.insetInlineStart, after.insetInlineEnd, after.height], divider: [before.insetInlineStart, before.insetInlineEnd, before.height], tabs: edge(document.querySelector(".tabs").getBoundingClientRect()), shadow: getComputedStyle(document.querySelector(".tabs")).boxShadow };
});

describe("tabs: the hang, the line and the scrollport (DECISIONS 358)", () => {
  for (const theme of THEMES) for (const width of [1440, 390]) for (const dir of ["ltr", "rtl"]) {
    test(`the first label is on the content line, the box hangs by 8, the line and the divider start on the line (${width}, ${dir}, ${theme})`, async () => {
      const { page: p, context, errors } = await openHtml(browser, page(`<div dir="${dir}" style="padding: 0 ${LINE}px">${row("r", NAMES.slice(0, 3))}</div>`), { scheme: theme, width });
      const g = await geometry(p);
      near(g.content.start, LINE, "the first label's start");
      near(g.box.start, LINE - 8, "the first box's start");
      assert.deepEqual(g.line, ["8px", "8px", "2px"], "the chosen line is inset by the tab's padding: the content's width");
      assert.deepEqual(g.divider, ["8px", "0px", "1px"], "the divider starts on the content line and ends at the box's end");
      near(g.tabs.start, LINE - 8, "the row hangs by the padding");
      assert.equal(g.shadow, "none", "the divider is no longer the row's inset shadow");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("the scrollport gives back its padding: the layout is the same with and without it, and the script adds it to a row that lacks it", async () => {
    const read = async (scroll) => {
      const { page: p, context } = await openHtml(browser, page(`<div style="padding: 0 ${LINE}px"><p id="above">Above</p>${row("r", NAMES.slice(0, 3), { scroll })}<p id="below">Below</p></div>`));
      const out = await p.evaluate(() => ({ wrapped: document.querySelector(".tabs").parentElement.classList.contains("tabs-scroll"), tab: document.querySelector(".tab").getBoundingClientRect().toJSON(), below: document.getElementById("below").getBoundingClientRect().top, port: getComputedStyle(document.querySelector(".tabs-scroll")).overflowX }));
      await context.close();
      return out;
    };
    const [written, added] = [await read(true), await read(false)];
    assert.equal(added.wrapped, true, "the script wrapped the bare row");
    assert.deepEqual(added, written);
    assert.equal(written.port, "auto");
  });

  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`a tab's ring is +2 outside, and the first tab's ring keeps 4 clear of a card's rim (${width}, ${theme})`, async () => {
      const { page: p, context } = await openHtml(browser, page(`<div style="padding: ${LINE}px"><button class="btn" id="before">Before</button><div class="panel" style="padding: var(--basalt-space-4)">${row("r", NAMES.slice(0, 3))}</div></div>`), { scheme: theme, width });
      await p.locator("#before").focus();
      await p.keyboard.press("Tab");
      const ring = await p.evaluate(() => {
        const t = document.activeElement; const s = getComputedStyle(t); const r = t.getBoundingClientRect();
        const card = t.closest(".panel"); const c = card.getBoundingClientRect(); const rim = parseFloat(getComputedStyle(card).borderLeftWidth) || 0;
        const port = t.closest(".tabs-scroll").getBoundingClientRect();
        return { role: t.getAttribute("role"), ring: [s.outlineStyle, s.outlineWidth, s.outlineOffset], rim: r.left - 4 - (c.left + rim), clip: [r.left - port.left, port.right - r.right, r.top - port.top, port.bottom - r.bottom] };
      });
      assert.deepEqual([ring.role, ...ring.ring], ["tab", "solid", "2px", "2px"]);
      assert.ok(ring.rim >= 3.9, `4 clear of the rim: ${ring.rim}`);
      for (const gap of ring.clip) assert.ok(gap >= 4, `the scrollport keeps the ring's 4 on every side: ${ring.clip}`);
      await context.close();
    });
  }

  test("a box that declares less room narrows the hang, so the ring keeps 4", async () => {
    const { page: p, context } = await openHtml(browser, page(`<div style="padding: 0 8px; --basalt-edge-room-start: 8px">${row("r", NAMES.slice(0, 3))}</div>`));
    const g = await geometry(p);
    near(g.box.start, 4, "the box hangs by min(8, 8 - 4) = 4");
    near(g.content.start, 12, "its label is the hang's 4 past the line");
    await context.close();
  });
});

// The keyboard reveal, by the keys alone: no scrollIntoView or scrollLeft from the test, no programmatic focus inside the row. Focus the button above the row,
// press Tab (the chosen first tab), End, Home, the forward arrow 15 times, the back arrow 15 times, then back once more, which wraps to the last tab. After
// every key the focused tab is in the row with at least 4 between it and the scrollport's clip on every side (3.9: the last tab at the scroll's end gets 3.94,
// because the browser rounds the row's scroll width to a whole pixel), and the page never scrolls.
const walk = async (engine, browserOf, theme, width, dir) => {
  const { page: p, context } = await openHtml(browserOf, page(`<div dir="${dir}" style="padding: 0 ${LINE}px; max-width: 900px"><button class="btn" id="before">Before</button>${row("r", NAMES)}</div>`), { scheme: theme, width, deviceScaleFactor: 2 });
  const rtl = dir === "rtl";
  const [fwd, back] = rtl ? ["ArrowLeft", "ArrowRight"] : ["ArrowRight", "ArrowLeft"];
  const steps = [];
  const press = async (key, expect) => {
    await p.keyboard.press(key);
    await frames(p);
    steps.push(await p.evaluate(([key, expect]) => {
      const a = document.activeElement; const port = document.querySelector(".tabs-scroll"); const tabs = [...document.querySelectorAll(".tab")];
      const pr = port.getBoundingClientRect(), t = a.getBoundingClientRect();
      return { key, index: tabs.indexOf(a), expect, overflows: port.scrollWidth > port.clientWidth, gaps: [t.left - pr.left, pr.right - t.right, t.top - pr.top, pr.bottom - t.bottom].map((n) => Math.round(n * 100) / 100), page: [scrollX, scrollY] };
    }, [key, expect]));
  };
  await p.locator("#before").focus();
  await press("Tab", 0);
  await press("End", NAMES.length - 1);
  await press("Home", 0);
  for (let i = 1; i < NAMES.length; i++) await press(fwd, i);
  for (let i = NAMES.length - 2; i >= 0; i--) await press(back, i);
  await press(back, NAMES.length - 1);
  await context.close();
  const label = `${engine} ${width} ${dir} ${theme}`;
  assert.ok(steps[0].overflows, `${label}: the 16-tab row overflows`);
  for (const s of steps) {
    assert.equal(s.index, s.expect, `${label} ${s.key}: focus is on the tab the key names`);
    for (const gap of s.gaps) assert.ok(gap >= 3.9, `${label} ${s.key} (tab ${s.index}): the ring's 4 is clear on every side: ${s.gaps}`);
    assert.deepEqual(s.page, [0, 0], `${label} ${s.key}: the page did not scroll`);
  }
};

describe("the keyboard reveal: a focused tab comes fully into view with its ring (DECISIONS 358)", () => {
  let safari;
  before(async () => { safari = await webkit.launch(); });
  after(async () => { await safari?.close(); });
  for (const theme of THEMES) for (const width of [1440, 390]) for (const dir of ["ltr", "rtl"]) {
    test(`Chromium, ${width}, ${dir}, ${theme}`, () => walk("chromium", browser, theme, width, dir));
    test(`WebKit, ${width}, ${dir}, ${theme}`, () => walk("webkit", safari, theme, width, dir));
  }

  test("a click on a cut tab brings it into view too", async () => {
    const { page: p, context } = await openHtml(browser, page(`<div style="padding: 0 ${LINE}px; max-width: 900px">${row("r", NAMES)}</div>`), { width: 390 });
    const cut = await p.evaluate(() => { const port = document.querySelector(".tabs-scroll").getBoundingClientRect(); return [...document.querySelectorAll(".tab")].findIndex((t) => { const r = t.getBoundingClientRect(); return r.left < port.right && r.right > port.right; }); });
    assert.ok(cut > 0, "a tab is cut by the row's end");
    await p.locator(".tab").nth(cut).click();
    await frames(p);
    const gaps = await p.evaluate((i) => { const port = document.querySelector(".tabs-scroll").getBoundingClientRect(); const r = document.querySelectorAll(".tab")[i].getBoundingClientRect(); return [r.left - port.left, port.right - r.right]; }, cut);
    for (const gap of gaps) assert.ok(gap >= 3.9, `the clicked tab is fully in view with its ring's room: ${gaps}`);
    await context.close();
  });
});

describe("link tabs: one anatomy with tabs (DECISIONS 358)", () => {
  for (const theme of THEMES) for (const dir of ["ltr", "rtl"]) for (const [size, pad] of [["", 8], ["3xl", 10], ["5xl", 10]]) {
    test(`every link keeps its padding, the first label is on the line, the line is the label's width (${size || "lg"}, ${dir}, ${theme})`, async () => {
      const { page: p, context, errors } = await openHtml(browser, page(`<div dir="${dir}" style="padding: 0 ${LINE}px">${LINKS(size)}</div>`), { scheme: theme, width: 1440 });
      const g = await p.evaluate(() => {
        const rtl = getComputedStyle(document.querySelector(".link-tabs")).direction === "rtl"; const w = document.documentElement.clientWidth;
        const edge = (r) => (rtl ? { start: w - r.right, end: w - r.left } : { start: r.left, end: r.right });
        const ul = document.querySelector(".link-tabs > ul"); const before = getComputedStyle(ul, "::before");
        return { links: [...document.querySelectorAll(".link-tab")].map((a) => ({ box: edge(a.getBoundingClientRect()), label: edge(a.querySelector(":scope > :not(.link-tab-line)").getBoundingClientRect()), line: edge(a.querySelector(".link-tab-line").getBoundingClientRect()), pad: [getComputedStyle(a).paddingInlineStart, getComputedStyle(a).paddingInlineEnd] })), divider: [before.insetInlineStart, before.insetInlineEnd, before.height], shadow: getComputedStyle(ul).boxShadow };
      });
      for (const link of g.links) assert.deepEqual(link.pad, [`${pad}px`, `${pad}px`]);
      near(g.links[0].label.start, LINE, "the first label is on the content line");
      near(g.links[0].box.start, LINE - pad, "its box hangs by the padding");
      for (const link of g.links) { near(link.line.start, link.label.start, "the line starts with the label"); near(link.line.end, link.label.end, "and ends with it"); }
      assert.deepEqual(g.divider, [`${pad}px`, "0px", "1px"]);
      assert.equal(g.shadow, "none");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("a wrapped row starts each line's first label on the content line", async () => {
    const NINE = ["Everything", "Protein", "Creatine", "Pre-workout", "Vitamins & minerals", "Sleep", "Bars", "Mass gainers", "Accessories"];
    const { page: p, context } = await openHtml(browser, page(`<div style="padding: 0 ${LINE}px; width: 420px; box-sizing: border-box">${LINKS("3xl", NINE)}</div>`));
    const starts = await p.evaluate(() => { const out = []; let top = null; for (const a of document.querySelectorAll(".link-tab")) { const r = a.getBoundingClientRect(); if (r.top !== top) { out.push(a.querySelector(":scope > :not(.link-tab-line)").getBoundingClientRect().left); top = r.top; } } return out; });
    assert.ok(starts.length >= 2, `the row wraps: ${starts.length} lines`);
    for (const x of starts) near(x, LINE, "a line's first label");
    await context.close();
  });

  test("a link tab's ring is +2 outside the link", async () => {
    const { page: p, context } = await openHtml(browser, page(`<div style="padding: 0 ${LINE}px">${LINKS()}</div>`));
    await p.keyboard.press("Tab");
    assert.deepEqual(await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return [document.activeElement.className, s.outlineStyle, s.outlineWidth, s.outlineOffset]; }), ["link-tab", "solid", "2px", "2px"]);
    await context.close();
  });
});
