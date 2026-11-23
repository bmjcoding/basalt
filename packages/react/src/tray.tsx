import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { inLevel, usePanelLevel } from "./layers";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "./overlays";
import { useMediaQuery } from "./use-media";
import { join } from "./utils";

// A tray (a docked attention region): the rows that wait on the reader, kept where they work, often above the field they type in, so what waits
// is in view wherever the page is scrolled. Someone asking to join, a change to approve, a reply that is due. From 720 it is one level-1
// panel of rows, each its words with a mark at the start and its actions at the end. Under 720 the rows that wait are one band, a button that
// says how many and opens them in a bottom sheet; a row that only reports (`stay`: work under way, a connection) stays a row of the tray.
// Focus is never lost to a row that leaves: it goes to the row that took its place, or the one before, and when none are left to the app's
// field (`returnFocus`), and the sheet closes by itself.

type FocusTarget = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

export interface TrayProps extends Omit<React.ComponentProps<"section">, "children" | "aria-label"> {
  /** The region's name, and the sheet's title on a phone: "Waiting on you", "Needs your review". */
  label: string;
  /** What the band says on a phone for the rows that wait, from their count: (n) => `${n} waiting on you`. */
  summary: (count: number) => string;
  /** The band's word for opening the sheet. Default "Show". */
  showLabel?: string;
  /** The sheet's close button's name. Default "Close". */
  closeLabel?: string;
  /**
   * Where focus goes when the last row that held it leaves: the field the tray sits above. A ref or a function. Without one, focus goes
   * to the tray itself while it has rows, and is left to the browser after.
   */
  returnFocus?: FocusTarget;
  /** `TrayRow`s, most pressing first, as direct children (a fragment is looked through). */
  children?: React.ReactNode;
}

export interface TrayRowProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** At the start: a status word for what waits ("Needs approval", a pending `Badge`), or an avatar. */
  mark?: React.ReactNode;
  /** The row's words: what waits, in one sentence or a name. They wrap; they are never cut. */
  children: React.ReactNode;
  /** At the end: the row's actions (`sm` Buttons), the first the one most taken. */
  actions?: React.ReactNode;
  /** The row only reports (work under way, a connection): on a phone it stays a row of the tray, and is not gathered into the sheet or counted. */
  stay?: boolean;
}

const isRow = (node: React.ReactNode): node is React.ReactElement<TrayRowProps> => React.isValidElement(node) && node.type === TrayRow;

/** The tray's rows, with fragments looked through and nothing else counted. */
function rowsOf(children: React.ReactNode): React.ReactElement<TrayRowProps>[] {
  const out: React.ReactElement<TrayRowProps>[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment) out.push(...rowsOf(child.props.children));
    else if (isRow(child)) out.push(child);
  });
  return out;
}

const focusable = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const resolve = (target: FocusTarget | undefined) => (typeof target === "function" ? target() : target?.current) ?? null;

/**
 * Keeps focus when a row it was in leaves. Before React commits, `focusout` tells whether focus left a row with nowhere to go (a removed row
 * blurs with no related target); after the commit it goes to the row now at that place, or the one before, or to the app's field.
 */
function useRowFocus(box: React.RefObject<HTMLElement | null>, keys: string, returnFocus: FocusTarget | undefined, fallback: () => HTMLElement | null) {
  const lost = React.useRef<number | null>(null);
  // On the document, so a box that mounts later than the tray (a sheet's portalled popup) is watched too; it is read when focus leaves.
  React.useEffect(() => {
    const out = (event: FocusEvent) => {
      const element = box.current;
      if (event.relatedTarget || !element) return;
      const row = (event.target as Element | null)?.closest?.(".basalt-tray-row");
      if (!row || !element.contains(row)) return;
      lost.current = [...element.querySelectorAll(".basalt-tray-row")].indexOf(row);
    };
    document.addEventListener("focusout", out, true);
    return () => document.removeEventListener("focusout", out, true);
  }, [box]);
  const target = React.useRef(returnFocus);
  target.current = returnFocus;
  React.useLayoutEffect(() => {
    const at = lost.current;
    lost.current = null;
    if (at === null) return;
    // Lost: on nothing, or taken by the box itself (a modal's focus trap takes it to the sheet when the focused row goes).
    const active = document.activeElement;
    if (active && active !== document.body && active !== box.current) return;
    const rows = [...(box.current?.querySelectorAll<HTMLElement>(".basalt-tray-row") ?? [])];
    const row = rows[Math.min(at, rows.length - 1)];
    const next = row?.querySelector<HTMLElement>(focusable) ?? resolve(target.current) ?? fallback();
    next?.focus({ preventScroll: false });
  }, [keys, box, fallback]);
}

/**
 * The rows that wait on the reader, docked where the reader works (see the module's note). Place it above the field the reader types in (an
 * `AppShell` `foot`), or at the head of a page. It names itself with `label`; it is not a live region: say a new row aloud through the app's
 * one `StatusLine`. With no rows it draws nothing.
 */
export function Tray({ label, summary, showLabel = "Show", closeLabel = "Close", returnFocus, className, children, ...props }: TrayProps) {
  const level = usePanelLevel();
  const phone = useMediaQuery(`(width < ${breakpoint.md}px)`);
  const rows = rowsOf(children);
  const gathered = rows.filter((row) => !row.props.stay);
  const kept = rows.filter((row) => row.props.stay);
  const count = gathered.length;
  const [open, setOpen] = React.useState(false);
  const panel = React.useRef<HTMLElement | null>(null);
  const sheet = React.useRef<HTMLDivElement | null>(null);
  const keys = rows.map((row, i) => String(row.key ?? i)).join("\u0000");
  const band = React.useRef<HTMLButtonElement | null>(null);
  const fallback = React.useCallback(() => panel.current?.querySelector<HTMLElement>(focusable) ?? null, []);
  useRowFocus(panel, keys, returnFocus, fallback);
  useRowFocus(sheet, keys, returnFocus, fallback);
  // The last row that waited is answered, or the window grew past 720: the sheet closes by itself, and its focus goes to the field.
  React.useEffect(() => {
    if (open && (count === 0 || !phone)) setOpen(false);
  }, [open, count, phone]);
  if (rows.length === 0) return null;
  const finalFocus = () => resolve(returnFocus) ?? (band.current?.isConnected ? band.current : true);
  return (
    <section {...props} ref={panel} aria-label={label} data-level={level} className={join("basalt-tray", className)}>
      {inLevel(level, (
        <>
          {/* Under 720 the rows that wait are this band, which opens them in a sheet; from 720 it is not drawn. */}
          {count > 0 ? (
            <button ref={band} type="button" className="basalt-tray-band" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
              <span className="basalt-tray-summary">{summary(count)}</span>
              <span className="basalt-tray-show">{showLabel}</span>
            </button>
          ) : null}
          {/* The server and the first render draw the wide form; under 720 the stylesheet hides the gathered rows until the script knows. */}
          {phone ? kept : rows}
        </>
      ))}
      {phone ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" ref={sheet} className="basalt-tray-sheet" finalFocus={finalFocus}>
            <SheetHeader closeLabel={closeLabel}>
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <div className="basalt-tray-sheet-rows">{gathered}</div>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
}

/**
 * One row of a `Tray`: its mark, its words and its actions on one line where they fit, sharing the first line's baseline; the words wrap and
 * are never cut. At least 40px tall, 44 on touch.
 */
export function TrayRow({ mark, actions, stay = false, className, children, ...props }: TrayRowProps) {
  return (
    <div {...props} data-stay={stay ? "" : undefined} className={join("basalt-tray-row", className)}>
      {mark != null ? <span className="basalt-tray-mark">{mark}</span> : null}
      <span className="basalt-tray-words">{children}</span>
      {actions != null ? <span className="basalt-tray-actions">{actions}</span> : null}
    </div>
  );
}
