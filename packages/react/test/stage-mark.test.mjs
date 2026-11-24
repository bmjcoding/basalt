// StageMark (DECISIONS 316, 1.2): the seven states' marks, their ink and their seat; the crossfade on a change of state; the queued breath (the one loop a
// state that is not running has) and where it is still. Driven in Chromium against the built package with the real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, pkg, settle, tick } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const STATES = ["queued", "running", "success", "failed", "skipped", "canceled", "retrying"];
const INK = { queued: "--basalt-text-secondary", running: "--basalt-text-primary", success: "--basalt-text-secondary", failed: "--basalt-status-danger", skipped: "--basalt-text-tertiary", canceled: "--basalt-text-tertiary", retrying: "--basalt-text-primary" };

const ALL = `
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
const REF = { queued: CircleIcon, success: CheckCircleIcon, failed: XCircleIcon, skipped: MinusCircleIcon, canceled: ProhibitIcon };
const STATES = ${JSON.stringify(STATES)};
function App() {
  return <div style={{ padding: 24, display: "grid", gap: 8, background: "var(--basalt-surface-page)" }}>
    {[16, 20, 24].map((size) => <div key={size} style={{ display: "flex", gap: 8 }}>
      {STATES.map((s) => <span key={s} id={"m-" + s + "-" + size}><B.StageMark state={s} size={size} /></span>)}
      {Object.entries(REF).map(([s, icon]) => <span key={s} id={"ref-" + s + "-" + size}><B.Icon icon={icon} size={size} /></span>)}
      <span id={"ring-" + size}><B.Spinner size={size} /></span>
    </div>)}
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const SWITCH = `
function App() {
  const [state, setState] = React.useState("running");
  React.useEffect(() => { window.setState = setState; }, []);
  return <div style={{ padding: 24 }}><span id="m"><B.StageMark state={state} /></span></div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const open = async (body, options = {}) => {
  const { page, errors } = await fixturePage(browser, body, { viewport: { width: 900, height: 400 }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const tokenColor = (page, name) => page.evaluate((n) => { const p = document.createElement("span"); p.style.color = `var(${n})`; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, name);

describe("the seven marks", () => {
  for (const theme of ["dark", "light"]) {
    test(`each state's glyph, ink and size at 16, 20 and 24, one seat for all seven, aria-hidden (${theme})`, async () => {
      const page = await open(ALL, { theme });
      for (const size of [16, 20, 24]) {
        const r = await page.evaluate(({ size, states }) => states.map((s) => {
          const mark = document.querySelector(`#m-${s}-${size} .basalt-run-mark`);
          const face = mark.querySelector(".basalt-run-mark-face");
          const box = mark.getBoundingClientRect();
          const svg = face.querySelector("svg");
          return { s, w: box.width, h: box.height, hidden: mark.getAttribute("aria-hidden"), color: getComputedStyle(face).color, svg: svg.innerHTML, svgW: svg.getBoundingClientRect().width, ring: !!face.querySelector(".basalt-spinner[data-variant='ring']") };
        }), { size, states: STATES });
        for (const m of r) {
          assert.equal(m.w, size, `${m.s} at ${size}: the seat's width`);
          assert.equal(m.h, size, `${m.s} at ${size}: the seat's height`);
          assert.equal(m.hidden, "true", `${m.s}: aria-hidden`);
          assert.equal(m.color, await tokenColor(page, INK[m.s]), `${m.s}: ${INK[m.s]}`);
          if (m.s === "running" || m.s === "retrying") assert.ok(m.ring, `${m.s}: the ring`);
          else {
            const ref = await page.evaluate(({ s, size }) => document.querySelector(`#ref-${s}-${size} svg`).innerHTML, { s: m.s, size });
            assert.equal(m.svg, ref, `${m.s} at ${size}: Phosphor Bold's own glyph`);
            assert.equal(m.svgW, size);
          }
        }
      }
      assert.deepEqual(page.errors, []);
    });
  }

  test("no Phosphor check, close or minus: those are the core set's, and only the circled marks are Phosphor's", () => {
    const read = (file) => fs.readFileSync(path.join(pkg, "dist", file), "utf8");
    const entry = read("stage-mark.js");
    const source = [entry, ...[...entry.matchAll(/from "\.\/(chunk-[A-Z0-9]+\.js)"/g)].map((m) => read(m[1]))].join("\n");
    const phosphor = [...source.matchAll(/@phosphor-icons\/react\/dist\/csr\/([A-Za-z]+)/g)].map((m) => m[1]).sort();
    assert.deepEqual(phosphor, ["CheckCircle", "Circle", "MinusCircle", "Prohibit", "XCircle"]);
  });
});

describe("a change of state crossfades", () => {
  test("both marks stand in the seat, the old fading as the new arrives, over duration-fast, then the old is gone; the seat never moves", async () => {
    const page = await open(SWITCH, { theme: "dark" });
    const seat = () => page.evaluate(() => { const b = document.querySelector("#m .basalt-run-mark").getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
    const before = await seat();
    const clock = await freezeAnimations(page);
    await page.evaluate(() => window.setState("success"));
    await clock.advance(0);
    const faces = () => page.evaluate(() => [...document.querySelectorAll("#m .basalt-run-mark-face")].map((f) => ({ state: f.dataset.state, leaving: f.hasAttribute("data-leaving"), opacity: Number(getComputedStyle(f).opacity) })));
    const start = await faces();
    assert.deepEqual(start.map((f) => [f.state, f.leaving]), [["running", true], ["success", false]], "both marks present");
    await clock.advance(48);
    const mid = await faces();
    assert.ok(mid[0].opacity < 1 && mid[0].opacity > 0, `the old one is fading (${mid[0].opacity})`);
    assert.ok(mid[1].opacity > 0 && mid[1].opacity < 1, `the new one is arriving (${mid[1].opacity})`);
    assert.ok(mid[1].opacity > start[1].opacity && mid[0].opacity < start[0].opacity, "the opacities cross");
    assert.deepEqual(await seat(), before, "the seat holds while both stand");
    await clock.advance(60);
    // animationend is sent on a real frame: give the page a few, on the frozen clock.
    let end = await faces();
    for (let i = 0; i < 20 && end.length > 1; i += 1) { await new Promise((r) => setTimeout(r, 20)); await clock.advance(8); end = await faces(); }
    assert.deepEqual(end.map((f) => f.state), ["success"], "done inside duration-fast: the old mark has left");
    assert.equal(end[0].opacity, 1);
    assert.deepEqual(await seat(), before);
    await clock.thaw();
  });

  test("running to retrying is one mark: nothing crossfades", async () => {
    const page = await open(SWITCH, { theme: "dark" });
    await page.evaluate(() => window.setState("retrying"));
    const n = await page.evaluate(() => document.querySelectorAll("#m .basalt-run-mark-face").length);
    assert.equal(n, 1);
  });

  test("under reduced motion the crossfade stays (opacity only); under the hold the change lands at once", async () => {
    const reduced = await open(SWITCH, { theme: "dark", reducedMotion: "reduce" });
    const clock = await freezeAnimations(reduced);
    await reduced.evaluate(() => window.setState("failed"));
    await clock.advance(40);
    const faces = await reduced.evaluate(() => [...document.querySelectorAll("#m .basalt-run-mark-face")].map((f) => [f.dataset.state, getComputedStyle(f).animationName, getComputedStyle(f).transform]));
    assert.equal(faces.length, 2, "both marks stand under reduced motion");
    assert.ok(faces.every(([, , transform]) => transform === "none"), "nothing moves");
    await clock.thaw();
    const held = await open(SWITCH, { theme: "dark" });
    await held.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await held.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await held.evaluate(() => window.setState("failed"));
    const now = await held.evaluate(() => [...document.querySelectorAll("#m .basalt-run-mark-face")].map((f) => [f.dataset.state, getComputedStyle(f).opacity]));
    assert.deepEqual(now, [["failed", "1"]], "one face, at full, at once");
  });
});

const QUEUED = `createRoot(document.getElementById("root")).render(<div style={{ padding: 24 }}><span id="q"><B.StageMark state="queued" /></span><span id="lit" style={{ forcedColorAdjust: "none", background: "Highlight", color: "HighlightText", display: "inline-block", padding: 4 }}><B.StageMark state="failed" /></span></div>);`;

describe("the queued breath", () => {
  test("keyframes from opacity-queued (0.65) to 1 on duration-loop-fade, ease-in-out, alternating, forever; sampled, never under 0.65", async () => {
    const page = await open(QUEUED, { theme: "light" });
    const r = await page.evaluate(() => {
      const breath = document.querySelector("#q .basalt-run-mark-breath");
      const [a] = breath.getAnimations();
      const timing = a.effect.getComputedTiming();
      const samples = [];
      a.pause();
      for (let t = 0; t <= 2400; t += 100) { a.currentTime = t; samples.push(Number(getComputedStyle(breath).opacity)); }
      return { name: a.animationName, duration: timing.duration, iterations: timing.iterations, direction: timing.direction, easing: getComputedStyle(breath).animationTimingFunction, samples, start: a.startTime };
    });
    assert.equal(r.name, "basalt-run-breath");
    assert.equal(r.duration, 1200, "duration-loop-fade");
    assert.equal(r.iterations, Infinity);
    assert.equal(r.direction, "alternate");
    assert.equal(r.easing, "cubic-bezier(0.65, 0, 0.35, 1)", "ease-in-out");
    assert.ok(Math.abs(r.samples[0] - 0.65) < 0.001, `the floor is 0.65 (${r.samples[0]})`);
    assert.ok(Math.abs(r.samples[12] - 1) < 0.001, "full at one period");
    assert.ok(r.samples.every((o) => o >= 0.65 - 1e-6 && o <= 1), `never under 0.65: ${r.samples.join(", ")}`);
  });

  test("it joins the shared clock: its start is the timeline's origin", async () => {
    const page = await open(QUEUED, { theme: "dark" });
    const start = await page.evaluate(() => Number(document.querySelector("#q .basalt-run-mark-breath").getAnimations()[0].startTime));
    assert.equal(start, 0);
  });

  for (const [mode, options, prep] of [
    ["reduced motion", { reducedMotion: "reduce" }, null],
    ["the hold", {}, () => document.documentElement.setAttribute("data-loops", "held")],
    ["forced colours", { forcedColors: "active" }, null],
    ["print", {}, "print"],
  ]) {
    test(`still, at full, under ${mode}`, async () => {
      const page = await open(QUEUED, { theme: "dark", ...options });
      if (prep === "print") await page.emulateMedia({ media: "print" });
      else if (prep) await page.evaluate(prep);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const r = await page.evaluate(() => { const b = document.querySelector("#q .basalt-run-mark-breath"); return { animation: getComputedStyle(b).animationName, opacity: getComputedStyle(b).opacity, running: b.getAnimations().length }; });
      assert.deepEqual(r, { animation: "none", opacity: "1", running: 0 }, mode);
    });
  }

  test("in forced colours a mark is currentColor: on a lit row it takes the row's HighlightText, naming no system colour itself", async () => {
    const page = await open(QUEUED, { theme: "dark", forcedColors: "active" });
    const r = await page.evaluate(() => ({ face: getComputedStyle(document.querySelector("#lit .basalt-run-mark-face")).color, row: getComputedStyle(document.querySelector("#lit")).color }));
    assert.equal(r.face, r.row);
    const css = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8");
    const block = css.slice(css.indexOf("/* StageMark: one seat"), css.indexOf("/* RunTimer: Geist Mono"));
    assert.ok(!/CanvasText|GrayText|HighlightText|LinkText/.test(block), "the mark's rules name no system colour");
  });
});

test("a server render draws the seat and the mark, and nothing runs at import", async () => {
  const { renderToString } = await import("react-dom/server");
  const React = await import("react");
  const { StageMark } = await import(path.join(pkg, "dist", "stage-mark.js"));
  const html = renderToString(React.createElement(StageMark, { state: "failed" }));
  assert.match(html, /class="basalt-run-mark"/);
  assert.match(html, /aria-hidden="true"/);
  void tick;
});
