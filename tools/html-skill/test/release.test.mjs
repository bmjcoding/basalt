// The release module (DECISIONS 320): its markup as tools/changelog/skill-body.mjs writes it, compose bringing it in, the folds open without script and
// closed by it, the arrival script, the copied addresses and the version link in the rail. The fixtures are made up (Slate, a package; Harbor, a product).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { ENDS, HARBOR, SLATE, SWEEP } from "../../../packages/react/test/release-fixture.mjs";
import { pageBody, releaseNotesHtml, versionLink } from "../../changelog/skill-body.mjs";
import { launch } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const SLATE_BODY = pageBody(SLATE, { form: "reference", product: "Slate" });
const HARBOR_BODY = pageBody(HARBOR, { form: "notes", product: "Harbor", running: "1.4.0" });

/** A composed page at a real address with a fragment, so arriving is a real fragment navigation. */
async function open(body, { fragment = "", width = 1440, javaScriptEnabled = true, scheme = "light", ...options } = {}) {
  const html = compose(`<title>Release notes</title>${body}`, { fonts: false }).html;
  const context = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, javaScriptEnabled, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
  await page.goto(`https://basalt.test/changelog?from=menu${fragment}`);
  if (javaScriptEnabled) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(50);
  return { page, context, errors };
}
const arrived = (page) => page.evaluate(() => ({ arrived: [...document.querySelectorAll("[data-arrived]")].map((el) => el.id), focused: document.activeElement?.id ?? null }));

describe("the markup and compose", () => {
  test("compose brings the module and the parts it stands on, and a version link alone brings the topbar module", () => {
    const page = compose(`<title>x</title>${SLATE_BODY}`, { fonts: false });
    for (const name of ["release", "disclosure", "callout", "popover", "dlist", "copy", "pane"]) assert.ok(page.modules.includes(name), `${name} in ${page.modules}`);
    assert.ok(!page.modules.includes("dialog-form"), "no module is brought by a name it shares");
    const link = compose(`<title>x</title>${versionLink({ version: "1.4.0", date: "2026-11-23", href: "/release-notes#v1.4.0" })}`, { fonts: false });
    assert.ok(link.modules.includes("topbar"));
    assert.ok(!link.modules.includes("release"));
  });

  test("the folds are written open: no hidden in the markup, and the panel holds its entries", () => {
    assert.doesNotMatch(SLATE_BODY, /\shidden[\s=>]/);
    assert.match(SLATE_BODY, /<button type="button" class="disclosure release-fold" aria-expanded="true" aria-controls="v0\.2\.0__fixed"><span>/);
    assert.match(HARBOR_BODY, /aria-controls="v1\.4\.0__all"><span>All changes<span class="release-count">/);
    // The version's name is its visible words, then where it goes.
    assert.match(versionLink({ version: "2.0.0-rc.2", date: "2026-12-03", href: "#v2.0.0-rc.2" }), /aria-label="Version 2\.0\.0-rc\.2, Dec 3, 2026, release notes"/);
    assert.match(versionLink({ version: "2.0.0-rc.2", date: "2026-12-03", href: "#" }), /2\.0\.0<wbr><span class="version-link-pre">-rc\.2<\/span>/);
  });

  test("without script every fold is open and the page reads whole", async () => {
    const { page, context } = await open(SLATE_BODY, { javaScriptEnabled: false });
    assert.equal(await page.locator('[id="pr49-1"]').isVisible(), true);
    await context.close();
  });

  test("with script the folds close to hidden until found, and a press opens one", async () => {
    const { page, context, errors } = await open(SLATE_BODY);
    const panel = page.locator('[id="v0.2.0__fixed"]');
    assert.equal(await panel.getAttribute("hidden"), "until-found");
    assert.equal(await page.locator('[id="pr49-1"]').isVisible(), false);
    const button = page.locator('[aria-controls="v0.2.0__fixed"]');
    assert.equal(await button.getAttribute("aria-expanded"), "false");
    await button.click();
    assert.equal(await panel.getAttribute("hidden"), null);
    assert.equal(await button.getAttribute("aria-expanded"), "true");
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("print opens every fold", async () => {
    const { page, context } = await open(HARBOR_BODY);
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator('[id="pr131-1"]').isVisible(), true);
    assert.equal(await page.locator(".release-copy").first().isVisible(), false);
    await context.close();
  });
});

describe("arriving", () => {
  test("an entry in a closed fold: the fold opens, the entry is focused and marked Linked", async () => {
    const { page, context, errors } = await open(SLATE_BODY, { fragment: "#pr49-1" });
    assert.deepEqual(await arrived(page), { arrived: ["pr49-1"], focused: "pr49-1" });
    assert.equal(await page.locator('[id="pr49-1"]').isVisible(), true);
    assert.equal(await page.locator('[id="pr49-1"] .release-word').isVisible(), true);
    assert.equal(await page.locator('[id="pr49-1"] .release-word').getAttribute("aria-hidden"), null);
    // An arrow key leaves the mark; a press ends it.
    await page.keyboard.press("ArrowDown");
    assert.deepEqual((await arrived(page)).arrived, ["pr49-1"]);
    await page.mouse.click(4, 4);
    assert.deepEqual((await arrived(page)).arrived, []);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("a release, a candidate's address opening the stable release, and an unknown or dotted fragment", async () => {
    let view = await open(HARBOR_BODY, { fragment: "#v1.4.0" });
    assert.deepEqual(await arrived(view.page), { arrived: ["v1.4.0"], focused: "v1.4.0" });
    await view.context.close();
    view = await open(HARBOR_BODY, { fragment: "#v2.0.0-rc.1" });
    assert.deepEqual((await arrived(view.page)).arrived, ["v2.0.0"]);
    await view.context.close();
    for (const fragment of ["#nothing", "#2026.11.23"]) {
      view = await open(SLATE_BODY, { fragment });
      assert.deepEqual((await arrived(view.page)).arrived, []);
      assert.deepEqual(view.errors, []);
      await view.context.close();
    }
  });

  test("a hashchange arrives again; the stable release's entry keeps the candidate's address", async () => {
    const { page, context } = await open(HARBOR_BODY, { fragment: "#v1.3.0" });
    await page.evaluate(() => { location.hash = "#pr142-1"; });
    await page.waitForTimeout(50);
    assert.deepEqual(await arrived(page), { arrived: ["pr142-1"], focused: "pr142-1" });
    await context.close();
  });
});

describe("copied addresses and the version link", () => {
  test("Copy link copies the window's address with no query, or the page's data-base", async () => {
    const { page, context } = await open(SLATE_BODY, { permissions: ["clipboard-read", "clipboard-write"] });
    await page.getByRole("button", { name: "Copy link to Slate 0.2.0" }).click();
    await page.waitForFunction(() => navigator.clipboard.readText().then((text) => text.length > 0));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "https://basalt.test/changelog#v0.2.0");
    await context.close();
    const based = await open(`<main class="page">${releaseNotesHtml(SLATE, { form: "reference", product: "Slate", base: "https://slate.example/changelog" })}</main>`, { permissions: ["clipboard-read", "clipboard-write"] });
    await based.page.getByRole("button", { name: "Copy link to Slate 0.2.1" }).click();
    await based.page.waitForFunction(() => navigator.clipboard.readText().then((text) => text.endsWith("v0.2.1")));
    assert.equal(await based.page.evaluate(() => navigator.clipboard.readText()), "https://slate.example/changelog#v0.2.1");
    await based.context.close();
  });

  test("in the rail the version link shows the number alone and its tooltip says the whole line", async () => {
    const shell = `<div class="app-shell"><aside class="app-sidebar"><div class="app-brand"><a class="brand" href="/" aria-label="Harbor home"><span class="brand-full">Harbor</span><span class="brand-rail">H</span></a></div>
      <div class="app-nav"><nav class="nav" aria-label="Primary"><ul class="nav-list"><li><a class="nav-item" href="/"><span class="nav-pill"><span data-glyph="home" data-size="24"></span><span class="nav-label">Home</span></span></a></li></ul></nav></div>
      <div class="app-account"><nav class="nav" aria-label="Account"><ul class="nav-list"><li><a class="nav-item" href="/settings"><span class="nav-pill"><span data-glyph="settings" data-size="24"></span><span class="nav-label">Settings</span></span></a></li></ul></nav>
      <div class="app-version">${versionLink({ version: "1.4.0", date: "2026-11-23", href: "/release-notes#v1.4.0", current: true })}</div></div></aside>
      <div class="app-column"><header class="app-header"><div class="app-bar"><h1 class="app-title">Release notes</h1></div></header><main class="app-main" id="main">${releaseNotesHtml(HARBOR, { form: "notes", product: "Harbor", running: "1.4.0" })}</main></div></div>`;
    const { page, context, errors } = await open(shell, { width: 820 });
    const link = page.locator(".app-version .version-link");
    assert.equal(await link.getAttribute("data-tooltip"), "Version 1.4.0 · Nov 23, 2026");
    assert.equal(await page.locator(".app-version .version-link-date").evaluate((el) => el.getBoundingClientRect().width), 1);
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.waitForTimeout(50);
    assert.equal(await link.getAttribute("data-tooltip"), null);
    await page.evaluate((source) => (0, eval)(source), axeSource);
    const violations = await page.evaluate(async () => (await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations.map((v) => v.id));
    assert.deepEqual(violations, []);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("the Sources panel: Safari's keyboard and touch", () => {
  test("in WebKit at 390, with Tab skipping links: Enter focuses the panel, Tab reaches Copy link to this change, Escape returns to the source line", async () => {
    const { webkit } = await import("playwright");
    const safari = await webkit.launch();
    try {
      const html = compose(`<title>Release notes</title>${SLATE_BODY}`, { fonts: false }).html;
      const context = await safari.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
      await page.goto("https://basalt.test/changelog");
      await page.waitForTimeout(100);
      const line = page.locator('[id="pr41-1"] .release-source');
      await line.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.activeElement?.classList.contains("release-sources"));
      // Tab walks the panel's own controls, links included, and reaches its button; focus never leaves the panel for the page.
      const walked = [];
      for (let step = 0; step < 8 && walked.at(-1) !== "Copy link to this change"; step++) {
        await page.keyboard.press("Tab");
        walked.push(await page.evaluate(() => (document.activeElement?.closest(".release-sources") ? document.activeElement.textContent.trim().replace(/Copied$/, "") : `outside: ${document.activeElement?.tagName}`)));
      }
      assert.deepEqual(walked, ["#41", "SL-112", "678c43d8", "Copy link to this change"].slice(0, walked.length));
      assert.equal(walked.at(-1), "Copy link to this change");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.classList.contains("release-source"));
      assert.equal(await page.evaluate(() => document.activeElement?.closest(".release-entry")?.id), "pr41-1");
      await context.close();
    } finally {
      await safari.close();
    }
  });

  test("on touch at 390 every link in the open panel is 44 tall to a finger", async () => {
    const { page, context } = await open(SLATE_BODY, { width: 390, hasTouch: true });
    await page.locator('[id="pr46-1"] .release-source').click();
    await page.locator(".release-sources:popover-open a").first().waitFor();
    const rows = await page.evaluate(() => {
      const owner = (x, y) => document.elementFromPoint(x, y)?.closest("a, button") ?? null;
      return [...document.querySelectorAll(".release-sources:popover-open a, .release-sources:popover-open button")].map((el) => {
        el.scrollIntoView({ block: "center" });
        const b = el.getBoundingClientRect();
        const cx = b.x + Math.min(b.width / 2, 20);
        const cy = b.y + b.height / 2;
        let top = cy;
        let bottom = cy;
        while (top > cy - 60 && owner(cx, top - 1) === el) top--;
        while (bottom < cy + 60 && owner(cx, bottom + 1) === el) bottom++;
        return { label: el.textContent.trim(), hit: owner(cx, cy) === el ? Math.round(bottom - top) + 1 : 0 };
      });
    });
    assert.ok(rows.length >= 6);
    assert.deepEqual(rows.filter((row) => row.hit < 44).map((row) => `${row.label}: ${row.hit}`), []);
    await context.close();
  });
});

describe("the spacing sweep (DECISIONS 326, round 68)", () => {
  for (const [width, touch] of [[1440, false], [390, false], [390, true]]) {
    test(`each box hugs what it shows (${width}${touch ? ", touch" : ""})`, async () => {
      for (const [name, body] of [["Slate", SLATE_BODY], ["Harbor", HARBOR_BODY]]) {
        const { page, context, errors } = await open(body, { width, hasTouch: touch });
        for (const button of await page.locator("[aria-controls][aria-expanded='false']").all()) if (await button.isVisible()) await button.click();
        const m = await page.evaluate(`(${SWEEP})("")`);
        assert.ok(m.copy.length >= 4, name);
        assert.deepEqual(m.copy.filter((c) => Math.abs(c.off) > 0.5), [], `${name}: Copy link's words end on the edge (68-1)`);
        assert.ok(m.callouts.length >= 1, name);
        for (const c of m.callouts) assert.ok(Math.abs(c.top - c.bottom) <= 0.5, `${name} ${c.id}: ${c.top} above, ${c.bottom} under (68-2)`);
        if (width === 1440) assert.equal(new Set(m.references.map((r) => r.x)).size, 1, `${name}: references start at ${[...new Set(m.references.map((r) => `${r.inCallout ? "callout " : ""}${r.x}`))]} (68-3)`);
        assert.deepEqual(m.padding.map((r) => r.bottom), [...m.padding.slice(1).map(() => "40px"), "0px"], `${name} (68-4)`);
        assert.ok(m.gaps.length >= 5, name);
        assert.equal(new Set(m.gaps.map((g) => g.gap)).size, 1, `${name}: ${m.gaps.map((g) => `${g.id}${g.linked ? " (linked)" : ""} ${g.gap}`).join(", ")} (68-5)`);
        assert.deepEqual(m.chips.filter((c) => !c.wider && c.lines !== 1).map((c) => c.text), [], `${name} (68-6)`);
        if (name === "Slate") assert.ok(m.chips.some((c) => c.text === "() => localStorage"), "the chip the sweep found split is measured");
        assert.deepEqual(errors, []);
        await context.close();
      }
    });
  }
});

describe("where a release ends (DECISIONS 331)", () => {
  const pressEndingFolds = (page) => page.evaluate(() => { for (const r of document.querySelectorAll(".release")) r.lastElementChild.querySelector(".release-fold")?.click(); });
  for (const [width, touch] of [[390, true], [820, true], [1440, false]]) {
    test(`every release's last line is space-10 above its divider, its folds open and closed (${width}${touch ? ", touch" : ""})`, async () => {
      for (const [name, body] of [["Slate", SLATE_BODY], ["Harbor", HARBOR_BODY]]) {
        const { page, context, errors } = await open(body, { width, hasTouch: touch, reducedMotion: "reduce" });
        const kinds = new Set();
        for (const state of ["closed", "open", "closed again"]) {
          if (state !== "closed") { await pressEndingFolds(page); await page.waitForTimeout(50); }
          const m = await page.evaluate(`(${ENDS})("")`);
          for (const e of m.ends) kinds.add(`${e.ends}${e.open === null ? "" : e.open ? " open" : " closed"}`);
          assert.ok(m.ends.length >= 3, name);
          assert.deepEqual(m.ends.filter((e) => Math.abs(e.gap - 40) > 0.5), [], `${name}, folds ${state}`);
        }
        if (name === "Slate") for (const kind of ["release-section", "release-section[data-folded] closed", "release-section[data-folded] open"]) assert.ok(kinds.has(kind), `${name}: ${kind} in ${[...kinds]}`);
        if (name === "Harbor") for (const kind of ["release-section", "release-all closed", "release-all open", "release-build closed", "release-build open"]) assert.ok(kinds.has(kind), `${name}: ${kind} in ${[...kinds]}`);
        assert.deepEqual(errors, []);
        await context.close();
      }
    });
  }

  test("on touch at 390: no tap box meets another target or crosses a rim or a divider, and a last change's lowest row is its own", async () => {
    for (const [name, body] of [["Slate", SLATE_BODY], ["Harbor", HARBOR_BODY]]) {
      const { page, context } = await open(body, { width: 390, hasTouch: true, javaScriptEnabled: false });
      const m = await page.evaluate(`(${ENDS})("")`);
      assert.ok(m.taps.length > 10, name);
      assert.deepEqual(m.taps.filter((t) => t.meets.length).map((t) => `${t.name} meets ${t.meets}`), [], name);
      assert.deepEqual(m.taps.filter((t) => t.insideRim < -0.5).map((t) => `${t.name}: ${t.insideRim}`), [], `${name}: past a callout's rim`);
      assert.deepEqual(m.taps.filter((t) => t.insideDivider < -0.5).map((t) => `${t.name}: ${t.insideDivider}`), [], `${name}: past a divider`);
      assert.deepEqual(m.taps.filter((t) => t.last && t.lowestRow !== "itself").map((t) => `${t.name}: ${t.lowestRow}`), [], name);
      await context.close();
    }
  });

  test("Build details' button is 44 tall on touch, as every fold's is", async () => {
    const { page, context } = await open(HARBOR_BODY, { width: 390, hasTouch: true });
    assert.equal(await page.locator(".release-build .release-fold").evaluate((el) => el.getBoundingClientRect().height), 44);
    await context.close();
  });

  for (const [width, touch] of [[390, true], [1440, false]]) {
    test(`a change that has arrived keeps its padding: its plate is equal above and under (${width}${touch ? ", touch" : ""})`, async () => {
      for (const [body, id] of [[SLATE_BODY, "pr43-1"], [SLATE_BODY, "pr52-1"], [HARBOR_BODY, "pr140-1"], [HARBOR_BODY, "pr143-1"]]) {
        const { page, context } = await open(body, { width, hasTouch: touch, fragment: `#${id}`, reducedMotion: "reduce" });
        const m = await page.evaluate(`(${ENDS})("")`);
        const plate = m.plates.find((p) => p.id === id);
        assert.ok(plate?.last, `${id} arrived, last in its list`);
        assert.ok(Math.abs(plate.above - plate.under) <= 0.5, `${id}: the plate is ${plate.above} above and ${plate.under} under`);
        await context.close();
      }
    });
  }

  test("an open fold's panel holds its first child's margin, so it moves what is under it by its own height alone", async () => {
    for (const width of [390, 1440]) {
      const { page, context } = await open(HARBOR_BODY, { width, hasTouch: width < 720, reducedMotion: "reduce" });
      const buttons = page.locator(".release .release-fold");
      const n = await buttons.count();
      assert.ok(n >= 2);
      for (let i = 0; i < n; i++) {
        const read = () => buttons.nth(i).evaluate((el) => {
          const release = el.closest(".release");
          const next = release.nextElementSibling;
          const panel = document.getElementById(el.getAttribute("aria-controls"));
          return { below: (next ?? release).getBoundingClientRect()[next ? "top" : "bottom"], panel: panel.hasAttribute("hidden") ? 0 : panel.getBoundingClientRect().height };
        });
        const before = await read();
        await buttons.nth(i).evaluate((el) => el.click());
        const after = await read();
        assert.ok(Math.abs(after.below - before.below - (after.panel - before.panel)) <= 0.5, `fold ${i} at ${width}: moved ${after.below - before.below} for ${after.panel - before.panel}`);
        await buttons.nth(i).evaluate((el) => el.click());
      }
      await context.close();
    }
  });
});
