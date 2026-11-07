// Renders both templates of the Basalt HTML skill to .review/html-skill/: 1440 and 390 wide, dark and light, at 2x.
// The pages are copies of the committed templates with inline-fonts.mjs run on them, as a person's file would be, so the
// screenshots show Geist. Run: node tools/html-skill/shoot.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { skillDir } from "./build.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(repo, ".review", "html-skill");
fs.mkdirSync(out, { recursive: true });

const pages = { static: "template-static.html", interactive: "template-interactive.html" };
for (const file of Object.values(pages)) {
  fs.copyFileSync(path.join(skillDir, file), path.join(out, file));
  execFileSync(process.execPath, [path.join(skillDir, "inline-fonts.mjs"), path.join(out, file)], { stdio: "inherit" });
}

const browser = await chromium.launch();
for (const [name, file] of Object.entries(pages)) {
  for (const [label, viewport, mobile] of [["1440", { width: 1440, height: 900 }, false], ["390", { width: 390, height: 844 }, true]]) {
    for (const scheme of ["dark", "light"]) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: scheme, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(`file://${path.join(out, file)}`);
      await page.evaluate(() => document.fonts.ready);
      // Size the viewport to the page instead of fullPage: a full-page capture on a phone context drops its touch media features.
      await page.setViewportSize({ width: viewport.width, height: await page.evaluate(() => document.documentElement.scrollHeight) });
      await page.screenshot({ path: path.join(out, `${name}-${label}-${scheme}.png`) });
      await page.setViewportSize(viewport);
      if (name === "interactive") {
        // the palette open, over the page
        await page.keyboard.press("Control+k");
        await page.locator(".palette input").waitFor();
        await page.screenshot({ path: path.join(out, `${name}-${label}-${scheme}-palette.png`) });
      }
      if (errors.length) console.error(`${name} ${label} ${scheme}:`, errors);
      await context.close();
    }
  }
}
await browser.close();
console.log(`screenshots in ${path.relative(repo, out)}`);
