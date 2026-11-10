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
const css = [
  `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900;font-display:swap}`,
  `@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900;font-display:swap}`,
  fs.readFileSync(path.join(repo, "packages/tokens/dist/css/tokens.css"), "utf8"),
  // The page's own layout sits in a layer below `basalt`, so a rule here can never override a component:
  // an unlayered rule would beat @layer basalt, and once made correct breadcrumbs look broken. `review-options`
  // comes after `basalt` on purpose: it is where a round shows an option the owner has not decided ("Option, not
  // shipped"), scoped to a wrapper that says so.
  "@layer review, basalt, review-options;",
  fs.readFileSync(path.join(reactPkg, "src/styles/components.css"), "utf8"),
  // The accent classes are generated with the tokens; Badge's accent tone reads them.
  fs.readFileSync(path.join(repo, "packages/tokens/dist/css/accents.css"), "utf8"),
  `@layer review {\n${fs.readFileSync(path.join(here, "walkthrough.css"), "utf8")}\n}`,
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

/**
 * The press filmstrip: hold every `[data-wt-film]` button `:active` (Chromium's forced pseudo-state, so no pointer is
 * needed), then seek each button's own colour and scale transitions to the time on its attribute, and write the scale
 * the browser computed under the frame. The frames are the real transition, paused, not a drawing.
 */
async function seekFilmstrip(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument", { depth: 0 });
  const { nodeIds } = await client.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-wt-film]" });
  if (!nodeIds.length) throw new Error("the press filmstrip has no buttons");
  for (const nodeId of nodeIds) await client.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
  const frames = await page.evaluate(() => [...document.querySelectorAll("[data-wt-film]")].map((el) => {
    const time = Number(el.getAttribute("data-wt-film"));
    const running = el.getAnimations().filter((a) => a.transitionProperty === "transform" || a.transitionProperty === "background-color");
    for (const a of running) { a.pause(); a.currentTime = time; }
    const scale = new DOMMatrix(getComputedStyle(el).transform).a;
    el.parentElement.querySelector("[data-wt-film-readout]").textContent = `${time} ms\nscale ${scale.toFixed(3)}`;
    return { time, scale, transitions: running.length };
  }));
  if (frames.some((f) => f.transitions === 0 && f.time > 0)) throw new Error(`the press filmstrip has a button with no running transition: ${JSON.stringify(frames)}`);
  // The scale must fall from 1 to .98 and never overshoot, or the strip is not showing what ships.
  const first = frames.slice(0, 6).map((f) => f.scale);
  if (Math.abs(first[0] - 1) > 1e-4 || Math.abs(first.at(-1) - 0.98) > 1e-4 || first.some((v, i) => i && v > first[i - 1] + 1e-9)) throw new Error(`the press filmstrip's scale is not 1 to .98 and falling: ${first}`);
  return frames;
}

/**
 * The pressed ghost Button in the bar: hold every `[data-wt-pressed]` button `:active` (Chromium's forced pseudo-state,
 * reaching into the shadow root that holds today's stylesheet), then measure each frame: the button's own computed ink
 * over the real composite (plate, bar fill, the button's wash), and write the ratio under it. A frame whose ink is not the
 * one it claims fails the build, so the "before" and "after" cannot be mislabelled.
 */
async function measureGhostPress(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("DOM.enable");
  await client.send("CSS.enable");
  const { root } = await client.send("DOM.getDocument", { depth: -1, pierce: true });
  const found = [];
  const walk = (node) => {
    const attrs = node.attributes ?? [];
    if (attrs.includes("data-wt-pressed")) found.push(node.nodeId);
    for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? []), ...(node.contentDocument ? [node.contentDocument] : [])]) walk(child);
  };
  walk(root);
  if (!found.length) throw new Error("the ghost press has no pressed buttons");
  for (const nodeId of found) await client.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
  await page.waitForTimeout(400);
  const frames = await page.evaluate(() => {
    const deepAll = (selector, scope = document) => [...scope.querySelectorAll(selector), ...[...scope.querySelectorAll("*")].flatMap((el) => (el.shadowRoot ? deepAll(selector, el.shadowRoot) : []))];
    const parent = (el) => el.parentElement ?? el.getRootNode().host ?? null;
    // Exact, unrounded sRGB (the contrast tests are exact too): parse what getComputedStyle writes, in any of the forms
    // Chromium uses for these tokens, rather than reading 8-bit pixels back from a canvas.
    const toSrgb = (css) => {
      const m = css.match(/^(oklab|oklch|rgba?|color)\(([^)]*)\)$/);
      if (!m) throw new Error(`cannot read the colour ${css}`);
      const [body, alpha = "1"] = m[2].split("/").map((x) => x.trim());
      const nums = body.replace(/^srgb\s+/, "").split(/[\s,]+/).map((x) => (x.endsWith("%") ? parseFloat(x) / 100 : parseFloat(x)));
      const a = parseFloat(alpha) / (alpha.endsWith("%") ? 100 : 1);
      const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
      if (m[1] === "rgb" || m[1] === "rgba") return { c: nums.slice(0, 3).map((v) => v / 255), a: nums[3] ?? a };
      if (m[1] === "color") return { c: nums.slice(0, 3), a };
      let [L, A, B] = nums;
      if (m[1] === "oklch") { const hue = (B * Math.PI) / 180; [A, B] = [nums[1] * Math.cos(hue), nums[1] * Math.sin(hue)]; }
      const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, mm = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, ss = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
      const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * ss];
      return { c: lin.map((v) => Math.min(1, Math.max(0, gamma(v)))), a };
    };
    const compose = (layers) => layers.reduce((under, css) => { const { c, a } = toSrgb(css); return under.map((u, i) => c[i] * a + u * (1 - a)); }, [0, 0, 0]);
    const channel = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
    const resolveColor = (token) => { const probe = document.createElement("div"); probe.style.color = `var(--basalt-${token})`; document.body.append(probe); const v = getComputedStyle(probe).color; probe.remove(); return v; };
    const names = { [resolveColor("text-primary")]: "primary ink", [resolveColor("text-secondary")]: "secondary ink" };
    return deepAll("[data-wt-ghost]").map((button) => {
      const kind = button.getAttribute("data-wt-ghost");
      const layers = [];
      for (let el = button; el; el = parent(el)) layers.unshift(getComputedStyle(el).backgroundColor);
      const backdrop = compose(layers);
      const ink = getComputedStyle(button).color;
      const text = compose([...layers, ink]);
      let plate = button;
      while (plate && !plate.hasAttribute?.("data-wt-plate")) plate = parent(plate);
      const value = ratio(text, backdrop);
      const label = deepAll("[data-wt-ratio]", plate).find((n) => n.getAttribute("data-wt-ratio") === kind);
      return { kind, ink: names[ink] ?? ink, value, wash: layers.at(-1), plate: plate.querySelector(".wt-ghost-name").textContent, writeTo: !!label,
        write: (() => { const text = `${names[ink] ?? ink}: ${value.toFixed(2)}:1, ${value >= 4.5 ? "passes" : "fails"} AA`; if (label) label.textContent = text; return text; })() };
    });
  });
  const want = { rest: "secondary ink", before: "secondary ink", after: "primary ink" };
  for (const f of frames) {
    if (f.ink !== want[f.kind]) throw new Error(`the ghost press ${f.kind} frame shows ${f.ink}, not ${want[f.kind]}: ${JSON.stringify(f)}`);
    if (!f.writeTo) throw new Error(`no ratio label for the ${f.kind} frame`);
  }
  if (frames.length !== 6) throw new Error(`expected 3 frames on 2 plates, found ${frames.length}`);
  console.log(`ghost press (${await page.evaluate(() => document.documentElement.dataset.theme)}): ${frames.map((f) => `${f.plate} ${f.kind} ${f.write}`).join("; ")}`);
  return frames;
}

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

  // Every step and state at the desktop width and at a phone's 390px, in both themes.
  let n = 1;
  for (const step of meta) {
    for (const state of ["default", ...step.states]) {
      for (const [width, tag] of [[960, ""], [390, "-390"]]) {
        for (const theme of ["dark", "light"]) {
          const overlay = !["default", "film", "ghost", "frames", "reduced-motion", "forced-colours", "forced-mixed", "hover", "focus", "sorted-asc", "one-row", "empty", "scrolled", "chips-on", "clear-focus"].includes(state); // these are pages, not open overlays
          // Media states are real emulations. "forced-mixed" puts the opposite palette under the authored theme. A state that
          // ends in one of them (an open menu "menu-forced-colours-lit") takes the same emulation, with or without "-lit".
          const mode = state.replace(/-lit$/, "");
          const media = mode.endsWith("forced-colours") ? { forcedColors: "active", colorScheme: theme } : mode.endsWith("forced-mixed") ? { forcedColors: "active", colorScheme: theme === "dark" ? "light" : "dark" } : mode.endsWith("reduced-motion") ? { reducedMotion: "reduce" } : {};
          const page = await browser.newPage({ viewport: { width, height: overlay ? 640 : 400 }, deviceScaleFactor: 2, ...media });
          page.on("pageerror", (e) => errors.push(`${step.id}/${state}/${theme}: ${e.message}`));
          // Enabling the CSS agent (the filmstrip needs it to hold :active) makes the inspector re-read the page's own file:
          // stylesheet, which Chromium logs as an unsafe file: load. It is the tooling's, not the page's, so only that is skipped.
          const inspectorNoise = (text) => (state === "film" || state === "ghost") && /^Unsafe attempt to load URL file:/.test(text);
          page.on("console", (m) => m.type() === "error" && !inspectorNoise(m.text()) && errors.push(`${step.id}/${state}/${theme}: ${m.text()}`));
          await page.goto(url({ step: step.id, theme, state, shot: "1" }));
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(overlay ? 700 : 300);
          // "forced" is Windows forced-colours mode; a state ending in "-lit" (or "forced") hovers the second row of the first
          // popup, because the plate and the lift are what a pointer holds and a screenshot cannot.
          if (state === "forced") await page.emulateMedia({ forcedColors: "active" });
          if (state.endsWith("-lit") || state === "forced") {
            await page.locator(".basalt-menu-item, [cmdk-item]").nth(1).hover();
            await page.waitForTimeout(250);
          }
          // "-glide": the pointer rests on the first row, then moves to the fourth; the plate's move is held 60ms into its 150ms.
          // "-fade": the pointer rests on the third row and leaves the popup; the fade is held 40ms into its 100ms. These are the
          // real transitions, paused, not drawings.
          if (state.endsWith("-glide") || state.endsWith("-fade")) {
            const rows = page.locator(".basalt-menu-item, [cmdk-item]");
            await rows.nth(state.endsWith("-glide") ? 0 : 2).hover();
            await page.waitForTimeout(300);
            if (state.endsWith("-glide")) await rows.nth(3).hover();
            else await page.mouse.move(2, 2);
            await page.waitForTimeout(state.endsWith("-glide") ? 20 : 15);
            const held = await page.evaluate((kind) => {
              const plate = document.querySelector(".basalt-plate");
              const property = kind === "glide" ? "transform" : "opacity";
              const running = plate.getAnimations().filter((a) => a.transitionProperty === property);
              for (const a of running) { a.pause(); a.currentTime = kind === "glide" ? 60 : 40; }
              return running.length;
            }, state.endsWith("-glide") ? "glide" : "fade");
            if (!held) throw new Error(`${step.id}/${state}: the plate has no ${state.endsWith("-glide") ? "move" : "fade"} to hold`);
          }
          // "hover" puts a real pointer on the element that marks itself `data-wt-hover` (round 17's Region header).
          if (state === "hover") {
            await page.locator("[data-wt-hover]").first().hover();
            await page.waitForTimeout(250);
          }
          if (state === "film") await seekFilmstrip(page);
          if (state === "ghost") await measureGhostPress(page);
          const name = `${String(n).padStart(2, "0")}-${step.id}${state === "default" ? "" : `-${state}`}${tag}-${theme}.png`;
          await page.screenshot({ path: path.join(dir, name), fullPage: !overlay });
          await page.close();
        }
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
