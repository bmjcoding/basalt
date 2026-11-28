// micro-details m5 (DECISIONS 405, 409): waits and transient feedback, React's half. Decided by the council (micro-details/m5/decision.md, Opus deciding);
// the implementation has not been reviewed.
//
// 1  toast.promise settling inside 300ms: no running toast ever mounts; one result built from the running options; announced once.
// 2  Settling at 500ms, resolved and rejected: the running toast from 300ms, its result no earlier than 400ms after it entered.
// 3  A running toast queued behind three that stay: settling while queued, it enters as its result, with no braille, announced once.
// 4  An async action: one call for two presses and Enter; busy from the press, the ring at 300ms held 400ms; 0px width change; the toast's clock and line
//    pause while it waits and it is never closed to make room; a sync action gets no busy attributes.
// 5  Focus across an update: the same button object for the action and for Dismiss; an update that removes the focused action focuses the toast, with no
//    focusout to nowhere, and Escape still returns to where F6 came from.
// 6  The queued seat: a neutral result enters with no seat, a success with its seat and mark; showAfter 0 on settled work shows the running toast first.
// 7  The provider unmounted while a promise waits to show: nothing shows, nothing throws.
//
// Driven in Chromium against the built package with the real stylesheet, on Playwright's fake clock. Synthetic data only.
// Written while tests are paused (DECISIONS 330, 359): not run yet.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];

// `window.ask(name)` makes a handler that returns a promise the test settles: `window.answer(name)` resolves the oldest open one, `window.refuse(name)`
// rejects it; `window.calls[name]` counts the calls. `window.spoken` collects every line the two live regions are given; `window.ran` counts every
// running toast that mounted.
const PRELUDE = `
window.calls = {}; window.open_ = {}; window.spoken = []; window.ran = 0;
window.ask = (name) => () => { window.calls[name] = (window.calls[name] ?? 0) + 1; return new Promise((resolve, reject) => { (window.open_[name] ??= []).push({ resolve, reject }); }); };
window.answer = (name) => window.open_[name].shift().resolve("ok");
window.refuse = (name) => window.open_[name].shift().reject(new Error("Synthetic refusal"));
window.addEventListener("unhandledrejection", (event) => event.preventDefault());
new MutationObserver((records) => {
  for (const record of records) for (const node of record.addedNodes) {
    if (!(node instanceof Element)) continue;
    if (node.matches("p") && node.closest('[role="status"], [role="alert"]')) window.spoken.push(node.textContent);
    if (node.matches(".basalt-toast[data-running]") || node.querySelector?.(".basalt-toast[data-running]")) window.ran += 1;
  }
  for (const record of records) if (record.type === "attributes" && record.target.matches?.(".basalt-toast") && record.target.hasAttribute("data-running") && record.oldValue === null) window.ran += 1;
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-running"], attributeOldValue: true });
`;

const DEMO = `function Demo() {
  const t = B.useToast();
  React.useEffect(() => { window.t = t; }, [t]);
  return <main style={{ padding: 16 }}><button id="page">On the page</button></main>;
}
function Root() {
  const [on, setOn] = React.useState(true);
  React.useEffect(() => { window.unmount = () => setOn(false); }, []);
  return on ? <B.ToastProvider><Demo /></B.ToastProvider> : <p id="gone">Gone</p>;
}`;
const FIXTURE = `${PRELUDE}\n${DEMO}\ncreateRoot(document.getElementById("root")).render(<Root />);`;

const open = async (options = {}) => {
  const { page, errors } = await fixturePage(browser, FIXTURE, { clock: true, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); }" });
  await commit(page);
  return { page, errors };
};
// An update that is not from an event commits on React's own task, which runs in real time while the fake clock is paused (busy-controls' helpers).
const commit = async (page) => { await page.waitForTimeout(30); await page.clock.runFor(0); };
const run = async (page, ms) => { await commit(page); await page.clock.runFor(ms); await commit(page); };
const live = (page) => page.locator(".basalt-toast:not([data-ending-style])");
const calls = (page, name) => page.evaluate((name) => window.calls[name] ?? 0, name);
const spoken = (page) => page.evaluate(() => window.spoken.slice());
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });

describe("1 to 3: toast.promise on the wait's two timings", () => {
  for (const theme of THEMES) {
    test(`${theme}: work that settles at 100ms shows no running toast, and one result built from the running options, announced once`, async () => {
      const { page, errors } = await open({ theme });
      try {
        await page.evaluate(() => {
          window.t.promise(window.ask("save")(), { running: { title: "Saving the draft", group: "save", home: "row", timeout: 3000 }, success: { status: "success" }, error: "Could not save" });
        });
        await run(page, 100);
        await page.evaluate(() => window.answer("save"));
        await run(page, 0);
        await run(page, 1000);
        assert.equal(await page.evaluate(() => window.ran), 0, "no running toast ever mounted");
        assert.equal(await live(page).count(), 1);
        const toast = live(page).first();
        assert.equal(await toast.getAttribute("data-status"), "success");
        assert.equal(await toast.getAttribute("data-running"), null);
        assert.equal(await toast.locator(".basalt-toast-title").textContent(), "Saving the draft", "the title is the running toast's");
        assert.equal(await toast.locator(".basalt-toast-drain").evaluate((el) => el.style.animationDuration), "3000ms", "the home and timeout are the running toast's");
        assert.equal(await page.locator(".basalt-spinner[data-variant=braille]").count(), 0);
        // The group is the running toast's: a like result shown now joins it.
        await page.evaluate(() => window.t.show({ title: "Saving the draft", group: "save", status: "success", home: "row", timeout: 3000 }));
        await run(page, 0);
        assert.equal(await live(page).count(), 1);
        assert.match(await toast.locator(".basalt-toast-count").textContent(), /2/);
        assert.equal((await spoken(page)).filter((line) => line === "Saving the draft").length, 1, "the result is said once");
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });

    for (const outcome of ["resolved", "rejected"]) {
      test(`${theme}: work ${outcome} at 500ms shows the running toast from 300ms, and its result no sooner than 400ms after it entered`, async () => {
        const { page } = await open({ theme });
        try {
          await page.evaluate(() => { window.t.promise(window.ask("send")(), { running: "Sending the report", success: "Report sent", error: "Could not send the report" }); });
          await run(page, 299);
          assert.equal(await live(page).count(), 0, "nothing at 299ms");
          await run(page, 2);
          assert.equal(await page.locator(".basalt-toast[data-running]").count(), 1, "the running toast at 301ms");
          await run(page, 199);
          await page.evaluate((outcome) => (outcome === "resolved" ? window.answer("send") : window.refuse("send")), outcome);
          // Entered at 300; the answer at 500; the result at 700, never before.
          await run(page, 190);
          assert.equal(await page.locator(".basalt-toast[data-running]").count(), 1, "still running at 690ms, though the work has settled");
          await run(page, 20);
          const toast = live(page).first();
          assert.equal(await toast.getAttribute("data-running"), null, "the result by 710ms");
          assert.equal(await toast.locator(".basalt-toast-title").textContent(), outcome === "resolved" ? "Report sent" : "Could not send the report");
          assert.equal(await toast.getAttribute("data-status"), outcome === "resolved" ? "neutral" : "danger");
          assert.equal(await toast.locator(".basalt-toast-seat").count(), 1, "the seat stays from running to the result");
        } finally { await page.close(); }
      });
    }

    test(`${theme}: a running toast queued behind three that stay enters as its result, with no braille, announced once`, async () => {
      const { page } = await open({ theme });
      try {
        await page.evaluate(() => { for (const n of [1, 2, 3]) window.t.show({ title: `Kept ${n}` }); });
        await run(page, 0);
        await page.evaluate(() => { window.t.promise(window.ask("sync")(), { running: "Syncing the library", success: { title: "Library synced", status: "success" }, error: "Could not sync" }); });
        await run(page, 400);
        assert.equal(await live(page).count(), 3, "the running toast is queued");
        await page.evaluate(() => window.answer("sync"));
        await run(page, 0);
        await page.locator(".basalt-toast", { hasText: "Kept 1" }).locator(".basalt-toast-close").click();
        await run(page, 1000);
        const entered = page.locator(".basalt-toast", { hasText: "Library synced" });
        assert.equal(await entered.count(), 1);
        assert.equal(await page.evaluate(() => window.ran), 0, "it never showed braille");
        assert.equal((await spoken(page)).filter((line) => line.startsWith("Library synced")).length, 1);
      } finally { await page.close(); }
    });
  }
});

describe("4: a toast's action that waits", () => {
  const ACTION = (onClick) => `window.t.show({ title: "Archived", home: "row", timeout: 5000, action: { label: "Undo", onClick: ${onClick} } })`;

  for (const theme of THEMES) {
    test(`${theme}: two presses and Enter call it once; busy from the press, the ring at 300ms and held 400ms; its width holds`, async () => {
      const { page } = await open({ theme });
      try {
        await page.evaluate(ACTION('window.ask("undo")'));
        await run(page, 0);
        const action = page.locator(".basalt-toast-action");
        const rest = await box(action);
        await action.click();
        await action.click({ force: true });
        await action.focus();
        await page.keyboard.press("Enter");
        assert.equal(await calls(page, "undo"), 1, "one call");
        assert.equal(await action.getAttribute("aria-busy"), "true");
        assert.equal(await action.getAttribute("aria-disabled"), "true");
        assert.equal(await action.getAttribute("data-loading"), null, "no ring before 300ms");
        await run(page, 301);
        assert.equal(await action.getAttribute("data-loading"), "", "the ring at 300ms");
        assert.deepEqual(await box(action), rest, "0px: the label stays in layout under the ring");
        await run(page, 49);
        await page.evaluate(() => window.answer("undo"));
        await run(page, 0);
        assert.equal(await action.getAttribute("aria-busy"), null, "free with the answer");
        assert.equal(await action.getAttribute("data-loading"), "", "the ring keeps its 400ms");
        await run(page, 360);
        assert.equal(await action.getAttribute("data-loading"), null);
        assert.deepEqual(await box(action), rest);
      } finally { await page.close(); }
    });
  }

  test("pressed at 4.5s of a 5s toast with a 900ms answer: still there at 5.5s, its line paused; it closes on what was left; a toast arriving meanwhile does not close it", async () => {
    const { page } = await open();
    try {
      await page.evaluate(ACTION('window.ask("undo")'));
      await run(page, 0);
      const id = await page.locator(".basalt-toast").first().getAttribute("data-toast-id");
      const mine = page.locator(`.basalt-toast[data-toast-id="${id}"]`);
      await run(page, 4500);
      // A press with no pointer over the stack and no focus in it, so nothing else holds the clock.
      await page.evaluate(() => document.querySelector(".basalt-toast-action").click());
      await run(page, 0);
      assert.equal(await mine.getAttribute("data-action-busy"), "");
      assert.equal(await mine.locator(".basalt-toast-drain").evaluate((el) => getComputedStyle(el).animationPlayState), "paused");
      // Three timed toasts arrive: the stack is full, and the waiting toast is not the one closed for room.
      await page.evaluate(() => { for (const n of [1, 2, 3]) window.t.show({ title: `Moved ${n}`, home: "row" }); });
      await run(page, 500);
      assert.equal(await mine.count(), 1, "kept while its action waits");
      assert.equal(await mine.getAttribute("data-ending-style"), null);
      await run(page, 400);
      await page.evaluate(() => window.answer("undo"));
      await run(page, 100);
      assert.equal(await mine.count(), 1, "still there at 5.5s");
      assert.equal(await mine.getAttribute("data-action-busy"), null);
      assert.equal(await mine.locator(".basalt-toast-drain").evaluate((el) => getComputedStyle(el).animationPlayState), "running");
      // 500ms were left at the press; 100 of them have run since the answer.
      await run(page, 300);
      assert.equal(await mine.getAttribute("data-ending-style"), null, "not closed before its time");
      await run(page, 1000);
      assert.equal(await mine.count(), 0, "closed on the time that was left");
    } finally { await page.close(); }
  });

  test("fix 1: a press and a newcomer in the same task: the waiting toast is already off the list of those closed for room", async () => {
    const { page } = await open();
    try {
      await page.evaluate(ACTION('window.ask("undo")'));
      await page.evaluate(() => { window.t.show({ title: "Moved 1", home: "row" }); window.t.show({ title: "Moved 2", home: "row" }); });
      await run(page, 0);
      const mine = page.locator(".basalt-toast", { hasText: "Archived" });
      // One task: the press (no pointer, no focus), then a fourth timed toast before React has rendered anything.
      await page.evaluate(() => { document.querySelector(".basalt-toast-action").click(); window.t.show({ title: "Moved 3", home: "row" }); });
      await run(page, 500);
      assert.equal(await mine.getAttribute("data-ending-style"), null, "not closed for room");
      assert.equal(await page.locator(".basalt-toast:not([data-ending-style])", { hasText: "Moved 1" }).count(), 0, "the oldest free timed toast went instead");
    } finally { await page.close(); }
  });

  test("a handler that returns nothing is called on every press and gets no busy attributes", async () => {
    const { page } = await open();
    try {
      await page.evaluate(ACTION("() => { window.calls.sync = (window.calls.sync ?? 0) + 1; }"));
      await run(page, 0);
      const action = page.locator(".basalt-toast-action");
      await action.click();
      await action.click();
      assert.equal(await calls(page, "sync"), 2);
      assert.equal(await action.getAttribute("aria-busy"), null);
      assert.equal(await action.getAttribute("aria-disabled"), null);
      assert.equal(await page.locator(".basalt-toast[data-action-busy]").count(), 0);
    } finally { await page.close(); }
  });
});

describe("5: focus survives an update", () => {
  for (const theme of THEMES) {
    for (const held of [".basalt-toast-action", ".basalt-toast-close"]) {
      test(`${theme}: ${held === ".basalt-toast-close" ? "Dismiss" : "Undo"} focused keeps the same element across a message update and an action label change`, async () => {
        const { page } = await open({ theme });
        try {
          const id = await page.evaluate(() => window.t.show({ title: "Archived", action: { label: "Undo", keys: "Mod+Z", onClick: () => {} } }));
          await run(page, 0);
          await page.locator(held).focus();
          await page.evaluate(() => { window.held = document.activeElement; });
          await page.evaluate((id) => window.t.update(id, { title: "Archived 2 files" }), id);
          await run(page, 0);
          assert.equal(await page.evaluate(() => document.activeElement === window.held), true, "the message changed");
          await page.evaluate((id) => window.t.update(id, { action: { label: "Restore", keys: "Mod+Z", onClick: () => {} } }), id);
          await run(page, 0);
          assert.equal(await page.evaluate(() => document.activeElement === window.held), true, "the action's label changed");
          assert.equal(await page.locator(".basalt-toast-action").textContent(), "Restore");
          assert.ok(await page.locator(".basalt-toast-action").getAttribute("aria-keyshortcuts"));
        } finally { await page.close(); }
      });
    }

    test(`${theme}: fix 1: a quick grouped result that joins a focused toast and has no action focuses the toast, and Escape returns to where F6 came from`, async () => {
      const { page } = await open({ theme });
      try {
        await page.evaluate(() => window.t.show({ title: "Library synced", group: "sync", home: "row", timeout: 0, action: { label: "View", onClick: () => {} } }));
        await run(page, 0);
        await page.evaluate(() => {
          window.lost = 0;
          document.querySelector(".basalt-toast-viewport").addEventListener("focusout", (event) => { if (event.relatedTarget === null) window.lost += 1; });
        });
        await page.locator("#page").focus();
        await page.keyboard.press("F6");
        assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-toast-action")), true);
        // Settled inside 300ms: the result is shown at once, joins the group on screen and has no action.
        await page.evaluate(() => { window.t.promise(Promise.resolve("ok"), { running: { title: "Library synced", group: "sync", home: "row" }, success: {}, error: "Could not sync" }); });
        await run(page, 0);
        assert.equal(await page.locator(".basalt-toast-action").count(), 0);
        assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-toast")), true, "focus is on the toast");
        assert.equal(await page.evaluate(() => window.lost), 0);
        await page.keyboard.press("Escape");
        await run(page, 0);
        assert.equal(await page.evaluate(() => document.activeElement?.id), "page");
      } finally { await page.close(); }
    });

    test(`${theme}: an update that removes the focused action focuses the toast, with no focusout to nowhere, and Escape returns to where F6 came from`, async () => {
      const { page } = await open({ theme });
      try {
        const id = await page.evaluate(() => window.t.show({ title: "Archived", action: { label: "Undo", onClick: () => {} } }));
        await run(page, 0);
        await page.evaluate(() => {
          window.lost = 0;
          document.querySelector(".basalt-toast-viewport").addEventListener("focusout", (event) => { if (event.relatedTarget === null) window.lost += 1; });
        });
        await page.locator("#page").focus();
        await page.keyboard.press("F6");
        assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-toast-action")), true, "F6 reaches the action");
        await page.evaluate((id) => window.t.update(id, { title: "Restored", action: undefined }), id);
        await run(page, 0);
        assert.equal(await page.locator(".basalt-toast-action").count(), 0);
        assert.equal(await page.evaluate((id) => document.activeElement?.getAttribute("data-toast-id") === id, id), true, "focus is on the toast");
        assert.equal(await page.evaluate(() => window.lost), 0, "focus never left the stack for nowhere");
        await page.keyboard.press("Escape");
        await run(page, 0);
        assert.equal(await page.evaluate(() => document.activeElement?.id), "page", "back where F6 came from");
      } finally { await page.close(); }
    });
  }
});

describe("6 and 7: the queued seat, showAfter 0, and an unmount", () => {
  for (const [result, seat] of [[{ title: "Library synced" }, false], [{ title: "Library synced", status: "success" }, true]]) {
    test(`a running toast queued behind three that stay, settled to ${result.status ?? "neutral"}, enters ${seat ? "with its seat and mark" : "with no seat"}`, async () => {
      const { page } = await open();
      try {
        await page.evaluate(() => { for (const n of [1, 2, 3]) window.t.show({ title: `Kept ${n}` }); });
        await run(page, 0);
        await page.evaluate((result) => { window.t.promise(window.ask("sync")(), { running: "Syncing the library", success: result, error: "Could not sync" }); }, result);
        await run(page, 400);
        await page.evaluate(() => window.answer("sync"));
        await run(page, 0);
        await page.locator(".basalt-toast", { hasText: "Kept 1" }).locator(".basalt-toast-close").click();
        await run(page, 1000);
        const entered = page.locator(".basalt-toast", { hasText: "Library synced" });
        assert.equal(await entered.locator(".basalt-toast-seat").count(), seat ? 1 : 0);
        if (seat) assert.equal(await entered.locator(".basalt-toast-seat svg").count(), 1, "the success mark in it");
      } finally { await page.close(); }
    });
  }

  test("showAfter 0 on work already settled: the running toast is shown in the call, then its result no sooner than 400ms after it entered", async () => {
    const { page } = await open();
    try {
      await page.evaluate(() => { window.t.promise(Promise.resolve("ok"), { running: "Checking the links", success: "Links checked", error: "Could not check", showAfter: 0 }); });
      await run(page, 0);
      assert.equal(await page.locator(".basalt-toast[data-running]").count(), 1, "the running toast, though the answer was already in hand");
      await run(page, 380);
      assert.equal(await page.locator(".basalt-toast[data-running]").count(), 1, "still running before its 400ms");
      await run(page, 40);
      assert.equal(await live(page).first().locator(".basalt-toast-title").textContent(), "Links checked");
    } finally { await page.close(); }
  });

  test("fix 1: the provider unmounted after the running toast entered, the work settling inside its 400ms: no result, no timer, nothing throws", async () => {
    const { page, errors } = await open();
    try {
      await page.evaluate(() => {
        window.timersAfter = 0;
        window.t.promise(window.ask("late")(), { running: "Saving", success: "Saved", error: "Could not save" });
      });
      await run(page, 320);
      assert.equal(await page.locator(".basalt-toast[data-running]").count(), 1, "entered at 300ms");
      await page.evaluate(() => window.unmount());
      await run(page, 0);
      // From here, count the timers the page sets: the settled work must start none.
      await page.evaluate(() => { const set = window.setTimeout; window.setTimeout = (...a) => { window.timersAfter += 1; return set(...a); }; window.answer("late"); });
      await run(page, 0);
      assert.equal(await page.evaluate(() => window.timersAfter), 0, "no timer for the result's floor");
      await run(page, 1000);
      assert.equal(await page.locator(".basalt-toast").count(), 0);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });

  test("the provider unmounted while a promise waits to show its running toast: nothing shows, nothing throws", async () => {
    const { page, errors } = await open();
    try {
      await page.evaluate(() => { window.t.promise(window.ask("late")(), { running: "Saving", success: "Saved", error: "Could not save" }); });
      await run(page, 100);
      await page.evaluate(() => window.unmount());
      await run(page, 0);
      await run(page, 500);
      await page.evaluate(() => window.answer("late"));
      await run(page, 1000);
      assert.equal(await page.locator(".basalt-toast").count(), 0);
      assert.equal(await page.locator("#gone").count(), 1);
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
});
