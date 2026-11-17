// A header over full-bleed art, the stage and framed art (council item 104), driven in Chromium against the built package with the real
// stylesheet. The fixtures load no web font, so text widths differ from a Mac's on CI's Linux runner: measured margins here are wider
// than a fallback font's width. A transition is sampled by pausing it and seeking (document.getAnimations()), never by waiting on a
// clock.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { chromium } from "playwright";

import { launchOptions } from "../../../scripts/chromium-launch.mjs";

import { bundleFixture, fixturePage, freezeAnimations, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const { checkHeadroom, measureHeadroom } = await import(pathToFileURL(path.join(pkg, "dist", "testing", "headroom.js")).href);
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;
const LINKS = `[{href:"#product",label:"Product",current:true},{href:"#docs",label:"Docs"},{href:"#pricing",label:"Pricing"}]`;
const TOGGLE = `<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />`;
const HEADER = (extra = "") => `<B.SiteHeader brand={<>${MARK}<span>Acme</span></>} brandLabel="Acme home" links={${LINKS}} themeToggle={${TOGGLE}} action={<B.Button variant="primary">Get started</B.Button>} ${extra} />`;

// Drawn art, synthetic: dunes from the art tokens, with the top 140px left to the field (the headroom is 80).
const DUNES = `<svg viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true"><rect width="1440" height="600" fill="var(--basalt-art-field)"/><path d="M0 330 C300 250 520 400 760 320 S1200 260 1440 330 V600 H0Z" fill="var(--basalt-art-tone-1)"/><path d="M0 430 C260 360 480 480 760 410 S1180 380 1440 440 V600 H0Z" fill="var(--basalt-art-tone-2)"/></svg>`;
// The same scene with its art run up under the bar: a lit band across the top, past the limit in both themes.
const BUSY = `<svg viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true"><rect width="1440" height="600" fill="var(--basalt-art-field)"/><rect y="12" width="1440" height="22" fill="var(--basalt-art-mark)"/></svg>`;

/** A page: the header, a stage (or not) and a long page below it. */
const page = ({ stage = true, headroom = true, art = DUNES, header = "", below = 3200, extra = "" } = {}) => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
  createRoot(document.getElementById("root")).render(<div>${HEADER(header)}${stage ? `<B.Stage headroom={${headroom}} art={${art}}><div style={{ height: 400, padding: "0 24px" }}><h1 data-quiet="headline" style={{ margin: 0, font: "600 32px/40px sans-serif" }}>A synthetic headline</h1></div></B.Stage>` : `<main style={{ height: 480 }} />`}${extra}<main style={{ height: ${below} }}><p id="anchor" style={{ marginTop: 1500 }}>Synthetic anchor.</p></main></div>);`;

const open = async (body, { width = 1440, height = 800, theme = "dark", ...options } = {}) => {
  const { page: p, errors } = await fixturePage(browser, body, { theme, viewport: { width, height }, ...options });
  await settle(p);
  await frames(p);
  p.errors = errors;
  return p;
};
/** Two animation frames: an IntersectionObserver callback and the state it sets have both landed. */
const frames = (p, n = 3) => p.evaluate(async (count) => { for (let i = 0; i < count; i++) await new Promise((resolve) => requestAnimationFrame(resolve)); }, n);
const scrollTo = async (p, y) => { await p.evaluate((top) => window.scrollTo(0, top), y); await frames(p); };
/**
 * Waits, in real time from the test, until `check` is true on the page. For a test on the frozen clock (freezeAnimations): there the page's
 * requestAnimationFrame is the test's, so `frames` and `waitForFunction` would wait on a clock that only the test moves. The observer, React
 * and the browser's scroll run in real time, so the state lands by itself; the animation it starts stays at its first instant until the test
 * advances it.
 */
const until = async (p, check, argument) => {
  for (const deadline = Date.now() + 10_000; Date.now() < deadline; await new Promise((resolve) => setTimeout(resolve, 10))) if (await p.evaluate(check, argument)) return;
  throw new Error(`the page never reached ${check}`);
};
/** A scroll on the frozen clock: the page scrolls, and the bar's state follows before the call returns, with no animation aged. */
const frozenScroll = async (p, y) => {
  const want = y < 1;
  await p.evaluate((top) => window.scrollTo(0, top), y);
  await until(p, (expected) => document.querySelector("header.basalt-site-header").hasAttribute("data-top") === expected, want);
};

/** The header's state: what the browser computed, and the two marks the component writes. */
const bar = (p) => p.locator("header.basalt-site-header").evaluate((el) => {
  const s = getComputedStyle(el);
  return { background: s.backgroundColor, line: s.borderBottomColor, lineStyle: s.borderBottomStyle, filter: s.backdropFilter, top: el.hasAttribute("data-top"), jump: el.hasAttribute("data-jump"), height: el.getBoundingClientRect().height, ink: getComputedStyle(el.querySelector(".basalt-site-link:not([aria-current])")).color, brand: getComputedStyle(el.querySelector(".basalt-site-brand")).color };
});
/** A CSS colour as [r, g, b, a] in 0..255, resolved by the page's own canvas. */
const rgba = (p, value) => p.evaluate((v) => { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d"); x.clearRect(0, 0, 1, 1); x.fillStyle = v; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; }, value);
const token = (p, name, property = "backgroundColor") => p.evaluate(([n, prop]) => { const probe = document.createElement("div"); probe.style[prop] = `var(--basalt-${n})`; document.body.append(probe); const v = getComputedStyle(probe)[prop]; probe.remove(); return v; }, [name, property]);
const alphaOf = async (p, value) => (await rgba(p, value))[3];
/** The transitions running on the header, with the property each animates. */
const running = (p) => p.locator("header.basalt-site-header").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty).map((a) => ({ property: a.transitionProperty, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })));
const box = (p, selector, n = 0) => p.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const near = (actual, expected, message, tolerance = 0.01) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";

for (const theme of ["dark", "light"]) {
  describe(`the clear bar, ${theme}`, () => {
    test("over a declared stage at scroll 0 it is clear: no fill, no blur, a transparent line, and the 56px bar", async () => {
      const p = await open(page(), { theme });
      const s = await bar(p);
      assert.ok(s.top, "the page reports it is at its top");
      assert.equal(await alphaOf(p, s.background), 0, `no fill: ${s.background}`);
      assert.equal(await alphaOf(p, s.line), 0, `a transparent line: ${s.line}`);
      assert.equal(s.lineStyle, "solid", "the line is a transparent border, so nothing moves when it arrives");
      assert.equal(s.filter, "none", "no blur");
      assert.equal(s.height, 56);
      assert.deepEqual(p.errors, []);
      await p.close();
    });

    test("it sits on the art with nothing added: no scrim, gradient, text-shadow or blend, and the ink is the theme's own", async () => {
      const p = await open(page(), { theme });
      const found = await p.evaluate(() => [...document.querySelectorAll("header.basalt-site-header, header.basalt-site-header *")].map((el) => { const s = getComputedStyle(el); return { tag: el.tagName + "." + [...el.classList].join("."), shadow: s.textShadow, blend: s.mixBlendMode, image: s.backgroundImage, filter: s.filter }; }).filter((x) => x.shadow !== "none" || x.blend !== "normal" || x.image !== "none" || x.filter !== "none"));
      assert.deepEqual(found, [], "nothing but the ink sits on the art");
      const s = await bar(p);
      assert.equal(s.ink, await token(p, "text-secondary", "color"), "links at rest are secondary");
      assert.equal(s.brand, await token(p, "text-primary", "color"), "the brand is primary");
      // And there is no layer behind it: the stage's art is what is under the bar's box.
      assert.equal(await p.evaluate(() => document.querySelectorAll(".basalt-stage ~ *, .basalt-stage-art > *").length > 0), true);
      await p.close();
    });

    test("from the first pixel of scroll it is the smoked bar: the fill, the blur, the line; the box and the ink are unchanged", async () => {
      const p = await open(page(), { theme });
      const clear = await bar(p);
      const geometry = async () => ({ brand: await box(p, ".basalt-site-brand"), toggle: await box(p, ".basalt-bar-actions button"), link: await box(p, ".basalt-site-link", 1) });
      const before = await geometry();
      await scrollTo(p, 1);
      await settle(p);
      const smoked = await bar(p);
      assert.ok(!smoked.top, "1px of scroll is not the top");
      assert.deepEqual(await rgba(p, smoked.background), await rgba(p, await token(p, "surface-chrome")), "the fill is surface-chrome");
      assert.deepEqual(await rgba(p, smoked.line), await rgba(p, await token(p, "border-hairline", "borderBottomColor")), "the line is the hairline");
      assert.match(smoked.filter, /blur\(12px\)/, "the blur is blur-chrome");
      assert.equal(smoked.height, 56, "the bar never grows");
      assert.equal(smoked.ink, clear.ink, "the ink does not change");
      assert.equal(smoked.brand, clear.brand);
      assert.deepEqual(await geometry(), before, "nothing in the bar moves");
      await scrollTo(p, 0);
      await settle(p);
      assert.deepEqual(await bar(p), clear, "back at the top it is exactly the clear bar again");
      await p.close();
    });

    test("the rubber band above the top counts as the top", async () => {
      const p = await open(page(), { theme });
      await scrollTo(p, 1);
      assert.equal((await bar(p)).top, false);
      // A negative scroll is not reachable in headless; the sentinel is fully in view above the top as at 0, so the rule is `top >= 0`.
      const sentinel = await p.evaluate(() => { const s = document.querySelector("[data-basalt-top-sentinel]"); const r = s.getBoundingClientRect(); return { count: document.querySelectorAll("[data-basalt-top-sentinel]").length, parent: s.parentElement === document.documentElement, height: r.height, width: r.width, top: r.top + scrollY, pos: getComputedStyle(s).position }; });
      assert.deepEqual(sentinel, { count: 1, parent: true, height: 1, width: 1, top: 0, pos: "absolute" }, "one 1px sentinel at the document's top");
      await p.close();
    });

    test("there is no scroll handler: the bar registers no scroll, wheel or touch listener, and its one observer is on the 1px sentinel", async () => {
      // React registers a few of these at its root for every app, so the bar is compared with the same page with the observer off (`solid`).
      const listeners = async (body) => {
        const p = await browser.newPage({ viewport: { width: 1440, height: 800 } });
        await p.addInitScript(() => {
          window.__scrollListeners = 0; window.__observed = [];
          const add = EventTarget.prototype.addEventListener;
          EventTarget.prototype.addEventListener = function (type, ...rest) { if (type === "scroll" || type === "wheel" || type === "touchmove") window.__scrollListeners += 1; return add.call(this, type, ...rest); };
          const Original = window.IntersectionObserver;
          window.IntersectionObserver = class extends Original { observe(target) { window.__observed.push(target.getAttribute("data-basalt-top-sentinel") !== null); return super.observe(target); } };
        });
        // Served, not set: an init script runs on a navigation, not on setContent.
        const script = (await bundleFixture(body)).replaceAll("</script", "<\\/script");
        await p.route("http://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<html data-theme="${theme}"><head><meta charset="utf-8"><style>${css()}</style></head><body><div id="root"></div><script>${script}</script></body></html>` }));
        await p.goto("http://basalt.test/page");
        await frames(p);
        await scrollTo(p, 700);
        const found = await p.evaluate(() => [window.__scrollListeners, window.__observed]);
        await p.close();
        return found;
      };
      const [withBar, observed] = await listeners(page());
      const [without, none] = await listeners(page({ header: "solid" }));
      assert.equal(withBar, without, "the observer adds no scroll, wheel or touch listener");
      assert.deepEqual(observed, [true], "one observer, on the sentinel");
      assert.deepEqual(none, [], "and none in the opaque form");
      assert.equal((fs.readFileSync(path.join(pkg, "dist", "at-top.js"), "utf8").match(/addEventListener/g) ?? []).length, 0, "the module registers no listener at all");
    });

    for (const [name, body] of [["no stage", page({ stage: false })], ["an undeclared stage", page({ headroom: false })], ["the opaque form", page({ header: "solid" })]]) {
      test(`smoked from the top with ${name}`, async () => {
        const p = await open(body, { theme });
        const s = await bar(p);
        if (name === "the opaque form") {
          assert.deepEqual(await rgba(p, s.background), await rgba(p, await token(p, "surface-page")), "the opaque form is surface-page");
          assert.equal(s.filter, "none");
        } else {
          assert.deepEqual(await rgba(p, s.background), await rgba(p, await token(p, "surface-chrome")), `${name}: the smoked fill from the first frame`);
          assert.match(s.filter, /blur\(12px\)/);
          assert.deepEqual(await rgba(p, s.line), await rgba(p, await token(p, "border-hairline", "borderBottomColor")));
        }
        await p.close();
      });
    }

    test("with no script it is the smoked bar: the server's markup carries no top mark", async () => {
      const dist = path.join(pkg, "dist");
      const { SiteHeader, Stage } = await import(pathToFileURL(path.join(dist, "index.js")).href);
      const html = renderToStaticMarkup(createElement("div", null, createElement(SiteHeader, { brand: "Acme", brandLabel: "Acme home", links: [{ href: "#a", label: "A" }] }), createElement(Stage, { headroom: true, art: null }, createElement("p", null, "x"))));
      assert.doesNotMatch(html, /data-top/);
      assert.match(html, /data-headroom/);
      const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 800 } });
      const p = await context.newPage();
      await p.setContent(`<html data-theme="${theme}"><head><style>${css()}</style></head><body>${html}</body></html>`);
      const s = await bar(p);
      assert.deepEqual(await rgba(p, s.background), await rgba(p, await token(p, "surface-chrome")), "smoked");
      assert.match(s.filter, /blur\(12px\)/);
      await context.close();
    });

    test("reduced transparency: opaque surface-page with its hairline from the first frame, and no filter", async () => {
      const { page: p } = await fixturePage(browser, page(), { theme, viewport: { width: 1440, height: 800 } });
      const cdp = await p.context().newCDPSession(p);
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
      assert.ok(await p.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches), "the query is emulated");
      await settle(p); await frames(p);
      const s = await bar(p);
      assert.ok(s.top, "it is at the top over a declared stage, and still not clear");
      assert.deepEqual(await rgba(p, s.background), await rgba(p, await token(p, "surface-page")));
      assert.deepEqual(await rgba(p, s.line), await rgba(p, await token(p, "border-hairline", "borderBottomColor")));
      assert.equal(s.filter, "none");
      await p.close();
    });

    test("forced colours: Canvas and CanvasText with a real line, even at the top over a declared stage", async () => {
      const { page: p } = await fixturePage(browser, page(), { theme, viewport: { width: 1440, height: 800 } });
      await p.emulateMedia({ forcedColors: "active" });
      await settle(p); await frames(p);
      const s = await bar(p);
      const system = await p.evaluate(() => { const d = document.createElement("div"); d.style.cssText = "background: Canvas; color: CanvasText"; document.body.append(d); const v = [getComputedStyle(d).backgroundColor, getComputedStyle(d).color]; d.remove(); return v; });
      assert.ok(s.top);
      assert.equal(s.background, system[0]);
      assert.equal(s.line, system[1]);
      assert.equal(s.lineStyle, "solid");
      assert.equal(s.filter, "none");
      await p.close();
    });

    test("print: static and opaque surface-page, the stage's art does not print, and the stage is in the flow", async () => {
      const { page: p } = await fixturePage(browser, page(), { theme, viewport: { width: 1440, height: 800 } });
      await p.emulateMedia({ media: "print" });
      await settle(p); await frames(p);
      const s = await bar(p);
      assert.deepEqual(await rgba(p, s.background), await rgba(p, await token(p, "surface-page")));
      assert.deepEqual(await rgba(p, s.line), await rgba(p, await token(p, "border-hairline", "borderBottomColor")));
      assert.equal(s.filter, "none");
      const stage = await p.evaluate(() => { const st = document.querySelector(".basalt-stage"); const header = document.querySelector("header.basalt-site-header"); return { art: getComputedStyle(st.querySelector(".basalt-stage-art")).display, margin: getComputedStyle(st).marginTop, overlap: st.getBoundingClientRect().top < header.getBoundingClientRect().bottom }; });
      assert.equal(stage.art, "none", "decorative stage art does not print");
      assert.equal(stage.margin, "0px", "the stage is not pulled up under a bar that prints");
      assert.equal(stage.overlap, false);
      await p.close();
    });

    test("without backdrop-filter support: still clear at the top (it uses no filter), and opaque surface-page with its hairline once scrolled", async () => {
      const source = css();
      const probe = /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/g;
      assert.ok(probe.test(source), "the @supports fallback is in the stylesheet");
      const p = await browser.newPage({ viewport: { width: 1440, height: 800 } });
      await p.setContent(`<html data-theme="${theme}"><head><style>${source.replace(probe, "@supports not ((x-backdrop-filter: blur(1px)) or (-webkit-x-backdrop-filter: blur(1px)))")}</style></head><body><div id="root"></div></body></html>`);
      await p.addScriptTag({ content: await bundleFixture(page()) });
      await frames(p);
      await settle(p);
      const top = await bar(p);
      assert.ok(top.top);
      assert.equal(await alphaOf(p, top.background), 0, "clear at the top");
      assert.equal(await alphaOf(p, top.line), 0);
      await scrollTo(p, 1);
      await settle(p);
      const scrolled = await bar(p);
      assert.ok(!scrolled.top);
      assert.deepEqual(await rgba(p, scrolled.background), await rgba(p, await token(p, "surface-page")), "opaque surface-page");
      assert.deepEqual(await rgba(p, scrolled.line), await rgba(p, await token(p, "border-hairline", "borderBottomColor")), "with its hairline");
      await p.close();
    });
  });
}

describe("the change to smoked", () => {
  test("the fill and the line fade in over duration-base on ease-out, and the blur switches at once; the ink has no transition", async () => {
    const p = await open(page(), { theme: "dark" });
    await freezeAnimations(p);
    await frozenScroll(p, 1);
    const entering = await running(p);
    assert.deepEqual(entering.map((t) => t.property).sort(), ["background-color", "border-bottom-color"], "the fill and the line, and nothing else");
    for (const t of entering) { near(t.duration, 150, `${t.property} runs over duration-base`); assert.equal(t.easing, EASE_OUT, `${t.property} eases out`); }
    const blur = await p.locator("header.basalt-site-header").evaluate((el) => getComputedStyle(el).backdropFilter);
    assert.match(blur, /blur\(12px\)/, "the blur is already on while the fill is arriving");
    // Seek: half way the fill is between nothing and the smoked fill.
    const [clear, smoked] = [0, await alphaOf(p, await token(p, "surface-chrome"))];
    await p.locator("header.basalt-site-header").evaluate((el) => { for (const a of el.getAnimations()) { a.pause(); a.currentTime = 40; } });
    const mid = await alphaOf(p, (await bar(p)).background);
    assert.ok(mid > clear && mid < smoked, `40ms in the fill is on its way (${mid} of ${smoked})`);
    await p.close();
  });

  test("back to clear the fill and the line fade out over 0.75 of duration-base on ease-in, and the blur goes at once", async () => {
    const p = await open(page(), { theme: "dark" });
    await freezeAnimations(p);
    await frozenScroll(p, 1);
    await settle(p);
    await frozenScroll(p, 0);
    const leaving = await running(p);
    assert.deepEqual(leaving.map((t) => t.property).sort(), ["background-color", "border-bottom-color"]);
    for (const t of leaving) { near(t.duration, 112.5, `${t.property} runs over 0.75 of duration-base`); assert.equal(t.easing, EASE_IN, `${t.property} eases in`); }
    assert.equal((await bar(p)).filter, "none", "the blur is gone at once");
    await p.close();
  });

  test("under reduced motion it is the duration tokens' 100ms fade", async () => {
    const p = await open(page(), { theme: "dark", reducedMotion: "reduce" });
    await freezeAnimations(p);
    await frozenScroll(p, 1);
    const entering = await running(p);
    assert.ok(entering.length > 0);
    for (const t of entering) assert.equal(t.duration, 100, `${t.property}`);
    await settle(p);
    await frozenScroll(p, 0);
    for (const t of await running(p)) near(t.duration, 75, `${t.property} leaves at 0.75 of 100`);
    await p.close();
  });

  // What the observer first reports decides it: a departure reported past the headroom's 24px slack switches at once; one reported inside it
  // (a first pixel, or a scroll the browser animates) gets the decided fade. Each case runs with smooth scrolling off and on, and is read frame by
  // frame from the moment it starts, not only at the end.
  const SLACK = 24;
  /**
   * Runs `trigger` on the frozen clock and returns the frames the bar showed after the observer's report: the scroll, the top mark, the
   * fill's alpha and whether a fade runs. The scroll and the observer are real; the page's frames are the test's, 16ms each, so the first
   * frame is the first after the report whatever the machine's load, and a 150ms fade cannot finish before it is read.
   */
  const record = async (p, { prepare, run }) => {
    if (prepare) await prepare(p);
    const clock = await freezeAnimations(p);
    await p.evaluate(() => {
      const header = document.querySelector("header.basalt-site-header");
      const alpha = (css) => { if (css === "rgba(0, 0, 0, 0)" || css === "transparent") return 0; const m = /\/\s*([\d.]+)\s*\)/.exec(css); return m ? Number(m[1]) : 1; };
      window.__frames = [];
      window.__sample = () => window.__frames.push({ y: window.scrollY, top: header.hasAttribute("data-top"), jump: header.hasAttribute("data-jump"), alpha: alpha(getComputedStyle(header).backgroundColor), fading: header.getAnimations().some((a) => a.transitionProperty === "background-color" && a.effect.getTiming().duration > 0) });
    });
    await run(p);
    await until(p, () => !document.querySelector("header.basalt-site-header").hasAttribute("data-top"));
    for (let frame = 0; frame < 30; frame += 1) { await clock.advance(16); await p.evaluate(() => window.__sample()); }
    return p.evaluate(() => window.__frames);
  };
  const verdict = (recorded) => {
    const first = recorded.findIndex((f) => !f.top);
    assert.ok(first >= 0, "the bar left the top");
    const full = recorded[recorded.length - 1].alpha;
    assert.ok(full > 0.5, `it ends smoked (${full})`);
    return { first: recorded[first], after: recorded.slice(first), full };
  };
  const cases = {
    "an instant scrollTo(620)": { jump: true, run: (p) => p.evaluate(() => window.scrollTo(0, 620)) },
    "an instant anchor": { jump: true, run: (p) => p.evaluate(() => { location.hash = "#anchor"; }) },
    "a first pixel (5px)": { jump: false, run: (p) => p.evaluate(() => window.scrollTo(0, 5)) },
    "a smooth anchor (scroll-behavior: smooth)": { jump: (smooth) => !smooth, animated: true, run: (p) => p.evaluate(() => { document.documentElement.style.scrollBehavior = "smooth"; location.hash = "#anchor"; }) },
  };
  for (const [mode, args, smooth] of [["smooth scrolling off", ["--disable-smooth-scrolling"], false], ["smooth scrolling on", ["--enable-smooth-scrolling"], true]]) {
    for (const [name, { jump: decided, run, animated }] of Object.entries(cases)) {
      // A smooth anchor is animated only where the browser animates scrolls: with smooth scrolling off it is a scroll the browser does not animate.
      const jump = typeof decided === "function" ? decided(smooth) : decided;
      test(`${mode}: ${name} ${jump ? "switches at once, the fill full on the first frame after the report" : "gets the decided fade"}`, async () => {
        const own = await chromium.launch(launchOptions({ args }));
        try {
          const { page: p } = await fixturePage(own, page(), { theme: "dark", viewport: { width: 1440, height: 800 } });
          await settle(p); await frames(p);
          const { first, after, full } = verdict(await record(p, { run }));
          if (jump) {
            assert.ok(first.y > SLACK, `first reported at ${first.y}px, past the slack`);
            assert.ok(first.jump && !first.fading, "no fade runs");
            assert.ok(first.alpha >= full - 0.001, `the fill is full on the first frame (${first.alpha} of ${full})`);
          } else {
            assert.ok(first.y <= SLACK + 0.5 || animated, `first reported at ${first.y}px`);
            assert.ok(!first.jump, "the decided fade, not an instant switch");
            assert.ok(first.fading || after.some((f) => f.fading), "a fade runs");
            assert.ok(first.alpha < full, `the fill is still on its way on the first frame (${first.alpha} of ${full})`);
          }
          assert.ok(after.every((f) => !f.top), "and it stays smoked");
          await p.close();
        } finally { await own.close(); }
      });
    }
    // The pointer and the click are Playwright's own (they wait on real frames), so they come before the clock stops; the wheel and the key are input.
    for (const [name, steps] of [["a wheel burst", { prepare: (p) => p.mouse.move(700, 400), run: async (p) => { for (let i = 0; i < 6; i++) await p.mouse.wheel(0, 200); } }], ["Page Down", { prepare: (p) => p.locator("body").click({ position: { x: 700, y: 600 } }), run: (p) => p.keyboard.press("PageDown") }]]) {
      test(`${mode}: ${name} follows the same rule frame by frame: the first report decides, and it ends smoked`, async () => {
        const own = await chromium.launch(launchOptions({ args }));
        try {
          const { page: p } = await fixturePage(own, page(), { theme: "dark", viewport: { width: 1440, height: 800 } });
          await settle(p); await frames(p);
          const { first, full } = verdict(await record(p, steps));
          // Whatever the scroll did, the frame is one or the other: at once (full, nothing fading) or the decided fade (on its way, fading). The
          // observer reports after the frame that crossed, so under load an animated scroll can be further along than where it was reported: the
          // position at the first frame is not asserted, only that the two never mix.
          if (first.jump) assert.ok(!first.fading && first.alpha >= full - 0.001, `at once: ${JSON.stringify(first)}`);
          else assert.ok(first.fading && first.alpha < full, `the fade: ${JSON.stringify(first)}`);
          await p.close();
        } finally { await own.close(); }
      });
    }
  }

  test("a page that opens at the top is clear in its first frame: no fade from smoked, in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page: p } = await fixturePage(browser, page(), { theme, viewport: { width: 1440, height: 800 } });
      await p.waitForSelector("header.basalt-site-header[data-top]");
      const first = await bar(p);
      assert.equal(await alphaOf(p, first.background), 0, `${theme}: clear at once: ${first.background}`);
      assert.deepEqual(await running(p), [], `${theme}: nothing is fading`);
      await p.close();
    }
  });

  test("a restored scroll position leaves the bar smoked, with no fade", async () => {
    const html = (body) => `<html data-theme="dark"><head><meta charset="utf-8"><style>${css()}</style></head><body><div id="root"></div><script>${body}</script></body></html>`;
    const script = await bundleFixture(page());
    const p = await browser.newPage({ viewport: { width: 1440, height: 800 } });
    await p.route("http://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html(script.replaceAll("</script", "<\\/script")) }));
    await p.goto("http://basalt.test/page");
    await frames(p);
    assert.ok((await bar(p)).top, "it opens clear");
    await p.evaluate(() => window.scrollTo(0, 900));
    await frames(p);
    await p.reload();
    await p.waitForFunction(() => scrollY > 500);
    await frames(p, 6);
    const s = await bar(p);
    assert.ok(!s.top, "restored at 900px, the bar is not at the top");
    assert.deepEqual(await rgba(p, s.background), await rgba(p, await token(p, "surface-chrome")), "the full smoked fill");
    assert.deepEqual(await running(p), [], "nothing is fading");
    await p.close();
  });

  test("a slow first pixel is not a jump: it fades", async () => {
    const p = await open(page(), { theme: "dark" });
    await freezeAnimations(p);
    await frozenScroll(p, 5);
    const s = await bar(p);
    assert.equal(s.jump, false);
    assert.ok((await running(p)).length > 0, "within the headroom's slack the fade runs");
    await p.close();
  });

  test("theme and scroll position never leave the bar clear below the top", async () => {
    const p = await open(page(), { theme: "dark" });
    await scrollTo(p, 700);
    await p.evaluate(() => { document.documentElement.dataset.theme = "light"; });
    await settle(p); await frames(p);
    assert.ok(!(await bar(p)).top);
    assert.deepEqual(await rgba(p, (await bar(p)).background), await rgba(p, await token(p, "surface-chrome")));
    await scrollTo(p, 0); await settle(p);
    assert.equal(await alphaOf(p, (await bar(p)).background), 0, "back at the top in the new theme it is clear");
    await p.close();
  });
});

describe("the menu from a clear bar", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: focus lands on Close, the bar is solid while it is open, and closing returns the bar to clear`, async () => {
      const p = await open(page(), { theme, width: 390, height: 800 });
      const before = await bar(p);
      assert.equal(await alphaOf(p, before.background), 0);
      await p.locator(".basalt-site-menu-trigger").click();
      await p.waitForSelector(".basalt-site-menu");
      await settle(p); await frames(p);
      assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Close menu", "focus is on Close");
      const solid = await p.evaluate(() => {
        const menu = document.querySelector(".basalt-site-menu"); const band = document.querySelector(".basalt-site-menu-band");
        const top = document.elementFromPoint(200, 28);
        return { inside: menu.contains(top), menu: getComputedStyle(menu).backgroundColor, level: menu.getAttribute("data-level"), bandTop: band.getBoundingClientRect().top, bandHeight: band.getBoundingClientRect().height, filter: getComputedStyle(menu).backdropFilter };
      });
      assert.ok(solid.inside, "what is under the bar's place is the menu's own first row");
      assert.equal(await alphaOf(p, solid.menu), 255, `the sheet is opaque: ${solid.menu}`);
      assert.equal(solid.level, "1");
      assert.equal(solid.bandTop, 0);
      assert.equal(solid.bandHeight, 56, "its first row draws the bar in place");
      assert.equal(solid.filter, "none", "no blur on the sheet");
      assert.ok((await bar(p)).top, "the page under it is still at its top");
      await p.keyboard.press("Escape");
      await p.waitForSelector(".basalt-site-menu", { state: "detached" });
      await settle(p); await frames(p);
      const after = await bar(p);
      assert.deepEqual(after, before, "the bar is the state it was in");
      assert.equal(await p.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Menu", "focus returns to Menu");
      await p.close();
    });
  }
});

describe("the stage", () => {
  test("it starts at y = 0 under the bar, its headroom marker is 80px across the full width, and its content starts below the headroom", async () => {
    const p = await open(page(), { theme: "dark" });
    const stage = await box(p, ".basalt-stage");
    assert.equal(stage.y, 0);
    const headroom = await box(p, "[data-basalt-headroom]");
    // across the full width of the content area: the viewport less any classic scrollbar's gutter
    assert.deepEqual([headroom.y, headroom.h, headroom.x, headroom.w], [0, 80, 0, await p.evaluate(() => document.documentElement.clientWidth)]);
    const content = await box(p, ".basalt-stage-content");
    assert.equal(content.y, 80, "the content starts at the headroom's bottom edge");
    assert.ok((await box(p, "[data-quiet]")).y >= 80);
    await p.close();
  });

  test("the headroom adds the top safe area, and the bar's offset pulls the stage up by the bar plus the inset", async () => {
    const p = await open(page(), { theme: "dark" });
    await p.evaluate(() => document.documentElement.style.setProperty("--_inset-top", "47px"));
    await frames(p);
    assert.equal((await box(p, ".basalt-stage")).y, 0, "still at y = 0");
    assert.equal((await box(p, "header.basalt-site-header")).h, 56 + 47);
    assert.equal((await box(p, "[data-basalt-headroom]")).h, 80 + 47);
    assert.equal((await box(p, ".basalt-stage-content")).y, 80 + 47);
    await p.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`${theme}: level 0 with no rim, radius, shadow, line or fade, and art-field while the art loads`, async () => {
      const p = await open(page({ art: "null" }), { theme });
      const style = await p.locator(".basalt-stage").evaluate((el) => { const s = getComputedStyle(el); return { border: s.borderTopWidth + s.borderBottomWidth + s.borderLeftWidth + s.borderRightWidth, radius: s.borderRadius, shadow: s.boxShadow, image: s.backgroundImage, filter: s.filter, bg: s.backgroundColor, mask: s.maskImage }; });
      assert.deepEqual({ border: style.border, radius: style.radius, shadow: style.shadow, image: style.image, filter: style.filter, mask: style.mask }, { border: "0px0px0px0px", radius: "0px", shadow: "none", image: "none", filter: "none", mask: "none" });
      assert.equal(style.bg, await token(p, "art-field"), "the stage is art-field until the art arrives");
      assert.equal(style.bg, await token(p, "surface-page"), "which is the page colour");
      await p.close();
    });
  }

  test("forced colours: decorative stage art is not drawn and the stage is Canvas", async () => {
    const { page: p } = await fixturePage(browser, page(), { theme: "dark", viewport: { width: 1440, height: 800 } });
    await p.emulateMedia({ forcedColors: "active" });
    await frames(p);
    const s = await p.evaluate(() => { const st = document.querySelector(".basalt-stage"); const d = document.createElement("div"); d.style.background = "Canvas"; document.body.append(d); const canvas = getComputedStyle(d).backgroundColor; d.remove(); return { art: getComputedStyle(st.querySelector(".basalt-stage-art")).display, bg: getComputedStyle(st).backgroundColor, canvas }; });
    assert.equal(s.art, "none");
    assert.equal(s.bg, s.canvas);
    await p.close();
  });

  test("the art is hidden from assistive technology, and the headroom marker is too", async () => {
    const p = await open(page(), { theme: "dark" });
    assert.deepEqual(await p.evaluate(() => [document.querySelector(".basalt-stage-art").getAttribute("aria-hidden"), document.querySelector("[data-basalt-headroom]").getAttribute("aria-hidden")]), ["true", "true"]);
    await p.close();
  });
});

describe("paired art", () => {
  const PAIR = (extra = "") => `<B.PairedArt dark="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='black'/%3E%3C/svg%3E" light="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='white'/%3E%3C/svg%3E" loading="eager" ${extra} />`;
  const shown = (p) => p.evaluate(() => [...document.querySelectorAll(".basalt-paired-art")].filter((el) => getComputedStyle(el).display !== "none").map((el) => el.getAttribute("data-art")));

  test("it shows the one for the page's theme, and swaps with the toggle", async () => {
    const p = await open(page({ art: PAIR() }), { theme: "dark" });
    assert.deepEqual(await shown(p), ["dark"]);
    await p.evaluate(() => { document.documentElement.dataset.theme = "light"; });
    assert.deepEqual(await shown(p), ["light"], "the toggle's choice");
    await p.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    assert.deepEqual(await shown(p), ["dark"]);
    await p.close();
  });

  test("it follows the system setting when the page chooses none, and a class theme root works too", async () => {
    const p = await open(page({ art: PAIR() }), { theme: "dark" });
    await p.evaluate(() => { delete document.documentElement.dataset.theme; });
    await p.emulateMedia({ colorScheme: "dark" }); assert.deepEqual(await shown(p), ["dark"]);
    await p.emulateMedia({ colorScheme: "light" }); assert.deepEqual(await shown(p), ["light"]);
    await p.evaluate(() => { document.documentElement.classList.add("dark"); });
    assert.deepEqual(await shown(p), ["dark"], "a .dark root beats the system's light");
    await p.evaluate(() => { document.documentElement.classList.remove("dark"); document.documentElement.dataset.theme = "light"; });
    await p.emulateMedia({ colorScheme: "dark" });
    assert.deepEqual(await shown(p), ["light"], "a chosen light beats the system's dark");
    await p.close();
  });

  test("a nested theme root has its own pair", async () => {
    const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div data-theme="dark"><B.Stage art={${PAIR()}}>x</B.Stage><div data-theme="light" id="inner"><B.Stage art={${PAIR()}}>y</B.Stage></div></div>);`, { theme: "light" });
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll(".basalt-paired-art")].map((el) => [el.closest("#inner") ? "inner" : "outer", el.getAttribute("data-art"), getComputedStyle(el).display !== "none"])), [["outer", "dark", true], ["outer", "light", false], ["inner", "dark", false], ["inner", "light", true]]);
    await p.close();
  });

  test("only the version that is shown is downloaded: a lazy image under display: none does not load, until the theme changes", async () => {
    const requested = [];
    const p = await browser.newPage({ viewport: { width: 1440, height: 800 } });
    await p.route("http://basalt.test/art/*.svg", (route) => { requested.push(new URL(route.request().url()).pathname); return route.fulfill({ contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'><rect width='4' height='3' fill='gray'/></svg>" }); });
    const script = (await bundleFixture(page({ art: `<B.PairedArt dark="http://basalt.test/art/night.svg" light="http://basalt.test/art/day.svg" />` }))).replaceAll("</script", "<\\/script");
    await p.route("http://basalt.test/page", (route) => route.fulfill({ contentType: "text/html", body: `<html data-theme="dark"><head><meta charset="utf-8"><style>${css()}</style></head><body><div id="root"></div><script>${script}</script></body></html>` }));
    await p.goto("http://basalt.test/page", { waitUntil: "load" });
    await p.waitForFunction(() => [...document.images].some((i) => i.complete && i.naturalWidth > 0));
    await frames(p, 10);
    assert.deepEqual(requested, ["/art/night.svg"], "only the dark version, in the dark theme");
    await p.evaluate(() => { document.documentElement.dataset.theme = "light"; });
    await p.waitForFunction(() => document.querySelector(".basalt-paired-art[data-art=light]").complete);
    assert.deepEqual(requested.sort(), ["/art/day.svg", "/art/night.svg"], "the light version loads when the toggle asks for it");
    await p.close();
  });

  test("it is never dimmed, inverted, tinted, filtered or blended, and it fills the stage at its own crop", async () => {
    const p = await open(page({ art: PAIR('position="30% 50%"') }), { theme: "dark" });
    const s = await p.locator(".basalt-paired-art[data-art=dark]").evaluate((el) => { const c = getComputedStyle(el); const r = el.getBoundingClientRect(); const stage = document.querySelector(".basalt-stage").getBoundingClientRect(); return { filter: c.filter, blend: c.mixBlendMode, opacity: c.opacity, fit: c.objectFit, position: c.objectPosition, overlay: c.backgroundImage, fills: Math.abs(r.width - stage.width) < 0.5 && Math.abs(r.height - stage.height) < 0.5 }; });
    assert.deepEqual(s, { filter: "none", blend: "normal", opacity: "1", fit: "cover", position: "30% 50%", overlay: "none", fills: true });
    const decorative = await p.evaluate(() => [...document.querySelectorAll(".basalt-paired-art")].map((el) => el.getAttribute("alt")));
    assert.deepEqual(decorative, ["", ""]);
    await p.close();
  });
});

describe("the headroom check", () => {
  const loader = (body) => async (p, run) => {
    await p.setContent(`<html data-theme="${run.theme}"><head><style>${css()}</style></head><body><div id="root"></div></body></html>`);
    await p.addScriptTag({ content: await bundleFixture(body) });
    await p.evaluate(() => document.fonts.ready);
  };

  test("the paired scene passes in each theme at 390 and 1440, at 1x and 2x, reading every pixel of the headroom and the quiet zone", async () => {
    const result = await checkHeadroom(browser, { load: loader(page()) });
    assert.deepEqual(result.failures, []);
    assert.ok(result.ok);
    assert.equal(result.runs, 8, "two themes, two widths, two scales");
    // 390 and 1440 wide, 80px tall at 1x and 2x, in two themes, plus the headline's zone: well over a million device pixels.
    assert.ok(result.checked > 2 * 2 * (390 + 1440) * 80 * 1.5, `${result.checked} device pixels read`);
  });

  test("a scene with its art run up under the bar fails, in both themes, at every width and scale", async () => {
    const result = await checkHeadroom(browser, { load: loader(page({ art: BUSY })) });
    assert.equal(result.ok, false);
    assert.equal(result.failures.length, 8, "every run");
    for (const f of result.failures) {
      assert.equal(f.zone, "headroom");
      assert.ok(f.crossing > 0 && f.worst.color, JSON.stringify(f));
      assert.equal(f.limit, f.theme === "dark" ? "#333333" : "#bfbfbf", "the limit is the theme's own tone 2");
    }
    assert.deepEqual([...new Set(result.failures.map((f) => `${f.theme}/${f.width}/${f.scale}`))].length, 8);
  });

  test("the ink is hidden while it reads: a bright headline in a quiet zone and the bar's own ink don't fail an art that is quiet", async () => {
    const body = page({ extra: "" });
    const result = await checkHeadroom(browser, { load: loader(body), themes: ["dark"], widths: [1440], scales: [1] });
    assert.ok(result.ok, JSON.stringify(result.failures));
    // Prove the ink would have failed it: read the same page without hiding.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
    const p = await context.newPage();
    await loader(body)(p, { theme: "dark" });
    const zone = await p.evaluate(() => { const r = document.querySelector("[data-quiet]").getBoundingClientRect(); return { x: r.x, y: r.y, w: Math.floor(r.width), h: Math.floor(r.height) }; });
    const png = await p.screenshot({ clip: { x: zone.x, y: zone.y, width: zone.w, height: zone.h } });
    const bright = await p.evaluate(async (b64) => { const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const bmp = await createImageBitmap(new Blob([bytes])); const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height; const x = c.getContext("2d"); x.drawImage(bmp, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let max = 0; for (let i = 0; i < d.length; i += 4) max = Math.max(max, d[i]); return max; }, png.toString("base64"));
    assert.ok(bright > 0x33, `the headline's own ink is lighter than the limit (${bright}), so the check must hide it`);
    await context.close();
  });

  test("a quiet zone is checked like the headroom: detail in it fails, named by its data-quiet value", async () => {
    const detail = `<svg viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true"><rect width="1440" height="600" fill="var(--basalt-art-field)"/><rect x="40" y="110" width="500" height="10" fill="var(--basalt-art-mark)"/></svg>`;
    const result = await checkHeadroom(browser, { load: loader(page({ art: detail })), themes: ["dark"], widths: [1440], scales: [1] });
    assert.equal(result.ok, false);
    assert.deepEqual(result.failures.map((f) => f.zone), ["headline"]);
    assert.equal(result.failures[0].worst.color, "#ededed");
  });

  test("a detail that antialiases below the limit at 1x lands whole at 2x: only the 2x run fails", async () => {
    // A half-pixel line in #606060 covers half a pixel at 1x (#303030, under #333333) and a whole device pixel at 2x.
    const star = `<svg viewBox="0 0 1440 600" width="1440" height="600" style={{ width: 1440, height: 600 }} preserveAspectRatio="none" aria-hidden="true"><rect width="1440" height="600" fill="var(--basalt-art-field)"/><rect x="100" y="20" width="0.5" height="10" fill="#606060"/></svg>`;
    const one = await checkHeadroom(browser, { load: loader(page({ art: star })), themes: ["dark"], widths: [1440], scales: [1] });
    const two = await checkHeadroom(browser, { load: loader(page({ art: star })), themes: ["dark"], widths: [1440], scales: [2] });
    assert.ok(two.failures.length > 0 && two.failures[0].worst.color === "#606060", `2x: ${JSON.stringify(two.failures)}`);
    assert.ok(one.ok || one.failures[0].worst.color !== "#606060", `1x: ${JSON.stringify(one.failures)}`);
  });

  test("it resolves oklab() and oklch() limits, which a hand-written parser threw on, and rejects what isn't a colour", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
    const p = await context.newPage();
    await loader(page())(p, { theme: "dark" });
    for (const limit of ["oklab(0.3211 0 0)", "oklch(0.3211 0 0)", "color-mix(in oklab, #333333 100%, #000000)", "#333"]) {
      const readings = await measureHeadroom(p, "dark", { limit });
      assert.equal(readings[0].limit, "#333333", limit);
      assert.equal(readings[0].crossing, 0, limit);
    }
    await assert.rejects(() => measureHeadroom(p, "dark", { limit: "not-a-colour" }), /can't resolve the colour/);
    // Mid-theme-change values (the page's own limit as oklab) resolve too.
    await p.evaluate(() => document.documentElement.style.setProperty("--basalt-art-quiet-limit", "oklab(0.3211 0 0)"));
    assert.equal((await measureHeadroom(p, "dark"))[0].limit, "#333333");
    await context.close();
  });

  test("a page with no stage, or a stage not rendered by Stage, is an error and not a pass", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await context.newPage();
    await loader(page({ stage: false }))(p, { theme: "dark" });
    await assert.rejects(() => measureHeadroom(p, "dark"), /no element matches \.basalt-stage/);
    await context.close();
  });
});

describe("framed art", () => {
  const SVG = (fill) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="${fill}"/></svg>`)}`;
  /** Serves the art from a route a test controls, so loading and failing are held, not raced. */
  const framedPage = async (frame, { theme = "dark", width = 1000, extra = {}, gate = "ok" } = {}) => {
    const p = await browser.newPage({ viewport: { width, height: 900 }, ...extra });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    await p.route("http://basalt.test/art.svg", async (route) => {
      if (gate === "fail") return route.abort();
      if (gate === "hold") await held;
      return route.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#808080"/></svg>` });
    });
    await p.route("http://basalt.test/", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>" }));
    await p.goto("http://basalt.test/");
    await p.setContent(`<html data-theme="${theme}"><head><meta charset="utf-8"><base href="http://basalt.test/"><style>${css()}</style></head><body style="margin:0;background:var(--basalt-surface-page)"><div id="root" style="padding:24px"></div></body></html>`);
    await p.addScriptTag({ content: await bundleFixture(`createRoot(document.getElementById("root")).render(${frame});`) });
    p.errors = errors; p.release = release;
    return p;
  };
  const art = (props = "") => `<B.FramedArt src="http://basalt.test/art.svg" alt="A synthetic dune" caption="Dunes at the end of the day." credit="Synthetic art" ${props} />`;
  const geometry = (p) => p.evaluate(() => { const r = (el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }; return { figure: r(document.querySelector("figure")), frame: r(document.querySelector(".basalt-framed-frame")), caption: r(document.querySelector("figcaption")) }; });

  test("the frame reserves its box from the aspect ratio before the art loads: 0px shift when it arrives, in each aspect", async () => {
    for (const [aspect, ratio] of [["square", 1], ["photo", 1.5], ["screen", 1.6], ["wide", 1.7778]]) {
      const p = await framedPage(art(`aspect="${aspect}"`), { gate: "hold" });
      const before = await geometry(p);
      assert.ok(Math.abs(before.frame[2] / before.frame[3] - ratio) < 0.01, `${aspect}: ${before.frame[2]}×${before.frame[3]} is ${ratio}`);
      assert.equal(await p.locator(".basalt-framed-frame").getAttribute("data-phase"), "loading");
      p.release();
      await p.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
      await settle(p);
      assert.deepEqual(await geometry(p), before, `${aspect}: nothing moved`);
      await p.close();
    }
  });

  test("photo is the default aspect, and the ratio is the token's", async () => {
    const p = await framedPage(art(), { gate: "hold" });
    assert.equal(await p.locator("figure").getAttribute("data-aspect"), "photo");
    assert.equal(await p.locator("figure").evaluate((el) => getComputedStyle(el).getPropertyValue("--_aspect")), "1.5");
    assert.equal(await p.locator(".basalt-framed-frame").evaluate((el) => getComputedStyle(el).aspectRatio), "1.5 / 1");
    p.release();
    await p.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`${theme}: while it loads the frame is surface-placeholder and nothing else; the art then fades in over duration-base on ease-out, opacity only`, async () => {
      const p = await framedPage(art(), { theme, gate: "hold" });
      const s = await p.evaluate(() => { const f = document.querySelector(".basalt-framed-frame"); const img = f.querySelector("img"); const c = getComputedStyle(f); return { bg: c.backgroundColor, image: c.backgroundImage, animation: c.animationName, filter: c.filter, imgOpacity: getComputedStyle(img).opacity, children: [...f.children].map((x) => x.tagName), shimmer: document.getAnimations().length }; });
      assert.equal(s.bg, await token(p, "surface-placeholder"));
      assert.deepEqual({ image: s.image, animation: s.animation, filter: s.filter, imgOpacity: s.imgOpacity, children: s.children, shimmer: s.shimmer }, { image: "none", animation: "none", filter: "none", imgOpacity: "0", children: ["IMG"], shimmer: 0 }, "no shimmer, spinner or blurred preview; the art is not painted yet");
      // The clock is stopped while the art is held, so the fade is read at its first instant however long the machine takes to answer.
      await freezeAnimations(p);
      p.release();
      await until(p, () => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
      const fade = await p.locator(".basalt-framed-img").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty).map((a) => ({ property: a.transitionProperty, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })));
      assert.deepEqual(fade, [{ property: "opacity", duration: 150, easing: EASE_OUT }]);
      await settle(p);
      assert.equal(await p.locator(".basalt-framed-img").evaluate((el) => getComputedStyle(el).opacity), "1");
      await p.close();
    });
  }

  test("under reduced motion it is a 100ms fade, opacity only", async () => {
    const p = await framedPage(art(), { gate: "hold", extra: { reducedMotion: "reduce" } });
    await freezeAnimations(p);
    p.release();
    await until(p, () => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
    const fade = await p.locator(".basalt-framed-img").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty).map((a) => [a.transitionProperty, a.effect.getTiming().duration]));
    assert.deepEqual(fade, [["opacity", 100]]);
    await p.close();
  });

  test("art that is already loaded when the component mounts shows at once, with no fade", async () => {
    const src = SVG("#808080");
    const p = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    await p.setContent(`<html data-theme="dark"><head><meta charset="utf-8"><style>${css()}</style></head><body style="margin:0;background:var(--basalt-surface-page)"><div id="root" style="padding:24px"></div></body></html>`);
    await p.evaluate((url) => new Promise((resolve, reject) => { const i = new Image(); i.onload = resolve; i.onerror = reject; i.src = url; }), src);
    await p.addScriptTag({ content: await bundleFixture(`createRoot(document.getElementById("root")).render(<B.FramedArt src="${src}" alt="A synthetic dune" />);`) });
    assert.equal(await p.locator(".basalt-framed-frame").getAttribute("data-phase"), "loaded", "known to be loaded before the first paint");
    assert.deepEqual(await p.locator(".basalt-framed-img").evaluate((el) => [getComputedStyle(el).opacity, el.getAnimations().length]), ["1", 0]);
    await p.close();
  });

  test("if the art fails, meaningful art shows its alt text in secondary at 13/18, centred, on the placeholder; decorative shows nothing", async () => {
    const p = await framedPage(art(), { gate: "fail" });
    await p.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "failed");
    const s = await p.evaluate(() => { const f = document.querySelector(".basalt-framed-frame"); const t = f.querySelector(".basalt-framed-alt"); const c = getComputedStyle(t); const fr = f.getBoundingClientRect(); const tr = (() => { const range = document.createRange(); range.selectNodeContents(t); return range.getBoundingClientRect(); })(); return { text: t.textContent, color: c.color, size: c.fontSize, line: c.lineHeight, align: c.textAlign, justify: c.justifyContent, centred: Math.abs((tr.left + tr.right) / 2 - (fr.left + fr.right) / 2) < 2 && Math.abs((tr.top + tr.bottom) / 2 - (fr.top + fr.bottom) / 2) < 2, img: getComputedStyle(f.querySelector("img")).display, bg: getComputedStyle(f).backgroundColor }; });
    assert.equal(s.text, "A synthetic dune");
    assert.equal(s.color, await token(p, "text-secondary", "color"));
    assert.deepEqual([s.size, s.line, s.align, s.centred, s.img], ["13px", "18px", "center", true, "none"]);
    assert.equal(s.bg, await token(p, "surface-placeholder"));
    await p.close();
    const d = await framedPage(art('alt=""').replace('alt="A synthetic dune"', ""), { gate: "fail" });
    await d.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "failed");
    assert.equal(await d.locator(".basalt-framed-alt").count(), 0, "decorative shows nothing");
    assert.equal(await d.locator(".basalt-framed-frame").evaluate((el) => el.textContent), "");
    assert.equal(await d.locator(".basalt-framed-frame").evaluate((el) => getComputedStyle(el).backgroundColor), await token(d, "surface-placeholder"));
    await d.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`${theme}: a real 1px rim outside the art, radius 12, no shadow, and the art inside the border`, async () => {
      const p = await framedPage(art(), { theme });
      await p.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
      const s = await p.locator(".basalt-framed-frame").evaluate((el) => { const c = getComputedStyle(el); const img = el.querySelector("img").getBoundingClientRect(); const f = el.getBoundingClientRect(); return { width: [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth], style: c.borderTopStyle, top: c.borderTopColor, side: c.borderRightColor, bottom: c.borderBottomColor, left: c.borderLeftColor, radius: c.borderTopLeftRadius, shadow: c.boxShadow, outline: c.outlineStyle, inset: [img.left - f.left, img.top - f.top, f.right - img.right, f.bottom - img.bottom], overflow: c.overflow, pad: c.padding }; });
      assert.deepEqual(s.width, ["1px", "1px", "1px", "1px"]);
      assert.equal(s.style, "solid");
      assert.equal(s.top, await token(p, "border-rim-top", "borderTopColor"), "the top is the lit rim");
      for (const side of [s.side, s.bottom, s.left]) assert.equal(side, await token(p, "border-rim", "borderTopColor"));
      assert.equal(s.radius, "12px");
      assert.equal(s.shadow, "none");
      assert.equal(s.outline, "none");
      assert.deepEqual(s.inset, [1, 1, 1, 1], "the rim is outside the art, never laid over its pixels");
      await p.close();
    });
  }

  test("inside a panel the radius is the outer radius less the padding", async () => {
    const p = await framedPage(`<B.Card><B.CardContent>${art()}</B.CardContent></B.Card>`);
    await p.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
    // A card is 12 and its content pads 16: 12 less 16 is square.
    assert.equal(await p.locator(".basalt-framed-frame").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "0px");
    await p.evaluate(() => { document.querySelector(".basalt-card-content").style.setProperty("--_panel-pad", "4px"); });
    assert.equal(await p.locator(".basalt-framed-frame").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "8px", "12 less a 4px padding");
    await p.close();
  });

  test("object-fit cover: a picture of another ratio fills the frame", async () => {
    const p = await framedPage(art('aspect="wide"'));
    await p.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
    assert.equal(await p.locator(".basalt-framed-img").evaluate((el) => getComputedStyle(el).objectFit), "cover");
    const [f, i] = await p.evaluate(() => [document.querySelector(".basalt-framed-frame"), document.querySelector(".basalt-framed-img")].map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }));
    assert.equal(i[0], f[0] - 2); assert.equal(i[1], f[1] - 2);
    await p.close();
  });

  test("the caption is a figcaption under the frame, space-2 below, start-aligned, at most the prose width; the credit is a line of its own in tertiary", async () => {
    const p = await framedPage(art(), { width: 1400 });
    await p.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
    const s = await p.evaluate(() => {
      const frame = document.querySelector(".basalt-framed-frame").getBoundingClientRect(); const cap = document.querySelector("figcaption"); const c = cap.getBoundingClientRect();
      const text = document.querySelector(".basalt-framed-text"), credit = document.querySelector(".basalt-framed-credit");
      const t = getComputedStyle(text), k = getComputedStyle(credit), cc = getComputedStyle(cap);
      return { gap: c.top - frame.bottom, left: c.left - frame.left, width: c.width, maxWidth: cc.maxWidth, align: cc.textAlign, tag: cap.tagName, parent: cap.parentElement.tagName, textColor: t.color, textSize: [t.fontSize, t.lineHeight], creditColor: k.color, creditSize: [k.fontSize, k.lineHeight], creditOwnLine: credit.getBoundingClientRect().top >= text.getBoundingClientRect().bottom - 0.5 && k.display === "block", overArt: c.top < frame.bottom, rootFont: getComputedStyle(document.documentElement).fontSize };
    });
    assert.deepEqual([s.gap, s.left, s.tag, s.parent, s.align, s.overArt], [8, 0, "FIGCAPTION", "FIGURE", "start", false]);
    assert.equal(s.maxWidth, "544px", "size-prose-width, 34rem");
    assert.ok(s.width <= 544);
    assert.equal(s.textColor, await token(p, "text-secondary", "color"));
    assert.deepEqual(s.textSize, ["13px", "18px"]);
    assert.equal(s.creditColor, await token(p, "text-tertiary", "color"));
    assert.deepEqual(s.creditSize, ["12px", "16px"]);
    assert.ok(s.creditOwnLine);
    await p.close();
  });

  test("it prints, and its rim is CanvasText in forced colours", async () => {
    const p = await framedPage(art());
    await p.waitForFunction(() => document.querySelector(".basalt-framed-frame")?.getAttribute("data-phase") === "loaded");
    await p.emulateMedia({ media: "print" });
    assert.notEqual(await p.locator(".basalt-framed-frame").evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await p.locator(".basalt-framed-img").evaluate((el) => getComputedStyle(el).display), "block");
    await p.emulateMedia({ media: "screen", forcedColors: "active" });
    const [rim, text] = await p.evaluate(() => { const d = document.createElement("div"); d.style.color = "CanvasText"; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return [getComputedStyle(document.querySelector(".basalt-framed-frame")).borderTopColor, v]; });
    assert.equal(rim, text);
    await p.close();
  });
});

describe("accessibility", () => {
  const axe = async (p, { contrast = true } = {}) => {
    await p.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
    await p.addScriptTag({ content: axeSource });
    return p.evaluate(async (check) => {
      const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
      if (!check) options.rules = { "color-contrast": { enabled: false } };
      const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
      return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
    }, contrast);
  };
  const FRAMED = `<B.FramedArt src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='3' height='2'%3E%3C/svg%3E" alt="A synthetic dune" caption="Dunes." credit="Synthetic art" />`;
  const full = page({ extra: `<div style={{ padding: 24, maxWidth: 600 }}>${FRAMED}</div>` });
  for (const theme of ["dark", "light"]) {
    test(`${theme}: no axe violations on the clear bar over a stage, with framed art; the bar's ink holds contrast over the quiet art`, async () => {
      const p = await open(full, { theme });
      assert.ok((await bar(p)).top);
      assert.deepEqual(await axe(p), []);
      await p.close();
    });
    test(`${theme}: no axe violations in the narrow menu opened from the clear bar`, async () => {
      const p = await open(full, { theme, width: 390 });
      await p.locator(".basalt-site-menu-trigger").click();
      await p.waitForSelector(".basalt-site-menu"); await settle(p);
      assert.deepEqual(await axe(p), []);
      await p.close();
    });
  }
  test("forced colours, reduced motion and reduced transparency: no axe violations", async () => {
    for (const mode of ["forced", "motion", "transparency"]) {
      const { page: p } = await fixturePage(browser, full, { theme: "dark", viewport: { width: 1440, height: 800 }, ...(mode === "motion" ? { reducedMotion: "reduce" } : {}) });
      if (mode === "forced") await p.emulateMedia({ forcedColors: "active" });
      if (mode === "transparency") { const cdp = await p.context().newCDPSession(p); await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] }); }
      await settle(p); await frames(p);
      assert.deepEqual(await axe(p, { contrast: mode !== "forced" }), [], mode);
      await p.close();
    }
  });
});

describe("the modules", () => {
  test("the headroom helper is a module of its own: the root export and the components never import it, and an app's bundle never contains it", async () => {
    const dist = path.join(pkg, "dist");
    const esbuild = await import("esbuild");
    assert.ok(fs.existsSync(path.join(dist, "testing", "headroom.js")), "dist/testing/headroom.js");
    assert.ok(fs.existsSync(path.join(dist, "testing", "headroom.d.ts")));
    for (const file of fs.readdirSync(dist).filter((f) => f.endsWith(".js"))) assert.doesNotMatch(fs.readFileSync(path.join(dist, file), "utf8"), /testing\/headroom|data-basalt-headroom-check/, `${file} reaches the headroom helper`);
    const result = await esbuild.build({ stdin: { contents: `import { SiteHeader, Stage, PairedArt, FramedArt } from "./dist/index.js"; console.log(SiteHeader, Stage, PairedArt, FramedArt);`, resolveDir: pkg, loader: "js" }, bundle: true, minify: true, format: "esm", write: false, metafile: true, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent" });
    const used = Object.values(result.metafile.outputs)[0].inputs;
    const inputs = Object.keys(used).filter((f) => used[f].bytesInOutput > 0);
    assert.deepEqual(inputs.filter((f) => /testing|headroom/.test(f)), [], "an app's bundle carries no headroom code");
    assert.doesNotMatch(result.outputFiles[0].text, /data-basalt-headroom-check|can't resolve the colour/);
    const pkgJson = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
    assert.deepEqual(pkgJson.exports["./testing"], { types: "./dist/testing/headroom.d.ts", default: "./dist/testing/headroom.js" });
  });

  test("Stage and FramedArt alone are small and load no Base UI", async () => {
    const esbuild = await import("esbuild");
    for (const [name, limit] of [["Stage, PairedArt", 3_000], ["FramedArt", 4_000]]) {
      const result = await esbuild.build({ stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" }, bundle: true, minify: true, format: "esm", write: false, metafile: true, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent" });
      const used = Object.values(result.metafile.outputs)[0].inputs;
      assert.ok(result.outputFiles[0].contents.length < limit, `${name} is ${result.outputFiles[0].contents.length} bytes (limit ${limit})`);
      assert.deepEqual(Object.keys(used).filter((f) => used[f].bytesInOutput > 0 && /@base-ui|@phosphor-icons|cmdk|shiki/.test(f)), []);
    }
  });

  test("the observer module registers nothing when it loads", async () => {
    const OriginalObserver = globalThis.IntersectionObserver;
    let created = 0;
    globalThis.IntersectionObserver = class { constructor() { created += 1; } };
    try { await import(pathToFileURL(path.join(pkg, "dist", "at-top.js")).href); } finally { globalThis.IntersectionObserver = OriginalObserver; }
    assert.equal(created, 0);
  });
});
