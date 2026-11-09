import type { IconComponent, IconGlyphProps } from "./types";
import { join } from "./utils";

export type IconSize = 16 | 20 | 24;

export interface IconProps {
  /**
   * An icon component: one of Basalt's core glyphs (`HomeGlyph`), or from the long tail, e.g. `MagnifyingGlassIcon` from
   * `@phosphor-icons/react`.
   */
  icon: IconComponent;
  /** 16 in controls and beside 13–14px text; 20 in navigation and larger controls; 24 for tab bars and empty states. */
  size?: IconSize;
  /**
   * Selected or active. A core glyph closes its opening and fills; a long-tail glyph changes only if it is `fillSafe`.
   */
  selected?: boolean;
  /**
   * A long-tail glyph that keeps its silhouette when filled, so `selected` may use Phosphor's Fill weight. Only selected
   * navigation and object identities qualify (DECISIONS item 38); chrome never does. Without it, selected is the same
   * Bold drawing, and the active ink says so. A core glyph ignores this: it has its own selected drawing.
   */
  fillSafe?: boolean;
  /**
   * An accessible name, only for an icon that carries meaning on its own. Icons beside a
   * text label are decorative and hidden from assistive technology.
   */
  label?: string;
  className?: string;
}

/** A core glyph carries its drawing; a long-tail icon does not. */
const isCore = (icon: IconComponent) => (icon as { glyph?: unknown }).glyph !== undefined;

/**
 * An icon at Basalt's weight. The core glyphs are 2.25 on the 24 grid at every size, and the long tail is Phosphor Bold at
 * 16, 20 and 24, which draws the same stroke (24 of 256). Fill only where the council allowed it. Colour comes from the
 * text colour.
 */
export function Icon({ icon: Glyph, size = 16, selected = false, fillSafe = false, label, className }: IconProps) {
  const weight: NonNullable<IconGlyphProps["weight"]> = selected && (fillSafe || isCore(Glyph)) ? "fill" : "bold";
  return (
    <Glyph
      size={size}
      weight={weight}
      className={join("basalt-icon", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
