// Formatters that draw nothing: a moment as a log writes it, a clock, a day, a countdown, an age and a stat's time. They hold no component and no
// hook, and import nothing, so they live in a module of their own that carries no `"use client"`: a React Server Component calls them. The zone is an
// argument, never a place, and so is the locale: it defaults to `en-US`, never to the runtime's, so a server's render and the browser's agree on the hour
// (DECISIONS 207). A clock a person reads (`formatClock`, `formatStatTime`) follows the locale, so 12-hour in `en-US` ("6:42 PM"), with a numeric hour; a stamp to
// the second (`formatStamp`) is a log's and stays 24-hour whatever the locale. `time.tsx` draws the elements that stand on them.

const pad = (n: number) => String(n).padStart(2, "0");

// A formatter costs about 30 µs to make and under 1 µs to use, and a column of dates writes one for each cell on every render. So each is made once for its
// locale and options and kept. The map is made on first use, not when the module loads, and holds at most `KEPT` (a page with a zone for every row of a table
// would otherwise grow it for as long as the page lives; past that it starts again).
const KEPT = 64;
let formatters: Map<string, Intl.DateTimeFormat> | undefined;
function formatter(locale: string | string[] | undefined, options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify([locale ?? null, options]);
  formatters ??= new Map();
  let found = formatters.get(key);
  if (!found) {
    if (formatters.size >= KEPT) formatters.clear();
    found = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, found);
  }
  return found;
}

function parts(date: Date, locale: string | string[] | undefined, options: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const part of formatter(locale, options).formatToParts(date)) out[part.type] = part.value;
  return out;
}

// The glue (micro-details m2 T8): a value and its unit, and a short month and its day, are joined by a no-break space (U+00A0) so a line never parts them.
// Only a breakable U+0020 is turned; what Intl writes itself (U+202F, the direction marks, a comma, an existing U+00A0) is kept as it is.
const NB = "\u00a0";

/** A day's text with its month and day glued, in either order: the literal between the two has its breakable spaces turned, and nothing else. */
function glueMonthDay(list: Intl.DateTimeFormatPart[]) {
  const pair = (a?: string, b?: string) => (a === "month" && b === "day") || (a === "day" && b === "month");
  return list.map((part, i) => (part.type === "literal" && pair(list[i - 1]?.type, list[i + 1]?.type) ? part.value.replace(/ /g, NB) : part.value)).join("");
}

/** The hour as the locale writes it: numeric where it is 12-hour ("6:42 PM", never "06:42 PM"), two digits where it is 24-hour ("09:05"; a bare "9:05" is not how those locales write it). */
const hourStyle = (locale: string | string[] | undefined): "numeric" | "2-digit" => (formatter(locale, { hour: "numeric" }).resolvedOptions().hour12 ? "numeric" : "2-digit");

/** A clock in the locale's hour, its day period ("AM") set off by a no-break space (U+00A0, a full space as in the site-words example "6:42 PM"; DECISIONS 208) whichever the runtime's data writes (older ICU a plain space, newer U+202F), so a server and a browser agree and "6:42 PM" never breaks. */
function clockText(locale: string | string[] | undefined, options: Intl.DateTimeFormatOptions, at: Date) {
  const list = formatter(locale, options).formatToParts(at);
  return list.map((part, i) => (part.type === "literal" && list[i + 1]?.type === "dayPeriod" ? "\u00a0" : part.value)).join("");
}

export interface TimeOptions {
  /** An IANA zone name. Defaults to the runtime's. */
  timeZone?: string;
  /** The locale the time is written in. Default `en-US` (never the runtime's, so a server render and its hydration agree). */
  locale?: string | string[];
}

/** A moment to the second as a log writes it ("14:49:07", always 24-hour) and as a machine reads it ("2026-11-17T14:49:07"), in the zone given. */
export function formatStamp(time: Date | number, { timeZone, locale = "en-US" }: TimeOptions = {}) {
  const p = parts(new Date(time), "en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const hour = p.hour === "24" ? "00" : p.hour;
  const text = formatter(locale, { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(time));
  return { text, dateTime: `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}` };
}

/** How a zone's name is written, as `Intl.DateTimeFormat` writes it: "short" is "CST" in `en-US`, "shortOffset" "GMT-6", "long" "Central Standard Time". */
export type TimeZoneNameStyle = "short" | "long" | "shortOffset" | "longOffset" | "shortGeneric" | "longGeneric";

/** The zone's name at a moment, in the locale and style given ("CST"; "CDT" in summer). */
export function zoneName(time: Date | number, style: TimeZoneNameStyle, { timeZone, locale = "en-US" }: TimeOptions = {}) {
  return formatter(locale, { timeZone, timeZoneName: style, hour: "numeric" }).formatToParts(new Date(time)).find((part) => part.type === "timeZoneName")?.value ?? "";
}

/** A clock to the minute as a person reads it, in the locale's hour ("6:42 PM" in `en-US`, "18:42" in `en-GB`), and its machine form (ISO, 24-hour). */
export function formatClock(time: Date | number, { timeZone, locale = "en-US" }: TimeOptions = {}) {
  const p = parts(new Date(time), "en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const text = clockText(locale, { timeZone, hour: hourStyle(locale), minute: "2-digit" }, new Date(time));
  return { text, dateTime: `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}` };
}

/** A day ("Nov 1"), with the year only when it is not the year of `now` ("Jan 4, 2025"), and its machine form ("2026-11-01"). The month and day are glued by a no-break space; the space before a year stays breakable. */
export function formatDay(time: Date | number, { now = new Date(), timeZone, locale = "en-US" }: TimeOptions & { now?: Date | number } = {}) {
  const at = new Date(time);
  const year = (d: Date) => parts(d, "en-US", { timeZone, year: "numeric" }).year;
  const text = glueMonthDay(formatter(locale, { timeZone, day: "numeric", month: "short", ...(year(at) === year(new Date(now)) ? {} : { year: "numeric" }) }).formatToParts(at));
  const p = parts(at, "en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return { text, dateTime: `${p.year}-${p.month}-${p.day}` };
}

/** The time left to a moment: "18d 09:10:51" (the days glued to the clock), "09:10:51" under a day, and `null` once it has passed. Never negative. */
export function formatCountdown(to: Date | number, now: Date | number = new Date()) {
  const s = Math.max(0, Math.floor((new Date(to).getTime() - new Date(now).getTime()) / 1000));
  if (!s) return null;
  const d = Math.floor(s / 86400);
  const clock = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return { text: d > 0 ? `${d}d${NB}${clock}` : clock, dateTime: `P${d}DT${Math.floor((s % 86400) / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`, days: d };
}


let relatives: Map<string, Intl.RelativeTimeFormat> | undefined;
function relativeFormatter(locale: string | string[], short: boolean) {
  const key = JSON.stringify([locale, short]);
  relatives ??= new Map();
  let found = relatives.get(key);
  if (!found) {
    if (relatives.size >= KEPT) relatives.clear();
    found = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: short ? "narrow" : "long" });
    relatives.set(key, found);
  }
  return found;
}

/**
 * The locale resolves to English (any region): then Basalt's own words are used. It is the language Intl resolves the request to, never its first tag, so
 * `["zz", "en-US"]` is English, as Intl writes it. `formatAge` and `DateAge`'s seat decide by the same test.
 */
export const english = (locale: string | string[] | undefined = "en-US") => /^en(?:-|$)/i.test(relativeFormatter(locale, false).resolvedOptions().locale);

type AgeUnit = "minute" | "hour" | "day" | "month" | "year";

/**
 * An age in a language other than English, as `Intl.RelativeTimeFormat` writes it (narrow for `short`), with the number glued to its unit: the breakable
 * space beside the number, on the unit's side, is a no-break space. `n` 0 is the locale's "now". The one helper `formatAge` and `DateAge`'s seat share.
 */
export function relativeAge(locale: string | string[], n: number, unit: AgeUnit | "second", short: boolean, fold?: string) {
  const list = relativeFormatter(locale, short).formatToParts(n === 0 ? 0 : -n, unit);
  const number = (p?: Intl.RelativeTimeFormatPart) => !!p && p.type !== "literal";
  const first = list.findIndex(number);
  if (first < 0) return list.map((p) => p.value).join("");
  let last = first;
  while (number(list[last + 1])) last += 1;
  // `fold` (the seat's) writes every digit of the number as that one character, from Intl's own numeric parts, so a numbering system with digits outside
  // \p{Nd} (hanidec's 三) folds as Latin and Arabic-Indic do. A group separator is kept.
  const out = list.map((p) => (fold !== undefined && p.type === "integer" ? Array.from(p.value, () => fold).join("") : p.value));
  const after = list[last + 1];
  const before = list[first - 1];
  // The unit follows the number in most languages; where nothing follows it, it is before. A separator Intl wrote itself is kept.
  if (after?.type === "literal" && after.value.trim()) {
    if (after.value.startsWith(" ")) out[last + 1] = NB + after.value.slice(1);
  } else if (before?.type === "literal" && before.value.endsWith(" ")) out[first - 1] = before.value.slice(0, -1) + NB;
  return out.join("");
}

/** The branch an age falls in: under 90 seconds is now (0), then minutes to 90, hours to 36, days to 45, months to 548 days, then years. */
function ageOf(time: Date | number, now: Date | number): [number, AgeUnit | "second"] {
  const s = Math.max(0, Math.round((new Date(now).getTime() - new Date(time).getTime()) / 1000));
  if (s < 90) return [0, "second"];
  if (s < 3600 * 1.5) return [Math.round(s / 60), "minute"];
  if (s < 86400 * 1.5) return [Math.round(s / 3600), "hour"];
  if (s < 86400 * 45) return [Math.round(s / 86400), "day"];
  if (s < 86400 * 548) return [Math.round(s / (86400 * 30.44)), "month"];
  return [Math.round(s / (86400 * 365.25)), "year"];
}

export interface AgeOptions {
  /** The narrow column's form ("11d") in place of the words ("11 days ago"). */
  short?: boolean;
  /**
   * The locale the age is written in. Default `en-US`. Any English locale writes Basalt's own words ("11 days ago", "just now"; short "11d", "now");
   * any other language is `Intl.RelativeTimeFormat`'s, with the same branches ("il y a 11 jours"; narrow for `short`).
   */
  locale?: string | string[];
}

const ABBR: Record<AgeUnit, string> = { minute: "m", hour: "h", day: "d", month: "mo", year: "y" };

/**
 * A relative age, coarse on purpose: "just now" under 90 seconds, then minutes, hours, days to 45, months to 548 days, years. DECISIONS
 * 162 V13: it is written only beside its absolute date, never alone and never in a `Stat`'s source line (that stays absolute). `short` is the
 * narrow column's form: "now", "11d", "3mo", "6y". The number is glued to its unit by a no-break space ("11 days ago").
 */
export function formatAge(time: Date | number, now: Date | number = new Date(), { short = false, locale = "en-US" }: AgeOptions = {}) {
  const [n, unit] = ageOf(time, now);
  if (!english(locale)) return relativeAge(locale, n, unit, short);
  if (unit === "second") return short ? "now" : "just now";
  return short ? `${n}${ABBR[unit]}` : `${n}${NB}${unit}${n === 1 ? "" : "s"} ago`;
}

let ageSeats: Map<string, string[]> | undefined;

/**
 * Every short form a non-English age can take, folded to the locale's own 8 in every digit, for `DateAge`'s seat (m2 I3): now; 1 to 99 of each unit; and,
 * since years have no bound, at each digit count from 3 to 6 (the furthest two valid dates are about 547,600 years apart) the counts 10^(d-1) to 10^(d-1) + 99,
 * so every plural form, the round thousand and the locale's grouping are held. Deduplicated, made once per locale and kept; the same on a server and a client.
 */
export function ageSeat(locale: string | string[]): string[] {
  const key = JSON.stringify(locale);
  ageSeats ??= new Map();
  const kept = ageSeats.get(key);
  if (kept) return kept;
  const eight = new Intl.NumberFormat(locale).format(8);
  // The number's own parts are folded (relativeAge's `fold`), and any digit left in the words by the \p{Nd} pass, so every numbering system dedups.
  const age = (n: number, unit: AgeUnit | "second") => relativeAge(locale, n, unit, true, eight).replace(/\p{Nd}/gu, eight);
  const seen = new Set([age(0, "second")]);
  for (const unit of ["minute", "hour", "day", "month", "year"] as const) for (let n = 1; n <= 99; n += 1) seen.add(age(n, unit));
  for (let d = 3; d <= 6; d += 1) for (let n = 10 ** (d - 1); n <= 10 ** (d - 1) + 99; n += 1) seen.add(age(n, "year"));
  const forms = [...seen];
  if (ageSeats.size >= KEPT) ageSeats.clear();
  ageSeats.set(key, forms);
  return forms;
}

/**
 * The time of a reading as the stat writes it, and its machine form: the clock alone for today ("4:41 AM" in `en-US`), the date added for
 * another day ("Nov 7, 8:02 AM"), and the year only when it differs from this one ("Nov 7, 2025, 8:02 AM"). The hour follows the locale. The month and
 * day are glued, as the clock and its period are; the spaces after the commas stay breakable.
 */
export function formatStatTime(time: Date | number, { now = new Date(), timeZone, locale = "en-US" }: { now?: Date | number; timeZone?: string; locale?: string | string[] } = {}) {
  const at = new Date(time);
  const base: Intl.DateTimeFormatOptions = { timeZone, hourCycle: "h23" };
  const clock = clockText(locale, { timeZone, hour: hourStyle(locale), minute: "2-digit" }, at);
  const day = (d: Date) => parts(d, "en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const [then, today] = [day(at), day(new Date(now))];
  const sameDay = then.year === today.year && then.month === today.month && then.day === today.day;
  const sameYear = then.year === today.year;
  const date = glueMonthDay(formatter(locale, { timeZone, month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).formatToParts(at));
  const stamp = parts(at, "en-US", { ...base, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return {
    text: sameDay ? clock : `${date}, ${clock}`,
    dateTime: `${stamp.year}-${stamp.month}-${stamp.day}T${stamp.hour === "24" ? "00" : stamp.hour}:${stamp.minute}`,
  };
}

/**
 * How long a state has lasted so far, as a length of time a person reads beside the state's word ("Away 6 min"): `null` under a minute (the word
 * stands alone), then minutes ("6 min"), hours and minutes under a day ("1 hr 5 min", "2 hr"), then days ("3 days"). It is a length, like a
 * countdown the other way, and not an age: it says how long something that is still true has been true, so it never needs a date beside it.
 * The words are US English; an app writing another language passes its own formatter to the part that draws it. `dateTime` is the ISO duration. Each
 * value is glued to its unit by a no-break space ("1 hr 5 min"); the space between two pairs stays breakable.
 */
export function formatElapsed(since: Date | number, now: Date | number = new Date()) {
  const m = Math.floor(Math.max(0, new Date(now).getTime() - new Date(since).getTime()) / 60000);
  // An invalid date is no length at all: never "NaN min".
  if (!Number.isFinite(m) || m < 1) return null;
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return { text: `${d}${NB}${d === 1 ? "day" : "days"}`, dateTime: `P${d}D` };
  if (h > 0) return { text: min ? `${h}${NB}hr ${min}${NB}min` : `${h}${NB}hr`, dateTime: `PT${h}H${min ? `${min}M` : ""}` };
  return { text: `${min}${NB}min`, dateTime: `PT${min}M` };
}

/**
 * The time left to a moment in words (cimip-gaps-3 T2, 4b): "in under 1 min" in the last minute, "in 12 min", "in 2 hr 15 min" or "in 2 hr", "in 1 day" or
 * "in 3 days", and `null` once it has passed. Rounded down, so the words never promise more time than there is ("in 12 min" with 12 min 41 s left; never
 * "in 0 min"). `dateTime` is the real time left to the second ("PT12M41S"), whatever the words round to. US English, `formatElapsed`'s unit words and glue.
 */
export function formatUntil(to: Date | number, now: Date | number = new Date()) {
  const s = Math.floor((new Date(to).getTime() - new Date(now).getTime()) / 1000);
  if (!Number.isFinite(s) || s <= 0) return null;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const dateTime = `P${d ? `${d}D` : ""}T${h}H${m}M${s % 60}S`.replace("PT0H", "PT").replace(/^PT0M/, "PT");
  if (s < 60) return { text: `in under 1${NB}min`, dateTime };
  if (d > 0) return { text: `in ${d}${NB}${d === 1 ? "day" : "days"}`, dateTime };
  if (h > 0) return { text: m ? `in ${h}${NB}hr ${m}${NB}min` : `in ${h}${NB}hr`, dateTime };
  return { text: `in ${m}${NB}min`, dateTime };
}
