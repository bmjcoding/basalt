// Builds the Basalt tokens from the DTCG source in tokens/:
//
//   dist/css/tokens.css   every token as a --basalt-* custom property; light by default,
//                         dark under [data-theme="dark"] / .dark, and with the OS
//                         preference when the page sets neither
//   dist/css/shadcn.css   the shadcn/ui variable names, mapped onto Basalt's
//   dist/js/tokens.js     resolved values per theme, for TypeScript and charts
//   dist/json/tokens.json resolved values with sRGB hex and OKLCH, for native generators
//
// Style Dictionary parses the DTCG files and resolves references; the transforms and the
// file layout are ours, because Basalt writes colours as OKLCH and themes by selector.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatHex, formatHex8, rgb } from "culori";
import StyleDictionary from "style-dictionary";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (name) => path.join(here, "tokens", name);
const dist = path.join(here, "dist");
const PREFIX = "basalt";
const THEMES = ["light", "dark"];
const brandsSrc = JSON.parse(fs.readFileSync(src("brands.tokens.json"), "utf8"));

/** [l, c, h] or [l, c, h, alpha] as an OKLCH CSS color. */
function partsCss(parts) {
  const [l, c, h, alpha] = parts;
  const body = `${round(l, 4)} ${round(c, 4)} ${round(h ?? 0, 2)}`;
  return alpha == null ? `oklch(${body})` : `oklch(${body} / ${round(alpha, 4)})`;
}

function colorEntry(parts) {
  const [l, c, h, alpha] = parts;
  const value = { colorSpace: "oklch", components: [l, c, h ?? 0] };
  if (alpha != null) value.alpha = alpha;
  const paint = toColor(value);
  return { type: "color", oklch: cssColor(value), hex: paint.alpha === 1 ? formatHex(paint) : formatHex8(paint) };
}

/** N1 roles with the cobalt hue filled in, plus the derived subtle wash. */
function n1Parts(mode) {
  const hue = brandsSrc.n1.hue;
  const spec = brandsSrc.n1[mode];
  const out = {};
  for (const [role, parts] of Object.entries(spec)) {
    out[role] = parts.length === 2 ? [parts[0], parts[1], hue] : parts;
  }
  out["accent-subtle"] = [spec.accent[0], spec.accent[1], hue, mode === "dark" ? 0.16 : 0.14];
  return out;
}

function brandSpec(name, mode) {
  return name === "n1" ? n1Parts(mode) : brandsSrc[name][mode];
}

function n1CssLines(mode) {
  const spec = brandsSrc.n1[mode];
  const hue = "var(--basalt-accent-h)";
  const lines = [`  --basalt-accent-h: ${brandsSrc.n1.hue};`];
  for (const role of ["accent", "accent-hover", "accent-pressed", "accent-text", "accent-counter"]) {
    const [l, c] = spec[role];
    lines.push(`  --basalt-${role}: oklch(${round(l, 4)} ${round(c, 4)} ${hue});`);
  }
  const alpha = mode === "dark" ? 0.16 : 0.14;
  lines.push(`  --basalt-accent-subtle: oklch(${round(spec.accent[0], 4)} ${round(spec.accent[1], 4)} ${hue} / ${alpha});`);
  for (const role of ["on-accent", "on-accent-counter"]) lines.push(`  --basalt-${role}: ${partsCss(spec[role])};`);
  return lines;
}

function staticCssLines(spec) {
  return Object.entries(spec).map(([role, parts]) => `  --basalt-${role}: ${partsCss(parts)};`);
}

function brandBlocks() {
  const names = Object.keys(brandsSrc).filter((k) => !k.startsWith("$"));
  const lines = ["", "/* Product accents. Set data-brand on the same element as the theme. N1's hue is", "   --basalt-accent-h (cobalt unless an app sets it). Focus and chart plan follow accent-text. */"];
  for (const name of names) {
    const lightLines = name === "n1" ? n1CssLines("light") : staticCssLines(brandSpec(name, "light"));
    const darkLines = name === "n1" ? n1CssLines("dark") : staticCssLines(brandSpec(name, "dark"));
    lines.push(
      `:root[data-brand="${name}"], [data-theme="light"][data-brand="${name}"], .light[data-brand="${name}"] {`,
      ...lightLines,
      "}",
      "",
      `[data-theme="dark"][data-brand="${name}"], .dark[data-brand="${name}"] {`,
      ...darkLines,
      "}",
      "",
    );
  }
  lines.push("@media (prefers-color-scheme: dark) {");
  for (const name of names) {
    const darkLines = (name === "n1" ? n1CssLines("dark") : staticCssLines(brandSpec(name, "dark"))).map((l) => `  ${l}`);
    lines.push(`  :root:not([data-theme="light"]):not(.light)[data-brand="${name}"] {`, ...darkLines, "  }", "");
  }
  lines.push("}", "");
  return lines;
}

const round = (n, digits) => Math.round(n * 10 ** digits) / 10 ** digits;

/** A DTCG colour value as a culori colour. */
export function toColor(value) {
  if (typeof value === "string") throw new Error(`unresolved colour ${value}`);
  if (value.colorSpace !== "oklch") throw new Error(`colour space ${value.colorSpace} is not used by Basalt`);
  const [l, c, h] = value.components;
  return { mode: "oklch", l, c, h, alpha: value.alpha ?? 1 };
}

function cssColor(value) {
  const { l, c, h, alpha } = toColor(value);
  const body = `${round(l, 4)} ${round(c, 4)} ${round(h ?? 0, 2)}`;
  return alpha === 1 ? `oklch(${body})` : `oklch(${body} / ${round(alpha, 4)})`;
}

const unit = (v) => (typeof v === "object" ? `${v.value}${v.unit}` : String(v));

function cssValue(token) {
  const v = token.$value;
  switch (token.$type) {
    case "color":
      return cssColor(v);
    case "dimension":
    case "duration":
      return unit(v);
    case "cubicBezier":
      return `cubic-bezier(${v.join(", ")})`;
    case "fontFamily":
      return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(", ");
    case "fontWeight":
    case "number":
      return String(v);
    case "shadow":
      return v
        .map((s) => [s.inset ? "inset" : "", unit(s.offsetX), unit(s.offsetY), unit(s.blur), unit(s.spread), cssColor(s.color)].filter(Boolean).join(" "))
        .join(", ");
    default:
      throw new Error(`no CSS form for $type ${token.$type} (${token.path.join(".")})`);
  }
}

/** color.surface.page -> --basalt-surface-page; space.0-5 -> --basalt-space-0-5 */
export const varName = (tokenPath) => `--${PREFIX}-${(tokenPath[0] === "color" ? tokenPath.slice(1) : tokenPath).join("-")}`;

/** A reference such as {color.neutral.98} as var(--basalt-neutral-98), so the CSS reads like the source. */
function cssReference(token) {
  const original = token.original.$value;
  if (typeof original === "string" && /^\{[^}]+\}$/.test(original)) return `var(${varName(original.slice(1, -1).split("."))})`;
  return null;
}

async function resolve(theme) {
  const sd = new StyleDictionary({
    source: [src("primitives.tokens.json"), src(`theme.${theme}.tokens.json`)],
    usesDtcg: true,
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: { basalt: {} },
  });
  const { allTokens } = await sd.getPlatformTokens("basalt");
  return allTokens;
}

const isThemed = (token) => token.filePath.includes("theme.");

const resolved = Object.fromEntries(await Promise.all(THEMES.map(async (t) => [t, await resolve(t)])));

// The two themes must define exactly the same semantic tokens.
const semanticNames = (t) => resolved[t].filter(isThemed).map((tok) => varName(tok.path)).sort();
const [lightNames, darkNames] = THEMES.map(semanticNames);
const missing = lightNames.filter((n) => !darkNames.includes(n)).concat(darkNames.filter((n) => !lightNames.includes(n)));
if (missing.length) throw new Error(`themes differ: ${missing.join(", ")}`);

const decl = (token, indent = "  ") => `${indent}${varName(token.path)}: ${cssReference(token) ?? cssValue(token)};`;
const primitives = resolved.light.filter((t) => !isThemed(t));
const themed = (t) => resolved[t].filter(isThemed);

const header = "/* Generated by packages/tokens/build.mjs from tokens/*.tokens.json. Do not edit. */\n";
const css = [
  header,
  ":root {",
  ...primitives.map((t) => decl(t)),
  "}",
  "",
  ':root, [data-theme="light"], .light {',
  "  color-scheme: light;",
  ...themed("light").map((t) => decl(t)),
  "}",
  "",
  '[data-theme="dark"], .dark {',
  "  color-scheme: dark;",
  ...themed("dark").map((t) => decl(t)),
  "}",
  "",
  "@media (prefers-color-scheme: dark) {",
  '  :root:not([data-theme="light"]):not(.light) {',
  "    color-scheme: dark;",
  ...themed("dark").map((t) => decl(t, "    ")),
  "  }",
  "}",
  "",
  ...brandBlocks(),
  "/* Reduced motion: no movement; state changes become short fades. Components remove their",
  "   transforms under the same query. */",
  "@media (prefers-reduced-motion: reduce) {",
  "  :root {",
  `    ${varName(["duration", "base"])}: 100ms;`,
  `    ${varName(["duration", "slow"])}: 100ms;`,
  `    ${varName(["duration", "slower"])}: 100ms;`,
  "  }",
  "}",
  "",
].join("\n");

// shadcn/ui's variable names, so its components and blocks pick up Basalt unchanged.
const SHADCN = {
  background: "surface-page", foreground: "text-primary",
  card: "surface-raised", "card-foreground": "text-primary",
  popover: "surface-overlay", "popover-foreground": "text-primary",
  primary: "action-primary", "primary-foreground": "action-primary-text",
  secondary: "surface-raised", "secondary-foreground": "text-primary",
  muted: "surface-sunken", "muted-foreground": "text-secondary",
  accent: "state-hover", "accent-foreground": "text-primary",
  destructive: "status-danger",
  border: "border-hairline", input: "border-input", ring: "border-focus",
  radius: "radius-md",
};
for (const target of Object.values(SHADCN)) {
  if (!lightNames.includes(`--${PREFIX}-${target}`) && !primitives.some((t) => varName(t.path) === `--${PREFIX}-${target}`)) throw new Error(`shadcn alias target --${PREFIX}-${target} does not exist`);
}
const shadcn = [header, "/* Load after tokens.css. */", ":root {", ...Object.entries(SHADCN).map(([k, v]) => `  --${k}: var(--${PREFIX}-${v});`), "}", ""].join("\n");

// Resolved values, for JavaScript and for native generators.
const entry = (token) => {
  if (token.$type === "color") {
    const c = toColor(token.$value);
    return { type: "color", oklch: cssColor(token.$value), hex: c.alpha === 1 ? formatHex(c) : formatHex8(c) };
  }
  return { type: token.$type, css: cssValue(token) };
};
const brandNames = Object.keys(brandsSrc).filter((k) => !k.startsWith("$"));
const brandJson = Object.fromEntries(brandNames.map((name) => {
  const themes = Object.fromEntries(THEMES.map((mode) => [mode, Object.fromEntries(Object.entries(brandSpec(name, mode)).map(([role, parts]) => [role, colorEntry(parts)]))]));
  if (name !== "n1") return [name, themes];
  const parametric = {
    hue: brandsSrc.n1.hue,
    ...Object.fromEntries(THEMES.map((mode) => [mode, Object.fromEntries(Object.entries(brandsSrc.n1[mode]).filter(([, parts]) => parts.length === 2).map(([role, parts]) => [role, { l: parts[0], c: parts[1] }]))])),
  };
  return [name, { ...themes, parametric }];
}));
const json = {
  primitives: Object.fromEntries(primitives.map((t) => [varName(t.path).slice(PREFIX.length + 3), entry(t)])),
  ...Object.fromEntries(THEMES.map((th) => [th, Object.fromEntries(themed(th).map((t) => [varName(t.path).slice(PREFIX.length + 3), entry(t)]))])),
  brands: brandJson,
};

const write = (rel, text) => {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
write("css/tokens.css", css);
write("css/shadcn.css", shadcn);
write("json/tokens.json", JSON.stringify(json, null, 2) + "\n");
write("js/tokens.js", `${header}export const tokens = ${JSON.stringify(json, null, 2)};\nexport default tokens;\n`);
const brandRoles = Object.keys(brandJson.sra.light);
const brandField = (name, value) => `    ${JSON.stringify(name)}: ${value.type === "color" ? "ColorToken" : `ValueToken<${JSON.stringify(value.type)}>`};`;
const themeScopes = Object.entries(json).filter(([scope]) => scope !== "brands");
write(
  "js/tokens.d.ts",
  `${header}export interface ColorToken { type: "color"; oklch: string; hex: string }\nexport interface ValueToken<Type extends string = string> { type: Type; css: string }\nexport interface BrandTheme {\n${brandRoles.map((role) => `  ${JSON.stringify(role)}: ColorToken;`).join("\n")}\n  "surface-brand"?: ColorToken;\n}\nexport interface N1Parametric {\n  hue: number;\n  light: { accent: { l: number; c: number }; "accent-hover": { l: number; c: number }; "accent-pressed": { l: number; c: number }; "accent-text": { l: number; c: number }; "accent-counter": { l: number; c: number } };\n  dark: { accent: { l: number; c: number }; "accent-hover": { l: number; c: number }; "accent-pressed": { l: number; c: number }; "accent-text": { l: number; c: number }; "accent-counter": { l: number; c: number } };\n}\nexport declare const tokens: {\n${themeScopes.map(([scope, entries]) => `  ${scope}: {\n${Object.entries(entries).map(([name, value]) => brandField(name, value)).join("\n")}\n  };`).join("\n")}\n  brands: {\n${brandNames.map((name) => `    ${name}: { light: BrandTheme; dark: BrandTheme }${name === "n1" ? " & { parametric: N1Parametric }" : ""};`).join("\n")}\n  };\n};\nexport default tokens;\n`,
);
// ---- Swift: the tokens for the Apple apps, committed so SwiftPM can consume the repository.

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const num = (n) => {
  const r = Math.round(n * 1e6) / 1e6;
  return Number.isInteger(r) ? `${r}` : `${r}`;
};
const swiftRGBA = (value) => {
  const c = rgb(toColor(value));
  return `RGBA(red: ${num(c.r)}, green: ${num(c.g)}, blue: ${num(c.b)}, alpha: ${num(c.alpha ?? 1)})`;
};
const doc = (token, indent) => {
  const d = token.original.$description;
  return d ? `${indent}/// ${d}\n` : "";
};
const px = (token) => token.$value.value;
const byPrefix = (prefix) => primitives.filter((t) => t.path[0] === prefix);
const swiftColors = themed("light")
  .filter((t) => t.$type === "color")
  .map((t) => {
    const dark = resolved.dark.find((d) => d.path.join(".") === t.path.join("."));
    return `${doc(t, "    ")}    public static let ${camel(t.path.slice(1).join("-"))} = ThemedColor(\n      light: ${swiftRGBA(t.$value)},\n      dark: ${swiftRGBA(dark.$value)}\n    )`;
  });
const swiftFromParts = (parts) => {
  const [l, c, h, alpha] = parts;
  const value = { colorSpace: "oklch", components: [l, c, h ?? 0] };
  if (alpha != null) value.alpha = alpha;
  return swiftRGBA(value);
};
const BRAND_ROLES = ["accent", "accent-hover", "accent-pressed", "accent-text", "on-accent", "accent-subtle", "accent-counter", "on-accent-counter"];
const swiftRole = (name, role) => `ThemedColor(\n        light: ${swiftFromParts(brandSpec(name, "light")[role])},\n        dark: ${swiftFromParts(brandSpec(name, "dark")[role])}\n      )`;
const swiftBrand = (name) => {
  const fields = BRAND_ROLES.map((role) => `      ${camel(role)}: ${swiftRole(name, role)}`);
  const surface = brandSpec(name, "light")["surface-brand"]
    ? `      surfaceBrand: ThemedColor(\n        light: ${swiftFromParts(brandSpec(name, "light")["surface-brand"])},\n        dark: ${swiftFromParts(brandSpec(name, "dark")["surface-brand"])}\n      )`
    : `      surfaceBrand: Colors.surfacePage`;
  return `    public static let ${name === "n1" ? "n1" : camel(name)} = BrandAccent(\n${fields.concat(surface).join(",\n")}\n    )`;
};
const n1Channels = ["light", "dark"].flatMap((mode) =>
  Object.entries(brandsSrc.n1[mode])
    .filter(([, parts]) => parts.length === 2)
    .flatMap(([role, parts]) => {
      const prop = camel(role);
      const name = `${mode}${prop[0].toUpperCase()}${prop.slice(1)}`;
      return [`    public static let ${name}L: Double = ${parts[0]}`, `    public static let ${name}C: Double = ${parts[1]}`];
    }),
);
const ident = (k) => (/^\d/.test(k) ? `s${k.replace("-", "_")}` : camel(k));
const textSteps = [...new Set(byPrefix("text").map((t) => t.path[1]))];
const stepName = (k) => ({ "2xl": "xl2", "3xl": "xl3", "4xl": "xl4", "5xl": "xl5" })[k] ?? k;
const swift = `// Generated by packages/tokens/build.mjs from tokens/*.tokens.json. Do not edit.

import Foundation

/// Basalt's design tokens. Colours follow the light and dark themes; every other value is in
/// points (sizes), seconds (durations) or em (tracking).
public enum Basalt {}

extension Basalt {
  /// An sRGB colour. Every Basalt colour is inside sRGB, so it looks the same on every display.
  public struct RGBA: Sendable, Equatable {
    public let red: Double
    public let green: Double
    public let blue: Double
    public let alpha: Double
  }

  /// A colour with a value per theme.
  public struct ThemedColor: Sendable, Equatable {
    public let light: RGBA
    public let dark: RGBA
  }

  /// Semantic colours. Use these, never raw values.
  public enum Colors {
${swiftColors.join("\n\n")}
  }

  /// One product's accent. \`surfaceBrand\` is the page, except Blacksand's flat backlight.
  public struct BrandAccent: Sendable, Equatable {
    public let accent: ThemedColor
    public let accentHover: ThemedColor
    public let accentPressed: ThemedColor
    public let accentText: ThemedColor
    public let onAccent: ThemedColor
    public let accentSubtle: ThemedColor
    public let accentCounter: ThemedColor
    public let onAccentCounter: ThemedColor
    public let surfaceBrand: ThemedColor
  }

  /// Product accents. The default mineral accent also lives on \`Colors\`.
  public enum Brands {
    public static let basalt = BrandAccent(
      accent: Colors.accent,
      accentHover: Colors.accentHover,
      accentPressed: Colors.accentPressed,
      accentText: Colors.accentText,
      onAccent: Colors.onAccent,
      accentSubtle: Colors.accentSubtle,
      accentCounter: Colors.accentCounter,
      onAccentCounter: Colors.onAccentCounter,
      surfaceBrand: Colors.surfaceBrand
    )

${brandNames.map(swiftBrand).join("\n\n")}
  }

  /// N1's fixed-lightness accent. \`color\` is any hue at the lightness and chroma of a role.
  /// The web equivalent is \`--basalt-accent-h\`.
  public enum N1 {
    public static let cobaltHue: Double = ${brandsSrc.n1.hue}
${n1Channels.join("\n")}

    /// OKLCH to sRGB, matching the CSS and the generated brand colours for in-gamut values.
    public static func color(lightness l: Double, chroma c: Double, hue h: Double) -> RGBA {
      let rad = h * .pi / 180
      let a = c * cos(rad)
      let b = c * sin(rad)
      let l_ = l + 0.3963377774 * a + 0.2158037573 * b
      let m_ = l - 0.1055613458 * a - 0.0638541728 * b
      let s_ = l - 0.0894841775 * a - 1.2914855480 * b
      let l3 = l_ * l_ * l_
      let m3 = m_ * m_ * m_
      let s3 = s_ * s_ * s_
      func encode(_ x: Double) -> Double {
        let v = min(1, max(0, x))
        return v <= 0.0031308 ? 12.92 * v : 1.055 * pow(v, 1 / 2.4) - 0.055
      }
      let red = encode(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3)
      let green = encode(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3)
      let blue = encode(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3)
      return RGBA(red: red, green: green, blue: blue, alpha: 1)
    }
  }

  /// Spacing on a 4pt base: \`s4\` is 16.
  public enum Space {
${byPrefix("space").map((t) => `    public static let ${ident(t.path[1])}: Double = ${px(t)}`).join("\n")}
  }

  public enum Radius {
${byPrefix("radius").map((t) => `    public static let ${t.path[1]}: Double = ${px(t)}`).join("\n")}
  }

  public enum Size {
${byPrefix("size").map((t) => `${doc(t, "    ")}    public static let ${camel(t.path.slice(1).join("-"))}: Double = ${px(t)}`).join("\n")}
  }

  /// A step of the type scale: size and line height in points, tracking in em.
  public struct TypeStyle: Sendable, Equatable {
    public let size: Double
    public let lineHeight: Double
    public let tracking: Double
  }

  public enum TypeScale {
${textSteps
  .map((k) => {
    const v = (part) => primitives.find((t) => t.path.join(".") === `text.${k}.${part}`).$value.value;
    return `    public static let ${stepName(k)} = TypeStyle(size: ${v("size")}, lineHeight: ${v("line-height")}, tracking: ${v("tracking")})`;
  })
  .join("\n")}
  }

  /// Geist's three weights. In-between weights render differently on native, so Basalt uses whole steps.
  public enum Weight: Int, Sendable, CaseIterable {
${byPrefix("font").filter((t) => t.path[1] === "weight").map((t) => `    case ${t.path[2]} = ${t.$value}`).join("\n")}
  }

  /// Tracking in em. Label is the uppercase mono eyebrow; it is not a smaller size.
  public enum Tracking {
${byPrefix("font").filter((t) => t.path[1] === "tracking").map((t) => `    public static let ${camel(t.path[2])}: Double = ${t.$value.value}`).join("\n")}
  }

  /// Durations in seconds. Exits run at 0.75 of their entry.
  public enum Duration {
${byPrefix("duration").map((t) => `    public static let ${t.path[1]}: Double = ${t.$value.value / 1000}`).join("\n")}
  }

  /// A cubic Bézier timing curve.
  public struct Curve: Sendable, Equatable {
    public let x1: Double
    public let y1: Double
    public let x2: Double
    public let y2: Double
  }

  /// Timing curves. None overshoots.
  public enum Easing {
${byPrefix("ease").map((t) => `    public static let ${t.path[1] === "in" ? "`in`" : camel(t.path[1])} = Curve(x1: ${t.$value[0]}, y1: ${t.$value[1]}, x2: ${t.$value[2]}, y2: ${t.$value[3]})`).join("\n")}
  }
}
`;
const swiftOut = path.join(here, "..", "..", "Sources", "BasaltTokens", "Tokens.swift");
fs.mkdirSync(path.dirname(swiftOut), { recursive: true });
fs.writeFileSync(swiftOut, swift);

console.log(`basalt tokens: ${primitives.length} primitives, ${lightNames.length} semantic per theme`);
