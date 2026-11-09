// Round 11: Basalt's accent classes, with one in the catalogue: cobalt. The council converged on the mechanism and the owner
// approved "cobalt only for now" (DECISIONS.md items 37 and 41). A product sets one class with `data-accent` on its root, or
// none; the accent is read by one thing, Badge's accent dot. Nothing here is an option.
//
// Every ratio printed below is computed here from the generated token values, unrounded, the
// way the contrast tests compute them (OKLCH to linear sRGB with no clamping, translucent washes composited first).

import * as React from "react";

import tokenJson from "../../packages/tokens/dist/json/tokens.json";
import { Badge } from "../../packages/react/src/index";
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
  return ratio(srgbOf(theme, "accent-cobalt").c, bg);
}

const fmt = (r: number) => `${r.toFixed(2)}:1`;

// ---- The specimen: a Badge with the accent dot, and the same Badge with no accent

const LEVELS = [
  { n: 0, name: "Page", role: "surface-0" },
  { n: 1, name: "Level 1", role: "surface-1" },
  { n: 2, name: "Level 2", role: "surface-2" },
  { n: 3, name: "Level 3", role: "surface-3" },
];

/** A ratio, printed for whichever theme is showing. */
function Both({ dark, light }: { dark: string; light: string }) {
  return (
    <>
      <span className="wt-dark-only">{dark}</span>
      <span className="wt-light-only">{light}</span>
    </>
  );
}

function Levels({ accent }: { accent: "cobalt" | "none" }) {
  return (
    <div className="wt-levels" data-accent={accent}>
      {LEVELS.map((level) => (
        <div key={level.n} className="wt-level" style={{ background: `var(--basalt-surface-${level.n})` }}>
          <div className="wt-level-name">{level.name}</div>
          <div className="wt-level-role">{level.role}</div>
          <div style={{ marginTop: "var(--basalt-space-2)" }}>
            <Badge status="accent" variant="plain">Needs you</Badge>
          </div>
          {accent === "cobalt" ? (
            <div className="wt-level-hex">
              dot <Both dark={fmt(accentOn("dark", `surface-${level.n}`))} light={fmt(accentOn("light", `surface-${level.n}`))} />, needs 3:1
            </div>
          ) : (
            <div className="wt-level-hex">ink dot, same word</div>
          )}
        </div>
      ))}
    </div>
  );
}

/** A theme nested inside a cobalt root, and the other way round: each dot takes its own theme's cobalt. */
function Nested() {
  const inner = (theme: "dark" | "light") => (
    <div data-theme={theme} className="wt-level" style={{ background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)" }}>
      <div className="wt-level-name">Nested {theme}</div>
      <div style={{ marginTop: "var(--basalt-space-2)" }}>
        <Badge status="accent" variant="plain">Needs you</Badge>
      </div>
    </div>
  );
  return (
    <div className="wt-levels" data-accent="cobalt" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
      {inner("light")}
      {inner("dark")}
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
        Lowest of all 24 pairs: {fmt(min)}. A dot or icon needs 3:1, and the tests hold cobalt to 4.5:1 so it is also readable as text.
      </p>
    </div>
  );
}

function AccentDemo() {
  return (
    <div style={col}>
      <Caption>Cobalt: <code>data-accent=&quot;cobalt&quot;</code> on the root. The dot is cobalt, the word stays ink</Caption>
      <Levels accent="cobalt" />
      <Caption>No accent: <code>data-accent=&quot;none&quot;</code>, or no attribute, or a name Basalt doesn&apos;t know. The same Badge, with an ink dot</Caption>
      <Levels accent="none" />
      <Caption>A light theme inside a dark cobalt root, and a dark theme inside a light one: each dot is its own theme&apos;s cobalt, with nothing restated</Caption>
      <Nested />
      <Caption>Every surface cobalt can sit on, bare and under a hover or selected wash (the washes are composited over the surface first)</Caption>
      <RatioTable theme="dark" />
      <RatioTable theme="light" />
    </div>
  );
}

const dark = srgbOf("dark", "accent-cobalt");
const light = srgbOf("light", "accent-cobalt");
const unclamped = (c: RGB) => c.every((v) => v >= 0 && v <= 1);
if (!unclamped(dark.c) || !unclamped(light.c)) throw new Error("the cobalt accent is outside sRGB");

export const ROUND_11: Round = {
  id: "11",
  title: "Accent classes: cobalt",
  reviewed: false,
  summary:
    "Basalt gets accent classes, with one in the catalogue: cobalt. The council converged on the mechanism and the owner approved cobalt only for now (DECISIONS.md items 37 and 41). A product sets one class with data-accent on its root, or none, and Badge's accent dot is the only thing that reads it. The built result has not been through the panel since it was built.",
  steps: [
    {
      id: "accent-classes",
      name: "Accent classes",
      intro: "A product adds colour through one accent class. Cobalt paints one dot beside ink words, for the product's approved role (N1: “needs you”), and nothing else.",
      decisions: [
        "Decided by the council (item 37) and approved by the owner as cobalt only for now (item 41): dark oklch(0.72 0.14 264), light oklch(0.47 0.17 264), under the token accent.cobalt.",
        "One class, set with data-accent on the root, or none. A subtree changes it only to show another product's own content where no other accent is in view, or to none for shared or exported output.",
        "The mechanism is one light-dark() rule per class, behind @supports, on an unregistered --basalt-accent-ink. none and any name Basalt doesn't know reset it, so the reader falls back to primary ink. Older browsers keep the ink dot.",
        "Badge gets an accent tone, BadgeStatus “accent”: the dot reads --basalt-accent-ink; the word stays ink, with no accent hairline or fill. In forced colours the dot is CanvasText. No other component reads the variable, and a test follows aliases to keep it so.",
        "shadcn's --accent is untouched: it stays a neutral hover wash.",
        `Both values are inside sRGB (unclamped). Dark is ${dark.c.map((v) => v.toFixed(3)).join(", ")} and light ${light.c.map((v) => v.toFixed(3)).join(", ")} in sRGB. Each is held to 4.5:1 on every surface and wash, and at least as far from every status colour as danger is from warning.`,
      ],
      tryIt: ["Compare the cobalt rows with the no-accent rows in dark and in light.", "Check the nested themes: each dot should look right on its own background.", "Read the ratios under each tile, then the full table."],
      demo: () => <AccentDemo />,
    },
  ],
};
