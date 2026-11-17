// The tenth parity PR (step 8 of batch 7, DECISIONS 104 and 108: art), in a browser: the stage under the site header with paired art that follows the page's theme (the toggle's
// too), and framed art with its reserved box, placeholder, fade and failure, held to what React gives them; and the status rim of a callout (DECISIONS 82), which came to the
// skill in the same PR. parity.test.mjs compares each part's computed styles with React's (the ART cases and the callout's); this file pins behaviour: the pair that is shown and
// the one that is downloaded, the bar staying smoked over a stage (the skill declares no headroom, so it never clears), the stage's pull-up, level and headroom, a frame's box held
// to 0px through a load, the placeholder, the fade's timing, the failure with and without words, no script, then print, reduced motion, forced colours and axe, and the callout's rim
// at every level it can sit on. The art is synthetic and the loads are held by a route, so nothing races.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { DAY, NIGHT, PHOTO, stagePage } from "./support-art.mjs";
import { launch } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE);
};

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#808080"/></svg>`;
const html = (body) => compose(body, { fonts: false }).html;

/**
 * A page opened on a fake host. `/art.svg` (the art a body names as https://basalt.test/art.svg) is served ok, held until `page.release()`, or refused. `art` counts what each
 * `/art/*.svg` asked for. The page waits for nothing: a test says what it is waiting for.
 */
async function open(body, { scheme = "dark", width = 1440, gate = "ok", reducedMotion = "no-preference", forced = false, js = true, touch = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion, javaScriptEnabled: js, forcedColors: forced ? "active" : "none", isMobile: touch, hasTouch: touch });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const asked = [];
  await context.route("https://basalt.test/", (route) => route.fulfill({ contentType: "text/html", body: html(body) }));
  await context.route("https://basalt.test/art.svg", async (route) => {
    asked.push("/art.svg");
    if (gate === "fail") return route.abort();
    if (gate === "hold") await held;
    return route.fulfill({ contentType: "image/svg+xml", body: SVG });
  });
  await context.route("https://basalt.test/art/*.svg", (route) => { asked.push(new URL(route.request().url()).pathname); return route.fulfill({ contentType: "image/svg+xml", body: SVG }); });
  await page.goto("https://basalt.test/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  return Object.assign(page, { ctx: context, errors, release, asked });
}
const token = (p, name, property = "backgroundColor") => p.evaluate(([n, prop]) => { const probe = document.createElement("div"); probe.style[prop] = `var(--basalt-${n})`; document.body.append(probe); const v = getComputedStyle(probe)[prop]; probe.remove(); return v; }, [name, property]);
const resolve = (p, value, property = "backgroundColor") => p.evaluate(([v, prop]) => { const probe = document.createElement("div"); probe.style[prop] = v; document.body.append(probe); const out = getComputedStyle(probe)[prop]; probe.remove(); return out; }, [value, property]);
const phaseIs = (p, name, selector = ".framed-frame") => p.waitForFunction(([s, n]) => document.querySelector(s)?.getAttribute("data-phase") === n, [selector, name]);
const frames = (p, n = 2) => p.evaluate((count) => new Promise((resolve) => { let left = count; const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick)); requestAnimationFrame(tick); }), n);
const ms = (value) => (value.trim().endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000);

const PAIR = (extra = "") => `<img class="paired-art" data-art="dark" src="${NIGHT}" alt="" width="1600" height="800" loading="eager"${extra}><img class="paired-art" data-art="light" src="${DAY}" alt="" width="1600" height="800" loading="eager"${extra}>`;
const STAGE = (art = PAIR(), content = "<h1>A headline</h1>") => `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#" aria-label="Orbit home">Orbit</a><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header><section class="stage"><div class="stage-art" aria-hidden="true">${art}</div><div class="stage-content"><div style="height: 360px; padding: 0 24px">${content}</div></div></section><main style="height: 1600px"><p id="anchor">Synthetic page.</p></main>`;
const shown = (p) => p.evaluate(() => [...document.querySelectorAll(".paired-art")].filter((el) => getComputedStyle(el).display !== "none").map((el) => el.getAttribute("data-art")));
const FIGURE = (props = {}, { alt = "A synthetic dune", caption = "Dunes at the end of the day.", credit = "Synthetic art", src = "https://basalt.test/art.svg" } = {}) => `<figure class="framed"${props.aspect ? ` data-aspect="${props.aspect}"` : ""} style="width: ${props.width ?? 400}px"><div class="framed-frame"><img src="${src}" alt="${alt}"${props.lazy ? ' loading="lazy"' : ""}></div>${caption || credit ? `<figcaption>${caption}${credit ? `<span class="framed-credit">${credit}</span>` : ""}</figcaption>` : ""}</figure>`;
const FRAME_PAGE = (figure, below = "") => `<div style="padding: 24px">${figure}<p id="below" style="margin: 0">below the frame</p>${below}</div>`;
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });

describe("paired art", () => {
  for (const theme of THEMES) {
    test(`it shows the one for the page's theme, and the toggle swaps it (${theme})`, async () => {
      const p = await open(STAGE(), { scheme: theme });
      assert.deepEqual(await shown(p), [theme], "the system's choice, which the page's script wrote as data-theme");
      await p.locator("[data-theme-toggle]").click();
      assert.deepEqual(await shown(p), [theme === "dark" ? "light" : "dark"], "the toggle's choice");
      await p.locator("[data-theme-toggle]").click();
      assert.deepEqual(await shown(p), [theme]);
      assert.deepEqual(p.errors, []);
      await p.ctx.close();
    });
  }

  test("it follows the system setting when the page chooses none, and a class theme root works too", async () => {
    const p = await open(STAGE(), { scheme: "dark" });
    // The system's scheme changes on the next rendering update, and the theme script (if it listens) runs then: read only after two frames, so a script that overwrites the
    // page's own theme fails this every time and not only when it happens to run late.
    const system = async (scheme) => { await p.emulateMedia({ colorScheme: scheme }); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); };
    await p.evaluate(() => { document.documentElement.removeAttribute("data-theme"); });
    await system("dark"); assert.deepEqual(await shown(p), ["dark"]);
    await system("light"); assert.deepEqual(await shown(p), ["light"]);
    await p.evaluate(() => { document.documentElement.classList.add("dark"); });
    assert.deepEqual(await shown(p), ["dark"], "a .dark root beats the system's light");
    await system("dark"); await system("light");
    assert.deepEqual(await shown(p), ["dark"], "and still does after the system changes");
    await p.evaluate(() => { document.documentElement.classList.remove("dark"); document.documentElement.setAttribute("data-theme", "light"); });
    await system("dark");
    assert.deepEqual(await shown(p), ["light"], "a chosen light beats the system's dark");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "light", "and the attribute is the page's, untouched");
    await p.ctx.close();
  });

  test("a nested theme root has its own pair", async () => {
    const p = await open(`<div data-theme="dark"><section class="stage"><div class="stage-art">${PAIR()}</div><div class="stage-content">x</div></section><div data-theme="light" id="inner"><section class="stage"><div class="stage-art">${PAIR()}</div><div class="stage-content">y</div></section></div></div>`, { scheme: "light" });
    // The page's own root is light; the outer root says dark, the inner says light.
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll(".paired-art")].map((el) => [el.closest("#inner") ? "inner" : "outer", el.getAttribute("data-art"), getComputedStyle(el).display !== "none"])), [["outer", "dark", true], ["outer", "light", false], ["inner", "dark", false], ["inner", "light", true]]);
    await p.ctx.close();
  });

  test("only the version that is shown is downloaded: a lazy image under display: none does not load, until the theme changes", async () => {
    const lazy = `<img class="paired-art" data-art="dark" src="https://basalt.test/art/night.svg" alt="" width="4" height="3" loading="lazy"><img class="paired-art" data-art="light" src="https://basalt.test/art/day.svg" alt="" width="4" height="3" loading="lazy">`;
    const p = await open(STAGE(lazy), { scheme: "dark" });
    await p.waitForFunction(() => [...document.images].some((i) => i.complete && i.naturalWidth > 0));
    await frames(p, 10);
    assert.deepEqual(p.asked, ["/art/night.svg"], "only the dark version, in the dark theme");
    await p.locator("[data-theme-toggle]").click();
    await p.waitForFunction(() => document.querySelector(".paired-art[data-art=light]").complete);
    assert.deepEqual([...p.asked].sort(), ["/art/day.svg", "/art/night.svg"], "the light version loads when the toggle asks for it");
    await p.ctx.close();
  });

  test("it is never dimmed, inverted, tinted, filtered or blended, fills the stage at its own crop, and is decorative", async () => {
    const p = await open(STAGE(PAIR(' style="object-position: 30% 50%"')), { scheme: "dark" });
    const s = await p.locator(".paired-art[data-art=dark]").evaluate((el) => { const c = getComputedStyle(el); const r = el.getBoundingClientRect(); const stage = document.querySelector(".stage").getBoundingClientRect(); return { filter: c.filter, blend: c.mixBlendMode, opacity: c.opacity, fit: c.objectFit, position: c.objectPosition, overlay: c.backgroundImage, fills: Math.abs(r.width - stage.width) < 0.5 && Math.abs(r.height - stage.height) < 0.5, alt: el.getAttribute("alt") }; });
    assert.deepEqual(s, { filter: "none", blend: "normal", opacity: "1", fit: "cover", position: "30% 50%", overlay: "none", fills: true, alt: "" });
    assert.equal(await p.locator(".stage-art").getAttribute("aria-hidden"), "true");
    await p.ctx.close();
  });
});

describe("the stage", () => {
  for (const theme of THEMES) {
    test(`it starts at the top of the page under the bar, level 0, with its content below the headroom, and the bar is smoked from the top and after a scroll (${theme})`, async () => {
      const p = await open(STAGE(), { scheme: theme });
      await settle(p);
      const read = () => p.evaluate(() => {
        const stage = document.querySelector(".stage"), bar = document.querySelector(".topbar"), content = document.querySelector(".stage-content");
        const s = getComputedStyle(stage), b = getComputedStyle(bar);
        return { stageTop: stage.getBoundingClientRect().top, contentTop: content.getBoundingClientRect().top - stage.getBoundingClientRect().top, bar: { top: bar.getBoundingClientRect().top, height: bar.getBoundingClientRect().height, background: b.backgroundColor, filter: b.backdropFilter, line: b.borderBottomColor, top_: b.top, position: b.position }, data: [bar.hasAttribute("data-top"), bar.hasAttribute("data-jump")], stage: { rim: s.borderTopWidth, radius: s.borderTopLeftRadius, shadow: s.boxShadow, background: s.backgroundColor, color: s.color, level: stage.getAttribute("data-level") } };
      });
      const top = await read();
      assert.equal(top.stageTop, 0, "pulled up under the bar by the sticky offset");
      assert.equal(top.contentTop, 80, "the content starts below size-stage-headroom (80px, no safe area here)");
      assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-stage-headroom")), "calc(80px + 0px)", "the derived headroom custom property");
      assert.deepEqual([top.stage.rim, top.stage.radius, top.stage.shadow, top.stage.level], ["0px", "0px", "none", null], "level 0: no rim, radius or shadow where it ends");
      assert.equal(top.stage.background, await token(p, "art-field"), "art-field while the art loads");
      assert.equal(top.stage.color, await token(p, "text-primary", "color"));
      // The bar: smoked from the first pixel, never clear.
      assert.equal(top.bar.background, await token(p, "surface-chrome"));
      assert.match(top.bar.filter, /blur\(12px\)/);
      assert.equal(top.bar.line, await token(p, "border-hairline", "borderBottomColor"));
      assert.deepEqual(top.data, [false, false], "the skill writes no at-top state: the bar has nothing to clear on");
      assert.deepEqual([top.bar.top, top.bar.height, top.bar.position], [0, 56, "sticky"]);
      for (const y of [1, 10, 700]) {
        await p.evaluate((to) => window.scrollTo(0, to), y);
        await frames(p, 3);
        const scrolled = await read();
        assert.deepEqual([scrolled.bar.background, scrolled.bar.filter, scrolled.bar.line, scrolled.bar.top], [top.bar.background, top.bar.filter, top.bar.line, 0], `the same smoked bar at a scroll of ${y}`);
      }
      assert.deepEqual(p.errors, []);
      await p.ctx.close();
    });
  }

  test("a stage with no bar above it asks for no offset and keeps its headroom; the art fills it", async () => {
    const p = await open(`<section class="stage"><div class="stage-art">${PAIR()}</div><div class="stage-content"><p>x</p></div></section>`);
    const s = await p.evaluate(() => { const st = getComputedStyle(document.querySelector(".stage")); return { margin: st.marginTop, padding: st.paddingTop, top: document.querySelector(".stage").getBoundingClientRect().top }; });
    assert.deepEqual(s, { margin: "0px", padding: "80px", top: 0 });
    await p.ctx.close();
  });

  test("a drawn picture in the art layer fills it and swaps with the theme by tone", async () => {
    const drawn = `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="40" style="fill: var(--basalt-art-tone-1)"/></svg>`;
    for (const theme of THEMES) {
      const p = await open(STAGE(drawn), { scheme: theme });
      const [fill, tone, fits] = await p.evaluate(() => { const svg = document.querySelector(".stage-art > svg"), r = svg.getBoundingClientRect(), s = document.querySelector(".stage").getBoundingClientRect(); const probe = document.createElement("i"); probe.style.color = "var(--basalt-art-tone-1)"; document.body.append(probe); const t = getComputedStyle(probe).color; probe.remove(); return [getComputedStyle(svg.querySelector("rect")).fill, t, r.width === s.width && r.height === s.height]; });
      assert.equal(fill, tone);
      assert.ok(fits);
      await p.ctx.close();
    }
  });

  test("forced colours: the art is not drawn and the stage is Canvas; reduced motion changes nothing; print drops the art, the pull-up and the headroom, and the bar prints static and opaque", async () => {
    const p = await open(STAGE(), { scheme: "dark", forced: true });
    assert.deepEqual(await p.evaluate(() => [getComputedStyle(document.querySelector(".stage-art")).display, getComputedStyle(document.querySelector(".stage")).backgroundColor]), ["none", await resolve(p, "Canvas")]);
    await p.ctx.close();
    const q = await open(STAGE(), { scheme: "dark", reducedMotion: "reduce" });
    assert.deepEqual(await q.evaluate(() => { const s = getComputedStyle(document.querySelector(".stage")); return [s.marginTop, s.paddingTop, getComputedStyle(document.querySelector(".stage-art")).display]; }), ["-56px", "80px", "block"]);
    await q.emulateMedia({ media: "print" });
    const printed = await q.evaluate(() => { const s = getComputedStyle(document.querySelector(".stage")), b = getComputedStyle(document.querySelector(".topbar")); return { art: getComputedStyle(document.querySelector(".stage-art")).display, margin: s.marginTop, padding: s.paddingTop, background: s.backgroundColor, image: s.backgroundImage, bar: [b.position, b.backdropFilter, b.backgroundColor] }; });
    assert.deepEqual([printed.art, printed.margin, printed.padding, printed.background, printed.image], ["none", "0px", "0px", "rgba(0, 0, 0, 0)", "none"]);
    assert.equal(printed.bar[0], "static");
    assert.equal(printed.bar[1], "none");
    assert.equal(printed.bar[2], await token(q, "surface-page"), "opaque");
    await q.ctx.close();
  });

  test("the safe area is added to the headroom and to the pull-up (a derived property, as the bar's)", async () => {
    const p = await open(STAGE());
    await p.addStyleTag({ content: ":root { --bh-inset-top: 20px; }" });
    const s = await p.evaluate(() => { const st = getComputedStyle(document.querySelector(".stage")); return [st.paddingTop, st.marginTop]; });
    assert.deepEqual(s, ["100px", "-76px"], "80 plus 20; the bar's 56 plus 20");
    await p.ctx.close();
  });
});

describe("framed art", () => {
  test("the frame reserves its box from its aspect before the art loads, and nothing moves when it does (0px)", async () => {
    for (const aspect of ["square", "photo", "screen", "wide"]) {
      const p = await open(FRAME_PAGE(FIGURE({ aspect, width: 400 })), { gate: "hold" });
      await phaseIs(p, "loading");
      const before = { frame: await box(p.locator(".framed-frame")), caption: await box(p.locator("figcaption")), below: await box(p.locator("#below")) };
      const ratio = { square: 1, photo: 3 / 2, screen: 16 / 10, wide: 16 / 9 }[aspect];
      assert.ok(Math.abs(before.frame.w / before.frame.h - ratio) < 0.01, `${aspect}: ${before.frame.w} by ${before.frame.h}`);
      assert.equal(await p.locator(".framed-frame").evaluate((el) => getComputedStyle(el).aspectRatio), { square: "1 / 1", photo: "1.5 / 1", screen: "1.6 / 1", wide: "1.7778 / 1" }[aspect]);
      p.release();
      await phaseIs(p, "loaded");
      await settle(p);
      const after = { frame: await box(p.locator(".framed-frame")), caption: await box(p.locator("figcaption")), below: await box(p.locator("#below")) };
      assert.deepEqual(after, before, `${aspect}: the frame, the caption and what is below do not move`);
      await p.ctx.close();
    }
  });

  test("while it loads the frame is the placeholder and the picture is hidden, with no shimmer, spinner or blur; once decoded the picture fades in over duration-base on ease-out", async () => {
    for (const theme of THEMES) {
      const p = await open(`<script>document.addEventListener("transitionrun", function (e) { (window.__runs = window.__runs || []).push(e.propertyName); }, true);</script>` + FRAME_PAGE(FIGURE()), { gate: "hold", scheme: theme });
      await phaseIs(p, "loading");
      await frames(p, 5);
      assert.deepEqual(await p.evaluate(() => window.__runs ?? []), [], "entering the loading state starts no fade: the picture was never drawn");
      const s = await p.evaluate(() => { const f = document.querySelector(".framed-frame"), img = f.querySelector("img"), c = getComputedStyle(f); return { bg: c.backgroundColor, image: c.backgroundImage, animation: c.animationName, filter: c.filter, imgOpacity: getComputedStyle(img).opacity, children: [...f.children].map((x) => x.tagName), loops: document.getAnimations().length }; });
      assert.deepEqual([s.bg, s.image, s.animation, s.filter, s.imgOpacity, s.children, s.loops], [await token(p, "surface-placeholder"), "none", "none", "none", "0", ["IMG"], 0]);
      p.release();
      await phaseIs(p, "loaded");
      const fade = await p.locator(".framed-frame > img").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty).map((a) => ({ property: a.transitionProperty, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })));
      const base = ms(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-base")));
      const ease = await p.evaluate(() => { const probe = document.createElement("i"); probe.style.transitionTimingFunction = "var(--basalt-ease-out)"; document.body.append(probe); const v = getComputedStyle(probe).transitionTimingFunction; probe.remove(); return v; });
      assert.deepEqual(fade, [{ property: "opacity", duration: base, easing: ease }], "opacity only, over duration-base, on ease-out");
      await settle(p);
      assert.equal(await p.locator(".framed-frame > img").evaluate((el) => getComputedStyle(el).opacity), "1");
      await p.ctx.close();
    }
  });

  test("under reduced motion the fade is the same opacity-only fade: nothing moves", async () => {
    const p = await open(FRAME_PAGE(FIGURE()), { gate: "hold", reducedMotion: "reduce" });
    await phaseIs(p, "loading");
    p.release();
    await phaseIs(p, "loaded");
    const fade = await p.locator(".framed-frame > img").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty).map((a) => [a.transitionProperty, a.effect.getTiming().duration]));
    assert.deepEqual(fade.map(([property]) => property), ["opacity"]);
    assert.deepEqual(await p.locator(".framed-frame > img").evaluate((el) => [getComputedStyle(el).transform, getComputedStyle(el).transitionProperty]), ["none", "opacity"]);
    await p.ctx.close();
  });

  test("a picture the document already knows is shown at once, with no fade; one still loading when the script runs fades in", async () => {
    const runs = `<script>document.addEventListener("transitionrun", function (e) { (window.__runs = window.__runs || []).push(e.propertyName + ":" + (e.target.tagName)); }, true);</script>`;
    // A decoded data URI: complete when the script wires it.
    const known = await open(runs + FRAME_PAGE(FIGURE({}, { src: PHOTO })));
    await phaseIs(known, "loaded");
    await settle(known);
    assert.deepEqual(await known.evaluate(() => [window.__runs ?? [], getComputedStyle(document.querySelector(".framed-frame > img")).opacity]), [[], "1"], "no opacity transition ran");
    await known.ctx.close();
    // A picture held on the network: loading when the script runs, so it fades.
    const held = await open(runs + FRAME_PAGE(FIGURE()), { gate: "hold" });
    await phaseIs(held, "loading");
    held.release();
    await phaseIs(held, "loaded");
    await settle(held);
    assert.deepEqual(await held.evaluate(() => window.__runs ?? []), ["opacity:IMG"]);
    await held.ctx.close();
  });

  test("if it fails, meaningful art shows its alt text centred in secondary at 13/18, and decorative art shows nothing; the frame stays the placeholder", async () => {
    const p = await open(FRAME_PAGE(FIGURE({ aspect: "wide" }) + FIGURE({ aspect: "wide" }, { alt: "", caption: "", credit: "" })), { gate: "fail" });
    await p.waitForFunction(() => [...document.querySelectorAll(".framed-frame")].every((f) => f.dataset.phase === "failed"));
    const s = await p.evaluate(() => {
      const [one, two] = [...document.querySelectorAll(".framed-frame")];
      const t = one.querySelector(".framed-alt"), c = getComputedStyle(t), fr = one.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(t); const tr = range.getBoundingClientRect();
      return { text: t.textContent, color: c.color, size: c.fontSize, line: c.lineHeight, align: c.textAlign, centred: Math.abs((tr.left + tr.right) / 2 - (fr.left + fr.right) / 2) < 2 && Math.abs((tr.top + tr.bottom) / 2 - (fr.top + fr.bottom) / 2) < 2, img: getComputedStyle(one.querySelector("img")).display, bg: getComputedStyle(one).backgroundColor, decorative: [two.querySelector(".framed-alt"), two.textContent, getComputedStyle(two.querySelector("img")).display, getComputedStyle(two).backgroundColor] };
    });
    assert.deepEqual([s.text, s.color, s.size, s.line, s.align, s.centred, s.img, s.bg], ["A synthetic dune", await token(p, "text-secondary", "color"), "13px", "18px", "center", true, "none", await token(p, "surface-placeholder")]);
    assert.deepEqual(s.decorative, [null, "", "none", await token(p, "surface-placeholder")]);
    assert.deepEqual(p.errors, []);
    await p.ctx.close();
  });

  test("an alt with markup in it is shown as words", async () => {
    const p = await open(FRAME_PAGE(FIGURE({}, { alt: "A &lt;b&gt;bold&lt;/b&gt; claim" })), { gate: "fail" });
    await phaseIs(p, "failed");
    assert.deepEqual(await p.locator(".framed-alt").evaluate((el) => [el.textContent, el.children.length]), ["A <b>bold</b> claim", 0]);
    await p.ctx.close();
  });

  test("with no script the picture simply shows", async () => {
    const p = await open(FRAME_PAGE(FIGURE({}, { src: PHOTO })), { js: false });
    await p.waitForFunction(() => document.querySelector(".framed-frame > img")?.complete);
    assert.deepEqual(await p.evaluate(() => { const f = document.querySelector(".framed-frame"), i = f.querySelector("img"); return [f.getAttribute("data-phase"), getComputedStyle(i).opacity, getComputedStyle(i).display]; }), [null, "1", "block"]);
    await p.ctx.close();
  });

  for (const theme of THEMES) {
    test(`the rim is a real 1px border outside the art, no shadow, radius 12 on the page and the outer radius less the padding in a card (${theme})`, async () => {
      const p = await open(FRAME_PAGE(FIGURE({ aspect: "wide" }) + `<div class="card" style="margin-top: 24px">${FIGURE({}, { caption: "", credit: "" })}</div>`), { scheme: theme });
      await p.waitForFunction(() => [...document.querySelectorAll(".framed-frame")].every((f) => f.dataset.phase === "loaded"));
      const s = await p.locator(".framed-frame").first().evaluate((el) => { const c = getComputedStyle(el); const img = el.querySelector("img").getBoundingClientRect(); const f = el.getBoundingClientRect(); return { width: [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth], style: c.borderTopStyle, top: c.borderTopColor, side: c.borderRightColor, bottom: c.borderBottomColor, left: c.borderLeftColor, radius: c.borderTopLeftRadius, shadow: c.boxShadow, outline: c.outlineStyle, inset: [img.left - f.left, img.top - f.top, f.right - img.right, f.bottom - img.bottom], overflow: c.overflow, pad: c.padding }; });
      assert.deepEqual([s.width, s.style, s.radius, s.shadow, s.outline, s.inset, s.overflow, s.pad], [["1px", "1px", "1px", "1px"], "solid", "12px", "none", "none", [1, 1, 1, 1], "hidden", "0px"]);
      assert.equal(s.top, await token(p, "border-rim-top", "borderTopColor"));
      assert.deepEqual([s.side, s.bottom, s.left], Array(3).fill(await token(p, "border-rim", "borderTopColor")));
      // A card is 12 and pads 16: 12 less 16 is square; a smaller padding leaves the rest.
      assert.equal(await p.locator(".card .framed-frame").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "0px");
      await p.locator(".card .framed").evaluate((el) => el.style.setProperty("--_panel-pad", "4px"));
      assert.equal(await p.locator(".card .framed-frame").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "8px", "12 less a 4px padding");
      await p.ctx.close();
    });
  }

  test("object-fit cover: a picture of another ratio fills the frame; the caption is a figcaption under it, space-2 below, start-aligned, at most the prose width, and the credit is a line of its own in tertiary", async () => {
    const p = await open(FRAME_PAGE(FIGURE({ aspect: "wide", width: 900 })), { width: 1440 });
    await phaseIs(p, "loaded");
    assert.equal(await p.locator(".framed-frame > img").evaluate((el) => getComputedStyle(el).objectFit), "cover");
    const [f, i] = await p.evaluate(() => [document.querySelector(".framed-frame"), document.querySelector(".framed-frame > img")].map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }));
    assert.deepEqual([i[0], i[1]], [f[0] - 2, f[1] - 2]);
    const s = await p.evaluate(() => {
      const frame = document.querySelector(".framed-frame").getBoundingClientRect(), cap = document.querySelector("figcaption"), c = cap.getBoundingClientRect();
      const credit = document.querySelector(".framed-credit"), k = getComputedStyle(credit), cc = getComputedStyle(cap);
      const range = document.createRange(); range.selectNodeContents(cap.firstChild); const text = range.getBoundingClientRect();
      return { gap: c.top - frame.bottom, left: c.left - frame.left, width: c.width, maxWidth: cc.maxWidth, align: cc.textAlign, tag: cap.tagName, parent: cap.parentElement.tagName, textColor: cc.color, textSize: [cc.fontSize, cc.lineHeight], creditColor: k.color, creditSize: [k.fontSize, k.lineHeight], creditOwnLine: credit.getBoundingClientRect().top >= text.bottom - 0.5 && k.display === "block", overArt: c.top < frame.bottom };
    });
    assert.deepEqual([s.gap, s.left, s.tag, s.parent, s.align, s.overArt, s.maxWidth], [8, 0, "FIGCAPTION", "FIGURE", "start", false, "544px"]);
    assert.ok(s.width <= 544);
    assert.equal(s.textColor, await token(p, "text-secondary", "color"));
    assert.deepEqual(s.textSize, ["13px", "18px"]);
    assert.equal(s.creditColor, await token(p, "text-tertiary", "color"));
    assert.deepEqual(s.creditSize, ["12px", "16px"]);
    assert.ok(s.creditOwnLine);
    await p.ctx.close();
  });

  test("it prints, and its rim is CanvasText in forced colours", async () => {
    const p = await open(FRAME_PAGE(FIGURE()), { forced: true });
    await phaseIs(p, "loaded");
    const [rim, text] = await p.evaluate(() => { const d = document.createElement("div"); d.style.color = "CanvasText"; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return [getComputedStyle(document.querySelector(".framed-frame")).borderTopColor, v]; });
    assert.equal(rim, text);
    await p.emulateMedia({ media: "print" });
    assert.notEqual(await p.locator(".framed-frame").evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await p.locator(".framed-frame > img").evaluate((el) => getComputedStyle(el).display), "block");
    assert.equal(await p.locator(".framed").evaluate((el) => getComputedStyle(el).breakInside), "avoid");
    await p.ctx.close();
  });

  test("a credit in the smoked bar takes secondary ink: only primary and secondary sit on it", async () => {
    const p = await open(`<header class="topbar"><div class="topbar-inner"><figure class="framed" style="width: 80px"><div class="framed-frame"><img src="${PHOTO}" alt="x"></div><figcaption><span class="framed-credit">Credit</span></figcaption></figure></div></header>`);
    assert.equal(await p.locator(".framed-credit").evaluate((el) => getComputedStyle(el).color), await token(p, "text-secondary", "color"));
    await p.ctx.close();
  });
});

describe("the art page, accessibility", () => {
  for (const theme of THEMES) {
    for (const forced of [false, true]) {
      test(`no axe violations: the stage, paired art and every frame (${theme}${forced ? ", forced colours" : ""})`, async () => {
        const p = await open(stagePage().replaceAll(PHOTO, "https://basalt.test/art.svg"), { scheme: theme, forced });
        await p.waitForFunction(() => [...document.querySelectorAll(".framed-frame")].every((f) => ["loaded", "failed"].includes(f.dataset.phase)));
        await settle(p);
        assert.deepEqual(await axeViolations(p), []);
        assert.deepEqual(p.errors, []);
        await p.ctx.close();
      });
    }
  }
});

describe("the callout's status rim (DECISIONS 82)", () => {
  const STATUSES = ["info", "success", "warning", "danger"];
  const CALLOUTS = STATUSES.map((s) => `<div class="callout" data-status="${s}"><svg class="icon" width="16" height="16" viewBox="0 0 256 256" aria-hidden="true"></svg><div><div class="callout-title">${s}</div><div class="callout-body">Body text</div></div></div>`).join("");
  const PAGE = `<div id="lv1">${CALLOUTS}</div><div id="lv2" class="card">${CALLOUTS}</div><div id="lv3"><div class="card"><div class="card">${CALLOUTS}</div></div></div><div id="modal" class="panel float modal">${CALLOUTS}</div><div id="lvl-attr" data-level="2">${CALLOUTS}</div>`;
  const STATUS_VAR = { success: "status-success", warning: "status-warning", danger: "status-danger" };
  /** The rim a status callout should have: its status colour at 45% mixed in sRGB over its own level (the panel fill it reads), resolved by the browser. */
  const expected = (p, selector, status) => p.evaluate(([sel, name]) => {
    const el = document.querySelector(sel);
    const level = getComputedStyle(el).backgroundColor;
    const probe = document.createElement("i");
    probe.style.borderColor = `color-mix(in srgb, var(--basalt-${name}) 45%, ${level})`;
    probe.style.borderStyle = "solid";
    document.body.append(probe);
    const out = getComputedStyle(probe).borderTopColor;
    probe.remove();
    return out;
  }, [selector, STATUS_VAR[status]]);
  const sides = (p, selector) => p.locator(selector).evaluate((el) => { const c = getComputedStyle(el); return [c.borderTopColor, c.borderRightColor, c.borderBottomColor, c.borderLeftColor, c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth]; });

  for (const theme of THEMES) {
    test(`success, warning and danger draw one solid rim in the status colour at 45% over their own level, on every side, at every level; info keeps the neutral rim (${theme})`, async () => {
      const p = await open(PAGE, { scheme: theme });
      for (const level of ["#lv1", "#lv2", "#lv3", "#modal", "#lvl-attr"]) {
        for (const status of STATUSES) {
          const selector = `${level} .callout[data-status=${status}]`;
          const got = await sides(p, selector);
          if (status === "info") {
            const neutral = [await token(p, "border-rim-top", "borderTopColor"), ...Array(3).fill(await token(p, "border-rim", "borderTopColor"))];
            assert.deepEqual(got.slice(0, 4), neutral, `${level} info: the neutral rim`);
          } else {
            const want = await expected(p, selector, status);
            assert.deepEqual(got.slice(0, 4), Array(4).fill(want), `${level} ${status}: one solid colour on every side`);
            assert.notEqual(want, await token(p, "border-rim", "borderTopColor"), `${level} ${status}: not the neutral rim`);
          }
          assert.deepEqual(got.slice(4), Array(4).fill("1px"), `${level} ${status}: still a 1px border`);
        }
      }
      // Each level mixes over its own fill: the three cards' successes differ in dark, where the levels are steps of grey.
      const fills = [];
      for (const level of ["#lv1", "#lv2", "#lv3"]) fills.push(await p.locator(`${level} .callout[data-status=success]`).evaluate((el) => getComputedStyle(el).backgroundColor));
      if (theme === "dark") assert.equal(new Set(fills).size, 3, "three levels, three fills in dark");
      const rims = [];
      for (const level of ["#lv1", "#lv2", "#lv3"]) rims.push((await sides(p, `${level} .callout[data-status=success]`))[0]);
      if (theme === "dark") assert.equal(new Set(rims).size, 3, "so three rims");
      // The icon takes the status colour; only danger's title does.
      for (const status of ["success", "warning", "danger"]) assert.equal(await p.locator(`#lv1 .callout[data-status=${status}] > svg`).evaluate((el) => getComputedStyle(el).color), await token(p, STATUS_VAR[status], "color"));
      assert.equal(await p.locator("#lv1 .callout[data-status=info] > svg").evaluate((el) => getComputedStyle(el).color), await token(p, "text-secondary", "color"));
      assert.equal(await p.locator("#lv1 .callout[data-status=danger] .callout-title").evaluate((el) => getComputedStyle(el).color), await token(p, "status-danger", "color"));
      assert.equal(await p.locator("#lv1 .callout[data-status=warning] .callout-title").evaluate((el) => getComputedStyle(el).color), await token(p, "text-primary", "color"));
      assert.deepEqual(p.errors, []);
      await p.ctx.close();
    });

    test(`in forced colours the rim and the icon are CanvasText for every status: the status is the icon's shape and the words (${theme})`, async () => {
      const p = await open(PAGE, { scheme: theme, forced: true });
      const text = await resolve(p, "CanvasText", "color");
      for (const level of ["#lv1", "#lv2", "#lv3", "#modal"]) for (const status of STATUSES) {
        assert.deepEqual((await sides(p, `${level} .callout[data-status=${status}]`)).slice(0, 4), Array(4).fill(text), `${level} ${status} rim`);
        assert.equal(await p.locator(`${level} .callout[data-status=${status}] > svg`).evaluate((el) => getComputedStyle(el).color), text, `${level} ${status} icon`);
      }
      await p.ctx.close();
    });
  }
});
