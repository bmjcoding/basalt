// The skill's `diagram` module (DECISIONS 281, revised by 282): the five CIMIP diagrams composed into a page, against React's components drawn at the same width.
// The module bundles React's engine, so the two must lay out, route, seat and draw the same pixels: the ink (every path, head, dot and label) is compared as markup,
// each node's box to the half pixel, and the parts' computed styles. Then what compose.mjs writes before any script runs, the keys, the trace, the modes and axe.
// Written for DECISIONS 281 section 7; the implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { inspectSource } from "../../../packages/react/test/diagram-geometry.mjs";
import { fixturePage, launch as launchReact, pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const KEYS = Object.keys(DATA);
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

/** A body with one figure per example (or the ones named), in a column as wide as `width`. */
const body = (keys = KEYS, width = 1104) => `<title>Diagrams</title><main style="max-width:${width}px;margin:0 auto;padding:16px;display:grid;gap:64px">${keys.map((k) => `<figure class="diagram" id="fig-${k}"><script type="application/json" data-diagram>${JSON.stringify(DATA[k])}</script></figure>`).join("")}</main>`;
const page = (keys, width) => compose(body(keys, width)).html;

const REACT = `
import data from "./test/fixtures/cimip-diagrams.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() { return <main style={{ maxWidth: window.__width ?? 1104, margin: "0 auto", padding: 16, display: "grid", gap: 64 }}>{Object.entries(data).map(([key, d]) => { const X = C[d.type]; const { type, ...props } = d; return <X key={key} id={"fig-" + key} {...props} />; })}</main>; }
createRoot(document.getElementById("root")).render(<Host />);`;
async function reactPage(theme, viewport) {
  // In standards mode, as the skill's page is: in quirks mode a decision's words take no strut, and its diamond is drawn shorter.
  const { page: p, errors } = await fixturePage(reactBrowser, REACT, { theme, viewport, standards: true });
  // An app's page, as the other parity tests give React (parity.test.mjs's APP_BODY): border-box, as the skill's core sizes every box, and the body's ink and
  // type, which the figure inherits as the skill's figure inherits the core's.
  await p.addStyleTag({ content: `${FONTS} *, ::before, ::after { box-sizing: border-box; } body { margin: 0; background: var(--basalt-surface-0); color: var(--basalt-text-primary); font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans); } #root{display:block}` });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  return { page: p, errors };
}
/** The figure's ink and node boxes, with React's prefix and ids written as the skill's, so the two can be compared as they are. */
const read = (p, key, prefix) => p.evaluate(({ key, prefix }) => {
  const fig = document.querySelector(`#fig-${key}`);
  const base = fig.getAttribute("aria-labelledby").replace(/-title$/, "");
  const ink = fig.querySelector(`.${prefix}-ink`).innerHTML.replaceAll(`${prefix}-`, "P-").replaceAll(base, "BASE");
  const o = fig.querySelector(`.${prefix}-drawing`).getBoundingClientRect();
  const boxes = [...fig.querySelectorAll(`.${prefix}-node`)].map((n) => { const r = n.getBoundingClientRect(); return [n.dataset.node, Math.round((r.left - o.left) * 2) / 2, Math.round((r.top - o.top) * 2) / 2, Math.round(r.width * 2) / 2, Math.round(r.height * 2) / 2]; });
  const style = (sel) => { const el = fig.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return [s.backgroundColor, s.borderTopColor, s.borderTopWidth, s.borderRadius, s.color, s.fontSize, s.fontWeight, s.lineHeight, s.fontFamily, s.paddingTop, s.paddingLeft]; };
  return { layout: fig.getAttribute("data-layout"), ink, boxes, styles: [`.${prefix}-node`, `.${prefix}-node[data-focal]`, `.${prefix}-name`, `.${prefix}-kind`, `.${prefix}-detail`, `.${prefix}-label`, `.${prefix}-legend`, `.${prefix}-summary`, `.${prefix}-title`, `.${prefix}-hint`, `.${prefix}-gbox`, `.${prefix}-lane-name`, `.${prefix}-row`, `.${prefix}-tname`, `.${prefix}-msg`, `.${prefix}-band`].map(style) };
}, { key, prefix });

describe("parity with React", () => {
  for (const theme of ["dark", "light"]) for (const width of [1440, 390]) {
    test(`${theme} at ${width}: the same layout, the same ink, the same boxes and the same styles for all five`, async () => {
      const viewport = { width, height: 1000 };
      const react = await reactPage(theme, viewport);
      const skill = await openHtml(browser, page(), { scheme: theme, width });
      for (const key of KEYS) {
        const a = await read(react.page, key, "basalt-diagram");
        const b = await read(skill.page, key, "diagram");
        assert.equal(b.layout, a.layout, `${key}: layout`);
        assert.deepEqual(b.boxes, a.boxes, `${key}: node boxes`);
        assert.equal(b.ink, a.ink, `${key}: the ink`);
        assert.deepEqual(b.styles, a.styles, `${key}: computed styles`);
      }
      assert.deepEqual(react.errors, []);
      assert.deepEqual(skill.errors, []);
      await react.page.close();
      await skill.context.close();
    });
  }
});

describe("the page before script (1.19)", () => {
  test("compose.mjs writes every figure's words: the title, every node, the key, the summary and the list", () => {
    const html = page();
    for (const key of KEYS) {
      const d = DATA[key];
      const at = html.indexOf(`id="fig-${key}"`);
      const figure = html.slice(at, html.indexOf("</figure>", at));
      assert.ok(figure.includes('class="diagram-drawing"'), `${key}: the drawing is in the page`);
      for (const n of d.nodes ?? d.participants ?? d.tables) assert.ok(figure.includes(`>${n.name.replaceAll("&", "&amp;").replaceAll("'", "&#39;")}<`), `${key}: ${n.name}`);
      assert.ok(figure.includes(`class="diagram-summary"`), `${key}: the summary`);
      assert.ok(figure.includes(`class="diagram-list"`), `${key}: the list`);
      assert.ok(figure.includes("data-diagram>"), `${key}: the JSON stays for the script`);
    }
  });

  test("with JavaScript off each figure is stacked, its list open and no toggle", async () => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
    const p = await context.newPage();
    await p.setContent(page());
    for (const key of KEYS) {
      assert.equal(await p.locator(`#fig-${key} .diagram-list`).isVisible(), true, key);
      assert.equal(await p.locator(`#fig-${key} .diagram-toggle`).isVisible(), false, key);
      if (key !== "schema" && key !== "sequence") assert.notEqual(await p.$eval(`#fig-${key} .diagram-drawing`, (el) => getComputedStyle(el).display), "grid", `${key} is stacked`);
    }
    await context.close();
  });

  test("a figure drawn from script (Basalt.diagram) is the same as one compose.mjs wrote", async () => {
    const skill = await openHtml(browser, compose(`<title>D</title><main style="max-width:1104px;margin:0 auto;padding:16px"><figure class="diagram" id="fig-a"></figure></main><!-- basalt:use diagram -->`).html, { scheme: "dark" });
    await skill.page.evaluate((spec) => window.Basalt.diagram(document.getElementById("fig-a"), spec), DATA.architecture);
    await skill.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const written = await openHtml(browser, compose(`<title>D</title><main style="max-width:1104px;margin:0 auto;padding:16px"><figure class="diagram" id="fig-a"><script type="application/json" data-diagram>${JSON.stringify(DATA.architecture)}</script></figure></main>`).html, { scheme: "dark" });
    const a = await read(skill.page, "a", "diagram"), b = await read(written.page, "a", "diagram");
    assert.equal(a.ink, b.ink);
    assert.deepEqual(a.boxes, b.boxes);
    assert.deepEqual(skill.errors, []);
    await skill.context.close();
    await written.context.close();
  });
});

describe("behaviour", () => {
  test("geometry at 1440, 640 and 390: nothing overlaps, crosses, is cut or scrolls", async () => {
    for (const width of [1440, 640, 390]) {
      const skill = await openHtml(browser, page(), { scheme: "dark", width });
      for (const key of KEYS) {
        const r = await skill.page.evaluate(`${inspectSource()}("diagram", "#fig-${key}")`);
        assert.deepEqual(r.problems, [], `${key} at ${width}`);
        assert.deepEqual(r.crossings, [], `${key} at ${width}`);
      }
      await skill.context.close();
    }
  });

  test("one tab stop, the arrow keys, Esc, the trace by keyboard and the list's toggle", async () => {
    const skill = await openHtml(browser, page(["architecture"]), { scheme: "dark" });
    const p = skill.page;
    assert.equal(await p.locator("#fig-architecture .diagram-node[tabindex='0']").count(), 1);
    await p.focus("#fig-architecture .diagram-node[data-node='browser']");
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.evaluate(() => document.activeElement.dataset.node), "alb");
    assert.ok(await p.locator("#fig-architecture .diagram-edge[data-lit]").count() > 0, "keyboard focus traces");
    await p.keyboard.press("Escape");
    assert.equal(await p.locator("#fig-architecture .diagram-edge[data-lit]").count(), 0);
    await p.click("#fig-architecture .diagram-toggle");
    assert.equal(await p.locator("#fig-architecture .diagram-list").isVisible(), true);
    assert.equal(await p.locator("#fig-architecture .diagram-toggle").innerText(), "Hide the list");
    await skill.context.close();
  });

  test("axe in both themes, drawn and stacked", async () => {
    for (const scheme of ["dark", "light"]) for (const width of [1440, 390]) {
      const skill = await openHtml(browser, page(), { scheme, width });
      await skill.page.addScriptTag({ content: axeSource });
      const result = await skill.page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }));
      assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")}`), [], `${scheme} at ${width}`);
      await skill.context.close();
    }
  });

  test("the module's stylesheet is React's section renamed, and its script carries React's engine", () => {
    const parts = path.join(path.dirname(require.resolve("../../../.agent/skills/basalt-html/compose.mjs")), "parts");
    const css = fs.readFileSync(path.join(parts, "diagram.css"), "utf8");
    const js = fs.readFileSync(path.join(parts, "diagram.js"), "utf8");
    // A React class (`.basalt-diagram-…`), not the diagram tokens' names (`--basalt-diagram-edge-main`, asserted just below) or the no-script rule's id.
    assert.doesNotMatch(css, /\.basalt-diagram-|--_surface\b/, "no React class or level variable is left");
    assert.match(css, /\.diagram-node/);
    assert.match(css, /--basalt-diagram-edge-main/, "the module carries its tokens");
    assert.match(js, /diagramMarkup/);
  });
});
