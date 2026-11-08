// WCAG 2.2 AA checks on the built tokens, every pair on every surface it can appear on.
// Translucent colours (washes, hairlines, input borders) are composited over the surface
// first, the way a browser draws them. Run with `npm test` (builds first).

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { inGamut, interpolate, parse, rgb, wcagContrast } from "culori";

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

// The role tokens, then the wells that follow the level rule in dark. surface-0..3 are the same
// colours as page/raised/overlay/top (the roles alias them), so they are proved as roles.
const SURFACES = ["surface-page", "surface-raised", "surface-overlay", "surface-top", "surface-sunken", "surface-sunken-strong", "surface-well-2", "surface-well-3"];
const LEVELS = ["surface-0", "surface-1", "surface-2", "surface-3"];
const surfaces = (theme) => SURFACES.map((s) => [s, color(theme, s)]);

// The raw ratio: WCAG forbids rounding it up, so 4.499 must not pass as 4.5. Round only to print.
const ratio = (fg, bg) => wcagContrast(fg, bg);
const fmt = (r) => r.toFixed(3);
const alphaOf = (theme, name) => color(theme, name).alpha ?? 1;

function atLeast(theme, fgName, min, onto = surfaces(theme)) {
  for (const [bgName, bg] of onto) {
    const fg = over(color(theme, fgName), bg);
    const r = ratio(fg, bg);
    assert.ok(r >= min, `${theme}: ${fgName} on ${bgName} is ${fmt(r)}:1, needs ${min}:1`);
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

  test(`${theme}: on hover and selected washes, secondary and primary text still meet 4.5:1`, () => {
    // Tertiary text is promoted to secondary on a wash; this proves the promotion is enough.
    const washed = surfaces(theme).flatMap(([n, s]) => ["state-hover", "state-selected"].map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    for (const t of ["text-primary", "text-secondary"]) atLeast(theme, t, 4.5, washed);
  });

  test(`${theme}: danger text meets 4.5:1 on hover and selected washes over every surface`, () => {
    // Danger buttons and menu rows are drawn over these washes, so the pair is the one a reader sees.
    const washed = surfaces(theme).flatMap(([n, s]) => ["state-hover", "state-selected"].map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    atLeast(theme, "status-danger", 4.5, washed);
  });

  test(`${theme}: primary action text meets 4.5:1 on the primary action, at rest, hovered and pressed`, () => {
    for (const bg of ["action-primary", "action-primary-hover", "action-primary-press"]) {
      const r = ratio(color(theme, "action-primary-text"), color(theme, bg));
      assert.ok(r >= 4.5, `${theme}: action-primary-text on ${bg} is ${fmt(r)}:1`);
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

// ---- Surface levels, the rim, kbd chips, the active-row bar (the panel's rulings) ----

/** The surfaces a row or chip can sit on, and the washes that can be under it. */
const rowSurfaces = (theme) => [...LEVELS, "surface-sunken", "surface-sunken-strong"].map((n) => [n, color(theme, n)]);
const washes = ["state-hover", "state-selected"];

for (const theme of THEMES) {
  test(`${theme}: the role surfaces are the levels, so naming them changes no pixel`, () => {
    const pairs = [["surface-page", "surface-0"], ["surface-raised", "surface-1"], ["surface-overlay", "surface-2"], ["surface-top", "surface-3"]];
    for (const [role, level] of pairs) assert.deepEqual(color(theme, role), color(theme, level), `${role} is not ${level}`);
  });

  test(`${theme}: kbd text meets 4.5:1 on its chip over every level, sunken and sunken-strong, with no wash, hover and selected`, () => {
    // secondary on the bare surface, primary once a hover or selected wash is under the chip.
    for (const [name, surface] of rowSurfaces(theme)) {
      const cases = [["no wash", surface, "text-secondary"], ...washes.map((w) => [w, over(color(theme, w), surface), "text-primary"])];
      for (const [wash, base, text] of cases) {
        const chip = over(color(theme, "surface-kbd"), base);
        const r = ratio(color(theme, text), chip);
        assert.ok(r >= 4.5, `${theme}: ${text} on the kbd chip over ${wash} on ${name} is ${fmt(r)}:1`);
      }
    }
  });

  test(`${theme}: the active-row bar is at least 3:1 against the wash it sits on, over every level`, () => {
    for (const [name, surface] of rowSurfaces(theme)) {
      for (const w of washes) {
        const row = over(color(theme, w), surface);
        const r = ratio(color(theme, "text-primary"), row);
        assert.ok(r >= 3, `${theme}: the bar on ${w} over ${name} is ${fmt(r)}:1`);
      }
    }
  });

  test(`${theme}: tertiary text is promoted to secondary on a wash, and secondary holds 4.5:1 there at every level`, () => {
    const onWashes = [...rowSurfaces(theme), ...["surface-well-2", "surface-well-3"].map((n) => [n, color(theme, n)])].flatMap(([n, s]) => washes.map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    atLeast(theme, "text-secondary", 4.5, onWashes);
    // and the reason for the promotion: tertiary alone does not hold on at least one wash at level 3
    const tertiary = onWashes.some(([, bg]) => ratio(over(color(theme, "text-tertiary"), bg), bg) < 4.5);
    assert.ok(tertiary || theme === "light", `${theme}: tertiary holds on every wash, so the promotion is no longer needed`);
  });

  test(`${theme}: a primary press is a visible step from the hover fill, and is action-primary 85% toward the page`, () => {
    const hover = color(theme, "action-primary-hover");
    const press = color(theme, "action-primary-press");
    const step = ratio(hover, press);
    assert.ok(step >= 1.5, `${theme}: press is ${fmt(step)}:1 from hover`);
    // the token is the colour the spec names: color-mix(in oklch, action-primary 85%, surface-page)
    const mixed = rgb(interpolate([color(theme, "surface-page"), color(theme, "action-primary")], "oklch")(0.85));
    for (const channel of ["r", "g", "b"]) assert.ok(Math.abs(mixed[channel] - press[channel]) < 0.002, `${theme}: action-primary-press ${channel} is ${press[channel]}, the mix is ${mixed[channel]}`);
  });
}

// An inset focus ring on a command-menu-style input band (docs/foundations.md, Focus): the 2px outline
// sits inside the band, so its neighbours are the band's own fill within, and the panel's rim at the edge.
// Each of them is a boundary the ring has to hold 3:1 against (1.4.11, 2.4.7).
for (const theme of THEMES) {
  test(`${theme}: border-focus holds 3:1 against the input band fills and the rim composites it touches`, () => {
    const focus = color(theme, "border-focus");
    const neighbours = theme === "dark"
      ? [
          ["band fill surface-2", color(theme, "surface-2")],
          ["band fill surface-3", color(theme, "surface-3")],
          ["border-rim-top over surface-1", over(color(theme, "border-rim-top"), color(theme, "surface-1"))],
          ["border-rim-top over surface-2", over(color(theme, "border-rim-top"), color(theme, "surface-2"))],
          ["border-rim over surface-1", over(color(theme, "border-rim"), color(theme, "surface-1"))],
        ]
      : [
          ["band fill (white)", color(theme, "surface-1")],
          ["border-rim over white", over(color(theme, "border-rim"), color(theme, "surface-1"))],
          ["page (surface-0)", color(theme, "surface-0")],
        ];
    for (const [name, bg] of neighbours) {
      const r = ratio(over(focus, bg), bg);
      assert.ok(r >= 3, `${theme}: border-focus on ${name} is ${fmt(r)}:1, needs 3:1`);
    }
  });
}

test("depth: dark levels strictly increase, and light levels 1 to 3 are one white (nesting shows by rim, not by value)", () => {
  const lum = (c) => wcagContrast(c, { mode: "rgb", r: 0, g: 0, b: 0 });
  const dark = LEVELS.map((n) => lum(color("dark", n)));
  for (let i = 1; i < dark.length; i++) assert.ok(dark[i] > dark[i - 1], `dark ${LEVELS[i]} is not lighter than ${LEVELS[i - 1]}`);
  const light = LEVELS.slice(1).map((n) => JSON.stringify(color("light", n)));
  assert.equal(new Set(light).size, 1, "light levels 1 to 3 differ");
  assert.ok(lum(color("light", "surface-0")) < lum(color("light", "surface-1")), "light page is not below the panels");
});

test("rim guards: dark rim at most 8% white, rim-top above rim in dark and equal in light, divider no brighter than the rim", () => {
  assert.ok(alphaOf("dark", "border-rim") <= 0.08 && alphaOf("dark", "border-rim-top") <= 0.08, "a dark rim is brighter than 8% white");
  assert.ok(alphaOf("dark", "border-rim-top") > alphaOf("dark", "border-rim"), "dark rim-top is not above the rim");
  assert.deepEqual(color("light", "border-rim-top"), color("light", "border-rim"), "light rim-top differs from the rim");
  for (const theme of THEMES) {
    assert.ok(alphaOf(theme, "border-divider") <= alphaOf(theme, "border-rim"), `${theme}: the divider is brighter than the rim`);
    for (const n of ["border-rim", "border-rim-top"]) {
      // a rim is a hairline-weight colour: white or black at a fixed alpha, nothing in between
      const c = color(theme, n);
      assert.ok(Math.abs(c.r - Math.round(c.r)) < 1e-4 && Math.abs(c.r - c.g) < 1e-4 && Math.abs(c.g - c.b) < 1e-4, `${theme}: ${n} is not pure white or black at an alpha`);
    }
  }
});

test("the kbd chip is a fill and nothing else: no border token exists for it", () => {
  assert.ok(!Object.keys(tokens.dark).some((k) => k.startsWith("border-kbd")));
  assert.ok(alphaOf("dark", "surface-kbd") <= 0.08 && alphaOf("light", "surface-kbd") <= 0.06);
});

// ---- The smoked header (surface-chrome, blur-chrome): the one translucent surface ----
//
// The fill is the page colour at a fixed alpha (85% in dark, 92% in light) over a backdrop blurred by 12px, so what sits
// behind the bar can be anything. The worst case is the plate that fights the fill hardest: pure white under the dark bar,
// pure black under the light one; both plates are proved in both themes. A blur only mixes colours between those two
// extremes, so no backdrop can give a text pair a lower ratio than the plate it is nearest to. Only primary and secondary
// text may sit on it (tertiary is not used there), so those are the pairs proved.

const PLATES = { white: { mode: "rgb", r: 1, g: 1, b: 1 }, black: { mode: "rgb", r: 0, g: 0, b: 0 } };

for (const theme of THEMES) {
  test(`${theme}: the header fill is the page colour at 85% (dark) or 92% (light), and its blur is 12px`, () => {
    const fill = color(theme, "surface-chrome");
    const page = color(theme, "surface-page");
    assert.equal(Math.round((fill.alpha ?? 1) * 100), theme === "dark" ? 85 : 92, `${theme}: header fill alpha`);
    for (const channel of ["r", "g", "b"]) assert.ok(Math.abs(fill[channel] - page[channel]) < 1e-4, `${theme}: the header fill is not the page colour (${channel})`);
    assert.equal(tokens.primitives["blur-chrome"].css, "12px");
  });

  test(`${theme}: primary and secondary text meet 4.5:1 on the header fill over a pure white and a pure black plate`, () => {
    const fill = color(theme, "surface-chrome");
    for (const [plate, under] of Object.entries(PLATES)) {
      const bar = over(fill, under);
      for (const t of ["text-primary", "text-secondary"]) {
        const r = ratio(over(color(theme, t), bar), bar);
        assert.ok(r >= 4.5, `${theme}: ${t} on the header over a ${plate} plate is ${fmt(r)}:1, needs 4.5:1`);
      }
    }
  });

  test(`${theme}: the pairs a control in the bar draws meet 4.5:1 over a pure white and a pure black plate (hover wash, selected wash, kbd chip, danger on the bare fill)`, () => {
    // Opus round-3 finding 2c. Every layer is composited in order: plate, bar fill, then the wash or chip.
    const fill = color(theme, "surface-chrome");
    for (const [plate, under] of Object.entries(PLATES)) {
      const bar = over(fill, under);
      const pairs = [
        ["text-primary on the hover wash", "text-primary", over(color(theme, "state-hover"), bar)],
        ["text-primary on the selected wash", "text-primary", over(color(theme, "state-selected"), bar)],
        ["text-secondary on the kbd chip", "text-secondary", over(color(theme, "surface-kbd"), bar)],
        ["status-danger on the bare fill", "status-danger", bar],
      ];
      for (const [name, text, bg] of pairs) {
        const r = ratio(over(color(theme, text), bg), bg);
        assert.ok(r >= 4.5, `${theme}: ${name} in the bar over a ${plate} plate is ${fmt(r)}:1, needs 4.5:1`);
      }
    }
  });

  test(`${theme}: tertiary text fails on the header over at least one plate, which is why the rule bars it`, () => {
    const fill = color(theme, "surface-chrome");
    const worst = Math.min(...Object.values(PLATES).map((under) => { const bar = over(fill, under); return ratio(over(color(theme, "text-tertiary"), bar), bar); }));
    assert.ok(worst < 4.5, `${theme}: tertiary holds ${fmt(worst)}:1 on every plate, so the rule against it is no longer needed`);
  });

  test(`${theme}: a focus ring in the header keeps 3:1 over both plates`, () => {
    // A focus ring on a control in the bar is drawn on the same composite, and needs 3:1 (2.4.7, 1.4.11).
    const fill = color(theme, "surface-chrome");
    for (const [plate, under] of Object.entries(PLATES)) {
      const bar = over(fill, under);
      const r = ratio(over(color(theme, "border-focus"), bar), bar);
      assert.ok(r >= 3, `${theme}: border-focus on the header over a ${plate} plate is ${fmt(r)}:1, needs 3:1`);
    }
  });
}

test("the header's worst cases are the ones the panel measured: secondary is about 5.86:1 in dark over white and 6.77:1 in light over black", () => {
  const dark = over(color("dark", "surface-chrome"), PLATES.white);
  const light = over(color("light", "surface-chrome"), PLATES.black);
  // The council rounded the composite to 8 bits; this one keeps it exact. They agree to the second decimal place.
  assert.ok(Math.abs(ratio(over(color("dark", "text-secondary"), dark), dark) - 5.86) <= 0.03, "dark secondary over white");
  assert.ok(Math.abs(ratio(over(color("light", "text-secondary"), light), light) - 6.77) <= 0.03, "light secondary over black");
});

// ---- N1's accent (accent-n1-needs-you): cobalt, one role, "needs you" ----
//
// The council decided it 4-0 on 2026-11-08 at these exact values (DECISIONS.md item 21; round 2, Sol item 8). It is drawn two ways,
// always beside a word: as text (4.5:1) and as a dot or icon (3:1, a non-text mark, 1.4.11). Both are proved on every surface a
// reader can meet it on: the four levels and the roles built on them, the wells, and the hover and selected washes over each of them
// (a "Needs you" row is hovered and selected like any other). It is not allowed on the header bar (only primary and secondary ink
// sit there), so the bar is not in this list. Ratios are raw, never rounded up.

const ACCENT = "accent-n1-needs-you";
const ACCENT_VALUES = { light: [0.47, 0.17, 264], dark: [0.72, 0.14, 264] };
const accentSurfaces = (theme) => [
  ...surfaces(theme),
  ...surfaces(theme).flatMap(([n, s]) => washes.map((w) => [`${w} over ${n}`, over(color(theme, w), s)])),
];

for (const theme of THEMES) {
  test(`${theme}: the N1 accent is the value the council decided, oklch(${ACCENT_VALUES[theme].join(" ")})`, () => {
    assert.equal(tokens[theme][ACCENT].oklch, `oklch(${ACCENT_VALUES[theme].join(" ")})`);
  });

  test(`${theme}: the N1 accent as text meets 4.5:1 on every surface and every wash (1.4.3)`, () => {
    atLeast(theme, ACCENT, 4.5, accentSurfaces(theme));
  });

  test(`${theme}: the N1 accent as a dot or icon meets 3:1 on every surface and every wash (1.4.11)`, () => {
    atLeast(theme, ACCENT, 3, accentSurfaces(theme));
  });

  test(`${theme}: the N1 accent is inside sRGB: its unclamped channels are all within 0 to 1`, () => {
    // inGamut() above has a small tolerance; this is stricter: the OKLCH value converts to sRGB with no channel clipped.
    const { r, g, b } = color(theme, ACCENT);
    for (const [name, v] of Object.entries({ r, g, b })) assert.ok(v >= 0 && v <= 1, `${theme}: ${ACCENT} ${name} is ${v}, outside sRGB`);
  });
}

test("the N1 accent on the page is the ratio the council measured: 8.36:1 in dark, 6.78:1 in light", () => {
  for (const [theme, expected] of Object.entries({ dark: 8.36, light: 6.78 })) {
    const page = color(theme, "surface-page");
    const r = ratio(color(theme, ACCENT), page);
    assert.ok(Math.abs(r - expected) <= 0.01, `${theme}: ${ACCENT} on the page is ${fmt(r)}:1, the council measured ${expected}:1`);
  }
});

// ---- Confinement: cobalt is never code styling ----
//
// Syntax-keyword blue is at hue 255, nine degrees from cobalt's 264, so the two read as one hue when they sit side by side. The
// accent means "needs you" and nothing else, and syntax colours never carry status or a product accent (foundations). Keep them apart
// three ways: by value, by reference, and by where the CSS and the highlighter use them.

const hueOf = (theme, name) => parse(tokens[theme][name].oklch).h;

for (const theme of THEMES) {
  test(`${theme}: no syntax colour is the N1 accent, and the keyword blue stays at least 9 degrees from it`, () => {
    for (const t of ["keyword", "string", "constant", "function", "comment"]) {
      assert.notEqual(tokens[theme][`syntax-${t}`].oklch, tokens[theme][ACCENT].oklch, `${theme}: syntax-${t} is the N1 accent`);
    }
    assert.ok(Math.abs(hueOf(theme, ACCENT) - hueOf(theme, "syntax-keyword")) >= 9, `${theme}: the accent has moved closer than 9 degrees to syntax-keyword blue`);
  });
}

// The rules in `css` that style code (a code or pre element, Basalt's code classes, a .tok-* class, Shiki's output, a
// [data-language] block) and use an accent, directly or through a custom property that aliases one.
function accentOnCode(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
  // A custom property whose value names an accent carries the accent wherever it is used; follow aliases of aliases too.
  const carriers = ["--basalt-accent-"];
  for (let grew = true; grew; ) {
    grew = false;
    for (const { body } of rules) {
      for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:([^;]*)/g)) {
        if (!carriers.includes(name) && carriers.some((c) => value.includes(c))) { carriers.push(name); grew = true; }
      }
    }
  }
  // Any non-word character, a hyphen included, is a boundary: `.basalt-code`, `:where(code)` and `.basalt-code-pre` all count.
  const codeSelector = /(^|[^\w])(code|pre)\b|\.tok-|codeblock|shiki|syntax|\[data-language/i;
  return rules
    .filter(({ selector, body }) => codeSelector.test(selector) && carriers.some((c) => body.includes(c)))
    .map(({ selector }) => selector);
}

test("the confinement check catches an accent on code, directly or through an alias (it can fail)", () => {
  const bad = [
    ".basalt-code .line { color: var(--basalt-accent-n1-needs-you); }",
    ".basalt-inline-code { color: var(--basalt-accent-n1-needs-you); }",
    ":where(code) { color: var(--basalt-accent-n1-needs-you); }",
    "[data-language] span { color: var(--basalt-accent-n1-needs-you); }",
    ":root { --code-ink: var(--basalt-accent-n1-needs-you); } code { color: var(--code-ink); }",
    ":root { --a: var(--basalt-accent-n1-needs-you); --b: var(--a); } pre { color: var(--b); }",
  ];
  for (const css of bad) assert.ok(accentOnCode(css).length > 0, `the check missed: ${css}`);
  assert.deepEqual(accentOnCode(".basalt-badge { color: var(--basalt-accent-n1-needs-you); } code { color: var(--basalt-syntax-keyword); }"), []);
});

test("the N1 accent is not used by code styling, and Basalt's own stylesheets use no accent at all", () => {
  const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
  // The highlighter's theme only ever names syntax and text variables.
  assert.doesNotMatch(read("../../react/src/syntax.ts"), /accent/i, "the Shiki theme in syntax.ts mentions an accent");
  // An accent belongs to a product. Basalt's components and the HTML skill name none, so none can reach code or the header.
  for (const file of ["../../react/src/styles/components.css", "../../../tools/html-skill/src/basalt-html.css"]) {
    const css = read(file);
    assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ""), /--basalt-accent-/, `${file} uses a product accent`);
    assert.deepEqual(accentOnCode(css), [], `${file} puts an accent on code`);
  }
});
