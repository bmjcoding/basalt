import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

import { Icon } from "./icon";
import { Spinner } from "./spinner";
import type { IconComponent, PartProps } from "./types";
import { withClass } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ControlSize = "xs" | "sm" | "md" | "lg" | "xl";

type BaseProps = Omit<PartProps<"button">, "children"> & {
  /** Set to false when `render` produces something other than a native `<button>`, such as a link. */
  nativeButton?: boolean;
  /** Stay focusable while disabled, so a keyboard user can still reach it and read why. */
  focusableWhenDisabled?: boolean;
  variant?: ButtonVariant;
  /** Control height: 24, 28, 32, 36 or 40px. md (32px) is the app default. */
  size?: ControlSize;
  /** Shows a spinner and ignores activation. The label stays, so the width does not jump. */
  loading?: boolean;
};

export type ButtonProps = BaseProps & {
  /** An icon before the label. */
  icon?: IconComponent;
  /** An icon after the label, e.g. a caret. */
  iconEnd?: IconComponent;
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
        // Busy is not activation: stop a form submit or a link's navigation as well as the handler.
        if (loading) {
          event.preventDefault();
          return;
        }
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
  icon: IconComponent;
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
        // Busy is not activation: stop a form submit or a link's navigation as well as the handler.
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      <Icon icon={icon} size={iconSize(size)} />
      {loading ? <span className="basalt-button-spinner" aria-hidden="true"><Spinner size={size === "xl" ? 20 : 16} /></span> : null}
    </BaseButton>
  );
}
