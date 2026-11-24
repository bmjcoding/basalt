// Round 69's pictures of main (DECISIONS 336): the owner's-eye states of this round, built on main by the same tool, cropped to what they draw and
// written as JPEGs under assets/round-69, with an index the round imports; each "before-" state then shows main's picture beside this branch's live part.
//   (in a worktree of main, with this round's files copied in)  node tools/review/build.mjs 69 --out <dir>
//   node tools/review/round69-pairs.mjs <dir>/basalt-round-69-screenshots
//   npm run review -- 69
// Only the owner's-eye steps are drawn into the walkthrough; every step's main shots go into the screenshots zip beside this branch's (`before/`).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [SHOTS] = process.argv.slice(2);
if (!SHOTS) {
  process.stderr.write("usage: node tools/review/round69-pairs.mjs <main's basalt-round-69-screenshots dir>\n");
  process.exit(2);
}
const OUT = path.join(HERE, "assets", "round-69");
/** The steps whose main pictures are drawn into the walkthrough: the owner's eye. */
const OWNERS = ["eye-01-search", "eye-02-filter", "eye-03-legend", "eye-04-composer", "eye-05-copy", "eye-06-command", "eye-07-chips", "eye-08-count", "eye-09-toast", "eye-13-select", "eye-14-go", "eye-11-headline"];
/** Widest a picture is written (2x of the walkthrough's widest column), as round 68's. */
const WIDEST = 2000;

const files = fs.readdirSync(SHOTS).filter((f) => f.endsWith(".png") && !f.startsWith("00-"));
const browser = await chromium.launch();
const page = await browser.newPage();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const entries = [];
for (const file of files) {
  const m = /^\d\d-(.+)-(\d+)-(dark|light)\.png$/.exec(file);
  if (!m) continue;
  const [, rest, width, theme] = m;
  const step = OWNERS.find((id) => rest === id || rest.startsWith(`${id}-`));
  if (!step) continue;
  const state = rest === step ? "default" : rest.slice(step.length + 1);
  const data = `data:image/png;base64,${fs.readFileSync(path.join(SHOTS, file)).toString("base64")}`;
  // Cropped to what differs from the page's own ground (its top-left pixel), with 32px of it kept round, so a picture is the part and not the page.
  const out = await page.evaluate(async ({ data, widest }) => {
    const image = new Image();
    image.src = data;
    await image.decode();
    const w = image.naturalWidth, h = image.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.drawImage(image, 0, 0);
    const px = x.getImageData(0, 0, w, h).data;
    const ground = [px[0], px[1], px[2]];
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y += 2) for (let i = 0; i < w; i += 2) {
      const at = (y * w + i) * 4;
      if (Math.abs(px[at] - ground[0]) + Math.abs(px[at + 1] - ground[1]) + Math.abs(px[at + 2] - ground[2]) > 12) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < x0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
    const pad = 32;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + pad); y1 = Math.min(h, y1 + pad);
    const cw = x1 - x0, ch = y1 - y0;
    const scale = Math.min(1, widest / cw);
    const o = document.createElement("canvas");
    o.width = Math.round(cw * scale); o.height = Math.round(ch * scale);
    o.getContext("2d").drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
    return { jpeg: o.toDataURL("image/jpeg", 0.8), width: o.width };
  }, { data, widest: WIDEST });
  const name = `${step}-${state}-${width}-${theme}.jpg`;
  fs.writeFileSync(path.join(OUT, name), Buffer.from(out.jpeg.split(",")[1], "base64"));
  entries.push({ key: `${step}-${state}-${width}-${theme}`, name, width: Math.round(out.width / 2) });
}
await browser.close();
entries.sort((a, b) => a.key.localeCompare(b.key));
const ident = (key) => `p_${key.replace(/[^a-zA-Z0-9]/g, "_")}`;
const index = [
  "// Written by tools/review/round69-pairs.mjs: main's pictures of round 69's owner's-eye states, keyed by step, state, width and theme, each with the width it is drawn at.",
  ...entries.map((e) => `import ${ident(e.key)} from "./${e.name}";`),
  "export const BEFORE: Record<string, { src: string; width: number }> = {",
  ...entries.map((e) => `  ${JSON.stringify(e.key)}: { src: ${ident(e.key)}, width: ${e.width} },`),
  "};",
  "",
].join("\n");
fs.writeFileSync(path.join(OUT, "index.ts"), index);
process.stdout.write(`${entries.length} pictures of main in ${path.relative(process.cwd(), OUT)}\n`);
