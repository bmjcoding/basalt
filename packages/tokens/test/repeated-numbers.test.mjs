// audit-fix-c8, A5-25 (engineering): a number that a script or a query cannot read from a token is written once, by the build, from the token. These tests hold
// every such number to its token, so changing the token changes the number (or fails here), and no value moves: the numbers below are the ones the sources had.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as durations from "@srasyndicate/basalt-tokens/durations";

const { duration } = durations;

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(repo, ...parts), "utf8");
const json = JSON.parse(read("packages", "tokens", "dist", "json", "tokens.json"));
const px = (name) => Number.parseFloat(json.primitives[name].css);
const ms = (name) => Number.parseFloat(json.primitives[name].css);
const camel = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

test("the breakpoint export is every size-breakpoint token, in pixels", () => {
  const tokens = Object.keys(json.primitives).filter((name) => name.startsWith("size-breakpoint-")).map((name) => name.slice("size-breakpoint-".length));
  assert.deepEqual(Object.keys(breakpoint).sort(), tokens.map(camel).sort(), "a breakpoint token is missing from the export, or the export has one the tokens do not");
  for (const name of tokens) assert.equal(breakpoint[camel(name)], px(`size-breakpoint-${name}`), `breakpoint.${camel(name)} is not size-breakpoint-${name}`);
  assert.deepEqual(breakpoint, { md: 720, lg: 1024, container: 480, containerSm: 340, containerLg: 640 }, "a value moved");
});

test("the duration export is every duration token with a name, in milliseconds", () => {
  const tokens = Object.keys(json.primitives).filter((name) => /^duration-[a-z]+$/.test(name) && json.primitives[name].type === "duration");
  assert.deepEqual(Object.keys(duration).sort(), tokens.map((name) => name.slice("duration-".length)).sort());
  for (const name of tokens) assert.equal(duration[name.slice("duration-".length)], ms(name), `duration.${name} is not the ${name} token`);
  assert.equal(duration.confirm, 1500, "a value moved");
  // Each is a constant of its own too, which a bundler can keep alone (an app that reads CONFIRM_MS does not carry the table).
  for (const name of Object.keys(duration)) assert.equal(durations[`duration${name[0].toUpperCase()}${name.slice(1)}`], duration[name], `durations.duration${name} is not duration.${name}`);
});

// The widths a query may name: the breakpoint tokens, and the two sums the components document: the command list's (its list column, a gap and the
// container breakpoint) and PaneLayout's (B4: the pane sits beside the page from size-sidebar-width + size-gutter + the large container breakpoint).
const WIDTHS = new Set([
  ...Object.values(breakpoint),
  px("size-list-width") + px("space-4") + breakpoint.container,
  px("size-sidebar-width") + px("size-gutter") + breakpoint.containerLg,
]);
const queryNumbers = (css) => [...css.matchAll(/@(?:media|container)\b[^{]*\{/g)].flatMap((query) => [...query[0].matchAll(/(\d+(?:\.\d+)?)px/g)].map((match) => ({ query: query[0].trim(), number: Number(match[1]) })));

test("every pixel width in a media or container query of React's sheet is a breakpoint token (or one of the two documented sums of tokens)", () => {
  const found = queryNumbers(read("packages", "react", "src", "styles", "components.css"));
  assert.ok(found.length > 20, "the scan found no queries");
  for (const { query, number } of found) assert.ok(WIDTHS.has(number), `${query}: ${number}px is not a token`);
});

test("every pixel width in a query of the HTML skill's sources and built parts is a breakpoint token (or the same sums)", () => {
  const sources = fs.readdirSync(path.join(repo, "tools", "html-skill", "src", "modules")).filter((file) => file.endsWith(".css")).map((file) => read("tools", "html-skill", "src", "modules", file));
  const parts = fs.readdirSync(path.join(repo, ".agent", "skills", "basalt-html", "parts")).filter((file) => file.endsWith(".css")).map((file) => read(".agent", "skills", "basalt-html", "parts", file));
  const found = [...sources, read("tools", "html-skill", "src", "core.css"), ...parts].flatMap(queryNumbers);
  assert.ok(found.length > 20, "the scan found no queries");
  for (const { query, number } of found) assert.ok(WIDTHS.has(number), `${query}: ${number}px is not a token`);
  // The sources write the placeholder and the build writes the number: the skill carries no 340 or 640 of its own in a container query.
  for (const source of sources) assert.doesNotMatch(source, /@container\s*\([^)]*\b(?:340|640|480)px/, "a source writes a breakpoint where %bp-…% is read from the token");
});

test("the confirmation's hold: React reads the token, and the skill's copy and terminal scripts get it from the build", () => {
  for (const file of ["confirm.ts", "copy-button.tsx", "terminal.tsx", "feedback.tsx", "constants.ts"]) assert.doesNotMatch(read("packages", "react", "src", file).replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ""), /\b1500\b/, `${file} writes the hold itself`);
  for (const name of ["copy", "terminal"]) {
    const source = read("tools", "html-skill", "src", "modules", `${name}.js`);
    assert.match(source.replace(/\/\*[\s\S]*?\*\//g, ""), /\}, %duration-confirm%\)/, `${name}.js does not read the token`);
    assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\//g, ""), /\b1500\b/, `${name}.js writes the hold itself`);
    const built = read(".agent", "skills", "basalt-html", "parts", `${name}.js`);
    assert.match(built, new RegExp(`\\},${duration.confirm}\\)`), `the built ${name}.js does not hold for the token's ${duration.confirm}ms`);
    assert.ok(!built.includes("%duration-"), `${name}.js has an unreplaced placeholder`);
  }
});
