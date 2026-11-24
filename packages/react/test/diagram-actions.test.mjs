// An app's own actions in a diagram's foot (the foot decision, diagrams-cimip, section 6): the order, nothing moving, the viewer, the end group's wrap, the
// export of the viewer's drawing, the settle before onSelect, busy, disabled and id, print, before script and the development warnings, and the sizes. In
// Chromium against the built package. Written while tests are paused (DECISIONS 359): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { measureExport } from "./export-sizes.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const require = createRequire(import.meta.url);
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;
const THREE = ["Download the diagram", "Copy link", "Open in draw.io"];

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The host: figures from `window.__set(list)`, each `{ key, data: "still" | "kit", actions: [{ label, id?, disabled?, inViewer?, wait?, svg? }], hidden? }`.
// Every press is logged in `window.__log`, with what it was handed. `wait` returns a promise the test settles (`window.__settle(label, ok)`); `svg` writes
// the figure it was handed with diagramToSvg and keeps the text (or the error) in `window.__svg`.
const HOST = `
import still from "./test/fixtures/cimip-diagrams.json";
import moving from "./test/fixtures/diagram-motion.json";
import { diagramToSvg } from "./dist/diagram-export.js";
window.__log = [];
window.__svg = [];
const waits = {};
window.__settle = (label, ok) => { const w = waits[label]; delete waits[label]; if (w) (ok ? w.resolve : w.reject)(new Error("refused")); };
const strip = ({ type, ...p }) => p;
const DATA = { still: strip(still.architecture), kit: strip(moving.kit) };
const make = (list) => list?.map((a) => ({ ...a, onSelect: (ctx) => {
  window.__log.push({ label: a.label, viewer: ctx.viewer, inViewer: Boolean(ctx.figure.closest("dialog")), isFigure: ctx.figure.matches(".${P}"), layout: ctx.layout ? ctx.layout.layout : null, layoutFigure: ctx.layout ? ctx.layout.figure === ctx.figure : null, entrance: ctx.figure.getAttribute("data-entrance") });
  if (a.wait) return new Promise((resolve, reject) => { waits[a.label] = { resolve, reject }; });
  if (a.svg) return diagramToSvg(ctx.figure).then((b) => b.text()).then((t) => { window.__svg.push(t); }, (e) => { window.__svg.push({ error: String(e && e.message) }); });
  return undefined;
} }));
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, data, actions, hidden }) => (
    <div key={key} style={hidden ? { display: "none" } : undefined}><B.ArchitectureDiagram id={"fig-" + key} {...DATA[data]} actions={make(actions)} /></div>
  ))}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function actionsPage(list, { theme = "dark", width = 1440, height = 900, touch = false, hasTouch = touch, dir, media } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height }, hasTouch, isMobile: touch });
  if (touch) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  if (dir) await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  if (media) await page.emulateMedia(media);
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((list) => window.__set(list), list);
  // The actions' module arrives after the first effect: wait for the buttons the list asks for.
  for (const { key, actions, hidden } of list) if (actions?.some((a) => a.label) && !hidden) await page.waitForSelector(`#fig-${key} .${P}-foot .${P}-action`);
  await frames(page, 4);
  return { page, errors };
}
const fig = (key, actions, data = "still", more = {}) => ({ key, data, actions: actions?.map((a) => (typeof a === "string" ? { label: a } : a)), ...more });
const footWords = (page, key) => page.locator(`#fig-${key} .${P}-foot button`).evaluateAll((els) => els.map((b) => b.textContent.trim()));
const boxes = (page, sel) => page.locator(sel).evaluateAll((els) => els.map((b) => { const r = b.getBoundingClientRect(); return { words: b.textContent.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }; }));

/** Opens a figure's viewer and waits until its figure is laid out and the dialog has finished its entrance. */
async function open(page, key, { tap = false } = {}) {
  const button = page.locator(`#fig-${key} .${P}-expand`);
  await button.scrollIntoViewIfNeeded();
  if (tap) await button.tap(); else await button.click();
  await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await frames(page, 3);
}

describe("1. the order", () => {
  test("three actions on an animated figure on touch: the foot is View as list, Expand, Pause animations, the three in order, Clear highlight; Tab visits them so", async () => {
    const { page, errors } = await actionsPage([fig("kit", THREE, "kit")], { width: 390, height: 844, touch: true });
    await page.waitForSelector(`#fig-kit .${P}-pause`);
    await page.waitForSelector(`#fig-kit .${P}-clear`);
    const want = ["View as list", "Expand", "Pause animations", ...THREE, "Clear highlight"];
    assert.deepEqual(await footWords(page, "kit"), want);
    // The visual order is the DOM order: each button starts after the one before it, in reading order.
    const b = await boxes(page, `#fig-kit .${P}-foot button`);
    for (let i = 1; i < b.length; i++) assert.ok(b[i].top > b[i - 1].top + 1 || (Math.abs(b[i].top - b[i - 1].top) <= 1 && b[i].left > b[i - 1].left), `${b[i].words} comes after ${b[i - 1].words}`);
    // Every action is a tab stop of its own: the foot takes no roving focus.
    await page.locator(`#fig-kit .${P}-toggle`).focus();
    const visited = [await page.evaluate(() => document.activeElement.textContent.trim())];
    for (let i = 1; i < want.length; i++) { await page.keyboard.press("Tab"); visited.push(await page.evaluate(() => document.activeElement.textContent.trim())); }
    assert.deepEqual(visited, want);
    for (const label of THREE) assert.equal(await page.getByRole("button", { name: label, exact: true }).count(), 1, `${label} is a button named by its label`);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("2. nothing moves", () => {
  test("at a 760px figure, a first touch tap mounts Clear highlight last and every other button's box is unchanged", async () => {
    // A laptop with a touch screen: a mouse page (no Clear at rest) that takes a touch tap.
    const { page } = await actionsPage([fig("kit", THREE, "kit")], { width: 792, hasTouch: true });
    assert.equal(await page.locator(`#fig-kit .${P}-clear`).count(), 0, "no Clear highlight before a touch tap");
    const before = await boxes(page, `#fig-kit .${P}-foot button`);
    const card = await page.locator(`#fig-kit .${P}-node`).first().boundingBox();
    await page.touchscreen.tap(card.x + card.width / 2, card.y + card.height / 2);
    await page.waitForSelector(`#fig-kit .${P}-clear`);
    await frames(page, 2);
    const after = await boxes(page, `#fig-kit .${P}-foot button`);
    assert.equal(after.at(-1).words, "Clear highlight");
    assert.deepEqual(after.slice(0, -1), before, "no control already in the foot moved");
    await page.close();
  });
});

describe("3. the viewer", () => {
  test("the end group is View as list then the actions; inViewer: false leaves one out; a press hands the viewer's figure and its drawn layout", async () => {
    const { page, errors } = await actionsPage([fig("a", ["Download the diagram", "Copy link", { label: "Open in draw.io", inViewer: false }])]);
    await open(page, "a");
    const end = await page.locator(`dialog.${P}-viewer .${P}-viewer-end button`).evaluateAll((els) => els.map((b) => b.textContent.trim()));
    assert.deepEqual(end, ["View as list", "Download the diagram", "Copy link"]);
    await page.locator(`dialog.${P}-viewer .${P}-viewer-end button`, { hasText: "Copy link" }).click();
    const { entrance: _entrance, ...got } = (await page.evaluate(() => window.__log)).at(-1);
    assert.deepEqual(got, { label: "Copy link", viewer: true, inViewer: true, isFigure: true, layout: "drawn", layoutFigure: true });
    // A press does not close the viewer and does not move focus.
    assert.equal(await page.locator(`dialog.${P}-viewer[open]`).count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Copy link");
    // On the page the same action is handed the page's figure.
    await page.keyboard.press("Escape");
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    await page.locator(`#fig-a .${P}-foot button`, { hasText: "Copy link" }).click();
    const page1 = (await page.evaluate(() => window.__log)).at(-1);
    assert.equal(page1.viewer, false);
    assert.equal(page1.inViewer, false);
    assert.equal(page1.layoutFigure, true);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("4. the end group wraps (3.1)", () => {
  const cases = [
    { name: "390 touch, no action", n: 0, width: 390, height: 844, touch: true },
    { name: "390 touch, one action", n: 1, width: 390, height: 844, touch: true },
    { name: "390 touch, three actions", n: 3, width: 390, height: 844, touch: true },
    { name: "760 with a mouse, three actions", n: 3, width: 760, height: 900, touch: false },
  ];
  for (const dir of ["ltr", "rtl"]) for (const c of cases) {
    test(`${c.name}, ${dir}: no button leaves the dialog; the group ends on the row's edge while it shares the row, and starts on its start edge on a row of its own`, async () => {
      const { page } = await actionsPage([fig("a", c.n ? THREE.slice(0, c.n) : undefined)], { width: c.width, height: c.height, touch: c.touch, dir });
      await open(page, "a", { tap: c.touch });
      const got = await page.evaluate((P) => {
        const d = document.querySelector(`dialog.${P}-viewer`);
        const box = (el) => el.getBoundingClientRect();
        const row = d.querySelector(`.${P}-viewer-row`), zoom = d.querySelector(`.${P}-zoom`);
        const r = box(row), z = box(zoom);
        const end = [...d.querySelectorAll(`.${P}-viewer-end button`)].map((b) => { const x = box(b); return { words: b.textContent.trim(), left: x.left, right: x.right, top: x.top }; });
        return { dialog: [box(d).left, box(d).right], row: [r.left, r.right], zoomTop: z.top, end, overflow: d.scrollWidth - d.clientWidth };
      }, P);
      assert.equal(got.overflow, 0, "no horizontal overflow");
      for (const b of got.end) assert.ok(b.left >= got.dialog[0] - 0.5 && b.right <= got.dialog[1] + 0.5, `${b.words} stays inside the dialog`);
      const first = got.end[0];
      const startEdge = dir === "rtl" ? got.row[1] : got.row[0];
      const endEdge = dir === "rtl" ? got.row[0] : got.row[1];
      const sharesRow = Math.abs(first.top - got.zoomTop) < 8;
      if (c.n === 0) {
        assert.ok(sharesRow, "with no action View as list shares the zoom row");
        assert.ok(Math.abs((dir === "rtl" ? first.left : first.right) - endEdge) <= 1, "and ends on the row's content edge");
      } else if (!sharesRow) {
        assert.ok(Math.abs((dir === "rtl" ? first.right : first.left) - startEdge) <= 1, "a wrapped group's first button starts on the row's start edge");
      }
      await page.close();
    });
  }
});

describe("5. the viewer's drawing writes a whole file (2.2)", () => {
  test("an action's diagramToSvg in the viewer holds the source; with the list open it writes the same viewBox; the sizer is hidden again; a hidden figure rejects", async () => {
    const { page, errors } = await actionsPage([fig("a", [{ label: "Download the diagram", svg: true }]), fig("h", [{ label: "Download the diagram", svg: true }], "still", { hidden: true })]);
    const source = await page.locator(`#fig-a .${P}-source`).textContent();
    await open(page, "a");
    const press = () => page.locator(`dialog.${P}-viewer .${P}-viewer-end button`, { hasText: "Download the diagram" }).click();
    await press();
    await page.waitForFunction(() => window.__svg.length === 1);
    await page.locator(`dialog.${P}-viewer .${P}-viewer-end button`, { hasText: "View as list" }).click();
    await frames(page, 2);
    await press();
    await page.waitForFunction(() => window.__svg.length === 2);
    const [closed, opened] = await page.evaluate(() => window.__svg);
    assert.equal(typeof closed, "string");
    assert.equal(typeof opened, "string");
    const viewBox = (svg) => /viewBox="([^"]+)"/.exec(svg)?.[1];
    assert.ok(source && source.trim().split(/\s+/).every((w) => closed.includes(w.replace(/&/g, "&amp;"))), "the viewer's file holds the source's words");
    assert.match(viewBox(closed), /^0 0 \d+ \d+$/);
    assert.equal(viewBox(opened), viewBox(closed), "the list open writes the same drawing");
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-sizer`).evaluate((el) => el.hidden), true, "the sizer is hidden again after the read");
    await page.keyboard.press("Escape");
    await page.waitForSelector(`dialog.${P}-viewer`, { state: "detached" });
    // A figure in a display: none parent: no box, so it rejects and no file is made.
    const hidden = await page.evaluate(async (P) => {
      const f = document.querySelector("#fig-h");
      const before = window.__svg.length;
      // The hidden figure's foot is not displayed either: its action is pressed as an app would call it.
      f.querySelector(`.${P}-foot .${P}-action`)?.click();
      await new Promise((r) => setTimeout(r, 100));
      return window.__svg.slice(before);
    }, P);
    assert.equal(hidden.length, 1);
    assert.match(hidden[0].error, /not displayed/);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("6. a press settles the entrance (2.3)", () => {
  test("a press on a page action while the entrance is pending leaves the figure at rest before onSelect runs", async () => {
    // Below the fold, so its entrance has not started; the press is the element's own click, which does not scroll it into view.
    const { page } = await actionsPage([fig("spacer", undefined), fig("spacer2", undefined), fig("kit", ["Copy link"], "kit")], { width: 1440, height: 600 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const pending = await page.locator("#fig-kit").getAttribute("data-entrance");
    assert.ok(pending && pending !== "done", `the entrance is pending (${pending})`);
    await page.evaluate((P) => document.querySelector(`#fig-kit .${P}-action`).click(), P);
    const log = (await page.evaluate(() => window.__log)).at(-1);
    assert.equal(log.label, "Copy link");
    assert.equal(log.entrance, "done", "at rest when onSelect ran");
    await page.close();
  });
});

describe("7. busy", () => {
  test("a promise makes that button aria-busy and leaves the others pressable; a second press sends nothing; a rejection ends it", async () => {
    const { page, errors } = await actionsPage([fig("a", [{ label: "Download the diagram", wait: true }, "Copy link"])]);
    const slow = page.locator(`#fig-a .${P}-action`, { hasText: "Download the diagram" });
    const quick = page.locator(`#fig-a .${P}-action`, { hasText: "Copy link" });
    await slow.click();
    assert.equal(await slow.getAttribute("aria-busy"), "true");
    await slow.click();
    await quick.click();
    assert.equal(await quick.getAttribute("aria-busy"), null);
    const labels = (await page.evaluate(() => window.__log)).map((l) => l.label);
    assert.deepEqual(labels, ["Download the diagram", "Copy link"], "the busy button sent once; the other was pressed");
    await page.evaluate(() => window.__settle("Download the diagram", false));
    await page.waitForFunction((P) => !document.querySelector(`#fig-a .${P}-action`).hasAttribute("aria-busy"), P);
    // The rejection is raised again (the server rule): the page sees it.
    assert.ok(errors.some((e) => /refused/.test(e)), errors.join("; "));
    await slow.click();
    assert.equal((await page.evaluate(() => window.__log)).filter((l) => l.label === "Download the diagram").length, 2, "pressable again once it settled");
    await page.close();
  });
});

describe("8. disabled and id", () => {
  test("disabled: mounted, aria-disabled, focusable, onSelect not called", async () => {
    const { page } = await actionsPage([fig("a", ["Copy link", { label: "Open in draw.io", disabled: true }])]);
    const off = page.locator(`#fig-a .${P}-action`, { hasText: "Open in draw.io" });
    assert.equal(await off.getAttribute("aria-disabled"), "true");
    await off.focus();
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Open in draw.io");
    await off.click({ force: true });
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => window.__log), []);
    await page.close();
  });
  test("id: a label that changes keeps the same element and its focus", async () => {
    const { page } = await actionsPage([fig("a", [{ id: "copy", label: "Copy link" }])]);
    await page.locator(`#fig-a .${P}-action`).focus();
    await page.evaluate((P) => { document.querySelector(`#fig-a .${P}-action`).__mark = true; }, P);
    await page.evaluate(() => window.__set([{ key: "a", data: "still", actions: [{ id: "copy", label: "Copy the link" }] }]));
    await frames(page, 2);
    const kept = await page.evaluate((P) => { const b = document.querySelector(`#fig-a .${P}-action`); return { mark: b.__mark === true, words: b.textContent.trim(), focused: document.activeElement === b }; }, P);
    assert.deepEqual(kept, { mark: true, words: "Copy the link", focused: true });
    await page.close();
  });
});

describe("9. print (3.2)", () => {
  test("under print media no button of a figure has a box, with and without actions", async () => {
    const { page } = await actionsPage([fig("none", undefined, "kit"), fig("some", THREE, "kit")], { width: 1440 });
    await page.waitForSelector(`#fig-some .${P}-pause`);
    await page.emulateMedia({ media: "print" });
    await frames(page, 2);
    for (const key of ["none", "some"]) {
      const shown = await page.locator(`#fig-${key} button`).evaluateAll((els) => els.filter((b) => b.getClientRects().length).map((b) => b.textContent.trim()));
      assert.deepEqual(shown, [], `${key}: no control prints`);
      assert.equal(await page.locator(`#fig-${key} .${P}-foot`).evaluate((el) => getComputedStyle(el).display), "none");
    }
    await page.close();
  });
});

describe("10. before script, and development", () => {
  test("the server's HTML holds no action button", async () => {
    const React = require("react");
    const { renderToString } = require("react-dom/server");
    const B = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    const data = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
    const { type: _type, ...props } = data.architecture;
    const html = renderToString(React.createElement(B.ArchitectureDiagram, { ...props, actions: THREE.map((label) => ({ label, onSelect() {} })) }));
    assert.doesNotMatch(html, new RegExp(`${P}-action`));
    for (const label of THREE) assert.ok(!html.includes(`>${label}<`), `no ${label} before script`);
  });
  test("a development build warns past three actions, past 24 characters, and for a repeated key, and does not draw an empty label", async () => {
    const React = require("react");
    const { renderToString } = require("react-dom/server");
    const { DiagramActions } = await import(pathToFileURL(path.join(pkg, "dist", "diagram-actions.js")).href);
    const said = [];
    const [warn, error] = [console.warn, console.error];
    console.warn = (m) => said.push(String(m));
    console.error = (m) => said.push(String(m));
    let html;
    try {
      const actions = [
        { label: "Copy link", onSelect() {} }, { label: "Copy link", onSelect() {} }, { label: "Download the whole diagram", onSelect() {} },
        { label: "Open in draw.io", onSelect() {} }, { label: "", onSelect() {} },
      ];
      html = renderToString(React.createElement(DiagramActions, { actions, viewer: false, component: "ArchitectureDiagram", context: () => null }));
    } finally { console.warn = warn; console.error = error; }
    assert.ok(said.some((m) => /5 actions in the foot; three at most/.test(m)), said.join("\n"));
    assert.ok(said.some((m) => /"Download the whole diagram" is past 24 characters/.test(m)), said.join("\n"));
    assert.ok(said.some((m) => /two actions are keyed "Copy link"/.test(m)), said.join("\n"));
    assert.ok(said.some((m) => /an action has no label/.test(m)), said.join("\n"));
    assert.equal((html.match(/<button/g) ?? []).length, 4, "four drawn, the empty label left out");
  });
});

describe("11. sizes (2.1)", () => {
  // Each diagram on main ecd547e7, before actions (test/export-sizes.json there).
  const MAIN = { ArchitectureDiagram: 104061, DataFlowDiagram: 104002, FlowchartDiagram: 104023, SchemaDiagram: 103971, SequenceDiagram: 103999 };
  test("each of the five diagrams with no actions is at most 512 B over main", async () => {
    for (const [name, bytes] of Object.entries(MAIN)) {
      const now = (await measureExport(name)).bytes;
      assert.ok(now <= bytes + 512, `${name}: ${now} B, ${now - bytes} over main`);
    }
  });
  test("no Base UI file is in a diagram's static graph, and the viewer imports no new specifier", async () => {
    for (const name of Object.keys(MAIN)) {
      const result = await esbuild.build({
        stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
        bundle: true, write: false, metafile: true, format: "esm", logLevel: "silent", external: ["react", "react-dom", "react/jsx-runtime"],
        plugins: [{ name: "on-demand", setup(build) { build.onResolve({ filter: /.*/ }, (args) => (args.kind === "dynamic-import" ? { path: args.path, external: true } : undefined)); } }],
      });
      const baseUi = Object.keys(result.metafile.inputs).filter((file) => file.includes("@base-ui"));
      assert.deepEqual(baseUi, [], `${name} reaches Base UI statically`);
    }
    const viewer = fs.readFileSync(path.join(pkg, "dist", "diagram-viewer.js"), "utf8");
    const specifiers = [...new Set([...viewer.matchAll(/(?:\bfrom|^import)\s*"([^"]+)"/gm)].map((m) => m[1]).filter((s) => !s.startsWith("./")))].sort();
    assert.deepEqual(specifiers, ["@base-ui/react/button", "react", "react-dom", "react/jsx-runtime"]);
  });
});
