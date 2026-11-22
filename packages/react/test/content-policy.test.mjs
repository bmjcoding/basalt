// A page under a content policy (DECISIONS 265, batch B0): the head scripts as files, and Base UI's inline style turned off or given a nonce, with the open popup's
// box and its list's scrollbar measured the same. Each page is served from its own origin with a real `Content-Security-Policy` header, so Chromium enforces the policy and reports each refusal.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { bundleFixture, launch, pkg } from "./support.mjs";

const dist = path.join(pkg, "dist");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const ORIGIN = "http://policy.test";
const OPTIONS = [{ value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" }];

// The fixture: `window.show(provider)` draws a Select inside `CSPProvider` with those props (or with no provider for `null`), and a probe element in Base UI's class.
const FIXTURE = `
window.show = (provider) => {
  const select = <B.Select aria-label="Size" options={${JSON.stringify(OPTIONS)}} />;
  createRoot(document.getElementById("root")).render(<>{provider ? <B.CSPProvider {...provider}>{select}</B.CSPProvider> : select}<div id="probe" className="base-ui-disable-scrollbar" style={{ width: 80, height: 40, overflow: "scroll" }}><div style={{ width: 400, height: 400 }} /></div></>);
};`;

/** A page served under `policy`, with the head files, the shipped sheet and the fixture as files of its own origin. `inline` is an inline script in the head. */
async function policyPage(policy, { inline = "", storage = {}, viewport = { width: 1440, height: 900 } } = {}) {
  const context = await browser.newContext({ viewport });
  // Before any page script, and outside the policy: what a returning visitor has stored, and a log of every refusal.
  await context.addInitScript((stored) => {
    for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value);
    window.__refused = [];
    document.addEventListener("securitypolicyviolation", (event) => window.__refused.push(`${event.effectiveDirective} ${event.blockedURI}`));
  }, storage);
  const fixture = await bundleFixture(FIXTURE);
  const files = {
    "/": ["text/html", `<!doctype html><html lang="en"><head><link rel="stylesheet" href="/styles.css"><script src="/head/theme.js"></script><script src="/head/loops.js"></script>${inline ? `<script>${inline}</script>` : ""}<script src="/fixture.js" defer></script></head><body><div id="root"></div></body></html>`],
    "/styles.css": ["text/css", fs.readFileSync(path.join(dist, "styles.css"), "utf8")],
    "/head/theme.js": ["text/javascript", fs.readFileSync(path.join(dist, "head", "theme.js"), "utf8")],
    "/head/loops.js": ["text/javascript", fs.readFileSync(path.join(dist, "head", "loops.js"), "utf8")],
    "/fixture.js": ["text/javascript", fixture],
  };
  await context.route(`${ORIGIN}/**`, (route) => {
    const file = files[new URL(route.request().url()).pathname];
    if (!file) return route.fulfill({ status: 404 });
    return route.fulfill({ status: 200, contentType: file[0], headers: { "content-security-policy": policy }, body: file[1] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => typeof window.show === "function");
  return { page, context, errors };
}

const SELF = "default-src 'self'; script-src 'self'; style-src 'self'";
const refused = (page) => page.evaluate(() => window.__refused.slice());
const styleElements = (page) => page.evaluate(() => document.querySelectorAll("style").length);

async function openSelect(page) {
  await page.getByRole("combobox", { name: "Size" }).click();
  await page.getByRole("option", { name: "Medium" }).waitFor();
  // A frame for React to hoist the style element and for the policy to report it.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

describe("the head scripts as files", () => {
  test("each file is its exported string, character for character, and a package export", async () => {
    const { themeBootstrap } = await import(pathToFileURL(path.join(dist, "theme-bootstrap.js")).href);
    const { loopsBootstrap } = await import(pathToFileURL(path.join(dist, "loops-bootstrap.js")).href);
    assert.equal(fs.readFileSync(path.join(dist, "head", "theme.js"), "utf8"), themeBootstrap);
    assert.equal(fs.readFileSync(path.join(dist, "head", "loops.js"), "utf8"), loopsBootstrap);
    const manifest = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
    assert.equal(manifest.exports["./head/theme.js"], "./dist/head/theme.js");
    assert.equal(manifest.exports["./head/loops.js"], "./dist/head/loops.js");
  });

  test("under script-src 'self' the files apply the stored theme and hold before the app's script, and the inline form is refused", async () => {
    const { themeBootstrap } = await import(pathToFileURL(path.join(dist, "theme-bootstrap.js")).href);
    const { page, context, errors } = await policyPage(SELF, { inline: themeBootstrap, storage: { "basalt-theme": "dark", "basalt-loops": "held" } });
    try {
      const root = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, choice: document.documentElement.dataset.themeChoice, loops: document.documentElement.dataset.loops }));
      assert.deepEqual(root, { theme: "dark", choice: "dark", loops: "held" });
      // The policy is really on: the same line inline is refused, and it is the only refusal.
      assert.deepEqual(await refused(page), ["script-src-elem inline"]);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
});

describe("Base UI's inline style under style-src 'self'", () => {
  test("without the provider, opening a Select writes Base UI's style element and the policy refuses it (the case this exists for)", async () => {
    const { page, context } = await policyPage(SELF);
    try {
      await page.evaluate(() => window.show(null));
      await openSelect(page);
      assert.equal(await styleElements(page), 1);
      assert.deepEqual(await refused(page), ["style-src-elem inline"]);
    } finally {
      await context.close();
    }
  });

  test("with CSPProvider disableStyleElements, opening a Select writes no inline style, nothing is refused, and Basalt's sheet draws the class", async () => {
    const { page, context, errors } = await policyPage(SELF);
    try {
      await page.evaluate(() => window.show({ disableStyleElements: true }));
      await openSelect(page);
      assert.equal(await styleElements(page), 0, "no <style> element in the document");
      assert.deepEqual(await refused(page), []);
      // What Base UI's style drew: the marked element scrolls with no scrollbar (its client box is its whole box).
      const probe = await page.evaluate(() => { const el = document.getElementById("probe"); return { width: getComputedStyle(el).scrollbarWidth, client: el.clientWidth, offset: el.offsetWidth }; });
      assert.equal(probe.width, "none");
      assert.equal(probe.client, probe.offset, "no scrollbar takes room");
      await page.getByRole("option", { name: "Medium" }).click();
      assert.match(await page.getByRole("combobox", { name: "Size" }).textContent(), /Medium/);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("with CSPProvider nonce, Base UI's style element carries the nonce and the policy accepts it", async () => {
    const { page, context, errors } = await policyPage("default-src 'self'; script-src 'self'; style-src 'self' 'nonce-b0test'");
    try {
      await page.evaluate(() => window.show({ nonce: "b0test" }));
      await openSelect(page);
      assert.equal(await styleElements(page), 1);
      // A browser hides a nonce from the attribute once it is read; the property keeps it.
      assert.equal(await page.evaluate(() => document.querySelector("style").nonce), "b0test");
      assert.deepEqual(await refused(page), []);
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

  test("with the style element on and off, the open Select's popup has the same box, and its list the same scrollbar width and client width", async () => {
    const boxes = [];
    for (const provider of [null, { disableStyleElements: true }]) {
      const { page, context } = await policyPage("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
      try {
        await page.evaluate((p) => window.show(p), provider);
        await openSelect(page);
        boxes.push(await page.evaluate(() => {
          const popup = document.querySelector(".basalt-select-popup");
          const r = popup.getBoundingClientRect();
          const list = popup.querySelector("[role='listbox']") ?? popup;
          return { x: r.x, y: r.y, width: r.width, height: r.height, scrollbar: getComputedStyle(list).scrollbarWidth, clientWidth: list.clientWidth };
        }));
      } finally {
        await context.close();
      }
    }
    assert.deepEqual(boxes[1], boxes[0]);
  });
});
