import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { join } from "./utils";

// ---- Kbd ----

/** A key or shortcut, e.g. "⌘K". */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd {...props} className={join("basalt-kbd", className)} />;
}

// ---- Badge ----

export type BadgeStatus = "neutral" | "success" | "warning" | "danger";

export interface BadgeProps extends React.ComponentProps<"span"> {
  /** A status dot before the label. The label always says the status in words; the dot never carries it alone. */
  status?: BadgeStatus;
}

/** A small label, e.g. a deployment state. Neutral pill; colour only in the dot. */
export function Badge({ status = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span {...props} data-status={status} className={join("basalt-badge", className)}>
      {status === "neutral" ? null : <span className="basalt-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

// ---- Card ----

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-card", className)} />;
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

/** A data table. Wrap it in `TableContainer` for the rounded, bordered frame and horizontal scrolling. */
export function TableContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-table-container", className)} />;
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
  side?: React.ComponentProps<typeof BaseTooltip.Positioner>["side"];
}

/** Wrap the app once in `TooltipProvider` so tooltips share their open delay. */
export const TooltipProvider = BaseTooltip.Provider;

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6} className="basalt-positioner">
          <BaseTooltip.Popup className="basalt-tooltip">{content}</BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
