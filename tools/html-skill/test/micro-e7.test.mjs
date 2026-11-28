// micro-e7 in the HTML skill (DECISIONS 405, audit rows C2 and M4): engineering that restores what Basalt's docs already promise, held to React.
// C2: a toast's swipe is React's (Base UI's): more than 40px dismisses it, by distance alone, down or right from 720 and up or right under 720; a
// shorter drag, a change of mind or a cancelled pointer springs it back, and the gesture never moves focus off the toast it started on. Under
// reduced motion a swiped toast stays where it was let go and only fades.
// M4: a tooltip opened within the grace of another's close is there at once (a zero transition), while one opened after the wait keeps the normal
// entrance and the hover bridge, and its exit is the ordinary 0.75 ease-in. Synthetic data in two unlike domains (a recipe box and a build server). Written while tests are paused (DECISIONS
// 359): not yet run.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { freezeAnimations } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const BODY = `<main class="page stack">
  <h1>Kitchen and builds</h1>
  <div class="cluster">
    <button class="btn" id="tip-a" data-tooltip="Add a recipe">Add</button>
    <button class="btn" id="tip-b" data-tooltip="Retry the build">Retry</button>
    <button class="btn" id="plain">Plain</button>
  </div>
</main>`;
const html = compose(`<title>e7</title>${BODY}<!-- basalt:use toast -->`, { fonts: false }).html;
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }, sel);
const toasts = (page) => page.evaluate(() => document.querySelectorAll(".toast:not([data-ending-style])").length);
const dir = (page) => page.evaluate(() => document.querySelector(".toast")?.getAttribute("data-swipe-direction") ?? null);
const movement = (page) => page.evaluate(() => { const s = document.querySelector(".toast").style; return [s.getPropertyValue("--toast-swipe-movement-x"), s.getPropertyValue("--toast-swipe-movement-y")]; });
const focusedToast = (page) => page.evaluate(() => document.activeElement === document.querySelector(".toast"));

/** A real touch drag through CDP (so the pointer is live and can be captured): press, the first move (the gesture's start), then `steps` to (dx, dy). */
async function touchDrag(page, cdp, from, [dx, dy], { steps = 6, release = "touchEnd" } = {}) {
  const at = (x, y) => [{ x, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(from.x, from.y) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(from.x, from.y + 0.5) });
  for (let i = 1; i <= steps; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(from.x + (dx * i) / steps, from.y + 0.5 + (dy * i) / steps) });
  if (release) await cdp.send("Input.dispatchTouchEvent", { type: release, touchPoints: release === "touchEnd" ? [] : at(from.x + dx, from.y + dy) });
}
/** A mouse drag: press, the first move, then `steps` to (dx, dy), and let go. */
async function mouseDrag(page, from, [dx, dy], steps = 6) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 1, from.y);
  await page.mouse.move(from.x + 1 + dx, from.y + dy, { steps });
  await page.mouse.up();
}

async function withToast(options) {
  const opened = await openHtml(browser, html, { scheme: "dark", ...options });
  const clock = await freezeAnimations(opened.page);
  await opened.page.evaluate(() => Basalt.toast({ title: "Recipe saved", description: "Lemon tart, in Desserts." }));
  await clock.advance(400);
  const box = await rect(opened.page, ".toast");
  return { ...opened, clock, start: { x: box.left + box.width / 2, y: box.top + box.height / 2 } };
}

describe("the skill's toast swipe is React's (C2)", () => {
  for (const [name, options, gone, kept] of [
    ["a phone at 390, by touch", { width: 390, touch: true }, [["up", [0, -51]], ["right", [51, 0]]], [["down", [0, 51]], ["left", [-51, 0]]]],
    ["a window at 1440, by mouse", { width: 1440 }, [["down", [0, 51]], ["right", [51, 0]]], [["up", [0, -51]], ["left", [-51, 0]]]],
  ]) {
    for (const [direction, delta] of gone) {
      test(`${name}: a 51px drag ${direction} dismisses it, leaving ${direction}`, async () => {
        const { page, context, clock, start, errors } = await withToast(options);
        if (options.touch) await touchDrag(page, await context.newCDPSession(page), start, delta);
        else await mouseDrag(page, start, delta);
        assert.equal(await dir(page), direction);
        await clock.advance(400);
        assert.equal(await toasts(page), 0);
        assert.deepEqual(errors, []);
        await clock.thaw();
        await context.close();
      });
    }
    for (const [direction, delta] of kept) {
      test(`${name}: a 51px drag ${direction} is damped and springs back`, async () => {
        const { page, context, clock, start } = await withToast(options);
        if (options.touch) await touchDrag(page, await context.newCDPSession(page), start, delta, { release: null });
        else { await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + 1, start.y); await page.mouse.move(start.x + 1 + delta[0], start.y + delta[1], { steps: 6 }); }
        const [x, y] = (await movement(page)).map((v) => Math.abs(parseFloat(v) || 0));
        assert.ok(Math.max(x, y) <= Math.sqrt(52) + 0.01, `a pull the other way moves it by its square root, not ${x}, ${y}`);
        if (options.touch) await (await context.newCDPSession(page)).send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        else await page.mouse.up();
        await clock.advance(400);
        assert.equal(await toasts(page), 1);
        assert.equal(await dir(page), null);
        assert.deepEqual(await movement(page), ["", ""]);
        await clock.thaw();
        await context.close();
      });
    }

    test(`${name}: 40px exactly springs back (more than 40 dismisses), by distance alone`, async () => {
      const { page, context, clock, start } = await withToast(options);
      const delta = options.touch ? [0, -40] : [0, 40];
      if (options.touch) await touchDrag(page, await context.newCDPSession(page), start, delta, { steps: 40 });
      else await mouseDrag(page, start, delta, 40);
      await clock.advance(400);
      assert.equal(await toasts(page), 1, "40 is not more than 40");
      await clock.thaw();
      await context.close();
    });
  }

  test("a change of mind (10px back toward the start) springs it back", async () => {
    const { page, context, clock, start } = await withToast({ width: 1440 });
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 1, start.y);
    await page.mouse.move(start.x + 31, start.y, { steps: 10 });
    await page.mouse.move(start.x + 16, start.y, { steps: 5 });
    await page.mouse.move(start.x + 46, start.y, { steps: 10 });
    await page.mouse.up();
    await clock.advance(400);
    assert.equal(await toasts(page), 1);
    await clock.thaw();
    await context.close();
  });

  test("a cancelled pointer springs it back, even past 40px, and the toast keeps focus throughout", async () => {
    const { page, context, clock, start } = await withToast({ width: 390, touch: true });
    await page.evaluate(() => document.querySelector(".toast").focus());
    const cdp = await context.newCDPSession(page);
    await touchDrag(page, cdp, start, [0, -80], { release: null });
    assert.equal(await focusedToast(page), true, "focus stays on the toast during the gesture");
    assert.equal(await page.evaluate(() => document.querySelector(".toast").hasAttribute("data-swiping")), true);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await clock.advance(400);
    assert.equal(await toasts(page), 1, "a cancel is never a dismissal");
    assert.equal(await dir(page), null);
    assert.deepEqual(await movement(page), ["", ""]);
    assert.equal(await page.evaluate(() => document.querySelector(".toast").hasAttribute("data-swiping")), false);
    assert.equal(await focusedToast(page), true, "and keeps it after");
    // A short drag that springs back leaves it focused too.
    await touchDrag(page, cdp, start, [0, -20]);
    await clock.advance(400);
    assert.equal(await toasts(page), 1);
    assert.equal(await focusedToast(page), true);
    await clock.thaw();
    await context.close();
  });

  test("a mouse press on the toast focuses it, and the same toast keeps focus while it is dragged", async () => {
    const { page, context, clock, start } = await withToast({ width: 1440 });
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 1, start.y);
    await page.mouse.move(start.x + 21, start.y, { steps: 5 });
    assert.equal(await focusedToast(page), true);
    await page.mouse.up();
    await clock.advance(400);
    assert.equal(await focusedToast(page), true, "a spring back leaves it where it was");
    await clock.thaw();
    await context.close();
  });

  for (const [name, options, delta, direction] of [
    ["a phone at 390, by touch", { width: 390, touch: true }, [0, -60], "up"],
    ["a window at 1440, by mouse", { width: 1440 }, [60, 0], "right"],
  ]) {
    test(`${name}, under reduced motion: a swipe ${direction} dismisses it where it was let go, and it only fades (fix pass 1)`, async () => {
      const { page, context, clock, start } = await withToast({ ...options, reducedMotion: "reduce" });
      const box = () => page.evaluate(() => { const r = document.querySelector(".toast").getBoundingClientRect(); return [r.left, r.top]; });
      let cdp;
      if (options.touch) { cdp = await context.newCDPSession(page); await touchDrag(page, cdp, start, delta, { release: null }); }
      else { await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + 1, start.y); await page.mouse.move(start.x + 1 + delta[0], start.y + delta[1], { steps: 6 }); }
      const held = await box();
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      else await page.mouse.up();
      assert.equal(await dir(page), direction);
      assert.equal(await page.evaluate(() => document.querySelector(".toast").hasAttribute("data-ending-style")), true);
      const left = await box();
      assert.ok(Math.abs(left[0] - held[0]) < 0.5 && Math.abs(left[1] - held[1]) < 0.5, `it stays where it was let go (${held} then ${left})`);
      const c = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".toast")); return { property: s.transitionProperty, opacity: s.opacity }; });
      assert.equal(c.property, "opacity", "only its opacity moves");
      await clock.advance(400);
      assert.equal(await toasts(page), 0);
      await clock.thaw();
      await context.close();
    });
  }

  test("a drag that starts on the toast's Dismiss is not a swipe", async () => {
    const { page, context, clock } = await withToast({ width: 1440 });
    const close = await rect(page, ".toast-close");
    await mouseDrag(page, { x: close.left + close.width / 2, y: close.top + close.height / 2 }, [0, 80]);
    assert.notEqual(await dir(page), "down");
    await clock.thaw();
    await context.close();
  });
});

describe("the skill's tooltip grace reopen is instant (M4)", () => {
  const shown = (page) => page.evaluate(() => document.getElementById("bh-tooltip")?.matches(":popover-open") ?? false);
  const timing = (page) => page.evaluate(() => { const t = document.getElementById("bh-tooltip"); const c = getComputedStyle(t); return { instant: t.hasAttribute("data-instant"), duration: c.transitionDuration, opacity: c.opacity, transform: c.transform }; });

  test("after the 600ms wait it enters over duration-base; reopened within the 400ms grace it is there at once, with no entrance", async () => {
    const { page, context } = await openHtml(browser, html, { scheme: "dark", width: 1440 });
    const clock = await freezeAnimations(page);
    await page.hover("#tip-a");
    await clock.advance(500);
    assert.equal(await shown(page), false, "the configured wait holds");
    await clock.advance(120);
    const first = await timing(page);
    assert.equal(first.instant, false);
    assert.ok(first.duration.split(",").every((d) => parseFloat(d) > 0), `the normal entrance runs (${first.duration})`);
    await clock.advance(400);
    await page.mouse.move(5, 600);
    await clock.advance(50);
    assert.equal(await shown(page), false);
    // Within the grace: no wait, and no entrance either.
    await page.hover("#tip-b");
    await clock.advance(0);
    assert.equal(await shown(page), true, "no wait within the grace");
    const again = await timing(page);
    assert.equal(again.instant, true);
    assert.ok(again.duration.split(",").every((d) => parseFloat(d) === 0), `the reopen is a zero transition, not ${again.duration}`);
    assert.equal(again.opacity, "1");
    assert.equal(again.transform, "none");
    // The hover bridge still holds it: onto the tooltip and it stays.
    const tip = await rect(page, "#bh-tooltip");
    await page.mouse.move(tip.left + tip.width / 2, tip.top + tip.height / 2);
    await clock.advance(100);
    assert.equal(await shown(page), true);
    // Leaving it closes it with the ordinary exit, 0.75 of duration-base (112.5ms) on ease-in: data-instant stays on the closed tooltip, and
    // the zero is the open state's alone (fix pass 1).
    await page.mouse.move(5, 600);
    await clock.advance(0);
    assert.equal(await shown(page), false);
    const exit = await page.evaluate(() => {
      const t = document.getElementById("bh-tooltip"); const c = getComputedStyle(t);
      const probe = document.createElement("div"); probe.style.transitionTimingFunction = "var(--basalt-ease-in)"; document.body.append(probe);
      const easeIn = getComputedStyle(probe).transitionTimingFunction; probe.remove();
      return { instant: t.hasAttribute("data-instant"), duration: c.transitionDuration, timing: c.transitionTimingFunction, easeIn };
    });
    assert.equal(exit.instant, true, "the attribute is still there, so the open-only rule is what keeps the exit");
    assert.ok(exit.duration.split(",").every((d) => Math.abs(parseFloat(d) * 1000 - 112.5) < 0.01), `the exit is 112.5ms, not ${exit.duration}`);
    assert.ok(exit.timing.split(/,(?![^(]*\))/).every((f) => f.trim() === exit.easeIn), `the exit eases in (${exit.timing})`);
    await clock.thaw();
    await context.close();
  });

  test("past the grace, the wait and the normal entrance come back", async () => {
    const { page, context } = await openHtml(browser, html, { scheme: "light", width: 1440 });
    const clock = await freezeAnimations(page);
    await page.hover("#tip-a");
    await clock.advance(700);
    await page.mouse.move(5, 600);
    await clock.advance(500);
    await page.hover("#tip-b");
    await clock.advance(300);
    assert.equal(await shown(page), false, "the wait again");
    await clock.advance(400);
    const t = await timing(page);
    assert.equal(t.instant, false);
    assert.ok(t.duration.split(",").every((d) => parseFloat(d) > 0));
    await clock.thaw();
    await context.close();
  });
});
