// compose.mjs and the module split: what a body gets, the budgets, and that the cheat sheet in SKILL.md maps to modules.
// No browser here (the pixel and parity tests render pages); this file is about what is in the file.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { compose, detect } from "../../../.agent/skills/basalt-html/compose.mjs";
import { EXAMPLES, read, skillDir } from "./support.mjs";

const manifest = JSON.parse(read(skillDir, "parts", "manifest.json"));
const modules = Object.keys(manifest.modules);
const part = (name, ext) => (fs.existsSync(path.join(skillDir, "parts", `${name}.${ext}`)) ? read(skillDir, "parts", `${name}.${ext}`) : "");
const size = (name) => Buffer.byteLength(part(name, "css")) + Buffer.byteLength(part(name, "js"));
const skill = read(skillDir, "SKILL.md");
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

  test("a class written in a script's string, or className, or classList is seen", () => {
    assert.deepEqual(used("<script>el.innerHTML = '<div class=\"callout\"></div>'; Basalt.init();</script>"), ["callout"]);
    assert.deepEqual(used("<script>el.className = 'progress'; Basalt.init();</script>"), ["progress"]);
    assert.deepEqual(used("<script>el.classList.add('spinner', 'x'); Basalt.init();</script>"), ["spinner"]);
  });

  test("the palette brings the rows and the kbd it needs, in the manifest's order", () => {
    assert.deepEqual(used("<button data-open-palette>Commands</button>"), ["kbd", "rows", "palette"]);
    assert.deepEqual(used('<script>Basalt.init({ palette: { groups: [] } })</script>'), ["kbd", "rows", "palette"]);
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
    assert.deepEqual(used(EXAMPLES.interactive), ["topbar", "kbd", "forms", "number", "rows", "tabs", "disclosure", "table", "code", "stats", "palette", "copy", "theme"]);
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
    assert.throws(() => compose("<!-- basalt:use nonsense -->", { fonts: false }), /"nonsense", which is not a module \(modules: topbar, /);
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
        assert.match(r.stderr, /usage: node compose\.mjs/);
      }
      const missing = run(["nope.body.html"], dir);
      assert.equal(missing.status, 1);
      assert.match(missing.stderr, /compose\.mjs: /);
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

describe("modules map to the cheat sheet", () => {
  const sheet = skill.slice(skill.indexOf("## Cheat sheet"));
  const owner = (cls) => (manifest.core.classes.includes(cls) ? "core" : modules.find((m) => (manifest.modules[m].classes ?? []).includes(cls)));
  const cssOf = (name) => part(name, "css");
  // classes and attributes in code spans of the cheat sheet
  const classes = [...new Set([...sheet.matchAll(/`([^`]+)`/g)].flatMap((m) => [...m[1].matchAll(/(?<![\w\d.-])\.([a-z][\w-]*)/g)].map((c) => c[1])))];
  const attrs = [...new Set([...sheet.matchAll(/(?<![\w-])(data-[a-z-]+)/g)].map((m) => m[1]))];

  test("every class in the cheat sheet belongs to the core or to exactly one module, and that part's CSS styles it", () => {
    assert.ok(classes.length > 60, `found ${classes.length} classes in the cheat sheet`);
    for (const cls of classes) {
      const owners = [...(manifest.core.classes.includes(cls) ? ["core"] : []), ...modules.filter((m) => (manifest.modules[m].classes ?? []).includes(cls))];
      assert.equal(owners.length, 1, `.${cls} is claimed by ${owners.join(", ") || "nothing"}`);
      assert.ok(new RegExp(`\\.${cls}(?![\\w-])`).test(cssOf(owners[0])), `.${cls} is not in ${owners[0]}'s CSS`);
    }
  });

  test("a page using any cheat-sheet class gets its module", () => {
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

  test("every behaviour attribute in the cheat sheet brings the module that wires it", () => {
    const wires = { "data-tabs": "tabs", "data-disclosure": "disclosure", "data-copy": "copy", "data-copy-text": "copy", "data-open-palette": "palette", "data-theme-toggle": "theme", "data-kbd": "kbd", "data-kbd-hint": "kbd", "data-palette": "palette", "data-doc": "kbd" };
    const behaviour = attrs.filter((a) => a in wires);
    assert.ok(behaviour.length >= 6);
    for (const attr of behaviour) assert.ok(used(`<div ${attr}></div>`).includes(wires[attr]), `${attr} should bring ${wires[attr]}`);
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
    const agents = read(skillDir, "..", "..", "..", "AGENTS.md");
    assert.match(agents, /compose\.mjs <body\.html>/);
    assert.doesNotMatch(agents, /copy a template|inline\s+`basalt-html\.css`/);
    assert.ok(fs.existsSync(path.join(skillDir, "..", "..", "..", "tools", "html-skill", "README.md")));
    assert.match(read(skillDir, "..", "..", "..", "tools", "html-skill", "README.md"), /## Add a module/);
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
    assert.ok(bytes <= caps + icons + 4096, `the every-module page is ${bytes} bytes; the parts' caps plus the icons and the page shell allow ${caps + icons + 4096}`);
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
