import * as React from "react";

import { join } from "./utils";

// A coverage strip (DECISIONS 153, vote 14, consent rows 6 to 8): one cell a day, lit when the day was recorded, the hatch when it was not, and the missing dates in
// words beside it. The cells are decoration; the words say it, built from the cells so they cannot drift. Nothing here runs when the module loads.

export interface CoverageDay {
  /** The day, as an ISO date ("2026-11-10"). Days are UTC dates, oldest first. */
  date: string;
  recorded: boolean;
  /** Why a day was not recorded ("watch not worn"). Said in the words. */
  why?: string | null;
  /**
   * The day had an event (cimip-gaps-3 T2, item 6), whether it was recorded or not: a dot under its cell and a sentence in the words. A string is the
   * event's note ("harvest fair"). It never changes the cell or the recorded count.
   */
  event?: boolean | string;
}

export interface CoverageStripProps extends Omit<React.ComponentProps<"div">, "children"> {
  days: CoverageDay[];
  /** `"strip"`: a sliver a day in one row, 48px tall (84 days is a source's quarter). `"week"`: seven squares for a week. */
  form?: "strip" | "week";
  locale?: string;
  /** The events sentence's word, after its dot ("Markets: Oct 3, Nov 1."). Default "Events". */
  eventLabel?: string;
}

const parse = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
};

/**
 * A range of days in words: the month once when both days share it, the locale's own order, and "to" where the locale puts its range mark.
 * "Oct 20 to 21" and "Oct 31 to Nov 2" in `en-US`, "20 to 21 Oct" in `en-GB` (DECISIONS 200). Built from the formatter's range parts, never from a string.
 */
function dayRange(format: Intl.DateTimeFormat, from: number, to: number): string {
  const parts = format.formatRangeToParts(from, to);
  const last = parts.map((part) => part.source).lastIndexOf("startRange");
  const next = parts.findIndex((part) => part.source === "endRange");
  if (last < 0 || next < 0) return format.formatRange(from, to);
  return parts.map((part, i) => (i <= last || i >= next ? part.value : i === last + 1 ? " to " : "")).join("");
}

/** Adjacent days that share a test and a note, as written ranges: "Nov 3 to 5 (watch not worn)", "Nov 9". */
function ranges(days: ReadonlyArray<CoverageDay>, take: (day: CoverageDay) => boolean, note: (day: CoverageDay) => string | null, short: Intl.DateTimeFormat, withDay: Intl.DateTimeFormat, week: boolean) {
  const runs: Array<{ from: CoverageDay; to: CoverageDay; note: string | null }> = [];
  days.forEach((day, i) => {
    if (!take(day)) return;
    const last = runs[runs.length - 1];
    const before = days[i - 1];
    // A run is adjacent days with the same note (none is a note): each day keeps the note it was given.
    if (last && before && take(before) && last.note === note(day)) last.to = day; else runs.push({ from: day, to: day, note: note(day) });
  });
  return runs.map(({ from, to, note: why }) => {
    const a = parse(from.date);
    const b = parse(to.date);
    const text = from === to ? (week ? withDay : short).format(a) : dayRange(short, a, b);
    return why ? `${text} (${why})` : text;
  });
}

const hasEvent = (day: CoverageDay) => day.event === true || (typeof day.event === "string" && day.event !== "");

/** The words in their parts: the lead, the missing sentence and the events sentence (its label and list), so the strip can draw the events' dot. */
function coverageParts(days: ReadonlyArray<CoverageDay>, { locale = "en-US", week = false, eventLabel = "Events" }: { locale?: string; week?: boolean; eventLabel?: string }) {
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const withDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const recorded = days.filter((day) => day.recorded).length;
  const lead = `${recorded} of ${days.length} ${days.length === 1 ? "day" : "days"} recorded.`;
  const missing = ranges(days, (day) => !day.recorded, (day) => day.why ?? null, short, withDay, week);
  const events = ranges(days, hasEvent, (day) => (typeof day.event === "string" && day.event !== "" ? day.event : null), short, withDay, week);
  return {
    lead,
    missing: missing.length ? `Not recorded: ${missing.join(", ")}.` : null,
    events: events.length ? { label: eventLabel, list: `${events.join(", ")}.` } : null,
  };
}

/**
 * The words for what was not recorded, from the cells: "42 of 84 days recorded. Not recorded: Nov 3 to 5 (watch not worn), Nov 9." Days with an event add a
 * sentence after it, built the same way: "Markets: Oct 3, Oct 17 to 18 (harvest fair), Nov 1." With no event the words are as before.
 */
export function coverageWords(days: ReadonlyArray<CoverageDay>, { locale = "en-US", week = false, eventLabel = "Events" }: { locale?: string; week?: boolean; eventLabel?: string } = {}): string {
  const { lead, missing, events } = coverageParts(days, { locale, week, eventLabel });
  return [lead, missing, events ? `${events.label}: ${events.list}` : null].filter(Boolean).join(" ");
}

/** One cell a day, and the words. A missing day is Basalt's hatch, never a zero. */
export function CoverageStrip({ days, form = "strip", locale, eventLabel = "Events", className, ...props }: CoverageStripProps) {
  const words = React.useMemo(() => coverageParts(days, { locale, week: form === "week", eventLabel }), [days, locale, form, eventLabel]);
  const anyEvent = days.some(hasEvent);
  return (
    <div {...props} className={join("basalt-coverage", className)} data-form={form} data-events={anyEvent ? "" : undefined}>
      <div className="basalt-coverage-cells" aria-hidden="true" style={{ "--_n": days.length } as React.CSSProperties}>
        {days.map((day) => <i key={day.date} className="basalt-coverage-cell" data-missing={day.recorded ? undefined : ""} />)}
      </div>
      {/* The events' lane: held whenever any day has one, a dot under each such cell (as wide as its cell where the cell is narrower than the dot). */}
      {anyEvent ? (
        <div className="basalt-coverage-events" aria-hidden="true" style={{ "--_n": days.length } as React.CSSProperties}>
          {days.map((day) => <i key={day.date} className="basalt-coverage-event" data-on={hasEvent(day) ? "" : undefined} />)}
        </div>
      ) : null}
      <p className="basalt-coverage-words">
        {words.lead}
        {words.missing ? <>{" "}{words.missing}</> : null}
        {words.events ? <>{" "}<span className="basalt-coverage-key" aria-hidden="true" />{words.events.label}: {words.events.list}</> : null}
      </p>
    </div>
  );
}
