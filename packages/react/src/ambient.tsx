import * as React from "react";

import { join } from "./utils";

// A page's one ambient loop (DECISIONS 136 C): opacity only, from 1 down to 0.2 and back on `ease-in-out`, in the page's art (a `Stage`'s
// art or a framed drawing) and nowhere else. Each looping mark runs 0.6 to 1.4 times `duration-loop-ambient`, with its own phase, so no
// two are in step and the field's total light holds steady; a looping mark is no wider than `size-dot` (6px), and a page has at most 24.
// It joins the root hold (`data-loops="held"` holds every mark at full opacity; releasing rejoins the shared clock), and it is still under
// reduced motion, in forced colours and in print. Nothing here runs at import.

/** At most this many marks loop on a page. `ambient(index)` returns nothing for an index past it. */
export const AMBIENT_MAX = 24;
const GOLDEN = 0.6180339887498949;
const PLASTIC = 0.7548776662466927;
const frac = (value: number) => value - Math.floor(value);

export interface AmbientProps {
  /** Marks the element as one of the loop's marks; the stylesheet runs the loop on it (only inside a stage's art or a framed frame). */
  "data-ambient": "";
  /** The mark's own period and phase, as the two custom properties the loop reads. */
  style: React.CSSProperties;
}

/** The period factor (0.6 to 1.4) and phase (0 to 1) of the mark at `index`: two low-discrepancy sequences, so no two of 24 are alike. */
export function ambientTiming(index: number): { period: number; phase: number } {
  return { period: 0.6 + 0.8 * frac((index + 1) * GOLDEN), phase: frac((index + 1) * PLASTIC) };
}

/**
 * The props that make an element a looping mark: spread them on an SVG shape or an HTML element in a stage's art or a framed drawing.
 * `index` counts the page's looping marks from 0; past 23 (`AMBIENT_MAX`) the mark is not looped and this returns `undefined`.
 * The element must be no wider than `size-dot`; `AmbientMark` is one that is.
 */
export function ambient(index: number): AmbientProps | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= AMBIENT_MAX) return undefined;
  const { period, phase } = ambientTiming(index);
  return { "data-ambient": "", style: { "--_k": period.toFixed(3), "--_ph": phase.toFixed(3) } as React.CSSProperties };
}

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
