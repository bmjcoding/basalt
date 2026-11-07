import { Button as BaseButton } from "@base-ui/react/button";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Icon } from "./icon";
import { Spinner } from "./spinner";
import { withClass } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ControlSize = "xs" | "sm" | "md" | "lg" | "xl";

type BaseProps = Omit<React.ComponentProps<typeof BaseButton>, "children"> & {
  variant?: ButtonVariant;
  /** Control height: 24, 28, 32, 36 or 40px. md (32px) is the app default. */
  size?: ControlSize;
  /** Shows a spinner and ignores activation. The label stays, so the width does not jump. */
  loading?: boolean;
};

export type ButtonProps = BaseProps & {
  /** An icon before the label. */
  icon?: PhosphorIcon;
  /** An icon after the label, e.g. a caret. */
  iconEnd?: PhosphorIcon;
  children: React.ReactNode;
};

const iconSize = (size: ControlSize) => (size === "xl" ? 20 : 16);

/** A button. Its label says what happens: "Deploy", not "OK". */
export function Button({ variant = "secondary", size = "md", icon, iconEnd, loading = false, disabled, onClick, className, children, ...props }: ButtonProps) {
  return (
    <BaseButton
      {...props}
      disabled={disabled}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading ? "" : undefined}
      data-variant={variant}
      data-size={size}
      className={withClass("basalt-button", className)}
      onClick={(event) => {
        if (loading) return;
        onClick?.(event);
      }}
    >
      {icon ? <Icon icon={icon} size={iconSize(size)} /> : null}
      <span className="basalt-button-label">{children}</span>
      {iconEnd ? <Icon icon={iconEnd} size={iconSize(size)} /> : null}
      {loading ? <span className="basalt-button-spinner" aria-hidden="true"><Spinner size={size === "xl" ? 20 : 16} /></span> : null}
    </BaseButton>
  );
}

export type IconButtonProps = BaseProps & {
  icon: PhosphorIcon;
  /** Required: an icon-only button has no visible text, so this is its name. Also shown as its tooltip by convention. */
  label: string;
};

/** A square button with only an icon. */
export function IconButton({ variant = "ghost", size = "md", icon, label, loading = false, disabled, onClick, className, ...props }: IconButtonProps) {
  return (
    <BaseButton
      {...props}
      disabled={disabled}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      aria-label={label}
      data-loading={loading ? "" : undefined}
      data-variant={variant}
      data-size={size}
      data-icon-only=""
      className={withClass("basalt-button", className)}
      onClick={(event) => {
        if (loading) return;
        onClick?.(event);
      }}
    >
      <Icon icon={icon} size={iconSize(size)} />
      {loading ? <span className="basalt-button-spinner" aria-hidden="true"><Spinner size={size === "xl" ? 20 : 16} /></span> : null}
    </BaseButton>
  );
}
