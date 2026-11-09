// Behaviour of the motion primitives (PRs 12 and 13), driven in Chromium against the built package.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const mountable = (components, kinds) => `${components}
const root = createRoot(document.getElementById("root"));
window.show = (kind, props = {}) => flushSync(() => root.render(React.createElement(kinds[kind], props)));
const kinds = ${kinds};
`;

describe("NumberTicker", () => {
  const ticker = mountable("", `{
    glide: (p) => <B.NumberTicker value={p.value ?? 1.25} glide format={p.format ? (v) => { (window.seen ??= []).push(v); return v.toFixed(2); } : (v) => v.toFixed(2)} />,
    plain: (p) => <B.NumberTicker value={p.value ?? 1284} />,
    decimals: (p) => <B.NumberTicker value={p.value ?? 1234.5} glide />,
  }`);

  test("glide hands the eased value to a custom formatter, and settles on the target's digits", async () => {
    const { page } = await fixturePage(browser, ticker);
    await page.evaluate(() => window.show("glide", { value: 0, format: true }));
    await page.evaluate(() => window.show("glide", { value: 1.25, format: true }));
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => window.seen);
    assert.ok(seen.some((v) => !Number.isInteger(v) && v > 0 && v < 1.25), `the formatter only saw ${seen.slice(0, 6)}`);
    const digits = await page.locator(".basalt-ticker").evaluate((el) => ({
      spoken: el.querySelector(".basalt-visually-hidden").textContent,
      selected: [...el.querySelectorAll(".basalt-ticker-digit")].map((d) => d.style.getPropertyValue("--_d")),
    }));
    assert.deepEqual(digits, { spoken: "1.25", selected: ["1", "2", "5"] });
    await page.close();
  });

  test("without a formatter a glide keeps the target's number of decimals and its grouping", async () => {
    const { page } = await fixturePage(browser, ticker);
    await page.evaluate(() => window.show("decimals", { value: 0 }));
    await page.evaluate(() => window.show("decimals", { value: 1234.5 }));
    await page.waitForTimeout(1500);
    assert.equal(await page.locator(".basalt-ticker .basalt-visually-hidden").textContent(), "1,234.5");
    const shown = await page.locator(".basalt-ticker-visual").evaluate((el) => [...el.children].map((c) => c.classList.contains("basalt-ticker-char") ? c.textContent : c.querySelector(".basalt-ticker-strip").parentElement.style.getPropertyValue("--_d")).join(""));
    assert.equal(shown, "1,2345".replace("1,2345", "1,234.5"));
    await page.close();
  });
});

describe("Slide", () => {
  test("changing the key animates the same node, so a field inside keeps its value and focus", async () => {
    const { page } = await fixturePage(browser, mountable("", `{ slide: (p) => <B.Slide direction="forward" changeKey={p.changeKey ?? "a"}><input defaultValue="draft" aria-label="Slide input" /></B.Slide> }`));
    await page.evaluate(() => window.show("slide"));
    const input = page.getByRole("textbox");
    await input.fill("edited");
    await input.focus();
    await page.evaluate(() => { window.before = document.querySelector(".basalt-slide"); window.input = document.querySelector("input"); });
    await page.evaluate(() => window.show("slide", { changeKey: "b" }));
    const after = await page.evaluate(() => ({
      sameWrapper: window.before === document.querySelector(".basalt-slide"),
      sameInput: window.input === document.querySelector("input"),
      value: document.querySelector("input").value,
      focus: document.activeElement?.tagName,
      animations: document.querySelector(".basalt-slide").getAnimations().map((a) => a.animationName),
    }));
    assert.deepEqual(after, { sameWrapper: true, sameInput: true, value: "edited", focus: "INPUT", animations: ["basalt-slide-forward"] });
    // and it replays on every change, not only the first
    await settle(page);
    await page.evaluate(() => window.show("slide", { changeKey: "c" }));
    assert.deepEqual(await page.evaluate(() => document.querySelector(".basalt-slide").getAnimations().map((a) => a.animationName)), ["basalt-slide-forward"]);
    await page.close();
  });
});

describe("MorphIcon", () => {
  // The strokes as drawn: [x0, y0, x3, y3] for each path in the stroke group.
  const lines = (page) => page.locator(".basalt-morph g[stroke='currentColor'] path").evaluateAll((els) => els.map((el) => {
    const n = el.getAttribute("d").match(/-?\d*\.?\d+/g).map(Number);
    return [n[0], n[1], n[n.length - 2], n[n.length - 1]];
  }));
  // the glyph of a name: "chevron-down" is B.ChevronDownGlyph
  const icon = mountable(`const glyphOf = (name) => B[name.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("") + "Glyph"];`, `{ icon: (p) => <B.MorphIcon glyph={glyphOf(p.name)} selected={p.selected} /> }`);
  const distance = (a, b) => Math.max(...a.flat().map((v, i) => Math.abs(v - b.flat()[i])));
  const MENU = [[5, 7, 19, 7], [5, 12, 19, 12], [5, 17, 19, 17]];

  test("an interrupted morph is judged against the flight, not the drawing: reversing runs back from what is on screen", async () => {
    // The morph steps on requestAnimationFrame and performance.now, so the clock is Playwright's: time moves only on runFor.
    const { page } = await fixturePage(browser, icon, { clock: true });
    await page.evaluate(() => window.show("icon", { name: "menu" }));
    await page.evaluate(() => window.show("icon", { name: "close" }));
    await page.clock.runFor(70);
    // With time frozen, what is on screen cannot move between reading it, interrupting, and reading again.
    const shown = await lines(page);
    assert.ok(distance(shown, MENU) > 1, "the morph has not started moving");
    await page.evaluate(() => window.show("icon", { name: "menu" }));
    const reversed = await lines(page);
    assert.ok(distance(shown, reversed) < 0.5, `jumped ${distance(shown, reversed)} units`);
    await page.clock.runFor(400);
    assert.deepEqual(await lines(page), MENU, "it ran back to the menu");
    await page.close();
  });

  test("a morph interrupted by a change the council did not allow swaps at once, whatever is on screen", async () => {
    const { page } = await fixturePage(browser, icon, { clock: true });
    await page.evaluate(() => window.show("icon", { name: "menu" }));
    await page.evaluate(() => window.show("icon", { name: "close" }));
    await page.clock.runFor(70);
    await page.evaluate(() => window.show("icon", { name: "check" }));
    assert.deepEqual(await lines(page), [[5, 13, 10, 18], [10, 18, 19, 7]], "check is drawn in the same frame, not blended");
    await page.clock.runFor(400);
    assert.deepEqual(await lines(page), [[5, 13, 10, 18], [10, 18, 19, 7]]);
    await page.close();
  });

  test("a turn interrupted part-way carries on from the angle on screen, and stays the same drawing", async () => {
    const { page } = await fixturePage(browser, icon, { clock: true });
    await page.evaluate(() => window.show("icon", { name: "plus" }));
    await page.evaluate(() => window.show("icon", { name: "close" }));
    await page.clock.runFor(48);
    const [first] = await lines(page);
    const angle = (Math.atan2(first[3] - first[1], first[2] - first[0]) * 180) / Math.PI;
    assert.ok(angle > 1 && angle < 44, `the turn is part-way at ${angle}°`);
    await page.evaluate(() => window.show("icon", { name: "plus" }));
    const [again] = await lines(page);
    assert.ok(Math.abs(Math.hypot(again[2] - again[0], again[3] - again[1]) - 14) < 0.01, "the long stroke is still 14 units");
    assert.ok(Math.abs((Math.atan2(again[3] - again[1], again[2] - again[0]) * 180) / Math.PI - angle) < 0.01, "it did not jump");
    await page.close();
  });

  test("MorphIcon holds no drawings of its own: the set is drawn once, in the glyph modules", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../src/morph-icon.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bICONS\b|\bARROW\b|\bCHEVRON\b/);
  });
});

describe("Toast", () => {
  const toasts = mountable(`function Probe(){const t=B.useToast();React.useEffect(()=>{window.show_=t.show;window.close_=t.close},[t]);return null}`, `{ toast: () => <B.ToastProvider><Probe/></B.ToastProvider>, empty: () => null }`);
  const drains = (page) => page.locator(".basalt-toast").evaluateAll((els) => els.map((el) => {
    const drain = el.querySelector(".basalt-toast-drain");
    return { title: el.querySelector(".basalt-toast-title").textContent, state: drain && getComputedStyle(drain).animationPlayState, duration: drain && getComputedStyle(drain).animationDuration, scale: drain && new DOMMatrix(getComputedStyle(drain).transform).a };
  }));

  test("every drain line pauses and resumes with the stack, as the timers do", async () => {
    const { page } = await fixturePage(browser, toasts);
    await page.evaluate(() => window.show("toast"));
    await page.evaluate(() => window.show_({ title: "Toast A", timeout: 4000 }));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.show_({ title: "Toast B", timeout: 4000 }));
    await page.waitForTimeout(200);
    assert.deepEqual((await drains(page)).map((d) => d.state), ["running", "running"]);
    await page.getByText("Toast B", { exact: true }).hover();
    await page.waitForTimeout(150);
    assert.deepEqual((await drains(page)).map((d) => d.state), ["paused", "paused"], "hovering one toast holds them all");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    assert.deepEqual((await drains(page)).map((d) => d.state), ["running", "running"]);
    // the window losing focus holds them too, and giving it back lets them go
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForTimeout(50);
    assert.deepEqual((await drains(page)).map((d) => d.state), ["paused", "paused"]);
    await page.evaluate(() => window.dispatchEvent(new FocusEvent("focus")));
    await page.waitForTimeout(50);
    assert.deepEqual((await drains(page)).map((d) => d.state), ["running", "running"]);
    await page.close();
  });

  test("a toast the pointer left behind still has time on its line while another is hovered", async () => {
    const { page } = await fixturePage(browser, toasts);
    await page.evaluate(() => window.show("toast"));
    await page.evaluate(() => window.show_({ title: "Toast A", timeout: 1500 }));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.show_({ title: "Toast B", timeout: 1500 }));
    await page.waitForTimeout(200);
    await page.getByText("Toast B", { exact: true }).hover();
    await page.waitForTimeout(2000); // longer than either timeout, but the timers are held
    const held = await drains(page);
    assert.equal(held.length, 2, "both toasts are still shown");
    for (const d of held) assert.ok(d.scale > 0.05, `${d.title} ran out while its timer was held (${d.scale})`);
    await page.close();
  });

  test("a toast's timeout lives on the toast: its line lasts that long, and 0 has no line", async () => {
    const { page } = await fixturePage(browser, toasts);
    await page.evaluate(() => window.show("toast"));
    await page.evaluate(() => { window.show_({ title: "Default" }); window.show_({ title: "Custom", timeout: 2500 }); window.show_({ title: "Sticky", timeout: 0 }); });
    await page.waitForTimeout(100);
    const byTitle = Object.fromEntries((await drains(page)).map((d) => [d.title, d.duration]));
    assert.deepEqual(byTitle, { Default: "5s", Custom: "2.5s", Sticky: null });
    await page.close();
  });
});

// SharedElement is withdrawn from the public API (see "public API" in modules.test.mjs). It stays as an
// internal module, so its behaviour is still proved, through that module.
describe("SharedElement (internal)", () => {
  const shared = mountable(`import * as S from "./dist/shared-element.js";`, `{ shared: (p) => <div style={{ display: "flex", gap: 200 }}><div>{!p.moved && !p.gone && <S.SharedElement layoutId="same"><b>Item</b></S.SharedElement>}</div><div>{p.moved && <S.SharedElement layoutId="same"><b>Item</b></S.SharedElement>}</div></div> }`);

  test("an element that moves between places in one update still travels", async () => {
    const { page } = await fixturePage(browser, shared);
    await page.evaluate(() => window.show("shared"));
    await page.evaluate(() => window.show("shared", { moved: true }));
    assert.equal(await page.locator("[data-layout]").evaluate((el) => el.getAnimations().length), 1);
    await page.close();
  });

  test("a place is forgotten once its element has gone, so a later arrival does not fly in from it", async () => {
    const { page } = await fixturePage(browser, shared);
    await page.evaluate(() => window.show("shared"));
    await page.evaluate(() => window.show("shared", { gone: true }));
    await page.waitForTimeout(100);
    await page.evaluate(() => window.show("shared", { moved: true }));
    assert.equal(await page.locator("[data-layout]").evaluate((el) => el.getAnimations().length), 0);
    await page.close();
  });
});

describe("TextMorph", () => {
  const morph = mountable("", `{ text: (p) => <B.TextMorph text={p.text ?? "Save"} /> }`);

  test("a very long string changes in place and stays readable", async () => {
    const { page } = await fixturePage(browser, morph);
    const long = "word ".repeat(300);
    await page.evaluate((t) => window.show("text", { text: t }), long);
    await page.evaluate((t) => window.show("text", { text: t + "more" }), long);
    assert.equal((await page.locator(".basalt-text-morph [aria-hidden]").textContent()).length, long.length + 4);
    assert.equal(await page.locator(".basalt-text-morph-glyph").count(), 0, "no per-glyph work past the limit");
    await page.close();
  });

  test("short text is measured into glyphs after mount, and the visible text is never blank", async () => {
    const { page } = await fixturePage(browser, morph);
    await page.evaluate(() => window.show("text", { text: "Save" }));
    assert.equal(await page.locator(".basalt-text-morph-glyph").count(), 4);
    assert.equal(await page.locator(".basalt-text-morph [aria-live]").textContent(), "Save");
    await page.close();
  });
});
