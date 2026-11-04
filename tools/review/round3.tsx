// Round 3: Basalt's tokens for SwiftUI. The swatches and values below are read from the same
// built tokens the Swift is generated from; the renders are Apple's, from the macOS CI job.

import * as React from "react";

import { Button, Segment, SegmentedControl } from "../../packages/react/src/index";
import dark from "../../packages/tokens/tokens/theme.dark.tokens.json";
import built from "../../packages/tokens/dist/json/tokens.json";
import renderDark from "./assets/round-3/swiftui-sample-dark.png";
import renderLight from "./assets/round-3/swiftui-sample-light.png";
import type { Round } from "./rounds";

type Entry = { type: string; hex?: string; oklch?: string; css?: string };
const B = built as unknown as { primitives: Record<string, Entry>; light: Record<string, Entry>; dark: Record<string, Entry> };

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const muted: React.CSSProperties = { fontSize: 13, color: "var(--basalt-text-secondary)" };
const mono: React.CSSProperties = { fontFamily: "var(--basalt-font-family-mono)", fontSize: 12 };

/** Usage notes from the token source, e.g. "surface-page" -> "The page, and app sidebars…" */
const usage: Record<string, string> = {};
(function walk(node: Record<string, unknown>, at: string[]) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$") || typeof v !== "object" || v === null) continue;
    const o = v as Record<string, unknown>;
    if ("$value" in o) usage[[...at.slice(at[0] === "color" ? 1 : 0), k].join("-")] = String(o.$description ?? "");
    else walk(o, [...at, k]);
  }
})(dark as Record<string, unknown>, []);

const COLORS = Object.keys(B.dark).filter((k) => B.dark[k]!.type === "color");

/** A colour over its own theme's page, so translucent tokens (hairlines, washes) show as they draw. */
function Swatch({ hex, page }: { hex: string; page: string }) {
  return (
    <span style={{ display: "inline-block", width: 28, height: 28, borderRadius: 6, background: `linear-gradient(${hex}, ${hex}), ${page}`, boxShadow: "inset 0 0 0 1px var(--basalt-border-hairline)" }} />
  );
}

function ColorsStep() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto auto minmax(0, 1fr)", gap: "10px 16px", alignItems: "center" }}>
      <span style={{ ...muted, fontSize: 12 }}>Light · Dark, each on its page</span>
      <span style={{ ...muted, fontSize: 12 }}>Swift</span>
      <span style={{ ...muted, fontSize: 12 }}>Use</span>
      {COLORS.map((k) => (
        <React.Fragment key={k}>
          <span style={{ display: "inline-flex", gap: 4 }}>
            <Swatch hex={B.light[k]!.hex!} page={B.light["surface-page"]!.hex!} />
            <Swatch hex={B.dark[k]!.hex!} page={B.dark["surface-page"]!.hex!} />
          </span>
          <code style={mono}>Basalt.Colors.{camel(k)}</code>
          <span style={muted}>{usage[k]}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

const STEPS = ["xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"];
const swiftStep = (k: string) => ({ "2xl": "xl2", "3xl": "xl3", "4xl": "xl4", "5xl": "xl5" })[k] ?? k;

function TypeStep() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {STEPS.map((k) => {
        const size = B.primitives[`text-${k}-size`]!.css!;
        const lh = B.primitives[`text-${k}-line-height`]!.css!;
        const tr = B.primitives[`text-${k}-tracking`]!.css!;
        return (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "190px minmax(0, 1fr)", gap: 16, alignItems: "baseline" }}>
            <code style={mono}>
              TypeScale.{swiftStep(k)} · {parseFloat(size)}/{parseFloat(lh)}
            </code>
            <span style={{ fontSize: size, lineHeight: lh, letterSpacing: tr, fontWeight: parseFloat(size) >= 20 ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Run agents on ground you trust
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ScaleStep() {
  const row = (prefix: string, swift: (k: string) => string) =>
    Object.entries(B.primitives)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => ({ k, px: parseFloat(v.css!), name: swift(k.slice(prefix.length)) }))
      .sort((a, b) => a.px - b.px);
  const space = row("space-", (k) => `Space.s${k.replace("-", "_")}`);
  const radius = row("radius-", (k) => `Radius.${k}`).filter((r) => r.px < 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {space.map((s) => (
          <div key={s.k} style={{ display: "grid", gridTemplateColumns: "96px 1fr 40px", gap: 12, alignItems: "center" }}>
            <code style={mono}>{s.name}</code>
            <span style={{ height: 8, width: s.px, borderRadius: 2, background: "var(--basalt-text-tertiary)" }} />
            <span style={muted}>{s.px}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignContent: "flex-start" }}>
        {radius.map((r) => (
          <div key={r.k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ width: 72, height: 48, borderRadius: r.px, background: "var(--basalt-surface-raised)", boxShadow: "inset 0 0 0 1px var(--basalt-border-input)" }} />
            <code style={mono}>{r.name} · {r.px}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

const CURVES: Record<string, string> = { out: "ease-out", "in-out": "ease-in-out", in: "ease-in" };

function MotionStep() {
  const [duration, setDuration] = React.useState("slow");
  const [curve, setCurve] = React.useState("out");
  const [at, setAt] = React.useState(false);
  const ms = parseFloat(B.primitives[`duration-${duration}`]!.css!);
  const bezier = B.primitives[`ease-${curve}`]!.css!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SegmentedControl aria-label="Duration" value={duration} onValueChange={setDuration}>
          {["fast", "base", "slow", "slower"].map((d) => (
            <Segment key={d} value={d}>{d}</Segment>
          ))}
        </SegmentedControl>
        <SegmentedControl aria-label="Curve" value={curve} onValueChange={setCurve}>
          {Object.keys(CURVES).map((c) => (
            <Segment key={c} value={c}>{c}</Segment>
          ))}
        </SegmentedControl>
        <Button variant="primary" onClick={() => setAt((v) => !v)}>Play</Button>
      </div>
      <div style={{ position: "relative", height: 48, borderRadius: 12, background: "var(--basalt-surface-sunken)" }}>
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--basalt-action-primary)",
            transform: at ? "translateX(calc(min(560px, 60vw)))" : "none",
            transition: `transform ${ms}ms ${bezier}`,
          }}
        />
      </div>
      <code style={mono}>
        withAnimation(.basalt(Basalt.Duration.{duration}, curve: Basalt.Easing.{curve === "in" ? "`in`" : camel(curve)})) {"{ … }"} · {ms}ms · {bezier}
      </code>
    </div>
  );
}

function RenderStep() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {([["Light", renderLight], ["Dark", renderDark]] as const).map(([name, src]) => (
          <figure key={name} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <img src={src} alt={`The sample screen in SwiftUI, ${name.toLowerCase()} appearance`} style={{ width: "100%", maxWidth: 480, borderRadius: 12, boxShadow: "0 0 0 1px var(--basalt-border-hairline)" }} />
            <figcaption style={muted}>{name} · rendered by SwiftUI's ImageRenderer on macOS, in CI</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export const ROUND_3: Round = {
  id: "3",
  title: "Tokens for SwiftUI",
  pr: "https://github.com/bmjcoding/basalt/pull/4",
  summary:
    "The same tokens, generated as a Swift package for the Apple apps, with a SwiftUI layer and CI that builds it on macOS. The values below are read from the tokens the Swift is generated from.",
  steps: [
    {
      id: "colors",
      name: "Colours",
      intro: "Every semantic colour, light and dark, as Swift sees it. In SwiftUI, `.color` follows the system's appearance.",
      decisions: [
        "Values are sRGB components, generated from the same OKLCH source as the CSS. Every colour is inside sRGB, so it's identical on every display.",
        "Each token's usage note is its Swift doc comment. The notes moved into the token source, so CSS, Swift and the reference read one copy.",
        "The macOS tests repeat the web's WCAG checks on the Swift values, so a conversion mistake can't reach the apps.",
      ],
      tryIt: ["Switch the walkthrough's theme: the swatches show both themes regardless."],
      demo: () => <ColorsStep />,
    },
    {
      id: "type",
      name: "Type scale",
      intro: "The type scale in Swift, set in Geist, which the package bundles and registers.",
      decisions: [
        "Fonts ship as static TrueType faces: iOS can't register woff2. Regular, Medium and SemiBold, plus Mono Regular and Medium.",
        "Text scales with Dynamic Type, relative to a system text style, so accessibility sizes work.",
        "SwiftUI sets line height through the font; the helper approximates Basalt's line heights with line spacing.",
      ],
      tryIt: ["Compare a step here with the same step on the web: same size, line height and tracking."],
      demo: () => <TypeStep />,
    },
    {
      id: "scale",
      name: "Space and radius",
      intro: "Spacing on a 4pt base and radius by role, in points.",
      decisions: ["Names are Swift-safe: space-1-5 is `Space.s1_5`, text-2xl is `TypeScale.xl2`."],
      tryIt: ["Read a value here and find it in `Sources/BasaltTokens/Tokens.swift`."],
      demo: () => <ScaleStep />,
    },
    {
      id: "motion",
      name: "Motion",
      intro: "Durations in seconds and Basalt's timing curves, as SwiftUI animations.",
      decisions: ["`Animation.basalt(_:curve:)` builds a timing curve from the tokens. None overshoots."],
      tryIt: ["Pick a duration and a curve, then press Play. This uses the web tokens; SwiftUI uses the same numbers."],
      demo: () => <MotionStep />,
    },
    {
      id: "render",
      name: "SwiftUI render",
      intro: "A sample screen built only from the Swift tokens, rendered by Apple's own renderer in the macOS CI job.",
      decisions: [
        "CI builds the package and runs its tests on macOS for every change, and fails if the generated Swift is stale.",
        "The renders are produced in CI, so the Apple side gets pictures every round without a Mac in the loop.",
      ],
      tryIt: ["Compare the two appearances: the page is the darkest layer in both."],
      demo: () => <RenderStep />,
    },
  ],
};
