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

/** A day ("Nov 1"), with the year only when it is not the year of `now` ("Jan 4, 2025"), and its machine form ("2026-11-01"). */
export function formatDay(time: Date | number, { now = new Date(), timeZone, locale = "en-US" }: TimeOptions & { now?: Date | number } = {}) {
  const at = new Date(time);
  const year = (d: Date) => parts(d, "en-US", { timeZone, year: "numeric" }).year;
  const text = formatter(locale, { timeZone, day: "numeric", month: "short", ...(year(at) === year(new Date(now)) ? {} : { year: "numeric" }) }).format(at);
  const p = parts(at, "en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return { text, dateTime: `${p.year}-${p.month}-${p.day}` };
}

/** The time left to a moment: "18d 09:10:51", "09:10:51" under a day, and `null` once it has passed. Never negative. */
export function formatCountdown(to: Date | number, now: Date | number = new Date()) {
  const s = Math.max(0, Math.floor((new Date(to).getTime() - new Date(now).getTime()) / 1000));
  if (!s) return null;
  const d = Math.floor(s / 86400);
  const clock = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return { text: d > 0 ? `${d}d ${clock}` : clock, dateTime: `P${d}DT${Math.floor((s % 86400) / 3600)}H${Math.floor((s % 3600) / 60)}M${s % 60}S`, days: d };
}

/**
 * A relative age, coarse on purpose: "just now" under 90 seconds, then minutes, hours, days to 45, months to 548 days, years. DECISIONS
 * 162 V13: it is written only beside its absolute date, never alone and never in a `Stat`'s source line (that stays absolute). `short` is the
 * narrow column's form: "now", "11d", "3mo", "6y".
 */
export function formatAge(time: Date | number, now: Date | number = new Date(), { short = false }: { short?: boolean } = {}) {
  const s = Math.max(0, Math.round((new Date(now).getTime() - new Date(time).getTime()) / 1000));
  const say = (n: number, unit: string, abbr: string) => (short ? `${n}${abbr}` : `${n} ${unit}${n === 1 ? "" : "s"} ago`);
  if (s < 90) return short ? "now" : "just now";
  if (s < 3600 * 1.5) return say(Math.round(s / 60), "minute", "m");
  if (s < 86400 * 1.5) return say(Math.round(s / 3600), "hour", "h");
  if (s < 86400 * 45) return say(Math.round(s / 86400), "day", "d");
  if (s < 86400 * 548) return say(Math.round(s / (86400 * 30.44)), "month", "mo");
  return say(Math.round(s / (86400 * 365.25)), "year", "y");
}

/**
 * The time of a reading as the stat writes it, and its machine form: the clock alone for today ("4:41 AM" in `en-US`), the date added for
 * another day ("Nov 7, 8:02 AM"), and the year only when it differs from this one ("Nov 7, 2025, 8:02 AM"). The hour follows the locale.
 */
export function formatStatTime(time: Date | number, { now = new Date(), timeZone, locale = "en-US" }: { now?: Date | number; timeZone?: string; locale?: string | string[] } = {}) {
  const at = new Date(time);
  const base: Intl.DateTimeFormatOptions = { timeZone, hourCycle: "h23" };
  const clock = clockText(locale, { timeZone, hour: hourStyle(locale), minute: "2-digit" }, at);
  const day = (d: Date) => parts(d, "en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const [then, today] = [day(at), day(new Date(now))];
  const sameDay = then.year === today.year && then.month === today.month && then.day === today.day;
  const sameYear = then.year === today.year;
  const date = formatter(locale, { timeZone, month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(at);
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
 * The words are US English; an app writing another language passes its own formatter to the part that draws it. `dateTime` is the ISO duration.
 */
export function formatElapsed(since: Date | number, now: Date | number = new Date()) {
  const m = Math.floor(Math.max(0, new Date(now).getTime() - new Date(since).getTime()) / 60000);
  // An invalid date is no length at all: never "NaN min".
  if (!Number.isFinite(m) || m < 1) return null;
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return { text: `${d} ${d === 1 ? "day" : "days"}`, dateTime: `P${d}D` };
  if (h > 0) return { text: min ? `${h} hr ${min} min` : `${h} hr`, dateTime: `PT${h}H${min ? `${min}M` : ""}` };
  return { text: `${min} min`, dateTime: `PT${min}M` };
}
