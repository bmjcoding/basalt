import * as React from "react";

import { Button } from "./button";
import type { ButtonProps } from "./button";
import { ChevronLeftGlyph } from "./glyphs/chevron-left";
import { useScrollFade } from "./fade-port";
import type { FocusPlace } from "./route-focus";
import { useScrollStop } from "./scroll-stop";
import { join } from "./utils";

export interface DrawerProps extends Omit<React.ComponentProps<"section">, "title"> {
  /** Required: names the drawer's region ("The session and the sources"). */
  label: string;
  /** Shown or not. A closed drawer stays in the document, hidden, so a trigger's `aria-controls` always points at it. Default true. */
  open?: boolean;
  /** How tall it is from 720, in 24px rows. Default 13 (312px). Each half scrolls inside; under 720 the drawer is as tall as its content. */
  rows?: number;
  /** The halves' widths from 720, as `grid-template-columns` ("minmax(0, 1fr) 62ch"). Default: two equal halves. */
  columns?: string;
  /** Under 720 the drawer is a page of its own and replaces the record: this draws its Back button there (hidden from 720). */
  onBack?: () => void;
  /** The Back button's name. Default "Back". */
  backLabel?: string;
  /**
   * Where focus goes when the drawer closes while focus is inside it (its own Back button, the browser's Back). Default: the element
   * focus came from when it entered the drawer, if it is still in the document. With neither, nothing moves. When focus is outside the
   * drawer as it closes, nothing moves.
   */
  finalFocus?: FocusPlace;
}

/**
 * A panel docked in the flow under a page's column, with two titled halves (`DrawerSection`). Not a dialog and not a sheet: it has
 * no portal, scrim, level reset, motion, shadow, fill or corner radius, and it takes no focus when it opens. Its one mark is a
 * `border-divider` along its top. The app owns where it sits, whether it is open, and what moves focus into it. When it closes with focus
 * inside, focus goes to `finalFocus`, else to where it came from when it entered (m7, U2); a focus that arrived from nowhere (a script's move
 * from no focus, Safari's press on a button) leaves nothing to return to, and `finalFocus` is the app's answer.
 */
export function Drawer({ label, open = true, rows = 13, columns, onBack, backLabel = "Back", finalFocus, className, style, children, onFocus, onBlur, ...props }: DrawerProps) {
  // Where focus came from when it last entered from outside (nothing, when it came from no element), and whether it is inside now: both read from the
  // section's own focus events, which React hears from the commit on (a parent's layout effect that focuses into an open drawer included), never from
  // `document.activeElement` after `hidden` has been applied.
  const came = React.useRef<HTMLElement | null>(null);
  const inside = React.useRef(false);
  const enter = (event: React.FocusEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const from = event.relatedTarget;
    const outside = !(from instanceof Node && el.contains(from));
    // An entry from outside replaces the record; one with no element clears it. Focus coming back with the window is not an entry.
    if (!inside.current || (from !== null && outside)) came.current = from instanceof HTMLElement && outside ? from : null;
    inside.current = true;
    onFocus?.(event);
  };
  const leave = (event: React.FocusEvent<HTMLElement>) => {
    const el = event.currentTarget;
    const to = event.relatedTarget;
    const doc = el.ownerDocument;
    // The window losing focus (another app) leaves focus where it is: still inside, but only while the document still names the same element.
    inside.current = (to instanceof Node && el.contains(to)) || (to === null && !doc.hasFocus() && doc.activeElement === event.target);
    onBlur?.(event);
  };
  const was = React.useRef(open);
  React.useLayoutEffect(() => {
    const closed = was.current && !open;
    was.current = open;
    if (!closed) return;
    const back = came.current;
    // Every close clears the record, used or not, so an opener from one opening is never focused after a later one.
    came.current = null;
    if (!inside.current) return;
    // `finalFocus` as this closing render gave it.
    const target = (finalFocus ? (typeof finalFocus === "function" ? finalFocus() : finalFocus.current) : null) ?? (back && back.isConnected ? back : null);
    target?.focus({ preventScroll: true });
  }, [open]);
  return (
    <section
      {...props}
      onFocus={enter}
      onBlur={leave}
      aria-label={label}
      hidden={open ? undefined : true}
      className={join("basalt-drawer", className)}
      style={{ "--_rows": rows, ...(columns ? { "--_columns": columns } : null), ...style } as React.CSSProperties}
    >
      {onBack ? <Button variant="ghost" size="sm" edge="start" icon={ChevronLeftGlyph} className="basalt-drawer-back" onClick={onBack}>{backLabel}</Button> : null}
      {children}
    </section>
  );
}

export interface DrawerSectionProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The half's title: its heading, and the group's name. */
  title: React.ReactNode;
  /** Heading level of the title (2 by default). */
  level?: 2 | 3 | 4;
  /** Buttons at the title's end. */
  actions?: React.ReactNode;
}

/**
 * One half of a drawer: a title with its actions on one line, then a body that scrolls. A body that overflows and holds nothing focusable is a
 * keyboard stop of its own, a region named by the title with Basalt's ring, so a keyboard can scroll it (WCAG 2.1.1); when it fits, or holds a
 * control, nothing changes.
 */
export function DrawerSection({ title, level = 2, actions, className, children, ...props }: DrawerSectionProps) {
  const id = React.useId();
  const Heading = `h${level}` as const;
  // The body stays the port (its stop and its name) and fades at each edge that hides more (cimip-gaps-3 t7); a host round it takes its place in the column and
  // draws its ring at +2, since a mask erases the port's own outline.
  const port = React.useRef<HTMLDivElement | null>(null);
  const body = useScrollStop<HTMLDivElement>({ labelledBy: id }, port);
  useScrollFade(port, { axis: "block", ring: 4 });
  return (
    <div {...props} role="group" aria-labelledby={id} className={join("basalt-drawer-section", className)}>
      <div className="basalt-drawer-head">
        <Heading id={id} className="basalt-drawer-title">{title}</Heading>
        {actions ? <div className="basalt-drawer-actions">{actions}</div> : null}
      </div>
      <div className="basalt-drawer-body-host">
        <div {...body.attributes} ref={body.ref} className="basalt-drawer-body">{children}</div>
      </div>
    </div>
  );
}

export type DrawerTriggerProps = Omit<ButtonProps, "aria-controls" | "aria-expanded" | "pressed"> & {
  /** The drawer's `id`. */
  drawer: string;
  /** Whether the drawer is open. */
  open: boolean;
};

/** The button that opens and closes a drawer: it says which one it controls and whether it is open. */
export function DrawerTrigger({ drawer, open, ...props }: DrawerTriggerProps) {
  return <Button {...(props as ButtonProps)} aria-controls={drawer} aria-expanded={open} />;
}
