// sites/header-markup.mjs: the site header's short markup is finished at build time, and a header that is not in the shape fails the build.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { buildPage, sitesDir } from "../build.mjs";
import { finishHeaders, MENU_GLYPH } from "../header-markup.mjs";

const WHERE = "sites/x/index.body.html";
const header = ({ attrs = "", links = `<li><a href="#a" aria-current="page">Alpha</a></li><li><a href="#b">Beta</a></li>`, action = `<span class="basalt-site-action"><a class="btn" data-variant="primary" href="#go">Go</a></span>`, nav = null } = {}) => `<header class="basalt-chrome basalt-site-header"${attrs}>
  <div class="basalt-site-bar">
    <a class="basalt-site-brand" href="/" aria-label="X home"><span class="basalt-site-brand-mark">X</span></a>
    ${nav ?? (links ? `<nav class="basalt-site-links" aria-label="Primary"><ul>${links}</ul></nav>` : "")}
    <span class="basalt-bar-spacer"></span>
    <div class="basalt-bar-actions"><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button>${action}</div>
  </div>
</header>`;

describe("the header is finished at build time", () => {
  test("the links get their classes, pills and labels, the nav its shared pill, and the bar its Menu button", () => {
    const out = finishHeaders(header(), WHERE);
    assert.ok(out.includes('<span class="basalt-plate" aria-hidden="true" data-state="off"></span><ul class="basalt-site-links-list">'));
    assert.ok(out.includes('<li><a class="basalt-site-link" href="#a" aria-current="page"><span class="basalt-site-pill"><span class="basalt-site-label" data-label="Alpha">Alpha</span></span></a></li>'), "the current link keeps aria-current; the label reserves its 600 width through data-label");
    assert.ok(out.includes('<li><a class="basalt-site-link" href="#b"><span class="basalt-site-pill"><span class="basalt-site-label" data-label="Beta">Beta</span></span></a></li>'));
    assert.match(out, /<button class="btn basalt-site-menu-trigger" type="button" data-variant="ghost" data-icon-only aria-label="Menu" aria-haspopup="dialog" aria-expanded="false">/);
    assert.ok(out.includes(MENU_GLYPH), "the Menu glyph is in the trigger");
    assert.ok(out.indexOf("basalt-site-menu-trigger") > out.indexOf("basalt-site-action"), "after the action, as in React");
  });

  test("the page opening at the top is reported by a snippet straight after the header, except for the solid bar", () => {
    const smoked = finishHeaders(header(), WHERE);
    assert.match(smoked, /<\/header><script>[\s\S]*?document\.currentScript\.previousElementSibling[\s\S]*?data-top[\s\S]*?data-jump/);
    assert.ok(!finishHeaders(header({ attrs: " data-solid" }), WHERE).includes("data-top"), "solid never reports the top");
  });

  test("a header with no links and no action has no Menu button", () => {
    const out = finishHeaders(header({ links: "", action: "" }), WHERE);
    assert.ok(!out.includes("basalt-site-menu-trigger"));
    assert.ok(finishHeaders(header({ links: "" }), WHERE).includes("basalt-site-menu-trigger"), "an action alone is in the menu under 720, so the button is there");
    assert.ok(finishHeaders(header({ action: "" }), WHERE).includes("basalt-site-menu-trigger"));
  });

  test("a menu label the page sets is the button's name", () => {
    assert.match(finishHeaders(header({ attrs: ' data-menu-label="Navigate"' }), WHERE), /aria-label="Navigate"/);
  });

  test("a header that is already finished is left as it is; a page's other markup and its comments are untouched", () => {
    const once = finishHeaders(header(), WHERE);
    const twice = finishHeaders(once, WHERE);
    assert.equal(twice.replace(/<script>[\s\S]*?<\/script>/g, ""), once.replace(/<script>[\s\S]*?<\/script>/g, ""));
    assert.equal((twice.match(/basalt-site-menu-trigger/g) ?? []).length, 1);
    const page = `<!-- <header class="basalt-site-header"> in a comment -->\n<p>x</p>\n${header()}\n<footer>y</footer>`;
    const out = finishHeaders(page, WHERE);
    assert.ok(out.startsWith('<!-- <header class="basalt-site-header"> in a comment -->\n<p>x</p>'));
    assert.ok(out.endsWith("<footer>y</footer>"));
  });

  test("a header that is not in the shape fails the build, naming the page", () => {
    const bad = {
      "a link that sets its own class": header({ links: `<li><a class="mine" href="#a">Alpha</a></li>` }),
      "a link with markup inside": header({ links: `<li><a href="#a"><b>Alpha</b></a></li>` }),
      "a link with no href": header({ links: `<li><a>Alpha</a></li>` }),
      "stray markup between the links": header({ links: `<li><a href="#a">Alpha</a></li><div>x</div>` }),
      "links that are not in one list": header({ nav: `<nav class="basalt-site-links" aria-label="Primary"><a href="#a">Alpha</a></nav>` }),
      "a nav that is not the links": header({ nav: `<nav class="other"><ul><li><a href="#a">Alpha</a></li></ul></nav>` }),
      "no actions": header().replace('<div class="basalt-bar-actions">', '<div class="x">'),
      "a div in the actions": header({ action: `<div class="basalt-site-action"><a class="btn" href="#go">Go</a></div>` }),
    };
    for (const [name, html] of Object.entries(bad)) assert.throws(() => finishHeaders(html, WHERE), (error) => error.message.startsWith(`${WHERE}: the site header`) && /header-markup\.mjs/.test(error.message), name);
    assert.throws(() => finishHeaders(`${header()}\n${header()}`, WHERE), /one site header/);
  });

  test("buildPage fails on such a header, naming the page file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-hm-"));
    const file = path.join(dir, "index.body.html");
    fs.writeFileSync(file, `<title>X</title>\n${header({ links: `<li><a class="mine" href="#a">Alpha</a></li>` })}\n<h1>x</h1>\n`);
    assert.throws(() => buildPage(file), (error) => error.message.includes(file) && /sets its own class/.test(error.message));
  });

  test("the Menu glyph in the build is the one in the script, which the parity test compares with React's", () => {
    const script = fs.readFileSync(path.join(sitesDir, "shared", "site-header.js"), "utf8");
    const inScript = script.match(/menu: '(<svg [^']*<\/svg>)'/)?.[1];
    assert.equal(inScript, MENU_GLYPH);
  });
});
