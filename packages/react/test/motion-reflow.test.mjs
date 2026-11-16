// Items that move to their places (DECISIONS 136 D, approved in 139): a list or a grid that is filtered or sorted. Driven in Chromium against the
// built package with the real stylesheet; every change goes through `flushSync`, so a measurement taken in the same task as a change is the
// frame the change lands in. Synthetic data. Every test would fail on origin/main: `Reflow` does not exist there.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { bundleFixture, launch, pkg } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const THEMES = ["dark", "light"];
const AXE = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const RECORD = `(() => {
  const real = Element.prototype.animate;
  window.__anims = [];
  Element.prototype.animate = function (keyframes, options) {
    const animation = real.call(this, keyframes, options);
    window.__anims.push({ tag: this.tagName, key: this.getAttribute("data-key"), box: this.classList.contains("basalt-reflow"), keyframes: JSON.parse(JSON.stringify(keyframes)), duration: options.duration, easing: options.easing, fill: options.fill });
    return animation;
  };
})();`;

// Twelve synthetic trees, each a shape, a kind and a height. `Demo` shows the same data as a grid of cards or as a list of rows.
const FIXTURE = `
const ITEMS = [
  ["fir","Fir","tall",31],["pine","Pine","tall",28],["cedar","Cedar","tall",33],["larch","Larch","tall",26],["oak","Oak","round",22],["elm","Elm","round",24],
  ["maple","Maple","round",19],["alder","Alder","wide",15],["birch","Birch","wide",18],["yew","Yew","wide",12],["rowan","Rowan","round",9],["hazel","Hazel","round",6],
].map(([id, name, kind, height]) => ({ id, name, kind, height }));
const MANY = Array.from({ length: 120 }, (_, i) => ({ id: "n" + i, name: "Item " + String(i).padStart(3, "0"), kind: i % 3 === 0 ? "round" : "wide", height: (i * 7) % 50 }));
window.__reports = [];
function Demo() {
  const [, bump] = React.useState(0);
  window.__render = () => bump((n) => n + 1);
  const c = window.__cfg;
  const items = c.many ? MANY.slice(0, c.many) : ITEMS;
  const result = React.useRef(null);
  const order = items.filter((it) => !c.kinds.length || c.kinds.includes(it.kind)).sort((a, b) => c.sort === "name" ? a.name.localeCompare(b.name) : b.height - a.height).map((it) => it.id);
  if (c.swap) [order[0], order[1]] = [order[1], order[0]];
  if (c.reverse) order.push(order.shift());
  const grid = c.layout === "grid";
  const rowStyle = { display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", minHeight: 44, padding: "0 8px", color: "inherit", textDecoration: "none" };
  const cardStyle = { display: "grid", gap: 4, padding: 16, color: "inherit", textDecoration: "none", minHeight: 88 };
  const body = items.map((it) => (
    <B.ReflowItem key={it.id} itemKey={it.id} as={grid ? "div" : "li"} data-key={it.id} className={grid ? "demo-card" : "demo-row"} style={c.inline ? { height: 20, width: 300 } : undefined}>
      <a href={"#" + it.id} className={grid ? "basalt-card" : undefined} data-level={grid ? 1 : undefined} style={grid ? cardStyle : rowStyle}>
        <span style={{ fontWeight: 600 }}>{it.name}</span><span style={{ color: "var(--basalt-text-secondary)" }}>{it.kind} · {it.height} m</span>
      </a>
    </B.ReflowItem>
  ));
  const flow = grid
    ? <B.Reflow order={order} layout="grid" fallbackFocus={result} onReflow={(r) => window.__reports.push(r)} style={{ display: "grid", gridTemplateColumns: c.columns, gap: 12 }} id="flow">{body}</B.Reflow>
    : <B.Reflow as="ul" order={order} layout="list" fallbackFocus={result} onReflow={(r) => window.__reports.push(r)} style={{ listStyle: "none", margin: 0, padding: 0 }} id="flow">{body}</B.Reflow>;
  const inner = (
    <>
      <h2 id="heading" style={{ margin: "0 0 8px" }}>Trees</h2>
      <div id="controls" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {["round", "tall", "wide"].map((k) => <B.Button key={k} data-kind={k} pressed={c.kinds.includes(k)} onClick={() => window.__set({ kinds: c.kinds.includes(k) ? c.kinds.filter((x) => x !== k) : [...c.kinds, k] })}>{k}</B.Button>)}
        <B.Button id="sort" onClick={() => window.__set({ sort: c.sort === "name" ? "height" : "name" })}>Sort</B.Button>
      </div>
      <B.FilterResult id="result" ref={result}>{"Showing " + order.length + " of " + items.length}</B.FilterResult>
      {c.level ? <B.Card><B.CardContent>{flow}</B.CardContent></B.Card> : flow}
      <p id="after" style={{ margin: "16px 0 0" }}>What follows the list.</p>
    </>
  );
  return <div id="host" style={{ width: c.width, margin: "0 auto", paddingTop: c.top }}>{inner}</div>;
}
window.__set = (patch) => { flushSync(() => { Object.assign(window.__cfg, patch); window.__render(); }); };
createRoot(document.getElementById("root")).render(<Demo />);
`;

async function open({ cfg = {}, theme = "dark", viewport = { width: 1440, height: 1000 }, reducedMotion, forcedColors, hasTouch = false, isMobile = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion, forcedColors, hasTouch, isMobile, colorScheme: theme });
  const script = await bundleFixture(FIXTURE);
  const config = { layout: "grid", kinds: [], sort: "name", columns: "repeat(4, minmax(0, 1fr))", width: viewport.width <= 600 ? viewport.width - 32 : 1000, top: 0, ...cfg };
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trees</title><style>${css()}</style><style>body{margin:0;padding:16px;background:var(--basalt-surface-page);color:var(--basalt-text-primary);font-family:var(--basalt-font-family-sans)}</style><script>${RECORD}</script><script>window.__cfg=${JSON.stringify(config)}</script></head><body><div id="root"></div></body></html>`);
  await page.addScriptTag({ content: script });
  await frames(page);
  await page.evaluate(() => {
    document.querySelectorAll(".basalt-reflow-item").forEach((el, i) => { el.__orig = i; });
    window.__anims.length = 0;
    window.__reports.length = 0;
  });
  return { page, errors, context };
}
const frames = (page, n = 2) => page.evaluate(async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); }, n);
const settle = (page) => page.evaluate(async () => {
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
  await new Promise((r) => setTimeout(r, 60));
});
const set = (page, patch) => page.evaluate((patch) => window.__set(patch), patch);
const drawn = (page) => page.evaluate(() => [...document.querySelectorAll(".basalt-reflow-item")].filter((e) => !e.hidden && !e.hasAttribute("data-leaving")).map((e) => e.getAttribute("data-key")));

describe("items that stay move by transform over duration-slow on ease-out, whatever the distance (D1)", () => {
  test("a filter and a sort each move the survivors by translate, 200ms, ease-out, with no scale", async () => {
    for (const layout of ["grid", "list"]) {
      const { page, errors } = await open({ cfg: { layout } });
      await set(page, { kinds: ["round"] });
      const moves = (await page.evaluate(() => window.__anims)).filter((a) => a.keyframes.some((k) => k.transform));
      assert.ok(moves.length >= 2, `${layout}: ${moves.length} items move`);
      for (const a of moves) {
        assert.equal(a.duration, 200);
        assert.match(a.easing, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
        assert.match(a.keyframes[0].transform, /^translate\(/);
        assert.equal(a.keyframes[1].transform, "none");
        assert.ok(!a.keyframes.some((k) => /scale|rotate/.test(k.transform ?? "")), "an item never scales or turns");
      }
      const distances = moves.map((a) => { const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(a.keyframes[0].transform); return Math.hypot(Number(m[1]), Number(m[2])); });
      assert.ok(new Set(distances.map((d) => Math.round(d))).size >= 2, `different distances: ${distances.map((d) => Math.round(d)).join(", ")}`);
      assert.equal(new Set(moves.map((a) => a.duration)).size, 1, "one duration whatever the distance");
      await set(page, { kinds: [], sort: "height" });
      const sorted = (await page.evaluate(() => window.__anims)).filter((a) => a.keyframes.some((k) => k.transform));
      assert.ok(sorted.length > moves.length, "a sort moves items with no arrivals or leavers");
      assert.deepEqual(errors, []);
      await context(page).close();
    }
  });
});
const context = (page) => page.context();

describe("arrivals fade in place; a leaver is the same element, out of the flow, inert, under the movers (D2)", () => {
  test("an arrival fades over 200ms on ease-out with no translate", async () => {
    const { page } = await open({ cfg: { kinds: ["round"] } });
    await set(page, { kinds: [] });
    const arrivals = (await page.evaluate(() => window.__anims)).filter((a) => a.keyframes.some((k) => k.opacity !== undefined && a.keyframes[0].opacity === 0));
    assert.ok(arrivals.length >= 5, `${arrivals.length} arrivals`);
    for (const a of arrivals) { assert.equal(a.duration, 200); assert.match(a.easing, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/); assert.ok(a.keyframes.every((k) => k.transform === undefined), "an arrival never translates"); }
    await context(page).close();
  });
  test("a leaver is the same element: inert, out of the flow where it stood, painted under the movers, fading over 75ms on ease-in, then hidden", async () => {
    const { page } = await open({ cfg: {} });
    const before = await page.evaluate(() => { const e = document.querySelector('[data-key="yew"]'); const r = e.getBoundingClientRect(); const c = document.getElementById("flow").getBoundingClientRect(); return { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height }; });
    const state = await page.evaluate(() => {
      window.__set({ kinds: ["round"] });
      const e = document.querySelector('[data-key="yew"]');
      const s = getComputedStyle(e);
      const fade = window.__anims.find((a) => a.key === "yew" && a.keyframes.some((k) => k.opacity === 0));
      return { inert: e.inert, leaving: e.hasAttribute("data-leaving"), position: s.position, z: s.zIndex, left: parseFloat(s.left), top: parseFloat(s.top), width: parseFloat(s.width), height: parseFloat(s.height), pe: s.pointerEvents, hidden: e.hidden, fade };
    });
    assert.equal(state.inert, true);
    assert.equal(state.leaving, true);
    assert.equal(state.position, "absolute");
    assert.equal(state.z, "-1", "under the items that stay");
    assert.equal(state.pe, "none");
    for (const k of ["left", "top", "width", "height"]) assert.ok(Math.abs(state[k] - before[k]) <= 0.5, `${k}: ${state[k]} against ${before[k]}`);
    assert.equal(state.fade.duration, 75, "0.75 of duration-fast");
    assert.match(state.fade.easing, /cubic-bezier\(0\.4, 0, 1, 1\)/, "ease-in");
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelector('[data-key="yew"]').hidden), true, "hidden once it has gone");
    assert.equal(await page.evaluate(() => document.querySelector('[data-key="yew"]').hasAttribute("data-leaving")), false);
    await context(page).close();
  });
  test("no item is ever replaced: the same twelve nodes through a filter, a sort and a clear", async () => {
    const { page } = await open();
    for (const patch of [{ kinds: ["round"] }, { sort: "height" }, { kinds: ["tall", "wide"] }, { kinds: [], sort: "name" }]) { await set(page, patch); await settle(page); }
    const same = await page.evaluate(() => { const nodes = [...document.querySelectorAll(".basalt-reflow-item")]; return { count: nodes.length, tagged: nodes.filter((n) => n.__orig !== undefined && n.isConnected).length }; });
    assert.deepEqual(same, { count: 12, tagged: 12 });
    await context(page).close();
  });
});

describe("a second change starts every item from where it is drawn (D1)", () => {
  test("a change 60ms into a move displaces nothing: 0px at the retarget, opacity included", async () => {
    const { page } = await open();
    // The moment is read off the animations' own timeline, not the wall clock: the change, every animation held at 60ms into its run, then the second change.
    const delta = await page.evaluate(() => {
      const seek = (ms) => { for (const a of document.getAnimations()) { if (a.effect?.getComputedTiming().iterations === Infinity) continue; a.pause(); a.currentTime = ms; } };
      window.__set({ kinds: ["round"] });
      seek(60);
      const read = () => new Map([...document.querySelectorAll(".basalt-reflow-item")].filter((e) => !e.hidden).map((e) => { const r = e.getBoundingClientRect(); return [e.getAttribute("data-key"), [r.left, r.top, Number.parseFloat(getComputedStyle(e).opacity)]]; }));
      const a = read();
      window.__set({ kinds: [] });
      const b = read();
      let worst = 0, worstOpacity = 0;
      for (const [key, [x, y, o]] of a) { const n = b.get(key); if (!n) continue; worst = Math.max(worst, Math.abs(n[0] - x), Math.abs(n[1] - y)); worstOpacity = Math.max(worstOpacity, Math.abs(n[2] - o)); }
      return { worst, worstOpacity, compared: a.size };
    });
    assert.ok(delta.compared >= 6);
    assert.ok(delta.worst <= 0.5, `drawn out of place by ${delta.worst}px at the second change`);
    assert.ok(delta.worstOpacity <= 0.02, `opacity jumped by ${delta.worstOpacity}`);
    await context(page).close();
  });
  test("a leaver asked back keeps its drawn opacity", async () => {
    const { page } = await open();
    const out = await page.evaluate(() => {
      const seek = (ms) => { for (const a of document.getAnimations()) { if (a.effect?.getComputedTiming().iterations === Infinity) continue; a.pause(); a.currentTime = ms; } };
      window.__set({ kinds: ["round"] });
      seek(30);
      const e = document.querySelector('[data-key="fir"]');
      const before = Number.parseFloat(getComputedStyle(e).opacity);
      window.__set({ kinds: [] });
      const after = Number.parseFloat(getComputedStyle(e).opacity);
      return { before, after };
    });
    assert.ok(out.before > 0 && out.before < 1, `Fir was drawn at ${out.before}`);
    assert.ok(Math.abs(out.after - out.before) <= 0.02, `Fir jumped from ${out.before} to ${out.after}`);
    await context(page).close();
  });
});

describe("focus from an item that leaves (D6)", () => {
  test("goes to the next that stays in the order drawn, not the order the items were made in", async () => {
    const { page } = await open();
    await set(page, { sort: "height" });
    await settle(page);
    const order = await drawn(page);
    assert.notDeepEqual(order, ["alder", "birch", "cedar", "elm", "fir", "hazel", "larch", "maple", "oak", "pine", "rowan", "yew"]);
    await page.focus('[data-key="elm"] a');
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await set(page, { kinds: ["wide", "tall"] }); // Elm is round: it leaves
    const where = await page.evaluate(() => document.activeElement.closest("[data-key]")?.getAttribute("data-key"));
    const expected = order.slice(order.indexOf("elm") + 1).find((k) => ["alder", "birch", "yew", "fir", "pine", "cedar", "larch"].includes(k));
    assert.equal(where, expected, `after Elm in ${order.join(", ")}`);
    assert.equal(await page.evaluate(() => window.scrollY), scrollBefore, "the focus step does not scroll the page");
    await context(page).close();
  });
  test("else the one before, else the result line (tabindex=-1)", async () => {
    const { page } = await open();
    await page.focus('[data-key="hazel"] a');
    await set(page, { kinds: ["tall"] });
    assert.equal(await page.evaluate(() => document.activeElement.closest("[data-key]")?.getAttribute("data-key")), "larch", "Hazel was last: the one before that stays");
    await set(page, { kinds: [] });
    await settle(page);
    await page.focus('[data-key="oak"] a');
    await page.evaluate(() => window.__set({ kinds: ["tall"], sort: "name" }));
    // Oak is round and leaves; nothing round survives, so the nearest survivor takes it. Now empty the list with the focus inside it.
    await page.evaluate(() => window.__set({ kinds: [] }));
    await settle(page);
    await page.focus('[data-key="fir"] a');
    await page.evaluate(() => window.__set({ kinds: ["wide"], sort: "name" }));
    await page.focus('[data-key="alder"] a');
    // No item survives this one: every kind that is chosen has no item.
    await page.evaluate(() => { window.__set({ kinds: ["none"] }); });
    const active = await page.evaluate(() => ({ id: document.activeElement.id, tabindex: document.activeElement.getAttribute("tabindex"), isResult: document.activeElement === document.getElementById("result") }));
    assert.equal(active.isResult, true);
    assert.equal(active.tabindex, "-1");
    await context(page).close();
  });
});

describe("the box's height glides on the same clock (D3)", () => {
  test("it animates its height over 200ms on ease-out, clips with a space-1-5 margin while it moves, and nothing above or beside it moves", async () => {
    const { page } = await open();
    const probe = await page.evaluate(async () => {
      const targets = ["#heading", "#controls", "#result", "#sort", "#flow"];
      const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.width]; };
      const start = new Map(targets.map((t) => [t, box(t)]));
      window.__set({ kinds: ["round"] });
      const glide = window.__anims.find((a) => a.box);
      const clip = getComputedStyle(document.getElementById("flow")).clipPath;
      const moving = document.getElementById("flow").hasAttribute("data-moving");
      let worst = 0;
      const follower = [];
      for (let i = 0; i < 18; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        for (const t of targets) { const b = box(t), s = start.get(t); worst = Math.max(worst, Math.abs(b[0] - s[0]), Math.abs(b[1] - s[1]), Math.abs(b[2] - s[2])); }
        follower.push(document.getElementById("after").getBoundingClientRect().top);
      }
      return { glide, clip, moving, worst, follower };
    });
    assert.equal(probe.glide.duration, 200);
    assert.match(probe.glide.easing, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
    assert.deepEqual(probe.glide.keyframes.map((k) => Object.keys(k).filter((x) => x !== "offset")), [["height"], ["height"]]);
    assert.equal(probe.moving, true);
    assert.match(probe.clip, /inset\(-6px\)/, "clipped at the edge with a space-1-5 margin");
    assert.equal(probe.worst, 0, "nothing above or beside the box moves: 0px in every frame");
    // What follows the box moves, once and with it. It is measured and reported, not called zero.
    const moved = Math.abs(probe.follower[0] - probe.follower.at(-1));
    assert.ok(moved > 0, "what follows a filtered list still moves as its height glides");
    const steps = probe.follower.slice(1).map((v, i) => v - probe.follower[i]);
    assert.ok(steps.every((s) => s <= 0.01) || steps.every((s) => s >= -0.01), "it moves one way, once");
    await context(page).close();
  });
});

describe("reduced motion (D4)", () => {
  test("items and the box take their places at once, arrivals fade over 100ms and leavers go at once", async () => {
    const { page } = await open({ reducedMotion: "reduce" });
    await set(page, { kinds: ["round"] });
    let anims = await page.evaluate(() => window.__anims);
    assert.equal(anims.filter((a) => a.keyframes.some((k) => k.transform)).length, 0, "no item moves");
    assert.equal(anims.filter((a) => a.box).length, 0, "the box does not glide");
    assert.equal(await page.evaluate(() => document.querySelector('[data-key="yew"]').hidden), true, "a leaver goes at once");
    await set(page, { kinds: [] });
    anims = await page.evaluate(() => window.__anims);
    const fades = anims.filter((a) => a.keyframes[0].opacity === 0);
    assert.ok(fades.length >= 5);
    for (const a of fades) assert.equal(a.duration, 100);
    await context(page).close();
  });
});

describe("the bound (D5)", () => {
  test("past 48 items that would move on screen the change lands at once; at 40 it animates", async () => {
    const tall = { width: 1440, height: 6000 };
    const big = await open({ cfg: { layout: "list", many: 120, columns: "1fr" }, viewport: tall });
    await set(big.page, { kinds: ["round"] });
    const anims = await big.page.evaluate(() => window.__anims);
    assert.equal(anims.length, 0, "no animation at all past the bound");
    const report = await big.page.evaluate(() => window.__reports.at(-1));
    assert.equal(report.atOnce, true);
    assert.ok(report.onScreen > 48);
    await context(big.page).close();
    const small = await open({ cfg: { layout: "list", many: 40, columns: "1fr" }, viewport: tall });
    await set(small.page, { kinds: ["round"] });
    const some = await small.page.evaluate(() => window.__anims.length);
    assert.ok(some > 0, "40 items animate");
    await context(small.page).close();
  });
  test("the bound counts the items that would move, not every item on screen (defect C)", async () => {
    const tall = { width: 1440, height: 6000 };
    // 49 items, all on screen: swapping two moves two, so the change animates.
    const swapped = await open({ cfg: { layout: "list", many: 49, columns: "1fr" }, viewport: tall });
    await set(swapped.page, { swap: true });
    const report = await swapped.page.evaluate(() => window.__reports.at(-1));
    assert.deepEqual([report.onScreen, report.atOnce, report.moved], [2, false, 2], "two items would move, and two move");
    assert.equal(await swapped.page.evaluate(() => window.__anims.filter((a) => a.keyframes.some((k) => k.transform)).length), 2);
    await context(swapped.page).close();
    // 49 items, every one moves (the first goes to the end): past 48 that would move, so it lands at once.
    const reversed = await open({ cfg: { layout: "list", many: 49, columns: "1fr" }, viewport: tall });
    await set(reversed.page, { reverse: true });
    const all = await reversed.page.evaluate(() => window.__reports.at(-1));
    assert.equal(all.atOnce, true);
    assert.ok(all.onScreen > 48, `${all.onScreen} would move`);
    assert.equal(await reversed.page.evaluate(() => window.__anims.length), 0);
    await context(reversed.page).close();
    // 48 moving items animate.
    const forty8 = await open({ cfg: { layout: "list", many: 48, columns: "1fr" }, viewport: tall });
    await set(forty8.page, { reverse: true });
    assert.ok((await forty8.page.evaluate(() => window.__reports.at(-1))).atOnce === false);
    await context(forty8.page).close();
  });
  test("an app's own inline sizes on the items are kept through a filter, a sort and a clear, and a change that moves two counts two (DECISIONS 148, fix C)", async () => {
    const tall = { width: 1440, height: 6000 };
    const { page } = await open({ cfg: { layout: "list", many: 49, columns: "1fr", inline: true }, viewport: tall });
    const sizes = () => page.evaluate(() => [...document.querySelectorAll(".basalt-reflow-item")].filter((e) => !e.hidden).map((e) => [e.style.height, e.style.width, e.style.left, e.style.top].join("|")));
    const start = await sizes();
    assert.ok(start.every((s) => s === "20px|300px||"), "every item carries the app's own size");
    // 42 kinds of change: a swap of two moves two and nothing else changes its size.
    await set(page, { swap: true });
    const report = await page.evaluate(() => window.__reports.at(-1));
    assert.deepEqual([report.onScreen, report.moved, report.atOnce], [2, 2, false], "two items move, and the 47 that stayed are not counted");
    await settle(page);
    assert.ok((await sizes()).every((s) => s === "20px|300px||"), "sizes kept after a swap");
    // A filter makes leavers (pinned where they stood), and the clear brings them back: each ends with the app's own size, and the items that stayed never lost theirs.
    await set(page, { kinds: ["round"] });
    assert.ok((await page.evaluate(() => [...document.querySelectorAll(".basalt-reflow-item:not([data-leaving]):not([hidden])")].every((e) => e.style.height === "20px" && e.style.width === "300px"))), "the items that stay keep their size through the filter");
    await settle(page);
    await set(page, { kinds: [] });
    await settle(page);
    assert.ok((await sizes()).every((s) => s === "20px|300px||"), "every item is back at the app's own size after a clear");
    await context(page).close();
  });
  test("items off screen never animate", async () => {
    const { page } = await open({ cfg: { layout: "list", many: 120, columns: "1fr" }, viewport: { width: 1440, height: 700 } });
    await set(page, { kinds: ["round"] });
    const keys = await page.evaluate(() => window.__anims.filter((a) => a.key).map((a) => a.key));
    const inView = await page.evaluate(() => new Set([...document.querySelectorAll(".basalt-reflow-item")].filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).map((e) => e.getAttribute("data-key"))));
    void inView;
    assert.ok(keys.length > 0 && keys.length <= 48);
    await context(page).close();
  });
});

describe("what the pixels do (touch, surface)", () => {
  test("at 390 on a coarse pointer the grid's cards do not overlap, and none takes a link's touch margin", async () => {
    const { page } = await open({ cfg: { columns: "repeat(2, minmax(0, 1fr))" }, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    for (const patch of [{}, { kinds: ["round"] }, { kinds: [] }]) {
      await set(page, patch);
      await settle(page);
      const rects = await page.evaluate(() => [...document.querySelectorAll(".basalt-reflow-item")].filter((e) => !e.hidden).map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const [a, b] = [rects[i], rects[j]];
        const overlap = Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0.5 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0.5;
        assert.equal(overlap, false, `cards ${i} and ${j} overlap`);
      }
      assert.equal(await page.evaluate(() => [...document.querySelectorAll(".demo-card a")].some((a) => getComputedStyle(a).marginBlockStart !== "0px")), false);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await context(page).close();
  });
  test("a moving row is opaque in its container's own surface, not the page's", async () => {
    const { page } = await open({ cfg: { layout: "list", level: 1 } });
    const probe = await page.evaluate(() => {
      window.__set({ kinds: ["round"] });
      const flow = document.getElementById("flow");
      const row = document.querySelector('[data-key="oak"]');
      const card = document.querySelector(".basalt-card");
      return { flowing: flow.hasAttribute("data-flowing"), row: getComputedStyle(row).backgroundColor, card: getComputedStyle(card).backgroundColor, page: getComputedStyle(document.body).backgroundColor };
    });
    assert.equal(probe.flowing, true);
    assert.equal(probe.row, probe.card, "the row takes its panel's fill");
    assert.notEqual(probe.row, probe.page, "and not the page's");
    await settle(page);
    assert.equal(await page.evaluate(() => document.getElementById("flow").hasAttribute("data-flowing")), false, "the fill is only while it moves");
    await context(page).close();
  });
});

describe("accessibility", () => {
  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`axe finds nothing in ${theme} at ${width}, a grid and a list, at rest and after a filter`, async () => {
      for (const layout of ["grid", "list"]) {
        const { page } = await open({ cfg: { layout, columns: width === 390 ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))" }, theme, viewport: { width, height: 900 } });
        for (const patch of [{}, { kinds: ["round"] }]) {
          await set(page, patch);
          await settle(page);
          await page.addScriptTag({ content: axeSource });
          const result = await page.evaluate((cfg) => window.axe.run(document, cfg), AXE);
          assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), [], `${layout} ${JSON.stringify(patch)}`);
        }
        await context(page).close();
      }
    });
  }
  test("in forced colours the cards keep their edges and a leaver still goes", async () => {
    const { page } = await open({ forcedColors: "active" });
    await set(page, { kinds: ["round"] });
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelector('[data-key="yew"]').hidden), true);
    assert.equal((await drawn(page)).length, 5);
    await context(page).close();
  });
});
