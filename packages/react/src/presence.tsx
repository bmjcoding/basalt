import * as React from "react";

import { Badge } from "./display";
import type { BadgeStatus } from "./display";
import { formatElapsed } from "./time-format";
import { useNow } from "./time";
import { join } from "./utils";

// ---- Presence with a duration, and a length of time beside a word ----
// "Away 6 min" beside a name: a state's word, and how long it has lasted so far. The length is a duration (like a countdown, the other way), not
// a relative age, so it stands without a date. It ticks by the minute on the one shared timer, holds under `data-loops="held"`, is never a live
// region and is not stopped by reduced motion (it is text, not motion). Under a minute the word stands alone.

const quiet = () => () => {};
const useDrawn = () => React.useSyncExternalStore(quiet, () => true, () => false);

export interface ElapsedProps extends Omit<React.ComponentProps<"time">, "children" | "dateTime"> {
  /** When the state began. */
  since: Date | number;
  /** A fixed "now" in place of the running clock (nothing ticks): for a fixed render or a test. */
  now?: Date | number;
  /** Writes the length in the app's own words. Default `formatElapsed` ("6 min", "1 hr 5 min", "3 days"; nothing under a minute). */
  format?: (since: Date | number, now: number) => { text: string; dateTime: string } | null;
}

/**
 * How long a state has lasted: a `time` with an ISO duration, in tabular figures, ticking by the minute. Under a minute it is empty and hidden. Put it after
 * the state's word ("Away 6 min", "Running 12 min", "Open 3 days"); it is never alone, because the word says what has lasted.
 */
export function Elapsed({ since, now: fixed, format = formatElapsed, className, ...props }: ElapsedProps) {
  const now = useNow("minute", fixed);
  const drawn = useDrawn();
  const running = fixed === undefined;
  const length = format(since, now);
  // The element is always there, empty and hidden under a minute, so a server that drew it at 59 seconds and a client that hydrates it at 61 draw
  // the same tree; the client's own value replaces it once drawn.
  return (
    <time key={running && !drawn ? "server" : "client"} suppressHydrationWarning={running || undefined} {...props} hidden={length ? props.hidden : true} dateTime={length?.dateTime ?? "PT0M"} className={join("basalt-time basalt-elapsed", className)}>
      {length?.text ?? ""}
    </time>
  );
}

/** The three states a person can be in. The app names them in its own words with `label`. */
export type PresenceStatus = "active" | "away" | "offline";

const MARK: Record<PresenceStatus, BadgeStatus> = { active: "success", away: "pending", offline: "neutral" };
const WORD: Record<PresenceStatus, string> = { active: "Active", away: "Away", offline: "Offline" };

export interface PresenceProps extends Omit<React.ComponentProps<"span">, "children"> {
  status: PresenceStatus;
  /** The state's word. Default "Active", "Away" or "Offline". */
  label?: string;
  /** When the state began: its length is drawn after the word ("Away 6 min"). Without it the word stands alone. */
  since?: Date | number;
  /** A fixed "now" (nothing ticks). */
  now?: Date | number;
  /** Writes the length in the app's own words. Default `formatElapsed`. */
  format?: ElapsedProps["format"];
  /** `plain` (default): the mark and the words on the line, beside a name. `outline`: the same in a badge. */
  variant?: "plain" | "outline";
}

/**
 * A person's presence: the status mark (a success dot while active, the hollow ring while away, the tertiary dot while offline), the state's word
 * and, with `since`, how long it has lasted ("Away 6 min"), in the word's own ink. The word always says the state; the mark never carries it alone.
 * It is a `Badge`: plain beside a name, or in its outline.
 */
export function Presence({ status, label = WORD[status], since, now, format, variant = "plain", className, ...props }: PresenceProps) {
  const words = (
    <span className="basalt-presence-words">
      {label}
      {since === undefined ? null : <> <Elapsed since={since} now={now} format={format} /></>}
    </span>
  );
  return variant === "plain"
    ? <Badge {...props} variant="plain" status={MARK[status]} data-presence={status} className={join("basalt-presence", className)}>{words}</Badge>
    : <Badge {...props} status={MARK[status]} data-presence={status} className={join("basalt-presence", className)}>{words}</Badge>;
}
