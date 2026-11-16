// The fourth audit fix batch's HTML-skill half (stream components-nov14): compose.mjs on the bodies it got wrong (A5-03, A5-09), the head a body can carry
// (A5-07), both Geist faces retained on every page, the notification list's escaped status and every module's hostile fields (A5-10), the toast's F6
// route (A3-09), the labelled profile list (A3-13), a Tab into the top bar not scrolling the page (row 11), the stage's art after its content (A1-09) and what a
// composed page needs from a Content-Security-Policy (A5-17). Each test fails on the commit before the fix. The React half is
// packages/react/test/audit-fixes-c2.test.mjs. Synthetic data only.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import http from "node:http";
import zlib from "node:zlib";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose, headTag, readBody } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, freezeAnimations, launch as launchReact, settle } from "../../../packages/react/test/support.mjs";
import { hostileBody } from "./support-hostile.mjs";
import { C2_ACCEPTED, C2_REFUSALS } from "./support-c2-cases.mjs";
import { EXAMPLES, here, launch, openHtml, read, skillDir } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const fixture = (name) => fs.readFileSync(path.join(here, "fixtures", name), "utf8");
const bad = (name) => fs.readFileSync(path.join(here, "fixtures", "compose-bad", `${name}.body.html`), "utf8");
const page = (body, options) => compose(body, { fonts: false, ...options });
const titleOf = (html) => html.match(/<title>([\s\S]*?)<\/title>/)[1];
const head = (html) => html.slice(0, html.indexOf("</head>"));
const bodyOf = (html) => html.slice(html.indexOf("<body>"));
const frames = (p, n = 3) => p.evaluate((count) => new Promise((resolve) => { let left = count; const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick)); requestAnimationFrame(tick); }), n);

// ---- A5-03 and A5-09: compose.mjs on the audit's 15 bodies ----

describe("compose.mjs on bodies it used to get wrong (A5-03, A5-09)", () => {
  for (const [name, body, message] of C2_REFUSALS.slice(0, 8)) test(`Sol build: ${name} has an explicit refusal`, () => {
    assert.throws(() => page(body), message);
  });
  test("Sol build: init in strings, templates and regular expressions does not suppress the suffix", () => {
    for (const body of C2_ACCEPTED.slice(0, 4)) assert.match(page(body).html, /<script>Basalt\.init\(\);<\/script>\n<\/body>/, body);
  });
  test("an inline svg's title names the picture, not the page; the page's title is the h1 (A5-03)", () => {
    const { html } = page(bad("svg-title"));
    assert.equal(titleOf(html), "Quarterly report");
    assert.ok(bodyOf(html).includes('<svg role="img" viewBox="0 0 10 10"><title>Sales by month</title><rect width="10" height="10"/></svg>'), "the picture keeps its name");
    assert.equal((html.match(/<title/g) ?? []).length, 2, "the page's and the picture's, and no other");
  });

  test("a page title with an attribute is the page's title and leaves the body (A5-03)", () => {
    const { html } = page(bad("title-attr"));
    assert.equal(titleOf(html), "Named");
    assert.equal((html.match(/<title/g) ?? []).length, 1, "no second title in the body");
  });

  test("a style inside an svg or a template stays where it is, and one on the page still moves to the head (A5-03)", () => {
    for (const name of ["style-in-svg", "template"]) {
      const { html } = page(bad(name));
      const rule = name === "template" ? ".t{color:red}" : ".a{fill:red}";
      assert.ok(!head(html).includes(rule), `${name}: the rule is not in the head`);
      assert.ok(bodyOf(html).includes(rule), `${name}: the rule stays in the body, inside its element`);
    }
    const mixed = page('<h1>x</h1><style>.mine{color:blue}</style><svg><style>.in{fill:red}</style></svg>').html;
    assert.ok(head(mixed).includes(".mine{color:blue}") && !head(mixed).includes(".in{fill:red}"));
  });

  test("an opener that is never closed is refused with a plain message, not written into a broken page (A5-09)", () => {
    assert.throws(() => page(bad("unclosed-script")), /`<script>` is never closed/);
    assert.throws(() => page(bad("unclosed-style")), /`<style>` is never closed/);
    assert.throws(() => page(bad("unclosed-comment")), /comment is never closed/);
    assert.throws(() => page("<h1>x</h1><svg><rect/>"), /`<svg>` is never closed/);
    assert.throws(() => page("<h1>x</h1><template><p>x</p>"), /`<template>` is never closed/);
  });

  test("the body is read as HTML is: text that looks like an opener inside an attribute, a title or a textarea is not an element (Sol's three bodies)", () => {
    const a = page('<h1>Report</h1><p data-example="<script>">Text</p>').html;
    assert.ok(bodyOf(a).includes('<p data-example="<script>">Text</p>'));
    assert.equal(titleOf(page("<title>Using <svg> in HTML</title><h1>Guide</h1>").html), "Using <svg> in HTML", "a page title's text is text");
    assert.ok(bodyOf(page("<h1>Guide</h1><textarea><script></textarea>").html).includes("<textarea><script></textarea>"));
    assert.equal(titleOf(page('<h1>Guide</h1><p data-x=\'<style>\' title="<!--">after</p>').html), "Guide");
    assert.ok(bodyOf(page('<h1>x</h1><p data-x="a > b <svg">y</p>').html).includes('data-x="a > b <svg">y</p>'), "a > in a quoted value does not end the tag");
    assert.doesNotThrow(() => page("<h1>x</h1><xmp><script></xmp><iframe><style></iframe><noembed><!--</noembed>"));
  });

  test("what is inside an svg, a template or a foreign element is read with the same rules at every depth (Sol's nested bodies)", () => {
    const tpl = page('<h1>Guide</h1><template><script>const example="</template>";</script><style>.inside{color:red}</style><title>Inside</title></template>').html;
    assert.equal(titleOf(tpl), "Guide", "the title inside the template is the template's");
    assert.ok(!head(tpl).includes(".inside{color:red}") && bodyOf(tpl).includes(".inside{color:red}"), "so is the style");
    const cdata = page("<h1>Guide</h1><svg><![CDATA[</svg><style>.inside{fill:red}</style>]]></svg>").html;
    assert.ok(!head(cdata).includes(".inside{fill:red}") && bodyOf(cdata).includes(".inside{fill:red}"), "a CDATA section's text is text");
    assert.throws(() => page("<h1>Guide</h1><template><script>const x=1;</template><p>After</p>"), /`<script>` is never closed/, "an unclosed script inside a template is found");
    assert.throws(() => page("<h1>x</h1><svg><![CDATA[ never"), /CDATA section is never closed/);
    assert.throws(() => page("<h1>x</h1><template><!-- never</template>"), /comment is never closed/);
    assert.throws(() => page("<h1>x</h1><template><template><p>x</p></template>"), /`<template>` is never closed/, "nested templates are counted");
    assert.doesNotThrow(() => page("<h1>x</h1><template><template><p>x</p></template><svg><rect/></svg></template>"));
    const fo = page('<h1>x</h1><svg><foreignObject><script>var a = "</svg>";</script><style>.in{color:red}</style></foreignObject></svg><style>.out{color:blue}</style>').html;
    assert.ok(head(fo).includes(".out{color:blue}") && !head(fo).includes(".in{color:red}"), "an html integration point reads its children as html: a script there is raw text");
    assert.ok(bodyOf(page('<h1>x</h1><script type="text/template"><svg><style>.t{}</style><title>T</title></script>').html).includes("<svg><style>.t{}</style><title>T</title>"), "a script of another type is still raw text");
    const style = page('<h1>x</h1><style data-label="a>b">p{color:red}</style>').html;
    assert.ok(head(style).includes("<style>p{color:red}</style>"), "a style's opening tag is read whole when an attribute holds a >");
  });

  test("an HTML integration point in MathML (annotation-xml with encoding text/html or application/xhtml+xml) holds HTML: a script in it is raw text, and a style in it stays", () => {
    assert.throws(() => page('<h1>Before</h1><math><annotation-xml encoding="text/html"><script>const x=1;</annotation-xml></math>'), /`<script>` is never closed/, "an unclosed script there swallows the page");
    const closed = page('<h1>Before</h1><math><annotation-xml encoding="text/html"><script type="text/plain">"</math>"</script><style>.inside{color:red}</style></annotation-xml></math><style>.out{color:blue}</style>').html;
    assert.ok(!head(closed).includes(".inside{color:red}") && head(closed).includes(".out{color:blue}"), "the style in it is not hoisted");
    assert.throws(() => page('<h1>x</h1><math><annotation-xml encoding="APPLICATION/XHTML+XML"><script>x</annotation-xml></math>'), /never closed/, "the encoding is read without regard to case");
    assert.doesNotThrow(() => page('<h1>x</h1><math><annotation-xml encoding="application/x-tex"><script>x</annotation-xml></math>'), "another encoding is MathML, where a script is an element");
    assert.doesNotThrow(() => page("<h1>x</h1><math><annotation-xml><script>x</annotation-xml></math>"));
    assert.throws(() => page("<h1>x</h1><math><mi><script>x</mi></math>"), /never closed/, "a MathML text integration point reads HTML too");
  });

  test("a body that the end of the text cuts off, or that makes the rest of the page text, is refused, because the page's own closing tags and script would be swallowed (A5-09)", () => {
    for (const [body, message] of [['<h1>Before</h1><p title="never', /cut off by the end of the body/], ["<h1>Before</h1><script>window.__x=1</script ", /cut off by the end of the body/], ["<h1>Before</h1><p", /cut off/], ["<h1>Before</h1><!x", /cut off/], ["<h1>Before</h1></", /cut off/],
      ["<h1>Before</h1><plaintext>text", /`<plaintext>` is refused/], ["<h1>x</h1><noscript><p>x", /`<noscript>` is never closed/], ["<h1>x</h1><svg><![CDATA[x", /CDATA/]]) assert.throws(() => page(body), message, body);
    // HTML's white space is tab, line feed, form feed, carriage return and space: a no-break space does not end a tag name.
    assert.throws(() => page("<h1>x</h1><script>var a = 1;</script\u00a0>"), /`<script>` is never closed/);
    assert.throws(() => page("<h1>x</h1><style>.a{}</style\u00a0><p>x</p>"), /`<style>` is never closed/);
    assert.throws(() => page("<h1>x</h1><textarea>x</textarea\u00a0>"), /`<textarea>` is never closed/);
    assert.doesNotThrow(() => page("<h1>x</h1><script>var a = 1;</script\t><style>.a{}</style\f><textarea>x</textarea\r\n>"));
    assert.doesNotThrow(() => headTag('<meta\tname="description"\ncontent="x">'), "a head tag's attributes are split at HTML's white space");
    assert.throws(() => headTag('<meta name="description"\u00a0content="x">'), /not accepted/, "and not at a no-break space");
  });

  test("a noscript is read as text, as a browser that runs scripts reads it: a style in it is not hoisted, and an svg in it is not an unclosed svg", () => {
    const hidden = page("<noscript><style>body{display:none}</style></noscript><h1 id=\"after\">After</h1>").html;
    assert.ok(!head(hidden).includes("body{display:none}") && bodyOf(hidden).includes("<noscript><style>body{display:none}</style></noscript>"));
    assert.ok(bodyOf(page("<noscript><svg></noscript><h1>After</h1>").html).includes("<noscript><svg></noscript>"));
    assert.equal(titleOf(page("<noscript><title>In</title></noscript><h1>After</h1>").html), "After");
  });

  test("the tokenizer looks at the top frame first: nesting costs one visit for each closing tag, not the depth", () => {
    const nested = "<svg>".repeat(2000) + "</svg>".repeat(2000);
    const flat = "<svg></svg>".repeat(2000);
    const a = {};
    const b = {};
    readBody(nested, a);
    readBody(flat, b);
    assert.ok(a.frameVisits <= 2 * 2000, `nested: ${a.frameVisits} frame visits for 2000 closing tags`);
    assert.ok(b.frameVisits <= 2 * 2000, `side by side: ${b.frameVisits}`);
    const c = {};
    readBody("<template>" + "<svg><g>".repeat(500) + "</g></svg>".repeat(500) + "</template>", c);
    assert.ok(c.frameVisits <= 4 * 1000, `mixed: ${c.frameVisits}`);
  });

  test("what compose.mjs will not model it refuses, and the message names the element and says what to write", () => {
    for (const [body, message] of [
      ["<h1>Before</h1><svg><p><script>const x=1;</svg>", /`<p>` inside `<svg>`.*HTML inside svg must be inside foreignObject/], ["<h1>x</h1><math><p>x</p></math>", /`<p>` inside `<math>`.*annotation-xml/], ["<h1>x</h1><svg><div>x</div></svg>", /`<div>` inside `<svg>`/],
      ['<h1>x</h1><svg><font color="red">x</font></svg>', /`<font>` inside `<svg>`/], ["<h1>x</h1><svg><g><span>x</span></g></svg>", /`<span>` inside `<svg>`/], ["<h1>x</h1><svg></p></svg>", /`<p>` inside `<svg>`/], ["<h1>x</h1><svg></br></svg>", /`<br>` inside `<svg>`/],
      ['<h1>Before</h1><math><annotation-xml encoding="text&#x2f;html"><script>const x=1;</annotation-xml></math>', /`<annotation-xml>`.*write the encoding literally/], ['<h1>x</h1><math><annotation-xml encoding="a&b">x</annotation-xml></math>', /`<annotation-xml>`.*write the encoding literally/],
      ["<h1>Before</h1><math><mi><mglyph><style></math><script type=text/plain></style></mglyph></mi></math>", /`<mglyph>` inside `<mi>`/], ["<h1>x</h1><math><mi><mglyph><![CDATA[2 > 1; <script>]]></mglyph></mi></math>", /`<mglyph>` inside `<mi>`/], ["<h1>x</h1><math><mtext><malignmark></malignmark></mtext></math>", /`<malignmark>` inside `<mtext>`/],
    ]) assert.throws(() => page(body), message, body);
    // and what is HTML where a browser reads HTML is accepted
    for (const body of ["<h1>x</h1><svg><foreignObject><p>x</p><div>y</div></foreignObject></svg>", "<h1>x</h1><svg><title>t <b>b</b></title><desc><p>d</p></desc></svg>", '<h1>x</h1><math><annotation-xml encoding="text/html"><p>x</p><div>y</div></annotation-xml></math>', "<h1>x</h1><math><mi><b>x</b></mi></math>", "<h1>x</h1><svg><font>x</font><a><text>t</text></a></svg>", "<h1>x</h1><svg><g><rect/><circle/></g><style>.a{}</style></svg>"]) assert.doesNotThrow(() => page(body), body);
  });

  test("the page's init is called when the page's own executable script calls it, and only then: prose, an attribute and a script of another type that mention it do not", () => {
    const own = (body) => /<script>Basalt\.init\(\);<\/script>\n<\/body>/.test(page(body).html);
    assert.equal(own("<h1>How to call Basalt.init()</h1>"), true);
    assert.equal(own('<p title="Basalt.init()">Text</p>'), true);
    assert.equal(own('<script type="text/plain">Basalt.init()</script>'), true);
    assert.equal(own('<script type="application/json">{"a": "Basalt.init()"}</script>'), true);
    assert.equal(own("<!-- Basalt.init() --><p>x</p>"), true);
    assert.equal(own('<script>// Basalt.init()\nvar a = 1;</script>'), true, "a comment in the script is not a call");
    assert.equal(own("<script>Basalt.init();</script><p>after</p>"), false);
    assert.equal(own('<script type="module">Basalt.init({});</script><p>after</p>'), false);
    assert.equal(own('<script type="text/javascript">Basalt . init (  )</script><p>after</p>'), false);
  });

  test("the title, the modules a body brings in and the head tags come from the tokens, never from a pattern over the text", () => {
    assert.equal(titleOf(page("<!-- <h1>No</h1> --><h1>Yes</h1>").html), "Yes");
    assert.equal(titleOf(page('<script>var a = "<h1>No</h1>";</script><template><h1>No</h1></template><svg><title>No</title></svg><h1>Yes</h1>').html), "Yes");
    assert.equal(titleOf(page('<h1 data-x="a>b">T <em>em</em> <!-- c --> end</h1>').html), "T em  end");
    assert.equal(titleOf(page("<h1>Never closed").html), "Untitled page");
    const used = (body) => compose(body, { fonts: false }).modules;
    assert.deepEqual(used('<p data-x="<!--" class="callout">x</p><!-- end -->'), ["callout"], "an attribute that holds a comment opener hides nothing after it");
    assert.deepEqual(used("<template><!-- <table></table> --><p>x</p></template>"), [], "a word in a comment in a template brings nothing in");
    assert.deepEqual(used("<svg><!-- class=\"callout\" --></svg><p>x</p>"), []);
    assert.deepEqual(used('<script>// <table>\nvar a = 1;</script><div class="callout">x</div>'), ["callout"]);
    assert.ok(head(page('<h1>x</h1><meta name="description" content="a>b">').html).includes('<meta name="description" content="a>b">'), "a head tag's attributes are the tokenizer's");
  });

  test("a comment in a script string, uppercase tags and a byte-order mark", () => {
    assert.doesNotThrow(() => page('<h1>x</h1><script>var s = "<!-- not a comment"; var t = "--> neither";</script><p>after</p>'));
    assert.equal(titleOf(page("<TITLE>Loud</TITLE><H1>x</H1><STYLE>.a{}</STYLE><SVG><TITLE>t</TITLE></SVG>").html), "Loud");
    assert.ok(head(page("<TITLE>Loud</TITLE><STYLE>.a{}</STYLE>").html).includes(".a{}"));
    assert.equal(titleOf(page("\uFEFF<h1>Report</h1>").html), "Report");
    assert.doesNotThrow(() => page('<h1>x</h1><script>var a = "<!--<script>"; var b = "</script>";</script>'), "the double-escaped state keeps its script open");
    assert.throws(() => page('<h1>x</h1><script><!--<script>var b = 1;</script>'), /`<script>` is never closed/, "and it is what a browser does");
  });

  test("a script or comment that holds the text of an html tag is not a whole page (A5-09)", () => {
    const { html } = page(bad("js-string-html"));
    assert.ok(bodyOf(html).includes('<script>const t = "<html>";</script>'));
    assert.doesNotThrow(() => page("<h1>x</h1><!-- <html><body> --><script>var d = '<!doctype html>';</script>"));
    assert.throws(() => page(bad("pre-doc")), /whole page/, "a real doctype in the text is still a whole page");
    assert.doesNotThrow(() => page('<h1>How to</h1><pre><code>&lt;!doctype html&gt;</code></pre>'), "written as text, it is only text");
    assert.throws(() => page("<!doctype html><html><body><h1>x</h1></body></html>"), /whole page/);
  });

  test("a body that holds the bytes compose marks its places with comes through as written (A5-09)", () => {
    const { html } = page(bad("nul"));
    assert.ok(bodyOf(html).includes("<h1>A</h1><p>\u00000\u0000 x</p><!-- c -->"), "the NUL, the digit and the NUL are the author's");
    const marked = page("<h1>A</h1><p>0 x</p><!-- c --><style>.a{}</style>");
    assert.ok(bodyOf(marked.html).includes("<p>0 x</p><!-- c -->"));
  });

  test("the bodies that were always fine compose as they did", () => {
    assert.equal(titleOf(page(bad("close-early")).html), "Close");
    assert.equal(titleOf(page(bad("empty")).html), "Untitled page");
    assert.equal(titleOf(page(bad("h1-entity")).html), 'Tom &amp; "Jerry" 2');
    assert.ok(bodyOf(page(bad("script-close-in-string")).html).includes('<script>var s = "</scr"+"ipt>"; var c = "<!--";</script><p>after</p>'));
    assert.equal(titleOf(page(bad("title-close")).html), "a");
  });

  test("an ordinary body is composed as the old regular expressions read it: the body is kept whole but for its title and its styles (the two examples and the kitchen sink)", () => {
    for (const body of [EXAMPLES.static, EXAMPLES.interactive, fixture("kitchen-sink.body.html"), fixture("tables.body.html"), fixture("art.body.html")]) {
      const { html } = page(body);
      // The old reading, which is right for a body with no svg title, no template and no attribute on its title.
      const expected = body.replace(/<!--\s*basalt:use\s+[\s\S]*?-->/g, "").replace(/<title>[\s\S]*?<\/title>\s*/i, "").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>\s*/gi, "").replace(/^\s+/, "").trimEnd();
      const inner = bodyOf(html).replace(/^<body>\n/, "");
      assert.ok(inner.startsWith(expected), "the body in the page is the body, whole");
    }
  });
});

// ---- A5-07: the head a body can carry ----

describe("a body can carry its page's description, icon and share card (A5-07)", () => {
  const TAGS = `<meta name="description" content="A synthetic page.">
<meta property="og:title" content="Synthetic">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'/>" type="image/svg+xml">
<link rel="apple-touch-icon" href="data:image/png;base64,AAAA">
<link rel="canonical" href="https://example.test/page">`;

  test("meta and link tags in the body are lifted into the head, in order after the title, and leave the body", () => {
    const { html } = page(`<title>Synthetic</title>\n${TAGS}\n<h1>Synthetic</h1>`);
    const h = head(html);
    const at = (s) => h.indexOf(s);
    for (const piece of ['<meta name="description" content="A synthetic page.">', '<meta property="og:title" content="Synthetic">', '<meta name="twitter:card" content="summary">', '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1 1\'/>" type="image/svg+xml">', '<link rel="apple-touch-icon" href="data:image/png;base64,AAAA">', '<link rel="canonical" href="https://example.test/page">']) assert.ok(at(piece) > at("<title>"), piece);
    assert.ok(at("name=\"description\"") < at("og:title") && at("og:title") < at("twitter:card") && at("twitter:card") < at('rel="icon"'), "in the order written");
    assert.ok(at('<meta name="color-scheme"') < at("<title>") && at("canonical") < at("<script>"), "after compose's own tags and the title, before its scripts");
    assert.equal(bodyOf(html).includes("<meta") || bodyOf(html).includes("<link"), false, "and not in the body");
    assert.equal(bodyOf(html).replace(/<script>Basalt\.init\(\);<\/script>\s*<\/body>\s*<\/html>\s*$/, "").trim(), "<body>\n<h1>Synthetic</h1>");
  });

  test("a page with none of them gets the head it got before", () => {
    assert.equal(head(page("<h1>x</h1>").html).includes('name="description"'), false);
  });

  test("every other meta and link is refused with the list of what a body may carry, and a meta or link inside an svg or a template is left alone", () => {
    for (const tag of ['<meta name="viewport" content="width=500">', '<meta charset="latin1">', '<meta http-equiv="refresh" content="0;url=https://example.test">', '<meta name="description">', '<meta name="description" property="og:title" content="x">', '<meta name="robots" content="noindex">', '<link rel="stylesheet" href="https://example.test/a.css">', '<link rel="preload" href="x" as="font">', '<link rel="icon" href="favicon.ico">', '<link rel="icon" href="data:image/png;base64,AAAA" onload="x()">', '<link href="x">']) {
      assert.throws(() => page(`<h1>x</h1>${tag}`), (e) => /may carry <meta name="description"/.test(e.message) && e.message.startsWith(tag.slice(0, 20)), tag);
    }
    assert.doesNotThrow(() => page('<h1>x</h1><svg><link rel="stylesheet" href="x"/></svg><template><meta name="viewport" content="x"></template><!-- <meta name="viewport"> -->'));
    assert.equal(headTag('<meta property="og:image" content="https://example.test/card.png">').includes("og:image"), true);
  });
});

// ---- A1-06 is out of this batch: the composer inlines both Geist faces on every page, as it did ----

describe("both Geist faces are inlined on every page, as on origin/main (A1-06 is not in this batch)", () => {
  const faces = (html) => (head(html).match(/@font-face/g) ?? []).length;
  test("a page with no mono type, one with code, one with a script, and --no-fonts", () => {
    for (const body of ["<h1>x</h1>", "<h1>x</h1><p>Run <code>npm test</code>.</p>", "<h1>x</h1><script>document.title = 'x';</script>", fixture("art.body.html"), fixture("tables.body.html")]) {
      const html = compose(body).html;
      assert.equal(faces(html), 2, "the sans and the mono face");
      assert.ok(html.includes(read(skillDir, "parts", "geist.css").trim()), "geist.css as it is, whole");
    }
    assert.equal(faces(compose("<code>x</code>", { fonts: false }).html), 0);
  });
});

// ---- A5-10: a hostile value in any field of any script-built module ----

describe("no field a module writes into markup can run script (A5-10)", () => {
  test("the notification list escapes its status into the attribute it writes it to", async () => {
    const { page: p, context } = await openHtml(browser, compose(`<title>n</title><span id="bell"></span><script>Basalt.init(); window.__x = function () { window.hit = true; };
      Basalt.notifications('#bell', { entries: [{ id: 'a', title: 'A', time: 'now', status: 'success" onfocus="__x()" x="' }, { id: 'b', title: 'B', time: 'now', status: '"><img src=x onerror=__x()>' }] });</script>`, { fonts: false }).html);
    await p.locator("#bell button").first().click();
    await frames(p);
    assert.equal(await p.evaluate(() => document.querySelectorAll('img[src="x"]').length), 0, "no element came out of the status");
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll(".notification")].map((n) => [n.getAttribute("data-status"), n.attributes.length])), [['success" onfocus="__x()" x="', 4], ['"><img src=x onerror=__x()>', 4]].map(([s, n]) => [s, n]), "the whole value is the attribute's, and the row has no extra attribute");
    assert.equal(await p.evaluate(() => window.hit ?? false), false);
    await context.close();
  });

  test("65 hostile values across the chart, sparkline, notifications, toast, palette, command list, combobox, filter, terminal, tooltip, kbd, icon and framed art: none runs and none makes an element", async () => {
    const { page: p, context, errors } = await openHtml(browser, compose(hostileBody(), { fonts: false }).html, { scheme: "dark" });
    const hits = () => p.evaluate(() => [...new Set(window.__hits)].sort((a, b) => a - b));
    // Each path is driven for real (a control that can't be driven fails the test), and what each step produced is asserted, so a path whose handler never ran fails too.
    const step = async (label, fn) => { await fn(); await settle(p); assert.deepEqual(await hits(), [], `after ${label}`); };
    await settle(p);
    assert.deepEqual(await hits(), [], "after load");
    await step("the chart's keys and table", async () => {
      await p.locator(".chart [tabindex]").first().focus();
      for (const k of ["ArrowRight", "ArrowRight", "ArrowLeft"]) await p.keyboard.press(k);
      assert.ok(await p.locator(".chart").count() >= 2, "both charts are drawn");
      const toggles = await p.locator(".chart-toggle").all();
      assert.equal(toggles.length, 2, "each chart has its table to open");
      for (const t of toggles) await t.click({ timeout: 1500 });
      assert.equal(await p.locator(".chart-table:not([hidden])").count(), 2, "and both are open");
    });
    await step("the bell", async () => {
      await p.locator("#bell button").first().click({ timeout: 1500 });
      await p.locator(".notification").first().waitFor({ timeout: 1500 });
      assert.equal(await p.locator(".notification").count(), 2, "both entries are drawn");
      await p.keyboard.press("Escape");
    });
    await step("toasts", async () => { await p.evaluate(() => window.__toast()); await p.locator(".toast").first().waitFor({ timeout: 1500 }); assert.ok(await p.locator(".toast").count() >= 2); });
    await step("the palette", async () => {
      await p.locator("[data-open-palette]").click({ timeout: 1500 });
      await p.locator(".palette .row").first().waitFor({ timeout: 1500 });
      assert.equal(await p.locator(".palette .row").count(), 2, "both items are listed");
      await p.keyboard.type("s");
      await p.waitForFunction(() => document.querySelectorAll(".palette .row").length === 1, null, { timeout: 3000 });
      assert.match(await p.locator(".palette .row").first().textContent(), /^Save/, "typing s filters to the item that has one");
      await p.keyboard.press("Backspace");
      await p.keyboard.type("zzzz");
      await p.waitForFunction(() => document.querySelectorAll(".palette .row").length === 0, null, { timeout: 3000 });
      assert.equal((await p.locator(".palette-empty").textContent()).trim(), "No commands match.", "and nothing matching shows the empty line");
      await p.keyboard.press("Escape");
    });
    await step("the command list", async () => {
      const f = p.locator(".command-list input").first();
      await f.click({ timeout: 1500 });
      await p.locator(".command-results .row:not([hidden])").first().waitFor({ timeout: 1500 });
      assert.equal(await p.locator(".command-results .row:not([hidden])").count(), 2, "both commands are listed");
      await f.fill("ren");
      await p.waitForFunction(() => document.querySelector(".command-results .row:not([hidden])")?.textContent.trim().startsWith("Ren"), null, { timeout: 3000 });
      await f.fill("new");
      await p.waitForFunction(() => document.querySelector(".command-results .row:not([hidden])")?.textContent.trim().startsWith("New"), null, { timeout: 3000 });
      await f.fill("zzzz");
      await p.waitForFunction(() => document.querySelectorAll(".command-results .row:not([hidden])").length === 0, null, { timeout: 3000 });
      assert.match(await p.locator(".command-list").innerText(), /matches “zzzz”/, "and nothing matching says so");
    });
    await step("the combobox", async () => {
      const f = p.locator("#region");
      await f.click({ timeout: 1500 });
      await p.locator(".combobox-popup [role=option]").first().waitFor({ timeout: 1500 });
      await p.keyboard.press("ArrowDown");
      await p.keyboard.press("Enter");
      assert.match(await f.inputValue(), /^Frank/, "the chosen option's label is in the field");
      assert.match(await p.locator('input[name="region"]').first().inputValue(), /^eu/, "and its value is in the hidden input that carries the name");
      await f.fill("qqq");
      await p.waitForFunction(() => /^No/.test(document.querySelector(".combobox-popup")?.innerText ?? ""), null, { timeout: 3000 });
    });
    await step("the filter", async () => {
      assert.equal(await p.locator("#runs tbody tr:not([hidden])").count(), 2, "the table starts whole");
      const boxes = await p.locator(".filter input[type=checkbox]").all();
      assert.ok(boxes.length >= 2, "the filter has its values");
      for (const c of boxes) await c.click({ timeout: 1500 });
      await p.waitForFunction(() => document.querySelectorAll("#runs tbody tr:not([hidden])").length === 1, null, { timeout: 3000 });
      assert.match(await p.locator(".filter-result").first().textContent(), /^Showing 1 of 2/, "the filter narrowed the table, and the result line says so");
    });
    await step("a tooltip and the terminal's copy and replay", async () => {
      await p.locator("[data-tooltip]").first().hover({ timeout: 1500 });
      await p.locator("[role=tooltip]").first().waitFor({ timeout: 1500 });
      const copy = await p.locator(".terminal-copy").all();
      assert.equal(copy.length, 1, "the terminal has its copy button");
      for (const c of copy) await c.click({ timeout: 1500 });
      const lines = await p.locator(".terminal-line").count();
      assert.equal(lines, 0, "nothing of the transcript is drawn before the replay");
      const play = p.locator(".terminal-control");
      assert.equal(await play.count(), 1, "the terminal has its replay control");
      await play.click({ timeout: 1500 });
      await p.waitForFunction((before) => document.querySelectorAll(".terminal-line").length > before, lines, { timeout: 5000 });
    });
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll('img[src="x"]')].map((i) => i.getAttribute("onerror"))), [], "and no element in the page came out of a value");
    assert.deepEqual(errors.filter((e) => !/unknown icon/.test(e)), [], "no script error but the icon name that is not one");
    await context.close();
  });
});

// ---- A3-09: the toast's F6 route ----

describe("F6 reaches the notifications region (A3-09)", () => {
  const BODY = `<title>Toast</title><!-- basalt:use toast --><main class="page stack"><h1>Toast</h1><button class="btn" id="open">Open</button><button class="btn" id="after">After</button></main><script>Basalt.init();</script>`;
  const open = (scheme = "dark") => openHtml(browser, compose(BODY, { fonts: false }).html + "", { scheme });
  const show = (p) => p.evaluate(() => { Basalt.toast({ title: "Saved", description: "to disk", action: { label: "Undo", onClick() {} } }); });
  const active = (p) => p.evaluate(() => { const a = document.activeElement; return { cls: a.className, role: a.getAttribute("role"), name: a.getAttribute("aria-label"), tab: a.tabIndex }; });

  for (const scheme of ["dark", "light"]) {
    test(`F6 puts focus on the region, a Tab goes to the first toast, and Shift+Tab from the region goes back to where focus was (${scheme})`, async () => {
      const { page: p, context } = await open(scheme);
      assert.ok(await p.evaluate(() => typeof Basalt.toast === "function"));
      await show(p);
      await p.locator(".toast").waitFor();
      await p.locator("#open").focus();
      await p.keyboard.press("F6");
      assert.deepEqual(await active(p), { cls: "toast-viewport", role: "region", name: "Notifications", tab: -1 }, "the region, named, out of the tab order");
      await p.keyboard.press("Tab");
      assert.equal(await p.evaluate(() => document.activeElement.classList.contains("toast")), true, "Tab goes to the toast");
      await p.keyboard.press("Tab");
      assert.equal(await p.evaluate(() => document.activeElement.textContent.trim()), "Undo");
      await p.locator("#open").focus();
      await p.keyboard.press("F6");
      await p.keyboard.press("Shift+Tab");
      assert.equal(await p.evaluate(() => document.activeElement.id), "open", "back to where it was");
      await p.keyboard.press("F6");
      await p.keyboard.press("F6");
      assert.equal(await p.evaluate(() => document.activeElement.className), "toast-viewport", "F6 on the region stays on it");
      await context.close();
    });
  }

  test("with no toast F6 is left to the browser, and the timers are held while focus is in the stack", async () => {
    const { page: p, context } = await open();
    const clock = await freezeAnimations(p);
    const f6 = () => p.evaluate(() => { const e = new KeyboardEvent("keydown", { key: "F6", bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; });
    assert.equal(await f6(), false, "no toast, nothing taken");
    await p.evaluate(() => { Basalt.toast({ title: "Echo", home: "page", timeout: 500 }); });
    await p.locator(".toast").waitFor();
    assert.equal(await f6(), true, "with one, F6 is the page's");
    await p.locator("#open").focus();
    await p.keyboard.press("F6");
    await clock.advance(900);
    assert.equal(await p.locator(".toast").count(), 1, "focus in the stack holds its clock, as hover does");
    await context.close();
  });

  test("inside an open dialog, F6 then Shift+Tab from the toast region returns to the dialog's first input, not the trap's wrap to its last control, as in React", async () => {
    const DIALOG = `<title>Dialog</title><!-- basalt:use toast dialog --><main class="page"><button class="btn" id="open" data-dialog-open="#d">Open</button></main>
      <dialog class="panel float modal dialog" id="d" aria-label="Rename"><h2 class="dialog-title">Rename</h2><input class="input" id="first" aria-label="Name"><div class="dialog-actions"><button class="btn" id="close" data-dialog-close>Close</button></div></dialog><script>Basalt.init();</script>`;
    const { page: s, context } = await openHtml(browser, compose(DIALOG, { fonts: false }).html);
    await s.locator("#open").click();
    await s.locator("#first").focus();
    await s.evaluate(() => { Basalt.toast({ title: "Saved", description: "to disk" }); });
    await s.locator(".toast").waitFor();
    await s.keyboard.press("F6");
    const skillRegion = await s.evaluate(() => document.activeElement.className);
    await s.keyboard.press("Shift+Tab");
    const skill = await s.evaluate(() => document.activeElement.id || document.activeElement.className);
    await context.close();
    const { page: r } = await fixturePage(reactBrowser, `function Probe(){const t=B.useToast();React.useEffect(()=>{window.t=t},[t]);return null}
      createRoot(document.getElementById("root")).render(<B.ToastProvider><Probe/><B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>Rename</B.DialogTitle><B.DialogDescription>Where it shows.</B.DialogDescription><B.Input id="first" aria-label="Name" /><B.DialogActions><B.DialogClose>Close</B.DialogClose></B.DialogActions></B.DialogContent></B.Dialog></B.ToastProvider>);`, { theme: "dark" });
    await r.locator("#first").waitFor();
    await r.locator("#first").focus();
    await r.evaluate(() => window.t.show({ title: "Saved", description: "to disk" }));
    await r.locator(".basalt-toast").first().waitFor();
    await r.keyboard.press("F6");
    const reactRegion = await r.evaluate(() => document.activeElement.className);
    await r.keyboard.press("Shift+Tab");
    const react = await r.evaluate(() => document.activeElement.id || document.activeElement.className);
    await r.close();
    assert.equal(skillRegion, "toast-viewport", "F6 reaches the region in the dialog");
    assert.equal(skill, "first", "Shift+Tab goes back to the input");
    assert.equal(reactRegion, "basalt-toast-viewport");
    assert.equal(react, skill, `React's Shift+Tab lands on ${react}`);
  });

  // The toast follows the live native modal, including the palette, and retains that host while document focus is lost.
  // Each sequence runs in the skill and in React, and both must reach the region with F6, go back with Shift+Tab, and paint the toast above the top modal's backdrop.
  const MODALS = `<dialog class="panel float modal dialog" id="d1" aria-label="One"><h2 class="dialog-title">One</h2><input class="input" id="i1" aria-label="One"></dialog><dialog class="panel float modal dialog" id="d2" aria-label="Two"><h2 class="dialog-title">Two</h2><input class="input" id="i2" aria-label="Two"></dialog>
    <dialog class="panel float modal dialog" id="d3" aria-label="Three"><h2 class="dialog-title">Three</h2><input class="input" id="i3" aria-label="Three"></dialog><dialog class="panel float modal sheet" id="s" data-side="right" aria-label="Sheet"><h2 class="dialog-title">Sheet</h2><input class="input" id="si" aria-label="Sheet"></dialog>`;
  const SKILL_OPS = {
    toast: () => Basalt.toast({ title: "Saved", description: "to disk", action: { label: "Undo", onClick() {} } }),
    d1: () => Basalt.openDialog("#d1"), d2: () => Basalt.openDialog("#d2"), d3: () => Basalt.openDialog("#d3"), s: () => Basalt.openDialog("#s"),
    p: () => Basalt.openPalette({ groups: [{ label: "G", items: [{ label: "Alpha" }, { label: "Beta" }] }] }),
    reopen1: () => { document.querySelector("#d1").close(); Basalt.openDialog("#d1"); },
    blur: () => document.activeElement.blur(),
  };
  const REACT_APP = `function Overlays() {
    const [o1, s1] = React.useState(false), [o2, s2] = React.useState(false), [o3, s3] = React.useState(false), [os, ss] = React.useState(false), [op, sp] = React.useState(false);
    const t = B.useToast();
    React.useEffect(() => { window.ops = { toast: () => t.show({ title: "Saved", description: "to disk", action: { label: "Undo", onClick() {} } }), d1: () => flushSync(() => s1(true)), d2: () => flushSync(() => s2(true)), d3: () => flushSync(() => s3(true)), s: () => flushSync(() => ss(true)), p: () => flushSync(() => sp(true)), reopen1: () => { flushSync(() => s1(false)); flushSync(() => s1(true)); }, blur: () => document.activeElement.blur(), close1: () => flushSync(() => s1(false)), closeS: () => flushSync(() => ss(false)) }; }, [t]);
    const dialog = (open, set, id, name) => <B.Dialog open={open} onOpenChange={set}><B.DialogContent><B.DialogTitle>{name}</B.DialogTitle><B.DialogDescription>d</B.DialogDescription><B.Input id={id} aria-label={name} /></B.DialogContent></B.Dialog>;
    return <><B.CommandMenu open={op} onOpenChange={sp} groups={[{ label: "G", commands: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] }]} />{dialog(o1, s1, "i1", "One")}{dialog(o2, s2, "i2", "Two")}{dialog(o3, s3, "i3", "Three")}
      <B.Sheet open={os} onOpenChange={ss}><B.SheetContent side="right"><B.SheetTitle>Sheet</B.SheetTitle><B.SheetDescription>d</B.SheetDescription><B.Input id="si" aria-label="Sheet" /></B.SheetContent></B.Sheet></>;
  }
  createRoot(document.getElementById("root")).render(<B.ToastProvider><Overlays /></B.ToastProvider>);`;
  const SEQUENCES = {
    "the first toast raised after two modals are open": { ops: ["d2", "d1", "toast"], target: "#i1" },
    "the first toast raised after three modals are open": { ops: ["d3", "d2", "d1", "toast"], target: "#i1" },
    "a modal closed and reopened in one task": { ops: ["toast", "d1", "d2", "reopen1"], target: "#i1", reactTarget: "#i2" }, // React keeps the one it opened last under its own stack; a native dialog reopened is on top
    "a sheet over a palette over a dialog": { ops: ["toast", "d1", "p", "s"], target: "#si" },
    "a palette over a sheet over a dialog": { ops: ["toast", "d1", "s", "p"], target: ".palette input, .basalt-command-input" },
    "a palette over two dialogs": { ops: ["toast", "d1", "d2", "p"], target: ".palette input, .basalt-command-input" },
    "a palette over two dialogs, the toast raised after it": { ops: ["d1", "d2", "p", "toast"], target: ".palette input, .basalt-command-input" },
    "two siblings opened in the other order than they stand": { ops: ["toast", "d2", "d1"], target: "#i1" },
    "Sol build: lost focus in a modal": { ops: ["d2", "d1", "blur", "toast"], target: "#i1", lost: true },
    "Sol build: lost focus with a palette over dialogs and a sheet": { ops: ["d1", "d2", "s", "p", "blur", "toast"], target: ".palette input, .basalt-command-input", lost: true },
    "Sol build: a sheet over a dialog over a palette": { ops: ["toast", "p", "d1", "s"], target: "#si" },
    "Sol build: a dialog opened over an open palette": { ops: ["toast", "p", "d1"], target: "#i1" },
  };
  for (const [name, c] of Object.entries(SEQUENCES)) {
    test(`F6 reaches the toast, Shift+Tab goes back, and the toast is above the backdrop, with ${name}, as in React`, async () => {
      const BODY = `<title>Overlays</title><!-- basalt:use toast dialog sheet palette --><main class="page"><h1>Overlays</h1></main>${MODALS}<script>Basalt.init();</script>`;
      const { page: s, context } = await openHtml(browser, compose(BODY, { fonts: false }).html);
      for (const op of c.ops) { await s.evaluate(`(${SKILL_OPS[op]})()`); await frames(s, 2); }
      await settle(s);
      const aboveS = await s.evaluate(() => { const r = document.querySelector(".toast").getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".toast"); });
      if (!c.lost) await s.locator(c.target).first().focus();
      await s.keyboard.press("F6");
      const skillRegion = await s.evaluate(() => document.activeElement.className);
      await s.keyboard.press("Shift+Tab");
      const skillBack = await s.evaluate((sel) => document.activeElement.matches(sel), c.target);
      await context.close();
      const { page: r } = await fixturePage(reactBrowser, `import { flushSync } from "react-dom";\n${REACT_APP}`, { theme: "dark" });
      for (const op of c.ops) { await r.evaluate((o) => window.ops[o](), op); await settle(r); }
      const reactTarget = c.reactTarget ?? c.target;
      await r.locator(reactTarget).first().waitFor();
      const aboveR = await r.evaluate(() => { const r = document.querySelector(".basalt-toast").getBoundingClientRect(); return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".basalt-toast"); });
      if (c.lost) {
        await r.keyboard.press("F6");
        assert.equal(await r.evaluate(() => document.activeElement.className), "basalt-toast-viewport", "React reaches its region even after focus is lost");
      }
      // React remembers BODY after blur; the skill keeps its last modal control. Compare the ordinary return route from the control.
      await r.locator(reactTarget).first().focus();
      await r.keyboard.press("F6");
      const reactRegion = await r.evaluate(() => document.activeElement.className);
      await r.keyboard.press("Shift+Tab");
      const reactBack = await r.evaluate((sel) => document.activeElement.matches(sel), reactTarget);
      await r.close();
      assert.equal(reactRegion, "basalt-toast-viewport", "React reaches its region");
      assert.equal(reactBack, true, "and returns to the top input");
      assert.equal(aboveR, true, "and paints the toast above the backdrop");
      assert.equal(skillRegion, "toast-viewport", "the skill's F6 reaches the region");
      assert.equal(skillBack, true, "Shift+Tab goes back to the top input");
      assert.equal(aboveS, true, "and the toast is painted above the top modal's backdrop");
    });
  }

  test("with a palette open, F6, Tab and Shift+Tab agree with React; Escape returns to the skill input and records React's menu closure", async () => {
    const BODY = `<title>Palette</title><!-- basalt:use toast palette --><main class="page"><h1>Palette</h1><button class="btn" id="open">Open</button></main><script>Basalt.init();</script>`;
    const names = (page, viewportClass) => page.evaluate((vp) => { const a = document.activeElement; return a.className === vp ? "region" : a.classList.contains(vp.replace("viewport", "")) || /toast$/.test(a.className.split(" ")[0]) ? "toast" : a.tagName === "BUTTON" && /Undo/.test(a.textContent) ? "action" : a.tagName === "INPUT" ? "input" : `${a.tagName}.${a.className}`; }, viewportClass);
    const walk = async (page, vp, press) => {
      const seen = [];
      await press("F6"); seen.push(await names(page, vp));
      await press("Tab"); seen.push(await names(page, vp));
      await press("Tab"); seen.push(await names(page, vp));
      await press("Shift+Tab"); seen.push(await names(page, vp));
      await press("Shift+Tab"); seen.push(await names(page, vp));
      await press("Tab"); seen.push(await names(page, vp)); // from the input: stays in the palette
      await press("Tab"); seen.push(await names(page, vp));
      return seen;
    };
    const { page: s, context } = await openHtml(browser, compose(BODY, { fonts: false }).html);
    await s.evaluate(() => { Basalt.toast({ title: "Saved", description: "to disk", action: { label: "Undo", onClick() {} } }); });
    await s.locator(".toast").waitFor();
    await s.evaluate(() => { Basalt.openPalette({ groups: [{ label: "G", items: [{ label: "Alpha" }, { label: "Beta" }] }] }); });
    await s.locator(".palette input").waitFor();
    const skill = await walk(s, "toast-viewport", (k) => s.keyboard.press(k));
    // Escape from the region goes back to the input, and the palette stays open
    await s.keyboard.press("F6");
    const regionThenEscape = await s.evaluate(() => document.activeElement.className);
    await s.keyboard.press("Escape");
    assert.equal(regionThenEscape, "toast-viewport");
    const skillEscape = await s.evaluate(() => [document.activeElement.tagName, !!document.querySelector(".palette")]);
    await s.keyboard.press("F6"); await s.keyboard.press("Tab"); await s.keyboard.press("Tab");
    await s.keyboard.press("Escape");
    await s.locator(".toast").waitFor({ state: "detached" });
    assert.deepEqual(await s.evaluate(() => [document.activeElement.tagName, !!document.querySelector(".palette")]), ["INPUT", true], "Escape from a toast action dismisses the toast and returns to the palette without closing the palette or its modal host");
    await context.close();
    const { page: r } = await fixturePage(reactBrowser, REACT_APP.replace("flushSync", "flushSync"), { theme: "dark" });
    await r.evaluate(() => window.ops.toast());
    await r.locator(".basalt-toast").first().waitFor();
    await r.evaluate(() => window.ops.p());
    await r.locator(".basalt-command-input").waitFor();
    await settle(r);
    const react = await walk(r, "basalt-toast-viewport", (k) => r.keyboard.press(k));
    await r.keyboard.press("F6"); await r.keyboard.press("Escape"); await settle(r);
    await r.locator(".basalt-command").waitFor({ state: "detached" });
    assert.equal(await r.locator(".basalt-command").count(), 0, "React currently closes its menu from the region's Escape: recorded in Known limits");
    await r.evaluate(() => window.ops.p()); await settle(r);
    await r.keyboard.press("F6"); await r.keyboard.press("Tab"); await r.keyboard.press("Tab");
    await r.keyboard.press("Escape"); await settle(r);
    await r.locator(".basalt-command").waitFor({ state: "detached" });
    assert.equal(await r.locator(".basalt-command").count(), 0, "React currently closes its menu from an action's Escape: a recorded difference, not the region's return route");
    await r.close();
    assert.deepEqual(skill.slice(0, 3), ["region", "toast", "action"], "F6, Tab, Tab: the region, the toast, its action");
    assert.deepEqual(react.slice(0, 3), ["region", "toast", "action"], "React's: the same");
    assert.deepEqual(skill.slice(3, 5), ["toast", "input"], "Shift+Tab from the action is the toast, and from the first toast goes back to the palette's input");
    assert.equal(react[4], "input", "as React's does");
    assert.deepEqual(skill.slice(5), ["input", "input"], "an ordinary Tab from the input never leaves the palette");
    assert.deepEqual(skillEscape, ["INPUT", true], "Escape from the region goes back to the input and the palette stays");
  });

  test("Sol build: toast keys retain their real isComposing value for app listeners, as in React", async () => {
    for (const react of [false, true]) {
      const opened = react
        ? await fixturePage(reactBrowser, `import { flushSync } from "react-dom";\n${REACT_APP}`, { theme: "dark" })
        : await openHtml(browser, page(`<title>Events</title><!-- basalt:use toast palette --><button>Open</button>`).html);
      const p = opened.page;
      await p.evaluate((r) => { if (r) { window.ops.p(); window.ops.toast(); } else { Basalt.openPalette({ groups: [{ items: [{ label: "Alpha" }, { label: "Beta" }] }] }); Basalt.toast({ title: "Saved" }); } }, react);
      await settle(p);
      await p.keyboard.press("F6");
      await p.evaluate(() => {
        window.keys = [];
        for (const capture of [true, false]) document.addEventListener("keydown", (e) => window.keys.push([capture, e.key, e.isComposing, Object.hasOwn(e, "isComposing")]), capture);
      });
      await p.keyboard.press("ArrowDown");
      assert.deepEqual(await p.evaluate(() => window.keys), [[true, "ArrowDown", false, false], [false, "ArrowDown", false, false]], react ? "React" : "skill");
      assert.equal(await p.evaluate(() => document.activeElement.getAttribute("role")), "region", "palette navigation does not steal a toast key");
      if (opened.context) await opened.context.close(); else await p.close();
    }
  });

  test("Sol build: a dialog above a palette owns its keys, and closing it resumes the palette, as in React", async () => {
    for (const react of [false, true]) {
      const opened = react
        ? await fixturePage(reactBrowser, REACT_APP, { theme: "dark" })
        : await openHtml(browser, page(`<title>Stack</title><!-- basalt:use palette dialog toast --><button>Open</button>${MODALS}`).html);
      const p = opened.page;
      await p.evaluate((r) => { if (r) window.ops.p(); else Basalt.openPalette({ groups: [{ items: [{ label: "Alpha" }, { label: "Beta" }] }] }); }, react);
      const input = react ? ".basalt-command-input" : ".palette input";
      await p.waitForFunction((sel) => document.querySelector(sel)?.hasAttribute("aria-activedescendant"), input, { timeout: 3000 });
      await p.evaluate((r) => { if (r) window.ops.d1(); else Basalt.openDialog("#d1"); }, react);
      await settle(p);
      await p.waitForFunction(() => document.activeElement.id === "i1", null, { timeout: 3000 });
      const selected = () => p.locator(input).getAttribute("aria-activedescendant");
      const first = await selected();
      await p.keyboard.press("ArrowDown");
      assert.equal(await selected(), first, "a key in the dialog does not navigate the underlying palette");
      await p.keyboard.press("Tab");
      await p.waitForFunction(() => document.activeElement.id === "i1", null, { timeout: 3000 });
      assert.equal(await p.evaluate(() => document.activeElement.id), "i1", "Tab stays in the dialog's only control");
      await p.keyboard.press("Escape"); await settle(p);
      assert.equal(await p.locator(input).evaluate((el) => el === document.activeElement), true, "closing the dialog restores the palette input");
      await p.keyboard.press("ArrowDown");
      assert.notEqual(await selected(), first, "the palette's navigation resumes");
      await p.keyboard.press("Escape"); await settle(p);
      assert.equal(await p.locator(input).count(), 0, "the palette then closes normally");
      if (opened.context) await opened.context.close(); else await p.close();
    }
  });

  for (const scheme of ["dark", "light"]) for (const width of [1440, 390]) for (const host of ["dialog", "sheet"]) {
    test(`Sol build: a palette from a ${host} resets its depth, escapes clipping, and closes with its host (${scheme}, ${width}), beside React`, async () => {
      const BODY = `<title>Hosted palette</title><!-- basalt:use palette toast dialog sheet --><button class="btn" id="open">Open</button><dialog class="panel float modal ${host}" data-side="right" id="host" aria-label="Host"><h2 class="dialog-title">Host</h2><input class="input" id="host-input" aria-label="Host input"></dialog>`;
      const { page: s, context } = await openHtml(browser, page(BODY).html, { scheme, width, deviceScaleFactor: 2 });
      s.setDefaultTimeout(5000);
      const probe = (p, palette, band) => p.evaluate(([sel, child]) => {
        const d = document.querySelector(sel), b = document.querySelector(child), r = d.getBoundingClientRect();
        return { box: [r.x, r.y, r.width, r.height], panel: getComputedStyle(d).backgroundColor, band: getComputedStyle(b).backgroundColor,
          hit: [r.left + 3, r.right - 3].every((x) => d.contains(document.elementFromPoint(x, r.top + 8))) };
      }, [palette, band]);
      const openPalette = () => s.evaluate(() => { window.p = Basalt.openPalette({ groups: [{ items: [{ label: "Alpha" }, { label: "Beta" }] }] }); });
      await openPalette();
      const standalone = await probe(s, ".palette", ".palette .input-row");
      assert.ok(Math.abs(standalone.box[1] - Math.max(16, (width === 390 ? 844 : 900) * 0.12)) < 0.02, "the approved palette top is 12vh (at least 16px), even when dialog.css is loaded");
      await s.evaluate(() => { window.p.close(); document.querySelector("#open").focus(); Basalt.openDialog("#host"); });
      await settle(s);
      await openPalette();
      assert.deepEqual(await probe(s, ".palette", ".palette .input-row"), standalone, "hosting changes neither depth nor viewport position and does not clip the panel");
      await s.screenshot({ path: path.join(here, "../../../.review/sol-c2", `palette-${host}-${scheme}-${width}.png`) });
      await s.evaluate(() => { Basalt.toast({ title: "Saved" }); });
      await s.keyboard.press("F6");
      await s.evaluate(() => { document.querySelector("#host").close(); });
      await s.locator(".palette").waitFor({ state: "detached" });
      await s.waitForFunction(() => document.activeElement.id === "open");
      assert.equal(await s.locator(".toast-viewport").evaluate((v) => v.matches(":popover-open") && v.parentElement === document.body), true, "the toast survives removal of its modal host");
      await s.keyboard.press("Tab");
      assert.equal(await s.locator(".palette").count(), 0, "the palette has no remaining focus trap");
      await context.close();

      const jsx = `function Hosted() {
        const [host, setHost] = React.useState(false), [palette, setPalette] = React.useState(false); const t = B.useToast();
        React.useEffect(() => { window.ops = { host: () => flushSync(() => setHost(true)), palette: () => flushSync(() => setPalette(true)), close: () => flushSync(() => { setHost(false); setPalette(false); }), toast: () => t.show({ title: "Saved" }) }; }, [t]);
        const menu = <B.CommandMenu open={palette} onOpenChange={setPalette} groups={[{ commands: [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }] }]} />;
        return <><button id="open">Open</button>${host === "sheet"
          ? '<B.Sheet open={host} onOpenChange={setHost}><B.SheetContent side="right"><B.SheetTitle>Host</B.SheetTitle><B.SheetDescription>d</B.SheetDescription><B.Input id="host-input" aria-label="Host input" />{host && menu}</B.SheetContent></B.Sheet>'
          : '<B.Dialog open={host} onOpenChange={setHost}><B.DialogContent><B.DialogTitle>Host</B.DialogTitle><B.DialogDescription>d</B.DialogDescription><B.Input id="host-input" aria-label="Host input" />{host && menu}</B.DialogContent></B.Dialog>'}{!host && menu}</>;
      } createRoot(document.getElementById("root")).render(<B.ToastProvider><Hosted /></B.ToastProvider>);`;
      const { page: r } = await fixturePage(reactBrowser, `import { flushSync } from "react-dom";\n${jsx}`, { theme: scheme, viewport: { width, height: 900 } });
      await r.evaluate(() => window.ops.palette()); await settle(r);
      const base = await probe(r, ".basalt-command", ".basalt-command-search");
      await r.keyboard.press("Escape"); await settle(r);
      await r.locator("#open").focus();
      await r.evaluate(() => window.ops.host()); await settle(r);
      await r.evaluate(() => window.ops.palette()); await settle(r);
      assert.deepEqual(await probe(r, ".basalt-command", ".basalt-command-search"), base, "React also resets depth and escapes its host's clipping");
      await r.evaluate(() => window.ops.toast()); await settle(r);
      await r.keyboard.press("F6");
      await r.evaluate(() => window.ops.close()); await settle(r);
      assert.equal(await r.locator(".basalt-command").count(), 0, "React's hosted menu unmounts with its host");
      await r.keyboard.press("F6");
      assert.equal(await r.evaluate(() => document.activeElement.className), "basalt-toast-viewport", "React's toast also survives the host closing");
      await r.close();
    });
  }

  test("it is what React does: F6 on the region, and Shift+Tab back (a parity entry beside parity-4's overlay behaviour)", async () => {
    const { page: r } = await fixturePage(reactBrowser, `function Probe(){const t=B.useToast();React.useEffect(()=>{window.t=t},[t]);return null}
      createRoot(document.getElementById("root")).render(<B.ToastProvider><Probe/><button id="open">Open</button></B.ToastProvider>);`, { theme: "dark" });
    await r.evaluate(() => window.t.show({ title: "Saved", description: "to disk" }));
    await r.locator(".basalt-toast").first().waitFor();
    await r.locator("#open").focus();
    await r.keyboard.press("F6");
    const react = await r.evaluate(() => { const a = document.activeElement; return { role: a.getAttribute("role"), name: a.getAttribute("aria-label"), tab: a.tabIndex }; });
    await r.keyboard.press("Shift+Tab");
    const back = await r.evaluate(() => document.activeElement.id);
    await r.close();
    const { page: s, context } = await open();
    await show(s);
    await s.locator(".toast").waitFor();
    await s.locator("#open").focus();
    await s.keyboard.press("F6");
    const skill = await s.evaluate(() => { const a = document.activeElement; return { role: a.getAttribute("role"), name: a.getAttribute("aria-label"), tab: a.tabIndex }; });
    await s.keyboard.press("Shift+Tab");
    const skillBack = await s.evaluate(() => document.activeElement.id);
    await context.close();
    assert.deepEqual([skill, skillBack], [react, back]);
  });
});

// ---- A3-13: the profile list has a role ----

describe("the profile list is a labelled group (A3-13)", () => {
  for (const scheme of ["dark", "light"]) {
    test(`axe finds nothing in it, and nothing incomplete about it (${scheme})`, async () => {
      const { page: p, context } = await openHtml(browser, compose(fixture("kitchen-sink.body.html"), { fonts: false }).html, { scheme });
      assert.deepEqual(await p.evaluate(() => { const el = document.querySelector(".profile-links"); return [el.getAttribute("role"), el.getAttribute("aria-label")]; }), ["group", "Profiles"]);
      await p.addScriptTag({ content: axeSource });
      const result = await p.evaluate(() => axe.run(document.querySelector(".profile-links").closest(".panel"), { resultTypes: ["violations", "incomplete"] }).then((r) => ({ violations: r.violations.map((v) => v.id), incomplete: r.incomplete.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`) })));
      assert.deepEqual(result, { violations: [], incomplete: [] });
      assert.equal(await p.getByRole("group", { name: "Profiles" }).count(), 1, "a named group of links");
      await context.close();
    });
  }
});

// ---- Row 11: a Tab into the top bar does not scroll the page ----

describe("a Tab into the top bar leaves the page where it is (row 11)", () => {
  const BAR = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#top" aria-label="Orbit home">Orbit</a><span class="spacer"></span><a class="btn" data-variant="ghost" href="#docs">Docs</a><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header>`;
  const LONG = Array.from({ length: 60 }, (_, i) => `<p id="${i === 20 ? "alpha" : `p${i}`}" style="margin:0;padding:22px 0">${i === 20 ? "<strong>An anchor</strong> " : ""}Filler line ${i + 1}</p>`).join("");
  const PAGE = `<title>Bar</title><a id="before" href="#before" style="display:block;height:0"></a>${BAR}<main class="page"><a id="first" href="#first">First link</a><h1 id="top">Long page</h1>${LONG}</main>`;
  const scrollNow = (p) => p.evaluate(() => new Promise((resolve) => { let last = -1; let still = 0; const tick = () => { const y = scrollY; still = y === last ? still + 1 : 0; last = y; if (still >= 3) resolve(y); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));

  for (const scheme of ["dark", "light"]) {
    test(`every stop in the bar, by focus and by Shift+Tab from the content, leaves the scroll where it was (${scheme})`, async () => {
      const { page: p, context } = await openHtml(browser, compose(PAGE, { fonts: false }).html, { scheme });
      for (const y of [600, 1800]) {
        await p.evaluate((to) => { document.activeElement?.blur(); scrollTo({ top: to, behavior: "instant" }); }, y);
        const at = await scrollNow(p);
        assert.ok(at > 500);
        const after = await p.evaluate(() => { const out = []; for (const el of document.querySelectorAll(".topbar a[href], .topbar button")) { el.focus(); out.push(scrollY); } return out; });
        assert.equal(after.length, 3);
        for (const y2 of after) assert.equal(y2, at, `from ${y}: focus into the bar moved the page`);
        // Shift+Tab into the bar from the first link of the content, which the page was restored away from.
        await p.evaluate(() => document.getElementById("first").focus({ preventScroll: true }));
        assert.equal(await scrollNow(p), at);
        for (let i = 0; i < 3; i++) {
          await p.keyboard.press("Shift+Tab");
          assert.equal(await p.evaluate(() => document.activeElement.closest(".topbar") !== null), true, `Shift+Tab ${i + 1} is in the bar`);
          assert.equal(await scrollNow(p), at, `from ${y}: Shift+Tab ${i + 1} moved the page`);
        }
      }
      await context.close();
    });
  }

  test("the check is not vacuous: without the scroll margin the same focus does scroll the page", async () => {
    const { page: p, context } = await openHtml(browser, compose(PAGE, { fonts: false }).html);
    await p.addStyleTag({ content: ".topbar * { scroll-margin-top: 0 !important; }" });
    await p.evaluate(() => scrollTo({ top: 1800, behavior: "instant" }));
    const at = await scrollNow(p);
    await p.evaluate(() => document.querySelector(".topbar a[href]").focus());
    assert.ok((await scrollNow(p)) < at, "with only the padding, focusing the brand scrolled the page up");
    await context.close();
  });

  test("and the margin does not move an anchor: the landing is still the padding's, the bar and 16px", async () => {
    const { page: p, context } = await openHtml(browser, compose(PAGE, { fonts: false }).html);
    await p.evaluate(() => document.querySelector(".topbar a[href]").focus());
    await p.evaluate(() => { location.hash = "alpha"; });
    await scrollNow(p);
    const top = await p.evaluate(() => document.getElementById("alpha").getBoundingClientRect().top);
    assert.ok(Math.abs(top - 72) < 2, `the anchor lands at ${top}, 56 for the bar and 16 for the step`);
    await context.close();
  });
});

// ---- A1-09: the stage's art comes after its content ----

describe("the stage's art is after its content in the markup and behind it on the page (A1-09)", () => {
  const ART = `<div class="stage-art" aria-hidden="true"><svg viewBox="0 0 10 10" preserveAspectRatio="none"><rect width="10" height="10" fill="#ff0000"/></svg><div class="art-mark" style="position: absolute; inset: auto 0 0 0; height: 80px; background: #223344"></div></div>`;
  const CONTENT = `<div class="stage-content"><div id="block" style="height: 120px; margin: 0 24px; background: #00ff00"></div><div style="height: 240px"></div></div>`;
  const stage = (artFirst) => `<title>Stage</title><header class="topbar"><div class="topbar-inner"><a class="brand" href="#top">Orbit</a></div></header><section class="stage" id="top">${artFirst ? ART + CONTENT : CONTENT + ART}</section><main style="height: 800px"></main>`;

  test("the usage, the module's own markup and the test fixtures put .stage-art last", () => {
    for (const body of [fixture("art.body.html")]) { const html = compose(body, { fonts: false }).html; assert.ok(html.indexOf('class="stage-content"') < html.indexOf('class="stage-art"')); }
    assert.ok(read(skillDir, "parts", "usage", "stage.md").indexOf('class="stage-content"') < read(skillDir, "parts", "usage", "stage.md").indexOf('class="stage-art"'));
  });

  for (const artFirst of [false, true]) {
    for (const scheme of ["dark", "light"]) {
      test(`the content is painted above the art and the art above the page's field, whichever comes first in the markup (${artFirst ? "art first" : "art last"}, ${scheme})`, async () => {
        const { page: p, context } = await openHtml(browser, compose(stage(artFirst), { fonts: false }).html, { scheme });
        await settle(p);
        const read = await p.evaluate(() => { const b = document.getElementById("block").getBoundingClientRect(), s = document.querySelector(".stage").getBoundingClientRect(); return { block: [b.left + 10, b.top + 10], field: [s.left + 4, s.top + 70] }; });
        const sample = async ([x, y]) => { const buf = await p.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 }, type: "png" }); return pngPixel(buf); };
        assert.deepEqual(await sample(read.block), [0, 255, 0], "the content's own box is on top of the art");
        assert.deepEqual(await sample(read.field), [255, 0, 0], "the art is on top of the stage's field");
        await context.close();
      });
    }
  }

  test("focus order and what the art can't do: it takes no pointer and no focus, and has no accessible name or text", async () => {
    const { page: p, context } = await openHtml(browser, compose(stage(false).replace('<div id="block"', '<a id="link" href="#x" style="display:block">A link</a><div id="block"'), { fonts: false }).html);
    await p.keyboard.press("Tab");
    await p.keyboard.press("Tab");
    assert.equal(await p.evaluate(() => document.activeElement.id), "link", "the brand, then the link in the content");
    assert.deepEqual(await p.evaluate(() => { const a = document.querySelector(".stage-art"); return [getComputedStyle(a).pointerEvents, a.getAttribute("aria-hidden"), a.textContent.trim()]; }), ["none", "true", ""]);
    await context.close();
  });

  // The slow link: the document arrives in two parts, and the stage's art is a layout shift when it comes before the words. The server sends the first part (the bar, the stage's opening, and what is before
  // the art or the first words), waits, then sends the rest, as a slow link does.
  const slow = async (artFirst, { scheme = "dark", width = 390 } = {}) => {
    const html = compose(`<title>Slow</title><header class="topbar"><div class="topbar-inner"><a class="brand" href="#top">Orbit</a></div></header><section class="stage" id="top"><!--SPLIT-->${artFirst ? ART + `<div class="stage-content"><h1 style="margin:0">A synthetic headline</h1><!--LATER-->` : `<div class="stage-content"><h1 style="margin:0">A synthetic headline</h1><!--LATER-->`}<p style="height:420px;margin:0">The words that arrive late.</p></div>${artFirst ? "" : ART}</section><main style="height: 800px"></main>`, { fonts: false }).html;
    const cut = html.indexOf("<!--LATER-->");
    const first = html.slice(0, cut);
    const second = html.slice(cut);
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.write(first);
      setTimeout(() => res.end(second), 700);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme });
    const p = await context.newPage();
    await p.addInitScript(() => {
      window.__shifts = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__shifts.push({ value: e.value, sources: (e.sources || []).map((s) => ({ node: s.node ? String(s.node.className?.baseVal ?? s.node.className ?? s.node.nodeName) : "(gone)", dh: Math.round(s.currentRect.height - s.previousRect.height), dy: Math.round(s.currentRect.y - s.previousRect.y) })) });
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await p.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "commit" });
    await p.waitForFunction(() => document.querySelector(".stage-content h1") && performance.getEntriesByName("first-contentful-paint").length > 0, null, { timeout: 5000 });
    await p.waitForFunction(() => document.querySelector(".stage-content p"), null, { timeout: 5000 });
    await frames(p, 6);
    const shifts = await p.evaluate(() => window.__shifts);
    await context.close();
    await new Promise((resolve) => server.close(resolve));
    return shifts;
  };

  test("on a slow link the art does not jump when the words arrive after it: with the art last it is not on the page to move, and with the art first (the old markup) it did", async () => {
    const mover = (shifts) => shifts.flatMap((s) => s.sources).filter((s) => /art-mark/.test(s.node) && s.dy !== 0);
    const first = await slow(true);
    assert.ok(mover(first).length > 0, `the old order moves the art: ${JSON.stringify(first)}`);
    const last = await slow(false);
    assert.deepEqual(mover(last), [], `the new order does not: ${JSON.stringify(last)}`);
  });
});

/** The red, green and blue of a 1 by 1 PNG, read without a dependency: inflate the IDAT chunk and unfilter its one row. */
function pngPixel(buf) {
  let at = 8; let idat = Buffer.alloc(0); let color = 2;
  while (at < buf.length) {
    const len = buf.readUInt32BE(at); const type = buf.toString("ascii", at + 4, at + 8);
    if (type === "IHDR") color = buf[at + 8 + 9];
    if (type === "IDAT") idat = Buffer.concat([idat, buf.subarray(at + 8, at + 8 + len)]);
    at += 12 + len;
  }
  const raw = zlib.inflateSync(idat);
  const bpp = color === 6 ? 4 : 3;
  return [...raw.subarray(1, 1 + bpp)].slice(0, 3);
}

// ---- A5-17: what a composed page needs from a Content-Security-Policy ----

describe("a composed page runs under the policy the README gives, with no violation (A5-17)", () => {
  const POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:";
  const sha = (text) => `'sha256-${crypto.createHash("sha256").update(text, "utf8").digest("base64")}'`;
  const inline = (html, tag) => [...html.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g"))].filter((m) => !/type\s*=\s*["']?application\/json/.test(m[0].slice(0, m[0].indexOf(">")))).map((m) => m[1]);

  const run = async (html, policy, drive) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
    const p = await context.newPage();
    const seen = [];
    await p.addInitScript(() => { window.__csp = []; document.addEventListener("securitypolicyviolation", (e) => window.__csp.push(`${e.effectiveDirective}: ${e.blockedURI}`)); });
    p.on("console", (m) => { if (/Content Security Policy|Refused/i.test(m.text())) seen.push(m.text()); });
    p.on("pageerror", (e) => seen.push(`pageerror: ${e.message}`));
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", headers: { "content-security-policy": policy }, body: html }));
    await p.goto("https://basalt.test/");
    await p.evaluate(() => document.fonts.ready);
    await drive(p);
    await frames(p, 3);
    const violations = await p.evaluate(() => window.__csp);
    await context.close();
    return { violations, seen };
  };

  const pages = { static: compose(EXAMPLES.static).html, interactive: compose(EXAMPLES.interactive).html };

  for (const [name, html] of Object.entries(pages)) {
    test(`the ${name} example loads, runs and is driven under default-src 'none' with its inline script, style, fonts and images allowed: no violation`, async () => {
      const { violations, seen } = await run(html, POLICY, async (p) => {
        assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark", "the theme bootstrap ran");
        await p.locator("[data-theme-toggle]").first().click();
        assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "light", "and the toggle's script");
        if (name === "interactive") { await p.keyboard.press("Control+k"); await p.locator(".palette input").waitFor(); await p.keyboard.press("Escape"); await p.locator(".palette").waitFor({ state: "detached" }); await p.getByRole("tab").nth(1).click(); }
        assert.ok(await p.evaluate(() => document.querySelectorAll("svg.icon").length) > 0, "the script drew its icons");
      });
      assert.deepEqual([violations, seen], [[], []]);
    });
  }

  test("with a hash for each inline script and style in place of 'unsafe-inline', the scripts all run, and the one thing it cannot drop is style-src-attr 'unsafe-inline'", async () => {
    const html = pages.interactive;
    const hashes = (tag) => inline(html, tag).map(sha).join(" ");
    const strict = (attr) => `default-src 'none'; script-src ${hashes("script")}; style-src ${hashes("style")}${attr ? " ; style-src-attr 'unsafe-inline'" : ""}; font-src data:; img-src data:`;
    const drive = async (p) => { assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark"); await p.locator("[data-theme-toggle]").first().click(); assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "light", "the scripts ran"); };
    const withAttr = await run(html, strict(true), drive);
    assert.deepEqual([withAttr.violations, withAttr.seen], [[], []], "with style-src-attr 'unsafe-inline', nothing is blocked");
    const without = await run(html, strict(false), drive);
    assert.ok(without.violations.length > 0, "without it, the style attributes are blocked");
    assert.deepEqual([...new Set(without.violations.map((v) => v.split(":")[0]))], ["style-src-attr"], "and they are the only thing that is");
  });

  test("the policy in the README is the one this test runs", () => {
    const readme = fs.readFileSync(path.join(here, "..", "README.md"), "utf8");
    assert.ok(readme.includes(POLICY), "the README gives the measured policy");
    assert.ok(readme.includes("style-src-attr 'unsafe-inline'"), "and names the one thing a strict policy cannot drop");
  });
});


// ---- The documented fragment contract: init runs once for the corpus; each refusal has a diagnostic ----

describe("the documented composer contract over every regression body (A5-09)", () => {
  test("Sol build: the known JavaScript limit leaves an author-owned conditional init to the author", async () => {
    const html = page('<h1>Conditional</h1><script>Basalt._.step(999, "probe", () => window.inited = true); if (false) Basalt.init();</script>').html;
    assert.ok(!/<script>Basalt\.init\(\);<\/script>/.test(html), "recognition does not prove that the author's call executes");
    const { page: p, context } = await openHtml(browser, html);
    assert.equal(await p.evaluate(() => window.inited ?? false), false, "this accepted but out-of-contract script did not initialise the page");
    await context.close();
  });
  const PROBES = [
    "", "<h1>x</h1>", '<h1>Report</h1><p data-example="<script>">Text</p>', "<title>Using <svg> in HTML</title><h1>Guide</h1>", "<h1>Guide</h1><textarea><script></textarea>",
    '<h1>Guide</h1><template><script>const example="</template>";</script><style>.inside{color:red}</style><title>Inside</title></template>', "<h1>Guide</h1><svg><![CDATA[</svg><style>.inside{fill:red}</style>]]></svg>",
    '<h1>Before</h1><math><annotation-xml encoding="text/html"><script type="text/plain">"</math>"</script><style>.inside{color:red}</style></annotation-xml></math>', '<math><annotation-xml encoding="application/x-tex"><script>x</annotation-xml></math>',
    "<noscript><style>body{display:none}</style></noscript><h1>After</h1>", "<noscript><svg></noscript><h1>After</h1>", '<style data-label="a>b">p{color:red}</style><p>x</p>', '<script>var s = "<!-- not a comment"; var t = "--> neither";</script><p>after</p>',
    '<script>var a = "<!--<script>"; var b = "</script>";</script>', "<TITLE>Loud</TITLE><H1>x</H1><STYLE>.a{}</STYLE>", "﻿<h1>Report</h1>", '<svg><foreignObject><script>var a = "</svg>";</script></foreignObject></svg>', '<script type="text/template"><svg><style>.t{}</style></script>',
    "<script>var a = 1;</script\t><style>.a{}</style\f><p>x</p>", "<xmp><script></xmp><iframe><style></iframe><noembed><!--</noembed>", '<meta name="description" content="x"><h1>x</h1>', "<h1>Report</h1><!-- note --><p>x</p>", "<svg/><template><p>x</p></template><p>y</p>",
    // Sol's second re-check: accepted (and the init runs once) or refused
    "<h1>How to call Basalt.init()</h1>", '<p title="Basalt.init()">Text</p>', '<script type="text/plain">Basalt.init()</script>', '<svg><foreignObject><p>x</p></foreignObject></svg>', '<math><annotation-xml encoding="text/html"><p>x</p></annotation-xml></math>', "<math><mi><b>x</b></mi></math>",
    ...C2_ACCEPTED,
  ];
  const fixtures = fs.readdirSync(path.join(here, "fixtures")).filter((f) => f.endsWith(".body.html")).map((f) => fixture(f));
  const bad = fs.readdirSync(path.join(here, "fixtures", "compose-bad")).filter((f) => f.endsWith(".body.html")).map((f) => fs.readFileSync(path.join(here, "fixtures", "compose-bad", f), "utf8"));

  test("the two examples, every fixture, the audit's 15 bodies and every probe", async () => {
    let accepted = 0;
    let refused = 0;
    const refusals = new Map(C2_REFUSALS.map(([, body, message]) => [body, message]));
    for (const [name, message] of [["pre-doc", /whole page.*body fragment/], ["unclosed-script", /script.*never closed/], ["unclosed-style", /style.*never closed/], ["unclosed-comment", /comment.*never closed/]]) refusals.set(fs.readFileSync(path.join(here, "fixtures", "compose-bad", name + ".body.html"), "utf8"), message);
    for (const body of [EXAMPLES.static, EXAMPLES.interactive, ...fixtures, ...bad, ...PROBES, ...C2_REFUSALS.map(([, body]) => body)]) {
      const refusal = refusals.get(body);
      if (refusal) { assert.throws(() => compose(body, { fonts: false }), refusal, body); refused++; continue; }
      const composed = compose(body, { fonts: false });
      accepted++;
      const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
      const p = await context.newPage();
      await p.addInitScript(() => {
        let basalt;
        Object.defineProperty(window, "Basalt", { configurable: true, get: () => basalt, set(v) { basalt = v; if (v && typeof v.init === "function") { const init = v.init; v.init = function (...args) { window.__inits = (window.__inits || 0) + 1; return init.apply(this, args); }; } } });
      });
      await context.route("https://basalt.test/", (route) => route.fulfill({ contentType: "text/html", body: composed.html }));
      await p.goto("https://basalt.test/");
      const seen = await p.evaluate(() => ({ inits: window.__inits ?? 0, last: document.scripts[document.scripts.length - 1]?.textContent, parent: document.scripts[document.scripts.length - 1]?.parentElement?.tagName }));
      const own = /<script>Basalt\.init\(\);<\/script>\n<\/body>/.test(composed.html);
      assert.equal(seen.inits, 1, `${JSON.stringify(body.slice(0, 70))}: the page's init ran once`);
      if (own) assert.equal(seen.last, "Basalt.init();", `${JSON.stringify(body.slice(0, 70))}: the last script is the composer's own (its parent may be an open ordinary element)`);
      await context.close();
    }
    assert.ok(accepted >= 40 && refused === 23, `${accepted} accepted, ${refused} refused`);
  });
});
