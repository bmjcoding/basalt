// The diagram viewer (DECISIONS 301, part 9, as DECISIONS 310; section 8's list for diagram-viewer.test.mjs): "Expand", the dialog, the layout width, Fit,
// the steps, what holds still, the keys, pan, the ink at every level, sharpness, the status line, focus, the trace, the list and print. In Chromium against
// the built package. The implementation hasn't been reviewed; part 9 had no draft, check or position.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pixels, pkg } from "./support.mjs";

const require = createRequire(import.meta.url);
const { renderToString } = require("react-dom/server");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const KEYS = Object.keys(DATA);
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;
// The layout widths of 9.12 (proof/zoom/fit.json), with the flowchart's least drawn width at 976 after call 1 of section 4.
const LAYOUT = { architecture: 784, flowchart: 976, dataFlow: 1080, sequence: 807, schema: 1056 };
const LADDER = [25, 33, 50, 67, 75, 100, 125, 150, 200, 300, 400];

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The host: the five CIMIP figures (or `window.__set(list)`), each with the id `fig-<key>`; `zoom` and `motion` per figure from the list.
const HOST = `
import data from "./test/fixtures/cimip-diagrams.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
const all = () => Object.entries(data).map(([key, d]) => { const { type, ...props } = d; return { key, type, props }; });
function Host() {
  const [list, setList] = React.useState(all);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, type, props }) => { const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function viewerPage({ theme = "dark", width = 1440, height = 900, touch = false, scale = 1, media } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height }, deviceScaleFactor: scale, hasTouch: touch, isMobile: touch });
  if (touch) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  if (media) await page.emulateMedia(media);
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 4);
  return { page, errors };
}

/** Opens a figure's viewer and waits until its figure is laid out and the dialog has finished its entrance. */
async function open(page, key, { tap = false } = {}) {
  const button = page.locator(`#fig-${key} .${P}-expand`);
  await button.scrollIntoViewIfNeeded();
  if (tap) await button.tap(); else await button.click();
  await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await frames(page, 3);
}
const state = (page) => page.evaluate((P) => {
  const d = document.querySelector(`dialog.${P}-viewer`);
  const stage = d.querySelector(`.${P}-stage`);
  const layer = d.querySelector(`.${P}-layer`);
  const fig = layer.querySelector(`.${P}`);
  const sizer = d.querySelector(`.${P}-sizer`);
  const pad = parseFloat(getComputedStyle(sizer).paddingTop);
  const m = /scale\(([\d.]+)\)/.exec(layer.style.transform);
  return {
    level: d.querySelector(`.${P}-level > span`).textContent,
    zoom: m ? Number(m[1]) : 1,
    width: fig.offsetWidth, height: fig.offsetHeight, layout: fig.getAttribute("data-layout"),
    stage: { w: stage.clientWidth, h: stage.clientHeight, left: stage.scrollLeft, top: stage.scrollTop }, pad,
    dialog: d.getBoundingClientRect().toJSON(), radius: getComputedStyle(d).borderTopLeftRadius,
    shadow: getComputedStyle(d).boxShadow, border: getComputedStyle(d).borderTopWidth,
  };
}, P);
const levelOf = async (page) => Number((await page.locator(`.${P}-level > span`).textContent()).replace("%", ""));

describe("the button", () => {
  test("Expand follows View as list in every figure's foot, in words; zoom: false leaves it out; the server's HTML has none", async () => {
    const { page, errors } = await viewerPage();
    for (const key of KEYS) {
      const foot = await page.locator(`#fig-${key} .${P}-foot > button`).evaluateAll((els) => els.map((e) => [e.className, e.textContent, e.getAttribute("aria-haspopup")]));
      assert.ok(foot[0][0].includes(`${P}-toggle`), `${key}: View as list is first`);
      assert.ok(foot[1][0].includes(`${P}-expand`) && foot[1][1] === "Expand" && foot[1][2] === "dialog", `${key}: Expand is second, with its words`);
    }
    await page.evaluate((data) => window.__set([{ key: "schema", type: "schema", props: { ...(({ type, ...p }) => p)(data.schema), zoom: false } }]), DATA);
    await frames(page);
    assert.equal(await page.locator(`.${P}-expand`).count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
    // Before script: the server's markup has no Expand.
    const B = await import(path.join(pkg, "dist", "index.js"));
    const React = require("react");
    const { type, ...props } = DATA.architecture;
    const html = renderToString(React.createElement(B.ArchitectureDiagram, props));
    assert.ok(!html.includes(`${P}-expand`));
  });
  test("on touch the button is at least 44px tall", async () => {
    const { page } = await viewerPage({ width: 390, height: 844, touch: true });
    const h = await page.locator(`#fig-architecture .${P}-expand`).evaluate((e) => e.getBoundingClientRect().height);
    assert.ok(h >= 44, `${h}`);
    await page.close();
  });
});

describe("the dialog", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: at 1440 by 900 the window less 16, radius 12; Esc, Close and the scrim close it and focus returns to Expand; the page does not scroll`, async () => {
      const { page, errors } = await viewerPage({ theme });
      await open(page, "architecture");
      const s = await state(page);
      assert.deepEqual([Math.round(s.dialog.x), Math.round(s.dialog.y), Math.round(s.dialog.width), Math.round(s.dialog.height)], [16, 16, 1408, 868]);
      assert.equal(s.radius, "12px");
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), "hidden");
      const y0 = await page.evaluate(() => scrollY);
      await page.mouse.move(5, 450);
      await page.mouse.wheel(0, 400);
      await frames(page, 3);
      assert.equal(await page.evaluate(() => scrollY), y0, "the page behind does not scroll");
      const isFocused = () => page.evaluate((P) => document.activeElement?.classList.contains(`${P}-expand`) && document.activeElement.closest("#fig-architecture") !== null, P);
      await page.keyboard.press("Escape");
      await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
      assert.ok(await isFocused(), "Esc returns focus to Expand");
      await open(page, "architecture");
      await page.locator(`dialog.${P}-viewer .basalt-sheet-close`).click();
      await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
      assert.ok(await isFocused(), "Close returns focus to Expand");
      await open(page, "architecture");
      await page.mouse.click(5, 450);
      await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
      assert.ok(await isFocused(), "the scrim returns focus to Expand");
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
  test("at 390 by 844 it is the whole window, with no radius, rim or shadow", async () => {
    const { page } = await viewerPage({ width: 390, height: 844, touch: true });
    await open(page, "schema", { tap: true });
    const s = await state(page);
    assert.deepEqual([Math.round(s.dialog.x), Math.round(s.dialog.y), Math.round(s.dialog.width), Math.round(s.dialog.height)], [0, 0, 390, 844]);
    assert.equal(s.radius, "0px");
    assert.equal(s.shadow, "none");
    assert.equal(s.border, "0px");
    await page.close();
  });
});

describe("the layout width and Fit", () => {
  for (const [w, h] of [[390, 844], [1440, 900], [1920, 1080]]) {
    test(`at ${w} by ${h}: each CIMIP figure is drawn at its layout width and opens at Fit, the whole drawing in the stage's padding and 1% more would not be, never over 200%`, async () => {
      const { page, errors } = await viewerPage({ width: w, height: h, touch: w < 720 });
      for (const key of KEYS) {
        await open(page, key, { tap: w < 720 });
        const s = await state(page);
        assert.equal(s.layout, "drawn", `${key} at ${w}`);
        assert.equal(s.width, w < 720 ? LAYOUT[key] : 1104, `${key} at ${w}: the layout width`);
        const fit = Math.min(2, Math.floor(Math.min((s.stage.w - 2 * s.pad) / s.width, (s.stage.h - 2 * s.pad) / s.height) * 100 + 1e-6) / 100);
        assert.ok(Math.abs(s.zoom - fit) < 1e-6, `${key} at ${w}: opens at ${s.zoom}, Fit is ${fit}`);
        assert.ok(s.width * s.zoom <= s.stage.w - 2 * s.pad + 0.01 && s.height * s.zoom <= s.stage.h - 2 * s.pad + 0.01, `${key} at ${w}: inside the padding`);
        if (fit < 2) assert.ok(s.width * (fit + 0.01) > s.stage.w - 2 * s.pad || s.height * (fit + 0.01) > s.stage.h - 2 * s.pad, `${key} at ${w}: 1% more would not fit`);
        // The limits: Fit or 100%, whichever is less, and 400%.
        for (let i = 0; i < 14; i++) await page.locator(`dialog.${P}-viewer button[aria-label="Zoom out"]`).click({ force: true });
        assert.equal(await levelOf(page), Math.round(Math.min(fit, 1) * 100), `${key} at ${w}: the lower limit`);
        for (let i = 0; i < 14; i++) await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click({ force: true });
        assert.equal(await levelOf(page), 400);
        if (w < 720) await page.locator(`dialog.${P}-viewer .basalt-sheet-close`).tap(); else await page.keyboard.press("Escape");
        await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
      }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
  test("a figure with no drawn layout holds its stack, and a stack with no lines has its list open", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    // Two cards whose one line would pass through a third: every drawn layout is refused, and the stack draws no lines.
    await page.evaluate(() => window.__set([{ key: "bad", type: "architecture", props: { title: "Refused", summary: "A figure with no drawn layout.", legend: { plain: "Call" },
      nodes: [{ id: "a", name: "A", col: 1, row: 1 }, { id: "b", name: "B", col: 2, row: 1 }, { id: "c", name: "C", col: 3, row: 1 }],
      edges: [{ from: "a", to: "c", fromSide: "right", toSide: "left", kind: "plain" }] } }]));
    await frames(page);
    const pageLayout = await page.locator("#fig-bad").getAttribute("data-layout");
    await open(page, "bad");
    const s = await state(page);
    assert.equal(s.layout, pageLayout === "drawn" ? "drawn" : "stacked");
    await page.close();
  });
});

describe("zoom", () => {
  test("from each ladder value Zoom in and Zoom out land on the next; a button at a limit is aria-disabled, mounted and focused; Fit is disabled at Fit; the level never moves the buttons", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await open(page, "schema");
    const zin = page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`);
    const zout = page.locator(`dialog.${P}-viewer button[aria-label="Zoom out"]`);
    const fit = page.locator(`dialog.${P}-viewer .${P}-fit`);
    assert.equal(await fit.getAttribute("aria-disabled"), "true");
    const x0 = await zin.evaluate((e) => e.getBoundingClientRect().x);
    const fitLevel = await levelOf(page);
    let at = fitLevel;
    while (at < 400) {
      await zin.focus();
      await page.keyboard.press("Enter");
      const next = await levelOf(page);
      assert.equal(next, LADDER.find((v) => v > at + 0.5), `in from ${at}`);
      assert.equal(await zin.evaluate((e) => e.getBoundingClientRect().x), x0, `the level ${next}% moved the button`);
      at = next;
    }
    assert.equal(await zin.getAttribute("aria-disabled"), "true");
    assert.ok(await zin.evaluate((e) => document.activeElement === e), "a button at its limit keeps focus");
    while (at > Math.min(fitLevel, 100)) {
      await zout.click();
      const next = await levelOf(page);
      const want = [...LADDER].reverse().find((v) => v < at - 0.5);
      assert.equal(next, want === undefined || want < Math.min(fitLevel, 100) ? Math.min(fitLevel, 100) : want, `out from ${at}`);
      at = next;
    }
    assert.equal(await zout.getAttribute("aria-disabled"), "true");
    await page.close();
  });

  test("a step lands in one frame: the layer has no transition or animation, with and without reduced motion", async () => {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const { page } = await viewerPage({ media: { reducedMotion } });
      await open(page, "architecture");
      const layer = page.locator(`dialog.${P}-viewer .${P}-layer`);
      assert.equal(await layer.evaluate((e) => getComputedStyle(e).transitionDuration), "0s");
      await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click();
      assert.equal(await layer.evaluate((e) => e.getAnimations({ subtree: true }).length), 0);
      await page.close();
    }
  });

  test("what holds still: the stage's middle under a button and a key, the pointer under Ctrl and the wheel, within a pixel", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await open(page, "schema");
    // A drawing point at the stage's middle, and where it is after a step.
    const at = (cx, cy) => page.evaluate(([P, cx, cy]) => {
      const layer = document.querySelector(`dialog.${P}-viewer .${P}-layer`);
      const r = layer.getBoundingClientRect();
      const z = Number(/scale\(([\d.]+)\)/.exec(layer.style.transform)?.[1] ?? 1);
      return { x: (cx - r.left) / z, y: (cy - r.top) / z };
    }, [P, cx, cy]);
    const middle = await page.locator(`dialog.${P}-viewer .${P}-stage`).evaluate((s) => { const r = s.getBoundingClientRect(); return { x: r.left + s.clientWidth / 2, y: r.top + s.clientHeight / 2 }; });
    await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click();
    await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click();
    const before = await at(middle.x, middle.y);
    await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click();
    let after = await at(middle.x, middle.y);
    assert.ok(Math.abs(before.x - after.x) <= 1 && Math.abs(before.y - after.y) <= 1, `button: ${JSON.stringify([before, after])}`);
    await page.locator(`dialog.${P}-viewer .${P}-stage`).focus();
    const k0 = await at(middle.x, middle.y);
    await page.keyboard.press("=");
    after = await at(middle.x, middle.y);
    assert.ok(Math.abs(k0.x - after.x) <= 1 && Math.abs(k0.y - after.y) <= 1, "key");
    const pointer = { x: middle.x - 300, y: middle.y - 120 };
    await page.mouse.move(pointer.x, pointer.y);
    const w0 = await at(pointer.x, pointer.y);
    const l0 = await levelOf(page);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, 20);
    await page.keyboard.up("Control");
    await frames(page);
    const w1 = await at(pointer.x, pointer.y);
    assert.ok((await levelOf(page)) < l0, "Ctrl and the wheel zoom out");
    assert.ok(Math.abs(w0.x - w1.x) <= 1 && Math.abs(w0.y - w1.y) <= 1, `wheel: ${JSON.stringify([w0, w1])}`);
    await page.close();
  });

  test("a pinch zooms about the midpoint of two fingers, by the ratio of their spread", async () => {
    const { page } = await viewerPage({ width: 390, height: 844, touch: true, scale: 1 });
    await open(page, "architecture", { tap: true });
    const z0 = (await state(page)).zoom;
    const box = await page.locator(`dialog.${P}-viewer .${P}-stage`).boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const at = () => page.evaluate(([P, cx, cy]) => { const layer = document.querySelector(`dialog.${P}-viewer .${P}-layer`); const r = layer.getBoundingClientRect(); const z = Number(/scale\(([\d.]+)\)/.exec(layer.style.transform)?.[1] ?? 1); return { x: (cx - r.left) / z, y: (cy - r.top) / z }; }, [P, cx, cy]);
    const p0 = await at();
    const cdp = await page.context().newCDPSession(page);
    const pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(20) });
    for (let d = 22; d <= 40; d += 2) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(d) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await frames(page);
    const z1 = (await state(page)).zoom;
    assert.ok(Math.abs(z1 - Math.min(4, z0 * 2)) < 0.02, `${z0} -> ${z1}`);
    const p1 = await at();
    assert.ok(Math.abs(p0.x - p1.x) <= 1 && Math.abs(p0.y - p1.y) <= 1, `${JSON.stringify([p0, p1])}`);
    await page.close();
  });

  test("keys: + = - and 0 work with focus on the stage or a card and do nothing on a button; the arrows move between cards and bring the card into view", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await open(page, "architecture");
    const fitLevel = await levelOf(page);
    assert.ok(await page.evaluate((P) => document.activeElement?.classList.contains(`${P}-stage`), P), "focus opens on the stage");
    await page.keyboard.press("+");
    assert.ok((await levelOf(page)) > fitLevel);
    await page.keyboard.press("0");
    assert.equal(await levelOf(page), fitLevel);
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate((P) => Boolean(document.activeElement?.closest(`dialog .${P}-node`)), P), "the roving stop is after the stage");
    await page.keyboard.press("=");
    const zoomed = await levelOf(page);
    assert.ok(zoomed > fitLevel);
    await page.keyboard.press("-");
    assert.ok((await levelOf(page)) < zoomed);
    for (let i = 0; i < 4; i++) await page.keyboard.press("=");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    const seen = await page.evaluate((P) => { const s = document.querySelector(`dialog .${P}-stage`); const n = document.activeElement.getBoundingClientRect(); const r = s.getBoundingClientRect(); return n.left >= r.left && n.right <= r.left + s.clientWidth && n.top >= r.top && n.bottom <= r.top + s.clientHeight; }, P);
    assert.ok(seen, "the focused card is in view");
    await page.locator(`dialog.${P}-viewer .${P}-fit`).focus();
    const l = await levelOf(page);
    await page.keyboard.press("=");
    assert.equal(await levelOf(page), l, "a key on a button does nothing");
    await page.close();
  });
});

describe("pan", () => {
  test("a drag past 4px scrolls the stage one for one and selects nothing; a press that does not travel is a click; the plain wheel scrolls; nothing continues after the pointer lifts", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await open(page, "schema");
    for (let i = 0; i < 3; i++) await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click();
    const s0 = (await state(page)).stage;
    const box = await page.locator(`dialog.${P}-viewer .${P}-stage`).boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 100, y - 60, { steps: 10 });
    await page.mouse.up();
    const s1 = (await state(page)).stage;
    assert.equal(s1.left - s0.left, 100);
    assert.equal(s1.top - s0.top, 60);
    assert.equal(await page.evaluate(() => String(getSelection())), "");
    await frames(page, 5);
    assert.deepEqual((await state(page)).stage, s1, "no momentum");
    await page.mouse.wheel(0, 80);
    await frames(page);
    assert.ok((await state(page)).stage.top > s1.top, "the plain wheel scrolls");
    // A press that does not travel is a click: hovering traces, and a click on a card focuses nothing new but does not pan.
    const s2 = (await state(page)).stage;
    await page.mouse.click(x, y);
    assert.deepEqual((await state(page)).stage, s2);
    await page.close();
  });
  test("on touch one finger pans the stage", async () => {
    const { page } = await viewerPage({ width: 390, height: 844, touch: true });
    await open(page, "schema", { tap: true });
    await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).tap();
    await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).tap();
    const s0 = (await state(page)).stage;
    const box = await page.locator(`dialog.${P}-viewer .${P}-stage`).boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 1 }] });
    for (let k = 1; k <= 10; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx - 4 * k, y: cy - 3 * k, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const s1 = (await state(page)).stage;
    assert.equal(s1.left - s0.left, 40, JSON.stringify([s0, s1]));
    await page.close();
  });
});

describe("the ink", () => {
  test("is the same string at every level and the page figure's at that width; a resize and the fonts arriving while zoomed leave it a fresh layout's", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    const pageInk = await page.locator(`#fig-schema .${P}-ink`).innerHTML();
    await open(page, "schema");
    const ink = () => page.locator(`dialog.${P}-viewer .${P}-ink`).innerHTML();
    const normalise = (s) => s.replace(/dg[\w-]+?-/g, "ID-");
    const first = await ink();
    // The page's drawing snaps from its own origin: where that origin is on whole pixels the strings are equal; otherwise every number is within the
    // half pixel of a snap.
    const whole = await page.locator(`#fig-schema .${P}-drawing`).evaluate((d) => { const r = d.getBoundingClientRect(); return Number.isInteger(r.left) && Number.isInteger(r.top); });
    if (whole) assert.equal(normalise(first), normalise(pageInk), "the viewer's ink is the page's at 1104");
    else {
      const nums = (s) => normalise(s).match(/-?\d+(\.\d+)?/g).map(Number);
      const [a, b] = [nums(first), nums(pageInk)];
      assert.equal(a.length, b.length);
      assert.ok(a.every((v, k) => Math.abs(v - b[k]) <= 1), "the viewer's ink is the page's at 1104, within a snap");
    }
    for (let i = 0; i < 6; i++) {
      await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click();
      assert.equal(await ink(), first, `at ${await levelOf(page)}%`);
    }
    await page.evaluate(async () => { document.fonts.dispatchEvent?.(new Event("loadingdone")); });
    await page.setViewportSize({ width: 1400, height: 900 });
    await frames(page, 4);
    assert.equal(normalise(await ink()), normalise(first), "a resize while zoomed keeps a fresh layout's ink");
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`${theme}: sharpness: a region of the layer at 300% on a 1x screen equals the same region at 100% on a 3x screen; no will-change, viewBox scaling, zoom, canvas or image`, async () => {
      for (const key of ["schema", "architecture"]) {
        const a = await viewerPage({ theme, width: 1440, height: 900, scale: 1 });
        await open(a.page, key);
        await a.page.locator(`dialog.${P}-viewer .${P}-stage`).focus();
        // From Fit, step to 300% with the keys, then read a region the zoom shows from the layer's top start.
        for (let i = 0; i < 12 && (await levelOf(a.page)) < 300; i++) await a.page.keyboard.press("=");
        assert.equal(await levelOf(a.page), 300);
        await a.page.locator(`dialog.${P}-viewer .${P}-stage`).evaluate((s) => { s.scrollLeft = 0; s.scrollTop = 0; });
        const layerBox = await a.page.locator(`dialog.${P}-viewer .${P}-layer`).boundingBox();
        const clip = { x: Math.round(layerBox.x), y: Math.round(layerBox.y), width: 600, height: 300 };
        const big = await pixels(a.page, clip);
        const props = await a.page.locator(`dialog.${P}-viewer .${P}-layer`).evaluate((l) => ({ will: getComputedStyle(l).willChange, zoom: getComputedStyle(l).zoom, canvas: l.querySelectorAll("canvas, img:not(.basalt-diagram-mark img)").length, views: [...l.querySelectorAll("svg[viewBox]")].filter((s) => { const v = s.getAttribute("viewBox").split(/\s+/).map(Number); return Math.abs(v[2] - s.width.baseVal.value) > 0.5 || Math.abs(v[3] - s.height.baseVal.value) > 0.5; }).length }));
        assert.equal(props.will, "auto");
        assert.equal(props.zoom, "1");
        assert.equal(props.canvas, 0);
        assert.equal(props.views, 0);
        await a.page.close();
        const b = await viewerPage({ theme, width: 1440, height: 900, scale: 3 });
        await open(b.page, key);
        await b.page.locator(`dialog.${P}-viewer .${P}-stage`).focus();
        for (let i = 0; i < 12 && (await levelOf(b.page)) > 100; i++) await b.page.keyboard.press("-");
        for (let i = 0; i < 12 && (await levelOf(b.page)) < 100; i++) await b.page.keyboard.press("=");
        assert.equal(await levelOf(b.page), 100);
        await b.page.locator(`dialog.${P}-viewer .${P}-stage`).evaluate((s) => { s.scrollLeft = 0; s.scrollTop = 0; });
        const lb = await b.page.locator(`dialog.${P}-viewer .${P}-layer`).boundingBox();
        const small = await pixels(b.page, { x: lb.x, y: lb.y, width: 200, height: 100 });
        assert.equal(big.length, small.length);
        let differ = 0;
        for (let i = 0; i < big.length; i++) if (big[i].some((c, k) => Math.abs(c - small[i][k]) > 8)) differ++;
        assert.ok(differ / big.length < 0.01, `${key}: ${differ} of ${big.length} pixels differ`);
        await b.page.close();
      }
    });
  }
});

describe("speech, focus and the trace", () => {
  test("the status line says the level once, duration-slower after the last change; a pinch of twenty moves is spoken once", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await open(page, "architecture");
    await page.evaluate((P) => { const s = document.querySelector(`dialog.${P}-viewer [role="status"]`); window.__said = []; new MutationObserver(() => window.__said.push(s.textContent)).observe(s, { childList: true, characterData: true, subtree: true }); }, P);
    assert.equal(await page.locator(`dialog.${P}-viewer [role="status"]`).textContent(), "", "opening says nothing");
    await page.locator(`dialog.${P}-viewer .${P}-stage`).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("=");
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => window.__said), [], "nothing while it changes");
    await page.waitForTimeout(400);
    const said = await page.evaluate(() => window.__said);
    assert.equal(said.length, 1);
    assert.equal(said[0], `Zoom ${await levelOf(page)}%`);
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`${theme}: focus opens on the stage with an inset ring; the order is Close, the stage, the roving stop, the foot; axe passes at Fit and at 400%`, async () => {
      const { page } = await viewerPage({ theme, width: 1440, height: 900 });
      await open(page, "architecture");
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const ring = await page.locator(`dialog.${P}-viewer .${P}-stage`).evaluate((s) => [document.activeElement === s, getComputedStyle(s).outlineOffset, getComputedStyle(s).outlineWidth]);
      assert.deepEqual(ring, [true, "-2px", "2px"]);
      await page.keyboard.press("Shift+Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Close");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      assert.ok(await page.evaluate((P) => Boolean(document.activeElement?.closest(`.${P}-node`)), P));
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Zoom out");
      await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
      await page.addScriptTag({ content: axeSource });
      const audit = () => page.evaluate(() => window.axe.run(document.querySelector("dialog"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")}`)));
      assert.deepEqual(await audit(), [], "at Fit");
      await page.locator(`dialog.${P}-viewer .${P}-stage`).focus();
      for (let i = 0; i < 10; i++) await page.keyboard.press("=");
      assert.deepEqual(await audit(), [], "at 400%");
      await page.close();
    });
  }

  test("a trace by hover and by focus works; there is no hint line for touch and no Clear highlight; no entrance or flow runs; the page's figure holds its loops while the viewer is open", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await page.evaluate((data) => window.__set([{ key: "arch", type: "architecture", props: { ...(({ type, ...p }) => p)(data.architecture), motion: "animated" } }]), DATA);
    await frames(page, 4);
    await open(page, "arch");
    assert.ok(await page.locator("#fig-arch").evaluate((f) => f.hasAttribute("data-viewing")));
    const node = page.locator(`dialog.${P}-viewer .${P}-node`).first();
    await node.hover();
    await frames(page);
    assert.ok(await page.locator(`dialog.${P}-viewer .${P}`).evaluate((f) => f.hasAttribute("data-tracing")), "hover traces");
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}`).getAttribute("data-entrance"), null, "no entrance");
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-flow`).count(), 0, "no flow");
    assert.equal(await page.locator(`dialog.${P}-viewer :is(.${P}-clear, .${P}-play, .${P}-pause)`).count(), 0);
    await page.keyboard.press("Escape");
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    assert.ok(!(await page.locator("#fig-arch").evaluate((f) => f.hasAttribute("data-viewing"))));
    await page.close();
  });

  test("View as list puts the list in the stage and disables the zoom controls; Hide the list returns the drawing at its zoom and place", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await open(page, "schema");
    for (let i = 0; i < 3; i++) await page.locator(`dialog.${P}-viewer button[aria-label="Zoom in"]`).click();
    await page.locator(`dialog.${P}-viewer .${P}-stage`).evaluate((s) => { s.scrollLeft = 120; s.scrollTop = 80; });
    const before = await state(page);
    const toggle = page.locator(`dialog.${P}-viewer .${P}-toggle`);
    await toggle.click();
    assert.equal(await toggle.textContent(), "Hide the list");
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-viewer-list`).isVisible(), true);
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-sizer`).isVisible(), false);
    for (const label of ["Zoom out", "Zoom in"]) assert.equal(await page.locator(`dialog.${P}-viewer button[aria-label="${label}"]`).getAttribute("aria-disabled"), "true");
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-stage`).evaluate((s) => getComputedStyle(s).touchAction), "pan-y");
    await toggle.click();
    const back = await state(page);
    assert.equal(back.level, before.level);
    assert.deepEqual([back.stage.left, back.stage.top], [before.stage.left, before.stage.top]);
    await page.close();
  });

  test("print with the viewer open: the dialog is not displayed, the page's figure is", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900 });
    await open(page, "architecture");
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(`dialog.${P}-viewer`).evaluate((d) => getComputedStyle(d).display), "none");
    assert.notEqual(await page.locator("#fig-architecture").evaluate((f) => getComputedStyle(f).display), "none");
    await page.close();
  });

  test("forced colours: the viewer's figure draws its geometry, and the level is CanvasText", async () => {
    const { page } = await viewerPage({ width: 1440, height: 900, media: { forcedColors: "active" } });
    await open(page, "architecture");
    const s = await state(page);
    assert.equal(s.layout, "drawn");
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-level`).evaluate((e) => getComputedStyle(e).color), await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "CanvasText"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }));
    await page.close();
  });
});
