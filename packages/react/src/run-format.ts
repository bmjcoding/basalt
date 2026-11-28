// The plain parts of stages and runs (DECISIONS 316): the states, their default words and a run's time as text. No React and no directive, so a Server
// Component can read them (test/server-modules.test.mjs).

// A value and its unit are glued by a no-break space (micro-details m2 T8); the space between two pairs stays breakable.
const NB = "\u00a0";

/**
 * A stage's or a step's state. The words are the app's (`word`); these are the marks. `queued` waits and could start at any moment; `idle` is a stage
 * the sequence has not reached yet ("Not started"), whose still mark never animates (cimip-gaps-3 T1). `warning` is an ending that is not a pass and not a
 * failure (cimip-gaps-3 T2): its word is the app's ("Expired", "Timed out", "Partial").
 */
export type StageState = "queued" | "running" | "success" | "failed" | "skipped" | "canceled" | "retrying" | "idle" | "warning";

/** The default word for each state, US English. An app may change any of them. */
export const STAGE_WORDS: Readonly<Record<StageState, string>> = {
  idle: "Not started",
  queued: "Queued",
  running: "Running",
  success: "Passed",
  failed: "Failed",
  skipped: "Skipped",
  canceled: "Canceled",
  retrying: "Retrying",
  warning: "Warning",
};

export type Moment = Date | number;
export type RunTimeScale = "seconds" | "minutes" | "hours";

/**
 * How finely a running time is written: `exact` (today's forms, to the tenth under a minute) or `minute`, the whole minute a running timer counts in
 * under reduced motion ("<1 min", "4 min", "1 hr 12 min", "3 days"), changing once a minute.
 */
export type RunTimeGrain = "exact" | "minute";

/**
 * A length of work as a person reads it ("12.3 s", "12 min 34 s", "12 hr 34 min", "3 days"), and its ISO 8601 duration. US English. At the `minute`
 * grain the length is floored to the whole minute ("<1 min", "4 min"), its `dateTime` floored with it (`PT0M`, `PT4M`), and `spoken` is set for the
 * under-a-minute form ("less than 1 minute"), whose drawn "<1 min" is short for the ear. Each value is glued to its unit by a no-break space.
 */
export function formatRunTime(ms: number, grain: RunTimeGrain = "exact"): { text: string; dateTime: string; spoken?: string } {
  const t = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  if (grain === "minute" && t < 3_600_000) {
    const m = Math.floor(t / 60_000);
    if (m === 0) return { text: `<1${NB}min`, dateTime: "PT0M", spoken: "less than 1 minute" };
    return { text: `${m}${NB}min`, dateTime: `PT${m}M` };
  }
  if (t < 60_000) {
    // Tenths, cut and never rounded up: 59.96 s is "59.9 s", never "60.0 s".
    const tenths = Math.floor(t / 100);
    const text = `${Math.floor(tenths / 10)}.${tenths % 10}${NB}s`;
    return { text, dateTime: `PT${Math.floor(tenths / 10)}.${tenths % 10}S` };
  }
  const s = Math.floor(t / 1000);
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return { text: `${m}${NB}min ${s % 60}${NB}s`, dateTime: `PT${m}M${s % 60}S` };
  }
  // From an hour the exact forms are already whole minutes (and whole days), so both grains write them.
  const minutes = Math.floor(s / 60);
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    return { text: `${h}${NB}hr ${minutes % 60}${NB}min`, dateTime: `PT${h}H${minutes % 60}M` };
  }
  const d = Math.floor(minutes / 1440);
  return { text: `${d}${NB}${d === 1 ? "day" : "days"}`, dateTime: `P${d}D` };
}
