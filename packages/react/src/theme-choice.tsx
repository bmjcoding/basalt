import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import * as React from "react";

import { IconButton } from "./button";
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "./menu";
import { Pill } from "./pill";
import { useTheme } from "./theme";
import type { ThemeChoice as ThemeChoiceName } from "./theme";
import { join } from "./utils";
import { useIcon } from "./icon-set";

// The theme choice (DECISIONS 146 B): three states, System, Light and Dark, where System is nothing stored. On a site it is three words in the
// segmented control's drawing in the footer, with radio semantics (one tab stop; arrows move and choose; Home and End); in an app with no footer
// it is a ghost icon button showing the theme in use, which opens a menu of the same three radio rows. The site header has no theme control. The
// chosen word is drawn by CSS from the root's `data-theme-choice` (the head script writes it, `useTheme` keeps it), so the right word is chosen in
// the first frame, before any script and before hydration; React adds the pill once it has measured.

const ORDER: readonly ThemeChoiceName[] = ["system", "light", "dark"];

/** The words of the three states, for translation. */
export interface ThemeChoiceWords {
  /** The group's name and its visible label. Default "Theme". */
  label?: string;
  system?: string;
  light?: string;
  dark?: string;
}

const defaults = { label: "Theme", system: "System", light: "Light", dark: "Dark" } as const;
const wordsOf = (words?: ThemeChoiceWords) => ({ ...defaults, ...words });

export interface ThemeChoiceControlProps extends Omit<React.ComponentProps<"div">, "children" | "onChange"> {
  /** The words, for translation. */
  words?: ThemeChoiceWords;
}

/**
 * The theme choice for a footer or a settings row: "Theme" and three words, System, Light and Dark, in the segmented control's drawing. A radio group:
 * one tab stop (the chosen word), the arrows move and choose, Home and End go to the ends. The choice is stored for the origin (`basalt-theme`;
 * System is nothing stored) and every tab follows. The chosen word is 600 in primary on the raised pill, its 600 width reserved so nothing moves.
 */
export function ThemeChoiceControl({ words, className, ...props }: ThemeChoiceControlProps) {
  const text = wordsOf(words);
  const { choice, setChoice, ready } = useTheme();
  const label = React.useId();
  const group = React.useRef<HTMLDivElement>(null);
  const move = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const at = ORDER.indexOf(choice);
    let next = -1;
    if (event.key in keys) {
      const rtl = group.current ? getComputedStyle(group.current).direction === "rtl" : false;
      const step = keys[event.key]! * (rtl && (event.key === "ArrowRight" || event.key === "ArrowLeft") ? -1 : 1);
      next = (at + step + ORDER.length) % ORDER.length;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = ORDER.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const value = ORDER[next]!;
    setChoice(value);
    group.current?.querySelector<HTMLElement>(`[data-value="${value}"]`)?.focus();
  };
  return (
    <div {...props} className={join("basalt-theme-choice", className)}>
      <span id={label} className="basalt-theme-choice-label">{text.label}</span>
      <div ref={group} role="radiogroup" aria-labelledby={label} onKeyDown={move} className="basalt-segmented">
        <Pill />
        {ORDER.map((value) => {
          const checked = choice === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-value={value}
              data-pressed={ready && checked ? "" : undefined}
              className="basalt-segment"
              onClick={() => setChoice(value)}
            >
              <span className="basalt-theme-choice-word" data-label={text[value]}>{text[value]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface ThemeMenuProps {
  /** The words, for translation. The button's name is "Theme: System" (the label, then the choice). */
  words?: ThemeChoiceWords;
  className?: string;
}

/**
 * The theme choice for an app with no footer: a ghost `IconButton` showing the theme in use (a sun or a moon), named for the choice ("Theme: System"),
 * that opens a menu of three radio rows. In a settings row use `ThemeChoiceControl`, the same three words as the footer's.
 */
export function ThemeMenu({ words, className }: ThemeMenuProps) {
  const text = wordsOf(words);
  const { theme, choice, setChoice } = useTheme();
  // The two marks are system slots an icon set may replace (cimip-gaps-3 T9).
  const sun = useIcon(SunIcon, "theme-light");
  const moon = useIcon(MoonIcon, "theme-dark");
  return (
    <Menu>
      <MenuTrigger render={<IconButton variant="ghost" icon={theme === "dark" ? moon : sun} label={`${text.label}: ${text[choice]}`} className={className} />} />
      <MenuContent align="end">
        <MenuRadioGroup aria-label={text.label} value={choice} onValueChange={(value) => setChoice(value as ThemeChoiceName)}>
          {ORDER.map((value) => <MenuRadioItem key={value} value={value} closeOnClick>{text[value]}</MenuRadioItem>)}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
