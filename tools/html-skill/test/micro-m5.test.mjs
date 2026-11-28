// micro-details m5 in the HTML skill (DECISIONS 405, 409): the wait module (Basalt.wait, React's usePressWait for a .btn), the busy .btn's look (busy is
// not disabled, no press look while busy or ringed, the ring after 300ms and held 400ms, an arc in forced colours), toast.promise on the wait's two
// timings, and the toast's action that waits, with focus kept across an update. Held to React's micro-m5 test. Decided by the council
// (micro-details/m5/decision.md, Opus deciding); the implementation has not been reviewed. Synthetic data only.
//
//  8  Basalt.wait: the timings; a second press, Enter and a form submit stopped while busy; a press in the tail goes through; `disabled` untouched; a bare
//     text node wrapped; busy keeps the rest colour and edge; no press look while busy, while only the ring shows, or on a static aria-busy; cursor progress.
//  9  toast.promise: React's cases 1 to 3 and 6.
// 10  The action's guard, the clock's pause and no eviction; focus across an update exactly as in React (the same button, `from` kept after F6).
// 11  Forced colours: the busy .btn's ring and .spinner are an arc, ButtonText on transparent sides, in both themes, held and under reduced motion.
// 12  A static aria-busy .btn shows the ring at once.
//
// Written while tests are paused (DECISIONS 330, 359): not run yet.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const BODY = `<main class="page stack">
  <h1>Pantry and builds</h1>
  <form id="form" class="cluster" onsubmit="event.preventDefault(); window.submits = (window.submits || 0) + 1;">
    <input id="field" name="name" value="Lemon tart">
    <button class="btn" id="save" type="submit">Save</button>
  </form>
  <div class="cluster">
    <button class="btn" data-variant="primary" id="publish"><span>Publish the build</span></button>
    <button class="btn" id="static" aria-busy="true"><span>Save</span></button>
    <span class="spinner" role="status" aria-label="Loading"></span>
    <button class="btn" id="page">On the page</button>
  </div>
</main>
<script>
  window.calls = {}; window.open_ = {}; window.spoken = [];
  window.ask = function (name) { return function () { window.calls[name] = (window.calls[name] || 0) + 1; return new Promise(function (resolve, reject) { (window.open_[name] = window.open_[name] || []).push({ resolve: resolve, reject: reject }); }); }; };
  window.answer = function (name) { window.open_[name].shift().resolve('ok'); };
  window.refuse = function (name) { window.open_[name].shift().reject(new Error('Synthetic refusal')); };
  window.unhandled = [];
  window.addEventListener('unhandledrejection', function (e) { window.unhandled.push(String(e.reason && e.reason.message || e.reason)); });
</script>
<!-- basalt:use wait toast spinner loops -->`;
const html = compose(`<title>m5</title>${BODY}`, { fonts: false }).html;

/** openHtml's page with Playwright's clock installed before the page loads, so every timer the page sets is on it. */
async function open({ scheme = "light", width = 1440, reducedMotion = "no-preference", forcedColors = "none", held = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion, forcedColors });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: 0 });
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto("https://basalt.test/");
  if (held) await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
  // Every line either live region is given (the alert region's text, and Basalt.announce's polite one).
  await page.evaluate(() => {
    new MutationObserver(() => {
      for (const region of document.querySelectorAll('[role="alert"], [aria-live="polite"]')) if (region.textContent && window.spoken[window.spoken.length - 1] !== region.textContent) window.spoken.push(region.textContent);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    window.ran = 0;
    new MutationObserver((records) => { for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1 && n.matches("braille-spinner")) window.ran += 1; }).observe(document.body, { childList: true, subtree: true });
  });
  return { page, context, errors };
}
const run = (page, ms) => page.clock.runFor(ms);
const attr = (page, sel, name) => page.locator(sel).getAttribute(name);
const css = (page, sel, props, pseudo = null) => page.evaluate(([sel, props, pseudo]) => { const s = getComputedStyle(document.querySelector(sel), pseudo); return Object.fromEntries(props.map((p) => [p, s[p]])); }, [sel, props, pseudo]);
const live = (page) => page.locator(".toast:not([data-ending-style])");
const calls = (page, name) => page.evaluate((name) => window.calls[name] || 0, name);

describe("8: Basalt.wait on a .btn", () => {
  for (const scheme of ["light", "dark"]) {
    test(`${scheme}: busy from the call, the ring at 300ms held 400ms, presses stopped, free with the answer`, async () => {
      const { page, context, errors } = await open({ scheme });
      try {
        await page.evaluate(() => { const b = document.getElementById("publish"); b.addEventListener("click", () => Basalt.wait(b, window.ask("publish"))); });
        const rest = await css(page, "#publish", ["color", "backgroundColor", "boxShadow"]);
        const width = await page.locator("#publish").evaluate((el) => el.getBoundingClientRect().width);
        await page.locator("#publish").click();
        await page.locator("#publish").click({ force: true });
        await page.locator("#publish").focus();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Space");
        assert.equal(await calls(page, "publish"), 1, "one call for every press");
        assert.equal(await attr(page, "#publish", "aria-busy"), "true");
        assert.equal(await attr(page, "#publish", "aria-disabled"), "true");
        assert.equal(await attr(page, "#publish", "disabled"), null, "its own disabled untouched");
        assert.equal(await page.evaluate(() => document.activeElement.id), "publish", "focus stays");
        await page.mouse.move(0, 0);
        assert.deepEqual(await css(page, "#publish", ["color", "backgroundColor", "boxShadow"]), rest, "busy is not the disabled look");
        assert.equal((await css(page, "#publish > span", ["opacity"])).opacity, "1", "the label shows until the ring");
        await run(page, 299);
        assert.equal(await attr(page, "#publish", "data-loading"), null, "no ring at 299ms");
        await run(page, 2);
        assert.equal(await attr(page, "#publish", "data-loading"), "", "the ring at 301ms");
        assert.equal((await css(page, "#publish > span", ["opacity"])).opacity, "0");
        assert.equal(await page.locator("#publish").evaluate((el) => el.getBoundingClientRect().width), width, "0px");
        await run(page, 49);
        await page.evaluate(() => window.answer("publish"));
        await run(page, 0);
        assert.equal(await attr(page, "#publish", "aria-busy"), null, "free with the answer");
        assert.equal(await attr(page, "#publish", "data-busy"), null);
        assert.equal(await attr(page, "#publish", "data-loading"), "", "the ring keeps its 400ms");
        // A press in the tail goes through.
        await page.locator("#publish").click();
        assert.equal(await calls(page, "publish"), 2);
        await page.evaluate(() => window.answer("publish"));
        await run(page, 1000);
        assert.equal(await attr(page, "#publish", "data-loading"), null);
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    });
  }

  test("a form's submit button: a second press and Enter in the field submit nothing while busy; a bare label is wrapped once", async () => {
    const { page, context } = await open();
    try {
      await page.evaluate(() => { const b = document.getElementById("save"); b.addEventListener("click", () => Basalt.wait(b, window.ask("save"))); });
      await page.locator("#save").click();
      const submits = await page.evaluate(() => window.submits || 0);
      await page.locator("#save").click({ force: true });
      await page.locator("#field").press("Enter");
      assert.equal(await page.evaluate(() => window.submits || 0), submits, "no submit while busy");
      assert.equal(await calls(page, "save"), 1);
      assert.deepEqual(await page.locator("#save").evaluate((el) => [...el.childNodes].map((n) => n.nodeName)), ["SPAN"], "the bare text is in one span");
      assert.equal(await page.evaluate(() => Basalt.wait(document.getElementById("save"), window.ask("save"))), undefined, "busy: undefined, and no call");
      assert.equal(await calls(page, "save"), 1);
      await page.evaluate(() => window.refuse("save"));
      await run(page, 0);
      assert.equal(await attr(page, "#save", "aria-busy"), null, "a rejection frees it too");
    } finally { await context.close(); }
  });

  test("fix 1: a rejection the caller catches leaves no unhandled rejection behind, and the caller's catch hears it", async () => {
    const { page, context } = await open();
    try {
      await page.evaluate(() => {
        const b = document.getElementById("publish");
        window.heard = null;
        Basalt.wait(b, window.ask("publish")).catch((e) => { window.heard = e.message; });
        window.refuse("publish");
      });
      await run(page, 0);
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => window.heard), "Synthetic refusal", "the returned promise carries the work's rejection");
      assert.deepEqual(await page.evaluate(() => window.unhandled), [], "the module's cleanup leaves nothing to reject unhandled");
      assert.equal(await attr(page, "#publish", "aria-busy"), null);
    } finally { await context.close(); }
  });

  test("fix 1: a rejection nobody handles is still reported, as React's Button re-raises (never swallowed)", async () => {
    const { page, context } = await open();
    try {
      await page.evaluate(() => {
        const b = document.getElementById("publish");
        Basalt.wait(b, window.ask("publish"));
        window.refuse("publish");
      });
      await run(page, 0);
      await page.waitForTimeout(50);
      assert.deepEqual(await page.evaluate(() => window.unhandled), ["Synthetic refusal"], "one unhandled rejection, the work's own");
      assert.equal(await attr(page, "#publish", "aria-busy"), null);
    } finally { await context.close(); }
  });

  test("no press look while busy, while only the ring shows, or on a static aria-busy; the cursor is progress in all three", async () => {
    const { page, context } = await open();
    try {
      await page.evaluate(() => { const b = document.getElementById("publish"); b.addEventListener("click", () => Basalt.wait(b, window.ask("publish"))); });
      // The pointer rests on the button until its hover has settled (a busy button keeps its hover), then presses at the same point: the settled
      // press is read against the settled hover, so only a press look could tell them apart. Transitions run in real time, not on the fake clock.
      const pressed = async (sel) => {
        const b = await page.locator(sel).boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(250);
        const hover = await css(page, sel, ["transform", "backgroundColor", "boxShadow"]);
        await page.mouse.down();
        await page.waitForTimeout(250);
        const out = await css(page, sel, ["transform", "backgroundColor", "boxShadow", "cursor"]);
        await page.mouse.up();
        await page.mouse.move(0, 0);
        return { hover, out };
      };
      await page.locator("#publish").click();
      for (const [label, sel] of [["busy", "#publish"], ["static aria-busy", "#static"]]) {
        const { hover, out } = await pressed(sel);
        assert.equal(out.transform, "none", `${label}: no scale`);
        assert.equal(out.backgroundColor, hover.backgroundColor, `${label}: no colour step from the hover`);
        assert.equal(out.boxShadow, hover.boxShadow, `${label}: the edge as hovered`);
        assert.equal(out.cursor, "progress", `${label}: progress`);
      }
      await run(page, 350);
      await page.evaluate(() => window.answer("publish"));
      await run(page, 0);
      assert.equal(await attr(page, "#publish", "aria-busy"), null);
      assert.equal(await attr(page, "#publish", "data-loading"), "", "only the ring's tail now");
      // The press in the tail goes through (a new wait) but shows no press.
      const { hover, out } = await pressed("#publish");
      assert.equal(out.transform, "none");
      assert.equal(out.backgroundColor, hover.backgroundColor);
      assert.equal(out.cursor, "progress");
    } finally { await context.close(); }
  });

  test("12: a static aria-busy .btn shows the ring at once, its label hidden", async () => {
    const { page, context } = await open();
    try {
      const ring = await css(page, "#static", ["content", "borderTopStyle"], "::after");
      assert.notEqual(ring.content, "none");
      assert.equal(ring.borderTopStyle, "solid");
      assert.equal((await css(page, "#static > span", ["opacity"])).opacity, "0");
    } finally { await context.close(); }
  });
});

describe("9: toast.promise on the wait's two timings", () => {
  for (const scheme of ["light", "dark"]) {
    test(`${scheme}: settled at 100ms, no running toast, one result from the running options, said once`, async () => {
      const { page, context } = await open({ scheme });
      try {
        await page.evaluate(() => { Basalt.toast.promise(window.ask("save")(), { running: { title: "Saving the draft", group: "save", home: "row", timeout: 3000 }, success: { status: "success" }, error: "Could not save" }); });
        await run(page, 100);
        await page.evaluate(() => window.answer("save"));
        await run(page, 1000);
        assert.equal(await page.evaluate(() => window.ran), 0, "no braille ever");
        assert.equal(await page.locator(".toast[data-running]").count(), 0);
        assert.equal(await live(page).count(), 1);
        assert.equal(await live(page).first().getAttribute("data-status"), "success");
        assert.equal(await page.locator(".toast-title").first().evaluate((el) => el.firstChild.textContent), "Saving the draft");
        assert.equal(await page.locator(".toast-drain").evaluate((el) => el.style.animationDuration), "3000ms");
        await page.evaluate(() => Basalt.toast({ title: "Saving the draft", group: "save", status: "success", home: "row", timeout: 3000 }));
        assert.equal(await live(page).count(), 1, "the running toast's group");
        assert.equal(await page.evaluate(() => window.spoken.filter((s) => s.startsWith("Saving the draft")).length) >= 1, true);
      } finally { await context.close(); }
    });

    for (const outcome of ["resolved", "rejected"]) {
      test(`${scheme}: ${outcome} at 500ms, the running toast from 300ms, its result no sooner than 400ms after entry`, async () => {
        const { page, context } = await open({ scheme });
        try {
          await page.evaluate(() => { Basalt.toast.promise(window.ask("send")(), { running: "Sending the report", success: "Report sent", error: "Could not send the report" }); });
          await run(page, 299);
          assert.equal(await page.locator(".toast").count(), 0);
          await run(page, 2);
          assert.equal(await page.locator(".toast[data-running]").count(), 1);
          await run(page, 199);
          await page.evaluate((o) => (o === "resolved" ? window.answer("send") : window.refuse("send")), outcome);
          await run(page, 190);
          assert.equal(await page.locator(".toast[data-running]").count(), 1, "still running at 690ms");
          await run(page, 20);
          assert.equal(await page.locator(".toast[data-running]").count(), 0, "the result by 710ms");
          assert.equal(await live(page).first().getAttribute("data-status"), outcome === "resolved" ? "neutral" : "danger");
          assert.equal(await page.locator(".toast-seat").count(), 1, "the seat stays");
        } finally { await context.close(); }
      });
    }
  }

  for (const [result, seat] of [[{ title: "Library synced" }, false], [{ title: "Library synced", status: "success" }, true]]) {
    test(`queued behind three that stay and settled to ${result.status || "neutral"}: it enters as its result, no braille, ${seat ? "with its seat" : "no seat"}, said once`, async () => {
      const { page, context } = await open();
      try {
        await page.evaluate(() => { for (const n of [1, 2, 3]) Basalt.toast({ title: `Kept ${n}` }); });
        await page.evaluate((result) => { Basalt.toast.promise(window.ask("sync")(), { running: "Syncing the library", success: result, error: "Could not sync" }); }, result);
        await run(page, 400);
        assert.equal(await live(page).count(), 3, "queued");
        await page.evaluate(() => window.answer("sync"));
        await run(page, 0);
        await page.locator(".toast", { hasText: "Kept 1" }).locator(".toast-close").click();
        await page.waitForTimeout(600);
        const entered = page.locator(".toast", { hasText: "Library synced" });
        assert.equal(await entered.count(), 1);
        assert.equal(await entered.locator(".toast-seat").count(), seat ? 1 : 0);
        assert.equal(await page.evaluate(() => window.ran), 0);
      } finally { await context.close(); }
    });
  }

  test("showAfter 0 on settled work: the running toast in the call, then its result no sooner than 400ms after", async () => {
    const { page, context } = await open();
    try {
      const shown = await page.evaluate(() => { Basalt.toast.promise(Promise.resolve("ok"), { running: "Checking the links", success: "Links checked", error: "Could not check", showAfter: 0 }); return document.querySelectorAll(".toast[data-running]").length; });
      assert.equal(shown, 1, "shown in the call");
      await run(page, 380);
      assert.equal(await page.locator(".toast[data-running]").count(), 1);
      await run(page, 40);
      assert.equal(await page.locator(".toast[data-running]").count(), 0);
    } finally { await context.close(); }
  });
});

describe("10: the toast's action waits, and focus survives an update", () => {
  test("pressed twice and by Enter: one call; busy from the press; the clock and line pause; it is not closed for room; it closes on what was left", async () => {
    const { page, context } = await open();
    try {
      const id = await page.evaluate(() => Basalt.toast({ title: "Archived", home: "row", timeout: 5000, action: { label: "Undo", onClick: window.ask("undo") } }));
      const mine = page.locator(`#${id}`);
      await run(page, 4500);
      await page.evaluate(() => { const a = document.querySelector(".toast-action"); a.click(); a.click(); a.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); a.click(); });
      assert.equal(await calls(page, "undo"), 1);
      assert.equal(await page.locator(".toast-action").getAttribute("aria-busy"), "true");
      assert.equal(await mine.getAttribute("data-action-busy"), "");
      assert.equal(await mine.locator(".toast-drain").evaluate((el) => getComputedStyle(el).animationPlayState), "paused");
      await page.evaluate(() => { for (const n of [1, 2, 3]) Basalt.toast({ title: `Moved ${n}`, home: "row" }); });
      await run(page, 900);
      assert.equal(await mine.getAttribute("data-ending-style"), null, "kept while its action waits");
      await page.evaluate(() => window.answer("undo"));
      await run(page, 100);
      assert.equal(await mine.count(), 1, "still there at 5.5s");
      assert.equal(await mine.getAttribute("data-action-busy"), null);
      await run(page, 300);
      assert.equal(await mine.getAttribute("data-ending-style"), null);
      await run(page, 200);
      assert.equal(await mine.getAttribute("data-ending-style"), "", "closing on the 500ms that were left");
    } finally { await context.close(); }
  });

  test("fix 1: an Undo that takes its own action away before it returns a promise: no error, and the toast keeps going", async () => {
    const { page, context, errors } = await open();
    try {
      const id = await page.evaluate(() => {
        const id = Basalt.toast({ title: "Archived", home: "row", action: { label: "Undo", onClick: () => { Basalt.toast.update(id, { title: "Restoring", action: undefined }); return window.ask("undo")(); } } });
        return id;
      });
      await page.evaluate(() => document.querySelector(".toast-action").click());
      assert.equal(await calls(page, "undo"), 1);
      assert.equal(await page.locator(".toast-action").count(), 0, "the action is gone, as the handler asked");
      assert.equal(await page.locator(`#${id}`).getAttribute("data-action-busy"), "", "the wait is still counted on the toast");
      await page.evaluate(() => window.answer("undo"));
      await run(page, 0);
      assert.equal(await page.locator(`#${id}`).getAttribute("data-action-busy"), null);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });

  test("a handler that returns nothing is called each press and gets no busy attributes", async () => {
    const { page, context } = await open();
    try {
      await page.evaluate(() => Basalt.toast({ title: "Pinned", action: { label: "Unpin", onClick: () => { window.calls.sync = (window.calls.sync || 0) + 1; } } }));
      await page.locator(".toast-action").click();
      await page.locator(".toast-action").click();
      assert.equal(await calls(page, "sync"), 2);
      assert.equal(await page.locator(".toast-action").getAttribute("aria-busy"), null);
      assert.equal(await page.locator(".toast[data-action-busy]").count(), 0);
    } finally { await context.close(); }
  });

  for (const held of [".toast-action", ".toast-close"]) {
    test(`${held === ".toast-close" ? "Dismiss" : "Undo"} focused is the same button across a message update and a label change; a press calls the new handler`, async () => {
      const { page, context } = await open();
      try {
        const id = await page.evaluate(() => Basalt.toast({ title: "Archived", action: { label: "Undo", keys: "Mod+Z", onClick: () => { window.calls.first = 1; } } }));
        await page.locator(held).focus();
        await page.evaluate(() => { window.held = document.activeElement; });
        await page.evaluate((id) => Basalt.toast.update(id, { title: "Archived 2 files" }), id);
        assert.equal(await page.evaluate(() => document.activeElement === window.held), true);
        await page.evaluate((id) => Basalt.toast.update(id, { action: { label: "Restore", onClick: () => { window.calls.second = 1; } } }), id);
        assert.equal(await page.evaluate(() => document.activeElement === window.held), true);
        assert.equal(await page.locator(".toast-action").textContent(), "Restore");
        assert.equal(await page.locator(".toast-action").getAttribute("aria-keyshortcuts"), null, "the new action has no key");
        await page.locator(".toast-action").click();
        assert.equal(await calls(page, "second"), 1, "the listener reads the toast's options at press time");
        assert.equal(await calls(page, "first"), 0);
      } finally { await context.close(); }
    });
  }

  test("an update that removes the focused action focuses the toast first; `from` survives, so Escape returns to where F6 came from", async () => {
    const { page, context } = await open();
    try {
      const id = await page.evaluate(() => Basalt.toast({ title: "Archived", action: { label: "Undo", onClick: () => {} } }));
      await page.evaluate(() => { window.lost = 0; document.querySelector(".toast-viewport").addEventListener("focusout", (e) => { if (!e.relatedTarget) window.lost += 1; }); });
      await page.locator("#page").focus();
      await page.keyboard.press("F6");
      await page.locator(".toast-action").focus();
      await page.evaluate((id) => Basalt.toast.update(id, { title: "Restored", action: undefined }), id);
      assert.equal(await page.locator(".toast-action").count(), 0);
      assert.equal(await page.evaluate((id) => document.activeElement?.id === id, id), true, "focus is on the toast");
      assert.equal(await page.evaluate(() => window.lost), 0);
      await page.keyboard.press("Shift+Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "page", "back where F6 came from");
    } finally { await context.close(); }
  });
});

describe("11: forced colours draw the ring as an arc", () => {
  for (const scheme of ["light", "dark"]) {
    for (const [name, options] of [["running", {}], ["held", { held: true }], ["reduced motion", { reducedMotion: "reduce" }]]) {
      test(`${scheme}, ${name}: the busy .btn's ring and the .spinner are ButtonText on top and transparent on the other sides`, async () => {
        const { page, context } = await open({ scheme, forcedColors: "active", ...options });
        try {
          const system = await page.evaluate(() => { const p = document.createElement("p"); p.style.color = "ButtonText"; p.style.forcedColorAdjust = "none"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
          for (const [sel, pseudo] of [["#static", "::after"], [".spinner", null]]) {
            const s = await css(page, sel, ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "forcedColorAdjust"], pseudo);
            assert.equal(s.forcedColorAdjust, "none", `${sel}: its own colours`);
            assert.equal(s.borderTopColor, system, `${sel}: the arc`);
            for (const side of ["borderRightColor", "borderBottomColor", "borderLeftColor"]) assert.equal(s[side], "rgba(0, 0, 0, 0)", `${sel}: ${side} transparent`);
          }
        } finally { await context.close(); }
      });
    }
  }
});
