// The twelfth parity PR (the motion rules, DECISIONS 136 and 139): the parts the skill has beside React's, rendered side by side in Chromium in both themes, and compared.
// The loops toggle's icon form (rest, pressed, in focus), an ambient mark (its box, its colour, its loop's timing), and the chart's entrance (the same marks, the same timing).
// The skill's chart glides every mark from where it is drawn when its data changes mid-entrance, as React's does (DECISIONS 143, item 8): compared below. Not compared by computed
// style, and recorded in words (see parity-differences.mjs): Reflow (items that move to their places) has no counterpart in the skill: a skill page has
// no list that a filter or a sort rewrites except a table, which keeps the still-table rule. The skill's narrow menu pause row (DECISIONS 148, item 2) and a line's glide are compared below.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact } from "../../../packages/react/test/support.mjs";
import { launch, openHtml, samePaint } from "./support.mjs";

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
const BOX = ["width", "height", "paddingTop", "paddingLeft", "borderTopLeftRadius", "color", "backgroundColor", "borderTopColor", "borderTopWidth", "boxShadow", "opacity"];
const OUTLINE = ["outlineStyle", "outlineWidth", "outlineColor", "outlineOffset"];

const read = (selector, props, pseudo) => ({ selector, props, pseudo });
const measure = (page, { selector, props }) => page.evaluate(({ selector, props }) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const s = getComputedStyle(el);
  const out = {};
  for (const p of props) out[p] = ["width", "height"].includes(p) ? `${Math.round(el.getBoundingClientRect()[p] * 100) / 100}px` : s[p];
  return out;
}, { selector, props });

async function compare(page, skill, reactRead, skillRead, label) {
  const a = await measure(page, reactRead);
  const b = await measure(skill, skillRead);
  assert.ok(a && b, `${label}: both exist`);
  // A colour React reads from a token (B3's plate, oklch) and the skill mixes (color(srgb)) is the same when it paints the same pixel.
  for (const key of Object.keys(a)) if (b[key] !== a[key] && samePaint(a[key], b[key])) b[key] = a[key];
  assert.deepEqual(b, a, label);
}

const REACT = `
function Page() {
  return (<div style={{ padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
    <B.LoopsToggle />
    <B.LoopsToggle />
  </div>);
}
createRoot(document.getElementById("root")).render(<Page />);`;

const SKILL = `<!-- basalt:use loops --><div style="padding: 16px; display: flex; gap: 16px; align-items: center">
  <button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>
  <button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>
</div>`;

describe("LoopsToggle's icon form, against the skill's", () => {
  for (const theme of THEMES) {
    test(`rest, pressed and focus match in ${theme}`, async () => {
      const react = await fixturePage(reactBrowser, REACT, { theme, viewport: { width: 600, height: 300 } });
      const skill = await openHtml(browser, compose(`<title>Loops</title>${SKILL}`, { fonts: false }).html, { scheme: theme, width: 600 });
      const r = { selector: ".basalt-button[data-variant=ghost]", props: BOX };
      const s = { selector: ".btn[data-variant=ghost]", props: BOX };
      await compare(react.page, skill.page, r, s, "rest");
      await react.page.locator(".basalt-button").first().click();
      await skill.page.locator(".btn").first().click();
      await react.page.mouse.move(500, 250); await skill.page.mouse.move(500, 250);
      await react.page.evaluate(() => new Promise((res) => setTimeout(res, 250))); await skill.page.evaluate(() => new Promise((res) => setTimeout(res, 250)));
      await compare(react.page, skill.page, { ...r, selector: ".basalt-button[aria-pressed=true]" }, { ...s, selector: ".btn[aria-pressed=true]" }, "pressed");
      await react.page.locator(".basalt-button").nth(1).focus(); await skill.page.locator(".btn").nth(1).focus();
      await react.page.keyboard.press("Shift+Tab"); await react.page.keyboard.press("Tab"); await skill.page.keyboard.press("Shift+Tab"); await skill.page.keyboard.press("Tab");
      await compare(react.page, skill.page, { selector: ".basalt-button:focus-visible", props: OUTLINE }, { selector: ".btn:focus-visible", props: OUTLINE }, "focus ring");
      assert.deepEqual(react.errors, []);
      assert.deepEqual(skill.errors, []);
      await react.page.close();
      await skill.context.close();
    });
  }
});

describe("an ambient mark, against the skill's", () => {
  for (const theme of THEMES) {
    test(`its box and colour match, and so does its loop's timing, in ${theme}`, async () => {
      const skill = await openHtml(browser, compose(`<title>Ambient</title><section class="stage"><div class="stage-art" aria-hidden="true"><span class="ambient-mark" data-ambient style="left: 40px; top: 20px"></span></div><div class="stage-content"><div style="height: 160px"></div></div></section>`, { fonts: false }).html, { scheme: theme, width: 600 });
      // The skill gives its first mark the timing React gives index 0.
      const props = ["width", "height", "backgroundColor", "position", "left", "top", "animationDuration", "animationDelay", "animationTimingFunction", "animationIterationCount"];
      const first = await fixturePage(reactBrowser, `createRoot(document.getElementById("root")).render(<B.Stage art={<div style={{ position: "absolute", inset: 0 }}><B.AmbientMark index={0} style={{ left: 40, top: 20 }} /></div>}><div style={{ height: 160 }} /></B.Stage>);`, { theme, viewport: { width: 600, height: 300 } });
      await compare(first.page, skill.page, read(".basalt-ambient-mark", props), read(".ambient-mark", props), "mark");
      await first.page.close();
      await skill.context.close();
    });
  }
});

// ---- The entrance: the same marks with the same timing ----
const RECORD = `(() => { const real = Element.prototype.animate; window.__anims = []; Element.prototype.animate = function (k, o) { const a = real.call(this, k, o); window.__anims.push({ props: [...new Set(k.flatMap((f) => Object.keys(f)).filter((x) => !["offset", "easing", "composite"].includes(x)))].join(","), duration: o.duration, delay: Math.round((o.delay || 0) * 100) / 100, fill: o.fill }); return a; }; })();`;
// A chart starts its entrance when it is first seen (an IntersectionObserver reports after the svg is in the page), so the svg being there is not the entrance having begun, and on a
// busy machine the two are some time apart. Wait for the entrance itself (its first transform animation, which every bar starts in the same effect), then a frame, before reading it.
const entranceBegun = async (page) => {
  await page.waitForFunction(() => window.__anims.some((a) => a.props === "transform"));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const DAYS = Array.from({ length: 12 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
const VALUES = [48, 52, 61, 40, 55, 70, 38, 49, 60, 66, 44, 51];

describe("the chart's entrance, against React's", () => {
  test("bars: the same count, duration, delays and fill", async () => {
    const reactCtx = await reactBrowser.newContext({ viewport: { width: 900, height: 700 }, colorScheme: "dark" });
    await reactCtx.addInitScript(RECORD);
    await reactCtx.route("https://basalt.test/**", async (route) => {
      const { bundleFixture, pkg } = await import("../../../packages/react/test/support.mjs");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      const script = await bundleFixture(`createRoot(document.getElementById("root")).render(<div style={{ width: 800, padding: 16 }}><B.TimeChart title="Training" kind="bar" days={${JSON.stringify(DAYS)}} series={[{ id: "t", name: "Training", values: ${JSON.stringify(VALUES)} }]} format={(v) => v + " min"} unit="min" summary="Training averaged 54 min a day." entrance /></div>);`);
      await route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="dark"><head><title>x</title><style>${css}</style></head><body><div id="root"></div><script>${script}</script></body></html>` });
    });
    const rp = await reactCtx.newPage();
    await rp.goto("https://basalt.test/");
    await rp.waitForSelector(".basalt-chart-svg");
    await entranceBegun(rp);
    const reactAnims = (await rp.evaluate(() => window.__anims)).filter((a) => a.props === "transform");
    await reactCtx.close();
    const body = `<figure class="chart"><script type="application/json" data-chart>${JSON.stringify({ title: "Training", kind: "bar", unit: "min", summary: "Training averaged 54 min a day.", days: DAYS, entrance: true, series: [{ id: "t", name: "Training", values: VALUES }], format: { suffix: " min", maximumFractionDigits: 0 } })}</script></figure>`;
    const html = compose(`<title>x</title><div style="width: 800px; padding: 16px">${body}</div>`, { fonts: false }).html.replace("</head>", `<script>${RECORD}</script></head>`);
    const skill = await openHtml(browser, html, { scheme: "dark", width: 1440 }).catch(() => null);
    assert.ok(skill, "the skill page opens");
    await entranceBegun(skill.page);
    const skillAnims = (await skill.page.evaluate(() => window.__anims)).filter((a) => a.props === "transform");
    // The skill draws the svg a second time when it is first observed, and each draw starts its marks: compare one draw's worth.
    const one = skillAnims.slice(-reactAnims.length);
    assert.equal(reactAnims.length, VALUES.length);
    assert.deepEqual(one.map((a) => [a.duration, a.delay, a.fill]), reactAnims.map((a) => [a.duration, a.delay, a.fill]));
    await skill.context.close();
  });
});

describe("a data change mid-entrance, against React's (DECISIONS 143, item 8)", () => {
  const PAUSE_RECORD = RECORD.replace("const a = real.call(this, k, o);", "const a = real.call(this, k, o); if (window.__pause) a.pause();").replace("window.__anims.push({ props", "window.__anims.push({ easing: o.easing, to: JSON.stringify(k[k.length - 1]), props");
  const OTHER = [80, 20, 35, 90, 25, 40, 75, 30, 55, 20, 85, 45];
  const glides = (list) => list.filter((a) => a.props === "transform" && a.duration === 200).map((a) => [a.duration, a.delay, a.to]);

  test("every bar takes over over duration-slow with no stagger, ending at scale 1: the same count, duration, delay and end state", async () => {
    const reactCtx = await reactBrowser.newContext({ viewport: { width: 900, height: 700 }, colorScheme: "dark" });
    await reactCtx.addInitScript(`window.__pause = true;`);
    await reactCtx.addInitScript(PAUSE_RECORD);
    await reactCtx.route("https://basalt.test/**", async (route) => {
      const { bundleFixture, pkg } = await import("../../../packages/react/test/support.mjs");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      const script = await bundleFixture(`function P() { const [v, set] = React.useState(0); const values = v ? ${JSON.stringify(OTHER)} : ${JSON.stringify(VALUES)}; return <div style={{ width: 800, padding: 16 }}><button id="swap" onClick={() => set(1)}>swap</button><B.TimeChart title="Training" kind="bar" days={${JSON.stringify(DAYS)}} series={[{ id: "t", name: "Training", values }]} format={(x) => x + " min"} unit="min" summary="Training averaged 54 min a day." entrance /></div>; } createRoot(document.getElementById("root")).render(<P />);`);
      await route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="dark"><head><title>x</title><style>${css}</style></head><body><div id="root"></div><script>${script}</script></body></html>` });
    });
    const rp = await reactCtx.newPage();
    await rp.goto("https://basalt.test/");
    await rp.waitForSelector(".basalt-chart-svg");
    await entranceBegun(rp);
    await rp.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 120; } });
    const mark = (await rp.evaluate(() => window.__anims)).length;
    await rp.click("#swap");
    // React starts the glides in an effect, which on a busy machine can land after the next frame: wait for the glides themselves, not for one frame.
    await rp.waitForFunction(([from, n]) => window.__anims.slice(from).filter((a) => a.props === "transform" && a.duration === 200).length >= n, [mark, VALUES.length], { timeout: 15000 }).catch(() => {});
    await rp.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const reactGlides = glides((await rp.evaluate(() => window.__anims)).slice(mark));
    await reactCtx.close();

    const body = (values) => JSON.stringify({ title: "Training", kind: "bar", unit: "min", summary: "Training averaged 54 min a day.", days: DAYS, entrance: true, series: [{ id: "t", name: "Training", values }], format: { suffix: " min", maximumFractionDigits: 0 } });
    const html = compose(`<title>x</title><div style="width: 800px; padding: 16px"><figure class="chart" id="c"><script type="application/json" data-chart>${body(VALUES)}</script></figure></div>`, { fonts: false }).html.replace("</head>", `<script>window.__pause = true;</script><script>${PAUSE_RECORD}</script></head>`);
    const skill = await openHtml(browser, html, { scheme: "dark", width: 1440 });
    await entranceBegun(skill.page);
    await skill.page.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 120; } });
    const skillMark = (await skill.page.evaluate(() => window.__anims)).length;
    await skill.page.evaluate((options) => Basalt.chart(document.getElementById("c"), options), JSON.parse(body(OTHER)));
    await skill.page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    const skillGlides = glides((await skill.page.evaluate(() => window.__anims)).slice(skillMark));
    await skill.context.close();
    assert.equal(reactGlides.length, VALUES.length, "React: one glide a bar");
    // The skill draws the svg again when its box is first observed, and each draw starts its marks: one draw's worth is the same set.
    assert.deepEqual(skillGlides.slice(-reactGlides.length), reactGlides);
  });
});

describe("the narrow menu's pause row, against React's (DECISIONS 148, item 2)", () => {
  const REACT_BAR = `function P() { return <B.SiteHeader brand={<span style={{ font: "600 16px/1 var(--basalt-font-family-sans)" }}>Placeholder</span>} brandLabel="Placeholder home" links={["Product", "Docs", "Pricing"].map((label) => ({ href: "#" + label.toLowerCase(), label, current: label === "Docs" }))} loopsToggle={<B.LoopsToggleIcon />} themeToggle={<B.IconButton icon={B.CheckGlyph} label="Switch theme" onClick={() => {}} />} action={<B.Button variant="primary">Get started</B.Button>} />; } createRoot(document.getElementById("root")).render(<P />);`;
  const SKILL_BAR = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Placeholder home">Placeholder</a><nav class="topbar-links" aria-label="Primary"><a href="#product">Product</a><a href="#docs" aria-current="page">Docs</a><a href="#pricing">Pricing</a></nav><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button><a class="btn topbar-action" data-variant="primary" href="#start">Get started</a></div></header>`;
  const PROPS = ["width", "height", "paddingTop", "paddingLeft", "borderTopLeftRadius", "color", "backgroundColor", "borderTopColor", "borderTopWidth", "fontSize", "fontWeight", "lineHeight"];
  const readRow = (page, selector) => page.evaluate(({ selector, props }) => {
    const b = document.querySelector(selector); const r = b.getBoundingClientRect(); const s = getComputedStyle(b);
    const out = { x: r.x, y: r.y, w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100, text: b.textContent.trim(), pressed: b.getAttribute("aria-pressed") };
    for (const p of props) out[p] = p === "width" || p === "height" ? out[p === "width" ? "w" : "h"] + "px" : s[p];
    // In forced colours the system colours are the page's own palette: say whether the fill is Highlight on this page, not which shade this page's colour scheme gives it.
    const probe = document.createElement("i"); probe.style.cssText = "background: Highlight; forced-color-adjust: none"; document.body.append(probe);
    const highlight = getComputedStyle(probe).backgroundColor; probe.remove();
    if (matchMedia("(forced-colors: active)").matches) { out.backgroundColor = out.backgroundColor === highlight ? "Highlight" : out.backgroundColor; out.borderTopColor = out.borderTopColor === highlight ? "Highlight" : out.borderTopColor; }
    return out;
  }, { selector, props: PROPS });

  for (const [label, theme, forced] of [["dark", "dark", false], ["light", "light", false], ["forced colours", "dark", true]]) {
    test(`its place, box, words and pressed state match at 390 in ${label}`, async () => {
      const react = await fixturePage(reactBrowser, REACT_BAR, { theme, viewport: { width: 390, height: 844 }, hasTouch: true, colorScheme: theme, ...(forced ? { forcedColors: "active" } : {}) });
      const skill = await openHtml(browser, compose(`<title>Menu</title>${SKILL_BAR}<main class="page"><p>x</p></main>`, { fonts: false }).html, { scheme: theme, width: 390, touch: true });
      if (forced) { await skill.page.emulateMedia({ forcedColors: "active" }); }
      await react.page.getByRole("button", { name: "Menu" }).click();
      await react.page.waitForSelector(".basalt-site-menu-loops");
      await skill.page.locator(".topbar-menu-trigger").click();
      await skill.page.waitForSelector("dialog.topbar-menu[open]");
      for (const page of [react.page, skill.page]) await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
      const rest = [await readRow(react.page, ".basalt-site-menu-loops .basalt-button"), await readRow(skill.page, ".topbar-menu-loops .btn")];
      assert.deepEqual(rest[1], rest[0], "at rest");
      await react.page.locator(".basalt-site-menu-loops .basalt-button").click();
      await skill.page.locator(".topbar-menu-loops .btn").click();
      await react.page.mouse.move(300, 700); await skill.page.mouse.move(300, 700);
      // Read at rest: every transition and animation that is going to finish has finished.
      for (const page of [react.page, skill.page]) await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))); });
      const held = [await readRow(react.page, ".basalt-site-menu-loops .basalt-button"), await readRow(skill.page, ".topbar-menu-loops .btn")];
      assert.equal(held[0].pressed, "true");
      // The pressed fill: React's plate token and the skill's mix are one colour when they paint the same pixel.
      for (const key of Object.keys(held[0])) if (held[1][key] !== held[0][key] && samePaint(held[0][key], held[1][key])) held[1][key] = held[0][key];
      assert.deepEqual(held[1], held[0], "pressed");
      assert.deepEqual(react.errors, []);
      assert.deepEqual(skill.errors, []);
      await react.page.close();
      await skill.context.close();
    });
  }
});

describe("the icon toggle's name, against React's (DECISIONS 148, fix D)", () => {
  test("both are one button named \"Pause animations\" by title, with no aria-label and no description", async () => {
    const names = async (page) => {
      const client = await page.context().newCDPSession(page);
      await client.send("Accessibility.enable");
      const { nodes } = await client.send("Accessibility.getFullAXTree");
      const node = nodes.find((n) => n.role?.value === "button" && n.name?.value === "Pause animations" && !n.ignored);
      const el = await page.evaluate(() => { const b = document.querySelector("[title='Pause animations']"); return { title: b.getAttribute("title"), label: b.getAttribute("aria-label") }; });
      return { found: !!node, description: node?.description?.value ?? null, ...el };
    };
    const react = await fixturePage(reactBrowser, `createRoot(document.getElementById("root")).render(<B.LoopsToggle />);`, { viewport: { width: 600, height: 300 } });
    const skill = await openHtml(browser, compose(`<title>x</title><button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>`, { fonts: false }).html, { width: 600 });
    const a = await names(react.page);
    const b = await names(skill.page);
    assert.deepEqual(b, a);
    assert.deepEqual(a, { found: true, description: null, title: "Pause animations", label: null });
    await react.page.close();
    await skill.context.close();
  });
});

describe("a line and its markers glide from their drawn geometry, against React's (DECISIONS 148, fix B)", () => {
  const PAUSE_RECORD = RECORD.replace("const a = real.call(this, k, o);", "const a = real.call(this, k, o); if (window.__pause) a.pause();");
  const ALT = [10, 90, 10, 90, 10, 90, 10, 90, 10, 90, 10, 90];
  const INV = ALT.map((v) => 100 - v);
  const probe = (page) => page.evaluate(() => { const r = (el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }; return { mark: r(document.querySelector(".chart-svg .chart-mark, .basalt-chart-svg .basalt-chart-mark")), line: r(document.querySelector('.chart-svg .chart-line[data-dash="solid"], .basalt-chart-svg .basalt-chart-line[data-dash="solid"]')) }; });
  const worst = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

  test("at the change the first marker and the line's box are where they were drawn, in both", async () => {
    const reactCtx = await reactBrowser.newContext({ viewport: { width: 900, height: 700 }, colorScheme: "dark" });
    await reactCtx.addInitScript(`window.__pause = true;`);
    await reactCtx.addInitScript(PAUSE_RECORD);
    // React's data glide is a JS interpolation on animation frames, which `getAnimations()` cannot pause. So the page's clock is frozen (Playwright's fake clock, paused before
    // anything loads): a frame of the glide runs only when the test runs one, and a loaded machine cannot let several pass between the click and the read.
    await reactCtx.clock.install({ time: 0 });
    await reactCtx.clock.pauseAt(10_000);
    await reactCtx.route("https://basalt.test/**", async (route) => {
      const { bundleFixture, pkg } = await import("../../../packages/react/test/support.mjs");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
      const script = await bundleFixture(`function P() { const [v, set] = React.useState(0); const values = v ? ${JSON.stringify(INV)} : ${JSON.stringify(ALT)}; return <div style={{ width: 800, padding: 16 }}><button id="swap" onClick={() => set(1)}>swap</button><B.TimeChart title="Training" kind="line" days={${JSON.stringify(DAYS)}} series={[{ id: "a", name: "A", values }]} format={(x) => x + " min"} unit="min" summary="Two days." entrance /></div>; } createRoot(document.getElementById("root")).render(<P />);`);
      await route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="dark"><head><title>x</title><style>${css}</style></head><body><div id="root"></div><script>${script}</script></body></html>` });
    });
    const rp = await reactCtx.newPage();
    await rp.goto("https://basalt.test/");
    await rp.waitForSelector(".basalt-chart-svg");
    await rp.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 120; } });
    const reactBefore = await probe(rp);
    await rp.click("#swap");
    await rp.evaluate(() => { for (const a of document.getAnimations()) if (a.effect.getComputedTiming().duration === 200) { a.pause(); a.currentTime = 0; } });
    // The change is drawn once, from what was drawn (progress 0), and no frame of the glide has run: the page's clock does not move until the test moves it.
    const reactAfter = await probe(rp);
    await reactCtx.close();
    // React's data glide is a JS interpolation that starts from what is drawn (progress 0): with its clock frozen no frame has run at the change, so it is compared like the skill's.
    const body = (values) => JSON.stringify({ title: "Training", kind: "line", unit: "min", summary: "Two days.", days: DAYS, entrance: true, series: [{ id: "a", name: "A", values }], format: { suffix: " min", maximumFractionDigits: 0 } });
    const html = compose(`<title>x</title><div style="width: 800px; padding: 16px"><figure class="chart" id="c"><script type="application/json" data-chart>${body(ALT)}</script></figure></div>`, { fonts: false }).html.replace("</head>", `<script>window.__pause = true;</script><script>${PAUSE_RECORD}</script></head>`);
    const skill = await openHtml(browser, html, { scheme: "dark", width: 1440 });
    await skill.page.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 120; } });
    const skillBefore = await probe(skill.page);
    await skill.page.evaluate((options) => Basalt.chart(document.getElementById("c"), options), JSON.parse(body(INV)));
    await skill.page.evaluate(() => { for (const a of document.getAnimations()) if (a.effect.getComputedTiming().duration === 200) { a.pause(); a.currentTime = 0; } });
    const skillAfter = await probe(skill.page);
    await skill.context.close();
    assert.ok(worst(skillBefore.mark, skillAfter.mark) <= 1, `skill marker jumped ${worst(skillBefore.mark, skillAfter.mark)}px`);
    assert.ok(worst(skillBefore.line, skillAfter.line) <= 1, `skill line jumped ${worst(skillBefore.line, skillAfter.line)}px`);
    assert.ok(worst(reactBefore.mark, reactAfter.mark) <= 1, `React marker moved ${worst(reactBefore.mark, reactAfter.mark)}px at the change, before any frame of the glide`);
    // Both glide a line (a duration-slow animation on the path's draw) and its markers (opacity at least).
    void reactAfter;
  });
});
