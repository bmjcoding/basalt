// The plain parts of stages and runs (DECISIONS 316): the states, their default words and a run's time as text. No React and no directive, so a Server
// Component can read them (test/server-modules.test.mjs).

/** A stage's or a step's state. The words are the app's (`word`); these are the marks. */
/** `warning` is an ending that is not a pass and not a failure (cimip-gaps-3 T2): its word is the app's ("Expired", "Timed out", "Partial"). */
export type StageState = "queued" | "running" | "success" | "failed" | "skipped" | "canceled" | "retrying" | "warning";

/** The default word for each state, US English. An app may change any of them. */
export const STAGE_WORDS: Readonly<Record<StageState, string>> = {
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

/** A length of work as a person reads it ("12.3 s", "12 min 34 s", "12 hr 34 min", "3 days"), and its ISO 8601 duration. US English. */
export function formatRunTime(ms: number): { text: string; dateTime: string } {
  const t = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  if (t < 60_000) {
    // Tenths, cut and never rounded up: 59.96 s is "59.9 s", never "60.0 s".
    const tenths = Math.floor(t / 100);
    const text = `${Math.floor(tenths / 10)}.${tenths % 10} s`;
    return { text, dateTime: `PT${Math.floor(tenths / 10)}.${tenths % 10}S` };
  }
  const s = Math.floor(t / 1000);
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return { text: `${m} min ${s % 60} s`, dateTime: `PT${m}M${s % 60}S` };
  }
  const minutes = Math.floor(s / 60);
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    return { text: `${h} hr ${minutes % 60} min`, dateTime: `PT${h}H${minutes % 60}M` };
  }
  const d = Math.floor(minutes / 1440);
  return { text: `${d} ${d === 1 ? "day" : "days"}`, dateTime: `P${d}D` };
}

