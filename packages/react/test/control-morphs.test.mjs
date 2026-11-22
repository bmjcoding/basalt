// Basalt's controls draw their core glyphs through the morph (engineering that restores DECISIONS 38 and 55; the implementation has not been reviewed).
// `Button` and `IconButton` (`icon`, a pressed toggle, `done`), `NavItem`, `TabBarItem`, `CodeBlock`'s copy and `Terminal`'s compact copy: a change of
// glyph or of `selected` runs through the one engine (glyph-motion.ts), whose allow-list decides; every other change swaps at once; a long-tail glyph
// swaps; and at rest a control's markup is `Icon`'s, byte for byte. The engine loads on demand. Frames are read on Playwright's virtual clock.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { fixturePage, launch, pkg } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const PRELUDE = `
import { ControlIcon, loadFlight } from "./dist/control-icon.js";
import { Morphing } from "./dist/glyph-flight.js";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
const P = { CheckCircleIcon, WarningIcon };
const pick = (x) => (typeof x === "string" ? B[x] ?? P[x] : x);
const resolve = (props) => ({ ...props, icon: pick(props.icon), doneIcon: pick(props.doneIcon) });
const kindOf = (kind) => (kind === "ControlIcon" ? ControlIcon : kind === "Morphing" ? Morphing : B[kind]);
const root = createRoot(document.getElementById("root"));
window.B = B;
window.loadFlight = loadFlight;
window.sync = (fn) => flushSync(fn);
window.mount = (kind, props, children) => flushSync(() => root.render(React.createElement(kindOf(kind), resolve(props), children)));
window.ssr = (kind, props, children) => renderToStaticMarkup(React.createElement(kindOf(kind), resolve(props), children));
// What IconButton drew for \`done\` before the morphs: two glyphs in one cell.
window.legacySeat = (props) => renderToStaticMarkup(React.createElement("span", { className: "basalt-button-swap", "aria-hidden": "true" }, React.createElement(B.Icon, { icon: pick(props.icon), size: props.size, selected: props.selected }), React.createElement(B.Icon, { icon: pick(props.doneIcon), size: props.size })));
window.seatOf = (html) => /<span class="basalt-button-swap".*?<\\/span>/s.exec(html)[0];
// The opacity of every glyph of a seat, with its running transitions held at ms: what a crossfade looks like part-way, without a clock.
window.opacityAt = (selector, ms) => {
  for (const a of document.getAnimations()) if (a.transitionProperty === "opacity") { a.pause(); a.currentTime = ms; }
  return [...document.querySelectorAll(selector)].map((el) => Number(getComputedStyle(el).opacity));
};
window.norm = (html) => { const t = document.createElement("template"); t.innerHTML = html; return t.innerHTML.replace(/basalt-glyph-[\\w-]+/g, "x"); };
// React's own scheduler runs on a MessageChannel, which the virtual clock leaves alone: a state set when the engine arrives has been drawn after this. The last line puts the page's style in
// step with what is drawn, as a real frame would, so that the next change starts its transitions from it.
window.idle = async () => { for (let i = 0; i < 4; i++) await new Promise((resolve) => { const c = new MessageChannel(); c.port1.onmessage = () => resolve(); c.port2.postMessage(0); }); document.body.getBoundingClientRect(); };
`;

const open = (body = "", options = {}) => fixturePage(browser, `${PRELUDE}\n${body}`, { clock: true, ...options });
const html = (page, selector) => page.locator(selector).first().evaluate((el) => window.norm(el.innerHTML));
const outer = (page, selector) => page.locator(selector).first().evaluate((el) => window.norm(el.outerHTML));
const idle = (page) => page.evaluate(() => window.idle());
const run = async (page, ms) => { await page.clock.runFor(ms); };
/** The seat's drawing at the given times after now, on the virtual clock. */
async function frames(page, selector, times = [0, 60, 100, 200]) {
  const out = [];
  let at = 0;
  for (const t of times) {
    await run(page, t - at);
    at = t;
    out.push(await html(page, selector));
  }
  return out;
}
const ssr = (page, kind, props, children) => page.evaluate(([k, p, c]) => window.norm(window.ssr(k, p, c)), [kind, props, children]);
const mount = (page, kind, props, children) => page.evaluate(([k, p, c]) => window.mount(k, p, c), [kind, props, children]);

/** Frames 60 and 100 are between the endpoints: neither the start nor the end, and not each other. */
function assertBetween(got, from, to, what) {
  assert.equal(got[0], from, `${what}: frame 0 is where it began`);
  assert.notEqual(got[1], from, `${what}: 60ms is not the start`);
  assert.notEqual(got[1], to, `${what}: 60ms is not the end`);
  assert.notEqual(got[2], to, `${what}: 100ms is not the end`);
  assert.notEqual(got[1], got[2], `${what}: 60ms and 100ms differ`);
}

describe("at rest, a control's glyph is Icon's markup, byte for byte", () => {
  test("ControlIcon is Icon for a core glyph, a selected one, a long-tail one and every size, and the done seat is the one it was", async () => {
    const { page, errors } = await open();
    for (const props of [
      { icon: "HomeGlyph" }, { icon: "HomeGlyph", selected: true }, { icon: "PauseGlyph", selected: true }, { icon: "CopyGlyph", size: 20 },
      { icon: "SearchGlyph", size: 24, selected: true, fillSafe: true }, { icon: "CheckCircleIcon" }, { icon: "CheckCircleIcon", selected: true, fillSafe: true }, { icon: "WarningIcon", size: 24 },
    ]) {
      assert.equal(await ssr(page, "ControlIcon", props), await ssr(page, "Icon", props), JSON.stringify(props));
    }
    for (const [props, size] of [[{ icon: "CopyGlyph", label: "x", done: false }, 16], [{ icon: "HomeGlyph", label: "x", done: true, pressed: true, size: "xl" }, 20], [{ icon: "PlusGlyph", label: "x", done: false }, 16], [{ icon: "WarningIcon", label: "x", done: false }, 16]]) {
      const markup = await page.evaluate(([p]) => window.norm(window.seatOf(window.ssr("IconButton", p))), [props]);
      const legacy = await page.evaluate(([p, z]) => window.norm(window.legacySeat({ icon: p.icon, doneIcon: "CheckGlyph", size: z, selected: p.pressed })), [props, size]);
      assert.equal(markup, legacy, `the done seat of ${props.icon}`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a control that is armed (the engine loaded) draws the same markup until it changes", async () => {
    const { page } = await open();
    await mount(page, "Button", { icon: "HomeGlyph", pressed: false }, "Home");
    const before = await html(page, ".basalt-button");
    await idle(page);
    assert.equal(await html(page, ".basalt-button"), before, "arming changed nothing the eye or the DOM can see");
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "HomeGlyph", size: 16 }));
    await page.close();
  });
});

describe("a pressed toggle morphs a core glyph with an opening", () => {
  for (const kind of ["Button", "IconButton"]) {
    test(`${kind}: rest to selected and back, at slow on ease-out, and settled on Icon's own markup`, async () => {
      const { page, errors } = await open();
      const props = (pressed) => (kind === "Button" ? { icon: "HomeGlyph", pressed } : { icon: "HomeGlyph", pressed, label: "Home" });
      const child = kind === "Button" ? "Home" : undefined;
      await mount(page, kind, props(false), child);
      await idle(page);
      const rest = await outer(page, ".basalt-button svg");
      const restHtml = await html(page, ".basalt-button svg");
      const selectedSvg = await ssr(page, "Icon", { icon: "HomeGlyph", selected: true });
      await mount(page, kind, props(true), child);
      const got = await frames(page, ".basalt-button svg");
      const selectedHtml = await page.evaluate(() => window.norm(window.ssr("Icon", { icon: "HomeGlyph", selected: true }).replace(/^<svg[^>]*>|<\/svg>$/g, "")));
      assertBetween(got, restHtml, selectedHtml, `${kind} pressed`);
      assert.equal(await page.locator(".basalt-button svg").first().getAttribute("class"), "basalt-icon", "a frame has the glyph's own class and seat");
      assert.equal(await page.locator(".basalt-button svg").first().getAttribute("aria-hidden"), "true");
      await run(page, 200);
      assert.equal(await outer(page, ".basalt-button svg"), selectedSvg, "settled, it is Icon's selected markup");
      // and back
      await mount(page, kind, props(false), child);
      const back = await frames(page, ".basalt-button svg");
      assertBetween(back, selectedHtml, restHtml, `${kind} unpressed`);
      await run(page, 200);
      assert.equal(await outer(page, ".basalt-button svg"), rest);
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("an action glyph keeps its drawing when selected: the pressed pause shows no morph, and its plate and ink step are the state", async () => {
    const { page } = await open();
    await mount(page, "IconButton", { icon: "PauseGlyph", pressed: false, label: "Pause animations" });
    await idle(page);
    const rest = await outer(page, ".basalt-button svg");
    await mount(page, "IconButton", { icon: "PauseGlyph", pressed: true, label: "Pause animations" });
    for (const t of [0, 60, 100, 200]) {
      await run(page, t === 0 ? 0 : 20);
      assert.equal(await outer(page, ".basalt-button svg"), rest, `at ${t}: the same drawing`);
    }
    assert.equal(await page.locator(".basalt-button").getAttribute("aria-pressed"), "true");
    await page.close();
  });

  test("a long-tail glyph swaps: a pressed Phosphor toggle and a changed Phosphor icon", async () => {
    const { page } = await open();
    await mount(page, "IconButton", { icon: "CheckCircleIcon", pressed: false, fillSafe: true, label: "Done" });
    await idle(page);
    await mount(page, "IconButton", { icon: "CheckCircleIcon", pressed: true, fillSafe: true, label: "Done" });
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CheckCircleIcon", selected: true, fillSafe: true }), "selected at once");
    await mount(page, "Button", { icon: "CheckCircleIcon" }, "A");
    await mount(page, "Button", { icon: "WarningIcon" }, "A");
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "WarningIcon" }), "a changed icon at once");
    await run(page, 60);
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "WarningIcon" }), "and nothing runs");
    await page.close();
  });

  test("a change the allow-list does not know swaps at once, in a control that has the engine", async () => {
    const { page } = await open();
    await page.evaluate(() => window.loadFlight());
    await mount(page, "Button", { icon: "HomeGlyph" }, "A");
    await idle(page);
    await mount(page, "Button", { icon: "SearchGlyph" }, "A");
    await idle(page);
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "SearchGlyph" }), "Home to Search is a swap");
    await run(page, 60);
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "SearchGlyph" }));
    await page.close();
  });
});

describe("a changed icon", () => {
  test("a drawn pair morphs (Copy to Check in a Button's icon) once the engine has the control, and runs back from where it is", async () => {
    const { page } = await open();
    await page.evaluate(() => window.loadFlight());
    await mount(page, "Button", { icon: "CopyGlyph" }, "Copy");
    await idle(page);
    const copy = await html(page, ".basalt-button svg");
    await mount(page, "Button", { icon: "CheckGlyph" }, "Copy");
    const got = await frames(page, ".basalt-button svg", [0, 60, 100]);
    const check = await page.evaluate(() => window.norm(window.ssr("Icon", { icon: "CheckGlyph" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")));
    assertBetween(got, copy, check, "copy to check");
    // interrupted at 100: asking for where it came from runs it back along the same path: the frame at 100 is where it turns, never a jump
    await mount(page, "Button", { icon: "CopyGlyph" }, "Copy");
    assert.equal(await html(page, ".basalt-button svg"), got[2], "the turn begins on the frame on screen");
    await run(page, 16);
    const turned = await html(page, ".basalt-button svg");
    assert.notEqual(turned, check);
    await run(page, 400);
    assert.equal(await html(page, ".basalt-button svg"), copy, "it settles on Copy");
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CopyGlyph" }));
    await page.close();
  });

  test("the previous drawing is taken once: Copy, Check, a long-tail icon, then Check again starts on Check, not on a replayed Copy", async () => {
    const { page, errors } = await open();
    await page.evaluate(() => window.loadFlight());
    const check = await ssr(page, "Icon", { icon: "CheckGlyph" });
    await mount(page, "Button", { icon: "CopyGlyph" }, "Copy");
    await idle(page);
    await mount(page, "Button", { icon: "CheckGlyph" }, "Copy");
    await run(page, 400);
    assert.equal(await outer(page, ".basalt-button svg"), check, "settled on Check");
    await mount(page, "Button", { icon: "CheckCircleIcon" }, "Copy");
    await mount(page, "Button", { icon: "CheckGlyph" }, "Copy");
    await idle(page);
    for (const t of [0, 16, 60]) {
      await run(page, t === 0 ? 0 : t === 16 ? 16 : 44);
      assert.equal(await outer(page, ".basalt-button svg"), check, `Check at ${t}ms: no frame of Copy`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a change before the engine has loaded swaps, as it did; the next one morphs", async () => {
    const { page, errors } = await open();
    // Mounted and changed in one go, before the dynamic import can have resolved: no frame is drawn, and nothing is broken.
    await page.evaluate(() => {
      window.mount("Button", { icon: "CopyGlyph" }, "Copy");
      window.mount("Button", { icon: "CheckGlyph" }, "Copy");
    });
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CheckGlyph" }), "the first change is the settled glyph, at once");
    await run(page, 60);
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CheckGlyph" }), "and it stays");
    await idle(page);
    await mount(page, "Button", { icon: "CopyGlyph" }, "Copy");
    const got = await frames(page, ".basalt-button svg", [0, 60]);
    assert.notEqual(got[1], got[0], "the second change is a frame, and it is moving");
    assert.notEqual(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CopyGlyph" }), "not the settled glyph yet");
    await run(page, 400);
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CopyGlyph" }));
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("IconButton done", () => {
  test("rest to done morphs for an allowed pair (Copy and Check), in the one seat, and runs back", async () => {
    const { page, errors } = await open();
    const props = (done) => ({ icon: "CopyGlyph", label: "Copy address", done });
    await mount(page, "IconButton", props(false));
    await idle(page);
    const seat = await outer(page, ".basalt-button-swap");
    const box = await page.locator(".basalt-button").boundingBox();
    const copy = await html(page, ".basalt-button-swap > .basalt-icon");
    await mount(page, "IconButton", props(true));
    const got = [];
    for (const t of [0, 60, 100]) {
      await run(page, t === 0 ? 0 : t === 60 ? 60 : 40);
      got.push(await html(page, ".basalt-glyph-frame"));
      assert.equal(await page.locator(".basalt-button-swap > .basalt-glyph-frame").count(), 1, "one frame over the cell while it moves");
      assert.equal(await page.locator(".basalt-button-swap > .basalt-icon").count(), 2, "the seat's own two glyphs stay mounted");
      assert.deepEqual(await page.locator(".basalt-button-swap > .basalt-icon").evaluateAll((els) => els.map((el) => getComputedStyle(el).visibility)), ["hidden", "hidden"], "and out of sight under it");
      assert.deepEqual(await page.locator(".basalt-button").boundingBox(), box, `nothing moved at ${t}`);
    }
    assert.equal(got[0], copy, "it begins as Copy");
    assert.notEqual(got[1], copy);
    assert.notEqual(got[1], got[2]);
    await run(page, 400);
    assert.equal(await page.locator(".basalt-glyph-frame").count(), 0, "settled, the frame is gone");
    assert.equal(await outer(page, ".basalt-button-swap"), await page.evaluate((p) => window.norm(window.legacySeat({ ...p, doneIcon: "CheckGlyph", size: 16 })), props(true)), "settled it is the seat it was, in its done state");
    assert.equal(await page.locator(".basalt-button").getAttribute("data-done"), "");
    assert.equal(await page.locator(".basalt-button").getAttribute("aria-label"), "Copy address", "the name does not change");
    assert.deepEqual(await page.locator(".basalt-button").boundingBox(), box);
    // and back, interrupted
    await mount(page, "IconButton", props(false));
    await run(page, 60);
    const mid = await html(page, ".basalt-glyph-frame");
    await mount(page, "IconButton", props(true));
    assert.equal(await html(page, ".basalt-glyph-frame"), mid, "turning again starts on the frame on screen");
    await run(page, 400);
    await mount(page, "IconButton", props(false));
    await run(page, 400);
    assert.equal(await outer(page, ".basalt-button-swap"), seat);
    assert.deepEqual(errors, []);
    await page.close();
  });

  for (const [name, icon] of [["a core pair the engine does not allow (Plus and Check)", "PlusGlyph"], ["a long-tail icon and the core Check (Warning and Check)", "WarningIcon"]]) {
    test(`${name}: the seat stays mounted and its 100ms crossfade runs, part-way in both directions`, async () => {
      const { page, errors } = await open();
      await page.evaluate(() => window.loadFlight());
      const props = (done) => ({ icon, label: "Add", done });
      await mount(page, "IconButton", props(false));
      await idle(page);
      const box = await page.locator(".basalt-button").boundingBox();
      await page.evaluate(() => { window.__seat = document.querySelector(".basalt-button-swap"); window.__glyphs = [...document.querySelectorAll(".basalt-button-swap > svg")]; });
      for (const done of [true, false]) {
        await mount(page, "IconButton", props(done));
        assert.equal(await page.locator(".basalt-glyph-frame").count(), 0, "the engine draws no frame for it");
        const kept = await page.evaluate(() => document.querySelector(".basalt-button-swap") === window.__seat && [...document.querySelectorAll(".basalt-button-swap > svg")].every((el, i) => el === window.__glyphs[i]) && window.__glyphs.length === 2);
        assert.equal(kept, true, `the seat and both glyphs are the same nodes (done ${done})`);
        const [restOpacity, doneOpacity] = await page.evaluate(() => window.opacityAt(".basalt-button-swap > svg", 50));
        // part-way: neither glyph is at an end of its fade, and the two are one fade (opacities that sum to 1)
        assert.ok(restOpacity > 0.01 && restOpacity < 0.99 && doneOpacity > 0.01 && doneOpacity < 0.99, `part-way, not an instant swap (done ${done}): ${restOpacity}, ${doneOpacity}`);
        assert.ok(Math.abs(restOpacity + doneOpacity - 1) < 0.02, `one crossfade (done ${done}): ${restOpacity} + ${doneOpacity}`);
        assert.deepEqual(await page.locator(".basalt-button").boundingBox(), box);
        await page.evaluate(() => window.opacityAt(".basalt-button-swap > svg", 400));
      }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  for (const icon of ["CopyGlyph", "PlusGlyph", "WarningIcon"]) {
    test(`under reduced motion the seat keeps its 100ms crossfade for ${icon} and Check, and draws no frame`, async () => {
      const { page } = await open();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => window.loadFlight());
      const props = (done) => ({ icon, label: "x", done });
      await mount(page, "IconButton", props(false));
      await idle(page);
      await mount(page, "IconButton", props(true));
      assert.equal(await page.locator(".basalt-glyph-frame").count(), 0, "no frame");
      const [a, b] = await page.evaluate(() => window.opacityAt(".basalt-button-swap > svg", 50));
      assert.ok(a > 0.01 && a < 0.99 && b > 0.01 && b < 0.99, `crossfading part-way under reduced motion (${a}, ${b})`);
      await page.close();
    });
  }
});

describe("NavItem and TabBarItem", () => {
  const nav = `
    function App() {
      const [c, setC] = React.useState("home");
      window.setCurrent = setC;
      return <B.TooltipProvider><div style={{ width: 300 }}><B.Nav aria-label="Primary">
        <B.NavItem href="#home" icon={B.HomeGlyph} current={c === "home"}>Home</B.NavItem>
        <B.NavItem href="#sandboxes" icon={B.SandboxesGlyph} current={c === "sandboxes"}>Sandboxes</B.NavItem>
        <B.NavItem href="#settings" icon={B.SettingsGlyph} current={c === "settings"}>Settings</B.NavItem>
      </B.Nav></div></B.TooltipProvider>;
    }
    root.render(<App />);`;

  test("when current changes, the old glyph un-fills and the new one fills, as morphs; the label and every item's width do not move", async () => {
    const { page, errors } = await open(nav);
    await idle(page);
    await idle(page);
    const entry = (n) => `.basalt-nav-entry:nth-child(${n})`;
    const widths = () => page.locator(".basalt-nav-pill").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    const before = await widths();
    const homeSelected = await html(page, `${entry(1)} svg`);
    const sandboxesRest = await html(page, `${entry(2)} svg`);
    await page.evaluate(() => window.sync(() => window.setCurrent("sandboxes")));
    const a = [], b = [];
    for (const t of [0, 60, 100]) {
      await run(page, t === 0 ? 0 : t === 60 ? 60 : 40);
      a.push(await html(page, `${entry(1)} svg`));
      b.push(await html(page, `${entry(2)} svg`));
      assert.deepEqual(await widths(), before, `no item moves at ${t}`);
    }
    assert.equal(a[0], homeSelected);
    assert.notEqual(a[1], homeSelected, "Home is un-filling");
    assert.equal(b[0], sandboxesRest);
    assert.notEqual(b[1], sandboxesRest, "Sandboxes is filling");
    assert.notEqual(b[1], b[2]);
    await run(page, 400);
    assert.equal(await page.locator(`${entry(2)} a`).getAttribute("aria-current"), "page");
    assert.equal(await outer(page, `${entry(2)} svg`), await ssr(page, "Icon", { icon: "SandboxesGlyph", size: 24, selected: true }), "settled on Icon's markup");
    assert.equal(await outer(page, `${entry(1)} svg`), await ssr(page, "Icon", { icon: "HomeGlyph", size: 24 }));
    assert.equal(await page.locator(`${entry(2)} .basalt-nav-label`).evaluate((el) => getComputedStyle(el).fontWeight), "600");
    assert.deepEqual(await widths(), before);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("TabBarItem: the current destination's glyph morphs; the cell does not move", async () => {
    const tabs = `
      function App() {
        const [c, setC] = React.useState("home");
        window.setCurrent = setC;
        return <B.TabBar><B.TabBarItem icon={B.HomeGlyph} href="#home" current={c === "home"}>Home</B.TabBarItem><B.TabBarItem icon={B.SearchGlyph} href="#search" current={c === "search"}>Search</B.TabBarItem></B.TabBar>;
      }
      root.render(<App />);`;
    const { page, errors } = await open(tabs, { viewport: { width: 390, height: 700 } });
    await idle(page);
    const cells = () => page.locator(".basalt-tabbar-item").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    const before = await cells();
    const rest = await html(page, ".basalt-tabbar-entry:nth-child(2) svg");
    await page.evaluate(() => window.sync(() => window.setCurrent("search")));
    await run(page, 60);
    assert.notEqual(await html(page, ".basalt-tabbar-entry:nth-child(2) svg"), rest, "Search is filling");
    assert.deepEqual(await cells(), before);
    await run(page, 400);
    assert.equal(await outer(page, ".basalt-tabbar-entry:nth-child(2) svg"), await ssr(page, "Icon", { icon: "SearchGlyph", size: 24, selected: true }));
    assert.deepEqual(await cells(), before);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("CodeBlock and Terminal's compact copy", () => {
  const stub = (page) => page.evaluate(() => { window.copied = []; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text) => { window.copied.push(text); return Promise.resolve(); } } }); });

  test("CodeBlock: Copy morphs into Check, the button keeps its name, the status says Copied, and Check morphs back", async () => {
    const { page, errors } = await open(`root.render(<B.CodeBlock code="basalt deploy" language="bash" title="terminal" />);`);
    await stub(page);
    await idle(page);
    const button = page.getByRole("button", { name: "Copy code" });
    const copy = await html(page, ".basalt-code-copy svg");
    await button.click();
    await page.waitForFunction(() => document.querySelector(".basalt-code-copy [role=status]")?.textContent === "Copied");
    assert.equal(await button.count(), 1, "the name is still Copy code");
    assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 0);
    assert.equal(await button.getAttribute("aria-label"), "Copy code");
    assert.equal(await html(page, ".basalt-code-copy svg"), copy, "it begins as Copy");
    await run(page, 60);
    const mid = await html(page, ".basalt-code-copy svg");
    assert.notEqual(mid, copy, "it is on its way");
    await run(page, 400);
    const check = await outer(page, ".basalt-code-copy svg");
    assert.equal(check, await ssr(page, "Icon", { icon: "CheckGlyph", size: 16 }));
    assert.equal(await button.count(), 1);
    // the confirmation ends, and Check morphs back
    await run(page, 2600);
    await run(page, 60);
    assert.notEqual(await outer(page, ".basalt-code-copy svg"), check, "Check is on its way back");
    await run(page, 400);
    assert.equal(await html(page, ".basalt-code-copy svg"), copy);
    assert.equal(await page.locator(".basalt-code-copy [role=status]").textContent(), "");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("Terminal: the icon-only copy morphs the same way and keeps the name Copy commands", async () => {
    const lines = `[{ kind: "command", text: "basalt sandbox create" }, { kind: "output", text: "ready" }]`;
    const { page, errors } = await open(`root.render(<main style={{ padding: 24 }}><div style={{ width: 320 }}><B.Terminal title="Deploy" lines={${lines}} /></div></main>);`);
    await stub(page);
    await idle(page);
    const button = page.getByRole("button", { name: "Copy commands" });
    assert.equal(await button.count(), 1, "the wide button is not displayed at 320");
    const copy = await html(page, ".basalt-terminal-copy-compact svg");
    await button.click();
    await page.waitForFunction(() => [...document.querySelectorAll("[role=status]")].some((el) => el.textContent === "Copied"));
    assert.equal(await button.getAttribute("aria-label"), "Copy commands");
    assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 0);
    await run(page, 60);
    assert.notEqual(await html(page, ".basalt-terminal-copy-compact svg"), copy);
    await run(page, 400);
    assert.equal(await outer(page, ".basalt-terminal-copy-compact svg"), await ssr(page, "Icon", { icon: "CheckGlyph", size: 16 }));
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("reduced motion: an allowed change swaps at once (DECISIONS 221), as MorphIcon does", () => {
  test("there is no second form: no switch, no fade layer, no keyframes", async () => {
    const fs = await import("node:fs");
    const sources = ["glyph-flight.tsx", "control-icon.tsx", "control-seat.tsx", "button.tsx", "styles/components.css"].map((file) => fs.readFileSync(path.join(pkg, "src", file), "utf8")).join("\n");
    assert.doesNotMatch(sources, /REDUCED_GLYPH_CHANGE|reducedForm|glyph-fade/);
  });

  test("a pressed toggle, a changed icon that is an allowed pair and a current item are each at once, with no fade and no frame", async () => {
    const { page } = await open();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.loadFlight());
    const selected = await ssr(page, "Icon", { icon: "HomeGlyph", selected: true });
    await mount(page, "Button", { icon: "HomeGlyph", pressed: false }, "Home");
    await idle(page);
    await mount(page, "Button", { icon: "HomeGlyph", pressed: true }, "Home");
    assert.equal(await outer(page, ".basalt-button svg"), selected, "selected at once");
    await run(page, 60);
    assert.equal(await outer(page, ".basalt-button svg"), selected, "and nothing runs");
    await mount(page, "Button", { icon: "CopyGlyph" }, "Copy");
    await idle(page);
    await mount(page, "Button", { icon: "CheckGlyph" }, "Copy");
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CheckGlyph" }), "Copy to Check, an allowed pair, at once");
    await run(page, 60);
    assert.equal(await outer(page, ".basalt-button svg"), await ssr(page, "Icon", { icon: "CheckGlyph" }));
    assert.equal(await page.locator(".basalt-button svg").count(), 1, "one glyph, never two");
    await page.close();
  });

  test("a current item under reduced motion changes glyph at once and keeps every width", async () => {
    const nav = `
      function App() {
        const [c, setC] = React.useState("home");
        window.setCurrent = setC;
        return <B.TooltipProvider><div style={{ width: 300 }}><B.Nav aria-label="Primary">
          <B.NavItem href="#home" icon={B.HomeGlyph} current={c === "home"}>Home</B.NavItem>
          <B.NavItem href="#sandboxes" icon={B.SandboxesGlyph} current={c === "sandboxes"}>Sandboxes</B.NavItem>
        </B.Nav></div></B.TooltipProvider>;
      }
      root.render(<App />);`;
    const { page } = await open(nav);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await idle(page);
    const widths = () => page.locator(".basalt-nav-pill").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    const before = await widths();
    await page.evaluate(() => window.sync(() => window.setCurrent("sandboxes")));
    assert.equal(await outer(page, ".basalt-nav-entry:nth-child(2) svg"), await ssr(page, "Icon", { icon: "SandboxesGlyph", size: 24, selected: true }), "filled at once");
    assert.equal(await outer(page, ".basalt-nav-entry:nth-child(1) svg"), await ssr(page, "Icon", { icon: "HomeGlyph", size: 24 }), "opened at once");
    assert.deepEqual(await widths(), before);
    await page.close();
  });

  test("a done seat keeps its own 100ms crossfade for any pair (see IconButton done), and the engine's component draws nothing in it", async () => {
    const { page } = await open();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(page, "Morphing", { icon: "CopyGlyph", selected: false, overlay: true }, null);
    await page.evaluate(() => window.mount("Morphing", { icon: "CheckGlyph", selected: false, overlay: true, from: { icon: window.B.CopyGlyph, selected: false } }, null));
    await idle(page);
    assert.equal(await page.locator("#root *").count(), 0, "no frame");
    await page.close();
  });

  test("a morph that is running when the preference turns on settles at once, and nothing is left queued", async () => {
    const { page } = await open();
    const props = (selected) => ({ icon: "HomeGlyph", selected, eager: true, size: 24 });
    await mount(page, "ControlIcon", props(false));
    await idle(page);
    await mount(page, "ControlIcon", props(true));
    await run(page, 60);
    assert.notEqual(await outer(page, ".basalt-icon"), await ssr(page, "Icon", { icon: "HomeGlyph", size: 24, selected: true }), "mid-flight");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await run(page, 16); // the next frame reads the preference
    await idle(page);
    assert.equal(await outer(page, ".basalt-icon"), await ssr(page, "Icon", { icon: "HomeGlyph", size: 24, selected: true }), "settled on the selected drawing");
    await run(page, 16);
    assert.equal(await outer(page, ".basalt-icon"), await ssr(page, "Icon", { icon: "HomeGlyph", size: 24, selected: true }), "and no frame was queued");
    await page.close();
  });

  test("with motion allowed, the same ControlIcon morphs", async () => {
    const { page } = await open();
    const props = (selected) => ({ icon: "HomeGlyph", selected, eager: true, size: 24 });
    await mount(page, "ControlIcon", props(false));
    await idle(page);
    await mount(page, "ControlIcon", props(true));
    await run(page, 60);
    assert.notEqual(await outer(page, ".basalt-icon"), await ssr(page, "Icon", { icon: "HomeGlyph", size: 24, selected: true }), "a frame in flight");
    await page.close();
  });
});

describe("the engine loads on demand, once, for the controls that need it", () => {
  /** Serve a split bundle (esbuild's code splitting, as an app's bundler would) and count the requests for the engine. */
  async function splitPage(body) {
    const built = await esbuild.build({
      stdin: { contents: `${PRELUDE_SPLIT}\n${body}`, resolveDir: pkg, loader: "tsx" },
      bundle: true, format: "esm", splitting: true, chunkNames: "[name]-[hash]", outdir: path.join(pkg, ".split-check"), write: false, jsx: "automatic", platform: "browser", logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    const files = new Map(built.outputFiles.map((file) => [`/${path.basename(file.path)}`, file.text]));
    const entry = [...files.keys()].find((name) => /^\/stdin/.test(name)) ?? [...files.keys()][0];
    const page = await browser.newPage();
    const requested = [];
    await page.route("https://basalt.test/**", (route) => {
      const name = new URL(route.request().url()).pathname;
      requested.push(name);
      if (name === "/") return route.fulfill({ contentType: "text/html", body: `<html><body><div id="root"></div><script type="module" src="/${entry.slice(1)}"></script></body></html>` });
      const text = files.get(name);
      return text === undefined ? route.fulfill({ status: 404, body: "" }) : route.fulfill({ contentType: "text/javascript", body: text });
    });
    await page.goto("https://basalt.test/");
    return { page, requested, engine: () => requested.filter((name) => /glyph-flight/.test(name)).length };
  }
  const PRELUDE_SPLIT = `
import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js";
const root = createRoot(document.getElementById("root"));
window.render = (el) => flushSync(() => root.render(el));
window.B = B; window.React = React;
`;

  test("a control whose glyph never changes does not load it: a plain Button, a Phosphor icon, a pressed pause", async () => {
    const { page, engine } = await splitPage(`window.render(<><B.Button icon={B.HomeGlyph}>A</B.Button><B.Button icon={B.SearchGlyph} variant="ghost">B</B.Button><B.IconButton icon={B.PauseGlyph} pressed label="Pause" /></>);`);
    await page.locator(".basalt-button").first().waitFor();
    await page.waitForTimeout(300);
    assert.equal(engine(), 0);
    await page.close();
  });

  test("a toggle with a glyph that fills loads it at mount; an IconButton with done too", async () => {
    const one = await splitPage(`window.render(<B.Button icon={B.HomeGlyph} pressed={false}>A</B.Button>);`);
    await one.page.locator(".basalt-button").waitFor();
    await one.page.waitForFunction(() => performance.getEntriesByType("resource").some((r) => /glyph-flight/.test(r.name)));
    assert.equal(one.engine(), 1);
    await one.page.close();
    const two = await splitPage(`window.render(<B.IconButton icon={B.CopyGlyph} done={false} label="Copy" />);`);
    await two.page.waitForFunction(() => performance.getEntriesByType("resource").some((r) => /glyph-flight/.test(r.name)));
    assert.equal(two.engine(), 1);
    await two.page.close();
  });

  test("any other control loads it at its first change, and a second control does not load it again", async () => {
    const { page, engine } = await splitPage(`window.render(<><B.Button icon={B.CopyGlyph}>A</B.Button><B.Button icon={B.CopyGlyph}>B</B.Button></>);`);
    await page.locator(".basalt-button").first().waitFor();
    await page.waitForTimeout(200);
    assert.equal(engine(), 0, "not at mount");
    await page.evaluate(() => window.render(window.React.createElement(window.React.Fragment, null, window.React.createElement(window.B.Button, { icon: window.B.CheckGlyph }, "A"), window.React.createElement(window.B.Button, { icon: window.B.CheckGlyph }, "B"))));
    await page.waitForFunction(() => performance.getEntriesByType("resource").some((r) => /glyph-flight/.test(r.name)));
    await page.waitForTimeout(300);
    assert.equal(engine(), 1, "once, for both");
    await page.close();
  });

  test("a pressed Pause (an identical drawing) loads nothing, however often it is pressed", async () => {
    const { page, engine } = await splitPage(`
      const pause = (pressed) => <><B.IconButton icon={B.PauseGlyph} pressed={pressed} label="Pause" /><B.Button icon={B.PauseGlyph} pressed={pressed} variant="ghost">Pause</B.Button></>;
      window.show = (pressed) => window.render(pause(pressed));
      window.show(false);`);
    await page.locator(".basalt-button").first().waitFor();
    await page.evaluate(() => { window.show(true); window.show(false); window.show(true); });
    await page.waitForTimeout(400);
    assert.equal(engine(), 0);
    await page.close();
  });

  test("the engine is asked for when eligibility changes: done={false} added to a Copy button that had none", async () => {
    const { page, engine } = await splitPage(`
      window.show = (done) => window.render(<B.IconButton icon={B.CopyGlyph} label="Copy" done={done} />);
      window.show(undefined);`);
    await page.locator(".basalt-button").waitFor();
    await page.waitForTimeout(300);
    assert.equal(engine(), 0, "a plain Copy button does not");
    await page.evaluate(() => window.show(false));
    await page.waitForFunction(() => performance.getEntriesByType("resource").some((r) => /glyph-flight/.test(r.name)));
    assert.equal(engine(), 1);
    await page.close();
  });

  test("the engine is not in the static graph of Button, IconButton, NavItem or TabBarItem: only a dynamic import reaches it", async () => {
    for (const name of ["Button", "IconButton", "NavItem", "TabBarItem", "CodeBlock", "Terminal", "LoopsToggleIcon"]) {
      const result = await esbuild.build({
        stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
        bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, metafile: true,
        external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
      });
      const outputs = result.metafile.outputs;
      const entry = Object.keys(outputs).find((file) => outputs[file].entryPoint === "<stdin>");
      const seen = new Set();
      const visit = (file) => { if (seen.has(file)) return; seen.add(file); for (const imported of outputs[file].imports) if (!imported.external && imported.kind !== "dynamic-import") visit(imported.path); };
      visit(entry);
      const staticInputs = [...seen].flatMap((file) => Object.keys(outputs[file].inputs));
      assert.ok(!staticInputs.some((input) => /glyph-flight|glyph-motion|motion-timing/.test(input)), `${name} loads the engine up front: ${staticInputs.filter((i) => /glyph-flight|glyph-motion|motion-timing/.test(i))}`);
      const dynamic = Object.values(outputs).some((output) => output.imports.some((imported) => imported.kind === "dynamic-import"));
      assert.ok(dynamic, `${name} reaches the engine by a dynamic import`);
    }
  });
});
