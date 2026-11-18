import * as React from "react";

import { Button } from "./button";
import type { ButtonProps } from "./button";
import { ChevronLeftGlyph } from "./glyphs/chevron-left";
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
}

/**
 * A panel docked in the flow under a page's column, with two titled halves (`DrawerSection`). Not a dialog and not a sheet: it has
 * no portal, scrim, level reset, motion, shadow, fill or corner radius, and it takes no focus when it opens. Its one mark is a
 * `border-divider` along its top. The app owns where it sits, whether it is open, and what moves focus into it.
 */
export function Drawer({ label, open = true, rows = 13, columns, onBack, backLabel = "Back", className, style, children, ...props }: DrawerProps) {
  return (
    <section
      {...props}
      aria-label={label}
      hidden={open ? undefined : true}
      className={join("basalt-drawer", className)}
      style={{ "--_rows": rows, ...(columns ? { "--_columns": columns } : null), ...style } as React.CSSProperties}
    >
      {onBack ? <Button variant="ghost" size="sm" icon={ChevronLeftGlyph} className="basalt-drawer-back" onClick={onBack}>{backLabel}</Button> : null}
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
  const body = useScrollStop<HTMLDivElement>({ labelledBy: id });
  return (
    <div {...props} role="group" aria-labelledby={id} className={join("basalt-drawer-section", className)}>
      <div className="basalt-drawer-head">
        <Heading id={id} className="basalt-drawer-title">{title}</Heading>
        {actions ? <div className="basalt-drawer-actions">{actions}</div> : null}
      </div>
      <div {...body.attributes} ref={body.ref} className="basalt-drawer-body">{children}</div>
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
