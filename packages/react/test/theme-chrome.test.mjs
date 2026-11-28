// Micro-details m6, themes and native chrome (DECISIONS 420), in React. H2: the browser chrome's colour is the page ground, with one owner per tag from
// first paint through hydration: the media-scoped pair (`themeColorMeta`, markup no script touches) and the head script's live tag (script only, first
// in <head>, synced on every theme write); an app's own `theme-color` wins. H4: a theme switch changes colour at once (`data-theme-switching` zeroes every
// transition's duration and delay for the one write) and touches nothing else: a running transform keeps its time, loops keep their Animation objects and
// start times, and the choice's own pill and a closing menu move as usual. Written while tests are paused (DECISIONS 359): not yet run. The skill's share
// is tools/html-skill/test/theme-chrome.test.mjs; the selection colours (H6) are page-base.test.mjs, selection.test.mjs and the tokens' contrast test.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, pkg } from "./support.mjs";

const dist = (file) => import(pathToFileURL(path.join(pkg, "dist", file)).href);
const { themeBootstrap, themeColorMeta } = await dist("theme-bootstrap.js");
const tokens = JSON.parse(fs.readFileSync(path.join(pkg, "..", "tokens", "dist", "json", "tokens.json"), "utf8"));
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const LIGHT = tokens.light["surface-page"].hex;
const DARK = tokens.dark["surface-page"].hex;
const ORIGIN = "https://chrome.test";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page, n = 2) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

// ---- The colours and the scripts, in Node ----

describe("the colours are the tokens' page ground, and the head scripts agree", () => {
  test("surface-page is #fafafa in light and #000000 in dark, as the decision has it", () => {
    assert.equal(LIGHT, "#fafafa");
    assert.equal(DARK, "#000000");
  });

  test("the head script's live tag takes the page ground of the theme it wrote", () => {
    assert.ok(themeBootstrap.includes(`m.content=t==="dark"?"${DARK}":"${LIGHT}"`), "themeBootstrap's literals are tokens.json's surface-page");
    assert.ok(themeBootstrap.includes(`h.querySelector("meta[name=theme-color]:not([data-basalt-theme-color])")`), "an app's own theme-color is looked for first");
    assert.ok(themeBootstrap.includes(`h.insertBefore(m,h.querySelector("meta[name=theme-color]"))`), "the live tag goes before the first theme-color");
    assert.ok(themeBootstrap.includes(`m.setAttribute("property","basalt-live")`), "the live tag carries a property React 19's hoistable matcher reads, so hydration never claims it for the pair");
  });

  test("themeColorMeta is the frozen pair: light then dark, by media, marked, the page ground of each", () => {
    assert.ok(Object.isFrozen(themeColorMeta) && themeColorMeta.every(Object.isFrozen));
    assert.deepEqual(themeColorMeta.map((m) => ({ ...m })), [
      { name: "theme-color", media: "(prefers-color-scheme: light)", content: LIGHT, "data-basalt-theme-color": "" },
      { name: "theme-color", media: "(prefers-color-scheme: dark)", content: DARK, "data-basalt-theme-color": "" },
    ]);
  });

  test("the runtime sync's defaults are the same two literals", () => {
    const source = fs.readFileSync(path.join(pkg, "src", "theme-color.ts"), "utf8");
    assert.match(source, new RegExp(`const LIGHT = "${LIGHT}";`));
    assert.match(source, new RegExp(`const DARK = "${DARK}";`));
  });

  test("themeBootstrap and the skill's THEME_INIT are still equal in their shared part, the live tag included", () => {
    const skill = compose(`<title>T</title><p>x</p>`, { fonts: false }).html;
    const snippet = skill.match(/<script>(\(function\(\)\{var t,c,r=document\.documentElement;.*?)<\/script>/)?.[1];
    assert.ok(snippet);
    assert.equal(snippet.slice(0, snippet.indexOf("try{if(sessionStorage")), themeBootstrap.slice(0, -"})();".length));
    assert.ok(snippet.includes("data-basalt-theme-color"));
  });

  test("the head file is the string", () => {
    assert.equal(fs.readFileSync(path.join(pkg, "dist", "head", "theme.js"), "utf8"), themeBootstrap);
  });
});

// ---- H2 in a browser: a server-rendered document, hydrated ----

/**
 * The client: a document rendered by React 19 (`renderToString` of <html>), then `hydrateRoot(document, ...)` with a probe of `useTheme`. Bundled as a
 * development build, so React reports a hydration mismatch and the install's warning runs. `<html>` carries `suppressHydrationWarning`, as an app's
 * must: the head script writes `data-theme` and `data-theme-choice` on it before React hydrates, and those two are the only expected difference (the
 * flag covers that one element's attributes, so a mismatch in the head or the body still reports). `pair` renders themeColorMeta `before` or `after` the
 * head script (false: none), each with a ref kept in `window.__pairRefs`; `window.__setPair(false)` removes it later. `app` renders an app's own
 * theme-color through React (`{ color, at }`, `at` before or after the head script), with its ref in `window.__appRef`.
 */
async function documentBundle({ pair = "before", app = null }) {
  const appTag = app ? `<meta name="theme-color" content="${app.color}" id="app-color" ref={(n) => { if (n) window.__appRef = n; }} />` : "";
  const pairTags = `{showPair ? B.themeColorMeta.map((m, i) => <meta key={m.media} {...m} ref={(n) => { if (n) (window.__pairRefs ??= [])[i] = n; }} />) : null}`;
  const app_ = `
    import * as React from "react";
    import * as B from "./dist/index.js";
    export function App() {
      const state = B.useTheme();
      const [showPair, setPair] = React.useState(${pair ? "true" : "false"});
      if (typeof window !== "undefined") { window.__theme = state; window.__setPair = setPair; }
      return (
        <html lang="en" suppressHydrationWarning>
          <head>
            <title>Basalt</title>
            ${pair === "before" ? pairTags : ""}
            ${app?.at === "before" ? appTag : ""}
            <script dangerouslySetInnerHTML={{ __html: B.themeBootstrap }} />
            ${pair === "after" ? pairTags : ""}
            ${app?.at === "after" ? appTag : ""}
          </head>
          <body><main id="p">{[state.theme, state.choice, String(state.ready)].join("/")}</main></body>
        </html>
      );
    }`;
  const build = (contents, platform) => esbuild.build({
    stdin: { contents, resolveDir: pkg, loader: "tsx" }, bundle: true, write: false, jsx: "automatic", platform, logLevel: "silent",
    format: platform === "node" ? "esm" : "iife", external: platform === "node" ? ["react", "react-dom"] : [], define: { "process.env.NODE_ENV": '"development"' },
  });
  const server = await build(`${app_}\nimport { renderToString } from "react-dom/server";\nexport const html = "<!doctype html>" + renderToString(<App />);`, "node");
  const file = path.join(pkg, `.theme-chrome-${process.pid}-${Date.now()}.mjs`);
  fs.writeFileSync(file, server.outputFiles[0].text);
  let html;
  try { ({ html } = await import(pathToFileURL(file).href)); } finally { fs.rmSync(file, { force: true }); }
  const client = await build(`${app_}
    import { hydrateRoot } from "react-dom/client";
    window.__pair = [...document.querySelectorAll('meta[data-basalt-theme-color=""]')].map((m) => [m, m.getAttribute("media"), m.getAttribute("content")]);
    window.__liveAtLoad = document.head.querySelector('meta[data-basalt-theme-color="live"]');
    window.__recoverable = [];
    hydrateRoot(document, <App />, { onRecoverableError: (e) => window.__recoverable.push(String(e && e.message)) });`, "browser");
  return { html, client: client.outputFiles[0].text };
}

/**
 * Opens the document. `pair` and `app` are documentBundle's. `framework` is an app's own theme-color written into the served <head> `before` or `after`
 * the head script outside React's tree (a framework's tag; React 19 may hoist its own metas ahead of the script, so this is the sure way to put one after
 * it). `scheme` is the OS, `stored` the choice in storage, `script` false turns scripting off.
 */
async function openDocument({ pair = "before", app = null, framework, scheme = "light", stored, script = true, context } = {}) {
  const { html, client } = await documentBundle({ pair, app });
  let served = html;
  const bootstrap = served.indexOf("<script>(function(){var t,c");
  assert.ok(bootstrap > 0, "the head script is in the server's head");
  if (framework) {
    const tag = '<meta name="theme-color" content="#2a6f97" id="app-color">';
    const at = framework === "before" ? bootstrap : served.indexOf("</script>", bootstrap) + "</script>".length;
    served = served.slice(0, at) + tag + served.slice(at);
  }
  served = served.replace("</body>", "<script src=\"/client.js\"></script></body>").replace("</head>", `<style>${css()}</style></head>`);
  context ??= await browser.newContext({ colorScheme: scheme, javaScriptEnabled: script, viewport: { width: 800, height: 600 } });
  await context.route(`${ORIGIN}/**`, (route) => {
    const url = new URL(route.request().url());
    return url.pathname === "/client.js" ? route.fulfill({ contentType: "text/javascript", body: client }) : route.fulfill({ contentType: "text/html", body: served });
  });
  if (stored !== undefined) await context.addInitScript((value) => localStorage.setItem("basalt-theme", value), stored);
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); if (m.type() === "warning") warnings.push(m.text()); });
  await page.goto(`${ORIGIN}/`);
  if (script) await page.waitForFunction(() => document.getElementById("p")?.textContent.endsWith("/true"));
  return { page, context, errors, warnings, served };
}

/** Every theme-color tag in the head, in tree order, and the one the browser uses: the first whose media matches (or has none). */
const chrome = (page) => page.evaluate(() => {
  const all = [...document.head.querySelectorAll('meta[name="theme-color"]')];
  const first = all.find((m) => !m.media || matchMedia(m.media).matches);
  return {
    count: all.length,
    kinds: all.map((m) => m.getAttribute("data-basalt-theme-color") ?? (m.id || "app")),
    first: first && { kind: first.getAttribute("data-basalt-theme-color") ?? first.id, content: first.content },
    live: document.head.querySelector('meta[data-basalt-theme-color="live"]')?.content ?? null,
  };
});
const theme = (page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const waitChrome = (page, content) => page.waitForFunction((c) => {
  const first = [...document.head.querySelectorAll('meta[name="theme-color"]')].find((m) => !m.media || matchMedia(m.media).matches);
  return first?.content === c;
}, content);
const pairUnchanged = (page) => page.evaluate(() => {
  const now = [...document.querySelectorAll('meta[data-basalt-theme-color=""]')];
  return now.length === 2 && window.__pair.every(([node, media, content], i) => node === now[i] && node.isConnected && node.getAttribute("media") === media && node.getAttribute("content") === content);
});

describe("H2: the pair and the live tag through hydration", () => {
  for (const [scheme, stored, shown] of [["light", undefined, "light"], ["dark", undefined, "dark"], ["light", "dark", "dark"], ["dark", "light", "light"]]) {
    test(`system ${scheme}, stored ${stored ?? "nothing"}: three tags (the pair and the live one), the pair's nodes untouched, no hydration error, the chrome ${shown}`, async () => {
      const { page, context, errors } = await openDocument({ scheme, stored });
      const state = await chrome(page);
      assert.equal(state.count, 3);
      assert.deepEqual(state.kinds, ["live", "", ""], "the live tag is first, then the pair");
      assert.ok(await pairUnchanged(page), "the pair is the nodes React rendered, their media and content as rendered");
      assert.deepEqual(await page.evaluate(() => window.__recoverable), []);
      assert.deepEqual(errors, [], "no hydration mismatch");
      assert.equal(await theme(page), shown);
      assert.deepEqual(state.first, { kind: "live", content: shown === "dark" ? DARK : LIGHT });
      await context.close();
    });
  }

  test("System follows an OS flip; a stored choice holds; setChoice('system') goes back to the device", async () => {
    const { page, context } = await openDocument({ scheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await waitChrome(page, DARK);
    assert.equal((await chrome(page)).live, DARK);
    await page.evaluate(() => window.__theme.setChoice("light"));
    await waitChrome(page, LIGHT);
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await frames(page);
    assert.equal((await chrome(page)).live, LIGHT, "a stored light holds through the OS");
    await page.evaluate(() => window.__theme.setChoice("system"));
    await waitChrome(page, DARK);
    assert.ok(await pairUnchanged(page));
    assert.equal((await chrome(page)).count, 3);
    await context.close();
  });

  test("another tab's choice (storage) and the app's own data-theme write move the chrome too", async () => {
    const { page, context } = await openDocument({ scheme: "light" });
    await page.evaluate(() => { localStorage.setItem("basalt-theme", "dark"); window.dispatchEvent(new StorageEvent("storage", { key: "basalt-theme", newValue: "dark" })); });
    await waitChrome(page, DARK);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await waitChrome(page, LIGHT);
    await page.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.classList.add("dark"); });
    await waitChrome(page, DARK);
    assert.ok(await pairUnchanged(page));
    await context.close();
  });

  test("no pair at all: the live tag alone, first and right", async () => {
    const { page, context, errors } = await openDocument({ pair: false, scheme: "dark" });
    const state = await chrome(page);
    assert.deepEqual(state.kinds, ["live"]);
    assert.deepEqual(state.first, { kind: "live", content: DARK });
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.__theme.setChoice("light"));
    await waitChrome(page, LIGHT);
    await context.close();
  });

  for (const scheme of ["light", "dark"]) {
    test(`script disabled, system ${scheme}: the pair alone, the one matching by media is the page ground`, async () => {
      const { page, context } = await openDocument({ scheme, script: false });
      const state = await chrome(page);
      assert.deepEqual(state.kinds, ["", ""]);
      assert.deepEqual(state.first, { kind: "", content: scheme === "dark" ? DARK : LIGHT });
      await context.close();
    });
  }

  for (const at of ["before", "after"]) {
    test(`the pair ${at} the head script: React's refs are the pair's own nodes (with their media), never the live tag; with the pair removed, the live node and its palette attributes stay`, async () => {
      const { page, context, errors } = await openDocument({ pair: at, scheme: "dark" });
      const refs = await page.evaluate(() => {
        const live = document.head.querySelector('meta[data-basalt-theme-color="live"]');
        return {
          media: window.__pairRefs.map((n) => n.getAttribute("media")),
          marked: window.__pairRefs.map((n) => n.getAttribute("data-basalt-theme-color")),
          claimsLive: window.__pairRefs.includes(live),
          sameLive: live === window.__liveAtLoad,
          property: live.getAttribute("property"),
        };
      });
      assert.deepEqual(refs, { media: ["(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"], marked: ["", ""], claimsLive: false, sameLive: true, property: "basalt-live" });
      assert.equal((await chrome(page)).count, 3);
      assert.deepEqual(errors, []);
      await page.evaluate(() => { const m = document.head.querySelector('meta[data-basalt-theme-color="live"]'); m.setAttribute("data-light", "#f3efe6"); m.setAttribute("data-dark", "#0b1520"); window.__theme.setChoice("dark"); });
      await waitChrome(page, "#0b1520");
      await page.evaluate(() => window.__setPair(false));
      await page.waitForFunction(() => !document.querySelector('meta[data-basalt-theme-color=""]'));
      const after = await page.evaluate(() => {
        const live = window.__liveAtLoad;
        return { connected: live.isConnected, same: live === document.head.querySelector('meta[data-basalt-theme-color="live"]'), light: live.getAttribute("data-light"), dark: live.getAttribute("data-dark"), content: live.content, count: document.head.querySelectorAll('meta[name="theme-color"]').length };
      });
      assert.deepEqual(after, { connected: true, same: true, light: "#f3efe6", dark: "#0b1520", content: "#0b1520", count: 1 });
      await page.evaluate(() => window.__theme.setChoice("light"));
      await waitChrome(page, "#f3efe6");
      await context.close();
    });
  }

  for (const [at, color] of [["before", "#2a6f97"], ["after", "#2a6f97"], ["before", DARK], ["after", DARK]]) {
    test(`an app's own theme-color rendered by React ${at} the head script, ${color === DARK ? "the live tag's own colour" : "a colour of its own"}, without the pair: the first matching tag is the app's node, its ref`, async () => {
      const { page, context, errors, warnings } = await openDocument({ pair: false, app: { color, at }, scheme: "dark" });
      const identity = await page.evaluate(() => {
        const first = [...document.head.querySelectorAll('meta[name="theme-color"]')].find((m) => !m.media || matchMedia(m.media).matches);
        return { ref: first === window.__appRef, id: first.id, content: first.content, live: Boolean(document.head.querySelector('meta[data-basalt-theme-color="live"]')) };
      });
      assert.deepEqual(identity, { ref: true, id: "app-color", content: color, live: false });
      await page.evaluate(() => window.__theme.setChoice("light"));
      await frames(page);
      assert.deepEqual((await chrome(page)).first, { kind: "app-color", content: color }, "a theme change leaves the app's tag first, and Basalt writes none");
      assert.deepEqual(errors, []);
      assert.deepEqual(warnings.filter((w) => /theme-color/.test(w)), []);
      await context.close();
    });
  }

  for (const framework of ["before", "after"]) {
    test(`a framework's own theme-color ${framework} the head script, without the pair: the first matching tag is the app's own node after hydration`, async () => {
      const { page, context, errors, served } = await openDocument({ pair: false, scheme: "dark", framework });
      assert.equal(served.indexOf('id="app-color"') > served.indexOf("<script>(function(){var t,c"), framework === "after", "the tag is where the case says");
      const identity = await page.evaluate(() => {
        const first = [...document.head.querySelectorAll('meta[name="theme-color"]')].find((m) => !m.media || matchMedia(m.media).matches);
        return { same: first === document.getElementById("app-color"), content: first.content };
      });
      assert.deepEqual(identity, { same: true, content: "#2a6f97" });
      assert.equal((await chrome(page)).live, null, "Basalt writes no tag of its own");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`an app's own theme-color ${framework} the head script, with the pair: in development useTheme warns once`, async () => {
      const { page, context, warnings } = await openDocument({ scheme: "dark", framework });
      assert.equal(warnings.filter((w) => /own theme-color renders no themeColorMeta/.test(w)).length, 1);
      assert.equal((await chrome(page)).live, null, "the live tag is removed: the app's tag owns the chrome");
      await page.evaluate(() => window.__theme.setChoice("light"));
      await frames(page);
      assert.equal(warnings.filter((w) => /own theme-color renders no themeColorMeta/.test(w)).length, 1, "once");
      await context.close();
    });
  }

  test("a palette's pair on the live tag survives an OS flip, another tab and a hand write; removed, Basalt's ground comes back", async () => {
    const ground = { light: "#f3efe6", dark: "#0b1520" };
    const { page, context } = await openDocument({ scheme: "light" });
    await page.evaluate((g) => { const m = document.head.querySelector('meta[data-basalt-theme-color="live"]'); m.setAttribute("data-light", g.light); m.setAttribute("data-dark", g.dark); }, ground);
    await page.emulateMedia({ colorScheme: "dark" });
    await waitChrome(page, ground.dark);
    await page.evaluate(() => { localStorage.setItem("basalt-theme", "light"); window.dispatchEvent(new StorageEvent("storage", { key: "basalt-theme", newValue: "light" })); });
    await waitChrome(page, ground.light);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await waitChrome(page, ground.dark);
    await page.evaluate(() => { const m = document.head.querySelector('meta[data-basalt-theme-color="live"]'); m.removeAttribute("data-light"); m.removeAttribute("data-dark"); });
    await page.evaluate(() => window.__theme.setChoice("light"));
    await waitChrome(page, LIGHT);
    assert.ok(await pairUnchanged(page));
    await context.close();
  });
});

// ---- H4: a theme switch changes colour at once and touches nothing else ----

const SWITCH = `
  function Probe() { window.__theme = B.useTheme(); return null; }
  createRoot(document.getElementById("root")).render(<main style={{ padding: 24 }}>
    <Probe />
    <B.Spinner variant="ring" label="Saving" />
    <B.Spinner variant="braille" label="Loading" />
    <div id="mover" style={{ width: 40, height: 40, background: "var(--basalt-surface-raised)", transition: "transform 1s linear" }} />
    <div id="fade" style={{ width: 40, height: 40, background: "var(--basalt-text-primary)", opacity: 1, transition: "opacity 600ms linear" }} />
    <B.Button id="press">Save</B.Button>
    <B.ThemeChoiceControl />
    <B.ThemeMenu />
  </main>);`;

/** A page under `style-src 'self'` (no inline style element), the sheet, the head script and the fixture as files of the page's own origin. */
async function switchPage({ scheme = "light", stored } = {}) {
  const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1000, height: 700 } });
  await context.addInitScript((value) => {
    if (value !== undefined) localStorage.setItem("basalt-theme", value);
    window.__refused = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__refused.push(`${e.effectiveDirective} ${e.blockedURI}`));
    window.__runs = [];
    document.addEventListener("transitionrun", (e) => window.__runs.push({ property: e.propertyName, id: e.target.id || "", cls: String(e.target.className?.baseVal ?? e.target.className ?? ""), choice: Boolean(e.target.closest?.(".basalt-theme-choice,[role=menu],.basalt-menu-positioner")), at: performance.now() }), true);
  }, stored);
  const fixture = (await esbuild.build({
    stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js"; ${SWITCH}`, resolveDir: pkg, loader: "tsx" },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' },
  })).outputFiles[0].text;
  const files = {
    "/": ["text/html", `<!doctype html><html lang="en"><head><title>Switch</title><link rel="stylesheet" href="/styles.css"><script src="/head/theme.js"></script></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`],
    "/styles.css": ["text/css", css()],
    "/head/theme.js": ["text/javascript", fs.readFileSync(path.join(pkg, "dist", "head", "theme.js"), "utf8")],
    "/fixture.js": ["text/javascript", fixture],
  };
  await context.route(`${ORIGIN}/**`, (route) => {
    const file = files[new URL(route.request().url()).pathname];
    return file ? route.fulfill({ contentType: file[0], headers: { "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'" }, body: file[1] }) : route.fulfill({ status: 404 });
  });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => window.__theme && document.querySelector(".basalt-spinner"));
  await frames(page, 4);
  return { page, context };
}

const COLOUR = /color|background|border|fill|stroke|shadow|outline/;
/** The loops' Animation objects and their start times, by identity: a switch must keep both. */
const loops = (page) => page.evaluate(() => {
  window.__loops ??= document.getAnimations().filter((a) => a instanceof CSSAnimation);
  return window.__loops.map((a) => ({ name: a.animationName, start: a.startTime, alive: document.getAnimations().includes(a) }));
});

/** Switches the theme by one of the three triggers. */
async function trigger(page, how, to) {
  if (how === "choice") await page.evaluate((t) => window.__theme.setChoice(t), to);
  else if (how === "os") await page.emulateMedia({ colorScheme: to });
  else await page.evaluate((t) => { localStorage.setItem("basalt-theme", t); window.dispatchEvent(new StorageEvent("storage", { key: "basalt-theme", newValue: t })); }, to);
  await page.waitForFunction((t) => document.documentElement.getAttribute("data-theme") === t, to);
}

describe("H4: a theme switch is instant, and touches nothing else", () => {
  for (const how of ["choice", "os", "storage"]) {
    test(`by ${how}: no colour transitions, both directions; loops keep their objects and start times; the window is closed when the call returns; no CSP refusal`, async () => {
      const { page, context } = await switchPage({ scheme: "light" });
      if (how === "os") await page.evaluate(() => window.__theme.setChoice("system"));
      const before = await loops(page);
      assert.ok(before.length >= 2, "the ring and braille are running");
      for (const to of ["dark", "light"]) {
        await page.evaluate(() => { window.__runs.length = 0; });
        await trigger(page, how, to);
        await frames(page);
        const colour = await page.evaluate((re) => window.__runs.filter((r) => new RegExp(re).test(r.property) && !r.choice), COLOUR.source);
        assert.deepEqual(colour, [], `${how} to ${to}: no colour transition ran`);
        assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-theme-switching")), false);
      }
      assert.deepEqual(await loops(page), before, "the same Animation objects, at the same start times");
      assert.deepEqual(await page.evaluate(() => window.__refused), []);
      await context.close();
    });
  }

  test("a 1s transform under way at about 120ms is still between its ends 50ms after the switch, and a crossfade mid-flight goes on", async () => {
    const { page, context } = await switchPage({ scheme: "light" });
    await page.evaluate(() => { document.getElementById("mover").style.transform = "translateX(200px)"; document.getElementById("fade").style.opacity = "0"; });
    await page.waitForTimeout(120);
    const fade = await page.evaluate(() => { const a = document.getElementById("fade").getAnimations()[0]; window.__fade = a; return a.startTime; });
    await page.evaluate(() => window.__theme.setChoice("dark"));
    await page.waitForTimeout(50);
    const x = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById("mover")).transform).m41);
    assert.ok(x > 0 && x < 200, `the transform is mid-way (${x}px), not jumped to its end`);
    const still = await page.evaluate(() => ({ running: document.getElementById("fade").getAnimations().includes(window.__fade), start: window.__fade.startTime, opacity: Number(getComputedStyle(document.getElementById("fade")).opacity) }));
    assert.equal(still.running, true);
    assert.equal(still.start, fade);
    assert.ok(still.opacity > 0 && still.opacity < 1, `the crossfade is mid-flight (${still.opacity})`);
    await context.close();
  });

  test("after the switch, the theme choice's pill slides (a transform transition runs) and the theme menu's close fade runs", async () => {
    const { page, context } = await switchPage({ scheme: "light" });
    await page.evaluate(() => { window.__runs.length = 0; });
    await page.getByRole("radio", { name: "Dark" }).click();
    await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark");
    await frames(page, 3);
    const pill = await page.evaluate(() => window.__runs.filter((r) => r.property === "transform" && /basalt-pill/.test(r.cls)));
    assert.ok(pill.length >= 1, "the pill's transform transition ran after the switch");
    await page.getByRole("button", { name: /^Theme: / }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).waitFor();
    await frames(page, 3);
    await page.evaluate(() => { window.__runs.length = 0; });
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await page.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "light");
    await frames(page, 3);
    const fade = await page.evaluate(() => window.__runs.filter((r) => r.property === "opacity" && r.choice));
    assert.ok(fade.length >= 1, "the closing menu's fade ran");
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-theme-switching")), false);
    await context.close();
  });

  test("the window's rule: in @layer basalt, every transition's duration and delay zero with !important, and no transition-property or animation in it", () => {
    const source = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8");
    const rule = source.match(/:root\[data-theme-switching\],[\s\S]*?\{([^{}]*)\}/);
    assert.ok(rule, "the rule is in components.css");
    assert.deepEqual(rule[1].split(";").map((d) => d.trim()).filter(Boolean), [
      "transition-duration: var(--basalt-duration-instant) !important",
      "transition-delay: var(--basalt-duration-instant) !important",
    ]);
    for (const selector of [":root[data-theme-switching] *", ":root[data-theme-switching] ::before", ":root[data-theme-switching] ::after", ":root[data-theme-switching] ::placeholder", ":root[data-theme-switching] ::backdrop"]) assert.ok(rule[0].includes(selector), selector);
    assert.doesNotMatch(source, /data-theme-switching[^{]*\{[^}]*(transition:\s|transition-property|animation)/);
  });
});
