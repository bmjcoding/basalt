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
}

export interface CoverageStripProps extends Omit<React.ComponentProps<"div">, "children"> {
  days: CoverageDay[];
  /** `"strip"`: a sliver a day in one row, 48px tall (84 days is a source's quarter). `"week"`: seven squares for a week. */
  form?: "strip" | "week";
  locale?: string;
}

const parse = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
};

/** The words for what was not recorded, from the cells: "42 of 84 days recorded. Not recorded: 3 to 5 Nov (watch not worn), 9 Nov." */
export function coverageWords(days: ReadonlyArray<CoverageDay>, { locale = "en-GB", week = false }: { locale?: string; week?: boolean } = {}): string {
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const withDay = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const recorded = days.filter((day) => day.recorded).length;
  const lead = `${recorded} of ${days.length} ${days.length === 1 ? "day" : "days"} recorded.`;
  const runs: Array<{ from: CoverageDay; to: CoverageDay; why: string | null }> = [];
  days.forEach((day, i) => {
    if (day.recorded) return;
    const last = runs[runs.length - 1];
    const before = days[i - 1];
    // A run is adjacent missing days with the same reason (none is a reason): each day keeps the reason it was given.
    if (last && before && !before.recorded && last.why === (day.why ?? null)) last.to = day; else runs.push({ from: day, to: day, why: day.why ?? null });
  });
  if (!runs.length) return lead;
  const list = runs.map(({ from, to, why }) => {
    const a = parse(from.date);
    const b = parse(to.date);
    const text = from === to ? (week ? withDay : short).format(a) : `${short.format(a)} to ${short.format(b)}`;
    return why ? `${text} (${why})` : text;
  });
  return `${lead} Not recorded: ${list.join(", ")}.`;
}

/** One cell a day, and the words. A missing day is Basalt's hatch, never a zero. */
export function CoverageStrip({ days, form = "strip", locale, className, ...props }: CoverageStripProps) {
  const words = React.useMemo(() => coverageWords(days, { locale, week: form === "week" }), [days, locale, form]);
  return (
    <div {...props} className={join("basalt-coverage", className)} data-form={form}>
      <div className="basalt-coverage-cells" aria-hidden="true" style={{ "--_n": days.length } as React.CSSProperties}>
        {days.map((day) => <i key={day.date} className="basalt-coverage-cell" data-missing={day.recorded ? undefined : ""} />)}
      </div>
      <p className="basalt-coverage-words">{words}</p>
    </div>
  );
}
