// Proof that a change moved no pixel. Two commands:
//
//   node tools/review/pixel-proof.mjs demo <repo> <outDir>     serve <repo>/packages/react/.demo (npm run build first) and screenshot the
//                                                              test demo page, full page, in dark and light at 1440 and 390 wide, at 1x, loops held,
//                                                              at rest and in forced colours
//   node tools/review/pixel-proof.mjs compare <dirA> <dirB>    compare every PNG of dirA with the PNG of the same name in dirB, pixel for pixel,
//                                                              and print the count of differing pixels per image
//
// Typical use, with main checked out beside the branch and both built:
//
//   node tools/review/pixel-proof.mjs demo ../main /tmp/demo-main && node tools/review/pixel-proof.mjs demo . /tmp/demo-branch
//   node tools/review/pixel-proof.mjs compare /tmp/demo-main /tmp/demo-branch
//   node tools/review/build.mjs 20 21 22 23 24 25 26 --out /tmp/rounds-main     (in main's checkout; again in the branch's, --out /tmp/rounds-branch)
//   node tools/review/pixel-proof.mjs compare /tmp/rounds-main/basalt-round-20 /tmp/rounds-branch/basalt-round-20     (and so on for each round)
//
// `compare` exits 1 if any image differs, differs in size, or has no partner. A pixel differs when any channel differs at all.

import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "..", "packages", "react", "package.json"));
const { chromium } = require("playwright");

const [command, a, b] = process.argv.slice(2);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };

async function demo(repo, out) {
  const root = path.join(path.resolve(repo), "packages", "react", ".demo");
  if (!fs.existsSync(root)) throw new Error(`no ${root}; run npm run build in that checkout`);
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
    if (!file.startsWith(root) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
     // The page at rest, and again in Windows forced colours (the page's own palette, so each theme is shot as the dark and light forced palettes).
     for (const forced of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce", ...(forced ? { forcedColors: "active", colorScheme: theme } : {}) });
      await page.goto(`${base}?theme=${theme}`);
      await page.getByRole("heading", { name: "Basalt components" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Hold every loop (the page's own `data-loops="held"`): a skeleton's pulse or a spinner would otherwise be caught at a different frame each time.
      await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(out, `demo-${theme}-${width}${forced ? "-forced" : ""}.png`), fullPage: true });
      await page.close();
     }
    }
  }
  await browser.close();
  server.close();
}

async function compare(dirA, dirB) {
  const names = [...new Set([...fs.readdirSync(dirA), ...fs.readdirSync(dirB)])].filter((f) => f.endsWith(".png")).sort();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let bad = 0;
  let same = 0;
  for (const name of names) {
    const fileA = path.join(dirA, name);
    const fileB = path.join(dirB, name);
    if (!fs.existsSync(fileA) || !fs.existsSync(fileB)) { console.log(`MISSING  ${name} (only in ${fs.existsSync(fileA) ? dirA : dirB})`); bad += 1; continue; }
    const result = await page.evaluate(async ([x, y]) => {
      const load = async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0); return { w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data }; };
      const p = await load(x);
      const q = await load(y);
      if (p.w !== q.w || p.h !== q.h) return { size: [p.w, p.h, q.w, q.h] };
      let differing = 0;
      let [x0, y0, x1, y1] = [p.w, p.h, -1, -1];
      for (let i = 0; i < p.data.length; i += 4) {
        if (p.data[i] === q.data[i] && p.data[i + 1] === q.data[i + 1] && p.data[i + 2] === q.data[i + 2] && p.data[i + 3] === q.data[i + 3]) continue;
        differing += 1;
        const x = (i / 4) % p.w;
        const y = Math.floor(i / 4 / p.w);
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
      return { differing, total: p.w * p.h, box: differing ? [x0, y0, x1, y1] : null };
    }, [fs.readFileSync(fileA).toString("base64"), fs.readFileSync(fileB).toString("base64")]);
    if (result.size) { console.log(`SIZE     ${name}: ${result.size[0]}x${result.size[1]} against ${result.size[2]}x${result.size[3]}`); bad += 1; }
    else if (result.differing) { console.log(`DIFFERS  ${name}: ${result.differing} of ${result.total} pixels, within x ${result.box[0]}–${result.box[2]}, y ${result.box[1]}–${result.box[3]}`); bad += 1; }
    else same += 1;
  }
  await browser.close();
  console.log(`${names.length} images: ${same} identical (0 differing pixels), ${bad} not`);
  if (bad) process.exitCode = 1;
}

if (command === "demo" && a && b) await demo(a, b);
else if (command === "compare" && a && b) await compare(a, b);
else { console.error("usage: pixel-proof.mjs demo <repo> <outDir> | compare <dirA> <dirB>"); process.exitCode = 2; }
