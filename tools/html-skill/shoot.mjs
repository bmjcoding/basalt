// Renders the two example pages of the Basalt HTML skill to .review/html-skill/: 1440 and 390 wide, dark and light, at 2x.
// The pages are the example bodies run through compose.mjs, as a person's file would be (Geist inlined), so the screenshots show Geist.
// Run: node tools/html-skill/shoot.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { launchOptions } from "../../scripts/chromium-launch.mjs";

import { compose } from "../../.agent/skills/basalt-html/compose.mjs";
import { skillDir } from "./build.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(repo, ".review", "html-skill");
fs.mkdirSync(out, { recursive: true });

const pages = { static: "template-static.html", interactive: "template-interactive.html" };
for (const [name, file] of Object.entries(pages)) {
  fs.writeFileSync(path.join(out, file), compose(fs.readFileSync(path.join(skillDir, "examples", `${name}.body.html`), "utf8")).html);
}

const browser = await chromium.launch(launchOptions());
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
