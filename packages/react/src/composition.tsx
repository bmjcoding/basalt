import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { Separator as BaseSeparator } from "@base-ui/react/separator";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Icon } from "./icon";
import { join, withClass } from "./utils";

export function Separator({ className, ...props }: React.ComponentProps<typeof BaseSeparator>) {
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
  icon?: PhosphorIcon;
  actions?: React.ReactNode;
}

/** Guidance when a view has no content; never announced as an error on initial load. */
export function EmptyState({ title, description, icon, actions, children, className, ...props }: EmptyStateProps) {
  const id = React.useId();
  return (
    <section {...props} aria-labelledby={id} className={join("basalt-empty-state", className)}>
      {icon ? <Icon icon={icon} size={24} className="basalt-empty-state-icon" /> : null}
      <h2 id={id} className="basalt-empty-state-title">{title}</h2>
      {description ? <p className="basalt-empty-state-description">{description}</p> : null}
      {children}
      {actions ? <div className="basalt-empty-state-actions">{actions}</div> : null}
    </section>
  );
}

export type TextSize = "xs" | "sm" | "base" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
export type TextTone = "primary" | "secondary" | "tertiary" | "inherit";
export type TextWeight = "regular" | "medium" | "semibold";

function typeStyle(size: TextSize, weight: TextWeight): React.CSSProperties {
  return { "--_basalt-type-size": `var(--basalt-text-${size}-size)`, "--_basalt-type-line": `var(--basalt-text-${size}-line-height)`, "--_basalt-type-tracking": `var(--basalt-text-${size}-tracking)`, "--_basalt-type-weight": `var(--basalt-font-weight-${weight})` } as React.CSSProperties;
}

export interface TextProps extends React.ComponentProps<"p"> {
  as?: "p" | "span" | "div";
  size?: TextSize;
  tone?: TextTone;
  weight?: TextWeight;
  mono?: boolean;
}

export function Text({ as = "p", size = "base", tone = "primary", weight = "regular", mono = false, className, style, ...props }: TextProps) {
  return React.createElement(as, { ...props, "data-tone": tone, "data-mono": mono ? "" : undefined, className: join("basalt-text", className), style: { ...typeStyle(size, weight), ...style } });
}

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: TextSize;
  ref?: React.Ref<HTMLHeadingElement>;
}

/** Heading level is document structure; size is its visual role. */
export function Heading({ level = 2, size = "2xl", className, style, ...props }: HeadingProps) {
  return React.createElement(`h${level}`, { ...props, className: join("basalt-heading", className), style: { ...typeStyle(size, "semibold"), ...style } });
}

export function InlineCode({ className, ...props }: React.ComponentProps<"code">) {
  return <code {...props} className={join("basalt-inline-code", className)} />;
}
