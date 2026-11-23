// The sixteenth parity PR (versions and release notes, DECISIONS 320): the skill's release module and version link, written by tools/changelog/skill-body.mjs,
// beside React's ReleaseNotes and VersionLink from the same made-up records (Slate, a package; Harbor, a product), in both themes at 1440 and 390, compared
// by computed style: a release, its header, an entry, the source line, the sources panel and the version link at the sidebar's foot and in a site's footer.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact } from "../../../packages/react/test/support.mjs";
import { HARBOR, RUNNING_BUILD, SLATE } from "../../../packages/react/test/release-fixture.mjs";
import { releaseNotesHtml, versionLink } from "../../changelog/skill-body.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
// The skill's page carries its own base (ink, 14/20 sans, border-box); React's fixture has none, so it is given the same.
const BASE = "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font: 400 14px / 20px var(--basalt-font-family-sans); }";
const TYPE = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color"];
const BOX = ["width", "height", "paddingTop", "paddingBottom", "paddingLeft", "marginTop", "borderTopWidth", "borderTopStyle", "borderTopColor"];

const measure = (page, selector, props) => page.evaluate(({ selector, props }) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const s = getComputedStyle(el);
  const out = {};
  for (const p of props) out[p] = ["width", "height"].includes(p) ? `${Math.round(el.getBoundingClientRect()[p] * 10) / 10}px` : s[p];
  return out;
}, { selector, props });
const settleAnimations = (page) => page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))); });
async function compare(react, skill, [r, s], props, label) {
  await settleAnimations(react);
  await settleAnimations(skill);
  const a = await measure(react, r, props);
  const b = await measure(skill, s, props);
  assert.ok(a && b, `${label}: both exist (${r} / ${s})`);
  assert.deepEqual(b, a, label);
}

const DATA = `const SLATE = ${JSON.stringify(SLATE)}; const HARBOR = ${JSON.stringify(HARBOR)}; const RUNNING_BUILD = ${JSON.stringify(RUNNING_BUILD)};`;
const reactPage = async (jsx, { theme, width }) => {
  const r = await fixturePage(reactBrowser, `${DATA} createRoot(document.getElementById("root")).render(${jsx});`, { theme, colorScheme: theme, viewport: { width, height: 900 }, standards: true });
  await r.page.addStyleTag({ content: BASE });
  return r.page;
};
const skillPage = async (body, { theme, width }) => (await openHtml(browser, compose(`<title>Parity</title>${body}`, { fonts: false }).html, { scheme: theme, width })).page;

const frame = (width) => width - 32;
const REACT_NOTES = (form, width) => `<div style={{ width: ${frame(width)}, margin: 16 }}><B.ReleaseNotes releases={${form === "notes" ? "HARBOR" : "SLATE"}} form="${form}" product="${form === "notes" ? "Harbor" : "Slate"}" ${form === "notes" ? 'running="1.4.0" runningBuild={RUNNING_BUILD}' : ""} baseHref="https://example.test/notes" /></div>`;
const SKILL_NOTES = (form, width) => `<div style="width: ${frame(width)}px; margin: 16px">${releaseNotesHtml(form === "notes" ? HARBOR : SLATE, { form, product: form === "notes" ? "Harbor" : "Slate", running: form === "notes" ? "1.4.0" : undefined, runningBuild: form === "notes" ? RUNNING_BUILD : undefined, base: "https://example.test/notes" })}</div>`;

const PARTS = [
  ["a release", '[id="v0.2.0"]', '[id="v0.2.0"]', ["width", "paddingTop", "paddingBottom", "borderTopWidth", "borderTopColor", "maxWidth"]],
  ["its header", '[id="v0.2.0"] .basalt-release-head', '[id="v0.2.0"] .release-head', ["width", "height", "display", "gap"]],
  ["the number", '[id="v0.2.0"] .basalt-release-version', '[id="v0.2.0"] .release-version', [...TYPE, "width", "height"]],
  ["the meta line", '[id="v0.2.0"] p.basalt-release-meta', '[id="v0.2.0"] p.release-meta', [...TYPE, "width", "height"]],
  ["Copy link", '[id="v0.2.0"] .basalt-release-copy', '[id="v0.2.0"] .release-copy', [...TYPE, "width", "height", "paddingLeft"]],
  ["the summary", '[id="v0.2.0"] .basalt-release-summary', '[id="v0.2.0"] .release-summary', [...TYPE, ...BOX]],
  ["Action needed", '[id="v0.2.0"] .basalt-release-action', '[id="v0.2.0"] .release-action', ["width", "height", "marginTop", "borderTopColor", "backgroundColor"]],
  ["its heading", '[id="v0.2.0"] .basalt-release-callout-title', '[id="v0.2.0"] .release-callout-title', [...TYPE, "width", "height"]],
  ["the upgrade line", '[id="v0.2.0"] .basalt-release-upgrade', '[id="v0.2.0"] .release-upgrade', [...TYPE, "width", "height"]],
  ["a section", '[id="v0.2.0"] .basalt-release-section', '[id="v0.2.0"] .release-section', ["width", "height", "marginTop"]],
  ["its heading", '[id="v0.2.0"] .basalt-release-section-title', '[id="v0.2.0"] .release-section-title', [...TYPE, "width", "height", "marginBottom"]],
  ["a count", '[id="v0.2.0"] .basalt-release-section .basalt-release-count', '[id="v0.2.0"] .release-section .release-count', [...TYPE, "marginLeft"]],
  ["an entry", '[id="pr45-1"]', '[id="pr45-1"]', ["width", "height", "paddingTop", "paddingBottom", "gridTemplateColumns", "columnGap"]],
  ["its words", '[id="pr45-1"] .basalt-release-entry-text', '[id="pr45-1"] .release-entry-text', [...TYPE, "width", "height"]],
  ["its area", '[id="pr45-1"] .basalt-release-area', '[id="pr45-1"] .release-area', TYPE],
  ["the source line", '[id="pr46-1"] .basalt-release-source', '[id="pr46-1"] .release-source', [...TYPE, "width", "height", "paddingTop", "cursor"]],
  ["a source id", '[id="pr46-1"] .basalt-release-id', '[id="pr46-1"] .release-id', [...TYPE, "width", "height", "textDecorationLine", "textDecorationColor"]],
  ["How to migrate", '[id="pr41-1"] .basalt-release-migrate', '[id="pr41-1"] .release-migrate', [...TYPE, "width", "height", "textDecorationLine"]],
  ["a fold", '[id="v0.2.0"] .basalt-accordion-trigger', '[id="v0.2.0"] .release-fold', [...TYPE, "width", "height"]],
];
const NOTES_PARTS = [
  ["a headline", '[id="v1.4.0"] .basalt-release-heading', '[id="v1.4.0"] .release-heading', [...TYPE, "width", "height"]],
  ["its number line", '[id="v1.4.0"] .basalt-release-number-line', '[id="v1.4.0"] .release-number-line', [...TYPE, "width", "height"]],
  ["a paragraph's heading", '[id="v1.4.0"] .basalt-release-audience-title', '[id="v1.4.0"] .release-audience-title', [...TYPE, "width", "height"]],
  ["a paragraph", '[id="v1.4.0"] .basalt-release-paragraph', '[id="v1.4.0"] .release-paragraph', [...TYPE, "width", "height"]],
  ["All changes", '[id="v1.4.0"] .basalt-release-all .basalt-accordion-trigger', '[id="v1.4.0"] .release-all .release-fold', [...TYPE, "width", "height"]],
  ["Build details", '[id="v1.4.0"] .basalt-release-build .basalt-accordion-trigger', '[id="v1.4.0"] .release-build .release-fold', [...TYPE, "width", "height"]],
  ["a badge", '[id="v1.4.0"] .basalt-badge', '[id="v1.4.0"] .badge', [...TYPE, "width", "height", "borderTopColor"]],
  ["the release below", '[id="v1.3.1"]', '[id="v1.3.1"]', ["width", "height", "paddingTop"]],
];

describe("a release and its parts: the skill's, against React's", () => {
  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`a package's changelog in ${theme} at ${width}`, async () => {
      const react = await reactPage(REACT_NOTES("reference", width), { theme, width });
      const skill = await skillPage(SKILL_NOTES("reference", width), { theme, width });
      for (const [label, r, s, props] of PARTS) await compare(react, skill, [r, s], props, `${label} (${theme}, ${width})`);
      await react.close();
      await skill.context().close();
    });
    test(`a product's release notes in ${theme} at ${width}`, async () => {
      const react = await reactPage(REACT_NOTES("notes", width), { theme, width });
      const skill = await skillPage(SKILL_NOTES("notes", width), { theme, width });
      for (const [label, r, s, props] of NOTES_PARTS) await compare(react, skill, [r, s], props, `${label} (${theme}, ${width})`);
      await react.close();
      await skill.context().close();
    });
  }

  for (const theme of THEMES) test(`the sources panel, opened, in ${theme}`, async () => {
    const react = await reactPage(REACT_NOTES("reference", 1440), { theme, width: 1440 });
    const skill = await skillPage(SKILL_NOTES("reference", 1440), { theme, width: 1440 });
    await react.locator('[id="pr41-1"] .basalt-release-source').click();
    await skill.locator('[id="pr41-1"] .release-source').click();
    await react.locator(".basalt-release-sources").waitFor();
    await skill.locator(".release-sources:popover-open").waitFor();
    for (const [label, r, s, props] of [
      ["the panel", ".basalt-release-sources", ".release-sources:popover-open", ["width", "paddingTop", "paddingLeft", "borderTopLeftRadius", "backgroundColor"]],
      ["its title", ".basalt-release-sources .basalt-popover-title", ".release-sources:popover-open .popover-title", TYPE],
      ["a label", ".basalt-release-sources dt", ".release-sources:popover-open dt", TYPE],
      ["a value", ".basalt-release-sources dd", ".release-sources:popover-open dd", TYPE],
    ]) await compare(react, skill, [r, s], props, `${label} (${theme})`);
    // The same rows, in the same order.
    const rows = (page, selector) => page.locator(`${selector} dt`).evaluateAll((els) => els.map((el) => el.textContent));
    assert.deepEqual(await rows(skill, ".release-sources:popover-open"), await rows(react, ".basalt-release-sources"));
    await react.close();
    await skill.context().close();
  });
});

describe("the version link: the skill's, against React's", () => {
  const LINK = ["fontFamily", "fontSize", "lineHeight", "letterSpacing", "color", "width", "height", "paddingTop", "columnGap", "fontVariantNumeric"];
  for (const theme of THEMES) test(`in a site's footer and at the sidebar's foot, in ${theme}`, async () => {
    const react = await reactPage(`<div style={{ display: "grid", gap: 24, padding: 16 }}>
      <div className="basalt-site-footer-legal-row"><p className="basalt-site-footer-legal">© 2026 Example</p><B.VersionLink label="Slate" version="0.2.1" date="2026-11-16" href="#v0.2.1" data-testid="footer" /></div>
      <div style={{ width: 256 }}><B.VersionLink version="1.4.0" date="2026-11-23" href="#v1.4.0" current data-testid="current" /></div>
      <div style={{ width: 196 }}><B.VersionLink version="1.5.0-canary.20261123.1" date="2026-11-23" href="#v" data-testid="canary" /></div>
    </div>`, { theme, width: 1440 });
    const skill = await skillPage(`<div style="display: grid; gap: 24px; padding: 16px">
      <div class="site-footer-legal-row"><p class="site-footer-legal">© 2026 Example</p>${versionLink({ label: "Slate", version: "0.2.1", date: "2026-11-16", href: "#v0.2.1" }).replace("<a ", '<a data-testid="footer" ')}</div>
      <div style="width: 256px">${versionLink({ version: "1.4.0", date: "2026-11-23", href: "#v1.4.0", current: true }).replace("<a ", '<a data-testid="current" ')}</div>
      <div style="width: 196px">${versionLink({ version: "1.5.0-canary.20261123.1", date: "2026-11-23", href: "#v" }).replace("<a ", '<a data-testid="canary" ')}</div>
    </div>`, { theme, width: 1440 });
    for (const id of ["footer", "current", "canary"]) await compare(react, skill, [`[data-testid="${id}"]`, `[data-testid="${id}"]`], LINK, `${id} (${theme})`);
    await compare(react, skill, ['[data-testid="current"] .basalt-version-link-number', '[data-testid="current"] .version-link-number'], ["fontWeight", "width"], `the current number (${theme})`);
    // The same name, in the same words.
    const name = (page) => page.locator('[data-testid="current"]').getAttribute("aria-label");
    assert.equal(await name(skill), await name(react));
    await react.close();
    await skill.context().close();
  });
});
