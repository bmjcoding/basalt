// Micro-details m7 (navigation, scroll and history; DECISIONS 405 and 409, micro-details/m7/decision.md): useRouteFocus's `navigation` (a pop never scrolls
// and keeps focus the app gave back; a hash target beats the top; the top is instant), useScrollRestore (entry plus scroller, the first position, `ready`,
// a scroller that is not there yet, what ends a pending restore), Pagination's onNavigate and arrow ids, ListBand's links (both pagers, onNavigate, the
// foot's fragment to the band's arrow across a real document load at 390), Tabs' development warning, Drawer's finalFocus, and the app shell's block-axis
// overscroll. Each fixture is served from http://basalt.test so history, fragments and document loads are real. Synthetic data in two unlike domains
// (a tide gauge and a seed library).
// Tests are paused (DECISIONS 359): written with the batch, not run.
//
// Per engine (only Chromium in this harness), these must show what the decision could not: a focusable fragment target takes focus on load (the list's
// foot across a document load, below); where an engine only moves the Tab starting point to the arrow, the next Tab must still continue from the band.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";
import * as React from "react";
import { renderToString } from "react-dom/server";

import { launch, pkg } from "./support.mjs";

const ORIGIN = "http://basalt.test";
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const PRELUDE = `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js"; `;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

/** Bundle a fixture (TSX) against dist with React, in production or development (the warnings are development only). */
async function bundle(body, mode = "production") {
  const result = await esbuild.build({
    stdin: { contents: `${PRELUDE}${body}`, resolveDir: pkg, loader: "tsx" },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": JSON.stringify(mode) },
  });
  return result.outputFiles[0].text.replaceAll("</script", "<\\/script");
}

/** A page served at `ORIGIN + at` (every path of the origin gets it), with the stylesheet and the fixture; console warnings are collected. */
async function served(body, { at = "/", mode = "production", width = 1440, height = 900, touch = false, head = "" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const warnings = [];
  const errors = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  const script = await bundle(body, mode);
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="light"><head><meta charset="utf-8"><style>${css()}</style>${head}</head><body><div id="root"></div><script>${script}</script></body></html>` }));
  await page.goto(`${ORIGIN}${at}`);
  await frames(page);
  return { page, context, warnings, errors };
}
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => { let left = count; const step = () => (--left ? requestAnimationFrame(step) : resolve()); requestAnimationFrame(step); }), n);
const active = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);

// ---- useRouteFocus

const ROUTE = `
import { onPageChange } from "./dist/page-change.js";
window.__changes = 0;
onPageChange(() => { window.__changes += 1; });
function App() {
  const [state, setState] = React.useState({ key: "tides", navigation: "push", dialog: false, row: false });
  window.go = (key, navigation = "push", extra = {}) => flushSync(() => setState((s) => ({ ...s, key, navigation, dialog: false, ...extra })));
  window.openDialog = () => flushSync(() => setState((s) => ({ ...s, dialog: true })));
  const title = React.useRef(null);
  const row = React.useRef(null);
  // An app that returns focus to the row the reader came from does it in a child's effect, which runs before the shell's.
  React.useEffect(() => { if (state.row) row.current?.focus(); }, [state.key, state.row]);
  B.useRouteFocus({ key: state.key, title: "Gauge " + state.key, target: title, navigation: state.navigation });
  return (
    <>
      <header className="basalt-sticky-bar" style={{ position: "sticky", top: 0, height: 56, background: "black", zIndex: 1 }} />
      <h1 ref={title} tabIndex={-1} id="title">Gauge {state.key}</h1>
      <button id="row" ref={row}>North breakwater</button>
      <div style={{ height: 2400 }} />
      <h2 id="surge">Surge notes</h2>
      <div style={{ height: 2400 }} />
      <B.Dialog open={state.dialog}><B.DialogContent><B.DialogTitle>Rename the gauge</B.DialogTitle><button id="inside">Inside</button></B.DialogContent></B.Dialog>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
`;

describe("useRouteFocus: navigation", () => {
  test("a pop leaves the scroll where it is, sets the title and calls pageChanged()", async () => {
    const { page, context } = await served(ROUTE);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.evaluate(() => window.go("seeds", "pop"));
    await frames(page);
    assert.equal(await page.evaluate(() => window.scrollY), 900);
    assert.equal(await page.evaluate(() => document.title), "Gauge seeds");
    assert.equal(await page.evaluate(() => window.__changes), 1);
    await context.close();
  });

  test("a pop with focus on a page element leaves it there; with focus on body it lands on the title", async () => {
    const { page, context } = await served(ROUTE);
    await page.evaluate(() => window.go("seeds", "pop", { row: true }));
    await frames(page);
    assert.equal(await active(page), "row", "the row the app returned focus to keeps it");
    await page.evaluate(() => { document.activeElement.blur(); window.go("tides", "pop"); });
    await frames(page);
    assert.equal(await active(page), "title", "nothing had focus, so the page names itself");
    await context.close();
  });

  test("a pop while a dialog holding focus is open waits for it and then lands on the title, never on body", async () => {
    const { page, context } = await served(ROUTE);
    await page.evaluate(() => window.openDialog());
    await page.waitForSelector("#inside");
    await page.focus("#inside");
    await page.evaluate(() => window.go("seeds", "pop"));
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await frames(page, 4);
    assert.equal(await active(page), "title");
    await context.close();
  });

  test("a replace with a new key behaves as a push: the top, the title, the page's toasts closed", async () => {
    const { page, context } = await served(ROUTE);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.evaluate(() => window.go("result", "replace"));
    await frames(page);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.equal(await active(page), "title");
    assert.equal(await page.evaluate(() => document.title), "Gauge result");
    assert.equal(await page.evaluate(() => window.__changes), 1, "pageChanged() closes the toasts whose home was the page");
    await context.close();
  });

  test("a push with a rendered hash target lands on it, clear of the bar; a malformed hash goes to the top without throwing", async () => {
    const { page, context, errors } = await served(ROUTE);
    await page.evaluate(() => { history.pushState(null, "", "#surge"); window.go("seeds"); });
    await frames(page);
    const top = await page.evaluate(() => document.getElementById("surge").getBoundingClientRect().top);
    assert.ok(top >= 56 && top <= 56 + 24, `the target is under the bar (${top})`);
    await page.evaluate(() => { window.scrollTo(0, 600); history.pushState(null, "", "#%E0%A4%A"); window.go("tides"); });
    await frames(page);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("a push under a root scroll-behavior: smooth is at the top in the same frame", async () => {
    const { page, context } = await served(ROUTE, { head: "<style>html { scroll-behavior: smooth; }</style>" });
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 1500); document.documentElement.style.scrollBehavior = ""; });
    const y = await page.evaluate(() => { window.go("seeds"); return new Promise((resolve) => requestAnimationFrame(() => resolve(window.scrollY))); });
    assert.equal(y, 0);
    await context.close();
  });

  test("no options behaves as main: a push scrolls to the top and focuses the title", async () => {
    const { page, context } = await served(ROUTE.replace(', navigation: state.navigation', ''));
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.evaluate(() => window.go("seeds"));
    await frames(page);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.equal(await active(page), "title");
    await context.close();
  });
});

// ---- useScrollRestore

// One app with a pane (an element that scrolls on its own) and a router of its own: `go(path, navigation)` pushes, replaces or pops entries, each with its
// own key in history.state, as a router stamps them.
const RESTORE = ({ paneMount = "always", ready = "true", scroller = "pane", extra = "" } = {}) => `
let counter = 0;
const keyOf = () => (history.state && history.state.key) || "boot";
function App() {
  const [at, setAt] = React.useState({ entry: keyOf(), navigation: "push", path: location.pathname });
  const [loading, setLoading] = React.useState(false);
  window.setLoading = (v) => flushSync(() => setLoading(v));
  window.push = (p) => { const key = "k" + ++counter; history.pushState({ key }, "", p); flushSync(() => setAt({ entry: key, navigation: "push", path: p })); };
  window.replace = (p) => { const key = "k" + ++counter; history.replaceState({ key }, "", p); flushSync(() => setAt({ entry: key, navigation: "replace", path: p })); };
  React.useEffect(() => {
    const pop = () => flushSync(() => setAt({ entry: keyOf(), navigation: "pop", path: location.pathname }));
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const pane = React.useRef(null);
  const showPane = ${paneMount === "always" ? "true" : `at.path !== "/b"`};
  ${extra}
  B.useScrollRestore({ entry: at.entry, navigation: at.navigation, scroller: ${scroller === "pane" ? "pane" : scroller}, id: "details", ready: ${ready} });
  B.useScrollRestore({ entry: at.entry, navigation: at.navigation, id: "window" });
  return (
    <div>
      {showPane ? <div id="pane" ref={pane} style={{ height: 200, overflow: "auto" }}><div style={{ height: 5000 }}>Readings for {at.path}</div></div> : null}
      <div style={{ height: 4000 }} />
    </div>
  );
}
history.replaceState({ key: "boot" }, "");
createRoot(document.getElementById("root")).render(<App />);
`;
const paneTop = (page) => page.evaluate(() => document.getElementById("pane")?.scrollTop ?? null);
const scrollPane = (page, top) => page.evaluate((t) => { document.getElementById("pane").scrollTop = t; return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }, top);
const back = async (page) => { await page.evaluate(() => new Promise((resolve) => { window.addEventListener("popstate", () => requestAnimationFrame(() => requestAnimationFrame(resolve)), { once: true }); history.back(); })); };
const forward = async (page) => { await page.evaluate(() => new Promise((resolve) => { window.addEventListener("popstate", () => requestAnimationFrame(() => requestAnimationFrame(resolve)), { once: true }); history.forward(); })); };

describe("useScrollRestore", () => {
  test("two entries of one address keep two positions for one pane (48 and 8)", async () => {
    const { page, context } = await served(RESTORE(), { at: "/a" });
    await page.evaluate(() => window.push("/list"));
    await scrollPane(page, 48);
    await page.evaluate(() => window.push("/list"));
    await scrollPane(page, 8);
    await back(page);
    assert.equal(await paneTop(page), 48);
    await forward(page);
    assert.equal(await paneTop(page), 8);
    await context.close();
  });

  test("two scrollers of one entry are independent; only a pop restores", async () => {
    const { page, context } = await served(RESTORE(), { at: "/a" });
    await scrollPane(page, 120);
    await page.evaluate(() => { window.scrollTo(0, 700); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
    await page.evaluate(() => window.push("/b"));
    await scrollPane(page, 0);
    await page.evaluate(() => { window.scrollTo(0, 0); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
    assert.equal(await paneTop(page), 0, "a push moves nothing");
    await back(page);
    assert.equal(await paneTop(page), 120);
    assert.equal(await page.evaluate(() => window.scrollY), 700);
    await context.close();
  });

  test("a pane that stays mounted: entry A untouched at 0, push B, scroll to 650, Back, and the pane is at 0", async () => {
    const { page, context } = await served(RESTORE(), { at: "/a" });
    await page.evaluate(() => window.push("/b"));
    await scrollPane(page, 650);
    await back(page);
    assert.equal(await paneTop(page), 0);
    await context.close();
  });

  test("ready: false holds the restore, then it applies once; a wheel, a touch, a press or a key while it is held ends it", async () => {
    for (const act of [null, "wheel", "touchstart", "pointerdown", "keydown"]) {
      const { page, context } = await served(RESTORE({ ready: "!loading" }), { at: "/a" });
      await scrollPane(page, 300);
      await page.evaluate(() => window.push("/b"));
      await scrollPane(page, 0);
      await page.evaluate(() => window.setLoading(true));
      await back(page);
      assert.equal(await paneTop(page), 0, "held while loading");
      if (act) await page.evaluate((type) => document.dispatchEvent(type === "keydown" ? new KeyboardEvent("keydown", { key: "j", bubbles: true }) : new Event(type, { bubbles: true })), act);
      await page.evaluate(() => window.setLoading(false));
      await frames(page);
      assert.equal(await paneTop(page), act ? 0 : 300, act ? `${act} ended it` : "applied once ready");
      await context.close();
    }
  });

  test("a bare modifier key does not end a held restore", async () => {
    const { page, context } = await served(RESTORE({ ready: "!loading" }), { at: "/a" });
    await scrollPane(page, 300);
    await page.evaluate(() => window.push("/b"));
    // B stands somewhere else, so a restore that ran and one that did not end in different places.
    await scrollPane(page, 90);
    await page.evaluate(() => window.setLoading(true));
    await back(page);
    assert.equal(await paneTop(page), 90, "held while loading");
    await page.keyboard.press("Shift");
    await page.evaluate(() => window.setLoading(false));
    await frames(page);
    assert.equal(await paneTop(page), 300);
    await context.close();
  });

  test("a newer entry while it is held ends it, and the new page is not moved (the 650 jump)", async () => {
    const { page, context } = await served(RESTORE({ ready: "!loading" }), { at: "/a" });
    await scrollPane(page, 650);
    await page.evaluate(() => window.push("/b"));
    await scrollPane(page, 0);
    await page.evaluate(() => window.setLoading(true));
    await back(page);
    await page.evaluate(() => window.push("/c"));
    await page.evaluate(() => window.setLoading(false));
    await frames(page);
    assert.equal(await paneTop(page), 0);
    await context.close();
  });

  test("unmount ends a held restore: its listeners go, and the pane is not moved when the content arrives", async () => {
    const body = `
let counter = 0;
const keyOf = () => (history.state && history.state.key) || "boot";
window.__wheel = 0;
const add = Document.prototype.addEventListener, remove = Document.prototype.removeEventListener;
Document.prototype.addEventListener = function (type, ...rest) { if (type === "wheel") window.__wheel += 1; return add.call(this, type, ...rest); };
Document.prototype.removeEventListener = function (type, ...rest) { if (type === "wheel") window.__wheel -= 1; return remove.call(this, type, ...rest); };
function Keeper({ at, pane, loading }) {
  B.useScrollRestore({ entry: at.entry, navigation: at.navigation, scroller: pane, id: "details", ready: !loading });
  return null;
}
function App() {
  const [at, setAt] = React.useState({ entry: keyOf(), navigation: "push" });
  const [loading, setLoading] = React.useState(false);
  const [kept, setKept] = React.useState(true);
  window.setLoading = (v) => flushSync(() => setLoading(v));
  window.unmount = () => flushSync(() => setKept(false));
  window.push = (p) => { const key = "k" + ++counter; history.pushState({ key }, "", p); flushSync(() => setAt({ entry: key, navigation: "push" })); };
  React.useEffect(() => { const pop = () => flushSync(() => setAt({ entry: keyOf(), navigation: "pop" })); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  const pane = React.useRef(null);
  return (<div><div id="pane" ref={pane} style={{ height: 200, overflow: "auto" }}><div style={{ height: 5000 }}>Lots</div></div>{kept ? <Keeper at={at} pane={pane} loading={loading} /> : null}</div>);
}
history.replaceState({ key: "boot" }, "");
createRoot(document.getElementById("root")).render(<App />);
`;
    const { page, context } = await served(body, { at: "/a" });
    await scrollPane(page, 300);
    await page.evaluate(() => window.push("/b"));
    await scrollPane(page, 90);
    await page.evaluate(() => window.setLoading(true));
    await back(page);
    assert.equal(await page.evaluate(() => window.__wheel), 1, "a held restore listens for the reader");
    await page.evaluate(() => window.unmount());
    assert.equal(await page.evaluate(() => window.__wheel), 0, "unmount took its listeners away");
    await page.evaluate(() => window.setLoading(false));
    await frames(page);
    assert.equal(await paneTop(page), 90, "nothing restored after unmount");
    await context.close();
  });

  test("a replace carries the position to the new key", async () => {
    const { page, context } = await served(RESTORE(), { at: "/a" });
    await scrollPane(page, 240);
    await page.evaluate(() => window.replace("/a?kind=bean"));
    await page.evaluate(() => window.push("/b"));
    await scrollPane(page, 0);
    await back(page);
    assert.equal(await paneTop(page), 240, "the replaced entry kept the reader's place");
    await context.close();
  });

  test("nothing is in sessionStorage or localStorage, and importing the module creates nothing", async () => {
    const { page, context } = await served(RESTORE(), { at: "/a" });
    await scrollPane(page, 100);
    await page.evaluate(() => window.push("/b"));
    assert.deepEqual(await page.evaluate(() => [sessionStorage.length, localStorage.length]), [0, 0]);
    assert.equal(await page.evaluate(() => history.scrollRestoration), "auto", "it never sets scrollRestoration");
    await context.close();
    const source = fs.readFileSync(path.join(pkg, "dist", "scroll-restore.js"), "utf8");
    assert.doesNotMatch(source, /sessionStorage|localStorage|scrollRestoration\s*=/);
    // A fresh import with the collection constructors counted: loading the module makes no Set, Map or WeakMap and adds no listener.
    const made = { count: 0 };
    const originals = { Set: globalThis.Set, Map: globalThis.Map, WeakMap: globalThis.WeakMap };
    for (const [name, Original] of Object.entries(originals)) globalThis[name] = class extends Original { constructor(...args) { super(...args); made.count += 1; } };
    try {
      const mod = await import(`${pathToFileURL(path.join(pkg, "dist", "scroll-restore.js")).href}?fresh=${Date.now()}`);
      assert.equal(typeof mod.useScrollRestore, "function");
    } finally {
      Object.assign(globalThis, originals);
    }
    assert.equal(made.count, 0, "importing the module made a collection");
    assert.doesNotMatch(source.replace(/function[\s\S]*$/, ""), /new (Set|Map|WeakMap)\(|addEventListener/, "nothing is made before the module's first function");
  });

  // A PaneLayout's pane: `usePaneScroller()` is null on the first commit of every mount and while the pane follows the page under 920.
  const PANE = (width) => `
let counter = 0;
const keyOf = () => (history.state && history.state.key) || "boot";
function Details({ entry, navigation }) {
  B.useScrollRestore({ entry, navigation, scroller: B.usePaneScroller(), id: "details" });
  return <div style={{ height: 4000 }}>Seed lot details</div>;
}
function App() {
  const [at, setAt] = React.useState({ entry: keyOf(), navigation: "push", path: location.pathname });
  window.push = (p) => { const key = "k" + ++counter; history.pushState({ key }, "", p); flushSync(() => setAt({ entry: key, navigation: "push", path: p })); };
  React.useEffect(() => { const pop = () => flushSync(() => setAt({ entry: keyOf(), navigation: "pop", path: location.pathname })); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  if (at.path === "/b") return <div style={{ height: 3000 }}>Another page</div>;
  return <B.PaneLayout paneLabel="Details" paneProps={{ id: "pane" }} pane={<Details entry={at.entry} navigation={at.navigation} />}><div style={{ height: 3000 }}>Lots</div></B.PaneLayout>;
}
history.replaceState({ key: "boot" }, "");
createRoot(document.getElementById("root")).render(<App />);
window.__ignore = ${width};
`;

  test("scroller: usePaneScroller() in a PaneLayout that mounts again on Back restores the pane on the commit its scroller arrives; window.scrollY is unchanged throughout", async () => {
    const { page, context } = await served(PANE(1440), { at: "/a" });
    await page.evaluate(() => window.scrollTo(0, 40));
    await scrollPane(page, 330);
    await page.evaluate(() => window.push("/b"));
    await page.evaluate(() => window.scrollTo(0, 40));
    await page.evaluate(() => { window.__ys = []; window.addEventListener("scroll", () => window.__ys.push(window.scrollY)); });
    await back(page);
    assert.equal(await paneTop(page), 330);
    assert.deepEqual(await page.evaluate(() => window.__ys.filter((y) => y !== 40)), [], "the window was never scrolled by the hook");
    await context.close();
  });

  test("under 920px nothing is recorded under the pane's id and the window is never scrolled; an empty ref never falls to the window", async () => {
    const { page, context } = await served(PANE(800), { at: "/a", width: 800 });
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.evaluate(() => window.push("/b"));
    await page.evaluate(() => window.scrollTo(0, 0));
    // From here, every scroll a script asks of the window is counted: the pane's hook (its scroller null under 920) must ask none.
    await page.evaluate(() => {
      window.__scripted = 0;
      for (const name of ["scrollTo", "scroll", "scrollBy"]) { const original = window[name]; window[name] = function (...args) { window.__scripted += 1; return original.apply(this, args); }; }
      const into = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (...args) { window.__scripted += 1; return into.apply(this, args); };
    });
    await back(page);
    assert.equal(await page.evaluate(() => window.__scripted), 0, "the window was never scrolled by a script");
    assert.equal(await page.evaluate(() => window.scrollY), 0, "and nothing was recorded under the pane's id for the window");
    await context.close();
    const empty = await served(RESTORE({ scroller: "React.useRef(null)" }), { at: "/a" });
    await empty.page.evaluate(() => window.scrollTo(0, 300));
    await empty.page.evaluate(() => window.push("/b"));
    await empty.page.evaluate(() => window.scrollTo(0, 0));
    await back(empty.page);
    // The window's own hook restores the window (300); the empty ref, given id "details", never wrote or restored anything there.
    assert.equal(await empty.page.evaluate(() => window.scrollY), 300);
    await empty.context.close();
  });

  test("null with no id warns once and \"window\" with none does not (development)", async () => {
    const body = (scroller) => `function App() { B.useScrollRestore({ entry: "e", navigation: "push", scroller: ${scroller} }); B.useScrollRestore({ entry: "e", navigation: "push", scroller: ${scroller} }); return null; } createRoot(document.getElementById("root")).render(<App />);`;
    const nulled = await served(body("null"), { mode: "development" });
    assert.equal(nulled.warnings.filter((w) => w.includes("Basalt useScrollRestore: give `id` with `scroller`")).length, 1);
    await nulled.context.close();
    const windowed = await served(body('"window"'), { mode: "development" });
    assert.equal(windowed.warnings.filter((w) => w.includes("Basalt useScrollRestore")).length, 0);
    await windowed.context.close();
  });
});

// ---- Pagination

const PAGER = (props = "") => `
window.__navigated = []; window.__changed = [];
function App() {
  const [page, setPage] = React.useState(3);
  window.setPage = (p) => flushSync(() => setPage(p));
  return <B.Pagination ${props} page={page} pageCount={9} hrefForPage={(p) => "/tides?page=" + p} onPageChange={(p) => window.__changed.push(p)} />;
}
createRoot(document.getElementById("root")).render(<App />);
`;

describe("Pagination: onNavigate and the arrows' ids", () => {
  test("with hrefForPage alone a plain click is not prevented", async () => {
    const { page, context } = await served(PAGER());
    await page.evaluate(() => window.addEventListener("click", (e) => { window.__prevented = e.defaultPrevented; e.preventDefault(); }));
    await page.click('[aria-label="Page 4"]');
    assert.equal(await page.evaluate(() => window.__prevented), false);
    assert.deepEqual(await page.evaluate(() => window.__changed), [], "onPageChange is not called in the link form");
    await context.close();
  });

  test("with onNavigate a plain click and Enter are prevented and call it with the href and the page; each modifier and a middle click are not", async () => {
    const { page, context } = await served(PAGER(`onNavigate={(href, p) => window.__navigated.push([href, p])}`));
    await page.evaluate(() => window.addEventListener("click", (e) => { window.__prevented = e.defaultPrevented; e.preventDefault(); }));
    await page.click('[aria-label="Page 4"]');
    assert.equal(await page.evaluate(() => window.__prevented), true);
    await page.focus('[aria-label="Next page"]');
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => window.__navigated), [["/tides?page=4", 4], ["/tides?page=4", 4]]);
    for (const modifiers of [["Shift"], ["Alt"], ["Control"], ["Meta"]]) {
      await page.click('[aria-label="Page 5"]', { modifiers });
      assert.equal(await page.evaluate(() => window.__prevented), false, `${modifiers[0]} stays the browser's`);
    }
    await page.evaluate(() => document.querySelector('[aria-label="Page 5"]').dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 1 })));
    assert.equal(await page.evaluate(() => window.__prevented), false, "a middle click stays the browser's");
    assert.equal(await page.evaluate(() => window.__navigated.length), 2);
    assert.deepEqual(await page.evaluate(() => window.__changed), []);
    await context.close();
  });

  test("an unsafe href calls nothing and logs", async () => {
    const body = PAGER(`onNavigate={(href, p) => window.__navigated.push([href, p])}`).replace(`(p) => "/tides?page=" + p`, `(p) => "javascript:alert(" + p + ")"`);
    const { page, context, warnings } = await served(body);
    await page.click('[aria-label="Page 4"]');
    assert.deepEqual(await page.evaluate(() => window.__navigated), []);
    assert.ok(warnings.some((w) => w.includes("Basalt: Pagination will not navigate to a link that is not relative, http, https, mailto or tel")));
    await context.close();
  });

  test("focus moves to the current page's link after a number press; a number press nobody answers, then an arrow press, leaves focus on the arrow", async () => {
    const { page, context } = await served(PAGER(`onNavigate={(href, p) => { window.__navigated.push(p); if (!window.__ignore) window.setPage(p); }}`));
    await page.click('[aria-label="Page 4"]');
    await frames(page);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-current")), "page");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Page 4");
    await page.evaluate(() => { window.__ignore = true; });
    await page.click('[aria-label="Page 5"]');
    await page.evaluate(() => { window.__ignore = false; });
    await page.focus('[aria-label="Next page"]');
    await page.keyboard.press("Enter");
    await frames(page);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Next page");
    await context.close();
  });

  test("with an id, Previous and Next carry id-previous and id-next in both forms and at both ends; without one they carry none", async () => {
    for (const form of ["link", "button"]) {
      for (const at of [1, 5, 9]) {
        const body = `createRoot(document.getElementById("root")).render(<><B.Pagination id="gauge" page={${at}} pageCount={9} ${form === "link" ? `hrefForPage={(p) => "?page=" + p}` : "onPageChange={() => {}}"} /><B.Pagination page={${at}} pageCount={9} ${form === "link" ? `hrefForPage={(p) => "?page=" + p}` : "onPageChange={() => {}}"} /></>);`;
        const { page, context } = await served(body);
        const ids = await page.evaluate(() => [...document.querySelectorAll(".basalt-pagination")].map((nav) => [nav.id, nav.querySelector('[aria-label="Previous page"]').id, nav.querySelector('[aria-label="Next page"]').id]));
        assert.deepEqual(ids, [["gauge", "gauge-previous", "gauge-next"], ["", "", ""]], `${form} at page ${at}`);
        await context.close();
      }
    }
  });
});

// ---- ListBand

const BAND = ({ props = "", width = 1440 } = {}) => `
window.__navigated = []; window.__sizes = [];
const rows = (page, size) => Array.from({ length: size }, (_, i) => <li key={i} style={{ height: 40 }}>Lot {(page - 1) * size + i + 1}</li>);
function App() {
  const [page, setPage] = React.useState(2);
  const [size, setSize] = React.useState(25);
  window.setPage = (p) => flushSync(() => setPage(p));
  return (
    <>
      <header className="basalt-sticky-bar" style={{ position: "sticky", top: 0, height: 56, background: "black", zIndex: 2 }} />
      <div style={{ height: 400 }} />
      <B.ListBand ${props} total={214} page={page} pageSize={size} noun="Lots"
        onPageSizeChange={(s, p) => { window.__sizes.push([s, p]); setSize(s); setPage(p); }}>
        <ul id="rows">{rows(page, size)}</ul>
      </B.ListBand>
      <div style={{ height: 600 }} />
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
window.__width = ${width};
`;

describe("ListBand: pages as links", () => {
  test("hrefForPage reaches both pagers; with it alone the links are followed", async () => {
    const { page, context } = await served(BAND({ props: `id="lots" hrefForPage={(p) => "/seeds?page=" + p}` }), { width: 390, height: 844, touch: true });
    const hrefs = await page.evaluate(() => [...document.querySelectorAll(".basalt-list-band .basalt-page-link[href], .basalt-list-band-foot .basalt-page-link[href]")].map((a) => a.getAttribute("href")));
    assert.ok(hrefs.includes("/seeds?page=3"), "the band's own Next");
    assert.ok(hrefs.includes("/seeds?page=3#lots-pager-next") && hrefs.includes("/seeds?page=1#lots-pager-previous"), "the foot's links name the band's arrows");
    await page.evaluate(() => window.addEventListener("click", (e) => { window.__prevented = e.defaultPrevented; e.preventDefault(); }));
    await page.click(".basalt-list-band-foot [aria-label='Next page']");
    assert.equal(await page.evaluate(() => window.__prevented), false);
    await context.close();
  });

  test("an href with its own fragment is left alone; with onNavigate no fragment is added; without an id the warning fires once", async () => {
    const own = await served(BAND({ props: `id="lots" hrefForPage={(p) => "/seeds?page=" + p + "#top"}` }), { width: 390, height: 844, touch: true });
    assert.deepEqual(await own.page.evaluate(() => [...document.querySelectorAll(".basalt-list-band-foot .basalt-page-link[href]")].map((a) => a.getAttribute("href"))), ["/seeds?page=1#top", "/seeds?page=3#top"]);
    await own.context.close();
    const routed = await served(BAND({ props: `id="lots" hrefForPage={(p) => "/seeds?page=" + p} onNavigate={(href, p) => { window.__navigated.push(href); window.setPage(p); }}` }), { width: 390, height: 844, touch: true });
    assert.deepEqual(await routed.page.evaluate(() => [...document.querySelectorAll(".basalt-list-band-foot .basalt-page-link[href]")].map((a) => a.getAttribute("href"))), ["/seeds?page=1", "/seeds?page=3"]);
    await routed.context.close();
    const bare = await served(`${BAND({ props: `hrefForPage={(p) => "/seeds?page=" + p}` })}`, { mode: "development", width: 390, height: 844, touch: true });
    assert.equal(bare.warnings.filter((w) => w.includes("Basalt ListBand: give the band an `id` with `hrefForPage`")).length, 1);
    await bare.context.close();
  });

  test("with onNavigate, a stuck band returns to rest when the page arrives, and a foot press moves focus to the band's arrow of the same name (a link)", async () => {
    const wide = await served(BAND({ props: `id="lots" hrefForPage={(p) => "/seeds?page=" + p} onNavigate={(href, p) => { window.__navigated.push([href, p]); window.setPage(p); }}` }));
    await wide.page.evaluate(() => window.scrollTo(0, 1200));
    await frames(wide.page);
    await wide.page.click(".basalt-list-band [aria-label='Next page']");
    await frames(wide.page, 3);
    const rest = await wide.page.evaluate(() => document.querySelector(".basalt-list-band").getBoundingClientRect().top);
    assert.ok(Math.abs(rest - 56) <= 1, `the band rests under the bar (${rest})`);
    assert.deepEqual(await wide.page.evaluate(() => window.__navigated), [["/seeds?page=3", 3]]);
    await wide.context.close();
    const narrow = await served(BAND({ props: `id="lots" hrefForPage={(p) => "/seeds?page=" + p} onNavigate={(href, p) => window.setPage(p)}` }), { width: 390, height: 844, touch: true });
    await narrow.page.focus(".basalt-list-band-foot [aria-label='Next page']");
    await narrow.page.keyboard.press("Enter");
    await frames(narrow.page, 3);
    assert.equal(await narrow.page.evaluate(() => document.activeElement.id), "lots-pager-next");
    assert.equal(await narrow.page.evaluate(() => document.activeElement.tagName), "A");
    await narrow.context.close();
  });

  test("onPageSizeChange gets the size and the page of the first row", async () => {
    const { page, context } = await served(BAND({ props: `id="lots" hrefForPage={(p) => "/seeds?page=" + p}` }));
    await page.click(".basalt-list-band-size [role='combobox'], .basalt-list-band-size button");
    await page.getByRole("option", { name: "10" }).click();
    assert.deepEqual(await page.evaluate(() => window.__sizes), [[10, 3]], "page 2 at 25 (row 26) is page 3 at 10");
    await context.close();
  });

  test("the band's geometry is the same in the link and the button forms, at 1440 and 390, on a fine and a coarse pointer", async () => {
    const measure = async (props, options) => {
      const { page, context } = await served(BAND({ props }), options);
      const box = await page.evaluate(() => {
        const r = (el) => { const b = el.getBoundingClientRect(); return [Math.round(b.top * 100) / 100, Math.round(b.height * 100) / 100]; };
        const band = document.querySelector(".basalt-list-band");
        return { band: r(band), row: r(band.querySelector(".basalt-list-band-row")), size: r(band.querySelector(".basalt-list-band-size")), foot: r(document.querySelector(".basalt-list-band-foot")) };
      });
      await context.close();
      return box;
    };
    for (const options of [{}, { width: 390, height: 844 }, { width: 390, height: 844, touch: true }, { touch: true }]) {
      const links = await measure(`id="lots" hrefForPage={(p) => "?page=" + p}`, options);
      const buttons = await measure(`id="lots" onPageChange={(p) => window.setPage(p)}`, options);
      assert.deepEqual(links, buttons, JSON.stringify(options));
    }
  });
});

// Two server-rendered documents of one list, no client router: the foot's followed Next opens the next document at the band with its Next focused.
describe("ListBand: the foot's followed links across a real document load at 390", () => {
  let B;
  before(async () => { B = await import(pathToFileURL(path.join(pkg, "dist", "index.js"))); });
  const doc = (page, pages) => {
    const rows = Array.from({ length: 25 }, (_, i) => React.createElement("li", { key: i, style: { height: 40 } }, `Reading ${(page - 1) * 25 + i + 1}`));
    const band = React.createElement(B.ListBand, { id: "gauge", total: pages * 25, page, pageSize: 25, noun: "Readings", hrefForPage: (p) => `/readings?page=${p}` }, React.createElement("ul", { id: "rows" }, rows));
    return `<!doctype html><html data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css()}</style></head><body>`
      + `<header class="basalt-sticky-bar" style="position:sticky;top:0;height:56px;background:black;z-index:2"></header><h1>Tide readings</h1><div style="height:300px"></div>`
      + `${renderToString(band)}<div style="height:200px"></div></body></html>`;
  };
  for (const pages of [3, 2]) {
    test(`Enter on the foot's Next opens the next page with the band's Next focused${pages === 2 ? " (the last page: the arrow is at its end)" : ""}, the band under the bar, and Back returns to the foot`, async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      await context.route(`${ORIGIN}/**`, (route) => { const p = Number(new URL(route.request().url()).searchParams.get("page") || 1); return route.fulfill({ contentType: "text/html", body: doc(p, pages) }); });
      await page.goto(`${ORIGIN}/readings?page=1`);
      await page.evaluate(() => document.querySelector(".basalt-list-band-foot").scrollIntoView({ block: "center" }));
      const footY = await page.evaluate(() => window.scrollY);
      await page.focus(".basalt-list-band-foot [aria-label='Next page']");
      await Promise.all([page.waitForURL(/page=2#gauge-pager-next$/), page.keyboard.press("Enter")]);
      await frames(page, 3);
      assert.equal(await page.evaluate(() => document.activeElement.id), "gauge-pager-next");
      const geometry = await page.evaluate(() => ({ band: document.querySelector(".basalt-list-band").getBoundingClientRect().top, row: document.querySelector("#rows li").getBoundingClientRect().top, bandBottom: document.querySelector(".basalt-list-band").getBoundingClientRect().bottom }));
      assert.ok(Math.abs(geometry.band - 56) <= 1, `the band's top is on the bar's lower edge (${geometry.band})`);
      assert.ok(geometry.row >= geometry.bandBottom - 1, "the first row is under the band");
      await page.goBack();
      await frames(page, 3);
      assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - footY) <= 1, "Back returns to the foot the reader pressed");
      await context.close();
    });
  }
});

// ---- Tabs

describe("Tabs: a value that matches no tab (development)", () => {
  const tabs = (value) => `createRoot(document.getElementById("root")).render(<B.Tabs value={${value}}><B.TabsList><B.Tab value="today">Today</B.Tab><B.Tab value="week">Week</B.Tab></B.TabsList><B.TabsPanel value="today">Calm</B.TabsPanel><B.TabsPanel value="week">Two surges</B.TabsPanel></B.Tabs>);`;
  const count = (warnings) => warnings.filter((w) => w.includes("Basalt Tabs: `value` matches no tab")).length;
  test("warns once for an unmatched value", async () => {
    const { page, context, warnings } = await served(`${tabs('"month"')} setTimeout(() => window.__again = true, 0);`, { mode: "development" });
    await frames(page, 3);
    assert.equal(count(warnings), 1);
    await context.close();
  });
  test("never for null, a matched value, or before any tab is registered", async () => {
    for (const value of ["null", '"week"']) {
      const { context, warnings } = await served(tabs(value), { mode: "development" });
      assert.equal(count(warnings), 0, value);
      await context.close();
    }
    const empty = await served(`createRoot(document.getElementById("root")).render(<B.Tabs value="month"><B.TabsList /></B.Tabs>);`, { mode: "development" });
    assert.equal(count(empty.warnings), 0);
    await empty.context.close();
  });
});

// ---- Drawer

const DRAWER = (props = "") => `
function App() {
  const [open, setOpen] = React.useState(false);
  window.setOpen = (v) => flushSync(() => setOpen(v));
  const final = React.useRef(null);
  return (
    <>
      <B.DrawerTrigger id="trigger-a" drawer="lot" open={open} onClick={() => { setOpen(true); }}>Lot details</B.DrawerTrigger>
      <B.DrawerTrigger id="trigger-b" drawer="lot" open={open} onClick={() => { setOpen(true); }}>Germination</B.DrawerTrigger>
      <button id="final" ref={final}>Lots heading</button>
      <button id="elsewhere">Elsewhere</button>
      <B.Drawer id="lot" label="The lot and its tests" open={open} ${props.replace("FINAL", "final")} onBack={() => setOpen(false)}>
        <B.DrawerSection title="Lot"><button id="in-drawer">Edit lot</button></B.DrawerSection>
      </B.Drawer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
`;

describe("Drawer: finalFocus", () => {
  const openFrom = async (page, trigger) => { await page.focus(`#${trigger}`); await page.keyboard.press("Enter"); await frames(page); await page.focus("#in-drawer"); };
  test("closing with focus inside returns it to where it came from; with two triggers, to the one used", async () => {
    for (const trigger of ["trigger-a", "trigger-b"]) {
      const { page, context } = await served(DRAWER());
      await openFrom(page, trigger);
      await page.evaluate(() => window.setOpen(false));
      assert.equal(await active(page), trigger);
      await context.close();
    }
  });
  test("finalFocus wins; closing with focus outside moves nothing; opening still takes no focus", async () => {
    const { page, context } = await served(DRAWER("finalFocus={FINAL}"));
    await page.focus("#trigger-a");
    await page.keyboard.press("Enter");
    await frames(page);
    assert.equal(await active(page), "trigger-a", "opening takes no focus");
    await page.focus("#in-drawer");
    await page.evaluate(() => window.setOpen(false));
    assert.equal(await active(page), "final");
    await page.evaluate(() => window.setOpen(true));
    await page.focus("#in-drawer");
    await page.focus("#elsewhere");
    await page.evaluate(() => window.setOpen(false));
    assert.equal(await active(page), "elsewhere");
    await context.close();
  });
  test("opened from trigger A and closed with focus outside, then entered again with a null relatedTarget and closed: focus does not go to A", async () => {
    const { page, context } = await served(DRAWER());
    await openFrom(page, "trigger-a");
    await page.focus("#elsewhere");
    await page.evaluate(() => window.setOpen(false));
    await page.evaluate(() => window.setOpen(true));
    await page.evaluate(() => { document.activeElement.blur(); document.getElementById("in-drawer").focus(); });
    await page.evaluate(() => window.setOpen(false));
    assert.notEqual(await active(page), "trigger-a");
    await context.close();
  });
});

describe("Drawer: focus tracked from the commit", () => {
  // An open drawer that its parent focuses into from a layout effect, on the very first commit: the drawer must have heard that entry.
  const FIRST = `
function App() {
  const [open, setOpen] = React.useState(true);
  window.setOpen = (v) => flushSync(() => setOpen(v));
  const final = React.useRef(null);
  React.useLayoutEffect(() => { document.getElementById("in-drawer").focus(); }, []);
  return (
    <>
      <button id="final" ref={final}>Readings heading</button>
      <B.Drawer id="gauge" label="The gauge and its readings" open={open} finalFocus={final}>
        <B.DrawerSection title="Gauge"><button id="in-drawer">Recalibrate</button></B.DrawerSection>
      </B.Drawer>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
`;
  test("an initially open drawer focused by its parent's layout effect returns focus to finalFocus on closing", async () => {
    const { page, context } = await served(FIRST);
    assert.equal(await active(page), "in-drawer");
    await page.evaluate(() => window.setOpen(false));
    assert.equal(await active(page), "final");
    await context.close();
  });

  test("the window leaving and coming back keeps the opener; a later entry from no focused element clears it", async () => {
    const { page, context } = await served(DRAWER());
    await page.focus("#trigger-a");
    await page.keyboard.press("Enter");
    await frames(page);
    await page.focus("#in-drawer");
    // Another app takes the window: focusout with no relatedTarget while the document has lost focus and still names the same element; then it comes back.
    await page.evaluate(() => {
      const el = document.getElementById("in-drawer");
      const real = Document.prototype.hasFocus;
      Document.prototype.hasFocus = () => false;
      el.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
      el.dispatchEvent(new FocusEvent("blur", { relatedTarget: null }));
      Document.prototype.hasFocus = real;
      el.dispatchEvent(new FocusEvent("focusin", { bubbles: true, relatedTarget: null }));
      el.dispatchEvent(new FocusEvent("focus", { relatedTarget: null }));
    });
    assert.equal(await active(page), "in-drawer", "the document still names the same element");
    await page.evaluate(() => window.setOpen(false));
    assert.equal(await active(page), "trigger-a", "the opener was kept across the window's leave and return");
    // Open again from A, then focus leaves to nothing and re-enters from no element: that entry clears the record.
    await page.focus("#trigger-a");
    await page.keyboard.press("Enter");
    await frames(page);
    await page.focus("#in-drawer");
    await page.evaluate(() => { document.activeElement.blur(); document.getElementById("in-drawer").focus(); });
    await page.evaluate(() => window.setOpen(false));
    assert.notEqual(await active(page), "trigger-a");
    await context.close();
  });
});

// ---- S3

describe("S3: an app shell's root does not bounce on the block axis under a fine pointer", () => {
  const SHELL = `createRoot(document.getElementById("root")).render(<B.AppShell brand="Seeds" brandLabel="Seed library home" sidebar={<div />} header={<B.AppHeader title="Lots" />}><div style={{ height: 3000 }}>Seed library</div></B.AppShell>);`;
  const root = (page) => page.evaluate(() => { const s = getComputedStyle(document.documentElement); return [s.overscrollBehaviorY, s.overscrollBehaviorX]; });
  test("with an app shell and a fine pointer: none on the block axis, auto on the inline axis", async () => {
    const { page, context } = await served(SHELL);
    assert.deepEqual(await root(page), ["none", "auto"]);
    await context.close();
  });
  test("without a shell: auto", async () => {
    const { page, context } = await served(`createRoot(document.getElementById("root")).render(<B.SiteHeader brand="Seeds" brandLabel="Seed library home" />);`);
    assert.deepEqual(await root(page), ["auto", "auto"]);
    await context.close();
  });
  test("under a coarse pointer: auto (a device with both pointers cannot be emulated in this harness)", async () => {
    const { page, context } = await served(SHELL, { width: 390, height: 844, touch: true });
    assert.deepEqual(await root(page), ["auto", "auto"]);
    await context.close();
  });
});
