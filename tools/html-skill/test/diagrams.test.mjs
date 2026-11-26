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
  return { layout: fig.getAttribute("data-layout"), ink, boxes, styles: [`.${prefix}-node`, `.${prefix}-node[data-focal]`, `.${prefix}-name`, `.${prefix}-kind`, `.${prefix}-detail`, `.${prefix}-label`, `.${prefix}-legend`, `.${prefix}-summary`, `.${prefix}-title`, `.${prefix}-hint`, `.${prefix}-gbox`, `.${prefix}-lane-name`, `.${prefix}-row`, `.${prefix}-tname`, `.${prefix}-msg`, `.${prefix}-band`, `.${prefix}-list-head`].map(style) };
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

describe("the title and the list's sub-headings (DECISIONS 386)", () => {
  test("the title is text-base at 600 at every heading level, and the list's sub-headings are text-sm at 600, as React draws them", async () => {
    const figs = [2, 3, 6].flatMap((heading) => [["a", "architecture"], ["s", "sequence"]].map(([k, key]) => `<figure class="diagram" id="fig-${k}${heading}"><script type="application/json" data-diagram>${JSON.stringify({ ...DATA[key], heading })}</script></figure>`));
    const skill = await openHtml(browser, compose(`<title>Titles</title><main style="max-width:1104px;margin:0 auto;padding:16px;display:grid;gap:64px">${figs.join("")}</main>`).html, { scheme: "dark", width: 1440 });
    for (const heading of [2, 3, 6]) for (const key of [`a${heading}`, `s${heading}`]) {
      await skill.page.click(`#fig-${key} .diagram-toggle`);
      const r = await skill.page.evaluate((key) => {
        const fig = document.querySelector(`#fig-${key}`), title = fig.querySelector(".diagram-title"), head = fig.querySelector(".diagram-list-head");
        const t = getComputedStyle(title), h = getComputedStyle(head);
        return { tag: title.tagName, title: [t.fontSize, t.lineHeight, t.fontWeight], headTag: head.tagName, head: [h.fontSize, h.fontWeight] };
      }, key);
      assert.equal(r.tag, `H${heading}`, `${key}: the title's level`);
      assert.deepEqual(r.title, ["14px", "20px", "600"], `${key}: the title's size`);
      assert.equal(r.headTag, `H${Math.min(6, heading + 1)}`, `${key}: the sub-heading's level`);
      assert.deepEqual(r.head, ["13px", "600"], `${key}: the sub-heading's size`);
    }
    assert.deepEqual(skill.errors, []);
    await skill.context.close();
  });
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

  test("a second Basalt.diagram call draws the new data: its words, its list and its sentences", async () => {
    const skill = await openHtml(browser, compose(`<title>D</title><main style="max-width:1104px;margin:0 auto;padding:16px"><figure class="diagram" id="fig-a"><script type="application/json" data-diagram>${JSON.stringify(DATA.architecture)}</script></figure></main>`).html, { scheme: "dark" });
    const renamed = structuredClone(DATA.architecture);
    renamed.nodes[0].name = "Renamed";
    await skill.page.evaluate((spec) => window.Basalt.diagram(document.getElementById("fig-a"), spec), renamed);
    await skill.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const id = renamed.nodes[0].id;
    assert.equal(await skill.page.locator(`#fig-a .diagram-node[data-node="${id}"] .diagram-name`).innerText(), "Renamed");
    assert.match(await skill.page.getAttribute(`#fig-a .diagram-node[data-node="${id}"]`, "aria-label"), /^Renamed,/);
    assert.match(await skill.page.locator("#fig-a .diagram-list").textContent(), /Renamed/);
    assert.equal(await skill.page.locator("#fig-a > .diagram-drawing").count(), 1, "one drawing, not two");
    assert.equal(await skill.page.locator("#fig-a .diagram-node[tabindex='0']").count(), 1);
    assert.deepEqual(skill.errors, []);
    await skill.context.close();
  });
});

describe("compose.mjs and the diagram's markup", () => {
  const bodyOf = (html) => html.slice(html.indexOf("<body>"));
  const json = JSON.stringify(DATA.architecture);
  const figure = (attrs) => `<figure ${attrs}><script type="application/json" data-diagram>${json}</script></figure>`;

  test("a figure with an unquoted class is written; a figure written as an example inside a textarea, a comment, code or a text script is not", () => {
    assert.match(bodyOf(compose(`<h1>x</h1>${figure("class=diagram")}`).html), /class="diagram-drawing"/);
    const example = figure('class="diagram"');
    const html = compose(`<h1>x</h1><textarea>${example}</textarea><!-- ${example} --><pre><code>${example.replaceAll("<", "&lt;")}</code></pre><script type="text/plain">${example}</script>`).html;
    assert.doesNotMatch(bodyOf(html), /class="diagram-drawing"/);
    assert.ok(html.includes(`<textarea>${example}</textarea>`), "the textarea's text is as written");
    assert.doesNotMatch(bodyOf(compose(`<h1>x</h1>${figure('class="diagrams"')}`).html), /class="diagram-drawing"/, "the class is matched as a word");
    assert.equal(compose(`<h1>x</h1>${figure('class="diagram" id="f"')}`).html, compose(`<h1>x</h1>${figure('class="diagram" id="f"')}`).html, "the same input, the same page");
  });

  test("JSON that is not the documented shape never reaches the page as markup: a heading, a kind, a column and a name are checked", () => {
    const bad = { type: "architecture", title: "t", heading: "3 onclick=alert(1)", summary: "s", nodes: [{ id: "a", name: "A", col: 1, row: 1 }, { id: "b", name: { t: "script", a: {}, c: ["alert(1)"] }, col: "2;x:y", row: 1 }], edges: [{ from: "a", to: "b", kind: 'main" onload="alert(1)', label: "x" }] };
    const result = compose(`<h1>x</h1><figure class="diagram"><script type="application/json" data-diagram>${JSON.stringify(bad)}</script></figure>`);
    const body = bodyOf(result.html).replace(/<script type="application\/json" data-diagram>[\s\S]*?<\/script>/, "");
    assert.doesNotMatch(body, /<script>alert|onclick|onload/);
    assert.match(body, /<h3 id="dg1-title"/);
    assert.ok(result.diagrams.some((n) => /not a level from 2 to 6/.test(n)) && result.diagrams.some((n) => /not a kind of line/.test(n)) && result.diagrams.some((n) => /not a whole number/.test(n)));
  });

  test("the usage example composes with no warning", () => {
    const usage = fs.readFileSync(path.join(path.dirname(require.resolve("../../../.agent/skills/basalt-html/compose.mjs")), "parts", "usage", "diagram.md"), "utf8").match(/```\n([\s\S]*?)```/)[1];
    assert.deepEqual(compose(`<h1>x</h1>${usage}`).diagrams, []);
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
    // A composed figure holds its JSON script first: the drawing is still the group, and the heading's wrapper is not.
    assert.equal(await p.locator("#fig-architecture > script[data-diagram]").count(), 1);
    assert.equal(await p.getAttribute("#fig-architecture .diagram-drawing", "role"), "group");
    assert.equal(await p.getAttribute("#fig-architecture .diagram-head", "role"), null);
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

describe("batch B's fix round in the skill (Neon B8, B10)", () => {
  const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
  test("an automatic figure's words are written on its placement before script: no two cards in one cell, and the columns are the placement's", () => {
    const html = compose(`<title>D</title><main><figure class="diagram" id="fig-a"><script type="application/json" data-diagram>${JSON.stringify(B.autoArchitecture)}</script></figure></main>`).html;
    const fig = /<figure[^>]*id="fig-a"[^>]*>/.exec(html)[0];
    assert.match(fig, /data-cols="(\d+)"/);
    assert.notEqual(/data-cols="(\d+)"/.exec(fig)[1], "1");
    const cells = [...html.matchAll(/data-node="([^"]+)"[^>]*style="--_c:(\d+);--_r:(\d+)/g)].map((m) => `${m[2]},${m[3]}`);
    assert.ok(cells.length >= 10, `${cells.length} cards`);
    assert.equal(new Set(cells).size, cells.length, "no two cards in one cell");
  });
  test("a data flow step's mark counts its lane's label as its words, as React's check does", () => {
    const spec = { type: "data-flow", title: "t", summary: "s", lanes: [{ id: "s3", label: "Amazon S3" }], nodes: [{ id: "n1", lane: "s3", col: 1, name: "Store logs", mark: "aws-s3-bucket" }], edges: [] };
    const out = compose(`<title>D</title><main><figure class="diagram"><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure></main>`);
    assert.ok(!JSON.stringify(out.diagrams ?? []).includes("none of its words say so"), JSON.stringify(out.diagrams));
  });
});

// Batch B (Opus B12 on the re-check): the same comparison for the extended CIMIP figures (frames, activation bars, cardinality, far keys, groups two
// deep, the automatic layouts and the text sequence), React against the skill, in both themes at 1440 and 390. Written while browser tests are paused
// (DECISIONS 330): not run in the round that wrote it.
const DATA_B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const KEYS_B = Object.keys(DATA_B).filter((k) => DATA_B[k]?.type);
const bodyB = (width = 1104) => `<title>Diagrams B</title><main style="max-width:${width}px;margin:0 auto;padding:16px;display:grid;gap:64px">${KEYS_B.map((k) => `<figure class="diagram" id="fig-${k}"><script type="application/json" data-diagram>${JSON.stringify(DATA_B[k])}</script></figure>`).join("")}</main>`;
const REACT_B = `
import data from "./test/fixtures/cimip-diagrams-b.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() { return <main style={{ maxWidth: 1104, margin: "0 auto", padding: 16, display: "grid", gap: 64 }}>{Object.entries(data).filter(([, d]) => d && d.type).map(([key, d]) => { const X = C[d.type]; const { type, ...props } = d; return <X key={key} id={"fig-" + key} {...props} />; })}</main>; }
createRoot(document.getElementById("root")).render(<Host />);`;
/** Waits until every figure has settled: at 1440 an automatic layout placed and drawn (no marker says it is still placing, so its drawn layout is the
 *  sign), and a text sequence's art or transcript written. */
const settled = (p, prefix, width) => p.waitForFunction(({ prefix, width }) => [...document.querySelectorAll("figure[id^='fig-']")].every((f) => f.getAttribute("data-layout") && (width < 1440 || !/^fig-auto/.test(f.id) || f.getAttribute("data-layout") === "drawn") && (!f.querySelector(`.${prefix}-text`) || f.querySelector(`.${prefix}-text`).children.length)), { prefix, width }, { timeout: 20000 });
const readB = async (p, key, prefix) => {
  const fig = await read(p, key, prefix).catch(() => null);
  const text = await p.evaluate(({ key, prefix }) => { const pre = document.querySelector(`#fig-${key} .${prefix}-text`); return pre ? { art: pre.hasAttribute("data-art"), html: pre.innerHTML.replaceAll(`${prefix}-`, "P-") } : null; }, { key, prefix });
  return { fig, text };
};

describe("parity with React, batch B", () => {
  for (const theme of ["dark", "light"]) for (const width of [1440, 390]) {
    test(`${theme} at ${width}: batch B's figures have the same layout, ink, boxes, styles and text art`, async () => {
      const { page: rp, errors: re } = await fixturePage(reactBrowser, REACT_B, { theme, viewport: { width, height: 1000 }, standards: true });
      await rp.addStyleTag({ content: `${FONTS} *, ::before, ::after { box-sizing: border-box; } body { margin: 0; background: var(--basalt-surface-0); color: var(--basalt-text-primary); font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans); } #root{display:block}` });
      await rp.evaluate(() => document.fonts.ready);
      const skill = await openHtml(browser, compose(bodyB()).html, { scheme: theme, width });
      await settled(rp, "basalt-diagram", width);
      await settled(skill.page, "diagram", width);
      for (const key of KEYS_B) {
        const a = await readB(rp, key, "basalt-diagram");
        const b = await readB(skill.page, key, "diagram");
        assert.deepEqual(b.text, a.text, `${key}: the text art`);
        if (!a.fig) continue;
        assert.equal(b.fig.layout, a.fig.layout, `${key}: layout`);
        assert.deepEqual(b.fig.boxes, a.fig.boxes, `${key}: node boxes`);
        assert.equal(b.fig.ink, a.fig.ink, `${key}: the ink`);
        assert.deepEqual(b.fig.styles, a.fig.styles, `${key}: computed styles`);
      }
      assert.deepEqual(re, []);
      assert.deepEqual(skill.errors, []);
      await rp.close();
      await skill.context.close();
    });
  }
});
