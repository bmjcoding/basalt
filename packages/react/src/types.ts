// Basalt's own public types. Components wrap Base UI, but a signature in `dist/*.d.ts` never
// names it: an app's type-check would compile a dependency's thousands of declarations to
// type a Button. Only React's types appear here.
import type * as React from "react";

/** What a component reports to `className`, `style` and `render` callbacks, e.g. `{ checked: true }`. */
export interface PartState {
  // `any`, so a primitive's own state type (an interface) is assignable without a cast.
  readonly [key: string]: any;
}

export type PartClassName = string | ((state: PartState) => string | undefined) | undefined;
export type PartStyle = React.CSSProperties | ((state: PartState) => React.CSSProperties | undefined) | undefined;
/** Replace the rendered element: an element to clone, or a function from the merged props. */
export type PartRender = React.ReactElement | ((props: React.HTMLAttributes<HTMLElement>, state: PartState) => React.ReactElement) | undefined;

/** The props of an element, with `className` and `style` also taking a function of the component's state, and `render`. */
export type PartProps<Tag extends keyof React.JSX.IntrinsicElements, Omitted extends string = never> = Omit<React.ComponentPropsWithRef<Tag>, "className" | "style" | Omitted> & {
  className?: PartClassName;
  style?: PartStyle;
  render?: PartRender;
};

/** What a commit callback (the end of a drag, a settled number) learns: why it happened. */
export interface CommitDetails {
  readonly reason: string;
  readonly event: Event;
}

/** What a change callback learns about the change: why it happened, and a way to veto it. */
export interface ChangeDetails extends CommitDetails {
  readonly isCanceled: boolean;
  readonly trigger: Element | undefined;
  cancel(): void;
  allowPropagation(): void;
}

/** What an open/close callback also learns: it may hold the popup mounted while an outside animation plays, then call `actions.unmount()`. */
export interface OpenChangeDetails extends ChangeDetails {
  preventUnmountOnClose(): void;
}

/** What a form's submit callback learns. It is not cancellable: the values are already valid. */
export interface SubmitDetails {
  readonly reason: string;
  readonly event: Event;
}

/** What a highlight callback learns: how the highlight moved. */
export interface HighlightDetails {
  readonly reason: string;
  readonly event: Event;
}

/** Imperative handles a popup offers through `actionsRef`. */
export interface PopupActions {
  /** Ends the closing phase after an animation you ran yourself; call `details.preventUnmountOnClose()` first. */
  unmount(): void;
  close(): void;
}

/** `actionsRef` of a form or field: validate on demand, e.g. before a multi-step form moves on. */
export interface ValidateActions {
  validate(fieldName?: string): void;
}

/** What `initialFocus` and `finalFocus` accept: `true` for the default, `false` for none, an element or ref, or a function that picks one. */
export type FocusTarget = boolean | React.RefObject<HTMLElement | null> | ((interaction: string) => boolean | HTMLElement | null | void);

/** A value a choice can take: a string, or a number when the app's own ids are numbers. */
export type ChoiceValue = string | number;

export type Side = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
export type Align = "start" | "center" | "end";
export type Orientation = "horizontal" | "vertical";

/**
 * An icon component, e.g. one from Phosphor (`@phosphor-icons/react`) or any component that
 * draws an SVG at a size and weight. Declared here so Basalt needs no icon package's types.
 */
export type IconComponent = React.ComponentType<IconGlyphProps>;

export interface IconGlyphProps {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
  focusable?: "true" | "false" | boolean;
  role?: React.AriaRole;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

// ---- Placement: what a popup's positioner takes beyond `side` and `align` ----

/** A rectangle in viewport coordinates, as `getBoundingClientRect()` returns it. */
export interface PlacementRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Something that is not an element but has a place: a popup can be positioned against it. `contextElement` is the element whose scrolling ancestors it follows. */
export interface VirtualAnchor {
  getBoundingClientRect(): PlacementRect;
  getClientRects?: (() => PlacementRect[]) | undefined;
  contextElement?: Element | undefined;
}

/** What a popup is positioned against, in place of its trigger: an element, a ref to one, a virtual anchor, or a function that returns one. */
export type PlacementAnchor = Element | null | VirtualAnchor | React.RefObject<Element | null> | (() => Element | VirtualAnchor | null);

/** What an offset function learns: where the popup is, and the sizes of the anchor and of the popup. */
export interface PlacementData {
  readonly side: Side;
  readonly align: Align;
  readonly anchor: { readonly width: number; readonly height: number };
  readonly positioner: { readonly width: number; readonly height: number };
}

/** A distance in pixels, or a function of the placement that returns one. */
export type PlacementOffset = number | ((data: PlacementData) => number);

/** What to do about the popup running out of room. `side` is the axis it was asked to sit on; `align` is along it. */
export type CollisionAvoidance =
  | { side?: "flip" | "none" | undefined; align?: "flip" | "shift" | "none" | undefined; fallbackAxisSide?: "start" | "end" | "none" | undefined }
  | { side?: "shift" | "none" | undefined; align?: "shift" | "none" | undefined; fallbackAxisSide?: "start" | "end" | "none" | undefined };

/** The area a popup is kept inside: its clipping ancestors (the default), an element, several elements, or a rectangle. */
export type CollisionBoundary = "clipping-ancestors" | Element | Element[] | { x: number; y: number; width: number; height: number };

/** Space kept from the boundary's edge: one number, or one per side. */
export type CollisionPadding = number | { top?: number | undefined; right?: number | undefined; bottom?: number | undefined; left?: number | undefined };

/** Where a popup sits, beyond `side`, `align` and `sideOffset`. Each is optional; left out, the popup is placed as it was. */
export interface PlacementProps {
  /** Position against this instead of the trigger. */
  anchor?: PlacementAnchor;
  /** Distance along the alignment axis, in pixels, or a function of the placement. */
  alignOffset?: PlacementOffset;
  collisionAvoidance?: CollisionAvoidance;
  collisionBoundary?: CollisionBoundary;
  /** Space kept from the boundary's edge. Base UI's default is 5. */
  collisionPadding?: CollisionPadding;
  /** Keep the popup in view after its anchor has scrolled out of it. */
  sticky?: boolean;
}

// ---- Popover handle ----

/**
 * What `createPopoverHandle()` returns: it joins one `Popover` to triggers rendered anywhere, each with its own `payload`.
 * Opaque: pass it as `handle` to the `Popover` and to every `PopoverTrigger`. `Payload` is what a trigger carries.
 */
export interface PopoverHandle<Payload = unknown> {
  /** Opens the popover from the trigger with this `id`. Call it from an event handler or an effect, once a `Popover` using this handle is mounted. */
  open(triggerId: string): void;
  close(): void;
  /** False while no `Popover` is mounted with this handle. */
  readonly isOpen: boolean;
  /** Type only: what the triggers carry. Never set. */
  readonly "~payload"?: Payload;
}
