// A release's ship date (DECISIONS 320, 1.1): a calendar date written once, `YYYY-MM-DD`, drawn "Nov 23, 2026" with its year always, and never
// moved by a reader's time zone, so it cannot show the day before. It draws nothing and holds no state; nothing runs when the module loads.

/** The parts of an ISO calendar date, or null when it is not one. */
export function calendarDate(iso: string): { year: number; month: number; day: number } | null {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const at = new Date(Date.UTC(year, month - 1, day));
  return at.getUTCFullYear() === year && at.getUTCMonth() === month - 1 && at.getUTCDate() === day ? { year, month, day } : null;
}

/** "Nov 23, 2026" in `en-US`: the locale's short date with its year, read in UTC so the day never moves. A string that is not a date is returned as it is. */
export function formatReleaseDate(iso: string, locale: string | string[] = "en-US"): string {
  const date = calendarDate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
}
