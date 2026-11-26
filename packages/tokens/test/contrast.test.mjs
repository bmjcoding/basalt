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

  // DECISIONS 138 and 139: a required field's "Required" and "Optional" are tertiary text-xs on the level a field sits on (0 to 3), and a cut cell's
  // plate and the focused skip link are level 3 with primary ink.
  test(`${theme}: the necessity word (tertiary) holds 4.5:1 on levels 0 to 3, and the cell plate and skip link's primary ink holds on level 3`, () => {
    atLeast(theme, "text-tertiary", 4.5, LEVELS.map((s) => [s, color(theme, s)]));
    atLeast(theme, "text-primary", 4.5, [["surface-3", color(theme, "surface-3")]]);
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

  // DECISIONS 167 (Q9g, A5-16b): light status-warning is oklch(0.60 0.142 62). On the selected wash over the sunken area it measured 2.975:1, and over the
  // stronger sunken 2.847:1 at L 0.62, with no test on either. The warning mark is asserted on every surface and on both washes over every surface.
  test(`${theme}: the warning mark meets 3:1 on every surface and on the hover and selected washes over every surface`, () => {
    const washed = surfaces(theme).flatMap(([n, s]) => ["state-hover", "state-selected"].map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    atLeast(theme, "status-warning", 3);
    atLeast(theme, "status-warning", 3, washed);
  });

  test(`${theme}: the two pairs the second audit measured (the warning mark on a selected row over sunken and over sunken-strong) are asserted by name`, () => {
    for (const surface of ["surface-sunken", "surface-sunken-strong"]) {
      const bg = over(color(theme, "state-selected"), color(theme, surface));
      const r = ratio(color(theme, "status-warning"), bg);
      assert.ok(r >= 3, `${theme}: status-warning on state-selected over ${surface} is ${fmt(r)}:1, needs 3:1`);
    }
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

  test(`${theme}: a chosen item's label meets 4.5:1 on its own fill, and a resting one on its, at every level (the state is 600 against 400, not the fill or the ink step)`, (t) => {
    // WCAG 1.4.1 / 1.4.11, decisions 138 and 139: "chosen" is the label at 600 in primary ink against 400 in secondary, each label
    // reserving its 600 width, so the information that must reach 3:1 is the label itself, which is text and holds 4.5:1 here. The
    // weight, the width reserved and the 0px every item moves are proved on the components (packages/react/test/audit-design-a.test.mjs).
    // The old guard asserted a ratio of two contrasts, which is not 1.4.11; it is gone. Neither the pill against its track (1.14:1 in
    // light, 1.35:1 in dark) nor the ink step (1.75:1 in dark, 2.12:1 in light) is asserted as the pass: they are support, and they are reported below.
    const pill = theme === "dark" ? over({ ...color(theme, "neutral-100"), alpha: 0.09 }, color(theme, "surface-top")) : color(theme, "surface-top");
    const track = color(theme, "surface-sunken-strong");
    const fills = [["the pill", pill, "text-primary"], ["the track", track, "text-secondary"]];
    for (const [name, fill, ink] of fills) {
      const r = ratio(over(color(theme, ink), fill), fill);
      assert.ok(r >= 4.5, `${theme}: ${ink} on ${name} is ${fmt(r)}:1`);
    }
    for (const level of LEVELS) {
      const surface = color(theme, level);
      for (const ink of ["text-primary", "text-secondary"]) assert.ok(ratio(over(color(theme, ink), surface), surface) >= 4.5, `${theme}: ${ink} on ${level}`);
    }
    // the current page's plate is surface-raised at every level
    const plate = color(theme, "surface-raised");
    assert.ok(ratio(color(theme, "text-primary"), plate) >= 4.5, `${theme}: the current page's number on its plate`);
    // reported, not asserted as the pass
    t.diagnostic(`${theme}: pill against track ${fmt(ratio(pill, track))}:1, primary ink against secondary on the track ${fmt(ratio(color(theme, "text-primary"), track) / ratio(color(theme, "text-secondary"), track))}x of the contrasts`);
  });
}

// ---- DECISIONS 154: the controls batch ----

const AMOUNT = Number(tokens.primitives["opacity-amount"].css);

for (const theme of THEMES) {
  // D11b, row 11: the amount is the label's ink at opacity-amount only where that holds 4.5:1. Primary, secondary and outline pass on every
  // fill and surface they sit on (rest, hover wash, selected wash); ghost's secondary ink and danger's do not on every surface, so they keep full ink.
  test(`${theme}: a button's amount at opacity-amount meets 4.5:1 on primary (rest, hover, press), and as primary ink on every surface and wash (secondary, outline)`, () => {
    for (const bg of ["action-primary", "action-primary-hover", "action-primary-press"]) {
      const under = color(theme, bg);
      const r = ratio(over({ ...color(theme, "action-primary-text"), alpha: AMOUNT }, under), under);
      assert.ok(r >= 4.5, `${theme}: the amount on ${bg} is ${fmt(r)}:1`);
    }
    const unders = surfaces(theme).flatMap(([n, s]) => [[n, s], ...["state-hover", "state-selected"].map((w) => [`${w} over ${n}`, over(color(theme, w), s)])]);
    for (const [n, under] of unders) {
      const r = ratio(over({ ...color(theme, "text-primary"), alpha: AMOUNT }, under), under);
      assert.ok(r >= 4.5, `${theme}: the amount in primary ink on ${n} is ${fmt(r)}:1`);
    }
  });

  // DECISIONS 166: under the lifted dark inks secondary at the amount's opacity now holds 4.5:1 on its own, so the rule is no longer
  // forced by contrast. It still stands (no pixel was voted on): the amount's quiet opacity is applied to primary, secondary and outline
  // only, and ghost and danger keep full ink. This test asserts the rule is applied, not that contrast compels it.
  test(`${theme}: ghost and danger keep full ink on the amount: full secondary ink holds 4.5:1 on every surface, and the quiet opacity is applied to primary, secondary and outline only`, () => {
    atLeast(theme, "text-secondary", 4.5);
    const css = fs.readFileSync(new URL("../../react/src/styles/components.css", import.meta.url), "utf8");
    const rule = '.basalt-button:is([data-variant="primary"], [data-variant="secondary"], [data-variant="outline"]):not([data-disabled], [data-loading]) > .basalt-button-amount { opacity: var(--basalt-opacity-amount); }';
    assert.ok(css.includes(rule), `${theme}: the amount's opacity is no longer limited to primary, secondary and outline`);
  });

  // D9, A3: the switch row's and the option chip's edge is the input boundary (3:1). Its hover step is text-secondary, because border-hover is
  // fainter than the input boundary and would take the edge under 3:1.
  test(`${theme}: the switch row's and option chip's edge holds 3:1 at rest and on hover (text-secondary), and border-hover would not`, () => {
    atLeast(theme, "border-input", 3);
    atLeast(theme, "text-secondary", 3);
    const worst = Math.min(...surfaces(theme).map(([, s]) => ratio(over(color(theme, "border-hover"), s), s)));
    assert.ok(worst < 3, `${theme}: border-hover is ${fmt(worst)}:1 at worst; it is fainter than border-input, so it cannot be the hover edge of a 3:1 boundary`);
  });

  test(`${theme}: an option chip's filled seat (action-primary with the check in action-primary-text) meets 3:1 as a mark, on the selected wash over every level`, () => {
    const r = ratio(color(theme, "action-primary-text"), color(theme, "action-primary"));
    assert.ok(r >= 3, `${theme}: the check on the seat is ${fmt(r)}:1`);
    for (const [n, s] of LEVELS.map((l) => [l, color(theme, l)])) {
      const wash = over(color(theme, "state-selected"), s);
      const seat = ratio(color(theme, "action-primary"), wash);
      assert.ok(seat >= 3, `${theme}: the filled seat on the wash over ${n} is ${fmt(seat)}:1`);
    }
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

// ---- Surface levels, the rim, kbd chips (the panel's rulings) ----

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

  test(`${theme}: tertiary text is promoted to secondary on a wash, and secondary holds 4.5:1 there at every level`, () => {
    const onWashes = [...rowSurfaces(theme), ...["surface-well-2", "surface-well-3"].map((n) => [n, color(theme, n)])].flatMap(([n, s]) => washes.map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    atLeast(theme, "text-secondary", 4.5, onWashes);
    // DECISIONS 166: under the lifted dark inks tertiary holds 4.5:1 on every wash too (4.76 at worst), so contrast no longer forces the
    // promotion. The rule stays (no pixel was voted on): the step to secondary is still a real lift on every wash. The components apply
    // it (menus, command menu, table, header: see their behaviour tests).
    for (const [n, bg] of onWashes) {
      const lift = ratio(over(color(theme, "text-secondary"), bg), bg) / ratio(over(color(theme, "text-tertiary"), bg), bg);
      assert.ok(lift > 1, `${theme}: secondary is no step above tertiary on ${n}, so the promotion has no effect`);
    }
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

// ---- The menus round (council item 48, owner item 49): the plate, the lift, the depth floor ----
//
// A popup row's lit state is a plate and an ink step, not a bar. The plate is the selected wash, painted as one solid fill per
// level: in dark the next level plus the wash (surface-2 under level 1, surface-3 under levels 2 and 3, where the cap has no next
// level), in light the wash over the panel (levels 1 to 3 are one white). Rest rows are secondary ink and the lit row primary.
// These are the pairs a reader sees; the CSS recipe is checked against them in the browser (menus.test.mjs).

const PLATE_BASE = { 1: "surface-2", 2: "surface-3", 3: "surface-3" };
const plateOf = (theme, level) => over(color(theme, "state-selected"), color(theme, theme === "dark" ? PLATE_BASE[level] : `surface-${level}`));
const near = (actual, expected, tolerance, what) => assert.ok(Math.abs(actual - expected) <= tolerance, `${what}: ${fmt(actual)}, the council drew ${expected}`);

for (const theme of THEMES) {
  for (const level of [1, 2, 3]) {
    const panel = color(theme, `surface-${level}`);

    test(`${theme}, level ${level}: the plate is a step from its panel, ink holds 4.5:1 on panel and plate, and danger holds on both`, () => {
      const plate = plateOf(theme, level);
      // The plate is quiet by design (the lift carries the row), so pin its step to what the council drew.
      const step = ratio(plate, panel);
      const drawn = theme === "dark" ? { 1: 1.31, 2: 1.35, 3: 1.28 }[level] : 1.17;
      near(step, drawn, 0.01, `the plate against its panel`);
      for (const [name, bg] of [["the panel", panel], ["the plate", plate]]) {
        for (const text of ["text-primary", "text-secondary"]) {
          const r = ratio(over(color(theme, text), bg), bg);
          assert.ok(r >= 4.5, `${theme}: ${text} on ${name} at level ${level} is ${fmt(r)}:1`);
        }
        const danger = ratio(over(color(theme, "status-danger"), bg), bg);
        assert.ok(danger >= 4.5, `${theme}: danger on ${name} at level ${level} is ${fmt(danger)}:1`);
      }
      // the lift is a real step: rest rows are secondary on the panel, lit rows primary on the plate. DECISIONS 166: the floor was 1.5x; the lifted
      // dark inks (primary #f4f4f4, secondary #bababa) measure 1.332, 1.298 and 1.367 at levels 1 to 3 (light 1.7 or more), so it is that worst rounded
      // down to two places, 1.29x, and any further dimming fails.
      assert.ok(ratio(color(theme, "text-primary"), plate) / ratio(color(theme, "text-secondary"), panel) >= 1.29, `${theme}: the lift is under 1.29x at level ${level}`);
    });

    test(`${theme}, level ${level}: a group label is tertiary on the panel, and a hint lifts to secondary on the plate`, () => {
      const plate = plateOf(theme, level);
      const group = ratio(over(color(theme, "text-tertiary"), panel), panel);
      assert.ok(group >= 4.5, `${theme}: tertiary on level ${level} is ${fmt(group)}:1`);
      assert.ok(ratio(over(color(theme, "text-secondary"), plate), plate) >= 4.5, `${theme}: a hint (secondary) on the plate at level ${level}`);
      // the lift is a rule, applied on the plate (menus.test.mjs): the hint steps from tertiary to secondary, so secondary is a real step above
      // tertiary there. DECISIONS 166: under the lifted dark inks tertiary holds 4.5:1 on the plate too (5.13, 4.76 and 4.76 at levels 1 to 3),
      // so contrast no longer forces it, and the rule stays.
      assert.ok(ratio(over(color(theme, "text-secondary"), plate), plate) > ratio(over(color(theme, "text-tertiary"), plate), plate), `${theme}: the hint lift on the plate at level ${level} is no step`);
    });

    test(`${theme}, level ${level}: a kbd chip on the plate holds 4.5:1 for its primary text, and on the panel for its secondary text`, () => {
      const plate = plateOf(theme, level);
      const onPlate = over(color(theme, "surface-kbd"), plate);
      const onPanel = over(color(theme, "surface-kbd"), panel);
      assert.ok(ratio(color(theme, "text-primary"), onPlate) >= 4.5, `${theme}: the chip text on the plate at level ${level}`);
      assert.ok(ratio(color(theme, "text-secondary"), onPanel) >= 4.5, `${theme}: the chip text at rest at level ${level}`);
    });
  }

  test(`${theme}: danger on the plate is pinned to what the council drew (4.80:1 on levels 2 and 3 in dark, 5.16 on level 1, 5.43 in light)`, () => {
    const drawn = theme === "dark" ? { 1: 5.16, 2: 4.8, 3: 4.8 } : { 1: 5.43, 2: 5.43, 3: 5.43 };
    for (const level of [1, 2, 3]) {
      const plate = plateOf(theme, level);
      near(ratio(over(color(theme, "status-danger"), plate), plate), drawn[level], 0.01, `${theme}: danger on the plate at level ${level}`);
    }
  });

  test(`${theme}: the rim holds against the page at the level-1 floor, and a level-1 popup keeps its edge`, () => {
    const page = color(theme, "surface-page");
    const panel = color(theme, "surface-1");
    const rim = ratio(over(color(theme, "border-rim"), panel), page);
    const rimTop = ratio(over(color(theme, "border-rim-top"), panel), page);
    near(rim, theme === "dark" ? 1.19 : 1.15, 0.01, `${theme}: the rim over level 1 against the page`);
    near(rimTop, theme === "dark" ? 1.25 : 1.15, 0.01, `${theme}: the lit top over level 1 against the page`);
    near(ratio(panel, page), theme === "dark" ? 1.06 : 1.05, 0.02, `${theme}: a level-1 panel against the page`);
    // the floor is only safe because the rim outranks the fill step: a level-1 popup has no fill contrast to speak of
    assert.ok(rim > ratio(panel, page), `${theme}: the rim is no stronger than the fill step, so the edge would be lost at level 1`);
  });
}

test("the dark plate is the next level plus state-selected, and it is lighter than the next level at every level", () => {
  const lum = (c) => wcagContrast(c, { mode: "rgb", r: 0, g: 0, b: 0 });
  for (const level of [1, 2, 3]) assert.ok(lum(plateOf("dark", level)) > lum(color("dark", PLATE_BASE[level])), `the wash does not lift the plate at level ${level}`);
  assert.equal(alphaOf("dark", "state-selected"), 0.09, "the CSS recipe mixes white at 9%: change both together");
  assert.equal(alphaOf("light", "state-selected"), 0.07);
});

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
// The fill is the page colour at a fixed alpha (92.5% in dark, 96% in light: the owner's midpoint, DECISIONS 146 E) over a backdrop blurred by 12px, so what sits
// behind the bar can be anything. The worst case is the plate that fights the fill hardest: pure white under the dark bar,
// pure black under the light one; both plates are proved in both themes. A blur only mixes colours between those two
// extremes, so no backdrop can give a text pair a lower ratio than the plate it is nearest to. Only primary and secondary
// text may sit on it (tertiary is not used there), so those are the pairs proved.

const PLATES = { white: { mode: "rgb", r: 1, g: 1, b: 1 }, black: { mode: "rgb", r: 0, g: 0, b: 0 } };

for (const theme of THEMES) {
  test(`${theme}: the header fill is the page colour at 92.5% (dark) or 96% (light), and its blur is 12px`, () => {
    const fill = color(theme, "surface-chrome");
    const page = color(theme, "surface-page");
    assert.equal(Math.round((fill.alpha ?? 1) * 1000), theme === "dark" ? 925 : 960, `${theme}: header fill alpha`);
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

  test(`${theme}: at the midpoint primary and secondary hold 4.5:1 on the bare fill and on the selected wash, and tertiary is kept off the bar (DECISIONS 146 E, 166)`, () => {
    // At 85% dark, secondary on the selected wash over white was 4.40:1, a failure. Every pair is composited in order: plate,
    // bar fill, wash, ink. Tertiary passes on the bare fill, and DECISIONS 166 (the lifted dark inks) makes it pass on the wash too (4.997:1 at
    // worst), so contrast no longer forces the rule that keeps it off the bar. The rule stays: only primary and secondary sit on the bar, and
    // tertiary inside it is promoted to secondary (press-and-chrome.test.mjs), a real step on the wash.
    const fill = color(theme, "surface-chrome");
    for (const [plate, under] of Object.entries(PLATES)) {
      const bar = over(fill, under);
      const wash = over(color(theme, "state-selected"), bar);
      for (const t of ["text-primary", "text-secondary"]) {
        for (const [where, bg] of [["the bare fill", bar], ["the selected wash", wash]]) {
          const r = ratio(over(color(theme, t), bg), bg);
          assert.ok(r >= 4.5, `${theme}: ${t} on ${where} over a ${plate} plate is ${fmt(r)}:1, needs 4.5:1`);
        }
      }
      assert.ok(ratio(over(color(theme, "text-tertiary"), bar), bar) >= 4.5, `${theme}: tertiary on the bare fill over a ${plate} plate`);
    }
    for (const [plate, under] of Object.entries(PLATES)) {
      const wash = over(color(theme, "state-selected"), over(fill, under));
      assert.ok(ratio(over(color(theme, "text-secondary"), wash), wash) > ratio(over(color(theme, "text-tertiary"), wash), wash), `${theme}: promoting tertiary to secondary on the wash over a ${plate} plate is no step`);
    }
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

test("the header's worst cases are the ones the council measured at the midpoint: secondary 9.60:1 in dark over white (7.19 before DECISIONS 166) and 7.42:1 in light over black; on the selected wash 7.59:1 (5.71 before) and 6.34:1", () => {
  const dark = over(color("dark", "surface-chrome"), PLATES.white);
  const light = over(color("light", "surface-chrome"), PLATES.black);
  // The council rounded the composite to 8 bits; this one keeps it exact. They agree to the second decimal place.
  const secondary = (theme, bar) => ratio(over(color(theme, "text-secondary"), bar), bar);
  assert.ok(Math.abs(secondary("dark", dark) - 9.6) <= 0.03, "dark secondary over white");
  assert.ok(Math.abs(secondary("light", light) - 7.42) <= 0.03, "light secondary over black");
  const darkWash = over(color("dark", "state-selected"), dark);
  const lightWash = over(color("light", "state-selected"), light);
  assert.ok(Math.abs(secondary("dark", darkWash) - 7.59) <= 0.05, `dark secondary on the selected wash over white ${secondary("dark", darkWash)}`);
  assert.ok(Math.abs(secondary("light", lightWash) - 6.34) <= 0.05, `light secondary on the selected wash over black ${secondary("light", lightWash)}`);
  // The pair that failed before the midpoint: 4.40:1 at 85%.
  assert.ok(secondary("dark", darkWash) >= 4.5, "the 4.40:1 failure is gone");
  // Primary and the focus ring, at the same worst cases.
  assert.ok(ratio(over(color("dark", "text-primary"), dark), dark) >= 15.8, "dark primary over white");
  assert.ok(ratio(over(color("light", "text-primary"), light), light) >= 15.7, "light primary over black");
});

// ---- Callouts, toasts and the notification centre (council item 82, owner item 83) ----
//
// A callout keeps a neutral fill at its own level and draws success, warning and danger as a rim: the status colour at 45% over
// that level, one solid colour on every side. The rim is decorative (it is never the only cue, and no pair here asks it to reach
// 3:1): the icon (3:1) and the words (4.5:1) carry the status, so those are the pairs proved, on every level a callout can sit on.
// A toast is level 1 and fixed, and carries the same icons and the danger title on that fill. The centre's entries sit on a
// popover (levels 1 to 3), at rest and on the hover plate.

const STATUS_NAMES = ["status-success", "status-warning", "status-danger"];

for (const theme of THEMES) {
  for (const level of [1, 2, 3]) {
    const panel = color(theme, `surface-${level}`);

    test(`${theme}, level ${level}: a callout's icon holds 3:1, danger's title 4.5:1, the body and the other titles 4.5:1, with no tint under them`, () => {
      for (const name of STATUS_NAMES) {
        const icon = ratio(over(color(theme, name), panel), panel);
        assert.ok(icon >= 3, `${theme}: the ${name} icon on a level-${level} callout is ${fmt(icon)}:1`);
      }
      const title = ratio(over(color(theme, "status-danger"), panel), panel);
      assert.ok(title >= 4.5, `${theme}: danger's title on level ${level} is ${fmt(title)}:1`);
      for (const text of ["text-primary", "text-secondary"]) {
        const r = ratio(over(color(theme, text), panel), panel);
        assert.ok(r >= 4.5, `${theme}: ${text} on a level-${level} callout is ${fmt(r)}:1`);
      }
      // info and a plain note: a secondary icon, 3:1 or better
      assert.ok(ratio(over(color(theme, "text-secondary"), panel), panel) >= 3, `${theme}: the info icon on level ${level}`);
    });

    test(`${theme}, level ${level}: the 45% status rim is pinned to what the council measured, and is decorative: under 3:1 on its own fill`, () => {
      const drawn = {
        dark: { 1: [2.563, 2.758, 2.171], 2: [2.584, 2.786, 2.189], 3: [2.572, 2.777, 2.18] },
        // light warning: 1.744 before DECISIONS 167 (Q9g) took light status-warning to oklch(0.60 0.137 62): 1.790 on every level, still decoration
        light: { 1: [1.891, 1.79, 2.27], 2: [1.891, 1.79, 2.27], 3: [1.891, 1.79, 2.27] },
      }[theme][level];
      STATUS_NAMES.forEach((name, i) => {
        const rim = over({ ...color(theme, name), alpha: 0.45 }, panel);
        const r = ratio(rim, panel);
        near(r, drawn[i], 0.02, `${theme}: the ${name} rim on level ${level}`);
        assert.ok(r < 3, `${theme}: the ${name} rim reaches 3:1 on level ${level}, so it is no longer only decoration: the words and icon may be relaxed, which the council did not decide`);
      });
    });

    test(`${theme}, level ${level}: the notification centre's entries hold their pairs at rest and on the hover plate`, () => {
      const plate = plateOf(theme, level);
      for (const [where, bg] of [["panel", panel], ["plate", plate]]) {
        // the unread dot is a 6px ink mark: a non-text mark, 3:1
        assert.ok(ratio(over(color(theme, "text-primary"), bg), bg) >= 3, `${theme}: the unread dot on the ${where} at level ${level}`);
        // the status marks, 3:1
        for (const name of STATUS_NAMES) assert.ok(ratio(over(color(theme, name), bg), bg) >= 3, `${theme}: the ${name} mark on the ${where} at level ${level}`);
        // the title: primary when unread, secondary when read, and on the plate the title is primary
        for (const text of ["text-primary", "text-secondary"]) assert.ok(ratio(over(color(theme, text), bg), bg) >= 4.5, `${theme}: ${text} on the ${where} at level ${level}`);
      }
      // the line and the time: tertiary at rest, lifted to secondary on the plate, which tertiary would fail in dark
      assert.ok(ratio(over(color(theme, "text-tertiary"), panel), panel) >= 4.5, `${theme}: the line and the time at rest on level ${level}`);
      assert.ok(ratio(over(color(theme, "text-secondary"), plate), plate) >= 4.5, `${theme}: the line and the time on the plate at level ${level}`);
      // unread is not weight, so the step between unread and read titles must be a real one in ink
      assert.ok(ratio(color(theme, "text-primary"), panel) / ratio(over(color(theme, "text-secondary"), panel), panel) >= 1.5, `${theme}: unread and read titles differ by under 1.5x at level ${level}`);
    });
  }

  test(`${theme}: a toast is level 1: the marks hold 3:1, danger's title 4.5:1, and the description, count and close icon hold on it`, () => {
    const toast = color(theme, "surface-1");
    for (const name of STATUS_NAMES) assert.ok(ratio(over(color(theme, name), toast), toast) >= 3, `${theme}: the ${name} mark on a toast`);
    assert.ok(ratio(over(color(theme, "status-danger"), toast), toast) >= 4.5, `${theme}: danger's title on a toast`);
    for (const text of ["text-primary", "text-secondary"]) assert.ok(ratio(over(color(theme, text), toast), toast) >= 4.5, `${theme}: ${text} on a toast`);
    // the drain line is 1px of tertiary on the rim: a non-text mark
    assert.ok(ratio(over(color(theme, "text-tertiary"), toast), toast) >= 3, `${theme}: the drain line`);
  });
}

// ---- The skip link (X1): surface-3 under text-primary, over whatever the page draws at its top start ----
// It sits on the toast layer, over the sticky bar (smoked: the page colour or a little lighter) and over page content on any surface. Its
// words are primary ink on surface-3, and its ring (the focus colour, 2px at +2) is drawn outside its box, on what is under it and beside it.
for (const theme of THEMES) {
  test(`${theme}: the skip link's words hold 4.5:1 on its surface-3 fill, and its ring 3:1 on that fill and on every surface it can lie over`, () => {
    const fill = color(theme, "surface-3");
    assert.ok(ratio(over(color(theme, "text-primary"), fill), fill) >= 4.5, `${theme}: primary on surface-3 is ${fmt(ratio(over(color(theme, "text-primary"), fill), fill))}:1`);
    assert.ok(ratio(over(color(theme, "border-focus"), fill), fill) >= 3, `${theme}: the ring on the link's own fill`);
    atLeast(theme, "border-focus", 3);
    // Its underline is the input border colour, a decoration and not the only mark of a link, so it needs no pair of its own: the words are the link.
  });
}

test("a toast at level 1 is the same near-black as a level-1 menu, and the same white in light: the rim and the shadow separate them", () => {
  assert.deepEqual(color("dark", "surface-1"), color("dark", "surface-raised"));
  assert.ok(Math.abs(color("dark", "surface-1").r - 10 / 255) < 0.002, "#0a0a0a");
  assert.deepEqual(color("light", "surface-1"), color("light", "surface-3"), "levels 1 to 3 are one white in light, so the owner's level 1 changes no pixel there");
});

// ---- figures and transcripts (decision 94): the meter, the stat's source line and the terminal ----

for (const theme of THEMES) {
  test(`${theme}: the meter's slot edge and fill, and its tick against the cut, hold on every level and well`, () => {
    for (const [name, bg] of surfaces(theme)) {
      // the slot is transparent inside, so its 1px edge is read against the surface: 3:1 (1.4.11)
      assert.ok(ratio(over(color(theme, "border-input"), bg), bg) >= 3, `${theme}: the slot's edge on ${name}`);
      // the fill is primary ink inside the slot, and the tick secondary ink: non-text marks against the surface, 3:1
      for (const ink of ["text-primary", "text-secondary"]) assert.ok(ratio(over(color(theme, ink), bg), bg) >= 3, `${theme}: ${ink} on ${name}`);
      // the reading's "of cap unit", the foot and the target's words are secondary text: 4.5:1
      assert.ok(ratio(over(color(theme, "text-secondary"), bg), bg) >= 4.5, `${theme}: secondary words on ${name}`);
    }
    // the tick is cut from the fill by 2px of the surface: it must read against the fill too, so the cut is the surface it sits on
    for (const level of LEVELS) {
      const cut = color(theme, level);
      assert.ok(ratio(color(theme, "text-secondary"), cut) >= 3, `${theme}: the tick against its cut at ${level}`);
    }
  });

  test(`${theme}: the stat's source line (tertiary) and a terminal's prompt hold 4.5:1 on the page, on every level and on every well`, () => {
    atLeast(theme, "text-tertiary", 4.5);
  });

  test(`${theme}: a transcript's marks hold 3:1 and an error's text 4.5:1 on every well`, () => {
    const wells = ["surface-sunken", "surface-well-2", "surface-well-3"].map((n) => [n, color(theme, n)]);
    atLeast(theme, "status-success", 3, wells);
    atLeast(theme, "status-warning", 3, wells);
    atLeast(theme, "status-danger", 4.5, wells);
    // commands are primary, output secondary: both text
    atLeast(theme, "text-primary", 4.5, wells);
    atLeast(theme, "text-secondary", 4.5, wells);
  });
}

// ---- Charts (council item 101): every colour role on every level, on the band and on the plate ----
//
// A chart's colours are aliases of colours that already exist, so they cost no new colour, but each is design and each joins this proof.
// "Band" is chart-band over the level; "plate" is state-selected over the level (the picked day, behind the marks). Levels are surface-0 to 3.

const CHART_ROLES = { "chart-observed": "text-primary", "chart-plan": "text-secondary", "chart-band": "state-hover", "chart-missing": "border-input", "chart-grid": "border-divider", "chart-baseline": "border-input", "chart-axis": "text-tertiary" };

for (const theme of THEMES) {
  test(`${theme}: each chart colour role is its alias, colour for colour`, () => {
    for (const [role, alias] of Object.entries(CHART_ROLES)) assert.deepEqual(color(theme, role), color(theme, alias), `${role} is not ${alias}`);
  });

  test(`${theme}: observed, plan and the hatch hold 3:1 on every level, on the band and on the plate; the baseline on the level and the plate`, () => {
    for (const level of LEVELS) {
      const under = color(theme, level);
      const band = over(color(theme, "chart-band"), under);
      const plate = over(color(theme, "state-selected"), under);
      const cases = [
        ["chart-observed", [["level", under], ["band", band], ["plate", plate]]],
        ["chart-plan", [["level", under], ["band", band], ["plate", plate]]],
        ["chart-missing", [["level", under], ["band", band], ["plate", plate]]],
        ["chart-baseline", [["level", under], ["plate", plate]]],
        ["border-focus", [["level", under], ["plate", plate]]],
      ];
      for (const [role, grounds] of cases) for (const [name, bg] of grounds) {
        const r = ratio(over(color(theme, role), bg), bg);
        assert.ok(r >= 3, `${theme}: ${role} on the ${name} at ${level} is ${fmt(r)}:1, needs 3:1`);
      }
    }
  });

  // DECISIONS 153, vote 1: a solid mark takes one vertical gradient in plot coordinates, as three stops, each 3:1 on levels 0 to 3 and on the picked day's plate
  // over each level (the plate sits behind a bar). They alias neutral steps that already exist, so no new colour is made. The kit's own base stop failed in dark.
  test(`${theme}: the lit gradient's three stops are neutral steps and each holds 3:1 on every level and on the picked day's plate; the line's stroke is the top stop`, () => {
    const aliases = theme === "dark" ? { "chart-lit-top": "neutral-100", "chart-lit-mid": "neutral-64", "chart-lit-base": "neutral-52" } : { "chart-lit-top": "neutral-9", "chart-lit-mid": "neutral-30", "chart-lit-base": "neutral-52" };
    for (const [role, alias] of Object.entries(aliases)) assert.deepEqual(color(theme, role), color(theme, alias), `${role} is not ${alias}`);
    for (const level of LEVELS) {
      const under = color(theme, level);
      const plate = over(color(theme, "state-selected"), under);
      for (const role of ["chart-lit-top", "chart-lit-mid", "chart-lit-base"]) for (const [name, bg] of [["level", under], ["plate", plate]]) {
        const r = ratio(over(color(theme, role), bg), bg);
        assert.ok(r >= 3, `${theme}: ${role} on the ${name} at ${level} is ${fmt(r)}:1, needs 3:1`);
      }
    }
  });

  test(`${theme}: the lit gradient runs from the top stop to the base in ink steps, the top the strongest`, () => {
    const under = color(theme, "surface-1");
    const r = (role) => ratio(color(theme, role), under);
    assert.ok(r("chart-lit-top") > r("chart-lit-mid") && r("chart-lit-mid") > r("chart-lit-base"), `${theme}: ${r("chart-lit-top")}, ${r("chart-lit-mid")}, ${r("chart-lit-base")}`);
  });

  test(`${theme}: axis labels (tertiary) hold 4.5:1 on every level, and the legend's names (secondary) and values (primary) hold 4.5:1`, () => {
    for (const level of LEVELS) {
      const under = color(theme, level);
      for (const role of ["chart-axis", "text-secondary", "text-primary"]) {
        const r = ratio(over(color(theme, role), under), under);
        assert.ok(r >= 4.5, `${theme}: ${role} on ${level} is ${fmt(r)}:1, needs 4.5:1`);
      }
    }
  });

  test(`${theme}: the plan's secondary ink also reads as a step from the observed primary (the stroke the two share is told apart by ink)`, () => {
    const under = color(theme, "surface-1");
    const step = ratio(color(theme, "chart-observed"), under) / ratio(color(theme, "chart-plan"), under);
    assert.ok(step >= 1.5, `${theme}: observed against plan is ${step.toFixed(2)}x`);
  });
}

// ---- cimip-gaps-3 T2: the heatmap's four levels, a share bar's status segments, the warning stage mark, and the heatmap's picked disc ----
//
// The heat levels alias neutral steps that already exist. Each is a mark, 3:1 on every level; neighbouring levels are an order, not a measure, and are reported,
// not gated (foundations: the value is in the readout, the cell's name, the key's ranges and the table; in forced colours a level is a shape). The picked disc is
// chart-observed on the level (its ring is the level's own colour), and the ring must part from each fill: each level on each heat fill.

for (const theme of THEMES) {
  test(`${theme}: the heat levels are their neutral steps`, () => {
    const aliases = theme === "dark"
      ? { "chart-heat-1": "neutral-42", "chart-heat-2": "neutral-59", "chart-heat-3": "neutral-75", "chart-heat-4": "neutral-100" }
      : { "chart-heat-1": "neutral-52", "chart-heat-2": "neutral-36", "chart-heat-3": "neutral-20", "chart-heat-4": "neutral-9" };
    for (const [role, alias] of Object.entries(aliases)) assert.deepEqual(color(theme, role), color(theme, alias), `${role} is not ${alias}`);
  });

  test(`${theme}: each heat level, each status as a share segment and the warning stage mark hold 3:1 on every level`, () => {
    for (const level of LEVELS) {
      const under = color(theme, level);
      for (const role of ["chart-heat-1", "chart-heat-2", "chart-heat-3", "chart-heat-4", "status-success", "status-warning", "status-danger"]) {
        const r = ratio(over(color(theme, role), under), under);
        assert.ok(r >= 3, `${theme}: ${role} on ${level} is ${fmt(r)}:1, needs 3:1`);
      }
    }
  });

  test(`${theme}: the heatmap's picked disc holds 3:1 on its level, and its ring (the level's colour) 3:1 on each heat fill`, () => {
    for (const level of LEVELS) {
      const under = color(theme, level);
      const disc = ratio(over(color(theme, "chart-observed"), under), under);
      assert.ok(disc >= 3, `${theme}: the disc on ${level} is ${fmt(disc)}:1`);
      for (const heat of ["chart-heat-1", "chart-heat-2", "chart-heat-3", "chart-heat-4"]) {
        const r = ratio(under, over(color(theme, heat), under));
        assert.ok(r >= 3, `${theme}: the ring (${level}) on ${heat} is ${fmt(r)}:1, needs 3:1`);
      }
    }
  });

  test(`${theme}: neighbouring heat levels, reported and not gated`, (t) => {
    const under = color(theme, "surface-1");
    const fills = ["chart-heat-1", "chart-heat-2", "chart-heat-3", "chart-heat-4"].map((role) => color(theme, role));
    const steps = fills.slice(1).map((fill, i) => fmt(ratio(fill, fills[i])));
    t.diagnostic(`${theme}: heat 1→2, 2→3, 3→4 at ${steps.join(", ")}:1 (an order, not a measure)`);
    // The order holds: each level is further from the page than the one before it.
    const from = fills.map((fill) => ratio(fill, under));
    for (let i = 1; i < from.length; i += 1) assert.ok(from[i] > from[i - 1], `${theme}: heat ${i + 1} is not past heat ${i}`);
  });
}

// ---- Two-line rows, the command list in the page and the checklist's search band (council item 103) ----
//
// A description is tertiary at rest and lifts to secondary on the plate, the hint rule above; a danger row's description keeps its
// own ink, so the pair on the plate is secondary, not danger. The in-page list's foot is secondary 12/16 on the panel, and the push's
// chevron a secondary icon (3:1). The search band (the command's, and the checklist's) is the next level's fill, capped at 3: its
// placeholder and glyph are tertiary, its text primary, and the −2 inset ring is the focus colour.
for (const theme of THEMES) {
  for (const level of [1, 2, 3]) {
    const panel = color(theme, `surface-${level}`);
    const plate = plateOf(theme, level);

    test(`${theme}, level ${level}: a description holds 4.5:1 (tertiary at rest, secondary lit), and the foot's text and the chevron hold`, () => {
      assert.ok(ratio(over(color(theme, "text-tertiary"), panel), panel) >= 4.5, `${theme}: a description at rest on level ${level}`);
      assert.ok(ratio(over(color(theme, "text-secondary"), plate), plate) >= 4.5, `${theme}: a lit description on the plate at level ${level}`);
      assert.ok(ratio(over(color(theme, "text-secondary"), panel), panel) >= 4.5, `${theme}: the foot's count and legend on level ${level}`);
      for (const [name, bg] of [["the panel", panel], ["the plate", plate]]) {
        assert.ok(ratio(over(color(theme, "text-secondary"), bg), bg) >= 3, `${theme}: the push's chevron on ${name} at level ${level}`);
      }
    });

    test(`${theme}, level ${level}: the search band's placeholder, glyph, text and ring hold on the next level's fill`, () => {
      const band = color(theme, `surface-${Math.min(level + 1, 3)}`);
      assert.ok(ratio(over(color(theme, "text-tertiary"), band), band) >= 4.5, `${theme}: the placeholder on the band over level ${level}`);
      assert.ok(ratio(over(color(theme, "text-primary"), band), band) >= 4.5, `${theme}: typed text on the band over level ${level}`);
      assert.ok(ratio(over(color(theme, "border-focus"), band), band) >= 3, `${theme}: the −2 inset ring on the band over level ${level}`);
    });
  }
}

// ---- Display states (DECISIONS 95): "Not observed", the scroll hint, the choice card, the pressed toggle, the pending ring ----
//
// The solid plate (--basalt-plate, the tokens plate-0 to plate-3) is the plate of the menus round painted as ONE opaque colour: the wash mixed over the level in
// the CSS, at the token's own alpha (9% white in dark, 7% black in light). A choice card and a pressed toggle replace their own
// fill with it, so these are the pairs a reader sees. The page (level 0) has no plate of its own: a toggle there takes level 1's
// recipe over surface-1 in both themes.

for (const theme of THEMES) {
  test(`${theme}: the CSS's 9% and 7% are the selected wash's own alpha`, () => {
    near(alphaOf(theme, "state-selected"), theme === "dark" ? 0.09 : 0.07, 0.0005, `${theme}: state-selected's alpha`);
  });

  const levels = [0, 1, 2, 3];
  const base = (level) => (theme === "dark" ? { 0: "surface-1", 1: "surface-2", 2: "surface-3", 3: "surface-3" }[level] : level === 0 ? "surface-page" : `surface-${level}`);
  const solid = (level) => over(color(theme, "state-selected"), color(theme, base(level)));
  const surface = (level) => color(theme, `surface-${level}`);

  test(`${theme}: the page's own plate: dark is the next level plus the wash, light is the wash over surface-page, about #e8e8e8 (DECISIONS 100)`, () => {
    const plate = solid(0);
    if (theme === "light") for (const [channel, want] of [["r", 0xe8], ["g", 0xe8], ["b", 0xe8]]) assert.ok(Math.abs(plate[channel] * 255 - want) <= 1, `light: the page plate ${channel} is ${(plate[channel] * 255).toFixed(1)}, about ${want}`);
    for (const text of ["text-primary", "text-secondary"]) assert.ok(ratio(color(theme, text), plate) >= 4.5, `${theme}: ${text} on the page plate`);
    assert.ok(ratio(plate, color(theme, "surface-page")) >= 1.1, `${theme}: the page plate is a step from the page`);
  });

  test(`${theme}: "Not observed" is tertiary on every level, and secondary on the hover and selected washes over every level`, () => {
    for (const level of levels) {
      const panel = surface(level);
      assert.ok(ratio(over(color(theme, "text-tertiary"), panel), panel) >= 4.5, `${theme}: tertiary on level ${level}`);
      for (const wash of washes) {
        const under = over(color(theme, wash), panel);
        assert.ok(ratio(over(color(theme, "text-secondary"), under), under) >= 4.5, `${theme}: secondary on ${wash} over level ${level}`);
      }
    }
  });

  test(`${theme}: the scroll hint, tertiary 12px text, holds 4.5:1 on the page and every level`, () => {
    for (const level of levels) assert.ok(ratio(over(color(theme, "text-tertiary"), surface(level)), surface(level)) >= 4.5, `${theme}: the hint on level ${level}`);
  });

  test(`${theme}: a pressed toggle's primary ink and check hold 4.5:1 on its solid plate over every level, and the plate is a step from the level`, () => {
    for (const level of levels) {
      const plate = solid(level);
      assert.ok(ratio(color(theme, "text-primary"), plate) >= 4.5, `${theme}: primary on the plate over level ${level}`);
      assert.ok(ratio(color(theme, "text-secondary"), plate) >= 4.5, `${theme}: secondary on the plate over level ${level}`);
      // the ink step is the cue the plate alone (about 1.2:1) cannot carry: primary is a real step above the unpressed ghost's secondary.
      // DECISIONS 166: the floor was 1.4x; the lifted dark inks measure 1.359 to 1.298 across the levels, so it is that worst rounded down to
      // two places, 1.29x, and any further dimming fails.
      assert.ok(ratio(color(theme, "text-primary"), plate) / ratio(over(color(theme, "text-secondary"), surface(level)), surface(level)) >= 1.29, `${theme}: the ink step at level ${level}`);
      assert.ok(ratio(plate, surface(level)) >= 1.1, `${theme}: the plate is a visible step from level ${level}`);
    }
  });

  for (const level of [1, 2, 3]) {
    test(`${theme}, level ${level}: a selected choice card holds its ink on the plate, and its box holds 3:1 empty and checked`, () => {
      const plate = solid(level);
      const card = surface(level);
      for (const [where, bg] of [["card", card], ["plate", plate]]) {
        for (const text of ["text-primary", "text-secondary"]) assert.ok(ratio(over(color(theme, text), bg), bg) >= 4.5, `${theme}: ${text} on the ${where} at level ${level}`);
        // the empty box is a raised fill with the input boundary round it: the boundary against the card is the 3:1 pair
        const box = color(theme, "surface-raised");
        const boundary = over(color(theme, "border-input"), box);
        assert.ok(ratio(boundary, box) >= 3 || ratio(boundary, bg) >= 3, `${theme}: the empty box's boundary on the ${where} at level ${level}`);
        // checked: the primary fill against the card
        assert.ok(ratio(color(theme, "action-primary"), bg) >= 3, `${theme}: the checked box on the ${where} at level ${level}`);
        assert.ok(ratio(color(theme, "action-primary-text"), color(theme, "action-primary")) >= 4.5, `${theme}: the mark in the checked box`);
      }
      // content that was tertiary steps to secondary on the fill, which tertiary may not hold
      assert.ok(ratio(over(color(theme, "text-secondary"), plate), plate) >= 4.5, `${theme}: stepped content on the plate at level ${level}`);
    });
  }

  test(`${theme}: the pending ring, in the badge word's secondary ink, holds 3:1 as a non-text mark on every level and the page`, () => {
    for (const level of levels) assert.ok(ratio(over(color(theme, "text-secondary"), surface(level)), surface(level)) >= 3, `${theme}: the ring on level ${level}`);
  });
}

// ---- Art (council item 104): the clear bar's ink on the quietest pixel art may hold ----
//
// A stage keeps its headroom, and each quiet zone, to no lighter (dark) or darker (light) than art-quiet-limit. The bar's ink is the theme's
// own and never changes, so its weakest pair decides the limit: secondary text (4.5:1), which also covers the ring and the icons (3:1).
// The hover and selected washes are drawn over the limit (the bar has no fill while it is clear), and primary text holds on them.

const ART_TONES = { "art-field": ["neutral-0", "neutral-98"], "art-tone-1": ["neutral-7", "neutral-94"], "art-tone-2": ["neutral-20", "neutral-75"], "art-tone-3": ["neutral-42", "neutral-52"], "art-tone-4": ["neutral-75", "neutral-30"] };

for (const theme of THEMES) {
  const index = theme === "dark" ? 0 : 1;
  test(`${theme}: the art tokens are the neutrals the decision names, the mark is text-primary and the quiet limit is tone 2`, () => {
    for (const [role, names] of Object.entries(ART_TONES)) assert.deepEqual(color(theme, role), color(theme, names[index]), `${role} is not ${names[index]}`);
    assert.deepEqual(color(theme, "art-mark"), color(theme, "text-primary"));
    assert.deepEqual(color(theme, "art-quiet-limit"), color(theme, "art-tone-2"));
    assert.deepEqual(color(theme, "art-field"), color(theme, "surface-page"), "a stage meets the page with no seam");
  });

  test(`${theme}: the tones step away from the field, never past the mark, and the quiet limit is the second of them`, () => {
    const field = color(theme, "art-field");
    const distance = (name) => ratio(color(theme, name), field);
    const steps = ["art-tone-1", "art-tone-2", "art-tone-3", "art-tone-4", "art-mark"].map(distance);
    for (let i = 1; i < steps.length; i++) assert.ok(steps[i] > steps[i - 1], `${theme}: the tones do not step away from the field in order (${steps.map(fmt).join(", ")})`);
  });

  test(`${theme}: primary and secondary text hold 4.5:1 on the quiet limit, and the focus ring 3:1`, () => {
    const limit = [["art-quiet-limit", color(theme, "art-quiet-limit")]];
    atLeast(theme, "text-primary", 4.5, limit);
    atLeast(theme, "text-secondary", 4.5, limit);
    atLeast(theme, "border-focus", 3, limit);
  });

  test(`${theme}: primary text holds 4.5:1 on the selected and hover washes over the quiet limit`, () => {
    const limit = color(theme, "art-quiet-limit");
    atLeast(theme, "text-primary", 4.5, ["state-selected", "state-hover"].map((wash) => [`${wash} over art-quiet-limit`, over(color(theme, wash), limit)]));
  });

  // The ambient loop (DECISIONS 136 C): a looping mark is art-tone-4, opacity 1 down to 0.2, over the field or a quieter tone of the same art. Decorative (aria-hidden, no
  // information), so no minimum applies; the pair is proved so the mark is always a step from what is behind it, at full opacity and at the floor, which is why the floor is
  // 0.2 and not 0 (a mark dims and never blinks out). Tone 1 and tone 2 are the other grounds a mark can sit on.
  test(`${theme}: an ambient mark (art-tone-4) is a step from every tone behind it, at full opacity and at its 0.2 floor`, () => {
    const mark = color(theme, "art-tone-4");
    for (const ground of ["art-field", "art-tone-1", "art-tone-2"]) {
      const under = color(theme, ground);
      const full = ratio(mark, under);
      const floor = ratio(over({ ...mark, alpha: 0.2 }, under), under);
      assert.ok(full >= 3, `${theme}: art-tone-4 on ${ground} is ${fmt(full)}:1 at full opacity`);
      assert.ok(floor > 1.02 && floor < full, `${theme}: art-tone-4 at 0.2 on ${ground} is ${fmt(floor)}:1: it must stay drawn and stay below full`);
    }
  });

  test(`${theme}: one step further (tone 3) secondary text no longer holds, which is why the limit stops at tone 2`, () => {
    const tone3 = color(theme, "art-tone-3");
    assert.ok(ratio(color(theme, "text-secondary"), tone3) < 4.5, `${theme}: secondary holds on tone 3, so the limit could be higher`);
  });
}

// ---- More contrast (decisions 138 and 139, part D): three aliases and no new colour ----

// The mode, read from the generated CSS: which tokens it replaces, and by which alias.
const tokensCss = fs.readFileSync(new URL("../dist/css/tokens.css", import.meta.url), "utf8");
const moreBlock = tokensCss.match(/@media \(prefers-contrast: more\) \{\s*([^{]*)\{([^}]*)\}\s*\}/);
const MORE = Object.fromEntries([...moreBlock[2].matchAll(/--basalt-([\w-]+): var\(--basalt-([\w-]+)\);/g)].map((m) => [m[1], m[2]]));
/** A token as it reads under more contrast. */
const more = (theme, name) => color(theme, MORE[name] ?? name);

test("more contrast: lines step to border-input, tertiary ink to text-secondary and a field's boundary to text-secondary, and nothing else is replaced", () => {
  assert.deepEqual(MORE, { "border-hairline": "line-contrast", "border-rim": "line-contrast", "border-rim-top": "line-contrast", "border-divider": "line-contrast", "text-tertiary": "ink-contrast", "border-field": "field-contrast", "border-hover": "text-secondary", "diagram-focal-rule": "diagram-focal-rule-contrast", "diagram-hit": "text-primary" });
  // the block is declared on every selector that sets a theme, the system-dark rule's own selector included, so it wins in both themes
  for (const selector of [":root", '[data-theme="light"]', '[data-theme="dark"]', ".light", ".dark", ':root:not([data-theme="light"]):not(.light)']) assert.ok(moreBlock[1].includes(selector), `the mode is not declared on ${selector}`);
  assert.ok(tokensCss.indexOf("prefers-contrast: more") > tokensCss.indexOf("@media (prefers-color-scheme: dark)"), "the mode comes after the system-dark rule, which it must outrank");
});

for (const theme of THEMES) {
  test(`${theme}: the three aliases are the colours they name, so more contrast adds no colour`, () => {
    assert.deepEqual(color(theme, "line-contrast"), color(theme, "border-input"));
    assert.deepEqual(color(theme, "ink-contrast"), color(theme, "text-secondary"));
    assert.deepEqual(color(theme, "field-contrast"), color(theme, "text-secondary"));
    assert.deepEqual(color(theme, "border-field"), color(theme, "border-input"), "outside the mode a field's boundary is the input boundary");
  });

  test(`${theme}: under more contrast every text pair still holds 4.5:1 on every surface and every level`, () => {
    const onto = [...surfaces(theme), ...LEVELS.map((n) => [n, color(theme, n)])];
    for (const name of ["text-primary", "text-secondary", "text-tertiary", "status-danger", "syntax-comment"]) {
      for (const [bgName, bg] of onto) {
        const r = ratio(over(more(theme, name), bg), bg);
        assert.ok(r >= 4.5, `${theme}: ${name} on ${bgName} is ${fmt(r)}:1 under more contrast`);
      }
    }
  });

  test(`${theme}: under more contrast text still holds 4.5:1 on the hover and selected washes, and on the pill and its track`, () => {
    const washed = [...rowSurfaces(theme), ...["surface-well-2", "surface-well-3"].map((n) => [n, color(theme, n)])].flatMap(([n, s]) => washes.map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    for (const name of ["text-primary", "text-secondary", "status-danger"]) for (const [bgName, bg] of washed) assert.ok(ratio(over(more(theme, name), bg), bg) >= 4.5, `${theme}: ${name} on ${bgName} under more contrast`);
    // tertiary is promoted to secondary on a wash already, and in the mode it is secondary everywhere: it must hold wherever it can sit
    for (const [bgName, bg] of washed) assert.ok(ratio(over(more(theme, "text-tertiary"), bg), bg) >= 4.5, `${theme}: tertiary ink on ${bgName} under more contrast`);
    const pill = theme === "dark" ? over({ ...color(theme, "neutral-100"), alpha: 0.09 }, color(theme, "surface-top")) : color(theme, "surface-top");
    assert.ok(ratio(more(theme, "text-primary"), pill) >= 4.5);
    assert.ok(ratio(more(theme, "text-secondary"), color(theme, "surface-sunken-strong")) >= 4.5);
  });

  test(`${theme}: under more contrast every line and every field boundary holds 3:1 on every surface and every level (1.4.11)`, () => {
    const onto = [...surfaces(theme), ...LEVELS.map((n) => [n, color(theme, n)]), ...["state-hover", "state-selected"].map((w) => [`${w} over surface-page`, over(color(theme, w), color(theme, "surface-page"))])];
    for (const name of ["border-hairline", "border-rim", "border-rim-top", "border-divider", "border-field", "border-hover"]) {
      for (const [bgName, bg] of onto) {
        const r = ratio(over(more(theme, name), bg), bg);
        assert.ok(r >= 3, `${theme}: ${name} on ${bgName} is ${fmt(r)}:1 under more contrast`);
      }
    }
    // the pill's hairline over the pill's own track, which is the pair that matters for a chosen segment
    const track = color(theme, "surface-sunken-strong");
    assert.ok(ratio(over(more(theme, "border-hairline"), track), track) >= 3, `${theme}: the pill's hairline on its track`);
  });

  test(`${theme}: a field keeps the strongest line under more contrast: its boundary is stronger than a rim, a divider or a hairline`, () => {
    for (const [bgName, bg] of surfaces(theme)) {
      const field = ratio(over(more(theme, "border-field"), bg), bg);
      for (const line of ["border-hairline", "border-rim", "border-divider"]) assert.ok(field > ratio(over(more(theme, line), bg), bg), `${theme}: on ${bgName} a ${line} is as strong as a field's boundary`);
    }
  });

  test(`${theme}: under more contrast a hovered edge is never fainter than the edge at rest, on every surface and level (decision 145)`, () => {
    const onto = [...surfaces(theme), ...LEVELS.map((n) => [n, color(theme, n)])];
    for (const [bgName, bg] of onto) {
      const hover = ratio(over(more(theme, "border-hover"), bg), bg);
      const rest = ratio(over(more(theme, "border-hairline"), bg), bg);
      assert.ok(hover >= rest, `${theme}: on ${bgName} the hover edge is ${fmt(hover)}:1 and the edge at rest ${fmt(rest)}:1`);
      assert.ok(hover >= 3, `${theme}: the hover edge on ${bgName} is ${fmt(hover)}:1`);
    }
  });
}

// ---- Overlays and search (DECISIONS 155): the pairs the batch draws ----
// The search dialog, the sheet's head, the drawer, the listbox, the opening list and the notice bar draw no new colour. They use these pairs, listed so
// the batch's own reading is proved: tertiary ink at rest (a count line, a second line, a group heading, a row filtering left in place); secondary
// ink where tertiary sits on a wash (a hovered result's second line, a chosen option's trailing cell, a cursor row's cells); primary on both washes (a
// chosen option's name, the cursor row's end word); the search trigger's input boundary and the focus ring on every level.
for (const theme of THEMES) {
  test(`${theme}: overlays and search: tertiary at rest, secondary on a wash, primary on both, and the trigger's boundary and the ring`, () => {
    const levels = LEVELS.map((s) => [s, color(theme, s)]);
    atLeast(theme, "text-tertiary", 4.5, levels);
    const washed = levels.flatMap(([n, s]) => ["state-hover", "state-selected"].map((w) => [`${w} over ${n}`, over(color(theme, w), s)]));
    atLeast(theme, "text-secondary", 4.5, washed);
    atLeast(theme, "text-primary", 4.5, washed);
    // The trigger sits on the page (level 0) and on a level-1 bar; its edge is the control boundary, the ring the focus colour.
    atLeast(theme, "border-input", 3, levels);
    atLeast(theme, "border-focus", 3, levels);
  });

  // DECISIONS 155 V5, and the return that kept the pixels: a search result lifts no ink on hover. A modal is always level 1, so the pair is the
  // hover wash over surface-1: tertiary (a result's detail) and secondary both hold 4.5:1 there, so tertiary needs no step to secondary.
  test(`${theme}: a search result's detail (tertiary) holds 4.5:1 on the hover wash over the dialog's level, so nothing lifts on hover`, () => {
    const wash = [["state-hover over surface-1", over(color(theme, "state-hover"), color(theme, "surface-1"))]];
    atLeast(theme, "text-tertiary", 4.5, wash);
    atLeast(theme, "text-secondary", 4.5, wash);
  });
}

// ---- Logs, status and forms (DECISIONS 162): the pairs the batch draws ----
// Event lines and the status bar draw on the page and on levels 1 to 3 (a log inside a card or a panel); the source marks are 8px shapes and the
// unread dot 6px, which are non-text marks (3:1); a log's time, a line's second line, a block's meta and a source stamp's words are tertiary text
// (4.5:1), lifted to secondary on the hover wash; the inline rows' bottom line is the input boundary (3:1); the message slot's error words are danger
// ink on the page (4.5:1); the sources button's open plate is surface-raised, primary on it.
for (const theme of THEMES) {
  test(`${theme}: logs, status and forms: tertiary at rest, secondary and primary on the hover wash, the 8px marks and the unread dot at 3:1, the rows' line and the ring`, () => {
    const levels = LEVELS.map((s) => [s, color(theme, s)]);
    atLeast(theme, "text-tertiary", 4.5, levels);
    const washed = levels.map(([n, s]) => [`state-hover over ${n}`, over(color(theme, "state-hover"), s)]);
    atLeast(theme, "text-secondary", 4.5, washed);
    atLeast(theme, "text-primary", 4.5, washed);
    // the source marks (tertiary, and secondary when stale or unreachable) and the unread dot (primary) are non-text marks
    for (const name of ["text-tertiary", "text-secondary", "text-primary"]) atLeast(theme, name, 3, levels);
    atLeast(theme, "border-input", 3, levels);
    atLeast(theme, "border-focus", 3, levels);
    atLeast(theme, "status-danger", 4.5, [["surface-page", color(theme, "surface-page")]]);
    atLeast(theme, "text-primary", 4.5, [["surface-raised (the open sources button)", color(theme, "surface-raised")]]);
  });
}

// ---- Diagrams (DECISIONS 281 and 282, 1.1): seven aliases and no new colour, each proved on levels 0 to 3, in both themes and under more contrast ----
for (const theme of THEMES) {
  const levels = LEVELS.map((n) => [n, color(theme, n)]);
  test(`${theme}: the diagram roles are aliases of colours the theme already has`, () => {
    assert.deepEqual(color(theme, "diagram-edge-main"), color(theme, "text-primary"));
    assert.deepEqual(color(theme, "diagram-edge"), color(theme, "text-secondary"));
    assert.deepEqual(color(theme, "diagram-edge-dim"), color(theme, "border-input"));
    assert.deepEqual(color(theme, "diagram-structure"), color(theme, "border-input"));
    assert.deepEqual(color(theme, "diagram-focal"), color(theme, "action-primary"));
    assert.deepEqual(color(theme, "diagram-focal-ink"), color(theme, "action-primary-text"));
    assert.deepEqual(color(theme, "diagram-focal-rule"), color(theme, theme === "dark" ? "black-8" : "white-6"));
    assert.deepEqual(color(theme, "diagram-focal-rule-contrast"), color(theme, theme === "dark" ? "black-45" : "white-38"));
  });

  test(`${theme}: every diagram line and structure holds 3:1 on levels 0 to 3, and under more contrast (1.4.11)`, () => {
    for (const name of ["diagram-edge-main", "diagram-edge", "diagram-edge-dim", "diagram-structure"]) {
      atLeast(theme, name, 3, levels);
      for (const [bgName, bg] of levels) assert.ok(ratio(over(more(theme, name), bg), bg) >= 3, `${theme}: ${name} on ${bgName} under more contrast`);
    }
    // The edge label's ink is the plain line's: text, 4.5:1 on the ground it sits on (its plate is that ground).
    atLeast(theme, "diagram-edge", 4.5, levels);
  });

  test(`${theme}: the focal node's words hold 4.5:1 on its fill, full and at opacity-amount, and the fill stands 3:1 off every level`, () => {
    const fill = color(theme, "diagram-focal");
    const ink = color(theme, "diagram-focal-ink");
    const amount = Number.parseFloat(tokens.primitives["opacity-amount"].css);
    assert.ok(ratio(ink, fill) >= 4.5, `${theme}: focal ink on its fill is ${fmt(ratio(ink, fill))}:1`);
    const quiet = over({ ...ink, alpha: amount }, fill);
    assert.ok(ratio(quiet, fill) >= 4.5, `${theme}: focal ink at opacity-amount is ${fmt(ratio(quiet, fill))}:1`);
    for (const [bgName, bg] of levels) assert.ok(ratio(fill, bg) >= 3, `${theme}: the focal fill on ${bgName} is ${fmt(ratio(fill, bg))}:1`);
    // Under more contrast the quiet ink is at full strength, and the header rule is the other theme's input boundary.
    const rule = over(more(theme, "diagram-focal-rule"), fill);
    assert.ok(ratio(rule, fill) >= 3, `${theme}: the focal table's rule under more contrast is ${fmt(ratio(rule, fill))}:1`);
  });

  test(`${theme}: a node's text holds 4.5:1 on the level it is drawn at, and a traced line stays 3:1 while the rest dim`, () => {
    for (const name of ["text-primary", "text-secondary", "text-tertiary"]) atLeast(theme, name, 4.5, levels.slice(1));
    atLeast(theme, "diagram-edge-dim", 3, levels);
  });

  // DECISIONS 292 (1.2, 1.12): the two motion roles are aliases, the arrival rim is 3:1 on every level and, under more contrast, 3:1 against the rim it
  // replaces there (the input boundary over each level) and never the colour of a traced neighbour's rim (border-hover); focal ink holds on the focal step.
  test(`${theme}: a diagram's arrival step: the rim and the focal fill are aliases, 3:1 at rest and under more contrast, and focal ink holds on the step`, () => {
    assert.deepEqual(color(theme, "diagram-hit"), color(theme, "text-secondary"));
    assert.deepEqual(color(theme, "diagram-focal-hit"), color(theme, "action-primary-hover"));
    assert.deepEqual(more(theme, "diagram-hit"), color(theme, "text-primary"), "under more contrast the arrival rim is primary ink");
    atLeast(theme, "diagram-hit", 3, levels);
    for (const [bgName, bg] of levels) {
      const rim = over(more(theme, "border-rim"), bg);
      const hit = over(more(theme, "diagram-hit"), bg);
      assert.ok(ratio(hit, rim) >= 3, `${theme}: the arrival rim against the resting rim over ${bgName} under more contrast is ${fmt(ratio(hit, rim))}:1`);
      assert.notDeepEqual(hit, over(more(theme, "border-hover"), bg), `${theme}: under more contrast the arrival rim is the traced neighbour's rim over ${bgName}`);
    }
    const step = color(theme, "diagram-focal-hit");
    const ink = color(theme, "diagram-focal-ink");
    const amount = Number.parseFloat(tokens.primitives["opacity-amount"].css);
    assert.ok(ratio(ink, step) >= 4.5, `${theme}: focal ink on the focal step is ${fmt(ratio(ink, step))}:1`);
    assert.ok(ratio(over({ ...ink, alpha: amount }, step), step) >= 4.5, `${theme}: focal ink at opacity-amount on the focal step`);
  });
}

// ---- The public plate (cimip-gaps-2, B3): plate-0 to plate-3 ----
//
// The lit row's plate as one opaque colour per level, so an app's own list can draw its active row as Basalt's popups do. Each token is held to
// the recipe the stylesheet used before it was public (the selected wash composited in sRGB over the level, or in dark over the next level), to
// within a fraction of an 8-bit step, so a part that moved from the recipe to the token paints the same pixel. On every plate the row's inks hold.
const PLATE_UNDER = { light: ["surface-0", "surface-1", "surface-2", "surface-3"], dark: ["surface-1", "surface-2", "surface-3", "surface-3"] };
for (const theme of THEMES) {
  test(`${theme}: plate-0 to plate-3 are the selected wash over their level, and primary, secondary and danger ink hold 4.5:1 on each`, () => {
    for (const level of [0, 1, 2, 3]) {
      const token = color(theme, `plate-${level}`);
      assert.equal(token.alpha ?? 1, 1, `${theme}: plate-${level} is opaque`);
      const recipe = over(color(theme, "state-selected"), color(theme, PLATE_UNDER[theme][level]));
      for (const channel of ["r", "g", "b"]) assert.ok(Math.abs(token[channel] - recipe[channel]) * 255 < 0.1, `${theme}: plate-${level} ${channel} is ${(token[channel] * 255).toFixed(3)}, the recipe ${(recipe[channel] * 255).toFixed(3)}`);
      if (level > 0) for (const channel of ["r", "g", "b"]) assert.ok(Math.abs(token[channel] - plateOf(theme, level)[channel]) * 255 < 0.1, `${theme}: plate-${level} is the menus round's plate`);
      for (const text of ["text-primary", "text-secondary", "status-danger"]) {
        const r = ratio(over(color(theme, text), token), token);
        assert.ok(r >= 4.5, `${theme}: ${text} on plate-${level} is ${fmt(r)}:1`);
      }
      // A plate is a step from its level, never nothing (and never a boundary: the ink step carries the state).
      assert.ok(ratio(token, color(theme, `surface-${level}`)) > 1.1, `${theme}: plate-${level} is no step from surface-${level}`);
    }
  });
}

// ---- Print (DECISIONS 306, 1.7): the light set, last, on every selector that sets a theme ----

test("print: the token CSS ends with a print block that sets every light colour token to its light value, with color-scheme light, on every theme selector", () => {
  const at = tokensCss.lastIndexOf("@media print {");
  assert.ok(at > tokensCss.indexOf("prefers-contrast: more") && at > tokensCss.indexOf("prefers-reduced-motion"), "the print block is last");
  const block = tokensCss.slice(at);
  assert.equal(block.trim().split("\n").at(-1), "}", "nothing follows the print block");
  for (const selector of [":root", '[data-theme="light"]', '[data-theme="dark"]', ".light", ".dark", ':root:not([data-theme="light"]):not(.light)']) assert.ok(block.includes(selector), `print is not declared on ${selector}`);
  assert.match(block, /color-scheme: light;/);
  assert.match(block, /--_dkm: initial;/);
  // Every colour declared by the light theme's block is declared again in print, with the same value.
  const lightBlock = tokensCss.match(/:root, \[data-theme="light"\], \.light \{([\s\S]*?)\n\}/)[1];
  const decls = (text) => Object.fromEntries([...text.matchAll(/(--basalt-[\w-]+): ([^;]+);/g)].map((m) => [m[1], m[2]]));
  const light = decls(lightBlock), print = decls(block);
  assert.ok(Object.keys(light).length > 50);
  for (const [name, value] of Object.entries(light)) assert.equal(print[name], value, `${name} in print`);
});

// DECISIONS 306, 1.0 (Neon's B12 on the batch's code review): every colour in a new seat of batch B joins these tests on levels 0 to 3, in both themes and
// under more contrast. Cardinality marks are the line's own ink; an activation bar's edge is the structure role on its fill (the figure's level) and on the
// ground beside it; a frame's and a nested group's edges are the structure role; a quiet run's line is edge-dim; the text art's inks are on surface-sunken;
// a linked card's words hold on the press step (state-hover) over each level.
for (const theme of THEMES) {
  const onLevels = LEVELS.map((n) => [n, color(theme, n)]);
  test(`${theme}: batch B's seats: marks, a bar's edge, frames and nested groups, a quiet run, at 3:1 on levels 0 to 3 and under more contrast`, () => {
    for (const name of ["diagram-edge-main", "diagram-edge", "diagram-edge-dim", "diagram-structure"]) {
      atLeast(theme, name, 3, onLevels);
      for (const [bgName, bg] of onLevels) assert.ok(ratio(over(more(theme, name), bg), bg) >= 3, `${theme}: ${name} on ${bgName} under more contrast`);
    }
    // A bar's fill is the figure's level (surface-1 on the page); its edge holds against that fill and against the page beside it.
    const fill = color(theme, "surface-1");
    assert.ok(ratio(over(color(theme, "diagram-structure"), fill), fill) >= 3, `${theme}: a bar's edge on its fill`);
    assert.ok(ratio(over(color(theme, "diagram-structure"), color(theme, "surface-0")), color(theme, "surface-0")) >= 3, `${theme}: a bar's edge on the ground`);
  });
  test(`${theme}: the text art's inks on surface-sunken (tertiary, secondary, primary) hold 4.5:1, and under more contrast`, () => {
    const sunken = [["surface-sunken", color(theme, "surface-sunken")]];
    for (const name of ["text-tertiary", "text-secondary", "text-primary"]) {
      atLeast(theme, name, 4.5, sunken);
      assert.ok(ratio(over(more(theme, name), sunken[0][1]), sunken[0][1]) >= 4.5, `${theme}: ${name} on surface-sunken under more contrast`);
    }
  });
  test(`${theme}: a linked card's words hold 4.5:1 on its press step (state-hover) over levels 0 to 3`, () => {
    for (const [bgName, bg] of onLevels) {
      const step = over(color(theme, "state-hover"), bg);
      for (const name of ["text-primary", "text-secondary", "text-tertiary"]) {
        const r = ratio(over(more(theme, name), step), step);
        assert.ok(r >= 4.5 || (name === "text-tertiary" && ratio(over(color(theme, "text-secondary"), step), step) >= 4.5), `${theme}: ${name} on the press step over ${bgName} is ${fmt(r)}:1`);
      }
    }
  });
}

// ---- Versions and release notes (DECISIONS 320, 2.8 and 2.10) ----
//
// The release page's new pairs. The arrival's plate is plate-0 on the page and plate-1 inside a callout (an action entry); on it the source line and a count
// are secondary, since tertiary steps up on the plate (it measures under 4.5:1 on light's plate-0, which is why the step is the rule). The source line and the
// meta line are secondary on the page and on the warning callout's neutral fill at level 1; a section's count is tertiary on the page.
for (const theme of THEMES) {
  test(`${theme}: the release page's pairs: secondary on plate-0 and plate-1, on the page and on a callout; a count in tertiary on the page`, () => {
    for (const surface of ["plate-0", "plate-1", "surface-page", "surface-1"]) {
      const bg = color(theme, surface);
      const r = ratio(over(color(theme, "text-secondary"), bg), bg);
      assert.ok(r >= 4.5, `${theme}: text-secondary on ${surface} is ${fmt(r)}:1`);
    }
    const page = color(theme, "surface-page");
    assert.ok(ratio(over(color(theme, "text-tertiary"), page), page) >= 4.5, `${theme}: a count (tertiary) on the page`);
    // The plate's step from tertiary to secondary is needed: in light, tertiary on plate-0 is under 4.5:1.
    if (theme === "light") assert.ok(ratio(color(theme, "text-tertiary"), color(theme, "plate-0")) < 4.5, "light: tertiary on plate-0 needs the step to secondary");
  });
}

// ---- Stages and runs (DECISIONS 316, 2.2): the tail's first step, a failed row's 0.88, the queued breath and the connector; the four deeper steps
// are the one named exception (foundations, Principles) and are read by nothing but a run timeline's tail ----

const RUN_OPACITY = (name) => Number(tokens.primitives[`opacity-${name}`].css);
const RUN_ONTO = (theme) => [...surfaces(theme), ...LEVELS.map((n) => [n, color(theme, n)])];

for (const theme of THEMES) {
  test(`${theme}: a tail's first step (text-tertiary, whole) and a failed row's (status-danger at opacity-recede-danger) hold 4.5:1 on every surface, well and level, and under more contrast`, () => {
    const danger = RUN_OPACITY("recede-danger");
    assert.equal(danger, 0.88);
    for (const [bgName, bg] of RUN_ONTO(theme)) {
      const first = ratio(over(color(theme, "text-tertiary"), bg), bg);
      assert.ok(first >= 4.5, `${theme}: the first step on ${bgName} is ${fmt(first)}:1`);
      const failed = ratio(over({ ...color(theme, "status-danger"), alpha: danger }, bg), bg);
      assert.ok(failed >= 4.5, `${theme}: a failed row's first step on ${bgName} is ${fmt(failed)}:1`);
      // Under more contrast nothing recedes: tertiary steps to secondary, and a failed row is full danger ink.
      assert.ok(ratio(over(more(theme, "text-tertiary"), bg), bg) >= 4.5, `${theme}: the first step on ${bgName} under more contrast`);
      assert.ok(ratio(over(more(theme, "status-danger"), bg), bg) >= 4.5, `${theme}: a failed row on ${bgName} under more contrast`);
    }
  });

  test(`${theme}: the queued breath, text-secondary at opacity-queued, is 3:1 or better on every surface, well and level at its lowest, and under more contrast`, () => {
    const floor = RUN_OPACITY("queued");
    assert.equal(floor, 0.65);
    for (const [bgName, bg] of RUN_ONTO(theme)) {
      const r = ratio(over({ ...more(theme, "text-secondary"), alpha: floor }, bg), bg);
      assert.ok(r >= 3, `${theme}: the queued mark at its lowest on ${bgName} is ${fmt(r)}:1`);
    }
  });

  test(`${theme}: the connector and the rail's track (border-input, a hairline) hold 3:1 on every surface and level`, () => {
    atLeast(theme, "border-input", 3, RUN_ONTO(theme));
  });

  test(`${theme}: the tail's steps 2 to 5 are the named exception, below 4.5:1 on purpose; reported with their ratios`, (t) => {
    const steps = [2, 3, 4, 5].map((n) => [n, RUN_OPACITY(`recede-${n}`)]);
    assert.deepEqual(steps.map(([, v]) => v), [0.5, 0.32, 0.2, 0.12], "the owner's steps");
    for (const [n, alpha] of steps) {
      const bg = color(theme, "surface-1");
      const neutral = ratio(over({ ...color(theme, "text-secondary"), alpha }, bg), bg);
      const failed = ratio(over({ ...color(theme, "status-danger"), alpha }, bg), bg);
      assert.ok(neutral < 4.5, `${theme}: step ${n} is the exception; if it held 4.5:1 it would not need one`);
      t.diagnostic(`${theme}, level 1: step ${n} at ${alpha} is ${fmt(neutral)}:1, a failed row ${fmt(failed)}:1`);
    }
  });
}

test("opacity-recede-2 to -5 are read by a run timeline's tail and nothing else in the stylesheet", () => {
  const css = fs.readFileSync(new URL("../../react/src/styles/components.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const readers = [];
  for (const m of css.matchAll(/([^{}]*)\{[^{}]*--basalt-opacity-recede-[2-5]\b[^{}]*\}/g)) readers.push(m[1].trim());
  for (const selector of readers) assert.ok(selector.split(",").every((s) => /\.basalt-run-steps\b/.test(s)), `${selector} reads a tail step and is not a run timeline's tail`);
  const skill = new URL("../../../tools/html-skill/src/modules/runs.css", import.meta.url);
  if (fs.existsSync(skill)) assert.ok(!/--basalt-opacity-recede-[2-5]\b/.test(fs.readFileSync(skill, "utf8")), "the HTML skill draws no tail");
});

// cimip-gaps-3 T1: the pairs its parts rely on, named. The idle mark (tertiary) and the still ring (secondary in a list, primary in a running mark) are
// 3:1 marks on every surface and level; under more contrast the idle mark is secondary. The opaque bar under more contrast: its line is the hairline
// drawn as border-input over surface-page (3.39:1 dark, 3.35:1 light at the decision), and primary and secondary ink sit on surface-page.
for (const theme of THEMES) {
  test(`${theme}: T1's pairs: the idle mark and the still ring at 3:1 everywhere, and the opaque bar under more contrast`, () => {
    const onto = [...SURFACES.map((n) => [n, color(theme, n)]), ...LEVELS.map((n) => [n, color(theme, n)])];
    for (const [bgName, bg] of onto) {
      for (const mark of ["text-tertiary", "text-secondary", "text-primary"]) assert.ok(ratio(over(color(theme, mark), bg), bg) >= 3, `${theme}: ${mark} as a mark on ${bgName}`);
      assert.ok(ratio(over(more(theme, "text-tertiary"), bg), bg) >= 3, `${theme}: the idle mark under more contrast on ${bgName}`);
    }
    const page = color(theme, "surface-page");
    const line = ratio(over(more(theme, "border-hairline"), page), page);
    assert.ok(line >= 3, `${theme}: the bar's line under more contrast is ${fmt(line)}:1`);
    for (const ink of ["text-primary", "text-secondary"]) assert.ok(ratio(more(theme, ink), page) >= 4.5, `${theme}: ${ink} on the opaque bar`);
  });
}

// cimip-gaps-3 t6 (DECISIONS 385): the pairs its parts draw, each in both themes and under more contrast. Tertiary on a code block's wells (the line
// numbers and the sideways line under a CodeBlock), tertiary on the popup levels (MenuText), and a command row that cannot run: its reason is tertiary at
// rest on the command surfaces (the modal at level 1, the list at 1 to 3) and secondary on the lit row's plate.
for (const theme of THEMES) {
  test(`${theme}: t6's pairs hold 4.5:1: code numbers and the sideways line on every well, MenuText on every popup level, a reason at rest and lit`, () => {
    const wells = ["surface-sunken", "surface-well-2", "surface-well-3"].map((n) => [n, color(theme, n)]);
    const popups = ["surface-1", "surface-2", "surface-3"].map((n) => [n, color(theme, n)]);
    for (const [mode, read] of [["", (n) => color(theme, n)], [" under more contrast", (n) => more(theme, n)]]) {
      for (const [name, bg] of [...wells, ...popups]) {
        const r = ratio(over(read("text-tertiary"), bg), bg);
        assert.ok(r >= 4.5, `${theme}: tertiary on ${name} is ${fmt(r)}:1${mode}`);
      }
      for (const level of [1, 2, 3]) {
        const plate = plateOf(theme, level);
        const r = ratio(over(read("text-secondary"), plate), plate);
        assert.ok(r >= 4.5, `${theme}: a reason (secondary) on the lit plate at level ${level} is ${fmt(r)}:1${mode}`);
        // A match in a reason is primary at 600, at rest and lit.
        const m = ratio(over(read("text-primary"), plate), plate);
        assert.ok(m >= 4.5, `${theme}: a mark (primary) on the lit plate at level ${level} is ${fmt(m)}:1${mode}`);
      }
    }
  });
}
