// Geist Mono only on a page that can draw it (micro-details m8, X8; DECISIONS 405, 409). The build splits the fonts into geist-sans.css and
// geist-mono.css and generates manifest.mono from the assembled parts; compose.mjs inlines the mono face when any of five conditions holds, and
// leans towards keeping it. Node only: no browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { build, monoManifest, moduleNames, skillDir } from "../build.mjs";
import { read, repoRoot } from "./support.mjs";

const files = build();
const manifest = JSON.parse(files["parts/manifest.json"]);
const sans = read(skillDir, "parts", "geist-sans.css").trim();
const mono = read(skillDir, "parts", "geist-mono.css").trim();
/** The mono names: the custom properties in their own case, the face's name in any case. */
const MONO_NAMES = { test: (text) => /--basalt-font-family-mono|--bh-xs-mono|--bh-sm-mono/.test(text) || /geist\s+mono/i.test(text) };

/** The face a composed page carries: { sans, mono }, read from its font style. */
const faces = (html) => {
  const style = html.match(/<style data-basalt-fonts>([\s\S]*?)<\/style>/)?.[1] ?? "";
  return { sans: style.includes('font-family: "Geist";'), mono: style.includes('font-family: "Geist Mono";') };
};
const keeps = (body, options = {}) => {
  const result = compose(body, options);
  assert.equal(result.mono, faces(result.html).mono, "result.mono is the face actually inlined");
  return result;
};

describe("compose: the mono face goes in when the page can draw it", () => {
  test("a script-free body that draws no mono leaves the face out, about 95 KB smaller, and still has Geist", () => {
    const body = "<h1>Quarterly plan</h1><p>Three things this quarter.</p>";
    const lean = keeps(body);
    const full = keeps(body, { all: true });
    assert.equal(lean.mono, false);
    assert.deepEqual(faces(lean.html), { sans: true, mono: false });
    assert.ok(lean.html.includes(sans), "the sans part, with the licence, whole");
    const saved = full.bytes - lean.bytes;
    assert.ok(saved >= Buffer.byteLength(mono) && Buffer.byteLength(mono) > 90_000 && Buffer.byteLength(mono) < 100_000, `about 95 KB smaller (${saved})`);
  });

  const KEEPS = {
    "an unquoted class": "<p><span class=mono>000123</span></p>",
    "a class among others": '<p><span class="x mono">000123</span></p>',
    "<code>": "<p>Run <code>npm test</code>.</p>",
    "<pre>": "<pre>x</pre>",
    "<kbd>": "<p>Press <kbd>K</kbd>.</p>",
    "<samp>": "<p><samp>ok</samp></p>",
    "<td data-mono>": "<table><tbody><tr><td data-mono>a1b2</td></tr></tbody></table>",
    "<dd data-mono>": "<dl><dt>Id</dt><dd data-mono>a1b2</dd></dl>",
    "a <style> with --basalt-font-family-mono": "<style>.id { font-family: var(--basalt-font-family-mono); }</style><p class=id>a1b2</p>",
    "a <style> with --bh-sm-mono": "<style>.id { font: var(--bh-sm-mono); }</style><p class=id>a1b2</p>",
    "a <style> with Geist Mono": '<style>.id { font-family: "Geist Mono", monospace; }</style><p class=id>a1b2</p>',
    "a style attribute": '<p style="font-family: var(--basalt-font-family-mono)">a1b2</p>',
    "an author <script>": "<p id=n>1</p><script>document.getElementById('n').textContent = '2';</script>",
    "a handler that adds the class (no module, no script element)": "<button onclick=\"this.classList.add('mono')\">000123</button>",
    "a handler in upper case": "<button ONCLICK=\"this.classList.add('mono')\">000123</button>",
    "a mono module (code)": '<div class="code"><pre><code>x</code></pre></div>',
    // Astra's review: values read decoded, <noscript>, the family name in any case and through a CSS escape, and a style or font attribute inside svg or a template.
    "an encoded space in a class": '<p class="x&#32;mono">000123</p>',
    "a named tab in a class": '<p class="x&Tab;mono">000123</p>',
    "an encoded javascript: URL": '<a href="javascript&#58;document.body.classList.add(\'mono\')">Go</a>',
    "a javascript: URL with a named colon": '<a href="javascript&colon;void 0">Go</a>',
    "a javascript: URL broken by a tab": '<a href=" java&Tab;script:void 0">Go</a>',
    "a <noscript> (its content is markup without script)": "<noscript><code>x</code></noscript>",
    "a <noscript> of plain words": "<noscript><p>Turn on scripts.</p></noscript>",
    "the family name in lower case": "<style>.id { font-family: geist mono; }</style><p class=id>a1b2</p>",
    "the family name in upper case": '<style>.id { font-family: "GEIST MONO"; }</style><p class=id>a1b2</p>',
    "the family name through a CSS escape": '<style>.id { font-family: "G\\65 ist Mono"; }</style><p class=id>a1b2</p>',
    "an encoded style attribute": '<p style="font: var(&#45;-bh-sm-mono)">a1b2</p>',
    "a font-family attribute in an svg": '<svg viewBox="0 0 10 10"><text font-family="geist mono">1</text></svg>',
    "a <style> in an svg": '<svg viewBox="0 0 10 10"><style>text { font-family: "Geist Mono"; }</style><text>1</text></svg>',
    "a <style> in a template": "<template><style>p { font: var(--bh-xs-mono); }</style><p>1</p></template>",
    "an old <font face>": '<font face="Geist Mono">1</font>',
  };
  for (const [what, body] of Object.entries(KEEPS)) {
    test(`keeps the face: ${what}`, () => {
      const result = keeps(body);
      assert.equal(result.mono, true);
      assert.ok(result.html.includes(`${sans}\n${mono}`), "both parts whole, joined as the one geist.css was");
    });
  }

  test("keeps the face for a module that reaches mono through its requirement (palette, through kbd), and for all", () => {
    const palette = keeps("<h1>x</h1><!-- basalt:use palette -->");
    assert.ok(palette.modules.includes("kbd") && palette.mono, "palette brings kbd and the face");
    assert.equal(keeps("<h1>x</h1>", { all: true }).mono, true);
  });

  test("fonts: false gives neither face", () => {
    const result = compose("<p>Run <code>npm test</code>.</p>", { fonts: false });
    assert.equal(result.mono, false);
    assert.deepEqual(faces(result.html), { sans: false, mono: false });
    assert.doesNotMatch(result.html, /@font-face/);
  });

  test("scriptsDrawMono: false turns off the script rule only", () => {
    const script = "<script>document.title = 'x';</script>";
    assert.equal(keeps(`<h1>x</h1>${script}`).mono, true, "a script keeps the face by default");
    assert.equal(keeps(`<h1>x</h1>${script}`, { scriptsDrawMono: false }).mono, false, "a script and no static mono leaves it out");
    assert.equal(keeps(`<h1>x</h1><button onclick="go()">Go</button>`, { scriptsDrawMono: false }).mono, false, "so does a handler");
    assert.equal(keeps(`<p>Run <code>npm test</code>.</p>${script}`, { scriptsDrawMono: false }).mono, true, "a <code> still brings it in");
    assert.equal(keeps(`<p class=mono>1</p>${script}`, { scriptsDrawMono: false }).mono, true, "and so does the class");
  });

  test("an HTML comment that mentions <code> or mono brings nothing in", () => {
    assert.equal(keeps('<h1>x</h1><!-- <code>x</code> <span class="mono"> --bh-sm-mono -->').mono, false);
  });

  test("words that only spell the face, in the page, an svg's text or a template, bring nothing in; nor do a query string or an escaped ampersand", () => {
    for (const body of [
      "<p>We set code in Geist Mono.</p>",
      '<svg viewBox="0 0 10 10"><text>Geist Mono</text></svg>',
      "<template><p>Geist Mono</p></template>",
      '<p><a href="?a=1&b=2">Next</a></p>',
      '<p class="x&amp;mono">1</p>',
    ]) assert.equal(keeps(body).mono, false, body);
  });

  test("a script of another type is not author script", () => {
    assert.equal(keeps('<h1>x</h1><script type="application/json" data-x>{"a": 1}</script>').mono, false);
  });
});

describe("build: manifest.mono is generated from the assembled parts", () => {
  test("every module whose assembled CSS or JS names the mono family is in mono.modules or sets it only under [data-mono]", () => {
    assert.ok(manifest.mono, "the manifest has mono");
    assert.deepEqual(Object.keys(manifest.mono).sort(), ["attributes", "classes", "modules", "tags"]);
    const src = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools", "html-skill", "src", "modules.json"), "utf8"));
    assert.equal(src.mono, undefined, "the source manifest lists nothing by hand");
    for (const name of moduleNames()) {
      const css = files[`parts/${name}.css`] ?? "";
      const js = files[`parts/${name}.js`] ?? "";
      if (!MONO_NAMES.test(css) && !MONO_NAMES.test(js)) {
        assert.ok(!manifest.mono.modules.includes(name), `${name} names no mono family, so it is not in mono.modules`);
        continue;
      }
      if (manifest.mono.modules.includes(name)) continue;
      // Not listed: so its JS names none, and every CSS rule that names the family is under [data-mono].
      assert.ok(!MONO_NAMES.test(js), `${name}'s script writes a mono name and is not in mono.modules`);
      const rules = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].filter((m) => MONO_NAMES.test(m[2]));
      assert.ok(rules.length > 0, `${name}: the family is named in a rule`);
      for (const [, selector] of rules) for (const part of selector.split(",")) assert.match(part.replace(/\([^()]*\)/g, ""), /\[data-mono\]/, `${name}: "${selector.trim()}" sets mono outside [data-mono]`);
    }
    for (const name of ["diagram", "diagram-export", "code", "kbd", "release", "rich-text", "runs", "terminal"]) assert.ok(manifest.mono.modules.includes(name), `${name} is in mono.modules`);
    for (const name of ["dlist", "table"]) assert.ok(!manifest.mono.modules.includes(name), `${name} sets mono only under [data-mono]`);
    assert.ok(manifest.mono.attributes.includes("data-mono"), "the attribute comes from the [data-mono] rules");
    assert.deepEqual(manifest.mono.tags, ["code", "kbd", "pre", "samp"], "the tags of core.css's mono rules");
    assert.deepEqual(manifest.mono.classes, ["mono"], "the class of core.css's mono rule");
  });

  test("a mono rule counts as limited only when its selector requires [data-mono] outside any parenthesis, and the face's name is read in any case", () => {
    const parts = {
      "parts/core.css": "pre,code{font-family:var(--basalt-font-family-mono)}.mono{font-family:var(--basalt-font-family-mono)}",
      "parts/is.css": "@layer basalt{.a :is([data-mono],.x){font-family:var(--basalt-font-family-mono)}}",
      "parts/where.css": ".c:where([data-mono]){font:1em geist mono}",
      "parts/required.css": "@layer basalt{.b td[data-mono]{font-family:var(--basalt-font-family-mono)}}",
      "parts/not.css": ".d:not([data-mono]) [data-mono]{font-family:'GEIST MONO'}",
      "parts/script.js": "x.style.fontFamily='geist mono'",
    };
    assert.deepEqual(monoManifest(parts, ["is", "where", "required", "not", "script"]), { modules: ["is", "where", "script"], tags: ["code", "pre"], classes: ["mono"], attributes: ["data-mono"] });
  });

  test("the sans part carries the OFL notice, and the two parts are the one geist.css apart from the split", () => {
    const geist = path.join(repoRoot, "node_modules", "geist");
    const ofl = fs.readFileSync(path.join(geist, "LICENSE.txt"), "utf8").trim();
    assert.ok(files["parts/geist-sans.css"].includes(ofl), "the whole OFL 1.1 text is in the sans part");
    assert.ok(!files["parts/geist-mono.css"].includes("SIL Open Font License"), "the mono part is the face alone; the sans part's notice covers it");
    // geist.css as the build wrote it before the split, from the same files.
    const uri = (sub, file) => `data:font/woff2;base64,${fs.readFileSync(path.join(geist, "dist", "fonts", sub, file)).toString("base64")}`;
    const before = [
      "/* Geist Sans and Geist Mono, variable fonts, inlined as data URIs. Built by tools/html-skill/build.mjs; do not edit. */",
      `/*! Geist Sans and Geist Mono:\n${ofl.replaceAll("*/", "* /")}\n*/`,
      `@font-face { font-family: "Geist"; src: url("${uri("geist-sans", "Geist-Variable.woff2")}") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }`,
      `@font-face { font-family: "Geist Mono"; src: url("${uri("geist-mono", "GeistMono-Variable.woff2")}") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }`,
    ].join("\n");
    assert.equal(`${files["parts/geist-sans.css"]}${files["parts/geist-mono.css"]}`, `${before}\n`, "byte for byte, split at the mono face's line");
    assert.equal(`${files["parts/geist-sans.css"].trim()}\n${files["parts/geist-mono.css"].trim()}`, before);
    assert.equal(files["parts/geist.css"], undefined, "geist.css is gone");
  });
});
