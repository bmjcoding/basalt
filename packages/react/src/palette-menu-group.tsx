import * as React from "react";

import { MenuGroup, MenuGroupLabel, MenuRadioGroup, MenuRadioItem, MenuText } from "./menu";
import { usePalette } from "./palette";
import { wordsOf } from "./palette-choice";
import type { PaletteWords } from "./palette-choice";

// The palette choice inside an app's own Menu (cimip-gaps-3 T9), in a module of its own so the footer's control does not carry the menu.

export interface PaletteMenuGroupProps {
  words?: PaletteWords;
  /** Close the menu on a choice. Default false: the menu stays open, so the change is seen. */
  closeOnClick?: boolean;
}

/**
 * The palette choice inside an app's own `Menu`: a group labelled "Palette" with one radio row per palette. The menu stays open on a choice. While the
 * palette came from a link, a line under the label says so; it describes the group and is not focusable.
 */
export function PaletteMenuGroup({ words, closeOnClick = false }: PaletteMenuGroupProps): React.JSX.Element {
  const text = wordsOf(words);
  const { palette, palettes, source, setPalette } = usePalette();
  return (
    <MenuGroup>
      <MenuGroupLabel>{text.label}</MenuGroupLabel>
      {source === "url" ? <MenuText>{text.fromLink}</MenuText> : null}
      <MenuRadioGroup value={palette} onValueChange={(value) => setPalette(String(value))}>
        {palettes.map((option) => (
          <MenuRadioItem
            key={option.id}
            value={option.id}
            closeOnClick={closeOnClick}
            // The checked row reports no change; a press on it saves a palette a link opened.
            onClick={option.id === palette && source === "url" ? () => setPalette(option.id) : undefined}
          >
            {option.label}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </MenuGroup>
  );
}
