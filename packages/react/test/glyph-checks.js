// The morph checks of the drawn set (iconography-r3-fix/scripts/checks.js, DECISIONS item 40), ported to run against the
// shipped MorphIcon in a real page. Each check mounts a MorphIcon, changes its props on a virtual clock (8 ms frames),
// and reads only what is drawn: the svg's markup after each frame. Plus the sequences Opus added in the confirm round
// (item 54): a turn-on then a reversal, a double reversal, and the same request every frame.
//
// Bundled into the page by the browser test; it imports the built package (dist), not the sources.
import * as React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { DrawingSvg, settle } from "../dist/glyph.js";
import { between, endpointOf, prepare } from "../dist/glyph-motion.js";
import * as Basalt from "../dist/index.js";
import { MorphIcon } from "../dist/morph-icon.js";

/** Every core glyph's component, by name; the checks show glyphs by reference, the way a navigation icon is shown. */
const components = () => Object.fromEntries(Object.values(Basalt).filter((v) => v && v.glyph).map((v) => [v.glyph.name, v]));

const FRAME = 8;
const LIMIT = 700;
const DURATION = 200; // slow

/** A clock the page's animation frames and performance.now run on, advanced only by tick. */
function installClock() {
  const clock = { t: 0, queue: [], id: 0 };
  window.requestAnimationFrame = (fn) => { clock.id += 1; clock.queue.push({ id: clock.id, fn }); return clock.id; };
  window.cancelAnimationFrame = (id) => { clock.queue = clock.queue.filter((x) => x.id !== id); };
  performance.now = () => clock.t;
  clock.tick = () => {
    clock.t += FRAME;
    const queue = clock.queue;
    clock.queue = [];
    flushSync(() => queue.forEach((x) => x.fn(clock.t)));
  };
  clock.pending = () => clock.queue.length;
  clock.reset = () => { clock.queue = []; clock.t = 0; };
  return clock;
}

const norm = (html) => String(html).replace(/basalt-glyph-[A-Za-z0-9_-]+/g, "x");
// A stroke fading in or out at under 20% opacity is hardly there: leave it out when judging where a frame is on a path,
// or the one frame where it first passes the cut-off would count as off the path.
const visible = (html) => norm(html).replace(/<path [^>]*stroke-opacity="([\d.]+)"[^>]*><\/path>/g, (m, o) => (Number(o) < 0.2 ? "" : m));
const nums = (html) => (visible(html).match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);

/** The drawn strokes, [[x0, y0, x3, y3], ...], from the stroke group's paths. */
function strokes(html) {
  const h = norm(html);
  const i = h.lastIndexOf('<g fill="none" stroke="currentColor"');
  if (i < 0) return [];
  const out = [];
  const re = /d="([^"]+)"/g;
  const part = h.slice(i);
  let m;
  while ((m = re.exec(part))) {
    const n = m[1].match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
    out.push([n[0], n[1], n[n.length - 2], n[n.length - 1]]);
  }
  return out;
}

function mount() {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  return {
    show: (name, selected = false) => flushSync(() => root.render(React.createElement(MorphIcon, { glyph: components()[name], selected }))),
    html: () => norm(host.querySelector("svg").innerHTML),
    done: () => { root.unmount(); host.remove(); },
  };
}

const scratch = () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  return {
    render: (drawing) => { flushSync(() => root.render(React.createElement(DrawingSvg, { drawing }))); return norm(host.firstChild.innerHTML); },
    done: () => root.unmount(),
  };
};

/**
 * `groups` maps a name to its rotation group and `pairs` lists the drawn pairs, [a, b]: the test derives both from the
 * drawn set, so what the council allowed is stated outside the code under test.
 */
export function runAll({ names, groups, pairs }) {
  const glyphOf = (name) => components()[name].glyph;
  const agreed = (a, b) => (!!groups[a] && groups[a] === groups[b]) || pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const clock = installClock();
  const ref = scratch();
  const expected = (name, selected) => ref.render(settle(glyphOf(name), selected));
  const refAt = (a, b, e) => {
    const A = endpointOf(glyphOf(a[0]), a[1]);
    const B = endpointOf(glyphOf(b[0]), b[1]);
    const p = prepare(A, B);
    return ref.render(between(p.from, B, e, p.pair));
  };
  const label = (k) => k[0] + (k[1] ? " (selected)" : "");

  /**
   * Start settled on `start`, then make the requests [[atMs, name, selected], ...] at their times (the first at 0), and
   * run frames until nothing is scheduled (or 700 ms). Returns every frame and the frame the last request landed on.
   */
  function drive(start, requests) {
    clock.reset();
    const m = mount();
    m.show(start[0], start[1]);
    clock.reset();
    const frames = [];
    const record = (tag) => frames.push({ t: clock.t, tag, html: m.html(), pending: clock.pending() });
    let cut = 0;
    requests.forEach(([at, name, selected], i) => {
      while (clock.t < at) { clock.tick(); record("frame"); }
      m.show(name, selected);
      cut = frames.length;
      record(i ? "interrupt" : "request");
    });
    while (clock.pending() && clock.t < LIMIT) { clock.tick(); record("frame"); }
    m.done();
    return { frames, cut };
  }
  const results = [];
  const push = (id, title, pass, detail) => results.push({ id, title, pass, detail });

  // 1. Interrupted, the new target is outside the agreed morphs: it swaps at once.
  const swapCheck = (id, start, first, at, then) => {
    const s = drive(start, [[0, ...first], [at, ...then]]);
    const want = expected(...then);
    const after = s.frames[s.cut];
    const later = s.frames.slice(s.cut).every((f) => f.html === want);
    push(id, `${label(start)} → ${label(first)}, interrupted at ${at} ms by ${label(then)}`, after.html === want && after.pending === 0 && later,
      after.html === want ? `${after.pending} frame(s) left running` : `not drawn at once; ${s.frames.length - s.cut - 1} more frames`);
  };
  swapCheck("plus-close-home", ["plus", false], ["close", false], 40, ["home", false]);
  swapCheck("plus-close-menu", ["plus", false], ["close", false], 40, ["menu", false]);
  swapCheck("menu-close-plus", ["menu", false], ["close", false], 40, ["plus", false]);
  swapCheck("home-sel-search", ["home", false], ["home", true], 40, ["search", false]);

  // 2. A rotation, interrupted, stays the same drawing turned about the centre.
  const radii = (st) => st.flatMap((s) => [Math.hypot(s[0] - 12, s[1] - 12), Math.hypot(s[2] - 12, s[3] - 12), Math.hypot(s[2] - s[0], s[3] - s[1])]).sort((a, b) => a - b);
  const angleOf = (st) => (Math.atan2(st[0][3] - st[0][1], st[0][2] - st[0][0]) * 180) / Math.PI;
  const rigidCheck = (id, start, requests, title) => {
    const s = drive(start, requests);
    const then = requests[requests.length - 1].slice(1);
    const want = expected(...then);
    const shape = radii(strokes(expected(...start)));
    let worst = 0;
    const angles = [];
    s.frames.slice(s.cut).forEach((f) => {
      const st = strokes(f.html);
      const r = radii(st);
      if (r.length !== shape.length) { worst = Infinity; return; }
      r.forEach((v, i) => { worst = Math.max(worst, Math.abs(v - shape[i])); });
      angles.push(angleOf(st));
    });
    const unwrap = angles.slice();
    for (let i = 1; i < unwrap.length; i++) {
      while (unwrap[i] - unwrap[i - 1] > 180) unwrap[i] -= 360;
      while (unwrap[i] - unwrap[i - 1] < -180) unwrap[i] += 360;
    }
    const sign = Math.sign(unwrap[unwrap.length - 1] - unwrap[0]);
    const mono = unwrap.every((a, i) => i === 0 || Math.abs(a - unwrap[i - 1]) < 1e-6 || Math.sign(a - unwrap[i - 1]) === sign);
    const last = s.frames[s.frames.length - 1];
    push(id, title, worst < 0.02 && mono && last.html === want && last.pending === 0,
      `largest change in a stroke's length or distance from the centre ${Math.round(worst * 100) / 100}${mono ? "" : "; the turn changes direction"}${last.html === want ? "" : `; it does not settle on ${label(then)}`}`);
  };
  rigidCheck("arrow-reverse", ["arrow-right", false], [[0, "arrow-down", false], [56, "arrow-right", false]], "arrow right → down, reversed at 56 ms");
  rigidCheck("arrow-retarget", ["arrow-right", false], [[0, "arrow-down", false], [56, "arrow-left", false]], "arrow right → down, sent on to arrow left at 56 ms");
  rigidCheck("plus-reverse", ["plus", false], [[0, "close", false], [40, "plus", false]], "plus → close, reversed at 40 ms");
  // Opus's confirm-round sequences: a turn-on then a reversal, and a double reversal of a turn.
  rigidCheck("arrow-turn-on-then-reverse", ["arrow-right", false], [[0, "arrow-down", false], [56, "arrow-left", false], [104, "arrow-right", false]], "arrow right → down, on to left, then back to right");
  rigidCheck("plus-double-reversal", ["plus", false], [[0, "close", false], [32, "plus", false], [64, "close", false], [96, "plus", false]], "plus → close → plus → close → plus");

  // 3. Any morph, reversed, runs back along its own path.
  const retraceCheck = (id, start, first, requests) => {
    const s = drive(start, requests);
    const grid = [];
    for (let k = 0; k <= 2000; k++) grid.push(nums(refAt(start, first, k / 2000)));
    let worst = 0;
    let worstFrame = null;
    // A morph that has arrived is drawn as the settled glyph, whose strokes may run the other way from the ones that
    // travelled to it (a round-capped line looks the same both ways), so a settled frame is on the path by being the end.
    const settledStart = expected(...start);
    const settledFirst = expected(...first);
    s.frames.slice(s.cut).forEach((f) => {
      if (f.html === settledStart || f.html === settledFirst) return;
      const v = nums(f.html);
      let best = Infinity;
      grid.forEach((g) => {
        if (g.length !== v.length) return;
        let m = 0;
        for (let i = 0; i < v.length; i++) m = Math.max(m, Math.abs(v[i] - g[i]));
        best = Math.min(best, m);
      });
      if (best > worst) { worst = best; worstFrame = f; }
    });
    const last = s.frames[s.frames.length - 1];
    const want = expected(...requests[requests.length - 1].slice(1));
    push(id, `${label(start)} → ${label(first)}, reversed`, worst < 0.05 && last.html === want && last.pending === 0, `largest distance from the morph's own path ${Math.round(worst * 1000) / 1000}${worstFrame ? ` at ${worstFrame.t} ms (${worstFrame.html.slice(0, 400)})` : ""}${last.html === want ? "" : "; it does not settle where asked"}`);
  };
  retraceCheck("menu-reverse", ["menu", false], ["close", false], [[0, "close", false], [56, "menu", false]]);
  retraceCheck("chevron-download-reverse", ["chevron-down", false], ["download", false], [[0, "download", false], [56, "chevron-down", false]]);
  retraceCheck("home-reverse", ["home", false], ["home", true], [[0, "home", true], [56, "home", false]]);
  retraceCheck("copy-check-reverse", ["copy", false], ["check", false], [[0, "check", false], [56, "copy", false]]);
  retraceCheck("download-chevron-reverse", ["download", false], ["chevron-down", false], [[0, "chevron-down", false], [56, "download", false]]);
  // A double reversal of a pair, and of rest and selected, still lies on the one path and settles on the last request.
  retraceCheck("menu-double-reversal", ["menu", false], ["close", false], [[0, "close", false], [40, "menu", false], [72, "close", false], [104, "menu", false], [136, "close", false]]);
  retraceCheck("home-double-reversal", ["home", false], ["home", true], [[0, "home", true], [40, "home", false], [72, "home", true]]);

  // The same request every frame does nothing after the first: the morph takes its one duration, not less.
  {
    const settledAt = [];
    let html = "";
    for (const repeat of [false, true]) {
      clock.reset();
      const m = mount();
      m.show("plus", false);
      clock.reset();
      m.show("close", false);
      while (clock.pending() && clock.t < LIMIT) {
        clock.tick();
        if (repeat && clock.pending()) m.show("close", false);
      }
      settledAt.push(clock.t);
      html = m.html();
      m.done();
    }
    push("same-request-every-frame", "plus → close, close asked for again every frame", settledAt[0] === settledAt[1] && settledAt[0] >= DURATION - FRAME && html === expected("close", false),
      `settles at ${settledAt[0]} ms asked once, ${settledAt[1]} ms asked every frame`);
  }
  // ...and asked again mid-morph, the next frame is the frame the one request would have drawn.
  {
    const run = (again) => {
      clock.reset();
      const m = mount();
      m.show("home", false);
      clock.reset();
      m.show("home", true);
      for (let i = 0; i < 6; i++) clock.tick();
      if (again) m.show("home", true);
      clock.tick();
      const html = m.html();
      m.done();
      return html;
    };
    push("same-request-mid-flight", "home → selected, asked again at 48 ms", run(false) === run(true), "the next frame is the same with or without the repeated request");
  }

  // 4. Settled: every ordered pair of names morphs only if it is an agreed morph.
  {
    const bad = [];
    let morphs = 0;
    let swaps = 0;
    const settledMarkup = Object.fromEntries(names.map((n) => [n, expected(n, false)]));
    for (const a of names) {
      for (const b of names) {
        if (a === b) continue;
        clock.reset();
        const m = mount();
        m.show(a, false);
        clock.reset();
        m.show(b, false);
        const moving = clock.pending() > 0;
        const drawn = m.html() === settledMarkup[b];
        m.done();
        if (agreed(a, b)) { morphs += 1; if (!moving) bad.push(`${a} → ${b} swapped`); }
        else { swaps += 1; if (moving || !drawn) bad.push(`${a} → ${b} morphed`); }
      }
    }
    push("allow-list", `every ordered pair of the ${names.length} names`, bad.length === 0 && morphs === 34 && swaps === names.length * (names.length - 1) - 34,
      `${morphs} pairs morph and ${swaps} swap${bad.length ? `; wrong: ${bad.slice(0, 4).join(", ")}` : ""}`);
  }
  ref.done();
  return results;
}
