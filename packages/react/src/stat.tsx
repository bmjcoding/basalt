import * as React from "react";

import { join } from "./utils";

export interface StatsProps extends Omit<React.ComponentProps<"dl">, "children"> {
  /** The narrowest a stat gets before the row wraps: a CSS length, or a number of px. Default 10rem. */
  min?: string | number;
  children: React.ReactNode;
}

/** A row of figures on the page, never boxed: up to three that matter, or one headline. One `dl`; each `Stat` is a `div` in it. */
export function Stats({ min, style, className, children, ...props }: StatsProps) {
  const width = typeof min === "number" ? `${min}px` : min;
  return (
    <dl {...props} className={join("basalt-stats", className)} style={width ? ({ "--min": width, ...style } as React.CSSProperties) : style}>
      {children}
    </dl>
  );
}

export interface StatProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** What the figure measures. */
  label: React.ReactNode;
  /** The figure. */
  value: React.ReactNode;
  /** What the figure means: "−0.6 kg this week". Interpretation, not evidence. */
  note?: React.ReactNode;
  /** Where the figure came from: "Scale". Without it the source line is left out. */
  source?: React.ReactNode;
  /** When it was measured. Always written absolute ("04:41"), never "2 min ago". */
  time?: Date | number;
  /** The zone the time is written in: an IANA name. Defaults to the runtime's. */
  timeZone?: string;
  /** What counts as today, for the date to be left out of the time. Defaults to now. */
  now?: Date | number;
  locale?: string | string[];
}

function parts(date: Date, locale: string | string[] | undefined, options: Intl.DateTimeFormatOptions) {
  const out: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat(locale, options).formatToParts(date)) out[part.type] = part.value;
  return out;
}

/**
 * The time of a reading as the stat writes it, and its machine form: the clock alone for today ("04:41"), the date added for
 * another day ("Nov 7, 08:02"), and the year only when it differs from this one ("Nov 7, 2025, 08:02").
 */
export function formatStatTime(time: Date | number, { now = new Date(), timeZone, locale }: { now?: Date | number; timeZone?: string; locale?: string | string[] } = {}) {
  const at = new Date(time);
  const base: Intl.DateTimeFormatOptions = { timeZone, hourCycle: "h23" };
  const clock = new Intl.DateTimeFormat(locale, { ...base, hour: "2-digit", minute: "2-digit" }).format(at);
  const day = (d: Date) => parts(d, "en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const [then, today] = [day(at), day(new Date(now))];
  const sameDay = then.year === today.year && then.month === today.month && then.day === today.day;
  const sameYear = then.year === today.year;
  const date = new Intl.DateTimeFormat(locale, { timeZone, month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(at);
  const stamp = parts(at, "en-US", { ...base, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return {
    text: sameDay ? clock : `${date}, ${clock}`,
    dateTime: `${stamp.year}-${stamp.month}-${stamp.day}T${stamp.hour === "24" ? "00" : stamp.hour}:${stamp.minute}`,
  };
}

/**
 * One figure: a label, the figure, a note and, below them all, where it came from and when. A `div` of a `dl`: the label is the
 * `dt`; the figure, the note and the source are `dd`s. The source is pinned to the foot of the stat's cell, so sources line up
 * across a row even when one stat has no note.
 */
export function Stat({ label, value, note, source, time, timeZone, now, locale, className, ...props }: StatProps) {
  const stamp = source !== undefined && source !== null && time !== undefined ? formatStatTime(time, { now, timeZone, locale }) : null;
  return (
    <div {...props} className={join("basalt-stat", className)}>
      <dt className="basalt-stat-label">{label}</dt>
      <dd className="basalt-stat-value">{value}</dd>
      {note ? <dd className="basalt-stat-note">{note}</dd> : null}
      {source !== undefined && source !== null ? (
        <dd className="basalt-stat-source">
          {stamp ? (
            <>
              <time dateTime={stamp.dateTime}>{stamp.text}</time>{" "}
              <span aria-hidden="true">·</span>
              <span className="basalt-visually-hidden">, </span>{" "}
            </>
          ) : null}
          {source}
        </dd>
      ) : null}
    </div>
  );
}
