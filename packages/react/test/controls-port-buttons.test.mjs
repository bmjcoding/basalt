// DECISIONS 154, the controls batch, buttons: control sizes 44 to 56 (D11a), the outline form, the amount, the count pill, two lines
// (D11b), an icon button's done state (D11c), the full-width Button (X12) and the text button (D5d). Driven in Chromium against the built
// package with the real stylesheet, in both themes, in forced colours, under reduced motion and on a coarse pointer. Each part that
// must not move is measured to 0px.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["dark", "light"];
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const open = async (jsx, options = {}) => {
  const { page, errors } = await fixturePage(browser, render(jsx), options);
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); }" });
  // A paused fake clock never runs a frame, so there is nothing to settle (and settling would wait for ever).
  if (!options.clock) await settle(page);
  return { page, errors };
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const css = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return (await page.evaluate((o) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, o), AXE)).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
};

describe("D11a: control sizes 44, 48, 52 and 56", () => {
  const SIZES = { "2xl": 44, "3xl": 48, "4xl": 52, "5xl": 56 };
  test("a button is the height its size names, radius 8, 600 where a button has text and 500 at the shipped sizes", async () => {
    const { page } = await open(`<div>${["md", "xl", ...Object.keys(SIZES)].map((s) => `<B.Button key="${s}" size="${s}" data-testid="b-${s}">Label</B.Button>`).join("")}</div>`);
    for (const [size, px] of Object.entries(SIZES)) {
      const b = page.getByTestId(`b-${size}`);
      assert.equal((await box(b)).height, px, `${size} is ${px}px`);
      const style = await css(b, "borderTopLeftRadius", "fontWeight", "fontSize");
      assert.deepEqual([style.borderTopLeftRadius, style.fontWeight, style.fontSize], ["8px", "600", "16px"], size);
    }
    assert.equal((await css(page.getByTestId("b-md"), "fontWeight")).fontWeight, "500");
    assert.equal((await css(page.getByTestId("b-xl"), "fontWeight")).fontWeight, "500");
  });

  test("compact density steps every rung down one: 56 to 52, 52 to 48, 48 to 44, 44 to 40", async () => {
    const { page } = await open(`<div data-density="compact">${Object.keys(SIZES).map((s) => `<B.Button key="${s}" size="${s}" data-testid="b-${s}">Label</B.Button>`).join("")}<B.Button size="lg" data-testid="b-lg">Label</B.Button></div>`);
    const heights = {};
    for (const size of Object.keys(SIZES)) heights[size] = (await box(page.getByTestId(`b-${size}`))).height;
    assert.deepEqual(heights, { "2xl": 40, "3xl": 44, "4xl": 48, "5xl": 52 });
    assert.equal((await box(page.getByTestId("b-lg"))).height, 32, "the shipped rungs step as they did (36 to 32)");
  });

  test("an input and a select trigger take the rungs too, at 16px and radius 8", async () => {
    const { page } = await open(`<div>${Object.keys(SIZES).map((s) => `<B.Input key="${s}" controlSize="${s}" aria-label="i${s}" data-testid="i-${s}" />`).join("")}${Object.keys(SIZES).map((s) => `<B.Select key="s${s}" controlSize="${s}" aria-label="s${s}" options={[{value:"a",label:"A"}]} />`).join("")}</div>`);
    for (const [size, px] of Object.entries(SIZES)) {
      const input = page.getByTestId(`i-${size}`);
      assert.equal((await box(input)).height, px);
      assert.deepEqual(Object.values(await css(input, "borderTopLeftRadius", "fontSize")), ["8px", "16px"]);
      assert.equal((await box(page.getByRole("combobox", { name: `s${size}` }))).height, px);
    }
  });

  test("a coarse pointer keeps a 44px floor on the shipped sizes and changes nothing at 44 and up", async () => {
    const { page } = await open(`<div><B.Button size="md" data-testid="md">L</B.Button><B.Button size="2xl" data-testid="xl2">L</B.Button></div>`, PHONE);
    assert.equal((await box(page.getByTestId("md"))).height, 44);
    assert.equal((await box(page.getByTestId("xl2"))).height, 44);
  });
});

describe("D11b: the outline variant (A7)", () => {
  for (const theme of THEMES) {
    test(`outline is transparent on the input boundary, hover takes the edge to primary ink, a press is the selected wash (${theme})`, async () => {
      const { page } = await open(`<div style={{ padding: 20 }}><B.Button variant="outline" size="3xl" data-testid="o">Back to cart</B.Button></div>`, { theme });
      const o = page.getByTestId("o");
      const read = () => o.evaluate((el) => { const s = getComputedStyle(el); const probe = document.createElement("i"); document.body.append(probe); const out = {}; for (const [k, v] of [["input", "var(--basalt-border-input)"], ["primary", "var(--basalt-text-primary)"], ["selected", "var(--basalt-state-selected)"]]) { probe.style.color = v; out[k] = getComputedStyle(probe).color; } probe.remove(); return { bg: s.backgroundColor, shadow: s.boxShadow, color: s.color, ...out }; });
      let s = await read();
      assert.equal(s.bg, "rgba(0, 0, 0, 0)");
      assert.ok(s.shadow.startsWith(s.input) || s.shadow.includes(s.input), `rest edge is border-input: ${s.shadow}`);
      assert.equal(s.color, s.primary);
      await o.hover();
      await page.waitForFunction(() => { const el = document.querySelector("[data-variant=outline]"); return getComputedStyle(el).boxShadow.includes(getComputedStyle(el).color); });
      s = await read();
      assert.ok(s.shadow.includes(s.primary), `hover edge is primary ink: ${s.shadow}`);
      await page.mouse.down();
      await settle(page);
      s = await read();
      assert.equal(s.bg, s.selected);
      await page.mouse.up();
      assert.deepEqual(await axe(page), []);
    });
  }

  test("outline never toggles (a type error), takes the same box as the other variants and a real border in forced colours", async () => {
    const { page } = await open(`<div><B.Button variant="outline" size="3xl" data-testid="o">L</B.Button><B.Button variant="secondary" size="3xl" data-testid="s">L</B.Button></div>`);
    assert.equal((await box(page.getByTestId("o"))).height, (await box(page.getByTestId("s"))).height);
    assert.equal(await page.getByTestId("o").getAttribute("aria-pressed"), null);
    await page.emulateMedia({ forcedColors: "active" });
    const style = await css(page.getByTestId("o"), "borderTopWidth", "borderTopStyle");
    assert.deepEqual([style.borderTopWidth, style.borderTopStyle], ["1px", "solid"]);
  });
});

describe("D11b: the amount (A8) stays put", () => {
  const amounts = ["$9", "$49", "$1,299.99"];
  test("the label and the button never move while the amount changes", async () => {
    const { page } = await open(`(() => { const App = () => { const [i, setI] = React.useState(0); const a = ${JSON.stringify(amounts)}; return <div style={{ padding: 20 }}><B.Button size="5xl" variant="primary" amount={a[i]} amountReserve={a} data-testid="b" onClick={() => setI((i + 1) % 3)}>Add to cart</B.Button></div>; }; return <App />; })()`);
    const b = page.getByTestId("b");
    const label = page.locator(".basalt-button-label");
    const before = { b: await box(b), label: await box(label) };
    for (let i = 0; i < 3; i += 1) {
      await b.click();
      assert.deepEqual({ b: await box(b), label: await box(label) }, before, `after change ${i + 1}`);
    }
    assert.equal(await page.locator(".basalt-button-amount [data-on]").count(), 1, "one amount is seen");
    assert.equal(await page.locator(".basalt-button-amount [aria-hidden=true]").count(), 3, "the reserved ones are hidden from assistive technology");
    assert.equal(await page.locator(".basalt-button-amount [inert]").count(), 3);
  });

  test("the amount is 0.72 where that holds 4.5:1 (primary, secondary, outline) and full ink on ghost and danger", async () => {
    const { page } = await open(`<div>${["primary", "secondary", "outline", "ghost", "danger"].map((v) => `<B.Button key="${v}" variant="${v}" amount="$49" data-testid="${v}">Add</B.Button>`).join("")}</div>`);
    for (const v of ["primary", "secondary", "outline"]) assert.equal((await css(page.getByTestId(v).locator(".basalt-button-amount"), "opacity")).opacity, "0.72", v);
    for (const v of ["ghost", "danger"]) assert.equal((await css(page.getByTestId(v).locator(".basalt-button-amount"), "opacity")).opacity, "1", v);
    assert.equal((await css(page.getByTestId("primary").locator(".basalt-button-amount"), "fontVariantNumeric")).fontVariantNumeric, "tabular-nums");
  });

  test("a loading button hides the amount with the label, a disabled one keeps it at full ink", async () => {
    const { page } = await open(`<div><B.Button loading amount="$49" data-testid="l">Add</B.Button><B.Button variant="primary" disabled amount="$49" data-testid="d">Add</B.Button></div>`);
    assert.equal((await css(page.getByTestId("l").locator(".basalt-button-amount"), "opacity")).opacity, "0");
    assert.equal((await css(page.getByTestId("d").locator(".basalt-button-amount"), "opacity")).opacity, "1");
  });

  test("the 12px gap on a 56 button, and forced colours draw the amount at full ink", async () => {
    const { page } = await open(`<B.Button size="5xl" variant="primary" amount="$49" data-testid="b">Add to cart</B.Button>`);
    const gap = (await box(page.locator(".basalt-button-amount"))).x - (await box(page.locator(".basalt-button-label"))).x - (await box(page.locator(".basalt-button-label"))).width;
    assert.equal(Math.round(gap), 12);
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal((await css(page.locator(".basalt-button-amount"), "opacity")).opacity, "1");
  });
});

describe("D11d: the count pill (A11, A12)", () => {
  test("the pill is outlined, 24 tall, aria-hidden, secondary at zero and primary above, and the button's name carries the count", async () => {
    const { page } = await open(`<div><B.Button size="2xl" count={0} data-testid="z"><span className="basalt-visually-hidden">Cart, empty</span></B.Button><B.Button size="2xl" count={3} data-testid="n"><span className="basalt-visually-hidden">Cart, 3 items</span></B.Button></div>`);
    const z = page.getByTestId("z").locator(".basalt-button-count"), n = page.getByTestId("n").locator(".basalt-button-count");
    assert.equal((await box(z)).height, 24);
    assert.equal(await z.getAttribute("aria-hidden"), "true");
    const colours = await page.evaluate(() => { const probe = document.createElement("i"); document.body.append(probe); const read = (v) => { probe.style.color = v; return getComputedStyle(probe).color; }; return { secondary: read("var(--basalt-text-secondary)"), primary: read("var(--basalt-text-primary)") }; });
    assert.equal((await css(z, "color")).color, colours.secondary);
    assert.equal((await css(n, "color")).color, colours.primary);
    assert.equal((await css(n, "fontWeight")).fontWeight, "600");
    assert.equal((await css(n, "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)", "never a fill");
    assert.equal(await page.getByRole("button", { name: "Cart, 3 items" }).count(), 1);
  });

  test("0 to 99 never moves the button or what follows it; a third digit widens it", async () => {
    const { page } = await open(`(() => { const App = () => { const [n, setN] = React.useState(0); return <div style={{ display: "flex", padding: 20 }}><B.Button size="2xl" count={n} data-testid="b"><span className="basalt-visually-hidden">Cart</span></B.Button><i id="next" style={{ width: 10, height: 10, background: "red" }} /><b id="set" onClick={() => setN(Number(window.__n))} /></div>; }; return <App />; })()`);
    const widths = {};
    for (const n of [0, 5, 10, 99, 100]) {
      await page.evaluate((n) => { window.__n = n; document.getElementById("set").click(); }, n);
      await page.waitForFunction((n) => document.querySelector(".basalt-button-count span").textContent === String(n), n);
      widths[n] = { b: (await box(page.getByTestId("b"))).width, next: (await box(page.locator("#next"))).x };
    }
    assert.deepEqual([widths[5], widths[10], widths[99]], [widths[0], widths[0], widths[0]], "0 to 99 is one width, and the next thing holds still");
    assert.ok(widths[100].b > widths[99].b, "a third digit widens it");
  });

  test("forced colours draw the pill's edge as a real border", async () => {
    const { page } = await open(`<B.Button size="2xl" count={2} data-testid="b">Cart</B.Button>`);
    await page.emulateMedia({ forcedColors: "active" });
    const style = await css(page.locator(".basalt-button-count"), "borderTopWidth", "borderTopStyle");
    assert.deepEqual([style.borderTopWidth, style.borderTopStyle], ["1px", "solid"]);
  });
});

describe("D11b: a button of two lines", () => {
  const two = (width) => `<div style={{ containerType: "inline-size", width: ${width} }}><B.Button size="xl" note="Allowed by the list" data-testid="b"><code>api.example.com</code></B.Button></div>`;
  test("two lines are at least 64 tall, start-aligned, with the note 13/18 in secondary ink", async () => {
    const { page } = await open(two(600));
    const b = page.getByTestId("b");
    assert.ok((await box(b)).height >= 64);
    const lines = await page.evaluate(() => { const l = document.querySelector(".basalt-button-label"), n = document.querySelector(".basalt-button-note"); const pr = getComputedStyle(n); return { labelY: l.getBoundingClientRect().y, noteY: n.getBoundingClientRect().y, labelX: l.getBoundingClientRect().x, noteX: n.getBoundingClientRect().x, noteSize: pr.fontSize, noteLine: pr.lineHeight, code: getComputedStyle(l.querySelector("code")).fontFamily }; });
    assert.ok(lines.noteY > lines.labelY, "the note is under the label");
    assert.equal(lines.noteX, lines.labelX, "start-aligned");
    assert.equal(lines.noteSize, "13px"); assert.equal(lines.noteLine, "18px");
    assert.match(lines.code, /mono|Menlo|monospace/i);
  });
  test("from 340 up to 480 wide the label and note share one line at 48, 12px apart, baseline-aligned; outside that range they are two lines", async () => {
    for (const [width, lines] of [[339, 2], [340, 1], [479, 1], [480, 2]]) {
      const { page } = await open(two(width));
      const b = page.getByTestId("b");
      const result = await page.evaluate(() => { const l = document.querySelector(".basalt-button-label").getBoundingClientRect(), n = document.querySelector(".basalt-button-note").getBoundingClientRect(); return { sameRow: Math.abs((l.y + l.height) - (n.y + n.height)) < 4, gap: n.x - (l.x + l.width) }; });
      assert.equal(result.sameRow ? 1 : 2, lines, `${width}px wide`);
      if (lines === 1) { assert.equal((await box(b)).height, 48); assert.ok(result.gap >= 12 - 0.5, `at least 12px apart (the end-aligned note takes the room): ${result.gap}`); }
      else assert.ok((await box(b)).height >= 64);
      await page.close();
    }
  });
  test("a disabled one keeps the note's ink as the label's; with no container it stays two lines", async () => {
    const { page } = await open(`<B.Button size="xl" disabled note="n" data-testid="b"><code>x</code></B.Button>`);
    assert.equal((await css(page.locator(".basalt-button-note"), "color")).color, (await css(page.getByTestId("b"), "color")).color);
    assert.ok((await box(page.getByTestId("b"))).height >= 64);
  });
  test("the note is part of the button's name", async () => {
    const { page } = await open(`<B.Button note="Allowed by the list"><code>api.example.com</code></B.Button>`);
    assert.equal(await page.getByRole("button", { name: /api\.example\.com\s*Allowed by the list/ }).count(), 1);
  });
});

describe("D11c: an icon button's done state (A9, A10)", () => {
  const fixture = `(() => { const App = () => { const [done, confirm] = B.useConfirm(); return <div style={{ padding: 20 }}><B.IconButton variant="outline" size="2xl" icon={B.PlusGlyph} label="Add Whey to cart" done={done} data-testid="b" onClick={confirm} /><B.StatusLine>{done ? "Added Whey to cart" : ""}</B.StatusLine></div>; }; return <App />; })()`;
  for (const theme of THEMES) {
    test(`the plus becomes a check in the button's own ink: nothing moves, no fill, the name is unchanged (${theme})`, async () => {
      const { page } = await open(fixture, { theme });
      const b = page.getByTestId("b");
      const rest = { b: await box(b), bg: (await css(b, "backgroundColor")).backgroundColor, color: (await css(b, "color")).color, name: await b.getAttribute("aria-label") };
      const glyphs = page.locator(".basalt-button-swap > .basalt-icon");
      assert.equal((await css(glyphs.nth(0), "opacity")).opacity, "1");
      assert.equal((await css(glyphs.nth(1), "opacity")).opacity, "0");
      await b.click();
      await page.waitForFunction(() => document.querySelector("[data-done]") !== null);
      await settle(page);
      assert.equal((await css(glyphs.nth(0), "opacity")).opacity, "0");
      assert.equal((await css(glyphs.nth(1), "opacity")).opacity, "1");
      const done = { b: await box(b), bg: (await css(b, "backgroundColor")).backgroundColor, color: (await css(b, "color")).color, name: await b.getAttribute("aria-label") };
      assert.deepEqual(done, rest, "same box, same fill (none), same ink, same name");
      assert.equal(await b.getAttribute("aria-pressed"), null, "not a toggle, no selected plate");
      assert.deepEqual(await axe(page), []);
    });
  }
  test("the check holds for 1500ms on the frozen clock and then returns; calling again restarts the hold", async () => {
    const { page } = await open(fixture, { clock: true });
    const b = page.getByTestId("b");
    const done = () => page.evaluate(() => document.querySelector("[data-testid=b]").hasAttribute("data-done"));
    await b.click();
    assert.equal(await done(), true);
    await page.clock.runFor(1499);
    assert.equal(await done(), true, "still done at 1499ms");
    await page.clock.runFor(2);
    assert.equal(await done(), false, "rest at 1501ms");
    await b.click();
    await page.clock.runFor(1000);
    await b.click();
    await page.clock.runFor(1000);
    assert.equal(await done(), true, "restarted at the second press");
    await page.clock.runFor(501);
    assert.equal(await done(), false);
  });
  test("the 100ms crossfade stays under reduced motion", async () => {
    const { page } = await open(fixture);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal((await css(page.locator(".basalt-button-swap > .basalt-icon").nth(1), "transitionDuration")).transitionDuration, "0.1s");
    assert.equal((await css(page.locator(".basalt-button-swap > .basalt-icon").nth(0), "transitionProperty")).transitionProperty, "opacity");
  });
  test("the timer is cleared when the button unmounts (no update after it)", async () => {
    const { page, errors } = await open(`(() => { const App = () => { const [on, setOn] = React.useState(true); return on ? <Inner off={() => setOn(false)} /> : <p id="gone">gone</p>; }; const Inner = ({ off }) => { const [done, confirm] = B.useConfirm(); return <B.IconButton icon={B.PlusGlyph} label="Add" done={done} data-testid="b" onClick={() => { confirm(); off(); }} />; }; return <App />; })()`, { clock: true });
    await page.getByTestId("b").click();
    await page.clock.runFor(2000);
    assert.equal(await page.locator("#gone").count(), 1);
    assert.deepEqual(errors, []);
  });
  test("a loading or disabled quick add still shows one glyph and keeps its seat", async () => {
    const { page } = await open(`<B.IconButton icon={B.PlusGlyph} label="Add" size="2xl" done={false} disabled data-testid="b" />`);
    assert.equal((await box(page.getByTestId("b"))).width, 44);
  });
});

describe("X12: a full-width Button", () => {
  test("it is as wide as its space with the label centred, and changes nothing for a button not using it", async () => {
    const { page } = await open(`<div style={{ width: 360, padding: 0 }}><B.Button fullWidth size="3xl" variant="primary" data-testid="w">Review order</B.Button><B.Button size="3xl" variant="primary" data-testid="n">Review order</B.Button></div>`);
    const w = page.getByTestId("w"), n = page.getByTestId("n");
    assert.equal((await box(w)).width, 360);
    assert.ok((await box(n)).width < 360);
    const label = await box(w.locator(".basalt-button-label")), whole = await box(w);
    assert.ok(Math.abs(label.x + label.width / 2 - (whole.x + 180)) < 1, "centred");
    assert.equal((await box(w)).height, (await box(n)).height);
  });
});

describe("D5d: the text button (A1)", () => {
  for (const theme of THEMES) {
    test(`it has no box and no height, the text's own font, a 1px underline 3px off in the input boundary that goes to ink on hover (${theme})`, async () => {
      const { page } = await open(`<p style={{ font: "400 17px/28px serif", width: 600 }}>Run <B.TextButton data-testid="t">this command</B.TextButton> now.</p>`, { theme });
      const t = page.getByTestId("t");
      const style = await css(t, "backgroundColor", "borderTopWidth", "paddingTop", "paddingLeft", "fontFamily", "fontSize", "borderTopLeftRadius");
      assert.deepEqual([style.backgroundColor, style.borderTopWidth, style.paddingTop, style.paddingLeft], ["rgba(0, 0, 0, 0)", "0px", "0px", "0px"]);
      assert.equal(style.fontSize, "17px");
      assert.match(style.fontFamily, /serif/);
      assert.equal(style.borderTopLeftRadius, "4px");
      assert.ok((await box(t)).height <= 30, "no control height: it is the line");
      const label = page.locator(".basalt-text-button-label");
      const u = await css(label, "textDecorationLine", "textDecorationThickness", "textUnderlineOffset", "textDecorationColor");
      assert.deepEqual([u.textDecorationLine, u.textDecorationThickness, u.textUnderlineOffset], ["underline", "1px", "3px"]);
      const colours = await page.evaluate(() => { const p = document.createElement("i"); document.body.append(p); const read = (v) => { p.style.color = v; return getComputedStyle(p).color; }; return { input: read("var(--basalt-border-input)"), primary: read("var(--basalt-text-primary)") }; });
      assert.equal(u.textDecorationColor, colours.input);
      assert.equal((await css(t, "color")).color, colours.primary);
      await t.hover();
      await page.waitForFunction(() => { const l = document.querySelector(".basalt-text-button-label"); return getComputedStyle(l).textDecorationColor === getComputedStyle(l).color; });
    });
  }
  test("the quiet form is secondary at rest and primary on hover; a chevron after the words is not underlined", async () => {
    const { page } = await open(`<p><B.TextButton quiet iconEnd={B.ChevronRightGlyph} data-testid="t">Show more</B.TextButton></p>`);
    const t = page.getByTestId("t");
    const colours = await page.evaluate(() => { const p = document.createElement("i"); document.body.append(p); const read = (v) => { p.style.color = v; return getComputedStyle(p).color; }; return { secondary: read("var(--basalt-text-secondary)"), primary: read("var(--basalt-text-primary)") }; });
    assert.equal((await css(t, "color")).color, colours.secondary);
    assert.equal((await css(t.locator(".basalt-icon"), "textDecorationLine")).textDecorationLine, "none");
    await t.hover();
    await page.waitForFunction((c) => getComputedStyle(document.querySelector("[data-testid=t]")).color === c, colours.primary);
  });
  test("it has no pressed look: aria-pressed is not passed to the type and does nothing to the look", async () => {
    const { page } = await open(`<p><B.TextButton data-testid="t">Week</B.TextButton></p>`);
    const t = page.getByTestId("t");
    const before = await css(t.locator(".basalt-text-button-label"), "textDecorationLine", "color");
    await t.click();
    assert.deepEqual(await css(t.locator(".basalt-text-button-label"), "textDecorationLine", "color"), before);
    assert.equal(await t.getAttribute("aria-pressed"), null);
  });
  test("focus is the control ring at +2, outside", async () => {
    const { page } = await open(`<p><B.TextButton data-testid="t">Run</B.TextButton></p>`);
    await page.keyboard.press("Tab");
    const ring = await css(page.getByTestId("t"), "outlineWidth", "outlineStyle", "outlineOffset");
    assert.deepEqual([ring.outlineWidth, ring.outlineStyle, ring.outlineOffset], ["2px", "solid", "2px"]);
  });
  test("a disabled text button keeps focus when asked and shows the disabled ink", async () => {
    const { page } = await open(`<p><B.TextButton disabled focusableWhenDisabled data-testid="t">Run</B.TextButton></p>`);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-testid")), "t");
  });
  test("on touch a text button on its own line has a 44px hit box and changes no layout; one in a sentence keeps its line", async () => {
    const jsx = `<div style={{ width: 340 }}><div data-testid="own"><B.TextButton data-testid="a">Show more</B.TextButton></div><p>Then <B.TextButton data-testid="s">run it</B.TextButton> here.</p></div>`;
    const desktop = await open(jsx);
    const flow = async (page) => ({ own: await box(page.getByTestId("own")), a: await box(page.getByTestId("a")) });
    const rest = await flow(desktop.page);
    const { page } = await open(jsx, PHONE);
    const touch = await flow(page);
    assert.equal(touch.own.height, rest.own.height, "the line it is on does not change");
    assert.equal(touch.a.width, rest.a.width);
    const hit = (testid) => page.getByTestId(testid).evaluate((el) => { const r = el.getBoundingClientRect(), b = getComputedStyle(el, "::before"); return { content: b.content, height: parseFloat(b.height), width: parseFloat(b.width) }; });
    const own = await hit("a");
    assert.equal(own.height, 44);
    assert.ok(own.width >= 44);
    assert.equal((await hit("s")).content, "none", "inside a sentence: the line it is on");
  });
  test("axe, in both themes, with a pair of text buttons and a button", async () => {
    for (const theme of THEMES) {
      const { page } = await open(`<div><p>Open <B.TextButton>the file</B.TextButton> or <B.TextButton quiet iconEnd={B.ChevronRightGlyph}>more</B.TextButton></p><B.Button variant="outline" size="3xl" amount="$4" count={2}>Go</B.Button></div>`, { theme });
      assert.deepEqual(await axe(page), [], theme);
      await page.close();
    }
  });
});
