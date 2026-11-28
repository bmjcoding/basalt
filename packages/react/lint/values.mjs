// Raw design values in a CSS value written outside a stylesheet (a JSX `style`, an SVG attribute): the same policy as Basalt's Stylelint config
// (stylelint-config.mjs), so a value the stylesheet lint refuses is refused in JSX too. Colours, lengths and times come from `--basalt-*` tokens.

const VIEWPORT = ["vw", "vh", "vi", "vb", "vmin", "vmax"].flatMap((unit) => [unit, `s${unit}`, `l${unit}`, `d${unit}`]);
/** The length units Basalt's stylesheet policy refuses (`1lh`, `%`, `fr` and the container units stay allowed, as there). */
export const LENGTH_UNITS = ["px", "rem", "em", "ch", "rlh", "ex", "rex", "cap", "rcap", "ic", "ric", "rch", ...VIEWPORT, "cm", "mm", "q", "in", "pt", "pc"];
export const TIME_UNITS = ["s", "ms"];
const UNIT = new RegExp(`(?<![\\w.#-])(-?(?:\\d+\\.?\\d*|\\.\\d+))(${[...LENGTH_UNITS, ...TIME_UNITS].sort((a, b) => b.length - a.length).join("|")})(?![\\w-])`, "gi");
const COLOUR_FUNCTION = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const HEX = /(?<![\w&-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
/** The CSS named colours (`transparent` and `currentColor` are not raw: they carry no colour of their own). */
const NAMED = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse " +
  "chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen " +
  "darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray " +
  "dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred " +
  "indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey " +
  "lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon " +
  "mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue " +
  "mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred " +
  "papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna " +
  "silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen").split(" "));

/**
 * React's unitless properties (react-dom's isUnitlessNumber): a number on one of these is not a length. A number on any other property is written
 * with `px` by React, so `padding: 16` is the raw length 16px.
 */
const UNITLESS = new Set(["animation-iteration-count", "aspect-ratio", "border-image-outset", "border-image-slice", "border-image-width", "box-flex",
  "box-flex-group", "box-ordinal-group", "column-count", "columns", "flex", "flex-grow", "flex-positive", "flex-shrink", "flex-negative", "flex-order",
  "grid-area", "grid-row", "grid-row-end", "grid-row-span", "grid-row-start", "grid-column", "grid-column-end", "grid-column-span", "grid-column-start",
  "font-weight", "line-clamp", "line-height", "opacity", "order", "orphans", "scale", "tab-size", "widows", "z-index", "zoom", "fill-opacity",
  "flood-opacity", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-miterlimit", "stroke-opacity", "stroke-width"]);

/** Whether React writes a number on this (kebab-case) property as a length. A custom property's number is written as it is. */
export const numberIsLength = (property) => !property.startsWith("--") && !UNITLESS.has(property.replace(/^-(webkit|moz|ms)-/, ""));

/** The value with `url(...)` and quoted strings blanked to spaces, so what they hold is never read as a value. */
function blankOpaque(value) {
  return value
    .replace(/url\((?:[^()"']|"[^"]*"|'[^']*')*\)/gi, (m) => " ".repeat(m.length))
    .replace(/"[^"]*"|'[^']*'/g, (m) => " ".repeat(m.length));
}

/**
 * The raw design values in one CSS value: [{ kind: "colour" | "length" | "time", text, number?, unit? }].
 * @param {string} value
 */
export function rawValues(value) {
  const text = blankOpaque(String(value));
  const found = [];
  for (const m of text.matchAll(HEX)) found.push({ kind: "colour", text: m[0], at: m.index });
  for (const m of text.matchAll(COLOUR_FUNCTION)) found.push({ kind: "colour", text: `${m[1]}()`, at: m.index });
  for (const m of text.matchAll(/(?<![\w#.-])([a-z]+)(?![\w(-])/gi)) {
    // A named colour, outside a `var()` name (those start with `--`, which the lookbehind already rules out).
    if (NAMED.has(m[1].toLowerCase())) found.push({ kind: "colour", text: m[1], at: m.index });
  }
  for (const m of text.matchAll(UNIT)) {
    const unit = m[2].toLowerCase();
    found.push({ kind: TIME_UNITS.includes(unit) ? "time" : "length", text: m[0], number: Number(m[1]), unit, at: m.index });
  }
  return found.sort((a, b) => a.at - b.at).map(({ at, ...rest }) => rest);
}

/** The raw value a React style number is: `16` on `padding` is 16px. Zero is not a length. */
export function rawNumber(property, number) {
  if (!Number.isFinite(number) || number === 0 || !numberIsLength(property)) return null;
  return { kind: "length", text: `${number}`, number, unit: "px", numeric: true };
}
