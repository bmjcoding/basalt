import * as React from "react";

import { join } from "./utils";

// ---- FilterResult: the one thing a filter says aloud ----
// A module of its own, so the command list (which counts what it shows) shares it without loading the filter and its popover.

export type FilterResultProps = Omit<React.ComponentProps<"p">, "children"> & {
  /** Milliseconds the text must hold still before it is spoken. Toggling several chips in a row is one announcement. */
  delay?: number;
  /**
   * The widest drawn form, written as `children` are ("Showing 428 of 428 lots"), laid out unseen in the line's one cell, so the line and its toolbar wrap the same
   * from the first frame. It is a sizing copy: no form field and no `id` in it (`inert` stops neither a submit nor validation; development warns on a field).
   */
  reserve?: React.ReactNode;
} & (
  /** The result in words, e.g. "Showing 3 of 24 runs". `spoken`, when given, is what is said in its place. */
  | { children: string; spoken?: string }
  /** The result drawn as a node ("Lots shown" and a figure set apart): `spoken` is then the words that are said. */
  | { children: React.ReactNode; spoken: string }
);

declare const process: { env: { NODE_ENV?: string } };
let warnedField = false;

/**
 * The result of filtering, shown at once and spoken once: a polite, atomic live region outside the filter, updated after the
 * text has held still for `delay` milliseconds. Each chip speaks its own state ("checked"); this says only what it did to the
 * list. Render it once per filtered list. The drawn form (`children`) is hidden from assistive technology; what is said is `spoken`, or
 * `children` when they are words, through the one `StatusLine`. An empty result keeps one line's height. The words stay the app's.
 */
export function FilterResult({ children, spoken, reserve, delay = 400, className, ...props }: FilterResultProps) {
  const said = spoken ?? (typeof children === "string" ? children : "");
  const sizer = React.useRef<HTMLSpanElement | null>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || warnedField || !sizer.current) return;
    if (sizer.current.querySelector("input, select, textarea, button, [id]")) {
      warnedField = true;
      console.warn("Basalt FilterResult: `reserve` is a sizing copy and holds no form field, button or `id`: an unseen field still submits and still blocks a submit");
    }
  });
  return (
    <p {...props} data-reserve={reserve !== undefined ? "" : undefined} className={join("basalt-filter-result", className)}>
      {reserve !== undefined ? (
        <span className="basalt-filter-result-cell">
          <span aria-hidden="true">{children}</span>
          <span ref={sizer} className="basalt-filter-result-sizer" aria-hidden="true" inert>{reserve}</span>
        </span>
      ) : <span aria-hidden="true">{children}</span>}
      <StatusLine delay={delay}>{said}</StatusLine>
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
