// audit-fix-c8 (engineering), the HTML skill's half: a chart that cannot be drawn leaves the charts after it alone (A5-19); compose.mjs keeps a style's `media`
// (A5-21), reads the title from a heading with a bare `<`, an empty `<title>` or an image alone (A5-22), warns of a reference that leaves the file (A5-24) and runs
// when started through a symlink (A5-23). Each test fails on the commit before the fix. Synthetic data only.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml, skillDir } from "./support.mjs";

const page = (body, options) => compose(body, { fonts: false, ...options });
const titleOf = (html) => html.match(/<title>([\s\S]*?)<\/title>/)[1];
const head = (html) => html.slice(0, html.indexOf("</head>"));

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("A5-19: one chart that throws while drawing leaves the charts after it", () => {
  const figure = (id, extra = "") => `<figure class="chart" id="${id}"><script type="application/json" data-chart>{"title":"Training","kind":"bar","summary":"S","days":["2026-11-08","2026-11-09"],${extra}"series":[{"id":"a","name":"A","values":[1,2]}]}</script></figure>`;
  const body = `<h1>Charts</h1>${figure("before")}${figure("bad", '"locale":"en_GB",')}${figure("after")}<div id="spark" class="sparkline"><script type="application/json" data-sparkline>{"label":"Req","data":[1,2,3]}</script></div>`;

  test("the charts before and after an invalid locale are drawn, the failed one is an empty figure, and the console says why", async () => {
    const { page: p, context, errors } = await openHtml(browser, page(body).html);
    const drawn = await p.evaluate(() => Object.fromEntries(["before", "bad", "after"].map((id) => [id, Boolean(document.getElementById(id).querySelector("svg"))])));
    assert.deepEqual(drawn, { before: true, bad: false, after: true }, "the chart after the bad one was not drawn");
    assert.equal(await p.evaluate(() => Boolean(document.querySelector("#spark svg"))), true, "a part wired after the charts was not wired");
    assert.ok(errors.some((line) => /chart not drawn: .*en_GB/.test(line)), `no warning names the failed chart: ${errors.join(" | ")}`);
    assert.ok(!errors.some((line) => /wireCharts failed/.test(line)), "the whole step failed");
    await context.close();
  });
});

describe("A5-21: a style keeps its media and no other attribute is dropped without a word", () => {
  test("a print-only and a dark-only style stay so in the head", () => {
    assert.match(head(page('<style media="print">body { display: none; }</style><h1>Report</h1>').html), /<style media="print">body \{ display: none; \}<\/style>/);
    assert.match(head(page('<style media="(prefers-color-scheme: dark)">.x { color: red; }</style><h1>Report</h1>').html), /<style media="\(prefers-color-scheme: dark\)">\.x/);
    assert.match(head(page("<style>.x { color: red; }</style><h1>Report</h1>").html), /<style>\.x \{ color: red; \}<\/style>/, "a style with no media is written as it was");
  });
  test("a media with a quote in it is written so the quote stays inside the attribute", () => {
    assert.match(head(page("<style media='screen and (min-width: 1px) /* \" */'>.x { color: red; }</style><h1>Report</h1>").html), /<style media="screen and \(min-width: 1px\) \/\* &quot; \*\/">/);
  });
  for (const attribute of ['nonce="abc"', 'type="text/css"', "blocking", 'title="x"', 'media="print" id="mine"']) test(`a style with \`${attribute}\` is refused by the attribute's name`, () => {
    const name = attribute.replace(/media="print" /, "").split("=")[0];
    assert.throws(() => page(`<style ${attribute}>.x { color: red; }</style>`), new RegExp(`\`<style ${name}>\` is not accepted`));
  });
});

describe("A5-22: the page's title", () => {
  test("a heading with a bare < says its text once", () => {
    assert.equal(titleOf(page("<h1>Latency < 200 ms</h1>").html), "Latency < 200 ms");
    assert.equal(titleOf(page("<h1>a < b and c > d</h1>").html), "a < b and c > d");
    assert.equal(titleOf(page("<h1>1 < 2 < 3 <em>and</em> 4 <5</h1>").html), "1 < 2 < 3 and 4 <5");
  });
  test("an empty <title> names nothing, so the heading does", () => {
    assert.equal(titleOf(page("<title></title><h1>Report</h1>").html), "Report");
    assert.equal(titleOf(page("<title>  </title><h1>Report</h1>").html), "Report");
    assert.equal(titleOf(page("<title>Mine</title><h1>Report</h1>").html), "Mine");
    assert.equal(titleOf(page("<title></title><p>No heading</p>").html), "Untitled page");
  });
  test("a heading that is an image alone is named by the image's alt", () => {
    assert.equal(titleOf(page('<h1><img alt="Blacksand" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></h1>').html), "Blacksand");
    assert.equal(titleOf(page('<h1>Home <img alt="Blacksand" src="data:,"> page</h1>').html), "Home Blacksand page");
    assert.equal(titleOf(page('<h1><img src="data:,"></h1>').html), "Untitled page");
  });
});

describe("A5-24: a reference that leaves the file is warned of, after the page", () => {
  const external = (body) => page(body).external;
  test("a script, an image, a frame, an object, a base, a stylesheet url() and an @import are each listed", () => {
    assert.deepEqual(external('<h1>x</h1><script src="https://cdn.test/x.js"></script>'), ['<script src="https://cdn.test/x.js">']);
    assert.deepEqual(external('<h1>x</h1><img alt="" src="https://cdn.test/x.png">'), ['<img src="https://cdn.test/x.png">']);
    assert.deepEqual(external('<h1>x</h1><iframe src="https://cdn.test/"></iframe>'), ['<iframe src="https://cdn.test/">']);
    assert.deepEqual(external('<h1>x</h1><object data="https://cdn.test/x.swf"></object>'), ['<object data="https://cdn.test/x.swf">']);
    assert.deepEqual(external('<h1>x</h1><base href="https://cdn.test/">'), ['<base href="https://cdn.test/">']);
    assert.deepEqual(external('<h1>x</h1><style>.a { background: url(https://cdn.test/a.png); } @import "https://cdn.test/b.css"; .b { background: url("data:image/png;base64,AA=="); }</style>'), ["<style> url(https://cdn.test/a.png)", "<style> url(https://cdn.test/b.css)"]);
    assert.deepEqual(external('<h1>x</h1><p style="background: url(\'https://cdn.test/c.png\')">y</p>'), ["<p style> url(https://cdn.test/c.png)"]);
    assert.deepEqual(external('<h1>x</h1><img alt="" srcset="https://cdn.test/a.png 1x, https://cdn.test/b.png 2x">'), ['<img srcset="https://cdn.test/a.png">', '<img srcset="https://cdn.test/b.png">']);
    assert.deepEqual(external('<h1>x</h1><svg viewBox="0 0 1 1"><image href="https://cdn.test/x.png"/></svg>'), ['<image href="https://cdn.test/x.png">']);
  });
  test("a link is listed as a link, and what stays in the file is not listed", () => {
    assert.deepEqual(external('<h1>x</h1><a href="https://example.test/">out</a>'), ['<a href="https://example.test/"> (a link)']);
    assert.deepEqual(external('<h1>x</h1><a href="#top">in</a><a href="mailto:a@example.test">mail</a><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><link rel="canonical" href="https://example.test/"><svg viewBox="0 0 1 1"><use href="#a"/></svg><style>.a { background: url(#frag); mask: url("data:image/svg+xml,%3Csvg/%3E"); }</style>'), []);
    assert.deepEqual(external("<h1>x</h1><script>const a = '<img src=\"https://cdn.test/x.png\">';</script><!-- <img src=\"https://cdn.test/y.png\"> -->"), [], "a script's text and a comment are not markup");
  });
  test("the command line prints one warning, after the page's own line, and exits 0", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-c8-"));
    try {
      const input = path.join(dir, "p.body.html");
      fs.writeFileSync(input, '<h1>x</h1><script src="https://cdn.test/x.js"></script><img alt="" src="https://cdn.test/x.png">');
      const run = spawnSync(process.execPath, [path.join(skillDir, "compose.mjs"), input, "--no-fonts"], { encoding: "utf8" });
      assert.equal(run.status, 0, run.stderr);
      const lines = run.stdout.split("\n");
      assert.match(lines[0], /p\.html: .* KB, core/);
      const at = lines.findIndex((line) => /^Warning: 2 references leave the file/.test(line));
      assert.ok(at > 0, run.stdout);
      assert.deepEqual(lines.slice(at + 1, at + 3).sort(), ['  <img src="https://cdn.test/x.png">', '  <script src="https://cdn.test/x.js">']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  test("the shipped examples are clean", () => {
    for (const name of ["static", "interactive"]) assert.deepEqual(compose(fs.readFileSync(path.join(skillDir, "examples", `${name}.body.html`), "utf8"), { fonts: false }).external, [], name);
  });
});

describe("A5-23: compose.mjs runs when started through a symlink", () => {
  test("a page is written, and --usage prints, by a path that goes through a link", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-c8-"));
    try {
      const link = path.join(dir, "skill");
      fs.symlinkSync(skillDir, link);
      const input = path.join(dir, "p.body.html");
      fs.writeFileSync(input, "<h1>Linked</h1>");
      const run = spawnSync(process.execPath, [path.join(link, "compose.mjs"), input, "--out", path.join(dir, "p.html"), "--no-fonts"], { encoding: "utf8" });
      assert.equal(run.status, 0, run.stderr);
      assert.match(fs.readFileSync(path.join(dir, "p.html"), "utf8"), /<title>Linked<\/title>/);
      const usage = spawnSync(process.execPath, [path.join(link, "compose.mjs"), "--usage", "core"], { encoding: "utf8" });
      assert.ok(usage.stdout.length > 100, "--usage printed nothing");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
