import * as React from "react";

import type { RunTimeScale } from "./run-format";
import { countStages, RunStagesContext } from "./run-stage";
import { useRunTimeScale } from "./run-timer";
import { join } from "./utils";

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
  className?: string;
  /** `RunStage` rows, in order. */
  children: React.ReactNode;
}

/**
 * A known sequence of named stages, top to bottom (DECISIONS 316, 1.4): an `ol` named by `label`. Each row is the stage's mark, its name and word, its
 * meta and its time, joined to the next by a still 1px connector. Not `Stepper` (back and next for a form) and not `ActivityList` (a quiet list of steps).
 */
export function StageList({ label, timeScale = "seconds", reserveDetail = false, className, children }: StageListProps) {
  const rows = countStages("StageList", children);
  const lines = reserveDetail === false ? 0 : reserveDetail === true ? 1 : Math.max(0, Math.floor(reserveDetail));
  const { provide } = useRunTimeScale(timeScale);
  const style = { "--_rows": rows, "--_reason-lines": lines } as React.CSSProperties;
  return (
    <div className={join("basalt-run-stages-box", className)}>
      <ol className="basalt-run-stages" aria-label={label} data-reserve={lines > 0 ? "" : undefined} style={style}>
        <RunStagesContext.Provider value="list">{provide(children)}</RunStagesContext.Provider>
      </ol>
    </div>
  );
}
