// compose.mjs and the module split: what a body gets, the budgets, and that the cheat sheet in SKILL.md maps to modules.
// No browser here (the pixel and parity tests render pages); this file is about what is in the file.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { compose, detect, indexLines, usageText } from "../../../.agent/skills/basalt-html/compose.mjs";
import { EXAMPLES, read, skillDir } from "./support.mjs";

const manifest = JSON.parse(read(skillDir, "parts", "manifest.json"));
const modules = Object.keys(manifest.modules);
const part = (name, ext) => (fs.existsSync(path.join(skillDir, "parts", `${name}.${ext}`)) ? read(skillDir, "parts", `${name}.${ext}`) : "");
const size = (name) => Buffer.byteLength(part(name, "css")) + Buffer.byteLength(part(name, "js"));
const skill = read(skillDir, "SKILL.md");
// SKILL.md's index of modules, and each usage text (the core's and every module's): what the old cheat sheet became.
const indexSection = skill.slice(skill.indexOf("## Modules"), skill.indexOf("## Rules"));
const usageNames = ["core", ...modules];
const usageOf = (name) => read(skillDir, "parts", "usage", `${name}.md`);
const used = (body, options) => compose(body, { fonts: false, ...options }).modules;

describe("what a body gets", () => {
  test("a body with no components gets the core alone, no icons, and the init call", () => {
    const { html, modules: got, icons } = compose("<h1>Hello</h1><p class=\"lead\">Text</p>", { fonts: false });
    assert.deepEqual([got, icons], [[], []]);
    assert.ok(!html.includes("Phosphor"), "no icons, no notice");
    assert.match(html, /<script>Basalt\.init\(\);<\/script>\n<\/body>/);
    assert.match(html, /<title>Hello<\/title>/, "the first h1 is the title");
  });

  test("a component's class, tag or attribute brings its module, and nothing else", () => {
    assert.deepEqual(used('<div class="callout"><p>x</p></div>'), ["callout"]);
    assert.deepEqual(used("<table><tr><td>x</td></tr></table>"), ["table"]);
    assert.deepEqual(used('<button data-disclosure aria-controls="a">x</button>'), ["disclosure"]);
    assert.deepEqual(used('<span class="status">x</span> <span class="badge">y</span>'), ["status"]);
    assert.deepEqual(used('<span class="x"><braille-spinner></braille-spinner></span>'), ["braille"]);
    assert.deepEqual(used('<div role="tablist"></div>'), ["tabs"]);
    assert.deepEqual(used("<input>"), ["forms"]);
    assert.deepEqual(used('<span class="number-field"><input class="input" type="number"></span>'), ["forms", "number"], "the number field brings the forms it sits on");
    assert.deepEqual(used('<input type="range">'), ["forms", "range"]);
    assert.deepEqual(used("<input type='range'>"), ["forms", "range"]);
    assert.deepEqual(used('<input type="text">'), ["forms"], "a text input has no range");
    assert.deepEqual(used("<details><summary>x</summary></details>"), ["disclosure"], "a native details is drawn as the disclosure");
    assert.deepEqual(used('<section data-accent="cobalt"><span class="status" data-status="accent">x</span>'), ["status", "accent"], "the accent classes come only with data-accent");
    assert.deepEqual(used('<span class="status" data-status="accent">x</span>'), ["status"], "the accent reader is in status; the accent sheet is not");
    assert.deepEqual(used('<button class="btn" data-copy-text="x">Copy</button>'), ["copy"], "a button is core");
    assert.deepEqual(used('<script>Basalt.copyText("x"); Basalt.init();</script>'), ["copy"]);
  });

  test("the overlay layer comes in as modules, each by its own markup, attribute or call, with what it needs, and prose that merely names one gets none", () => {
    assert.deepEqual(used('<button popovertarget="p">x</button>'), ["popover"]);
    assert.deepEqual(used('<div class="menu" popover></div>'), ["glide", "popover", "menu"], "a menu brings the popup rules and the shared plate");
    assert.deepEqual(used('<button data-dialog-open="#d">x</button>'), ["dialog"]);
    assert.deepEqual(used("<dialog>x</dialog>"), ["dialog"], "a native dialog is drawn as the dialog");
    assert.deepEqual(used('<dialog class="sheet" data-side="top"></dialog>'), ["dialog", "sheet"], "a sheet brings the dialog it is");
    assert.deepEqual(used('<script>Basalt.openDialog("#d"); Basalt.init();</script>'), ["dialog"]);
    assert.deepEqual(used('<button data-tooltip="Save">x</button>'), ["popover", "tooltip"]);
    assert.deepEqual(used('<button data-tooltip="Save" data-tooltip-keys="⌘ S">x</button>'), ["kbd", "popover", "tooltip"], "a tooltip's shortcut brings the chips");
    assert.deepEqual(used('<script>Basalt.toast({ title: "Saved" }); Basalt.init();</script>'), ["braille", "toast"], "a toast brings the braille it shows while work runs");
    assert.deepEqual(used('<script>Basalt.notifications("#bell", { entries: [] }); Basalt.init();</script>'), ["glide", "popover", "notifications"]);
    assert.deepEqual(used('<span class="plate"></span>'), ["glide"]);
    assert.deepEqual(used("<p>A popover, a menu, a dialog and a toast are words here.</p>"), []);
  });

  test("forms and selection come in as modules, each by its own markup, and prose that merely names one gets none", () => {
    assert.deepEqual(used('<select class="input"><option>x</option></select>'), ["forms", "select"], "a select is its own module, with the form rules it needs");
    assert.deepEqual(used('<input type="checkbox" aria-label="x">'), ["forms", "choice"]);
    assert.deepEqual(used("<input type='radio' name='a'>"), ["forms", "choice"]);
    assert.deepEqual(used('<input type="checkbox" role="switch" aria-label="x">'), ["forms", "choice"]);
    assert.deepEqual(used('<label class="choice">x</label>'), ["choice"]);
    assert.deepEqual(used('<label class="panel choice-card"><input class="choice-card-input" type="radio" name="a"></label>'), ["forms", "choice-card"], "a choice card's own input does not bring the bare choice rules");
    assert.deepEqual(used('<input type="text" class="input">'), ["forms"]);
    assert.deepEqual(used('<button class="btn" aria-pressed="false">x</button>'), ["toggle"]);
    assert.deepEqual(used('<button aria-pressed="true" class="btn" data-variant="ghost">x</button>'), ["toggle"], "the attribute may come first");
    assert.deepEqual(used('<div class="segment"><button aria-pressed="true">x</button></div>'), ["segment"], "a segment's buttons are not toggles");
    assert.deepEqual(used('<span class="btn-check"></span>'), ["toggle"]);
    assert.deepEqual(used('<th class="select-col">x</th>'), ["choice", "table", "selection"], "a checkbox column brings the table and the boxes");
    assert.deepEqual(used('<input type="checkbox" data-select-all aria-label="x"><table></table>'), ["forms", "choice", "table", "selection"]);
    assert.deepEqual(used('<button class="btn" data-loops-toggle aria-pressed="false">x</button>'), ["toggle", "loops"]);
    assert.deepEqual(used("<script>Basalt.loops.set(true); Basalt.init();</script>"), ["loops"]);
    assert.deepEqual(used("<p>A checkbox, a switch, a select, a toggle and a loop are words here.</p>"), []);
  });

  test("tables and filters come in as modules, each by its own markup: a plain table brings the table alone, and prose that merely names one gets none", () => {
    assert.deepEqual(used("<table><tr><td>x</td></tr></table>"), ["table"], "a plain table is the table module only");
    assert.deepEqual(used('<p class="table-hint" hidden></p>'), ["table"], "the scroll hint is the table module's");
    assert.deepEqual(used("<table data-fixed><tr><td>x</td></tr></table>"), ["glyph", "table", "still-table"], "a fixed table brings the still table, with the glyphs its sort seat draws");
    assert.deepEqual(used("<table><thead><tr><th data-sortable>x</th></tr></thead></table>"), ["glyph", "table", "still-table"], "a sortable header does too");
    assert.deepEqual(used('<table data-pinned="1"><tr><td>x</td></tr></table>'), ["glyph", "table", "still-table"]);
    assert.deepEqual(used('<div class="table-empty">x</div>'), ["glyph", "table", "still-table"], "the empty row's block names the still table");
    assert.deepEqual(used('<div class="filter" data-label="Status"><label><input type="checkbox" value="a"> A</label></div>'), ["glyph", "forms", "choice", "glide", "filter", "popover"], "a filter brings the checklist's popup, its plate, the glyphs and the boxes, whichever form the count picks");
    assert.deepEqual(used('<p class="filter-result">Showing 3 of 24 runs</p>'), ["glyph", "choice", "glide", "filter", "popover"], "so does the result line, which the filter writes");
    assert.deepEqual(used("<p>A sortable table, a still table, a filter, a chip and a result line are words here.</p>"), []);
    const filter = compose('<div class="filter" data-label="Status"></div>', { fonts: false });
    for (const name of ["plus", "check"]) assert.ok(filter.glyphs.includes(name), `a filter draws the ${name} glyph, so the page carries it`);
    for (const name of ["CaretDown", "MagnifyingGlass"]) assert.ok(filter.icons.includes(name), `and the ${name} icon`);
    const still = compose("<table data-fixed><tr><td>x</td></tr></table>", { fonts: false });
    for (const name of ["arrow-up", "arrow-down"]) assert.ok(still.glyphs.includes(name), `a still table draws the ${name} glyph`);
    assert.ok(still.icons.includes("CaretUpDown"));
  });

  test("a page with the loops module sets a stored hold before first paint, in the head beside the theme's line, and no other page does", () => {
    const withLoops = compose('<button class="btn" data-loops-toggle aria-pressed="false">x</button>', { fonts: false }).html;
    assert.match(withLoops.split("</head>")[0], /<script>\(function\(\)\{try\{if\(localStorage\.getItem\("basalt-loops"\)==="held"\)document\.documentElement\.setAttribute\("data-loops","held"\)/);
    assert.ok(!compose("<h1>x</h1>", { fonts: false }).html.includes("basalt-loops"));
  });

  test("the art tokens come only to a page that names one: art, aspect, stage headroom and chart tokens bring the art module, and a page that names none gets none", () => {
    for (const name of ["--basalt-art-tone-2", "--basalt-art-quiet-limit", "--basalt-aspect-photo", "--basalt-size-stage-headroom", "--basalt-chart-observed", "--basalt-size-chart-plot"]) {
      assert.deepEqual(used(`<style>.hero { background: var(${name}); }</style><div class="hero"></div>`), ["art"], name);
    }
    assert.deepEqual(used('<div class="panel"><p style="color: var(--basalt-text-secondary)">x</p></div>'), [], "a body that names none of them gets none");
    const core = part("core", "css");
    for (const name of ["--basalt-art-tone-2", "--basalt-aspect-photo", "--basalt-size-stage-headroom", "--basalt-chart-observed"]) assert.ok(!core.includes(name), `${name} is not in the core`);
    const art = part("art", "css");
    for (const name of ["--basalt-art-field", "--basalt-art-tone-1", "--basalt-art-tone-2", "--basalt-art-tone-3", "--basalt-art-tone-4", "--basalt-art-mark", "--basalt-art-quiet-limit", "--basalt-aspect-wide", "--basalt-size-stage-headroom", "--basalt-chart-axis"]) assert.ok(art.includes(`${name}:`), `${name} is in the art module`);
    assert.ok(art.includes("[data-theme=dark]") && art.includes("prefers-color-scheme:dark"), "in both themes, the toggle's and the system's");
    assert.ok(Buffer.byteLength(art) <= manifest.modules.art.budget, `the art module is ${Buffer.byteLength(art)} bytes of ${manifest.modules.art.budget}`);
    const page = compose("<style>.h { color: var(--basalt-art-tone-2) }</style><p class=\"h\">x</p>", { fonts: false }).html;
    assert.ok(page.includes("--basalt-art-tone-2:"), "the composed page carries the declaration");
    assert.ok(!compose("<p>x</p>", { fonts: false }).html.includes("--basalt-art-tone-2"), "a page with none carries none");
  });

  test("the stage and framed art come by their own classes with the art tokens they read, and prose that merely names them gets none", () => {
    assert.deepEqual(used('<section class="stage"><div class="stage-art"></div></section>'), ["art", "stage"]);
    assert.deepEqual(used('<img class="paired-art" data-art="dark" src="a.webp" alt="">'), ["art", "stage"]);
    assert.deepEqual(used('<figure class="framed"><div class="framed-frame"><img src="a.webp" alt="x"></div></figure>'), ["art", "framed-art"]);
    assert.deepEqual(used("<p>The stage is the first screen of a framed page.</p>"), []);
    const page = compose('<figure class="framed"><div class="framed-frame"><img src="a.webp" alt="x"></div></figure>', { fonts: false }).html;
    assert.ok(page.includes("--basalt-aspect-photo:") && page.includes("wireFramedArt"), "the tokens and the script come with it");
    assert.ok(!compose('<section class="stage"></section>', { fonts: false }).html.includes("wireFramedArt"), "a stage carries no frame script");
  });

  test("a class written in a script's string, or className, or classList is seen", () => {
    assert.deepEqual(used("<script>el.innerHTML = '<div class=\"callout\"></div>'; Basalt.init();</script>"), ["callout"]);
    assert.deepEqual(used("<script>el.className = 'progress'; Basalt.init();</script>"), ["progress"]);
    assert.deepEqual(used("<script>el.classList.add('spinner', 'x'); Basalt.init();</script>"), ["spinner"]);
  });

  test("the palette brings the rows and the kbd it needs, in the manifest's order", () => {
    assert.deepEqual(used("<button data-open-palette>Commands</button>"), ["kbd", "rows", "glide", "palette"]);
    assert.deepEqual(used('<script>Basalt.init({ palette: { groups: [] } })</script>'), ["kbd", "rows", "glide", "palette"]);
  });

  test("an icon is drawn when its name is quoted in the body or a module in use draws it, and not for a word in prose", () => {
    assert.deepEqual(compose('<i data-icon="Trash"></i><p>Copy the Check list. Info.</p>', { fonts: false }).icons, ["Trash"]);
    assert.deepEqual(compose('<button class="btn" data-theme-toggle></button>', { fonts: false }).icons, ["Sun", "Moon"]);
    assert.deepEqual(compose("<script>Basalt.icon('Download'); Basalt.init();</script>", { fonts: false }).icons, ["Download"]);
    const page = compose('<i data-icon="Trash"></i>', { fonts: false }).html;
    assert.ok(page.includes("Phosphor") && !page.includes("MagnifyingGlass"), "the notice comes with the icons, and only the named ones are in");
  });

  test("--all adds every module and every icon", () => {
    const all = compose("<p>x</p>", { fonts: false, all: true });
    assert.deepEqual(all.modules, modules);
    assert.equal(all.icons.length, Object.keys(JSON.parse(read(skillDir, "parts", "icons.json")).icons).length);
  });

  test("the modules come in the manifest's order whatever the body's order, and the same body gives the same page", () => {
    const body = '<span class="status">a</span><div class="callout"></div><table></table>';
    assert.deepEqual(used(body), ["table", "callout", "status"]);
    assert.equal(compose(body).html, compose(body).html);
    assert.equal(compose(body, { fonts: false }).html, compose(body, { fonts: false }).html);
  });

  test("the example bodies get the modules their markup needs", () => {
    assert.deepEqual(used(EXAMPLES.static), ["topbar", "kbd", "disclosure", "table", "code", "status", "stats", "progress", "copy", "theme"]);
    assert.deepEqual(used(EXAMPLES.interactive), ["topbar", "kbd", "forms", "number", "select", "rows", "glide", "tabs", "disclosure", "table", "code", "stats", "palette", "copy", "theme"]);
  });
});

describe("the body's own parts", () => {
  test("<title> and <style> move to the head, after Basalt's styles; the body keeps the rest", () => {
    const { html } = compose("<title>My page</title><style>.mine { color: red }</style><main><h1>Hi</h1></main>", { fonts: false });
    const [head, body] = html.split("<body>");
    assert.match(head, /<title>My page<\/title>/);
    assert.ok(head.indexOf(".mine { color: red }") > head.indexOf("@layer reset"), "the page's own CSS comes after Basalt's");
    assert.ok(!body.includes("<title>") && !body.includes("<style>"));
    assert.equal(html.match(/<title>/g).length, 1);
  });

  test("markup inside a script or a comment is not lifted", () => {
    const { html } = compose("<h1>X</h1><script>var a = '<style>.x{}</style><title>no</title>'; Basalt.init();</script><!-- <style>.y{}</style> -->", { fonts: false });
    assert.match(html, /<title>X<\/title>/);
    assert.ok(html.includes("var a = '<style>.x{}</style><title>no</title>'"));
    assert.ok(html.split("<body>")[1].includes("<!-- <style>.y{}</style> -->"));
  });

  test("a body that calls Basalt.init itself is not given a second call, and a JSON palette still gets one", () => {
    assert.equal(compose("<script>Basalt.init({ palette: {} });</script>", { fonts: false }).html.match(/Basalt\.init\(/g).length, 1);
    const json = compose('<script type="application/json" data-palette>{"groups":[]}</script>', { fonts: false }).html;
    assert.match(json, /<script>Basalt\.init\(\);<\/script>\n<\/body>/);
    assert.match(compose("<!-- call Basalt.init() later -->", { fonts: false }).html, /<script>Basalt\.init\(\);<\/script>\n<\/body>/);
  });

  test("<!-- basalt:use name --> adds a module by hand; a name that is not a module is refused", () => {
    const { html, modules: got } = compose("<!-- basalt:use callout, progress -->\n<p>x</p>", { fonts: false });
    assert.deepEqual(got, ["callout", "progress"]);
    assert.ok(!html.includes("basalt:use"));
    assert.throws(() => compose("<!-- basalt:use nonsense -->", { fonts: false }), /"nonsense", which is not a module \(modules: glyph, topbar, /);
  });

  test("detection reads markup and code, never comments: a word in an HTML, script or style comment brings nothing in, and basalt:use still does", () => {
    // A comment that names a module's own attribute, class or call (a data-glyph, a .toast, Basalt.toast) is not use of it.
    assert.deepEqual(used('<!-- <span data-glyph="home"></span> <dialog class="sheet"></dialog> -->\n<p>x</p>'), []);
    assert.deepEqual(used('<p>x</p>\n<script>\n// Basalt.toast("x"); a data-glyph="close" on a .sheet\n/* <span data-dialog-open="#d"></span> */\nvar a = 1;\n</script>'), []);
    assert.deepEqual(used('<style>/* .sheet { } [data-glyph] */ .x { color: red }</style><p>x</p>'), []);
    assert.deepEqual(used('<p>x</p><script>var url = "http://a.test/data-glyph"; var re = /\\/\\/ data-dialog-open/;</script>'), ["glyph", "dialog"], "a // inside a string or a regular expression is not a comment");
    assert.deepEqual(used("<!-- basalt:use glyph -->\n<!-- data-glyph in prose -->"), ["glyph"]);
    // A real use beside a comment still counts, in markup and in code; the init call is not made for one written in a comment.
    assert.deepEqual(used('<!-- one -->\n<span data-glyph="home"></span>\n<script>// Basalt.toast\nBasalt.toast("x");</script>'), ["glyph", "braille", "toast"]);
    const commented = compose("<p>x</p><script>// Basalt.init();\n</script>", { fonts: false }).html;
    assert.ok(commented.includes("<script>Basalt.init();</script>"), "a call written in a comment is not a call");
  });

  test("a core glyph is drawn by a part of its own: a page with a glyph and no sheet carries no sheet or dialog, and a module that needs the glyph requires it", () => {
    const glyph = compose('<span data-glyph="home" data-size="24"></span>', { fonts: false });
    assert.deepEqual(glyph.modules, ["glyph"]);
    assert.deepEqual(glyph.glyphs, ["home"], "only the glyph it names");
    assert.ok(!glyph.html.includes("dialog.sheet") && !glyph.html.includes("showModal"), "no sheet or dialog in the page");
    assert.ok(glyph.html.includes("addGlyphs") && !glyph.html.includes('"close":['), "the table holds the glyph it names and no other");
    // The sheet alone draws none.
    assert.deepEqual(used('<dialog class="panel float modal sheet" data-side="right"><h2 class="dialog-title">x</h2></dialog>'), ["dialog", "sheet"]);
    // The modules that draw a glyph themselves bring the part and the two glyphs they draw.
    const bar = compose('<header class="topbar"><div class="topbar-inner"><a class="brand" href="#">x</a><nav class="topbar-links" aria-label="Primary"><a href="#">a</a></nav></div></header>', { fonts: false });
    assert.ok(["glyph", "sheet", "dialog", "nav", "glide", "topbar", "topbar-nav"].every((n) => bar.modules.includes(n)), bar.modules.join(", "));
    assert.deepEqual(bar.glyphs, ["menu", "close"]);
    for (const [name, m] of Object.entries(manifest.modules)) if ((m.glyphs ?? []).length) assert.ok(m.requires.includes("glyph"), `${name} draws glyphs and must require glyph`);
  });

  test("a page with a tab bar or an app shell covers its whole screen (viewport-fit=cover), and no other page does", () => {
    for (const body of ['<nav class="tab-bar" aria-label="Primary"></nav>', '<div class="app-shell"></div>']) assert.match(compose(body, { fonts: false }).html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
    assert.match(compose('<header class="topbar"><div class="topbar-inner"></div></header>', { fonts: false }).html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  });

  test("a whole page is refused with a plain message, and so is a bad language", () => {
    assert.throws(() => compose("<!doctype html><html><body>x</body></html>"), /whole page/);
    assert.throws(() => compose("<body>x</body>"), /whole page/);
    assert.throws(() => compose("x", { lang: '"><script>' }), /not a language code/);
    assert.match(compose("x", { lang: "fr", fonts: false }).html, /<html lang="fr">/);
  });

  test("a script's closing tag and comment opener can't end the library's script early", () => {
    const { html } = compose("x", { fonts: false, all: true });
    const libraries = html.slice(html.indexOf("</style>"), html.indexOf("</head>"));
    assert.equal((libraries.match(/<\/script/g) ?? []).length, 1);
  });
});

describe("the command line", () => {
  const compose_ = path.join(skillDir, "compose.mjs");
  const run = (args, cwd) => spawnSync(process.execPath, [compose_, ...args], { cwd, encoding: "utf8" });

  test("writes the page named by --out, or the body's name without .body, and nothing else", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-compose-"));
    try {
      fs.writeFileSync(path.join(dir, "report.body.html"), "<h1>Report</h1>");
      const first = run(["report.body.html", "--no-fonts"], dir);
      assert.equal(first.status, 0, first.stderr);
      assert.deepEqual(fs.readdirSync(dir).sort(), ["report.body.html", "report.html"]);
      assert.match(first.stdout, /report\.html: [\d.]+ KB, core \+ no modules; icons: none/);
      run(["report.body.html", "--out", "other.html", "--no-fonts"], dir);
      assert.deepEqual(fs.readdirSync(dir).sort(), ["other.html", "report.body.html", "report.html"]);
      assert.equal(fs.readFileSync(path.join(dir, "other.html"), "utf8"), fs.readFileSync(path.join(dir, "report.html"), "utf8"));
      assert.match(fs.readFileSync(path.join(dir, "report.html"), "utf8"), /^<!doctype html>\n<html lang="en">/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("never overwrites its input, and says so; bad arguments print the usage", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-compose-"));
    try {
      fs.writeFileSync(path.join(dir, "page.html"), "<h1>Keep me</h1>");
      const same = run(["page.html"], dir);
      assert.equal(same.status, 1);
      assert.match(same.stderr, /would be overwritten; name the page with --out/);
      assert.equal(run(["page.html", "--out", "page.html"], dir).status, 1);
      assert.equal(fs.readFileSync(path.join(dir, "page.html"), "utf8"), "<h1>Keep me</h1>");
      for (const args of [[], ["--bogus", "page.html"], ["a.html", "b.html"], ["page.html", "--out"]]) {
        const r = run(args, dir);
        assert.equal(r.status, 2, args.join(" "));
        assert.match(r.stderr, /usage: node \.agent\/skills\/basalt-html\/compose\.mjs /);
      }
      const missing = run(["nope.body.html"], dir);
      assert.equal(missing.status, 1);
      assert.match(missing.stderr, /compose\.mjs: /);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("prints one warning line for each module it added, from SKILL.md's index, after the line that says what it built", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-compose-"));
    try {
      fs.writeFileSync(path.join(dir, "p.body.html"), '<h1>P</h1><div class="callout"><p>x</p></div><button class="btn" data-copy-text="x">Copy</button>');
      const r = run(["p.body.html", "--no-fonts"], dir);
      assert.equal(r.status, 0, r.stderr);
      const lines = r.stdout.trim().split("\n");
      assert.match(lines[0], /^p\.html: [\d.]+ KB, core \+ callout, copy; icons: Check, X$/);
      const wanted = ["callout", "copy"].map((n) => `  ${n}: ${indexLines(skill).find((l) => l.name === n).warning}`);
      assert.deepEqual(lines.slice(2), wanted, "one line for each module, in the page's order");
      assert.deepEqual(run(["p.body.html", "--no-fonts"], dir).stdout, r.stdout, "the same input gives the same output");
      // a palette brings rows and kbd that its script builds: they say so instead of warning; a rows the body uses itself still warns
      fs.writeFileSync(path.join(dir, "r.body.html"), "<h1>R</h1><button class=\"btn\" data-open-palette>Commands</button>");
      const built = run(["r.body.html", "--no-fonts"], dir).stdout;
      assert.match(built, /^  kbd: built by the palette; nothing to check\.$/m);
      assert.match(built, /^  rows: built by the palette; nothing to check\.$/m);
      assert.ok(built.includes(`  palette: ${indexLines(skill).find((l) => l.name === "palette").warning}`), "the palette itself still warns");
      fs.writeFileSync(path.join(dir, "s.body.html"), "<h1>S</h1><button class=\"btn\" data-open-palette>Commands</button><div class=\"rows\"><div class=\"row\">x</div></div>");
      const own = run(["s.body.html", "--no-fonts"], dir).stdout;
      assert.ok(own.includes(`  rows: ${indexLines(skill).find((l) => l.name === "rows").warning}`), "a rows the body uses itself keeps its warning");
      assert.match(own, /^  kbd: built by the palette; nothing to check\.$/m);
      fs.writeFileSync(path.join(dir, "q.body.html"), "<h1>Q</h1>");
      assert.doesNotMatch(run(["q.body.html", "--no-fonts"], dir).stdout, /Check before/, "no module added, no warning");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--usage NAME prints the module's usage, the usage of each module it requires, and its classes, attributes and tags from the manifest; it writes no page", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-compose-"));
    try {
      const r = run(["--usage", "palette"], dir);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stderr, "");
      assert.equal(r.stdout.trim(), usageText(["palette"], { parts: path.join(skillDir, "parts") }).trim());
      // the palette alone: it builds its own rows and key chips, so their usage is not printed, only a line that says so
      const heads = [...r.stdout.matchAll(/^# (\w+)/gm)].map((m) => m[1]);
      assert.deepEqual(heads, ["palette"]);
      assert.ok(r.stdout.includes(usageOf("palette").trim()), "the palette's usage is printed whole");
      assert.match(r.stdout, /Its script builds the markup of kbd, rows and glide: nothing to add\. If your page uses one itself, print its usage by name\./);
      for (const name of ["kbd", "rows", "glide"]) assert.ok(!r.stdout.includes(usageOf(name).trim()), `${name}'s usage is not printed with the palette`);
      assert.match(r.stdout, /^Brought in by: /m);
      assert.doesNotMatch(r.stdout, /\\s|\(\?:/, "no regular expression is printed");
      assert.match(r.stdout, /the body has a call to Basalt\.openPalette or Basalt\.closePalette; or palette: inside a Basalt\.init call/);
      for (const cls of manifest.modules.palette.classes) assert.ok(r.stdout.includes(`.${cls}`), `.${cls} is listed`);
      for (const attr of manifest.modules.palette.attrs) assert.ok(r.stdout.includes(attr), `${attr} is listed`);
      // a module that needs another whose markup the agent writes (number sits on forms) prints it whole
      const number = run(["--usage", "number"], dir);
      assert.deepEqual([...number.stdout.matchAll(/^# (\w+)/gm)].map((m) => m[1]), ["number", "forms"]);
      assert.match(number.stdout, /^Required by number\. Brought in by: classes \.field /m);
      assert.ok(number.stdout.includes(usageOf("forms").trim()));
      // named, the built modules print too, each with what brings it in
      const named = run(["--usage", "palette", "kbd", "rows"], dir);
      assert.deepEqual([...named.stdout.matchAll(/^# (\w+)/gm)].map((m) => m[1]), ["palette", "kbd", "rows"]);
      for (const name of ["kbd", "rows"]) {
        for (const cls of manifest.modules[name].classes ?? []) assert.ok(named.stdout.includes(`.${cls}`), `${name}: .${cls} is listed`);
        for (const attr of manifest.modules[name].attrs ?? []) assert.ok(named.stdout.includes(attr), `${name}: ${attr} is listed`);
        for (const tag of manifest.modules[name].tags ?? []) assert.ok(named.stdout.includes(`<${tag}>`), `${name}: <${tag}> is listed`);
      }
      // the core's classes come from the manifest too, and several names are fine
      const both = run(["--usage", "core", "table"], dir);
      assert.equal(both.status, 0, both.stderr);
      assert.match(both.stdout, /^# core/m);
      assert.match(both.stdout, /^# table/m);
      assert.match(both.stdout, /Always in\. Core classes \.display \.text-5xl /);
      // a module that needs nothing prints alone, and a name given twice prints once
      assert.deepEqual([...run(["--usage", "callout", "callout"], dir).stdout.matchAll(/^# (\w+)/gm)].map((m) => m[1]), ["callout"]);
      assert.deepEqual(fs.readdirSync(dir), [], "no page, and no other file, is written");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--usage alone prints the index, one line for the core and each module; an unknown name fails with the index and a non-zero exit", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-compose-"));
    try {
      const r = run(["--usage"], dir);
      assert.equal(r.status, 0, r.stderr);
      const listed = r.stdout.split("\n").filter((l) => l.startsWith("- **")).map((l) => l.match(/^- \*\*([\w-]+)\*\*/)[1]);
      assert.deepEqual(listed, usageNames, "the core, then the modules in the manifest's order");
      assert.ok(r.stdout.includes(indexLines(skill).map((l) => `- ${l.line}`).join("\n")), "the lines are SKILL.md's own");
      const bad = run(["--usage", "nope"], dir);
      assert.equal(bad.status, 1);
      assert.equal(bad.stdout, "", "nothing on stdout for a name that is not a module");
      assert.match(bad.stderr, /compose\.mjs: "nope" is not a module \(core or: glyph, topbar, /);
      assert.ok(bad.stderr.includes(indexLines(skill).map((l) => `- ${l.line}`).join("\n")), "the index is printed with the failure");
      const mixed = run(["--usage", "table", "nope"], dir);
      assert.equal(mixed.status, 1);
      assert.equal(mixed.stdout, "", "a good name beside a bad one prints nothing");
      assert.equal(run(["--usage", "table", "--out", "x.html"], dir).status, 2, "--usage is not mixed with a page's options");
      assert.equal(run(["--usage", "table", "--no-fonts"], dir).status, 0, "--usage ignores a page option and still reads no body");
      assert.deepEqual(fs.readdirSync(dir), [], "no page is written");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("uses no network and no module outside node:, so it runs from the skill folder anywhere", () => {
    const source = read(skillDir, "compose.mjs");
    assert.deepEqual([...source.matchAll(/^import .* from "([^"]+)"/gm)].map((m) => m[1]).sort(), ["node:fs", "node:path", "node:url"]);
    assert.doesNotMatch(source, /\bfetch\(|https?\.request|node:(net|http|https|dns|child_process)/);
  });
});

describe("modules map to the index and the usage texts", () => {
  // What the old cheat sheet was: now SKILL.md's index of modules and the usage text of the core and each module. A class or attribute in
  // any of them is held to the same rules the cheat sheet was, so a fact that moved out of SKILL.md is still checked.
  const sheet = [indexSection, ...usageNames.map(usageOf)].join("\n");
  const owner = (cls) => (manifest.core.classes.includes(cls) ? "core" : modules.find((m) => (manifest.modules[m].classes ?? []).includes(cls)));
  const cssOf = (name) => part(name, "css");
  // classes and attributes in code spans
  const classesOf = (text) => [...new Set([...text.matchAll(/`([^`]+)`/g)].flatMap((m) => [...m[1].matchAll(/(?<![\w\d.-])\.([a-z][\w-]*)/g)].map((c) => c[1])))];
  const classes = classesOf(sheet);
  const attrs = [...new Set([...sheet.matchAll(/(?<![\w-])(data-[a-z-]+)/g)].map((m) => m[1]))];

  test("every class in the index and the usage texts belongs to the core or to exactly one module, and that part's CSS styles it", () => {
    assert.ok(classes.length > 60, `found ${classes.length} classes in the index and the usage texts`);
    for (const cls of classes) {
      const owners = [...(manifest.core.classes.includes(cls) ? ["core"] : []), ...modules.filter((m) => (manifest.modules[m].classes ?? []).includes(cls))];
      assert.equal(owners.length, 1, `.${cls} is claimed by ${owners.join(", ") || "nothing"}`);
      assert.ok(new RegExp(`\\.${cls}(?![\\w-])`).test(cssOf(owners[0])), `.${cls} is not in ${owners[0]}'s CSS`);
    }
  });

  test("a page using any class the index or a usage text names gets its module", () => {
    for (const cls of classes) {
      const own = owner(cls);
      const got = used(`<div class="${cls}">x</div>`);
      if (own === "core") assert.ok(!got.length || cls === "tap", `.${cls} is core but pulled in ${got.join(", ")}`);
      else assert.ok(got.includes(own), `.${cls} should bring ${own}, got ${got.join(", ") || "nothing"}`);
    }
  });

  test("every class a module claims is in its own CSS, and the claims don't overlap", () => {
    const seen = new Map();
    for (const name of modules) {
      for (const cls of manifest.modules[name].classes ?? []) {
        assert.ok(new RegExp(`\\.${cls}(?![\\w-])`).test(cssOf(name)), `${name} claims .${cls}, which its CSS does not style`);
        assert.ok(!seen.has(cls), `.${cls} is claimed by ${seen.get(cls)} and ${name}`);
        seen.set(cls, name);
      }
    }
    for (const cls of manifest.core.classes) assert.ok(!seen.has(cls), `.${cls} is in the core and in ${seen.get(cls)}`);
  });

  test("every behaviour attribute in the index and the usage texts brings the module that wires it", () => {
    const wires = { "data-tabs": "tabs", "data-disclosure": "disclosure", "data-copy": "copy", "data-copy-text": "copy", "data-open-palette": "palette", "data-theme-toggle": "theme", "data-kbd": "kbd", "data-kbd-hint": "kbd", "data-palette": "palette", "data-doc": "kbd", "data-dialog-open": "dialog", "data-dialog-close": "dialog", "data-tooltip": "tooltip", "data-tooltip-keys": "kbd", "data-glyph": "glyph" };
    const behaviour = attrs.filter((a) => a in wires);
    assert.ok(behaviour.length >= 6);
    for (const attr of behaviour) assert.ok(used(`<div ${attr}></div>`).includes(wires[attr]), `${attr} should bring ${wires[attr]}`);
  });

  test("every usage text names only classes of its own module, the modules it requires, the core, or a mention listed here, and each brings its module", () => {
    // A usage may point at one class of another module, said here so it is on purpose (the core's `.hint` is a forms class; a braille spinner sits in a `.status`).
    // The app shell names the phone tab bar that goes in it; the tab bar names the sheet and the nav rows of its More cell (a page that uses them brings them by their own markup).
    const mentions = { core: ["hint"], braille: ["status"], loops: ["btn-check"], "app-shell": ["tab-bar"], "tab-bar": ["sheet", "nav", "dialog-title"], stage: ["topbar"] };
    const needed = (name) => {
      const set = new Set([name]);
      for (let grew = true; grew;) { grew = false; for (const n of [...set]) for (const r of manifest.modules[n]?.requires ?? []) if (!set.has(r)) { set.add(r); grew = true; } }
      return set;
    };
    for (const name of usageNames) {
      const text = usageOf(name);
      const named = new Set([...classesOf(text), ...[...text.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean))]);
      for (const cls of named) {
        const own = owner(cls);
        assert.ok(own, `${name}'s usage names .${cls}, which no module or the core owns`);
        assert.ok(own === "core" || needed(name).has(own) || (mentions[name] ?? []).includes(cls), `${name}'s usage names .${cls}, which belongs to ${own}, a module ${name} does not need`);
        if (own !== "core") assert.ok(used(`<div class="${cls}">x</div>`).includes(own), `.${cls} in ${name}'s usage should bring ${own}`);
      }
      for (const cls of mentions[name] ?? []) assert.ok(named.has(cls), `${name}'s listed mention .${cls} is no longer in its usage`);
    }
  });

  test("SKILL.md's index has a line for the core and for each module, in the manifest's order, and each line's first trigger brings that module", () => {
    const lines = indexLines(skill);
    assert.deepEqual(lines.map((l) => l.name), usageNames);
    for (const { name, trigger, warning } of lines) {
      assert.match(trigger, /^`/, `${name}: the line names what brings the module, in code`);
      assert.ok(warning.length > 20 && warning.length < 160, `${name}: one short warning (${warning.length} bytes)`);
      assert.ok(Buffer.byteLength(`- **${name}** ${trigger}: ${warning}`) <= 130, `${name}'s index line is over 130 bytes`);
      if (name === "core") continue;
      for (const [, span] of trigger.matchAll(/`([^`]+)`/g)) {
        let markup = null;
        if (/^\.[a-z][\w-]*$/.test(span)) markup = `<div class="${span.slice(1)}">x</div>`;
        else if (/^data-[a-z-]+$/.test(span)) markup = `<div ${span}>x</div>`;
        else if (/^<[a-z-]+>$/.test(span)) markup = `${span}x`;
        else if (/^type="range"$/.test(span)) markup = `<input ${span}>`;
        else if (/^role="tablist"$/.test(span)) markup = `<div ${span}>x</div>`;
        else if (/^popovertarget$/.test(span)) markup = `<button ${span}="p">x</button>`;
        if (markup) assert.ok(used(markup).includes(name), `${name}'s trigger ${span} should bring it in`);
      }
    }
  });

  test("the usage texts: one for the core and each module, a heading that names it, within its own cap, and the folder holds nothing else", () => {
    const files = fs.readdirSync(path.join(skillDir, "parts", "usage")).sort();
    assert.deepEqual(files, usageNames.map((n) => `${n}.md`).sort());
    for (const name of usageNames) {
      const text = usageOf(name);
      assert.match(text, new RegExp(`^# ${name}\\b`), `${name}.md starts with its own heading`);
      const cap = name === "core" ? manifest.core.usage : manifest.modules[name].usage;
      assert.ok(Number.isInteger(cap) && cap > 0, `${name} has a usage cap in modules.json`);
      assert.ok(Buffer.byteLength(text) <= cap, `${name}'s usage is ${Buffer.byteLength(text)} bytes of ${cap}`);
    }
  });

  test("each text pattern has its words for --usage, and a module that builds another only names modules it requires", () => {
    for (const [name, m] of Object.entries(manifest.modules)) {
      assert.equal((m.textWords ?? []).length, (m.text ?? []).length, `${name}: one textWords entry for each text pattern`);
      for (const built of m.builds ?? []) assert.ok((m.requires ?? []).includes(built), `${name} builds ${built}, which it does not require`);
    }
  });

  test("the skill folder holds exactly SKILL.md, compose.mjs, parts/ and examples/", () => {
    assert.deepEqual(fs.readdirSync(skillDir).sort(), ["SKILL.md", "compose.mjs", "examples", "parts"]);
  });

  test("every module has CSS or script of its own, and a script module registers a step or an API", () => {
    for (const name of modules) {
      assert.ok(size(name) > 0, `${name} is empty`);
      assert.ok(Object.keys(manifest.modules[name]).some((k) => ["classes", "attrs", "tags", "text"].includes(k)), `${name} has no trigger`);
    }
  });
});

describe("the docs say how it works", () => {
  test("SKILL.md gives the workflow (write a body, run compose.mjs, open both themes), and AGENTS.md points at compose.mjs", () => {
    assert.match(skill, /Write the \*\*body\*\*/);
    assert.match(skill, /node \.agent\/skills\/basalt-html\/compose\.mjs report\.body\.html/);
    assert.match(skill, /Open the page in both themes at 1440 and 390 wide/);
    assert.match(skill, /print their usage in one call, always with core: `node \.agent\/skills\/basalt-html\/compose\.mjs --usage core table status callout`/);
    assert.match(skill, /one warning line for each module added/);
    const agents = read(skillDir, "..", "..", "..", "AGENTS.md");
    assert.match(agents, /compose\.mjs <body\.html>/);
    assert.match(agents, /compose\.mjs --usage core NAME/);
    assert.doesNotMatch(agents, /and only that/);
    assert.doesNotMatch(agents, /copy a template|inline\s+`basalt-html\.css`/);
    assert.ok(fs.existsSync(path.join(skillDir, "..", "..", "..", "tools", "html-skill", "README.md")));
    assert.match(read(skillDir, "..", "..", "..", "tools", "html-skill", "README.md"), /## Add a module/);
    assert.match(read(skillDir, "..", "..", "..", "tools", "html-skill", "README.md"), /src\/usage\/<name>\.md/);
  });
});

describe("budgets", () => {
  test("SKILL.md, the context an agent pays, is no bigger than it was before the rebuild", () => {
    assert.ok(Buffer.byteLength(skill) <= manifest.budgets.skillMd, `SKILL.md is ${Buffer.byteLength(skill)} bytes of ${manifest.budgets.skillMd}`);
  });

  test("the core (CSS and script every page gets) is well under the old 80 KiB", () => {
    const bytes = size("core");
    assert.ok(bytes <= manifest.budgets.core, `core is ${bytes} bytes of ${manifest.budgets.core}`);
    assert.ok(bytes < 40 * 1024, "well under 80 KiB means under half");
  });

  for (const name of modules) {
    test(`the ${name} module stays within its own cap`, () => {
      assert.ok(size(name) <= manifest.modules[name].budget, `${name} is ${size(name)} bytes of ${manifest.modules[name].budget}`);
    });
  }

  // The owner capped each part, not the every-module page (DECISIONS 79): a page carries only the modules its body uses,
  // so the bound on any page is the core's cap plus the caps of the modules it uses. This checks that the every-module
  // page is exactly that sum of parts, so no byte can arrive that a part's own cap doesn't already govern.
  test("a page with every module and every icon (no fonts, no body) is bounded by the sum of the parts' caps", () => {
    const bytes = Buffer.byteLength(compose("", { fonts: false, all: true }).html);
    const caps = manifest.budgets.core + Object.values(manifest.modules).reduce((sum, m) => sum + m.budget, 0);
    const icons = Buffer.byteLength(JSON.stringify(JSON.parse(fs.readFileSync(new URL("../../../.agent/skills/basalt-html/parts/icons.json", import.meta.url), "utf8"))));
    // The core glyphs are a table of drawings a page carries only for the glyphs it names, as it carries icons.
    const glyphs = Buffer.byteLength(JSON.stringify(JSON.parse(fs.readFileSync(new URL("../../../.agent/skills/basalt-html/parts/glyphs.json", import.meta.url), "utf8"))));
    assert.ok(bytes <= caps + icons + glyphs + 4096, `the every-module page is ${bytes} bytes; the parts' caps plus the icons, the glyphs and the page shell allow ${caps + icons + glyphs + 4096}`);
  });

  test("a smaller page is smaller: the static example is below the everything page by what it leaves out", () => {
    const bare = Buffer.byteLength(compose("<h1>x</h1>", { fonts: false }).html);
    const report = Buffer.byteLength(compose(EXAMPLES.static, { fonts: false }).html);
    const everything = Buffer.byteLength(compose("", { fonts: false, all: true }).html);
    assert.ok(bare < report && report < everything, [bare, report, everything].join(" < "));
  });

  test("the detection covers its own manifest: no trigger names a module that does not exist", () => {
    for (const [name, m] of Object.entries(manifest.modules)) for (const need of m.requires ?? []) assert.ok(need in manifest.modules && need !== name, `${name} requires ${need}`);
    assert.deepEqual(detect("", manifest, [], {}).modules, []);
  });
});
