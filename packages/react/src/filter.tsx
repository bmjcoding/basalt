import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { CaretDownIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Button } from "./button";
import { CheckGlyph } from "./glyphs/check";
import { PlusGlyph } from "./glyphs/plus";
import { Icon } from "./icon";
import { inLevel, useFloatingLayer, usePopupLevel } from "./layers";
import { GlidePlate } from "./plate";
import type { ChangeDetails } from "./types";
import { join } from "./utils";

// ---- MultiSelect: a filter that takes any number of its values ----
//
// One rule picks the form: a pill in a track for one of many (SegmentedControl), a check without a track for any of many.
// Up to six values are independent chips; seven or more, or any use in a toolbar, are a trigger and a checklist. The
// switch reads the count and the `toolbar` prop, never the viewport, so a resize never changes the control.
//
// The semantics are checkboxes in a labelled group: Tab reaches each chip and Space toggles it. The visible "2 of 4" is the
// group's description and is not live. What is spoken is the result line (`FilterResult`), once, after the filtering settles.

/** The most values the chips hold. Seven or more are a trigger and a checklist. */
const MAX_CHIPS = 6;

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  /** What is being filtered, e.g. "Status". It names the group, so it is required. */
  label: string;
  options: MultiSelectOption[];
  /** The chosen values. None chosen means no filter: every value shows. */
  value?: string[];
  defaultValue?: string[];
  /** Called with every chosen value, in the options' order. */
  onValueChange?: (value: string[], details: ChangeDetails) => void;
  /** Use inside a toolbar: always a trigger and a checklist, however few the values. */
  toolbar?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * A filter that takes any number of its values. Up to six values (outside a toolbar) are chips, each a checkbox that shows a
 * plus when off and a check when on; seven or more, or a toolbar, are a trigger and a checklist. Clear is always mounted, in
 * place, and never moves focus: at zero it is `aria-disabled`, not `disabled`, so keyboard focus can stay on it.
 */
export function MultiSelect({ label, options, value, defaultValue, onValueChange, toolbar = false, disabled = false, className }: MultiSelectProps) {
  const [inner, setInner] = React.useState<string[]>(defaultValue ?? []);
  const chosen = value ?? inner;
  // The order is the options', whatever order the values were chosen in.
  const ordered = options.filter((o) => chosen.includes(o.value)).map((o) => o.value);
  const set = (next: string[], details: ChangeDetails) => {
    const sorted = options.filter((o) => next.includes(o.value)).map((o) => o.value);
    setInner(sorted);
    onValueChange?.(sorted, details);
  };
  const ids = { label: React.useId(), count: React.useId() };
  const count = ordered.length === 0 ? "Any" : `${ordered.length} of ${options.length}`;
  const popup = toolbar || options.length > MAX_CHIPS;
  const clear = (
    <Button
      variant="ghost"
      size="sm"
      className="basalt-filter-clear"
      // Not `disabled`: a disabled button drops keyboard focus. At zero it is aria-disabled, activation is suppressed, and focus stays.
      disabled={ordered.length === 0}
      focusableWhenDisabled
      onClick={(event) => set([], { reason: "clear", event: event.nativeEvent, isCanceled: false, trigger: event.currentTarget, cancel() {}, allowPropagation() {} })}
    >
      Clear
    </Button>
  );
  if (popup) return <ChecklistFilter {...{ label, options, ordered, set, disabled, className, count, clear }} />;
  return (
    <div className={join("basalt-filter", className)}>
      <div className="basalt-filter-head">
        <span id={ids.label} className="basalt-filter-label">{label}</span>
        <span id={ids.count} className="basalt-filter-count">{count}</span>
        {clear}
      </div>
      <BaseCheckboxGroup value={ordered} onValueChange={set} disabled={disabled} aria-labelledby={ids.label} aria-describedby={ids.count} className="basalt-filter-chips">
        {options.map((o) => (
          <BaseCheckbox.Root key={o.value} value={o.value} disabled={o.disabled} nativeButton render={<button type="button" />} className="basalt-chip">
            {/* One 16px seat on every chip, with both glyphs stacked in it: the plus and the check cross-fade, so turning a chip on moves nothing. */}
            <span className="basalt-chip-seat" aria-hidden="true">
              <Icon icon={PlusGlyph} className="basalt-chip-plus" />
              <Icon icon={CheckGlyph} className="basalt-chip-check" />
            </span>
            <span className="basalt-chip-label">{o.label}</span>
          </BaseCheckbox.Root>
        ))}
      </BaseCheckboxGroup>
    </div>
  );
}

interface ChecklistProps {
  label: string;
  options: MultiSelectOption[];
  ordered: string[];
  set: (next: string[], details: ChangeDetails) => void;
  disabled: boolean;
  className?: string;
  count: string;
  clear: React.ReactNode;
}

/** The trigger and the checklist: the same checkbox group, in a non-modal popup of popup rows. */
function ChecklistFilter({ label, options, ordered, set, disabled, className, count, clear }: ChecklistProps) {
  const layer = useFloatingLayer();
  // A popup is its opener plus one, with a floor of 1: from the page it is level 1.
  const level = usePopupLevel();
  const ids = { label: React.useId(), count: React.useId() };
  const [lit, setLit] = React.useState<string | null>(null);
  const names = options.filter((o) => ordered.includes(o.value)).map((o) => o.label);
  const summary = names.length === 0 ? "Any" : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
  const rows = React.useRef<HTMLDivElement>(null);
  // The group is one tab stop per row, as the chips are; the arrow keys also move between rows, as in a popup of rows.
  const move = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity };
    const step = keys[event.key];
    if (step === undefined) return;
    const all = [...(rows.current?.querySelectorAll<HTMLElement>("[role=checkbox]:not([aria-disabled=true])") ?? [])];
    if (!all.length) return;
    event.preventDefault();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const to = Number.isFinite(step) ? Math.min(all.length - 1, Math.max(0, at + step)) : step < 0 ? 0 : all.length - 1;
    all[to]?.focus();
  };
  return (
    <div className={join("basalt-filter", className)} data-popup="">
      <BasePopover.Root>
        {/* A secondary Button's look on Base UI's popover trigger (a Button element would take the trigger's children away). */}
        <BasePopover.Trigger
          disabled={disabled}
          data-variant="secondary"
          data-size="md"
          data-active={ordered.length ? "" : undefined}
          className="basalt-button basalt-filter-trigger"
        >
          <span className="basalt-button-label">
            <span className="basalt-filter-trigger-label">{label}</span>{" "}
            <span className="basalt-filter-trigger-value">{summary}</span>
          </span>
          <Icon icon={CaretDownIcon} />
        </BasePopover.Trigger>
        <BasePopover.Portal>
          <BasePopover.Positioner side="bottom" align="start" sideOffset={6} style={layer} className="basalt-positioner">
            <BasePopover.Popup data-level={level} aria-labelledby={ids.label} className="basalt-menu basalt-filter-popup">
              <GlidePlate />
              <span id={ids.label} className="basalt-visually-hidden">{label}</span>
              {inLevel(
                level,
                <>
                  <BaseCheckboxGroup value={ordered} onValueChange={set} aria-labelledby={ids.label} aria-describedby={ids.count} onKeyDown={move} className="basalt-filter-rows" ref={rows}>
                    {options.map((o) => (
                      <BaseCheckbox.Root
                        key={o.value}
                        value={o.value}
                        disabled={o.disabled}
                        render={<div />}
                        nativeButton={false}
                        data-highlighted={lit === o.value ? "" : undefined}
                        onPointerMove={() => setLit(o.value)}
                        onPointerLeave={() => setLit((now) => (now === o.value ? null : now))}
                        onFocus={() => setLit(o.value)}
                        onBlur={() => setLit((now) => (now === o.value ? null : now))}
                        className="basalt-menu-item basalt-filter-row"
                      >
                        <span className="basalt-menu-check">
                          <span className="basalt-checkbox" data-checked={ordered.includes(o.value) ? "" : undefined} aria-hidden="true">
                            <span className="basalt-checkbox-indicator" data-unchecked={ordered.includes(o.value) ? undefined : ""}>
                              <Icon icon={CheckGlyph} />
                            </span>
                          </span>
                        </span>
                        <span className="basalt-menu-item-label">{o.label}</span>
                      </BaseCheckbox.Root>
                    ))}
                  </BaseCheckboxGroup>
                  <div className="basalt-filter-foot">
                    <span id={ids.count} className="basalt-filter-count">{count}</span>
                    {clear}
                  </div>
                </>,
              )}
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>
      </BasePopover.Root>
    </div>
  );
}

// ---- FilterResult: the one thing a filter says aloud ----

export interface FilterResultProps extends Omit<React.ComponentProps<"p">, "children"> {
  /** The result in words, e.g. "Showing 3 of 24 runs". */
  children: string;
  /** Milliseconds the text must hold still before it is spoken. Toggling several chips in a row is one announcement. */
  delay?: number;
}

/**
 * The result of filtering, shown at once and spoken once: a polite, atomic live region outside the filter, updated after the
 * text has held still for `delay` milliseconds. Each chip speaks its own state ("checked"); this says only what it did to the
 * list. Render it once per filtered list.
 */
export function FilterResult({ children, delay = 400, className, ...props }: FilterResultProps) {
  const [spoken, setSpoken] = React.useState(children);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setSpoken(children), delay);
    return () => window.clearTimeout(timer);
  }, [children, delay]);
  return (
    <p {...props} className={join("basalt-filter-result", className)}>
      <span aria-hidden="true">{children}</span>
      <span role="status" aria-live="polite" aria-atomic="true" className="basalt-visually-hidden">{spoken}</span>
    </p>
  );
}
