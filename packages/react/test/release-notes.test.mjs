// A page of releases (DECISIONS 320, section 2): ReleaseNotes in both forms from the made-up fixtures (Slate, a package; Harbor, a product),
// driven in Chromium against the built package with the real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { HARBOR, RUNNING_BUILD, SLATE, harborShell } from "./release-fixture.mjs";
import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const DATA = `const HARBOR = ${JSON.stringify(HARBOR)}; const SLATE = ${JSON.stringify(SLATE)}; const RUNNING_BUILD = ${JSON.stringify(RUNNING_BUILD)};`;
const app = (jsx) => `${DATA} document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function App() { ${jsx} }
createRoot(document.getElementById("root")).render(<App />);`;
/** Slate's changelog on a site page: the versions in the pane beside it, or in a fold above it. */
const SLATE_PAGE = (more = "") => `return <main style={{ boxSizing: "border-box", width: "100%", maxWidth: 1200, margin: "0 auto", padding: "48px 16px" }}>
  <B.PaneLayout pane={<B.ReleaseIndex releases={SLATE} />} paneLabel="Versions"><B.ReleaseIndex releases={SLATE} form="fold" /><B.ReleaseNotes releases={SLATE} form="reference" product="Slate" baseHref="https://slate.example/changelog" ${more} /></B.PaneLayout></main>;`;
const open = async (jsx, { theme = "light", width = 1440, height = 900, ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, app(jsx), { theme, viewport: { width, height }, standards: true, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** What a part draws, as a reader sees it: the dots of DotSep as " · ", a count after its name, and nothing that is visually hidden. */
const DRAWN = (el) => {
  const copy = el.cloneNode(true);
  copy.querySelectorAll(".basalt-visually-hidden").forEach((n) => n.remove());
  copy.querySelectorAll(".basalt-dot-sep").forEach((n) => n.replaceWith(" · "));
  copy.querySelectorAll(".basalt-release-count, .basalt-badge").forEach((n) => n.before(" "));
  return copy.textContent.replace(/\s+/g, " ").trim();
};
const words = (locator) => locator.evaluate(DRAWN);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
/** Open every fold on the page (the releases' and the versions'). */
const openAll = async (page) => {
  for (let round = 0; round < 3; round++) {
    const closed = page.locator(".basalt-release-notes .basalt-accordion-trigger:not([data-panel-open]), .basalt-release-index .basalt-accordion-trigger:not([data-panel-open])");
    const n = await closed.count();
    if (!n) break;
    for (let i = 0; i < n; i++) await closed.first().evaluate((el) => el.click());
    await settle(page);
  }
};
/** An accessible name as Chrome computes it: a visually hidden comma or colon stands apart from the words before it ("0.2.0 , Nov 16"). */
const named = (text) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/([,:])/g, "\\s*$1")}$`);
const release = (page, id) => page.locator(`[id="${id}"]`);
const headings = (locator, level) => locator.locator(`h${level}`).evaluateAll((els, drawn) => els.map((el) => new Function(`return (${drawn})`)()(el)), DRAWN.toString());

describe("the two forms from one record", () => {
  test("a heading holds the number and the date (and a product's headline), so a reader moving by headings hears which release and when", async () => {
    const slate = await open(SLATE_PAGE());
    assert.equal(await slate.getByRole("heading", { name: named("0.2.0, Nov 16, 2026"), level: 2 }).count(), 1);
    assert.equal(await slate.getByRole("heading", { name: named("0.2.1, Nov 16, 2026"), level: 2 }).count(), 1);
    assert.equal(await slate.getByRole("heading", { name: "Unreleased", exact: true, level: 2 }).count(), 1);
    const harbor = await open(harborShell());
    assert.equal(await harbor.getByRole("heading", { name: named("1.4.0, Nov 23, 2026: A monitor can open an incident room"), level: 2 }).count(), 1);
    assert.equal(await harbor.getByRole("heading", { name: named("1.4.1, Dec 8, 2026"), level: 2 }).count(), 1);
    // A product's page never shows Unreleased.
    assert.equal(await harbor.getByRole("heading", { name: "Unreleased" }).count(), 0);
  });

  test("the counts are computed from the list, with their singulars", async () => {
    const slate = await open(SLATE_PAGE());
    assert.equal(await words(release(slate, "v0.2.0").locator(".basalt-release-meta")), "Nov 16, 2026 · 14 changes · 4 need action");
    assert.equal(await words(release(slate, "v0.2.1").locator(".basalt-release-meta")), "Nov 16, 2026 · 1 change");
    assert.equal(await words(release(slate, "v0.1.0").locator(".basalt-release-meta")), "Nov 2, 2026");
    assert.equal(await release(slate, "v0.2.0").getByRole("link", { name: "4 need action" }).getAttribute("href"), "#v0.2.0__action");
    const harbor = await open(harborShell());
    assert.equal(await words(release(harbor, "v1.3.0").locator("p.basalt-release-meta:not(.basalt-release-number-line)")), "2 changes · 1 needs action");
    assert.equal(await words(release(harbor, "v1.4.0").locator("p.basalt-release-meta:not(.basalt-release-number-line)")), "5 changes Your version");
    // Releases highest first by precedence: a backport to 1.x sits under 2.0.0 though it shipped after it.
    assert.deepEqual(await harbor.locator(".basalt-release").evaluateAll((els) => els.map((el) => el.id)), ["v2.0.0", "v1.4.1", "v1.4.0", "v1.3.1", "v1.3.0"]);
  });

  test("a package's order: the summary, Action needed opening with the upgrade line, then Deprecated, Added, Changed and Fixed", async () => {
    const page = await open(SLATE_PAGE());
    const own = release(page, "v0.2.0");
    const order = await own.evaluate((el) => [...el.children].map((child) => child.className.split(" ").find((name) => name.startsWith("basalt-release-")) ?? child.className));
    assert.deepEqual(order, ["basalt-release-head", "basalt-release-summary", "basalt-release-action", "basalt-release-section", "basalt-release-section", "basalt-release-section", "basalt-release-section"]);
    assert.deepEqual(await headings(own, 3), ["Action needed 4", "Deprecated 1", "Added 3", "Changed 1", "Fixed 5"]);
    assert.equal(await words(own.locator(".basalt-release-upgrade")), "Before upgrading from 0.1.0, check these 4 changes.");
    // An action entry stands there and nowhere else in its release.
    assert.equal(await own.locator('[id="pr41-1"]').count(), 1);
    assert.equal(await own.locator('.basalt-release-action [id="pr41-1"]').count(), 1);
    // A release with no entries is its summary, never a heading over nothing.
    assert.equal(await words(release(page, "v0.1.0").locator(".basalt-release-summary")), "The first version in this changelog. Earlier work is in the repository's history.");
  });

  test("a product's order: the header, Action needed, the paragraphs, then one fold holding the summary and the list", async () => {
    const page = await open(harborShell());
    const own = release(page, "v1.4.0");
    const order = await own.evaluate((el) => [...el.children].map((child) => child.className.split(" ").find((name) => name.startsWith("basalt-release-"))));
    assert.deepEqual(order, ["basalt-release-head", "basalt-release-audience", "basalt-release-audience", "basalt-release-audience", "basalt-release-all", "basalt-release-build"]);
    assert.deepEqual(await headings(own, 3), ["For responders", "For admins", "All changes 5", "Build details"]);
    // The summary is the first thing inside the fold.
    await own.getByRole("button", { name: "All changes 5" }).click();
    await settle(page);
    const inside = await own.locator(".basalt-release-all .basalt-accordion-content").evaluate((el) => [...el.children].map((child) => child.className));
    assert.equal(inside[0], "basalt-release-summary");
    assert.deepEqual(await headings(own.locator(".basalt-release-all"), 4), ["Added 2", "Changed 1", "Fixed 2"]);
    const withAction = release(page, "v2.0.0");
    const order2 = await withAction.evaluate((el) => [...el.children].map((child) => child.className.split(" ").find((name) => name.startsWith("basalt-release-"))));
    assert.deepEqual(order2, ["basalt-release-head", "basalt-release-action", "basalt-release-audience", "basalt-release-audience", "basalt-release-all"]);
  });

  test("the folds: Fixed past 3 in a release of more than 10, a product's list behind one fold, and Action needed never folded", async () => {
    const slate = await open(SLATE_PAGE());
    const folds = await slate.locator(".basalt-release-notes .basalt-accordion-trigger").evaluateAll((els, drawn) => els.map((el) => new Function(`return (${drawn})`)()(el)), DRAWN.toString());
    assert.deepEqual(folds, ["Fixed 5"]);
    assert.equal(await slate.locator('[id="pr49-1"]').isVisible(), false, "closed");
    assert.equal(await slate.locator(".basalt-release-action").isVisible(), true);
    assert.equal(await slate.locator(".basalt-accordion-panel .basalt-release-action, .basalt-accordion-panel [id='pr41-1']").count(), 0, "no action entry in a fold");
    const harbor = await open(harborShell());
    assert.equal(await harbor.locator(".basalt-accordion-panel .basalt-release-action").count(), 0);
    // A patch with no paragraphs shows its summary and its list open, even with four fixes.
    assert.equal(await release(harbor, "v1.3.1").locator(".basalt-accordion-trigger").count(), 0);
  });

  test("the fold is named for what it opens: Other changes when actions stand above it, and its count is what it opens", async () => {
    const page = await open(harborShell());
    for (const [id, name, count] of [["v1.4.0", "All changes", 5], ["v1.3.0", "Other changes", 1], ["v2.0.0", "Other changes", 3]]) {
      const own = release(page, id);
      const trigger = own.locator(".basalt-release-all .basalt-accordion-trigger");
      assert.equal(await words(trigger), `${name} ${count}`, id);
      await trigger.click();
      await settle(page);
      assert.equal(await own.locator(".basalt-release-all .basalt-release-entry").count(), count, `${id} opens ${count}`);
    }
    // The header keeps the release's totals.
    assert.equal(await words(release(page, "v1.3.0").locator("p.basalt-release-meta:not(.basalt-release-number-line)")), "2 changes · 1 needs action");
  });

  test("the number in a headline's meta line is Geist; standing alone it is mono", async () => {
    const page = await open(harborShell());
    const family = (locator) => locator.evaluate((el) => getComputedStyle(el).fontFamily);
    assert.doesNotMatch(await family(release(page, "v1.4.0").locator(".basalt-release-number-line")), /mono/i);
    assert.match(await family(release(page, "v1.4.1").locator(".basalt-release-version")), /mono/i);
  });
});

describe("entries and their sources", () => {
  test("at 1440 the words keep one measure down each list, and the sources start on one edge", async () => {
    const page = await open(SLATE_PAGE());
    await openAll(page);
    const lists = await page.locator(".basalt-release-notes .basalt-release-list").evaluateAll((els) => els.map((list) => {
      const texts = [...list.querySelectorAll(":scope > .basalt-release-entry > .basalt-release-entry-words")].map((el) => Math.round(el.getBoundingClientRect().width));
      const sources = [...list.querySelectorAll(":scope > .basalt-release-entry > .basalt-release-source-cell")].map((el) => Math.round(el.getBoundingClientRect().left));
      return { texts: [...new Set(texts)], sources: [...new Set(sources)] };
    }));
    for (const list of lists) {
      assert.equal(list.texts.length, 1, `one measure: ${list.texts}`);
      assert.equal(list.sources.length, 1, `one edge: ${list.sources}`);
    }
  });

  test("at 390 the source line is its own line under the words, on their start edge", async () => {
    const page = await open(SLATE_PAGE(), { width: 390, height: 844 });
    const entry = page.locator('[id="pr41-1"]');
    const text = await box(entry.locator(".basalt-release-entry-text"));
    const source = await box(entry.locator(".basalt-release-source"));
    assert.ok(source.y > text.y, "under the words");
    assert.equal(Math.round(source.x), Math.round(text.x));
    assert.ok(text.width > 280, `the words get the width: ${text.width}`);
  });

  test("the source line: the pull request, at most two tickets, then 3 more; its name is its text after Sources, described by the entry", async () => {
    const page = await open(SLATE_PAGE());
    const tokens = page.locator('[id="pr46-1"] .basalt-release-source');
    assert.equal(await words(tokens), "#46 · DS-27 · DS-31 · 3 more");
    // The name is the visible words after a hidden "Sources: ", each dot read as a comma.
    assert.equal(await page.getByRole("button", { name: named("Sources: #46, DS-27, DS-31, 3 more") }).count(), 1);
    assert.equal(await tokens.getAttribute("aria-describedby"), "pr46-1__words");
    // An entry with no pull request leads with its commit; an unreleased one with nothing to show has no line.
    assert.match(await words(page.locator('[id="docs-contrast-note"] .basalt-release-source')), /^[0-9a-f]{8}$/);
    const family = await tokens.evaluate((el) => getComputedStyle(el).fontFamily);
    assert.match(family, /mono/i);
  });

  test("the sources panel: Pull request, Tickets, Commit and Author when there is one; none of the rejected rows; Copy link to this change", async () => {
    const page = await open(SLATE_PAGE());
    await page.locator('[id="pr41-1"] .basalt-release-source').click();
    let panel = page.locator(".basalt-release-sources");
    await panel.waitFor();
    await settle(page);
    const terms = () => panel.locator("dt").evaluateAll((els) => els.map((el) => el.textContent));
    assert.deepEqual(await terms(), ["Pull request", "Tickets", "Commit", "Author"]);
    assert.deepEqual(await panel.locator("dd").evaluateAll((els) => els.map((el) => el.textContent.replace(/\s+/g, " ").trim())).then((list) => list.slice(0, 3)), ["#41", "Linear SL-112", "Jira PRJ-88"]);
    assert.equal(await panel.getByRole("link", { name: "SL-112" }).getAttribute("href"), "https://linear.app/example/issue/SL-112");
    assert.equal(await panel.getByRole("link", { name: "PRJ-88" }).count(), 0, "a text tracker is not linked");
    assert.match(await words(panel), /Sam Rivera/);
    assert.doesNotMatch(await words(panel), /Built by|Code review|Edited by|Decision/);
    assert.equal(await panel.getByRole("button", { name: "Copy link to this change" }).count(), 1);
    // Focus moved into the panel; Escape returns it to the source line.
    assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest(".basalt-release-sources"))), true);
    await page.keyboard.press("Escape");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.closest(".basalt-release-entry")?.id), "pr41-1");
    // An entry with no author has no Author row.
    await page.locator('[id="pr42-1"] .basalt-release-source').click();
    panel = page.locator(".basalt-release-sources");
    await panel.waitFor();
    assert.deepEqual(await terms(), ["Pull request", "Commit"]);
  });

  test("copied addresses: the app's base, or the window's when a button is pressed, with no query", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    await page.route("https://slate.example/**", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><head></head><body><div id=root></div></body></html>" }));
    await page.goto("https://slate.example/changelog?from=menu");
    await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8") });
    await page.addScriptTag({ content: await bundleFixture(app(`return <B.ReleaseNotes releases={SLATE} form="reference" product="Slate" />;`)) });
    await settle(page);
    await page.getByRole("button", { name: "Copy link to Slate 0.2.0" }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "https://slate.example/changelog#v0.2.0");
    // The page changes its route with the part still drawn: the address is read when the button is pressed, for a release and for an entry.
    await page.evaluate(() => history.pushState({}, "", "/new-notes?context=two"));
    await page.getByRole("button", { name: "Copy link to Slate 0.2.1" }).click();
    await page.waitForFunction(() => navigator.clipboard.readText().then((text) => text.endsWith("#v0.2.1")));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "https://slate.example/new-notes#v0.2.1");
    await page.locator('[id="pr41-1"] .basalt-release-source').click();
    await page.getByRole("button", { name: "Copy link to this change" }).click();
    await page.waitForFunction(() => navigator.clipboard.readText().then((text) => text.endsWith("#pr41-1")));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "https://slate.example/new-notes#pr41-1");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Copy link to Unreleased" }).click();
    await page.waitForFunction(() => navigator.clipboard.readText().then((text) => text.endsWith("#unreleased")));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "https://slate.example/new-notes#unreleased");
    await context.close();
    // An app that gives its address: that is what is copied, whatever the window's is.
    const other = await open(harborShell());
    await other.evaluate(() => { window.copied = []; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text) => { window.copied.push(text); } }, configurable: true }); });
    await other.getByRole("button", { name: "Copy link to Harbor 1.4.0" }).click();
    await other.waitForFunction(() => window.copied.length === 1);
    assert.deepEqual(await other.evaluate(() => window.copied), ["https://harbor.example/release-notes#v1.4.0"]);
  });
});

describe("the header, the lazy panel and long sources", () => {
  for (const [width, touch] of [[1440, false], [390, false], [390, true]]) {
    test(`Copy link is centred on the header's first line, which alone makes room for it (${width}${touch ? ", touch" : ""})`, async () => {
      for (const [jsx, ids] of [[harborShell(), ["v1.4.0", "v1.4.1"]], [SLATE_PAGE(), ["v0.2.0", "unreleased"]]]) {
        const page = await open(jsx, { width, height: 900, hasTouch: touch });
        for (const id of ids) {
          const r = await page.locator(`[id="${id}"]`).evaluate((el) => {
            const box = (n) => n.getBoundingClientRect();
            const first = el.querySelector(".basalt-release-number-line, .basalt-release-heading:not([data-headline])");
            const copy = el.querySelector(".basalt-release-copy");
            const title = el.querySelector(".basalt-release-title");
            const centre = (n) => box(n).top + box(n).height / 2;
            return { off: Math.abs(centre(copy) - centre(first)), title: title ? box(title.closest("h2, h3")).width : null, release: box(el).width, firstTop: box(first).top, headTop: box(el.querySelector(".basalt-release-head")).top };
          });
          assert.ok(r.off <= 1, `${id}: Copy link is ${r.off}px off the first line`);
          assert.equal(Math.round(r.firstTop), Math.round(r.headTop), `${id}: the first line is the header's top`);
          if (r.title !== null) assert.ok(Math.abs(r.title - Math.min(r.release, 824)) <= 1, `${id}: the headline takes the release's width (${r.title} of ${r.release})`);
        }
      }
    });
  }

  test("the Sources popup is not on the page until a reader asks; the first press, or Enter, opens it with focus on the panel", async () => {
    const page = await open(SLATE_PAGE());
    assert.equal(await page.locator(".basalt-release-sources").count(), 0);
    const line = page.locator('[id="pr45-1"] .basalt-release-source');
    assert.equal(await line.getAttribute("aria-haspopup"), "dialog");
    assert.equal(await line.getAttribute("aria-expanded"), "false");
    await line.focus();
    await page.keyboard.press("Enter");
    await page.locator(".basalt-release-sources").waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-release-sources"));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.activeElement?.closest?.(".basalt-release-entry")?.id === "pr45-1");
    assert.equal(await page.locator('[id="pr45-1"] .basalt-release-source').getAttribute("aria-expanded"), "false");
  });

  test("on touch at 390 every link in the open Sources panel is 44 tall to a finger, and none takes another's taps", async () => {
    const page = await open(SLATE_PAGE(), { width: 390, height: 844, hasTouch: true });
    await page.locator('[id="pr46-1"] .basalt-release-source').click();
    await page.locator(".basalt-release-sources a").first().waitFor();
    await settle(page);
    const rows = await page.evaluate(() => {
      const owner = (x, y) => document.elementFromPoint(x, y)?.closest("a, button") ?? null;
      return [...document.querySelectorAll(".basalt-release-sources a, .basalt-release-sources button")].map((el) => {
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
    assert.ok(rows.length >= 6, `${rows.length} controls`);
    assert.deepEqual(rows.filter((row) => row.hit < 44).map((row) => `${row.label}: ${row.hit}`), []);
  });

  test("a long source id keeps to the release's width beside the words, and breaks inside itself", async () => {
    const long = `PRJ-${"9".repeat(100)}`;
    const release = { version: "3.0.0", date: "2026-12-01", entries: [{ id: "pr60-1", type: "fixed", bump: "patch", area: "List", text: "Fixed the list losing its place", pr: { number: 60, href: "https://example.test/pull/60" }, tickets: [{ tracker: "Jira", label: long }] }] };
    for (const width of [1000, 1440]) {
      const page = await open(`return <div style={{ padding: 16 }}><B.ReleaseNotes releases={${JSON.stringify([release])}} form="reference" product="Slate" /></div>;`, { width });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      const list = await box(page.locator(".basalt-release-list"));
      const source = await box(page.locator(".basalt-release-source"));
      assert.ok(source.right <= list.right + 0.5, `the source line ends inside the list (${source.right} of ${list.right})`);
    }
  });

  test("a product's patch with no paragraphs shows its list open, however many fixes", async () => {
    const fixes = Array.from({ length: 11 }, (_, index) => ({ id: `pr${70 + index}-1`, type: "fixed", bump: "patch", area: "Rooms", text: `Fixed the room timer in case ${index + 1}` }));
    const page = await open(`return <B.ReleaseNotes releases={${JSON.stringify([{ version: "1.4.2", date: "2026-12-09", summary: "Fixes to the room timer.", entries: fixes }])}} form="notes" product="Harbor" />;`);
    assert.equal(await page.locator(".basalt-accordion-trigger").count(), 0);
    assert.equal(await page.locator(".basalt-release-entry").count(), 11);
  });
});

describe("Build details", () => {
  test("on the release this session runs and no other, with the app's rows, and Copy build details", async () => {
    const page = await open(harborShell());
    assert.equal(await page.locator(".basalt-release-build").count(), 1);
    const own = release(page, "v1.4.0");
    assert.equal(await own.locator(".basalt-release-build").count(), 1);
    await own.getByRole("button", { name: "Build details" }).click();
    await settle(page);
    assert.deepEqual(await own.locator(".basalt-release-build dt").evaluateAll((els) => els.map((el) => el.textContent)), ["Build", "Commit", "Basalt"]);
    assert.deepEqual(await own.locator(".basalt-release-build dd").evaluateAll((els) => els.map((el) => el.textContent)), ["1.4.0+9f3c1e2", "9f3c1e2a7d04", "0.2.0"]);
    assert.equal(await own.getByRole("button", { name: "Copy build details" }).count(), 1);
    assert.equal(await page.getByText("Your version").count(), 1);
  });

  test("a running build between two releases: Build details stands above the first release", async () => {
    const page = await open(harborShell({ running: "1.4.2", date: "2026-12-09" }));
    const first = await page.locator(".basalt-release-notes").evaluate((el) => el.firstElementChild.className);
    assert.equal(first, "basalt-release-build");
    assert.equal(await page.locator(".basalt-release .basalt-release-build").count(), 0);
    assert.equal(await page.getByText("Your version").count(), 0);
  });
});

describe("widths, modes and touch", () => {
  for (const width of [390, 360, 320]) {
    test(`no sideways scroll at ${width}, every fold open, plain and under WCAG 1.4.12 text spacing`, async () => {
      for (const jsx of [SLATE_PAGE(), harborShell()]) {
        const page = await open(jsx, { width, height: 800 });
        await openAll(page);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" });
        await settle(page);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, "under text spacing");
        const outside = await page.evaluate((w) => [...document.querySelectorAll(".basalt-release-notes *")].filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.right > w + 0.5) && getComputedStyle(el).visibility !== "hidden" && !el.closest(".basalt-visually-hidden"); }).map((el) => el.className).slice(0, 5), width);
        assert.deepEqual(outside, []);
      }
    });
  }

  test("forced colours: the source line and links keep their underline", async () => {
    const page = await open(SLATE_PAGE(), { forcedColors: "active" });
    assert.equal(await page.locator('[id="pr41-1"] .basalt-release-id').first().evaluate((el) => getComputedStyle(el).textDecorationLine), "underline");
    assert.equal(await page.locator('[id="pr41-1"] .basalt-release-migrate').evaluate((el) => getComputedStyle(el).textDecorationLine), "underline");
  });

  test("print: every fold is open, Copy buttons are not printed, and a source line prints as text", async () => {
    const page = await open(harborShell());
    await page.emulateMedia({ media: "print" });
    await settle(page);
    assert.equal(await page.locator('[id="pr131-1"]').isVisible(), true, "inside All changes");
    assert.equal(await page.locator('[id="pr143-1"]').isVisible(), true);
    assert.equal(await page.locator(".basalt-release-copy").first().isVisible(), false);
    assert.equal(await page.locator(".basalt-release-id").first().evaluate((el) => getComputedStyle(el).textDecorationLine), "none");
  });

  test("without script every fold is open: the server's markup has no closed panel", async () => {
    const { renderToString } = createRequire(import.meta.url)("react-dom/server");
    const React = createRequire(import.meta.url)("react");
    const B = await import(path.join(pkg, "dist", "index.js"));
    const html = renderToString(React.createElement(B.ReleaseNotes, { releases: HARBOR, form: "notes", product: "Harbor", running: "1.4.0", runningBuild: RUNNING_BUILD }));
    assert.doesNotMatch(html, /hidden="until-found"|hidden=""/);
    assert.match(html, /id="pr131-1"/);
  });

  for (const theme of ["light", "dark"]) {
    test(`axe finds nothing on either page, folds open (${theme})`, async () => {
      for (const jsx of [SLATE_PAGE(), harborShell()]) {
        const page = await open(jsx, { theme });
        await openAll(page);
        assert.deepEqual(await axe(page), []);
        assert.deepEqual(page.errors, []);
      }
    });
  }

  // The probe of proofs/targets.mjs: for every control of the releases, on a touch screen, the rows of its own drawn words that a tap sends to
  // another control, and its height to a finger.
  const probe = (page) => page.evaluate(() => {
    const label = (el) => (el.getAttribute("aria-label") || el.textContent).replace(/\s+/g, " ").trim().slice(0, 48);
    const owner = (x, y) => document.elementFromPoint(x, y)?.closest("a, button") ?? null;
    const controls = [...document.querySelectorAll(".basalt-release a, .basalt-release button")].filter((el) => el.offsetParent && !el.closest(".basalt-popover"));
    const rows = [];
    for (const el of controls) {
      el.scrollIntoView({ block: "center" });
      const rects = [];
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.data.trim() || n.parentElement.closest(".basalt-visually-hidden, [hidden]")) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) rects.push(r);
      }
      if (!rects.length) continue;
      let stolen = 0;
      const thieves = new Set();
      for (const r of rects) for (let y = Math.ceil(r.top); y < Math.floor(r.bottom); y++) {
        let lost = false;
        for (let x = Math.ceil(r.left) + 1; x < Math.floor(r.right); x += 3) { const o = owner(x, y + 0.5); if (o && o !== el) { lost = true; thieves.add(label(o)); } }
        if (lost) stolen++;
      }
      const b = el.getBoundingClientRect();
      const cx = b.x + Math.min(b.width / 2, 20);
      const cy = (rects[0].top + rects[rects.length - 1].bottom) / 2;
      let top = cy;
      let bottom = cy;
      while (top > cy - 60 && owner(cx, top - 1) === el) top--;
      while (bottom < cy + 60 && owner(cx, bottom + 1) === el) bottom++;
      rows.push({ control: label(el), stolen, to: [...thieves], hit: owner(cx, cy) === el ? Math.round(bottom - top) + 1 : 0 });
    }
    return rows;
  });

  for (const width of [390, 360, 820]) {
    test(`on touch at ${width}: no control receives a tap on another's words, and every control is at least 44 tall to a finger`, async () => {
      for (const jsx of [SLATE_PAGE(), harborShell()]) {
        const page = await open(jsx, { width, height: 844, hasTouch: true });
        await openAll(page);
        const rows = await probe(page);
        assert.ok(rows.length > 10);
        assert.deepEqual(rows.filter((row) => row.stolen > 0), []);
        assert.deepEqual(rows.filter((row) => row.hit < 44).map((row) => `${row.control}: ${row.hit}`), []);
      }
    });
  }

  test("on touch at 390: a tap on the bottom edge of How to migrate reaches the link and not Sources", async () => {
    const page = await open(SLATE_PAGE(), { width: 390, height: 844, hasTouch: true });
    const link = page.locator('[id="pr41-1"] .basalt-release-migrate');
    await link.scrollIntoViewIfNeeded();
    const words = await link.locator(".basalt-link-label").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 1 }; });
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a, button")?.className, words);
    assert.match(hit, /basalt-release-migrate/);
  });
});
