// Three sort states, the arrow after the label, and column explainers (DECISIONS 257 and 261), driven in Chromium against the built package
// with the real stylesheet: the cycle and aria-sort, the load order given back row for row, 0px for every column through every state at 1440
// and 390, the end-aligned label's move (a transform, only there, and none under reduced motion), the explainer (hover after 600ms, a press
// that cancels it, keyboard focus, Esc, a long press on touch, never over its own column, WCAG 1.4.13), the pinned column's keyboard-only
// scroll, and axe in both themes and forced colours.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";
import { HEADS, MODELS, modelsFixture } from "./models-fixture.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const LOAD = MODELS.map((m) => m[0]);
const NUMERIC = ["Input", "Output", "Latency"];

const open = async (options = {}, fixture = modelsFixture()) => {
  const { page, errors } = await fixturePage(browser, fixture, options);
  if (options.isMobile) {
    await page.evaluate(() => { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1"; document.head.append(m); });
    await page.waitForFunction((w) => window.innerWidth === w, options.viewport.width);
  }
  await page.addStyleTag({ content: "body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); }" });
  await settle(page);
  return { page, errors };
};
const head = (page, name) => page.locator("thead th").filter({ has: page.locator(".basalt-sort-label", { hasText: new RegExp(`^${name}$`) }) });
const sortOf = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("thead th")].filter((th) => th.hasAttribute("aria-sort")).map((th) => [th.querySelector(".basalt-sort-label").textContent, th.getAttribute("aria-sort")])));
const order = (page) => page.evaluate(() => window.models.order());
/** A press on the header cell's own corner, not on its label: the whole cell is the button. */
const press = async (page, name, touch) => {
  const b = await head(page, name).boundingBox();
  if (touch) await page.touchscreen.tap(b.x + b.width - 6, b.y + 6);
  else await page.mouse.click(b.x + b.width - 6, b.y + 6);
};
const card = (page, name) => page.locator(".basalt-explainer").filter({ has: page.locator(".basalt-explainer-title", { hasText: name }) });
const isOpen = (page, name) => card(page, name).evaluate((c) => c.hasAttribute("data-open") && !c.hidden);
const wait = (page, ms) => page.waitForTimeout(ms);
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
/** A finger held on a point for `ms`, through the protocol (Playwright's touchscreen only taps). */
const hold = async (page, x, y, ms) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await wait(page, ms);
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
};

/** Every column's place and width, the header's height, every label's layout box, and a start-aligned label's word edges, relative to the table at scroll 0. */
const measure = (page) => page.evaluate(() => {
  const table = document.querySelector(".basalt-table");
  const frame = document.querySelector(".basalt-table-container");
  const was = frame.scrollLeft;
  frame.scrollLeft = 0;
  const t = table.getBoundingClientRect();
  const r2 = (n) => +n.toFixed(2);
  const out = {
    table: r2(t.width),
    cols: [...table.querySelectorAll("col")].map((c) => r2(c.getBoundingClientRect().width)),
    heads: [...table.querySelectorAll("thead th")].map((th) => {
      const r = th.getBoundingClientRect();
      const label = th.querySelector(".basalt-sort-label");
      const seat = th.querySelector(".basalt-sort-seat").getBoundingClientRect();
      const o = { x: r2(r.left - t.left), w: r2(r.width), h: r2(r.height), labelBox: [label.offsetLeft, label.offsetWidth], seat: [r2(seat.left - t.left), r2(seat.width)] };
      if (!th.hasAttribute("data-numeric")) {
        const range = document.createRange();
        range.selectNodeContents(label);
        const w = range.getBoundingClientRect();
        o.words = [r2(w.left - t.left), r2(w.right - t.left)];
      }
      return o;
    }),
    cells: [...table.querySelectorAll("tbody tr:first-child > *")].map((c) => { const r = c.getBoundingClientRect(); return [r2(r.left - t.left), r2(r.width), r2(r.height)]; }),
  };
  frame.scrollLeft = was;
  return out;
});

describe("three states", () => {
  for (const theme of THEMES) {
    test(`each column: its first direction, the reverse, then the table's own order with no column lit; aria-sort on the th, none at the third (${theme})`, async () => {
      const { page, errors } = await open({ theme, ...DESKTOP });
      assert.deepEqual(await sortOf(page), {}, "the table loads in its own order, with nothing lit");
      assert.deepEqual(await order(page), LOAD);
      for (const name of HEADS) {
        const first = ["Input", "Output", "Latency", "Released", "Zero retention", "No training"].includes(name) ? "descending" : "ascending";
        const second = first === "ascending" ? "descending" : "ascending";
        await press(page, name);
        assert.deepEqual(await sortOf(page), { [name]: first }, `${name}, press 1`);
        await press(page, name);
        assert.deepEqual(await sortOf(page), { [name]: second }, `${name}, press 2`);
        await press(page, name);
        assert.deepEqual(await sortOf(page), {}, `${name}, press 3: nothing lit`);
        assert.equal(await page.locator("thead [aria-sort]").count(), 0, "no aria-sort anywhere at the third state");
        assert.deepEqual(await order(page), LOAD, `${name}, press 3: the load order, row for row`);
      }
      assert.equal(await page.locator("thead button[aria-sort]").count(), 0, "aria-sort belongs on the th");
      assert.deepEqual(errors, []);
    });
  }

  test("ties keep the table's own order: from any sort, the third press gives the load order back row for row", async () => {
    const { page } = await open({ ...DESKTOP });
    // Released has ties (two rows on each of four days): newest first keeps each pair in its load order.
    await press(page, "Released");
    assert.deepEqual((await order(page)).slice(0, 4), ["lumen/atlas-3", "lumen/atlas-3-mini", "quill/sparrow-2", "quill/sparrow-2-long-context-extended"]);
    // Sorted by Input first, then by Released: Released's ties are not taken from the order on screen.
    await press(page, "Input");
    await press(page, "Released");
    assert.deepEqual((await order(page)).slice(0, 4), ["lumen/atlas-3", "lumen/atlas-3-mini", "quill/sparrow-2", "quill/sparrow-2-long-context-extended"], "ties in the load order, not Input's");
    await press(page, "Released");
    await press(page, "Released");
    assert.deepEqual(await order(page), LOAD);
    // Not observed goes after every observed value in both directions.
    await press(page, "Latency");
    assert.deepEqual((await order(page)).slice(-2), ["quill/sparrow-2-long-context-extended", "basin/heron-1.5"]);
    await press(page, "Latency");
    assert.deepEqual((await order(page)).slice(-2), ["quill/sparrow-2-long-context-extended", "basin/heron-1.5"]);
    await press(page, "Latency");
    assert.deepEqual(await order(page), LOAD);
  });
});

describe("nothing moves but the end-aligned label", () => {
  for (const [size, options, touch] of [["1440", DESKTOP, false], ["390 on touch", PHONE, true]]) {
    for (const theme of THEMES) {
      test(`${size}, ${theme}: column widths, the header's height, every header and cell, every label's box and a start-aligned label's words at 0px through every state`, async () => {
        const { page } = await open({ theme, ...options });
        const base = await measure(page);
        assert.equal(base.heads.length, 7);
        let steps = 0;
        const same = async (what) => { steps += 1; await settle(page); assert.deepEqual(await measure(page), base, what); };
        for (const name of HEADS) for (let i = 0; i < 3; i++) { await press(page, name, touch); await same(`${name} press ${i + 1}`); }
        if (!touch) for (const name of HEADS) { await head(page, name).hover(); await same(`hover ${name}`); }
        await page.locator("body").click({ position: { x: 5, y: 5 } });
        for (const name of HEADS) { await head(page, name).locator("button").focus(); await same(`focus ${name}`); }
        // An explainer open (by focus, which opens it at once) moves nothing in the table.
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await same("an explainer open");
        assert.ok(steps >= (touch ? 29 : 36));
      });
    }
  }
});

describe("the arrow after the label", () => {
  const read = (page, name) => head(page, name).evaluate((th) => {
    const label = th.querySelector(".basalt-sort-label");
    const seat = th.querySelector(".basalt-sort-seat").getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(label);
    const w = range.getBoundingClientRect();
    const col = [...th.parentElement.children].indexOf(th) + 1;
    const td = document.querySelector(`tbody tr:first-child > :nth-child(${col})`);
    const r = document.createRange();
    r.selectNodeContents(td);
    const cell = r.getBoundingClientRect();
    const cs = getComputedStyle(label);
    return { left: w.left, right: w.right, seatL: seat.left, seatR: seat.right, cellL: cell.left, cellR: cell.right, transform: cs.transform, transition: cs.transitionProperty, duration: cs.transitionDuration, easing: cs.transitionTimingFunction };
  });

  test("the seat is after the label in every column; a start-aligned label never moves; an end-aligned label rests on the numbers' edge and moves aside by a transform as the arrow comes, and back as it goes", async () => {
    const { page } = await open({ ...DESKTOP });
    for (const name of HEADS) {
      const rest = await read(page, name);
      assert.ok(rest.seatL >= rest.left - 0.5, `${name}: the seat is after the label (${rest.seatL} vs ${rest.left})`);
    }
    // A start-aligned column: the label starts where the cells' text starts, in every state, and the arrow is in the seat after it.
    for (const name of ["Model", "Released", "Zero retention"]) {
      const rest = await read(page, name);
      assert.equal(rest.transform, "none", `${name} has no transform`);
      for (let i = 0; i < 3; i++) {
        await press(page, name);
        await settle(page);
        const now = await read(page, name);
        assert.equal(now.left, rest.left, `${name} press ${i + 1}: the label never moves`);
        assert.equal(now.transform, "none");
      }
      assert.ok(Math.abs(rest.left - rest.cellL) < 0.6, `${name}: the label starts on the cells' edge`);
    }
    await page.mouse.move(2, 2);
    // An end-aligned column: at rest, the label's end is the numbers' end; sorted, it has moved aside by the seat and its gap, so the arrow is after it.
    for (const name of NUMERIC) {
      const rest = await read(page, name);
      assert.ok(Math.abs(rest.right - rest.cellR) < 0.6, `${name}: at rest the label ends on the numbers' edge (${rest.right} vs ${rest.cellR})`);
      assert.match(rest.transform, /^matrix\(1, 0, 0, 1, 20, 0\)$/, `${name}: over the empty seat by a transform`);
      await press(page, name);
      await page.mouse.move(2, 2);
      await settle(page);
      const sorted = await read(page, name);
      assert.equal(sorted.transform, "none", `${name}: sorted, no transform`);
      assert.ok(Math.abs(rest.right - sorted.right - 20) < 0.6, `${name}: moved aside by 20px (the 16px seat and its 4px gap)`);
      assert.ok(sorted.right <= sorted.seatL - 3.5, `${name}: the arrow is after the label`);
      assert.ok(Math.abs(sorted.seatR - rest.cellR) < 0.6, `${name}: the arrow ends on the numbers' edge`);
      assert.equal(sorted.transition, "transform");
      assert.equal(sorted.duration, "0.15s", "duration-base when it arrives");
      await press(page, name);
      await press(page, name);
      await page.mouse.move(2, 2);
      await settle(page);
      const back = await read(page, name);
      assert.equal(back.duration, "0.1125s", "0.75x when it goes");
      assert.match(back.easing, /cubic-bezier/);
      assert.ok(Math.abs(back.right - rest.right) < 0.1, `${name}: back on the numbers' edge`);
    }
  });

  test("the move is a transition on the label alone: part-way through it, the column, the cell and the seat are where they were", async () => {
    const { page } = await open({ ...DESKTOP });
    const base = await measure(page);
    const client = await page.context().newCDPSession(page);
    await client.send("Animation.enable");
    await client.send("Animation.setPlaybackRate", { playbackRate: 0 });
    await press(page, "Output");
    const mid = await head(page, "Output").evaluate((th) => {
      const label = th.querySelector(".basalt-sort-label");
      const running = label.getAnimations();
      for (const a of running) { a.pause(); a.currentTime = 60; }
      return { running: running.map((a) => a.transitionProperty), transform: getComputedStyle(label).transform };
    });
    assert.deepEqual(mid.running, ["transform"]);
    const x = Number(mid.transform.match(/matrix\(1, 0, 0, 1, ([\d.]+), 0\)/)?.[1]);
    assert.ok(x > 0.5 && x < 19.5, `part-way: ${mid.transform}`);
    const now = await measure(page);
    assert.deepEqual(now, base, "nothing else moved");
  });

  test("under reduced motion the end-aligned label never moves: it keeps its place beside the seat through every state", async () => {
    const { page } = await open({ ...DESKTOP, reducedMotion: "reduce" });
    for (const name of NUMERIC) {
      const rest = await read(page, name);
      assert.equal(rest.transform, "none");
      assert.ok(rest.right <= rest.seatL - 3.5, `${name}: beside its seat at rest`);
      await head(page, name).hover();
      assert.equal((await read(page, name)).right, rest.right, `${name} on hover`);
      for (let i = 0; i < 3; i++) {
        await press(page, name);
        const now = await read(page, name);
        assert.equal(now.right, rest.right, `${name} press ${i + 1}`);
        assert.equal(now.transform, "none");
      }
    }
  });

  test("on touch the caret is always there, so the end-aligned label always stands beside its seat and never moves", async () => {
    const { page } = await open({ ...PHONE });
    const frame = page.locator(".basalt-table-container");
    await frame.evaluate((f) => { f.scrollLeft = 0; });
    for (const name of ["Input"]) {
      const rest = await read(page, name);
      assert.equal(rest.transform, "none");
      for (let i = 0; i < 3; i++) { await press(page, name, true); await settle(page); assert.equal((await read(page, name)).right, rest.right); }
    }
  });
});

describe("the column explainer", () => {
  test("hover opens it after 600ms, not before; it is above the header, the opener's level plus one, the rim, radius 12 and shadow-overlay", async () => {
    const { page, errors } = await open({ ...DESKTOP });
    const box = await head(page, "Zero retention").boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await wait(page, 300);
    assert.equal(await isOpen(page, "Zero retention"), false, "not at 300ms");
    await wait(page, 600);
    assert.equal(await isOpen(page, "Zero retention"), true, "open by 900ms");
    await settle(page);
    const look = await card(page, "Zero retention").evaluate((c) => {
      const cs = getComputedStyle(c);
      const container = document.querySelector(".basalt-table-container").getAttribute("data-level");
      return { level: c.getAttribute("data-level"), container, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow !== "none", border: cs.borderTopWidth, side: c.getAttribute("data-side"), padding: cs.paddingTop };
    });
    assert.equal(look.level, String(Number(look.container) + 1), "its opener's level plus one");
    assert.equal(look.radius, "12px");
    assert.equal(look.border, "1px");
    assert.ok(look.shadow);
    assert.equal(look.padding, "16px");
    assert.equal(look.side, "top");
    const c = await card(page, "Zero retention").boundingBox();
    assert.ok(c.y + c.height <= box.y - 5, "above the header");
    assert.ok(Math.abs(c.x - box.x) < 0.6, "on the column's start edge");
    assert.deepEqual(await sortOf(page), {}, "hovering never sorts");
    assert.deepEqual(errors, []);
  });

  test("a press before the wait sorts and cancels it, and it stays shut while the pointer stays", async () => {
    const { page } = await open({ ...DESKTOP });
    const box = await head(page, "Zero retention").boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await wait(page, 250);
    await page.mouse.down();
    await page.mouse.up();
    assert.deepEqual(await sortOf(page), { "Zero retention": "descending" });
    await wait(page, 900);
    assert.equal(await isOpen(page, "Zero retention"), false);
    // Opened by hover, a press sorts and closes it.
    await page.mouse.move(2, 2);
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await wait(page, 900);
    assert.equal(await isOpen(page, "Zero retention"), true);
    await page.mouse.down();
    await page.mouse.up();
    assert.deepEqual(await sortOf(page), { "Zero retention": "ascending" });
    assert.equal(await isOpen(page, "Zero retention"), false, "the sort press closed it");
  });

  test("WCAG 1.4.13: the pointer can move onto it, it stays while hovered, and Esc dismisses it without moving the pointer; it stays shut until the pointer leaves", async () => {
    const { page } = await open({ ...DESKTOP });
    const box = await head(page, "No training").boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await wait(page, 900);
    const c = await card(page, "No training").boundingBox();
    await page.mouse.move(box.x + 20, c.y + c.height - 2, { steps: 4 });
    await wait(page, 600);
    assert.equal(await isOpen(page, "No training"), true, "hoverable");
    await page.mouse.move(c.x + 10, c.y + 10, { steps: 3 });
    await wait(page, 1200);
    assert.equal(await isOpen(page, "No training"), true, "persistent");
    await page.keyboard.press("Escape");
    assert.equal(await isOpen(page, "No training"), false, "dismissible");
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await wait(page, 900);
    assert.equal(await isOpen(page, "No training"), true, "after the pointer left and came back, it opens again");
    await page.mouse.move(2, 2);
    await wait(page, 400);
    assert.equal(await isOpen(page, "No training"), false, "it goes once hover has left");
  });

  test("keyboard focus opens it at once; its words are the header's description; Tab goes into its link and on to the next header; Esc closes it and keeps focus", async () => {
    const { page } = await open({ ...DESKTOP });
    await head(page, "Released").locator("button").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.closest("th")?.querySelector(".basalt-sort-label").textContent), "Zero retention");
    assert.equal(await isOpen(page, "Zero retention"), true, "open at once on keyboard focus");
    const described = await head(page, "Zero retention").locator("button").evaluate((b) => document.getElementById(b.getAttribute("aria-describedby"))?.textContent);
    assert.match(described, /^At least one provider/);
    const name = await head(page, "Zero retention").locator("button").evaluate((b) => b.textContent.trim());
    assert.equal(name, "Zero retention", "the button's name is the label alone");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "How retention is reported", "Tab goes into its link");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement.closest("th")?.querySelector(".basalt-sort-label").textContent), "Zero retention", "and back");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.closest("th")?.querySelector(".basalt-sort-label").textContent), "No training", "and on to the next header");
    await wait(page, 300);
    assert.equal(await isOpen(page, "Zero retention"), false, "the one left behind closed");
    assert.equal(await isOpen(page, "No training"), true);
    await page.keyboard.press("Escape");
    assert.equal(await isOpen(page, "No training"), false, "Esc closes it");
    assert.equal(await page.evaluate(() => document.activeElement.closest("th")?.querySelector(".basalt-sort-label").textContent), "No training", "focus stays on the header");
    await page.keyboard.press("Enter");
    assert.deepEqual(await sortOf(page), { "No training": "descending" }, "Enter sorts");
    assert.equal(await isOpen(page, "No training"), false, "and opens nothing");
  });

  test("a long press on touch opens it without sorting; a tap sorts; a tap elsewhere closes it", async () => {
    const { page } = await open({ ...PHONE });
    await page.locator(".basalt-table-container").evaluate((f) => { f.scrollLeft = f.scrollWidth; });
    const box = await head(page, "No training").boundingBox();
    await hold(page, box.x + box.width / 2, box.y + box.height / 2, 750);
    await wait(page, 100);
    assert.equal(await isOpen(page, "No training"), true, "a long press opens it");
    assert.deepEqual(await sortOf(page), {}, "and does not sort");
    await page.touchscreen.tap(20, 20);
    await wait(page, 300);
    assert.equal(await isOpen(page, "No training"), false, "a tap elsewhere closes it");
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    assert.deepEqual(await sortOf(page), { "No training": "descending" }, "a tap sorts");
    await wait(page, 900);
    assert.equal(await isOpen(page, "No training"), false, "and opens nothing");
  });

  test("it never covers its own column: above the header, else beside it, else not at all", async () => {
    const { page } = await open({ ...DESKTOP });
    const check = async (name, why) => {
      const th = await head(page, name).boundingBox();
      const c = await card(page, name).boundingBox();
      const overColumn = c.x < th.x + th.width - 0.5 && c.x + c.width > th.x + 0.5 && c.y + c.height > th.y + th.height;
      assert.equal(overColumn, false, `${name} ${why}: card ${JSON.stringify(c)}, header ${JSON.stringify(th)}`);
      return card(page, name).getAttribute("data-side");
    };
    await head(page, "Zero retention").locator("button").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(await check("Zero retention", "with room above"), "top");
    // The header near the top of the window: no room above, so beside it. At 1440 the end side has no room (the column ends 186px from the
    // window's edge), so it takes the start side, over the neighbouring columns.
    await page.keyboard.press("Shift+Tab");
    await page.evaluate(() => { const th = document.querySelector("thead th:nth-child(6)"); window.scrollBy(0, th.getBoundingClientRect().top - 20); });
    await frames(page);
    await page.keyboard.press("Tab");
    await frames(page);
    assert.equal(await isOpen(page, "Zero retention"), true);
    assert.equal(await check("Zero retention", "near the top"), "start");
    // With room on the end side (a table narrower than the window), it takes the end side first.
    {
      const narrow = await open({ ...DESKTOP }, modelsFixture({ width: 1100 }));
      await narrow.page.evaluate(() => { const th = document.querySelector("thead th:nth-child(6)"); window.scrollBy(0, th.getBoundingClientRect().top - 20); });
      await head(narrow.page, "Released").locator("button").focus();
      await narrow.page.keyboard.press("Tab");
      await frames(narrow.page);
      const th = await head(narrow.page, "Zero retention").boundingBox();
      const c = await card(narrow.page, "Zero retention").boundingBox();
      assert.equal(await card(narrow.page, "Zero retention").getAttribute("data-side"), "end");
      assert.ok(c.x >= th.x + th.width + 5, "after the header, over the next column, not its own");
    }
    // With no room above or beside, hover and focus open nothing rather than cover the column.
    await page.keyboard.press("Shift+Tab");
    await page.setViewportSize({ width: 600, height: 900 });
    await page.evaluate(() => { const f = document.querySelector(".basalt-table-container"); f.scrollLeft = f.scrollWidth; });
    await frames(page);
    await page.keyboard.press("Tab");
    await frames(page);
    const th = await head(page, "Zero retention").boundingBox();
    if (th.x - 332 < 0 && th.x + th.width + 332 > 600) assert.equal(await isOpen(page, "Zero retention"), false, "no room: it stays shut");
  });

  test("a table with no explainers loads none of its code, and a header with one keeps its name, role and press", async () => {
    const { page } = await open({ ...DESKTOP });
    const roles = await page.evaluate(() => [...document.querySelectorAll("thead th button")].map((b) => [b.getAttribute("aria-expanded"), b.getAttribute("aria-haspopup")]));
    assert.ok(roles.every(([e, h]) => e === null && h === null), "the sort button is never a popup trigger");
  });
});

describe("the pinned column at 390", () => {
  test("a header focused from the keyboard scrolls clear of the pinned name; a tap on a half-covered header does not scroll and sorts that header", async () => {
    const { page } = await open({ ...PHONE });
    const frame = page.locator(".basalt-table-container");
    // Put Input half under the pinned Model column.
    const place = () => page.evaluate(() => {
      const f = document.querySelector(".basalt-table-container");
      const pin = document.querySelector("thead th:nth-child(1)").getBoundingClientRect();
      f.scrollLeft = 0;
      const input = document.querySelector("thead th:nth-child(2)").getBoundingClientRect();
      f.scrollLeft = input.left - pin.right + 40;
      return f.scrollLeft;
    });
    const scroll = await place();
    const covered = await page.evaluate(() => {
      const pin = document.querySelector("thead th:nth-child(1)").getBoundingClientRect();
      const input = document.querySelector("thead th:nth-child(2)").getBoundingClientRect();
      return pin.right - input.left;
    });
    assert.ok(covered > 30, `Input is half under the pinned column (${covered}px)`);
    const input = await head(page, "Input").boundingBox();
    const pin = await page.locator("thead th").first().boundingBox();
    await page.touchscreen.tap((pin.x + pin.width + input.x + input.width) / 2, input.y + input.height / 2);
    assert.deepEqual(await sortOf(page), { Input: "descending" }, "the tap sorted the header under the finger");
    assert.equal(await frame.evaluate((f) => f.scrollLeft), scroll, "and the tap's focus did not scroll the table");
    // From the keyboard, the same header scrolls clear.
    await place();
    await page.locator("thead th").first().locator("button").focus();
    await page.keyboard.press("Tab");
    await settle(page);
    const after = await page.evaluate(() => {
      const pin = document.querySelector("thead th:nth-child(1)").getBoundingClientRect();
      const input = document.querySelector("thead th:nth-child(2)").getBoundingClientRect();
      return input.left - pin.right;
    });
    assert.ok(after >= -0.5, `keyboard focus scrolled it clear (${after})`);
  });
});

describe("accessibility", () => {
  for (const theme of THEMES) {
    for (const [what, options] of [["", {}], [" in forced colours", { forcedColors: "active" }]]) {
      test(`axe: sorted, reversed, back to its own order, and with an explainer open (${theme}${what})`, async () => {
        const { page } = await open({ theme, colorScheme: theme, ...DESKTOP, ...options });
        await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
        await page.addScriptTag({ content: axeSource });
        const run = async (why) => {
          const result = await page.evaluate((o) => window.axe.run(document, o), AXE);
          assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`), [], why);
        };
        await run("at rest");
        await press(page, "Input");
        await run("sorted");
        await press(page, "Input");
        await run("reversed");
        await press(page, "Input");
        await run("own order");
        await head(page, "Released").locator("button").focus();
        await page.keyboard.press("Tab");
        await settle(page);
        assert.equal(await isOpen(page, "Zero retention"), true);
        await run("an explainer open");
      });
    }
  }
});

describe("sortRows", () => {
  test("is stable on the order it is given, puts not observed last both ways, and gives the rows back for no direction", async () => {
    const { page } = await open({ ...DESKTOP }, `
      const rows = [{ k: "b", n: 2 }, { k: "a", n: null }, { k: "c", n: 2 }, { k: "d", n: 1 }, { k: "e", n: "" }, { k: "item 10", n: 3 }, { k: "item 2", n: 3 }];
      window.out = {
        asc: B.sortRows(rows, (r) => r.n, "ascending").map((r) => r.k).join(),
        desc: B.sortRows(rows, (r) => r.n, "descending").map((r) => r.k).join(),
        none: B.sortRows(rows, (r) => r.n, undefined).map((r) => r.k).join(),
        text: B.sortRows(rows, (r) => r.k, "ascending").map((r) => r.k).join(),
        same: B.sortRows(rows, (r) => r.n, undefined) !== rows,
      };`);
    const out = await page.evaluate(() => window.out);
    assert.equal(out.asc, "d,b,c,item 10,item 2,a,e");
    assert.equal(out.desc, "item 10,item 2,b,c,d,a,e");
    assert.equal(out.none, "b,a,c,d,e,item 10,item 2");
    assert.equal(out.text, "a,b,c,d,e,item 2,item 10", "natural order");
    assert.equal(out.same, true, "a new array");
  });
});
