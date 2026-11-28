// audit-fix-c7: the second audit's correctness findings A2-15 to A2-21, each restored to what the part's own documents and types promise. Every test here
// failed on the unfixed code (the report says how it was run).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";
import * as React from "react";
import { renderToString } from "react-dom/server";

import { coverageWords } from "../dist/index.js";
import * as B from "../dist/index.js";
import { fixturePage, launch, pkg } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];

describe("A2-15: single keys leave every editable surface alone", () => {
  for (const theme of THEMES) {
    test(`${theme}: contenteditable="plaintext-only", and an element inside an editing host, keep their keys`, async () => {
      const { page } = await fixturePage(browser, `window.runs = 0; function App() { B.useShortcuts([{ key: "j", description: "Next", run: () => window.runs++ }]); return <><div id="plain" contentEditable="plaintext-only" suppressContentEditableWarning>Text</div><div contentEditable suppressContentEditableWarning><p id="inner">Inner</p></div><div id="off" contentEditable="false" suppressContentEditableWarning tabIndex={0}>Off</div><button id="button">Go</button></>; } createRoot(document.getElementById("root")).render(<App />);`, { theme });
      try {
        await page.locator("#plain").click();
        await page.keyboard.press("j");
        await page.locator("#inner").click();
        await page.keyboard.press("j");
        assert.equal(await page.evaluate(() => window.runs), 0, "a key typed in an editor runs no binding");
        assert.match(await page.locator("#plain").innerText(), /j/, "and it is typed");
        await page.locator("#button").focus();
        await page.keyboard.press("j");
        assert.equal(await page.evaluate(() => window.runs), 1, "anywhere else the binding still runs");
      } finally { await page.close(); }
    });
  }
});

describe("A2-17: the listbox's active descendant names the chosen option", () => {
  for (const theme of THEMES) {
    test(`${theme}: two values that differ only in a space and an underscore have two ids, and the reference names the chosen one`, async () => {
      const { page } = await fixturePage(browser, `createRoot(document.getElementById("root")).render(<B.Listbox label="Items" defaultValue="a_b"><B.ListboxOption value="a b">Space</B.ListboxOption><B.ListboxOption value="a_b">Underscore</B.ListboxOption><B.ListboxOption value="a  b">Two spaces</B.ListboxOption></B.Listbox>);`, { theme });
      try {
        const named = () => page.evaluate(() => { const id = document.querySelector("[role=listbox]").getAttribute("aria-activedescendant"); return { ids: [...document.querySelectorAll("[role=option]")].map((o) => o.id), target: document.getElementById(id)?.textContent ?? null, selected: document.querySelector("[aria-selected=true]")?.textContent }; });
        const first = await named();
        assert.equal(new Set(first.ids).size, 3, JSON.stringify(first));
        assert.equal(first.target, "Underscore");
        await page.locator("[role=listbox]").focus();
        await page.keyboard.press("Home");
        const home = await named();
        assert.equal(home.target, "Space");
        assert.equal(home.selected, "Space");
      } finally { await page.close(); }
    });

    test(`${theme}: an option given its own id keeps it, and the reference names it, also after the choice moves`, async () => {
      const { page } = await fixturePage(browser, `createRoot(document.getElementById("root")).render(<B.Listbox label="Items" defaultValue="a"><B.ListboxOption id="custom" value="a">Alpha</B.ListboxOption><B.ListboxOption value="b">Beta</B.ListboxOption></B.Listbox>);`, { theme });
      try {
        const named = () => page.evaluate(() => { const id = document.querySelector("[role=listbox]").getAttribute("aria-activedescendant"); return { id, target: document.getElementById(id)?.textContent ?? null }; });
        assert.deepEqual(await named(), { id: "custom", target: "Alpha" });
        await page.locator("[role=listbox]").focus();
        await page.keyboard.press("ArrowDown");
        const moved = await named();
        assert.equal(moved.target, "Beta");
        await page.keyboard.press("ArrowUp");
        assert.deepEqual(await named(), { id: "custom", target: "Alpha" });
      } finally { await page.close(); }
    });
  }
});

describe("A2-18: route focus moves only when the key changes", () => {
  for (const theme of THEMES) {
    test(`${theme}: a new ref object on each render, with the key unchanged, scrolls and focuses nothing; a new key does both`, async () => {
      const { page } = await fixturePage(browser, `window.scrolls = 0; window.scrollTo = () => window.scrolls++; function App() { const [n, setN] = React.useState(0); const [route, setRoute] = React.useState("same"); window.rerender = () => setN((x) => x + 1); window.go = () => setRoute("other"); const target = React.createRef(); B.useRouteFocus({ key: route, title: "Page " + route, target }); return <><button id="start">Start</button><h1 tabIndex={-1} ref={target}>Title {n}</h1></>; } createRoot(document.getElementById("root")).render(<App />);`, { theme });
      try {
        await page.locator("#start").focus();
        await page.evaluate(() => window.rerender());
        await page.locator("h1").filter({ hasText: "Title 1" }).waitFor();
        assert.deepEqual(await page.evaluate(() => ({ scrolls: window.scrolls, active: document.activeElement.tagName, title: document.title })), { scrolls: 0, active: "BUTTON", title: "" });
        await page.evaluate(() => window.go());
        await page.waitForFunction(() => document.activeElement.tagName === "H1");
        assert.deepEqual(await page.evaluate(() => ({ scrolls: window.scrolls, title: document.title })), { scrolls: 1, title: "Page other" });
      } finally { await page.close(); }
    });
  }
});

describe("A2-19: a countdown's box does not change when it completes", () => {
  for (const theme of THEMES) {
    test(`${theme}: 00:00:05 then "Open", and the word after it stays where it was`, async () => {
      const { page } = await fixturePage(browser, `const root = createRoot(document.getElementById("root")); window.draw = (now) => flushSync(() => root.render(<div><B.Countdown id="count" to={5000} now={now} done="Open" /><span id="next">Next</span></div>)); window.draw(0);`, { theme });
      try {
        const boxes = () => page.evaluate(() => ["count", "next"].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.x, r.width]; }));
        const running = await boxes();
        await page.evaluate(() => window.draw(6000));
        assert.match(await page.locator("#count").innerText(), /Open/);
        assert.deepEqual(await boxes(), running);
        // and it keeps the room through a render that stays complete
        await page.evaluate(() => window.draw(9000));
        assert.deepEqual(await boxes(), running);
      } finally { await page.close(); }
    });
  }
});

describe("A2-20: the coverage words keep each missing day's reason", () => {
  test("adjacent missing days with different reasons are separate runs; the same reason still makes one", () => {
    const day = (date, why) => ({ date, recorded: false, why });
    assert.equal(coverageWords([day("2026-11-01", "watch not worn"), day("2026-11-02", "battery empty")]), "0 of 2 days recorded. Not recorded: Nov 1 (watch not worn), Nov 2 (battery empty).");
    assert.equal(coverageWords([day("2026-11-01", "watch not worn"), day("2026-11-02", "watch not worn"), day("2026-11-03", "battery empty")]), "0 of 3 days recorded. Not recorded: Nov 1 to 2 (watch not worn), Nov 3 (battery empty).");
    assert.equal(coverageWords([day("2026-11-01"), day("2026-11-02", null), day("2026-11-03", "no reading")]), "0 of 3 days recorded. Not recorded: Nov 1 to 2, Nov 3 (no reading).");
  });
});

describe("A2-21: a running part hydrates when time passed between the server's render and the client's", () => {
  // The server renders at `server`, the client hydrates at `client`; nothing recoverable may be reported, and the page ends up showing the client's time.
  const hydrate = async (jsx, props, { server, client, theme }) => {
    const [name] = jsx.split(" ");
    const old = Date.now;
    Date.now = () => server;
    let html;
    try { html = renderToString(React.createElement(B[name], props)); } finally { Date.now = old; }
    const built = await esbuild.build({
      stdin: { contents: `import * as React from "react"; import { hydrateRoot } from "react-dom/client"; import * as B from "./dist/index.js"; Date.now = () => ${client}; window.recovered = []; console.error = (...a) => { window.recovered.push(a.join(" ")); }; function App() { React.useEffect(() => { window.ready = true; }, []); return <B.${name} {...${JSON.stringify(props)}} />; } hydrateRoot(document.getElementById("root"), <App />, { onRecoverableError: (e) => window.recovered.push(e.message) });`, resolveDir: pkg, loader: "tsx" },
      bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, logLevel: "silent",
    });
    const page = await browser.newPage();
    try {
      await page.setContent(`<html data-theme="${theme}"><body><div id="root">${html}</div></body></html>`);
      await page.addScriptTag({ content: built.outputFiles[0].text });
      await page.waitForFunction(() => window.ready);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      return await page.evaluate(() => ({ recovered: window.recovered, text: document.getElementById("root").textContent, datetimes: [...document.querySelectorAll("time")].map((t) => t.getAttribute("datetime")) }));
    } finally { await page.close(); }
  };

  for (const theme of THEMES) {
    test(`${theme}: Clock across two minutes`, async () => {
      const out = await hydrate("Clock", { timeZone: "UTC", locale: "en-GB" }, { server: 0, client: 120000, theme });
      assert.deepEqual(out.recovered, []);
      assert.equal(out.text, "00:02", "the client's time, not the server's");
      assert.deepEqual(out.datetimes, ["1970-01-01T00:02"]);
    });
    test(`${theme}: Clock in en-US across the hour, 12-hour with a numeric hour, and the server and the browser agree (DECISIONS 207)`, async () => {
      // 11:59 PM on the server, 12:01 AM (the next day) on the client: the hour changes from 11 to 12 and the day period from PM to AM
      const out = await hydrate("Clock", { timeZone: "UTC", locale: "en-US" }, { server: Date.UTC(2026, 10, 17, 23, 59), client: Date.UTC(2026, 10, 18, 0, 1), theme });
      assert.deepEqual(out.recovered, []);
      assert.equal(out.text, "12:01\u00a0AM");
      assert.deepEqual(out.datetimes, ["2026-11-18T00:01"]);
      const morning = await hydrate("Clock", { timeZone: "UTC" }, { server: Date.UTC(2026, 10, 17, 6, 42), client: Date.UTC(2026, 10, 17, 6, 43), theme });
      assert.deepEqual(morning.recovered, []);
      assert.equal(morning.text, "6:43\u00a0AM", "en-US is the default, and the hour is numeric, not 06");
    });
    test(`${theme}: a server's render and its hydration agree on the hour in en-US and en-GB`, async () => {
      const at = Date.UTC(2026, 10, 17, 18, 42);
      for (const [locale, text] of [["en-US", "6:42\u00a0PM"], ["en-GB", "18:42"]]) {
        const out = await hydrate("Clock", { timeZone: "UTC", locale, now: at }, { server: 0, client: 0, theme });
        assert.deepEqual(out.recovered, [], locale);
        assert.equal(out.text, text, locale);
        assert.equal(renderToString(React.createElement(B.Clock, { timeZone: "UTC", locale, now: at })).replace(/<[^>]+>/g, ""), text, `${locale}: the server's markup`);
      }
    });
    test(`${theme}: Countdown across a few seconds, and across its completing`, async () => {
      const running = await hydrate("Countdown", { to: 60000, done: "Open" }, { server: 0, client: 3000, theme });
      assert.deepEqual(running.recovered, []);
      assert.match(running.text, /00:00:57/);
      const done = await hydrate("Countdown", { to: 60000, done: "Open" }, { server: 59000, client: 61000, theme });
      assert.deepEqual(done.recovered, []);
      assert.match(done.text, /Open/);
      assert.deepEqual(done.datetimes, ["PT0S"]);
    });
    test(`${theme}: DateAge across the hour its age rounds at, plain and short`, async () => {
      const day = 86400000;
      for (const short of [false, true]) {
        const out = await hydrate("DateAge", { time: 0, timeZone: "UTC", short }, { server: 60000, client: 3 * day, theme });
        assert.deepEqual(out.recovered, [], `short: ${short}`);
        assert.match(out.text, short ? /3d/ : /3\sdays ago/);
      }
    });
  }
});
