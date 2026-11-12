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
  const [spoken, setSpoken] = React.useState(children);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setSpoken(children), delay);
    return () => window.clearTimeout(timer);
  }, [children, delay]);
  return (
    <p {...props} className={join("basalt-filter-result", className)}>
      <span aria-hidden="true">{children}</span>
      <span role="status" aria-live="polite" aria-atomic="true" className="basalt-visually-hidden">{spoken}</span>
    </p>
  );
}
