// What a control's glyph seat is made of, shared by the part every control carries (control-icon.tsx) and the engine's side that loads on demand
// (glyph-flight.tsx). Types and pure helpers: nothing here runs when the module loads.

import type { GlyphData } from "./glyph";
import type { IconComponent } from "./types";

/** What a control's seat shows: the glyph and whether it is drawn selected. */
export interface Shown {
  readonly icon: IconComponent;
  readonly selected: boolean;
}

export interface ControlIconProps {
  icon: IconComponent;
  size?: 16 | 20 | 24;
  selected?: boolean;
  fillSafe?: boolean;
  /** The glyph is one that will change (a toggle's selected form, a current item): load the engine at mount. */
  eager?: boolean;
  /** A pressed toggle's seat: a change that ends without a flight (reduced motion, a pair the engine refuses, an interruption) crossfades over `duration-fast` (DECISIONS 361). */
  crossfade?: boolean;
}

/** A core glyph carries its drawing; a long-tail icon does not. */
export const glyphOf = (icon: IconComponent) => (icon as { glyph?: GlyphData }).glyph;

/** Whether a glyph's selected drawing differs from its rest drawing. An action glyph (copy, trash) keeps its drawing, so selecting it morphs nothing; pause is the one that fills. */
export const changes = (data: GlyphData) => Boolean(data.rest || data.loops?.length);

