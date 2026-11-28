import * as React from "react";

import type { Moment, StageState } from "./run-format";
import { countStages, RailNextContext, RunStage, RunStagesContext, RunStagesOptionsContext } from "./run-stage";
import type { RunStageProps, RunStagesOptions } from "./run-stage";
import { useRunTimeScale } from "./run-timer";
import { warnRun } from "./run-warn";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

export interface StageRailProps {
  /** Names the rail ("Release v2.14.0 stages"). */
  label: string;
  /**
   * One scale for every node's time: seconds or minutes. At "minutes" a time under a minute is whole seconds ("45 s"). The hour form is wider than a
   * column at 390, so a rail of hour-long stages shows the run's time in its head.
   */
  timeScale?: "seconds" | "minutes";
  /**
   * What a node's status seat shows (cimip-gaps-3 T2, 3a): `duration` (the default) is its time; `clock` is when it started ("Identified" over "7:03
   * PM"), sans, tabular, in tertiary. A failed, skipped, canceled, retrying or warning node still draws its word; a stage with no start holds an
   * empty seat. A start on another day is said in full in the node's hidden text. `timeScale` is ignored beside it.
   */
  time?: "duration" | "clock";
  locale?: string;
  /** The zone the clock is read in: an IANA name. Defaults to the runtime's. */
  timeZone?: string;
  /** What counts as today (fixed in a test or on a server). Defaults to now. */
  now?: Moment;
  className?: string;
  /** Two to six `RunStage` nodes, in order. */
  children: React.ReactNode;
}

/** Each node is told the next node's state, so the link before a stage that has not started stays empty (cimip-gaps-3 T1). */
function withNext(children: React.ReactNode) {
  const rows = React.Children.toArray(children);
  const states = rows.map((row) => (React.isValidElement<{ state?: StageState }>(row) ? row.props.state : undefined));
  return rows.map((row, i) => (React.isValidElement(row) ? <RailNextContext.Provider key={row.key ?? i} value={states.slice(i + 1).find((s) => s !== undefined)}>{row}</RailNextContext.Provider> : row));
}

/**
 * The same stages on one line (DECISIONS 316, 1.5): two to four at any width, five or six from 480px of the rail's own width, under which it is drawn as
 * the list. Each node is its mark, its name and one status seat (its time, or its word when it failed, was skipped or canceled, or is retrying); a
 * horizontal link to the next fills from the inline start when its stage passes. No bead: the running ring is the rail's only moving thing.
 */
export function StageRail({ label, timeScale, time = "duration", locale, timeZone, now, className, children }: StageRailProps) {
  const count = countStages("StageRail", children);
  if (process.env.NODE_ENV !== "production" && time === "clock" && timeScale !== undefined) warnRun("StageRail", "`timeScale` is ignored beside `time=\"clock\"`.");
  let scale = timeScale ?? "seconds";
  if ((scale as string) === "hours") {
    if (process.env.NODE_ENV !== "production") warnRun("StageRail", "a rail takes \"seconds\" or \"minutes\": the hour form is wider than a column at 390. Show the run's time in its head.");
    scale = "minutes";
  }
  if (process.env.NODE_ENV !== "production" && (count < 2 || count > 6)) warnRun("StageRail", `a rail holds two to six stages, not ${count}; use a StageList.`);
  // A rail given the minutes scale counts in whole seconds under a minute (its `dateTime` keeps the tenth); a rail whose scale grew keeps its tenths.
  const { provide } = useRunTimeScale(scale, "minutes", scale === "minutes");
  // A rail of five or six is drawn as the list under 480px of its own width (the stylesheet's container query); a rail whose stages fold needs to know,
  // so a detail opens in place there and in a popover on the rail. Measured only when a stage folds.
  const folds = React.Children.toArray(children).some((child) => React.isValidElement<RunStageProps>(child) && child.type === RunStage && child.props.collapsible === true);
  const box = React.useRef<HTMLDivElement>(null);
  const [asList, setAsList] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = box.current;
    if (!folds || count < 5 || !el || typeof ResizeObserver === "undefined") { setAsList(false); return; }
    const bound = () => Number.parseFloat(getComputedStyle(el).getPropertyValue("--basalt-size-breakpoint-container")) || 480;
    const read = () => setAsList(el.getBoundingClientRect().width < bound());
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [folds, count]);
  const options = React.useMemo<RunStagesOptions>(() => ({ time, locale, timeZone, now, asList }), [time, locale, timeZone, now, asList]);
  return (
    <div ref={box} className={join("basalt-run-rail-box", className)}>
      <ol className="basalt-run-rail" aria-label={label} data-count={count} style={{ "--_count": count } as React.CSSProperties}>
        <RunStagesOptionsContext.Provider value={options}>
          <RunStagesContext.Provider value="rail">{provide(withNext(children))}</RunStagesContext.Provider>
        </RunStagesOptionsContext.Provider>
      </ol>
    </div>
  );
}
