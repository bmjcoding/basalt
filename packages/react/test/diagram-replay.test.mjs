// "Draw again" (DECISIONS 405, G149, with the decider's answers to the final positions): an entrance that plays again, opt-in, started only by a press in
// the figure's own foot (its button, or an app's action calling the context's replay() inside the press). The foot's order and the button's presence, what
// a replay does in the frame of the press, the modes (the hold, reduced motion, forced colours, print, the viewer), sends and runs, the first-visit mark,
// focus when a motion button leaves, and the action's replay() lifetime. In Chromium against the built package; time is driven by seeking the figure's own
// animations, never by waiting. Written while tests are paused (DECISIONS 359): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg } from "./support.mjs";

const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The host: `window.__set(list)` draws { key, spec, actions, gap }; a spec's `type` picks the component and the rest are its props. An action's `does` says
// what its onSelect does with replay(): "now" (calls it at once), "twice" (twice at once), "await" (after `await Promise.resolve()`), "timeout" (from a
// setTimeout), "store" (keeps the context; `window.__late()` calls the stored replay later). Each call's answer is logged in `window.__replays`.
const HOST = `
import still from "./test/fixtures/cimip-diagrams.json";
import motion from "./test/fixtures/diagram-motion.json";
const C = { architecture: B.ArchitectureDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram, flowchart: B.FlowchartDiagram };
const animated = (key, extra = {}) => {
  const { flow = [], marks: _marks, ...keys } = motion.cimip[key];
  const spec = { ...structuredClone(still[key]), ...keys, ...extra };
  if (spec.edges) spec.edges = spec.edges.map((e) => (flow.some(([f, t]) => f === e.from && t === e.to) ? { ...e, flow: true } : e));
  return spec;
};
window.SPECS = { still, motion, animated, kit: (extra = {}) => ({ ...structuredClone(motion.kit), ...extra }) };
window.__replays = [];
let stored = null;
window.__late = () => { const got = stored ? stored.replay() : null; window.__replays.push({ late: got }); return got; };
const make = (list) => list?.map((a) => ({ label: a.label, onSelect: (ctx) => {
  const log = (how, got) => window.__replays.push({ label: a.label, how, got, viewer: ctx.viewer });
  if (a.does === "now") log("now", ctx.replay());
  if (a.does === "twice") { log("first", ctx.replay()); log("second", ctx.replay()); }
  if (a.does === "store") stored = ctx;
  if (a.does === "timeout") return new Promise((resolve) => setTimeout(() => { log("timeout", ctx.replay()); resolve(); }, 0));
  if (a.does === "await") return (async () => { await Promise.resolve(); log("await", ctx.replay()); })();
  return undefined;
} }));
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid" }}>{list.map(({ key, spec, actions, gap = 0 }) => { const { type, ...props } = spec; const X = C[type]; return <div key={key} style={{ marginTop: gap }}><X id={"fig-" + key} {...props} actions={make(actions)} /></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

/** A page of the host, as a production build (the fixtures'), or as an app's development build (`dev`), where the development errors are said. */
let devBundle;
async function replayPage({ theme = "dark", viewport = { width: 1440, height: 1000 }, dev = false, touch = false, ...rest } = {}) {
  const { page, errors } = await fixturePage(browser, dev ? "" : HOST, { theme, viewport, standards: true, hasTouch: touch, isMobile: touch, ...rest });
  const said = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") said.push(m.text()); });
  await page.addStyleTag({ content: PAGE });
  if (dev) {
    devBundle ??= (async () => {
      const esbuild = await import("esbuild");
      const built = await esbuild.build({
        stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js"; ${HOST}`, resolveDir: pkg, loader: "tsx" },
        bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"development"' },
      });
      return built.outputFiles[0].text;
    })();
    await page.addScriptTag({ content: await devBundle });
  }
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, said };
}
/** Draws figures: each item is { key, spec (an expression evaluated in the page over S), actions, gap }. */
async function draw(page, items) {
  await page.evaluate((items) => window.__set(items.map(({ key, spec, actions, gap }) => ({ key, gap, actions, spec: new Function("S", `return ${spec}`)(window.SPECS) }))), items);
  await frames(page, 4);
}
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 5000, polling: "raf" });
const entrance = (page, key) => page.evaluate((key) => document.getElementById(`fig-${key}`).getAttribute("data-entrance"), key);
const untilState = (page, key, value) => until(page, ([key, value]) => document.getElementById(`fig-${key}`)?.getAttribute("data-entrance") === value, [key, value]);
/** Every finite animation of the figure (the entrance, a leg, a rest) to its end. */
const finish = (page, key) => page.evaluate((key) => { for (const a of document.getElementById(`fig-${key}`).getAnimations({ subtree: true })) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish(); }, key);
/** Seeks every finite animation of the figure to `ms` on its clock, paused. */
const seek = (page, key, ms) => page.evaluate(([key, ms]) => { for (const a of document.getElementById(`fig-${key}`).getAnimations({ subtree: true })) if (a.effect?.getComputedTiming().iterations !== Infinity) { a.pause(); a.currentTime = ms; } }, [key, ms]);
const footWords = (page, key) => page.locator(`#fig-${key} .${P}-foot button`).evaluateAll((els) => els.filter((b) => !b.hidden).map((b) => b.textContent.trim()));
const replayButton = (page, key) => page.locator(`#fig-${key} .${P}-replay`);
/** The figure drawn to rest: its entrance played in view and finished. */
async function atRest(page, key) {
  await page.locator(`#fig-${key}`).scrollIntoViewIfNeeded();
  await until(page, (key) => ["running", "done"].includes(document.getElementById(`fig-${key}`)?.getAttribute("data-entrance")), key);
  await finish(page, key);
  await untilState(page, key, "done");
  await frames(page, 2);
}

describe("1. the foot and the button", () => {
  test("an architecture with a pulse and an app action: View as list, Expand, Draw again, Pause animations, the action; named with its figure", async () => {
    const { page, errors } = await replayPage();
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })`, actions: [{ label: "Copy link" }] }]);
    await page.waitForSelector(`#fig-kit .${P}-replay`);
    await page.waitForSelector(`#fig-kit .${P}-action`);
    assert.deepEqual(await footWords(page, "kit"), ["View as list", "Expand", "Draw again", "Pause animations", "Copy link"]);
    const named = await page.evaluate(() => { const b = document.querySelector("#fig-kit .basalt-diagram-replay"); const fig = document.getElementById("fig-kit"); return { id: b.id, labelledby: b.getAttribute("aria-labelledby"), title: fig.getAttribute("aria-labelledby"), variant: b.dataset.variant, size: b.dataset.size }; });
    assert.match(named.id, /-replay$/);
    assert.equal(named.labelledby, `${named.id} ${named.title}`, "its words, then the figure's title");
    assert.deepEqual([named.variant, named.size], ["secondary", "sm"]);
    assert.equal(await page.getByRole("button", { name: /^Draw again How the/ }).count(), 1);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a sequence with a run: Play the run, then Draw again; on touch each is at least 44px tall", async () => {
    // A sequence is stacked with no lines at 390, so it is read on a wide touch screen, where it is drawn.
    const { page } = await replayPage({ touch: true });
    await draw(page, [{ key: "sequence", spec: `S.animated("sequence", { replay: true })` }]);
    await page.waitForSelector(`#fig-sequence .${P}-replay`);
    const words = await footWords(page, "sequence");
    assert.deepEqual(words.filter((w) => w !== "Clear highlight"), ["View as list", "Expand", "Play the run", "Draw again"]);
    for (const cls of ["play", "replay"]) assert.ok((await page.locator(`#fig-sequence .${P}-${cls}`).boundingBox()).height >= 44, `${cls} is 44px on touch`);
    await page.close();
  });

  test("no figure gains it by default; a still figure with replay draws none and warns in development", async () => {
    const { page, said } = await replayPage({ dev: true });
    await draw(page, [{ key: "kit", spec: `S.kit()` }, { key: "still", spec: `{ ...S.still.architecture, replay: true }`, gap: 40 }]);
    await page.waitForSelector(`#fig-kit .${P}-pause`);
    assert.equal(await page.locator(`.${P}-replay`).count(), 0);
    assert.ok(said.some((s) => /replay is set on a still figure/.test(s)), said.join("\n"));
    await page.close();
  });

  test("its words and width never change: before, during and after a replay, and on a second press while one plays", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })` }]);
    await atRest(page, "kit");
    const box = () => replayButton(page, "kit").evaluate((b) => ({ words: b.textContent.trim(), width: b.getBoundingClientRect().width, disabled: b.disabled || b.getAttribute("aria-disabled") === "true" }));
    const rest = await box();
    await replayButton(page, "kit").click();
    assert.equal(await entrance(page, "kit"), "running");
    assert.deepEqual(await box(), rest);
    await replayButton(page, "kit").click();
    assert.equal(await entrance(page, "kit"), "running", "a press while it plays starts it over");
    assert.deepEqual(await box(), rest);
    assert.equal(rest.disabled, false);
    await page.close();
  });
});

describe("2. what a press does", () => {
  test("it plays from the first frame at once: running, never pending, every line masked at 0 and whole at the end, inside the limit", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })` }]);
    await atRest(page, "kit");
    await page.evaluate(() => { window.__states = []; new MutationObserver(() => window.__states.push(document.getElementById("fig-kit").getAttribute("data-entrance"))).observe(document.getElementById("fig-kit"), { attributes: true, attributeFilter: ["data-entrance"] }); });
    await replayButton(page, "kit").click();
    assert.equal(await entrance(page, "kit"), "running");
    await seek(page, "kit", 0);
    const masked = await page.evaluate(() => [...document.querySelectorAll("#fig-kit .basalt-diagram-edge")].every((g) => (g.getAttribute("mask") ?? "").startsWith("url(#")));
    assert.ok(masked, "every line is drawn on from its first frame");
    const limit = await page.evaluate(() => { const v = getComputedStyle(document.getElementById("fig-kit")).getPropertyValue("--basalt-duration-diagram-limit").trim(); return /ms$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000; });
    const end = await page.evaluate(() => Math.max(...document.getElementById("fig-kit").getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.effect.getComputedTiming().endTime)));
    assert.ok(end <= limit + 1, `ends at ${end}ms, inside ${limit}ms`);
    await finish(page, "kit");
    await untilState(page, "kit", "done");
    assert.ok(!(await page.evaluate(() => window.__states)).includes("pending"), "never pending");
    await page.close();
  });

  test("it starts wherever the figure is, without scrolling: the foot at the window's top", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })` }, { key: "pad", spec: `S.still.flowchart`, gap: 1400 }]);
    await atRest(page, "kit");
    await page.evaluate(() => { const foot = document.querySelector("#fig-kit .basalt-diagram-foot"); window.scrollBy(0, foot.getBoundingClientRect().top); });
    await frames(page, 2);
    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => document.querySelector("#fig-kit .basalt-diagram-replay").click());
    assert.equal(await entrance(page, "kit"), "running", "it does not wait to be in view");
    await frames(page, 2);
    assert.equal(await page.evaluate(() => window.scrollY), before, "nothing scrolled");
    await page.close();
  });

  test("a run ends, a trace clears, and a packet in flight is taken off and never sent again", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "sequence", spec: `S.animated("sequence", { replay: true })` }]);
    await atRest(page, "sequence");
    await page.click(`#fig-sequence .${P}-play`);
    await until(page, () => document.querySelector("#fig-sequence .basalt-diagram-play").textContent.trim() === "Stop the run");
    await replayButton(page, "sequence").click();
    const run = await page.evaluate(() => ({ words: document.querySelector("#fig-sequence .basalt-diagram-play").textContent.trim(), ahead: document.querySelectorAll("#fig-sequence [data-ahead]").length, dot: [...document.querySelectorAll("#fig-sequence .basalt-diagram-packet")].filter((d) => d.style.display !== "none").length }));
    assert.deepEqual(run, { words: "Play the run", ahead: 0, dot: 0 });
    await page.close();

    // A repeating packet, its dot in flight: taken off by the press; when the replay ends the loop starts as after any entrance.
    const { page: p2 } = await replayPage();
    await draw(p2, [{ key: "dataFlow", spec: `S.animated("dataFlow", { replay: true })` }]);
    await atRest(p2, "dataFlow");
    await until(p2, () => { const d = document.querySelector("#fig-dataFlow .basalt-diagram-packet"); return d && d.style.display !== "none"; });
    await replayButton(p2, "dataFlow").click();
    assert.equal(await p2.evaluate(() => [...document.querySelectorAll("#fig-dataFlow .basalt-diagram-packet")].filter((d) => d.style.display !== "none").length), 0, "no dot while the replay draws");
    assert.equal(await p2.evaluate(() => document.querySelectorAll("#fig-dataFlow [data-arrival]").length), 0, "no arrival step left lit");
    await p2.close();

    // A trace: hovered, then the press (the pointer is on the button) clears it.
    const { page: p3 } = await replayPage();
    await draw(p3, [{ key: "kit", spec: `S.kit({ replay: true })` }]);
    await atRest(p3, "kit");
    await p3.focus(`#fig-kit .${P}-node`);
    await p3.keyboard.press("ArrowRight");
    await until(p3, () => document.getElementById("fig-kit").hasAttribute("data-tracing"));
    await p3.evaluate(() => document.querySelector("#fig-kit .basalt-diagram-replay").click());
    await until(p3, () => !document.getElementById("fig-kit").hasAttribute("data-tracing"));
    assert.equal(await entrance(p3, "kit"), "running");
    await p3.close();
  });

  test("it stores nothing: a first-visit figure's mark is written by its first entrance, and a replay that finishes or gives way writes none", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true, entrance: "first-visit" })` }]);
    await atRest(page, "kit");
    await page.evaluate(() => localStorage.clear());
    await replayButton(page, "kit").click();
    await finish(page, "kit");
    await untilState(page, "kit", "done");
    await replayButton(page, "kit").click();
    await page.hover(`#fig-kit .${P}-node`);
    await untilState(page, "kit", "done");
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await page.close();
  });

  test("Play the run pressed during a replay settles it and runs", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "sequence", spec: `S.animated("sequence", { replay: true })` }]);
    await atRest(page, "sequence");
    await replayButton(page, "sequence").click();
    assert.equal(await entrance(page, "sequence"), "running");
    await page.click(`#fig-sequence .${P}-play`);
    assert.equal(await entrance(page, "sequence"), "done");
    assert.equal(await page.locator(`#fig-sequence .${P}-play`).textContent(), "Stop the run");
    await page.close();
  });
});

describe("3. sends", () => {
  test("a send while any entrance runs waits for its end, then goes once; this is the first entrance's rule too", async () => {
    const { page } = await replayPage();
    const spec = (send) => `S.animated("dataFlow", { replay: true, packet: { path: ["send", "append", "row", "hear", "see"], send: ${send} } })`;
    await draw(page, [{ key: "dataFlow", spec: spec(0) }]);
    // The first entrance, running: a new send waits.
    await page.locator("#fig-dataFlow").scrollIntoViewIfNeeded();
    await untilState(page, "dataFlow", "running");
    await draw(page, [{ key: "dataFlow", spec: spec(1) }]);
    const shown = () => page.evaluate(() => [...document.querySelectorAll("#fig-dataFlow .basalt-diagram-packet")].filter((d) => d.style.display !== "none").length);
    assert.equal(await shown(), 0, "the send waits while the first entrance runs");
    await finish(page, "dataFlow");
    await until(page, () => { const d = document.querySelector("#fig-dataFlow .basalt-diagram-packet"); return d && d.style.display !== "none"; });
    // Land it, then a replay: a send during it waits for its end too.
    for (let k = 0; k < 60 && (await shown()); k++) { await finish(page, "dataFlow"); await frames(page, 1); }
    await replayButton(page, "dataFlow").click();
    await draw(page, [{ key: "dataFlow", spec: spec(2) }]);
    assert.equal(await entrance(page, "dataFlow"), "running", "a send-only change keeps the replay");
    assert.equal(await shown(), 0, "the send waits while the replay runs");
    await finish(page, "dataFlow");
    await untilState(page, "dataFlow", "done");
    await until(page, () => { const d = document.querySelector("#fig-dataFlow .basalt-diagram-packet"); return d && d.style.display !== "none"; });
    await page.close();
  });

  test("a replay sends nothing: on a figure with a send and no repeat, no dot moves while or after it plays", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "dataFlow", spec: `S.animated("dataFlow", { replay: true, packet: { path: ["send", "append", "row", "hear", "see"], send: 0 } })` }]);
    await atRest(page, "dataFlow");
    await replayButton(page, "dataFlow").click();
    await finish(page, "dataFlow");
    await untilState(page, "dataFlow", "done");
    await frames(page, 4);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll("#fig-dataFlow .basalt-diagram-packet")].filter((d) => d.style.display !== "none").length), 0);
    await page.close();
  });
});

describe("4. the modes", () => {
  test("the hold: a replay starts under it; releasing it mid-play lets it carry on; setting it mid-play settles it; loops stay held after", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })` }]);
    await atRest(page, "kit");
    await page.click(`#fig-kit .${P}-pause`);
    await until(page, () => document.documentElement.getAttribute("data-loops") === "held");
    await replayButton(page, "kit").click();
    assert.equal(await entrance(page, "kit"), "running", "it plays under the hold");
    await page.click(`#fig-kit .${P}-pause`);
    await until(page, () => document.documentElement.getAttribute("data-loops") !== "held");
    assert.equal(await entrance(page, "kit"), "running", "releasing the hold lets it carry on");
    await page.click(`#fig-kit .${P}-pause`);
    await until(page, () => document.documentElement.getAttribute("data-loops") === "held");
    assert.equal(await entrance(page, "kit"), "done", "the hold set while it plays settles it");
    // Started under the hold and played to its end: the loops stay held.
    await replayButton(page, "kit").click();
    await finish(page, "kit");
    await untilState(page, "kit", "done");
    await frames(page, 4);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll("#fig-kit :is(.basalt-diagram-flow, .basalt-diagram-bead)")].filter((x) => getComputedStyle(x).display !== "none").length), 0);
    await page.close();
  });

  test("reduced motion and forced colours: no button, and an action's replay() returns false; either turning on mid-play settles it and removes the button", async () => {
    for (const media of [{ reducedMotion: "reduce" }, { forcedColors: "active" }]) {
      const { page } = await replayPage();
      await page.emulateMedia(media);
      await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })`, actions: [{ label: "Again", does: "now" }] }]);
      await page.waitForSelector(`#fig-kit .${P}-action`);
      await frames(page, 4);
      assert.equal(await page.locator(`#fig-kit .${P}-replay`).count(), 0, JSON.stringify(media));
      await page.click(`#fig-kit .${P}-action`);
      assert.deepEqual((await page.evaluate(() => window.__replays)).at(-1).got, false);
      await page.close();
    }
    for (const media of [{ reducedMotion: "reduce" }, { forcedColors: "active" }]) {
      const { page } = await replayPage();
      await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })` }]);
      await atRest(page, "kit");
      await replayButton(page, "kit").click();
      await page.emulateMedia(media);
      await untilState(page, "kit", "done");
      await until(page, () => !document.querySelector("#fig-kit .basalt-diagram-replay"));
      await page.close();
    }
  });

  test("print settles a replay, and no motion button prints", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })` }]);
    await atRest(page, "kit");
    await replayButton(page, "kit").click();
    await page.emulateMedia({ media: "print" });
    await untilState(page, "kit", "done");
    assert.equal(await replayButton(page, "kit").evaluate((b) => getComputedStyle(b).display), "none");
    await page.close();
  });

  test("the viewer: no button in it, Expand settles a replay, and an action's replay() there returns false with a development error", async () => {
    const { page, said } = await replayPage({ dev: true });
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })`, actions: [{ label: "Again", does: "now" }] }]);
    await atRest(page, "kit");
    await replayButton(page, "kit").click();
    await page.click(`#fig-kit .${P}-expand`);
    await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
    assert.equal(await entrance(page, "kit"), "done", "Expand settles it");
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-replay`).count(), 0);
    await page.locator(`dialog.${P}-viewer .${P}-viewer-end button`, { hasText: "Again" }).click();
    const last = (await page.evaluate(() => window.__replays)).at(-1);
    assert.deepEqual([last.viewer, last.got], [true, false]);
    assert.ok(said.some((s) => /replay\(\) was called in the viewer/.test(s)), said.join("\n"));
    await page.close();
  });
});

describe("5. an action's replay(): live inside the press alone", () => {
  test("called at once it starts a replay and returns true; a second call in the same press returns false", async () => {
    const { page, said } = await replayPage({ dev: true });
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })`, actions: [{ label: "Twice", does: "twice" }] }]);
    await atRest(page, "kit");
    await page.click(`#fig-kit .${P}-action`);
    const got = (await page.evaluate(() => window.__replays)).map((r) => [r.how, r.got]);
    assert.deepEqual(got, [["first", true], ["second", false]]);
    assert.equal(await entrance(page, "kit"), "running");
    assert.ok(said.some((s) => /replay\(\) was called twice in one press/.test(s)));
    await page.close();
  });

  test("after `await Promise.resolve()`, from a setTimeout, or from a context kept past its press, it returns false and starts nothing", async () => {
    const { page, said } = await replayPage({ dev: true });
    await draw(page, [{ key: "kit", spec: `S.kit({ replay: true })`, actions: [{ label: "Await", does: "await" }, { label: "Later", does: "timeout" }, { label: "Keep", does: "store" }] }]);
    await atRest(page, "kit");
    for (const label of ["Await", "Later"]) {
      await page.locator(`#fig-kit .${P}-action`, { hasText: label }).click();
      await until(page, (label) => window.__replays.some((r) => r.label === label), label);
      assert.equal((await page.evaluate((label) => window.__replays.find((r) => r.label === label), label)).got, false, label);
      assert.equal(await entrance(page, "kit"), "done", `${label} started nothing`);
    }
    await page.locator(`#fig-kit .${P}-action`, { hasText: "Keep" }).click();
    assert.equal(await page.evaluate(() => window.__late()), false);
    assert.equal(await entrance(page, "kit"), "done");
    assert.ok(said.filter((s) => /replay\(\) was called after the press ended/.test(s)).length >= 1, said.join("\n"));
    await page.close();
  });

  test("on a figure that does not ask for replay it returns false with a development error", async () => {
    const { page, said } = await replayPage({ dev: true });
    await draw(page, [{ key: "kit", spec: `S.kit()`, actions: [{ label: "Again", does: "now" }] }]);
    await atRest(page, "kit");
    await page.click(`#fig-kit .${P}-action`);
    assert.equal((await page.evaluate(() => window.__replays)).at(-1).got, false);
    assert.equal(await entrance(page, "kit"), "done");
    assert.ok(said.some((s) => /does not ask for it/.test(s)));
    await page.close();
  });
});

describe("6. focus when a motion button leaves (the decider's answer 2)", () => {
  const focused = (page) => page.evaluate(() => document.activeElement?.className ?? "");
  test("Play the run and Draw again, each focused, then the layout narrowed to no lines: focus is on the control before it", async () => {
    for (const [cls, before] of [["play", "expand"], ["replay", "expand"]]) {
      const { page } = await replayPage();
      await draw(page, [{ key: "sequence", spec: `S.animated("sequence", { replay: true })` }]);
      await atRest(page, "sequence");
      await page.focus(`#fig-sequence .${P}-${cls}`);
      const scrolled = await page.evaluate(() => window.scrollY);
      await page.setViewportSize({ width: 390, height: 900 });
      await frames(page, 8);
      assert.equal(await page.locator(`#fig-sequence .${P}-edge`).count(), 0, "the narrowed sequence draws no lines");
      assert.equal(await page.locator(`#fig-sequence :is(.${P}-play, .${P}-replay)`).count(), 0, "both left");
      assert.match(await focused(page), new RegExp(`${P}-${before}`), `${cls} handed focus to ${before}`);
      assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - scrolled) < 400, "the move did not scroll the page to the control");
      await page.close();
    }
  });

  test("Pause animations focused, then the layout narrowed to no lines: focus is on the control before it that stays", async () => {
    // No shipped looping fixture loses its lines at 390 (the third render run's probe: the kit, the CIMIP architecture with its pulse or a packet, the data
    // flow and a two-card figure all stack with their lines). This fan is built to: drawn at 1440 (the hub in the middle, one or two lines a side), and at
    // 390 its five lines from the hub each skip the next card, so the stack would need a fifth end lane, and a stack that would is drawn with no lines (bare).
    const fan = `{ type: "architecture", title: "A fan", summary: "One hub calls six parts.", legend: { plain: "Call" }, motion: "animated", replay: true,
      nodes: [{ id: "a", kind: "hub", name: "Hub", col: 2, row: 2 }, { id: "b", kind: "part", name: "East", col: 3, row: 2 }, { id: "c", kind: "part", name: "West", col: 1, row: 2 },
        { id: "d", kind: "part", name: "North", col: 2, row: 1 }, { id: "e", kind: "part", name: "South", col: 2, row: 3 }, { id: "f", kind: "part", name: "North east", col: 3, row: 1 },
        { id: "g", kind: "part", name: "South west", col: 1, row: 3 }],
      edges: [{ from: "a", to: "b", label: "stream", flow: true }, { from: "a", to: "c" }, { from: "a", to: "d" }, { from: "a", to: "e" }, { from: "a", to: "f" }, { from: "a", to: "g" }] }`;
    const { page } = await replayPage();
    await draw(page, [{ key: "fan", spec: fan }]);
    await atRest(page, "fan");
    assert.equal(await page.evaluate(() => document.getElementById("fig-fan").dataset.layout), "drawn", "the fan is drawn at 1440");
    await page.waitForSelector(`#fig-fan .${P}-pause`);
    await page.focus(`#fig-fan .${P}-pause`);
    await page.setViewportSize({ width: 390, height: 900 });
    await frames(page, 8);
    assert.equal(await page.locator(`#fig-fan .${P}-edge`).count(), 0, "the narrowed fan draws no lines (a bare stack)");
    assert.ok(await page.evaluate(() => document.getElementById("fig-fan").hasAttribute("data-bare")));
    assert.equal(await page.locator(`#fig-fan :is(.${P}-replay, .${P}-pause)`).count(), 0, "both left");
    assert.match(await focused(page), new RegExp(`${P}-expand`));
    await page.close();
  });

  test("Draw again focused, then reduced motion turned on mid-replay: focus is on the control before it (the run button)", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "sequence", spec: `S.animated("sequence", { replay: true })` }]);
    await atRest(page, "sequence");
    await replayButton(page, "sequence").focus();
    await page.keyboard.press("Enter");
    assert.equal(await entrance(page, "sequence"), "running");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await until(page, () => !document.querySelector("#fig-sequence .basalt-diagram-replay"));
    assert.match(await focused(page), new RegExp(`${P}-play`), "the run stays under reduced motion and takes focus");
    await page.close();
  });

  test("a button that did not hold focus moves nothing", async () => {
    const { page } = await replayPage();
    await draw(page, [{ key: "sequence", spec: `S.animated("sequence", { replay: true })` }]);
    await atRest(page, "sequence");
    await page.focus(`#fig-sequence .${P}-toggle`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await until(page, () => !document.querySelector("#fig-sequence .basalt-diagram-replay"));
    assert.match(await focused(page), new RegExp(`${P}-toggle`));
    await page.close();
  });
});
