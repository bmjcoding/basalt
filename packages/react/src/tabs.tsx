import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import * as React from "react";

import { ChosenLabel } from "./chosen";
import { FieldGroupContext } from "./field-group";
import { useMergedRef } from "./merged-ref";
import { Pill } from "./pill";
import { revealIn } from "./scroll-reveal";
import type { ChangeDetails, ChoiceValue, Orientation, PartProps } from "./types";
import { join, withClass } from "./utils";

const TabsMotion = /* @__PURE__ */ React.createContext<{
  order: React.MutableRefObject<string[]>;
  previous: React.MutableRefObject<string | null>;
} | null>(null);

const TabsOrientation = /* @__PURE__ */ React.createContext<Orientation | undefined>(undefined);
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
  // The underline is as wide as the chosen tab's content (its label, icon and count), never its padding (DECISIONS 358). The chosen tab's
  // physical insets to its content are written on the list (--_line-left, --_line-right), which the indicator reads. They are measured again
  // when the choice moves, when the chosen tab changes size (fonts arriving) and when the direction flips; until then the padding stands in.
  React.useLayoutEffect(() => {
    const element = list.current;
    if (!element || orientation === "vertical") return undefined;
    let watched: Element | null = null;
    const sizes = new ResizeObserver(() => measure());
    const measure = () => {
      const tab = element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (tab !== watched) {
        if (watched) sizes.unobserve(watched);
        if (tab) sizes.observe(tab);
        watched = tab;
      }
      if (!tab || !tab.firstChild) {
        element.style.removeProperty("--_line-left");
        element.style.removeProperty("--_line-right");
        return;
      }
      const range = element.ownerDocument.createRange();
      range.setStartBefore(tab.firstChild);
      range.setEndAfter(tab.lastChild as Node);
      const content = range.getBoundingClientRect();
      const box = tab.getBoundingClientRect();
      element.style.setProperty("--_line-left", `${content.left - box.left}px`);
      element.style.setProperty("--_line-right", `${box.right - content.right}px`);
    };
    measure();
    const choice = new MutationObserver(measure);
    choice.observe(element, { attributes: true, attributeFilter: ["aria-selected"], subtree: true });
    return () => {
      choice.disconnect();
      sizes.disconnect();
      element.style.removeProperty("--_line-left");
      element.style.removeProperty("--_line-right");
    };
  }, [orientation, flips]);
  // A horizontal row scrolls in its own port (cimip-gaps-3 t4, item 6): a tab that takes focus, the chosen tab when the choice changes (a press, a key, a
  // controlled value) and the chosen tab on first layout are brought whole into view, space-6 clear (their `scroll-margin-inline`), at once. The port's
  // scroll is set by hand from the two boxes' rects, so the window never moves and no sign of `scrollLeft` is assumed (right to left included).
  const port = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    const scroller = port.current;
    const element = list.current;
    if (!scroller || !element || orientation === "vertical") return undefined;
    const reveal = (tab: Element | null) => revealIn(scroller, tab);
    const chosen = () => element.querySelector('[role="tab"][aria-selected="true"]');
    reveal(chosen());
    const onFocus = (event: FocusEvent) => reveal((event.target as Element | null)?.closest('[role="tab"]') ?? null);
    element.addEventListener("focusin", onFocus);
    const choice = new MutationObserver(() => reveal(chosen()));
    choice.observe(element, { attributes: true, attributeFilter: ["aria-selected"], subtree: true });
    return () => {
      element.removeEventListener("focusin", onFocus);
      choice.disconnect();
    };
  }, [orientation]);
  const row = (
    <BaseTabs.List {...props} ref={setRef} className={withClass("basalt-tabs-list", className)}>
      {/* A vertical list is a column of pills in a track: one pill slides to the chosen tab, as the segmented control's does.
          The horizontal bar's mark is the underline, which slides on its own. */}
      {orientation === "vertical" ? <Pill /> : null}
      {children}
      {orientation === "vertical" ? null : <BaseTabs.Indicator key={flips} className="basalt-tabs-indicator" />}
    </BaseTabs.List>
  );
  return orientation === "vertical" ? row : <div ref={port} className="basalt-tabs-scroll">{row}</div>;
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

const PanelsStacked = /* @__PURE__ */ React.createContext(false);

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
  /**
   * A radiogroup of radios instead of a group of pressed buttons (G25), drawn with the same pixels: the group is `role="radiogroup"`, each segment `role="radio"` with
   * `aria-checked`, and any of the four arrows (Home and End too) moves focus to the next segment that is not disabled and checks it, as radios do (looping unless `loopFocus={false}`). The segments may sit in a fragment or a wrapper. Tab still lands on the checked segment, or on the
   * first that can take focus while none is checked (and checks nothing). A required group takes `aria-required`, which a radiogroup can carry, in place of the word in its name.
   */
  radio?: boolean;
}

/** The value that holds the group's one tab stop while focus is outside it: undefined while focus is inside (the roving focus owns it) or when nothing can take it. */
const SegmentStop = /* @__PURE__ */ React.createContext<string | undefined>(undefined);
/** In a radio group, the checked value (`value` undefined while none is; the pressed one, so `aria-checked` and the drawn choice agree): each segment is a radio. `null` outside a radio group. */
const SegmentRadio = /* @__PURE__ */ React.createContext<{ value: string | undefined } | null>(null);
/** The keys that move a radio group's check: all four arrows, Home and End (a key predicate: nothing is built when the module loads). */
const isRovingKey = (key: string) => key === "ArrowRight" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowUp" || key === "Home" || key === "End";
/** A radio group's segments in the DOM, wherever they sit under it (a fragment or a wrapper of the app's own), each with its own value and whether it can take focus. */
function radiosIn(group: HTMLElement) {
  return Array.from(group.querySelectorAll<HTMLElement>(".basalt-segment[data-value]"))
    .filter((el) => el.closest(".basalt-segmented") === group)
    .map((el) => ({ el, value: el.dataset.value as string, disabled: (el as HTMLButtonElement).disabled || el.hasAttribute("data-disabled") }));
}

/** The segments of one track, wherever they sit under it (not a nested control's). */
function segmentsOf(track: HTMLElement) {
  return Array.from(track.querySelectorAll<HTMLElement>(".basalt-segment")).filter((el) => el.closest(".basalt-segmented") === track);
}

/**
 * A horizontal track wider than its column scrolls in itself (cimip-gaps-3 t4, item 6). `data-overflow` is set while the segments, with the track's padding, are
 * wider than the track's box (held to the column by `max-width: 100%`, so setting it changes no width and cannot flip back); the stylesheet hangs the scroll and the
 * inset ring on it. Measured at once (a layout effect, so a client render never paints the unclipped form), when the track or a segment resizes, when segments
 * come or go and when fonts arrive. While it overflows, the chosen segment, and a segment that takes focus, are brought whole into view, space-6 clear, at once.
 */
function watchOverflow(track: HTMLElement): () => void {
  const sizes = new ResizeObserver(() => measure());
  let watched: HTMLElement[] = [];
  const chosen = () => segmentsOf(track).find((el) => el.hasAttribute("data-pressed") || el.getAttribute("aria-checked") === "true") ?? null;
  const measure = () => {
    const segments = segmentsOf(track);
    for (const el of watched) if (!segments.includes(el)) sizes.unobserve(el);
    for (const el of segments) if (!watched.includes(el)) sizes.observe(el);
    watched = segments;
    let lo = Infinity;
    let hi = -Infinity;
    for (const el of segments) {
      const at = el.getBoundingClientRect();
      lo = Math.min(lo, at.left);
      hi = Math.max(hi, at.right);
    }
    const style = getComputedStyle(track);
    const need = segments.length ? hi - lo + (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0) : 0;
    const over = need > track.getBoundingClientRect().width + 0.5;
    if (over !== track.hasAttribute("data-overflow")) {
      if (over) track.setAttribute("data-overflow", "");
      else track.removeAttribute("data-overflow");
    }
    if (over) revealIn(track, chosen());
  };
  measure();
  sizes.observe(track);
  const changes = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList")) measure();
    else if (track.hasAttribute("data-overflow")) revealIn(track, chosen());
  });
  changes.observe(track, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-pressed", "aria-checked"] });
  const onFocus = (event: FocusEvent) => {
    if (track.hasAttribute("data-overflow")) revealIn(track, (event.target as Element | null)?.closest(".basalt-segment") ?? null);
  };
  track.addEventListener("focusin", onFocus);
  let live = true;
  document.fonts?.ready.then(() => { if (live) measure(); });
  return () => {
    live = false;
    sizes.disconnect();
    changes.disconnect();
    track.removeEventListener("focusin", onFocus);
    track.removeAttribute("data-overflow");
  };
}

/**
 * A single choice among a few options that filter or change the current view (a time
 * range, a layout). Use `Tabs` when each option has its own panel. The chosen segment's label is 600 in primary ink against
 * 400 in secondary at rest, each reserving the other's width so nothing moves; the raised pill and the ink step support it.
 * A segment with no label (an icon alone) draws its glyph's selected form. It is one tab stop: Tab lands on the chosen segment (on the first one that can
 * take focus while none is chosen), and the arrows move within it. In a form it is a field's control: put it in a `Field`, and `required` and `invalid` work as they do there.
 */
export function SegmentedControl({ value, defaultValue, onValueChange, className, children, fullWidth = false, required: requiredProp, requiredLabel, invalid: invalidProp, radio = false, loopFocus = true, ref, ...props }: SegmentedControlProps) {
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
  // A radio group's stop is its checked radio whatever wraps the segments (a fragment hides them from `items`), unless that radio is known to be disabled.
  const checkedStop = current !== undefined && !items.some((item) => item.value === current && item.disabled) ? current : undefined;
  const stop = inside || props.disabled ? undefined : radio ? (checkedStop ?? items.find((item) => !item.disabled)?.value) : (chosenItem ?? items.find((item) => !item.disabled))?.value;
  // The name: a `Field`'s label names the group (a `<label for>` cannot), with the word after it when required, said in a hidden span the name refers to; without one, `aria-label` and the word.
  // A radiogroup carries `aria-required` itself, so the word is added to its name only in a group of pressed buttons.
  const worded = required && !radio;
  const named = field && !props["aria-label"] && !props["aria-labelledby"];
  const labelledby = named ? (worded ? `${field.labelId} ${hidden}` : field.labelId) : props["aria-labelledby"];
  const label = !named && worded && props["aria-label"] && !props["aria-labelledby"] ? `${props["aria-label"]}, ${word}` : props["aria-label"];
  const describedby = [field?.descriptionId, invalid ? field?.errorId : undefined, props["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const group = React.useRef<HTMLDivElement | null>(null);
  const groupRef = useMergedRef(group, ref);
  const pick = (picked: string) => {
    if (picked === current) return;
    // A radio group reads its order from the DOM, so segments in a fragment or a wrapper still say which way the pill travels.
    const sequence = radio && group.current ? radiosIn(group.current).map((r) => r.value) : order;
    const from = current == null ? -1 : sequence.indexOf(current);
    const to = sequence.indexOf(picked);
    if (from >= 0 && to >= 0 && from !== to) setDirection(to > from ? "forward" : "back");
    setInner(picked);
    onValueChange?.(picked);
  };
  // A radio group moves by its own keys (the roving focus underneath is horizontal only): all four arrows, Home and End move focus to the next segment that can take
  // it, skipping a disabled one, and check it. The value and the disabled state are the reached segment's own, read from the DOM, whatever wraps it.
  const onRadioKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isRovingKey(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const radios = radiosIn(event.currentTarget).filter((r) => !r.disabled);
    if (!radios.length) return;
    event.preventDefault();
    event.stopPropagation();
    const at = radios.findIndex((r) => r.el === document.activeElement || r.el.contains(document.activeElement));
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = event.key === "ArrowDown" || event.key === (rtl ? "ArrowLeft" : "ArrowRight");
    let to: number;
    if (event.key === "Home") to = 0;
    else if (event.key === "End") to = radios.length - 1;
    else if (at < 0) to = forward ? 0 : radios.length - 1;
    else {
      to = at + (forward ? 1 : -1);
      if (to < 0 || to >= radios.length) to = loopFocus ? (to + radios.length) % radios.length : at;
    }
    const reached = radios[to];
    if (!reached) return;
    reached.el.focus();
    pick(reached.value);
  };
  const checked = React.useMemo(() => (radio ? { value: current } : null), [radio, current]);
  const vertical = props.orientation === "vertical";
  React.useLayoutEffect(() => {
    const track = group.current;
    if (!track || vertical) return undefined;
    return watchOverflow(track);
  }, [vertical]);
  return (
    <SegmentStop.Provider value={stop}>
    <SegmentRadio.Provider value={checked}>
    <ToggleGroup
      {...props}
      {...(radio ? { role: "radiogroup" } : {})}
      ref={groupRef}
      loopFocus={loopFocus}
      aria-label={label}
      aria-labelledby={labelledby}
      aria-describedby={describedby}
      aria-invalid={invalid || undefined}
      aria-required={radio && required ? true : undefined}
      data-direction={direction || undefined}
      data-full-width={fullWidth ? "" : undefined}
      onKeyDownCapture={radio ? (event) => { props.onKeyDownCapture?.(event); if (!event.isPropagationStopped()) onRadioKey(event); } : props.onKeyDownCapture}
      onFocus={(event) => { props.onFocus?.(event); setInside(true); }}
      onBlur={(event) => { props.onBlur?.(event); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInside(false); }}
      value={current === undefined ? [] : [current]}
      onValueChange={(next) => {
        const picked = next.find((item) => item !== current) as string | undefined;
        if (picked !== undefined) pick(picked);
      }}
      className={withClass("basalt-segmented", className)}
    >
      <Pill />
      {children}
      {named && worded ? <span id={hidden} aria-hidden="true" className="basalt-visually-hidden">{`, ${word}`}</span> : null}
    </ToggleGroup>
    </SegmentRadio.Provider>
    </SegmentStop.Provider>
  );
}

/** A segment's status dot: `neutral` is tertiary, `pending` a hollow ring in the label's ink, the rest their status colours. */
export type SegmentStatus = "neutral" | "success" | "warning" | "danger" | "pending";

export interface SegmentProps extends PartProps<"button", "value"> {
  value: string;
  disabled?: boolean;
  nativeButton?: boolean;
  /**
   * A 6px status dot before the label (Badge's dot), `space-1-5` from it (cimip-gaps-3 t4, item 3). The label names the state in words; the dot is
   * `aria-hidden`. Never on an icon-only segment (it is not drawn, and development warns). A segment without it keeps its natural width: no empty seat.
   */
  status?: SegmentStatus;
}

declare const process: { env: { NODE_ENV?: string } };
let warnedIconDot = false;

/** True when every child is an `Icon` (the one element with an `icon` prop): a segment with no words. */
function iconOnly(children: React.ReactNode) {
  const all = React.Children.toArray(children);
  return all.length > 0 && all.every((child) => React.isValidElement<{ icon?: unknown }>(child) && child.props.icon !== undefined);
}

export function Segment({ className, children, value, status, ...props }: SegmentProps) {
  // As a Tab: the label is 400 at rest and 600 once chosen and reserves its 600 width, whatever it is, and an icon follows the choice.
  // The group's one tab stop is the chosen segment: while focus is outside the group, the others are out of the Tab order whatever the roving focus last held.
  const stop = React.useContext(SegmentStop);
  // In a radio group the segment is a radio: `aria-checked` in place of `aria-pressed` (Base UI's own, which the props given after it replace). `data-value` is how the
  // group finds its segments and their order in the DOM, wherever they sit under it.
  const radio = React.useContext(SegmentRadio);
  const radioProps = radio ? { role: "radio", "aria-checked": radio.value === value, "aria-pressed": undefined, "data-value": value } : {};
  const bare = status !== undefined && iconOnly(children);
  if (process.env.NODE_ENV !== "production" && bare && !warnedIconDot) {
    warnedIconDot = true;
    console.warn("Basalt Segment: `status` needs words: the label names the state, and an icon-only segment draws no dot");
  }
  const dotted = status !== undefined && !bare;
  return (
    <Toggle {...props} {...radioProps} {...(stop === undefined ? {} : { tabIndex: stop === value ? 0 : -1 })} value={value} data-status={dotted ? status : undefined} className={withClass("basalt-segment", className)}>
      {dotted ? <span className="basalt-segment-dot" aria-hidden="true" /> : null}
      <ChosenLabel>{children}</ChosenLabel>
    </Toggle>
  );
}
