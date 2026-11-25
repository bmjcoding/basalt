import * as React from "react";

import { useLoops } from "./loops";
import { Reserve } from "./reserve";
import { formatRunTime } from "./run-format";
import type { Moment, RunTimeScale } from "./run-format";
import { formatClock, formatDay } from "./time-format";
import { warnRun } from "./run-warn";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- A run's time (DECISIONS 316, 1.9) ----
// Tabular figures in Geist Mono at text-xs, tertiary, a `time` element with an ISO duration, never a live region. Under a minute it is "12.3 s" and
// changes every 100ms (at the minutes or hours scale "45 s", by the second: those seats count in whole units); to an hour "12 min 34 s", by the second; to a day "12 hr 34 min", by the minute; then "3 days". One shared interval, made by
// its first reader and cleared with its last: nothing runs at import. It stands in one `Reserve` cell as wide as the longest form its scale can show,
// end-aligned, never empty, so a column of times is one width from the first frame.

const ORDER: Record<RunTimeScale, number> = { seconds: 0, minutes: 1, hours: 2 };
/** The widest form each scale can show, in tabular figures. */
const WIDEST: Record<RunTimeScale, string> = { seconds: "00.0 s", minutes: "00 min 00 s", hours: "00 hr 00 min" };

/** The scale a length needs: seconds under a minute, minutes under an hour, hours after. */
const scaleFor = (ms: number): RunTimeScale => (ms < 60_000 ? "seconds" : ms < 3_600_000 ? "minutes" : "hours");

// ---- one shared interval
let listeners: Set<() => void> | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
function subscribe(listener: () => void) {
  (listeners ??= new Set()).add(listener);
  // 100ms: the finest a time can change. A reader whose text has not changed renders nothing (React keeps the same string).
  if (timer === undefined) timer = setInterval(() => { for (const l of listeners ?? []) l(); }, 100);
  return () => {
    listeners?.delete(listener);
    if (!listeners?.size && timer !== undefined) { clearInterval(timer); timer = undefined; }
  };
}

// ---- one scale for a list's timers
interface ScaleContext { scale: RunTimeScale; grow: (scale: RunTimeScale) => void }
const RunTimeScaleContext = React.createContext<ScaleContext | null>(null);

/**
 * A list's one scale for all its timers (`StageList`, `StageRail`, `RunTimeline`). A time that outgrows it is still written whole; every seat in the
 * list widens together, once, and development warns. `cap` is the widest the list allows (a rail stops at minutes).
 */
export function useRunTimeScale(given: RunTimeScale, cap: RunTimeScale = "hours") {
  const [grown, setGrown] = React.useState<RunTimeScale>(given);
  const scale = ORDER[grown] > ORDER[given] ? grown : given;
  const value = React.useMemo<ScaleContext>(() => ({
    scale,
    grow: (needed) => setGrown((was) => (ORDER[needed] > ORDER[was] && ORDER[needed] <= ORDER[cap] ? needed : was)),
  }), [scale, cap]);
  return { scale, provide: (children: React.ReactNode) => <RunTimeScaleContext.Provider value={value}>{children}</RunTimeScaleContext.Provider> };
}

export interface RunTimerProps {
  /** When the work (this attempt) started. Left out, the timer holds its room and shows nothing. */
  start?: Moment;
  /** When it stopped. Given, the time is frozen at `end - start` (plus `carried`). */
  end?: Moment;
  /** What earlier attempts took, so a retry counts on from the frozen figure and never over the wait. */
  carried?: number;
  /** When the work first started (before any retry): what the held form says. Left out, `start`. */
  since?: Moment;
  /** The longest form the seat holds: "00.0 s" (the default), "00 min 00 s" or "00 hr 00 min". A list's `timeScale` sets it for all its timers. */
  scale?: RunTimeScale;
  /**
   * Under `data-loops="held"`, while running: "started" (the default) shows when the work first started ("Started 3:47 PM", with the date for another
   * day) in a seat that holds it; "hidden" hides the figure with its box kept and writes the current one on release. A finished time stays.
   */
  whenHeld?: "started" | "hidden";
  locale?: string;
  /** Writes a length for an app in another language. It must return the same width for a scale's widest form. The seat's width follows it. */
  format?: (ms: number) => string;
  /**
   * Says a length, when the drawn form is short for the ear ("3m 4s" spoken "3 minutes 4 seconds"). Given, the drawn figure is hidden from assistive
   * technology and this is read in its place, once: never a live region. `dateTime` stays the ISO duration. The held, hidden and started-at forms are
   * unchanged. Left out, the drawn figure is what is read.
   */
  spoken?: (ms: number) => string;
  className?: string;
}

/**
 * Room for the held form of a run that started today, at its widest ("Started 12:59 PM"). A run that started on another day widens the seat once
 * when the hold is pressed, as a time that outgrows its scale does (DECISIONS 316, ruling 6): the dated form is not held from the first frame.
 */
function heldSample(locale: string | undefined) {
  return { heldSeat: `Started ${formatClock(new Date(2026, 11, 30, 12, 59), { locale }).text}` };
}

// ---- printing: a page being printed is held, so a running time prints the form the hold shows (DECISIONS 316, 1.11). The print media and the
// browser's own beforeprint are listened to by the first reader, never at import.
let printReaders: Set<() => void> | undefined;
let printQuery: MediaQueryList | undefined;
let printingNow = false;
function subscribePrint(notify: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  if (!printReaders) {
    printReaders = new Set();
    printQuery = window.matchMedia("print");
    const tell = () => { for (const n of printReaders ?? []) n(); };
    printQuery.addEventListener("change", tell);
    window.addEventListener("beforeprint", () => { printingNow = true; tell(); });
    window.addEventListener("afterprint", () => { printingNow = false; tell(); });
  }
  printReaders.add(notify);
  return () => { printReaders?.delete(notify); };
}
const printing = () => printingNow || (printQuery?.matches ?? false);
const usePrinting = () => React.useSyncExternalStore(subscribePrint, printing, () => false);

function heldText(since: number, now: number, locale: string | undefined) {
  const clock = formatClock(since, { locale });
  const sameDay = new Date(since).toDateString() === new Date(now).toDateString();
  if (sameDay) return { show: "held", text: `Started ${clock.text}`, dateTime: clock.dateTime };
  return { show: "heldDay", text: `Started ${formatDay(since, { now, locale }).text}, ${clock.text}`, dateTime: clock.dateTime };
}

/**
 * How long a run, a stage or a step has taken (DECISIONS 316, 1.9). Counts from `start` while there is no `end`, frozen once there is; `carried` is
 * added. Never a live region: a run's announcer says its time once, at the end.
 */
export function RunTimer({ start, end, carried = 0, since, scale: own = "seconds", whenHeld = "started", locale, format, spoken, className }: RunTimerProps) {
  const list = React.useContext(RunTimeScaleContext);
  const scale = list?.scale ?? own;
  const { held: loopsHeld } = useLoops();
  const inPrint = usePrinting();
  const held = loopsHeld || inPrint;
  const running = start !== undefined && end === undefined;
  const [now, setNow] = React.useState(() => Date.now());
  // The shared interval asks every 100ms; the timer draws again only when its written figure changes (every 100ms under a minute, by the
  // second to an hour, by the minute after).
  const textAt = React.useRef<(t: number) => string>(() => "");
  const shown = React.useRef("");
  React.useEffect(() => {
    if (!running || held) return;
    setNow(Date.now());
    return subscribe(() => { const t = Date.now(); if (textAt.current(t) !== shown.current) setNow(t); });
  }, [running, held]);

  if (process.env.NODE_ENV !== "production" && carried && since === undefined) warnRun("RunTimer", "`carried` is given without `since`: the held form would show when this attempt started, not when the work first did.");

  const from = start === undefined ? undefined : new Date(start).getTime();
  const ms = from === undefined ? 0 : (end === undefined ? now : new Date(end).getTime()) - from + carried;
  const length = formatRunTime(ms, { scale });
  const text = from === undefined ? "\u00a0" : format ? format(ms) : length.text;
  textAt.current = (t) => { if (from === undefined) return "\u00a0"; const at = (end === undefined ? t : new Date(end).getTime()) - from + carried; return format ? format(at) : formatRunTime(at, { scale }).text; };
  shown.current = text;

  // A time that outgrows its scale is written whole; the list widens every seat together.
  const needed = from === undefined ? scale : scaleFor(ms);
  const outgrown = ORDER[needed] > ORDER[scale];
  React.useEffect(() => {
    if (!outgrown) return;
    if (process.env.NODE_ENV !== "production") warnRun("RunTimer", `a time of ${length.text} outgrew its "${scale}" scale; give the list a wider \`timeScale\`.`);
    list?.grow(needed);
  }, [outgrown, needed, scale, list, length.text]);

  const startedForm = whenHeld === "started";
  const showHeld = held && running && startedForm;
  const hidden = held && running && !startedForm;
  const first = since ?? start;
  const heldForm = showHeld && first !== undefined ? heldText(new Date(first).getTime(), now, locale) : null;

  // The spoken form stands for the drawn figure only: never for the held or started-at form, nor for a timer with no start.
  const said = spoken && !heldForm && from !== undefined ? spoken(ms) : undefined;
  const alternatives: Record<string, React.ReactNode> = { time: text, widest: format ? format(scale === "seconds" ? 59_900 : scale === "minutes" ? 3_599_000 : 86_340_000) : WIDEST[scale] };
  if (startedForm) Object.assign(alternatives, heldSample(locale));
  if (heldForm) alternatives[heldForm.show] = heldForm.text;
  return (
    <time
      className={join("basalt-run-timer", className)}
      dateTime={heldForm ? heldForm.dateTime : from === undefined ? undefined : length.dateTime}
      data-held={hidden ? "" : undefined}
      suppressHydrationWarning
    >
      <Reserve live show={heldForm ? heldForm.show : "time"} alternatives={alternatives} aria-hidden={said === undefined ? undefined : true} />
      {said === undefined ? null : <span className="basalt-visually-hidden" suppressHydrationWarning>{said}</span>}
    </time>
  );
}
