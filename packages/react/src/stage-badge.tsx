import * as React from "react";

import { Badge } from "./display";
import type { BadgeStatus } from "./display";
import { useLoops } from "./loops";
import { Reserve } from "./reserve";
import { Spinner } from "./spinner";
import { STAGE_WORDS } from "./run-format";
import type { StageState } from "./run-format";
import { join } from "./utils";

// ---- A status that changes in place (DECISIONS 316, 1.6) ----
// A `Badge` bound to the seven states: queued is the pending ring, running and retrying braille, passed the success dot, failed the danger dot,
// skipped and canceled the neutral dot. Its seat is as wide as its widest face, mark included, from a static measure (the words alone in a hidden
// cell, with the dot's seat, which is braille's width): no spinner is mounted to measure with. A change of face is sequential: the old face fades out
// and rises space-1 over 0.75 of duration-base on ease-in, then the new one fades in from space-1 below over duration-base on ease-out, held at
// opacity 0 until the old has gone whether or not the old is still in the DOM. No width animates. Reduced motion fades only; the hold swaps at once.

export interface StageBadgeProps {
  state: StageState;
  /** The words, by state. Left out, "Queued", "Running", "Passed", "Failed", "Skipped", "Canceled", "Retrying". The app writes an attempt ("Retrying, 2 of 3"). */
  words?: Partial<Record<StageState, string>>;
  /** `outline` in a run's head; `plain` in a list or a table (a dot and a word, never a pill a row). */
  variant?: "outline" | "plain";
  /** A plain badge's mark seat (see `Badge`). */
  size?: 16 | 20 | 24;
  className?: string;
}

const STATUS: Record<StageState, BadgeStatus | undefined> = {
  queued: "pending", running: undefined, success: "success", failed: "danger", skipped: "neutral", canceled: "neutral", retrying: undefined,
};

interface Face { key: number; state: StageState; leaving?: boolean }

function FaceBadge({ state, word, variant, size }: { state: StageState; word: string; variant: "outline" | "plain"; size: 16 | 20 | 24 }) {
  const running = state === "running" || state === "retrying";
  const body = <>{running ? <Spinner variant="braille" /> : null}{word}</>;
  return variant === "plain"
    ? <Badge variant="plain" size={size} status={STATUS[state]}>{body}</Badge>
    : <Badge status={STATUS[state]}>{body}</Badge>;
}

/** A run's or a stage's state as a badge whose face changes in place, in a seat that never moves. One accessible name at every moment: the new word. */
export function StageBadge({ state, words, variant = "outline", size = 16, className }: StageBadgeProps) {
  const { held } = useLoops();
  const all = { ...STAGE_WORDS, ...words };
  const [faces, setFaces] = React.useState<Face[]>(() => [{ key: 0, state }]);
  const current = faces[faces.length - 1]!;
  // The hold lands every change at once: a face still leaving when it arrives goes now.
  if (held && faces.length > 1) setFaces([current]);
  else if (current.state !== state) {
    if (held) setFaces([{ key: current.key + 1, state }]);
    else setFaces([{ ...current, leaving: true }, { key: current.key + 1, state }]);
  }
  const drop = (key: number) => setFaces((list) => (list.some((f) => f.key === key && f.leaving) ? list.filter((f) => f.key !== key) : list));
  const measure = variant === "plain"
    ? <Badge variant="plain" size={size} status="neutral"><Reserve show="" alternatives={all} /></Badge>
    : <Badge status="neutral"><Reserve show="" alternatives={all} /></Badge>;
  return (
    <span className={join("basalt-run-badge", className)} data-variant={variant} data-state={state}>
      {/* The seat: every word in one hidden cell, beside the dot's seat (as wide as braille's). Nothing in it moves or is read. */}
      <span className="basalt-run-badge-measure" aria-hidden="true" inert>{measure}</span>
      {faces.map((face) => {
        const leave = face.leaving ? (event: React.AnimationEvent<HTMLSpanElement>) => { if (event.target === event.currentTarget) drop(face.key); } : undefined;
        return (
          <span
            key={face.key}
            className="basalt-run-badge-face"
            data-leaving={face.leaving ? "" : undefined}
            data-entering={face.key > 0 && !face.leaving ? "" : undefined}
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
