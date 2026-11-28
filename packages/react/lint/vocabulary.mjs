// What the consumer lint knows about the Basalt it runs beside: the installed release's components and their props (dist/lint-manifest.json, written
// at build time by lint/manifest.mjs from the package's own exports and declarations) and the installed token release. Nothing is copied into the
// lint and no parser is needed to read either, so the CLI and the shareable Stylelint config give the same answers, and a fix-it message names only a
// component, prop or token the app can use today.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The installed Basalt: { components: Map<name, { props:Set<string>, valuesOf(prop): string[] }>, tokens, has(name) }.
 * @param {string} [root] the `@srasyndicate/basalt` package directory (the one this file ships in, by default)
 */
export function loadVocabulary(root = pkgRoot) {
  const file = path.join(root, "dist", "lint-manifest.json");
  if (!fs.existsSync(file)) throw new Error(`basalt-lint: ${path.relative(process.cwd(), file) || file} is missing; build or install @srasyndicate/basalt first`);
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const components = new Map();
  for (const [name, c] of Object.entries(manifest.components)) components.set(name, { props: new Set(c.props), valuesOf: (prop) => c.values[prop] ?? [] });
  return { root, components, has: (name) => components.has(name), tokens: loadTokens(root) };
}

/** The installed token release: { names:Set, primitives: Map<name, css>, roles: { dark: Map<name, hex>, light: Map<name, hex> } }. */
function loadTokens(root) {
  const require = createRequire(path.join(root, "package.json"));
  let json;
  let css = "";
  try {
    json = JSON.parse(fs.readFileSync(require.resolve("@srasyndicate/basalt-tokens/tokens.json"), "utf8"));
    css = fs.readFileSync(require.resolve("@srasyndicate/basalt-tokens/tokens.css"), "utf8");
  } catch {
    return { names: new Set(), primitives: new Map(), roles: { dark: new Map(), light: new Map() }, missing: true };
  }
  const names = new Set([...css.matchAll(/--basalt-([\w-]+)\s*:/g)].map((m) => m[1]));
  const primitives = new Map();
  for (const [name, t] of Object.entries(json.primitives ?? {})) if (names.has(name) && t.css) primitives.set(name, t.css);
  const roles = { dark: new Map(), light: new Map() };
  for (const theme of ["dark", "light"]) for (const [name, t] of Object.entries(json[theme] ?? {})) if (names.has(name) && t.hex) roles[theme].set(name, t.hex.toLowerCase());
  return { names, primitives, roles, primitiveHex: new Map(Object.entries(json.primitives ?? {}).filter(([, t]) => t.hex).map(([n, t]) => [n, t.hex.toLowerCase()])) };
}

/** A length or time in one unit (px or ms) to compare against the tokens; null for a unit with no fixed size here (em, the viewport units). */
function toBase(number, unit) {
  switch (unit) {
    case "px": return number;
    case "rem": return number * 16;
    case "ms": return number;
    case "s": return number * 1000;
    default: return null;
  }
}

/** Which token family answers a property, by role. */
function familyFor(property, kind) {
  // A custom property's name says its role (`--app-gap`, `--basalt-radius-md`).
  const p = property.startsWith("--")
    ? /radius/.test(property) ? "border-radius" : /duration|delay/.test(property) ? "transition-duration" : /space|gap|pad|margin|inset|gutter/.test(property) ? "gap" : /size|width|height/.test(property) ? "width" : /text|font/.test(property) ? "font-size" : ""
    : property.replace(/^-(webkit|moz|ms)-/, "");
  if (kind === "time") return { label: "a duration", match: (n) => /^duration-(instant|fast|base|slow|slower|confirm|figure|stagger)$/.test(n) };
  if (kind === "media") return { label: "a breakpoint", match: (n) => /^size-breakpoint/.test(n) };
  if (/radius/.test(p)) return { label: "a radius (by the size the box is drawn at)", match: (n) => /^radius-/.test(n) };
  if (p === "font-size" || p === "font") return { label: "a type step", match: (n) => /^text-[\w-]+-size$/.test(n) };
  if (p === "line-height") return { label: "a type step's line height", match: (n) => /^text-[\w-]+-line-height$/.test(n) };
  if (p === "letter-spacing") return { label: "a type step's tracking", match: (n) => /^text-[\w-]+-tracking$/.test(n) };
  if (/^(border|outline)(-[\w-]+)?-width$|^(border|outline)(-(top|right|bottom|left|block|inline)(-(start|end))?)?$|^outline-offset$|^text-underline-offset$|^stroke-width$/.test(p)) {
    return { label: "a line width", match: (n) => /^size-(hairline|focus-width|focus-offset|underline-offset|indicator|chart-line)$/.test(n) };
  }
  if (/^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left|scroll-margin|scroll-padding)/.test(p)) return { label: "a space step", match: (n) => /^space-/.test(n) };
  if (/^(width|height|min-|max-|inline-size|block-size|flex-basis)/.test(p)) return { label: "a size", match: (n) => /^(size|space)-/.test(n) && !/breakpoint/.test(n) };
  if (/filter$/.test(p)) return { label: "the chrome blur", match: (n) => /^blur-/.test(n) };
  return { label: "a space step or size", match: (n) => /^(space|size)-/.test(n) && !/breakpoint/.test(n) };
}

/** The colour roles a property takes, most used first. */
function colourRoles(property) {
  const p = property.replace(/^-(webkit|moz|ms)-/, "");
  const family = (label, names) => ({ label, names, match: (n) => names.includes(n) });
  if (/^(background|background-color)$/.test(p) || /surface|background|\bbg\b/.test(p)) return family("a surface or state", ["surface-page", "surface-raised", "surface-overlay", "surface-sunken", "state-hover", "plate"]);
  if (/^(border|outline)/.test(p) || /border|rim|divider|line/.test(p)) return family("a border", ["border-rim", "border-divider", "border-input", "border-hover", "border-focus"]);
  if (/shadow/.test(p)) return family("a shadow (only for what floats)", ["shadow-overlay", "shadow-modal"]);
  if (/^(fill|stroke|stop-color|flood-color|lighting-color)$/.test(p)) return family("an ink", ["text-primary", "text-secondary", "text-tertiary"]);
  return family("an ink", ["text-primary", "text-secondary", "text-tertiary", "text-disabled", "status-danger", "status-success", "status-warning"]);
}

/**
 * The fix-it fragment for one raw value: the token by role from the installed release.
 * @param {{ names:Set<string>, primitives:Map<string,string>, roles:{dark:Map,light:Map}, primitiveHex?:Map }} tokens
 * @param {string} property kebab-case ("" when unknown)
 * @param {{ kind: string, text: string, number?: number, unit?: string }} raw
 */
export function suggest(tokens, property, raw) {
  const v = (name) => `var(--basalt-${name})`;
  if (tokens.missing) return "use a --basalt-* token (the token package was not found, so none is named)";
  if (raw.kind === "colour") {
    // A mask reads only alpha, so its colour is no role: Basalt's own masks write the opaque stop as the black primitive.
    if (/^(-webkit-)?mask/.test(property) && tokens.names.has("neutral-0")) return `a mask reads only alpha: write its opaque stop as ${v("neutral-0")}, as Basalt's own masks do`;
    const roles = colourRoles(property);
    const hex = raw.text.startsWith("#") ? normaliseHex(raw.text) : null;
    if (hex) {
      const same = [];
      for (const theme of ["dark", "light"]) for (const [name, h] of tokens.roles[theme]) if (h === hex && roles.match(name)) same.push(`${v(name)} (${hex} in ${theme})`);
      if (same.length) return `use ${[...new Set(same)].slice(0, 2).join(" or ")}; a role token follows the theme`;
      const primitive = [...(tokens.primitiveHex ?? new Map())].find(([, h]) => h === hex)?.[0];
      if (primitive) return `${hex} is the primitive --basalt-${primitive}; use the role it plays: ${roleList(tokens, roles)}`;
    }
    return `use ${roles.label} token: ${roleList(tokens, roles)}`;
  }
  const family = familyFor(property, raw.kind);
  const base = raw.numeric ? raw.number : toBase(raw.number, raw.unit);
  if (raw.unit === "em" && property === "letter-spacing") {
    const exact = [...tokens.primitives].filter(([n, css]) => family.match(n) && parseFloat(css) === raw.number).map(([n]) => n);
    if (exact.length) return `use ${v(exact[0])} (${raw.text})`;
  }
  if (base === null) return `use ${family.label} token (${raw.unit} is not one of Basalt's units)`;
  if (base === 0) return raw.kind === "time" ? `use ${v("duration-instant")}` : "write 0 without a unit";
  const candidates = [...tokens.primitives]
    .filter(([n]) => family.match(n))
    .map(([n, css]) => { const m = /^(-?[\d.]+)(px|rem|ms|s)$/.exec(css); return m ? [n, toBase(Number(m[1]), m[2]), css] : null; })
    .filter(Boolean);
  const exact = candidates.filter(([, b]) => b === Math.abs(base));
  const sign = base < 0 ? "calc(-1 * " : "";
  const close = base < 0 ? ")" : "";
  if (exact.length) return `use ${exact.slice(0, 2).map(([n, , css]) => `${sign}${v(n)}${close} (${css})`).join(" or ")}`;
  const sorted = candidates.sort((a, b) => Math.abs(a[1] - Math.abs(base)) - Math.abs(b[1] - Math.abs(base))).slice(0, 2);
  if (!sorted.length) return `use ${family.label} token`;
  return `no ${family.label.replace(/^an? /, "")} token is ${raw.text}: the nearest are ${sorted.map(([n, , css]) => `${v(n)} (${css})`).join(" and ")}; a value between them is a design decision`;
}

/** The type step tokens for a type property, from the installed release: "use a type step: var(--basalt-text-sm-size), …". */
export function typeStep(tokens, property) {
  const suffix = property === "line-height" ? "line-height" : property === "letter-spacing" ? "tracking" : "size";
  const names = [...tokens.names].filter((n) => new RegExp(`^text-(xs|sm|base|md|lg|xl)-${suffix}$`).test(n));
  return names.length ? `use a type step: ${names.slice(0, 4).map((n) => `var(--basalt-${n})`).join(", ")}, or \`Text\`'s \`size\`` : "use a type step token";
}

function roleList(tokens, roles) {
  const names = roles.names.filter((n) => tokens.names.has(n));
  return names.length ? names.slice(0, 5).map((n) => `var(--basalt-${n})`).join(", ") : "a --basalt-* role token";
}

function normaliseHex(text) {
  const h = text.slice(1).toLowerCase();
  if (h.length === 3 || h.length === 4) return `#${[...h.slice(0, 3)].map((c) => c + c).join("")}`;
  return `#${h.slice(0, 6)}`;
}

/** The Basalt component a `.basalt-*` class belongs to: the longest run of its words that names an export (`basalt-icon-button-label` → IconButton). */
export function componentOfClass(vocabulary, className) {
  const words = className.replace(/^basalt-/, "").split("-").filter(Boolean);
  for (let n = words.length; n > 0; n--) {
    const name = words.slice(0, n).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
    if (vocabulary.has(name)) return name;
  }
  return null;
}
