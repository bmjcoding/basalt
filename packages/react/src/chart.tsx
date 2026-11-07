import * as React from "react";

import { NumberTicker } from "./feedback";
import { useReducedMotion } from "./motion";
import { join } from "./utils";

export interface ChartProps {
  /** Samples, oldest first. An empty list is the quiet empty state. */
  data: number[];
  /** A flat line breathes, then eases into `data` when this becomes false. */
  loading?: boolean;
  /** Freezes the morph. Resuming continues from where it stopped. */
  paused?: boolean;
  /** Names the chart for assistive technology. */
  label: string;
  /** Sentence shown when there is nothing to plot and it is not loading. */
  empty?: string;
  className?: string;
}

const WIDTH = 100;
const HEIGHT = 36;

function pointY(value: number, ceiling: number) {
  const scale = Math.max(ceiling, 1);
  return HEIGHT - 2 - (value / scale) * (HEIGHT - 4);
}

/**
 * A monochrome line. While loading, the line sits flat and breathes.
 * When data arrives it eases into the samples. The vertical range snaps
 * outward immediately so a new peak is never clipped, and glides inward.
 * There is no fill, gradient, or glow.
 */
export function Chart({ data, loading = false, paused = false, label, empty = "No data yet", className }: ChartProps) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = React.useState(loading ? 0 : 1);
  const progressRef = React.useRef(progress);
  progressRef.current = progress;
  const peak = data.reduce((max, value) => Math.max(max, value), 0);
  const ceilingRef = React.useRef(Math.max(peak, 1));
  const [ceiling, setCeiling] = React.useState(ceilingRef.current);

  React.useEffect(() => {
    const nextPeak = Math.max(peak, 1);
    if (paused && nextPeak <= ceilingRef.current) return;
    if (reduced || nextPeak >= ceilingRef.current) {
      ceilingRef.current = nextPeak;
      setCeiling(nextPeak);
      return;
    }
    let frame = 0;
    const tick = () => {
      const next = ceilingRef.current + (nextPeak - ceilingRef.current) * 0.08;
      if (Math.abs(next - nextPeak) < 0.05) {
        ceilingRef.current = nextPeak;
        setCeiling(nextPeak);
        return;
      }
      ceilingRef.current = next;
      setCeiling(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [peak, reduced, paused]);

  React.useEffect(() => {
    if (paused) return;
    const target = loading ? 0 : 1;
    if (reduced) {
      progressRef.current = target;
      setProgress(target);
      return;
    }
    let frame = 0;
    const tick = () => {
      const next = progressRef.current + (target - progressRef.current) * 0.08;
      if (Math.abs(target - next) < 0.01) {
        progressRef.current = target;
        setProgress(target);
        return;
      }
      progressRef.current = next;
      setProgress(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loading, paused, reduced]);

  const latest = data.at(-1) ?? 0;
  const quiet = !loading && data.length === 0;
  const samples = data.length ? data : [0, 0];
  const points = samples
    .map((value, index) => {
      const x = samples.length === 1 ? WIDTH / 2 : (index / (samples.length - 1)) * WIDTH;
      const y = pointY(0, ceiling) * (1 - progress) + pointY(value, ceiling) * progress;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className={join("basalt-chart", className)} data-loading={loading ? "" : undefined} data-empty={quiet ? "" : undefined}>
      <div className="basalt-chart-head">
        <span className="basalt-chart-label">{label}</span>
        {data.length ? <NumberTicker glide value={latest} /> : null}
      </div>
      {quiet ? (
        <p className="basalt-chart-empty">{empty}</p>
      ) : (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${label}, ${latest}`}>
          <polyline className="basalt-chart-line" points={points} />
        </svg>
      )}
      {data.length ? (
        <div className="basalt-chart-axis">
          <span>0</span>
          <NumberTicker value={Math.round(ceiling)} />
        </div>
      ) : null}
    </div>
  );
}
