// What a copy control with a glyph shows after a write (DECISIONS 152, item 6; 336 and the open items' ruling): the check for CONFIRM_MS after a write
// that succeeded, the close after one that was refused, through the button's done seat. The done glyph stays the last result's until the next write, so
// as the 1500ms ends it is that glyph that leaves: never a check on the way out of a failure. Used by CodeBlock's and Terminal's copies.
import * as React from "react";

import { CONFIRM_MS } from "./constants";
import { CheckGlyph } from "./glyphs/check";
import { CloseGlyph } from "./glyphs/close";
import type { IconComponent } from "./types";

export type CopyOutcome = "copied" | "failed";

export interface CopyState {
  /** The result being shown, or null once its time is up. */
  shown: CopyOutcome | null;
  /** The last result, which picks the done glyph while it leaves. */
  last: CopyOutcome;
}

export const COPY_REST: CopyState = { shown: null, last: "copied" };

/** The next state: a write's outcome shows it and makes it the last; the end of its time hides it and keeps it the last. */
export function nextCopyState(state: CopyState, event: CopyOutcome | "reset"): CopyState {
  return event === "reset" ? { shown: null, last: state.last } : { shown: event, last: event };
}

/** The done glyph for a state: the close while the last result was a refusal, else the check. */
export function copyDoneIcon(state: CopyState): IconComponent {
  return state.last === "failed" ? CloseGlyph : CheckGlyph;
}

/** The words the status line says for a state. */
export function copyStatus(state: CopyState): string {
  return state.shown === "copied" ? "Copied" : state.shown === "failed" ? "Copy failed" : "";
}

/** A copy's state and its write: `copy(text)` writes, shows the outcome for CONFIRM_MS and keeps its glyph as it leaves. */
export function useCopyResult() {
  const [state, setState] = React.useState<CopyState>(COPY_REST);
  React.useEffect(() => {
    if (!state.shown) return undefined;
    const t = setTimeout(() => setState((now) => nextCopyState(now, "reset")), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [state]);
  const copy = React.useCallback(async (text: string) => {
    let outcome: CopyOutcome = "copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard refused (an insecure context or no permission): the close for a moment, and the status says so
      outcome = "failed";
    }
    setState((now) => nextCopyState(now, outcome));
  }, []);
  return { state, copy, done: state.shown !== null, doneIcon: copyDoneIcon(state), status: copyStatus(state) };
}
