// micro-e7 (DECISIONS 405, audit row P2): the default MenuTrigger meets the shared target floor as hit area alone. With no `render` it is a bare
// button drawn at its text's height; its hit box is at least 24 by 24 at a fine pointer and 44 by 44 on touch and under 720, and the button, its
// words and a glyph inside it keep their size and place. Stacked with no gap, each trigger's words are a label over every neighbour's box, so a tap
// on a trigger's own words is its own and no point in either box is dead. A `render` Button keeps its own sizes and gets no extra box.
// C2's React half (fix pass 2): under reduced motion a swiped toast stays where it was let go and only fades; its directional exit (right, and up
// under 720) runs only with reduced motion off, as the skill's does. Engineering that restores
// documented behaviour (foundations, Controls); no panel. Driven in Chromium against the built package with the real stylesheet. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (jsx, options = {}) => {
  const { page, errors } = await fixturePage(browser, render(jsx), options);
  await settle(page);
  return { page, errors };
};

const MENUS = `<div style={{ display: "flex", gap: 48, alignItems: "center", padding: 48 }}>
  <B.Menu modal={false}><B.MenuTrigger data-testid="bare">Sort</B.MenuTrigger><B.MenuContent><B.MenuItem>Name</B.MenuItem><B.MenuItem>Date</B.MenuItem></B.MenuContent></B.Menu>
  <B.Menu modal={false}><B.MenuTrigger data-testid="glyph">Shelf <B.Icon icon={B.ChevronDownGlyph} size={16} /></B.MenuTrigger><B.MenuContent><B.MenuItem>Pantry</B.MenuItem></B.MenuContent></B.Menu>
  <B.Menu modal={false}><B.MenuTrigger data-testid="styled" render={<B.Button size="sm">Move to</B.Button>} /><B.MenuContent><B.MenuItem>Archive</B.MenuItem></B.MenuContent></B.Menu>
</div>`;

/** The trigger's own box, and its hit box: the union of the element and its `::before`. */
const boxes = (page, id) => page.getByTestId(id).evaluate((el) => {
  const r = el.getBoundingClientRect();
  const before = getComputedStyle(el, "::before");
  const has = before.content !== "none" && before.position === "absolute";
  const w = has ? Math.max(r.width, parseFloat(before.width)) : r.width;
  const h = has ? Math.max(r.height, parseFloat(before.height)) : r.height;
  return { own: [r.width, r.height], hit: [w, h], bare: el.hasAttribute("data-bare"), position: getComputedStyle(el).position };
});
/** What `elementFromPoint` finds at a point `dy` px below or above the trigger's centre, as the trigger's test id or the tag found. */
const hitAt = (page, id, dx, dy) => page.getByTestId(id).evaluate((el, [dx, dy]) => {
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2 + dx, r.y + r.height / 2 + dy);
  return hit?.closest("[data-testid]")?.getAttribute("data-testid") ?? hit?.tagName ?? null;
}, [dx, dy]);

describe("the default MenuTrigger meets the target floor (P2)", () => {
  for (const [name, options, floor] of [
    ["a fine pointer at 1440", { viewport: { width: 1440, height: 900 } }, 24],
    ["touch at 390", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, 44],
    ["a mouse under 720", { viewport: { width: 700, height: 900 } }, 44],
  ]) {
    test(`${name}: the bare trigger's hit box is at least ${floor} by ${floor}, its own box unchanged`, async () => {
      const { page, errors } = await open(MENUS, options);
      const bare = await boxes(page, "bare");
      assert.equal(bare.bare, true);
      assert.equal(bare.position, "relative");
      assert.ok(bare.own[1] < 24, `the bare button is drawn at its text's height (${bare.own[1]}), so the floor is hit area, not layout`);
      assert.ok(bare.hit[0] >= floor && bare.hit[1] >= floor, `hit box ${bare.hit} under ${floor}`);
      // A press just outside the drawn button, inside the floor, still lands on the trigger.
      const reach = (floor - bare.own[1]) / 2 - 1;
      assert.equal(await hitAt(page, "bare", 0, bare.own[1] / 2 + reach), "bare");
      assert.equal(await hitAt(page, "bare", 0, -(bare.own[1] / 2 + reach)), "bare");
      await page.mouse.click(...await page.getByTestId("bare").evaluate((el, reach) => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.bottom + reach]; }, reach));
      await settle(page);
      assert.equal(await page.getByTestId("bare").getAttribute("aria-expanded"), "true");
      assert.deepEqual(errors, []);
    });

    test(`${name}: a glyph inside the bare trigger keeps its size`, async () => {
      const { page } = await open(MENUS, options);
      const glyph = await page.getByTestId("glyph").locator("svg").evaluate((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; });
      assert.deepEqual(glyph, [16, 16]);
      const box = await boxes(page, "glyph");
      assert.ok(box.hit[0] >= floor && box.hit[1] >= floor);
    });

    test(`${name}: a render Button keeps its own sizes and takes no extra box`, async () => {
      const { page } = await open(MENUS, options);
      const styled = await boxes(page, "styled");
      assert.equal(styled.bare, false);
      assert.ok(styled.own[1] >= floor, `the styled Button is ${styled.own[1]} tall`);
    });
  }
});

const STACKED = `<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0, padding: 48 }}>
  <B.Menu modal={false}><B.MenuTrigger data-testid="upper">Shelf</B.MenuTrigger><B.MenuContent><B.MenuItem>Pantry</B.MenuItem></B.MenuContent></B.Menu>
  <B.Menu modal={false}><B.MenuTrigger data-testid="lower">Queue</B.MenuTrigger><B.MenuContent><B.MenuItem>Nightly</B.MenuItem></B.MenuContent></B.Menu>
</div>`;

describe("bare triggers stacked with no gap (P2, fix pass 1)", () => {
  const TOUCH = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

  test("on touch, a tap on each trigger's words opens that trigger's menu", async () => {
    for (const id of ["upper", "lower"]) {
      const { page, errors } = await open(STACKED, TOUCH);
      const label = page.getByTestId(id).locator(".basalt-menu-trigger-label");
      const r = await label.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
      // The words' middle, and their top and bottom rows (the rows a neighbour's 44 box reaches over).
      for (const dy of [r.h / 2, 1, r.h - 1]) assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("[data-testid]")?.getAttribute("data-testid"), [r.x + r.w / 2, r.y + dy]), id, `${id}'s words at ${dy}`);
      await page.touchscreen.tap(r.x + r.w / 2, r.y + r.h / 2);
      await settle(page);
      assert.equal(await page.getByTestId(id).getAttribute("aria-expanded"), "true");
      assert.equal(await page.getByTestId(id === "upper" ? "lower" : "upper").getAttribute("aria-expanded"), "false");
      assert.deepEqual(errors, []);
    }
  });

  test("on touch, no point in either 44 box is dead: every one is one of the two triggers", async () => {
    const { page } = await open(STACKED, TOUCH);
    const result = await page.evaluate(() => {
      const ids = ["upper", "lower"];
      const dead = [];
      for (const id of ids) {
        const el = document.querySelector(`[data-testid="${id}"]`);
        const r = el.getBoundingClientRect();
        const before = getComputedStyle(el, "::before");
        const w = parseFloat(before.width), h = parseFloat(before.height);
        const left = r.x + r.width / 2 - w / 2, top = r.y + r.height / 2 - h / 2;
        for (let y = top + 0.5; y < top + h; y += 2) for (let x = left + 0.5; x < left + w; x += 2) {
          const hit = document.elementFromPoint(x, y)?.closest("[data-testid]")?.getAttribute("data-testid");
          if (!ids.includes(hit)) dead.push([id, Math.round(x), Math.round(y)]);
        }
      }
      return dead;
    });
    assert.deepEqual(result, []);
  });

  test("raising the words moves nothing: the stacked triggers keep their boxes", async () => {
    const { page } = await open(STACKED, TOUCH);
    const [a, b] = await Promise.all(["upper", "lower"].map((id) => page.getByTestId(id).evaluate((el) => { const r = el.getBoundingClientRect(); return [r.y, r.height]; })));
    assert.ok(a[1] < 24 && b[1] < 24, "each is drawn at its text's height");
    assert.ok(Math.abs(b[0] - (a[0] + a[1])) < 0.5, "and the lower starts where the upper ends (no room reserved)");
  });
});

const TOASTS = `function Probe(){const t=B.useToast();React.useEffect(()=>{window.t=t},[t]);return null}
createRoot(document.getElementById("root")).render(<B.ToastProvider><Probe/></B.ToastProvider>);`;

describe("Toast under reduced motion: a swipe only fades (C2, fix pass 2)", () => {
  for (const [name, options, delta, direction] of [
    ["a window at 1440, by mouse", { viewport: { width: 1440, height: 900 } }, [60, 0], "right"],
    ["a phone at 390, by touch", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, [0, -60], "up"],
  ]) {
    test(`${name}: a swipe ${direction} leaves it where it was let go, and only its opacity moves`, async () => {
      const { page, errors } = await fixturePage(browser, TOASTS, { theme: "dark", reducedMotion: "reduce", ...options });
      await page.waitForFunction(() => window.t);
      await page.evaluate(() => window.t.show({ title: "Recipe saved", description: "Lemon tart, in Desserts." }));
      await page.locator(".basalt-toast").first().waitFor();
      await settle(page);
      const text = await page.locator(".basalt-toast-text").first().boundingBox();
      const x = text.x + text.width / 2, y = text.y + text.height / 2;
      const box = () => page.locator(".basalt-toast").first().evaluate((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top]; });
      let cdp;
      if (options.hasTouch) {
        cdp = await page.context().newCDPSession(page);
        const at = (px, py) => [{ x: px, y: py, id: 1 }];
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(x, y) });
        for (let i = 0; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(x + (delta[0] * i) / 8, y + (delta[1] * i) / 8) });
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + delta[0], y + delta[1], { steps: 8 });
      }
      const held = await box();
      if (cdp) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      else await page.mouse.up();
      // Read on the first frame that shows the exit, before the fade is over.
      const left = await (await page.waitForFunction(() => {
        const el = document.querySelector(".basalt-toast[data-ending-style]");
        if (!el) return null;
        const r = el.getBoundingClientRect(), c = getComputedStyle(el);
        return { at: [r.left, r.top], direction: el.getAttribute("data-swipe-direction"), property: c.transitionProperty };
      }, null, { polling: "raf", timeout: 2000 })).jsonValue();
      assert.equal(left.direction, direction);
      assert.equal(left.property, "opacity", "only its opacity moves");
      assert.ok(Math.abs(left.at[0] - held[0]) < 0.5 && Math.abs(left.at[1] - held[1]) < 0.5, `it stays where it was let go (${held} then ${left.at})`);
      await page.locator(".basalt-toast").first().waitFor({ state: "detached", timeout: 2000 });
      assert.deepEqual(errors, []);
    });
  }

  test("with reduced motion off, the swipe exits keep their direction", async () => {
    const { page } = await fixturePage(browser, TOASTS, { theme: "dark" });
    const rules = await page.evaluate(() => {
      const found = [];
      const walk = (list, media) => { for (const r of list) { if (r.cssRules && r.media) walk(r.cssRules, r.media.mediaText); else if (r.cssRules) walk(r.cssRules, media); else if (/basalt-toast\[data-ending-style\]\[data-swipe-direction/.test(r.selectorText ?? "")) found.push([r.selectorText, media]); } };
      for (const sheet of document.styleSheets) walk(sheet.cssRules, "");
      return found;
    });
    assert.equal(rules.length, 2, JSON.stringify(rules));
    for (const [selector, media] of rules) assert.match(media, /prefers-reduced-motion: no-preference/, `${selector} runs only with reduced motion off`);
  });
});

