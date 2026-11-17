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
    // light, 1.35:1 in dark) nor the ink step (about 2.1 to 2.2:1) is asserted as the pass: they are support, and they are reported below.
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

  test(`${theme}: ghost's secondary ink at opacity-amount does NOT hold 4.5:1 on every surface, which is why ghost and danger keep full ink`, () => {
    const worst = Math.min(...surfaces(theme).map(([, s]) => ratio(over({ ...color(theme, "text-secondary"), alpha: AMOUNT }, s), s)));
    assert.ok(worst < 4.5, `${theme}: secondary at the amount's opacity is ${fmt(worst)}:1 at worst; if this now passes, ghost may take the quiet amount`);
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
      // the lift is a real step: rest rows are secondary on the panel, lit rows primary on the plate
      assert.ok(ratio(color(theme, "text-primary"), plate) / ratio(color(theme, "text-secondary"), panel) >= 1.5, `${theme}: the lift is under 1.5x at level ${level}`);
    });

    test(`${theme}, level ${level}: a group label is tertiary on the panel, and a hint lifts to secondary on the plate`, () => {
      const plate = plateOf(theme, level);
      const group = ratio(over(color(theme, "text-tertiary"), panel), panel);
      assert.ok(group >= 4.5, `${theme}: tertiary on level ${level} is ${fmt(group)}:1`);
      assert.ok(ratio(over(color(theme, "text-secondary"), plate), plate) >= 4.5, `${theme}: a hint (secondary) on the plate at level ${level}`);
      // why the lift exists: in dark tertiary falls under 4.5:1 on the plate at levels 1 and 2 (the council measured 4.08 and 3.79)
      if (theme === "dark" && level < 3) assert.ok(ratio(over(color(theme, "text-tertiary"), plate), plate) < 4.5, `tertiary holds on the plate at level ${level}, so the hint lift is no longer needed`);
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

  test(`${theme}: at the midpoint primary and secondary hold 4.5:1 on the bare fill and on the selected wash, and tertiary holds only on the bare fill (DECISIONS 146 E)`, () => {
    // At 85% dark, secondary on the selected wash over white was 4.40:1, a failure. Every pair is composited in order: plate,
    // bar fill, wash, ink. Tertiary would pass on the bare fill but still fails on the wash, so the rule keeps it off the bar.
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
    const onWash = Math.min(...Object.values(PLATES).map((under) => { const wash = over(color(theme, "state-selected"), over(fill, under)); return ratio(over(color(theme, "text-tertiary"), wash), wash); }));
    assert.ok(onWash < 4.5, `${theme}: tertiary holds ${fmt(onWash)}:1 on the wash on every plate, so the rule against it is no longer needed`);
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

test("the header's worst cases are the ones the council measured at the midpoint: secondary 7.19:1 in dark over white and 7.42:1 in light over black; on the selected wash 5.71:1 and 6.34:1", () => {
  const dark = over(color("dark", "surface-chrome"), PLATES.white);
  const light = over(color("light", "surface-chrome"), PLATES.black);
  // The council rounded the composite to 8 bits; this one keeps it exact. They agree to the second decimal place.
  const secondary = (theme, bar) => ratio(over(color(theme, "text-secondary"), bar), bar);
  assert.ok(Math.abs(secondary("dark", dark) - 7.19) <= 0.03, "dark secondary over white");
  assert.ok(Math.abs(secondary("light", light) - 7.42) <= 0.03, "light secondary over black");
  const darkWash = over(color("dark", "state-selected"), dark);
  const lightWash = over(color("light", "state-selected"), light);
  assert.ok(Math.abs(secondary("dark", darkWash) - 5.71) <= 0.05, `dark secondary on the selected wash over white ${secondary("dark", darkWash)}`);
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
        light: { 1: [1.891, 1.744, 2.27], 2: [1.891, 1.744, 2.27], 3: [1.891, 1.744, 2.27] },
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
// The solid plate (--_plate-solid) is the plate of the menus round painted as ONE opaque colour: the wash mixed over the level in
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
      // the ink step is the cue the plate alone (about 1.2:1) cannot carry: primary is a real step above the unpressed ghost's secondary
      assert.ok(ratio(color(theme, "text-primary"), plate) / ratio(over(color(theme, "text-secondary"), surface(level)), surface(level)) >= 1.4, `${theme}: the ink step at level ${level}`);
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
  assert.deepEqual(MORE, { "border-hairline": "line-contrast", "border-rim": "line-contrast", "border-rim-top": "line-contrast", "border-divider": "line-contrast", "text-tertiary": "ink-contrast", "border-field": "field-contrast", "border-hover": "text-secondary" });
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
