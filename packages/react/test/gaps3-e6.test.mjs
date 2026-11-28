// cimip-gaps-3 E6 (engineering, DECISIONS 402): the narrow ListBand that holds its pager's seat (G144), VersionLink's `place` and the rail's tooltip
// outside AppShell (G160), and IconButton's `icon` as a node (G161). Driven in Chromium against the built package with the real stylesheet. Synthetic
// data in unlike domains (a library's loans, a greenhouse's sensors, a studio's bookings). Written while tests are paused (DECISIONS 359): not run yet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const COARSE = { hasTouch: true, isMobile: true };
const open = async (body, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme, viewport: { width, height }, standards: true, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const near = (a, b, what, tolerance = 0.5) => {
  for (const key of Object.keys(a)) assert.ok(Math.abs(a[key] - b[key]) <= tolerance, `${what}: ${key} ${a[key]} then ${b[key]}`);
};

// ---- G144: the narrow band holds its pager's seat ----

/**
 * A list of loans whose total the app sets from outside (`window.setTotal`): `null` until "the server" answers. The band's own padding is 16 on each
 * side, so a 390 page is a 358 band and a 320 page a 288 band (the one where the pager and the page size cannot share a row).
 */
const LOANS = ({ props = "", total = "null", dir = "ltr" } = {}) => `
function List() {
  const [total, setTotal] = React.useState(${total});
  const [size, setSize] = React.useState(10);
  const [page, setPage] = React.useState(1);
  window.setTotal = setTotal;
  window.setSize = setSize;
  const rows = Math.min(size, total ?? 0);
  return <B.ListBand id="band" total={total} seatTotal={999} page={page} pageSize={size} pageSizes={[10, 25, 50]} onPageChange={setPage} onPageSizeChange={setSize} noun="Loans" ${props}>
    <B.PanelList aria-label="Loans">{Array.from({ length: rows }, (_, i) => <B.PanelRow key={i} href={"#l" + i} title={"Loan " + (i + 1)} />)}</B.PanelList>
  </B.ListBand>;
}
document.documentElement.dir = "${dir}";
createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><button type="button" id="before">Before</button><List /></div>);`;

const SELECT = ".basalt-list-band-size .basalt-select-trigger";
const PAGER = ".basalt-list-band-row > .basalt-pagination";
const parts = async (page) => ({
  band: await box(page.locator("#band")),
  row: await box(page.locator(".basalt-list-band-row")),
  select: await box(page.locator(SELECT)),
});
const setTotal = async (page, total) => { await page.evaluate((n) => window.setTotal(n), total); await settle(page); };

describe("ListBand holds its pager's seat in the narrow form (G144)", () => {
  // 320 (a 288 band) is under the width where the pager and the page size share a row; 390 (358) and 600 are over it.
  for (const [width, options] of [[320, COARSE], [390, COARSE], [600, {}]]) {
    test(`at ${width}${options.hasTouch ? " on touch" : ""}: a total that arrives late (null, then 3 pages) moves nothing in the band`, async () => {
      const page = await open(LOANS(), { width, height: 844, ...options });
      const before = await parts(page);
      assert.equal(await page.locator("#band").getAttribute("data-hold"), "");
      await setTotal(page, 27);
      const after = await parts(page);
      near(before.band, after.band, "the band");
      near(before.select, after.select, "the page size");
      assert.equal(await page.locator(PAGER).evaluate((el) => getComputedStyle(el).visibility), "visible", "the pager is drawn in its seat");
      assert.deepEqual(page.errors, []);
      await page.close();
    });
    test(`at ${width}${options.hasTouch ? " on touch" : ""}: with keepFootRoom one page is the height of three, both ways`, async () => {
      const page = await open(LOANS({ props: "keepFootRoom", total: 4 }), { width, height: 844, ...options });
      const one = await parts(page);
      await setTotal(page, 27);
      const three = await parts(page);
      near(one.band, three.band, "one page to three");
      near(one.select, three.select, "the page size, one page to three");
      await setTotal(page, 4);
      near(await parts(page), one, "three pages back to one");
      await page.close();
    });
  }

  test("the held seat is unseen, inert, no tab stop and no landmark; the range is drawn on the gutter", async () => {
    const page = await open(LOANS({ props: "keepFootRoom", total: 4 }), { width: 390, height: 844, ...COARSE });
    const pager = page.locator(PAGER);
    assert.equal(await pager.evaluate((el) => getComputedStyle(el).visibility), "hidden");
    assert.equal(await pager.evaluate((el) => el.inert), true, "inert");
    assert.equal(await pager.getAttribute("role"), "none", "no landmark");
    assert.equal(await pager.getAttribute("aria-label"), null);
    assert.equal(await page.getByRole("navigation").count(), 0, "no nav landmark is read out");
    // Tab from the button before the band reaches the page size and nothing in the held seat.
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest(".basalt-list-band-size"))), true, "the first stop is the page size");
    // The range starts the row, on the gutter, and is read; the pager's copy of it is not.
    const row = await box(page.locator(".basalt-list-band-row"));
    const range = page.locator(".basalt-list-band-row > .basalt-list-band-range [data-on]");
    assert.equal(Math.round((await box(range)).x), Math.round(row.x), "on the gutter");
    assert.match(await range.textContent(), /^1–4 of 4/);
    const snapshot = await page.locator("#band").ariaSnapshot();
    assert.equal(snapshot.match(/1–4 of 4/g)?.length ?? 0, 1, `the range is read once:\n${snapshot}`);
    await page.close();
  });

  test("over the wrap width, a held band at one page draws what the unheld one does: the range, the page size and the row in the same place", async () => {
    for (const [width, options] of [[390, COARSE], [600, {}]]) {
      const held = await open(LOANS({ props: "keepFootRoom", total: 4 }), { width, height: 844, ...options });
      const plain = await open(LOANS({ total: 4 }), { width, height: 844, ...options });
      const range = ".basalt-list-band-row > .basalt-list-band-range [data-on]";
      near(await box(held.locator(range)), await box(plain.locator(range)), `the range at ${width}`);
      near(await parts(held), await parts(plain), `the band at ${width}`);
      await held.close();
      await plain.close();
    }
  });

  test("under the wrap width (a 288 band on touch) the held band at one page is two rows, the page size ending the second, as with three pages", async () => {
    const page = await open(LOANS({ props: "keepFootRoom", total: 4 }), { width: 320, height: 844, ...COARSE });
    const row = await box(page.locator(".basalt-list-band-row"));
    const select = await box(page.locator(".basalt-list-band-size"));
    const pager = await box(page.locator(PAGER));
    assert.ok(select.y >= pager.y + pager.height - 0.5, `the page size is on a second row (${select.y} under ${pager.y + pager.height})`);
    assert.ok(Math.abs(select.x + select.width - (row.x + row.width)) <= 0.5, "the page size ends its row");
    await page.close();
  });

  test("right to left: the range starts on the start gutter, over the held seat", async () => {
    const page = await open(LOANS({ props: "keepFootRoom", total: 4, dir: "rtl" }), { width: 390, height: 844, ...COARSE });
    const row = await box(page.locator(".basalt-list-band-row"));
    const range = await box(page.locator(".basalt-list-band-row > .basalt-list-band-range [data-on]"));
    assert.ok(Math.abs(range.x + range.width - (row.x + row.width)) <= 0.5, "on the start (right) gutter");
    await page.close();
  });

  test('onePage="size" with keepFootRoom: the page size alone, the held seat unseen, and one page is the height of three under the wrap width', async () => {
    const page = await open(LOANS({ props: 'onePage="size" keepFootRoom', total: 4 }), { width: 320, height: 844, ...COARSE });
    assert.equal(await page.locator(".basalt-list-band-row > .basalt-list-band-range").evaluate((el) => getComputedStyle(el).display), "none");
    const one = await parts(page);
    await setTotal(page, 27);
    near(one, await parts(page), "one page to three");
    await page.close();
  });

  test("unchanged without either: a known total of one page and no keepFootRoom draws no pager and is one row at 288 (T3)", async () => {
    const page = await open(LOANS({ total: 4 }), { width: 320, height: 844, ...COARSE });
    assert.equal(await page.locator("#band").getAttribute("data-hold"), null);
    assert.equal(await page.locator(PAGER).evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await page.locator(PAGER).evaluate((el) => el.inert), false);
    const row = await box(page.locator(".basalt-list-band-row"));
    assert.ok(row.height <= 60, `one row (${row.height})`);
    await page.close();
  });

  test("a total of null blanks the count, says nothing, and the foot stays out unless keepFootRoom holds it", async () => {
    const page = await open(LOANS(), { width: 390, height: 844, ...COARSE });
    assert.equal((await page.locator(".basalt-list-band-row > .basalt-list-band-range").innerText()).trim(), "");
    assert.equal(await page.locator(".basalt-list-band-foot").evaluate((el) => el.hidden), true);
    assert.equal((await page.locator("#band [role=status]").textContent()).trim(), "");
    await page.close();
  });
});

// ---- G160: VersionLink's place outside AppShell ----

const VERSION = (jsx) => `
document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<B.TooltipProvider><div style={{ width: 64, padding: "16px 0" }} id="rail">${jsx}</div><div id="page"><B.VersionLink id="plain" version="3.2.0" date="2026-10-02" href="/notes#v3.2.0" /></div></B.TooltipProvider>);`;

describe("VersionLink's place outside AppShell (G160)", () => {
  test('place="rail" draws the number alone with its whole line in its name; a link with no place is the plain line', async () => {
    const page = await open(VERSION('<B.VersionLink id="v" place="rail" version="3.2.0" date="2026-10-02" href="/notes#v3.2.0" />'), { width: 820 });
    const link = page.locator("#v");
    assert.equal(await link.getAttribute("data-place"), "rail");
    assert.equal(await link.evaluate((el) => getComputedStyle(el.querySelector(".basalt-version-link-word")).position), "absolute", "the word is in the name only");
    assert.equal(await link.evaluate((el) => getComputedStyle(el.querySelector(".basalt-version-link-date")).position), "absolute", "the date is in the name only");
    assert.equal(await page.getByRole("link", { name: "Version 3.2.0, Oct 2, 2026, release notes" }).count(), 2);
    assert.equal(await page.locator("#plain").getAttribute("data-place"), null);
    // No part handed a tooltip down: none opens, and nothing is loaded for one.
    await link.hover();
    await page.waitForTimeout(800);
    assert.equal(await page.getByRole("tooltip").count(), 0);
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("RailTooltipContext with Basalt's Tooltip: the rail's link shows its whole line in a tooltip on hover and on focus", async () => {
    const page = await open(VERSION('<B.RailTooltipContext.Provider value={B.Tooltip}><B.VersionLink id="v" place="rail" version="3.2.0" date="2026-10-02" href="/notes#v3.2.0" /></B.RailTooltipContext.Provider>'), { width: 820 });
    const link = page.locator("#v");
    await link.hover();
    const tip = page.getByRole("tooltip");
    await tip.waitFor();
    assert.match((await tip.textContent()).replace(/\s+/g, " "), /Version 3\.2\.0.*Oct 2, 2026/);
    assert.equal(await link.evaluate((el) => (el.getAttribute("aria-describedby") ?? "").length > 0), true, "the tooltip describes the link");
    await page.mouse.move(700, 600);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "v");
    await tip.waitFor();
    await page.close();
  });

  test("place wins over the part's; VersionPlaceContext sets it for what an app's own part holds", async () => {
    const page = await open(VERSION('<B.VersionPlaceContext.Provider value="rail"><B.VersionLink id="v" version="3.2.0" date="2026-10-02" href="/notes" /><B.VersionLink id="w" place="foot" version="3.2.0" date="2026-10-02" href="/notes" /></B.VersionPlaceContext.Provider>'), { width: 820 });
    assert.equal(await page.locator("#v").getAttribute("data-place"), "rail");
    assert.equal(await page.locator("#w").getAttribute("data-place"), "foot");
    await page.close();
  });

  test("AppShell's own rail is as it was: its version takes the shell's place and the shell's on-demand tooltip", async () => {
    const page = await open(`
document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<B.AppShell brand={<span>Field notes</span>} brandLabel="Field notes home" sidebar={<B.Nav aria-label="Main"><B.NavItem href="/" icon={B.HomeGlyph}>Home</B.NavItem></B.Nav>} version={<B.VersionLink version="3.2.0" date="2026-10-02" href="/notes" />}><p>Body</p></B.AppShell>);`, { width: 820 });
    const link = page.locator(".basalt-app-sidebar .basalt-version-link");
    assert.equal(await link.getAttribute("data-place"), "rail");
    const tip = page.getByRole("tooltip");
    for (let attempt = 0; attempt < 10 && !(await tip.count()); attempt++) {
      await page.mouse.move(400, 400);
      await link.hover();
      await page.waitForTimeout(300);
    }
    await tip.waitFor();
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds nothing on an app's own rail with the tooltip (${theme})`, async () => {
      const page = await open(VERSION('<B.RailTooltipContext.Provider value={B.Tooltip}><B.VersionLink place="rail" version="3.2.0" date="2026-10-02" href="/notes" /></B.RailTooltipContext.Provider>'), { theme, width: 820 });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

// ---- G161: IconButton's icon as a node ----

const BAR = `
document.body.style.margin = "0";
function Bar() {
  const [busy, setBusy] = React.useState(false);
  window.setBusy = setBusy;
  return <div style={{ display: "flex", gap: 8, padding: 24 }}>
    <B.IconButton id="glyph" variant="ghost" icon={B.SearchGlyph} label="Search bookings" />
    <B.IconButton id="account" variant="ghost" icon={<B.Avatar size={24} name="Rui Okafor" />} label="Account: Rui Okafor" loading={busy} />
    <B.IconButton id="sensor" variant="secondary" size="sm" icon={<span id="dot" style={{ display: "block", width: 10, height: 10, borderRadius: 5, background: "currentColor" }} />} label="Greenhouse sensor 4" />
  </div>;
}
createRoot(document.getElementById("root")).render(<Bar />);`;

describe("IconButton's icon as a node (G161)", () => {
  test("an Avatar at 24 sits centred in the 32 square, hidden from assistive technology; the button's name is its label", async () => {
    const page = await open(BAR);
    const button = await box(page.locator("#account"));
    assert.deepEqual([button.width, button.height], [32, 32]);
    const avatar = await box(page.locator("#account .basalt-avatar"));
    assert.deepEqual([avatar.width, avatar.height], [24, 24]);
    near({ x: avatar.x - button.x, y: avatar.y - button.y }, { x: 4, y: 4 }, "centred");
    assert.equal(await page.locator("#account .basalt-button-node").getAttribute("aria-hidden"), "true");
    assert.equal(await page.getByRole("button", { name: "Account: Rui Okafor", exact: true }).count(), 1);
    // Any element: a 10px dot in a 28 square, centred the same way.
    const sensor = await box(page.locator("#sensor"));
    const dot = await box(page.locator("#dot"));
    near({ x: dot.x - sensor.x, y: dot.y - sensor.y }, { x: (sensor.width - 10) / 2, y: (sensor.height - 10) / 2 }, "the dot centred");
    await page.close();
  });

  test("the same ring, press and hit area as the glyph form", async () => {
    const page = await open(BAR);
    const look = (id) => page.locator(id).evaluate((el) => { const s = getComputedStyle(el); return { outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineOffset} ${s.outlineColor}`, radius: s.borderRadius, transition: s.transitionProperty }; });
    await page.keyboard.press("Tab");
    const glyphRing = await look("#glyph");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "account");
    assert.deepEqual(await look("#account"), glyphRing, "the ring and the radius");
    // The press: Button and IconButton scale to .98.
    const account = await box(page.locator("#account"));
    await page.mouse.move(account.x + 16, account.y + 16);
    await page.mouse.down();
    await page.waitForTimeout(200);
    assert.match(await page.locator("#account").evaluate((el) => getComputedStyle(el).transform), /matrix\(0\.98/);
    await page.mouse.up();
    // The hit area is the square: a point on the avatar's corner lands on the button.
    assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.id, [account.x + 1, account.y + 1]), "account");
    await page.close();
  });

  test("on touch the 32 control keeps a 44 hit area and the avatar stays 24, centred", async () => {
    const page = await open(BAR, { width: 390, height: 844, ...COARSE });
    const button = await box(page.locator("#account"));
    const avatar = await box(page.locator("#account .basalt-avatar"));
    assert.deepEqual([avatar.width, avatar.height], [24, 24]);
    near({ x: avatar.x + 12, y: avatar.y + 12 }, { x: button.x + button.width / 2, y: button.y + button.height / 2 }, "centred");
    assert.ok(button.width >= 44 || (await page.locator("#account").evaluate((el) => { const a = getComputedStyle(el, "::after"); return parseFloat(a.width) >= 44 || parseFloat(a.height) >= 44; })), "a 44 target");
    await page.close();
  });

  test("busy: the node gives way to the ring and the button keeps its size", async () => {
    const page = await open(BAR);
    const before = await box(page.locator("#account"));
    await page.evaluate(() => window.setBusy(true));
    await settle(page);
    assert.equal(await page.locator("#account .basalt-button-node").evaluate((el) => getComputedStyle(el).opacity), "0");
    assert.equal(await page.locator("#account .basalt-button-spinner").count(), 1);
    near(await box(page.locator("#account")), before, "the button");
    await page.close();
  });

  test("the component form is as it was: its glyph is the button's own child, with no node wrapper", async () => {
    const page = await open(BAR);
    assert.equal(await page.locator("#glyph > .basalt-icon").count(), 1);
    assert.equal(await page.locator("#glyph .basalt-button-node").count(), 0);
    const glyph = await box(page.locator("#glyph > .basalt-icon"));
    const button = await box(page.locator("#glyph"));
    near({ x: glyph.x - button.x, y: glyph.y - button.y }, { x: 8, y: 8 }, "the 16 glyph centred in 32");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds nothing in the bar (${theme})`, async () => {
      const page = await open(BAR, { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});
