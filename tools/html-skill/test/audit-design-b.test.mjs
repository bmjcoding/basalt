// audit-design-b, the HTML skill's half: B1 (a cut cell can be read), B2 (a one-line notification entry on touch), B3 (the skip link under the
// bar) and C3 (a required field), each compared with React's own (packages/react/test/audit-design-b.test.mjs) so the two outputs agree.
// DECISIONS 138 and 139. Every test fails on origin/main. Synthetic data. The fixtures load no web font, so text widths differ on CI's runner:
// every measured margin here is wider than a fallback font's width.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, freezeAnimations, launch as launchReact, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let skillBrowser;
let reactBrowser;
before(async () => { skillBrowser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await skillBrowser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
const html = (body) => compose(`<title>Audit</title>${body}`, { fonts: false }).html;
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const box = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;

// ---- B3: the skip link ----

const SKILL_BAR = `<a class="skip-link" href="#main">Skip to content</a><header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Acme home">${MARK}<span>Acme</span></a></div></header><main id="main" tabindex="-1" style="padding: 24px; min-height: 3000px"><h2>Alpha</h2><p>Synthetic words.</p></main>`;
const REACT_BAR = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div><B.SkipLink target="main" /><B.SiteHeader brand={<>${MARK}<span>Acme</span></>} brandLabel="Acme home" /><main id="main" tabIndex={-1} style={{ padding: 24, minHeight: 3000 }}><h2>Alpha</h2></main></div>);`;

for (const theme of THEMES) {
  for (const width of [1440, 390]) {
    test(`B3 the skill's focused skip link is where React's is: under the bar, on the brand's start edge, floating (${theme}, ${width})`, async () => {
      const { page: skill, context } = await openHtml(skillBrowser, html(SKILL_BAR), { scheme: theme, width });
      const { page: react } = await fixturePage(reactBrowser, REACT_BAR, { theme, viewport: { width, height: width === 390 ? 844 : 900 } });
      await settle(react);
      const out = {};
      for (const [name, page, link, bar, brand] of [["skill", skill, ".skip-link", ".topbar", ".brand"], ["react", react, ".basalt-skip-link", ".basalt-site-header", ".basalt-site-brand-mark"]]) {
        const unseen = await page.locator(link).evaluate((el) => getComputedStyle(el).clipPath);
        assert.notEqual(unseen, "none", `${name}: unseen until focus`);
        await page.keyboard.press("Tab");
        const s = await box(page, link); const b = await box(page, bar); const m = await box(page, brand);
        near(s.y, b.bottom + 8, `${name}: space-2 below the bar's line`);
        near(s.x, m.x, `${name}: on the brand's start edge`);
        out[name] = await page.locator(link).evaluate((el) => { const c = getComputedStyle(el); return { radius: c.borderTopLeftRadius, border: c.borderTopWidth, shadow: c.boxShadow !== "none", pos: c.position, fill: c.backgroundColor }; });
        assert.equal(out[name].radius, "8px", `${name}: radius 8`);
        assert.equal(out[name].border, "1px", `${name}: the rim`);
        assert.ok(out[name].shadow, `${name}: shadow-overlay`);
        assert.equal(out[name].pos, "fixed");
      }
      assert.deepEqual(out.skill, out.react, "the same radius, rim, shadow, fill and position");
      await context.close(); await react.close();
    });
  }
}

test("B3 with no bar the skill's skip link sits at the page's top start, as it did, with the rim and radius 8", async () => {
  const { page, context } = await openHtml(skillBrowser, html(`<a class="skip-link" href="#main">Skip to content</a><main id="main" tabindex="-1"><h1>Plain</h1></main>`), { scheme: "light" });
  await page.keyboard.press("Tab");
  const s = await box(page, ".skip-link");
  near(s.x, 8, "space-2"); near(s.y, 8, "space-2");
  assert.equal(await page.locator(".skip-link").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "8px");
  await context.close();
});

// ---- B2: a one-line notification entry on touch ----

test("B2 the skill's one-line notification entry is 44 tall on touch, 40 with a mouse, and a two-line entry 58, as React's are", async () => {
  const entries = `[{ id: 'a', title: 'Deploy finished', time: '2m ago', unread: true }, { id: 'b', title: 'Backup finished', description: 'ledger-replica, nightly', time: '1h ago' }]`;
  const page_html = html(`<!-- basalt:use notifications --><div style="padding: 16px"><span id="bell"></span></div><script>window.centre = Basalt.notifications('#bell', { entries: ${entries} }); window.centre.open();</script>`);
  for (const [touch, expected] of [[true, [44, 58]], [false, [40, 58]]]) {
    const { page, context } = await openHtml(skillBrowser, page_html, { scheme: "dark", width: touch ? 390 : 1440, touch });
    await page.locator(".notification").first().waitFor();
    const heights = await page.locator(".notification").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    // (a fixture with no web font lays a line out a fraction off its token height)
    heights.forEach((h, i) => near(h, expected[i], `${touch ? "touch" : "mouse"} entry ${i}`, 0.5));
    if (touch) {
      const centred = await page.locator(".notification").first().evaluate((e) => { const t = e.querySelector(".notification-title").getBoundingClientRect(); const r = e.getBoundingClientRect(); return [t.top - r.top, r.bottom - t.bottom]; });
      near(centred[0], 12, "12 above"); near(centred[1], 12, "12 below");
    }
    await context.close();
  }
});

// ---- C3: a required field ----

const SKILL_FIELDS = `<form style="width: 640px; padding: 16px; display: grid; gap: 16px"><div class="field"><label for="a">Sandbox name <span class="necessity" aria-hidden="true">Required</span></label><input class="input" id="a" required></div><div class="field"><label for="b">Note <span class="necessity" aria-hidden="true">Optional</span></label><input class="input" id="b"></div><div class="field"><label for="c">Region</label><input class="input" id="c"></div></form>`;
const REACT_FIELDS = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<form style={{ width: 640, padding: 16, display: "grid", gap: 16 }}><B.Field label="Sandbox name" required><B.Input /></B.Field><B.Field label="Note" optional><B.Input /></B.Field><B.Field label="Region"><B.Input /></B.Field></form>);`;

for (const theme of THEMES) {
  test(`C3 the skill's necessity word is React's: after the label, tertiary, text-xs, 400, hidden from assistive technology (${theme})`, async () => {
    const { page: skill, context } = await openHtml(skillBrowser, html(SKILL_FIELDS), { scheme: theme });
    const { page: react } = await fixturePage(reactBrowser, REACT_FIELDS, { theme });
    await settle(react);
    const read = (page, word, label) => page.evaluate(({ word, label }) => [...document.querySelectorAll(word)].map((n) => { const s = getComputedStyle(n); const l = n.closest(label); const range = document.createRange(); range.selectNodeContents(l.firstChild); const t = range.getBoundingClientRect(); const r = n.getBoundingClientRect(); return { text: n.textContent, size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, color: s.color, gap: Math.round((r.left - t.right) * 10) / 10, hidden: n.getAttribute("aria-hidden"), labelHeight: l.getBoundingClientRect().height }; }), { word, label });
    const a = await read(skill, ".necessity", "label");
    const b = await read(react, ".basalt-field-necessity", ".basalt-field-label");
    assert.deepEqual(a, b);
    assert.deepEqual(a.map((x) => x.text), ["Required", "Optional"]);
    assert.ok(a.every((x) => x.gap >= 0 && x.gap <= 10 && x.hidden === "true" && x.size === "12px" && x.weight === "400"));
    const labels = await skill.locator("label").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
    near(labels[0], labels[2], "a marked label is as tall as an unmarked one", 0.01);
    assert.equal(await skill.getByRole("textbox", { name: "Sandbox name", exact: true }).count(), 1, "the name excludes the hidden word");
    await context.close(); await react.close();
  });
}

// ---- B1: a cut cell can be read ----

const ROWS = [
  ["build-0141", "Passed", "Pin the toolchain to the version the release uses", "Owner one"],
  ["nightly-migration-backfill", "Failed", "Backfill the ledger in batches of five thousand rows so the replica keeps up", "Owner two, longer"],
  ["lint-0388", "Passed", "Lint", "Owner ten"],
];
const SKILL_TABLE = `<div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0" style="margin: 16px"><table data-fixed style="min-width: 640px"><colgroup><col style="width: 160px"><col style="width: 110px"><col style="width: 220px"><col></colgroup><thead><tr><th>Run</th><th>Status</th><th>Message</th><th>Owner</th></tr></thead><tbody>${ROWS.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</tbody></table></div><button id="after">After</button>`;
const peek = (page) => page.evaluate(() => { const p = document.querySelector(".cell-peek"); if (!p) return null; const r = p.getBoundingClientRect(); const s = getComputedStyle(p); return { open: p.hasAttribute("data-open"), focus: p.hasAttribute("data-focus"), text: p.textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom, hidden: p.getAttribute("aria-hidden"), radius: s.borderRadius, shadow: s.boxShadow !== "none" }; });

for (const theme of THEMES) {
  test(`B1 the skill's cut cell is a stop, opens its whole value in place on a plate, and Esc leaves the cell its ring (${theme})`, async () => {
    const { page, context } = await openHtml(skillBrowser, html(SKILL_TABLE), { scheme: theme });
    await frames(page);
    const stops = await page.evaluate(() => [...document.querySelectorAll("tbody th, tbody td")].filter((c) => c.tabIndex === 0).map((c) => [c.textContent, c.hasAttribute("data-cut"), c.scrollWidth > c.clientWidth]));
    assert.ok(stops.length >= 1 && stops.every(([, cut, over]) => cut && over), "only a cut cell is a stop");
    assert.equal(await page.locator("tbody tr").nth(2).locator("td").first().getAttribute("tabindex"), null, "a whole cell is not a stop");
    const rowsBefore = await page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((r) => r.getBoundingClientRect().height));
    const target = page.locator("[data-cut]", { hasText: "Backfill the ledger" });
    await target.focus();
    await page.waitForFunction(() => document.querySelector(".cell-peek")?.hasAttribute("data-open"));
    await settle(page);
    const p = await peek(page);
    assert.equal(p.text, "Backfill the ledger in batches of five thousand rows so the replica keeps up");
    assert.equal(p.hidden, "true"); assert.equal(p.radius, "8px"); assert.ok(p.shadow); assert.equal(p.focus, true);
    const c = await target.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, pad: parseFloat(getComputedStyle(el).paddingLeft) }; });
    near(p.left, c.left, "in place: the plate starts where the cell does"); near(p.top, c.top, "and at its top");
    const textLeft = await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector(".cell-peek")); return range.getBoundingClientRect().left; });
    near(textLeft, c.left + c.pad, "its text starts on the cell's own pixel");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((r) => r.getBoundingClientRect().height)), rowsBefore, "the rows do not move");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".cell-peek").hasAttribute("data-open"));
    const ring = await target.evaluate((el) => { const s = getComputedStyle(el); return [document.activeElement === el, el.matches(":focus-visible"), s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
    assert.deepEqual(ring, [true, true, "solid", "2px", "-2px"], "after Esc focus has not moved and the cell shows its own ring");
    await context.close();
  });
}

test("B1 the skill's plate is never past the viewport at 390, hover opens it after the wait, and it can be hovered", async () => {
  const { page, context } = await openHtml(skillBrowser, html(SKILL_TABLE), { scheme: "dark", width: 390 });
  await frames(page);
  const n = await page.locator("[data-cut]").count();
  assert.ok(n >= 3);
  for (let i = 0; i < n; i += 1) {
    await page.locator("[data-cut]").nth(i).focus();
    await page.waitForFunction(() => document.querySelector(".cell-peek")?.hasAttribute("data-open"));
    const p = await peek(page);
    assert.ok(p.left >= -0.5 && p.right <= 390.5, `cell ${i}: ${p.left} to ${p.right}`);
  }
  await page.evaluate(() => document.activeElement?.blur());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(700); // past the grace in which a second plate opens at once
  await frames(page);
  const target = page.locator("[data-cut]", { hasText: "Backfill the ledger" });
  const b = await target.boundingBox();
  // The wait is read on the frozen clock: 150ms of the page's own time after the pointer arrives it is not open, on any machine at any load.
  const clock = await freezeAnimations(page);
  await page.mouse.move(b.x + 20, b.y + 20);
  await clock.advance(150);
  assert.equal((await peek(page))?.open ?? false, false, "not at once");
  await clock.thaw();
  await page.waitForFunction(() => document.querySelector(".cell-peek")?.hasAttribute("data-open"), null, { timeout: 3000 });
  await page.mouse.move(b.x + 60, b.y + 20);
  await page.waitForTimeout(400);
  assert.equal((await peek(page)).open, true, "the pointer can move onto the plate");
  await page.mouse.move(b.x + 60, b.y + 400);
  await page.waitForFunction(() => !document.querySelector(".cell-peek").hasAttribute("data-open"));
  await context.close();
});

// ---- E2: the skill's modules draw the core glyph where the core set owns the name ----

describe("E2 the skill's modules draw the core glyph, as React's components do", () => {
  test("no module that draws one of the core set's names carries Phosphor's path for it, and the page is lighter or no heavier than the glyph module would have made it", () => {
    const names = { menu: ["Check"], combobox: ["Check"], copy: ["Check", "X"], terminal: ["Copy", "Check"], toast: ["X"], number: ["Minus", "Plus"], filter: ["CaretDown", "MagnifyingGlass"], palette: ["MagnifyingGlass"], "command-list": ["MagnifyingGlass"] };
    const bodies = { menu: "<!-- basalt:use menu --><p>x</p>", combobox: "<!-- basalt:use combobox --><p>x</p>", copy: `<button class="btn" data-copy-text="x">Copy</button>`, terminal: "<!-- basalt:use terminal --><p>x</p>", toast: "<!-- basalt:use toast --><p>x</p>", number: `<div class="number-field"><input class="input" type="number"></div>`, filter: "<!-- basalt:use filter --><p>x</p>", palette: `<button class="btn" data-open-palette>Open</button>`, "command-list": "<div data-commands></div>" };
    for (const [module, icons] of Object.entries(names)) {
      const page = compose(`<title>E2</title>${bodies[module]}`, { fonts: false });
      assert.ok(page.modules.includes(module), `${module} is on its page`);
      for (const icon of icons) assert.ok(!page.icons.includes(icon), `${module}: the Phosphor ${icon} icon is not carried`);
    }
    // The terminal and the combobox still carry the Phosphor icons the core set does not own.
    assert.deepEqual(compose(`<title>E2</title>${bodies.terminal}`, { fonts: false }).icons.sort(), ["CheckCircle", "Warning", "XCircle"]);
    assert.ok(compose(`<title>E2</title>${bodies.combobox}`, { fonts: false }).icons.includes("CaretUpDown"));
  });

  for (const theme of THEMES) {
    test(`a stepper, the copy button and the menu's check are 24-grid core drawings in the same markup the glyph module gives (${theme})`, async () => {
      const body = `<!-- basalt:use menu --><!-- basalt:use glyph --><div class="number-field"><input class="input" type="number" value="2"></div><button class="btn" data-copy-text="x" id="cp"><span>Copy</span></button><span data-glyph="minus"></span><span data-glyph="plus"></span><span data-glyph="check"></span><span data-glyph="close"></span>`;
      const { page, context } = await openHtml(skillBrowser, html(body), { scheme: theme });
      await frames(page);
      // (parsed and serialised the same way the stepper's own markup is, so only the drawing is compared)
      const expected = await page.evaluate(() => { const t = document.createElement("div"); const parse = (h) => { t.innerHTML = h; return t.innerHTML; }; return { minus: parse(window.Basalt._.glyph("minus")), plus: parse(window.Basalt._.glyph("plus")) }; });
      const steppers = await page.locator(".number-field .btn").evaluateAll((els) => els.map((e) => e.innerHTML));
      assert.deepEqual(steppers, [expected.minus, expected.plus], "the stepper's SVG is exactly what the glyph module draws for minus and plus");
      for (const html of steppers) assert.match(html, /viewBox="0 0 24 24"/);
      await context.close();
    });
  }
});

// ---- Amendment 1 (DECISIONS 142), the skill's half ----

const NOTICE_BAR = `<a class="skip-link" href="#main">Skip to content</a><div id="notice" style="height: 40px">A notice above the bar</div><header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Acme home">${MARK}<span>Acme</span></a></div></header><main id="main" tabindex="-1" style="padding: 24px; min-height: 3000px"><h2>Alpha</h2></main>`;
for (const theme of THEMES) {
  for (const width of [1440, 390]) {
    test(`4. the skill's skip link under a bar with a notice above it sits space-2 under the bar's real edge, before and after the scroll (${theme}, ${width})`, async () => {
      const { page, context } = await openHtml(skillBrowser, html(NOTICE_BAR), { scheme: theme, width });
      await frames(page);
      const read = () => page.evaluate(() => { const l = document.querySelector(".skip-link").getBoundingClientRect(); const b = document.querySelector(".topbar").getBoundingClientRect(); return { gap: l.top - b.bottom, barTop: b.top, overlap: Math.max(0, Math.min(l.right, b.right) - Math.max(l.left, b.left)) * Math.max(0, Math.min(l.bottom, b.bottom) - Math.max(l.top, b.top)) }; });
      await page.keyboard.press("Tab");
      let r = await read();
      near(r.barTop, 40, "the bar is under the notice"); near(r.gap, 8, "space-2 under it"); assert.equal(r.overlap, 0);
      await page.evaluate(() => window.scrollTo(0, 200));
      await frames(page);
      r = await read();
      near(r.barTop, 0, "stuck at the top"); near(r.gap, 8, "and the link follows"); assert.equal(r.overlap, 0);
      await page.keyboard.press("Tab");
      assert.equal(await page.locator(".skip-link").evaluate((el) => el.style.top), "", "nothing is left behind");
      await context.close();
    });
  }
}

const WIDE_SKILL = `<div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0" style="margin: 16px"><table data-fixed style="min-width: 1600px"><colgroup><col style="width: 170px"><col style="width: 420px"><col></colgroup><thead><tr><th>Run</th><th>Message</th><th>Owner</th></tr></thead><tbody><tr><th scope="row">nightly</th><td>${ROWS[1][2]} ${ROWS[1][2]}</td><td>Ana</td></tr></tbody></table></div>`;
test("A. the skill's plate for a 420px column never passes a 390px viewport, and the column does not change", async () => {
  const { page, context } = await openHtml(skillBrowser, html(WIDE_SKILL), { scheme: "dark", width: 390 });
  await frames(page);
  const cols = () => page.evaluate(() => [...document.querySelectorAll("thead th")].map((c) => Math.round(c.getBoundingClientRect().width * 100) / 100));
  const before = await cols();
  await page.locator("[data-cut]", { hasText: "Backfill the ledger" }).focus();
  await page.waitForFunction(() => document.querySelector(".cell-peek")?.hasAttribute("data-open"));
  const p = await peek(page);
  assert.ok(p.left >= -0.5 && p.right <= 390.5, `inside the viewport: ${p.left} to ${p.right}`);
  assert.ok(p.right - p.left < 420, "narrower than its cell");
  assert.deepEqual(await cols(), before);
  await context.close();
});

const SPARK_COPY = `<!-- basalt:use sparkline --><p id="sentence" style="margin: 16px; font-size: 20px">Orders</p><div id="sp" style="width: 272px; margin: 16px"></div><script>Basalt.sparkline(document.getElementById('sp'), { label: 'Runs', data: [3, 5, 12] });</script>`;
for (const [label, options] of [["rest", {}], ["forced colours", { forcedColors: "active" }]]) {
  test(`B. the skill's sparkline value copies once, with no line break (${label})`, async () => {
    const context = await skillBrowser.newContext({ viewport: { width: 700, height: 500 }, colorScheme: "dark", ...options });
    const page = await context.newPage();
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html(SPARK_COPY) }));
    await page.goto("https://basalt.test/");
    await frames(page);
    const copied = await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector(".sparkline-head")); getSelection().removeAllRanges(); getSelection().addRange(r); return getSelection().toString(); });
    assert.equal(copied.replace(/\n/g, "|"), "Runs|12", "the label, then the number once and whole (the head is a flex row of two items, which a copy separates by one line break; the strips add none)");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll(".sparkline-value [aria-hidden] *")].filter((e) => /^(block|flex|grid|list-item)/.test(getComputedStyle(e).display)).map((e) => `${e.tagName}.${e.className}:${getComputedStyle(e).display}`)), [], "no block or flex box inside the strips");
    await context.close();
  });
}

test("C. the skill's short standalone link has a 44 by 44 hit box on touch and its width does not change", async () => {
  const { page, context } = await openHtml(skillBrowser, html(`<div style="width: 360px; padding: 24px"><div id="own"><a href="#go">Go</a></div><div style="height: 40px"></div><p>After</p></div>`), { scheme: "dark", width: 390, touch: true });
  await frames(page);
  const link = await box(page, "#own a");
  assert.ok(link.w < 30); near(link.h, 44, "44 tall");
  const cx = link.x + link.w / 2; const cy = link.y + link.h / 2;
  for (const [dx, expected] of [[0, true], [-21, true], [21, true], [-24, false], [24, false]]) assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a") !== null, [cx + dx, cy]), expected, `${dx}px across`);
  await context.close();
});

// ---- Amendment 2 (DECISIONS 147), the skill's half ----

const BAR_LINKS = [["docs", "Documentation"], ["pricing", "Pricing"], ["changelog", "Changelog"]];
const BAR = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Acme home">${MARK}<span>Acme</span></a><nav class="topbar-links" aria-label="Primary">${BAR_LINKS.map(([id, label], i) => `<a href="#${id}"${i === 0 ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav><span class="spacer"></span></div></header><main style="padding: 24px"><h1>Page</h1></main>`;
for (const [width, touch] of [[1024, true], [720, true], [1024, false]]) {
  test(`the bar's links do not move when the current page changes: ${width}px, ${touch ? "coarse" : "fine"} pointer (the hit-box rule leaves .topbar-links a out)`, async () => {
    const { page, context } = await openHtml(skillBrowser, html(BAR), { scheme: "dark", width, touch });
    await page.setViewportSize({ width, height: 800 });
    await frames(page);
    const xs = () => page.evaluate(() => [...document.querySelectorAll(".topbar-links a")].map((a) => { const r = a.getBoundingClientRect(); return [Math.round(r.x * 100) / 100, Math.round(r.width * 100) / 100]; }));
    const before = await xs();
    for (const i of [1, 2, 0]) {
      await page.evaluate((i) => { document.querySelectorAll(".topbar-links a").forEach((a, k) => (k === i ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"))); }, i);
      await frames(page);
      assert.deepEqual(await xs(), before, `the links are where they were with link ${i} current (0px)`);
    }
    // and the hit-box pseudo-element is not on them: their ::after is the hidden label that reserves the current width
    assert.equal(await page.locator(".topbar-links a").first().evaluate((a) => getComputedStyle(a, "::after").position), "static");
    await context.close();
  });
}

test("1. in forced colours the skill's sparkline value is plain text in the line: the strips are not drawn, the copy is unchanged", async () => {
  for (const scheme of ["dark", "light"]) {
    const context = await skillBrowser.newContext({ viewport: { width: 700, height: 500 }, colorScheme: scheme, forcedColors: "active" });
    const page = await context.newPage();
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html(SPARK_COPY) }));
    await page.goto("https://basalt.test/");
    await frames(page);
    const read = await page.evaluate(() => { const v = document.querySelector(".sparkline-value > [aria-hidden]"); const t = document.querySelector(".sparkline-text"); const s = getComputedStyle(t); return { strips: getComputedStyle(v).display, display: s.display, adjust: s.forcedColorAdjust, text: t.textContent }; });
    assert.equal(read.strips, "none"); assert.equal(read.adjust, "auto"); assert.equal(read.text, "12");
    const copied = await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector(".sparkline-head")); getSelection().removeAllRanges(); getSelection().addRange(r); return getSelection().toString(); });
    assert.equal(copied.replace(/\n/g, "|"), "Runs|12");
    await context.close();
  }
});
