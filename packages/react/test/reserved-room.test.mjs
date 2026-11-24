// Reserved room across every component (DECISIONS 328, 329, 336), in Chromium against the built package with the real stylesheet: the line a hung
// control's glyph or words sit on, its ring, the room it may use, its targets, the toast's hit areas, the selection column, and that nothing moves
// where a seat was decided. At 1440 on a fine pointer and at 390 on touch, in both themes, left to right and right to left.
// WRITTEN, NOT RUN: browser tests are paused (DECISIONS 330). The node-only half is reserved-room-rules.test.mjs.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { HARBOR } from "./release-fixture.mjs";
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
const SHELL = (body, dir = "ltr", prelude = "") => `${prelude} document.documentElement.dir = "${dir}"; document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)"; createRoot(document.getElementById("root")).render(<>${body}</>);`;
// In the page: a control's hit box (its ::before where it draws one, else its box), read in the page's pixels whatever transform the control has.
const HIT = `window.__hit = (el) => {
  const r = el.getBoundingClientRect();
  const s = el.offsetWidth ? r.width / el.offsetWidth : 1;
  const b = getComputedStyle(el, "::before");
  if (b.content === "none" || b.position !== "absolute") return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  const n = (v) => (v === "auto" ? 0 : parseFloat(v)) * s;
  const box = { left: r.left + n(b.left), top: r.top + n(b.top), right: r.right - n(b.right), bottom: r.bottom - n(b.bottom) };
  return { ...box, width: box.right - box.left, height: box.bottom - box.top };
};
window.__visible = (root, sel) => [...root.querySelectorAll(sel)].find((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none");`;
// A page that emulates a phone (isMobile) lays out at 980 until it has a viewport meta: it is added, then the page settles, so 390 is 390.
const open = async (body, options, theme, dir = "ltr", prelude = "") => {
  const { page, errors } = await fixturePage(browser, SHELL(body, dir, prelude), { theme, colorScheme: theme, ...options });
  if (options.isMobile) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  await page.addScriptTag({ content: HIT });
  await settle(page);
  page.errors = errors;
  assert.equal(await page.evaluate(() => innerWidth), options.viewport.width, "the layout viewport is the window's width");
  return page;
};
const token = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(`--basalt-${n}`).trim(), name);
const ms = (value) => (value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);

/**
 * The line: where the head's words start from its inner start edge, and where the control's glyph (icon-only) or words end from its inner end edge
 * (inner edges are the padding box: the rim is in neither), mirrored right to left. Also the control's box to the inner edge, its hang (the margin
 * on its side), and its focused ring: offset, style and width. The control is the first match that is drawn (a hidden form of it is skipped).
 */
const line = (page, head, text, control, side = "end") => page.evaluate(([head, text, control, side]) => {
  const h = window.__visible(document, head);
  const c = window.__visible(h, control) ?? window.__visible(document, control);
  const t = text ? window.__visible(h, text) : null;
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
  const cs = getComputedStyle(c);
  const hang = -parseFloat(side === "end" ? cs.marginInlineEnd : cs.marginInlineStart);
  c.focus({ focusVisible: true });
  const fs = getComputedStyle(c);
  return {
    textStart, shown, clear, hang, focused: document.activeElement === c,
    ring: parseFloat(fs.outlineOffset), outline: [fs.outlineStyle, parseFloat(fs.outlineWidth)],
    box: [cr.left, cr.top, cr.right, cr.bottom], head: [hr.left, hr.top, hr.right, hr.bottom],
    pad: parseFloat(side === "end" ? (rtl ? hs.paddingLeft : hs.paddingRight) : (rtl ? hs.paddingRight : hs.paddingLeft)),
  };
}, [head, text, control, side]);
/** The focused ring is drawn (2px, solid) at the offset wanted, and its four sides are inside the head's box. */
const ringIsWhole = (m, want) => {
  assert.ok(m.focused, "the control takes focus");
  assert.equal(m.ring, want);
  assert.deepEqual(m.outline, ["solid", 2], "the ring is drawn");
  const reach = m.ring + 2;
  assert.ok(m.box[0] - reach >= m.head[0] - 0.5 && m.box[2] + reach <= m.head[2] + 0.5, "the ring's start and end are inside the head");
  assert.ok(m.box[1] - reach >= m.head[1] - 0.5 && m.box[3] + reach <= m.head[3] + 0.5, "the ring's top and bottom are inside the head");
};

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
          test(`${name}, ${width}, ${dir}, ${theme}: what it shows is on the head's line, its ring drawn at the room's offset and whole inside the head`, async () => {
            const page = await open(fixture, options, theme, dir);
            const m = await line(page, head, text, control, side);
            const want = width === "1440" ? wide : narrow;
            assert.ok(Math.abs(m.shown - want.shown) <= 0.5, `shown ${m.shown}, want ${want.shown}`);
            if (m.textStart !== null) assert.ok(Math.abs(m.textStart - m.shown) <= 0.5, `the words start at ${m.textStart}, the control ends at ${m.shown}`);
            ringIsWhole(m, want.ring);
            assert.deepEqual(page.errors, []);
            await page.close();
          });
        }
      }
    }
  }
  // The popups' heads and feet (section 1's More sheet, notification centre and checklist rows): each opened, then measured as the heads above.
  const POPUPS = [
    ["the More sheet's Close", PHONE, `<B.TabBar><B.TabBarItem href="#h" icon={B.HomeGlyph}>Home</B.TabBarItem><B.TabBarMore><B.NavItem href="#s" icon={B.SettingsGlyph}>Settings</B.NavItem></B.TabBarMore></B.TabBar>`, ".basalt-tabbar-more", ".basalt-tabbar-sheet-head", ".basalt-tabbar-sheet-head > :first-child", ".basalt-button", "end", { shown: 24, ring: 2 }],
    ["the notification centre's Mark all as read", DESKTOP, `<div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}><B.NotificationCenter defaultOpen entries={[{ id: "1", title: "Deploy finished", time: "2m ago", unread: true }]} onMarkAllRead={() => {}} onClearAll={() => {}} onViewAll={() => {}} /></div>`, null, ".basalt-notifications-head", ".basalt-notifications-title", ".basalt-notifications-mark", "end", { shown: 16, ring: 2 }],
    ["the notification centre's Clear all", DESKTOP, `<div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}><B.NotificationCenter defaultOpen entries={[{ id: "1", title: "Deploy finished", time: "2m ago" }]} onClearAll={() => {}} onViewAll={() => {}} /></div>`, null, ".basalt-notifications-foot", null, ".basalt-notifications-clear", "start", { shown: 16, ring: 2 }],
    ["the notification centre's View all", DESKTOP, `<div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}><B.NotificationCenter defaultOpen entries={[{ id: "1", title: "Deploy finished", time: "2m ago" }]} onClearAll={() => {}} onViewAll={() => {}} /></div>`, null, ".basalt-notifications-foot", null, ".basalt-button:last-child", "end", { shown: 16, ring: 2 }],
    ["the checklist's Clear", DESKTOP, `<div style={{ padding: 16 }}><B.MultiSelect label="Region" options={["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"].map((l) => ({ value: l, label: l }))} /></div>`, ".basalt-filter-trigger", ".basalt-filter-foot", ".basalt-filter-count", ".basalt-filter-clear", "end", { shown: 16, ring: 2 }],
  ];
  for (const [name, options, fixture, opener, head, text, control, side, want] of POPUPS) {
    for (const dir of DIRS) {
      for (const theme of THEMES) {
        test(`${name}, ${options === PHONE ? "390 on touch" : "1440"}, ${dir}, ${theme}: on the line, its ring whole`, async () => {
          const page = await open(fixture, options, theme, dir);
          if (opener) { await page.locator(opener).first().click(); await settle(page); }
          await page.waitForSelector(head);
          const m = await line(page, head, text, control, side);
          assert.ok(Math.abs(m.shown - want.shown) <= 0.5, `shown ${m.shown}, want ${want.shown}`);
          if (m.textStart !== null && side === "end") assert.ok(Math.abs(m.textStart - want.shown) <= 0.5, `the head's words start at ${m.textStart}`);
          ringIsWhole(m, want.ring);
          assert.deepEqual(page.errors, []);
          await page.close();
        });
      }
    }
  }
  test("a control with edge in a head that declares no room has no margin and the ordinary +2", async () => {
    const page = await open(`<div id="h" style={{ display: "flex", padding: 16 }}><span style={{ flex: 1 }}>Head</span><B.IconButton id="c" icon={B.SearchGlyph} label="Search" edge="end" /></div>`, DESKTOP, "dark");
    const m = await line(page, "#h", null, "#c", "end");
    assert.equal(m.hang, 0);
    assert.ok(Math.abs(m.clear - 16) <= 0.5, "its box stands on the head's padding");
    ringIsWhole(m, 2);
    await page.close();
  });
  test("at 800 on a coarse pointer: a 44px icon button at a 24 gutter hangs 14 with its glyph on the line; an xs 'Go' is its word's width, its word on the line, and its hit area stops at its neighbour", async () => {
    const page = await open(`<B.StatusBar start={<><B.Button variant="ghost" size="xs" id="go">Go</B.Button><B.Button variant="ghost" size="sm" id="next">Next</B.Button></>} end={<B.IconButton icon={B.SearchGlyph} label="Search" id="i" />} />`, TABLET, "dark");
    const go = await line(page, ".basalt-status-bar", null, "#go", "start");
    assert.ok(Math.abs(go.shown - 24) <= 0.5, `the word starts ${go.shown} from the inner edge`);
    const icon = await line(page, ".basalt-status-bar", null, "#i", "end");
    assert.ok(Math.abs(icon.hang - 14) <= 0.5, `the icon hangs ${icon.hang}`);
    assert.ok(Math.abs(icon.shown - 24) <= 0.5, `the glyph ends ${icon.shown} from the inner edge`);
    const boxes = await page.evaluate(() => { const g = document.querySelector("#go"); const n = document.querySelector("#next"); return { w: g.getBoundingClientRect().width, hit: window.__hit(g), next: n.getBoundingClientRect().toJSON(), nextHit: window.__hit(n) }; });
    assert.ok(boxes.w < 44, `the box is as wide as its word: ${boxes.w}`);
    assert.ok(boxes.hit.width >= 44 && boxes.hit.height >= 44, `Go's hit area is ${boxes.hit.width} by ${boxes.hit.height}`);
    assert.ok(boxes.hit.right <= boxes.nextHit.left + 0.5, `Go's hit area ends at ${boxes.hit.right}, Next's starts at ${boxes.nextHit.left}`);
    // Every pixel along the row from Go's hit start to Next's end answers to one of the two, Go first, and never Go inside Next's box.
    const y = (boxes.next.top + boxes.next.bottom) / 2;
    const owners = await page.evaluate(([x0, x1, y]) => { let out = ""; for (let x = Math.ceil(x0); x < x1; x += 1) { const el = document.elementFromPoint(x + 0.5, y); out += el?.closest("#go") ? "g" : el?.closest("#next") ? "n" : "-"; } return out; }, [boxes.hit.left, boxes.next.right, y]);
    assert.match(owners, /^g+-*n+$/, owners);
    assert.equal(owners.slice(-Math.floor(boxes.next.right - boxes.next.left)).includes("g"), false, "Go never answers inside Next's box");
    await page.close();
  });
  test("a 360px terminal at 1440 on a fine pointer hangs its compact copy by 6", async () => {
    const page = await open(`<div style={{ width: 360, padding: 24 }}><B.Terminal title="Deploy" lines={[{ kind: "command", text: "ls" }]} /></div>`, DESKTOP, "dark");
    const m = await line(page, ".basalt-terminal-head", ".basalt-terminal-title", ".basalt-terminal-copy-compact", "end");
    assert.ok(Math.abs(m.shown - 16) <= 0.5);
    assert.ok(Math.abs(m.hang - 6) <= 0.5, `it hangs ${m.hang}`);
    ringIsWhole(m, 2);
    await page.close();
  });
});

describe("The room", () => {
  for (const dir of DIRS) {
    test(`a row of icon links with nothing round it, at the viewport's start, ${dir}: nothing hangs and the first link is wholly on screen`, async () => {
      for (const options of [DESKTOP, PHONE]) {
        const page = await open(`<B.SocialLinks iconOnly aria-label="Elsewhere"><B.SocialLink service="github" href="#a">GitHub</B.SocialLink></B.SocialLinks>`, options, "dark", dir);
        const r = await page.evaluate(() => { const el = document.querySelector(".basalt-social-links .basalt-button"); const cs = getComputedStyle(el); return { ...el.getBoundingClientRect().toJSON(), margins: [cs.marginInlineStart, cs.marginInlineEnd] }; });
        assert.deepEqual(r.margins, ["0px", "0px"]);
        assert.ok(r.left >= 0 && r.right <= options.viewport.width, `${r.left} to ${r.right}`);
        await page.close();
      }
    });
  }
  const BARS = [
    ["the site bar", `<B.SiteHeader brand="Orbit" links={[{ href: "/", label: "Home" }]} />`, ".basalt-site-menu-trigger"],
    ["the app header", `<B.AppHeader title="Runs" actions={<B.IconButton icon={B.SearchGlyph} label="Search" edge="end" />} />`, ".basalt-bar-actions > .basalt-button"],
    ["the status bar", `<B.StatusBar start={<B.Button variant="ghost" size="sm">run</B.Button>} sources={<B.Button variant="ghost" size="sm">2 sources</B.Button>} end={<B.Button variant="ghost" size="sm">Theme</B.Button>} />`, ".basalt-status-bar-end .basalt-button"],
    ["a sheet's head", `<B.Sheet open><B.SheetContent side="right"><B.SheetHeader closeLabel="Close"><B.SheetTitle>Cart</B.SheetTitle></B.SheetHeader></B.SheetContent></B.Sheet>`, ".basalt-sheet-close"],
  ];
  // Wholly outside the inset: the drawn box and the hit area (a short word's ::before), both.
  const outside = (r, dir) => (dir === "ltr" ? r.right <= 390 - 34 + 0.5 : r.left >= 34 - 0.5);
  for (const [name, fixture, control] of BARS) {
    for (const dir of DIRS) {
      test(`${name}, 390, ${dir}, a 34px inset on the line's end side: the last control is drawn and wholly outside the inset, its hit area too`, async () => {
        const page = await open(fixture, PHONE, "dark", dir);
        // The safe area is simulated on the root's own reads (env() is 0 in a test browser).
        await page.addStyleTag({ content: `:root { --_inset-${dir === "rtl" ? "left" : "right"}: 34px !important; }` });
        await settle(page);
        const r = await page.evaluate((sel) => { const el = window.__visible(document, sel); return el ? { box: el.getBoundingClientRect().toJSON(), hit: window.__hit(el) } : null; }, control);
        assert.ok(r && r.box.width > 0, "the control is drawn at 390");
        assert.ok(outside(r.box, dir), `the box: ${JSON.stringify(r.box)}`);
        assert.ok(outside(r.hit, dir), `the hit area: ${JSON.stringify(r.hit)}`);
        await page.close();
      });
    }
  }
  for (const dir of DIRS) {
    test(`the open site menu's band, ${dir}: Close is wholly outside a 34px inset on the end side`, async () => {
      const page = await open(`<B.SiteHeader brand="Orbit" links={[{ href: "/", label: "Home" }]} />`, PHONE, "dark", dir);
      await page.addStyleTag({ content: `:root { --_inset-${dir === "rtl" ? "left" : "right"}: 34px !important; }` });
      await page.locator(".basalt-site-menu-trigger").click();
      await settle(page);
      const r = await page.evaluate(() => { const el = window.__visible(document, ".basalt-site-menu-close"); return { box: el.getBoundingClientRect().toJSON(), hit: window.__hit(el) }; });
      assert.ok(outside(r.box, dir) && outside(r.hit, dir), JSON.stringify(r));
      await page.close();
    });
  }
});

describe("Targets", () => {
  const LINKS = (n) => Array.from({ length: n }, (_, i) => `<B.SocialLink key={${i}} service="github" href="#${i}">Link ${i}</B.SocialLink>`).join("");
  for (const [form, inner] of [["as children", LINKS(8)], ["in a fragment", `<>${LINKS(8)}</>`]]) {
    test(`two rows of icon links ${form} keep their full 44 each, no two meet, and none crosses the card's rim on any side`, async () => {
      const page = await open(`<div style={{ width: 200, padding: 24 }}><B.Card><B.CardContent><B.SocialLinks iconOnly aria-label="Elsewhere">${inner}</B.SocialLinks></B.CardContent></B.Card></div>`, PHONE, "dark");
      const boxes = await page.locator(".basalt-social-links .basalt-button").evaluateAll((els) => els.map((el) => window.__hit(el)));
      assert.equal(boxes.length, 8);
      assert.ok(new Set(boxes.map((b) => Math.round(b.top))).size >= 2, "the links wrap onto two rows or more");
      for (const b of boxes) assert.ok(b.width >= 44 - 0.5 && b.height >= 44 - 0.5, `${b.width} by ${b.height}`);
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]; const b = boxes[j];
        assert.ok(a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5, `${i} and ${j} overlap`);
      }
      const card = await page.evaluate(() => { const el = document.querySelector(".basalt-card"); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { left: r.left + parseFloat(cs.borderLeftWidth), top: r.top + parseFloat(cs.borderTopWidth), right: r.right - parseFloat(cs.borderRightWidth), bottom: r.bottom - parseFloat(cs.borderBottomWidth) }; });
      for (const b of boxes) assert.ok(b.left >= card.left - 0.5 && b.right <= card.right + 0.5 && b.top >= card.top - 0.5 && b.bottom <= card.bottom + 0.5, `inside the card's rim: ${JSON.stringify(b)}`);
      await page.close();
    });
  }
});

describe("The toast's targets", () => {
  const TOAST = (title = "Saved", action = true) => `<B.ToastProvider>{React.createElement(function Show() { const t = B.useToast(); React.useEffect(() => { t.show({ title: ${JSON.stringify(title)}, ${action ? `action: { label: "Go", onClick() {} }, ` : ""}timeout: 0 }); }, []); return null; })}</B.ToastProvider>`;
  const targets = (page) => page.evaluate(() => {
    const toast = document.querySelector(".basalt-toast").getBoundingClientRect().toJSON();
    return { toast, action: window.__hit(document.querySelector(".basalt-toast-action")), dismiss: window.__hit(document.querySelector(".basalt-toast-close")) };
  });
  const apart = (a, b) => a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5;
  const inside = (t, toast) => t.left >= toast.left - 0.5 && t.right <= toast.right + 0.5 && t.top >= toast.top - 0.5 && t.bottom <= toast.bottom + 0.5;
  for (const theme of THEMES) {
    test(`${theme}, 390 on touch, at rest: Dismiss and a 'Go' action are 46 by 46 hit areas, inside the toast, apart, and the row answers action, toast, Dismiss across their whole boxes`, async () => {
      const page = await open(TOAST(), PHONE, theme);
      await page.waitForSelector(".basalt-toast-close");
      await settle(page);
      const t = await targets(page);
      assert.deepEqual([Math.round(t.dismiss.width), Math.round(t.dismiss.height)], [46, 46]);
      assert.ok(t.action.width >= 46 - 0.5 && t.action.height >= 46 - 0.5, `${t.action.width} by ${t.action.height}`);
      for (const box of [t.dismiss, t.action]) assert.ok(inside(box, t.toast), "inside the toast");
      assert.ok(apart(t.action, t.dismiss), "apart");
      // From the action's hit start to Dismiss's hit end, through Dismiss's centre: the action for its whole hit width, then the toast, then Dismiss for its whole.
      const y = (t.dismiss.top + t.dismiss.bottom) / 2;
      const owners = await page.evaluate(([from, to, y]) => { let out = ""; for (let x = Math.ceil(from); x < Math.floor(to); x += 1) { const el = document.elementFromPoint(x + 0.5, y); out += el?.closest(".basalt-toast-close") ? "d" : el?.closest(".basalt-toast-action") ? "a" : el?.closest(".basalt-toast") ? "t" : "-"; } return out; }, [t.action.left, t.dismiss.right, y]);
      const m = /^(a+)(t+)(d+)$/.exec(owners);
      assert.ok(m, `the action, then the toast, then Dismiss: ${owners}`);
      assert.ok(Math.abs(m[1].length - Math.floor(t.action.width)) <= 1, `the action answers across ${m[1].length} of its ${t.action.width}`);
      assert.ok(Math.abs(m[3].length - Math.floor(t.dismiss.width)) <= 1, `Dismiss answers across ${m[3].length} of its ${t.dismiss.width}`);
      await page.close();
    });
    for (const held of [".basalt-toast-action", ".basalt-toast-close"]) {
      test(`${theme}, 390 on touch, ${held} held down: both hit areas at least 44, inside the toast and apart, after duration-fast and in the frame after it is let go`, async () => {
        // A toast of its own for each press: Dismiss closes on pointer-up, and so does the action.
        const page = await open(TOAST(), PHONE, theme);
        await page.waitForSelector(".basalt-toast-close");
        await settle(page);
        const b = await page.locator(held).boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(ms(await token(page, "duration-fast")) + 20);
        const reads = [await targets(page)];
        await page.mouse.up();
        reads.push(await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => {
          const toast = document.querySelector(".basalt-toast");
          const a = document.querySelector(".basalt-toast-action");
          const d = document.querySelector(".basalt-toast-close");
          done(toast && a && d ? { toast: toast.getBoundingClientRect().toJSON(), action: window.__hit(a), dismiss: window.__hit(d) } : null);
        }))));
        for (const t of reads.filter(Boolean)) {
          for (const box of [t.dismiss, t.action]) {
            assert.ok(box.width >= 44 - 0.5 && box.height >= 44 - 0.5, `held: ${box.width} by ${box.height}`);
            assert.ok(inside(box, t.toast), "inside the toast");
          }
          assert.ok(apart(t.action, t.dismiss), "apart");
        }
        await page.close();
      });
    }
  }
  test("the toast is one height on a fine and a coarse pointer: a title alone 50, two lines 65, one with an action; Dismiss's ring is whole inside it", async () => {
    const FORMS = [["a title alone", TOAST("Saved", false), 50], ["two lines", `<B.ToastProvider>{React.createElement(function Show() { const t = B.useToast(); React.useEffect(() => { t.show({ title: "Draft moved", description: "It is in Archive now.", timeout: 0 }); }, []); return null; })}</B.ToastProvider>`, 65], ["with an action", TOAST(), null]];
    for (const [form, fixture, want] of FORMS) {
      const heights = [];
      for (const options of [{ viewport: { width: 1024, height: 800 } }, { viewport: { width: 1024, height: 800 }, hasTouch: true, isMobile: true }]) {
        const page = await open(fixture, options, "dark");
        await page.waitForSelector(".basalt-toast-close");
        await settle(page);
        heights.push((await page.locator(".basalt-toast").boundingBox()).height);
        const m = await line(page, ".basalt-toast", null, ".basalt-toast-close", "end");
        assert.ok(m.focused && m.outline[0] === "solid", `${form}: Dismiss's ring is drawn`);
        const reach = m.ring + 2;
        assert.ok(m.box[0] - reach >= m.head[0] - 0.5 && m.box[2] + reach <= m.head[2] + 0.5 && m.box[1] - reach >= m.head[1] - 0.5 && m.box[3] + reach <= m.head[3] + 0.5, `${form}: Dismiss's ring is inside the toast`);
        await page.close();
      }
      assert.equal(heights[0], heights[1], `${form}: one height on both pointers (${heights})`);
      if (want !== null) assert.ok(Math.abs(heights[0] - want) <= 0.5, `${form}: ${heights[0]}, want ${want}`);
    }
  });
});

describe("The selection column", () => {
  const TABLE = (width) => `<B.TableContainer label="Runs"><B.Table columns={[{ width: "${width}" }, {}]} minWidth={320} pinned={2}><B.TableHeader><B.TableRow><B.TableHead><B.Checkbox aria-label="Select all" /></B.TableHead><B.TableHead onSortChange={() => {}}>Run</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run-1" /></B.TableCell><B.TableCell><a href="#r">run-1</a></B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>`;
  // Who answers at every pixel across a row, from the column's start to 12 past its end: c the checkbox, s the name's sort button, n the name cell.
  const owners = (page, x0, y) => page.evaluate(([x0, y]) => { let out = ""; for (let x = 0; x < 56; x += 1) { const el = document.elementFromPoint(x0 + x + 0.5, y); out += el?.closest("[role=checkbox]") ? "c" : el?.closest("th button, .basalt-table-sort, th[aria-sort]") ? "s" : el?.closest("td, th") ? "n" : "-"; } return out; }, [x0, y]);
  test("on touch the column is 44, given 32 or 40: the checkbox answers across exactly its 44 and the name from the next pixel, in the header and down a body row", async () => {
    for (const width of ["var(--basalt-select-column)", "max(40px, var(--basalt-select-column))"]) {
      const page = await open(TABLE(width), PHONE, "dark");
      const r = await page.locator("thead th").first().boundingBox();
      assert.ok(Math.abs(r.width - 44) <= 0.5, `${width}: the column is ${r.width}`);
      const head = await owners(page, r.x, r.y + r.height / 2);
      assert.equal(head, "c".repeat(44) + "s".repeat(12), `the header row: ${head}`);
      const cell = await page.locator("tbody td").first().boundingBox();
      const body = await owners(page, cell.x, cell.y + cell.height / 2);
      assert.equal(body.slice(0, 44), "c".repeat(44), `the body row's checkbox: ${body}`);
      assert.equal(body.slice(44).includes("c"), false, `nothing past the column is the checkbox: ${body}`);
      await page.close();
    }
  });
  test("on a fine pointer the column is the width given, the checkbox centred in it, and the next header starts where the column ends", async () => {
    for (const [width, px] of [["var(--basalt-select-column)", 32], ["40px", 40]]) {
      const page = await open(TABLE(width), DESKTOP, "light");
      const cell = await page.locator("tbody td").first().boundingBox();
      const box = await page.locator("tbody td [role=checkbox]").first().boundingBox();
      const heads = await page.locator("thead th").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
      assert.ok(Math.abs(cell.width - px) <= 0.5, `the column is ${cell.width}`);
      assert.ok(Math.abs((box.x - cell.x) - (cell.x + cell.width - box.x - box.width)) <= 0.5, "centred");
      assert.ok(Math.abs(heads[1] - heads[0] - px) <= 0.5, `the next header starts ${heads[1] - heads[0]} in`);
      await page.close();
    }
  });
});

describe("Nothing moves", () => {
  test("the filter's Clear and count keep their x with nothing, some and all chosen, and those are the selections reached", async () => {
    const page = await open(`<B.MultiSelect label="Status" options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma" }]} />`, DESKTOP, "dark");
    const read = async () => ({ xs: [await page.locator(".basalt-filter-clear").boundingBox(), await page.locator(".basalt-filter-count").boundingBox()].map((b) => b.x), on: await page.locator(".basalt-chip[aria-checked=\"true\"]").count() });
    const none = await read();
    assert.equal(none.on, 0);
    await page.locator(".basalt-chip").first().click();
    const some = await read();
    assert.equal(some.on, 1, "one chosen");
    assert.deepEqual(some.xs, none.xs);
    for (let i = 0; i < 3; i++) { const chip = page.locator(".basalt-chip").nth(i); if ((await chip.getAttribute("aria-checked")) !== "true") await chip.click(); }
    const all = await read();
    assert.equal(all.on, 3, "all chosen");
    assert.deepEqual(all.xs, none.xs);
    await page.close();
  });
  const SEARCH = `{React.createElement(function S() { const [n, setN] = React.useState(0); window.__setN = setN; return <B.SearchDialog open onOpenChange={() => {}} title="Search" label="Search" query="q" onQueryChange={() => {}} count={n + " results"}><B.SearchResults>{Array.from({ length: n }, (_, i) => <B.SearchResult key={i} href={"#" + i}>{"Result " + i}</B.SearchResult>)}</B.SearchResults></B.SearchDialog>; })}`;
  /** In the one open dialog: the field's and count's y, and whether the box ends under what it shows (its last row and the list's padding, or the count with an empty list of no height). */
  const searchRead = (page) => page.evaluate(() => {
    const dialog = document.querySelector(".basalt-search");
    const list = document.querySelector(".basalt-search-results");
    const rows = list.querySelectorAll(".basalt-search-result");
    const d = dialog.getBoundingClientRect(); const l = list.getBoundingClientRect(); const ds = getComputedStyle(dialog); const ls = getComputedStyle(list);
    const last = rows.length ? rows[rows.length - 1].getBoundingClientRect() : null;
    const scrolls = list.scrollHeight > list.clientHeight + 1;
    return {
      ys: [document.querySelector(".basalt-search-input").getBoundingClientRect().y, document.querySelector(".basalt-search-count").getBoundingClientRect().y],
      endsUnderList: Math.abs(d.bottom - parseFloat(ds.borderBottomWidth) - l.bottom) <= 0.5,
      listHugs: rows.length === 0 ? l.height === 0 : scrolls || Math.abs(l.bottom - parseFloat(ls.paddingBottom) - last.bottom) <= 0.5,
      height: d.height,
    };
  });
  test("the search dialog's field and count keep their y as one open dialog's results change, and its box ends under its last row (or its count)", async () => {
    const page = await open(SEARCH, DESKTOP, "dark");
    const reads = [];
    for (const n of [0, 2, 8, 2, 0]) { await page.evaluate((n) => window.__setN(n), n); await settle(page); reads.push(await searchRead(page)); }
    for (const r of reads) { assert.deepEqual(r.ys, reads[0].ys); assert.ok(r.endsUnderList, "the box ends under the results"); assert.ok(r.listHugs, "the list hugs its rows"); }
    assert.ok(reads[0].height < reads[2].height, `the box grows with its results: ${reads.map((r) => r.height)}`);
    assert.equal(reads[4].height, reads[0].height);
    await page.close();
  });
  test("on a phone with the on-screen keyboard up (a shorter window), the field and count keep their y as the results change", async () => {
    const page = await open(SEARCH, PHONE, "dark");
    await page.setViewportSize({ width: 390, height: 480 });
    await settle(page);
    const reads = [];
    for (const n of [0, 2, 8, 0]) { await page.evaluate((n) => window.__setN(n), n); await settle(page); reads.push(await searchRead(page)); }
    for (const r of reads) { assert.deepEqual(r.ys, reads[0].ys); assert.ok(r.endsUnderList); }
    await page.close();
  });
  const groups = (n) => `[{ label: "Run", commands: Array.from({ length: ${n} }, (_, i) => ({ id: "c" + i, label: "Command " + i })) }]`;
  for (const n of [6, 1]) {
    test(`what follows a command list of ${n} on the open page keeps its y from no query to no match, while the panel hugs its rows`, async () => {
      const page = await open(`<div style={{ padding: 24 }}><B.CommandList label="Console" groups={${groups(n)}} /><p id="after">After</p></div>`, DESKTOP, "dark");
      await page.waitForSelector(".basalt-command-input:not([aria-describedby])");
      const before = (await page.locator("#after").boundingBox()).y;
      const panelBefore = (await page.locator(".basalt-command-page").boundingBox()).height;
      await page.locator(".basalt-command-input").fill("zzzz");
      await settle(page);
      assert.equal((await page.locator("#after").boundingBox()).y, before);
      const panelAfter = (await page.locator(".basalt-command-page").boundingBox()).height;
      if (n === 6) assert.ok(panelAfter < panelBefore, "the panel hugs the empty state");
      await page.locator(".basalt-command-input").fill("");
      await settle(page);
      assert.equal((await page.locator("#after").boundingBox()).y, before, "and back");
      await page.close();
    });
  }
  test("in a card, in a dialog and with reserve={false}, the list holds no room: the wrapper is the panel's height, and a card ends under the panel by its padding", async () => {
    const g = `[{ label: "Run", commands: [{ id: "a", label: "Deploy" }, { id: "b", label: "Build" }] }]`;
    const FORMS = [
      ["card", `<B.Card><B.CardContent><B.CommandList label="Console" groups={${g}} /></B.CardContent></B.Card>`],
      ["dialog", `<B.Dialog open><B.DialogContent><B.DialogTitle>Run</B.DialogTitle><B.CommandList label="Console" groups={${g}} /></B.DialogContent></B.Dialog>`],
      ["reserve={false}", `<B.CommandList reserve={false} label="Console" groups={${g}} />`],
    ];
    for (const [form, fixture] of FORMS) {
      const page = await open(`<div style={{ padding: 24 }}>${fixture}</div>`, DESKTOP, "light");
      await page.waitForSelector(".basalt-command-input:not([aria-describedby])");
      for (const query of ["", "zzzz"]) {
        await page.locator(".basalt-command-input").fill(query);
        await settle(page);
        const m = await page.evaluate(() => {
          const host = document.querySelector(".basalt-command-split").getBoundingClientRect();
          const panel = document.querySelector(".basalt-command-page").getBoundingClientRect();
          const content = document.querySelector(".basalt-card-content");
          const card = content ? { bottom: content.getBoundingClientRect().bottom, pad: parseFloat(getComputedStyle(content).paddingBottom) } : null;
          return { host: host.height, panel: panel.height, panelBottom: panel.bottom, card };
        });
        assert.ok(Math.abs(m.host - m.panel) <= 0.5, `${form}, "${query}": the wrapper ${m.host}, the panel ${m.panel}`);
        if (form === "card") assert.ok(Math.abs(m.card.bottom - m.card.pad - m.panelBottom) <= 0.5, `${form}: the card ends under the panel by its padding`);
      }
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
  test("in a menu with a checkable row all three labels start at one x", async () => {
    const page = await open(`<B.Menu open><B.MenuTrigger>Open</B.MenuTrigger><B.MenuContent><B.MenuItem>Plain</B.MenuItem><B.MenuCheckboxItem checked>Checked</B.MenuCheckboxItem><B.MenuItem icon={B.SearchGlyph}>Glyph</B.MenuItem></B.MenuContent></B.Menu>`, DESKTOP, "dark");
    const xs = await page.locator(".basalt-menu-item-label").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().x)));
    assert.equal(xs.length, 3, `three rows: ${xs}`);
    assert.equal(new Set(xs).size, 1, xs.join(", "));
    await page.close();
  });
  // What is drawn to the box's edges, rim included: the decided gaps (section 5 and S11), not merely equal paddings.
  const gaps = (page, row, first, last) => page.evaluate(([row, first, last]) => {
    const r = document.querySelector(row);
    const a = r.querySelector(first).getBoundingClientRect(); const z = r.querySelector(last); const rr = r.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(z); const zr = range.getBoundingClientRect();
    return [a.left - rr.left, rr.right - zr.right].map((v) => Math.round(v * 10) / 10);
  }, [row, first, last]);
  test("an option chip is 12 and 12 from its rim to its seat and its words; a switch row with no tile 13 and 13 (9 and 9 under 720)", async () => {
    const fixture = `<div style={{ width: 360 }}><B.SwitchRowGroup aria-label="Sources"><B.SwitchRow value="a">Alerts</B.SwitchRow></B.SwitchRowGroup><B.OptionChips legend="Size" options={[{ value: "s", label: "Small" }]} /></div>`;
    for (const [options, row] of [[DESKTOP, [13, 13]], [PHONE, [9, 9]]]) {
      const page = await open(fixture, options, "dark");
      assert.deepEqual(await gaps(page, ".basalt-option-chip", ".basalt-option-chip-seat", ".basalt-option-chip-label"), [12, 12], "the option chip");
      const sw = await page.evaluate(() => { const r = document.querySelector(".basalt-switch-row"); const rr = r.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(r.querySelector(".basalt-switch-row-name")); const w = range.getBoundingClientRect(); const seat = r.querySelector(".basalt-switch-row-seat").getBoundingClientRect(); return [w.left - rr.left, rr.right - seat.right].map((v) => Math.round(v * 10) / 10); });
      assert.deepEqual(sw, row, "the switch row");
      await page.close();
    }
  });
});

describe("The composer", () => {
  const COMPOSER = (width, status) => `<div style={{ width: ${width} }}>{React.createElement(function C() { const [s, setS] = React.useState(${JSON.stringify(status)}); window.__setStatus = setS; return <B.Composer label="Message" onSend={() => {}} actions={<><B.IconButton icon={B.PlusGlyph} label="Attach" /><B.IconButton icon={B.SearchGlyph} label="Find" /></>} status={s} />; })}</div>`;
  const read = (page) => page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect().toJSON();
    return { send: r(".basalt-composer-send"), status: r(".basalt-composer-status"), extra: r(".basalt-composer-extra"), composer: r(".basalt-composer") };
  });
  const apart = (a, b) => a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5;
  test("no status: nothing under the row", async () => {
    const page = await open(COMPOSER(600, ""), DESKTOP, "dark");
    const m = await read(page);
    assert.equal(m.status.height, 0, "the empty status has no height");
    assert.ok(Math.abs(m.composer.bottom - Math.max(m.send.bottom, m.extra.bottom)) <= 0.5, "the composer ends under its row");
    await page.close();
  });
  test("a status that fits is in the row and overlaps nothing; at 290 with two actions a long one takes its own row and Send stays on the first; the live region is one element throughout", async () => {
    const page = await open(COMPOSER(600, "Ada is typing"), DESKTOP, "dark");
    const fit = await read(page);
    assert.ok(Math.abs((fit.status.top + fit.status.bottom) / 2 - (fit.send.top + fit.send.bottom) / 2) <= 6, "the status is in Send's row");
    assert.ok(apart(fit.status, fit.send) && apart(fit.status, fit.extra), "it overlaps nothing");
    await page.close();
    const narrow = await open(COMPOSER(290, "Ada, Grace and Edsger are typing"), PHONE, "dark");
    await narrow.evaluate(() => { document.querySelector(".basalt-composer-status").__mark = true; });
    const long = await read(narrow);
    assert.ok(long.status.top >= long.extra.bottom - 0.5, "the status is under the actions");
    assert.ok(Math.abs(long.send.top - long.extra.top) <= 6, "Send is on the first row");
    for (const s of ["", "Ada is typing", "Ada, Grace and Edsger are typing"]) {
      await narrow.evaluate((s) => window.__setStatus(s), s);
      await settle(narrow);
      assert.equal(await narrow.evaluate(() => document.querySelectorAll(".basalt-composer [aria-live=polite]").length), 1);
      assert.equal(await narrow.evaluate(() => document.querySelector(".basalt-composer [aria-live=polite]").__mark === true), true, `the same live region after "${s}"`);
    }
    await narrow.close();
  });
});

// The drawing a copy button shows: the morph's frame while it runs, else the glyph at the front (the most opaque of the seat's two).
const DRAWING = `window.__drawing = (b) => {
  const swap = b.querySelector(".basalt-button-swap");
  const frame = swap.querySelector(".basalt-glyph-frame");
  if (frame) return { glyph: "frame:" + frame.getAttribute("data-glyph"), paths: [...frame.querySelectorAll("path")].map((p) => p.getAttribute("d")).join(" ") };
  const front = [...swap.querySelectorAll(":scope > .basalt-icon")].filter((g) => getComputedStyle(g).visibility !== "hidden").sort((a, z) => parseFloat(getComputedStyle(z).opacity) - parseFloat(getComputedStyle(a).opacity))[0];
  return { glyph: front?.getAttribute("data-glyph") ?? "", paths: front ? [...front.querySelectorAll("path")].map((p) => p.getAttribute("d")).join(" ") : "" };
};`;

describe("The copy's motion", () => {
  test("after a copy that succeeds the words form's drawing changes over more than one frame and stops by duration-slow plus a frame; under reduced motion it changes once", async () => {
    for (const reduced of [false, true]) {
      const page = await open(`<div style={{ padding: 24 }}><B.Terminal title="Deploy" lines={[{ kind: "command", text: "ls" }]} /></div>`, { ...DESKTOP, reducedMotion: reduced ? "reduce" : "no-preference" }, "dark");
      await page.addScriptTag({ content: DRAWING });
      // The test origin is not secure, so there is no clipboard: a write that succeeds is stubbed.
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.resolve() }, configurable: true }));
      const slow = ms(await token(page, "duration-slow"));
      const seen = await page.evaluate(async () => {
        const b = window.__visible(document, ".basalt-terminal-copy");
        const key = () => { const d = window.__drawing(b); return d.glyph + "|" + d.paths; };
        let last = key();
        const rest = last;
        const changes = [];
        const t0 = performance.now();
        b.click();
        await new Promise((done) => { const tick = (now) => { const k = key(); if (k !== last) { changes.push({ at: now - t0, k }); last = k; } if (now - t0 > 600) done(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
        return { rest, changes, words: b.textContent, done: b.hasAttribute("data-done") };
      });
      assert.match(seen.words, /Copy commands/);
      assert.ok(seen.rest.startsWith("copy|"), `the copy glyph at rest: ${seen.rest.slice(0, 20)}`);
      assert.ok(seen.changes.at(-1).k.startsWith("check|"), "it ends on the check");
      if (reduced) assert.equal(seen.changes.length, 1, `${seen.changes.length} changes`);
      else { assert.ok(seen.changes.length > 1, `${seen.changes.length} changes`); assert.ok(seen.changes.at(-1).at <= slow + 17, `the last at ${seen.changes.at(-1).at}`); }
      await page.close();
    }
  });
});

describe("Kept", () => {
  test("R-1: the replay's words are centred in their button", async () => {
    const page = await open(`<div style={{ padding: 24 }}><B.Terminal title="Deploy" replay lines={[{ kind: "command", text: "ls" }]} /></div>`, DESKTOP, "dark");
    const gaps = await page.locator(".basalt-terminal-actions .basalt-button").first().evaluate((el) => { const r = el.getBoundingClientRect(); const on = el.querySelector("[data-on]").getBoundingClientRect(); return [on.left - r.left, r.right - on.right]; });
    assert.ok(Math.abs(gaps[0] - gaps[1]) <= 0.5, gaps.join(" / "));
    await page.close();
  });
  test("R-9: at 390 the pager's count is centred between its arrows, on page 3 and on page 12", async () => {
    for (const at of [3, 12]) {
      const page = await open(`<div style={{ padding: 16 }}><B.Pagination page={${at}} pageCount={12} onPageChange={() => {}} compact /></div>`, PHONE, "dark");
      const gaps = await page.evaluate((at) => {
        const nav = document.querySelector(".basalt-pagination");
        const buttons = [...nav.querySelectorAll(":scope > .basalt-button, :scope > a.basalt-button, :scope > button")];
        const prev = buttons[0].getBoundingClientRect(); const next = buttons.at(-1).getBoundingClientRect();
        const words = [...nav.querySelectorAll(".basalt-pagination-summary *")].find((el) => el.children.length === 0 && el.textContent === `Page ${at} of 12` && getComputedStyle(el).visibility !== "hidden");
        const range = document.createRange(); range.selectNodeContents(words); const w = range.getBoundingClientRect();
        return [w.left - prev.right, next.left - w.right];
      }, at);
      assert.ok(Math.abs(gaps[0] - gaps[1]) <= 0.5, `page ${at}: ${gaps.join(" / ")}`);
      await page.close();
    }
  });
});

// ---- The open items' ruling (DECISIONS 336): parts with no padding of their own hang into the room of the box they sit in, and the refused icon-only copy.
describe("A drawer, a release and a composer hang into the room of the box they sit in", () => {
  const SHELL_ROOM = (child) => `<div className="basalt-app-main" style={{ "--_pad-start": "16px", "--_pad-end": "16px", paddingInline: 16 }}>${child}</div>`;
  const plain = (c) => `<div id="plain">${c}</div>`;
  // [name, fixture by room, the box whose room it is, the control, side, the widths it is drawn at]
  const PARTS = [
    ["the drawer's Back", (room) => (room ? SHELL_ROOM : plain)(`<B.Drawer label="Record" onBack={() => {}}><div>Half</div><div>Half</div></B.Drawer>`), (room) => (room ? ".basalt-app-main" : "#plain"), ".basalt-drawer-back", "start", ["390 on touch"]],
    ["a release's Copy link", (room) => (room ? SHELL_ROOM : plain)(`<B.ReleaseNotes releases={HARBOR} form="notes" product="Harbor" />`), (room) => (room ? ".basalt-app-main" : "#plain"), ".basalt-release-copy", "end", ["1440", "390 on touch"]],
    ["the composer's first ghost action", (room) => `<B.Card><B.CardContent>${room ? "" : "<div id=\"plain\">"}<B.Composer label="Message" onSend={() => {}} actions={<B.IconButton icon={B.PlusGlyph} label="Attach" edge="start" />} />${room ? "" : "</div>"}</B.CardContent></B.Card>`, (room) => (room ? ".basalt-card-content" : "#plain"), ".basalt-composer-extra .basalt-button", "start", ["1440", "390 on touch"]],
  ];
  const PRELUDE = `const HARBOR = ${JSON.stringify(HARBOR)};`;
  for (const [name, fixture, box, control, side, drawn] of PARTS) {
    for (const [width, options] of WIDTHS) {
      for (const dir of DIRS) {
        for (const room of [true, false]) {
          test(`${name}, ${width}, ${dir}, ${room ? "the box says its room" : "nothing said"}: ${drawn.includes(width) ? "on the box's line where room is said, else on its own, its ring drawn and whole" : "not drawn"}`, async () => {
            const page = await open(fixture(room), options, "dark", dir, PRELUDE);
            if (!drawn.includes(width)) {
              assert.equal(await page.evaluate((sel) => window.__visible(document, sel) === undefined, control), true, "it is not drawn at this width");
              await page.close();
              return;
            }
            const m = await line(page, box(room), null, control, side);
            if (room) {
              assert.ok(m.hang > 0 && m.hang <= m.pad + 0.5, `it hangs ${m.hang}, at most the room's ${m.pad}`);
              assert.ok(Math.abs(m.shown - m.pad) <= 0.5, `what it shows is on the box's line: ${m.shown} from the edge, the box's padding ${m.pad}`);
            } else {
              assert.equal(m.hang, 0, "it stands on its own line");
              assert.ok(Math.abs(m.clear - m.pad) <= 0.5, `its box stands at the box's own edge: ${m.clear}`);
            }
            // The ring: where room is said, +2 if the hung box keeps 4 from the room's edge, else inside at -2, and whole; with none, the ordinary +2.
            if (room) ringIsWhole(m, m.clear >= 4 - 0.5 ? 2 : -2);
            else { assert.ok(m.focused); assert.equal(m.ring, 2); assert.deepEqual(m.outline, ["solid", 2]); }
            const r = await page.evaluate((sel) => window.__visible(document, sel).getBoundingClientRect().toJSON(), control);
            assert.ok(r.left >= 0 && r.right <= options.viewport.width, "wholly on screen");
            await page.close();
          });
        }
      }
    }
  }
  test("a drawer in a page with no padding is wholly on screen", async () => {
    const page = await open(`<B.Drawer label="Record" onBack={() => {}}><div>Half</div><div>Half</div></B.Drawer>`, PHONE, "light");
    assert.ok((await page.locator(".basalt-drawer-back").boundingBox()).x >= 0);
    await page.close();
  });
});

describe("An icon-only copy that is refused shows the close for 1500ms, then Copy returns", () => {
  for (const [name, fixture, button] of [
    ["Terminal's compact copy", `<div style={{ width: 360 }}><B.Terminal title="Deploy" lines={[{ kind: "command", text: "ls" }]} /></div>`, ".basalt-terminal-copy-compact"],
    ["CodeBlock's copy", `<B.CodeBlock title="config" code="x" />`, ".basalt-code-copy .basalt-button"],
  ]) {
    test(`${name}: the close at the front through the done seat with "Copy failed", for the interval, then Copy at the front with data-done cleared, and never the check`, async () => {
      const page = await open(fixture, DESKTOP, "dark");
      await page.addScriptTag({ content: DRAWING });
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("refused")) }, configurable: true }));
      const fast = ms(await token(page, "duration-fast"));
      const seen = await page.evaluate(async ([sel, fast]) => {
        const b = window.__visible(document, sel);
        const status = () => [...document.querySelectorAll('[role="status"]')].map((s) => s.textContent).join("|");
        const out = { check: false, closeAt: null, closeUntil: null, doneOff: null, statusShown: "", end: null };
        const t0 = performance.now();
        b.click();
        await new Promise((done) => {
          const tick = (now) => {
            const t = now - t0;
            const d = window.__drawing(b);
            if (d.glyph === "check" || d.glyph === "frame:check") out.check = true;
            if (d.glyph === "close") { if (out.closeAt === null) out.closeAt = t; out.closeUntil = t; }
            if (b.hasAttribute("data-done")) { if (/Copy failed/.test(status())) out.statusShown = status(); } else if (out.closeAt !== null && out.doneOff === null) out.doneOff = t;
            if (out.doneOff !== null && t > out.doneOff + fast + 34) { out.end = { glyph: d.glyph, done: b.hasAttribute("data-done"), status: status() }; done(); } else if (t > 2600) done(); else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        return out;
      }, [button, fast]);
      assert.equal(seen.check, false, "the check is never at the front");
      assert.ok(seen.closeAt !== null && seen.closeAt <= fast + 34, `the close is at the front by ${seen.closeAt}`);
      assert.match(seen.statusShown, /Copy failed/);
      assert.ok(seen.doneOff !== null && Math.abs(seen.doneOff - 1500) <= 100, `the done state lasts the interval: it ends at ${seen.doneOff}`);
      assert.ok(seen.closeUntil >= 1500 - 100, `the close stays until ${seen.closeUntil}`);
      assert.deepEqual([seen.end?.glyph, seen.end?.done], ["copy", false], `then Copy, with data-done cleared: ${JSON.stringify(seen.end)}`);
      await page.close();
    });
  }
});
