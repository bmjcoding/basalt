// The core set's morphs (DECISIONS items 38, 40, 54), run against the shipped MorphIcon in Chromium:
// the 11 checks of the drawn set's engine, Opus's extra sequences, the allow-list over every ordered pair, the
// drawn set's engine as a reference for the frames, reduced motion, and the stroke at 16, 20 and 24.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { GLYPHS, NAMES, canonical, knockOf, loopsOf } from "../glyphs/source.mjs";
import { fixturePage, launch } from "./support.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const DrawnSetEngine = require("./fixtures/drawn-set-engine.cjs");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const set = NAMES.filter((name) => !GLYPHS[name].board);
const groups = Object.fromEntries(set.map((name) => [name, GLYPHS[name].group ?? null]));
// The four drawn pairs of item 38, each drawn both ways (item 54): written here, apart from the code under test.
const pairs = [["menu", "close"], ["play", "pause"], ["copy", "check"], ["chevron-down", "download"]];

describe("the drawn set's morph checks, against the shipped MorphIcon", () => {
  let results;
  before(async () => {
    const { page, errors } = await fixturePage(browser, `import { runAll } from "./test/glyph-checks.js"; window.runAll = runAll;`);
    results = await page.evaluate((args) => window.runAll(args), { names: set, groups, pairs });
    assert.deepEqual(errors, []);
    await page.close();
  });

  // checks.js, ids and all
  for (const id of ["plus-close-home", "plus-close-menu", "menu-close-plus", "home-sel-search", "arrow-reverse", "arrow-retarget", "plus-reverse", "menu-reverse", "chevron-download-reverse", "home-reverse", "allow-list"]) {
    test(`check ${id}`, () => {
      const r = results.find((x) => x.id === id);
      assert.ok(r, `no result for ${id}`);
      assert.ok(r.pass, `${r.title}: ${r.detail}`);
    });
  }
  // Opus's extra sequences (item 54), and the same-target request
  for (const id of ["arrow-turn-on-then-reverse", "plus-double-reversal", "menu-double-reversal", "home-double-reversal", "copy-check-reverse", "download-chevron-reverse", "same-request-every-frame", "same-request-mid-flight"]) {
    test(`sequence ${id}`, () => {
      const r = results.find((x) => x.id === id);
      assert.ok(r, `no result for ${id}`);
      assert.ok(r.pass, `${r.title}: ${r.detail}`);
    });
  }
  test("the allow-list: 34 settled morphs, and every other pair swaps", () => {
    const r = results.find((x) => x.id === "allow-list");
    assert.match(r.detail, /^34 pairs morph and 1372 swap$/, r.detail);
    assert.equal(results.length, 11 + 8, "every check ran");
  });
});

describe("the shipped morph against the drawn set's engine", () => {
  // build.mjs's DEFS, from the drawn set's own functions
  const defs = Object.fromEntries(set.map((name) => [name, {
    name,
    c: canonical(name, false),
    s: canonical(name, true),
    rot: GLYPHS[name].rotate || 0,
    group: GLYPHS[name].group || null,
    loops: loopsOf(name),
    knock: knockOf(name),
    cut: !!(GLYPHS[GLYPHS[name].of]?.cutKnock ?? GLYPHS[name].cutKnock),
    eo: !!(GLYPHS[GLYPHS[name].of]?.evenodd ?? GLYPHS[name].evenodd),
  }]));
  const PAIRS = { "menu>close": { map: [0, 2, 1, 3, 4, 5, 6, 7] }, "play>pause": {}, "copy>check": {}, "chevron-down>download": {} };

  test("every morph that ships passes through the same drawings, frame for frame", async () => {
    const { between, endpointOf, prepare } = await import(pathToFileURL(path.join(here, "..", "dist", "glyph-motion.js")).href);
    const B = await import(pathToFileURL(path.join(here, "..", "dist", "index.js")).href);
    const camel = (name) => name.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
    const data = (name) => B[`${camel(name)}Glyph`].glyph;
    const E = DrawnSetEngine;
    const requests = [];
    for (const a of set) for (const b of set) if (a !== b && ((groups[a] && groups[a] === groups[b]) || pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a)))) requests.push([a, false, b, false]);
    for (const name of set) if (loopsOf(name).length || GLYPHS[name].seam) requests.push([name, false, name, true], [name, true, name, false]);
    assert.ok(requests.length > 34);
    let worst = 0;
    for (const [a, as, b, bs] of requests) {
      const A = E.state(defs[a], as), Bs = E.state(defs[b], bs);
      const ref = E.prepare(A, Bs, PAIRS);
      const mine = prepare(endpointOf(data(a), as), endpointOf(data(b), bs));
      assert.equal(mine.kind, ref.kind, `${a} → ${b}: kind`);
      for (const e of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const want = E.between(ref.from, Bs, e, ref.pair);
        const got = between(mine.from, endpointOf(data(b), bs), e, mine.pair);
        const turned = (drawing) => drawing.slots.map((s) => (drawing.angle ? E.rot(s, drawing.angle) : s));
        const w = turned(want), g = turned({ slots: got.slots, angle: got.angle });
        assert.equal(g.length, w.length);
        // A slot that is not drawn has no position worth comparing; only whether it is drawn (its last number).
        w.forEach((s, i) => s.forEach((v, k) => {
          if (k < 8 && s[8] < 1e-6 && g[i][8] < 1e-6) return;
          worst = Math.max(worst, Math.abs(v - g[i][k]));
        }));
        worst = Math.max(worst, Math.abs(want.f - got.f));
      }
    }
    assert.ok(worst < 0.002, `the drawings differ from the drawn set's engine by ${worst}`);
  });
});

describe("MorphIcon in the page", () => {
  const mount = `
    const root = createRoot(document.getElementById("root"));
    window.B = B;
    window.show = (props) => flushSync(() => root.render(<B.MorphIcon {...props} />));
  `;

  test("reduced motion swaps at once, in every kind of change", async () => {
    const { page } = await fixturePage(browser, mount, { clock: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const read = () => page.locator(".basalt-morph").evaluate((svg) => svg.innerHTML.replace(/basalt-glyph-[\w-]+/g, "x"));
    await page.evaluate(() => window.show({ name: "menu" }));
    await page.waitForFunction(() => document.querySelector(".basalt-morph")?.hasAttribute("data-reduced"));
    await page.evaluate(() => window.show({ name: "close" }));
    const closed = await read();
    await page.evaluate(() => window.show({ name: "menu" }));
    await page.evaluate(() => window.show({ name: "close" }));
    assert.equal(await read(), closed, "menu to close is the settled close at once");
    // rest to selected too
    await page.evaluate(() => window.show({ glyph: B.HomeGlyph }));
    const rest = await read();
    await page.evaluate(() => window.show({ glyph: B.HomeGlyph, selected: true }));
    const selected = await read();
    assert.notEqual(rest, selected);
    await page.clock.runFor(16);
    assert.equal(await read(), selected, "nothing was left running");
    await page.close();
  });

  test("the stroke is 1.5, 1.875 and 2.25 px at 16, 20 and 24, whatever the glyph", async () => {
    const { page } = await fixturePage(browser, `
      const root = createRoot(document.getElementById("root"));
      window.show = (size) => flushSync(() => root.render(<>{Object.values(B).filter((v) => v && v.glyph).map((G) => <B.Icon key={G.glyph.name} icon={G} size={size} />)}</>));
    `);
    for (const [size, px] of [[16, 1.5], [20, 1.875], [24, 2.25]]) {
      await page.evaluate((size) => window.show(size), size);
      const widths = await page.locator(".basalt-icon").evaluateAll((svgs) => svgs.flatMap((svg) => [...svg.querySelectorAll("g[stroke='currentColor'] > path")].map((p) => {
        const w = Number(p.getAttribute("stroke-width") ?? p.parentElement.getAttribute("stroke-width"));
        return { w: w * svg.getScreenCTM().a, dot: w > 2.25 };
      })));
      assert.ok(widths.length > 100);
      assert.ok(widths.filter((x) => !x.dot).every((x) => Math.abs(x.w - px) < 1e-6), `a stroke at ${size} is not ${px}px`);
      assert.ok(widths.filter((x) => x.dot).every((x) => Math.abs(x.w - px * 1.5) < 1e-6), `a dot at ${size} is not 1.5 strokes`);
    }
    await page.close();
  });

  test("glyphs take currentColor, so forced colours and both themes colour them", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await fixturePage(browser, `window.show = () => createRoot(document.getElementById("root")).render(<div style={{ color: "rgb(1, 2, 3)" }}><B.Icon icon={B.SearchGlyph} size={24} selected /></div>);`, { theme });
      await page.evaluate(() => window.show());
      await page.locator(".basalt-icon").waitFor();
      const colours = await page.locator(".basalt-icon").evaluate((svg) => [...svg.querySelectorAll("g[stroke='currentColor'] > path, path[fill='currentColor']")].map((p) => getComputedStyle(p).stroke === "rgb(1, 2, 3)" || getComputedStyle(p).fill === "rgb(1, 2, 3)"));
      assert.ok(colours.length > 0 && colours.every(Boolean), `${theme}: glyph does not take the text colour`);
      await page.close();
    }
  });
});

describe("the morph controller, driven directly on a virtual clock", () => {
  const load = async () => {
    const motion = await import(pathToFileURL(path.join(here, "..", "dist", "glyph-motion.js")).href);
    const B = await import(pathToFileURL(path.join(here, "..", "dist", "index.js")).href);
    const clock = { t: 0, queue: [], id: 0 };
    clock.now = () => clock.t;
    clock.raf = (fn) => { clock.id += 1; clock.queue.push({ id: clock.id, fn }); return clock.id; };
    clock.caf = (id) => { clock.queue = clock.queue.filter((x) => x.id !== id); };
    clock.tick = () => { clock.t += 8; const q = clock.queue; clock.queue = []; q.forEach((x) => x.fn(clock.t)); };
    const ease = (t) => 1 - (1 - t) ** 4;
    return { motion, B, clock, ease };
  };

  test("asking for the target already in flight does nothing: the ease-out is not restarted", async () => {
    const { motion, B, clock, ease } = await load();
    const settledAt = [];
    for (const repeat of [false, true]) {
      clock.t = 0; clock.queue = [];
      const drawn = [];
      const c = motion.createMorph(motion.endpointOf(B.PlusGlyph.glyph, false), "plus", (d) => drawn.push(d), clock);
      const options = { duration: 200, ease, reduced: false };
      c.go(B.CloseGlyph.glyph, false, options);
      while (clock.queue.length && clock.t < 700) {
        clock.tick();
        if (repeat && clock.queue.length) c.go(B.CloseGlyph.glyph, false, options);
      }
      settledAt.push(clock.t);
      assert.equal(c.status().key, "close");
    }
    assert.equal(settledAt[0], settledAt[1], `asked every frame it settles at ${settledAt[1]} ms, asked once at ${settledAt[0]} ms`);
    assert.ok(settledAt[0] >= 200);
  });

  test("a request for the glyph it left runs back; for another group member turns on; for anything else swaps at once", async () => {
    const { motion, B, clock, ease } = await load();
    const options = { duration: 200, ease, reduced: false };
    const make = () => { clock.t = 0; clock.queue = []; return motion.createMorph(motion.endpointOf(B.ArrowRightGlyph.glyph, false), "arrow-right", () => {}, clock); };
    let c = make();
    c.go(B.ArrowDownGlyph.glyph, false, options);
    for (let i = 0; i < 4; i++) clock.tick();
    c.go(B.ArrowRightGlyph.glyph, false, options);
    assert.equal(c.status().moving, true, "reversing runs back");
    c.go(B.ArrowLeftGlyph.glyph, false, options);
    assert.equal(c.status().moving, true, "another member of the group is turned to");
    c.go(B.HomeGlyph.glyph, false, options);
    assert.deepEqual([c.status().moving, c.status().key], [false, "home"], "anything else swaps at once");
    c = make();
    c.go(B.ArrowDownGlyph.glyph, false, { ...options, reduced: true });
    assert.deepEqual([c.status().moving, c.status().key], [false, "arrow-down"], "reduced motion swaps at once");
  });
});
