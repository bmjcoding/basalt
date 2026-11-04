import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import * as React from "react";

import { Icon } from "./icon";
import { Kbd } from "./display";
import { withClass } from "./utils";
import { useFloatingLayer } from "./layers";

/** A menu of actions. Compose `Menu`, `MenuTrigger`, `MenuContent` and `MenuItem`s. */
export const Menu = BaseMenu.Root;

export function MenuTrigger({ className, ...props }: React.ComponentProps<typeof BaseMenu.Trigger>) {
  return <BaseMenu.Trigger {...props} className={withClass("basalt-menu-trigger", className)} />;
}

export interface MenuContentProps extends React.ComponentProps<typeof BaseMenu.Popup> {
  side?: React.ComponentProps<typeof BaseMenu.Positioner>["side"];
  align?: React.ComponentProps<typeof BaseMenu.Positioner>["align"];
  sideOffset?: number;
}

/** The floating panel: portalled, positioned against the trigger, and dismissed on Esc or outside click. */
export function MenuContent({ side = "bottom", align = "start", sideOffset = 6, className, ...props }: MenuContentProps) {
  const layer = useFloatingLayer();
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner side={side} align={align} sideOffset={sideOffset} style={layer} className="basalt-positioner">
        <BaseMenu.Popup {...props} className={withClass("basalt-menu", className)} />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export interface MenuItemProps extends React.ComponentProps<typeof BaseMenu.Item> {
  icon?: PhosphorIcon;
  /** A keyboard shortcut shown at the end of the row, e.g. "⌘D". */
  shortcut?: string;
  /** A destructive action: shown in the danger colour. */
  danger?: boolean;
}

export function MenuItem({ icon, shortcut, danger, className, children, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item {...props} data-danger={danger ? "" : undefined} className={withClass("basalt-menu-item", className)}>
      {icon ? <Icon icon={icon} size={16} /> : null}
      <span className="basalt-menu-item-label">{children}</span>
      {shortcut ? <Kbd className="basalt-menu-item-shortcut">{shortcut}</Kbd> : null}
    </BaseMenu.Item>
  );
}

export function MenuSeparator({ className, ...props }: React.ComponentProps<typeof BaseMenu.Separator>) {
  return <BaseMenu.Separator {...props} className={withClass("basalt-menu-separator", className)} />;
}

export const MenuGroup = BaseMenu.Group;

export function MenuGroupLabel({ className, ...props }: React.ComponentProps<typeof BaseMenu.GroupLabel>) {
  return <BaseMenu.GroupLabel {...props} className={withClass("basalt-menu-group-label", className)} />;
}

export function MenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof BaseMenu.CheckboxItem>) {
  return (
    <BaseMenu.CheckboxItem {...props} className={withClass("basalt-menu-item", className)}>
      <span className="basalt-menu-check"><BaseMenu.CheckboxItemIndicator><Icon icon={CheckIcon} /></BaseMenu.CheckboxItemIndicator></span>
      <span className="basalt-menu-item-label">{children}</span>
    </BaseMenu.CheckboxItem>
  );
}

export const MenuRadioGroup = BaseMenu.RadioGroup;

export function MenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof BaseMenu.RadioItem>) {
  return (
    <BaseMenu.RadioItem {...props} className={withClass("basalt-menu-item", className)}>
      <span className="basalt-menu-check"><BaseMenu.RadioItemIndicator><span className="basalt-menu-radio-dot" /></BaseMenu.RadioItemIndicator></span>
      <span className="basalt-menu-item-label">{children}</span>
    </BaseMenu.RadioItem>
  );
}

export const MenuSubmenu = BaseMenu.SubmenuRoot;

export function MenuSubmenuTrigger({ className, children, ...props }: React.ComponentProps<typeof BaseMenu.SubmenuTrigger>) {
  return (
    <BaseMenu.SubmenuTrigger {...props} className={withClass("basalt-menu-item basalt-menu-submenu-trigger", className)}>
      <span className="basalt-menu-item-label">{children}</span>
      <Icon icon={CaretRightIcon} />
    </BaseMenu.SubmenuTrigger>
  );
}
