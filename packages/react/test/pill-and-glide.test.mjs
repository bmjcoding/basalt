// The sliding pill (SegmentedControl, vertical Tabs) and the hover glide (Menu, Select, Combobox, CommandMenu), council item
// 69 and owner item 70. Driven in Chromium against the built package with the real stylesheet. The shared pill and the shared
// plate are enhancements over each item's own: where they are off (no JS, touch, reduced motion, forced colours) the item
// paints its own, and the tests prove that fallback as well as the motion. The tests that sample a move part-way through
// freeze animation time and move it by hand (freezeAnimations in support.mjs): they show the shape of the motion (a transition
// on transform, 150 or 200ms, ease-out), not a frame count, and no load on the machine can change what they read.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, pkg, settle, tick } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";
// Real time, or animation time once a test has frozen it (freezeAnimations): the mid-motion tests freeze it, so a busy machine
// cannot let a transition run out between an action and the reading of it.
const wait = tick;

const segmented = `<B.SegmentedControl aria-label="Range" defaultValue="a"><B.Segment value="a">One</B.Segment><B.Segment value="b">Second</B.Segment><B.Segment value="c">Third one</B.Segment></B.SegmentedControl>`;
const vertical = `<B.Tabs orientation="vertical" defaultValue="a"><B.TabsList aria-label="Sections"><B.Tab value="a">Account</B.Tab><B.Tab value="b">Billing</B.Tab><B.Tab value="c">Access keys</B.Tab><B.Tab value="d">Notifications</B.Tab></B.TabsList><B.TabsPanel value="a">A</B.TabsPanel><B.TabsPanel value="b">B</B.TabsPanel><B.TabsPanel value="c">C</B.TabsPanel><B.TabsPanel value="d">D</B.TabsPanel></B.Tabs>`;

/** The one-of-many controls under test: how to find the control, its items, and which axis the pill travels. */
const controls = {
  // The pill, data-slide and the pill's variables are the port's since cimip-gaps-3 t7 (the host keeps the track's fill and radius).
  segmented: { fixture: segmented, root: ".basalt-segmented-scroll", item: ".basalt-segment", chosen: ".basalt-segment[data-pressed]", axis: "x" },
  "vertical tabs": { fixture: vertical, root: ".basalt-tabs-list", item: ".basalt-tab", chosen: ".basalt-tab[data-active]", axis: "y" },
};

/** The pill's transform as numbers, its size, and the transitions running on it. */
const pillNow = (page, root) => page.evaluate((root) => {
  const pill = document.querySelector(`${root} > .basalt-pill`);
  const cs = getComputedStyle(pill);
  const m = new DOMMatrixReadOnly(cs.transform);
  return { x: m.m41, y: m.m42, w: parseFloat(cs.width), h: parseFloat(cs.height), display: cs.display, running: pill.getAnimations().map((a) => ({ type: a.constructor.name, property: a.transitionProperty, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })) };
}, root);

/** Where the chosen item is, relative to its control's padding box: where the pill must end up. */
const chosenBox = (page, spec) => page.evaluate(({ root, chosen }) => {
  const r = document.querySelector(root);
  const rr = r.getBoundingClientRect();
  const c = r.querySelector(chosen).getBoundingClientRect();
  return { x: c.left - rr.left - r.clientLeft, y: c.top - rr.top - r.clientTop, w: c.width, h: c.height };
}, spec);

const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

describe("the sliding pill", () => {
  for (const [name, spec] of Object.entries(controls)) {
    for (const theme of ["dark", "light"]) {
      test(`${name}: one shared pill sits on the chosen item, which paints no pill of its own (${theme})`, async () => {
        const { page } = await fixturePage(browser, render(spec.fixture), { theme });
        await settle(page);
        assert.equal(await page.locator(`${spec.root} > .basalt-pill`).count(), 1, "one pill per control");
        assert.equal(await page.locator(`${spec.root}`).getAttribute("data-slide"), "", "JS has measured the chosen item");
        const pill = await pillNow(page, spec.root);
        const box = await chosenBox(page, spec);
        assert.equal(pill.display, "block");
        near(pill.x, box.x, "x"); near(pill.y, box.y, "y"); near(pill.w, box.w, "width"); near(pill.h, box.h, "height");
        assert.deepEqual(pill.running, [], "the first placement is not a move");
        const item = await page.locator(spec.chosen).evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, shadow: cs.boxShadow }; });
        assert.equal(item.bg, "rgba(0, 0, 0, 0)", "the chosen item paints no pill of its own while the shared one is live");
        assert.equal(item.shadow, "none");
        const look = await page.locator(`${spec.root} > .basalt-pill`).evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, shadow: cs.boxShadow, radius: cs.borderTopLeftRadius, events: cs.pointerEvents, hidden: el.getAttribute("aria-hidden") }; });
        assert.notEqual(look.shadow, "none", "the pill keeps its hairline");
        assert.equal(look.events, "none");
        assert.equal(look.hidden, "true");
        assert.equal(look.radius, name === "segmented" ? "6px" : "8px");
        // dark: the selected wash over surface-top as one solid fill (#2c2c2c); light: surface-top, white
        const expected = await page.evaluate((theme) => { const probe = document.createElement("div"); document.body.append(probe); probe.style.backgroundColor = theme === "dark" ? "#2c2c2c" : "var(--basalt-surface-top)"; const c = getComputedStyle(probe).backgroundColor; probe.remove(); return c; }, theme);
        const canvas = (css) => page.evaluate((css) => { const ctx = document.createElement("canvas").getContext("2d"); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; }, css);
        assert.deepEqual(await canvas(look.bg), await canvas(expected));
        await page.close();
      });
    }

    test(`${name}: choosing travels by transform and size on duration-slow with ease-out, whatever the distance`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark" });
      await freezeAnimations(page);
      const items = page.locator(spec.item);
      const durations = [];
      for (const index of [1, 2]) {
        await items.nth(index).click();
        const pill = await pillNow(page, spec.root);
        assert.ok(pill.running.length > 0, "a transition is running");
        for (const t of pill.running) assert.equal(t.type, "CSSTransition", "a transition, not a keyframe animation");
        assert.deepEqual(pill.running.map((t) => t.property).sort(), ["height", "transform", "width"].filter((p) => pill.running.some((t) => t.property === p)));
        const move = pill.running.find((t) => t.property === "transform");
        assert.ok(move, "the pill moves by transform");
        assert.equal(move.easing, EASE_OUT);
        durations.push(move.duration);
        await settle(page);
        const end = await pillNow(page, spec.root);
        const box = await chosenBox(page, spec);
        near(end.x, box.x, "ends on the item (x)"); near(end.y, box.y, "ends on the item (y)"); near(end.w, box.w, "width"); near(end.h, box.h, "height");
      }
      await items.nth(0).click(); // the longest move back
      durations.push((await pillNow(page, spec.root)).running.find((t) => t.property === "transform").duration);
      assert.deepEqual(durations, [200, 200, 200], "the same 200ms for a short move and a long one");
      await page.close();
    });

    test(`${name}: a second change 60ms into a move turns the pill from where it is`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark" });
      const clock = await freezeAnimations(page);
      // time moves only when the clock is advanced, so each reading is of a known instant of the move
      const at = () => page.evaluate(({ root, axis }) => { const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector(`${root} > .basalt-pill`)).transform); return axis === "x" ? m.m41 : m.m42; }, spec);
      const start = await at();
      await page.evaluate(({ item }) => { const items = [...document.querySelectorAll(item)]; items[items.length - 1].click(); }, spec);
      await clock.advance(60);
      const mid = await at();
      const turn = await page.evaluate(({ root, item, axis }) => {
        const pill = document.querySelector(`${root} > .basalt-pill`);
        const items = [...document.querySelectorAll(item)];
        const now = () => { const m = new DOMMatrixReadOnly(getComputedStyle(pill).transform); return axis === "x" ? m.m41 : m.m42; };
        items[1].click(); // the turn
        return { justAfter: now(), types: pill.getAnimations().map((a) => a.constructor.name), target: axis === "x" ? items[1].offsetLeft : items[1].offsetTop, far: axis === "x" ? items[items.length - 1].offsetLeft : items[items.length - 1].offsetTop };
      }, spec);
      await clock.advance(40);
      const later = await at();
      await settle(page);
      const result = { start, mid, later, end: await at(), ...turn };
      assert.ok(result.mid > result.start + 4 && result.mid < result.far - 1, `in flight at 60ms: ${JSON.stringify(result)}`);
      near(result.justAfter, result.mid, "the turn starts where the pill is, with no snap back or ahead", Math.abs(result.far - result.start) * 0.08);
      assert.ok(result.later < result.mid + 1 && result.later > result.target - 1, "then heads back to the second item");
      near(result.end, result.target, "and ends on it", 1.5);
      assert.deepEqual([...new Set(result.types)], ["CSSTransition"], "retargeted through transitions, not keyframes");
      await page.close();
    });

    test(`${name}: the chosen label's ink changes at the press, over duration-fast, without waiting for the pill`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark" });
      const clock = await freezeAnimations(page);
      await page.evaluate(({ item }) => { [...document.querySelectorAll(item)][2].click(); }, spec);
      await clock.advance(16); // the frame after the press
      const result = await page.evaluate(({ root, item }) => {
        const pill = document.querySelector(`${root} > .basalt-pill`);
        const target = [...document.querySelectorAll(item)][2];
        const ink = target.getAnimations().find((a) => a.transitionProperty === "color");
        return { ink: ink && { duration: ink.effect.getTiming().duration, easing: ink.effect.getTiming().easing, playState: ink.playState }, pill: pill.getAnimations().length, bgFade: target.getAnimations().some((a) => a.transitionProperty === "background-color") };
      }, spec);
      assert.ok(result.ink, "the label's colour is already transitioning in the frame after the press");
      assert.equal(result.ink.duration, 100);
      assert.equal(result.ink.easing, EASE_OUT);
      assert.ok(result.pill > 0, "while the pill is still on its way");
      assert.equal(result.bgFade, false, "the item does not fade a pill of its own under the shared one");
      await page.close();
    });

    test(`${name}: the pill follows a resize or a font change without a move, and an added item re-places it`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark" });
      await settle(page);
      await page.locator(spec.item).nth(2).click();
      await settle(page);
      await page.locator(spec.root).evaluate((el) => { el.style.fontSize = "20px"; });
      await wait(page, 80);
      const pill = await pillNow(page, spec.root);
      const box = await chosenBox(page, spec);
      near(pill.x, box.x, "x after the text grew"); near(pill.y, box.y, "y"); near(pill.w, box.w, "width"); near(pill.h, box.h, "height");
      assert.deepEqual(pill.running, [], "a resize is not a move");
      await page.close();
    });

    test(`${name}: with no measurement the shared pill is not drawn and the chosen item paints its own`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark" });
      await settle(page);
      await page.locator(spec.root).evaluate((el) => el.removeAttribute("data-slide")); // what the server rendered, before JS measures
      const pill = await pillNow(page, spec.root);
      assert.equal(pill.display, "none");
      const item = await page.locator(spec.chosen).evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, shadow: cs.boxShadow, color: cs.color }; });
      assert.notEqual(item.bg, "rgba(0, 0, 0, 0)");
      assert.notEqual(item.shadow, "none");
      await page.close();
    });

    test(`${name}: the pill is a shape: under reduced motion each item paints its own pill and fades it over 100ms, with no shared pill`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark", reducedMotion: "reduce" });
      await settle(page);
      const pill = await pillNow(page, spec.root);
      assert.equal(pill.display, "none", "no shared pill");
      const item = await page.locator(spec.chosen).evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, shadow: cs.boxShadow, property: cs.transitionProperty, duration: cs.transitionDuration }; });
      assert.notEqual(item.bg, "rgba(0, 0, 0, 0)", "the item's own pill");
      assert.notEqual(item.shadow, "none");
      assert.match(item.property, /background-color/);
      assert.ok(item.duration.split(", ").every((d) => d === "0.1s"), `fades over 100ms: ${item.duration}`);
      await page.locator(spec.item).nth(2).click();
      assert.deepEqual((await pillNow(page, spec.root)).running, [], "nothing travels");
      await settle(page);
      assert.equal(await page.locator(spec.chosen).textContent(), await page.locator(spec.item).nth(2).textContent());
      await page.close();
    });

    test(`${name}: in forced colours there is no shared pill; the chosen item is Highlight on HighlightText with no backplate box`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark", forcedColors: "active" });
      await settle(page);
      const system = await page.evaluate(() => { const probe = document.createElement("div"); document.body.append(probe); const read = (v) => { probe.style.backgroundColor = v; return getComputedStyle(probe).backgroundColor; }; const out = { Highlight: read("Highlight"), HighlightText: read("HighlightText") }; probe.remove(); return out; });
      assert.equal((await pillNow(page, spec.root)).display, "none");
      for (const step of [0, 1]) {
        if (step) { await page.locator(spec.item).nth(2).click(); await settle(page); }
        const item = await page.locator(spec.chosen).evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color, adjust: cs.forcedColorAdjust, shadow: cs.boxShadow }; });
        assert.deepEqual(item, { bg: system.Highlight, color: system.HighlightText, adjust: "none", shadow: "none" });
      }
      assert.deepEqual((await pillNow(page, spec.root)).running, []);
      await page.close();
    });

    test(`${name}: touch targets stay at least 44px, and the pill is as tall as the target`, async () => {
      const { page } = await fixturePage(browser, render(spec.fixture), { theme: "dark", hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
      await settle(page);
      assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
      const boxes = await page.locator(spec.item).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }));
      for (const [w, h] of boxes) assert.ok(w >= 44 && h >= 44, `target ${w}x${h}`);
      const pill = await pillNow(page, spec.root);
      const box = await chosenBox(page, spec);
      assert.ok(pill.h >= 44 && pill.w >= 44);
      near(pill.h, box.h, "pill height"); near(pill.w, box.w, "pill width");
      await page.locator(spec.item).nth(1).tap();
      assert.ok((await pillNow(page, spec.root)).running.length > 0, "a tap is a choice, so it slides on touch");
      await page.close();
    });
  }

  test("segmented: the keyboard moves focus and a choice moves the pill; Space chooses", async () => {
    const { page } = await fixturePage(browser, render(segmented), { theme: "dark" });
    await settle(page);
    await page.getByRole("button", { name: "One", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Second");
    const before = await pillNow(page, ".basalt-segmented");
    await page.keyboard.press("Space");
    await settle(page);
    const after = await pillNow(page, ".basalt-segmented");
    assert.ok(after.x > before.x + 10);
    await page.close();
  });

  test("the observers and listeners go with the control", async () => {
    const fixture = `
      const open = { resize: new Set(), mutation: new Set() };
      for (const [kind, name] of [["resize", "ResizeObserver"], ["mutation", "MutationObserver"]]) {
        const Original = window[name];
        window[name] = class extends Original {
          constructor(cb) { super(cb); open[kind].add(this); }
          disconnect() { open[kind].delete(this); super.disconnect(); }
        };
      }
      window.__open = () => [open.resize.size, open.mutation.size];
      function App() {
        const [shown, setShown] = React.useState(true);
        window.__toggle = () => setShown((s) => !s);
        return shown ? <>${segmented}${vertical}</> : null;
      }
      createRoot(document.getElementById("root")).render(<App />);`;
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await settle(page);
    const [resize, mutation] = await page.evaluate(() => window.__open());
    await page.evaluate(() => window.__toggle());
    await wait(page, 50);
    const [baseResize, baseMutation] = await page.evaluate(() => window.__open());
    assert.ok(resize >= baseResize + 2 && mutation >= baseMutation + 2, "the controls observe while they are mounted");
    await page.evaluate(() => window.__toggle());
    await wait(page, 50);
    assert.ok((await page.evaluate(() => window.__open()))[0] >= baseResize + 2);
    await page.evaluate(() => window.__toggle());
    await wait(page, 50);
    assert.deepEqual(await page.evaluate(() => window.__open()), [baseResize, baseMutation], "none is left observing a removed control");
    await page.close();
  });

  test("the pill and the plate keep no animation frame in React state: no render happens while they move", async () => {
    const source = (name) => fs.readFileSync(path.join(pkg, "dist", name), "utf8");
    for (const file of ["pill.js", "plate.js"]) {
      const code = source(file);
      assert.ok(!/\buseState\b|\buseReducer\b|requestAnimationFrame/.test(code), `${file} holds state or schedules frames`);
    }
    const fixture = `
      window.__commits = 0;
      const count = () => { window.__commits += 1; };
      function App() {
        return <React.Profiler id="p" onRender={count}>
          ${segmented}${vertical}
        </React.Profiler>;
      }
      createRoot(document.getElementById("root")).render(<App />);`;
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await settle(page);
    for (const item of [".basalt-segment", ".basalt-tab"]) {
      await page.locator(item).nth(2).click();
      await wait(page, 30);
      const early = await page.evaluate(() => window.__commits);
      await wait(page, 300);
      assert.equal(await page.evaluate(() => window.__commits), early, `${item}: ${early} commits at 30ms, and none for the rest of the 200ms move`);
      await settle(page);
    }
    await page.close();
  });
});

// ---- the hover glide ----

const rowsOf = (n = 5) => Array.from({ length: n }, (_, i) => `<B.MenuItem>Row ${i + 1}</B.MenuItem>`).join("");
const options = Array.from({ length: 5 }, (_, i) => `{value:"v${i}",label:"Option ${i + 1}"}`).join(",");
const commandMenu = `function App(){const[o,so]=React.useState(true);return <B.CommandMenu hints open={o} onOpenChange={so} groups={[{label:'Sandbox',commands:[${Array.from({ length: 5 }, (_, i) => `{id:'c${i}',label:'Command ${i + 1}',onSelect:()=>{}}`).join(",")}]}]}/>}
  createRoot(document.getElementById("root")).render(<App/>);`;

const popups = {
  Menu: { fixture: render(`<B.Menu defaultOpen><B.MenuTrigger>Menu</B.MenuTrigger><B.MenuContent>${rowsOf()}</B.MenuContent></B.Menu>`), host: ".basalt-menu", row: ".basalt-menu-item", lit: "[data-highlighted]" },
  Select: { fixture: render(`<B.Select aria-label="Region" defaultOpen options={[${options}]} />`), host: ".basalt-select-popup", row: ".basalt-menu-item", lit: "[data-highlighted]" },
  Combobox: { fixture: render(`<B.Combobox aria-label="Zone" defaultOpen options={[${options}]} />`), host: ".basalt-combobox-popup", row: ".basalt-menu-item", lit: "[data-highlighted]" },
  CommandMenu: { fixture: commandMenu, host: ".basalt-command-list", row: "[cmdk-item]", lit: "[cmdk-item][data-selected='true']", persistent: true, ready: (page) => page.getByRole("combobox").waitFor() },
};

/** Opens a popup fixture and waits for it. */
async function open(spec, options = {}) {
  const { page } = await fixturePage(browser, spec.fixture, { theme: "dark", ...options });
  await spec.ready?.(page);
  await settle(page);
  await page.locator(spec.row).first().waitFor();
  return page;
}

/** Where a row's plate belongs: the row's box less the 2px of inset above and below. */
const rowPlate = (page, spec, n) => page.evaluate(({ row, n }) => {
  const r = document.querySelectorAll(row)[n].getBoundingClientRect();
  return { top: r.top + 2, height: r.height - 4, left: r.left, width: r.width };
}, { row: spec.row, n });

/** What the shared plate is doing: its box on screen, its opacity, and the transitions running on it. */
const plateNow = (page, spec) => page.evaluate((host) => {
  const el = document.querySelector(host);
  const plate = el.querySelector(".basalt-plate");
  const r = plate.getBoundingClientRect();
  const cs = getComputedStyle(plate);
  return {
    top: r.top, height: r.height, left: r.left, width: r.width, opacity: Number(cs.opacity), display: cs.display, state: plate.dataset.state, glide: el.hasAttribute("data-glide") || el.querySelector(":scope > .basalt-menu-scroll[data-glide]") !== null, // the popup's port is the glide's host (cimip-gaps-3 t7)
    running: plate.getAnimations().map((a) => ({ type: a.constructor.name, property: a.transitionProperty, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })),
  };
}, spec.host);

const center = async (page, spec, n) => {
  const box = await page.locator(spec.row).nth(n).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
const pointAt = async (page, spec, n) => { const c = await center(page, spec, n); await page.mouse.move(c.x, c.y); };
const sitsOn = (plate, expected, message) => {
  near(plate.top, expected.top, `${message}: top`, 1); near(plate.height, expected.height, `${message}: height`, 1);
  near(plate.left, expected.left, `${message}: left`, 1); near(plate.width, expected.width, `${message}: width`, 1);
};
/** Polls the plate until `done(plate)`, so a loaded machine delays the check and never fails it. */
const until = async (page, spec, done, message) => {
  for (let i = 0; i < 80; i++) {
    const plate = await plateNow(page, spec);
    if (done(plate)) return plate;
    await wait(page, 5);
  }
  assert.fail(message);
};
const moving = (plate) => plate.running.some((t) => t.property === "transform");

for (const [name, spec] of Object.entries(popups)) {
  describe(`the hover glide: ${name}`, () => {
    test("one shared plate is aria-hidden and pointer-inert, and the rows' own plates step aside while it is live", async () => {
      const page = await open(spec);
      await pointAt(page, spec, 1);
      await wait(page, 50);
      const plate = await plateNow(page, spec);
      assert.equal(plate.display, "block");
      assert.equal(plate.glide, true);
      const facts = await page.evaluate(({ host, row, lit }) => {
        const el = document.querySelector(host);
        const plate = el.querySelectorAll(".basalt-plate");
        const p = plate[0];
        const r = p.getBoundingClientRect();
        const under = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { count: plate.length, hidden: p.getAttribute("aria-hidden"), events: getComputedStyle(p).pointerEvents, text: p.textContent, hit: under === p, rowFill: getComputedStyle(el.querySelector(lit), "::before").backgroundColor, focusable: p.tabIndex };
      }, { host: spec.host, row: spec.row, lit: spec.lit });
      assert.equal(facts.count, 1, "one plate per popup");
      assert.equal(facts.hidden, "true");
      assert.equal(facts.events, "none");
      assert.equal(facts.text, "");
      assert.equal(facts.hit, false, "the pointer never lands on it");
      assert.equal(facts.rowFill, "rgba(0, 0, 0, 0)", "the lit row paints no plate of its own while the shared one is live");
      await page.close();
    });

    test("entering from outside, the plate appears in place at once, with no flight from a stale row", async () => {
      const page = await open(spec);
      await freezeAnimations(page);
      if (spec.persistent) {
        // cmdk always has one row selected, and the plate keeps it lit: there is no "outside" to enter from, so the plate
        // is already on the selected row at open and glides from there, as it does between any two rows.
        sitsOn(await plateNow(page, spec), await rowPlate(page, spec, 0), "lit on the selected row at open, with no flight");
        await pointAt(page, spec, 3);
        await wait(page, 25);
        assert.ok(moving(await plateNow(page, spec)));
        await page.close();
        return;
      }
      await pointAt(page, spec, 3);
      await wait(page, 24);
      const plate = await plateNow(page, spec);
      sitsOn(plate, await rowPlate(page, spec, 3), "on the row the pointer entered");
      assert.equal(plate.opacity, 1);
      assert.equal(moving(plate), false, "no travel into place");
      await page.close();
    });

    test("between rows it travels on duration-base with ease-out, whatever the distance", async () => {
      const page = await open(spec);
      await freezeAnimations(page);
      await pointAt(page, spec, 0);
      await wait(page, 60);
      const durations = [];
      for (const [to, label] of [[4, "four rows"], [3, "one row"]]) {
        await pointAt(page, spec, to);
        await wait(page, 25);
        const mid = await plateNow(page, spec);
        const target = await rowPlate(page, spec, to);
        assert.ok(moving(mid), `${label}: a transition is running`);
        const move = mid.running.find((t) => t.property === "transform");
        assert.equal(move.type, "CSSTransition");
        assert.equal(move.easing, EASE_OUT);
        durations.push(move.duration);
        assert.equal(mid.opacity, 1);
        if (to === 4) assert.ok(mid.top < target.top - 2, "still on its way");
        await wait(page, 260);
        const end = await plateNow(page, spec);
        sitsOn(end, target, `${label}: lands on the row`);
        assert.equal(moving(end), false);
      }
      assert.deepEqual(durations, [150, 150]);
      await page.close();
    });

    test("leaving mid-move freezes the plate where it is and fades it in place over duration-fast on ease-in", async () => {
      const page = await open(spec);
      await freezeAnimations(page);
      if (spec.persistent) {
        // cmdk never clears its selection, so the plate stays lit and keeps its row when the pointer leaves (#27).
        await pointAt(page, spec, 4);
        await wait(page, 300);
        await page.mouse.move(2, 2);
        await wait(page, 300);
        const kept = await plateNow(page, spec);
        assert.equal(kept.opacity, 1);
        sitsOn(kept, await rowPlate(page, spec, 4), "kept on the selected row");
        await page.close();
        return;
      }
      await pointAt(page, spec, 0);
      await wait(page, 60);
      await pointAt(page, spec, 4);
      await wait(page, 30);
      const flying = await plateNow(page, spec);
      const far = await rowPlate(page, spec, 4);
      assert.ok(flying.top < far.top - 3, "a move is in progress");
      await page.mouse.move(2, 2);
      const first = await until(page, spec, (p) => p.state === "off", "the plate never went to its off state");
      const second = await until(page, spec, (p) => p.opacity < 0.9 && p.opacity > 0.02, "the plate never faded");
      near(second.top, first.top, "the plate does not keep travelling after the pointer has left", 0.6);
      assert.ok(first.top < far.top - 3, "and it froze short of the row it was heading for");
      assert.equal(second.state, "off");
      assert.ok(second.opacity <= first.opacity && second.opacity < 1, `fading: ${first.opacity} then ${second.opacity}`);
      const fade = second.running.find((t) => t.property === "opacity");
      assert.ok(fade, "the fade is a transition on opacity");
      assert.equal(fade.duration, 100);
      assert.equal(fade.easing, EASE_IN);
      assert.equal(moving(second), false);
      await wait(page, 220);
      const gone = await plateNow(page, spec);
      assert.equal(gone.opacity, 0);
      near(gone.top, first.top, "and it fades where it froze", 0.6);
      await page.close();
    });

    test("grace: a return during the fade travels from where the plate is and returns to full opacity; after the fade it appears in place", async () => {
      const page = await open(spec);
      await freezeAnimations(page);
      if (spec.persistent) {
        // no fade happens, so there is nothing to return into: leaving and coming back never dims the plate
        await pointAt(page, spec, 4);
        await wait(page, 300);
        await page.mouse.move(2, 2);
        await wait(page, 40);
        assert.equal((await plateNow(page, spec)).opacity, 1);
        await pointAt(page, spec, 1);
        await wait(page, 25);
        const back = await plateNow(page, spec);
        assert.equal(back.opacity, 1);
        assert.ok(moving(back));
        await page.close();
        return;
      }
      await pointAt(page, spec, 0);
      await wait(page, 60);
      await pointAt(page, spec, 4);
      await wait(page, 35);
      await page.mouse.move(2, 2);
      const fading = await until(page, spec, (p) => p.opacity < 0.9 && p.opacity > 0.1, "the plate never faded");
      await pointAt(page, spec, 0);
      await wait(page, 25);
      const back = await plateNow(page, spec);
      const home = await rowPlate(page, spec, 0);
      assert.equal(back.opacity, 1, "back to full opacity");
      assert.ok(moving(back), "it travels");
      assert.ok(back.top > home.top + 3 && back.top <= fading.top + 0.6, "from where it was, not from the row it was heading for or from the target");
      await wait(page, 260);
      sitsOn(await plateNow(page, spec), home, "arrives");
      // now the whole fade, then a new entry
      await page.mouse.move(2, 2);
      await wait(page, 260);
      assert.equal((await plateNow(page, spec)).opacity, 0);
      await pointAt(page, spec, 2);
      await wait(page, 24);
      const fresh = await plateNow(page, spec);
      sitsOn(fresh, await rowPlate(page, spec, 2), "after the fade it appears in place");
      assert.equal(moving(fresh), false);
      assert.equal(fresh.opacity, 1);
      await page.close();
    });

    test("the keyboard moves the highlight at once: arrows, Home and End snap the plate onto the active row", async () => {
      const page = await open(spec);
      if (name === "CommandMenu" || name === "Combobox") await page.getByRole("combobox").focus();
      await pointAt(page, spec, 0);
      await wait(page, 60);
      const keys = ["ArrowDown", "ArrowDown", "End", "Home", "ArrowDown"];
      for (const key of keys) {
        await page.keyboard.press(key);
        await wait(page, 24);
        const index = await page.evaluate(({ row, lit }) => [...document.querySelectorAll(row)].findIndex((r) => r.matches(lit)), { row: spec.row, lit: spec.lit });
        assert.ok(index >= 0, `${key}: a row is active`);
        const plate = await plateNow(page, spec);
        sitsOn(plate, await rowPlate(page, spec, index), `${key} puts the plate on row ${index + 1}`);
        assert.equal(moving(plate), false, `${key}: no travel`);
        assert.equal(plate.opacity, 1);
      }
      await page.close();
    });

    test("the active row stays the primitive's: the plate sits where data-highlighted / data-selected is", async () => {
      const page = await open(spec);
      await pointAt(page, spec, 2);
      await wait(page, 300);
      const index = await page.evaluate(({ row, lit }) => [...document.querySelectorAll(row)].findIndex((r) => r.matches(lit)), { row: spec.row, lit: spec.lit });
      assert.equal(index, 2);
      sitsOn(await plateNow(page, spec), await rowPlate(page, spec, 2), "on the active row");
      await page.close();
    });

    test("pointerType touch turns the glide off for that input: the row paints its own plate; a key brings it back", async () => {
      const page = await open(spec);
      await pointAt(page, spec, 1);
      await wait(page, 50);
      await page.locator(spec.row).nth(1).dispatchEvent("pointermove", { pointerType: "touch", bubbles: true, composed: true });
      await wait(page, 30);
      const touched = await plateNow(page, spec);
      assert.equal(touched.glide, false);
      assert.equal(touched.display, "none");
      const own = await page.locator(spec.row).nth(1).evaluate((row) => getComputedStyle(row, "::before").backgroundColor);
      assert.notEqual(own, "rgba(0, 0, 0, 0)", "the row's own plate shows");
      await page.keyboard.press("ArrowDown");
      await wait(page, 30);
      assert.equal((await plateNow(page, spec)).glide, true);
      await page.close();
    });

    test("on a touch device (hover: none, coarse pointer) there is no shared plate: the row paints its own on press", async () => {
      const page = await open(spec, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
      assert.equal(await page.evaluate(() => matchMedia("(hover: none)").matches && matchMedia("(pointer: coarse)").matches), true);
      await (spec.ready ? page.getByRole("combobox") : name === "Combobox" ? page.getByRole("combobox") : page.locator(spec.host)).focus();
      await page.keyboard.press("ArrowDown");
      await wait(page, 40);
      const plate = await plateNow(page, spec);
      assert.equal(plate.glide, false);
      assert.equal(plate.display, "none");
      const lit = await page.locator(spec.lit).first().evaluate((row) => getComputedStyle(row, "::before").backgroundColor);
      assert.notEqual(lit, "rgba(0, 0, 0, 0)");
      await page.close();
    });

    test("under reduced motion each row lights on its own: in at once, out with a 100ms fade, no travel", async () => {
      const page = await open(spec, { reducedMotion: "reduce" });
      await pointAt(page, spec, 1);
      await wait(page, 50);
      const plate = await plateNow(page, spec);
      assert.equal(plate.glide, false);
      assert.equal(plate.display, "none");
      const rows = await page.evaluate(({ row, lit }) => {
        const on = document.querySelector(lit);
        const off = [...document.querySelectorAll(row)].find((r) => !r.matches(lit));
        const read = (el) => { const cs = getComputedStyle(el, "::before"); return { bg: cs.backgroundColor, duration: cs.transitionDuration }; };
        return { on: read(on), off: read(off) };
      }, { row: spec.row, lit: spec.lit });
      assert.notEqual(rows.on.bg, "rgba(0, 0, 0, 0)");
      assert.equal(rows.on.duration, "0s", "in at once");
      assert.equal(rows.off.duration, "0.1s", "out over 100ms");
      await pointAt(page, spec, 3);
      await wait(page, 20);
      assert.equal((await plateNow(page, spec)).running.length, 0);
      await page.close();
    });

    test("in forced colours there is no shared plate: each row is Highlight on HighlightText", async () => {
      const page = await open(spec, { forcedColors: "active" });
      await pointAt(page, spec, 1);
      await wait(page, 50);
      const plate = await plateNow(page, spec);
      assert.equal(plate.display, "none");
      const system = await page.evaluate(() => { const probe = document.createElement("div"); document.body.append(probe); probe.style.backgroundColor = "Highlight"; const c = getComputedStyle(probe).backgroundColor; probe.remove(); return c; });
      const row = await page.locator(spec.lit).first().evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
      assert.equal(row, system);
      await page.close();
    });
  });
}

describe("the hover glide: how each popup behaves when the pointer leaves", () => {
  test("CommandMenu keeps its plate when the pointer leaves the list, as the row stays selected", async () => {
    const spec = popups.CommandMenu;
    const page = await open(spec);
    await pointAt(page, spec, 2);
    await wait(page, 300);
    await page.mouse.move(2, 2);
    await wait(page, 300);
    const plate = await plateNow(page, spec);
    assert.equal(plate.opacity, 1);
    sitsOn(plate, await rowPlate(page, spec, 2), "still on the selected row");
    await page.close();
  });

  test("Menu: a pointer crossing between touching rows never lets the plate blink off", async () => {
    const spec = popups.Menu;
    const page = await open(spec);
    await pointAt(page, spec, 0);
    await wait(page, 60);
    const a = await center(page, spec, 0);
    const b = await center(page, spec, 4);
    const seen = [];
    for (let i = 0; i <= 20; i++) {
      await page.mouse.move(a.x, a.y + ((b.y - a.y) * i) / 20);
      seen.push((await plateNow(page, spec)).opacity);
    }
    assert.ok(seen.every((o) => o === 1), `opacity along the sweep: ${seen}`);
    await page.close();
  });

  test("Select, Combobox and Menu: the plate follows the pointer and no render happens while it travels", async () => {
    for (const name of ["Menu", "Select", "Combobox"]) {
      const spec = popups[name];
      const wrapped = { ...spec, fixture: spec.fixture.replace("createRoot(document.getElementById(\"root\")).render(", `window.__commits = 0; createRoot(document.getElementById("root")).render(<React.Profiler id="p" onRender={() => { window.__commits += 1; }}>`).replace(/\);$/, "</React.Profiler>);") };
      // the replace above wraps the whole tree: `render(<>…</>)` becomes render(<Profiler><>…</></Profiler>)
      const page = await open(wrapped);
      await freezeAnimations(page);
      await pointAt(page, wrapped, 0);
      await wait(page, 60);
      await pointAt(page, wrapped, 4);
      await wait(page, 30);
      const early = await page.evaluate(() => window.__commits);
      assert.ok(moving(await plateNow(page, wrapped)), `${name}: travelling`);
      await wait(page, 300);
      assert.equal(await page.evaluate(() => window.__commits), early, `${name}: no commit during the 150ms travel`);
      await page.close();
    }
  });
});

// ---- callout icon, forced colours ----

describe("a callout's status icon in forced colours", () => {
  const fixture = `<>${["info", "success", "warning", "danger"].map((s) => `<B.Callout status="${s}" title="${s}">Body</B.Callout>`).join("")}</>`;

  for (const theme of ["dark", "light"]) {
    test(`the icon takes the system foreground, not its authored green, amber or red (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(fixture), { theme, forcedColors: "active" });
      await settle(page);
      const canvasText = await page.evaluate(() => { const probe = document.createElement("div"); document.body.append(probe); probe.style.color = "CanvasText"; const c = getComputedStyle(probe).color; probe.remove(); return c; });
      const icons = await page.locator(".basalt-callout-icon").evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
      assert.equal(icons.length, 4);
      assert.deepEqual(icons, Array(4).fill(canvasText));
      await page.close();
    });
  }

  test("outside forced colours the icon keeps its status colour", async () => {
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    await settle(page);
    const colours = await page.locator(".basalt-callout-icon").evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    assert.equal(new Set(colours).size, 4, `status colours differ: ${colours}`);
    await page.close();
  });
});

// ---- axe, both themes ----

for (const theme of ["dark", "light"]) {
  test(`axe finds no WCAG 2.2 AA violations in the pill and glide components, at rest and with a plate on a row (${theme})`, async () => {
    const fixture = `<>
      ${segmented}
      ${vertical}
      <B.Menu defaultOpen><B.MenuTrigger>Menu</B.MenuTrigger><B.MenuContent>${rowsOf(3)}</B.MenuContent></B.Menu>
    </>`;
    const { page } = await fixturePage(browser, render(fixture), { theme });
    await settle(page);
    await page.locator(".basalt-menu-item").nth(1).hover();
    await wait(page, 300);
    await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() => window.axe.run(
      { exclude: [["[data-base-ui-focus-guard]"]] },
      { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
    ));
    assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`), []);
    // the pill and the plate are not in the accessibility tree
    const names = await page.evaluate(() => [...document.querySelectorAll(".basalt-pill, .basalt-plate")].map((el) => el.getAttribute("aria-hidden")));
    assert.ok(names.length >= 3 && names.every((v) => v === "true"));
    await page.close();
  });
}
