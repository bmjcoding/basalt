import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import * as React from "react";

import { DotSep } from "./dot-sep";
import { CheckGlyph } from "./glyphs/check";
import { useFieldsetDisabled } from "./fieldset-context";
import { Icon } from "./icon";
import type { ChangeDetails, PartProps } from "./types";
import { markMirror } from "./mirror";
import { withClass } from "./utils";

export interface OptionChip {
  value: string;
  label: string;
  /**
   * Set it for a value that cannot be chosen now, with the words that say why ("sold out at the brand"). The chip takes the disabled
   * look and keeps its words, and stays reachable by keyboard (it is `aria-disabled`, not `disabled`, so the arrow keys still land on it) so a
   * screen-reader user hears why. It cannot be chosen by a click, by Space or by an arrow key landing on it.
   */
  unavailable?: string;
  /**
   * How many this value holds, drawn after the label in tertiary figures (cimip-gaps-3 t4, item 7). Zero is a value and is drawn, and it disables nothing;
   * an unavailable chip still draws the count it is given. Every counted chip holds the group's widest figure (`countSeat`), so a count that changes moves no chip.
   */
  count?: number;
}

export interface OptionChipsProps extends PartProps<"fieldset", "defaultValue" | "value" | "onChange" | "children" | "name"> {
  /** Names the group, as a visible legend: what is being chosen ("Flavour"). */
  legend: string;
  /** Eight values at most: above that, a `Select` (the chips would wrap to a wall). */
  options: readonly OptionChip[];
  /** The chosen value; `null` when none is chosen yet. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string, details: ChangeDetails) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** Show how many values there are after the legend, small and tertiary (hidden from assistive technology). Default true. */
  count?: boolean;
  /** The largest count a chip may show: its figures are every counted chip's seat. Default: the largest `count` given. */
  countSeat?: number;
  /** What is said for a chip's count ("18 jobs"), after its label. Default: the figure. */
  countLabel?: (count: number) => string;
}

let figures: Intl.NumberFormat | undefined;
/** A count as it is drawn: en-US grouping. Built on first use, so loading the module does nothing. */
const figure = (n: number) => (figures ??= new Intl.NumberFormat("en-US")).format(n);

/**
 * Base UI's arrow-key order skips an `aria-disabled` radio, and an unavailable chip must be reached (so its words are heard). The arrow keys are
 * taken here instead, in the capture phase: focus moves to the next chip in the order the chips are drawn, wrapping, and an available chip is also
 * chosen (a radio group's rule) while an unavailable one is only focused.
 */
function arrowKeys(event: React.KeyboardEvent<HTMLElement>) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: -Infinity, End: Infinity };
  const step = keys[event.key];
  if (step === undefined || event.altKey || event.ctrlKey || event.metaKey) return;
  const group = event.currentTarget;
  const chips = [...group.querySelectorAll<HTMLElement>("[role=radio]:not([data-disabled])")];
  const at = chips.indexOf(event.target as HTMLElement);
  if (at < 0) return;
  const rtl = getComputedStyle(group).direction === "rtl" && (event.key === "ArrowLeft" || event.key === "ArrowRight");
  const to = Number.isFinite(step) ? (at + (rtl ? -step : step) + chips.length) % chips.length : step < 0 ? 0 : chips.length - 1;
  event.preventDefault();
  event.stopPropagation();
  const next = chips[to];
  next?.focus();
  if (next && !next.hasAttribute("data-unavailable")) next.click();
}

/**
 * One of many (eight at most) as chips that wrap (DECISIONS 154, D9): radios with no track. A chip is 44px, radius 8, with a round 16px
 * seat that every chip reserves; the chosen chip is the selected wash in primary ink with a check in its seat, and its edge does not change.
 * It is a fieldset with a legend, one tab stop and the arrow keys, as a radio group is. A value that cannot be chosen takes `unavailable`.
 */
export function OptionChips({ legend, options, value, defaultValue, onValueChange, name, disabled = false, required, count = true, countSeat, countLabel, className, ...props }: OptionChipsProps) {
  const fieldsetDisabled = useFieldsetDisabled();
  const legendId = React.useId();
  const counts = options.flatMap((option) => (option.count === undefined ? [] : [option.count]));
  // The seat's figures: the widest drawn form among the largest given (or `countSeat`) and every count, since a minus sign or a grouping comma is a character too.
  const seat = counts.length ? [countSeat ?? Math.max(...counts), ...counts].map(figure).reduce((a, b) => (b.length > a.length ? b : a)) : "";
  return (
    <BaseRadioGroup
      {...(props as object)}
      onKeyDownCapture={arrowKeys}
      render={<fieldset />}
      aria-labelledby={legendId}
      name={name}
      required={required}
      disabled={disabled || fieldsetDisabled}
      value={value as string | undefined}
      defaultValue={defaultValue as string | undefined}
      onValueChange={onValueChange as ((value: string, details: ChangeDetails) => void) | undefined}
      className={withClass("basalt-option-chips", className)}
    >
      <legend id={legendId} className="basalt-fieldset-legend basalt-option-chips-legend">
        {legend}
        {count ? <span className="basalt-option-chips-count" aria-hidden="true">{options.length}</span> : null}
      </legend>
      <div className="basalt-option-chips-list">
        {options.map((option) => (
          <BaseRadio.Root
            key={option.value}
            inputRef={markMirror}
            value={option.value}
            // Unavailable is not disabled: it stays reachable so its words are heard, and read-only so nothing chooses it.
            readOnly={option.unavailable ? true : undefined}
            aria-disabled={option.unavailable ? true : undefined}
            data-unavailable={option.unavailable ? "" : undefined}
            className="basalt-option-chip"
          >
            <span className="basalt-option-chip-seat" aria-hidden="true"><Icon icon={CheckGlyph} /></span>
            <span className="basalt-option-chip-label">{option.label}</span>
            {option.count !== undefined ? (
              <>
                <span className="basalt-visually-hidden">{`, ${countLabel ? countLabel(option.count) : figure(option.count)}`}</span>
                <span className="basalt-option-chip-figure" aria-hidden="true">
                  <span>{figure(option.count)}</span>
                  <span className="basalt-option-chip-figure-seat">{seat}</span>
                </span>
              </>
            ) : null}
            {option.unavailable ? (
              <span className="basalt-option-chip-note">
                <DotSep spaced />
                {option.unavailable}
              </span>
            ) : null}
          </BaseRadio.Root>
        ))}
      </div>
    </BaseRadioGroup>
  );
}
