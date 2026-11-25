// A diagram's time scale (DECISIONS 359, the answers' section 3): the arithmetic a gantt and a timeline share, and nothing else. Plain numbers in and out:
// no DOM, no CSS, no layout, nothing at load, and it imports nothing. Each caller owns its domain, its inset, its least distance between ticks, its end
// ticks, its labels' face, ink and words (but a date's), its zone and its breaks' marks. The module never makes a default domain, never rounds one unless a
// caller asks (`roundOut`), and never adds the domain's ends as ticks. The implementation has not been reviewed.

const DAY = 86_400_000;

// ---- 1. Two readers that make a number ----

/** A day (`YYYY-MM-DD`) as whole days from 1970-01-01, made with `Date.UTC` and never a zone, so no runtime zone can move it. Null where it is not a day. */
export function dayNumber(v: unknown): number | null {
  const m = typeof v === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim()) : null;
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const at = new Date(ms);
  if (at.getUTCFullYear() !== y || at.getUTCMonth() !== mo - 1 || at.getUTCDate() !== d) return null;
  return Math.round(ms / DAY);
}

/** An instant (ISO 8601, with its offset or `Z`) as its milliseconds. Null where it is not one: a time with no offset names no instant. */
export function instantOf(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

// ---- 2. The map ----

/** A span the scale leaves out, in the domain's units: `[from, to]`. */
export type ScaleBreak = readonly [number, number];
export interface ScaleMapInput {
  /** Required: the module has no default domain and never rounds one. */
  domain: readonly [number, number];
  /** The axis' length, in px. */
  length: number;
  /** Spans left out of the scale, each drawn as a fixed `gap`. */
  breaks?: readonly ScaleBreak[];
  /** The px each break takes on the axis. */
  gap?: number;
  /** Mirrored: a position is the length less the left-to-right one. */
  reversed?: boolean;
}
export interface ScaleMap {
  domain: readonly [number, number];
  length: number;
  /** The breaks inside the domain, sorted, merged where they touch. */
  breaks: ScaleBreak[];
  gap: number;
  reversed: boolean;
  /** px for one unit of the domain, the same on both sides of every break. */
  rate: number;
  /** A distance from the axis' start. A value inside a break is at that break's start edge. */
  position: (value: number) => number;
  /** The way back: the value at a distance from the axis' start (a distance inside a break's gap is its start). */
  value: (position: number) => number;
}

/** The breaks a map holds: inside the domain, sorted, and merged where they overlap. */
function breaksIn(domain: readonly [number, number], list: readonly ScaleBreak[] = []): ScaleBreak[] {
  const [a, b] = domain;
  const clipped = list
    .map(([f, t]) => [Math.max(a, Math.min(f, t)), Math.min(b, Math.max(f, t))] as [number, number])
    .filter(([f, t]) => t > f)
    .sort((x, y) => x[0] - y[0]);
  const out: Array<[number, number]> = [];
  for (const br of clipped) {
    const last = out[out.length - 1];
    if (last && br[0] <= last[1]) last[1] = Math.max(last[1], br[1]);
    else out.push([br[0], br[1]]);
  }
  return out;
}

/** One rate for the whole figure: (`length` less a `gap` for each break) over (`b − a` less the time left out). */
export function scaleMap(input: ScaleMapInput): ScaleMap {
  const [a, b] = input.domain;
  const length = input.length;
  const breaks = breaksIn(input.domain, input.breaks);
  const gap = breaks.length ? Math.max(0, input.gap ?? 0) : 0;
  const reversed = Boolean(input.reversed);
  const left = breaks.reduce((sum, [f, t]) => sum + (t - f), 0);
  const span = b - a - left;
  const rate = span > 0 ? (length - gap * breaks.length) / span : 0;
  const forward = (v: number): number => {
    // With no breaks it is the fraction itself, `(value − a) ÷ (b − a) × length`, and nothing else: the arithmetic the gantt was decided on.
    if (!breaks.length) return b === a ? 0 : ((v - a) / (b - a)) * length;
    let out = 0, at = a;
    for (const [f, t] of breaks) {
      if (v <= f) break;
      out += (f - at) * rate;
      if (v < t) return out;
      out += gap;
      at = t;
    }
    return out + (v - at) * rate;
  };
  const back = (p: number): number => {
    const x = reversed ? length - p : p;
    if (!breaks.length) return length === 0 ? a : a + (x / length) * (b - a);
    let pos = 0, at = a;
    for (const [f, t] of breaks) {
      const run = (f - at) * rate;
      if (x <= pos + run) return at + (x - pos) / rate;
      pos += run;
      if (x <= pos + gap) return f;
      pos += gap;
      at = t;
    }
    return at + (x - pos) / rate;
  };
  return { domain: [a, b], length, breaks, gap, reversed, rate, position: (v) => (reversed ? length - forward(v) : forward(v)), value: back };
}

// ---- 3. Three ladders ----

/** One step of a ladder: where the tick at or before a value is, and the next after one. `approx` is its shortest length in the domain's units. */
export interface ScaleStep {
  name: string;
  approx: number;
  floor: (v: number) => number;
  next: (v: number) => number;
}
export type ScaleLadder = ScaleStep[];

const uniform = (name: string, size: number, origin = 0): ScaleStep => ({
  name,
  approx: size,
  floor: (v) => origin + Math.floor((v - origin) / size + 1e-9) * size,
  next: (v) => origin + (Math.floor((v - origin) / size + 1e-9) + 1) * size,
});

/** Number: 1, 2, 2.5 and 5 times a power of ten, from the power below `least` up to the power above `most` (the chart's steps). */
export function numberLadder(least: number, most: number): ScaleLadder {
  const out: ScaleLadder = [];
  const lo = Math.floor(Math.log10(Math.max(1e-9, least))) - 1;
  const hi = Math.ceil(Math.log10(Math.max(1e-9, most))) + 1;
  for (let p = lo; p <= hi && out.length < 200; p++) for (const f of [1, 2, 2.5, 5]) {
    const size = f * 10 ** p;
    // A step written to 12 significant figures, so 0.1 × 3 is 0.3.
    const clean = Number(size.toPrecision(12));
    out.push({ ...uniform(String(clean), clean), floor: (v) => Number((Math.floor(v / clean + 1e-9) * clean).toPrecision(12)), next: (v) => Number(((Math.floor(v / clean + 1e-9) + 1) * clean).toPrecision(12)) });
  }
  return out;
}

/** A day number's calendar parts, in UTC (a day number has no zone). */
const partsOf = (day: number) => { const d = new Date(day * DAY); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), w: d.getUTCDay() }; };
const dayOf = (y: number, m: number, d = 1) => Math.round(Date.UTC(y, m, d) / DAY);
/** The month steps: the 1st of a month every `months` months (January, April, July and October for three), and a year (January 1st). */
const monthStep = (name: string, months: number, approx: number): ScaleStep => ({
  name,
  approx,
  floor: (v) => { const p = partsOf(Math.floor(v)); const k = p.y * 12 + p.m; const s = k - (((k % months) + months) % months); return dayOf(Math.floor(s / 12), s % 12); },
  next: (v) => { const p = partsOf(Math.floor(v)); const k = p.y * 12 + p.m; const s = k - (((k % months) + months) % months) + months; return dayOf(Math.floor(s / 12), s % 12); },
});
/** Day: 1 day, 2 days, a week (Mondays), 2 weeks, a month (the 1st), 3 months, a year, on the calendar of the day number. 1970-01-05 was a Monday. */
export function dayLadder(): ScaleLadder {
  return [uniform("day", 1), uniform("2 days", 2), uniform("week", 7, 4), uniform("2 weeks", 14, 4), monthStep("month", 1, 28), monthStep("3 months", 3, 89), monthStep("year", 12, 365)];
}

/**
 * Clock: 1, 2, 5, 10, 15, 30 s; 1, 2, 5, 10, 15, 30 min; 1, 2, 3, 6, 12 h; then the day ladder's steps at midnights. A tick is round on the wall clock of
 * the zone its caller states: `offset(ms)` is that zone's offset from UTC at an instant, in minutes (in Asia/Kolkata an hour's tick is on the hour there).
 */
export function clockLadder(offset: (ms: number) => number = () => 0): ScaleLadder {
  const wall = (t: number) => t + offset(t) * 60_000;
  // A wall-clock time back to its instant: twice, so a time beside a change of offset lands on the side it names.
  const instant = (w: number) => { const t = w - offset(w) * 60_000; return w - offset(t) * 60_000; };
  const onWall = (name: string, size: number): ScaleStep => ({
    name,
    approx: size,
    floor: (v) => instant(Math.floor(wall(v) / size + 1e-9) * size),
    next: (v) => { let n = instant((Math.floor(wall(v) / size + 1e-9) + 1) * size); if (n <= v) n = instant((Math.floor(wall(v) / size + 1e-9) + 2) * size); return n; },
  });
  const s = 1000, mi = 60 * s, hr = 60 * mi;
  const out: ScaleLadder = [1, 2, 5, 10, 15, 30].map((k) => onWall(`${k} s`, k * s));
  out.push(...[1, 2, 5, 10, 15, 30].map((k) => onWall(`${k} min`, k * mi)), ...[1, 2, 3, 6, 12].map((k) => onWall(`${k} h`, k * hr)));
  // The day ladder's steps, at the zone's midnights: on wall-clock day numbers.
  for (const st of dayLadder()) out.push({
    name: st.name,
    approx: st.approx * DAY,
    floor: (v) => instant(st.floor(Math.floor(wall(v) / DAY)) * DAY),
    next: (v) => instant(st.next(Math.floor(wall(v) / DAY)) * DAY),
  });
  return out;
}

// ---- 4. Ticks ----

export interface ScaleTick { value: number; place: number; step: string }

/** A step's ticks inside the domain and outside every break, bounded by the most the length can hold at the caller's distance. */
function stepTicks(map: ScaleMap, step: ScaleStep, cap: number): number[] | null {
  const [a, b] = map.domain;
  const out: number[] = [];
  let v = step.floor(a);
  if (v < a) v = step.next(v);
  // Bounded by the ticks kept (a step's values inside a left-out span are passed over, never kept), and by a hard stop.
  for (let guard = 0; v <= b + 1e-9 && guard < 100_000; guard++) {
    if (!map.breaks.some(([f, t]) => v > f && v < t)) { out.push(v); if (out.length > cap) return null; }
    const n = step.next(v);
    if (!(n > v)) break;
    v = n;
  }
  return out;
}

/**
 * The finest step whose neighbouring ticks are at least `least` px apart; round values only; none inside a left-out span; each with its value, its place
 * and its step. Never more than `length` over the distance, plus one. It never adds the domain's ends: where no step fits, there are none.
 */
export function ticks(map: ScaleMap, ladder: ScaleLadder, least: number): ScaleTick[] {
  const cap = Math.floor(map.length / Math.max(1, least)) + 1;
  for (const step of ladder) {
    // A step whose shortest length is under the distance at this rate cannot pass: it is not generated.
    if (step.approx * map.rate < least - 1e-6) continue;
    const values = stepTicks(map, step, cap + 1);
    if (!values) continue;
    const places = values.map((v) => map.position(v));
    let ok = values.length <= cap;
    for (let k = 1; ok && k < places.length; k++) if (Math.abs(places[k]! - places[k - 1]!) < least - 1e-6) ok = false;
    if (ok) return values.map((value, k) => ({ value, place: places[k]!, step: step.name }));
  }
  return [];
}

// ---- 5. Rounding out, as a function a caller may call ----

/**
 * A step and a domain together: the finest step at which, with the extent widened to that step's ticks at or outside it, ticks are still `least` px
 * apart. One try a step of the ladder at most. The map never calls it.
 */
export function roundOut(extent: readonly [number, number], ladder: ScaleLadder, least: number, length: number, breaks: readonly ScaleBreak[] = [], gap = 0): { domain: [number, number]; step: string } | null {
  const [e0, e1] = extent;
  for (const step of ladder) {
    const lo = step.floor(e0);
    let hi = step.floor(e1);
    if (hi < e1) hi = step.next(hi);
    if (!(hi > lo)) hi = step.next(lo);
    const map = scaleMap({ domain: [lo, hi], length, breaks, gap });
    if (step.approx * map.rate < least - 1e-6) continue;
    if (ticks(map, [step], least).length >= 2) return { domain: [lo, hi], step: step.name };
  }
  return null;
}

// ---- 6. A date's words ----

let formats: Map<string, Intl.DateTimeFormat> | undefined;
const formatter = (locale: string, year: boolean) => {
  formats ??= new Map();
  const key = `${locale}|${year ? "y" : ""}`;
  let f = formats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, year ? { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" });
    formats.set(key, f);
  }
  return f;
};
/** "Nov 2" (or "Nov 2, 2026"), by `Intl.DateTimeFormat` for the locale given (`en-US` by default), formatted in UTC from the day number. */
export function dateWords(day: number, year = false, locale = "en-US"): string {
  return formatter(locale, year).format(new Date(Math.floor(day) * DAY));
}
/** A row of dates' words: the year on the first and on the first of each later year. One function, so a date reads the same on both types. */
export function datesWords(days: readonly number[], locale = "en-US"): string[] {
  let last: number | undefined;
  return days.map((d) => { const y = partsOf(Math.floor(d)).y; const out = dateWords(d, y !== last, locale); last = y; return out; });
}
/** The calendar year of a day number (UTC). */
export const yearOf = (day: number): number => partsOf(Math.floor(day)).y;
