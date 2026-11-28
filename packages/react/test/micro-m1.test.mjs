// Micro-details m1 (pointer feedback and control geometry; DECISIONS 405 and 409, micro-details/m1/decision.md): the pressable set's user-select,
// touch-action and tap highlight (P1, P7, P8), hover paint under (hover: hover) and the basalt/hover-gate lint (P4), one cursor convention (P6), the press
// paint and the touch mark data-pressing (P8), a wrapped choice's mark on its first line (T4) and the small Nav's derived start (B2). Node checks first (the
// lint and the sources), then Chromium against the built package and its stylesheet. Synthetic data in two unlike domains (a seed library and a ferry
// timetable).
// Tests are paused (DECISIONS 359): written with the batch, not run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";
import stylelint from "stylelint";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const repo = path.join(pkg, "..", "..");
const read = (...p) => fs.readFileSync(path.join(...p), "utf8");
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// ---- Node: the lint

const lint = async (code, file = path.join(repo, "packages", "react", "src", "styles", "probe.css")) => {
  const config = (await import(pathToFileURL(path.join(repo, "stylelint.config.mjs")).href)).default;
  const { results } = await stylelint.lint({ code, config, configBasedir: repo, codeFilename: file });
  return results[0].warnings.map((w) => w.rule);
};

describe("basalt/hover-gate", () => {
  test("a :hover outside @media (hover: hover) fails, in React's sheet and the skill's", async () => {
    assert.ok((await lint(".a:hover { color: var(--basalt-text-primary); }")).includes("basalt/hover-gate"));
    assert.ok((await lint(".a:is(:hover, :focus-visible) { color: var(--basalt-text-primary); }")).includes("basalt/hover-gate"), "a joined focus half is no excuse");
    assert.ok((await lint("@media (forced-colors: active) { .a:hover { color: Highlight; } }")).includes("basalt/hover-gate"), "another query is not the gate");
    // A query that a touch screen also matches is not the gate: every alternative must hold a positive (hover: hover).
    for (const query of ["not (hover: hover)", "(hover: hover), (pointer: coarse)", "(hover: hover) or (hover: none)"]) {
      assert.ok((await lint(`@media ${query} { .a:hover { opacity: 1; } }`)).includes("basalt/hover-gate"), query);
    }
    assert.ok((await lint(".a:hover { color: var(--basalt-text-primary); }", path.join(repo, "tools", "html-skill", "src", "modules", "probe.css"))).includes("basalt/hover-gate"));
  });
  test("a :hover under the gate passes, nested in another query too, and the stricter travel gate counts", async () => {
    assert.deepEqual(await lint("@media (hover: hover) { .a:hover { color: var(--basalt-text-primary); } }"), []);
    assert.deepEqual(await lint("@media (forced-colors: active) { @media (hover: hover) { .a:hover { color: Highlight; } } }"), []);
    assert.deepEqual(await lint("@media (prefers-reduced-motion: no-preference) and (forced-colors: none) and (hover: hover) and (pointer: fine) { .a:hover { opacity: 1; } }"), []);
    assert.deepEqual(await lint(".a:active, .a:focus-visible { color: var(--basalt-text-primary); }"), []);
  });
  test("a disable with a reason passes; one with no reason fails", async () => {
    assert.deepEqual(await lint("/* stylelint-disable-next-line basalt/hover-gate -- removes the wash while the keys are in use */\n.a[data-keys] .b:hover { background: transparent; }"), []);
    assert.ok((await lint("/* stylelint-disable-next-line basalt/hover-gate */\n.a:hover { background: transparent; }")).length > 0);
  });
  test("it is Basalt's own: an app's config does not carry it, and the sites' sheets are not swept", async () => {
    const app = read(pkg, "lint", "stylelint-config.mjs");
    assert.doesNotMatch(app, /hover-gate|hoverGate/);
    assert.deepEqual(await lint(".a:hover { color: var(--basalt-text-primary); }", path.join(repo, "sites", "shared", "probe.css")), []);
  });
  test("every :hover left outside the gate in the two codebases carries a reason (the lint passes on the sources)", async () => {
    const files = [path.join(pkg, "src", "styles", "components.css"), path.join(repo, "tools", "html-skill", "src", "core.css"), ...fs.readdirSync(path.join(repo, "tools", "html-skill", "src", "modules")).filter((f) => f.endsWith(".css")).map((f) => path.join(repo, "tools", "html-skill", "src", "modules", f))];
    for (const file of files) assert.deepEqual((await lint(read(file), file)).filter((r) => r === "basalt/hover-gate"), [], path.relative(repo, file));
  });
});

// ---- Node: the sources

describe("the sources", () => {
  const css = strip(read(pkg, "src", "styles", "components.css"));
  const skill = [path.join(repo, "tools", "html-skill", "src", "core.css"), ...fs.readdirSync(path.join(repo, "tools", "html-skill", "src", "modules")).filter((f) => f.endsWith(".css")).map((f) => path.join(repo, "tools", "html-skill", "src", "modules", f))].map((f) => strip(read(f))).join("\n");
  test("no -webkit-touch-callout is added: main's three stay (the open row, the explained header's two rules, the diagram layer) and the skill has none", () => {
    assert.equal((css.match(/-webkit-touch-callout:\s*none/g) ?? []).length, 4, "open-row, th[data-explained] .sort, th[data-explained]:not([data-sortable]), diagram-layer");
    assert.doesNotMatch(skill, /-webkit-touch-callout/);
  });
  test("React writes the pressable set's rules on its classes, never on a bare button or a", () => {
    const group = css.match(/:where\(\.basalt-button,[^{]*\)\s*\{[^}]*\}/);
    assert.ok(group, "the grouped rule is there");
    assert.match(group[0], /-webkit-user-select:\s*none;\s*user-select:\s*none;\s*touch-action:\s*manipulation;\s*-webkit-tap-highlight-color:\s*transparent/);
    for (const name of ["text-button", "tab", "link-tab", "segment", "page-link", "choice", "checkbox", "radio", "switch", "choice-card", "chip", "option-chip", "switch-row", "menu-item", "listbox-option", "mention-option", "select-trigger", "menu-trigger", "search-trigger", "file-input", "sort", "accordion-trigger", "disclosure-row", "prose-disclosure-trigger", "nav-item", "site-link", "tabbar-item", "notification", "stat-hint", "stream-more", "tray-band", "run-stage-line", "run-stage-node", "open-button", "share-item\\[data-acts\\]", "site-footer-toggle"]) {
      assert.match(group[0], new RegExp(`\\.basalt-${name}[,)]`), name);
    }
    assert.doesNotMatch(group[0], /(?:^|[\s,(])(?:button|a)(?=[\s,)])/);
  });
  test("the skill's core states touch-action on the decided elements, never on a field, a bare label or the page", () => {
    const core = strip(read(repo, "tools", "html-skill", "src", "core.css"));
    const rule = core.match(/a\[href\], button, summary, select,[^{]*\{[^}]*touch-action:\s*manipulation[^}]*\}/);
    assert.ok(rule);
    for (const part of ['[role="option"]', '[role="switch"]', '[role^="menuitem"]', '[type="checkbox"]', '[type="reset"]']) assert.ok(rule[0].includes(part), part);
    assert.doesNotMatch(rule[0], /(?:^|[\s,])(?:label|html|body|textarea)(?=[\s,{])|type="text"/);
  });
});

// ---- Chromium

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const FINE = { viewport: { width: 1440, height: 900 } };
const COARSE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = FINE, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, standards: true, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; padding: 24px; }" });
  await settle(page);
  return { page, errors };
};
const style = (page, selector, props, pseudo = null) => page.evaluate(([s, p, ps]) => { const cs = getComputedStyle(document.querySelector(s), ps); return Object.fromEntries(p.map((k) => [k, cs.getPropertyValue(k)])); }, [selector, props, pseudo]);
/** A colour as the browser resolves it, through a canvas, so a token and a literal compare. */
const resolve = (page, css) => page.evaluate((c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = c; return x.fillStyle; }, css);
const token = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const centre = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
/** Holds a mouse press on an element's centre, reads, and lets go. */
async function pressed(page, selector, read) {
  const { x, y } = await centre(page, selector);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  try { return await read(); } finally { await page.mouse.up(); }
}

const SET = render(`<div style={{ display: "grid", gap: 16, width: 520 }}>
  <B.Button id="btn">Order seeds</B.Button>
  <B.TextButton id="tb">Show the timetable</B.TextButton>
  <B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a">Packets</B.Tab><B.Tab value="b" id="tab-b">Bulk</B.Tab></B.TabsList></B.Tabs>
  <B.SegmentedControl aria-label="Crossing" defaultValue="am"><B.Segment value="am">Morning</B.Segment><B.Segment value="pm" id="seg-pm">Evening</B.Segment></B.SegmentedControl>
  <B.Checkbox id="cb">Heirloom only</B.Checkbox>
  <table><tbody><tr><td><B.Checkbox aria-label="Select row" /></td><td id="cell">Runner bean</td></tr></tbody></table>
  <B.ChoiceCardGroup aria-label="Plan"><B.ChoiceCard title="Day return" description="Leaves 07:40, back by 19:10" value="day" /></B.ChoiceCardGroup>
  <B.Field label="Pier"><B.Input id="field" /></B.Field>
  <B.Link href="#guide" id="link">Read the sowing guide</B.Link>
  <B.PanelList aria-label="Pier facts"><B.PanelRow title="North pier" description="Static row" id="static" /></B.PanelList>
</div>`);

for (const [label, options] of [["a fine pointer", FINE], ["a coarse pointer", COARSE]]) {
  describe(`computed sweep, ${label}`, () => {
    test("every member of the set: user-select none (both), touch-action manipulation, a transparent tap highlight; the hand on a pressable", async () => {
      const { page } = await open(SET, options);
      for (const sel of ["#btn", "#tb", "#tab-b", "#seg-pm", ".basalt-choice", "td .basalt-checkbox", ".basalt-choice-card"]) {
        const s = await style(page, sel, ["user-select", "-webkit-user-select", "touch-action", "-webkit-tap-highlight-color", "cursor"]);
        assert.equal(s["user-select"], "none", sel);
        assert.equal(s["-webkit-user-select"], "none", sel);
        assert.equal(s["touch-action"], "manipulation", sel);
        assert.equal(s["-webkit-tap-highlight-color"], "rgba(0, 0, 0, 0)", sel);
        assert.equal(s.cursor, "pointer", sel);
      }
      const link = await style(page, "#link", ["user-select", "touch-action", "-webkit-tap-highlight-color", "cursor"]);
      assert.notEqual(link["user-select"], "none", "a link stays selectable");
      assert.equal(link["touch-action"], "manipulation");
      assert.equal(link["-webkit-tap-highlight-color"], "rgba(0, 0, 0, 0)");
      assert.equal((await style(page, ".basalt-choice-card-description", ["user-select"]))["user-select"], "text", "a choice card's description is selectable");
      for (const sel of ["#field", "#cell", "#static"]) assert.notEqual((await style(page, sel, ["user-select"]))["user-select"], "none", sel);
      assert.equal((await style(page, "#field", ["touch-action"]))["touch-action"], "auto", "never on a field");
      await page.close();
    });
  });
}

describe("cursors (P6)", () => {
  test("an option row keeps the arrow, disabled or not; a disabled pressable is not-allowed; a label-less root in a cell is the hand; a row's peek plate takes its row's", async () => {
    const { page } = await open(render(`<div style={{ display: "grid", gap: 16, width: 320 }}>
      <B.Listbox label="Packets" defaultValue="a"><B.ListboxOption value="a">Runner bean</B.ListboxOption><B.ListboxOption value="b" id="opt">Sweet pea</B.ListboxOption><B.ListboxOption value="c" disabled id="opt-off">Kale</B.ListboxOption></B.Listbox>
      <B.SegmentedControl aria-label="Crossing" defaultValue="am"><B.Segment value="am">Morning</B.Segment><B.Segment value="pm" disabled id="seg-off">Evening</B.Segment></B.SegmentedControl>
      <B.Checkbox aria-label="Off" disabled id="cb-off" />
      <B.Accordion><B.AccordionItem value="a" title="Timetable" disabled>Body</B.AccordionItem></B.Accordion>
    </div>`));
    assert.equal((await style(page, "#opt", ["cursor"])).cursor, "default");
    assert.equal((await style(page, "#opt-off", ["cursor"])).cursor, "default");
    assert.equal((await style(page, "#seg-off", ["cursor"])).cursor, "not-allowed");
    assert.equal((await style(page, "#cb-off", ["cursor"])).cursor, "not-allowed");
    assert.equal((await style(page, ".basalt-accordion-trigger", ["cursor"])).cursor, "not-allowed");
    const plate = await page.evaluate(() => {
      const p = document.createElement("div"); p.className = "basalt-peek"; p.dataset.kind = "row"; document.body.append(p);
      const open = getComputedStyle(p).cursor; p.toggleAttribute("data-option", true); const option = getComputedStyle(p).cursor; p.remove(); return { open, option };
    });
    assert.deepEqual(plate, { open: "pointer", option: "default" });
    await page.close();
  });
});

describe("the hover gate (P4)", () => {
  test("with hover: none, a forced :hover changes no colour; with hover: hover each takes its step; :focus-visible on a link card still lifts its arrow", async () => {
    const BODY = render(`<div style={{ display: "grid", gap: 16, width: 360 }}>
      <B.Button variant="ghost" id="ghost">Reschedule</B.Button>
      <B.TextButton quiet id="quiet">Show fares</B.TextButton>
      <B.Link href="#x" id="link">Sowing guide</B.Link>
      <B.LinkCard href="#y" title="Winter crossings" id="card">Fewer sailings</B.LinkCard>
    </div>`);
    const cdpHover = async (page, selector) => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
      const { root } = await cdp.send("DOM.getDocument");
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
      await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });
    };
    for (const [opts, hovers] of [[COARSE, false], [FINE, true]]) {
      const { page } = await open(BODY, opts);
      const rest = {
        ghost: await style(page, "#ghost", ["color", "background-color"]),
        quiet: await style(page, "#quiet", ["color"]),
        link: await style(page, "#link", ["text-decoration-color"]),
      };
      for (const sel of ["#ghost", "#quiet", "#link"]) await cdpHover(page, sel);
      const now = {
        ghost: await style(page, "#ghost", ["color", "background-color"]),
        quiet: await style(page, "#quiet", ["color"]),
        link: await style(page, "#link", ["text-decoration-color"]),
      };
      if (hovers) assert.notDeepEqual(now, rest, "hover paints where a pointer hovers");
      else assert.deepEqual(now, rest, "no hover paint where nothing hovers");
      await page.close();
    }
    const { page } = await open(BODY, COARSE);
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
    await settle(page);
    assert.equal(await resolve(page, (await style(page, "#card .basalt-go-arrow", ["color"])).color), await resolve(page, await token(page, "--basalt-text-primary")), "focus lifts the arrow with hover: none");
    await page.close();
  });
});

for (const theme of ["dark", "light"]) {
  describe(`press paint (P8), ${theme}`, () => {
    test("an unchecked box presses to the selected wash with a secondary edge; a checked checkbox and switch to action-primary-press; a checked radio does not change", async () => {
      const { page } = await open(render(`<div style={{ display: "grid", gap: 12 }}>
        <B.Checkbox id="off">Heirloom only</B.Checkbox>
        <B.Checkbox id="on" defaultChecked>Organic</B.Checkbox>
        <B.Switch id="sw" defaultChecked>Reminders</B.Switch>
        <B.RadioGroup aria-label="Sailing" defaultValue="a"><B.Radio value="a" id="ra">07:40</B.Radio><B.Radio value="b">09:15</B.Radio></B.RadioGroup>
        <B.Checkbox id="dis" disabled>Sold out</B.Checkbox>
      </div>`), FINE, theme);
      const selected = await resolve(page, await token(page, "--basalt-state-selected"));
      const press = await resolve(page, await token(page, "--basalt-action-primary-press"));
      const secondary = await resolve(page, await token(page, "--basalt-text-secondary"));
      const box = (id) => `.basalt-choice:has(#${id}) > :is(.basalt-checkbox, .basalt-switch, .basalt-radio), #${id}:is(.basalt-checkbox, .basalt-switch, .basalt-radio)`;
      const off = await pressed(page, "#off", () => style(page, box("off"), ["background-color", "box-shadow", "transition-duration"]));
      assert.equal(await resolve(page, off["background-color"]), selected);
      assert.ok(off["box-shadow"].includes(secondary.startsWith("#") ? "" : secondary) || off["box-shadow"].includes("inset"), off["box-shadow"]);
      const on = await pressed(page, "#on", () => style(page, box("on"), ["background-color"]));
      assert.equal(await resolve(page, on["background-color"]), press);
      const sw = await pressed(page, "#sw", () => style(page, box("sw"), ["background-color"]));
      assert.equal(await resolve(page, sw["background-color"]), press);
      const radioRest = await style(page, box("ra"), ["background-color", "box-shadow"]);
      const radio = await pressed(page, "#ra", () => style(page, box("ra"), ["background-color", "box-shadow"]));
      assert.deepEqual(radio, radioRest, "a pressed checked radio keeps action-primary");
      const disRest = await style(page, box("dis"), ["background-color"]);
      assert.deepEqual(await pressed(page, "#dis", () => style(page, box("dis"), ["background-color"])), disRest, "a disabled choice takes no press");
      assert.equal(await page.locator(".basalt-checkbox").first().evaluate((el) => getComputedStyle(el).transform), "none", "never a scale");
      await page.close();
    });

    test("tabs, segments, TextButton, a link, a page link, the select trigger, the search trigger and the accordion caret take their decided press", async () => {
      const { page } = await open(render(`<div style={{ display: "grid", gap: 12, width: 520 }}>
        <B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a">Packets</B.Tab><B.Tab value="b" id="tab-b">Bulk</B.Tab></B.TabsList></B.Tabs>
        <B.SegmentedControl aria-label="Crossing" defaultValue="am"><B.Segment value="am">Morning</B.Segment><B.Segment value="pm" id="seg-pm">Evening</B.Segment></B.SegmentedControl>
        <B.TextButton quiet id="quiet">Show fares</B.TextButton>
        <B.Link href="#x" id="link">Sowing guide</B.Link>
        <B.Select aria-label="Pier" placeholder="Choose a pier" id="sel" options={[{ value: "n", label: "North pier" }]} />
        <B.SearchTrigger />
        <B.Accordion><B.AccordionItem value="a" title="Timetable">Body</B.AccordionItem></B.Accordion>
        <B.Pagination aria-label="Pages" page={2} pageCount={5} hrefForPage={(n) => "#p" + n} />
      </div>`), FINE, theme);
      const primary = await resolve(page, await token(page, "--basalt-text-primary"));
      const secondary = await resolve(page, await token(page, "--basalt-text-secondary"));
      const selected = await resolve(page, await token(page, "--basalt-state-selected"));
      for (const sel of ["#tab-b", "#seg-pm", "#quiet"]) {
        const s = await pressed(page, sel, () => style(page, sel, ["color", "background-color"]));
        assert.equal(await resolve(page, s.color), primary, `${sel} lifts to primary`);
        assert.equal(await resolve(page, s["background-color"]), await resolve(page, "transparent"), `${sel} takes no wash`);
      }
      const link = await pressed(page, "#link", () => style(page, "#link", ["text-decoration-color", "color"]));
      assert.equal(link["text-decoration-color"], link.color, "the underline goes to the ink, never a step down");
      const pageLink = ".basalt-page-link:not([aria-current])";
      const pl = await pressed(page, pageLink, () => style(page, pageLink, ["color", "background-color"]));
      assert.equal(await resolve(page, pl.color), primary);
      assert.equal(await resolve(page, pl["background-color"]), selected);
      const trigger = await pressed(page, ".basalt-select-trigger", () => style(page, ".basalt-select-trigger", ["background-color"]));
      assert.match(trigger["background-color"], /^(rgb\(|color\(srgb [\d.]+ [\d.]+ [\d.]+\)$)/, "one opaque colour, not a translucent wash");
      const placeholder = await pressed(page, ".basalt-select-trigger", () => style(page, ".basalt-select-value[data-placeholder]", ["color"]));
      assert.equal(await resolve(page, placeholder.color), secondary, "the placeholder goes to secondary on the press fill");
      const caret = await pressed(page, ".basalt-accordion-trigger", () => style(page, ".basalt-accordion-caret", ["color"]));
      assert.equal(await resolve(page, caret.color), primary);
      assert.equal(await page.locator("#tab-b").evaluate((el) => getComputedStyle(el).transform), "none");
      await page.close();
    });

    test("the search trigger presses to the selected wash under 720 and to primary ink on a clear ground from 720", async () => {
      for (const [opts, wash] of [[{ viewport: { width: 390, height: 844 } }, true], [FINE, false]]) {
        const { page } = await open(render(`<B.SearchTrigger />`), opts, theme);
        const s = await pressed(page, ".basalt-search-trigger", () => style(page, ".basalt-search-trigger", ["background-color", "color"]));
        if (wash) assert.equal(await resolve(page, s["background-color"]), await resolve(page, await token(page, "--basalt-state-selected")));
        else {
          assert.equal(await resolve(page, s["background-color"]), await resolve(page, "transparent"));
          assert.equal(await resolve(page, s.color), await resolve(page, await token(page, "--basalt-text-primary")));
        }
        await page.close();
      }
    });

    test("an in-flow listbox option steps its band to the selected wash with its slots at secondary, over its hover (a mouse press is hovered too); a selected one does not change", async () => {
      const { page } = await open(render(`<div style={{ width: 320 }}><B.Listbox label="Packets" defaultValue="a"><B.ListboxOption value="a" id="chosen">Runner bean</B.ListboxOption><B.ListboxOption value="b" id="opt" trailing="12 g">Sweet pea</B.ListboxOption></B.Listbox></div>`), FINE, theme);
      // The chosen option first, while it is still the chosen one: a press on #opt chooses #opt on release.
      const chosenRest = await style(page, "#chosen", ["background-color", "color"]);
      assert.deepEqual(await pressed(page, "#chosen", () => style(page, "#chosen", ["background-color", "color"])), chosenRest);
      // A real mouse press: the pointer is over #opt, so :hover and :active both match, and the press must win (it comes after the hover rule).
      const s = await pressed(page, "#opt", () => style(page, "#opt", ["background-color"], "::before"));
      assert.equal(await resolve(page, s["background-color"]), await resolve(page, await token(page, "--basalt-state-selected")));
      await page.close();
    });

    test("a file input presses from its native input, never from Clear", async () => {
      const { page } = await open(render(`<div style={{ width: 360 }}><B.Field label="Photo"><B.FileInput name="photo" /></B.Field></div>`), FINE, theme);
      const rest = await style(page, ".basalt-file-input", ["background-color"]);
      const s = await pressed(page, ".basalt-file-input", () => style(page, ".basalt-file-input", ["background-color"]));
      assert.notEqual(s["background-color"], rest["background-color"]);
      await page.close();
    });

    test("the press holds under reduced motion: in at once, out over duration-fast, colour only", async () => {
      const { page } = await open(render(`<B.Checkbox id="off">Heirloom only</B.Checkbox>`), FINE, theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const s = await pressed(page, "#off", () => style(page, ".basalt-checkbox", ["background-color", "transition-duration", "transform"]));
      assert.equal(await resolve(page, s["background-color"]), await resolve(page, await token(page, "--basalt-state-selected")));
      assert.equal(s.transform, "none");
      await page.close();
    });
  });
}

describe("forced colours (P8)", () => {
  test("a pressed checked checkbox and switch keep Highlight with a HighlightText mark; a pressed unchecked box keeps Canvas; a pressed page link is not Highlight", async () => {
    const { page } = await open(render(`<div style={{ display: "grid", gap: 12 }}>
      <B.Checkbox id="on" defaultChecked>Organic</B.Checkbox><B.Checkbox id="off">Heirloom</B.Checkbox><B.Switch id="sw" defaultChecked>Reminders</B.Switch>
      <B.Pagination aria-label="Pages" page={2} pageCount={5} hrefForPage={(n) => "#p" + n} />
    </div>`));
    await page.emulateMedia({ forcedColors: "active" });
    const system = await page.evaluate(() => { const d = document.createElement("div"); document.body.append(d); const read = (c) => { d.style.color = c; return getComputedStyle(d).color; }; const out = { Highlight: read("Highlight"), HighlightText: read("HighlightText"), Canvas: read("Canvas") }; d.remove(); return out; });
    const box = (id) => `.basalt-choice:has(#${id}) > :is(.basalt-checkbox, .basalt-switch), #${id}:is(.basalt-checkbox, .basalt-switch)`;
    for (const id of ["on", "sw"]) {
      const s = await pressed(page, `#${id}`, () => style(page, box(id), ["background-color"]));
      assert.equal(s["background-color"], system.Highlight, `${id} stays Highlight`);
    }
    const mark = await pressed(page, "#on", () => style(page, ".basalt-checkbox-indicator", ["color"]));
    assert.equal(mark.color, system.HighlightText, "never 1:1");
    const off = await pressed(page, "#off", () => style(page, box("off"), ["background-color"]));
    assert.equal(off["background-color"], system.Canvas);
    const pageLink = ".basalt-page-link:not([aria-current])";
    const pl = await pressed(page, pageLink, () => style(page, pageLink, ["background-color"]));
    assert.notEqual(pl["background-color"], system.Highlight);
    await page.close();
  });
});

describe("a still touch on a row (P8, the touch mark)", () => {
  const cdpTouch = async (page) => {
    const cdp = await page.context().newCDPSession(page);
    return {
      start: (x, y) => cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }),
      move: (x, y) => cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }),
      end: () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }),
      cancel: () => cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] }),
    };
  };
  const MENU = render(`<B.Menu defaultOpen modal={false}><B.MenuTrigger>Seeds</B.MenuTrigger><B.MenuContent>
    <B.MenuItem description="Ships in a paper envelope">Order a packet</B.MenuItem><B.MenuItem>Rename</B.MenuItem><B.MenuItem disabled>Archived</B.MenuItem>
  </B.MenuContent></B.Menu>`);
  test("a 180ms still touch marks the first row and shows its plate before release, with its description at secondary; gone after release", async () => {
    const { page } = await open(MENU, COARSE);
    const row = ".basalt-menu-item";
    const { x, y } = await centre(page, row);
    const touch = await cdpTouch(page);
    const highlighted = await page.locator(row).first().getAttribute("data-highlighted");
    await touch.start(x, y);
    await page.waitForTimeout(180);
    assert.equal(await page.locator(row).first().getAttribute("data-pressing"), "");
    const plate = await style(page, row, ["background-color"], "::before");
    assert.notEqual(await resolve(page, plate["background-color"]), await resolve(page, "transparent"), "the plate shows under the finger");
    assert.equal(await resolve(page, (await style(page, ".basalt-menu-item-description", ["color"])).color), await resolve(page, await token(page, "--basalt-text-secondary")));
    assert.equal(await page.locator(row).first().getAttribute("data-highlighted"), highlighted, "the highlight does not move");
    await touch.end();
    assert.equal(await page.locator(`${row}[data-pressing]`).count(), 0);
    await page.close();
  });
  test("cleared on cancel, on 8px of travel and on a scroll; a disabled row never takes it; a mouse press never sets it", async () => {
    const { page } = await open(MENU, COARSE);
    const rows = page.locator(".basalt-menu-item");
    const touch = await cdpTouch(page);
    const first = await centre(page, ".basalt-menu-item");
    await touch.start(first.x, first.y); await touch.cancel();
    assert.equal(await page.locator("[data-pressing]").count(), 0, "cancel clears it");
    await touch.start(first.x, first.y); await touch.move(first.x, first.y + 9);
    assert.equal(await page.locator("[data-pressing]").count(), 0, "8px of travel clears it");
    await touch.end();
    await touch.start(first.x, first.y);
    // The listener is on the glide's host, the nearest port or popup round the plate: the scroll is dispatched there, where a real one fires.
    await page.evaluate(() => document.querySelector(".basalt-plate").closest(".basalt-menu-scroll, .basalt-menu, .basalt-command-list").dispatchEvent(new Event("scroll")));
    assert.equal(await page.locator("[data-pressing]").count(), 0, "a scroll clears it");
    await touch.end();
    const off = await rows.nth(2).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await touch.start(off.x, off.y);
    assert.equal(await page.locator("[data-pressing]").count(), 0, "a disabled row never takes the mark");
    await touch.end();
    await page.close();
    const desk = await open(MENU, FINE);
    const at = await centre(desk.page, ".basalt-menu-item");
    await desk.page.mouse.move(at.x, at.y); await desk.page.mouse.down();
    assert.equal(await desk.page.locator("[data-pressing]").count(), 0, "a mouse press never sets it");
    await desk.page.mouse.up();
    await desk.page.close();
  });
  test("a checkbox row toggles once on release and keeps its value after a cancel", async () => {
    const { page } = await open(render(`<B.Menu defaultOpen modal={false}><B.MenuTrigger>View</B.MenuTrigger><B.MenuContent><B.MenuCheckboxItem id="ck">Show sold out</B.MenuCheckboxItem></B.MenuContent></B.Menu>`), COARSE);
    const touch = await cdpTouch(page);
    const at = await centre(page, ".basalt-menu-item");
    await touch.start(at.x, at.y); await touch.cancel();
    assert.equal(await page.locator(".basalt-menu-item").first().getAttribute("aria-checked"), "false", "a cancel chooses nothing");
    await touch.start(at.x, at.y); await touch.end();
    await page.waitForTimeout(50);
    assert.equal(await page.locator(".basalt-menu-item").first().getAttribute("aria-checked"), "true", "the release toggles it, once");
    assert.equal(await page.locator("[data-pressing]").count(), 0);
    await page.close();
  });
  test("a still finger on the lit row of an unfocused in-page command list shows its plate (the idle reset never hides a held row)", async () => {
    const { page } = await open(render(`<div style={{ width: 420 }}><B.CommandList label="Timetable" groups={[{ label: "Sailings", commands: [{ id: "a", label: "Book the 07:40" }, { id: "b", label: "Book the 09:15" }] }]} /></div>`), COARSE);
    assert.ok(await page.locator(".basalt-command-list[data-idle]").count(), "the list is idle before any use");
    const row = '.basalt-menu-item[data-selected="true"]';
    const touch = await cdpTouch(page);
    const at = await centre(page, row);
    await touch.start(at.x, at.y);
    await page.waitForTimeout(180);
    const plate = await style(page, row, ["background-color"], "::before");
    assert.notEqual(await resolve(page, plate["background-color"]), await resolve(page, "transparent"), "the held row's plate shows on the first press");
    assert.equal(await resolve(page, (await style(page, row, ["color"])).color), await resolve(page, await token(page, "--basalt-text-primary")));
    await touch.end();
    await page.close();
  });
});

describe("a wrapped choice's mark sits on its first line (T4)", () => {
  const measure = (page, id) => page.evaluate((i) => {
    const label = document.querySelector(`.basalt-choice:has(#${i}), #${i}.basalt-choice`) ?? document.getElementById(i).closest(".basalt-choice");
    const mark = label.querySelector(":scope > :is(.basalt-checkbox, .basalt-radio, .basalt-switch)");
    const words = label.querySelector(":scope > :not(.basalt-checkbox, .basalt-radio, .basalt-switch)");
    const range = document.createRange(); range.selectNodeContents(words ?? label);
    const first = range.getClientRects()[0];
    const m = mark.getBoundingClientRect();
    return { markCentre: m.top + m.height / 2, firstCentre: first.top + first.height / 2, height: label.getBoundingClientRect().height, line: parseFloat(getComputedStyle(label).lineHeight) };
  }, id);
  const LONG = "Send me the spring sowing calendar, the frost dates for my district and a reminder when the seed potatoes ship";
  for (const [label, extra] of [["at the label's own line", ""], ["with the label's line raised to 32px", ".basalt-choice { line-height: 32px !important; }"], ["with a reader's 1.5 line spacing", "* { line-height: 1.5 !important; }"]]) {
    for (const viewport of [FINE, COARSE]) {
      test(`${label}, ${viewport.viewport.width}: a wrapped checkbox and switch keep their mark on the first line, within 0.5px`, async () => {
        const { page } = await open(render(`<div style={{ width: 300 }}><B.Checkbox id="cb">${LONG}</B.Checkbox><B.Switch id="sw">${LONG}</B.Switch><B.Checkbox id="one">Organic</B.Checkbox></div>`), viewport);
        if (extra) await page.addStyleTag({ content: extra });
        for (const id of ["cb", "sw", "one"]) {
          const m = await measure(page, id);
          assert.ok(Math.abs(m.markCentre - m.firstCentre) <= 0.5, `${id}: the mark is ${m.markCentre - m.firstCentre}px off the first line`);
        }
        await page.close();
      });
    }
  }
  test("a choice inline in a line of text keeps its baseline; a choice in a SelectableItem carries one margin, not two", async () => {
    const { page } = await open(render(`<div style={{ width: 400 }}><p id="line">Ships on Fridays <B.Checkbox id="inline">Remind me</B.Checkbox> from the north pier.</p>
      <B.SelectableList label="Seeds" values={["a"]}><B.SelectableItem value="a" label="Choose runner bean"><span>Runner bean</span></B.SelectableItem></B.SelectableList></div>`));
    const base = await page.evaluate(() => { const p = document.getElementById("line"); const c = p.querySelector(".basalt-choice"); const r = document.createRange(); r.setStart(p.firstChild, 0); r.setEnd(p.firstChild, 5); return { text: r.getBoundingClientRect().bottom, choice: c.getBoundingClientRect().bottom }; });
    assert.ok(Number.isFinite(base.text) && Number.isFinite(base.choice));
    const margins = await page.evaluate(() => { const box = document.querySelector(".basalt-selectable-item .basalt-checkbox"); return box ? getComputedStyle(box).marginTop : null; });
    if (margins !== null) assert.equal(margins, "2px", "the selectable item's own first-line margin, once");
    await page.close();
  });
});

describe("the small Nav's start inset (B2)", () => {
  for (const [label, opts, density, start] of [["default", FINE, "", 8], ["compact", FINE, "compact", 6], ["touch", COARSE, "", 14]]) {
    test(`${label}: the small pill's start padding is ${start} and its glyph's box is centred on the cap; the default Nav does not move`, async () => {
      const { page } = await open(render(`<div ${density ? `data-density="${density}"` : ""} style={{ width: 280 }}>
        <B.Nav aria-label="Primary"><B.NavItem href="#a" icon={B.HomeGlyph} current>Seed library</B.NavItem></B.Nav>
        <B.Nav aria-label="Saved" size="sm"><B.NavItem href="#b" icon={B.HomeGlyph} id="small">Ferry timetable</B.NavItem><B.NavItem href="#c">Words only</B.NavItem></B.Nav>
      </div>`), opts);
      const pills = page.locator('.basalt-nav[data-size="sm"] .basalt-nav-pill');
      const s = await pills.first().evaluate((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); const g = el.querySelector(".basalt-icon").getBoundingClientRect(); return { start: parseFloat(cs.paddingInlineStart), end: parseFloat(cs.paddingInlineEnd), glyphFromStart: g.left - r.left + g.width / 2, half: r.height / 2 }; });
      assert.equal(s.start, start);
      assert.equal(s.end, 12, "the end keeps space-3");
      assert.ok(Math.abs(s.glyphFromStart - s.half) <= 0.5, "the glyph's box centre is the cap's centre");
      assert.equal(await pills.nth(1).evaluate((el) => parseFloat(getComputedStyle(el).paddingInlineStart)), 12, "the glyphless item keeps its symmetric space-3");
      assert.equal(await page.locator(".basalt-nav:not([data-size]) .basalt-nav-pill").first().evaluate((el) => parseFloat(getComputedStyle(el).paddingInlineStart)), 12, "the default Nav keeps space-3");
      await page.close();
    });
  }
});
