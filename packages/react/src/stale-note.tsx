import * as React from "react";

import { Mark } from "./source-stamp";
import { join } from "./utils";

// ---- The stale line (cimip-gaps-3 T2, 4c) ----
// One wrapping line of prose that says what a block of text predates, on the page: no fill, rim or level. `SourceStamp`'s stale mark (the 8px half-filled
// square, currentColor, aria-hidden) in a seat centred on the first line, space-1-5, then the app's sentence at text-sm, 400, secondary; one quiet
// `TextButton` may follow, space-2 away, on its own line when it does not fit. Not a live region (a change that must be heard is the app's `StatusLine`),
// no margin of its own (put space-2 between it and the block it qualifies), shown in print. Not a `Badge` and not a `Callout`.

export interface StaleNoteProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The app's sentence: what the text predates ("Written before the 7:06 PM update"). Basalt writes no template and no default word. */
  children: React.ReactNode;
  /** One quiet `TextButton` ("Update summary"). */
  action?: React.ReactNode;
}

/** A line that says what a block of text predates. A `p`, in a `div` with the action when there is one. */
export function StaleNote({ children, action, className, ...props }: StaleNoteProps) {
  const content = (
    <>
      <span className="basalt-stale-note-mark" aria-hidden="true"><Mark state="stale" /></span>
      <span className="basalt-stale-note-words">{children}</span>
    </>
  );
  if (action === undefined || action === null || action === false) {
    const { ref, ...rest } = props;
    return <p {...(rest as React.ComponentProps<"p">)} ref={ref as React.Ref<HTMLParagraphElement>} className={join("basalt-stale-note basalt-stale-note-line", className)}>{content}</p>;
  }
  const line = <p className="basalt-stale-note-line">{content}</p>;
  return (
    <div {...props} className={join("basalt-stale-note", className)} data-action="">
      {line}
      <span className="basalt-stale-note-action">{action}</span>
    </div>
  );
}
