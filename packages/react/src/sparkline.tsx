import * as React from "react";

import { useEased, useEasedSamples, useReducedMotion } from "./motion";
import { NumberTicker } from "./number-ticker";
import { formatClock, formatDay } from "./time-format";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

/** A named moment on a sparkline: a marker on the line at that moment and a line of the key under it ("2:14 PM Calibration"). */
export interface SparklineMark {
  time: Date | number;
  label: string;
}

export interface SparklineProps {
  /** Samples, oldest first. An empty list is the quiet empty state. */
  data: number[];
  /** A flat line breathes, then eases into `data` when this becomes false. */
  loading?: boolean;
  /** Freezes the morph. Resuming continues from where it stopped. */
  paused?: boolean;
  /** Names the sparkline for assistive technology. */
  label: string;
  /** Sentence shown when there is nothing to plot and it is not loading. */
  empty?: string;
  /**
   * Writes a reading: the latest value, the scale's ends and the value read with the label ("0.4%", "12 ms"). It is given the eased value while the
   * scale moves, so it decides its own rounding. Left out: the latest value is grouped with the decimals it has ("2,440", "1.25"), the image's name says
   * the plain number ("1.25"), and the scale is whole from a peak of 100 and two significant figures under it ("0.04", "1.5", "42"), its ends sharing the
   * peak's decimal places so its digits do not flicker while it eases.
   */
  format?: (value: number) => string;
  /**
   * One moment a sample, ascending (cimip-gaps-3 T2, item 5). A sample is drawn where it happened (its x is its moment), and a time lane under the plot
   * writes the first and last moments (and the midpoint when there is room): clocks under 48 hours, days past it. A wrong length warns and draws no axis.
   */
  times?: ReadonlyArray<Date | number>;
  locale?: string;
  /** The zone the times are written in: an IANA name. Defaults to the runtime's. */
  timeZone?: string;
  /** Up to two named moments: a diamond, then a square, on the line, and a key under the time lane. They need `times`. */
  marks?: ReadonlyArray<SparklineMark>;
  className?: string;
}

/** The server's drawing box (and the first frame before the plot is measured); the client then draws in real CSS pixels at the plot's width. */
const WIDTH = 100;
const HEIGHT = 36;
const PLOT_HEIGHT = 64;
const PAD = 2;

// Built on first use, not when the module loads.
let formatters: Map<number, Intl.NumberFormat> | undefined;
const fixed = (decimals: number) => {
  formatters ??= new Map();
  let found = formatters.get(decimals);
  if (!found) { found = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); formatters.set(decimals, found); }
  return found;
};
let significant: Intl.NumberFormat | undefined;
/** The scale's decimal places from the data's peak: none from 100, else as many as two significant figures need ("0.04" two, "1.5" one, "42" none). */
export function scaleDecimals(peak: number) {
  const size = Math.abs(peak);
  if (!(size > 0) || size >= 100) return 0;
  const written = (significant ??= new Intl.NumberFormat("en-US", { maximumSignificantDigits: 2, useGrouping: false })).format(size);
  return written.split(".")[1]?.length ?? 0;
}

/** The scale's extent: 0 to the data's peak; a series under 0 runs from its lowest to its highest. An all-zero series has a ceiling of 1 for its coordinates. */
export function sparklineExtent(data: readonly number[]) {
  let low = 0;
  let high = 0;
  for (const value of data) { if (value < low) low = value; if (value > high) high = value; }
  return { low, high, flat: low === 0 && high === 0 };
}

/**
 * A monochrome line with its latest value, for a live number that needs a shape beside it. While loading the line sits flat and breathes. When data arrives it
 * eases into the samples, and when the range changes, the line, the scale and the labels move together over `slow` on `ease-out`. A new peak widens the scale at
 * once, so it is never clipped; it eases back in. Reduced motion snaps everything. The scale is a gutter at the plot's start (the peak at its top edge, the floor
 * at its bottom), from the data's own range. The accessible value is the target, named from the data each render. No fill, gradient, glow, baseline, gridline or
 * line through the plot: this is not a charting component.
 */
export function Sparkline({ data, loading = false, paused = false, label, empty = "No data yet", format, times, locale, timeZone, marks, className }: SparklineProps) {
  const extent = sparklineExtent(data);
  const ceiling = useEased(extent.flat ? 1 : extent.high, { growth: "snap", paused });
  // The floor follows a new low at once too (a value under it is never clipped) and eases back.
  const floorEased = -useEased(-extent.low, { growth: "snap", paused });
  const progress = useEased(loading ? 0 : 1, { paused });
  const latest = data.at(-1) ?? 0;
  // The headline is part of the morph: while paused it keeps the value it had, so it never says a number the held line does not reach.
  const held = React.useRef(latest);
  const reduced = useReducedMotion();
  if (!paused || reduced) held.current = latest;
  const quiet = !loading && data.length === 0;
  const samples = useEasedSamples(data.length ? data : [0, 0], { paused, snap: loading || progress < 1 });

  // ---- times and marks
  const timed = times !== undefined && times.length === data.length && data.length > 0;
  if (process.env.NODE_ENV !== "production" && times !== undefined && times.length !== data.length) console.warn(`Basalt Sparkline: \`times\` has ${times.length} moments for ${data.length} samples; no time axis is drawn.`);
  const moments = timed ? times.map((t) => new Date(t).getTime()) : null;
  const first = moments?.[0] ?? 0;
  const last = moments?.at(-1) ?? 0;
  const span = last - first;
  let kept: { time: number; label: string }[] = [];
  if (marks?.length) {
    if (process.env.NODE_ENV !== "production") {
      if (!timed) console.warn("Basalt Sparkline: `marks` need `times`; none is drawn.");
      if (marks.length > 2) console.warn("Basalt Sparkline: two marks at most (three named moments is a chart); the first two are drawn.");
    }
    if (timed) {
      kept = marks.slice(0, 2).map((m) => ({ time: new Date(m.time).getTime(), label: m.label })).filter((m) => {
        const inside = m.time >= first && m.time <= last;
        if (!inside && process.env.NODE_ENV !== "production") console.warn(`Basalt Sparkline: the mark "${m.label}" is outside the samples' span; it is left out.`);
        return inside;
      });
    }
  }
  const writeTime = (t: number) => (span < 48 * 3_600_000 ? formatClock(t, { timeZone, locale }) : formatDay(t, { now: last, timeZone, locale })).text;

  // ---- the plot in real CSS pixels at its measured width (the server keeps the old drawing box)
  const plotRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState<{ width: number; mark: number; cut: number } | null>(null);
  React.useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => {
      const css = getComputedStyle(el);
      const px = (name: string, fallback: number) => Number.parseFloat(css.getPropertyValue(name)) || fallback;
      const width = el.getBoundingClientRect().width;
      setBox((was) => (was && Math.abs(was.width - width) < 0.5 ? was : { width, mark: px("--basalt-size-chart-mark", 8), cut: px("--basalt-size-cut", 2) }));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [quiet]);
  const W = box?.width ?? WIDTH;
  const H = box ? PLOT_HEIGHT : HEIGHT;
  const range = Math.max(ceiling - floorEased, Number.EPSILON);
  const yOf = (value: number) => H - PAD - ((value - floorEased) / range) * (H - PAD * 2);
  const xOf = (index: number) => {
    if (moments && span > 0) return ((moments[index]! - first) / span) * W;
    return samples.length === 1 ? W / 2 : (index / (samples.length - 1)) * W;
  };
  const ys = samples.map((value) => yOf(floorEased) * (1 - progress) + yOf(value) * progress);
  const points = samples.map((_, index) => `${xOf(index).toFixed(2)},${ys[index]!.toFixed(2)}`).join(" ");
  /** A moment's point on the line: its x by elapsed time, its y read off the line between the samples either side. */
  const pointAt = (t: number) => {
    const x = span > 0 ? ((t - first) / span) * W : W / 2;
    let y = ys[0] ?? H / 2;
    if (moments) for (let i = 0; i < moments.length - 1; i += 1) {
      if (t >= moments[i]! && t <= moments[i + 1]!) { const f = moments[i + 1]! === moments[i]! ? 0 : (t - moments[i]!) / (moments[i + 1]! - moments[i]!); y = ys[i]! + (ys[i + 1]! - ys[i]!) * f; break; }
      if (i === moments.length - 2) y = ys.at(-1)!;
    }
    return { x, y };
  };

  // ---- the scale's words
  const decimals = scaleDecimals(extent.flat ? 0 : Math.max(Math.abs(extent.high), Math.abs(extent.low)));
  const writeScale = (value: number) => (format ? format(value) : fixed(decimals).format(value));
  const top = extent.flat ? null : writeScale(ceiling);
  const bottom = writeScale(extent.flat ? 0 : floorEased);
  const said = `${label}, ${format ? format(latest) : latest}${timed ? `, ${writeTime(first)} to ${writeTime(last)}, peak ${format ? format(extent.high) : extent.high}` : ""}${kept.map((m) => `, ${m.label} at ${writeTime(m.time)}`).join("")}`;

  // The time lane: the first moment at the plot's start, the last at its end, the midpoint centred only when all three stay 56px apart (read from their
  // own boxes after layout, so it holds for any locale's words).
  const middle = timed ? writeTime(first + span / 2) : null;
  const laneRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const lane = laneRef.current;
    if (!lane) return;
    const [a, b, c] = [...lane.children].map((el) => el.getBoundingClientRect());
    if (!a || !b || !c) return;
    lane.toggleAttribute("data-crowded", b.left - a.right < 56 || c.left - b.right < 56);
  });
  const markShape = (index: number, x: number, y: number, size: number, cut: number) => {
    const h = size / 2;
    return index === 0
      ? <polygon key={index} className="basalt-sparkline-mark" points={`${x},${y - h} ${x + h},${y} ${x},${y + h} ${x - h},${y}`} strokeWidth={cut * 2} />
      : <rect key={index} className="basalt-sparkline-mark" x={x - h} y={y - h} width={size} height={size} strokeWidth={cut * 2} />;
  };

  return (
    <div className={join("basalt-sparkline", className)} data-loading={loading ? "" : undefined} data-empty={quiet ? "" : undefined} data-timed={timed ? "" : undefined}>
      <div className="basalt-sparkline-head">
        <span className="basalt-sparkline-label">{label}</span>
        {data.length ? <NumberTicker glide value={paused ? held.current : latest} format={format} /> : null}
      </div>
      {quiet ? (
        <p className="basalt-sparkline-empty">{empty}</p>
      ) : (
        <div className="basalt-sparkline-body">
          {data.length ? (
            <span className="basalt-sparkline-scale" aria-hidden="true">
              {/* Both ends hold the wider label's room, so the gutter is one width while the scale eases. */}
              <span className="basalt-sparkline-scale-top">{top ?? ""}</span>
              <span className="basalt-sparkline-scale-bottom">{bottom}</span>
            </span>
          ) : <span />}
          <div className="basalt-sparkline-plot" ref={plotRef}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio={box ? "none" : undefined} role="img" aria-label={said}>
              <polyline className="basalt-sparkline-line" points={points} />
              {box ? kept.map((m, i) => { const p = pointAt(m.time); return markShape(i, p.x, p.y, box.mark, box.cut); }) : null}
            </svg>
          </div>
          {timed ? (
            <span className="basalt-sparkline-times" ref={laneRef} aria-hidden="true">
              <span>{writeTime(first)}</span>
              <span className="basalt-sparkline-times-middle">{middle}</span>
              <span>{writeTime(last)}</span>
            </span>
          ) : null}
          {kept.length ? (
            <span className="basalt-sparkline-key" aria-hidden="true">
              {kept.map((m, i) => (
                <span key={i} className="basalt-sparkline-key-item">
                  <svg className="basalt-sparkline-key-mark" viewBox="0 0 8 8" width="8" height="8" focusable="false">
                    {i === 0 ? <polygon className="basalt-sparkline-mark" points="4,0 8,4 4,8 0,4" /> : <rect className="basalt-sparkline-mark" x="0" y="0" width="8" height="8" />}
                  </svg>
                  <span>{writeTime(m.time)} {m.label}</span>
                </span>
              ))}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
