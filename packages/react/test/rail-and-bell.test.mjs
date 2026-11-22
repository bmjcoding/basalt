// Two faults the owner found in CIMIP (DECISIONS 245): the brand mark sat at its link's start in the 72px rail, 10px off the nav glyphs'
// centre line; and the notification bell's unread dot jumped to the top left while the button was pressed, because a pressed Button's
// ::after (its hit-box extension) took the dot's place. Driven in Chromium against the built package. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="4" fill="currentColor" /></svg>`;
const SHELL = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(
  <B.AppShell brand={<>${MARK}<span>Workbench</span></>} brandMark={${MARK}} brandLabel="Workbench home"
    sidebar={<B.Nav aria-label="Primary"><B.NavItem href="#home" icon={B.HomeGlyph} current>Home</B.NavItem><B.NavItem href="#plan" icon={B.PlanGlyph}>Plan</B.NavItem></B.Nav>}
    header={<B.AppHeader title="Home" />}>
    <p>Synthetic page.</p>
  </B.AppShell>);`;

describe("The brand mark in the rail", () => {
  for (const theme of ["dark", "light"]) {
    test(`at 880 the mark is centred on the nav glyphs' centre line, in its 44px target (${theme})`, async () => {
      const { page } = await fixturePage(browser, SHELL, { theme, viewport: { width: 880, height: 700 } });
      await settle(page);
      const m = await page.evaluate(() => {
        const centre = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
        const link = document.querySelector(".basalt-app-brand .basalt-site-brand");
        const mark = [...link.querySelectorAll("svg")].find((el) => el.getClientRects().length && el.getBoundingClientRect().width > 0);
        return { link: link.getBoundingClientRect().width, mark: centre(mark), glyph: centre(document.querySelector(".basalt-nav-item .basalt-icon")) };
      });
      assert.ok(m.link >= 44, `the link keeps its 44px target (${m.link})`);
      assert.ok(Math.abs(m.mark - m.glyph) < 0.5, `the mark's centre ${m.mark} is on the glyphs' ${m.glyph}`);
      await page.close();
    });
  }
});

describe("The notification bell's unread dot", () => {
  test("holds one place at rest, while pressed, open and closed", async () => {
    const { page } = await fixturePage(browser, `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 80 }}><B.NotificationCentre entries={[{ id: "a", title: "Synthetic entry", time: "2m ago", unread: true }]} /></div>);`, { theme: "dark", viewport: { width: 800, height: 600 } });
    await settle(page);
    const dot = () => page.evaluate(() => { const cs = getComputedStyle(document.querySelector(".basalt-notifications-trigger[data-unread]"), "::before"); return [cs.top, cs.right, cs.bottom, cs.left, cs.width].join(" "); });
    const rest = await dot();
    assert.match(rest, /^6px 6px/, `the dot sits at the top end (${rest})`);
    const box = await page.locator(".basalt-notifications-trigger").boundingBox();
    await page.mouse.move(box.x + 16, box.y + 16);
    await page.mouse.down();
    assert.equal(await dot(), rest, "pressed");
    await page.mouse.up();
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".basalt-notifications-trigger").getAttribute("aria-expanded"), "true");
    assert.equal(await dot(), rest, "open");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    assert.equal(await dot(), rest, "closed");
    await page.close();
  });
});

// The owner, 2026-11-22 (DECISIONS 268): popups open below their opener, never beside it. Base UI's popover default let a centre
// taller than the room above and below jump to the bell's left; it now stays under the bell and scrolls inside.
describe("A popup taller than the room stays below its opener", () => {
  const entries = Array.from({ length: 20 }, (_, i) => `{ id: "e${i}", title: "Synthetic entry ${i + 1}", description: "A second line of synthetic words", time: "${i + 1}m ago", unread: ${i < 3} }`).join(",");
  for (const theme of ["dark", "light"]) {
    test(`the notification centre opens under the bell at its end edge, and scrolls (${theme})`, async () => {
      const { page } = await fixturePage(browser, `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<header style={{ display: "flex", justifyContent: "flex-end", padding: 12 }}><B.NotificationCentre entries={[${entries}]} /></header>);`, { theme, viewport: { width: 1440, height: 700 } });
      await settle(page);
      await page.locator(".basalt-notifications-trigger").click();
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => {
        const bell = document.querySelector(".basalt-notifications-trigger").getBoundingClientRect();
        const pop = document.querySelector(".basalt-notifications").getBoundingClientRect();
        const scroll = document.querySelector(".basalt-notifications-scroll");
        return { side: document.querySelector(".basalt-notifications").closest(".basalt-positioner").getAttribute("data-side"), bell: { bottom: bell.bottom, right: bell.right }, pop: { top: pop.top, bottom: pop.bottom, right: pop.right }, scrolls: scroll.scrollHeight > scroll.clientHeight, vh: innerHeight };
      });
      assert.equal(m.side, "bottom", "placed below");
      assert.ok(m.pop.top >= m.bell.bottom, `the popup's top ${m.pop.top} is under the bell's bottom ${m.bell.bottom}`);
      assert.ok(Math.abs(m.pop.right - m.bell.right) < 0.5, `its end edge ${m.pop.right} is the bell's ${m.bell.right}`);
      assert.ok(m.pop.bottom <= m.vh, `it fits the window (${m.pop.bottom} of ${m.vh})`);
      assert.ok(m.scrolls, "the list scrolls inside");
      await page.close();
    });
  }

  test("a plain popover taller than the room stays below and scrolls", async () => {
    const lines = Array.from({ length: 60 }, (_, i) => `<p>Synthetic line ${i + 1}</p>`).join("");
    const { page } = await fixturePage(browser, `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ display: "flex", justifyContent: "flex-end", padding: 12 }}><B.Popover><B.PopoverTrigger render={<B.Button>Details</B.Button>} /><B.PopoverContent align="end">${lines}</B.PopoverContent></B.Popover></div>);`, { theme: "dark", viewport: { width: 1024, height: 600 } });
    await settle(page);
    await page.getByRole("button", { name: "Details" }).click();
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const pop = document.querySelector(".basalt-popover");
      const r = pop.getBoundingClientRect();
      const t = [...document.querySelectorAll("button")].find((b) => b.textContent === "Details").getBoundingClientRect();
      return { side: pop.closest(".basalt-positioner").getAttribute("data-side"), top: r.top, bottom: r.bottom, trigger: t.bottom, scrolls: pop.scrollHeight > pop.clientHeight, vh: innerHeight };
    });
    assert.equal(m.side, "bottom");
    assert.ok(m.top >= m.trigger, `under the trigger (${m.top} against ${m.trigger})`);
    assert.ok(m.bottom <= m.vh && m.scrolls, `fits the window and scrolls (${m.bottom} of ${m.vh})`);
    await page.close();
  });
});
