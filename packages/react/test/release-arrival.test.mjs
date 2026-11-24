// Arriving at a release or an entry (DECISIONS 320, 2.10): the fragment is looked up by id, every fold that holds the target is opened, the
// target is scrolled to and focused with no ring, and it takes the stream's mark (the plate and "Linked") until the reader presses or types.
// Driven in Chromium against the built package. The fixtures are made up (Slate, a package; Harbor, a product).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { HARBOR, HARBOR_BEFORE, RUNNING_BUILD, SLATE } from "./release-fixture.mjs";
import { bundleFixture, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const CSS = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");

/** A page at a real address with a fragment, so arriving is a real fragment navigation and Back works. */
async function arrive(fragment, { releases = "SLATE", form = "reference", product = "Slate", theme = "light", width = 1024, height = 700, ...options } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, ...options });
  const page = await context.newPage();
  page.context_ = context;
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.errors = errors;
  await page.route("https://example.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html data-theme="${theme}"><head><style>${CSS()}</style></head><body style="margin:0;background:var(--basalt-surface-page);color:var(--basalt-text-primary)"><main id="root" style="padding:24px"></main></body></html>` }));
  await page.goto(`https://example.test/changelog${fragment}`);
  const data = `const SLATE = ${JSON.stringify(SLATE)}; const HARBOR = ${JSON.stringify(HARBOR)}; const HARBOR_BEFORE = ${JSON.stringify(HARBOR_BEFORE)}; const RUNNING_BUILD = ${JSON.stringify(RUNNING_BUILD)};`;
  await page.addScriptTag({ content: await bundleFixture(`${data} createRoot(document.getElementById("root")).render(<B.ReleaseNotes releases={${releases}} form="${form}" product="${product}" running="1.4.0" runningBuild={RUNNING_BUILD} />);`) });
  await settle(page);
  await page.waitForTimeout(50);
  await settle(page);
  return page;
}
const state = (page) => page.evaluate(() => {
  const arrived = [...document.querySelectorAll("[data-arrived]")].map((el) => el.id);
  const focused = document.activeElement?.id ?? null;
  const word = document.querySelector("[data-arrived] .basalt-release-word[data-on]");
  return { arrived, focused, word: word ? word.textContent : null };
});
const inView = (page, id) => page.evaluate((target) => {
  const r = document.getElementById(target).getBoundingClientRect();
  return r.top >= 0 && r.top < innerHeight;
}, id);

describe("arriving", () => {
  test("a fragment to a release marks its header, focuses it with no ring, and says Linked", async () => {
    const page = await arrive("#v0.2.0");
    assert.deepEqual(await state(page), { arrived: ["v0.2.0"], focused: "v0.2.0", word: "Linked" });
    assert.ok(await inView(page, "v0.2.0"));
    assert.equal(await page.locator('[id="v0.2.0"]').evaluate((el) => getComputedStyle(el).outlineStyle), "none");
    const plate = await page.locator('[id="v0.2.0"] > .basalt-release-head').evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
    assert.notEqual(plate, "rgba(0, 0, 0, 0)", "the plate is on its header");
    await page.context_.close();
  });

  test("a fragment to an entry: the entry takes the plate and the word", async () => {
    const page = await arrive("#pr41-1");
    assert.deepEqual(await state(page), { arrived: ["pr41-1"], focused: "pr41-1", word: "Linked" });
    assert.ok(await inView(page, "pr41-1"));
    assert.notEqual(await page.locator('[id="pr41-1"]').evaluate((el) => getComputedStyle(el, "::before").backgroundColor), "rgba(0, 0, 0, 0)");
    await page.context_.close();
  });

  test("an entry in a closed fold: the fold opens and the entry is reached", async () => {
    const page = await arrive("#pr49-1");
    assert.equal(await page.locator('[id="v0.2.0"] .basalt-release-section[data-folded] .basalt-accordion-trigger').getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator('[id="pr49-1"]').isVisible(), true);
    assert.deepEqual(await state(page), { arrived: ["pr49-1"], focused: "pr49-1", word: "Linked" });
    assert.ok(await inView(page, "pr49-1"));
    await page.context_.close();
  });

  test("an entry inside a product's All changes", async () => {
    const page = await arrive("#pr131-1", { releases: "HARBOR", form: "notes", product: "Harbor" });
    assert.equal(await page.locator('[id="pr131-1"]').isVisible(), true);
    assert.deepEqual(await state(page), { arrived: ["pr131-1"], focused: "pr131-1", word: "Linked" });
    await page.context_.close();
  });

  test("a candidate's address while it is drawn, and the stable release once it replaces it; an entry's address is the same in both", async () => {
    let page = await arrive("#v2.0.0-rc.2", { releases: "HARBOR_BEFORE", form: "notes", product: "Harbor" });
    assert.deepEqual((await state(page)).arrived, ["v2.0.0-rc.2"]);
    await page.context_.close();
    page = await arrive("#v2.0.0-rc.2", { releases: "HARBOR", form: "notes", product: "Harbor" });
    assert.deepEqual((await state(page)).arrived, ["v2.0.0"]);
    assert.equal((await state(page)).focused, "v2.0.0");
    await page.context_.close();
    for (const releases of ["HARBOR_BEFORE", "HARBOR"]) {
      page = await arrive("#pr142-1", { releases, form: "notes", product: "Harbor" });
      assert.deepEqual((await state(page)).arrived, ["pr142-1"], releases);
      await page.context_.close();
    }
  });

  test("an unknown fragment marks nothing and throws nothing; a dotted version is never read as a selector", async () => {
    for (const fragment of ["#nothing-here", "#2026.11.23", "#v9.9.9", "#%E0%A4%A"]) {
      const page = await arrive(fragment);
      assert.deepEqual((await state(page)).arrived, []);
      assert.deepEqual(page.errors, []);
      await page.context_.close();
    }
  });

  test("in forced colours the plate goes and the word stays", async () => {
    const page = await arrive("#pr41-1", { forcedColors: "active" });
    assert.equal(await page.locator('[id="pr41-1"]').evaluate((el) => getComputedStyle(el, "::before").display), "none");
    assert.equal((await state(page)).word, "Linked");
    assert.equal(await page.locator('[id="pr41-1"] .basalt-release-word').isVisible(), true);
    await page.context_.close();
  });
});

describe("the mark ends, and arriving again", () => {
  test("an arrow key leaves the mark; a press ends it, and focus stays", async () => {
    const page = await arrive("#pr41-1");
    await page.keyboard.press("ArrowDown");
    await settle(page);
    assert.deepEqual((await state(page)).arrived, ["pr41-1"]);
    await page.mouse.click(5, 5);
    await settle(page);
    assert.deepEqual((await state(page)).arrived, []);
    assert.equal(await page.locator('[id="pr41-1"] .basalt-release-word').count(), 1, "the word keeps its room");
    await page.context_.close();
  });

  test("a link on the page is a hashchange that arrives; Back arrives at the one before", async () => {
    const page = await arrive("#v0.2.0");
    await page.evaluate(() => { location.hash = "#pr45-1"; });
    await settle(page);
    await page.waitForTimeout(50);
    assert.deepEqual((await state(page)).arrived, ["pr45-1"]);
    await page.goBack();
    await settle(page);
    await page.waitForTimeout(50);
    assert.deepEqual((await state(page)).arrived, ["v0.2.0"]);
    assert.equal((await state(page)).focused, "v0.2.0");
    // The versions' links are fragment links too.
    await page.evaluate(() => { location.hash = "#v0.1.0"; });
    await page.waitForTimeout(50);
    await settle(page);
    assert.deepEqual((await state(page)).arrived, ["v0.1.0"]);
    await page.context_.close();
  });

  test("an app with its own router names the target; the window's fragment is then not read", async () => {
    const context = await browser.newContext({ viewport: { width: 1024, height: 700 } });
    const page = await context.newPage();
    await page.route("https://example.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><style>${CSS()}</style></head><body><main id="root"></main></body></html>` }));
    await page.goto("https://example.test/changelog#v0.1.0");
    await page.addScriptTag({ content: await bundleFixture(`const SLATE = ${JSON.stringify(SLATE)}; createRoot(document.getElementById("root")).render(<B.ReleaseNotes releases={SLATE} form="reference" product="Slate" arrived="pr45-1" />);`) });
    await settle(page);
    await page.waitForTimeout(50);
    assert.deepEqual((await state(page)).arrived, ["pr45-1"]);
    await context.close();
  });
});
