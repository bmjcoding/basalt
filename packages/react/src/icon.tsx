import type { IconComponent, IconGlyphProps } from "./types";
import { join } from "./utils";

export type IconSize = 16 | 20 | 24;

export interface IconProps {
  /** An icon component, e.g. `MagnifyingGlassIcon` from `@phosphor-icons/react`. */
  icon: IconComponent;
  /** 16 in controls and beside 13–14px text; 20 in navigation and larger controls; 24 for tab bars and empty states. */
  size?: IconSize;
  /** Selected or active: the filled weight, as SF Symbols does. */
  selected?: boolean;
  /**
   * An accessible name, only for an icon that carries meaning on its own. Icons beside a
   * text label are decorative and hidden from assistive technology.
   */
  label?: string;
  className?: string;
}

/**
 * Phosphor at Basalt's weights: Bold at 16px, so its line matches 16px-grid icons;
 * Regular at 20px and up; Fill when selected. Colour comes from the text colour.
 */
export function Icon({ icon: Glyph, size = 16, selected = false, label, className }: IconProps) {
  const weight: NonNullable<IconGlyphProps["weight"]> = selected ? "fill" : size === 16 ? "bold" : "regular";
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
