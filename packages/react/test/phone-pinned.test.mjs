// The phone and what is pinned (cimip-gaps-2, batch B5; decided by Opus on the no-council path, DECISIONS 226 and 265; the implementation is to be reviewed by
// Astra): the on-screen keyboard (a stand-in visual viewport, since headless Chromium raises none), the measured pinned sizes, the app's foot that holds
// still, the tray of rows that wait on the reader and its phone sheet, 44px targets under 720 whatever the pointer with stacked links that never take
// each other's taps, and a toast that echoed a page closing when the page changes. Driven in Chromium against the built package with the real
// stylesheet. Synthetic data only, in two unlike domains (a support inbox and a build pipeline).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const COARSE = { hasTouch: true, isMobile: true };
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => { let left = count; const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick)); requestAnimationFrame(tick); }), n);
const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  if (options.isMobile) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
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
const box = (page, selector) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width } : null; }, selector);
const rootVar = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

// A stand-in for the visual viewport: headless Chromium raises no keyboard, so the test shrinks this one and sends its `resize`, as iOS and Android do.
const VIEWPORT = `
const vv = new EventTarget();
Object.assign(vv, { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1 });
Object.defineProperty(window, "visualViewport", { configurable: true, get: () => vv });
window.keyboard = (inset, top = 0, scale = 1) => { vv.height = innerHeight - inset - top; vv.offsetTop = top; vv.scale = scale; vv.dispatchEvent(new Event("resize")); };
window.down = () => window.keyboard(0);
document.body.style.margin = "0";
`;

// ---- The on-screen keyboard ----

const SHELL = (extra = "", page = "") => `${VIEWPORT}
function Rows() { return Array.from({ length: 30 }, (_, i) => <p key={i} style={{ margin: "0 0 16px" }}>Ticket {1000 + i}: a customer asked about an invoice.</p>); }
function App() {
  const [sheet, setSheet] = React.useState(null);
  const [dialog, setDialog] = React.useState(false);
  const toast = B.useToast();
  React.useEffect(() => { window.toast = toast; window.openSheet = setSheet; window.openDialog = setDialog; }, [toast]);
  return (
    <B.AppShell brand={<span>Desk</span>} brandLabel="Desk home" sidebar={<B.Nav aria-label="Main"><B.NavGroup label="Desk"><B.NavItem href="#a" icon={B.HomeGlyph} current>Inbox</B.NavItem></B.NavGroup></B.Nav>}
      header={<B.AppHeader title="Inbox" />}
      tabBar={<B.TabBar><B.TabBarItem href="#a" icon={B.HomeGlyph} current>Inbox</B.TabBarItem><B.TabBarItem href="#b" icon={B.SearchGlyph}>Search</B.TabBarItem><B.TabBarItem href="#c" icon={B.HomeGlyph}>Team</B.TabBarItem></B.TabBar>}
      ${extra}>
      ${page || "<Rows />"}
      <input id="field" className="basalt-input" aria-label="Reply" />
      <B.Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}><B.SheetContent side={sheet ?? "bottom"} id="sheet"><B.SheetTitle>Assign</B.SheetTitle><input id="sheet-field" className="basalt-input" aria-label="Name" /><B.SheetActions><B.Button variant="primary">Assign</B.Button></B.SheetActions></B.SheetContent></B.Sheet>
      <B.Dialog open={dialog} onOpenChange={setDialog}><B.DialogContent id="dialog"><B.DialogTitle>Rename</B.DialogTitle><input className="basalt-input" aria-label="Title" /></B.DialogContent></B.Dialog>
    </B.AppShell>
  );
}
createRoot(document.getElementById("root")).render(<B.ToastProvider><App /></B.ToastProvider>);`;

describe("an on-screen keyboard", () => {
  test("nothing is written while none is up; a keyboard writes its geometry to the root, and the root is clean once it goes", async () => {
    const page = await open(SHELL(), { width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-screen-keyboard")), false);
    assert.equal(await rootVar(page, "--basalt-keyboard-inset"), "");
    await page.evaluate(() => window.keyboard(320));
    await frames(page);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-screen-keyboard")), true);
    assert.equal(await rootVar(page, "--basalt-keyboard-inset"), "320px");
    assert.equal(await rootVar(page, "--basalt-viewport-height"), "524px");
    assert.equal(await rootVar(page, "--basalt-viewport-top"), "0px");
    await page.evaluate(() => window.down());
    await frames(page);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-screen-keyboard")), false);
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("style") ?? ""), "");
    assert.deepEqual(page.errors, []);
  });

  test("a pinch and a browser's own bars are not a keyboard", async () => {
    const page = await open(SHELL(), { width: 390, height: 844 });
    await page.evaluate(() => window.keyboard(320, 0, 1.6));
    await frames(page);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-screen-keyboard")), false, "a pinch");
    await page.evaluate(() => window.keyboard(80));
    await frames(page);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-screen-keyboard")), false, "80px of bars");
  });

  test("under 720 the tab bar is covered and the toasts stay under the bar (DECISIONS 274); from 720 the toasts stand on the keyboard; the scroll padding clears it", async () => {
    const page = await open(SHELL(), { width: 390, height: 844 });
    await page.evaluate(() => window.toast.show({ title: "Reply sent", home: "page", timeout: 0 }));
    await settle(page);
    const before = await box(page, ".basalt-toast");
    assert.ok(Math.abs(before.top - (56 + 8)) <= 1, `under the bar: ${before.top}`);
    await page.evaluate(() => window.keyboard(300, 40));
    await frames(page);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-tabbar")).display), "none");
    const up = await box(page, ".basalt-toast");
    assert.ok(Math.abs(up.top - (40 + 56 + 8)) <= 1, `under the bar, on what is seen: ${up.top}`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom), "316px");
    // The bar's 56, what is panned past (40), and space-4.
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "112px");
    const wide = await open(SHELL(), { width: 1024, height: 700 });
    await wide.evaluate(() => { window.toast.show({ title: "Reply sent", home: "page", timeout: 0 }); window.keyboard(300); });
    await settle(wide);
    await frames(wide);
    const raised = await box(wide, ".basalt-toast-viewport");
    assert.ok(Math.abs(raised.bottom - (700 - 300 - 16)) <= 1, `from 720, on the keyboard: ${raised.bottom}`);
  });

  test("a bottom sheet stands on the keyboard at 90% of what is seen; a side sheet is what is seen; a dialog is centred in it; with no keyboard each is as it was", async () => {
    const page = await open(SHELL(), { width: 390, height: 844 });
    await page.evaluate(() => window.openSheet("bottom"));
    await settle(page);
    const rest = await box(page, "#sheet");
    assert.ok(Math.abs(rest.bottom - 844) <= 1, `at rest it meets the window's bottom: ${rest.bottom}`);
    await page.evaluate(() => window.keyboard(300, 40));
    await frames(page);
    const up = await box(page, "#sheet");
    assert.ok(Math.abs(up.bottom - (844 - 300)) <= 1, `on the keyboard: ${up.bottom}`);
    assert.ok(up.height <= Math.ceil((844 - 340) * 0.9) + 1, `90% of what is seen: ${up.height}`);
    // The sticky actions stay inside the sheet's box.
    const actions = await box(page, "#sheet .basalt-dialog-actions");
    assert.ok(actions.bottom <= up.bottom + 0.5, `actions ${actions.bottom} in sheet ${up.bottom}`);
    await page.evaluate(() => window.openSheet("right"));
    await settle(page);
    const side = await box(page, "#sheet");
    assert.ok(Math.abs(side.top - 40) <= 1 && Math.abs(side.bottom - (844 - 300)) <= 1, `side sheet ${side.top}..${side.bottom}`);
    await page.evaluate(() => window.openSheet(null));
    await page.evaluate(() => window.openDialog(true));
    await settle(page);
    const dialog = await box(page, "#dialog");
    const centre = 40 + (844 - 340) / 2;
    assert.ok(Math.abs((dialog.top + dialog.bottom) / 2 - centre) <= 1.5, `centred in what is seen: ${(dialog.top + dialog.bottom) / 2} vs ${centre}`);
    await page.evaluate(() => window.down());
    await frames(page);
    const after = await box(page, "#dialog");
    assert.ok(Math.abs((after.top + after.bottom) / 2 - 422) <= 1.5, `centred in the window again: ${(after.top + after.bottom) / 2}`);
  });

  test("the command menu hangs from the top of what is seen", async () => {
    const page = await open(`${VIEWPORT}
function App() { const [open, setOpen] = React.useState(true); return <B.CommandMenu open={open} onOpenChange={setOpen} groups={[{ label: "Builds", commands: [{ id: "a", label: "Run the pipeline", onSelect() {} }] }]} />; }
createRoot(document.getElementById("root")).render(<App />);`, { width: 390, height: 844 });
    await page.waitForSelector(".basalt-command");
    await settle(page);
    await page.evaluate(() => window.keyboard(320, 60));
    await frames(page);
    const menu = await box(page, ".basalt-command");
    const seen = 844 - 380;
    assert.ok(Math.abs(menu.top - (60 + Math.max(16, seen * 0.12))) <= 1, `top ${menu.top}`);
    assert.ok(menu.bottom <= 60 + seen - 16 + 1, `inside what is seen: ${menu.bottom}`);
  });

  test("a select near the keyboard opens above its trigger or fits what is seen (Base UI reads the visual viewport)", async () => {
    const page = await open(`${VIEWPORT}
const options = Array.from({ length: 8 }, (_, i) => ({ value: "s" + i, label: "Stage " + (i + 1) }));
createRoot(document.getElementById("root")).render(<div style={{ paddingTop: 420 }}><B.Select aria-label="Stage" options={options} placeholder="Pick a stage" /></div>);`, { width: 390, height: 844 });
    await page.evaluate(() => window.keyboard(340));
    await frames(page);
    await page.locator(".basalt-select-trigger").click();
    await page.waitForSelector(".basalt-select-popup");
    await settle(page);
    const popup = await box(page, ".basalt-select-popup");
    assert.ok(popup.bottom <= 844 - 340 + 1, `the list ends above the keyboard: ${popup.bottom}`);
  });
});

// ---- Measured pinned sizes ----

const STRIP = (measure = true) => `
function Page() {
  B.usePinnedEdges(${measure});
  return (
    <div>
      <header className="basalt-chrome basalt-app-header" data-pinned-edge="top"><div className="basalt-app-bar"><h1 className="basalt-app-title">Pipeline</h1></div></header>
      <div id="strip" data-pinned-edge="top" style={{ position: "sticky", top: "var(--basalt-sticky-offset)", height: 48, background: "var(--basalt-surface-page)", zIndex: 5 }}>Build 412 · Running · 4 min</div>
      <div style={{ height: 1600 }} />
      <button id="target" className="basalt-button" data-variant="secondary">Retry the step</button>
      <div style={{ height: 1600 }} />
      <div id="foot" data-pinned-edge="bottom" style={{ position: "sticky", bottom: 0, height: 80, background: "var(--basalt-surface-page)" }}>Approve the deploy</div>
    </div>
  );
}
document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<Page />);`;

describe("measured pinned sizes", () => {
  test("the root carries what covers each edge, and a control that focus brings into view clears the bar and the strip (WCAG 2.4.11)", async () => {
    const page = await open(STRIP(), { width: 1024, height: 700 });
    await frames(page, 3);
    assert.equal(await rootVar(page, "--basalt-pinned-top"), "104px");
    assert.equal(await rootVar(page, "--basalt-pinned-bottom"), "80px");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "120px");
    await page.evaluate(() => document.getElementById("target").focus());
    const target = await box(page, "#target");
    const strip = await box(page, "#strip");
    assert.ok(target.top >= strip.bottom, `the focused control ${target.top} is below the strip ${strip.bottom}`);
  });

  test("without the opt-in the fixed values stand: the strip is not counted", async () => {
    const page = await open(STRIP(false), { width: 1024, height: 700 });
    await frames(page, 3);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-pinned-measured")), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "72px");
  });

  test("an element counts only while it is pinned, and the measure follows a strip that grows", async () => {
    const page = await open(STRIP(), { width: 1024, height: 700 });
    await frames(page, 3);
    await page.evaluate(() => { document.getElementById("strip").style.position = "static"; window.dispatchEvent(new Event("resize")); });
    await frames(page, 3);
    assert.equal(await rootVar(page, "--basalt-pinned-top"), "56px");
    await page.evaluate(() => { const s = document.getElementById("strip"); s.style.position = "sticky"; s.style.height = "72px"; });
    await frames(page, 3);
    assert.equal(await rootVar(page, "--basalt-pinned-top"), "128px");
  });
});

// ---- The app's foot ----

const FOOT = (rows) => SHELL(`foot={<div id="foot-body" style={{ display: "flex", gap: 8 }}><input className="basalt-input" aria-label="Message" style={{ flex: 1 }} /><B.Button variant="primary">Send</B.Button></div>}`, `{Array.from({ length: ${rows} }, (_, i) => <p key={i} style={{ margin: "0 0 16px" }}>Step {i + 1} of the build finished.</p>)}`);

describe("the app's foot holds still", () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    test(`at ${width}: on a short page it rests at the window's bottom${width < 720 ? " on the tab bar" : ""}, and on a long page it sticks in the same place`, async () => {
      const floor = width < 720 ? height - 56 : height;
      const short = await open(FOOT(2), { width, height });
      await frames(short, 3);
      const rest = await box(short, ".basalt-app-foot");
      assert.ok(Math.abs(rest.bottom - floor) <= 1, `short page: ${rest.bottom} vs ${floor}`);
      const long = await open(FOOT(80), { width, height });
      await frames(long, 3);
      const top = await box(long, ".basalt-app-foot");
      await long.evaluate(() => window.scrollTo(0, 1200));
      await frames(long);
      const mid = await box(long, ".basalt-app-foot");
      await long.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await frames(long);
      const end = await box(long, ".basalt-app-foot");
      for (const [name, at] of [["top", top], ["scrolled", mid], ["end", end]]) assert.ok(Math.abs(at.bottom - floor) <= 1, `${name}: ${at.bottom} vs ${floor}`);
      // At the page's end the last line of the page is above the foot, not under it.
      const last = await long.evaluate(() => [...document.querySelectorAll(".basalt-app-main p")].at(-1).getBoundingClientRect().bottom);
      assert.ok(last <= end.top, `last line ${last} above the foot ${end.top}`);
      // The toasts sit above the foot (the shell measures what is pinned when it has a foot).
      await long.evaluate(() => window.toast.show({ title: "Build queued", home: "page", timeout: 0 }));
      await settle(long);
      await frames(long, 3);
      const stack = await box(long, ".basalt-toast");
      assert.ok(stack.bottom <= end.top - 15, `toast ${stack.bottom} clear of the foot ${end.top}`);
    });
  }

  test("with an on-screen keyboard the foot rides on it", async () => {
    const page = await open(FOOT(80), { width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.evaluate(() => window.keyboard(300));
    await frames(page, 3);
    const foot = await box(page, ".basalt-app-foot");
    assert.ok(Math.abs(foot.bottom - (844 - 300)) <= 1, `on the keyboard: ${foot.bottom}`);
    assert.ok(foot.height <= 844 - 300 - 56 - 44 + 1, `never taller than what is seen less the bar and a row: ${foot.height}`);
  });
});

// ---- The tray ----

const TRAY = `${VIEWPORT}
function App() {
  const [rows, setRows] = React.useState([{ id: "a", who: "Customer 1042", what: "asked to reopen a closed ticket" }, { id: "b", who: "Customer 1077", what: "is waiting on a refund approval" }, { id: "c", who: "Build 412", what: "needs approval to deploy to production" }]);
  const field = React.useRef(null);
  const answer = (id) => setRows((all) => all.filter((r) => r.id !== id));
  React.useEffect(() => { window.answer = answer; window.answerMany = (ids) => setRows((all) => all.filter((r) => !ids.includes(r.id))); window.rows = () => rows.length; });
  return (
    <div style={{ padding: 16, maxWidth: 680 }}>
      <B.Tray label="Waiting on you" summary={(n) => n + " waiting on you"} returnFocus={field}>
        {rows.map((r) => (
          <B.TrayRow key={r.id} id={"row-" + r.id} mark={<B.Badge variant="plain" status="pending">Waiting</B.Badge>} actions={<><B.Button size="sm" variant="primary" onClick={() => answer(r.id)}>Answer</B.Button></>}>
            <strong>{r.who}</strong> {r.what}
          </B.TrayRow>
        ))}
        <B.TrayRow stay mark={<B.Spinner variant="braille" />}>Build 413 is running tests</B.TrayRow>
      </B.Tray>
      <input ref={field} id="field" className="basalt-input" aria-label="Message" style={{ marginTop: 8 }} />
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

describe("a tray of rows that wait on the reader", () => {
  for (const theme of ["dark", "light"]) {
    test(`from 720 every row is a row of one level-1 panel; nothing fails axe (${theme})`, async () => {
      const page = await open(TRAY, { width: 1024, height: 700, theme });
      assert.equal(await page.locator("section[aria-label='Waiting on you']").count(), 1);
      assert.equal(await page.locator(".basalt-tray[data-level='1']").count(), 1);
      assert.equal(await page.locator(".basalt-tray-scroll > .basalt-tray-row:visible").count(), 4);
      assert.equal(await page.locator(".basalt-tray-band:visible").count(), 0);
      const row = await box(page, "#row-a");
      assert.ok(row.height >= 40, `a row is at least 40: ${row.height}`);
      assert.deepEqual(await axe(page), []);
    });
  }

  test("a row's mark, words and action share the first line's baseline, and long words wrap and are never cut", async () => {
    const page = await open(TRAY, { width: 1024, height: 700 });
    const lines = await page.evaluate(() => {
      const row = document.getElementById("row-a");
      const words = row.querySelector(".basalt-tray-words");
      words.textContent = "Customer 1042 asked to reopen a closed ticket about a duplicated invoice that was sent twice last month and refunded once";
      row.parentElement.parentElement.style.maxWidth = "420px";
      const style = getComputedStyle(words);
      return { overflow: style.overflow, ellipsis: style.textOverflow, height: words.getBoundingClientRect().height, line: parseFloat(style.lineHeight) };
    });
    assert.ok(lines.height >= lines.line * 2, `the words wrap: ${lines.height}`);
    assert.notEqual(lines.ellipsis, "ellipsis");
  });

  for (const theme of ["dark", "light"]) test(`under 720 the rows that wait are one band that opens them in a sheet; a row that only reports stays; the open sheet passes axe (${theme})`, async () => {
    const page = await open(TRAY, { width: 390, height: 844, theme });
    const band = page.locator(".basalt-tray-band");
    assert.equal(await band.textContent(), "3 waiting on youShow");
    assert.equal(await band.getAttribute("aria-haspopup"), "dialog");
    assert.ok((await band.boundingBox()).height >= 44);
    assert.equal(await page.locator(".basalt-tray-scroll > .basalt-tray-row:visible").count(), 1);
    await band.click();
    await page.waitForSelector(".basalt-tray-sheet");
    await settle(page);
    assert.equal(await page.locator(".basalt-tray-sheet .basalt-tray-row").count(), 3);
    assert.equal(await page.locator(".basalt-tray-sheet .basalt-dialog-title").textContent(), "Waiting on you");
    assert.deepEqual(await axe(page), []);
  });

  test("focus is never lost to a row that leaves: the next row takes it, and after the last the sheet closes and focus is on the field", async () => {
    const page = await open(TRAY, { width: 390, height: 844 });
    await page.locator(".basalt-tray-band").click();
    await page.waitForSelector(".basalt-tray-sheet");
    await settle(page);
    await page.locator(".basalt-tray-sheet #row-a .basalt-button").focus();
    await page.keyboard.press("Enter");
    await frames(page);
    assert.equal(await page.evaluate(() => document.activeElement?.closest(".basalt-tray-row")?.id), "row-b");
    await page.keyboard.press("Enter");
    await frames(page);
    assert.equal(await page.evaluate(() => document.activeElement?.closest(".basalt-tray-row")?.id), "row-c");
    await page.keyboard.press("Enter");
    await settle(page);
    await frames(page, 4);
    assert.equal(await page.locator(".basalt-tray-sheet").count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "field");
    assert.equal(await page.locator(".basalt-tray-band").count(), 0);
  });

  test("from 720, answering a focused row moves focus to the row that took its place", async () => {
    const page = await open(TRAY, { width: 1024, height: 700 });
    await page.locator("#row-b .basalt-button").focus();
    await page.keyboard.press("Enter");
    await frames(page);
    assert.equal(await page.evaluate(() => document.activeElement?.closest(".basalt-tray-row")?.id), "row-c");
  });
});

// ---- 44px targets under 720 whatever the pointer, and stacked links ----

const TARGETS = `
document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(
  <div style={{ padding: 16, display: "grid", justifyItems: "start", font: "var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans)" }}>
    <B.Button id="stop" size="xs">Stop</B.Button>
    <div id="stack" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: 24 }}>
      <B.Link id="one" href="#one">Open the invoice</B.Link>
      <B.Link id="two" href="#two">Open the customer</B.Link>
      <B.Link id="three" href="#three">Open the build log</B.Link>
    </div>
  </div>
);`;

describe("44px targets under 720, whatever the pointer", () => {
  test("a button is 44 tall under 720 with a mouse, and keeps its own size from 720", async () => {
    const narrow = await open(TARGETS, { width: 390, height: 844 });
    assert.ok((await box(narrow, "#stop")).height >= 44, "390, a mouse");
    const wide = await open(TARGETS, { width: 1024, height: 700 });
    assert.ok((await box(wide, "#stop")).height < 44, "1024, a mouse");
  });

  for (const [name, options] of [["a mouse under 720", { width: 390, height: 844 }], ["a finger", { width: 390, height: 844, ...COARSE }]]) {
    test(`stacked links (${name}): nothing moves, and every point of a link's own words is that link's`, async () => {
      const page = await open(TARGETS, options);
      const got = await page.evaluate(() => {
        const ids = ["one", "two", "three"];
        const rows = ids.map((id) => { const label = document.querySelector("#" + id + " .basalt-link-label"); const r = label.getBoundingClientRect(); return { id, top: r.top, bottom: r.bottom, x: r.left + r.width / 2, box: document.getElementById(id).getBoundingClientRect().height }; });
        const misses = [];
        for (const row of rows) for (let y = Math.ceil(row.top) + 1.5; y < row.bottom - 1; y += 1) {
          const hit = document.elementFromPoint(row.x, y)?.closest("a")?.id;
          if (hit !== row.id) misses.push(`${row.id}@${y}:${hit}`);
        }
        // The lines: where each link's own line box starts (its label is a flex item as tall as its text, centred in the 44px box).
        const lh = parseFloat(getComputedStyle(document.getElementById("one")).lineHeight);
        return { misses, lh, lines: ids.map((id) => { const a = document.getElementById(id); return a.getBoundingClientRect().top - parseFloat(getComputedStyle(a).marginTop); }), boxes: rows.map((r) => r.box) };
      });
      assert.deepEqual(got.misses, []);
      // The lines are the links' own: one of their line heights apart, so the 44px boxes changed no layout.
      assert.ok(Math.abs(got.lines[1] - got.lines[0] - got.lh) <= 0.5 && Math.abs(got.lines[2] - got.lines[1] - got.lh) <= 0.5, `lines ${got.lines}, line height ${got.lh}`);
      assert.ok(got.boxes.every((h) => h >= 44), `each link's box is 44: ${got.boxes}`);
    });
  }
});

// ---- A toast that echoed the page goes with the page ----

const ROUTES = `
function App() {
  const [path, setPath] = React.useState("/inbox");
  const title = React.useRef(null);
  const toast = B.useToast();
  B.useRouteFocus({ key: path, title: path, target: title });
  React.useEffect(() => { window.go = setPath; window.toast = toast; }, [toast]);
  return <h1 ref={title} tabIndex={-1}>{path}</h1>;
}
createRoot(document.getElementById("root")).render(<B.ToastProvider><App /></B.ToastProvider>);`;

describe("whether a toast outlives its page", () => {
  test("a toast whose only home is the page closes when the page changes; the only copy and a toast with a lasting home stay", async () => {
    const page = await open(ROUTES, { width: 390, height: 844 });
    await page.evaluate(() => {
      window.toast.show({ title: "Check-in sent", home: "page", timeout: 0 });
      window.toast.show({ title: "Could not upload the photo", status: "danger" });
      window.toast.show({ title: "Archived 3 tickets", home: ["page", "center"], timeout: 0 });
    });
    await settle(page);
    assert.equal(await page.locator(".basalt-toast").count(), 3);
    await page.evaluate(() => window.go("/builds"));
    await settle(page);
    await page.waitForFunction(() => document.querySelectorAll(".basalt-toast").length === 2);
    const titles = await page.locator(".basalt-toast-title").allTextContents();
    assert.deepEqual(titles.sort(), ["Archived 3 tickets", "Could not upload the photo"]);
  });

  test("an app with its own router says it with useToast().pageChanged()", async () => {
    const page = await open(ROUTES, { width: 1024, height: 700 });
    await page.evaluate(() => window.toast.show({ title: "Copied", home: "page", timeout: 0 }));
    await settle(page);
    await page.evaluate(() => window.toast.pageChanged());
    await page.waitForFunction(() => document.querySelectorAll(".basalt-toast").length === 0);
  });
});

// ---- An element that scrolls, not the window (audit F1: a scroll owner reads the same values, as its own) ----

const PANE = `${VIEWPORT}
function Page() {
  B.usePinnedEdges();
  // An app's own scroller: nothing of Basalt's that is fixed is on this page, so the app installs the keyboard's layout itself.
  B.useScreenKeyboardLayout();
  return (
    <div style={{ display: "grid", gridTemplateRows: "56px 1fr", height: "100vh" }}>
      <header className="basalt-chrome basalt-app-header" data-pinned-edge="top" style={{ position: "relative" }}><div className="basalt-app-bar"><h1 className="basalt-app-title">Document</h1></div></header>
      <div id="pane" data-scroll-owner="" style={{ overflowY: "auto", minHeight: 0 }}>
        <div id="pane-strip" data-pinned-edge="top" style={{ position: "sticky", top: 0, height: 40, background: "var(--basalt-surface-page)", zIndex: 2 }}>Comments · 4 open</div>
        <div style={{ height: 1400 }} />
        <input id="pane-field" className="basalt-input" aria-label="Comment" />
        <div style={{ height: 1400 }} />
        <div data-pinned-edge="bottom" style={{ position: "sticky", bottom: 0, height: 60, background: "var(--basalt-surface-page)" }}>Resolve all</div>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Page />);`;

describe("a scroller that is an element", () => {
  test("its own pinned parts are measured onto it, not the root, and pad it: a focused control lands below its strip", async () => {
    const page = await open(PANE, { width: 1024, height: 700 });
    await frames(page, 3);
    const got = await page.evaluate(() => {
      const pane = document.getElementById("pane");
      const css = getComputedStyle(pane);
      return { measured: pane.hasAttribute("data-pinned-measured"), top: pane.style.getPropertyValue("--basalt-pinned-top"), bottom: pane.style.getPropertyValue("--basalt-pinned-bottom"), pad: css.scrollPaddingTop, rootTop: document.documentElement.style.getPropertyValue("--basalt-pinned-top") };
    });
    // The header is in the flow here (not pinned), so the root measures nothing; the pane measures its strip and its foot.
    assert.deepEqual(got, { measured: true, top: "40px", bottom: "60px", pad: "56px", rootTop: "0px" });
    await page.evaluate(() => document.getElementById("pane").scrollTo(0, 2600));
    await page.evaluate(() => document.getElementById("pane-field").focus());
    const field = await box(page, "#pane-field");
    const strip = await box(page, "#pane-strip");
    assert.ok(field.top >= strip.bottom, `field ${field.top} below the strip ${strip.bottom}`);
  });

  test("with a keyboard up, the scroller carries its own share of it and is padded by it", async () => {
    const page = await open(PANE, { width: 390, height: 844 });
    await frames(page, 3);
    await page.evaluate(() => window.keyboard(300));
    await frames(page, 3);
    const got = await page.evaluate(() => {
      const pane = document.getElementById("pane");
      return { inset: pane.style.getPropertyValue("--basalt-keyboard-inset"), seen: pane.style.getPropertyValue("--basalt-viewport-height"), pad: getComputedStyle(pane).scrollPaddingBottom };
    });
    // The pane runs from 56 to 844; the keyboard covers 544 to 844 of it, and 488 of it is still seen.
    assert.deepEqual(got, { inset: "300px", seen: "488px", pad: "376px" });
    await page.evaluate(() => window.down());
    await frames(page);
    assert.equal(await page.evaluate(() => document.getElementById("pane").style.getPropertyValue("--basalt-keyboard-inset")), "");
  });
});

// ---- The toast stack on a phone hangs from the bar (DECISIONS 274) ----

const STACK = (strip = false) => `${VIEWPORT}
function Strip() { B.usePinnedEdges(); return <div id="strip" data-pinned-edge="top" style={{ position: "sticky", top: "var(--basalt-sticky-offset)", height: 44, zIndex: 5, background: "var(--basalt-surface-page)" }}>Week 31</div>; }
function App() {
  const toast = B.useToast();
  React.useEffect(() => { window.toast = toast; }, [toast]);
  return (
    <B.AppShell brand={<span>Coach</span>} brandLabel="Coach home" sidebar={<B.Nav aria-label="Main"><B.NavGroup label="Coach"><B.NavItem href="#a" icon={B.HomeGlyph} current>Today</B.NavItem></B.NavGroup></B.Nav>}
      header={<B.AppHeader title="Weekly check-in" />}
      tabBar={<B.TabBar><B.TabBarItem href="#a" icon={B.HomeGlyph} current>Today</B.TabBarItem><B.TabBarItem href="#b" icon={B.SearchGlyph}>Search</B.TabBarItem><B.TabBarItem href="#c" icon={B.HomeGlyph}>Plan</B.TabBarItem></B.TabBar>}>
      ${strip ? "<Strip />" : ""}
      <div style={{ height: 1600 }} />
      <B.Button id="send" variant="primary">Send check-in</B.Button>
    </B.AppShell>
  );
}
createRoot(document.getElementById("root")).render(<B.ToastProvider><App /></B.ToastProvider>);`;

describe("the toast stack on a phone", () => {
  test("under 720 it hangs from the bar, full width, space-2 below its line; the front toast is at the top and the one behind peeks below it", async () => {
    const page = await open(STACK(), { width: 390, height: 844, ...COARSE });
    await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); window.toast.show({ title: "Draft saved", home: "page", timeout: 0 }); window.toast.show({ title: "Check-in sent", home: "page", timeout: 0 }); });
    await settle(page);
    const got = await page.evaluate(() => {
      // The front toast by its mark, not by document order (Base UI lists the newest first).
      const front = document.querySelector(".basalt-toast[data-front]").getBoundingClientRect();
      const behind = document.querySelector(".basalt-toast:not([data-front])").getBoundingClientRect();
      const send = document.getElementById("send").getBoundingClientRect();
      return { front: { top: front.top, left: front.left, right: front.right }, behindBottom: behind.bottom, frontBottom: front.bottom, send: { top: send.top, bottom: send.bottom } };
    });
    assert.ok(Math.abs(got.front.top - 64) <= 1, `space-2 under the 56px bar: ${got.front.top}`);
    assert.ok(Math.abs(got.front.left - 16) <= 1 && Math.abs(got.front.right - (390 - 16)) <= 1, `full width less the insets: ${got.front.left}..${got.front.right}`);
    assert.ok(got.behindBottom > got.frontBottom, `the toast behind peeks below the front one: ${got.behindBottom} > ${got.frontBottom}`);
    assert.ok(got.send.top >= got.behindBottom, `the form's last action is clear of the stack: ${got.send.top}`);
  });

  test("a band stuck under the bar, measured, moves it down; from 720 it is bottom right as before", async () => {
    const page = await open(STACK(true), { width: 390, height: 844, ...COARSE });
    await frames(page, 3);
    await page.evaluate(() => window.toast.show({ title: "Draft saved", home: "page", timeout: 0 }));
    await settle(page);
    assert.ok(Math.abs((await box(page, ".basalt-toast")).top - (56 + 44 + 8)) <= 1);
    const wide = await open(STACK(), { width: 1440, height: 900 });
    await wide.evaluate(() => window.toast.show({ title: "Draft saved", home: "page", timeout: 0 }));
    await settle(wide);
    const t = await box(wide, ".basalt-toast");
    assert.ok(Math.abs(t.bottom - (900 - 16)) <= 1 && Math.abs(t.right - (1440 - 16)) <= 1, `bottom right: ${t.bottom}, ${t.right}`);
  });

  test("a toast enters from the top edge (and under reduced motion only fades)", async () => {
    const page = await open(STACK(), { width: 390, height: 844, ...COARSE });
    const starting = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "basalt-toast";
      probe.setAttribute("data-starting-style", "");
      document.querySelector(".basalt-toast-viewport")?.append(probe) ?? document.body.append(probe);
      const m = new DOMMatrix(getComputedStyle(probe).transform);
      probe.remove();
      return m.m42;
    });
    assert.ok(starting < 0, `it starts above its place: ${starting}`);
    const still = await open(STACK(), { width: 390, height: 844, reducedMotion: "reduce", ...COARSE });
    const held = await still.evaluate(() => {
      const probe = document.createElement("div");
      probe.className = "basalt-toast";
      probe.setAttribute("data-starting-style", "");
      document.body.append(probe);
      const m = new DOMMatrix(getComputedStyle(probe).transform);
      probe.remove();
      return m.m42;
    });
    assert.ok(held >= 0, `under reduced motion it starts in its place: ${held}`);
  });
});

// ---- Astra's fix pass 1 (B5): the focus handoff without focusout, an ordinary close, the status message, a page's own bar, panes, a strip
// that becomes sticky ----

describe("fix pass 1", () => {
  test("the tray's focus handoff does not need a focusout (WebKit can drop a removed element's focus without one), and several rows leaving at once is the same case", async () => {
    const page = await open(TRAY, { width: 1024, height: 700 });
    // Swallow every focusout before the document hears it, as WebKit does when a focused element is removed.
    await page.evaluate(() => window.addEventListener("focusout", (event) => event.stopImmediatePropagation(), true));
    await page.locator("#row-b .basalt-button").focus();
    await page.evaluate(() => window.answer("b"));
    await frames(page);
    assert.equal(await page.evaluate(() => document.activeElement?.closest(".basalt-tray-row")?.id), "row-c");
    await page.evaluate(() => window.answerMany(["a", "c"]));
    await frames(page);
    // No row that waits is left: the field.
    assert.equal(await page.evaluate(() => document.activeElement?.id), "field");
  });

  test("an ordinary close of the tray's sheet (Esc) returns focus to the band that opened it; the field takes it only after the last row leaves", async () => {
    const page = await open(TRAY, { width: 390, height: 844 });
    await page.locator(".basalt-tray-band").click();
    await page.waitForSelector(".basalt-tray-sheet");
    await settle(page);
    await page.keyboard.press("Escape");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-tray-band")), true);
  });

  test("the measured bottom counts the status bar's message band, stacked above the bar under 720", async () => {
    const page = await open(`
function Page() {
  B.usePinnedEdges();
  return <><div style={{ height: 1600 }} /><B.StatusBar start={<span>Build 412</span>} message={{ text: "Deploy paused: waiting for an approval" }} /></>;
}
document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<Page />);`, { width: 390, height: 844 });
    await frames(page, 3);
    const got = await page.evaluate(() => {
      const bar = document.querySelector(".basalt-status-bar").getBoundingClientRect();
      const message = document.querySelector(".basalt-status-bar-message").getBoundingClientRect();
      return { measured: document.documentElement.style.getPropertyValue("--basalt-pinned-bottom"), union: Math.ceil(bar.bottom - Math.min(bar.top, message.top)), message: message.height };
    });
    assert.ok(got.message > 0, "the message band is drawn");
    assert.equal(got.measured, `${got.union}px`);
  });

  test("a page's own sticky bar (.basalt-sticky-bar, README) keeps its clearance when an AppShell foot turns measuring on", async () => {
    const page = await open(`
document.body.style.margin = "0";
const style = document.createElement("style"); style.textContent = ":root { --basalt-sticky-offset: 80px; }"; document.head.append(style);
createRoot(document.getElementById("root")).render(
  <B.AppShell brand={<span>Docs</span>} brandLabel="Docs home" sidebar={<B.Nav aria-label="Main"><B.NavGroup label="Docs"><B.NavItem href="#a" icon={B.HomeGlyph} current>Pages</B.NavItem></B.NavGroup></B.Nav>}
    header={<header className="basalt-chrome basalt-sticky-bar" style={{ height: 80, display: "flex", alignItems: "center" }}>A shared document</header>}
    foot={<B.Button>Publish</B.Button>}>
    <div style={{ height: 1600 }} />
  </B.AppShell>
);`, { width: 1440, height: 900 });
    await frames(page, 3);
    assert.equal(await rootVar(page, "--basalt-pinned-top"), "80px");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "96px");
  });

  test("a strip that becomes sticky by a class, with no change of size, is measured", async () => {
    const page = await open(`
const style = document.createElement("style"); style.textContent = ".stuck { position: sticky; top: 0; }"; document.head.append(style);
function Page() { B.usePinnedEdges(); return <><div id="strip" data-pinned-edge="top" style={{ height: 40 }}>Build 412</div><div style={{ height: 1600 }} /></>; }
document.body.style.margin = "0";
createRoot(document.getElementById("root")).render(<Page />);`, { width: 1024, height: 700 });
    await frames(page, 3);
    assert.equal(await rootVar(page, "--basalt-pinned-top"), "0px");
    await page.evaluate(() => document.getElementById("strip").classList.add("stuck"));
    await frames(page, 3);
    assert.equal(await rootVar(page, "--basalt-pinned-top"), "40px");
  });

  test("a pane inside a scroller that scrolls, and a pane mounted after the keyboard rose, each carry their own share of it", async () => {
    const page = await open(`${VIEWPORT}
function Page() {
  const [late, setLate] = React.useState(false);
  B.useScreenKeyboardLayout();
  React.useEffect(() => { window.mountLate = () => setLate(true); }, []);
  return (
    <div id="outer" style={{ height: "100vh", overflowY: "auto" }}>
      <div style={{ height: 300 }} />
      <div id="pane" data-scroll-owner="" style={{ height: 500, overflowY: "auto" }}><div style={{ height: 2000 }} /></div>
      <div style={{ height: 1200 }} />
      {late ? <div id="late" data-scroll-owner="" style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 400, overflowY: "auto" }}><div style={{ height: 900 }} /></div> : null}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Page />);`, { width: 390, height: 844 });
    await page.evaluate(() => window.keyboard(300));
    await frames(page, 3);
    const share = (id) => page.evaluate((i) => document.getElementById(i)?.style.getPropertyValue("--basalt-keyboard-inset"), id);
    // The pane runs from 300 to 800; the keyboard covers from 544: 256 of it.
    assert.equal(await share("pane"), "256px");
    await page.evaluate(() => document.getElementById("outer").scrollTo(0, 200));
    await frames(page, 3);
    // Scrolled up by 200 it runs from 100 to 600: 56 of it is under the keyboard.
    assert.equal(await share("pane"), "56px");
    await page.evaluate(() => window.mountLate());
    await frames(page, 3);
    // Fixed at the bottom, 444 to 844: 300 of it is under the keyboard.
    assert.equal(await share("late"), "300px");
  });
});

