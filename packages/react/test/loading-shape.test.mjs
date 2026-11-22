// LoadingShape (skeleton-shape: DECISIONS 247, 248, 249b and 258; decided by Opus and approved by the owner; the implementation is reviewed by Astra). A region
// whose data is on its way draws its own parts and paints what isn't known as bones: bones follow the drawing, known words stay, a prefill shows what is
// known, the timing (300ms show-after from the page's start, a 400ms minimum, one paint for a quick reload), phases that land together and top-down, a last
// copy that never goes back to bones, one "Loading" for the page, forced colours, reduced motion and server rendering. With it, two fixes found on the way:
// a form dialog no longer slides down half its height as it opens (reduced motion is opacity only), and a tab switch is one change (the panel left goes at
// once, so the new panel never appears under it and then jumps up). Driven in Chromium against the built package with the real stylesheet. Timings are
// real time and every bound that a slow machine could stretch is a lower bound, or an upper bound with a wide margin. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as React from "react";

import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

const require = createRequire(import.meta.url);
const { renderToString } = require("react-dom/server");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const open = async (body, { theme = "dark", width = 1024, height = 900, ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme, viewport: { width, height }, ...options });
  page.errors = errors;
  return page;
};
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run(document, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 5000, polling: "raf" });

// The page's own helpers, in every fixture: a frame recorder (every animation frame, its time from `window.t0`, and what `window.read()` returns there), the
// bones drawn, and an element's layout top in the document (offsets: a transform, such as a tab panel's 8px slide, is motion and not a move).
const HELPERS = `
window.t0 = performance.now();
window.frames = [];
window.record = (read) => { const tick = () => { window.frames.push({ t: performance.now() - window.t0, ...read() }); requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
window.bones = (scope) => [...(scope ?? document).querySelectorAll(".basalt-bones[data-shown] > .basalt-bones-layer > span")].map((s) => { const r = s.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, r: s.style.borderRadius }; });
window.layoutTop = (el) => { if (!el || !el.checkVisibility({ visibilityProperty: true })) return null; let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
`;

// ---- Bones follow the drawing, and known words stay ----

const FULL = `${HELPERS}
function Drawn() {
  return (
    <div id="drawn" style={{ width: 360, padding: 16 }}>
      <table><thead><tr><th id="head">Application</th></tr></thead></table>
      <p id="lines" style={{ margin: 0, width: 200, fontSize: 16, lineHeight: "24px" }}>{B.standIn(3, 60)}</p>
      <B.Button id="filled" variant="primary">{B.standIn(4, 8)}</B.Button>
      <B.Button id="ghost" variant="ghost">{B.standIn(5, 6)}</B.Button>
      <span id="dot" style={{ display: "inline-block", width: 8, height: 8, borderRadius: "var(--basalt-radius-full)", background: "var(--basalt-text-primary)" }} />
      <svg id="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M0 0h16v16z" fill="currentColor" /></svg>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<B.LoadingShape loading label="Loading applications" shape={() => <Drawn />}>{() => null}</B.LoadingShape>);`;

describe("bones follow the drawn parts", () => {
  test("a line of words is one bar per line, as long as its words, 0.75 of the text's size and centred; a filled control is one bone in its box and radius; a mark is a bone; an icon is hidden; known words stay", async () => {
    const page = await open(FULL);
    await until(page, () => window.bones().length > 0);
    const got = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
      const range = document.createRange();
      range.selectNodeContents(document.getElementById("lines").firstChild);
      const lines = [...range.getClientRects()].map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
      const fill = (id) => getComputedStyle(document.getElementById(id)).webkitTextFillColor;
      return {
        bones: window.bones(), lines, filled: box(document.getElementById("filled")), filledRadius: getComputedStyle(document.getElementById("filled")).borderRadius,
        ghost: box(document.getElementById("ghost")), dot: box(document.getElementById("dot")), icon: box(document.getElementById("icon")),
        iconHidden: getComputedStyle(document.getElementById("icon")).visibility, headKept: Boolean(document.getElementById("head").closest("[data-bone-keep]")),
        headFill: fill("head"), linesFill: fill("lines"), headColor: getComputedStyle(document.getElementById("head")).color,
      };
    });
    const near = (a, b, d = 1) => Math.abs(a - b) <= d;
    const covers = (target) => got.bones.filter((b) => near(b.x, target.x) && near(b.y, target.y) && near(b.w, target.w) && near(b.h, target.h));
    assert.ok(got.lines.length >= 2, "the stand-in words wrap to two lines or more");
    for (const line of got.lines) {
      const bar = got.bones.find((b) => near(b.x, line.x) && near(b.w, line.w) && b.y > line.y && b.y + b.h < line.y + line.h);
      assert.ok(bar, `a bar for the line at ${line.y}: ${JSON.stringify(got.bones)}`);
      assert.equal(bar.h, 12, "0.75 of 16px");
      assert.ok(near(bar.y + bar.h / 2, line.y + line.h / 2, 1), "centred on the line");
      assert.equal(bar.r, "var(--basalt-radius-sm)");
    }
    assert.equal(covers(got.filled).length, 1, "a filled button is one bone in its own box");
    assert.equal(covers(got.filled)[0].r, got.filledRadius, "…and its own radius");
    assert.equal(covers(got.ghost).length, 0, "a ghost button (no fill, no border) is its words, not a box");
    assert.ok(got.bones.some((b) => near(b.y + b.h / 2, got.ghost.y + got.ghost.h / 2, 2) && b.x >= got.ghost.x - 1 && b.x + b.w <= got.ghost.x + got.ghost.w + 1), "the ghost button's words are a bar inside it");
    assert.equal(covers(got.dot).length, 1, "a painted mark is a bone in its box");
    assert.equal(got.bones.filter((b) => b.x < got.icon.x + got.icon.w && b.x + b.w > got.icon.x && b.y < got.icon.y + got.icon.h && b.y + b.h > got.icon.y).length, 0, "an icon is not a bone");
    assert.equal(got.iconHidden, "hidden", "an icon is hidden, its seat kept");
    assert.ok(got.headKept, "a column head is a known word");
    assert.notEqual(got.headFill, "rgba(0, 0, 0, 0)", "a known word keeps its ink");
    assert.equal(got.linesFill, "rgba(0, 0, 0, 0)", "a stand-in word under a bone has no ink");
    assert.deepEqual(page.errors, []);
    await page.close();
  });
});

describe("bones in a box that clips", () => {
  test("a table that scrolls sideways cuts its bones at its edge: nothing is drawn past it, and a bone half in view is cut", async () => {
    const page = await open(`${HELPERS}
const Cells = () => <div id="scroller" style={{ width: 300, overflowX: "auto" }}><div style={{ display: "flex", gap: 24, width: 900 }}>{Array.from({ length: 6 }, (_, i) => <span key={i} style={{ flex: "none", width: 126 }}>{B.standIn(i, 14)}</span>)}</div></div>;
createRoot(document.getElementById("root")).render(<div style={{ width: 600 }}><B.LoadingShape loading shape={() => <Cells />}>{() => null}</B.LoadingShape></div>);`);
    await until(page, () => window.bones().length > 0);
    const got = await page.evaluate(() => ({ bones: window.bones(), edge: document.getElementById("scroller").getBoundingClientRect().right }));
    assert.ok(got.bones.length >= 2, JSON.stringify(got.bones));
    assert.ok(got.bones.every((b) => b.x + b.w <= got.edge + 0.5), `bones past the scroller's edge at ${got.edge}: ${JSON.stringify(got.bones)}`);
    await page.close();
  });
});

// ---- Prefill: what is known shows at once ----

const FACTS = `
function Facts({ d }) {
  return (
    <div id="facts" style={{ width: 320, fontSize: 16, lineHeight: "24px" }}>
      <h2 id="title" style={{ margin: 0, fontSize: 20, lineHeight: "28px" }}>{d.title}</h2>
      <p id="owner" style={{ margin: 0 }}>{d.owner}</p>
      <p id="summary" style={{ margin: 0 }}>{d.summary}</p>
      <h3 id="people" style={{ margin: 0, fontSize: 16 }}>People</h3>
    </div>
  );
}
const standIns = (v) => ({ title: B.standIn(1, 22, v), owner: B.standIn(2, 14, v), summary: B.standIn(3, 70, v) });
const REAL = { title: "Checkout timing out", owner: "Dana Okafor", summary: "Payments API latency is up since the deploy; the worker change is rolled back." };
const KNOWN = { title: REAL.title };`;

describe("prefill", () => {
  test("a known field is drawn as text and an unknown one is a bone; a known word whose place differs between the two drawings is a bone", async () => {
    const page = await open(`${HELPERS}${FACTS}
createRoot(document.getElementById("root")).render(<B.LoadingShape loading prefill={(v) => <Facts d={B.fillIn(KNOWN, standIns(v))} />}>{() => <Facts d={REAL} />}</B.LoadingShape>);`);
    await until(page, () => window.bones().length > 0);
    const got = await page.evaluate(() => {
      const shape = document.querySelector(".basalt-bones");
      const el = (id) => shape.querySelector("#" + id);
      const known = (id) => el(id).hasAttribute("data-bone-keep") || el(id).hasAttribute("data-bone-ink");
      const covered = (id) => { const r = el(id).getBoundingClientRect(); return window.bones().some((b) => b.y >= r.top - 1 && b.y + b.h <= r.bottom + 1 && b.x >= r.left - 1); };
      return {
        title: el("title").textContent, titleKnown: known("title"), titleCovered: covered("title"), titleFill: getComputedStyle(el("title")).webkitTextFillColor,
        ownerKnown: known("owner"), ownerCovered: covered("owner"), summaryKnown: known("summary"), summaryCovered: covered("summary"),
        peopleKnown: known("people"), peopleCovered: covered("people"),
        twinPeople: (() => { const t = document.querySelector(".basalt-bones-twin #people").getBoundingClientRect().top - document.querySelector(".basalt-bones-twin").getBoundingClientRect().top; const a = el("people").getBoundingClientRect().top - shape.getBoundingClientRect().top; return [a, t]; })(),
      };
    });
    assert.equal(got.title, "Checkout timing out");
    assert.ok(got.titleKnown && !got.titleCovered, "the known title is drawn as itself, with no bone over it");
    assert.notEqual(got.titleFill, "rgba(0, 0, 0, 0)");
    assert.ok(!got.ownerKnown && got.ownerCovered, "the unknown owner is a bone");
    assert.ok(!got.summaryKnown && got.summaryCovered, "the unknown summary is a bone");
    assert.notEqual(got.twinPeople[0], got.twinPeople[1], "the heading under the summary sits at another place in the twin");
    assert.ok(!got.peopleKnown && got.peopleCovered, "a known word whose place differs is a bone: it would move when the summary arrived");
    await page.close();
  });
});

describe("prefill, a first part with a top margin", () => {
  test("a known heading with its own margin is known: its margin collapses out of the shape on the page and stays inside the twin, and places are compared from each drawing's first part", async () => {
    const page = await open(`${HELPERS}
const Drawn = ({ v }) => <div><h2 id="known">Checkout timing out</h2><p id="unknown">{B.standIn(2, 30, v)}</p></div>;
createRoot(document.getElementById("root")).render(<B.LoadingShape loading prefill={(v) => <Drawn v={v} />}>{() => null}</B.LoadingShape>);`);
    await until(page, () => window.bones().length > 0);
    const got = await page.evaluate(() => { const h = document.querySelector(".basalt-bones #known"); return { margin: getComputedStyle(h).marginTop, known: h.hasAttribute("data-bone-keep") || h.hasAttribute("data-bone-ink") }; });
    assert.notEqual(got.margin, "0px");
    assert.ok(got.known);
    await page.close();
  });
});

// ---- Timing ----

const TIMED = `${HELPERS}${FACTS}
B.markPageStart(window.t0);
function App() {
  const [loading, setLoading] = React.useState(true);
  window.finish = () => setLoading(false);
  return <B.LoadingShape loading={loading} prefill={(v) => <Facts d={B.fillIn(KNOWN, standIns(v))} />}>{() => <Facts d={REAL} />}</B.LoadingShape>;
}
window.record(() => ({ bones: window.bones().length, content: Boolean(document.querySelector('.basalt-loading-shape[data-phase="content"]')), leaving: document.querySelectorAll(".basalt-bones-leaving > span").length }));
createRoot(document.getElementById("root")).render(<App />);`;

describe("timing", () => {
  test("no bone before 300ms from the page's start; once shown, bones stay at least 400ms; the content takes their place at once and the last bones fade over it", async () => {
    const page = await open(TIMED);
    await until(page, () => window.bones().length > 0);
    await page.evaluate(() => window.finish());
    await until(page, () => document.querySelector('.basalt-loading-shape[data-phase="content"]'));
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() => window.frames);
    const firstBones = frames.find((f) => f.bones > 0);
    const firstContent = frames.find((f) => f.content);
    assert.ok(firstBones.t >= 299, `bones appeared at ${firstBones.t}ms`);
    assert.ok(firstBones.t < 1000, `bones appeared late, at ${firstBones.t}ms`);
    assert.ok(firstContent.t - firstBones.t >= 399, `bones were shown for ${firstContent.t - firstBones.t}ms`);
    assert.ok(frames.some((f) => f.content && f.leaving > 0), "the last bones fade out over the content");
    assert.equal(frames.at(-1).leaving, 0, "and are gone");
    await page.close();
  });

  test("a load under 300ms never shows a bone and says nothing", async () => {
    const page = await open(TIMED);
    await page.evaluate(() => new Promise((resolve) => setTimeout(() => { window.finish(); resolve(); }, 120)));
    await page.waitForTimeout(500);
    const { frames, said } = await page.evaluate(() => ({ frames: window.frames, said: document.querySelector("[data-basalt-loading-status]")?.textContent ?? "" }));
    assert.equal(frames.filter((f) => f.bones > 0 || f.leaving > 0).length, 0);
    assert.ok(frames.at(-1).content);
    assert.equal(said, "");
    await page.close();
  });
});

// ---- A reload that is quick paints once ----

// A fresh navigation (so performance.now() starts at the navigation, as a reload's does), with the recorder installed before the page's own script. A screen
// is a frame whose visible words or bones differ from the frame before; a run of blank frames counts once (as the prototype's paints.mjs counts them).
async function reload(body, delay) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__screens = [];
    let last = null;
    const read = () => {
      const root = document.getElementById("root");
      const words = [];
      if (root && root.checkVisibility({ visibilityProperty: true })) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const parent = node.parentElement;
          if (!node.data.trim() || parent.closest(".basalt-bones-twin") || !parent.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
          const shape = parent.closest(".basalt-bones");
          if (shape && !parent.closest("[data-bone-keep]") && !parent.hasAttribute("data-bone-ink")) continue;
          words.push(node.data.trim());
        }
      }
      const bones = root?.checkVisibility({ visibilityProperty: true }) ? document.querySelectorAll(".basalt-bones[data-shown] > .basalt-bones-layer > span").length : 0;
      const shape = Boolean(root?.checkVisibility({ visibilityProperty: true }) && document.querySelector(".basalt-bones"));
      return { words: words.join("|"), bones, shape };
    };
    const tick = () => {
      const frame = read();
      const key = `${frame.words}#${frame.bones}#${frame.shape}`;
      if (key !== last) { last = key; window.__screens.push({ t: performance.now(), ...frame }); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const script = await bundleFixture(`${FACTS}
${body}
function App() {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { const timer = setTimeout(() => setLoading(false), ${delay}); return () => clearTimeout(timer); }, []);
  return <B.LoadingShape loading={loading} prefill={(v) => <Facts d={B.fillIn(KNOWN, standIns(v))} />}>{() => <Facts d={REAL} />}</B.LoadingShape>;
}
createRoot(root).render(<App />);`);
  await page.route("http://basalt.test/", (route) => route.fulfill({ contentType: "text/html", body: `<html data-theme="dark"><head><style>${css()}</style></head><body><div id="root"></div><script>${script.replaceAll("</script", "<\\/script")}</script></body></html>` }));
  await page.goto("http://basalt.test/");
  await page.waitForTimeout(1200);
  const screens = await page.evaluate(() => window.__screens);
  await page.close();
  return { screens, errors };
}

describe("a reload", () => {
  test("holdFirstPaint: a page whose data comes in 120ms paints once: blank, then the page; never its structure, then its content", async () => {
    const { screens, errors } = await reload(`const root = document.getElementById("root"); B.holdFirstPaint(root);`, 120);
    assert.deepEqual(errors, []);
    const seen = screens.filter((s) => s.words || s.bones || s.shape);
    assert.equal(seen.length, 1, `screens after the blank: ${JSON.stringify(seen)}`);
    assert.match(seen[0].words, /Dana Okafor/, "the one screen is the loaded page");
    assert.ok(screens.length <= 2, `blank, then the page: ${JSON.stringify(screens)}`);
  });

  test("without it, the same page paints its known shape first and its content after: what the hold removes", async () => {
    const { screens } = await reload(`const root = document.getElementById("root");`, 120);
    const seen = screens.filter((s) => s.words || s.bones || s.shape);
    assert.ok(seen.length >= 2, JSON.stringify(seen));
    assert.ok(seen[0].shape && !/Dana Okafor/.test(seen[0].words));
  });

  test("a slow load is shown at 250ms with no bone before 300ms from the navigation", async () => {
    const { screens } = await reload(`const root = document.getElementById("root"); B.holdFirstPaint(root);`, 900);
    const shown = screens.find((s) => s.shape || s.words);
    const bones = screens.find((s) => s.bones > 0);
    assert.ok(shown && shown.t >= 245, `first shown at ${shown?.t}`);
    assert.ok(bones && bones.t >= 299, `bones at ${bones?.t}`);
  });
});

// ---- Phases ----

const PHASES = `${HELPERS}
const Part = ({ id, n }) => <section id={id} style={{ padding: 8 }}>{Array.from({ length: n }, (_, i) => <p key={i} style={{ margin: 0, lineHeight: "24px" }}>{id} line {i + 1}</p>)}</section>;
const ShapeOf = ({ n }) => <section style={{ padding: 8 }}>{Array.from({ length: n }, (_, i) => <p key={i} style={{ margin: 0, lineHeight: "24px" }}>{B.standIn(i, 20)}</p>)}</section>;
B.markPageStart(window.t0);
const AT = { a: 60, b: 160, c: 700, d: 760 };
window.releases = [];
function App() {
  const [ready, setReady] = React.useState({ a: false, b: false, c: false, d: false });
  React.useEffect(() => { for (const k of Object.keys(AT)) setTimeout(() => setReady((r) => ({ ...r, [k]: true })), AT[k]); }, []);
  const r = B.useStaged(ready);
  React.useEffect(() => { window.releases.push({ t: performance.now() - window.t0, ...r }); }, [r]);
  return (
    <div>
      <B.LoadingShape loading={!r.a} shape={() => <ShapeOf n={2} />}>{() => <Part id="p1" n={4} />}</B.LoadingShape>
      <B.LoadingShape loading={!(r.a && r.b)} shape={() => <ShapeOf n={2} />}>{() => <Part id="p2" n={3} />}</B.LoadingShape>
      <B.LoadingShape loading={!(r.a && r.b && r.c)} shape={() => <ShapeOf n={5} />}>{() => <Part id="p3" n={2} />}</B.LoadingShape>
      <B.LoadingShape loading={!(r.a && r.b && r.c && r.d)} shape={() => <ShapeOf n={2} />}>{() => <Part id="p4" n={6} />}</B.LoadingShape>
    </div>
  );
}
window.record(() => Object.fromEntries(["p1", "p2", "p3", "p4"].map((id) => [id, window.layoutTop(document.getElementById(id))])));
createRoot(document.getElementById("root")).render(<App />);`;

describe("phases", () => {
  test("useStaged lands parts arriving within 250ms together, and lands everything at once when the last part arrives", async () => {
    const page = await open(PHASES);
    await until(page, () => document.getElementById("p4"));
    const releases = await page.evaluate(() => window.releases);
    assert.ok(!releases.some((r) => r.a !== r.b), `a (60ms) and b (160ms) never land apart: ${JSON.stringify(releases)}`);
    const ab = releases.find((r) => r.a);
    assert.ok(ab.t >= 245, `a and b land at the 250ms window, not at 60ms: ${ab.t}`);
    assert.ok(!releases.some((r) => r.c !== r.d), `c (700ms) waits for d (760ms), which arrives within its 120ms gap: ${JSON.stringify(releases)}`);
    await page.close();
  });

  test("parts land top-down, and nothing that has landed moves (0px), though every part's content is another height than its shape", async () => {
    const page = await open(PHASES);
    await until(page, () => document.getElementById("p4"));
    await page.waitForTimeout(400);
    const frames = await page.evaluate(() => window.frames);
    const first = Object.fromEntries(["p1", "p2", "p3", "p4"].map((id) => [id, frames.findIndex((f) => f[id] !== null)]));
    assert.ok(first.p1 <= first.p2 && first.p2 <= first.p3 && first.p3 <= first.p4, `landing order ${JSON.stringify(first)}`);
    let worst = 0;
    for (const id of ["p1", "p2", "p3", "p4"]) {
      const tops = frames.map((f) => f[id]).filter((y) => y !== null);
      for (const y of tops) worst = Math.max(worst, Math.abs(y - tops[0]));
    }
    assert.equal(worst, 0, "a landed part moved");
    await page.close();
  });
});

// ---- A last copy, refreshing ----

describe("refreshing", () => {
  test("a last copy is content from the first frame and never goes back to bones; \"Updating\" shows only after a second, in a seat kept for it", async () => {
    const page = await open(`${HELPERS}
function App() {
  const [fetching, setFetching] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  window.done = () => setFetching(false);
  window.reload = () => setLoading(true);
  const late = B.useRefreshing(fetching);
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}><B.Refreshing on={late} /><span id="after">Publish update</span></div>
      <B.LoadingShape loading={loading} refreshing={fetching} shape={() => <p>{B.standIn(1, 30)}</p>}>{() => <p id="copy">INC-0011 Checkout timing out</p>}</B.LoadingShape>
    </div>
  );
}
window.record(() => { const mark = document.querySelector(".basalt-refreshing"); if (!mark) return { pending: true }; return { shape: Boolean(document.querySelector(".basalt-bones")), copy: Boolean(document.getElementById("copy")), on: mark.hasAttribute("data-on"), seat: mark.getBoundingClientRect().width, after: document.getElementById("after").getBoundingClientRect().left, refreshing: document.querySelector(".basalt-loading-shape").hasAttribute("data-refreshing") }; });
createRoot(document.getElementById("root")).render(<App />);`);
    await until(page, () => document.querySelector(".basalt-refreshing[data-on]"));
    await page.evaluate(() => { window.reload(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.done());
    await page.waitForTimeout(100);
    const { frames, hidden } = await page.evaluate(() => ({ frames: window.frames.filter((f) => !f.pending), hidden: document.querySelector(".basalt-refreshing").getAttribute("aria-hidden") }));
    assert.ok(frames.every((f) => f.copy && !f.shape), "the copy is on screen in every frame, and no shape is ever drawn (a loading flag set later is not a way back)");
    const on = frames.find((f) => f.on);
    assert.ok(on.t >= 999, `"Updating" came at ${on.t}ms`);
    assert.ok(frames.filter((f) => f.t < 990).every((f) => !f.on));
    assert.ok(frames.filter((f) => f.t < 990).every((f) => f.refreshing), "the region carries data-refreshing while it refreshes");
    assert.equal(new Set(frames.map((f) => f.seat)).size, 1, "the mark's seat is one width, shown or not");
    assert.equal(new Set(frames.map((f) => f.after)).size, 1, "nothing after it moves");
    assert.equal(hidden, "true", "once the refresh lands the mark is gone for assistive technology too");
    assert.ok(!frames.at(-1).on && !frames.at(-1).refreshing);
    await page.close();
  });
});

// ---- Accessibility ----

const TWO = `${HELPERS}${FACTS}
function App() {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(true);
  window.finishA = () => setA(false);
  window.finishB = () => setB(false);
  const shape = () => <div><Facts d={standIns(0)} /><B.Button id="inside">Resolve</B.Button><a id="link" href="#x">Open</a></div>;
  return (
    <main>
      <h1>Incidents</h1>
      <B.Button id="before">Declare</B.Button>
      <B.LoadingShape loading={a} label="Loading incidents" shape={shape}>{() => <Facts d={REAL} />}</B.LoadingShape>
      <B.LoadingShape loading={b} label="Loading the rail" prefill={(v) => <Facts d={B.fillIn(KNOWN, standIns(v))} />}>{() => <p>Rail</p>}</B.LoadingShape>
      <B.Button id="after">Find</B.Button>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

describe("accessibility", () => {
  test("\"Loading\" is said once for the page, nothing as a part lands, and the line is cleared when all have landed; the shape is aria-hidden and inert, and cannot be reached by Tab", async () => {
    const page = await open(TWO);
    await until(page, () => window.bones().length > 0);
    const loading = await page.evaluate(() => ({
      regions: document.querySelectorAll("[data-basalt-loading-status]").length,
      said: document.querySelector("[data-basalt-loading-status]")?.textContent,
      role: document.querySelector("[data-basalt-loading-status]")?.getAttribute("role"),
      busy: [...document.querySelectorAll(".basalt-loading-shape")].map((r) => r.getAttribute("aria-busy")),
      shapes: [...document.querySelectorAll(".basalt-bones")].map((s) => [s.getAttribute("aria-hidden"), s.inert]),
    }));
    assert.deepEqual(loading, { regions: 1, said: "Loading incidents", role: "status", busy: ["true", "true"], shapes: [["true", true], ["true", true]] });
    await page.focus("#before");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "after", "Tab goes past both shapes");
    await page.evaluate(() => window.finishA());
    await until(page, () => document.querySelectorAll('.basalt-loading-shape[aria-busy="true"]').length === 1);
    assert.equal(await page.evaluate(() => document.querySelector("[data-basalt-loading-status]").textContent), "Loading incidents", "nothing is said when a part lands");
    await page.evaluate(() => window.finishB());
    await until(page, () => document.querySelectorAll('.basalt-loading-shape[aria-busy="true"]').length === 0);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-basalt-loading-status]").length), 1);
    assert.equal(await page.evaluate(() => document.querySelector("[data-basalt-loading-status]").textContent), "", "nothing is said when the page completes");
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`axe passes while loading and when loaded, in ${theme}`, async () => {
      const page = await open(TWO, { theme });
      await until(page, () => window.bones().length > 0);
      assert.deepEqual(await axe(page), [], "loading");
      await page.evaluate(() => { window.finishA(); window.finishB(); });
      await until(page, () => document.querySelectorAll('.basalt-loading-shape[aria-busy="true"]').length === 0);
      await settle(page);
      assert.deepEqual(await axe(page), [], "loaded");
      await page.close();
    });
  }
});

// ---- Modes ----

const PREFILLED = `${HELPERS}${FACTS}
createRoot(document.getElementById("root")).render(<B.LoadingShape loading prefill={(v) => <Facts d={B.fillIn(KNOWN, standIns(v))} />}>{() => null}</B.LoadingShape>);`;

describe("modes", () => {
  test("forced colours: what is known is drawn as itself, the unknown is hidden, and each bone is a 1px ButtonBorder edge in its place", async () => {
    const page = await open(PREFILLED, { forcedColors: "active" });
    await until(page, () => window.bones().length > 0);
    const got = await page.evaluate(() => {
      const shape = document.querySelector(".basalt-bones");
      const bone = getComputedStyle(shape.querySelector(".basalt-bones-layer > span"));
      return { title: getComputedStyle(shape.querySelector("#title")).visibility, owner: getComputedStyle(shape.querySelector("#owner")).visibility, border: [bone.borderTopWidth, bone.borderTopStyle], layer: getComputedStyle(shape.querySelector(".basalt-bones-layer")).visibility, height: shape.getBoundingClientRect().height };
    });
    assert.equal(got.title, "visible");
    assert.equal(got.owner, "hidden");
    assert.deepEqual(got.border, ["1px", "solid"]);
    assert.equal(got.layer, "visible");
    assert.ok(got.height > 80, "the space is held");
    await page.close();
  });

  test("the bones breathe on one pulse, which holds still under reduced motion and under data-loops=\"held\"", async () => {
    const pulse = async (options, held = false) => {
      const page = await open(PREFILLED, options);
      if (held) await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
      await until(page, () => window.bones().length > 0);
      const got = await page.evaluate(() => ({ layer: getComputedStyle(document.querySelector(".basalt-bones-layer")).animationName, bone: getComputedStyle(document.querySelector(".basalt-bones-layer > span")).animationName }));
      await page.close();
      return got;
    };
    assert.deepEqual(await pulse({}), { layer: "basalt-skeleton", bone: "none" }, "one animation, on the layer");
    assert.deepEqual(await pulse({ reducedMotion: "reduce" }), { layer: "none", bone: "none" });
    assert.deepEqual(await pulse({}, true), { layer: "none", bone: "none" });
  });
});

// ---- Servers ----

// One tree for both sides, as text: (B, h) => element, so the server renders it in Node and the page hydrates the same thing.
const TREE = `(B, h) => h(B.LoadingShape, { loading: true, prefill: (v) => h("div", null, h("h2", { id: "title" }, "Checkout timing out"), h("p", { id: "owner" }, B.standIn(2, 30, v))) }, () => h("p", null, "Done"))`;

describe("servers", () => {
  test("renders on a server with no window: the shape's structure, waiting, with no bone", async () => {
    const B = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const html = renderToString(new Function("B", "h", `return (${TREE})(B, h)`)(B, React.createElement));
    assert.match(html, /class="basalt-loading-shape" data-phase="waiting" aria-busy="true"/);
    assert.match(html, /class="basalt-bones"[^>]*aria-hidden="true" inert=""/);
    assert.doesNotMatch(html, /data-shown/);
    assert.doesNotMatch(html, /basalt-skeleton/);
    assert.match(html, /Checkout timing out/);
    // The plain helpers need no React and no browser.
    assert.equal(B.fillIn({ a: { b: 1 } }, { a: { b: 0, c: 2 }, d: 3 }).a.c, 2);
    assert.notEqual(B.standIn(1, 20, 0), B.standIn(1, 20, 1));
    assert.equal(B.standIn(1, 20, 0), B.standIn(1, 20, 0));
    assert.equal(B.rememberedCount("x"), null, "no storage on a server reads as none");
  });

  test("hydrates with no mismatch, and the bones come after hydration", async () => {
    const B = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const html = renderToString(new Function("B", "h", `return (${TREE})(B, h)`)(B, React.createElement));
    const page = await browser.newPage({ viewport: { width: 1024, height: 700 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
    await page.setContent(`<html data-theme="dark"><head><style>${css()}</style></head><body><div id="root">${html}</div></body></html>`);
    assert.equal(await page.evaluate(() => document.querySelectorAll(".basalt-bones-layer > span").length), 0, "server HTML holds no bone");
    await page.addScriptTag({ content: await bundleFixture(`import { hydrateRoot } from "react-dom/client"; const tree = (${TREE})(B, React.createElement); hydrateRoot(document.getElementById("root"), tree, { onRecoverableError: (e) => console.error("recoverable: " + e.message) });`) });
    await until(page, () => document.querySelectorAll(".basalt-bones[data-shown] > .basalt-bones-layer > span").length > 0);
    const known = await page.evaluate(() => document.querySelector(".basalt-bones #title").hasAttribute("data-bone-ink") || document.querySelector(".basalt-bones #title").hasAttribute("data-bone-keep"));
    assert.ok(known, `the known title is measured as known after hydration: ${await page.evaluate(() => document.getElementById("root").innerHTML)}`);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

// ---- The form dialog's entry: a fix found on the way ----

const DIALOG = `
function App() {
  const [open, setOpen] = React.useState(false);
  window.openIt = () => setOpen(true);
  return (
    <B.Dialog open={open} onOpenChange={setOpen}>
      <B.DialogContent form>
        <B.SheetHeader closeLabel="Close find a team"><B.DialogTitle>Find a team or vendor</B.DialogTitle></B.SheetHeader>
        <B.SheetBody><B.DialogDescription>Application owners and vendors.</B.DialogDescription><B.Input aria-label="Search" /><div style={{ height: 300 }} /></B.SheetBody>
      </B.DialogContent>
    </B.Dialog>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
const sampleDialog = (page) => page.evaluate(() => new Promise((resolve) => {
  const out = [];
  window.openIt();
  const t0 = performance.now();
  const tick = () => {
    const d = document.querySelector(".basalt-dialog");
    if (d) { const r = d.getBoundingClientRect(); out.push({ top: r.top, middle: r.top + r.height / 2, transform: getComputedStyle(d).transform, opacity: Number(getComputedStyle(d).opacity) }); }
    if (performance.now() - t0 < 350) requestAnimationFrame(tick); else resolve(out);
  };
  requestAnimationFrame(tick);
}));

describe("the form dialog's entry", () => {
  test("under reduced motion it only fades: its box never moves (it slid down half its height as its held top landed)", async () => {
    const page = await open(DIALOG, { reducedMotion: "reduce", width: 1440 });
    const frames = await sampleDialog(page);
    assert.ok(frames.length > 5);
    const tops = frames.map((f) => Math.round(f.top));
    assert.equal(new Set(tops).size, 1, `the dialog's top across the entry: ${tops.join(", ")}`);
    assert.ok(frames.every((f) => /^matrix\(1, 0, 0, 1, [-\d.]+, 0\)$/.test(f.transform)), "no scale and no vertical move");
    assert.ok(frames[0].opacity < 1 && frames.at(-1).opacity === 1, "it fades in");
    await page.close();
  });

  test("with motion it scales from .98 about its middle and fades, and does not slide", async () => {
    const page = await open(DIALOG, { width: 1440 });
    const frames = await sampleDialog(page);
    const middles = frames.map((f) => f.middle);
    assert.ok(Math.max(...middles) - Math.min(...middles) <= 1, `the dialog's middle across the entry: ${middles.map(Math.round).join(", ")}`);
    assert.ok(frames.every((f) => /, 0\)$/.test(f.transform)), "no vertical translate");
    await page.close();
  });
});

// ---- A tab switch is one change ----

const TABS = (stacked, loaded) => `${HELPERS}
const ROWS = (prefix, n) => <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{Array.from({ length: n }, (_, i) => <li key={i} style={{ height: 48 }}>{prefix} incident {i + 1}</li>)}</ul>;
function Others({ d }) {
  return (
    <div>
      <p id="wait" style={{ margin: 0 }}>{d.waiting} of your incidents wait on you · Show them</p>
      <p id="result" style={{ margin: 0 }}>Showing {d.count} of {d.count} other incidents</p>
      {ROWS("Other", d.count)}
    </div>
  );
}
const standInOthers = (v) => ({ waiting: v === 0 ? 2 : 5, count: v === 0 ? 6 : 7 });
const Panels = ${stacked} ? (props) => <B.TabsPanels stacked {...props} /> : React.Fragment;
function App() {
  const [tab, setTab] = React.useState("yours");
  const [loaded, setLoaded] = React.useState(${loaded});
  window.land = () => setLoaded(true);
  return (
    <div style={{ padding: 16 }}>
      <B.Tabs value={tab} onValueChange={setTab}>
        <B.TabsList aria-label="Incidents"><B.Tab value="yours">Your incidents</B.Tab><B.Tab value="others">Other active incidents</B.Tab></B.TabsList>
        <Panels>
          <B.TabsPanel value="yours"><p id="yours-result" style={{ margin: 0 }}>Showing 30 of your 30 incidents</p>{ROWS("Your", 30)}</B.TabsPanel>
          <B.TabsPanel value="others">
            <p id="desc" style={{ margin: 0 }}>You are not in these rooms. Open one to see its facts and ask its commander to admit you.</p>
            <B.LoadingShape loading={!loaded} prefill={(v) => <Others d={B.fillIn({}, standInOthers(v))} />}>{() => <Others d={{ waiting: 3, count: 4 }} />}</B.LoadingShape>
          </B.TabsPanel>
        </Panels>
      </B.Tabs>
      <p id="below">Below the tabs</p>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

async function switchTabs(fixture, { land = 0 } = {}) {
  const page = await open(fixture, { height: 700 });
  await settle(page);
  await page.evaluate(() => window.record(() => {
    const panels = [...document.querySelectorAll('[role="tabpanel"]')].filter((p) => p.checkVisibility({ visibilityProperty: true }));
    const desc = document.getElementById("desc");
    const real = document.querySelector('.basalt-loading-shape[data-phase="content"]');
    return {
      panels: panels.length, desc: window.layoutTop(desc), region: window.layoutTop(desc?.nextElementSibling),
      wait: real ? window.layoutTop(real.querySelector("#wait")) : null, result: real ? window.layoutTop(real.querySelector("#result")) : null,
      below: window.layoutTop(document.getElementById("below")), slide: desc ? desc.closest('[role="tabpanel"]').getAnimations().map((a) => a.animationName).join() : "",
    };
  }));
  const at = await page.evaluate(() => performance.now() - window.t0);
  await page.getByRole("tab", { name: "Other active incidents" }).click();
  if (land) { await page.waitForTimeout(land); await page.evaluate(() => window.land()); }
  await page.waitForTimeout(700);
  const frames = (await page.evaluate(() => window.frames)).filter((f) => f.t > at);
  await page.close();
  return frames;
}
const drift = (frames, key) => { const ys = frames.map((f) => f[key]).filter((y) => y !== null); return ys.length ? Math.max(...ys) - Math.min(...ys) : 0; };

describe("a tab switch is one change", () => {
  test("with its data on hand: the new panel is in its place from its first frame, the old one goes at once, and nothing moves (0px); the 8px slide stays", async () => {
    const frames = await switchTabs(TABS(false, true));
    const after = frames.filter((f) => f.desc !== null);
    assert.ok(after.length > 5);
    assert.ok(frames.every((f) => f.panels === 1), `never two panels: ${JSON.stringify(frames.map((f) => f.panels))}`);
    for (const key of ["desc", "region", "wait", "result"]) assert.equal(drift(after, key), 0, `${key} moved: ${after.map((f) => f[key]).join(", ")}`);
    assert.ok(after.some((f) => f.slide.includes("basalt-slide")), "the panel's slide and fade still run (motion by transform, not a move)");
  });

  test("with its data on its way: the description and the region's seats paint with the switch, and the content lands in them (0px for what had landed)", async () => {
    const frames = await switchTabs(TABS(false, false), { land: 500 });
    const after = frames.filter((f) => f.desc !== null);
    assert.ok(frames.every((f) => f.panels === 1));
    assert.equal(drift(after, "desc"), 0, "the description is in the switch's first paint, and stays");
    assert.equal(drift(after, "region"), 0, "the region's top is held from the first paint");
    for (const key of ["wait", "result"]) assert.equal(drift(after, key), 0, `${key} moved after it landed`);
    assert.ok(after.some((f) => f.wait !== null), "the content landed");
  });

  test("stacked panels hold one height through the switch, and only one panel is seen", async () => {
    const frames = await switchTabs(TABS(true, true));
    assert.ok(frames.every((f) => f.panels === 1), `panels seen: ${frames.map((f) => f.panels).join(",")}`);
    assert.equal(drift(frames, "below"), 0, "what is under the tabs never moves");
  });
});
