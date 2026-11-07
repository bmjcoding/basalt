import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as React from "react";

import { withClass } from "./utils";

const TabsMotion = React.createContext<{
  order: React.MutableRefObject<string[]>;
  previous: React.MutableRefObject<string | null>;
} | null>(null);

/** Tabs switch between panels of one view. The new panel slides in from the direction you moved. */
export function Tabs({ className, onValueChange, value, defaultValue, ...props }: React.ComponentProps<typeof BaseTabs.Root>) {
  const order = React.useRef<string[]>([]);
  const previous = React.useRef<string | null>(value == null && defaultValue == null ? null : String(value ?? defaultValue));
  const motion = React.useMemo(() => ({ order, previous }), []);
  const [direction, setDirection] = React.useState<"" | "forward" | "back">("");
  return (
    <TabsMotion.Provider value={motion}>
      <div className="basalt-tabs-root" data-direction={direction || undefined}>
        <BaseTabs.Root
          {...props}
          value={value}
          defaultValue={defaultValue}
          className={withClass("basalt-tabs", className)}
          onValueChange={(next, details) => {
            const nextValue = String(next);
            const from = previous.current == null ? -1 : order.current.indexOf(previous.current);
            const to = order.current.indexOf(nextValue);
            if (from >= 0 && to >= 0 && from !== to) setDirection(to > from ? "forward" : "back");
            previous.current = nextValue;
            onValueChange?.(next, details);
          }}
        />
      </div>
    </TabsMotion.Provider>
  );
}

export function TabsList({ className, children, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List {...props} className={withClass("basalt-tabs-list", className)}>
      {children}
      <BaseTabs.Indicator className="basalt-tabs-indicator" />
    </BaseTabs.List>
  );
}

export function Tab({ className, value, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  const motion = React.useContext(TabsMotion);
  React.useLayoutEffect(() => {
    if (!motion || value == null) return;
    const id = String(value);
    if (!motion.order.current.includes(id)) motion.order.current.push(id);
    if (motion.previous.current == null) motion.previous.current = id;
  }, [motion, value]);
  return <BaseTabs.Tab {...props} value={value} className={withClass("basalt-tab", className)} />;
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
export function SegmentedControl({ value, defaultValue, onValueChange, className, children, ...props }: SegmentedControlProps) {
  // Always controlled underneath, so a segmented control can never end up with nothing
  // selected: pressing the selected segment again leaves it selected.
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  const [direction, setDirection] = React.useState<"" | "forward" | "back">("");
  const order = React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ value?: string }>(child) && child.props.value ? [child.props.value] : [],
  );
  return (
    <ToggleGroup
      {...props}
      data-direction={direction || undefined}
      value={current === undefined ? [] : [current]}
      onValueChange={(next) => {
        const picked = next.find((item) => item !== current) as string | undefined;
        if (picked === undefined) return;
        const from = current == null ? -1 : order.indexOf(current);
        const to = order.indexOf(picked);
        if (from >= 0 && to >= 0 && from !== to) setDirection(to > from ? "forward" : "back");
        setInner(picked);
        onValueChange?.(picked);
      }}
      className={withClass("basalt-segmented", className)}
    >
      {children}
    </ToggleGroup>
  );
}

export function Segment({ className, ...props }: React.ComponentProps<typeof Toggle> & { value: string }) {
  return <Toggle {...props} className={withClass("basalt-segment", className)} />;
}
