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
