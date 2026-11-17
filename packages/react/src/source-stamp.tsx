import * as React from "react";

import { StatusLine } from "./filter-result";
import { Reserve } from "./reserve";
import { Spinner } from "./spinner";
import { TextButton } from "./text-button";
import { formatStamp } from "./time";
import { join } from "./utils";

// ---- Where a figure came from, and what a source says while it has nothing (DECISIONS 162, D14b: V5, V6, R8, B8) ----

/** A source's state: answered, stale (what was last fetched is kept), asking, unreachable, or not asked yet. */
export type SourceStatus = "answered" | "stale" | "asking" | "unreachable" | "idle";

export interface SourceStampProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The source's name: "github". */
  source: string;
  state: SourceStatus;
  /** When it answered. Written to the second, after the name, with no middle dot ("github 18:52:07"); `Stat`'s own line is unchanged. */
  at?: Date | number;
  /** The zone the time is written in: an IANA name. Defaults to the runtime's. */
  timeZone?: string;
  /** Makes the stamp a button that opens the request: "Source: github 18:52:07. Open the request." */
  onOpen?: () => void;
}

/** The mark of a source's state in an 8 by 10 seat: four 8px shapes as drawn, and braille for asking. Shape and word, never colour alone. */
function Mark({ state }: { state: SourceStatus }) {
  if (state === "asking") return <Spinner variant="braille" size={16} />;
  return (
    <svg className="basalt-source-mark" viewBox="0 0 8 8" width="8" height="8" aria-hidden="true" focusable="false" data-state={state}>
      {state === "answered" ? <rect x="1" y="1" width="6" height="6" fill="currentColor" /> : null}
      {state === "stale" ? <><rect x="1.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" /><rect x="1" y="4" width="6" height="3" fill="currentColor" /></> : null}
      {state === "idle" ? <rect x="1.5" y="1.5" width="5" height="5" fill="none" stroke="currentColor" /> : null}
      {state === "unreachable" ? <path d="M1.5 1.5 6.5 6.5M6.5 1.5 1.5 6.5" fill="none" stroke="currentColor" /> : null}
    </svg>
  );
}

/**
 * A source's name and when it answered, with a mark (a filled, half-filled or hollow square, a cross, or braille while asking) and always a
 * word. Stale and unreachable are in secondary ink and the rest tertiary. One 8 by 10 seat holds every mark, so a state that changes moves
 * nothing, and `space-1-5` follows it. With `onOpen` it is a button, 24 tall (44 on a touch screen).
 */
export function SourceStamp({ source, state, at, timeZone, onOpen, className, ...props }: SourceStampProps) {
  const stamp = at !== undefined && (state === "answered" || state === "stale") ? formatStamp(at, { timeZone }) : null;
  const time = stamp ? <time dateTime={stamp.dateTime} className="basalt-time">{stamp.text}</time> : null;
  const words =
    state === "asking" ? <>asking {source}</>
    : state === "idle" ? <>{source}, not asked yet</>
    : state === "unreachable" ? <>{source} unreachable</>
    : <>{source}{time ? <> {time}</> : null}{state === "stale" ? <>, stale</> : null}</>;
  const body = (
    <>
      <span className="basalt-source-seat" aria-hidden="true"><Mark state={state} /></span>
      <span className="basalt-source-words">{onOpen ? <span className="basalt-visually-hidden">Source: </span> : null}{words}{onOpen ? <span className="basalt-visually-hidden">. Open the request.</span> : null}</span>
    </>
  );
  const common = { "data-state": state, className: join("basalt-source-stamp", className) };
  return onOpen
    ? <button {...(props as unknown as React.ComponentProps<"button">)} {...common} type="button" onClick={onOpen}>{body}</button>
    : <span {...props} {...common}>{body}</span>;
}

export interface SourceStateWordsProps extends Omit<React.ComponentProps<"p">, "children"> {
  /** What the block is waiting for, as a noun phrase that reads after "Asking for": "the weather". */
  what: string;
  state: "asking" | "unreachable";
  /** When the last attempt was and why it failed: "(tried 18:52:07: timed out)". */
  tried?: Date | number;
  why?: string;
  timeZone?: string;
  /** "Ask again". */
  onRetry: () => void;
  /** A way to the same thing elsewhere, after the sentence: a link. */
  alternative?: React.ReactNode;
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * What a block says while it has nothing to show. "Asking for the weather." while a source has not answered; when it fails, "The weather is
 * unreachable right now (tried 18:52:07: timed out)." with an "Ask again" button and a link elsewhere where there is one. Never a spinner or a
 * skeleton. Both sentences stand in one cell (`Reserve`), so the band keeps its height, and the failure is said once, politely.
 */
export function SourceStateWords({ what, state, tried, why, timeZone, onRetry, alternative, className, ...props }: SourceStateWordsProps) {
  const stamp = tried !== undefined ? formatStamp(tried, { timeZone }) : null;
  const detail = stamp ? <> (tried <time dateTime={stamp.dateTime} className="basalt-time">{stamp.text}</time>{why ? `: ${why}` : ""})</> : why ? <> ({why})</> : null;
  return (
    <p {...props} className={join("basalt-source-state", className)} data-state={state}>
      <Reserve
        show={state}
        alternatives={{
          asking: <>Asking for {what}.</>,
          unreachable: <>{capital(what)} is unreachable right now{detail}. {alternative}{alternative ? " " : null}<TextButton onClick={onRetry}>Ask again</TextButton></>,
        }}
      />
      <StatusLine>{state === "unreachable" ? `${capital(what)} is unreachable right now.` : ""}</StatusLine>
    </p>
  );
}
