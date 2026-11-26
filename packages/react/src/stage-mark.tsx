import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { CircleDashedIcon } from "@phosphor-icons/react/dist/csr/CircleDashed";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import * as React from "react";

import { Icon } from "./icon";
import { useLoops } from "./loops";
import { Spinner, useSharedClock } from "./spinner";
import type { StageState } from "./run-format";
import { join } from "./utils";

// ---- Stages and runs (DECISIONS 316; idle, cimip-gaps-3 T1): the nine states and their mark (warning, cimip-gaps-3 T2) ----
// One mark a state at 16, 20 or 24, aria-hidden, in a seat that never changes size; the state's word carries the state (where it is drawn and where it
// is only said is foundations' table in "Stages and runs"). Queued is Phosphor Bold Circle in secondary ink, breathing by opacity from opacity-queued
// to 1 on duration-loop-fade (the one loop a state that is not running has; still under reduced motion, the hold, forced colours and print). Idle (not
// started) is Phosphor Bold CircleDashed in tertiary and never animates, in any mode: its dashed shape is what parts it from queued once motion stops. Running
// and retrying are the ring. Passed is the outline CheckCircle in secondary, failed the outline XCircle in danger, skipped MinusCircle and canceled
// Prohibit in tertiary. No filled disc anywhere. A change of state crossfades in the one seat: the old mark fades out as the new fades in, over
// duration-fast on ease-out, kept under reduced motion (opacity only) and landing at once under the hold.

export interface StageMarkProps {
  state: StageState;
  /** The seat, by the status seat's rule: 16 beside 12 to 16px text (the default), 20 beside 18 to 24px, 24 beside 30px and up. */
  size?: 16 | 20 | 24;
  className?: string;
}

/** Running and retrying are one mark (the ring): a change between them is not a change of mark. */
const markOf = (state: StageState) => (state === "retrying" ? "running" : state);

/** The queued breath, on the shared clock: every queued mark on a page breathes in step with every other loop on duration-loop-fade. */
function Breath({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  useSharedClock(ref);
  return <span ref={ref} className="basalt-run-mark-breath">{children}</span>;
}

function Glyph({ state, size }: { state: StageState; size: 16 | 20 | 24 }) {
  switch (state) {
    case "idle": return <Icon icon={CircleDashedIcon} size={size} />;
    case "queued": return <Breath><Icon icon={CircleIcon} size={size} /></Breath>;
    case "running":
    case "retrying": return <Spinner size={size} />;
    case "success": return <Icon icon={CheckCircleIcon} size={size} />;
    case "failed": return <Icon icon={XCircleIcon} size={size} />;
    case "skipped": return <Icon icon={MinusCircleIcon} size={size} />;
    case "canceled": return <Icon icon={ProhibitIcon} size={size} />;
    // An ending with a warning (cimip-gaps-3 T2): the outline triangle in status-warning.
    case "warning": return <Icon icon={WarningIcon} size={size} />;
  }
}

/** A face in the seat. `settled` once its entry has run (or it arrived under the hold), so a release never plays an entry again. */
interface Face { key: number; state: StageState; leaving?: boolean; settled?: boolean }

/**
 * A stage's status mark (DECISIONS 316, 1.2). Always `aria-hidden`: the stage's word says the state, drawn or visually hidden by where it sits.
 * In forced colours it is `currentColor` and names no system colour, so it follows the row it is in.
 */
export function StageMark({ state, size = 16, className }: StageMarkProps) {
  const { held } = useLoops();
  const [faces, setFaces] = React.useState<Face[]>(() => [{ key: 0, state }]);
  const current = faces[faces.length - 1]!;
  // The hold lands every change at once: a face still leaving when it arrives goes now.
  if (held && (faces.length > 1 || (current.key > 0 && !current.settled))) setFaces([{ ...current, settled: true }]);
  else if (current.state !== state) {
    // Drawn from the previous render's faces, before paint: the old mark stays in the seat and fades as the new one arrives.
    if (markOf(current.state) === markOf(state)) setFaces([...faces.slice(0, -1), { ...current, state }]);
    else if (held) setFaces([{ key: current.key + 1, state, settled: true }]);
    else setFaces([{ ...current, leaving: true }, { key: current.key + 1, state }]);
  }
  const settle = (key: number) => setFaces((all) => all.map((f) => (f.key === key && !f.leaving ? { ...f, settled: true } : f)));
  const drop = (key: number) => setFaces((all) => (all.some((f) => f.key === key && f.leaving) ? all.filter((f) => f.key !== key) : all));
  return (
    <span className={join("basalt-run-mark", className)} data-state={state} data-size={size} aria-hidden="true">
      {faces.map((face) => (
        <span
          key={face.key}
          className="basalt-run-mark-face"
          data-state={face.state}
          data-leaving={face.leaving ? "" : undefined}
          data-entering={face.key > 0 && !face.leaving && !face.settled ? "" : undefined}
          // It leaves when its fade ends. The hold arriving part-way takes it at once (above).
          onAnimationEnd={(event) => { if (event.target !== event.currentTarget) return; if (face.leaving) drop(face.key); else settle(face.key); }}
        >
          <Glyph state={face.state} size={size} />
        </span>
      ))}
    </span>
  );
}
