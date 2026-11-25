import * as React from "react";

import { useEased, useEasedSamples, useReducedMotion } from "./motion";
import { NumberTicker } from "./number-ticker";
import { join } from "./utils";

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
   * scale moves, so it decides its own rounding. Left out, as before: the latest value is grouped with the decimals it has ("2,440", "1.25"), the
   * image's name says the plain number ("1.25") and the scale's ends are whole numbers ("0", "2,440").
   */
  format?: (value: number) => string;
  className?: string;
}

const WIDTH = 100;
const HEIGHT = 36;

function pointY(value: number, ceiling: number) {
  const scale = Math.max(ceiling, 1);
  return HEIGHT - 2 - (value / scale) * (HEIGHT - 4);
}

// Built on first use, not when the module loads.
let formatter: Intl.NumberFormat | undefined;
const formatCount = (value: number) => (formatter ??= new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })).format(value);

/**
 * A monochrome line with its latest value, for a live number that needs a shape beside it. While
 * loading the line sits flat and breathes. When data arrives it eases into the samples, and when the
 * range changes, the line, the scale and the labels move together over `slow` on `ease-out`: the
 * headline number, the axis label and the scale. A new peak widens the scale at once, so it is never
 * clipped; it eases back in. Reduced motion snaps everything. The accessible value is the target. There
 * is no fill, gradient or glow, and nothing else a chart would have: this is not a charting component.
 */
export function Sparkline({ data, loading = false, paused = false, label, empty = "No data yet", format, className }: SparklineProps) {
  const peak = Math.max(1, data.reduce((max, value) => Math.max(max, value), 0));
  const ceiling = useEased(peak, { growth: "snap", paused });
  const progress = useEased(loading ? 0 : 1, { paused });
  const latest = data.at(-1) ?? 0;
  // The headline is part of the morph: while paused it keeps the value it had, so it never says a number the held line does not reach.
  // Reduced motion snaps everything, so it follows the data.
  const held = React.useRef(latest);
  const reduced = useReducedMotion();
  if (!paused || reduced) held.current = latest;
  const quiet = !loading && data.length === 0;
  // The line's samples glide with the scale, and hold with it while paused. While the line is rising out of its loading state the
  // `progress` ease is already carrying that move, so the new samples land at once instead of easing twice.
  const samples = useEasedSamples(data.length ? data : [0, 0], { paused, snap: loading || progress < 1 });
  const points = samples
    .map((value, index) => {
      const x = samples.length === 1 ? WIDTH / 2 : (index / (samples.length - 1)) * WIDTH;
      const y = pointY(0, ceiling) * (1 - progress) + pointY(value, ceiling) * progress;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className={join("basalt-sparkline", className)} data-loading={loading ? "" : undefined} data-empty={quiet ? "" : undefined}>
      <div className="basalt-sparkline-head">
        <span className="basalt-sparkline-label">{label}</span>
        {data.length ? <NumberTicker glide value={paused ? held.current : latest} format={format} /> : null}
      </div>
      {quiet ? (
        <p className="basalt-sparkline-empty">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${label}, ${format ? format(latest) : latest}`}>
          <polyline className="basalt-sparkline-line" points={points} />
        </svg>
      )}
      {data.length ? (
        <div className="basalt-sparkline-axis">
          <span>{format ? format(0) : "0"}</span>
          {/* the scale as drawn, frame by frame, as plain figures; the target is what is read */}
          <span>
            <span className="basalt-visually-hidden">{format ? format(peak) : formatCount(peak)}</span>
            <span aria-hidden="true">{format ? format(ceiling) : formatCount(Math.round(ceiling))}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
