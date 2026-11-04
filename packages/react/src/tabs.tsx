import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as React from "react";

import { withClass } from "./utils";

/** Tabs switch between panels of one view. */
export function Tabs({ className, ...props }: React.ComponentProps<typeof BaseTabs.Root>) {
  return <BaseTabs.Root {...props} className={withClass("basalt-tabs", className)} />;
}

export function TabsList({ className, children, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List {...props} className={withClass("basalt-tabs-list", className)}>
      {children}
      <BaseTabs.Indicator className="basalt-tabs-indicator" />
    </BaseTabs.List>
  );
}

export function Tab({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return <BaseTabs.Tab {...props} className={withClass("basalt-tab", className)} />;
}

export function TabsPanel({ className, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel {...props} className={withClass("basalt-tabs-panel", className)} />;
}

export interface SegmentedControlProps extends Omit<React.ComponentProps<typeof ToggleGroup>, "value" | "defaultValue" | "onValueChange" | "multiple"> {
  /** The selected segment. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Required: names the group for screen readers, e.g. "Time range". */
  "aria-label": string;
}

/**
 * A single choice among a few options that filter or change the current view (a time
 * range, a layout). Use `Tabs` when each option has its own panel. The selected segment
 * is a raised pill, not a colour change, so it's visible without colour (WCAG 1.4.11).
 */
export function SegmentedControl({ value, defaultValue, onValueChange, className, ...props }: SegmentedControlProps) {
  // Always controlled underneath, so a segmented control can never end up with nothing
  // selected: pressing the selected segment again leaves it selected.
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  return (
    <ToggleGroup
      {...props}
      value={current === undefined ? [] : [current]}
      onValueChange={(next) => {
        const picked = next.find((v) => v !== current) as string | undefined;
        if (picked === undefined) return;
        setInner(picked);
        onValueChange?.(picked);
      }}
      className={withClass("basalt-segmented", className)}
    />
  );
}

export function Segment({ className, ...props }: React.ComponentProps<typeof Toggle> & { value: string }) {
  return <Toggle {...props} className={withClass("basalt-segment", className)} />;
}
