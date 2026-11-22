import { Menu as BaseMenu } from "@base-ui/react/menu";
import * as React from "react";

import { CheckGlyph } from "./glyphs/check";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { Icon } from "./icon";
import { Kbd } from "./kbd";
import { GlidePlate } from "./plate";
import { useApplePlatform } from "./keyboard";
import { ariaShortcut, shortcutKeys, spokenShortcut } from "./shortcut";
import type { Align, ChangeDetails, ChoiceValue, FocusTarget, HighlightDetails, IconComponent, OpenChangeDetails, PartProps, PlacementOffset, PlacementProps, PopupActions, Side } from "./types";
import { join, withClass } from "./utils";
import { inLevel, useFloatingLayer, usePopupLevel } from "./layers";

export interface MenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  /** Called after the open or close transition has finished. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Called as the highlight moves; `undefined` when nothing is highlighted. `details.label` is the row's text. */
  onItemHighlighted?: (item: HTMLElement | undefined, details: HighlightDetails & { readonly label: string | undefined }) => void;
  /** Imperative handle: `unmount()` ends a closing animation you ran yourself (call `details.preventUnmountOnClose()` first); `close()` closes. */
  actionsRef?: React.RefObject<PopupActions | null>;
  /** Which trigger the menu belongs to when it has several: the `id` of one `MenuTrigger`. Use with `open`. */
  triggerId?: string | null;
  defaultTriggerId?: string | null;
  /** Lock page scroll and make the rest of the page inert while open. On by default. */
  modal?: boolean;
  disabled?: boolean;
  /** Wrap from the last item back to the first. On by default. */
  loopFocus?: boolean;
  highlightItemOnHover?: boolean;
  orientation?: "horizontal" | "vertical";
  closeParentOnEsc?: boolean;
  children?: React.ReactNode;
}

/** A menu of actions. Compose `Menu`, `MenuTrigger`, `MenuContent` and `MenuItem`s. */
export function Menu(props: MenuProps) {
  return <BaseMenu.Root {...props} />;
}

export interface MenuTriggerProps extends PartProps<"button"> {
  nativeButton?: boolean;
  disabled?: boolean;
  /** Open when hovered, as well as when pressed. */
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
}

export function MenuTrigger({ className, ...props }: MenuTriggerProps) {
  return <BaseMenu.Trigger {...props} className={withClass("basalt-menu-trigger", className)} />;
}

export interface MenuContentProps extends PartProps<"div">, PlacementProps {
  side?: Side;
  align?: Align;
  /** Distance from the anchor, in pixels, or a function of the placement. 6 by default. */
  sideOffset?: PlacementOffset;
  /** Where focus goes on close. By default, back to the trigger. */
  finalFocus?: FocusTarget;
}

/** The floating panel: portalled, positioned against the trigger, and dismissed on Esc or outside click. */
export function MenuContent({ side = "bottom", align = "start", sideOffset = 6, anchor, alignOffset, collisionAvoidance, collisionBoundary, collisionPadding, sticky, className, children, ...props }: MenuContentProps) {
  const layer = useFloatingLayer();
  // One level above whatever opened it (floor 1, cap 3); its own submenus go one deeper.
  const level = usePopupLevel();
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner side={side} align={align} sideOffset={sideOffset} anchor={anchor} alignOffset={alignOffset} collisionAvoidance={collisionAvoidance} collisionBoundary={collisionBoundary} collisionPadding={collisionPadding} sticky={sticky} style={layer} className="basalt-positioner">
        <BaseMenu.Popup {...props} data-level={level} className={withClass("basalt-menu", className)}><GlidePlate />{inLevel(level, children)}</BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export interface MenuRowProps extends PartProps<"div"> {
  nativeButton?: boolean;
  disabled?: boolean;
  /** Text for type-to-select, when the children aren't plain text. */
  label?: string;
  /** Close the menu when the row is chosen. On for items, off for checkboxes and radios. */
  closeOnClick?: boolean;
}

export interface MenuItemProps extends MenuRowProps {
  /**
   * A second line under the label: 13/18, tertiary at rest, one line, cut with an ellipsis. Use it only when the label alone can't tell
   * the choices apart (a visibility, a role, a plan); never to explain an obvious action. It is part of the row's name, after the label.
   * A menu with a described row is as wide as its content, up to `size-popover-max`.
   */
  description?: string;
  icon?: IconComponent;
  /**
   * A real keyboard shortcut shown at the end of the row, e.g. "⌘D": one per row, and only if the app
   * binds it. The row carries it for assistive technology; the chips are decoration.
   */
  shortcut?: string;
  /** A destructive action: shown in the danger colour. */
  danger?: boolean;
}

export function MenuItem({ icon, shortcut, danger, description, className, children, label, "aria-describedby": describedBy, ...props }: MenuItemProps) {
  const spoken = React.useId();
  const apple = useApplePlatform();
  const keys = shortcut ? shortcutKeys(shortcut, apple) : [];
  return (
    <BaseMenu.Item
      {...props}
      label={label ?? (typeof children === "string" ? children : undefined)}
      aria-keyshortcuts={keys.length ? ariaShortcut(keys) : undefined}
      aria-describedby={keys.length ? join(describedBy, spoken) : describedBy}
      data-danger={danger ? "" : undefined}
      data-described={description ? "" : undefined}
      data-lead={icon ? "" : undefined}
      className={withClass("basalt-menu-item", className)}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      <span className="basalt-menu-item-label">{children}</span>
      {description ? <span className="basalt-menu-item-description">{description}</span> : null}
      {shortcut ? (
        <>
          <Kbd shortcut aria-hidden="true" className="basalt-menu-item-shortcut">{shortcut}</Kbd>
          <span id={spoken} hidden>{spokenShortcut(keys)}</span>
        </>
      ) : null}
    </BaseMenu.Item>
  );
}

export interface MenuSeparatorProps extends PartProps<"div"> {
  orientation?: "horizontal" | "vertical";
}

export function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return <BaseMenu.Separator {...props} className={withClass("basalt-menu-separator", className)} />;
}

export function MenuGroup(props: PartProps<"div">) {
  return <BaseMenu.Group {...props} />;
}

export function MenuGroupLabel({ className, ...props }: PartProps<"div">) {
  return <BaseMenu.GroupLabel {...props} className={withClass("basalt-menu-group-label", className)} />;
}

export interface MenuCheckboxItemProps extends MenuRowProps {
  /**
   * A second line under the label: 13/18, tertiary at rest, one line, cut with an ellipsis. Use it only when the label alone can't tell
   * the choices apart (a visibility, a role, a plan); never to explain an obvious action. It is part of the row's name, after the label.
   * A menu with a described row is as wide as its content, up to `size-popover-max`.
   */
  description?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, details: ChangeDetails) => void;
}

export function MenuCheckboxItem({ className, children, description, ...props }: MenuCheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem {...props} data-described={description ? "" : undefined} data-lead="" className={withClass("basalt-menu-item", className)}>
      <span className="basalt-menu-check"><BaseMenu.CheckboxItemIndicator><Icon icon={CheckGlyph} /></BaseMenu.CheckboxItemIndicator></span>
      <span className="basalt-menu-item-label">{children}</span>
      {description ? <span className="basalt-menu-item-description">{description}</span> : null}
    </BaseMenu.CheckboxItem>
  );
}

export interface MenuRadioGroupProps<Value extends ChoiceValue = string> extends PartProps<"div", "defaultValue"> {
  value?: Value;
  defaultValue?: Value;
  onValueChange?: (value: Value, details: ChangeDetails) => void;
  disabled?: boolean;
}

export function MenuRadioGroup<Value extends ChoiceValue = string>(props: MenuRadioGroupProps<Value>) {
  return <BaseMenu.RadioGroup {...props} />;
}

export interface MenuRadioItemProps extends MenuRowProps {
  /**
   * A second line under the label: 13/18, tertiary at rest, one line, cut with an ellipsis. Use it only when the label alone can't tell
   * the choices apart (a visibility, a role, a plan); never to explain an obvious action. It is part of the row's name, after the label.
   * A menu with a described row is as wide as its content, up to `size-popover-max`.
   */
  description?: string;
  value: ChoiceValue;
}

export function MenuRadioItem({ className, children, description, ...props }: MenuRadioItemProps) {
  return (
    <BaseMenu.RadioItem {...props} data-described={description ? "" : undefined} data-lead="" className={withClass("basalt-menu-item", className)}>
      <span className="basalt-menu-check"><BaseMenu.RadioItemIndicator><span className="basalt-menu-radio-dot" /></BaseMenu.RadioItemIndicator></span>
      <span className="basalt-menu-item-label">{children}</span>
      {description ? <span className="basalt-menu-item-description">{description}</span> : null}
    </BaseMenu.RadioItem>
  );
}

export interface MenuSubmenuProps extends Omit<MenuProps, "modal"> {}

export function MenuSubmenu(props: MenuSubmenuProps) {
  return <BaseMenu.SubmenuRoot {...props} />;
}

export interface MenuSubmenuTriggerProps extends MenuRowProps {
  openOnHover?: boolean;
  delay?: number;
  closeDelay?: number;
}

export function MenuSubmenuTrigger({ className, children, ...props }: MenuSubmenuTriggerProps) {
  return (
    <BaseMenu.SubmenuTrigger {...props} className={withClass("basalt-menu-item basalt-menu-submenu-trigger", className)}>
      <span className="basalt-menu-item-label">{children}</span>
      <Icon icon={ChevronRightGlyph} />
    </BaseMenu.SubmenuTrigger>
  );
}
