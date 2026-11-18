import * as React from "react";

import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { Icon } from "./icon";
import { Kbd } from "./kbd";
import { join } from "./utils";

// ---- OpenList: rows that open ----
// A table of things you open (work, a record, a page). Each row's name is a button stretched over the whole row, and one row is the
// cursor and holds the list's one tab stop. It is not a listbox: nothing is chosen, and Enter opens.

interface OpenListContext {
  cursor: string | undefined;
  setCursor: (id: string) => void;
}
const OpenListState = React.createContext<OpenListContext | null>(null);

export interface OpenListProps extends React.ComponentProps<"div"> {
  /** Names the list as a group ("Work"). */
  label: string;
}

const ROWS = "[data-open-row]:not([data-off])";

/**
 * A list of rows that open, one cursor row with the tab stop. ↓ or j and ↑ or k move it, Home or g to the first row, End or G to the last,
 * and Enter on the row opens it. The cursor skips rows `off` filtering left in place. Say how many match with a `FilterResult` outside the
 * list: the list does not count, speak or highlight.
 */
export function OpenList({ label, className, children, onKeyDown, ...props }: OpenListProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = React.useState<string | undefined>();
  // The cursor is always a row that is on: after a filter turns it off, or on the first render, it goes to the first row that is on.
  React.useEffect(() => {
    const rows = [...(root.current?.querySelectorAll<HTMLElement>(ROWS) ?? [])];
    if (rows.length && !rows.some((row) => row.dataset.openRow === cursor)) setCursor(rows[0]?.dataset.openRow);
  });
  const context = React.useMemo(() => ({ cursor, setCursor }), [cursor]);
  return (
    <OpenListState.Provider value={context}>
      <div
        {...props}
        ref={root}
        role="group"
        aria-label={label}
        className={join("basalt-open-list", className)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          const target = event.target as HTMLElement;
          if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !target.matches?.("[data-open-button]")) return;
          const buttons = [...(root.current?.querySelectorAll<HTMLElement>(`${ROWS} [data-open-button]`) ?? [])];
          if (!buttons.length) return;
          const at = buttons.indexOf(target);
          const key = event.key;
          const to = key === "ArrowDown" || key === "j" ? Math.min(buttons.length - 1, at + 1) : key === "ArrowUp" || key === "k" ? Math.max(0, at - 1) : key === "Home" || key === "g" ? 0 : key === "End" || key === "G" ? buttons.length - 1 : -1;
          if (to < 0) return;
          event.preventDefault();
          buttons[to]?.focus();
        }}
      >
        {children}
      </div>
    </OpenListState.Provider>
  );
}

export interface OpenListGroupProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The group's label, drawn as a heading above its rows. */
  label: string;
  /** Heading level (3 by default). */
  level?: 2 | 3 | 4;
}

/** A labelled group of rows: a named `group`, not a landmark (the list around it is already the named group). */
export function OpenListGroup({ label, level = 3, className, children, ...props }: OpenListGroupProps) {
  const id = React.useId();
  const Heading = `h${level}` as const;
  return (
    <div {...props} role="group" aria-labelledby={id} className={join("basalt-open-list-group", className)}>
      <Heading id={id} className="basalt-open-list-label">{label}</Heading>
      <ul className="basalt-open-list-rows">{children}</ul>
    </div>
  );
}

export interface OpenListRowProps extends Omit<React.ComponentProps<"li">, "id" | "children" | "onClick" | "part"> {
  /** Names the row for the cursor. Unique in the list. */
  id: string;
  /** The row's name: its button's text. */
  name: React.ReactNode;
  /** Runs when the row opens (a press or Enter). */
  onOpen: () => void;
  /** What it opens into, in a word ("record", "page"): drawn at the row's end, and added to the button's name ("opens its record"). */
  opens?: string;
  /** Cells after the name, aligned across the list: a kind, a state. */
  part?: React.ReactNode;
  state?: React.ReactNode;
  /** A second line under the name. The row is two lines tall (48) with one. */
  detail?: React.ReactNode;
  /**
   * Filtering left this row in place, and it does not match: it is unavailable to every input (DECISIONS 168). `aria-disabled`, a press does
   * not open it, the cursor skips it, its name takes the disabled ink and its cells and second line are hidden, and it has no hover step and
   * shows a `not-allowed` cursor. Nothing moves.
   */
  off?: boolean;
}

/**
 * One row. The name is a button stretched over the row; the cursor row shows a chevron in its gutter, a `↵` chip (one drawn per list, hidden
 * from assistive technology and from a touch screen with no keyboard) and says what Enter does. Every row holds the chevron's and the chip's
 * seats, so the cursor moving never moves a column.
 */
export function OpenListRow({ id, name, onOpen, opens, part, state, detail, off = false, className, ...props }: OpenListRowProps) {
  const list = React.useContext(OpenListState);
  const cursor = list?.cursor === id && !off;
  return (
    <li {...props} data-open-row={id} data-off={off ? "" : undefined} data-cursor={cursor ? "" : undefined} data-detail={detail ? "" : undefined} className={join("basalt-open-row", className)}>
      <span className="basalt-open-gutter" aria-hidden="true">{cursor ? <Icon icon={ChevronRightGlyph} size={16} /> : null}</span>
      <span className="basalt-open-name">
        <button
          type="button"
          data-open-button=""
          className="basalt-open-button"
          tabIndex={cursor ? 0 : -1}
          aria-keyshortcuts={cursor ? "Enter" : undefined}
          aria-disabled={off ? true : undefined}
          onFocus={() => list?.setCursor(id)}
          onClick={off ? undefined : onOpen}
        >
          {name}
          {opens ? <span className="basalt-visually-hidden">: opens its {opens}</span> : null}
        </button>
      </span>
      <span className="basalt-open-part">{part}</span>
      <span className="basalt-open-state">{state}</span>
      <span className="basalt-open-into" aria-hidden="true">
        {/* Every row holds the chip's seat, so the cursor moving (or filtering moving it) changes no column; only the cursor's is drawn. */}
        <Kbd shortcut>↵</Kbd>
        {opens ? <span>{opens}</span> : null}
        <Icon icon={ChevronRightGlyph} size={16} />
      </span>
      {detail ? <span className="basalt-open-detail">{detail}</span> : null}
    </li>
  );
}
