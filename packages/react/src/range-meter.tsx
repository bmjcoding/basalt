import { Meter as BaseMeter } from "@base-ui/react/meter";
import * as React from "react";

import { join } from "./utils";

// A range meter (DECISIONS 153, vote 18, consent rows 14 and 15): a reading against a plan that is a range. The slot is `Meter`'s own (8px, a 1px input boundary, nothing
// inside), the plan is two of the meter's own target ticks, one at each end, and the reading is a dot ringed by the surface. It is `role="meter"` and says the plan in its
// words. There is no band between the ticks and no fill. Both ends of the plan and the marker come from one scale, so they cannot part. Nothing here runs when the module loads.

export interface RangeMeterProps extends Omit<React.ComponentProps<"div">, "children" | "role"> {
  /** What is measured: "Last week's change". Required: it names the meter. */
  label: React.ReactNode;
  /** The reading. Outside `min` to `max` the marker stops at the slot's end and the words keep the true value. */
  value: number;
  min?: number;
  /** The slot's end, always. The slot never rescales. */
  max: number;
  /** The plan: its two ends, low then high. An end outside the slot draws no tick, and its words stay. */
  plan: readonly [number, number];
  /** The plan's words: "Plan", "Target range". */
  planLabel?: string;
  /** The unit written after a value: "lb a week". */
  unit?: string;
  /** The unit as it is spoken, when it differs from the written one. */
  spokenUnit?: string;
  /** How numbers are written, as `Intl.NumberFormat` options. */
  format?: Intl.NumberFormatOptions;
  locale?: string | string[];
}

/** A reading against a plan range: one slot, two target ticks and a ringed marker. */
export function RangeMeter({ label, value, min = 0, max, plan, planLabel = "Plan", unit, spokenUnit, format, locale, className, ...props }: RangeMeterProps) {
  const localeKey = Array.isArray(locale) ? locale.join(",") : locale;
  const formatKey = JSON.stringify(format);
  const write = React.useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, format);
    return (n: number) => formatter.format(n);
  }, [localeKey, formatKey]);
  const span = max - min;
  const at = (n: number) => (span > 0 && n >= min && n <= max ? `${((n - min) / span) * 100}%` : undefined);
  const [low, high] = plan[0] <= plan[1] ? plan : ([plan[1], plan[0]] as const);
  const marker = span > 0 ? `${(Math.max(min, Math.min(max, value)) - min) / span * 100}%` : "0%";
  const withUnit = (n: number, word: string | undefined) => (word ? `${write(n)} ${word}` : write(n));
  const spoken = spokenUnit ?? unit;
  const relation = (word: string | undefined) => `${withUnit(value, word)}, ${value < low ? "under" : value > high ? "over" : "inside"} the ${planLabel.toLowerCase()} of ${write(low)} to ${withUnit(high, word)}`;
  const ends = [at(low), at(high)];
  return (
    <BaseMeter.Root
      {...props}
      value={value}
      min={min}
      max={max}
      format={format}
      locale={locale}
      getAriaValueText={() => relation(spoken)}
      className={join("basalt-meter basalt-range-meter", className)}
    >
      <div className="basalt-meter-head">
        <BaseMeter.Label className="basalt-meter-label">{label}</BaseMeter.Label>
        <span className="basalt-meter-reading"><span className="basalt-meter-value">{write(value)}</span>{unit ? ` ${unit}` : ""}</span>
      </div>
      <BaseMeter.Track className="basalt-meter-track">
        {ends.map((end, i) => (end ? <span key={i} className="basalt-meter-tick" aria-hidden="true" style={{ "--_target": end } as React.CSSProperties} /> : null))}
        <span className="basalt-range-marker" aria-hidden="true" style={{ "--_at": marker } as React.CSSProperties} />
      </BaseMeter.Track>
      {/* The foot is always one 16px line: the slot's two ends and the plan between them, so a new reading never adds a line. */}
      <div className="basalt-meter-foot basalt-range-foot">
        <span>{write(min)}</span>
        <span className="basalt-range-plan">{planLabel}: {write(low)} to {withUnit(high, unit)}</span>
        <span>{write(max)}</span>
      </div>
    </BaseMeter.Root>
  );
}
