// Works out each mark's view box from its artwork once, and records it in manifest.json (DECISIONS 292, 2.3): each form is drawn in Chromium at
// 2048px on its longer side and the box is the smallest one that holds every pixel it inks, stroke, clip and all, outward to a hundredth of a unit.
// The numbers are then the manifest's, so generate.mjs makes the same files on every machine. Run it when a source file is added or replaced:
// node packages/react/marks/fit.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { launchOptions } from "../../../scripts/chromium-launch.mjs";
import { dataUri, strip, swap } from "./clean.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestFile = path.join(here, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const read = (file) => fs.readFileSync(path.join(here, "source", file), "utf8");
const SIDE = 2048;

const browser = await chromium.launch(launchOptions());
const page = await browser.newPage();
await page.setContent("<!doctype html><canvas></canvas>");
const bounds = (uri) => page.evaluate(async ({ uri, side }) => {
  const img = new Image();
  img.src = uri;
  await img.decode();
  const vb = new DOMParser().parseFromString(decodeURIComponent(uri.slice(uri.indexOf(",") + 1)), "image/svg+xml").documentElement.getAttribute("viewBox").split(/[\s,]+/).map(Number);
  const scale = side / Math.max(vb[2], vb[3]);
  const w = Math.ceil(vb[2] * scale), h = Math.ceil(vb[3] * scale);
  const canvas = document.querySelector("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let l = w, t = h, r = -1, b = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
  const down = (v) => Math.floor(v * 100) / 100, up = (v) => Math.ceil(v * 100) / 100;
  const x0 = down(vb[0] + l / scale), y0 = down(vb[1] + t / scale), x1 = up(vb[0] + (r + 1) / scale), y1 = up(vb[1] + (b + 1) / scale);
  return [x0, y0, Math.round((x1 - x0) * 100) / 100, Math.round((y1 - y0) * 100) / 100];
}, { uri, side: SIDE });

for (const mark of manifest.marks) {
  mark.viewBox = {};
  const changes = new Set();
  for (const form of ["light", "dark"]) {
    const file = mark.forms[form] === "swapped" ? mark.forms.light : mark.forms[form];
    let svg = strip(read(file));
    if (svg !== read(file).replace(/>\s+</g, "><").trim()) changes.add("stripped");
    if (mark.forms[form] === "swapped") { svg = swap(svg, mark.swap.from, mark.swap.to); changes.add("swapped"); }
    mark.viewBox[form] = await bounds(dataUri(svg));
    changes.add("fitted");
  }
  mark.changes = ["stripped", "fitted", "swapped"].filter((c) => changes.has(c));
  console.log(mark.id.padEnd(32), JSON.stringify(mark.viewBox), mark.changes.join(", "));
}
await browser.close();
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 1)}\n`);
