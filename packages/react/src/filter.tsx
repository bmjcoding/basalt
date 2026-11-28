import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { useFadeRef } from "./fade-port";

import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { SearchGlyph } from "./glyphs/search";
import { Button, type ButtonEdge, type ControlSize } from "./button";
import { CheckGlyph } from "./glyphs/check";
import { PlusGlyph } from "./glyphs/plus";
import { Icon } from "./icon";
import { inLevel, useFloatingLayer, usePopupLevel } from "./layers";
import { GlidePlate } from "./plate";
import type { ChangeDetails, CollisionAvoidance } from "./types";
import { markMirror } from "./mirror";
import { join } from "./utils";
import { usePortalScope } from "./palette-scope";

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
/** The checklist gains a search band from this many values: the rows are 40px and the popup caps at 360, so from ten they scroll. */
const SEARCH_FROM = 10;

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
  /**
   * The height of the chips or of the trigger: `md` (32px, the default) to `5xl` (56px), as a Button's `size`. 2xl (44) and up draw 16px text on
   * radius 8 (DECISIONS 154, D11a). The popup's rows keep their own size.
   */
  controlSize?: ControlSize;
  disabled?: boolean;
  className?: string;
}

/**
 * A filter that takes any number of its values. Up to six values (outside a toolbar) are chips, each a checkbox that shows a
 * plus when off and a check when on; seven or more, or a toolbar, are a trigger and a checklist. Clear is always mounted, in
 * place, and never moves focus: at zero it is `aria-disabled`, not `disabled`, so keyboard focus can stay on it.
 */

// The checklist stays under its trigger (or above it), never beside it: as PopoverContent does.
const KEEP_AXIS: CollisionAvoidance = { fallbackAxisSide: "none" };
export function MultiSelect({ label, options, value, defaultValue, onValueChange, toolbar = false, controlSize = "md", disabled = false, className }: MultiSelectProps) {
  const [inner, setInner] = React.useState<string[]>(defaultValue ?? []);
  const chosen = value ?? inner;
  // The order is the options', whatever order the values were chosen in.
  const ordered = options.filter((o) => chosen.includes(o.value)).map((o) => o.value);
  const set = (next: string[], details: ChangeDetails) => {
    // A disabled filter cannot be changed by any path (a row, Clear, a checklist that was open when `disabled` turned on).
    if (disabled) return;
    const sorted = options.filter((o) => next.includes(o.value)).map((o) => o.value);
    // The consumer is told first, and the filter keeps its own choice only if the change was not vetoed (as Tabs does).
    onValueChange?.(sorted, details);
    if (!details.isCanceled) setInner(sorted);
  };
  const ids = { label: React.useId(), count: React.useId() };
  const count = ordered.length === 0 ? "Any" : `${ordered.length} of ${options.length}`;
  // The count reserves the width of its widest form ("Any" or "N of N": two hidden pseudo-elements share the one grid cell with the
  // text, tabular figures), so Clear, which follows it, holds still as the count changes. They are CSS content, so no sizer text is
  // in the DOM for the group's description to read.
  const wide = `${options.length} of ${options.length}`;
  const popup = toolbar || options.length > MAX_CHIPS;
  // Clear, in the chips' head after the label, or at the checklist foot's end, hung there (DECISIONS 336).
  const clearAt = (edge?: ButtonEdge) => (
    <Button
      variant="ghost"
      size="sm"
      edge={edge}
      className="basalt-filter-clear"
      // Not `disabled`: a disabled button drops keyboard focus. At zero it is aria-disabled, activation is suppressed, and focus stays.
      // A disabled filter's Clear is aria-disabled the same way, so it cannot clear what the filter will not change.
      disabled={ordered.length === 0 || disabled}
      focusableWhenDisabled
      onClick={(event) => {
        // A real veto, as the rows have: `cancel()` leaves the choice as it was.
        let canceled = false;
        set([], { reason: "clear", event: event.nativeEvent, get isCanceled() { return canceled; }, trigger: event.currentTarget, cancel() { canceled = true; }, allowPropagation() {} });
      }}
    >
      Clear
    </Button>
  );
  if (popup) return <ChecklistFilter {...{ label, options, ordered, set, disabled, className, count, clear: clearAt("end"), controlSize, toolbar }} />;
  return (
    <div className={join("basalt-filter", className)}>
      <div className="basalt-filter-head">
        <span id={ids.label} className="basalt-filter-label">{label}</span>
        {/* Label, Clear, count (DECISIONS 336, Q1): Clear never moves as the count changes, and the count's spare room is the row's open end. */}
        {clearAt()}
        <span id={ids.count} className="basalt-filter-count" data-reserved="" data-any="Any" data-widest={wide}>
          <span className="basalt-filter-count-value">{count}</span>
        </span>
      </div>
      <BaseCheckboxGroup value={ordered} onValueChange={set} disabled={disabled} aria-labelledby={ids.label} aria-describedby={ids.count} className="basalt-filter-chips">
        {options.map((o) => (
          <BaseCheckbox.Root key={o.value} inputRef={markMirror} value={o.value} disabled={o.disabled} nativeButton render={<button type="button" />} data-size={controlSize === "md" ? undefined : controlSize} className="basalt-chip">
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

interface ChecklistRowProps {
  option: MultiSelectOption;
  checked: boolean;
  lit: boolean;
  setLit: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * One row of the checklist. It is memoised on what it draws (its option, whether it is chosen and whether it is lit), so the
 * highlight following the pointer renders the two rows that change, not every row of a long list.
 */
const ChecklistRow = /* @__PURE__ */ React.memo(function ChecklistRow({ option: o, checked, lit, setLit }: ChecklistRowProps) {
  return (
    // The rows' hidden inputs take Basalt's mirror mark (DECISIONS 167, Q9j: the council took the fix). In the open checklist popup the absolute inputs move the AA of
    // the popup's two left corners by 1 to 5 of 255 levels (each fixed input was a layer under the popup), and a long list ticks in half the time or less.
    <BaseCheckbox.Root
      inputRef={markMirror}
      value={o.value}
      disabled={o.disabled}
      render={<div />}
      nativeButton={false}
      data-highlighted={lit ? "" : undefined}
      onPointerMove={() => setLit(o.value)}
      onPointerLeave={() => setLit((now) => (now === o.value ? null : now))}
      onFocus={() => setLit(o.value)}
      onBlur={() => setLit((now) => (now === o.value ? null : now))}
      className="basalt-menu-item basalt-filter-row"
    >
      <span className="basalt-menu-check">
        <span className="basalt-checkbox" data-checked={checked ? "" : undefined} aria-hidden="true">
          <span className="basalt-checkbox-indicator" data-unchecked={checked ? undefined : ""}>
            <Icon icon={CheckGlyph} />
          </span>
        </span>
      </span>
      <span className="basalt-menu-item-label">{o.label}</span>
    </BaseCheckbox.Root>
  );
});

interface ChecklistProps {
  label: string;
  options: MultiSelectOption[];
  ordered: string[];
  set: (next: string[], details: ChangeDetails) => void;
  disabled: boolean;
  className?: string;
  count: string;
  clear: React.ReactNode;
  controlSize: ControlSize;
  toolbar: boolean;
}

/**
 * The trigger and the checklist: the same checkbox group, in a non-modal popup of popup rows. The rows scroll inside
 * `size-popup-max-height` (nine 40px rows show whole, the tenth is the first to scroll), with the foot outside them. From ten
 * values a search band sits above the rows: 40px, the next level's fill, a divider below.
 */
function ChecklistFilter({ label, options, ordered, set, disabled, className, count, clear, controlSize, toolbar }: ChecklistProps) {
  const portalScope = usePortalScope();
  const layer = useFloatingLayer();
  // A popup is its opener plus one, with a floor of 1: from the page it is level 1.
  const level = usePopupLevel();
  const ids = { label: React.useId(), count: React.useId(), rows: React.useId() };
  const [lit, setLit] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const chosen = React.useMemo(() => new Set(ordered), [ordered]);
  const names = options.filter((o) => chosen.has(o.value)).map((o) => o.label);
  const summary = names.length === 0 ? "Any" : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`;
  const rows = React.useRef<HTMLDivElement>(null);
  // The checklist fades at each edge that hides rows (cimip-gaps-3 t7); the lit row is a plate inside its row.
  const rowsRef = useFadeRef<HTMLDivElement>({ axis: "block" }, rows);
  const band = React.useRef<HTMLInputElement>(null);
  const searchable = options.length >= SEARCH_FROM;
  const needle = query.trim().toLowerCase();
  const shown = searchable && needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  const noun = label.toLowerCase();
  // The group is one tab stop per row, as the chips are; the arrow keys also move between rows, as in a popup of rows.
  // With a search band, up from the first row goes back to it, and typing on a row goes to it.
  const move = (event: React.KeyboardEvent) => {
    if (searchable && event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      band.current?.focus();
      return;
    }
    const keys: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity };
    const step = keys[event.key];
    if (step === undefined) return;
    const all = [...(rows.current?.querySelectorAll<HTMLElement>("[role=checkbox]:not([aria-disabled=true])") ?? [])];
    if (!all.length) return;
    event.preventDefault();
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (searchable && step === -1 && at <= 0) {
      band.current?.focus();
      return;
    }
    const to = Number.isFinite(step) ? Math.min(all.length - 1, Math.max(0, at + step)) : step < 0 ? 0 : all.length - 1;
    all[to]?.focus();
  };
  const bandKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      const first = rows.current?.querySelector<HTMLElement>("[role=checkbox]:not([aria-disabled=true])");
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === "Escape" && query) {
      // Esc clears the text first, and only the next one closes.
      event.preventDefault();
      event.stopPropagation();
      setQuery("");
    }
  };
  return (
    <div className={join("basalt-filter", className)} data-popup="">
      <BasePopover.Root onOpenChange={(open) => { if (!open) setQuery(""); }}>
        {/* A secondary Button's look on Base UI's popover trigger (a Button element would take the trigger's children away). */}
        <BasePopover.Trigger
          disabled={disabled}
          data-variant="secondary"
          data-size={controlSize}
          data-active={ordered.length ? "" : undefined}
          className="basalt-button basalt-filter-trigger"
        >
          <span className="basalt-button-label">
            <span className="basalt-filter-trigger-label">{label}</span>{" "}
            {toolbar ? (
              // In a toolbar the trigger holds the width of its widest value ("Any", or the longest label with the largest "+N"), unseen in the cell the value is in, so
              // choosing values moves nothing after it. A trigger in a narrow column still cuts the value with an ellipsis.
              <span className="basalt-filter-trigger-value" data-seat="">
                <span className="basalt-filter-trigger-now">{summary}</span>
                {["Any", ...options.map((o) => (options.length > 1 ? `${o.label} +${options.length - 1}` : o.label))].map((text) => <span key={text} className="basalt-filter-trigger-sizer" aria-hidden="true">{text}</span>)}
              </span>
            ) : (
              <span className="basalt-filter-trigger-value">{summary}</span>
            )}
          </span>
          <Icon icon={ChevronDownGlyph} />
        </BasePopover.Trigger>
        <BasePopover.Portal {...portalScope}>
          <BasePopover.Positioner side="bottom" align="start" sideOffset={6} collisionAvoidance={KEEP_AXIS} style={layer} className="basalt-positioner">
            <BasePopover.Popup
              data-level={level}
              aria-labelledby={ids.label}
              className="basalt-menu basalt-filter-popup"
              // The search band takes focus on opening, except on touch, where it would raise the keyboard over the list.
              initialFocus={searchable ? (type) => (type === "touch" ? false : band.current ?? true) : undefined}
            >
              <GlidePlate />
              <span id={ids.label} className="basalt-visually-hidden">{label}</span>
              {inLevel(
                level,
                <>
                  {searchable ? (
                    <div className="basalt-filter-band" data-level={Math.min(level + 1, 3)}>
                      <Icon icon={SearchGlyph} size={16} />
                      <input
                        ref={band}
                        className="basalt-filter-band-input"
                        type="text"
                        role="searchbox"
                        aria-label={`Search ${noun}`}
                        aria-controls={ids.rows}
                        placeholder={`Search ${noun}`}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={bandKeys}
                      />
                    </div>
                  ) : null}
                  <BaseCheckboxGroup id={ids.rows} value={ordered} onValueChange={set} disabled={disabled} aria-labelledby={ids.label} aria-describedby={ids.count} onKeyDown={move} className="basalt-filter-rows" ref={rowsRef}>
                    {shown.map((o) => (
                      <ChecklistRow key={o.value} option={o} checked={chosen.has(o.value)} lit={lit === o.value} setLit={setLit} />
                    ))}
                    {shown.length === 0 ? <p className="basalt-filter-none">No {noun} matches.</p> : null}
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
