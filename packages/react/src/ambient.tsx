import * as React from "react";

import { ambient } from "./ambient-timing";
import { join } from "./utils";

// A page's one ambient loop (DECISIONS 136 C): opacity only, from 1 down to 0.2 and back on `ease-in-out`, in the page's art (a `Stage`'s
// art or a framed drawing) and nowhere else. Each looping mark runs 0.6 to 1.4 times `duration-loop-ambient`, with its own phase, so no
// two are in step and the field's total light holds steady; a looping mark is no wider than `size-dot` (6px), and a page has at most 24.
// It joins the root hold (`data-loops="held"` holds every mark at full opacity; releasing rejoins the shared clock), and it is still under
// reduced motion, in forced colours and in print. Nothing here runs at import.

export interface AmbientMarkProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** Which of the page's looping marks this is, from 0 to 23. A mark past 23 is drawn and does not loop. */
  index: number;
}

/**
 * One looping light in a stage's art: a `size-dot` square in the art's brightest tone, positioned by the art (`style` or a class). Opacity
 * is all that moves. It is decorative and hidden from assistive technology, as the art is.
 */
export function AmbientMark({ index, className, style, ...props }: AmbientMarkProps) {
  const loop = ambient(index);
  return <span {...props} aria-hidden="true" {...loop} style={{ ...loop?.style, ...style }} className={join("basalt-ambient-mark", className)} />;
}
