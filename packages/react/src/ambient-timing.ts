import type { CSSProperties } from "react";

// The marks of a page's one ambient loop as plain functions (see `ambient.tsx`): no component and no hook, and nothing that runs at import, in a module
// of its own that carries no `"use client"`, so a React Server Component can compute a mark's props and spread them on a shape.

/** At most this many marks loop on a page. `ambient(index)` returns nothing for an index past it. */
export const AMBIENT_MAX = 24;
const GOLDEN = 0.6180339887498949;
const PLASTIC = 0.7548776662466927;
const frac = (value: number) => value - Math.floor(value);

export interface AmbientProps {
  /** Marks the element as one of the loop's marks; the stylesheet runs the loop on it (only inside a stage's art or a framed frame). */
  "data-ambient": "";
  /** The mark's own period and phase, as the two custom properties the loop reads. */
  style: CSSProperties;
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
  return { "data-ambient": "", style: { "--_k": period.toFixed(3), "--_ph": phase.toFixed(3) } as CSSProperties };
}
