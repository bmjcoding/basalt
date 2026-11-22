// A selectable list outside a table (cimip-gaps-2, B6 item 3): a checkbox per row, an "all" box that goes mixed, a count in words and a bar of
// actions, as a table's selection has (foundations, "Selected rows"). A row is its checkbox's label, so the whole row is the target; a chosen row
// is the selected wash as a band, and its checked box carries the state.
import * as React from "react";

import { Checkbox } from "./choice";
import { Reserve } from "./reserve";
import { join } from "./utils";

interface Selection {
  values: readonly string[];
  chosen: ReadonlySet<string>;
  set: (next: string[]) => void;
}

const SelectionContext = React.createContext<Selection | null>(null);

function useSelection(part: string): Selection {
  const selection = React.useContext(SelectionContext);
  if (!selection) throw new Error(`${part} must be inside a SelectableList.`);
  return selection;
}

export interface SelectableListProps extends Omit<React.ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  /** Names the list ("People waiting", "Open requests"). */
  label: string;
  /**
   * Every value that can be chosen now, in the list's order. A row whose value is not here (one already dealt with) keeps its place with an empty
   * check seat, and a chosen value that leaves it is no longer counted.
   */
  values: readonly string[];
  /** Controlled: the chosen values. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  /** The chosen values after a press, in the list's order, holding only values that can still be chosen. */
  onValueChange?: (value: string[]) => void;
  /** A `SelectionBar`: the all box, the count and the actions. */
  bar?: React.ReactNode;
  /** Where the bar sits: above the rows (default), or under them (a list at the foot of a sheet). It sticks to that edge of its scroller. */
  barSide?: "top" | "bottom";
  /** `SelectableItem`s. */
  children: React.ReactNode;
}

/**
 * A list to choose several from, outside a table. Nothing is chosen at first unless the app says so. The bar's all box chooses every value that
 * can be chosen, or none, and is mixed while some are; the count says how many in words, once, politely. The app owns the data and the actions.
 */
export function SelectableList({ label, values, value, defaultValue, onValueChange, bar, barSide = "top", className, children, ...props }: SelectableListProps) {
  const [own, setOwn] = React.useState<readonly string[]>(defaultValue ?? []);
  const current = value ?? own;
  const chosen = React.useMemo(() => {
    const open = new Set(values);
    return new Set(current.filter((v) => open.has(v)));
  }, [current, values]);
  const set = React.useCallback(
    (next: string[]) => {
      const keep = new Set(next);
      const ordered = values.filter((v) => keep.has(v));
      if (value === undefined) setOwn(ordered);
      onValueChange?.(ordered);
    },
    [values, value, onValueChange],
  );
  const selection = React.useMemo(() => ({ values, chosen, set }), [values, chosen, set]);
  const list = (
    <ul className="basalt-selectable-items" aria-label={label}>
      {children}
    </ul>
  );
  return (
    <SelectionContext.Provider value={selection}>
      <div {...props} data-bar={bar ? barSide : undefined} className={join("basalt-selectable-list", className)}>
        {barSide === "top" ? bar : null}
        {list}
        {barSide === "bottom" ? bar : null}
      </div>
    </SelectionContext.Provider>
  );
}

export interface SelectableItemProps extends Omit<React.ComponentProps<"li">, "children"> {
  /** The value this row stands for. */
  value: string;
  /** The checkbox's name when the row's words are long ("Choose Ada Byrne"). By default the name is the row's words. */
  label?: string;
  /** The row's words: the row is the checkbox's label, so a press anywhere on it chooses it. */
  children: React.ReactNode;
}

/**
 * One row: a checkbox and the row's words, the whole row its label. Chosen, it takes the selected wash as a band and its box is checked. A row
 * whose value is no longer in the list's `values` keeps its box with an empty check seat, so nothing moves when a row is dealt with.
 */
export function SelectableItem({ value, label, children, className, ...props }: SelectableItemProps) {
  const selection = useSelection("SelectableItem");
  const open = selection.values.includes(value);
  const on = open && selection.chosen.has(value);
  return (
    <li {...props} data-selected={on ? "" : undefined} data-done={open ? undefined : ""} className={join("basalt-selectable-item", className)}>
      {open ? (
        <Checkbox
          checked={on}
          aria-label={label}
          onCheckedChange={(checked) => selection.set(checked ? [...selection.chosen, value] : [...selection.chosen].filter((v) => v !== value))}
        >
          <span className="basalt-selectable-words">{children}</span>
        </Checkbox>
      ) : (
        <span className="basalt-choice">
          <span className="basalt-selectable-seat" aria-hidden="true" />
          <span className="basalt-choice-label"><span className="basalt-selectable-words">{children}</span></span>
        </span>
      )}
    </li>
  );
}

export interface SelectionBarProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The all box's words: what it chooses ("All waiting"). Default "Select all". */
  allLabel?: React.ReactNode;
  /** The count in words. Default "3 of 12 selected"; pass the app's own ("3 of 12 chosen"). Its room is held for the widest count, so it never moves the actions. */
  count?: (chosen: number, total: number) => string;
  /** The actions on what is chosen. Keep them mounted at zero, disabled in place with `focusableWhenDisabled`, so focus stays. */
  children?: React.ReactNode;
}

const DEFAULT_COUNT = (chosen: number, total: number) => `${chosen} of ${total} selected`;

/**
 * The band at the list's edge: the all box (checked when every row is chosen, mixed when some are, disabled when none can be), the count in words in
 * a polite status line, then the actions at the end. It sticks to its edge of the scroller, opaque in its surface's colour, on a divider.
 */
export function SelectionBar({ allLabel = "Select all", count = DEFAULT_COUNT, className, children, ...props }: SelectionBarProps) {
  const selection = useSelection("SelectionBar");
  const total = selection.values.length;
  const n = selection.chosen.size;
  const all = total > 0 && n === total;
  return (
    <div {...props} className={join("basalt-selection-bar", className)}>
      <Checkbox checked={all} indeterminate={n > 0 && !all} disabled={total === 0} onCheckedChange={(checked) => selection.set(checked ? [...selection.values] : [])}>
        {allLabel}
      </Checkbox>
      <span className="basalt-selection-count" role="status">
        <Reserve show="now" alternatives={{ now: count(n, total), widest: count(total, total) }} />
      </span>
      {children !== undefined ? <span className="basalt-selection-actions">{children}</span> : null}
    </div>
  );
}
