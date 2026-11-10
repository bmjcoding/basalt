// Navigation (Nav, NavGroup, NavItem): X's way, decisions 42, 45, 48, 49, 55, 69 and 70. Driven in Chromium against the built
// package with the real stylesheet. The shared hover pill is an enhancement over each item painting its own: where it is off
// (no JS, touch, reduced motion, forced colours) the item paints its own pill, and the tests prove that fallback as well as the
// glide. Timings are real-time with a wide margin: they show the shape of the motion, not a frame count.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";
const wait = (page, ms) => page.waitForTimeout(ms);
const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

const ITEMS = [["home", "Home", "HomeGlyph"], ["runs", "Runs", "RunsGlyph"], ["sandboxes", "Sandboxes", "SandboxesGlyph"], ["routes", "Routes", "RoutesGlyph"], ["settings", "Settings", "SettingsGlyph"]];
const items = (current = "home") => ITEMS.map(([id, label, glyph]) => `<B.NavItem href="#${id}" icon={B.${glyph}}${current === id ? " current" : ""}>${label}</B.NavItem>`).join("");
// 300 is a real sidebar width (X's is about 275). The fixtures load no web font, so labels are drawn in each platform's fallback, which on
// Linux runs about a quarter wider than on macOS; the column has to leave the hugging pill clear room on both.
const nav = ({ current = "home", collapsed = false, width = 300, extra = "", inner = items(current) } = {}) => `<div style={{ width: ${width} }}><B.Nav aria-label="Primary"${collapsed ? " collapsed" : ""}${extra}>${inner}</B.Nav></div>`;
const side = render(`<B.TooltipProvider>${nav()}</B.TooltipProvider>`);
const rail = render(`<B.TooltipProvider>${nav({ collapsed: true, width: 72 })}</B.TooltipProvider>`);
const open = async (fixture, options = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme: "dark", ...options });
  await settle(page);
  page.errors = errors;
  return page;
};

const ITEM = ".basalt-nav-item";
const rowBox = async (page, n) => (await page.locator(ITEM).nth(n).boundingBox());
const pointAt = async (page, n, dx = 0.5) => {
  const pill = await page.locator(`${ITEM} .basalt-nav-pill`).nth(n).boundingBox();
  await page.mouse.move(pill.x + pill.width * dx, pill.y + pill.height / 2);
};
/** The shared pill: its box on screen, opacity, and the transitions running on it. */
const glideNow = (page) => page.evaluate(() => {
  const el = document.querySelector(".basalt-nav");
  const plate = el.querySelector(".basalt-plate");
  const r = plate.getBoundingClientRect();
  const cs = getComputedStyle(plate);
  return {
    left: r.left, top: r.top, width: r.width, height: r.height, opacity: Number(cs.opacity), display: cs.display, state: plate.dataset.state, glide: el.hasAttribute("data-glide"), keys: el.hasAttribute("data-keys"),
    radius: cs.borderTopLeftRadius, background: cs.backgroundColor, events: cs.pointerEvents, hidden: plate.getAttribute("aria-hidden"),
    running: plate.getAnimations().map((a) => ({ type: a.constructor.name, property: a.transitionProperty, duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })),
  };
});
const pillBox = (page, n) => page.locator(`${ITEM} .basalt-nav-pill`).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
const sitsOn = (glide, box, message) => {
  near(glide.left, box.left, `${message}: left`, 1); near(glide.top, box.top, `${message}: top`, 1);
  near(glide.width, box.width, `${message}: width`, 1); near(glide.height, box.height, `${message}: height`, 1);
};
const until = async (page, done, message) => {
  for (let i = 0; i < 80; i++) {
    const g = await glideNow(page);
    if (done(g)) return g;
    await wait(page, 5);
  }
  assert.fail(message);
};
const moving = (g) => g.running.some((t) => t.property === "transform");
/** A colour as the browser resolves it, so token colours can be compared to computed ones. */
/** Fully transparent, however the browser spells it (forced colours reports a clear white). */
const clear = (colour) => /,\s*0\)$/.test(colour);
const resolve = (page, css, property = "backgroundColor") => page.evaluate(({ css, property }) => { const probe = document.createElement("div"); document.body.append(probe); probe.style[property] = css; const c = getComputedStyle(probe)[property]; probe.remove(); return c; }, { css, property });

describe("navigation: the item", () => {
  for (const theme of ["dark", "light"]) {
    test(`geometry: a 48px pill, 12 before the glyph and 20 after the label, a 24 glyph, a 20/28 label (${theme})`, async () => {
      const page = await open(side, { theme });
      const facts = await page.locator(ITEM).nth(1).evaluate((link) => {
        const pill = link.querySelector(".basalt-nav-pill");
        const glyph = pill.querySelector("svg");
        const label = pill.querySelector(".basalt-nav-label");
        const p = pill.getBoundingClientRect(), g = glyph.getBoundingClientRect(), l = label.getBoundingClientRect(), row = link.getBoundingClientRect();
        const cs = getComputedStyle(pill), ls = getComputedStyle(label);
        return { pillH: p.height, pillW: p.width, rowH: row.height, rowW: row.width, before: g.left - p.left, after: p.right - l.right, gap: l.left - g.right, glyphW: g.width, glyphH: g.height, font: ls.fontSize, line: ls.lineHeight, radius: cs.borderTopLeftRadius, weight: ls.fontWeight, labelColor: ls.color, glyphColor: getComputedStyle(glyph).color, padL: cs.paddingLeft, padR: cs.paddingRight };
      });
      assert.equal(facts.pillH, 48);
      assert.equal(facts.before, 12);
      near(facts.after, 20, "20 after the label", 0.05);
      assert.equal(facts.gap, 16);
      assert.deepEqual([facts.glyphW, facts.glyphH], [24, 24]);
      assert.equal(facts.font, "20px");
      assert.equal(facts.line, "28px");
      assert.equal(facts.weight, "400");
      assert.ok(Number.parseFloat(facts.radius) >= 24, `fully round: ${facts.radius}`);
      assert.equal(facts.rowH, 52, "the row is the pill plus 2px above and below");
      const primary = await resolve(page, "var(--basalt-text-primary)", "color");
      assert.equal(facts.labelColor, primary, "the label is primary at rest");
      assert.equal(facts.glyphColor, primary, "and so is the glyph (decision 55)");
      await page.close();
    });
  }

  test("the row is the whole column, the pill hugs: at rest it paints nothing and is far narrower than the column", async () => {
    const page = await open(side);
    const { row, pill, label, bg } = await page.locator(ITEM).nth(2).evaluate((link) => {
      const p = link.querySelector(".basalt-nav-pill");
      return { row: link.getBoundingClientRect().width, pill: p.getBoundingClientRect().width, label: p.querySelector(".basalt-nav-label").getBoundingClientRect().width, bg: getComputedStyle(p).backgroundColor };
    });
    assert.ok(row > 200, `the link spans the column (${row})`);
    near(pill, 12 + 24 + 16 + label + 20, "the pill is its content: 12 + 24 + 16 + label + 20");
    assert.ok(pill < row - 40, `the pill hugs (${pill} of ${row})`);
    assert.equal(bg, "rgba(0, 0, 0, 0)");
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`hover is the hugging pill at the selected wash, never the column's width (${theme})`, async () => {
      const page = await open(side, { theme });
      await pointAt(page, 2);
      await wait(page, 60);
      const glide = await glideNow(page);
      const pill = await pillBox(page, 2);
      sitsOn(glide, pill, "the shared pill hugs the item's pill");
      assert.equal(glide.height, 48);
      const column = await page.locator(".basalt-nav").evaluate((el) => el.getBoundingClientRect().width);
      assert.ok(glide.width < column - 60, `${glide.width} of a ${column}px column`);
      const content = await page.locator(`${ITEM} .basalt-nav-pill`).nth(2).evaluate((p) => { const l = p.querySelector(".basalt-nav-label").getBoundingClientRect(); return 12 + 24 + 16 + l.width + 20; });
      near(glide.width, content, "12 + 24 + 16 + label + 20", 0.6);
      assert.equal(glide.background, await resolve(page, "var(--basalt-state-selected)"), "the selected wash (9% white, 7% black), not the 6% hover");
      assert.ok(Number.parseFloat(glide.radius) >= 24);
      assert.equal(glide.events, "none");
      assert.equal(glide.hidden, "true");
      // the pointer in the row's empty space, far from the pill, still lights the same hugging pill
      await pointAt(page, 2, 0.5);
      const row = await rowBox(page, 2);
      await page.mouse.move(row.x + row.width - 10, row.y + row.height / 2);
      await wait(page, 60);
      sitsOn(await glideNow(page), pill, "hovering the row's far end");
      await page.close();
    });
  }

  test("the items' own pills step aside while the shared one is live, and each item's own pill is the fallback with no glide", async () => {
    const page = await open(side);
    await pointAt(page, 1);
    await wait(page, 60);
    assert.equal(await page.locator(`${ITEM} .basalt-nav-pill`).nth(1).evaluate((p) => getComputedStyle(p).backgroundColor), "rgba(0, 0, 0, 0)");
    await page.close();
    // no script: the stylesheet alone, the item's own pill on :hover
    const bare = await browser.newPage();
    await bare.setContent(`<html data-theme="dark"><head><style>${fs.readFileSync(new URL("../dist/styles.css", import.meta.url), "utf8")}</style></head><body><nav class="basalt-nav" aria-label="x" style="width:240px"><ul class="basalt-nav-list"><li class="basalt-nav-entry"><a href="#a" class="basalt-nav-item"><span class="basalt-nav-pill"><span style="width:24px;height:24px"></span><span class="basalt-nav-label" data-label="Alpha">Alpha</span></span></a></li></ul></nav></body></html>`);
    await bare.locator(".basalt-nav-item").hover();
    await wait(bare, 30);
    const own = await bare.locator(".basalt-nav-pill").evaluate((p) => ({ bg: getComputedStyle(p).backgroundColor, w: p.getBoundingClientRect().width }));
    assert.notEqual(own.bg, "rgba(0, 0, 0, 0)", "the item paints its own pill");
    assert.ok(own.w < 200, "hugging, not the column");
    await bare.close();
  });

  test("pressed is the same pill: no further step, and the item does not scale", async () => {
    const page = await open(side, { reducedMotion: "reduce" });
    await pointAt(page, 1);
    await wait(page, 30);
    const hovered = await page.locator(`${ITEM} .basalt-nav-pill`).nth(1).evaluate((p) => getComputedStyle(p).backgroundColor);
    await page.mouse.down();
    await wait(page, 30);
    const pressed = await page.locator(`${ITEM}`).nth(1).evaluate((link) => ({ bg: getComputedStyle(link.querySelector(".basalt-nav-pill")).backgroundColor, transform: getComputedStyle(link).transform, pillTransform: getComputedStyle(link.querySelector(".basalt-nav-pill")).transform }));
    await page.mouse.up();
    assert.equal(pressed.bg, hovered);
    assert.equal(pressed.transform, "none");
    assert.equal(pressed.pillTransform, "none");
    await page.close();
  });
});

describe("navigation: the current page", () => {
  for (const theme of ["dark", "light"]) {
    test(`current is the selected glyph and a 600 label, with no background, no bar and no outline (${theme})`, async () => {
      const page = await open(side, { theme });
      const read = (n) => page.locator(ITEM).nth(n).evaluate((link) => {
        const pill = link.querySelector(".basalt-nav-pill"), label = link.querySelector(".basalt-nav-label"), glyph = link.querySelector("svg");
        const paint = (el, pseudo) => { const cs = getComputedStyle(el, pseudo); return { content: cs.content, bg: cs.backgroundColor, outline: cs.outlineStyle, border: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join(" "), shadow: cs.boxShadow }; };
        return {
          current: link.getAttribute("aria-current"), weight: getComputedStyle(label).fontWeight,
          path: glyph.innerHTML, fills: [...glyph.querySelectorAll("[fill]")].map((e) => e.getAttribute("fill")).join(),
          link: [paint(link), paint(link, "::before"), paint(link, "::after")], pill: [paint(pill), paint(pill, "::before"), paint(pill, "::after")], labelAfter: paint(label, "::after"),
        };
      });
      const current = await read(0), rest = await read(1);
      assert.equal(current.current, "page");
      assert.equal(rest.current, null);
      assert.equal(current.weight, "600");
      assert.equal(rest.weight, "400");
      for (const part of [...current.link, ...current.pill]) {
        assert.equal(part.bg, "rgba(0, 0, 0, 0)", "no background");
        assert.notEqual(part.outline, "solid", "no outline");
        assert.equal(part.shadow, "none");
      }
      for (const pseudo of [current.link[1], current.link[2], current.pill[1], current.pill[2]]) assert.ok(pseudo.content === "none" || pseudo.content === "normal", `no bar from a pseudo-element: ${pseudo.content}`);
      for (const part of [current.link[0], current.pill[0]]) assert.equal(part.border, "0px 0px 0px 0px", "no edge, so no bar");
      // the glyph is in its selected form: the same item, not current, draws differently
      const same = await open(render(`<B.TooltipProvider>${nav({ current: "runs" })}</B.TooltipProvider>`), { theme });
      const unselected = await same.locator(`${ITEM} svg`).nth(0).innerHTML();
      assert.notEqual(unselected, current.path, "Home's selected drawing differs from its rest drawing");
      await same.close();
      await page.close();
    });
  }

  test("a current item draws the selected glyph through the Icon's selected form (the filled drawing)", async () => {
    const page = await open(side);
    const [home, runs] = await page.locator(`${ITEM} svg`).evaluateAll((svgs) => svgs.slice(0, 2).map((s) => ({ fill: [...s.querySelectorAll("path")].some((p) => (p.getAttribute("fill") ?? "none") !== "none" && p.getAttribute("fill") !== "transparent"), paths: s.querySelectorAll("path").length })));
    assert.equal(home.fill, true, "the current glyph has a filled path");
    assert.equal(runs.fill, false, "a resting glyph is only stroked");
    await page.close();
  });

  test("the label's width does not change when it becomes current: the pill keeps its far edge", async () => {
    const page = await open(render(`<B.TooltipProvider><Switcher /></B.TooltipProvider>`).replace("createRoot", `function Switcher() { const [c, set] = React.useState("home"); return <><button id="go" onClick={() => set("sandboxes")}>go</button>${nav({ current: "{c}", inner: ITEMS.map(([id, label, glyph]) => `<B.NavItem key="${id}" href="#${id}" icon={B.${glyph}} current={c === "${id}"}>${label}</B.NavItem>`).join("") })}</>; } createRoot`));
    const measure = () => page.evaluate(() => [...document.querySelectorAll(".basalt-nav-item")].map((l) => { const p = l.querySelector(".basalt-nav-pill").getBoundingClientRect(), t = l.querySelector(".basalt-nav-label").getBoundingClientRect(); return [p.width, t.width, p.right]; }));
    const before = await measure();
    await page.locator("#go").click();
    await settle(page);
    assert.equal(await page.locator("[aria-current=page]").count(), 1);
    assert.equal(await page.locator("[aria-current=page] .basalt-nav-label").innerText(), "Sandboxes");
    assert.deepEqual(await measure(), before, "every pill and label keeps its width");
    await page.close();
  });

  test("current and hovered are both: the selected glyph, the 600 label and the hugging pill", async () => {
    const page = await open(side);
    await pointAt(page, 0);
    await wait(page, 60);
    const glide = await glideNow(page);
    sitsOn(glide, await pillBox(page, 0), "the pill is on the current item");
    const label = await page.locator(`${ITEM} .basalt-nav-label`).first().evaluate((el) => getComputedStyle(el).fontWeight);
    assert.equal(label, "600");
    assert.equal(await page.locator(ITEM).first().getAttribute("aria-current"), "page");
    await page.close();
  });

  test("the label is the item's name; aria-current marks one link; the landmark and the groups are named", async () => {
    const grouped = `<B.Nav aria-label="Blacksand"><B.NavGroup label="Workspace"><B.NavItem href="#home" icon={B.HomeGlyph} current>Home</B.NavItem><B.NavItem href="#runs" icon={B.RunsGlyph} count={12} dot="New activity">Runs</B.NavItem></B.NavGroup><B.NavGroup label="Account"><B.NavItem href="#settings" icon={B.SettingsGlyph}>Settings</B.NavItem></B.NavGroup></B.Nav>`;
    const page = await open(render(grouped));
    assert.equal(await page.getByRole("navigation", { name: "Blacksand" }).count(), 1);
    assert.equal(await page.getByRole("link", { name: "Home" }).getAttribute("aria-current"), "page");
    assert.equal(await page.getByRole("link", { name: /^Runs\s*,\s*12\s*,\s*New activity$/ }).count(), 1, "the count and the dot's words are in the name");
    assert.equal(await page.locator("[aria-current]").count(), 1);
    assert.equal(await page.getByRole("list", { name: "Workspace" }).count(), 1);
    assert.equal(await page.getByRole("list", { name: "Account" }).count(), 1);
    const label = await page.locator(".basalt-nav-group-label").first().evaluate((el) => { const cs = getComputedStyle(el); return { size: cs.fontSize, line: cs.lineHeight, weight: cs.fontWeight }; });
    assert.deepEqual(label, { size: "12px", line: "16px", weight: "500" });
    // a count is a number and a dot is a small shape: no disc behind either, and the dot is the label's ink
    const badge = await page.locator(".basalt-nav-count").evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, text: el.textContent.replace(/^, /, "") }; });
    assert.deepEqual(badge, { bg: "rgba(0, 0, 0, 0)", radius: "0px", text: "12" });
    const dot = await page.locator(".basalt-nav-dot").evaluate((el) => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return { w: r.width, h: r.height, bg: cs.backgroundColor, label: getComputedStyle(el.parentElement).color }; });
    assert.deepEqual([dot.w, dot.h], [6, 6]);
    assert.equal(dot.bg, dot.label, "the dot is the ink around it, not a status colour");
    assert.deepEqual(page.errors, []);
    await page.close();
  });
});

describe("navigation: the rail", () => {
  test("each item is a 48px circle around the glyph, with the label as its accessible name", async () => {
    const page = await open(rail);
    const facts = await page.locator(`${ITEM} .basalt-nav-pill`).evaluateAll((pills) => pills.map((p) => { const r = p.getBoundingClientRect(), cs = getComputedStyle(p); return { w: r.width, h: r.height, radius: cs.borderTopLeftRadius, text: p.textContent, glyph: p.querySelector("svg").getBoundingClientRect().width, centre: Math.abs((p.querySelector("svg").getBoundingClientRect().left + 12) - (r.left + r.width / 2)) }; }));
    for (const f of facts) {
      assert.deepEqual([f.w, f.h, f.glyph], [48, 48, 24]);
      assert.ok(Number.parseFloat(f.radius) >= 24, "a circle");
      assert.ok(f.centre < 0.6, "the glyph is centred");
    }
    for (const [, label] of ITEMS) assert.equal(await page.getByRole("link", { name: label, exact: true }).count(), 1, `${label} is named`);
    // the label is not drawn
    const drawn = await page.locator(".basalt-nav-label").count();
    assert.equal(drawn, 0, "no visible label in the rail");
    await page.close();
  });

  test("the circle is the hover and the glide hugs it", async () => {
    const page = await open(rail);
    await pointAt(page, 3);
    await wait(page, 60);
    const glide = await glideNow(page);
    sitsOn(glide, await pillBox(page, 3), "on the circle");
    assert.deepEqual([glide.width, glide.height], [48, 48]);
    await page.close();
  });

  test("a tooltip names the item on hover and on keyboard focus", async () => {
    const page = await open(rail);
    await pointAt(page, 1);
    const tip = page.getByRole("tooltip");
    await tip.waitFor({ state: "visible" });
    assert.equal(await tip.innerText(), "Runs");
    await page.mouse.move(2, 2);
    await tip.waitFor({ state: "hidden" });
    await page.keyboard.press("Tab");
    await page.getByRole("tooltip").waitFor({ state: "visible" });
    assert.equal(await page.getByRole("tooltip").innerText(), "Home");
    await page.close();
  });

  test("current is the same in the rail: the selected glyph, and the link is aria-current", async () => {
    const page = await open(rail);
    assert.equal(await page.getByRole("link", { name: "Home" }).getAttribute("aria-current"), "page");
    const bg = await page.locator(`${ITEM} .basalt-nav-pill`).first().evaluate((p) => getComputedStyle(p).backgroundColor);
    assert.equal(bg, "rgba(0, 0, 0, 0)", "no background on the current circle");
    await page.close();
  });
});

describe("navigation: the hover glide", () => {
  test("entering from outside, the pill appears on the item in place, at once", async () => {
    const page = await open(side);
    await pointAt(page, 3);
    await wait(page, 24);
    const glide = await glideNow(page);
    sitsOn(glide, await pillBox(page, 3), "on the item");
    assert.equal(glide.opacity, 1);
    assert.equal(moving(glide), false, "no flight into place");
    await page.close();
  });

  test("between items it travels on duration-base with ease-out, whatever the distance, and changes width to hug each", async () => {
    const page = await open(side);
    await pointAt(page, 0);
    await wait(page, 60);
    const durations = [];
    for (const [to, label] of [[4, "four rows"], [3, "one row"]]) {
      const from = await glideNow(page);
      await pointAt(page, to);
      await wait(page, 25);
      const mid = await glideNow(page);
      const target = await pillBox(page, to);
      assert.ok(moving(mid), `${label}: a transition is running`);
      const move = mid.running.find((t) => t.property === "transform");
      assert.equal(move.type, "CSSTransition");
      assert.equal(move.easing, EASE_OUT);
      durations.push(move.duration);
      assert.equal(mid.opacity, 1);
      if (to === 4) assert.ok(mid.top < target.top - 2, "still on its way");
      if (Math.abs(from.width - target.width) > 4) assert.ok(mid.running.some((t) => t.property === "width"), `${label}: the width travels with it`);
      await wait(page, 260);
      const end = await glideNow(page);
      sitsOn(end, target, `${label}: lands on the pill`);
      assert.equal(moving(end), false);
    }
    assert.deepEqual(durations, [150, 150]);
    await page.close();
  });

  test("leaving mid-move freezes the pill where it is and fades it in place over duration-fast on ease-in", async () => {
    const page = await open(side);
    await pointAt(page, 0);
    await wait(page, 60);
    await pointAt(page, 4);
    await wait(page, 30);
    const flying = await glideNow(page);
    const far = await pillBox(page, 4);
    assert.ok(flying.top < far.top - 3, "a move is in progress");
    await page.mouse.move(400, 2);
    const first = await until(page, (g) => g.state === "off", "the pill never went to its off state");
    const second = await until(page, (g) => g.opacity < 0.9 && g.opacity > 0.02, "the pill never faded");
    near(second.top, first.top, "the pill does not keep travelling after the pointer has left", 0.6);
    assert.ok(first.top < far.top - 3, "and it froze short of the item it was heading for");
    const fade = second.running.find((t) => t.property === "opacity");
    assert.ok(fade, "the fade is a transition on opacity");
    assert.equal(fade.duration, 100);
    assert.equal(fade.easing, EASE_IN);
    assert.equal(moving(second), false);
    await wait(page, 220);
    const gone = await glideNow(page);
    assert.equal(gone.opacity, 0);
    near(gone.top, first.top, "and it fades where it froze", 0.6);
    await page.close();
  });

  test("grace: a return during the fade travels from where the pill is and returns to full opacity; after the fade it appears in place", async () => {
    const page = await open(side);
    await pointAt(page, 0);
    await wait(page, 60);
    await pointAt(page, 4);
    await wait(page, 35);
    await page.mouse.move(400, 2);
    const fading = await until(page, (g) => g.opacity < 0.9 && g.opacity > 0.1, "the pill never faded");
    await pointAt(page, 0);
    await wait(page, 25);
    const back = await glideNow(page);
    const home = await pillBox(page, 0);
    assert.equal(back.opacity, 1, "back to full opacity");
    assert.ok(moving(back), "it travels");
    assert.ok(back.top > home.top + 3 && back.top <= fading.top + 0.6, "from where it was, not from the item it was heading for");
    await wait(page, 260);
    sitsOn(await glideNow(page), home, "arrives");
    await page.mouse.move(400, 2);
    await wait(page, 260);
    assert.equal((await glideNow(page)).opacity, 0);
    await pointAt(page, 2);
    await wait(page, 24);
    const fresh = await glideNow(page);
    sitsOn(fresh, await pillBox(page, 2), "after the fade it appears in place");
    assert.equal(moving(fresh), false);
    assert.equal(fresh.opacity, 1);
    await page.close();
  });

  test("a pointer crossing from row to row never lets the pill blink off", async () => {
    const page = await open(side);
    await pointAt(page, 0);
    await wait(page, 60);
    const a = await rowBox(page, 0), b = await rowBox(page, 4);
    const seen = [];
    for (let i = 0; i <= 24; i++) {
      await page.mouse.move(a.x + 40, a.y + 26 + ((b.y + 26 - a.y - 26) * i) / 24);
      seen.push((await glideNow(page)).opacity);
    }
    assert.ok(seen.every((o) => o === 1), `opacity along the sweep: ${seen}`);
    await page.close();
  });

  test("the keyboard: the first key hides the glide, the focus ring shows at +2 around the pill, and the next pointer move brings it back in place", async () => {
    const page = await open(side);
    await pointAt(page, 2);
    await wait(page, 60);
    assert.equal((await glideNow(page)).glide, true);
    await page.keyboard.press("Tab");
    await wait(page, 30);
    const hidden = await glideNow(page);
    assert.equal(hidden.glide, false, "the glide is off");
    assert.equal(hidden.keys, true);
    assert.equal(hidden.opacity, 0, "and hidden at once, not faded");
    assert.equal(hidden.display, "none");
    const ring = await page.locator(`${ITEM}:focus-visible .basalt-nav-pill`).evaluate((p) => { const cs = getComputedStyle(p); return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, colour: cs.outlineColor, box: p.getBoundingClientRect().width }; });
    assert.deepEqual([ring.style, ring.width, ring.offset], ["solid", "2px", "2px"]);
    assert.equal(ring.colour, await resolve(page, "var(--basalt-border-focus)", "color"));
    // the pointer rests on item 2 while the key moved focus to item 0: the resting hover is hidden too, so only the ring shows
    const bg = await page.locator(`${ITEM} .basalt-nav-pill`).nth(2).evaluate((p) => getComputedStyle(p).backgroundColor);
    assert.equal(bg, "rgba(0, 0, 0, 0)", "no hover pill while the keyboard is in use");
    // the ring around the hugging pill is not clipped by the column
    const clip = await page.evaluate(() => { const p = document.querySelector(".basalt-nav-item:focus-visible .basalt-nav-pill").getBoundingClientRect(), n = document.querySelector(".basalt-nav").getBoundingClientRect(); return p.left - 4 - n.left; });
    assert.ok(clip >= 0, `the ring has room (${clip}px)`);
    await pointAt(page, 3);
    await wait(page, 24);
    const back = await glideNow(page);
    assert.equal(back.glide, true);
    sitsOn(back, await pillBox(page, 3), "back, on the item under the pointer");
    assert.equal(moving(back), false, "in place, not flying in from where it was");
    await page.close();
  });

  test("the pill is pointer-led: modifier keys do not hide it", async () => {
    const page = await open(side);
    await pointAt(page, 1);
    await wait(page, 60);
    await page.keyboard.press("Shift");
    await wait(page, 20);
    assert.equal((await glideNow(page)).glide, true);
    await page.close();
  });

  test("no animation frame is ever in React state: no commit while the pill travels", async () => {
    const wrapped = `window.__commits = 0; createRoot(document.getElementById("root")).render(<React.Profiler id="p" onRender={() => { window.__commits += 1; }}><B.TooltipProvider>${nav()}</B.TooltipProvider></React.Profiler>);`;
    const page = await open(wrapped);
    await pointAt(page, 0);
    await wait(page, 60);
    const start = await page.evaluate(() => window.__commits);
    await pointAt(page, 4);
    await wait(page, 30);
    assert.ok(moving(await glideNow(page)), "travelling");
    await page.mouse.move(400, 2);
    await wait(page, 300);
    assert.equal(await page.evaluate(() => window.__commits), start, "no commit during the travel, the leave or the fade");
    await page.close();
  });

  test("pointerType touch turns the glide off for that input: the item paints its own pill; a mouse brings it back", async () => {
    const page = await open(side);
    await pointAt(page, 1);
    await wait(page, 50);
    await page.locator(`${ITEM} .basalt-nav-pill`).nth(1).dispatchEvent("pointerdown", { pointerType: "touch", bubbles: true, composed: true });
    await wait(page, 30);
    const touched = await glideNow(page);
    assert.equal(touched.glide, false);
    assert.equal(touched.display, "none");
    await pointAt(page, 2);
    await wait(page, 30);
    assert.equal((await glideNow(page)).glide, true);
    await page.close();
  });

  test("on a touch device (hover: none, coarse pointer) there is no shared pill, and a press shows the item's own", async () => {
    const page = await open(side, { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    assert.equal(await page.evaluate(() => matchMedia("(hover: none)").matches && matchMedia("(pointer: coarse)").matches), true);
    const glide = await glideNow(page);
    assert.equal(glide.glide, false);
    assert.equal(glide.display, "none");
    // Chromium's touch emulation doesn't raise :active, so hold it the way DevTools does.
    const client = await page.context().newCDPSession(page);
    await client.send("DOM.enable");
    await client.send("CSS.enable");
    const { root } = await client.send("DOM.getDocument");
    const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: `${ITEM}[href="#runs"]` });
    const resting = await page.locator(`${ITEM} .basalt-nav-pill`).nth(1).evaluate((p) => getComputedStyle(p).backgroundColor);
    assert.equal(resting, "rgba(0, 0, 0, 0)");
    await client.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
    await wait(page, 60);
    const pressed = await page.locator(`${ITEM} .basalt-nav-pill`).nth(1).evaluate((p) => ({ bg: getComputedStyle(p).backgroundColor, w: p.getBoundingClientRect().width }));
    assert.notEqual(pressed.bg, "rgba(0, 0, 0, 0)", "the pill is the press");
    assert.ok(pressed.w < 200, "and it still hugs");
    await page.close();
  });

  test("under reduced motion each item lights on its own: in at once, out over 100ms, no travel", async () => {
    const page = await open(side, { reducedMotion: "reduce" });
    await pointAt(page, 1);
    await wait(page, 50);
    const glide = await glideNow(page);
    assert.equal(glide.glide, false);
    assert.equal(glide.display, "none");
    const read = (n) => page.locator(`${ITEM} .basalt-nav-pill`).nth(n).evaluate((p) => { const cs = getComputedStyle(p); return { bg: cs.backgroundColor, duration: cs.transitionDuration, w: p.getBoundingClientRect().width }; });
    const on = await read(1), off = await read(2);
    assert.notEqual(on.bg, "rgba(0, 0, 0, 0)");
    assert.equal(on.duration, "0s", "in at once");
    assert.equal(off.duration, "0.1s", "out over 100ms");
    assert.ok(on.w < 200, "hugging");
    await pointAt(page, 3);
    await wait(page, 20);
    assert.equal((await glideNow(page)).running.length, 0);
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`in forced colours there is no shared pill: the hovered item is Highlight on HighlightText, with no backplate (${theme})`, async () => {
      const page = await open(side, { theme, forcedColors: "active" });
      await pointAt(page, 1);
      await wait(page, 50);
      const glide = await glideNow(page);
      assert.equal(glide.display, "none");
      const hovered = await page.locator(`${ITEM} .basalt-nav-pill`).nth(1).evaluate((p) => { const cs = getComputedStyle(p); return { bg: cs.backgroundColor, color: cs.color, adjust: cs.forcedColorAdjust, w: p.getBoundingClientRect().width, label: getComputedStyle(p.querySelector(".basalt-nav-label")).color }; });
      assert.equal(hovered.bg, await resolve(page, "Highlight"));
      assert.equal(hovered.color, await resolve(page, "HighlightText", "color"));
      assert.equal(hovered.label, hovered.color);
      assert.ok(hovered.w < 200, "hugging");
      // a resting item: system colours, no fill
      const rest = await page.locator(`${ITEM} .basalt-nav-pill`).nth(2).evaluate((p) => getComputedStyle(p).backgroundColor);
      assert.ok(clear(rest), rest);
      // the first key hides the hover here too
      await page.keyboard.press("Tab");
      await wait(page, 30);
      assert.ok(clear(await page.locator(`${ITEM} .basalt-nav-pill`).nth(1).evaluate((p) => getComputedStyle(p).backgroundColor)));
      await page.close();
    });
  }

  test("the current page keeps its selected glyph and 600 label in forced colours", async () => {
    const page = await open(side, { forcedColors: "active" });
    const facts = await page.locator(ITEM).first().evaluate((link) => ({ weight: getComputedStyle(link.querySelector(".basalt-nav-label")).fontWeight, filled: [...link.querySelectorAll("svg path")].some((p) => (p.getAttribute("fill") ?? "none") !== "none") }));
    assert.deepEqual(facts, { weight: "600", filled: true });
    await page.close();
  });

  test("unmounting the navigation removes its listeners and leaves no state on the page", async () => {
    const page = await open(render(`<Toggle />`).replace("createRoot", `function Toggle() { const [on, set] = React.useState(true); return <><button id="off" onClick={() => set(false)}>off</button>{on ? <B.TooltipProvider>${nav()}</B.TooltipProvider> : null}</>; } createRoot`));
    await pointAt(page, 1);
    await wait(page, 40);
    await page.locator("#off").click();
    await settle(page);
    assert.equal(await page.locator(".basalt-nav").count(), 0);
    await page.mouse.move(300, 300);
    await page.keyboard.press("Tab");
    assert.deepEqual(page.errors, []);
    await page.close();
  });
});

describe("navigation: touch heights and density", () => {
  const touch = { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } };
  const heights = (page) => page.locator(ITEM).evaluateAll((links) => links.map((l) => ({ row: l.getBoundingClientRect().height, pill: l.querySelector(".basalt-nav-pill").getBoundingClientRect().height })));
  test("on touch every row is at least 48 tall, default and compact", async () => {
    for (const compact of [false, true]) {
      const fixture = render(`<div data-density={${compact ? '"compact"' : '"default"'}}><B.TooltipProvider>${nav()}</B.TooltipProvider></div>`);
      const page = await open(fixture, touch);
      for (const h of await heights(page)) { assert.ok(h.row >= 48, `row ${h.row} (compact ${compact})`); assert.ok(h.pill >= 44, `pill ${h.pill} (compact ${compact})`); }
      await page.close();
    }
  });
  test("compact steps the pill down to 40 with a fine pointer, and the default stays 48", async () => {
    const compact = await open(render(`<div data-density="compact"><B.TooltipProvider>${nav()}</B.TooltipProvider></div>`));
    assert.deepEqual([...new Set((await heights(compact)).map((h) => h.pill))], [40]);
    assert.deepEqual([...new Set((await heights(compact)).map((h) => h.row))], [44]);
    await compact.close();
    const regular = await open(side);
    assert.deepEqual([...new Set((await heights(regular)).map((h) => h.pill))], [48]);
    await regular.close();
  });
  test("a compact rail is a 40px circle, and a touch rail is at least 44", async () => {
    const fixture = (density) => render(`<div data-density="${density}"><B.TooltipProvider>${nav({ collapsed: true, width: 72 })}</B.TooltipProvider></div>`);
    const compact = await open(fixture("compact"));
    assert.deepEqual(await compact.locator(`${ITEM} .basalt-nav-pill`).first().evaluate((p) => [p.offsetWidth, p.offsetHeight]), [40, 40]);
    await compact.close();
    const touched = await open(fixture("compact"), touch);
    assert.deepEqual(await touched.locator(`${ITEM} .basalt-nav-pill`).first().evaluate((p) => [p.offsetWidth, p.offsetHeight]), [44, 44]);
    await touched.close();
  });
  test("the column keeps at least space-1-5 of inline padding, so the focus ring never clips", async () => {
    const page = await open(side);
    const padding = await page.locator(".basalt-nav").evaluate((el) => [getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight]);
    assert.deepEqual(padding, ["6px", "6px"]);
    await page.close();
  });
});

for (const theme of ["dark", "light"]) {
  test(`axe finds no WCAG 2.2 AA violations in the sidebar and the rail, at rest, hovered, with a current page and with the ring (${theme})`, async () => {
    const grouped = `<B.Nav aria-label="Blacksand"><B.NavGroup label="Workspace"><B.NavItem href="#home" icon={B.HomeGlyph} current>Home</B.NavItem><B.NavItem href="#runs" icon={B.RunsGlyph} count={12} dot="New activity">Runs</B.NavItem></B.NavGroup><B.NavGroup label="Account"><B.NavItem href="#settings" icon={B.SettingsGlyph}>Settings</B.NavItem></B.NavGroup></B.Nav>`;
    const page = await open(render(`<B.TooltipProvider><main style={{ background: "var(--basalt-surface-page)", padding: 16 }}>${grouped}${nav({ collapsed: true, width: 72 }).replace('aria-label="Primary"', 'aria-label="Rail"')}</main></B.TooltipProvider>`), { theme });
    await page.locator(ITEM).nth(1).hover();
    await wait(page, 200);
    await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
    const run = async (label) => {
      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate(() => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }));
      assert.deepEqual(result.violations.map((v) => `${label} ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`), []);
    };
    await run("hovered");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await wait(page, 100);
    await run("focused");
    assert.deepEqual(page.errors, []);
    await page.close();
  });
}

describe("navigation: contrast of the hover pill", () => {
  // The primary label on the hovered pill, over the page, in both themes: the pill is a 9% white / 7% black wash.
  for (const theme of ["dark", "light"]) {
    test(`the label and glyph stay 4.5:1 or better on the hovered pill, over the page (${theme})`, async () => {
      const page = await open(side, { theme });
      await pointAt(page, 1);
      await wait(page, 60);
      const ratio = await page.evaluate(() => {
        // paint the page colour, then the pill's wash over it, in a canvas, so any colour syntax and any alpha is composited as the browser does
        const x = document.createElement("canvas").getContext("2d");
        const pixel = (...layers) => { x.clearRect(0, 0, 1, 1); for (const css of layers) { x.fillStyle = css; x.fillRect(0, 0, 1, 1); } return [...x.getImageData(0, 0, 1, 1).data]; };
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const probe = document.createElement("div"); probe.style.background = "var(--basalt-surface-page)"; document.body.append(probe);
        const pageFill = getComputedStyle(probe).backgroundColor; probe.remove();
        const onPill = pixel(pageFill, getComputedStyle(document.querySelector(".basalt-plate")).backgroundColor);
        const ink = pixel(getComputedStyle(document.querySelector(".basalt-nav-label")).color);
        const [hi, lo] = [lum(ink), lum(onPill)].sort((p, q) => q - p);
        return (hi + 0.05) / (lo + 0.05);
      });
      assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1`);
      await page.close();
    });
  }
});
