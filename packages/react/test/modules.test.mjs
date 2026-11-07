// Properties of the built modules that need no browser: what the declarations name, what loading
// a module does, and what the text planner costs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToString } from "react-dom/server";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

test("no declaration imports Base UI, Phosphor, cmdk, Radix or Shiki", () => {
  const declarations = fs.readdirSync(dist).filter((f) => f.endsWith(".d.ts"));
  assert.ok(declarations.length > 20);
  const offenders = [];
  for (const file of declarations) {
    const source = fs.readFileSync(path.join(dist, file), "utf8");
    for (const match of source.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)) {
      if (/^(@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki)/.test(match[1])) offenders.push(`${file} imports ${match[1]}`);
    }
  }
  assert.deepEqual(offenders, [], "an app's type-check would compile that package's declarations to type a Button");
});

test("importing the syntax module builds no cache", async () => {
  const OriginalMap = globalThis.Map;
  let created = 0;
  try {
    globalThis.Map = class extends OriginalMap {
      constructor(...args) { super(...args); created += 1; }
    };
    await import(pathToFileURL(path.join(dist, "syntax.js")).href);
  } finally {
    globalThis.Map = OriginalMap;
  }
  assert.equal(created, 0);
});

test("a server-rendered TextMorph shows its text, not only its live region", async () => {
  const { TextMorph } = await import(pathToFileURL(path.join(dist, "text-morph.js")).href);
  const html = renderToString(createElement(TextMorph, { text: "Save" }));
  const visible = html.match(/<span aria-hidden="true"[^>]*>([^<]*)<\/span>/);
  assert.equal(visible?.[1], "Save", html);
  assert.match(html, /aria-live="polite">Save</);
});

test("the text planner costs a scan for unchanged and slightly edited text, and is bounded for the rest", async () => {
  const { planTextMorph } = await import(pathToFileURL(path.join(dist, "text-morph.js")).href);
  const plan = (from, to) => planTextMorph(from, to, { previous: Array.from(from, () => 8), next: Array.from(to, () => 8) });
  const time = (fn) => { const start = performance.now(); const result = fn(); return { ms: performance.now() - start, result }; };
  const same = "a".repeat(20_000);
  const unchanged = time(() => plan(same, same));
  assert.ok(unchanged.ms < 250, `identical strings took ${unchanged.ms}ms`);
  assert.equal(unchanged.result.glyphs.filter((g) => g.kind === "stay").length, same.length);

  const edited = same.slice(0, 10_000) + "b" + same.slice(10_001);
  const oneEdit = time(() => plan(same, edited));
  assert.ok(oneEdit.ms < 250, `one edit took ${oneEdit.ms}ms`);
  assert.equal(oneEdit.result.glyphs.filter((g) => g.kind === "stay").length, same.length - 1);
  assert.equal(oneEdit.result.glyphs.filter((g) => g.kind === "exit").length, 1);
  assert.equal(oneEdit.result.glyphs.filter((g) => g.kind === "enter").length, 1);

  const unrelated = time(() => plan("a".repeat(4_000), "b".repeat(4_000)));
  assert.ok(unrelated.ms < 250, `a complete change took ${unrelated.ms}ms`);
  assert.equal(unrelated.result.glyphs.filter((g) => g.kind === "stay").length, 0);

  const heapBefore = process.memoryUsage().heapUsed;
  plan("ab".repeat(2_000), "ba".repeat(2_000));
  assert.ok(process.memoryUsage().heapUsed - heapBefore < 16 * 1024 * 1024, "the diff table is bounded");
});

test("the planner keeps a shared head and tail in place around an edit", async () => {
  const { planTextMorph } = await import(pathToFileURL(path.join(dist, "text-morph.js")).href);
  const plan = planTextMorph("Save changes", "Save all changes", { previous: Array.from("Save changes", () => 8), next: Array.from("Save all changes", () => 8) });
  const stays = plan.glyphs.filter((g) => g.kind === "stay");
  assert.equal(stays.map((g) => g.char).join(""), "Save changes");
  for (const g of stays.filter((s, i) => i < 5)) assert.equal(g.from, g.to, `${g.char} moved`);
  for (const g of stays.filter((s, i) => i >= 5)) assert.equal(g.to - g.from, 32, `${g.char} shifts by the inserted word`);
  assert.equal(plan.glyphs.filter((g) => g.kind === "enter").map((g) => g.char).join(""), "all ");
});

test("reading the walkthrough: the motion round does not claim to be reviewed", () => {
  const round = fs.readFileSync(path.join(dist, "..", "..", "..", "tools", "review", "round8.tsx"), "utf8");
  assert.match(round, /^\s+reviewed: false,$/m, "round 8 skipped design review and must say so");
});
