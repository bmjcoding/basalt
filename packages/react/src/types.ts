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
