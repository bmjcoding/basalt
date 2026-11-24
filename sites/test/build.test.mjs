// sites/build.mjs: the includes, the failures that name the page and the include, the discovery of pages, and that importing it does nothing.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { buildPage, buildSites, findPages, repoRoot, resolveIncludes, sitesDir } from "../build.mjs";
import { inlinedText } from "./support.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-build-"));
/** A root with the sites given as { "site/page": body, "site/file.css": text }. */
function makeRoot(files) {
  const root = tmp();
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}
const read = (file) => fs.readFileSync(file, "utf8");
const brand = (...parts) => path.join(repoRoot, "brand", ...parts);

describe("the includes", () => {
  test("a page's own CSS and script are inlined from files beside the body", () => {
    const root = makeRoot({
      "a/index.body.html": `<title>A</title>\n<!-- @include page.css -->\n<h1>Hello</h1>\n<!-- @include page.js -->\n`,
      "a/page.css": `.mine { color: var(--basalt-text-primary); }\n`,
      "a/page.js": `window.__mine = 1;\n`,
    });
    const [page] = buildSites({ root, outDir: path.join(root, "out") });
    assert.equal(page.outFile, path.join(root, "out", "a", "index.html"));
    assert.ok(page.html.includes(".mine { color: var(--basalt-text-primary); }"), "the CSS is in the page");
    assert.ok(page.html.includes("window.__mine = 1;"), "the script is in the page");
    assert.equal(read(page.outFile), page.html, "and the page is written");
    assert.match(page.html, /<style>[^<]*\.mine/, "as a style, which compose moves to the head");
  });

  test("a shared stand-in is inlined the same way", () => {
    const root = makeRoot({ "a/index.body.html": `<title>A</title>\n<!-- @include shared/site-header.css -->\n<!-- @include shared/site-header.js -->\n<h1>Hello</h1>\n` });
    const [page] = buildSites({ root, outDir: path.join(root, "out") });
    assert.ok(page.html.includes(read(path.join(sitesDir, "shared", "site-header.css"))), "the stand-in's CSS, whole");
    assert.ok(page.html.includes(read(path.join(sitesDir, "shared", "site-header.js"))), "the stand-in's script, whole");
    assert.deepEqual(page.includes.map((i) => i.name), ["shared/site-header.css", "shared/site-header.js"]);
  });

  test("a brand/ file is inlined byte for byte: an inline SVG, hero.html, the motion script and CSS", () => {
    const names = ["brand/blacksand/mark-32.svg", "brand/blacksand/hero.html", "brand/sra-syndicate/hero.html", "brand/motion/logo-motion.js", "brand/motion/one-bridge.css"];
    const root = makeRoot({ "a/index.body.html": `<title>A</title>\n<h1>Hello</h1>\n${names.map((n) => `<!-- @include ${n} -->`).join("\n")}\n` });
    const [page] = buildSites({ root, outDir: path.join(root, "out") });
    for (const name of names) assert.ok(page.html.includes(inlinedText(name, read(path.join(repoRoot, name)))), `${name} is in the page byte for byte (a brand svg but for its root's three attributes and its title)`);
  });

  test("an image from brand/ is a data: URL, so a built page has no path into the repo", () => {
    const root = makeRoot({ "a/index.body.html": `<title>A</title>\n<h1>Hello</h1>\n<img alt="" src="<!-- @data brand/blacksand/png/favicon-32-on-dark.png -->">\n<img alt="" src="<!-- @data brand/blacksand/mark-32.svg -->">\n` });
    const [page] = buildSites({ root, outDir: path.join(root, "out") });
    const png = fs.readFileSync(brand("blacksand", "png", "favicon-32-on-dark.png")).toString("base64");
    assert.ok(page.html.includes(`src="data:image/png;base64,${png}"`));
    assert.ok(page.html.includes(`src="data:image/svg+xml;base64,${fs.readFileSync(brand("blacksand", "mark-32.svg")).toString("base64")}"`));
    assert.ok(!page.html.includes("brand/"), "no path into the repo");
  });

  test("an include that is missing fails the build, naming the page and the include", () => {
    const root = makeRoot({ "a/index.body.html": `<title>A</title>\n<h1>Hello</h1>\n<!-- @include nothing-here.css -->\n` });
    assert.throws(() => buildSites({ root, outDir: path.join(root, "out") }), (error) => {
      assert.ok(error.message.includes(path.join(root, "a", "index.body.html")), `names the page: ${error.message}`);
      assert.ok(error.message.includes('"nothing-here.css"'), `names the include: ${error.message}`);
      assert.match(error.message, /is missing/);
      return true;
    });
    assert.equal(fs.existsSync(path.join(root, "out")), false, "and writes nothing");
    for (const name of ["shared/not-a-stand-in.css", "brand/not-a-file.svg"]) {
      const bad = makeRoot({ "b/index.body.html": `<title>B</title>\n<!-- @include ${name} -->\n` });
      assert.throws(() => buildSites({ root: bad, outDir: path.join(bad, "out") }), (error) => error.message.includes(path.join(bad, "b", "index.body.html")) && error.message.includes(`"${name}"`) && /is missing/.test(error.message), name);
    }
    const data = makeRoot({ "b/index.body.html": `<title>B</title>\n<img alt="" src="<!-- @data missing.png -->">\n` });
    assert.throws(() => buildSites({ root: data, outDir: path.join(data, "out") }), (error) => error.message.includes('"missing.png"') && /is missing/.test(error.message));
  });

  test("an include may not reach outside its site, be absolute, or be a type it cannot inline", () => {
    const root = makeRoot({ "a/index.body.html": `x`, "a/data.json": `{}`, "secret.css": `.secret {}` });
    const build = (body) => { fs.writeFileSync(path.join(root, "a", "index.body.html"), `<title>A</title>\n${body}\n`); return buildSites({ root, outDir: path.join(root, "out") }); };
    assert.throws(() => build("<!-- @include ../secret.css -->"), /reaches outside its folder/);
    assert.throws(() => build("<!-- @include shared/../../package.json -->"), /reaches outside its folder/);
    assert.throws(() => build(`<!-- @include ${path.join(root, "secret.css")} -->`), /absolute path/);
    assert.throws(() => build("<!-- @include data.json -->"), /inlines \.css, \.js, \.svg and \.html/);
    assert.throws(() => build("<!-- @data data.json -->"), /not an image/);
  });

  test("an include whose path is inside but which links outside is not read (the file it reaches is checked, as a diagram's mark is)", () => {
    const root = makeRoot({ "a/index.body.html": `x`, "secret.css": `.secret {}`, "secret.png": "png" });
    fs.symlinkSync(path.join(root, "secret.css"), path.join(root, "a", "linked.css"));
    fs.symlinkSync(path.join(root, "secret.png"), path.join(root, "a", "linked.png"));
    const build = (body) => { fs.writeFileSync(path.join(root, "a", "index.body.html"), `<title>A</title>\n${body}\n`); return buildSites({ root, outDir: path.join(root, "out") }); };
    assert.throws(() => build("<!-- @include linked.css -->"), /links outside its folder/);
    assert.throws(() => build('<img alt="" src="<!-- @data linked.png -->">'), /links outside its folder/);
  });

  test("a page's result carries the references that leave the file, for the caller to report", () => {
    const root = makeRoot({ "a/index.body.html": `<title>A</title>\n<h1>A</h1>\n<img alt="" src="https://cdn.test/x.png">\n` });
    const page = buildPage(path.join(root, "a", "index.body.html"), { fonts: false });
    assert.deepEqual(page.external, ['<img src="https://cdn.test/x.png">']);
  });
});

describe("pages are found and built per site", () => {
  const root = makeRoot({
    "one/index.body.html": `<title>One</title>\n<h1>One</h1>\n`,
    "one/docs/intro.body.html": `<title>Intro</title>\n<h1>Intro</h1>\n`,
    "two/index.body.html": `<title>Two</title>\n<h1>Two</h1>\n`,
    "shared/ignored.body.html": `<h1>no</h1>`,
    "test/ignored.body.html": `<h1>no</h1>`,
    "dist/one/stale.body.html": `<h1>no</h1>`,
    "one/not-a-page.html": `<h1>no</h1>`,
  });

  test("every SITE/PAGE.body.html, but nothing under shared/, test/ or dist/", () => {
    assert.deepEqual(findPages(root).map((p) => `${p.site}/${p.page}`), ["one/docs/intro", "one/index", "two/index"]);
  });

  test("run with no site it builds every page; with a site's name, that site", () => {
    const out = path.join(root, "out");
    assert.deepEqual(buildSites({ root, outDir: out }).map((p) => path.relative(out, p.outFile)), [path.join("one", "docs", "intro.html"), path.join("one", "index.html"), path.join("two", "index.html")]);
    const only = path.join(root, "only");
    assert.deepEqual(buildSites({ root, site: "two", outDir: only }).map((p) => path.relative(only, p.outFile)), [path.join("two", "index.html")]);
    assert.throws(() => buildSites({ root, site: "three", outDir: only }), /no site "three"/);
  });

  test("a body that is a whole page fails, naming it", () => {
    const bad = makeRoot({ "a/index.body.html": `<!doctype html><html><body><h1>x</h1></body></html>` });
    assert.throws(() => buildSites({ root: bad, outDir: path.join(bad, "out") }), (error) => error.message.includes(path.join(bad, "a", "index.body.html")) && /whole page/.test(error.message));
  });

  test("by default a root's pages go to its dist/ (sites/dist for the real one, which is git-ignored)", () => {
    const fresh = makeRoot({ "a/index.body.html": `<title>A</title>\n<h1>Hello</h1>\n` });
    const [page] = buildSites({ root: fresh });
    assert.equal(page.outFile, path.join(fresh, "dist", "a", "index.html"));
    assert.ok(fs.existsSync(page.outFile));
  });
});

describe("the command", () => {
  const run = (...args) => spawnSync(process.execPath, [path.join(sitesDir, "build.mjs"), ...args], { encoding: "utf8", cwd: repoRoot });

  test("importing it does nothing: no output, no files", () => {
    const before = fs.existsSync(path.join(sitesDir, "dist")) ? fs.readdirSync(path.join(sitesDir, "dist")) : null;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(path.join(sitesDir, "build.mjs"))})`], { encoding: "utf8", cwd: repoRoot });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.deepEqual(fs.existsSync(path.join(sitesDir, "dist")) ? fs.readdirSync(path.join(sitesDir, "dist")) : null, before);
  });

  test("an unknown site and a stray flag are refused", () => {
    const unknown = run("no-such-site");
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /no site "no-such-site"/);
    assert.equal(run("--nope").status, 2);
    assert.equal(run("a", "b").status, 2);
  });

  test("buildPage builds one body file to one page", () => {
    const root = makeRoot({ "a/index.body.html": `<title>A</title>\n<h1>Hello</h1>\n` });
    const page = buildPage(path.join(root, "a", "index.body.html"), { outFile: path.join(root, "out.html") });
    assert.ok(read(path.join(root, "out.html")).startsWith("<!doctype html>"));
    assert.deepEqual(page.includes, []);
  });
});
