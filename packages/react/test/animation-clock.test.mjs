// The frozen clock the motion tests sample on (freezeAnimations in support.mjs) must not make a test pass that real time would
// fail. These are the reviewer's mutations, run against the helper: a component that leaves an animation paused, and one whose
// timer runs late, must both still be visible to a test that uses it.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const nav = render(`<B.TooltipProvider><div style={{ width: 300 }}><B.Nav aria-label="Primary">${["Home", "Runs", "Sandboxes", "Routes", "Settings"].map((l) => `<B.NavItem href="#${l}" icon={B.HomeGlyph}>${l}</B.NavItem>`).join("")}</B.Nav></div></B.TooltipProvider>`);
const pointAt = async (page, n) => {
  const pill = await page.locator(".basalt-nav-item .basalt-nav-pill").nth(n).boundingBox();
  await page.mouse.move(pill.x + pill.width / 2, pill.y + pill.height / 2);
};
const plate = (page) => page.evaluate(() => {
  const el = document.querySelector(".basalt-plate");
  const cs = getComputedStyle(el);
  return { top: el.getBoundingClientRect().top, opacity: Number(cs.opacity), state: el.dataset.state, running: el.getAnimations().length };
});
const slide = `<div id="box" style={{ width: 10, height: 10, background: "red", transition: "transform 100ms linear" }} />`;
const withBox = render(`<>${slide}</>`);
const move = (page) => page.evaluate(() => { document.getElementById("box").style.transform = "translateX(100px)"; return document.getAnimations().length; });
const x = (page) => page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.getElementById("box")).transform).m41);

describe("freezeAnimations", () => {
  test("a transition stays at its start until the clock advances, then moves by exactly that much", async () => {
    const { page } = await fixturePage(browser, withBox);
    const clock = await freezeAnimations(page);
    assert.equal(await move(page), 1);
    await page.waitForTimeout(200); // real time passes; the transition does not
    assert.equal(await x(page), 0);
    await clock.advance(25);
    assert.ok(Math.abs(await x(page) - 25) < 0.01, `25ms of a 100ms linear move is 25px (${await x(page)})`);
    await page.close();
  });

  test("advancing does not move a paused animation, and settle refuses to finish one", async () => {
    const { page } = await fixturePage(browser, withBox);
    const clock = await freezeAnimations(page);
    await move(page);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    await clock.advance(500);
    assert.equal(await x(page), 0, "a paused transition has not moved");
    assert.equal(await page.evaluate(() => document.getAnimations().length), 1, "and has not finished");
    await assert.rejects(settle(page), /paused and would never finish/);
    await page.close();
  });

  test("an animation advances at its own playback rate", async () => {
    const { page } = await fixturePage(browser, withBox);
    const clock = await freezeAnimations(page);
    await move(page);
    await page.evaluate(() => document.getAnimations().forEach((a) => { a.playbackRate = 0.5; }));
    await clock.advance(40);
    assert.ok(Math.abs(await x(page) - 20) < 0.01, `40ms at half rate is 20ms of the move (${await x(page)})`);
    await page.close();
  });

  test("timers and animations share one timeline: a timer set for 250ms finds a 100ms move long over, and one for 50ms finds it half way", async () => {
    const { page } = await fixturePage(browser, withBox);
    const clock = await freezeAnimations(page);
    await page.evaluate(() => {
      window.seen = {};
      const read = () => new DOMMatrixReadOnly(getComputedStyle(document.getElementById("box")).transform).m41;
      setTimeout(() => { window.seen.early = read(); }, 50);
      setTimeout(() => { window.seen.late = read(); }, 250);
    });
    await move(page);
    await clock.advance(300);
    const seen = await page.evaluate(() => window.seen);
    assert.ok(Math.abs(seen.early - 50) <= 8, `at 50ms the move is half done (${seen.early})`);
    assert.equal(seen.late, 100, "at 250ms it is over");
    await page.close();
  });
});

describe("the hover glide on the frozen clock catches what it caught in real time", () => {
  const start = async () => {
    const { page } = await fixturePage(browser, nav, { theme: "dark" });
    await settle(page);
    const clock = await freezeAnimations(page);
    await pointAt(page, 0);
    await clock.advance(60);
    await pointAt(page, 4);
    await clock.advance(30);
    return { page, clock };
  };
  const leave = async (page, clock) => {
    await page.mouse.move(400, 2);
    for (let i = 0; i < 80 && (await plate(page)).state !== "off"; i += 1) await clock.advance(5);
    return plate(page);
  };

  test("leaving on time freezes the pill short of the row it was heading for", async () => {
    const { page, clock } = await start();
    const far = await page.locator(".basalt-nav-item .basalt-nav-pill").nth(4).boundingBox();
    const frozen = await leave(page, clock);
    assert.ok(frozen.top < far.y - 3, `froze at ${frozen.top}, short of ${far.y}`);
    await page.close();
  });

  test("a leave delayed to 250ms lands after the whole flight, so the 'froze short' check fails", async () => {
    const { page, clock } = await start();
    const far = await page.locator(".basalt-nav-item .basalt-nav-pill").nth(4).boundingBox();
    // the mutation: the component's zero-delay timers now take 250ms
    await page.evaluate(() => { const original = window.setTimeout; window.setTimeout = (fn, delay, ...rest) => original(fn, delay === 0 ? 250 : delay, ...rest); });
    const frozen = await leave(page, clock);
    assert.ok(!(frozen.top < far.y - 3), `the leave ran late and the pill had reached ${frozen.top} (the row is at ${far.y}): the check must fail`);
    await page.close();
  });

  test("a fade the component leaves paused never reaches the fading state, so 'the pill never faded' fails", async () => {
    const { page, clock } = await start();
    await page.evaluate(() => {
      const plate = document.querySelector(".basalt-plate");
      new MutationObserver(() => requestAnimationFrame(() => plate.getAnimations().forEach((a) => a.pause()))).observe(plate, { attributes: true });
    });
    await page.mouse.move(400, 2);
    let faded = false;
    for (let i = 0; i < 80 && !faded; i += 1) {
      await clock.advance(5);
      const now = await plate(page);
      faded = now.state === "off" && now.opacity < 0.9 && now.opacity > 0.02;
    }
    assert.ok(await page.evaluate(() => document.querySelector(".basalt-plate").getAnimations().some((a) => a.playState === "paused")), "the mutation did pause the fade");
    assert.equal(faded, false, "advancing did not fade a paused transition");
    await page.close();
  });
});
