import * as React from "react";

import { Badge } from "./display";
import type { BadgeStatus } from "./display";
import { useLoops } from "./loops";
import { Reserve } from "./reserve";
import { Spinner } from "./spinner";
import { STAGE_WORDS } from "./run-format";
import type { StageState } from "./run-format";
import { warnRun } from "./run-warn";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- A status that changes in place (DECISIONS 316, 1.6) ----
// A `Badge` bound to the eight states: idle (not started) is the neutral dot, queued is the pending ring, running and retrying braille, passed the success dot, failed the danger dot,
// skipped and canceled the neutral dot. Its seat is as wide as its widest face, mark included, from a static measure (the words alone in a hidden
// cell, with the dot's seat, which is braille's width): no spinner is mounted to measure with. Each face is a pill as wide as its own words, at the
// seat's start (DECISIONS 326). A change of face is sequential: the old face fades out
// and rises space-1 over 0.75 of duration-base on ease-in, then the new one fades in from space-1 below over duration-base on ease-out, held at
// opacity 0 until the old has gone whether or not the old is still in the DOM. No width animates. Reduced motion fades only; the hold swaps at once.
// The seat holds the words of `states` (left out, every state but idle, whose "Not started" is the widest word): a badge that shows a state its set
// leaves out widens once to hold it, never narrows, and development warns.

export interface StageBadgeProps {
  state: StageState;
  /** The words, by state. Left out, "Not started", "Queued", "Running", "Passed", "Failed", "Skipped", "Canceled", "Retrying". The app writes an attempt ("Retrying, 2 of 3"). */
  words?: Partial<Record<StageState, string>>;
  /** `outline` in a run's head; `plain` in a list or a table (a dot and a word, never a pill a row). */
  variant?: "outline" | "plain";
  /** A plain badge's mark seat (see `Badge`). */
  size?: 16 | 20 | 24;
  /** The states this badge will show; its seat is as wide as the widest of their words. Left out: every state but `idle`. */
  states?: readonly StageState[];
  className?: string;
}

const STATUS: Record<StageState, BadgeStatus | undefined> = {
  idle: "neutral", queued: "pending", running: undefined, success: "success", failed: "danger", skipped: "neutral", canceled: "neutral", retrying: undefined,
};

/** The seat's states when the badge names none: every state but idle, so no badge that never shows "Not started" makes room for it. */
const SEATED: readonly StageState[] = ["queued", "running", "success", "failed", "skipped", "canceled", "retrying"];

/** A face in the seat. `settled` once its entry has run (or it arrived under the hold), so a release never plays an entry again. */
interface Face { key: number; state: StageState; leaving?: boolean; settled?: boolean }

function FaceBadge({ state, word, variant, size }: { state: StageState; word: string; variant: "outline" | "plain"; size: 16 | 20 | 24 }) {
  const running = state === "running" || state === "retrying";
  const body = <>{running ? <Spinner variant="braille" /> : null}{word}</>;
  return variant === "plain"
    ? <Badge variant="plain" size={size} status={STATUS[state]}>{body}</Badge>
    : <Badge status={STATUS[state]}>{body}</Badge>;
}

/** A run's or a stage's state as a badge whose face changes in place, in a seat that never moves. One accessible name at every moment: the new word. */
export function StageBadge({ state, words, variant = "outline", size = 16, states = SEATED, className }: StageBadgeProps) {
  const { held } = useLoops();
  const all = { ...STAGE_WORDS, ...words };
  // A state the set leaves out joins the seat the first time it is shown and stays in it: the seat widens once and never narrows.
  const [extra, setExtra] = React.useState<readonly StageState[]>(() => (states.includes(state) ? [] : [state]));
  const outside = !states.includes(state);
  if (outside && !extra.includes(state)) setExtra([...extra, state]);
  // Said once for each state (warnRun keeps the set), from the render, as RunTimer's warnings are.
  if (process.env.NODE_ENV !== "production" && outside) warnRun("StageBadge", `it showed "${state}", which its \`states\` leave out; its seat widened to hold it. List every state the badge can show.`);
  const seat: Record<string, string> = {};
  for (const one of [...states, ...extra]) seat[one] = all[one];
  const [faces, setFaces] = React.useState<Face[]>(() => [{ key: 0, state }]);
  const current = faces[faces.length - 1]!;
  // The hold lands every change at once: a face still leaving when it arrives goes now.
  if (held && (faces.length > 1 || (current.key > 0 && !current.settled))) setFaces([{ ...current, settled: true }]);
  else if (current.state !== state) {
    if (held) setFaces([{ key: current.key + 1, state, settled: true }]);
    else setFaces([{ ...current, leaving: true }, { key: current.key + 1, state }]);
  }
  const settle = (key: number) => setFaces((list) => list.map((f) => (f.key === key && !f.leaving ? { ...f, settled: true } : f)));
  const drop = (key: number) => setFaces((list) => (list.some((f) => f.key === key && f.leaving) ? list.filter((f) => f.key !== key) : list));
  const measure = variant === "plain"
    ? <Badge variant="plain" size={size} status="neutral"><Reserve show="" alternatives={seat} /></Badge>
    : <Badge status="neutral"><Reserve show="" alternatives={seat} /></Badge>;
  return (
    <span className={join("basalt-run-badge", className)} data-variant={variant} data-state={state}>
      {/* The seat: every word in one hidden cell, beside the dot's seat (as wide as braille's). Nothing in it moves or is read. */}
      <span className="basalt-run-badge-measure" aria-hidden="true" inert>{measure}</span>
      {faces.map((face) => {
        const leave = (event: React.AnimationEvent<HTMLSpanElement>) => { if (event.target !== event.currentTarget) return; if (face.leaving) drop(face.key); else settle(face.key); };
        return (
          <span
            key={face.key}
            className="basalt-run-badge-face"
            data-leaving={face.leaving ? "" : undefined}
            data-entering={face.key > 0 && !face.leaving && !face.settled ? "" : undefined}
            aria-hidden={face.leaving ? true : undefined}
            onAnimationEnd={leave}
          >
            <FaceBadge state={face.state} word={all[face.state]} variant={variant} size={size} />
          </span>
        );
      })}
    </span>
  );
}
