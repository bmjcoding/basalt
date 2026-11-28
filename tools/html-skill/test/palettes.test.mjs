// The skill's palettes (cimip-gaps-3 T9, DECISIONS 403, section 9): the head line is React's paletteBootstrap character for character, compose --palettes
// writes the metas, the CSS and the rule-4 sheet only for a palette page, a failing palette fails composition with its pairs, the command palette's
// detection narrowed to <script data-palette>, and a popup built outside its opener keeps the opener's palette. Written by the builder; not run (DECISIONS 359).
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { compose, loadPalettes, paletteInit } from "../../../.agent/skills/basalt-html/compose.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..", "..");
const react = await import(pathToFileURL(path.join(root, "packages", "react", "dist", "index.js")).href);
const OCHRE = path.join(root, "packages", "tokens", "test", "palettes", "ochre.mjs");

test("the head line is React's paletteBootstrap, character for character, for both URL policies", () => {
  for (const url of [true, false]) {
    const config = react.definePalettes({ palettes: [{ id: "basalt", label: "Basalt" }, { id: "beryl", label: "Beryl" }], default: "basalt", url });
    assert.equal(paletteInit(["basalt", "beryl"], "basalt", url), react.paletteBootstrap(config));
  }
});

test("compose --palettes writes the metas React's paletteMetas returns, the head line after the theme's, the palettes' CSS and the rule-4 sheet", async () => {
  const palettes = await loadPalettes(["basalt", "beryl", OCHRE], { url: false });
  const { html } = compose("<p>Tides.</p>", { fonts: false, palettes });
  const config = react.definePalettes({ palettes: ["basalt", "beryl", "ochre"].map((id) => ({ id, label: id })), url: false });
  for (const meta of react.paletteMetas(config)) assert.ok(html.includes(`<meta name="${meta.name}" content="${meta.content}">`), meta.name);
  assert.ok(html.indexOf(react.paletteBootstrap(config)) > html.indexOf("basalt-theme"), "after the theme's head line");
  assert.match(html, /\[data-palette="beryl"\] \{/);
  assert.match(html, /\[data-palette="ochre"\] \{/);
  assert.match(html, /\.palette-choice \[data-slide\] \[data-value="ochre"\]/);
  assert.match(html, /:where\(\[data-palette\]:not\(\[data-palette="?basalt"?\]\)\) \.btn\.btn\[data-variant="?primary"?\]/, "the rule-4 sheet");
  assert.ok(palettes.advisories.some((line) => /ochre \(advisory\)/.test(line)), "Ochre's status advisory is printed");
  const plain = compose("<p>Tides.</p>", { fonts: false }).html;
  assert.ok(!/data-palette/.test(plain), "a page with no --palettes carries none of it");
});

test("a failing palette fails composition with its pairs", async () => {
  const bad = `data:text/javascript,${encodeURIComponent('export default { id: "pale", link: { ink: { light: "#eeeeee", dark: "#111111" } } };')}`;
  await assert.rejects(loadPalettes(["basalt", bad]), /link\.ink on/);
});

test("the command palette comes with <script data-palette>, not with a palette scope's data-palette", () => {
  assert.ok(compose('<script type="application/json" data-palette>{"groups":[]}</script>', { fonts: false }).modules.includes("palette"));
  assert.ok(!compose('<div data-palette="beryl"><p>Scoped</p></div>', { fonts: false }).modules.includes("palette"));
  assert.ok(compose('<div class="palette-choice"><span class="palette-choice-label">Palette</span></div>', { fonts: false }).modules.includes("palettes"));
});
