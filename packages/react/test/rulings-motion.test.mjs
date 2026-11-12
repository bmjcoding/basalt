// The motion rulings: main's scale and curves, reduced motion, the braille spinner, the glide, the drain
// and the travelling spinner. Driven in Chromium against the built package with the real stylesheet.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const litDotsIn = (root) => [...root.querySelectorAll(".basalt-spinner-dot")].filter((c) => getComputedStyle(c).opacity === "1").map((c) => Number(c.dataset.dot)).sort();
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
    assert.deepEqual(await Promise.all(["ring", "braille", "fade"].map((n) => token(page, `duration-loop-${n}`))), ["640ms", "800ms", "1200ms"]);
    await page.close();
  });

  test("reduced motion clamps base, slow and slower to 100ms and leaves the rest, loops included", async () => {
    const { page } = await fixturePage(browser, render(`<B.Button>Go</B.Button>`));
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.deepEqual(await Promise.all(["fast", "base", "slow", "slower"].map((n) => token(page, `duration-${n}`))), ["100ms", "100ms", "100ms", "100ms"]);
    assert.deepEqual(await Promise.all(["ring", "braille", "fade"].map((n) => token(page, `duration-loop-${n}`))), ["640ms", "800ms", "1200ms"]);
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

  // The ten frames ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ as the dots each one lights.
  const FRAMES = [[1, 2, 4], [1, 4, 5], [1, 4, 5, 6], [4, 5, 6], [3, 4, 5, 6], [3, 5, 6], [2, 3, 6], [1, 2, 3, 6], [1, 2, 3], [1, 2, 3, 4]];

  test("braille is Basalt's own six-dot cell: six circles in a 6 by 10 box, no dots 7 or 8", async () => {
    const { page } = await fixturePage(browser, render(`<B.Spinner variant="braille" label="Loading" />`));
    const shape = await page.getByRole("status", { name: "Loading" }).locator("svg").evaluate((svg) => ({
      viewBox: svg.getAttribute("viewBox"),
      text: svg.textContent,
      dots: [...svg.querySelectorAll("circle")].map((c) => ({ dot: Number(c.dataset.dot), cx: Number(c.getAttribute("cx")), cy: Number(c.getAttribute("cy")), r: Number(c.getAttribute("r")) })),
    }));
    assert.equal(shape.viewBox, "0 0 6 10");
    assert.equal(shape.text, "", "an SVG of dots, not a text glyph");
    assert.deepEqual(shape.dots, [
      { dot: 1, cx: 1, cy: 1, r: 1 }, { dot: 2, cx: 1, cy: 5, r: 1 }, { dot: 3, cx: 1, cy: 9, r: 1 },
      { dot: 4, cx: 5, cy: 1, r: 1 }, { dot: 5, cx: 5, cy: 5, r: 1 }, { dot: 6, cx: 5, cy: 9, r: 1 },
    ]);
    await page.close();
  });

  test("braille steps through the ten frames on duration-loop-braille, hard step-end, and an unlit dot is not drawn", async () => {
    const { page } = await fixturePage(browser, render(`<B.Spinner variant="braille" label="Loading" />`));
    const spinner = page.getByRole("status", { name: "Loading" });
    assert.equal(await token(page, "duration-loop-braille"), "800ms");
    const timing = await spinner.locator("[data-dot='1']").evaluate((el) => ({ duration: getComputedStyle(el).animationDuration, ease: getComputedStyle(el).animationTimingFunction, count: getComputedStyle(el).animationIterationCount }));
    assert.deepEqual(timing, { duration: "0.8s", ease: "steps(1)", count: "infinite" }, "800ms on the token, step-end, which Chromium writes as steps(1)");
    const seen = [];
    for (let frame = 0; frame < 10; frame++) {
      seen.push(await page.evaluate(([frame, fn]) => {
        for (const a of document.getAnimations()) { a.pause(); a.currentTime = frame * 80 + 40; }
        const dots = [...document.querySelectorAll(".basalt-spinner-dot")];
        if (!dots.every((c) => ["0", "1"].includes(getComputedStyle(c).opacity))) throw new Error("a dot is neither drawn (1) nor not drawn (0)");
        return new Function("root", `return (${fn})(root)`)(document);
      }, [frame, litDotsIn.toString()]));
    }
    assert.deepEqual(seen, FRAMES);
    await page.close();
  });

  test("braille sizes are whole pixels: 16 is 6 by 10, 20 is 9 by 15, 24 is 12 by 20", async () => {
    const { page } = await fixturePage(browser, render(`<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24 }}>{[16, 20, 24].map((s) => <B.Spinner key={s} variant="braille" size={s} label={"Size " + s} />)}</div>`));
    const sizes = {};
    for (const size of [16, 20, 24]) {
      sizes[size] = await page.getByRole("status", { name: `Size ${size}` }).evaluate((root) => {
        const svg = root.querySelector("svg").getBoundingClientRect();
        const edges = [...root.querySelectorAll("circle")].flatMap((c) => { const r = c.getBoundingClientRect(); return [r.left - svg.left, r.right - svg.left, r.top - svg.top, r.bottom - svg.top]; });
        const dot = root.querySelector("circle").getBoundingClientRect();
        return { w: svg.width, h: svg.height, rootW: root.getBoundingClientRect().width, rootH: root.getBoundingClientRect().height, whole: edges.every((e) => Math.abs(e - Math.round(e)) < 0.01), dot: dot.width };
      });
    }
    assert.deepEqual(sizes, {
      16: { w: 6, h: 10, rootW: 6, rootH: 10, whole: true, dot: 2 },
      20: { w: 9, h: 15, rootW: 9, rootH: 15, whole: true, dot: 3 },
      24: { w: 12, h: 20, rootW: 12, rootH: 20, whole: true, dot: 4 },
    }, "the square size box no longer applies to braille");
    await page.close();
  });

  test("braille takes its word's colour; the ring keeps text-secondary", async () => {
    const { page } = await fixturePage(browser, render(`<div style={{ color: "rgb(12, 34, 56)" }}><B.Spinner variant="braille" label="Braille" /> Running <B.Spinner label="Ring" /><i id="probe" style={{ color: "var(--basalt-text-secondary)" }} /></div>`));
    const color = (name) => page.getByRole("status", { name }).evaluate((el) => getComputedStyle(el).color);
    assert.equal(await color("Braille"), "rgb(12, 34, 56)");
    assert.equal(await page.getByRole("status", { name: "Braille" }).locator("circle").first().evaluate((el) => getComputedStyle(el).fill), "rgb(12, 34, 56)");
    const secondary = await page.locator("#probe").evaluate((el) => getComputedStyle(el).color);
    assert.notEqual(secondary, "rgb(12, 34, 56)");
    assert.equal(await color("Ring"), secondary);
    await page.close();
  });

  test("beside a word, braille takes the status dot's seat and gap, so the words start at one x and the centres match", async () => {
    // The finished statuses are the plain Badge: its 6px dot, its gap, the word. Running reuses that Badge's layout with braille in the dot's seat.
    const dotRow = `<div data-row style={{ height: 20, fontSize: 14, lineHeight: "20px" }}><B.Badge variant="plain" status="success">Passed</B.Badge></div>`;
    const runRow = `<div data-row style={{ height: 20, fontSize: 14, lineHeight: "20px" }}><span className="basalt-badge" data-variant="plain" data-status="neutral"><B.Spinner variant="braille" />Running</span></div>`;
    for (const theme of ["light", "dark"]) {
      const { page } = await fixturePage(browser, render(`<div style={{ width: 240 }}>${dotRow}${runRow}</div>`), { theme });
      const [dot, braille] = await page.evaluate(() => [...document.querySelectorAll("[data-row]")].map((row) => {
        const text = [...row.querySelector(".basalt-badge").childNodes].find((n) => n.nodeType === 3);
        const range = document.createRange();
        range.selectNodeContents(text);
        const mark = (row.querySelector(".basalt-badge-dot") ?? row.querySelector("svg")).getBoundingClientRect();
        return { wordX: range.getBoundingClientRect().left, centre: mark.top + mark.height / 2 - row.getBoundingClientRect().top, width: mark.width };
      }));
      assert.equal(braille.width, dot.width, `${theme}: the mark is as wide as the 6px dot`);
      assert.ok(Math.abs(braille.wordX - dot.wordX) < 0.01, `${theme}: words start at ${dot.wordX} and ${braille.wordX}`);
      assert.ok(Math.abs(braille.centre - dot.centre) <= 0.5, `${theme}: centres ${dot.centre} and ${braille.centre}`);
      await page.close();
    }
  });

  for (const scheme of ["dark", "light"]) {
    test(`forced colours (${scheme} palette): the dots are the system ink of their surface, even under the other authored theme`, async () => {
      for (const theme of ["light", "dark"]) {
        const { page } = await fixturePage(browser, render(`<div id="surface" style={{ background: "var(--basalt-surface-page)", color: "var(--basalt-text-primary)" }}><B.Spinner variant="braille" label="Running" /> Running</div>`), { theme, forcedColors: "active", colorScheme: scheme });
        const read = await page.evaluate(() => {
          const surface = document.getElementById("surface");
          const dot = surface.querySelector(".basalt-spinner-dot[data-lit]");
          return { fill: getComputedStyle(dot).fill, word: getComputedStyle(surface).color, canvas: getComputedStyle(surface).backgroundColor, adjust: getComputedStyle(dot).forcedColorAdjust };
        });
        const ink = scheme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
        const canvas = scheme === "dark" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
        assert.equal(read.fill, ink, `${scheme} palette, authored ${theme}: the dots are ${read.fill}, not system ink`);
        assert.equal(read.fill, read.word, "the dots match their word");
        assert.equal(read.canvas, canvas);
        assert.notEqual(read.adjust, "none", "the browser's own forced-colours fix is not switched off");
        await page.close();
      }
    });
  }

  test("reduced motion: the ring fades instead of turning, and braille holds ⠋ with no running animation", async () => {
    const { page } = await fixturePage(browser, render(`<><B.Spinner label="Ring" /><B.Spinner variant="braille" label="Braille" /></>`));
    await page.emulateMedia({ reducedMotion: "reduce" });
    const ring = page.getByRole("status", { name: "Ring" });
    assert.equal(await ring.locator("svg").evaluate((el) => getComputedStyle(el).animationName), "basalt-pulse");
    assert.equal(await ring.locator("svg").evaluate((el) => getComputedStyle(el).animationDuration), "1.2s", "the ring keeps its fade on duration-loop-fade");
    assert.equal(await ring.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length), 1);
    const braille = page.getByRole("status", { name: "Braille" });
    assert.deepEqual(await braille.evaluate(litDotsIn), [1, 2, 4]);
    assert.equal(await braille.locator("[data-dot='1']").evaluate((el) => getComputedStyle(el).animationName), "none");
    assert.equal(await braille.evaluate((el) => el.getAnimations({ subtree: true }).length), 0, "nothing runs");
    assert.deepEqual(await braille.locator(".basalt-spinner-dot").evaluateAll((dots) => dots.map((c) => getComputedStyle(c).opacity)), ["1", "1", "0", "1", "0", "0"], "unlit dots are not drawn");
    await page.close();
  });

  test("spinners share one clock: two mounted 300ms apart are in phase, each variant on its own period", async () => {
    const { page } = await fixturePage(browser, render(`(() => {
      function App() {
        const [more, setMore] = React.useState(false);
        window.addMore = () => flushSync(() => setMore(true));
        return <><B.Spinner variant="braille" label="B1" /><B.Spinner label="R1" />{more ? <><B.Spinner variant="braille" label="B2" /><B.Spinner label="R2" /></> : null}</>;
      }
      return <App />;
    })()`));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.addMore());
    const read = await page.evaluate(() => {
      const phase = (name) => {
        const root = document.querySelector(`[aria-label="${name}"]`);
        return root.getAnimations({ subtree: true }).map((a) => ({ period: a.effect.getComputedTiming().duration, at: Number(a.currentTime) % a.effect.getComputedTiming().duration }));
      };
      return { b1: phase("B1"), b2: phase("B2"), r1: phase("R1"), r2: phase("R2") };
    });
    const apart = (a, b) => { const d = Math.abs(a.at - b.at); return Math.min(d, a.period - d); };
    assert.equal(read.b1.length, 6);
    assert.equal(read.r1.length, 1);
    assert.deepEqual([read.b1[0].period, read.r1[0].period], [800, 640], "each variant keeps its own period");
    read.b1.forEach((a, i) => assert.ok(apart(a, read.b2[i]) < 1, `braille dot ${i + 1} is ${apart(a, read.b2[i])}ms out of phase`));
    assert.ok(apart(read.r1[0], read.r2[0]) < 1, `the ring is ${apart(read.r1[0], read.r2[0])}ms out of phase`);
    // and what is on screen is the same frame
    const lit = await page.evaluate((fn) => { for (const a of document.getAnimations()) a.pause(); return ["B1", "B2"].map((n) => new Function("root", `return (${fn})(root)`)(document.querySelector(`[aria-label="${n}"]`))); }, litDotsIn.toString());
    assert.deepEqual(lit[0], lit[1]);
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

// The glide steps on requestAnimationFrame and performance.now, so these tests use Playwright's clock: time moves only when
// `frames` runs it, 16ms a frame, and what is read at "100ms" is what the glide drew at 100ms on any machine at any load.
const flushReact = (page) => page.evaluate(() => new Promise((resolve) => { const channel = new MessageChannel(); channel.port1.onmessage = () => resolve(); channel.port2.postMessage(0); }));
/** Run the clock frame by frame for `total` ms, calling `sample(ms)` before the first frame and after each. */
const frames = async (page, total, sample) => {
  await flushReact(page); // the change has rendered and the glide has started, at the frozen time
  for (let ms = 0; ms <= total; ms += 16) {
    await sample(ms);
    await page.clock.runFor(16);
  }
};

describe("Sparkline", () => {
  const fixture = `function App(){const [d,sd]=React.useState([10,20,50]);window.set=sd;return <B.Sparkline label="Runs" data={d} />}
    createRoot(document.getElementById("root")).render(<App/>);`;
  const axis = (page) => page.locator(".basalt-sparkline-axis span[aria-hidden]").textContent();
  const shownPoints = (page) => page.locator(".basalt-sparkline-line").getAttribute("points");

  test("the scale eases over slow on ease-out, never in 8% steps, and lands on the target", async () => {
    const { page } = await fixturePage(browser, fixture, { clock: true });
    assert.equal(await axis(page), "50");
    // a smaller peak: the scale eases in; the readable label is the target at once
    await page.evaluate(() => window.set([10, 20, 20]));
    assert.equal(await page.locator(".basalt-sparkline-axis .basalt-visually-hidden").textContent(), "20", "the accessible value is the target");
    const samples = [];
    await frames(page, 320, async (ms) => { samples.push([ms, Number(await axis(page))]); });
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
    const { page } = await fixturePage(browser, fixture, { clock: true });
    await page.evaluate(() => window.set([10, 20, 20]));
    assert.equal(await page.locator(".basalt-sparkline-head .basalt-visually-hidden").textContent(), "20");
    const digits = () => page.evaluate(() => [...document.querySelectorAll(".basalt-sparkline-head .basalt-ticker-digit")].map((d) => d.style.getPropertyValue("--_d")).join(""));
    const out = new Set();
    await frames(page, 260, async () => { out.add(await digits()); });
    const seen = [...out];
    assert.ok(seen.length > 2, `the digits eased through ${seen}`);
    assert.equal(seen.at(-1), "20");
    await page.close();
  });
});

describe("the sparkline headline has one clock", () => {
  const fixture = `function App(){const[d,s]=React.useState([10,20,50]);window.set=s;return <B.Sparkline label="Runs" data={d}/>}
    createRoot(document.getElementById("root")).render(<App/>);`;

  test("what is drawn is where the glide puts it: no digit strip is mid-transition, and none outlasts the glide", async () => {
    const { page } = await fixturePage(browser, fixture, { clock: true });
    await page.evaluate(() => window.set([10, 20, 20]));
    const read = (ms) => page.evaluate((ms) => {
      const strips = [...document.querySelectorAll(".basalt-sparkline-head .basalt-ticker-digit")].map((digit) => {
          const strip = digit.firstElementChild;
          const drawn = -new DOMMatrix(getComputedStyle(strip).transform).m42 / parseFloat(getComputedStyle(digit).fontSize);
          return Math.abs(drawn - Number(digit.style.getPropertyValue("--_d")));
        });
        return { ms, off: Math.max(0, ...strips), transitions: document.getAnimations().filter((a) => a.transitionProperty === "transform").length };
    }, ms);
    const samples = [];
    await frames(page, 420, async (ms) => { samples.push(await read(ms)); });
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
    await freezeAnimations(page); // the strip's transition stays at its start until it is read
    await page.evaluate(() => window.set(29));
    // wait for the render, not for a delay (waitForFunction polls on requestAnimationFrame, which the frozen clock holds)
    for (let tries = 0; tries < 200 && !(await page.evaluate(() => document.getAnimations().some((a) => a.transitionProperty === "transform"))); tries += 1) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(await page.evaluate(() => document.getAnimations().some((a) => a.transitionProperty === "transform")), "an ordinary ticker transitions its strip");
    await page.close();
  });
});

describe("the toast drain", () => {
  const toasts = `function Show(){const t=B.useToast();React.useEffect(()=>{t.show({title:"Saved",home:"page",timeout:5000})},[t]);return null}
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
    const { page } = await fixturePage(browser, `window.morph = (name) => createRoot(document.getElementById("root")).render(<B.MorphIcon glyph={B[name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("") + "Glyph"]} />);`);
    for (const name of actions) {
      await page.evaluate((name) => window.morph(name), name);
      await page.locator(`.basalt-morph[data-icon="${name}"]`).waitFor();
    }
    assert.equal(await page.locator(".basalt-morph g[stroke='currentColor']").first().getAttribute("stroke-width"), "2.25");
    assert.equal(actions.length, 21, "MorphIcon draws each of the 21 core actions, passed by reference");
    const timing = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return [s.getPropertyValue("--basalt-duration-slow").trim(), s.getPropertyValue("--basalt-ease-out").trim()]; });
    assert.deepEqual(timing, ["200ms", "cubic-bezier(0.16, 1, 0.3, 1)"], "the morph reads these tokens (glideTiming)");
    await page.close();
  });
});
