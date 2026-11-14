import { Meter as BaseMeter } from "@base-ui/react/meter";
import * as React from "react";

import { Reserve } from "./reserve";
import { join } from "./utils";

export interface MeterProps extends Omit<React.ComponentProps<"div">, "children" | "role"> {
  /** What is measured: "Build minutes". Required: it names the meter. */
  label: React.ReactNode;
  /** The reading. It may pass the cap; the fill stops at the slot's end and the overage is said in words. */
  value: number;
  /** The cap: the slot's end, always. The slot never rescales. */
  max: number;
  min?: number;
  /** A target or plan, drawn as a labelled tick in the slot. Outside `min` to `max` it draws no tick, and its words stay. */
  target?: number;
  /** The target's words in the foot: "Target", "Plan by today", "Alert at". */
  targetLabel?: string;
  /** The unit written after the cap: "min", "GB", "requests". */
  unit?: string;
  /** The unit as it is spoken, when it differs from the written one ("minutes" for "min"). */
  spokenUnit?: string;
  /** How numbers are written, as `Intl.NumberFormat` options. */
  format?: Intl.NumberFormatOptions;
  locale?: string | string[];
  /** The word after what is left ("760 min left"). */
  leftWord?: string;
  /** The word after the overage ("24,000 over"). */
  overWord?: string;
  /** Replaces the spoken value. It gets the clamped value written out, and the true value. */
  getAriaValueText?: (formattedValue: string, value: number) => string;
}

/**
 * How much of a cap is used: a standing reading with units, a cap, what is left and, optionally, a target. It is not
 * `Progress` (a task finishing): a meter is `role="meter"`, never indeterminate, never animated toward itself beyond a
 * glide on a new value, and over the cap it stays full while the words say by how much. Over the cap there is no status
 * colour: the overage is words in primary ink.
 */
export function Meter({ label, value, max, min = 0, target, targetLabel = "Target", unit, spokenUnit, format, locale, leftWord = "left", overWord = "over", getAriaValueText, className, style, ...props }: MeterProps) {
  const localeKey = Array.isArray(locale) ? locale.join(",") : locale;
  const formatKey = JSON.stringify(format);
  const write = React.useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, format);
    return (n: number) => formatter.format(n);
  }, [localeKey, formatKey]);
  const span = max - min;
  const over = Math.max(0, value - max);
  const left = Math.max(0, max - value);
  const hasTarget = target !== undefined && Number.isFinite(target);
  const inRange = hasTarget && span > 0 && target >= min && target <= max;
  const targetAt = inRange ? `${((target - min) / span) * 100}%` : undefined;
  const spoken = spokenUnit ?? unit;
  const withUnit = (n: number, word: string | undefined) => (word ? `${write(n)} ${word}` : write(n));
  const defaultText = (raw: number) => {
    const parts = [`${write(raw)} of ${withUnit(max, spoken)}`];
    if (hasTarget) parts.push(`${targetLabel} ${withUnit(target, spoken)}`);
    parts.push(raw > max ? `${withUnit(raw - max, spoken)} over the cap` : `${withUnit(Math.max(0, max - raw), spoken)} ${leftWord}`);
    return parts.join(", ");
  };
  const cap = withUnit(max, unit);
  return (
    <BaseMeter.Root
      {...props}
      value={value}
      min={min}
      max={max}
      format={format}
      locale={locale}
      getAriaValueText={(formatted, raw) => getAriaValueText?.(formatted, raw) ?? defaultText(raw)}
      className={join("basalt-meter", className)}
      style={style}
    >
      <div className="basalt-meter-head">
        <BaseMeter.Label className="basalt-meter-label">{label}</BaseMeter.Label>
        {/* The reading holds the width of the cap written as the value, so a new value never reflows the label. */}
        <Reserve
          className="basalt-meter-reading"
         
          show="now"
          alternativeClassNames={{ reserve: "basalt-meter-reserve", now: "basalt-meter-now" }}
          alternatives={{
            reserve: <><span className="basalt-meter-value">{write(max)}</span> of {cap}</>,
            now: <><span className="basalt-meter-value">{write(value)}</span> of {cap}</>,
          }}
        />
      </div>
      <BaseMeter.Track className="basalt-meter-track">
        <BaseMeter.Indicator className="basalt-meter-fill" />
        {targetAt ? <span className="basalt-meter-tick" aria-hidden="true" style={{ "--_target": targetAt } as React.CSSProperties} /> : null}
      </BaseMeter.Track>
      {/* The foot is always one 16px line, so a change of state never adds a line. */}
      <div className="basalt-meter-foot">
        <span className="basalt-meter-left" data-over={over > 0 ? "" : undefined}>{over > 0 ? `${write(over)} ${overWord}` : `${withUnit(left, unit)} ${leftWord}`}</span>
        {hasTarget ? <span className="basalt-meter-target">{targetLabel} {withUnit(target, unit)}</span> : null}
      </div>
    </BaseMeter.Root>
  );
}
