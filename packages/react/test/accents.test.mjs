// The accent classes in a real browser, on the built stylesheet and the real Badge: the dot takes its own theme's value, however themes and
// classes nest; none and a name Basalt doesn't know fall back to ink; a browser without light-dark() gets the ink dot; and in forced
// colours the dot is still there. (Contrast, gamut, the status guard and where the variable may be read are in packages/tokens/test.)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { ALLOWED, readers } from "../../tokens/test/accent-readers.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const tokens = JSON.parse(fs.readFileSync(path.join(pkg, "..", "tokens", "dist", "json", "tokens.json"), "utf8"));
const COBALT = { light: tokens.light["accent-cobalt"].oklch, dark: tokens.dark["accent-cobalt"].oklch };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

/** Each scope below holds one Badge with the accent tone, a probe in the scope's primary ink, and a probe in each theme's cobalt. */
const scope = (id, attrs, children = "") =>
  `<div id="${id}" ${attrs}><B.Badge status="accent" variant="plain" id="${id}-badge">Needs you</B.Badge><span id="${id}-ink" style={{ color: "var(--basalt-text-primary)" }} />${children}</div>`;
const page = (jsx) => `createRoot(document.getElementById("root")).render(<>${jsx}</>);`;

/** The dot's colour, and the colour of the scope's ink, both as the browser serializes a computed colour. */
const read = (p, id) =>
  p.evaluate((scopeId) => {
    const dot = document.querySelector(`#${scopeId}-badge .basalt-badge-dot`);
    return { dot: getComputedStyle(dot).backgroundColor, ink: getComputedStyle(document.getElementById(`${scopeId}-ink`)).color };
  }, id);

/** What the browser serializes for `color: <value>`, to compare against the dot without converting between colour spaces. */
const serialized = (p, value) =>
  p.evaluate((v) => {
    const probe = document.createElement("span");
    probe.style.color = v;
    document.body.append(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  }, value);

describe("accent classes: the dot takes its own theme's value", () => {
  test("nested themes: a light theme inside a dark cobalt root, and a dark one inside a light cobalt root, each get their own cobalt", async () => {
    const { page: p, errors } = await fixturePage(
      browser,
      page(
        scope("dark-root", 'data-theme="dark" data-accent="cobalt"', scope("light-in-dark", 'data-theme="light"')) +
          scope("light-root", 'data-theme="light" data-accent="cobalt"', scope("dark-in-light", 'data-theme="dark"')),
      ),
      { theme: "dark" },
    );
    await p.locator("#dark-root-badge").waitFor();
    const expected = { dark: await serialized(p, COBALT.dark), light: await serialized(p, COBALT.light) };
    assert.notEqual(expected.dark, expected.light);
    assert.equal((await read(p, "dark-root")).dot, expected.dark, "dark root");
    assert.equal((await read(p, "light-in-dark")).dot, expected.light, "a light theme nested in a dark cobalt root");
    assert.equal((await read(p, "light-root")).dot, expected.light, "light root");
    assert.equal((await read(p, "dark-in-light")).dot, expected.dark, "a dark theme nested in a light cobalt root");
    assert.deepEqual(errors, []);
    await p.close();
  });

  test("the dot follows the page's theme when it is switched while running", async () => {
    const { page: p } = await fixturePage(browser, page(scope("root", 'data-accent="cobalt"')), { theme: "dark" });
    await p.locator("#root-badge").waitFor();
    assert.equal((await read(p, "root")).dot, await serialized(p, COBALT.dark));
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    assert.equal((await read(p, "root")).dot, await serialized(p, COBALT.light));
    await p.close();
  });

  test("an accent change does not move the badge or change its word", async () => {
    const { page: p } = await fixturePage(browser, page(scope("root", 'data-accent="cobalt"')), { theme: "light" });
    await p.locator("#root-badge").waitFor();
    const before = await p.locator("#root-badge").evaluate((el) => ({ box: JSON.stringify(el.getBoundingClientRect()), text: el.textContent, color: getComputedStyle(el).color }));
    await p.evaluate(() => document.getElementById("root").setAttribute("data-accent", "none"));
    const after = await p.locator("#root-badge").evaluate((el) => ({ box: JSON.stringify(el.getBoundingClientRect()), text: el.textContent, color: getComputedStyle(el).color }));
    assert.deepEqual(after, before, "the box, the word and the word's colour are the same");
    await p.close();
  });
});

describe("accent classes: no class, none and unknown names are ink", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: no data-accent, none, and an unknown name (even inside a cobalt root) give the primary-ink dot`, async () => {
      const { page: p } = await fixturePage(
        browser,
        page(
          scope("bare", "") +
            scope("none", 'data-accent="none"') +
            scope("unknown", 'data-accent="violet"') +
            scope("cobalt", 'data-accent="cobalt"', scope("none-in-cobalt", 'data-accent="none"') + scope("unknown-in-cobalt", 'data-accent="Cobalt"') + scope("empty-in-cobalt", 'data-accent=""')),
        ),
        { theme },
      );
      await p.locator("#bare-badge").waitFor();
      for (const id of ["bare", "none", "unknown", "none-in-cobalt", "unknown-in-cobalt", "empty-in-cobalt"]) {
        const { dot, ink } = await read(p, id);
        assert.equal(dot, ink, `${id}: the dot is the scope's primary ink`);
      }
      const cobalt = await read(p, "cobalt");
      assert.equal(cobalt.dot, await serialized(p, COBALT[theme]));
      assert.notEqual(cobalt.dot, cobalt.ink);
      // The variable is not set where there is no class, and not on the root.
      assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-accent-ink")), "");
      assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById("none")).getPropertyValue("--basalt-accent-ink")), "");
      await p.close();
    });
  }

  test("a browser without light-dark() gets the ink dot: the class rule is behind @supports", async () => {
    // Chromium supports light-dark(), so make the condition false the way an older browser would.
    const { page: p } = await fixturePage(browser, page(scope("cobalt", 'data-accent="cobalt"')), { theme: "dark" });
    await p.locator("#cobalt-badge").waitFor();
    await p.evaluate(() => {
      for (const sheet of document.styleSheets) {
        const walk = (rules) => {
          for (let i = rules.length - 1; i >= 0; i -= 1) {
            const rule = rules[i];
            if (rule instanceof CSSSupportsRule && rule.conditionText.includes("light-dark")) rule.parentRule ? rule.parentRule.deleteRule(i) : sheet.deleteRule(i);
            else if (rule.cssRules) walk(rule.cssRules);
          }
        };
        walk(sheet.cssRules);
      }
    });
    const { dot, ink } = await read(p, "cobalt");
    assert.equal(dot, ink, "without the class rule the dot is the ink dot");
    assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById("cobalt")).getPropertyValue("--basalt-accent-ink")), "");
    await p.close();
  });

  test("the built stylesheet: only Badge's accent dot reads the accent, directly or through an alias, and only as its background", () => {
    const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
    assert.deepEqual(readers(css).map(({ selector, property }) => ({ selector, property })), ALLOWED);
  });

  test("the built stylesheet gates every class rule behind @supports and keeps the reset outside it", async () => {
    const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
    assert.match(css, /@supports \(color: light-dark\(white, black\)\) \{\s*\[data-accent="cobalt"\]/);
    assert.match(css, /\[data-accent="none"\], \[data-accent\]:not\(\[data-accent="cobalt"\]\) \{ --basalt-accent-ink: initial; \}/);
  });
});

describe("accent classes: forced colours", () => {
  for (const scheme of ["dark", "light"]) {
    test(`${scheme}: the accent dot is a border disc in CanvasText on Canvas, drawn with forced colours left on (DECISIONS 106)`, async () => {
      const { page: p } = await fixturePage(browser, page(scope("cobalt", 'data-accent="cobalt"')), { theme: scheme });
      await p.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      await p.locator("#cobalt-badge").waitFor();
      const out = await p.evaluate(() => {
        const probe = (css) => {
          const el = document.createElement("span");
          el.style.cssText = `forced-color-adjust: none; ${css}`;
          document.body.append(el);
          const style = getComputedStyle(el);
          const value = css.startsWith("color") ? style.color : style.backgroundColor;
          el.remove();
          return value;
        };
        const badge = document.getElementById("cobalt-badge");
        const dot = badge.querySelector(".basalt-badge-dot");
        const box = dot.getBoundingClientRect();
        return {
          dot: getComputedStyle(dot).borderTopColor,
          fill: getComputedStyle(dot).backgroundColor,
          border: [getComputedStyle(dot).borderTopWidth, getComputedStyle(dot).borderTopStyle],
          canvasText: probe("color: CanvasText"),
          canvas: probe("background-color: Canvas"),
          dotAdjust: getComputedStyle(dot).forcedColorAdjust,
          badgeAdjust: getComputedStyle(badge).forcedColorAdjust,
          size: [box.width, box.height],
        };
      });
      assert.equal(out.dot, out.canvasText, "the dot takes CanvasText from where it sits");
      assert.notEqual(out.dot, out.canvas, "the dot is not the colour of the page behind it");
      assert.deepEqual(out.border, ["3px", "solid"], "the dot is its own border, half its size");
      assert.match(out.fill, /, 0\)$/, "with no fill");
      assert.notEqual(out.dotAdjust, "none", "forced colours are left on, so no system colour is named");
      assert.equal(out.badgeAdjust, "auto", "nor on the badge around it");
      assert.deepEqual(out.size, [6, 6]);
      await p.close();
    });
  }
});
