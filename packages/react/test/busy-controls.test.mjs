// busy-controls (DECISIONS 255, 257): a control that asks the server is busy until the answer, and never sends twice. A press whose handler returns a
// promise waits for it (Button, IconButton, TextButton, a MenuItem through its trigger, a Form's submit); its mark shows after 300ms and stays at least
// 400ms; TextButton's own busy look; and a field being written into (Textarea and Input `writing`). Decided by Opus under the no-council path (DECISIONS 226);
// the implementation has not been reviewed. Driven in Chromium against the built package with the real stylesheet, on Playwright's fake clock where a
// delay is measured. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// Every press hands back a promise the test settles: `window.answer(name)` resolves the oldest open one of that name, `window.refuse(name)` rejects it.
// `window.calls[name]` counts the handler's calls.
const PRELUDE = `
window.calls = {}; window.open_ = {};
window.ask = (name) => () => { window.calls[name] = (window.calls[name] ?? 0) + 1; return new Promise((resolve, reject) => { (window.open_[name] ??= []).push({ resolve, reject }); }); };
window.answer = (name) => window.open_[name].shift().resolve("ok");
window.refuse = (name) => window.open_[name].shift().reject(new Error("Synthetic refusal"));
window.unhandled = [];
window.addEventListener("unhandledrejection", (event) => { window.unhandled.push(String(event.reason?.message ?? event.reason)); event.preventDefault(); });
`;
const render = (jsx) => `${PRELUDE}\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const open = async (jsx, options = {}) => {
  const { page, errors } = await fixturePage(browser, render(jsx), options);
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); padding: 24px; }" });
  // A paused fake clock never runs a frame, so there is nothing to settle.
  if (!options.clock) await settle(page);
  return { page, errors };
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
const css = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
const attr = (locator, name) => locator.getAttribute(name);
// A neutral is the same colour written either way: an animated or mixed value is serialised in oklab, a token in oklch (both with no chroma here).
const neutral = (c) => c.replace(/^okl(ab|ch)\(/, "ok(");
// An update that is not from an event (an answer, a prop the test sets) commits on React's own task, which runs in real time while the fake clock is paused: a short
// real wait, then a zero-length run for anything the clock holds, lets it land before the clock is moved (so a timer it clears is cleared in time).
const commit = async (page) => { await page.waitForTimeout(30); await page.clock.runFor(0); };
/** Move the fake clock, once what React has queued (a render and its effects) has landed. */
const run = async (page, ms) => { await commit(page); await page.clock.runFor(ms); };
const calls = (page, name) => page.evaluate((name) => window.calls[name] ?? 0, name);
const tokenColor = (page, token) => page.evaluate((token) => { const p = document.createElement("p"); p.style.color = `var(${token})`; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, token);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return (await page.evaluate((o) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, o), AXE)).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
};

const BUTTONS = `<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
  <B.Button data-testid="button" variant="primary" onClick={window.ask("button")}>Draft with the scribe</B.Button>
  <B.IconButton data-testid="icon" icon={B.CopyGlyph} label="Copy the summary" onClick={window.ask("icon")} />
  <span>Not right? <B.TextButton data-testid="text" onClick={window.ask("text")}>Write it again</B.TextButton></span>
  <B.TextButton data-testid="quiet" quiet onClick={window.ask("quiet")}>Write it again</B.TextButton>
  <B.Button data-testid="free" waitForAnswer={false} onClick={window.ask("free")}>Add another</B.Button>
</div>`;

describe("a press that waits by itself", () => {
  for (const [id, label] of [["button", "Button"], ["icon", "IconButton"], ["text", "TextButton"]]) {
    test(`${label}: five presses while the answer is slow call the handler once; the next press after the answer calls it again`, async () => {
      const { page, errors } = await open(BUTTONS, { clock: true });
      const control = page.getByTestId(id);
      for (let i = 0; i < 5; i += 1) await control.click({ force: true });
      assert.equal(await calls(page, id), 1, "one call for five presses");
      await control.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      assert.equal(await calls(page, id), 1, "Enter and Space are presses too, and are ignored");
      assert.equal(await attr(control, "aria-busy"), "true");
      assert.equal(await attr(control, "aria-disabled"), "true", "a screen reader hears it cannot be pressed");
      await page.evaluate((id) => window.answer(id), id);
      await commit(page);
      for (let at = 0; at < 1000 && await attr(control, "aria-busy"); at += 100) await run(page, 100);
      assert.equal(await attr(control, "aria-busy"), null, "busy ends with the answer (and the mark's minimum) within a second");
      await control.click({ force: true });
      assert.equal(await calls(page, id), 2);
      assert.deepEqual(errors, []);
    });
  }

  test("waitForAnswer={false} calls the handler on every press", async () => {
    const { page } = await open(BUTTONS, { clock: true });
    for (let i = 0; i < 5; i += 1) await page.getByTestId("free").click({ force: true });
    assert.equal(await calls(page, "free"), 5);
    assert.equal(await attr(page.getByTestId("free"), "aria-busy"), null);
  });

  test("the mark shows only after 300ms, then stays at least 400ms; an answer inside 300ms shows nothing", async () => {
    const { page } = await open(BUTTONS, { clock: true });
    for (const id of ["button", "icon", "text"]) {
      const control = page.getByTestId(id);
      const mark = () => control.evaluate((el) => el.hasAttribute("data-loading"));
      await control.click({ force: true });
      await run(page, 299);
      assert.equal(await mark(), false, `${id}: no mark at 299ms`);
      assert.equal(await attr(control, "aria-busy"), "true", `${id}: busy from the press`);
      if (id !== "text") assert.equal(await page.locator(`[data-testid=${id}] .basalt-spinner`).count(), 0, `${id}: no ring before the delay`);
      await run(page, 2);
      assert.equal(await mark(), true, `${id}: the mark at 301ms`);
      if (id !== "text") assert.equal(await page.locator(`[data-testid=${id}] .basalt-spinner`).count(), 1, `${id}: the ring after the delay`);
      // The answer at 350ms: the mark has been up 50ms and stays until 400ms have passed since it showed.
      await run(page, 49);
      await page.evaluate((id) => window.answer(id), id);
      await commit(page);
      assert.equal(await attr(control, "aria-busy"), null, `${id}: busy ends with the answer, though the mark keeps its 400ms`);
      assert.equal(await attr(control, "aria-disabled"), null, `${id}: and it can be pressed`);
      await run(page, 340);
      assert.equal(await mark(), true, `${id}: still up 390ms after it showed`);
      await run(page, 20);
      assert.equal(await mark(), false, `${id}: gone once it has shown 400ms`);
      assert.equal(await attr(control, "aria-busy"), null);
      // A quick answer: nothing is drawn at all.
      await control.click({ force: true });
      await run(page, 120);
      await page.evaluate((id) => window.answer(id), id);
      await commit(page);
      await run(page, 0);
      await run(page, 600);
      assert.equal(await mark(), false, `${id}: an answer at 120ms never shows the mark`);
      assert.equal(await attr(control, "aria-busy"), null);
    }
  });

  test("focus stays on the control through the wait, and its box and label do not move (0px)", async () => {
    const { page } = await open(BUTTONS, { clock: true });
    for (const id of ["button", "icon", "text"]) {
      const control = page.getByTestId(id);
      await control.focus();
      const rest = await box(control);
      const name = await control.evaluate((el) => el.textContent + (el.getAttribute("aria-label") ?? ""));
      await page.keyboard.press("Enter");
      for (const at of [100, 250, 400]) {
        await run(page, at === 100 ? 100 : 150);
        assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), id, `${id}: focused at ${at}ms`);
        assert.deepEqual(await box(control), rest, `${id}: the same box at ${at}ms`);
        assert.equal(await control.evaluate((el) => el.textContent + (el.getAttribute("aria-label") ?? "")), name, `${id}: the same name`);
      }
      await page.evaluate((id) => window.answer(id), id);
      await commit(page);
      await run(page, 1000);
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), id, `${id}: focused after the answer`);
      assert.deepEqual(await box(control), rest);
      assert.equal(await control.evaluate((el) => el.disabled), false, `${id}: the control's own disabled is untouched`);
    }
  });

  test("a rejected promise ends the wait and is still reported as unhandled, for the app to say why", async () => {
    const { page } = await open(BUTTONS, { clock: true });
    const control = page.getByTestId("button");
    await control.click({ force: true });
    await run(page, 500);
    assert.equal(await control.evaluate((el) => el.hasAttribute("data-loading")), true);
    await page.evaluate(() => window.refuse("button"));
    await commit(page);
    await run(page, 500);
    assert.equal(await attr(control, "aria-busy"), null, "busy ends on a rejection");
    assert.equal(await control.evaluate((el) => el.hasAttribute("data-loading")), false);
    assert.deepEqual(await page.evaluate(() => window.unhandled), ["Synthetic refusal"], "Basalt does not swallow it");
    await control.click({ force: true });
    assert.equal(await calls(page, "button"), 2, "the next press asks again");
  });

  test("an explicit loading wins: the ring at once, with no delay, whatever the press is waiting for", async () => {
    const { page } = await open(`(() => { function App() { const [loading, setLoading] = React.useState(false); window.setLoading = setLoading; return <div>
      <B.Button data-testid="b" loading={loading} onClick={window.ask("b")}>Publish</B.Button>
      <B.TextButton data-testid="t" loading={loading}>Write it again</B.TextButton></div>; } return <App />; })()`, { clock: true });
    await page.evaluate(() => window.setLoading(true));
    await commit(page);
    // React commits on its own task: 10ms is a frame, well inside the 300ms the wait would have taken.
    await run(page, 10);
    for (const id of ["b", "t"]) {
      assert.equal(await page.getByTestId(id).evaluate((el) => el.hasAttribute("data-loading")), true, `${id}: shown at once`);
      assert.equal(await attr(page.getByTestId(id), "aria-busy"), "true");
    }
    await page.getByTestId("b").click({ force: true });
    assert.equal(await calls(page, "b"), 0, "a loading button is not pressed");
    await page.evaluate(() => window.setLoading(false));
    await commit(page);
    // Gone within a few frames, nowhere near the 400ms a shown wait holds for.
    for (let at = 0; at < 5 && await page.getByTestId("b").evaluate((el) => el.hasAttribute("data-loading")); at += 1) await run(page, 10);
    assert.equal(await page.getByTestId("b").evaluate((el) => el.hasAttribute("data-loading")), false, "and gone at once, as before");
  });

  test("a submit waits for its Form: Enter and the buttons inside and outside (form=…) submit once, and both buttons are busy", async () => {
    const { page } = await open(`<div>
      <B.Form id="publish" onFormSubmit={window.ask("submit")}>
        <B.Field name="title" label="Title"><B.Input data-testid="field" defaultValue="Checkout timing out" /></B.Field>
        <B.Button data-testid="inside" type="submit">Publish</B.Button>
      </B.Form>
      <B.Button data-testid="outside" type="submit" form="publish" variant="primary">Publish update</B.Button>
    </div>`, { clock: true });
    await page.getByTestId("inside").click({ force: true });
    await page.getByTestId("outside").click({ force: true });
    await page.getByTestId("inside").click({ force: true });
    await page.getByTestId("field").focus();
    await page.keyboard.press("Enter");
    assert.equal(await calls(page, "submit"), 1, "one submit for four");
    await run(page, 10);
    for (const id of ["inside", "outside"]) assert.equal(await attr(page.getByTestId(id), "aria-busy"), "true", `${id} is busy`);
    await run(page, 291);
    for (const id of ["inside", "outside"]) assert.equal(await page.locator(`[data-testid=${id}] .basalt-spinner`).count(), 1, `${id} shows the ring after 300ms`);
    await page.evaluate(() => window.answer("submit"));
    await commit(page);
    await run(page, 1000);
    for (const id of ["inside", "outside"]) assert.equal(await attr(page.getByTestId(id), "aria-busy"), null);
    await page.getByTestId("outside").click({ force: true });
    assert.equal(await calls(page, "submit"), 2);
  });

  test("a menu item that waits: the menu closes, its trigger is busy, and the menu does not open again until the answer", async () => {
    const { page } = await open(`<B.Menu><B.MenuTrigger render={<B.Button data-testid="trigger">Send to</B.Button>} /><B.MenuContent>
      <B.MenuItem data-testid="item" onClick={window.ask("item")}>Copy the summary</B.MenuItem><B.MenuItem>Copy a link</B.MenuItem></B.MenuContent></B.Menu>`);
    const trigger = page.getByTestId("trigger");
    await trigger.click({ force: true });
    await page.getByTestId("item").click({ force: true });
    await settle(page);
    assert.equal(await page.getByTestId("item").count(), 0, "the menu closed");
    assert.equal(await attr(trigger, "aria-busy"), "true");
    await trigger.click({ force: true });
    await page.waitForTimeout(150);
    assert.equal(await page.getByTestId("item").count(), 0, "it does not open while the answer is still to come");
    await page.waitForFunction(() => document.querySelector("[data-testid=trigger]")?.hasAttribute("data-loading"));
    assert.equal(await calls(page, "item"), 1);
    await page.evaluate(() => window.answer("item"));
    await commit(page);
    await page.waitForFunction(() => document.querySelector("[data-testid=trigger]")?.getAttribute("aria-busy") === null);
    await trigger.click({ force: true });
    await page.getByTestId("item").waitFor();
    await page.getByTestId("item").click({ force: true });
    assert.equal(await calls(page, "item"), 2);
  });
  test("a Retry pressed while the mark finishes its 400ms goes through, and the mark stays up for the new wait", async () => {
    const { page } = await open(BUTTONS, { clock: true });
    for (const id of ["button", "icon", "text"]) {
      const control = page.getByTestId(id);
      await control.click({ force: true });
      await run(page, 350);
      await page.evaluate((id) => window.refuse(id), id);
      await commit(page);
      await run(page, 50);
      assert.equal(await control.evaluate((el) => el.hasAttribute("data-loading")), true, `${id}: the mark is in its tail`);
      await control.click({ force: true });
      assert.equal(await calls(page, id), 2, `${id}: the retry asked again`);
      await commit(page);
      assert.equal(await attr(control, "aria-busy"), "true", `${id}: busy again`);
      await run(page, 1000);
      assert.equal(await control.evaluate((el) => el.hasAttribute("data-loading")), true, `${id}: the mark stays up for the retry`);
      await page.evaluate((id) => window.answer(id), id);
      await commit(page);
      await run(page, 500);
      assert.equal(await attr(control, "aria-busy"), null);
    }
    assert.equal((await page.evaluate(() => window.unhandled)).length, 3, "each refusal was passed on");
  });

  test("a handler on the rendered element (render={<button onClick>}) is guarded too: one call for five presses, and none while loading", async () => {
    const { page } = await open(`<div>
      <B.Button data-testid="r" render={<button onClick={window.ask("r")} />}>Save</B.Button>
      <B.TextButton data-testid="rt" render={<button onClick={window.ask("rt")} />}>Write it again</B.TextButton>
      <B.Button data-testid="rl" loading render={<button onClick={window.ask("rl")} />}>Publish</B.Button>
    </div>`);
    for (const id of ["r", "rt"]) {
      for (let i = 0; i < 5; i += 1) await page.getByTestId(id).click({ force: true });
      assert.equal(await calls(page, id), 1, `${id}: one call`);
      assert.equal(await attr(page.getByTestId(id), "aria-busy"), "true");
    }
    await page.getByTestId("rl").click({ force: true });
    assert.equal(await calls(page, "rl"), 0, "explicit loading refuses the rendered element's handler");
  });

  test("a Form whose onSubmit returns a promise cancels the native submit; a synchronous onSubmit that does not prevent it still submits", async () => {
    const { page } = await open(`<div>
      <B.Form data-testid="async" onSubmit={window.ask("async")}><B.Button data-testid="async-go" type="submit">Send</B.Button></B.Form>
      <B.Form data-testid="sync" onSubmit={() => { window.calls.sync = (window.calls.sync ?? 0) + 1; }}><B.Button data-testid="sync-go" type="submit">Send</B.Button></B.Form>
    </div>`);
    // What the page would do: read after React's handlers (a listener on the window runs last), then stop the navigation so the test page stays.
    await page.evaluate(() => { window.native = []; window.addEventListener("submit", (event) => { window.native.push([event.target.dataset.testid, event.defaultPrevented]); event.preventDefault(); }); });
    await page.getByTestId("async-go").click({ force: true });
    await page.getByTestId("sync-go").click({ force: true });
    assert.deepEqual(await page.evaluate(() => window.native), [["async", true], ["sync", false]], "the promise's submit is cancelled; the plain one goes ahead");
    assert.equal(await calls(page, "async"), 1);
    assert.equal(await calls(page, "sync"), 1);
  });

  test("a submit button outside a keyed Form that is replaced mid-wait is freed, and submits the new form", async () => {
    const { page } = await open(`(() => { function App() { const [key, setKey] = React.useState(0); window.replace = () => setKey((k) => k + 1); return <div>
      <B.Form key={key} id="edit" onFormSubmit={window.ask("edit")}><B.Field name="title" label="Title"><B.Input defaultValue="Checkout timing out" /></B.Field></B.Form>
      <B.Button data-testid="ext" type="submit" form="edit" variant="primary">Save</B.Button></div>; } return <App />; })()`);
    const ext = page.getByTestId("ext");
    await ext.click({ force: true });
    await page.waitForFunction(() => document.querySelector("[data-testid=ext]").getAttribute("aria-busy") === "true");
    await page.evaluate(() => window.replace());
    await page.waitForFunction(() => document.querySelector("[data-testid=ext]").getAttribute("aria-busy") === null);
    await ext.click({ force: true });
    assert.equal(await calls(page, "edit"), 2, "the new form submits");
    await page.waitForFunction(() => document.querySelector("[data-testid=ext]").getAttribute("aria-busy") === "true");
  });

  test("the default MenuTrigger is unavailable (aria-disabled, focus kept) while an item waits, and a keyboard reopen is refused", async () => {
    const { page } = await open(`<B.Menu><B.MenuTrigger data-testid="trigger">Send to</B.MenuTrigger><B.MenuContent>
      <B.MenuItem data-testid="item" onClick={window.ask("item")}>Copy the summary</B.MenuItem></B.MenuContent></B.Menu>`);
    const trigger = page.getByTestId("trigger");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.getByTestId("item").waitFor();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !document.querySelector("[data-testid=item]"));
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), "trigger", "focus is back on the trigger");
    assert.equal(await attr(trigger, "aria-disabled"), "true");
    assert.equal(await attr(trigger, "aria-busy"), "true");
    for (const key of ["Enter", "Space", "ArrowDown"]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      assert.equal(await page.getByTestId("item").count(), 0, `${key} does not reopen it`);
    }
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), "trigger", "focus stays");
    assert.equal(await calls(page, "item"), 1);
    await page.evaluate(() => window.answer("item"));
    await page.waitForFunction(() => document.querySelector("[data-testid=trigger]").getAttribute("aria-disabled") === null);
    await page.keyboard.press("Enter");
    await page.getByTestId("item").waitFor();
  });

  test("a caller's own aria-busy and aria-disabled are kept while Basalt asserts nothing", async () => {
    const { page } = await open(`<div>
      <B.TextButton data-testid="t" aria-disabled="true" aria-busy="true">Write it again</B.TextButton>
      <B.Input data-testid="i" aria-label="Title" aria-busy="true" />
      <B.Textarea data-testid="a" aria-label="Summary" aria-busy="true" />
    </div>`);
    assert.equal(await attr(page.getByTestId("t"), "aria-disabled"), "true");
    for (const id of ["t", "i", "a"]) assert.equal(await attr(page.getByTestId(id), "aria-busy"), "true", id);
  });
});

describe("TextButton's busy look", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: the words step down an ink, the underline turns dashed and breathes, and nothing moves (0px)`, async () => {
      const { page } = await open(BUTTONS, { theme });
      for (const [id, from, to] of [["text", "--basalt-text-primary", "--basalt-text-secondary"], ["quiet", "--basalt-text-secondary", "--basalt-text-tertiary"]]) {
        const control = page.getByTestId(id);
        const label = page.locator(`[data-testid=${id}] .basalt-text-button-label`);
        const rest = await box(control);
        assert.equal((await css(control, "color")).color, await tokenColor(page, from));
        await page.mouse.move(0, 0);
        await control.evaluate((el) => el.click());
        await page.waitForFunction((id) => document.querySelector(`[data-testid=${id}]`).hasAttribute("data-loading"), id);
        await settle(page);
        const busy = await css(label, "textDecorationStyle", "animationName", "animationDuration", "animationIterationCount");
        assert.equal((await css(control, "color")).color, await tokenColor(page, to), `${id}: one ink down`);
        assert.deepEqual(busy, { textDecorationStyle: "dashed", animationName: "basalt-underline-breathe", animationDuration: "1.2s", animationIterationCount: "infinite" });
        assert.deepEqual(await box(control), rest, `${id}: the same box`);
        assert.equal((await css(control, "cursor")).cursor, "progress");
        await page.evaluate((id) => window.answer(id), id);
        await commit(page);
        await page.waitForFunction((id) => !document.querySelector(`[data-testid=${id}]`).hasAttribute("aria-busy"), id);
        // Busy ends with the answer; the look keeps its 400ms, then goes.
        await page.waitForFunction((id) => !document.querySelector(`[data-testid=${id}]`).hasAttribute("data-loading"), id);
        assert.deepEqual(await box(control), rest);
        assert.equal((await css(label, "textDecorationStyle")).textDecorationStyle, "solid");
      }
    });
  }

  test("held and under reduced motion the underline stands still (dashed and full, in the ink: the same look, cimip-gaps-3 T1); in forced colours it stays dashed", async () => {
    const { page } = await open(`<B.TextButton data-testid="t" loading>Write it again</B.TextButton>`);
    const label = page.locator(".basalt-text-button-label");
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    assert.deepEqual(await css(label, "animationName", "textDecorationStyle"), { animationName: "none", textDecorationStyle: "dashed" });
    await page.evaluate(() => document.documentElement.removeAttribute("data-loops"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.deepEqual(await css(label, "animationName", "textDecorationStyle"), { animationName: "none", textDecorationStyle: "dashed" });
    assert.equal(await label.evaluate((el) => el.getAnimations().length), 0, "nothing runs under reduced motion");
    await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
    assert.equal((await css(label, "textDecorationStyle")).textDecorationStyle, "dashed");
  });
});

const FIELDS = `(() => { function App() {
  const [writing, setWriting] = React.useState(false);
  const [text, setText] = React.useState("");
  const [title, setTitle] = React.useState("");
  window.setWriting = setWriting; window.setText = setText; window.setTitle = setTitle;
  return <div style={{ display: "grid", gap: 16, width: 520 }}>
    <B.Field label="Summary"><B.Textarea data-testid="area" rows={4} placeholder="The scribe writes the summary here." writing={writing} value={text} onChange={(e) => setText(e.target.value)} /></B.Field>
    <B.Field label="Title"><B.Input data-testid="input" placeholder="A short title" writing={writing} value={title} onChange={(e) => setTitle(e.target.value)} /></B.Field>
    <B.Field label="Disabled"><B.Input data-testid="off" disabled defaultValue="Off" /></B.Field>
  </div>; } return <App />; })()`;
const DRAFT = "Checkout is timing out for about one in twenty customers since the 14:05 deploy. Payments API latency is up and the error rate is elevated.";

describe("a field being written into", () => {
  test("read-only and aria-busy at once; the look after 300ms and for at least 400ms; the box unchanged when it starts and ends (0px)", async () => {
    const { page } = await open(FIELDS, { clock: true });
    for (const id of ["area", "input"]) {
      const field = page.getByTestId(id);
      const rest = await box(field);
      await page.evaluate(() => window.setWriting(true));
      await commit(page);
      await run(page, 10);
      assert.equal(await field.evaluate((el) => el.readOnly), true, `${id}: read-only at once`);
      assert.equal(await attr(field, "aria-busy"), "true");
      assert.equal(await field.evaluate((el) => el.disabled), false, `${id}: not disabled`);
      await run(page, 289);
      assert.equal(await attr(field, "data-writing"), null, `${id}: no look at 299ms`);
      await run(page, 2);
      assert.equal(await attr(field, "data-writing"), "", `${id}: the look at 301ms`);
      assert.deepEqual(await box(field), rest, `${id}: the same box while written`);
      await run(page, 100);
      await page.evaluate(() => window.setWriting(false));
      await commit(page);
      await run(page, 290);
      assert.equal(await attr(field, "data-writing"), "", `${id}: the look holds its 400ms`);
      assert.equal(await field.evaluate((el) => el.readOnly), false, `${id}: but read-only ends with the writing`);
      assert.equal(await attr(field, "aria-busy"), null, `${id}: and so does aria-busy`);
      await run(page, 20);
      assert.equal(await attr(field, "data-writing"), null);
      assert.equal(await field.evaluate((el) => el.readOnly), false);
      assert.equal(await attr(field, "aria-busy"), null);
      assert.deepEqual(await box(field), rest, `${id}: the same box after`);
    }
  });

  for (const theme of ["dark", "light"]) {
    test(`${theme}: dimmed words on a skeleton's pulsing fill, not the disabled look; empty shows the pulse alone`, async () => {
      const { page } = await open(FIELDS, { theme });
      await page.evaluate(() => window.setWriting(true));
      await commit(page);
      await page.waitForFunction(() => document.querySelector("[data-testid=area]").hasAttribute("data-writing"));
      await settle(page);
      const area = page.getByTestId("area");
      const look = await css(area, "color", "animationName", "animationDuration", "cursor", "boxShadow");
      assert.equal(look.color, await tokenColor(page, "--basalt-text-secondary"));
      assert.equal(look.animationName, "basalt-writing");
      assert.equal(look.animationDuration, "2s", "the skeleton's period");
      assert.equal(look.cursor, "progress");
      const off = await css(page.getByTestId("off"), "color", "boxShadow");
      assert.notEqual(look.color, off.color, "not the disabled ink");
      const edge = await css(area, "outlineStyle", "outlineWidth", "outlineOffset", "outlineColor");
      assert.deepEqual([edge.outlineStyle, edge.outlineWidth, edge.outlineOffset], ["dashed", "1px", "-1px"], "the boundary is dashed, drawn over itself, so nothing moves");
      assert.equal(edge.outlineColor, await tokenColor(page, "--basalt-border-field"), "in the field boundary's colour");
      assert.equal(look.boxShadow, "none");
      assert.notEqual(off.boxShadow, "none", "a disabled field keeps its solid boundary");
      assert.equal(await area.evaluate((el) => getComputedStyle(el, "::placeholder").color), "rgba(0, 0, 0, 0)", "empty: the pulse alone");
      // The fill at the pulse's two ends is a skeleton's: surface-placeholder, and 70% of it over the field's own fill.
      await area.evaluate((el) => { for (const a of el.getAnimations()) { a.pause(); a.currentTime = 0; } });
      const from = (await css(area, "backgroundColor")).backgroundColor;
      assert.equal(neutral(from), neutral(await page.evaluate(() => { const p = document.createElement("p"); p.style.background = "var(--basalt-surface-placeholder)"; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; })));
      assert.deepEqual(await axe(page), []);
    });
  }

  test("text replaces text: every update is painted at once in the same ink, never blank, and an empty value while writing keeps the text", async () => {
    const { page } = await open(FIELDS);
    await page.evaluate((draft) => window.setText(draft), DRAFT);
    await page.evaluate(() => window.setWriting(true));
    await commit(page);
    await page.waitForFunction(() => document.querySelector("[data-testid=area]").hasAttribute("data-writing"));
    const area = page.getByTestId("area");
    const clip = await area.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + 12), y: Math.round(r.y + 10), width: Math.round(r.width - 24), height: 20 }; });
    // The rewrite clears the field and streams the new draft in, word by word.
    await page.evaluate(() => window.setText(""));
    const words = "Payments API latency rose after the worker change. We rolled it back at 14:22 and the error rate is falling.".split(" ");
    const seen = [];
    for (let i = 1; i <= words.length; i += 1) {
      const text = words.slice(0, i).join(" ");
      // Each update is committed and painted; what is on screen is measured in the frame after it, in the text's first line.
      const sample = await page.evaluate(async ({ text, clip }) => {
        window.setText(text);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const el = document.querySelector("[data-testid=area]");
        return { value: el.value, color: getComputedStyle(el).color, transitions: el.getAnimations().filter((a) => a.transitionProperty === "color").length, clip };
      }, { text, clip });
      const shot = await page.screenshot({ clip, type: "png" });
      seen.push({ ...sample, bytes: shot.length });
    }
    const ink = await tokenColor(page, "--basalt-text-secondary");
    assert.ok(seen.every((s) => s.color === ink), "the same ink at every update");
    assert.ok(seen.every((s) => s.transitions === 0), "no colour transition runs on an update");
    assert.ok(seen.every((s, i) => s.value === words.slice(0, i + 1).join(" ")), "each update is shown as it comes");
    // The text's paint: a line with words in it compresses to more than an empty line of the same fill does.
    const blank = (await page.evaluate(async () => { const el = document.querySelector("[data-testid=area]"); const r = el.getBoundingClientRect(); const p = document.createElement("div"); p.style.cssText = `position:fixed;left:${r.x}px;top:${r.y + r.height + 40}px;width:${r.width}px;height:40px;background:var(--basalt-surface-placeholder)`; p.id = "blank"; document.body.append(p); return { x: Math.round(r.x + 12), y: Math.round(r.y + r.height + 50), width: Math.round(r.width - 24), height: 20 }; }));
    const empty = (await page.screenshot({ clip: blank, type: "png" })).length;
    assert.ok(seen.every((s) => s.bytes > empty * 1.5), `text painted at every update (${seen.map((s) => s.bytes).join(", ")} against ${empty} blank)`);
    // Between drafts the app may empty the value: the field keeps the text it shows until the next text arrives.
    await page.evaluate(() => window.setText(""));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await area.inputValue(), words.join(" "), "never blanked while it is written");
    await page.evaluate(() => window.setWriting(false));
    await commit(page);
    await page.waitForFunction(() => !document.querySelector("[data-testid=area]").hasAttribute("aria-busy"));
    assert.equal(await area.inputValue(), "", "once written, the value is the app's again");
  });

  for (const id of ["input", "area"]) {
    test(`${id}: focused with a selection inside the old text, a draft replaces it; editing resumes at the end of the new text, and a key typed in the look's tail is typed`, async () => {
      const { page } = await open(FIELDS, { clock: true });
      const field = page.getByTestId(id);
      const setter = id === "input" ? "setTitle" : "setText";
      await page.evaluate(({ setter, draft }) => window[setter](draft), { setter, draft: DRAFT });
      await commit(page);
      await field.focus();
      await field.evaluate((el) => el.setSelectionRange(9, 15));
      await page.evaluate(() => window.setWriting(true));
      await run(page, 301);
      assert.equal(await attr(field, "data-writing"), "", "written");
      await page.keyboard.type("x");
      assert.equal(await field.inputValue(), DRAFT, "a key typed while it is written is not typed");
      const words = "Payments API latency rose after the worker change.".split(" ");
      for (let i = 1; i <= words.length; i += 1) {
        await page.evaluate(({ setter, text }) => window[setter](text), { setter, text: words.slice(0, i).join(" ") });
        await run(page, 10);
      }
      await page.evaluate(() => window.setWriting(false));
      await run(page, 10);
      assert.equal(await field.evaluate((el) => el.readOnly), false, "editable once the writing ends");
      assert.equal(await attr(field, "data-writing"), "", "the look is still in its 400ms");
      const text = words.join(" ");
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), id, "focus stayed");
      assert.deepEqual(await field.evaluate((el) => [el.selectionStart, el.selectionEnd]), [text.length, text.length], "the caret is at the end of the new text");
      await page.keyboard.type("!");
      assert.equal(await field.inputValue(), `${text}!`, "the key is typed where the caret is, in the look's tail");
    });
  }

  test("reduced motion and the hold still the pulse (as a skeleton's); forced colours draws a dashed boundary, never GrayText", async () => {
    const { page } = await open(FIELDS);
    await page.evaluate((draft) => { window.setText(draft); window.setWriting(true); }, DRAFT);
    await page.waitForFunction(() => document.querySelector("[data-testid=area]").hasAttribute("data-writing"));
    const area = page.getByTestId("area");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal((await css(area, "animationName")).animationName, "none");
    assert.equal((await css(area, "color")).color, await tokenColor(page, "--basalt-text-secondary"), "still dimmed");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    assert.equal((await css(area, "animationName")).animationName, "none");
    await page.evaluate(() => document.documentElement.removeAttribute("data-loops"));
    await page.emulateMedia({ forcedColors: "active" });
    const forced = await css(area, "borderTopStyle", "color");
    assert.equal(forced.borderTopStyle, "dashed");
    assert.notEqual(forced.color, await page.evaluate(() => { const p = document.createElement("p"); p.style.color = "GrayText"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }));
  });
});

describe("axe, with every busy state on screen", () => {
  for (const theme of ["dark", "light"]) {
    test(theme, async () => {
      const { page } = await open(`<div>${BUTTONS}<B.Field label="Summary"><B.Textarea writing value="${DRAFT}" onChange={() => {}} /></B.Field></div>`, { theme });
      for (const id of ["button", "icon", "text", "quiet"]) await page.getByTestId(id).evaluate((el) => el.click());
      await page.waitForFunction(() => document.querySelectorAll("[data-loading]").length === 4 && document.querySelector("[data-writing]"));
      assert.deepEqual(await axe(page), []);
    });
  }
});
