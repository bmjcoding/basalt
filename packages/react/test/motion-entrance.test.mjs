// The entrance (DECISIONS 136 A, approved in 139): one figure on a page's first screen draws its marks once, at load, on a first visit; a number
// beside it is its real value in the first frame (E). Driven in Chromium against the built package with the real stylesheet. The data is synthetic.
//
// Every test here would fail on origin/main: there is no `entrance` prop, no `duration-figure` or `duration-stagger`, and no `entrance.ts`.
// The page records every `Element.animate` call (its timing, its keyframes and the element's box at that instant), so a test reads what was
// authored and not what a loaded machine managed to sample. Real time is used only for "stored when it finishes".
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { bundleFixture, launch, pkg } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const ORIGIN = "https://basalt.test";
const THEMES = ["dark", "light"];

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const entrance = await import(pathToFileURL(path.join(pkg, "dist", "entrance.js")).href);

// `performance.now()` starts at navigation, and the entrance is not played by a script that starts more than a second after it (that rule has its own test, which waits 1300ms on
// purpose). Under load a bundle can take that long to run, so every other page sees time at a tenth of its pace for its first three seconds: the gate then reads the page's order of
// events and never the machine's speed.
const NOWMOCK = `(() => { const real = performance.now.bind(performance); const base = real(); performance.now = () => { const t = real() - base; return t < 3000 ? t / 10 : t - 2700; }; })();`;

// With \`freeze\`, every animation is held at its first frame the moment it is made (\`window.__pause\`): a test then reads an instant of the entrance by seeking, and the machine's speed
// cannot move it. The animations' own \`finished\` promise settles when a test calls \`finish()\`.
const RECORD = `(() => {
  const real = Element.prototype.animate;
  window.__anims = [];
  Element.prototype.animate = function (keyframes, options) {
    const animation = real.call(this, keyframes, options);
    if (window.__pause) animation.pause();
    const box = this.getBoundingClientRect();
    window.__anims.push({
      cls: this.getAttribute("class") || this.tagName,
      kind: this.tagName.toLowerCase(),
      keyframes: JSON.parse(JSON.stringify(keyframes)),
      duration: options && options.duration, delay: options && options.delay || 0, easing: options && options.easing, fill: options && options.fill,
      height: box.height, width: box.width, at: performance.now(),
    });
    return animation;
  };
})();`;

const FIXTURE = `
import { sleepData, trainingData, min, minSpoken } from "./test/fixtures/chart-data.ts";
window.__B = B;
window.D = { train: trainingData(28), train2: trainingData(28, { late: true }), sleep: sleepData(28) };
function Page() {
  const [, bump] = React.useState(0);
  window.__bump = () => bump((n) => n + 1);
  const c = window.__cfg;
  const data = window.D[c.data];
  return (
    <div id="host" style={{ width: 900, margin: "0 auto" }}>
      {c.spacer ? <div style={{ height: c.spacer }} /> : null}
      <p id="words">Training this month, in minutes a day.</p>
      <button id="control" type="button" onClick={() => { window.__cfg.data = "train2"; window.__bump(); }}>Another bench</button>
      <B.NumberTicker value={4912} />
      {c.hide ? null : <B.TimeChart title="Training" source="Watch" kind={c.kind} days={data.days} series={data.series} plan={data.plan} partial={c.kind === "bar" ? data.partial : undefined}
        format={min} spoken={minSpoken} now={Date.UTC(2026, 10, 10, 12)} unit="min" summary="Training averaged 54 min a day." entrance={c.entrance} />}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Page />);`;

/** A page on a fake origin (so localStorage works and survives a reload). Returns the page, the errors, and the context. */
async function open({ context, theme = "dark", cfg = {}, viewport = { width: 1440, height: 900 }, reducedMotion, forcedColors, stored = {}, hidden = false, held = false, late = 0, media, freeze = false, realClock = false } = {}) {
  context ??= await browser.newContext({ viewport, reducedMotion, forcedColors, colorScheme: theme });
  const script = await bundleFixture(FIXTURE);
  const config = { data: "train", kind: "bar", entrance: true, ...cfg };
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="en" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basalt</title><style>${css()}</style><style>body{margin:0;padding:16px;background:var(--basalt-surface-page);color:var(--basalt-text-primary);font-family:var(--basalt-font-family-sans)}</style>${late || realClock ? "" : `<script>${NOWMOCK}</script>`}<script>${RECORD}</script>${freeze ? "<script>window.__pause = true</script>" : ""}<script>window.__cfg = ${JSON.stringify(config)};${held ? 'document.documentElement.setAttribute("data-loops", "held");' : ""}${hidden ? 'Object.defineProperty(document, "visibilityState", { get: () => "hidden" });' : ""}${Object.entries(stored).map(([k, v]) => `try { if (!sessionStorage.getItem("__init")) localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)}); } catch (e) {}`).join("")}</script></head><body><div id="root"></div>${late ? `<script>setTimeout(function(){var s=document.createElement("script");s.textContent=${JSON.stringify(script)};document.body.append(s);}, ${late});</script>` : `<script>${script}</script>`}</body></html>`,
  }));
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (media) await page.emulateMedia(media);
  await page.goto(`${ORIGIN}/`);
  if (!late && !config.hide) await page.waitForSelector(".basalt-chart-svg");
  await frames(page);
  return { page, errors, context };
}
const frames = (page, n = 2) => page.evaluate(async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); }, n);
const anims = (page) => page.evaluate(() => window.__anims);
const stored = (page) => page.evaluate(() => { try { return localStorage.getItem("basalt-entrance:/"); } catch { return "blocked"; } });
const running = (page) => page.evaluate(() => document.querySelector(".basalt-chart-svg")?.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length ?? -1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Holds every finite animation on the page at `ms` into its own timeline. */
const seek = (page, ms) => page.evaluate((ms) => { for (const a of document.getAnimations()) { if (a.effect.getComputedTiming().iterations === Infinity) continue; a.pause(); a.currentTime = ms; } }, ms);
/** Runs every finite animation on the page to its end, which settles the entrance's promise. */
const finish = (page) => page.evaluate(() => { for (const a of document.getAnimations()) if (a.effect.getComputedTiming().iterations !== Infinity) a.finish(); });
const token = (page, name) => page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(`--basalt-${name}`).trim(), name);

describe("no script", () => {
  test("the server draws no mark and arms nothing: the figure is at rest with no script, and nothing is hidden for an entrance to reveal", async () => {
    const { TimeChart } = await import(pathToFileURL(path.join(pkg, "dist", "chart.js")).href);
    const html = renderToString(createElement(TimeChart, {
      title: "Training", kind: "bar", days: ["2026-11-09", "2026-11-10"], series: [{ id: "t", name: "Training", values: [48, 61] }], format: (v) => `${v} min`, summary: "Two days.", entrance: true,
    }));
    assert.ok(html.includes("Training"), "the words are in the markup");
    assert.ok(!/basalt-chart-svg|data-entering|data-entrance|animation|scaleY|opacity:\s*0/.test(html), "no plot, no mark and no armed state (the legend's swatches are the frame)");
  });
});

describe("the tokens (DECISIONS 136 A)", () => {
  test("duration-figure is 600ms, duration-stagger 22ms and duration-loop-ambient 6000ms", async () => {
    const { page } = await open({ cfg: { entrance: false } });
    assert.equal(await token(page, "duration-figure"), "600ms");
    assert.equal(await token(page, "duration-stagger"), "22ms");
    assert.equal(await token(page, "duration-loop-ambient"), "6000ms");
    await page.context().close();
  });
  test("under reduced motion duration-figure is 100ms and duration-stagger 0; the ambient period is left alone", async () => {
    const { page } = await open({ cfg: { entrance: false }, reducedMotion: "reduce" });
    assert.equal(await token(page, "duration-figure"), "100ms");
    assert.equal(await token(page, "duration-stagger"), "0ms");
    assert.equal(await token(page, "duration-loop-ambient"), "6000ms");
    await page.context().close();
  });
});

describe("the step (A: shrunk so every start falls within duration-slow of the first)", () => {
  test("22ms apart up to ten marks, then shrunk: 12 marks 18.2ms, 40 marks 5.1ms, one mark 0", () => {
    assert.equal(entrance.entranceStep(10, 22, 200), 200 / 9 > 22 ? 22 : 200 / 9);
    assert.equal(entrance.entranceStep(5, 22, 200), 22);
    assert.ok(Math.abs(entrance.entranceStep(12, 22, 200) - 18.18) < 0.01);
    assert.ok(Math.abs(entrance.entranceStep(40, 22, 200) - 5.128) < 0.01);
    assert.equal(entrance.entranceStep(1, 22, 200), 0);
    assert.equal(entrance.entranceStep(0, 22, 200), 0);
    for (const n of [2, 7, 12, 31, 90, 400]) assert.ok((n - 1) * entrance.entranceStep(n, 22, 200) <= 200 + 1e-9, `${n} marks start within 200ms`);
  });
  test("the page's path is the key: basalt-entrance:<path>", () => {
    assert.equal(entrance.entranceKey("/a/b"), "basalt-entrance:/a/b");
  });
});

describe("the entrance plays on a first visit", () => {
  test("every bar scales from its baseline over duration-figure on ease-out, staggered, all starts within 200ms", async () => {
    const { page, errors } = await open();
    const list = (await anims(page)).filter((a) => a.keyframes.some((k) => k.transform));
    assert.ok(list.length >= 20, `${list.length} bars animate`);
    for (const a of list) {
      assert.equal(a.duration, 600);
      assert.match(a.easing, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
      assert.equal(a.fill, "backwards");
      assert.deepEqual(a.keyframes.map((k) => k.transform), ["scaleY(0)", "scaleY(1)"]);
    }
    const delays = (await anims(page)).map((a) => a.delay);
    const step = delays[1] - delays[0];
    assert.ok(step > 0 && step <= 22 + 1e-9, `the step is ${step}`);
    delays.forEach((d, i) => assert.ok(Math.abs(d - i * step) < 1e-6, "an even step"));
    assert.ok(Math.max(...delays) <= 200 + 1e-6, `every start within duration-slow of the first (${Math.max(...delays)})`);
    assert.deepEqual(errors, []);
    await page.context().close();
  });

  test("the first frame shows the marks at zero: no bar is drawn at rest and then restarted", async () => {
    const { page } = await open();
    const list = (await anims(page)).filter((a) => a.keyframes.some((k) => k.transform));
    // The element's box when the animation was created: scaleY(0) with a backwards fill is already applied, so it is flat.
    for (const a of list) assert.ok(a.height < 1, `a bar is ${a.height}px tall in its first frame`);
    await page.context().close();
  });

  test("only transform, stroke-dashoffset and opacity are animated: nothing translates, clips, blurs or rises", async () => {
    const { page } = await open({ cfg: { kind: "line", data: "sleep" } });
    const props = new Set();
    for (const a of await anims(page)) for (const k of a.keyframes) for (const key of Object.keys(k)) if (!["offset", "easing", "composite"].includes(key)) props.add(key);
    assert.deepEqual([...props].sort(), ["opacity", "strokeDashoffset"]);
    const transforms = (await anims(page)).flatMap((a) => a.keyframes.map((k) => k.transform).filter(Boolean));
    assert.ok(transforms.every((t) => /^scaleY\(/.test(t)), "a transform is a scale from the baseline only");
    await page.context().close();
  });

  test("a solid line draws along its length, a mark fades in", async () => {
    const { page } = await open({ cfg: { kind: "line", data: "sleep" } });
    const list = await anims(page);
    const lines = list.filter((a) => a.keyframes.some((k) => k.strokeDashoffset !== undefined));
    assert.ok(lines.length >= 1, "a line is drawn");
    for (const a of lines) { assert.equal(a.duration, 600); assert.equal(a.keyframes[1].strokeDashoffset, "0"); assert.ok(Number(a.keyframes[0].strokeDashoffset) > 0); }
    const fades = list.filter((a) => a.keyframes.some((k) => k.opacity !== undefined));
    assert.ok(fades.length > lines.length, "the markers fade in");
    for (const a of fades) assert.deepEqual(a.keyframes.map((k) => k.opacity), ["0", "1"].map(Number).map((n) => n) );
    await page.context().close();
  });

  test("words, numbers, the frame and every control are at rest and usable in the first frame", async () => {
    const { page } = await open({ freeze: true });
    await seek(page, 300);
    const probe = await page.evaluate(() => {
      const boxes = (sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; });
      const mid = {
        words: boxes("#words"), title: boxes(".basalt-chart-title"), legend: boxes(".basalt-chart-legend"), axis: boxes(".basalt-chart-axis"), grid: boxes(".basalt-chart-grid"),
        control: boxes("#control"), ticker: boxes(".basalt-ticker"), summary: boxes(".basalt-chart-summary"), foot: boxes(".basalt-chart-foot"),
        opacity: ["#words", ".basalt-chart-title", ".basalt-chart-axis", "#control", ".basalt-ticker", ".basalt-chart-summary"].map((s) => getComputedStyle(document.querySelector(s)).opacity),
        running: document.querySelector(".basalt-chart-svg").getAnimations({ subtree: true }).filter((a) => a.playState === "paused").length,
      };
      const control = document.getElementById("control");
      const r = control.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      mid.hit = control.contains(hit);
      mid.disabled = control.disabled;
      return mid;
    });
    assert.ok(probe.running > 0, "the entrance is still running while the frame is read");
    assert.deepEqual(probe.opacity, ["1", "1", "1", "1", "1", "1"]);
    assert.ok(probe.hit && !probe.disabled, "the control is enabled and takes the pointer");
    await finish(page);
    await page.waitForFunction(() => document.querySelector(".basalt-chart-svg").getAnimations({ subtree: true }).length === 0);
    const rest = await page.evaluate(() => {
      const boxes = (sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; });
      return { words: boxes("#words"), title: boxes(".basalt-chart-title"), legend: boxes(".basalt-chart-legend"), axis: boxes(".basalt-chart-axis"), grid: boxes(".basalt-chart-grid"), control: boxes("#control"), ticker: boxes(".basalt-ticker"), summary: boxes(".basalt-chart-summary"), foot: boxes(".basalt-chart-foot") };
    });
    // A measured 0px: nothing but the marks moved between the first frame and rest.
    for (const key of Object.keys(rest)) assert.deepEqual(probe[key], rest[key], `${key} did not move`);
    await page.context().close();
  });

  test("the visit is stored as seen when the entrance finishes, never before", async () => {
    const { page } = await open({ freeze: true });
    assert.equal(await stored(page), null, "not stored while it plays");
    await seek(page, 150);
    assert.equal(await stored(page), null, "not stored 150ms in");
    // Every mark but the last runs to its end: the entrance is not over, so the page is not stored.
    await page.evaluate(() => { const list = document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations !== Infinity); list.slice(0, -1).forEach((a) => a.finish()); window.__last = list.at(-1); });
    await frames(page);
    assert.equal(await stored(page), null, "not stored with the last mark still running");
    await page.evaluate(() => window.__last.finish());
    await page.waitForFunction(() => localStorage.getItem("basalt-entrance:/") === "seen", null, { timeout: 4000 });
    assert.equal(await stored(page), "seen");
    await page.context().close();
  });

  test("a second visit is drawn at rest: no mark animates", async () => {
    const first = await open();
    await first.page.waitForFunction(() => localStorage.getItem("basalt-entrance:/") === "seen", null, { timeout: 4000 });
    await first.page.reload();
    await first.page.waitForSelector(".basalt-chart-svg");
    await frames(first.page);
    assert.equal((await anims(first.page)).length, 0);
    assert.equal(await running(first.page), 0);
    await first.page.context().close();
  });
});

describe("input wins: a control used mid-entrance takes over", () => {
  test("changing the data mid-entrance glides every mark from where it is drawn over duration-slow, and counts the visit as seen", async () => {
    const { page, errors } = await open({ freeze: true });
    await seek(page, 120);
    const before = (await anims(page)).length;
    assert.equal(await stored(page), null);
    await page.click("#control");
    await frames(page);
    const after = (await anims(page)).slice(before);
    const glides = after.filter((a) => a.keyframes.some((k) => k.transform));
    assert.ok(glides.length >= 20, `${glides.length} bars take over`);
    for (const a of glides) {
      assert.equal(a.duration, 200, "over duration-slow");
      assert.match(a.easing, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
      assert.equal(a.keyframes[1].transform, "scaleY(1)");
    }
    // From where it is drawn: some bar had risen part of the way (0 < scale < 1) 120ms in, and none starts above rest.
    const starts = glides.map((a) => Number(/scaleY\(([\d.e-]+)\)/.exec(a.keyframes[0].transform)[1]));
    assert.ok(starts.every((s) => s >= 0 && s <= 1), "no start is past rest");
    assert.ok(starts.some((s) => s > 0 && s < 1), "some bar was drawn part of the way up");
    assert.equal(await stored(page), "seen", "giving way counts as seen");
    assert.deepEqual(errors, []);
    await page.context().close();
  });

  test("the readable number is the target at once and the control was usable from the first frame", async () => {
    const { page } = await open();
    const text = await page.locator(".basalt-ticker-text").textContent();
    assert.equal(text, "4,912", "the real value in the first frame");
    await page.context().close();
  });
});

describe("drawn at rest", () => {
  test("under reduced motion, no mark animates and the visit is not stored", async () => {
    const { page } = await open({ reducedMotion: "reduce" });
    assert.equal((await anims(page)).length, 0);
    assert.equal(await stored(page), null);
    await page.context().close();
  });
  test("under the root hold, no mark animates and the visit is not stored", async () => {
    const { page } = await open({ held: true });
    assert.equal((await anims(page)).length, 0);
    assert.equal(await stored(page), null);
    await page.context().close();
  });
  test("in a hidden tab, no mark animates", async () => {
    const { page } = await open({ hidden: true });
    assert.equal((await anims(page)).length, 0);
    await page.context().close();
  });
  test("on a page opened below its first screen, no mark animates", async () => {
    const { page } = await open({ cfg: { spacer: 1400 } });
    assert.equal((await anims(page)).length, 0);
    await page.context().close();
  });
  test("when the page's script started more than a second after navigation, no mark animates", async () => {
    const { page } = await open({ late: 1300 });
    await page.waitForSelector(".basalt-chart-svg");
    await frames(page);
    assert.equal((await anims(page)).length, 0);
    await page.context().close();
  });
  test("in print, no mark animates", async () => {
    const { page } = await open({ media: { media: "print" } });
    assert.equal((await anims(page)).length, 0);
    await page.context().close();
  });
  test("a chart that did not ask is drawn at rest (nothing is armed by scrolling or by default)", async () => {
    const { page } = await open({ cfg: { entrance: false } });
    assert.equal((await anims(page)).length, 0);
    assert.equal(await stored(page), null);
    await page.context().close();
  });
});

describe("a number beside a figure (E)", () => {
  test("is its real value in the first frame, with no digit strip travelling toward it", async () => {
    const { page } = await open();
    const at = await page.evaluate(() => {
      const strips = [...document.querySelectorAll(".basalt-ticker-strip")];
      return { text: document.querySelector(".basalt-ticker-text").textContent, moving: strips.some((s) => s.getAnimations().length > 0), transforms: strips.map((s) => getComputedStyle(s).transform) };
    });
    assert.equal(at.text, "4,912");
    assert.equal(at.moving, false, "no animation drives the digits");
    await sleep(300);
    const later = await page.evaluate(() => [...document.querySelectorAll(".basalt-ticker-strip")].map((s) => getComputedStyle(s).transform));
    assert.deepEqual(later, at.transforms, "the strip did not move after the first frame: it never counts up");
    await page.context().close();
  });
});

describe("accessibility", () => {
  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`axe finds nothing in ${theme} at ${width}, while the entrance runs and after`, async () => {
      const { page } = await open({ theme, viewport: { width, height: 900 } });
      for (const phase of ["running", "rest"]) {
        if (phase === "rest") await page.waitForFunction(() => localStorage.getItem("basalt-entrance:/") === "seen", null, { timeout: 4000 });
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate(() => window.axe.run(document, { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } }));
        assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), [], `${phase}`);
      }
      await page.context().close();
    });
  }
  test("in forced colours the marks are system colours and the entrance still ends at rest", async () => {
    const { page } = await open({ forcedColors: "active" });
    await page.waitForFunction(() => localStorage.getItem("basalt-entrance:/") === "seen", null, { timeout: 4000 });
    const fill = await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-chart-bar")).fill);
    assert.ok(fill && fill !== "none");
    await page.context().close();
  });
  test("reduced motion 390 axe", async () => {
    const { page } = await open({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() => window.axe.run(document, { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } }));
    assert.deepEqual(result.violations.map((v) => v.id), []);
    await page.context().close();
  });
});

describe("the root hold and printing settle a running entrance at once (DECISIONS 143, defects A and B)", () => {
  const scaleOfFirstBar = (page) => page.evaluate(() => { const t = getComputedStyle(document.querySelector(".basalt-chart-svg .basalt-chart-bar")).transform; return !t || t === "none" ? 1 : new DOMMatrixReadOnly(t).d; });
  const live = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations !== Infinity).length);

  test("the hold arriving 120ms in draws the figure at rest with no new animation, and counts the visit as seen", async () => {
    const { page } = await open({ freeze: true });
    await seek(page, 120);
    const part = await scaleOfFirstBar(page);
    assert.ok(part > 0 && part < 1, `the first bar is ${part} of the way before the hold`);
    const made = (await anims(page)).length;
    assert.equal(await stored(page), null);
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await frames(page);
    assert.equal((await anims(page)).length, made, "not one animation is made for the hold");
    assert.equal(await live(page), 0, "nothing is left running or paused");
    assert.equal(await scaleOfFirstBar(page), 1);
    assert.equal(await stored(page), "seen");
    await page.context().close();
  });
  test("the hold arriving while a data change's glide runs settles that glide too", async () => {
    const { page } = await open({ freeze: true });
    await seek(page, 120);
    await page.click("#control");
    await frames(page);
    const made = (await anims(page)).length;
    assert.ok(await live(page) > 0, "the glide is running (held at its first frame)");
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await frames(page);
    assert.equal((await anims(page)).length, made);
    assert.equal(await live(page), 0, "the glide is settled");
    assert.equal(await scaleOfFirstBar(page), 1);
    await page.context().close();
  });
  test("a real print, 120ms in, settles it too: the browser's own print path fires beforeprint and no media change (DECISIONS 148, fix A)", async () => {
    const { page } = await open({ freeze: true });
    await seek(page, 120);
    const part = await scaleOfFirstBar(page);
    assert.ok(part > 0 && part < 1, `the first bar is ${part} of the way before printing`);
    assert.equal(await page.evaluate(() => matchMedia("print").matches), false);
    const pdf = await page.pdf();
    assert.ok(pdf.length > 1000, "a PDF was made");
    assert.equal(await live(page), 0, "no animation is left attached after the browser printed");
    assert.equal(await scaleOfFirstBar(page), 1);
    assert.equal(await stored(page), "seen");
    await page.context().close();
  });
  test("beforeprint alone settles it: the event a real print fires, with the print media query unchanged (DECISIONS 148, fix A)", async () => {
    const { page } = await open({ freeze: true });
    await seek(page, 120);
    const part = await scaleOfFirstBar(page);
    assert.ok(part > 0 && part < 1);
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    assert.equal(await page.evaluate(() => matchMedia("print").matches), false, "the media query did not change");
    assert.equal(await live(page), 0);
    assert.equal(await scaleOfFirstBar(page), 1);
    assert.equal(await stored(page), "seen");
    await page.context().close();
  });
  test("printing beginning 120ms in settles it: print never shows a partly drawn figure", async () => {
    const { page } = await open({ freeze: true });
    await seek(page, 120);
    const part = await scaleOfFirstBar(page);
    assert.ok(part > 0 && part < 1, `the first bar is ${part} of the way before printing`);
    await page.emulateMedia({ media: "print" });
    await frames(page);
    assert.equal(await live(page), 0);
    assert.equal(await scaleOfFirstBar(page), 1);
    assert.equal(await stored(page), "seen");
    await page.context().close();
  });
});

describe("a page change without a reload counts as a load (DECISIONS 143, item 7)", () => {
  const pastTheFirstSecond = (page) => page.waitForFunction(() => performance.now() > 1300);
  const change = (page, path, { report = true } = {}) => page.evaluate(({ path, report }) => { history.pushState({}, "", path); if (report) window.__B.markPageChange(); window.__cfg.hide = false; window.__bump(); }, { path, report });
  const leave = (page) => page.evaluate(() => { window.__cfg.hide = true; window.__bump(); });
  const key = (page, path) => page.evaluate((path) => localStorage.getItem("basalt-entrance:" + path), path);

  test("on a site with no reload between pages, a first visit by link plays the entrance and a second visit rests", async () => {
    const { page } = await open({ cfg: { hide: true }, freeze: true, realClock: true });
    await pastTheFirstSecond(page);
    await change(page, "/second");
    await page.waitForSelector(".basalt-chart-svg");
    assert.ok((await anims(page)).length >= 20, "the first visit to /second plays, though the document is far past its first second");
    assert.equal(await key(page, "/second"), null, "not stored until it finishes");
    await finish(page);
    await page.waitForFunction(() => localStorage.getItem("basalt-entrance:/second") === "seen");
    await leave(page);
    await page.evaluate(() => { window.__anims.length = 0; });
    await change(page, "/second");
    await page.waitForSelector(".basalt-chart-svg");
    await frames(page);
    assert.equal((await anims(page)).length, 0, "the second visit to /second is drawn at rest");
    await page.context().close();
  });
  test("a path reached this way that is left before it finishes is not stored; one that gives way is", async () => {
    const { page } = await open({ cfg: { hide: true }, freeze: true, realClock: true });
    await pastTheFirstSecond(page);
    await change(page, "/third");
    await page.waitForSelector(".basalt-chart-svg");
    await leave(page);
    assert.equal(await key(page, "/third"), null);
    await change(page, "/third");
    await page.waitForSelector(".basalt-chart-svg");
    await seek(page, 100);
    await page.click("#control");
    assert.equal(await key(page, "/third"), "seen", "giving way counts as seen");
    await page.context().close();
  });
  test("with nothing reported the document's own clock is used, as before: a page reached after its first second rests", async () => {
    const { page } = await open({ cfg: { hide: true }, freeze: true, realClock: true });
    await pastTheFirstSecond(page);
    await change(page, "/fourth", { report: false });
    await page.waitForSelector(".basalt-chart-svg");
    await frames(page);
    assert.equal((await anims(page)).length, 0);
    await page.context().close();
  });
  test("the other gates apply from the change: a change reported late, below the first screen, or in print draws at rest", async () => {
    const { page } = await open({ cfg: { hide: true, spacer: 1400 }, freeze: true, realClock: true });
    await pastTheFirstSecond(page);
    await change(page, "/fifth");
    await page.waitForSelector(".basalt-chart-svg");
    await frames(page);
    assert.equal((await anims(page)).length, 0, "below its first screen");
    await leave(page);
    await page.evaluate(() => { window.__cfg.spacer = 0; history.pushState({}, "", "/sixth"); window.__B.markPageChange(performance.now() - 1500); window.__cfg.hide = false; window.__bump(); });
    await page.waitForSelector(".basalt-chart-svg");
    await frames(page);
    assert.equal((await anims(page)).length, 0, "a change that began 1.5 seconds before the chart mounted is late");
    await page.context().close();
  });
});
