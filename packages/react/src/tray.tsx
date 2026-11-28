import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { useFadeRef } from "./fade-port";
import { useScrollStop } from "./scroll-stop";

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
  /**
   * Whether the phone's sheet is open, for an app that opens it itself (a notice's action that names what waits): pass it with `onOpenChange`. Left out,
   * the band opens it. There is a sheet only under 720 and while a row waits: from 720 the rows are in the tray and `open` draws nothing more.
   */
  open?: boolean;
  /**
   * Called as the sheet opens and closes: the band, Esc or Close, and the tray closing it by itself (its last waiting row answered, or the window
   * grown past 720 while it was open).
   */
  onOpenChange?: (open: boolean) => void;
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

const ROW_KEY = "data-tray-key";

/**
 * Keeps focus when a row it was in leaves. It does not wait for a `focusout` (WebKit can drop a removed element's focus without one): it
 * remembers the row that holds focus, by its key, from every `focusin` and from `document.activeElement` read in each render (before React
 * commits), and after the commit, if that row is gone and focus is on nothing, the body or the box itself (a modal's trap takes it there), it
 * focuses the row now at that row's place, or the last row if fewer remain, or the app's field when none are left. Several rows leaving at once
 * are the same case: only the focused row's place counts.
 */
function useRowFocus(boxes: () => Array<HTMLElement | null>, keys: string, returnFocus: FocusTarget | undefined, fallback: () => HTMLElement | null) {
  const held = React.useRef<{ key: string; index: number } | null>(null);
  const read = React.useCallback((element: Element | null) => {
    for (const box of boxes()) {
      const row = box && element ? element.closest(`.basalt-tray-row[${ROW_KEY}]`) : null;
      if (!box || !row || !box.contains(row)) continue;
      held.current = { key: row.getAttribute(ROW_KEY) ?? "", index: [...box.querySelectorAll(`.basalt-tray-row[${ROW_KEY}]`)].indexOf(row) };
      return;
    }
    // Focus is somewhere else: a row that leaves later took nothing with it.
    held.current = null;
  }, [boxes]);
  // In render, while the DOM is still the one before this commit: the row that holds focus now.
  if (typeof document !== "undefined") read(document.activeElement);
  // On the document, so a box that mounts after the tray (a sheet's portalled popup) is watched too.
  React.useEffect(() => {
    const into = (event: FocusEvent) => read(event.target as Element | null);
    document.addEventListener("focusin", into, true);
    return () => document.removeEventListener("focusin", into, true);
  }, [read]);
  const target = React.useRef(returnFocus);
  target.current = returnFocus;
  React.useLayoutEffect(() => {
    const was = held.current;
    if (!was) return;
    const present = keys.split("\u0000");
    if (present.includes(was.key)) return;
    held.current = null;
    const active = document.activeElement;
    const live = boxes().filter((box): box is HTMLElement => !!box?.isConnected);
    if (active && active !== document.body && !live.includes(active as HTMLElement)) return;
    const box = live.at(-1);
    const rows = [...(box?.querySelectorAll<HTMLElement>(`.basalt-tray-row[${ROW_KEY}]`) ?? [])];
    const row = rows[Math.min(was.index, rows.length - 1)];
    const next = row?.querySelector<HTMLElement>(focusable) ?? resolve(target.current) ?? fallback();
    next?.focus({ preventScroll: false });
  }, [keys, boxes, fallback]);
}

/**
 * The rows that wait on the reader, docked where the reader works (see the module's note). Place it above the field the reader types in (an
 * `AppShell` `foot`), or at the head of a page. It names itself with `label`; it is not a live region: say a new row aloud through the app's
 * one `StatusLine`. With no rows it draws nothing.
 */
export function Tray({ label, summary, showLabel = "Show", closeLabel = "Close", returnFocus, open: openProp, onOpenChange, className, children, ...props }: TrayProps) {
  const level = usePanelLevel();
  const phone = useMediaQuery(`(width < ${breakpoint.md}px)`);
  const rows = rowsOf(children);
  const gathered = rows.filter((row) => !row.props.stay);
  const count = gathered.length;
  const [own, setOwn] = React.useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : own;
  const heard = React.useRef(onOpenChange);
  heard.current = onOpenChange;
  const setOpen = React.useCallback((next: boolean) => {
    if (!controlled) setOwn(next);
    heard.current?.(next);
  }, [controlled]);
  const panel = React.useRef<HTMLElement | null>(null);
  const sheet = React.useRef<HTMLDivElement | null>(null);
  // Each row carries its key, so the row that held focus is found by identity, not by place.
  const keyed = (row: React.ReactElement<TrayRowProps>, i: number) => React.cloneElement(row as React.ReactElement<TrayRowProps & { [ROW_KEY]?: string }>, { [ROW_KEY]: String(row.key ?? i) });
  const all = rows.map(keyed);
  const keys = rows.map((row, i) => String(row.key ?? i)).join("\u0000");
  const band = React.useRef<HTMLButtonElement | null>(null);
  const fallback = React.useCallback(() => panel.current?.querySelector<HTMLElement>(focusable) ?? null, []);
  const boxes = React.useCallback(() => [panel.current, sheet.current], []);
  useRowFocus(boxes, keys, returnFocus, fallback);
  // The sheet closing because its last row left sends focus to the app's field; any other close (Esc, Close) returns to the band that opened it.
  const emptied = React.useRef(false);
  emptied.current = count === 0;
  // The last row that waited is answered, or the window grew past 720 while the sheet was shown: the sheet closes by itself, and its focus goes to the
  // field. Only a sheet that was shown closes for the width: the first render reads no width yet (it is the server's), so an app that opens the sheet
  // from its first render on a phone keeps it open.
  const shown = open && phone && count > 0;
  const wasShown = React.useRef(false);
  React.useEffect(() => {
    if (open && (count === 0 || (!phone && wasShown.current))) setOpen(false);
    wasShown.current = shown;
  }, [open, count, phone, shown, setOpen]);
  const named = React.useId();
  const sectionId = props.id ?? named;
  if (rows.length === 0) return null;
  const finalFocus = () => (emptied.current ? resolve(returnFocus) : null) ?? (band.current?.isConnected ? band.current : true);
  return (
    <section {...props} id={sectionId} ref={panel} aria-label={label} data-level={level} className={join("basalt-tray", className)}>
      {/* The port (cimip-gaps-3 t7): docked in an app's foot at its cap, the rows scroll here and fade at each edge that hides more; the rim stays the tray's. */}
      <TrayPort labelledBy={sectionId}>
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
          {phone ? all.filter((row) => row.props.stay) : all}
        </>
      ))}
      </TrayPort>
      {phone ? (
        <Sheet open={shown} onOpenChange={setOpen}>
          <SheetContent side="bottom" ref={sheet} className="basalt-tray-sheet" finalFocus={finalFocus}>
            <SheetHeader closeLabel={closeLabel}>
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <div className="basalt-tray-sheet-rows">{all.filter((row) => !row.props.stay)}</div>
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

/**
 * The tray's port (cimip-gaps-3 t7): the rows scroll here when the tray is docked at its cap and fade at each edge that hides more. Rows that only report
 * hold nothing focusable, so while the port overflows with none it is a keyboard stop named by the tray; its ring is the tray's.
 */
function TrayPort({ labelledBy, children }: { labelledBy: string; children: React.ReactNode }) {
  const stop = useScrollStop<HTMLDivElement>({ labelledBy });
  const ref = useFadeRef<HTMLDivElement>({ axis: "block", ring: 4 }, stop.ref);
  return <div {...stop.attributes} ref={ref} className="basalt-tray-scroll">{children}</div>;
}
