import * as React from "react";

import { TimeChart } from "./chart";
import { StatusLine } from "./filter-result";
import type { ChartLaneGeometry, ChartSeries, TimeChartProps } from "./chart";
import { join } from "./utils";

// The phase chart (DECISIONS 153, votes 11, 16 and 17): a long trend with a lane of choices under it on the same axis, one a week, and the open week's plate behind both.
// It is a `TimeChart` (one series, its trailing mean as the lit line, the 96px plot, Basalt's gridlines and gutter) with the lane in its own slot. A press on a day, or
// Enter on the focused day, opens that day's week; the days stay images with a roving tab stop. There is no live region. Where twelve 44px choices do not fit (a phone), the
// lane is marks, and previous and next controls step through the weeks, with the open week in words, shown at once and spoken once through a polite status line. Nothing here runs when the module loads.

/** One week's choice in the lane: a word ("Hold", "Raise") and the sentence for it. */
export interface PhaseCall {
  /** A stable key. Defaults to the word and the week. */
  id?: string;
  word: string;
  /** This week's choice changed the plan: its mark is larger and its word is primary ink. */
  changed?: boolean;
  /** The week in words: said by the choice and shown under the lane on a phone. */
  text: string;
}

export interface PhaseChartProps extends Omit<TimeChartProps, "kind" | "series" | "plan" | "partial" | "partialLabel" | "partialSuffix" | "formatPlan" | "lane" | "onDayActivate" | "activateHint" | "plotSize" | "headline" | "trend"> {
  /** The readings' name ("Weight"). */
  name: string;
  /** One reading per day, oldest first, in whole weeks (7 days each). `null` is a day not observed. */
  values: Array<number | null>;
  reasons?: ChartSeries["reasons"];
  /** One choice per week, oldest first. */
  calls: PhaseCall[];
  /** The open week, from 0. A controlled value. */
  week: number;
  onWeekChange: (week: number) => void;
  /** The trailing mean's window in days. Default 7. */
  window?: number;
  /** Names the lane for assistive technology. Default "Choose a week". */
  laneLabel?: string;
}

/** The week's choice is a 44px target; where a week's slot is narrower the lane is marks only. Read once from `size-tap-min`. */
function useTapMin() {
  const [tapMin, setTapMin] = React.useState(44);
  React.useLayoutEffect(() => {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-size-tap-min"));
    if (Number.isFinite(value) && value > 0) setTapMin(value);
  }, []);
  return tapMin;
}

interface LaneProps { geometry: ChartLaneGeometry; calls: PhaseCall[]; week: number; onWeekChange: (week: number) => void; laneLabel: string }

function PhaseLane({ geometry, calls, week, onWeekChange, laneLabel }: LaneProps) {
  const name = React.useId().replace(/:/g, "");
  const marks = geometry.width / Math.max(calls.length, 1) < useTapMin();
  return (
    <div role="radiogroup" aria-label={laneLabel} className="basalt-phase-calls" data-marks={marks ? "" : undefined} style={{ "--_weeks": calls.length } as React.CSSProperties}>
      {calls.map((call, index) => (
        <label key={call.id ?? `${call.word}-${index}`} className="basalt-phase-call" data-changed={call.changed ? "" : undefined}>
          <input
            type="radio"
            name={name}
            className="basalt-visually-hidden"
            checked={index === week}
            onChange={() => onWeekChange(index)}
            aria-label={`Week ${index + 1}: ${call.word}. ${call.text}`}
          />
          <span aria-hidden="true"><i />{call.word}</span>
        </label>
      ))}
    </div>
  );
}

/** The phone form's controls: previous and next, and the open week in words. The words reserve the longest of the weeks' sentences, so a step moves nothing. */
function PhaseSteps({ geometry, calls, week, onWeekChange }: Omit<LaneProps, "laneLabel">) {
  const marks = geometry.width / Math.max(calls.length, 1) < useTapMin();
  if (!marks) return null;
  const line = (call: PhaseCall | undefined, index: number) => <><b>Week {index + 1}</b> {call?.word}: {call?.text}</>;
  const go = (to: number) => { if (to >= 0 && to < calls.length) onWeekChange(to); };
  return (
    <div className="basalt-phase-steps">
      <div className="basalt-phase-step-buttons">
        <button type="button" className="basalt-button" data-variant="secondary" data-size="sm" aria-disabled={week <= 0 ? true : undefined} onClick={() => go(week - 1)}>
          <span className="basalt-button-label">Previous week</span>
        </button>
        <button type="button" className="basalt-button" data-variant="secondary" data-size="sm" aria-disabled={week >= calls.length - 1 ? true : undefined} onClick={() => go(week + 1)}>
          <span className="basalt-button-label">Next week</span>
        </button>
      </div>
      <p className="basalt-phase-open">
        {calls.map((call, index) => <span key={index} className="basalt-chart-reserve" aria-hidden="true">{line(call, index)}</span>)}
        <span aria-hidden="true">{line(calls[week], week)}</span>
        {/* The sentence is shown at once and spoken once, after it has held still, as `PeriodStepper` does; a press on a week's button changes it and the buttons say nothing. */}
        <StatusLine>{calls[week] ? `Week ${week + 1} ${calls[week]?.word}: ${calls[week]?.text}` : ""}</StatusLine>
      </p>
    </div>
  );
}

/** A trend over weeks with a lane of choices under it. See the file's note. */
export function PhaseChart({ name, values, reasons, calls, week, onWeekChange, window = 7, laneLabel = "Choose a week", lit = true, className, ...props }: PhaseChartProps) {
  const series = React.useMemo<ChartSeries[]>(() => [{ id: "readings", name, values, reasons }], [name, values, reasons]);
  const first = Math.max(0, Math.min(week, calls.length - 1)) * 7;
  const span = [first, Math.min(values.length - 1, first + 6)] as const;
  const open = (day: number) => onWeekChange(Math.max(0, Math.min(calls.length - 1, Math.floor(day / 7))));
  return (
    <TimeChart
      {...props}
      className={join("basalt-phase", className)}
      kind="line"
      series={series}
      trend={window}
      lit={lit}
      plotSize="sm"
      onDayActivate={open}
      activateHint="opens its week"
      lane={{
        span,
        children: (geometry) => <PhaseLane geometry={geometry} calls={calls} week={week} onWeekChange={onWeekChange} laneLabel={laneLabel} />,
        below: (geometry) => <PhaseSteps geometry={geometry} calls={calls} week={week} onWeekChange={onWeekChange} />,
      }}
    />
  );
}
