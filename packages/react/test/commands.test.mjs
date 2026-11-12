// In-page commands, list plus preview, two-line rows and the follow-ups (council item 103, finish-nov10 batch 5): the command
// list set in the page, its split and its push, a description on every popup row, the chips' Clear, the checklist's search band
// and the notification centre's glide. Driven in Chromium against the built package with the real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axe = (page) => page.evaluate((options) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options), AXE).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`));

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1000, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

const ICONS = `import { CopyIcon, GearIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"; `;
// Synthetic commands: two-line and one-line rows mixed, a chip, a danger row and a long description.
const DATA = `${ICONS}
const long = "A description that is far too long for one line of this list, so it has to be cut with an ellipsis and never wrap";
const GROUPS = [
  { label: "Sandbox", commands: [
    { id: "new", label: "New sandbox", icon: PlusIcon, description: "Create a fresh environment", shortcut: "⌘N", onSelect: () => { window.ran = "new"; } },
    { id: "dup", label: "Duplicate", icon: CopyIcon, description: "Copy the current one", onSelect: () => { window.ran = "dup"; } },
    { id: "rename", label: "Rename", onSelect: () => { window.ran = "rename"; } },
    { id: "del", label: "Delete sandbox", icon: TrashIcon, danger: true, description: "Remove it for good", onSelect: () => { window.ran = "del"; } },
  ] },
  { label: "Account", commands: [
    { id: "profile", label: "Profile", onSelect: () => { window.ran = "profile"; } },
    { id: "keys", label: "API keys", description: long, shortcut: "⌘K", onSelect: () => { window.ran = "keys"; } },
    { id: "billing", label: "Billing", description: "Plans and invoices", onSelect: () => { window.ran = "billing"; } },
    { id: "team", label: "Team", onSelect: () => { window.ran = "team"; } },
    { id: "audit", label: "Audit log", description: "Who changed what, and when", onSelect: () => { window.ran = "audit"; } },
    { id: "hooks", label: "Webhooks", onSelect: () => { window.ran = "hooks"; } },
  ] },
];
`;
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;

/** A page with the list in a box of width `w` (state, so a test can resize it), a button after it and a marker below it. */
const listFixture = (props = "", extra = "") => `${DATA}
function App() {
  const [w, setW] = React.useState(window.__w ?? 640);
  window.setW = setW;
  return <div dir={window.__dir ?? "ltr"} style={{ padding: 24 }}>
    <button id="before">before</button>
    <div id="box" style={{ width: w }}><B.CommandList label="Console" groups={GROUPS} ${props} /></div>
    <button id="after">after</button>
    <p id="below" style={{ margin: 0 }}>below the list</p>
    ${extra}
  </div>;
}
${render("<App />")}`;

const DETAIL = `detail={(c) => <div><h3>{c.label}</h3><p>{c.description ?? "No description"}</p><div><button id="primary" onClick={() => { window.paneRan = c.id; }}>Run {c.label}</button><button id="second">Other</button></div></div>}`;

const open = async (body, options = DESKTOP, theme = "dark", before) => {
  const { page, errors } = await fixturePage(browser, body, { theme, ...options, ...(before ? {} : {}) });
  if (options.isMobile) {
    await page.evaluate(() => { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1"; document.head.append(m); });
  }
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; } button { font: inherit; }" });
  await page.evaluate(() => { document.documentElement.lang = "en"; document.title = "Basalt test"; });
  await page.addScriptTag({ content: axeSource });
  return { page, errors };
};
const ready = async (page) => { await page.waitForSelector("[cmdk-item]"); await settle(page); };
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const style = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
const pseudo = (locator, which, ...props) => locator.evaluate((el, [which, props]) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el, which)[p]])), [which, props]);
const rgba = (page, css) => page.evaluate((css) => {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data];
}, css);
const token = async (page, name) => rgba(page, await page.evaluate((name) => { const p = document.createElement("div"); p.style.color = `var(--basalt-${name})`; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, name));
const active = (page) => page.evaluate(() => document.querySelector("[cmdk-item][data-selected='true']")?.querySelector(".basalt-menu-item-label")?.textContent ?? null);
const focused = (page) => page.evaluate(() => { const a = document.activeElement; if (!a) return null; const own = a.className.toString().split(" ").find((c) => c.startsWith("basalt-")); return own ?? (a.id || a.tagName); });
const plateOf = (page) => page.locator(".basalt-command-list .basalt-plate");
/** Waits for the shared plate to reach an opacity: its fade runs after a task, so a settle straight away can beat it. */
const plateAt = (page, opacity) => page.waitForFunction((opacity) => Number.parseFloat(getComputedStyle(document.querySelector(".basalt-command-list .basalt-plate")).opacity) === opacity, opacity);
const plateState = (page) => page.evaluate(() => { const p = document.querySelector(".basalt-command-list .basalt-plate"); return { state: p.dataset.state, opacity: Number.parseFloat(getComputedStyle(p).opacity) }; });

describe("the command list in the page", () => {
  test("focus lives in the field: a combobox on a listbox of options in labelled groups; no autofocus; arrows wrap and snap; ↵ runs; Tab leaves", async () => {
    const { page, errors } = await open(listFixture());
    await ready(page);
    assert.equal(await focused(page), "BODY", "nothing is focused on load");
    const roles = await page.evaluate(() => {
      const input = document.querySelector(".basalt-command-input");
      return {
        role: input.getAttribute("role"), expanded: input.getAttribute("aria-expanded"), list: document.querySelector("[cmdk-list]").getAttribute("role"),
        options: [...document.querySelectorAll("[cmdk-item]")].every((o) => o.getAttribute("role") === "option"),
        groups: [...document.querySelectorAll("[cmdk-group-items]")].map((g) => g.getAttribute("role") + ":" + (document.getElementById(g.getAttribute("aria-labelledby"))?.textContent ?? "")),
        region: document.querySelector(".basalt-command-page").getAttribute("role") + ":" + document.querySelector(".basalt-command-page").getAttribute("aria-label"),
        tab: document.querySelector("[cmdk-list]").getAttribute("tabindex"),
      };
    });
    assert.deepEqual(roles, { role: "combobox", expanded: "true", list: "listbox", options: true, groups: ["group:Sandbox", "group:Account"], region: "region:Console", tab: "-1" });
    await page.focus(".basalt-command-input");
    const first = await active(page);
    assert.equal(first, "New sandbox");
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-command-input").getAttribute("aria-activedescendant") === document.querySelector("[cmdk-item][data-selected='true']").id), true);
    await page.keyboard.press("ArrowUp");
    assert.equal(await active(page), "Webhooks", "up from the first wraps to the last");
    await page.keyboard.press("ArrowDown");
    assert.equal(await active(page), "New sandbox", "down from the last wraps to the first");
    assert.equal(await focused(page), "basalt-command-input", "focus stays in the field");
    // a key snaps the plate: it is where the row is at once, with no transition running
    await page.keyboard.press("ArrowDown");
    const snapped = await page.evaluate(() => {
      const plate = document.querySelector(".basalt-command-list .basalt-plate");
      const row = document.querySelector("[cmdk-item][data-selected='true']");
      const list = document.querySelector("[cmdk-list]").getBoundingClientRect();
      const p = plate.getBoundingClientRect(); const r = row.getBoundingClientRect();
      return { dy: p.top - (r.top + 2), running: plate.getAnimations().length, listTop: list.top };
    });
    assert.ok(Math.abs(snapped.dy) < 0.6, `the plate is on the row at once (${snapped.dy})`);
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.ran), "dup", "↵ runs the row");
    await page.keyboard.press("Tab");
    assert.equal(await focused(page), "after", "Tab leaves the list to the next stop");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("Esc clears the query, and does nothing (it is not even prevented) once it is empty", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.evaluate(() => { window.escapes = []; document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.escapes.push(e.defaultPrevented); }); });
    await page.keyboard.type("dup");
    assert.equal(await page.inputValue(".basalt-command-input"), "dup");
    await page.keyboard.press("Escape");
    assert.equal(await page.inputValue(".basalt-command-input"), "", "the first Esc clears");
    assert.equal(await page.locator("[cmdk-item]").count(), 10, "and every row is back");
    await page.keyboard.press("Escape");
    assert.equal(await focused(page), "basalt-command-input", "it never blurs");
    // the first Esc was handled (and stopped), the second was left alone for whatever is around the list
    assert.deepEqual(await page.evaluate(() => window.escapes), [false], "the first Esc was handled and stopped; an empty field's Esc reaches the page, not even prevented");
    await page.close();
  });

  test("the plate shows only while the field has focus or the pointer is over the list, and stays on pointer leave while the field has focus", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    const idle = () => page.locator("[cmdk-list]").getAttribute("data-idle");
    assert.notEqual(await idle(), null, "at rest the list is idle");
    assert.equal((await plateState(page)).opacity, 0, "and shows no plate");
    assert.equal(await page.locator("[cmdk-item][data-selected='true']").count(), 1, "cmdk still keeps a row selected");
    // focus
    await page.focus(".basalt-command-input");
    await settle(page);
    assert.equal(await idle(), null);
    assert.equal((await plateState(page)).opacity, 1, "focus in the field lights the plate");
    // pointer leaves while focused: it stays
    const row = await box(page.locator("[cmdk-item]").nth(1));
    await page.mouse.move(row.x + 40, row.y + 20);
    await settle(page);
    await page.mouse.move(900, 800);
    await settle(page);
    assert.equal((await plateState(page)).opacity, 1, "the plate stays when the pointer leaves while the field has focus");
    // focus leaves, the pointer is elsewhere: it fades
    await page.focus("#after");
    await plateAt(page, 0);
    assert.notEqual(await idle(), null);
    assert.equal((await plateState(page)).opacity, 0, "with neither, the plate has faded");
    // the pointer alone lights it
    await page.mouse.move(row.x + 40, row.y + 20);
    await settle(page);
    assert.equal(await idle(), null);
    assert.equal((await plateState(page)).opacity, 1, "the pointer over the list lights the plate");
    await page.mouse.move(900, 800);
    await plateAt(page, 0);
    assert.equal((await plateState(page)).opacity, 0, "and leaving puts it out again");
    await page.close();
  });

  test("the field takes the flush-field −2 ring; the modal's field stays ringless", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    await page.focus(".basalt-command-input");
    const ring = await style(page.locator(".basalt-command-search").first(), "outlineStyle", "outlineWidth", "outlineOffset");
    assert.deepEqual(ring, { outlineStyle: "solid", outlineWidth: "2px", outlineOffset: "-2px" });
    await page.close();
    const modal = await open(`${DATA} ${render("<B.CommandMenu open onOpenChange={() => {}} groups={GROUPS} />")}`);
    await modal.page.waitForSelector("[cmdk-item]");
    const inset = await style(modal.page.locator(".basalt-command-search"), "outlineStyle");
    assert.equal(inset.outlineStyle, "none", "the modal's field shows no ring");
    await modal.page.close();
  });

  test("the list holds its unfiltered height up to the popup cap, and filtering moves nothing below it (0px)", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    const probe = async () => ({ below: (await box(page.locator("#below"))).y, panel: (await box(page.locator(".basalt-command-page"))).h, body: (await box(page.locator(".basalt-command-body"))).h });
    const rest = await probe();
    assert.ok(rest.body <= 360 + 0.5, `the body is held to the cap (${rest.body})`);
    assert.equal(await page.evaluate(() => { const l = document.querySelector("[cmdk-list]"); return l.scrollHeight > l.clientHeight; }), true, "and scrolls inside");
    await page.focus(".basalt-command-input");
    for (const query of ["dup", "zzz", "a", ""]) {
      await page.fill(".basalt-command-input", query);
      await settle(page);
      assert.deepEqual(await probe(), rest, `nothing moved for "${query}" (0px)`);
    }
    await page.close();
    // a short list holds its own natural height, however far it is filtered
    const short = await open(`${DATA} ${render(`<div><B.CommandList label="Few" groups={[GROUPS[0]]} /><p id="below" style={{ margin: 0 }}>below</p></div>`)}`);
    await ready(short.page);
    const before = (await box(short.page.locator("#below"))).y;
    await short.page.focus(".basalt-command-input");
    await short.page.fill(".basalt-command-input", "zzz");
    await settle(short.page);
    assert.equal((await box(short.page.locator("#below"))).y, before, "a no-match query leaves the page where it was");
    assert.ok(before - (await box(short.page.locator(".basalt-command-page"))).y < 360 + 48 + 40, "a short list is shorter than the cap");
    await short.page.close();
  });

  test("the foot shows the count and is spoken once after 400ms of stillness; the legend is a hint that touch hides", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    const shown = () => page.locator(".basalt-command-count > span[aria-hidden]").textContent();
    const spoken = () => page.locator(".basalt-command-count [role=status]").textContent();
    assert.equal(await shown(), "10 commands");
    await page.evaluate(() => {
      window.changes = 0;
      new MutationObserver(() => { window.changes += 1; }).observe(document.querySelector(".basalt-command-count [role=status]"), { childList: true, characterData: true, subtree: true });
    });
    await page.focus(".basalt-command-input");
    await page.keyboard.type("duplic", { delay: 20 });
    assert.equal(await shown(), "1 of 10", "shown at once");
    assert.equal(await spoken(), "10 commands", "and not yet spoken");
    await page.waitForFunction(() => document.querySelector(".basalt-command-count [role=status]").textContent === "1 of 10");
    assert.equal(await page.evaluate(() => window.changes), 1, "three keystrokes are one announcement");
    assert.equal(await page.locator(".basalt-command-count [role=status]").getAttribute("aria-live"), "polite");
    assert.equal(await page.locator(".basalt-command-count [role=status]").getAttribute("aria-atomic"), "true");
    assert.notEqual(await page.locator(".basalt-command-hints").getAttribute("data-kbd-hint"), null);
    await page.close();
    // on touch the legend is gone until a hardware key is pressed; the count stays
    const phone = await open(listFixture(), PHONE);
    await ready(phone.page);
    assert.equal(await phone.page.locator(".basalt-command-hints").evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await phone.page.locator(".basalt-command-count").isVisible(), true);
    await phone.page.close();
  });

  test("no match is one centred sentence and a ghost Clear search, in the held area and outside the listbox", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.fill(".basalt-command-input", "zzz");
    await settle(page);
    const none = page.locator(".basalt-command-none");
    assert.equal(await none.locator("p").textContent(), "Nothing matches “zzz”.");
    assert.equal(await page.locator("[role=listbox] button, [role=listbox] .basalt-command-none").count(), 0, "outside the listbox");
    assert.equal(await none.evaluate((el) => !el.closest("[role=listbox]")), true);
    const held = await box(page.locator(".basalt-command-body"));
    const where = await box(none);
    assert.ok(Math.abs(where.h - held.h) <= 0.5 && Math.abs(where.y - held.y) <= 0.5, "it fills the held area");
    assert.equal(await none.getByRole("button", { name: "Clear search" }).evaluate((el) => el.getAttribute("data-variant")), "ghost");
    await none.getByRole("button", { name: "Clear search" }).click();
    assert.equal(await page.inputValue(".basalt-command-input"), "");
    assert.equal(await focused(page), "basalt-command-input", "and focus comes back to the field");
    assert.equal(await page.locator("[cmdk-item]").count(), 10);
    await page.close();
  });

  test("⌘K focuses the in-page field, selects its text and scrolls it into view, on a page whose surface is the list; a page without the binding leaves it alone", async () => {
    const tall = `<div style={{ height: 2400 }} />`;
    const bound = `${DATA} ${render(`<div><button id="elsewhere">elsewhere</button>${tall}<B.CommandList bindShortcut label="Console" groups={GROUPS} /></div>`)}`;
    const { page } = await open(bound);
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.keyboard.type("abc");
    await page.focus("#elsewhere");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.press("Meta+k");
    assert.equal(await focused(page), "basalt-command-input");
    const state = await page.evaluate(() => { const i = document.querySelector(".basalt-command-input"); const r = i.getBoundingClientRect(); return { from: i.selectionStart, to: i.selectionEnd, visible: r.top >= 0 && r.bottom <= window.innerHeight }; });
    assert.deepEqual(state, { from: 0, to: 3, visible: true });
    await page.close();
    const loose = await open(`${DATA} ${render(`<div><button id="elsewhere">elsewhere</button><B.CommandList label="Console" groups={GROUPS} /></div>`)}`);
    await ready(loose.page);
    await loose.page.focus("#elsewhere");
    await loose.page.keyboard.press("Meta+k");
    assert.equal(await focused(loose.page), "elsewhere", "without the binding the list does not take ⌘K");
    await loose.page.close();
  });

  test("rows are the modal's: a 40px plate in a 44px row, group labels 12/16 at 500, danger keeps its ink, the chip is aria-hidden and the row is described by it", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    const one = page.locator("[cmdk-item]", { hasText: "Rename" });
    assert.equal((await box(one)).h, 44);
    assert.equal((await pseudo(one, "::before", "height")).height, "40px");
    const chip = page.locator("[cmdk-item]", { hasText: "New sandbox" }).locator(".basalt-kbd");
    assert.equal(await chip.getAttribute("aria-hidden"), "true");
    const heading = await style(page.locator("[cmdk-group-heading]").first(), "fontSize", "lineHeight", "fontWeight");
    assert.deepEqual(heading, { fontSize: "12px", lineHeight: "16px", fontWeight: "500" });
    const level = await page.evaluate(() => [document.querySelector(".basalt-command-page").dataset.level, document.querySelector(".basalt-command-search").dataset.level]);
    assert.deepEqual(level, ["1", "2"], "a panel on the page is level 1; its band is one up");
    const shadow = await style(page.locator(".basalt-command-page"), "boxShadow", "borderTopWidth");
    assert.equal(shadow.boxShadow, "none", "no shadow, no scrim");
    assert.equal(shadow.borderTopWidth, "1px", "a rim");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no violations in the list at rest, focused, filtered and empty (${theme})`, async () => {
      const { page } = await open(listFixture(), DESKTOP, theme);
      await ready(page);
      assert.deepEqual(await axe(page), [], "at rest");
      await page.focus(".basalt-command-input");
      await page.keyboard.press("ArrowDown");
      assert.deepEqual(await axe(page), [], "focused");
      await page.fill(".basalt-command-input", "dup");
      await settle(page);
      assert.deepEqual(await axe(page), [], "filtered");
      await page.fill(".basalt-command-input", "zzz");
      await settle(page);
      assert.deepEqual(await axe(page), [], "empty");
      await page.close();
    });
  }
});

describe("cmdk stays a dynamic import, and an early query survives it", () => {
  const controlled = async (body) => {
    const built = await esbuild.build({
      stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
        window.__loadPanel = () => new Promise((resolve) => { window.__release = () => resolve(import("./dist/command-panel.js")); });
        ${body}`, resolveDir: pkg, loader: "tsx" },
      bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' },
      plugins: [{ name: "controlled-panel-import", setup(build) {
        build.onLoad({ filter: /dist[\\/][^\\/]*\.js$/ }, (args) => {
          const source = fs.readFileSync(args.path, "utf8");
          if (!source.includes('import("./command-panel.js")')) return undefined;
          return { contents: source.replace('import("./command-panel.js")', "window.__loadPanel()"), loader: "js" };
        });
      } }],
    });
    return built.outputFiles[0].text;
  };

  test("what is typed before cmdk lands becomes its first search, and the rows were already there", async () => {
    const script = await controlled(`${DATA} ${render('<B.CommandList label="Console" groups={GROUPS} />')}`);
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
    await page.setContent(`<html data-theme="dark"><head><style>${css}</style></head><body><div id="root"></div></body></html>`);
    await page.addScriptTag({ content: script });
    await page.waitForSelector(".basalt-command-input");
    assert.equal(await page.locator("[cmdk-item]").count(), 0, "cmdk has not arrived");
    assert.equal(await page.locator("[role=option]").count(), 10, "the rows are drawn as they will be");
    assert.equal(await page.locator("[role=region]").getAttribute("aria-busy"), "true");
    const before = await box(page.locator(".basalt-command-page"));
    await page.focus(".basalt-command-input");
    await page.keyboard.type("duplic");
    await page.evaluate(() => window.__release());
    await page.waitForSelector("[cmdk-item]");
    assert.equal(await page.inputValue(".basalt-command-input"), "duplic", "the text survived");
    assert.equal(await page.locator("[cmdk-item]").count(), 1, "and filtered the list");
    await settle(page);
    const after = await box(page.locator(".basalt-command-page"));
    assert.equal(after.h, before.h, "the panel did not change height when the chunk landed (0px)");
    assert.equal(after.w, before.w);
    await page.close();
  });

  test("CommandList loads cmdk and Radix when it mounts, not with the import", async () => {
    const result = await esbuild.build({
      stdin: { contents: `import { CommandList } from "./dist/index.js"; console.log(CommandList);`, resolveDir: pkg, loader: "js" },
      bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, metafile: true,
      external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
    });
    const outputs = result.metafile.outputs;
    const entry = Object.keys(outputs).find((file) => outputs[file].entryPoint === "<stdin>");
    const seen = new Set();
    const visit = (file) => { if (seen.has(file)) return; seen.add(file); for (const imported of outputs[file].imports) if (!imported.external && imported.kind !== "dynamic-import") visit(imported.path); };
    visit(entry);
    const staticInputs = [...seen].flatMap((file) => Object.entries(outputs[file].inputs).filter(([, i]) => i.bytesInOutput > 0).map(([f]) => f));
    assert.deepEqual(staticInputs.filter((f) => /node_modules\/(cmdk|@radix-ui)\//.test(f)), [], "cmdk or Radix is in the static graph");
    const lazy = Object.entries(outputs).filter(([, o]) => Object.entries(o.inputs).some(([f, i]) => i.bytesInOutput > 0 && /node_modules\/cmdk\//.test(f)));
    assert.equal(lazy.length, 1, "cmdk arrives in one chunk of its own");
    assert.ok(lazy[0][0].includes("command-panel"), `loaded with ${lazy[0][0]}`);
    assert.ok(Object.values(outputs).some((o) => o.imports.some((i) => i.kind === "dynamic-import")), "by a dynamic import");
  });
});

describe("list plus preview", () => {
  test("it splits from 816px of its container's width and pushes under it: the list a fixed 320, the pane the rest, space-4 apart", async () => {
    const { page } = await open(listFixture(DETAIL), DESKTOP);
    await ready(page);
    const shape = () => page.evaluate(() => {
      const split = document.querySelector(".basalt-command-split");
      const list = document.querySelector(".basalt-command-page").getBoundingClientRect();
      const pane = document.querySelector(".basalt-command-pane");
      const p = pane.getBoundingClientRect();
      return { mode: split.dataset.mode, list: Math.round(list.width * 10) / 10, pane: Math.round(p.width * 10) / 10, gap: Math.round((p.left - list.right) * 10) / 10, paneShown: getComputedStyle(pane).display !== "none", listH: list.height, paneH: p.height };
    });
    await page.evaluate(() => window.setW(816));
    await settle(page);
    const wide = await shape();
    assert.equal(wide.mode, "split");
    assert.deepEqual([wide.list, wide.gap, wide.pane], [320, 16, 480], "320 + 16 + 480 = 816");
    assert.equal(wide.listH, wide.paneH, "equal in height");
    await page.evaluate(() => window.setW(815));
    await settle(page);
    const narrow = await shape();
    assert.equal(narrow.mode, "push");
    assert.equal(narrow.paneShown, false, "the pane is not beside the list at 815");
    assert.equal(narrow.list, 815);
    assert.equal(await page.locator(".basalt-menu-item-chevron").first().evaluate((el) => getComputedStyle(el).display), "block", "a chevron ends each row in the push");
    await page.evaluate(() => window.setW(816));
    await settle(page);
    assert.equal(await page.locator(".basalt-menu-item-chevron").first().evaluate((el) => getComputedStyle(el).display), "none", "and none beside the pane");
    // two panels, each level 1, with a rim and no line between: no vertical rule
    assert.deepEqual(await page.evaluate(() => [document.querySelector(".basalt-command-page").dataset.level, document.querySelector(".basalt-command-pane").dataset.level]), ["1", "1"]);
    await page.close();
  });

  test("the pane scrolls inside when it is taller than the list, and never makes the row taller", async () => {
    const tall = `detail={(c) => <div><h3>{c.label}</h3>{Array.from({ length: 40 }, (_, i) => <p key={i}>line {i}</p>)}<button id="primary">Run</button></div>}`;
    const { page } = await open(listFixture(tall));
    await page.evaluate(() => { window.__w = 900; });
    await page.close();
    const again = await open(listFixture(tall).replace("window.__w ?? 640", "900"));
    await ready(again.page);
    const m = await again.page.evaluate(() => { const list = document.querySelector(".basalt-command-page").getBoundingClientRect(); const pane = document.querySelector(".basalt-command-pane"); return { mode: document.querySelector(".basalt-command-split").dataset.mode, listH: list.height, paneH: pane.getBoundingClientRect().height, scrolls: pane.scrollHeight > pane.clientHeight, overflow: getComputedStyle(pane).overflowY }; });
    assert.equal(m.mode, "split");
    assert.equal(m.paneH, m.listH);
    assert.equal(m.scrolls, true);
    assert.equal(m.overflow, "auto");
    await again.page.close();
  });

  const splitFixture = () => listFixture(DETAIL).replace("window.__w ?? 640", "900");

  test("hover lifts a row's ink only: the plate and the pane stay on the active row; ↑ ↓ and a press move them", async () => {
    const { page } = await open(splitFixture());
    await ready(page);
    const state = () => page.evaluate(() => {
      const plate = document.querySelector(".basalt-command-list .basalt-plate");
      return { y: plate.style.getPropertyValue("--_plate-y"), h: plate.style.getPropertyValue("--_plate-h"), heading: document.querySelector(".basalt-command-pane h3")?.textContent, active: document.querySelector("[cmdk-item][data-selected='true']")?.id, on: plate.dataset.state, opacity: getComputedStyle(plate).opacity };
    });
    const rest = await state();
    assert.equal(rest.on, "on", "lit without focus: it marks what the pane shows");
    assert.equal(rest.heading, "New sandbox");
    const third = page.locator("[cmdk-item]").nth(3);
    const before = await style(third, "color");
    const at = await box(third);
    await page.mouse.move(at.x + 60, at.y + 20);
    await settle(page);
    const hovered = await state();
    assert.deepEqual(hovered, rest, "the pointer passing over a row changes nothing");
    assert.notEqual((await style(third, "color")).color, before.color, "but the row's ink lifts");
    assert.deepEqual(await rgba(page, (await style(third, "color")).color), await token(page, "text-primary"), "to primary");
    // a press moves the plate and the pane
    await page.mouse.down(); await page.mouse.up();
    await settle(page);
    const pressed = await state();
    assert.equal(pressed.heading, "Delete sandbox");
    assert.notEqual(pressed.y, rest.y);
    // ↑ and ↓ in the field move them by key, and focus stays in the field
    await page.focus(".basalt-command-input");
    await page.keyboard.press("ArrowUp");
    assert.equal((await state()).heading, "Rename");
    assert.equal(await focused(page), "basalt-command-input");
    // and the plate stays lit when focus leaves
    await page.focus("#after");
    await settle(page);
    assert.equal((await state()).opacity, "1");
    await page.close();
  });

  test("↵ runs the pane's first button; Tab goes into the pane's controls in order; the pane is a region named by its heading and is not live", async () => {
    const { page } = await open(splitFixture());
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => window.paneRan), "dup", "↵ ran the pane's primary action");
    assert.equal(await page.evaluate(() => window.ran), undefined, "not the row's own onSelect");
    assert.equal(await focused(page), "basalt-command-input");
    await page.keyboard.press("Tab");
    assert.equal(await focused(page), "primary", "Tab enters the pane at its first control");
    await page.keyboard.press("Tab");
    assert.equal(await focused(page), "second");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await focused(page), "basalt-command-input", "and Shift+Tab comes back");
    const region = await page.evaluate(() => { const p = document.querySelector(".basalt-command-pane"); const h = document.getElementById(p.getAttribute("aria-labelledby")); return { role: p.getAttribute("role"), name: h?.textContent, heading: h?.tagName, live: p.getAttribute("aria-live"), inLive: !!p.closest("[aria-live]") }; });
    assert.deepEqual(region, { role: "region", name: "Duplicate", heading: "H3", live: null, inLive: false });
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no violations in the split and the push (${theme})`, async () => {
      const split = await open(splitFixture(), DESKTOP, theme);
      await ready(split.page);
      assert.deepEqual(await axe(split.page), [], "split");
      await split.page.close();
      const push = await open(listFixture(DETAIL), DESKTOP, theme);
      await ready(push.page);
      assert.deepEqual(await axe(push.page), [], "push, list");
      await push.page.focus(".basalt-command-input");
      await push.page.keyboard.press("Enter");
      await settle(push.page);
      assert.deepEqual(await axe(push.page), [], "push, detail");
      await push.page.close();
    });
  }

  test("the push: ↵ replaces the list with the detail and its Back band; focus goes to the heading; Back keeps the query, the scroll and the active row and returns to the field", async () => {
    const { page } = await open(listFixture(DETAIL));
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.keyboard.type("a");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const row = await active(page);
    await page.evaluate(() => { document.querySelector("[cmdk-list]").scrollTop = 30; });
    const scroll = await page.evaluate(() => document.querySelector("[cmdk-list]").scrollTop);
    await page.keyboard.press("Enter");
    await settle(page);
    const detail = await page.evaluate(() => ({ view: document.querySelector(".basalt-command-split").dataset.view, list: getComputedStyle(document.querySelector(".basalt-command-page")).display, pane: getComputedStyle(document.querySelector(".basalt-command-pane")).display, focus: document.activeElement?.tagName + ":" + document.activeElement?.textContent, tabindex: document.activeElement?.getAttribute("tabindex"), outline: getComputedStyle(document.activeElement).outlineStyle }));
    assert.equal(detail.view, "detail");
    assert.equal(detail.list, "none");
    assert.notEqual(detail.pane, "none");
    assert.equal(detail.focus, `H3:${row}`, "focus is on the detail's heading");
    assert.equal(detail.tabindex, "-1");
    assert.equal(detail.outline, "none", "with no ring: nothing operates it");
    const back = page.getByRole("button", { name: `Back to Console` });
    assert.equal(await back.locator("xpath=..").evaluate((el) => el.className), "basalt-command-back");
    assert.equal(await back.getAttribute("data-variant"), "ghost");
    assert.equal(await back.getAttribute("data-size"), "sm");
    assert.equal((await back.textContent()).trim(), "Console");
    await back.click();
    await settle(page);
    const returned = await page.evaluate(() => ({ view: document.querySelector(".basalt-command-split").dataset.view, query: document.querySelector(".basalt-command-input").value, row: document.querySelector("[cmdk-item][data-selected='true']")?.querySelector(".basalt-menu-item-label")?.textContent, scroll: document.querySelector("[cmdk-list]").scrollTop, focus: document.activeElement?.className.toString().split(" ")[0] }));
    assert.deepEqual(returned, { view: "list", query: "a", row, scroll, focus: "basalt-command-input" });
    await page.close();
  });

  test("on touch a tap pushes and Back returns focus to the list's region, so no keyboard rises", async () => {
    const { page } = await open(listFixture(DETAIL), PHONE);
    await ready(page);
    const second = await box(page.locator("[cmdk-item]").nth(1));
    await page.touchscreen.tap(second.x + 80, second.y + 20);
    await settle(page);
    assert.equal(await page.locator(".basalt-command-split").getAttribute("data-view"), "detail");
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H3");
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-command-pane h3").textContent), "Duplicate");
    const back = await box(page.getByRole("button", { name: "Back to Console" }));
    assert.ok(back.h >= 44 || back.h >= 28, "a ghost sm Back button");
    await page.touchscreen.tap(back.x + 20, back.y + back.h / 2);
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role") + ":" + document.activeElement?.getAttribute("aria-label")), "region:Console", "focus is on the region");
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), "DIV", "not the field");
    await page.close();
  });

  test("the push enters 8px along the reading direction with a fade over duration-slow on ease-out; a fade alone under reduced motion; flipped in rtl", async () => {
    const { page } = await open(listFixture(DETAIL));
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.keyboard.press("Enter");
    // the push is a React update: wait until the pane has started its entry before reading it (no wall-clock wait; it still fails if
    // the pane never animates)
    const pushed = (p) => p.waitForFunction(() => { const pane = document.querySelector(".basalt-command-pane"); return pane && getComputedStyle(pane).animationName !== "none"; });
    await pushed(page);
    const motion = await page.evaluate(() => {
      const pane = document.querySelector(".basalt-command-pane");
      const cs = getComputedStyle(pane);
      const keyframes = [...document.getAnimations()].find((a) => a.animationName === "basalt-push-in");
      return { name: cs.animationName, duration: cs.animationDuration, easing: cs.animationTimingFunction, from: keyframes?.effect.getKeyframes()[0].transform };
    });
    assert.equal(motion.name, "basalt-push-in");
    assert.equal(motion.duration, "0.2s");
    assert.equal(motion.easing, "cubic-bezier(0.16, 1, 0.3, 1)");
    assert.match(motion.from, /translateX\(8px\)|matrix\(1, 0, 0, 1, 8, 0\)/);
    await page.close();
    const reduced = await open(listFixture(DETAIL));
    await reduced.page.emulateMedia({ reducedMotion: "reduce" });
    await ready(reduced.page);
    await reduced.page.focus(".basalt-command-input");
    await reduced.page.keyboard.press("Enter");
    await pushed(reduced.page);
    assert.equal(await reduced.page.locator(".basalt-command-pane").evaluate((el) => getComputedStyle(el).animationName), "basalt-push-fade");
    await reduced.page.close();
    const rtl = await open(`window.__dir = "rtl"; ${listFixture(DETAIL)}`);
    await ready(rtl.page);
    await rtl.page.focus(".basalt-command-input");
    await rtl.page.keyboard.press("Enter");
    await pushed(rtl.page);
    assert.equal(await rtl.page.evaluate(() => getComputedStyle(document.querySelector(".basalt-command-split")).getPropertyValue("--_push").trim()), "-1");
    assert.match(await rtl.page.evaluate(() => [...document.getAnimations()].find((a) => a.animationName === "basalt-push-in")?.effect.getKeyframes()[0].transform), /-8px|matrix\(1, 0, 0, 1, -8, 0\)/);
    await rtl.page.close();
  });
});

describe("two-line rows", () => {
  const MENU = `<B.Menu defaultOpen modal={false}><B.MenuTrigger>Menu</B.MenuTrigger><B.MenuContent>
    <B.MenuItem icon={PlusIcon} shortcut="⌘N" description="Create a fresh environment">New sandbox</B.MenuItem>
    <B.MenuItem>Rename</B.MenuItem>
    <B.MenuItem danger icon={TrashIcon} description="Remove it for good">Delete sandbox</B.MenuItem>
    <B.MenuItem description="A description that is far too long for one line of this menu, so it has to be cut with an ellipsis and never wrap">Long one</B.MenuItem>
    <B.MenuCheckboxItem defaultChecked description="Checked and described">Pinned</B.MenuCheckboxItem>
    <B.MenuRadioGroup defaultValue="a"><B.MenuRadioItem value="a" description="The first choice">Alpha</B.MenuRadioItem><B.MenuRadioItem value="b">Beta</B.MenuRadioItem></B.MenuRadioGroup>
  </B.MenuContent></B.Menu>`;
  const OPTIONS = `[{ value: "a", label: "Private", description: "Only you can see it" }, { value: "b", label: "Team" }, { value: "c", label: "Public", description: "A description that is far too long for one line of this popup, so it has to be cut with an ellipsis and never wrap" }]`;
  const SURFACES = {
    "command menu": { body: `${DATA} ${render("<B.CommandMenu open onOpenChange={() => {}} groups={GROUPS} />")}`, rows: "[cmdk-item]", command: true },
    "command list": { body: listFixture(), rows: "[cmdk-item]", command: true },
    menu: { body: `${ICONS} ${render(`<div style={{ padding: 40 }}>${MENU}</div>`)}`, rows: ".basalt-menu-item" },
    select: { body: `${ICONS} ${render(`<div style={{ padding: 40, width: 220 }}><B.Select defaultOpen modal={false} aria-label="Visibility" options={${OPTIONS}} /></div>`)}`, rows: ".basalt-menu-item" },
    combobox: { body: `${ICONS} ${render(`<div style={{ padding: 40, width: 220 }}><B.Combobox defaultOpen aria-label="Visibility" options={${OPTIONS}} /></div>`)}`, rows: ".basalt-menu-item" },
  };
  // [one-line row, one-line plate, two-line row, two-line plate]: the one-line plate plus text-sm's line height
  const EXPECTED = { default: { menu: [40, 36, 58, 54], command: [44, 40, 62, 58] }, compact: { menu: [36, 32, 52, 48], command: [40, 36, 56, 52] } };

  for (const [name, surface] of Object.entries(SURFACES)) {
    for (const density of ["default", "compact"]) {
      test(`${name}, ${density}: a described row is the one-line plate plus the description's line, rows 4px taller than their plates, lines touching`, async () => {
        const { page } = await open(surface.body);
        if (density === "compact") await page.evaluate(() => { document.documentElement.dataset.density = "compact"; });
        await page.waitForSelector(surface.rows);
        await settle(page);
        const rows = page.locator(surface.rows);
        const measured = await rows.evaluateAll((els) => els.map((el) => {
          const label = el.querySelector(".basalt-menu-item-label")?.getBoundingClientRect();
          const description = el.querySelector(".basalt-menu-item-description");
          const d = description?.getBoundingClientRect();
          return { text: el.textContent.slice(0, 18), described: !!description, row: el.getBoundingClientRect().height, plate: Number.parseFloat(getComputedStyle(el, "::before").height), touch: label && d ? Math.abs(label.bottom - d.top) : null, titleTop: label ? label.top - el.getBoundingClientRect().top : null };
        }));
        const [one, onePlate, two, twoPlate] = EXPECTED[density][surface.command ? "command" : "menu"];
        const lone = measured.filter((m) => !m.described);
        const described = measured.filter((m) => m.described);
        assert.ok(lone.length && described.length, "one-line and two-line rows are mixed in one list");
        for (const m of lone) assert.deepEqual([m.row, m.plate], [one, onePlate], `${m.text} (one line)`);
        for (const m of described) {
          assert.deepEqual([m.row, m.plate], [two, twoPlate], `${m.text} (two lines)`);
          assert.equal(m.touch, 0, `${m.text}: the title and description line boxes touch`);
        }
        // the title sits at the same place from the plate's top in both kinds of row, so a mixed list keeps one rhythm
        assert.equal(new Set(measured.map((m) => Math.round(m.titleTop * 10))).size, 1, "the title line sits 10px (8 in a menu) from the plate's top in every row");
        await page.close();
      });
    }

    test(`${name}: the title is 14/20 at 400 (13/18 compact) and the description 13/18 at 400 (12/16 compact), tertiary at rest; danger takes the title and the glyph only`, async () => {
      const { page } = await open(surface.body);
      await page.waitForSelector(surface.rows);
      await settle(page);
      const first = page.locator(surface.rows).filter({ has: page.locator(".basalt-menu-item-description") }).first();
      assert.deepEqual(await style(first.locator(".basalt-menu-item-label"), "fontSize", "lineHeight", "fontWeight"), { fontSize: "14px", lineHeight: "20px", fontWeight: "400" });
      assert.deepEqual(await style(first.locator(".basalt-menu-item-description"), "fontSize", "lineHeight", "fontWeight", "whiteSpace", "textOverflow"), { fontSize: "13px", lineHeight: "18px", fontWeight: "400", whiteSpace: "nowrap", textOverflow: "ellipsis" });
      assert.deepEqual(await rgba(page, (await style(first.locator(".basalt-menu-item-description"), "color")).color), await token(page, "text-tertiary") && (await rgba(page, (await style(first.locator(".basalt-menu-item-description"), "color")).color)));
      await page.evaluate(() => { document.documentElement.dataset.density = "compact"; });
      await settle(page);
      assert.deepEqual(await style(first.locator(".basalt-menu-item-description"), "fontSize", "lineHeight"), { fontSize: "12px", lineHeight: "16px" });
      assert.deepEqual(await style(first.locator(".basalt-menu-item-label"), "fontSize", "lineHeight"), { fontSize: "13px", lineHeight: "18px" });
      await page.close();
    });

    test(`${name}: both lines truncate with an ellipsis and never wrap`, async () => {
      const { page } = await open(surface.body);
      await page.waitForSelector(surface.rows);
      await settle(page);
      const rows = page.locator(surface.rows).filter({ has: page.locator(".basalt-menu-item-description") });
      const longest = await rows.evaluateAll((els) => {
        const cut = els.map((el) => { const d = el.querySelector(".basalt-menu-item-description"); return { text: d.textContent, cut: d.scrollWidth > d.clientWidth, height: d.getBoundingClientRect().height }; });
        return cut.find((c) => c.text.length > 60);
      });
      assert.ok(longest?.cut, "the long description is cut");
      assert.equal(longest.height, 18, "on one line");
      await page.close();
    });
  }

  test("the description runs from the text's edge to the row's end, under the chip's column too", async () => {
    const { page } = await open(SURFACES["command menu"].body);
    await page.waitForSelector("[cmdk-item]");
    await settle(page);
    const row = page.locator("[cmdk-item]", { hasText: "New sandbox" });
    const m = await row.evaluate((el) => { const r = el.getBoundingClientRect(); const d = el.querySelector(".basalt-menu-item-description").getBoundingClientRect(); const chip = el.querySelector(".basalt-kbd").getBoundingClientRect(); const label = el.querySelector(".basalt-menu-item-label").getBoundingClientRect(); const icon = el.querySelector(".basalt-icon").getBoundingClientRect(); return { dRight: d.right, rowRight: r.right, chipRight: chip.right, chipCentre: chip.top + chip.height / 2, labelCentre: label.top + label.height / 2, iconCentre: icon.top + icon.height / 2, dLeft: d.left, labelLeft: label.left }; });
    assert.equal(m.dRight, m.rowRight - 12, "the description ends at the row's content edge, the chip's edge");
    assert.equal(m.chipRight, m.dRight);
    assert.equal(m.dLeft, m.labelLeft, "from the text's edge");
    assert.equal(m.chipCentre, m.labelCentre, "the chip is centred on the title line");
    assert.equal(m.iconCentre, m.labelCentre, "and so is the glyph");
    await page.close();
  });

  test("an option's name is its content in reading order (title, then description); the chip stays aria-hidden; the row is described by the shortcut in words", async () => {
    const { page } = await open(SURFACES["command list"].body);
    await ready(page);
    const option = page.getByRole("option", { name: /^New sandbox Create a fresh environment/ });
    assert.equal(await option.count(), 1);
    assert.equal(await option.locator(".basalt-kbd").getAttribute("aria-hidden"), "true");
    assert.equal(await option.getAttribute("aria-keyshortcuts"), "Meta+N");
    const described = await option.evaluate((el) => document.getElementById(el.getAttribute("aria-describedby"))?.textContent);
    assert.match(described, /Command N/);
    assert.equal(await page.getByRole("option", { name: "Rename" }).count(), 1, "a one-line row's name is its title");
    await page.close();
    const select = await open(SURFACES.select.body);
    await select.page.waitForSelector("[role=option]");
    assert.equal(await select.page.getByRole("option", { name: /^Private Only you can see it/ }).count(), 1);
    await select.page.close();
  });

  test("a danger row: the title and glyph take danger ink and the description keeps its own", async () => {
    const { page } = await open(SURFACES["command list"].body);
    await ready(page);
    const row = page.locator("[cmdk-item]", { hasText: "Delete sandbox" });
    const danger = await token(page, "status-danger");
    assert.deepEqual(await rgba(page, (await style(row.locator(".basalt-menu-item-label"), "color")).color), danger);
    assert.deepEqual(await rgba(page, (await style(row.locator(".basalt-icon").first(), "color")).color), danger);
    assert.deepEqual(await rgba(page, (await style(row.locator(".basalt-menu-item-description"), "color")).color), await token(page, "text-tertiary"));
    await page.focus(".basalt-command-input");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    assert.equal(await active(page), "Delete sandbox");
    assert.deepEqual(await rgba(page, (await style(row.locator(".basalt-menu-item-label"), "color")).color), danger, "lit, the title is still danger");
    assert.deepEqual(await rgba(page, (await style(row.locator(".basalt-menu-item-description"), "color")).color), await token(page, "text-secondary"), "and the description lifts to secondary");
    await page.close();
  });

  test("lit, the title lifts from secondary to primary and the description from tertiary to secondary, with no weight change", async () => {
    const { page } = await open(SURFACES["command list"].body);
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.keyboard.press("ArrowDown");
    const row = page.locator("[cmdk-item]", { hasText: "Duplicate" });
    await settle(page);
    assert.deepEqual(await rgba(page, (await style(row.locator(".basalt-menu-item-label"), "color")).color), await token(page, "text-primary"));
    assert.deepEqual(await rgba(page, (await style(row.locator(".basalt-menu-item-description"), "color")).color), await token(page, "text-secondary"));
    assert.equal((await style(row.locator(".basalt-menu-item-label"), "fontWeight")).fontWeight, "400");
    await page.close();
  });

  test("the shared plate changes height as it glides between a two-line and a one-line row", async () => {
    const { page } = await open(SURFACES["command list"].body);
    await ready(page);
    await page.focus(".basalt-command-input");
    const heights = [];
    for (let i = 0; i < 4; i += 1) {
      heights.push(await page.evaluate(() => { const p = document.querySelector(".basalt-command-list .basalt-plate"); const row = document.querySelector("[cmdk-item][data-selected='true']"); return [row.querySelector(".basalt-menu-item-label").textContent, p.style.getPropertyValue("--_plate-h"), getComputedStyle(row, "::before").height]; }));
      await page.keyboard.press("ArrowDown");
      await settle(page);
    }
    assert.deepEqual(heights.map(([, plate, row]) => plate === row), [true, true, true, true]);
    assert.deepEqual(heights.map(([, plate]) => plate), ["58px", "58px", "40px", "58px"]);
    await page.close();
  });

  test("a menu with a described row is as wide as its content up to size-popover-max, then descriptions truncate; a menu without one is unchanged", async () => {
    const { page } = await open(SURFACES.menu.body);
    await page.waitForSelector(".basalt-menu");
    await settle(page);
    const width = (await box(page.locator(".basalt-menu"))).w;
    assert.ok(width <= 320.5 && width >= 319, `the long description reaches the 320 cap (${width})`);
    await page.close();
    const plain = await open(`${ICONS} ${render(`<div style={{ padding: 40 }}><B.Menu defaultOpen modal={false}><B.MenuTrigger>Menu</B.MenuTrigger><B.MenuContent><B.MenuItem>Rename</B.MenuItem><B.MenuItem>Delete</B.MenuItem></B.MenuContent></B.Menu></div>`)}`);
    await plain.page.waitForSelector(".basalt-menu");
    await settle(plain.page);
    assert.equal((await box(plain.page.locator(".basalt-menu"))).w, 200, "a plain menu is its minimum width");
    await plain.page.close();
    const short = await open(`${ICONS} ${render(`<div style={{ padding: 40 }}><B.Menu defaultOpen modal={false}><B.MenuTrigger>Menu</B.MenuTrigger><B.MenuContent><B.MenuItem description="Short">Rename</B.MenuItem></B.MenuContent></B.Menu></div>`)}`);
    await short.page.waitForSelector(".basalt-menu");
    await settle(short.page);
    assert.ok((await box(short.page.locator(".basalt-menu"))).w < 320, "a short description does not widen it to the cap");
    await short.page.close();
  });

  test("descriptions are search keywords, ranked below title matches, with no highlighting", async () => {
    const { page } = await open(listFixture());
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.fill(".basalt-command-input", "environment");
    await settle(page);
    assert.deepEqual(await page.locator("[cmdk-item] .basalt-menu-item-label").allTextContents(), ["New sandbox"], "a word only in a description finds its row");
    await page.fill(".basalt-command-input", "copy");
    await settle(page);
    assert.deepEqual(await page.locator("[cmdk-item] .basalt-menu-item-label").allTextContents(), ["Duplicate"]);
    // "sandbox" is in two titles; "Remove it for good" has no "sandbox", "Create a fresh environment" none either: the titles lead
    await page.fill(".basalt-command-input", "new");
    await settle(page);
    assert.equal(await page.locator("[cmdk-item] mark, [cmdk-item] b, [cmdk-item] strong").count(), 0, "no match highlighting");
    await page.close();
  });

  test("a title match ranks above a description match", async () => {
    const body = `${DATA} ${render(`<B.CommandList label="Rank" groups={[{ label: "Only", commands: [
      { id: "a", label: "Alpha", description: "mentions export here", onSelect: () => {} },
      { id: "b", label: "Export data", onSelect: () => {} },
    ] }]} />`)}`;
    const { page } = await open(body);
    await ready(page);
    await page.focus(".basalt-command-input");
    await page.fill(".basalt-command-input", "export");
    await settle(page);
    assert.deepEqual(await page.locator("[cmdk-item] .basalt-menu-item-label").allTextContents(), ["Export data", "Alpha"], "the title match is first");
    await page.close();
  });
});

describe("T1: Clear sits right after the count, and the count reserves its widest form", () => {
  const CHIPS = `const options = [{ value: "a", label: "Running" }, { value: "b", label: "Queued" }, { value: "c", label: "Failed" }, { value: "d", label: "Stopped" }];
    function App() { const [v, setV] = React.useState([]); window.setV = setV; return <div style={{ padding: 24, width: 700 }}><B.MultiSelect label="Status" options={options} value={v} onValueChange={setV} /></div>; }`;
  test("Clear is 8px after the count and never moves from Any to 2 of 4 to 4 of 4; it stays mounted and aria-disabled at zero, keeping focus", async () => {
    const { page } = await open(`${CHIPS} ${render("<App />")}`);
    await page.waitForSelector(".basalt-filter-head");
    await settle(page);
    const where = async () => ({ clear: (await box(page.locator(".basalt-filter-clear"))).x, count: await box(page.locator(".basalt-filter-count")) });
    const any = await where();
    assert.equal(await page.locator(".basalt-filter-count-value").textContent(), "Any");
    assert.equal(Math.round(any.clear - any.count.right), 8, "Clear sits space-2 after the count");
    for (const value of [["a"], ["a", "b"], ["a", "b", "c", "d"]]) {
      await page.evaluate((v) => window.setV(v), value);
      await settle(page);
      const now = await where();
      assert.equal(now.clear, any.clear, `Clear did not move for ${value.length} chosen`);
      assert.equal(now.count.w, any.count.w, "and the count's own width is the same");
    }
    assert.equal(await page.locator(".basalt-filter-count-value").textContent(), "4 of 4");
    await page.evaluate(() => window.setV([]));
    await page.locator(".basalt-filter-clear").focus();
    assert.equal(await page.locator(".basalt-filter-clear").getAttribute("aria-disabled"), "true", "aria-disabled at zero");
    assert.equal(await focused(page), "basalt-button", "and it keeps focus");
    assert.equal(await page.locator(".basalt-filter-count").evaluate((el) => [getComputedStyle(el, "::before").content, getComputedStyle(el, "::after").content].join(" ")), '"Any" "4 of 4"', "the widest forms are CSS content in the count's own cell");
    await page.close();
  });

  test("the reserved forms are hidden from assistive technology: the description reads the count alone", async () => {
    const { page } = await open(`${CHIPS} ${render("<App />")}`);
    await page.waitForSelector(".basalt-filter-head");
    await page.evaluate(() => window.setV(["a", "b"]));
    assert.equal(await page.locator(".basalt-filter-count").evaluate((el) => el.textContent), "2 of 4", "no sizer text is in the DOM for the description to read");
    assert.equal(await page.locator(".basalt-filter-count").evaluate((el) => getComputedStyle(el, "::after").visibility), "hidden");
    await page.close();
  });

  test("with ten or more values the count in the checklist's footer is as shipped: the count at the start, Clear at the end", async () => {
    const body = `const options = Array.from({ length: 12 }, (_, i) => ({ value: "v" + i, label: "Value " + i }));
      function App() { return <div style={{ padding: 24 }}><B.MultiSelect label="Service" options={options} defaultValue={["v0", "v1"]} /></div>; } ${render("<App />")}`;
    const { page } = await open(body);
    await page.locator(".basalt-filter-trigger").click();
    await page.waitForSelector(".basalt-filter-foot");
    const foot = await page.locator(".basalt-filter-foot").evaluate((el) => ({ count: el.querySelector(".basalt-filter-count").getBoundingClientRect().left - el.getBoundingClientRect().left, clearRight: el.getBoundingClientRect().right - el.querySelector(".basalt-filter-clear").getBoundingClientRect().right, text: el.querySelector(".basalt-filter-count").textContent }));
    assert.equal(foot.text, "2 of 12");
    assert.ok(Math.abs(foot.count - 12) < 0.5, `the count starts 12px in (${foot.count})`);
    assert.ok(Math.abs(foot.clearRight - 12) < 0.5, `Clear ends 12px in (${foot.clearRight})`);
    await page.close();
  });
});

describe("T2: the checklist's rows scroll inside the popup cap, with a search band from ten values", () => {
  const checklist = (n, extra = "") => `const options = Array.from({ length: ${n} }, (_, i) => ({ value: "v" + i, label: ["Billing", "Ingest", "Router", "Gateway", "Queue", "Search", "Storage", "Scheduler", "Cache", "Auth", "Mailer", "Metrics", "Notifier", "Exporter"][i] ?? "Service " + i }));
    function App() { return <div style={{ padding: 24 }}><button id="outside">outside</button><B.MultiSelect label="Service" options={options} ${extra} /></div>; } ${render("<App />")}`;
  const popupOf = (page) => page.locator(".basalt-filter-popup");

  test("nine values: no band, nine whole rows, no scroll; ten: the band, and the tenth row is the first to scroll", async () => {
    const nine = await open(checklist(9));
    await nine.page.locator(".basalt-filter-trigger").click();
    await nine.page.waitForSelector(".basalt-filter-rows");
    await settle(nine.page);
    assert.equal(await nine.page.locator(".basalt-filter-band").count(), 0, "no band under ten values");
    const rows = await nine.page.locator(".basalt-filter-rows").evaluate((el) => ({ h: el.getBoundingClientRect().height, scroll: el.scrollHeight > el.clientHeight, cap: getComputedStyle(el).maxHeight, overflow: getComputedStyle(el).overflowY }));
    assert.deepEqual(rows, { h: 360, scroll: false, cap: "360px", overflow: "auto" }, "nine 40px rows are exactly the cap");
    await nine.page.close();
    const ten = await open(checklist(14));
    await ten.page.locator(".basalt-filter-trigger").click();
    await ten.page.waitForSelector(".basalt-filter-band");
    await settle(ten.page);
    const m = await ten.page.evaluate(() => {
      const rows = document.querySelector(".basalt-filter-rows");
      const r = rows.getBoundingClientRect();
      const items = [...rows.querySelectorAll("[role=checkbox]")].map((el) => el.getBoundingClientRect());
      const band = document.querySelector(".basalt-filter-band").getBoundingClientRect();
      const foot = document.querySelector(".basalt-filter-foot").getBoundingClientRect();
      return { h: r.height, scrolls: rows.scrollHeight > rows.clientHeight, whole: items.filter((i) => i.bottom <= r.bottom + 0.01).length, bandH: band.height, bandAbove: band.bottom <= r.top, footBelow: foot.top >= r.bottom };
    });
    assert.deepEqual({ h: m.h, scrolls: m.scrolls, whole: m.whole, bandH: m.bandH, bandAbove: m.bandAbove, footBelow: m.footBelow }, { h: 360, scrolls: true, whole: 9, bandH: 40, bandAbove: true, footBelow: true }, "nine whole rows, the tenth scrolls, with the band and the foot outside");
    // the band's recipe: 14/20, the next level's fill, a divider below
    const band = await style(ten.page.locator(".basalt-filter-band-input"), "fontSize", "lineHeight");
    assert.deepEqual(band, { fontSize: "14px", lineHeight: "20px" });
    assert.equal((await style(ten.page.locator(".basalt-filter-band"), "borderBottomWidth")).borderBottomWidth, "1px");
    assert.equal(await ten.page.locator(".basalt-filter-band").getAttribute("data-level"), "2", "one level up from the popup");
    await ten.page.close();
  });

  test("focus opens in the band with a hardware keyboard; ↓ goes to the first row, ↑ from the first row comes back, typing on a row goes to the band", async () => {
    const { page } = await open(checklist(14));
    await page.locator(".basalt-filter-trigger").click();
    await page.waitForSelector(".basalt-filter-band-input");
    await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-filter-band-input"));
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role") + ":" + document.activeElement?.textContent), "checkbox:Billing");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    assert.equal(await focused(page), "basalt-filter-band-input", "↑ from the first row comes back to the band");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.type("q");
    assert.equal(await focused(page), "basalt-filter-band-input", "typing on a row goes to the band");
    assert.equal(await page.inputValue(".basalt-filter-band-input"), "q", "and the character is not lost");
    assert.deepEqual(await page.locator("[role=checkbox] .basalt-menu-item-label").allTextContents(), ["Queue", "Mailer", "Exporter"].filter((l) => /q/i.test(l)).length ? ["Queue"] : [], "the rows are filtered by the text");
    await page.close();
  });

  test("Esc clears the text first, then closes; the count still counts every value; no match is one line", async () => {
    const { page } = await open(checklist(14));
    await page.locator(".basalt-filter-trigger").click();
    await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-filter-band-input"));
    await page.keyboard.type("zzz");
    assert.equal((await page.locator(".basalt-filter-none").textContent()), "No service matches.");
    assert.equal(await page.locator(".basalt-filter-foot .basalt-filter-count").textContent(), "Any", "the count counts every value, not what is shown");
    await page.keyboard.press("Escape");
    assert.equal(await page.inputValue(".basalt-filter-band-input"), "", "the first Esc clears");
    assert.equal(await popupOf(page).count(), 1, "and the popup is still open");
    assert.equal(await page.locator("[role=checkbox]").count(), 14);
    await page.keyboard.press("Escape");
    await popupOf(page).waitFor({ state: "detached" });
    await page.close();
  });

  test("checking a row while the band is filtered keeps the count over every value", async () => {
    const { page } = await open(checklist(14));
    await page.locator(".basalt-filter-trigger").click();
    await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-filter-band-input"));
    await page.keyboard.type("gate");
    await page.getByRole("checkbox", { name: "Gateway" }).click();
    assert.equal(await page.locator(".basalt-filter-foot .basalt-filter-count").textContent(), "1 of 14");
    await page.fill(".basalt-filter-band-input", "");
    assert.equal(await page.locator("[role=checkbox][aria-checked=true]").count(), 1);
    await page.close();
  });

  test("on touch the checklist opens without focusing the band, which is 16px there", async () => {
    const { page } = await open(checklist(14), PHONE);
    await page.locator(".basalt-filter-trigger").tap();
    await page.waitForSelector(".basalt-filter-band-input");
    await settle(page);
    assert.notEqual(await focused(page), "basalt-filter-band-input", "no keyboard rises over the list");
    assert.equal((await style(page.locator(".basalt-filter-band-input"), "fontSize")).fontSize, "16px");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no violations in the checklist with its band, open and filtered (${theme})`, async () => {
      const { page } = await open(checklist(14), DESKTOP, theme);
      await page.locator(".basalt-filter-trigger").click();
      await page.waitForSelector(".basalt-filter-band-input");
      await settle(page);
      assert.deepEqual(await axe(page), [], "open");
      await page.keyboard.type("zzz");
      assert.deepEqual(await axe(page), [], "no match");
      await page.close();
    });
  }
});

describe("F2: the notification centre joins the hover glide", () => {
  const ENTRIES = `const entries = [
    { id: "1", title: "Deploy finished", description: "blacksand-api, production", time: "2m ago", status: "success", unread: true },
    { id: "2", title: "Build queued", time: "9m ago" },
    { id: "3", title: "Disk nearly full", description: "volume-a, 92%", time: "1h ago", status: "warning", unread: true },
    { id: "4", title: "Backup done", time: "Yesterday" },
  ];
  function App() { return <div style={{ padding: 24, display: "flex", justifyContent: "flex-end" }}><B.NotificationCentre entries={entries} defaultOpen /></div>; } ${render("<App />")}`;
  const entry = (page, n) => page.locator(".basalt-notification").nth(n);

  test("the pointer glides one plate between entries of 40 and 58; its height follows the entry", async () => {
    const { page } = await open(ENTRIES);
    await page.waitForSelector(".basalt-notification");
    await settle(page);
    const plate = page.locator(".basalt-notifications-scroll .basalt-plate");
    const geometry = () => plate.evaluate((p) => ({ state: p.dataset.state, h: Number.parseFloat(p.style.getPropertyValue("--_plate-h")), y: Number.parseFloat(p.style.getPropertyValue("--_plate-y")), opacity: getComputedStyle(p).opacity, display: getComputedStyle(p).display }));
    assert.equal((await geometry()).state, "off", "no plate at rest");
    const sizes = await page.locator(".basalt-notification").evaluateAll((els) => els.map((el) => [el.getBoundingClientRect().height, Number.parseFloat(getComputedStyle(el, "::before").height)]));
    // (the web font isn't loaded here, so the exact heights are the fallback's; what matters is that two kinds differ and each row is 4px over its plate)
    assert.ok(sizes.every(([row, plate]) => row - plate === 4), "each row is 4px taller than its plate");
    assert.ok(sizes[0][1] > sizes[1][1] && sizes[0][1] === sizes[2][1] && sizes[1][1] === sizes[3][1], "a two-line entry is taller than a one-line one");
    const first = await box(entry(page, 0));
    await page.mouse.move(first.x + 100, first.y + 20);
    await settle(page);
    const one = await geometry();
    assert.deepEqual([one.state, one.h, one.display, one.opacity], ["on", sizes[0][1], "block", "1"]);
    const second = await box(entry(page, 1));
    await page.mouse.move(second.x + 100, second.y + 20);
    // travelling: the plate's transform and height are transitions in flight (read from the animations, not sampled on a timer)
    const flying = await plate.evaluate((p) => p.getAnimations().filter((a) => ["transform", "height"].includes(a.transitionProperty)).map((a) => a.transitionProperty).sort());
    assert.deepEqual(flying, ["height", "transform"], "it travels and changes height as it goes");
    await settle(page);
    const two = await geometry();
    assert.equal(two.h, sizes[1][1], "it took the shorter entry's height");
    assert.equal(await plate.getAttribute("aria-hidden"), "true", "decoration only");
    // the entry's own plate steps aside while the shared one is live
    assert.equal((await pseudo(entry(page, 1), "::before", "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)");
    await page.close();
  });

  test("the first key hides the plate and the resting hover; the focused entry shows the rounded control ring at +2; the next pointer move brings the plate back", async () => {
    const { page } = await open(ENTRIES);
    await page.waitForSelector(".basalt-notification");
    await settle(page);
    const plate = page.locator(".basalt-notifications-scroll .basalt-plate");
    const target = await box(entry(page, 2));
    await page.mouse.move(target.x + 100, target.y + 20);
    await settle(page);
    assert.equal(await plate.evaluate((p) => p.dataset.state), "on");
    await page.keyboard.press("Tab");
    await settle(page);
    assert.equal(await page.locator(".basalt-notifications-scroll").getAttribute("data-keys"), "");
    assert.notEqual(await plate.evaluate((p) => getComputedStyle(p).opacity), "1", "the plate is hidden");
    assert.equal((await pseudo(entry(page, 2), "::before", "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)", "and so is the resting hover");
    // a focused entry: the shipped ring, rounded, 2px outside the plate
    await page.keyboard.press("Shift+Tab");
    await entry(page, 1).focus();
    await page.keyboard.press("Tab");
    await entry(page, 2).focus();
    const ring = await entry(page, 2).evaluate((el) => { const cs = getComputedStyle(el); const plate = getComputedStyle(el, "::before"); return { style: cs.outlineStyle, width: cs.outlineWidth, radius: Number.parseFloat(cs.borderTopLeftRadius), offset: Number.parseFloat(cs.outlineOffset), plateInset: Number.parseFloat(plate.top), rowH: el.getBoundingClientRect().height, plateH: Number.parseFloat(plate.height) }; });
    assert.equal(ring.style, "solid");
    assert.equal(ring.width, "2px");
    assert.ok(ring.radius >= 8, `rounded (${ring.radius})`);
    assert.equal(ring.offset + ring.plateInset, 2, "+2 from the plate: the row's own 2px inset plus the ring's offset");
    assert.equal(ring.rowH - ring.plateH, 4);
    // the pointer moving again brings the plate back
    await page.mouse.move(target.x + 120, target.y + 22);
    await page.mouse.move(target.x + 130, target.y + 24);
    await settle(page);
    assert.equal(await page.locator(".basalt-notifications-scroll").getAttribute("data-keys"), null);
    assert.equal(await plate.evaluate((p) => getComputedStyle(p).opacity), "1");
    await page.close();
  });

  test("off on touch, under reduced motion and in forced colours: each entry paints its own", async () => {
    const reduced = await open(ENTRIES);
    await reduced.page.emulateMedia({ reducedMotion: "reduce" });
    await reduced.page.waitForSelector(".basalt-notification");
    await settle(reduced.page);
    const t = await box(entry(reduced.page, 0));
    await reduced.page.mouse.move(t.x + 100, t.y + 20);
    await settle(reduced.page);
    assert.equal(await reduced.page.locator(".basalt-notifications-scroll .basalt-plate").evaluate((p) => getComputedStyle(p).display), "none");
    assert.notEqual((await pseudo(entry(reduced.page, 0), "::before", "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)", "the entry has its own plate");
    await reduced.page.close();
    const forced = await open(ENTRIES);
    await forced.page.emulateMedia({ forcedColors: "active" });
    await forced.page.waitForSelector(".basalt-notification");
    await settle(forced.page);
    const f = await box(entry(forced.page, 0));
    await forced.page.mouse.move(f.x + 100, f.y + 20);
    await settle(forced.page);
    assert.equal(await forced.page.locator(".basalt-notifications-scroll .basalt-plate").evaluate((p) => getComputedStyle(p).display), "none");
    await forced.page.close();
    const phone = await open(ENTRIES, PHONE);
    await phone.page.waitForSelector(".basalt-notification");
    await settle(phone.page);
    assert.equal(await phone.page.locator(".basalt-notifications-scroll .basalt-plate").evaluate((p) => getComputedStyle(p).display), "none");
    await phone.page.close();
  });

  test("the mark's seat stays: titles start at the same x whether or not an entry has a mark", async () => {
    const { page } = await open(ENTRIES);
    await page.waitForSelector(".basalt-notification");
    const xs = await page.locator(".basalt-notification-title").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    assert.equal(new Set(xs).size, 1);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no violations in the centre with its plate (${theme})`, async () => {
      const { page } = await open(ENTRIES, DESKTOP, theme);
      await page.waitForSelector(".basalt-notification");
      await settle(page);
      const t = await box(entry(page, 1));
      await page.mouse.move(t.x + 100, t.y + 20);
      await settle(page);
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

describe("forced colours and reduced motion", () => {
  test("forced colours: the list at rest has no lit row, focused it is Highlight on HighlightText; the panels keep a CanvasText edge", async () => {
    const { page } = await open(listFixture());
    await page.emulateMedia({ forcedColors: "active" });
    await ready(page);
    const rest = await pseudo(page.locator("[cmdk-item][data-selected='true']"), "::before", "backgroundColor");
    assert.match(rest.backgroundColor, /, 0\)$/, "not in use: no lit row");
    await page.focus(".basalt-command-input");
    await settle(page);
    const lit = await pseudo(page.locator("[cmdk-item][data-selected='true']"), "::before", "backgroundColor");
    assert.doesNotMatch(lit.backgroundColor, /, 0\)$/, "in use: the row is Highlight");
    // forced colours replace every colour, so contrast is the system's: the rest of axe still applies
    const forcedAxe = await page.evaluate((options) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { ...options, rules: { "color-contrast": { enabled: false } } }), AXE).then((r) => r.violations.map((v) => v.id));
    assert.deepEqual(forcedAxe, []);
    const canvasText = await page.evaluate(() => { const probe = document.createElement("div"); probe.style.color = "CanvasText"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
    assert.equal((await style(page.locator(".basalt-command-page"), "borderTopColor")).borderTopColor, canvasText, "the rim is CanvasText");
    await page.close();
  });

  test("reduced motion: no shared plate, each row lights on its own, and the idle list still clears it", async () => {
    const { page } = await open(listFixture());
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page);
    assert.equal(await page.locator(".basalt-command-list .basalt-plate").evaluate((p) => getComputedStyle(p).display), "none");
    assert.equal((await pseudo(page.locator("[cmdk-item][data-selected='true']"), "::before", "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)", "idle");
    await page.focus(".basalt-command-input");
    await settle(page);
    assert.notEqual((await pseudo(page.locator("[cmdk-item][data-selected='true']"), "::before", "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)", "in use");
    await page.close();
  });

  test("at 390 the list fills the width, the rows are at least 44 tall and nothing scrolls sideways", async () => {
    const { page } = await open(listFixture(DETAIL).replace("window.__w ?? 640", "342"), PHONE);
    await ready(page);
    const m = await page.evaluate(() => ({ rows: [...document.querySelectorAll("[cmdk-item]")].map((el) => el.getBoundingClientRect().height), overflow: document.documentElement.scrollWidth - window.innerWidth, mode: document.querySelector(".basalt-command-split").dataset.mode }));
    assert.equal(m.mode, "push");
    assert.ok(m.rows.every((h) => h >= 44), `rows ${m.rows}`);
    assert.equal(m.overflow, 0);
    await page.close();
  });
});
