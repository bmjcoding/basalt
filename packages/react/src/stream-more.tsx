import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { usePortalScope } from "./palette-scope";

// The popover a stream message's More control opens on touch (cimip-gaps-3 T5, item 10a), loaded the first time a reader reaches for More
// (stream.tsx), so a stream does not load a popup, its positioning and Floating UI until someone asks. It is built on its own (build.mjs, as the release
// notes' Sources popup is) and imports nothing of Basalt's: the message draws More and the quiet actions, and the popup's level and layer, and hands
// them in. Its classes and placement are PopoverContent's: below More, end-aligned, 6 under it, kept inside the window by space-4 each side.

export interface QuietPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The More button: the popup's opener, rendered as the trigger so focus returns to it. */
  trigger: React.ReactElement;
  /** The popup's level: its opener's plus one. */
  level: number;
  /** The floating layer's stacking, from the page. */
  layer?: React.CSSProperties;
  /** The popup's name: More's own ("Actions for the message from …"). */
  label: string;
  /** The message's quiet actions, already in their row. */
  children: React.ReactNode;
}

const KEEP_AXIS = { fallbackAxisSide: "none" } as const;

export function QuietPopup({ open, onOpenChange, trigger, level, layer, label, children }: QuietPopupProps) {
  const portalScope = usePortalScope();
  return (
    <BasePopover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal {...portalScope}>
        <BasePopover.Positioner side="bottom" align="end" sideOffset={6} collisionPadding={16} collisionAvoidance={KEEP_AXIS} style={layer} className="basalt-positioner">
          <BasePopover.Popup aria-label={label} data-level={level} className="basalt-popover basalt-stream-more-popup">{children}</BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
