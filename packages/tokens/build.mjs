// Builds the Basalt tokens from the DTCG source in tokens/:
//
//   dist/css/tokens.css   every token as a --basalt-* custom property; light by default,
//                         dark under [data-theme="dark"] / .dark, and with the OS
//                         preference when the page sets neither
//   dist/css/accents.css  the accent classes: one [data-accent] rule per class, in @layer basalt
//   dist/css/shadcn.css   the shadcn/ui variable names, mapped onto Basalt's
//   dist/css/breakpoints.css  the breakpoints as @custom-media rules, for apps that build with PostCSS
//   dist/js/tokens.js     resolved values per theme, and the accent classes, for TypeScript and charts
//   dist/js/breakpoints.js the breakpoint numbers alone (the 720, 1024, 480, 340 and 640 of the media and container queries)
//   dist/js/durations.js   the duration numbers alone, in milliseconds (a confirmation's hold)
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

// A letter-spacing step (text.<step>.tracking) is a plain number in the source: DTCG's dimension has only px and rem, and tracking is in em, a size that
// follows the text. The build writes the em, and every output still calls the token a dimension.
const isTracking = (token) => token.path[0] === "text" && token.path.at(-1) === "tracking";

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
      return String(v);
    case "number":
      return isTracking(token) ? `${v}em` : String(v);
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
const themedAll = (t) => resolved[t].filter(isThemed);

// An accent class is a theme token at color.accent.<name>, with a value in each theme. It is not a custom property of its own:
// the class rule writes both themes into one light-dark() value, so a theme nested inside an accent root still gets its own.
const isAccent = (token) => token.path[0] === "color" && token.path[1] === "accent";
const themed = (t) => themedAll(t).filter((token) => !isAccent(token));
const accentClasses = themedAll("light").filter(isAccent).map((token) => ({
  name: token.path[2],
  description: token.original.$description,
  light: token.$value,
  dark: resolved.dark.find((d) => d.path.join(".") === token.path.join(".")).$value,
}));

for (const { name } of accentClasses) {
  if (!/^[a-z]+$/.test(name) || name === "none") throw new Error(`accent class "${name}" must be lowercase letters, and "none" is reserved for no accent`);
}

/** What each alias replaces when a person asks for more contrast: the semantic token, and the alias that stands in for it. */
const MORE_CONTRAST = {
  "border-hairline": "line-contrast",
  "border-rim": "line-contrast",
  "border-rim-top": "line-contrast",
  "border-divider": "line-contrast",
  "text-tertiary": "ink-contrast",
  "border-field": "field-contrast",
  // A hovered edge is never fainter than the edge at rest (decision 145): it steps to secondary ink, a colour the theme already has.
  "border-hover": "text-secondary",
  // A diagram's focal table draws its header rule as the other theme's input boundary (DECISIONS 269, 1.18).
  "diagram-focal-rule": "diagram-focal-rule-contrast",
};
for (const [token, alias] of Object.entries(MORE_CONTRAST)) {
  for (const name of [token, alias]) if (!lightNames.includes(`--${PREFIX}-${name}`)) throw new Error(`more contrast: --${PREFIX}-${name} does not exist`);
}
const MORE_CONTRAST_SELECTORS = [":root", '[data-theme="light"]', '[data-theme="dark"]', ".light", ".dark", ':root:not([data-theme="light"]):not(.light)'].join(", ");

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
  "/* More contrast (decisions 138 and 139, part D). A person who asks for it (prefers-contrast: more) gets three aliases and no new",
  "   colour: lines (the hairline, the divider, the rim and the pill's hairline) are drawn in the input boundary's value, and tertiary ink,",
  "   a hovered edge (decision 145) and a field's boundary as secondary. The same declarations are made on every selector that sets a theme, after all of",
  "   them and at the system-dark rule's own specificity, so they win in both themes and under a theme chosen with data-theme. A var()",
  "   is substituted where it is declared, so each alias reads the theme of the element it is on. */",
  "@media (prefers-contrast: more) {",
  `  ${MORE_CONTRAST_SELECTORS} {`,
  ...Object.entries(MORE_CONTRAST).map(([token, alias]) => `    ${varName(["color", token])}: var(${varName(["color", alias])});`),
  `    ${varName(["shadow", "hairline"])}: 0px 0px 0px 1px var(${varName(["color", "line-contrast"])}), 0px 0px 0px 1px var(${varName(["color", "surface-0"])});`,
  "  }",
  "}",
  "",
  "/* Reduced motion: no movement; state changes become short fades. Components remove their",
  "   transforms under the same query. */",
  "@media (prefers-reduced-motion: reduce) {",
  "  :root {",
  `    ${varName(["duration", "base"])}: 100ms;`,
  `    ${varName(["duration", "slow"])}: 100ms;`,
  `    ${varName(["duration", "slower"])}: 100ms;`,
  `    ${varName(["duration", "figure"])}: 100ms;`,
  `    ${varName(["duration", "stagger"])}: 0ms;`,
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
// A var() is substituted where it is declared, so the aliases are declared again on every selector that sets a theme: a theme nested
// below the root then resolves them against its own tokens. At the root the output is the same as before.
const shadcn = [header, "/* Load after tokens.css. */", ':root, [data-theme="light"], [data-theme="dark"], .light, .dark {', ...Object.entries(SHADCN).map(([k, v]) => `  --${k}: var(--${PREFIX}-${v});`), "}", ""].join("\n");

// The accent classes. A product sets one with data-accent on its root, or none; the rule writes --basalt-accent-ink as a light-dark()
// pair, so each element picks its own theme's value and a nested theme root needs no restating. Behind @supports, a browser without
// light-dark() never defines the variable and the reader's fallback gives the ink dot. "none" and any unknown name reset it
// (initial is the guaranteed-invalid value, so var(--basalt-accent-ink, <ink>) falls back to the ink). The property stays unregistered.
const ACCENT_VAR = `--${PREFIX}-accent-ink`;
const known = accentClasses.map((c) => `:not([data-accent="${c.name}"])`).join("");
const accents = [
  header,
  `/* Load with the components. One accent class a product, or none; ${ACCENT_VAR} is read only by Badge's accent tone. */`,
  "@layer basalt {",
  "  @supports (color: light-dark(white, black)) {",
  ...accentClasses.map((c) => `    [data-accent="${c.name}"] { ${ACCENT_VAR}: light-dark(${cssColor(c.light)}, ${cssColor(c.dark)}); }`),
  "  }",
  `  [data-accent="none"], [data-accent]${known} { ${ACCENT_VAR}: initial; }`,
  "}",
  "",
].join("\n");

// Resolved values, for JavaScript and for native generators.
const entry = (token) => {
  if (token.$type === "color") {
    const c = toColor(token.$value);
    return { type: "color", oklch: cssColor(token.$value), hex: c.alpha === 1 ? formatHex(c) : formatHex8(c) };
  }
  return { type: isTracking(token) ? "dimension" : token.$type, css: cssValue(token) };
};
const json = {
  primitives: Object.fromEntries(primitives.map((t) => [varName(t.path).slice(PREFIX.length + 3), entry(t)])),
  ...Object.fromEntries(THEMES.map((th) => [th, Object.fromEntries(themedAll(th).map((t) => [varName(t.path).slice(PREFIX.length + 3), entry(t)]))])),
};

const write = (rel, text) => {
  const file = path.join(dist, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
write("css/tokens.css", css);
write("css/shadcn.css", shadcn);

// The breakpoints. A media query cannot read a custom property, so CSS writes the number (range syntax, with a lint exception that
// names the token); apps that build with PostCSS can use these named queries from the same source instead, and a script reads the numbers.
// The key is the token's name after `size-breakpoint-`, in camelCase: `container-sm` is `containerSm`.
const BREAKPOINTS = ["md", "lg", "container", "container-sm", "container-lg"];
const breakpointKey = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const breakpointPx = Object.fromEntries(BREAKPOINTS.map((name) => {
  const token = primitives.find((t) => t.path.join(".") === `size.breakpoint-${name}`);
  if (!token || token.$value.unit !== "px") throw new Error(`size-breakpoint-${name} must be a px token`);
  return [breakpointKey(name), token.$value.value];
}));
// The durations, in milliseconds, for a script that holds a timer (a confirmation's hold) so it never carries the number. Every
// `duration` token with a name of its own (the loops are groups) is here; a duration must be in ms for the number to be a count of them.
const durationMs = Object.fromEntries(primitives.filter((t) => t.path[0] === "duration" && t.path.length === 2).map((t) => {
  if (t.$value.unit !== "ms") throw new Error(`duration-${t.path[1]} must be a ms token`);
  return [t.path[1], t.$value.value];
}));
const breakpointsCss = [
  header,
  "/* Named media queries for apps that build with PostCSS (postcss-custom-media). Basalt's own CSS writes range syntax directly. */",
  `@custom-media --${PREFIX}-phone (width < ${breakpointPx.md}px);`,
  `@custom-media --${PREFIX}-md (width >= ${breakpointPx.md}px);`,
  `@custom-media --${PREFIX}-lg (width >= ${breakpointPx.lg}px);`,
  `@custom-media --${PREFIX}-rail (${breakpointPx.md}px <= width < ${breakpointPx.lg}px);`,
  "",
].join("\n");
write("css/breakpoints.css", breakpointsCss);
write("css/accents.css", accents);
write("json/tokens.json", JSON.stringify(json, null, 2) + "\n");
const accentsJson = Object.fromEntries(accentClasses.map((c) => [c.name, { light: entry({ $type: "color", $value: c.light }), dark: entry({ $type: "color", $value: c.dark }) }]));
write("js/tokens.js", `${header}export const tokens = ${JSON.stringify(json, null, 2)};\nexport const accents = ${JSON.stringify(accentsJson, null, 2)};\n/** The breakpoints in CSS pixels, so a script never carries the number: matchMedia(\`(width >= \${breakpoint.md}px)\`). */\nexport const breakpoint = ${JSON.stringify(breakpointPx, null, 2)};\n/** The durations in milliseconds, so a script that holds a timer never carries the number: setTimeout(done, duration.confirm). */\nexport const duration = ${JSON.stringify(durationMs, null, 2)};\nexport default tokens;\n`);
// The breakpoints alone, so a component or a page script can import them without the whole token table.
write("js/breakpoints.js", `${header}/** The breakpoints in CSS pixels, so a script never carries the number: matchMedia(\`(width >= \${breakpoint.md}px)\`). */\nexport const breakpoint = ${JSON.stringify(breakpointPx, null, 2)};\n`);
// The durations alone, for the same reason.
// Each also as a constant of its own (`durationConfirm`), so a bundler that keeps one drops the rest: a property of an object is not known to be free of side effects.
const durationConst = (name) => `duration${name[0].toUpperCase()}${name.slice(1)}`;
write("js/durations.js", `${header}${Object.entries(durationMs).map(([n, ms]) => `/** The \`duration-${n}\` token in milliseconds. */\nexport const ${durationConst(n)} = ${ms};`).join("\n")}\n/** The durations in milliseconds, so a script that holds a timer never carries the number: setTimeout(done, duration.confirm). */\nexport const duration = { ${Object.keys(durationMs).map((n) => `${JSON.stringify(n)}: ${durationConst(n)}`).join(", ")} };\n`);
write("js/durations.d.ts", `${header}${Object.entries(durationMs).map(([n, ms]) => `export declare const ${durationConst(n)}: ${ms};`).join("\n")}\nexport declare const duration: { ${Object.entries(durationMs).map(([n, ms]) => `readonly ${n}: ${ms}`).join("; ")} };\n`);
write("js/breakpoints.d.ts", `${header}export declare const breakpoint: { ${Object.entries(breakpointPx).map(([n, px]) => `readonly ${n}: ${px}`).join("; ")} };\n`);
write(
  "js/tokens.d.ts",
  `${header}export interface ColorToken { type: "color"; oklch: string; hex: string }\nexport interface ValueToken<Type extends string = string> { type: Type; css: string }\nexport type AccentClass = ${accentClasses.map((c) => JSON.stringify(c.name)).join(" | ")};\nexport interface AccentColors { light: ColorToken; dark: ColorToken }\nexport declare const accents: Record<AccentClass, AccentColors>;\nexport declare const breakpoint: { ${Object.entries(breakpointPx).map(([n, px]) => `readonly ${n}: ${px}`).join("; ")} };\nexport declare const duration: { ${Object.entries(durationMs).map(([n, ms]) => `readonly ${n}: ${ms}`).join("; ")} };\nexport declare const tokens: {\n${Object.entries(json).map(([scope, entries]) => `  ${scope}: {\n${Object.entries(entries).map(([name, value]) => `    ${JSON.stringify(name)}: ${value.type === "color" ? "ColorToken" : `ValueToken<${JSON.stringify(value.type)}>`};`).join("\n")}\n  };`).join("\n")}\n};\nexport default tokens;\n`,
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
/** A length in Swift points. A rem is resolved at 16 points to the rem, the same 16px the web's root size starts from. */
const REM = 16;
const isRem = (token) => token.$value.unit === "rem";
const px = (token) => (isRem(token) ? token.$value.value * REM : token.$value.value);
const doc = (token, indent) => {
  const d = token.original.$description;
  const rem = isRem(token) ? `Written ${token.$value.value}rem; resolved here at ${REM} points to the rem (${px(token)}).` : "";
  return d || rem ? `${indent}/// ${[d, rem].filter(Boolean).join(" ")}\n` : "";
};
const byPrefix = (prefix) => primitives.filter((t) => t.path[0] === prefix);
const swiftColors = themed("light")
  .filter((t) => t.$type === "color")
  .map((t) => {
    const dark = resolved.dark.find((d) => d.path.join(".") === t.path.join("."));
    return `${doc(t, "    ")}    public static let ${camel(t.path.slice(1).join("-"))} = ThemedColor(\n      light: ${swiftRGBA(t.$value)},\n      dark: ${swiftRGBA(dark.$value)}\n    )`;
  });
const ident = (k) => (/^\d/.test(k) ? `s${k.replace("-", "_")}` : camel(k));
const textSteps = [...new Set(byPrefix("text").map((t) => t.path[1]))];
const stepName = (k) => ({ "2xs": "xs2", "2xl": "xl2", "3xl": "xl3", "4xl": "xl4", "5xl": "xl5", "6xl": "xl6", "7xl": "xl7" })[k] ?? camel(k);
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

  /// An accent class: the one colour a product adds, for its council-approved role (N1: "needs you"), painted as a dot or icon
  /// beside ink words. Never a fill, wash, border, link, focus ring, selection, checked control or status.
  public enum AccentClass: String, Sendable, CaseIterable {
${accentClasses.map((c) => `${c.description ? `    /// ${c.description}\n` : ""}    case ${c.name}`).join("\n")}

    /// The class's colour in each theme.
    public var color: ThemedColor {
      switch self {
${accentClasses.map((c) => `      case .${c.name}:\n        return ThemedColor(\n          light: ${swiftRGBA(c.light)},\n          dark: ${swiftRGBA(c.dark)}\n        )`).join("\n")}
      }
    }
  }

  /// Spacing on a 4pt base: \`s4\` is 16.
  public enum Space {
${byPrefix("space").map((t) => `    public static let ${ident(t.path[1])}: Double = ${px(t)}`).join("\n")}
  }

  public enum Radius {
${byPrefix("radius").map((t) => `    public static let ${stepName(t.path[1])}: Double = ${px(t)}`).join("\n")}
  }

  /// Backdrop blur radii in points. Use the header blur once per screen: translucent layers never stack.
  public enum Blur {
${byPrefix("blur").map((t) => `${doc(t, "    ")}    public static let ${camel(t.path.slice(1).join("-"))}: Double = ${px(t)}`).join("\n")}
  }

  public enum Size {
${byPrefix("size").map((t) => `${doc(t, "    ")}    public static let ${camel(t.path.slice(1).join("-"))}: Double = ${px(t)}`).join("\n")}
  }

  /// Aspect ratios, width over height: the four a framed picture takes. \`photo\` is the default.
  public enum Aspect {
${byPrefix("aspect").map((t) => `${doc(t, "    ")}    public static let ${t.path[1]}: Double = ${t.$value}`).join("\n")}
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
    const v = (part) => {
      const value = primitives.find((t) => t.path.join(".") === `text.${k}.${part}`).$value;
      return typeof value === "object" ? value.value : value; // tracking is a number; the size and the line height are { value, unit }
    };
    return `    public static let ${stepName(k)} = TypeStyle(size: ${v("size")}, lineHeight: ${v("line-height")}, tracking: ${v("tracking")})`;
  })
  .join("\n")}
  }

  /// Geist's three weights. In-between weights render differently on native, so Basalt uses whole steps.
  public enum Weight: Int, Sendable, CaseIterable {
${byPrefix("font").filter((t) => t.path[1] === "weight").map((t) => `    case ${t.path[2]} = ${t.$value}`).join("\n")}
  }

  /// Durations in seconds. Exits run at 0.75 of their entry.
  public enum Duration {
${byPrefix("duration").filter((t) => t.path.length === 2).map((t) => `    public static let ${t.path[1]}: Double = ${t.$value.value / 1000}`).join("\n")}
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
${byPrefix("ease").filter((t) => t.path[1] !== "linear").map((t) => `    public static let ${t.path[1] === "in" ? "`in`" : camel(t.path[1])} = Curve(x1: ${t.$value[0]}, y1: ${t.$value[1]}, x2: ${t.$value[2]}, y2: ${t.$value[3]})`).join("\n")}
  }
}
`;
const swiftOut = path.join(here, "..", "..", "Sources", "BasaltTokens", "Tokens.swift");
fs.mkdirSync(path.dirname(swiftOut), { recursive: true });
fs.writeFileSync(swiftOut, swift);

console.log(`basalt tokens: ${primitives.length} primitives, ${lightNames.length} semantic per theme`);
