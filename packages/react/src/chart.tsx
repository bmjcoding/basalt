import * as React from "react";

import { entranceVerdict, markEntranceSeen, playEntrance } from "./entrance";
import type { EntranceMark, EntranceRun } from "./entrance";
import { Kbd } from "./kbd";
import { useShortcutsVisible } from "./keyboard";
import { inLevel, usePanelLevel } from "./layers";
import { useReducedMotion } from "./motion";
import { bezier, glideTiming } from "./motion-timing";
import { NumberTicker } from "./number-ticker";
import { trailingMean } from "./trailing-mean";
import { join } from "./utils";

// A chart: a series over time, as lines or as bars (decision 101). Ink is the kind of value (primary observed, secondary planned,
// the hatch missing) and shape is which series, so no series ever takes a colour. The chart is drawn in real CSS pixels at its measured
// width and never scaled through a viewBox, so its 12px text is 12px at every width. Nothing here runs when the module loads.

export type ChartKind = "line" | "bar";

/** One series. `values` has one entry per day, oldest first; `null` is a day that was not observed. */
export interface ChartSeries {
  /** A stable key for the series. */
  id: string;
  /** The series' name: it is in the legend, in the direct label and in every spoken sentence. */
  name: string;
  values: Array<number | null>;
  /** Why a day was not observed, per day: "not worn, travel". It is said in the lane (where it fits), the date line, the summary, the day's description and the table; the legend says "Not observed" alone. */
  reasons?: Array<string | null | undefined>;
}

/**
 * The plan, drawn in secondary ink and never as a series. A `value` plan is a stroke across each day's slot (equal
 * neighbours join, there are no risers); a `band` plan is two edges with the hover wash between them.
 */
export type ChartPlan =
  | { kind: "value"; values: Array<number | null>; notes?: Array<string | null | undefined>; label?: string }
  | { kind: "band"; values: Array<readonly [number, number] | null>; label?: string };

export interface TimeChartProps extends Omit<React.ComponentProps<"figure">, "children" | "title"> {
  /** What the chart shows. Required: it names the chart. */
  title: string;
  /** The heading level of the title. */
  heading?: 2 | 3 | 4 | 5 | 6;
  /** Where the figures came from ("06:12 · Ring and watch"), under the title. */
  source?: React.ReactNode;
  kind: ChartKind;
  /** One ISO date ("2026-11-10") per day, oldest first. The days are in UTC and the chart draws every one; a range is the slice you pass. */
  days: string[];
  /** One series for bars (a second becomes a line over the bars, or a second chart); up to three for lines. */
  series: ChartSeries[];
  plan?: ChartPlan;
  /** Required. The sentence under the chart that the app writes: the direction, the extremes, the plan, and each gap with its reason. */
  summary: React.ReactNode;
  /** How a value is written: "7 h 23 m". */
  format: (value: number) => string;
  /** How a value is spoken, when it differs ("7 hours 23 minutes"). */
  spoken?: (value: number) => string;
  /** How an axis tick is written (default: the number). The unit is added to the top tick only. */
  formatTick?: (value: number) => string;
  /** The unit, written once on the top tick: "min", "h". */
  unit?: string;
  /** The gap between gridlines, when the quantity has a natural one (60 for hours in minutes). Otherwise round steps are chosen. */
  step?: number;
  /** A line chart's scale needn't start at zero. Set this when the quantity has a meaningful zero. Bars always start at zero. */
  fromZero?: boolean;
  /** The index of a day that isn't final: the same mark, hollow, with its value written "34 min so far". */
  partial?: number;
  /** The legend key for the day that isn't final. */
  partialLabel?: string;
  /** The words after a value that isn't final. */
  partialSuffix?: string;
  /** How a plan value or band is written in the legend (default: `format`; a band is "low–high"). */
  formatPlan?: (plan: number | readonly [number, number]) => string;
  /**
   * What counts as today (a Date or a time in ms), for the last day's sentence to say "today". Days are UTC dates, so the last day is
   * "today" only when it is the UTC date of this moment. Defaults to now: a closed range that ends before today is never "today".
   */
  now?: Date | number;
  locale?: string;
  /**
   * Makes this chart its page's one entrance (DECISIONS 136): on a first visit, at load, its marks draw once, each over `duration-figure`
   * on `ease-out` and `duration-stagger` apart (a bar scales from its baseline, a solid line draws along its length, every other mark
   * fades in). The title, the legend, the numbers, the axes, the table and every control are at rest in the first frame. A change of
   * data mid-entrance takes over: every mark glides from where it is drawn over `duration-slow`, and the visit counts as seen.
   * Drawn at rest on a second visit (stored for the page's path in `localStorage` when the entrance finishes or gives way), under
   * reduced motion, under the root hold, in a hidden tab, on a page opened below its first screen, when the page's script started more
   * than a second after navigation, and in print. One chart a page; nothing is armed by scrolling. Default false: a chart's first paint is at rest. `"replay"` plays the entrance whatever the page has seen and however late the script ran (a review page's Replay button; an app never needs it).
   */
  entrance?: boolean | "replay";
  /**
   * The lit marks (DECISIONS 153, vote 1): each solid mark (a bar, a marker) takes one vertical gradient in plot coordinates, the lightest stop at the top
   * of the plot, so a taller mark reaches brighter ink; a line is one stroke in the top stop. Three neutral stops (`chart-lit-top`, `-mid`, `-base`), each 3:1
   * on levels 0 to 3. No series takes a colour. Default false: a chart's marks are `chart-observed`, flat.
   */
  lit?: boolean;
  /**
   * The figure's frame with its number as the headline (DECISIONS 153, votes 7, 8 and 9): a 14/20 title with "View as table" in one 28px row, the picked day's
   * number of the first series as the headline (`text-4xl` under 720px, `text-5xl` from it) in a seat as wide as its widest form, the unit beside it, and one
   * context line. It replaces the legend rows, so give it one series. The number glides over `duration-slow` when a day is picked; there is no live region (focus
   * is the announcement). The legend of a chart that does not set this is unchanged, and so are its reserved widths.
   */
  headline?: boolean;
  /** How the headline is written, without its unit (the unit stands beside it). Default: the number as it is, with the decimals it has. */
  headlineFormat?: (value: number) => string;
  /**
   * A line of one series, with its trailing mean as the lit line (DECISIONS 153, votes 2 to 5): each reading is a small dot (`size-track`, tertiary ink), the trend
   * is one straight 2px line that breaks at a gap, the picked day is one head dot on the line (`size-chart-mark` ringed `size-cut`), with no area under the line and no
   * plate. The number is the trend on the picked day. `true` is a 7-day window; a number sets the window. Needs `kind="line"`, and sets `headline`.
   */
  trend?: boolean | number;
  /** The plot's height: `"md"` is 240px (`size-chart-plot`, the default); `"sm"` is the one second, shorter height, 96px (`size-chart-plot-sm`, DECISIONS 153, vote 11). */
  plotSize?: "md" | "sm";
  /**
   * The short bar plot (DECISIONS 160: the owner chose the ballot's vote 10 option (a), a short `TimeChart kind="bar"`): with `kind="bar"` and `plotSize="sm"` the plot draws no
   * gridlines, no y labels and no gutter for them, so it takes the figure's width. Everything else is `TimeChart` as it ships: one series, square-ended bars at the 60%-of-the-day rule,
   * zero draws no bar, a day not observed is the hatch with its reason in words, the baseline at zero, the x labels, the legend that is the readout, the keys and their hint, "View as table"
   * and the required summary. The values are in the legend, the day's sentence and the table, so the plot needs no scale of its own; use it where a `Sparkline` is too little (a line and one
   * number) and a full chart too much. Ignored for a line chart, for `plotSize="md"` and (as for any bar chart) past the first series: no look was decided for those.
   */
  compact?: boolean;
  /**
   * A lane under the plot on its own axis, and the plate behind an open span of days across both (the phase chart's calls, DECISIONS 153, votes 16 and 17).
   * `span` is the first and last day (inclusive) of the open span; `children` draws the lane from the plot's geometry, in the width from the plot's first day to its last.
   * The plate is one element that glides to a new span over `duration-slow` on `ease-out`, and axis labels under it take secondary ink.
   */
  lane?: { span: readonly [number, number]; children: (geometry: ChartLaneGeometry) => React.ReactNode; below?: (geometry: ChartLaneGeometry) => React.ReactNode };
  /**
   * Pressing a day, or Enter on the focused day, calls this with its index (the phase chart opens that day's week). A day stays an image with a roving tab stop; a
   * pointer still only picks. `activateHint` says what Enter does, in the key legend ("opens the week").
   */
  onDayActivate?: (index: number) => void;
  activateHint?: string;
}

/** What a lane under a chart's plot needs: the plot's days, and the width from its first day to its last, which the lane spans. */
export interface ChartLaneGeometry { days: number; width: number; slot: number; narrow: boolean }

// ---- Small pure helpers ----

const DAY_MS = 86_400_000;
const NOT_OBSERVED = "Not observed";
const SHAPES = ["disc", "square", "diamond"] as const;
type Shape = (typeof SHAPES)[number];
const DASHES = ["solid", "dash", "dot"] as const;
/** The least a label may be from the next, and the narrowest a bar's day may be for the full date. */
const LABEL_GAP = 56;
const LONG_LABEL = 80;
const BAR_SHARE = 0.6;
/** A day this wide (two markers) shows its marker; a narrower one only the kept days. */
const MARKER_DAYS = 2;

const at = <T,>(list: ArrayLike<T>, index: number): T => list[index] as T;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const parseDay = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
};
const weekday = (ms: number) => new Date(ms).getUTCDay();
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** A text with its digits as zeros: tabular numerals make every digit one width, so two texts of one shape are one width. */
const shapeOf = (text: string) => text.replace(/\d/g, "0");
const unique = <T,>(list: T[]) => [...new Set(list)];
const nearly = (a: number, b: number) => Math.abs(a - b) < 1e-9;

interface Run { from: number; to: number; key: string }
function runs(from: number, to: number, keyOf: (index: number) => string): Run[] {
  const out: Run[] = [];
  for (let i = from; i <= to; i++) {
    const key = keyOf(i);
    const last = out[out.length - 1];
    if (last && last.key === key) last.to = i;
    else out.push({ from: i, to: i, key });
  }
  return out;
}

// ---- The scale ----

interface Scale { lo: number; hi: number; step: number }

const NICE = [1, 2, 2.5, 5];
/** Round steps, smallest first, from a tenth of the span's magnitude up. */
function* niceSteps(span: number) {
  const magnitude = Math.floor(Math.log10(Math.max(span, 1e-9)));
  // Five powers, counted apart from the exponent: a span that overflows to Infinity has an infinite magnitude, and Infinity + 1 never ends a loop.
  for (let k = 0; k < 5; k++) for (const base of NICE) yield base * 10 ** (magnitude - 2 + k);
}

/** 3 to 6 gridlines on round steps. A bar chart starts at zero; a line chart's scale needn't. */
function scaleOf(values: number[], bar: boolean, fromZero: boolean, given?: number): Scale {
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const zero = bar || fromZero;
  const lo0 = zero ? Math.min(0, low) : low;
  const hi0 = zero ? Math.max(0, high) : high;
  const pad = bar ? 0 : Math.max((hi0 - lo0) * 0.04, 0);
  const hiPad = bar ? Math.max(hi0 * 1.04, hi0) : hi0 + pad;
  const loPad = lo0 - (zero ? 0 : pad);
  const fit = (step: number): Scale => ({ lo: Math.floor(loPad / step + 1e-9) * step, hi: Math.max(Math.ceil(hiPad / step - 1e-9) * step, Math.floor(loPad / step + 1e-9) * step + step), step });
  const intervals = (s: Scale) => Math.round((s.hi - s.lo) / s.step);
  if (given && given > 0) {
    const scale = fit(given);
    if (intervals(scale) <= 5) return scale.lo === scale.hi ? { ...scale, hi: scale.lo + 2 * given } : scale;
  }
  const span = Math.max(hiPad - loPad, hi0 > 0 ? hi0 : 1);
  for (const step of niceSteps(span)) {
    const scale = fit(step);
    if (intervals(scale) <= 5) return intervals(scale) < 2 ? { ...scale, hi: scale.lo + 2 * step } : scale;
  }
  return fit(span);
}

/** The most gridlines a scale has (scaleOf's 3 to 6, with room); a scale that overflowed draws no more than this and never loops without end. */
const MOST_TICKS = 12;

function ticksOf(scale: Scale) {
  const out: number[] = [];
  for (let k = 0, n = Math.min(Math.round((scale.hi - scale.lo) / scale.step), MOST_TICKS); k <= n; k++) out.push(Math.round((scale.lo + k * scale.step) * 1e9) / 1e9);
  return out;
}

// ---- Snapshots: what is drawn, so that a change can glide from it ----

interface Snapshot {
  series: Array<Array<number | null>>;
  /** The plan's first value (a value, or a band's low edge) per day, and a band's high edge. */
  planA: Array<number | null>;
  planB: Array<number | null>;
  lo: number;
  hi: number;
}

function snapshotOf(series: ChartSeries[], plan: ChartPlan | undefined, scale: Scale, n: number): Snapshot {
  const planA: Array<number | null> = [];
  const planB: Array<number | null> = [];
  for (let i = 0; i < n; i++) {
    const p = plan?.values[i];
    if (p == null) { planA.push(null); planB.push(null); } else if (typeof p === "number") { planA.push(p); planB.push(null); } else { planA.push(p[0]); planB.push(p[1]); }
  }
  return { series: series.map((s) => Array.from({ length: n }, (_, i) => (typeof s.values[i] === "number" && Number.isFinite(s.values[i]) ? (s.values[i] as number) : null))), planA, planB, lo: scale.lo, hi: scale.hi };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpNull = (a: number | null | undefined, b: number | null, t: number) => (a == null || b == null ? b : lerp(a, b, t));

/**
 * Between two snapshots: a value with a place on both travels; one with no previous place (or none now) is simply there (or gone).
 * A new peak widens the scale at once, so nothing clips, and it eases back when it shrinks (Sparkline's rule).
 */
function between(from: Snapshot, to: Snapshot, t: number): Snapshot {
  return {
    series: to.series.map((values, s) => values.map((v, i) => lerpNull(from.series[s]?.[i], v, t))),
    planA: to.planA.map((v, i) => lerpNull(from.planA[i], v, t)),
    planB: to.planB.map((v, i) => lerpNull(from.planB[i], v, t)),
    hi: to.hi >= from.hi ? to.hi : lerp(from.hi, to.hi, t),
    lo: to.lo <= from.lo ? to.lo : lerp(from.lo, to.lo, t),
  };
}

const sameSnapshot = (a: Snapshot, b: Snapshot) =>
  a.lo === b.lo && a.hi === b.hi && a.series.length === b.series.length
  && a.series.every((values, s) => values.length === b.series[s]?.length && values.every((v, i) => v === b.series[s]?.[i]))
  && a.planA.every((v, i) => v === b.planA[i]) && a.planB.every((v, i) => v === b.planB[i]);

// ---- Metrics: tokens and text, measured in the browser ----

interface Metrics {
  mark: number; cut: number; line: number; track: number; hair: number; pitch: number; barMax: number; barMin: number; plot: number;
  s1: number; s2: number; lineH: number; container: number; dash: number; dashGap: number;
}

function readMetrics(element: HTMLElement, small = false): Metrics {
  const style = getComputedStyle(element);
  const px = (name: string, fallback: number) => {
    const value = parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    mark: px("--basalt-size-chart-mark", 8), cut: px("--basalt-size-cut", 2), line: px("--basalt-size-chart-line", 2), track: px("--basalt-size-track", 4), hair: px("--basalt-size-hairline", 1),
    pitch: px("--basalt-size-hatch-pitch", 4), barMax: px("--basalt-size-chart-bar-max", 24), barMin: px("--basalt-size-chart-bar-min", 2),
    plot: small ? px("--basalt-size-chart-plot-sm", 96) : px("--basalt-size-chart-plot", 240), s1: px("--basalt-space-1", 4), s2: px("--basalt-space-2", 8), lineH: px("--basalt-text-xs-line-height", 16),
    container: px("--basalt-size-breakpoint-container", 480), dash: px("--basalt-size-chart-dash", 6), dashGap: px("--basalt-size-chart-dash-gap", 4),
  };
}

interface Frame { width: number; metrics: Metrics }

// ---- A stack of charts shares one gutter, so their plots line up ----

interface GroupSizes { gutter: number; right: number }
interface GroupApi { shared: GroupSizes; report: (id: string, sizes: GroupSizes | null) => void }
const GroupContext = /* @__PURE__ */ React.createContext<GroupApi | null>(null);

export interface ChartGroupProps extends React.ComponentProps<"div"> {
  /** Names the stack for assistive technology when it is more than a layout. */
  label?: string;
}

/**
 * Charts stacked in one figure: the y gutter is as wide as the widest label of any of them, and so is the right margin, so every plot
 * starts and ends at the same x. Put the charts inside; each keeps its own title, legend, summary and table.
 */
export function ChartGroup({ label, className, children, ...props }: ChartGroupProps) {
  const [sizes, setSizes] = React.useState<Record<string, GroupSizes>>({});
  const report = React.useCallback((id: string, next: GroupSizes | null) => {
    setSizes((current) => {
      const known = current[id];
      if (!next) { if (!known) return current; const { [id]: _removed, ...rest } = current; return rest; }
      if (known && known.gutter === next.gutter && known.right === next.right) return current;
      return { ...current, [id]: next };
    });
  }, []);
  const api = React.useMemo<GroupApi>(() => {
    const all = Object.values(sizes);
    return { report, shared: { gutter: Math.max(0, ...all.map((a) => a.gutter)), right: Math.max(0, ...all.map((a) => a.right)) } };
  }, [sizes, report]);
  return (
    <div {...props} role={label ? "group" : undefined} aria-label={label} className={join("basalt-chart-group", className)}>
      <GroupContext.Provider value={api}>{children}</GroupContext.Provider>
    </div>
  );
}

// ---- The chart ----

interface GapInfo { index: number; opacity: number; key: string; names: string[]; all: boolean; why: string | undefined }

interface DateFormats { short: Intl.DateTimeFormat; withDay: Intl.DateTimeFormat; long: Intl.DateTimeFormat }

/**
 * A series over time (`TimeChart`; `Chart` is not exported, because it was renamed `Sparkline`): lines or bars, with a plan, missing data, a legend that is also the readout, and a table.
 * It draws at its own measured width, so it is narrow by its own width (under 480px), not the viewport's. Hover, a tap or a
 * key picks a day; the picked day is a full-height plate. The plot is one tab stop with a focusable image per day.
 */
export function TimeChart({
  title, heading = 3, source, kind, days, series: allSeries, plan, summary, format, spoken, formatTick, unit, step, fromZero = false,
  partial, partialLabel = "Today so far", partialSuffix = "so far", formatPlan, now, locale = "en-US", entrance = false, lit = false, headline = false, headlineFormat, trend, plotSize = "md", compact = false, lane, onDayActivate, activateHint, className, ...props
}: TimeChartProps) {
  // The hint legend is hidden on touch until a hardware key is pressed; this asks for the same reveal the shortcut chips use.
  useShortcutsVisible();
  const bar = kind === "bar";
  const trendWindow = !bar && trend ? (typeof trend === "number" ? Math.max(1, Math.floor(trend)) : 7) : null;
  // The frame with its headline reads one number, so it takes one series.
  const framed = headline || trendWindow !== null;
  const series = React.useMemo(() => allSeries.slice(0, bar || framed ? 1 : 3), [allSeries, bar, framed]);
  const trendNow = React.useMemo(() => (trendWindow ? trailingMean(series[0]?.values ?? [], { window: trendWindow }) : null), [series, trendWindow]);
  const n = days.length;
  const id = React.useId().replace(/:/g, "");
  const titleId = `${id}-title`;
  const captionId = `${id}-summary`;
  const keysId = `${id}-keys`;
  const tableId = `${id}-table`;
  const dayKey = days.join(",");
  const reduced = useReducedMotion();
  const group = React.useContext(GroupContext);

  const formats = React.useMemo<DateFormats>(() => ({
    short: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }),
    withDay: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
    long: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
  }), [locale]);
  const stamps = React.useMemo(() => days.map(parseDay), [dayKey]);
  const say = spoken ?? format;

  // The scale, from every value the chart may draw.
  const target = React.useMemo(() => {
    const numbers: number[] = [];
    series.forEach((s) => s.values.forEach((v) => { if (typeof v === "number" && Number.isFinite(v)) numbers.push(v); }));
    plan?.values.forEach((p) => { if (p == null) return; if (typeof p === "number") numbers.push(p); else numbers.push(p[0], p[1]); });
    return scaleOf(numbers, bar, fromZero, step);
  }, [series, plan, bar, fromZero, step]);
  const nextSnap = React.useMemo(() => snapshotOf(series, plan, target, n), [series, plan, target, n]);
  // A render that supplies the same numbers in fresh arrays keeps the snapshot it already had, so the glide's effect is not torn
  // down (and its frame cancelled) by a parent that rebuilds its props while the marks travel.
  const heldSnap = React.useRef(nextSnap);
  if (heldSnap.current !== nextSnap && !sameSnapshot(heldSnap.current, nextSnap)) heldSnap.current = nextSnap;
  const targetSnap = heldSnap.current;

  // ---- The glide: a value that changes in place travels with the scale; a new range fades in ----
  const [motion, setMotion] = React.useState<{ from: Snapshot; progress: number } | null>(null);
  const entranceRun = React.useRef<EntranceRun | null>(null);
  const drawnRef = React.useRef(targetSnap);
  const previousRef = React.useRef({ snap: targetSnap, dayKey });
  const [range, setRange] = React.useState({ key: dayKey, serial: 0 });
  if (range.key !== dayKey) setRange({ key: dayKey, serial: range.serial + 1 });
  React.useLayoutEffect(() => {
    // Before paint, so the frame that has the new values already starts from what was on screen.
    const before = previousRef.current;
    previousRef.current = { snap: targetSnap, dayKey };
    if (before.dayKey !== dayKey || reduced) { entranceRun.current?.rest(); setMotion(null); drawnRef.current = targetSnap; return undefined; }
    if (sameSnapshot(before.snap, targetSnap)) return undefined;
    // Input wins: a change of data mid-entrance takes over, and every mark glides from where it is drawn (the entrance's own yield),
    // while the values glide on the same clock.
    entranceRun.current?.yield();
    const from = drawnRef.current;
    const { duration, curve } = glideTiming();
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) { setMotion(null); return; }
      setMotion({ from, progress: bezier(curve, t) });
      frame = requestAnimationFrame(tick);
    };
    setMotion({ from, progress: 0 });
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetSnap, dayKey, reduced]);
  const progress = motion?.progress ?? 1;
  const drawn = motion ? between(motion.from, targetSnap, progress) : targetSnap;
  // What is on screen, kept after the effect above has read what was there before this render.
  React.useLayoutEffect(() => { drawnRef.current = drawn; });

  // ---- Measure: the plot's width, the tokens, and text ----
  const plotRef = React.useRef<HTMLDivElement>(null);
  const rulerRef = React.useRef<HTMLSpanElement>(null);
  const [frame, setFrame] = React.useState<Frame | null>(null);
  const [fontEpoch, setFontEpoch] = React.useState(0);
  const widths = React.useRef(new Map<string, number>());
  React.useLayoutEffect(() => {
    const plot = plotRef.current;
    if (!plot) return undefined;
    const update = () => {
      const width = plot.clientWidth;
      setFrame((current) => (current && Math.abs(current.width - width) < 0.5 ? current : { width, metrics: current?.metrics ?? readMetrics(plot, plotSize === "sm") }));
    };
    setFrame({ width: plot.clientWidth, metrics: readMetrics(plot, plotSize === "sm") });
    const observer = new ResizeObserver(update);
    observer.observe(plot);
    return () => observer.disconnect();
  }, [plotSize]);
  React.useEffect(() => {
    // Text is measured with the real face; once it loads, measure again.
    let live = true;
    document.fonts?.ready.then(() => { if (live) { widths.current.clear(); setFontEpoch((e) => e + 1); } });
    return () => { live = false; };
  }, []);
  const measure = React.useCallback((text: string, weight = 400) => {
    const key = `${weight}|${text}`;
    const known = widths.current.get(key);
    if (known !== undefined) return known;
    const ruler = rulerRef.current;
    if (!ruler) return text.length * 6.5;
    ruler.style.fontWeight = String(weight);
    ruler.textContent = text;
    const width = ruler.getBoundingClientRect().width;
    widths.current.set(key, width);
    return width;
  }, [fontEpoch]);

  // ---- Which day is picked ----
  const [hover, setHover] = React.useState<number | null>(null);
  const [pinned, setPinned] = React.useState<number | null>(null);
  const [focusDay, setFocusDay] = React.useState<number | null>(null);
  const [focusWithin, setFocusWithin] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [stale, setStale] = React.useState(dayKey);
  if (stale !== dayKey) { setStale(dayKey); setHover(null); setPinned(null); setFocusDay(null); }
  const stop = clamp(focusDay ?? n - 1, 0, Math.max(n - 1, 0));
  const picked = focusWithin ? stop : pinned ?? hover;
  const active = picked !== null && picked >= 0 && picked < n ? picked : null;
  const shown = active ?? n - 1;
  // The headline's day: the latest, or (for a trend) the latest day that has one. A day with none is "—", never a zero.
  const homeDay = trendNow ? Math.max(0, trendNow.reduce<number>((last, value, i) => (value == null ? last : i), -1)) : n - 1;
  const headDay = active ?? Math.min(homeDay, Math.max(n - 1, 0));
  // The headline is written with the decimals the readings have (a trend's mean has many more, and is not more exact than what it averages).
  const headDecimals = React.useMemo(() => Math.max(0, ...(series[0]?.values ?? []).map((v) => (typeof v === "number" && Number.isFinite(v) ? decimalsOf(v) : 0))), [series]);
  const headValue = (i: number) => (trendNow ? trendNow[i] ?? null : series[0]?.values[i] ?? null);

  React.useEffect(() => {
    if (pinned === null) return undefined;
    // A tap holds until a tap outside.
    const outside = (event: PointerEvent) => { if (!plotRef.current?.contains(event.target as Node)) setPinned(null); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [pinned]);

  // ---- The model: everything drawn comes from here ----
  const bare = compact && bar && plotSize === "sm";
  const natural = frame && n > 0 ? naturalSizes({ frame, measure, series, plan, bar, scale: target, formatTick, unit, bare }) : null;
  const reportGutter = natural?.gutter;
  const reportRight = natural?.right;
  React.useLayoutEffect(() => {
    if (!group || reportGutter === undefined || reportRight === undefined) return undefined;
    group.report(id, { gutter: reportGutter, right: reportRight });
    return () => group.report(id, null);
  }, [group?.report, id, reportGutter, reportRight]);
  const layout = frame && natural && n > 0
    ? buildLayout({ frame, measure, series, plan, bar, n, scale: target, drawn, formatTick, unit, natural, bare, shared: group?.shared })
    : null;
  // ---- The entrance: this chart is its page's one, when it asks to be ----
  const drawnOnce = layout !== null;
  const entranceDecided = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!entrance || !drawnOnce || entranceDecided.current) return undefined;
    const plot = plotRef.current;
    const svg = plot?.querySelector<SVGSVGElement>(".basalt-chart-svg");
    if (!plot || !svg) return undefined;
    entranceDecided.current = true;
    if (entranceVerdict(plot, undefined, entrance === "replay") !== "play") return undefined;
    const marks: EntranceMark[] = [];
    svg.querySelectorAll<SVGElement>(".basalt-chart-bar, .basalt-chart-plan, .basalt-chart-band, .basalt-chart-band-edge, .basalt-chart-line, .basalt-chart-ring, .basalt-chart-mark, .basalt-chart-reading").forEach((element) => {
      if (element.matches(".basalt-chart-bar")) marks.push({ element, kind: "bar", below: element.hasAttribute("data-below") });
      else if (element.matches(".basalt-chart-line:not([data-dash=\"dash\"]):not([data-dash=\"dot\"])")) marks.push({ element, kind: "line" });
      else marks.push({ element, kind: "fade" });
    });
    if (!marks.length) { markEntranceSeen(); return undefined; }
    const run = playEntrance(marks, () => markEntranceSeen());
    entranceRun.current = run;
    // The root hold arriving mid-entrance, or printing beginning, draws the figure at rest at once, with no new animation, and settles any glide a data change handed the marks to.
    const watch = new MutationObserver(() => { if (document.documentElement.getAttribute("data-loops") === "held") run.rest(); });
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-loops"] });
    // Two signals, because the two ways of printing give different ones: emulated or changed print media fires the media query's change, and the browser's own print
    // path fires `beforeprint` and no change (it lays the page out for the printer without changing what `matchMedia` says). Either settles the figure at once.
    const printing = window.matchMedia("print");
    const onPrint = () => { if (printing.matches) run.rest(); };
    const beforePrint = () => run.rest();
    printing.addEventListener("change", onPrint);
    window.addEventListener("beforeprint", beforePrint);
    const stopWatching = () => { watch.disconnect(); printing.removeEventListener("change", onPrint); window.removeEventListener("beforeprint", beforePrint); };
    run.settled.then(() => { stopWatching(); if (entranceRun.current === run) entranceRun.current = null; });
    return () => { stopWatching(); run.cancel(); if (entranceRun.current === run) entranceRun.current = null; entranceDecided.current = false; };
  }, [entrance, drawnOnce]);
  const dayLabel = (i: number) => formats.short.format(at(stamps, i));
  const gaps = React.useMemo(() => gapsOf(series, n, motion?.from, progress), [series, n, motion?.from, progress]);

  const pointerDay = (event: { clientX: number }) => {
    if (!layout || !plotRef.current) return null;
    const x = event.clientX - plotRef.current.getBoundingClientRect().left;
    if (x < layout.x0 || x > layout.x1) return null;
    return clamp(Math.floor((x - layout.x0) / layout.slot), 0, n - 1);
  };

  const dayRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = Number((event.target as HTMLElement).dataset.i);
    if (!Number.isInteger(index)) return;
    let to = index;
    if (event.key === "ArrowRight") to = index + 1;
    else if (event.key === "ArrowLeft") to = index - 1;
    else if (event.key === "PageDown") to = index + 7;
    else if (event.key === "PageUp") to = index - 7;
    else if (event.key === "Home") to = 0;
    else if (event.key === "End") to = n - 1;
    else if (event.key === "Enter" && onDayActivate) { event.preventDefault(); onDayActivate(index); return; }
    else return;
    event.preventDefault();
    to = clamp(to, 0, n - 1);
    setFocusDay(to);
    dayRefs.current[to]?.focus({ preventScroll: true });
  };

  // The last day is "today" only when it is today's UTC date (the days are UTC): read once a render, from `now` or the clock.
  const todayIso = isoOf(now === undefined ? Date.now() : new Date(now).getTime());
  const lastIsToday = days[n - 1] === todayIso;
  const sentences = React.useMemo(
    () => stamps.map((_, i) => daySentence({ i, n, series, plan, partial, partialSuffix, say, formats, stamp: at(stamps, i), planLabel: plan?.label ?? "Plan", today: lastIsToday, trend: trendNow, trendLabel: `${trendWindow}-day trend` })),
    [stamps, series, plan, partial, partialSuffix, say, formats, n, lastIsToday, trendNow, trendWindow],
  );

  // The headline frame's one context line: the day, then what sits beside the number (the trend's change and the reading; a plan; why a day has none).
  const contextText = (i: number, latest: boolean) => {
    const first = series[0];
    const v = first?.values[i] ?? null;
    const parts = [`${latest ? "Latest · " : ""}${formats.withDay.format(at(stamps, i))}`];
    if (v == null) parts.push(first?.reasons?.[i] ? `${NOT_OBSERVED} · ${first.reasons[i]}` : NOT_OBSERVED);
    if (trendNow) {
      const t = trendNow[i];
      const from = trendNow.findIndex((x) => x != null);
      if (t != null && from >= 0 && trendNow[from] != null && from !== i) {
        const delta = t - (trendNow[from] as number);
        parts.push(nearly(delta, 0) ? `no change since ${formats.short.format(at(stamps, from))}` : `${delta > 0 ? "+" : "−"}${format(Math.abs(delta))} since ${formats.short.format(at(stamps, from))}`);
      } else if (t == null && v != null) parts.push("too few days for a trend");
      if (v != null) parts.push(`reading ${format(v)}`);
    } else {
      if (v != null && i === partial) parts.push(partialSuffix);
      const p = plan?.values[i];
      if (plan && p != null) parts.push(`${plan.label ?? "Plan"} ${planText(plan, p, format, formatPlan)}`);
    }
    // A number and its unit stay together when the line wraps: a space between a digit and a word that follows it is a no-break space.
    return parts.join(" · ").replace(/(\d)[ ]+(?=\p{L})/gu, "$1\u00a0");
  };

  const Heading = `h${heading}` as const;
  const toggle = (
    <button
      type="button"
      className="basalt-button basalt-chart-toggle"
      data-variant="secondary"
      data-size="sm"
      aria-expanded={open}
      aria-controls={tableId}
      onClick={() => setOpen((value) => !value)}
    >
      <span className="basalt-button-label">{open ? "Hide the table" : "View as table"}</span>
    </button>
  );
  const plotBlock = (
    <div
      ref={plotRef}
      className="basalt-chart-plot"
      style={layout ? { height: layout.height } : undefined}
      onClick={onDayActivate ? (event) => { const day = pointerDay(event); if (day !== null) onDayActivate(day); } : undefined}
      onPointerMove={(event) => {
        // A finger only moves while it is down: it scrubs, and the day it reaches is held until a tap outside.
        if (event.pointerType === "touch") { if (event.buttons !== 0) setPinned(pointerDay(event)); return; }
        setHover(pointerDay(event));
      }}
      onPointerDown={(event) => {
        const day = pointerDay(event);
        if (event.pointerType === "touch") setPinned(day);
        else setHover(day);
      }}
      onPointerLeave={(event) => { if (event.pointerType !== "touch") setHover(null); }}
    >
      <span ref={rulerRef} className="basalt-chart-ruler" aria-hidden="true" />
      {layout ? (
        <ChartSvg
          key={range.serial}
          entering={range.serial > 0}
          idBase={id} layout={layout} series={series} plan={plan} bar={bar} n={n} drawn={drawn} active={active} partial={partial}
          gaps={gaps} stamps={stamps} formats={formats} dayLabel={dayLabel} metrics={frame!.metrics} measure={measure} unit={unit} formatTick={formatTick}
          planLabel={plan?.label ?? "Plan"} lit={lit} plated={lane?.span ?? null}
          trend={trendWindow !== null ? trailingMean(drawn.series[0] ?? [], { window: trendWindow }) : null} headDay={trendNow ? headDay : null}
        />
      ) : null}
      {layout ? (
        <div
          role="group"
          aria-roledescription="chart"
          aria-labelledby={titleId}
          aria-describedby={`${captionId} ${keysId}`}
          className="basalt-chart-days"
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            const index = Number((event.target as HTMLElement).dataset.i);
            if (Number.isInteger(index)) { setFocusDay(index); setFocusWithin(true); }
          }}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false); }}
        >
          {Array.from({ length: n }, (_, i) => (
            <div
              key={i}
              ref={(element) => { dayRefs.current[i] = element; }}
              role="img"
              tabIndex={i === stop ? 0 : -1}
              aria-label={sentences[i]}
              data-i={i}
              data-active={active === i ? "" : undefined}
              className="basalt-chart-day"
              style={{ left: layout.x0 + i * layout.slot, top: layout.top, width: layout.slot, height: layout.plotH }}
            />
          ))}
        </div>
      ) : null}
      <span id={keysId} className="basalt-visually-hidden">Arrow keys move a day, Page Up and Page Down a week, Home and End to the ends.{onDayActivate && activateHint ? ` Enter ${activateHint}.` : ""}</span>
    </div>
  );
  return (
    <figure
      {...props}
      aria-labelledby={titleId}
      data-kind={kind}
      data-plot={plotSize === "sm" ? "sm" : undefined}
      data-compact={bare ? "" : undefined}
      data-narrow={layout?.narrow ? "" : undefined}
      data-headline={framed ? "" : undefined}
      data-lit={lit ? "" : undefined}
      data-trend={trendWindow !== null ? "" : undefined}
      className={join("basalt-chart", className)}
    >
      <div className="basalt-chart-head" data-frame={framed ? "" : undefined}>
        <Heading id={titleId} className="basalt-chart-title">{title}</Heading>
        {framed ? toggle : null}
        {source ? <p className="basalt-chart-source">{source}</p> : null}
      </div>
      {framed ? (
        <Headline
          value={headValue(headDay)} unit={unit} format={headlineFormat} decimals={headDecimals} locale={locale}
          forms={unique(Array.from({ length: n }, (_, k) => { const v = headValue(k); return v == null ? "—" : shapeOf((headlineFormat ?? ((x: number) => fixedNumber(x, headDecimals, locale)))(v)); }))}
          context={contextText(headDay, active === null && headDay === homeDay)}
          contextForms={unique(Array.from({ length: n }, (_, k) => shapeOf(contextText(k, k === homeDay))))}
        />
      ) : (
        <Readout
          series={series} plan={plan} bar={bar} n={n} shown={shown} active={active} partial={partial} partialLabel={partialLabel} partialSuffix={partialSuffix}
          format={format} formatPlan={formatPlan} formats={formats} stamps={stamps} idBase={id}
        />
      )}
      {framed && series.some((s) => s.values.some((v) => v == null)) ? (
        // The headline frame has no legend rows, so a chart with a gap says what the hatch is in a key of its own above the plot, as the series charts do (DECISIONS 167, Q11a).
        <div className="basalt-chart-key" data-gap-key="">
          <ul className="basalt-chart-legend" aria-label="Key">
            <NotObservedEntry idBase={id} />
          </ul>
        </div>
      ) : null}
      {lane ? (
        <div className="basalt-chart-body">
          {layout ? <i className="basalt-chart-span" aria-hidden="true" style={{ left: layout.x0 + lane.span[0] * layout.slot, width: (lane.span[1] - lane.span[0] + 1) * layout.slot, top: layout.top - layout.metrics.s1 }} /> : null}
          {plotBlock}
          {layout ? <div className="basalt-chart-lane-slot" style={{ marginInlineStart: layout.x0, width: layout.x1 - layout.x0 }}>{lane.children({ days: n, width: layout.x1 - layout.x0, slot: layout.slot, narrow: layout.narrow })}</div> : null}
        </div>
      ) : plotBlock}
      {lane?.below && layout ? lane.below({ days: n, width: layout.x1 - layout.x0, slot: layout.slot, narrow: layout.narrow }) : null}
      <p className="basalt-chart-hint" data-kbd-hint="" aria-hidden="true">
        <span><Kbd>←</Kbd> <Kbd>→</Kbd> a day</span>
        <span><Kbd>PgUp</Kbd> <Kbd>PgDn</Kbd> a week</span>
        <span><Kbd>Home</Kbd> <Kbd>End</Kbd> the ends</span>
        {onDayActivate && activateHint ? <span><Kbd>Enter</Kbd> {activateHint}</span> : null}
      </p>
      {framed ? null : <div className="basalt-chart-foot">{toggle}</div>}
      <div id={tableId} className="basalt-chart-table" hidden={!open}>
        {open ? (
          <ChartTable
            title={title} series={series} plan={plan} n={n} stamps={stamps} formats={formats} partial={partial} partialSuffix={partialSuffix}
            format={format} formatPlan={formatPlan} trend={trendNow} trendLabel={`${trendWindow}-day trend`}
          />
        ) : null}
      </div>
      <figcaption id={captionId} className="basalt-chart-summary">{summary}</figcaption>
    </figure>
  );
}

// ---- The headline frame's number ----

/** The decimals a number is written with, and a number written with exactly that many. Built when called, not when the module loads. */
const decimalsOf = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 6, useGrouping: false }).format(value).split(".")[1]?.length ?? 0;
/** A number written with exactly `decimals` decimals, in the chart's own locale (the context line's): the decimal mark and the grouping are the reader's. */
const fixedNumber = (value: number, decimals: number, locale?: string) => new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);

interface HeadlineProps {
  value: number | null; unit: string | undefined; format: ((value: number) => string) | undefined; decimals: number; locale: string; forms: string[]; context: string; contextForms: string[];
}

/**
 * The number as the headline and the legend at once (DECISIONS 153, votes 7 and 9). The number and the context line each reserve the widest and tallest of
 * their forms (digits as zeros: the numerals are tabular), so a picked day moves nothing; the number glides over `duration-slow`, and its real value is in
 * the text from the first frame. There is no live region: moving focus to a day is the announcement.
 */
function Headline({ value, unit, format, decimals, locale, forms, context, contextForms }: HeadlineProps) {
  const write = format ?? ((shown: number) => fixedNumber(shown, decimals, locale));
  return (
    <div className="basalt-chart-readout">
      <p className="basalt-chart-headline">
        <span className="basalt-chart-seat">
          {forms.map((form) => <span key={form} className="basalt-chart-reserve" aria-hidden="true">{form}</span>)}
          {value == null ? <span data-missing="">—</span> : <NumberTicker glide value={value} format={write} />}
        </span>
        {/* The number and its unit are two elements with no space between them: a hidden space is the word boundary for a text scan and for a name built from the content. */}
        {unit ? <><span className="basalt-visually-hidden"> </span><span className="basalt-chart-unit">{unit}</span></> : null}
      </p>
      <p className="basalt-chart-context">
        {contextForms.map((form) => <span key={form} className="basalt-chart-reserve" aria-hidden="true">{form}</span>)}
        <span>{context}</span>
      </p>
    </div>
  );
}

// ---- The legend, which is the readout ----

interface ReadoutProps {
  series: ChartSeries[]; plan: ChartPlan | undefined; bar: boolean; n: number; shown: number; active: number | null; partial: number | undefined;
  partialLabel: string; partialSuffix: string; format: (value: number) => string; formatPlan: TimeChartProps["formatPlan"]; formats: DateFormats;
  stamps: number[]; idBase: string;
}

function planText(plan: ChartPlan, p: number | readonly [number, number] | null | undefined, format: (v: number) => string, formatPlan: TimeChartProps["formatPlan"]) {
  if (p == null) return plan.kind === "value" ? "" : "";
  if (formatPlan) return formatPlan(p as number | readonly [number, number]);
  return typeof p === "number" ? format(p) : `${format(p[0])}–${format(p[1])}`;
}

/**
 * The forms a legend value reserves, so no key moves on any day (DECISIONS 336, Q2): each of its numbers (digits as zeros: the numerals are tabular), and
 * "Not observed" for a series that can be missing. A gap's reason is never one of them: the legend does not carry it.
 */
export function legendForms(values: ReadonlyArray<number | null | undefined>, n: number, text: (value: number, index: number) => string): string[] {
  const forms: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v != null) forms.push(shapeOf(text(v, i)));
  }
  return unique(values.some((v) => v == null) ? forms.concat(NOT_OBSERVED) : forms);
}

function Readout({ series, plan, bar, n, shown, active, partial, partialLabel, partialSuffix, format, formatPlan, formats, stamps, idBase }: ReadoutProps) {
  const dateOf = (i: number) => formats.withDay.format(at(stamps, i));
  // On a day a series was not observed the date line says why ("Wed, Oct 21 · scale not used"), as the headline's context line does: the legend never
  // carries a gap's reason, and the lane cuts it where it does not fit (the pixel review's finding 1). The first missing series with a reason says it.
  const reasonOf = (i: number) => series.find((s) => s.values[i] == null && s.reasons?.[i])?.reasons?.[i] ?? undefined;
  const dateText = (i: number, latest: boolean) => `${latest ? "Latest · " : ""}${dateOf(i)}${reasonOf(i) ? ` · ${reasonOf(i)}` : ""}`;
  const textOf = (v: number, i: number) => `${format(v)}${i === partial ? ` ${partialSuffix}` : ""}`;
  // A day that was not observed says so and no more: its reason is in the lane, the summary, the table's note and the day's description (DECISIONS 336, Q2).
  const valueOf = (s: ChartSeries, i: number) => {
    const v = s.values[i];
    return v == null ? NOT_OBSERVED : textOf(v, i);
  };
  const reserveFor = (s: ChartSeries) => legendForms(s.values, n, textOf);
  const planForms = (): string[] => {
    if (!plan) return [];
    const forms: string[] = [];
    for (let i = 0; i < n; i++) {
      const p = plan.values[i];
      const note = plan.kind === "value" ? plan.notes?.[i] : undefined;
      forms.push(shapeOf(p == null ? note ?? "None" : planText(plan, p, format, formatPlan)));
    }
    return unique(forms);
  };
  const i = shown;
  const p = plan?.values[i];
  const note = plan?.kind === "value" ? plan.notes?.[i] : undefined;
  const hasPartial = partial !== undefined && partial >= 0 && partial < n;
  const hasGap = series.some((s) => s.values.some((v) => v == null));
  return (
    <div className="basalt-chart-key">
      <p className="basalt-chart-date">
        {unique(Array.from({ length: n }, (_, k) => [shapeOf(dateText(k, true)), shapeOf(dateText(k, false))]).flat()).map((form) => <span key={form} className="basalt-chart-reserve" aria-hidden="true">{form}</span>)}
        <span>{dateText(i, active === null)}</span>
      </p>
      <ul className="basalt-chart-legend" aria-label="Key">
        {series.map((s, k) => (
          <li key={s.id} className="basalt-chart-entry">
            <Swatch kind={bar ? "bar" : "series"} index={k} idBase={idBase} />
            <span className="basalt-chart-name">{s.name}</span>
            <span className="basalt-visually-hidden"> </span>
            <span className="basalt-chart-value" data-series={s.id}>
              {reserveFor(s).map((form) => <span key={form} className="basalt-chart-reserve" aria-hidden="true">{form}</span>)}
              <span data-missing={s.values[i] == null ? "" : undefined} data-part="value">{valueOf(s, i)}</span>
            </span>
          </li>
        ))}
        {plan ? (
          <li className="basalt-chart-entry">
            <Swatch kind={plan.kind} index={0} idBase={idBase} />
            <span className="basalt-chart-name">{plan.label ?? "Plan"}</span>
            <span className="basalt-visually-hidden"> </span>
            <span className="basalt-chart-value" data-series="plan">
              {planForms().map((form) => <span key={form} className="basalt-chart-reserve" aria-hidden="true">{form}</span>)}
              <span data-missing={p == null && !note ? "" : undefined} data-part="value">{p == null ? note ?? "None" : planText(plan, p, format, formatPlan)}</span>
            </span>
          </li>
        ) : null}
        {hasPartial ? (
          <li className="basalt-chart-entry"><Swatch kind="so-far" index={0} idBase={idBase} bar={bar} /><span className="basalt-chart-name">{partialLabel}</span></li>
        ) : null}
        {hasGap ? (
          <NotObservedEntry idBase={idBase} />
        ) : null}
      </ul>
    </div>
  );
}

/** The legend entry for a day that was not observed: the hatch swatch and the words. */
function NotObservedEntry({ idBase }: { idBase: string }) {
  return <li className="basalt-chart-entry"><Swatch kind="missing" index={0} idBase={idBase} /><span className="basalt-chart-name">{NOT_OBSERVED}</span></li>;
}

type SwatchKind = "series" | "bar" | "value" | "band" | "so-far" | "missing";

/** A legend key drawn like its mark, 16px (`size-icon-sm`). Its lengths are the chart tokens, in CSS. */
function Swatch({ kind, index, idBase, bar = false }: { kind: SwatchKind; index: number; idBase: string; bar?: boolean }) {
  const dash = DASHES[index % 3] ?? "solid";
  const shape = SHAPES[index % 3] ?? "disc";
  return (
    <svg className="basalt-chart-swatch" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {kind === "series" ? (
        <>
          <line className="basalt-chart-line" data-dash={dash} x1={0} x2={16} y1={8} y2={8} />
          <Marker shape={shape} x={8} y={8} half={4} grow={2} className="basalt-chart-ring" />
          <Marker shape={shape} x={8} y={8} half={4} className="basalt-chart-mark" />
        </>
      ) : null}
      {kind === "bar" ? <rect className="basalt-chart-bar" x={4} y={2} width={8} height={14} /> : null}
      {kind === "so-far" ? <rect className="basalt-chart-bar" data-so-far="" x={bar ? 5 : 4} y={bar ? 7 : 4} width={bar ? 6 : 8} height={bar ? 8 : 8} /> : null}
      {kind === "value" ? <line className="basalt-chart-plan" x1={0} x2={16} y1={8} y2={8} /> : null}
      {kind === "band" ? (
        <>
          <rect className="basalt-chart-band" x={0} y={3.5} width={16} height={9} />
          <line className="basalt-chart-band-edge" x1={0} x2={16} y1={3.5} y2={3.5} />
          <line className="basalt-chart-band-edge" x1={0} x2={16} y1={12.5} y2={12.5} />
        </>
      ) : null}
      {kind === "missing" ? (
        <>
          <defs>
            <pattern id={`${idBase}-sw`} patternUnits="userSpaceOnUse" width={4} height={4} patternTransform="rotate(45)" className="basalt-chart-hatch-tile">
              <line className="basalt-chart-hatch-line" x1={0.5} y1={0} x2={0.5} y2={4} />
            </pattern>
          </defs>
          <rect x={2} y={0} width={12} height={16} fill={`url(#${idBase}-sw)`} />
        </>
      ) : null}
    </svg>
  );
}

// ---- Markers ----

/**
 * A marker of equal area to an 8px disc: a disc, a square or a diamond. `half` is the disc's radius. A ring is the same shape grown
 * by the cut on every side (the diamond's by the cut on its edges, not its corners). A hollow marker keeps its outer size: its
 * outline sits inside it.
 */
function Marker({ shape, x, y, half, className, grow = 0, hollow = false, line = 2 }: { shape: Shape; x: number; y: number; half: number; className: string; grow?: number; hollow?: boolean; line?: number }) {
  const inset = hollow ? line / 2 : 0;
  const extra = { "data-shape": shape, ...(hollow ? { "data-so-far": "" } : {}) };
  if (shape === "square") {
    const h = (half * Math.sqrt(Math.PI)) / 2 + grow - inset;
    return <rect className={className} x={x - h} y={y - h} width={2 * h} height={2 * h} {...extra} />;
  }
  if (shape === "diamond") {
    const q = half * Math.sqrt(Math.PI / 2) + (grow - inset) * Math.SQRT2;
    return <path className={className} d={`M${x} ${y - q}L${x + q} ${y}L${x} ${y + q}L${x - q} ${y}Z`} {...extra} />;
  }
  return <circle className={className} cx={x} cy={y} r={half + grow - inset} {...extra} />;
}

// ---- Layout ----

interface LayoutInput {
  frame: Frame; measure: (text: string, weight?: number) => number; series: ChartSeries[]; plan: ChartPlan | undefined; bar: boolean; n: number;
  scale: Scale; drawn: Snapshot; formatTick: ((value: number) => string) | undefined; unit: string | undefined;
  /** The short bar plot: no gridlines, no y labels and no gutter for them. */
  bare?: boolean;
}

interface Layout {
  width: number; height: number; narrow: boolean; laneRows: number; x0: number; x1: number; top: number; plotH: number; bottom: number; slot: number;
  direct: boolean; ticks: number[]; tickText: (value: number, index: number) => string; y: (value: number) => number; cx: (i: number) => number; sx: (i: number) => number;
  metrics: Metrics; lo: number; hi: number; barWidth: number; bare: boolean;
}

const numberFormat = (locale?: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });

const tickWriter = (scale: Scale, formatTick: LayoutInput["formatTick"], unit: string | undefined) => {
  const ticks = ticksOf(scale);
  const plain = numberFormat();
  const text = (value: number, index: number) => `${formatTick ? formatTick(value) : plain.format(value)}${unit && index === ticks.length - 1 ? ` ${unit}` : ""}`;
  return { ticks, text };
};

/** The y gutter and right margin this chart needs on its own: the widest tick label, and the widest direct label. */
function naturalSizes({ frame, measure, series, plan, bar, scale, formatTick, unit, bare }: Pick<LayoutInput, "frame" | "measure" | "series" | "plan" | "bar" | "scale" | "formatTick" | "unit" | "bare">): GroupSizes & { narrow: boolean; width: number } {
  const { metrics: m } = frame;
  const width = Math.max(frame.width, 240);
  const narrow = width < m.container;
  const { ticks, text } = tickWriter(scale, formatTick, unit);
  const gutter = bare ? 0 : Math.ceil(Math.max(...ticks.map((t, k) => measure(text(t, k))))) + m.s2;
  const direct = !bar && series.length > 1 && !narrow;
  const names = series.map((s) => s.name).concat(plan ? [plan.label ?? "Plan"] : []);
  return { gutter, right: direct ? Math.ceil(Math.max(...names.map((name) => measure(name)))) + 2 * m.s2 : m.s2, narrow, width };
}

function buildLayout({ frame, series, bar, n, scale, drawn, formatTick, unit, natural, shared, bare = false }: LayoutInput & { natural: ReturnType<typeof naturalSizes>; shared: GroupSizes | undefined }): Layout {
  const { metrics: m } = frame;
  const { width, narrow } = natural;
  const { ticks, text: tickText } = tickWriter(scale, formatTick, unit);
  const direct = !bar && series.length > 1 && !narrow;
  const laneRows = narrow ? 2 : 1;
  const top = laneRows * m.lineH + m.s1;
  const plotH = m.plot;
  const x0 = Math.max(natural.gutter, shared?.gutter ?? 0);
  const x1 = width - Math.max(natural.right, shared?.right ?? 0);
  const slot = (x1 - x0) / n;
  const lo = drawn.lo;
  const hi = drawn.hi;
  return {
    width, height: top + plotH + m.s2 + m.lineH, narrow, laneRows, x0, x1, top, plotH, bottom: top + plotH, slot, direct, ticks, tickText, metrics: m, lo, hi, bare,
    y: (value) => top + (1 - (value - lo) / (hi - lo)) * plotH,
    cx: (i) => x0 + (i + 0.5) * slot,
    sx: (i) => x0 + i * slot,
    barWidth: Math.max(m.barMin, Math.min(m.barMax, Math.round(slot * BAR_SHARE))),
  };
}

function gapsOf(series: ChartSeries[], n: number, from: Snapshot | undefined, progress: number): Array<GapInfo | null> {
  const out: Array<GapInfo | null> = [];
  for (let i = 0; i < n; i++) {
    const gone = series.filter((s) => s.values[i] == null);
    const was = from ? series.filter((_, k) => from.series[k]?.[i] == null) : gone;
    const opacity = gone.length && was.length ? 1 : gone.length ? progress : was.length ? 1 - progress : 0;
    const list = gone.length ? gone : was;
    out.push(list.length
      ? { index: i, opacity, key: `${list.map((s) => s.id).join("+")}:${list[0]?.reasons?.[i] ?? ""}`, names: list.map((s) => s.name), all: list.length === series.length, why: list[0]?.reasons?.[i] ?? undefined }
      : null);
  }
  return out;
}

// ---- The drawing ----

interface SvgProps {
  idBase: string; layout: Layout; series: ChartSeries[]; plan: ChartPlan | undefined; bar: boolean; n: number; drawn: Snapshot; active: number | null;
  partial: number | undefined; gaps: Array<GapInfo | null>; stamps: number[]; formats: DateFormats; dayLabel: (i: number) => string; metrics: Metrics;
  measure: (text: string, weight?: number) => number; unit: string | undefined; formatTick: ((value: number) => string) | undefined; planLabel: string; entering: boolean;
  lit: boolean; trend: Array<number | null> | null; headDay: number | null; plated: readonly [number, number] | null;
}

function ChartSvg({ idBase, layout: L, series, plan, bar, n, drawn, active, partial, gaps, stamps, formats, dayLabel, metrics: m, measure, planLabel, entering, lit, trend, headDay, plated }: SvgProps) {
  const crisp = (v: number) => Math.round(v - 0.5) + 0.5;
  const hatchId = `${idBase}-hatch`;
  const litId = `${idBase}-lit`;
  const els: React.ReactNode[] = [];
  const push = (node: React.ReactNode) => els.push(node);
  const main = drawn.series[0] ?? [];

  // the hatch's pattern: 1px lines at 45 degrees on the pitch
  const defs = (
    <defs key="defs">
      <pattern id={hatchId} patternUnits="userSpaceOnUse" width={m.pitch} height={m.pitch} patternTransform="rotate(45)">
        <line className="basalt-chart-hatch-line" x1={m.hair / 2} y1={0} x2={m.hair / 2} y2={m.pitch} />
      </pattern>
      {lit ? (
        // One gradient for every solid mark in the plot, in the plot's own coordinates: the top of the plot is the lightest stop, so a taller mark reaches brighter ink.
        <linearGradient id={litId} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={L.top} y2={L.bottom}>
          <stop offset={0} className="basalt-chart-lit-stop" data-stop="top" />
          <stop offset={0.55} className="basalt-chart-lit-stop" data-stop="mid" />
          <stop offset={1} className="basalt-chart-lit-stop" data-stop="base" />
        </linearGradient>
      ) : null}
    </defs>
  );

  // gridlines at the ticks (the baseline, after the hatch, at zero only)
  const zeroTick = L.ticks.find((t) => nearly(t, 0));
  L.ticks.forEach((t) => {
    const yy = crisp(L.y(t));
    if (L.bare || yy < L.top - 1 || yy > L.bottom + 1 || t === zeroTick) return;
    push(<line key={`g${t}`} className="basalt-chart-grid" x1={L.x0} x2={L.x1} y1={yy} y2={yy} />);
  });

  // the picked day's plate (a trend marks its day with one head dot on the line, and has no plate)
  if (active !== null && !trend) push(<rect key="plate" className="basalt-chart-plate" x={L.sx(active)} y={L.top} width={L.slot} height={L.plotH} />);

  // the plan band: equal neighbours are one band, the hover wash between 1px edges in the plan's ink; a step has no risers
  if (plan?.kind === "band") {
    runs(0, n - 1, (i) => (drawn.planA[i] == null ? "" : `${drawn.planA[i]}-${drawn.planB[i]}`)).forEach((run, k) => {
      if (!run.key) return;
      const lo = at(drawn.planA, run.from) as number;
      const hi = at(drawn.planB, run.from) as number;
      const xa = Math.round(L.sx(run.from));
      const xb = Math.round(L.sx(run.to + 1));
      const ya = crisp(L.y(hi));
      const yb = crisp(L.y(lo));
      push(<rect key={`b${k}`} className="basalt-chart-band" x={xa} y={ya} width={xb - xa} height={yb - ya} />);
      push(<line key={`be${k}a`} className="basalt-chart-band-edge" x1={xa} x2={xb} y1={ya} y2={ya} />);
      push(<line key={`be${k}b`} className="basalt-chart-band-edge" x1={xa} x2={xb} y1={yb} y2={yb} />);
    });
  }

  // missing: the hatch over the full plot height, over the whole slot (a bar's slot too); the reason is in the lane
  const gapRuns = runs(0, n - 1, (i) => { const g = gaps[i]; return g ? `${g.key}@${g.opacity.toFixed(3)}` : ""; }).filter((r) => r.key);
  gapRuns.forEach((run, k) => {
    const g = gaps[run.from] as GapInfo;
    const xa = Math.round(L.sx(run.from));
    const xb = Math.round(L.sx(run.to + 1));
    push(<rect key={`h${k}`} className="basalt-chart-hatch" x={xa} y={L.top} width={xb - xa} height={L.plotH} fill={`url(#${hatchId})`} opacity={g.opacity} />);
  });

  // the baseline: only where the scale reaches zero, after the hatch
  if (zeroTick !== undefined) {
    const yy = crisp(L.y(zeroTick));
    push(<line key="base" className="basalt-chart-baseline" x1={L.x0} x2={L.x1} y1={yy} y2={yy} />);
  }

  // bars, then the plan in front of them, cut out of them by the surface
  if (bar) {
    const bw = L.barWidth;
    const base = Math.round(L.y(Math.max(L.lo, 0)));
    for (let i = 0; i < n; i++) {
      const v = main[i];
      if (v == null) continue;
      const bx = Math.round(L.cx(i) - bw / 2);
      // A bar runs from the zero baseline to its value: up for a positive one, down for a negative one, square at both ends.
      const endY = Math.round(L.y(v));
      const topY = Math.min(endY, base);
      const run = Math.abs(base - endY);
      if (i === partial) {
        const inset = m.line / 2;
        push(<rect key={`bar${i}`} className="basalt-chart-bar" data-so-far="" x={bx + inset} y={topY + inset} width={Math.max(bw - 2 * inset, 0)} height={Math.max(run - 2 * inset, 0)} />);
      } else if (run > 0) push(<rect key={`bar${i}`} className="basalt-chart-bar" data-below={v < 0 ? "" : undefined} x={bx} y={topY} width={bw} height={run} />);
    }
    // The cut is drawn only where the bar runs on past it, so a bar's end is never hidden.
    for (let i = 0; i < n; i++) {
      const pl = drawn.planA[i];
      const v = main[i];
      if (pl == null || v == null) continue;
      const P = Math.round(L.y(pl));
      const end = Math.round(L.y(v));
      const T = Math.min(end, base);
      const B = Math.max(end, base);
      const half = m.line / 2;
      const bx = Math.round(L.cx(i) - bw / 2);
      if (T <= P - half - m.cut - 2 && B >= P - half) push(<rect key={`cu${i}`} className="basalt-chart-cut" x={bx} y={P - half - m.cut} width={bw} height={m.cut} />);
      if (T <= P - half && B > P + half + m.cut) push(<rect key={`cd${i}`} className="basalt-chart-cut" x={bx} y={P + half} width={bw} height={m.cut} />);
    }
  }
  if (plan?.kind === "value") {
    // one horizontal stroke per run of equal plan across its days; no risers between runs
    runs(0, n - 1, (i) => (drawn.planA[i] == null ? "" : String(drawn.planA[i]))).forEach((run, k) => {
      if (!run.key) return;
      const yy = Math.round(L.y(at(drawn.planA, run.from) as number));
      push(<line key={`p${k}`} className="basalt-chart-plan" x1={Math.round(L.sx(run.from))} x2={Math.round(L.sx(run.to + 1))} y1={yy} y2={yy} />);
    });
  }

  // a trend: each reading a small dot, the trailing mean one straight line that breaks at a gap, the picked day one head dot on the line
  if (!bar && trend) {
    const readings = drawn.series[0] ?? [];
    const radius = m.track / 2;
    readings.forEach((v, i) => { if (v != null) push(<circle key={`rd${i}`} className="basalt-chart-reading" cx={L.cx(i)} cy={L.y(v)} r={radius} />); });
    let d = "";
    let open = false;
    trend.forEach((t, i) => { if (t == null) { open = false; return; } d += `${open ? "L" : "M"}${L.cx(i).toFixed(1)} ${L.y(t).toFixed(1)}`; open = true; });
    const head = headDay !== null ? trend[headDay] : null;
    push(
      <g key="trend" data-series={series[0]?.id} className="basalt-chart-series">
        {d ? <path className="basalt-chart-line" data-dash="solid" d={d} /> : null}
        {headDay !== null && head != null ? (
          <>
            <Marker shape="disc" x={L.cx(headDay)} y={L.y(head)} half={m.mark / 2} grow={m.cut} className="basalt-chart-ring" />
            <Marker shape="disc" x={L.cx(headDay)} y={L.y(head)} half={m.mark / 2} className="basalt-chart-mark" />
          </>
        ) : null}
      </g>,
    );
  }

  // lines: the last series first so series 1 is in front; each series draws its rings, then its line, then its markers
  if (!bar && !trend) {
    const everyDay = L.slot >= MARKER_DAYS * m.mark;
    series.slice().reverse().forEach((s, reversed) => {
      const k = series.length - 1 - reversed;
      const values = drawn.series[k] ?? [];
      const points = values.map((v, i) => (v == null ? null : { i, x: L.cx(i), y: L.y(v) }));
      const marked = points.filter((pt, index) => {
        if (!pt) return false;
        const before = index > 0 ? points[index - 1] : undefined;
        const after = index < points.length - 1 ? points[index + 1] : undefined;
        const besideGap = (index > 0 && !before) || (index < points.length - 1 && !after);
        const isolated = !before && !after;
        return everyDay || pt.i === active || pt.i === n - 1 || pt.i === partial || besideGap || isolated;
      }) as Array<{ i: number; x: number; y: number }>;
      const shape = SHAPES[k] ?? "disc";
      let d = "";
      let open = false;
      points.forEach((pt) => { if (!pt) { open = false; return; } d += `${open ? "L" : "M"}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`; open = true; });
      push(
        <g key={`s${s.id}`} data-series={s.id} className="basalt-chart-series">
          {marked.map((pt) => <Marker key={`r${pt.i}`} shape={shape} x={pt.x} y={pt.y} half={m.mark / 2} grow={m.cut} className="basalt-chart-ring" />)}
          {d ? <path className="basalt-chart-line" data-dash={DASHES[k] ?? "solid"} d={d} /> : null}
          {marked.map((pt) => <Marker key={`m${pt.i}`} shape={shape} x={pt.x} y={pt.y} half={m.mark / 2} className="basalt-chart-mark" hollow={pt.i === partial} line={m.line} />)}
        </g>,
      );
    });
  }

  // the lane above the plot: each gap's reason, in words, from where it starts. Text never sits on the hatch.
  const laneEnds: number[] = Array.from({ length: L.laneRows }, () => -Infinity);
  gapRuns.forEach((run, gi) => {
    const g = gaps[run.from] as GapInfo;
    const row = gi % L.laneRows;
    const next = gapRuns[gi + L.laneRows];
    const previous = gapRuns[gi - 1];
    const start = Math.round(L.sx(run.from));
    const end = Math.round(L.sx(run.to + 1));
    const limit = next ? Math.round(L.sx(next.from)) - m.s2 * 2 : L.width;
    const floor = previous ? Math.round(L.sx(previous.to + 1)) + m.s2 : -Infinity;
    const who = g.all ? NOT_OBSERVED : `${g.names.join(" and ")} not observed`;
    const tries = [g.why ? `${who} · ${g.why}` : who, who, NOT_OBSERVED];
    for (let q = 0; q < tries.length; q++) {
      const text = tries[q] as string;
      const width = measure(text);
      let x = Math.max(start, (laneEnds[row] as number) + m.s2 * 2);
      if (x + width > limit) { if (q < tries.length - 1) continue; x = limit - width; } // only the last words may step back to fit
      if (x < floor || x < (laneEnds[row] as number) + m.s2 * 2 || x > end) continue;
      push(<text key={`l${gi}`} className="basalt-chart-lane" x={x} y={row * m.lineH + m.lineH / 2} opacity={g.opacity}>{text}</text>);
      laneEnds[row] = x + width;
      break;
    }
  });

  // y labels, end-aligned in the gutter; the unit once, on the top tick
  L.ticks.forEach((t, k) => {
    const yy = L.y(t);
    if (L.bare || yy < L.top - 1 || yy > L.bottom + 1) return;
    push(<text key={`y${t}`} className="basalt-chart-axis" x={L.x0 - m.s2} y={yy} textAnchor="end">{L.tickText(t, k)}</text>);
  });

  // x labels at least 56px apart: every day; every k days back from the latest (two weeks or less); else Mondays
  const k = Math.ceil(LABEL_GAP / L.slot);
  const labels: number[] = [];
  if (k <= 1) for (let i = 0; i < n; i++) labels.push(i);
  else if (n <= 14) for (let i = n - 1; i >= 0; i -= k) labels.push(i);
  else {
    const every = Math.ceil(k / 7);
    let monday = 0;
    for (let i = n - 1; i >= 0; i--) if (weekday(at(stamps, i)) === 1) { if (monday % every === 0) labels.push(i); monday++; }
  }
  const long = L.slot * Math.max(k, 1) >= LONG_LABEL && k <= 1;
  const labelOf = (i: number) => (long ? formats.withDay : formats.short).format(at(stamps, i));
  const axisY = L.bottom + m.s2 + m.lineH / 2;
  const anchorFor = (x: number, text: string) => {
    const w = measure(text);
    return x + w / 2 > L.width ? "end" : x - w / 2 < 0 ? "start" : "middle";
  };
  const activeText = active === null ? null : labelOf(active);
  const activeBox = active === null || activeText === null ? null : [L.cx(active) - measure(activeText) / 2 - m.s2, L.cx(active) + measure(activeText) / 2 + m.s2] as const;
  labels.forEach((i) => {
    if (i === active) return;
    const text = labelOf(i);
    const w = measure(text);
    const x = L.cx(i);
    if (activeBox && x + w / 2 > activeBox[0] && x - w / 2 < activeBox[1]) return;
    const anchor = anchorFor(x, text);
    push(<text key={`x${i}`} className="basalt-chart-axis" data-plated={plated && i >= plated[0] && i <= plated[1] ? "" : undefined} x={anchor === "end" ? L.width : anchor === "start" ? 0 : x} y={axisY} textAnchor={anchor}>{text}</text>);
  });
  if (active !== null && activeText !== null) {
    const anchor = anchorFor(L.cx(active), activeText);
    push(<text key="xa" className="basalt-chart-axis" data-active="" data-plated={plated && active >= plated[0] && active <= plated[1] ? "" : undefined} x={anchor === "end" ? L.width : anchor === "start" ? 0 : L.cx(active)} y={axisY} textAnchor={anchor}>{activeText}</text>);
  }

  // direct labels at each line's last observed point, nudged apart by a line of text
  if (L.direct) {
    const ends: Array<{ name: string; y: number }> = [];
    series.forEach((s, si) => {
      const values = drawn.series[si] ?? [];
      for (let i = n - 1; i >= 0; i--) { const v = values[i]; if (v != null) { ends.push({ name: s.name, y: L.y(v) }); break; } }
    });
    const lastA = drawn.planA[n - 1];
    const lastB = drawn.planB[n - 1];
    if (plan && lastA != null) ends.push({ name: planLabel, y: L.y(lastB == null ? lastA : (lastA + lastB) / 2) });
    ends.sort((a, b) => a.y - b.y);
    for (let e = 1; e < ends.length; e++) if ((ends[e] as { y: number }).y - (ends[e - 1] as { y: number }).y < m.lineH) (ends[e] as { y: number }).y = (ends[e - 1] as { y: number }).y + m.lineH;
    ends.forEach((end) => push(<text key={`d${end.name}`} className="basalt-chart-direct" x={L.x1 + m.s2} y={end.y}>{end.name}</text>));
  }

  return (
    <svg
      className="basalt-chart-svg"
      style={lit ? ({ "--_lit": `url("#${litId}")` } as React.CSSProperties) : undefined}
      data-entering={entering ? "" : undefined}
      width={L.width}
      height={L.height}
      viewBox={`0 0 ${L.width} ${L.height}`}
      aria-hidden="true"
      focusable="false"
    >
      {defs}
      {els}
    </svg>
  );
}

// ---- The words for a day ----

interface SentenceInput {
  i: number; n: number; series: ChartSeries[]; plan: ChartPlan | undefined; partial: number | undefined; partialSuffix: string; say: (value: number) => string;
  formats: DateFormats; stamp: number; planLabel: string; today: boolean; trend?: Array<number | null> | null; trendLabel?: string;
}

/** The day's full sentence: the day, each series' value or "not observed" and its reason, the plan, and where the value sits against it. */
function daySentence({ i, n, series, plan, partial, partialSuffix, say, formats, stamp, planLabel, today, trend, trendLabel }: SentenceInput) {
  const parts = [`${formats.long.format(stamp)}${i === n - 1 && today ? ", today" : ""}`];
  series.forEach((s) => {
    const v = s.values[i];
    parts.push(`${s.name} ${v == null ? `not observed${s.reasons?.[i] ? `, ${s.reasons[i]}` : ""}` : `${say(v)}${i === partial ? ` ${partialSuffix}` : ""}`}`);
  });
  if (trend) parts.push(trend[i] == null ? `No ${trendLabel}` : `${trendLabel} ${say(trend[i] as number)}`);
  const p = plan?.values[i];
  const note = plan?.kind === "value" ? plan.notes?.[i] : undefined;
  parts.push(p == null ? note ?? `No ${planLabel.toLowerCase()}` : typeof p === "number" ? `${planLabel} ${say(p)}` : `${planLabel} ${say(p[0])} to ${say(p[1])}`);
  const first = series[0];
  const v0 = first?.values[i];
  if (first && p != null && v0 != null && i !== partial) {
    if (typeof p === "number") parts.push(v0 < p ? `${say(p - v0)} under the plan` : v0 > p ? `${say(v0 - p)} over the plan` : "On the plan");
    else parts.push(v0 < p[0] ? `${first.name} ${say(p[0] - v0)} under the plan` : v0 > p[1] ? `${first.name} ${say(v0 - p[1])} over the plan` : `${first.name} inside the plan`);
  }
  return `${parts.join(". ")}.`;
}

// ---- The table ----

interface TableProps {
  title: string; series: ChartSeries[]; plan: ChartPlan | undefined; n: number; stamps: number[]; formats: DateFormats; partial: number | undefined;
  partialSuffix: string; format: (value: number) => string; formatPlan: TimeChartProps["formatPlan"]; trend?: Array<number | null> | null; trendLabel?: string;
}

/** The still table: fixed layout, the date a pinned row header, newest first, numbers end-aligned, "Not observed" in tertiary with the reason in a note. */
function ChartTable({ title, series, plan, n, stamps, formats, partial, partialSuffix, format, formatPlan, trend, trendLabel }: TableProps) {
  const level = usePanelLevel();
  const frame = React.useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = React.useState(false);
  React.useEffect(() => {
    const element = frame.current;
    if (!element) return undefined;
    // Set from the DOM, not React state: a scroll must not re-render the table.
    const mark = () => element.toggleAttribute("data-scrolled", Math.abs(element.scrollLeft) > 0);
    const measure = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    measure();
    mark();
    element.addEventListener("scroll", mark, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => { element.removeEventListener("scroll", mark); observer.disconnect(); };
  }, []);
  const columns = [{ width: "8rem" }, ...series.map(() => ({ width: "7.5rem" })), ...(trend ? [{ width: "7.5rem" }] : []), ...(plan ? [{ width: "8.5rem" }] : []), {}];
  const rows: React.ReactNode[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const notes: string[] = [];
    const cells = series.map((s) => {
      const v = s.values[i];
      if (v == null) {
        const reason = s.reasons?.[i];
        if (reason) notes.push(`${series.length > 1 ? `${s.name} ` : ""}${reason}`);
        return <td key={s.id} data-numeric=""><span className="basalt-chart-not-observed">{NOT_OBSERVED}</span></td>;
      }
      return <td key={s.id} data-numeric="">{format(v)}{i === partial ? ` ${partialSuffix}` : ""}</td>;
    });
    const p = plan?.values[i];
    const note = plan?.kind === "value" ? plan.notes?.[i] : undefined;
    if (p == null && note) notes.push(note);
    const text = unique(notes).join("; ");
    rows.push(
      <tr key={i}>
        <th scope="row">{formats.withDay.format(at(stamps, i))}</th>
        {cells}
        {trend ? <td data-numeric="">{trend[i] == null ? "" : format(trend[i] as number)}</td> : null}
        {plan ? <td data-numeric="">{p == null ? "" : planText(plan, p, format, formatPlan)}</td> : null}
        <td className="basalt-chart-note">{text ? text.charAt(0).toUpperCase() + text.slice(1) : ""}</td>
      </tr>,
    );
  }
  const minWidth = `calc(${columns.length - 1} * 8rem + 12rem)`;
  return (
    <>
      <div ref={frame} className="basalt-table-container" data-row-density="default" data-level={level} role="region" aria-label={`${title} table`} tabIndex={0}>
        {inLevel(level, (
          <table className="basalt-table" data-fixed="" data-pinned="1" style={{ minWidth }}>
            <colgroup>{columns.map((column, c) => <col key={c} style={"width" in column ? { width: column.width } : undefined} />)}</colgroup>
            <caption className="basalt-visually-hidden">{title}, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                {series.map((s) => <th key={s.id} scope="col" data-numeric="">{s.name}</th>)}
                {trend ? <th scope="col" data-numeric="">{trendLabel}</th> : null}
                {plan ? <th scope="col" data-numeric="">{plan.label ?? "Plan"}</th> : null}
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        ))}
      </div>
      {overflows ? <p className="basalt-chart-scroll-hint">Scroll sideways for every column.</p> : null}
    </>
  );
}
