import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as React from "react";

import { Pill } from "./pill";
import type { ChangeDetails, ChoiceValue, Orientation, PartProps } from "./types";
import { withClass } from "./utils";

const TabsMotion = React.createContext<{
  order: React.MutableRefObject<string[]>;
  previous: React.MutableRefObject<string | null>;
} | null>(null);

const TabsOrientation = React.createContext<Orientation | undefined>(undefined);

export interface TabsProps<Value extends ChoiceValue = any> extends PartProps<"div", "defaultValue"> {
  /** The selected tab's `value`. `null` selects none. */
  value?: Value | null;
  defaultValue?: Value | null;
  orientation?: Orientation;
  /** Called with the new tab's `value`, unchanged (`null` when no tab can be selected). Call `details.cancel()` to refuse. */
  onValueChange?: (value: Value | null, details: ChangeDetails) => void;
}

/** Tabs switch between panels of one view. The new panel slides in from the direction you moved. */
export function Tabs<Value extends ChoiceValue = any>({ className, onValueChange, value, defaultValue, ...props }: TabsProps<Value>) {
  const order = React.useRef<string[]>([]);
  // Order and direction are looked up by the value's text, a private key: what the app sees is never changed.
  const previous = React.useRef<string | null>(value == null && defaultValue == null ? null : String(value ?? defaultValue));
  const motion = React.useMemo(() => ({ order, previous }), []);
  const [direction, setDirection] = React.useState<"" | "forward" | "back">("");
  // The committed value: the prop when controlled, otherwise what the last accepted change set. Direction
  // follows this, so a controlled update (a router, a reset) slides the same way a click does, and a change
  // the app refused (`details.cancel()`) moves nothing.
  const [chosen, setChosen] = React.useState(defaultValue);
  const current = value !== undefined ? value : chosen;
  React.useLayoutEffect(() => {
    if (current == null) return;
    const nextValue = String(current);
    const from = previous.current == null ? -1 : order.current.indexOf(previous.current);
    const to = order.current.indexOf(nextValue);
    if (from >= 0 && to >= 0 && from !== to) setDirection(to > from ? "forward" : "back");
    previous.current = nextValue;
  }, [current]);
  return (
    <TabsMotion.Provider value={motion}>
      <TabsOrientation.Provider value={props.orientation}>
        <div className="basalt-tabs-root" data-direction={direction || undefined}>
          <BaseTabs.Root
            {...props}
            value={value}
            defaultValue={defaultValue}
            className={withClass("basalt-tabs", className)}
            onValueChange={(next: Value | null, details: ChangeDetails) => {
              onValueChange?.(next, details);
              if (!details.isCanceled) setChosen(next);
            }}
          />
        </div>
      </TabsOrientation.Provider>
    </TabsMotion.Provider>
  );
}

export interface TabsListProps extends PartProps<"div"> {
  /** Wrap focus from the last tab to the first. On by default. */
  loopFocus?: boolean;
  /** Select a tab when it takes focus, rather than on Enter or Space. */
  activateOnFocus?: boolean;
}

export function TabsList({ className, children, ref, ...props }: TabsListProps) {
  const orientation = React.useContext(TabsOrientation);
  const list = React.useRef<HTMLDivElement | null>(null);
  const setRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      list.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = element;
    },
    [ref],
  );
  // The underline is placed from a measure of the selected tab, taken when the list or a tab changes size or the tab changes. A
  // page that flips between left-to-right and right-to-left (a `dir` change) mirrors the tabs without resizing any of them, so
  // the measure would stay where the tab was: when the direction changes the indicator is mounted again and measures again.
  const [flips, setFlips] = React.useState(0);
  React.useLayoutEffect(() => {
    const element = list.current;
    if (!element || orientation === "vertical") return undefined;
    let last = getComputedStyle(element).direction;
    const read = () => {
      const now = getComputedStyle(element).direction;
      if (now === last) return;
      last = now;
      setFlips((count) => count + 1);
    };
    const observer = new MutationObserver(read);
    observer.observe(element.ownerDocument, { attributes: true, attributeFilter: ["dir"], subtree: true });
    return () => observer.disconnect();
  }, [orientation]);
  return (
    <BaseTabs.List {...props} ref={setRef} className={withClass("basalt-tabs-list", className)}>
      {/* A vertical list is a column of pills in a track: one pill slides to the chosen tab, as the segmented control's does.
          The horizontal bar's mark is the underline, which slides on its own. */}
      {orientation === "vertical" ? <Pill /> : null}
      {children}
      {orientation === "vertical" ? null : <BaseTabs.Indicator key={flips} className="basalt-tabs-indicator" />}
    </BaseTabs.List>
  );
}

export interface TabProps extends PartProps<"button", "value"> {
  value: ChoiceValue;
  nativeButton?: boolean;
  disabled?: boolean;
}

export function Tab({ className, value, ...props }: TabProps) {
  const motion = React.useContext(TabsMotion);
  React.useLayoutEffect(() => {
    if (!motion || value == null) return;
    const id = String(value);
    if (!motion.order.current.includes(id)) motion.order.current.push(id);
    if (motion.previous.current == null) motion.previous.current = id;
  }, [motion, value]);
  return <BaseTabs.Tab {...props} value={value} className={withClass("basalt-tab", className)} />;
}

export interface TabsPanelProps extends PartProps<"div", "value"> {
  value: ChoiceValue;
  /** Keep the panel in the document while it is hidden. */
  keepMounted?: boolean;
}

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  return <BaseTabs.Panel {...props} className={withClass("basalt-tabs-panel", className)} />;
}

export interface SegmentedControlProps extends PartProps<"div", "defaultValue" | "value"> {
  disabled?: boolean;
  orientation?: Orientation;
  loopFocus?: boolean;
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
      <Pill />
      {children}
    </ToggleGroup>
  );
}

export interface SegmentProps extends PartProps<"button", "value"> {
  value: string;
  disabled?: boolean;
  nativeButton?: boolean;
}

export function Segment({ className, ...props }: SegmentProps) {
  return <Toggle {...props} className={withClass("basalt-segment", className)} />;
}
