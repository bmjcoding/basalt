import * as React from "react";

import { DrawingSvg, settle } from "./glyph";
import type { Drawing } from "./glyph";
import type { GlyphIcon } from "./glyph";
import type { MorphName } from "./glyph-names";
import { createMorph, endpointOf, keyOf } from "./glyph-motion";
import type { MorphController } from "./glyph-motion";
import { glyphData } from "./glyph-registry";
import { glideTiming, bezier, useReducedMotion } from "./motion";
import { join } from "./utils";

export type { MorphName };

interface MorphIconBase {
  /** Selected: the opening closes, closed loops fill and inner strokes become holes. Changing it morphs. */
  selected?: boolean;
  size?: number;
  className?: string;
}

/**
 * Which glyph to show, by `name` (the core actions) or by `glyph` (any core glyph, e.g. `HomeGlyph`). Changing it morphs
 * only where the council allowed it; any other change swaps at once. A glyph passed by reference is the only one the
 * bundle carries, so a navigation icon does not bring the whole set.
 */
export type MorphIconProps = MorphIconBase & ({ name: MorphName; glyph?: undefined } | { glyph: GlyphIcon; name?: undefined });

/**
 * A core glyph that can change. Three changes morph, at `slow` on `ease-out`:
 * - rest and selected, as the opening closes into the fill;
 * - a turn within a rotation group (the four arrows, the four chevrons, plus and close);
 * - a drawn pair: menu and close, play and pause, copy and check, chevron-down and download, in both directions.
 * Every other change of glyph swaps at once. A morph in flight keeps its identity: asking for where it is already going
 * does nothing, asking for where it came from runs it back, and asking for another member of its group turns on.
 * Reduced motion swaps at once. The stroke is 2.25 on the 24 grid at every size.
 */
export function MorphIcon({ name, glyph, selected = false, size = 16, className }: MorphIconProps) {
  const reduced = useReducedMotion();
  const data = glyph ? glyph.glyph : glyphData(name as MorphName);
  const [drawing, setDrawing] = React.useState<Drawing>(() => settle(data, selected));
  const morph = React.useRef<MorphController | null>(null);

  React.useLayoutEffect(() => {
    if (!morph.current) {
      // The first render drew this glyph already.
      const clock = { now: () => performance.now(), raf: (fn: (now: number) => void) => requestAnimationFrame(fn), caf: (id: number) => cancelAnimationFrame(id) };
      morph.current = createMorph(endpointOf(data, selected), keyOf(data, selected), setDrawing, clock);
      return;
    }
    const { duration, curve } = glideTiming(); // slow, ease-out
    morph.current.go(data, selected, { duration, ease: (t) => bezier(curve, t), reduced });
  }, [data, selected, reduced]);
  React.useEffect(() => () => morph.current?.stop(), []);

  return (
    <DrawingSvg
      drawing={drawing}
      size={size}
      className={join("basalt-morph", className)}
      data-icon={data.name}
      data-selected={selected ? "" : undefined}
      data-reduced={reduced ? "" : undefined}
      aria-hidden="true"
    />
  );
}
