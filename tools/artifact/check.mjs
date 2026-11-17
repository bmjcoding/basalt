// Renders every preview the reference build wrote (.artifact/project) the way the reference
// page does: tokens.css, bundle.css, React and the bundle preloaded, <html data-theme>. Fails
// on a page error, a console error, or a blank preview, in either theme.
//
//   node tools/artifact/check.mjs [out-dir-for-screenshots]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { chromium } = createRequire(path.join(repo, "packages/react/package.json"))("playwright");
const project = path.join(repo, ".artifact", "project");
const shots = process.argv[2];
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-check-"));

const comps = fs.readdirSync(path.join(project, "components")).filter((d) => fs.existsSync(path.join(project, "components", d, "preview.html")));
const api = JSON.parse(fs.readFileSync(path.join(project, "components/api.json"), "utf8"));
const browser = await chromium.launch();
let failed = 0;
// The bundled third-party code travels with its licence texts (A5-12).
const notices = path.join(project, "components", "THIRD-PARTY-NOTICES.txt");
const noticeText = fs.existsSync(notices) ? fs.readFileSync(notices, "utf8") : "";
const unnamed = ["react", "react-dom", "@base-ui/react", "@phosphor-icons/react", "shiki", "cmdk", "@floating-ui/dom"].filter((name) => !new RegExp(`^${name.replace(/[/@.]/g, "\\$&")} \\d`, "m").test(noticeText));
if (!noticeText || unnamed.length || !/Permission is hereby granted/.test(noticeText)) {
  failed++;
  console.log(`FAIL third-party notices — ${noticeText ? `missing ${unnamed.join(", ") || "the licence text"}` : "components/THIRD-PARTY-NOTICES.txt was not written"}`);
}
for (const theme of ["dark", "light"]) {
  for (const c of comps) {
    const src = fs.readFileSync(path.join(project, "components", c, "preview.html"), "utf8");
    const height = +(src.match(/height=(\d+)/) ?? [0, 120])[1];
    const head = (src.match(/<head>([\s\S]*?)<\/head>/) ?? ["", ""])[1];
    const body = (src.match(/<body>([\s\S]*?)<\/body>/) ?? ["", ""])[1];
    const url = (p) => "file://" + path.join(project, p);
    const html = `<!doctype html><html data-theme="${theme}"><head>${head}<link rel="stylesheet" href="${url("tokens.css")}"><link rel="stylesheet" href="${url("components/bundle.css")}">
<script src="${url("components/lib/react.js")}"></script><script src="${url("components/lib/react-dom.js")}"></script><script src="${url("components/bundle.js")}"></script></head><body>${body}</body></html>`;
    const file = path.join(scratch, `${c}.${theme}.html`);
    fs.writeFileSync(file, html);
    const page = await browser.newPage({ viewport: { width: c === "Cover" ? 960 : 720, height }, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("file://" + file);
    await page.waitForTimeout(500);
    const missing = await page.evaluate((names) => names.filter((name) => !window.Basalt[name]), api.exports);
    if (missing.length) errors.push(`Missing public exports: ${missing.join(", ")}`);
    // blank: nothing drawn at a visible size (text-free previews, like Skeleton, still draw boxes)
    const blank = await page.evaluate(() => ![...document.body.querySelectorAll("*")].some((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2 && el !== document.getElementById("root");
    }));
    if (shots) await page.screenshot({ path: path.join(shots, `${c}.${theme}.png`) });
    const ok = !errors.length && !blank;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${theme} ${c}${errors.length ? ` — ${errors.join(" | ").slice(0, 300)}` : ""}${blank ? " — blank" : ""}`);
    await page.close();
  }
}
await browser.close();
fs.rmSync(scratch, { recursive: true, force: true });
if (failed) {
  console.error(`${failed} preview(s) failed`);
  process.exit(1);
}
