import * as React from "react";

import { Kbd } from "./kbd";
import { useShortcutsVisible } from "./keyboard";
import { inLevel, usePanelLevel } from "./layers";
import { bezier, glideTiming, useReducedMotion } from "./motion";
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
  /** Why a day was not observed, per day: "not worn, travel". It is said in the lane, the summary, the readout and the table. */
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
}

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
  for (let power = magnitude - 2; power <= magnitude + 2; power++) for (const base of NICE) yield base * 10 ** power;
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

function ticksOf(scale: Scale) {
  const out: number[] = [];
  for (let k = 0; k <= Math.round((scale.hi - scale.lo) / scale.step); k++) out.push(Math.round((scale.lo + k * scale.step) * 1e9) / 1e9);
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
  mark: number; cut: number; line: number; hair: number; pitch: number; barMax: number; barMin: number; plot: number;
  s1: number; s2: number; lineH: number; container: number; dash: number; dashGap: number;
}

function readMetrics(element: HTMLElement): Metrics {
  const style = getComputedStyle(element);
  const px = (name: string, fallback: number) => {
    const value = parseFloat(style.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    mark: px("--basalt-size-chart-mark", 8), cut: px("--basalt-size-cut", 2), line: px("--basalt-size-chart-line", 2), hair: px("--basalt-size-hairline", 1),
    pitch: px("--basalt-size-hatch-pitch", 4), barMax: px("--basalt-size-chart-bar-max", 24), barMin: px("--basalt-size-chart-bar-min", 2),
    plot: px("--basalt-size-chart-plot", 240), s1: px("--basalt-space-1", 4), s2: px("--basalt-space-2", 8), lineH: px("--basalt-text-xs-line-height", 16),
    container: px("--basalt-size-breakpoint-container", 480), dash: px("--basalt-size-chart-dash", 6), dashGap: px("--basalt-size-chart-dash-gap", 4),
  };
}

interface Frame { width: number; metrics: Metrics }

// ---- A stack of charts shares one gutter, so their plots line up ----

interface GroupSizes { gutter: number; right: number }
interface GroupApi { shared: GroupSizes; report: (id: string, sizes: GroupSizes | null) => void }
const GroupContext = React.createContext<GroupApi | null>(null);

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
  partial, partialLabel = "Today so far", partialSuffix = "so far", formatPlan, now, locale = "en-GB", className, ...props
}: TimeChartProps) {
  // The hint legend is hidden on touch until a hardware key is pressed; this asks for the same reveal the shortcut chips use.
  useShortcutsVisible();
  const bar = kind === "bar";
  const series = React.useMemo(() => allSeries.slice(0, bar ? 1 : 3), [allSeries, bar]);
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
  const targetSnap = React.useMemo(() => snapshotOf(series, plan, target, n), [series, plan, target, n]);

  // ---- The glide: a value that changes in place travels with the scale; a new range fades in ----
  const [motion, setMotion] = React.useState<{ from: Snapshot; progress: number } | null>(null);
  const drawnRef = React.useRef(targetSnap);
  const previousRef = React.useRef({ snap: targetSnap, dayKey });
  const [range, setRange] = React.useState({ key: dayKey, serial: 0 });
  if (range.key !== dayKey) setRange({ key: dayKey, serial: range.serial + 1 });
  React.useLayoutEffect(() => {
    // Before paint, so the frame that has the new values already starts from what was on screen.
    const before = previousRef.current;
    previousRef.current = { snap: targetSnap, dayKey };
    if (before.dayKey !== dayKey || reduced) { setMotion(null); drawnRef.current = targetSnap; return undefined; }
    if (sameSnapshot(before.snap, targetSnap)) return undefined;
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
      setFrame((current) => (current && Math.abs(current.width - width) < 0.5 ? current : { width, metrics: current?.metrics ?? readMetrics(plot) }));
    };
    setFrame({ width: plot.clientWidth, metrics: readMetrics(plot) });
    const observer = new ResizeObserver(update);
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);
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

  React.useEffect(() => {
    if (pinned === null) return undefined;
    // A tap holds until a tap outside.
    const outside = (event: PointerEvent) => { if (!plotRef.current?.contains(event.target as Node)) setPinned(null); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [pinned]);

  // ---- The model: everything drawn comes from here ----
  const natural = frame && n > 0 ? naturalSizes({ frame, measure, series, plan, bar, scale: target, formatTick, unit }) : null;
  const reportGutter = natural?.gutter;
  const reportRight = natural?.right;
  React.useLayoutEffect(() => {
    if (!group || reportGutter === undefined || reportRight === undefined) return undefined;
    group.report(id, { gutter: reportGutter, right: reportRight });
    return () => group.report(id, null);
  }, [group?.report, id, reportGutter, reportRight]);
  const layout = frame && natural && n > 0
    ? buildLayout({ frame, measure, series, plan, bar, n, scale: target, drawn, formatTick, unit, natural, shared: group?.shared })
    : null;
  const dayLabel = (i: number) => formats.short.format(at(stamps, i));
  const gaps = React.useMemo(() => gapsOf(series, n, motion?.from, progress), [series, n, motion?.from, progress]);

  const pointerDay = (event: React.PointerEvent) => {
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
    () => stamps.map((_, i) => daySentence({ i, n, series, plan, partial, partialSuffix, say, formats, stamp: at(stamps, i), planLabel: plan?.label ?? "Plan", today: lastIsToday })),
    [stamps, series, plan, partial, partialSuffix, say, formats, n, lastIsToday],
  );

  const Heading = `h${heading}` as const;
  return (
    <figure
      {...props}
      aria-labelledby={titleId}
      data-kind={kind}
      data-narrow={layout?.narrow ? "" : undefined}
      className={join("basalt-chart", className)}
    >
      <div className="basalt-chart-head">
        <Heading id={titleId} className="basalt-chart-title">{title}</Heading>
        {source ? <p className="basalt-chart-source">{source}</p> : null}
      </div>
      <Readout
        series={series} plan={plan} bar={bar} n={n} shown={shown} active={active} partial={partial} partialLabel={partialLabel} partialSuffix={partialSuffix}
        format={format} formatPlan={formatPlan} formats={formats} stamps={stamps} idBase={id}
      />
      <div
        ref={plotRef}
        className="basalt-chart-plot"
        style={layout ? { height: layout.height } : undefined}
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
            planLabel={plan?.label ?? "Plan"}
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
        <span id={keysId} className="basalt-visually-hidden">Arrow keys move a day, Page Up and Page Down a week, Home and End to the ends.</span>
      </div>
      <p className="basalt-chart-hint" data-kbd-hint="" aria-hidden="true">
        <span><Kbd>←</Kbd> <Kbd>→</Kbd> a day</span>
        <span><Kbd>PgUp</Kbd> <Kbd>PgDn</Kbd> a week</span>
        <span><Kbd>Home</Kbd> <Kbd>End</Kbd> the ends</span>
      </p>
      <div className="basalt-chart-foot">
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
      </div>
      <div id={tableId} className="basalt-chart-table" hidden={!open}>
        {open ? (
          <ChartTable
            title={title} series={series} plan={plan} n={n} stamps={stamps} formats={formats} partial={partial} partialSuffix={partialSuffix}
            format={format} formatPlan={formatPlan}
          />
        ) : null}
      </div>
      <figcaption id={captionId} className="basalt-chart-summary">{summary}</figcaption>
    </figure>
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

function Readout({ series, plan, bar, n, shown, active, partial, partialLabel, partialSuffix, format, formatPlan, formats, stamps, idBase }: ReadoutProps) {
  const dateOf = (i: number) => formats.withDay.format(at(stamps, i));
  const valueOf = (s: ChartSeries, i: number) => {
    const v = s.values[i];
    // A day that was not observed says why, in the lane's own words ("Not observed · not worn, travel").
    return v == null ? (s.reasons?.[i] ? `${NOT_OBSERVED} · ${s.reasons[i]}` : NOT_OBSERVED) : `${format(v)}${i === partial ? ` ${partialSuffix}` : ""}`;
  };
  // Each value reserves the widest of its forms (digits as zeros: the numerals are tabular), so a new day moves nothing.
  const reserveFor = (s: ChartSeries) => {
    const forms: string[] = [];
    for (let i = 0; i < n; i++) forms.push(shapeOf(valueOf(s, i)));
    return unique(forms.concat(s.values.some((v) => v == null) ? [NOT_OBSERVED] : []));
  };
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
        {unique(Array.from({ length: n }, (_, k) => shapeOf(`Latest · ${dateOf(k)}`))).map((form) => <span key={form} className="basalt-chart-reserve" aria-hidden="true">{form}</span>)}
        <span>{active === null ? "Latest · " : ""}{dateOf(i)}</span>
      </p>
      <ul className="basalt-chart-legend" aria-label="Key">
        {series.map((s, k) => (
          <li key={s.id} className="basalt-chart-entry">
            <Swatch kind={bar ? "bar" : "series"} index={k} idBase={idBase} />
            <span className="basalt-chart-name">{s.name}</span>
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
          <li className="basalt-chart-entry"><Swatch kind="missing" index={0} idBase={idBase} /><span className="basalt-chart-name">{NOT_OBSERVED}</span></li>
        ) : null}
      </ul>
    </div>
  );
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
}

interface Layout {
  width: number; height: number; narrow: boolean; laneRows: number; x0: number; x1: number; top: number; plotH: number; bottom: number; slot: number;
  direct: boolean; ticks: number[]; tickText: (value: number, index: number) => string; y: (value: number) => number; cx: (i: number) => number; sx: (i: number) => number;
  metrics: Metrics; lo: number; hi: number; barWidth: number;
}

const numberFormat = (locale?: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });

const tickWriter = (scale: Scale, formatTick: LayoutInput["formatTick"], unit: string | undefined) => {
  const ticks = ticksOf(scale);
  const plain = numberFormat();
  const text = (value: number, index: number) => `${formatTick ? formatTick(value) : plain.format(value)}${unit && index === ticks.length - 1 ? ` ${unit}` : ""}`;
  return { ticks, text };
};

/** The y gutter and right margin this chart needs on its own: the widest tick label, and the widest direct label. */
function naturalSizes({ frame, measure, series, plan, bar, scale, formatTick, unit }: Pick<LayoutInput, "frame" | "measure" | "series" | "plan" | "bar" | "scale" | "formatTick" | "unit">): GroupSizes & { narrow: boolean; width: number } {
  const { metrics: m } = frame;
  const width = Math.max(frame.width, 240);
  const narrow = width < m.container;
  const { ticks, text } = tickWriter(scale, formatTick, unit);
  const gutter = Math.ceil(Math.max(...ticks.map((t, k) => measure(text(t, k))))) + m.s2;
  const direct = !bar && series.length > 1 && !narrow;
  const names = series.map((s) => s.name).concat(plan ? [plan.label ?? "Plan"] : []);
  return { gutter, right: direct ? Math.ceil(Math.max(...names.map((name) => measure(name)))) + 2 * m.s2 : m.s2, narrow, width };
}

function buildLayout({ frame, series, bar, n, scale, drawn, formatTick, unit, natural, shared }: LayoutInput & { natural: ReturnType<typeof naturalSizes>; shared: GroupSizes | undefined }): Layout {
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
    width, height: top + plotH + m.s2 + m.lineH, narrow, laneRows, x0, x1, top, plotH, bottom: top + plotH, slot, direct, ticks, tickText, metrics: m, lo, hi,
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
}

function ChartSvg({ idBase, layout: L, series, plan, bar, n, drawn, active, partial, gaps, stamps, formats, dayLabel, metrics: m, measure, planLabel, entering }: SvgProps) {
  const crisp = (v: number) => Math.round(v - 0.5) + 0.5;
  const hatchId = `${idBase}-hatch`;
  const els: React.ReactNode[] = [];
  const push = (node: React.ReactNode) => els.push(node);
  const main = drawn.series[0] ?? [];

  // the hatch's pattern: 1px lines at 45 degrees on the pitch
  const defs = (
    <defs key="defs">
      <pattern id={hatchId} patternUnits="userSpaceOnUse" width={m.pitch} height={m.pitch} patternTransform="rotate(45)">
        <line className="basalt-chart-hatch-line" x1={m.hair / 2} y1={0} x2={m.hair / 2} y2={m.pitch} />
      </pattern>
    </defs>
  );

  // gridlines at the ticks (the baseline, after the hatch, at zero only)
  const zeroTick = L.ticks.find((t) => nearly(t, 0));
  L.ticks.forEach((t) => {
    const yy = crisp(L.y(t));
    if (yy < L.top - 1 || yy > L.bottom + 1 || t === zeroTick) return;
    push(<line key={`g${t}`} className="basalt-chart-grid" x1={L.x0} x2={L.x1} y1={yy} y2={yy} />);
  });

  // the picked day's plate
  if (active !== null) push(<rect key="plate" className="basalt-chart-plate" x={L.sx(active)} y={L.top} width={L.slot} height={L.plotH} />);

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
      const topY = Math.round(L.y(v));
      if (i === partial) {
        const inset = m.line / 2;
        push(<rect key={`bar${i}`} className="basalt-chart-bar" data-so-far="" x={bx + inset} y={topY + inset} width={Math.max(bw - 2 * inset, 0)} height={Math.max(base - topY - 2 * inset, 0)} />);
      } else if (base - topY > 0) push(<rect key={`bar${i}`} className="basalt-chart-bar" x={bx} y={topY} width={bw} height={base - topY} />);
    }
    // The cut is drawn only where the bar runs on past it, so a bar's end is never hidden.
    for (let i = 0; i < n; i++) {
      const pl = drawn.planA[i];
      const v = main[i];
      if (pl == null || v == null) continue;
      const P = Math.round(L.y(pl));
      const T = Math.round(L.y(v));
      const half = m.line / 2;
      const bx = Math.round(L.cx(i) - bw / 2);
      if (T <= P - half - m.cut - 2) push(<rect key={`cu${i}`} className="basalt-chart-cut" x={bx} y={P - half - m.cut} width={bw} height={m.cut} />);
      if (T <= P - half && base > P + half + m.cut) push(<rect key={`cd${i}`} className="basalt-chart-cut" x={bx} y={P + half} width={bw} height={m.cut} />);
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

  // lines: the last series first so series 1 is in front; each series draws its rings, then its line, then its markers
  if (!bar) {
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
    if (yy < L.top - 1 || yy > L.bottom + 1) return;
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
    push(<text key={`x${i}`} className="basalt-chart-axis" x={anchor === "end" ? L.width : anchor === "start" ? 0 : x} y={axisY} textAnchor={anchor}>{text}</text>);
  });
  if (active !== null && activeText !== null) {
    const anchor = anchorFor(L.cx(active), activeText);
    push(<text key="xa" className="basalt-chart-axis" data-active="" x={anchor === "end" ? L.width : anchor === "start" ? 0 : L.cx(active)} y={axisY} textAnchor={anchor}>{activeText}</text>);
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
  formats: DateFormats; stamp: number; planLabel: string; today: boolean;
}

/** The day's full sentence: the day, each series' value or "not observed" and its reason, the plan, and where the value sits against it. */
function daySentence({ i, n, series, plan, partial, partialSuffix, say, formats, stamp, planLabel, today }: SentenceInput) {
  const parts = [`${formats.long.format(stamp)}${i === n - 1 && today ? ", today" : ""}`];
  series.forEach((s) => {
    const v = s.values[i];
    parts.push(`${s.name} ${v == null ? `not observed${s.reasons?.[i] ? `, ${s.reasons[i]}` : ""}` : `${say(v)}${i === partial ? ` ${partialSuffix}` : ""}`}`);
  });
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
  partialSuffix: string; format: (value: number) => string; formatPlan: TimeChartProps["formatPlan"];
}

/** The still table: fixed layout, the date a pinned row header, newest first, numbers end-aligned, "Not observed" in tertiary with the reason in a note. */
function ChartTable({ title, series, plan, n, stamps, formats, partial, partialSuffix, format, formatPlan }: TableProps) {
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
  const columns = [{ width: "8rem" }, ...series.map(() => ({ width: "7.5rem" })), ...(plan ? [{ width: "8.5rem" }] : []), {}];
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
