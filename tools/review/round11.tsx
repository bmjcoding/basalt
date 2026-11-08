// Round 11: N1's accent, cobalt, tokenised as `accent-n1-needs-you`. The colour and its one role were decided by the
// council (4–0, 2026-11-08) at the round-2 values; this round only shows the token. The builder proposed the name and the
// council kept it, 4–0. Nothing here is an option.
//
// Every ratio printed below is computed here from the generated token values, unrounded, the
// way the contrast tests compute them (OKLCH to linear sRGB with no clamping, translucent washes composited first).

import * as React from "react";

import tokenJson from "../../packages/tokens/dist/json/tokens.json";
import type { Round } from "./rounds";

type Theme = "dark" | "light";
const tokens = tokenJson as unknown as Partial<Record<string, Partial<Record<string, { type: string; oklch: string }>>>>;

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

// ---- Colour maths: the same as the contrast tests (OKLCH to sRGB, never clamped or rounded up)

type RGB = [number, number, number];

/** A value that must exist: the build fails rather than printing a wrong ratio. */
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`round 11: ${what} is missing`);
  return value;
}

function srgbOf(theme: Theme, name: string): { c: RGB; a: number } {
  const entry = must(tokens[theme]?.[name] ?? tokens.primitives?.[name], `token ${name}`);
  const m = /^oklch\(([^)]*)\)$/.exec(entry.oklch);
  if (!m) throw new Error(`cannot read ${name}: ${entry.oklch}`);
  const [body = "", alpha] = must(m[1], "oklch body").split("/").map((x) => x.trim());
  const [L = NaN, C = NaN, H = NaN] = body.split(/\s+/).map(Number);
  if ([L, C, H].some(Number.isNaN)) throw new Error(`cannot read ${name}: ${entry.oklch}`);
  const hue = (H * Math.PI) / 180;
  const A = C * Math.cos(hue);
  const B = C * Math.sin(hue);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  const c: RGB = [
    gamma(4.0767416621 * l - 3.3077115913 * m_ + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m_ - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m_ + 1.707614701 * s),
  ];
  return { c, a: alpha === undefined ? 1 : Number(alpha) };
}

const over = (top: { c: RGB; a: number }, under: RGB): RGB => [
  top.c[0] * top.a + under[0] * (1 - top.a),
  top.c[1] * top.a + under[1] * (1 - top.a),
  top.c[2] * top.a + under[2] * (1 - top.a),
];
const lum = ([r, g, b]: RGB) => {
  const ch = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};
const ratio = (a: RGB, b: RGB) => {
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
};

/** The accent on a surface, with an optional wash (hover or selected) composited over it first. */
function accentOn(theme: Theme, surface: string, wash?: string): number {
  const base = srgbOf(theme, surface).c;
  const bg = wash ? over(srgbOf(theme, wash), base) : base;
  return ratio(srgbOf(theme, "accent-n1-needs-you").c, bg);
}

const fmt = (r: number) => `${r.toFixed(2)}:1`;

// ---- The specimen: a word and a dot

const LEVELS = [
  { n: 0, name: "Page", role: "surface-0" },
  { n: 1, name: "Level 1", role: "surface-1" },
  { n: 2, name: "Level 2", role: "surface-2" },
  { n: 3, name: "Level 3", role: "surface-3" },
];

const dot: React.CSSProperties = {
  width: "var(--basalt-size-dot)",
  height: "var(--basalt-size-dot)",
  borderRadius: "var(--basalt-radius-full)",
  background: "var(--basalt-accent-n1-needs-you)",
  flex: "none",
};
const word: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--basalt-space-2)", fontSize: "var(--basalt-text-sm-size)", lineHeight: "var(--basalt-text-sm-line-height)", fontWeight: "var(--basalt-font-weight-medium)" };

/** A ratio, printed for whichever theme is showing. */
function Both({ dark, light }: { dark: string; light: string }) {
  return (
    <>
      <span className="wt-dark-only">{dark}</span>
      <span className="wt-light-only">{light}</span>
    </>
  );
}

function Levels() {
  return (
    <div className="wt-levels">
      {LEVELS.map((level) => (
        <div key={level.n} className="wt-level" style={{ background: `var(--basalt-surface-${level.n})` }}>
          <div className="wt-level-name">{level.name}</div>
          <div className="wt-level-role">{level.role}</div>
          <div style={{ ...word, color: "var(--basalt-accent-n1-needs-you)", marginTop: "var(--basalt-space-2)" }}>
            <span style={dot} />
            Needs you
          </div>
          <div className="wt-level-hex">
            text <Both dark={fmt(accentOn("dark", `surface-${level.n}`))} light={fmt(accentOn("light", `surface-${level.n}`))} />, needs 4.5:1
          </div>
          <div style={{ ...word, color: "var(--basalt-text-primary)", marginTop: "var(--basalt-space-2)" }}>
            <span style={dot} />
            Needs you
          </div>
          <div className="wt-level-hex">
            dot <Both dark={fmt(accentOn("dark", `surface-${level.n}`))} light={fmt(accentOn("light", `surface-${level.n}`))} />, needs 3:1
          </div>
        </div>
      ))}
    </div>
  );
}

const SURFACES = ["surface-page", "surface-raised", "surface-overlay", "surface-top", "surface-sunken", "surface-sunken-strong", "surface-well-2", "surface-well-3"];

function RatioTable({ theme }: { theme: Theme }) {
  const rows = SURFACES.map((s) => ({ s, rest: accentOn(theme, s), hover: accentOn(theme, s, "state-hover"), selected: accentOn(theme, s, "state-selected") }));
  const min = Math.min(...rows.flatMap((r) => [r.rest, r.hover, r.selected]));
  return (
    <div className={theme === "dark" ? "wt-dark-only" : "wt-light-only"} style={{ width: "100%" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--basalt-text-xs-size)", fontFamily: "var(--basalt-font-family-mono)" }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--basalt-text-secondary)" }}>
            <th scope="col" style={{ fontWeight: "var(--basalt-font-weight-medium)", padding: "var(--basalt-space-1) 0" }}>Surface ({theme})</th>
            <th scope="col" style={{ fontWeight: "var(--basalt-font-weight-medium)" }}>At rest</th>
            <th scope="col" style={{ fontWeight: "var(--basalt-font-weight-medium)" }}>Hover wash</th>
            <th scope="col" style={{ fontWeight: "var(--basalt-font-weight-medium)" }}>Selected wash</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s} style={{ boxShadow: "inset 0 1px 0 var(--basalt-border-divider)" }}>
              <th scope="row" style={{ textAlign: "left", fontWeight: "var(--basalt-font-weight-regular)", padding: "var(--basalt-space-1) 0" }}>{r.s}</th>
              <td>{fmt(r.rest)}</td>
              <td>{fmt(r.hover)}</td>
              <td>{fmt(r.selected)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: "var(--basalt-space-2) 0 0", fontSize: "var(--basalt-text-xs-size)", color: "var(--basalt-text-secondary)" }}>
        Lowest of all 24 pairs: {fmt(min)}. Text needs 4.5:1; a dot or icon needs 3:1.
      </p>
    </div>
  );
}

function NeedsYouDemo() {
  return (
    <div style={col}>
      <Caption>On the page and on levels 1 to 3: the word in cobalt beside its dot, and the dot beside a primary-ink word</Caption>
      <Levels />
      <Caption>Every surface the accent can sit on, bare and under a hover or selected wash (the washes are composited over the surface first)</Caption>
      <RatioTable theme="dark" />
      <RatioTable theme="light" />
    </div>
  );
}

const dark = srgbOf("dark", "accent-n1-needs-you");
const light = srgbOf("light", "accent-n1-needs-you");
const unclamped = (c: RGB) => c.every((v) => v >= 0 && v <= 1);
if (!unclamped(dark.c) || !unclamped(light.c)) throw new Error("the N1 accent is outside sRGB");

export const ROUND_11: Round = {
  id: "11",
  title: "N1's accent: cobalt, for “needs you”",
  reviewed: false,
  summary:
    "One token, accent-n1-needs-you: N1's single accent, in the one role it has. The colour and the role were decided by the council (4–0, 8 Nov 2026) at the round-2 values and are not open. The council kept the builder's name, 4–0, and its corrections to the foundations entry and the confinement test are applied; nobody has re-reviewed those corrections.",
  steps: [
    {
      id: "needs-you",
      name: "Needs you",
      intro: "Cobalt appears for one reason only: something needs the person. It always sits beside a word and a dot, so it is never colour alone.",
      decisions: [
        "Decided by the council, 4–0, 2026-11-08 (DECISIONS.md item 21; round 2, Sol item 8): dark oklch(0.72 0.14 264), light oklch(0.47 0.17 264), tokenised now at those exact values.",
        "The name, proposed by the builder and kept by the council 4–0 on 2026-11-08: foundations had no product-accent structure, so the token is color.accent.n1.needs-you: group accent (a product's colour, which foundations says a product adds through its own accent), the product, then the role. It becomes --basalt-accent-n1-needs-you in CSS, accent-n1-needs-you in the JSON and accentN1NeedsYou in Swift. Another product adds accent.<product>.<role> beside it.",
        "Both values are inside sRGB (unclamped channels 0 to 1), so every display shows the same colour. On the page it is 8.36:1 in dark and 6.78:1 in light, as the council measured.",
        `Dark is ${dark.c.map((v) => v.toFixed(3)).join(", ")} and light ${light.c.map((v) => v.toFixed(3)).join(", ")} in sRGB. As text it needs 4.5:1 and as a dot or icon 3:1; both hold with room on every surface and wash, in both themes (the lowest pair is printed under the specimen).`,
        "It is not code styling. Syntax-keyword blue is at hue 255, nine degrees from cobalt's 264, so a test keeps the accent out of the highlighter's theme and out of every code rule. It is not allowed on the header bar either: only primary and secondary ink sit there.",
      ],
      tryIt: ["Compare the page and levels 1 to 3 in dark and in light.", "Read the ratios under each tile, then the full table.", "Switch the theme and check the word and the dot read without the colour."],
      demo: () => <NeedsYouDemo />,
    },
  ],
};
