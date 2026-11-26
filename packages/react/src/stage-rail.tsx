import * as React from "react";

import { countStages, RailNextContext, RunStagesContext } from "./run-stage";
import type { StageState } from "./run-format";
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
export function StageRail({ label, timeScale = "seconds", className, children }: StageRailProps) {
  const count = countStages("StageRail", children);
  let scale = timeScale;
  if ((scale as string) === "hours") {
    if (process.env.NODE_ENV !== "production") warnRun("StageRail", "a rail takes \"seconds\" or \"minutes\": the hour form is wider than a column at 390. Show the run's time in its head.");
    scale = "minutes";
  }
  if (process.env.NODE_ENV !== "production" && (count < 2 || count > 6)) warnRun("StageRail", `a rail holds two to six stages, not ${count}; use a StageList.`);
  // A rail given the minutes scale counts in whole seconds under a minute (its `dateTime` keeps the tenth); a rail whose scale grew keeps its tenths.
  const { provide } = useRunTimeScale(scale, "minutes", scale === "minutes");
  return (
    <div className={join("basalt-run-rail-box", className)}>
      <ol className="basalt-run-rail" aria-label={label} data-count={count} style={{ "--_count": count } as React.CSSProperties}>
        <RunStagesContext.Provider value="rail">{provide(withNext(children))}</RunStagesContext.Provider>
      </ol>
    </div>
  );
}
