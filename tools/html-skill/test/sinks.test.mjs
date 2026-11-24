// The safe-sinks rule (AGENTS.md, "Data is drawn as text, and a destination is checked"; decided 23 Nov 2026 by the owner, Fable, Astra and Muse): one URL
// table run against both safeHrefs, the sink check's planted failures and passing twins, oxlint's sink rules on planted files, the ledger's data-taking
// files in the hostile probe, and LinkTabs refusing before anything hears of a link. Synthetic data only.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { checkAll, checkLedger, checkSource } from "../../../scripts/check-sinks.mjs";
import { hostileBody } from "./support-hostile.mjs";
import { launch, openHtml, repoRoot } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// [input, passes]: a passing value comes back unchanged, a refused one is null.
const URLS = [
  ["javascript:alert(1)", false], ["JavaScript:alert(1)", false], [" javascript:alert(1)", false], ["java\tscript:alert(1)", false], ["data:text/html,<b>x</b>", false],
  ["vbscript:msgbox(1)", false], ["blob:https://x.test/1", false], ["file:///etc/hosts", false], ["sms:+15550100", false], ["", false], ["   ", false], [null, false], [42, false],
  ["//other.example/x", true], ["/x", true], ["?q=1", true], ["#id", true], ["page.html", true], ["mailto:a@b.test", true], ["tel:+1-555-0100", true], ["TEL:+15550100", true],
  ["https://x.test/a", true], ["http://x.test/a", true],
];

describe("safeHref, one table for both runtimes", () => {
  test("React's: the string back for relative, http, https, mailto and tel; null for anything else", async () => {
    const { safeHref } = await import(pathToFileURL(path.join(repoRoot, "packages", "react", "dist", "safe-href.js")).href);
    for (const [input, passes] of URLS) assert.equal(safeHref(input), passes ? input : null, JSON.stringify(input));
  });
  test("the skill's Basalt.safeHref, in a page: the same answers", async () => {
    const { page, context } = await openHtml(browser, compose("<title>t</title><h1>x</h1>", { fonts: false }).html);
    const got = await page.evaluate((urls) => urls.map(([input]) => window.Basalt.safeHref(input)), URLS);
    URLS.forEach(([input, passes], i) => assert.equal(got[i], passes ? input : null, JSON.stringify(input)));
    assert.equal(await page.evaluate(() => window.Basalt._.esc(`<a href="x" title='y'>&</a>`)), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
    assert.deepEqual(await page.evaluate(() => [window.Basalt._.pick("top", ["top", "end"], "end"), window.Basalt._.pick('top" onclick="x', ["top", "end"], "end"), window.Basalt._.pick(undefined, ["a"], "a")]), ["top", "end", "a"]);
    await context.close();
  });
});

describe("the sink check", () => {
  const file = "packages/react/src/planted.tsx";
  const fails = (text, why) => assert.ok(checkSource(file, text).some((p) => why.test(p)), `${why} for:\n${text}\n${checkSource(file, text).join("\n")}`);
  const passes = (text) => assert.deepEqual(checkSource(file, text), [], text);

  test("every kind of sink fails without a reason, and passes with one", () => {
    const sinks = [
      "el.innerHTML = value;", 'el["outerHTML"] = value;', "el.srcdoc = page;", "el.insertAdjacentHTML('beforeend', value);", "document.write(value);", "document.writeln(value);",
      "range.createContextualFragment(value);", "el.setHTMLUnsafe(value);", "el.setAttribute('srcdoc', page);", "const p = { dangerouslySetInnerHTML: { __html: value } };",
      "props.dangerouslySetInnerHTML = value;", "const a = <div dangerouslySetInnerHTML={{ __html: value }} />;", "const f = <iframe title=\"t\" srcDoc={page} />;",
      "location.assign(value);", "window.location.replace(value);", "location.href = value;", "window.location = value;", "window.open(value);", 'parent.postMessage(data, "*");',
    ];
    for (const sink of sinks) {
      fails(sink, /sink .* with no `sink:` reason/);
      passes(`// sink: the test's own value; it is planted; tools/html-skill/test/sinks.test.mjs\n${sink}`);
    }
  });
  test("what is not a sink: literal markup, a checked destination, a named origin", () => {
    passes("el.innerHTML = '';\nel.innerHTML = '<b>x</b>';\nel.innerHTML = `<i></i>` + '<b></b>';");
    passes("if (safeHref(u)) location.href = u;\nconst h = safeHref(v);\nif (h) window.location.assign(h);\nlocation.assign(safeHref(w) ?? '/');\nlocation.assign('/home');");
    passes("const x = _.safeHref(v); if (x !== null) location.assign(x);");
    passes('parent.postMessage(data, "https://app.example");\nwindow.open("https://x.test");');
    fails("let h = safeHref(v);\nh = other;\nlocation.assign(h);", /navigation sink/);
  });
  test("a reason must say where the value comes from, why it is safe, and the test; a stale one fails; tools/review may leave out the test", () => {
    fails("// sink: from props\nel.innerHTML = v;", /needs `sink:/);
    fails("// sink: from props; escaped\nel.innerHTML = v;", /needs `sink:/);
    fails("// sink: a; b; c\nconst quiet = 1;", /above no sink/);
    assert.deepEqual(checkSource("tools/review/round99.tsx", "// sink: a synthetic page; built at review time\nel.innerHTML = v;"), []);
  });
  test("a `//` reason may go on over the lines under it (CIMIP's port, DECISIONS 365): read whole, up to a line that is not one or another sink:", () => {
    passes("// sink: the figure's ink, from the model;\n// every text and attribute is escaped there;\n// test/repo-review.test.mjs\nel.innerHTML = v;");
    passes("const a = 1;\n  // sink: a value from props; escaped by escapeHtml\n  // in the builder; test/x.test.mjs\n  el.innerHTML = v;");
    // The lines after the reason are part of it only while they run on: a line of code ends it, and so does a second reason.
    fails("// sink: from props;\nconst x = 1; // escaped; test/x.test.mjs\nel.innerHTML = v;", /with no `sink:` reason|needs `sink:/);
    fails("// sink: from props; escaped\n// sink: a; b; c\nel.innerHTML = v;", /needs `sink:|above no sink/);
    // A block comment was always read whole; it still is.
    passes("/* sink: from props;\n   escaped; test/x.test.mjs */\nel.innerHTML = v;");
  });
  test("a file it cannot parse fails: the check never passes what it could not read", () => {
    assert.throws(() => checkSource(file, "el.innerHTML = ;"), /does not parse/);
  });
  test("the ledger: a count off either way, a missing entry, an empty reason and a stale entry fail", () => {
    const entry = { count: 2, data: false, takes: "t", safe: "s" };
    assert.deepEqual(checkLedger({ "a.js": 2 }, { "a.js": entry }), []);
    assert.match(checkLedger({ "a.js": 3 }, { "a.js": entry }).join(), /needs its reason reviewed/);
    assert.match(checkLedger({ "a.js": 1 }, { "a.js": entry }).join(), /lower the count/);
    assert.match(checkLedger({ "b.js": 1 }, {}).join(), /no entry/);
    assert.match(checkLedger({ "a.js": 2 }, { "a.js": { ...entry, safe: " " } }).join(), /no "safe"/);
    assert.match(checkLedger({}, { "a.js": entry }).join(), /no sink any more/);
  });
  test("the repo passes it, and npm run lint runs it", async () => {
    assert.deepEqual(checkAll(), []);
    const { LINT } = await import(pathToFileURL(path.join(repoRoot, "scripts", "lint.mjs")).href);
    assert.ok(LINT.some((step) => step.command === "node scripts/check-sinks.mjs"));
  });
  test("each ledger file that takes data is in the hostile-input probe", () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(repoRoot, "tools", "html-skill", "src", "sinks.allowed.json"), "utf8"));
    const probed = new Set(compose(hostileBody(), { fonts: false }).modules);
    for (const [name, entry] of Object.entries(ledger)) {
      if (name.startsWith("$") || !entry.data || name === "core.js") continue;
      const module = path.basename(name, ".js");
      assert.ok(probed.has(module), `${name} takes data and is not in test/support-hostile.mjs`);
    }
  });
});

describe("oxlint's sink rules", () => {
  test("each fails on a planted file", () => {
    const dir = fs.mkdtempSync(path.join(repoRoot, "packages", "react", "src", ".planted-"));
    try {
      const cases = {
        "no-danger.tsx": ["export const A = () => <div dangerouslySetInnerHTML={{ __html: String(1) }} />;", "react(no-danger)"],
        "target-blank.tsx": ['export const A = () => <a href="https://x.test" target="_blank">x</a>;', "react(jsx-no-target-blank)"],
        "script-url.tsx": ['export const A = () => <a href="javascript:void 0">x</a>;', "jsx-no-script-url"],
        "sandbox.tsx": ['export const A = () => <iframe title="t" src="https://x.test" />;', "react(iframe-missing-sandbox)"],
        "new-func.ts": ['export const f = new Function("return 1");', "no-new-func"],
        "post-message.ts": ["export const s = (w: Window) => w.postMessage({ a: 1 });", "require-post-message-target-origin"],
      };
      for (const [name, [text]] of Object.entries(cases)) fs.writeFileSync(path.join(dir, name), text);
      const run = spawnSync(path.join(repoRoot, "node_modules", ".bin", "oxlint"), ["-c", ".oxlintrc.json", path.relative(repoRoot, dir)], { cwd: repoRoot, encoding: "utf8" });
      const out = `${run.stdout}${run.stderr}`;
      for (const [name, [, rule]] of Object.entries(cases)) assert.ok(out.includes(rule) && out.includes(name), `${name}: ${rule} did not fire\n${out}`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

describe("link-tabs", () => {
  test("under 720 a refused link dispatches no event and goes nowhere, and the select shows the page you are on", async () => {
    const html = compose(`<title>t</title><nav class="link-tabs" aria-label="Sections"><ul>
      <li><a class="link-tab" href="/one" aria-current="page"><span>One</span><span class="link-tab-line" aria-hidden="true"></span></a></li>
      <li><a class="link-tab" href="javascript:window.ran=1"><span>Two</span><span class="link-tab-line" aria-hidden="true"></span></a></li></ul>
      <div class="link-tabs-select"><span class="select"><span class="link-tabs-select-label" aria-hidden="true">Go to</span><select class="input" data-size="lg" aria-label="Go to One">
      <option value="/one" selected>One</option><option value="javascript:window.ran=1">Two</option></select></span></div></nav>
      <script>window.heard = []; document.addEventListener("linktabsnavigate", function (e) { window.heard.push(e.detail.href); e.preventDefault(); });</script>`, { fonts: false }).html;
    const { page, context } = await openHtml(browser, html, { width: 390 });
    await page.selectOption(".link-tabs-select select", "javascript:window.ran=1");
    assert.deepEqual(await page.evaluate(() => [window.heard, window.ran, document.querySelector(".link-tabs-select select").value]), [[], undefined, "/one"]);
    await context.close();
  });
});

