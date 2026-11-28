// The first review's findings on the primitives round, each pinned by a test that fails without its fix:
// CommandMenu's failed chunk, Form's submit details, Tabs' callback values, TextMorph's work bound,
// the shared-element registry and the first toast after a blur. (Declaration capabilities are in types.test.mjs.)
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { createRequire } from "node:module";

import { fixturePage, freezeAnimations, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;

describe("CommandMenu when its chunk fails", () => {
  const app = `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
    function App(){const[o,s]=React.useState(false);return <><button id="trigger" onClick={()=>s(true)}>Commands</button><B.CommandMenu open={o} onOpenChange={s} groups={[{label:"Test",commands:[{id:"one",label:"One",onSelect:()=>{window.selected="one"}}]}]}/></>}
    createRoot(document.getElementById("root")).render(<App/>);`;

  /** A real split build, served over HTTP, so the command panel is a network chunk that can fail or lag. */
  async function serve(scenario) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-command-chunk-"));
    await esbuild.build({
      stdin: { contents: app, resolveDir: pkg, loader: "tsx" },
      bundle: true, format: "esm", splitting: true, outdir: dir, entryNames: "app", jsx: "automatic", platform: "browser",
      define: { "process.env.NODE_ENV": '"production"' }, logLevel: "silent",
    });
    const files = fs.readdirSync(dir);
    const chunk = files.find((f) => f.startsWith("command-panel"));
    assert.ok(chunk, "the command panel is a chunk of its own");
    const state = { mode: scenario, requests: 0 };
    const server = http.createServer((request, response) => {
      const file = (request.url ?? "/").slice(1);
      if (file === chunk) {
        state.requests += 1;
        if (state.mode === "fail") return void response.writeHead(503).end("unavailable");
        if (state.mode === "quick") {
          const body = fs.readFileSync(path.join(dir, file));
          return void setTimeout(() => response.writeHead(200, { "content-type": "text/javascript" }).end(body), 100);
        }
        if (state.mode === "slow") {
          // Held until the test calls state.release(), so the panel stays loading for exactly as long as the test needs, on any
          // runner. A fixed delay raced the test's own round trips: a slow runner could see the ring, or even the panel, early.
          const body = fs.readFileSync(path.join(dir, file));
          state.release = () => { state.release = null; response.writeHead(200, { "content-type": "text/javascript" }).end(body); };
          return;
        }
      }
      if (file === "") return void response.writeHead(200, { "content-type": "text/html" }).end(`<!doctype html><html lang="en" data-theme="light"><head><title>Chunk fixture</title><link rel="stylesheet" href="/styles.css"></head><body><main><div id="root"></div></main><script type="module" src="/app.js"></script></body></html>`);
      if (file === "styles.css") return void response.writeHead(200, { "content-type": "text/css" }).end(css());
      if (!files.includes(file)) return void response.writeHead(404).end();
      response.writeHead(200, { "content-type": "text/javascript" }).end(fs.readFileSync(path.join(dir, file)));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return {
      state,
      url: `http://127.0.0.1:${server.address().port}/`,
      close: async () => { state.release?.(); await new Promise((resolve) => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); },
    };
  }

  const active = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName);

  test("a failure is announced inside the dialog, focus lands on Retry, and Close works", async () => {
    const site = await serve("fail");
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await page.goto(site.url);
      await page.locator("#trigger").click();
      const dialog = page.getByRole("dialog", { name: "Command menu" });
      const alert = dialog.getByRole("alert");
      await alert.waitFor();
      assert.equal(await alert.textContent(), "Couldn't load commands.", "the alert is the sentence alone, without the buttons");
      assert.ok(await dialog.getByRole("button", { name: "Retry" }).isVisible());
      assert.deepEqual(await dialog.getByRole("button").allTextContents(), ["Retry", "Close"], "first failure: Retry, then Close");
      assert.equal(await alert.evaluate((el) => getComputedStyle(el).color), await page.evaluate(() => { const i = document.createElement("i"); i.style.color = "var(--basalt-text-primary)"; document.body.append(i); const c = getComputedStyle(i).color; i.remove(); return c; }), "the message is text-primary");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Retry", "focus is on the recovery action");
      await settle(page);
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(() => window.axe.run(
        { exclude: [["[data-base-ui-focus-guard]"]] },
        { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
      ).then((result) => result.violations.map((v) => `${v.id}: ${v.help}`)));
      assert.deepEqual(violations, [], "the error state is accessible");
      await dialog.getByRole("button", { name: "Close" }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await active(page), "trigger", "closing returns focus to what opened it");
    } finally {
      await page.close();
      await site.close();
    }
  });

  test("while loading, the dialog says so and focus stays inside it", async () => {
    const site = await serve("slow");
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await page.goto(site.url);
      // The ring may only appear once the wait has run past 300ms. Time that in the page, from when the loading input mounts to
      // when the ring does, so the check doesn't depend on how long this test's own round trips take.
      await page.evaluate(() => {
        window.__loading = {};
        new MutationObserver(() => {
          const now = performance.now();
          if (!window.__loading.input && document.querySelector(".basalt-command-input")) window.__loading.input = now;
          if (!window.__loading.ring && document.querySelector(".basalt-command-search .basalt-spinner")) window.__loading.ring = now;
        }).observe(document.body, { subtree: true, childList: true });
      });
      await page.locator("#trigger").click();
      const dialog = page.getByRole("dialog", { name: "Command menu" });
      await dialog.waitFor();
      // the real input is there at once: same placeholder, focused, described as loading, and the dialog is not aria-busy
      const early = dialog.getByRole("textbox", { name: "Search commands" });
      await early.waitFor();
      assert.equal(await dialog.locator(".basalt-command-search").getAttribute("data-level"), "2", "the loading band is level 2 too, so the fill does not change when the panel arrives");
      assert.equal(await early.getAttribute("placeholder"), "Search commands");
      assert.equal(await page.evaluate(() => document.activeElement?.matches(".basalt-command-input")), true, "focus is in the input while it loads");
      assert.equal(await early.evaluate((el) => document.getElementById(el.getAttribute("aria-describedby")).textContent), "Loading commands");
      assert.equal(await dialog.getAttribute("aria-busy"), null);
      assert.equal(await dialog.getByRole("status").count(), 0);
      // after 300ms of waiting the ring appears, in the slot at the band's end; the input does not move when it does
      const band = () => page.evaluate(() => {
        const row = document.querySelector(".basalt-command-search").getBoundingClientRect();
        const input = document.querySelector(".basalt-command-input").getBoundingClientRect();
        return { height: row.height, inputLeft: input.left, inputRight: input.right };
      });
      const waiting = await band();
      await page.waitForSelector(".basalt-command-search .basalt-spinner", { timeout: 2000 });
      const { input, ring: ringAt } = await page.evaluate(() => window.__loading);
      assert.ok(ringAt - input >= 295, `no ring before 300ms of waiting: it appeared ${Math.round(ringAt - input)}ms after the loading input`);
      const ring = await page.evaluate(() => {
        const el = document.querySelector(".basalt-command-search .basalt-spinner");
        const box = el.getBoundingClientRect();
        const row = document.querySelector(".basalt-command-search").getBoundingClientRect();
        const text = document.createElement("i"); text.style.color = "var(--basalt-text-tertiary)"; document.body.append(text);
        const tertiary = getComputedStyle(text).color; text.remove();
        return { size: [box.width, box.height], aria: el.getAttribute("aria-hidden"), role: el.getAttribute("role"), color: getComputedStyle(el).color, tertiary, atEnd: Math.round(row.right - box.right), rowHeight: row.height };
      });
      assert.deepEqual(ring.size, [16, 16]);
      assert.equal(ring.aria, "true");
      assert.equal(ring.role, null, "the ring says nothing; the input's description does");
      assert.equal(ring.color, ring.tertiary, "text-tertiary");
      assert.equal(ring.atEnd, 16, "at the band's inline end, inside its padding");
      assert.deepEqual(await band(), waiting, "the ring changes nothing about the band");
      // what is typed is kept, and is the panel's first search
      await page.keyboard.type("zz");
      assert.equal(await early.inputValue(), "zz");
      assert.equal(await page.locator(".basalt-command-input").evaluate((el) => !!el.closest("[cmdk-root]")), false, "still loading: the chunk is held");
      site.state.release();
      await page.waitForFunction(() => document.querySelector(".basalt-command-input")?.closest("[cmdk-root]"), null, { timeout: 4000 });
      assert.equal(await page.locator(".basalt-command-input").inputValue(), "zz", "the typed text survives the panel arriving");
      const ready = await band();
      assert.equal(await page.locator(".basalt-spinner").count(), 0, "the ring is gone when the panel is ready");
      assert.deepEqual(ready, waiting, "the ready band is the loading band: nothing moved when loading ended");
      assert.equal(await page.evaluate(() => document.activeElement?.matches(".basalt-command-input")), true);
      assert.equal(await dialog.getByText("Nothing matches “zz”.").count(), 1, "and it filters");
      await page.keyboard.press("Backspace");
      await page.keyboard.press("Backspace");
      assert.equal(await dialog.getByRole("option", { name: "One" }).count(), 1);
    } finally {
      await page.close();
      await site.close();
    }
  });

  test("a load that finishes within 300ms never puts a spinner in the DOM", async () => {
    const site = await serve("quick");
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await page.addInitScript(() => {
        window.__rings = 0;
        new MutationObserver((records) => {
          for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1 && (node.matches?.(".basalt-spinner") || node.querySelector?.(".basalt-spinner"))) window.__rings += 1;
        }).observe(document, { subtree: true, childList: true });
      });
      await page.goto(site.url);
      await page.locator("#trigger").click();
      await page.waitForFunction(() => document.querySelector(".basalt-command-input")?.closest("[cmdk-root]"));
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(() => window.__rings), 0, "no ring was ever added");
    } finally {
      await page.close();
      await site.close();
    }
  });

  test("Retry asks for the chunk again; a second failure offers a reload, since a browser remembers a failed file", async () => {
    const site = await serve("fail");
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await page.goto(site.url);
      await page.locator("#trigger").click();
      const dialog = page.getByRole("dialog", { name: "Command menu" });
      await dialog.getByRole("button", { name: "Retry" }).waitFor();
      assert.equal(await dialog.getByRole("button", { name: "Reload page" }).count(), 0, "not offered after the first failure");
      await dialog.getByRole("button", { name: "Retry" }).click();
      await dialog.getByRole("button", { name: "Reload page" }).waitFor();
      assert.ok(site.state.requests >= 1);
      assert.equal(await dialog.getByRole("alert").count(), 1);
      assert.equal(await dialog.getByRole("alert").textContent(), "Still couldn't load commands. Reloading the page usually fixes this.");
      assert.deepEqual(await dialog.getByRole("button").allTextContents(), ["Reload page", "Retry", "Close"], "Reload page first");
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Reload page", "and it has focus");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    } finally {
      await page.close();
      await site.close();
    }
  });

  test("a rejected load is never cached: Retry loads the panel once the file is back", async () => {
    // The chunk's import is swapped for a loader the test controls, since a browser keeps a failed module and
    // would hide a promise that was cached: the first call rejects, later ones load the real panel.
    const built = await esbuild.build({
      stdin: {
        contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
          let calls = 0;
          window.__loadPanel = () => { calls += 1; window.calls = calls; return calls === 1 ? Promise.reject(new Error("offline")) : import("./dist/command-panel.js"); };
          function App(){const[o,s]=React.useState(false);window.setOpen=s;return <><button id="trigger" onClick={()=>s(true)}>Commands</button><B.CommandMenu open={o} onOpenChange={s} groups={[{label:"Test",commands:[{id:"one",label:"One",onSelect:()=>{window.selected="one"}}]}]}/></>}
          createRoot(document.getElementById("root")).render(<App/>);`,
        resolveDir: pkg, loader: "tsx",
      },
      bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [{
        name: "controlled-panel-import",
        setup(build) {
          build.onLoad({ filter: /dist[\\/][^\\/]*\.js$/ }, (args) => {
            const source = fs.readFileSync(args.path, "utf8");
            if (!source.includes('import("./command-panel.js")')) return undefined;
            return { contents: source.replace('import("./command-panel.js")', "window.__loadPanel()"), loader: "js" };
          });
        },
      }],
    });
    const script = built.outputFiles[0].text;
    assert.ok(!script.includes("./command-panel.js"), "the fixture replaced the import");
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await page.setContent(`<html data-theme="light"><head><style>${css()}</style></head><body><div id="root"></div></body></html>`);
      await page.addScriptTag({ content: script });
      await page.locator("#trigger").click();
      const dialog = page.getByRole("dialog", { name: "Command menu" });
      await dialog.getByRole("alert").waitFor();
      assert.equal(await page.evaluate(() => window.calls), 1);
      await dialog.getByRole("button", { name: "Retry" }).click();
      await page.waitForFunction(() => document.activeElement?.matches(".basalt-command-input"));
      assert.equal(await page.evaluate(() => window.calls), 2, "Retry asked again");
      assert.equal(await dialog.getByRole("alert").count(), 0);
      await page.keyboard.type("One");
      await page.keyboard.press("Enter");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => window.selected), "one");
    } finally {
      await page.close();
    }
  });

  test("closing and reopening while one load is still failing counts that failure once: the first message, with Retry focused", async () => {
    // Both openings subscribe to the one cached request. The abandoned one used to add to the failure count as well,
    // so the first failure a person saw read as the second ("Still couldn't load...") with Reload page focused.
    const built = await esbuild.build({
      stdin: {
        contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
          window.calls = 0;
          window.__loadPanel = () => { window.calls += 1; return new Promise((_, reject) => setTimeout(() => reject(new Error("offline")), 600)); };
          function App(){const[o,s]=React.useState(false);window.setOpen=s;return <><button id="trigger" onClick={()=>s(true)}>Commands</button><B.CommandMenu open={o} onOpenChange={s} groups={[{label:"Test",commands:[{id:"one",label:"One",onSelect:()=>{}}]}]}/></>}
          createRoot(document.getElementById("root")).render(<App/>);`,
        resolveDir: pkg, loader: "tsx",
      },
      bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [{
        name: "controlled-panel-import",
        setup(build) {
          build.onLoad({ filter: /dist[\\/][^\\/]*\.js$/ }, (args) => {
            const source = fs.readFileSync(args.path, "utf8");
            if (!source.includes('import("./command-panel.js")')) return undefined;
            return { contents: source.replace('import("./command-panel.js")', "window.__loadPanel()"), loader: "js" };
          });
        },
      }],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    try {
      await page.setContent(`<html data-theme="light"><head><style>${css()}</style></head><body><div id="root"></div></body></html>`);
      await page.addScriptTag({ content: built.outputFiles[0].text });
      const dialog = page.getByRole("dialog", { name: "Command menu" });
      await page.locator("#trigger").click();
      await dialog.waitFor();
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await page.locator("#trigger").click();
      await dialog.getByRole("alert").waitFor();
      assert.equal(await page.evaluate(() => window.calls), 1, "one request served both openings");
      assert.equal(await dialog.getByRole("alert").textContent(), "Couldn't load commands.");
      assert.deepEqual(await dialog.getByRole("button").allTextContents(), ["Retry", "Close"]);
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Retry");
    } finally {
      await page.close();
    }
  });
});


const mountable = (components, kinds) => `${components}
const root = createRoot(document.getElementById("root"));
window.show = (kind, props = {}) => flushSync(() => root.render(React.createElement(kinds[kind], props)));
const kinds = ${kinds};
`;

describe("Form", () => {
  test("a submit callback gets the values and a reason and event, and nothing it cannot honour", async () => {
    const { page, errors } = await fixturePage(browser, render(`<B.Form onFormSubmit={(values, d) => { window.seen = { values, keys: Object.keys(d).sort(), reason: d.reason, event: d.event instanceof Event, cancel: typeof d.cancel }; }}><B.Field label="Name" name="name"><B.Input defaultValue="Joe" /></B.Field><B.Button type="submit">Submit</B.Button></B.Form>`));
    await page.getByRole("button", { name: "Submit" }).click();
    assert.deepEqual(await page.evaluate(() => window.seen), { values: { name: "Joe" }, keys: ["event", "reason"], reason: "none", event: true, cancel: "undefined" });
    assert.deepEqual(errors, []);
    await page.close();
  });
  // That `details.cancel()` does not compile is in capabilities.tsx (`@ts-expect-error`), run by types.test.mjs.
});

describe("Tabs", () => {
  const tabs = mountable("", `{
    letters: (p) => <B.Tabs onValueChange={(v, d) => { window.reported = { v, type: typeof v, reason: d.reason }; if (window.veto) d.cancel(); }}><B.TabsList>{!p.none && <B.Tab value="a">A</B.Tab>}{!p.none && <B.Tab value="b">B</B.Tab>}</B.TabsList><B.TabsPanel value="a">AA</B.TabsPanel><B.TabsPanel value="b">BB</B.TabsPanel></B.Tabs>,
    numbers: () => <B.Tabs defaultValue={1} onValueChange={(v) => { window.reported = { v, type: typeof v }; }}><B.TabsList><B.Tab value={1}>One</B.Tab><B.Tab value={2}>Two</B.Tab><B.Tab value={3}>Three</B.Tab></B.TabsList><B.TabsPanel value={1}>1</B.TabsPanel><B.TabsPanel value={2}>2</B.TabsPanel><B.TabsPanel value={3}>3</B.TabsPanel></B.Tabs>,
  }`);
  const direction = (page) => page.locator(".basalt-tabs-root").getAttribute("data-direction");

  test("no selectable tab is reported as null, not as the text \"null\"", async () => {
    const { page } = await fixturePage(browser, tabs);
    await page.evaluate(() => window.show("letters"));
    await page.evaluate(() => window.show("letters", { none: true }));
    await page.waitForFunction(() => window.reported?.v === null);
    assert.deepEqual(await page.evaluate(() => window.reported), { v: null, type: "object", reason: "missing" });
    await page.close();
  });

  test("numeric values reach the callback as numbers", async () => {
    const { page } = await fixturePage(browser, tabs);
    await page.evaluate(() => window.show("numbers"));
    await page.getByRole("tab", { name: "Three" }).click();
    assert.deepEqual(await page.evaluate(() => window.reported), { v: 3, type: "number" });
    assert.equal(await direction(page), "forward", "direction still follows numeric values");
    await page.getByRole("tab", { name: "Two" }).click();
    assert.equal(await direction(page), "back");
    await page.close();
  });

  test("a change the app cancels moves nothing: the selection and the direction stay", async () => {
    const { page } = await fixturePage(browser, tabs);
    await page.evaluate(() => window.show("letters"));
    await page.evaluate(() => { window.veto = true; });
    await page.getByRole("tab", { name: "B", exact: true }).click();
    assert.equal(await page.getByRole("tab", { selected: true }).textContent(), "A");
    assert.equal(await direction(page), null, "a refused change recorded a direction");
    await page.evaluate(() => { window.veto = false; });
    await page.getByRole("tab", { name: "B", exact: true }).click();
    assert.equal(await page.getByRole("tab", { selected: true }).textContent(), "B");
    assert.equal(await direction(page), "forward");
    await page.close();
  });
});

describe("TextMorph work bound", () => {
  const morph = mountable("", `{ text: (p) => <B.TextMorph text={p.text} /> }`);
  /** Update to `next` and count the layout reads and glyph elements that update caused. */
  const update = (page, next) => page.evaluate((next) => {
    let reads = 0;
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () { reads += 1; return original.call(this); };
    try { window.show("text", { text: next }); } finally { Element.prototype.getBoundingClientRect = original; }
    return { reads, glyphs: document.querySelectorAll(".basalt-text-morph-glyph").length, text: document.querySelector(".basalt-text-morph [aria-live]").textContent };
  }, next);

  test("a long value replaced by a short one measures and mounts only the short one", async () => {
    const { page } = await fixturePage(browser, morph);
    await page.evaluate(() => window.show("text", { text: "a".repeat(1000) }));
    const result = await update(page, "OK");
    assert.equal(result.text, "OK");
    assert.equal(result.glyphs, 2, "only the new text becomes glyphs");
    assert.ok(result.reads < 20, `${result.reads} layout reads for a 2-character update`);
    await page.close();
  });

  test("a short value replaced by a long one measures and mounts nothing per glyph", async () => {
    const { page } = await fixturePage(browser, morph);
    await page.evaluate(() => window.show("text", { text: "OK" }));
    const result = await update(page, "a".repeat(1000));
    assert.equal(result.text.length, 1000);
    assert.equal(result.glyphs, 0);
    assert.ok(result.reads < 20, `${result.reads} layout reads`);
    await page.close();
  });
});

describe("SharedElement registry", () => {
  const shared = mountable(`import * as S from "./dist/shared-element.js";`, `{ at: (p) => <div style={{ display: "flex", gap: 200 }}><div>{p.id && p.side !== "right" && <S.SharedElement layoutId={p.id}><b>Item</b></S.SharedElement>}</div><div>{p.id && p.side === "right" && <S.SharedElement layoutId={p.id}><b>Item</b></S.SharedElement>}</div></div> }`);

  test("an id the element has moved off is forgotten, so a later arrival under it does not fly in from a stale place", async () => {
    const { page } = await fixturePage(browser, shared);
    const flies = (id) => page.evaluate((id) => { window.show("at", { id, side: "right" }); return document.querySelector("[data-layout]").getAnimations().length; }, id);
    // The same element, left, under four ids in turn; then it goes.
    for (const id of ["a", "b", "c", "d"]) await page.evaluate((id) => window.show("at", { id }), id);
    await page.evaluate(() => window.show("at", {}));
    await page.waitForTimeout(100);
    // Nothing is remembered under any of them: arriving elsewhere is not a move.
    for (const id of ["a", "b", "c", "d"]) {
      assert.equal(await flies(id), 0, `an element arriving as "${id}" flew in from where an earlier one had been`);
      await page.evaluate(() => window.show("at", {}));
      await page.waitForTimeout(100);
    }
    await page.close();
  });

  test("an element that keeps its id still travels when it moves", async () => {
    const { page } = await fixturePage(browser, shared);
    await freezeAnimations(page); // the 200ms flight is read after a round trip: on a busy machine that is past its end
    await page.evaluate(() => window.show("at", { id: "same" }));
    await page.evaluate(() => window.show("at", { id: "same", side: "right" }));
    assert.equal(await page.locator("[data-layout]").evaluate((el) => el.getAnimations().length), 1);
    await page.close();
  });
});

describe("Toast drain and timer", () => {
  const toasts = mountable(`function Probe(){const t=B.useToast();React.useEffect(()=>{window.toast=t.show},[t]);return null}`, `{ toast: () => <B.ToastProvider><Probe/></B.ToastProvider> }`);
  const read = (page) => page.locator(".basalt-toast").evaluateAll((els) => els.map((el) => {
    const drain = el.querySelector(".basalt-toast-drain");
    return { title: el.querySelector(".basalt-toast-title").textContent, state: getComputedStyle(drain).animationPlayState };
  }));

  test("the first toast after a window blur holds its drain and its timer together, and both run once the window is active", async () => {
    const { page } = await fixturePage(browser, toasts);
    await page.evaluate(() => window.show("toast"));
    // The blur comes while no toast is on screen. Basalt's stack watches the window for as long as it is mounted, so the toast that
    // arrives next starts held: the line and the clock are paused together (A2-07, foundations: "in a blurred window and in a hidden tab").
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.evaluate(() => window.toast({ title: "First", home: "page", timeout: 700 }));
    const first = page.locator(".basalt-toast-title", { hasText: "First" });
    await first.waitFor();
    assert.deepEqual(await read(page), [{ title: "First", state: "paused" }]);
    await page.waitForTimeout(1100);
    assert.deepEqual(await read(page), [{ title: "First", state: "paused" }], "still on screen after its time, line held");
    await page.evaluate(() => window.dispatchEvent(new FocusEvent("focus")));
    await first.waitFor({ state: "detached", timeout: 10000 });
    await page.close();
  });

  test("a toast already on screen when the window blurs pauses its drain with its timer, and resumes with it", async () => {
    const { page } = await fixturePage(browser, toasts);
    await page.evaluate(() => window.show("toast"));
    await page.evaluate(() => window.toast({ title: "Existing", home: "page", timeout: 800 }));
    const existing = page.locator(".basalt-toast-title", { hasText: "Existing" });
    await existing.waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForTimeout(1100);
    assert.deepEqual(await read(page), [{ title: "Existing", state: "paused" }], "still on screen, line held");
    await page.evaluate(() => window.dispatchEvent(new FocusEvent("focus")));
    await existing.waitFor({ state: "detached", timeout: 3000 });
    await page.close();
  });
});
