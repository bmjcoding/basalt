// The consumer lint (DECISIONS 404, docs/consumer-lint.md): every rule fails on its fixture and passes on its pair, its messages name the Basalt
// component, prop or token, an exception needs a reason and must excuse something, and the shareable Stylelint config is the policy Basalt's own CSS
// follows plus `basalt/no-restyle`. Needs `npm run build` first (the lint reads the built package's exports and the token release).
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import stylelint from "stylelint";

import { classify, subjectClasses } from "../lint/appearance.mjs";
import { basaltLint, main } from "../lint/run.mjs";
import { rawNumber, rawValues } from "../lint/values.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, "..");
const repo = path.join(pkg, "..", "..");
const fixtures = path.join(here, "fixtures", "consumer-lint");

/** What each failing fixture reports: "line rule", in order. Every `-pass` fixture reports nothing. */
const EXPECTED = {
  "class-fail.tsx": ["7 basalt/no-restyle", "8 basalt/no-restyle", "9 basalt/class-on-component", "10 basalt/class-on-component"],
  "disable-fail.tsx": ["7 basalt/disable", "8 basalt/no-restyle", "9 basalt/disable", "11 basalt/disable"],
  "primitive-fail.tsx": ["2 basalt/primitive", "3 basalt/primitive", "4 basalt/primitive", "5 basalt/primitive", "10 basalt/primitive", "11 basalt/primitive", "12 basalt/primitive", "13 basalt/primitive", "14 basalt/primitive", "15 basalt/primitive"],
  "raw-value-fail.tsx": [...Array(6).fill("4 basalt/raw-value"), "6 basalt/raw-value", "6 basalt/raw-value", "8 basalt/raw-value", "8 basalt/raw-value"],
  "restyle-fail.tsx": ["8 basalt/no-restyle", "9 basalt/no-restyle", "10 basalt/no-restyle", "11 basalt/no-restyle", "12 basalt/no-restyle"],
  "styles-fail.css": ["3 basalt/no-restyle", "7 basalt/no-restyle", "10 basalt/no-restyle", "10 unit-disallowed-list", "13 unit-disallowed-list", "14 color-no-hex", "15 unit-disallowed-list", "16 unit-disallowed-list", "18 unit-disallowed-list", "21 basalt/disable", "23 basalt/disable"],
};

const run = () => basaltLint({ cwd: fixtures, include: ["."], basaltRoot: pkg });
const byFile = (findings) => {
  const out = {};
  for (const f of findings) (out[f.file] ??= []).push(f);
  return out;
};

test("every failing fixture reports what it holds, and every passing one reports nothing", async () => {
  const { files, findings } = await run();
  assert.ok(files.includes("restyle-pass.tsx") && files.includes("styles-pass.css"), "the fixtures were read");
  const got = byFile(findings);
  for (const [file, expected] of Object.entries(EXPECTED)) assert.deepEqual((got[file] ?? []).map((f) => `${f.line} ${f.rule}`), expected, file);
  for (const file of files.filter((f) => /-pass\.|class\.css$/.test(f))) assert.deepEqual(got[file] ?? [], [], `${file} should pass`);
});

test("sources: a Basalt component reached through the app's own barrel is checked when the barrel is listed, and the app's own part never is", async () => {
  const listed = await basaltLint({ cwd: fixtures, include: ["sources"], sources: ["./sources/barrel.ts"], basaltRoot: pkg });
  assert.deepEqual(listed.findings.map((f) => `${f.file}:${f.line} ${f.rule}`), ["sources/through-barrel.tsx:7 basalt/no-restyle"]);
  const unlisted = await basaltLint({ cwd: fixtures, include: ["sources"], basaltRoot: pkg });
  assert.deepEqual(unlisted.findings, []);
});

test("errors and advice: restyles, raw values and bad exceptions fail; a className the lint cannot classify and a competing primitive are advice", async () => {
  const { findings } = await run();
  for (const f of findings) {
    const advisory = f.rule === "basalt/class-on-component" || f.rule === "basalt/primitive";
    assert.equal(f.severity, advisory ? "warning" : "error", `${f.file}:${f.line} ${f.rule}`);
  }
});

test("a fix-it message names the Basalt component, its prop and its values, or the token by role", async () => {
  const got = byFile((await run()).findings);
  const at = (file, line, rule) => got[file].find((f) => f.line === line && f.rule === rule)?.message ?? "";
  // Identity by binding: a direct import, an alias (`Card as Panel` is reported as Card) and a namespace member (`UI.Badge`).
  assert.match(at("restyle-fail.tsx", 8, "basalt/no-restyle"), /`Button`'s `size` prop \("xs" \| "sm" \| "md"[^)]*\); for space between controls, set the parent's `gap`/);
  assert.match(at("restyle-fail.tsx", 9, "basalt/no-restyle"), /on `Card`/);
  assert.match(at("restyle-fail.tsx", 10, "basalt/no-restyle"), /on `Badge`: radius follows the size a box is drawn at/);
  assert.match(at("restyle-fail.tsx", 12, "basalt/no-restyle"), /--basalt-space-4/);
  assert.match(at("raw-value-fail.tsx", 4, "basalt/raw-value"), /React writes 16px\): use var\(--basalt-space-4\) \(16px\)/);
  const raw = got["raw-value-fail.tsx"].map((f) => f.message).join("\n");
  assert.match(raw, /"150ms": use var\(--basalt-duration-base\)/);
  assert.match(raw, /"0\.875rem": use var\(--basalt-text-base-size\) \(14px\)/);
  assert.match(raw, /-8 \(React writes -8px\): use calc\(-1 \* var\(--basalt-space-2\)\)/);
  assert.match(raw, /no radius .* token is 7: the nearest are var\(--basalt-radius-sm\) \(6px\) and var\(--basalt-radius-md\) \(8px\)/);
  assert.match(raw, /fill="#ff0000" on <path> is a raw colour: write fill="currentColor"/);
  assert.match(at("class-fail.tsx", 7, "basalt/no-restyle"), /className "loud-action" on `Button` sets background \(class\.css:6\).*`Button`'s `variant` prop/);
  assert.match(at("styles-fail.css", 3, "basalt/no-restyle"), /"\.jump \.basalt-button" sets background .*`Button`'s `variant` prop/);
  assert.match(at("styles-fail.css", 18, "unit-disallowed-list"), /var\(--basalt-size-breakpoint-md\) \(720px\)/);
  assert.match(at("primitive-fail.tsx", 2, "basalt/primitive"), /use `Dialog` from @srasyndicate\/basalt/);
  assert.match(at("primitive-fail.tsx", 5, "basalt/primitive"), /CaretDownIcon as `ChevronDownGlyph`, CheckIcon as `CheckGlyph`/);
});

test("the command: exit 1 on an error, 0 on advice alone, 2 on a bad option; --max-warnings fails on advice; json prints the findings", async () => {
  const quiet = { out: () => {}, err: () => {} };
  const cwd = process.cwd();
  process.chdir(fixtures);
  try {
    assert.equal(await main(["restyle-fail.tsx"], quiet), 1);
    assert.equal(await main(["restyle-pass.tsx", "styles-pass.css"], quiet), 0);
    assert.equal(await main(["primitive-fail.tsx"], quiet), 0);
    assert.equal(await main(["primitive-fail.tsx", "--max-warnings", "0"], quiet), 1);
    assert.equal(await main(["--no-such-option"], quiet), 2);
    let printed = "";
    await main(["raw-value-fail.tsx", "--format", "json"], { out: (s) => (printed += s), err: () => {} });
    assert.equal(JSON.parse(printed).length, EXPECTED["raw-value-fail.tsx"].length);
  } finally {
    process.chdir(cwd);
  }
});

test("the shareable config is Basalt's own stylesheet policy plus basalt/no-restyle, with Stylelint's reasoned exception", async () => {
  const config = { extends: [pathToFileURL(path.join(pkg, "lint", "stylelint-config.mjs")).pathname] };
  const lint = async (code) => (await stylelint.lint({ code, config, codeFilename: path.join(fixtures, "probe.css") })).results[0].warnings.map((w) => w.rule);
  assert.deepEqual(await lint(".jump .basalt-button { background: var(--basalt-surface-chrome); }"), ["basalt/no-restyle"]);
  assert.deepEqual(await lint(".jump .basalt-button { margin-inline-start: auto; }"), []);
  const text = (await stylelint.lint({ code: ":is(.a, .b) .basalt-button { color: var(--basalt-text-primary); }", config, codeFilename: path.join(fixtures, "probe.css") })).results[0].warnings[0].text;
  assert.match(text, /":is\(\.a, \.b\) \.basalt-button" sets color/, "a selector list inside :is() is one selector");
  assert.deepEqual(await lint(".mask { mask-image: linear-gradient(#000, transparent); }"), ["color-no-hex"]);
  assert.deepEqual(await lint(".a { padding: 16px; }"), ["unit-disallowed-list"]);
  assert.deepEqual(await lint("/* stylelint-disable-next-line basalt/no-restyle -- the recorded exception */\n.jump .basalt-button { background: var(--basalt-surface-chrome); }"), []);
  assert.ok((await lint("/* stylelint-disable-next-line basalt/no-restyle */\n.jump .basalt-button { background: var(--basalt-surface-chrome); }")).length > 0, "a disable with no reason passes");
  // Basalt's own CSS draws these classes: its config has the same design-value rules and no restyle rule.
  const own = (await import(pathToFileURL(path.join(repo, "stylelint.config.mjs")).href)).default;
  const { DESIGN_VALUE_RULES } = await import(pathToFileURL(path.join(pkg, "lint", "stylelint-policy.mjs")).href);
  assert.deepEqual(own.rules, DESIGN_VALUE_RULES);
});

test("appearance and layout: the subject of a selector, and what a declaration does to a component", () => {
  assert.deepEqual(subjectClasses(".jump .basalt-button"), [["basalt-button"]]);
  assert.deepEqual(subjectClasses(".card:has(.basalt-button), .a > .b.basalt-badge:hover"), [["card"], ["b", "basalt-badge"]]);
  assert.deepEqual(subjectClasses(".basalt-row:not(.basalt-row-open)"), [["basalt-row"]]);
  assert.equal(classify("margin-inline-start", "auto"), "layout");
  assert.equal(classify("padding", "var(--basalt-space-2)"), "appearance");
  assert.equal(classify("height", "100%"), "layout");
  assert.equal(classify("height", "100%", { sized: true }), "appearance");
  assert.equal(classify("display", "none"), "layout");
  assert.equal(classify("display", "flex"), "appearance");
  assert.equal(classify("--basalt-stage-room", "0"), "hook");
  assert.equal(classify("--basalt-space-4", "0"), "appearance");
  assert.equal(classify("--app-slot", "1"), "app-property");
});

test("raw values: the stylesheet policy's units and colours, in a string or a React number", () => {
  assert.deepEqual(rawValues("var(--basalt-space-4) calc(100% - 16px)").map((r) => r.text), ["16px"]);
  assert.deepEqual(rawValues("1px solid #fff").map((r) => r.kind), ["length", "colour"]);
  assert.deepEqual(rawValues("url(#mark) var(--basalt-text-red) 1lh 50% 2fr"), []);
  assert.deepEqual(rawValues("opacity 200ms ease-out").map((r) => r.text), ["200ms"]);
  assert.deepEqual(rawValues("oklch(0.5 0 0) red transparent currentColor").map((r) => r.text), ["oklch()", "red"]);
  assert.equal(rawNumber("padding", 16)?.text, "16");
  assert.equal(rawNumber("opacity", 0.5), null);
  assert.equal(rawNumber("line-height", 1.5), null);
  assert.equal(rawNumber("margin", 0), null);
});
