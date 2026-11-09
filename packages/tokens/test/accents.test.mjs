// Basalt's accent classes (DECISIONS.md items 37 and 41): one class today, cobalt. A class is a theme token at color.accent.<name>; the
// generator turns it into a [data-accent] rule, a TypeScript entry and a Swift case. Every test below runs over the classes the
// tokens declare, so a later class is one token entry plus a line in DECIDED, and it meets the same bars.
//
// What a class must be:
//   - readable: 4.5:1 on every surface and on the hover and selected washes over each, in both themes, on the serialized values;
//   - inside sRGB, unclamped;
//   - clear of the status colours: as far from each as danger is from warning in that theme, on the serialized hex;
//   - confined: read by one thing, Badge's accent dot, and by nothing else.
//
// Run with `npm test` (builds first). Ratios are raw, never rounded up.

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { converter, formatHex, parse, rgb, wcagContrast } from "culori";

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const tokens = JSON.parse(read("../dist/json/tokens.json"));
const THEMES = ["light", "dark"];

/** The classes the tokens declare. */
const CLASSES = Object.keys(tokens.light).filter((n) => n.startsWith("accent-")).map((n) => n.slice("accent-".length));

/** What the council and the owner decided (items 37 and 41). A new class is added here when it is approved, not before. */
const DECIDED = { cobalt: { light: "oklch(0.47 0.17 264)", dark: "oklch(0.72 0.14 264)" } };

// ---- Colour: a token in one serialization (the CSS the build writes, or the 8-bit hex), as sRGB ----

const REPRESENTATIONS = ["oklch", "hex"];
const color = (theme, name, rep) => {
  const entry = tokens[theme][name] ?? tokens.primitives[name];
  assert.ok(entry, `${theme}: no token ${name}`);
  return rgb(parse(entry[rep]));
};
const over = (top, under) => {
  const a = top.alpha ?? 1;
  return { mode: "rgb", r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a) };
};
const ratio = (fg, bg) => wcagContrast(fg, bg);
const fmt = (r) => r.toFixed(3);

// Every surface the accent can sit on: the four levels, the roles built on them, the wells; bare, and under each wash.
const SURFACES = ["surface-0", "surface-1", "surface-2", "surface-3", "surface-page", "surface-raised", "surface-overlay", "surface-top", "surface-sunken", "surface-sunken-strong", "surface-well-2", "surface-well-3"];
const WASHES = ["state-hover", "state-selected"];
const backgrounds = (theme, rep) =>
  SURFACES.flatMap((s) => {
    const base = color(theme, s, rep);
    return [[s, base], ...WASHES.map((w) => [`${w} over ${s}`, over(color(theme, w, rep), base)])];
  });

test("the catalogue is the decided one: cobalt only for now", () => {
  assert.deepEqual(CLASSES, Object.keys(DECIDED), "a class was added or removed without a decision recorded in DECIDED");
});

for (const name of CLASSES) {
  for (const theme of THEMES) {
    const token = `accent-${name}`;

    test(`${name}, ${theme}: the value is the one the council decided, ${DECIDED[name]?.[theme]}`, () => {
      assert.equal(tokens[theme][token].oklch, DECIDED[name]?.[theme]);
    });

    for (const rep of REPRESENTATIONS) {
      test(`${name}, ${theme}, ${rep}: 4.5:1 on every surface level and on the hover and selected washes over each (1.4.3, so also 1.4.11)`, () => {
        const accent = color(theme, token, rep);
        let lowest = Infinity;
        for (const [bgName, bg] of backgrounds(theme, rep)) {
          const r = ratio(accent, bg);
          lowest = Math.min(lowest, r);
          assert.ok(r >= 4.5, `${name} (${theme}, ${rep}) on ${bgName} is ${fmt(r)}:1, needs 4.5:1`);
        }
        assert.ok(lowest < Infinity);
      });
    }

    test(`${name}, ${theme}: inside sRGB, unclamped: every channel of the OKLCH value is within 0 to 1`, () => {
      const { r, g, b } = rgb(parse(tokens[theme][token].oklch));
      for (const [channel, v] of Object.entries({ r, g, b })) assert.ok(v >= 0 && v <= 1, `${theme}: ${token} ${channel} is ${v}, outside sRGB`);
    });
  }
}

// ---- The status guard: an accent is never mistaken for a status ----
//
// A class must sit at least as far (ΔEok, Euclidean distance in OKLab) from each of danger, warning and success as danger sits from
// warning in that theme. Both the distance and the colours are measured on the serialized hex, the colours a browser or a native app is given.

const toLab = converter("oklab");
const deltaEok = (a, b) => {
  const x = toLab(a);
  const y = toLab(b);
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
};
const STATUSES = ["status-danger", "status-warning", "status-success"];
const hexColor = (theme, name) => rgb(parse(tokens[theme][name].hex));

/** The theme's danger-warning distance, and how close `hex` comes to each status. `ok` is true when it clears them all. */
function statusGuard(theme, hex) {
  const threshold = deltaEok(hexColor(theme, "status-danger"), hexColor(theme, "status-warning"));
  const distances = STATUSES.map((s) => [s, deltaEok(rgb(parse(hex)), hexColor(theme, s))]);
  const [nearest, distance] = distances.reduce((lo, d) => (d[1] < lo[1] ? d : lo));
  return { threshold, nearest, distance, ok: distance >= threshold };
}

for (const name of CLASSES) {
  for (const theme of THEMES) {
    test(`${name}, ${theme}: at least as far from every status colour as danger is from warning`, () => {
      const g = statusGuard(theme, tokens[theme][`accent-${name}`].hex);
      assert.ok(g.threshold > 0.1, `the ${theme} danger-warning distance is ${g.threshold}; the guard would be meaningless`);
      assert.ok(g.ok, `${name} (${theme}) is ${g.distance.toFixed(4)} from ${g.nearest}; it must be at least ${g.threshold.toFixed(4)}`);
    });
  }
}

test("the status guard can fail: oklch hue 20 at cobalt's lightness and chroma is caught in both themes, and so is an exact status colour", () => {
  for (const theme of THEMES) {
    const { l, c } = parse(tokens[theme]["accent-cobalt"].oklch);
    const red = formatHex({ mode: "oklch", l, c, h: 20 });
    const g = statusGuard(theme, red);
    assert.equal(g.ok, false, `${theme}: a red at hue 20 (${red}) passed the guard at ${g.distance}, threshold ${g.threshold}`);
    assert.equal(g.nearest, "status-danger");
    assert.equal(statusGuard(theme, tokens[theme]["status-warning"].hex).ok, false, `${theme}: warning itself passed`);
    assert.equal(statusGuard(theme, tokens[theme]["accent-cobalt"].hex).ok, true, `${theme}: the guard rejects cobalt`);
  }
});

// ---- The generated outputs agree with the tokens ----

const accentsCss = read("../dist/css/accents.css");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

test("accents.css: one light-dark() rule per class, behind @supports, in @layer basalt; none and unknown names reset", () => {
  const css = stripComments(accentsCss);
  assert.match(css, /^\s*@layer basalt \{/, "the rules are in @layer basalt");
  assert.match(css, /@supports \(color: light-dark\(white, black\)\) \{/);
  const supports = css.slice(css.indexOf("@supports"), css.indexOf("}\n  }") + 1);
  for (const name of CLASSES) {
    const rule = `[data-accent="${name}"] { --basalt-accent-ink: light-dark(${tokens.light[`accent-${name}`].oklch}, ${tokens.dark[`accent-${name}`].oklch}); }`;
    assert.ok(supports.includes(rule), `${name}'s rule is missing or differs from the tokens: ${rule}`);
  }
  // The reset covers none and every name that is not a class, and it is outside @supports (it is harmless without light-dark).
  const known = CLASSES.map((n) => `:not([data-accent="${n}"])`).join("");
  assert.ok(css.includes(`[data-accent="none"], [data-accent]${known} { --basalt-accent-ink: initial; }`), "the reset rule is missing");
  assert.ok(!supports.includes("initial"), "the reset sits inside @supports");
});

test("the accent classes are not custom properties of their own, so there is no second path to a class's colour", () => {
  assert.doesNotMatch(read("../dist/css/tokens.css"), /--basalt-accent/, "tokens.css declares an accent property");
  assert.doesNotMatch(read("../dist/css/shadcn.css"), /--basalt-accent/, "shadcn.css reads an accent property");
});

test("shadcn's --accent is untouched: it is still the neutral hover wash", () => {
  const shadcn = read("../dist/css/shadcn.css");
  assert.match(shadcn, /--accent: var\(--basalt-state-hover\);/);
  assert.match(shadcn, /--accent-foreground: var\(--basalt-text-primary\);/);
});

test("the property stays unregistered: no @property rule and no registerProperty call", () => {
  const files = [accentsCss, read("../dist/css/tokens.css"), read("../../react/src/styles/components.css"), ...fs.readdirSync(new URL("../../react/src/", import.meta.url)).filter((f) => /\.tsx?$/.test(f)).map((f) => read(`../../react/src/${f}`))];
  for (const text of files) {
    assert.doesNotMatch(text, /@property\s+--basalt-accent/);
    assert.doesNotMatch(text, /registerProperty/);
  }
});

test("the TypeScript export has the same classes and values as the tokens", async () => {
  const { accents } = await import("../dist/js/tokens.js");
  assert.deepEqual(Object.keys(accents), CLASSES);
  for (const name of CLASSES) {
    for (const theme of THEMES) assert.deepEqual(accents[name][theme], tokens[theme][`accent-${name}`], `${name} ${theme}`);
  }
  const dts = read("../dist/js/tokens.d.ts");
  assert.ok(dts.includes(`export type AccentClass = ${CLASSES.map((n) => JSON.stringify(n)).join(" | ")};`));
  assert.ok(dts.includes("export declare const accents: Record<AccentClass, AccentColors>;"));
  // Our own types only: the declarations import nothing.
  assert.doesNotMatch(dts, /\bimport\b/);
});

test("the Swift AccentClass has the same cases and the same colours as the tokens", () => {
  const swift = read("../../../Sources/BasaltTokens/Tokens.swift");
  const body = swift.slice(swift.indexOf("public enum AccentClass"), swift.indexOf("/// Spacing on a 4pt base"));
  assert.deepEqual([...body.matchAll(/^\s+case (\w+)$/gm)].map((m) => m[1]), CLASSES);
  for (const name of CLASSES) {
    const block = body.slice(body.indexOf(`case .${name}:`));
    const num = (s) => Number(s);
    for (const theme of THEMES) {
      const m = new RegExp(`${theme}: RGBA\\(red: ([\\d.]+), green: ([\\d.]+), blue: ([\\d.]+), alpha: 1\\)`).exec(block);
      assert.ok(m, `${name}: no ${theme} colour in Swift`);
      const { r, g, b } = rgb(parse(tokens[theme][`accent-${name}`].oklch));
      for (const [got, want] of [[m[1], r], [m[2], g], [m[3], b]]) assert.ok(Math.abs(num(got) - want) < 1e-6, `${name} ${theme}: Swift ${got}, tokens ${want}`);
    }
  }
  assert.doesNotMatch(swift, /accentN1/, "the old N1 token is gone");
});

// ---- Confinement: only Badge's accent dot reads --basalt-accent-ink ----
//
// The accent is a dot beside ink words and nothing more. These checks find every declaration that reads the variable, directly or through
// a custom property that aliases it (and an alias of an alias), and sort what they find by where it is. Only one reader is allowed.

const ACCENT_VAR = "--basalt-accent-ink";
const ALLOWED = [{ selector: '.basalt-badge[data-status="accent"] .basalt-badge-dot', property: "background" }];

/** Every `selector { property: value }` in `css`, innermost rules only (at-rules are looked through). */
const declarations = (css) =>
  [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].flatMap(([, selector, body]) =>
    body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const at = d.indexOf(":");
      return { selector: selector.trim().replace(/\s+/g, " "), property: d.slice(0, at).trim(), value: d.slice(at + 1).trim() };
    }),
  );

/** The declarations in `sheets` that read the accent variable or an alias of it. */
function readers(...sheets) {
  const all = sheets.flatMap(declarations);
  const carriers = new Set([ACCENT_VAR]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const d of all) {
      if (d.property.startsWith("--") && !carriers.has(d.property) && [...carriers].some((c) => d.value.includes(`var(${c}`))) {
        carriers.add(d.property);
        grew = true;
      }
    }
  }
  return all.filter((d) => [...carriers].some((c) => d.value.includes(`var(${c}`)));
}

const CODE = /(^|[^\w])(code|pre)\b|\.tok-|codeblock|shiki|syntax|\[data-language/i;
const KINDS = {
  chrome: (d) => /basalt-chrome|(^|[^\w-])header\b|banner/i.test(d.selector),
  code: (d) => CODE.test(d.selector) || /syntax/.test(d.property),
  focus: (d) => /:focus|focus-visible|focus-within/.test(d.selector) || /^outline|focus/.test(d.property),
  selection: (d) => /aria-selected|data-active|aria-pressed|data-selected|data-pressed|data-highlighted|aria-current/.test(d.selector),
  link: (d) => /(^|[\s>+~,(])a\b|basalt-link|page-link|breadcrumb|:link|:visited|\[href/.test(d.selector),
  "primary button": (d) => /basalt-button/.test(d.selector) && /primary/.test(d.selector) || /action-primary/.test(d.property),
  "checked control": (d) => /data-checked|:checked|aria-checked|data-indeterminate|basalt-checkbox|basalt-radio|basalt-switch/.test(d.selector),
  status: (d) => /data-status="(success|warning|danger)"/.test(d.selector) || /status/.test(d.property),
  alias: (d) => d.property.startsWith("--"),
  "not a plain background": (d) => d.property !== "background",
};
const kindsOf = (d) => Object.entries(KINDS).filter(([, test]) => test(d)).map(([kind]) => kind);

test("the confinement check can fail: a read in each forbidden place is caught, directly or through an alias", () => {
  const bad = {
    chrome: ".basalt-chrome .basalt-link { color: var(--basalt-accent-ink); }",
    code: "code { color: var(--basalt-accent-ink); }",
    "code (alias)": ":root { --code-ink: var(--basalt-accent-ink); } .basalt-code { color: var(--code-ink); }",
    focus: ".x:focus-visible { background: var(--basalt-accent-ink); }",
    "focus (outline)": ".x { outline: 2px solid var(--basalt-accent-ink); }",
    "aria-selected": '[aria-selected="true"] { background: var(--basalt-accent-ink); }',
    "data-active": ".basalt-tab[data-active] { background: var(--basalt-accent-ink); }",
    "aria-pressed": '[aria-pressed="true"] { background: var(--basalt-accent-ink); }',
    link: "a { color: var(--basalt-accent-ink); }",
    "link (class)": ".basalt-link { background: var(--basalt-accent-ink); }",
    "primary button": '.basalt-button[data-variant="primary"] { background: var(--basalt-accent-ink); }',
    "checked control": ".basalt-checkbox[data-checked] { background: var(--basalt-accent-ink); }",
    status: '.basalt-badge[data-status="danger"] .basalt-badge-dot { background: var(--basalt-accent-ink); }',
    "status (alias of an alias)": ":root { --a: var(--basalt-accent-ink); --b: var(--a); --basalt-status-danger: var(--b); }",
    "the word, not the dot": '.basalt-badge[data-status="accent"] { color: var(--basalt-accent-ink); }',
    "a hairline": '.basalt-badge[data-status="accent"] .basalt-badge-dot { box-shadow: 0 0 0 1px var(--basalt-accent-ink); }',
  };
  for (const [what, css] of Object.entries(bad)) {
    const found = readers(css);
    assert.ok(found.length > 0, `the reader finder missed: ${what}`);
    assert.ok(found.some((d) => kindsOf(d).length > 0), `the check missed: ${what}`);
  }
  assert.deepEqual(readers('.basalt-badge[data-status="accent"] .basalt-badge-dot { background: var(--basalt-accent-ink, var(--basalt-text-primary)); }').map((d) => [d.selector, d.property, kindsOf(d)]), [[ALLOWED[0].selector, "background", []]]);
});

const SHEETS = {
  "components.css": read("../../react/src/styles/components.css"),
  "styles.css (built)": read("../../react/dist/styles.css"),
  "tokens.css": read("../dist/css/tokens.css"),
  "shadcn.css": read("../dist/css/shadcn.css"),
  "basalt-html.css": read("../../../tools/html-skill/src/basalt-html.css"),
};

test("nothing reads the accent from chrome, code, focus, selection, links, the primary button, a checked control or a status", () => {
  for (const [file, css] of Object.entries(SHEETS)) {
    for (const d of readers(css)) assert.deepEqual(kindsOf(d), [], `${file}: ${d.selector} { ${d.property} } reads the accent`);
  }
});

test("only Badge's accent dot reads the accent, and only as its background", () => {
  for (const file of ["components.css", "styles.css (built)"]) {
    assert.deepEqual(readers(SHEETS[file]).map(({ selector, property }) => ({ selector, property })), ALLOWED, file);
  }
  for (const file of ["tokens.css", "shadcn.css"]) assert.deepEqual(readers(SHEETS[file]), [], `${file} reads the accent`);
  // The HTML skill's .status reader is a follow-up; until it lands the skill reads nothing, and its token CSS carries no accent.
  assert.deepEqual(readers(SHEETS["basalt-html.css"]), [], "the HTML skill's source CSS reads the accent");
  assert.ok(!/--basalt-accent|data-accent/.test(read("../../../.agent/skills/basalt-html/basalt-html.css")), "the built HTML skill carries an accent");
});

test("no script or highlighter names the accent: the Shiki theme and every component source stay clear of it", () => {
  assert.doesNotMatch(read("../../react/src/syntax.ts"), /accent/i, "the Shiki theme in syntax.ts mentions an accent");
  for (const f of fs.readdirSync(new URL("../../react/src/", import.meta.url)).filter((n) => /\.tsx?$/.test(n))) {
    const text = read(`../../react/src/${f}`);
    assert.doesNotMatch(text, /basalt-accent|accent-ink/, `${f} names the accent variable`);
  }
});

test("the Badge accent dot is the ink dot where the variable is missing, and CanvasText with its own colour adjustment in forced colours", () => {
  const css = stripComments(SHEETS["components.css"]);
  assert.ok(css.includes('.basalt-badge[data-status="accent"] .basalt-badge-dot { background: var(--basalt-accent-ink, var(--basalt-text-primary)); }'));
  const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
  assert.ok(forced.includes('.basalt-badge[data-status="accent"] .basalt-badge-dot { forced-color-adjust: none; background: CanvasText; }'));
  // forced-color-adjust is on the dot alone.
  assert.equal([...css.matchAll(/([^{}]+)\{[^{}]*forced-color-adjust: none[^{}]*background: CanvasText/g)].filter((m) => /badge/.test(m[1])).length, 1);
});
