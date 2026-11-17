import * as React from "react";

import { useLoops } from "./loops";
import { Reserve } from "./reserve";
import { join } from "./utils";

// ---- Time parts (DECISIONS 162, X11; V13 and V14) ----
// Formatters that draw nothing, and the three elements that stand on them: a clock that ticks by the minute, a countdown that ticks by
// the second, and a date with its age beside it. Each is a `time` element with a machine `datetime`, in tabular figures, so a changing
// value never changes its width. The zone is an argument, never a place.

const pad = (n: number) => String(n).padStart(2, "0");

function parts(date: Date, locale: string | string[] | undefined, options: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat(locale, options).formatToParts(date)) out[part.type] = part.value;
  return out;
}

export interface TimeOptions {
  /** An IANA zone name. Defaults to the runtime's. */
  timeZone?: string;
  locale?: string | string[];
}

/** A moment as a log writes it ("14:49:07") and as a machine reads it ("2026-11-17T14:49:07"), in the zone given. */
export function formatStamp(time: Date | number, { timeZone, locale }: TimeOptions = {}) {
  const p = parts(new Date(time), "en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const hour = p.hour === "24" ? "00" : p.hour;
  const text = new Intl.DateTimeFormat(locale, { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(time));
  return { text, dateTime: `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}` };
}

/** A clock to the minute ("09:39") and its machine form. */
export function formatClock(time: Date | number, { timeZone, locale }: TimeOptions = {}) {
  const p = parts(new Date(time), "en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const text = new Intl.DateTimeFormat(locale, { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(new Date(time));
  return { text, dateTime: `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}` };
}

/** A day ("1 Nov"), with the year only when it is not the year of `now` ("4 Jan 2025"), and its machine form ("2026-11-01"). */
export function formatDay(time: Date | number, { now = new Date(), timeZone, locale = "en-GB" }: TimeOptions & { now?: Date | number } = {}) {
  const at = new Date(time);
  const year = (d: Date) => parts(d, "en-US", { timeZone, year: "numeric" }).year;
  const text = new Intl.DateTimeFormat(locale, { timeZone, day: "numeric", month: "short", ...(year(at) === year(new Date(now)) ? {} : { year: "numeric" }) }).format(at);
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

// ---- one shared timer
// Every clock and countdown on a page shares one interval, created by the first subscriber and cleared with the last: nothing runs at
// import, and a hundred clocks are one timer.
let listeners: Set<(now: number) => void> | undefined;
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: (now: number) => void) {
  (listeners ??= new Set()).add(listener);
  if (timer === undefined) timer = setInterval(() => { for (const l of listeners ?? []) l(Date.now()); }, 1000);
  return () => {
    listeners?.delete(listener);
    if (!listeners?.size && timer !== undefined) { clearInterval(timer); timer = undefined; }
  };
}

/**
 * The current time, ticking by the `every` second or minute. `data-loops="held"` freezes it at the value it shows, and releasing the hold
 * writes the current time at once. Nothing here is a live region: the element's own text is the value. With `now` given, it is that, and
 * nothing ticks (for a fixed render or a test). Reduced motion does not stop it: it is text, not motion.
 */
export function useNow(every: "second" | "minute" = "second", fixed?: Date | number): number {
  const { held } = useLoops();
  const [now, setNow] = React.useState(() => (fixed !== undefined ? new Date(fixed).getTime() : Date.now()));
  React.useEffect(() => {
    if (fixed !== undefined) { setNow(new Date(fixed).getTime()); return; }
    if (held) return;
    setNow(Date.now());
    const step = every === "minute" ? 60000 : 1000;
    return subscribe((t) => setNow((previous) => (Math.floor(t / step) === Math.floor(previous / step) ? previous : t)));
  }, [every, fixed, held]);
  return now;
}

export interface ClockProps extends Omit<React.ComponentProps<"time">, "children" | "dateTime"> {
  /** The zone the clock is read in: an IANA name. Defaults to the runtime's. */
  timeZone?: string;
  locale?: string | string[];
  /** A fixed moment in place of the running clock (nothing ticks). */
  now?: Date | number;
}

/** A clock to the minute: a `time` in tabular figures that ticks by the minute and holds under `data-loops="held"`. */
export function Clock({ timeZone, locale, now: fixed, className, ...props }: ClockProps) {
  const now = useNow("minute", fixed);
  const { text, dateTime } = formatClock(now, { timeZone, locale });
  return <time {...props} dateTime={dateTime} className={join("basalt-time", className)}>{text}</time>;
}

export interface CountdownProps extends Omit<React.ComponentProps<"time">, "children" | "dateTime"> {
  /** The moment it counts down to. */
  to: Date | number;
  /** What it says once the moment has passed. It is reserved in the same cell, so the width never changes. Default "Now". */
  done?: React.ReactNode;
  /** A fixed "now" in place of the running clock (nothing ticks). */
  now?: Date | number;
}

/**
 * A countdown by the second ("18d 09:10:51"): a `time` in tabular figures, with a machine duration. It ticks by the second, holds under
 * `data-loops="held"`, is no live region and is not stopped by reduced motion. Its completed wording stands in the same cell.
 */
export function Countdown({ to, done = "Now", now: fixed, className, ...props }: CountdownProps) {
  const now = useNow("second", fixed);
  const left = formatCountdown(to, now);
  return (
    <time {...props} dateTime={left?.dateTime ?? "PT0S"} className={join("basalt-time basalt-countdown", className)}>
      <Reserve show={left ? "left" : "done"} alternatives={{ left: left?.text ?? "", done }} />
    </time>
  );
}

export interface DateAgeProps extends Omit<React.ComponentProps<"span">, "children"> {
  time: Date | number;
  timeZone?: string;
  locale?: string | string[];
  /** What counts as now, for the age and for leaving out this year. Defaults to the clock when the page renders. */
  now?: Date | number;
  /** The narrow column's form ("11d") in place of the words ("11 days ago"). */
  short?: boolean;
}

/**
 * A date with its age beside it: "1 Nov · 11 days ago". The age is never alone (DECISIONS 162, V13): the absolute date is always drawn,
 * and the age is tertiary beside it. Not for a `Stat`'s source line, which stays absolute.
 */
export function DateAge({ time, timeZone, locale, now: nowProp, short = false, className, ...props }: DateAgeProps) {
  const [fallback] = React.useState(() => Date.now());
  const now = nowProp ?? fallback;
  const day = formatDay(time, { now, timeZone, locale });
  return (
    <span {...props} className={join("basalt-date-age", className)}>
      <time dateTime={day.dateTime} className="basalt-time">{day.text}</time>
      <span className="basalt-date-age-age"><span aria-hidden="true">·</span><span className="basalt-visually-hidden">, </span>{short ? <Reserve className="basalt-date-age-seat" show="age" alternatives={{ age: formatAge(time, now, { short }), widest: "548mo" }} /> : formatAge(time, now)}</span>
    </span>
  );
}
