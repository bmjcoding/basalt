import * as React from "react";
import { useKeptRow, useScrollFade } from "./fade-port";

import { CheckGlyph } from "./glyphs/check";
import { Icon } from "./icon";
import { useFloatingLayer } from "./layers";
import { usePeekPlate } from "./use-peek";
import { join } from "./utils";

// ---- Listbox: one choice from a list that stays on the page ----
// Base UI's Select and Combobox are popups. This is the list itself, in the page: a single-select `listbox` that holds focus and
// points at its chosen option with `aria-activedescendant`, and whose choice follows the arrow keys (a list of records you read
// down, where moving is choosing).

interface ListboxContext {
  value: string | undefined;
  choose: (value: string) => void;
  /** An option's id: the list's, then the option's value, so `aria-activedescendant` can name the chosen one in the same render. */
  idOf: (value: string) => string;
}
const ListboxState = /* @__PURE__ */ React.createContext<ListboxContext | null>(null);

export interface ListboxProps extends Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> {
  /** Names the list. Required: it is the listbox's accessible name. */
  label: string;
  /** The chosen option's `value`. It names an option that is in the list. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The list sits flush with a clipping edge (a pane's side, a scroll box): its focus ring is drawn inside at −2, not outside at +2. */
  flush?: boolean;
}

const OPTIONS = '[role="option"]:not([aria-disabled="true"])';

/**
 * A single-select list with one tab stop. ↑ and ↓, Home and End move the choice and scroll it into view; clicking an option chooses it.
 * Options may be grouped under a label (`ListboxGroup`). The chosen option is marked by the core check in its gutter (DECISIONS 167, Q9c) and by primary ink, with a
 * plate behind it; a row's weight never changes. Focus is the control ring on the list's own box: 2px at +2 with radius 8 (DECISIONS 159, the owner,
 * on a 2 to 2 deadlock in DECISIONS 157, Q2), the list keeping 6px from a clipping edge; set `flush` where it has none, and the same ring is drawn
 * inside at −2. The rows scroll in a box inside the list, so the rounded corners clip nothing and nothing at rest differs from a square box.
 * An option whose name or detail is cut shows it whole on a plate (DECISIONS 168 and 170): see peek-plate.ts. On touch there is no hover to open one, so the options wrap at rest.
 */
export function Listbox({ label, value, defaultValue, onValueChange, flush = false, className, children, onKeyDown, ...props }: ListboxProps) {
  // The rows fade at each edge that hides more (cimip-gaps-3 t7). Focus stays on the list while the keys choose, so the chosen row is kept clear.
  const scroll = React.useRef<HTMLDivElement | null>(null);
  const fade = useScrollFade(scroll, { axis: "block" });
  useKeptRow(scroll, fade, '[role="option"][aria-selected="true"]', ["aria-selected"]);
  const [inner, setInner] = React.useState(defaultValue);
  const chosen = value !== undefined ? value : inner;
  const root = React.useRef<HTMLDivElement>(null);
  usePeekPlate(root, "listbox", { zIndex: useFloatingLayer()?.zIndex });
  const base = React.useId();
  // One id per value: the value, written so that no two values give one id (encodeURIComponent is one to one; "a b" and "a_b" shared one).
  const idOf = React.useCallback((option: string) => `${base}-${encodeURIComponent(option)}`, [base]);
  // An option given its own `id` keeps it, so the reference names the id the chosen option really carries, read once it is drawn.
  const optionOf = React.useCallback((option: string) => [...(root.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].find((o) => o.dataset.value === option), []);
  const [carried, setCarried] = React.useState<string | undefined>();
  React.useLayoutEffect(() => setCarried(chosen === undefined ? undefined : optionOf(chosen)?.id || undefined));
  const choose = React.useCallback((next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  }, [value, onValueChange]);
  // While the list holds focus with no value, it names its first enabled option, so a screen reader is told where it is (the listbox pattern).
  // Nothing is chosen and nothing is drawn: this is the attribute alone.
  const [focused, setFocused] = React.useState(false);
  const [first, setFirst] = React.useState<string | undefined>();
  React.useEffect(() => {
    if (focused && chosen === undefined) setFirst(root.current?.querySelector<HTMLElement>(OPTIONS)?.id || undefined);
  });
  // A press on an option chooses it, so it is in view already: the list does not scroll under the pointer on the way.
  const pressed = React.useRef(false);
  const context = React.useMemo(() => ({ value: chosen, choose, idOf }), [chosen, choose, idOf]);
  return (
    <ListboxState.Provider value={context}>
      <div
        {...props}
        ref={root}
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={chosen !== undefined ? (carried ?? idOf(chosen)) : focused ? first : undefined}
        data-flush={flush ? "" : undefined}
        className={join("basalt-listbox", className)}
        onPointerDown={(event) => {
          props.onPointerDown?.(event);
          pressed.current = Boolean((event.target as Element).closest?.('[role="option"]'));
        }}
        onFocus={(event) => {
          props.onFocus?.(event);
          if (event.target !== event.currentTarget) return;
          const press = pressed.current;
          pressed.current = false;
          setFocused(true);
          setFirst(root.current?.querySelector<HTMLElement>(OPTIONS)?.id || undefined);
          // The active option is brought into view when focus arrives, as a key does; one already in view does not move the list.
          if (press) return;
          const option = chosen !== undefined ? optionOf(chosen) : root.current?.querySelector<HTMLElement>(OPTIONS) ?? undefined;
        }}
        onBlur={(event) => {
          props.onBlur?.(event);
          if (event.target === event.currentTarget) setFocused(false);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          // The box that scrolls is inside the focused one, so the page keys are given to it.
          const scroller = root.current?.querySelector<HTMLElement>(".basalt-listbox-scroll");
          if ((event.key === "PageDown" || event.key === "PageUp") && scroller) {
            event.preventDefault();
            scroller.scrollBy({ top: (event.key === "PageDown" ? 1 : -1) * scroller.clientHeight * 0.9 });
            return;
          }
          const options = [...(root.current?.querySelectorAll<HTMLElement>(OPTIONS) ?? [])];
          if (!options.length) return;
          const at = options.findIndex((option) => option.getAttribute("aria-selected") === "true");
          const to = event.key === "ArrowDown" ? Math.min(options.length - 1, at + 1) : event.key === "ArrowUp" ? Math.max(0, at < 0 ? 0 : at - 1) : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : -1;
          if (to < 0) return;
          event.preventDefault();
          const option = options[to];
          if (option?.dataset.value !== undefined && option.dataset.value !== chosen) choose(option.dataset.value);
        }}
      >
        {/* The list's own box carries the focus ring and its rounded corners and clips nothing; the rows scroll in the box inside it. */}
        <div ref={scroll} className="basalt-listbox-scroll">{children}</div>
      </div>
    </ListboxState.Provider>
  );
}

export interface ListboxGroupProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The group's name, drawn as its header row: `role="group"` named by it. */
  label: string;
}

/** A labelled group of options. The header is the group's name, not an option and not a row you can choose. */
export function ListboxGroup({ label, className, children, ...props }: ListboxGroupProps) {
  const id = React.useId();
  return (
    <div {...props} role="group" aria-labelledby={id} className={join("basalt-listbox-group", className)}>
      <div id={id} className="basalt-listbox-heading">{label}</div>
      {children}
    </div>
  );
}

export interface ListboxOptionProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** What the list's value becomes when this is chosen. */
  value: string;
  /** The option's name. */
  children: React.ReactNode;
  /** A second line under the name: tertiary, one line, cut with an ellipsis. */
  detail?: React.ReactNode;
  /** At the end of the first line: a state, a part, a time. */
  trailing?: React.ReactNode;
  /** Before the name, after the gutter: a time cell (`EventTime`) for a log. Its column is the cell's own width (DECISIONS 162, B5). */
  leading?: React.ReactNode;
  disabled?: boolean;
}

/** One option. A one-line option is 24 tall, a two-line one 48, and 44 at least on a coarse pointer. */
export function ListboxOption({ value, children, detail, trailing, leading, disabled = false, className, onClick, ...props }: ListboxOptionProps) {
  const state = React.useContext(ListboxState);
  const selected = state?.value === value;
  return (
    <div
      id={state?.idOf(value)}
      {...props}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-value={value}
      data-detail={detail ? "" : undefined}
      data-leading={leading ? "" : undefined}
      className={join("basalt-listbox-option", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) state?.choose(value);
      }}
    >
      <span className="basalt-listbox-gutter" aria-hidden="true">{selected ? <Icon icon={CheckGlyph} size={16} /> : null}</span>
      {leading ? <span className="basalt-listbox-leading">{leading}</span> : null}
      <span className="basalt-listbox-name">{children}</span>
      {trailing ? <span className="basalt-listbox-trailing">{trailing}</span> : null}
      {detail ? <span className="basalt-listbox-detail">{detail}</span> : null}
    </div>
  );
}
