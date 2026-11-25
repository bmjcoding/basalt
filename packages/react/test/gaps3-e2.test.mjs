// cimip-gaps-3, batch E2: focus, keys and live regions (engineering; no pixel at rest).
//
// 1  Toast: a toast is a named group, not a dialog; F6 lands on the newest toast's action.
// 2  Composer: the status is a polite live region only while focus is in the composer (statusLive).
// 3  DotSep and DotLine: the text reads "A, B" (no space before the comma); a wrapped line never starts with the dot, beside an inline-block fact too;
//    the same for a notification group's ", 3 times" and StreamQuote's caption.
// 4  Focus: route focus wins over a closing dialog's; scroll={false}; a late target; the title read late; AppHeader's titleRef; SkipLink onSkip and a
//    function target; NotificationCenter initialFocus; useFocusNet.
// 5  Keys: useShortcuts runs nothing while a dialog is open; isHardwareKey and useShortcutsVisible are exported; SearchField onOpen.
//
// Written while tests are paused (DECISIONS 359): not run yet.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
// `B` is handed to the page too, for `page.evaluate`.
const render = (jsx, before = "") => `window.B = B;\n${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;

/** The accessible name Chrome computes for an element's content (a probe labelled by it), as words-fix-c12 reads it. */
async function nameOf(page, selector) {
  await page.locator(selector).first().evaluate((el) => { el.id ||= "probe-target"; const probe = document.createElement("div"); probe.setAttribute("role", "group"); probe.id = "probe"; probe.setAttribute("aria-labelledby", el.id); document.body.append(probe); });
  const client = await page.context().newCDPSession(page);
  try {
    const { result } = await client.send("Runtime.evaluate", { expression: 'document.getElementById("probe")' });
    const { nodes } = await client.send("Accessibility.getPartialAXTree", { objectId: result.objectId, fetchRelatives: false });
    return nodes[0].name?.value ?? "";
  } finally { await client.detach(); await page.evaluate(() => document.getElementById("probe")?.remove()); }
}

// ---- 1: Toast ----

const TOASTS = render(`<B.ToastProvider><Demo /></B.ToastProvider>`, `function Demo() { const t = B.useToast(); React.useEffect(() => { window.t = t; }, [t]); return <main style={{ padding: 16 }}><button id="page">On the page</button></main>; }`);

describe("1: a toast is a group, and F6 reaches its action", () => {
  for (const theme of THEMES) {
    test(`${theme}: the root is a named group with no dialog role and no aria-modal; isOverlayOpen is false while it shows`, async () => {
      const { page, errors } = await fixturePage(browser, TOASTS, { theme });
      try {
        await page.evaluate(() => window.t.show({ title: "Draft saved" }));
        const root = page.locator(".basalt-toast").first();
        await root.waitFor();
        assert.equal(await root.getAttribute("role"), "group");
        assert.equal(await root.getAttribute("aria-modal"), null);
        assert.ok(await root.getAttribute("aria-labelledby"), "named by its title");
        assert.equal(await page.locator('[role="dialog"], [role="alertdialog"]').count(), 0);
        assert.equal(await page.evaluate(() => B.isOverlayOpen()), false);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });

    test(`${theme}: F6 lands on the newest toast's action, as "Press F6 to reach it" says; with no action it lands on the region`, async () => {
      const { page } = await fixturePage(browser, TOASTS, { theme });
      try {
        await page.locator("#page").focus();
        await page.evaluate(() => window.t.show({ title: "No action" }));
        await page.locator(".basalt-toast").first().waitFor();
        await page.keyboard.press("F6");
        assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-toast-viewport")), true, "no action: the region, as before");
        await page.keyboard.press("Shift+Tab");
        await page.locator("#page").focus();
        await page.evaluate(() => window.t.show({ title: "File deleted", action: { label: "Undo", onClick: () => {} } }));
        await page.evaluate(() => window.t.show({ title: "Copied", home: "page" }));
        await page.locator(".basalt-toast-action").waitFor();
        await page.keyboard.press("F6");
        assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Undo", "the newest toast that has an action");
      } finally { await page.close(); }
    });
  }
});

// ---- 2: Composer ----

const COMPOSER = render(`<main style={{ padding: 16, width: 600 }}><button id="away">Away</button><B.Composer id="c1" label="Message the team" status="Ana is typing" onSend={() => {}} /><B.Composer id="c2" label="Reply" statusLive="always" status="Saved" onSend={() => {}} /></main>`);

describe("2: the composer's status is spoken while the reader is writing", () => {
  for (const theme of THEMES) {
    test(`${theme}: aria-live is off at rest, polite while focus is in the composer (field or Send), off again after; "always" is always polite`, async () => {
      const { page } = await fixturePage(browser, COMPOSER, { theme });
      try {
        const live = (id) => page.locator(`#${id} .basalt-composer-status`).getAttribute("aria-live");
        assert.equal(await live("c1"), "off");
        await page.locator("#c1 textarea").focus();
        assert.equal(await live("c1"), "polite");
        await page.keyboard.press("Tab");
        assert.equal(await live("c1"), "polite", "still inside on the way to Send");
        await page.locator("#away").focus();
        assert.equal(await live("c1"), "off");
        assert.equal(await live("c2"), "polite");
      } finally { await page.close(); }
    });
  }
});

// ---- 3: DotSep, DotLine and the words read in place ----

const LINES = render(`<main style={{ padding: 16 }}>
  <p id="text"><B.DotLine>{"In design"}{"Pilot planned"}</B.DotLine></p>
  <p id="wrap" style={{ width: 0 }}><B.DotLine>{"Alpha beta"}{"Delta"}</B.DotLine></p>
  <p id="badge" style={{ width: 0 }}><B.DotLine><B.Badge>Alpha beta</B.Badge>{"Delta"}</B.DotLine></p>
  <B.AppHeader id="head" title="Orders" facts={[<B.Badge key="b" status="success">Shipped</B.Badge>, "A long fact that does not fit beside the others at all", "Three"]} />
  <B.StreamQuote id="quote" cite="Dana asked" time="4:02 PM">How long is the queue?</B.StreamQuote>
  <B.NotificationList id="list" entries={[{ id: "g", title: "Deploy finished", time: "now", entries: [{ id: "a", title: "One", time: "now" }, { id: "b", title: "Two", time: "now" }, { id: "c", title: "Three", time: "now" }] }]} />
</main>`);

/** The first line's top of the element, and the top of the line that holds the separator's dot (the separator's first box). */
const lines = (page, selector) => page.evaluate((selector) => {
  const line = document.querySelector(selector);
  // Narrowed to the first fact plus a few pixels: the dot cannot fit beside it.
  const first = line.querySelector(".basalt-dot-line").firstChild;
  const range = document.createRange();
  range.selectNodeContents(first);
  const firstRects = [...(first.nodeType === 3 ? range.getClientRects() : first.getClientRects())];
  line.style.width = `${Math.ceil(Math.max(...firstRects.map((r) => r.width))) + 4}px`;
  const rects = first.nodeType === 3 ? [...range.getClientRects()] : [...first.getClientRects()];
  const sep = line.querySelector(".basalt-dot-sep");
  const next = line.querySelector(".basalt-dot-line").lastChild;
  range.selectNodeContents(next);
  return { factEnd: Math.round(rects.at(-1).top), dot: Math.round(sep.getClientRects()[0].top), next: Math.round([...(next.nodeType === 3 ? range.getClientRects() : next.getClientRects())][0].top) };
}, selector);

describe("3: dot-separated text reads as words, and the dot keeps to the fact before it", () => {
  for (const theme of THEMES) {
    test(`${theme}: innerText and the name are "In design, Pilot planned" (no space before the comma)`, async () => {
      const { page } = await fixturePage(browser, LINES, { theme });
      try {
        assert.equal(await page.locator("#text").evaluate((el) => el.innerText), "In design, Pilot planned");
        assert.equal(await nameOf(page, "#text"), "In design, Pilot planned");
        assert.equal(await page.locator("#text").ariaSnapshot(), "- paragraph: In design, Pilot planned");
        assert.match(await page.locator("#quote figcaption").evaluate((el) => el.innerText), /^Dana asked, 4:02 ?\s?PM$/);
        assert.match(await page.locator("#list .basalt-notification-title").first().evaluate((el) => el.innerText), /^Deploy finished, 3 times$/);
      } finally { await page.close(); }
    });

    test(`${theme}: a wrapped line starts with the next fact, never with "·": after words and after an inline-block badge`, async () => {
      const { page } = await fixturePage(browser, LINES, { theme, viewport: { width: 390, height: 900 } });
      try {
        for (const selector of ["#wrap", "#badge"]) {
          const { factEnd, dot, next } = await lines(page, selector);
          assert.ok(Math.abs(dot - factEnd) <= 4, `${selector}: the dot is on the fact's line (${dot} vs ${factEnd})`);
          assert.ok(next > factEnd, `${selector}: the next fact wrapped (${next} vs ${factEnd})`);
        }
      } finally { await page.close(); }
    });

    test(`${theme}: AppHeader's facts stay one line cut with an ellipsis at 390 (the kept fact does not wrap inside)`, async () => {
      const { page } = await fixturePage(browser, LINES, { theme, viewport: { width: 390, height: 900 } });
      try {
        const box = await page.locator("#head .basalt-app-facts").evaluate((el) => ({ height: el.getBoundingClientRect().height, line: parseFloat(getComputedStyle(el).lineHeight), keeps: el.querySelectorAll(".basalt-dot-keep").length }));
        assert.equal(box.keeps, 1, "the badge and its dot are held together");
        assert.ok(box.height <= box.line + 0.5, `one line: ${JSON.stringify(box)}`);
      } finally { await page.close(); }
    });
  }
});

// ---- 4: Focus ----

const ROUTES = render(`<App />`, `
window.scrolls = 0; const scrollTo = window.scrollTo.bind(window); window.scrollTo = (...a) => { window.scrolls++; scrollTo(...a); };
function App() {
  const [route, setRoute] = React.useState("home");
  const [open, setOpen] = React.useState(false);
  const [late, setLate] = React.useState(false);
  const [name, setName] = React.useState("Loading");
  const [scroll, setScroll] = React.useState(true);
  const title = React.useRef(null);
  const lateTitle = React.useRef(null);
  window.go = (next, options = {}) => { setScroll(options.scroll ?? true); setRoute(next); };
  window.arrive = () => setLate(true);
  window.rename = setName;
  B.useRouteFocus({ key: route, title: name, target: route === "late" ? lateTitle : title, scroll });
  return (
    <>
      <B.AppHeader title={"Page " + route} titleRef={title} actions={<button id="opener" onClick={() => setOpen(true)}>Find</button>} />
      {route === "late" && late ? <h2 tabIndex={-1} ref={lateTitle} id="late">Late</h2> : null}
      <B.Dialog open={open} onOpenChange={setOpen}>
        <B.DialogContent finalFocus={() => document.getElementById("opener")}>
          <B.DialogTitle>Find</B.DialogTitle>
          <button id="choose" onClick={() => { setRoute("chosen"); setOpen(false); }}>Orders</button>
        </B.DialogContent>
      </B.Dialog>
    </>
  );
}`);

describe("4a: route focus", () => {
  for (const theme of THEMES) {
    test(`${theme}: AppHeader's h1 takes tabIndex -1 and titleRef`, async () => {
      const { page } = await fixturePage(browser, ROUTES, { theme });
      try {
        assert.equal(await page.locator("h1.basalt-app-title").getAttribute("tabindex"), "-1");
        await page.evaluate(() => window.go("two"));
        await page.waitForFunction(() => document.activeElement?.matches("h1.basalt-app-title"));
      } finally { await page.close(); }
    });

    test(`${theme}: a page chosen in a dialog keeps focus on its title; the dialog's returned focus does not take it`, async () => {
      const { page } = await fixturePage(browser, ROUTES, { theme });
      try {
        await page.locator("#opener").click();
        await page.locator("#choose").waitFor();
        await page.keyboard.press("Tab");
        await page.locator("#choose").focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
        // A few frames for any returned focus to land.
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)))));
        assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Page chosen");
      } finally { await page.close(); }
    });

    test(`${theme}: scroll={false} keeps the place; a late title is landed on when it arrives; the title is read when it is given`, async () => {
      const { page } = await fixturePage(browser, ROUTES, { theme });
      try {
        await page.evaluate(() => window.go("kept", { scroll: false }));
        await page.waitForFunction(() => document.activeElement?.matches("h1.basalt-app-title"));
        assert.equal(await page.evaluate(() => window.scrolls), 0);
        await page.evaluate(() => window.go("late"));
        await page.waitForTimeout(200);
        assert.notEqual(await page.evaluate(() => document.activeElement?.id), "late");
        await page.evaluate(() => window.arrive());
        await page.waitForFunction(() => document.activeElement?.id === "late");
        await page.evaluate(() => window.rename("Orders | Shop"));
        await page.waitForFunction(() => document.title === "Orders | Shop");
      } finally { await page.close(); }
    });

    test(`${theme}: a late title is not landed on once the reader has pressed a key`, async () => {
      const { page } = await fixturePage(browser, ROUTES, { theme });
      try {
        await page.evaluate(() => window.go("late"));
        await page.locator("#opener").focus();
        await page.keyboard.press("ArrowDown");
        await page.evaluate(() => window.arrive());
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.activeElement?.id), "opener");
      } finally { await page.close(); }
    });
  }
});

const SKIPS = render(`<><B.SkipLink id="by-id" target="main" onSkip={(el) => { window.skipped = el?.id ?? null; }} /><B.SkipLink id="by-fn" target={() => document.querySelector(".waiting")}>Skip to the first waiting row</B.SkipLink><main id="main"><p>Intro</p><div className="waiting" id="row">First waiting</div></main></>`);

describe("4b: SkipLink handled in place", () => {
  for (const theme of THEMES) {
    test(`${theme}: onSkip prevents the fragment navigation and focuses the target; a function target is found when pressed`, async () => {
      const { page } = await fixturePage(browser, SKIPS, { theme });
      try {
        const before = await page.evaluate(() => [location.hash, history.length]);
        await page.locator("#by-id").focus();
        await page.keyboard.press("Enter");
        assert.deepEqual(await page.evaluate(() => [location.hash, history.length]), before, "no history entry");
        assert.equal(await page.evaluate(() => [window.skipped, document.activeElement?.id].join()), "main,main");
        await page.locator("#by-fn").focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.evaluate(() => document.activeElement?.id), "row");
        assert.equal(await page.locator("#row").getAttribute("tabindex"), "-1", "made able to take focus");
        assert.deepEqual(await page.evaluate(() => [location.hash, history.length]), before);
      } finally { await page.close(); }
    });
  }
});

const BELL = render(`<main style={{ padding: 16 }}><B.NotificationCenter entries={[{ id: "a", title: "Build passed", time: "now" }]} initialFocus={() => document.querySelector(".basalt-notifications .basalt-notification")} /></main>`);

describe("4c: NotificationCenter initialFocus", () => {
  for (const theme of THEMES) {
    test(`${theme}: with nothing unread it opens on the entry it was given, not on the disabled "Mark all as read"`, async () => {
      const { page } = await fixturePage(browser, BELL, { theme });
      try {
        await page.locator(".basalt-notifications-trigger").click();
        await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-notification"));
      } finally { await page.close(); }
    });
  }
});

const NET = render(`<App />`, `function App() {
  const title = React.useRef(null);
  const [rows, setRows] = React.useState(["a", "b"]);
  B.useFocusNet(title);
  return <><h1 tabIndex={-1} ref={title} id="title">Queue</h1>{rows.map((r) => <button key={r} id={"decide-" + r} onClick={() => setRows((all) => all.filter((x) => x !== r))}>Decide {r}</button>)}<p id="blank" style={{ height: 200 }}>Background</p></>;
}`);

describe("4d: useFocusNet", () => {
  for (const theme of THEMES) {
    test(`${theme}: a focused control removed by the app lands focus on the title; a click on the background does not`, async () => {
      const { page } = await fixturePage(browser, NET, { theme });
      try {
        await page.locator("#decide-a").focus();
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => document.activeElement?.id === "title");
        await page.locator("#decide-b").focus();
        await page.locator("#blank").click();
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => document.activeElement === document.body), true, "the reader's own click is left alone");
      } finally { await page.close(); }
    });
  }
});

// ---- 5: Keys ----

const KEYS = render(`<App />`, `function App() {
  const [open, setOpen] = React.useState(false);
  B.useShortcuts([{ key: "j", description: "Next", run: () => { window.ran = (window.ran ?? 0) + 1; } }]);
  return <><button id="page">Page</button><B.Dialog open={open} onOpenChange={setOpen}><B.DialogTrigger id="open">Open</B.DialogTrigger><B.DialogContent><B.DialogTitle>Help</B.DialogTitle><button id="inside">Inside</button></B.DialogContent></B.Dialog>
    <B.SearchField label="Search this room" value={window.q ?? ""} onValueChange={(v) => { window.q = v; }} onOpen={(v) => { window.opened = [...(window.opened ?? []), v]; }} onSubmit={() => { window.submitted = true; }} /></>;
}`);

describe("5: keys", () => {
  for (const theme of THEMES) {
    test(`${theme}: a page binding runs from the page and not from inside an open dialog`, async () => {
      const { page } = await fixturePage(browser, KEYS, { theme });
      try {
        await page.locator("#page").focus();
        await page.keyboard.press("j");
        assert.equal(await page.evaluate(() => window.ran), 1);
        await page.locator("#open").click();
        await page.locator("#inside").focus();
        await page.keyboard.press("j");
        assert.equal(await page.evaluate(() => window.ran), 1, "not from inside the dialog");
        assert.equal(await page.evaluate(() => B.isOverlayOpen()), true);
      } finally { await page.close(); }
    });

    test(`${theme}: isHardwareKey and useShortcutsVisible are exported; SearchField says Enter, not focus, as onOpen`, async () => {
      const { page } = await fixturePage(browser, KEYS, { theme });
      try {
        assert.deepEqual(await page.evaluate(() => [typeof B.isHardwareKey, typeof B.useShortcutsVisible, B.isHardwareKey({ key: "Tab", metaKey: false, ctrlKey: false, altKey: false }), B.isHardwareKey({ key: "a", metaKey: false, ctrlKey: false, altKey: false })]), ["function", "function", true, false]);
        await page.locator('input[type="search"]').focus();
        assert.equal(await page.evaluate(() => window.opened), undefined, "focus opens nothing");
        await page.keyboard.press("Enter");
        assert.deepEqual(await page.evaluate(() => [window.opened, window.submitted]), [[""], true]);
      } finally { await page.close(); }
    });
  }
});
