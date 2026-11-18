// The sixth fix batch from the components audit. A1-01, the hidden form input's layer, built again: Basalt marks its own mirror input through
// `inputRef` and the stylesheet moves only what carries the mark. The tests count layers rather than time them, so a loaded machine cannot fail them.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

const React = createRequire(import.meta.url)("react");
const { renderToString } = createRequire(import.meta.url)("react-dom/server");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// ---- A page built from a tree, on the client or hydrated from the server ---------------------------------------------------------
let basalt;
const dist = () => pathToFileURL(path.join(pkg, "dist", "index.js")).href;
const RULE = /\[data-basalt-mirror\]\{[^}]*\}/;
const nextFrames = (page, n = 3) => page.evaluate((count) => new Promise((resolve) => { const step = (left) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve()); step(count); }), n);

/**
 * A page holding `tree`, a function `(B, h) => element` written as plain JavaScript (h is createElement) so the same text builds the server's markup in
 * Node and the browser's tree. `mode` is "client" (rendered into an empty page) or "hydrated" (renderToString in Node, then hydrateRoot in the page).
 * `rule: false` takes the mirror rule out of the stylesheet, which is the page as it was before the fix: the test's own control.
 */
async function treePage(tree, { mode = "client", rule = true, theme = "light", viewport = { width: 900, height: 900 }, deviceScaleFactor = 1, before = "" } = {}) {
  basalt ??= await import(dist());
  const html = mode === "hydrated" ? renderToString(new Function("B", "h", `return (${tree})(B, h)`)(basalt, React.createElement)) : "";
  let css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
  if (!rule) {
    assert.ok(RULE.test(css), "the stylesheet holds the mirror rule");
    css = css.replace(RULE, "");
  }
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
  await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style></head><body style="margin:0"><div id="root">${html}</div></body></html>`);
  const rendered = { html };
  await page.addScriptTag({ content: await bundleFixture(`import { hydrateRoot } from "react-dom/client"; ${before}\n const tree = (${tree})(B, React.createElement); const host = document.getElementById("root"); ${mode === "hydrated" ? "hydrateRoot(host, tree);" : "createRoot(host).render(tree);"}`) });
  await nextFrames(page, 4);
  await settle(page);
  return { page, errors, ...rendered };
}

/** Chrome's own count of composited layers, once the page is idle. */
const layers = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  let latest = [];
  cdp.on("LayerTree.layerTreeDidChange", (event) => { latest = event.layers ?? latest; });
  await cdp.send("LayerTree.enable");
  await nextFrames(page, 2);
  await page.waitForTimeout(150);
  return latest.length;
};

const positions = (page, selector = "input") => page.evaluate((s) => [...document.querySelectorAll(s)].map((i) => getComputedStyle(i).position), selector);
const kinds = (list) => [...new Set(list)];

// ---- A1-01: the layers --------------------------------------------------------------------------------------------------------
const ROWS = 1000;
const TICK_TABLE = `(B, h) => h(B.TableContainer, { label: "Runs" }, h(B.Table, { columns: [{ width: 60 }, {}], minWidth: 300 }, h(B.TableBody, null, ...Array.from({ length: ${ROWS} }, (_, i) => h(B.TableRow, { key: i }, h(B.TableCell, null, h(B.Checkbox, { "aria-label": "Select " + i })), h(B.TableCell, null, "run " + i))))))`;

for (const theme of ["light", "dark"]) {
  for (const mode of ["client", "hydrated"]) {
    describe(`A1-01: a table of ${ROWS} rows with a checkbox in each, ${mode} (${theme})`, () => {
      test("the hidden inputs are not layers, ticked and unticked, and each one carries the mark", async () => {
        const { page, errors } = await treePage(TICK_TABLE, { mode, theme });
        try {
          assert.equal(await page.locator("input[data-basalt-mirror]").count(), ROWS, "every checkbox's mirror input is marked");
          assert.equal(await page.locator("input").count(), ROWS, "and there is no other input");
          assert.deepEqual(kinds(await positions(page)), ["absolute"]);
          const idle = await layers(page);
          assert.ok(idle < 40, `${idle} layers for ${ROWS} checkboxes`);
          const box = page.getByRole("checkbox", { name: "Select 7", exact: true });
          await box.click();
          assert.equal(await box.getAttribute("aria-checked"), "true");
          const ticked = await layers(page);
          await box.click();
          assert.equal(await box.getAttribute("aria-checked"), "false");
          const unticked = await layers(page);
          assert.ok(ticked < 40 && unticked < 40, `${ticked} layers ticked and ${unticked} unticked`);
          assert.deepEqual(errors, [], "no hydration warning or other error");
        } finally { await page.close(); }
      });

      test("without the rule the same table is a layer for every input (the test's own control)", async () => {
        const { page } = await treePage(TICK_TABLE, { mode, theme, rule: false });
        try {
          assert.deepEqual(kinds(await positions(page)), ["fixed"]);
          const count = await layers(page);
          assert.ok(count > ROWS * 0.9, `${count} layers for ${ROWS} checkboxes without the rule`);
        } finally { await page.close(); }
      });
    });
  }
}

// ---- A1-01: the mark is on Basalt's mirror input and nowhere else --------------------------------------------------------------
describe("A1-01: only the input Basalt's own control rendered is moved", () => {
  // Sol's case: a foreign component passed through `render` draws its own hidden input beside the control. It is the next sibling of the real
  // control element, so a rule by adjacency took it; the mark does not.
  const FOREIGN = `(B, h) => {
    function ForeignControl({ children, ...props }) {
      return [
        h("span", { key: "control", ...props }, children),
        h("input", { key: "mirror", "aria-hidden": "true", tabIndex: -1, "data-owner": "foreign", defaultValue: "Library private value", style: { position: "fixed", left: -10000, top: 0, width: 153, height: 21 } }),
      ];
    }
    const row = (key, ...content) => h(B.TableRow, { key }, h(B.TableCell, null, ...content));
    const own = (key, name) => h("input", { key, "aria-hidden": "true", tabIndex: -1, "data-owner": name, style: { position: "fixed", left: "-10000px", top: 0, width: 153, height: 21 } });
    return h(B.Table, null, h(B.TableBody, null,
      row("a", h(B.Checkbox, { render: h(ForeignControl), "aria-label": "Pick A" })),
      row("b", h(B.Switch, { render: h(ForeignControl), "aria-label": "Pick B" })),
      row("c", h(B.NumberField, { render: h(ForeignControl), "aria-label": "Pick C" })),
      row("d", h(B.RadioGroup, { "aria-label": "Plan" }, h(B.Radio, { value: "a", render: h(ForeignControl) }, "A"))),
      row("e", h(B.Checkbox, { "aria-label": "Plain" }), own("after", "app-after-checkbox")),
      row("f", own("alone", "app-alone")),
    ));
  }`;
  for (const mode of ["client", "hydrated"]) {
    test(`a foreign component's own hidden input, passed through render, and an app's own, stay where their owners put them, to the pixel (${mode})`, async () => {
      const read = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("input[data-owner]")].map((i, n) => { const r = i.getBoundingClientRect(); const c = getComputedStyle(i); return [`${i.dataset.owner}#${n}`, [c.position, c.left, c.top, r.x, r.y, r.width, r.height]]; })));
      const { page, errors } = await treePage(FOREIGN, { mode });
      const bare = await treePage(FOREIGN, { mode, rule: false });
      try {
        const shipped = await read(page);
        assert.equal(Object.keys(shipped).length, 6, `${Object.keys(shipped).length} foreign and app inputs`);
        for (const [name, [position, left, top, x, y, width, height]] of Object.entries(shipped)) {
          assert.equal(position, "fixed", `${name} stays fixed`);
          assert.deepEqual([x, y, width, height], [-10000, 0, 153, 21], `${name} is at x -10000, y 0, 153 by 21`);
          assert.equal(top, "0px");
          assert.ok(left === "-10000px", `${name} left is ${left}`);
        }
        assert.deepEqual(await read(bare.page), shipped, "the same page without the rule is identical for these inputs");
        // The control's own mirrors in the same page are the ones that moved.
        assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("input[data-basalt-mirror]")].map((i) => [i.dataset.owner ?? "", getComputedStyle(i).position])).then((l) => kinds(l.map(([, p]) => p))), ["absolute"]);
        assert.ok((await page.locator("input[data-basalt-mirror]").count()) >= 5, "Basalt's own mirrors are marked");
        assert.deepEqual(errors, []);
      } finally { await page.close(); await bare.page.close(); }
    });
  }

  test("an input an app places before or after a control, or inside its label, is not touched (adjacency is not ownership)", async () => {
    const tree = `(B, h) => {
      const own = (key, name) => h("input", { key, "aria-hidden": "true", tabIndex: -1, "data-owner": name, style: { position: "fixed", left: "-10000px", top: 0, width: 153, height: 21 } });
      return h("div", null, own("before", "before"), h(B.Checkbox, { "aria-label": "x" }), own("after", "after"), h(B.Checkbox, null, "Label", own("in", "in-label")), h(B.Slider, { "aria-label": "Level", defaultValue: 30 }), own("after-slider", "after-slider"));
    }`;
    return treePage(tree).then(async ({ page }) => {
      try {
        const got = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("input[data-owner]")].map((i) => [i.dataset.owner, getComputedStyle(i).position])));
        assert.deepEqual(got, { before: "fixed", after: "fixed", "in-label": "fixed", "after-slider": "fixed" });
      } finally { await page.close(); }
    });
  });

  test("the Slider's range input is a real focus target and keeps its own style", async () => {
    const { page } = await treePage(`(B, h) => h("div", null, h(B.Slider, { "aria-label": "Level", defaultValue: 30 }), h(B.Table, null, h(B.TableBody, null, h(B.TableRow, null, h(B.TableCell, null, h(B.Slider, { "aria-label": "In a table", defaultValue: 30 }))))))`);
    try {
      assert.equal(await page.locator("input[type=range][data-basalt-mirror]").count(), 0, "the range input is not marked");
      assert.deepEqual(kinds(await positions(page, "input[type=range]")), ["fixed"]);
      // It was never a layer of its own cost: Base UI's thumb is a transformed box, which already contains it.
      assert.ok((await layers(page)) < 40);
    } finally { await page.close(); }
  });

  // Sol's second case: an open Select puts focus guards between the trigger and its mirror, so a rule by adjacency stopped matching.
  for (const open of ["initially open", "opened by a click"]) {
    test(`an open Select's mirror is still marked and absolute (${open})`, async () => {
      const tree = `(B, h) => h(B.Table, null, h(B.TableBody, null, ...Array.from({ length: 40 }, (_, i) => h(B.TableRow, { key: i }, h(B.TableCell, null, h(B.Select, { "aria-label": "Region " + i, defaultOpen: ${open === "initially open" ? "i === 0" : "false"}, options: [{ value: "eu", label: "Europe" }, { value: "us", label: "Americas" }] }))))))`;
      const { page, errors } = await treePage(tree);
      try {
        if (open === "opened by a click") await page.getByRole("combobox", { name: "Region 0" }).click();
        await page.locator(".basalt-select-popup").waitFor();
        await settle(page);
        // The guards are between the trigger and the mirror: the mirror is no longer the trigger's next sibling.
        assert.equal(await page.evaluate(() => { const t = document.querySelector(".basalt-select-trigger"); return t.nextElementSibling?.tagName === "INPUT"; }), false, "something sits between the open Select's trigger and its mirror");
        assert.equal(await page.locator("input[data-basalt-mirror]").count(), 40);
        assert.deepEqual(kinds(await positions(page, "input[data-basalt-mirror]")), ["absolute"]);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }

  // Sol's third case: a named, unchecked Checkbox or Switch with `uncheckedValue` renders a type=hidden input before its mirror.
  test("uncheckedValue: the type=hidden input has no box, the mirror is marked, and the form submits the right value either way", async () => {
    const tree = `(B, h) => h("form", { id: "f", onSubmit: (event) => { event.preventDefault(); window.sent = Object.fromEntries([...new FormData(event.currentTarget).entries()].map(([k, v]) => [k, String(v)])); } },
      h(B.Checkbox, { name: "terms", value: "yes", uncheckedValue: "no", "aria-label": "Terms" }),
      h(B.Switch, { name: "news", value: "on", uncheckedValue: "off", "aria-label": "News" }),
      h("button", { id: "go", type: "submit" }, "Go"))`;
    return treePage(tree).then(async ({ page, errors }) => {
      try {
        const info = await page.evaluate(() => [...document.querySelectorAll("input")].map((i) => ({ type: i.type, marked: i.hasAttribute("data-basalt-mirror"), position: getComputedStyle(i).position })));
        assert.equal(info.filter((i) => i.type === "hidden").length, 2, "an unchecked box and switch each render a hidden input");
        assert.deepEqual(info.filter((i) => i.marked).map((i) => [i.type, i.position]), [["checkbox", "absolute"], ["checkbox", "absolute"]], "only the two mirrors are marked");
        await page.click("#go");
        assert.deepEqual(await page.evaluate(() => window.sent), { terms: "no", news: "off" });
        await page.getByRole("checkbox", { name: "Terms" }).click();
        await page.getByRole("switch", { name: "News" }).click();
        await page.click("#go");
        assert.deepEqual(await page.evaluate(() => window.sent), { terms: "yes", news: "on" });
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  });
});

// ---- A1-01: every control still submits its value ----------------------------------------------------------------------------
const FORM = `(B, h) => h("form", { id: "f", onSubmit: (event) => { event.preventDefault(); window.sent = Object.fromEntries([...new FormData(event.currentTarget).entries()].map(([k, v]) => [k, String(v)])); } },
  h(B.Checkbox, { name: "terms", value: "yes", defaultChecked: true, "aria-label": "Terms" }),
  h(B.Switch, { name: "news", value: "on", defaultChecked: true, "aria-label": "News" }),
  h(B.RadioGroup, { name: "plan", "aria-label": "Plan", defaultValue: "b" }, h(B.Radio, { value: "a" }, "A"), h(B.Radio, { value: "b" }, "B")),
  h(B.Select, { name: "region", "aria-label": "Region", defaultValue: "us", options: [{ value: "eu", label: "Europe" }, { value: "us", label: "Americas" }] }),
  h(B.Combobox, { name: "zone", "aria-label": "Zone", defaultValue: "y", options: [{ value: "x", label: "X-ray" }, { value: "y", label: "Yankee" }] }),
  h(B.NumberField, { name: "count", "aria-label": "Count", defaultValue: 4 }),
  h(B.Slider, { name: "level", "aria-label": "Level", defaultValue: 30 }),
  h(B.SwitchRowGroup, { "aria-label": "Sources" }, h(B.SwitchRow, { value: "watch", defaultChecked: true }, "Watch")),
  h("button", { id: "go", type: "submit" }, "Go"))`;

for (const mode of ["client", "hydrated"]) {
  describe(`A1-01: forms, ${mode}`, () => {
    test("a named Checkbox, Switch, Radio, Select, Combobox, NumberField and Slider submit their values, with and without the rule", async () => {
      const results = [];
      for (const rule of [true, false]) {
        const { page, errors } = await treePage(FORM, { mode, rule });
        try {
          await page.click("#go");
          results.push(await page.evaluate(() => window.sent));
          if (rule) {
            // A named input is Base UI's absolute one already; the mark changes nothing for it, and every mirror of the form carries it.
            assert.equal(await page.locator("input[data-basalt-mirror]").count(), 8, "checkbox, switch, two radios, select, combobox, number field, switch row");
          }
          assert.deepEqual(errors, []);
        } finally { await page.close(); }
      }
      assert.deepEqual(results[0], results[1], "the same form data with and without the rule");
      assert.deepEqual(results[0], { terms: "yes", news: "on", plan: "b", region: "us", zone: "y", count: "4", level: "30" });
    });
  });
}

describe("A1-01: a control's mirror reaches the app's own inputRef", () => {
  test("an object ref and a callback ref both receive the marked input, for each control that has an inputRef", async () => {
    const tree = `(B, h) => {
      const refs = window.refs = {};
      const obj = (key) => (refs[key] = { current: null });
      const callback = (key) => (el) => { if (el) refs[key] = el; };
      return h("form", null,
        h(B.Checkbox, { "aria-label": "c", inputRef: obj("checkbox") }),
        h(B.Switch, { "aria-label": "s", inputRef: callback("switch") }),
        h(B.RadioGroup, { "aria-label": "g" }, h(B.Radio, { value: "a", inputRef: obj("radio") }, "A")),
        h(B.Select, { "aria-label": "se", inputRef: callback("select"), options: [{ value: "a", label: "A" }] }),
        h(B.Combobox, { "aria-label": "co", inputRef: obj("combobox"), options: [{ value: "a", label: "A" }] }),
        h(B.NumberField, { "aria-label": "n", inputRef: callback("number") }),
        h(B.SwitchRow, { inputRef: obj("switchrow") }, "Row"));
    }`;
    const { page } = await treePage(tree);
    try {
      const got = await page.evaluate(() => Object.fromEntries(Object.entries(window.refs).map(([k, v]) => { const el = v instanceof HTMLElement ? v : v.current; return [k, el ? [el.tagName, el.hasAttribute("data-basalt-mirror"), el.getAttribute("aria-hidden")] : null]; })));
      assert.deepEqual(got, Object.fromEntries(["checkbox", "switch", "radio", "select", "combobox", "number", "switchrow"].map((k) => [k, ["INPUT", true, "true"]])));
    } finally { await page.close(); }
  });
});

// ---- A1-01: server rendering and hydration -----------------------------------------------------------------------------------------
describe("A1-01: server rendering and hydration", () => {
  test("the server's markup carries no mark and no warning; hydrating marks every mirror, and layers fall", async () => {
    const { page, errors, html } = await treePage(TICK_TABLE, { mode: "hydrated" });
    try {
      assert.ok(html.includes("<input"), "the server rendered the inputs");
      assert.ok(!html.includes("data-basalt-mirror"), "a ref runs on the client: the server's markup is Base UI's, unchanged");
      assert.equal(await page.locator("input[data-basalt-mirror]").count(), ROWS);
      assert.deepEqual(kinds(await positions(page)), ["absolute"]);
      assert.ok((await layers(page)) < 40);
      assert.deepEqual(errors, [], "hydration raised no warning");
    } finally { await page.close(); }
  });
});

// ---- A1-01: the checklist's rows are left as Base UI draws them (a pixel) ----------------------------------------------------------
for (const theme of ["light", "dark"]) {
  describe(`A1-01: the open checklist popup (${theme})`, () => {
    test("its portalled rows are not marked, and the popup draws the same pixels with the rule and without it", async () => {
      const tree = `(B, h) => h("div", { style: { padding: 24 } }, h(B.MultiSelect, { label: "Tags", defaultValue: ["v1", "v2"], options: Array.from({ length: 40 }, (_, i) => ({ value: "v" + i, label: "Option " + i })) }))`;
      const shot = async (rule) => {
        const { page } = await treePage(tree, { rule, theme, deviceScaleFactor: 2 });
        try {
          await page.locator(".basalt-filter-trigger").click();
          await page.locator(".basalt-filter-popup").waitFor();
          await settle(page);
          const inPopup = await page.evaluate(() => [...document.querySelectorAll(".basalt-filter-popup input")].map((i) => [i.type, i.hasAttribute("data-basalt-mirror"), getComputedStyle(i).position]));
          assert.ok(inPopup.length >= 40, `${inPopup.length} inputs in the popup`);
          assert.deepEqual(kinds(inPopup.filter(([type]) => type === "checkbox").map(([, marked, position]) => `${marked}:${position}`)), ["false:fixed"], "the rows' inputs are as Base UI draws them");
          const rows = page.locator(".basalt-filter-rows");
          await rows.evaluate((el) => { el.scrollTop = 99999; });
          await nextFrames(page, 2);
          await settle(page);
          return await page.screenshot();
        } finally { await page.close(); }
      };
      const [withRule, without] = [await shot(true), await shot(false)];
      assert.ok(withRule.equals(without), "the popup's pixels do not depend on the rule");
    });
  });
}

// ---- The narrow menu holds focus ---------------------------------------------------------------------------------------------
// With the site header's narrow menu open, Tab from its last row went to a focus guard and then to the page behind it, and Shift+Tab from its first
// row the same way. A modal holds focus: Tab from the last row goes to the first, Shift+Tab from the first to the last.
const focusedName = (page) => page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute("aria-label") ?? a.textContent?.trim() ?? a.tagName) : null; });
const insideMenu = (page) => page.evaluate(() => !!document.activeElement?.closest(".basalt-site-menu"));

for (const theme of ["light", "dark"]) {
  for (const loops of [false, true]) {
    describe(`the narrow menu holds focus, in React, ${loops ? "with" : "without"} loopsToggle (${theme}, 390)`, () => {
      test("Tab from the last row goes to the first and Shift+Tab from the first goes to the last; focus never reaches the page behind", async () => {
        const fixture = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SitePage><B.SiteHeader brand={<B.SiteBrand label="Sample home" />} links={[{ href: "#a", label: "About" }, { href: "#b", label: "Docs" }, { href: "#c", label: "Pricing" }]} ${loops ? "loopsToggle={<B.LoopsToggleIcon />}" : ""} action={<B.Button variant="primary">Start</B.Button>} /><main><a href="#behind" id="behind">Behind the menu</a><button id="behind-button">Page button</button></main></B.SitePage>);`;
        const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width: 390, height: 844 } });
        try {
          await settle(page);
          await page.getByRole("button", { name: "Menu" }).click();
          await page.locator(".basalt-site-menu-band").waitFor();
          await settle(page);
          assert.equal(await focusedName(page), "Close menu", "focus lands on Close");
          // Every focusable inside the menu, in order, as Tab meets them from the first.
          const first = await focusedName(page);
          const seen = [first];
          for (let step = 0; step < 14; step += 1) {
            await page.keyboard.press("Tab");
            assert.ok(await insideMenu(page), `after ${step + 1} Tab presses focus is on ${JSON.stringify(await focusedName(page))}, outside the menu`);
            const name = await focusedName(page);
            if (name === first) break;
            seen.push(name);
          }
          assert.ok(seen.length >= 4, `the menu has ${seen.length} stops: ${seen.join(", ")}`);
          // Tab from the last stop came back to the first (the loop above broke on it).
          assert.equal(await focusedName(page), first, "Tab from the last row goes to the first");
          // Shift+Tab from the first goes to the last.
          await page.keyboard.press("Shift+Tab");
          assert.ok(await insideMenu(page), "Shift+Tab from the first stays in the menu");
          assert.equal(await focusedName(page), seen.at(-1), "Shift+Tab from the first goes to the last");
          assert.deepEqual(errors, []);
        } finally { await page.close(); }
      });
    });
  }
}

// ---- A failing typecheck does not hide the browser tests -----------------------------------------------------------------------------
// The package's `test` script was `npm run typecheck && node build.mjs && node --test ...`: a type error ended the chain before one browser test ran.
describe("the React package's test script runs its typecheck and its tests as two steps, and both report", () => {
  const repo = path.join(pkg, "..", "..");
  const script = (name) => pathToFileURL(path.join(repo, "scripts", name)).href;

  test("the script is the runner's list of the two, not a && chain; ci.yml and the root's npm test are untouched in what they call", async () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
    assert.equal(manifest.scripts.test, "node ../../scripts/test-react.mjs");
    const { STEPS } = await import(script("test-react.mjs"));
    assert.deepEqual(STEPS.map((s) => s.command), ["npm run typecheck", "node build.mjs && node --test test/*.test.mjs"]);
    const root = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
    assert.equal(root.scripts.test, "node scripts/test-all.mjs");
    assert.match(fs.readFileSync(path.join(repo, ".github", "workflows", "ci.yml"), "utf8"), /- run: npm test\n/);
    const { SUITES } = await import(script("test-all.mjs"));
    assert.ok(SUITES.some((suite) => suite.command === "npm test -w packages/react"), "the root still runs the React package through `npm test -w packages/react`");
  });

  test("with the typecheck failing, the second step still runs and the run fails, naming the typecheck", () => {
    const code = `import { runSteps } from ${JSON.stringify(script("run-steps.mjs"))}; import { STEPS } from ${JSON.stringify(script("test-react.mjs"))};
      await runSteps([{ ...STEPS[0], command: "exit 2" }, { ...STEPS[1], command: "echo browser tests ran" }], { title: "react tests" });`;
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" });
    assert.equal(run.status, 1, "the run fails");
    assert.match(run.stdout, /browser tests ran/, "the tests ran after the failed typecheck");
    assert.match(run.stdout, /✖ FAILED {2}react typecheck \(\d+s, exit 2\), failed first/);
    assert.match(run.stdout, /✔ passed {2}react build and tests/);
  });
});

// ---- A check reads what is settled and present, not a toast on its way out --------------------------------------------------------
// `settle` waited for every finite animation, and a toast with a home draws a 5s drain line that ends as the toast leaves: a page with a timed toast was read
// after the toast had begun to go (or after it had gone). The drain is the toast's clock, not an entrance, so `settle` leaves it out.
describe("settle waits for entrances and not for a toast's clock", () => {
  for (const theme of ["light", "dark"]) {
    test(`a toast that drains for 5s is still there, whole and at rest, when settle returns (${theme})`, async () => {
      const fixture = `function Show(){const t=B.useToast();React.useEffect(()=>{t.show({title:"Saved",home:"page",timeout:5000})},[t]);return null}
        createRoot(document.getElementById("root")).render(<B.ToastProvider><Show/></B.ToastProvider>);`;
      const { page } = await fixturePage(browser, fixture, { theme });
      try {
        await page.locator(".basalt-toast-drain").waitFor();
        const started = Date.now();
        await settle(page);
        const state = await page.evaluate(() => {
          const toast = document.querySelector(".basalt-toast");
          const drain = document.querySelector(".basalt-toast-drain");
          const running = document.getAnimations().filter((a) => a.playState === "running" && a.effect?.target?.closest?.(".basalt-toast-drain")).length;
          return { present: !!toast, leaving: toast?.hasAttribute("data-ending-style"), transitions: document.getAnimations().filter((a) => a instanceof CSSTransition && a.playState === "running").length, drain: !!drain, running };
        });
        assert.ok(Date.now() - started < 3000, `settle took ${Date.now() - started} ms: it waited out the drain`);
        assert.deepEqual(state, { present: true, leaving: false, transitions: 0, drain: true, running: 1 }, "the toast is entered, not leaving, and its clock is still running");
      } finally { await page.close(); }
    });
  }
});
