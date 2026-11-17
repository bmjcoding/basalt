import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { Separator as BaseSeparator } from "@base-ui/react/separator";
import * as React from "react";

import { Icon } from "./icon";
import type { IconComponent, Orientation, PartProps } from "./types";
import { join, withClass } from "./utils";

export interface SeparatorProps extends PartProps<"div"> {
  orientation?: Orientation;
}

export function Separator({ className, ...props }: SeparatorProps) {
  return <BaseSeparator {...props} className={withClass("basalt-separator", className)} />;
}

export interface AvatarProps extends React.ComponentProps<"span"> {
  name: string;
  src?: string;
  size?: 24 | 32 | 40 | 48;
  fallback?: React.ReactNode;
}

export function Avatar({ name, src, size = 32, fallback, className, style, ...props }: AvatarProps) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = [words[0], words.length > 1 ? words[words.length - 1] : undefined].filter(Boolean).map((word) => Array.from(word!)[0]).join("").toLocaleUpperCase();
  return (
    <BaseAvatar.Root {...props} role="img" aria-label={name} className={join("basalt-avatar", className)} style={{ width: size, height: size, ...style }}>
      {src ? <BaseAvatar.Image src={src} alt="" className="basalt-avatar-image" /> : null}
      <BaseAvatar.Fallback aria-hidden="true" className="basalt-avatar-fallback">{fallback ?? (initials || "?")}</BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}

export interface EmptyStateProps extends Omit<React.ComponentProps<"section">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: IconComponent;
  actions?: React.ReactNode;
  /** The title's heading level in the page outline; its size stays the same. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/** Guidance when a view has no content; never announced as an error on initial load. */
export function EmptyState({ title, description, icon, actions, headingLevel = 2, children, className, ...props }: EmptyStateProps) {
  const id = React.useId();
  return (
    <section {...props} aria-labelledby={id} className={join("basalt-empty-state", className)}>
      {icon ? <Icon icon={icon} size={24} className="basalt-empty-state-icon" /> : null}
      {React.createElement(`h${headingLevel}`, { id, className: "basalt-empty-state-title" }, title)}
      {description ? <p className="basalt-empty-state-description">{description}</p> : null}
      {children}
      {actions ? <div className="basalt-empty-state-actions">{actions}</div> : null}
    </section>
  );
}

/** The steps of the type scale, small to large. `6xl` and `7xl` are display steps: a page writes the roles below on a heading, never a fixed step on a phone. */
export type TextSize = "xs" | "sm" | "base" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl";
/**
 * The two display roles a heading takes (`Heading size`). Each is one name with three sizes that step at 720 and 1024 on the viewport and never
 * with its width: `"hero"` is 96/96, then 72/76 from 720 to 1023, then 44/48; `"display"` is 72/76, then 56/60, then 36/40.
 */
export type DisplayRole = "hero" | "display";
export type TextTone = "primary" | "secondary" | "tertiary" | "inherit";
export type TextWeight = "regular" | "medium" | "semibold";

/** Sizes of 20px and up: a new-tab arrow beside this text is drawn at 20px (see `.basalt-external` in the stylesheet). */
const LARGE: readonly (TextSize | DisplayRole)[] = ["xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "hero", "display"];
/** The sizes that wrap as display type: balanced, at most `size-display-measure` wide, and a break-word safety net. */
const DISPLAY: readonly (TextSize | DisplayRole)[] = ["6xl", "7xl", "hero", "display"];

function typeStyle(size: TextSize | DisplayRole, weight: TextWeight): React.CSSProperties {
  // A role's size is the derived property for this window's band (--basalt-hero-size); a step's is its token (--basalt-text-6xl-size).
  const name = size === "hero" || size === "display" ? `--basalt-${size}` : `--basalt-text-${size}`;
  return { ...(LARGE.includes(size) ? { "--_external-size": "var(--basalt-size-icon-md)" } : null), "--_basalt-type-size": `var(${name}-size)`, "--_basalt-type-line": `var(${name}-line-height)`, "--_basalt-type-tracking": `var(${name}-tracking)`, "--_basalt-type-weight": `var(--basalt-font-weight-${weight})` } as React.CSSProperties;
}

export interface TextProps extends React.ComponentProps<"p"> {
  as?: "p" | "span" | "div";
  /** A step of the scale. `"6xl"` and `"7xl"` wrap as display type; the roles `"hero"` and `"display"` are for a `Heading`. */
  size?: TextSize;
  tone?: TextTone;
  /** Regular by default; `"6xl"` and `"7xl"` are display type and default to semibold. */
  weight?: TextWeight;
  mono?: boolean;
  /** Tabular figures, so columns of numbers don't shift. */
  tabular?: boolean;
}

export function Text({ as = "p", size = "base", tone = "primary", weight, mono = false, tabular = false, className, style, ...props }: TextProps): React.JSX.Element {
  const display = DISPLAY.includes(size);
  // Display type is 600, as it is through Heading and as the skill's .text-6xl and .text-7xl are: a weight that is asked for still wins.
  return React.createElement(as, { ...props, "data-tone": tone, "data-mono": mono ? "" : undefined, "data-display": display ? "" : undefined, className: join("basalt-text", tabular && "basalt-tabular", className), style: { ...typeStyle(size, weight ?? (display ? "semibold" : "regular")), ...style } });
}

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * A step of the scale, or one of the two display roles: `"hero"` (a page's one `h1` when its first screen is type) and `"display"` (a section's
   * headline on a page set at display size, an inner page's `h1`). A role steps at 720 and 1024; a display size is 600, balanced, at most
   * `size-display-measure` wide, with no `<br>` (two sentences meant as two lines are two `<span className="basalt-text-line">` blocks).
   */
  size?: TextSize | DisplayRole;
  ref?: React.Ref<HTMLHeadingElement>;
}

/** Heading level is document structure; size is its visual role. */
export function Heading({ level = 2, size = "2xl", className, style, ...props }: HeadingProps): React.JSX.Element {
  return React.createElement(`h${level}`, { ...props, "data-display": DISPLAY.includes(size) ? "" : undefined, className: join("basalt-heading", className), style: { ...typeStyle(size, "semibold"), ...style } });
}

export function InlineCode({ className, ...props }: React.ComponentProps<"code">) {
  return <code {...props} className={join("basalt-inline-code", className)} />;
}

export interface VisuallyHiddenProps extends React.ComponentProps<"span"> {
  as?: "span" | "div" | "p";
}

/**
 * Text for assistive technology only: it is in the accessibility tree and takes no room on screen (the `.basalt-visually-hidden`
 * class, which an element can also carry itself). Use it for what the eye gets from layout, such as the word "to" between two
 * times; never for the only copy of a control's label that sighted people also need.
 */
export function VisuallyHidden({ as = "span", className, ...props }: VisuallyHiddenProps) {
  return React.createElement(as, { ...props, className: join("basalt-visually-hidden", className) });
}
