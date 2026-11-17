// Parity: the stage's stand-in (sites/shared/stage.css) beside the shipped React `Stage` and `PairedArt`, in Chromium, in both themes,
// at 1440 and 390: the stage under the clear bar, the paired art's switch, the clear bar's change on scroll, forced colours and print.
// The stand-in's class names are React's, so each pair names one selector. Every difference that remains is in DIFFERENCES with its
// reason; the test fails on one that is not listed, on a listed one that no longer differs, and on one that moved. `PARITY_REPORT=1`
// prints what a run found. Neither side loads a web font (the stand-in's page is built without Geist), so boxes compare like for like.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch as launchReact, settle } from "../../packages/react/test/support.mjs";
import { buildPage } from "../build.mjs";
import { checkDifferences, compare, PLACE, settleBoth } from "./parity.mjs";
import { openHtml } from "./support.mjs";

const THEMES = ["dark", "light"];
const WIDTHS = [1440, 390];

// The list. Each entry: where (area, pair, prop), the two values, and why. `themes` or `widths` narrow it.
export const DIFFERENCES = [];

// Drawn art from the art tokens (so it swaps with the theme by itself), and two tiny pictures for the paired art's switch.
const DUNES = `<svg viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true"><rect width="1440" height="600" fill="var(--basalt-art-field)"/><path d="M0 330 C300 250 520 400 760 320 S1200 260 1440 330 V600 H0Z" fill="var(--basalt-art-tone-1)"/></svg>`;
const PICTURE = (fill) => `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="${fill}"/></svg>`).toString("base64")}`;
const DARK = PICTURE("#222222");
const LIGHT = PICTURE("#dddddd");
const BAR_LINKS = [["overview", "Overview", true], ["guides", "Guides", false]];

const skillBody = () => `<title>Parity</title>
<!-- @include shared/site-header.css -->
<!-- @include shared/stage.css -->
<header class="basalt-chrome basalt-site-header">
  <div class="basalt-site-bar">
    <a class="basalt-site-brand" href="#top" aria-label="Sample home"><span class="basalt-site-brand-mark">Sample</span></a>
    <nav class="basalt-site-links" aria-label="Primary"><ul>${BAR_LINKS.map(([id, label, current]) => `<li><a href="#${id}"${current ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}</ul></nav>
    <span class="basalt-bar-spacer"></span>
    <div class="basalt-bar-actions"><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div>
  </div>
</header>
<section class="basalt-stage" data-headroom>
  <span class="basalt-stage-headroom" data-basalt-headroom aria-hidden="true"></span>
  <div class="basalt-stage-content"><div style="height: 400px; padding: 0 24px"><h1 data-quiet="headline" style="margin: 0; font: 600 32px/40px sans-serif">A synthetic headline</h1></div></div>
  <div class="basalt-stage-art" aria-hidden="true">${DUNES}<img class="basalt-paired-art" data-art="dark" src="${DARK}" alt="" loading="lazy" decoding="async" width="40" height="20" style="object-position: left top;"><img class="basalt-paired-art" data-art="light" src="${LIGHT}" alt="" loading="lazy" decoding="async" width="40" height="20" style="object-position: left top;"></div>
</section>
<main style="height: 2400px"><p>Synthetic page.</p></main>
<!-- @include shared/site-header.js -->
`;
const reactBody = () => `document.body.style.margin = "0";
  createRoot(document.getElementById("root")).render(<div>
    <B.SiteHeader brand={<span>Sample</span>} brandLabel="Sample home" homeHref="#top"
      links={[${BAR_LINKS.map(([id, label, current]) => `{ href: "#${id}", label: "${label}"${current ? ", current: true" : ""} }`).join(", ")}]}
      themeToggle={<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />} />
    <B.Stage headroom art={<>${DUNES}<B.PairedArt dark="${DARK}" light="${LIGHT}" width={40} height={20} position="left top" /></>}>
      <div style={{ height: 400, padding: "0 24px" }}><h1 data-quiet="headline" style={{ margin: 0, font: "600 32px/40px sans-serif" }}>A synthetic headline</h1></div>
    </B.Stage>
    <main style={{ height: 2400 }}><p>Synthetic page.</p></main>
  </div>);`;
const APP_BODY = "body { margin: 0; background: var(--basalt-surface-0); color: var(--basalt-text-primary); font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans); }";

let reactBrowser;
let skillBrowser;
let scratch;
let html;
before(async () => {
  reactBrowser = await launchReact();
  skillBrowser = await launchReact();
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-stage-parity-"));
  fs.writeFileSync(path.join(scratch, "stage.body.html"), skillBody());
  html = buildPage(path.join(scratch, "stage.body.html"), { fonts: false, siteDir: scratch }).html;
});
after(async () => {
  await reactBrowser?.close();
  await skillBrowser?.close();
});

async function open({ theme, width, forcedColors = "none", media }) {
  const viewport = { width, height: width === 390 ? 844 : 900 };
  const { page: react, errors } = await fixturePage(reactBrowser, reactBody(), { theme, viewport });
  await react.addStyleTag({ content: APP_BODY });
  const { page: skill, context, errors: skillErrors } = await openHtml(skillBrowser, html, { scheme: theme, width, height: viewport.height, forcedColors });
  if (forcedColors === "active") await react.emulateMedia({ forcedColors: "active", colorScheme: theme });
  if (media) { await react.emulateMedia({ media }); await skill.emulateMedia({ media }); }
  await settle(react);
  await settleBoth(react, skill);
  return { react, skill, context, errors, skillErrors };
}

const HEADER = ["backgroundColor", "borderBottomColor", "borderBottomStyle", "borderBottomWidth", "backdropFilter", "transitionProperty", "transitionDuration", "transitionTimingFunction", "boxHeight", "color"];
const stagePairs = [
  ["stage", ".basalt-stage", ".basalt-stage", [...PLACE, "position", "boxSizing", "marginTop", "paddingTop", "backgroundColor", "color", "fontFamily", "borderTopWidth", "borderRadius", "boxShadow", "filter", "isolation"]],
  ["art", ".basalt-stage-art", ".basalt-stage-art", [...PLACE, "position", "zIndex", "overflowX", "overflowY", "pointerEvents", "display", "ariaHidden"]],
  ["art drawing", ".basalt-stage-art > svg", ".basalt-stage-art > svg", [...PLACE, "position", "display"]],
  ["headroom", ".basalt-stage-headroom", ".basalt-stage-headroom", [...PLACE, "position", "pointerEvents", "ariaHidden"]],
  ["content", ".basalt-stage-content", ".basalt-stage-content", [...PLACE, "position"]],
  ["headline", ".basalt-stage-content h1", ".basalt-stage-content h1", [...PLACE, "color"]],
  ["dark picture", ".basalt-paired-art[data-art=dark]", ".basalt-paired-art[data-art=dark]", ["display", "objectFit", "position", "imgAttrs", "src", "ariaHidden", "boxWidth", "boxHeight"]],
  ["light picture", ".basalt-paired-art[data-art=light]", ".basalt-paired-art[data-art=light]", ["display", "objectFit", "position", "imgAttrs", "src", "boxWidth", "boxHeight"]],
  ["bar", ".basalt-site-header", ".basalt-site-header", [...PLACE, ...HEADER]],
];

const found = [];
describe("the stand-in's stage renders as React's Stage does, but for the differences listed", () => {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      test(`the stage under the clear bar, ${theme}, ${width}`, async () => {
        const { react, skill, context, errors, skillErrors } = await open({ theme, width });
        await compare(found, { area: "stage", theme, width }, react, skill, stagePairs);
        // The bar at the top is clear on both sides.
        assert.equal(await skill.evaluate(() => document.querySelector("header").hasAttribute("data-top")), true);
        assert.deepEqual([errors, skillErrors], [[], []]);
        await react.close();
        await context.close();
      });

      test(`the clear bar's change on scroll, ${theme}, ${width}: 1px, past the slack, and back`, async () => {
        const { react, skill, context } = await open({ theme, width });
        const bar = [["bar", ".basalt-site-header", ".basalt-site-header", [...HEADER, "y"]]];
        for (const [label, y] of [["1px", 1], ["past the slack", 200], ["back at the top", 0]]) {
          for (const page of [react, skill]) await page.evaluate((top) => window.scrollTo(0, top), y);
          for (const page of [react, skill]) await page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise((resolve) => requestAnimationFrame(resolve)); });
          await settleBoth(react, skill);
          await compare(found, { area: `scroll ${label}`, theme, width }, react, skill, bar);
        }
        await react.close();
        await context.close();
      });
    }
    test(`forced colours: the stage is Canvas and draws no art, ${theme}`, async () => {
      const { react, skill, context } = await open({ theme, width: 1440, forcedColors: "active" });
      await compare(found, { area: "forced colours", theme, width: 1440 }, react, skill, [
        ["stage", ".basalt-stage", ".basalt-stage", [...PLACE, "backgroundColor", "marginTop", "paddingTop"]],
        ["art", ".basalt-stage-art", ".basalt-stage-art", ["display"]],
        ["bar", ".basalt-site-header", ".basalt-site-header", HEADER],
      ]);
      await react.close();
      await context.close();
    });
    test(`print: the art does not print and the stage is in the flow, ${theme}`, async () => {
      const { react, skill, context } = await open({ theme, width: 1440, media: "print" });
      await compare(found, { area: "print", theme, width: 1440 }, react, skill, [
        ["stage", ".basalt-stage", ".basalt-stage", [...PLACE, "backgroundImage", "marginTop", "paddingTop"]],
        ["art", ".basalt-stage-art", ".basalt-stage-art", ["display"]],
        ["bar", ".basalt-site-header", ".basalt-site-header", [...HEADER.filter((p) => !p.startsWith("transition"))]],
      ]);
      await react.close();
      await context.close();
    });
  }

  test("the paired art shows the dark picture in the dark theme and the light one in the light theme, by the page's theme: the toggle's as well as the system's", async () => {
    const { react, skill, context } = await open({ theme: "dark", width: 1440 });
    const shown = (page) => page.evaluate(() => [...document.querySelectorAll(".basalt-paired-art")].filter((img) => getComputedStyle(img).display !== "none").map((img) => img.dataset.art).join());
    assert.deepEqual([await shown(react), await shown(skill)], ["dark", "dark"]);
    // The page's own theme wins over the system's: switch it, and both follow.
    for (const page of [react, skill]) await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    assert.deepEqual([await shown(react), await shown(skill)], ["light", "light"]);
    await react.emulateMedia({ colorScheme: "dark" });
    for (const page of [react, skill]) await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
    assert.deepEqual([await shown(react), await shown(skill)], ["dark", "dark"], "with no theme set, the system's (dark here)");
    await react.close();
    await context.close();
  });

  test("the differences found are exactly the differences listed: nothing new, nothing fixed and left in the list", () => {
    checkDifferences(found, DIFFERENCES, { themes: THEMES, widths: WIDTHS, label: "stage" });
  });
});
