// Three sort states, the arrow after the label, and the column explainer in the HTML skill (DECISIONS 257 and 261), React's TableHead and
// TableHeadExplainer: the cycle and aria-sort, the load order given back row for row, 0px for every column at 1440 and 390, the end-aligned label's
// move (a transform, there only, none under reduced motion), the explainer (hover after 600ms, a press that cancels it, keyboard focus, Esc, a long
// press on touch, never over its column, Tab into its link), the pinned column's keyboard-only scroll, and axe in both themes and forced colours.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const MODELS = [
  ["lumen/atlas-3", 2, 8, 0.62, "2026-11-19", 1, 1],
  ["lumen/atlas-3-mini", 0.25, 1, 0.31, "2026-11-19", 1, 1],
  ["quill/sparrow-2", 1.2, 4.8, 0.48, "2026-11-12", 0, 1],
  ["quill/sparrow-2-long-context-extended", 3, 15, null, "2026-11-12", 0, 0],
  ["harbor/tern-8b", 0.05, 0.2, 0.18, "2026-10-30", 1, 0],
  ["harbor/tern-70b", 0.6, 0.9, 0.74, "2026-10-30", 1, 0],
  ["meridian/kestrel", 5, 25, 1.2, "2026-10-21", 0, 1],
  ["meridian/kestrel-fast", 6, 30, 0.55, "2026-10-21", 0, 1],
  ["basin/heron-1.5", 0.8, 3.2, null, "2026-09-28", 1, 1],
  ["basin/heron-1", 0.4, 1.6, 0.95, "2026-08-14", 0, 0],
];
const LOAD = MODELS.map((m) => m[0]);
const HEADS = ["Model", "Input", "Output", "Latency", "Released", "Zero retention", "No training"];
const explain = (title, words, link) => `<div class="explainer"><p class="explainer-title">${title}</p><p>${words}</p><p><a href="#${title.split(" ")[0].toLowerCase()}">${link}</a></p></div>`;
const row = (m) => `<tr><th scope="row">${m[0]}</th><td data-numeric data-value="${m[1]}">$${m[1].toFixed(2)}</td><td data-numeric data-value="${m[2]}">$${m[2].toFixed(2)}</td>${m[3] === null ? "<td data-numeric data-not-observed>Not observed</td>" : `<td data-numeric data-value="${m[3]}">${m[3].toFixed(2)} s</td>`}<td data-value="${m[4]}">${m[4]}</td><td data-value="${m[5]}">${m[5] ? "Yes" : "No"}</td><td data-value="${m[6]}">${m[6] ? "Yes" : "No"}</td></tr>`;
const PAGE = `<main class="page" style="padding-top: 280px; padding-bottom: 1200px">
<div class="panel table-wrap" role="region" aria-label="Models" tabindex="0">
<table id="models" data-fixed data-pinned="1" style="min-width: 1008px">
<colgroup><col><col style="width: 104px"><col style="width: 104px"><col style="width: 120px"><col style="width: 140px"><col style="width: 192px"><col style="width: 168px"></colgroup>
<thead><tr><th data-sortable>Model</th><th data-sortable data-numeric>Input</th><th data-sortable data-numeric>Output</th><th data-sortable data-numeric>Latency</th><th data-sortable data-first-sort="descending">Released</th><th data-sortable data-first-sort="descending">Zero retention${explain("Zero retention", "At least one provider for this model says it keeps no prompts or outputs once it has answered.", "How retention is reported")}</th><th data-sortable data-first-sort="descending">No training${explain("No training", "No provider for this model trains on your prompts or outputs.", "How training terms are read")}</th></tr></thead>
<tbody>${MODELS.map(row).join("")}</tbody>
</table></div>
<p><a href="#after">After the table</a></p>
</main>`;
const html = compose(`<title>Models</title>${PAGE}`, { fonts: false }).html;
const open = (options = {}) => openHtml(browser, html, { scheme: "dark", ...options });
const head = (page, name) => page.locator("#models thead th").nth(HEADS.indexOf(name));
const sortOf = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#models thead th")].filter((t) => t.hasAttribute("aria-sort")).map((t) => [t.querySelector(".sort-label").textContent, t.getAttribute("aria-sort")])));
const order = (page) => page.evaluate(() => [...document.querySelectorAll("#models tbody tr th")].map((t) => t.textContent));
const press = async (page, name, touch) => {
  const b = await head(page, name).boundingBox();
  if (touch) await page.touchscreen.tap(b.x + b.width - 6, b.y + 6);
  else await page.mouse.click(b.x + b.width - 6, b.y + 6);
};
const card = (page, name) => head(page, name).locator(".explainer");
const isOpen = (page, name) => card(page, name).evaluate((c) => c.matches(":popover-open"));
const wait = (page, ms) => page.waitForTimeout(ms);
const settled = (page) => page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))); });
const measure = (page) => page.evaluate(() => {
  const table = document.getElementById("models");
  const frame = table.closest(".table-wrap");
  const was = frame.scrollLeft;
  frame.scrollLeft = 0;
  const t = table.getBoundingClientRect();
  const r2 = (n) => +n.toFixed(2);
  const out = {
    cols: [...table.querySelectorAll("col")].map((c) => r2(c.getBoundingClientRect().width)),
    heads: [...table.querySelectorAll("thead th")].map((th) => {
      const r = th.getBoundingClientRect();
      const label = th.querySelector(".sort-label");
      const o = { x: r2(r.left - t.left), w: r2(r.width), h: r2(r.height), label: [label.offsetLeft, label.offsetWidth] };
      if (!th.hasAttribute("data-numeric")) { const range = document.createRange(); range.selectNodeContents(label); const w = range.getBoundingClientRect(); o.words = [r2(w.left - t.left), r2(w.right - t.left)]; }
      return o;
    }),
    cells: [...table.querySelectorAll("tbody tr:first-child > *")].map((c) => { const r = c.getBoundingClientRect(); return [r2(r.left - t.left), r2(r.width)]; }),
  };
  frame.scrollLeft = was;
  return out;
});

describe("three states", () => {
  for (const scheme of THEMES) {
    test(`the first direction, the reverse, then the table's own order with nothing lit, in every column; ties come back row for row (${scheme})`, async () => {
      const { page, context, errors } = await open({ scheme });
      assert.deepEqual(await sortOf(page), {});
      for (const name of HEADS) {
        const first = name === "Model" ? "ascending" : "descending";
        await press(page, name);
        assert.deepEqual(await sortOf(page), { [name]: first });
        await press(page, name);
        assert.deepEqual(await sortOf(page), { [name]: first === "ascending" ? "descending" : "ascending" });
        await press(page, name);
        assert.deepEqual(await sortOf(page), {}, `${name}: nothing lit at the third press`);
        assert.deepEqual(await order(page), LOAD, `${name}: the load order, row for row`);
      }
      // Released's ties keep the load order, not the order on screen.
      await press(page, "Input");
      await press(page, "Released");
      assert.deepEqual((await order(page)).slice(0, 4), LOAD.slice(0, 4));
      const events = await page.evaluate(() => new Promise((resolve) => { document.addEventListener("sortchange", (e) => resolve(e.detail), { once: true }); document.querySelectorAll("#models thead th .sort")[4].click(); }));
      assert.deepEqual(events, { index: 4, direction: "ascending" });
      const third = await page.evaluate(() => new Promise((resolve) => { document.addEventListener("sortchange", (e) => resolve(e.detail), { once: true }); document.querySelectorAll("#models thead th .sort")[4].click(); }));
      assert.deepEqual(third, { index: 4, direction: null }, "sortchange says null at the third press");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

describe("nothing moves but the end-aligned label", () => {
  for (const [width, touch] of [[1440, false], [390, true]]) {
    test(`at ${width}: columns, the header's height, every header, every label's box and a start-aligned label's words at 0px through every state`, async () => {
      const { page, context } = await open({ width, touch });
      const base = await measure(page);
      for (const name of HEADS) for (let i = 0; i < 3; i++) { await press(page, name, touch); await settled(page); assert.deepEqual(await measure(page), base, `${name} press ${i + 1}`); }
      if (!touch) for (const name of HEADS) { await head(page, name).hover(); await settled(page); assert.deepEqual(await measure(page), base, `hover ${name}`); }
      await head(page, "Released").locator(".sort").focus();
      await page.keyboard.press("Tab");
      await settled(page);
      assert.equal(await isOpen(page, "Zero retention"), true);
      assert.deepEqual(await measure(page), base, "an explainer open");
      await context.close();
    });
  }

  test("the seat is after the label; a start-aligned label never moves; an end-aligned label rests on the numbers' edge and moves aside by a transform", async () => {
    const { page, context } = await open();
    const read = (name) => head(page, name).evaluate((th) => {
      const label = th.querySelector(".sort-label");
      const range = document.createRange(); range.selectNodeContents(label);
      const w = range.getBoundingClientRect();
      const seat = th.querySelector(".sort-seat").getBoundingClientRect();
      const i = [...th.parentElement.children].indexOf(th) + 1;
      const r = document.createRange(); r.selectNodeContents(document.querySelector(`#models tbody tr:first-child > :nth-child(${i})`));
      const cs = getComputedStyle(label);
      return { left: w.left, right: w.right, seatL: seat.left, seatR: seat.right, cellR: r.getBoundingClientRect().right, transform: cs.transform, duration: cs.transitionDuration };
    });
    for (const name of ["Model", "Released"]) {
      const rest = await read(name);
      assert.ok(rest.seatL >= rest.right, `${name}: the seat is after the label`);
      for (let i = 0; i < 3; i++) { await press(page, name); await settled(page); assert.equal((await read(name)).left, rest.left, `${name} never moves`); }
    }
    await page.mouse.move(2, 2);
    for (const name of ["Input", "Latency"]) {
      const rest = await read(name);
      assert.equal(rest.transform, "matrix(1, 0, 0, 1, 20, 0)");
      assert.ok(Math.abs(rest.right - rest.cellR) < 0.6, `${name}: on the numbers' edge at rest`);
      await press(page, name);
      await page.mouse.move(2, 2);
      await settled(page);
      const sorted = await read(name);
      assert.equal(sorted.transform, "none");
      assert.equal(sorted.duration, "0.15s");
      assert.ok(sorted.right <= sorted.seatL - 3.5, `${name}: the arrow after the label`);
      assert.ok(Math.abs(sorted.seatR - rest.cellR) < 0.6);
      await press(page, name); await press(page, name);
      await page.mouse.move(2, 2);
      await settled(page);
      const back = await read(name);
      assert.equal(back.duration, "0.1125s");
      assert.ok(Math.abs(back.right - rest.right) < 0.1);
    }
    await context.close();
  });

  test("under reduced motion the end-aligned label never moves", async () => {
    const { page, context } = await open({ reducedMotion: "reduce" });
    const right = () => head(page, "Output").locator(".sort-label").evaluate((l) => { const r = document.createRange(); r.selectNodeContents(l); return [r.getBoundingClientRect().right, getComputedStyle(l).transform]; });
    const rest = await right();
    assert.equal(rest[1], "none");
    await head(page, "Output").hover();
    assert.deepEqual(await right(), rest);
    for (let i = 0; i < 3; i++) { await press(page, "Output"); assert.deepEqual(await right(), rest); }
    await context.close();
  });
});

describe("the column explainer", () => {
  test("hover opens it after 600ms, above the header, a level-2 panel with the rim, radius 12 and shadow-overlay; a press before then sorts and cancels it", async () => {
    const { page, context, errors } = await open();
    const box = await head(page, "Zero retention").boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await wait(page, 300);
    assert.equal(await isOpen(page, "Zero retention"), false);
    await wait(page, 600);
    assert.equal(await isOpen(page, "Zero retention"), true);
    await settled(page);
    const look = await card(page, "Zero retention").evaluate((c) => { const cs = getComputedStyle(c); const level2 = getComputedStyle(document.documentElement).getPropertyValue("--basalt-surface-2"); return { radius: cs.borderTopLeftRadius, border: cs.borderTopWidth, shadow: cs.boxShadow !== "none", side: c.getAttribute("data-side"), bg: cs.backgroundColor, level2, padding: cs.paddingTop }; });
    assert.equal(look.radius, "12px");
    assert.equal(look.border, "1px");
    assert.ok(look.shadow);
    assert.equal(look.side, "top");
    assert.equal(look.padding, "16px");
    const c = await card(page, "Zero retention").boundingBox();
    assert.ok(c.y + c.height <= box.y - 5);
    assert.deepEqual(await sortOf(page), {});
    await page.mouse.move(2, 2);
    await wait(page, 300);
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await wait(page, 200);
    await page.mouse.down();
    await page.mouse.up();
    assert.deepEqual(await sortOf(page), { "Zero retention": "descending" });
    await wait(page, 900);
    assert.equal(await isOpen(page, "Zero retention"), false, "the press cancelled it");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("WCAG 1.4.13: hoverable, persistent, and Esc dismisses it without moving the pointer", async () => {
    const { page, context } = await open();
    const box = await head(page, "No training").boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await wait(page, 900);
    const c = await card(page, "No training").boundingBox();
    await page.mouse.move(box.x + 20, c.y + c.height - 2, { steps: 4 });
    await page.mouse.move(c.x + 10, c.y + 10, { steps: 3 });
    await wait(page, 1200);
    assert.equal(await isOpen(page, "No training"), true);
    await page.keyboard.press("Escape");
    assert.equal(await isOpen(page, "No training"), false);
    await page.mouse.move(2, 2);
    await context.close();
  });

  test("keyboard focus opens it at once; its words describe the button; Tab goes into its link and on; Esc closes it and keeps focus; Enter sorts", async () => {
    const { page, context } = await open();
    await head(page, "Released").locator(".sort").focus();
    await page.keyboard.press("Tab");
    assert.equal(await isOpen(page, "Zero retention"), true);
    const described = await head(page, "Zero retention").locator(".sort").evaluate((b) => b.getAttribute("aria-describedby").split(" ").map((id) => document.getElementById(id).textContent).join(" "));
    assert.match(described, /^At least one provider/);
    assert.equal(await page.getByRole("button", { name: "Zero retention", exact: true }).count(), 1, "the button's name is the label alone");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "How retention is reported");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.closest("th")?.querySelector(".sort-label").textContent), "No training");
    await wait(page, 300);
    assert.equal(await isOpen(page, "Zero retention"), false);
    assert.equal(await isOpen(page, "No training"), true);
    await page.keyboard.press("Escape");
    assert.equal(await isOpen(page, "No training"), false);
    assert.equal(await page.evaluate(() => document.activeElement.closest("th")?.querySelector(".sort-label").textContent), "No training");
    await page.keyboard.press("Enter");
    assert.deepEqual(await sortOf(page), { "No training": "descending" });
    assert.equal(await isOpen(page, "No training"), false);
    await context.close();
  });

  test("on touch, a long press opens it without sorting, a tap elsewhere closes it, and a tap sorts", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    await page.locator(".table-wrap").evaluate((f) => { f.scrollLeft = f.scrollWidth; });
    const box = await head(page, "No training").boundingBox();
    const client = await context.newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await wait(page, 750);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await wait(page, 100);
    assert.equal(await isOpen(page, "No training"), true);
    assert.deepEqual(await sortOf(page), {});
    await page.touchscreen.tap(20, 20);
    await wait(page, 300);
    assert.equal(await isOpen(page, "No training"), false);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    assert.deepEqual(await sortOf(page), { "No training": "descending" });
    await context.close();
  });

  test("it never covers its own column: near the top of the window it goes beside the header", async () => {
    const { page, context } = await open();
    await page.evaluate(() => { const th = document.querySelectorAll("#models thead th")[5]; window.scrollBy(0, th.getBoundingClientRect().top - 20); });
    await head(page, "Released").locator(".sort").focus();
    await page.keyboard.press("Tab");
    await settled(page);
    const th = await head(page, "Zero retention").boundingBox();
    const c = await card(page, "Zero retention").boundingBox();
    assert.notEqual(await card(page, "Zero retention").getAttribute("data-side"), "top");
    assert.ok(c.x + c.width <= th.x + 0.5 || c.x >= th.x + th.width - 0.5, "beside it, not over it");
    await context.close();
  });
});

describe("the pinned column at 390", () => {
  test("a tap on a half-covered header does not scroll and sorts that header; keyboard focus scrolls it clear", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    const place = () => page.evaluate(() => { const f = document.querySelector(".table-wrap"); f.scrollLeft = 40; return f.scrollLeft; });
    const scroll = await place();
    const input = await head(page, "Input").boundingBox();
    const pin = await head(page, "Model").boundingBox();
    assert.ok(pin.x + pin.width - input.x > 30, "Input is half under the pinned column");
    await page.touchscreen.tap((pin.x + pin.width + input.x + input.width) / 2, input.y + input.height / 2);
    assert.deepEqual(await sortOf(page), { Input: "descending" });
    assert.equal(await page.locator(".table-wrap").evaluate((f) => f.scrollLeft), scroll, "the tap's focus did not scroll");
    await place();
    await head(page, "Model").locator(".sort").focus();
    await page.keyboard.press("Tab");
    await settled(page);
    const gap = await page.evaluate(() => { const h = document.querySelectorAll("#models thead th"); return h[1].getBoundingClientRect().left - h[0].getBoundingClientRect().right; });
    assert.ok(gap >= -0.5, `keyboard focus scrolled it clear (${gap})`);
    await context.close();
  });
});

describe("axe", () => {
  for (const scheme of THEMES) {
    test(`sorted, reversed, the own order and an explainer open have no violations, and in forced colours (${scheme})`, async () => {
      const { page, context } = await open({ scheme });
      await page.addScriptTag({ content: axeSource });
      const run = async (why) => assert.deepEqual(await page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE), [], why);
      await run("at rest");
      for (const why of ["sorted", "reversed", "own order"]) { await press(page, "Input"); await run(why); }
      await head(page, "Released").locator(".sort").focus();
      await page.keyboard.press("Tab");
      await settled(page);
      await run("an explainer open");
      await page.emulateMedia({ forcedColors: "active" });
      await settled(page);
      await run("forced colours, an explainer open");
      await context.close();
    });
  }
});
