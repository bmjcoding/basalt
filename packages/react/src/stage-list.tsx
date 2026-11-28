import * as React from "react";

import type { Moment, RunTimeScale } from "./run-format";
import { countStages, dayApart, RunStage, RunStagesContext, RunStagesOptionsContext } from "./run-stage";
import type { RunStageProps, RunStagesOptions } from "./run-stage";
import { useRunTimeScale } from "./run-timer";
import { warnRun } from "./run-warn";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

export interface StageListProps {
  /** Names the list ("Deploy 812 stages"). */
  label: string;
  /** One scale for every stage's time, so the column is one width from the first frame (see `RunTimer`). */
  timeScale?: RunTimeScale;
  /**
   * The room for one stage's detail, held from the first frame so a failure moves only the rows under it and never what follows the list (DECISIONS 326:
   * off unless asked for, and only for a list on the open page, never inside a card or panel). `true` holds one reason line (82px, 98 on touch: a `calc`
   * of tokens, never a measure); a number holds that many. Off by default: a detail opens under its stage and moves the rows under it.
   */
  reserveDetail?: boolean | number;
  /**
   * What a stage's end column shows (cimip-gaps-3 T2, 3a): `duration` (the default) is its running or finished time; `clock` is when it started, as a
   * person reads a clock ("7:03 PM" in `en-US`), the date added on another day than `now`. The column holds one fact: a list that needs the length
   * too says it in `meta` or the detail. The clock does not tick and stays under the hold. `timeScale` is ignored beside it.
   */
  time?: "duration" | "clock";
  locale?: string;
  /** The zone the clock is read in: an IANA name. Defaults to the runtime's. */
  timeZone?: string;
  /** What counts as today, for the date to be left out of a clock (fixed in a test or on a server). Defaults to now. */
  now?: Moment;
  className?: string;
  /** `RunStage` rows, in order. */
  children: React.ReactNode;
}

/**
 * A known sequence of named stages, top to bottom (DECISIONS 316, 1.4): an `ol` named by `label`. Each row is the stage's mark, its name and word, its
 * meta and its time, joined to the next by a still 1px connector. Not `Stepper` (back and next for a form) and not `ActivityList` (a quiet list of steps).
 */
export function StageList({ label, timeScale, reserveDetail = false, time = "duration", locale, timeZone, now, className, children }: StageListProps) {
  const rows = countStages("StageList", children);
  if (process.env.NODE_ENV !== "production" && time === "clock" && timeScale !== undefined) warnRun("StageList", "`timeScale` is ignored beside `time=\"clock\"`.");
  const stages = React.Children.toArray(children).filter((child): child is React.ReactElement<RunStageProps> => React.isValidElement(child) && child.type === RunStage);
  // The seat holds a date only when a stage started on another day (and a year when one is in another year), so a list of today's stages holds clocks alone.
  let dated: "day" | "year" | undefined;
  if (time === "clock") {
    const today = now ?? Date.now();
    for (const stage of stages) {
      const apart = stage.props.start === undefined ? undefined : dayApart(stage.props.start, today, timeZone);
      if (apart === "year") { dated = "year"; break; }
      if (apart) dated = "day";
    }
  }
  const chevron = stages.some((stage) => stage.props.collapsible);
  const options = React.useMemo<RunStagesOptions>(() => ({ time, locale, timeZone, now, dated, chevron }), [time, locale, timeZone, now, dated, chevron]);
  const lines = reserveDetail === false ? 0 : reserveDetail === true ? 1 : Math.max(0, Math.floor(reserveDetail));
  const { provide } = useRunTimeScale(timeScale ?? "seconds");
  const style = { "--_rows": rows, "--_reason-lines": lines } as React.CSSProperties;
  return (
    <div className={join("basalt-run-stages-box", className)}>
      <ol className="basalt-run-stages" aria-label={label} data-reserve={lines > 0 ? "" : undefined} data-chevron={chevron ? "" : undefined} style={style}>
        <RunStagesOptionsContext.Provider value={options}>
          <RunStagesContext.Provider value="list">{provide(children)}</RunStagesContext.Provider>
        </RunStagesOptionsContext.Provider>
      </ol>
    </div>
  );
}
