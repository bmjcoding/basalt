import * as React from "react";

import { formatAge, formatClock, formatCountdown, formatDay, formatStamp, formatStatTime, formatUntil } from "./time-format";
import type { TimeOptions } from "./time-format";
import { DotSep } from "./dot-sep";
import { useLoops } from "./loops";
import { Reserve } from "./reserve";
import { useMergedRef } from "./merged-ref";
import { join } from "./utils";

// ---- Time parts (DECISIONS 162, X11; V13 and V14) ----
// The three elements that stand on the formatters in `time-format.ts` (which draw nothing and carry no `"use client"`): a clock that ticks by the minute, a countdown that ticks by
// the second, and a date with its age beside it. Each is a `time` element with a machine `datetime`, in tabular figures, so a changing
// value never changes its width. The zone is an argument, never a place.

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

// ---- hydration
// A running part reads the wall clock where it is drawn, so the server's text and the client's differ whenever time passes between the
// two (a minute for a clock, a second for a countdown). The part says so (`suppressHydrationWarning`: React keeps the server's
// text for that pass and reports nothing), and once the client has drawn it the element is replaced under a new key, so what stays is
// the client's time, never the server's stale one. A page the client draws alone has no such pass and no replacement.
const quiet = () => () => {};
function useDrawn() {
  return React.useSyncExternalStore(quiet, () => true, () => false);
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
  const drawn = useDrawn();
  const running = fixed === undefined;
  return <time key={running && !drawn ? "server" : "client"} suppressHydrationWarning={running || undefined} {...props} dateTime={dateTime} className={join("basalt-time", className)}>{text}</time>;
}

export interface CountdownProps extends Omit<React.ComponentProps<"time">, "children" | "dateTime"> {
  /** The moment it counts down to. */
  to: Date | number;
  /** What it says once the moment has passed. It is reserved in the same cell, so the width never changes. Default "Now". */
  done?: React.ReactNode;
  /** A fixed "now" in place of the running clock (nothing ticks). */
  now?: Date | number;
  /**
   * `clock` (the default) is "18d 09:10:51" by the second; `words` is "in 12 min" (cimip-gaps-3 T2, 4b, `formatUntil`): rounded down, sans and tabular in the
   * surrounding text's size, re-drawn only when the words change. Its `datetime` stays the real time left to the second.
   */
  form?: "clock" | "words";
  /** Writes the words for another language, from the milliseconds left (more than 0). `form="words"` only. */
  format?: (ms: number) => string;
  /** The widest words the cell must hold, drawn unseen in the same cell, for a column that must not change width ("in 23 hr 59 min"). */
  widest?: string;
}

/**
 * A countdown by the second ("18d 09:10:51"): a `time` in tabular figures, with a machine duration. It ticks by the second, holds under
 * `data-loops="held"`, is no live region and is not stopped by reduced motion. Its completed wording stands in the same cell.
 */
export function Countdown({ to, done = "Now", now: fixed, form = "clock", format, widest, className, ...props }: CountdownProps) {
  if (form === "words") return <CountdownWords to={to} done={done} fixed={fixed} format={format} widest={widest} className={className} {...props} />;
  return <CountdownClock to={to} done={done} fixed={fixed} widest={widest} className={className} {...props} />;
}

type CountdownPartProps = Omit<CountdownProps, "now" | "form"> & { fixed?: Date | number };

function CountdownClock({ to, done = "Now", fixed, widest, className, ...props }: CountdownPartProps) {
  const now = useNow("second", fixed);
  const left = formatCountdown(to, now);
  // Once it has run, its last reading stays in the cell after it completes, so the cell keeps the room the time took and the width does not change.
  const last = React.useRef("");
  if (left) last.current = left.text;
  const drawn = useDrawn();
  const running = fixed === undefined;
  return (
    <time key={running && !drawn ? "server" : "client"} suppressHydrationWarning={running || undefined} {...props} dateTime={left?.dateTime ?? "PT0S"} className={join("basalt-time basalt-countdown", className)}>
      <Reserve live={running} suppressHydrationWarning={running || undefined} show={left ? "left" : "done"} alternatives={{ left: left?.text ?? last.current, done, ...(widest ? { widest } : {}) }} />
    </time>
  );
}

/** The words form: one shared timer by the second, and a render only when the words change, so the words turn within a second of each boundary. */
function CountdownWords({ to, done = "Now", fixed, format, widest, className, ref, ...props }: CountdownPartProps) {
  const { held } = useLoops();
  const own = React.useRef<HTMLTimeElement>(null);
  const setRef = useMergedRef(own, ref);
  const target = new Date(to).getTime();
  const wordsAt = React.useCallback((t: number) => {
    const ms = target - t;
    if (!(ms >= 1000)) return "\u0000done";
    return format ? format(ms) : formatUntil(target, t)?.text ?? "\u0000done";
  }, [target, format]);
  const [now, setNow] = React.useState(() => (fixed !== undefined ? new Date(fixed).getTime() : Date.now()));
  React.useEffect(() => {
    if (fixed !== undefined) { setNow(new Date(fixed).getTime()); return; }
    // Frozen under the hold; written afresh on release.
    if (held) return;
    setNow(Date.now());
    // The words draw again only when they change; the duration is the real time left, written on the element each second (held with the words).
    return subscribe((t) => {
      own.current?.setAttribute("datetime", formatUntil(target, t)?.dateTime ?? "PT0S");
      setNow((previous) => (wordsAt(previous) === wordsAt(t) ? previous : t));
    });
  }, [fixed, held, wordsAt, target]);
  const left = formatUntil(target, now);
  const text = left ? (format ? format(target - now) : left.text) : null;
  const last = React.useRef("");
  if (text) last.current = text;
  const drawn = useDrawn();
  const running = fixed === undefined;
  return (
    <time key={running && !drawn ? "server" : "client"} suppressHydrationWarning={running || undefined} {...props} ref={setRef} dateTime={left?.dateTime ?? "PT0S"} className={join("basalt-time basalt-countdown", className)} data-form="words">
      <Reserve live={running} suppressHydrationWarning={running || undefined} show={text ? "left" : "done"} alternatives={{ left: text ?? last.current, done, ...(widest ? { widest } : {}) }} />
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
  /**
   * `day` (the default) writes the date ("Nov 1 · 11 days ago"); `minute` writes the time of day first (cimip-gaps-3 T2, 4a): "7:06 PM · 19 minutes ago",
   * "Nov 24, 7:06 PM · 1 day ago", the year only when it differs. With no `now`, the minute form ticks by the minute and holds under `data-loops="held"`.
   */
  precision?: "day" | "minute";
}

/**
 * A date with its age beside it: "Nov 1 · 11 days ago". The age is never alone (DECISIONS 162, V13): the absolute date is always drawn,
 * and the age is tertiary beside it. Not for a `Stat`'s source line, which stays absolute.
 */
export function DateAge({ time, timeZone, locale, now: nowProp, short = false, precision = "day", className, ...props }: DateAgeProps) {
  if (precision === "minute") return <DateAgeMinute time={time} timeZone={timeZone} locale={locale} fixed={nowProp} short={short} className={className} {...props} />;
  return <DateAgeDay time={time} timeZone={timeZone} locale={locale} now={nowProp} short={short} className={className} {...props} />;
}

function DateAgeDay({ time, timeZone, locale, now: nowProp, short = false, className, ...props }: Omit<DateAgeProps, "precision">) {
  const [fallback] = React.useState(() => Date.now());
  const now = nowProp ?? fallback;
  const day = formatDay(time, { now, timeZone, locale });
  const drawn = useDrawn();
  const running = nowProp === undefined;
  const quietly = running || undefined;
  return (
    <span key={running && !drawn ? "server" : "client"} {...props} className={join("basalt-date-age", className)}>
      <time dateTime={day.dateTime} className="basalt-time" suppressHydrationWarning={quietly}>{day.text}</time>
      <span className="basalt-date-age-age" suppressHydrationWarning={quietly}><DotSep />{short ? <Reserve live={running} suppressHydrationWarning={quietly} className="basalt-date-age-seat" show="age" alternatives={{ age: formatAge(time, now, { short }), widest: "548mo" }} /> : formatAge(time, now)}</span>
    </span>
  );
}

/** The minute form: the time of day (the date added on another day), then the age; it ticks by the minute on the shared timer unless `now` is fixed. */
function DateAgeMinute({ time, timeZone, locale, fixed, short = false, className, ...props }: Omit<DateAgeProps, "precision" | "now"> & { fixed?: Date | number }) {
  const now = useNow("minute", fixed);
  const at = formatStatTime(time, { now, timeZone, locale });
  const drawn = useDrawn();
  const running = fixed === undefined;
  const quietly = running || undefined;
  return (
    <span key={running && !drawn ? "server" : "client"} {...props} className={join("basalt-date-age", className)} data-precision="minute">
      <time dateTime={at.dateTime} className="basalt-time" suppressHydrationWarning={quietly}>{at.text}</time>
      <span className="basalt-date-age-age" suppressHydrationWarning={quietly}><DotSep />{short ? <Reserve live={running} suppressHydrationWarning={quietly} className="basalt-date-age-seat" show="age" alternatives={{ age: formatAge(time, now, { short }), widest: "548mo" }} /> : formatAge(time, now)}</span>
    </span>
  );
}
