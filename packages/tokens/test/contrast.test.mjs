// WCAG 2.2 AA checks on the built tokens, every pair on every surface it can appear on.
// Translucent colours (washes, hairlines, input borders) are composited over the surface
// first, the way a browser draws them. Run with `npm test` (builds first).

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { inGamut, parse, rgb, wcagContrast } from "culori";

const tokens = JSON.parse(fs.readFileSync(new URL("../dist/json/tokens.json", import.meta.url), "utf8"));
const THEMES = ["light", "dark"];

const color = (theme, name) => {
  const entry = tokens[theme][name] ?? tokens.primitives[name];
  assert.ok(entry, `${theme}: no token ${name}`);
  return rgb(parse(entry.oklch));
};

/** `top` drawn over `under` (opaque), in sRGB, as the browser composites it. */
const over = (top, under) => {
  const a = top.alpha ?? 1;
  return { mode: "rgb", r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a) };
};

const SURFACES = ["surface-page", "surface-raised", "surface-overlay", "surface-top", "surface-sunken", "surface-sunken-strong"];
const surfaces = (theme) => SURFACES.map((s) => [s, color(theme, s)]);

const ratio = (fg, bg) => Math.round(wcagContrast(fg, bg) * 100) / 100;

function atLeast(theme, fgName, min, onto = surfaces(theme)) {
  for (const [bgName, bg] of onto) {
    const fg = over(color(theme, fgName), bg);
    const r = ratio(fg, bg);
    assert.ok(r >= min, `${theme}: ${fgName} on ${bgName} is ${r}:1, needs ${min}:1`);
  }
}

for (const theme of THEMES) {
  test(`${theme}: text meets 4.5:1 on every surface (1.4.3)`, () => {
    for (const t of ["text-primary", "text-secondary", "text-tertiary", "status-danger"]) atLeast(theme, t, 4.5);
  });

  test(`${theme}: every syntax colour, including comments, meets 4.5:1 on every surface`, () => {
    for (const t of ["keyword", "string", "constant", "function", "comment"]) atLeast(theme, `syntax-${t}`, 4.5);
  });

  test(`${theme}: control boundaries and focus meet 3:1 on every surface (1.4.11, 2.4.7)`, () => {
    for (const t of ["border-input", "border-focus"]) atLeast(theme, t, 3);
  });

  test(`${theme}: status dots meet 3:1 as non-text marks (1.4.11)`, () => {
    for (const t of ["status-success", "status-warning", "status-danger"]) atLeast(theme, t, 3);
  });

  test(`${theme}: on hover and selected washes, text and danger still meet 4.5:1`, () => {
    // Tertiary text is promoted to secondary on a wash; this proves the promotion is enough.
    const washed = surfaces(theme).flatMap(([n, s]) => ["state-hover", "state-selected"].map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    for (const t of ["text-primary", "text-secondary", "status-danger"]) atLeast(theme, t, 4.5, washed);
  });

  test(`${theme}: primary action text meets 4.5:1 on the primary action, at rest and hovered`, () => {
    for (const bg of ["action-primary", "action-primary-hover"]) {
      const r = ratio(color(theme, "action-primary-text"), color(theme, bg));
      assert.ok(r >= 4.5, `${theme}: action-primary-text on ${bg} is ${r}:1`);
    }
  });

  test(`${theme}: the selected pill differs from its track by more than colour alone`, () => {
    // WCAG 1.4.11 for the selected state: the pill carries a hairline ring, and its text is
    // primary while unselected text is secondary. Guard that the text step is real.
    const track = color(theme, "surface-sunken-strong");
    const gap = ratio(color(theme, "text-primary"), track) / ratio(color(theme, "text-secondary"), track);
    assert.ok(gap >= 1.5, `${theme}: primary vs secondary text on the track differ by only ${gap.toFixed(2)}x`);
  });
}

test("every colour is inside sRGB, so it looks the same on every display", () => {
  const srgb = inGamut("rgb");
  for (const scope of ["primitives", ...THEMES]) {
    for (const [name, entry] of Object.entries(tokens[scope])) {
      if (entry.type !== "color") continue;
      assert.ok(srgb(parse(entry.oklch)), `${scope}: ${name} (${entry.oklch}) is outside sRGB`);
    }
  }
});

test("the page is the darkest layer in both themes (no flashbang)", () => {
  const lum = (c) => wcagContrast(c, { mode: "rgb", r: 0, g: 0, b: 0 });
  for (const theme of THEMES) {
    const page = lum(color(theme, "surface-page"));
    for (const s of ["surface-raised", "surface-overlay", "surface-top"]) {
      assert.ok(lum(color(theme, s)) >= page, `${theme}: ${s} is darker than the page`);
    }
  }
});

test("every surface is its own step", () => {
  for (const theme of THEMES) {
    const hexes = SURFACES.map((name) => [name, tokens[theme][name].hex]);
    const seen = new Map();
    for (const [name, hex] of hexes) {
      assert.ok(!seen.has(hex), `${theme}: ${name} collides with ${seen.get(hex)} (${hex})`);
      seen.set(hex, name);
    }
  }
});

test("primary text stays 4.5:1 on the pressed primary action", () => {
  for (const theme of THEMES) {
    const r = ratio(color(theme, "action-primary-text"), color(theme, "action-primary-pressed"));
    assert.ok(r >= 4.5, `${theme}: action-primary-text on action-primary-pressed is ${r}:1`);
  }
});

const BRANDS = Object.keys(tokens.brands);
const ACCENT_FILLS = ["accent", "accent-hover", "accent-pressed"];

function brandColor(brand, theme, role) {
  const entry = tokens.brands[brand][theme][role];
  assert.ok(entry, `${brand} ${theme} missing ${role}`);
  return rgb(parse(entry.oklch));
}

for (const brand of BRANDS) {
  for (const theme of THEMES) {
    test(`${brand} × ${theme}: accent text is 4.5:1 and text on accent fills is 4.5:1`, () => {
      const backs = SURFACES.map((name) => [name, color(theme, name)]);
      if (tokens.brands[brand][theme]["surface-brand"]) backs.push(["surface-brand", brandColor(brand, theme, "surface-brand")]);
      const text = brandColor(brand, theme, "accent-text");
      for (const [bgName, bg] of backs) {
        const r = ratio(text, bg);
        assert.ok(r >= 4.5, `${brand} ${theme}: accent-text on ${bgName} is ${r}:1`);
      }
      for (const fill of ACCENT_FILLS) {
        const r = ratio(brandColor(brand, theme, "on-accent"), brandColor(brand, theme, fill));
        assert.ok(r >= 4.5, `${brand} ${theme}: on-accent on ${fill} is ${r}:1`);
      }
      const counter = ratio(brandColor(brand, theme, "on-accent-counter"), brandColor(brand, theme, "accent-counter"));
      assert.ok(counter >= 4.5, `${brand} ${theme}: on-accent-counter is ${counter}:1`);
    });
  }
}

test("N1 keeps 4.5:1 at its fixed lightness and chroma for every hue", () => {
  const step = 5;
  for (const theme of THEMES) {
    const spec = tokens.brands.n1.parametric[theme];
    const on = brandColor("n1", theme, "on-accent");
    const backs = SURFACES.map((name) => color(theme, name));
    for (let hue = 0; hue < 360; hue += step) {
      for (const role of ["accent-text", "accent", "accent-hover", "accent-pressed"]) {
        const { l, c } = spec[role];
        const fg = rgb({ mode: "oklch", l, c, h: hue });
        assert.ok(inGamut("rgb")(fg), `n1 ${theme} ${role} h${hue} is outside sRGB`);
        if (role !== "accent-text") {
          const r = ratio(on, fg);
          assert.ok(r >= 4.5, `n1 ${theme} on-accent on ${role} h${hue} is ${r}:1`);
        } else {
          for (const bg of backs) {
            const r = ratio(fg, bg);
            assert.ok(r >= 4.5, `n1 ${theme} accent-text h${hue} is ${r}:1`);
          }
        }
      }
    }
  }
});

test("status hues stay clear of the named brand accents", () => {
  const hueOf = (oklch) => parse(oklch).h ?? 0;
  const chromaOf = (oklch) => parse(oklch).c ?? 0;
  const distance = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  };
  const reserved = ["status-danger", "status-warning", "status-success"].map((name) => [name, hueOf(tokens.light[name].oklch)]);
  for (const brand of BRANDS) {
    for (const role of ["accent", "accent-counter"]) {
      const value = tokens.brands[brand].light[role].oklch;
      if (chromaOf(value) < 0.05) continue;
      const hue = hueOf(value);
      for (const [status, statusHue] of reserved) {
        const d = distance(hue, statusHue);
        assert.ok(d >= 24, `${brand} ${role} hue ${hue.toFixed(0)} is ${d.toFixed(0)}° from ${status}`);
      }
    }
  }
});
