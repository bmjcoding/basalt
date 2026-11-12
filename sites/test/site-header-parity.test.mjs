// Parity: the site header's stand-in (sites/shared/site-header.css and .js) beside the shipped React `SiteHeader`, in Chromium, in both
// themes, at 1440 and 390: the smoked bar, the solid bar and the open menu. Computed styles, boxes and the few attributes that carry a
// name are read from each side element by element. The stand-in's class names are React's, so most pairs name one selector.
//
// Every difference that remains is in DIFFERENCES below with its reason. The test fails on a difference that is not listed (a new drift),
// on a listed one that no longer differs (delete it: the gap is closed), and on one that moved. `PARITY_REPORT=1` prints what a run found.
// Text widths: neither side loads a web font (the stand-in's page is built without Geist, as React's fixture has none), so both draw the
// same fallback and their boxes compare like for like.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch as launchReact, settle } from "../../packages/react/test/support.mjs";
import { buildPage } from "../build.mjs";
import { BOX, checkDifferences, compare, GEOMETRY, OUTLINE, PLACE, settleBoth, TYPE } from "./parity.mjs";
import { openHtml } from "./support.mjs";

const THEMES = ["dark", "light"];
const WIDTHS = [1440, 390];

// The list. Each entry: where it is (area, pair, prop), the two values, and why. `themes` or `widths` narrow it.
export const DIFFERENCES = [
  ...["smoked bar", "solid bar"].map((area) => ({
    area, pair: "theme toggle name", prop: "ariaLabel", react: "Switch theme", skill: (theme) => (theme === "dark" ? "Switch to light theme" : "Switch to dark theme"),
    reason: "The skill's theme module owns the toggle: it sets the button's icon (Sun or Moon, Phosphor) and its name, which says what a press switches to. React's toggle is whatever IconButton the app passes; the fixture's is named \"Switch theme\" and draws a core glyph. Its box, ink and ring are compared and match.",
  })),
];

// What is different by design and cannot be read from a computed style, so it is not in the list above. Each is asserted by a test below.
//  - The morph. React's MorphIcon turns Menu into Close (and back) over duration-slow, as a drawn pair; the skill has no MorphIcon, so the
//    stand-in swaps the two drawings at once. At rest and when open the drawings are the same paths (compared above). Reason: no
//    MorphIcon in the skill; adding one is the skill's, not the sites'.
//  - The menu is built by the stand-in's script from the links the page wrote (React is given props). The result is the same DOM.

const BODY_START = `<title>Parity</title>\n<!-- @include shared/site-header.css -->\n`;
const LINKS = [["overview", "Overview", true], ["guides", "Guides", false], ["pricing", "Pricing", false]];
/** The stand-in's markup, as a page writes it (sites/README.md). */
const skillBody = ({ solid = false } = {}) => `${BODY_START}<header class="basalt-chrome basalt-site-header"${solid ? " data-solid" : ""}>
  <div class="basalt-site-bar">
    <a class="basalt-site-brand" href="#top" aria-label="Sample home"><span class="basalt-site-brand-mark">Sample</span></a>
    <nav class="basalt-site-links" aria-label="Primary"><ul>${LINKS.map(([id, label, current]) => `<li><a href="#${id}"${current ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}</ul></nav>
    <span class="basalt-bar-spacer"></span>
    <div class="basalt-bar-actions">
      <button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button>
      <span class="basalt-site-action"><a class="btn" data-variant="primary" href="#start">Get started</a></span>
    </div>
  </div>
</header>
<main style="height: 2400px"><p>Synthetic page.</p></main>
<!-- @include shared/site-header.js -->
`;
const reactBody = ({ solid = false } = {}) => `document.body.style.margin = "0";
  createRoot(document.getElementById("root")).render(<div>
    <B.SiteHeader brand={<span>Sample</span>} brandLabel="Sample home" homeHref="#top"
      links={[${LINKS.map(([id, label, current]) => `{ href: "#${id}", label: "${label}"${current ? ", current: true" : ""} }`).join(", ")}]}
      themeToggle={<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />}
      action={<B.Button variant="primary">Get started</B.Button>} ${solid ? "solid" : ""} />
    <main style={{ height: 2400 }}><p>Synthetic page.</p></main>
  </div>);`;
// An app gives the React components their page: the body's type and colour. The skill's page does the same in its own reset.
const APP_BODY = "body { margin: 0; background: var(--basalt-surface-0); color: var(--basalt-text-primary); font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans); }";

let reactBrowser;
let skillBrowser;
let scratch;
before(async () => {
  reactBrowser = await launchReact();
  skillBrowser = await launchReact();
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-parity-"));
});
after(async () => {
  await reactBrowser?.close();
  await skillBrowser?.close();
});

/** The stand-in page for a body, built without Geist (React's fixture has none). */
function skillHtml(body, name) {
  const file = path.join(scratch, `${name}.body.html`);
  fs.writeFileSync(file, body);
  return buildPage(file, { fonts: false, siteDir: scratch }).html;
}

async function open({ theme, width, solid = false }) {
  const viewport = { width, height: width === 390 ? 844 : 900 };
  const { page: react, errors } = await fixturePage(reactBrowser, reactBody({ solid }), { theme, viewport });
  await react.addStyleTag({ content: APP_BODY });
  await settle(react);
  const { page: skill, context, errors: skillErrors } = await openHtml(skillBrowser, skillHtml(skillBody({ solid }), solid ? "solid" : "smoked"), { scheme: theme, width, height: viewport.height });
  // The skill's clear-bar report and the bar's own first frame are settled before anything is read.
  await settleBoth(react, skill);
  return { react, skill, context, errors, skillErrors };
}

const SIDE = (n) => `.basalt-site-links-list > li:nth-child(${n}) > .basalt-site-link`;
/** The bar's pairs. The same selector on both sides unless the control differs (React's Button and IconButton are .basalt-button; the stand-in's are .btn). */
const barPairs = (width) => {
  const wide = width >= 720;
  const pairs = [
    ["bar", ".basalt-site-header", ".basalt-site-header", [...PLACE, "position", "top", "zIndex", "boxSizing", "paddingTop", "backgroundColor", "backdropFilter", "borderBottomWidth", "borderBottomStyle", "borderBottomColor", "color", "fontFamily"]],
    ["row", ".basalt-site-bar", ".basalt-site-bar", [...PLACE, "paddingTop", "paddingLeft", "paddingRight", "display", "alignItems", "maxWidth"]],
    ["brand target", ".basalt-site-brand", ".basalt-site-brand", [...PLACE, "color", "display", "marginTop", "textDecorationLine"]],
    ["brand mark", ".basalt-site-brand-mark", ".basalt-site-brand-mark", [...PLACE, ...TYPE, "borderTopLeftRadius", "gap", "color"]],
    ["brand ring", ".basalt-site-brand-mark", ".basalt-site-brand-mark", OUTLINE, { focusOn: ".basalt-site-brand" }],
    ["actions", ".basalt-bar-actions", ".basalt-bar-actions", [...PLACE, "gap", "display"]],
    ["theme toggle", ".basalt-bar-actions > .basalt-button:first-child", ".basalt-bar-actions > .btn:first-child", [...PLACE, ...GEOMETRY, "minWidth", "color", "backgroundColor", "boxShadow", "fontSize", "fontWeight"]],
    ["theme toggle glyph box", ".basalt-bar-actions > .basalt-button:first-child svg", ".basalt-bar-actions > .btn:first-child svg", ["boxWidth", "boxHeight"]],
    ["theme toggle name", ".basalt-bar-actions > .basalt-button:first-child", ".basalt-bar-actions > .btn:first-child", ["ariaLabel"]],
    ["theme toggle ring", ".basalt-bar-actions > .basalt-button:first-child", ".basalt-bar-actions > .btn:first-child", OUTLINE, { focus: true }],
  ];
  if (wide) {
    pairs.push(
      ["links", ".basalt-site-links", ".basalt-site-links", [...PLACE, "display", "position", "isolation", "marginLeft"]],
      ["links name", "nav.basalt-site-links", "nav.basalt-site-links", ["ariaLabel"]],
      ["action", ".basalt-site-action", ".basalt-site-action", [...PLACE, "display"]],
      ["action button", ".basalt-site-action > .basalt-button", ".basalt-site-action > .btn", [...PLACE, ...BOX]],
    );
    for (const n of [1, 2, 3]) {
      pairs.push(
        [`link ${n} hit area`, SIDE(n), SIDE(n), [...PLACE, "display", "paddingLeft", "paddingRight", "color", "textDecorationLine", "zIndex", "position", "ariaCurrent"]],
        [`link ${n} pill`, `${SIDE(n)} .basalt-site-pill`, `${SIDE(n)} .basalt-site-pill`, [...PLACE, "borderTopLeftRadius", "paddingLeft", "paddingRight", "backgroundColor"]],
        [`link ${n} label`, `${SIDE(n)} .basalt-site-label`, `${SIDE(n)} .basalt-site-label`, [...PLACE, ...TYPE, "color"]],
        [`link ${n} label reserve`, `${SIDE(n)} .basalt-site-label`, `${SIDE(n)} .basalt-site-label`, [...TYPE, "fontWeight"], { pseudo: "::after" }],
      );
    }
    pairs.push(
      ["link hover", SIDE(2), SIDE(2), ["color"], { hover: true }],
      ["link hover pill", `${SIDE(2)} .basalt-site-pill`, `${SIDE(2)} .basalt-site-pill`, ["backgroundColor", "boxHeight"], { hover: true }],
      ["link focus ring", `${SIDE(2)} .basalt-site-pill`, `${SIDE(2)} .basalt-site-pill`, OUTLINE, { focusOn: SIDE(2) }],
      ["link focus ink", SIDE(2), SIDE(2), ["color"], { focus: true }],
      ["glide plate", ".basalt-site-links > .basalt-plate", ".basalt-site-links > .basalt-plate", ["position", "display", "borderTopLeftRadius", "backgroundColor", "opacity", "transitionProperty", "pointerEvents"]],
    );
  } else {
    pairs.push(
      ["links hidden", ".basalt-site-links", ".basalt-site-links", ["display"]],
      ["action hidden", ".basalt-site-action", ".basalt-site-action", ["display"]],
      ["menu trigger", ".basalt-site-menu-trigger", ".basalt-site-menu-trigger", [...PLACE, ...GEOMETRY, "minWidth", "color", "backgroundColor", "boxShadow", "ariaLabel", "ariaExpanded", "ariaHaspopup", "hasAriaControls"]],
      ["menu trigger glyph", ".basalt-site-menu-trigger", ".basalt-site-menu-trigger", ["glyph", "paths", "svgSize", "stroke"]],
      ["menu trigger glyph box", ".basalt-site-menu-trigger svg", ".basalt-site-menu-trigger svg", ["boxWidth", "boxHeight"]],
      ["menu trigger ring", ".basalt-site-menu-trigger", ".basalt-site-menu-trigger", OUTLINE, { focus: true }],
    );
  }
  return pairs;
};

const menuPairs = () => [
  ["trigger state", ".basalt-site-menu-trigger", ".basalt-site-menu-trigger", ["ariaExpanded", "glyph", "paths"]],
  ["scrim", ".basalt-sheet-backdrop", ".basalt-sheet-backdrop", [...PLACE, "position", "backgroundColor", "zIndex", "opacity"]],
  ["sheet", ".basalt-sheet.basalt-site-menu", ".basalt-sheet.basalt-site-menu", [...PLACE, "position", "zIndex", "backgroundColor", "boxShadow", "borderBottomWidth", "borderBottomColor", "borderBottomLeftRadius", "borderBottomRightRadius", "borderTopLeftRadius", "maxHeight", "paddingTop", "paddingLeft", "overflowY", "overscrollBehaviorY", "display", "flexDirection", "clipPath", "opacity", "role", "ariaModal", "hasAriaLabelledby", "dataSide"]],
  ["sheet title", ".basalt-sheet .basalt-visually-hidden, .basalt-sheet .visually-hidden", ".basalt-sheet .visually-hidden", ["text"]],
  ["band", ".basalt-site-menu-band", ".basalt-site-menu-band", [...PLACE, "paddingTop", "paddingLeft", "paddingRight", "borderBottomWidth", "borderBottomColor", "display", "alignItems"]],
  ["band brand", ".basalt-site-menu-band .basalt-site-brand", ".basalt-site-menu-band .basalt-site-brand", [...PLACE, "color"]],
  ["band brand mark", ".basalt-site-menu-band .basalt-site-brand-mark", ".basalt-site-menu-band .basalt-site-brand-mark", [...PLACE, ...TYPE]],
  ["band toggle", ".basalt-site-menu-band .basalt-button:not(.basalt-site-menu-close)", ".basalt-site-menu-band .btn:not(.basalt-site-menu-close)", [...PLACE, ...GEOMETRY, "color", "backgroundColor"]],
  ["close", ".basalt-site-menu-close", ".basalt-site-menu-close", [...PLACE, ...GEOMETRY, "minWidth", "color", "backgroundColor", "boxShadow", "ariaLabel"]],
  ["close glyph", ".basalt-site-menu-close", ".basalt-site-menu-close", ["glyph", "paths", "svgSize", "stroke"]],
  ["close glyph box", ".basalt-site-menu-close svg", ".basalt-site-menu-close svg", ["boxWidth", "boxHeight"]],
  ["close ring", ".basalt-site-menu-close", ".basalt-site-menu-close", OUTLINE, { focus: true }],
  ["menu nav", ".basalt-site-menu-nav", ".basalt-site-menu-nav", [...PLACE, "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "ariaLabel"]],
  ...[1, 2, 3].flatMap((n) => {
    const item = `.basalt-site-menu-nav .basalt-nav-list > li:nth-child(${n}) > .basalt-nav-item`;
    return [
      [`row ${n}`, item, item, [...PLACE, "color", "display", "ariaCurrent", "paddingTop", "paddingBottom"]],
      [`row ${n} pill`, `${item} .basalt-nav-pill`, `${item} .basalt-nav-pill`, [...PLACE, "paddingLeft", "paddingRight", "borderTopLeftRadius", "backgroundColor", "gap"]],
      [`row ${n} label`, `${item} .basalt-nav-label`, `${item} .basalt-nav-label`, [...PLACE, ...TYPE, "color"]],
      [`row ${n} label reserve`, `${item} .basalt-nav-label`, `${item} .basalt-nav-label`, TYPE, { pseudo: "::after" }],
    ];
  }),
  ["row hover pill", ".basalt-site-menu-nav .basalt-nav-list > li:nth-child(2) .basalt-nav-pill", ".basalt-site-menu-nav .basalt-nav-list > li:nth-child(2) .basalt-nav-pill", ["backgroundColor"], { hover: true }],
  ["row focus ring", ".basalt-site-menu-nav .basalt-nav-list > li:nth-child(2) .basalt-nav-pill", ".basalt-site-menu-nav .basalt-nav-list > li:nth-child(2) .basalt-nav-pill", OUTLINE, { focusOn: ".basalt-site-menu-nav .basalt-nav-list > li:nth-child(2) > .basalt-nav-item" }],
  ["menu plate", ".basalt-site-menu-nav > .basalt-plate", ".basalt-site-menu-nav > .basalt-plate", ["position", "display", "borderTopLeftRadius", "backgroundColor", "opacity"]],
  ["foot", ".basalt-site-menu-foot", ".basalt-site-menu-foot", [...PLACE, "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]],
  ["foot action", ".basalt-site-menu-foot .basalt-button", ".basalt-site-menu-foot .btn", [...PLACE, ...BOX]],
];

const found = [];

describe("the stand-in's site header renders as React's SiteHeader does, but for the differences listed", () => {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      for (const solid of [false, true]) {
        test(`the ${solid ? "solid" : "smoked"} bar, ${theme}, ${width}`, async () => {
          const { react, skill, context, errors, skillErrors } = await open({ theme, width, solid });
          await compare(found, { area: solid ? "solid bar" : "smoked bar", theme, width }, react, skill, barPairs(width));
          assert.deepEqual([errors, skillErrors], [[], []]);
          await react.close();
          await context.close();
        });
      }
      if (width === 390) {
        test(`the open menu, ${theme}, ${width}`, async () => {
          const { react, skill, context, errors, skillErrors } = await open({ theme, width });
          await react.locator(".basalt-site-menu-trigger").click();
          await skill.locator(".basalt-site-menu-trigger").click();
          await react.waitForSelector(".basalt-site-menu");
          await settleBoth(react, skill);
          await compare(found, { area: "menu", theme, width }, react, skill, menuPairs());
          assert.deepEqual([errors, skillErrors], [[], []]);
          await react.close();
          await context.close();
        });
      }
    }
  }

  test("the morph: React turns Menu into Close in flight; the stand-in swaps the two drawings at once", async () => {
    const { react, skill, context } = await open({ theme: "dark", width: 390 });
    const paths = (page) => page.evaluate(() => [...document.querySelector(".basalt-site-menu-trigger").querySelectorAll("path")].map((p) => p.getAttribute("d")).join("|"));
    const rest = { react: await paths(react), skill: await paths(skill) };
    assert.equal(rest.react, rest.skill, "Menu at rest is the same drawing");
    // Read in the same task as the click, before a frame has drawn: React's morph has not moved yet and the stand-in already shows Close.
    const atClick = async (page) => page.evaluate(() => { const button = document.querySelector(".basalt-site-menu-trigger"); button.click(); return [...button.querySelectorAll("path")].map((p) => p.getAttribute("d")).join("|"); });
    const reactAtClick = await atClick(react);
    const skillAtClick = await atClick(skill);
    await react.waitForSelector(".basalt-site-menu");
    await settleBoth(react, skill);
    const opened = { react: await paths(react), skill: await paths(skill) };
    assert.equal(opened.react, opened.skill, "Close, once open, is the same drawing");
    assert.notEqual(opened.skill, rest.skill, "and it is not Menu");
    assert.equal(skillAtClick, opened.skill, "the stand-in draws Close at once");
    assert.notEqual(reactAtClick, opened.react, "React is still drawing the way to Close");
    await react.close();
    await context.close();
  });

  test("the differences found are exactly the differences listed: nothing new, nothing fixed and left in the list", () => {
    checkDifferences(found, DIFFERENCES, { themes: THEMES, widths: WIDTHS, label: "site header" });
  });
});
