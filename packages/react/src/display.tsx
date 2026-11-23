import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { CaretUpDownIcon } from "@phosphor-icons/react/dist/csr/CaretUpDown";
import * as React from "react";

import { ArrowDownGlyph } from "./glyphs/arrow-down";
import { ArrowUpGlyph } from "./glyphs/arrow-up";
import { CheckGlyph } from "./glyphs/check";
import { Icon } from "./icon";
import { Kbd } from "./kbd";
import { useCellPeek } from "./cell-peek";
import { inLevel, useFloatingLayer, usePanelLevel } from "./layers";
import { useApplePlatform } from "./keyboard";
import { ariaShortcut, shortcutKeys, spokenShortcut } from "./shortcut";
import { StatusSizeContext } from "./status-size";
import type { StatusSize } from "./status-size";
import type { Side } from "./types";
import { join } from "./utils";

export { Kbd } from "./kbd";

// ---- Badge ----

/**
 * `accent` paints the dot in the product's accent class (`data-accent` on its root; see foundations), and nothing else: the word stays ink.
 * With no class, or none, it is an ink dot. Use it only for the product's council-approved accent role.
 * `pending` is waiting (or in review, or queued): a hollow ring in the word's own ink, in the dot's seat, with no colour.
 * The app's word says what is pending.
 */
export type BadgeStatus = "neutral" | "success" | "warning" | "danger" | "accent" | "pending";

export type BadgeProps = React.ComponentProps<"span"> & {
  /**
   * A status dot before the label. The label always says the status in words; the dot never carries it alone. With no status the badge is the
   * word alone (a count, a fact). `"neutral"` asked for by name draws the tertiary dot (Idle, Draft). A running badge is a plain badge whose first
   * child is a braille `Spinner`, which takes the dot's seat, so it draws no dot.
   */
  status?: BadgeStatus;
} & (
    | {
        /**
         * `outline` (default): a small hairline label. `plain`: dot and text only, for places a
         * status repeats down a column, such as table cells, where a pill on every row is noise.
         */
        variant?: "outline";
        size?: never;
      }
    | {
        variant: "plain";
        /**
         * The size of the mark's seat, which follows its word's cap height: 16 beside text of 12 to 16px (the default, and what
         * shipped), 20 beside 18 to 24px, 24 beside 30px and up. The seat is the braille cell's width (6, 9 or 12) and the gap
         * after it is as wide, so words start at 12, 18 and 24 whichever mark is in the seat. The 6px dot centres in the seat on
         * whole pixels. A running status is a plain badge whose first child is a braille `Spinner`, which takes this size.
         */
        size?: StatusSize;
      }
  );

/** A small label, e.g. a deployment state. Neutral; colour only in the dot. */
export function Badge({ status, variant = "outline", size, className, children, ...props }: BadgeProps) {
  const plain = variant === "plain";
  const badge = (
    <span {...props} data-status={status} data-variant={variant} data-size={plain ? size ?? 16 : undefined} className={join("basalt-badge", className)}>
      {status === undefined ? null : <span className="basalt-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
  return plain ? <StatusSizeContext.Provider value={size ?? 16}>{badge}</StatusSizeContext.Provider> : badge;
}

export interface BadgePairProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The object's name. It keeps its line; it truncates only when it alone is wider than the row. */
  name: React.ReactNode;
  /** The one status, right after the name. A `Badge` with a `status`. Never two statuses on one object. */
  status?: React.ReactElement<BadgeProps>;
  /** One neutral fact after the status: an environment, a plan, "Demo". A third fact goes in words. */
  fact?: React.ReactElement<BadgeProps>;
}

/**
 * A name with at most two badges: the status first, then one neutral fact, `space-2` apart and `space-2` after the name. When
 * the name and the pair don't fit on one line the pair moves under the name as a unit. A badge never truncates. Spoken in
 * DOM order: the name, the status, the fact.
 */
export function BadgePair({ name, status, fact, className, ...props }: BadgePairProps) {
  return (
    <div {...props} className={join("basalt-badge-pair", className)}>
      <span className="basalt-badge-pair-name">{name}</span>
      {status || fact ? <span className="basalt-badge-pair-badges">{status}{fact}</span> : null}
    </div>
  );
}

// ---- Card ----

export function Card({ className, children, ...props }: React.ComponentProps<"div">) {
  // A panel is one level above what it sits in (the page is 0), and 3 is the cap.
  const level = usePanelLevel();
  return <div {...props} data-level={level} className={join("basalt-card", className)}>{inLevel(level, children)}</div>;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-card-header", className)} />;
}

export interface CardTitleProps extends React.ComponentProps<"h3"> {
  /** The title's heading level in the page outline, 3 by default; its size stays the same at every level. */
  level?: 2 | 3 | 4 | 5 | 6;
}

export function CardTitle({ level = 3, className, ...props }: CardTitleProps): React.JSX.Element {
  return React.createElement(`h${level}`, { ...props, className: join("basalt-card-title", className) });
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p {...props} className={join("basalt-card-description", className)} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-card-content", className)} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-card-footer", className)} />;
}

export interface ChoiceCardProps extends Omit<React.ComponentProps<"input">, "type" | "title" | "children" | "size" | "onChange"> {
  /** Any of many (a checkbox) when set; one of many (a radio) otherwise. Radios sharing a `name` are one group. */
  multiple?: boolean;
  /** The card's name. It sits on the header line, with the box inline-end of it. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The rest of the card. */
  children?: React.ReactNode;
  /** Called with the new checked state. For a radio it is called when this card becomes the choice. */
  onCheckedChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Goes on the card (the `label`), not the input. */
  className?: string;
}

/**
 * A card you can choose: a native radio or checkbox wearing a card. The whole card is the label, the input is visually
 * hidden and focusable, and a real choice box sits in a seat on the header line that is reserved on every choice card, so
 * choosing moves no title. Selected is the selected wash as one solid fill at the card's own level, with the rim and level
 * unchanged. Plain `Card` takes no selected prop. Put the cards of one choice in a `ChoiceCardGroup`.
 */
export function ChoiceCard({ multiple = false, title, description, children, onCheckedChange, className, ...props }: ChoiceCardProps) {
  const level = usePanelLevel();
  const id = React.useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  return (
    <label data-level={level} data-type={multiple ? "checkbox" : "radio"} className={join("basalt-card basalt-choice-card", className)}>
      <input
        {...props}
        type={multiple ? "checkbox" : "radio"}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="basalt-choice-card-input"
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked, event)}
      />
      <span className="basalt-choice-card-head">
        <span id={titleId} className="basalt-card-title basalt-choice-card-title">{title}</span>
        <span className="basalt-choice-card-box" aria-hidden="true">
          {multiple ? <Icon icon={CheckGlyph} size={16} className="basalt-choice-card-mark" /> : <span className="basalt-choice-card-dot" />}
        </span>
      </span>
      {description ? <span id={descriptionId} className="basalt-card-description basalt-choice-card-description">{description}</span> : null}
      {children ? <span className="basalt-choice-card-body">{inLevel(level, children)}</span> : null}
    </label>
  );
}

export interface ChoiceCardGroupProps extends React.ComponentProps<"div"> {
  /** Any of many (`group`) when set; one of many (`radiogroup`) otherwise. Name it with `aria-label` or `aria-labelledby`. */
  multiple?: boolean;
}

/** The cards of one choice, in a grid with `space-4` between them, which keeps each one's focus ring clear of its neighbours. */
export function ChoiceCardGroup({ multiple = false, className, ...props }: ChoiceCardGroupProps) {
  return <div {...props} role={multiple ? "group" : "radiogroup"} className={join("basalt-choice-card-group", className)} />;
}

// ---- Table ----

export type TableDensity = "compact" | "default" | "comfortable";

/**
 * The direction a sorted column runs. A column is sorted one way or the other, or it is not the sorted one; when no column is, the
 * table is in its own order (the order the app loaded it in) and no header is lit.
 */
export type SortDirection = "ascending" | "descending";

export interface TableContainerProps extends React.ComponentProps<"div"> {
  density?: TableDensity;
  /**
   * The name of the table's scroll region ("Runs table"): what a screen reader says when the container takes focus. While
   * the table is wider than its box the container is a keyboard stop (`tabindex="0"`) with `role="region"` and this name,
   * and shows the focus ring, so someone with no pointer can scroll it sideways. An `aria-label` or `aria-labelledby` of
   * your own works the same way. With none of the three the stop is named by the table's `caption`, and with no caption
   * "Scrollable table" (a region with no name is not a landmark, and a stop with no name is a div to a screen reader), so
   * give every table a name of its own. A table that fits is none of this.
   */
  label?: string;
  /**
   * The flat form (DECISIONS 162, D18b): the frame draws no border, radius, fill or shadow, so a panel that holds the table (a `Card`) has one
   * box and not two. It adds no level of its own: the table sits at the card's. The header band keeps its fill. Put it in a `Card`; on the
   * page it would be a table with no frame at all.
   */
  flat?: boolean;
}

/**
 * A data table's frame: rounded, bordered, scrolling sideways when it must. `density` sets
 * the row height: 32px for logs, 40px by default, 44px for touch. While the table is scrolled sideways it marks itself
 * (`data-scrolled`), which is what shows the divider beside a pinned column. While the table overflows, the frame is a
 * named keyboard stop (see `label`).
 */
export function TableContainer({ density = "default", label, flat = false, className, children, ref, ...props }: TableContainerProps) {
  // Its own attribute: `data-density` would also reset the size of every control in the table.
  const level = usePanelLevel();
  const node = React.useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = React.useState(false);
  const [caption, setCaption] = React.useState("");
  React.useEffect(() => {
    const frame = node.current;
    if (!frame) return undefined;
    // Set from the DOM, not React state: a scroll must not re-render the table.
    const mark = () => frame.toggleAttribute("data-scrolled", Math.abs(frame.scrollLeft) > 0);
    mark();
    frame.addEventListener("scroll", mark, { passive: true });
    return () => frame.removeEventListener("scroll", mark);
  }, []);
  React.useLayoutEffect(() => {
    // A box that scrolls sideways must be reachable from the keyboard (WCAG 2.1.1): Safari adds no stop of its own, and
    // Chromium's has no name and its own ring. Measured from the box and its table, so a resize or a new column counts.
    const frame = node.current;
    if (!frame) return undefined;
    const measure = () => { setOverflows(frame.scrollWidth > frame.clientWidth); setCaption(frame.querySelector("caption")?.textContent?.trim() ?? ""); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    const table = frame.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, []);
  const setRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = element;
    },
    [ref],
  );
  const named = Boolean(label || props["aria-label"] || props["aria-labelledby"]);
  // The stop always has a role and a name: the app's own, else the table's caption, else a default (WCAG 4.1.2).
  const region = overflows ? { tabIndex: 0, role: "region", "aria-label": label || (named ? undefined : caption || "Scrollable table") } : {};
  // The flat form is no box, so it is no level: what it holds keeps the card's, and the card's fill reaches the pinned cells.
  if (flat) return <div {...region} {...props} ref={setRef} data-row-density={density} data-flat="" className={join("basalt-table-container", className)}>{children}</div>;
  return <div {...region} {...props} ref={setRef} data-row-density={density} data-level={level} className={join("basalt-table-container", className)}>{inLevel(level, children)}</div>;
}

/** One column of a still table. A width is a number of pixels or a CSS length; the one column without a width takes the rest. */
export interface TableColumn {
  width?: number | string;
}

export interface TableProps extends React.ComponentProps<"table"> {
  /**
   * Makes the table still: `table-layout: fixed`, with a `colgroup` written from these columns. Every column has a width
   * except one, which takes the rest, so no sort, filter, page or load can move a column. Without it the table lays out
   * from its content, as before.
   */
  columns?: TableColumn[];
  /** The width below which the container scrolls sideways instead of squeezing the columns. Larger than the columns' widths together. */
  minWidth?: number | string;
  /**
   * How many leading columns stay put while the table scrolls sideways: 1 to 3. Needs `columns`, and those columns need
   * widths in pixels or a length `calc()` can add. The name column; the select column and the name when there is one.
   */
  pinned?: 1 | 2 | 3;
}

const length = (value: number | string) => (typeof value === "number" ? `${value}px` : value);

export function Table({ columns, minWidth, pinned, className, style, children, ref, ...props }: TableProps) {
  const fixed = columns !== undefined;
  const vars: Record<string, string> = {};
  if (fixed && pinned) {
    // Where each pinned column sticks, and how far the pinned columns reach: a focused cell scrolls clear of them. The
    // column without a width takes the rest, and a pinned table is only ever scrolled at its minimum width, so its width
    // there is the minimum less the others'.
    const others = columns.flatMap((column) => (column.width === undefined ? [] : [length(column.width)]));
    const rest = minWidth === undefined ? "0px" : `calc(${length(minWidth)} - (${others.join(" + ") || "0px"}))`;
    const widths = columns.slice(0, pinned).map((column) => (column.width === undefined ? rest : length(column.width)));
    for (let i = 1; i <= pinned; i += 1) {
      const reach = widths.slice(0, i).join(" + ");
      vars[i === pinned ? "--_pin-end" : `--_pin-${i}`] = `calc(${reach})`;
    }
  }
  const reach = vars["--_pin-end"];
  const node = React.useRef<HTMLTableElement | null>(null);
  React.useLayoutEffect(() => {
    // A header or action focused from the keyboard scrolls clear of the pinned columns, not under them. The scroll container's scroll-padding
    // does it for a cell that is out of view (the table cannot reach its ancestor from CSS, so it is written there). A
    // cell that is only half under the pinned columns counts as in view to the browser, so the focus handler finishes the
    // job: it measures the real edge of the last pinned cell and scrolls the container by what is covered.
    const table = node.current;
    const frame = table?.closest<HTMLElement>(".basalt-table-container");
    if (!table || !frame || !pinned) return undefined;
    if (reach) frame.style.scrollPaddingInlineStart = reach;
    const reveal = (event: FocusEvent) => {
      // Keyboard focus only (DECISIONS 261). A tap focuses before it clicks, so a scroll on that focus could carry what was under the
      // finger away and the click would land on something else; the rule exists for someone moving by keys.
      if (!(event.target as Element | null)?.matches?.(":focus-visible")) return;
      const cell = (event.target as Element | null)?.closest("td, th");
      const row = cell?.parentElement;
      if (!cell || !row || row.hasAttribute("data-empty") || [...row.children].indexOf(cell) < pinned) return;
      const edge = row.children[pinned - 1]?.getBoundingClientRect();
      const box = cell.getBoundingClientRect();
      if (!edge) return;
      // In the container's inline direction: what the pinned columns cover at the start, and what hangs past the end. The
      // browser leaves a cell alone while any of it is in view, so both are finished here; the start wins when the cell is
      // wider than what is left.
      const dir = getComputedStyle(frame).direction === "rtl" ? -1 : 1;
      const port = frame.getBoundingClientRect();
      const covered = dir === 1 ? edge.right - box.left : box.right - edge.left;
      const past = dir === 1 ? box.right - (port.left + frame.clientLeft + frame.clientWidth) : port.left + frame.clientLeft - box.left;
      if (covered > 0) frame.scrollLeft -= dir * covered;
      else if (past > 0) frame.scrollLeft += dir * Math.min(past, -covered);
    };
    frame.addEventListener("focusin", reveal);
    return () => {
      frame.removeEventListener("focusin", reveal);
      frame.style.removeProperty("scroll-padding-inline-start");
    };
  }, [reach, pinned]);
  const setRef = React.useCallback(
    (element: HTMLTableElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as React.MutableRefObject<HTMLTableElement | null>).current = element;
    },
    [ref],
  );
  // A cut cell is a stop and opens its whole value in place (see cell-peek.ts). Its plate floats above a modal the table sits in.
  useCellPeek(node, fixed, useFloatingLayer()?.zIndex);
  const merged = { ...(minWidth === undefined ? null : { minWidth: length(minWidth) }), ...vars, ...style } as React.CSSProperties;
  return (
    <table {...props} ref={setRef} data-fixed={fixed ? "" : undefined} data-pinned={fixed ? pinned : undefined} style={merged} className={join("basalt-table", className)}>
      {fixed ? (
        <colgroup>
          {columns.map((column, i) => (
            <col key={i} style={column.width === undefined ? undefined : { width: length(column.width) }} />
          ))}
        </colgroup>
      ) : null}
      {children}
    </table>
  );
}

export function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead {...props} />;
}

export function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

type TableRowProps = React.ComponentProps<"tr"> & { selected?: boolean };

/**
 * A body or header row. It is memoised, so an app that keeps a row's props and children the same between renders re-renders only
 * the row that changed (one tick in a table of a thousand rows renders one row, not a thousand). Props that are new objects every
 * render (an inline `style`, a new `children` element) defeat it, as for any memoised component.
 */
export const TableRow: React.NamedExoticComponent<TableRowProps> = /* @__PURE__ */ React.memo(function TableRow({ selected, ...props }: TableRowProps) {
  return <tr {...props} aria-selected={selected} data-selected={selected ? "" : undefined} />;
});

export interface TableHeadProps extends Omit<React.ComponentProps<"th">, "onClick"> {
  numeric?: boolean;
  /** Which way this column is sorted, when it is the sorted one. Leave it unset on every other column, and on every column while the table is in its own order. */
  sort?: SortDirection;
  /**
   * Makes the header sortable: the whole cell is the button. Called with what a press asks for, in three states (DECISIONS 261): the
   * column's first direction, then the reverse, then `undefined`, which is the table's own order with no column lit. Text starts
   * ascending; a numeric column, or a `firstSort="descending"` column, descending. Sort from the table's own order every time, never from
   * the order on screen, so ties keep it and the third press gives the loaded order back row for row: `sortRows` does exactly that.
   */
  onSortChange?: (next: SortDirection | undefined) => void;
  /** The direction a first press asks for. Text starts ascending, a `numeric` column descending; set it to descending for a time. */
  firstSort?: SortDirection;
  /**
   * A `TableHeadExplainer` for a column a reader could misread without one (a term of art, a coined name, a measurement whose method
   * changes the reading). A sortable header opens it from its sort button; a header that does not sort becomes a focus stop of its own
   * (`tabindex="0"`, the −2 inset ring of the still table's other stops) described by the explainer's words. A table without explainers
   * loads none of its code.
   */
  explainer?: React.ReactNode;
}

/**
 * The header of one column. Sortable when `onSortChange` is set: it then reserves the indicator's seat after the label, so a sort
 * moves no column. In a numeric (end-aligned) column the label rests on the numbers' edge and moves aside, by a transform, while the
 * indicator shows.
 */
export function TableHead({ numeric, sort, onSortChange, firstSort, explainer, className, children, ...props }: TableHeadProps) {
  if (!onSortChange) return <th scope="col" {...props} aria-sort={sort} data-numeric={numeric ? "" : undefined} className={className}>{children}{explainer}</th>;
  const first: SortDirection = firstSort ?? (numeric ? "descending" : "ascending");
  const next: SortDirection | undefined = sort === undefined ? first : sort === first ? (first === "ascending" ? "descending" : "ascending") : undefined;
  return (
    <th scope="col" {...props} aria-sort={sort} data-sortable="" data-numeric={numeric ? "" : undefined} className={className}>
      <button type="button" className="basalt-sort" onClick={() => onSortChange(next)}>
        <span className="basalt-sort-label">{children}</span>
        {/* The seat is 16px on every sortable header, whatever it shows, so the indicator arriving moves no column. */}
        <span className="basalt-sort-seat" aria-hidden="true">
          <Icon icon={CaretUpDownIcon} className="basalt-sort-caret" />
          <Icon icon={ArrowUpGlyph} className="basalt-sort-up" />
          <Icon icon={ArrowDownGlyph} className="basalt-sort-down" />
        </span>
      </button>
      {explainer}
    </th>
  );
}

/**
 * The header of one row: a `th scope="row"` in the body, in the row's own type (13/18 at 500, primary, start-aligned) on the
 * row's own fill, so the washes run through it. It has no band and never sorts. When the table pins a column, the row
 * header is the pinned name column.
 */
export const TableRowHead: React.NamedExoticComponent<React.ComponentProps<"th">> = /* @__PURE__ */ React.memo(function TableRowHead({ className, ...props }: React.ComponentProps<"th">) {
  return <th scope="row" {...props} className={className} />;
});

export interface TableCellProps extends React.ComponentProps<"td"> {
  numeric?: boolean;
  mono?: boolean;
  /**
   * No reading was taken: the cell says "Not observed" in tertiary ink, with no mark, ending on the numbers' edge in a numeric
   * column. It is not zero (`0` is a digit in primary) and not empty (an empty string stays blank). Children replace the words:
   * for translation, and for a value that is absent rather than unmeasured, in the app's words ("No ticket", "None yet"), in the same ink. A not-observed value sorts after every observed value in both directions: see foundations.
   */
  notObserved?: boolean;
}

/** A cell. It is memoised like `TableRow`: a cell whose props and children are the same as last time does not render again. */
export const TableCell: React.NamedExoticComponent<TableCellProps> = /* @__PURE__ */ React.memo(function TableCell({ numeric, mono, notObserved, className, children, ...props }: TableCellProps) {
  return (
    <td {...props} data-numeric={numeric ? "" : undefined} data-mono={mono ? "" : undefined} data-not-observed={notObserved ? "" : undefined} className={className}>
      {notObserved && children === undefined ? "Not observed" : children}
    </td>
  );
});

export interface TableCallProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The call: what the row says, in primary at 500. */
  call: React.ReactNode;
  /** What changes, or its reason: under the call, in secondary at 400. */
  detail: React.ReactNode;
}

/**
 * A two-line cell's content (DECISIONS 162, D18b): a call in primary at 500 over what it changes in secondary, `space-0-5` apart. Put it
 * in a `TableCell`; it wraps within its column, so the row grows to hold both lines and no column moves.
 */
export function TableCall({ call, detail, className, ...props }: TableCallProps) {
  return <span {...props} className={join("basalt-table-call", className)}><span className="basalt-table-call-main">{call}</span><span className="basalt-table-call-detail">{detail}</span></span>;
}

export interface TableScrollHintProps extends Omit<React.ComponentProps<"p">, "children"> {
  /** The line, from the table's column count. Default "Scroll sideways to see all 6 columns". */
  label?: (columns: number) => string;
}

const defaultHint = (columns: number) => `Scroll sideways to see all ${columns} columns`;

/**
 * One line under a `TableContainer` that is wider than its box: "Scroll sideways to see all 6 columns". Put it directly after
 * the container. It shows only while the table overflows, is `aria-hidden` (a screen reader reaches every cell), and never
 * changes while the table scrolls, so nothing in the table moves. The count is the table's.
 */
export function TableScrollHint({ label = defaultHint, className, ref, ...props }: TableScrollHintProps) {
  const node = React.useRef<HTMLParagraphElement | null>(null);
  const setRef = React.useCallback(
    (element: HTMLParagraphElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as React.MutableRefObject<HTMLParagraphElement | null>).current = element;
    },
    [ref],
  );
  const [columns, setColumns] = React.useState(0);
  React.useLayoutEffect(() => {
    const frame = node.current?.previousElementSibling;
    if (!(frame instanceof HTMLElement) || !frame.classList.contains("basalt-table-container")) return undefined;
    const measure = () => {
      const table = frame.querySelector("table");
      const count = table ? (table.querySelectorAll("colgroup > col").length || table.querySelector("tr")?.children.length || 0) : 0;
      setColumns(frame.scrollWidth > frame.clientWidth ? count : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    const table = frame.querySelector("table");
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, []);
  return <p {...props} ref={setRef} aria-hidden="true" hidden={columns === 0} className={join("basalt-table-hint", className)}>{columns ? label(columns) : null}</p>;
}

export interface TableEmptyProps extends Omit<React.ComponentProps<"td">, "colSpan"> {
  /** The number of columns, so the row spans them all and moves nothing. */
  colSpan: number;
  /**
   * The way out, named for what hid the rows (DECISIONS 207). A search alone: the sentence names the term (`No runs match “zzq”.`) and the action is "Clear search".
   * A chosen filter: "Clear filters"; in the mixed case "Clear filters" clears the search too.
   */
  action?: React.ReactNode;
}

/** The row a table shows when no row matches: one cell across every column, under the unchanged header, with a sentence and an action. */
export function TableEmpty({ colSpan, action, className, children, ...props }: TableEmptyProps) {
  return (
    <tr data-empty="">
      <td {...props} colSpan={colSpan} className={className}>
        <div className="basalt-table-empty">
          <span>{children}</span>
          {action}
        </div>
      </td>
    </tr>
  );
}

// ---- Tooltip ----

export interface TooltipProps {
  /** The tooltip text. A tooltip supplements a control's name; it never replaces a label. */
  content: React.ReactNode;
  /** The element the tooltip describes, rendered as the trigger. */
  children: React.ReactElement;
  side?: Side;
  /** Open on first render, e.g. in documentation. Normally tooltips open on hover and focus. */
  defaultOpen?: boolean;
  /** A real shortcut for the control, shown as chips at the end of the tooltip, e.g. "⌘K". */
  shortcut?: string;
}

export interface TooltipProviderProps {
  /** Milliseconds a tooltip waits before opening on hover. */
  delay?: number;
  closeDelay?: number;
  /** After one tooltip closes, how long the next opens at once. */
  timeout?: number;
  children?: React.ReactNode;
}

/** Wrap the app once in `TooltipProvider` so tooltips share their open delay. */
export function TooltipProvider(props: TooltipProviderProps) {
  return <BaseTooltip.Provider {...props} />;
}

export function Tooltip({ content, children, side = "top", defaultOpen, shortcut }: TooltipProps) {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  const id = React.useId();
  const trigger = children as React.ReactElement<{ "aria-describedby"?: string }>;
  // The pinned primitive supplies neither a tooltip role nor its trigger description.
  const description = [trigger.props["aria-describedby"], open ? id : undefined].filter(Boolean).join(" ") || undefined;
  const apple = useApplePlatform();
  const keys = shortcut ? shortcutKeys(shortcut, apple) : [];
  return (
    <BaseTooltip.Root open={open} onOpenChange={setOpen}>
      <BaseTooltip.Trigger render={React.cloneElement(trigger, { "aria-describedby": description, "aria-keyshortcuts": keys.length ? ariaShortcut(keys) : undefined } as object)} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6} className="basalt-positioner basalt-tooltip-positioner">
          {/* a tooltip is always level 3: it floats above whatever opened it */}
          <BaseTooltip.Popup id={id} role="tooltip" data-level={3} className="basalt-tooltip">
            {content}
            {shortcut ? (
              <>
                <Kbd shortcut aria-hidden="true" className="basalt-tooltip-shortcut">{shortcut}</Kbd>
                <span className="basalt-visually-hidden"> ({spokenShortcut(keys)})</span>
              </>
            ) : null}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
