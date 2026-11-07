// Builds a review round's walkthrough and screenshots:
//
//   npm run build                          (tokens and components first)
//   node tools/review/build.mjs [round…] [--out dir]     default: every round, .review/
//
// For each round writes:
//   basalt-round-<n>-walkthrough.html  one self-contained, offline page: every component live,
//                                      both themes, what review decided and what to try
//   basalt-round-<n>-screenshots.zip   every step in dark and light at 2x, plus open states
//
// The rounds and their words are in rounds.tsx.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { inlineScript } from "../inline-script.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const reactPkg = path.join(repo, "packages", "react");
const require = createRequire(path.join(reactPkg, "package.json"));
const esbuild = require("esbuild");
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const out = path.resolve(outAt >= 0 ? args[outAt + 1] : path.join(repo, ".review"));
const wanted = args.filter((a, i) => !a.startsWith("--") && (outAt < 0 || i !== outAt + 1));
fs.mkdirSync(out, { recursive: true });

// ---- the page, once per round

const bundle = await esbuild.build({
  entryPoints: [path.join(here, "walkthrough.tsx")],
  bundle: true,
  format: "iife",
  minify: true,
  jsx: "automatic",
  target: "es2020",
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: [path.join(repo, "node_modules")],
  loader: { ".png": "dataurl" },
  logLevel: "warning",
});
const js = inlineScript(bundle.outputFiles[0].text);

// read the round list from the bundled module's source of truth, without running React
const roundIds = fs
  .readdirSync(here)
  .filter((f) => f.endsWith(".tsx"))
  .flatMap((f) => [...fs.readFileSync(path.join(here, f), "utf8").matchAll(/(?:export )?const ROUND_\w+: Round = \{\s*id: "([^"]+)"/g)].map((m) => m[1]))
  .sort();
const rounds = wanted.length ? roundIds.filter((r) => wanted.includes(r)) : roundIds;
if (!rounds.length) throw new Error(`no such round; rounds are ${roundIds.join(", ")}`);

const font = (file) => fs.readFileSync(path.join(reactPkg, "dist", "fonts", file)).toString("base64");
const displayFace = (family, file, weight, style) => {
  const data = fs.readFileSync(path.join(repo, "docs/fonts", file)).toString("base64");
  return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:${weight};font-style:${style};font-display:swap}`;
};
const css = [
  `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900;font-display:swap}`,
  `@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900;font-display:swap}`,
  displayFace("Instrument Serif", "InstrumentSerif-Regular.woff2", 400, "normal"),
  displayFace("Instrument Serif", "InstrumentSerif-Italic.woff2", 400, "italic"),
  displayFace("Newsreader", "Newsreader-Regular.woff2", 400, "normal"),
  displayFace("Newsreader", "Newsreader-SemiBold.woff2", 600, "normal"),
  displayFace("Fraunces", "Fraunces-Regular.woff2", 400, "normal"),
  displayFace("Fraunces", "Fraunces-SemiBold.woff2", 600, "normal"),
  fs.readFileSync(path.join(repo, "packages/tokens/dist/css/tokens.css"), "utf8"),
  fs.readFileSync(path.join(reactPkg, "src/styles/components.css"), "utf8"),
  fs.readFileSync(path.join(here, "walkthrough.css"), "utf8"),
].join("\n");

const pages = {};
for (const id of rounds) {
  const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Basalt review · Round ${id}</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>window.__BASALT_ROUND__ = ${JSON.stringify(id)};</script>
<script>${js}</script>
</body>
</html>
`;
  const file = path.join(out, `basalt-round-${id}-walkthrough.html`);
  fs.writeFileSync(file, html);
  pages[id] = file;
  console.log(`${path.relative(repo, file)}  ${(html.length / 1024).toFixed(0)} KB`);
}

// ---- screenshots

const browser = await chromium.launch();
for (const id of rounds) {
  const dir = path.join(out, `basalt-round-${id}-screenshots`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const url = (q) => `file://${pages[id]}?${new URLSearchParams(q)}`;
  const errors = [];

  // the walkthrough itself, first step, both themes
  for (const theme of ["dark", "light"]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url({ theme }));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(dir, `00-walkthrough-${theme}.png`), fullPage: true });
    await page.close();
  }

  // each step: the steps and their extra states, read from the page
  const probe = await browser.newPage();
  await probe.goto(url({ theme: "dark" }));
  const meta = await probe.evaluate(() => window.__BASALT_STEPS__);
  const steps = await probe.evaluate(() => [...document.querySelectorAll(".wt-rail-item")].map((b) => b.textContent));
  await probe.close();
  if (meta.length !== steps.length) throw new Error(`round ${id}: ${meta.length} steps, page shows ${steps.length}`);

  let n = 1;
  for (const step of meta) {
    for (const state of ["default", ...step.states]) {
      for (const theme of ["dark", "light"]) {
        const overlay = state !== "default";
        const page = await browser.newPage({ viewport: { width: 960, height: overlay ? 640 : 400 }, deviceScaleFactor: 2 });
        page.on("pageerror", (e) => errors.push(`${step.id}/${state}/${theme}: ${e.message}`));
        page.on("console", (m) => m.type() === "error" && errors.push(`${step.id}/${state}/${theme}: ${m.text()}`));
        await page.goto(url({ step: step.id, theme, state, shot: "1" }));
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(overlay ? 700 : 300);
        const name = `${String(n).padStart(2, "0")}-${step.id}${state === "default" ? "" : `-${state}`}-${theme}.png`;
        await page.screenshot({ path: path.join(dir, name), fullPage: !overlay });
        await page.close();
      }
    }
    n++;
  }
  if (errors.length) throw new Error(`round ${id}: page errors:\n${errors.join("\n")}`);

  const zip = `${dir}.zip`;
  fs.rmSync(zip, { force: true });
  execFileSync("python3", ["-I", "-c", "import sys,zipfile,os\nd=sys.argv[1]\nwith zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED) as z:\n  [z.write(os.path.join(d,f),os.path.join(os.path.basename(d),f)) for f in sorted(os.listdir(d))]", dir, zip]);
  console.log(`${path.relative(repo, zip)}  ${fs.readdirSync(dir).length} screenshots`);
}
await browser.close();
