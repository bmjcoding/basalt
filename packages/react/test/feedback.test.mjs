// Callouts, toasts and the notification centre (council items 82 and 83, owner's word on the surface and the centre).
// Driven in Chromium against the built package with the real stylesheet, in both themes where the look differs.
//
//   callouts   a 45% status rim over the callout's own level, no tint; the icon and the title inks; forced colours
//   toasts     level 1 and fixed, the marks and their 16px seat, a running toast that never moves its title, the timeout
//              rule, assertive danger and polite the rest through text-only regions, the limit and the queue, grouping,
//              the peek, the 40px swipe, the drain on a hidden tab, reduced motion, forced colours, phone width
//   the centre the bell, the dot, unread and read rows that move nothing, keyboard and focus, the popover's level
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const render = (jsx, before = "") => `${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const STATUSES = ["info", "success", "warning", "danger"];

/** Any CSS colour as 8-bit sRGB, through a canvas, the way the browser draws it. */
const rgbOf = (page, css) => page.evaluate((css) => {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000"; ctx.fillStyle = css; ctx.clearRect(0, 0, 1, 1); ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
}, css);
const token = (page, name) => page.evaluate((name) => { const probe = document.createElement("i"); probe.style.color = `var(--basalt-${name})`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, name);
const mix = (top, under, amount) => top.map((v, i) => Math.round(v * amount + under[i] * (1 - amount)));
const near = (a, b, tolerance = 2) => a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
const toasts = (page) => page.locator(".basalt-toast");
const titles = (page) => page.locator(".basalt-toast-title").allTextContents();

// ---------------------------------------------------------------------------------------------------------------------
// Callouts: a 45% status rim, no tint (decision 82, 4 to 0)

describe("Callout: the status rim", () => {
  // Level 1 on the page, 2 in a card, 3 in a card in a card.
  const levels = `<>
    <div data-at="1">${STATUSES.map((s) => `<B.Callout status="${s}" title="${s}">Body</B.Callout>`).join("")}</div>
    <B.Card><div data-at="2">${STATUSES.map((s) => `<B.Callout status="${s}" title="${s}">Body</B.Callout>`).join("")}</div>
      <B.Card><div data-at="3">${STATUSES.map((s) => `<B.Callout status="${s}" title="${s}">Body</B.Callout>`).join("")}</div></B.Card>
    </B.Card>
  </>`;

  for (const theme of THEMES) {
    test(`success, warning and danger draw one solid rim, their status colour at 45% over the callout's own level, on every level (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(levels), { theme });
      await settle(page);
      for (const level of [1, 2, 3]) {
        const surface = await rgbOf(page, await token(page, `surface-${level}`));
        for (const status of STATUSES) {
          const callout = page.locator(`[data-at="${level}"] .basalt-callout[data-status="${status}"]`);
          assert.equal(await callout.getAttribute("data-level"), String(level));
          const sides = await callout.evaluate((el) => { const s = getComputedStyle(el); return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor]; });
          // a status rim is one solid colour on every side; info keeps the neutral rim, which is lit on top in dark
          if (status !== "info") assert.equal(new Set(sides).size, 1, `${theme} L${level} ${status}: one colour on every side, got ${sides}`);
          const rim = await rgbOf(page, sides[0]);
          const expected = status === "info"
            ? await rgbOf(page, await callout.evaluate((el) => getComputedStyle(el).borderTopColor))
            : mix(await rgbOf(page, await token(page, `status-${status}`)), surface, 0.45);
          if (status === "info") {
            // info and a plain note keep the neutral rim: the same colour as any other panel's
            const rimTop = await rgbOf(page, await token(page, "border-rim-top")), rimSide = await rgbOf(page, await token(page, "border-rim"));
            assert.deepEqual(await rgbOf(page, sides[0]), rimTop, `${theme} L${level} info keeps the neutral rim, top`);
            assert.deepEqual(await rgbOf(page, sides[1]), rimSide, `${theme} L${level} info keeps the neutral rim, sides`);
          } else {
            assert.ok(near(rim, expected), `${theme} L${level} ${status}: rim ${rim}, expected ${expected}`);
          }
        }
      }
      await page.close();
    });

    test(`no fill is tinted: a status callout's background is its level's surface, the same as an info callout's (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(levels), { theme });
      await settle(page);
      for (const level of [1, 2, 3]) {
        const surface = await rgbOf(page, await token(page, `surface-${level}`));
        for (const status of STATUSES) {
          const bg = await page.locator(`[data-at="${level}"] .basalt-callout[data-status="${status}"]`).evaluate((el) => getComputedStyle(el).backgroundColor);
          assert.deepEqual(await rgbOf(page, bg), surface, `${theme} L${level} ${status} is untinted`);
        }
      }
      await page.close();
    });

    test(`the icon takes the status colour, only danger's title does, and the body stays secondary; info keeps a secondary icon (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(levels), { theme });
      await settle(page);
      const ink = async (selector) => rgbOf(page, await page.locator(selector).first().evaluate((el) => getComputedStyle(el).color));
      const primary = await rgbOf(page, await token(page, "text-primary"));
      const secondary = await rgbOf(page, await token(page, "text-secondary"));
      for (const status of STATUSES) {
        const root = `[data-at="1"] .basalt-callout[data-status="${status}"]`;
        const icon = await ink(`${root} .basalt-callout-icon`);
        const expectedIcon = status === "info" ? secondary : await rgbOf(page, await token(page, `status-${status}`));
        assert.deepEqual(icon, expectedIcon, `${status} icon`);
        const title = await ink(`${root} .basalt-callout-title`);
        assert.deepEqual(title, status === "danger" ? await rgbOf(page, await token(page, "status-danger")) : primary, `${status} title`);
        assert.deepEqual(await ink(`${root} .basalt-callout-text`), secondary, `${status} body`);
      }
      await page.close();
    });
  }

  test("a toast never takes a status rim: its border is the neutral rim whatever its status", async () => {
    const fixture = render(`<B.ToastProvider><Show/></B.ToastProvider>`, `function Show(){const t=B.useToast();React.useEffect(()=>{["neutral","success","warning","danger"].forEach((status)=>t.show({title:status,status}))},[t]);return null}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await toasts(page).first().waitFor();
    await settle(page);
    const borders = await toasts(page).evaluateAll((els) => els.map((el) => { const s = getComputedStyle(el); return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor, s.backgroundColor].join("|"); }));
    assert.equal(borders.length, 3, "limit 3: one of the four is waiting");
    assert.equal(new Set(borders).size, 1, `toasts differ in border or fill: ${borders.join("  ")}`);
    await page.close();
  });

  test("forced colours: the rim is CanvasText on every status, and so is the icon (the status is the icon's shape and the words)", async () => {
    const { page } = await fixturePage(browser, render(levels), { theme: "dark", forcedColors: "active" });
    await settle(page);
    const canvasText = await page.evaluate(() => { const probe = document.createElement("i"); probe.style.color = "CanvasText"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
    const read = await page.locator('[data-at="1"] .basalt-callout').evaluateAll((els) => els.map((el) => ({ rim: [getComputedStyle(el).borderTopColor, getComputedStyle(el).borderLeftColor], icon: getComputedStyle(el.querySelector(".basalt-callout-icon")).color, shape: el.querySelector("svg").innerHTML })));
    for (const callout of read) {
      assert.deepEqual(callout.rim, [canvasText, canvasText]);
      assert.equal(callout.icon, canvasText);
    }
    assert.equal(new Set(read.map((c) => c.shape)).size, 4, "the four statuses still have four different shapes");
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Toasts

const probe = `function Probe(){const t=B.useToast();React.useEffect(()=>{window.t=t},[t]);return null}`;
const provider = (children = "<Probe/>", props = "") => render(`<B.ToastProvider${props}>${children}</B.ToastProvider>`, probe);
// Functions do not cross into the page: an action is given as data, and gets its handler there.
const show = (page, options) => page.evaluate((o) => { if (o.action) o.action.onClick = () => { window.undone = (window.undone ?? 0) + 1; }; return window.t.show(o); }, options);

describe("Toast: the surface", () => {
  for (const theme of THEMES) {
    test(`it is level 1 and fixed, wherever it was shown from, and never tinted (${theme})`, async () => {
      const fixture = render(`<B.ToastProvider><B.Card><B.Card><B.Card><B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>D</B.DialogTitle><Probe/></B.DialogContent></B.Dialog></B.Card></B.Card></B.Card></B.ToastProvider>`, probe);
      const { page } = await fixturePage(browser, fixture, { theme });
      await page.evaluate(() => { window.t.show({ title: "Saved", status: "success" }); window.t.show({ title: "Failed", status: "danger" }); });
      await toasts(page).first().waitFor();
      await settle(page);
      const level1 = await rgbOf(page, await token(page, "surface-1"));
      const read = await toasts(page).evaluateAll((els) => els.map((el) => ({ level: el.getAttribute("data-level"), bg: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow })));
      assert.equal(read.length, 2);
      for (const toast of read) {
        assert.equal(toast.level, "1");
        assert.deepEqual(await rgbOf(page, toast.bg), level1);
        assert.notEqual(toast.shadow, "none", "it floats, so it carries shadow-overlay");
      }
      if (theme === "dark") assert.deepEqual(level1, [10, 10, 10], "#0a0a0a");
      await page.close();
    });
  }
});

describe("Toast: marks and the seat", () => {
  test("success, warning and danger draw a different mark in a 16px seat, neutral draws none and no empty seat", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await page.evaluate(() => { for (const status of ["neutral", "success", "warning"]) window.t.show({ title: status, status }); });
    await toasts(page).first().waitFor();
    await settle(page);
    const read = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".basalt-toast")].map((el) => {
      const seat = el.querySelector(".basalt-toast-seat");
      const box = seat && getComputedStyle(seat);
      return [el.querySelector(".basalt-toast-title").textContent, seat ? { w: parseFloat(box.width), h: parseFloat(box.height), shape: seat.querySelector("svg")?.innerHTML ?? null, hidden: seat.getAttribute("aria-hidden") } : null];
    })));
    assert.equal(read.neutral, null, "no mark and no empty seat");
    for (const status of ["success", "warning"]) {
      assert.equal(read[status].w, 16);
      assert.equal(read[status].h, 16);
      assert.ok(read[status].shape, `${status} has a mark`);
      assert.equal(read[status].hidden, "true", "the title says it in words, so the mark is decoration");
    }
    assert.notEqual(read.success.shape, read.warning.shape, "the shapes differ, so colour carries nothing alone");
    await page.close();
    // danger on its own (the limit keeps three)
    const second = await fixturePage(browser, provider(), { theme: "dark" });
    await second.page.evaluate(() => window.t.show({ title: "danger", status: "danger" }));
    await toasts(second.page).first().waitFor();
    const danger = await second.page.evaluate(() => ({ shape: document.querySelector(".basalt-toast-seat svg").innerHTML, title: getComputedStyle(document.querySelector(".basalt-toast-title")).color }));
    assert.notEqual(danger.shape, read.success.shape);
    assert.notEqual(danger.shape, read.warning.shape);
    assert.deepEqual(await rgbOf(second.page, danger.title), await rgbOf(second.page, await token(second.page, "status-danger")), "danger's title is danger ink");
    await second.page.close();
  });

  test("only danger colours its title; the marks take their status colour", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "light" });
    await page.evaluate(() => { for (const status of ["success", "warning", "danger"]) window.t.show({ title: status, status }); });
    await toasts(page).first().waitFor();
    const read = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".basalt-toast")].map((el) => [el.querySelector(".basalt-toast-title").textContent, { title: getComputedStyle(el.querySelector(".basalt-toast-title")).color, mark: getComputedStyle(el.querySelector(".basalt-toast-seat")).color }])));
    const primary = await rgbOf(page, await token(page, "text-primary"));
    for (const status of ["success", "warning", "danger"]) {
      assert.deepEqual(await rgbOf(page, read[status].mark), await rgbOf(page, await token(page, `status-${status}`)), `${status} mark`);
      assert.deepEqual(await rgbOf(page, read[status].title), status === "danger" ? await rgbOf(page, await token(page, "status-danger")) : primary, `${status} title`);
    }
    await page.close();
  });

  test("forced colours: the marks keep their shapes and take the system foreground (the dots they replaced vanished)", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark", forcedColors: "active" });
    await page.evaluate(() => { for (const status of ["success", "warning", "danger"]) window.t.show({ title: status, status }); });
    await toasts(page).first().waitFor();
    await settle(page);
    const canvasText = await page.evaluate(() => { const p = document.createElement("i"); p.style.color = "CanvasText"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
    const read = await toasts(page).evaluateAll((els) => els.map((el) => { const seat = el.querySelector(".basalt-toast-seat"); const svg = seat.querySelector("svg"); return { colour: getComputedStyle(seat).color, svgColour: getComputedStyle(svg).color, w: parseFloat(getComputedStyle(svg).width), h: parseFloat(getComputedStyle(svg).height), shape: svg.innerHTML, border: getComputedStyle(el).borderTopColor }; }));
    assert.equal(read.length, 3);
    for (const mark of read) {
      assert.equal(mark.colour, canvasText);
      assert.equal(mark.svgColour, canvasText);
      assert.deepEqual([mark.w, mark.h], [16, 16], "still drawn, still 16px");
      assert.equal(mark.border, canvasText, "a real CanvasText border");
    }
    assert.equal(new Set(read.map((m) => m.shape)).size, 3, "three shapes");
    await page.close();
  });
});

describe("Toast: running work", () => {
  const titleX = (page) => page.evaluate(() => { const toast = document.querySelector(".basalt-toast"); return document.querySelector(".basalt-toast-title").getBoundingClientRect().left - toast.getBoundingClientRect().left; });

  test("braille sits in the seat, and the title's x is 0px different through every step to its result, marked or not", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    const id = await show(page, { title: "Publishing", running: true, home: "centre", timeout: 60_000 });
    await toasts(page).first().waitFor();
    await settle(page);
    assert.equal(await page.locator('.basalt-toast-seat .basalt-spinner[data-variant="braille"]').count(), 1, "braille in the mark seat");
    const running = await titleX(page);
    await page.evaluate((id) => window.t.update(id, { title: "Publishing, step 2 of 4", description: "Uploading assets", running: true }), id);
    await page.waitForTimeout(150);
    assert.equal(await titleX(page), running, "a step changes no x");
    await page.evaluate((id) => window.t.update(id, { title: "Published", status: "success" }), id);
    await page.waitForTimeout(250);
    assert.equal(await page.locator(".basalt-toast-seat .basalt-spinner").count(), 0, "braille is gone");
    assert.equal(await page.locator(".basalt-toast-seat svg").count(), 1, "the mark took its seat");
    assert.equal(await titleX(page), running, "the result's mark takes braille's seat: 0px");
    // the same toast again, resolving to an unmarked result: the seat stays, empty
    const other = await show(page, { title: "Exporting", running: true });
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => { const toast = document.querySelectorAll(".basalt-toast")[0]; return toast.querySelector(".basalt-toast-title").getBoundingClientRect().left - toast.getBoundingClientRect().left; });
    await page.evaluate((id) => window.t.update(id, { title: "Cancelled", home: "page" }), other);
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => { const toast = document.querySelectorAll(".basalt-toast")[0]; return { x: toast.querySelector(".basalt-toast-title").getBoundingClientRect().left - toast.getBoundingClientRect().left, seat: !!toast.querySelector(".basalt-toast-seat"), mark: !!toast.querySelector(".basalt-toast-seat svg") }; });
    assert.equal(after.x, before, "an unmarked result keeps the seat");
    assert.equal(after.seat, true);
    assert.equal(after.mark, false, "empty, not marked");
    await page.close();
  });

  test("the step text is not announced; only the result is", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    const id = await show(page, { title: "Publishing", running: true });
    await page.evaluate((id) => window.t.update(id, { title: "Publishing, step 3 of 4", running: true }), id);
    await page.waitForTimeout(150);
    const live = () => page.evaluate(() => [...document.querySelectorAll('[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]')].map((el) => el.textContent).join("|"));
    assert.ok(!/Publishing/.test(await live()), `a running toast was announced: ${await live()}`);
    await page.evaluate((id) => window.t.update(id, { title: "Published", status: "success" }), id);
    await page.waitForTimeout(100);
    assert.equal((await live()).match(/Published/g)?.length, 1, "the result is announced once");
    await page.close();
  });

  test("it stays while it runs, and its clock starts at the result", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    const id = await show(page, { title: "Publishing", running: true, home: "centre", timeout: 600 });
    await page.waitForTimeout(1200);
    assert.equal(await toasts(page).count(), 1, "running work never times out");
    assert.equal(await page.locator(".basalt-toast-drain").count(), 0, "and has no line");
    await page.evaluate((id) => window.t.update(id, { title: "Published", status: "success" }), id);
    await page.locator(".basalt-toast-drain").waitFor();
    await page.waitForTimeout(300);
    assert.equal(await toasts(page).count(), 1, "the clock has not run out yet: it started at the result");
    await toasts(page).first().waitFor({ state: "detached", timeout: 2500 });
    await page.close();
  });

  test("update ends running unless told otherwise, and a result is a new statement: the running toast's action does not carry over", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    const id = await show(page, { title: "Publishing", running: true, action: { label: "Cancel" } });
    await page.waitForTimeout(150);
    assert.equal(await page.getByRole("button", { name: "Cancel" }).count(), 1);
    await page.evaluate((id) => window.t.update(id, { title: "Published" }), id);
    await page.waitForTimeout(250);
    assert.equal(await page.locator(".basalt-toast-seat .basalt-spinner").count(), 0, "no longer running");
    assert.equal(await page.getByRole("button", { name: "Cancel" }).count(), 0, "Cancel is gone with the running state");
    await page.close();
  });

  test("promise(): running, then its result in place, and a rejection is danger", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await page.evaluate(() => { window.resolve = null; window.t.promise(new Promise((resolve) => { window.resolve = resolve; }), { running: "Saving", success: "Saved", error: "Failed" }); });
    await toasts(page).first().waitFor();
    assert.equal(await page.locator(".basalt-toast-seat .basalt-spinner").count(), 1);
    await page.evaluate(() => window.resolve("ok"));
    await page.locator('.basalt-toast-title:has-text("Saved")').waitFor();
    assert.equal(await toasts(page).count(), 1, "updated in place, not a second toast");
    await page.evaluate(() => { window.t.promise(Promise.reject(new Error("no")), { running: "Sending", success: "Sent", error: (e) => ({ title: "Not sent", description: e.message }) }).catch(() => {}); });
    await page.locator('.basalt-toast[data-status="danger"] .basalt-toast-title:has-text("Not sent")').waitFor();
    await page.close();
  });
});

describe("Toast: how long it lives", () => {
  const open = async (options, wait) => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, options);
    await toasts(page).first().waitFor();
    await page.waitForTimeout(wait);
    const out = { present: await toasts(page).count(), drain: await page.locator(".basalt-toast-drain").count() };
    await page.close();
    return out;
  };

  test("with no home a toast is the only copy and stays: no timeout, no line, even if one is asked for", async () => {
    assert.deepEqual(await open({ title: "Saved" }, 1200), { present: 1, drain: 0 });
    assert.deepEqual(await open({ title: "Saved", timeout: 500 }, 1200), { present: 1, drain: 0 }, "the type forbids it, and at run time it is still safe");
  });

  test("with a home it closes after its timeout, and shows a line that long", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Saved", home: "page", timeout: 700 });
    await page.locator(".basalt-toast-drain").waitFor();
    assert.equal(await page.locator(".basalt-toast-drain").evaluate((el) => getComputedStyle(el).animationDuration), "0.7s");
    await toasts(page).first().waitFor({ state: "detached", timeout: 3000 });
    await page.close();
  });

  test("the default for a toast that has a home is 5000ms", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Saved", home: ["centre", "row"] });
    await page.locator(".basalt-toast-drain").waitFor();
    assert.equal(await page.locator(".basalt-toast-drain").evaluate((el) => getComputedStyle(el).animationDuration), "5s");
    await page.close();
  });

  test("an action needs a durable home: the page alone cannot hold Undo, so that toast stays; the centre, the row or the app's key can", async () => {
    const undo = { label: "Undo" };
    assert.deepEqual(await open({ title: "Deleted", action: undo }, 1000), { present: 1, drain: 0 }, "an action with no home stays");
    assert.deepEqual(await open({ title: "Deleted", action: undo, home: "page", timeout: 500 }, 1000), { present: 1, drain: 0 }, "the page cannot hold an action");
    for (const home of ["centre", "row", "key"]) {
      assert.deepEqual(await open({ title: "Deleted", action: { ...undo, keys: "Meta+Z" }, home, timeout: 500 }, 1500), { present: 0, drain: 0 }, `${home} is a durable home`);
    }
  });

  test("the action carries the app's key in aria-keyshortcuts and draws no chip", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Deleted", action: { label: "Undo", keys: "Meta+Z" }, home: "key" });
    const button = page.locator(".basalt-toast-action");
    await button.waitFor();
    assert.equal(await button.getAttribute("aria-keyshortcuts"), "Meta+Z");
    assert.equal(await button.locator(".basalt-kbd, .basalt-kbd-key, [data-shortcut]").count(), 0);
    assert.equal((await button.textContent()).trim(), "Undo");
    await page.close();
  });
});

describe("Toast: what a screen reader hears", () => {
  const live = (page, selector) => page.evaluate((selector) => document.querySelector(selector)?.textContent ?? null, selector);

  test("danger is assertive and the rest polite, once each, from text-only regions that exist before the first toast", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    assert.equal(await page.locator('[role="status"][aria-live="polite"]').count(), 1, "the polite region exists, empty");
    assert.equal(await page.locator('[role="alert"][aria-live="assertive"]').count(), 1, "the assertive region exists, empty");
    await show(page, { title: "Saved", status: "success" });
    await show(page, { title: "Run failed", description: "Exit code 1", status: "danger" });
    await page.waitForTimeout(200);
    assert.equal(await live(page, '[role="status"]'), "Saved");
    assert.equal(await live(page, '[role="alert"]'), "Run failed. Exit code 1");
    // one announcement each: the visible stack is not live, and no other region holds the words
    const holders = await page.evaluate(() => [...document.querySelectorAll("*")].filter((el) => el.children.length === 0 && /Run failed/.test(el.textContent)).map((el) => el.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]')?.getAttribute("role") ?? "not live"));
    assert.deepEqual(holders.sort(), ["alert", "not live"], `the words are in one live region and the visible toast: ${holders}`);
    await page.close();
  });

  test("no interactive child is inside a live region, and the stack is a named region that is not live (F6 reaches it)", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Deleted", action: { label: "Undo" } });
    await toasts(page).first().waitFor();
    const read = await page.evaluate(() => ({
      interactive: document.querySelectorAll('[role="status"] :is(button, a, input), [role="alert"] :is(button, a, input), [aria-live="polite"] :is(button, a, input), [aria-live="assertive"] :is(button, a, input)').length,
      viewport: (() => { const v = document.querySelector(".basalt-toast-viewport"); return { role: v.getAttribute("role"), name: v.getAttribute("aria-label"), live: v.getAttribute("aria-live") }; })(),
    }));
    assert.equal(read.interactive, 0);
    assert.deepEqual(read.viewport, { role: "region", name: "Notifications", live: "off" });
    // F6 puts focus on the region
    await page.keyboard.press("F6");
    assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-toast-viewport");
    await page.close();
  });

  test("a toast shown the moment the app loads is announced too", async () => {
    const fixture = render(`<B.ToastProvider><Load/></B.ToastProvider>`, `function Load(){const t=B.useToast();React.useEffect(()=>{t.show({title:"Welcome back",status:"success"})},[t]);return null}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await page.waitForTimeout(300);
    assert.equal(await live(page, '[role="status"]'), "Welcome back");
    await page.close();
  });
});

describe("Toast: the stack", () => {
  test("limit 3: a fourth toast closes the oldest one that is not the only copy", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    for (const name of ["one", "two", "three", "four"]) await show(page, { title: name, home: "page", timeout: 60_000 });
    await page.waitForTimeout(500);
    assert.deepEqual((await titles(page)).sort(), ["four", "three", "two"]);
    await page.close();
  });

  test("a toast that is the only copy is never removed by the limit: the newcomer waits in a queue and enters as room appears", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    for (const name of ["a", "b", "c"]) await show(page, { title: name, action: { label: "Undo" } });
    await show(page, { title: "d" });
    await page.waitForTimeout(400);
    assert.deepEqual((await titles(page)).sort(), ["a", "b", "c"], "all three only-copies are still there, and the fourth is not");
    await toasts(page).first().hover();
    await page.waitForTimeout(400);
    await page.locator(".basalt-toast", { hasText: "b" }).getByRole("button", { name: "Dismiss" }).click();
    await page.locator('.basalt-toast-title:has-text("d")').waitFor();
    await page.locator('.basalt-toast-title:text-is("b")').waitFor({ state: "detached" });
    assert.deepEqual((await titles(page)).sort(), ["a", "c", "d"], "the queued toast came in when one left");
    await page.close();
  });

  test("a focused toast is not removed by the limit: the oldest one that is not focused goes instead", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    for (const name of ["one", "two", "three"]) await show(page, { title: name, home: "page", timeout: 60_000 });
    await page.waitForTimeout(300);
    await page.locator(".basalt-toast", { hasText: "one" }).focus();
    await show(page, { title: "four", home: "page", timeout: 60_000 });
    await page.waitForTimeout(500);
    assert.deepEqual((await titles(page)).sort(), ["four", "one", "three"], "focus kept the oldest; the next oldest went");
    await page.close();
  });

  test("closing a queued toast removes it from the queue", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    for (const name of ["a", "b", "c"]) await show(page, { title: name });
    const queued = await show(page, { title: "d" });
    await page.evaluate((id) => window.t.close(id), queued);
    await toasts(page).first().hover();
    await page.waitForTimeout(400);
    await page.locator(".basalt-toast", { hasText: "a" }).getByRole("button", { name: "Dismiss" }).click();
    await page.waitForTimeout(500);
    assert.deepEqual((await titles(page)).sort(), ["b", "c"], "d never came in");
    await page.close();
  });

  test("repeats group: the same group shows once as ×3, restarts its clock, and is announced with its count", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    for (let i = 0; i < 3; i++) await show(page, { title: "Draft saved", group: "draft", home: "page" });
    await page.waitForTimeout(300);
    assert.equal(await toasts(page).count(), 1);
    assert.equal(await page.locator(".basalt-toast-count").textContent(), "×3");
    assert.match(await page.locator(".basalt-toast-title").textContent(), /Draft saved.*×3.*3 times/);
    assert.match(await page.evaluate(() => document.querySelector('[role="status"]').textContent), /Draft saved, 3 times/);
    await page.close();
  });

  test("errors never group, and a different status in the same group is its own toast", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Failed", status: "danger", group: "run" });
    await show(page, { title: "Failed", status: "danger", group: "run" });
    await show(page, { title: "Ok", status: "success", group: "run" });
    await page.waitForTimeout(300);
    assert.equal(await toasts(page).count(), 3);
    assert.equal(await page.locator(".basalt-toast-count").count(), 0);
    await page.close();
  });

  test("the cards behind peek, even behind a taller toast: they take the frontmost height and the shipped .05 scale", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Short one" });
    await show(page, { title: "Short two" });
    await show(page, { title: "A long one", description: "This toast has a description that runs to a second line and then a third, so it is taller than the two behind it.".repeat(2) });
    await page.waitForTimeout(500);
    const read = await toasts(page).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { index: Number(el.style.getPropertyValue("--toast-index")), top: r.top, bottom: r.bottom, height: r.height, scale: new DOMMatrix(getComputedStyle(el).transform).a }; }).sort((a, b) => a.index - b.index));
    assert.equal(read.length, 3);
    assert.ok(read[0].height > 70, "the front toast is tall");
    for (const behind of read.slice(1)) assert.ok(behind.top < read[0].top - 3, `a card behind peeks above the taller front toast (${behind.top} against ${read[0].top})`);
    assert.ok(read[1].top > read[2].top, "and each is a step above the last");
    assert.deepEqual(read.map((r) => Number(r.scale.toFixed(2))), [1, 0.95, 0.9], "the shipped .05 peek scale");
    await page.close();
  });

  test("hovering expands the stack; leaving collapses it", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    for (const name of ["a", "b"]) await show(page, { title: name });
    await page.waitForTimeout(300);
    await toasts(page).first().hover();
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".basalt-toast[data-expanded]").count(), 2);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".basalt-toast[data-expanded]").count(), 0);
    await page.close();
  });
});

describe("Toast: swipe, placement and motion", () => {
  const drag = async (page, dx, dy = 0) => {
    const box = await page.locator(".basalt-toast-text").first().boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
    await page.mouse.move(x + dx, y + dy, { steps: 4 });
    await page.mouse.up();
  };

  test("a drag of 30px returns; a drag of more than 40px dismisses. Distance only: no spring", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Swipe me" });
    await toasts(page).first().waitFor();
    await settle(page);
    await drag(page, 30);
    await page.waitForTimeout(400);
    assert.equal(await toasts(page).count(), 1, "30px is under the threshold");
    await drag(page, 56);
    await toasts(page).first().waitFor({ state: "detached", timeout: 2000 });
    await page.close();
  });

  test("a vertical drag is its own direction (down dismisses) and a sideways drag does not move it up or down", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Swipe me" });
    await toasts(page).first().waitFor();
    await settle(page);
    await drag(page, 0, 56);
    await toasts(page).first().waitFor({ state: "detached", timeout: 2000 });
    await page.close();
  });

  test("bottom right at 1440, inset space-4 (16px)", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark", viewport: { width: 1440, height: 900 } });
    await show(page, { title: "Saved" });
    await toasts(page).first().waitFor();
    await settle(page);
    const box = await page.locator(".basalt-toast-viewport").evaluate((el) => { const r = el.getBoundingClientRect(); return { right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom, width: r.width }; });
    assert.deepEqual(box, { right: 16, bottom: 16, width: 360 });
    await page.close();
  });

  test("at 390 it is the bottom edge, full width less the 16px insets, above the safe area", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark", viewport: { width: 390, height: 844 }, hasTouch: true });
    await show(page, { title: "Saved" });
    await toasts(page).first().waitFor();
    await settle(page);
    const box = await page.locator(".basalt-toast-viewport").evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom }; });
    assert.deepEqual(box, { left: 16, right: 16, bottom: 16 });
    const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).map((r) => r.cssText).join("\n"));
    assert.match(css, /bottom: max\(var\(--basalt-space-4\), env\(safe-area-inset-bottom\)\)/, "the bottom inset yields to the safe area");
    await page.close();
  });

  test("enter runs on duration-slow and ease-out; leaving at 0.75 and ease-in", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Saved" });
    await toasts(page).first().waitFor();
    await settle(page);
    const read = () => toasts(page).first().evaluate((el) => { const s = getComputedStyle(el); return { props: s.transitionProperty.split(", "), durations: s.transitionDuration.split(", "), easing: s.transitionTimingFunction.split("), ").map((e) => e.replace(/\)?$/, ")")) }; });
    const rest = await read();
    assert.deepEqual(rest.props.slice(0, 2), ["transform", "opacity"]);
    assert.deepEqual(rest.durations.slice(0, 2), ["0.2s", "0.2s"]);
    assert.ok(/cubic-bezier\(0\.16, 1, 0\.3, 1\)/.test(rest.easing[0]));
    await toasts(page).first().evaluate((el) => el.setAttribute("data-ending-style", ""));
    const exit = await read();
    assert.deepEqual(exit.durations.slice(0, 2), ["0.15s", "0.15s"], "0.75 of duration-slow");
    assert.ok(/cubic-bezier\(0\.4, 0, 1, 1\)/.test(exit.easing[0]));
    await page.close();
  });

  test("reduced motion: opacity only at the resting offsets, no drain, and braille holds its first frame", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark", reducedMotion: "reduce" });
    await show(page, { title: "Publishing", running: true });
    await show(page, { title: "Saved", home: "page" });
    await toasts(page).first().waitFor();
    await page.waitForTimeout(300);
    const read = await toasts(page).evaluateAll((els) => els.map((el) => ({ property: getComputedStyle(el).transitionProperty, drain: el.querySelector(".basalt-toast-drain") ? getComputedStyle(el.querySelector(".basalt-toast-drain")).display : "absent", dots: [...el.querySelectorAll(".basalt-spinner-dot")].map((d) => getComputedStyle(d).animationName) })));
    for (const toast of read) {
      assert.equal(toast.property, "opacity");
      assert.ok(toast.drain === "none" || toast.drain === "absent");
    }
    const running = read.find((toast) => toast.dots.length > 0);
    assert.ok(running.dots.every((name) => name === "none"), "braille is held on its first frame");
    await page.close();
  });
});

describe("Toast: the drain and its clock", () => {
  const hide = (page, hidden) => page.evaluate((hidden) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
  const state = (page) => page.locator(".basalt-toast-drain").evaluate((el) => getComputedStyle(el).animationPlayState);

  test("the line and the clock pause together on a hidden tab, and resume together", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "Saved", home: "page", timeout: 900 });
    await page.locator(".basalt-toast-drain").waitFor();
    await page.waitForTimeout(150);
    await hide(page, true);
    await page.waitForTimeout(150);
    assert.equal(await state(page), "paused");
    await page.waitForTimeout(1500);
    assert.equal(await toasts(page).count(), 1, "still there: the clock held while nobody could see it");
    await hide(page, false);
    await page.waitForTimeout(150);
    assert.equal(await state(page), "running");
    await toasts(page).first().waitFor({ state: "detached", timeout: 3000 });
    await page.close();
  });

  test("a first toast shown while the tab is already hidden starts held", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await hide(page, true);
    await show(page, { title: "Saved", home: "page", timeout: 500 });
    await page.locator(".basalt-toast-drain").waitFor();
    await page.waitForTimeout(1200);
    assert.equal(await toasts(page).count(), 1);
    assert.equal(await state(page), "paused");
    await page.close();
  });

  test("hover and focus hold the clock too, for every toast, and releasing lets them go on", async () => {
    const { page } = await fixturePage(browser, provider(), { theme: "dark" });
    await show(page, { title: "A", home: "page", timeout: 900 });
    await show(page, { title: "B", home: "page", timeout: 900 });
    await page.waitForTimeout(200);
    await page.locator(".basalt-toast", { hasText: "B" }).hover();
    await page.waitForTimeout(1400);
    assert.equal(await toasts(page).count(), 2, "both held while one is hovered");
    await page.mouse.move(2, 2);
    await page.waitForFunction(() => document.querySelectorAll(".basalt-toast").length === 0, null, { timeout: 4000 });
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The notification centre

describe("NotificationCentre", () => {
  const entries = (read = []) => `[
    { id: "1", title: "Deploy finished", description: "blacksand-api, production", time: "2m ago", status: "success", unread: ${!read.includes("1")} },
    { id: "2", title: "Run failed", description: "run-0143 exited with code 1", time: "1h ago", status: "danger", unread: ${!read.includes("2")} },
    { id: "3", title: "Route refused for a host with a very long name that cannot fit on one line", description: "Not allowed for this run, and the reason is also long enough to be cut", time: "Yesterday", status: "warning", unread: ${!read.includes("3")} },
    { id: "4", title: "Invite sent", description: "dana@example.com", time: "Mon" },
  ]`;
  const app = (extra = "") => render(`<B.ToastProvider><Centre/></B.ToastProvider>`, `
    function Centre(){
      const [list, setList] = React.useState(${entries()});
      window.setList = setList; window.chosen = [];
      return <div style={{ padding: 24 }}><div style={{ display: "flex", justifyContent: "flex-end" }}>
        <B.NotificationCentre entries={list} onMarkAllRead={() => setList((all) => all.map((e) => ({ ...e, unread: false })))} onSelect={(e) => window.chosen.push(e.id)} onViewAll={() => window.chosen.push("all")} ${extra} />
      </div></div>;
    }`);

  for (const theme of THEMES) {
    test(`the bell is a 32px IconButton: its name carries the count, a 6px ink dot shows while anything is unread, and the width never changes (${theme})`, async () => {
      const { page } = await fixturePage(browser, app(), { theme });
      const bell = page.getByRole("button", { name: "Notifications, 3 unread" });
      await bell.waitFor();
      const geometry = () => bell.evaluate((el) => { const r = el.getBoundingClientRect(); const dot = getComputedStyle(el, "::after"); return { w: r.width, h: r.height, dot: dot.content === "none" ? null : { w: dot.width, h: dot.height, radius: dot.borderTopLeftRadius, bg: dot.backgroundColor, position: dot.position } }; });
      const unread = await geometry();
      assert.equal(unread.w, 32);
      assert.equal(unread.h, 32);
      assert.deepEqual([unread.dot.w, unread.dot.h, unread.dot.position], ["6px", "6px", "absolute"]);
      assert.deepEqual(await rgbOf(page, unread.dot.bg), await rgbOf(page, await token(page, "text-primary")), "ink");
      assert.equal(await bell.evaluate((el) => el.textContent.trim()), "", "the count is never drawn");
      await page.evaluate(() => window.setList((all) => all.map((e) => ({ ...e, unread: false }))));
      const read = page.getByRole("button", { name: "Notifications", exact: true });
      await read.waitFor();
      const none = await read.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, dot: getComputedStyle(el, "::after").content }; });
      assert.equal(none.w, 32, "no dot, same width");
      assert.equal(none.dot, "none");
      await page.evaluate(() => window.setList((all) => Array.from({ length: 12 }, (_, i) => ({ ...all[0], id: String(i), unread: true }))));
      const twelve = page.getByRole("button", { name: "Notifications, 12 unread" });
      await twelve.waitFor();
      assert.equal((await twelve.boundingBox()).width, 32, "12 unread, same width");
      await page.close();
    });
  }

  test("the popup is a Popover one level above its opener (1 from the page, 2 from a card), with a header band, the entries and a footer", async () => {
    const { page } = await fixturePage(browser, render(`<><B.NotificationCentre defaultOpen entries={[{ id: "1", title: "T", time: "now", unread: true }]} /></>`), { theme: "dark" });
    await page.locator(".basalt-notifications").waitFor();
    assert.equal(await page.locator(".basalt-notifications").getAttribute("data-level"), "1");
    const parts = await page.evaluate(() => ({
      head: document.querySelector(".basalt-notifications-head").textContent,
      list: document.querySelectorAll(".basalt-notifications-list > li").length,
      foot: document.querySelector(".basalt-notifications-foot").textContent,
      title: document.querySelector(".basalt-notifications").getAttribute("aria-labelledby") === document.querySelector(".basalt-notifications-title").id,
    }));
    assert.match(parts.head, /Notifications.*1 unread.*Mark all as read/);
    assert.equal(parts.list, 1);
    assert.equal(parts.foot, "View all");
    assert.equal(parts.title, true, "the popup is named by its title");
    await page.close();
    const inCard = await fixturePage(browser, render(`<B.Card><B.NotificationCentre defaultOpen entries={[{ id: "1", title: "T", time: "now" }]} /></B.Card>`), { theme: "dark" });
    await inCard.page.locator(".basalt-notifications").waitFor();
    assert.equal(await inCard.page.locator(".basalt-notifications").getAttribute("data-level"), "2");
    await inCard.page.close();
  });

  for (const theme of THEMES) {
    test(`unread is a dot in its own seat and primary ink, read is the same row with the seat empty and secondary ink: "Mark all as read" moves nothing (${theme})`, async () => {
      const { page } = await fixturePage(browser, app("defaultOpen"), { theme });
      await page.locator(".basalt-notification").first().waitFor();
      await settle(page);
      const snapshot = () => page.evaluate(() => {
        const rect = (el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
        return [...document.querySelectorAll(".basalt-notification")].map((row) => ({
          unread: row.hasAttribute("data-unread"),
          geometry: ["", ".basalt-notification-dot", ".basalt-notification-mark", ".basalt-notification-title", ".basalt-notification-line", ".basalt-notification-time"].map((s) => { const el = s ? row.querySelector(s) : row; return el ? rect(el) : null; }),
          dot: getComputedStyle(row.querySelector(".basalt-notification-dot")).backgroundColor,
          title: getComputedStyle(row.querySelector(".basalt-notification-title")).color,
          weight: getComputedStyle(row.querySelector(".basalt-notification-title")).fontWeight,
          spoken: row.textContent,
        }));
      });
      const before = await snapshot();
      assert.deepEqual(before.map((r) => r.unread), [true, true, true, false]);
      const primary = await rgbOf(page, await token(page, "text-primary"));
      const secondary = await rgbOf(page, await token(page, "text-secondary"));
      for (const row of before) {
        assert.deepEqual(await rgbOf(page, row.title), row.unread ? primary : secondary, "primary when unread, secondary when read");
        if (row.unread) assert.deepEqual(await rgbOf(page, row.dot), primary, "a 6px ink dot");
        else assert.equal(row.dot, "rgba(0, 0, 0, 0)", "the seat is empty");
        assert.equal(row.geometry[1][2], 6, "the dot's seat is 6px, reserved");
        assert.equal(row.geometry[2][2], 16, "the mark's seat is 16px, reserved");
        assert.equal(row.weight, "400", "no weight change");
        assert.equal(row.spoken.startsWith("Unread: "), row.unread, "unread is also said in words");
      }
      await page.getByRole("button", { name: "Mark all as read" }).click();
      await page.waitForTimeout(250);
      const after = await snapshot();
      assert.deepEqual(after.map((r) => r.unread), [false, false, false, false]);
      for (const [i, row] of after.entries()) {
        assert.deepEqual(row.geometry, before[i].geometry, `row ${i}: nothing moved (0px)`);
        assert.deepEqual(await rgbOf(page, row.title), secondary);
        assert.equal(row.dot, "rgba(0, 0, 0, 0)");
        assert.equal(row.weight, "400");
      }
      await page.close();
    });
  }

  test("a long title is cut with an ellipsis, and the whole text is still the row's name", async () => {
    const { page } = await fixturePage(browser, app("defaultOpen"), { theme: "dark" });
    const title = page.locator(".basalt-notification-title", { hasText: "Route refused" });
    await title.waitFor();
    const read = await title.evaluate((el) => { const s = getComputedStyle(el); return { overflow: s.textOverflow, clip: s.overflow, nowrap: s.whiteSpace, cut: el.scrollWidth > el.clientWidth }; });
    assert.deepEqual(read, { overflow: "ellipsis", clip: "hidden", nowrap: "nowrap", cut: true });
    assert.match(await page.getByRole("button", { name: /Route refused for a host with a very long name that cannot fit on one line/ }).first().getAttribute("class"), /basalt-notification/);
    await page.close();
  });

  test("rows are buttons (or links), not options; each paints its own plate on hover and no shared plate is drawn", async () => {
    const { page } = await fixturePage(browser, app("defaultOpen"), { theme: "dark" });
    await page.locator(".basalt-notification").first().waitFor();
    await settle(page);
    assert.equal(await page.locator('.basalt-notifications [role="option"], .basalt-notifications [role="menuitem"]').count(), 0);
    assert.equal(await page.locator(".basalt-notifications .basalt-plate").count(), 0, "no glide in this list");
    assert.deepEqual(await page.locator(".basalt-notification").evaluateAll((els) => els.map((el) => el.tagName)), ["BUTTON", "BUTTON", "BUTTON", "BUTTON"]);
    const plate = () => page.locator(".basalt-notification").nth(1).evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
    assert.equal(await plate(), "rgba(0, 0, 0, 0)");
    await page.locator(".basalt-notification").nth(1).hover();
    await page.waitForTimeout(150);
    const level = await page.locator(".basalt-notifications").getAttribute("data-level");
    assert.equal(level, "1");
    assert.deepEqual(await rgbOf(page, await plate()), await rgbOf(page, "color-mix(in srgb, white 9%, #111111)"), "level 1's plate: the next level plus the wash");
    await page.close();
  });

  test("links: an entry with an href is an <a>, and choosing it reports it and closes the centre", async () => {
    const fixture = render(`<B.NotificationCentre defaultOpen entries={[{ id: "1", title: "Deploy finished", time: "now", href: "#deploy" }]} onSelect={(e) => { window.chosen = e.id; }} />`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    const link = page.getByRole("link", { name: /Deploy finished/ });
    await link.waitFor();
    await link.click();
    await page.locator(".basalt-notifications").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.chosen), "1");
    await page.close();
  });

  test("keyboard: Tab goes bell, Mark all as read, each entry, View all; Enter chooses; Esc closes and returns focus to the bell", async () => {
    const { page } = await fixturePage(browser, app(), { theme: "dark" });
    const bell = page.getByRole("button", { name: /Notifications, 3 unread/ });
    await bell.focus();
    await page.keyboard.press("Enter");
    await page.locator(".basalt-notifications").waitFor();
    // Base UI moves focus in once the popup has opened: to its first control
    await page.waitForFunction(() => document.activeElement?.textContent.startsWith("Mark all as read"));
    const order = [];
    const here = () => page.evaluate(() => document.activeElement.textContent.trim().slice(0, 12));
    order.push(await here());
    for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); order.push(await here()); }
    assert.deepEqual(order, ["Mark all as ", "Unread: Depl", "Unread: Run ", "Unread: Rout", "Invite sentd", "View all"]);
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Enter");
    await page.locator(".basalt-notifications").waitFor({ state: "detached" });
    assert.deepEqual(await page.evaluate(() => window.chosen), ["2"], "Enter on the second entry chose it");
    await page.keyboard.press("Enter");
    await page.locator(".basalt-notifications").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".basalt-notifications").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Notifications, 3 unread", "focus returned to the bell");
    await page.close();
  });

  test("focus: a focused row takes the control ring at +2 from its plate, and the list keeps at least 6px from its clipping edge so the ring is never cut", async () => {
    const { page } = await fixturePage(browser, app("defaultOpen"), { theme: "dark" });
    await page.locator(".basalt-notification").first().waitFor();
    await settle(page);
    await page.locator(".basalt-notification").first().focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const read = await page.evaluate(() => {
      const row = document.activeElement;
      const list = document.querySelector(".basalt-notifications-list");
      const s = getComputedStyle(row), l = getComputedStyle(list);
      const plate = getComputedStyle(row, "::before");
      const r = row.getBoundingClientRect(), box = list.getBoundingClientRect();
      const reach = parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset);
      return { row: row.className, width: s.outlineWidth, style: s.outlineStyle, colour: s.outlineColor, offset: s.outlineOffset, inset: plate.top, listPad: [l.paddingTop, l.paddingLeft, l.paddingRight, l.paddingBottom], cut: [r.left - reach < box.left, r.right + reach > box.right, r.top - reach < box.top], overflowX: l.overflowX };
    });
    assert.equal(read.row, "basalt-notification");
    assert.deepEqual([read.width, read.style], ["2px", "solid"]);
    assert.equal(read.offset, "0px", "0 from the row's box, which already holds the plate's 2px inset: +2 from the plate");
    assert.equal(read.inset, "2px");
    assert.deepEqual(read.listPad, ["6px", "6px", "6px", "6px"]);
    assert.deepEqual(read.cut, [false, false, false], "the ring is inside the list's box");
    assert.deepEqual(await rgbOf(page, read.colour), await rgbOf(page, await token(page, "border-focus")));
    await page.close();
  });

  test("'Mark all as read' stays in place and keeps focus when nothing is unread", async () => {
    const { page } = await fixturePage(browser, app("defaultOpen"), { theme: "dark" });
    const mark = page.getByRole("button", { name: "Mark all as read" });
    await mark.waitFor();
    await mark.focus();
    const before = await mark.boundingBox();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    assert.equal(await mark.evaluate((el) => el === document.activeElement), true, "focus stays on it");
    assert.equal(await mark.getAttribute("aria-disabled"), "true");
    assert.deepEqual(await mark.boundingBox(), before, "and it did not move");
    assert.equal(await page.locator(".basalt-notifications-count").textContent(), "0 unread");
    await page.close();
  });

  test("View all reports and closes; an empty centre says so", async () => {
    const { page } = await fixturePage(browser, app("defaultOpen"), { theme: "dark" });
    await page.getByRole("button", { name: "View all" }).click();
    await page.locator(".basalt-notifications").waitFor({ state: "detached" });
    assert.deepEqual(await page.evaluate(() => window.chosen), ["all"]);
    await page.close();
    const empty = await fixturePage(browser, render(`<B.NotificationCentre defaultOpen entries={[]} />`), { theme: "dark" });
    await empty.page.locator(".basalt-notifications-empty").waitFor();
    await empty.page.close();
  });

  test("forced colours: the dots keep a real fill and a hovered entry is Highlight with HighlightText", async () => {
    const { page } = await fixturePage(browser, app("defaultOpen"), { theme: "dark", forcedColors: "active" });
    await page.locator(".basalt-notification").first().waitFor();
    await settle(page);
    const sys = (name, prop = "color") => page.evaluate(([name, prop]) => { const p = document.createElement("i"); p.style[prop] = name; document.body.append(p); const c = getComputedStyle(p)[prop]; p.remove(); return c; }, [name, prop]);
    const dot = await page.locator(".basalt-notification").first().locator(".basalt-notification-dot").evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.equal(dot, await sys("CanvasText"), "the unread dot is drawn");
    const bellDot = await page.getByRole("button", { name: /Notifications/ }).evaluate((el) => getComputedStyle(el, "::after").backgroundColor);
    assert.equal(bellDot, await sys("CanvasText"));
    await page.locator(".basalt-notification").nth(1).hover();
    await page.waitForTimeout(120);
    const lit = await page.locator(".basalt-notification").nth(1).evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el.querySelector(".basalt-notification-title")).color, time: getComputedStyle(el.querySelector(".basalt-notification-time")).color }));
    assert.deepEqual(lit, { bg: await sys("Highlight", "backgroundColor"), ink: await sys("HighlightText"), time: await sys("HighlightText") });
    // the mark keeps its shape
    assert.equal(await page.locator(".basalt-notification-mark svg").count(), 3);
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// axe, both themes, with everything on screen at once

for (const theme of THEMES) {
  test(`axe finds no WCAG 2.2 AA violations with callouts, a stack of toasts (each status, running, grouped) and the centre open (${theme})`, async () => {
    const fixture = render(`<B.ToastProvider><App/></B.ToastProvider>`, `
      function App(){
        const t = B.useToast();
        React.useEffect(() => {
          t.show({ title: "Deleted", description: "blacksand-api was removed.", action: { label: "Undo", onClick() {} } });
          // no home, so no drain: settle() would otherwise wait out the five seconds and audit the toast as it leaves
          t.show({ title: "Draft saved", group: "d", status: "success" }); t.show({ title: "Draft saved", group: "d", status: "success" });
          t.show({ title: "Publishing", running: true });
        }, [t]);
        return <main style={{ padding: 24, display: "grid", gap: 16, maxWidth: 520 }}>
          ${STATUSES.map((s) => `<B.Callout status="${s}" title="${s}">Body text</B.Callout>`).join("")}
          <B.NotificationCentre defaultOpen entries={[{ id: "1", title: "Deploy finished", description: "blacksand-api", time: "2m ago", status: "success", unread: true }, { id: "2", title: "Run failed", description: "exit 1", time: "1h ago", status: "danger" }, { id: "3", title: "Invite sent", time: "Mon" }]} />
        </main>;
      }`);
    const { page } = await fixturePage(browser, fixture, { theme });
    await page.locator(".basalt-toast").first().waitFor();
    await page.locator(".basalt-notification").first().waitFor();
    // the cards behind fade their content out as the stack settles; audit after that, not halfway
    await page.waitForTimeout(600);
    await settle(page);
    await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() => window.axe.run(
      { exclude: [["[data-base-ui-focus-guard]"]] },
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
    ));
    assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`), []);
    await page.close();
  });
}
