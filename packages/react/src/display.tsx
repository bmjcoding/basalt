import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { Kbd } from "./kbd";
import { inLevel, usePanelLevel } from "./layers";
import { ariaShortcut, shortcutKeys, spokenShortcut } from "./shortcut";
import type { Side } from "./types";
import { join } from "./utils";

export { Kbd } from "./kbd";

// ---- Badge ----

export type BadgeStatus = "neutral" | "success" | "warning" | "danger";

export interface BadgeProps extends React.ComponentProps<"span"> {
  /** A status dot before the label. The label always says the status in words; the dot never carries it alone. */
  status?: BadgeStatus;
  /**
   * `outline` (default): a small hairline label. `plain`: dot and text only, for places a
   * status repeats down a column, such as table cells, where a pill on every row is noise.
   */
  variant?: "outline" | "plain";
}

/** A small label, e.g. a deployment state. Neutral; colour only in the dot. */
export function Badge({ status = "neutral", variant = "outline", className, children, ...props }: BadgeProps) {
  return (
    <span {...props} data-status={status} data-variant={variant} className={join("basalt-badge", className)}>
      {status === "neutral" ? null : <span className="basalt-badge-dot" aria-hidden="true" />}
      {children}
    </span>
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

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 {...props} className={join("basalt-card-title", className)} />;
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

// ---- Table ----

export type TableDensity = "compact" | "default" | "comfortable";

/**
 * A data table's frame: rounded, bordered, scrolling sideways when it must. `density` sets
 * the row height: 32px for logs, 40px by default, 44px for touch.
 */
export function TableContainer({ density = "default", className, children, ...props }: React.ComponentProps<"div"> & { density?: TableDensity }) {
  // Its own attribute: `data-density` would also reset the size of every control in the table.
  const level = usePanelLevel();
  return <div {...props} data-row-density={density} data-level={level} className={join("basalt-table-container", className)}>{inLevel(level, children)}</div>;
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table {...props} className={join("basalt-table", className)} />;
}

export function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead {...props} />;
}

export function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({ selected, ...props }: React.ComponentProps<"tr"> & { selected?: boolean }) {
  return <tr {...props} aria-selected={selected} data-selected={selected ? "" : undefined} />;
}

export function TableHead({ numeric, className, ...props }: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return <th scope="col" {...props} data-numeric={numeric ? "" : undefined} className={className} />;
}

export function TableCell({ numeric, mono, className, ...props }: React.ComponentProps<"td"> & { numeric?: boolean; mono?: boolean }) {
  return <td {...props} data-numeric={numeric ? "" : undefined} data-mono={mono ? "" : undefined} className={className} />;
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
  const keys = shortcut ? shortcutKeys(shortcut) : [];
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
