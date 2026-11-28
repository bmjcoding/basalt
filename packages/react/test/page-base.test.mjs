// The page base (cimip-gaps-3 T1): one opt-in file, base.css, one body rule in @layer basalt, from one source behind two doors, and since micro-details m6 (DECISIONS
// 420) selected text beside it (::selection, and the system's pair in forced colours). Never in
// components.css or styles.css. Applied to a bare document it sets 14/20, the sans stack, margin 0 and the page's fill and ink, and leaves the root at
// the browser's 16px; an app's unlayered body rule wins. Node checks first, then Chromium, both themes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { launch, pkg } from "./support.mjs";

const read = (...p) => fs.readFileSync(path.join(...p), "utf8");
const tokensDist = path.join(pkg, "..", "tokens", "dist", "css");

describe("the file", () => {
  test("one source behind two doors: the React package's base.css is the tokens package's, exported from both", () => {
    assert.equal(read(pkg, "dist", "base.css"), read(tokensDist, "base.css"));
    assert.equal(JSON.parse(read(pkg, "package.json")).exports["./base.css"], "./dist/base.css");
    assert.equal(JSON.parse(read(pkg, "..", "tokens", "package.json")).exports["./base.css"], "./dist/css/base.css");
  });

  test("the body rule, selected text and the three smoothing rules in @layer basalt, and nothing on html (DECISIONS 420; micro-details m2 T6)", () => {
    const css = read(pkg, "dist", "base.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const SMOOTH_DARK = String.raw`\{\s*-webkit-font-smoothing:\s*antialiased;\s*-moz-osx-font-smoothing:\s*grayscale;\s*\}`;
    const SMOOTH_LIGHT = String.raw`\{\s*-webkit-font-smoothing:\s*auto;\s*-moz-osx-font-smoothing:\s*auto;\s*\}`;
    const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    assert.match(css, new RegExp(String.raw`^\s*@layer basalt\s*\{\s*body\s*\{[^{}]*\}\s*::selection\s*\{[^{}]*\}\s*@media \(forced-colors: active\)\s*\{\s*::selection\s*\{[^{}]*\}\s*\}\s*`
      + esc(':where([data-theme="dark"], .dark)') + String.raw`\s*` + SMOOTH_DARK + String.raw`\s*`
      + esc(':where([data-theme="light"], .light)') + String.raw`\s*` + SMOOTH_LIGHT + String.raw`\s*`
      + esc("@media (prefers-color-scheme: dark) {") + String.raw`\s*`
      + esc('body:where(:not([data-theme="light"], .light, [data-theme="light"] *, .light *))') + String.raw`\s*` + SMOOTH_DARK
      + String.raw`\s*\}\s*\}\s*$`));
    const [selection, forced] = [...css.matchAll(/::selection\s*\{([^{}]*)\}/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
    assert.equal(selection, "background: var(--basalt-selection-fill); color: var(--basalt-selection-ink);");
    assert.equal(forced, "background: Highlight; color: HighlightText;");
    // The property only: the dark-system rule's own query names prefers-color-scheme.
    assert.doesNotMatch(css, /\bhtml\b|:root|box-sizing|(^|[;{\s])color-scheme\s*:|scrollbar-gutter|text-rendering/);
    // The body rule itself sets no smoothing: only the theme rules do.
    assert.doesNotMatch(css.match(/body\s*\{[^{}]*\}/)[0], /font-smoothing/);
  });

  test("components.css sets no font smoothing: a control matches the text beside it, whatever the page sets", () => {
    assert.doesNotMatch(read(pkg, "src", "styles", "components.css").replace(/\/\*[\s\S]*?\*\//g, ""), /font-smoothing/);
    assert.doesNotMatch(read(pkg, "dist", "components.css"), /font-smoothing/);
  });

  test("styles.css and components.css style neither body nor html: the base is opt-in", () => {
    for (const name of ["styles.css", "components.css"]) {
      const css = read(pkg, "dist", name);
      assert.doesNotMatch(css, /(^|[{};,])\s*(html|body)\s*[{,]/, name);
    }
    assert.doesNotMatch(read(pkg, "src", "styles", "components.css").replace(/\/\*[\s\S]*?\*\//g, ""), /(^|[{};,])\s*(html|body)\s*[{,]/);
  });

  test("styles.css and components.css style no bare ::selection: importing a component never repaints a page's selection (DECISIONS 420)", () => {
    for (const css of [read(pkg, "dist", "styles.css"), read(pkg, "dist", "components.css"), read(pkg, "src", "styles", "components.css").replace(/\/\*[\s\S]*?\*\//g, "")]) {
      // A selection rule is allowed only scoped to a Basalt part (the ticker's number): never at the start of a selector, nor after a combinator alone.
      assert.doesNotMatch(css, /(^|[{};,]|[\s>+~])::selection/);
    }
  });
});

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const doc = (theme, extra = "") => `<!doctype html><html data-theme="${theme}"><head><style>${read(tokensDist, "tokens.css")}</style><style>${read(pkg, "dist", "base.css")}</style>${extra}</head><body><p>Tide tables for the week.</p></body></html>`;
const probe = (page, name, prop) => page.evaluate(([n, p]) => { const d = document.createElement("div"); d.style[p] = `var(--basalt-${n})`; document.documentElement.append(d); const v = getComputedStyle(d)[p]; d.remove(); return v; }, [name, prop]);

for (const theme of ["dark", "light"]) {
  describe(`applied to a bare document (${theme})`, () => {
    test("14/20 at 400, the sans stack, margin 0, the page's fill and primary ink; the root stays 16px", async () => {
      const page = await browser.newPage();
      await page.setContent(doc(theme));
      const r = await page.evaluate(() => { const b = getComputedStyle(document.body); return { size: b.fontSize, line: b.lineHeight, weight: b.fontWeight, family: b.fontFamily, margin: b.margin, bg: b.backgroundColor, color: b.color, root: getComputedStyle(document.documentElement).fontSize }; });
      assert.equal(r.size, "14px");
      assert.equal(r.line, "20px");
      assert.equal(r.weight, "400");
      assert.match(r.family, /^Geist\b/);
      assert.equal(r.margin, "0px");
      assert.equal(r.bg, await probe(page, "surface-page", "backgroundColor"));
      assert.equal(r.color, await probe(page, "text-primary", "color"));
      assert.equal(r.root, "16px", "nothing is set on html");
      await page.close();
    });

    test("an unlayered body rule of the app's wins, whatever the order", async () => {
      const page = await browser.newPage();
      await page.setContent(doc(theme).replace("<style>", "<style>body { font-size: 16px; line-height: 24px; margin: 8px; }</style><style>"));
      const r = await page.evaluate(() => { const b = getComputedStyle(document.body); return [b.fontSize, b.lineHeight, b.margin]; });
      assert.deepEqual(r, ["16px", "24px", "8px"]);
      await page.close();
    });
  });
}

// Smoothing by theme (micro-details m2 T6): grayscale in dark, the system's in light, on the page the base owns; a nested theme follows its own theme.
describe("smoothing by theme (m2 T6)", () => {
  const page = (root, scheme) => `<!doctype html><html${root}><head><style>${read(tokensDist, "tokens.css")}</style><style>${read(pkg, "dist", "base.css")}</style></head>`
    + `<body><p id="top">Tide tables.</p><section data-theme="light"><p id="in-light">Light inside.</p><section data-theme="dark"><p id="in-dark">Dark inside.</p></section></section>`
    + `<section class="dark"><p id="in-dark-class">Dark by class.</p></section><button id="control" class="basalt-button">Save</button></body></html>`;
  const read4 = (p) => p.evaluate(() => Object.fromEntries(["top", "in-light", "in-dark", "in-dark-class", "control"].map((id) => [id, getComputedStyle(document.getElementById(id)).webkitFontSmoothing])));
  const cases = [
    { name: "a dark root", root: ' data-theme="dark"', scheme: "light", top: "antialiased" },
    { name: "a light root", root: ' data-theme="light"', scheme: "light", top: "auto" },
    { name: "a dark class root", root: ' class="dark"', scheme: "light", top: "antialiased" },
    { name: "no theme on a dark system", root: "", scheme: "dark", top: "antialiased" },
    { name: "no theme on a light system", root: "", scheme: "light", top: "auto" },
    { name: "a light root on a dark system", root: ' data-theme="light"', scheme: "dark", top: "auto" },
    { name: "a light class root on a dark system", root: ' class="light"', scheme: "dark", top: "auto" },
  ];
  for (const c of cases) {
    test(`${c.name}: the page is ${c.top}; a nested light is auto, a nested dark antialiased; a control follows its page`, async () => {
      const p = await browser.newPage({ colorScheme: c.scheme });
      await p.setContent(page(c.root, c.scheme));
      const r = await read4(p);
      assert.equal(r.top, c.top);
      assert.equal(r["in-light"], "auto");
      assert.equal(r["in-dark"], "antialiased");
      assert.equal(r["in-dark-class"], "antialiased");
      assert.equal(r.control, c.top, "a control is never set apart from its page");
      await p.close();
    });
  }
});
