// audit-fix-c3 (engineering): the package's build, the lint, and documents that state a fact. One test or more per item that changes behaviour; the size
// table and the browser floor have files of their own (bundle.test.mjs, browser-floor.test.mjs), and the tokens' is packages/tokens/test/dtcg-units.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";
import stylelint from "stylelint";

import { minifyCss } from "../minify-css.mjs";
import { bundleFixture, bundleFixtureFromScratch, pkg, sourceStyles } from "./support.mjs";

const repo = path.join(pkg, "..", "..");
const dist = path.join(pkg, "dist");
const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");

// ---- A1-12: the shipped style sheets are the sources without their comments and whitespace ----

test("styles.css and components.css are the sources with their comments and whitespace taken out, and nothing else", () => {
  const tokens = read(repo, "packages", "tokens", "dist", "css", "tokens.css");
  const components = `${read(pkg, "src", "styles", "components.css")}\n${read(repo, "packages", "tokens", "dist", "css", "accents.css")}`;
  assert.equal(read(dist, "styles.css"), minifyCss(`${tokens}\n${components}`));
  assert.equal(read(dist, "components.css"), minifyCss(components));
  assert.equal(sourceStyles(), `${tokens}\n${components}`, "the helper the text tests read is the sheet as it was written");
  for (const name of ["styles.css", "components.css"]) {
    const css = read(dist, name);
    assert.ok(!/\/\*(?!!)/.test(css), `${name} holds a comment`);
    assert.ok(!/\n\s/.test(css), `${name} holds indentation`);
  }
});

test("the transform keeps a legal comment, and changes no value: numbers, selectors and functions are the source's own", () => {
  assert.match(minifyCss("/*! Licence: keep me */\n.a { color: red; }\n/* drop me */\n"), /\/\*! Licence: keep me \*\//);
  assert.ok(!/drop me/.test(minifyCss("/* drop me */\n.a { color: red; }")));
  const css = minifyCss('.a[data-x="y"] { transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1); width: calc(100% - 0.5rem); color: oklch(0.5 0.1 20 / 0.5); }');
  for (const kept of ["0.15s", "cubic-bezier(0.16,1,0.3,1)", "calc(100% - 0.5rem)", "oklch(0.5 0.1 20 / 0.5)"]) assert.ok(css.includes(kept), `${kept} in ${css}`);
});

// ---- A1-14: Text and Heading declare their return type ----

test("composition.d.ts does not write out every HTML attribute for Text and Heading", () => {
  const declaration = read(dist, "composition.d.ts");
  assert.ok(declaration.length < 40_000, `composition.d.ts is ${declaration.length} bytes (it was 188 KB with the inferred return type)`);
  assert.match(declaration, /declare function Text\([^)]*\): React\.JSX\.Element;/);
  assert.match(declaration, /declare function Heading\([^)]*\): React\.JSX\.Element;/);
});

// ---- A1-15: a consumer's build prints no warning, and the package loses nothing ----

test("an app built with esbuild, importing one component from dist, gets no warning", async () => {
  for (const name of ["Button", "Menu", "TimeChart", "CommandMenu"]) {
    const result = await esbuild.build({
      stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
      bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
    });
    assert.deepEqual(result.warnings.map((warning) => `${warning.id}: ${warning.text}`), [], `${name}: a consumer's build warns`);
  }
});

test("dist has no bare import of one of its own chunks, every chunk is still imported by name, and every relative import resolves", () => {
  const files = fs.readdirSync(dist).filter((f) => f.endsWith(".js"));
  const bare = files.flatMap((file) => [...read(dist, file).matchAll(/^import "\.\/[^"]+";$/gm)].map((m) => `${file}: ${m[0]}`));
  assert.deepEqual(bare, []);
  const all = files.map((file) => read(dist, file)).join("\n");
  for (const chunk of files.filter((f) => f.startsWith("chunk-"))) assert.ok(all.includes(`from "./${chunk}"`), `${chunk} is imported by no file`);
  for (const file of files) for (const match of read(dist, file).matchAll(/(?:from\s*|import\s*\()"(\.\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(dist, match[1])), `${file} imports ${match[1]}, which is not in dist`);
});

test("the build's bare-import cleanup would catch a chunk that holds code and nothing imports", () => {
  // The rule in build.mjs: after the bare imports go, a chunk with code that no file imports by name is an error. Keep the test of the test honest:
  // a chunk that is only its directive is the one thing the build removes.
  const onlyDirective = (source) => source.replace(/"use client";|\/\/.*|\s/g, "") === "";
  assert.ok(onlyDirective('"use client";\n'));
  assert.ok(!onlyDirective('"use client";\nvar x = 1;\nexport { x };\n'));
});

// ---- A4-07: the README names every export ----

test("every runtime export is named in the README", async () => {
  const readme = read(pkg, "README.md");
  const exported = Object.keys(await import(pathToFileURL(path.join(dist, "index.js")).href));
  const missing = exported.filter((name) => !new RegExp(`(?<![\\w$])${name.replace(/\$/g, "\\$")}(?![\\w$])`).test(readme));
  assert.deepEqual(missing, [], "add each to packages/react/README.md, in the row of the thing it belongs to");
});

test("the README states the shapes it once got wrong", () => {
  const readme = read(pkg, "README.md");
  assert.ok(!/groups` of `\{ id, label, icon\?/.test(readme), "CommandMenu's groups are { label, commands }");
  assert.match(readme, /`groups` of `\{ label, commands \}`/);
  assert.match(readme, /right, left, bottom or top panel/);
  assert.ok(!/with every component\s+\(`test\/demo\.tsx`\)/.test(readme), "the demo page does not hold every component");
  assert.match(readme, /@srasyndicate\/basalt\/phosphor/, "the Phosphor plugin is documented where an app developer looks");
});

// ---- A4-06, A5-11, A4-08: the lint says what AGENTS.md says ----

const lint = async (code) => {
  const config = (await import(pathToFileURL(path.join(repo, "stylelint.config.mjs")).href)).default;
  const { results } = await stylelint.lint({ code, config, configBasedir: repo, codeFilename: path.join(repo, "probe.css") });
  return results[0].warnings.map((w) => `${w.rule}: ${w.text.replace(/\s*\(.+\)$/, "")}`);
};

test("the lint refuses a raw colour in any case, a raw length or time in any unit, and a raw length in a container query", async () => {
  const caught = [
    ["color: RGB(255 0 0);", "function-disallowed-list"],
    ["color: Oklch(0.5 0.1 20);", "function-disallowed-list"],
    ["width: 30rem;", "unit-disallowed-list"],
    ["width: 3em;", "unit-disallowed-list"],
    ["width: 42ch;", "unit-disallowed-list"],
    ["height: 20vh;", "unit-disallowed-list"],
    ["height: 90dvh;", "unit-disallowed-list"],
    ["height: 100svh;", "unit-disallowed-list"],
    ["width: 12Q;", "unit-disallowed-list"],
    ["width: 1cm;", "unit-disallowed-list"],
    ["width: 1in;", "unit-disallowed-list"],
    ["width: 13pt;", "unit-disallowed-list"],
    ["width: 5px;", "unit-disallowed-list"],
    ["animation: x 1.4s ease infinite;", "unit-disallowed-list"],
    ["transition-duration: 173ms;", "unit-disallowed-list"],
  ];
  for (const [declaration, rule] of caught) assert.ok((await lint(`.a { ${declaration} }`)).some((w) => w.startsWith(rule)), `${declaration} passes the lint`);
  const container = await lint("@container (width < 480px) { .a { color: red; } }");
  assert.ok(container.some((w) => w.startsWith("basalt/container-length")), `a container query's px passes: ${container}`);
  assert.ok((await lint("@container hero (340px <= width < 30rem) { .a { margin: 0; } }")).filter((w) => w.startsWith("basalt/container-length")).length === 2, "every length in the prelude is reported");
});

test("the lint accepts tokens, a token in a container query's name, and an exception that says why", async () => {
  assert.deepEqual(await lint(".a { width: var(--basalt-size-dialog-width); transition: opacity var(--basalt-duration-base) var(--basalt-ease-out); margin: 0 auto; flex: 1 1 0; }"), []);
  assert.deepEqual(await lint("@container (width < %bp-container%) { .a { margin: 0; } }"), []);
  assert.deepEqual(await lint("/* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px); a query cannot read a custom property */\n@container (width < 480px) { .a { margin: 0; } }"), []);
  assert.deepEqual(await lint("/* stylelint-disable-next-line unit-disallowed-list -- one line of a digit strip is 1em */\n.a { height: 1em; }"), []);
});

test("an exception with no reason, or one that disables nothing, fails the lint", async () => {
  assert.ok((await lint("/* stylelint-disable-next-line unit-disallowed-list */\n.a { height: 1em; }")).length > 0, "a disable with no reason passes");
  assert.ok((await lint("/* stylelint-disable-next-line unit-disallowed-list -- nothing here needs it */\n.a { margin: 0; }")).length > 0, "a needless disable passes");
});

test("the exception AGENTS.md shows passes the lint", async () => {
  const agents = read(repo, "AGENTS.md");
  const example = /`(\/\* stylelint-disable-next-line [^`]+ -- reason \*\/)`/.exec(agents);
  assert.ok(example, "AGENTS.md shows an exception comment");
  assert.deepEqual(await lint(`${example[1].replace("-- reason", "-- a reason")}\n.a { height: 1em; }`), [], example[1]);
});

test("a duration that a token holds is written as the token, in React and in the skill", () => {
  const sheets = [
    path.join(pkg, "src", "styles", "components.css"),
    ...fs.readdirSync(path.join(repo, "tools", "html-skill", "src", "modules")).filter((f) => f.endsWith(".css")).map((f) => path.join(repo, "tools", "html-skill", "src", "modules", f)),
    path.join(repo, "tools", "html-skill", "src", "core.css"),
  ];
  const raw = sheets.flatMap((file) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((line, i) => ({ file: path.relative(repo, file), i: i + 1, line })).filter(({ line }) => /(?<![\w.-])0(?:ms|s)\b/.test(line)).map(({ file: f, i, line }) => `${f}:${i}: ${line.trim().slice(0, 80)}`));
  // The skill's tooltip keeps its 0ms: the token takes that module 16 bytes over its own cap (3,200 in modules.json), and a cap is the owner's to raise.
  assert.deepEqual(raw.filter((row) => !row.startsWith("tools/html-skill/src/modules/tooltip.css:")), [], "write 0ms and 0s as var(--basalt-duration-instant)");
});

// ---- A4-15: the Swift literals the token holds ----

test("the Swift views take the dot, the track and the switch's three sizes from Basalt.Size", () => {
  const display = read(repo, "Sources", "BasaltUI", "Display.swift");
  const controls = read(repo, "Sources", "BasaltUI", "Controls.swift");
  assert.ok(!/\.frame\(width: 6, height: 6\)/.test(display) && display.includes(".frame(width: Basalt.Size.dot, height: Basalt.Size.dot)"));
  assert.ok(!/\.frame\(height: 4\)/.test(display) && display.includes(".frame(height: Basalt.Size.track)"));
  assert.ok(!/\.frame\(width: 32, height: 18\)/.test(controls) && controls.includes(".frame(width: Basalt.Size.switchWidth, height: Basalt.Size.switchHeight)"));
  assert.ok(!/\.frame\(width: 14, height: 14\)/.test(controls) && controls.includes(".frame(width: Basalt.Size.switchThumb, height: Basalt.Size.switchThumb)"));
  const tokens = read(repo, "Sources", "BasaltTokens", "Tokens.swift");
  for (const [name, value] of [["dot", 6], ["track", 4], ["switchWidth", 32], ["switchHeight", 18], ["switchThumb", 14]]) assert.match(tokens, new RegExp(`static let ${name}: Double = ${value}\\b`), `${name} is ${value}`);
});

// ---- A5-08: ci:local reports its Node and can start from a fresh worktree ----

test("ci:local names the Node it runs on beside the one ci.yml pins, and warns when the majors differ", async () => {
  const ci = await import(pathToFileURL(path.join(repo, "scripts", "ci-local.mjs")).href);
  const workflow = read(repo, ".github", "workflows", "ci.yml");
  const pinned = ci.pinnedNodeMajor(workflow);
  assert.ok(Number.isInteger(pinned), "ci.yml pins a Node major");
  assert.deepEqual(ci.drift(workflow), { added: [], removed: [] }, "ci.yml and the script agree");
  const same = ci.nodeReport(`v${pinned}.3.1`, pinned);
  assert.equal(same.warn, false);
  assert.match(same.text, new RegExp(`Node v${pinned}\\.3\\.1 here, Node ${pinned} in ci\\.yml`));
  const other = ci.nodeReport(`v${pinned + 4}.0.0`, pinned);
  assert.equal(other.warn, true);
  assert.match(other.text, /major versions differ/);
  assert.equal(ci.nodeReport("v22.1.0", null).warn, true, "no pin to compare with is a warning too");
  assert.equal(ci.pinnedNodeMajor("node-version: '24.x'"), 24);
  assert.equal(ci.pinnedNodeMajor("no version here"), null);
});

test("ci:local still refuses a ci.yml with a step it does not run", async () => {
  const ci = await import(pathToFileURL(path.join(repo, "scripts", "ci-local.mjs")).href);
  const workflow = read(repo, ".github", "workflows", "ci.yml");
  assert.deepEqual(ci.drift(`${workflow}\n      - run: npm run something-new\n`).added, ["npm run something-new"]);
  assert.deepEqual(ci.drift(workflow.replace("      - run: npm run lint\n", "")).removed, ["npm run lint"]);
});

test("ci:local --fresh is in the script and in AGENTS.md's Checks", () => {
  const script = read(repo, "scripts", "ci-local.mjs");
  assert.match(script, /process\.argv\.includes\("--fresh"\)/);
  assert.match(script, /"worktree", "add", "--detach"/);
  assert.match(script, /"worktree", "remove", "--force"/);
  assert.match(read(repo, "AGENTS.md"), /npm run ci:local -- --fresh/);
});

// ---- A1-17: a fixture is its own body, compiled against one copy of the package ----

test("a fixture bundled in the shared context is the text a build from nothing writes, whatever was bundled before it", async () => {
  const bodies = [
    `createRoot(document.getElementById("root")).render(<B.Button>One</B.Button>);`,
    `createRoot(document.getElementById("root")).render(<B.Badge>Two</B.Badge>);`,
    `import { renderToString } from "react-dom/server"; document.body.innerHTML = renderToString(<B.Badge>Three</B.Badge>);`,
    `import * as S from "./dist/shared-element.js"; console.log(S, React.version, flushSync);`,
  ];
  // Concurrent calls queue; each result is its own body's.
  const shared = await Promise.all(bodies.map((body) => bundleFixture(body)));
  // (Only the comment that names the fixture's own module differs: "fixture:basalt-fixture" against "<stdin>".)
  const same = (text) => text.replaceAll("// fixture:basalt-fixture", "// <stdin>");
  for (const [i, body] of bodies.entries()) assert.equal(same(shared[i]), await bundleFixtureFromScratch(body), `fixture ${i}`);
  assert.equal(await bundleFixture(bodies[0]), shared[0], "the same body twice is the same text");
  await assert.rejects(bundleFixture("this is not (valid"), /./, "a body that does not compile fails its own call");
  assert.equal(await bundleFixture(bodies[1]), shared[1], "and the context is still good after it");
});
