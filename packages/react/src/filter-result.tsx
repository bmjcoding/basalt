import * as React from "react";

import { join } from "./utils";

// ---- FilterResult: the one thing a filter says aloud ----
// A module of its own, so the command list (which counts what it shows) shares it without loading the filter and its popover.

export interface FilterResultProps extends Omit<React.ComponentProps<"p">, "children"> {
  /** The result in words, e.g. "Showing 3 of 24 runs". */
  children: string;
  /** Milliseconds the text must hold still before it is spoken. Toggling several chips in a row is one announcement. */
  delay?: number;
}

/**
 * The result of filtering, shown at once and spoken once: a polite, atomic live region outside the filter, updated after the
 * text has held still for `delay` milliseconds. Each chip speaks its own state ("checked"); this says only what it did to the
 * list. Render it once per filtered list.
 */
export function FilterResult({ children, delay = 400, className, ...props }: FilterResultProps) {
  return (
    <p {...props} className={join("basalt-filter-result", className)}>
      <span aria-hidden="true">{children}</span>
      <StatusLine delay={delay}>{children}</StatusLine>
    </p>
  );
}

export interface StatusLineProps extends Omit<React.ComponentProps<"span">, "children" | "role" | "aria-live" | "aria-atomic"> {
  /** What to say, in words, e.g. "Saved 3 changes". */
  children: string;
  /** Milliseconds the text must hold still before it is spoken. Sending text several times in a row is one announcement, of the last. */
  delay?: number;
  /**
   * Tells two sends of one text apart. Change it (a counter that goes up) each time the same text is sent again, and the line
   * says it again: a screen reader announces only when the DOM changes, so the line is emptied for the `delay` and then filled.
   */
  sendId?: string | number;
}

/**
 * A polite status line that is heard and not seen: a visually hidden `role="status"` region that says its text once it has held
 * still for `delay` milliseconds, and says it again when `sendId` changes. Put it where the thing it reports is, and render it
 * once per message source. Text already in it when it mounts is not announced (the page's own content); send what should be
 * heard after the line is in the page. Show the same words on screen yourself if sighted people need them: this draws nothing.
 */
export function StatusLine({ children, delay = 400, sendId, className, ...props }: StatusLineProps) {
  const [spoken, setSpoken] = React.useState(children);
  const sent = React.useRef(sendId);
  React.useEffect(() => {
    // The same text sent again changes nothing in the DOM, so a screen reader would say nothing: empty the line first.
    if (sent.current !== sendId) {
      sent.current = sendId;
      setSpoken("");
    }
    const timer = window.setTimeout(() => setSpoken(children), delay);
    return () => window.clearTimeout(timer);
  }, [children, delay, sendId]);
  return <span {...props} role="status" aria-live="polite" aria-atomic="true" className={join("basalt-visually-hidden", className)}>{spoken}</span>;
}
