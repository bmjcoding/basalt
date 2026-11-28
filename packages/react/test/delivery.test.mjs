// Rendering and delivery (micro-details m8, X8; DECISIONS 405, 409): the font files are package exports, and FramedArt and PairedArt pass a
// picture's fetch priority to the <img> and nowhere else. Node only, against the built package: no browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { pkg } from "./support.mjs";

const { FramedArt, PairedArt } = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
const FONTS = { "./fonts/Geist-Variable.woff2": "./dist/fonts/Geist-Variable.woff2", "./fonts/GeistMono-Variable.woff2": "./dist/fonts/GeistMono-Variable.woff2", "./fonts/OFL.txt": "./dist/fonts/OFL.txt" };

test("the three font files are exports, and each resolves to a built file in dist/fonts", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
  const require = createRequire(path.join(pkg, "test", "delivery.test.mjs"));
  for (const [subpath, target] of Object.entries(FONTS)) {
    assert.equal(manifest.exports[subpath], target, `${subpath} is exported as ${target}`);
    const file = require.resolve(`${manifest.name}/${subpath.slice(2)}`);
    assert.equal(fs.realpathSync(file), fs.realpathSync(path.join(pkg, target)), `${subpath} resolves to ${target}`);
    assert.ok(fs.statSync(file).size > 0, `${target} is built`);
  }
  // fonts.css asks for the same two files the exports name, so a preload of the export is the stylesheet's own request.
  const fontsCss = fs.readFileSync(path.join(pkg, "dist", "fonts.css"), "utf8");
  for (const file of ["Geist-Variable.woff2", "GeistMono-Variable.woff2"]) assert.ok(fontsCss.includes(`url("./fonts/${file}")`), `fonts.css asks for ./fonts/${file}`);
});

test("FramedArt writes fetchpriority on the <img>, never the <figure>, and nothing without the prop", () => {
  const high = renderToStaticMarkup(createElement(FramedArt, { src: "/a.jpg", alt: "A field at dusk", loading: "eager", fetchPriority: "high" }));
  assert.match(high, /<img [^>]*fetchpriority="high"/i, "the <img> has fetchpriority=high");
  assert.doesNotMatch(high.match(/<figure[^>]*>/)[0], /fetchpriority/i, "the <figure> has none");
  assert.equal((high.match(/<img [^>]*>/g) ?? []).filter((img) => /fetchpriority/i.test(img)).length, 1, "on the one <img> (React may also write its own image preload with the priority; that is not the frame's)");
  const plain = renderToStaticMarkup(createElement(FramedArt, { src: "/a.jpg", alt: "A field at dusk" }));
  assert.doesNotMatch(plain, /fetchpriority/i, "no attribute by default");
  const drawn = renderToStaticMarkup(createElement(FramedArt, { art: createElement("svg"), alt: "" }));
  assert.doesNotMatch(drawn, /fetchpriority/i, "a drawing has nothing to fetch");
});

test("PairedArt writes fetchpriority on both pictures, and nothing without the prop", () => {
  const html = renderToStaticMarkup(createElement(PairedArt, { dark: "/d.jpg", light: "/l.jpg", fetchPriority: "high" }));
  const images = html.match(/<img [^>]*>/g) ?? [];
  assert.equal(images.length, 2);
  for (const img of images) {
    assert.match(img, /fetchpriority="high"/i, "each <img> has fetchpriority=high");
    assert.match(img, /loading="lazy"/, "still lazy by default, so the hidden theme's picture is never fetched");
  }
  assert.doesNotMatch(renderToStaticMarkup(createElement(PairedArt, { dark: "/d.jpg", light: "/l.jpg" })), /fetchpriority/i);
});
