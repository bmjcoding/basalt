// What a declaration does to a Basalt component (the consumer lint, DECISIONS 404): place it in its parent (layout, allowed on a wrapper and on the
// component itself), or change how it looks (appearance, which comes from the component's props and Basalt's tokens). One list, read by the JSX
// check (a `style` on a Basalt component) and the stylesheet rule (`basalt/no-restyle` on a `.basalt-*` selector), so the two never disagree.

/** Properties that place a box in its parent and leave its look alone. Everything not listed is appearance. */
const LAYOUT = new Set([
  "position", "inset", "inset-block", "inset-inline", "inset-block-start", "inset-block-end", "inset-inline-start", "inset-inline-end",
  "top", "right", "bottom", "left", "z-index",
  "margin", "margin-block", "margin-inline", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "margin-block-start", "margin-block-end", "margin-inline-start", "margin-inline-end",
  "grid-area", "grid-column", "grid-row", "grid-column-start", "grid-column-end", "grid-row-start", "grid-row-end",
  "flex", "flex-grow", "flex-shrink", "flex-basis", "order", "align-self", "justify-self", "place-self",
  "width", "min-width", "max-width", "inline-size", "min-inline-size", "max-inline-size",
  "height", "min-height", "max-height", "block-size", "min-block-size", "max-block-size",
  "visibility", "pointer-events", "user-select", "touch-action", "cursor",
  "contain", "content-visibility", "container", "container-type", "container-name", "isolation", "will-change",
  "anchor-name", "position-anchor", "position-area", "position-try", "position-try-fallbacks", "view-transition-name",
  "scroll-margin", "scroll-margin-top", "scroll-margin-bottom", "scroll-margin-block", "scroll-margin-block-start", "scroll-margin-block-end",
  "scroll-margin-inline", "scroll-margin-inline-start", "scroll-margin-inline-end", "scroll-snap-align", "scroll-snap-stop",
]);
/** Height is the control's `size` on a control: on one that takes `size`, these are appearance. On anything else they are layout. */
const SIZED = new Set(["height", "min-height", "max-height", "block-size", "min-block-size", "max-block-size"]);
/** `display` hides a component (`none`) without restyling it; any other value changes how it lays out its own parts. */
const HIDE = new Set(["none"]);

/**
 * The `--basalt-*` custom properties an app may set: each one is documented as the app's to write, and this list is the whole contract (the source
 * check and the stylesheet rule both read it; docs/consumer-lint.md prints it). Every other `--basalt-*` property is a token or a measurement Basalt
 * writes itself (`--basalt-viewport-top`, `--basalt-banner-height`), and setting it is a restyle.
 *   --basalt-stage-room                the closing `Stage`'s bottom room, the app's (README: Stage closing)
 *   --basalt-shell-width               `AppShell capped`'s cap, set on the root (README: AppShell)
 *   --basalt-sticky-offset             a page's own sticky bar of another height, set on the root (README: a page with its own sticky bar)
 *   --basalt-edge-room, -start, -end   the room a head declares for a ghost control hung at its edge (foundations: a ghost control at an edge)
 *   --basalt-dot-line-wrap             `nowrap` for a `DotLine` that never wraps (foundations: DotLine)
 */
export const HOOKS = new Set(["--basalt-stage-room", "--basalt-shell-width", "--basalt-sticky-offset", "--basalt-edge-room", "--basalt-edge-room-start", "--basalt-edge-room-end", "--basalt-dot-line-wrap"]);

/** `paddingInline` → `padding-inline`; `WebkitBackdropFilter` → `-webkit-backdrop-filter`; a custom property and a kebab name stay as written. */
export function kebab(name) {
  if (name.startsWith("--")) return name;
  if (name.includes("-")) return name.toLowerCase();
  const out = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return /^(webkit|moz|ms)-/.test(out) ? `-${out}` : out;
}

/**
 * What one declaration on a Basalt component is: "layout" (allowed), "hook" (a documented custom property), "app-property" (the app's own custom
 * property: Basalt never reads it), or "appearance".
 * @param {string} property kebab-case
 * @param {string | undefined} value the value as written, when known
 * @param {{ sized?: boolean, hooks?: Set<string> }} [options] `sized`: the component takes a `size` prop
 */
export function classify(property, value, options = {}) {
  const prop = property.toLowerCase().startsWith("--") ? property : property.toLowerCase().replace(/^-(webkit|moz|ms)-/, "");
  if (prop.startsWith("--")) {
    if ((options.hooks ?? HOOKS).has(prop)) return "hook";
    return prop.startsWith("--basalt-") ? "appearance" : "app-property";
  }
  if (prop === "display") return value !== undefined && HIDE.has(String(value).trim().toLowerCase()) ? "layout" : "appearance";
  if (SIZED.has(prop)) return options.sized ? "appearance" : "layout";
  return LAYOUT.has(prop) ? "layout" : "appearance";
}

/** The group a property's fix-it message is about. */
export function group(property) {
  const p = property.toLowerCase().replace(/^-(webkit|moz|ms)-/, "");
  if (p.startsWith("--")) return "token";
  if (/^padding/.test(p)) return "padding";
  if (SIZED.has(p)) return "height";
  if (/^(font-size|line-height|letter-spacing|word-spacing)$/.test(p)) return "type-size";
  if (p === "font-weight") return "weight";
  if (/^(font|text-|white-space|text$)/.test(p)) return "type";
  if (/radius/.test(p)) return "radius";
  if (/^(color|background|border|outline|box-shadow|fill|stroke|accent-color|caret-color|opacity|filter|backdrop-filter|mix-blend-mode|text-decoration|text-shadow)/.test(p)) return "colour";
  if (/^(transition|animation|transform|translate|rotate|scale)/.test(p)) return "motion";
  if (/^(display|flex-direction|flex-wrap|flex-flow|align-items|align-content|justify-content|justify-items|place-items|place-content|gap|row-gap|column-gap|grid-template|grid-auto|overflow)/.test(p)) return "inner-layout";
  return "other";
}

/**
 * The classes a selector's subject (the element its declarations land on) carries, per selector in a list. `.toolbar .basalt-button` lands on
 * `.basalt-button`; `.card:has(.basalt-button)` lands on `.card`. What is inside `:has()` and `:not()` is a condition, not the subject.
 * @param {string} selector
 * @returns {string[][]} one list of class names per selector in the list
 */
export function subjectClasses(selector) {
  return splitTop(selector, ",").map((one) => {
    const compound = lastCompound(one.trim());
    const plain = stripFunctions(compound, /^(has|not)$/i);
    return [...plain.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  });
}

/**
 * The selectors a declaration lands under, nesting resolved: its nearest rule's selectors, each joined to every selector of the rule that holds it
 * (through any at-rule between them: `.a { @media (...) { .b { } } }` is `.a .b`). A nested selector with `&` puts the parent where `&` is
 * (`&:hover` under `.basalt-button` is `.basalt-button:hover`); one without is a descendant of it. A rule in `@keyframes` has none.
 * @param {{ type: string, selector?: string, name?: string, parent?: any }} node a PostCSS declaration or rule
 * @returns {string[]}
 */
export function effectiveSelectors(node) {
  let rule = node.type === "rule" ? node : node.parent;
  while (rule && rule.type !== "rule") {
    if (rule.type !== "atrule" || /keyframes$/i.test(rule.name)) return [];
    rule = rule.parent;
  }
  if (!rule) return [];
  let holder = rule.parent;
  while (holder && holder.type === "atrule") {
    if (/keyframes$/i.test(holder.name)) return [];
    holder = holder.parent;
  }
  const own = selectorList(rule.selector);
  if (!holder || holder.type !== "rule") return own;
  const parents = effectiveSelectors(holder);
  return own.flatMap((selector) => parents.map((parent) => (selector.includes("&") ? selector.replaceAll("&", parent) : `${parent} ${selector}`)));
}

/** The selectors of a selector list (`a, :is(b, c)` is two). */
export const selectorList = (selector) => splitTop(selector, ",").map((s) => s.trim());

/** Splits at a character outside brackets, parentheses and strings. */
function splitTop(text, char) {
  const out = [];
  let depth = 0, quote = "", start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === char && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
  }
  out.push(text.slice(start));
  return out;
}

/** The last compound selector: what follows the last combinator (space, >, +, ~) outside brackets. */
function lastCompound(selector) {
  let depth = 0, quote = "", cut = 0;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && (c === " " || c === ">" || c === "+" || c === "~" || c === "\n" || c === "\t")) cut = i + 1;
  }
  return selector.slice(cut);
}

/** Removes `:name(...)` for the names `which` matches, nested brackets included. */
function stripFunctions(compound, which) {
  let out = "";
  for (let i = 0; i < compound.length; i++) {
    const m = /^:([a-zA-Z-]+)\(/.exec(compound.slice(i));
    if (m && which.test(m[1])) {
      let depth = 0, j = i + m[0].length - 1;
      for (; j < compound.length; j++) { if (compound[j] === "(") depth++; else if (compound[j] === ")" && --depth === 0) break; }
      i = j;
      continue;
    }
    out += compound[i];
  }
  return out;
}
