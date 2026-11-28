// The palette pixel proof (cimip-gaps-3 T9, DECISIONS 403, test 1): the default must not move a pixel.
//
//   node tools/review/palette-proof/run.mjs shoot <repo> <outDir>    bundle fixture.tsx against <repo>/packages/react/dist (npm run build there first)
//                                                                   and shoot it: no palette attribute and data-palette="basalt", dark and light, 1440
//                                                                   and 390 wide, at 2x; at rest, hovered, pressed and focused (every control at once,
//                                                                   by the DevTools protocol's forced pseudo-classes), under more contrast and in forced colours
//   node tools/review/pixel-proof.mjs compare <dirA> <dirB>         then compare main's shots with the branch's, pixel for pixel
//
// React and React DOM come from this checkout for both bundles, so only the package under test differs.
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { launchOptions } from "../../../scripts/chromium-launch.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..", "..");
const require = createRequire(path.join(root, "packages", "react", "package.json"));
const { chromium } = require("playwright");
const esbuild = require("esbuild");

const [command, repoArg, outArg] = process.argv.slice(2);
if (command !== "shoot" || !repoArg || !outArg) {
  console.error("usage: run.mjs shoot <repo> <outDir>");
  process.exit(2);
}
const repo = path.resolve(repoArg);
const out = path.resolve(outArg);
const demo = path.join(repo, "packages", "react", ".demo");
if (!fs.existsSync(path.join(repo, "packages", "react", "dist", "index.js")) || !fs.existsSync(demo)) throw new Error(`build ${repo} first (npm run build)`);
fs.mkdirSync(out, { recursive: true });
const site = fs.mkdtempSync(path.join(path.dirname(out), ".palette-proof-site-"));

await esbuild.build({
  entryPoints: [path.join(here, "fixture.tsx")],
  outfile: path.join(site, "fixture.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "@srasyndicate/basalt": path.join(repo, "packages", "react", "dist", "index.js"),
    react: path.dirname(require.resolve("react/package.json")),
    "react-dom": path.dirname(require.resolve("react-dom/package.json")),
  },
  logLevel: "warning",
});
fs.copyFileSync(path.join(demo, "styles.css"), path.join(site, "styles.css"));
fs.cpSync(path.join(demo, "fonts"), path.join(site, "fonts"), { recursive: true });
fs.writeFileSync(
  path.join(site, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Palette proof</title>
<script>(function(){var q=new URLSearchParams(location.search);var r=document.documentElement;r.setAttribute("data-theme",q.get("theme"));if(q.get("palette")==="basalt")r.setAttribute("data-palette","basalt");r.setAttribute("data-loops","held");})();</script>
<link rel="stylesheet" href="styles.css"><style>body{margin:0;background:var(--basalt-surface-page);color:var(--basalt-text-primary);font-family:var(--basalt-font-family-sans)}#root{padding:24px}</style>
</head><body><div id="root"></div><script type="module" src="fixture.js"></script></body></html>`,
);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const file = path.join(site, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/$/, "/index.html"));
  if (!file.startsWith(site) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

// Every control a state can reach. Forced on all at once: a hover, a press and a focus each paint where they paint.
const TARGETS = "button, a[href], input, textarea, .basalt-select-trigger, .basalt-number-group, .basalt-search-box, .basalt-file-input, .basalt-option-chip, .basalt-choice-card, .basalt-tab, .basalt-segment, .basalt-link-tab, .basalt-page-link";
const STATES = { rest: [], hover: ["hover"], press: ["hover", "active"], focus: ["focus", "focus-visible", "focus-within"] };

const browser = await chromium.launch(launchOptions());
let shots = 0;
if (process.env.STYLES_OF) {
  // A diagnosis: every computed style of the elements a selector matches, for comparing two checkouts.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}?theme=light&palette=none`);
  await page.locator(".basalt-search-box").waitFor();
  const styles = await page.evaluate((selector) => [...document.querySelectorAll(selector)].map((el) => { const cs = getComputedStyle(el); const o = {}; for (const k of cs) o[k] = cs.getPropertyValue(k); const r = el.getBoundingClientRect(); o.rect = [r.x, r.y, r.width, r.height].join(","); return o; }), process.env.STYLES_OF);
  fs.writeFileSync(path.join(out, "styles.json"), JSON.stringify(styles, null, 1));
  await browser.close(); server.close(); process.exit(0);
}
for (const palette of ["none", "basalt"]) {
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      for (const mode of ["screen", "contrast", "forced"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          deviceScaleFactor: 2,
          reducedMotion: "reduce",
          colorScheme: theme,
          ...(mode === "forced" ? { forcedColors: "active" } : {}),
          ...(mode === "contrast" ? { contrast: "more" } : {}),
        });
        const page = await context.newPage();
        await page.goto(`${base}?theme=${theme}&palette=${palette}`);
        await page.locator(".basalt-search-box").waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        const states = mode === "screen" ? Object.keys(STATES) : ["rest"];
        const cdp = await context.newCDPSession(page);
        await cdp.send("DOM.enable");
        await cdp.send("CSS.enable");
        for (const state of states) {
          const { root: doc } = await cdp.send("DOM.getDocument", { depth: -1 });
          const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: doc.nodeId, selector: TARGETS });
          for (const nodeId of nodeIds) await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: STATES[state] });
          await page.waitForTimeout(350);
          await page.screenshot({ path: path.join(out, `${palette}-${theme}-${width}-${mode === "screen" ? state : mode}.png`), fullPage: true, animations: "disabled" });
          shots += 1;
        }
        await context.close();
      }
    }
  }
}
await browser.close();
server.close();
if (!process.env.KEEP_SITE) fs.rmSync(site, { recursive: true, force: true });
else console.log(`site kept: ${site}`);
console.log(`palette proof: ${shots} shots of ${repo} in ${out}`);
