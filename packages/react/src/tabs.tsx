import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as React from "react";

import { ChosenLabel } from "./chosen";
import { FieldGroupContext } from "./field-group";
import { Pill } from "./pill";
import type { ChangeDetails, ChoiceValue, Orientation, PartProps } from "./types";
import { join, withClass } from "./utils";

const TabsMotion = React.createContext<{
  order: React.MutableRefObject<string[]>;
  previous: React.MutableRefObject<string | null>;
} | null>(null);

const TabsOrientation = React.createContext<Orientation | undefined>(undefined);
// The chosen tab's value as text, or null when none is known: a panel that is not it is being left, and is not drawn while Base UI finishes its exit.
const TabsChosen = /* @__PURE__ */ React.createContext<string | null>(null);

export interface TabsProps<Value extends ChoiceValue = any> extends PartProps<"div", "defaultValue"> {
  /** The selected tab's `value`. `null` selects none. */
  value?: Value | null;
  defaultValue?: Value | null;
  orientation?: Orientation;
  /**
   * The height of the tabs in a horizontal bar: `lg` (36px, the default), `3xl` (48px) or `5xl` (56px; 48px in a container narrower than
   * `size-breakpoint-container-lg`, 640px, when an ancestor is a container). A tab of 48 or 56 is 16px text with 10px of padding either
   * side (24px between two labels) and radius 8 on its top corners. Vertical tabs have one size.
   */
  size?: "lg" | "3xl" | "5xl";
  /** Called with the new tab's `value`, unchanged (`null` when no tab can be selected). Call `details.cancel()` to refuse. */
  onValueChange?: (value: Value | null, details: ChangeDetails) => void;
}

/** Tabs switch between panels of one view. The new panel slides in from the direction you moved. */
export function Tabs<Value extends ChoiceValue = any>({ className, onValueChange, value, defaultValue, size, ...props }: TabsProps<Value>) {
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
      <TabsChosen.Provider value={current == null ? null : String(current)}>
      <TabsOrientation.Provider value={props.orientation}>
        <div className="basalt-tabs-root" data-direction={direction || undefined}>
          <BaseTabs.Root
            {...props}
            value={value}
            defaultValue={defaultValue}
            data-size={size && size !== "lg" ? size : undefined}
            className={withClass("basalt-tabs", className)}
            onValueChange={(next: Value | null, details: ChangeDetails) => {
              onValueChange?.(next, details);
              if (!details.isCanceled) setChosen(next);
            }}
          />
        </div>
      </TabsOrientation.Provider>
      </TabsChosen.Provider>
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

export function Tab({ className, value, children, ...props }: TabProps) {
  const motion = React.useContext(TabsMotion);
  React.useLayoutEffect(() => {
    if (!motion || value == null) return;
    const id = String(value);
    if (!motion.order.current.includes(id)) motion.order.current.push(id);
    if (motion.previous.current == null) motion.previous.current = id;
  }, [motion, value]);
  // The label is 400 at rest and 600 once chosen and reserves its 600 width, whatever it is, and an icon follows the choice (see ChosenLabel).
  // The children are wrapped before the primitive sees them, so a tab an app draws as an element of its own (`render`) reserves too, when its children are its
  // words. Words an app's `render` supplies itself are never seen: the 600 is on the label, so they keep their weight and move nothing.
  return <BaseTabs.Tab {...props} value={value} className={withClass("basalt-tab", className)}><ChosenLabel>{children}</ChosenLabel></BaseTabs.Tab>;
}

export interface TabsPanelProps extends PartProps<"div", "value"> {
  value: ChoiceValue;
  /** Keep the panel in the document while it is hidden. */
  keepMounted?: boolean;
}

const PanelsStacked = React.createContext(false);

export interface TabsPanelsProps extends React.ComponentProps<"div"> {
  /**
   * Every panel stays mounted in one grid cell, so the view is as tall as its tallest panel and changing tab moves nothing under it
   * (DECISIONS 154, X6). The panels that are not shown keep their room but are `visibility: hidden` and inert, so they leave the accessibility
   * tree, find-in-page and any selection. It turns off, and each panel takes its own height, when this element is narrower than
   * `size-breakpoint-container-lg` (640px). Off by default: tabs without it draw as they always did.
   */
  stacked?: boolean;
}

/** The panels of a `Tabs`, in one element, so they can share one seat (`stacked`). Put it inside `Tabs`, after the `TabsList`. */
export function TabsPanels({ stacked = false, className, ...props }: TabsPanelsProps) {
  return (
    <PanelsStacked.Provider value={stacked}>
      <div {...props} data-stacked={stacked ? "" : undefined} className={join("basalt-tabs-panels", className)} />
    </PanelsStacked.Provider>
  );
}

export function TabsPanel({ className, keepMounted, ...props }: TabsPanelProps) {
  // Stacked panels all stay mounted: a panel that is not there would take no room.
  const stacked = React.useContext(PanelsStacked);
  // The panel being left goes at once (skeleton-shape: a switch is one change). Base UI keeps it mounted until its animations end, and in the flow it held
  // the new panel under itself, off screen, for the slide's 200ms, then dropped it into place. Marked from the chosen value, not from Base UI's exit status,
  // which lags a frame when a panel is chosen again mid-exit.
  const chosen = React.useContext(TabsChosen);
  const leaving = chosen !== null && String(props.value) !== chosen;
  return <BaseTabs.Panel {...props} data-leaving={leaving ? "" : undefined} keepMounted={stacked || keepMounted} className={withClass("basalt-tabs-panel", className)} />;
}

export interface SegmentedControlProps extends PartProps<"div", "defaultValue" | "value"> {
  disabled?: boolean;
  orientation?: Orientation;
  loopFocus?: boolean;
  /** The selected segment. With no value (and no `defaultValue`) nothing is chosen, no segment is pressed and no pill is drawn. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Equal segments that fill the container, as `Button`'s `fullWidth` does for a button (DECISIONS 242: a required choice of a few, such as a priority). The pill still slides.
   */
  fullWidth?: boolean;
  /**
   * A choice is required. A group of pressed buttons cannot carry `aria-required`, so the group's name says it: "Priority, Required". In a `Field`, `Field`'s `required` is
   * read, and the word after the label is the field's. Without a `Field` the word is added to `aria-label`.
   */
  required?: boolean;
  /** The word that is added to the name of a required group, for translation. In a `Field`, the field's `requiredLabel`. Default "Required". */
  requiredLabel?: string;
  /**
   * The choice is wrong or missing: the group takes `aria-invalid` and, in a `Field` that has an `error`, is described by it. It draws no mark of its own (DECISIONS 242: no
   * invalid look is decided): the error line under it is what shows. In a `Field`, `Field`'s `invalid` is read.
   */
  invalid?: boolean;
  /**
   * Names the group for screen readers, e.g. "Time range". Required unless the group is in a `Field` (its label names it) or `aria-labelledby` does.
   */
  "aria-label"?: string;
}

/** The value that holds the group's one tab stop while focus is outside it: undefined while focus is inside (the roving focus owns it) or when nothing can take it. */
const SegmentStop = /* @__PURE__ */ React.createContext<string | undefined>(undefined);

/**
 * A single choice among a few options that filter or change the current view (a time
 * range, a layout). Use `Tabs` when each option has its own panel. The chosen segment's label is 600 in primary ink against
 * 400 in secondary at rest, each reserving the other's width so nothing moves; the raised pill and the ink step support it.
 * A segment with no label (an icon alone) draws its glyph's selected form. It is one tab stop: Tab lands on the chosen segment (on the first one that can
 * take focus while none is chosen), and the arrows move within it. In a form it is a field's control: put it in a `Field`, and `required` and `invalid` work as they do there.
 */
export function SegmentedControl({ value, defaultValue, onValueChange, className, children, fullWidth = false, required: requiredProp, requiredLabel, invalid: invalidProp, ...props }: SegmentedControlProps) {
  // Always controlled underneath: pressing the selected segment again leaves it selected. With no value there is no segment pressed.
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  const [direction, setDirection] = React.useState<"" | "forward" | "back">("");
  const [inside, setInside] = React.useState(false);
  const field = React.useContext(FieldGroupContext);
  const hidden = React.useId();
  const required = requiredProp ?? field?.required ?? false;
  const invalid = invalidProp ?? field?.invalid ?? false;
  const word = requiredLabel ?? field?.requiredLabel ?? "Required";
  const items = React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ value?: string; disabled?: boolean }>(child) && child.props.value ? [{ value: child.props.value, disabled: Boolean(child.props.disabled) }] : [],
  );
  const order = items.map((item) => item.value);
  const chosenItem = items.find((item) => item.value === current && !item.disabled);
  const stop = inside || props.disabled ? undefined : (chosenItem ?? items.find((item) => !item.disabled))?.value;
  // The name: a `Field`'s label names the group (a `<label for>` cannot), with the word after it when required, said in a hidden span the name refers to; without one, `aria-label` and the word.
  const named = field && !props["aria-label"] && !props["aria-labelledby"];
  const labelledby = named ? (required ? `${field.labelId} ${hidden}` : field.labelId) : props["aria-labelledby"];
  const label = !named && required && props["aria-label"] && !props["aria-labelledby"] ? `${props["aria-label"]}, ${word}` : props["aria-label"];
  const describedby = [field?.descriptionId, invalid ? field?.errorId : undefined, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return (
    <SegmentStop.Provider value={stop}>
    <ToggleGroup
      {...props}
      aria-label={label}
      aria-labelledby={labelledby}
      aria-describedby={describedby}
      aria-invalid={invalid || undefined}
      data-direction={direction || undefined}
      data-full-width={fullWidth ? "" : undefined}
      onFocus={(event) => { props.onFocus?.(event); setInside(true); }}
      onBlur={(event) => { props.onBlur?.(event); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInside(false); }}
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
      {named && required ? <span id={hidden} aria-hidden="true" className="basalt-visually-hidden">{`, ${word}`}</span> : null}
    </ToggleGroup>
    </SegmentStop.Provider>
  );
}

export interface SegmentProps extends PartProps<"button", "value"> {
  value: string;
  disabled?: boolean;
  nativeButton?: boolean;
}

export function Segment({ className, children, value, ...props }: SegmentProps) {
  // As a Tab: the label is 400 at rest and 600 once chosen and reserves its 600 width, whatever it is, and an icon follows the choice.
  // The group's one tab stop is the chosen segment: while focus is outside the group, the others are out of the Tab order whatever the roving focus last held.
  const stop = React.useContext(SegmentStop);
  return <Toggle {...props} {...(stop === undefined ? {} : { tabIndex: stop === value ? 0 : -1 })} value={value} className={withClass("basalt-segment", className)}><ChosenLabel>{children}</ChosenLabel></Toggle>;
}
