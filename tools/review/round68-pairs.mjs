// Round 68's pictures for the owner's eye (DECISIONS 320, 6.1 item 6; Fable's pixel review B1): for each item, this build's own shots beside the
// prototype's, in both themes, cropped to the part the item is about and written as JPEGs under assets/round-68, with an index the round imports.
//   npm run review -- 68                                        (the build's shots, into .review/basalt-round-68-screenshots)
//   node tools/review/round68-pairs.mjs <prototype shots> <decision proofs>
//   npm run review -- 68                                        (again, with the pictures in the walkthrough)
// The prototype's shots and the decision's proofs live with the council's papers, outside the repository; only the crops are committed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(HERE, "..", "..", ".review", "basalt-round-68-screenshots");
const [PROTOTYPE, PROOFS] = process.argv.slice(2);
if (!PROTOTYPE || !PROOFS) {
  process.stderr.write("usage: node tools/review/round68-pairs.mjs <prototype shots dir> <decision proofs dir>\n");
  process.exit(2);
}
const OUT = path.join(HERE, "assets", "round-68");

// Each picture: [where, file without -theme.png, crop box in the source's pixels or null for all of it]. The build's shots are 2x.
const SIDEBAR = [0, 1100, 600, 700];
export const PAIRS = [
  { id: "1", build: [["build", "01-foot-1440", SIDEBAR], ["build", "01-foot-current-1440", SIDEBAR]], proto: [["proto", "console-sidebar-1440", [0, 1100, 512, 700]]], extra: [["proofs", "foot-options-1760", null]] },
  { id: "2", build: [["build", "01-foot-hover-820", [0, 1100, 900, 700]], ["build", "01-foot-candidate-820", [0, 1100, 600, 700]]], proto: [] },
  { id: "3", build: [["build", "01-foot-more-390", [0, 900, 780, 900]], ["build", "01-foot-current-more-390", [0, 900, 780, 900]]], proto: [["proto", "console-more-390", [0, 788, 780, 900]]] },
  { id: "4", build: [["build", "01-foot-1440", [0, 0, 600, 1800]], ["build", "01-foot-more-390", [0, 900, 780, 900]]], proto: [["proto", "console-sidebar-1440", null], ["proto", "console-sidebar-seen-1440", null], ["proto", "console-menu-1440", null]] },
  { id: "5", build: [["build", "03-changelog-action-1440", [240, 0, 2400, 1800]], ["build", "03-changelog-action-390", null]], proto: [["proto", "changelog-1440", [240, 4200, 2400, 5400]]] },
  { id: "6", build: [["build", "02-release-notes-all-1440", [512, 0, 2368, 1800]], ["build", "02-release-notes-all-390", null]], proto: [["proto", "console-full-1440", [512, 0, 2368, 3078]], ["proto", "console-full-390", [0, 0, 780, 2400]]] },
  { id: "7", build: [["build", "03-changelog-1440", [0, 0, 2880, 1800]], ["build", "03-changelog-390", [0, 0, 780, 1800]]], proto: [["proto", "changelog-filter-1440", [0, 0, 2880, 1800]], ["proto", "changelog-filter-390", [0, 0, 780, 1800]]] },
  { id: "8", build: [["build", "03-changelog-action-1440", [240, 0, 2400, 1200]]], proto: [] },
  { id: "10", build: [["build", "03-changelog-action-1440", [270, 0, 1650, 1800]], ["build", "03-changelog-action-390", null]], proto: [["proto", "changelog-provcrop-1440", null]] },
  { id: "11", build: [["build", "04-sources-sources-1440", [700, 200, 2180, 1600]]], proto: [["proto", "changelog-provenance-1440", [700, 200, 2180, 1600]], ["proto", "changelog-made-1440", null], ["proto", "console-about-1440", null]] },
  { id: "12", build: [["build", "04-sources-sources-1440", [700, 200, 2180, 1600]], ["build", "04-sources-sources-none-1440", [700, 200, 2180, 1600]]], proto: [["proto", "changelog-provenance-1440", [700, 200, 2180, 1600]]] },
  { id: "13", build: [["build", "02-release-notes-build-1440", [512, 0, 2368, 1800]], ["build", "02-release-notes-between-1440", [512, 0, 2368, 1800]], ["build", "02-release-notes-build-390", null]], proto: [["proto", "console-build-390", [0, 2400, 780, 1806]]] },
];

const ROOT = { build: BUILD, proto: PROTOTYPE, proofs: PROOFS };
/** Widest a picture is written: the walkthrough draws each column at most about 690 wide, so this is 2x of that. Every source is a 2x shot, so a picture is drawn at half its source width (one scale for both sides), or the column's width where that is less. */
const WIDEST = 1400;

const browser = await chromium.launch();
const page = await browser.newPage();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const index = [];
for (const pair of PAIRS) {
  for (const theme of ["dark", "light"]) {
    for (const [side, list] of [["build", pair.build], ["proto", pair.proto], ["extra", pair.extra ?? []]]) {
      for (const [n, [where, name, box]] of list.entries()) {
        const file = path.join(ROOT[where], `${name}-${theme}.png`);
        if (!fs.existsSync(file)) throw new Error(`${file} is missing`);
        const data = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
        const jpeg = await page.evaluate(async ({ data, box, widest }) => {
          const image = new Image();
          image.src = data;
          await image.decode();
          const [x, y, w, h] = box ?? [0, 0, image.naturalWidth, image.naturalHeight];
          const cw = Math.min(w, image.naturalWidth - x);
          const ch = Math.min(h, image.naturalHeight - y);
          const scale = Math.min(1, widest / cw);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(cw * scale);
          canvas.height = Math.round(ch * scale);
          const context = canvas.getContext("2d");
          context.imageSmoothingQuality = "high";
          context.drawImage(image, x, y, cw, ch, 0, 0, canvas.width, canvas.height);
          return { url: canvas.toDataURL("image/jpeg", 0.82), width: Math.round(cw / 2) };
        }, { data, box, widest: WIDEST });
        const out = `${pair.id}-${side}-${n}-${theme}.jpg`;
        fs.writeFileSync(path.join(OUT, out), Buffer.from(jpeg.url.split(",")[1], "base64"));
        index.push([out, jpeg.width]);
      }
    }
  }
}
await browser.close();
const ident = (name) => `p_${name.replace(/\.jpg$/, "").replace(/-/g, "_")}`;
fs.writeFileSync(path.join(OUT, "index.ts"), `// Written by tools/review/round68-pairs.mjs: the owner's-eye pictures of round 68, this build's beside the prototype's, each with the width it is drawn at.\n${index.map(([name]) => `import ${ident(name)} from "./${name}";`).join("\n")}\n\nexport const PICTURES: Record<string, { src: string; width: number }> = {\n${index.map(([name, width]) => `  "${name.replace(/\.jpg$/, "")}": { src: ${ident(name)}, width: ${width} },`).join("\n")}\n};\n`);
process.stdout.write(`${index.length} pictures in ${path.relative(process.cwd(), OUT)}\n`);
