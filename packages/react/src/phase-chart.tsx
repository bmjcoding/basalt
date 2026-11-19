import * as React from "react";

import { TimeChart } from "./chart";
import { StatusLine } from "./filter-result";
import type { ChartLaneGeometry, ChartSeries, TimeChartProps } from "./chart";
import { join } from "./utils";

// The phase chart (DECISIONS 153, votes 11, 16 and 17): a long trend with a lane of choices under it on the same axis, one a week (seven days a choice; lanes of other lengths are in BACKLOG), and the open week's plate behind both.
// It is a `TimeChart` (one series, its trailing mean as the lit line, the 96px plot, Basalt's gridlines and gutter) with the lane in its own slot. A press on a day, or
// Enter on the focused day, opens that day's week; the days stay images with a roving tab stop. There is no live region. Where twelve 44px choices do not fit (a phone), the
// lane is marks, and previous and next controls step through the weeks, with the open week in words, shown at once and spoken once through a polite status line. Nothing here runs when the module loads.
// The chart ships no words of its own for the period (DECISIONS 200, 207): the lane's name, the two step buttons, the numbered name, the status line and the Enter hint are required props, each a whole
// string the product writes ("Choose a check-in", "Previous check-in", "Check-in 31" or "Nov 3 check-in"), as `PeriodStepper`'s `previousLabel` and `nextLabel` are.

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
  /** Names the lane for assistive technology ("Choose a check-in"). Required: the chart ships no word for the period. */
  laneLabel: string;
  /** The phone form's previous button ("Previous check-in"). A whole string. */
  previousLabel: string;
  /** The phone form's next button ("Next check-in"). A whole string. */
  nextLabel: string;
  /** The numbered name of a choice, from its index (0 is the first): "Check-in 31", "Nov 3 check-in". Said by the choice and shown in bold before its words on a phone. */
  callName: (index: number) => string;
  /** The open choice, said once through the polite status line on a phone ("Check-in 31 Hold: No change to the plan."). A whole string from the index and the choice. */
  statusLine: (index: number, call: PhaseCall) => string;
  /** The key hint in the chart's legend for Enter on a focused day ("opens its check-in"). A whole string. */
  activateHint: string;
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

interface LaneProps { geometry: ChartLaneGeometry; calls: PhaseCall[]; week: number; onWeekChange: (week: number) => void; laneLabel: string; previousLabel: string; nextLabel: string; callName: (index: number) => string; statusLine: (index: number, call: PhaseCall) => string }

function PhaseLane({ geometry, calls, week, onWeekChange, laneLabel, callName }: Pick<LaneProps, "geometry" | "calls" | "week" | "onWeekChange" | "laneLabel" | "callName">) {
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
            aria-label={`${callName(index)}: ${call.word}. ${call.text}`}
          />
          <span aria-hidden="true"><i />{call.word}</span>
        </label>
      ))}
    </div>
  );
}

/** The phone form's controls: previous and next, and the open week in words. The words reserve the longest of the weeks' sentences, so a step moves nothing. */
function PhaseSteps({ geometry, calls, week, onWeekChange, previousLabel, nextLabel, callName, statusLine }: Omit<LaneProps, "laneLabel">) {
  const marks = geometry.width / Math.max(calls.length, 1) < useTapMin();
  if (!marks) return null;
  const line = (call: PhaseCall | undefined, index: number) => <><b>{callName(index)}</b> {call?.word}: {call?.text}</>;
  const go = (to: number) => { if (to >= 0 && to < calls.length) onWeekChange(to); };
  return (
    <div className="basalt-phase-steps">
      <div className="basalt-phase-step-buttons">
        {/* At the first or last week a button looks and behaves disabled (`data-disabled`, which every disabled, hover and press rule keys on, with `aria-disabled`) and stays
            focusable, as `Button` with `focusableWhenDisabled` and the period stepper's do. They are written by hand, not `Button`, so a chart does not carry Base UI's button (about 16KB). */}
        <button type="button" className="basalt-button" data-variant="secondary" data-size="sm" aria-disabled={week <= 0 ? true : undefined} data-disabled={week <= 0 ? "" : undefined} onClick={() => go(week - 1)}>
          <span className="basalt-button-label">{previousLabel}</span>
        </button>
        <button type="button" className="basalt-button" data-variant="secondary" data-size="sm" aria-disabled={week >= calls.length - 1 ? true : undefined} data-disabled={week >= calls.length - 1 ? "" : undefined} onClick={() => go(week + 1)}>
          <span className="basalt-button-label">{nextLabel}</span>
        </button>
      </div>
      <p className="basalt-phase-open">
        {calls.map((call, index) => <span key={index} className="basalt-chart-reserve" aria-hidden="true">{line(call, index)}</span>)}
        <span aria-hidden="true">{line(calls[week], week)}</span>
        {/* The sentence is shown at once and spoken once, after it has held still, as `PeriodStepper` does; a press on a week's button changes it and the buttons say nothing. */}
        <StatusLine>{calls[week] ? statusLine(week, calls[week]) : ""}</StatusLine>
      </p>
    </div>
  );
}

/** A trend over weeks with a lane of choices under it. See the file's note. */
export function PhaseChart({ name, values, reasons, calls, week, onWeekChange, window = 7, laneLabel, previousLabel, nextLabel, callName, statusLine, activateHint, lit = true, className, ...props }: PhaseChartProps) {
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
      activateHint={activateHint}
      lane={{
        span,
        children: (geometry) => <PhaseLane geometry={geometry} calls={calls} week={week} onWeekChange={onWeekChange} laneLabel={laneLabel} callName={callName} />,
        below: (geometry) => <PhaseSteps geometry={geometry} calls={calls} week={week} onWeekChange={onWeekChange} previousLabel={previousLabel} nextLabel={nextLabel} callName={callName} statusLine={statusLine} />,
      }}
    />
  );
}
