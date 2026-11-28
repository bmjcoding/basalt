import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import { usePortalScope } from "./palette-scope";

// The Sources panel's popup (DECISIONS 320, 2.9), loaded the first time a reader reaches for a source line (release-notes.tsx), so a page of releases
// does not load a popup, its positioning and Floating UI until someone asks. It is built on its own (build.mjs) and imports nothing of Basalt's: what it
// holds (the rows, Copy link to this change) and the popup's level and layer are drawn and measured by the page, which already has them, and handed in.
// Its classes and its placement are PopoverContent's: below the source line, end-aligned, 6 under it, kept inside the window by space-4 each side.

export interface SourcesPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The source line's button: the popup's opener, rendered as the trigger so focus returns to it. */
  trigger: React.ReactElement;
  /** The popup's level: its opener's plus one. */
  level: number;
  /** The floating layer's stacking, from the page. */
  layer?: React.CSSProperties;
  /** The panel, which takes focus when it opens. */
  panelRef: React.RefObject<HTMLDivElement | null>;
  title: React.ReactNode;
  children: React.ReactNode;
}

const KEEP_AXIS = { fallbackAxisSide: "none" } as const;

export function SourcesPopup({ open, onOpenChange, trigger, level, layer, panelRef, title, children }: SourcesPopupProps) {
  const portalScope = usePortalScope();
  return (
    <BasePopover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal {...portalScope}>
        <BasePopover.Positioner side="bottom" align="end" sideOffset={6} collisionPadding={16} collisionAvoidance={KEEP_AXIS} style={layer} className="basalt-positioner">
          <BasePopover.Popup ref={panelRef} initialFocus={panelRef} data-level={level} className="basalt-popover basalt-release-sources">
            <BasePopover.Title className="basalt-popover-title">{title}</BasePopover.Title>
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
