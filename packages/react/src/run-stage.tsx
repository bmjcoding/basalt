import * as React from "react";

import { Reserve } from "./reserve";
import { STAGE_WORDS } from "./run-format";
import type { Moment, StageState } from "./run-format";
import { RunTimer } from "./run-timer";
import { warnRun } from "./run-warn";
import { StageMark } from "./stage-mark";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- A stage of a run (DECISIONS 316, 1.4 and 1.5) ----
// One row of a `StageList` or one node of a `StageRail`, from the same data. Which state's word is drawn and which is only said is foundations' table
// ("Stages and runs"): in a list every word but a passed stage's is drawn after the name; on a rail a failed, skipped, canceled or retrying node draws its
// word in the status seat, where a running or passed node's time stands. A detail (a failure's reason and Retry, what waits and Approve) opens under a
// list's stage. Focus is never dropped: when a detail closes or its action leaves while focus is inside it, focus goes to the stage's name.

/** Where a `RunStage` is drawn: set by `StageList` and `StageRail`. */
export const RunStagesContext = React.createContext<"list" | "rail" | null>(null);

export interface RunStageProps {
  /** The stage's name: "Test". It never wraps. */
  name: string;
  state: StageState;
  /** The state's word, when the app's differs: "Blocked by Test", "Retrying, 2 of 3", "Waiting for approval". */
  word?: string;
  /** A short fact in tertiary at `text-xs` ("412 packages"); a list hides it under 480px of its own width. A rail draws none. */
  meta?: React.ReactNode;
  /** When this attempt started, and ended: the stage's own time. */
  start?: Moment;
  end?: Moment;
  /** Writes the stage's time, in a list and on a rail (see `RunTimer`'s `format`): its seat's width follows it. */
  format?: (ms: number) => string;
  /** Says the stage's time, when the drawn form is short for the ear (see `RunTimer`'s `spoken`). */
  spoken?: (ms: number) => string;
  /** What opens under a list's stage: a failure's reason, what waits. A `p` is the reason, a `strong` its loud words, a `small` its fact. A rail ignores it. */
  detail?: React.ReactNode;
  /** The detail's one action: a `Button` whose `onClick` returns the app's promise ("Retry", "Approve"). A rail ignores it. */
  action?: React.ReactNode;
  className?: string;
}

const DRAWN: Record<"list" | "rail", Record<StageState, boolean>> = {
  list: { queued: true, running: true, success: false, failed: true, skipped: true, canceled: true, retrying: true },
  rail: { queued: false, running: false, success: false, failed: true, skipped: true, canceled: true, retrying: true },
};

/** Whether a slot holds something drawn: `null`, `false`, `true` and "" (what `cond && <Button />` leaves) are nothing, as React draws them. */
export const rendered = (node: React.ReactNode) => node !== undefined && node !== null && typeof node !== "boolean" && node !== "";

/**
 * Focus that was inside a part that has closed or lost its action goes to `home` (a name with `tabindex="-1"`, `preventScroll`), never to the body,
 * whoever closed it: the reader's press, or the app (someone else approved, the retry started from elsewhere). `present` counts what the part holds (0
 * closed, 1 open, 2 open with its action); a fall is a leave.
 */
export function useFocusHome(present: number, home: React.RefObject<HTMLElement | null>) {
  const inside = React.useRef(false);
  const was = React.useRef(present);
  const track = React.useMemo(() => ({
    onFocus: () => { inside.current = true; },
    // Focus moved by the reader to somewhere else is theirs; focus that went nowhere (its element left, or turned inert) is ours to place.
    onBlur: (event: React.FocusEvent) => { if (event.relatedTarget) inside.current = false; },
  }), []);
  React.useLayoutEffect(() => {
    const fell = present < was.current;
    was.current = present;
    if (!fell || !inside.current) return;
    inside.current = false;
    const active = document.activeElement;
    const part = home.current?.closest("li")?.querySelector("[data-focus-home]");
    if (active && active !== document.body && !part?.contains(active)) return;
    home.current?.focus({ preventScroll: true });
  });
  return track;
}

/** The words a rail node draws by default, each held in its status seat. */
const RAIL_WORDS = { failed: STAGE_WORDS.failed, skipped: STAGE_WORDS.skipped, canceled: STAGE_WORDS.canceled, retrying: STAGE_WORDS.retrying };

/** One stage. In a `StageList` a row; in a `StageRail` a node. */
export function RunStage({ name, state, word, meta, start, end, format, spoken, detail, action, className }: RunStageProps) {
  const kind = React.useContext(RunStagesContext) ?? "list";
  const said = word ?? STAGE_WORDS[state];
  const drawn = DRAWN[kind][state];
  const nameRef = React.useRef<HTMLSpanElement>(null);
  const timer = <RunTimer start={start} end={end} format={format} spoken={spoken} whenHeld="hidden" />;

  // The detail keeps what it last held while it closes, so it closes over its own content and never over nothing.
  const hasAction = rendered(action);
  const open = kind === "list" && (rendered(detail) || hasAction);
  const kept = React.useRef<{ detail: React.ReactNode; action: React.ReactNode }>({ detail: null, action: null });
  if (open) kept.current = { detail, action };
  const track = useFocusHome(open ? (hasAction ? 2 : 1) : 0, nameRef);

  // Development: a rail's word is one or two short words, and one that its column cuts warns.
  const wordRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production" || kind !== "rail" || !drawn) return;
    const el = wordRef.current;
    if (el && el.scrollWidth > el.clientWidth + 0.5) warnRun("StageRail", `"${said}" is cut by its column; a rail's word is one or two short words.`);
  });
  if (kind === "rail") {
    return (
      <li className={join("basalt-run-stage", className)} data-state={state}>
        <span className="basalt-run-stage-markrow">
          <StageMark state={state} />
          <span className="basalt-run-stage-link" data-filled={state === "success" ? "" : undefined} aria-hidden="true"><span className="basalt-run-stage-fill" /></span>
        </span>
        <span className="basalt-run-stage-name" ref={nameRef} tabIndex={-1}>
          {name}
          {drawn ? null : <span className="basalt-visually-hidden"> {said}</span>}
        </span>
        <span className="basalt-run-stage-status">
          {/* One cell for the time and every word a node can draw, so a node that turns from its time to "Failed" or "Retrying" moves nothing. */}
          <Reserve show={drawn ? "word" : "time"} alternatives={{ time: timer, ...RAIL_WORDS, word: <span ref={wordRef} className="basalt-run-stage-word">{said}</span> }} />
        </span>
      </li>
    );
  }

  return (
    <li className={join("basalt-run-stage", className)} data-state={state}>
      <div className="basalt-run-stage-line">
        <StageMark state={state} />
        <span className="basalt-run-stage-name" ref={nameRef} tabIndex={-1}>
          <span className="basalt-run-stage-label">{name}</span>
          {/* A flex item is its own run of text, so the name and the word are read apart, with no comma. */}
          {drawn ? <>{" "}<span className="basalt-run-stage-word">{said}</span></> : <span className="basalt-visually-hidden">{said}</span>}
        </span>
        <span className="basalt-run-stage-meta">{meta}</span>
        {timer}
      </div>
      {/* Always in the row, closed until a stage has something to show, so its first opening runs from closed like every other. */}
      <div className="basalt-run-stage-detail" data-open={open ? "" : undefined} inert={!open || undefined} data-focus-home="" {...track}>
        <div className="basalt-run-stage-detail-clip">
          <div className="basalt-run-stage-detail-body">
            {open ? detail : kept.current.detail}
            {rendered(open ? action : kept.current.action) ? <div className="basalt-run-stage-action">{open ? action : kept.current.action}</div> : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/** How many stages a list or rail holds; in development, a child that is not a `RunStage` warns. */
export function countStages(component: string, children: React.ReactNode) {
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  if (process.env.NODE_ENV !== "production" && rows.some((child) => child.type !== RunStage)) warnRun(component, "a child is not a RunStage; a stage list's and a rail's rows are RunStage.");
  return rows.length;
}
