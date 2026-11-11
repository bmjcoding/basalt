// The parity machinery the stand-ins' tests share, in the style of tools/html-skill/test/parity.test.mjs: a React fixture beside skill
// markup in Chromium, a list of element pairs, the computed styles and boxes read from each side, and every difference recorded. A test
// ends by checking the differences found against the list written in that test file: a difference that is not listed fails, and so does
// a listed one that no longer differs. `PARITY_REPORT=1` prints what a run found, in the list's own shape.
import assert from "node:assert/strict";

// The same property sets as the skill's parity test.
export const GEOMETRY = ["boxHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopLeftRadius"];
export const TYPE = ["fontSize", "fontWeight", "lineHeight", "letterSpacing"];
export const COLOUR = ["color", "backgroundColor", "borderTopColor", "borderTopWidth", "boxShadow"];
export const BOX = [...GEOMETRY, ...TYPE, ...COLOUR];
export const OUTLINE = ["outlineStyle", "outlineWidth", "outlineColor", "outlineOffset"];
/** Where it is and how big, in the viewport. */
export const PLACE = ["x", "y", "boxWidth", "boxHeight"];
/** Computed style properties plus the box, for each element named. */
const BOXES = new Set(["boxHeight", "boxWidth", "x", "y", "right", "bottom"]);

/** What a pair reads from an element. `index` picks the nth match; `pseudo` reads ::before and the like. */
export async function read(page, selector, props, { pseudo = null, index = 0 } = {}) {
  return page.evaluate(({ selector: sel, props: names, pseudo: ps, index: n, boxes }) => {
    const el = document.querySelectorAll(sel)[n];
    if (!el) return null;
    const style = getComputedStyle(el, ps || undefined);
    const rect = el.getBoundingClientRect();
    const round = (v) => Math.round(v * 100) / 100;
    const box = { boxHeight: `${round(rect.height)}px`, boxWidth: `${round(rect.width)}px`, x: `${round(rect.x)}px`, y: `${round(rect.y)}px`, right: `${round(rect.right)}px`, bottom: `${round(rect.bottom)}px` };
    const special = {
      textAlign: { left: "start", right: "end" }[style.textAlign] ?? style.textAlign,
      ariaLabel: el.getAttribute("aria-label") ?? "",
      role: el.getAttribute("role") ?? "",
      ariaModal: el.getAttribute("aria-modal") ?? "",
      ariaExpanded: el.getAttribute("aria-expanded") ?? "",
      ariaHaspopup: el.getAttribute("aria-haspopup") ?? "",
      hasAriaControls: String(el.hasAttribute("aria-controls")),
      hasAriaLabelledby: String(el.hasAttribute("aria-labelledby")),
      ariaCurrent: el.getAttribute("aria-current") ?? "",
      tabindex: el.getAttribute("tabindex") ?? "",
      text: (el.textContent || "").replace(/\s+/g, " ").trim(),
      paths: [...el.querySelectorAll("path")].map((p) => p.getAttribute("d")).join(" | "),
      glyph: el.querySelector("svg")?.getAttribute("data-icon") ?? "",
      svgSize: (() => { const svg = el.querySelector("svg"); return svg ? `${svg.getAttribute("width")}x${svg.getAttribute("height")}` : ""; })(),
      stroke: (() => { const g = el.querySelector("svg g"); return g ? `${g.getAttribute("stroke-width")} ${g.getAttribute("stroke-linecap")} ${g.getAttribute("stroke-linejoin")}` : ""; })(),
      dataSide: el.getAttribute("data-side") ?? "",
      isInert: String(el.hasAttribute("inert")),
      ariaHidden: el.getAttribute("aria-hidden") ?? "",
      imgAttrs: `${el.getAttribute("alt")}|${el.getAttribute("loading")}|${el.getAttribute("decoding")}|${el.getAttribute("width")}|${el.getAttribute("height")}|${el.getAttribute("style") ?? ""}`,
      src: el.getAttribute("src") ?? "",
    };
    return Object.fromEntries(names.map((n) => [n, n in box && boxes.includes(n) ? box[n] : n in special ? special[n] : style[n]]));
  }, { selector, props, pseudo, index, boxes: [...BOXES] });
}

/** Compares a set of pairs between a React page and a skill page, recording every difference into `found`. */
export async function compare(found, context, reactPage, skillPage, pairs) {
  for (const [label, reactSel, skillSel, props, options = {}] of pairs) {
    const focusing = options.focus || options.focusOn;
    if (focusing) {
      await reactPage.locator(options.focusOn ?? reactSel).nth(options.index ?? 0).focus();
      await skillPage.locator(options.focusOn ?? skillSel).nth(options.index ?? 0).focus();
      await settleBoth(reactPage, skillPage);
    }
    if (options.hover) {
      await reactPage.locator(reactSel).nth(options.index ?? 0).hover();
      await skillPage.locator(skillSel).nth(options.index ?? 0).hover();
      await settleBoth(reactPage, skillPage);
    }
    const react = await read(reactPage, reactSel, props, { pseudo: options.pseudo, index: options.index });
    const skill = await read(skillPage, skillSel, props, { pseudo: options.pseudo ?? options.skillPseudo, index: options.index });
    assert.ok(react, `${context.area}: React has no ${reactSel}`);
    assert.ok(skill, `${context.area}: the stand-in has no ${skillSel}`);
    if (focusing) {
      await reactPage.evaluate(() => document.activeElement?.blur());
      await skillPage.evaluate(() => document.activeElement?.blur());
      await settleBoth(reactPage, skillPage);
    }
    if (options.hover) {
      await reactPage.mouse.move(0, 400);
      await skillPage.mouse.move(0, 400);
      await settleBoth(reactPage, skillPage);
    }
    for (const prop of props) if (react[prop] !== skill[prop]) found.push({ ...context, pair: label, prop, react: react[prop], skill: skill[prop] });
  }
}

/** Every finite animation and transition done, on both pages. */
export async function settleBoth(...pages) {
  for (const page of pages) {
    await page.evaluate(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
  }
}

const keyOf = (d) => `${d.area} | ${d.pair} | ${d.prop} | ${d.theme} | ${d.width}`;

/**
 * Checks `found` against `listed`. An entry is { area, pair, prop, react, skill, reason } and applies to every theme and width unless it
 * names `themes` or `widths`; a `skill` or `react` that is a function of the theme gets the theme. Nothing new, nothing fixed and left
 * in the list, nothing that moved.
 */
export function checkDifferences(found, listed, { themes, widths, label }) {
  const expected = listed.flatMap((d) => (d.themes ?? themes).flatMap((theme) => (d.widths ?? widths).map((width) => ({ ...d, theme, width, react: typeof d.react === "function" ? d.react(theme) : d.react, skill: typeof d.skill === "function" ? d.skill(theme) : d.skill }))));
  if (process.env.PARITY_REPORT) console.log(`${label}\n${JSON.stringify(found, null, 1)}`);
  const actual = new Map(found.map((d) => [keyOf(d), d]));
  const known = new Map(expected.map((d) => [keyOf(d), d]));
  const fresh = [...actual].filter(([k]) => !known.has(k)).map(([, d]) => `NEW   ${keyOf(d)}: React ${JSON.stringify(d.react)}, stand-in ${JSON.stringify(d.skill)}`);
  const fixed = [...known].filter(([k, d]) => !actual.has(k)).map(([k]) => `FIXED ${k}: no longer differs; delete it from the list`);
  const moved = [...known].filter(([k, d]) => actual.has(k) && (actual.get(k).react !== d.react || actual.get(k).skill !== d.skill)).map(([k, d]) => `MOVED ${k}: listed as React ${JSON.stringify(d.react)} / stand-in ${JSON.stringify(d.skill)}, now React ${JSON.stringify(actual.get(k).react)} / stand-in ${JSON.stringify(actual.get(k).skill)}`);
  assert.deepEqual([...fresh, ...fixed, ...moved], []);
}
