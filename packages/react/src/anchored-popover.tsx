import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";

// A popover opened by a button the part draws itself (cimip-gaps-3 T2): `Stat`'s hint and a rail stage's detail. Loaded the first time one opens (lazy-popover.ts),
// so a `Stat` or a `StageRail` that never opens one does not load Base UI's popover. It is built on its own (build.mjs) and imports nothing of Basalt's: the popup's
// level and layer are read by the part, which already has them, and handed in, as the release notes' Sources popup does. Its classes and placement are
// PopoverContent's: below the opener, 6 under it, kept on its axis. The opener keeps its own `aria-expanded`; a press on it while open is the opener's to toggle,
// never an outside press first. Esc and a press outside close it, and focus goes back to the opener.

export interface AnchoredPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The opener: the popup is placed under it and focus returns to it. */
  anchor: React.RefObject<HTMLElement | null>;
  title: React.ReactNode;
  align?: "start" | "center" | "end";
  /** The popup's level: its opener's plus one. */
  level: number;
  /** The floating layer's stacking, from the part. */
  layer?: React.CSSProperties;
  /** Wraps the content in the part's own level, so a popup opened from inside it knows where it sits. */
  wrap?: (children: React.ReactNode) => React.ReactNode;
  id?: string;
  className?: string;
  state?: string;
  children?: React.ReactNode;
}

const KEEP_AXIS = { fallbackAxisSide: "none" } as const;

export default function AnchoredPopover({ open, onOpenChange, anchor, title, align = "start", level, layer, wrap, id, className, state, children }: AnchoredPopoverProps) {
  return (
    <BasePopover.Root
      open={open}
      onOpenChange={(next, details) => {
        const target = details.event?.target;
        if (!next && target instanceof Node && anchor.current?.contains(target)) return;
        if (next !== open) onOpenChange(next);
      }}
    >
      <BasePopover.Portal>
        <BasePopover.Positioner anchor={anchor} side="bottom" align={align} sideOffset={6} collisionAvoidance={KEEP_AXIS} style={layer} className="basalt-positioner">
          <BasePopover.Popup id={id} finalFocus={anchor} data-level={level} data-state={state} className={className ? `basalt-popover ${className}` : "basalt-popover"}>
            <BasePopover.Title className="basalt-popover-title">{title}</BasePopover.Title>
            {wrap ? wrap(children) : children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
