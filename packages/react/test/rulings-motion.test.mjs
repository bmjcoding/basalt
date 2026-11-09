// The motion rulings: main's scale and curves, reduced motion, the braille spinner, the glide, the drain
// and the travelling spinner. Driven in Chromium against the built package with the real stylesheet.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const token = (page, name) => page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(`--basalt-${name}`).trim(), name);

describe("the motion tokens", () => {
  test("main's scale and curves, nothing else: 0, 100, 150, 200, 300ms; out, in, in-out, linear", async () => {
    const { page } = await fixturePage(browser, render(`<B.Button>Go</B.Button>`));
    assert.deepEqual(await Promise.all(["instant", "fast", "base", "slow", "slower"].map((n) => token(page, `duration-${n}`))), ["0ms", "100ms", "150ms", "200ms", "300ms"]);
    assert.deepEqual(await Promise.all(["out", "in", "in-out", "linear"].map((n) => token(page, `ease-${n}`))), ["cubic-bezier(0.16, 1, 0.3, 1)", "cubic-bezier(0.4, 0, 1, 1)", "cubic-bezier(0.65, 0, 0.35, 1)", "cubic-bezier(0, 0, 1, 1)"]);
    for (const gone of ["duration-press", "duration-pop", "duration-plate", "duration-tick", "duration-grid", "duration-caret", "ease-standard", "ease-decelerate", "ease-accelerate", "ease-settle"]) {
      assert.equal(await token(page, gone), "", `--basalt-${gone} is back`);
    }
    // loops are grouped apart from the scale
    assert.deepEqual(await Promise.all(["ring", "braille", "fade"].map((n) => token(page, `duration-loop-${n}`))), ["640ms", "530ms", "1200ms"]);
    await page.close();
  });

  test("reduced motion clamps base, slow and slower to 100ms and leaves the rest, loops included", async () => {
    const { page } = await fixturePage(browser, render(`<B.Button>Go</B.Button>`));
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.deepEqual(await Promise.all(["fast", "base", "slow", "slower"].map((n) => token(page, `duration-${n}`))), ["100ms", "100ms", "100ms", "100ms"]);
    assert.deepEqual(await Promise.all(["ring", "braille", "fade"].map((n) => token(page, `duration-loop-${n}`))), ["640ms", "530ms", "1200ms"]);
    await page.close();
  });

  test("no component CSS names a deleted token, and there is no caret blink", async () => {
    const { page } = await fixturePage(browser, render(`<><B.Input aria-label="Name" /><B.Textarea aria-label="Notes" /></>`));
    const css = await page.evaluate(() => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).map((rule) => rule.cssText).join("\n"));
    assert.doesNotMatch(css, /--basalt-(?:duration-(?:press|pop|plate|tick|grid|caret)|ease-(?:standard|decelerate|accelerate|settle))/);
    assert.doesNotMatch(css, /basalt-caret/);
    assert.equal(await page.locator(".basalt-input").first().evaluate((el) => getComputedStyle(el).animationName), "none", "the native caret is left alone");
    assert.equal(await page.locator(".basalt-textarea").evaluate((el) => getComputedStyle(el).animationName), "none");
    await page.close();
  });
});

describe("the spinners", () => {
  test("the ring is the default and the only other variant is braille", async () => {
    const { page } = await fixturePage(browser, render(`<><B.Spinner label="Ring" /><B.Spinner variant="braille" label="Braille" /><B.Button loading>Saving</B.Button></>`));
    assert.equal(await page.getByRole("status", { name: "Ring" }).getAttribute("data-variant"), "ring");
    assert.equal(await page.getByRole("status", { name: "Braille" }).getAttribute("data-variant"), "braille");
    assert.equal(await page.locator(".basalt-button .basalt-spinner").getAttribute("data-variant"), "ring", "a loading button shows the ring");
    const ring = await page.getByRole("status", { name: "Ring" }).locator("svg").evaluate((el) => ({ name: getComputedStyle(el).animationName, duration: getComputedStyle(el).animationDuration, ease: getComputedStyle(el).animationTimingFunction }));
    assert.deepEqual(ring, { name: "basalt-spin", duration: "0.64s", ease: "cubic-bezier(0, 0, 1, 1)" });
    const css = await page.evaluate(() => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).map((rule) => rule.cssText).join("\n"));
    assert.doesNotMatch(css, /data-variant="(?:dots|grid)"/);
    await page.close();
  });

  test("braille is Basalt's own 2 by 4 dot matrix, and steps through the ten frames in 530ms", async () => {
    const { page } = await fixturePage(browser, render(`<B.Spinner variant="braille" label="Loading" size={24} />`));
    const spinner = page.getByRole("status", { name: "Loading" });
    const shape = await spinner.locator("svg").evaluate((svg) => ({ dots: svg.querySelectorAll("circle").length, columns: new Set([...svg.querySelectorAll("circle")].map((c) => c.getAttribute("cx"))).size, rows: new Set([...svg.querySelectorAll("circle")].map((c) => c.getAttribute("cy"))).size, text: svg.textContent }));
    assert.deepEqual(shape, { dots: 8, columns: 2, rows: 4, text: "" }, "an SVG of dots, not a text glyph");
    const timing = await spinner.locator("[data-dot='1']").evaluate((el) => ({ duration: getComputedStyle(el).animationDuration, ease: getComputedStyle(el).animationTimingFunction, count: getComputedStyle(el).animationIterationCount }));
    assert.deepEqual(timing, { duration: "0.53s", ease: "steps(1)", count: "infinite" }, "step-end, which Chromium writes as steps(1)");
    // frame by frame: ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
    const FRAMES = [[1, 2, 4], [1, 4, 5], [1, 4, 5, 6], [4, 5, 6], [3, 4, 5, 6], [3, 5, 6], [2, 3, 6], [1, 2, 3, 6], [1, 2, 3], [1, 2, 3, 4]];
    const seen = [];
    for (let frame = 0; frame < 10; frame++) {
      seen.push(await page.evaluate((frame) => {
        for (const a of document.getAnimations()) { a.pause(); a.currentTime = frame * 53 + 26; }
        return [...document.querySelectorAll(".basalt-spinner-dot")].filter((c) => getComputedStyle(c).opacity === "1").map((c) => Number(c.dataset.dot)).sort();
      }, frame));
    }
    assert.deepEqual(seen, FRAMES);
    await page.close();
  });

  test("reduced motion: the ring fades instead of turning, and braille holds its first frame", async () => {
    const { page } = await fixturePage(browser, render(`<><B.Spinner label="Ring" /><B.Spinner variant="braille" label="Braille" /></>`));
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await page.getByRole("status", { name: "Ring" }).locator("svg").evaluate((el) => getComputedStyle(el).animationName), "basalt-pulse");
    const lit = await page.getByRole("status", { name: "Braille" }).evaluate((el) => [...el.querySelectorAll(".basalt-spinner-dot")].filter((c) => getComputedStyle(c).opacity === "1").map((c) => Number(c.dataset.dot)).sort());
    assert.deepEqual(lit, [1, 2, 4]);
    assert.equal(await page.getByRole("status", { name: "Braille" }).locator("[data-dot='1']").evaluate((el) => getComputedStyle(el).animationName), "none");
    await page.close();
  });
});

describe("NumberTicker under reduced motion", () => {
  const row = `<div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 24, fontFamily: "Geist Mono, monospace" }}><span id="ref">Runs</span><B.NumberTicker value={1284.5} /></div>`;
  const measure = (page) => page.evaluate(() => {
    const ticker = document.querySelector(".basalt-ticker").getBoundingClientRect();
    const ref = document.getElementById("ref").getBoundingClientRect();
    return { width: ticker.width, bottom: ticker.bottom - ref.bottom, top: ticker.top - ref.top };
  });

  test("it is plain tabular text with the same width and baseline as the strip, and still reads and copies as the number", async () => {
    const { page } = await fixturePage(browser, render(row));
    await settle(page);
    const rolling = await measure(page);
    assert.equal(await page.locator(".basalt-ticker-text").evaluate((el) => getComputedStyle(el).position), "absolute", "hidden while the strip is drawn");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page);
    const plain = await measure(page);
    assert.ok(Math.abs(plain.width - rolling.width) < 0.5, `width ${rolling.width} became ${plain.width}`);
    assert.ok(Math.abs(plain.bottom - rolling.bottom) < 0.5 && Math.abs(plain.top - rolling.top) < 0.5, `the baseline moved: ${JSON.stringify({ rolling, plain })}`);
    const shown = await page.evaluate(() => {
      const text = document.querySelector(".basalt-ticker-text");
      const visual = document.querySelector(".basalt-ticker-visual");
      return { text: text.textContent, textDisplay: getComputedStyle(text).display, textWidth: text.getBoundingClientRect().width, visual: getComputedStyle(visual).display, tabular: getComputedStyle(text).fontVariantNumeric };
    });
    assert.equal(shown.text, "1,284.5");
    assert.ok(shown.textWidth > 20 && shown.visual === "none");
    assert.match(shown.tabular, /tabular-nums/);
    await page.close();
  });
});

describe("Sparkline", () => {
  const fixture = `function App(){const [d,sd]=React.useState([10,20,50]);window.set=sd;return <B.Sparkline label="Runs" data={d} />}
    createRoot(document.getElementById("root")).render(<App/>);`;
  const axis = (page) => page.locator(".basalt-sparkline-axis span[aria-hidden]").textContent();
  const shownPoints = (page) => page.locator(".basalt-sparkline-line").getAttribute("points");

  test("the scale eases over slow on ease-out, never in 8% steps, and lands on the target", async () => {
    const { page } = await fixturePage(browser, fixture);
    await settle(page);
    assert.equal(await axis(page), "50");
    // a smaller peak: the scale eases in; the readable label is the target at once
    await page.evaluate(() => window.set([10, 20, 20]));
    assert.equal(await page.locator(".basalt-sparkline-axis .basalt-visually-hidden").textContent(), "20", "the accessible value is the target");
    const samples = await page.evaluate(async () => {
      const out = [];
      const start = performance.now();
      while (performance.now() - start < 320) {
        out.push([Math.round(performance.now() - start), Number(document.querySelector(".basalt-sparkline-axis span[aria-hidden]").textContent)]);
        await new Promise((r) => requestAnimationFrame(r));
      }
      return out;
    });
    assert.ok(samples.some(([, v]) => v > 20 && v < 50), "it passes through in-between values");
    const midway = samples.filter(([t]) => t >= 90 && t <= 110).map(([, v]) => v);
    assert.ok(midway.length && midway.every((v) => v < 29), `ease-out has covered most of the distance by 100ms (${midway})`);
    assert.equal(samples.at(-1)[1], 20, "it has landed");
    const landed = samples.find(([, v]) => v === 20);
    // the label is whole numbers, so it reads 20 a little before the curve's last half unit: well inside 200ms, and nothing like a per-frame lerp's second-long tail
    assert.ok(landed[0] >= 100 && landed[0] <= 260, `it lands within the slow duration (${landed[0]}ms)`);
    await page.close();
  });

  test("a new peak widens the scale at once, so it is never clipped", async () => {
    const { page } = await fixturePage(browser, fixture);
    await settle(page);
    await page.evaluate(() => window.set([10, 20, 400]));
    await page.waitForTimeout(30);
    assert.equal(await axis(page), "400");
    await page.close();
  });

  test("reduced motion snaps the line, the scale and the labels", async () => {
    const { page } = await fixturePage(browser, fixture);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page);
    const before = await shownPoints(page);
    await page.evaluate(() => window.set([10, 20, 20]));
    await page.waitForTimeout(40);
    assert.equal(await axis(page), "20");
    assert.notEqual(await shownPoints(page), before);
    assert.equal(await page.locator(".basalt-sparkline-head .basalt-ticker-text").textContent(), "20", "the headline is the plain target");
    await page.close();
  });

  test("the headline eases with the scale, and what is read is the target", async () => {
    const { page } = await fixturePage(browser, fixture);
    await settle(page);
    await page.evaluate(() => window.set([10, 20, 20]));
    assert.equal(await page.locator(".basalt-sparkline-head .basalt-visually-hidden").textContent(), "20");
    const seen = await page.evaluate(async () => {
      const digits = () => [...document.querySelectorAll(".basalt-sparkline-head .basalt-ticker-digit")].map((d) => d.style.getPropertyValue("--_d")).join("");
      const out = new Set();
      const start = performance.now();
      while (performance.now() - start < 260) { out.add(digits()); await new Promise((r) => requestAnimationFrame(r)); }
      return [...out];
    });
    assert.ok(seen.length > 2, `the digits eased through ${seen}`);
    assert.equal(seen.at(-1), "20");
    await page.close();
  });
});

describe("the sparkline headline has one clock", () => {
  const fixture = `function App(){const[d,s]=React.useState([10,20,50]);window.set=s;return <B.Sparkline label="Runs" data={d}/>}
    createRoot(document.getElementById("root")).render(<App/>);`;

  test("what is drawn is where the glide puts it: no digit strip is mid-transition, and none outlasts the glide", async () => {
    const { page } = await fixturePage(browser, fixture);
    await settle(page);
    const samples = await page.evaluate(async () => {
      window.set([10, 20, 20]);
      const out = [];
      const start = performance.now();
      while (performance.now() - start < 420) {
        const ms = performance.now() - start;
        const strips = [...document.querySelectorAll(".basalt-sparkline-head .basalt-ticker-digit")].map((digit) => {
          const strip = digit.firstElementChild;
          const drawn = -new DOMMatrix(getComputedStyle(strip).transform).m42 / parseFloat(getComputedStyle(digit).fontSize);
          return Math.abs(drawn - Number(digit.style.getPropertyValue("--_d")));
        });
        out.push({ ms: Math.round(ms), off: Math.max(0, ...strips), transitions: document.getAnimations().filter((a) => a.transitionProperty === "transform").length });
        await new Promise((r) => requestAnimationFrame(r));
      }
      return out;
    });
    assert.ok(samples.length > 10);
    for (const sample of samples) {
      assert.equal(sample.transitions, 0, `a transform transition is running at ${sample.ms}ms`);
      assert.ok(sample.off < 0.01, `a digit is ${sample.off} digits from its target at ${sample.ms}ms`);
    }
    await page.close();
  });

  test("the ordinary ticker still rolls its digits", async () => {
    const { page } = await fixturePage(browser, `function App(){const[n,s]=React.useState(10);window.set=s;return <B.NumberTicker value={n}/>}
      createRoot(document.getElementById("root")).render(<App/>);`);
    await settle(page);
    await page.evaluate(() => window.set(29));
    await page.waitForTimeout(40);
    assert.ok(await page.evaluate(() => document.getAnimations().some((a) => a.transitionProperty === "transform")), "an ordinary ticker transitions its strip");
    await page.close();
  });
});

describe("the toast drain", () => {
  const toasts = `function Show(){const t=B.useToast();React.useEffect(()=>{t.show({title:"Saved",timeout:5000})},[t]);return null}
    createRoot(document.getElementById("root")).render(<B.ToastProvider><Show/></B.ToastProvider>);`;

  test("it is 1px, on the bottom rim's straight part, and the toast is not clipped", async () => {
    const { page } = await fixturePage(browser, toasts, { theme: "dark" });
    await page.locator(".basalt-toast-drain").waitFor();
    await settle(page);
    const g = await page.evaluate(() => {
      const toast = document.querySelector(".basalt-toast");
      const drain = document.querySelector(".basalt-toast-drain");
      const t = toast.getBoundingClientRect();
      const d = drain.getBoundingClientRect();
      const s = getComputedStyle(drain);
      // offsets are from the toast's padding box, which is inside its 1px rim
      return { height: d.height, overBottomRim: Math.abs(d.bottom - t.bottom), left: parseFloat(s.left) + parseFloat(getComputedStyle(toast).borderLeftWidth), right: parseFloat(s.right) + parseFloat(getComputedStyle(toast).borderRightWidth), colour: s.backgroundColor, overflow: getComputedStyle(toast).overflow, bottom: s.bottom, clip: getComputedStyle(toast).clipPath };
    });
    assert.equal(g.height, 1);
    assert.ok(g.overBottomRim < 0.01, "the line is drawn over the bottom edge");
    assert.equal(g.bottom, "-1px");
    assert.ok(g.left === 12 && g.right === 12, `it starts where the 12px corner ends, measured from the outer edge (${g.left}, ${g.right})`);
    assert.equal(g.overflow, "visible");
    assert.equal(g.clip, "none");
    const tertiary = await page.evaluate(() => { const p = document.createElement("div"); p.style.backgroundColor = "var(--basalt-text-tertiary)"; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c; });
    assert.equal(g.colour, tertiary);
    await page.close();
  });

  test("under reduced motion it is not drawn at all", async () => {
    const { page } = await fixturePage(browser, toasts);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".basalt-toast").waitFor();
    assert.equal(await page.locator(".basalt-toast-drain").evaluate((el) => getComputedStyle(el).display), "none");
    await page.close();
  });
});

describe("TravelSpinner", () => {
  const fixture = `function App(){const a=React.useRef(null);const b=React.useRef(null);const [on,so]=React.useState(false);window.go=()=>so(true);
    return <div style={{ display: "flex", justifyContent: "space-between", width: 600 }}><span ref={a} id="from">from</span><span ref={b} id="to">to</span><B.TravelSpinner active={on} fromRef={a} toRef={b} /></div>}
    createRoot(document.getElementById("root")).render(<App/>);`;
  const centre = (el) => el.evaluate((node) => { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });

  test("it travels by transform on slower, ease-in-out, from one anchor to the other", async () => {
    const { page } = await fixturePage(browser, fixture);
    await page.evaluate(() => window.go());
    const travel = page.locator(".basalt-travel");
    await travel.waitFor();
    const a = await travel.evaluate((el) => { const s = getComputedStyle(el); const [anim] = el.getAnimations(); return { name: s.animationName, duration: s.animationDuration, ease: s.animationTimingFunction, left: s.left, top: s.top, props: anim?.effect.getKeyframes().map((k) => Object.keys(k).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p))) }; });
    assert.deepEqual([a.name, a.duration, a.ease, a.left, a.top], ["basalt-travel", "0.3s", "cubic-bezier(0.65, 0, 0.35, 1)", "0px", "0px"]);
    assert.ok(a.props.flat().every((p) => p === "transform"), `it animates ${a.props.flat()}`);
    const start = await centre(travel);
    const from = await centre(page.locator("#from"));
    assert.ok(Math.abs(start.x - from.x) < 40, `it starts at the first anchor (${start.x} against ${from.x})`);
    await settle(page);
    const end = await centre(travel);
    const to = await centre(page.locator("#to"));
    assert.ok(Math.abs(end.x - to.x) < 1 && Math.abs(end.y - to.y) < 1, `it ends on the second (${end.x}, ${end.y}) against (${to.x}, ${to.y})`);
    await page.close();
  });

  test("under reduced motion it does not travel: it is at the destination, with the 100ms fade", async () => {
    const { page } = await fixturePage(browser, fixture);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.go());
    const travel = page.locator(".basalt-travel");
    await travel.waitFor();
    const a = await travel.evaluate((el) => { const s = getComputedStyle(el); return { name: s.animationName, duration: s.animationDuration }; });
    assert.deepEqual(a, { name: "basalt-fade-in", duration: "0.1s" });
    const at = await centre(travel);
    const to = await centre(page.locator("#to"));
    assert.ok(Math.abs(at.x - to.x) < 1 && Math.abs(at.y - to.y) < 1, `it appears at the destination from the first frame (${at.x}) against (${to.x})`);
    await page.close();
  });
});

describe("MorphIcon", () => {
  test("the whole core set, with a 2.25 stroke, morphing on slow ease-out", async () => {
    const { GLYPHS, NAMES } = await import("../glyphs/source.mjs");
    const actions = NAMES.filter((name) => !GLYPHS[name].board && !GLYPHS[name].nav);
    const { page } = await fixturePage(browser, `window.morph = (name) => createRoot(document.getElementById("root")).render(<B.MorphIcon name={name} />);`);
    for (const name of actions) {
      await page.evaluate((name) => window.morph(name), name);
      await page.locator(`.basalt-morph[data-icon="${name}"]`).waitFor();
    }
    assert.equal(await page.locator(".basalt-morph g[stroke='currentColor']").first().getAttribute("stroke-width"), "2.25");
    const { morphNames } = await import("../dist/glyph-names.js");
    assert.deepEqual([...morphNames()].sort(), [...actions].sort(), "MorphIcon takes the core actions by name");
    const timing = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return [s.getPropertyValue("--basalt-duration-slow").trim(), s.getPropertyValue("--basalt-ease-out").trim()]; });
    assert.deepEqual(timing, ["200ms", "cubic-bezier(0.16, 1, 0.3, 1)"], "the morph reads these tokens (glideTiming)");
    await page.close();
  });
});
