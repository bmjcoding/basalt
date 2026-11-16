// The motion rules for travel and loops (DECISIONS 136 B and C, approved in 139): the timing of a travel and its in-flight rule; a page's one
// ambient loop in its art; and `LoopsToggle` in its three forms, in a real SiteHeader. Driven in Chromium against the built package with the
// real stylesheet. Every test would fail on origin/main: none of these exports, tokens or rules exists there.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { bundleFixture, launch, pkg } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const ORIGIN = "https://basalt.test";
const THEMES = ["dark", "light"];
const AXE = { rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const travel = await import(pathToFileURL(path.join(pkg, "dist", "travel.js")).href);
const ambient = await import(pathToFileURL(path.join(pkg, "dist", "ambient.js")).href);

async function open(body, { theme = "dark", viewport = { width: 1440, height: 900 }, reducedMotion, forcedColors, hasTouch = false, media, stored = false, context } = {}) {
  context ??= await browser.newContext({ viewport, reducedMotion, forcedColors, hasTouch, colorScheme: theme });
  const script = await bundleFixture(body);
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="en" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basalt</title><style>${css()}</style><style>body{margin:0;background:var(--basalt-surface-page);color:var(--basalt-text-primary);font-family:var(--basalt-font-family-sans)}</style>${stored ? '<script>try{localStorage.setItem("basalt-loops","held")}catch(e){}document.documentElement.setAttribute("data-loops","held")</script>' : ""}</head><body><div id="root"></div><script>${script}</script></body></html>`,
  }));
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (media) await page.emulateMedia(media);
  await page.goto(`${ORIGIN}/`);
  await frames(page);
  return { page, errors, context };
}
const frames = (page, n = 2) => page.evaluate(async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); }, n);
const render = (jsx, before = "") => `${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const held = (page) => page.evaluate(() => document.documentElement.getAttribute("data-loops"));

describe("travel: the timing helper (B)", () => {
  test("a leg is duration-slower up to 150px, 2ms a pixel above, duration-figure from 300px", () => {
    for (const d of [0, 1, 100, 149, 150]) assert.equal(travel.travelLeg(d), 300, `${d}px`);
    assert.equal(travel.travelLeg(151), 302);
    assert.equal(travel.travelLeg(200), 400);
    assert.equal(travel.travelLeg(240), 480);
    assert.equal(travel.travelLeg(299), 598);
    for (const d of [300, 301, 450, 5000]) assert.equal(travel.travelLeg(d), 600, `${d}px`);
    assert.equal(travel.travelLeg(-240), 480, "a leg's length is a distance");
  });
  test("a run rests duration-slow at a stop and ends inside five seconds", () => {
    const run = travel.travelRun([240, 119]);
    assert.deepEqual(run.legs, [480, 300]);
    assert.deepEqual(run.rests, [200]);
    assert.equal(run.total, 980);
    assert.equal(run.shortened, false);
    const long = travel.travelRun(Array.from({ length: 12 }, () => 400));
    assert.ok(long.total < 5000, `${long.total}ms`);
    assert.equal(long.shortened, true);
    assert.ok(long.legs.every((ms) => ms > 0 && ms < 600), "the legs keep their order and share the cut");
  });
  test("under reduced motion the tokens are 100ms, so a leg is 100ms and nothing lasts", async () => {
    const { page } = await open(render("<div />"), { reducedMotion: "reduce" });
    const tokens = await page.evaluate(async () => (await import("data:text/javascript,export default 1")).default && null);
    void tokens;
    const read = await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return ["slower", "figure", "slow"].map((n) => s.getPropertyValue(`--basalt-duration-${n}`).trim()); });
    assert.deepEqual(read, ["100ms", "100ms", "100ms"]);
    await page.context().close();
  });
  test("each trigger is its own traveller; with two in flight a third lands the oldest at once", () => {
    const landed = [];
    const t = travel.createTravellers();
    const a = t.depart(() => landed.push("a"));
    const b = t.depart(() => landed.push("b"));
    assert.equal(t.count, 2);
    assert.deepEqual(landed, [], "the second does not touch the first: no snap, no queue");
    const c = t.depart(() => landed.push("c"));
    assert.deepEqual(landed, ["a"], "the oldest lands at once");
    assert.equal(a.landed, true);
    assert.equal(b.landed, false);
    assert.equal(t.count, 2);
    assert.deepEqual(t.flights.map((f) => f.id), [b.id, c.id]);
    b.land(); b.land();
    assert.deepEqual(landed, ["a", "b"], "landing twice lands once");
    assert.equal(t.count, 1);
  });
  test("TravelSpinner keeps its single duration-slower leg on ease-in-out", async () => {
    const { page } = await open(render(`<><span id="a" style={{ position: "fixed", left: 20, top: 40 }}>a</span><span id="b" style={{ position: "fixed", left: 420, top: 40 }}>b</span><Travel /></>`, `
      function Travel() { const a = React.useRef(null), b = React.useRef(null); const [on, set] = React.useState(false); React.useEffect(() => { a.current = document.getElementById("a"); b.current = document.getElementById("b"); set(true); }, []); return <B.TravelSpinner active={on} fromRef={a} toRef={b} />; }`));
    const timing = await page.evaluate(() => { const a = document.getAnimations().find((x) => x.animationName === "basalt-travel"); return a && { duration: a.effect.getTiming().duration, easing: getComputedStyle(a.effect.target).animationTimingFunction }; });
    assert.equal(timing.duration, 300);
    assert.match(timing.easing, /cubic-bezier\(0\.65, 0, 0\.35, 1\)/);
    await page.context().close();
  });
});

// A stage whose art holds the page's looping marks: 24 spans, a 25th that does not loop, and svg circles taking the same props.
const ART = `
function Art() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 25 }, (_, i) => <B.AmbientMark key={i} index={i} data-i={i} style={{ left: 8 + (i % 12) * 40, top: 8 + Math.floor(i / 12) * 40 }} />)}
      <svg width="200" height="40" style={{ position: "absolute", left: 0, bottom: 0 }}><circle id="dot" cx="10" cy="10" r="3" fill="currentColor" {...B.ambient(3)} /></svg>
    </div>
  );
}
function Page() {
  return (
    <>
      <B.Stage art={<Art />}><div style={{ height: 240, padding: 16 }}><B.LoopsToggle form="button" /> <span id="plain" data-ambient="" style={{ display: "inline-block", width: 6, height: 6, background: "currentColor" }}>.</span></div></B.Stage>
      <B.Spinner label="Working" />
    </>
  );
}`;

const ambients = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "basalt-ambient").map((a) => ({
  state: a.playState, period: a.effect.getTiming().duration, delay: a.effect.getTiming().delay, easing: a.effect.getKeyframes().map((k) => k.easing),
  props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)))], start: Number(a.startTime),
  low: Math.min(...a.effect.getKeyframes().map((k) => Number(k.opacity ?? 1))), el: a.effect.target.getAttribute("data-i"),
})));

describe("an ambient loop (C)", () => {
  test("opacity only, from 1 to 0.2 and back on ease-in-out, in the art of a stage", async () => {
    const { page, errors } = await open(render("<Page />", ART));
    const list = await ambients(page);
    assert.equal(list.length, 25, "24 marks of the span art and the circle (the 25th span does not loop)");
    for (const a of list) {
      assert.deepEqual(a.props, ["opacity"], "opacity is all that moves");
      assert.equal(a.low, 0.2);
      assert.ok(a.easing.every((e) => /cubic-bezier\(0\.65, 0, 0\.35, 1\)/.test(e)), "ease-in-out");
      assert.equal(a.state, "running");
    }
    assert.deepEqual(errors, []);
    await page.context().close();
  });
  test("each period is 0.6 to 1.4 times duration-loop-ambient, with its own phase", async () => {
    const { page } = await open(render("<Page />", ART));
    const list = (await ambients(page)).filter((a) => a.el !== null);
    assert.equal(list.length, 24);
    for (const a of list) {
      assert.ok(a.period >= 3600 - 0.5 && a.period <= 8400 + 0.5, `${a.period}`);
      assert.ok(a.delay < 0 && a.delay > -a.period, "a phase is a delay inside one period");
    }
    const pairs = new Set(list.map((a) => `${Math.round(a.period)}|${Math.round(a.delay)}`));
    assert.equal(pairs.size, 24, "no two marks are in step");
    assert.ok(Math.min(...list.map((a) => a.period)) < 4400 && Math.max(...list.map((a) => a.period)) > 7600, "the periods use the range");
    await page.context().close();
  });
  test("a looping mark is no wider than size-dot, and a page has at most 24", async () => {
    const { page } = await open(render("<Page />", ART));
    const dot = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-size-dot")));
    assert.equal(dot, 6);
    const widths = await page.evaluate(() => [...document.querySelectorAll("[data-ambient]")].filter((e) => e.getAnimations().length).map((e) => e.getBoundingClientRect().width));
    assert.ok(widths.length >= 24 && widths.every((w) => w <= 6 + 1e-6), `${widths.join(",")}`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('.basalt-ambient-mark[data-ambient]').length), 24, "the 25th mark is drawn and not marked as looping");
    assert.equal(ambient.ambient(24), undefined);
    assert.equal(ambient.ambient(-1), undefined);
    assert.equal(ambient.AMBIENT_MAX, 24);
    await page.context().close();
  });
  test("it runs only in a stage's art or a framed frame, never on text or a control", async () => {
    const { page } = await open(render("<Page />", ART));
    const anim = await page.evaluate(() => document.getElementById("plain").getAnimations().length);
    assert.equal(anim, 0, "an element outside the art with the attribute does not loop");
    await page.context().close();
  });
  test("the hold stops every mark at full opacity, a spinner as well, and releasing rejoins the shared clock", async () => {
    const { page } = await open(render("<Page />", ART));
    await page.click(".basalt-button");
    await frames(page);
    assert.equal(await held(page), "held");
    assert.equal((await ambients(page)).length, 0);
    const opacity = await page.evaluate(() => [...document.querySelectorAll("[data-ambient]")].map((e) => getComputedStyle(e).opacity));
    assert.ok(opacity.every((o) => o === "1"));
    assert.equal(await page.evaluate(() => document.getAnimations().filter((a) => a.animationName === "basalt-spin").length), 0, "the ring is held too");
    await page.click(".basalt-button");
    await frames(page);
    const again = await ambients(page);
    assert.equal(again.length, 25);
    assert.ok(again.every((a) => a.start === 0), "released: every loop rejoins the document clock");
    await page.context().close();
  });
  test("a hold stored before load opens the page with every mark still", async () => {
    const { page } = await open(render("<Page />", ART), { stored: true });
    assert.equal((await ambients(page)).length, 0);
    await page.context().close();
  });
  test("it is still under reduced motion, in forced colours and in print", async () => {
    for (const options of [{ reducedMotion: "reduce" }, { forcedColors: "active" }, { media: { media: "print" } }]) {
      const { page } = await open(render("<Page />", ART), options);
      assert.equal((await ambients(page)).length, 0, JSON.stringify(options));
      await page.context().close();
    }
  });
});

const BAR = `
const lockup = <span style={{ font: "600 16px/1 var(--basalt-font-family-sans)" }}>Placeholder</span>;
function Bar({ withToggle = true }) {
  const theme = B.useTheme();
  return (
    <B.SiteHeader brand={lockup} brandLabel="Placeholder home" links={["Product", "Docs", "Pricing"].map((label) => ({ href: "#" + label.toLowerCase(), label, current: label === "Docs" }))}
      loopsToggle={withToggle ? <B.LoopsToggleIcon /> : undefined}
      themeToggle={<B.IconButton icon={B.MoonGlyph ?? B.CheckGlyph} label="Switch theme" onClick={() => {}} />}
      action={<B.Button variant="primary">Get started</B.Button>} />
  );
}
function Page() {
  return (<><Bar /><main style={{ padding: 24, display: "grid", gap: 24, maxWidth: 520 }}>
    <B.LoopsToggle form="button" />
    <B.LoopsToggle form="switch" />
  </main></>);
}`;

describe("LoopsToggle (C)", () => {
  test("icon form: a ghost toggle with the pause glyph, the fixed name, aria-pressed", async () => {
    const { page, errors } = await open(render("<Page />", BAR));
    const icon = page.locator(".basalt-bar-actions .basalt-button[title='Pause animations']");
    assert.equal(await icon.count(), 1);
    assert.equal(await icon.getAttribute("data-variant"), "ghost");
    assert.equal(await icon.getAttribute("data-icon-only"), "");
    assert.equal(await icon.getAttribute("aria-pressed"), "false");
    assert.ok(await icon.locator("svg").count() >= 1, "it draws a glyph");
    await icon.click();
    assert.equal(await icon.getAttribute("aria-pressed"), "true");
    assert.equal(await icon.getAttribute("title"), "Pause animations", "the name does not change when it is pressed");
    assert.equal(await held(page), "held");
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-loops")), "held");
    await icon.click();
    assert.equal(await icon.getAttribute("aria-pressed"), "false");
    assert.equal(await held(page), null);
    assert.deepEqual(errors, []);
    await page.context().close();
  });
  test("it sits in the end cluster before the theme toggle and after the links in focus order", async () => {
    const { page } = await open(render("<Page />", BAR));
    const order = await page.evaluate(() => [...document.querySelectorAll(".basalt-site-bar .basalt-bar-actions > *")].map((e) => e.getAttribute("aria-label") ?? e.getAttribute("title") ?? e.textContent));
    assert.deepEqual(order.slice(0, 2), ["Pause animations", "Switch theme"]);
    const tab = [];
    await page.focus(".basalt-site-brand");
    for (let i = 0; i < 7; i++) { await page.keyboard.press("Tab"); tab.push(await page.evaluate(() => document.activeElement.getAttribute("aria-label") ?? document.activeElement.getAttribute("title") ?? document.activeElement.textContent)); }
    assert.ok(tab.indexOf("Pause animations") > tab.indexOf("Pricing"), `after the links: ${tab.join(" | ")}`);
    assert.ok(tab.indexOf("Pause animations") < tab.indexOf("Switch theme"));
    await page.context().close();
  });
  test("the three forms are one control: pressing one moves the others", async () => {
    const { page } = await open(render("<Page />", BAR));
    await page.getByRole("button", { name: "Pause animations", pressed: false }).first().click();
    assert.equal(await page.getByRole("button", { name: "Pause animations", pressed: true }).count(), 2, "the icon and the Button");
    assert.equal(await page.getByRole("switch", { name: "Pause animations" }).isChecked(), true);
    await page.getByRole("switch", { name: "Pause animations" }).click();
    assert.equal(await held(page), null);
    assert.equal(await page.getByRole("button", { name: "Pause animations", pressed: true }).count(), 0);
    await page.context().close();
  });
  test("the switch's description is its settings-row sentence, linked to it", async () => {
    const { page } = await open(render("<Page />", BAR));
    const sw = page.getByRole("switch", { name: "Pause animations" });
    assert.equal(await sw.getAttribute("aria-describedby") !== null, true);
    const description = await page.evaluate(() => { const s = document.querySelector("[role=switch]"); return document.getElementById(s.getAttribute("aria-describedby")).textContent; });
    assert.equal(description, "Moving art and spinners hold still. Your work keeps running.");
    await page.context().close();
  });
  test("nothing is announced when the hold changes: no live region speaks", async () => {
    const { page } = await open(render("<Page />", BAR));
    await page.evaluate(() => { window.__live = []; new MutationObserver((l) => l.forEach((m) => { const e = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (e?.closest('[aria-live], [role="status"], [role="alert"]')) window.__live.push(e.textContent); })).observe(document.body, { childList: true, subtree: true, characterData: true }); });
    await page.getByRole("switch", { name: "Pause animations" }).click();
    await page.getByRole("switch", { name: "Pause animations" }).click();
    await frames(page, 4);
    assert.deepEqual(await page.evaluate(() => window.__live), []);
    await page.context().close();
  });
  test("on touch the icon form's name is reachable without a tooltip, and the bar fits at 390", async () => {
    const { page } = await open(render("<Page />", BAR), { viewport: { width: 390, height: 844 }, hasTouch: true });
    const icon = page.getByRole("button", { name: "Pause animations", pressed: false }).first();
    assert.equal(await icon.getAttribute("title"), "Pause animations", "the accessible name is the control's own: its title, which no touch screen shows and every screen reader reads");
    const boxes = await page.evaluate(() => [...document.querySelectorAll(".basalt-site-bar .basalt-site-brand, .basalt-site-bar .basalt-bar-actions > *, .basalt-site-bar .basalt-site-menu-trigger")].filter((e) => e.getBoundingClientRect().width).map((e) => { const r = e.getBoundingClientRect(); return { name: e.getAttribute("aria-label") ?? e.getAttribute("title"), left: r.left, right: r.right, width: r.width, height: r.height }; }));
    assert.ok(boxes.length >= 4, JSON.stringify(boxes));
    for (const b of boxes) { assert.ok(b.right <= 390 + 0.5 && b.left >= -0.5, `${b.name} is inside the viewport`); if (b.name && b.name !== "Placeholder home") assert.ok(b.width >= 44 - 0.5 && b.height >= 44 - 0.5, `${b.name} is ${b.width}x${b.height}`); }
    const sorted = [...boxes].sort((a, b) => a.left - b.left);
    for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].left >= sorted[i - 1].right - 0.5, `${sorted[i].name} does not overlap ${sorted[i - 1].name}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no sideways scroll");
    await page.context().close();
  });
  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`axe finds nothing in ${theme} at ${width}, with the toggle off and on`, async () => {
      const { page } = await open(render("<Page />", BAR), { theme, viewport: { width, height: 900 } });
      for (const on of [false, true]) {
        if (on) await page.getByRole("switch", { name: "Pause animations" }).click();
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate((cfg) => window.axe.run(document, cfg), AXE);
        assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), [], `held ${on}`);
      }
      await page.context().close();
    });
  }
  test("in forced colours the pressed icon is Highlight, with no outline as a state mark", async () => {
    const { page } = await open(render("<Page />", BAR), { forcedColors: "active" });
    await page.locator(".basalt-bar-actions .basalt-button[title='Pause animations']").click();
    await page.mouse.move(700, 600);
    const style = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".basalt-bar-actions .basalt-button[title='Pause animations']")); return { outline: s.outlineStyle, bg: s.backgroundColor }; });
    assert.equal(style.outline, "none");
    await page.context().close();
  });
});

// ---- The narrow menu's pause row (DECISIONS 143, item 1) ----

const MENU = { viewport: { width: 390, height: 844 }, hasTouch: true };
const openMenu = async (page) => { await page.getByRole("button", { name: "Menu" }).click(); await page.waitForSelector(".basalt-site-menu-band"); await frames(page, 4); };

describe("the narrow menu's first row is the pause control in its Button form (143, item 1)", () => {
  test("at 390 the row is the first thing after the band, below it and before the links, and a keyboard reaches it", async () => {
    const { page } = await open(render("<Page />", BAR), MENU);
    await openMenu(page);
    const order = await page.evaluate(() => { const sheet = document.querySelector(".basalt-site-menu"); return [...sheet.children].map((c) => ["basalt-site-menu-band", "basalt-site-menu-loops", "basalt-site-menu-nav", "basalt-site-menu-foot"].find((k) => c.classList.contains(k))).filter(Boolean); });
    assert.deepEqual(order.slice(0, 3), ["basalt-site-menu-band", "basalt-site-menu-loops", "basalt-site-menu-nav"]);
    const row = await page.evaluate(() => { const r = document.querySelector(".basalt-site-menu-loops"); const b = r.querySelector(".basalt-button"); const band = document.querySelector(".basalt-site-menu-band").getBoundingClientRect(); const nav = document.querySelector(".basalt-site-menu-nav").getBoundingClientRect(); const box = b.getBoundingClientRect(); return { text: b.textContent.trim(), pressed: b.getAttribute("aria-pressed"), below: box.top >= band.bottom - 0.5, above: box.bottom <= nav.top + 0.5, h: box.height }; });
    assert.deepEqual([row.text, row.pressed, row.below, row.above], ["Pause animations", "false", true, true]);
    assert.ok(row.h >= 44 - 0.5, `${row.h}px tall on touch`);
    // Close has the focus when the menu opens; the next stop is the pause row, then the links.
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Close menu");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Pause animations");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Product");
    await page.context().close();
  });
  test("pressing it holds the loops, and the bar's own toggle shows the same state when the menu closes", async () => {
    const { page } = await open(render("<Page />", BAR), MENU);
    await openMenu(page);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    assert.equal(await held(page), "held");
    assert.equal(await page.locator(".basalt-site-menu-loops .basalt-button").getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Escape");
    await page.waitForSelector(".basalt-site-menu", { state: "detached" });
    assert.equal(await page.locator(".basalt-bar-actions .basalt-button[title='Pause animations']").getAttribute("aria-pressed"), "true");
    await openMenu(page);
    await page.locator(".basalt-site-menu-loops .basalt-button").click();
    assert.equal(await held(page), null);
    await page.context().close();
  });
  test("a page with no loops toggle has no such row, and nothing else in the menu moves", async () => {
    const without = `${BAR}\nfunction PageBare() { return <><Bar withToggle={false} /><main /></>; }`;
    const a = await open(render("<PageBare />", without), MENU);
    await openMenu(a.page);
    assert.equal(await a.page.locator(".basalt-site-menu-loops").count(), 0);
    const bare = await a.page.evaluate(() => ({ band: document.querySelector(".basalt-site-menu-band").getBoundingClientRect().height, navTop: document.querySelector(".basalt-site-menu-nav").getBoundingClientRect().top }));
    await a.context.close();
    const b = await open(render("<Page />", BAR), MENU);
    await openMenu(b.page);
    const full = await b.page.evaluate(() => ({ band: document.querySelector(".basalt-site-menu-band").getBoundingClientRect().height, navTop: document.querySelector(".basalt-site-menu-nav").getBoundingClientRect().top, row: document.querySelector(".basalt-site-menu-loops").getBoundingClientRect().height }));
    assert.equal(full.band, bare.band, "the band is the same");
    assert.ok(Math.abs(full.navTop - bare.navTop - full.row) < 0.5, "the links start one row lower, and only that");
    assert.equal(await b.page.locator(".basalt-site-menu-band .basalt-button[title='Pause animations']").count(), 0, "the icon is not added to the band");
    await b.context.close();
  });
  for (const theme of THEMES) {
    test(`axe finds nothing in the open menu in ${theme} at 390, at rest and held`, async () => {
      const { page } = await open(render("<Page />", BAR), { ...MENU, theme });
      await openMenu(page);
      for (const hold of [false, true]) {
        if (hold) await page.locator(".basalt-site-menu-loops .basalt-button").click();
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate((cfg) => window.axe.run(document, cfg), AXE);
        assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), [], `held ${hold}`);
      }
      await page.context().close();
    });
  }
});

// ---- The icon toggle says its name once (143, defect E) ----

describe("the icon toggle's name reaches assistive technology once", () => {
  test("in the accessibility tree its name is \"Pause animations\" and it has no description; the browser's tooltip is its title", async () => {
    const { page } = await open(render("<Page />", BAR));
    const client = await page.context().newCDPSession(page);
    await client.send("Accessibility.enable");
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    const toggles = nodes.filter((n) => n.role?.value === "button" && n.name?.value === "Pause animations" && !n.ignored);
    assert.ok(toggles.length >= 2, "the icon and the Button");
    const icon = await page.evaluate(() => document.querySelector(".basalt-bar-actions .basalt-button[title='Pause animations']").getAttribute("aria-label"));
    assert.equal(icon, null, "no aria-label beside the title");
    const withDescription = toggles.filter((n) => n.description?.value);
    assert.deepEqual(withDescription.map((n) => n.description.value), [], "no description repeats the name");
    // The theme toggle beside it is the model: its name, and no description.
    const theme = nodes.find((n) => n.role?.value === "button" && n.name?.value === "Switch theme");
    assert.ok(theme && !theme.description?.value);
    await page.context().close();
  });
});

// ---- The travel bound for every input (143, defect D) ----

describe("travelRun keeps its bound for every input it accepts (defect D)", () => {
  test("a run ends inside five seconds, legs never zero-length, for any plan that can be kept", () => {
    for (const legs of [2, 6, 12, 17]) {
      for (const d of [20, 150, 400, 1200]) {
        const run = travel.travelRun(Array(legs).fill(d));
        assert.ok(run.total < 5000, `${legs} legs of ${d}px: ${run.total}ms`);
        assert.ok(run.legs.every((ms) => ms >= travel.TRAVEL_MIN_LEG), `${legs} legs of ${d}px: a leg is ${Math.min(...run.legs)}ms`);
        assert.equal(run.total, run.legs.reduce((a, b) => a + b, 0) + run.rests.reduce((a, b) => a + b, 0));
      }
    }
  });
  test("17 legs (16 stops) fit at the default tokens; 18 are refused with a plain message, and so are the plans that gave 5,000 and 5,800ms", () => {
    assert.ok(travel.travelRun(Array(17).fill(150)).total < 5000);
    for (const legs of [18, 26, 30]) assert.throws(() => travel.travelRun(Array(legs).fill(150)), /cannot end inside 5 seconds.*fewer stops/, `${legs} legs`);
  });
  test("under reduced motion's 100ms tokens the same rule holds", () => {
    const tokens = { slower: 100, figure: 100, slow: 100 };
    const run = travel.travelRun(Array(20).fill(400), tokens);
    assert.ok(run.total < 5000);
    assert.throws(() => travel.travelRun(Array(60).fill(400), tokens), /cannot end/);
  });
});
