// The sites build and Geist Mono (micro-details m8, X8; DECISIONS 405, 409): buildPage tells compose that a page's scripts draw no mono
// (`scriptsDrawMono: false`) only when the page's own source runs none and every script it includes is on SCRIPTS_WITHOUT_MONO. Node only: no browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { SCRIPTS_WITHOUT_MONO, buildPage, pageScriptsDrawMono, repoRoot, resolveIncludes, sitesDir } from "../build.mjs";
import { finishHeaders } from "../header-markup.mjs";

const MONO_FACE = 'font-family: "Geist Mono";';
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-mono-"));
/** A root with the sites given as { "site/page": body, "site/file.js": text }. */
function makeRoot(files) {
  const root = tmp();
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  return root;
}

describe("the Blacksand homepage", () => {
  const bodyFile = path.join(sitesDir, "blacksand", "index.body.html");
  test("its scripts are vouched for, so compose is told they draw no mono, and the built page has no Geist Mono face", () => {
    const source = fs.readFileSync(bodyFile, "utf8");
    const { includes } = resolveIncludes(finishHeaders(source, bodyFile), { bodyFile, siteDir: path.dirname(bodyFile), sharedDir: path.join(sitesDir, "shared"), brandDir: path.join(repoRoot, "brand") });
    assert.ok(includes.some((include) => include.name === "shared/site-header.js"), "the page includes the header's script");
    assert.equal(pageScriptsDrawMono(source, includes), false, "so it passes scriptsDrawMono: false");
    const page = buildPage(bodyFile);
    assert.equal(page.mono, false);
    assert.ok(!page.html.includes(MONO_FACE), "no Geist Mono face");
    assert.ok(page.html.includes('font-family: "Geist";'), "the Geist face is still there");
  });
});

describe("a page keeps the face when a script could draw mono", () => {
  const cases = {
    "an inline <script> in the body": { "a/index.body.html": "<h1>A</h1>\n<script>document.title = 'A';</script>\n" },
    "an on* attribute in the body": { "a/index.body.html": "<h1>A</h1>\n<button onclick=\"this.textContent = 'x'\">Go</button>\n" },
    "a .js include not on the list": { "a/index.body.html": "<h1>A</h1>\n<!-- @include page.js -->\n", "a/page.js": "document.title = 'A';\n" },
  };
  for (const [what, files] of Object.entries(cases)) {
    test(what, () => {
      const root = makeRoot(files);
      try {
        const page = buildPage(path.join(root, "a", "index.body.html"));
        assert.equal(page.mono, true);
        assert.ok(page.html.includes(MONO_FACE), "the Geist Mono face is inlined");
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }

  test("a page with only listed scripts and no static mono leaves it out; with a <code> it keeps it", () => {
    const root = makeRoot({
      "a/index.body.html": "<h1>A</h1>\n<!-- @include shared/site-header.js -->\n",
      "a/code.body.html": "<h1>A</h1>\n<p>Run <code>npm test</code>.</p>\n<!-- @include shared/site-header.js -->\n",
    });
    try {
      assert.equal(buildPage(path.join(root, "a", "index.body.html")).mono, false);
      assert.equal(buildPage(path.join(root, "a", "code.body.html")).mono, true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

test("every script on SCRIPTS_WITHOUT_MONO, and the header's first-paint script, write no mono text, class or style", () => {
  assert.ok(SCRIPTS_WITHOUT_MONO.length > 0);
  const words = /mono|<code|<kbd|<pre|<samp|font-family/i;
  for (const name of SCRIPTS_WITHOUT_MONO) {
    assert.ok(name.startsWith("shared/"), `${name} is a stand-in under sites/shared`);
    const text = fs.readFileSync(path.join(sitesDir, name), "utf8");
    assert.doesNotMatch(text, words, `${name} names mono, a mono tag or a font family: take it off SCRIPTS_WITHOUT_MONO`);
  }
  // The page source is read before finishHeaders, which adds the header's own first-paint script: it must hold none of them either.
  const bodyFile = path.join(sitesDir, "blacksand", "index.body.html");
  const scripts = finishHeaders(fs.readFileSync(bodyFile, "utf8"), bodyFile).match(/<script>[\s\S]*?<\/script>/g) ?? [];
  for (const script of scripts) assert.doesNotMatch(script, words, "the header's first-paint script names mono");
});
