import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { Icon } from "./icon";
import { NewTabGlyph, NewTabWords, newTabRender, newTabWords } from "./new-tab";
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
  /** Control height: 24, 28, 32, 36 or 40px. md (32px) is the app default. */
  size?: ControlSize;
  /** Shows a spinner and ignores activation. The label stays, so the width does not jump. */
  loading?: boolean;
  /**
   * The words a button rendered as a link with `target="_blank"` adds to its name, for translation. Default
   * "(opens in a new tab)". The arrow and the words come from the target alone; there is no prop for them.
   */
  newTabLabel?: string;
};

/**
 * A toggle: `pressed` writes `aria-pressed`. Only secondary and ghost buttons toggle (a latched primary would read as the
 * primary action, a latched danger as an error); on those two `pressed` is a type error.
 */
type Toggle = { variant?: "secondary" | "ghost"; pressed?: boolean } | { variant: "primary" | "danger"; pressed?: never };

export type ButtonProps = BaseProps &
  Toggle & {
    /** An icon before the label. On a toggle it is the toggle's glyph: pressed shows its selected form, and the toggle carries no check. */
    icon?: IconComponent;
    /** An icon after the label, e.g. a caret. A button that opens a new tab has no other trailing icon, so this is ignored there. */
    iconEnd?: IconComponent;
    /** `icon` is a long-tail glyph that keeps its silhouette when filled, so a pressed toggle may fill it. A core glyph needs no mark. */
    fillSafe?: boolean;
    children: React.ReactNode;
  };

const iconSize = (size: ControlSize) => (size === "xl" ? 20 : 16);

/** A button. Its label says what happens: "Deploy", not "OK". */
export function Button({ variant = "secondary", size = "md", icon, iconEnd, fillSafe, pressed, loading = false, disabled, onClick, className, children, newTabLabel, render, ...props }: ButtonProps) {
  // A button rendered as a link that opens a new tab draws the arrow in its trailing slot and says so in its name.
  const link = newTabRender(render);
  const toggles = (variant === "secondary" || variant === "ghost") && (pressed !== undefined || props["aria-pressed"] !== undefined);
  const isPressed = toggles && (pressed ?? (props["aria-pressed"] === true || props["aria-pressed"] === "true"));
  return (
    <BaseButton
      {...props}
      render={link.render}
      disabled={disabled}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      aria-pressed={toggles ? isPressed : undefined}
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
      {icon ? <Icon icon={icon} size={iconSize(size)} selected={isPressed} fillSafe={fillSafe} /> : null}
      {/* A text toggle's 16px seat holds the check while pressed and is empty while not, so both are one width. */}
      {toggles && !icon ? <span className="basalt-button-check" aria-hidden="true"><Icon icon={CheckGlyph} size={16} /></span> : null}
      <span className="basalt-button-label">
        {children}
        {link.newTab ? <NewTabWords label={newTabLabel} /> : null}
      </span>
      {link.newTab ? <NewTabGlyph size={iconSize(size)} /> : iconEnd ? <Icon icon={iconEnd} size={iconSize(size)} /> : null}
      {loading ? <span className="basalt-button-spinner" aria-hidden="true"><Spinner size={size === "xl" ? 20 : 16} /></span> : null}
    </BaseButton>
  );
}

export type IconButtonProps = BaseProps &
  Toggle & {
    icon: IconComponent;
    /** `icon` is a long-tail glyph that keeps its silhouette when filled, so a pressed toggle may fill it. A core glyph needs no mark. */
    fillSafe?: boolean;
    /** Required: an icon-only button has no visible text, so this is its name. Also shown as its tooltip by convention. For a button that opens a new tab, the words are added to it. */
    label: string;
  };

/** A square button with only an icon. As a toggle it has no check: the plate, the ink step and the glyph's selected form say pressed. */
export function IconButton({ variant = "ghost", size = "md", icon, fillSafe, pressed, label, loading = false, disabled, onClick, className, newTabLabel, render, ...props }: IconButtonProps) {
  const link = newTabRender(render);
  const toggles = (variant === "secondary" || variant === "ghost") && (pressed !== undefined || props["aria-pressed"] !== undefined);
  const isPressed = toggles && (pressed ?? (props["aria-pressed"] === true || props["aria-pressed"] === "true"));
  return (
    <BaseButton
      {...props}
      render={link.render}
      disabled={disabled}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      aria-pressed={toggles ? isPressed : undefined}
      aria-label={link.newTab ? `${label}${newTabWords(newTabLabel)}` : label}
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
      <Icon icon={icon} size={iconSize(size)} selected={isPressed} fillSafe={fillSafe} />
      {loading ? <span className="basalt-button-spinner" aria-hidden="true"><Spinner size={size === "xl" ? 20 : 16} /></span> : null}
    </BaseButton>
  );
}
