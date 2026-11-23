import * as React from "react";

import { DisclosureRow } from "./disclosure-row";
import { Spinner } from "./spinner";
import { join } from "./utils";

// ---- The activity list ----
// Steps that run and report, a sentence each: what a build, an import, a sync or an agent did. Not `Stepper` (a known sequence), not `EventLog`
// (links in mono with a time column) and not `LogLine` (a log's mono fields): a step is a sentence in the interface font, and it wraps, so it is
// read whole at any width. Each step has the status seat a plain `Badge` has (6px, the gap as wide): braille while it runs, the tertiary dot once
// done, the danger dot when it failed and the hollow ring while it waits. A failed or waiting step says so in a word at 500 in primary ink before
// its sentence (as a refused command's word does); a running or done step's word is said, not drawn. The running step's sentence is primary and
// the rest secondary: ink, never colour, marks where the work is. A step with `detail` is a disclosure row that opens to it.

export type ActivityStatus = "running" | "done" | "failed" | "waiting";

const WORD: Record<ActivityStatus, string> = { running: "Running", done: "Done", failed: "Failed", waiting: "Waiting" };
const SHOWN: Record<ActivityStatus, boolean> = { running: false, done: false, failed: true, waiting: true };

export interface ActivityListProps extends Omit<React.ComponentProps<"ol">, "children"> {
  /** Names the list, when no heading does. */
  label?: string;
  children: React.ReactNode;
}

/** The steps, in the order they ran. An ordered list; it is not a live region (say a finished run through `StatusLine` if the reader must hear it). */
export function ActivityList({ label, className, children, ...props }: ActivityListProps) {
  return <ol role="list" aria-label={label} {...props} className={join("basalt-activity", className)}>{children}</ol>;
}

export interface ActivityStepProps extends Omit<React.ComponentProps<"li">, "children"> {
  status: ActivityStatus;
  /** The sentence: what the step did, or is doing ("Installed 214 packages", "Reading the deploy log"). */
  children: React.ReactNode;
  /**
   * The status word. A failed or waiting step draws it before the sentence ("Failed", "Waiting" by default); a running or done step only says it
   * ("Running", "Done"), unless the app gives one here, which is then drawn ("Skipped").
   */
  word?: string;
  /** A short fact at the end of the line, in tertiary: how long it took ("1.2 s"), a count. */
  meta?: React.ReactNode;
  /** What the step opens to (its log, its input and output). The step is then a disclosure row. */
  detail?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** One step. See the module note. */
export function ActivityStep({ status, children, word, meta, detail, open, defaultOpen, onOpenChange, className, ...props }: ActivityStepProps) {
  const said = word ?? WORD[status];
  const shown = word !== undefined || SHOWN[status];
  const seat = <span className="basalt-activity-seat" aria-hidden="true">{status === "running" ? <Spinner variant="braille" size={16} /> : <span className="basalt-activity-dot" />}</span>;
  const sentence = (
    <span className="basalt-activity-sentence">
      {shown ? <span className="basalt-activity-word">{said} </span> : <span className="basalt-visually-hidden">{said}: </span>}
      {children}
    </span>
  );
  const metaCell = meta ? <span className="basalt-activity-meta">{meta}</span> : null;
  return (
    <li {...props} data-status={status} className={join("basalt-activity-step", className)}>
      {detail ? (
        <DisclosureRow wrap mark={seat} title={sentence} meta={metaCell} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>{detail}</DisclosureRow>
      ) : (
        <div className="basalt-activity-line">
          {seat}
          {sentence}
          {metaCell}
          <span className="basalt-activity-chevron-seat" aria-hidden="true" />
        </div>
      )}
    </li>
  );
}
