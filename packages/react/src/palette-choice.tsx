import * as React from "react";

import { Select } from "./choice";
import { MenuGroup, MenuGroupLabel, MenuRadioGroup, MenuRadioItem, MenuText } from "./menu";
import { usePalette } from "./palette";
import { Pill } from "./pill";
import { join } from "./utils";

// The palette's two controls (cimip-gaps-3 T9, DECISIONS 403). Both read `usePalette`. While the palette came from a link, one tertiary line says so
// and that choosing one saves it; choosing the palette already shown saves it too, so both handle the press on the checked item themselves (a radio
// does not report a second choice of its checked value). No colour dots: the word and the live change say it.

/** The words, for translation. Basalt ships no word for a palette: each palette's word is its `label` in the config. */
export interface PaletteWords {
  /** The group's name and its visible label. Default "Palette". */
  label?: string;
  /** The line shown while the palette came from a link. Default "From the link you opened. Choose one to save it." */
  fromLink?: string;
}

const wordsOf = (words?: PaletteWords) => ({ label: "Palette", fromLink: "From the link you opened. Choose one to save it.", ...words });

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

export interface PaletteChoiceControlProps extends Omit<React.ComponentProps<"div">, "children" | "onChange"> {
  words?: PaletteWords;
}

/**
 * The palette choice for a footer or a settings row: `ThemeChoiceControl`'s contract word for word. Two to four palettes are words in the segmented
 * control's drawing with radio semantics (one tab stop, the arrows move and choose, Home and End), the chosen word at 600 with its width reserved, on the
 * sliding pill, right in the first frame from the root's `data-palette`. Five or more are a `Select` labelled "Palette", by count and never by viewport.
 */
export function PaletteChoiceControl({ words, className, ...props }: PaletteChoiceControlProps): React.JSX.Element {
  const text = wordsOf(words);
  const { palette, palettes, source, setPalette, ready } = usePalette();
  const label = React.useId();
  const note = React.useId();
  const group = React.useRef<HTMLDivElement>(null);
  const fromLink = source === "url";
  const line = fromLink ? <p id={note} className="basalt-palette-choice-note">{text.fromLink}</p> : null;

  if (palettes.length >= 5) {
    return (
      <div {...props} className={join("basalt-palette-choice", className)}>
        <span className="basalt-palette-choice-label" aria-hidden="true">{text.label}</span>
        <PaletteSelect name={text.label} />
        {line}
      </div>
    );
  }

  const ids = palettes.map((option) => option.id);
  const move = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const at = ids.indexOf(palette);
    let next = -1;
    if (event.key in keys) {
      const rtl = group.current ? getComputedStyle(group.current).direction === "rtl" : false;
      const step = keys[event.key]! * (rtl && (event.key === "ArrowRight" || event.key === "ArrowLeft") ? -1 : 1);
      next = (at + step + ids.length) % ids.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ids.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const value = ids[next]!;
    setPalette(value);
    group.current?.querySelector<HTMLElement>(`[data-value="${value}"]`)?.focus();
  };
  return (
    <div {...props} className={join("basalt-palette-choice", className)}>
      <span id={label} className="basalt-palette-choice-label">{text.label}</span>
      <div ref={group} role="radiogroup" aria-labelledby={label} aria-describedby={fromLink ? note : undefined} onKeyDown={move} className="basalt-segmented">
        <Pill />
        {palettes.map((option) => {
          const checked = palette === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-value={option.id}
              data-pressed={ready && checked ? "" : undefined}
              className="basalt-segment"
              // A click, Space or Enter: the checked word saves a palette a link opened.
              onClick={() => setPalette(option.id)}
            >
              <span className="basalt-palette-choice-word" data-label={option.label}>{option.label}</span>
            </button>
          );
        })}
      </div>
      {line}
    </div>
  );
}

/** Five or more palettes: a Select named "Palette". It shows the config's default (or the server's palette) until hydration, the same stated limit as the icon set's. */
function PaletteSelect({ name }: { name: string }) {
  const { palette, palettes, setPalette } = usePalette();
  return (
    <Select
      aria-label={name}
      options={palettes.map((option) => ({ value: option.id, label: option.label }))}
      value={palette}
      onValueChange={(value) => { if (value) setPalette(value); }}
    />
  );
}
