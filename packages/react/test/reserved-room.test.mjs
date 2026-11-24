// Reserved room across every component (DECISIONS 328, 329, 336), in Chromium against the built package with the real stylesheet: the line a hung
// control's glyph or words sit on, its ring, the room it may use, its targets, the toast's hit areas, the selection column, and that nothing moves
// where a seat was decided. At 1440 on a fine pointer and at 390 on touch, in both themes, left to right and right to left.
// WRITTEN, NOT RUN: browser tests are paused (DECISIONS 330). The node-only half is reserved-room-rules.test.mjs.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const DIRS = ["ltr", "rtl"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const TABLET = { viewport: { width: 800, height: 900 }, hasTouch: true, isMobile: true };
const WIDTHS = [["1440", DESKTOP], ["390 on touch", PHONE]];
const SHELL = (body, dir = "ltr") => `document.documentElement.dir = "${dir}"; document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)"; createRoot(document.getElementById("root")).render(<>${body}</>);`;
const open = async (body, options, theme, dir = "ltr") => {
  const { page, errors } = await fixturePage(browser, SHELL(body, dir), { theme, colorScheme: theme, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};

/**
 * The line: where the head's words start from its inner start edge, and where the control's glyph (icon-only) or words end from its inner end edge
 * (inner edges are the padding box: the rim is in neither), mirrored right to left. Also the control's box to the inner edge, and its ring.
 */
const line = (page, head, text, control, side = "end") => page.evaluate(([head, text, control, side]) => {
  const h = document.querySelector(head);
  const c = h.querySelector(control) ?? document.querySelector(control);
  const t = text ? h.querySelector(text) : null;
  const hs = getComputedStyle(h);
  const hr = h.getBoundingClientRect();
  const rtl = hs.direction === "rtl";
  const innerStart = rtl ? hr.right - parseFloat(hs.borderRightWidth) : hr.left + parseFloat(hs.borderLeftWidth);
  const innerEnd = rtl ? hr.left + parseFloat(hs.borderLeftWidth) : hr.right - parseFloat(hs.borderRightWidth);
  const glyph = c.querySelector("svg");
  const range = document.createRange();
  const words = c.querySelector(".basalt-button-label") ?? c;
  range.selectNodeContents(words);
  const shownRect = glyph && !c.textContent.trim() ? glyph.getBoundingClientRect() : range.getBoundingClientRect();
  const cr = c.getBoundingClientRect();
  const fromStart = (x) => Math.abs(x - innerStart);
  const fromEnd = (x) => Math.abs(innerEnd - x);
  let textStart = null;
  if (t) { const r = document.createRange(); r.selectNodeContents(t); const tr = r.getBoundingClientRect(); textStart = fromStart(rtl ? tr.right : tr.left); }
  const shown = side === "end" ? fromEnd(rtl ? shownRect.left : shownRect.right) : fromStart(rtl ? shownRect.right : shownRect.left);
  const clear = side === "end" ? fromEnd(rtl ? cr.left : cr.right) : fromStart(rtl ? cr.right : cr.left);
  c.focus({ focusVisible: true });
  return { textStart, shown, clear, ring: parseFloat(getComputedStyle(c).outlineOffset), box: [cr.left, cr.top, cr.right, cr.bottom], head: [hr.left, hr.top, hr.right, hr.bottom], pad: parseFloat(side === "end" ? (rtl ? hs.paddingLeft : hs.paddingRight) : (rtl ? hs.paddingRight : hs.paddingLeft)) };
}, [head, text, control, side]);

// Section 1's table: [name, fixture, head, the head's words, the control, side, at 1440 { shown, ring }, at 390 { shown, ring }].
const SITES = [
  ["sheet head", `<B.Sheet open><B.SheetContent side="right"><B.SheetHeader closeLabel="Close cart"><B.SheetTitle>Your cart</B.SheetTitle></B.SheetHeader><B.SheetBody><p>Lines</p></B.SheetBody></B.SheetContent></B.Sheet>`, ".basalt-sheet-head", ".basalt-dialog-title", ".basalt-sheet-close", "end", { shown: 20, ring: 2 }, { shown: 20, ring: 2 }],
  ["search dialog's Close", `<B.SearchDialog open onOpenChange={() => {}} title="Search" label="Search products" query="" onQueryChange={() => {}} count="Type to search"><B.SearchResults /></B.SearchDialog>`, ".basalt-search-form", null, ".basalt-search-close", "end", { shown: 16, ring: -2 }, { shown: 16, ring: -2 }],
  ["app header's last ghost icon", `<B.AppHeader title="Runs" actions={<B.IconButton icon={B.SearchGlyph} label="Search" edge="end" />} />`, ".basalt-app-header", ".basalt-app-title", ".basalt-bar-actions > .basalt-button", "end", { shown: 24, ring: 2 }, { shown: 16, ring: -2 }],
  ["status bar's last ghost button", `<B.StatusBar start={<B.Button variant="ghost" size="sm">run 4f2a</B.Button>} sources={<B.Button variant="ghost" size="sm">2 sources</B.Button>} end={<B.Button variant="ghost" size="sm">Theme</B.Button>} />`, ".basalt-status-bar", null, ".basalt-status-bar-end .basalt-button", "end", { shown: 24, ring: 2 }, { shown: 16, ring: 2 }],
  ["status bar's first ghost button", `<B.StatusBar start={<B.Button variant="ghost" size="sm">run 4f2a</B.Button>} sources={<B.Button variant="ghost" size="sm">2 sources</B.Button>} end={<B.Button variant="ghost" size="sm">Theme</B.Button>} />`, ".basalt-status-bar", null, ".basalt-status-bar-start .basalt-button", "start", { shown: 24, ring: 2 }, { shown: 16, ring: 2 }],
  ["code block's titled copy", `<div style={{ padding: 24 }}><B.CodeBlock title="config.json" code={'{ "a": 1 }'} /></div>`, ".basalt-code-title", ".basalt-code-title > span", ".basalt-code-copy .basalt-button", "end", { shown: 16, ring: 2 }, { shown: 16, ring: -2 }],
  ["terminal's copy", `<div style={{ padding: 24 }}><B.Terminal title="Deploy" lines={[{ kind: "command", text: "npm run build" }]} /></div>`, ".basalt-terminal-head", ".basalt-terminal-title", ".basalt-terminal-actions .basalt-button:not([hidden])[data-edge]", "end", { shown: 16, ring: 2 }, { shown: 16, ring: -2 }],
  ["icon links in a card", `<div style={{ padding: 24, width: 320 }}><B.Card><B.CardContent><p style={{ margin: 0 }}>Ada</p><B.SocialLinks iconOnly aria-label="Elsewhere"><B.SocialLink service="github" href="#a">GitHub</B.SocialLink><B.SocialLink service="github" href="#b">Mirror</B.SocialLink></B.SocialLinks></B.CardContent></B.Card></div>`, ".basalt-card-content", "p", ".basalt-social-links .basalt-button", "start", { shown: 16, ring: 2 }, { shown: 16, ring: -2 }],
];

describe("The line and the ring", () => {
  for (const [name, fixture, head, text, control, side, wide, narrow] of SITES) {
    for (const [width, options] of WIDTHS) {
      for (const dir of DIRS) {
        for (const theme of THEMES) {
          test(`${name}, ${width}, ${dir}, ${theme}: what it shows is on the head's line, its box inside the head, its ring by the room`, async () => {
            const page = await open(fixture, options, theme, dir);
            const m = await line(page, head, text, control, side);
            const want = width === "1440" ? wide : narrow;
            assert.ok(Math.abs(m.shown - want.shown) <= 0.5, `shown ${m.shown}, want ${want.shown}`);
            if (m.textStart !== null) assert.ok(Math.abs(m.textStart - m.shown) <= 0.5, `the words start at ${m.textStart}, the control ends at ${m.shown}`);
            assert.equal(m.ring, want.ring);
            // the ring's four sides are inside the head's clipping box
            const reach = m.ring + 2;
            assert.ok(m.box[0] - reach >= m.head[0] - 0.5 && m.box[2] + reach <= m.head[2] + 0.5, "the ring is inside the head");
            assert.deepEqual(page.errors, []);
            await page.close();
          });
        }
      }
    }
  }
  test("a control with edge in a head that declares no room has no margin and the ordinary +2", async () => {
    const page = await open(`<div style={{ display: "flex", padding: 16 }}><span style={{ flex: 1 }}>Head</span><B.IconButton id="c" icon={B.SearchGlyph} label="Search" edge="end" /></div>`, DESKTOP, "dark");
    const c = page.locator("#c");
    assert.equal(await c.evaluate((el) => getComputedStyle(el).marginInlineEnd), "0px");
    await c.focus();
    assert.equal(await c.evaluate((el) => getComputedStyle(el).outlineOffset), "2px");
    await page.close();
  });
  test("at 800 on a coarse pointer: a 44px icon button at a 24 gutter hangs 14, and an xs 'Go' is its word's width with its word on the line", async () => {
    const page = await open(`<B.StatusBar start={<B.Button variant="ghost" size="xs" id="go">Go</B.Button>} end={<B.IconButton icon={B.SearchGlyph} label="Search" id="i" />} />`, TABLET, "dark");
    const m = await line(page, ".basalt-status-bar", null, "#go", "start");
    assert.ok(Math.abs(m.shown - 24) <= 0.5, `the word starts ${m.shown} from the inner edge`);
    const go = await page.locator("#go").evaluate((el) => { const r = el.getBoundingClientRect(); const b = getComputedStyle(el, "::before"); return { w: r.width, hit: [r.width - parseFloat(b.left) - parseFloat(b.right), r.height - parseFloat(b.top) - parseFloat(b.bottom)] }; });
    assert.ok(go.w < 44, "the box is as wide as its word");
    assert.deepEqual(go.hit.map(Math.round), [46, 46]);
    await page.close();
  });
  test("a 360px terminal at 1440 on a fine pointer hangs its compact copy by 6", async () => {
    const page = await open(`<div style={{ width: 360, padding: 24 }}><B.Terminal title="Deploy" lines={[{ kind: "command", text: "ls" }]} /></div>`, DESKTOP, "dark");
    const m = await line(page, ".basalt-terminal-head", ".basalt-terminal-title", ".basalt-terminal-copy-compact", "end");
    assert.ok(Math.abs(m.shown - 16) <= 0.5);
    assert.equal(m.ring, 2);
    await page.close();
  });
});

describe("The room", () => {
  test("a row of icon links with nothing round it, at the viewport's start: the first link is wholly on screen", async () => {
    for (const options of [DESKTOP, PHONE]) {
      const page = await open(`<B.SocialLinks iconOnly aria-label="Elsewhere"><B.SocialLink service="github" href="#a">GitHub</B.SocialLink></B.SocialLinks>`, options, "dark");
      assert.ok((await page.locator(".basalt-social-links .basalt-button").boundingBox()).x >= 0);
      await page.close();
    }
  });
  const BARS = [
    ["the site bar", `<B.SiteHeader brand="Orbit" links={[{ href: "/", label: "Home" }]} />`, ".basalt-site-menu-trigger"],
    ["the app header", `<B.AppHeader title="Runs" actions={<B.IconButton icon={B.SearchGlyph} label="Search" edge="end" />} />`, ".basalt-bar-actions > .basalt-button"],
    ["the status bar", `<B.StatusBar start={<B.Button variant="ghost" size="sm">run</B.Button>} sources={<B.Button variant="ghost" size="sm">2 sources</B.Button>} end={<B.Button variant="ghost" size="sm">Theme</B.Button>} />`, ".basalt-status-bar-end .basalt-button"],
    ["a sheet's head", `<B.Sheet open><B.SheetContent side="right"><B.SheetHeader closeLabel="Close"><B.SheetTitle>Cart</B.SheetTitle></B.SheetHeader></B.SheetContent></B.Sheet>`, ".basalt-sheet-close"],
  ];
  for (const [name, fixture, control] of BARS) {
    for (const dir of DIRS) {
      test(`${name}, 390, ${dir}, a 34px inset on the line's end side: the last control is wholly outside the inset`, async () => {
        const page = await open(fixture, PHONE, "dark", dir);
        // The safe area is simulated on the root's own reads (env() is 0 in a test browser).
        await page.addStyleTag({ content: `:root { --_inset-${dir === "rtl" ? "left" : "right"}: 34px !important; }` });
        await settle(page);
        const r = await page.locator(control).first().boundingBox();
        const vw = 390;
        if (dir === "ltr") assert.ok(r.x + r.width <= vw - 34 + 0.5, `ends ${vw - (r.x + r.width)} from the edge`);
        else assert.ok(r.x >= 34 - 0.5, `starts ${r.x} from the edge`);
        await page.close();
      });
    }
  }
  test("the open site menu's band: Close is wholly outside a 34px inset", async () => {
    const page = await open(`<B.SiteHeader brand="Orbit" links={[{ href: "/", label: "Home" }]} />`, PHONE, "dark");
    await page.addStyleTag({ content: ":root { --_inset-right: 34px !important; }" });
    await page.locator(".basalt-site-menu-trigger").click();
    await settle(page);
    const r = await page.locator(".basalt-site-menu-close").boundingBox();
    assert.ok(r.x + r.width <= 390 - 34 + 0.5);
    await page.close();
  });
});

describe("Targets", () => {
  test("two rows of icon links keep their full 44 each, and no tap box crosses the card's rim", async () => {
    const page = await open(`<div style={{ width: 200, padding: 24 }}><B.Card><B.CardContent><B.SocialLinks iconOnly aria-label="Elsewhere">{Array.from({ length: 8 }, (_, i) => <B.SocialLink key={i} service="github" href={"#" + i}>{"Link " + i}</B.SocialLink>)}</B.SocialLinks></B.CardContent></B.Card></div>`, PHONE, "dark");
    const boxes = await page.locator(".basalt-social-links .basalt-button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    for (const b of boxes) assert.ok(b.width >= 44 && b.height >= 44);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]; const b = boxes[j];
      assert.ok(a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5, `${i} and ${j} overlap`);
    }
    const card = await page.locator(".basalt-card").boundingBox();
    for (const b of boxes) assert.ok(b.left >= card.x && b.bottom <= card.y + card.height, "inside the card's rim");
    await page.close();
  });
});

describe("The toast's targets", () => {
  for (const theme of THEMES) {
    test(`${theme}, 390 on touch: Dismiss and a 'Go' action are 46 at rest and at least 44 held, inside the toast, apart, and every point of the row answers to one`, async () => {
      const page = await open(`<B.ToastProvider><B.Toaster /><Show /></B.ToastProvider>`.replace("<Show />", `{(() => { const t = B.useToast(); React.useEffect(() => { t.add({ title: "Saved", actionProps: { children: "Go" } }); }, []); return null; })()}`), PHONE, theme);
      await page.waitForSelector(".basalt-toast-close");
      const hit = (sel) => page.locator(sel).evaluate((el) => { const r = el.getBoundingClientRect(); const b = getComputedStyle(el, "::before"); return { x: r.x - parseFloat(b.left) * -1, w: r.width - parseFloat(b.left) - parseFloat(b.right), h: r.height - parseFloat(b.top) - parseFloat(b.bottom), r: r.toJSON() }; });
      const dismiss = await hit(".basalt-toast-close");
      const action = await hit(".basalt-toast-action");
      assert.deepEqual([Math.round(dismiss.w), Math.round(dismiss.h)], [46, 46]);
      assert.ok(action.w >= 46 - 0.5 && action.h >= 46 - 0.5);
      const toast = await page.locator(".basalt-toast").boundingBox();
      for (const t of [dismiss, action]) assert.ok(t.r.x >= toast.x && t.r.right <= toast.x + toast.width);
      for (const sel of [".basalt-toast-close", ".basalt-toast-action"]) {
        const b = await page.locator(sel).boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(120);
        const held = await hit(sel);
        assert.ok(held.w >= 44 && held.h >= 44, `${sel} held: ${held.w} by ${held.h}`);
        await page.mouse.up();
      }
      const d = await page.locator(".basalt-toast-close").boundingBox();
      const a = await page.locator(".basalt-toast-action").boundingBox();
      const y = d.y + d.height / 2;
      const owners = await page.evaluate(([from, to, y]) => { const out = []; for (let x = from; x <= to; x += 1) { const el = document.elementFromPoint(x, y); out.push(el?.closest(".basalt-toast-close") ? "d" : el?.closest(".basalt-toast-action") ? "a" : "t"); } return out.join(""); }, [a.x, d.x + d.width, y]);
      assert.match(owners, /^a+t*d+$/, "the action, then the toast, then Dismiss");
      await page.close();
    });
  }
});

describe("The selection column", () => {
  const TABLE = (width) => `<B.Table aria-label="Runs" columns={[{ width: "${width}" }, { width: "auto" }]} pinned={1}><B.TableHead><B.TableRow><B.TableHeadCell><B.Checkbox aria-label="Select all" /></B.TableHeadCell><B.TableHeadCell sortable>Run</B.TableHeadCell></B.TableRow></B.TableHead><B.TableBody><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run-1" /></B.TableCell><B.TableCell><a href="#r">run-1</a></B.TableCell></B.TableRow></B.TableBody></B.Table>`;
  test("on touch the column is 44 and holds the checkbox's whole hit area; the name's sort button starts the next pixel", async () => {
    for (const width of ["var(--basalt-select-column)", "max(40px, var(--basalt-select-column))"]) {
      const page = await open(TABLE(width), PHONE, "dark");
      const head = page.locator("thead th").first();
      const r = await head.boundingBox();
      assert.ok(Math.abs(r.width - 44) <= 0.5 || width.includes("40px") && r.width >= 44);
      const y = r.y + r.height / 2;
      const owners = await page.evaluate(([x0, x1, y]) => { const out = []; for (let x = x0; x < x1; x += 1) { const el = document.elementFromPoint(x + 0.5, y); out.push(el?.closest("[role=checkbox]") ? "c" : el?.closest("th button, th[aria-sort], .basalt-table-sort") ? "s" : "-"); } return out.join(""); }, [r.x, r.x + r.width + 12, y]);
      assert.match(owners, /^c+s+$/, owners);
      await page.close();
    }
  });
  test("on a fine pointer the column is the width given and the checkbox is centred in it", async () => {
    for (const [width, px] of [["var(--basalt-select-column)", 32], ["40px", 40]]) {
      const page = await open(TABLE(width), DESKTOP, "light");
      const cell = await page.locator("tbody td").first().boundingBox();
      const box = await page.locator("tbody td [role=checkbox]").first().boundingBox();
      assert.ok(Math.abs(cell.width - px) <= 0.5);
      assert.ok(Math.abs((box.x - cell.x) - (cell.x + cell.width - box.x - box.width)) <= 0.5, "centred");
      await page.close();
    }
  });
});

describe("Nothing moves", () => {
  test("the filter's Clear and count keep their x with nothing, some and all chosen", async () => {
    const page = await open(`<B.MultiSelect label="Status" options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma" }]} />`, DESKTOP, "dark");
    const xs = async () => [await page.locator(".basalt-filter-clear").boundingBox(), await page.locator(".basalt-filter-count").boundingBox()].map((b) => b.x);
    const start = await xs();
    await page.locator(".basalt-chip").first().click();
    assert.deepEqual(await xs(), start);
    for (const chip of await page.locator(".basalt-chip").all()) if (!(await chip.getAttribute("data-checked") !== null)) await chip.click();
    assert.deepEqual(await xs(), start);
    await page.close();
  });
  test("the search dialog's field and count keep their y from nothing to full results; the box ends under its last row", async () => {
    const rows = (n) => Array.from({ length: n }, (_, i) => `<B.SearchResult key={${i}} href="#${i}">Result ${i}</B.SearchResult>`).join("");
    const ys = [];
    for (const n of [0, 2, 8]) {
      const page = await open(`<B.SearchDialog open onOpenChange={() => {}} title="Search" label="Search" query="q" onQueryChange={() => {}} count="${n} results"><B.SearchResults>${rows(n)}</B.SearchResults></B.SearchDialog>`, DESKTOP, "dark");
      ys.push([(await page.locator(".basalt-search-input").boundingBox()).y, (await page.locator(".basalt-search-count").boundingBox()).y]);
      const dialog = await page.locator(".basalt-search").boundingBox();
      const list = await page.locator(".basalt-search-results").boundingBox();
      assert.ok(Math.abs(dialog.y + dialog.height - (list.y + list.height) - 1) <= 0.5, "the box ends under the results");
      await page.close();
    }
    assert.deepEqual(ys[1], ys[0]);
    assert.deepEqual(ys[2], ys[0]);
  });
  test("what follows a command list on the open page keeps its y from no query to no match, while the panel hugs its rows", async () => {
    const groups = `[{ label: "Run", commands: Array.from({ length: 6 }, (_, i) => ({ id: "c" + i, label: "Command " + i })) }]`;
    const page = await open(`<div style={{ padding: 24 }}><B.CommandList label="Console" groups={${groups}} /><p id="after">After</p></div>`, DESKTOP, "dark");
    await page.waitForSelector(".basalt-command-input:not([aria-describedby])");
    const before = (await page.locator("#after").boundingBox()).y;
    const panelBefore = (await page.locator(".basalt-command-page").boundingBox()).height;
    await page.locator(".basalt-command-input").fill("zzzz");
    await settle(page);
    assert.equal((await page.locator("#after").boundingBox()).y, before);
    assert.ok((await page.locator(".basalt-command-page").boundingBox()).height < panelBefore, "the panel hugs");
    await page.close();
  });
  test("in a card, with reserve={false}, the list holds no room and the card ends under the panel", async () => {
    const groups = `[{ label: "Run", commands: [{ id: "a", label: "Deploy" }, { id: "b", label: "Build" }] }]`;
    for (const fixture of [`<B.Card><B.CardContent><B.CommandList label="Console" groups={${groups}} /></B.CardContent></B.Card>`, `<B.CommandList reserve={false} label="Console" groups={${groups}} />`]) {
      const page = await open(`<div style={{ padding: 24 }}>${fixture}</div>`, DESKTOP, "light");
      await page.waitForSelector(".basalt-command-input:not([aria-describedby])");
      await page.locator(".basalt-command-input").fill("zzzz");
      await settle(page);
      const host = await page.locator(".basalt-command-split").boundingBox();
      const panel = await page.locator(".basalt-command-page").boundingBox();
      assert.ok(Math.abs(host.height - panel.height) <= 0.5);
      await page.close();
    }
  });
});

describe("Boxes", () => {
  test("the count pill is 24 round one figure, and the button one width for 1, 10 and 99", async () => {
    const page = await open(`<div>{[1, 10, 99].map((n) => <div key={n}><B.Button id={"b" + n} count={n}>Cart</B.Button></div>)}</div>`, DESKTOP, "dark");
    const w = async (id) => (await page.locator(id).boundingBox()).width;
    assert.equal(Math.round((await page.locator("#b1 .basalt-button-count > span").boundingBox()).width), 24);
    assert.equal(await w("#b1"), await w("#b10"));
    assert.equal(await w("#b10"), await w("#b99"));
    await page.close();
  });
  test("in a menu with a checkable row every label starts at one x", async () => {
    const page = await open(`<B.Menu open><B.MenuTrigger>Open</B.MenuTrigger><B.MenuContent><B.MenuItem>Plain</B.MenuItem><B.MenuCheckboxItem checked>Checked</B.MenuCheckboxItem><B.MenuItem icon={B.SearchGlyph}>Glyph</B.MenuItem></B.MenuContent></B.Menu>`, DESKTOP, "dark");
    const xs = await page.locator(".basalt-menu-item-label").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
    assert.equal(new Set(xs).size, 1, xs.join(", "));
    await page.close();
  });
  test("a switch row with no tile has equal gaps to its words and its seat; the option chip's gaps are equal", async () => {
    const page = await open(`<div style={{ width: 360 }}><B.SwitchRow name="Alerts" /><B.OptionChips legend="Size" options={[{ value: "s", label: "Small" }]} /></div>`, DESKTOP, "dark");
    const gaps = await page.locator(".basalt-switch-row").evaluate((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return [cs.paddingInlineStart, cs.paddingInlineEnd]; });
    assert.equal(gaps[0], gaps[1]);
    const chip = await page.locator(".basalt-option-chip").first().evaluate((el) => { const cs = getComputedStyle(el); return [cs.paddingInlineStart, cs.paddingInlineEnd]; });
    assert.equal(chip[0], chip[1]);
    await page.close();
  });
});

describe("The composer", () => {
  test("no status: nothing under the row; at 290 with two actions a long status takes its own row and Send stays on the first", async () => {
    const page = await open(`<div style={{ width: 290 }}><B.Composer label="Message" onSend={() => {}} actions={<><B.IconButton icon={B.PlusGlyph} label="Attach" /><B.IconButton icon={B.SearchGlyph} label="Find" /></>} status="Ada, Grace and Edsger are typing" /></div>`, PHONE, "dark");
    const send = await page.locator(".basalt-composer-send").boundingBox();
    const status = await page.locator(".basalt-composer-status").boundingBox();
    const attach = await page.locator(".basalt-composer-extra").boundingBox();
    assert.ok(status.y >= attach.y + attach.height - 0.5, "the status is under the actions");
    assert.ok(Math.abs(send.y - attach.y) <= 6, "Send is on the first row");
    const region = await page.locator("[aria-live=polite]").count();
    assert.equal(region, 1);
    await page.close();
  });
});

describe("The copy's motion", () => {
  test("after a copy the words form's glyph changes over more than one frame and stops by duration-slow; under reduced motion it changes once", async () => {
    for (const reduced of [false, true]) {
      const page = await open(`<div style={{ padding: 24 }}><B.Terminal title="Deploy" lines={[{ kind: "command", text: "ls" }]} /></div>`, { ...DESKTOP, reducedMotion: reduced ? "reduce" : "no-preference", permissions: ["clipboard-write"] }, "dark");
      const frames = await page.evaluate(async () => {
        const b = document.querySelector(".basalt-terminal-copy");
        const seen = [];
        let last = null;
        const t0 = performance.now();
        b.click();
        await new Promise((done) => { const tick = (now) => { const html = b.querySelector(".basalt-button-swap").innerHTML; if (html !== last) { seen.push(now - t0); last = html; } if (now - t0 > 400) done(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
        return { changes: seen.length - 1, lastAt: seen.at(-1), words: b.textContent };
      });
      assert.match(frames.words, /Copy commands/);
      if (reduced) assert.equal(frames.changes, 1);
      else { assert.ok(frames.changes > 1); assert.ok(frames.lastAt <= 200 + 17); }
      await page.close();
    }
  });
});

describe("Kept", () => {
  test("R-1: the replay's words are centred in their button; R-9: the pager's count is centred between its arrows", async () => {
    const page = await open(`<div style={{ padding: 24 }}><B.Terminal title="Deploy" replay lines={[{ kind: "command", text: "ls" }]} /></div>`, DESKTOP, "dark");
    const gaps = await page.locator(".basalt-terminal-actions .basalt-button").first().evaluate((el) => { const r = el.getBoundingClientRect(); const on = el.querySelector("[data-on]").getBoundingClientRect(); return [on.left - r.left, r.right - on.right]; });
    assert.ok(Math.abs(gaps[0] - gaps[1]) <= 0.5, gaps.join(" / "));
    await page.close();
  });
});
