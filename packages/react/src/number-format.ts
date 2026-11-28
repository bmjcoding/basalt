// A number as a person reads it (micro-details m2 I3), server-safe: no component, no hook and no directive, so a React Server Component calls it. The
// locale is an argument and defaults to `en-US`, never the runtime's, so a server's render and the browser's agree (DECISIONS 207). A value and its unit,
// currency or compact suffix are glued by a no-break space (m2 T8): only a breakable U+0020 Intl writes between them is turned; every other separator is
// kept as Intl writes it.

export interface FormatNumberOptions extends Intl.NumberFormatOptions {
  /** The locale the number is written in. Default "en-US", never the runtime's. */
  locale?: string | string[];
}

// A formatter is made once for its locale and options and kept, as `time-format.ts` keeps its own: the map is made on first use, never when the module
// loads, and holds at most `KEPT` (past that it starts again).
const KEPT = 64;
let formatters: Map<string, Intl.NumberFormat> | undefined;
function formatter(locale: string | string[], options: Intl.NumberFormatOptions) {
  const key = JSON.stringify([locale, options]);
  formatters ??= new Map();
  let found = formatters.get(key);
  if (!found) {
    if (formatters.size >= KEPT) formatters.clear();
    found = new Intl.NumberFormat(locale, options);
    formatters.set(key, found);
  }
  return found;
}

/** How many formatters are kept now (for the tests of the bound). */
export function keptNumberFormats() {
  return formatters?.size ?? 0;
}

const GLUED = new Set(["unit", "currency", "compact"]);

/** A number in the locale given ("1,234.5" in `en-US`), with a unit, a currency or a compact suffix glued to it ("10 MB", "1.2 thousand"). */
export function formatNumber(value: number, { locale = "en-US", ...options }: FormatNumberOptions = {}): string {
  const list = formatter(locale, options).formatToParts(value);
  return list
    .map((part, i) => (part.type === "literal" && (GLUED.has(list[i - 1]?.type ?? "") || GLUED.has(list[i + 1]?.type ?? "")) ? part.value.replace(/ /g, "\u00a0") : part.value))
    .join("");
}
